import { postInbox } from './inbox';
import { addNews } from './news';
import { cashOf, formatMoney } from './player';
import { clamp } from './random';
import type { Career, CasinoSpin } from './types';

// Nur Spielgeld: Das Gehalt des Spielers landet auf seinem Konto, im Glückspalast kann er es verzocken.
// Die Auszahlungsquote liegt bei gut 90 % – auf Dauer gewinnt also die Bank, wie im echten Leben.

export interface SlotSymbol {
  id: string;
  icon: string;
  /** Häufigkeit auf der Walze. */
  weight: number;
  /** Auszahlung (× Einsatz) bei drei Gleichen. */
  pay3: number;
}

export const SYMBOLS: SlotSymbol[] = [
  { id: 'seven', icon: '7️⃣', weight: 1, pay3: 50 },
  { id: 'trophy', icon: '🏆', weight: 2, pay3: 20 },
  { id: 'boot', icon: '👟', weight: 3, pay3: 10 },
  { id: 'ball', icon: '⚽', weight: 4, pay3: 8 },
  { id: 'glove', icon: '🧤', weight: 5, pay3: 5 },
  { id: 'pretzel', icon: '🥨', weight: 6, pay3: 4 },
];
/** Zwei Gleiche: etwas mehr als der Einsatz zurück. Zwei Siebenen: ×5. */
export const PAY2 = 1.3;
export const PAY2_SEVEN = 5;
/** Anzahl Drehungen, ab der die Presse aufmerksam wird. */
const PAPARAZZI_EVERY = 20;

const TOTAL_WEIGHT = SYMBOLS.reduce((a, s) => a + s.weight, 0);

export function randomSymbol(): string {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const s of SYMBOLS) if ((r -= s.weight) < 0) return s.id;
  return SYMBOLS[SYMBOLS.length - 1].id;
}

export const symbolIcon = (id: string) => SYMBOLS.find((s) => s.id === id)?.icon ?? '❔';

/** Auszahlungsfaktor für ein Walzenergebnis. */
export function payoutFactor(reels: string[]): number {
  const [a, b, c] = reels;
  if (a === b && b === c) return SYMBOLS.find((s) => s.id === a)!.pay3;
  const pair = a === b || a === c ? a : b === c ? b : null;
  if (!pair) return 0;
  return pair === 'seven' ? PAY2_SEVEN : PAY2;
}

export function betOptions(career: Career): { label: string; amount: number }[] {
  const cash = cashOf(career);
  const wage = career.player.contract.wage;
  const opts = [
    { label: '1 Tsd.', amount: 1_000 },
    { label: '½ Wochengehalt', amount: Math.max(1_000, Math.round(wage / 2 / 500) * 500) },
    { label: 'Wochengehalt', amount: wage },
    { label: '10 Wochen', amount: wage * 10 },
  ].filter((o, i, all) => all.findIndex((x) => x.amount === o.amount) === i);
  if (cash > 0) opts.push({ label: 'All-in', amount: cash });
  return opts;
}

/** Einmal drehen. Liefert die neue Karriere; das Ergebnis steht in `career.casino.last`. */
export function spin(prev: Career, bet: number): Career {
  const cash = cashOf(prev);
  const stake = Math.floor(bet);
  if (stake <= 0 || stake > cash) return prev;
  const career: Career = structuredClone(prev);
  const reels = [randomSymbol(), randomSymbol(), randomSymbol()];
  const factor = payoutFactor(reels);
  const win = Math.round(stake * factor);
  career.cash = cash - stake + win;
  const stats = career.casino ?? { spins: 0, wagered: 0, won: 0, biggestWin: 0, jackpots: 0 };
  stats.spins += 1;
  stats.wagered += stake;
  stats.won += win;
  stats.biggestWin = Math.max(stats.biggestWin, win);
  const last: CasinoSpin = { reels, bet: stake, win, factor };
  stats.last = last;
  const p = career.player;
  if (reels.every((r) => r === 'seven')) {
    stats.jackpots += 1;
    postInbox(career, { kind: 'casino', title: 'JACKPOT 777!', text: `Du hast ${formatMoney(win)} am Automaten gewonnen.` });
    addNews(career, 2, 'Du', `JACKPOT! ${p.name} knackt im Glückspalast die 777 und gewinnt ${formatMoney(win)}.`);
  } else if (stake === cash && win === 0 && stake >= p.contract.wage) {
    addNews(career, 2, 'Du', `All-in und alles weg: ${p.name} verzockt ${formatMoney(stake)} am Automaten.`);
  }
  // Wer zu oft im Casino sitzt, wird fotografiert – der Trainer findet das nicht gut.
  if (stats.spins % PAPARAZZI_EVERY === 0) {
    p.morale = clamp((p.morale ?? 0) - 1, -3, 3);
    addNews(career, 2, 'Du', `Paparazzi-Foto: ${p.name} schon wieder im Casino. Der Trainer ist „not amused“.`);
    last.paparazzi = true;
  }
  career.casino = stats;
  career.updatedAt = Date.now();
  return career;
}
