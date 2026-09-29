import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { PAY2, PAY2_SEVEN, SYMBOLS, payoutFactor, spin } from '../casino';
import { createCareer, playNextStage } from '../career';
import { cashOf } from '../player';

it('Auszahlungsquote liegt knapp unter 100 % – die Bank gewinnt', () => {
  const total = SYMBOLS.reduce((a, s) => a + s.weight, 0);
  const ps = SYMBOLS.map((s) => ({ ...s, p: s.weight / total }));
  let rtp = 0;
  for (const a of ps) for (const b of ps) for (const c of ps) rtp += a.p * b.p * c.p * payoutFactor([a.id, b.id, c.id]);
  expect(rtp).toBeGreaterThan(0.85);
  expect(rtp).toBeLessThan(0.97);
  expect(payoutFactor(['seven', 'seven', 'seven'])).toBe(50);
  expect(payoutFactor(['seven', 'ball', 'seven'])).toBe(PAY2_SEVEN);
  expect(payoutFactor(['ball', 'glove', 'glove'])).toBe(PAY2);
  expect(payoutFactor(['ball', 'glove', 'boot'])).toBe(0);
});

it('Gehalt landet auf dem Konto, Drehen bucht Einsatz und Gewinn korrekt', () => {
  const c0 = createCareer({ name: 'Zocker', nation: 'Deutschland', position: 'ST', age: 24, ovr: 75, potential: 80, clubId: slugify('SC Freiburg') });
  const start = cashOf(c0);
  let c = playNextStage(c0);
  expect(cashOf(c)).toBeGreaterThan(start);
  if (c.decision) c = { ...c, decision: null };
  const before = cashOf(c);
  const bet = 1000;
  for (let i = 0; i < 25; i++) {
    const cash = cashOf(c);
    c = spin(c, bet);
    const last = c.casino!.last!;
    expect(cashOf(c)).toBe(cash - bet + last.win);
    expect(last.win).toBe(Math.round(bet * payoutFactor(last.reels)));
  }
  expect(c.casino!.spins).toBe(25);
  expect(c.casino!.wagered).toBe(25 * bet);
  expect(cashOf(c)).toBe(before - 25 * bet + c.casino!.won);
  // Mehr als das Konto geht nicht.
  expect(spin(c, cashOf(c) + 1)).toBe(c);
});
