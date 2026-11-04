import { CLUBS, LEAGUES, getClub, getLeague } from '../data/leagues';
import { REAL_PLAYERS } from '../data/players';
import { marketValue, roundMoney } from './player';
import { chance, clamp, normal, pick, poisson, randInt, shuffle, uid, weightedPick } from './random';
import { FIRST, LAST } from './rival';
import { addResult, emptyRow, goalsExpected, roundRobin, sortTable } from './season';
import type { Position, TableRow } from './types';

// ---------- Manager-Modus ----------
// Eigener Verein: Kader aus den echten Spielern des Vereins (aufgefüllt mit erfundenen Spielern),
// Spieltag für Spieltag durch die Liga, Transferfenster im Sommer und Winter, Auf- und Abstieg, Vorstandsziel.

export const MANAGER_LEAGUES = ['bl1', 'bl2', 'pl', 'ch', 'll', 'sa', 'l1', 'lp', 'ere', 'spl', 'mls'];
export const SQUAD_MAX = 36;
export const SQUAD_MIN = 16;

export interface MPlayer {
  id: string;
  name: string;
  nation: string;
  pos: Position;
  age: number;
  ovr: number;
  pot: number;
  /** Echter Spieler aus der Datenbank (sonst erfunden). */
  real?: boolean;
  goals: number;
  /** Einsätze gesamt (Startelf + eingewechselt). */
  apps: number;
  starts?: number;
  /** Wie oft eingewechselt. */
  subs?: number;
  mins?: number;
  assists?: number;
  /** Summe der Spielnoten und Anzahl benoteter Spiele (für den Schnitt). */
  rSum?: number;
  rN?: number;
  /** Spieler des Spiels */
  motm?: number;
  /** Seit dieser Saison im Verein (für „Neuzugang“). */
  joined?: number;
}

export interface MarketPlayer extends MPlayer {
  clubId: string;
  price: number;
}

export type Formation = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1';
export type Tactic = 'defensiv' | 'ausgewogen' | 'offensiv';

export const FORMATIONS: Record<Formation, { slots: Position[]; xy: [number, number][] }> = {
  '4-3-3': { slots: ['TW', 'AV', 'IV', 'IV', 'AV', 'ZDM', 'ZM', 'ZM', 'FL', 'ST', 'FL'],
    xy: [[50, 90], [12, 68], [36, 72], [64, 72], [88, 68], [50, 54], [28, 44], [72, 44], [16, 20], [50, 14], [84, 20]] },
  '4-4-2': { slots: ['TW', 'AV', 'IV', 'IV', 'AV', 'FL', 'ZM', 'ZM', 'FL', 'ST', 'ST'],
    xy: [[50, 90], [12, 68], [36, 72], [64, 72], [88, 68], [12, 40], [36, 46], [64, 46], [88, 40], [36, 16], [64, 16]] },
  '3-5-2': { slots: ['TW', 'IV', 'IV', 'IV', 'AV', 'ZDM', 'ZM', 'ZOM', 'AV', 'ST', 'ST'],
    xy: [[50, 90], [24, 72], [50, 74], [76, 72], [10, 46], [50, 56], [30, 42], [70, 38], [90, 46], [36, 16], [64, 16]] },
  '4-2-3-1': { slots: ['TW', 'AV', 'IV', 'IV', 'AV', 'ZDM', 'ZDM', 'FL', 'ZOM', 'FL', 'ST'],
    xy: [[50, 90], [12, 68], [36, 72], [64, 72], [88, 68], [36, 54], [64, 54], [16, 30], [50, 34], [84, 30], [50, 12]] },
};
export const TACTICS: Record<Tactic, { att: number; def: number; text: string }> = {
  defensiv: { att: -2, def: 3, text: 'Weniger Gegentore, weniger Tore' },
  ausgewogen: { att: 0, def: 0, text: 'Kein Risiko, kein Bonus' },
  offensiv: { att: 3, def: -2, text: 'Mehr Tore – vorne wie hinten' },
};

export interface MatchEvent { min: number; home: boolean; scorer: string; kind?: 'goal' | 'sub'; assist?: string; out?: string }
export const isGoal = (e: MatchEvent) => e.kind !== 'sub';
export interface MatchLine { home: string; away: string; hg: number; ag: number }
export interface MyMatch extends MatchLine { events: MatchEvent[]; round: number; motm?: string; ratings?: { name: string; r: number; mins: number }[] }

export interface SeasonRecord { season: number; leagueId: string; pos: number; points: number; target: number; title?: string; topScorer?: string }

