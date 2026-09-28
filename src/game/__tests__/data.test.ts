import { expect, it } from 'vitest';
import { getClub } from '../../data/leagues';
import { REAL_PLAYERS } from '../../data/players';

it('alle echten Spieler gehören zu existierenden Vereinen', () => {
  for (const p of REAL_PLAYERS) expect(() => getClub(p.clubId), p.name).not.toThrow();
  expect(new Set(REAL_PLAYERS.map((p) => p.name)).size).toBe(REAL_PLAYERS.length);
});
