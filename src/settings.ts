import { useSyncExternalStore } from 'react';

/** Geräte-Einstellungen (gelten für alle Karrieren in diesem Browser). */
export interface AppSettings {
  theme: 'arena' | 'auto' | 'light' | 'dark';
  animations: boolean;
  casino: boolean;
  /** Soundeffekte an/aus. */
  sound: boolean;
  /** Lautstärke 0–1. */
  volume: number;
  /** Entwickler-Bereich freigeschaltet (Code in den Einstellungen). */
  dev?: boolean;
  /** Halloween-Design während des Events (Standard an). */
  halloween?: boolean;
}

const KEY = 'fc-manager-settings';
const DEFAULTS: AppSettings = { theme: 'arena', animations: true, casino: true, sound: true, volume: 0.6 };

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

let current = load();
const listeners = new Set<() => void>();

/** Design und Animationen auf die Seite anwenden. */
export function applySettings(s: AppSettings = current): void {
  const root = document.documentElement;
  if (s.theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = s.theme;
  root.classList.toggle('reduce-motion', !s.animations);
  // Halloween-Event (bis 2. November 2026): eigenes Design, abschaltbar.
  root.classList.toggle('halloween', new Date() <= new Date(2026, 10, 2, 23, 59, 59) && s.halloween !== false);
}

export function updateSettings(patch: Partial<AppSettings>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Ohne Speicher gilt die Einstellung nur bis zum Neuladen.
  }
  applySettings(current);
  listeners.forEach((l) => l());
}

export function getSettings(): AppSettings {
  return current;
}

export function useSettings(): AppSettings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

/** Weniger Bewegung – per Systemeinstellung oder in den App-Einstellungen. */
export function motionReduced(): boolean {
  if (!current.animations) return true;
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
