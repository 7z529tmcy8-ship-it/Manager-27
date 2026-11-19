import { describe, expect, it } from 'vitest';
import { createCareer } from '../career';
import { slugify } from '../../data/leagues';
import { simulateToBreak } from '../simple';
import { replayOf } from '../simReplay';

describe('Live-Simulation', () => {
  it('zeigt Hinrunde und Rückrunde Spiel für Spiel mit stimmigen Punkten', () => {
    let c = createCareer({ name: 'Test Spieler', nation: 'Deutschland', position: 'ST', age: 18, ovr: 70, potential: 85, clubId: slugify('Hamburger SV') });
    c = { ...c, settings: { ...c.settings, liveMatches: false } };
    const winter = simulateToBreak(c);
    const r1 = replayOf(c, winter)!;
    expect(r1.title).toBe('Hinrunde');
    expect(r1.steps.length).toBeGreaterThan(5);
    const last = r1.steps[r1.steps.length - 1];
    expect(last.points).toBe(last.w * 3 + last.d);
    const end = simulateToBreak(winter);
    const r2 = replayOf(winter, end)!;
    expect(r2.title).toBe('Rückrunde');
    expect(r2.steps[0].points).toBeGreaterThanOrEqual(r1.steps[r1.steps.length - 1].points);
  });
});
