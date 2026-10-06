import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { afterGamble, doBroke, HORSES, isBroke, playHorses, playRoulette } from '../gambling';
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
