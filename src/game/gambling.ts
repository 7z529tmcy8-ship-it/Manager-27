import { randInt } from './random';
import type { Career } from './types';

// Casino unter „Vermögen“: Roulette und Pferdewetten mit Coins aus dem Club. Die Bank gewinnt auf Dauer immer.
// Verborgen: Wer oft spielt, große Gewinne erlebt oder Verlusten hinterherjagt, kann spielsüchtig werden –
// das steht nirgends, aber ab dann verschwindet in jeder Pause das ganze Geld (wie bei den Drogen).
// Wer viel verzockt und pleite ist, landet nach der Karriere im Trash-TV.

export const BETS = [1_000, 5_000, 25_000, 100_000];

// ---------- Roulette ----------
export type RouletteBet = 'red' | 'black' | 'green' | 'even' | 'odd';
export const ROULETTE: Record<RouletteBet, { label: string; payout: number }> = {
  red: { label: '🔴 Rot', payout: 2 },
  black: { label: '⚫ Schwarz', payout: 2 },
  even: { label: 'Gerade', payout: 2 },
  odd: { label: 'Ungerade', payout: 2 },
  green: { label: '🟢 Null', payout: 36 },
};
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const colorOf = (n: number) => (n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black');

function rouletteWins(bet: RouletteBet, n: number): boolean {
  if (bet === 'green') return n === 0;
  if (n === 0) return false;
  if (bet === 'red' || bet === 'black') return colorOf(n) === bet;
  return bet === 'even' ? n % 2 === 0 : n % 2 === 1;
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
const horseChance = (h: Horse) => 0.86 / h.odds;

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
  return { win, payout: win ? stake * ROULETTE[bet].payout : 0, outcome: n };
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
