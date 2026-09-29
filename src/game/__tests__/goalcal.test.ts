import { it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer, playSeason } from '../career';
import type { Position } from '../types';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

it.skipIf(!env.CALIBRATE)('Saisonziele: Erfüllungsquote', { timeout: 300000 }, () => {
  const cases: [Position, number, string][] = [
    ['ST', 84, 'VfB Stuttgart'], ['ST', 74, 'VfB Stuttgart'], ['ZOM', 80, 'SC Freiburg'], ['ZM', 78, 'Borussia Dortmund'],
    ['IV', 80, 'VfB Stuttgart'], ['TW', 78, 'VfB Stuttgart'], ['ST', 66, 'FC Bayern München'], ['AV', 72, 'FC Schalke 04'],
  ];
  for (const [pos, ovr, club] of cases) {
    const per: number[] = [];
    let all = 0;
    let labels = '';
    for (let i = 0; i < 80; i++) {
      const c = playSeason(createCareer({ name: 'x', nation: 'Deutschland', position: pos, age: 26, ovr, potential: ovr, clubId: slugify(club) }));
      const g = c.history[0].goalResults ?? [];
      labels = g.map((x) => x.label).join(' + ');
      g.forEach((x, k) => (per[k] = (per[k] ?? 0) + (x.met ? 1 : 0)));
      if (g.every((x) => x.met)) all++;
    }
    console.log(`${pos} ${ovr} @${club}: ${labels} | einzeln ${per.map((x) => Math.round((x / 80) * 100) + '%').join(' / ')} | alle ${Math.round((all / 80) * 100)}%`);
  }
});
