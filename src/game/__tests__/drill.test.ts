import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { applyDrill, canDrill, drillPos, drillZone } from '../drill';

const base = (ovr: number) => createCareer({ name: 'Drill', nation: 'Deutschland', position: 'ST', age: 22, ovr, potential: 90, clubId: slugify('Hamburger SV') });

it('Markierung pendelt zwischen 0 und 100', () => {
  expect(drillPos(0)).toBe(0);
  expect(drillPos(900)).toBe(100);
  expect(drillPos(1350)).toBe(50);
  expect(drillPos(1800)).toBe(0);
});

it('Bessere Spieler haben eine breitere grüne Zone', () => {
  const w = (o: number) => { const z = drillZone(base(o)); return z.to - z.from; };
  expect(w(85)).toBeGreaterThan(w(60));
});

it('Übung: bis zu +0,3 Form, einmal pro Etappe', () => {
  const c = base(75);
  expect(canDrill(c)).toBe(true);
  const r = applyDrill(c, 3);
  expect(r.career.progress!.form).toBeCloseTo(r.career.progress!.form, 5);
  expect(canDrill(r.career)).toBe(false);
  const zero = applyDrill(c, 0);
  expect(r.career.progress!.form - zero.career.progress!.form).toBeCloseTo(0.3, 5);
});
