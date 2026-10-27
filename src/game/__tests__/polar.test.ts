import { expect, it } from 'vitest';
import { freshClub as newClub } from '../club';
import { POLAR, POLAR_UNLOCK, openPolarDoor, polarDoorPrice, polarDoorState, polarNextBuyable, polarVisible, unlockPolar } from '../polar';

const oct = new Date(2026, 9, 27, 12);
const dec5 = new Date(2026, 11, 5, 12);
const rich = () => ({ ...newClub(), coins: 5_000_000 });

it('Freischalten kostet 1 Mio. und geht schon im Oktober', () => {
  expect(polarVisible(oct)).toBe(true);
  expect(unlockPolar({ ...newClub(), coins: POLAR_UNLOCK - 1 }, oct)).toBeNull();
  const c = unlockPolar(rich(), oct)!;
  expect(c.coins).toBe(5_000_000 - POLAR_UNLOCK);
  expect(c.polar?.unlocked).toBe(true);
  expect(polarVisible(new Date(2026, 11, 28, 12))).toBe(false);
});

it('Vor Dezember: nur der Reihe nach freikaufen', () => {
  let c = unlockPolar(rich(), oct)!;
  expect(polarDoorState(c, 1, oct)).toBe('buy');
  expect(polarDoorState(c, 2, oct)).toBe('locked');
  expect(openPolarDoor(c, 2, oct)).toBeNull();
  const before = c.coins;
  const res = openPolarDoor(c, 1, oct)!;
  expect(res.paid).toBe(polarDoorPrice(1));
  expect(res.club.coins).toBe(before - polarDoorPrice(1) + 25_000);
  c = res.club;
  expect(polarNextBuyable(c, oct)).toBe(2);
});

it('Im Dezember: Tage bis heute gratis, danach kaufbar; Winter-Karten in den Karten-Türchen', () => {
  let c = unlockPolar(rich(), oct)!;
  for (let d = 1; d <= 5; d++) expect(polarDoorState(c, d, dec5)).toBe('free');
  expect(polarDoorState(c, 6, dec5)).toBe('buy');
  const coins = c.coins;
  c = openPolarDoor(c, 3, dec5)!.club;
  expect(c.coins).toBe(coins + 30_000);
  const card = openPolarDoor(c, 6, dec5)!;
  expect(card.paid).toBe(polarDoorPrice(6));
  expect(card.card?.variant).toBe('winter');
  // Ohne Freischaltung geht nichts
  expect(polarDoorState(newClub(), 1, dec5)).toBe('locked');
});

it('Alles freikaufen: 24 Türchen, Türchen 24 die stärkste fehlende Winterkarte', () => {
  let c = unlockPolar(rich(), oct)!;
  for (const r of POLAR) c = openPolarDoor(c, r.day, oct, () => 0.3)!.club;
  expect(c.polar?.opened).toHaveLength(24);
  expect(polarNextBuyable(c, oct)).toBeNull();
});
