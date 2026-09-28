import { it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer, playSeason } from '../career';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

it.skipIf(!env.CALIBRATE)('Titelquoten', () => {
  for (const [club, pos] of [['FC Bayern München', 'ST'], ['Manchester City', 'ST'], ['SC Freiburg', 'ST']] as const) {
    let cl = 0, league = 0, goals = 0;
    const n = 200;
    for (let i = 0; i < n; i++) {
      const c = playSeason(createCareer({ name: 'x', nation: 'Deutschland', position: pos, age: 25, ovr: 88, potential: 88, clubId: slugify(club) }));
      const s = c.history[0];
      if (s.trophies.includes('Champions League')) cl++;
      if (s.leaguePosition === 1) league++;
      goals += s.goals;
    }
    console.log(club, 'CL', cl / n, 'Liga', league / n, 'Tore', goals / n);
  }
});
