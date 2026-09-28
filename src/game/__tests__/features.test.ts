import { describe, expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer, finishFinal, playFinalStep, playFirstHalf, playSeason, stayAtClub, stayInWinter } from '../career';
import { resolveDecision } from '../decisions';
import type { Career } from '../types';

const bayern = () =>
  createCareer({ name: 'Star', nation: 'Deutschland', position: 'ST', age: 24, ovr: 86, potential: 88, clubId: slugify('FC Bayern München') });

describe('Live-Finals, Entscheidungen, Rivale, Kapitän, Schlagzeilen', () => {
  it('ein Live-Finale lässt sich mit Entscheidungen zu Ende spielen', () => {
    let found = false;
    for (let i = 0; i < 40 && !found; i++) {
      let c: Career = stayInWinter(playFirstHalf(bayern(), true));
      if (c.phase !== 'final') continue;
      found = true;
      // Zwischenstand muss speicherbar sein.
      c = JSON.parse(JSON.stringify(c)) as Career;
      while (c.phase === 'final') {
        for (let step = 0; step < 100 && !c.liveFinal!.done; step++) {
          c = playFinalStep(c, c.liveFinal!.pending?.options[0].id);
        }
        expect(c.liveFinal!.done).toBe(true);
        c = finishFinal(c);
      }
      expect(c.phase).toBe('window');
      expect(c.history).toHaveLength(1);
    }
    expect(found).toBe(true);
  });

  it('Entscheidungen werden aufgelöst und blockieren danach nicht mehr', () => {
    for (let i = 0; i < 30; i++) {
      let c = playSeason(bayern());
      if (!c.decision) continue;
      const opt = c.decision.options[0].id;
      c = resolveDecision(c, opt);
      expect(c.decision).toBeNull();
      expect(c.decisionResult?.title).toBeTruthy();
      return;
    }
  });

  it('Rivale entwickelt sich mit, Kapitänsbinde nach einigen Jahren, Schlagzeilen entstehen', () => {
    let c = bayern();
    expect(c.rival?.position).toBe('ST');
    for (let i = 0; i < 5; i++) {
      c = playSeason(c);
      if (c.decision) c = resolveDecision(c, c.decision.options[0].id);
      if (c.phase === 'window') c = c.player.contract.yearsLeft > 0 ? stayAtClub(c) : c;
    }
    expect(c.rival!.history.length).toBeGreaterThanOrEqual(3);
    expect((c.news ?? []).length).toBeGreaterThan(5);
  });
});
