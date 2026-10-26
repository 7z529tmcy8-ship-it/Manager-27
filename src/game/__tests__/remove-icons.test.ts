import { expect, it } from 'vitest';
import { freshClub, removeCareerIcons, type CollectCard } from '../club';

const icon: CollectCard = { id: 'own-icon-abc', name: 'Ich', position: 'ST', nation: 'Deutschland', club: 'BVB', ovr: 91, variant: 'icon', label: 'Karriere-Ikone' };
const award: CollectCard = { id: 'own-award-xyz-ballondor', name: 'Ich', position: 'ST', nation: 'Deutschland', club: 'BVB', ovr: 93, variant: 'ballondor', label: 'Ballon d’Or 2031' };

it('Geschenkte Karriere-Ikonen werden einmalig entfernt, Auszeichnungs-Karten bleiben', () => {
  const old = { ...freshClub(), careerIconsRemoved: false, specials: [icon, award], squad: ['own-icon-abc', ...Array(10).fill(null)], rewardChosen: { abc: 'own-icon-abc', xyz: award.id }, evo: { active: { path: 'torinstinkt', card: 'own-icon-abc', step: 0, wins: 0 } } };
  const c = removeCareerIcons(old);
  expect(c.specials.map((s) => s.id)).toEqual([award.id]);
  expect(c.squad[0]).toBeNull();
  expect(c.rewardChosen).toEqual({ xyz: award.id });
  expect(c.evo?.active).toBeUndefined();
  expect(c.careerIconsRemoved).toBe(true);
  // Zweiter Aufruf ändert nichts mehr
  expect(removeCareerIcons(c)).toBe(c);
  // Neue Spielstände sind schon „sauber“
  expect(freshClub().careerIconsRemoved).toBe(true);
});
