import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { makeGift, rollGift, takeGift } from '../gifts';
import { backgroundSeason, closeYear } from '../household';
import { buyShares, injectMoney } from '../invest';

it('Mystery-Box: Inhalt nach Liga und Anteil, Gold-Boxen besser, wird genommen', () => {
  const low = makeGift('x', 'Aufstieg', 6, 1);
  const high = { ...makeGift('x', 'Aufstieg', 1, 49), rarity: 'gold' as const };
  const avg = (g: typeof low) => { let s = 0; for (let i = 0; i < 400; i++) s += rollGift(g).coins; return s / 400; };
  expect(avg(high)).toBeGreaterThan(avg(low) * 10);
  expect(rollGift(high, () => 0.01).pack).toBe('icon');
  expect(rollGift(low, () => 0.99).pack).toBeNull();
});

it('Aufstieg eines Klubs mit Anteilen bringt ein Geschenk', () => {
  const c = createCareer({ name: 'I', nation: 'Deutschland', position: 'ST', age: 24, ovr: 78, potential: 82, clubId: slugify('Hannover 96') });
  const club = slugify('OSV Hannover');
  let x = buyShares(c, club, 49, 1e9).career;
  x = injectMoney(x, club, 1_000_000, 1e9).career;
  for (let i = 0; i < 6 && !(x.gifts?.length); i++) { backgroundSeason(x); closeYear(x); }
  expect(x.gifts?.length).toBeGreaterThan(0);
  const g = x.gifts![0];
  expect(g.reason).toMatch(/Aufstieg/);
  expect(takeGift(x, g.id).gifts).toHaveLength(x.gifts!.length - 1);
});
