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

it('Automatisch füllen: findet mit voller Sammlung für jeden Tausch eine gültige, günstige Abgabe', async () => {
  const { autoFillMoment, momentCandidates } = await import('../legendTrades');
  const club = { ...freshClub(), cards: Object.fromEntries(CARD_POOL.map((c) => [c.id, 1])) };
  const byId = new Map(momentCandidates(club).map((c) => [c.id, c]));
  for (const m of MOMENTS) {
    const ids = autoFillMoment(club, m);
    expect(ids, m.id).toHaveLength(MOMENT_SIZE);
    const cards = ids.map((id) => byId.get(id)!);
    expect(checkMoment(m, cards).ok, m.id).toBe(true);
    // Keine Verschwendung: der Schnitt liegt nah an der Grenze, nicht weit darüber
    expect(checkMoment(m, cards).avg - m.minAvg, m.id).toBeLessThan(2.5);
  }
});

it('Automatisch füllen: bevorzugt Doppelte und meldet, was fehlt', async () => {
  const { autoFillMoment, momentMissing } = await import('../legendTrades');
  const m = MOMENTS.find((x) => x.id === 'moment-ricken-lupfer')!;
  const strong = CARD_POOL.filter((c) => c.ovr >= m.minEach && c.variant !== 'icon');
  const twin = strong.find((c) => c.league === 'Bundesliga')!;
  const club = { ...freshClub(), cards: { ...Object.fromEntries(strong.map((c) => [c.id, 1])), [twin.id]: 3 } };
  const ids = autoFillMoment(club, m);
  expect(ids).toContain(twin.id);
  // Ohne Ikone geht es nicht – und genau das steht im Hinweis
  const missing = momentMissing(m, ids.map((id) => CARD_POOL.find((c) => c.id === id)!));
  expect(missing.some((t) => t.startsWith('Ikone'))).toBe(true);
});
