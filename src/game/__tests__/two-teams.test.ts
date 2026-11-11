import { expect, it } from 'vitest';
import { CARD_POOL, freshClub, type CollectCard } from '../club';
import { activeTeam, allSquadIds, autoSquad, switchTeam, teamCards } from '../squad';

const own: CollectCard = { id: 'own-award-x-ballondor', name: 'Ich', position: 'ST', nation: 'Deutschland', club: 'Hannover 96', ovr: 93, variant: 'ballondor' as CollectCard['variant'] };
const sbc: CollectCard = { id: 'moment-test', name: 'SBC-Held', position: 'IV', nation: 'Spanien', club: 'Real Madrid', ovr: 95, variant: 'moment' };

it('Zwei Teams: Haupt-Team ohne Karriere-Karten, Karriere-Team mit Karriere- und SBC-Karten', () => {
  const packCards = CARD_POOL.filter((c) => c.variant === 'gold').slice(0, 15);
  let club = { ...freshClub(), cards: Object.fromEntries(packCards.map((c) => [c.id, 1])), specials: [own, sbc] };
  expect(activeTeam(club)).toBe('main');
  expect(teamCards(club).some((c) => c.id === own.id)).toBe(false);
  expect(teamCards(club).some((c) => c.id === sbc.id)).toBe(true);
  // Alt-Spielstand: Karriere-Karte steht im Haupt-Team → zieht beim ersten Wechsel um
  club = { ...club, squad: [own.id, packCards[0].id, ...Array(9).fill(null)] };
  const career = switchTeam(club, 'career');
  expect(activeTeam(career)).toBe('career');
  expect(career.squad[0]).toBe(own.id);
  expect(career.squad).not.toContain(packCards[0].id);
  expect(career.altTeam!.squad).toContain(packCards[0].id);
  expect(career.altTeam!.squad).not.toContain(own.id);
  expect(teamCards(career).map((c) => c.id).sort()).toEqual([sbc.id, own.id].sort());
  expect(autoSquad(career).filter(Boolean).sort()).toEqual([sbc.id, own.id].sort());
  // Beide Teams gelten als aufgestellt
  expect(allSquadIds(career).has(packCards[0].id)).toBe(true);
  // Zurück: Haupt-Team unverändert
  const back = switchTeam(career, 'main');
  expect(back.squad[1]).toBe(packCards[0].id);
  expect(back.altTeam!.squad[0]).toBe(own.id);
});
