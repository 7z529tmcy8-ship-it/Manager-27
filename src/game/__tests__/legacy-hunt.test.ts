import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { hallOfFame, recordHunt } from '../legacy';
import type { Career, SeasonRecord } from '../types';

const mk = (name: string, goals: number[]): Career => {
  const c = createCareer({ name, nation: 'Deutschland', position: 'ST', age: 22, ovr: 78, potential: 88, clubId: slugify('Hamburger SV') });
  c.history = goals.map((g, i) => ({ season: `${2025 + i}/${26 + i}`, age: 22 + i, clubId: slugify('Hamburger SV'), onLoan: false, leagueId: 'x', ovrStart: 78, ovrEnd: 79, apps: 30, starts: 30, minutes: 2700, possibleMinutes: 3060, goals: g, assists: 4, cleanSheets: 0, avgRating: 7, injuryWeeks: 0, leaguePosition: 3, marketValue: 1, trophies: [], awards: [], caps: 0, internationalGoals: 0, byCompetition: [], table: [], europe: null, cupReached: '', notes: [] } as SeasonRecord));
  return c;
};

it('Rekordjagd nutzt nur eigene Karrieren', () => {
  const a = mk('Alpha', [12, 25]);
  const b = mk('Beta', [8]);
  const h = recordHunt([a, b], b, { goals: 10, assists: 1 });
  const goals = h.find((x) => x.label.includes('Tore'))!;
  expect(goals.record).toBe(25);
  expect(goals.holder).toBe('Alpha');
  expect(goals.you).toBe(false);
});

it('Ruhmeshalle sortiert nach Legendenpunkten', () => {
  const hall = hallOfFame([mk('Klein', [3]), mk('Groß', [30, 30, 30])]);
  expect(hall[0].career.player.name).toBe('Groß');
});
