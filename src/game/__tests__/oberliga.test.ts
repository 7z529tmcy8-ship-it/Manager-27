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

it('Landesliga Hannover (6. Liga): 17 Vereine, Meister steigt in die Oberliga auf', async () => {
  const { createCareer } = await import('../career');
  const { simulateToBreak } = await import('../simple');
  const { slugify } = await import('../../data/leagues');
  let c = createCareer({ name: 'Landesliga', nation: 'Deutschland', position: 'ST', age: 18, ovr: 52, potential: 70, clubId: slugify('SC Hemmingen-Westerfeld') });
  expect(c.clubLeague[c.player.contract.clubId]).toBe('llh');
  c = simulateToBreak(simulateToBreak(c));
  const r = c.history[0];
  expect(r.leagueId).toBe('llh');
  expect(r.table).toHaveLength(17);
  expect(Object.values(c.clubLeague).filter((l) => l === 'llh')).toHaveLength(17);
  expect(Object.values(c.clubLeague).filter((l) => l === 'ondn')).toHaveLength(16);
  // Der Tabellenerste der Landesliga spielt jetzt Oberliga.
  expect(c.clubLeague[r.table[0].clubId]).toBe('ondn');
});
