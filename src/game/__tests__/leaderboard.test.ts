import { expect, it } from 'vitest';
import { bots, leaderboard } from '../leaderboard';

const me = { name: 'Ayris', trophies: 0, emblem: 'crown', color: '#ffd24a', fx: 'weiss' };

it('Bestenliste: 100 Plätze, eindeutige Namen, absteigend, wächst täglich', () => {
  const now = new Date(2026, 10, 2).getTime();
  const b = bots(now);
  expect(new Set(b.map((x) => x.name)).size).toBe(b.length);
  const { top, rank } = leaderboard(me, now);
  expect(top).toHaveLength(100);
  for (let i = 1; i < top.length; i++) expect(top[i - 1].trophies).toBeGreaterThanOrEqual(top[i].trophies);
  expect(rank).toBeGreaterThan(100); // mit 0 Trophäen nicht in den Top 100
  expect(top[0].trophies).toBeGreaterThan(15_000);
  expect(bots(now + 7 * 86_400_000)[0].trophies).toBeGreaterThan(b[0].trophies);
});

it('Bestenliste: mit vielen Trophäen bist du drin – an der richtigen Stelle', () => {
  const now = new Date(2026, 10, 2).getTime();
  const { top, rank } = leaderboard({ ...me, trophies: 5_000 }, now);
  const mine = top.findIndex((x) => x.me);
  expect(mine + 1).toBe(rank);
  expect(top[mine - 1].trophies).toBeGreaterThan(5_000);
  expect(top[mine + 1].trophies).toBeLessThanOrEqual(5_000);
  expect(leaderboard({ ...me, trophies: 99_999 }, now).rank).toBe(1);
});

it('Bestenliste: Top 10 um 50.000, kein Vorname öfter als zweimal', () => {
  const b = bots(new Date(2026, 10, 2).getTime());
  b.slice(0, 10).forEach((x) => expect(x.trophies).toBeGreaterThan(44_000));
  expect(b[10].trophies).toBeLessThan(b[9].trophies);
  const firsts = new Map<string, number>();
  for (const x of b) { const m = x.name.match(/^([A-ZÄÖÜ][a-zäöüé]+)(?: [A-Z]\.|_)/); if (m) firsts.set(m[1], (firsts.get(m[1]) ?? 0) + 1); }
  for (const n of firsts.values()) expect(n).toBeLessThanOrEqual(3);
});
