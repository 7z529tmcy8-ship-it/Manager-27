import { expect, it } from 'vitest';
import { CLUBS, canPlayIn, getLeague, initialClubLeague, slugify } from '../../data/leagues';
import { freshClub } from '../club';
import { DUEL_XP_PER_DAY, addDuelPassXp, duelXpLeft, passOf } from '../pass';

it('Unter der Landesliga Hannover: Bezirksliga (7.) und Kreisliga (8.) mit Auf- und Abstieg', () => {
  const llh = getLeague('llh');
  const bz = getLeague('bzh2');
  const kr = getLeague('krh1');
  expect(llh.down?.leagueId).toBe('bzh2');
  expect(bz.tier).toBe(7);
  expect(bz.up?.leagueId).toBe('llh');
  expect(bz.down?.leagueId).toBe('krh1');
  expect(kr.tier).toBe(8);
  expect(kr.up?.leagueId).toBe('bzh2');
  expect(CLUBS.filter((c) => c.leagueId === 'bzh2')).toHaveLength(17);
  expect(CLUBS.filter((c) => c.leagueId === 'krh1')).toHaveLength(16);
  expect(new Set(CLUBS.map((c) => c.id)).size).toBe(CLUBS.length);
  const s = (id: string) => CLUBS.filter((c) => c.leagueId === id).map((c) => c.strength);
  expect(Math.max(...s('bzh2'))).toBeLessThan(Math.min(...s('ondn')));
  expect(Math.max(...s('krh1'))).toBeLessThanOrEqual(Math.max(...s('bzh2')));
});

it('Dritte Mannschaft bleibt unter der zweiten und der ersten', () => {
  const cl = initialClubLeague();
  const third = slugify('TSV Krähenwinkel/Kaltenweide III');
  expect(canPlayIn(third, 'bzh2', cl)).toBe(false); // dort spielt die Zweite
  expect(canPlayIn(third, 'krh1', cl)).toBe(true);
  expect(canPlayIn(slugify('TSV Krähenwinkel/Kaltenweide II'), 'llh', cl)).toBe(false); // dort spielt die Erste
});

it('Pass-XP aus Duellen: höchstens 200 pro Tag, am nächsten Tag wieder voll', () => {
  const day1 = new Date(2026, 10, 11, 12); // Mittwoch – beide Tage in derselben Pass-Woche
  const day2 = new Date(2026, 10, 12, 9);
  let club = freshClub();
  let total = 0;
  for (let i = 0; i < 10; i++) {
    const r = addDuelPassXp(club, 60, day1);
    club = r.club;
    total += r.granted;
  }
  expect(total).toBe(DUEL_XP_PER_DAY);
  expect(duelXpLeft(club, day1)).toBe(0);
  expect(passOf(club, day1).xp).toBe(DUEL_XP_PER_DAY);
  expect(duelXpLeft(club, day2)).toBe(DUEL_XP_PER_DAY);
  const next = addDuelPassXp(club, 60, day2);
  expect(next.granted).toBe(60);
  expect(passOf(next.club, day2).xp).toBe(DUEL_XP_PER_DAY + 60);
});

it('Karriere in der Kreisliga: Saison läuft, Meister steigt in die Bezirksliga auf, Bezirksliga-Letzter ab', async () => {
  const { createCareer } = await import('../career');
  const { simulateToBreak } = await import('../simple');
  let c = createCareer({ name: 'Kreisliga', nation: 'Deutschland', position: 'ST', age: 17, ovr: 50, potential: 72, clubId: slugify('FC Burgwedel') });
  expect(c.clubLeague[c.player.contract.clubId]).toBe('krh1');
  c = simulateToBreak(simulateToBreak(c));
  const r = c.history[0];
  expect(r.leagueId).toBe('krh1');
  expect(r.table).toHaveLength(16);
  expect(c.clubLeague[r.table[0].clubId]).toBe('bzh2');
  expect(Object.values(c.clubLeague).filter((l) => l === 'bzh2')).toHaveLength(17);
  expect(Object.values(c.clubLeague).filter((l) => l === 'krh1')).toHaveLength(16);
  expect(Object.values(c.clubLeague).filter((l) => l === 'llh')).toHaveLength(17);
});

it('Ganz unten: 1. Kreisklasse (9.) und 2. Kreisklasse (10.), Karriere von der 10. Liga aus', async () => {
  expect(getLeague('krh1').down?.leagueId).toBe('kk1h');
  expect(getLeague('kk1h').tier).toBe(9);
  expect(getLeague('kk2h').tier).toBe(10);
  expect(getLeague('kk2h').up?.leagueId).toBe('kk1h');
  expect(getLeague('kk2h').down).toBeUndefined();
  expect(CLUBS.filter((c) => c.leagueId === 'kk1h')).toHaveLength(14);
  expect(CLUBS.filter((c) => c.leagueId === 'kk2h')).toHaveLength(15);
  const cl = initialClubLeague();
  expect(canPlayIn(slugify('MTV Ilten II'), 'krh1', cl)).toBe(false);
  const { createCareer } = await import('../career');
  const { simulateToBreak } = await import('../simple');
  let c = createCareer({ name: 'Ganz unten', nation: 'Deutschland', position: 'ZM', age: 16, ovr: 48, potential: 75, clubId: slugify('TSV Bordenau') });
  expect(c.clubLeague[c.player.contract.clubId]).toBe('kk2h');
  c = simulateToBreak(simulateToBreak(c));
  const r = c.history[0];
  expect(r.leagueId).toBe('kk2h');
  expect(r.table).toHaveLength(15);
  expect(c.clubLeague[r.table[0].clubId]).toBe('kk1h');
  for (const [id, n] of [['krh1', 16], ['kk1h', 14], ['kk2h', 15]] as const) expect(Object.values(c.clubLeague).filter((l) => l === id)).toHaveLength(n);
});
