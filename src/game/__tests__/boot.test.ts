import { expect, it } from 'vitest';
import { loadProgress } from '../../components/PasswordGate';

it('Ladebalken: startet bei 0, endet bei 100 %, läuft nie rückwärts', () => {
  expect(loadProgress(0)).toBe(0);
  expect(loadProgress(1)).toBe(1);
  let last = 0;
  for (let t = 0; t <= 1.0001; t += 0.01) {
    const p = loadProgress(t);
    expect(p).toBeGreaterThanOrEqual(last - 1e-9);
    expect(p).toBeLessThanOrEqual(1);
    last = p;
  }
});
