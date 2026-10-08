import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer, keyMatchFor, setKeyMatch, startKeyMatch } from '../career';
import { advanceFinal, autoFinal } from '../final';
import { simulateToBreak } from '../simple';

it('Topspiel: stärkster Gegner der Halbserie, selbst gespieltes Ergebnis landet in der Saison', () => {
  let c = createCareer({ name: 'Key', nation: 'Deutschland', position: 'ST', age: 24, ovr: 84, potential: 86, clubId: slugify('Borussia Dortmund') });
  const key = keyMatchFor(c)!;
  expect(key.half).toBe(1);
  expect(key.opponentId).toBe(slugify('FC Bayern München'));
  let state = startKeyMatch(c, key);
  expect(state.allowDraw).toBe(true);
  state = autoFinal(state, 'Key', 84);
  expect(state.done).toBe(true);
  c = setKeyMatch(c, key, state);
  expect(keyMatchFor(c)).toBeNull();
  c = simulateToBreak(c);
  const line = c.progress!.matches.find((m) => m.competition === 'Liga' && m.opponent === key.opponentId && m.half === 1)!;
  expect([line.goalsFor, line.goalsAgainst]).toEqual(state.score);
  expect(line.goals).toBe(state.playerGoals);
  expect(c.progress!.keyMatch!.used).toBe(true);
  // Rückrunde: neues Topspiel
  expect(keyMatchFor(c)?.half).toBe(2);
});

it('Topspiel-Engine: Unentschieden ohne Elfmeterschießen möglich', () => {
  const c = createCareer({ name: 'Key', nation: 'Deutschland', position: 'IV', age: 24, ovr: 75, potential: 76, clubId: slugify('SC Freiburg') });
  let draws = 0;
  for (let i = 0; i < 60; i++) {
    let s = startKeyMatch(c, keyMatchFor(c)!);
    for (let k = 0; k < 100 && !s.done; k++) s = advanceFinal(s, s.pending?.options[0].id, 'Key', 75);
    expect(s.shootout).toBeNull();
    if (s.score[0] === s.score[1]) draws++;
  }
  expect(draws).toBeGreaterThan(0);
});
