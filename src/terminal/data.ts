// ETF-Stammdaten (recherchiert Ende September 2026 über Web-Suche, Quellen u. a. justETF, iShares, Vanguard, DWS, SSGA)
// und SIMULIERTE Kursverläufe. Die Kurse sind keine echten Marktdaten – sie werden aus einem einfachen Marktmodell
// erzeugt, damit das Terminal etwas zum Anzeigen hat. Echte Kurse bräuchten einen Datenanbieter (API-Schlüssel).

export type Category = 'Welt' | 'Welt + EM' | 'USA' | 'Tech' | 'Schwellenländer' | 'Deutschland' | 'Nebenwerte';

export interface EtfInfo {
  ticker: string;
  name: string;
  isin: string;
  index: string;
  /** Laufende Kosten in % p. a. */
  ter: number;
  /** Fondsvolumen in Mio. € (gerundet, Stand Sept. 2026) – null, wenn nicht geprüft. */
  aum: number | null;
  category: Category;
  /** Hinweis, wenn Angaben unsicher sind. */
  note?: string;
  /** Parameter der Simulation. */
  sim: { start: number; beta: number; alpha: number; idio: number };
}

export const ETFS: EtfInfo[] = [
  { ticker: 'EUNL', name: 'iShares Core MSCI World', isin: 'IE00B4L5Y983', index: 'MSCI World', ter: 0.2, aum: 130706, category: 'Welt', sim: { start: 50, beta: 1, alpha: 0, idio: 0.012 } },
  { ticker: 'XDWD', name: 'Xtrackers MSCI World 1C', isin: 'IE00BJ0KDQ92', index: 'MSCI World', ter: 0.12, aum: 21509, category: 'Welt', sim: { start: 56, beta: 1, alpha: 0.001, idio: 0.01 } },
  {
    ticker: 'VWCE', name: 'Vanguard FTSE All-World Acc', isin: 'IE00BK5BQT80', index: 'FTSE All-World', ter: 0.14, aum: null, category: 'Welt + EM',
    note: 'TER-Angaben widersprüchlich: 0,14 % (aktuelle Vanguard-Unterlagen lt. Suche) bzw. 0,19 % (ältere Quelle).',
    sim: { start: 70, beta: 0.97, alpha: -0.002, idio: 0.02 },
  },
  { ticker: 'SPYI', name: 'SPDR MSCI ACWI IMI', isin: 'IE00B3YLTY66', index: 'MSCI ACWI IMI', ter: 0.17, aum: 7794, category: 'Welt + EM', sim: { start: 120, beta: 0.96, alpha: -0.004, idio: 0.02 } },
  { ticker: 'SXR8', name: 'iShares Core S&P 500', isin: 'IE00B5BMR087', index: 'S&P 500', ter: 0.07, aum: 136853, category: 'USA', sim: { start: 230, beta: 1.05, alpha: 0.015, idio: 0.04 } },
  { ticker: 'SXRV', name: 'iShares Nasdaq 100', isin: 'IE00B53SZB19', index: 'Nasdaq-100', ter: 0.3, aum: null, category: 'Tech', sim: { start: 420, beta: 1.25, alpha: 0.04, idio: 0.09 } },
  { ticker: 'IS3N', name: 'iShares Core MSCI EM IMI', isin: 'IE00BKM4GZ66', index: 'MSCI EM IMI', ter: 0.18, aum: 40069, category: 'Schwellenländer', sim: { start: 25, beta: 0.72, alpha: -0.035, idio: 0.12 } },
  { ticker: 'DAXEX', name: 'iShares Core DAX (DE)', isin: 'DE0005933931', index: 'DAX 40', ter: 0.16, aum: 8446, category: 'Deutschland', sim: { start: 95, beta: 0.85, alpha: -0.01, idio: 0.11 } },
  { ticker: 'IUSN', name: 'iShares MSCI World Small Cap', isin: 'IE00BF4RFH31', index: 'MSCI World Small Cap', ter: 0.35, aum: 7819, category: 'Nebenwerte', sim: { start: 5, beta: 1.08, alpha: -0.025, idio: 0.08 } },
];

export const getEtf = (ticker: string) => ETFS.find((e) => e.ticker === ticker);

export interface Point {
  t: number; // Zeitstempel (ms, Handelstag 00:00 UTC)
  p: number; // Schlusskurs
}

// Deterministischer Zufall, damit die Kurven bei jedem Laden gleich aussehen.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const DAY = 86_400_000;
const START = Date.UTC(2019, 0, 2);

// Marktphasen des Modells (grob an bekannte Phasen angelehnt, aber simuliert): Crash & Erholung 2020, Bärenmarkt 2022.
const EPISODES: { from: number; to: number; drift: number }[] = [
  { from: Date.UTC(2020, 1, 20), to: Date.UTC(2020, 2, 23), drift: -0.015 },
  { from: Date.UTC(2020, 2, 24), to: Date.UTC(2020, 7, 31), drift: 0.0028 },
  { from: Date.UTC(2022, 0, 3), to: Date.UTC(2022, 9, 12), drift: -0.0011 },
];

function tradingDays(until: number): number[] {
  const days: number[] = [];
  for (let t = START; t <= until; t += DAY) {
    const wd = new Date(t).getUTCDay();
    if (wd !== 0 && wd !== 6) days.push(t);
  }
  return days;
}

let cache: { key: number; series: Record<string, Point[]> } | null = null;

/** Startwert des Marktmodells – so gewählt, dass die Verläufe realistisch wirken. */
const MARKET_SEED = 4;
const TICKER_SALT = 51;

/** Alle simulierten Kursreihen bis heute (gecacht pro Tag). */
export function allSeries(now = Date.now()): Record<string, Point[]> {
  const today = Math.floor(now / DAY) * DAY;
  if (cache?.key === today) return cache.series;
  const series = generate(today, MARKET_SEED, TICKER_SALT);
  cache = { key: today, series };
  return series;
}

export function generate(today: number, marketSeed: number, tickerSalt = 0): Record<string, Point[]> {
  const days = tradingDays(today);
  const market = mulberry32(marketSeed);
  const mu = 0.075 / 252;
  const sigma = 0.15 / Math.sqrt(252);
  const factor = days.map((t) => {
    const ep = EPISODES.find((e) => t >= e.from && t <= e.to);
    const vol = ep && ep.drift < 0 ? sigma * 2.2 : sigma;
    return mu + (ep?.drift ?? 0) + vol * gauss(market);
  });
  const series: Record<string, Point[]> = {};
  for (const e of ETFS) {
    const rand = mulberry32(hash(e.ticker) + tickerSalt);
    const idio = e.sim.idio / Math.sqrt(252);
    let p = e.sim.start;
    series[e.ticker] = days.map((t, i) => {
      if (i > 0) {
        const r = e.sim.beta * factor[i] + e.sim.alpha / 252 - e.ter / 100 / 252 + idio * gauss(rand);
        p *= Math.exp(r);
      }
      return { t, p: Math.round(p * 100) / 100 };
    });
  }
  return series;
}
