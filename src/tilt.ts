// Handy-Neigung für 3D-Karten: Die Lage des Geräts wird in Werte von −0,5 bis 0,5 umgerechnet.
// Die erste Messung gilt als „gerade“ – so passt es, egal wie man das Handy hält.
import { getSettings } from './settings';

type Tilt = { x: number; y: number };
const listeners = new Set<(t: Tilt) => void>();
let base: { beta: number; gamma: number } | null = null;
let running = false;

const clamp = (v: number) => Math.max(-0.5, Math.min(0.5, v));

function onOrientation(e: DeviceOrientationEvent) {
  if (e.beta == null || e.gamma == null) return;
  if (!base) base = { beta: e.beta, gamma: e.gamma };
  // Die Mitte wandert langsam mit, damit die Karte nach einer Weile wieder gerade steht.
  base.beta += (e.beta - base.beta) * 0.01;
  base.gamma += (e.gamma - base.gamma) * 0.01;
  const t = { x: clamp((e.gamma - base.gamma) / 40), y: clamp((e.beta - base.beta) / 40) };
  listeners.forEach((l) => l(t));
}

/** iPhone/iPad verlangen eine Erlaubnis, die nur nach einem Tippen abgefragt werden darf. */
export const motionNeedsPermission = () =>
  typeof DeviceOrientationEvent !== 'undefined' && typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === 'function';

/** Neigung starten. Auf iOS nur aus einem Tipp heraus aufrufen. Gibt zurück, ob es geklappt hat. */
export async function startMotion(): Promise<boolean> {
  if (running || typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return running;
  if (motionNeedsPermission()) {
    try {
      const res = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
      if (res !== 'granted') return false;
    } catch {
      return false;
    }
  }
  window.addEventListener('deviceorientation', onOrientation);
  running = true;
  return true;
}

export function stopMotion(): void {
  if (!running) return;
  window.removeEventListener('deviceorientation', onOrientation);
  running = false;
  base = null;
}

/** Android & Co. brauchen keine Erlaubnis: direkt beim Start einschalten, wenn gewünscht. */
export function autoStartMotion(): void {
  if (getSettings().tilt !== false && !motionNeedsPermission()) void startMotion();
}

export function onTilt(fn: (t: Tilt) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
