import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { autoPlayFinal, createCareer, finishFinal, playNextStage, playSeason, setStageLoad, stayInWinter } from '../career';
import { resolveDecision } from '../decisions';
import type { Career } from '../types';

const base = () =>
  createCareer({ name: 'Etappe', nation: 'Deutschland', position: 'ST', age: 22, ovr: 78, potential: 84, clubId: slugify('VfB Stuttgart') });

it('Saison in 6 Etappen: Winterpause nach Etappe 3, Saisonende nach Etappe 6', () => {
  let c: Career = setStageLoad(base(), 'full');
  expect(c.progress?.load).toBe('full');
  c = playNextStage(c);
  expect(c.phase).toBe('season');
  expect(c.progress?.stage).toBe(1);
  c = playNextStage(playNextStage(c));
  expect(c.phase).toBe('winter');
  expect(c.progress?.stageLog).toHaveLength(3);
  if (c.decision) c = resolveDecision(c, c.decision.options[0].id);
  c = stayInWinter(c);
  expect(c.phase).toBe('season');
  expect(c.progress?.stage).toBe(3);
  c = playNextStage(playNextStage(c));
  expect(c.progress?.stageLog).toHaveLength(5);
  c = playNextStage(c);
  while (c.phase === 'final') c = finishFinal(autoPlayFinal(c));
  expect(c.phase).toBe('window');
  expect(c.history).toHaveLength(1);
  expect(c.history[0].table.reduce((a, r) => a + r.played, 0)).toBe(18 * 34);
});

it('„Ganze Saison“ spielt auch mitten in der Saison den Rest am Stück', () => {
  const mid = playNextStage(playNextStage(base()));
  const done = playSeason(mid);
  expect(done.phase).toBe('window');
  expect(done.history).toHaveLength(1);
  expect(done.history[0].table.reduce((a, r) => a + r.played, 0)).toBe(18 * 34);
});
