import { expect, it } from 'vitest';
import { getLeague, slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { applyChoice, seasonChoices, simulateToBreak } from '../simple';

it('Karriere in der Oberliga Niedersachsen: Saison läuft, Angebote kommen, Auf-/Abstieg funktioniert', () => {
  let c = createCareer({ name: 'Ober', nation: 'Deutschland', position: 'ST', age: 18, ovr: 60, potential: 84, clubId: slugify('1. FC Germania Egestorf/Langreder') });
  expect(c.clubLeague[c.player.contract.clubId]).toBe('ondn');
  c = simulateToBreak(simulateToBreak(c));
  expect(c.phase).toBe('window');
  const r = c.history[0];
  expect(getLeague(r.leagueId).name).toBe('Oberliga Niedersachsen');
  expect(r.table).toHaveLength(16);
  expect(seasonChoices(c).length).toBe(3);
  // Nach der Saison: genau 2 Oberliga-Teams sind jetzt in der Regionalliga und 2 RL-Teams in der Oberliga.
  const ondn = Object.values(c.clubLeague).filter((l) => l === 'ondn').length;
  expect(ondn).toBe(16);
  c = applyChoice(c, seasonChoices(c)[0]);
  expect(c.phase).toBe('season');
});
