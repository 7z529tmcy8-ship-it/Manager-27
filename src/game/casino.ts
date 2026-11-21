import { CARD_POOL, type ClubState, type CollectCard } from './club';
import { seasonId } from './squad';

// Neon-Casino: eigene Währung (Chips), acht Spiele, VIP-Stufen, Tagesbonus mit Serie, wachsender
// Jackpot, Tagesaufgaben und ein Preis-Shop (Karten, XP, Profil-Extras). Nur Spielgeld.
// Alle Spiele haben eine offen angezeigte Auszahlungsquote (RTP) knapp unter 100 %.

export type GameId = 'slots' | 'crash' | 'plinko' | 'mines' | 'roulette' | 'blackjack' | 'hilo' | 'wheel' | 'bets' | 'scratch';
/** Höher/Tiefer gibt es nicht mehr – 'hilo' bleibt nur für alte Statistiken im Typ. */
type Rand = () => number;

export interface CasinoState {
  chips: number;
  /** Insgesamt gesetzt – bestimmt die VIP-Stufe. */
  vipPts: number;
  daily?: { day: string; streak: number };
  /** Tag des Gratis-Drehs am Glücksrad. */
  wheelDay?: string;
  jackpot: number;
  quests?: { day: string; progress: Record<string, number>; claimed: string[] };
  stats: { bigWin: number; bestCrash: number; bestHilo: number; rounds: number; jackpots: number };
  /** Gekaufte Extras (Wappen, Farben). */
  owned?: string[];
  /** Sportwetten: Spieltag, Archiv, offene Karriere-Wetten. */
  bets?: import('./bets').BetState;
  /** Letzte große Gewinne (für das Laufband im Casino). */
  recent?: { game: GameId; win: number; mult: number }[];
  /** Zeitpunkt des letzten Gratis-Nachschubs (ms). */
  refillAt?: number;
  /** Höchstes Casino-Level, dessen Belohnung schon ausgezahlt ist. */
  levelPaid?: number;
  /** Cashback: Einsatz/Gewinn heute und der offene Anspruch von gestern. */
  cb?: { day: string; wagered: number; won: number };
  cbOpen?: { day: string; loss: number };
  /** Tägliche Gratis-Drehungen an den Slots. */
  gift?: { day: string; left: number };
  /** Wochen-Turnier: bester Multiplikator dieser Woche, ausgezahlte Wochen. */
  tour?: { week: string; best: number; game?: GameId };
  tourPaid?: string[];
  tourLast?: { week: string; best: number };
  /** Drops & Wins: letzter Zufalls-Drop (für die Einblendung). */
  lastDrop?: { amount: number; mult: number; at: number };
  /** Glücks-Serie: Gewinne in Folge und der letzte Serien-Bonus. */
  winStreak?: number;
  lastStreak?: { n: number; bonus: number; at: number };
  /** Geöffnete Mystery-Boxen (eine pro 30 Runden). */
  boxes?: number;
}

export const START_CHIPS = 1_000;
export const JACKPOT_SEED = 10_000;
/** Anteil jedes Einsatzes, der in den Jackpot fließt. */
export const JACKPOT_SHARE = 0.01;
/** Auszahlungsquote der Spiele mit frei wählbarem Gewinnziel (Crash, Minen, Plinko, Höher/Tiefer). */
export const RTP = 0.97;

export const casinoOf = (club: Pick<ClubState, 'casino'>): CasinoState =>
  club.casino ?? { chips: START_CHIPS, vipPts: 0, jackpot: JACKPOT_SEED, stats: { bigWin: 0, bestCrash: 0, bestHilo: 0, rounds: 0, jackpots: 0 } };
const withCasino = (club: ClubState, f: (c: CasinoState) => CasinoState): ClubState => ({ ...club, casino: f(casinoOf(club)) });

// ---------- VIP ----------
export const VIP = [
  { name: 'Bronze', min: 0, daily: 250, maxBet: 500, color: '#d08a4f' },
  { name: 'Silber', min: 5_000, daily: 400, maxBet: 1_500, color: '#c9d4e3' },
  { name: 'Gold', min: 25_000, daily: 650, maxBet: 5_000, color: '#ffd24a' },
  { name: 'Platin', min: 100_000, daily: 1_000, maxBet: 20_000, color: '#7af0ff' },
  { name: 'Diamant', min: 400_000, daily: 1_600, maxBet: 100_000, color: '#ff7ad9' },
] as const;
export const vipLevel = (pts: number) => VIP.reduce((lv, v, i) => (pts >= v.min ? i : lv), 0);
export const vipOf = (club: Pick<ClubState, 'casino'>) => VIP[vipLevel(casinoOf(club).vipPts)];
export const maxBet = (club: Pick<ClubState, 'casino'>) => vipOf(club).maxBet;

// ---------- Tagesbonus mit Serie ----------
const dayBefore = (day: string) => { const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() - 1); return seasonId(d); };
export function dailyBonus(club: Pick<ClubState, 'casino'>, now = new Date()): { ready: boolean; amount: number; streak: number } {
  const c = casinoOf(club);
  const today = seasonId(now);
  const streak = c.daily?.day === today ? c.daily.streak : c.daily?.day === dayBefore(today) ? c.daily.streak + 1 : 1;
  const amount = Math.round(vipOf(club).daily * (1 + Math.min(streak - 1, 7) * 0.15));
  return { ready: c.daily?.day !== today, amount, streak };
}
export function claimDaily(club: ClubState, now = new Date()): { club: ClubState; amount: number } {
  const b = dailyBonus(club, now);
  if (!b.ready) return { club, amount: 0 };
  return { club: withCasino(club, (c) => ({ ...c, chips: c.chips + b.amount, daily: { day: seasonId(now), streak: b.streak } })), amount: b.amount };
}

