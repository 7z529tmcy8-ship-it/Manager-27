import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer, isKidnapName } from '../career';

it('Laurens Götting wird entführt: 3 Saisons ohne Spiele, danach Wertung 50 und vereinslos', () => {
  expect(isKidnapName('Laurens Götting')).toBe(true);
  expect(isKidnapName('  laurens   goetting ')).toBe(true);
  expect(isKidnapName('Laurens Gotting')).toBe(true);
  expect(isKidnapName('Lauren Götting')).toBe(false);

  const c = createCareer({ name: 'Laurens Götting', nation: 'Deutschland', position: 'ST', age: 17, ovr: 68, potential: 86, clubId: slugify('SC Freiburg') });
  expect(c.history).toHaveLength(3);
  expect(c.history.every((s) => s.apps === 0)).toBe(true);
  expect(c.history[0].events?.[0].title).toBe('Von der Mafia entführt!');
  expect(c.player.ovr).toBe(50);
  expect(c.player.age).toBe(20);
  expect(c.year).toBe(2028);
  expect(c.player.absent).toBe(false);
  expect(c.phase).toBe('window');
  expect(c.player.contract.yearsLeft).toBe(0);
  expect(c.offers.length).toBeGreaterThan(0);
  expect(c.offers.some((o) => o.type === 'Verlängerung')).toBe(false);
  expect(c.history[0].cupReached).toBe('entführt');

  const normal = createCareer({ name: 'Max Muster', nation: 'Deutschland', position: 'ST', age: 17, ovr: 68, potential: 86, clubId: slugify('SC Freiburg') });
  expect(normal.history).toHaveLength(0);
});
