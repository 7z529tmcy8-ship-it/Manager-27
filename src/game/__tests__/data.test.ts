import { expect, it } from 'vitest';
import { getClub } from '../../data/leagues';
import { REAL_PLAYERS } from '../../data/players';

it('alle echten Spieler gehören zu existierenden Vereinen', () => {
  for (const p of REAL_PLAYERS) expect(() => getClub(p.clubId), p.name).not.toThrow();
  expect(new Set(REAL_PLAYERS.map((p) => p.name)).size).toBe(REAL_PLAYERS.length);
});

it('alle Legenden haben gültige Vereine und Eigenschaften', async () => {
  const { LEGENDS, FAILED_TALENTS } = await import('../../data/legends');
  const { TRAITS } = await import('../traits');
  const ids = new Set(TRAITS.map((t) => t.id));
  for (const l of [...LEGENDS, ...FAILED_TALENTS]) {
    expect(() => getClub(l.clubId), l.name).not.toThrow();
    for (const t of l.traits) expect(ids.has(t), `${l.name}: ${t}`).toBe(true);
  }
});