// ---------- Einsatz und Auszahlung ----------
export type BigWin = 'big' | 'mega' | 'epic' | null;
export const bigWinOf = (bet: number, win: number): BigWin => {
  if (bet <= 0 || win <= 0) return null;
  const x = win / bet;
  return x >= 50 ? 'epic' : x >= 20 ? 'mega' : x >= 8 ? 'big' : null;
};
/** Einsatz abbuchen (geht in VIP-Punkte und zu 1 % in den Jackpot). null = nicht genug Chips oder über dem Limit. */
export function placeBet(club: ClubState, bet: number): ClubState | null {
  const c = casinoOf(club);
  // All-in: das ganze Guthaben geht immer – auch über dem VIP-Limit.
  if (!Number.isFinite(bet) || bet <= 0 || bet > c.chips || (bet > maxBet(club) && bet !== c.chips)) return null;
  return withCasino(club, (x) => {
    const vipPts = x.vipPts + bet * (happyHour().active ? 2 : 1);
    // Casino-Level zeigt nur den Fortschritt – Level-Aufstiege bringen bewusst keine Chips.
    return { ...x, chips: x.chips - bet, vipPts, jackpot: x.jackpot + Math.round(bet * JACKPOT_SHARE), ...cbTrack(x, bet, 0) };
  });
}

// ---------- Casino-Level (jede Runde bringt Fortschritt, jedes Level Chips) ----------
/** Gesamteinsatz, der für Level n nötig ist (wächst langsam an). */
export const levelNeed = (n: number) => Math.round(400 * Math.pow(n, 1.55));
export function casinoLevel(pts: number): { level: number; from: number; to: number; pct: number } {
  let level = 0;
  while (pts >= levelNeed(level + 1)) level++;
  const from = levelNeed(level), to = levelNeed(level + 1);
  return { level, from, to, pct: Math.min(100, ((pts - from) / (to - from)) * 100) };
}

// ---------- Cashback: ein Teil des Tagesverlusts kommt am nächsten Tag zurück ----------
export const CASHBACK = [0.05, 0.07, 0.1, 0.12, 0.15];
function cbTrack(c: CasinoState, wagered: number, won: number, now = new Date()): Pick<CasinoState, 'cb' | 'cbOpen'> {
  const today = seasonId(now);
  if (c.cb && c.cb.day !== today) {
    const loss = Math.max(0, c.cb.wagered - c.cb.won);
    const open = c.cb.day === dayBefore(today) && loss > 0 ? { day: c.cb.day, loss } : c.cbOpen?.day === dayBefore(today) ? c.cbOpen : undefined;
    return { cb: { day: today, wagered, won }, cbOpen: open };
  }
  const cb = c.cb ?? { day: today, wagered: 0, won: 0 };
  return { cb: { day: today, wagered: cb.wagered + wagered, won: cb.won + won }, cbOpen: c.cbOpen };
}
export function cashback(club: Pick<ClubState, 'casino'>, now = new Date()): { ready: boolean; amount: number; pct: number; todayLoss: number } {
  const c = casinoOf(club);
  const pct = CASHBACK[vipLevel(c.vipPts)];
  const today = seasonId(now);
  const open = c.cb && c.cb.day === dayBefore(today) ? { loss: Math.max(0, c.cb.wagered - c.cb.won) } : c.cbOpen?.day === dayBefore(today) ? c.cbOpen : null;
  const todayLoss = c.cb?.day === today ? Math.max(0, c.cb.wagered - c.cb.won) : 0;
  const amount = open ? Math.floor(open.loss * pct) : 0;
  return { ready: amount > 0, amount, pct, todayLoss };
}
export function claimCashback(club: ClubState, now = new Date()): { club: ClubState; amount: number } {
  const cb = cashback(club, now);
  if (!cb.ready) return { club, amount: 0 };
  const today = seasonId(now);
  return { club: withCasino(club, (c) => ({ ...c, chips: c.chips + cb.amount, cbOpen: undefined, cb: c.cb?.day === today ? c.cb : { day: today, wagered: 0, won: 0 } })), amount: cb.amount };
}

// ---------- Tägliche Gratis-Drehungen (Slots) ----------
export const GIFT_SPINS = 10;
export const GIFT_BET = [20, 40, 80, 150, 300];
export function giftSpins(club: Pick<ClubState, 'casino'>, now = new Date()): { left: number; bet: number } {
  const c = casinoOf(club);
  const left = c.gift?.day === seasonId(now) ? c.gift.left : GIFT_SPINS;
  return { left, bet: GIFT_BET[vipLevel(c.vipPts)] };
}
export function takeGiftSpin(club: ClubState, now = new Date()): ClubState | null {
  const g = giftSpins(club, now);
  if (g.left <= 0) return null;
  return withCasino(club, (c) => ({ ...c, gift: { day: seasonId(now), left: g.left - 1 } }));
}

