// ---------- Statistik pro Spiel, Entwicklung in Zahlen, Rekordbuch ----------
// Jedes Spiel wird am Saisonende kompakt im Saisonrekord gespeichert (Zahlenreihe statt Objekt, spart Speicher).

import { REAL_PLAYERS } from '../data/players';
import { getClub } from '../data/leagues';
import { attributeLabels } from './player';
import type { Career, Competition, MatchLine, Position, SeasonRecord } from './types';

const COMPS: Competition[] = ['Liga', 'Pokal', 'Champions League', 'Europa League', 'Conference League'];
const STATUS = ['start', 'sub', 'bench', 'injured'] as const;
/** [Wettbewerb, Gegner, Heim 1/0, Tore Team, Gegentore, Status, Minuten, Tore, Vorlagen, Note×10 (0 = keine)] */
export type GameRow = [number, string, 0 | 1, number, number, number, number, number, number, number];

export function packGames(matches: MatchLine[]): GameRow[] {
  return matches.map((m) => [
    Math.max(0, COMPS.indexOf(m.competition)), m.opponent, m.home ? 1 : 0, m.goalsFor, m.goalsAgainst,
    Math.max(0, STATUS.indexOf(m.status)), m.minutes, m.goals, m.assists, m.rating ? Math.round(m.rating * 10) : 0,
  ]);
}

export interface Game { comp: Competition; opp: string; home: boolean; gf: number; ga: number; status: typeof STATUS[number]; min: number; goals: number; assists: number; rating: number | null }
export const unpack = (r: GameRow): Game => ({
  comp: COMPS[r[0]] ?? 'Liga', opp: r[1], home: r[2] === 1, gf: r[3], ga: r[4], status: STATUS[r[5]] ?? 'bench',
  min: r[6], goals: r[7], assists: r[8], rating: r[9] ? r[9] / 10 : null,
});
const fromLine = (m: MatchLine): Game => ({ comp: m.competition, opp: m.opponent, home: m.home, gf: m.goalsFor, ga: m.goalsAgainst, status: m.status, min: m.minutes, goals: m.goals, assists: m.assists, rating: m.rating });

/** Spiele einer Saison (abgeschlossen) oder der laufenden Saison. */
export function gamesOf(career: Career, season: string | 'live'): Game[] {
  if (season === 'live') return (career.progress?.matches ?? []).map(fromLine);
  const r = career.history.find((x) => x.season === season);
  return (r?.games ?? []).map(unpack);
}
/** Saisons mit gespeicherten Einzelspielen (neueste zuerst), plus laufende Saison. */
export function gameSeasons(career: Career): { id: string | 'live'; label: string }[] {
  const out: { id: string | 'live'; label: string }[] = [];
  if ((career.progress?.matches.length ?? 0) > 0) out.push({ id: 'live', label: 'Laufend' });
  for (const r of [...career.history].reverse()) if (r.games?.length) out.push({ id: r.season, label: r.season });
  return out;
}

/** Schulnote 1,0–6,0 aus der Spielnote (umgerechnet, in halben Schritten). */
export function schoolGrade(rating: number): number {
  const g = 1 + (8.5 - rating) * 1.25;
  return Math.min(6, Math.max(1, Math.round(g * 2) / 2));
}
export const fmtGrade = (g: number) => g.toFixed(1).replace('.', ',');

export interface GameStats {
  games: number; played: number; starts: number; minutes: number; goals: number; assists: number; avg: number | null;
  minPerGoal: number | null; share: number | null; teamGoals: number;
  home: { apps: number; goals: number; assists: number; avg: number | null }; away: { apps: number; goals: number; assists: number; avg: number | null };
  buckets: { label: string; n: number }[];
  scoringStreak: number; unbeaten: number; braces: number; hattricks: number;
  best: Game | null; mostGoals: Game | null;
  wins: number; draws: number; losses: number;
}
const avgOf = (gs: Game[]) => { const r = gs.filter((g) => g.rating !== null); return r.length ? r.reduce((a, g) => a + g.rating!, 0) / r.length : null; };

