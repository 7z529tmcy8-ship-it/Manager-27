import { expect, it } from 'vitest';
import { CARD_POOL, freshClub, type CollectCard } from '../club';
import { MOMENTS, MOMENT_SIZE, checkMoment, completeMoment, momentOpen, type MomentSbc } from '../legendTrades';

/** Sucht eine gültige Elf aus dem ganzen Kartenpool: erst die Pflichtgruppen mit den besten Karten, dann auffüllen. */
function solve(m: MomentSbc, pool: CollectCard[]): CollectCard[] | null {
  const ok = pool.filter((c) => c.ovr >= m.minEach).sort((a, b) => b.ovr - a.ovr);
  const pick: CollectCard[] = [];
  for (const n of m.needs) {
    let have = pick.filter(n.test).length;
    for (const c of ok) {
      if (have >= n.count) break;
      if (!pick.includes(c) && n.test(c)) { pick.push(c); have++; }
    }
  }
  for (const c of ok) if (pick.length < MOMENT_SIZE && !pick.includes(c)) pick.push(c);
  return pick.length === MOMENT_SIZE && checkMoment(m, pick).ok ? pick : null;
}

it('Spezial-Tausche: jeder ist mit dem Kartenpool lösbar, aber nicht mit schwachen Karten', () => {
  for (const m of MOMENTS) {
    expect(solve(m, CARD_POOL), m.id).not.toBeNull();
    expect(m.reward.ovr).toBeGreaterThanOrEqual(91);
    const weak = CARD_POOL.filter((c) => c.ovr < 80).slice(0, MOMENT_SIZE);
    expect(checkMoment(m, weak).ok).toBe(false);
  }
});

it('Spezial-Tausch: Karten weg, Momentkarte da, nur einmal, Džeko erst nach Grafite', () => {
  const m = MOMENTS.find((x) => x.id === 'moment-lewandowski')!;
  const team = solve(m, CARD_POOL)!;
  let club = { ...freshClub(), cards: Object.fromEntries(team.map((c) => [c.id, 1])) };
  const ids = team.map((c) => c.id);
  expect(completeMoment(club, m.id, ids.slice(0, 10))).toBeNull();
  club = completeMoment(club, m.id, ids)!;
  expect(Object.keys(club.cards)).toHaveLength(0);
  expect(club.specials.some((c) => c.id === 'moment-lewandowski')).toBe(true);
  expect(momentOpen(club, m)).toBe(false);
  const dzeko = MOMENTS.find((x) => x.id === 'moment-dzeko')!;
  expect(momentOpen(club, dzeko)).toBe(false);
  expect(momentOpen({ ...club, tasksDone: { ...club.tasksDone, 'moment-grafite': 1 } }, dzeko)).toBe(true);
});
