import { describe, expect, it } from 'vitest';
import { CARD_POOL, activePacks, freshClub, openPack } from '../club';
import { ADVENT, adventToday, claimNewYearGift, newYearGiftOpen, openAdventDoor } from '../winter';

const dec5 = new Date(2026, 11, 5, 12);
const dec24 = new Date(2026, 11, 24, 12);

describe('Winter-Wunder und Silvester', () => {
  it('Event-Karten existieren und kommen nur in ihren Packs', () => {
    expect(CARD_POOL.filter((c) => c.variant === 'winter').length).toBe(12);
    expect(CARD_POOL.filter((c) => c.variant === 'silvester').length).toBe(6);
    for (let i = 0; i < 200; i++) {
      const r = openPack({ ...freshClub(), coins: 1e9 }, 'icon')!;
      expect(r.result.cards.some((c) => c.card.variant === 'winter' || c.card.variant === 'silvester')).toBe(false);
    }
    const w = openPack({ ...freshClub(), coins: 1e9 }, 'winter')!;
    expect(w.result.cards.some((c) => c.card.variant === 'winter')).toBe(true);
    expect(activePacks(new Date(2026, 9, 20)).some((p) => p.id === 'winter' || p.id === 'silvester')).toBe(false);
    expect(activePacks(dec5).some((p) => p.id === 'winter')).toBe(true);
    expect(activePacks(new Date(2026, 11, 31, 20)).some((p) => p.id === 'silvester')).toBe(true);
  });

  it('Adventskalender: bis heute öffnen, jedes Türchen einmal, 24 = Winter-Karte', () => {
    expect(adventToday(new Date(2026, 10, 30))).toBe(0);
    expect(adventToday(dec5)).toBe(5);
    let club = freshClub();
    expect(openAdventDoor(club, 6, dec5)).toBeNull(); // Zukunft
    const one = openAdventDoor(club, 1, dec5)!;
    expect(one.club.coins).toBe(club.coins + (ADVENT[0].kind === 'coins' ? ADVENT[0].amount : 0));
    club = one.club;
    expect(openAdventDoor(club, 1, dec5)).toBeNull(); // schon offen
    const last = openAdventDoor(club, 24, dec24)!;
    expect(last.card?.variant).toBe('winter');
  });

  it('Neujahrs-Geschenk einmal während Silvester', () => {
    const nye = new Date(2026, 11, 31, 23);
    let club = freshClub();
    expect(newYearGiftOpen(club, dec5)).toBe(false);
    const res = claimNewYearGift(club, nye)!;
    expect(res.result.cards.some((c) => c.card.variant === 'silvester')).toBe(true);
    club = res.club;
    expect(claimNewYearGift(club, nye)).toBeNull();
  });
});
