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
  /** 3D-Karten folgen der Handy-Neigung (Standard an). */
  tilt?: boolean;
  /** Im Querformat spielen (Handy quer halten; wo möglich wird die Drehung gesperrt). */
  landscape?: boolean;
  /** Vollbild: beim ersten Tippen ohne Browser-Leisten spielen (Standard an). */
  fullscreen?: boolean;
  /** Einmalige Umstellung: Querformat-Sperre nicht mehr standardmäßig (Startmenü fürs Hochformat). */
  orientationV2?: boolean;
  /** Look: „brawl“ (bunt, dicke Konturen, Standard) oder „neon“ (dunkles Neon-Stadion). */
  look?: 'aqua' | 'brawl' | 'neon';
  /** Einmalige Umstellung auf den Aqua-Look (November 2026). */
  lookV2?: boolean;
  /** Einmalige Umstellung auf den dunklen Premium-Look (Ende November 2026). */
  lookV3?: boolean;
  /** Leistungsmodus: weniger Dauer-Animationen und kein Glas-Weichzeichner. 'auto' = an, wenn das Gerät ruckelt. */
  perf?: 'auto' | 'on' | 'off';
  /** Ergebnis der automatischen Messung (true = Gerät ruckelt). */
  perfAuto?: boolean;
  /** Karriere-Einstellungen für ALLE Karrieren (Schwierigkeit, Spieltag-Modus, Live-Spiele …). */
  careerSettings?: import('./game/types').CareerSettings;
}

const KEY = 'fc-manager-settings';
const DEFAULTS: AppSettings = { theme: 'arena', look: 'neon', lookV2: true, lookV3: true, animations: true, casino: true, sound: true, volume: 0.6, landscape: false, fullscreen: true, orientationV2: true };

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const saved = JSON.parse(raw) as AppSettings;
    // Früher war Querformat Standard – jetzt ist das Startmenü fürs Hochformat gebaut: einmalig zurücksetzen.
    if (!saved.orientationV2) { saved.landscape = false; saved.orientationV2 = true; }
    // Neuer Standard-Look: alle einmal auf Aqua umstellen (danach frei wählbar).
    if (!saved.lookV2) { saved.look = 'aqua'; saved.lookV2 = true; }
    // Dunkler Premium-Look als neuer Standard: alle einmal umstellen (danach frei wählbar).
    if (!saved.lookV3) { saved.look = 'neon'; saved.theme = 'arena'; saved.lookV3 = true; }
    return { ...DEFAULTS, ...saved };
  } catch {
    return DEFAULTS;
  }
}

let current = load();
const listeners = new Set<() => void>();

/** Design und Animationen auf die Seite anwenden. */
export function applySettings(s: AppSettings = current): void {
  if (typeof document === 'undefined') return; // z. B. in Tests ohne Browser
  const root = document.documentElement;
  const look = s.look ?? 'neon';
  // Aqua ist ein heller Look, Bunt baut auf der Arena auf; nur bei Neon gilt die Design-Wahl.
  if (look === 'aqua') root.dataset.theme = 'light';
  else if (look === 'brawl') root.dataset.theme = 'arena';
  else if (s.theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = s.theme;
  root.classList.toggle('aqua', look === 'aqua');
  root.classList.toggle('reduce-motion', !s.animations);
  root.classList.toggle('brawl', look === 'brawl');
  root.classList.toggle('want-landscape', !!s.landscape);
  root.classList.toggle('perf-lite', perfActive(s));
  const now = new Date();
  root.classList.toggle('winter', now >= new Date(2026, 11, 1) && now <= new Date(2026, 11, 27, 23, 59, 59));
  root.classList.toggle('silvester', now >= new Date(2026, 11, 31) && now <= new Date(2027, 0, 1, 23, 59, 59));
  root.classList.remove('halloween');
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

/** Ist der Leistungsmodus gerade an? */
export const perfActive = (s: AppSettings = current) => s.perf === 'on' || (s.perf !== 'off' && !!s.perfAuto);

/**
 * Automatische Messung: Nach dem Start werden kurz die Bilder pro Sekunde gezählt. Unter 40 fps (Gerät ruckelt)
 * schaltet sich der Leistungsmodus an, über 52 fps wieder aus. Nur bei „Auto“ und nur bei sichtbarem Tab.
 */
export function probePerformance(): void {
  if (typeof window === 'undefined' || !window.requestAnimationFrame) return;
  window.setTimeout(() => {
    if (current.perf && current.perf !== 'auto') return;
    if (document.hidden) return;
    let frames = 0;
    const start = performance.now();
    const tick = (t: number) => {
      if (document.hidden) return;
      frames++;
      if (t - start < 2500) { requestAnimationFrame(tick); return; }
      const fps = (frames * 1000) / (t - start);
      if (fps < 40 && !current.perfAuto) updateSettings({ perfAuto: true });
      else if (fps > 52 && current.perfAuto) updateSettings({ perfAuto: false });
    };
    requestAnimationFrame(tick);
  }, 2000);
}

/** Weniger Bewegung – per Systemeinstellung oder in den App-Einstellungen. */
export function motionReduced(): boolean {
  if (!current.animations) return true;
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Querformat sperren, wo der Browser es erlaubt (meist Android im Vollbild). Muss aus einem Tippen heraus
 * aufgerufen werden. Auf dem iPhone geht das nicht – dort einfach das Handy drehen.
 */
export async function lockLandscape(): Promise<boolean> {
  try {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    if (!o?.lock) return false;
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    await o.lock('landscape');
    return true;
  } catch {
    return false;
  }
}
/** Kann dieser Browser echtes Vollbild? (iPhone-Safari: nein – dort hilft „Zum Home-Bildschirm“.) */
export const canFullscreen = () => typeof document !== 'undefined' && !!document.documentElement.requestFullscreen && document.fullscreenEnabled !== false;
export const isFullscreen = () => typeof document !== 'undefined' && !!document.fullscreenElement;

/** Vollbild an (muss aus einem Tippen heraus aufgerufen werden). */
export async function enterFullscreen(): Promise<boolean> {
  try {
    if (!canFullscreen() || document.fullscreenElement) return !!document.fullscreenElement;
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions);
    return true;
  } catch {
    return false;
  }
}
export function exitFullscreen(): void {
  try { if (document.fullscreenElement) void document.exitFullscreen(); } catch { /* egal */ }
}

export function unlockOrientation(): void {
  try {
    (screen.orientation as ScreenOrientation & { unlock?: () => void })?.unlock?.();
    if (document.fullscreenElement) void document.exitFullscreen();
  } catch { /* egal */ }
}
