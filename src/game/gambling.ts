import { REAL_PLAYERS, type RealPlayerTemplate } from '../data/players';
import { randInt } from './random';
import type { Career } from './types';

// Casino unter „Vermögen“: Roulette und Pferdewetten mit Coins aus dem Club. Die Bank gewinnt auf Dauer immer.
// Verborgen: Wer oft spielt, große Gewinne erlebt oder Verlusten hinterherjagt, kann spielsüchtig werden –
// das steht nirgends, aber ab dann verschwindet in jeder Pause das ganze Geld (wie bei den Drogen).
// Wer viel verzockt und pleite ist, landet nach der Karriere im Trash-TV.

export const BETS = [1_000, 10_000, 100_000, 1_000_000];

// ---------- Roulette ----------
// Europäisches Roulette: 37 Felder (0–36). Einfache Chancen zahlen ×2, Dutzende ×3, eine einzelne Zahl ×36.
/** Einfache Chancen, Dutzende oder eine Zahl als `n0` … `n36` ('green' = alte Schreibweise für die Null). */
export type RouletteBet = 'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | 'd1' | 'd2' | 'd3' | 'green' | `n${number}`;
export const ROULETTE: Record<'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | 'd1' | 'd2' | 'd3', { label: string; payout: number }> = {
  red: { label: 'Rot', payout: 2 },
  black: { label: 'Schwarz', payout: 2 },
  even: { label: 'Gerade', payout: 2 },
  odd: { label: 'Ungerade', payout: 2 },
  low: { label: '1–18', payout: 2 },
  high: { label: '19–36', payout: 2 },
  d1: { label: '1–12', payout: 3 },
  d2: { label: '13–24', payout: 3 },
  d3: { label: '25–36', payout: 3 },
};
/** Reihenfolge der Zahlen auf dem Kessel (im Uhrzeigersinn, ab der Null). */
export const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const colorOf = (n: number) => (n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black');

const singleOf = (bet: RouletteBet): number | null => (bet === 'green' ? 0 : bet.startsWith('n') ? Number(bet.slice(1)) : null);

export function rouletteWins(bet: RouletteBet, n: number): boolean {
  const single = singleOf(bet);
  if (single !== null) return n === single;
  if (n === 0) return false;
  switch (bet) {
    case 'red': case 'black': return colorOf(n) === bet;
    case 'even': return n % 2 === 0;
    case 'odd': return n % 2 === 1;
    case 'low': return n <= 18;
    case 'high': return n >= 19;
    case 'd1': return n <= 12;
    case 'd2': return n >= 13 && n <= 24;
    default: return n >= 25;
  }
}

/** Anzeige einer Wette: Name, Auszahlung (×) und ehrliche Gewinnchance. */
export function rouletteInfo(bet: RouletteBet): { label: string; payout: number; chance: number } {
  const single = singleOf(bet);
  if (single !== null) return { label: single === 0 ? 'Null' : `Zahl ${single}`, payout: 36, chance: 1 / 37 };
  const r = ROULETTE[bet as keyof typeof ROULETTE];
  return { label: r.label, payout: r.payout, chance: (r.payout === 3 ? 12 : 18) / 37 };
}

// ---------- Pferdewetten ----------
export interface Horse { name: string; odds: number }
export const HORSES: Horse[] = [
  { name: 'Blitz von Hannover', odds: 2.5 },
  { name: 'Balotellis Laune', odds: 4 },
  { name: 'Kugelblitz Ailton', odds: 5 },
  { name: 'Goldene Ananas', odds: 8 },
  { name: 'Dorfverein United', odds: 15 },
  { name: 'Letzte Hoffnung', odds: 30 },
];
/** Gewinnchance eines Pferdes: etwas unter dem fairen Wert (Buchmacher-Marge). */
export const horseChance = (h: Horse) => 0.86 / h.odds;

export interface GambleResult {
  win: boolean;
  /** Ausgezahlter Betrag (0 bei Verlust). */
  payout: number;
  /** Roulette: gefallene Zahl. Pferde: Siegerpferd (Index). */
  outcome: number;
  /** Platzierung aller Pferde (Index in HORSES), Sieger zuerst. */
  order?: number[];
}

export function playRoulette(bet: RouletteBet, stake: number, rand = Math.random): GambleResult {
  const n = Math.floor(rand() * 37);
  const win = rouletteWins(bet, n);
  return { win, payout: win ? stake * rouletteInfo(bet).payout : 0, outcome: n };
}

export function playHorses(pick: number, stake: number, rand = Math.random): GambleResult {
  // Sieger ziehen nach Gewinnchancen, der Rest zufällig dahinter.
  const weights = HORSES.map(horseChance);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  let winner = weights.findIndex((w) => (r -= w) < 0);
  if (winner < 0) winner = 0;
  const rest = HORSES.map((_, i) => i).filter((i) => i !== winner).sort(() => rand() - 0.5);
  const win = winner === pick;
  return { win, payout: win ? Math.round(stake * HORSES[pick].odds) : 0, outcome: winner, order: [winner, ...rest] };
}

/**
 * Rennverlauf für die Animation: Position jedes Pferdes (0–100 % der Bahn) nach 25/50/75/100 % der Zeit.
 * Unterwegs wird überholt, das Ziel steht aber vorher fest (`order`) – die Animation zeigt nur, was gezogen wurde.
 */
export function raceLegs(order: number[], rand = Math.random): number[][] {
  const legs: number[][] = HORSES.map(() => [0, 0, 0, 0]);
  order.forEach((horse, place) => {
    const end = 100 - place * 7;
    legs[horse] = [0.25, 0.5, 0.75].map((f) => Math.min(96, Math.max(4, end * f + (rand() - 0.5) * 22))).concat(end);
  });
  return legs;
}

// ---------- Elfmeter-Serie ----------
// Bis zu fünf Elfmeter. Jeder Treffer erhöht den Gewinn, nach jedem Tor darf man kassieren.
// Der Torwart springt zufällig in eine der drei Ecken; dazu geht jeder 25. Schuss drüber.
// Trefferchance also 2/3 × 0,96 = 64 % – die Stufen sind so gewählt, dass die Bank auf Dauer gewinnt.
export const PEN_MULT = [1.5, 2.3, 3.5, 5.4, 8.3];
export const PEN_CHANCE = (2 / 3) * 0.96;
export type Corner = 0 | 1 | 2;
export const CORNERS = ['Links', 'Mitte', 'Rechts'] as const;

export interface PenaltyShot { goal: boolean; keeper: Corner; over: boolean }
export function shootPenalty(corner: Corner, rand = Math.random): PenaltyShot {
  const keeper = Math.min(2, Math.floor(rand() * 3)) as Corner;
  const over = rand() < 0.04;
  return { goal: !over && keeper !== corner, keeper, over };
}

// ---------- Sololauf (steigender Multiplikator) ----------
// Du läufst aufs Tor, der Multiplikator steigt. Irgendwann kommt die Grätsche – wer vorher abschließt, kassiert.
// Der Zeitpunkt der Grätsche steht beim Anlauf fest: P(Grätsche erst ab ×m) = 0,96 / m.
export const SOLO_EDGE = 0.96;
export const SOLO_CAP = 50;
/** Multiplikator nach t Millisekunden Lauf (×2 nach 4 s, ×10 nach gut 13 s). */
export const soloMult = (ms: number) => Math.min(SOLO_CAP, Math.floor(Math.exp((ms * Math.LN2) / 4000) * 100) / 100);
/** Ab welcher Laufzeit (ms) ein Multiplikator erreicht ist – Umkehrung von soloMult. */
export const soloTimeFor = (m: number) => (Math.log(m) * 4000) / Math.LN2;
/** Grätsche-Punkt: 1,00 heißt sofort weg (4 %). */
export function soloCrash(rand = Math.random): number {
  const u = rand();
  const c = SOLO_EDGE / Math.max(1e-9, 1 - u);
  return c < 1 ? 1 : Math.min(SOLO_CAP, Math.floor(c * 100) / 100);
}
/** Ehrliche Chance, mindestens ×m zu erreichen. */
export const soloChance = (m: number) => Math.min(1, SOLO_EDGE / m);

// ---------- Kartenduell (höher oder tiefer) ----------
// Gezogen wird ein echter Spieler. Ist der nächste höher oder tiefer bewertet? Gleichstand verliert.
// Auszahlung je Tipp = 0,94 / Chance – die Bank behält 6 %.
export const HILO_POOL: RealPlayerTemplate[] = REAL_PLAYERS;
export type HiLo = 'higher' | 'lower';
export function hiloChance(r: number, dir: HiLo, pool: { ovr: number }[] = HILO_POOL): number {
  const n = pool.filter((x) => (dir === 'higher' ? x.ovr > r : x.ovr < r)).length;
  return n / pool.length;
}
export function hiloMult(r: number, dir: HiLo, pool: { ovr: number }[] = HILO_POOL): number {
  const p = hiloChance(r, dir, pool);
  return p > 0 ? Math.max(1.01, Math.floor((0.94 / p) * 100) / 100) : 0;
}
export const drawHilo = (rand = Math.random, pool = HILO_POOL) => pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];

