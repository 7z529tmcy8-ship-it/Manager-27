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

export function setClubState(next: ClubState): void {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Ohne Speicher gilt der Club nur bis zum Neuladen.
  }
  listeners.forEach((l) => l());
}

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
