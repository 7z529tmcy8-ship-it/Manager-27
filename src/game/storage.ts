import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import type { Career } from './types';

const KEY = 'fc-karriere-saves-v1';
/** Komprimierte Spielstände beginnen mit diesem Zeichen (alte, unkomprimierte mit „[“). */
const LZ = '\u0001';

// Spielstände liegen nur im Browser (localStorage). Zugriff kann z. B. im privaten
// Modus fehlschlagen, daher überall try/catch.

export function listCareers(): Career[] {
  try {
    const raw = localStorage.getItem(KEY);
    const json = raw?.startsWith(LZ) ? decompressFromUTF16(raw.slice(1)) : raw;
    const saves = json ? (JSON.parse(json) as Career[]) : [];
    return saves.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function tryWrite(saves: Career[]): boolean {
  try {
    // Komprimiert speichern: Spielstände werden so etwa 5- bis 10-mal kleiner.
    localStorage.setItem(KEY, LZ + compressToUTF16(JSON.stringify(saves)));
    return true;
  } catch {
    return false;
  }
}

/**
 * Speichern; wenn der Browser-Speicher voll ist, erst ältere Spielstände ausdünnen
 * (Nachrichten, Postfach, alte Tabellen) und es noch einmal versuchen.
 */
function write(saves: Career[]): boolean {
  if (tryWrite(saves)) return true;
  const slim = saves.map((c, i) => (i === 0 ? deepCompact(c, true) : deepCompact(c, false)));
  return tryWrite(slim);
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

/** Speicher manuell aufräumen (Knopf in der Hinweis-Leiste). Gibt die neue Größe in KB zurück. */
export function cleanStorage(): number {
  const saves = listCareers();
  tryWrite(saves.map((c, i) => deepCompact(c, i === 0)));
  return storageUsedKb();
}

/** Speicher je Bereich in KB: Karrieren, Club/Sammlung, Onkel Flavio, Rest. */
export function storageBreakdown(): { careers: number; club: number; flavio: number; other: number } {
  const kb = (k: string) => {
    try { return Math.round(((localStorage.getItem(k)?.length ?? 0) * 2) / 1024); } catch { return 0; }
  };
  const careers = kb(KEY);
  const club = kb('fc-club');
  const flavio = kb('onkel-flavio-musik-v1');
  return { careers, club, flavio, other: Math.max(0, storageUsedKb() - careers - club - flavio) };
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

export function saveCareer(career: Career): boolean {
  const saves = listCareers().filter((c) => c.id !== career.id);
  return write([compactCareer(career), ...saves]);
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

export function deleteCareer(id: string): void {
  write(listCareers().filter((c) => c.id !== id));
}

/** Alte, unkomprimierte Spielstände einmalig komprimiert neu speichern (spart sofort viel Platz). */
export function migrateSaves(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw && !raw.startsWith(LZ)) write(listCareers());
  } catch {
    // Ohne Speicherzugriff gibt es nichts zu tun.
  }
}
