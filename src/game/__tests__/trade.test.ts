import { expect, it } from 'vitest';
import { CARD_POOL, freshClub } from '../club';
import { JUNK_POOL, TRADE_SIZE, doTrade, junkCards } from '../trade';

it('Tauschbörse: drei gute Karten weg, drei Schrottkarten rein', () => {
  const good = CARD_POOL.filter((c) => c.ovr >= 88).slice(0, 3);
  const club = { ...freshClub(), cards: Object.fromEntries(good.map((c) => [c.id, 1])), squad: [good[0].id, ...Array(10).fill(null)] };
  const res = doTrade(club, good.map((c) => c.id))!;
  expect(res.got).toHaveLength(TRADE_SIZE);
  for (const c of good) expect(res.club.cards[c.id]).toBeUndefined();
  for (const c of res.got) expect(JUNK_POOL.some((j) => j.id === c.id)).toBe(true);
  expect(Math.max(...res.got.map((c) => c.ovr))).toBeLessThanOrEqual(68);
  expect(res.club.squad[0]).toBeNull();
  expect(res.club.tradesDone).toBe(1);
});

it('Tauschbörse: ungültige Angebote werden abgewiesen', () => {
  const c = CARD_POOL[0];
  const club = { ...freshClub(), cards: { [c.id]: 3 } };
  expect(doTrade(club, [c.id, c.id, c.id])).toBeNull();
  expect(doTrade(club, [c.id])).toBeNull();
  expect(new Set(junkCards().map((x) => x.id)).size).toBe(TRADE_SIZE);
});
