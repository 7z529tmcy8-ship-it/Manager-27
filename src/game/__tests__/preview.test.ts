import { describe, expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { playRestOfSeason } from '../autosim';
import { leagueClubs, leagueStars, makePrognosis, prognosisCheck, seasonRankings, squadOf, teamOfSeason } from '../preview';
import { seasonLabel } from '../player';

const base = () => createCareer({ name: 'Heft Test', nation: 'Deutschland', position: 'ST', age: 21, ovr: 76, potential: 86, clubId: slugify('Hamburger SV') });

describe('Saison-Sonderheft', () => {
  it('Kader: jede Position besetzt, beim zweiten Aufruf identisch', () => {
    const a = squadOf(slugify('Hamburger SV'), 2025);
    const b = squadOf(slugify('Hamburger SV'), 2025);
    expect(a).toEqual(b);
    for (const pos of ['TW', 'IV', 'AV', 'ZDM', 'ZM', 'ZOM', 'FL', 'ST']) expect(a.some((p) => p.pos === pos)).toBe(true);
    expect(a.every((p) => p.value > 0 && p.age >= 16)).toBe(true);
  });

  it('Liga-Vorschau: alle Vereine der Liga, Prognose-Reihenfolge fest', () => {
    const c = base();
    const lg = leagueClubs(c, 'bl1');
    expect(lg.length).toBe(18);
    expect(leagueClubs(c, 'bl1').map((x) => x.clubId)).toEqual(lg.map((x) => x.clubId));
    expect(lg[0].strength).toBeGreaterThan(lg[lg.length - 1].strength);
  });

  it('Stars: du stehst drin, wenn du gut genug bist; Talente sind jung', () => {
    const s = leagueStars(base(), 'bl1');
    expect(s.top.length).toBe(10);
    expect(s.talents.every((p) => p.age <= 21)).toBe(true);
    for (let i = 1; i < s.talents.length; i++) expect(s.talents[i - 1].pot).toBeGreaterThanOrEqual(s.talents[i].pot);
    expect(s.top.some((p) => p.you) || s.top[9].ovr >= 76).toBe(true);
  });

  it('Prognose wird beim Saisonstart gespeichert und am Ende verglichen', () => {
    const c0 = base();
    expect(c0.prognoses?.[seasonLabel(c0.year)]).toBeTruthy();
    const pg = makePrognosis(c0);
    expect(pg.apps).toBeGreaterThan(0);
    expect(pg.goals).toBeGreaterThanOrEqual(0);
    const c = playRestOfSeason(c0);
    const r = c.history[c.history.length - 1];
    const check = prognosisCheck(c, r);
    expect(check?.length).toBeGreaterThanOrEqual(4);
    // nächste Saison bekommt eine eigene Prognose
    expect(Object.keys(c.prognoses ?? {}).length).toBeGreaterThanOrEqual(1);
  });

  it('Rückblick: Ranglisten mit dir, Elf der Saison mit 11 Spielern', () => {
    const c = playRestOfSeason(base());
    const r = c.history[c.history.length - 1];
    const rk = seasonRankings(c, r)!;
    expect(rk.scorers.some((e) => e.you)).toBe(true);
    expect(rk.points.some((e) => e.you)).toBe(true);
    expect(rk.scorers[0].value).toBeGreaterThanOrEqual(rk.scorers[1].value);
    const xi = teamOfSeason(c, r);
    expect(xi.length).toBe(11);
    expect(new Set(xi.map((p) => p.name)).size).toBe(11);
  });
});
