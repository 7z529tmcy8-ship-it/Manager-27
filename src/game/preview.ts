// ---------- Saison-Sonderheft und Saison-Rückblick ----------
// Vor der Saison: Liga-Vorschau, Kader des eigenen Vereins, Stars der Liga, Prognose für den Spieler.
// Nach der Saison: Prognose gegen Wirklichkeit, Ranglisten (Torjäger, Scorer, Noten) und Elf der Saison.
//
// Alles wird fest aus Verein, Saison und Spieler berechnet (gleicher Wert bei jedem Öffnen).
// Echte Spieler kommen aus der Spieler-Datenbank (Wertung grob nach Alter fortgeschrieben);
// wo ein Kader dort nicht komplett ist, wird mit erfundenen Spielern aufgefüllt – wie überall im Spiel.

import { CLUBS, getClub } from '../data/leagues';
import { REAL_PLAYERS } from '../data/players';
import { clubLeagueId, clubStrength, currentClubId, marketValue, seasonLabel } from './player';
import { FIRST, LAST } from './rival';
import { scorerRace } from './scorers';
import { clamp } from './random';
import type { Career, Position, SeasonRecord, TableRow } from './types';

// ---------- fester Zufall ----------
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** Kleiner Zufallsgenerator mit festem Startwert (mulberry32). */
function rng(seed: string): () => number {
  let a = hashStr(seed);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r: () => number) => { let s = 0; for (let i = 0; i < 6; i++) s += r(); return (s - 3) / 0.7071; };

// ---------- Kader ----------
export interface SquadEntry { name: string; pos: Position; age: number; nation: string; ovr: number; pot: number; value: number; real: boolean; you?: boolean }
const SHAPE: [Position, number][] = [['TW', 3], ['IV', 4], ['AV', 4], ['ZDM', 2], ['ZM', 3], ['ZOM', 2], ['FL', 3], ['ST', 3]];
const POS_ORDER: Position[] = ['TW', 'IV', 'AV', 'ZDM', 'ZM', 'ZOM', 'FL', 'ST'];
const NATION_BY_LEAGUE: Record<string, string> = { bl1: 'Deutschland', bl2: 'Deutschland', l3: 'Deutschland', rln: 'Deutschland', pl: 'England', ch: 'England', ll: 'Spanien', sa: 'Italien', l1: 'Frankreich', lp: 'Portugal', ere: 'Niederlande', mls: 'USA', spl: 'Saudi-Arabien' };
const OTHER_NATIONS = ['Brasilien', 'Frankreich', 'Spanien', 'Niederlande', 'Österreich', 'Schweiz', 'Dänemark', 'Polen', 'Kroatien', 'Türkei', 'Japan', 'Belgien', 'Portugal', 'Argentinien'];

/** Echte Spieler eines Vereins im Jahr `year` (Wertung grob nach Alter fortgeschrieben, Rentner fallen raus). */
export function realPlayersOf(clubId: string, year: number): SquadEntry[] {
  const years = Math.max(0, year - 2025);
  return REAL_PLAYERS.filter((p) => p.clubId === clubId).map((p) => {
    let o = p.ovr;
    for (let y = 0; y < years; y++) { const a = p.age + y; o += a < 23 ? 2 : a > 31 ? -1.5 : 0; }
    const age = p.age + years;
    const ovr = Math.min(Math.max(p.ovr, p.potential), Math.round(o));
    return { name: p.name, pos: p.position, age, nation: p.nation, ovr, pot: Math.max(ovr, p.potential), value: marketValue(ovr, age, Math.max(ovr, p.potential)), real: true };
  }).filter((p) => p.age <= 36);
}

/** Kompletter Kader eines Vereins (echte Spieler + feste Auffüllung). */
export function squadOf(clubId: string, year: number, strength = getClub(clubId).strength): SquadEntry[] {
  const r = rng(`squad-${clubId}-${year}`);
  const squad = realPlayersOf(clubId, year);
  const lg = getClub(clubId).leagueId;
  for (const [pos, n] of SHAPE) {
    const have = squad.filter((p) => p.pos === pos).length;
    for (let i = have; i < n; i++) {
      const age = clamp(Math.round(25 + gauss(r) * 4), 18, 34);
      const ovr = clamp(Math.round(strength - (i < Math.ceil(n / 2) ? 1 : 5) + gauss(r) * 2.5), 45, 90);
      const pot = age <= 23 ? clamp(ovr + 2 + Math.floor(r() * 10), ovr, 92) : ovr;
      const nation = r() < 0.55 ? (NATION_BY_LEAGUE[lg] ?? 'Deutschland') : OTHER_NATIONS[Math.floor(r() * OTHER_NATIONS.length)];
      squad.push({ name: `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`, pos, age, nation, ovr, pot, value: marketValue(ovr, age, pot), real: false });
    }
  }
  return squad.sort((a, b) => POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) || b.ovr - a.ovr);
}

