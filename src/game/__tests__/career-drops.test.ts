import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer, playSeason } from '../career';
import { careerDrops, creditCareer, freshClub } from '../club';
import type { SeasonRecord } from '../types';

it('Karriere-Drops: 1 Drop pro Saison, Mega-Drops für Titel und Auszeichnungen (höchstens 2)', () => {
  const rec = (trophies: number, awards: number) => ({ trophies: Array(trophies).fill('Titel'), awards: Array(awards).fill('Preis') }) as unknown as SeasonRecord;
  expect(careerDrops(rec(0, 0))).toEqual({ drops: 1, mega: 0 });
  expect(careerDrops(rec(1, 0))).toEqual({ drops: 1, mega: 1 });
  expect(careerDrops(rec(3, 2))).toEqual({ drops: 1, mega: 2 });
});

it('Gespielte Saison landet als Drop im Club – nur einmal', () => {
  let c = createCareer({ name: 'Drop Test', nation: 'Deutschland', position: 'ST', age: 24, ovr: 80, potential: 85, clubId: slugify('FC Bayern München') });
  c.decision = null;
  c = playSeason(c);
  const res = creditCareer(freshClub(), c);
  expect(res.drops).toBe(1);
  expect(res.club.drops).toBe(1);
  expect(res.club.megaDrops ?? 0).toBe(careerDrops(c.history[0]).mega);
  expect(creditCareer(res.club, c).drops).toBe(0);
}, 20000);