// ---------- Wochen-Turnier: höchster Multiplikator gegen Computer-Gegner ----------
export const TOUR_MIN_BET = 50;
export const TOUR_PRIZES = [25_000, 12_000, 6_000, 3_000, 2_000, 1_500, 1_200, 1_000, 800, 600];
const BOT_NAMES = ['NeonKönig', 'Plinko_Paul', 'GoldGabi', 'CrashKid', 'Tor-Toni', 'JackpotJule', 'SlotSven', 'LuckyLena', 'MinenMax', 'RouletteRia', 'KombiKarl', 'FlutlichtFlo'];
/** Woche als „JJJJ-Wnn“ (Montag bis Sonntag). */
export function weekId(now = new Date()): string {
  const d = new Date(now); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function weekEnds(now = new Date()): number {
  const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + (7 - ((d.getDay() + 6) % 7)));
  return d.getTime();
}
function seeded(seed: string): () => number {
  let h = 2166136261; for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
/** Computer-Gegner: feste Zielwerte je Woche, die über die Woche anwachsen. */
export function tourBots(week: string, now = new Date()): { name: string; best: number }[] {
  const r = seeded(week);
  const start = new Date(`${week}T00:00:00`).getTime();
  const progress = Math.max(0.15, Math.min(1, (now.getTime() - start) / (7 * 86_400_000)));
  return BOT_NAMES.slice(0, 9).map((name, i) => {
    const target = Math.round((8 + Math.pow(r(), 1.6) * 420 / (1 + i * 0.35)) * 10) / 10;
    return { name, best: Math.round(target * (0.35 + 0.65 * progress) * 10) / 10 };
  });
}
export function tourBoard(club: Pick<ClubState, 'casino'>, now = new Date()): { rows: { name: string; best: number; me?: boolean }[]; rank: number; prize: number } {
  const c = casinoOf(club);
  const week = weekId(now);
  const mine = c.tour?.week === week ? c.tour.best : 0;
  const rows: { name: string; best: number; me?: boolean }[] = [...tourBots(week, now), { name: 'Du', best: mine, me: true }].sort((a, b) => b.best - a.best);
  const rank = rows.findIndex((x) => x.me) + 1;
  return { rows, rank, prize: mine > 0 ? TOUR_PRIZES[rank - 1] ?? 0 : 0 };
}
/** Preis der letzten (abgeschlossenen) Woche, falls noch nicht abgeholt. */
export function tourReward(club: Pick<ClubState, 'casino'>, now = new Date()): { week: string; rank: number; prize: number } | null {
  const c = casinoOf(club);
  const last = c.tour && c.tour.week !== weekId(now) ? c.tour : c.tourLast && c.tourLast.week !== weekId(now) ? c.tourLast : null;
  if (!last || !last.best || (c.tourPaid ?? []).includes(last.week)) return null;
  const end = new Date(`${last.week}T12:00:00`); end.setDate(end.getDate() + 7);
  const rows: { name: string; best: number; me?: boolean }[] = [...tourBots(last.week, end), { name: 'Du', best: last.best, me: true }].sort((a, b) => b.best - a.best);
  const rank = rows.findIndex((x) => x.me) + 1;
  const prize = TOUR_PRIZES[rank - 1] ?? 0;
  return prize ? { week: last.week, rank, prize } : null;
}
export function claimTour(club: ClubState, now = new Date()): { club: ClubState; prize: number; rank: number } {
  const r = tourReward(club, now);
  if (!r) return { club, prize: 0, rank: 0 };
  return { club: withCasino(club, (c) => ({ ...c, chips: c.chips + r.prize, tourPaid: [...(c.tourPaid ?? []), r.week].slice(-10) })), prize: r.prize, rank: r.rank };
}
function tourTrack(c: CasinoState, ev: PlayEvent, now: Date): Pick<CasinoState, 'tour' | 'tourLast'> {
  const week = weekId(now);
  let tour = c.tour, tourLast = c.tourLast;
  if (tour && tour.week !== week) { tourLast = tour; tour = undefined; }
  if (ev.bet >= TOUR_MIN_BET && ev.win > 0) {
    const mult = Math.round((ev.win / ev.bet) * 10) / 10;
    if (!tour || mult > tour.best) tour = { week, best: Math.max(mult, tour?.best ?? 0), game: ev.game };
  }
  return { tour, tourLast };
}
/** Event für Aufgaben und Statistik. */
export interface PlayEvent { game: GameId; bet: number; win: number; mult?: number; streak?: number; safe?: number; jackpot?: boolean; legs?: number }
/** Gewinn gutschreiben, Statistik und Aufgaben fortschreiben. */
export function payout(club: ClubState, ev: PlayEvent, now = new Date(), rand: Rand = Math.random): ClubState {
  return withCasino(club, (c0) => {
    const c = extras(c0, ev, now, rand);
    const stats = {
      ...c.stats,
      rounds: c.stats.rounds + 1,
      bigWin: Math.max(c.stats.bigWin, ev.win - ev.bet),
      bestCrash: ev.game === 'crash' && ev.win > 0 ? Math.max(c.stats.bestCrash, ev.mult ?? 0) : c.stats.bestCrash,
      bestHilo: ev.game === 'hilo' ? Math.max(c.stats.bestHilo, ev.streak ?? 0) : c.stats.bestHilo,
      jackpots: c.stats.jackpots + (ev.jackpot ? 1 : 0),
    };
    const recent = ev.bet > 0 && ev.win >= ev.bet * 2 && ev.win >= 100
      ? [{ game: ev.game, win: Math.round(ev.win), mult: Math.round((ev.win / ev.bet) * 100) / 100 }, ...(c.recent ?? [])].slice(0, 12) : c.recent;
    return { ...c, chips: c.chips + Math.max(0, Math.round(ev.win)), stats, quests: trackQuests(c, ev, now), recent, ...(ev.bet > 0 ? cbTrack(c, 0, Math.max(0, Math.round(ev.win)), now) : {}), ...tourTrack(c, ev, now) };
  });
}
/** Jackpot leeren (wird ausgezahlt) und neu befüllen. */
export function takeJackpot(club: ClubState): { club: ClubState; amount: number } {
  const amount = casinoOf(club).jackpot;
  return { club: withCasino(club, (c) => ({ ...c, jackpot: JACKPOT_SEED })), amount };
}

// ---------- 1. Stadion-Slots ----------
export type Sym = 'ball' | 'boot' | 'shirt' | 'whistle' | 'star' | 'crown' | 'trophy' | 'coin';
const WEIGHTS: [Sym, number][] = [['ball', 28], ['boot', 24], ['shirt', 20], ['whistle', 15], ['star', 9], ['crown', 3], ['trophy', 4], ['coin', 3]];
const W_TOTAL = WEIGHTS.reduce((a, [, w]) => a + w, 0);
/** Linien-Auszahlung (× Linieneinsatz = Einsatz/10) für 3, 4, 5 gleiche von links. Krone ist Joker. */
export const PAYTABLE: Partial<Record<Sym, [number, number, number]>> = {
  ball: [2, 5, 15], boot: [3, 8, 25], shirt: [4, 12, 40], whistle: [6, 20, 75], star: [12, 50, 200], crown: [20, 100, 500],
};
/** Gleichmäßiger Faktor auf alle Linien, so eingestellt, dass die Slots ~95 % zurückzahlen. */
export const SLOT_SCALE = 2.44;
export const LINES: number[][] = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [1, 0, 1, 2, 1],
];
export const FREE_SPINS: Record<number, number> = { 3: 8, 4: 12, 5: 20 };
const pickSym = (rand: Rand): Sym => { let r = rand() * W_TOTAL; for (const [s, w] of WEIGHTS) { r -= w; if (r < 0) return s; } return 'ball'; };
/** Walzen: 5 Spalten × 3 Reihen. */
export const spinGrid = (rand: Rand = Math.random): Sym[][] => Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => pickSym(rand)));

