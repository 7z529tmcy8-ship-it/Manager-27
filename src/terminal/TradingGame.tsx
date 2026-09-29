import { useEffect, useMemo, useRef, useState } from 'react';
import { ETFS, allSeries } from './data';
import { fmt, pct, useWidth } from './charts';
import { volatility } from './metrics';
import {
  CANDLE_MINUTES,
  DAY_MINUTES,
  FEE,
  START_CASH,
  ask,
  bid,
  clockLabel,
  closePosition,
  equity,
  maxQty,
  newGame,
  order,
  summary,
  tick,
  unrealized,
  unrealizedPct,
  type Asset,
  type Candle,
  type TradingState,
} from './trading';

const SAVE_KEY = 'mk-trading';
const SPEEDS = [1, 2, 5] as const;
const SIZES: [string, number][] = [['25 %', 0.25], ['50 %', 0.5], ['Max', 1]];
const STOPS = [0, 1, 2, 5];
const TAKES = [0, 2, 5, 10];

interface Save {
  cash: number;
  day: number;
  best: number;
  worst: number;
  total: number;
  greenDays: number;
}
const FRESH: Save = { cash: START_CASH, day: 1, best: 0, worst: 0, total: 0, greenDays: 0 };

function loadSave(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? { ...FRESH, ...JSON.parse(raw) } : FRESH;
  } catch {
    return FRESH;
  }
}
function storeSave(s: Save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    // ohne Speicher gilt der Stand nur bis zum Neuladen
  }
}

/** Handelbare Werte: die ETFs (Schwankung aus ihren Kursen) plus zwei erfundene, wilde Aktien. */
function useAssets(): Asset[] {
  return useMemo(() => {
    const series = allSeries();
    const etfs: Asset[] = ETFS.filter((e) => ['EUNL', 'SXR8', 'SXRV', 'IS3N', 'DAXEX'].includes(e.ticker)).map((e) => {
      const s = series[e.ticker];
      return { id: e.ticker, name: e.name, vol: volatility(s), spread: 0.0006, start: s[s.length - 1].p };
    });
    return [
      ...etfs,
      { id: 'BNNA', name: 'Bananen AG', vol: 0.45, spread: 0.0015, start: 42.1, fictional: true },
      { id: 'MOON', name: 'Moonshot Robotics', vol: 0.85, spread: 0.0025, start: 18.46, fictional: true },
    ];
  }, []);
}

const eur = (v: number) => `${fmt(v)} €`;
const signedEur = (v: number) => `${v >= 0 ? '+' : '−'}${fmt(Math.abs(v))} €`;

