import { CLUBS, LEAGUES, getClub, getLeague } from '../data/leagues';
import { getNation } from '../data/players';
import {
  ROLE_BONUS,
  clubLeagueId,
  clubStrength,
  currentClubId,
  currentRole,
  playerValue,
  seasonLabel,
} from './player';
import { chance, clamp, normal, pick, poisson, rand, randInt, sigmoid, weightedPick } from './random';
import type {
  Career,
  Club,
  Competition,
  CompetitionStats,
  MatchLine,
  PlayerState,
  Position,
  SeasonRecord,
  TableRow,
} from './types';

// Anteil an den Toren bzw. Vorlagen der Mannschaft, wenn der Spieler 90 Minuten spielt.
const GOAL_SHARE: Record<Position, number> = {
  TW: 0, IV: 0.04, AV: 0.03, ZDM: 0.04, ZM: 0.07, ZOM: 0.13, FL: 0.16, ST: 0.24,
};
const ASSIST_SHARE: Record<Position, number> = {
  TW: 0.005, IV: 0.03, AV: 0.1, ZDM: 0.06, ZM: 0.12, ZOM: 0.2, FL: 0.18, ST: 0.12,
};
const DEFENSIVE: Position[] = ['TW', 'IV', 'AV', 'ZDM'];

const EURO_MEAN: Record<string, number> = {
  'Champions League': 80,
  'Europa League': 76,
  'Conference League': 73,
};

const CUP_ROUNDS = ['1. Runde', '2. Runde', 'Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale'];
const EURO_KO = ['Playoffs', 'Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale'];

interface SeasonContext {
  career: Career;
  player: PlayerState;
  clubId: string;
  /** Stärke aller Vereine in dieser Saison (inkl. Tagesform über die Saison). */
  strength: Map<string, number>;
  form: number;
  injuredFor: number;
  injuryWeeks: number;
  matches: MatchLine[];
  notes: string[];
}

function goalsExpected(att: number, def: number, home: boolean, leagueGoals: number): number {
  const base = leagueGoals / 2 + (home ? 0.18 : -0.18);
  return Math.max(0.15, base * Math.exp(0.065 * (att - def)));
}

function playMatch(sHome: number, sAway: number, goals: number): [number, number] {
  return [poisson(goalsExpected(sHome, sAway, true, goals)), poisson(goalsExpected(sAway, sHome, false, goals))];
}

/** Doppelrunde nach dem Kreisverfahren: liefert Spieltage mit [Heim, Gast]. */
function roundRobin(ids: string[]): [string, string][][] {
  const teams = [...ids];
  if (teams.length % 2) teams.push('__bye');
  const n = teams.length;
  const rounds: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = teams[i];
      const b = teams[n - 1 - i];
      if (a !== '__bye' && b !== '__bye') round.push(r % 2 ? [a, b] : [b, a]);
    }
    rounds.push(round);
    teams.splice(1, 0, teams.pop()!);
  }
  const second = rounds.map((round) => round.map(([h, a]) => [a, h] as [string, string]));
  return [...rounds, ...second];
}

function emptyRow(clubId: string): TableRow {
  return { clubId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
}

function addResult(row: TableRow, gf: number, ga: number) {
  row.played++;
  row.goalsFor += gf;
  row.goalsAgainst += ga;
  if (gf > ga) {
    row.won++;
    row.points += 3;
  } else if (gf === ga) {
    row.drawn++;
    row.points += 1;
  } else row.lost++;
}

export function sortTable(rows: TableRow[]): TableRow[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor,
  );
}

function injuryWeeks(): number {
  return weightedPick([1, 2, 3, 4, 6, 8, 12, 20, 30], (w) => ({ 1: 30, 2: 25, 3: 15, 4: 10, 6: 8, 8: 5, 12: 4, 20: 2, 30: 1 })[w]!);
}

/**
 * Ein Spiel der eigenen Mannschaft inklusive Einsatz, Toren, Vorlagen und Note des Spielers.
 * `rotation` gibt Ergänzungsspielern z. B. im Pokal bessere Einsatzchancen.
 */
