import { CLUBS, getClub, getLeague } from '../data/leagues';
import type { ClubState } from './club';
import { casinoOf } from './casino';
import type { Career, Position } from './types';

// Sportwetten im Neon-Casino: Spieltage aus den großen Ligen des Spiels (Quoten aus der Teamstärke),
// Einzel- und Kombiwetten mit Kombi-Boost, Live-Konferenz mit Cash-out – und Wetten auf die eigene Karriere.

type Rand = () => number;
export const BET_LEAGUES = ['bl1', 'pl', 'll', 'sa', 'l1', 'bl2', 'ere', 'lp'];
/** Buchmacher-Marge: Quoten zahlen ca. 93,5 % des fairen Werts. */
export const MARGIN = 1.07;
export const MAX_LEGS = 10;
export const MAX_PAYOUT = 2_000_000;
/** Kombi-Boost: ab der 3. Auswahl +8 % pro Auswahl, höchstens +50 %. */
export const comboBoost = (legs: number) => (legs >= 3 ? Math.min(0.5, (legs - 2) * 0.08) : 0);

export type Market = '1' | 'X' | '2' | 'o25' | 'u25' | 'bttsY' | 'bttsN';
export const MARKET_LABEL: Record<Market, string> = { '1': 'Heim', X: 'Remis', '2': 'Gast', o25: 'Über 2,5', u25: 'Unter 2,5', bttsY: 'Beide treffen', bttsN: 'Nicht beide' };
export const MARKETS: Market[] = ['1', 'X', '2', 'o25', 'u25', 'bttsY', 'bttsN'];

export interface Fixture { id: string; home: string; away: string; league: string; lh: number; la: number; odds: Record<Market, number> }
export interface Leg { fixture: string; market: Market; odds: number }

// ---------- Zufall mit Startwert (Spieltage sind für eine Runde fest) ----------
export function seeded(seed: number): Rand {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}
const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));
export const poissonP = (l: number, k: number) => (Math.exp(-l) * l ** k) / factorial(k);
function poissonDraw(l: number, rand: Rand): number {
  const L = Math.exp(-l);
  let k = 0; let p = 1;
  do { k++; p *= rand(); } while (p > L && k < 12);
  return k - 1;
}

/** Torerwartung aus der Stärke beider Teams (mit Heimvorteil). */
export function lambdas(home: string, away: string): [number, number] {
  const h = getClub(home); const a = getClub(away);
  const g = getLeague(h.leagueId).goalsPerGame ?? 2.8;
  const d = h.strength - a.strength + 2;
  return [Math.max(0.2, (g / 2) * Math.exp(d / 16)), Math.max(0.2, (g / 2) * Math.exp(-d / 16))];
}

/** Wahrscheinlichkeit eines Marktes, wenn es gerade h:a steht und noch lh/la Tore erwartet werden. */
export function marketProb(m: Market, lh: number, la: number, h = 0, a = 0): number {
  let p = 0;
  for (let x = 0; x <= 10; x++) for (let y = 0; y <= 10; y++) {
    const q = poissonP(lh, x) * poissonP(la, y);
    if (hits(m, h + x, a + y)) p += q;
  }
  return Math.min(1, p);
}
export function hits(m: Market, h: number, a: number): boolean {
  switch (m) {
    case '1': return h > a;
    case 'X': return h === a;
    case '2': return h < a;
    case 'o25': return h + a >= 3;
    case 'u25': return h + a <= 2;
    case 'bttsY': return h > 0 && a > 0;
    case 'bttsN': return h === 0 || a === 0;
  }
}
export const oddsFor = (p: number) => Math.max(1.02, Math.min(40, Math.floor((1 / (p * MARGIN)) * 100) / 100));

/** Spieltag n: 10 Spiele aus den großen Ligen (für alle gleich, aus der Rundennummer). */
export function fixturesFor(round: number): Fixture[] {
  const rand = seeded(round * 7919 + 13);
  const out: Fixture[] = [];
  const leagues = [...BET_LEAGUES].sort(() => rand() - 0.5).slice(0, 5);
  for (const lid of leagues) {
    const clubs = CLUBS.filter((c) => c.leagueId === lid && !/ II$|U\d\d/.test(c.name)).sort(() => rand() - 0.5);
    for (let i = 0; i + 1 < clubs.length && out.filter((f) => f.league === lid).length < 2; i += 2) {
      const [home, away] = [clubs[i].id, clubs[i + 1].id];
      const [lh, la] = lambdas(home, away);
      const odds = Object.fromEntries(MARKETS.map((m) => [m, oddsFor(marketProb(m, lh, la))])) as Record<Market, number>;
      out.push({ id: `${round}-${out.length}`, home, away, league: lid, lh, la, odds });
    }
  }
  return out;
}