// ---------- Prognose ----------
export interface Prognosis { season: string; clubId: string; leagueId: string; apps: number; goals: number; assists: number; rating: number; clubRank: number }
// Raten pro Einsatz – gemessen an 168 simulierten Saisons der Spiel-Logik (Stand 28.11.2026).
const GOAL_RATE: Record<Position, number> = { ST: 0.25, FL: 0.165, ZOM: 0.125, ZM: 0.072, ZDM: 0.06, AV: 0.033, IV: 0.047, TW: 0 };
const ASSIST_RATE: Record<Position, number> = { ST: 0.18, FL: 0.26, ZOM: 0.24, ZM: 0.195, ZDM: 0.065, AV: 0.105, IV: 0.034, TW: 0.01 };
const RATING_BASE: Record<Position, number> = { ST: 6.8, FL: 6.78, ZOM: 6.72, ZM: 6.7, ZDM: 6.64, AV: 6.65, IV: 6.45, TW: 6.6 };
const leagueGames = (n: number) => Math.max(10, (n - 1) * 2);

/** Erwartete Saison des Spielers (vor dem ersten Spiel). Bezieht die Vorsaison mit ein, wenn es eine gibt. */
export function makePrognosis(career: Career): Prognosis {
  const p = career.player;
  const clubId = currentClubId(p);
  const leagueId = clubLeagueId(career, clubId);
  const clubs = leagueClubs(career, leagueId);
  const str = clubStrength(career, clubId);
  const games = leagueGames(clubs.length) + 8; // Liga + Pokal/Europapokal
  const share = 1 / (1 + Math.exp(-(p.ovr - str + 1) / 3));
  let apps = Math.round(games * clamp(0.35 + share * 0.7, 0.15, 0.97));
  let gpa = GOAL_RATE[p.position] * Math.exp(0.04 * (p.ovr - str));
  let apa = ASSIST_RATE[p.position] * Math.exp(0.04 * (p.ovr - str));
  let rating = clamp(RATING_BASE[p.position] + (p.ovr - str) * 0.03, 5.8, 8.2);
  const last = career.history[career.history.length - 1];
  if (last && last.apps >= 8) {
    // Halb Erfahrung, halb Modell
    gpa = (gpa + last.goals / last.apps) / 2;
    apa = (apa + last.assists / last.apps) / 2;
    if (last.avgRating) rating = (rating + last.avgRating) / 2;
    if (last.clubId === clubId) apps = Math.round((apps + last.apps) / 2);
  }
  const rank = clubs.findIndex((c) => c.clubId === clubId) + 1;
  return { season: seasonLabel(career.year), clubId, leagueId, apps, goals: Math.round(apps * gpa), assists: Math.round(apps * apa), rating: Math.round(rating * 100) / 100, clubRank: rank || clubs.length };
}

/** Prognose für die laufende Saison speichern (einmal pro Saison, beim Saisonstart). */
export function ensurePrognosis(career: Career): void {
  const season = seasonLabel(career.year);
  career.prognoses ??= {};
  if (career.prognoses[season]) return;
  career.prognoses[season] = makePrognosis(career);
  // Nur die letzten 30 Saisons behalten
  const keys = Object.keys(career.prognoses).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 30))) delete career.prognoses[k];
}

// ---------- Liga-Vorschau ----------
export interface ClubPreview { clubId: string; strength: number; value: number; forecast: number; lastPos: number | null; promoted: boolean }
/** Vereine der Liga, sortiert nach Prognose (Stärke + kleiner fester Zufall). */
export function leagueClubs(career: Career, leagueId: string): ClubPreview[] {
  const ids = CLUBS.filter((c) => clubLeagueId(career, c.id) === leagueId).map((c) => c.id);
  const last = [...career.history].reverse().find((r) => r.leagueId === leagueId && r.season === seasonLabel(career.year - 1));
  const lastTable = last?.table?.length ? [...last.table].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)) : null;
  const year = career.year;
  const list = ids.map((id) => {
    const strength = Math.round(clubStrength(career, id) * 10) / 10;
    const value = squadOf(id, year, strength).reduce((a, p) => a + p.value, 0);
    const lp = lastTable ? lastTable.findIndex((r) => r.clubId === id) + 1 : 0;
    const noise = (rng(`fc-${id}-${year}`)() - 0.5) * 2.2;
    return { clubId: id, strength, value, forecast: strength + noise, lastPos: lp > 0 ? lp : null, promoted: !!lastTable && lp === 0 };
  });
  return list.sort((a, b) => b.forecast - a.forecast);
}

