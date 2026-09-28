import { clamp, normal, randInt } from './random';
import type { PlayerState, SeasonRecord } from './types';

/** Wie schnell sich die Lücke zum Potenzial pro Saison schließt – abhängig vom Alter. */
function growthRate(age: number): number {
  const table: Record<number, number> = {
    16: 0.34, 17: 0.34, 18: 0.32, 19: 0.3, 20: 0.26, 21: 0.22, 22: 0.18, 23: 0.14, 24: 0.1, 25: 0.07, 26: 0.05, 27: 0.03,
  };
  return age < 16 ? 0.34 : (table[age] ?? 0);
}

export interface DevelopmentResult {
  ovr: number;
  potential: number;
  reasons: string[];
}

/**
 * Entwicklung nach einer Saison:
 * - junge Spieler wachsen Richtung Potenzial, umso schneller, je mehr und je besser sie spielen
 * - ab ~29 Jahren baut der Spieler ab (Torhüter etwas später), Spielpraxis bremst den Abbau
 * - starke Saisons können das Potenzial erhöhen, verschenkte Jahre senken es
 */
export function developPlayer(p: PlayerState, season: SeasonRecord, teamStrength: number): DevelopmentResult {
  const share = season.possibleMinutes > 0 ? season.minutes / season.possibleMinutes : 0;
  const rating = season.avgRating ?? 6.3;
  const reasons: string[] = [];

  const ptFactor = 0.35 + 0.95 * Math.min(1, share / 0.75);
  const perfFactor = clamp(1 + (rating - 6.8) * 0.35, 0.7, 1.35);
  const trainingFactor = 1 + (teamStrength - 75) * 0.01;

  let potential = p.potential;
  if (p.age <= 24 && share >= 0.5 && rating >= 7.3) {
    const up = randInt(1, 2);
    potential = Math.min(99, potential + up);
    reasons.push('Starke Saison – das Potenzial ist gestiegen.');
  } else if (p.age <= 23 && share < 0.25) {
    const down = randInt(0, 2);
    potential -= down;
    if (down > 0) reasons.push('Zu wenig Spielpraxis – das Potenzial ist gesunken.');
  }

  const ageShift = p.position === 'TW' ? 2 : 0;
  const age = p.age - ageShift;
  let change: number;
  if (age <= 28) {
    const gap = Math.max(0, potential - p.ovr);
    change = gap * growthRate(age) * ptFactor * perfFactor * trainingFactor + normal(0, 0.8);
    if (share < 0.25 && age <= 23) reasons.push('Kaum Einsätze – die Entwicklung stockt.');
    else if (share >= 0.6 && age <= 23) reasons.push('Viel Spielzeit – ideal für die Entwicklung.');
  } else {
    const decline = (age - 29) * 0.75 + 0.3 + normal(0, 0.7);
    const protection = 1.1 - 0.2 * Math.min(1, share / 0.75);
    change = -Math.max(0, decline * protection);
    if (change <= -1) reasons.push('Alterungsbedingter Leistungsabfall.');
  }

  let ovr = p.ovr + Math.round(change);
  if (change > 0) ovr = Math.min(ovr, Math.max(potential, p.ovr));
  ovr = clamp(ovr, 40, 99);
  potential = Math.max(potential, ovr);
  if (p.age + 1 >= 28) potential = Math.max(ovr, Math.min(potential, ovr + 1));
  return { ovr, potential, reasons };
}
