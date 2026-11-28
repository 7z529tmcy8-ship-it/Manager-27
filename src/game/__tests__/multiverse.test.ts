import { describe, expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { analyze, isMultiverseCode, runFuture } from '../multiverse';

const base = (age = 21) => createCareer({ name: 'Multi', nation: 'Deutschland', position: 'ST', age, ovr: 76, potential: 88, clubId: slugify('Hamburger SV') });

describe('Multiversum-Labor', () => {
  it('Code', () => {
    expect(isMultiverseCode(' Multiversum ')).toBe(true);
    expect(isMultiverseCode('vogue')).toBe(false);
  });
  it('Zukünfte verändern den Original-Spielstand nicht und unterscheiden sich', () => {
    const c = base();
    const snap = JSON.stringify(c);
    const fs = Array.from({ length: 6 }, (_, i) => runFuture(c, 3, 1, i));
    expect(JSON.stringify(c)).toBe(snap);
    expect(fs.every((f) => f.seasons >= 1 && f.seasons <= 3)).toBe(true);
    expect(fs.every((f) => f.ovrPath.length === f.seasons + 1)).toBe(true);
    expect(new Set(fs.map((f) => `${f.goals}-${f.finalOvr}`)).size).toBeGreaterThan(1);
    const a = analyze(fs)!;
    expect(a.n).toBe(6);
    expect(a.hist.reduce((s, b) => s + b.n, 0)).toBe(6);
    expect(a.best.score).toBeGreaterThanOrEqual(a.worst.score);
    expect(a.chances.every((x) => x.p >= 0 && x.p <= 1)).toBe(true);
  });
  it('Bis Karriereende: endet mit Rücktritt', () => {
    const f = runFuture(base(33), 'end', 0, 1);
    expect(f.retired).toBe(true);
    expect(f.career.player.age).toBeLessThanOrEqual(39);
  });
});
