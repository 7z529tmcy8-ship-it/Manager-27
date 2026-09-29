// Day-Trading-Spiel: Engine ohne UI. Ein Tick = eine Börsenminute (09:00–17:30 = 510 Minuten).
// Kursmodell: Zufallsbewegung mit wechselnder Schwankung (ruhige/hektische Phasen), mehr Bewegung zu
// Handelsbeginn und -ende, seltene Sprünge und erfundene Spiel-News, die eine Weile Richtung geben.
// Alles Spielgeld – keine echten Kurse, keine echten Nachrichten.

export interface Asset {
  id: string;
  name: string;
  /** Jährliche Schwankung (0.18 = 18 %). */
  vol: number;
  /** Spanne zwischen Kauf- und Verkaufskurs (Anteil vom Kurs). */
  spread: number;
  start: number;
  fictional?: boolean;
}

export const DAY_MINUTES = 510;
export const OPEN_MINUTE = 9 * 60;
export const CANDLE_MINUTES = 5;
export const FEE = 1;
export const START_CASH = 10_000;

export interface Candle {
  o: number;
  h: number;
  l: number;
  c: number;
  /** Minute des Tages, zu der die Kerze beginnt. */
  m: number;
}

export interface Position {
  /** Stück: positiv = Long, negativ = Short. */
  qty: number;
  /** Durchschnittlicher Einstiegskurs. */
  avg: number;
  /** Stop-Loss / Take-Profit in Prozent vom Einstieg (0 = aus). */
  stop: number;
  take: number;
}

export interface Trade {
  minute: number;
  side: 'Kauf' | 'Verkauf';
  qty: number;
  price: number;
  /** Realisierter Gewinn/Verlust dieser Order (ohne Gebühr), 0 beim Eröffnen. */
  pnl: number;
  reason?: string;
}

export interface GameNews {
  minute: number;
  text: string;
  up: boolean;
}

export interface TradingState {
  asset: Asset;
  day: number;
  minute: number;
  price: number;
  candles: Candle[];
  cash: number;
  pos: Position;
  trades: Trade[];
  news: GameNews[];
  dayStartEquity: number;
  leverage: 1 | 2 | 5;
  done: boolean;
  /** Interner Zustand des Kursmodells. */
  sim: { seed: number; logVol: number; drift: number; driftLeft: number };
}

