import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { treat } from '../clinic';
import { simulateToBreak } from '../simple';
import { doVice } from '../vices';

const winter = () => simulateToBreak(createCareer({ name: 'D', nation: 'Deutschland', position: 'ST', age: 24, ovr: 78, potential: 82, clubId: slugify('Hannover 96') }));

it('Drogen: kosten Coins, Abhängigkeit bleibt verborgen, Geld verschwindet in jeder Pause, Reha hilft', () => {
  const c = winter();
  const res = doVice(c, 'drugs', () => 0.01); // abhängig, aber Foto taucht auf
  expect(res.coins).toBe(-5000);
  expect(res.career.player.hooked).toBe(true);
  expect(JSON.stringify(res.career.viceNote)).not.toMatch(/abhängig|Sucht/i);
  const next = simulateToBreak(res.career);
  expect(next.drainPending).toBe(1);
  // Reha (70 % Erfolg) beendet die Abhängigkeit
  const clean = treat({ ...next, drainPending: 0 }, 'rehab', 0, () => 0.1);
  expect(clean.career.player.hooked).toBe(false);
  expect(clean.career.player.carryInjuryWeeks).toBeGreaterThanOrEqual(8);
  expect(simulateToBreak(clean.career).drainPending ?? 0).toBe(0);
  // Wer nicht abhängig wird, verliert kein Geld
  const lucky = doVice(c, 'drugs', () => 0.99);
  expect(lucky.career.player.hooked ?? false).toBe(false);
  expect(simulateToBreak(lucky.career).drainPending ?? 0).toBe(0);
});
