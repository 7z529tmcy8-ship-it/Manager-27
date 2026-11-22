import { useSyncExternalStore } from 'react';
import { freshClub, refundOldUpgrades, type ClubState } from './game/club';

// Der Club (Coins, Sammlung, Items) gilt für alle Karrieren in diesem Browser.
const KEY = 'fc-club';

function load(): ClubState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshClub();
    const base = freshClub();
    const saved = JSON.parse(raw) as Partial<ClubState>;
    // Alte Speicherstände ohne Kennzeichen: Coin-Verbesserungen einmalig erstatten.
    // ownCardsRemoved: false für alte Stände – die Bereinigung läuft in App (braucht die Karrieren).
    return refundOldUpgrades({ ...base, upgradesRefunded: false, ownCardsRemoved: false, ...saved, items: { ...base.items, ...saved.items } });
  } catch {
    return freshClub();
  }
}

let current = load();
const listeners = new Set<() => void>();

export function getClubState(): ClubState {
  return current;
}

// Speichern gebündelt: Im Casino ändert sich der Stand viele Male pro Sekunde – jedes Mal den ganzen
// Club zu speichern bremst schwache Geräte. Der Stand im Speicher ist sofort aktuell, auf die Platte
// geht er höchstens alle 400 ms und sicher beim Verlassen der Seite.
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let frozen = false;
function flush(): void {
  if (!saveTimer) return; // nichts Neues zu speichern
  clearTimeout(saveTimer); saveTimer = null;
  if (frozen) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Ohne Speicher gilt der Club nur bis zum Neuladen.
  }
}
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
}

/** Schutz: „unendlich“ oder ungültige Zahlen würden Schleifen und Anzeigen lahmlegen. */
const sane = (n: number) => (Number.isFinite(n) ? Math.min(n, Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER);
export function setClubState(next: ClubState): void {
  if (!Number.isFinite(next.coins) || next.coins > Number.MAX_SAFE_INTEGER) next = { ...next, coins: Number.isNaN(next.coins) ? 0 : sane(next.coins) };
  if (next.casino && (!Number.isFinite(next.casino.chips) || next.casino.chips > Number.MAX_SAFE_INTEGER)) next = { ...next, casino: { ...next.casino, chips: Number.isNaN(next.casino.chips) ? 0 : sane(next.casino.chips) } };
  current = next;
  if (!saveTimer) saveTimer = setTimeout(flush, 400);
  listeners.forEach((l) => l());
}

/** Sofort speichern (z. B. vor einem Export oder in Tests). */
export const flushClubState = flush;
/** Vor dem Einspielen einer Sicherung: nichts Altes mehr speichern (sonst überschreibt es die Sicherung). */
export function freezeClubSaves(): void { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; } frozen = true; }

export function useClub(): ClubState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

/** Tagesziel-Fortschritt zählen (Karriere, Duelle, Packs, Casino). */
export function trackDailyGoal(id: import('./game/daily').DailyId, n = 1): void {
  // Lazy-frei: daily.ts ist klein und hängt nur an club/casino/squad.
  void import('./game/daily').then((m) => setClubState(m.trackDaily(getClubState(), id, n)));
}
