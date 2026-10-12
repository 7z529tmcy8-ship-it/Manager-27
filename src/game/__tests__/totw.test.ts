import { expect, it } from 'vitest';
import { TOTW_BOOST, TOTW_PACK, freshClub, isoWeek, openTotwPack, teamOfTheWeek } from '../club';
import { REAL_PLAYERS } from '../../data/players';

it('Team der Woche: 11 Spieler im 4-3-3, fest pro Woche, neue Elf in der nächsten Woche', () => {
  const mon = new Date(2026, 9, 12, 10);
  const sun = new Date(2026, 9, 18, 22);
  expect(isoWeek(mon).id).toBe('2026-W42');
  expect(isoWeek(sun).id).toBe('2026-W42');
  const a = teamOfTheWeek(mon);
  expect(a).toHaveLength(11);
  expect(teamOfTheWeek(sun).map((c) => c.id)).toEqual(a.map((c) => c.id));
  expect(a[0].position).toBe('TW');
  expect(new Set(a.map((c) => c.name)).size).toBe(11);
  expect(a.every((c) => c.variant === 'totw' && c.label === 'KW 42' && c.ovr >= 80 + TOTW_BOOST)).toBe(true);
  const next = teamOfTheWeek(new Date(2026, 9, 19, 10));
  expect(next.map((c) => c.id)).not.toEqual(a.map((c) => c.id));
});

it('Team-der-Woche-Pack: 3 Karten, eine davon aus der Elf, Doppelte geben Coins', () => {
  const now = new Date(2026, 9, 12, 10);
  const club = { ...freshClub(), coins: 1_000_000 };
  const r = openTotwPack(club, () => 0, now)!;
  expect(r.result.cards).toHaveLength(3);
  expect(r.result.cards[0].card.variant).toBe('totw');
  expect(r.club.specials).toHaveLength(1);
  expect(r.club.coins).toBe(club.coins - TOTW_PACK.price);
  expect(Object.values(r.club.cards).reduce((a, n) => a + n, 0)).toBe(2);
  const again = openTotwPack(r.club, () => 0, now)!;
  expect(again.result.cards[0].duplicate).toBe(true);
  expect(again.club.specials).toHaveLength(1);
  expect(again.club.coins).toBe(r.club.coins - TOTW_PACK.price + 2000);
  expect(openTotwPack({ ...freshClub(), coins: 100 }, Math.random, now)).toBeNull();
});

it('Neue Torhüter und Ligen sind da', () => {
  const keepers = REAL_PLAYERS.filter((p) => p.position === 'TW' && p.ovr >= 84);
  expect(keepers.length).toBeGreaterThanOrEqual(11);
});
