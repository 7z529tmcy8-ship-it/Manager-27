import { chance, clamp, normal, randInt } from './random';
import { hasTrait } from './traits';
import { skillMods } from './skills';
import type { PlayerState, Position } from './types';

/** Wie schnell sich die Lücke zum Potenzial pro Saison schließt – abhängig vom Alter. */
/**
 * Kleine Extra-Boni (Trainingslager, Ereignisse, Spezialtraining): Bis 87 wirken sie voll,
 * darüber immer seltener, ab 97 gar nicht mehr. Gibt zurück, wie viel wirklich dazukam.
 */
export function bonusOvr(p: { ovr: number; potential: number }, amount = 1): number {
  let gained = 0;
  for (let i = 0; i < amount; i++) {
    if (p.ovr >= 97) break;
    if (p.ovr >= 88 && !chance((97 - p.ovr) / 12)) continue;
    p.ovr += 1;
    gained++;
  }
  p.potential = Math.max(p.potential, p.ovr);
  return gained;
}

function growthRate(age: number): number {
  const table: Record<number, number> = {
    // Langsamer und länger: Die meisten erreichen ihr Bestes erst mit 25–27.
    16: 0.22, 17: 0.22, 18: 0.21, 19: 0.2, 20: 0.19, 21: 0.17, 22: 0.15, 23: 0.13, 24: 0.11, 25: 0.08, 26: 0.06, 27: 0.04, 28: 0.02,
  };
  return age < 16 ? 0.22 : (table[age] ?? 0);
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

// Erwartete Saisonnote je Position: a + b · (Gesamtwertung − Teamstärke) + c · (Teamstärke − 75), per Simulation ermittelt.
const EXPECTED: Record<Position, { a: number; b: number; c: number; sd: number }> = {
  ST: { a: 6.85, b: 0.066, c: 0.013, sd: 0.22 },
  FL: { a: 6.84, b: 0.06, c: 0.016, sd: 0.22 },
  ZOM: { a: 6.83, b: 0.058, c: 0.012, sd: 0.19 },
  ZM: { a: 6.7, b: 0.046, c: 0.01, sd: 0.16 },
  ZDM: { a: 6.7, b: 0.045, c: 0.008, sd: 0.15 },
  AV: { a: 6.72, b: 0.05, c: 0.011, sd: 0.17 },
  IV: { a: 6.5, b: 0.043, c: 0.014, sd: 0.19 },
  TW: { a: 6.45, b: 0.034, c: 0.013, sd: 0.18 },
};

/**
 * Leistung im Vergleich zur Erwartung (−2 … +2): Ein Star in einem schwachen Team bekommt
 * automatisch Topnoten – über sich hinaus wächst nur, wer besser spielt als für seine Stärke erwartet.
 */
export function relativePerformance(s: DevStats, position: Position, rel: number, teamStrength = 75): number {
  if (s.avgRating === null || s.minutes < 270) return 0;
  const e = EXPECTED[position];
  // Kürzere Zeiträume streuen stärker – deshalb die Abweichung entsprechend dämpfen.
  const reliability = Math.min(1, s.minutes / 2000);
  const expected = e.a + e.b * clamp(rel, -10, 16) + e.c * (teamStrength - 75);
  const z = ((s.avgRating - expected) / e.sd) * reliability;
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
  const relPerf = relativePerformance(stats, p.position, rel, teamStrength);
  // Je besser ein Spieler schon ist, desto schwerer fällt jeder weitere Punkt.
  const eliteBrake = clamp((92 - p.ovr) / 12, 0, 1);
  // Natürliche Obergrenze: höchstens 2 Punkte über dem Start-Potenzial (Fähigkeiten-Boni kommen extra dazu).
  const ceiling = Math.min(97, (p.potentialStart ?? p.potential) + 2);
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
    const seasonRel = relativePerformance(potentialStats, p.position, rel, teamStrength);
    if (p.age <= 24 && seasonShare >= 0.5 && seasonRel >= 1 && p.ovr < 90 && potential < ceiling) {
      potential = Math.min(ceiling, potential + (p.ovr >= 85 ? 1 : randInt(1, 2)));
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
    // Spätstarter entwickeln sich zwei Jahre länger.
    let growth = gap * growthRate(p.origin === 'late' ? age - 2 : age) * ptFactor * perfFactor * trainingFactor;
    // Über sich hinauswachsen: nur wer klar über den Erwartungen spielt (bis 27).
    if (age <= 27 && share >= 0.4 && relPerf >= 0.8) growth += 0.5 * relPerf * eliteBrake;
    // Zufall schwankt nur das Wachstum – ein Minus gibt es vor 30 nur aus echten Gründen.
    growth = Math.max(0, growth + normal(0, 0.5));
    let setback = 0;
    // Stillstand: Spieler ab 23 ohne Spielpraxis verlieren Rhythmus.
    if (share < 0.2 && age >= 23) setback += 0.8;
    // Deutlich unter den Erwartungen gespielt.
    if (relPerf <= -1 && share >= 0.3) setback += p.origin === 'family' ? 0.7 : 0.5; // Fußballer-Familie: mehr Druck
    // Partylöwen und Spieler mit Nebenprojekt verschenken Entwicklung.
    if (hasTrait(p, 'party')) growth *= 0.9;
    if (p.sideProject) growth *= 0.92;
    if (p.hooked) growth *= 0.8;
    growth *= skillMods(p).growth;
    // Weltklasse ist schwer: Je näher an der Spitze, desto zäher geht es voran.
    growth *= p.ovr >= 96 ? 0.08 : p.ovr >= 94 ? 0.15 : p.ovr >= 90 ? 0.4 : p.ovr >= 86 ? 0.65 : 1;
    change = growth - setback;
  } else {
    const base = 0.8 + (age - 30) * 0.9;
    // Starke Leistungen und Spielpraxis bremsen den Abbau – aufhalten lässt er sich nicht.
    const mitigation = Math.max(
      0.5,
      1 - 0.15 * Math.max(0, perf) - 0.15 * Math.max(0, relPerf) - 0.1 * Math.min(1, share / 0.75),
    );
    const penalty = perf < 0 ? 1 + 0.15 * -perf : 1;
    const lifestyle = (hasTrait(p, 'professional') ? 0.85 : hasTrait(p, 'party') ? 1.15 : 1) * skillMods(p).decline * (1 + 0.3 * (p.burnout ?? 0)) * (p.hooked ? 1.25 : 1);
    change = -Math.max(0, base * mitigation * penalty * lifestyle + normal(0, 0.4));
  }
  change *= weight;
  // Obergrenze pro Halbserie: Weltklassespieler machen keine Riesensprünge mehr.
  change = Math.min(change, p.ovr >= 93 ? 0.35 : p.ovr >= 89 ? 0.8 : p.ovr >= 85 ? 1.2 : 2.5);
  // Starke Halbserie mit Spielzeit: kein Rückschritt (bis 29).
  if (strongHalf && age < 30) change = Math.max(0, change);

  // Zufälliges Runden, damit auch kleine Veränderungen pro Halbserie im Schnitt korrekt wirken.
  const whole = Math.floor(change);
  let ovr = p.ovr + whole + (chance(change - whole) ? 1 : 0);
  // Ohne Leistung über den Erwartungen bleibt das Potenzial die Obergrenze.
  if (relPerf < 0.8 && change > 0) ovr = Math.min(ovr, Math.max(potential, p.ovr));
  if (change > 0) ovr = Math.min(ovr, Math.max(ceiling, p.ovr));
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
