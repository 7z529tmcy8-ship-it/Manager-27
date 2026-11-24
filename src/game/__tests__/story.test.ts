import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { chapters, fanLeave, fanMood, fanSeasonEnd, rivalView } from '../story';
import type { Career, SeasonRecord } from '../types';

const base = () => createCareer({ name: 'Story', nation: 'Deutschland', position: 'ST', age: 21, ovr: 78, potential: 88, clubId: slugify('Hamburger SV') });
const rec = (clubId: string, over: Partial<SeasonRecord> = {}): SeasonRecord => ({
  season: '2025/26', age: 21, clubId, onLoan: false, leagueId: 'x', ovrStart: 70, ovrEnd: 72, apps: 30, starts: 28, minutes: 2500, possibleMinutes: 3060,
  goals: 10, assists: 4, cleanSheets: 0, avgRating: 7, injuryWeeks: 0, leaguePosition: 5, marketValue: 1, trophies: [], awards: [], caps: 0, internationalGoals: 0,
  byCompetition: [], table: [], europe: null, cupReached: '', notes: [], ...over,
});

it('Fans: Treue hebt die Stimmung, schneller Abgang verärgert', () => {
  const c: Career = base();
  const hsv = slugify('Hamburger SV');
  expect(fanMood(c, hsv).word).toBe('Abwartend');
  fanSeasonEnd(c, rec(hsv, { trophies: ['Pokal'] }));
  expect(fanMood(c, hsv).value).toBeGreaterThan(0.5);
  c.history = [rec(hsv)];
  fanLeave(c, hsv, slugify('FC Bayern München'));
  expect(fanMood(c, hsv).value).toBeLessThan(0);
});

it('Kapitel: eine Überschrift je Station, Titel und Leihe erkannt', () => {
  const c: Career = base();
  c.history = [
    rec(slugify('Hamburger SV'), { season: '2025/26' }),
    rec(slugify('Hamburger SV'), { season: '2026/27', trophies: ['DFB-Pokal'] }),
    rec(slugify('Hannover 96'), { season: '2027/28', onLoan: true, apps: 25 }),
  ];
  const ch = chapters(c);
  expect(ch).toHaveLength(2);
  expect(ch[0].title).toContain('Titel');
  expect(ch[0].seasons).toBe(2);
  expect(ch[1].title).toContain('Leihe');
});

it('Rivale ist sichtbar mit Bilanz', () => {
  const c: Career = base();
  c.rival = { name: 'Max Muster', nation: 'Deutschland', position: 'ST', age: 21, ovr: 77, potential: 86, clubId: slugify('FC Bayern München'), retired: false,
    history: [{ season: '2025/26', age: 21, clubId: slugify('FC Bayern München'), ovrStart: 75, ovrEnd: 77, apps: 30, goals: 12, assists: 3, avgRating: 7, duel: 'rival' }] };
  const v = rivalView(c)!;
  expect(v.name).toBe('Max Muster');
  expect(v.record.rival).toBe(1);
});
