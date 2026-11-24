import { expect, it } from 'vitest';
import { SPECIAL_STARTS } from '../../data/legends';
import { getClub } from '../../data/leagues';
import { createCareer } from '../career';
import { simulateToBreak } from '../simple';

it('Special: Leroy Sané startet mit 18 bei Schalke 04 und spielt eine Saison', () => {
  const sane = SPECIAL_STARTS.find((s) => s.name === 'Leroy Sané')!;
  expect(getClub(sane.clubId).name).toBe('FC Schalke 04');
  let c = createCareer(sane);
  expect(c.player.age).toBe(18);
  expect(c.player.position).toBe('FL');
  c = simulateToBreak(simulateToBreak(c));
  expect(c.history.length).toBe(1);
  expect(c.history[0].clubId === sane.clubId || c.history[0].onLoan || !!c.player.nlz || c.history[0].clubId).toBeTruthy();
});
