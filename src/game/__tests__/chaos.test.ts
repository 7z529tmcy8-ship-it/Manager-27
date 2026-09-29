import { describe, expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { canComeback, comeback, createCareer, playSeason, retire, stayAtClub } from '../career';
import { resolveDecision } from '../decisions';
import type { Career } from '../types';

const base = () =>
  createCareer({ name: 'Chaos', nation: 'Deutschland', position: 'ST', age: 24, ovr: 80, potential: 82, clubId: slugify('VfB Stuttgart') });

const force = (c: Career, id: string, option: string) => resolveDecision({ ...c, decision: { id, title: '', text: '', options: [] } }, option);

const next = (c: Career) => {
  let x = c;
  if (x.decision) x = resolveDecision(x, x.decision.options[x.decision.options.length - 1].id);
  if (x.phase === 'window') x = x.player.contract.yearsLeft > 0 ? stayAtClub(x) : x;
  return x;
};

describe('Wettskandal, Doppelleben, Comeback', () => {
  it('angenommenes Wettgeld fliegt irgendwann auf und führt zu einer Sperre', () => {
    let found = false;
    for (let run = 0; run < 10 && !found; run++) {
      let c = force(base(), 'betting', 'accept');
      expect(c.player.bettingSecret).toBe(true);
      for (let i = 0; i < 4 && !found; i++) {
        c = playSeason(c);
        const s = c.history[c.history.length - 1];
        if ((s.events ?? []).some((e) => e.title === 'Wettskandal aufgeflogen!')) {
          found = true;
          expect(c.player.bettingSecret).toBe(false);
        }
        c = next(c);
        if (c.phase !== 'season') break;
      }
    }
    expect(found).toBe(true);
  });

  it('Nebenprojekt sammelt Hits und Flops und lässt sich beenden', () => {
    // Jung starten (3 Jahre Vertrag), damit genug Halbserien gespielt werden.
    let c = force(
      createCareer({ name: 'Rapper', nation: 'Deutschland', position: 'ST', age: 20, ovr: 76, potential: 82, clubId: slugify('VfB Stuttgart') }),
      'sideproject',
      'rap',
    );
    expect(c.player.sideProject?.kind).toBe('rap');
    for (let i = 0; i < 3; i++) {
      c = next(playSeason(c));
      if (c.phase !== 'season') break;
    }
    const sp = c.player.sideProject;
    expect((sp?.hits ?? 0) + (sp?.flops ?? 0)).toBeGreaterThan(0);
  });

  it('Rücktritt vom Rücktritt: 2 Jahre Pause, −15 Wertung, danach vereinslos mit Angeboten', () => {
    let c = playSeason(base());
    c = retire(next(c).phase === 'season' ? next(c) : c);
    expect(canComeback(c)).toBe(true);
    const age = c.player.age;
    const ovr = c.player.ovr;
    const back = comeback(c);
    expect(back.phase).toBe('window');
    expect(back.player.age).toBe(age + 2);
    expect(back.player.ovr).toBe(Math.max(45, ovr - 15));
    expect(back.comebackUsed).toBe(true);
    expect(canComeback(retire(back))).toBe(false);
    expect(back.offers.length).toBeGreaterThan(0);
  });
});
