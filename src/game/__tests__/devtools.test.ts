import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { devAdvance, devFlags, devTransfer } from '../dev';
import { currentClubId } from '../player';
import { simulateToBreak } from '../simple';

const base = () => createCareer({ name: 'Dev', nation: 'Deutschland', position: 'ST', age: 30, ovr: 80, potential: 80, clubId: slugify('SC Freiburg') });

it('Entwickler: Vorspulen um Saisons und bis zum Karriereende', () => {
  const c = devAdvance(base(), 2);
  expect(c.history.length).toBe(2);
  const end = devAdvance(base(), 'end');
  expect(end.phase).toBe('retired');
});

it('Entwickler: Wechsel mitten in der Saison und versteckte Werte', () => {
  let c = simulateToBreak(base()); // Winterpause
  c = devTransfer(c, slugify('FC Bayern München'));
  expect(currentClubId(c.player)).toBe(slugify('FC Bayern München'));
  c = simulateToBreak(c);
  expect(c.history.length).toBe(1);
  expect(devFlags(c, { hooked: true }).player.hooked).toBe(true);
});
