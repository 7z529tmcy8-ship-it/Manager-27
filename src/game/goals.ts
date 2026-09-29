import { clamp, sigmoid } from './random';
import { ROLE_BONUS, clubStrength, currentClubId, currentRole } from './player';
import type { Career, GoalMetric, GoalResult, MatchLine, SeasonGoal } from './types';

// Grobe Torbeteiligungen pro Spiel je Position (bei voller Spielzeit).
const GOALS: Record<string, number> = { TW: 0, IV: 0.05, AV: 0.04, ZDM: 0.05, ZM: 0.1, ZOM: 0.22, FL: 0.28, ST: 0.45 };
const ASSISTS: Record<string, number> = { TW: 0, IV: 0.03, AV: 0.12, ZDM: 0.07, ZM: 0.14, ZOM: 0.24, FL: 0.22, ST: 0.13 };
const RATING_BASE: Record<string, [number, number]> = {
  ST: [6.85, 0.066], FL: [6.84, 0.06], ZOM: [6.83, 0.058], ZM: [6.7, 0.046],
  ZDM: [6.7, 0.045], AV: [6.72, 0.05], IV: [6.5, 0.043], TW: [6.45, 0.034],
};
const GAMES = 42;

const label = (metric: GoalMetric, target: number) =>
  ({
    goals: `${target} Tore`,
    assists: `${target} Vorlagen`,
    ga: `${target} Torbeteiligungen`,
    apps: `${target} Einsätze`,
    rating: `Ø-Note ${target.toFixed(1)}`,
    cleanSheets: `${target} Spiele zu null`,
  })[metric];

/** Der Trainer setzt zwei Ziele: eines zur Spielzeit bzw. Torausbeute, eines zur Leistung. */
export function createSeasonGoals(career: Career): SeasonGoal[] {
  const p = career.player;
  const clubId = currentClubId(p);
  const s = clubStrength(career, clubId);
  const rel = clamp(p.ovr - s, -10, 16);
  // Erwartete Einsätze nach derselben Logik wie die Aufstellung in der Simulation.
  const selection = p.ovr - s + ROLE_BONUS[currentRole(p)] + (p.morale ?? 0) + (p.captainOf === clubId ? 1 : 0);
  const startP = p.position === 'TW' ? sigmoid((selection + 1) / 1.2) : sigmoid((selection + 1.5) / 2.2);
  const subP = p.position === 'TW' ? 0 : (1 - startP) * sigmoid((selection + 6) / 3) * 0.8;
  const share = startP * 0.9 + subP * 0.25;
  const expectedApps = GAMES * (startP + subP);
  const quality = Math.exp(rel * 0.04);
  const goals: SeasonGoal[] = [];

  const add = (metric: GoalMetric, target: number) => goals.push({ metric, target, label: label(metric, target) });

  if (share <= 0.35) add('apps', Math.max(2, Math.round(expectedApps * 0.9)));
  else if (p.position === 'ST' || p.position === 'FL') add('goals', Math.max(3, Math.round(GOALS[p.position] * quality * GAMES * share * 1.35)));
  else if (p.position === 'ZOM') add('ga', Math.max(4, Math.round((GOALS.ZOM + ASSISTS.ZOM) * quality * GAMES * share * 1.2)));
  else if (p.position === 'ZM') add('assists', Math.max(3, Math.round(ASSISTS.ZM * quality * GAMES * share * 2)));
  else if (p.position === 'TW' || p.position === 'IV' || p.position === 'AV') {
    // Zu-null-Spiele hängen stark von der Mannschaft ab.
    add('cleanSheets', Math.max(3, Math.round(GAMES * share * clamp(0.3 + (s - 75) * 0.025, 0.15, 0.55))));
  } else add('apps', Math.max(10, Math.round(expectedApps * 0.95)));

  const [a, b] = RATING_BASE[p.position];
  const expected = a + b * rel + 0.012 * (s - 75);
  add('rating', Math.round(clamp(expected + (share <= 0.35 ? -0.1 : 0.05), 6.3, 8.2) * 10) / 10);
  return goals;
}

export function goalValue(metric: GoalMetric, matches: MatchLine[]): number {
  const played = matches.filter((m) => m.minutes > 0);
  switch (metric) {
    case 'goals': return played.reduce((a, m) => a + m.goals, 0);
    case 'assists': return played.reduce((a, m) => a + m.assists, 0);
    case 'ga': return played.reduce((a, m) => a + m.goals + m.assists, 0);
    case 'apps': return played.length;
    case 'cleanSheets': return played.filter((m) => m.goalsAgainst === 0 && m.minutes >= 60).length;
    case 'rating': {
      const r = played.map((m) => m.rating ?? 0);
      return r.length ? Math.round((r.reduce((x, y) => x + y, 0) / r.length) * 100) / 100 : 0;
    }
  }
}

export function evaluateGoals(goals: SeasonGoal[], matches: MatchLine[]): GoalResult[] {
  return goals.map((g) => {
    const value = goalValue(g.metric, matches);
    return { ...g, value, met: value >= g.target };
  });
}
