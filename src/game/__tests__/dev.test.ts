import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { CARD_POOL, freshClub, withUpgrade, getCard } from '../club';
import { devAllCards, devLevels, devMaxCards, devOvr, isDevCode } from '../dev';
import { chooseArchetype, levelInfo } from '../skills';

it('Entwickler-Code und Werkzeuge', () => {
  expect(isDevCode(' Vogue ')).toBe(true);
  expect(isDevCode('larp')).toBe(false);
  const club = devMaxCards(devAllCards(freshClub()));
  expect(Object.keys(club.cards)).toHaveLength(CARD_POOL.length);
  const id = Object.keys(club.cards)[0];
  expect(withUpgrade(club, getCard(id)!).ovr).toBe(99);
  let c = chooseArchetype(createCareer({ name: 'Dev', nation: 'Deutschland', position: 'ST', age: 20, ovr: 70, potential: 80, clubId: slugify('Hannover 96') }), 'striker');
  c = devLevels(c, 10);
  expect(levelInfo(c.player.skills!.xp).level).toBe(10);
  c = devOvr(c, 120);
  expect(c.player.ovr).toBe(99);
  expect(c.player.potential).toBe(99);
});
