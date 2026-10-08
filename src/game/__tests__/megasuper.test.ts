import { expect, it } from 'vitest';
import { GERVINHO_GIFT, MEGA_SUPER_SIZE, freshClub, openMegaSuper } from '../club';

it('Mega Super XXL Pack: Gervinho (89) zuerst, 8 verschiedene Karten ab 85, nur einmal', () => {
  const res = openMegaSuper(freshClub())!;
  expect(res.result.cards[0].card.id).toBe(GERVINHO_GIFT.id);
  expect(res.result.cards[0].card.ovr).toBe(89);
  const rest = res.result.cards.slice(1);
  expect(rest).toHaveLength(MEGA_SUPER_SIZE);
  expect(new Set(rest.map((c) => c.card.id)).size).toBe(MEGA_SUPER_SIZE);
  expect(rest.every((c) => c.card.ovr >= 85)).toBe(true);
  expect(res.club.specials.some((s) => s.id === GERVINHO_GIFT.id)).toBe(true);
  expect(Object.values(res.club.cards).reduce((a, b) => a + b, 0)).toBe(MEGA_SUPER_SIZE);
  expect(openMegaSuper(res.club)).toBeNull();
});
