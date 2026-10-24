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

describe('Pro-Pass', () => {
  it('kostet 200 Mio., gibt eine zweite Reihe und die Pro-Karte, gilt nur für die Saison', async () => {
    const { PRO_PASS_PRICE, PRO_REWARDS, buyProPass, claimProReward, unclaimedProLevels, proPassCard } = await import('../pass');
    expect(PRO_PASS_PRICE).toBe(200_000_000);
    expect(PRO_REWARDS).toHaveLength(PASS_LEVELS);
    const count = (id: string) => PRO_REWARDS.filter((r) => r.kind === 'pack' && r.pack === id).length;
    expect([count('goat'), count('ultimate'), count('icon')]).toEqual([5, 16, 6]);
    expect(buyProPass({ ...freshClub(), coins: PRO_PASS_PRICE - 1 }, oct)).toBeNull();
    let club = addPassXp({ ...freshClub(), coins: PRO_PASS_PRICE }, PASS_LEVELS * XP_PER_LEVEL, oct);
    expect(unclaimedProLevels(club, oct)).toEqual([]);
    club = buyProPass(club, oct)!;
    expect(club.coins).toBe(0);
    expect(buyProPass({ ...club, coins: PRO_PASS_PRICE }, oct)).toBeNull(); // nur einmal pro Saison
    expect(unclaimedProLevels(club, oct)).toHaveLength(PASS_LEVELS);
    const goat = claimProReward(club, 10, oct)!;
    expect(goat.pack?.result.cards.length).toBeGreaterThan(0);
    const card = claimProReward(goat.club, PASS_LEVELS, oct)!;
    expect(card.card?.ovr).toBe(proPassCard('2026-10').ovr);
    expect(proPassCard('2026-10').ovr).toBeGreaterThan(passCard('2026-10').ovr);
    expect(claimProReward(card.club, PASS_LEVELS, oct)).toBeNull();
    expect(unclaimedProLevels(card.club, nov)).toEqual([]); // neue Saison ohne Pro
  });
});

describe('Saison 2', () => {
  it('ersetzt den Oktober-Pass ab 24.10.: 60 Stufen, neuer Held, Pro wird übernommen', async () => {
    const { PASS_LEVELS, PRO_PASS_PRICE, buyProPass, currentPassSeason, passCard, passOf, passDaysLeft } = await import('../pass');
    expect(PASS_LEVELS).toBe(60);
    const before = new Date(2026, 9, 23, 12);
    const now = new Date(2026, 9, 24, 12);
    expect(currentPassSeason(before).id).toBe('2026-10');
    expect(currentPassSeason(now).id).toBe('2026-S2');
    expect(passDaysLeft(now)).toBeGreaterThan(30);
    expect(passCard('2026-S2').label).toBe('Saison 2');
    expect(passCard('2026-S2').name).toBe('Harry Kane');
    let club = addPassXp({ ...freshClub(), coins: PRO_PASS_PRICE }, 500, before);
    club = buyProPass(club, before)!;
    const s2 = passOf(club, now);
    expect(s2.season).toBe('2026-S2');
    expect(s2.xp).toBe(0);
    expect(s2.pro).toBe(true);
    expect(passOf(freshClub(), now).pro).toBeUndefined();
  });
});
