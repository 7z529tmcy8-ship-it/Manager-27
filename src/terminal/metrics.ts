import { ETFS, type EtfInfo, type Point } from './data';

export type Range = '1M' | '3M' | '6M' | 'YTD' | '1J' | '3J' | '5J' | 'MAX';
export const RANGES: Range[] = ['1M', '3M', '6M', 'YTD', '1J', '3J', '5J', 'MAX'];

/** Startzeitpunkt eines Zeitraums, gerechnet vom letzten Kurs. */
export function rangeStart(range: Range, last: number): number {
  const d = new Date(last);
  const back = (m: number) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - m, d.getUTCDate());
  switch (range) {
    case '1M': return back(1);
    case '3M': return back(3);
    case '6M': return back(6);
    case 'YTD': return Date.UTC(d.getUTCFullYear(), 0, 1) - 1;
    case '1J': return back(12);
    case '3J': return back(36);
    case '5J': return back(60);
    case 'MAX': return 0;
  }
}

/** Index des letzten Punkts vor oder am Zeitpunkt t. */
function indexAt(s: Point[], t: number): number {
  let lo = 0;
  let hi = s.length - 1;
  if (t <= s[0].t) return 0;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (s[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function slice(s: Point[], range: Range): Point[] {
  const last = s[s.length - 1].t;
  return s.slice(indexAt(s, rangeStart(range, last)));
}

/** Rendite (Anteil, 0.05 = 5 %) über einen Zeitraum. */
export function periodReturn(s: Point[], range: Range | '1T' | '1W'): number {
  const last = s[s.length - 1];
  let i: number;
  if (range === '1T') i = s.length - 2;
  else if (range === '1W') i = Math.max(0, s.length - 6);
  else i = indexAt(s, rangeStart(range, last.t));
  return last.p / s[i].p - 1;
}

/** Durchschnittliche jährliche Rendite (CAGR) über n Jahre. */
export function cagr(s: Point[], years: number): number {
  const last = s[s.length - 1];
  const i = indexAt(s, last.t - years * 365.25 * 86_400_000);
  const span = (last.t - s[i].t) / (365.25 * 86_400_000);
  return (last.p / s[i].p) ** (1 / span) - 1;
}

/** Gleitender Durchschnitt über n Handelstage (für jeden Punkt, null bis genug Daten da sind). */
export function smaSeries(s: Point[], n: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    sum += s[i].p;
    if (i >= n) sum -= s[i - n].p;
    out.push(i >= n - 1 ? sum / n : null);
  }
  return out;
}

export function sma(s: Point[], n: number): number {
  const part = s.slice(-n);
  return part.reduce((a, x) => a + x.p, 0) / part.length;
}

function dailyReturns(s: Point[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < s.length; i++) r.push(Math.log(s[i].p / s[i - 1].p));
  return r;
}

/** Annualisierte Volatilität über die letzten n Handelstage. */
export function volatility(s: Point[], n = 252): number {
  const r = dailyReturns(s.slice(-(n + 1)));
  const m = r.reduce((a, x) => a + x, 0) / r.length;
  const v = r.reduce((a, x) => a + (x - m) ** 2, 0) / (r.length - 1);
  return Math.sqrt(v * 252);
}

/** Größter Verlust vom Hoch (negativ, z. B. −0.25). */
export function maxDrawdown(s: Point[]): number {
  let peak = s[0].p;
  let worst = 0;
  for (const x of s) {
    peak = Math.max(peak, x.p);
    worst = Math.min(worst, x.p / peak - 1);
  }
  return worst;
}

/** Sharpe-Ratio über 1 Jahr mit angenommenem risikofreiem Zins von 2 %. */
export const RISK_FREE = 0.02;
export function sharpe(s: Point[]): number {
  return (periodReturn(s, '1J') - RISK_FREE) / volatility(s);
}

export function correlation(a: Point[], b: Point[], n = 252): number {
  const ra = dailyReturns(a.slice(-(n + 1)));
  const rb = dailyReturns(b.slice(-(n + 1)));
  const len = Math.min(ra.length, rb.length);
  const ma = ra.reduce((x, y) => x + y, 0) / len;
  const mb = rb.reduce((x, y) => x + y, 0) / len;
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < len; i++) {
    cov += (ra[i] - ma) * (rb[i] - mb);
    va += (ra[i] - ma) ** 2;
    vb += (rb[i] - mb) ** 2;
  }
  return cov / Math.sqrt(va * vb);
}

// Streuung: breit gestreut = besser (feste, nachvollziehbare Einordnung je Kategorie).
const DIVERSIFICATION: Record<EtfInfo['category'], number> = {
  'Welt + EM': 100, Welt: 85, Nebenwerte: 70, USA: 55, Schwellenländer: 55, Tech: 30, Deutschland: 25,
};

export interface Score {
  ticker: string;
  total: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  parts: { label: string; weight: number; value: number; raw: string }[];
}

/**
 * Regelbasierte Bewertung (0–100) – bewusst simpel und transparent, KEINE Anlageempfehlung:
 * Kosten 25 %, Rendite 3 J. 25 %, Schwankung 20 %, Max. Verlust 15 %, Streuung 15 %.
 * Jede Kennzahl wird innerhalb der Liste von schlechtestem (0) bis bestem (100) Wert eingeordnet.
 */
export function scores(series: Record<string, Point[]>): Score[] {
  const rows = ETFS.map((e) => {
    const s = series[e.ticker];
    return { e, ter: e.ter, ret: cagr(s, 3), vol: volatility(s), dd: maxDrawdown(slice(s, '3J')), div: DIVERSIFICATION[e.category] };
  });
  const norm = (vals: number[], v: number, higherBetter: boolean) => {
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (max === min) return 50;
    const k = (v - min) / (max - min);
    return Math.round((higherBetter ? k : 1 - k) * 100);
  };
  const pct = (v: number) => `${(v * 100).toFixed(1).replace('.', ',')} %`;
  return rows
    .map((r) => {
      const parts = [
        { label: 'Kosten', weight: 0.25, value: norm(rows.map((x) => x.ter), r.ter, false), raw: `${r.ter.toFixed(2).replace('.', ',')} %` },
        { label: 'Rendite 3J', weight: 0.25, value: norm(rows.map((x) => x.ret), r.ret, true), raw: `${pct(r.ret)} p. a.` },
        { label: 'Schwankung', weight: 0.2, value: norm(rows.map((x) => x.vol), r.vol, false), raw: pct(r.vol) },
        { label: 'Max. Verlust', weight: 0.15, value: norm(rows.map((x) => x.dd), r.dd, true), raw: pct(r.dd) },
        { label: 'Streuung', weight: 0.15, value: r.div, raw: r.e.category },
      ];
      const total = Math.round(parts.reduce((a, p) => a + p.value * p.weight, 0));
      const grade = total >= 75 ? 'A' : total >= 60 ? 'B' : total >= 45 ? 'C' : total >= 30 ? 'D' : 'E';
      return { ticker: r.e.ticker, total, grade, parts } as Score;
    })
    .sort((a, b) => b.total - a.total);
}
