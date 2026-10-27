import { expect, it } from 'vitest';
import { getClub, getLeague, slugify, youthClubOf } from '../../data/leagues';
import { createCareer, playSeason, stayAtClub } from '../career';
import { nlzSeasonEnd } from '../nlz';
import { currentClubId } from '../player';
import type { Career, SeasonRecord } from '../types';

const bayern = slugify('FC Bayern München');
const talent = (age = 17, ovr = 64) =>
  createCareer({ name: 'Wisdom Test', nation: 'Deutschland', position: 'FL', age, ovr, potential: 85, clubId: bayern });

const next = (c: Career) => (c.player.contract.yearsLeft > 0 ? stayAtClub(c) : c);

it('Junge Talente starten im NLZ (U17/U19), fertige Spieler bei den Profis', () => {
  const u19 = talent(17);
  expect(u19.player.nlz?.team).toBe('U19');
  expect(currentClubId(u19.player)).toBe(youthClubOf(bayern, 'U19')!.id);
  expect(getLeague(getClub(currentClubId(u19.player)).leagueId).name).toBe('U19-Nachwuchsliga A');
  expect(talent(16).player.nlz?.team).toBe('U17');
  expect(talent(20).player.nlz).toBeUndefined();
  expect(talent(17, 84).player.nlz).toBeUndefined();
  // Ohne NLZ (z. B. MLS) startet man direkt bei den Profis.
  expect(createCareer({ name: 'X', nation: 'USA', position: 'ST', age: 17, ovr: 60, potential: 80, clubId: slugify('Inter Miami CF') }).player.nlz).toBeUndefined();
});

it('Saison im NLZ: U19-Liga mit Tabelle, danach spätestens mit 19 raus aus der U19', () => {
  let c = playSeason(talent(17));
  const first = c.history[0];
  expect(getLeague(first.leagueId).youth).toBe('U19');
  expect(first.table.some((r) => r.clubId === youthClubOf(bayern, 'U19')!.id)).toBe(true);
  expect(first.trophies.some((t) => t.startsWith('Meister'))).toBe(false);
  c = next(c);
  c = playSeason(c);
  c = next(c);
  // Mit 19 ist man zu alt für die U19.
  expect(c.player.age).toBe(19);
  expect(c.player.nlz).toBeUndefined();
});

const record = (over: Partial<SeasonRecord>): SeasonRecord => ({
  season: '2025/26', age: 17, clubId: bayern, onLoan: false, leagueId: 'bl1', ovrStart: 64, ovrEnd: 64, apps: 2, starts: 0,
  minutes: 60, possibleMinutes: 3000, goals: 0, assists: 0, cleanSheets: 0, avgRating: 6.2, injuryWeeks: 0, leaguePosition: 1,
  marketValue: 0, trophies: [], awards: [], caps: 0, internationalGoals: 0, youth: null, byCompetition: [], table: [],
  europe: null, cupReached: '', notes: [], winterMove: null, ...over,
} as SeasonRecord);

it('Schwach bei den Profis: zurück in die U19 – stark im NLZ: hochgezogen', () => {
  const c = talent(20, 70);
  c.player.age = 18;
  expect(nlzSeasonEnd(c, record({}))).toBe('down-u19');
  expect(c.player.nlz?.team).toBe('U19');
  expect(c.inbox!.some((i) => i.title === 'Zurück in die U19')).toBe(true);

  const s = talent(17, 64);
  s.player.ovr = 78;
  expect(nlzSeasonEnd(s, record({ minutes: 2600, apps: 30, avgRating: 7.3 }))).toBe('pros');
  expect(s.player.nlz).toBeUndefined();
  expect(currentClubId(s.player)).toBe(bayern);
});

it('Zweite Mannschaft: zu alt für die U19 und nicht reif → II, mit starker Saison zurück zu den Profis', () => {
  const vfb = slugify('VfB Stuttgart');
  const c = createCareer({ name: 'Y', nation: 'Deutschland', position: 'ZM', age: 18, ovr: 58, potential: 80, clubId: vfb });
  expect(c.player.nlz?.team).toBe('U19');
  c.player.age = 19;
  expect(nlzSeasonEnd(c, record({ minutes: 1500, apps: 20, avgRating: 6.8 }))).toBe('reserve');
  expect(c.player.contract.clubId).toBe(slugify('VfB Stuttgart II'));
  c.player.ovr = 75;
  expect(nlzSeasonEnd(c, record({ minutes: 2600, apps: 30, avgRating: 7.2 }))).toBe('reserve-up');
  expect(c.player.contract.clubId).toBe(vfb);
});
