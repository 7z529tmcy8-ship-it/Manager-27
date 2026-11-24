import { describe, expect, it } from 'vitest';
import { CARDS_FROM_CAREER_ONLY } from '../mode';
import { freshClub } from '../club';
import { claimDaily, claimDailyBonus, dailyView, trackDaily } from '../daily';

const day = new Date(2026, 10, 20, 12);
const next = new Date(2026, 10, 21, 12);

describe('Tagesziele', () => {
  it('zählt Fortschritt, deckelt beim Ziel und setzt am nächsten Tag zurück', () => {
    let c = freshClub();
    c = trackDaily(c, 'duel', 1, day);
    c = trackDaily(c, 'duel', 5, day);
    expect(dailyView(c, day).tasks.find((t) => t.id === 'duel')!.have).toBe(2);
    expect(dailyView(c, next).tasks.every((t) => t.have === 0)).toBe(true);
  });
  it('zahlt erledigte Ziele einmal aus und gibt danach das Gold-Pack', () => {
    let c = { ...freshClub(), coins: 0 };
    for (const id of ['career', 'pack'] as const) c = trackDaily(c, id, 1, day);
    c = trackDaily(c, 'duel', 2, day);
    c = trackDaily(c, 'casino', 5, day);
    const r = claimDaily(c, day);
    // Ohne Karten-Shop gibt es kein Pack-Ziel (1.000 Coins weniger) und der Bonus sind Coins
    expect(r.coins).toBe(CARDS_FROM_CAREER_ONLY ? 3500 : 4500);
    expect(r.chips).toBe(750);
    expect(claimDaily(r.club, day).coins).toBe(0);
    const b = claimDailyBonus(r.club, day, () => 0.5);
    expect(b).not.toBeNull();
    if (CARDS_FROM_CAREER_ONLY) { expect(b!.result.cards).toHaveLength(0); expect(b!.club.coins).toBe(r.club.coins + 5000); }
    else expect(b!.result.cards.length).toBeGreaterThan(0);
    expect(claimDailyBonus(b!.club, day)).toBeNull();
  });
});
