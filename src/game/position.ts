import { POSITIONS } from '../data/players';
import { ATTR_WEIGHTS } from './attributes';
import { attributes } from './player';
import { clamp } from './random';
import { KEY_ATTRIBUTES } from './training';
import type { Career, PlayerState, Position } from './types';

// Positionstraining: Der Spieler lernt gezielt eine Nachbarposition (z. B. Stürmer → Zehner).
// Während des Trainings ruht der normale Trainingsschwerpunkt; dafür wachsen die Schlüsselattribute
// der neuen Position jede Halbserie um einen Punkt. Am Ende ergibt sich die Wertung neu aus den Attributen.

/** Welche Positionen man von wo aus lernen kann (nur benachbarte Rollen). Torhüter bleiben Torhüter. */
export const NEIGHBOURS: Record<Position, Position[]> = {
  ST: ['ZOM', 'FL'],
  FL: ['ST', 'ZOM', 'AV'],
  ZOM: ['ST', 'FL', 'ZM'],
  ZM: ['ZOM', 'ZDM'],
  ZDM: ['ZM', 'IV'],
  AV: ['FL', 'IV'],
  IV: ['ZDM', 'AV'],
  TW: [],
};

export const positionName = (p: Position) => POSITIONS.find((x) => x.id === p)?.label ?? p;

const weighted = (v: number[], w: number[]) => v.reduce((a, x, i) => a + x * w[i], 0);
/** Wertung auf einer anderen Position mit den aktuellen Attributen. */
export const ovrAt = (p: PlayerState, pos: Position) => Math.round(weighted(attributes(p), ATTR_WEIGHTS[pos]));

export interface RetrainOption {
  to: Position;
  /** Wertung dort, wenn man heute wechseln würde. */
  now: number;
  /** Geschätzte Wertung nach dem Training (Schlüsselattribute je +1 pro Halbserie). */
  after: number;
  /** Dauer in Halbserien. */
  halves: number;
}

/** Dauer: 2 Halbserien; 1, wenn die Attribute schon klar passen; eine mehr ab 31 Jahren. */
function duration(p: PlayerState, to: Position): number {
  const fits = ovrAt(p, to) >= p.ovr + 2;
  return (fits ? 1 : 2) + (p.age >= 31 ? 1 : 0);
}

function boosted(p: PlayerState, to: Position, halves: number): number[] {
  const keys = KEY_ATTRIBUTES[to];
  return attributes(p).map((a, i) => (keys.includes(i) ? a + halves : a));
}

export function retrainOptions(p: PlayerState): RetrainOption[] {
  return NEIGHBOURS[p.position].map((to) => {
    const halves = duration(p, to);
    return { to, now: ovrAt(p, to), after: clamp(Math.round(weighted(boosted(p, to, halves), ATTR_WEIGHTS[to])), 40, 99), halves };
  });
}

export function canRetrain(career: Career): boolean {
  const p = career.player;
  return career.phase !== 'retired' && career.phase !== 'final' && !p.nlz && NEIGHBOURS[p.position].length > 0;
}

export function startRetrain(prev: Career, to: Position): Career {
  if (!canRetrain(prev) || !NEIGHBOURS[prev.player.position].includes(to)) return prev;
  const career: Career = structuredClone(prev);
  const halves = duration(career.player, to);
  career.player.retrain = { to, left: halves, total: halves };
  career.updatedAt = Date.now();
  return career;
}

export function cancelRetrain(prev: Career): Career {
  if (!prev.player.retrain) return prev;
  const career: Career = structuredClone(prev);
  career.player.retrain = undefined;
  career.updatedAt = Date.now();
  return career;
}

/** Wechsel vollziehen: Attribute bleiben, die Wertung ergibt sich aus den Gewichten der neuen Position. */
export function switchPosition(p: PlayerState, to: Position): void {
  const ovr = clamp(Math.round(weighted(attributes(p), ATTR_WEIGHTS[to])), 40, 99);
  // Rohwerte (ohne Alterszuschläge) behalten, sonst zählt das Alter beim nächsten Berechnen doppelt
  p.profile = p.profile.map((o) => p.ovr + o - ovr);
  p.position = to;
  p.ovr = ovr;
  p.potential = Math.max(p.potential, ovr);
  p.attrDelta = undefined;
}

/**
 * Nach jeder Halbserie: Fortschritt des Positionstrainings. Gibt eine Notiz zurück, wenn etwas passiert ist.
 */
export function progressRetrain(p: PlayerState): string | null {
  const r = p.retrain;
  if (!r) return null;
  const keys = KEY_ATTRIBUTES[r.to];
  p.profile = p.profile.map((v, i) => (keys.includes(i) ? v + 1 : v));
  r.left -= 1;
  if (r.left > 0) return `Positionstraining ${positionName(r.to)}: ${r.total - r.left}/${r.total} – die Laufwege sitzen langsam.`;
  const before = p.ovr;
  const from = p.position;
  switchPosition(p, r.to);
  p.retrain = undefined;
  return `Umschulung geschafft: Du spielst jetzt ${positionName(p.position)} statt ${positionName(from)} (Wertung ${before} → ${p.ovr}).`;
}
