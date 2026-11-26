// ---------- Vereinsboss: den Verein als Geschäftsführer leiten ----------
// Du machst nur das Geschäft: Geld, Tickets, Sponsoren, Trainer, Transfers freigeben, NLZ, Stadion, Kredite, Fans.
// Die Spiele laufen automatisch über den Manager-Motor (manager.ts); der Trainer stellt auf.
//
// Angelehnt an echte Strukturen (vereinfacht, eigene Spielwerte):
// - Erlöse wie im DFL-Wirtschaftsreport: Medien, Werbung/Sponsoren, Spieltag, Transfers, Merchandising.
// - Nationales TV-Geld in vier Säulen: 50 % gleich, 43 % Leistung, 4 % Nachwuchs, 3 % Interesse (laut Bericht zur DFL-Verteilung).
// - UEFA-Kaderkostenregel: Wer im Europapokal spielt, darf höchstens 70 % der Erlöse für den Kader ausgeben.
// - NLZ ist in der 1. und 2. Liga (Deutschland) Pflicht für die Lizenz; 50+1: Investoren höchstens 49 %.
// Die Geldbeträge pro Liga sind grobe Schätzungen fürs Spiel, keine echten Vereinszahlen.

import { CLUBS, LEAGUES, getClub, getLeague } from '../data/leagues';
import { roundMoney } from './player';
import { chance, clamp, normal, pick, randInt } from './random';
import { FIRST, LAST } from './rival';
import { sortTable } from './season';
import {
  type ManagerState, type MPlayer, type MarketPlayer, type Formation, type Tactic,
  SQUAD_MAX, SQUAD_MIN, bestBench, bestXI, buildMarket, calDate, clubsIn, finishSeason, fixBench, fixXI, leagueOfClub,
  newManager, playRound, playerValueM, sellOffer, tablePos, teamRating, willingness,
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
export type TicketLevel = 'low' | 'mid' | 'high' | 'top';
export const TICKETS: Record<TicketLevel, { name: string; price: number; fill: number; fans: number }> = {
  low: { name: 'Günstig', price: 0.75, fill: 1.12, fans: 1 },
  mid: { name: 'Normal', price: 1, fill: 1, fans: 0 },
  high: { name: 'Teuer', price: 1.3, fill: 0.88, fans: -1 },
  top: { name: 'Premium', price: 1.6, fill: 0.72, fans: -2 },
};
export type SponsorSlot = 'trikot' | 'aermel' | 'stadion';
export const SLOT_NAME: Record<SponsorSlot, string> = { trikot: 'Trikot', aermel: 'Ärmel', stadion: 'Stadionname' };
export interface Sponsor { slot: SponsorSlot; name: string; perYear: number; years: number; bonus: number; kind: 'normal' | 'wette' | 'lang' }
export interface Coach { name: string; stars: number; tactic: Tactic; formation: Formation; wage: number; years: number }
export interface Loan { left: number; rate: number; monthly: number }
export interface Build { kind: 'seats' | 'vip'; monthsLeft: number; amount: number }

export type IncomeKey = 'tv' | 'euro' | 'match' | 'sponsor' | 'merch' | 'transfer' | 'other';
export type CostKey = 'wages' | 'coach' | 'buy' | 'stadium' | 'nlz' | 'admin' | 'ops' | 'interest' | 'build' | 'fine' | 'other';
export const INCOME_NAME: Record<IncomeKey, string> = { tv: 'TV-Geld', euro: 'Europapokal', match: 'Spieltag', sponsor: 'Sponsoren & Werbung', merch: 'Fanartikel', transfer: 'Spielerverkäufe', other: 'Sonstiges' };
export const COST_NAME: Record<CostKey, string> = { wages: 'Spielergehälter', coach: 'Trainer', buy: 'Ablösen', stadium: 'Stadionbetrieb', nlz: 'Nachwuchs (NLZ)', admin: 'Verwaltung', ops: 'Spielbetrieb & Staff', interest: 'Zinsen', build: 'Bauprojekte', fine: 'Strafen', other: 'Sonstiges' };
export interface Ledger { in: Partial<Record<IncomeKey, number>>; out: Partial<Record<CostKey, number>> }
const emptyLedger = (): Ledger => ({ in: {}, out: {} });
export const sumIn = (l: Ledger) => Object.values(l.in).reduce((a, b) => a + (b ?? 0), 0);
export const sumOut = (l: Ledger) => Object.values(l.out).reduce((a, b) => a + (b ?? 0), 0);

export interface CardOption { label: string; sub?: string; act: string }
export interface Card { id: string; kind: 'sponsor' | 'coach' | 'buy' | 'bid' | 'event' | 'investor' | 'license'; title: string; text: string; options: CardOption[]; ref?: string; data?: Record<string, unknown> }

export interface BossSeason {
  season: number; leagueId: string; pos: number; target: number; revenue: number; costs: number; profit: number; cash: number;
  title?: string; move?: 'up' | 'down' | null; vote?: number; trust: number; ratio?: number;
}
export interface MonthReport {
  label: string; results: { opp: string; home: boolean; gf: number; ga: number }[]; ledger: Ledger; cashBefore: number; cashAfter: number;
  attendance?: number; notes: string[];
}

export interface BossState {
  v: 1;
  m: ManagerState;
  cash: number;
  /** Lohnniveau des Vereins (wird beim Start so gesetzt, dass die Gehälter ca. die Hälfte der Erlöse sind). */
  wageLevel: number;
  /** Abrechnungsmonat 0 = August … 9 = Mai, 10 = Saison vorbei. */
  month: number;
  ticket: TicketLevel;
  /** Fan-Stimmung 0–100 */
  fans: number;
  members: number;
  sponsors: Sponsor[];
  coach: Coach | null;
  /** NLZ-Stufe 0–5 */
  nlz: number;
  cap: number;
  vip: number;
  build: Build | null;
  loans: Loan[];
  /** Vertrauen des Aufsichtsrats 0–100 */
  trust: number;
  /** Laufende Saison und Vorsaison */
  ledger: Ledger;
  lastLedger?: Ledger;
  /** Platz der Vorsaison (für das Leistungs-TV-Geld). */
  lastPos: number;
  /** Europapokal in dieser Saison */
  europe: 'cl' | 'el' | 'conf' | null;
  /** Ablösen über 4 Jahre verteilt (für die Kaderkosten-Quote) */
  amort: { perYear: number; years: number }[];
  /** Gehaltsaufschläge pro Spieler-ID */
  raise: Record<string, number>;
  cards: Card[];
  investor: { name: string; share: number } | null;
  /** Punktabzug für die laufende Saison (Lizenz) */
  penalty: number;
  report: MonthReport | null;
  history: BossSeason[];
  fired?: boolean;
  /** Saisonbilanz wartet auf Abschluss */
  seasonOver?: boolean;
  log: string[];
  /** Effekt für die Spiele des laufenden Monats (−2 … +2) */
  boost: number;
  /** Aktionstag in diesem Monat */
  cheap?: boolean;
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

/** Markenwert: wie viel Sponsoren für den Verein zahlen. */
export function brandOf(b: Pick<BossState, 'm' | 'fans'>): number {
  const str = getClub(b.m.clubId).strength;
  const titles = b.m.trophies.length;
  return 3e6 * Math.exp(0.12 * (str - 60)) * econOf(leagueOf(b)).brand * (0.85 + b.fans / 100 * 0.3) * (1 + Math.min(0.3, titles * 0.05));
}
/** Stadiongröße beim Start (Schätzung nach Stärke und Liga). */
export function startCap(clubId: string, leagueId: string): number {
  const s = getClub(clubId).strength; const t = getLeague(leagueId).tier;
  const c = t === 1 ? 28000 + (s - 70) * 2700 : t === 2 ? 15000 + (s - 66) * 1500 : t === 3 ? 8000 + (s - 62) * 900 : t === 4 ? 2500 + (s - 58) * 200 : 600 + (s - 50) * 40;
  const lo = t === 1 ? 15000 : t === 2 ? 8000 : t === 3 ? 3000 : t === 4 ? 1000 : 200;
  return Math.round(clamp(c, lo, 81000) / 100) * 100;
}
const baseWage = (ovr: number) => 60e3 * Math.exp(0.2 * (ovr - 60));
export const wageOf = (b: Pick<BossState, 'wageLevel' | 'raise'>, p: Pick<MPlayer, 'id' | 'ovr'>) => Math.round(baseWage(p.ovr) * b.wageLevel * (b.raise[p.id] ?? 1));
export const payroll = (b: BossState) => b.m.squad.reduce((a, p) => a + wageOf(b, p), 0);

// ---------- Erlöse ----------
/** Gewicht für die Leistungssäule: Platz 1 bekommt am meisten. */
const perfShare = (pos: number, n: number) => (n + 1 - pos) / ((n * (n + 1)) / 2);
/** Nationales TV-Geld pro Saison: 50 % gleich, 43 % Leistung (Vorsaison), 4 % Nachwuchs, 3 % Interesse. */
export function tvMoney(b: BossState): { total: number; equal: number; perf: number; youth: number; interest: number } {
  const pot = econOf(leagueOf(b)).tv;
  const n = nClubs(b);
  const equal = (pot * 0.5) / n;
  const perf = pot * 0.43 * perfShare(clamp(b.lastPos, 1, n), n);
  const yShare = youthMinutesShare(b);
  const youth = ((pot * 0.04) / n) * clamp(0.5 + yShare * 6, 0.3, 2.2);
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

/** Zuschauerschnitt bei aktuellem Preis. */
export function attendance(b: BossState): number {
  const form = b.m.won + b.m.drawn + b.m.lost ? (b.m.won * 3 + b.m.drawn) / ((b.m.won + b.m.drawn + b.m.lost) * 3) - 0.45 : 0;
  const fill = clamp(0.45 + (b.fans / 100) * 0.45 + form * 0.15, 0.25, 1) * TICKETS[b.ticket].fill;
  return Math.round(b.cap * Math.min(1, fill));
}
export const ticketPrice = (b: BossState) => Math.round(econOf(leagueOf(b)).ticket * TICKETS[b.ticket].price);
/** Einnahmen pro Heimspiel (Tickets + Catering + Logen). */
export const matchIncome = (b: BossState) => attendance(b) * ticketPrice(b) * 1.3 * (1 + 0.15 * b.vip);
export const merchYear = (b: BossState) => brandOf(b) * 0.35 * (0.6 + (b.fans / 100) * 0.8);
/** Bandenwerbung, Partner, Logenkunden – automatisch, wächst mit der Marke. */
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
/** NLZ-Kosten pro Saison: in kleinen Ligen deutlich günstiger. */
export const nlzYear = (b: BossState) => NLZ_COST[b.nlz] * clamp(econOf(leagueOf(b)).brand * 1.4, 0.02, 1.6);
export const stadiumYear = (b: BossState) => b.cap * 120 * clamp(econOf(leagueOf(b)).brand * 1.2, 0.02, 1.5);
export const adminYear = (b: BossState) => plannedRevenue(b) * 0.08;
/** Spielbetrieb: Reisen, Ärzte, Staff, Material, Sicherheit. */
export const opsYear = (b: BossState) => plannedRevenue(b) * 0.13;
export const loanMonthly = (b: BossState) => b.loans.reduce((a, l) => a + l.monthly, 0);
export const debt = (b: BossState) => b.loans.reduce((a, l) => a + l.left, 0);

/** Kaderkosten-Quote (UEFA): Gehälter + Trainer + verteilte Ablösen im Verhältnis zu den Erlösen. */
export function squadCostRatio(b: BossState, ledger = b.ledger): number {
  const rev = sumIn(ledger) || plannedRevenue(b);
  const cost = (ledger.out.wages ?? payroll(b)) + (ledger.out.coach ?? b.coach?.wage ?? 0) + b.amort.reduce((a, x) => a + x.perYear, 0);
  return cost / Math.max(1, rev);
}

// ---------- Trainer ----------
export function coachCandidates(b: BossState): Coach[] {
  const rev = plannedRevenue(b);
  const t: [Tactic, Formation][] = [['offensiv', '4-3-3'], ['ausgewogen', '4-2-3-1'], ['defensiv', '4-4-2']];
  return [2, 3, 4].map((stars, i) => {
    const s = clamp(stars + (chance(0.25) ? 1 : 0), 1, 5);
    return { name: `${pick(FIRST)} ${pick(LAST)}`, stars: s, tactic: t[i][0], formation: t[i][1], wage: roundMoney(rev * 0.006 * s), years: 2 };
  });
}
/** Stärke-Effekt des Trainers auf die Spiele. */
export const coachBoost = (c: Coach | null) => (c ? (c.stars - 3) * 0.8 : -2);
export const severance = (c: Coach) => roundMoney(c.wage * 0.75);

export function coachCard(b: BossState, title = 'Trainer verpflichten'): Card {
  const list = coachCandidates(b);
  return {
    id: 'coach', kind: 'coach', title, text: 'Bessere Trainer holen mehr aus der Mannschaft – kosten aber mehr Gehalt.',
    options: list.map((c, i) => ({ label: `${c.name} · ${'★'.repeat(c.stars)}`, sub: `${c.tactic === 'offensiv' ? 'Offensiv' : c.tactic === 'defensiv' ? 'Defensiv' : 'Ausgewogen'} (${c.formation}) · ${money(c.wage)}/Jahr`, act: `coach:${i}` })),
    data: { list },
  };
}

// ---------- Start ----------
export function newBoss(clubId: string): BossState {
  const m = newManager(clubId);
  const lg = getClub(clubId).leagueId;
  const tier = getLeague(lg).tier;
  const ids = clubsIn(m, lg);
  const str = getClub(clubId).strength;
  const rank = 1 + ids.filter((id) => getClub(id).strength > str).length;
  const b: BossState = {
    v: 1, m, cash: 0, wageLevel: 1, month: 0, ticket: 'mid', fans: 60, members: Math.round(clamp(2000 * Math.exp(0.11 * (str - 58)) * econOf(lg).brand * 2, 150, 400000)),
    sponsors: [], coach: null, nlz: tier === 1 ? 3 : tier === 2 ? 2 : tier === 3 ? 1 : 0,
    cap: startCap(clubId, lg), vip: tier <= 2 ? 1 : 0, build: null, loans: [], trust: 60, ledger: emptyLedger(), lastPos: rank,
    europe: getLeague(lg).tier === 1 && rank <= getLeague(lg).europe.cl ? 'cl' : getLeague(lg).tier === 1 && rank <= getLeague(lg).europe.cl + getLeague(lg).europe.el ? 'el' : null,
    amort: [], raise: {}, cards: [], investor: null, penalty: 0, report: null, history: [], log: [], boost: 0,
  };
  // Gehälter auf ca. 55 % der geplanten Erlöse eichen, Startkapital ca. 12 %.
  const rev = plannedRevenue(b);
  const base = m.squad.reduce((a, p) => a + baseWage(p.ovr), 0);
  b.wageLevel = (rev * 0.55) / Math.max(1, base);
  b.cash = rev >= 1e6 ? roundMoney(rev * 0.12) : Math.max(5000, Math.round((rev * 0.15) / 1000) * 1000);
  b.log = [`Du übernimmst die Geschäfte bei ${getClub(clubId).name}.`];
  b.cards = monthCards(b);
  return b;
}

// ---------- Karten (Vorstandssitzung) ----------
const SPONSOR_NAMES = ['Nordwerk Energie', 'Bergmann Bau', 'Lumen Telekom', 'Falkenhaus Versicherung', 'Rheinstahl', 'Vito Getränke', 'Kronbank', 'Aerion Airlines', 'Helix Pharma', 'Sonnfeld Solar', 'Tauber Logistik', 'Mondi Motoren'];
const BET_NAMES = ['Tippwelt24', 'QuoteMax', 'WettStern'];

function sponsorCard(b: BossState, slot: SponsorSlot): Card {
  const base = slot === 'trikot' ? brandOf(b) : slot === 'aermel' ? brandOf(b) * 0.3 : brandOf(b) * 0.4;
  const offers: Sponsor[] = [
    { slot, name: pick(SPONSOR_NAMES), perYear: roundMoney(base * (0.9 + Math.random() * 0.15)), years: 2, bonus: 0.15, kind: 'normal' },
    { slot, name: pick(SPONSOR_NAMES.filter((x) => x)), perYear: roundMoney(base * 0.92), years: 4, bonus: 0.1, kind: 'lang' },
    { slot, name: pick(BET_NAMES), perYear: roundMoney(base * 1.3), years: 2, bonus: 0, kind: 'wette' },
  ];
  return {
    id: `sp-${slot}`, kind: 'sponsor', title: `${SLOT_NAME[slot]}-Sponsor gesucht`,
    text: slot === 'stadion' ? 'Eine Firma will dem Stadion ihren Namen geben. Viel Geld – aber viele Fans hängen am alten Namen.' : 'Drei Firmen wollen auf dein Trikot. Wähle einen Partner.',
    options: [
      ...offers.map((o, i) => ({
        label: `${o.name} · ${money(o.perYear)}/Jahr`,
        sub: o.kind === 'wette' ? 'Wettanbieter: am meisten Geld, Fans finden es nicht gut' : o.kind === 'lang' ? `${o.years} Jahre fest, +${Math.round(o.bonus * 100)} % Bonus bei Saisonziel` : `${o.years} Jahre, +${Math.round(o.bonus * 100)} % Bonus bei Saisonziel`,
        act: `sponsor:${i}`,
      })),
      ...(slot === 'stadion' ? [{ label: 'Alten Namen behalten', sub: 'Fans freuen sich', act: 'skip' }] : []),
    ],
    data: { offers },
  };
}

function buyCard(b: BossState, p: MarketPlayer): Card {
  const xi = new Set(b.m.xi);
  const samePos = b.m.squad.filter((x) => x.pos === p.pos && xi.has(x.id));
  const best = samePos.length ? Math.min(...samePos.map((x) => x.ovr)) : 0;
  const w = wageOf(b, { id: p.id, ovr: p.ovr });
  return {
    id: `buy-${p.id}`, kind: 'buy', ref: p.id, title: `Sportdirektor: ${p.name} holen?`,
    text: `${p.pos}, ${p.age} J., Stärke ${p.ovr}${best ? ` (dein schwächster Stammspieler dort: ${best})` : ''}. Ablöse ${money(p.price)}, Gehalt ${money(w)}/Jahr. Wechselbereitschaft ${willingness(b.m, p)} %.`,
    options: [{ label: `Freigeben · ${money(p.price)}`, sub: `+${money(w)} Gehalt pro Jahr`, act: 'buy' }, { label: 'Ablehnen', act: 'skip' }],
  };
}

function bidCard(b: BossState, p: MPlayer): Card {
  const o = sellOffer(b.m, p);
  const amount = roundMoney(o.amount * (p.own ? 1.15 : 1) * (0.9 + Math.random() * 0.3));
  return {
    id: `bid-${p.id}`, kind: 'bid', ref: p.id, title: `Angebot für ${p.name}`,
    text: `${getClub(o.clubId).name} bietet ${money(amount)} für ${p.name} (${p.pos}, Stärke ${p.ovr}${p.own ? ', Eigengewächs' : ''}). Spart ${money(wageOf(b, p))} Gehalt pro Jahr.`,
    options: [{ label: `Verkaufen · ${money(amount)}`, act: 'sell' }, { label: 'Behalten', act: 'skip' }],
    data: { amount, clubId: o.clubId },
  };
}

interface EventDef { id: string; when?: (b: BossState) => boolean; make: (b: BossState) => Omit<Card, 'kind' | 'id'> }
const EVENTS: EventDef[] = [
  { id: 'tour', when: (b) => b.month === 0, make: (b) => ({ title: 'Asien-Reise in der Vorbereitung?', text: 'Ein Vermarkter bietet eine Testspiel-Reise an. Gutes Geld, aber die Spieler kommen müde zurück.', options: [{ label: `Annehmen · +${money(brandOf(b) * 0.08)}`, sub: 'Team im August etwas schwächer', act: 'tour' }, { label: 'Zuhause trainieren', act: 'skip' }] }) },
  { id: 'roof', make: (b) => ({ title: 'Dach der Haupttribüne undicht', text: 'Der Stadionwart schlägt Alarm. Reparieren kostet, warten ärgert die Fans.', options: [{ label: `Reparieren · ${money(b.cap * 60 * scaleOf(b))}`, act: 'roof' }, { label: 'Nächstes Jahr', sub: 'Fans −5', act: 'roof-no' }] }) },
  { id: 'cheap', make: () => ({ title: 'Fans wollen einen Aktionstag', text: 'Die Fanszene fordert ein Heimspiel mit 10-€-Tickets für alle.', options: [{ label: 'Machen wir', sub: 'Spieltag-Einnahmen −40 % in diesem Monat, Fans +7', act: 'cheap' }, { label: 'Ablehnen', sub: 'Fans −3', act: 'cheap-no' }] }) },
  { id: 'raise', when: (b) => b.m.squad.length > 0, make: (b) => {
    const p = [...b.m.squad].sort((x, y) => y.ovr - x.ovr)[randInt(0, 2)];
    return { title: `${p.name} will mehr Gehalt`, text: `Sein Berater fordert 30 % mehr (${money(wageOf(b, p) * 0.3)} pro Jahr extra). Sonst gibt es Unruhe in der Kabine.`, options: [{ label: 'Gehalt erhöhen', act: `raise:${p.id}` }, { label: 'Ablehnen', sub: 'Team in diesem Monat schwächer', act: 'raise-no' }] };
  } },
  { id: 'social', make: (b) => ({ title: 'Sozialprojekt im Stadtteil', text: 'Der Verein könnte Fußballplätze für Schulen bauen.', options: [{ label: `Unterstützen · ${money(brandOf(b) * 0.02)}`, sub: 'Fans +5, mehr Mitglieder', act: 'social' }, { label: 'Kein Budget', act: 'skip' }] }) },
  { id: 'crypto', make: (b) => ({ title: 'Krypto-Firma will Bandenwerbung', text: 'Viel Geld, aber die Firma hat einen schlechten Ruf.', options: [{ label: `Annehmen · +${money(brandOf(b) * 0.15)}`, sub: 'Fans −6', act: 'crypto' }, { label: 'Ablehnen', act: 'skip' }] }) },
  { id: 'naming', when: (b) => !b.sponsors.some((s) => s.slot === 'stadion') && getLeague(leagueOf(b)).tier <= 3, make: (b) => sponsorCard(b, 'stadion') },
  { id: 'fine', make: (b) => ({ title: 'Pyrotechnik im Gästeblock', text: `Der Verband verhängt eine Geldstrafe von ${money(brandOf(b) * 0.01 + 20e3 * scaleOf(b))}.`, options: [{ label: 'Zahlen', act: 'fine' }, { label: 'Einspruch', sub: '50 % Chance auf Halbierung, sonst +20 %', act: 'fine-appeal' }] }) },
  { id: 'retro', make: (b) => ({ title: 'Retro-Trikot-Edition?', text: 'Das Merchandising will ein Sondertrikot auflegen. Kann ein Hit werden – oder im Lager liegen bleiben.', options: [{ label: `Produzieren · ${money(brandOf(b) * 0.03)}`, sub: '60 % Chance: 2,5-faches Geld zurück', act: 'retro' }, { label: 'Lieber nicht', act: 'skip' }] }) },
  { id: 'members', make: (b) => ({ title: 'Mitglieder-Kampagne', text: 'Mit einer Werbeaktion könnten neue Mitglieder kommen. Mehr Mitglieder = mehr TV-Geld aus der Säule „Interesse“.', options: [{ label: `Starten · ${money(brandOf(b) * 0.015)}`, sub: 'Mitglieder +8 %', act: 'members' }, { label: 'Nein', act: 'skip' }] }) },
  { id: 'pitch', make: (b) => ({ title: 'Rasen ist kaputt', text: 'Nach dem Regen ist der Platz eine Matschwiese. Neuer Rasen kostet.', options: [{ label: `Neuer Rasen · ${money((b.cap * 25 + 150e3) * scaleOf(b))}`, act: 'pitch' }, { label: 'So weiterspielen', sub: 'Team in diesem Monat schwächer', act: 'pitch-no' }] }) },
];

function investorCard(b: BossState): Card {
  const german = isGerman(leagueOf(b));
  const share = german ? 49 : pick([30, 51, 75]);
  const amount = roundMoney(plannedRevenue(b) * (share / 100) * 1.6);
  return {
    id: 'investor', kind: 'investor', title: 'Ein Investor klopft an',
    text: german
      ? `Eine Investmentfirma will ${share} % der Profiabteilung für ${money(amount)} kaufen. Mehr geht nicht – in Deutschland gilt 50+1: der Verein behält die Mehrheit.`
      : `Ein Investor will ${share} % des Vereins für ${money(amount)} kaufen.${share > 50 ? ' Dann hat er die Mehrheit.' : ''}`,
    options: [{ label: `Verkaufen · +${money(amount)}`, sub: german ? 'Fans −15, Aufsichtsrat wird strenger' : 'Fans −8, Aufsichtsrat wird strenger', act: 'investor' }, { label: 'Ablehnen', sub: 'Fans +3', act: 'investor-no' }],
    data: { share, amount },
  };
}

/** Karten für die Vorstandssitzung des aktuellen Monats. */
export function monthCards(b: BossState): Card[] {
  const out: Card[] = [];
  if (b.month >= 10) return out;
  if (!b.coach) out.push(coachCard(b));
  for (const slot of ['trikot', 'aermel'] as SponsorSlot[]) if (!b.sponsors.some((s) => s.slot === slot) && b.month === 0) out.push(sponsorCard(b, slot));
  const tier = getLeague(leagueOf(b)).tier;
  if (b.month === 0 && isGerman(leagueOf(b)) && tier <= 2 && b.nlz === 0) out.push({ id: 'license', kind: 'license', title: 'Lizenz: NLZ fehlt', text: 'In der 1. und 2. Liga ist ein Nachwuchsleistungszentrum Pflicht. Ohne NLZ gibt es Punktabzug.', options: [{ label: `NLZ gründen · ${money(nlzYear({ ...b, nlz: 1 }))}/Jahr`, act: 'nlz1' }, { label: 'Risiko eingehen', sub: '6 Punkte Abzug', act: 'license-no' }] });
  if (b.month === 0 || b.month === 5) {
    // Sportdirektor: bis zu zwei Vorschläge, die die Elf besser machen und bezahlbar sind
    const xi = new Set(b.m.xi);
    const weak = (pos: string) => Math.min(...b.m.squad.filter((x) => x.pos === pos && xi.has(x.id)).map((x) => x.ovr), 99);
    const props = b.m.market.filter((p) => p.ovr > weak(p.pos) && p.price <= Math.max(b.cash, 0) * 0.85).slice(0, 8);
    for (const p of props.sort(() => Math.random() - 0.5).slice(0, 2)) out.push(buyCard(b, p));
    if (b.m.squad.length > SQUAD_MIN + 2 && chance(0.8)) {
      const p = pick([...b.m.squad].sort((x, y) => y.ovr - x.ovr).slice(0, 8));
      out.push(bidCard(b, p));
    }
  }
  if (b.month === 2 && !b.investor && chance(0.25) && b.history.length >= 1) out.push(investorCard(b));
  const evs = EVENTS.filter((e) => !e.when || e.when(b));
  if (evs.length && chance(b.month === 0 ? 0.9 : 0.6)) {
    const e = pick(evs);
    const c = e.make(b);
    out.push({ kind: c.data?.offers ? 'sponsor' : 'event', id: (c as Card).id ?? `ev-${e.id}`, ...c } as Card);
  }
  return out;
}

const book = (b: BossState, k: IncomeKey | CostKey, v: number, isIn: boolean) => {
  if (!v) return;
  if (isIn) b.ledger.in[k as IncomeKey] = (b.ledger.in[k as IncomeKey] ?? 0) + v;
  else b.ledger.out[k as CostKey] = (b.ledger.out[k as CostKey] ?? 0) + v;
  b.cash += isIn ? v : -v;
};
const clone = (b: BossState): BossState => JSON.parse(JSON.stringify(b));

/** Entscheidung auf einer Karte. Gibt den neuen Stand und eine kurze Rückmeldung zurück. */
export function decide(prev: BossState, cardId: string, act: string, roll = Math.random()): { b: BossState; msg: string } {
  const b = clone(prev);
  const card = b.cards.find((c) => c.id === cardId);
  if (!card) return { b: prev, msg: '' };
  b.cards = b.cards.filter((c) => c.id !== cardId);
  let msg = '';
  const brand = brandOf(b);
  if (act.startsWith('sponsor:')) {
    const o = (card.data!.offers as Sponsor[])[Number(act.split(':')[1])];
    b.sponsors = [...b.sponsors.filter((s) => s.slot !== o.slot), o];
    if (o.kind === 'wette') b.fans = clamp(b.fans - 4, 0, 100);
    if (o.slot === 'stadion') b.fans = clamp(b.fans - 6, 0, 100);
    msg = `${o.name} ist neuer ${SLOT_NAME[o.slot]}-Sponsor: ${money(o.perYear)} pro Jahr.`;
  } else if (act.startsWith('coach:')) {
    const c = (card.data!.list as Coach[])[Number(act.split(':')[1])];
    b.coach = c; b.m = { ...b.m, tactic: c.tactic, formation: c.formation, xi: bestXI(b.m.squad, c.formation) };
    b.m.bench = bestBench(b.m.squad, b.m.xi);
    msg = `${c.name} ist neuer Trainer.`;
  } else if (act === 'buy' && card.ref) {
    const p = b.m.market.find((x) => x.id === card.ref);
    if (!p) msg = 'Der Spieler ist nicht mehr zu haben.';
    else if (p.price > b.cash) msg = 'Dafür reicht das Geld nicht.';
    else if (b.m.squad.length >= SQUAD_MAX) msg = 'Der Kader ist voll.';
    else if (roll * 100 > willingness(b.m, p)) { b.m.market = b.m.market.filter((x) => x.id !== p.id); msg = `${p.name} sagt ab.`; }
    else {
      const { clubId: _c, price: _p, ...rest } = p;
      b.m.squad = [...b.m.squad, { ...rest, goals: 0, apps: 0, joined: b.m.season }];
      b.m.market = b.m.market.filter((x) => x.id !== p.id);
      book(b, 'buy', p.price, false);
      b.amort.push({ perYear: p.price / 4, years: 4 });
      b.m.xi = bestXI(b.m.squad, b.m.formation); b.m.bench = bestBench(b.m.squad, b.m.xi);
      msg = `${p.name} unterschreibt für ${money(p.price)}.`;
    }
  } else if (act === 'sell' && card.ref) {
    const p = b.m.squad.find((x) => x.id === card.ref);
    if (p && b.m.squad.length > SQUAD_MIN) {
      const amount = card.data!.amount as number;
      b.m.squad = b.m.squad.filter((x) => x.id !== p.id);
      book(b, 'transfer', amount, true);
      b.m.xi = fixXI(b.m); b.m.bench = fixBench(b.m);
      b.fans = clamp(b.fans - (p.ovr >= teamRating(b.m) + 2 ? 4 : 1), 0, 100);
      msg = `${p.name} wechselt für ${money(amount)} zu ${getClub(card.data!.clubId as string).name}.`;
    }
  } else if (act === 'tour') { book(b, 'other', brand * 0.08, true); b.boost -= 1; msg = 'Die Reise bringt Geld – die Beine sind schwer.'; }
  else if (act === 'roof') { book(b, 'stadium', b.cap * 60 * scaleOf(b), false); msg = 'Das Dach ist dicht.'; }
  else if (act === 'roof-no') { b.fans = clamp(b.fans - 5, 0, 100); msg = 'Die Fans stehen im Regen.'; }
  else if (act === 'cheap') { b.fans = clamp(b.fans + 7, 0, 100); b.cheap = true; msg = 'Volles Haus, gute Stimmung.'; }
  else if (act === 'cheap-no') { b.fans = clamp(b.fans - 3, 0, 100); msg = 'Die Fanszene ist enttäuscht.'; }
  else if (act.startsWith('raise:')) { const id = act.split(':')[1]; b.raise[id] = (b.raise[id] ?? 1) * 1.3; msg = 'Vertrag verbessert.'; }
  else if (act === 'raise-no') { b.boost -= 1; msg = 'Unruhe in der Kabine.'; }
  else if (act === 'social') { book(b, 'other', brand * 0.02, false); b.fans = clamp(b.fans + 5, 0, 100); b.members = Math.round(b.members * 1.03); msg = 'Die Stadt spricht gut über den Verein.'; }
  else if (act === 'crypto') { book(b, 'sponsor', brand * 0.15, true); b.fans = clamp(b.fans - 6, 0, 100); msg = 'Das Geld ist da, die Fans pfeifen.'; }
  else if (act === 'fine') { book(b, 'fine', brand * 0.01 + 20e3 * scaleOf(b), false); msg = 'Strafe bezahlt.'; }
  else if (act === 'fine-appeal') { const f = brand * 0.01 + 20e3 * scaleOf(b); if (roll < 0.5) { book(b, 'fine', f / 2, false); msg = 'Einspruch erfolgreich: halbe Strafe.'; } else { book(b, 'fine', f * 1.2, false); msg = 'Einspruch abgelehnt: Strafe erhöht.'; } }
  else if (act === 'retro') { const c = brand * 0.03; book(b, 'other', c, false); if (roll < 0.6) { book(b, 'merch', c * 2.5, true); msg = 'Ausverkauft! Das Trikot ist ein Hit.'; } else { book(b, 'merch', c * 0.6, true); msg = 'Die Hälfte liegt noch im Lager.'; } }
  else if (act === 'members') { book(b, 'other', brand * 0.015, false); b.members = Math.round(b.members * 1.08); msg = 'Neue Mitglieder melden sich an.'; }
  else if (act === 'pitch') { book(b, 'stadium', (b.cap * 25 + 150e3) * scaleOf(b), false); msg = 'Frischer Rasen liegt.'; }
  else if (act === 'pitch-no') { b.boost -= 1; msg = 'Gespielt wird auf Matsch.'; }
  else if (act === 'nlz1') { b.nlz = 1; msg = 'Das NLZ ist gegründet – die Lizenz ist sicher.'; }
  else if (act === 'license-no') { b.penalty += 6; msg = '6 Punkte Abzug.'; }
  else if (act === 'investor') {
    const { share, amount } = card.data as { share: number; amount: number };
    book(b, 'other', amount, true);
    b.investor = { name: 'Investor', share };
    b.fans = clamp(b.fans - (isGerman(leagueOf(b)) ? 15 : 8), 0, 100);
    msg = `${share} % verkauft. ${money(amount)} fließen in die Kasse.`;
  } else if (act === 'investor-no') { b.fans = clamp(b.fans + 3, 0, 100); msg = 'Der Verein bleibt unabhängig.'; }
  else msg = 'Abgelehnt.';
  return { b, msg };
}

// ---------- Aktionen (jederzeit) ----------
export function setTicket(prev: BossState, t: TicketLevel): BossState { return { ...prev, ticket: t }; }
export function fireCoach(prev: BossState): BossState {
  if (!prev.coach) return prev;
  const b = clone(prev);
  book(b, 'coach', severance(prev.coach), false);
  b.log = [`${prev.coach.name} ist entlassen (Abfindung ${money(severance(prev.coach))}).`, ...b.log].slice(0, 40);
  b.coach = null;
  b.trust = clamp(b.trust - 3, 0, 100);
  b.cards = [coachCard(b, 'Neuen Trainer verpflichten'), ...b.cards.filter((c) => c.id !== 'coach')];
  return b;
}
export const LOAN_RATE = 0.06;
export function loanOptions(b: BossState): number[] { const r = plannedRevenue(b); return [0.05, 0.1, 0.2].map((f) => roundMoney(r * f)); }
/** Kredit: 6 % Zinsen pro Jahr, Rückzahlung in 30 Monatsraten (3 Saisons). */
export function takeLoan(prev: BossState, amount: number): BossState {
  const b = clone(prev);
  const total = amount * (1 + LOAN_RATE * 3);
  b.loans.push({ left: total, rate: LOAN_RATE, monthly: total / 30 });
  b.cash += amount;
  b.log = [`Kredit über ${money(amount)} aufgenommen.`, ...b.log].slice(0, 40);
  return b;
}
export const nlzUpgradeCost = (b: BossState) => (b.nlz >= 5 ? 0 : roundMoney(nlzYear({ ...b, nlz: b.nlz + 1 }) * 1.5));
export function upgradeNlz(prev: BossState): BossState {
  const cost = nlzUpgradeCost(prev);
  if (prev.nlz >= 5 || cost > prev.cash) return prev;
  const b = clone(prev);
  book(b, 'build', cost, false);
  b.nlz++;
  b.log = [`NLZ ausgebaut auf Stufe ${b.nlz} (${NLZ_NAME[b.nlz]}).`, ...b.log].slice(0, 40);
  return b;
}
export function downgradeNlz(prev: BossState): BossState { if (prev.nlz <= 0) return prev; return { ...prev, nlz: prev.nlz - 1 }; }
export const SEAT_STEP = 5000;
export const seatCost = (b: BossState) => roundMoney(SEAT_STEP * 3000 * clamp(econOf(leagueOf(b)).brand + 0.4, 0.4, 1.6));
export const vipCost = (b: BossState) => roundMoney(b.cap * 400 * clamp(econOf(leagueOf(b)).brand + 0.4, 0.4, 1.6));
export function startBuild(prev: BossState, kind: Build['kind']): BossState {
  if (prev.build) return prev;
  if (kind === 'vip' && prev.vip >= 3) return prev;
  const cost = kind === 'seats' ? seatCost(prev) : vipCost(prev);
  if (cost > prev.cash) return prev;
  const b = clone(prev);
  book(b, 'build', cost, false);
  b.build = { kind, monthsLeft: kind === 'seats' ? 6 : 3, amount: cost };
  b.log = [kind === 'seats' ? `Ausbau gestartet: +${SEAT_STEP.toLocaleString('de-DE')} Plätze.` : 'Neue VIP-Logen werden gebaut.', ...b.log].slice(0, 40);
  return b;
}

// ---------- Monat spielen ----------
export const canPlay = (b: BossState) => !b.fired && !b.seasonOver && b.cards.length === 0 && !!b.coach;

export function playMonth(prev: BossState): BossState {
  if (!canPlay(prev)) return prev;
  const b = clone(prev);
  const before = b.cash;
  const monthLedger = emptyLedger();
  const keep = b.ledger;
  b.ledger = monthLedger;
  const end = monthStart(b.m.season, b.month + 1);
  const results: MonthReport['results'] = [];
  const notes: string[] = [];
  let homes = 0;
  // Trainer stellt auf
  b.m = { ...b.m, mood: coachBoost(b.coach) + b.boost * 0.8, hype: 0, tactic: b.coach!.tactic, formation: b.coach!.formation };
  b.m.xi = bestXI(b.m.squad, b.m.formation);
  b.m.bench = bestBench(b.m.squad, b.m.xi);
  // Punktabzug zu Saisonbeginn eintragen
  if (b.month === 0 && b.penalty) { const r = b.m.rows.find((x) => x.clubId === b.m.clubId); if (r) r.points -= b.penalty; notes.push(`${b.penalty} Punkte Abzug (Lizenz).`); b.penalty = 0; }
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
  const tv = tvMoney(b);
  book(b, 'tv', tv.total / 10, true);
  if (b.europe) book(b, 'euro', EURO_MONEY[b.europe] / 10, true);
  const cheap = b.cheap ? 0.6 : 1;
  const att = attendance(b);
  book(b, 'match', matchIncome(b) * homes * cheap, true);
  book(b, 'sponsor', (sponsorYear(b) + adsYear(b)) / 10, true);
  book(b, 'merch', merchYear(b) / 10, true);
  // Kosten
  book(b, 'wages', payroll(b) / 10, false);
  book(b, 'coach', (b.coach?.wage ?? 0) / 10, false);
  book(b, 'stadium', stadiumYear(b) / 10 + homes * attendance(b) * clamp(econOf(leagueOf(b)).brand * 2, 0.2, 2), false);
  book(b, 'nlz', nlzYear(b) / 10, false);
  book(b, 'admin', adminYear(b) / 10, false);
  book(b, 'ops', opsYear(b) / 10, false);
  // Kredite
  for (const l of b.loans) { const pay = Math.min(l.left, l.monthly); l.left -= pay; book(b, 'interest', pay, false); }
  b.loans = b.loans.filter((l) => l.left > 1);
  // Überzogen: 12 % Zinsen aufs Jahr, Aufsichtsrat nervös
  if (b.cash < 0) { book(b, 'interest', (-b.cash * 0.12) / 12, false); b.trust = clamp(b.trust - 4, 0, 100); notes.push('Konto überzogen: teure Zinsen, der Aufsichtsrat ist nervös.'); }
  // Bauprojekte
  if (b.build) {
    b.build.monthsLeft--;
    if (b.build.monthsLeft <= 0) {
      if (b.build.kind === 'seats') { b.cap += SEAT_STEP; notes.push(`Ausbau fertig: Jetzt ${b.cap.toLocaleString('de-DE')} Plätze.`); }
      else { b.vip++; notes.push(`Neue VIP-Logen eröffnet (Stufe ${b.vip}).`); }
      b.build = null;
    }
  }
  // Fans: Ergebnisse + Ticketpreis
  const pts = results.reduce((a, r) => a + (r.gf > r.ga ? 3 : r.gf === r.ga ? 1 : 0), 0);
  const exp = results.length * 1.4;
  b.fans = clamp(Math.round(b.fans + (pts - exp) * 1.2 + TICKETS[b.ticket].fans), 0, 100);
  b.members = Math.round(b.members * (1 + (b.fans - 55) / 4000));
  // Monat abschließen
  b.ledger = keep;
  for (const [k, v] of Object.entries(monthLedger.in)) keep.in[k as IncomeKey] = (keep.in[k as IncomeKey] ?? 0) + (v ?? 0);
  for (const [k, v] of Object.entries(monthLedger.out)) keep.out[k as CostKey] = (keep.out[k as CostKey] ?? 0) + (v ?? 0);
  const label = monthName(b);
  b.boost = 0;
  b.cheap = false;
  b.month++;
  b.report = { label, results, ledger: monthLedger, cashBefore: before, cashAfter: b.cash, attendance: homes ? att : undefined, notes };
  if (b.m.done || b.month >= 10) { b.month = 10; b.seasonOver = true; b.cards = []; }
  else {
    if (b.month === 5) b.m.market = buildMarket(b.m);
    b.cards = monthCards(b);
  }
  return b;
}

// ---------- Saisonende ----------
export interface SeasonEnd {
  pos: number; target: number; reached: boolean; title: string | null; move: 'up' | 'down' | null; newLeague: string | null;
  revenue: number; costs: number; profit: number; ledger: Ledger; vote: number | null; trustDelta: number; trust: number; fired: boolean;
  ratio: number; uefaFine: number; sponsorBonus: number; talents: string[]; europe: BossState['europe']; license: string | null;
}

export function closeSeason(prev: BossState): { b: BossState; end: SeasonEnd } {
  const b = clone(prev);
  const lg = getLeague(leagueOf(b));
  const table = sortTable(b.m.rows);
  const pos = table.findIndex((r) => r.clubId === b.m.clubId) + 1;
  const reached = pos <= b.m.target;
  // Sponsoren-Bonus fürs Saisonziel
  const sponsorBonus = reached ? b.sponsors.reduce((a, s) => a + s.perYear * s.bonus, 0) : 0;
  book(b, 'sponsor', sponsorBonus, true);
  // UEFA-Kaderkostenregel (nur mit Europapokal)
  const ratio = squadCostRatio(b);
  let uefaFine = 0;
  if (b.europe && ratio > 0.7) { uefaFine = roundMoney(sumIn(b.ledger) * (ratio - 0.7) * 0.25); book(b, 'fine', uefaFine, false); }
  const revenue = sumIn(b.ledger); const costs = sumOut(b.ledger); const profit = revenue - costs;
  // Engine: Auf-/Abstieg, Entwicklung, neue Saison
  const { m, summary } = finishSeason(b.m, BOSS_LEAGUES);
  // Europapokal für nächste Saison
  const europe: BossState['europe'] = lg.tier === 1 && summary.move === null
    ? (pos <= lg.europe.cl ? 'cl' : pos <= lg.europe.cl + lg.europe.el ? 'el' : pos <= lg.europe.cl + lg.europe.el + lg.europe.conf ? 'conf' : null) : null;
  // Mitgliederversammlung (nur deutsche Vereine = e.V.)
  let vote: number | null = null;
  if (isGerman(lg.id)) vote = Math.round(clamp(45 + (b.fans - 50) * 0.6 + (reached ? 12 : -10) + (profit > 0 ? 8 : -8) + (summary.title ? 15 : 0) + (summary.move === 'up' ? 12 : summary.move === 'down' ? -20 : 0) - (b.investor ? 6 : 0), 5, 97));
  // Aufsichtsrat
  let d = (reached ? 10 : -12) + (profit > 0 ? 6 : -8) + (b.cash < 0 ? -10 : 0) + (summary.title ? 10 : 0) + (summary.move === 'up' ? 15 : summary.move === 'down' ? -25 : 0) + (europe ? 5 : 0);
  if (vote !== null && vote < 50) d -= 15;
  if (b.investor) d = d < 0 ? Math.round(d * 1.5) : d;
  const trust = clamp(b.trust + d, 0, 100);
  const fired = trust <= 10;
  // Lizenz: deutsche Profiligen prüfen das Konto
  let license: string | null = null;
  let penalty = 0;
  const newLg = getLeague(leagueOfClub(m, m.clubId));
  if (isGerman(newLg.id) && newLg.tier <= 3 && b.cash < -plannedRevenue(b) * 0.1) { penalty = 9; license = 'Lizenz nur mit Auflage: Das Konto ist tief im Minus. 9 Punkte Abzug in der neuen Saison.'; }
  // NLZ: Talente
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
  // Sponsorenverträge laufen ab
  const sponsors = b.sponsors.map((s) => ({ ...s, years: s.years - 1 })).filter((s) => s.years > 0);
  const amort = b.amort.map((a) => ({ ...a, years: a.years - 1 })).filter((a) => a.years > 0);
  const coach = b.coach ? { ...b.coach, years: b.coach.years - 1 } : null;
  const rec: BossSeason = { season: b.m.season, leagueId: lg.id, pos, target: b.m.target, revenue, costs, profit, cash: b.cash, title: summary.title ?? undefined, move: summary.move, vote: vote ?? undefined, trust, ratio };
  const next: BossState = {
    ...b, m, month: 0, seasonOver: false, report: null, lastLedger: b.ledger, ledger: emptyLedger(), lastPos: summary.move === 'up' ? m.rows.length : summary.move === 'down' ? 1 : pos,
    europe, sponsors, amort, trust, fired, penalty: b.penalty + penalty, history: [rec, ...b.history], coach: coach && coach.years > 0 ? coach : coach ? { ...coach, years: 2 } : null,
    log: [summary.title ? `${summary.title}!` : `Saison beendet auf Platz ${pos}.`, ...b.log].slice(0, 40),
  };
  next.m.xi = bestXI(next.m.squad, next.m.formation); next.m.bench = bestBench(next.m.squad, next.m.xi);
  next.cards = fired ? [] : monthCards(next);
  return { b: next, end: { pos, target: b.m.target, reached, title: summary.title, move: summary.move, newLeague: summary.newLeague, revenue, costs, profit, ledger: b.ledger, vote, trustDelta: d, trust, fired, ratio, uefaFine, sponsorBonus, talents, europe, license } };
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
export const dateLabel = (b: BossState) => (b.m.cal ? calDate(b.m.cal).toLocaleDateString('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');
export const valueOfSquad = (b: BossState) => b.m.squad.reduce((a, p) => a + playerValueM(p), 0);

// ---------- Speichern ----------
const KEY = 'fc-boss-v1';
export function loadBoss(): BossState | null {
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as BossState) : null; } catch { return null; }
}
export function saveBoss(b: BossState | null): void {
  try { if (b) localStorage.setItem(KEY, JSON.stringify(b)); else localStorage.removeItem(KEY); } catch { /* voll oder gesperrt */ }
}
