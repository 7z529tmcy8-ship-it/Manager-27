import { expect, it } from 'vitest';
import { PACKS, activePacks, freshClub, halloweenActive, openPack } from '../club';

it('Halloween: Kostümkarten nur in Halloween-Packs, Garantien stimmen, Ende am 2. November', () => {
  let club = { ...freshClub(), coins: 50_000_000 };
  for (let i = 0; i < 40; i++) {
    const res = openPack(club, 'pumpkin')!;
    expect(res.result.cards.some((c) => c.card.variant === 'halloween')).toBe(true);
    const g = openPack(res.club, 'ghosthour')!;
    expect(g.result.cards.some((c) => c.card.variant === 'halloween' && c.card.ovr >= 92)).toBe(true);
    club = g.club;
  }
  for (const p of PACKS.filter((x) => !x.event)) {
    for (let i = 0; i < 25; i++) {
      const res = openPack(club, p.id)!;
      expect(res.result.cards.some((c) => c.card.variant === 'halloween'), p.id).toBe(false);
      club = res.club;
    }
  }
  expect(halloweenActive(new Date(2026, 9, 9))).toBe(true);
  expect(halloweenActive(new Date(2026, 10, 3))).toBe(false);
  expect(activePacks(new Date(2026, 10, 3)).some((p) => p.event)).toBe(false);
});