function playerMatch(
  ctx: SeasonContext,
  competition: Competition,
  opponentId: string,
  home: boolean,
  goalsPerGame: number,
  rotation = 0,
): MatchLine {
  const { player } = ctx;
  const own = ctx.strength.get(ctx.clubId)!;
  const opp = ctx.strength.get(opponentId) ?? getClub(opponentId).strength;
  const rel = player.ovr - own;
  let status: MatchLine['status'] = 'bench';
  let minutes = 0;

  if (ctx.injuredFor > 0) {
    ctx.injuredFor--;
    status = 'injured';
  } else {
    const selection = rel + ROLE_BONUS[currentRole(player)] + (ctx.form - 6.8) * 2 + rotation;
    const startP = player.position === 'TW' ? sigmoid((selection + 1) / 1.2) : sigmoid((selection + 1.5) / 2.2);
    if (chance(startP)) {
      status = 'start';
      minutes = chance(0.45 + clamp(rel * 0.05, -0.2, 0.4)) || player.position === 'TW' ? 90 : randInt(55, 85);
    } else if (player.position !== 'TW' && chance(sigmoid((selection + 6) / 3) * 0.8)) {
      status = 'sub';
      minutes = randInt(8, 35);
    }
  }

  const share = minutes / 90;
  const boost = minutes > 0 ? (player.ovr - own) * 0.09 * share : 0;
  const [gf, ga] = home
    ? playMatch(own + boost, opp, goalsPerGame)
    : playMatch(opp, own + boost, goalsPerGame).reverse() as [number, number];

  let goals = 0;
  let assists = 0;
  let rating: number | null = null;
  if (minutes > 0) {
    const pGoal = Math.min(0.8, GOAL_SHARE[player.position] * Math.exp(rel * 0.04) * share);
    const pAssist = Math.min(0.6, ASSIST_SHARE[player.position] * Math.exp(rel * 0.04) * share);
    for (let g = 0; g < gf; g++) {
      if (chance(pGoal)) goals++;
      else if (chance(pAssist / (1 - pGoal))) assists++;
    }
    let r = 6.5 + rel * 0.03 + (gf > ga ? 0.35 : gf < ga ? -0.35 : 0) + goals * 0.9 + assists * 0.6;
    if (DEFENSIVE.includes(player.position)) {
      if (ga === 0 && minutes >= 60) r += 0.5;
      if (player.position === 'TW' || player.position === 'IV') r -= ga * 0.15;
    }
    r += normal(0, 0.45);
    if (minutes < 30) r = 6.5 + (r - 6.5) * 0.6;
    rating = Math.round(clamp(r, 3, 10) * 10) / 10;
    ctx.form = ctx.form * 0.8 + rating * 0.2;

    const injuryRisk = 0.012 + Math.max(0, player.age - 30) * 0.002;
    if (chance(injuryRisk * share)) {
      const weeks = injuryWeeks();
      ctx.injuredFor = Math.round(weeks * 1.3);
      ctx.injuryWeeks += weeks;
      ctx.notes.push(`Verletzung gegen ${getClub(opponentId).name}: ${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'} Pause.`);
    }
  }

  const line: MatchLine = { competition, opponent: opponentId, home, goalsFor: gf, goalsAgainst: ga, status, minutes, goals, assists, rating };
  ctx.matches.push(line);
  return line;
}

/** Zieht einen Gegner aus einem Pool, bevorzugt Vereine nahe an der Zielstärke. */
function drawOpponent(pool: Club[], target: number, exclude: Set<string>, strength: Map<string, number>): Club {
  const options = pool.filter((c) => !exclude.has(c.id));
  return weightedPick(options, (c) => Math.exp(-(((strength.get(c.id) ?? c.strength) - target) ** 2) / 18) + 0.01);
}

interface Scheduled {
  at: number;
  play: () => void;
}

