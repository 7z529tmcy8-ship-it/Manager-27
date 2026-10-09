// Sicherung aller Spieldaten: Karrieren, Club (Coins, Karten), Einstellungen und das Rapper-Spiel.
// Alles liegt nur im Browser – mit Export/Import kann man es sichern oder auf ein anderes Gerät bringen.

const KEYS = ['fc-karriere-saves-v1', 'fc-club', 'fc-manager-settings', 'homestudio-hustle-v1', 'lab-boss-v1', 'onkel-flavio-v1', 'onkel-flavio-musik-v1'];
const APP = 'fc-karriere-backup';

export interface Backup {
  app: typeof APP;
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
}

export function createBackup(): Backup {
  const data: Record<string, string> = {};
  for (const key of KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) data[key] = raw;
    } catch {
      // Kein Zugriff auf den Speicher – dann fehlt dieser Teil.
    }
  }
  return { app: APP, version: 1, exportedAt: new Date().toISOString(), data };
}

export const backupText = () => JSON.stringify(createBackup());

/** Kurze Übersicht, was in einer Sicherung steckt. */
export function describeBackup(b: Backup): { careers: number; coins: number; date: string } {
  let careers = 0;
  let coins = 0;
  try {
    careers = (JSON.parse(b.data['fc-karriere-saves-v1'] ?? '[]') as unknown[]).length;
  } catch { /* leer */ }
  try {
    coins = (JSON.parse(b.data['fc-club'] ?? '{}') as { coins?: number }).coins ?? 0;
  } catch { /* leer */ }
  return { careers, coins, date: new Date(b.exportedAt).toLocaleString('de-DE') };
}

/** Text prüfen: Ist das eine gültige Sicherung? Gibt sie zurück oder einen Fehlertext. */
export function parseBackup(text: string): Backup | string {
  let b: Partial<Backup>;
  try {
    b = JSON.parse(text.trim());
  } catch {
    return 'Das ist keine gültige Sicherung (kein lesbarer Text).';
  }
  if (!b || b.app !== APP || typeof b.data !== 'object' || !b.data) return 'Das ist keine Sicherung von FC Karriere.';
  for (const [key, raw] of Object.entries(b.data)) {
    if (!KEYS.includes(key) || typeof raw !== 'string') return 'Die Sicherung enthält unbekannte Daten.';
    try {
      JSON.parse(raw);
    } catch {
      return 'Die Sicherung ist beschädigt.';
    }
  }
  return b as Backup;
}

/** Sicherung einspielen: ersetzt alle Spieldaten in diesem Browser. Danach muss die Seite neu laden. */
export function restoreBackup(b: Backup): boolean {
  try {
    for (const key of KEYS) {
      if (b.data[key] !== undefined) localStorage.setItem(key, b.data[key]);
      else localStorage.removeItem(key);
    }
    return true;
  } catch {
    return false;
  }
}
