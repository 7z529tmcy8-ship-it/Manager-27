import type { Career } from './types';

const KEY = 'fc-karriere-saves-v1';

// Spielstände liegen nur im Browser (localStorage). Zugriff kann z. B. im privaten
// Modus fehlschlagen, daher überall try/catch.

export function listCareers(): Career[] {
  try {
    const raw = localStorage.getItem(KEY);
    const saves = raw ? (JSON.parse(raw) as Career[]) : [];
    return saves.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function write(saves: Career[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(saves));
    return true;
  } catch {
    return false;
  }
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
    return Math.round(chars / 1024);
  } catch {
    return 0;
  }
}

export function deleteCareer(id: string): void {
  write(listCareers().filter((c) => c.id !== id));
}
