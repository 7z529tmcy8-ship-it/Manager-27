import { expect, it } from 'vitest';
import { freshClub, openStoredPack, storePacks } from '../club';
import { addPassXp, claimPassReward, PASS_REWARDS } from '../pass';

it('Pack-Ablage: Packs ablegen, später einzeln öffnen, jedes nur einmal', () => {
  let club = storePacks(freshClub(), ['gold', 'premium', 'gibtsnicht'], 'Test');
  expect(club.storedPacks!.map((p) => p.pack)).toEqual(['gold', 'premium']);
  const before = Object.values(club.cards).reduce((a, b) => a + b, 0);
  const res = openStoredPack(club, club.storedPacks![0].id)!;
  expect(res.name).toBe('Gold-Pack');
  expect(res.result.cards.length).toBeGreaterThan(0);
  club = res.club;
  expect(club.storedPacks!.map((p) => p.pack)).toEqual(['premium']);
  expect(Object.values(club.cards).reduce((a, b) => a + b, 0)).toBeGreaterThan(before);
  expect(openStoredPack(club, 'falsch')).toBeNull();
});

it('Saison-Pass: Pack-Stufe kann in die Ablage statt sofort geöffnet zu werden', () => {
  const now = new Date(2026, 10, 2);
  const lvl = PASS_REWARDS.find((r) => r.kind === 'pack')!.level;
  const club = addPassXp(freshClub(), lvl * 100, now);
  const res = claimPassReward(club, lvl, now, Math.random, true)!;
  expect(res.pack).toBeUndefined();
  expect(res.stored).toBeDefined();
  expect(res.club.storedPacks).toHaveLength(1);
  expect(Object.keys(res.club.cards)).toHaveLength(Object.keys(club.cards).length);
  // Stufe gilt als abgeholt
  expect(claimPassReward(res.club, lvl, now)).toBeNull();
});
