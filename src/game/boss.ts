// ---------- Vereinsboss: den Verein als Geschäftsführer leiten ----------
// Du machst nur das Geschäft – mit Reglern und langfristigen Entscheidungen statt Einzel-Ereignissen:
// Ticketpreis, Gehaltsbudget, Transferbudget, Verkaufspolitik, Marketing, NLZ, Trainingszentrum, Stadion,
// Kredite, Sponsorverträge, Investor. Die Spiele laufen über den Manager-Motor (manager.ts), der Trainer stellt auf,
// der Sportdirektor setzt deine Budgets im Transferfenster (August, Januar) selbst um.
//
// Angelehnt an echte Strukturen (vereinfacht, eigene Spielwerte):
// - Erlöse wie im DFL-Wirtschaftsreport: Medien, Werbung/Sponsoren, Spieltag, Transfers, Merchandising.
// - Nationales TV-Geld in vier Säulen: 50 % gleich, 43 % Leistung, 4 % Nachwuchs, 3 % Interesse.
// - UEFA-Kaderkostenregel: Wer im Europapokal spielt, darf höchstens 70 % der Erlöse für den Kader ausgeben.
// - NLZ ist in der 1. und 2. Liga (Deutschland) Pflicht für die Lizenz; 50+1: Investoren höchstens 49 %.
// Die Geldbeträge pro Liga sind grobe Schätzungen fürs Spiel, keine echten Vereinszahlen.

import { CLUBS, LEAGUES, getClub, getLeague } from '../data/leagues';
import { roundMoney } from './player';
import { chance, clamp, normal, pick, randInt } from './random';
import { FIRST, LAST } from './rival';
import { sortTable } from './season';
import {
  type ManagerState, type MPlayer, type Formation, type Tactic,
  SQUAD_MAX, SQUAD_MIN, bestBench, bestXI, buildMarket, clubsIn, finishSeason, fixBench, fixXI, leagueOfClub,
  newManager, playRound, playerValueM, sellOffer, tablePos, willingness,
} from './manager';

// ---------- Ligen ----------
/** Alle spielbaren Ligen (keine Jugendligen). */
export const BOSS_LEAGUES = LEAGUES.filter((l) => !l.youth).map((l) => l.id);
export const bossLeagues = () => LEAGUES.filter((l) => !l.youth);
export const bossClubs = (leagueId: string) => CLUBS.filter((c) => c.leagueId === leagueId).sort((a, b) => b.strength - a.strength);

interface Econ { tv: number; ticket: number; brand: number }
/** Grobe Spielwerte je Liga: TV-Topf pro Saison (alle Vereine zusammen), Ø-Ticketpreis, Marken-Faktor. */
const ECON: Record<string, Econ> = {
  bl1: { tv: 1.4e9, ticket: 35, brand: 1 }, bl2: { tv: 0.225e9, ticket: 24, brand: 0.45 }, l3: { tv: 0.03e9, ticket: 15, brand: 0.18 },
  rln: { tv: 0.002e9, ticket: 9, brand: 0.06 },
  pl: { tv: 3.3e9, ticket: 55, brand: 1.6 }, ch: { tv: 0.3e9, ticket: 30, brand: 0.4 }, ll: { tv: 1.6e9, ticket: 40, brand: 1.1 },
  sa: { tv: 1.1e9, ticket: 35, brand: 0.9 }, l1: { tv: 0.6e9, ticket: 30, brand: 0.8 }, lp: { tv: 0.25e9, ticket: 20, brand: 0.45 },
  ere: { tv: 0.12e9, ticket: 25, brand: 0.45 }, spl: { tv: 0.3e9, ticket: 10, brand: 0.5 }, mls: { tv: 0.5e9, ticket: 40, brand: 0.7 },
};
export function econOf(leagueId: string): Econ {
  if (ECON[leagueId]) return ECON[leagueId];
  const lg = getLeague(leagueId);
  const ids = CLUBS.filter((c) => c.leagueId === leagueId);
  const avg = ids.reduce((a, c) => a + c.strength, 0) / Math.max(1, ids.length);
  if (lg.tier >= 5) return { tv: 0, ticket: 6, brand: 0.02 };
  return { tv: ids.length * 2e6 * Math.exp(0.1 * (avg - 65)) / lg.tier, ticket: 20 / lg.tier + 6, brand: 0.35 / lg.tier };
}
export const isGerman = (leagueId: string) => getLeague(leagueId).country === 'Deutschland';

// ---------- Typen ----------
export type SponsorSlot = 'trikot' | 'aermel' | 'stadion';
export const SLOT_NAME: Record<SponsorSlot, string> = { trikot: 'Trikot', aermel: 'Ärmel', stadion: 'Stadionname' };
export interface Sponsor { slot: SponsorSlot; name: string; perYear: number; years: number; bet?: boolean }
export interface Coach { name: string; stars: number; tactic: Tactic; formation: Formation; wage: number; years: number }
export interface Loan { left: number; rate: number; monthly: number; years?: number }
export interface Build { kind: 'seats' | 'vip'; monthsLeft: number; amount: number; seats?: number }
export type SellPolicy = 'keep' | 'normal' | 'sell';
export const SELL_NAME: Record<SellPolicy, { name: string; text: string }> = {
  keep: { name: 'Halten', text: 'Nur verkaufen, wenn das Gehaltsbudget überschritten ist.' },
  normal: { name: 'Normal', text: 'Bei mehr als 25 Spielern geht ein Ersatzspieler ohne große Aussichten.' },
  sell: { name: 'Verkaufen', text: 'Ausbildungsverein: Pro Fenster geht auch ein Stammspieler, wenn das Angebot stimmt.' },
};

export type IncomeKey = 'tv' | 'euro' | 'match' | 'sponsor' | 'merch' | 'transfer' | 'other';
export type CostKey = 'wages' | 'bonus' | 'coach' | 'buy' | 'stadium' | 'nlz' | 'train' | 'marketing' | 'admin' | 'ops' | 'interest' | 'build' | 'dividend' | 'fine' | 'other';
export const INCOME_NAME: Record<IncomeKey, string> = { tv: 'TV-Geld', euro: 'Europapokal', match: 'Spieltag', sponsor: 'Sponsoren & Werbung', merch: 'Fanartikel', transfer: 'Spielerverkäufe', other: 'Sonstiges' };
export const COST_NAME: Record<CostKey, string> = {
  wages: 'Spielergehälter', bonus: 'Siegprämien', coach: 'Trainer', buy: 'Ablösen', stadium: 'Stadionbetrieb', nlz: 'Nachwuchs (NLZ)', train: 'Trainingszentrum', marketing: 'Marketing & Fanarbeit',
  admin: 'Verwaltung', ops: 'Spielbetrieb & Staff', interest: 'Kredite & Zinsen', build: 'Bauprojekte', dividend: 'Gewinnanteil Investor', fine: 'Strafen', other: 'Sonstiges',
};
export interface Ledger { in: Partial<Record<IncomeKey, number>>; out: Partial<Record<CostKey, number>> }
const emptyLedger = (): Ledger => ({ in: {}, out: {} });
export const sumIn = (l: Ledger) => Object.values(l.in).reduce((a, b) => a + (b ?? 0), 0);
export const sumOut = (l: Ledger) => Object.values(l.out).reduce((a, b) => a + (b ?? 0), 0);

export interface BossSeason {
  season: number; leagueId: string; pos: number; target: number; revenue: number; costs: number; profit: number; cash: number;
  title?: string; move?: 'up' | 'down' | null; vote?: number; trust: number; ratio?: number;
}
export interface MonthReport {
  label: string; results: { opp: string; home: boolean; gf: number; ga: number }[]; ledger: Ledger; cashBefore: number; cashAfter: number;
  attendance?: number; notes: string[]; transfers?: string[];
}

