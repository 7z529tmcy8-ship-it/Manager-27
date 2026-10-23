import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import type { Career } from './types';

// Spielstände liegen nur im Browser (localStorage). Zugriff kann z. B. im privaten
// Modus fehlschlagen, daher überall try/catch.
//
// Aufbau: Jede Karriere liegt komprimiert unter einem eigenen Schlüssel, dazu eine Liste der Kennungen.
// Im Speicher (RAM) hält das Spiel eine Kopie, damit nichts bei jedem Klick entpackt werden muss.
// Geschrieben wird kurz verzögert und nur die Karriere, die sich geändert hat – so ruckelt nichts.

/** Altes Format (eine Liste, roh oder komprimiert) – wird beim ersten Laden umgezogen. Auch für Sicherungen. */
export const LEGACY_KEY = 'fc-karriere-saves-v1';
const INDEX_KEY = 'fc-k2-index';
const PREFIX = 'fc-k2-';
const LZ = '\u0001';
const WRITE_DELAY = 500;

let cache: Career[] | null = null;
const dirty = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;
let lastOk = true;
const listeners = new Set<(ok: boolean) => void>();

const pack = (v: unknown) => LZ + compressToUTF16(JSON.stringify(v));
function unpack<T>(raw: string | null): T | null {
  if (!raw) return null;
  const json = raw.startsWith(LZ) ? decompressFromUTF16(raw.slice(1)) : raw;
  return json ? (JSON.parse(json) as T) : null;
}

function load(): Career[] {
  if (cache) return cache;
  cache = [];
  try {
    const ids = unpack<string[]>(localStorage.getItem(INDEX_KEY));
    if (ids) {
      for (const id of ids) {
        try {
          const c = unpack<Career>(localStorage.getItem(PREFIX + id));
          if (c) cache.push(c);
        } catch { /* einzelner kaputter Spielstand – überspringen */ }
      }
    } else {
      // Erster Start nach dem Update: alte Liste übernehmen und ins neue Format umziehen
      const legacy = unpack<Career[]>(localStorage.getItem(LEGACY_KEY)) ?? [];
      cache = legacy;
      if (legacy.length) {
        legacy.forEach((c) => dirty.add(c.id));
        if (flushNow()) {
          try { localStorage.removeItem(LEGACY_KEY); } catch { /* egal */ }
        }
      }
    }
  } catch {
    // Kein Zugriff auf den Speicher
  }
  return cache;
}

export function listCareers(): Career[] {
  return [...load()].sort((a, b) => b.updatedAt - a.updatedAt);
}

function writeIndex(): boolean {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(load().map((c) => c.id)));
    return true;
  } catch {
    return false;
  }
}

function writeOne(c: Career): boolean {
  try {
    localStorage.setItem(PREFIX + c.id, pack(c));
    return true;
  } catch {
    return false;
  }
}

/** Geänderte Spielstände jetzt schreiben. Bei vollem Speicher erst die anderen ausdünnen und nochmal versuchen. */
function flushNow(): boolean {
  if (timer) { clearTimeout(timer); timer = null; }
  const saves = load();
  let ok = writeIndex();
  for (const id of [...dirty]) {
    const c = saves.find((x) => x.id === id);
    if (!c) { dirty.delete(id); continue; }
    if (writeOne(c)) { dirty.delete(id); continue; }
    // Speicher voll: alle anderen verkleinern, diesen auch, nochmal versuchen
    for (const other of saves) if (other.id !== id) writeOne(deepCompact(other, false));
    const slim = deepCompact(c, true);
    if (writeOne(slim)) dirty.delete(id);
    else ok = false;
  }
  if (ok !== lastOk || !ok) listeners.forEach((l) => l(ok));
  lastOk = ok;
  return ok;
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(flushNow, WRITE_DELAY);
}

// Beim Verlassen oder Wegklicken der Seite sofort sichern
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { if (dirty.size) flushNow(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && dirty.size) flushNow(); });
}

