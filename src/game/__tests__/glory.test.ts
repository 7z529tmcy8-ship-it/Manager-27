import { expect, it } from 'vitest';
import { freshClub } from '../club';
import { DROPS_PER_DAY, DROP_ODDS, ROAD, addTrophies, claimAllRoad, claimRoad, grantDrop, openDrop, roadReady, rollRarity } from '../glory';

const now = new Date(2026, 9, 28, 12);

it('Drop-Chancen ergeben 100 % und die Verteilung passt grob', () => {
  expect(Object.values(DROP_ODDS).reduce((a, b) => a + b, 0)).toBeCloseTo(100);
  const n: Record<string, number> = {};
  for (let i = 0; i < 5000; i++) { const r = rollRarity(); n[r] = (n[r] ?? 0) + 1; }
  expect(n.selten / 5000).toBeGreaterThan(0.44);
  expect((n.legendaer ?? 0) / 5000).toBeLessThan(0.04);
});

it('Duell-Drops sind pro Tag gedeckelt, Ruhmesweg-Drops nicht', () => {
  let c = freshClub();
  for (let i = 0; i < DROPS_PER_DAY + 3; i++) c = grantDrop(c, now).club;
  expect(c.drops).toBe(DROPS_PER_DAY);
  c = grantDrop(c, now, false).club;
  expect(c.drops).toBe(DROPS_PER_DAY + 1);
  expect(grantDrop(c, new Date(2026, 9, 29, 12)).granted).toBe(true);
});

it('Drop öffnen: Seltenheit Schritt für Schritt, Belohnung gutgeschrieben', () => {
  const c = { ...freshClub(), drops: 2 };
  const res = openDrop(c, () => 0.99)!; // höchste Seltenheit
  expect(res.rarity).toBe('legendaer');
  expect(res.steps).toEqual(['selten', 'superselten', 'episch', 'mythisch', 'legendaer']);
  expect(res.club.drops).toBe(1);
  expect(res.club.storedPacks?.length).toBe(1);
  const coins = openDrop(c, () => 0.01)!;
  expect(coins.rarity).toBe('selten');
  expect(coins.club.coins).toBeGreaterThan(c.coins);
  expect(openDrop(freshClub())).toBeNull();
});

it('Ruhmesweg: Bestwert zählt, jede Stufe nur einmal', () => {
  let c = addTrophies(freshClub(), 400);
  c = addTrophies(c, -100);
  expect(c.trophies).toBe(300);
  expect(c.trophyBest).toBe(400);
  expect(roadReady(c)).toBe(ROAD.filter((s) => s.at <= 400).length);
  const once = claimRoad(c, 75)!;
  expect(claimRoad(once, 75)).toBeNull();
  expect(claimRoad(c, 3000)).toBeNull();
  const all = claimAllRoad(c);
  expect(roadReady(all)).toBe(0);
  expect(addTrophies(freshClub(), -50).trophies).toBe(0);
});

it('Drop-Shop: kaufen, Mega-Drop mindestens Episch, Karten-Belohnungen landen in der Sammlung', async () => {
  const { buyDrops, DROP_SHOP, dropReward } = await import('../glory');
  expect(buyDrops({ ...freshClub(), coins: 1000 }, 'drop1')).toBeNull();
  let c = buyDrops({ ...freshClub(), coins: 200_000 }, 'drop5')!;
  expect(c.drops).toBe(5);
  expect(c.coins).toBe(200_000 - DROP_SHOP.find((o) => o.id === 'drop5')!.price);
  c = buyDrops(c, 'mega')!;
  expect(c.megaDrops).toBe(1);
  for (let i = 0; i < 200; i++) {
    const m = openDrop({ ...c }, Math.random, Date.now(), 'mega')!;
    expect(['episch', 'mythisch', 'legendaer']).toContain(m.rarity);
    expect(m.steps[0]).toBe('episch');
    expect(m.club.megaDrops).toBe(0);
  }
  let cards = 0;
  for (let i = 0; i < 300; i++) {
    const r = dropReward('legendaer');
    if (r.kind === 'card') { cards++; expect(r.card.variant).toBe('icon'); }
  }
  expect(cards).toBeGreaterThan(50);
  const withCard = openDrop({ ...freshClub(), drops: 1 }, (() => { const seq = [0.99, 0.1, 0.5]; let k = 0; return () => seq[k++ % 3]; })())!;
  expect(withCard.reward.kind).toBe('card');
  if (withCard.reward.kind === 'card') expect(withCard.club.cards[withCard.reward.card.id]).toBe(1);
});