export interface BossState {
  v: 1;
  m: ManagerState;
  cash: number;
  /** Lohnniveau des Vereins (beim Start so gesetzt, dass die Gehälter ca. 55 % der Erlöse sind). */
  wageLevel: number;
  /** Abrechnungsmonat 0 = August … 9 = Mai, 10 = Saison vorbei. */
  month: number;
  /** Ø-Ticketpreis in € */
  price: number;
  /** Gehaltsbudget als Anteil der geplanten Erlöse (0,35–0,85) */
  wageBudget: number;
  /** Transferbudget dieser Saison (€) und davon schon ausgegeben */
  transferBudget: number;
  transferSpent: number;
  sellPolicy: SellPolicy;
  /** Marketing & Fanarbeit als Anteil der geplanten Erlöse (0–0,05) */
  marketing: number;
  /** Markenstärke, wächst langfristig mit Marketing und Erfolg (0,7–2) */
  brandX: number;
  /** Fan-Stimmung 0–100 */
  fans: number;
  members: number;
  sponsors: Sponsor[];
  coach: Coach | null;
  /** NLZ-Stufe 0–5 */
  nlz: number;
  /** Trainingszentrum 0–5 */
  train: number;
  cap: number;
  vip: number;
  build: Build | null;
  loans: Loan[];
  /** Vertrauen des Aufsichtsrats 0–100 */
  trust: number;
  ledger: Ledger;
  lastLedger?: Ledger;
  /** Platz der Vorsaison (für das Leistungs-TV-Geld). */
  lastPos: number;
  europe: 'cl' | 'el' | 'conf' | null;
  /** Ablösen über 4 Jahre verteilt (für die Kaderkosten-Quote) */
  amort: { perYear: number; years: number }[];
  /** Gehaltsaufschläge pro Spieler-ID (ältere Spielstände) */
  raise: Record<string, number>;
  /** Früher: Ereigniskarten. Bleibt leer. */
  cards: unknown[];
  investor: { name: string; share: number } | null;
  /** In dieser Saison schon Anteile verkauft */
  soldShares?: boolean;
  /** Punktabzug für die laufende Saison (Lizenz) */
  penalty: number;
  report: MonthReport | null;
  history: BossSeason[];
  fired?: boolean;
  seasonOver?: boolean;
  log: string[];
  boost: number;
  /** Speicherstand-Version der Regler-Fassung */
  rv?: 2;
}

// ---------- Grundwerte ----------
const MONTHS = ['August', 'September', 'Oktober', 'November', 'Dezember', 'Januar', 'Februar', 'März', 'April', 'Mai'];
export const monthName = (b: Pick<BossState, 'month' | 'm'>) => b.month >= 10 ? 'Sommerpause' : `${MONTHS[b.month]} ${b.m.season + (b.month >= 5 ? 1 : 0)}`;
const monthStart = (season: number, month: number) => Date.UTC(season, 7 + month, 1);
export const leagueOf = (b: Pick<BossState, 'm'>) => leagueOfClub(b.m, b.m.clubId);
export const clubName = (b: Pick<BossState, 'm'>) => getClub(b.m.clubId).name;
/** Größenfaktor für feste Beträge (Profiliga ≈ 1, Amateure sehr klein). */
export const scaleOf = (b: Pick<BossState, 'm'>) => clamp(econOf(leagueOf(b)).brand, 0.02, 1.6);
const nClubs = (b: BossState) => b.m.rows.length || clubsIn(b.m, leagueOf(b)).length;
export const windowMonth = (month: number) => month === 0 || month === 5;

/** Markenwert: wie viel Sponsoren für den Verein zahlen. */
export function brandOf(b: Pick<BossState, 'm' | 'fans' | 'brandX'>): number {
  const str = getClub(b.m.clubId).strength;
  const titles = b.m.trophies.length;
  return 3e6 * Math.exp(0.12 * (str - 60)) * econOf(leagueOf(b)).brand * (0.85 + b.fans / 100 * 0.3) * (1 + Math.min(0.3, titles * 0.05)) * (b.brandX ?? 1);
}
/** Stadiongröße beim Start (Schätzung nach Stärke und Liga). */
export function startCap(clubId: string, leagueId: string): number {
  const s = getClub(clubId).strength; const t = getLeague(leagueId).tier;
  const c = t === 1 ? 28000 + (s - 70) * 2700 : t === 2 ? 15000 + (s - 66) * 1500 : t === 3 ? 8000 + (s - 62) * 900 : t === 4 ? 2500 + (s - 58) * 200 : 600 + (s - 50) * 40;
  const lo = t === 1 ? 15000 : t === 2 ? 8000 : t === 3 ? 3000 : t === 4 ? 1000 : 200;
  return Math.round(clamp(c, lo, 81000) / 100) * 100;
}
const baseWage = (ovr: number) => 60e3 * Math.exp(0.2 * (ovr - 60));
export const wageOf = (b: Pick<BossState, 'wageLevel' | 'raise'>, p: Pick<MPlayer, 'id' | 'ovr'>) => Math.round(baseWage(p.ovr) * b.wageLevel * (b.raise?.[p.id] ?? 1));
export const payrollOf = (b: Pick<BossState, 'wageLevel' | 'raise'>, squad: MPlayer[]) => squad.reduce((a, p) => a + wageOf(b, p), 0);
export const payroll = (b: BossState) => payrollOf(b, b.m.squad);

// ---------- Erlöse ----------
const perfShare = (pos: number, n: number) => (n + 1 - pos) / ((n * (n + 1)) / 2);
/** Nationales TV-Geld pro Saison: 50 % gleich, 43 % Leistung (Vorsaison), 4 % Nachwuchs, 3 % Interesse. */
export function tvMoney(b: BossState): { total: number; equal: number; perf: number; youth: number; interest: number } {
  const pot = econOf(leagueOf(b)).tv;
  const n = nClubs(b);
  const equal = (pot * 0.5) / n;
  const perf = pot * 0.43 * perfShare(clamp(b.lastPos, 1, n), n);
  const youth = ((pot * 0.04) / n) * clamp(0.5 + youthMinutesShare(b) * 6, 0.3, 2.2);
  const interest = ((pot * 0.03) / n) * clamp(0.4 + b.fans / 100 + b.members / 200000, 0.4, 2.2);
  return { total: equal + perf + youth + interest, equal, perf, youth, interest };
}
/** Anteil der Einsatzminuten von Spielern bis 23 Jahre (Nachwuchs-Säule). Vor Saisonstart: Anteil im Kader. */
export function youthMinutesShare(b: Pick<BossState, 'm'>): number {
  const tot = b.m.squad.reduce((a, p) => a + (p.mins ?? 0), 0);
  if (!tot) return b.m.squad.filter((p) => p.age <= 23).length / Math.max(1, b.m.squad.length) * 0.6;
  return b.m.squad.filter((p) => p.age <= 23).reduce((a, p) => a + (p.mins ?? 0), 0) / tot;
}
export const EURO_MONEY = { cl: 50e6, el: 18e6, conf: 8e6 } as const;
export const EURO_NAME = { cl: 'Champions League', el: 'Europa League', conf: 'Conference League' } as const;

