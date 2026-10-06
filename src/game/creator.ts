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

// ---------- Herkunft ----------
// Wo der Spieler herkommt, verändert Startwertung, Potenzial, Attribute und die Entwicklung.

export type OriginId = 'academy' | 'street' | 'late' | 'family';

export interface Origin {
  id: OriginId;
  icon: string;
  name: string;
  text: string;
  /** Änderung der Startwertung. */
  ovr: number;
  /** Änderung des Potenzials. */
  potential: number;
  /** Zusätzliche Attribut-Abweichungen (Feldspieler-Reihenfolge TEM, SCH, PAS, DRI, DEF, PHY). */
  attrs: number[];
}

export const ORIGINS: Origin[] = [
  { id: 'academy', icon: '🏫', name: 'Nachwuchsleistungszentrum', text: 'Solide ausgebildet: +1 Startwertung, ausgewogene Werte.', ovr: 1, potential: 0, attrs: [0, 0, 1, 0, 1, 0] },
  { id: 'street', icon: '🏙️', name: 'Straßenfußballer', text: 'Käfig und Bolzplatz: viel Dribbling und Kreativität (+2 Potenzial), aber wenig Taktik (−1 Startwertung, weniger Defensive).', ovr: -1, potential: 2, attrs: [1, 1, 0, 5, -3, 0] },
  { id: 'late', icon: '🌱', name: 'Spätstarter aus der Kreisliga', text: 'Lange übersehen: −4 Startwertung, +3 Potenzial, und du entwickelst dich zwei Jahre länger (bis 29).', ovr: -4, potential: 3, attrs: [0, 0, 0, 0, 0, 2] },
  { id: 'family', icon: '👨‍👦', name: 'Fußballer-Familie', text: 'Vater war Profi: +1 Startwertung, +1 Potenzial, mehr Selbstvertrauen – aber alle erwarten viel von dir (mehr Druck in Krisen).', ovr: 1, potential: 1, attrs: [0, 0, 1, 1, 0, 0] },
];

export const getOrigin = (id: OriginId | undefined) => ORIGINS.find((o) => o.id === id) ?? ORIGINS[0];

/** Herkunft auf das Ergebnis des Baukastens anwenden. */
export function applyOrigin(r: { ovr: number; potential: number; offsets: number[] }, id: OriginId, keeper: boolean) {
  const o = getOrigin(id);
  return {
    ovr: r.ovr + o.ovr,
    potential: Math.min(94, r.potential + o.potential),
    offsets: keeper ? r.offsets : r.offsets.map((v, i) => v + o.attrs[i]),
  };
}

// ---------- Avatar ----------

export interface Avatar {
  skin: number;
  hair: 'buzz' | 'short' | 'curls' | 'afro' | 'long' | 'bun' | 'mohawk' | 'bald';
  hairColor: number;
  beard: 'none' | 'stubble' | 'goatee' | 'full';
  headband: boolean;
}

export const SKIN_TONES = ['#f6d7c0', '#e8b896', '#c98e66', '#a76a45', '#7c4a2d', '#4e2e1c'];
export const HAIR_COLORS = ['#1b1410', '#4a2e1c', '#8a5a2b', '#d9b26a', '#b4441d', '#e9e4dc', '#2a6bd8'];
export const HAIR_STYLES: [Avatar['hair'], string][] = [
  ['buzz', 'Buzzcut'], ['short', 'Kurz'], ['curls', 'Locken'], ['afro', 'Afro'], ['long', 'Lang'], ['bun', 'Man-Bun'], ['mohawk', 'Iro'], ['bald', 'Glatze'],
];
export const BEARDS: [Avatar['beard'], string][] = [['none', 'Kein Bart'], ['stubble', 'Dreitage'], ['goatee', 'Kinnbart'], ['full', 'Vollbart']];

export const DEFAULT_AVATAR: Avatar = { skin: 1, hair: 'short', hairColor: 1, beard: 'none', headband: false };

const pickOf = <T,>(list: readonly T[]) => list[randInt(0, list.length - 1)];

export function randomAvatar(): Avatar {
  return {
    skin: randInt(0, SKIN_TONES.length - 1),
    hair: pickOf(HAIR_STYLES)[0],
    hairColor: randInt(0, HAIR_COLORS.length - 2), // Blau nur selten per Hand
    beard: pickOf(BEARDS)[0],
    headband: randInt(0, 4) === 0,
  };
}

/** Zufällige Punkteverteilung: meist sinnvoll für die Position, mit etwas Chaos. */
export function randomPoints(position: Position): number[] {
  const weights = ATTR_WEIGHTS[position].map((w) => w + 0.6 + Math.random() * 1.5);
  const points = [0, 0, 0, 0, 0, 0];
  for (let k = 0; k < POINT_POOL; k++) {
    const open = points.map((p, i) => (p < MAX_PER_ATTR ? weights[i] : 0));
    const total = open.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    const i = open.findIndex((w) => (r -= w) < 0);
    points[i < 0 ? 0 : i]++;
  }
  return points;
}

/** Körpermaße passend (meist) zur Position. */
export function randomBody(position: Position): { height: number; weight: number } {
  const [lo, hi] = IDEAL_HEIGHT[position];
  const height = clamp(randInt(lo - 4, hi + 3), HEIGHT_RANGE[0], HEIGHT_RANGE[1]);
  const bmi = 21 + Math.random() * 3.5;
  return { height, weight: clamp(Math.round(bmi * (height / 100) ** 2), WEIGHT_RANGE[0], WEIGHT_RANGE[1]) };
}

/** Glücksrad: Wahrscheinlichkeit jeder Herkunft (Summe 100). */
export const ORIGIN_ODDS: Record<OriginId, number> = { academy: 35, street: 25, late: 20, family: 20 };

/** Herkunft auslosen. */
export function spinOrigin(rand = Math.random): OriginId {
  let r = rand() * 100;
  for (const o of ORIGINS) {
    r -= ORIGIN_ODDS[o.id];
    if (r < 0) return o.id;
  }
  return 'academy';
}

const SPIN_KEY = 'fc-origin-spin';
/** Gedrehte, aber noch nicht verbrauchte Herkunft (übersteht Tab-Wechsel und Neuladen). */
export function storedSpin(): OriginId | null {
  try {
    const v = localStorage.getItem(SPIN_KEY) as OriginId | null;
    return v && ORIGINS.some((o) => o.id === v) ? v : null;
  } catch {
    return null;
  }
}
export function storeSpin(id: OriginId | null): void {
  try {
    if (id) localStorage.setItem(SPIN_KEY, id);
    else localStorage.removeItem(SPIN_KEY);
  } catch {
    // ohne Speicher: dann eben nur für diese Sitzung
  }
}