export interface LineWin { line: number; sym: Sym; count: number; win: number }
export function evalGrid(grid: Sym[][], bet: number): { lines: LineWin[]; win: number; scatters: number; coins: number } {
  const lineBet = bet / 10;
  const lines: LineWin[] = [];
  LINES.forEach((rows, li) => {
    const syms = rows.map((r, reel) => grid[reel][r]);
    const base = syms.find((s) => s !== 'crown') ?? 'crown';
    if (!PAYTABLE[base]) return;
    let count = 0;
    for (const s of syms) { if (s === base || s === 'crown') count++; else break; }
    if (count >= 3) lines.push({ line: li, sym: base, count, win: Math.round(lineBet * PAYTABLE[base]![count - 3] * SLOT_SCALE) });
  });
  const flat = grid.flat();
  return { lines, win: lines.reduce((a, l) => a + l.win, 0), scatters: flat.filter((s) => s === 'trophy').length, coins: flat.filter((s) => s === 'coin').length };
}
/** Münzen irgendwo: 3 → 3× Einsatz, 4 → 20×, 5+ → Jackpot. */
export const COIN_PAY: Record<number, number> = { 3: 3, 4: 20 };
export interface SlotResult { grid: Sym[][]; lines: LineWin[]; win: number; free: { grid: Sym[][]; win: number }[]; jackpot: boolean }
export function playSlots(bet: number, rand: Rand = Math.random): SlotResult {
  const grid = spinGrid(rand);
  const e = evalGrid(grid, bet);
  let win = e.win + (COIN_PAY[e.coins] ?? 0) * bet;
  const free: SlotResult['free'] = [];
  const n = FREE_SPINS[Math.min(5, e.scatters)] ?? 0;
  for (let i = 0; i < n; i++) {
    const g = spinGrid(rand);
    const f = evalGrid(g, bet);
    free.push({ grid: g, win: f.win });
    win += f.win;
  }
  return { grid, lines: e.lines, win, free, jackpot: e.coins >= 5 };
}

// ---------- 2. Elfmeter-Crash ----------
/** Bei welchem Multiplikator der Torwart hält: P(Ball fliegt mindestens bis m) = 0,97 / m. */
export const CRASH_MAX = 10_000;
export function crashPoint(rand: Rand = Math.random): number {
  const u = rand();
  // Obergrenze 10.000× (wie bei echten Crash-Spielen) – sonst könnte ein Flug viele Minuten dauern.
  return Math.min(CRASH_MAX, Math.max(1, Math.floor((RTP / (1 - u)) * 100) / 100));
}
/** Multiplikator nach t Sekunden Flug. */
export const crashAt = (t: number) => Math.floor(Math.exp(0.11 * t) * 100) / 100;

// ---------- 3. Torwand-Plinko ----------
// Wählbar: 8–16 Reihen und vier Risikostufen. Mehr Reihen = breitere Streuung und höhere Spitzen am Rand.
// Goldball: 3 % aller Bälle zahlen doppelt – ist in die Tabellen eingerechnet (Auszahlungsquote bleibt ~96 %).
export const PLINKO_ROWS_OPTIONS = [8, 10, 12, 14, 16] as const;
export const PLINKO_ROWS = 12;
export type Risk = 'low' | 'mid' | 'high' | 'extreme';
export const RISKS: Risk[] = ['low', 'mid', 'high', 'extreme'];
export const GOLD_CHANCE = 0.03;
export const GOLD_MULT = 2;
/** Höchstgewinn pro Ball. */
export const PLINKO_MAX_WIN = 1_000_000;
/** Auszahlung eines Balls (inkl. Goldball, gedeckelt). */
export const plinkoWin = (stake: number, mult: number, gold: boolean) => Math.min(PLINKO_MAX_WIN, Math.floor(stake * mult * (gold ? GOLD_MULT : 1)));
/** Form der Tabellen: Mitte (min), Rand (max bei n Reihen); dazwischen exponentiell, zum Rand immer steiler (q). */
const SHAPE: Record<Risk, { min: number; max: (n: number) => number; q: number }> = {
  low: { min: 0.5, max: (n) => 5.6 + (n - 8) * 1.3, q: 1.4 },
  mid: { min: 0.3, max: (n) => 13 * 1.32 ** (n - 8), q: 1.7 },
  high: { min: 0.2, max: (n) => 29 * 1.58 ** (n - 8), q: 2.2 },
  extreme: { min: 0.1, max: (n) => 60 * 1.75 ** (n - 8), q: 2.8 },
};
const binom = (n: number, k: number): number => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
const pCache = new Map<number, number[]>();
/** Wahrscheinlichkeit je Fach bei n Reihen. */
export function plinkoP(rows: number): number[] {
  if (!pCache.has(rows)) pCache.set(rows, Array.from({ length: rows + 1 }, (_, k) => binom(rows, k) / 2 ** rows));
  return pCache.get(rows)!;
}
const tCache = new Map<string, number[]>();
/** Multiplikatoren je Fach, so skaliert, dass inkl. Goldball ~96 % zurückfließen. */
export function plinkoTable(rows: number, risk: Risk): number[] {
  const key = `${rows}-${risk}`;
  if (tCache.has(key)) return tCache.get(key)!;
  const sh = SHAPE[risk];
  const half = rows / 2;
  const raw = Array.from({ length: rows + 1 }, (_, k) => sh.min * Math.exp(Math.log(sh.max(rows) / sh.min) * (Math.abs(k - half) / half) ** sh.q));
  const p = plinkoP(rows);
  const ev = raw.reduce((a, m, k) => a + m * p[k], 0);
  const target = RTP / (1 + GOLD_CHANCE * (GOLD_MULT - 1));
  const out = raw.map((m) => { const v = (m * target) / ev; return v >= 10 ? Math.floor(v) : Math.floor(v * 100) / 100; });
  tCache.set(key, out);
  return out;
}
/** Alte Schnittstelle (12 Reihen). */
export const PLINKO_P = plinkoP(PLINKO_ROWS);
export const PLINKO = Object.fromEntries(RISKS.map((r) => [r, plinkoTable(PLINKO_ROWS, r)])) as Record<Risk, number[]>;
/** Weg des Balls: je Reihe links (0) oder rechts (1); Fach = Anzahl Rechts. Goldball zahlt doppelt. */
export function dropBall(rand: Rand = Math.random, rows: number = PLINKO_ROWS): { path: number[]; slot: number; gold: boolean } {
  const path = Array.from({ length: rows }, () => (rand() < 0.5 ? 0 : 1));
  return { path, slot: path.reduce<number>((a, b) => a + b, 0), gold: rand() < GOLD_CHANCE };
}

