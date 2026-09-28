import { it } from 'vitest';
import { CLUBS } from '../../data/leagues';
import { startSeason, playHalf, halfStats } from '../season';
import { createCareer } from '../career';
import type { Position } from '../types';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

it.skipIf(!env.FIT)('erwartete Note nach Stärkeabstand', { timeout: 300000 }, () => {
  const top = CLUBS.filter((c) => c.leagueId === 'bl1');
  for (const pos of ['ST', 'FL', 'ZOM', 'ZM', 'ZDM', 'AV', 'IV', 'TW'] as Position[]) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < 160; i++) {
      const club = top[i % top.length];
      const rel = -6 + (i % 22);
      const c = createCareer({ name: 'x', nation: 'Deutschland', position: pos, age: 27, ovr: club.strength + rel, potential: club.strength + rel, clubId: club.id });
      const prog = startSeason(c);
      playHalf(c, prog, 1);
      playHalf(c, prog, 2);
      const s = halfStats(prog.matches);
      if (s.avgRating !== null && s.apps >= 10) { xs.push(rel); ys.push(s.avgRating); }
    }
    const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
    const b = xs.reduce((a, x, k) => a + (x - mx) * (ys[k] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    const a = my - b * mx;
    const resid = Math.sqrt(ys.reduce((acc, y, k) => acc + (y - (a + b * xs[k])) ** 2, 0) / n);
    console.log(`${pos}: a=${a.toFixed(2)} b=${b.toFixed(3)} sd=${resid.toFixed(2)} n=${n}`);
  }
});
