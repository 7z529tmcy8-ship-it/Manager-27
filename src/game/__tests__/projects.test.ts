import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { closeYear } from '../household';
import { buyShares, expectedIncome } from '../invest';
import { clubStrength } from '../player';
import { canBuild, getProject, startProject } from '../projects';

const setup = (percent: number) => {
  const c = createCareer({ name: 'P', nation: 'Deutschland', position: 'ST', age: 24, ovr: 78, potential: 82, clubId: slugify('Hannover 96') });
  return buyShares(c, slugify('SC Paderborn 07'), percent, 1e9).career;
};

it('Bauprojekte: Mindestanteil, Bauzeit, dauerhafte Wirkung', () => {
  const club = slugify('SC Paderborn 07');
  const small = setup(5);
  expect(canBuild(small.household!.shares[0], getProject('academy'), 65, 1e9).ok).toBe(false);
  expect(canBuild(small.household!.shares[0], getProject('stadium'), 65, 1e9).ok).toBe(false);
  let c = setup(30);
  const before = clubStrength(c, club);
  const incomeBefore = expectedIncome(c);
  c = startProject(c, club, 'stadium', before, 1e9).career;
  c = startProject(c, club, 'academy', before, 1e9).career;
  expect(c.household!.shares[0].projects).toHaveLength(2);
  // Nach einigen Jahren: fertig, Stadion bringt mehr Einnahmen, Akademie dauerhafte Stärke.
  for (let i = 0; i < 8; i++) closeYear(c);
  const st = c.household!.shares[0].projects!.find((p) => p.id === 'stadium')!;
  expect(st.buildLeft).toBe(0);
  expect(c.clubInfra![club]).toBeGreaterThan(0);
  expect(expectedIncome(c)).toBeGreaterThan(incomeBefore);
  // Dauerhaft: klingt nicht ab
  const infra = c.clubInfra![club];
  for (let i = 0; i < 5; i++) closeYear(c);
  expect(c.clubInfra![club]).toBeGreaterThanOrEqual(infra);
});
