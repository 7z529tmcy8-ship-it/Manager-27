import { expect, it } from 'vitest';
import { CARD_POOL, freshClub, type ClubState } from '../club';
import { FORMATION, autoSquad, cardById, chemLinks, setSlot, swapSlots } from '../squad';

function club(): ClubState {
  const cards: Record<string, number> = {};
  for (const c of CARD_POOL) cards[c.id] = 1;
  const base = { ...freshClub(), cards };
  return { ...base, squad: autoSquad(base) };
}

it('Ziehen von Position zu Position tauscht die beiden Karten', () => {
  const c = club();
  const next = swapSlots(c, 0, 5);
  expect(next.squad[0]).toBe(c.squad[5]);
  expect(next.squad[5]).toBe(c.squad[0]);
  expect(next.squad.filter(Boolean)).toHaveLength(11);
  expect(swapSlots(c, 3, 3)).toBe(c);
});

it('Tauschen mit einer leeren Position verschiebt die Karte', () => {
  const c = setSlot(club(), 2, null);
  const moved = c.squad[7];
  const next = swapSlots(c, 7, 2);
  expect(next.squad[2]).toBe(moved);
  expect(next.squad[7]).toBeNull();
});

it('Reservekarte aufs Feld ziehen: Karte steht danach nur einmal in der Elf', () => {
  const c = club();
  const bench = CARD_POOL.find((x) => !c.squad.includes(x.id))!;
  const next = setSlot(c, 4, bench.id);
  expect(next.squad[4]).toBe(bench.id);
  expect(next.squad.filter((id) => id === bench.id)).toHaveLength(1);
});

it('Chemie-Linien verbinden nur besetzte Nachbarn, jede Verbindung genau einmal', () => {
  const c = club();
  const cards = c.squad.map((id) => cardById(c, id));
  const links = chemLinks(cards, FORMATION);
  expect(links.length).toBeGreaterThan(8);
  const keys = links.map((l) => [l.a, l.b].sort().join('-'));
  expect(new Set(keys).size).toBe(keys.length);
  for (const l of links) {
    const a = cards[l.a]!;
    const b = cards[l.b]!;
    if (a.club === b.club) expect(l.kind).toBe('strong');
    if (a.club !== b.club && a.nation !== b.nation && a.league !== b.league) expect(l.kind).toBe('none');
  }
  const empty = cards.map((x, i) => (i === 0 ? null : x));
  expect(chemLinks(empty, FORMATION).some((l) => l.a === 0 || l.b === 0)).toBe(false);
});