/** Day-Trading-Spiel: ein Börsentag im Zeitraffer, Kerzen-Chart, Long/Short, Stop-Loss & Take-Profit. Spielgeld. */
export default function TradingGame() {
  const assets = useAssets();
  const [save, setSave] = useState<Save>(loadSave);
  const [game, setGame] = useState<TradingState | null>(null);
  const [assetId, setAssetId] = useState('MOON');
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [paused, setPaused] = useState(false);
  const [size, setSize] = useState(0.5);
  const [stop, setStop] = useState(2);
  const [take, setTake] = useState(5);
  const savedDay = useRef(0);

  // Die Uhr läuft: 4 Börsenminuten pro Sekunde bei Tempo 1.
  useEffect(() => {
    if (!game || game.done || paused) return;
    const id = setInterval(() => setGame((g) => (g ? tick(g) : g)), 250 / speed);
    return () => clearInterval(id);
  }, [game?.done, paused, speed, !!game]);

  // Tagesende speichern (einmal pro Tag).
  useEffect(() => {
    if (!game?.done || savedDay.current === game.day) return;
    savedDay.current = game.day;
    const d = summary(game);
    const next: Save = {
      cash: equity(game),
      day: save.day + 1,
      best: Math.max(save.best, d.pnl),
      worst: Math.min(save.worst, d.pnl),
      total: save.total + d.pnl,
      greenDays: save.greenDays + (d.pnl > 0 ? 1 : 0),
    };
    setSave(next);
    storeSave(next);
  }, [game?.done]);

  const start = () => {
    const asset = assets.find((a) => a.id === assetId) ?? assets[0];
    setGame(newGame(asset, save.cash, save.day));
    setPaused(false);
  };
  const reset = () => {
    if (!confirm('Konto auf 10.000 € zurücksetzen? Deine Statistik wird gelöscht.')) return;
    setSave(FRESH);
    storeSave(FRESH);
    setGame(null);
  };

  const trade = (side: 1 | -1) => {
    setGame((g) => {
      if (!g) return g;
      const flat = g.pos.qty === 0;
      const q = Math.max(1, Math.floor(maxQty(g, side) * size));
      return order(g, side, q, flat || Math.sign(g.pos.qty) === side ? { stop, take } : {});
    });
  };
  const close = () => setGame((g) => (g ? closePosition(g, 'Manuell') : g));

  // Tastenkürzel wie bei Trading-Software: K = kaufen, V = verkaufen, X = schließen, Leertaste = Pause.
  useEffect(() => {
    if (!game || game.done) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'k') trade(1);
      else if (k === 'v') trade(-1);
      else if (k === 'x') close();
      else if (k === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      } else return;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!game) {
    return (
      <Setup
        assets={assets}
        assetId={assetId}
        onPick={setAssetId}
        save={save}
        onStart={start}
        onReset={reset}
      />
    );
  }

  const g = game;
  const dayOpen = g.candles[0].o;
  const dayChange = g.price / dayOpen - 1;
  const eq = equity(g);
  const dayPnl = eq - g.dayStartEquity;
  const flat = g.pos.qty === 0;
  const buyQty = Math.max(0, Math.floor(maxQty(g, 1) * size));
  const sellQty = Math.max(0, Math.floor(maxQty(g, -1) * size));

  return (
    <section className="tg">
      <div className="tg-head">
        <div>
          <p className="mk-sub">{g.asset.id}{g.asset.fictional ? ' · fiktiv' : ''} · Handelstag {g.day}</p>
          <h2 className="mk-name">{g.asset.name}</h2>
        </div>
        <div className="tg-clock">
          <strong>{clockLabel(g.minute)}</strong>
          <span className="tg-progress" aria-hidden="true"><span style={{ width: `${(g.minute / DAY_MINUTES) * 100}%` }} /></span>
        </div>
      </div>

      <div className="mk-price">
        <span className="mk-big tg-live">{fmt(g.price)} €</span>
        <span className={`mk-pill big ${dayChange >= 0 ? 'up' : 'down'}`}>{dayChange >= 0 ? '▲' : '▼'} {pct(dayChange, 2)}</span>
        <span className="mk-muted">Geld {fmt(bid(g))} · Brief {fmt(ask(g))}</span>
      </div>

      <div className="tg-grid">
        <div className="mk-card chart tg-chartcard">
          <div className="tg-speed" role="radiogroup" aria-label="Tempo">
            <button className={paused ? 'on' : ''} onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? '▶ Weiter' : '⏸ Pause'}</button>
            {SPEEDS.map((sp) => (
              <button key={sp} role="radio" aria-checked={speed === sp} className={speed === sp && !paused ? 'on' : ''} onClick={() => { setSpeed(sp); setPaused(false); }}>{sp}×</button>
            ))}
          </div>
          <CandleChart s={g} />
          {g.news[0] && g.minute - g.news[0].minute < 20 && (
            <div className={`tg-news ${g.news[0].up ? 'up' : 'down'}`}>📰 {clockLabel(g.news[0].minute)} · {g.news[0].text} <small>(Spiel-News)</small></div>
          )}
        </div>

        <div className="tg-side">
          <div className="mk-card">
            <h3>Konto</h3>
            <ul className="mk-kv">
              <li><span>Kontowert</span><span className="mk-kv-v">{eur(eq)}</span></li>
              <li><span>Heute</span><span className="mk-kv-v"><span className={`mk-pill ${dayPnl >= 0 ? 'up' : 'down'}`}>{dayPnl >= 0 ? '▲' : '▼'} {signedEur(dayPnl)}</span></span></li>
              <li><span>Hebel</span><span className="mk-kv-v">
                <span className="tg-lev">
                  {([1, 2, 5] as const).map((l) => (
                    <button key={l} className={g.leverage === l ? 'on' : ''} disabled={!flat} onClick={() => setGame({ ...g, leverage: l })}>{l}×</button>
                  ))}
                </span>
              </span></li>
            </ul>
          </div>

          <div className="mk-card">
            <h3>Position</h3>
            {flat ? (
              <p className="mk-hint" style={{ marginTop: 0 }}>Keine offene Position. Kaufen, wenn du steigende Kurse erwartest – verkaufen (Short), wenn du fallende erwartest.</p>
            ) : (
              <>
                <ul className="mk-kv">
                  <li><span>{g.pos.qty > 0 ? 'Long' : 'Short'}</span><span className="mk-kv-v">{Math.abs(g.pos.qty)} Stück</span></li>
                  <li><span>Einstieg</span><span className="mk-kv-v">{fmt(g.pos.avg)} €</span></li>
                  <li><span>Gewinn/Verlust</span><span className="mk-kv-v"><span className={`mk-pill ${unrealized(g) >= 0 ? 'up' : 'down'}`}>{signedEur(unrealized(g))} ({pct(unrealizedPct(g), 1)})</span></span></li>
                  <li><span>Stop-Loss / Take-Profit</span><span className="mk-kv-v">{g.pos.stop ? `−${g.pos.stop} %` : 'aus'} / {g.pos.take ? `+${g.pos.take} %` : 'aus'}</span></li>
                </ul>
                <button className="btn secondary tg-close" onClick={close}>Position schließen (X)</button>
              </>
            )}
          </div>

          <div className="mk-card tg-order">
            <h3>Order</h3>
            <Chips label="Größe" value={size} options={SIZES} onPick={setSize} />
            <Chips label="Stop-Loss" value={stop} options={STOPS.map((v) => [v ? `−${v} %` : 'aus', v])} onPick={setStop} />
            <Chips label="Take-Profit" value={take} options={TAKES.map((v) => [v ? `+${v} %` : 'aus', v])} onPick={setTake} />
            <div className="tg-buttons">
              <button className="tg-buy" onClick={() => trade(1)} disabled={buyQty <= 0}>
                Kaufen (K)<small>{buyQty} Stück · {fmt(ask(g))}</small>
              </button>
              <button className="tg-sell" onClick={() => trade(-1)} disabled={sellQty <= 0}>
                {g.pos.qty > 0 ? 'Verkaufen' : 'Short'} (V)<small>{sellQty} Stück · {fmt(bid(g))}</small>
              </button>
            </div>
            <p className="mk-hint">Gebühr {eur(FEE)} pro Order. Um 17:30 wird alles automatisch geschlossen.</p>
          </div>
        </div>
      </div>

      {g.trades.length > 0 && (
        <div className="mk-card tg-log">
          <h3>Orders heute</h3>
          <ul className="mk-kv">
            {g.trades.slice(0, 8).map((t, i) => (
              <li key={i}>
                <span>{clockLabel(t.minute)} · {t.side} {t.qty} × {fmt(t.price)}{t.reason && t.reason !== 'Manuell' ? ` · ${t.reason}` : ''}</span>
                <span className="mk-kv-v">{t.pnl !== 0 ? <span className={t.pnl > 0 ? 'tg-up' : 'tg-down'}>{signedEur(t.pnl)}</span> : '–'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Handy: feste Handelsleiste unten, damit Chart und Knöpfe gleichzeitig sichtbar sind. */}
      {!g.done && (
        <div className="tg-dock">
          <div className="tg-dock-info">
            {flat ? <span className="mk-muted">Keine Position</span> : (
              <span className={`mk-pill ${unrealized(g) >= 0 ? 'up' : 'down'}`}>{g.pos.qty > 0 ? 'Long' : 'Short'} {signedEur(unrealized(g))}</span>
            )}
            {!flat && <button className="mk-link" onClick={close}>Schließen</button>}
          </div>
          <div className="tg-buttons">
            <button className="tg-buy" onClick={() => trade(1)} disabled={buyQty <= 0}>Kaufen<small>{buyQty} × {fmt(ask(g))}</small></button>
            <button className="tg-sell" onClick={() => trade(-1)} disabled={sellQty <= 0}>{g.pos.qty > 0 ? 'Verkaufen' : 'Short'}<small>{sellQty} × {fmt(bid(g))}</small></button>
          </div>
        </div>
      )}

      {g.done && <DayEnd s={g} save={save} onNext={() => setGame(null)} />}
    </section>
  );
}

function Chips<T extends number>({ label, value, options, onPick }: { label: string; value: T; options: [string, T][]; onPick: (v: T) => void }) {
  return (
    <div className="tg-chips">
      <span className="mk-label">{label}</span>
      <div role="radiogroup" aria-label={label}>
        {options.map(([l, v]) => (
          <button key={l} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onPick(v)}>{l}</button>
        ))}
      </div>
    </div>
  );
}

function Setup({ assets, assetId, onPick, save, onStart, onReset }: { assets: Asset[]; assetId: string; onPick: (id: string) => void; save: Save; onStart: () => void; onReset: () => void }) {
  const broke = save.cash < 100;
  return (
    <section className="tg">
      <div className="mk-card tg-setup">
        <p className="mk-label">Day-Trading · Spielgeld</p>
        <h2 className="mk-name">Handelstag {save.day}</h2>
        <div className="tg-stats">
          <div><span className="mk-label">Konto</span><strong>{eur(save.cash)}</strong></div>
          <div><span className="mk-label">Gesamt</span><strong className={save.total >= 0 ? 'tg-up' : 'tg-down'}>{signedEur(save.total)}</strong></div>
          <div><span className="mk-label">Bester Tag</span><strong>{signedEur(save.best)}</strong></div>
          <div><span className="mk-label">Grüne Tage</span><strong>{save.greenDays} / {save.day - 1}</strong></div>
        </div>
        <h3>Womit handelst du heute?</h3>
        <ul className="mk-rows tg-assets">
          {assets.map((a) => (
            <li key={a.id}>
              <button className={`mk-row ${assetId === a.id ? 'sel' : ''}`} onClick={() => onPick(a.id)} aria-pressed={assetId === a.id}>
                <span className="mk-row-name"><strong>{a.id}</strong><small>{a.name}{a.fictional ? ' · fiktiv' : ''}</small></span>
                <span className="tg-vol" title="Jährliche Schwankung">{a.vol >= 0.6 ? '🌶️🌶️🌶️' : a.vol >= 0.3 ? '🌶️🌶️' : '🌶️'}</span>
                <span className="mk-row-price"><strong>{fmt(a.start)}</strong><small className="mk-muted">Schwankung {Math.round(a.vol * 100)} %</small></span>
              </button>
            </li>
          ))}
        </ul>
        {broke ? (
          <button className="btn primary big tg-start" onClick={onReset}>Pleite – mit 10.000 € neu starten</button>
        ) : (
          <button className="btn primary big tg-start" onClick={onStart}>Börse öffnen (09:00)</button>
        )}
        <p className="mk-hint">
          Ein Börsentag dauert bei Tempo 1× etwa 2 Minuten. Kurse und News sind simuliert. Mehr 🌶️ heißt mehr Schwankung –
          mehr Chancen, aber auch mehr Risiko. Tasten: K kaufen · V verkaufen · X schließen · Leertaste Pause.
        </p>
        {save.day > 1 && !broke && <button className="mk-link tg-reset" onClick={onReset}>Konto zurücksetzen</button>}
      </div>
    </section>
  );
}

function DayEnd({ s, save, onNext }: { s: TradingState; save: Save; onNext: () => void }) {
  const d = summary(s);
  const verdict =
    d.trades === 0 ? 'Heute nur zugeschaut. Auch eine Strategie.'
      : d.pnlPct > 0.03 ? 'Starker Tag! Aber Vorsicht: Glück und Können sind beim Day-Trading schwer zu unterscheiden.'
        : d.pnl > 0 ? 'Im Plus geschlossen – solide.'
          : d.pnlPct < -0.05 ? 'Autsch. Ein Stop-Loss hätte vielleicht geholfen.'
            : 'Leicht im Minus. Gebühren und Spanne fressen beim häufigen Handeln mit.';
  return (
    <div className="tg-overlay" role="dialog" aria-modal="true" aria-label="Tagesbilanz">
      <div className="mk-card tg-dayend">
        <p className="mk-label">Börsenschluss · Handelstag {s.day}</p>
        <h2 className="mk-name">{d.pnl >= 0 ? 'Grüner Tag' : 'Roter Tag'}</h2>
        <p className={`tg-result ${d.pnl >= 0 ? 'tg-up' : 'tg-down'}`}>{signedEur(d.pnl)} <small>({pct(d.pnlPct, 2)})</small></p>
        <ul className="mk-kv">
          <li><span>Orders</span><span className="mk-kv-v">{d.trades}</span></li>
          <li><span>Gewinn- / Verlust-Trades</span><span className="mk-kv-v">{d.wins} / {d.losses}</span></li>
          <li><span>Gebühren</span><span className="mk-kv-v">{eur(d.fees)}</span></li>
          <li><span>Bester / schlechtester Trade</span><span className="mk-kv-v">{signedEur(d.best)} / {signedEur(d.worst)}</span></li>
          <li><span>Neuer Kontostand</span><span className="mk-kv-v">{eur(save.cash)}</span></li>
        </ul>
        <p className="mk-hint">{verdict}</p>
        <button className="btn primary big tg-start" onClick={onNext}>Nächster Handelstag</button>
      </div>
    </div>
  );
}

/** Live-Kerzenchart: grüne Kerzen = gestiegen, rote = gefallen (plus hohler/voller Körper). Fadenkreuz zeigt O/H/T/S. */
function CandleChart({ s }: { s: TradingState }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const height = 280;
  const pad = { l: 6, r: 62, t: 10, b: 22 };
  const slot = 7;
  const visible = Math.max(20, Math.floor((width - pad.l - pad.r) / slot));
  const candles = s.candles.slice(-visible);
  const levels: { v: number; label: string; cls: string }[] = [];
  if (s.pos.qty !== 0) {
    const dir = Math.sign(s.pos.qty);
    levels.push({ v: s.pos.avg, label: 'Einstieg', cls: 'entry' });
    if (s.pos.stop) levels.push({ v: s.pos.avg * (1 - (dir * s.pos.stop) / 100), label: 'SL', cls: 'sl' });
    if (s.pos.take) levels.push({ v: s.pos.avg * (1 + (dir * s.pos.take) / 100), label: 'TP', cls: 'tp' });
  }
  const vals = [...candles.flatMap((c) => [c.h, c.l]), ...levels.map((l) => l.v)];
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  const span = max - min || max * 0.002;
  min -= span * 0.08;
  max += span * 0.08;
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const x = (i: number) => pad.l + i * slot + slot / 2;
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * h;
  const ticks = [0, 1, 2, 3].map((k) => min + ((max - min) * (k + 0.5)) / 4);
  const hc: Candle | null = hover !== null ? candles[hover] ?? null : null;

  return (
    <div className="tchart tg-candles" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={`Kerzenchart ${s.asset.name}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={pad.l + w} y1={y(t)} y2={y(t)} className="tgrid" />
            {Math.abs(y(t) - y(s.price)) > 14 && <text x={pad.l + w + 6} y={y(t) + 4} className="taxis">{fmt(t)}</text>}
          </g>
        ))}
        {candles.map((c, i) => (i % 12 === 0 ? <text key={`t${i}`} x={x(i)} y={height - 5} className="taxis" textAnchor="middle">{clockLabel(c.m)}</text> : null))}
        {levels.map((l) => (
          <g key={l.label} className={`tg-level ${l.cls}`}>
            <line x1={pad.l} x2={pad.l + w} y1={y(l.v)} y2={y(l.v)} />
          </g>
        ))}
        {candles.map((c, i) => {
          const up = c.c >= c.o;
          const top = y(Math.max(c.o, c.c));
          const bodyH = Math.max(1.5, Math.abs(y(c.o) - y(c.c)));
          return (
            <g key={c.m} className={up ? 'cup' : 'cdown'}>
              <line x1={x(i)} x2={x(i)} y1={y(c.h)} y2={y(c.l)} />
              <rect x={x(i) - 2.5} y={top} width={5} height={bodyH} rx={1} />
            </g>
          );
        })}
        {levels.map((l) => (
          <g key={`t${l.label}`} className={`tg-level ${l.cls}`}>
            <text x={pad.l + 4} y={y(l.v) - 4}>{l.label} {fmt(l.v)}</text>
          </g>
        ))}
        {/* aktueller Kurs */}
        <g className="tg-now">
          <line x1={pad.l} x2={pad.l + w} y1={y(s.price)} y2={y(s.price)} />
          <rect x={pad.l + w + 2} y={y(s.price) - 9} width={pad.r - 4} height={18} rx={4} />
          <text x={pad.l + w + 6} y={y(s.price) + 4}>{fmt(s.price)}</text>
        </g>
        {hover !== null && hc && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + h} className="tcross" />}
        <rect
          x={pad.l}
          y={pad.t}
          width={w}
          height={h}
          fill="transparent"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setHover(Math.max(0, Math.min(candles.length - 1, Math.floor((e.clientX - r.left) / slot))));
          }}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hc && (
        <div className="ttip" style={hover! > candles.length / 2 ? { left: 12 } : { right: pad.r + 8 }}>
          <div className="ttip-date">{clockLabel(hc.m)}–{clockLabel(hc.m + CANDLE_MINUTES)}</div>
          <div className="ttip-row">Eröffnung<b>{fmt(hc.o)}</b></div>
          <div className="ttip-row">Hoch<b>{fmt(hc.h)}</b></div>
          <div className="ttip-row">Tief<b>{fmt(hc.l)}</b></div>
          <div className="ttip-row">Schluss<b>{fmt(hc.c)}</b></div>
        </div>
      )}
    </div>
  );
}