// Tickets: bis zum Ligaschnitt reagieren die Fans wenig auf den Preis, darüber stark.
export const basePrice = (b: Pick<BossState, 'm'>) => econOf(leagueOf(b)).ticket;
export const priceRange = (b: Pick<BossState, 'm'>): [number, number] => [Math.max(3, Math.round(basePrice(b) * 0.5)), Math.round(basePrice(b) * 2.2)];
const priceFill = (r: number) => clamp(r <= 1 ? Math.pow(r, -0.5) : Math.pow(r, -1.4), 0.25, 1.45);
/** Fan-Stimmung pro Monat durch den Ticketpreis. */
export const priceFans = (b: Pick<BossState, 'm' | 'price'>) => clamp((1 - b.price / basePrice(b)) * 3, -4, 1.5);
/** Siegprämie pro Sieg: 0,6 % der Jahresgehälter. Erfolgreiche Teams kosten mehr. */
export const winBonus = (b: BossState) => payroll(b) * 0.006;
const formOf = (b: BossState) => { const g = b.m.won + b.m.drawn + b.m.lost; return g ? (b.m.won * 3 + b.m.drawn) / (g * 3) - 0.45 : 0; };
/** Nachfrage = wie viele kommen würden, wenn das Stadion unbegrenzt groß wäre. */
export function demand(b: BossState, price = b.price): number {
  const fill = clamp(0.45 + (b.fans / 100) * 0.45 + formOf(b) * 0.15, 0.25, 1.05) * priceFill(price / basePrice(b));
  return Math.round(b.cap * fill * (b.brandX ?? 1) ** 0.3);
}
export const attendance = (b: BossState, price = b.price, cap = b.cap) => Math.min(cap, Math.round(demand(b, price) * 1));
export const ticketPrice = (b: BossState) => b.price;
/** Einnahmen pro Heimspiel (Tickets + Catering + Logen). */
export const matchIncome = (b: BossState, price = b.price, cap = b.cap, vip = b.vip) => attendance(b, price, cap) * price * 1.3 * (1 + 0.15 * vip);
export const merchYear = (b: BossState) => brandOf(b) * 0.35 * (0.6 + (b.fans / 100) * 0.8);
export const adsYear = (b: BossState) => brandOf(b) * 1.5;
export const sponsorYear = (b: BossState) => b.sponsors.reduce((a, s) => a + s.perYear, 0);
export const homeGames = (b: BossState) => Math.floor((b.m.rounds.length || (nClubs(b) - 1) * 2) / 2);

/** Erwartete Erlöse einer ganzen Saison (Planung, ohne Transfers). */
export function plannedRevenue(b: BossState): number {
  const sp = b.sponsors.length ? sponsorYear(b) : brandOf(b) * 1.3;
  return tvMoney(b).total + (b.europe ? EURO_MONEY[b.europe] : 0) + matchIncome(b) * homeGames(b) + merchYear(b) + adsYear(b) + sp;
}

// ---------- Kosten ----------
export const NLZ_COST = [0, 1.5e6, 3e6, 5e6, 8e6, 12e6];
export const NLZ_NAME = ['Kein NLZ', 'Basis', 'Ausbau', 'Leistungszentrum', 'Top-Zentrum', 'Elite-Akademie'];
export const TRAIN_COST = [0, 0.8e6, 1.6e6, 2.8e6, 4.2e6, 6e6];
export const TRAIN_NAME = ['Nur Rasenplatz', 'Kraftraum', 'Trainingszentrum', 'Leistungsdiagnostik', 'Hightech-Campus', 'Weltklasse-Campus'];
const costScale = (b: Pick<BossState, 'm'>) => clamp(econOf(leagueOf(b)).brand * 1.4, 0.02, 1.6);
export const nlzYear = (b: Pick<BossState, 'm' | 'nlz'>) => NLZ_COST[b.nlz] * costScale(b);
export const trainYear = (b: Pick<BossState, 'm' | 'train'>) => TRAIN_COST[b.train] * costScale(b);
export const stadiumYear = (b: BossState) => b.cap * 120 * clamp(econOf(leagueOf(b)).brand * 1.2, 0.02, 1.5);
export const adminYear = (b: BossState) => plannedRevenue(b) * 0.08;
/** Spielbetrieb: Reisen, Ärzte, Staff, Material, Sicherheit. */
export const opsYear = (b: BossState) => plannedRevenue(b) * 0.13;
export const marketingYear = (b: BossState) => plannedRevenue(b) * b.marketing;
export const loanMonthly = (b: BossState) => b.loans.reduce((a, l) => a + Math.min(l.left, l.monthly), 0);
export const debt = (b: BossState) => b.loans.reduce((a, l) => a + l.left, 0);
/** Gehaltsbudget in € pro Saison */
export const wageCap = (b: BossState) => plannedRevenue(b) * b.wageBudget;
/** Noch freies Transferbudget dieser Saison (höchstens die Kasse). */
export const transferLeft = (b: BossState) => Math.max(0, Math.min(b.transferBudget - b.transferSpent, b.cash));

/** Kaderkosten-Quote (UEFA): Gehälter + Trainer + verteilte Ablösen im Verhältnis zu den Erlösen. */
export function squadCostRatio(b: BossState, ledger = b.ledger): number {
  const played = sumIn(ledger) > 0;
  const rev = played ? sumIn(ledger) : plannedRevenue(b);
  const cost = (played ? (ledger.out.wages ?? 0) + (ledger.out.bonus ?? 0) + (ledger.out.coach ?? 0) : payroll(b) + (b.coach?.wage ?? 0)) + b.amort.reduce((a, x) => a + x.perYear, 0) * (played ? Math.min(1, b.month / 10) : 1);
  return cost / Math.max(1, rev);
}

/** Saisonprognose mit den aktuellen Reglern (ohne Transfers, Sonderfälle). */
export function forecast(b: BossState): { ledger: Ledger; profit: number; cashEnd: number } {
  const l = emptyLedger();
  const left = b.month >= 10 ? 0 : (10 - b.month) / 10;
  const add = (k: IncomeKey | CostKey, v: number, isIn: boolean) => { if (v <= 0) return; if (isIn) l.in[k as IncomeKey] = v; else l.out[k as CostKey] = v; };
  add('tv', tvMoney(b).total, true);
  if (b.europe) add('euro', EURO_MONEY[b.europe], true);
  add('match', matchIncome(b) * homeGames(b), true);
  add('sponsor', sponsorYear(b) + adsYear(b), true);
  add('merch', merchYear(b), true);
  add('wages', payroll(b), false);
  add('bonus', winBonus(b) * homeGames(b) * 2 * clamp(0.6 - (b.lastPos - 1) / Math.max(1, nClubs(b) - 1) * 0.4, 0.2, 0.6), false);
  add('coach', b.coach?.wage ?? 0, false);
  add('stadium', stadiumYear(b) + homeGames(b) * attendance(b) * clamp(econOf(leagueOf(b)).brand * 2, 0.2, 2), false);
  add('nlz', nlzYear(b), false);
  add('train', trainYear(b), false);
  add('marketing', marketingYear(b), false);
  add('admin', adminYear(b), false);
  add('ops', opsYear(b), false);
  add('interest', Math.min(debt(b), loanMonthly(b) * 10), false);
  const profit = sumIn(l) - sumOut(l);
  return { ledger: l, profit, cashEnd: b.cash + profit * left };
}

