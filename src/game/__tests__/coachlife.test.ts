import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer, retire } from '../career';
import { simulateToBreak } from '../simple';
import { chooseCoachClub, playCoachHalf, quickCoachSeason, startCoaching } from '../coach';
import { applyIncident, coachStyle, emptyProfile, resolveIncident, setPolicy } from '../coachlife';

const coachCareer = () => {
  const c = createCareer({ name: 'T', nation: 'Deutschland', position: 'ZM', age: 33, ovr: 82, potential: 82, clubId: slugify('Hannover 96') });
  return startCoaching(retire(simulateToBreak(simulateToBreak(c))));
};

it('Ohne feste Linie: Meldungen warten, Spielen ist blockiert, Entscheidung verändert Stärke und Ruf', () => {
  let c = coachCareer();
  c = chooseCoachClub(c, c.coach!.offers[0]);
  const pending = c.coach!.pending ?? [];
  expect(pending.length).toBeGreaterThan(0);
  expect(playCoachHalf(c)).toBe(c);
  expect(quickCoachSeason(c).coach!.phase).toBe('prep');
  for (const inc of pending) c = resolveIncident(c, inc.id, inc.type === 'scandal' ? 'bench' : inc.type === 'injury' ? 'rest' : inc.type === 'discipline' ? 'kick' : inc.type === 'youth' ? 'experience' : 'hard');
  expect(c.coach!.pending).toHaveLength(0);
  expect(c.coach!.feed!.length).toBe(pending.length);
  expect(playCoachHalf(c).coach!.phase).not.toBe('prep');
});

it('Feste Linie entscheidet automatisch; Konsequenz steigt, Hin und Her senkt sie', () => {
  let c = setPolicy(coachCareer(), 'scandal', 'bench');
  c = chooseCoachClub(c, c.coach!.offers[0]);
  const inc = { id: 'x', type: 'scandal' as const, player: 'Hans-Werner', title: '', text: '', big: true };
  c.coach!.profile = emptyProfile();
  applyIncident(c, inc, 'bench', false, () => 0.9);
  applyIncident(c, inc, 'bench', false, () => 0.9);
  const k = c.coach!.profile!.konsequenz;
  applyIncident(c, inc, 'play', false, () => 0.1);
  expect(c.coach!.profile!.konsequenz).toBeLessThan(k);
  expect(coachStyle(c.coach!.profile!)).toBeTruthy();
});
