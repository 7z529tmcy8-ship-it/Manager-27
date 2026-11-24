import { clubLeagueId, currentClubId } from './player';
import { sortTable } from './season';
import { evaluateGoals } from './goals';
import type { Career, Competition, GoalResult, MatchLine } from './types';

// Live-Simulation: die gerade gespielten Spiele noch einmal Spieltag für Spieltag zeigen.
// Rein zur Anzeige – das Ergebnis steht schon fest und ist bereits gespeichert.

export interface ReplayStep {
  match: MatchLine;
  /** Punkte in der Liga nach diesem Spiel (nur Liga zählt). */
  points: number;
  w: number; d: number; l: number;
  apps: number; goals: number; assists: number;
  avg: number | null;
  /** Besonderer Moment, der hervorgehoben wird. */
  big: 'hattrick' | 'brace' | 'goal' | 'motm' | 'win' | null;
}
export interface Replay {
  title: string;
  clubId: string;
  steps: ReplayStep[];
  /** Tabellenplatz am Ende (Liga) und Zahl der Teams. */
  position: number | null;
  teams: number;
  /** Punkte vor der Halbserie (Rückrunde startet nicht bei 0). */
  startPoints: number;
  /** Gesamtwertung vorher/nachher. */
  ovrFrom?: number;
  ovrTo?: number;
  /** Saisonziele des Trainers mit aktuellem Stand. */
  goals?: GoalResult[];
}

const COMP_SHORT: Record<Competition, string> = { Liga: 'Liga', Pokal: 'Pokal', 'Champions League': 'Königsklasse', 'Europa League': 'Europa League', 'Conference League': 'Conference League' };
export const compShort = (c: Competition) => COMP_SHORT[c] ?? c;

function bigOf(m: MatchLine): ReplayStep['big'] {
  if (m.goals >= 3) return 'hattrick';
  if (m.goals === 2) return 'brace';
  if (m.goals === 1) return 'goal';
  if ((m.rating ?? 0) >= 8) return 'motm';
  if (m.goalsFor > m.goalsAgainst && m.competition !== 'Liga') return 'win';
  return null;
}

function steps(matches: MatchLine[], startPoints: number, startRec = { w: 0, d: 0, l: 0 }): ReplayStep[] {
  let points = startPoints; let { w, d, l } = startRec;
  let apps = 0, goals = 0, assists = 0, rSum = 0, rN = 0;
  return matches.map((m) => {
    if (m.competition === 'Liga') {
      if (m.goalsFor > m.goalsAgainst) { points += 3; w++; } else if (m.goalsFor === m.goalsAgainst) { points += 1; d++; } else l++;
    }
    if (m.status === 'start' || m.status === 'sub') { apps++; goals += m.goals; assists += m.assists; }
    if (m.rating != null) { rSum += m.rating; rN++; }
    return { match: m, points, w, d, l, apps, goals, assists, avg: rN ? rSum / rN : null, big: m.status === 'start' || m.status === 'sub' ? bigOf(m) : null };
  });
}

const leaguePts = (ms: MatchLine[]) => ms.filter((m) => m.competition === 'Liga').reduce((a, m) => a + (m.goalsFor > m.goalsAgainst ? 3 : m.goalsFor === m.goalsAgainst ? 1 : 0), 0);
const leagueRec = (ms: MatchLine[]) => ms.filter((m) => m.competition === 'Liga').reduce((a, m) => (m.goalsFor > m.goalsAgainst ? { ...a, w: a.w + 1 } : m.goalsFor === m.goalsAgainst ? { ...a, d: a.d + 1 } : { ...a, l: a.l + 1 }), { w: 0, d: 0, l: 0 });

