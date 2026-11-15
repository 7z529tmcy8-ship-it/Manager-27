import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { auraBoost, auraOf, buyItem, canFlexNow, dismissReveal, doFlex, honestPost, larpOf, larpRisk, larpYear, sellItem, statusCap, takeOff } from '../larp';
import { gramOf } from '../kickgram';
import { simulateToBreak } from '../simple';

const young = () => createCareer({ name: 'Larp Larsen', nation: 'Deutschland', position: 'ZM', age: 20, ovr: 62, potential: 80, clubId: slugify('Hamburger SV') });

it('LARP: Kaufen, Anziehen, Aura, Verkaufen', () => {
  let c = young();
  expect(auraOf(c)).toBe(0);
  expect(buyItem(c, 'gg-superstar', 100)).toBeNull(); // zu wenig Coins
  const b = buyItem(c, 'gg-superstar', 10_000)!;
  expect(b.cost).toBe(6_000);
  c = b.career;
  expect(auraOf(c)).toBe(12);
  expect(auraBoost(c)).toBeCloseTo(1.12);
  expect(buyItem(c, 'gg-superstar', 10_000)).toBeNull(); // schon im Besitz
  const s = sellItem(c, 'gg-superstar')!;
  expect(s.coins).toBe(3_000);
  expect(auraOf(s.career)).toBe(0);
  c = buyItem(c, 'pearls', 10_000)!.career;
  expect(auraOf(takeOff(c, 'accessoire'))).toBe(12);
});

it('Larp-Zähler: Replikas und zu viel Flex erhöhen das Risiko; ehrlicher Post halbiert', () => {
  let c = young();
  expect(larpRisk(c)).toBe(0);
  for (const id of ['vintage-watch-replika', 'cashmere-replika', 'gg-superstar-replika', 'barbour-replika']) c = buyItem(c, id, 1e6)!.career;
  expect(auraOf(c)).toBe(57);
  expect(statusCap(c)).toBeLessThan(57);
  const r = larpRisk(c);
  expect(r).toBeGreaterThanOrEqual(48);
  const h = honestPost(c);
  expect(larpRisk(h)).toBeLessThanOrEqual(Math.round(r / 2) + 1);
  expect(larpRisk(h)).toBeGreaterThan(0);
  expect(gramOf(h).followers).toBeLessThan(gramOf(c).followers);
});

it('Saisonende: entlarvt → Follower −25 %, Replikas weg; sonst bleibt alles', () => {
  let c = young();
  c = buyItem(c, 'cashmere-replika', 1e6)!.career;
  c = buyItem(c, 'gg-superstar', 1e6)!.career;
  const safe = structuredClone(c);
  expect(larpYear(safe, 0.99)).toMatch(/bestanden/);
  expect(larpOf(safe).owned).toHaveLength(2);
  expect(larpOf(safe).reveal?.exposed).toBe(false);
  const hit = structuredClone(c);
  const before = gramOf(hit).followers;
  const note = larpYear(hit, 0)!;
  expect(note).toMatch(/Larp entlarvt/);
  expect(gramOf(hit).followers).toBe(before - Math.round(before * 0.25));
  expect(larpOf(hit).owned).toEqual(['gg-superstar']);
  expect(larpOf(hit).exposed).toBe(1);
  expect(larpOf(hit).reveal).toMatchObject({ exposed: true, before, after: gramOf(hit).followers, lost: ['Kaschmir-Pulli über den Schultern'] });
  expect(dismissReveal(hit).larp?.reveal).toBeNull();
  // Ganze Saison läuft mit Look ohne Absturz durch
  const played = simulateToBreak(simulateToBreak(c));
  expect(played.larp).toBeTruthy();
});

it('Flex-Aktionen: nur in der Pause, einmal pro Pause, Follower sofort, Heat aufs Risiko bis Saisonende', () => {
  const c = young();
  expect(canFlexNow(c)).toBe(false); // Saison läuft
  const brk = { ...c, phase: 'winter' as const };
  expect(canFlexNow(brk)).toBe(true);
  const before = gramOf(brk).followers;
  const res = doFlex(brk, 'porsche', 0)!;
  expect(res.cost).toBe(0);
  expect(gramOf(res.career).followers).toBe(before + res.gained);
  expect(larpRisk(res.career)).toBe(15);
  expect(doFlex(res.career, 'brunch', 1e6)).toBeNull(); // schon geflext
  expect(doFlex(brk, 'sylt', 100)).toBeNull(); // zu wenig Coins
  const end = structuredClone(res.career);
  larpYear(end, 0.99);
  expect(larpOf(end).heat).toBe(0);
});