export function gameStats(games: Game[]): GameStats {
  const played = games.filter((g) => g.min > 0);
  const goals = played.reduce((a, g) => a + g.goals, 0);
  const assists = played.reduce((a, g) => a + g.assists, 0);
  const minutes = played.reduce((a, g) => a + g.min, 0);
  const teamGoals = played.reduce((a, g) => a + g.gf, 0);
  const side = (home: boolean) => { const gs = played.filter((g) => g.home === home); return { apps: gs.length, goals: gs.reduce((a, g) => a + g.goals, 0), assists: gs.reduce((a, g) => a + g.assists, 0), avg: avgOf(gs) }; };
  const edges: [string, number, number][] = [['1–1,5', 1, 1.5], ['2–2,5', 2, 2.5], ['3–3,5', 3, 3.5], ['4–4,5', 4, 4.5], ['5–6', 5, 6]];
  const grades = played.filter((g) => g.rating !== null).map((g) => schoolGrade(g.rating!));
  const buckets = edges.map(([label, lo, hi]) => ({ label, n: grades.filter((x) => x >= lo && x <= hi).length }));
  let s = 0, scoringStreak = 0;
  for (const g of played) { s = g.goals > 0 ? s + 1 : 0; scoringStreak = Math.max(scoringStreak, s); }
  let u = 0, unbeaten = 0;
  for (const g of games) { u = g.gf >= g.ga ? u + 1 : 0; unbeaten = Math.max(unbeaten, u); }
  const rated = played.filter((g) => g.rating !== null);
  return {
    games: games.length, played: played.length, starts: played.filter((g) => g.status === 'start').length, minutes, goals, assists, avg: avgOf(played),
    minPerGoal: goals ? Math.round(minutes / goals) : null, share: teamGoals ? (goals + assists) / teamGoals : null, teamGoals,
    home: side(true), away: side(false), buckets, scoringStreak, unbeaten,
    braces: played.filter((g) => g.goals === 2).length, hattricks: played.filter((g) => g.goals >= 3).length,
    best: rated.length ? [...rated].sort((a, b) => b.rating! - a.rating!)[0] : null,
    mostGoals: played.some((g) => g.goals > 0) ? [...played].sort((a, b) => b.goals - a.goals || (b.rating ?? 0) - (a.rating ?? 0))[0] : null,
    wins: games.filter((g) => g.gf > g.ga).length, draws: games.filter((g) => g.gf === g.ga).length, losses: games.filter((g) => g.gf < g.ga).length,
  };
}

/** Vereinsname zu einer gespeicherten Gegner-ID (alte Spielstände: Text bleibt, wie er ist). */
export function oppName(id: string): string {
  try { return getClub(id).name; } catch { return id; }
}

// ---------- Entwicklung ----------
export interface DevRow { season: string; age: number; clubId: string; ovrStart: number; ovrEnd: number; pot: number | null; value: number; reasons: string[]; attrs: number[] | null }
export function devRows(career: Career): DevRow[] {
  return career.history.map((r) => ({ season: r.season, age: r.age, clubId: r.clubId, ovrStart: r.ovrStart, ovrEnd: r.ovrEnd, pot: r.potEnd ?? null, value: r.marketValue, reasons: r.devReasons ?? [], attrs: r.attrs ?? null }));
}
export const attrNames = (pos: Position) => attributeLabels(pos);

/** Vergleich mit echten Spielern gleichen Alters und gleicher Position (Wertung grob nach Alter fortgeschrieben). */
export function peerCompare(career: Career): { count: number; avg: number; rank: number; best: { name: string; ovr: number }[] } | null {
  const p = career.player;
  const years = Math.max(0, career.year - 2025);
  const peers = REAL_PLAYERS.map((r) => {
    let o = r.ovr;
    for (let y = 0; y < years; y++) { const a = r.age + y; o += a < 23 ? 2 : a > 31 ? -1.5 : 0; }
    return { name: r.name, pos: r.position, age: r.age + years, ovr: Math.min(Math.max(r.ovr, r.potential), Math.round(o)) };
  }).filter((r) => r.pos === p.position && Math.abs(r.age - p.age) <= 1 && r.name !== p.name);
  if (peers.length < 3) return null;
  const avg = peers.reduce((a, r) => a + r.ovr, 0) / peers.length;
  const rank = 1 + peers.filter((r) => r.ovr > p.ovr).length;
  return { count: peers.length, avg, rank, best: [...peers].sort((a, b) => b.ovr - a.ovr).slice(0, 3).map((r) => ({ name: r.name, ovr: r.ovr })) };
}

