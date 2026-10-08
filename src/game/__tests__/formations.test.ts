import { expect, it } from 'vitest';
import { CARD_POOL, freshClub } from '../club';
import { FORMATIONS, autoSquad, cardById, changeFormation, chemistry, slotsOf, type FormationId } from '../squad';

it('Formationen: je 11 Plätze mit Torwart, Wechsel behält die Spieler und verteilt sie passend', () => {
  const cards = Object.fromEntries(CARD_POOL.filter((c) => c.variant === 'gold-rare' || c.variant === 'gold').map((c) => [c.id, 1]));
  let club = { ...freshClub(), cards };
  club = { ...club, squad: autoSquad(club) };
  const before = new Set(club.squad);
  for (const id of Object.keys(FORMATIONS) as FormationId[]) {
    const slots = FORMATIONS[id].slots;
    expect(slots).toHaveLength(11);
    expect(slots.filter((s) => s.pos === 'TW')).toHaveLength(1);
    const next = changeFormation(club, id);
    expect(next.formation).toBe(id);
    expect(new Set(next.squad)).toEqual(before);
    expect(slotsOf(next)).toBe(slots);
    const auto = autoSquad(next);
    const chem = chemistry(auto.map((x) => cardById(next, x)), slots);
    expect(chem.per.filter((p) => p > 0).length).toBeGreaterThan(5);
  }
});
