import { expect, it } from 'vitest';
import { freshClub, type ClubState } from '../club';
import {
  JACKPOT_SEED, PLINKO, PLINKO_P, RTP, SHOP, START_CHIPS, VIP, bigWinOf, bjReturn, buy, casinoOf, claimDaily, claimQuest, crashPoint, dailyBonus,
  evalGrid, handValue, minesMult, payout, placeBet, placeMines, questList, rouletteReturn, takeJackpot, vipLevel, type BjCard, type Sym,
} from '../casino';

const day = (s: string) => new Date(`${s}T12:00:00`);
const seq = (...xs: number[]) => { let i = 0; return () => xs[i++ % xs.length]; };

it('Start: 1.000 Chips, Einsatz-Limit nach VIP-Stufe, Jackpot wächst mit', () => {
  let c = freshClub();
  expect(casinoOf(c).chips).toBe(START_CHIPS);
  expect(placeBet(c, 2000)).toBeNull(); // mehr als vorhanden
  c = { ...c, casino: { ...casinoOf(c), chips: 10_000 } };
  expect(placeBet(c, 600)).toBeNull(); // Bronze: max. 500
  const b = placeBet(c, 500)!;
  expect(casinoOf(b).chips).toBe(9_500);
  expect(casinoOf(b).vipPts).toBe(500);
  expect(casinoOf(b).jackpot).toBe(JACKPOT_SEED + 5);
  expect(vipLevel(VIP[2].min)).toBe(2);
  const { club, amount } = takeJackpot(b);
  expect(amount).toBe(JACKPOT_SEED + 5);
  expect(casinoOf(club).jackpot).toBe(JACKPOT_SEED);
});

it('Tagesbonus: einmal am Tag, Serie steigt, Lücke setzt zurück', () => {
  let c = freshClub();
  const a = claimDaily(c, day('2026-11-10'));
  expect(a.amount).toBe(250);
  expect(claimDaily(a.club, day('2026-11-10')).amount).toBe(0);
  c = claimDaily(a.club, day('2026-11-11')).club;
  expect(dailyBonus(c, day('2026-11-12')).streak).toBe(3);
  expect(dailyBonus(c, day('2026-11-12')).amount).toBe(Math.round(250 * 1.3));
  expect(dailyBonus(c, day('2026-11-14')).streak).toBe(1);
});

it('Spielregeln: Crash, Minen, Plinko, Roulette, Blackjack', () => {
  expect(crashPoint(() => 0)).toBe(1); // 0,97 → sofort gehalten
  expect(crashPoint(() => 0.9)).toBeCloseTo(9.7, 1);
  expect(minesMult(3, 0)).toBeCloseTo(RTP, 2);
  expect(minesMult(3, 1)).toBeCloseTo(Math.floor(RTP * 25 / 22 * 100) / 100, 2);
  expect(placeMines(5, seq(0.1, 0.5, 0.9, 0.3))).toHaveLength(5);
  for (const r of Object.values(PLINKO)) {
    const ev = r.reduce((a, m, k) => a + m * PLINKO_P[k], 0);
    expect(ev).toBeGreaterThan(0.94);
    expect(ev).toBeLessThan(0.99);
  }
  expect(rouletteReturn('red', 100, 1)).toBe(200);
  expect(rouletteReturn('red', 100, 0)).toBe(0);
  expect(rouletteReturn('n17', 10, 17)).toBe(360);
  expect(rouletteReturn('d3', 10, 30)).toBe(30);
  const c = (rank: number): BjCard => ({ rank, suit: 0 });
  expect(handValue([c(1), c(13)]).total).toBe(21);
  expect(handValue([c(1), c(9), c(5)]).total).toBe(15);
  expect(bjReturn([c(1), c(12)], [c(10), c(9)], 100)).toEqual({ ret: 250, outcome: 'bj' });
  expect(bjReturn([c(10), c(9)], [c(10), c(9)], 100).outcome).toBe('push');
  expect(bjReturn([c(10), c(9), c(5)], [c(10), c(7)], 100).ret).toBe(0);
});

it('Slots: Linien von links, Krone als Joker', () => {
  const grid: Sym[][] = [['ball', 'star', 'boot'], ['ball', 'crown', 'boot'], ['ball', 'star', 'shirt'], ['shirt', 'boot', 'shirt'], ['boot', 'boot', 'boot']];
  const e = evalGrid(grid, 100);
  const top = e.lines.find((l) => l.line === 1)!; // obere Reihe: Ball ×3
  expect(top.sym).toBe('ball');
  expect(top.count).toBe(3);
  const mid = e.lines.find((l) => l.line === 0)!; // mittlere Reihe: Stern, Krone, Stern
  expect(mid.sym).toBe('star');
  expect(mid.count).toBe(3);
});

it('Aufgaben, Big Win, Shop', () => {
  const now = day('2026-11-18');
  let c: ClubState = { ...freshClub(), casino: { ...casinoOf(freshClub()), chips: 50_000 } };
  const q = questList(c, now);
  expect(q).toHaveLength(3);
  expect(bigWinOf(100, 900)).toBe('big');
  expect(bigWinOf(100, 5000)).toBe('epic');
  // Alle drei Aufgaben erfüllen
  const evs = [
    ...Array.from({ length: 20 }, () => ({ game: 'slots' as const, bet: 10, win: 0 })),
    ...Array.from({ length: 20 }, () => ({ game: 'plinko' as const, bet: 10, win: 0 })),
    ...Array.from({ length: 5 }, () => ({ game: 'roulette' as const, bet: 10, win: 0 })),
    ...Array.from({ length: 3 }, () => ({ game: 'blackjack' as const, bet: 10, win: 20 })),
    { game: 'crash' as const, bet: 10, win: 40, mult: 4 }, { game: 'mines' as const, bet: 10, win: 30, safe: 6 },
    { game: 'slots' as const, bet: 10, win: 200 },
    ...Array.from({ length: 3 }, () => ({ game: 'bets' as const, bet: 10, win: 50, legs: 5 })),
  ];
  for (const e of evs) c = payout(c, e, now);
  const done = questList(c, now);
  expect(done.every((x) => x.have >= x.quest.goal)).toBe(true);
  const before = casinoOf(c).chips;
  c = claimQuest(c, done[0].quest.id, now);
  expect(casinoOf(c).chips).toBe(before + done[0].quest.reward);
  expect(claimQuest(c, done[0].quest.id, now)).toBe(c);
  // Shop: Karte landet im Bestand, Extras nur einmal, VIP-Sperre
  const r = buy(c, 'card-gold')!;
  expect(r.card!.ovr).toBeGreaterThanOrEqual(80);
  expect(r.club.cards[r.card!.id]).toBeGreaterThanOrEqual(1);
  const em = buy(c, 'em-dice')!;
  expect(buy(em.club, 'em-dice')).toBeNull();
  expect(buy(c, 'em-key')).toBeNull(); // erst ab Platin
  expect(SHOP.length).toBeGreaterThan(5);
});
