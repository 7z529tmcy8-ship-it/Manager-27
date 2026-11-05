import { expect, it } from 'vitest';
import { freshClub } from '../club';
import { HALLWAY_CARDS, hallwayCards, redeemCode } from '../codes';
import { BANNERS, TITLES } from '../profile';

it('HALLWAY und TAUBE: 3 Karten, eine ab 88, keine doppelten Namen, Banner und Titel', () => {
  const club = freshClub();
  for (const code of ['HALLWAY', 'taube', ' Hallway ']) {
    const r = redeemCode(club, code);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.theme).toBe('hallway');
    expect(r.result.cards).toHaveLength(HALLWAY_CARDS);
    expect(r.result.cards.some((c) => c.card.ovr >= 88)).toBe(true);
    expect(r.result.cards.every((c) => c.card.ovr >= 82)).toBe(true);
    expect(new Set(r.result.cards.map((c) => c.card.name)).size).toBe(HALLWAY_CARDS);
    expect(BANNERS.find((b) => b.id === 'hallway')!.ok!(r.club, 1)).toBe(true);
  }
  expect(TITLES.find((t) => t.id === 'hallway')).toBeTruthy();
  // Bevorzugt neue Karten
  const have = hallwayCards(club);
  const owned = { ...club, cards: Object.fromEntries(have.map((c) => [c.id, 1])) };
  expect(hallwayCards(owned).some((c) => have.some((h) => h.id === c.id))).toBe(false);
});
