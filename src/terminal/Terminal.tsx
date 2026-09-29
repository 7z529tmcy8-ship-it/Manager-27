import { useEffect, useMemo, useState } from 'react';
import { ETFS, allSeries, getEtf, type Point } from './data';
import { LineChart, Sparkline, fmt, pct, type Line } from './charts';
import TradingGame from './TradingGame';
import {
  RISK_FREE,
  cagr,
  correlation,
  maxDrawdown,
  periodReturn,
  scores,
  sharpe,
  slice,
  sma,
  smaSeries,
  volatility,
  type Range,
} from './metrics';

type Tab = 'overview' | 'compare' | 'rank' | 'trade';
const DETAIL_RANGES: Range[] = ['1M', '3M', '6M', 'YTD', '1J', '5J', 'MAX'];
const MAX_COMPARE = 4;

const useIsWide = () => {
  const q = '(min-width: 900px)';
  const [wide, setWide] = useState(() => window.matchMedia?.(q).matches ?? false);
  useEffect(() => {
    const m = window.matchMedia?.(q);
    if (!m) return;
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
};

/** Übersichtliche ETF-„Trading-App“ auf der geheimen Seite. Kurse sind simuliert. */
export default function Terminal({ onExit }: { onExit: () => void }) {
  const series = useMemo(() => allSeries(), []);
  const wide = useIsWide();
  const [tab, setTab] = useState<Tab>('overview');
  const [selected, setSelected] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[]>(['EUNL', 'SXR8', 'IS3N']);
  // Auf breiten Bildschirmen ist immer ein ETF rechts geöffnet.
  const detail = selected ?? (wide ? 'EUNL' : null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || tab === 'trade') return;
      if (selected && !wide) setSelected(null);
      else onExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, wide, onExit, tab]);

  const openEtf = (t: string) => {
    setSelected(t);
    setTab('overview');
    window.scrollTo({ top: 0 });
  };

  const showList = tab === 'overview' && (wide || !detail);
  const showDetail = tab === 'overview' && !!detail;

  return (
    <div className="mk">
      <header className="mk-top">
        {tab === 'overview' && !wide && detail ? (
          <button className="mk-link" onClick={() => setSelected(null)}>‹ Märkte</button>
        ) : (
          <button className="mk-link" onClick={onExit}>Schließen</button>
        )}
        <span className="mk-demo" title="Die Kurse sind simuliert und keine echten Marktdaten.">Demo-Kurse</span>
      </header>

      <div className="mk-head">
        <h1>{{ overview: 'Märkte', compare: 'Vergleich', rank: 'Ranking', trade: 'Trading' }[tab]}</h1>
        <p className="mk-date">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <div className="mk-seg" role="tablist">
          {([['overview', 'Übersicht'], ['compare', 'Vergleich'], ['rank', 'Ranking'], ['trade', '🎮 Trading']] as [Tab, string][]).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
      </div>

      <main className={`mk-main ${tab === 'overview' && wide ? 'split' : ''}`}>
        {showList && <Overview series={series} selected={detail} onOpen={openEtf} onPlay={() => setTab('trade')} />}
        {showDetail && <Detail series={series} ticker={detail!} />}
        {tab === 'compare' && <Compare series={series} selected={compare} onChange={setCompare} />}
        {tab === 'rank' && <Ranking series={series} onOpen={openEtf} />}
        {tab === 'trade' && <TradingGame />}
      </main>

      <footer className="mk-foot">
        Kurse simuliert · Stammdaten (ISIN, TER, Fondsgröße) recherchiert 09/2026 · Keine Anlageberatung.
      </footer>
    </div>
  );
}

/** Veränderung als Pille: Pfeil + Vorzeichen, Farbe nur zusätzlich. */
function ChangePill({ v, d = 2, big }: { v: number; d?: number; big?: boolean }) {
  return <span className={`mk-pill ${v >= 0 ? 'up' : 'down'} ${big ? 'big' : ''}`}>{v >= 0 ? '▲' : '▼'} {pct(v, d)}</span>;
}

// ---------- Übersicht ----------
function Overview({ series, selected, onOpen, onPlay }: { series: Record<string, Point[]>; selected: string | null; onOpen: (t: string) => void; onPlay: () => void }) {
  const [q, setQ] = useState('');
  const list = ETFS.filter((e) => `${e.ticker} ${e.name} ${e.index}`.toLowerCase().includes(q.toLowerCase()));
  const movers = [...ETFS].map((e) => ({ e, d: periodReturn(series[e.ticker], '1T') })).sort((a, b) => b.d - a.d);
  const best = movers[0];
  const worst = movers[movers.length - 1];
  return (
    <section className="mk-list">
      <button className="mk-card mk-play" onClick={onPlay}>
        <span className="mk-play-icon" aria-hidden="true">🎮</span>
        <span className="grow">
          <strong>Day-Trading spielen</strong>
          <small>Ein Börsentag im Zeitraffer – kaufen, shorten, Gewinne mitnehmen. 10.000 € Spielgeld.</small>
        </span>
        <span className="mk-play-go">Los ›</span>
      </button>
      <div className="mk-movers">
        <button className="mk-card mover" onClick={() => onOpen(best.e.ticker)}>
          <span className="mk-label">Top heute</span>
          <strong>{best.e.ticker}</strong>
          <ChangePill v={best.d} />
        </button>
        <button className="mk-card mover" onClick={() => onOpen(worst.e.ticker)}>
          <span className="mk-label">Flop heute</span>
          <strong>{worst.e.ticker}</strong>
          <ChangePill v={worst.d} />
        </button>
      </div>
      <input className="mk-search" type="search" placeholder="Suchen: Name, Ticker, Index" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="mk-rows">
        {list.map((e) => {
          const s = series[e.ticker];
          return (
            <li key={e.ticker}>
              <button className={`mk-row ${selected === e.ticker ? 'sel' : ''}`} onClick={() => onOpen(e.ticker)}>
                <span className="mk-row-name">
                  <strong>{e.ticker}</strong>
                  <small>{e.name}</small>
                </span>
                <Sparkline points={slice(s, '3M')} width={72} height={28} />
                <span className="mk-row-price">
                  <strong>{fmt(s[s.length - 1].p)}</strong>
                  <ChangePill v={periodReturn(s, '1T')} />
                </span>
              </button>
            </li>
          );
        })}
        {!list.length && <li className="mk-empty">Kein ETF gefunden.</li>}
      </ul>
    </section>
  );
}

// ---------- Detail ----------
function Detail({ series, ticker }: { series: Record<string, Point[]>; ticker: string }) {
  const [range, setRange] = useState<Range>('1J');
  const [show50, setShow50] = useState(false);
  const [show200, setShow200] = useState(false);
  const s = series[ticker];
  const e = getEtf(ticker)!;
  const from = s.length - slice(s, range).length;
  const part = s.slice(from);
  const last = s[s.length - 1].p;
  const lines: Line[] = [{ id: 'p', label: 'Kurs', slot: 1, values: part.map((p) => p.p) }];
  if (show50) lines.push({ id: 's50', label: 'Ø 50 Tage', slot: 2, values: smaSeries(s, 50).slice(from) });
  if (show200) lines.push({ id: 's200', label: 'Ø 200 Tage', slot: 3, values: smaSeries(s, 200).slice(from) });
  const rangeLabel: Record<Range, string> = { '1M': '1 Monat', '3M': '3 Monate', '6M': '6 Monate', YTD: 'seit Jahresbeginn', '1J': '1 Jahr', '3J': '3 Jahre', '5J': '5 Jahre', MAX: 'seit 2019' };
  const avgs: [string, number][] = [['20 Tage', sma(s, 20)], ['50 Tage', sma(s, 50)], ['100 Tage', sma(s, 100)], ['200 Tage', sma(s, 200)]];
  const rets: [string, number][] = [['1 Woche', periodReturn(s, '1W')], ['1 Monat', periodReturn(s, '1M')], ['3 Monate', periodReturn(s, '3M')], ['6 Monate', periodReturn(s, '6M')], ['YTD', periodReturn(s, 'YTD')], ['1 Jahr', periodReturn(s, '1J')]];

  return (
    <section className="mk-detail" key={ticker}>
      <p className="mk-sub">{e.ticker} · {e.index}</p>
      <h2 className="mk-name">{e.name}</h2>
      <div className="mk-price">
        <span className="mk-big">{fmt(last)} €</span>
        <ChangePill v={periodReturn(s, range)} big />
        <span className="mk-muted">{rangeLabel[range]}</span>
      </div>

      <div className="mk-card chart">
        <LineChart times={part.map((p) => p.t)} lines={lines} height={260} area />
        <div className="mk-range" role="radiogroup" aria-label="Zeitraum">
          {DETAIL_RANGES.map((r) => (
            <button key={r} role="radio" aria-checked={range === r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>{r === 'MAX' ? 'Max' : r}</button>
          ))}
        </div>
        <div className="mk-toggles">
          <button className={show50 ? 'on s2' : ''} aria-pressed={show50} onClick={() => setShow50(!show50)}>Ø 50 Tage</button>
          <button className={show200 ? 'on s3' : ''} aria-pressed={show200} onClick={() => setShow200(!show200)}>Ø 200 Tage</button>
        </div>
      </div>

      <div className="mk-cards">
        <div className="mk-card">
          <h3>Rendite</h3>
          <div className="mk-tiles">
            {rets.map(([k, v]) => (
              <div key={k}><span className="mk-label">{k}</span><ChangePill v={v} d={1} /></div>
            ))}
            <div><span className="mk-label">Ø p. a. 3 J.</span><strong>{pct(cagr(s, 3))}</strong></div>
            <div><span className="mk-label">Ø p. a. 5 J.</span><strong>{pct(cagr(s, 5))}</strong></div>
          </div>
        </div>

        <div className="mk-card">
          <h3>Gleitende Durchschnitte</h3>
          <ul className="mk-kv">
            {avgs.map(([k, v]) => (
              <li key={k}><span>Ø {k}</span><span className="mk-kv-v">{fmt(v)} <small className={last >= v ? 'up' : 'down'}>{last >= v ? 'Kurs darüber' : 'Kurs darunter'}</small></span></li>
            ))}
          </ul>
          <p className="mk-hint">{sma(s, 50) > sma(s, 200) ? 'Ø 50 liegt über Ø 200 – das gilt vielen als Aufwärtstrend.' : 'Ø 50 liegt unter Ø 200 – das gilt vielen als Abwärtstrend.'}</p>
        </div>

        <div className="mk-card">
          <h3>Risiko</h3>
          <ul className="mk-kv">
            <li><span>Schwankung (1 J.)</span><span className="mk-kv-v">{fmt(volatility(s) * 100, 1)} %</span></li>
            <li><span>Größter Verlust (5 J.)</span><span className="mk-kv-v">{pct(maxDrawdown(slice(s, '5J')))}</span></li>
            <li><span>Sharpe (1 J., Zins {fmt(RISK_FREE * 100, 0)} %)</span><span className="mk-kv-v">{fmt(sharpe(s))}</span></li>
          </ul>
        </div>

        <div className="mk-card">
          <h3>Über den ETF</h3>
          <ul className="mk-kv">
            <li><span>Index</span><span className="mk-kv-v">{e.index}</span></li>
            <li><span>Kosten (TER)</span><span className="mk-kv-v">{fmt(e.ter)} % p. a.</span></li>
            <li><span>Fondsgröße</span><span className="mk-kv-v">{e.aum ? `${fmt(e.aum / 1000, 1)} Mrd. €` : 'nicht geprüft'}</span></li>
            <li><span>Region</span><span className="mk-kv-v">{e.category}</span></li>
            <li><span>Erträge</span><span className="mk-kv-v">thesaurierend</span></li>
            <li><span>ISIN</span><span className="mk-kv-v mono">{e.isin}</span></li>
          </ul>
          {e.note && <p className="mk-hint warn">⚠ {e.note}</p>}
        </div>
      </div>
    </section>
  );
}

// ---------- Vergleich ----------
function Compare({ series, selected, onChange }: { series: Record<string, Point[]>; selected: string[]; onChange: (s: string[]) => void }) {
  const [range, setRange] = useState<Range>('1J');
  // Farbe folgt dem ETF, nicht seiner Position – beim Abwählen behalten die anderen ihre Farbe.
  const [slots, setSlots] = useState<Record<string, number>>(() => Object.fromEntries(selected.map((t, i) => [t, i + 1])));
  const slotOf = (t: string) => slots[t] ?? 1;
  const toggle = (t: string) => {
    if (selected.includes(t)) return onChange(selected.filter((x) => x !== t));
    if (selected.length >= MAX_COMPARE) return;
    const used = new Set(selected.map(slotOf));
    setSlots({ ...slots, [t]: [1, 2, 3, 4].find((k) => !used.has(k)) ?? 1 });
    onChange([...selected, t]);
  };
  const times = selected.length ? slice(series[selected[0]], range).map((p) => p.t) : [];
  const lines: Line[] = selected.map((t) => {
    const part = slice(series[t], range);
    return { id: t, label: t, slot: slotOf(t), values: part.map((p) => (p.p / part[0].p) * 100) };
  });
  const pairs: [string, string, number][] = [];
  for (let i = 0; i < selected.length; i++) for (let j = i + 1; j < selected.length; j++) {
    pairs.push([selected[i], selected[j], correlation(series[selected[i]], series[selected[j]])]);
  }

  return (
    <section className="mk-compare">
      <p className="mk-hint">Bis zu {MAX_COMPARE} ETFs wählen. Alle starten bei 100 – so sieht man direkt, wer besser gelaufen ist.</p>
      <div className="mk-chips">
        {ETFS.map((e) => {
          const on = selected.includes(e.ticker);
          return (
            <button key={e.ticker} className={on ? `on s${slotOf(e.ticker)}` : ''} aria-pressed={on} disabled={!on && selected.length >= MAX_COMPARE} onClick={() => toggle(e.ticker)}>
              {e.ticker}
            </button>
          );
        })}
      </div>
      <div className="mk-card chart">
        {lines.length ? <LineChart times={times} lines={lines} height={280} baseline={100} format={(v) => fmt(v, 0)} /> : <p className="mk-hint">Wähle oben mindestens einen ETF.</p>}
        <div className="mk-range" role="radiogroup" aria-label="Zeitraum">
          {DETAIL_RANGES.map((r) => (
            <button key={r} role="radio" aria-checked={range === r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>{r === 'MAX' ? 'Max' : r}</button>
          ))}
        </div>
      </div>
      {selected.length > 0 && (
        <div className="mk-card">
          <div className="mk-scroll">
            <table className="mk-table">
              <thead><tr><th>ETF</th><th>Zeitraum</th><th>Ø p. a. 5 J.</th><th>Schwankung</th><th>Größter Verlust</th><th>Kosten</th></tr></thead>
              <tbody>
                {selected.map((t) => {
                  const s = series[t];
                  return (
                    <tr key={t}>
                      <td><i className={`mk-sw s${slotOf(t)}`} />{t}</td>
                      <td><ChangePill v={periodReturn(s, range)} d={1} /></td>
                      <td>{pct(cagr(s, 5))}</td>
                      <td>{fmt(volatility(s) * 100, 1)} %</td>
                      <td>{pct(maxDrawdown(slice(s, '5J')))}</td>
                      <td>{fmt(getEtf(t)!.ter)} %</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pairs.length > 0 && (
            <ul className="mk-kv sim">
              {pairs.map(([a, b, c]) => (
                <li key={a + b}><span>{a} & {b}</span><span className="mk-kv-v">laufen zu {Math.round(c * 100)} % gleich</span></li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

// ---------- Ranking ----------
function Ranking({ series, onOpen }: { series: Record<string, Point[]>; onOpen: (t: string) => void }) {
  const list = scores(series);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="mk-rank">
      <p className="mk-hint">
        Punkte von 0 bis 100 aus Kosten (25 %), Rendite 3 J. (25 %), Schwankung (20 %), größtem Verlust (15 %) und Streuung (15 %).
        Rendite und Risiko stammen aus den Demo-Kursen – eine Rechenübung, keine Empfehlung.
      </p>
      <ol className="mk-rows">
        {list.map((x, i) => {
          const e = getEtf(x.ticker)!;
          const isOpen = open === x.ticker;
          return (
            <li key={x.ticker}>
              <button className="mk-row rank" onClick={() => setOpen(isOpen ? null : x.ticker)} aria-expanded={isOpen}>
                <span className="mk-rank-pos">{i + 1}</span>
                <span className="mk-row-name"><strong>{x.ticker}</strong><small>{e.name}</small></span>
                <span className="mk-bar" aria-hidden="true"><span style={{ width: `${x.total}%` }} /></span>
                <span className="mk-score">{x.total}</span>
                <span className={`mk-grade g${x.grade}`}>{x.grade}</span>
              </button>
              {isOpen && (
                <div className="mk-rank-detail">
                  {x.parts.map((p) => (
                    <div key={p.label}>
                      <span>{p.label} <small>{fmt(p.weight * 100, 0)} %</small></span>
                      <span className="mk-bar small" aria-hidden="true"><span style={{ width: `${p.value}%` }} /></span>
                      <strong>{p.value}</strong>
                      <small className="mk-muted">{p.raw}</small>
                    </div>
                  ))}
                  <button className="mk-link" onClick={() => onOpen(x.ticker)}>Details ansehen ›</button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