function scheduleCup(ctx: SeasonContext, leagueGoals: number, onEnd: (reached: string, won: boolean) => void): Scheduled[] {
  const country = getLeague(clubLeagueId(ctx.career, ctx.clubId)).country;
  const pool = CLUBS.filter((c) => getLeague(clubLeagueId(ctx.career, c.id)).country === country && c.id !== ctx.clubId);
  const sorted = [...pool].sort((a, b) => (ctx.strength.get(a.id) ?? 0) - (ctx.strength.get(b.id) ?? 0));
  const fractions = [0.05, 0.3, 0.48, 0.62, 0.78, 0.99];
  let alive = true;
  const used = new Set<string>();
  return CUP_ROUNDS.map((name, i) => ({
    at: fractions[i],
    play: () => {
      if (!alive) return;
      // Frühe Runden eher gegen schwächere, späte Runden gegen stärkere Gegner.
      const lo = Math.floor((sorted.length * i) / (CUP_ROUNDS.length + 2));
      const opponent = pick(sorted.slice(lo).filter((c) => !used.has(c.id)));
      used.add(opponent.id);
      const line = playerMatch(ctx, 'Pokal', opponent.id, chance(0.5), leagueGoals, i < 3 ? 3 : 0);
      let won = line.goalsFor > line.goalsAgainst;
      if (line.goalsFor === line.goalsAgainst) won = chance(0.5);
      if (!won) {
        alive = false;
        onEnd(name, false);
      } else if (name === 'Finale') onEnd('Sieger', true);
    },
  }));
}

function scheduleEurope(
  ctx: SeasonContext,
  competition: Competition,
  onEnd: (reached: string, won: boolean) => void,
): Scheduled[] {
  const ownLeague = clubLeagueId(ctx.career, ctx.clubId);
  const pool = CLUBS.filter((c) => {
    const l = getLeague(clubLeagueId(ctx.career, c.id));
    return l.tier === 1 && c.id !== ctx.clubId;
  });
  const mean = EURO_MEAN[competition];
  const phaseFractions = [0.1, 0.17, 0.24, 0.3, 0.36, 0.42, 0.52, 0.58];
  const koFractions: [number, number][] = [[0.64, 0.67], [0.72, 0.75], [0.8, 0.83], [0.88, 0.91], [1.0, 1.0]];
  const used = new Set<string>();
  let points = 0;
  let stage: 'phase' | 'out' | number = 'phase';
  const items: Scheduled[] = [];

  phaseFractions.forEach((at, i) =>
    items.push({
      at,
      play: () => {
        const opponent = drawOpponent(
          pool.filter((c) => clubLeagueId(ctx.career, c.id) !== ownLeague),
          mean + normal(0, 3),
          used,
          ctx.strength,
        );
        used.add(opponent.id);
        const line = playerMatch(ctx, competition, opponent.id, i % 2 === 0, 2.9, 0.5);
        points += line.goalsFor > line.goalsAgainst ? 3 : line.goalsFor === line.goalsAgainst ? 1 : 0;
        if (i === phaseFractions.length - 1) {
          if (points >= 16) stage = 1;
          else if (points >= 10) stage = 0;
          else {
            stage = 'out';
            onEnd('Ligaphase', false);
          }
        }
      },
    }),
  );

  koFractions.forEach(([first, second], round) => {
    let opponent: Club | null = null;
    let agg = [0, 0];
    const isFinal = EURO_KO[round] === 'Finale';
    const leg = (legNo: number) => () => {
      if (stage !== round) return;
      if (legNo === 0) {
        opponent = drawOpponent(pool, mean + round * 2 + normal(0, 2), used, ctx.strength);
        used.add(opponent.id);
        agg = [0, 0];
      }
      const line = playerMatch(ctx, competition, opponent!.id, isFinal ? chance(0.5) : legNo === 1, 2.8);
      agg[0] += line.goalsFor;
      agg[1] += line.goalsAgainst;
      if (isFinal || legNo === 1) {
        const won = agg[0] > agg[1] || (agg[0] === agg[1] && chance(0.5));
        if (!won) {
          stage = 'out';
          onEnd(EURO_KO[round], false);
        } else if (isFinal) {
          stage = 'out';
          onEnd('Sieger', true);
        } else stage = round + 1;
      }
    };
    items.push({ at: first, play: leg(0) });
    if (!isFinal) items.push({ at: second, play: leg(1) });
  });
  return items;
}

