import { describe, expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { analyze, applyExperiment, futureSeasons, isMultiverseCode, listFutures, runFuture, summarize } from '../multiverse';
import { currentClubId } from '../player';

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
  it('Experiment ändert nur die Kopie: Wertung, Potenzial, Verein, Belastung', () => {
    const c = base();
    const snap = JSON.stringify(c);
    const e = applyExperiment(c, { ovr: 88, pot: 93, clubId: slugify('FC Bayern München'), load: 'rest' });
    expect(JSON.stringify(c)).toBe(snap);
    expect(e.player.ovr).toBe(88);
    expect(e.player.potential).toBe(93);
    expect(currentClubId(e.player)).toBe(slugify('FC Bayern München'));
    expect(e.autoLoad).toBe('rest');
    // Potenzial nie unter der Wertung
    expect(applyExperiment(c, { ovr: 95 }).player.potential).toBeGreaterThanOrEqual(95);
  });
  it('Vergleich, Liste mit Filter/Sortierung und Saison-Details', () => {
    const c = base();
    const fs = Array.from({ length: 5 }, (_, i) => runFuture(c, 2, 1, i));
    const s = summarize(fs);
    expect(s.n).toBe(5);
    expect(s.pCL).toBeGreaterThanOrEqual(0);
    const byGoals = listFutures(fs, 'goals', 'all');
    for (let i = 1; i < byGoals.length; i++) expect(byGoals[i - 1].goals).toBeGreaterThanOrEqual(byGoals[i].goals);
    expect(listFutures(fs, 'score', 'ballon').every((f) => f.ballon > 0)).toBe(true);
    expect(futureSeasons(fs[0]).length).toBe(fs[0].seasons);
    expect(futureSeasons(fs[0])[0].season).not.toBe(c.history[c.history.length - 1]?.season);
  });
});
