import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { careerCard } from '../club';
import { ORIGIN_ODDS, spinOrigin, applyOrigin, evaluateBuild, randomAvatar, randomPoints, POINT_POOL, MAX_PER_ATTR } from '../creator';
import { developPlayer } from '../development';

it('Herkunft, Avatar und Zufall', () => {
  const base = evaluateBuild({ position: 'ST', age: 17, height: 183, weight: 77, points: [4, 8, 0, 4, 0, 4] });
  expect(applyOrigin(base, 'late', false).ovr).toBe(base.ovr - 4);
  expect(applyOrigin(base, 'late', false).potential).toBe(base.potential + 3);
  expect(applyOrigin(base, 'street', false).offsets[3]).toBe(base.offsets[3] + 5);
  const pts = randomPoints('IV');
  expect(pts.reduce((a, b) => a + b, 0)).toBe(POINT_POOL);
  expect(Math.max(...pts)).toBeLessThanOrEqual(MAX_PER_ATTR);
  const avatar = randomAvatar();
  const c = createCareer({ name: 'A', nation: 'Deutschland', position: 'ST', age: 17, ovr: 60, potential: 85, clubId: slugify('Hannover 96'), origin: 'late', avatar });
  expect(careerCard(c).avatar).toEqual(avatar);
  // Spätstarter wachsen mit 27 noch spürbar, normale Spieler kaum.
  const stats = { minutes: 2700, possibleMinutes: 3000, avgRating: 7.0, apps: 32, goals: 8, assists: 4 };
  const p = { ...c.player, age: 27, ovr: 75, potential: 85, potentialStart: 85 };
  let late = 0, normal = 0;
  for (let i = 0; i < 300; i++) {
    late += developPlayer(p, stats, 75).ovr - 75;
    normal += developPlayer({ ...p, origin: 'academy' }, stats, 75).ovr - 75;
  }
  expect(late).toBeGreaterThan(normal);
});

it('Glücksrad: Verteilung passt grob zu den Chancen', () => {
  const n = 4000;
  const count: Record<string, number> = {};
  for (let i = 0; i < n; i++) { const o = spinOrigin(); count[o] = (count[o] ?? 0) + 1; }
  for (const [id, pct] of Object.entries(ORIGIN_ODDS)) expect(Math.abs((count[id] / n) * 100 - pct)).toBeLessThan(4);
});