/** Gesamtquote eines Wettscheins (inkl. Kombi-Boost). */
export function slipOdds(legs: Leg[]): number {
  if (!legs.length) return 0;
  const raw = legs.reduce((a, l) => a * l.odds, 1);
  return Math.floor(raw * (1 + comboBoost(legs.length)) * 100) / 100;
}
export const slipPayout = (legs: Leg[], stake: number) => Math.min(MAX_PAYOUT, Math.floor(stake * slipOdds(legs)));

// ---------- Live-Konferenz ----------
export interface Goal { minute: number; home: boolean }
export interface LiveMatch { fixture: string; goals: Goal[] }
/** Alle Spiele eines Spieltags durchspielen (Tore mit Minuten). */
export function simulateRound(fixtures: Fixture[], rand: Rand = Math.random): LiveMatch[] {
  return fixtures.map((f) => {
    const goals: Goal[] = [
      ...Array.from({ length: poissonDraw(f.lh, rand) }, () => ({ minute: 1 + Math.floor(rand() * 93), home: true })),
      ...Array.from({ length: poissonDraw(f.la, rand) }, () => ({ minute: 1 + Math.floor(rand() * 93), home: false })),
    ].sort((a, b) => a.minute - b.minute);
    return { fixture: f.id, goals };
  });
}
export const scoreAt = (m: LiveMatch, minute: number): [number, number] =>
  [m.goals.filter((g) => g.home && g.minute <= minute).length, m.goals.filter((g) => !g.home && g.minute <= minute).length];

/** Stand eines Tipps: gewonnen, verloren oder offen (manche Märkte stehen schon vor Abpfiff fest). */
export function legState(leg: Leg, m: LiveMatch, minute: number): 'won' | 'lost' | 'open' {
  const [h, a] = scoreAt(m, minute);
  const done = minute >= 93;
  if (done) return hits(leg.market, h, a) ? 'won' : 'lost';
  if (leg.market === 'o25' && h + a >= 3) return 'won';
  if (leg.market === 'u25' && h + a >= 3) return 'lost';
  if (leg.market === 'bttsY' && h > 0 && a > 0) return 'won';
  if (leg.market === 'bttsN' && h > 0 && a > 0) return 'lost';
  return 'open';
}

/** Cash-out jetzt: fairer Restwert minus 10 %. 0 = nicht möglich (ein Tipp ist schon verloren). */
export function cashOutValue(legs: Leg[], stake: number, fixtures: Fixture[], live: LiveMatch[], minute: number): number {
  let p = 1;
  for (const leg of legs) {
    const f = fixtures.find((x) => x.id === leg.fixture)!;
    const m = live.find((x) => x.fixture === leg.fixture)!;
    const st = legState(leg, m, minute);
    if (st === 'lost') return 0;
    if (st === 'won') continue;
    const rest = Math.max(0, (93 - minute) / 93);
    const [h, a] = scoreAt(m, minute);
    p *= marketProb(leg.market, f.lh * rest, f.la * rest, h, a);
  }
  return Math.min(MAX_PAYOUT, Math.floor(slipPayout(legs, stake) * p * 0.9));
}

export interface SlipRecord { round: number; legs: Leg[]; stake: number; odds: number; win: number; cashed?: number }
export interface BetState { round: number; history: SlipRecord[]; career: CareerBet[] }
export const betsOf = (club: Pick<ClubState, 'casino'>): BetState => casinoOf(club).bets ?? { round: 1, history: [], career: [] };
const withBets = (club: ClubState, f: (b: BetState) => BetState): ClubState => ({ ...club, casino: { ...casinoOf(club), bets: f(betsOf(club)) } });
/** Spieltag abgeschlossen: Schein ins Archiv, nächster Spieltag. */
export const finishRound = (club: ClubState, rec: SlipRecord | null): ClubState =>
  withBets(club, (b) => ({ ...b, round: b.round + 1, history: rec ? [rec, ...b.history].slice(0, 20) : b.history }));

