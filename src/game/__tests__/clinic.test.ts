import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { canTreat, glamIncome, treat } from '../clinic';
import { closeYear } from '../household';
import { simulateToBreak } from '../simple';

const winter = () => simulateToBreak(createCareer({ name: 'K', nation: 'Brasilien', position: 'FL', age: 24, ovr: 78, potential: 82, clubId: slugify('Hannover 96') }));
const always = (v: number) => () => v;

it('Klinik: Kosten, eine Behandlung pro Pause, Glamour bringt Werbedeals', () => {
  const c = winter();
  expect(c.phase).toBe('winter');
  expect(canTreat(c, 'bbl', 1000)).toBe(false); // zu teuer
  expect(canTreat(c, 'fullkur', 1e9)).toBe(false); // nur im Sommer
  const ok = treat(c, 'bbl', 1e9, always(0.99));
  expect(ok.cost).toBe(60_000);
  expect(ok.career.glam).toBe(3);
  expect(treat(ok.career, 'hair', 1e9).cost).toBe(0); // schon behandelt in dieser Pause
  expect(glamIncome(ok.career)).toBe(4500);
  const before = ok.career.household?.totalIncome ?? 0;
  closeYear(ok.career);
  expect(ok.career.household!.totalIncome).toBeGreaterThanOrEqual(before + 4500);
  // Komplikation: Pause statt Glamour
  const bad = treat(c, 'bbl', 1e9, always(0.01));
  expect(bad.career.glam ?? 0).toBe(0);
  expect(bad.career.player.carryInjuryWeeks).toBeGreaterThanOrEqual(6);
});

it('Volle Kur: +6, Körper leidet, Herz oder Test können alles beenden', () => {
  let c = winter();
  c = simulateToBreak(c); // Sommer
  expect(c.phase).toBe('window');
  const clean = treat(c, 'fullkur', 1e9, always(0.99));
  expect(clean.career.player.ovr).toBe(c.player.ovr + 6);
  expect(clean.career.player.burnout).toBe(1);
  expect(clean.career.player.traits).toContain('fragile');
  const heart = treat(c, 'fullkur', 1e9, always(0.01));
  expect(heart.career.destroyed).toBe(true);
});
