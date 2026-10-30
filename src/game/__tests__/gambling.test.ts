import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { afterGamble, doBroke, HORSES, isBroke, PEN_CHANCE, PEN_MULT, playHorses, playRoulette, raceLegs, rouletteInfo, rouletteWins, shootPenalty, WHEEL } from '../gambling';
import { simulateToBreak } from '../simple';

it('Roulette und Pferde: Auszahlung stimmt, die Bank gewinnt auf Dauer', () => {
  expect(playRoulette('green', 1000, () => 0).payout).toBe(36_000); // Zahl 0
  expect(playRoulette('red', 1000, () => 0).win).toBe(false);
  let net = 0;
  for (let i = 0; i < 20000; i++) net += playRoulette('red', 100).payout - 100;
  expect(net).toBeLessThan(0);
  net = 0;
  for (let i = 0; i < 20000; i++) net += playHorses(i % HORSES.length, 100).payout - 100;
  expect(net).toBeLessThan(0);
});

it('Verborgene Spielsucht: Geld verschwindet in jeder Pause; Pleite → Trash-TV', () => {
  const c = createCareer({ name: 'G', nation: 'Deutschland', position: 'ST', age: 24, ovr: 78, potential: 82, clubId: slugify('Hannover 96') });
  const lose = playRoulette('green', 50_000, () => 0.5);
  const hooked = afterGamble(c, 50_000, lose, 60_000, () => 0); // Risiko greift
  expect(hooked.player.gambler).toBe(true);
  expect(hooked.squandered).toBe(50_000);
  expect(simulateToBreak(hooked).drainPending).toBe(1);
  const retired = { ...hooked, phase: 'retired' as const };
  expect(isBroke(retired, 100)).toBe(true);
  expect(isBroke(retired, 50_000)).toBe(false);
  const tv = doBroke(retired, 'boxing', 100, () => 0.1);
  expect(tv.coins).toBe(80_000);
  expect(doBroke(tv.career, 'boxing', 100).coins).toBe(0); // nur einmal
});

it('Roulette: Kessel hat jede Zahl genau einmal, Wetten zahlen richtig und die Bank gewinnt', () => {
  expect([...WHEEL].sort((a, b) => a - b)).toEqual(Array.from({ length: 37 }, (_, i) => i));
  expect(rouletteWins('d2', 13)).toBe(true);
  expect(rouletteWins('d2', 25)).toBe(false);
  expect(rouletteWins('low', 0)).toBe(false);
  expect(rouletteWins('n17', 17)).toBe(true);
  expect(rouletteInfo('n17').payout).toBe(36);
  // Erwartungswert jeder Wette unter 1 (Null gehört der Bank)
  for (const b of ['red', 'odd', 'high', 'd3', 'n5'] as const) {
    const i = rouletteInfo(b);
    expect(i.payout * i.chance).toBeLessThan(1);
    let hits = 0;
    for (let n = 0; n <= 36; n++) if (rouletteWins(b, n)) hits++;
    expect(hits / 37).toBeCloseTo(i.chance, 5);
  }
});

it('Pferderennen: Animation endet in der gezogenen Reihenfolge', () => {
  const res = playHorses(2, 1000, () => 0.3);
  const legs = raceLegs(res.order!);
  const finish = legs.map((l) => l[3]);
  const byFinish = finish.map((_, i) => i).sort((a, b) => finish[b] - finish[a]);
  expect(byFinish).toEqual(res.order);
});

it('Elfmeter-Serie: Trefferchance 64 %, jede Stufe ist auf Dauer ein Verlust', () => {
  let goals = 0;
  for (let i = 0; i < 20000; i++) if (shootPenalty((i % 3) as 0 | 1 | 2).goal) goals++;
  expect(goals / 20000).toBeGreaterThan(0.6);
  expect(goals / 20000).toBeLessThan(0.68);
  PEN_MULT.forEach((m, k) => expect(PEN_CHANCE ** (k + 1) * m).toBeLessThan(1));
  // Torwart in derselben Ecke hält immer
  expect(shootPenalty(0, () => 0).goal).toBe(false);
});