// ---------- Karriere-Wetten ----------
export type CareerMarket = 'goals' | 'assists' | 'rating' | 'clean' | 'title';
export interface CareerBet { id: string; careerId: string; name: string; year: number; histLen: number; market: CareerMarket; line: number; odds: number; stake: number; label: string }
export interface CareerOffer { market: CareerMarket; line: number; odds: number; label: string }
const GOALS: Partial<Record<Position, number>> = { ST: 12, FL: 8, ZOM: 7, ZM: 4, ZDM: 2, AV: 2, IV: 2, TW: 0 };
const ASSISTS: Partial<Record<Position, number>> = { ST: 5, FL: 7, ZOM: 8, ZM: 5, ZDM: 3, AV: 4, IV: 1, TW: 0 };
const CLEAN: Partial<Record<Position, number>> = { TW: 10, IV: 8, AV: 7 };
const poissonAtLeast = (e: number, n: number) => { let p = 0; for (let k = 0; k < n; k++) p += poissonP(e, k); return Math.max(0.001, 1 - p); };
const normCdf = (z: number) => 1 / (1 + Math.exp(-1.702 * z));

/** Wetten auf die laufende Saison – nur vor dem ersten Spiel (Phase „Saisonstart“). */
export function careerOffers(c: Career): CareerOffer[] {
  if (c.phase !== 'season' || !c.player) return [];
  const p = c.player;
  const last = c.history[c.history.length - 1];
  const k = (p.ovr / 75) ** 1.5;
  const out: CareerOffer[] = [];
  const counted = (market: 'goals' | 'assists' | 'clean', base: number, word: string) => {
    const e = Math.max(0.8, last ? last[market === 'clean' ? 'cleanSheets' : market] * 0.65 + base * k * 0.35 : base * k);
    const lines = [...new Set([Math.max(1, Math.round(e * 0.7)), Math.max(1, Math.round(e)), Math.round(e * 1.35) + 1])];
    for (const n of lines) out.push({ market, line: n, odds: oddsFor(poissonAtLeast(e, n)), label: `${n}+ ${word}` });
  };
  if ((GOALS[p.position] ?? 0) > 0) counted('goals', GOALS[p.position]!, 'Saisontore');
  if ((ASSISTS[p.position] ?? 0) > 0) counted('assists', ASSISTS[p.position]!, 'Vorlagen');
  if (CLEAN[p.position]) counted('clean', CLEAN[p.position]!, 'Spiele zu null');
  const mean = last?.avgRating ?? 6.7;
  out.push({ market: 'rating', line: 7, odds: oddsFor(1 - normCdf((7 - mean) / 0.35)), label: 'Notenschnitt 7,0 oder besser' });
  const titles = c.history.filter((r) => r.trophies.length > 0).length;
  out.push({ market: 'title', line: 1, odds: oddsFor((titles + 0.5) / (c.history.length + 2)), label: 'Mindestens einen Titel holen' });
  return out;
}
export function placeCareerBet(club: ClubState, c: Career, offer: CareerOffer, stake: number): ClubState | null {
  const b = betsOf(club);
  if (b.career.some((x) => x.careerId === c.id && x.year === c.year && x.market === offer.market && x.line === offer.line)) return null;
  const bet: CareerBet = { id: `${c.id}-${c.year}-${offer.market}-${offer.line}`, careerId: c.id, name: c.player.name, year: c.year, histLen: c.history.length, ...offer, stake };
  return withBets(club, (x) => ({ ...x, career: [...x.career, bet] }));
}
/** Karriere-Wetten auswerten, sobald die Saison in der Historie steht. Gelöschte Karriere = Einsatz zurück. */
export function resolveCareerBets(club: ClubState, careers: Career[]): { club: ClubState; results: { bet: CareerBet; win: number }[] } {
  const b = betsOf(club);
  const results: { bet: CareerBet; win: number }[] = [];
  const open: CareerBet[] = [];
  for (const bet of b.career) {
    const c = careers.find((x) => x.id === bet.careerId);
    if (!c) { results.push({ bet, win: bet.stake }); continue; }
    const r = c.history[bet.histLen];
    if (!r) { open.push(bet); continue; }
    const ok = bet.market === 'goals' ? r.goals >= bet.line : bet.market === 'assists' ? r.assists >= bet.line : bet.market === 'clean' ? (r.cleanSheets ?? 0) >= bet.line
      : bet.market === 'rating' ? (r.avgRating ?? 0) >= bet.line : r.trophies.length >= 1;
    results.push({ bet, win: ok ? Math.min(MAX_PAYOUT, Math.floor(bet.stake * bet.odds)) : 0 });
  }
  if (!results.length) return { club, results };
  const won = results.reduce((a, x) => a + x.win, 0);
  const cs = casinoOf(club);
  return { club: { ...club, casino: { ...cs, chips: cs.chips + won, bets: { ...betsOf(club), career: open } } }, results };
}
