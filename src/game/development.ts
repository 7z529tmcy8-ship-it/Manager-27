import { chance, clamp, normal, randInt } from './random';
import type { PlayerState, Position } from './types';

/** Wie schnell sich die Lücke zum Potenzial pro Saison schließt – abhängig vom Alter. */
function growthRate(age: number): number {
  const table: Record<number, number> = {
    16: 0.34, 17: 0.34, 18: 0.32, 19: 0.3, 20: 0.26, 21: 0.22, 22: 0.18, 23: 0.14, 24: 0.1, 25: 0.07, 26: 0.05, 27: 0.03,
  };
  return age < 16 ? 0.34 : (table[age] ?? 0);
}

/** Grundlage der Entwicklung: Spielzeit und Leistung in einem Zeitraum. */
export interface DevStats {
  minutes: number;
  possibleMinutes: number;
  avgRating: number | null;
  apps?: number;
  goals?: number;
  assists?: number;
}

export interface DevOptions {
  /** Anteil einer ganzen Saison (0.5 = Halbserie). */
  weight: number;
  /** Nur am Saisonende: ganze Saison, nach der das Potenzial angepasst wird. */
  potentialStats?: DevStats;
}

export interface DevelopmentResult {
  ovr: number;
  potential: number;
  reasons: string[];
}

const shareOf = (s: DevStats) => (s.possibleMinutes > 0 ? s.minutes / s.possibleMinutes : 0);

/**
 * Leistungsindex von −2 (sehr schwach) bis +2 (überragend).
 * Grundlage ist die Durchschnittsnote; Torbeteiligungen pro 90 Minuten geben einen Zuschlag.
 */
export function performanceIndex(s: DevStats): number {
  if (s.avgRating === null || s.minutes < 270) return 0;
  let perf = (s.avgRating - 6.8) / 0.5;
  const per90 = ((s.goals ?? 0) + (s.assists ?? 0)) / (s.minutes / 90);
  if (per90 >= 0.9) perf += 0.5;
  else if (per90 >= 0.6) perf += 0.3;
  return clamp(perf, -2, 2);
}

// Erwartete Saisonnote je Position: a + b · (Gesamtwertung − Teamstärke), per Simulation ermittelt.
const EXPECTED: Record<Position, { a: number; b: number; sd: number }> = {
  ST: { a: 6.87, b: 0.073, sd: 0.27 },
  FL: { a: 6.83, b: 0.067, sd: 0.27 },
  ZOM: { a: 6.82, b: 0.064, sd: 0.24 },
  ZM: { a: 6.69, b: 0.051, sd: 0.2 },
  ZDM: { a: 6.68, b: 0.047, sd: 0.19 },
  AV: { a: 6.71, b: 0.047, sd: 0.21 },
  IV: { a: 6.44, b: 0.042, sd: 0.23 },
  TW: { a: 6.37, b: 0.037, sd: 0.22 },
};

/**
 * Leistung im Vergleich zur Erwartung (−2 … +2): Ein Star in einem schwachen Team bekommt
 * automatisch Topnoten – über sich hinaus wächst nur, wer besser spielt als für seine Stärke erwartet.
 */
export function relativePerformance(s: DevStats, position: Position, rel: number): number {
  if (s.avgRating === null || s.minutes < 270) return 0;
  const e = EXPECTED[position];
  // Kürzere Zeiträume streuen stärker – deshalb die Abweichung entsprechend dämpfen.
  const reliability = Math.min(1, s.minutes / 2000);
  const z = ((s.avgRating - (e.a + e.b * clamp(rel, -10, 16))) / e.sd) * reliability;
  return clamp(z, -2, 2);
}

export function describePerformance(perf: number): string {
  if (perf >= 1.4) return 'überragend';
  if (perf >= 0.7) return 'stark';
  if (perf >= 0.2) return 'ordentlich';
  if (perf > -0.5) return 'durchwachsen';
  return 'schwach';
}

/**
 * Entwicklung nach einer Halbserie bzw. Saison:
 * - junge Spieler wachsen Richtung Potenzial – je jünger, je mehr Spielzeit und je besser, desto schneller
 * - wer überragend spielt, kann über sein Potenzial hinauswachsen (auch mit 24–27)
 * - ab 30 baut der Spieler ab (Torhüter 2 Jahre später); starke Leistungen und Spielpraxis bremsen das deutlich
 * - eine starke Halbserie mit viel Spielzeit führt nie zu einem Minus, außer im hohen Alter
 */