/** Meldet, ob das letzte Speichern geklappt hat (für den Hinweis bei vollem Speicher). */
export function onSaveStatus(fn: (ok: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Ältere Saisons brauchen keine komplette Abschlusstabelle mehr (genutzt wird nur die letzte). */
const KEEP_TABLES = 2;
const KEEP_INBOX = 20;
const round2 = (o: Record<string, number> | undefined) =>
  o && Object.fromEntries(Object.entries(o).filter(([, v]) => Math.abs(v) >= 0.005).map(([k, v]) => [k, Math.round(v * 100) / 100]));

/**
 * Spielstand verkleinern, bevor er gespeichert wird: Der Browser-Speicher ist auf wenige MB begrenzt,
 * und lange Karrieren sammeln viele Daten an, die nirgends mehr angezeigt werden.
 */
export function compactCareer(career: Career): Career {
  const cut = career.history.length - KEEP_TABLES;
  return {
    ...career,
    history: career.history.map((r, i) => (i < cut && r.table?.length ? { ...r, table: [] } : r)),
    inbox: career.inbox?.slice(0, KEEP_INBOX),
    clubDrift: round2(career.clubDrift)!,
    clubBacking: round2(career.clubBacking),
  };
}

/** Notfall-Verkleinerung: alles weg, was nur zum Nachlesen da ist. Der aktive Spielstand behält mehr. */
export function deepCompact(career: Career, active: boolean): Career {
  const c = compactCareer(career);
  return {
    ...c,
    history: c.history.map((r, i) => (i < c.history.length - 1 ? { ...r, table: [] } : r)),
    inbox: active ? c.inbox?.slice(0, 5) : [],
    news: active ? c.news?.slice(0, 10) : [],
  };
}

/** Speichern: sofort im Spiel, kurz danach im Browser. Gibt zurück, ob das letzte Schreiben geklappt hat. */
export function saveCareer(career: Career): boolean {
  const saves = load();
  const c = compactCareer(career);
  const i = saves.findIndex((x) => x.id === career.id);
  if (i >= 0) saves[i] = c;
  else saves.unshift(c);
  dirty.add(c.id);
  schedule();
  return lastOk;
}

export function deleteCareer(id: string): void {
  const saves = load();
  const i = saves.findIndex((c) => c.id === id);
  if (i >= 0) saves.splice(i, 1);
  dirty.delete(id);
  try { localStorage.removeItem(PREFIX + id); } catch { /* egal */ }
  writeIndex();
}

/** Alle Spielstände als normales JSON – für Sicherungen (lesbar und mit alten Sicherungen kompatibel). */
export function exportCareersJson(): string {
  if (dirty.size) flushNow();
  return JSON.stringify(listCareers());
}

/** Nach dem Einspielen einer Sicherung: neues Format leeren, damit die Sicherung (altes Format) geladen wird. */
export function clearCareerStore(): void {
  try {
    const ids = unpack<string[]>(localStorage.getItem(INDEX_KEY)) ?? [];
    ids.forEach((id) => localStorage.removeItem(PREFIX + id));
    localStorage.removeItem(INDEX_KEY);
  } catch { /* egal */ }
  cache = null;
  dirty.clear();
}

/** Speicher manuell aufräumen (Knopf in der Hinweis-Leiste). Gibt die neue Größe in KB zurück. */
export function cleanStorage(): number {
  const saves = load();
  saves.forEach((c, i) => { saves[i] = deepCompact(c, i === 0); dirty.add(c.id); });
  flushNow();
  return storageUsedKb();
}

/** Belegter Browser-Speicher dieses Spiels in KB (ungefähr). */
export function storageUsedKb(): number {
  try {
    let chars = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      chars += k.length + (localStorage.getItem(k)?.length ?? 0);
    }
    return Math.round((chars * 2) / 1024);
  } catch {
    return 0;
  }
}

/** Speicher je Bereich in KB: Karrieren, Club/Sammlung, Onkel Flavio, Rest. */
export function storageBreakdown(): { careers: number; club: number; flavio: number; other: number } {
  let careers = 0;
  let club = 0;
  let flavio = 0;
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      const kb = ((k.length + (localStorage.getItem(k)?.length ?? 0)) * 2) / 1024;
      total += kb;
      if (k.startsWith(PREFIX) || k === LEGACY_KEY) careers += kb;
      else if (k === 'fc-club') club += kb;
      else if (k.startsWith('onkel-flavio')) flavio += kb;
    }
  } catch { /* leer */ }
  const r = Math.round;
  return { careers: r(careers), club: r(club), flavio: r(flavio), other: r(Math.max(0, total - careers - club - flavio)) };
}

/** Für Tests: Zwischenspeicher verwerfen und ausstehende Schreibvorgänge sofort ausführen. */
export function flushSaves(): boolean {
  return flushNow();
}
export function resetStorageCache(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  cache = null;
  dirty.clear();
  lastOk = true;
}

/** Früherer Name – das Umziehen passiert jetzt automatisch beim ersten Laden. */
export function migrateSaves(): void {
  load();
}
