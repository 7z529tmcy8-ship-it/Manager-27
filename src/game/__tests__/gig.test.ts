import { describe, expect, it } from 'vitest';
import { CARD_POOL, freshClub, openPack, GIG_CARD_ID } from '../club';
import { GIG_DUPLICATE_COINS, GIG_SPIN_PRICE, GIG_WHEEL, gigFreeSpin, spinGig } from '../gig';

const day1 = new Date(2026, 9, 17, 12);
const day2 = new Date(2026, 9, 18, 20);
const after = new Date(2026, 9, 19, 0, 1);

describe('GIG-Event', () => {
  it('Rad: Chancen ergeben 100 %, Karte hat 0,5 %', () => {
    expect(GIG_WHEEL.reduce((a, p) => a + p.weight, 0)).toBe(1000);
    expect(GIG_WHEEL.find((p) => p.kind === 'card')!.weight).toBe(5);
    expect(CARD_POOL.find((c) => c.id === GIG_CARD_ID)?.ovr).toBe(95);
  });

  it('ein Gratis-Dreh pro Tag, danach Coins, nach dem Event geht nichts mehr', () => {
    let club = { ...freshClub(), coins: GIG_SPIN_PRICE };
    expect(gigFreeSpin(club, day1)).toBe(true);
    club = spinGig(club, day1, () => 0.5)!.club;
    expect(club.coins).toBe(GIG_SPIN_PRICE);
    expect(gigFreeSpin(club, day1)).toBe(false);
    club = spinGig(club, day1, () => 0.5)!.club;
    expect(club.coins).toBe(0);
    expect(spinGig(club, day1, () => 0.5)).toBeNull(); // keine Coins
    expect(gigFreeSpin(club, day2)).toBe(true); // neuer Tag
    expect(spinGig({ ...club, coins: 1e6 }, after)).toBeNull();
  });

  it('Jackpot gibt die Karte, doppelt gibt Coins', () => {
    // Zufallswert genau im Karten-Feld
    const before = GIG_WHEEL.slice(0, GIG_WHEEL.findIndex((p) => p.kind === 'card')).reduce((a, p) => a + p.weight, 0);
    const rand = () => (before + 2) / 1000;
    const first = spinGig({ ...freshClub(), coins: 0 }, day1, rand)!;
    expect(first.prize.kind).toBe('card');
    expect(first.club.cards[GIG_CARD_ID]).toBe(1);
    const second = spinGig({ ...first.club, gig: undefined }, day2, rand)!;
    expect(second.duplicateCoins).toBe(GIG_DUPLICATE_COINS);
    expect(second.club.coins).toBe(GIG_DUPLICATE_COINS);
  });

  it('die GIG-Karte kommt in keinem normalen Pack', () => {
    for (let i = 0; i < 300; i++) {
      const r = openPack({ ...freshClub(), coins: 1e9 }, 'icon')!;
      expect(r.result.cards.some((c) => c.card.id === GIG_CARD_ID)).toBe(false);
    }
  });
});
