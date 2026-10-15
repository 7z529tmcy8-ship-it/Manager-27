import { describe, expect, it } from 'vitest';
import { freshClub } from '../club';
import { PASS_LEVELS, PASS_REWARDS, XP_PER_LEVEL, addPassXp, claimPassReward, passCard, passLevel, passOf, unclaimedLevels } from '../pass';

const oct = new Date(2026, 9, 15, 12);
const nov = new Date(2026, 10, 2, 12);

describe('Saison-Pass', () => {
  it('30 Stufen, oben eine exklusive Karte, dazwischen Coins und Packs', () => {
    expect(PASS_REWARDS).toHaveLength(PASS_LEVELS);
    expect(PASS_REWARDS[PASS_LEVELS - 1].kind).toBe('card');
    expect(PASS_REWARDS.filter((r) => r.kind === 'pack').length).toBeGreaterThanOrEqual(10);
    const card = passCard('2026-10');
    expect(card.variant).toBe('pass');
    expect(card.ovr).toBeLessThanOrEqual(97);
    expect(passCard('2026-10').id).toBe(card.id); // fest pro Saison
  });

  it('XP füllen Stufen, Belohnungen nur einmal abholbar', () => {
    let club = addPassXp(freshClub(), 250, oct);
    expect(passLevel(passOf(club, oct).xp)).toBe(2);
    expect(unclaimedLevels(club, oct)).toEqual([1, 2]);
    const before = club.coins;
    const res = claimPassReward(club, 1, oct)!;
    expect(res.club.coins).toBe(before + (PASS_REWARDS[0].kind === 'coins' ? PASS_REWARDS[0].amount : 0));
    club = res.club;
    expect(claimPassReward(club, 1, oct)).toBeNull();
    expect(claimPassReward(club, 3, oct)).toBeNull(); // noch nicht erreicht
  });

  it('Pack-Stufe öffnet ein Gratis-Pack, Stufe 30 gibt die Karte, neuer Monat startet neu', () => {
    let club = addPassXp({ ...freshClub(), coins: 0 }, PASS_LEVELS * XP_PER_LEVEL + 500, oct);
    expect(passOf(club, oct).xp).toBe(PASS_LEVELS * XP_PER_LEVEL);
    const pack = claimPassReward(club, 3, oct)!;
    expect(pack.pack?.result.cards.length).toBeGreaterThan(0);
    expect(pack.club.coins).toBe(0);
    club = claimPassReward(pack.club, PASS_LEVELS, oct)!.club;
    expect(club.specials.some((s) => s.variant === 'pass')).toBe(true);
    expect(passOf(club, nov).xp).toBe(0);
    expect(unclaimedLevels(club, nov)).toEqual([]);
  });
});