// ---------- Zufall ----------
function next(state: TradingState): number {
  let t = (state.sim.seed = (state.sim.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function gauss(state: TradingState): number {
  const u = Math.max(next(state), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next(state));
}

// ---------- Preise ----------
export const bid = (s: TradingState) => s.price * (1 - s.asset.spread / 2);
export const ask = (s: TradingState) => s.price * (1 + s.asset.spread / 2);
export const equity = (s: TradingState) => s.cash + s.pos.qty * (s.pos.qty >= 0 ? bid(s) : ask(s));
export const unrealized = (s: TradingState) => (s.pos.qty === 0 ? 0 : s.pos.qty * ((s.pos.qty > 0 ? bid(s) : ask(s)) - s.pos.avg));
export const unrealizedPct = (s: TradingState) => (s.pos.qty === 0 ? 0 : (Math.sign(s.pos.qty) * ((s.pos.qty > 0 ? bid(s) : ask(s)) - s.pos.avg)) / s.pos.avg);
export const clockLabel = (minute: number) => {
  const m = OPEN_MINUTE + minute;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

const NEWS_UP = [
  'Gerüchte über eine Übernahme machen die Runde',
  'Analyst hebt das Kursziel an',
  'Überraschend starke Zahlen veröffentlicht',
  'Großer Fonds steigt ein – sagt man',
  'Wirtschaftsdaten besser als erwartet',
];
const NEWS_DOWN = [
  'Analyst stuft ab',
  'Gewinnwarnung sorgt für Nervosität',
  'Zinsangst am Markt',
  'Großinvestor verkauft angeblich',
  'Wirtschaftsdaten enttäuschen',
];

export function newGame(asset: Asset, cash = START_CASH, day = 1, seed = Date.now() | 0, startPrice = asset.start): TradingState {
  const s: TradingState = {
    asset,
    day,
    minute: 0,
    price: startPrice,
    candles: [{ o: startPrice, h: startPrice, l: startPrice, c: startPrice, m: 0 }],
    cash,
    pos: { qty: 0, avg: 0, stop: 0, take: 0 },
    trades: [],
    news: [],
    dayStartEquity: cash,
    leverage: 1,
    done: false,
    sim: { seed, logVol: 0, drift: 0, driftLeft: 0 },
  };
  return s;
}

/** Eine Börsenminute weiter: Kurs bewegen, Kerzen fortschreiben, Stopps prüfen, Börsenschluss. */
export function tick(prev: TradingState): TradingState {
  if (prev.done) return prev;
  const s: TradingState = { ...prev, sim: { ...prev.sim }, candles: prev.candles.slice(), pos: { ...prev.pos }, trades: prev.trades, news: prev.news };
  const sigma = s.asset.vol / Math.sqrt(252 * DAY_MINUTES);
  // Mehr Bewegung zur Eröffnung und kurz vor Schluss (U-Form über den Tag).
  const t = s.minute / DAY_MINUTES;
  const session = 1 + 1.2 * Math.exp(-t * 12) + 0.6 * Math.exp(-(1 - t) * 14);
  // Ruhige und hektische Phasen wechseln sich ab.
  s.sim.logVol = s.sim.logVol * 0.985 + 0.06 * gauss(s);
  // Geteilt durch 1,25, damit die Schwankung im Tagesmittel wieder zur Jahresschwankung passt.
  const vol = (sigma * session * Math.exp(s.sim.logVol)) / 1.25;

  // Spiel-News: geben für eine Weile eine Richtung vor.
  if (s.sim.driftLeft <= 0 && next(s) < 1 / 140) {
    const up = next(s) < 0.5;
    const list = up ? NEWS_UP : NEWS_DOWN;
    s.news = [{ minute: s.minute, text: list[Math.floor(next(s) * list.length)], up }, ...s.news].slice(0, 20);
    s.sim.drift = (up ? 1 : -1) * sigma * (0.1 + next(s) * 0.15);
    s.sim.driftLeft = 15 + Math.floor(next(s) * 30);
  }
  let r = vol * gauss(s) + (s.sim.driftLeft > 0 ? s.sim.drift : 0);
  if (s.sim.driftLeft > 0) s.sim.driftLeft--;
  // Seltene Sprünge.
  if (next(s) < 0.002) r += sigma * 8 * gauss(s);
  s.price = Math.max(0.01, s.price * Math.exp(r));
  s.minute++;

  // Kerzen
  const last = s.candles[s.candles.length - 1];
  if (s.minute % CANDLE_MINUTES === 0) {
    s.candles.push({ o: s.price, h: s.price, l: s.price, c: s.price, m: s.minute });
  } else {
    s.candles[s.candles.length - 1] = { ...last, h: Math.max(last.h, s.price), l: Math.min(last.l, s.price), c: s.price };
  }

  let out = s;
  // Stop-Loss / Take-Profit
  if (out.pos.qty !== 0) {
    const p = unrealizedPct(out) * 100;
    if (out.pos.stop > 0 && p <= -out.pos.stop) out = closePosition(out, 'Stop-Loss');
    else if (out.pos.take > 0 && p >= out.pos.take) out = closePosition(out, 'Take-Profit');
  }
  // Nachschusspflicht vermeiden: Ist das Konto aufgebraucht, wird zwangsgeschlossen.
  if (out.pos.qty !== 0 && equity(out) <= out.dayStartEquity * 0.05) out = closePosition(out, 'Margin Call');
  // Börsenschluss: Day-Trader gehen ohne Position nach Hause.
  if (out.minute >= DAY_MINUTES) {
    if (out.pos.qty !== 0) out = closePosition(out, 'Börsenschluss');
    out = { ...out, done: true };
  }
  return out;
}

/** Maximal handelbare Stückzahl in eine Richtung (Kaufkraft = Konto × Hebel). */
export function maxQty(s: TradingState, side: 1 | -1): number {
  const price = side > 0 ? ask(s) : bid(s);
  const limit = Math.max(0, equity(s) * s.leverage - FEE);
  // Stück, die man in diese Richtung noch aufbauen kann (bestehende Gegenposition wird zuerst geschlossen).
  const opposite = Math.sign(s.pos.qty) === -side ? Math.abs(s.pos.qty) : 0;
  const same = Math.sign(s.pos.qty) === side ? Math.abs(s.pos.qty) : 0;
  const room = Math.floor((limit - same * price) / price);
  return Math.max(0, opposite + Math.max(0, room));
}

/** Order ausführen: side 1 = kaufen, −1 = verkaufen/leerverkaufen. */
export function order(prev: TradingState, side: 1 | -1, qty: number, opts: { stop?: number; take?: number; reason?: string } = {}): TradingState {
  const q = Math.min(Math.floor(qty), maxQty(prev, side));
  if (q <= 0 || prev.done) return prev;
  const s: TradingState = { ...prev, pos: { ...prev.pos } };
  const price = side > 0 ? ask(s) : bid(s);
  const delta = side * q;
  let realized = 0;
  const cur = s.pos.qty;
  if (cur === 0 || Math.sign(cur) === side) {
    s.pos.avg = (s.pos.avg * Math.abs(cur) + price * q) / (Math.abs(cur) + q);
    s.pos.qty = cur + delta;
  } else {
    const closing = Math.min(q, Math.abs(cur));
    realized = closing * (price - s.pos.avg) * Math.sign(cur);
    s.pos.qty = cur + delta;
    if (s.pos.qty === 0) s.pos.avg = 0;
    else if (Math.sign(s.pos.qty) !== Math.sign(cur)) s.pos.avg = price; // gedreht: Rest neu eröffnet
  }
  if (opts.stop !== undefined) s.pos.stop = opts.stop;
  if (opts.take !== undefined) s.pos.take = opts.take;
  if (s.pos.qty === 0) {
    s.pos.stop = 0;
    s.pos.take = 0;
  }
  s.cash = s.cash - delta * price - FEE;
  s.trades = [{ minute: s.minute, side: side > 0 ? 'Kauf' : 'Verkauf', qty: q, price, pnl: realized, reason: opts.reason }, ...s.trades];
  return s;
}

export function closePosition(s: TradingState, reason?: string): TradingState {
  if (s.pos.qty === 0) return s;
  return order(s, s.pos.qty > 0 ? -1 : 1, Math.abs(s.pos.qty), { reason });
}

export interface DaySummary {
  pnl: number;
  pnlPct: number;
  trades: number;
  wins: number;
  losses: number;
  fees: number;
  best: number;
  worst: number;
}

export function summary(s: TradingState): DaySummary {
  const closes = s.trades.filter((t) => t.pnl !== 0);
  const pnl = equity(s) - s.dayStartEquity;
  return {
    pnl,
    pnlPct: pnl / s.dayStartEquity,
    trades: s.trades.length,
    wins: closes.filter((t) => t.pnl > 0).length,
    losses: closes.filter((t) => t.pnl < 0).length,
    fees: s.trades.length * FEE,
    best: Math.max(0, ...closes.map((t) => t.pnl)),
    worst: Math.min(0, ...closes.map((t) => t.pnl)),
  };
}