/**
 * Nach jedem Spiel: Statistik und verborgene Spielsucht. Je mehr gespielt, je höher der Einsatz,
 * und vor allem nach großen Gewinnen oder Verlustserien steigt das Risiko.
 */
export function afterGamble(prev: Career, stake: number, res: GambleResult, coinsBefore: number, rand = Math.random): Career {
  const career: Career = structuredClone(prev);
  const g = (career.gambling ??= { bets: 0, won: 0, lost: 0, streak: 0 });
  g.bets++;
  if (res.win) {
    g.won += res.payout - stake;
    g.streak = 0;
  } else {
    g.lost += stake;
    g.streak++;
    career.squandered = (career.squandered ?? 0) + stake;
  }
  const allIn = stake >= coinsBefore * 0.5;
  const bigWin = res.win && res.payout - stake >= 30_000;
  const risk = 0.02 + (allIn ? 0.05 : 0) + (bigWin ? 0.08 : 0) + (g.streak >= 3 ? 0.06 : 0) + Math.min(0.06, g.bets * 0.002);
  if (!career.player.gambler && rand() < risk) career.player.gambler = true;
  career.updatedAt = Date.now();
  return career;
}

// ---------- Pleite: Trash-TV nach der Karriere ----------

export type BrokeId = 'jungle' | 'boxing' | 'doku';
export interface BrokeOption { id: BrokeId; icon: string; name: string; text: string }
export const BROKE_OPTIONS: BrokeOption[] = [
  { id: 'jungle', icon: '🌴', name: 'Dschungelcamp', text: 'Zwei Wochen Kakerlaken, Känguru-Hoden und Lagerfeuer-Drama. Sichere Gage, ein bisschen Glamour – und viel Spott.' },
  { id: 'boxing', icon: '🥊', name: 'Promi-Boxkampf', text: 'Gegen einen Reality-Star in den Ring. Sieg: dicke Prämie. Niederlage: kleine Gage und ein Meme für die Ewigkeit.' },
  { id: 'doku', icon: '📺', name: 'Doku „Pleite & prominent“', text: 'Ein Kamerateam begleitet deinen Absturz. Wenig Geld, viel Mitleid – manchmal der Anfang eines Comebacks.' },
];