export function developPlayer(
  p: PlayerState,
  stats: DevStats,
  teamStrength: number,
  { weight, potentialStats }: DevOptions = { weight: 1 },
): DevelopmentResult {
  const share = shareOf(stats);
  const perf = performanceIndex(stats);
  const rel = p.ovr - teamStrength;
  const relPerf = relativePerformance(stats, p.position, rel);
  const reasons: string[] = [];

  const ptFactor = 0.35 + 0.95 * Math.min(1, share / 0.75);
  const perfFactor = clamp(1 + 0.25 * perf, 0.5, 1.5);
  const trainingFactor = 1 + (teamStrength - 75) * 0.01;
  const age = p.age - (p.position === 'TW' ? 2 : 0);
  const strongHalf = perf >= 0.6 && share >= 0.4;

  // Potenzial am Saisonende anpassen
  let potential = p.potential;
  if (potentialStats) {
    const seasonShare = shareOf(potentialStats);
    const seasonRel = relativePerformance(potentialStats, p.position, rel);
    if (p.age <= 24 && seasonShare >= 0.5 && seasonRel >= 1) {
      potential = Math.min(99, potential + randInt(1, 2));
      reasons.push('Besser gespielt als erwartet – das Potenzial ist gestiegen.');
    } else if (p.age <= 23 && seasonShare < 0.25) {
      const down = randInt(0, 2);
      potential -= down;
      if (down > 0) reasons.push('Zu wenig Spielpraxis – das Potenzial ist gesunken.');
    }
  }

  let change: number;
  if (age < 30) {
    const gap = Math.max(0, potential - p.ovr);
    let growth = gap * growthRate(age) * ptFactor * perfFactor * trainingFactor;
    // Über sich hinauswachsen: nur wer klar über den Erwartungen spielt (bis 27).
    if (age <= 27 && share >= 0.4 && relPerf >= 0.8) growth += 0.5 * relPerf;
    // Zufall schwankt nur das Wachstum – ein Minus gibt es vor 30 nur aus echten Gründen.
    growth = Math.max(0, growth + normal(0, 0.5));
    let setback = 0;
    // Stillstand: Spieler ab 23 ohne Spielpraxis verlieren Rhythmus.
    if (share < 0.2 && age >= 23) setback += 0.8;
    // Deutlich unter den Erwartungen gespielt.
    if (relPerf <= -1 && share >= 0.3) setback += 0.5;
    change = growth - setback;
  } else {
    const base = 0.8 + (age - 30) * 0.9;
    // Starke Leistungen und Spielpraxis bremsen den Abbau – aufhalten lässt er sich nicht.
    const mitigation = Math.max(
      0.5,
      1 - 0.15 * Math.max(0, perf) - 0.15 * Math.max(0, relPerf) - 0.1 * Math.min(1, share / 0.75),
    );
    const penalty = perf < 0 ? 1 + 0.15 * -perf : 1;
    change = -Math.max(0, base * mitigation * penalty + normal(0, 0.4));
  }
  change *= weight;
  // Starke Halbserie mit Spielzeit: kein Rückschritt (bis 29).
  if (strongHalf && age < 30) change = Math.max(0, change);

  // Zufälliges Runden, damit auch kleine Veränderungen pro Halbserie im Schnitt korrekt wirken.
  const whole = Math.floor(change);
  let ovr = p.ovr + whole + (chance(change - whole) ? 1 : 0);
  // Ohne Leistung über den Erwartungen bleibt das Potenzial die Obergrenze.
  if (relPerf < 0.8 && change > 0) ovr = Math.min(ovr, Math.max(potential, p.ovr));
  ovr = clamp(ovr, 40, 99);
  // Wer über sein Potenzial wächst, hebt es mit an.
  potential = Math.max(potential, ovr);
  if (p.age + 1 >= 28) potential = Math.max(ovr, Math.min(potential, ovr + 1));

  if (potentialStats) {
    const seasonPerf = performanceIndex(potentialStats);
    const seasonShare = shareOf(potentialStats);
    reasons.push(`Leistung: ${describePerformance(seasonPerf)} · Spielzeit: ${Math.round(seasonShare * 100)} %.`);
    if (age >= 30) {
      reasons.push(
        seasonPerf >= 0.7
          ? `Mit ${p.age} baut der Körper langsam ab – starke Leistungen bremsen den Abbau deutlich.`
          : `Mit ${p.age} setzt der natürliche Leistungsabfall ein.`,
      );
    } else if (seasonShare < 0.25 && age <= 23) reasons.push('Kaum Einsätze – die Entwicklung stockt.');
    else if (seasonShare >= 0.6 && age <= 23) reasons.push('Viel Spielzeit – ideal für die Entwicklung.');
  }
  return { ovr, potential, reasons };
}