// ---------- Stars der Liga ----------
export interface StarEntry extends SquadEntry { clubId: string }
export function leagueStars(career: Career, leagueId: string): { top: StarEntry[]; scorers: StarEntry[]; talents: StarEntry[] } {
  const ids = leagueClubs(career, leagueId).map((c) => c.clubId);
  const all: StarEntry[] = ids.flatMap((id) => realPlayersOf(id, career.year).map((p) => ({ ...p, clubId: id })));
  const me = career.player;
  const you: StarEntry = { name: me.name, pos: me.position, age: me.age, nation: me.nation, ovr: me.ovr, pot: me.potential, value: marketValue(me.ovr, me.age, me.potential), real: false, you: true, clubId: currentClubId(me) };
  const withYou = [...all.filter((p) => p.name !== me.name), you];
  return {
    top: [...withYou].sort((a, b) => b.ovr - a.ovr).slice(0, 10),
    scorers: withYou.filter((p) => p.pos === 'ST' || p.pos === 'FL').sort((a, b) => b.ovr - a.ovr).slice(0, 6),
    talents: withYou.filter((p) => p.age <= 21).sort((a, b) => b.pot - a.pot || b.ovr - a.ovr).slice(0, 6),
  };
}

// ---------- Rückblick ----------
export interface RankEntry { name: string; clubId: string; value: number; you?: boolean; extra?: string }
const tableSorted = (t: TableRow[]) => [...t].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor);

/** Ranglisten einer abgeschlossenen Saison: Torjäger, Scorer (Tore + Vorlagen), Notenschnitt. */
export function seasonRankings(career: Career, r: SeasonRecord): { scorers: RankEntry[]; points: RankEntry[]; ratings: RankEntry[] } | null {
  if (!r.table?.length) return null;
  const me = career.player.name;
  const leagueGoals = r.byCompetition?.find((s) => s.competition === 'Liga')?.goals ?? r.goals;
  const leagueAssists = r.byCompetition?.find((s) => s.competition === 'Liga')?.assists ?? r.assists;
  const leagueRating = r.byCompetition?.find((s) => s.competition === 'Liga')?.avgRating ?? r.avgRating;
  const race = scorerRace(r.table, r.season, { name: me, clubId: r.clubId, goals: leagueGoals });
  const scorers: RankEntry[] = race.slice(0, 10).map((e) => ({ name: e.name, clubId: e.clubId, value: e.goals, you: e.you }));
  if (!scorers.some((e) => e.you)) { const i = race.findIndex((e) => e.you); scorers.push({ name: me, clubId: r.clubId, value: leagueGoals, you: true, extra: `Platz ${i + 1}` }); }
  // Scorer: Tore + fester Anteil Vorlagen
  const points: RankEntry[] = race.filter((e) => !e.you).map((e) => {
    const a = Math.round(e.goals * (0.25 + rng(`as-${e.name}-${r.season}`)() * 0.5));
    return { name: e.name, clubId: e.clubId, value: e.goals + a, extra: `${e.goals} T · ${a} V` };
  });
  points.push({ name: me, clubId: r.clubId, value: leagueGoals + leagueAssists, you: true, extra: `${leagueGoals} T · ${leagueAssists} V` });
  points.sort((a, b) => b.value - a.value || (a.you ? -1 : 1));
  // Notenschnitt: beste echte Spieler der Liga, nach Wertung und Tabellenplatz
  const year = Number(r.season.slice(0, 4));
  const sorted = tableSorted(r.table);
  const pool: RankEntry[] = sorted.flatMap((row, i) => realPlayersOf(row.clubId, year).filter((p) => p.name !== me).map((p) => {
    const v = 6.5 + (p.ovr - 75) * 0.035 + (sorted.length / 2 - i) * 0.012 + (rng(`rt-${p.name}-${r.season}`)() - 0.5) * 0.5;
    return { name: p.name, clubId: row.clubId, value: Math.round(clamp(v, 5.5, 8.4) * 100) / 100 };
  }));
  if (leagueRating && r.apps >= 10) pool.push({ name: me, clubId: r.clubId, value: Math.round(leagueRating * 100) / 100, you: true });
  pool.sort((a, b) => b.value - a.value || (a.you ? -1 : 1));
  const ratings = pool.slice(0, 10);
  const add = (list: RankEntry[], full: RankEntry[]) => { if (!list.some((e) => e.you)) { const i = full.findIndex((e) => e.you); if (i >= 0) list.push({ ...full[i], extra: `${full[i].extra ? `${full[i].extra} · ` : ''}Platz ${i + 1}` }); } return list; };
  return { scorers, points: add(points.slice(0, 10), points), ratings: add(ratings, pool) };
}