/** Pleite-Pfad offen? Karriere vorbei, viel Geld verzockt bzw. verprasst und kaum noch Coins. */
export function isBroke(career: Career, coins: number): boolean {
  return career.phase === 'retired' && (career.squandered ?? 0) >= 30_000 && coins < 5_000;
}

export function brokeOptionUsed(career: Career, id: BrokeId): boolean {
  return (career.brokeDone ?? []).includes(id);
}

/** Trash-TV-Auftritt. Gibt Spielstand und verdiente Coins zurück. */
export function doBroke(prev: Career, id: BrokeId, coins: number, rand = Math.random): { career: Career; coins: number; text: string } {
  if (!isBroke(prev, coins) || brokeOptionUsed(prev, id)) return { career: prev, coins: 0, text: '' };
  const career: Career = structuredClone(prev);
  career.brokeDone = [...(career.brokeDone ?? []), id];
  career.updatedAt = Date.now();
  if (id === 'jungle') {
    const gage = randInt(35, 50) * 1000;
    career.glam = Math.min(12, (career.glam ?? 0) + 2);
    const king = rand() < 0.25;
    return { career, coins: gage + (king ? 25_000 : 0), text: king ? `👑 Dschungelkönig! ${fmtK(gage + 25_000)} Coins und ganz Deutschland liebt dich wieder.` : `Platz ${randInt(3, 9)} im Dschungel. ${fmtK(gage)} Coins Gage – und ein Kakerlaken-Trauma.` };
  }
  if (id === 'boxing') {
    if (rand() < 0.5) return { career, coins: 80_000, text: '🥊 K.o. in Runde 3! Du gewinnst den Promi-Boxkampf: 80.000 Coins Prämie.' };
    return { career, coins: 20_000, text: '🥊 Nach 47 Sekunden am Boden. 20.000 Coins Gage – und das GIF geht um die Welt.' };
  }
  const gage = randInt(10, 18) * 1000;
  career.player.gambler = rand() < 0.4 ? false : career.player.gambler;
  return { career, coins: gage, text: `📺 Die Doku läuft zur Primetime. ${fmtK(gage)} Coins – und viele Zuschauer schreiben dir Mut zu.` };
}

const fmtK = (n: number) => n.toLocaleString('de-DE');
