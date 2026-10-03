import { PROFILE } from './player';
import { clamp, randInt } from './random';
import type { Position } from './types';

// Spieler-Baukasten: Statt das Potenzial direkt zu wählen, entscheiden Körperbau und Attributverteilung.
// Wer Größe, Gewicht und Punkte passend zur Position wählt, bekommt mehr Potenzial – aber es gibt
// Zielkonflikte: Größe bringt Physis und Zweikampf, kostet aber Tempo und Dribbling.

/** Attributpunkte, die verteilt werden dürfen, und das Maximum pro Attribut. */
export const POINT_POOL = 20;
export const MAX_PER_ATTR = 8;

/** Wie wichtig jedes Attribut für die Position ist (Reihenfolge wie OUTFIELD_ATTRS bzw. KEEPER_ATTRS). */
export const ATTR_WEIGHTS: Record<Position, number[]> = {
  TW: [3, 2, 1, 3, 1, 3],
  IV: [1, 0, 1, 0, 3, 3],
  AV: [3, 0, 2, 1, 2, 1],
  ZDM: [1, 0, 2, 1, 3, 2],
  ZM: [1, 1, 3, 2, 1, 1],
  ZOM: [1, 2, 3, 3, 0, 0],
  FL: [3, 1, 1, 3, 0, 0],
  ST: [2, 3, 0, 1, 0, 2],
};

/** Ideale Größe je Position in cm. */
export const IDEAL_HEIGHT: Record<Position, [number, number]> = {
  TW: [188, 197],
  IV: [185, 195],
  AV: [172, 184],
  ZDM: [178, 189],
  ZM: [172, 185],
  ZOM: [168, 181],
  FL: [165, 180],
  ST: [175, 193],
};

export const HEIGHT_RANGE: [number, number] = [158, 206];
export const WEIGHT_RANGE: [number, number] = [55, 105];

export interface Build {
  position: Position;
  age: number;
  height: number;
  weight: number;
  /** Verteilte Attributpunkte (6 Werte). */
  points: number[];
}

export interface BuildResult {
  ovr: number;
  /** Erwartetes Potenzial ohne Zufall (beim Start kommen −3 bis +4 dazu – zum Wunderkind braucht es Glück). */
  potential: number;
  /** Abweichung jedes Attributs vom Gesamtwert. */
  offsets: number[];
  /** 0–1: Wie gut passt der Körper zur Position? */
  bodyFit: number;
  /** 0–1: Wie gut passen die Punkte zur Position? */
  attrFit: number;
  bmi: number;
}

export const bmiOf = (height: number, weight: number) => weight / (height / 100) ** 2;

/** Bestmögliche gewichtete Punktesumme für eine Position (alle Punkte in die wichtigsten Attribute). */
function bestScore(weights: number[]): number {
  let left = POINT_POOL;
  let score = 0;
  for (const w of [...weights].sort((a, b) => b - a)) {
    const n = Math.min(MAX_PER_ATTR, left);
    score += n * w;
    left -= n;
  }
  return score;
}

export function evaluateBuild(b: Build): BuildResult {
  const keeper = b.position === 'TW';
  const [lo, hi] = IDEAL_HEIGHT[b.position];
  const off = b.height < lo ? lo - b.height : b.height > hi ? b.height - hi : 0;
  const heightFit = clamp(1 - off * 0.08, 0, 1);
  const bmi = bmiOf(b.height, b.weight);
  const bmiOff = bmi < 21 ? 21 - bmi : bmi > 24.5 ? bmi - 24.5 : 0;
  const bmiFit = clamp(1 - bmiOff * 0.3, 0, 1);
  const bodyFit = 0.6 * heightFit + 0.4 * bmiFit;

  const weights = ATTR_WEIGHTS[b.position];
  const score = b.points.reduce((a, p, i) => a + p * weights[i], 0);
  const attrFit = clamp(score / bestScore(weights), 0, 1);

  // Körperbau verschiebt die Attribute: groß = stark und kopfballstark, klein = schnell und wendig.
  const tall = b.height - 182;
  const heavy = bmi - 23;
  const body = keeper
    ? [tall * 0.2, tall * 0.1, 0, -tall * 0.05, -tall * 0.15 - heavy * 0.8, tall * 0.1]
    : [-tall * 0.2 - heavy * 1, 0, 0, -tall * 0.2 - heavy * 0.6, tall * 0.15 + heavy * 0.4, tall * 0.25 + heavy * 1.2];
  const offsets = PROFILE[b.position].map((v, i) => Math.round(v + b.points[i] * 1.5 + body[i]));

  const used = b.points.reduce((a, p) => a + p, 0);
  const ovr = Math.round(58 + (b.age - 16) * 1.6 + attrFit * 4 + bodyFit * 2 + (used / POINT_POOL) * 1);
  const potential = Math.round(clamp(70 + bodyFit * 6 + attrFit * 9 - (b.age - 17) * 0.5, 66, 92));
  return { ovr, potential, offsets, bodyFit, attrFit, bmi };
}

/** Endgültige Werte beim Karrierestart: etwas Zufall auf Wertung und Potenzial. */
export function rollBuild(b: Build): { ovr: number; potential: number; profile: number[] } {
  const r = evaluateBuild(b);
  const ovr = r.ovr + randInt(-1, 1);
  return { ovr, potential: Math.max(ovr + 4, r.potential + randInt(-3, 4)), profile: r.offsets };
}

/** Grobe Scout-Einschätzung, wie sie im Baukasten angezeigt wird. */
export function scoutLabel(potential: number): string {
  return potential >= 89 ? 'Wunderkind' : potential >= 84 ? 'Top-Talent' : potential >= 78 ? 'Talent' : 'Solide';
}
