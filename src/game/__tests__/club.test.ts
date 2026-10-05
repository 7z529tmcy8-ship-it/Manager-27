import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer, playSeason } from '../career';
import { CARD_POOL, PACKS, packTier, type CollectCard, applyItem, canUseItem, creditCareer, freshClub, openPack, sellDuplicates } from '../club';
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
  let club = { ...freshClub(), coins: 1_000_000 };
  for (const pack of PACKS) {
    for (let k = 0; k < 30; k++) {
      const res = openPack(club, pack.id)!;
      expect(res.result.cards).toHaveLength(pack.size);
      expect(new Set(res.result.cards.map((c) => c.card.id)).size).toBe(pack.size);
      const cards = res.result.cards.map((c) => c.card);
      const top = (c: CollectCard) => ['rare', 'elite', 'special', 'icon'].includes(packTier(c));
      if (pack.id === 'premium') expect(cards.some(top)).toBe(true);
      if (pack.id === 'icon') expect(cards.some((c) => c.variant === 'icon')).toBe(true);
      if (pack.id === 'cult') expect(cards.some((c) => c.variant === 'cult')).toBe(true);
      if (pack.id === 'gold') expect(cards.every((c) => c.ovr >= 75)).toBe(true);
      if (pack.id === 'germany') expect(cards.every((c) => c.nation === 'Deutschland')).toBe(true);
      if (pack.id === 'bundesliga') expect(cards.every((c) => c.league === 'Bundesliga')).toBe(true);
      if (pack.id === 'wonder') expect(cards.every((c) => (c.age ?? 99) <= 21)).toBe(true);
      if (pack.id === 'worldstar') expect(cards.some(top)).toBe(true);
      if (pack.id === 'goat') expect(cards.every((c) => c.variant === 'icon' && c.ovr >= 94)).toBe(true);
      club = { ...res.club, coins: 1_000_000 };
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

it('Kurznamen für kleine Karten', async () => {
  const { shortName } = await import('../../components/UtCard');
  expect(shortName('Said El Mala')).toBe('El Mala');
  expect(shortName('Virgil van Dijk')).toBe('van Dijk');
  expect(shortName('Marc-André ter Stegen')).toBe('ter Stegen');
  expect(shortName('Vinícius Júnior')).toBe('Vini Jr.');
  expect(shortName('Jamal Musiala')).toBe('Musiala');
  expect(shortName('Pelé')).toBe('Pelé');
});

it('Karten verbessern: teurer pro Stufe, max 99, rund 500.000 Coins von 90 auf 99', async () => {
  const { upgradeCard, upgradeCost, costTo99, withUpgrade, getCard } = await import('../club');
  expect(upgradeCost(91)).toBeGreaterThan(upgradeCost(90));
  expect(costTo99(90)).toBeGreaterThan(450_000);
  expect(costTo99(90)).toBeLessThan(550_000);
  const id = CARD_POOL.find((c) => c.ovr === 90 && c.variant !== 'icon')!.id;
  let club = { ...freshClub(), coins: 600_000, cards: { [id]: 1 } };
  expect(upgradeCard({ ...club, cards: {} }, id)).toBeNull(); // nicht im Besitz
  for (let i = 0; i < 12; i++) club = upgradeCard(club, id) ?? club;
  const card = withUpgrade(club, getCard(id)!);
  expect(card.ovr).toBe(99);
  expect(card.boost).toBe(9);
  expect(club.coins).toBe(600_000 - costTo99(90));
  expect(upgradeCard({ ...freshClub(), coins: 10, cards: { [id]: 1 } }, id)).toBeNull(); // zu wenig Coins
});

it('Packs sind hart: Top-Karten selten, Chancen passen zur Anzeige', async () => {
  const { oddsAtLeast, packTier } = await import('../club');
  const draws = (id: string, n: number) => {
    const out: CollectCard[] = [];
    for (let i = 0; i < n; i++) out.push(...openPack({ ...freshClub(), coins: 1e9 }, id)!.result.cards.map((c) => c.card));
    return out;
  };
  const gold = draws('gold', 3000);
  const elitePlus = gold.filter((c) => ['elite', 'special', 'icon'].includes(packTier(c))).length / gold.length;
  expect(elitePlus).toBeLessThan(0.04);
  expect(Math.abs(elitePlus * 100 - oddsAtLeast(PACKS.find((p) => p.id === 'gold')!.odds, 'elite'))).toBeLessThan(1.2);
  const std = draws('standard', 2000);
  expect(std.filter((c) => c.variant === 'icon').length / std.length).toBeLessThan(0.005);
  expect(CARD_POOL.filter((c) => c.variant === 'cult').length).toBeGreaterThanOrEqual(25);
});
