import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { simulateToBreak } from '../simple';
import { compactCareer } from '../storage';

it('Spielstand wird kompakter, letzte Tabellen bleiben', () => {
  let c = createCareer({ name: 'S', nation: 'Deutschland', position: 'ST', age: 20, ovr: 75, potential: 85, clubId: slugify('Hannover 96') });
  for (let i = 0; i < 4; i++) {
    c = simulateToBreak(simulateToBreak(c));
    c = { ...c, phase: 'season', offers: [] };
  }
  const small = compactCareer(c);
  expect(JSON.stringify(small).length).toBeLessThan(JSON.stringify(c).length);
  expect(small.history[0].table).toHaveLength(0);
  expect(small.history[small.history.length - 1].table.length).toBeGreaterThan(0);
  expect(small.history.map((r) => r.goals)).toEqual(c.history.map((r) => r.goals));
});