// ---------- 4. Elfmeter-Minen ----------
export const MINE_FIELDS = 25;
export function placeMines(count: number, rand: Rand = Math.random): number[] {
  const all = Array.from({ length: MINE_FIELDS }, (_, i) => i);
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  return all.slice(0, count).sort((a, b) => a - b);
}
/** Multiplikator nach k Toren (sicheren Feldern) bei m Paraden. */
export function minesMult(mines: number, safe: number): number {
  let m = RTP;
  for (let i = 0; i < safe; i++) m *= (MINE_FIELDS - i) / (MINE_FIELDS - mines - i);
  return Math.floor(m * 100) / 100;
}

// ---------- 5. Roulette (europäisch, Rückennummern 0–36) ----------
export const RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
export const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
export type RouletteBet = 'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | 'd1' | 'd2' | 'd3' | `n${number}`;
export const ROULETTE_LABEL: Record<string, string> = { red: 'Rot', black: 'Schwarz', even: 'Gerade', odd: 'Ungerade', low: '1–18', high: '19–36', d1: '1–12', d2: '13–24', d3: '25–36' };
export const spinRoulette = (rand: Rand = Math.random) => Math.floor(rand() * 37);
/** Auszahlung inkl. Einsatz (0 = verloren). */
export function rouletteReturn(bet: RouletteBet, amount: number, n: number): number {
  if (bet.startsWith('n')) return Number(bet.slice(1)) === n ? amount * 36 : 0;
  if (n === 0) return 0;
  const hit = bet === 'red' ? RED.includes(n) : bet === 'black' ? !RED.includes(n) : bet === 'even' ? n % 2 === 0 : bet === 'odd' ? n % 2 === 1
    : bet === 'low' ? n <= 18 : bet === 'high' ? n >= 19 : bet === 'd1' ? n <= 12 : bet === 'd2' ? n >= 13 && n <= 24 : n >= 25;
  return hit ? amount * (bet.startsWith('d') ? 3 : 2) : 0;
}

// ---------- 6. Blackjack (Dealer steht ab 17, Blackjack zahlt 3:2, Verdoppeln) ----------
export interface BjCard { rank: number; suit: 0 | 1 | 2 | 3 }
export const RANK_NAME = (r: number) => (r === 1 ? 'A' : r === 11 ? 'B' : r === 12 ? 'D' : r === 13 ? 'K' : String(r));
export function shoe(rand: Rand = Math.random): BjCard[] {
  const deck: BjCard[] = [];
  for (let d = 0; d < 4; d++) for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ rank: r, suit: s as BjCard['suit'] });
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return deck;
}
export function handValue(cards: BjCard[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) { total += Math.min(10, c.rank); if (c.rank === 1) aces++; }
  const soft = aces > 0 && total + 10 <= 21;
  return { total: soft ? total + 10 : total, soft };
}
export const isBlackjack = (cards: BjCard[]) => cards.length === 2 && handValue(cards).total === 21;
export function dealerPlay(dealer: BjCard[], deck: BjCard[]): BjCard[] {
  const out = [...dealer];
  while (handValue(out).total < 17) out.push(deck.pop()!);
  return out;
}
/** Auszahlung inkl. Einsatz. */
export function bjReturn(player: BjCard[], dealer: BjCard[], bet: number): { ret: number; outcome: 'bj' | 'win' | 'push' | 'lose' } {
  const p = handValue(player).total;
  const d = handValue(dealer).total;
  if (isBlackjack(player) && !isBlackjack(dealer)) return { ret: bet * 2.5, outcome: 'bj' };
  if (p > 21) return { ret: 0, outcome: 'lose' };
  if (isBlackjack(dealer) && !isBlackjack(player)) return { ret: 0, outcome: 'lose' };
  if (d > 21 || p > d) return { ret: bet * 2, outcome: 'win' };
  if (p === d) return { ret: bet, outcome: 'push' };
  return { ret: 0, outcome: 'lose' };
}

// ---------- 8. Glücksrad ----------
export type WheelPrize = { kind: 'chips'; amount: number } | { kind: 'xp'; amount: number } | { kind: 'card'; tier: ShopCardTier } | { kind: 'jackpot' };
export const WHEEL: { prize: WheelPrize; label: string; weight: number }[] = [
  { prize: { kind: 'chips', amount: 100 }, label: '100', weight: 24 },
  { prize: { kind: 'chips', amount: 250 }, label: '250', weight: 20 },
  { prize: { kind: 'xp', amount: 50 }, label: '50 XP', weight: 14 },
  { prize: { kind: 'chips', amount: 500 }, label: '500', weight: 14 },
  { prize: { kind: 'chips', amount: 1000 }, label: '1.000', weight: 9 },
  { prize: { kind: 'card', tier: 'gold' }, label: 'Karte', weight: 7 },
  { prize: { kind: 'xp', amount: 150 }, label: '150 XP', weight: 6 },
  { prize: { kind: 'chips', amount: 2500 }, label: '2.500', weight: 4 },
  { prize: { kind: 'card', tier: 'top' }, label: 'Top-Karte', weight: 1.6 },
  { prize: { kind: 'chips', amount: 10000 }, label: '10.000', weight: 1 },
  { prize: { kind: 'jackpot' }, label: 'JACKPOT', weight: 0.4 },
];
/** Extra-Dreh kostet so viel, wenn der Gratis-Dreh heute schon weg ist. */
export const WHEEL_COST = 600;
export const wheelFree = (club: Pick<ClubState, 'casino'>, now = new Date()) => casinoOf(club).wheelDay !== seasonId(now);
export function spinWheel(rand: Rand = Math.random): number {
  const total = WHEEL.reduce((a, w) => a + w.weight, 0);
  let r = rand() * total;
  for (let i = 0; i < WHEEL.length; i++) { r -= WHEEL[i].weight; if (r < 0) return i; }
  return 0;
}
export const markWheel = (club: ClubState, now = new Date()): ClubState => withCasino(club, (c) => ({ ...c, wheelDay: seasonId(now) }));

