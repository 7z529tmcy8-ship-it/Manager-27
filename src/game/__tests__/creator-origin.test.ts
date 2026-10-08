import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { careerCard } from '../club';
import { ORIGIN_ODDS, spinOrigin, applyOrigin, evaluateBuild, randomAvatar, randomPoints, POINT_POOL, MAX_PER_ATTR } from '../creator';
import { developPlayer } from '../development';

it('Herkunft, Avatar und Zufall', () => {
  const base = evaluateBuild({ position: 'ST', age: 17, height: 183, weight: 77, points: [4, 8, 0, 4, 0, 4] });
  expect(applyOrigin(base, 'late', false).ovr).toBe(base.ovr - 4);
  expect(applyOrigin(base, 'late', false).potential).toBe(Math.min(94, base.potential + 6));
  expect(applyOrigin(base, 'street', false).offsets[3]).toBe(base.offsets[3] + 8);
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

it('Schicksals-Automat: realistische Körper, Vereine nach Ligastufe verteilt', async () => {
  const { spinFate, FATE_TIER_WEIGHT } = await import('../creator');
  const { CLUBS, getLeague } = await import('../../data/leagues');
  const clubs = CLUBS.filter((c) => !c.name.endsWith(' II')).map((c) => ({ id: c.id, tier: getLeague(c.leagueId).tier }));
  const tierOf = new Map(clubs.map((c) => [c.id, c.tier]));
  const n = 4000;
  const count: Record<number, number> = {};
  for (let i = 0; i < n; i++) {
    const f = spinFate(clubs);
    expect(f.height).toBeGreaterThanOrEqual(158);
    expect(f.height).toBeLessThanOrEqual(206);
    const bmi = f.weight / (f.height / 100) ** 2;
    expect(bmi).toBeGreaterThan(17);
    expect(bmi).toBeLessThan(29);
    const t = tierOf.get(f.clubId)!;
    count[t] = (count[t] ?? 0) + 1;
  }
  for (const [t, w] of Object.entries(FATE_TIER_WEIGHT)) expect(Math.abs(((count[Number(t)] ?? 0) / n) * 100 - w)).toBeLessThan(3);
});
