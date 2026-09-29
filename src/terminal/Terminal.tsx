import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ETFS, allSeries, getEtf, type Point } from './data';
import { Change, LineChart, Sparkline, fmt, pct, type Line } from './charts';
import {
  RANGES,
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

type View = 'MARKT' | 'CHART' | 'VERGL' | 'RANK' | 'KORR';
const VIEWS: { id: View; key: string; label: string }[] = [
  { id: 'MARKT', key: 'F1', label: 'Markt' },
  { id: 'CHART', key: 'F2', label: 'Chart' },
  { id: 'VERGL', key: 'F3', label: 'Vergleich' },
  { id: 'RANK', key: 'F4', label: 'Ranking' },
  { id: 'KORR', key: 'F5', label: 'Korrelation' },
];
const MAX_COMPARE = 4;

/** Das „Larp-Terminal“: ETF-Überblick im Stil professioneller Finanzterminals. Kurse sind simuliert. */
export default function Terminal({ onExit }: { onExit: () => void }) {
  const series = useMemo(() => allSeries(), []);
  const [view, setView] = useState<View>('MARKT');
  const [ticker, setTicker] = useState('EUNL');
  const [range, setRange] = useState<Range>('1J');
  const [compare, setCompare] = useState<string[]>(['EUNL', 'SXR8', 'IS3N']);
  const [msg, setMsg] = useState('Willkommen. Tippe HELP für Befehle.');

  // Funktionstasten wie im echten Terminal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const v = VIEWS.find((x) => x.key === e.key);
      if (v) {
        e.preventDefault();
        setView(v.id);
      }
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  const open = (t: string) => {
    setTicker(t);
    setView('CHART');
  };

  const run = (raw: string) => {
    const words = raw.trim().toUpperCase().split(/\s+/).filter(Boolean);
    if (!words.length) return;
    const tickers = words.filter((w) => getEtf(w));
    const cmd = words.find((w) => !getEtf(w) && w !== 'GO' && w !== '<GO>');
    if (cmd === 'HELP' || cmd === 'HILFE') {
      setMsg('Befehle: <TICKER> (Chart) · <T1> <T2> COMP (Vergleich) · MARKT · RANK · KORR · EXIT · F1–F5 · Ticker: ' + ETFS.map((e) => e.ticker).join(' '));
      return;
    }
    if (cmd === 'EXIT' || cmd === 'QUIT') return onExit();
    if (cmd === 'COMP' || cmd === 'VERGL') {
      if (tickers.length) setCompare(tickers.slice(0, MAX_COMPARE));
      setView('VERGL');
      setMsg(`Vergleich: ${(tickers.length ? tickers : compare).slice(0, MAX_COMPARE).join(' · ')}`);
      return;
    }
    const viewCmd = VIEWS.find((v) => v.id === cmd || v.label.toUpperCase() === cmd);
    if (viewCmd) {
      setView(viewCmd.id);
      setMsg(`${viewCmd.label} geöffnet.`);
      return;
    }
    if (tickers.length === 1 && !cmd) {
      open(tickers[0]);
      setMsg(`${tickers[0]} ‹GO› – ${getEtf(tickers[0])!.name}`);
      return;
    }
    setMsg(`Unbekannter Befehl „${raw.trim()}“. Tippe HELP.`);
  };

  return (
    <div className="term">
      <header className="term-top">
        <span className="term-brand">LARP<span>TERMINAL</span></span>
        <span className="term-demo" title="Die Kurse sind simuliert und keine echten Marktdaten.">DEMO-DATEN</span>
        <Clock />
        <button className="term-exit" onClick={onExit}>EXIT</button>
      </header>
      <Tape series={series} onPick={open} />
      <CommandLine onRun={run} msg={msg} />
      <nav className="term-keys" aria-label="Ansichten">
        {VIEWS.map((v) => (
          <button key={v.id} className={view === v.id ? 'on' : ''} onClick={() => setView(v.id)}>
            <b>{v.key}</b> {v.label}
          </button>
        ))}
      </nav>

      <main className="term-main">
        {view === 'MARKT' && <MarketView series={series} ticker={ticker} onPick={setTicker} onOpen={open} />}
        {view === 'CHART' && <ChartView series={series} ticker={ticker} range={range} onRange={setRange} onPick={setTicker} />}
        {view === 'VERGL' && <CompareView series={series} selected={compare} onChange={setCompare} range={range} onRange={setRange} />}
        {view === 'RANK' && <RankView series={series} onOpen={open} />}
        {view === 'KORR' && <CorrelationView series={series} />}
      </main>

      <footer className="term-foot">
        Kurse simuliert (Marktmodell) · Stammdaten (TER, Fondsgröße) recherchiert 09/2026 · Keine Anlageberatung, keine Kauf- oder Verkaufsempfehlung.
      </footer>
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  // Xetra-Handelszeit (9:00–17:30, Mo–Fr, Ortszeit) – nur als Anzeige.
  const open = day >= 1 && day <= 5 && mins >= 540 && mins < 1050;
  return (
    <span className="term-clock">
      <span className={`term-mkt ${open ? 'open' : ''}`}>{open ? '● XETRA OFFEN' : '○ XETRA ZU'}</span>
      {now.toLocaleDateString('de-DE')} {now.toLocaleTimeString('de-DE')}
    </span>
  );
}

function Tape({ series, onPick }: { series: Record<string, Point[]>; onPick: (t: string) => void }) {
  const items = ETFS.map((e) => {
    const s = series[e.ticker];
    return { t: e.ticker, p: s[s.length - 1].p, d: periodReturn(s, '1T') };
  });
  const row = (k: string) => items.map((i) => (
    <button key={k + i.t} className="tape-item" onClick={() => onPick(i.t)} tabIndex={k === 'b' ? -1 : 0}>
      <b>{i.t}</b> {fmt(i.p)} <Change v={i.d} d={2} />
    </button>
  ));
  return (
    <div className="term-tape" aria-label="Kursband">
      <div className="tape-track">
        {row('a')}
        <span aria-hidden="true" className="tape-dup">{row('b')}</span>
      </div>
    </div>
  );
}

function CommandLine({ onRun, msg }: { onRun: (s: string) => void; msg: string }) {
  const [v, setV] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onRun(v);
    setV('');
  };
  return (
    <form className="term-cmd" onSubmit={submit} onClick={() => ref.current?.focus()}>
      <span className="term-prompt">›</span>
      <input
        ref={ref}
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Ticker oder Befehl, z. B. SXR8 · EUNL IS3N COMP · HELP"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Befehlszeile"
      />
      <button type="submit" className="term-go">GO</button>
      <div className="term-msg" aria-live="polite">{msg}</div>
    </form>
  );
}

function Panel({ title, right, children, className = '' }: { title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`tpanel ${className}`}>
      <header><h2>{title}</h2>{right}</header>
      <div className="tpanel-body">{children}</div>
    </section>
  );
}

