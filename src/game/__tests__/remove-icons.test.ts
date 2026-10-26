import { expect, it } from 'vitest';
import { freshClub, removeOwnCareerCards, type CollectCard } from '../club';

const icon: CollectCard = { id: 'own-icon-abc', name: 'Ich', position: 'ST', nation: 'Deutschland', club: 'BVB', ovr: 91, variant: 'icon', label: 'Karriere-Ikone' };
const award: CollectCard = { id: 'own-award-xyz-ballondor', name: 'Ich', position: 'ST', nation: 'Deutschland', club: 'BVB', ovr: 93, variant: 'ballondor', label: 'Ballon d’Or 2031' };

it('Nur Karten selbst erstellter Spieler werden entfernt – Karten echter Spieler bleiben', () => {
  const old = { ...freshClub(), ownCardsRemoved: false, specials: [icon, award], squad: ['own-icon-abc', ...Array(10).fill(null)], rewardChosen: { abc: 'own-icon-abc', xyz: award.id }, evo: { active: { path: 'torinstinkt', card: 'own-icon-abc', step: 0, wins: 0 } } };
  const careers = [
    { id: 'abc', player: { origin: 'academy' } },
    { id: 'xyz', player: {} },
  ] as unknown as Parameters<typeof removeOwnCareerCards>[1];
  const c = removeOwnCareerCards(old, careers);
  // abc = eigener Spieler → Ikone weg; xyz = echter Spieler → Auszeichnungs-Karte bleibt
  expect(c.specials.map((x) => x.id)).toEqual([award.id]);
  expect(c.squad[0]).toBeNull();
  expect(c.rewardChosen).toEqual({ xyz: award.id });
  expect(c.evo?.active).toBeUndefined();
  expect(c.ownCardsRemoved).toBe(true);
  // Zweiter Aufruf ändert nichts mehr
  expect(removeOwnCareerCards(c, careers)).toBe(c);
  // Neue Spielstände sind schon „sauber“
  expect(freshClub().ownCardsRemoved).toBe(true);
});
