import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer, playSeason } from '../career';
import { CARD_POOL, PACKS, applyItem, canUseItem, creditCareer, freshClub, openPack, sellDuplicates } from '../club';
import { specialsFor } from '../specials';
import type { SeasonRecord } from '../types';

const seq = (vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

it('Kartenpool: eindeutige IDs, Ikonen und Talente dabei', () => {
  expect(new Set(CARD_POOL.map((c) => c.id)).size).toBe(CARD_POOL.length);
  expect(CARD_POOL.some((c) => c.variant === 'icon')).toBe(true);
  expect(CARD_POOL.some((c) => c.variant === 'talent')).toBe(true);
});

it('Packs: Preis, Größe, Garantien, keine Karte doppelt im selben Pack', () => {
  let club = { ...freshClub(), coins: 100_000 };
  for (const pack of PACKS) {
    for (let k = 0; k < 30; k++) {
      const res = openPack(club, pack.id)!;
      expect(res.result.cards).toHaveLength(pack.size);
      expect(new Set(res.result.cards.map((c) => c.card.id)).size).toBe(pack.size);
      if (pack.id === 'premium') expect(res.result.cards.some((c) => c.card.ovr >= 85)).toBe(true);
      if (pack.id === 'icon') expect(res.result.cards.some((c) => c.card.variant === 'icon')).toBe(true);
      if (pack.id === 'gold') expect(res.result.cards.every((c) => c.card.ovr >= 75)).toBe(true);
      club = { ...res.club, coins: 100_000 };
    }
  }
  expect(openPack({ ...freshClub(), coins: 10 }, 'gold')).toBeNull();
  const free = openPack({ ...freshClub(), coins: 0 }, 'gold', seq([0.3, 0.6, 0.9]), true)!;
  expect(free.club.coins).toBe(0);
});

it('Doppelte verkaufen bringt Coins, eine Karte bleibt', () => {
  const id = CARD_POOL[0].id;
  const club = { ...freshClub(), cards: { [id]: 3 } };
  const res = sellDuplicates(club);
  expect(res.count).toBe(2);
  expect(res.club.cards[id]).toBe(1);
  expect(res.club.coins).toBeGreaterThan(club.coins);
});

it('Karriere-Saisons werden genau einmal ausgezahlt', () => {
  const c = playSeason(createCareer({ name: 'Coin', nation: 'Deutschland', position: 'ST', age: 22, ovr: 80, potential: 86, clubId: slugify('Borussia Dortmund') }));
  const a = creditCareer(freshClub(), c);
  expect(a.gained).toBeGreaterThan(300);
  expect(a.seasons).toBe(1);
  const b = creditCareer(a.club, c);
  expect(b.gained).toBe(0);
});

it('Sonderkarten nach starken Saisons', () => {
  const r = { avgRating: 7.6, apps: 40, goals: 31, trophies: ['Champions League'] } as unknown as SeasonRecord;
  expect(specialsFor(r, [{ stage: 0, leagueId: 'bl1', apps: 5, goals: 4, assists: 1, avgRating: 8.2, position: 1, points: 15 }]).sort()).toEqual(['champion', 'potm', 'record', 'tots']);
  const weak = { avgRating: 6.5, apps: 10, goals: 1, trophies: [] } as unknown as SeasonRecord;
  expect(specialsFor(weak, [])).toEqual([]);
});

it('Items: Trainingsboost nur einmal pro Saison und nicht über das Potenzial', () => {
  let c = createCareer({ name: 'Boost', nation: 'Deutschland', position: 'ST', age: 20, ovr: 70, potential: 80, clubId: slugify('SC Freiburg') });
  expect(canUseItem(c, 'training')).toBe(true);
  c = applyItem(c, 'training');
  expect(c.player.ovr).toBe(71);
  expect(canUseItem(c, 'training')).toBe(false);
  expect(canUseItem(c, 'fitness')).toBe(false);
});
