import { describe, expect, it } from 'vitest';
import { freshClub } from '../club';
import { PASS_LEVELS, PASS_REWARDS, XP_PER_LEVEL, addPassXp, claimPassReward, passCard, passLevel, passOf, unclaimedLevels } from '../pass';

// Mittwoch Woche 46 und die Woche danach
const oct = new Date(2026, 10, 11, 12);
const nov = new Date(2026, 10, 18, 12);

describe('Wochenpass', () => {
  it('60 Stufen, oben eine exklusive Karte, dazwischen Coins und Packs', () => {
    expect(PASS_REWARDS).toHaveLength(PASS_LEVELS);
    expect(PASS_REWARDS[PASS_LEVELS - 1].kind).toBe('card');
    expect(PASS_REWARDS.filter((r) => r.kind === 'pack').length).toBeGreaterThanOrEqual(25);
    // Gratis-Reihe: Ikonen, Ultimate und GOAT dabei, Coins mindestens 6.000 pro Stufe
    const n = (id: string) => PASS_REWARDS.filter((r) => r.kind === 'pack' && r.pack === id).length;
    expect([n('goat'), n('icon'), n('ultimate')]).toEqual([1, 2, 3]);
    expect(Math.min(...PASS_REWARDS.flatMap((r) => (r.kind === 'coins' ? [r.amount] : [])))).toBeGreaterThanOrEqual(3_000);
    const card = passCard('2026-W46');
    expect(card.variant).toBe('pass');
    expect(card.ovr).toBeLessThanOrEqual(97);
    expect(card.label).toBe('Woche 46');
    expect(passCard('2026-W46').id).toBe(card.id); // fest pro Woche
  });

  it('XP füllen Stufen, Belohnungen nur einmal abholbar', () => {
    let club = addPassXp(freshClub(), XP_PER_LEVEL * 2.5, oct);
    expect(passLevel(passOf(club, oct).xp)).toBe(2);
    expect(unclaimedLevels(club, oct)).toEqual([1, 2]);
    const before = club.coins;
    const res = claimPassReward(club, 1, oct)!;
    expect(res.club.coins).toBe(before + (PASS_REWARDS[0].kind === 'coins' ? PASS_REWARDS[0].amount : 0));
    club = res.club;
    expect(claimPassReward(club, 1, oct)).toBeNull();
    expect(claimPassReward(club, 3, oct)).toBeNull(); // noch nicht erreicht
  });

  it('Pack-Stufe öffnet ein Gratis-Pack, Stufe 60 gibt die Karte, neue Woche startet neu', () => {
    let club = addPassXp({ ...freshClub(), coins: 0 }, PASS_LEVELS * XP_PER_LEVEL + 500, oct);
    expect(passOf(club, oct).xp).toBe(PASS_LEVELS * XP_PER_LEVEL);
    const pack = claimPassReward(club, 2, oct)!;
    expect(pack.pack?.result.cards.length).toBeGreaterThan(0);
    expect(pack.club.coins).toBe(0);
    club = claimPassReward(pack.club, PASS_LEVELS, oct)!.club;
    expect(club.specials.some((s) => s.variant === 'pass')).toBe(true);
    expect(passOf(club, nov).xp).toBe(0);
    expect(unclaimedLevels(club, nov)).toEqual([]);
  });
});

describe('Pro-Pass', () => {
  it('kostet 200 Mio., gibt eine zweite Reihe und die Pro-Karte, gilt nur für die Woche', async () => {
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
    expect(card.card?.ovr).toBe(proPassCard('2026-W46').ovr);
    expect(proPassCard('2026-W46').ovr).toBeGreaterThan(passCard('2026-W46').ovr);
    expect(claimProReward(card.club, PASS_LEVELS, oct)).toBeNull();
    expect(unclaimedProLevels(card.club, nov)).toEqual([]); // neue Saison ohne Pro
  });
});

describe('Umstellung auf den Wochenpass', () => {
  it('Woche 44 übernimmt Saison 2 mit gleicher Stufe und Pro, Woche 45 startet neu, Woche geht Mo–So', async () => {
    const { currentPassSeason, passDaysLeft } = await import('../pass');
    const fri = new Date(2026, 9, 30, 12);
    const w = currentPassSeason(fri);
    expect(w.id).toBe('2026-W44');
    expect(w.start.getDay()).toBe(1); // Montag
    expect(w.end.getDay()).toBe(0); // Sonntag
    expect(passDaysLeft(fri)).toBe(3);
    expect(passCard('2026-W44').name).toBe('Harry Kane');
    const old = { ...freshClub(), pass: { season: '2026-S2', xp: 1250, claimed: [1, 2, 3], pro: true, proClaimed: [1] } };
    const now = passOf(old, fri);
    expect(now.season).toBe('2026-W44');
    expect(passLevel(now.xp)).toBe(12); // vorher 1250 XP bei 100 pro Stufe = Stufe 12
    expect(now.claimed).toEqual([1, 2, 3]);
    expect(now.pro).toBe(true);
    const next = passOf(old, new Date(2026, 10, 3, 12));
    expect(next.season).toBe('2026-W45');
    expect(next.xp).toBe(0);
    expect(next.pro).toBeUndefined();
  });
});