// ---------- Rekordbuch ----------
export interface Rec { label: string; value: string; detail: string }
/** Rekorde der eigenen Karriere (Saison- und Spielrekorde). */
export function careerBook(career: Career): Rec[] {
  const h = career.history;
  if (!h.length) return [];
  const out: Rec[] = [];
  const top = <T,>(xs: T[], v: (x: T) => number) => xs.reduce<T | null>((b, x) => (b === null || v(x) > v(b) ? x : b), null);
  const club = (r: SeasonRecord) => `${r.season}`;
  const g = top(h, (r) => r.goals); if (g && g.goals > 0) out.push({ label: 'Meiste Tore in einer Saison', value: `${g.goals}`, detail: club(g) });
  const a = top(h, (r) => r.assists); if (a && a.assists > 0) out.push({ label: 'Meiste Vorlagen in einer Saison', value: `${a.assists}`, detail: club(a) });
  const sc = top(h, (r) => r.goals + r.assists); if (sc && sc.goals + sc.assists > 0) out.push({ label: 'Meiste Scorerpunkte in einer Saison', value: `${sc.goals + sc.assists}`, detail: club(sc) });
  const rated = h.filter((r) => r.avgRating && r.apps >= 15);
  const rt = top(rated, (r) => r.avgRating!); if (rt) out.push({ label: 'Beste Ø-Note (ab 15 Spielen)', value: rt.avgRating!.toFixed(2).replace('.', ','), detail: club(rt) });
  const ap = top(h, (r) => r.apps); if (ap) out.push({ label: 'Meiste Einsätze in einer Saison', value: `${ap.apps}`, detail: club(ap) });
  const ov = top(h, (r) => r.ovrEnd); if (ov) out.push({ label: 'Höchste Wertung', value: `${ov.ovrEnd}`, detail: `mit ${ov.age} Jahren` });
  const jump = top(h, (r) => r.ovrEnd - r.ovrStart); if (jump && jump.ovrEnd > jump.ovrStart) out.push({ label: 'Größter Sprung in einer Saison', value: `+${jump.ovrEnd - jump.ovrStart}`, detail: club(jump) });
  const mv = top(h, (r) => r.marketValue); if (mv) out.push({ label: 'Höchster Marktwert', value: mv.marketValue >= 1e6 ? `${Math.round(mv.marketValue / 1e6)} Mio. €` : `${Math.round(mv.marketValue / 1e3)} Tsd. €`, detail: club(mv) });
  const ti = top(h, (r) => r.trophies.length); if (ti && ti.trophies.length > 0) out.push({ label: 'Meiste Titel in einer Saison', value: `${ti.trophies.length}`, detail: club(ti) });
  // Spielrekorde (nur Saisons mit gespeicherten Einzelspielen)
  let bestGame: { g: Game; s: string } | null = null; let goalsGame: { g: Game; s: string } | null = null; let streak = { n: 0, s: '' }; let unbeaten = { n: 0, s: '' };
  for (const r of h) {
    if (!r.games?.length) continue;
    const games = r.games.map(unpack);
    const st = gameStats(games);
    if (st.best && (!bestGame || st.best.rating! > bestGame.g.rating!)) bestGame = { g: st.best, s: r.season };
    if (st.mostGoals && (!goalsGame || st.mostGoals.goals > goalsGame.g.goals)) goalsGame = { g: st.mostGoals, s: r.season };
    if (st.scoringStreak > streak.n) streak = { n: st.scoringStreak, s: r.season };
    if (st.unbeaten > unbeaten.n) unbeaten = { n: st.unbeaten, s: r.season };
  }
  if (goalsGame && goalsGame.g.goals > 0) out.push({ label: 'Meiste Tore in einem Spiel', value: `${goalsGame.g.goals}`, detail: `${goalsGame.s} · ${goalsGame.g.gf}:${goalsGame.g.ga} gegen ${oppName(goalsGame.g.opp)}` });
  if (bestGame) out.push({ label: 'Beste Spielnote', value: bestGame.g.rating!.toFixed(1).replace('.', ','), detail: `${bestGame.s} · gegen ${oppName(bestGame.g.opp)}` });
  if (streak.n > 1) out.push({ label: 'Längste Tor-Serie', value: `${streak.n} Spiele`, detail: streak.s });
  if (unbeaten.n > 1) out.push({ label: 'Längste Serie ohne Niederlage', value: `${unbeaten.n} Spiele`, detail: unbeaten.s });
  return out;
}