// ---------- Tagesaufgaben ----------
export interface Quest { id: string; text: string; goal: number; reward: number; count: (e: PlayEvent) => number; best?: boolean }
export const QUESTS: Quest[] = [
  { id: 'slots10', text: '10× an den Stadion-Slots drehen', goal: 10, reward: 400, count: (e) => (e.game === 'slots' ? 1 : 0) },
  { id: 'crash3', text: 'Beim Crash bei mindestens 3× kassieren', goal: 1, reward: 600, count: (e) => (e.game === 'crash' && e.win > 0 && (e.mult ?? 0) >= 3 ? 1 : 0) },
  { id: 'bj3', text: '3 Blackjack-Hände gewinnen', goal: 3, reward: 500, count: (e) => (e.game === 'blackjack' && e.win > e.bet ? 1 : 0) },
  { id: 'mines5', text: 'Minen: 5 Tore in einer Runde', goal: 5, reward: 600, best: true, count: (e) => (e.game === 'mines' ? e.safe ?? 0 : 0) },
  { id: 'plinko20', text: '20 Plinko-Bälle fallen lassen', goal: 20, reward: 400, count: (e) => (e.game === 'plinko' ? 1 : 0) },
  { id: 'plinko10x', text: 'Plinko: einen 10×-Treffer landen', goal: 1, reward: 700, count: (e) => (e.game === 'plinko' && (e.mult ?? 0) >= 10 ? 1 : 0) },
  { id: 'roulette5', text: '5 Runden Roulette spielen', goal: 5, reward: 350, count: (e) => (e.game === 'roulette' ? 1 : 0) },
  { id: 'bet3', text: '3 Wettscheine spielen', goal: 3, reward: 500, count: (e) => (e.game === 'bets' ? 1 : 0) },
  { id: 'kombi4', text: 'Kombi mit 4+ Tipps gewinnen', goal: 1, reward: 900, count: (e) => (e.game === 'bets' && (e.legs ?? 0) >= 4 && e.win > 0 ? 1 : 0) },
  { id: 'big', text: 'Einen Big Win landen (8× Einsatz)', goal: 1, reward: 800, count: (e) => (bigWinOf(e.bet, e.win) ? 1 : 0) },
];
/** Drei Aufgaben pro Tag, für alle gleich (aus dem Datum). */
export function questsFor(day: string): Quest[] {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const idx = QUESTS.map((_, i) => i);
  const out: Quest[] = [];
  while (out.length < 3) { h = (h * 1103515245 + 12345) >>> 0; out.push(QUESTS[idx.splice(h % idx.length, 1)[0]]); }
  return out;
}
function trackQuests(c: CasinoState, e: PlayEvent, now: Date): CasinoState['quests'] {
  const day = seasonId(now);
  const q = c.quests?.day === day ? c.quests : { day, progress: {}, claimed: [] };
  const progress = { ...q.progress };
  for (const quest of questsFor(day)) {
    const n = quest.count(e);
    if (!n) continue;
    progress[quest.id] = quest.best ? Math.max(progress[quest.id] ?? 0, n) : (progress[quest.id] ?? 0) + n;
  }
  return { ...q, progress };
}
export function questList(club: Pick<ClubState, 'casino'>, now = new Date()) {
  const day = seasonId(now);
  const q = casinoOf(club).quests;
  const cur = q?.day === day ? q : { day, progress: {} as Record<string, number>, claimed: [] as string[] };
  return questsFor(day).map((quest) => ({ quest, have: Math.min(quest.goal, cur.progress[quest.id] ?? 0), claimed: cur.claimed.includes(quest.id) }));
}
export function claimQuest(club: ClubState, id: string, now = new Date()): ClubState {
  const item = questList(club, now).find((x) => x.quest.id === id);
  if (!item || item.claimed || item.have < item.quest.goal) return club;
  return withCasino(club, (c) => ({
    ...c, chips: c.chips + item.quest.reward,
    quests: { day: seasonId(now), progress: c.quests?.day === seasonId(now) ? c.quests.progress : {}, claimed: [...(c.quests?.day === seasonId(now) ? c.quests.claimed : []), id] },
  }));
}

// ---------- Preis-Shop ----------
export type ShopCardTier = 'gold' | 'top' | 'icon';
const TIER_RANGE: Record<ShopCardTier, (c: CollectCard) => boolean> = {
  gold: (c) => c.ovr >= 80 && c.ovr <= 86 && c.variant !== 'icon',
  top: (c) => c.ovr >= 87 && c.ovr <= 91,
  icon: (c) => c.variant === 'icon' || c.ovr >= 92,
};
export function randomCard(tier: ShopCardTier, rand: Rand = Math.random): CollectCard {
  const list = CARD_POOL.filter((c) => !c.id.startsWith('own-') && TIER_RANGE[tier](c));
  return list[Math.floor(rand() * list.length)];
}
export const addCard = (club: ClubState, card: CollectCard): ClubState => ({ ...club, cards: { ...club.cards, [card.id]: (club.cards[card.id] ?? 0) + 1 } });

export type ShopItem =
  | { id: string; kind: 'card'; tier: ShopCardTier; name: string; text: string; price: number }
  | { id: string; kind: 'xp'; amount: number; name: string; text: string; price: number }
  | { id: string; kind: 'emblem' | 'color'; value: string; name: string; text: string; price: number; minVip?: number };