// ---------- Trainer ----------
export function coachCandidates(b: BossState): Coach[] {
  const rev = plannedRevenue(b);
  const t: [Tactic, Formation][] = [['offensiv', '4-3-3'], ['ausgewogen', '4-2-3-1'], ['defensiv', '4-4-2']];
  // Fester Zufall pro Saison, damit die Kandidaten beim Neuladen gleich bleiben
  let h = 0; for (const ch of `${b.m.clubId}-${b.m.season}-${b.month}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return [2, 3, 4].map((stars, i) => {
    const s = clamp(stars + ((h >>> i) % 4 === 0 ? 1 : 0), 1, 5);
    const name = `${FIRST[(h >>> (i * 3)) % FIRST.length]} ${LAST[(h >>> (i * 5 + 1)) % LAST.length]}`;
    return { name, stars: s, tactic: t[i][0], formation: t[i][1], wage: roundMoney(rev * 0.006 * s), years: 2 };
  });
}
/** Stärke-Effekt von Trainer und Trainingszentrum auf die Spiele. */
export const coachBoost = (c: Coach | null) => (c ? (c.stars - 3) * 0.8 : -2);
export const teamBoost = (b: Pick<BossState, 'coach' | 'train'>) => coachBoost(b.coach) + (b.train ?? 0) * 0.25;
export const severance = (c: Coach) => roundMoney(c.wage * 0.75);
export function hireCoach(prev: BossState, c: Coach, years: number): BossState {
  const b = clone(prev);
  b.coach = { ...c, years: clamp(Math.round(years), 1, 4) };
  b.m = { ...b.m, tactic: c.tactic, formation: c.formation, xi: bestXI(b.m.squad, c.formation) };
  b.m.bench = bestBench(b.m.squad, b.m.xi);
  b.log = [`${c.name} ist neuer Trainer (${b.coach.years} ${b.coach.years === 1 ? 'Jahr' : 'Jahre'}).`, ...b.log].slice(0, 40);
  return b;
}
export function fireCoach(prev: BossState): BossState {
  if (!prev.coach) return prev;
  const b = clone(prev);
  book(b, 'coach', severance(prev.coach), false);
  b.log = [`${prev.coach.name} ist entlassen (Abfindung ${money(severance(prev.coach))}).`, ...b.log].slice(0, 40);
  b.coach = null;
  b.trust = clamp(b.trust - 3, 0, 100);
  return b;
}

// ---------- Sponsoren ----------
const SPONSOR_NAMES = ['Nordwerk Energie', 'Bergmann Bau', 'Lumen Telekom', 'Falkenhaus Versicherung', 'Rheinstahl', 'Vito Getränke', 'Kronbank', 'Aerion Airlines', 'Helix Pharma', 'Sonnfeld Solar', 'Tauber Logistik', 'Mondi Motoren'];
const BET_NAMES = ['Tippwelt24', 'QuoteMax', 'WettStern'];
const SLOT_SHARE: Record<SponsorSlot, number> = { trikot: 1, aermel: 0.3, stadion: 0.4 };
/** Angebot für einen freien Platz: lange Verträge sind sicher, aber etwas günstiger pro Jahr. */
export function sponsorOffer(b: BossState, slot: SponsorSlot, years: number, bet: boolean): Sponsor {
  let h = 0; for (const ch of `${slot}-${b.m.season}-${b.m.clubId}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const per = brandOf(b) * SLOT_SHARE[slot] * (1 - 0.04 * (years - 1)) * (bet ? 1.3 : 1);
  return { slot, name: bet ? BET_NAMES[h % BET_NAMES.length] : SPONSOR_NAMES[h % SPONSOR_NAMES.length], perYear: roundMoney(per), years, bet };
}
export function signSponsor(prev: BossState, slot: SponsorSlot, years: number, bet: boolean): BossState {
  if (prev.sponsors.some((s) => s.slot === slot)) return prev;
  const b = clone(prev);
  const o = sponsorOffer(b, slot, clamp(Math.round(years), 1, 5), bet);
  b.sponsors.push(o);
  if (bet) b.fans = clamp(b.fans - 4, 0, 100);
  if (slot === 'stadion') b.fans = clamp(b.fans - 6, 0, 100);
  b.log = [`${o.name}: ${SLOT_NAME[slot]}-Sponsor für ${o.years} ${o.years === 1 ? 'Jahr' : 'Jahre'}, ${money(o.perYear)} pro Jahr.`, ...b.log].slice(0, 40);
  return b;
}

// ---------- Start ----------
export function newBoss(clubId: string): BossState {
  const m = newManager(clubId);
  const lg = getClub(clubId).leagueId;
  const tier = getLeague(lg).tier;
  const ids = clubsIn(m, lg);
  const str = getClub(clubId).strength;
  const rank = 1 + ids.filter((id) => getClub(id).strength > str).length;
  const L = getLeague(lg);
  const b: BossState = {
    v: 1, rv: 2, m, cash: 0, wageLevel: 1, month: 0, price: econOf(lg).ticket, wageBudget: 0.55, transferBudget: 0, transferSpent: 0, sellPolicy: 'normal',
    marketing: 0.01, brandX: 1, fans: 60, members: Math.round(clamp(2000 * Math.exp(0.11 * (str - 58)) * econOf(lg).brand * 2, 150, 400000)),
    sponsors: [], coach: null, nlz: tier === 1 ? 3 : tier === 2 ? 2 : tier === 3 ? 1 : 0, train: tier <= 2 ? 2 : tier <= 4 ? 1 : 0,
    cap: startCap(clubId, lg), vip: tier <= 2 ? 1 : 0, build: null, loans: [], trust: 60, ledger: emptyLedger(), lastPos: rank,
    europe: L.tier === 1 && rank <= L.europe.cl ? 'cl' : L.tier === 1 && rank <= L.europe.cl + L.europe.el ? 'el' : null,
    amort: [], raise: {}, cards: [], investor: null, penalty: 0, report: null, history: [], log: [], boost: 0,
  };
  // Gehälter auf ca. 55 % der geplanten Erlöse eichen, Startkapital ca. 12 %.
  const rev = plannedRevenue(b);
  const base = m.squad.reduce((a, p) => a + baseWage(p.ovr), 0);
  b.wageLevel = (rev * 0.55) / Math.max(1, base);
  // Startbudget mit etwas Luft, damit niemand sofort verkauft werden muss
  b.wageBudget = 0.62;
  b.cash = rev >= 1e6 ? roundMoney(rev * 0.12) : Math.max(5000, Math.round((rev * 0.15) / 1000) * 1000);
  b.log = [`Du übernimmst die Geschäfte bei ${getClub(clubId).name}.`];
  return b;
}

/** Ältere Spielstände (mit Ereigniskarten) auf die Regler-Fassung bringen. */
export function migrateBoss(b: BossState): BossState {
  if (b.rv === 2) return b;
  const old = b as BossState & { ticket?: 'low' | 'mid' | 'high' | 'top'; investor?: unknown };
  const f = { low: 0.75, mid: 1, high: 1.3, top: 1.6 }[old.ticket ?? 'mid'];
  const n: BossState = {
    ...b, rv: 2, price: Math.round(econOf(leagueOf(b)).ticket * f), wageBudget: 0.62, transferBudget: 0, transferSpent: 0, sellPolicy: 'normal',
    marketing: 0.01, brandX: 1, train: 1, cards: [], raise: b.raise ?? {},
    sponsors: (b.sponsors ?? []).map((s) => ({ slot: s.slot, name: s.name, perYear: s.perYear, years: s.years, bet: (s as { kind?: string }).kind === 'wette' })),
  };
  delete (n as { ticket?: unknown }).ticket;
  return n;
}

// ---------- Aufgaben (statt Ereigniskarten) ----------
export interface Task { id: string; text: string; must: boolean; tab: 'budget' | 'projects' | 'finance' }
/** Offene Aufgaben: nur der Trainer ist Pflicht, der Rest sind Hinweise. */
export function tasks(b: BossState): Task[] {
  const out: Task[] = [];
  if (!b.coach) out.push({ id: 'coach', text: 'Trainer verpflichten', must: true, tab: 'projects' });
  for (const slot of ['trikot', 'aermel'] as SponsorSlot[]) if (!b.sponsors.some((s) => s.slot === slot)) out.push({ id: `sp-${slot}`, text: `${SLOT_NAME[slot]}-Sponsor fehlt – Vertrag abschließen`, must: false, tab: 'finance' });
  const tier = getLeague(leagueOf(b)).tier;
  if (isGerman(leagueOf(b)) && tier <= 2 && b.nlz === 0) out.push({ id: 'nlz', text: 'Lizenz: NLZ fehlt – sonst 6 Punkte Abzug', must: false, tab: 'projects' });
  if (b.cash < 0) out.push({ id: 'cash', text: 'Konto im Minus – Kosten senken oder Kredit aufnehmen', must: false, tab: 'finance' });
  if (payroll(b) > wageCap(b) * 1.02) out.push({ id: 'wages', text: `Gehälter über Budget – der Sportdirektor verkauft im ${b.month < 5 ? 'August' : 'Januar'}`, must: false, tab: 'budget' });
  return out;
}

// ---------- Regler ----------
const clone = (b: BossState): BossState => JSON.parse(JSON.stringify(b));
export function setPrice(b: BossState, price: number): BossState { const [lo, hi] = priceRange(b); return { ...b, price: clamp(Math.round(price), lo, hi) }; }
export function setWageBudget(b: BossState, v: number): BossState { return { ...b, wageBudget: clamp(Math.round(v * 100) / 100, 0.35, 0.85) }; }
export function setTransferBudget(b: BossState, v: number): BossState { return { ...b, transferBudget: Math.max(b.transferSpent, Math.round(v)) }; }
export function setMarketing(b: BossState, v: number): BossState { return { ...b, marketing: clamp(Math.round(v * 1000) / 1000, 0, 0.05) }; }
export function setSellPolicy(b: BossState, p: SellPolicy): BossState { return { ...b, sellPolicy: p }; }

const book = (b: BossState, k: IncomeKey | CostKey, v: number, isIn: boolean) => {
  if (!v) return;
  if (isIn) b.ledger.in[k as IncomeKey] = (b.ledger.in[k as IncomeKey] ?? 0) + v;
  else b.ledger.out[k as CostKey] = (b.ledger.out[k as CostKey] ?? 0) + v;
  b.cash += isIn ? v : -v;
};

// ---------- Projekte ----------
export const upgradeCost = (b: BossState, kind: 'nlz' | 'train') => {
  const lvl = kind === 'nlz' ? b.nlz : b.train;
  if (lvl >= 5) return 0;
  return roundMoney((kind === 'nlz' ? nlzYear({ m: b.m, nlz: lvl + 1 }) : trainYear({ m: b.m, train: lvl + 1 })) * 1.5);
};
export const nlzUpgradeCost = (b: BossState) => upgradeCost(b, 'nlz');
export function upgrade(prev: BossState, kind: 'nlz' | 'train'): BossState {
  const cost = upgradeCost(prev, kind);
  const lvl = kind === 'nlz' ? prev.nlz : prev.train;
  if (lvl >= 5 || cost > prev.cash) return prev;
  const b = clone(prev);
  book(b, 'build', cost, false);
  if (kind === 'nlz') b.nlz++; else b.train++;
  b.log = [kind === 'nlz' ? `NLZ ausgebaut: ${NLZ_NAME[b.nlz]}.` : `Trainingszentrum ausgebaut: ${TRAIN_NAME[b.train]}.`, ...b.log].slice(0, 40);
  return b;
}
export const upgradeNlz = (b: BossState) => upgrade(b, 'nlz');
export function downgrade(prev: BossState, kind: 'nlz' | 'train'): BossState {
  if ((kind === 'nlz' ? prev.nlz : prev.train) <= 0) return prev;
  return kind === 'nlz' ? { ...prev, nlz: prev.nlz - 1 } : { ...prev, train: prev.train - 1 };
}
export const downgradeNlz = (b: BossState) => downgrade(b, 'nlz');

export const SEAT_MIN = 2000;
export const SEAT_MAX = 20000;
const buildScale = (b: Pick<BossState, 'm'>) => clamp(econOf(leagueOf(b)).brand + 0.4, 0.4, 1.6);
export const seatCost = (b: BossState, seats = 5000) => roundMoney(seats * 3000 * buildScale(b));
export const seatMonths = (seats: number) => clamp(Math.round(3 + seats / 2500), 4, 11);
export const vipCost = (b: BossState) => roundMoney(b.cap * 400 * buildScale(b));
/** Mehreinnahmen pro Saison durch ein Bauprojekt (bei heutigem Preis und heutiger Nachfrage). */
export function buildGain(b: BossState, kind: 'seats' | 'vip', seats = 5000): number {
  const now = matchIncome(b);
  const after = kind === 'seats' ? matchIncome(b, b.price, b.cap + seats) : matchIncome(b, b.price, b.cap, b.vip + 1);
  const ops = kind === 'seats' ? Math.max(0, attendance(b, b.price, b.cap + seats) - attendance(b)) * clamp(econOf(leagueOf(b)).brand * 2, 0.2, 2) + seats * 120 * clamp(econOf(leagueOf(b)).brand * 1.2, 0.02, 1.5) / homeGames(b) : 0;
  return (after - now - ops) * homeGames(b);
}
export function startBuild(prev: BossState, kind: Build['kind'], seats = 5000): BossState {
  if (prev.build) return prev;
  if (kind === 'vip' && prev.vip >= 3) return prev;
  const s = clamp(Math.round(seats / 1000) * 1000, SEAT_MIN, SEAT_MAX);
  const cost = kind === 'seats' ? seatCost(prev, s) : vipCost(prev);
  if (cost > prev.cash) return prev;
  const b = clone(prev);
  book(b, 'build', cost, false);
  b.build = { kind, monthsLeft: kind === 'seats' ? seatMonths(s) : 3, amount: cost, seats: kind === 'seats' ? s : undefined };
  b.log = [kind === 'seats' ? `Ausbau gestartet: +${s.toLocaleString('de-DE')} Plätze.` : 'Neue VIP-Logen werden gebaut.', ...b.log].slice(0, 40);
  return b;
}

// ---------- Finanzierung ----------
/** Zins: Grundzins + Laufzeit + Aufschlag bei hoher Verschuldung. */
export const loanRate = (b: BossState, amount: number, years: number) => {
  const ratio = (debt(b) + amount) / Math.max(1, plannedRevenue(b));
  return Math.round((0.035 + 0.004 * years + Math.max(0, ratio - 0.3) * 0.1) * 1000) / 1000;
};
export const loanMax = (b: BossState) => Math.max(0, roundMoney(plannedRevenue(b) * 0.5 - debt(b)));
export function loanTerms(b: BossState, amount: number, years: number): { rate: number; total: number; monthly: number } {
  const rate = loanRate(b, amount, years);
  const total = amount * (1 + rate * years);
  return { rate, total, monthly: total / (years * 10) };
}
export function takeLoan(prev: BossState, amount: number, years = 3): BossState {
  const a = Math.min(Math.max(0, amount), loanMax(prev));
  if (a <= 0) return prev;
  const b = clone(prev);
  const t = loanTerms(b, a, years);
  b.loans.push({ left: t.total, rate: t.rate, monthly: t.monthly, years });
  b.cash += a;
  b.log = [`Kredit über ${money(a)} aufgenommen (${years} Jahre, ${(t.rate * 100).toLocaleString('de-DE')} % Zinsen).`, ...b.log].slice(0, 40);
  return b;
}
/** Alle Kredite vorzeitig zurückzahlen: Restschuld ohne die noch nicht angefallenen Zinsen. */
export function payoffAmount(b: BossState): number {
  // Raten zahlen Tilgung und Zins gleichmäßig ab: Der Tilgungsanteil der Restschuld ist left / (1 + Zins × Jahre).
  return b.loans.reduce((a, l) => a + l.left / (1 + l.rate * (l.years ?? 3)), 0);
}
export function repayLoans(prev: BossState): BossState {
  const amount = roundMoney(payoffAmount(prev));
  if (!prev.loans.length || amount > prev.cash) return prev;
  const b = clone(prev);
  book(b, 'interest', amount, false);
  b.loans = [];
  b.log = [`Alle Kredite zurückgezahlt (${money(amount)}).`, ...b.log].slice(0, 40);
  return b;
}
export const maxShare = (b: Pick<BossState, 'm'>) => (isGerman(leagueOf(b)) ? 49 : 75);
/** Bewertung pro Prozent: 1,6-fache Jahreserlöse für 100 %. */
export const sharePrice = (b: BossState, pct: number) => roundMoney(plannedRevenue(b) * 1.6 * (pct / 100));
export function sellShares(prev: BossState, pct: number): BossState {
  const have = prev.investor?.share ?? 0;
  const p = clamp(Math.round(pct / 5) * 5, 0, maxShare(prev) - have);
  if (p <= 0 || prev.soldShares) return prev;
  const b = clone(prev);
  const amount = sharePrice(b, p);
  book(b, 'other', amount, true);
  b.investor = { name: 'Investor', share: have + p };
  b.soldShares = true;
  b.fans = clamp(b.fans - Math.round(p * (isGerman(leagueOf(b)) ? 0.3 : 0.15)), 0, 100);
  b.log = [`${p} % an einen Investor verkauft: ${money(amount)}.`, ...b.log].slice(0, 40);
  return b;
}

// ---------- Sportdirektor: Transfers nach Budget ----------
/** Ablösen passen sich der Liga an: In kleinen Ligen sind Spieler viel billiger. */
export const transferFactor = (b: Pick<BossState, 'm'>) => clamp(econOf(leagueOf(b)).brand, 0.02, 1.4);
export const priceOf = (b: Pick<BossState, 'm'>, p: { price: number }) => roundMoney(p.price * transferFactor(b));
function directorWindow(b: BossState): string[] {
  const out: string[] = [];
  const cap = wageCap(b);
  const xiIds = () => new Set(b.m.xi);
  const sell = (p: MPlayer, why: string) => {
    const o = sellOffer(b.m, p);
    const amount = roundMoney(o.amount * (p.own ? 1.15 : 1) * transferFactor(b));
    b.m.squad = b.m.squad.filter((x) => x.id !== p.id);
    book(b, 'transfer', amount, true);
    b.m.xi = fixXI(b.m); b.m.bench = fixBench(b.m);
    out.push(`Verkauft: ${p.name} (${p.pos}, ${p.ovr}) für ${money(amount)} an ${getClub(o.clubId).name}${why}.`);
  };
  // 1) Zu hohe Gehälter: teuerste Ersatzspieler zuerst abgeben
  let guard = 0;
  while (payroll(b) > cap && b.m.squad.length > SQUAD_MIN + 2 && guard++ < 3) {
    const xi = xiIds();
    const cand = [...b.m.squad].filter((p) => !xi.has(p.id)).sort((x, y) => wageOf(b, y) - wageOf(b, x))[0]
      ?? [...b.m.squad].sort((x, y) => wageOf(b, y) - wageOf(b, x))[0];
    if (!cand) break;
    sell(cand, ' (Gehaltsbudget)');
  }
  // 2) Verkaufspolitik
  //    Normal: nur bei zu großem Kader den Ersatzspieler mit den wenigsten Aussichten abgeben.
  //    Verkaufen: den wertvollsten Spieler abgeben (Ausbildungsverein), wenn genug Spieler da sind.
  if (b.sellPolicy === 'normal' && b.m.squad.length > 25) {
    const xi = xiIds();
    const p = b.m.squad.filter((x) => !xi.has(x.id) && !x.own).sort((x, y) => (x.pot - x.ovr) - (y.pot - y.ovr) || y.age - x.age)[0];
    if (p) sell(p, ' (Kader zu groß)');
  } else if (b.sellPolicy === 'sell' && b.m.squad.length > SQUAD_MIN + 4) {
    const p = [...b.m.squad].sort((x, y) => playerValueM(y) - playerValueM(x))[0];
    if (p) sell(p, ' (Verkaufspolitik)');
  }
  // 3) Einkäufe im Rahmen von Transfer- und Gehaltsbudget
  for (let i = 0; i < 3; i++) {
    const money0 = transferLeft(b);
    if (money0 <= 0 || b.m.squad.length >= SQUAD_MAX) break;
    const xi = xiIds();
    const weakAt = (pos: string) => Math.min(99, ...b.m.squad.filter((x) => x.pos === pos && xi.has(x.id)).map((x) => x.ovr));
    const pay = payroll(b);
    const cands = b.m.market
      .filter((p) => priceOf(b, p) <= money0 && p.ovr > weakAt(p.pos) && pay + wageOf(b, p) <= cap)
      .map((p) => ({ p, score: (p.ovr - weakAt(p.pos)) / Math.sqrt(priceOf(b, p) + wageOf(b, p) * 2 + 1) }))
      .sort((x, y) => y.score - x.score);
    const pickOne = cands.find((c) => Math.random() * 100 <= willingness(b.m, c.p));
    if (!pickOne) break;
    const p = pickOne.p;
    const { clubId, price: _list, ...rest } = p;
    const price = priceOf(b, p);
    b.m.squad = [...b.m.squad, { ...rest, goals: 0, apps: 0, joined: b.m.season }];
    b.m.market = b.m.market.filter((x) => x.id !== p.id);
    book(b, 'buy', price, false);
    b.transferSpent += price;
    b.amort.push({ perYear: price / 4, years: 4 });
    b.m.xi = bestXI(b.m.squad, b.m.formation); b.m.bench = bestBench(b.m.squad, b.m.xi);
    out.push(`Gekauft: ${p.name} (${p.pos}, ${p.ovr}) für ${money(price)} von ${getClub(clubId).name}, ${money(wageOf(b, p))} Gehalt/Jahr.`);
  }
  return out;
}

// ---------- Monat spielen ----------
export const canPlay = (b: BossState) => !b.fired && !b.seasonOver && !!b.coach;

export function playMonth(prev: BossState): BossState {
  if (!canPlay(prev)) return prev;
  const b = clone(prev);
  const before = b.cash;
  const keep = b.ledger;
  b.ledger = emptyLedger();
  const end = monthStart(b.m.season, b.month + 1);
  const results: MonthReport['results'] = [];
  const notes: string[] = [];
  let transfers: string[] = [];
  let homes = 0;
  // Lizenz: NLZ-Pflicht prüfen, Punktabzug eintragen
  if (b.month === 0) {
    const tier = getLeague(leagueOf(b)).tier;
    if (isGerman(leagueOf(b)) && tier <= 2 && b.nlz === 0) { b.penalty += 6; notes.push('Kein NLZ: Die Lizenz gibt es nur mit 6 Punkten Abzug.'); }
    if (b.penalty) { const r = b.m.rows.find((x) => x.clubId === b.m.clubId); if (r) r.points -= b.penalty; notes.push(`${b.penalty} Punkte Abzug (Lizenz).`); b.penalty = 0; }
  }
  // Transferfenster: Sportdirektor setzt die Budgets um
  if (windowMonth(b.month)) transfers = directorWindow(b);
  // Trainer stellt auf
  b.m = { ...b.m, mood: teamBoost(b) + b.boost * 0.8, hype: 0, tactic: b.coach!.tactic, formation: b.coach!.formation };
  b.m.xi = bestXI(b.m.squad, b.m.formation);
  b.m.bench = bestBench(b.m.squad, b.m.xi);
  while (!b.m.done && b.m.cal && b.m.round < b.m.rounds.length && b.m.cal.start + b.m.cal.roundDays[b.m.round] * 86_400_000 < end) {
    b.m.cal = { ...b.m.cal, day: b.m.cal.roundDays[b.m.round] };
    b.m = playRound(b.m);
    const mine = b.m.last?.mine;
    if (mine) {
      const home = mine.home === b.m.clubId;
      if (home) homes++;
      results.push({ opp: home ? mine.away : mine.home, home, gf: home ? mine.hg : mine.ag, ga: home ? mine.ag : mine.hg });
    }
  }
  if (b.m.cal) b.m.cal = { ...b.m.cal, day: Math.min(b.m.cal.len - 1, Math.round((end - b.m.cal.start) / 86_400_000)) };
  // Erlöse
  book(b, 'tv', tvMoney(b).total / 10, true);
  if (b.europe) book(b, 'euro', EURO_MONEY[b.europe] / 10, true);
  const att = attendance(b);
  book(b, 'match', matchIncome(b) * homes, true);
  book(b, 'sponsor', (sponsorYear(b) + adsYear(b)) / 10, true);
  book(b, 'merch', merchYear(b) / 10, true);
  // Kosten
  book(b, 'wages', payroll(b) / 10, false);
  book(b, 'bonus', winBonus(b) * results.filter((r) => r.gf > r.ga).length, false);
  book(b, 'coach', (b.coach?.wage ?? 0) / 10, false);
  book(b, 'stadium', stadiumYear(b) / 10 + homes * att * clamp(econOf(leagueOf(b)).brand * 2, 0.2, 2), false);
  book(b, 'nlz', nlzYear(b) / 10, false);
  book(b, 'train', trainYear(b) / 10, false);
  book(b, 'marketing', marketingYear(b) / 10, false);
  book(b, 'admin', adminYear(b) / 10, false);
  book(b, 'ops', opsYear(b) / 10, false);
  for (const l of b.loans) { const pay = Math.min(l.left, l.monthly); l.left -= pay; book(b, 'interest', pay, false); }
  b.loans = b.loans.filter((l) => l.left > 1);
  if (b.cash < 0) { book(b, 'interest', (-b.cash * 0.12) / 12, false); b.trust = clamp(b.trust - 4, 0, 100); notes.push('Konto überzogen: 12 % Zinsen, der Aufsichtsrat ist nervös.'); }
  // Bauprojekte
  if (b.build) {
    b.build.monthsLeft--;
    if (b.build.monthsLeft <= 0) {
      if (b.build.kind === 'seats') { b.cap += b.build.seats ?? 5000; notes.push(`Ausbau fertig: jetzt ${b.cap.toLocaleString('de-DE')} Plätze.`); }
      else { b.vip++; notes.push(`Neue VIP-Logen eröffnet (Stufe ${b.vip}).`); }
      b.build = null;
    }
  }
  // Fans, Mitglieder, Marke: Ergebnisse, Preis, Marketing
  const pts = results.reduce((a, r) => a + (r.gf > r.ga ? 3 : r.gf === r.ga ? 1 : 0), 0);
  const exp = results.length * 1.4;
  b.fans = clamp(Math.round(b.fans + (pts - exp) * 1.2 + priceFans(b) + b.marketing * 40), 0, 100);
  b.members = Math.round(b.members * (1 + (b.fans - 55) / 4000 + b.marketing * 0.2));
  b.brandX = clamp(b.brandX * (1 + (b.marketing * 3 - 0.02) / 10), 0.7, 2);
  // Monat abschließen
  const monthLedger = b.ledger;
  b.ledger = keep;
  for (const [k, v] of Object.entries(monthLedger.in)) keep.in[k as IncomeKey] = (keep.in[k as IncomeKey] ?? 0) + (v ?? 0);
  for (const [k, v] of Object.entries(monthLedger.out)) keep.out[k as CostKey] = (keep.out[k as CostKey] ?? 0) + (v ?? 0);
  const label = monthName(b);
  b.boost = 0;
  b.month++;
  b.report = { label, results, ledger: monthLedger, cashBefore: before, cashAfter: b.cash, attendance: homes ? att : undefined, notes, transfers };
  if (transfers.length) b.log = [...transfers.slice().reverse(), ...b.log].slice(0, 40);
  if (b.m.done || b.month >= 10) { b.month = 10; b.seasonOver = true; }
  else if (b.month === 5) b.m.market = buildMarket(b.m);
  return b;
}

/** Mehrere Monate am Stück (bis zur Winterpause oder zum Saisonende). Sammelt den Bericht. */
export function playUntil(prev: BossState, until: 'winter' | 'end'): BossState {
  let b = prev;
  const stop = until === 'winter' ? 5 : 10;
  const results: MonthReport['results'] = []; const notes: string[] = []; const transfers: string[] = [];
  const ledger = emptyLedger();
  const before = prev.cash;
  const first = monthName(prev);
  let att: number | undefined;
  let guard = 0;
  while (canPlay(b) && b.month < stop && guard++ < 12) {
    b = playMonth(b);
    const r = b.report!;
    results.push(...r.results); notes.push(...r.notes); transfers.push(...(r.transfers ?? []));
    if (r.attendance !== undefined) att = r.attendance;
    for (const [k, v] of Object.entries(r.ledger.in)) ledger.in[k as IncomeKey] = (ledger.in[k as IncomeKey] ?? 0) + (v ?? 0);
    for (const [k, v] of Object.entries(r.ledger.out)) ledger.out[k as CostKey] = (ledger.out[k as CostKey] ?? 0) + (v ?? 0);
  }
  if (b === prev) return prev;
  return { ...b, report: { label: `${first} – ${b.report!.label}`, results, ledger, cashBefore: before, cashAfter: b.cash, attendance: att, notes, transfers } };
}

// ---------- Saisonende ----------
export interface SeasonEnd {
  pos: number; target: number; reached: boolean; title: string | null; move: 'up' | 'down' | null; newLeague: string | null;
  revenue: number; costs: number; profit: number; ledger: Ledger; vote: number | null; trustDelta: number; trust: number; fired: boolean;
  ratio: number; uefaFine: number; dividend: number; talents: string[]; grew: number; europe: BossState['europe']; license: string | null;
  sponsorsEnded: string[];
}

export function closeSeason(prev: BossState): { b: BossState; end: SeasonEnd } {
  const b = clone(prev);
  const lg = getLeague(leagueOf(b));
  const table = sortTable(b.m.rows);
  const pos = table.findIndex((r) => r.clubId === b.m.clubId) + 1;
  const reached = pos <= b.m.target;
  // UEFA-Kaderkostenregel (nur mit Europapokal)
  const ratio = squadCostRatio(b);
  let uefaFine = 0;
  if (b.europe && ratio > 0.7) { uefaFine = roundMoney(sumIn(b.ledger) * (ratio - 0.7) * 0.25); book(b, 'fine', uefaFine, false); }
  // Investor bekommt seinen Anteil am Gewinn
  const pre = sumIn(b.ledger) - sumOut(b.ledger);
  const dividend = b.investor && pre > 0 ? roundMoney(pre * (b.investor.share / 100)) : 0;
  book(b, 'dividend', dividend, false);
  const revenue = sumIn(b.ledger); const costs = sumOut(b.ledger); const profit = revenue - costs;
  const { m, summary } = finishSeason(b.m, BOSS_LEAGUES);
  // Trainingszentrum: bessere Entwicklung
  let grew = 0;
  m.squad = m.squad.map((p) => {
    if (p.age <= 24 && p.ovr < p.pot && chance(b.train * 0.12)) { grew++; return { ...p, ovr: p.ovr + 1 }; }
    if (p.age >= 30 && chance(b.train * 0.1)) { grew++; return { ...p, ovr: p.ovr + 1, pot: Math.max(p.pot, p.ovr + 1) }; }
    return p;
  });
  const europe: BossState['europe'] = lg.tier === 1 && summary.move === null
    ? (pos <= lg.europe.cl ? 'cl' : pos <= lg.europe.cl + lg.europe.el ? 'el' : pos <= lg.europe.cl + lg.europe.el + lg.europe.conf ? 'conf' : null) : null;
  let vote: number | null = null;
  if (isGerman(lg.id)) vote = Math.round(clamp(45 + (b.fans - 50) * 0.6 + (reached ? 12 : -10) + (profit > 0 ? 8 : -8) + (summary.title ? 15 : 0) + (summary.move === 'up' ? 12 : summary.move === 'down' ? -20 : 0) - (b.investor ? 6 : 0), 5, 97));
  let d = (reached ? 10 : -12) + (profit > 0 ? 6 : -8) + (b.cash < 0 ? -10 : 0) + (summary.title ? 10 : 0) + (summary.move === 'up' ? 15 : summary.move === 'down' ? -25 : 0) + (europe ? 5 : 0);
  if (vote !== null && vote < 50) d -= 15;
  if (b.investor && d < 0) d = Math.round(d * 1.5);
  const trust = clamp(b.trust + d, 0, 100);
  const fired = trust <= 10;
  let license: string | null = null;
  let penalty = 0;
  const newLg = getLeague(leagueOfClub(m, m.clubId));
  if (isGerman(newLg.id) && newLg.tier <= 3 && b.cash < -plannedRevenue(b) * 0.1) { penalty = 9; license = 'Lizenz nur mit Auflage: Das Konto ist tief im Minus. 9 Punkte Abzug in der neuen Saison.'; }
  const talents: string[] = [];
  const nTal = b.nlz === 0 ? 0 : 1 + (b.nlz >= 3 ? 1 : 0) + (b.nlz >= 5 ? 1 : 0);
  const str = getClub(b.m.clubId).strength;
  for (let i = 0; i < nTal && m.squad.length < SQUAD_MAX; i++) {
    const pos2 = pick(['TW', 'IV', 'AV', 'ZDM', 'ZM', 'ZOM', 'FL', 'ST'] as const);
    const ovr = clamp(Math.round(str - 15 + b.nlz * 1.5 + normal(0, 3)), 45, 80);
    const pot = clamp(ovr + 8 + b.nlz * 2 + randInt(0, 8), ovr + 3, 92);
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    m.squad.push({ id: `nlz-${m.season}-${i}-${Math.random().toString(36).slice(2, 6)}`, name, nation: isGerman(newLg.id) ? 'Deutschland' : pick(['Deutschland', 'Spanien', 'Frankreich', 'England']), pos: pos2, age: 17, ovr, pot, goals: 0, apps: 0, own: true, joined: m.season });
    talents.push(`${name} (${pos2}, Stärke ${ovr}, Potenzial ${pot})`);
  }
  const sponsorsEnded = b.sponsors.filter((s) => s.years <= 1).map((s) => `${SLOT_NAME[s.slot]} (${s.name})`);
  const sponsors = b.sponsors.map((s) => ({ ...s, years: s.years - 1 })).filter((s) => s.years > 0);
  const amort = b.amort.map((a) => ({ ...a, years: a.years - 1 })).filter((a) => a.years > 0);
  // Trainervertrag: läuft er aus, verlängert er automatisch um 1 Jahr (kündbar per Entlassung)
  const coach = b.coach ? { ...b.coach, years: b.coach.years > 1 ? b.coach.years - 1 : 1 } : null;
  const rec: BossSeason = { season: b.m.season, leagueId: lg.id, pos, target: b.m.target, revenue, costs, profit, cash: b.cash, title: summary.title ?? undefined, move: summary.move, vote: vote ?? undefined, trust, ratio };
  const next: BossState = {
    ...b, m, month: 0, seasonOver: false, report: null, lastLedger: b.ledger, ledger: emptyLedger(), lastPos: summary.move === 'up' ? m.rows.length : summary.move === 'down' ? 1 : pos,
    europe, sponsors, amort, trust, fired, penalty: b.penalty + penalty, history: [rec, ...b.history], coach, transferSpent: 0, soldShares: false,
    // Abstiegsklausel: Gehälter sinken auf 60 %; nach einem Aufstieg steigen sie (Aufstiegsprämien, neue Verträge).
    wageLevel: b.wageLevel * (summary.move === 'down' ? 0.6 : summary.move === 'up' ? 1.35 : 1),
    brandX: clamp(b.brandX * (summary.title ? 1.06 : summary.move === 'up' ? 1.04 : summary.move === 'down' ? 0.9 : 1), 0.7, 2),
    log: [summary.title ? `${summary.title}!` : `Saison beendet auf Platz ${pos}.`, ...b.log].slice(0, 40),
  };
  // Preis an die neue Liga anpassen (Auf-/Abstieg)
  const [lo, hi] = priceRange(next);
  next.price = clamp(Math.round(next.price * (econOf(newLg.id).ticket / econOf(lg.id).ticket)), lo, hi);
  next.m.xi = bestXI(next.m.squad, next.m.formation); next.m.bench = bestBench(next.m.squad, next.m.xi);
  return { b: next, end: { pos, target: b.m.target, reached, title: summary.title, move: summary.move, newLeague: summary.newLeague, revenue, costs, profit, ledger: b.ledger, vote, trustDelta: d, trust, fired, ratio, uefaFine, dividend, talents, grew, europe, license, sponsorsEnded } };
}

// ---------- Hilfen ----------
export const money = (v: number) => {
  const a = Math.abs(v); const s = v < 0 ? '−' : '';
  if (a >= 1e9) return `${s}${(a / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Mrd. €`;
  if (a >= 1e6) return `${s}${(a / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio. €`;
  if (a >= 1e3) return `${s}${Math.round(a / 1e3).toLocaleString('de-DE')} Tsd. €`;
  return `${s}${Math.round(a)} €`;
};
export const position = (b: BossState) => tablePos(b.m);
export const valueOfSquad = (b: BossState) => b.m.squad.reduce((a, p) => a + playerValueM(p), 0);

// ---------- Speichern ----------
const KEY = 'fc-boss-v1';
export function loadBoss(): BossState | null {
  try { const raw = localStorage.getItem(KEY); return raw ? migrateBoss(JSON.parse(raw) as BossState) : null; } catch { return null; }
}
export function saveBoss(b: BossState | null): void {
  try { if (b) localStorage.setItem(KEY, JSON.stringify(b)); else localStorage.removeItem(KEY); } catch { /* voll oder gesperrt */ }
}