export interface ManagerState {
  v: 1;
  clubId: string;
  /** Liga je Verein (Auf- und Abstieg verschiebt Vereine). */
  leagueOf: Record<string, string>;
  season: number;
  budget: number;
  squad: MPlayer[];
  /** Spieler-IDs der Startelf in Reihenfolge der Formations-Plätze. */
  xi: string[];
  /** Ersatzbank (bis zu 7 Spieler). Fehlt sie, wird sie automatisch besetzt. */
  bench?: string[];
  formation: Formation;
  tactic: Tactic;
  rows: TableRow[];
  rounds: [string, string][][];
  round: number;
  strength: Record<string, number>;
  market: MarketPlayer[];
  last?: { mine: MyMatch | null; others: MatchLine[] };
  history: SeasonRecord[];
  trophies: string[];
  target: number;
  /** Saisonende erreicht, Bilanz noch nicht abgeschlossen. */
  done?: boolean;
  news: string[];
  /** Bis zu diesem Wert ist der Vorstand zufrieden (0–100). */
  board: number;
  /** Gesamtstatistik */
  won: number; drawn: number; lost: number;
}

export const leagueOfClub = (m: Pick<ManagerState, 'leagueOf'>, clubId: string) => m.leagueOf[clubId] ?? getClub(clubId).leagueId;
export const myLeague = (m: ManagerState) => getLeague(leagueOfClub(m, m.clubId));
export const clubsIn = (m: Pick<ManagerState, 'leagueOf'>, leagueId: string) => CLUBS.filter((c) => leagueOfClub(m, c.id) === leagueId).map((c) => c.id);
export const halfRound = (m: ManagerState) => Math.floor(m.rounds.length / 2);
/** Sommerfenster vor dem 1. Spieltag, Winterfenster zur Halbzeit. */
export const windowOpen = (m: ManagerState) => !m.done && (m.round === 0 || m.round === halfRound(m));
export const windowName = (m: ManagerState) => (m.round === 0 ? 'Sommer-Transferfenster' : 'Winter-Transferfenster');

/** Start-Budget: stärkere Vereine haben deutlich mehr Geld. */
export const startBudget = (strength: number) => roundMoney(5e6 * Math.exp(0.14 * (strength - 66)));

const SQUAD_SHAPE: [Position, number][] = [['TW', 3], ['IV', 4], ['AV', 4], ['ZDM', 2], ['ZM', 3], ['ZOM', 2], ['FL', 3], ['ST', 2]];
const NATIONS_FILL = ['Deutschland', 'Spanien', 'Frankreich', 'England', 'Italien', 'Portugal', 'Niederlande', 'Brasilien', 'Argentinien', 'Belgien', 'Kroatien', 'Dänemark', 'Österreich', 'Schweiz', 'Polen', 'Türkei', 'Norwegen', 'Schweden', 'Japan', 'USA'];
const LEAGUE_NATION: Record<string, string> = { bl1: 'Deutschland', bl2: 'Deutschland', pl: 'England', ch: 'England', ll: 'Spanien', sa: 'Italien', l1: 'Frankreich', lp: 'Portugal', ere: 'Niederlande', spl: 'Saudi-Arabien', mls: 'USA' };

function fakePlayer(pos: Position, level: number, leagueId: string, season: number): MPlayer {
  const age = clamp(Math.round(normal(26, 4)), 18, 34);
  const ovr = clamp(Math.round(level + normal(0, 3)), 45, 86);
  const pot = age <= 23 ? clamp(ovr + randInt(2, 12), ovr, 90) : ovr;
  const nation = chance(0.55) ? (LEAGUE_NATION[leagueId] ?? pick(NATIONS_FILL)) : pick(NATIONS_FILL);
  return { id: `f-${uid()}`, name: `${pick(FIRST)} ${pick(LAST)}`, nation, pos, age, ovr, pot, goals: 0, apps: 0, joined: season };
}

const realOf = (clubId: string): MPlayer[] => REAL_PLAYERS.filter((p) => p.clubId === clubId).map((p) => ({
  id: `r-${p.name}`, name: p.name, nation: p.nation, pos: p.position, age: p.age, ovr: p.ovr, pot: Math.max(p.ovr, p.potential), real: true, goals: 0, apps: 0,
}));

/** Kader eines Vereins: echte Spieler + erfundene Spieler passend zur Teamstärke, bis jede Position besetzt ist. */
export function buildSquad(clubId: string, season = 2025, leagueId = getClub(clubId).leagueId): MPlayer[] {
  const str = getClub(clubId).strength;
  const squad = realOf(clubId);
  for (const [pos, n] of SQUAD_SHAPE) {
    const have = squad.filter((p) => p.pos === pos).length;
    // Die ersten Spieler pro Position sind Stammkräfte, danach Ersatz
    for (let i = have; i < n; i++) squad.push(fakePlayer(pos, str - (i < Math.ceil(n / 2) ? 1 : 5), leagueId, season));
  }
  return squad.map((p) => ({ ...p, joined: undefined }));
}

