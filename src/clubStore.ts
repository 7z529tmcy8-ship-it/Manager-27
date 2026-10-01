import { useSyncExternalStore } from 'react';
import { freshClub, type ClubState } from './game/club';

// Der Club (Coins, Sammlung, Items) gilt für alle Karrieren in diesem Browser.
const KEY = 'fc-club';

function load(): ClubState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshClub();
    const base = freshClub();
    const saved = JSON.parse(raw) as Partial<ClubState>;
    return { ...base, ...saved, items: { ...base.items, ...saved.items } };
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
