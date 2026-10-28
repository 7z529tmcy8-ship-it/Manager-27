import { PROFILE, attributes } from './player';
import { clamp } from './random';
import type { PlayerState, Position } from './types';

// Echte Attribute: Jedes Attribut entwickelt sich einzeln – je nach Alter, Spielertyp und Trainingsschwerpunkt.
// Die Gesamtwertung bleibt das Gewicht der Attribute für die Position: Verschiebungen zwischen den Attributen
// sind so gewichtet, dass sie die Gesamtwertung nicht verändern. Stärken und Schwächen wirken im Spiel
// (Torchance, Vorlagen, Note, Verletzungsrisiko).

/** Wie stark jedes Attribut für die Position zählt (Reihenfolge wie OUTFIELD_ATTRS bzw. KEEPER_ATTRS, Summe 1). */
export const ATTR_WEIGHTS: Record<Position, number[]> = {
  ST: [0.22, 0.38, 0.08, 0.17, 0, 0.15],
  FL: [0.3, 0.18, 0.14, 0.3, 0, 0.08],
  ZOM: [0.14, 0.2, 0.3, 0.3, 0, 0.06],
  ZM: [0.1, 0.12, 0.38, 0.22, 0.08, 0.1],
  ZDM: [0.08, 0.04, 0.26, 0.1, 0.32, 0.2],
  AV: [0.28, 0.02, 0.18, 0.14, 0.26, 0.12],
  IV: [0.12, 0, 0.1, 0.04, 0.48, 0.26],
  TW: [0.24, 0.2, 0.08, 0.3, 0.02, 0.16],
};

/** Feldspieler: TEM, SCH, PAS, DRI, DEF, PHY. Wo ein Spielertyp zusätzlich wächst. */
const ARCHETYPE_BIAS: Record<string, number[]> = {
  striker: [0.3, 1.2, 0, 0.3, 0, 0.4],
  playmaker: [0, 0.3, 1.2, 0.8, 0, 0],
  winger: [1, 0.3, 0.2, 1, 0, 0],
  engine: [0.2, 0, 0.6, 0, 0.6, 0.9],
  rock: [0, 0, 0.2, 0, 1.2, 0.9],
  keeper: [0.9, 0.6, 0.2, 0.9, 0, 0.5],
};

/** Entwicklung nach Alter: Junge wachsen körperlich, im besten Alter im Abschluss, Ältere im Spielverständnis. */
function ageBias(p: PlayerState): number[] {
  if (p.position === 'TW') return p.age <= 23 ? [0.8, 0.2, 0, 0.6, 0, 0.2] : p.age <= 30 ? [0.2, 0.4, 0.3, 0.3, 0, 0.6] : [-0.4, 0.3, 0.4, -0.3, 0, 0.8];
  if (p.age <= 21) return [0.8, 0.2, 0, 0.5, 0, 1];
  if (p.age <= 27) return [0.2, 0.8, 0.4, 0.4, 0.2, 0.3];
  return [-0.3, 0.2, 0.8, -0.1, 0.6, -0.6];
}

/** NLZ-Förderprogramme: welche Attribute zusätzlich wachsen (Feldspieler bzw. Torhüter). */
const PROGRAM_BIAS: Record<string, { field: number[]; keeper: number[] }> = {
  technik: { field: [0, 0, 0.6, 0.6, 0, 0], keeper: [0, 0.6, 0.6, 0, 0, 0] },
  athletik: { field: [0.6, 0, 0, 0, 0, 0.6], keeper: [0.6, 0, 0, 0.6, 0, 0] },
  taktik: { field: [0, 0, 0.5, 0, 0.6, 0], keeper: [0, 0, 0, 0, 0, 0.8] },
  mental: { field: [0, 0, 0, 0, 0, 0], keeper: [0, 0, 0, 0, 0, 0] },
};

const weightedMean = (v: number[], w: number[]) => v.reduce((a, x, i) => a + x * w[i], 0);

/**
 * Nach jeder Halbserie: Attribute verschieben sich ungleich (ohne die Gesamtwertung zu ändern).
 * Speichert, wie sich jedes Attribut gegenüber `before` verändert hat (für die Anzeige).
 */
export function developAttributes(p: PlayerState, before: number[], rand: () => number = Math.random): void {
  const w = ATTR_WEIGHTS[p.position];
  const age = ageBias(p);
  const arch = p.skills ? ARCHETYPE_BIAS[p.skills.archetype] ?? [0, 0, 0, 0, 0, 0] : [0, 0, 0, 0, 0, 0];
  const focus = typeof p.trainingFocus === 'number' ? p.trainingFocus : -1;
  const bias = p.nlz?.program ? PROGRAM_BIAS[p.nlz.program][p.position === 'TW' ? 'keeper' : 'field'] : null;
  const raw = age.map((a, i) => a + arch[i] * 0.6 + (i === focus ? 0.6 : 0) + (bias?.[i] ?? 0) + (rand() - 0.5) * 0.8);
  // Gewichteten Mittelwert abziehen: Die Gesamtwertung bleibt gleich, nur die Verteilung ändert sich.
  const mean = weightedMean(raw, w);
  const shift = raw.map((v) => v - mean);
  p.profile = p.profile.map((off, i) => {
    // Zufälliges Runden, damit auch kleine Verschiebungen mit der Zeit ankommen
    const s = Math.floor(shift[i]) + (rand() < shift[i] - Math.floor(shift[i]) ? 1 : 0);
    return clamp(off + s, -45, 18);
  });
  const after = attributes(p);
  p.attrDelta = after.map((v, i) => v - (before[i] ?? v));
}

/** Persönliche Stärken und Schwächen gegenüber dem typischen Spieler der Position. */
export function personalOffsets(p: Pick<PlayerState, 'profile' | 'position'>): number[] {
  return p.profile.map((v, i) => v - (PROFILE[p.position][i] ?? 0));
}

export interface AttrMods { goal: number; assist: number; rating: number; injury: number }

/** Wie die Attribute im Spiel wirken: höchstens ±15 % bei Toren und Vorlagen, ±0,2 Note, ±20 % Verletzungsrisiko. */
export function attrMods(p: Pick<PlayerState, 'profile' | 'position'>): AttrMods {
  const o = personalOffsets(p);
  if (p.position === 'TW') return { goal: 1, assist: 1, rating: clamp((o[3] + o[5]) * 0.015, -0.2, 0.2), injury: 1 };
  return {
    goal: clamp(1 + o[1] * 0.02 + o[0] * 0.005, 0.85, 1.15),
    assist: clamp(1 + (o[2] + o[3]) * 0.012, 0.85, 1.15),
    rating: clamp((['IV', 'AV', 'ZDM'].includes(p.position) ? o[4] : o[2]) * 0.012, -0.2, 0.2),
    injury: clamp(1 - o[5] * 0.02, 0.8, 1.2),
  };
}

/** OVR, wie er sich aus den gewichteten Attributen ergibt (zur Anzeige „Stärken der Position“). */
export function attrRating(p: PlayerState): number {
  return Math.round(weightedMean(attributes(p), ATTR_WEIGHTS[p.position]));
}
