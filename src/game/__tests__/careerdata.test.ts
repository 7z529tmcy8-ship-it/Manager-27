import { expect, it } from 'vitest';
import { CLUBS } from '../../data/leagues';
import { CULT_LEGENDS, FAILED_TALENTS, HANNOVER_2018, LEGENDS } from '../../data/legends';
import { REAL_PLAYERS } from '../../data/players';
import { createCareer } from '../career';

it('Alle Karriere-Startspieler haben einen existierenden Verein und lassen sich starten', () => {
  const ids = new Set(CLUBS.map((c) => c.id));
  for (const p of [...REAL_PLAYERS, ...LEGENDS, ...FAILED_TALENTS, ...HANNOVER_2018, ...CULT_LEGENDS]) {
    expect(ids.has(p.clubId), `${p.name}: ${p.clubId}`).toBe(true);
  }
  const names = REAL_PLAYERS.map((p) => p.name);
  expect(new Set(names).size).toBe(names.length);
  expect(REAL_PLAYERS.some((p) => p.name === 'Junior Kroupi')).toBe(true);
  expect(CULT_LEGENDS.length).toBe(30);
  const c = createCareer({ ...CULT_LEGENDS.find((l) => l.name === 'Ailton')! });
  expect(c.player.name).toBe('Ailton');
});