/** Wie gut ein Spieler auf einen Platz passt (Abzug bei fremder Position). */
const FIT: Partial<Record<Position, Position[]>> = {
  IV: ['ZDM'], AV: ['IV', 'FL'], ZDM: ['ZM', 'IV'], ZM: ['ZDM', 'ZOM'], ZOM: ['ZM', 'FL', 'ST'], FL: ['ZOM', 'ST', 'AV'], ST: ['FL', 'ZOM'],
};
export function slotRating(p: MPlayer, slot: Position): number {
  if (p.pos === slot) return p.ovr;
  if (slot === 'TW' || p.pos === 'TW') return p.ovr - 30;
  return FIT[slot]?.includes(p.pos) ? p.ovr - 3 : p.ovr - 9;
}

/** Beste Elf für eine Formation (gierig: schwierigste Plätze zuerst). */
export function bestXI(squad: MPlayer[], formation: Formation): string[] {
  const slots = FORMATIONS[formation].slots;
  const order = slots.map((s, i) => ({ s, i })).sort((a, b) => (a.s === 'TW' ? -1 : b.s === 'TW' ? 1 : 0));
  const used = new Set<string>();
  const out: string[] = new Array(slots.length).fill('');
  for (const { s, i } of order) {
    const best = squad.filter((p) => !used.has(p.id)).sort((a, b) => slotRating(b, s) - slotRating(a, s))[0];
    if (best) { used.add(best.id); out[i] = best.id; }
  }
  return out;
}

/** Elf bereinigen: fehlende oder verkaufte Spieler durch die besten freien ersetzen. */
export function fixXI(m: Pick<ManagerState, 'squad' | 'xi' | 'formation'>): string[] {
  const slots = FORMATIONS[m.formation].slots;
  const ids = new Set(m.squad.map((p) => p.id));
  const xi = slots.map((_, i) => (ids.has(m.xi[i]) ? m.xi[i] : ''));
  const used = new Set(xi.filter(Boolean));
  slots.forEach((s, i) => {
    if (xi[i]) return;
    const best = m.squad.filter((p) => !used.has(p.id)).sort((a, b) => slotRating(b, s) - slotRating(a, s))[0];
    if (best) { xi[i] = best.id; used.add(best.id); }
  });
  return xi;
}

export const BENCH_SIZE = 7;
/** Beste Bank: ein Torwart, danach die stärksten übrigen Spieler, möglichst verschiedene Positionen. */
export function bestBench(squad: MPlayer[], xi: string[]): string[] {
  const free = squad.filter((p) => !xi.includes(p.id)).sort((a, b) => b.ovr - a.ovr);
  const out: MPlayer[] = [];
  const tw = free.find((p) => p.pos === 'TW');
  if (tw) out.push(tw);
  for (const p of free) { if (out.length >= BENCH_SIZE) break; if (!out.includes(p) && !out.some((o) => o.pos === p.pos && o.pos !== 'IV' && o.pos !== 'ZM')) out.push(p); }
  for (const p of free) { if (out.length >= BENCH_SIZE) break; if (!out.includes(p)) out.push(p); }
  return out.map((p) => p.id);
}
/** Gültige Bank: nur Kaderspieler, die nicht in der Startelf stehen. */
export function fixBench(m: Pick<ManagerState, 'squad' | 'xi' | 'bench'>): string[] {
  if (!m.bench) return bestBench(m.squad, m.xi);
  const ids = new Set(m.squad.map((p) => p.id));
  return m.bench.filter((id, i, a) => ids.has(id) && !m.xi.includes(id) && a.indexOf(id) === i).slice(0, BENCH_SIZE);
}
export const avgRating = (p: MPlayer) => (p.rN ? Math.round(((p.rSum ?? 0) / p.rN) * 10) / 10 : 0);

/** Teamstärke der Startelf. */
export function teamRating(m: Pick<ManagerState, 'squad' | 'xi' | 'formation'>): number {
  const slots = FORMATIONS[m.formation].slots;
  const byId = new Map(m.squad.map((p) => [p.id, p]));
  const r = slots.map((s, i) => { const p = byId.get(m.xi[i]); return p ? slotRating(p, s) : 40; });
  return Math.round((r.reduce((a, b) => a + b, 0) / r.length) * 10) / 10;
}