/** Elf der Saison (4-3-3) aus den besten Spielern der Liga – der eigene Spieler, wenn er gut genug war. */
export function teamOfSeason(career: Career, r: SeasonRecord): { pos: Position; name: string; clubId: string; rating: number; you?: boolean }[] {
  if (!r.table?.length) return [];
  const year = Number(r.season.slice(0, 4));
  const sorted = tableSorted(r.table);
  const me = career.player;
  const cand = sorted.flatMap((row, i) => realPlayersOf(row.clubId, year).filter((p) => p.name !== me.name).map((p) => ({
    pos: p.pos, name: p.name, clubId: row.clubId,
    rating: Math.round(clamp(6.5 + (p.ovr - 75) * 0.035 + (sorted.length / 2 - i) * 0.012 + (rng(`rt-${p.name}-${r.season}`)() - 0.5) * 0.5, 5.5, 8.4) * 100) / 100,
  })));
  const myRating = r.byCompetition?.find((s) => s.competition === 'Liga')?.avgRating ?? r.avgRating;
  if (myRating && r.apps >= 15) cand.push({ pos: me.position, name: me.name, clubId: r.clubId, rating: Math.round(myRating * 100) / 100, you: true } as never);
  const slots: [Position, Position[]][] = [['TW', ['TW']], ['AV', ['AV']], ['IV', ['IV']], ['IV', ['IV', 'ZDM']], ['AV', ['AV']], ['ZDM', ['ZDM', 'ZM']], ['ZM', ['ZM', 'ZOM']], ['ZOM', ['ZOM', 'ZM']], ['FL', ['FL']], ['ST', ['ST']], ['FL', ['FL', 'ST']]];
  const used = new Set<string>();
  const out: { pos: Position; name: string; clubId: string; rating: number; you?: boolean }[] = [];
  for (const [slot, ok] of slots) {
    const best = cand.filter((c) => ok.includes(c.pos) && !used.has(c.name)).sort((a, b) => b.rating - a.rating)[0];
    if (best) { used.add(best.name); out.push({ ...best, pos: slot }); }
  }
  return out;
}

/** Prognose gegen Wirklichkeit. */
export function prognosisCheck(career: Career, r: SeasonRecord): { label: string; plan: string; real: string; good: boolean | null }[] | null {
  const pg = career.prognoses?.[r.season];
  if (!pg) return null;
  const rank = r.leaguePosition || 0;
  const n = (v: number) => v.toFixed(2).replace('.', ',');
  return [
    { label: 'Einsätze', plan: `${pg.apps}`, real: `${r.apps}`, good: r.apps >= pg.apps ? true : r.apps < pg.apps * 0.8 ? false : null },
    { label: 'Tore', plan: `${pg.goals}`, real: `${r.goals}`, good: r.goals > pg.goals ? true : r.goals < pg.goals * 0.8 ? false : null },
    { label: 'Vorlagen', plan: `${pg.assists}`, real: `${r.assists}`, good: r.assists > pg.assists ? true : r.assists < pg.assists * 0.8 ? false : null },
    { label: 'Ø-Note', plan: n(pg.rating), real: r.avgRating ? n(r.avgRating) : '–', good: r.avgRating ? (r.avgRating >= pg.rating + 0.1 ? true : r.avgRating <= pg.rating - 0.15 ? false : null) : null },
    ...(pg.clubId === r.clubId && rank ? [{ label: 'Tabellenplatz', plan: `${pg.clubRank}.`, real: `${rank}.`, good: rank < pg.clubRank ? true : rank > pg.clubRank + 1 ? false : null }] : []),
  ];
}

export const clubShort = (id: string) => getClub(id).name;