function summarize(matches: MatchLine[], competition: Competition): CompetitionStats {
  const played = matches.filter((m) => m.competition === competition && m.minutes > 0);
  const ratings = played.map((m) => m.rating!).filter((r) => r !== null);
  return {
    competition,
    apps: played.length,
    minutes: played.reduce((a, m) => a + m.minutes, 0),
    goals: played.reduce((a, m) => a + m.goals, 0),
    assists: played.reduce((a, m) => a + m.assists, 0),
    avgRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100 : null,
  };
}

const TITLE_ODDS: Record<string, number> = {
  Spanien: 0.15, Frankreich: 0.14, England: 0.12, Argentinien: 0.12, Brasilien: 0.1, Deutschland: 0.09,
  Portugal: 0.08, Niederlande: 0.06, Italien: 0.05, Belgien: 0.03, Kroatien: 0.03,
};
const EUROPEAN = ['Deutschland', 'Österreich', 'Schweiz', 'Türkei', 'England', 'Frankreich', 'Spanien', 'Italien',
  'Portugal', 'Niederlande', 'Belgien', 'Kroatien', 'Polen', 'Norwegen'];

function tournamentName(nation: string, summer: number): string | null {
  if (summer % 4 === 2) return `Weltmeisterschaft ${summer}`;
  if (summer % 4 !== 0) return null;
  if (EUROPEAN.includes(nation)) return `Europameisterschaft ${summer}`;
  if (nation === 'Brasilien' || nation === 'Argentinien') return `Copa América ${summer}`;
  if (nation === 'USA') return `Gold Cup ${summer}`;
  if (nation === 'Japan') return `Asienmeisterschaft ${summer}`;
  return null;
}

export interface SeasonOutcome {
  record: SeasonRecord;
  tables: Record<string, TableRow[]>;
}