/** Vorstandsziel: erwarteter Tabellenplatz nach Stärke-Rang (mit etwas Spielraum). */
function boardTarget(m: ManagerState): number {
  const ids = clubsIn(m, leagueOfClub(m, m.clubId));
  const mine = teamRating(m);
  const rank = 1 + ids.filter((id) => id !== m.clubId && (m.strength[id] ?? 0) > mine).length;
  return clamp(rank + 1, 1, ids.length);
}

function seasonSetup(m: ManagerState): ManagerState {
  const leagueId = leagueOfClub(m, m.clubId);
  const ids = clubsIn(m, leagueId);
  const strength: Record<string, number> = {};
  // Die Gegner schwanken von Saison zu Saison etwas
  for (const id of ids) if (id !== m.clubId) strength[id] = Math.round((getClub(id).strength + normal(0, 1.2)) * 10) / 10;
  const next: ManagerState = { ...m, strength, rows: ids.map(emptyRow), rounds: roundRobin(shuffle([...ids])), round: 0, last: undefined, done: false };
  next.target = boardTarget(next);
  next.market = buildMarket(next);
  return next;
}

export function newManager(clubId: string): ManagerState {
  const club = getClub(clubId);
  const squad = buildSquad(clubId);
  const base: ManagerState = {
    v: 1, clubId, leagueOf: {}, season: 2025, budget: startBudget(club.strength), squad, xi: [], formation: '4-3-3', tactic: 'ausgewogen',
    rows: [], rounds: [], round: 0, strength: {}, market: [], history: [], trophies: [], target: 1, news: [`Willkommen bei ${club.name}! Der Vorstand erwartet eine starke Saison.`],
    board: 70, won: 0, drawn: 0, lost: 0,
  };
  base.xi = bestXI(squad, base.formation);
  base.bench = bestBench(squad, base.xi);
  return seasonSetup(base);
}

// ---------- Transfermarkt ----------

export const playerValueM = (p: Pick<MPlayer, 'ovr' | 'age' | 'pot'>) => marketValue(p.ovr, p.age, p.pot);

/** Angebot auf dem Markt: echte Spieler aus anderen Vereinen plus erfundene Spieler aus der Liga. */
export function buildMarket(m: ManagerState): MarketPlayer[] {
  const mine = new Set(m.squad.map((p) => p.name));
  const str = getClub(m.clubId).strength;
  const reals = shuffle(REAL_PLAYERS.filter((p) => p.clubId !== m.clubId && !mine.has(p.name) && p.ovr <= str + 9 && p.ovr >= str - 10 && CLUBS.some((c) => c.id === p.clubId)))
    .slice(0, 22)
    .map((p): MarketPlayer => ({ id: `r-${p.name}`, name: p.name, nation: p.nation, pos: p.position, age: p.age, ovr: p.ovr, pot: Math.max(p.ovr, p.potential), real: true, goals: 0, apps: 0, clubId: p.clubId, price: 0 }));
  const lg = leagueOfClub(m, m.clubId);
  const others = clubsIn(m, lg).filter((id) => id !== m.clubId);
  const fakes = Array.from({ length: 14 }, (): MarketPlayer => {
    const from = pick(others.length ? others : [m.clubId]);
    const p = fakePlayer(pick(SQUAD_SHAPE)[0], getClub(from).strength + randInt(-4, 4), lg, m.season);
    return { ...p, clubId: from, price: 0 };
  });
  // Zwei Juwelen: jung, hohes Potenzial
  const gems = Array.from({ length: 2 }, (): MarketPlayer => {
    const from = pick(others.length ? others : [m.clubId]);
    const p = fakePlayer(pick(['ST', 'FL', 'ZOM', 'IV'] as Position[]), str - 8, lg, m.season);
    return { ...p, age: randInt(17, 19), pot: clamp(str + randInt(6, 12), 70, 92), clubId: from, price: 0 };
  });
  // Ein Traum-Transfer: deutlich besser als das Team, teuer, aber machbar
  const dream = shuffle(REAL_PLAYERS.filter((p) => p.clubId !== m.clubId && !mine.has(p.name) && p.ovr > str + 9 && p.ovr <= str + 16 && CLUBS.some((c) => c.id === p.clubId)))
    .slice(0, 2).map((p): MarketPlayer => ({ id: `r-${p.name}`, name: p.name, nation: p.nation, pos: p.position, age: p.age, ovr: p.ovr, pot: Math.max(p.ovr, p.potential), real: true, goals: 0, apps: 0, clubId: p.clubId, price: 0 }));
  return [...dream, ...reals, ...fakes, ...gems].map((p) => ({ ...p, price: roundMoney(playerValueM(p) * (0.95 + Math.random() * 0.3)) })).sort((a, b) => b.ovr - a.ovr);
}

