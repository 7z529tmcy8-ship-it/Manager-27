import { expect, it } from 'vitest';
import { freshClub, removeOwnCareerCards, type CollectCard } from '../club';

const icon: CollectCard = { id: 'own-icon-abc', name: 'Ich', position: 'ST', nation: 'Deutschland', club: 'BVB', ovr: 91, variant: 'icon', label: 'Karriere-Ikone' };
const award: CollectCard = { id: 'own-award-xyz-ballondor', name: 'Ich', position: 'ST', nation: 'Deutschland', club: 'BVB', ovr: 93, variant: 'ballondor', label: 'Ballon d’Or 2031' };

it('Alle eigenen Karriere-Karten werden einmalig entfernt, die Karrieren bekommen dafür Packs', () => {
  const old = { ...freshClub(), ownCardsRemoved: false, specials: [icon, award], squad: ['own-icon-abc', ...Array(10).fill(null)], rewardChosen: { abc: 'own-icon-abc', xyz: award.id }, evo: { active: { path: 'torinstinkt', card: 'own-icon-abc', step: 0, wins: 0 } } };
  const c = removeOwnCareerCards(old);
  expect(c.specials).toHaveLength(0);
  expect(c.squad[0]).toBeNull();
  expect(c.rewardChosen).toEqual({});
  expect(c.evo?.active).toBeUndefined();
  expect(c.ownCardsRemoved).toBe(true);
  // Zweiter Aufruf ändert nichts mehr
  expect(removeOwnCareerCards(c)).toBe(c);
  // Neue Spielstände sind schon „sauber“
  expect(freshClub().ownCardsRemoved).toBe(true);
});
