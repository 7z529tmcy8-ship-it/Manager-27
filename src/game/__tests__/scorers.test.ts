import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { simulateToBreak } from '../simple';
import { clubScorer, raceRank, scorerRace } from '../scorers';

it('Echte Namen als Haupttorschützen, sonst feste erfundene Namen', () => {
  expect(clubScorer(slugify('FC Bayern München'), '')).not.toBe('');
  expect(clubScorer(slugify('Hannover 96'), '')).toBe(clubScorer(slugify('Hannover 96'), ''));
  expect(clubScorer(slugify('Real Madrid'), 'Kylian Mbappé')).not.toBe('Kylian Mbappé');
});

it('Torjäger-Rennen: realistische Torzahlen, Anzeige passt zur Torjägerkanone', () => {
  let tops: number[] = [];
  for (let i = 0; i < 8; i++) {
    let c = createCareer({ name: 'Knipser', nation: 'Deutschland', position: 'ST', age: 26, ovr: 84, potential: 86, clubId: slugify('Borussia Dortmund') });
    c = simulateToBreak(simulateToBreak(c));
    const r = c.history[0];
    const goals = r.byCompetition.find((s) => s.competition === 'Liga')!.goals;
    const race = scorerRace(r.table, r.season, { name: c.player.name, clubId: r.clubId, goals });
    const others = race.filter((e) => !e.you);
    expect(new Set(race.map((e) => e.name)).size).toBe(race.length);
    tops.push(others[0].goals);
    const won = r.awards.some((a) => a.startsWith('Torschützenkönig'));
    expect(won).toBe(goals >= 8 && raceRank(race) === 1);
  }
  const avg = tops.reduce((a, b) => a + b, 0) / tops.length;
  expect(avg).toBeGreaterThan(15);
  expect(avg).toBeLessThan(36);
});