/** Wechselbereitschaft 0–100: Topspieler gehen ungern zu kleineren Vereinen. */
export function willingness(m: ManagerState, p: MarketPlayer): number {
  const gap = p.ovr - teamRating(m);
  const fromStr = getClub(p.clubId).strength;
  const myStr = getClub(m.clubId).strength + (m.trophies.length ? 2 : 0);
  return Math.round(clamp(88 - Math.max(0, gap) * 4 - Math.max(0, fromStr - myStr) * 1.5, 5, 98));
}

export type BuyResult = { ok: true; m: ManagerState; player: MPlayer } | { ok: false; reason: string };

export function buyPlayer(m: ManagerState, id: string, roll = Math.random()): BuyResult {
  if (!windowOpen(m)) return { ok: false, reason: 'Das Transferfenster ist geschlossen.' };
  const p = m.market.find((x) => x.id === id);
  if (!p) return { ok: false, reason: 'Spieler nicht mehr verfügbar.' };
  if (m.squad.length >= SQUAD_MAX) return { ok: false, reason: `Kader voll (max. ${SQUAD_MAX}). Verkaufe zuerst jemanden.` };
  if (p.price > m.budget) return { ok: false, reason: 'Nicht genug Budget.' };
  if (roll * 100 > willingness(m, p)) {
    // Absage: Spieler verschwindet vom Markt
    return { ok: false, reason: `${p.name} sagt ab – der Wechsel reizt ihn nicht.` };
  }
  const { clubId: _c, price: _p, ...rest } = p;
  const player: MPlayer = { ...rest, goals: 0, apps: 0, joined: m.season };
  const next: ManagerState = {
    ...m, budget: m.budget - p.price, squad: [...m.squad, player], market: m.market.filter((x) => x.id !== id),
    news: [`Neuzugang: ${p.name} kommt für ${moneyShort(p.price)} von ${getClub(p.clubId).name}.`, ...m.news].slice(0, 30),
  };
  return { ok: true, m: next, player };
}
/** Nach einer Absage ist der Spieler weg. */
export const dropFromMarket = (m: ManagerState, id: string): ManagerState => ({ ...m, market: m.market.filter((x) => x.id !== id) });

