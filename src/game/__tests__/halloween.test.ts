import { expect, it } from 'vitest';
import { PACKS, activePacks, ballonTipCorrect, claimBallonTip, eventActive, eventOfCard, freshClub, halloweenActive, openPack, setBallonTip } from '../club';
import { MOMENTS, momentVisible } from '../legendTrades';

it('Halloween: Kostümkarten nur in Halloween-Packs, Garantien stimmen, Ende am 2. November', () => {
  let club = { ...freshClub(), coins: 50_000_000 };
  for (let i = 0; i < 40; i++) {
    const res = openPack(club, 'pumpkin')!;
    expect(res.result.cards.some((c) => c.card.variant === 'halloween')).toBe(true);
    // Geisternacht-Karten gibt es nur im Geisternacht-Pack
    expect(res.result.cards.some((c) => eventOfCard(c.card) === 'geisternacht')).toBe(false);
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
  expect(activePacks(new Date(2026, 10, 3)).some((p) => p.event === 'halloween')).toBe(false);
});

it('Geisternacht nur am 30. und 31. Oktober, Gala-Woche ab der Verleihung', () => {
  expect(eventActive('geisternacht', new Date(2026, 9, 29, 23))).toBe(false);
  expect(eventActive('geisternacht', new Date(2026, 9, 30, 10))).toBe(true);
  expect(eventActive('geisternacht', new Date(2026, 9, 31, 23))).toBe(true);
  expect(eventActive('geisternacht', new Date(2026, 10, 1, 0, 1))).toBe(false);
  expect(activePacks(new Date(2026, 9, 30, 12)).map((p) => p.id)).toContain('geisternacht');
  expect(activePacks(new Date(2026, 9, 20)).map((p) => p.id)).not.toContain('geisternacht');
  expect(eventActive('gala', new Date(2026, 9, 26, 20))).toBe(false);
  expect(eventActive('gala', new Date(2026, 9, 26, 21, 30))).toBe(true);
  expect(eventActive('gala', new Date(2026, 9, 30, 12))).toBe(false); // vorzeitig beendet
  const club = { ...freshClub(), coins: 1_000_000 };
  for (let i = 0; i < 20; i++) {
    expect(openPack(club, 'geisternacht')!.result.cards.some((c) => eventOfCard(c.card) === 'geisternacht')).toBe(true);
    expect(openPack(club, 'gala')!.result.cards.some((c) => c.card.variant === 'gala')).toBe(true);
  }
  const suarez = MOMENTS.find((m) => m.id === 'moment-suarez-geisternacht')!;
  expect(suarez.event).toBe('geisternacht');
  expect(momentVisible(freshClub(), suarez)).toBe(eventActive('geisternacht'));
});

it('Ballon-d’Or-Tipp: nur vor der Verleihung, Gratis-Pack bei richtigem Tipp', () => {
  const before = new Date(2026, 9, 20);
  const club = setBallonTip(freshClub(), 'Lamine Yamal', before);
  expect(club.ballonTip).toBe('Lamine Yamal');
  expect(setBallonTip(club, 'Harry Kane', new Date(2026, 9, 27)).ballonTip).toBe('Lamine Yamal');
  expect(ballonTipCorrect(club, null)).toBeNull();
  expect(claimBallonTip(club, Math.random, 'Harry Kane')).toBeNull();
  const won = claimBallonTip(club, Math.random, 'Lamine Yamal')!;
  expect(won.result.cards.some((c) => c.card.variant === 'gala')).toBe(true);
  expect(claimBallonTip(won.club, Math.random, 'Lamine Yamal')).toBeNull();
});
