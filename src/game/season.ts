import { CLUBS, LEAGUES, canPlayIn, getClub, getLeague } from '../data/leagues';
import { getNation } from '../data/players';
import {
  ROLE_BONUS,
  clubLeagueId,
  clubStrength,
  currentClubId,
  currentRole,
  payWages,
  playerValue,
  seasonLabel,
} from './player';
import { injuryFactor } from './training';
import { hasTrait } from './traits';
import { chance, clamp, normal, pick, poisson, rand, randInt, sigmoid, weightedPick } from './random';
import type {
  Career,
  Club,
  Competition,
  CompetitionStats,
  EuroState,
  MatchLine,
  NationalSeason,
  PlayerState,
  Position,
  SeasonProgress,
  SeasonRecord,
  StageLoad,
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
  /** Verein, für den der Spieler in dieser Halbserie spielt. */
  clubId: string;
  half: 1 | 2;
  prog: SeasonProgress;
  stage: number;
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
const ownsCurrentClub = (ctx: SeasonContext) => ctx.career.owner?.clubId === ctx.clubId;

function playerMatch(
  ctx: SeasonContext,
  competition: Competition,
  opponentId: string,
  home: boolean,
  goalsPerGame: number,
  rotation = 0,
): MatchLine {
  const { player, prog } = ctx;
  const own = prog.strength[ctx.clubId];
  const opp = prog.strength[opponentId] ?? getClub(opponentId).strength;
  const rel = player.ovr - own;
  let status: MatchLine['status'] = 'bench';
  let minutes = 0;

  if (player.absent) {
    status = 'injured';
  } else if (prog.injuredFor > 0) {
    prog.injuredFor--;
    status = 'injured';
  } else {
    const captain = player.captainOf === ctx.clubId ? 1 : 0;
    // Der Präsident stellt sich selbst auf.
    const president = ownsCurrentClub(ctx) ? 4 : 0;
    const load = LOADS[prog.load ?? 'normal'];
    const selection = rel + ROLE_BONUS[currentRole(player)] + (prog.form - 6.8) * 2 + (player.morale ?? 0) + captain + president + rotation + load.selection;
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
    const penalties = (player.penaltyTakerOf === ctx.clubId ? 1.15 : 1) * (hasTrait(player, 'showman') ? 1.05 : 1);
    const pGoal = Math.min(0.8, GOAL_SHARE[player.position] * penalties * Math.exp(rel * 0.04) * share);
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
    // Unberechenbare Spieler schwanken stärker.
    r += normal(0, hasTrait(player, 'wildcard') ? 0.7 : 0.45);
    // Heißsporn: gelegentlich Rot und Sperre.
    if (hasTrait(player, 'hothead') && chance(0.02)) {
      r -= 1.2;
      const ban = randInt(1, 3);
      prog.injuredFor += ban;
      prog.notes.push(`Rote Karte gegen ${getClub(opponentId).name} – ${ban} ${ban === 1 ? 'Spiel' : 'Spiele'} Sperre.`);
    }
    if (minutes < 30) r = 6.5 + (r - 6.5) * 0.6;
    rating = Math.round(clamp(r, 3, 10) * 10) / 10;
    prog.form = prog.form * 0.8 + rating * 0.2;

    const injuryRisk = (0.012 + Math.max(0, player.age - 30) * 0.002) * injuryFactor(player) * LOADS[prog.load ?? 'normal'].injury;
    if (chance(injuryRisk * share)) {
      const weeks = injuryWeeks();
      prog.injuredFor = Math.round(weeks * 1.3);
      prog.injuryWeeks += weeks;
      prog.notes.push(`Verletzung gegen ${getClub(opponentId).name}: ${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'} Pause.`);
    }
  }

  const line: MatchLine = {
    competition, opponent: opponentId, home, goalsFor: gf, goalsAgainst: ga, status, minutes, goals, assists, rating,
    clubId: ctx.clubId, half: ctx.half, stage: ctx.stage,
  };
  prog.matches.push(line);
  return line;
}

/** Zieht einen Gegner aus einem Pool, bevorzugt Vereine nahe an der Zielstärke. */
function drawOpponent(pool: Club[], target: number, exclude: string[], strength: Record<string, number>): Club {
  const options = pool.filter((c) => !exclude.includes(c.id));
  return weightedPick(options, (c) => Math.exp(-(((strength[c.id] ?? c.strength) - target) ** 2) / 18) + 0.01);
}

interface Scheduled {
  at: number;
  play: () => void;
}

// Zeitpunkte im Saisonverlauf (0 = Saisonstart, 1 = Saisonende); < 0.5 liegt in der Hinrunde.
const CUP_AT = [0.05, 0.3, 0.48, 0.62, 0.78, 0.99];
const EURO_PHASE_AT = [0.1, 0.17, 0.24, 0.3, 0.36, 0.42, 0.52, 0.58];
const EURO_KO_AT: [number, number][] = [[0.64, 0.67], [0.72, 0.75], [0.8, 0.83], [0.88, 0.91], [1.0, 1.0]];

const cupName = (ctx: SeasonContext) => getLeague(clubLeagueId(ctx.career, ctx.clubId)).cup;

function scheduleCup(ctx: SeasonContext, leagueGoals: number): Scheduled[] {
  const cup = ctx.prog.cup;
  const country = getLeague(clubLeagueId(ctx.career, ctx.clubId)).country;
  const pool = CLUBS.filter((c) => getLeague(clubLeagueId(ctx.career, c.id)).country === country && c.id !== ctx.clubId);
  const sorted = [...pool].sort((a, b) => (ctx.prog.strength[a.id] ?? 0) - (ctx.prog.strength[b.id] ?? 0));
  return CUP_ROUNDS.map((name, i) => ({
    at: CUP_AT[i],
    play: () => {
      if (!cup.alive || !cup.eligible) return;
      // Frühe Runden eher gegen schwächere, späte Runden gegen stärkere Gegner.
      const lo = Math.floor((sorted.length * i) / (CUP_ROUNDS.length + 2));
      const opponent = pick(sorted.slice(lo).filter((c) => !cup.used.includes(c.id)));
      cup.used.push(opponent.id);
      if (name === 'Finale') {
        // Das Finale wird live erlebt.
        ctx.prog.pendingFinals = [...(ctx.prog.pendingFinals ?? []), {
          kind: 'cup', title: `${cupName(ctx)}-Finale`, opponentId: opponent.id, opponentName: opponent.name,
          opponentStrength: ctx.prog.strength[opponent.id] ?? opponent.strength,
        }];
        cup.alive = false;
        cup.reached = 'Finale';
        return;
      }
      const line = playerMatch(ctx, 'Pokal', opponent.id, chance(0.5), leagueGoals, i < 3 ? 3 : 0);
      let won = line.goalsFor > line.goalsAgainst;
      if (line.goalsFor === line.goalsAgainst) won = chance(0.5);
      if (!won) {
        cup.alive = false;
        cup.reached = name;
      } else if (name === 'Finale') {
        cup.alive = false;
        cup.reached = 'Sieger';
        cup.won = true;
      }
    },
  }));
}

function scheduleEurope(ctx: SeasonContext, euro: EuroState): Scheduled[] {
  const ownLeague = clubLeagueId(ctx.career, ctx.clubId);
  const pool = CLUBS.filter((c) => getLeague(clubLeagueId(ctx.career, c.id)).tier === 1 && c.id !== ctx.clubId);
  const mean = EURO_MEAN[euro.competition];
  const items: Scheduled[] = [];

  EURO_PHASE_AT.forEach((at, i) =>
    items.push({
      at,
      play: () => {
        if (euro.stage !== 'phase' || !euro.eligible) return;
        const foreign = pool.filter((c) => clubLeagueId(ctx.career, c.id) !== ownLeague);
        const opponent = drawOpponent(foreign, mean + normal(0, 3), euro.used, ctx.prog.strength);
        euro.used.push(opponent.id);
        const line = playerMatch(ctx, euro.competition, opponent.id, i % 2 === 0, 2.9, 0.5);
        euro.points += line.goalsFor > line.goalsAgainst ? 3 : line.goalsFor === line.goalsAgainst ? 1 : 0;
        if (i === EURO_PHASE_AT.length - 1) {
          if (euro.points >= 16) euro.stage = 1;
          else if (euro.points >= 10) euro.stage = 0;
          else {
            euro.stage = 'out';
            euro.reached = 'Ligaphase';
          }
        }
      },
    }),
  );

  EURO_KO_AT.forEach(([first, second], round) => {
    const isFinal = EURO_KO[round] === 'Finale';
    const leg = (legNo: number) => () => {
      if (euro.stage !== round || !euro.eligible) return;
      if (legNo === 0) {
        const opponent = drawOpponent(pool, mean + round * 2 + normal(0, 2), euro.used, ctx.prog.strength);
        euro.used.push(opponent.id);
        euro.opponentId = opponent.id;
        euro.agg = [0, 0];
        if (isFinal) {
          // Das Endspiel wird live erlebt.
          ctx.prog.pendingFinals = [...(ctx.prog.pendingFinals ?? []), {
            kind: 'euro', title: `${euro.competition}-Finale`, opponentId: opponent.id, opponentName: opponent.name,
            opponentStrength: ctx.prog.strength[opponent.id] ?? opponent.strength,
          }];
          euro.stage = 'out';
          euro.reached = 'Finale';
          return;
        }
      }
      const line = playerMatch(ctx, euro.competition, euro.opponentId!, isFinal ? chance(0.5) : legNo === 1, 2.8);
      euro.agg[0] += line.goalsFor;
      euro.agg[1] += line.goalsAgainst;
      if (isFinal || legNo === 1) {
        const won = euro.agg[0] > euro.agg[1] || (euro.agg[0] === euro.agg[1] && chance(0.5));
        if (!won) {
          euro.stage = 'out';
          euro.reached = EURO_KO[round];
        } else if (isFinal) {
          euro.stage = 'out';
          euro.reached = 'Sieger';
          euro.won = true;
        } else euro.stage = round + 1;
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
  Portugal: 0.08, Niederlande: 0.06, Italien: 0.05, Belgien: 0.03, Kroatien: 0.03, Kolumbien: 0.03, Japan: 0.02,
};
const EUROPEAN = ['Deutschland', 'Österreich', 'Schweiz', 'Türkei', 'England', 'Frankreich', 'Spanien', 'Italien',
  'Portugal', 'Niederlande', 'Belgien', 'Kroatien', 'Polen', 'Norwegen', 'Schweden'];

function tournamentName(nation: string, summer: number): string | null {
  if (summer % 4 === 2) return `Weltmeisterschaft ${summer}`;
  if (summer % 4 !== 0) return null;
  if (EUROPEAN.includes(nation)) return `Europameisterschaft ${summer}`;
  if (['Brasilien', 'Argentinien', 'Kolumbien'].includes(nation)) return `Copa América ${summer}`;
  if (nation === 'USA') return `Gold Cup ${summer}`;
  if (nation === 'Japan' || nation === 'Südkorea') return `Asienmeisterschaft ${summer}`;
  return null;
}

/** Neue Saison vorbereiten: Tagesform der Vereine, leere Tabellen, Pokal und Europapokal. */
export function startSeason(career: Career): SeasonProgress {
  const clubId = currentClubId(career.player);
  const strength: Record<string, number> = {};
  for (const c of CLUBS) strength[c.id] = clubStrength(career, c.id) + normal(0, 1.2);
  const rows: Record<string, TableRow[]> = {};
  for (const l of LEAGUES) {
    rows[l.id] = CLUBS.filter((c) => clubLeagueId(career, c.id) === l.id).map((c) => emptyRow(c.id));
  }
  const slot = career.europeSlots[clubId];
  return {
    strength,
    rows,
    matches: [],
    form: 6.8,
    injuredFor: 0,
    injuryWeeks: 0,
    notes: [],
    startClubId: clubId,
    ovrStart: career.player.ovr,
    cup: { alive: true, eligible: true, reached: '', won: false, used: [] },
    euro: slot
      ? { competition: slot, eligible: true, points: 0, stage: 'phase', reached: '', won: false, used: [], opponentId: null, agg: [0, 0] }
      : null,
    winterMove: null,
  };
}

export const STAGES = 6;
export const STAGES_PER_HALF = 3;

/** Wirkung der gewählten Belastung pro Etappe. */
export const LOADS: Record<StageLoad, { selection: number; injury: number; form: number }> = {
  full: { selection: 1, injury: 1.6, form: 0 },
  normal: { selection: 0, injury: 1, form: 0 },
  rest: { selection: -2, injury: 0.4, form: 0 },
  extra: { selection: 0.3, injury: 1.3, form: 0.25 },
};

/** Spieltage einer Etappe in einer Liga (Index-Bereich der Runden). */
export function stageRounds(totalRounds: number, stage: number): [number, number] {
  const mid = Math.floor(totalRounds / 2);
  const half = stage < STAGES_PER_HALF ? 0 : 1;
  const [from, to] = half === 0 ? [0, mid] : [mid, totalRounds];
  const k = stage % STAGES_PER_HALF;
  return [from + Math.floor(((to - from) * k) / STAGES_PER_HALF), from + Math.floor(((to - from) * (k + 1)) / STAGES_PER_HALF)];
}

/** Deterministischer Spielplan einer Liga (gleiche Reihenfolge in jeder Etappe). */
export function leagueRounds(prog: SeasonProgress, leagueId: string): [string, string][][] {
  return roundRobin(prog.rows[leagueId].map((r) => r.clubId).sort());
}

/** Spielt eine Halbserie (1 = Hinrunde, 2 = Rückrunde) komplett. */
export function playHalf(career: Career, prog: SeasonProgress, half: 1 | 2): void {
  const first = half === 1 ? 0 : STAGES_PER_HALF;
  for (let st = Math.max(first, prog.stage ?? first); st < first + STAGES_PER_HALF; st++) playStage(career, prog, st);
}

/**
 * Spielt eine Etappe (ca. 6 Spieltage) in allen Ligen plus fällige Pokal-/Europapokalspiele.
 * Nur die Spiele des aktuellen Vereins des Spielers werden mit seinen Einsätzen simuliert.
 */
export function playStage(career: Career, prog: SeasonProgress, stage: number): void {
  const player = career.player;
  const clubId = currentClubId(player);
  const leagueId = clubLeagueId(career, clubId);
  const half: 1 | 2 = stage < STAGES_PER_HALF ? 1 : 2;
  const ctx: SeasonContext = { career, player, clubId, half, prog, stage };
  // Pro Etappe gibt es gut 8 Wochengehälter aufs Konto.
  payWages(career, 52 / STAGES);
  // Sperren und Verletzungen aus Entscheidungen greifen zum Start einer Halbserie.
  if (stage % STAGES_PER_HALF === 0) {
    if (player.carryBanMatches) {
      prog.injuredFor += player.carryBanMatches;
      player.carryBanMatches = 0;
    }
    if (player.carryInjuryWeeks) {
      prog.injuredFor += Math.round(player.carryInjuryWeeks * 1.3);
      prog.injuryWeeks += player.carryInjuryWeeks;
      player.carryInjuryWeeks = 0;
    }
  }
  prog.form = Math.min(8, prog.form + LOADS[prog.load ?? 'normal'].form);
  const inHalf = (at: number) => (half === 1 ? at < 0.5 : at >= 0.5);

  for (const l of LEAGUES) {
    const rowList = prog.rows[l.id];
    const rows = new Map(rowList.map((r) => [r.clubId, r]));
    const rounds = leagueRounds(prog, l.id);
    const R = rounds.length;
    const [from, to] = stageRounds(R, stage);
    const [halfFrom, halfTo] = [stageRounds(R, half === 1 ? 0 : 3)[0], stageRounds(R, half === 1 ? 2 : 5)[1]];

    const extras: Scheduled[] = [];
    if (l.id === leagueId) {
      extras.push(...scheduleCup(ctx, l.goalsPerGame));
      if (prog.euro) extras.push(...scheduleEurope(ctx, prog.euro));
    }
    // Ein Zusatzspiel findet vor der Runde statt, deren Zeitpunkt es erreicht – und gehört zu deren Etappe.
    const roundOf = (at: number) => Math.min(halfTo, Math.max(halfFrom, Math.ceil(at * R)));
    const due = extras
      .filter((e) => inHalf(e.at))
      .filter((e) => {
        const r = roundOf(e.at);
        return r === halfTo ? to === halfTo : r >= from && r < to;
      })
      .sort((a, b) => a.at - b.at);

    let next = 0;
    for (let r = from; r < to; r++) {
      while (next < due.length && due[next].at <= r / R) due[next++].play();
      for (const [h, a] of rounds[r]) {
        let gh: number;
        let ga: number;
        if (h === clubId || a === clubId) {
          const home = h === clubId;
          const line = playerMatch(ctx, 'Liga', home ? a : h, home, l.goalsPerGame);
          [gh, ga] = home ? [line.goalsFor, line.goalsAgainst] : [line.goalsAgainst, line.goalsFor];
        } else [gh, ga] = playMatch(prog.strength[h], prog.strength[a], l.goalsPerGame);
        addResult(rows.get(h)!, gh, ga);
        addResult(rows.get(a)!, ga, gh);
      }
    }
    while (next < due.length) due[next++].play();
  }

  // Etappen-Bilanz für die Anzeige
  const own = sortTable(prog.rows[leagueId]);
  const mine = prog.matches.filter((m) => m.stage === stage);
  const st = halfStats(mine);
  prog.stageLog = [...(prog.stageLog ?? []), {
    stage, leagueId, apps: st.apps, goals: st.goals, assists: st.assists, avgRating: st.avgRating,
    position: own.findIndex((r) => r.clubId === clubId) + 1, points: own.find((r) => r.clubId === clubId)?.points ?? 0,
  }];
  prog.stage = stage + 1;
}

/** Nächste Ligaspiele des Vereins in der kommenden Etappe. */
export function upcomingFixtures(career: Career, prog: SeasonProgress, stage: number): { opponentId: string; home: boolean }[] {
  const clubId = currentClubId(career.player);
  const leagueId = clubLeagueId(career, clubId);
  const rounds = leagueRounds(prog, leagueId);
  const [from, to] = stageRounds(rounds.length, stage);
  const out: { opponentId: string; home: boolean }[] = [];
  for (let r = from; r < to; r++) {
    const m = rounds[r].find(([h, a]) => h === clubId || a === clubId);
    if (m) out.push({ opponentId: m[0] === clubId ? m[1] : m[0], home: m[0] === clubId });
  }
  return out;
}

export interface HalfStats {
  apps: number;
  starts: number;
  minutes: number;
  possibleMinutes: number;
  goals: number;
  assists: number;
  avgRating: number | null;
}

export function halfStats(matches: MatchLine[]): HalfStats {
  const played = matches.filter((m) => m.minutes > 0);
  const ratings = played.map((m) => m.rating!);
  return {
    apps: played.length,
    starts: matches.filter((m) => m.status === 'start').length,
    minutes: played.reduce((a, m) => a + m.minutes, 0),
    possibleMinutes: matches.length * 90,
    goals: played.reduce((a, m) => a + m.goals, 0),
    assists: played.reduce((a, m) => a + m.assists, 0),
    avgRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100 : null,
  };
}

export interface SeasonOutcome {
  record: SeasonRecord;
  tables: Record<string, TableRow[]>;
}

// Grobe Stärke der Nationalteams für Turnierfinals.
const NATION_STRENGTH: Record<string, number> = {
  Spanien: 86, Frankreich: 86, England: 85, Argentinien: 85, Brasilien: 85, Deutschland: 84, Portugal: 84,
  Niederlande: 83, Italien: 82, Belgien: 81, Kroatien: 81, Kolumbien: 80, Norwegen: 79, Türkei: 79,
  Schweiz: 79, Japan: 79, Österreich: 78, Schweden: 78, Südkorea: 77, Polen: 77, USA: 77,
};
export const nationStrength = (nation: string) => NATION_STRENGTH[nation] ?? 76;

/**
 * Länderspiele der Saison. Erreicht die Nation bei einem Turnier das Finale,
 * wird es als Live-Finale vorgemerkt statt ausgewürfelt.
 */
export function computeNational(career: Career, prog: SeasonProgress): NationalSeason {
  const player = career.player;
  const nation = getNation(player.nation);
  let callUp = nation.callUp;
  const notes: string[] = [];
  const rival = career.rival;
  // Ein stärkerer Rivale gleicher Nation und Position blockiert den Platz in der Nationalelf.
  if (rival && !rival.retired && rival.nation === player.nation && rival.position === player.position && rival.ovr > player.ovr) {
    callUp += 2;
    if (player.ovr >= nation.callUp - 1) notes.push(`${rival.name} ist in der Nationalelf auf deiner Position gesetzt.`);
  }
  let caps = 0;
  let goals = 0;
  let tournament: NationalSeason['tournament'] = null;
  if (player.ovr >= callUp - 3 && prog.injuryWeeks < 20) {
    const p = sigmoid((player.ovr - callUp + 1) / 1.5);
    for (let i = 0; i < 5; i++) if (chance(p)) caps += randInt(1, 2);
    const name = tournamentName(player.nation, career.year + 1);
    if (name && player.ovr >= callUp && caps > 0) {
      caps += randInt(3, 6);
      const odds = (TITLE_ODDS[player.nation] ?? 0.01) + (player.ovr >= 88 ? 0.02 : 0);
      const reachedFinal = chance(Math.min(0.6, odds * 2.2 + 0.02));
      tournament = { name, reachedFinal, won: false };
      if (reachedFinal) {
        const rivals = Object.keys(NATION_STRENGTH).filter((n) => n !== player.nation);
        const opponent = weightedPick(rivals, (n) => NATION_STRENGTH[n] - 74);
        prog.pendingFinals = [
          ...(prog.pendingFinals ?? []),
          { kind: 'national', title: `Finale der ${name}`, opponentName: opponent, opponentStrength: NATION_STRENGTH[opponent] },
        ];
      } else notes.push(`Mit ${player.nation} bei der ${name} dabei.`);
    }
    const rate = GOAL_SHARE[player.position] * 1.2 * Math.exp((player.ovr - callUp) * 0.05);
    for (let i = 0; i < caps; i++) goals += poisson(rate);
  }
  return { caps, goals, tournament, notes };
}

/** Saison abschließen: Tabellen, Titel, Auszeichnungen und Nationalmannschaft. */
export function finishSeason(career: Career, prog: SeasonProgress): SeasonOutcome {
  const player = career.player;
  const clubId = currentClubId(player);
  const leagueId = clubLeagueId(career, clubId);
  const league = getLeague(leagueId);
  const matches = prog.matches;
  const notes = [...prog.notes];

  const tables: Record<string, TableRow[]> = {};
  for (const l of LEAGUES) tables[l.id] = sortTable(prog.rows[l.id]);

  const table = tables[leagueId];
  const position = table.findIndex((r) => r.clubId === clubId) + 1;
  const stats = halfStats(matches);
  const played = matches.filter((m) => m.minutes > 0);
  const playedForEndClub = played.some((m) => m.clubId === clubId);

  const allTrophies: string[] = [];
  if (playedForEndClub && position === 1) {
    allTrophies.push(league.tier === 1 ? `Meister (${league.name})` : `Meister (${league.name}, Aufstieg)`);
  }
  // Titel zählen nur, wenn der Spieler im Wettbewerb auch eingesetzt wurde.
  const playedIn = (c: Competition) => played.some((m) => m.competition === c);
  if (prog.cup.won && playedIn('Pokal')) allTrophies.push(getLeague(clubLeagueId(career, prog.startClubId)).cup);
  if (prog.euro?.won && playedIn(prog.euro.competition)) allTrophies.push(prog.euro.competition);

  const awards: string[] = [];
  const leagueStats = summarize(matches, 'Liga');
  const topScorerMark = Math.max(12, Math.round(league.topScorerGoals * normal(1, 0.12)));
  if (leagueStats.goals >= topScorerMark) awards.push(`Torschützenkönig ${league.name}`);
  if (leagueStats.avgRating !== null && leagueStats.avgRating >= 7.5 && leagueStats.apps >= 20 && position <= 4) {
    awards.push(`Spieler der Saison ${league.name}`);
  }
  const avgRating = stats.avgRating;
  if (player.age <= 20 && player.ovr >= 80 && avgRating !== null && avgRating >= 7.2 && played.length >= 25 && chance(0.6)) {
    awards.push('Golden Boy');
  }
  const bigTitle = allTrophies.some((t) => t.startsWith('Meister')) || allTrophies.includes('Champions League');
  if (player.ovr >= 88 && avgRating !== null && avgRating >= 7.5 && bigTitle && chance(allTrophies.includes('Champions League') ? 0.6 : 0.3)) {
    awards.push('Ballon d’Or');
  }

  // Nationalmannschaft (inkl. eventuell live gespieltem Turnierfinale)
  const national = prog.national ?? computeNational(career, prog);
  const caps = national.caps;
  const intGoals = national.goals;
  notes.push(...national.notes);
  if (national.tournament?.won) allTrophies.push(national.tournament.name);

  const record: SeasonRecord = {
    season: seasonLabel(career.year),
    age: player.age,
    clubId,
    onLoan: player.loan !== null,
    leagueId,
    ovrStart: prog.ovrStart,
    ovrEnd: player.ovr,
    apps: stats.apps,
    starts: stats.starts,
    minutes: stats.minutes,
    possibleMinutes: stats.possibleMinutes,
    goals: stats.goals,
    assists: stats.assists,
    cleanSheets: ['TW', 'IV', 'AV'].includes(player.position)
      ? played.filter((m) => m.goalsAgainst === 0 && m.minutes >= 60).length
      : 0,
    avgRating,
    injuryWeeks: prog.injuryWeeks,
    leaguePosition: position,
    marketValue: playerValue(player),
    trophies: allTrophies,
    awards,
    caps,
    internationalGoals: intGoals,
    byCompetition: (['Liga', 'Pokal', 'Champions League', 'Europa League', 'Conference League'] as Competition[])
      .map((c) => summarize(matches, c))
      .filter((s, i) => i < 2 || matches.some((m) => m.competition === s.competition)),
    table,
    europe: prog.euro ? { competition: prog.euro.competition, reached: prog.euro.reached || 'nach Wechsel nicht dabei' } : null,
    cupReached: prog.cup.reached || (prog.cup.eligible ? 'Sieger' : 'nach Wechsel nicht dabei'),
    notes,
    winterMove: prog.winterMove,
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
      const up = lower
        .filter((r) => canPlayIn(r.clubId, l.id, career.clubLeague))
        .slice(0, l.down.spots)
        .map((r) => r.clubId);
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