/** Angebot eines anderen Vereins für einen eigenen Spieler (fest pro Spieler und Fenster). */
export function sellOffer(m: ManagerState, p: MPlayer): { clubId: string; amount: number } {
  let h = 0;
  for (const ch of `${p.id}-${m.season}-${m.round}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const f = 0.8 + (h % 1000) / 1000 * 0.4;
  const buyers = CLUBS.filter((c) => c.id !== m.clubId && Math.abs(c.strength - p.ovr) <= 8);
  const club = buyers.length ? buyers[h % buyers.length] : CLUBS[h % CLUBS.length];
  return { clubId: club.id, amount: roundMoney(playerValueM(p) * f) };
}

export function sellPlayer(m: ManagerState, id: string): ManagerState | null {
  if (!windowOpen(m) || m.squad.length <= SQUAD_MIN) return null;
  const p = m.squad.find((x) => x.id === id);
  if (!p) return null;
  const o = sellOffer(m, p);
  const squad = m.squad.filter((x) => x.id !== id);
  const xi2 = fixXI({ ...m, squad });
  return { ...m, squad, budget: m.budget + o.amount, xi: xi2, bench: fixBench({ ...m, squad, xi: xi2 }), news: [`Abgang: ${p.name} wechselt für ${moneyShort(o.amount)} zu ${getClub(o.clubId).name}.`, ...m.news].slice(0, 30) };
}

export const moneyShort = (v: number) => (v >= 1e6 ? `${(v / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio.` : `${Math.round(v / 1e3).toLocaleString('de-DE')} Tsd.`);

// ---------- Spieltag ----------

const SCORE_W: Record<Position, number> = { ST: 10, FL: 6, ZOM: 6, ZM: 3, ZDM: 1.5, AV: 1, IV: 1, TW: 0.02 };
const ASSIST_W: Partial<Record<Position, number>> = { ZOM: 8, FL: 7, ZM: 5, ST: 4, AV: 3, ZDM: 2, IV: 0.8, TW: 0.2 };


export function playRound(m: ManagerState): ManagerState {
  if (m.done || m.round >= m.rounds.length) return m;
  const lg = myLeague(m);
  const xi = fixXI(m);
  const bench = fixBench({ ...m, xi });
  const my = { ...m, xi };
  const myStr = teamRating(my);
  const t = TACTICS[m.tactic];
  const rows = m.rows.map((r) => ({ ...r }));
  const row = (id: string) => rows.find((r) => r.clubId === id)!;
  const byId = new Map(m.squad.map((p) => [p.id, { ...p }]));
  const others: MatchLine[] = [];
  let mine: MyMatch | null = null;
  for (const [h, a] of m.rounds[m.round]) {
    const isH = h === m.clubId, isA = a === m.clubId;
    const sH = isH ? myStr : m.strength[h] ?? getClub(h).strength;
    const sA = isA ? myStr : m.strength[a] ?? getClub(a).strength;
    const attH = sH + (isH ? t.att : 0) - (isA ? t.def : 0);
    const attA = sA + (isA ? t.att : 0) - (isH ? t.def : 0);
    const hg = poisson(goalsExpected(attH, sA, true, lg.goalsPerGame));
    const ag = poisson(goalsExpected(attA, sH, false, lg.goalsPerGame));
    addResult(row(h), hg, ag);
    addResult(row(a), ag, hg);
    if (isH || isA) mine = myMatch(m, byId, xi, bench, h, a, hg, ag);
    else others.push({ home: h, away: a, hg, ag });
  }
  let { won, drawn, lost, board } = m;
  if (mine) {
    const me = mine as MyMatch;
    const gf = me.home === m.clubId ? me.hg : me.ag, ga = me.home === m.clubId ? me.ag : me.hg;
    if (gf > ga) { won++; board = clamp(board + 2, 0, 100); } else if (gf === ga) drawn++; else { lost++; board = clamp(board - 2, 0, 100); }
  }
  const round = m.round + 1;
  const next: ManagerState = { ...m, xi, bench: m.bench ? bench : undefined, squad: m.squad.map((p) => byId.get(p.id) ?? p), rows, round, won, drawn, lost, board, last: { mine, others } };
  if (round === halfRound(m)) next.market = buildMarket(next);
  if (round >= m.rounds.length) next.done = true;
  return next;
}

/**
 * Das eigene Spiel im Detail: 3–5 Wechsel von der Bank ab der 55. Minute (müde oder schwache Spieler raus,
 * der passendste Bankspieler rein), Torschützen und Vorlagen nur von Spielern, die gerade auf dem Platz stehen,
 * Minuten und Noten für alle, die gespielt haben.
 */
function myMatch(m: ManagerState, byId: Map<string, MPlayer>, xi: string[], bench: string[], h: string, a: string, hg: number, ag: number): MyMatch {
  const meHome = h === m.clubId;
  const gf = meHome ? hg : ag, ga = meHome ? ag : hg;
  const slots = FORMATIONS[m.formation].slots;
  // Wer steht wann auf dem Platz: [Spieler, von, bis]
  const spells: { p: MPlayer; from: number; to: number; slot: Position }[] = xi.map((id, i) => ({ p: byId.get(id)!, from: 0, to: 90, slot: slots[i] })).filter((x) => x.p);
  const events: MatchEvent[] = [];
  const pool = bench.map((id) => byId.get(id)).filter((p): p is MPlayer => !!p && p.pos !== 'TW');
  const nSubs = Math.min(pool.length, randInt(3, 5));
  const subMins = Array.from({ length: nSubs }, () => randInt(55, 86)).sort((x, y) => x - y);
  for (const min of subMins) {
    const onPitch = spells.filter((s) => s.to === 90 && s.from === 0 && s.slot !== 'TW');
    if (!onPitch.length || !pool.length) break;
    // Raus: Ältere und Schwächere eher (Müdigkeit), mit Zufall
    const out = onPitch.map((s) => ({ s, w: -s.p.ovr + (s.p.age - 26) * 0.6 + normal(0, 3) })).sort((x, y) => y.w - x.w)[0].s;
    const inn = pool.sort((x, y) => slotRating(y, out.slot) - slotRating(x, out.slot))[0];
    pool.splice(pool.indexOf(inn), 1);
    out.to = min;
    spells.push({ p: inn, from: min, to: 90, slot: out.slot });
    events.push({ min, home: meHome, scorer: inn.name, out: out.p.name, kind: 'sub' });
  }
  const at = (min: number) => spells.filter((s) => s.from < min && s.to >= min);
  const goals: Map<string, number> = new Map();
  const assists: Map<string, number> = new Map();
  const addGoal = (min: number) => {
    const on = at(min);
    const sc = weightedPick(on, (s) => SCORE_W[s.p.pos] * (s.p.ovr / 70)).p;
    goals.set(sc.id, (goals.get(sc.id) ?? 0) + 1);
    let as: MPlayer | undefined;
    if (chance(0.72)) {
      const mates = on.filter((s) => s.p.id !== sc.id);
      if (mates.length) { as = weightedPick(mates, (s) => (ASSIST_W[s.p.pos] ?? 1) * (s.p.ovr / 70)).p; assists.set(as.id, (assists.get(as.id) ?? 0) + 1); }
    }
    events.push({ min, home: meHome, scorer: sc.name, assist: as?.name, kind: 'goal' });
  };
  for (let i = 0; i < gf; i++) addGoal(randInt(1, 90));
  for (let i = 0; i < ga; i++) events.push({ min: randInt(1, 90), home: !meHome, scorer: `${pick(FIRST)[0]}. ${pick(LAST)}`, kind: 'goal' });
  // Gleiche Minute: Wechsel vor dem Tor anzeigen
  events.sort((x, y) => x.min - y.min || (x.kind === 'sub' ? -1 : 1));
  // Minuten, Noten, Statistik
  const avg = spells.reduce((s, x) => s + x.p.ovr, 0) / Math.max(1, spells.length);
  const res = gf > ga ? 0.45 : gf === ga ? 0 : -0.45;
  const ratings: { name: string; r: number; mins: number; id: string }[] = [];
  for (const s of spells) {
    const mins = s.to - s.from;
    const g = goals.get(s.p.id) ?? 0, as = assists.get(s.p.id) ?? 0;
    const defBonus = ga === 0 && ['TW', 'IV', 'AV', 'ZDM'].includes(s.p.pos) ? 0.5 : ga >= 3 && ['TW', 'IV'].includes(s.p.pos) ? -0.5 : 0;
    const share = Math.min(1, mins / 60);
    let r = 6.4 + ((s.p.ovr - avg) * 0.05 + res + defBonus + normal(0, 0.45)) * share + g * 0.9 + as * 0.5;
    r = Math.round(clamp(r, 3.5, 10) * 10) / 10;
    ratings.push({ name: s.p.name, r, mins, id: s.p.id });
    const p = s.p;
    p.apps++;
    if (s.from === 0) p.starts = (p.starts ?? 0) + 1; else p.subs = (p.subs ?? 0) + 1;
    p.mins = (p.mins ?? 0) + mins;
    p.goals += g;
    p.assists = (p.assists ?? 0) + as;
    p.rSum = Math.round(((p.rSum ?? 0) + r) * 10) / 10;
    p.rN = (p.rN ?? 0) + 1;
  }
  ratings.sort((x, y) => y.r - x.r);
  const best = ratings[0];
  if (best) { const p = byId.get(best.id)!; p.motm = (p.motm ?? 0) + 1; }
  return { home: h, away: a, hg, ag, events, round: m.round + 1, motm: best?.name, ratings: ratings.map(({ name, r, mins }) => ({ name, r, mins })) };
}

export const tablePos = (m: ManagerState) => sortTable(m.rows).findIndex((r) => r.clubId === m.clubId) + 1;
export const zoneOf = (m: ManagerState, pos: number): 'up' | 'down' | 'cl' | '' => {
  const lg = myLeague(m);
  const n = m.rows.length;
  if (lg.up && pos <= lg.up.spots) return 'up';
  if (lg.tier === 1 && pos <= (lg.europe.cl || 0)) return 'cl';
  if (lg.down && pos > n - lg.down.spots) return 'down';
  return '';
};

// ---------- Saisonende ----------

export interface SeasonSummary {
  pos: number; points: number; target: number; reached: boolean; title: string | null;
  move: 'up' | 'down' | null; newLeague: string | null; prize: number; coins: number;
  grew: { name: string; from: number; to: number }[]; retired: string[]; topScorer: { name: string; goals: number } | null;
}

/** Preisgeld nach Platz und Liga. */
export const prizeFor = (tier: number, pos: number, n: number) => roundMoney((tier === 1 ? 30e6 : 8e6) * (0.35 + (n - pos) / n));

export function finishSeason(m: ManagerState): { m: ManagerState; summary: SeasonSummary } {
  const lg = myLeague(m);
  const table = sortTable(m.rows);
  const pos = table.findIndex((r) => r.clubId === m.clubId) + 1;
  const points = table[pos - 1].points;
  const n = table.length;
  const reached = pos <= m.target;
  const title = pos === 1 ? `Meister ${lg.name} ${m.season}/${String(m.season + 1).slice(2)}` : null;
  let leagueOf = { ...m.leagueOf };
  let move: SeasonSummary['move'] = null;
  let newLeague: string | null = null;
  // Auf- und Abstieg: der eigene Verein tauscht mit einem Verein der anderen Liga
  const swap = (target: string, pickStrong: boolean) => {
    const pool = clubsIn({ leagueOf }, target).sort((a, b) => getClub(b).strength - getClub(a).strength);
    const other = pickStrong ? pool[0] : pool[pool.length - 1];
    leagueOf = { ...leagueOf, [m.clubId]: target, ...(other ? { [other]: lg.id } : {}) };
    newLeague = target;
  };
  if (lg.up && pos <= lg.up.spots && MANAGER_LEAGUES.includes(lg.up.leagueId)) { move = 'up'; swap(lg.up.leagueId, false); }
  else if (lg.down && pos > n - lg.down.spots && MANAGER_LEAGUES.includes(lg.down.leagueId)) { move = 'down'; swap(lg.down.leagueId, true); }
  const prize = prizeFor(lg.tier, pos, n) + (reached ? roundMoney(prizeFor(lg.tier, 1, n) * 0.15) : 0);
  const coins = Math.round((2000 + (n - pos) * 400 + (title ? 15000 : 0) + (move === 'up' ? 8000 : 0)) / 100) * 100;
  const scorer = [...m.squad].sort((a, b) => b.goals - a.goals)[0];
  // Entwicklung: Junge wachsen Richtung Potenzial, Ältere bauen ab, 35+ hören auf
  const grew: SeasonSummary['grew'] = [];
  const retired: string[] = [];
  const squad: MPlayer[] = [];
  for (const p of m.squad) {
    const age = p.age + 1;
    let ovr = p.ovr;
    if (p.age <= 23) ovr = Math.min(p.pot, ovr + randInt(1, 4) + (p.apps >= 15 ? 1 : 0));
    else if (p.age <= 28) ovr = Math.min(Math.max(p.pot, ovr), ovr + (chance(0.4) ? 1 : 0));
    else if (p.age >= 31) ovr = ovr - randInt(0, p.age >= 33 ? 3 : 2);
    if (age >= 36 || (age >= 34 && chance(0.4))) { retired.push(p.name); continue; }
    if (ovr !== p.ovr && ovr > p.ovr) grew.push({ name: p.name, from: p.ovr, to: ovr });
    squad.push({ ...p, age, ovr, pot: Math.max(p.pot, ovr), goals: 0, apps: 0, starts: 0, subs: 0, mins: 0, assists: 0, rSum: 0, rN: 0, motm: 0 });
  }
  // Nach Karriereenden mit Nachwuchs auffüllen
  while (squad.length < SQUAD_MIN + 2) {
    const pos2 = pick(SQUAD_SHAPE)[0];
    const kid = fakePlayer(pos2, getClub(m.clubId).strength - 10, lg.id, m.season + 1);
    squad.push({ ...kid, age: randInt(17, 18), pot: clamp(kid.ovr + randInt(8, 16), 60, 90), name: `${kid.name}` });
  }
  const rec: SeasonRecord = { season: m.season, leagueId: lg.id, pos, points, target: m.target, title: title ?? undefined, topScorer: scorer && scorer.goals ? `${scorer.name} (${scorer.goals})` : undefined };
  const news = [
    title ? `${title}! Die Stadt feiert.` : reached ? `Saisonziel erreicht: Platz ${pos}.` : `Saisonziel verfehlt: Platz ${pos} statt ${m.target}.`,
    ...(move === 'up' ? [`Aufstieg in die ${getLeague(newLeague!).name}!`] : move === 'down' ? [`Abstieg in die ${getLeague(newLeague!).name}.`] : []),
    ...m.news,
  ].slice(0, 30);
  const next = seasonSetup({
    ...m, leagueOf, season: m.season + 1, squad, xi: [], budget: m.budget + prize, history: [rec, ...m.history],
    trophies: title ? [title, ...m.trophies] : m.trophies, news, board: clamp(m.board + (reached ? 10 : -15), 0, 100),
  });
  next.xi = bestXI(next.squad, next.formation);
  next.bench = bestBench(next.squad, next.xi);
  next.target = boardTarget(next);
  return { m: next, summary: { pos, points, target: m.target, reached, title, move, newLeague, prize, coins, grew: grew.sort((a, b) => (b.to - b.from) - (a.to - a.from)).slice(0, 5), retired, topScorer: scorer && scorer.goals ? { name: scorer.name, goals: scorer.goals } : null } };
}

/** Wählbare Vereine einer Liga (stärkste zuerst). */
export const clubsForLeague = (leagueId: string) => CLUBS.filter((c) => c.leagueId === leagueId).sort((a, b) => b.strength - a.strength);
export const managerLeagues = () => LEAGUES.filter((l) => MANAGER_LEAGUES.includes(l.id));

// ---------- Speichern ----------
const KEY = 'fc-manager-mode';
export function loadManager(): ManagerState | null {
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as ManagerState) : null; } catch { return null; }
}
export function saveManager(m: ManagerState | null): void {
  try { if (m) localStorage.setItem(KEY, JSON.stringify(m)); else localStorage.removeItem(KEY); } catch { /* voll oder gesperrt */ }
}