/** Was ist zwischen prev und next gespielt worden? null = nichts zu zeigen. */
export function replayOf(prev: Career, next: Career): Replay | null {
  const r = replayCore(prev, next);
  if (!r) return null;
  const done = next.history.length > prev.history.length;
  const goals = done ? next.history[next.history.length - 1].goalResults : next.progress ? evaluateGoals(next.seasonGoals ?? [], next.progress.matches) : undefined;
  return { ...r, ovrFrom: prev.player.ovr, ovrTo: next.player.ovr, goals: goals?.length ? goals : undefined };
}

function replayCore(prev: Career, next: Career): Replay | null {
  if (prev.phase !== 'season' && prev.phase !== 'winter') return null;
  if (next.phase === 'winter' && prev.phase === 'winter') return null;
  const seasonDone = next.history.length > prev.history.length && next.simReplay;
  const prog = next.progress;
  if (next.phase === 'winter' && prog) {
    const ms = prog.matches.filter((m) => m.half === 1);
    if (!ms.length) return null;
    const clubId = currentClubId(next.player);
    const rows = sortTable(prog.rows[clubLeagueId(next, ms[ms.length - 1].clubId)] ?? []);
    const pos = rows.findIndex((r) => r.clubId === ms[ms.length - 1].clubId);
    return { title: 'Hinrunde', clubId, steps: steps(ms, 0), position: pos >= 0 ? pos + 1 : null, teams: rows.length, startPoints: 0 };
  }
  if (seasonDone) {
    const r = next.simReplay!;
    const first = prev.progress?.matches.filter((m) => m.half === 1) ?? [];
    if (!r.matches.length) return null;
    const rows = sortTable(r.table ?? []);
    const pos = rows.findIndex((x) => x.clubId === r.clubId);
    const start = leaguePts(first);
    return { title: 'Rückrunde', clubId: r.clubId, steps: steps(r.matches, start, leagueRec(first)), position: pos >= 0 ? pos + 1 : null, teams: rows.length, startPoints: start };
  }
  if (next.phase === 'final' && prog) {
    const ms = prog.matches.filter((m) => m.half === 2);
    if (!ms.length) return null;
    const first = prog.matches.filter((m) => m.half === 1);
    const clubId = currentClubId(next.player);
    const rows = sortTable(prog.rows[clubLeagueId(next, ms[ms.length - 1].clubId)] ?? []);
    const pos = rows.findIndex((x) => x.clubId === ms[ms.length - 1].clubId);
    return { title: 'Rückrunde', clubId, steps: steps(ms, leaguePts(first), leagueRec(first)), position: pos >= 0 ? pos + 1 : null, teams: rows.length, startPoints: leaguePts(first) };
  }
  return null;
}

/** Spieltag-Modus: nur die Spiele der gerade gespielten Etappe zeigen. */
export function stageReplayOf(prev: Career, next: Career): Replay | null {
  if (prev.phase !== 'season') return null;
  const stage = prev.progress?.stage ?? 0;
  const before = prev.progress?.matches ?? [];
  const seasonDone = next.history.length > prev.history.length;
  const src = seasonDone ? next.simReplay : next.progress ? { matches: next.progress.matches, table: null, clubId: currentClubId(next.player) } : null;
  if (!src) return null;
  const ms = src.matches.filter((m) => m.stage === stage && (seasonDone || !before.includes(m)));
  if (!ms.length) return null;
  const clubId = ms[ms.length - 1].clubId;
  const rows = sortTable(src.table ?? next.progress?.rows[clubLeagueId(next, clubId)] ?? []);
  const pos = rows.findIndex((r) => r.clubId === clubId);
  const done = seasonDone ? next.history[next.history.length - 1].goalResults : next.progress ? evaluateGoals(next.seasonGoals ?? [], next.progress.matches) : undefined;
  return {
    title: `Etappe ${stage + 1} von 6`, clubId, steps: steps(ms, leaguePts(before), leagueRec(before)),
    position: pos >= 0 ? pos + 1 : null, teams: rows.length, startPoints: leaguePts(before),
    ovrFrom: prev.player.ovr, ovrTo: next.player.ovr, goals: done?.length ? done : undefined,
  };
}