/** Simuliert eine komplette Saison: alle Ligen, Pokal, Europapokal und die Einsätze des Spielers. */
export function simulateSeason(career: Career): SeasonOutcome {
  const player = career.player;
  const clubId = currentClubId(player);
  const leagueId = clubLeagueId(career, clubId);
  const league = getLeague(leagueId);

  const strength = new Map<string, number>();
  for (const c of CLUBS) strength.set(c.id, clubStrength(career, c.id) + normal(0, 1.2));

  const ctx: SeasonContext = {
    career, player, clubId, strength, form: 6.8, injuredFor: 0, injuryWeeks: 0, matches: [], notes: [],
  };

  let cupReached = '';
  let euro: { competition: Competition; reached: string } | null = null;
  const trophies: string[] = [];

  // Alle Ligen werden komplett durchgespielt; nur die eigene Liga mit Einsätzen des Spielers.
  const tables: Record<string, TableRow[]> = {};
  for (const l of LEAGUES) {
    const ids = CLUBS.filter((c) => clubLeagueId(career, c.id) === l.id).map((c) => c.id);
    const rows = new Map(ids.map((id) => [id, emptyRow(id)]));
    const rounds = roundRobin(ids);
    const extras: Scheduled[] = [];

    if (l.id === leagueId) {
      extras.push(
        ...scheduleCup(ctx, l.goalsPerGame, (reached, won) => {
          cupReached = reached;
          if (won) trophies.push(l.cup);
        }),
      );
      const slot = career.europeSlots[clubId];
      if (slot) {
        const entry = { competition: slot, reached: '' };
        euro = entry;
        extras.push(
          ...scheduleEurope(ctx, slot, (reached, won) => {
            entry.reached = reached;
            if (won) trophies.push(slot);
          }),
        );
      }
      extras.sort((a, b) => a.at - b.at);
    }

    let next = 0;
    rounds.forEach((round, r) => {
      while (next < extras.length && extras[next].at <= r / rounds.length) extras[next++].play();
      for (const [h, a] of round) {
        let gh: number;
        let ga: number;
        if (h === clubId || a === clubId) {
          const home = h === clubId;
          const line = playerMatch(ctx, 'Liga', home ? a : h, home, l.goalsPerGame);
          [gh, ga] = home ? [line.goalsFor, line.goalsAgainst] : [line.goalsAgainst, line.goalsFor];
        } else [gh, ga] = playMatch(strength.get(h)!, strength.get(a)!, l.goalsPerGame);
        addResult(rows.get(h)!, gh, ga);
        addResult(rows.get(a)!, ga, gh);
      }
    });
    while (next < extras.length) extras[next++].play();
    tables[l.id] = sortTable([...rows.values()]);
  }

  const table = tables[leagueId];
  const position = table.findIndex((r) => r.clubId === clubId) + 1;
  const played = ctx.matches.filter((m) => m.minutes > 0);
  const ratings = played.map((m) => m.rating!);
  const avgRating = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100 : null;
  const goals = played.reduce((a, m) => a + m.goals, 0);
  const assists = played.reduce((a, m) => a + m.assists, 0);
  const minutes = played.reduce((a, m) => a + m.minutes, 0);

  const allTrophies: string[] = [];
  if (played.length > 0) {
    if (position === 1) allTrophies.push(league.tier === 1 ? `Meister (${league.name})` : `Meister (${league.name}, Aufstieg)`);
    allTrophies.push(...trophies);
  }

  const awards: string[] = [];
  const leagueStats = summarize(ctx.matches, 'Liga');
  const topScorerMark = Math.max(12, Math.round(league.topScorerGoals * normal(1, 0.12)));
  if (leagueStats.goals >= topScorerMark) awards.push(`Torschützenkönig ${league.name}`);
  if (leagueStats.avgRating !== null && leagueStats.avgRating >= 7.5 && leagueStats.apps >= 20 && position <= 4) {
    awards.push(`Spieler der Saison ${league.name}`);
  }
  if (player.age <= 20 && player.ovr >= 80 && avgRating !== null && avgRating >= 7.2 && played.length >= 25 && chance(0.6)) {
    awards.push('Golden Boy');
  }
  const bigTitle = allTrophies.some((t) => t.startsWith('Meister')) || allTrophies.includes('Champions League');
  if (player.ovr >= 88 && avgRating !== null && avgRating >= 7.5 && bigTitle && chance(allTrophies.includes('Champions League') ? 0.6 : 0.3)) {
    awards.push('Ballon d’Or');
  }

  // Nationalmannschaft
  const nation = getNation(player.nation);
  let caps = 0;
  let intGoals = 0;
  if (player.ovr >= nation.callUp - 3 && ctx.injuryWeeks < 20) {
    const p = sigmoid((player.ovr - nation.callUp + 1) / 1.5);
    const windows = 5;
    for (let i = 0; i < windows; i++) if (chance(p)) caps += randInt(1, 2);
    const summer = career.year + 1;
    const tournament = tournamentName(player.nation, summer);
    if (tournament && player.ovr >= nation.callUp && caps > 0) {
      caps += randInt(3, 7);
      const odds = (TITLE_ODDS[player.nation] ?? 0.01) + (player.ovr >= 88 ? 0.02 : 0);
      if (chance(odds)) allTrophies.push(tournament);
      else ctx.notes.push(`Mit ${player.nation} bei der ${tournament} dabei.`);
    }
    const rate = (GOAL_SHARE[player.position] * 1.2) * Math.exp((player.ovr - nation.callUp) * 0.05);
    for (let i = 0; i < caps; i++) intGoals += poisson(rate);
  }

  const record: SeasonRecord = {
    season: seasonLabel(career.year),
    age: player.age,
    clubId,
    onLoan: player.loan !== null,
    leagueId,
    ovrStart: player.ovr,
    ovrEnd: player.ovr,
    apps: played.length,
    starts: ctx.matches.filter((m) => m.status === 'start').length,
    minutes,
    possibleMinutes: ctx.matches.length * 90,
    goals,
    assists,
    cleanSheets: ['TW', 'IV', 'AV'].includes(player.position)
      ? played.filter((m) => m.goalsAgainst === 0 && m.minutes >= 60).length
      : 0,
    avgRating,
    injuryWeeks: ctx.injuryWeeks,
    leaguePosition: position,
    marketValue: playerValue(player),
    trophies: allTrophies,
    awards,
    caps,
    internationalGoals: intGoals,
    byCompetition: (['Liga', 'Pokal', 'Champions League', 'Europa League', 'Conference League'] as Competition[])
      .map((c) => summarize(ctx.matches, c))
      .filter((s, i) => i < 2 || ctx.matches.some((m) => m.competition === s.competition)),
    table,
    europe: euro,
    cupReached: cupReached || 'Sieger',
    notes: ctx.notes,
  };
  return { record, tables };
}

