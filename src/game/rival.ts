import { CLUBS, getClub } from '../data/leagues';
import { NATIONS } from '../data/players';
import { developPlayer } from './development';
import { clubStrength, seasonLabel } from './player';
import { chance, clamp, normal, pick, poisson, rand, randInt, sigmoid, weightedPick } from './random';
import type { Career, PlayerState, Position, RivalSeason, RivalState, SeasonRecord } from './types';

export const FIRST = ['Luca', 'Noah', 'Leon', 'Jonas', 'Elias', 'Mateo', 'Kian', 'Rayan', 'Milan', 'Adrian', 'Enzo', 'Julian',
  'Lorenzo', 'Tiago', 'Oscar', 'Emil', 'Nico', 'Yannick', 'Malik', 'Samuel', 'Davide', 'Kaito', 'Hugo', 'Arthur'];
export const LAST = ['Brandt', 'Keller', 'Wagner', 'Rossi', 'Moreau', 'García', 'Silva', 'Jansen', 'Nowak', 'Yilmaz', 'Hartmann',
  'Lindqvist', 'Costa', 'Petrović', 'Fischer', 'Dubois', 'Romero', 'de Vries', 'Almeida', 'Takahashi', 'Kovač', 'Sørensen'];

// Erwartete Saisonnote nach Stärkeabstand (wie in der Entwicklung)
const EXPECTED: Record<Position, [number, number]> = {
  ST: [6.87, 0.073], FL: [6.83, 0.067], ZOM: [6.82, 0.064], ZM: [6.69, 0.051],
  ZDM: [6.68, 0.047], AV: [6.71, 0.047], IV: [6.44, 0.042], TW: [6.37, 0.037],
};
const GOALS_PER_GAME: Record<Position, number> = { TW: 0, IV: 0.05, AV: 0.04, ZDM: 0.05, ZM: 0.1, ZOM: 0.22, FL: 0.28, ST: 0.45 };
const ASSISTS_PER_GAME: Record<Position, number> = { TW: 0.01, IV: 0.03, AV: 0.12, ZDM: 0.07, ZM: 0.14, ZOM: 0.24, FL: 0.22, ST: 0.13 };

function pickClub(career: Career | null, target: number, exclude: string[]): string {
  const strength = (id: string) => (career ? clubStrength(career, id) : getClub(id).strength);
  const options = CLUBS.filter((c) => !exclude.includes(c.id));
  return weightedPick(options, (c) => Math.exp(-((strength(c.id) - target) ** 2) / 6) + 1e-6).id;
}

/** Erzeugt einen Rivalen: gleiche Position, ähnliches Alter und ähnliches Talent. */
export function createRival(player: Pick<PlayerState, 'nation' | 'position' | 'age' | 'ovr' | 'potential'>, playerClubId: string): RivalState {
  const sameNation = chance(0.6);
  const ovr = clamp(player.ovr + randInt(-2, 2), 45, 95);
  return {
    name: `${pick(FIRST)} ${pick(LAST)}`,
    nation: sameNation ? player.nation : pick(NATIONS).name,
    position: player.position,
    age: Math.max(16, player.age + randInt(-1, 1)),
    ovr,
    potential: clamp(player.potential + randInt(-3, 3), ovr, 97),
    clubId: pickClub(null, ovr + randInt(2, 7), [playerClubId]),
    retired: false,
    history: [],
  };
}

function duelScore(position: Position, rating: number | null, goals: number, assists: number, apps: number): number {
  const attacking = ['ST', 'FL', 'ZOM'].includes(position);
  return (rating ?? 6) * 10 + (attacking ? goals + assists * 0.7 : goals * 2 + assists) + apps * 0.1;
}

/**
 * Simuliert die Saison des Rivalen (vereinfacht) inkl. Entwicklung und möglichem Vereinswechsel.
 * Gibt eine Schlagzeile zurück, wenn etwas Erwähnenswertes passiert ist.
 */
export function simulateRivalSeason(career: Career, record: SeasonRecord): string[] {
  const r = career.rival;
  if (!r || r.retired) return [];
  const news: string[] = [];
  const s = clubStrength(career, r.clubId);
  const rel = r.ovr - s;
  const share = clamp(sigmoid((rel + 2) / 2.5) * 0.95 - (chance(0.15) ? rand(0, 0.4) : 0), 0.02, 0.97);
  const games = 40;
  const apps = Math.round(games * clamp(share + 0.1, 0, 1));
  const [a, b] = EXPECTED[r.position];
  const avgRating = Math.round(clamp(a + b * clamp(rel, -10, 16) + normal(0, 0.22), 5.5, 9) * 100) / 100;
  const quality = Math.exp(rel * 0.04);
  const goals = poisson(GOALS_PER_GAME[r.position] * quality * games * share);
  const assists = poisson(ASSISTS_PER_GAME[r.position] * quality * games * share);

  const ovrStart = r.ovr;
  const asPlayer = { ...r, profile: [], contract: {}, loan: null, caps: 0, internationalGoals: 0 } as unknown as PlayerState;
  const stats = { minutes: share * games * 90, possibleMinutes: games * 90, avgRating, apps, goals, assists };
  const dev = developPlayer(asPlayer, stats, s, { weight: 1, potentialStats: stats });
  r.ovr = dev.ovr;
  r.potential = dev.potential;

  const mine = duelScore(career.player.position, record.avgRating, record.goals, record.assists, record.apps);
  const theirs = duelScore(r.position, avgRating, goals, assists, apps);
  const duel: RivalSeason['duel'] = Math.abs(mine - theirs) < 2 ? 'draw' : mine > theirs ? 'player' : 'rival';
  r.history.push({ season: seasonLabel(career.year), age: r.age, clubId: r.clubId, ovrStart, ovrEnd: r.ovr, apps, goals, assists, avgRating, duel });

  if (goals >= 18) news.push(`Rivale ${r.name} knipst ${goals}-mal für ${getClub(r.clubId).name}.`);
  else if (r.ovr - ovrStart >= 3) news.push(`${r.name} macht einen Riesensprung – Wertung jetzt ${r.ovr}.`);

  r.age += 1;
  // Wechsel: zu stark für den Verein → Aufstieg; zu wenig Spielzeit → Schritt zurück
  if (r.ovr >= s + 3 && chance(0.6)) {
    const to = pickClub(career, r.ovr + randInt(0, 2), [r.clubId, career.player.contract.clubId]);
    news.push(`Transfer-Hammer: Dein Rivale ${r.name} wechselt zu ${getClub(to).name}.`);
    r.clubId = to;
  } else if (rel <= -5 && chance(0.5)) {
    const to = pickClub(career, r.ovr - 1, [r.clubId]);
    news.push(`${r.name} sucht Spielpraxis und geht zu ${getClub(to).name}.`);
    r.clubId = to;
  }
  if ((r.age >= 36 && r.ovr < 72) || r.age >= 39) {
    r.retired = true;
    news.push(`Dein ewiger Rivale ${r.name} beendet mit ${r.age} Jahren seine Karriere.`);
  }
  return news;
}

export function duelRecord(r: RivalState): { player: number; rival: number; draw: number } {
  return {
    player: r.history.filter((h) => h.duel === 'player').length,
    rival: r.history.filter((h) => h.duel === 'rival').length,
    draw: r.history.filter((h) => h.duel === 'draw').length,
  };
}
