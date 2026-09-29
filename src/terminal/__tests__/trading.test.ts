import { expect, it } from 'vitest';
import { DAY_MINUTES, FEE, ask, bid, closePosition, equity, newGame, order, summary, tick, type Asset } from '../trading';

const etf: Asset = { id: 'EUNL', name: 'Welt-ETF', vol: 0.15, spread: 0.0005, start: 100 };
const wild: Asset = { id: 'MOON', name: 'Moonshot', vol: 0.8, spread: 0.002, start: 20, fictional: true };

it('Kauf und Verkauf: Gebühren, Spanne, Gewinn/Verlust stimmen', () => {
  let s = newGame(etf, 10_000, 1, 42);
  s = order(s, 1, 10);
  expect(s.pos.qty).toBe(10);
  expect(s.pos.avg).toBeCloseTo(ask(s));
  expect(s.cash).toBeCloseTo(10_000 - 10 * ask(s) - FEE);
  // Sofort wieder verkaufen: Verlust = Spanne + 2 Gebühren
  const before = equity(newGame(etf, 10_000, 1, 42));
  s = closePosition(s);
  expect(s.pos.qty).toBe(0);
  expect(before - s.cash).toBeCloseTo(10 * (ask(s) - bid(s)) + 2 * FEE, 6);
});

it('Short: Gewinn bei fallendem Kurs, Kaufkraft begrenzt', () => {
  let s = newGame(etf, 10_000, 1, 1);
  s = order(s, -1, 50);
  expect(s.pos.qty).toBe(-50);
  const entry = s.pos.avg;
  s = { ...s, price: 90 };
  s = closePosition(s);
  expect(s.trades[0].pnl).toBeCloseTo(50 * (entry - ask(s)), 6);
  expect(s.cash).toBeGreaterThan(10_000);
  // Ohne Hebel nicht mehr als ~Kontowert
  const t = order(newGame(etf, 10_000, 1, 1), 1, 1_000_000);
  expect(t.pos.qty * ask(t)).toBeLessThanOrEqual(10_000);
  const lev = order({ ...newGame(etf, 10_000, 1, 1), leverage: 5 }, 1, 1_000_000);
  expect(lev.pos.qty).toBeGreaterThan(t.pos.qty * 4.5);
});

it('Stop-Loss greift, Börsenschluss schließt alles', () => {
  let s = newGame(wild, 10_000, 1, 7);
  s = order(s, 1, 100, { stop: 2, take: 0 });
  s = { ...s, price: s.price * 0.95 };
  s = tick(s);
  expect(s.pos.qty).toBe(0);
  expect(s.trades[0].reason).toBe('Stop-Loss');
  s = order(s, 1, 10);
  while (!s.done) s = tick(s);
  expect(s.minute).toBe(DAY_MINUTES);
  expect(s.pos.qty).toBe(0);
  expect(s.trades[0].reason).toBe('Börsenschluss');
  expect(summary(s).trades).toBe(s.trades.length);
});

it('Tagesschwankung realistisch: ETF ruhig, fiktive Aktie wild', () => {
  const range = (a: Asset) => {
    const out: number[] = [];
    for (let seed = 1; seed <= 60; seed++) {
      let s = newGame(a, 10_000, 1, seed);
      let hi = s.price;
      let lo = s.price;
      while (!s.done) {
        s = tick(s);
        hi = Math.max(hi, s.price);
        lo = Math.min(lo, s.price);
      }
      out.push(hi / lo - 1);
    }
    out.sort((x, y) => x - y);
    return out[30];
  };
  const e = range(etf);
  const w = range(wild);
  expect(e).toBeGreaterThan(0.004);
  expect(e).toBeLessThan(0.03);
  expect(w).toBeGreaterThan(0.025);
  expect(w).toBeLessThan(0.15);
});
