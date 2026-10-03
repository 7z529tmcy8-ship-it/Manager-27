import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { POINT_POOL, evaluateBuild, rollBuild } from '../creator';

const st = { position: 'ST' as const, age: 17 };

it('Passender Körper und Punkte auf wichtige Attribute geben mehr Potenzial', () => {
  const good = evaluateBuild({ ...st, height: 186, weight: 80, points: [6, 8, 0, 0, 0, 6] });
  const bad = evaluateBuild({ ...st, height: 160, weight: 100, points: [0, 0, 8, 0, 8, 4] });
  expect(good.attrFit).toBe(1);
  expect(good.bodyFit).toBe(1);
  expect(good.potential).toBe(85);
  expect(bad.potential).toBeLessThan(75);
  expect(good.potential - bad.potential).toBeGreaterThan(10);
});

it('Größe verschiebt Attribute: groß = mehr Physis, weniger Tempo', () => {
  const small = evaluateBuild({ ...st, height: 168, weight: 64, points: [0, 0, 0, 0, 0, 0] });
  const tall = evaluateBuild({ ...st, height: 198, weight: 92, points: [0, 0, 0, 0, 0, 0] });
  expect(tall.offsets[5]).toBeGreaterThan(small.offsets[5]);
  expect(tall.offsets[0]).toBeLessThan(small.offsets[0]);
});

it('Karriere aus dem Baukasten übernimmt Profil, Größe und Gewicht', () => {
  const b = { ...st, height: 184, weight: 79, points: [5, 8, 0, 2, 0, 5] };
  expect(b.points.reduce((a, x) => a + x, 0)).toBe(POINT_POOL);
  const r = rollBuild(b);
  expect(r.potential).toBeGreaterThanOrEqual(r.ovr + 4);
  const c = createCareer({ name: 'Bau', nation: 'Deutschland', position: 'ST', age: 17, ovr: r.ovr, potential: r.potential, clubId: slugify('Hannover 96'), profile: r.profile, height: 184, weight: 79 });
  expect(c.player.profile).toEqual(r.profile);
  expect(c.player.height).toBe(184);
});
