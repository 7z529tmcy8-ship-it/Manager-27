import { expect, it } from 'vitest';
import { freshClub, type ClubState } from '../club';
import {
  JACKPOT_SEED, PLINKO, PLINKO_P, RTP, SHOP, START_CHIPS, VIP, bigWinOf, bjReturn, buy, casinoOf, claimDaily, claimQuest, crashPoint, dailyBonus,
  scratchRtp, scratchTicket, openBox, boxesReady, happyHour, BOX_EVERY,
  levelReward, casinoLevel, cashback, claimCashback, giftSpins, takeGiftSpin, tourBoard, tourReward, claimTour, weekId,
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
  expect(casinoOf(b).chips).toBe(9_500 + levelReward(1)); // 500 Einsatz = Casino-Level 1 → Belohnung
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
  expect(PLINKO.mid).toHaveLength(13);
  expect(PLINKO_P.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
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

it('Chip-Kasse: Coins tauschen mit Bonus, Gratis-Nachschub nur wenn pleite und alle 3 Stunden', async () => {
  const { CHIP_PACKS, buyChips, claimRefill, refillState, REFILL_MS } = await import('../casino');
  let c: ClubState = { ...freshClub(), coins: 30_000 };
  expect(buyChips(c, 3)).toBeNull();
  c = buyChips(c, 2)!;
  expect(c.coins).toBe(5_000);
  expect(casinoOf(c).chips).toBe(START_CHIPS + CHIP_PACKS[2].chips);
  expect(claimRefill(c, 1_000)).toBeNull(); // nicht pleite
  const broke: ClubState = { ...c, casino: { ...casinoOf(c), chips: 20 } };
  const r = claimRefill(broke, 1_000)!;
  expect(casinoOf(r).chips).toBe(1_020);
  const again: ClubState = { ...r, casino: { ...casinoOf(r), chips: 0 } };
  expect(refillState(again, 1_000 + 60_000).ready).toBe(false);
  expect(claimRefill(again, 1_000 + REFILL_MS)).not.toBeNull();
});

it('Plinko: alle Reihen/Risiken zahlen inkl. Goldball 94–98 % zurück, Rand ist der Peak, Gewinn gedeckelt', async () => {
  const { PLINKO_ROWS_OPTIONS, RISKS, plinkoTable, plinkoP, GOLD_CHANCE, GOLD_MULT, dropBall, plinkoWin, PLINKO_MAX_WIN } = await import('../casino');
  for (const n of PLINKO_ROWS_OPTIONS) for (const r of RISKS) {
    const t = plinkoTable(n, r);
    expect(t).toHaveLength(n + 1);
    expect(t[0]).toBe(t[n]);
    expect(Math.max(...t)).toBe(t[0]);
    const ev = t.reduce((a, m, k) => a + m * plinkoP(n)[k], 0) * (1 + GOLD_CHANCE * (GOLD_MULT - 1));
    expect(ev).toBeGreaterThan(0.94);
    expect(ev).toBeLessThan(0.98);
  }
  expect(plinkoTable(16, 'extreme')[0]).toBeGreaterThan(5000);
  const d = dropBall(() => 0.7, 16);
  expect(d.path).toHaveLength(16);
  expect(d.slot).toBe(16);
  expect(plinkoWin(100, 3, true)).toBe(600);
  expect(plinkoWin(100_000, 10_000, true)).toBe(PLINKO_MAX_WIN);
});

it('Casino-Level: Fortschritt mit jedem Einsatz, Belohnung bei jedem Aufstieg genau einmal', () => {
  expect(casinoLevel(0).level).toBe(0);
  expect(casinoLevel(400).level).toBe(1);
  let c: ClubState = { ...freshClub(), casino: { ...casinoOf(freshClub()), chips: 100_000 } };
  for (let i = 0; i < 10; i++) c = placeBet(c, 500)!;
  const lv = casinoLevel(5_000).level;
  let sum = 0; for (let l = 1; l <= lv; l++) sum += levelReward(l);
  expect(casinoOf(c).chips).toBe(100_000 - 5_000 + sum);
  expect(casinoOf(c).levelPaid).toBe(lv);
});

it('Cashback: Teil des Verlusts von gestern kommt heute zurück, nur einmal', () => {
  let c: ClubState = { ...freshClub(), casino: { ...casinoOf(freshClub()), chips: 10_000, levelPaid: 99 } };
  const y = day('2026-11-10'), t = day('2026-11-11');
  c = placeBet(c, 400)!; // ohne Zeit: heute – deshalb direkt Zustand setzen
  c = { ...c, casino: { ...casinoOf(c), cb: { day: '2026-11-10', wagered: 2_000, won: 500 }, cbOpen: undefined } };
  expect(cashback(c, y).ready).toBe(false); // am selben Tag noch nichts
  const cb = cashback(c, t);
  expect(cb.amount).toBe(Math.floor(1_500 * cb.pct));
  const r = claimCashback(c, t);
  expect(r.amount).toBe(cb.amount);
  expect(cashback(r.club, t).ready).toBe(false);
});

it('Gratis-Drehungen: 10 pro Tag', () => {
  let c = freshClub();
  const now = day('2026-11-11');
  expect(giftSpins(c, now).left).toBe(10);
  for (let i = 0; i < 10; i++) c = takeGiftSpin(c, now)!;
  expect(takeGiftSpin(c, now)).toBeNull();
  expect(giftSpins(c, day('2026-11-12')).left).toBe(10);
});

it('Wochen-Turnier: bester Multiplikator zählt, Preis in der Folgewoche einmal abholbar', () => {
  const mon = day('2026-11-09'), thu = day('2026-11-12'), next = day('2026-11-17');
  expect(weekId(thu)).toBe('2026-11-09');
  let c: ClubState = { ...freshClub(), casino: { ...casinoOf(freshClub()), chips: 10_000 } };
  c = payout(c, { game: 'plinko', bet: 100, win: 99_900 }, mon); // 999×: sicher Platz 1
  expect(tourBoard(c, thu).rank).toBe(1);
  expect(tourReward(c, thu)).toBeNull();
  const r = claimTour(c, next);
  expect(r.prize).toBe(25_000);
  expect(claimTour(r.club, next).prize).toBe(0);
});

it('All-in: das ganze Guthaben geht immer, auch über dem VIP-Limit – mehr nicht', () => {
  const c: ClubState = { ...freshClub(), casino: { ...casinoOf(freshClub()), chips: 3_000, vipPts: 0, levelPaid: 99 } };
  expect(placeBet(c, 2_000)).toBeNull(); // Bronze: max. 500
  const all = placeBet(c, 3_000)!;
  expect(casinoOf(all).chips).toBe(0);
  expect(placeBet(c, 3_001)).toBeNull();
});

it('Rubbellos: Quote ca. 95 %, genau ein Gewinnsymbol dreifach oder keins', () => {
  expect(scratchRtp()).toBeGreaterThan(0.93);
  expect(scratchRtp()).toBeLessThan(0.97);
  for (let i = 0; i < 300; i++) {
    const t = scratchTicket();
    const counts: Record<string, number> = {};
    for (const s of t.cells) counts[s] = (counts[s] ?? 0) + 1;
    const triples = Object.entries(counts).filter(([, n]) => n >= 3);
    expect(t.cells.length).toBe(9);
    expect(triples.length).toBe(t.mult ? 1 : 0);
    if (t.mult) expect(triples[0][0]).toBe(t.sym);
  }
});

it('Mystery-Box alle 30 Runden, Drops und Glücks-Serie zahlen extra', () => {
  let c: ClubState = { ...freshClub(), casino: { ...casinoOf(freshClub()), chips: 10_000 } };
  for (let i = 0; i < 30; i++) c = payout(c, { game: 'slots', bet: 10, win: 0 }, day('2026-11-11'), () => 0.9);
  expect(boxesReady(c)).toBe(1);
  const r = openBox(c, day('2026-11-11'), () => 0.1)!;
  expect(boxesReady(r.club)).toBe(0);
  expect(r.prize.kind).toBe('chips');
  // Drop: rand 0 → sicher ein Drop
  const before = casinoOf(c).chips;
  const d = payout(c, { game: 'slots', bet: 100, win: 0 }, day('2026-11-11'), () => 0);
  expect(casinoOf(d).chips).toBe(before + 500);
  // Glücks-Serie: 3 Gewinne in Folge = +100
  let s = c;
  for (let i = 0; i < 3; i++) s = payout(s, { game: 'slots', bet: 10, win: 20 }, day('2026-11-11'), () => 0.9);
  expect(casinoOf(s).chips).toBe(before + 60 + 100);
  expect(happyHour(new Date(2026, 10, 11, 19, 30)).active).toBe(true);
  expect(happyHour(new Date(2026, 10, 11, 15, 0)).active).toBe(false);
  expect(BOX_EVERY).toBe(30);
});
