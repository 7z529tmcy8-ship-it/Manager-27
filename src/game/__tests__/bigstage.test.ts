import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { finalWorldRank, galaAwards, seasonPoints, worldRace } from '../bigstage';
import type { SeasonRecord } from '../types';

const career = () => createCareer({ name: 'Gala', nation: 'Deutschland', position: 'ST', age: 24, ovr: 90, potential: 93, clubId: slugify('FC Bayern München') });
const rec = (over: Partial<SeasonRecord>): SeasonRecord => ({
  season: '2025/26', age: 24, clubId: slugify('FC Bayern München'), onLoan: false, leagueId: 'x', ovrStart: 90, ovrEnd: 91, apps: 34, starts: 34,
  minutes: 3000, possibleMinutes: 3060, goals: 10, assists: 5, cleanSheets: 0, avgRating: 7, injuryWeeks: 0, leaguePosition: 1, marketValue: 1, trophies: [],
  awards: [], caps: 0, internationalGoals: 0, byCompetition: [], table: [], europe: null, cupReached: '', notes: [], ...over,
});

it('Weltklasse-Saison schlägt eine schwache Saison', () => {
  const strong = seasonPoints({ ovr: 91, position: 'ST', avgRating: 7.8, goals: 35, assists: 10, apps: 34, trophies: ['Champions League'] });
  const weak = seasonPoints({ ovr: 82, position: 'ST', avgRating: 6.8, goals: 8, assists: 2, apps: 20 });
  expect(strong).toBeGreaterThan(weak + 50);
  const race = worldRace(career(), { ovr: 91, avgRating: 7.8, goals: 35, assists: 10, apps: 34, trophies: ['Champions League'] }, '2025/26', 1);
  expect(race.findIndex((e) => e.you)).toBeLessThan(3);
  expect(race.length).toBeGreaterThan(10);
});

it('Ohne Auszeichnung nie Platz 1 der Wahl, mit Auszeichnung immer', () => {
  const c = career();
  expect(finalWorldRank(c, rec({ goals: 60, avgRating: 8.5, trophies: ['Champions League'] }))).toBeGreaterThanOrEqual(2);
  expect(finalWorldRank(c, rec({ awards: ['Ballon d’Or'] }))).toBe(1);
});

it('Gala zeigt gewonnene und verpasste Preise, Turnier und Golden Boy für Junge', () => {
  const g = galaAwards(career(), rec({ age: 20, awards: ['Torschützenkönig Bundesliga', 'Golden Boy'], tournament: { name: 'WM 2026', reachedFinal: true, won: false, stage: 'Finale' } }));
  expect(g.find((x) => x.id === 'scorer')?.won).toBe(true);
  expect(g.find((x) => x.id === 'poty')?.won).toBe(false);
  expect(g.find((x) => x.id === 'gb')?.won).toBe(true);
  expect(g.find((x) => x.id === 'tour')?.text).toContain('Finale');
});