/** Auf-/Abstieg, Europapokalplätze und leichte Veränderung der Vereinsstärken für die nächste Saison. */
export function applyLeagueChanges(career: Career, tables: Record<string, TableRow[]>): string[] {
  const news: string[] = [];
  const clubLeague = { ...career.clubLeague };
  const drift = { ...career.clubDrift };

  for (const l of LEAGUES) {
    const table = tables[l.id];
    if (l.down) {
      const lower = tables[l.down.leagueId];
      const down = table.slice(-l.down.spots).map((r) => r.clubId);
      const up = lower.slice(0, l.down.spots).map((r) => r.clubId);
      down.forEach((id) => {
        clubLeague[id] = l.down!.leagueId;
        drift[id] = (drift[id] ?? 0) - 1;
      });
      up.forEach((id) => {
        clubLeague[id] = l.id;
        drift[id] = (drift[id] ?? 0) + 1;
      });
      news.push(`Absteiger ${l.name}: ${down.map((id) => getClub(id).name).join(', ')}`);
      news.push(`Aufsteiger in die ${l.name}: ${up.map((id) => getClub(id).name).join(', ')}`);
    }
  }

  const slots: Record<string, Competition> = {};
  for (const l of LEAGUES) {
    if (l.tier !== 1) continue;
    const order = tables[l.id].map((r) => r.clubId);
    let i = 0;
    for (let k = 0; k < l.europe.cl; k++) slots[order[i++]] = 'Champions League';
    for (let k = 0; k < l.europe.el; k++) slots[order[i++]] = 'Europa League';
    for (let k = 0; k < l.europe.conf; k++) slots[order[i++]] = 'Conference League';
  }

  // Vereine entwickeln sich: Erfolg bringt Geld, Misserfolg kostet. Mit Tendenz zur Mitte.
  for (const l of LEAGUES) {
    const table = tables[l.id];
    table.forEach((row, idx) => {
      const expected = table.length / 2;
      const perf = (expected - idx) / table.length;
      drift[row.clubId] = clamp((drift[row.clubId] ?? 0) * 0.85 + perf * 1.2 + normal(0, 0.6), -6, 6);
    });
  }

  career.clubLeague = clubLeague;
  career.clubDrift = drift;
  career.europeSlots = slots;
  return news;
}

/** Europapokalplätze für die erste Saison: nach Teamstärke je Liga. */
export function initialEuropeSlots(): Record<string, Competition> {
  const slots: Record<string, Competition> = {};
  for (const l of LEAGUES) {
    if (l.tier !== 1) continue;
    const order = CLUBS.filter((c) => c.leagueId === l.id)
      .map((c) => ({ id: c.id, s: c.strength + rand(-0.5, 0.5) }))
      .sort((a, b) => b.s - a.s)
      .map((c) => c.id);
    let i = 0;
    for (let k = 0; k < l.europe.cl; k++) slots[order[i++]] = 'Champions League';
    for (let k = 0; k < l.europe.el; k++) slots[order[i++]] = 'Europa League';
    for (let k = 0; k < l.europe.conf; k++) slots[order[i++]] = 'Conference League';
  }
  return slots;
}