function RangeBar({ range, onRange }: { range: Range; onRange: (r: Range) => void }) {
  return (
    <div className="trange" role="radiogroup" aria-label="Zeitraum">
      {RANGES.map((r) => (
        <button key={r} role="radio" aria-checked={range === r} className={range === r ? 'on' : ''} onClick={() => onRange(r)}>{r}</button>
      ))}
    </div>
  );
}

// ---------- F1 Markt ----------
function MarketView({ series, ticker, onPick, onOpen }: { series: Record<string, Point[]>; ticker: string; onPick: (t: string) => void; onOpen: (t: string) => void }) {
  const s = series[ticker];
  const e = getEtf(ticker)!;
  const part = slice(s, '1J');
  return (
    <div className="term-grid market">
      <Panel title="Watchlist · ETFs" className="wide">
        <div className="tscroll">
          <table className="ttable">
            <thead>
              <tr><th className="l">Ticker</th><th className="l nm">Name</th><th>Kurs</th><th>1T</th><th>1M</th><th>YTD</th><th>1J</th><th>3J p. a.</th><th>TER</th><th className="l">1J-Verlauf</th></tr>
            </thead>
            <tbody>
              {ETFS.map((x) => {
                const xs = series[x.ticker];
                return (
                  <tr key={x.ticker} className={x.ticker === ticker ? 'sel' : ''} onClick={() => onPick(x.ticker)} onDoubleClick={() => onOpen(x.ticker)}>
                    <td className="l tk">{x.ticker}</td>
                    <td className="l nm">{x.name}</td>
                    <td>{fmt(xs[xs.length - 1].p)}</td>
                    <td><Change v={periodReturn(xs, '1T')} d={2} /></td>
                    <td><Change v={periodReturn(xs, '1M')} /></td>
                    <td><Change v={periodReturn(xs, 'YTD')} /></td>
                    <td><Change v={periodReturn(xs, '1J')} /></td>
                    <td>{pct(cagr(xs, 3))}</td>
                    <td>{fmt(x.ter)} %</td>
                    <td className="l"><Sparkline points={slice(xs, '1J')} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="thint">Zeile antippen = auswählen · doppelt = Chart öffnen</p>
      </Panel>
      <Panel title={`${e.ticker} · ${e.name}`} right={<button className="tlink" onClick={() => onOpen(ticker)}>Chart ›</button>}>
        <LineChart times={part.map((p) => p.t)} lines={[{ id: 'p', label: e.ticker, slot: 1, values: part.map((p) => p.p) }]} height={220} />
        <KeyStats s={s} />
      </Panel>
    </div>
  );
}

function KeyStats({ s }: { s: Point[] }) {
  const last = s[s.length - 1].p;
  const rows: [string, React.ReactNode][] = [
    ['Letzter Kurs', fmt(last)],
    ['Volatilität 1J', pct(volatility(s)).replace('+', '')],
    [`Sharpe 1J (rf ${fmt(RISK_FREE * 100, 0)} %)`, fmt(sharpe(s))],
    ['Max. Verlust 5J', pct(maxDrawdown(slice(s, '5J')))],
  ];
  return (
    <dl className="tstats">
      {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}

// ---------- F2 Chart ----------
function ChartView({ series, ticker, range, onRange, onPick }: { series: Record<string, Point[]>; ticker: string; range: Range; onRange: (r: Range) => void; onPick: (t: string) => void }) {
  const [show50, setShow50] = useState(true);
  const [show200, setShow200] = useState(true);
  const s = series[ticker];
  const e = getEtf(ticker)!;
  const from = s.length - slice(s, range).length;
  const s50 = smaSeries(s, 50).slice(from);
  const s200 = smaSeries(s, 200).slice(from);
  const part = s.slice(from);
  const lines: Line[] = [{ id: 'p', label: 'Kurs', slot: 1, values: part.map((p) => p.p) }];
  if (show50) lines.push({ id: 's50', label: 'Ø 50 Tage', slot: 2, values: s50 });
  if (show200) lines.push({ id: 's200', label: 'Ø 200 Tage', slot: 3, values: s200 });
  const last = s[s.length - 1].p;

  const avgs: [string, number][] = [['Ø 20 Tage', sma(s, 20)], ['Ø 50 Tage', sma(s, 50)], ['Ø 100 Tage', sma(s, 100)], ['Ø 200 Tage', sma(s, 200)]];
  const rets: [string, number][] = [['1 Woche', periodReturn(s, '1W')], ['1 Monat', periodReturn(s, '1M')], ['3 Monate', periodReturn(s, '3M')], ['6 Monate', periodReturn(s, '6M')], ['YTD', periodReturn(s, 'YTD')], ['1 Jahr', periodReturn(s, '1J')]];
  const trend = sma(s, 50) > sma(s, 200) ? 'Ø50 über Ø200 („Golden Cross“-Lage)' : 'Ø50 unter Ø200 („Death Cross“-Lage)';

  return (
    <div className="term-grid chart">
      <Panel
        title={`${e.ticker} · ${e.name}`}
        className="wide"
        right={
          <select className="tselect" value={ticker} onChange={(ev) => onPick(ev.target.value)} aria-label="ETF wählen">
            {ETFS.map((x) => <option key={x.ticker} value={x.ticker}>{x.ticker}</option>)}
          </select>
        }
      >
        <div className="tchart-controls">
          <RangeBar range={range} onRange={onRange} />
          <div className="ttoggles">
            <label><input type="checkbox" checked={show50} onChange={() => setShow50(!show50)} /> Ø 50</label>
            <label><input type="checkbox" checked={show200} onChange={() => setShow200(!show200)} /> Ø 200</label>
          </div>
        </div>
        <LineChart times={part.map((p) => p.t)} lines={lines} height={340} />
        <p className="thint">Zeitraum-Rendite {range}: <Change v={periodReturn(s, range)} /> · {trend}</p>
      </Panel>

      <Panel title="Gleitende Durchschnitte">
        <table className="ttable compact">
          <tbody>
            {avgs.map(([k, v]) => (
              <tr key={k}><td className="l">{k}</td><td>{fmt(v)}</td><td><Change v={last / v - 1} /></td></tr>
            ))}
          </tbody>
        </table>
        <p className="thint">Rechte Spalte: Abstand des Kurses zum Durchschnitt.</p>
      </Panel>

      <Panel title="Rendite je Zeitraum">
        <table className="ttable compact">
          <tbody>
            {rets.map(([k, v]) => <tr key={k}><td className="l">{k}</td><td><Change v={v} /></td></tr>)}
            <tr><td className="l">Ø p. a. 3 Jahre</td><td>{pct(cagr(s, 3))}</td></tr>
            <tr><td className="l">Ø p. a. 5 Jahre</td><td>{pct(cagr(s, 5))}</td></tr>
          </tbody>
        </table>
      </Panel>

      <Panel title="Stammdaten">
        <dl className="tstats">
          <div><dt>ISIN</dt><dd>{e.isin}</dd></div>
          <div><dt>Index</dt><dd>{e.index}</dd></div>
          <div><dt>TER</dt><dd>{fmt(e.ter)} % p. a.</dd></div>
          <div><dt>Fondsgröße</dt><dd>{e.aum ? `${fmt(e.aum / 1000, 1)} Mrd. €` : 'n. v.'}</dd></div>
          <div><dt>Kategorie</dt><dd>{e.category}</dd></div>
          <div><dt>Ertrag</dt><dd>thesaurierend</dd></div>
        </dl>
        {e.note && <p className="thint warn">⚠ {e.note}</p>}
        <KeyStats s={s} />
      </Panel>
    </div>
  );
}

// ---------- F3 Vergleich ----------
function CompareView({ series, selected, onChange, range, onRange }: { series: Record<string, Point[]>; selected: string[]; onChange: (s: string[]) => void; range: Range; onRange: (r: Range) => void }) {
  // Farbe folgt der Reihenfolge in der Liste (Slot 1–4), nicht dem Rang – beim Abwählen behalten die anderen ihre Farbe.
  const [slots, setSlots] = useState<Record<string, number>>(() => Object.fromEntries(selected.map((t, i) => [t, i + 1])));
  const toggle = (t: string) => {
    if (selected.includes(t)) {
      onChange(selected.filter((x) => x !== t));
      return;
    }
    if (selected.length >= MAX_COMPARE) return;
    const used = new Set(selected.map((x) => slots[x]));
    const free = [1, 2, 3, 4].find((k) => !used.has(k)) ?? 1;
    setSlots({ ...slots, [t]: free });
    onChange([...selected, t]);
  };
  const slotOf = (t: string) => slots[t] ?? selected.indexOf(t) + 1;
  const base = selected.length ? slice(series[selected[0]], range) : [];
  const times = base.map((p) => p.t);
  const lines: Line[] = selected.map((t) => {
    const part = slice(series[t], range);
    const b = part[0].p;
    return { id: t, label: t, slot: slotOf(t), values: part.map((p) => (p.p / b) * 100) };
  });

  return (
    <div className="term-grid compare">
      <Panel title="Vergleich · indexiert (Start = 100)" className="wide" right={<RangeBar range={range} onRange={onRange} />}>
        <div className="tchips">
          {ETFS.map((e) => {
            const on = selected.includes(e.ticker);
            return (
              <button key={e.ticker} className={on ? 'on' : ''} aria-pressed={on} disabled={!on && selected.length >= MAX_COMPARE} onClick={() => toggle(e.ticker)}>
                {on && <i className={`sw s${slotOf(e.ticker)}`} />}{e.ticker}
              </button>
            );
          })}
        </div>
        {lines.length ? <LineChart times={times} lines={lines} height={320} baseline={100} format={(v) => fmt(v, 0)} /> : <p className="thint">Bis zu {MAX_COMPARE} ETFs auswählen.</p>}
      </Panel>
      <Panel title="Kennzahlen im Vergleich" className="wide">
        <div className="tscroll">
          <table className="ttable">
            <thead><tr><th className="l">Ticker</th><th>{range}</th><th>1J</th><th>3J p. a.</th><th>5J p. a.</th><th>Vola 1J</th><th>Max. Verl. 5J</th><th>Sharpe</th><th>TER</th></tr></thead>
            <tbody>
              {selected.map((t) => {
                const s = series[t];
                return (
                  <tr key={t}>
                    <td className="l tk"><i className={`sw s${slotOf(t)}`} />{t}</td>
                    <td><Change v={periodReturn(s, range)} /></td>
                    <td><Change v={periodReturn(s, '1J')} /></td>
                    <td>{pct(cagr(s, 3))}</td>
                    <td>{pct(cagr(s, 5))}</td>
                    <td>{fmt(volatility(s) * 100, 1)} %</td>
                    <td>{pct(maxDrawdown(slice(s, '5J')))}</td>
                    <td>{fmt(sharpe(s))}</td>
                    <td>{fmt(getEtf(t)!.ter)} %</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

// ---------- F4 Ranking ----------
function RankView({ series, onOpen }: { series: Record<string, Point[]>; onOpen: (t: string) => void }) {
  const list = scores(series);
  const [open, setOpen] = useState<string | null>(list[0]?.ticker ?? null);
  return (
    <div className="term-grid rank">
      <Panel title="Scorecard · regelbasierte Bewertung (0–100)" className="wide">
        <p className="thint">
          Gewichtung: Kosten 25 % · Rendite 3J 25 % · Schwankung 20 % · Max. Verlust 15 % · Streuung 15 %. Jede Kennzahl wird
          innerhalb dieser Liste eingeordnet (bester Wert = 100). Rendite und Risiko stammen aus den simulierten Kursen.
          Das ist eine Rechenübung, keine Empfehlung.
        </p>
        <ol className="trank">
          {list.map((x, i) => {
            const e = getEtf(x.ticker)!;
            const isOpen = open === x.ticker;
            return (
              <li key={x.ticker}>
                <button className="trank-row" onClick={() => setOpen(isOpen ? null : x.ticker)} aria-expanded={isOpen}>
                  <span className="trank-pos">{i + 1}</span>
                  <span className="tk">{x.ticker}</span>
                  <span className="nm">{e.name}</span>
                  <span className="trank-bar" aria-hidden="true"><span style={{ width: `${x.total}%` }} /></span>
                  <span className="trank-score">{x.total}</span>
                  <span className={`trank-grade g${x.grade}`}>{x.grade}</span>
                </button>
                {isOpen && (
                  <div className="trank-detail">
                    {x.parts.map((p) => (
                      <div key={p.label} className="trank-part">
                        <span>{p.label} <small>({fmt(p.weight * 100, 0)} %)</small></span>
                        <span className="trank-bar small" aria-hidden="true"><span style={{ width: `${p.value}%` }} /></span>
                        <b>{p.value}</b>
                        <small className="raw">{p.raw}</small>
                      </div>
                    ))}
                    <button className="tlink" onClick={() => onOpen(x.ticker)}>Chart öffnen ›</button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </Panel>
    </div>
  );
}

// ---------- F5 Korrelation ----------
function CorrelationView({ series }: { series: Record<string, Point[]> }) {
  const [hover, setHover] = useState<[string, string, number] | null>(null);
  const ts = ETFS.map((e) => e.ticker);
  const m = ts.map((a) => ts.map((b) => (a === b ? 1 : correlation(series[a], series[b]))));
  // Divergierend: negativ = blau, 0 = neutral grau, positiv = rot.
  const color = (v: number) => {
    const k = Math.min(1, Math.abs(v));
    const [r0, g0, b0] = [0x38, 0x38, 0x35];
    const [r1, g1, b1] = v >= 0 ? [0xe6, 0x67, 0x67] : [0x39, 0x87, 0xe5];
    const mix = (a: number, b: number) => Math.round(a + (b - a) * k);
    return `rgb(${mix(r0, r1)},${mix(g0, g1)},${mix(b0, b1)})`;
  };
  return (
    <div className="term-grid korr">
      <Panel title="Korrelation der Tagesrenditen · 1 Jahr" className="wide">
        <div className="tscroll">
          <table className="tcorr">
            <thead><tr><th />{ts.map((t) => <th key={t}>{t}</th>)}</tr></thead>
            <tbody>
              {ts.map((a, i) => (
                <tr key={a}>
                  <th>{a}</th>
                  {ts.map((b, j) => (
                    <td
                      key={b}
                      style={{ background: color(m[i][j]) }}
                      onPointerEnter={() => setHover([a, b, m[i][j]])}
                      onPointerLeave={() => setHover(null)}
                      title={`${a} ↔ ${b}: ${fmt(m[i][j])}`}
                    >
                      {fmt(m[i][j])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tcorr-legend">
          <span>−1</span><i style={{ background: `linear-gradient(90deg, ${color(-1)}, ${color(0)}, ${color(1)})` }} /><span>+1</span>
          <span className="thint">{hover ? `${hover[0]} ↔ ${hover[1]}: ${fmt(hover[2])}` : '1 = laufen völlig gleich · 0 = unabhängig · −1 = entgegengesetzt'}</span>
        </div>
        <p className="thint">Hohe Werte heißen: Die ETFs schwanken fast gleich – zusammen bringen sie wenig zusätzliche Streuung.</p>
      </Panel>
    </div>
  );
}
