import { it } from 'vitest';
import { slugify } from '../../data/leagues';
import { performanceIndex } from '../development';
import { createCareer, playSeason } from '../career';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

it.skipIf(!env.CALIBRATE)('Entwicklung nach Alter und Leistung', { timeout: 120000 }, () => {
  for (const age of [21, 25, 28, 30, 32, 34]) {
    const buckets: Record<string, number[]> = { stark: [], normal: [], schwach: [] };
    let minStrong = 99;
    for (let i = 0; i < 300; i++) {
      const c = playSeason(createCareer({ name: 'x', nation: 'Deutschland', position: 'ST', age, ovr: 80, potential: age < 25 ? 86 : 81, clubId: slugify('VfB Stuttgart') }));
      const s = c.history[0];
      const perf = performanceIndex(s);
      const d = s.ovrEnd - s.ovrStart;
      const key = perf >= 0.7 ? 'stark' : perf <= -0.3 ? 'schwach' : 'normal';
      buckets[key].push(d);
      if (key === 'stark' && s.minutes / s.possibleMinutes >= 0.5 && !(s.events ?? []).some((e) => e.tone === 'bad')) minStrong = Math.min(minStrong, d);
    }
    const avg = (a: number[]) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : '–');
    console.log(`Alter ${age}: stark ${avg(buckets.stark)} (n=${buckets.stark.length}, min ${minStrong}) | normal ${avg(buckets.normal)} (n=${buckets.normal.length}) | schwach ${avg(buckets.schwach)} (n=${buckets.schwach.length})`);
  }
});