export const SHOP: ShopItem[] = [
  { id: 'card-gold', kind: 'card', tier: 'gold', name: 'Gold-Karte', text: 'Zufällig, Wertung 80–86 – direkt ins Haupt-Team', price: 3_000 },
  { id: 'card-top', kind: 'card', tier: 'top', name: 'Top-Karte', text: 'Zufällig, Wertung 87–91', price: 12_000 },
  { id: 'card-icon', kind: 'card', tier: 'icon', name: 'Ikonen-Karte', text: 'Eine Ikone oder ein 92er+', price: 40_000 },
  { id: 'xp-100', kind: 'xp', amount: 100, name: '100 XP', text: 'Für deinen aktiven Karriere-Spieler', price: 2_500 },
  { id: 'xp-300', kind: 'xp', amount: 300, name: '300 XP', text: 'Für deinen aktiven Karriere-Spieler', price: 6_500 },
  { id: 'em-dice', kind: 'emblem', value: 'dice', name: 'Wappen „Würfel“', text: 'Exklusiv aus dem Casino', price: 8_000 },
  { id: 'em-coin', kind: 'emblem', value: 'coin', name: 'Wappen „Jackpot“', text: 'Exklusiv aus dem Casino', price: 15_000, minVip: 2 },
  { id: 'em-key', kind: 'emblem', value: 'key', name: 'Wappen „High Roller“', text: 'Nur ab VIP Platin', price: 50_000, minVip: 3 },
  { id: 'col-champ', kind: 'color', value: '#e8c36a', name: 'Farbe Champagner', text: 'Exklusive Profilfarbe', price: 5_000 },
  { id: 'col-neon', kind: 'color', value: '#ff5e3a', name: 'Farbe Roulette-Rot', text: 'Exklusive Profilfarbe', price: 5_000 },
];
export const CASINO_EMBLEMS = SHOP.filter((s) => s.kind === 'emblem').map((s) => (s as { value: string }).value);
export const CASINO_COLORS = SHOP.filter((s) => s.kind === 'color').map((s) => (s as { value: string }).value);
export const ownsExtra = (club: Pick<ClubState, 'casino'>, value: string) => (casinoOf(club).owned ?? []).includes(value);

/** Kaufen. Karten landen direkt im Haupt-Team-Bestand; XP vergibt die Oberfläche an die aktive Karriere. */
export function buy(club: ClubState, id: string, rand: Rand = Math.random): { club: ClubState; card?: CollectCard; xp?: number } | null {
  const item = SHOP.find((s) => s.id === id);
  const c = casinoOf(club);
  if (!item || c.chips < item.price) return null;
  if ((item.kind === 'emblem' || item.kind === 'color') && ((c.owned ?? []).includes(item.value) || vipLevel(c.vipPts) < (item.minVip ?? 0))) return null;
  let next = withCasino(club, (x) => ({ ...x, chips: x.chips - item.price, owned: item.kind === 'emblem' || item.kind === 'color' ? [...(x.owned ?? []), item.value] : x.owned }));
  if (item.kind === 'card') { const card = randomCard(item.tier, rand); next = addCard(next, card); return { club: next, card }; }
  if (item.kind === 'xp') return { club: next, xp: item.amount };
  return { club: next };
}

/** Fester Preis (z. B. Extra-Dreh am Glücksrad) – ohne Einsatz-Limit, zählt für VIP. */
export function spend(club: ClubState, amount: number): ClubState | null {
  const c = casinoOf(club);
  if (amount <= 0 || c.chips < amount) return null;
  return withCasino(club, (x) => ({ ...x, chips: x.chips - amount, vipPts: x.vipPts + amount }));
}

// ---------- Chip-Kasse: Spiel-Coins in Chips tauschen, Gratis-Nachschub wenn pleite ----------
export const CHIP_PACKS = [
  { coins: 1_000, chips: 1_000 },
  { coins: 5_000, chips: 5_500, tag: '+10 %' },
  { coins: 25_000, chips: 30_000, tag: '+20 %' },
  { coins: 100_000, chips: 130_000, tag: '+30 %', best: true },
] as const;
/** Coins gegen Chips tauschen. null = nicht genug Coins. */
export function buyChips(club: ClubState, pack: number): ClubState | null {
  const p = CHIP_PACKS[pack];
  if (!p || club.coins < p.coins) return null;
  return withCasino({ ...club, coins: club.coins - p.coins }, (c) => ({ ...c, chips: c.chips + p.chips }));
}
export const REFILL = 1_000;
export const REFILL_MIN = 100;
export const REFILL_MS = 3 * 60 * 60 * 1000;
/** Gratis-Nachschub: unter 100 Chips alle 3 Stunden 1.000 Chips. */
export function refillState(club: Pick<ClubState, 'casino'>, now = Date.now()): { broke: boolean; ready: boolean; waitMs: number } {
  const c = casinoOf(club);
  const broke = c.chips < REFILL_MIN;
  const waitMs = c.refillAt ? Math.max(0, c.refillAt + REFILL_MS - now) : 0;
  return { broke, ready: broke && waitMs === 0, waitMs };
}
export function claimRefill(club: ClubState, now = Date.now()): ClubState | null {
  if (!refillState(club, now).ready) return null;
  return withCasino(club, (c) => ({ ...c, chips: c.chips + REFILL, refillAt: now }));
}

/** Chips zurück in Coins tauschen (2 Chips = 1 Coin, ab 1.000 Chips) – so landen Casino-Gewinne im Shop und im Team. */
export const CASHOUT_RATE = 2;
export const CASHOUT_MIN = 1_000;
export function cashOutChips(club: ClubState, chips: number): ClubState | null {
  const c = casinoOf(club);
  const n = Math.floor(chips / CASHOUT_RATE) * CASHOUT_RATE;
  if (n < CASHOUT_MIN || n > c.chips) return null;
  return { ...club, coins: club.coins + n / CASHOUT_RATE, casino: { ...c, chips: c.chips - n } };
}


// ---------- Happy Hour: doppelte Level- und VIP-Punkte zu festen Zeiten ----------
export const HAPPY_HOURS: [number, number][] = [[12, 13], [19, 21]];
export function happyHour(now = new Date()): { active: boolean; endsAt: number; nextAt: number } {
  const h = now.getHours() + now.getMinutes() / 60;
  const at = (hour: number, dayOff = 0) => { const d = new Date(now); d.setDate(d.getDate() + dayOff); d.setHours(hour, 0, 0, 0); return d.getTime(); };
  for (const [a, b] of HAPPY_HOURS) if (h >= a && h < b) return { active: true, endsAt: at(b), nextAt: at(a) };
  const next = HAPPY_HOURS.find(([a]) => a > h);
  return { active: false, endsAt: 0, nextAt: next ? at(next[0]) : at(HAPPY_HOURS[0][0], 1) };
}

