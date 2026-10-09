import { it, expect } from 'vitest';
import { CARD_POOL, openPack, freshClub } from '../club';
import { REAL_PLAYERS } from '../../data/players';
import { getClub } from '../../data/leagues';
it('Kartenpool ohne doppelte IDs, Karriere-Vereine bekannt, Debüt-Pack garantiert eine Debüt-Karte', () => {
  const ids = CARD_POOL.map((c) => c.id);
  const d = ids.filter((x, i) => ids.indexOf(x) !== i);
  expect(d).toEqual([]);
  for (const p of REAL_PLAYERS) expect(getClub(p.clubId), p.name).toBeTruthy();
  const r = openPack({ ...freshClub(), coins: 1e6 }, 'debut');
  expect(r!.result.cards.some((c) => c.card.variant === 'debut')).toBe(true);
});
