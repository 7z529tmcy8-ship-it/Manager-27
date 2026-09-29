import { expect, it } from 'vitest';
import { ETFS, allSeries } from '../data';
import { cagr, correlation, maxDrawdown, scores, slice, sma, smaSeries, volatility } from '../metrics';

const series = allSeries(Date.UTC(2026, 8, 29));

it('Simulierte Kurse sind stabil und plausibel', () => {
  expect(allSeries(Date.UTC(2026, 8, 29))).toBe(series);
  for (const e of ETFS) {
    const s = series[e.ticker];
    const v = volatility(s);
    const c5 = cagr(s, 5);
    expect(v).toBeGreaterThan(0.08);
    expect(v).toBeLessThan(0.4);
    expect(c5).toBeGreaterThan(-0.1);
    expect(c5).toBeLessThan(0.3);
    expect(maxDrawdown(s)).toBeLessThan(-0.1);
  }
  expect(correlation(series.EUNL, series.XDWD)).toBeGreaterThan(0.95);
  expect(correlation(series.EUNL, series.IS3N)).toBeLessThan(correlation(series.EUNL, series.XDWD));
});

it('Kennzahlen rechnen richtig', () => {
  const s = [1, 2, 3, 4, 5].map((p, i) => ({ t: Date.UTC(2026, 0, 5 + i), p }));
  expect(sma(s, 2)).toBe(4.5);
  expect(smaSeries(s, 3)).toEqual([null, null, 2, 3, 4]);
  expect(maxDrawdown([{ t: 0, p: 10 }, { t: 1, p: 5 }, { t: 2, p: 12 }])).toBe(-0.5);
  expect(slice(series.EUNL, '1M').length).toBeGreaterThan(18);
  const sc = scores(series);
  expect(sc).toHaveLength(ETFS.length);
  for (const x of sc) {
    expect(x.total).toBeGreaterThanOrEqual(0);
    expect(x.total).toBeLessThanOrEqual(100);
  }
});
