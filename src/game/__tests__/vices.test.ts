import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { simulateToBreak } from '../simple';
import { SCANDAL_COOLDOWN, canDoVice, doVice } from '../vices';
import type { Career } from '../types';

const winter = (age = 24): Career => simulateToBreak(createCareer({ name: 'Skandal', nation: 'Deutschland', position: 'ST', age, ovr: 78, potential: 86, clubId: slugify('Hannover 96') }));
const caught = () => 0; // Zufall: immer erwischt
const lucky = () => 0.99; // Zufall: nie erwischt

it('Eine Aktion pro Pause, Doping nur im Sommer', () => {
  const c = winter();
  expect(c.phase).toBe('winter');
  expect(canDoVice(c, 'doping')).toBe(false);
  const r = doVice(c, 'party', lucky);
  expect(r.career.player.morale).toBeGreaterThan(c.player.morale ?? 0);
  expect(canDoVice(r.career, 'skip')).toBe(false);
  expect(doVice(r.career, 'skip', lucky).career).toBe(r.career);
});

it('Wetten: Coins bei Glück, Sperre beim ersten Erwischen, Karriereende beim zweiten', () => {
  const ok = doVice(winter(), 'bet', lucky);
  expect(ok.coins).toBeGreaterThanOrEqual(2000);
  const first = doVice(winter(), 'bet', caught);
  expect(first.career.caughtBetting).toBe(true);
  expect(first.career.player.carryBanMatches).toBeGreaterThanOrEqual(34);
  const again = doVice({ ...winter(), caughtBetting: true }, 'bet', caught);
  expect(again.career.phase).toBe('retired');
  expect(again.career.destroyed).toBe(true);
});

it('Skandal-Zähler: Rauswurf bei 100, zweiter Rauswurf zerstört die Karriere, Zähler kühlt ab', () => {
  const fired = doVice({ ...winter(), scandal: 90 }, 'rant', caught).career;
  expect(fired.scandalStrikes).toBe(1);
  expect(fired.player.contract.yearsLeft).toBe(0);
  const end = doVice({ ...winter(), scandal: 90, scandalStrikes: 1 }, 'rant', caught).career;
  expect(end.destroyed).toBe(true);
  const after = simulateToBreak(doVice({ ...winter(), scandal: 30 }, 'skip', lucky).career);
  expect(after.scandal).toBe(30 - SCANDAL_COOLDOWN);
  expect(after.viceNote).toBeNull();
});

it('Doping im Sommer: +3 bei Glück, zwei Jahre Sperre beim ersten Test, ab 32 Karriereende', () => {
  let c = simulateToBreak(winter());
  expect(c.phase).toBe('window');
  const ovr = c.player.ovr;
  expect(doVice(c, 'doping', lucky).career.player.ovr).toBe(ovr + 3);
  const banned = doVice(c, 'doping', caught).career;
  expect(banned.caughtDoping).toBe(true);
  expect(banned.history.length).toBe(c.history.length + 2);
  expect(banned.phase).toBe('window');
  c = { ...c, player: { ...c.player, age: 33 } };
  expect(doVice(c, 'doping', caught).career.destroyed).toBe(true);
});
