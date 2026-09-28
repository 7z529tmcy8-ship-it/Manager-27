import { it } from 'vitest';
import { CLUBS } from '../../data/leagues';
import { startSeason, playHalf, halfStats } from '../season';
import { createCareer } from '../career';
import type { Position } from '../types';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

// Kleinste Quadrate für y = a + b·rel + c·(Teamstärke − 75)
function fit(rows: [number, number, number][]) {
  const n = rows.length;
  const X = rows.map(([rel, team]) => [1, rel, team]);
  const y = rows.map((r) => r[2]);
  const XtX = [0, 1, 2].map((i) => [0, 1, 2].map((j) => X.reduce((s, x) => s + x[i] * x[j], 0)));
  const Xty = [0, 1, 2].map((i) => X.reduce((s, x, k) => s + x[i] * y[k], 0));
  // Gauß-Elimination
  const M = XtX.map((row, i) => [...row, Xty[i]]);
  for (let i = 0; i < 3; i++) {
    for (let k = i + 1; k < 3; k++) {
      const f = M[k][i] / M[i][i];
      for (let j = i; j < 4; j++) M[k][j] -= f * M[i][j];
    }
  }
  const beta = [0, 0, 0];
  for (let i = 2; i >= 0; i--) beta[i] = (M[i][3] - M[i].slice(i + 1, 3).reduce((s, v, j) => s + v * beta[i + 1 + j], 0)) / M[i][i];
  const sd = Math.sqrt(rows.reduce((s, r, k) => s + (y[k] - (beta[0] + beta[1] * r[0] + beta[2] * r[1])) ** 2, 0) / n);
  return { beta, sd };
}

it.skipIf(!env.FIT)('erwartete Note nach Stärkeabstand und Teamstärke', { timeout: 600000 }, () => {
  const clubs = CLUBS.filter((c) => ['bl1', 'bl2', 'pl', 'll', 'l3'].includes(c.leagueId));
  for (const pos of ['ST', 'FL', 'ZOM', 'ZM', 'ZDM', 'AV', 'IV', 'TW'] as Position[]) {
    const rows: [number, number, number][] = [];
    for (let i = 0; i < 260; i++) {
      const club = clubs[Math.floor(Math.random() * clubs.length)];
      const rel = -6 + (i % 22);
      const c = createCareer({ name: 'x', nation: 'Deutschland', position: pos, age: 27, ovr: club.strength + rel, potential: club.strength + rel, clubId: club.id });
      const prog = startSeason(c);
      playHalf(c, prog, 1);
      playHalf(c, prog, 2);
      const s = halfStats(prog.matches);
      if (s.avgRating !== null && s.apps >= 10) rows.push([rel, club.strength - 75, s.avgRating]);
    }
    const { beta, sd } = fit(rows);
    console.log(`${pos}: { a: ${beta[0].toFixed(2)}, b: ${beta[1].toFixed(3)}, c: ${beta[2].toFixed(3)}, sd: ${sd.toFixed(2)} },`);
  }
});