// ---------- Drops & Wins + Glücks-Serie ----------
/** Chance pro Runde auf einen Zufalls-Drop und seine Multiplikatoren (offen angezeigt). */
export const DROP_CHANCE = 1 / 120;
export const DROP_TABLE: [number, number][] = [[5, 50], [10, 30], [25, 14], [50, 5], [100, 1]];
export const DROP_MAX = 50_000;
export const STREAK_BONUS: Record<number, number> = { 3: 100, 5: 400, 7: 1_000, 10: 3_000 };
function extras(c: CasinoState, ev: PlayEvent, now: Date, rand: Rand): CasinoState {
  if (ev.bet <= 0) return c;
  let next = c;
  if (rand() < DROP_CHANCE) {
    const total = DROP_TABLE.reduce((a, [, w]) => a + w, 0);
    let r = rand() * total, mult = DROP_TABLE[0][0];
    for (const [m, w] of DROP_TABLE) { if ((r -= w) < 0) { mult = m; break; } }
    const amount = Math.min(DROP_MAX, Math.round(ev.bet * mult));
    next = { ...next, chips: next.chips + amount, lastDrop: { amount, mult, at: now.getTime() } };
  }
  const won = ev.win > ev.bet;
  const n = won ? (c.winStreak ?? 0) + 1 : 0;
  next = { ...next, winStreak: n };
  const bonus = STREAK_BONUS[n];
  if (bonus) next = { ...next, chips: next.chips + bonus, lastStreak: { n, bonus, at: now.getTime() } };
  return next;
}

// ---------- Mystery-Box: alle 30 Runden eine, Chancen offen ----------
export const BOX_EVERY = 30;
export type BoxPrize = { kind: 'chips'; amount: number } | { kind: 'spins'; amount: number } | { kind: 'card'; card: CollectCard; tier: ShopCardTier };
export const BOX_ODDS: { label: string; w: number }[] = [
  { label: '500–1.500 Chips', w: 48 }, { label: '10 Gratis-Drehs', w: 22 }, { label: '3.000–8.000 Chips', w: 17 },
  { label: 'Karte 80–86', w: 9 }, { label: 'Top-Karte 87–91', w: 3 }, { label: 'Ikone oder 92+', w: 1 },
];
export function boxesReady(club: Pick<ClubState, 'casino'>): number {
  const c = casinoOf(club);
  return Math.max(0, Math.floor(c.stats.rounds / BOX_EVERY) - (c.boxes ?? 0));
}
export const roundsToBox = (club: Pick<ClubState, 'casino'>) => BOX_EVERY - (casinoOf(club).stats.rounds % BOX_EVERY);
export function openBox(club: ClubState, now = new Date(), rand: Rand = Math.random): { club: ClubState; prize: BoxPrize } | null {
  if (boxesReady(club) <= 0) return null;
  const total = BOX_ODDS.reduce((a, o) => a + o.w, 0);
  let r = rand() * total, i = 0;
  for (; i < BOX_ODDS.length; i++) if ((r -= BOX_ODDS[i].w) < 0) break;
  let next = withCasino(club, (c) => ({ ...c, boxes: (c.boxes ?? 0) + 1 }));
  let prize: BoxPrize;
  if (i === 0) prize = { kind: 'chips', amount: 500 + Math.round(rand() * 10) * 100 };
  else if (i === 1) prize = { kind: 'spins', amount: 10 };
  else if (i === 2) prize = { kind: 'chips', amount: 3_000 + Math.round(rand() * 10) * 500 };
  else { const tier: ShopCardTier = i === 3 ? 'gold' : i === 4 ? 'top' : 'icon'; prize = { kind: 'card', card: randomCard(tier, rand), tier }; }
  if (prize.kind === 'chips') next = withCasino(next, (c) => ({ ...c, chips: c.chips + (prize as { amount: number }).amount }));
  if (prize.kind === 'spins') next = withCasino(next, (c) => { const g = giftSpins(next, now); return { ...c, gift: { day: seasonId(now), left: g.left + 10 } }; });
  if (prize.kind === 'card') next = addCard(next, prize.card);
  return { club: next, prize };
}

// ---------- Rubbellos ----------
/** Gewinnklassen pro Los (Vielfaches vom Lospreis) mit Wahrscheinlichkeit – Auszahlungsquote ca. 95 %. */
export const SCRATCH_TABLE: { mult: number; p: number; sym: Sym }[] = [
  { mult: 1, p: 0.2, sym: 'ball' }, { mult: 2, p: 0.12, sym: 'boot' }, { mult: 3, p: 0.05, sym: 'shirt' },
  { mult: 5, p: 0.03, sym: 'whistle' }, { mult: 10, p: 0.012, sym: 'star' }, { mult: 50, p: 0.0012, sym: 'trophy' }, { mult: 500, p: 0.00005, sym: 'crown' },
];
export const scratchRtp = () => SCRATCH_TABLE.reduce((a, t) => a + t.mult * t.p, 0);
/** Ein Los: 9 Felder, 3 gleiche Symbole gewinnen. Ergebnis wird zuerst ausgelost, dann verteilt. */
export function scratchTicket(rand: Rand = Math.random): { cells: Sym[]; mult: number; sym: Sym | null } {
  let r = rand(), hit: (typeof SCRATCH_TABLE)[number] | null = null;
  for (const t of SCRATCH_TABLE) { if (r < t.p) { hit = t; break; } r -= t.p; }
  const syms = SCRATCH_TABLE.map((t) => t.sym);
  const cells: Sym[] = [];
  if (hit) cells.push(hit.sym, hit.sym, hit.sym);
  // Rest: höchstens 2 von jedem anderen Symbol, damit kein zweiter Gewinn entsteht
  const count: Partial<Record<Sym, number>> = hit ? { [hit.sym]: 3 } : {};
  while (cells.length < 9) {
    const s2 = syms[Math.floor(rand() * syms.length)];
    if ((count[s2] ?? 0) >= 2 && s2 !== hit?.sym) continue;
    if (s2 === hit?.sym) continue;
    count[s2] = (count[s2] ?? 0) + 1; cells.push(s2);
  }
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  return { cells, mult: hit?.mult ?? 0, sym: hit?.sym ?? null };
}
