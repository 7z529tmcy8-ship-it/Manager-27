import { expect, it } from 'vitest';
import { freshClub } from '../club';
import { redeemCode } from '../codes';

it('Code METEOR: 10 verschiedene Ikonen, nur einmal, Schreibweise egal', () => {
  const r = redeemCode(freshClub(), '  meteor ');
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.result.cards).toHaveLength(10);
  expect(new Set(r.result.cards.map((c) => c.card.id)).size).toBe(10);
  r.result.cards.forEach((c) => expect(c.card.variant).toBe('icon'));
  expect(Object.values(r.club.cards).reduce((a, b) => a + b, 0)).toBe(10);
  expect(redeemCode(r.club, 'METEOR')).toEqual({ ok: false, reason: 'used' });
  expect(redeemCode(freshClub(), 'GIBTSNICHT')).toEqual({ ok: false, reason: 'unknown' });
});
