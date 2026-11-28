import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import { analyze, applyExperiment, clubLabel, futureSeasons, listFutures, runFuture, summarize, type Experiment, type Future, type FutureFilter, type FutureSort, type Summary } from '../game/multiverse';
import { LOAD_STEPS, STYLE_NAME, type TransferStyle } from '../game/autosim';
import { LOAD_INFO } from '../game/drill';
import { bossClubs, bossLeagues } from '../game/boss';
import { clubLeagueId, currentClubId } from '../game/player';
import { play } from '../sound';
import type { Career, StageLoad } from '../game/types';

const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
const pct = (p: number) => `${Math.round(p * 100)} %`;
const num = (v: number, d = 1) => v.toLocaleString('de-DE', { maximumFractionDigits: d });

type Tab = 'lab' | 'exp' | 'duel';
interface Job { label: string; start: Career; style: TransferStyle }
interface Result { label: string; futures: Future[] }

/** Multiversum-Labor: viele parallele Zukünfte simulieren, vergleichen, durchsuchen und übernehmen. */
export default function Multiverse({ career, onAdopt, onClose }: { career: Career; onAdopt: (c: Career) => void; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('lab');
  const [n, setN] = useState(30);
  const [seasons, setSeasons] = useState(5);
  const [toEnd, setToEnd] = useState(false);
  const [style, setStyle] = useState<TransferStyle>(career.transferStyle ?? 1);
  // Experiment
  const p = career.player;
  const [exp, setExp] = useState<Experiment>({ ovr: p.ovr, pot: p.potential, clubId: currentClubId(p), load: career.autoLoad ?? 'normal' });
  // Läufe
  const [results, setResults] = useState<Record<Tab, Result[]>>({ lab: [], exp: [], duel: [] });
  const [running, setRunning] = useState<{ tab: Tab; done: number; total: number } | null>(null);
  const [detail, setDetail] = useState<{ f: Future; label: string } | null>(null);
  const stop = useRef(false);
  useEffect(() => () => { stop.current = true; }, []);

  const run = (forTab: Tab, jobs: Job[]) => {
    stop.current = false;
    const out: Result[] = jobs.map((j) => ({ label: j.label, futures: [] }));
    setResults((r) => ({ ...r, [forTab]: out.map((x) => ({ ...x })) }));
    const total = jobs.length * n;
    setRunning({ tab: forTab, done: 0, total });
    sfx('whistle');
    let k = 0;
    const step = () => {
      if (stop.current) { setRunning(null); return; }
      const until = performance.now() + 40;
      while (k < total && performance.now() < until) {
        const j = Math.floor(k / n), i = k % n;
        out[j].futures.push(runFuture(jobs[j].start, toEnd ? 'end' : seasons, jobs[j].style, i));
        k++;
      }
      setResults((r) => ({ ...r, [forTab]: out.map((x) => ({ label: x.label, futures: [...x.futures] })) }));
      setRunning({ tab: forTab, done: k, total });
      if (k < total) setTimeout(step, 0);
      else { setRunning(null); sfx('levelUp'); }
    };
    setTimeout(step, 30);
  };
  const busy = running !== null;
  const adopt = (f: Future, label: string) => {
    const warn = label === 'Experiment' ? ' Achtung: Die Experiment-Änderungen (Wertung, Verein …) werden mit übernommen.' : '';
    if (window.confirm(`Diese Zeitlinie übernehmen? Dein Spielstand springt in diese Zukunft – das lässt sich nicht rückgängig machen.${warn}`)) { sfx('jackpot'); onAdopt(f.career); }
  };

  return (
    <div className="overlay mv" role="dialog" aria-modal="true" aria-label="Multiversum-Labor">
      <header className="mv-head">
        <div><small>Entwickler-Modus</small><b>Multiversum-Labor</b></div>
        <button className="hf-x" onClick={() => { stop.current = true; onClose(); }} aria-label="Schließen"><Icon name="close" size={20} /></button>
      </header>
      <nav className="mv-tabs" role="tablist">
        {([['lab', 'Labor'], ['exp', 'Experiment'], ['duel', 'Stil-Duell']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} disabled={busy && running?.tab !== id} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>
      <div className="mv-body">
        <section className="mv-panel">
          <Range label="Zukünfte pro Lauf" value={n} min={10} max={100} step={10} show={(v) => `${v}`} onChange={setN} disabled={busy} />
          <Range label="Saisons" value={seasons} min={1} max={10} step={1} show={(v) => (toEnd ? 'bis Karriereende' : `${v}`)} onChange={setSeasons} disabled={busy || toEnd} />
          <label className="bo-check"><input type="checkbox" checked={toEnd} disabled={busy} onChange={(e) => setToEnd(e.target.checked)} /> Bis zum Karriereende</label>
          {tab !== 'duel' && (
            <>
              <p className="mv-label">Im Transferfenster</p>
              <div className="mv-seg">{([0, 1, 2] as TransferStyle[]).map((s) => <button key={s} disabled={busy} className={style === s ? 'on' : ''} onClick={() => setStyle(s)}>{STYLE_NAME[s].name}</button>)}</div>
            </>
          )}
        </section>

        {tab === 'exp' && <ExperimentSetup career={career} exp={exp} setExp={setExp} disabled={busy} />}

        <section className="mv-panel">
          {tab === 'lab' && <p className="mv-intro">Deine Karriere ab jetzt, {n} Mal parallel gespielt.</p>}
          {tab === 'exp' && <p className="mv-intro">Original gegen Experiment: je {n} Zukünfte. Der echte Spielstand bleibt unverändert.</p>}
          {tab === 'duel' && <p className="mv-intro">Treu, Sportlich und Geld im direkten Vergleich: je {n} Zukünfte, gleiche Startlage.</p>}
          {busy && running?.tab === tab
            ? <button className="btn secondary big mv-go" onClick={() => { stop.current = true; }}>Anhalten · {running.done}/{running.total}</button>
            : <button className="btn primary big mv-go" disabled={busy || career.phase === 'retired'} onClick={() => {
              if (tab === 'lab') run('lab', [{ label: 'Labor', start: career, style }]);
              else if (tab === 'exp') run('exp', [{ label: 'Original', start: career, style }, { label: 'Experiment', start: applyExperiment(career, exp), style }]);
              else run('duel', ([0, 1, 2] as TransferStyle[]).map((s) => ({ label: STYLE_NAME[s].name, start: career, style: s })));
            }}><Icon name="globe" size={18} /> {tab === 'lab' ? 'Multiversum starten' : tab === 'exp' ? 'Vergleich starten' : 'Duell starten'}</button>}
          {busy && running?.tab === tab && <div className="mv-prog"><i style={{ transform: `scaleX(${running.done / running.total})` }} /></div>}
        </section>

        <Results tab={tab} results={results[tab]} running={busy && running?.tab === tab} onOpen={(f, label) => setDetail({ f, label })} onAdopt={adopt} />
        <p className="hf-note">Alles läuft mit der echten Spiel-Logik. Ergebnisse sind Zufall – jeder Lauf rechnet neue Zukünfte.</p>
      </div>
      {detail && <FutureDetail f={detail.f} label={detail.label} onClose={() => setDetail(null)} onAdopt={() => adopt(detail.f, detail.label)} />}
    </div>
  );
}

// ---------- Experiment ----------
function ExperimentSetup({ career, exp, setExp, disabled }: { career: Career; exp: Experiment; setExp: (e: Experiment) => void; disabled: boolean }) {
  const leagues = useMemo(() => bossLeagues(), []);
  const [lg, setLg] = useState(() => clubLeagueId(career, exp.clubId ?? currentClubId(career.player)));
  const clubs = bossClubs(lg);
  const p = career.player;
  const ovr = exp.ovr ?? p.ovr;
  const changed = ovr !== p.ovr || (exp.pot ?? p.potential) !== p.potential || exp.clubId !== currentClubId(p) || (exp.load ?? 'normal') !== (career.autoLoad ?? 'normal');
  return (
    <section className="mv-panel">
      <h3 className="hf-h">Was wäre, wenn …</h3>
      <Range label="Wertung" value={ovr} min={40} max={99} step={1} show={(v) => `${v}${v !== p.ovr ? ` (jetzt ${p.ovr})` : ''}`} onChange={(v) => setExp({ ...exp, ovr: v, pot: Math.max(v, exp.pot ?? p.potential) })} disabled={disabled} />
      <Range label="Potenzial" value={exp.pot ?? p.potential} min={ovr} max={99} step={1} show={(v) => `${v}${v !== p.potential ? ` (jetzt ${p.potential})` : ''}`} onChange={(v) => setExp({ ...exp, pot: v })} disabled={disabled} />
      <label className="bo-field mv-field"><span>Liga</span>
        <select value={lg} disabled={disabled} onChange={(e) => { setLg(e.target.value); const first = bossClubs(e.target.value)[0]; if (first) setExp({ ...exp, clubId: first.id }); }}>
          {leagues.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.country})</option>)}
        </select>
      </label>
      <label className="bo-field mv-field"><span>Verein</span>
        <select value={exp.clubId} disabled={disabled} onChange={(e) => setExp({ ...exp, clubId: e.target.value })}>
          {!clubs.some((c) => c.id === exp.clubId) && exp.clubId && <option value={exp.clubId}>{clubLabel(exp.clubId)}</option>}
          {clubs.map((c) => <option key={c.id} value={c.id}>{c.name} · Stärke {c.strength}</option>)}
        </select>
      </label>
      <p className="mv-label">Trainingsbelastung</p>
      <div className="mv-seg four">{LOAD_STEPS.map((l: StageLoad) => <button key={l} disabled={disabled} className={(exp.load ?? 'normal') === l ? 'on' : ''} onClick={() => setExp({ ...exp, load: l })}>{LOAD_INFO[l].label}</button>)}</div>
      <div className="mv-row">
        <small className="hf-note">{changed ? 'Experiment weicht vom Original ab.' : 'Noch keine Änderung – stell etwas um.'}</small>
        <button className="cs-link" disabled={disabled} onClick={() => { setLg(clubLeagueId(career, currentClubId(p))); setExp({ ovr: p.ovr, pot: p.potential, clubId: currentClubId(p), load: career.autoLoad ?? 'normal' }); }}>Zurücksetzen</button>
      </div>
    </section>
  );
}

// ---------- Ergebnisse ----------
function Results({ tab, results, running, onOpen, onAdopt }: { tab: Tab; results: Result[]; running: boolean; onOpen: (f: Future, label: string) => void; onAdopt: (f: Future, label: string) => void }) {
  const [col, setCol] = useState(0);
  useEffect(() => { setCol(0); }, [results.length, tab]);
  if (!results.length || !results.some((r) => r.futures.length)) return null;
  const cur = results[Math.min(col, results.length - 1)];
  return (
    <>
      {results.length > 1 && !running && <Compare results={results} />}
      <Fan futures={cur.futures} a={running ? null : analyze(cur.futures)} />
      {!running && (
        <>
          {results.length > 1 && (
            <div className="mv-seg">{results.map((r, i) => <button key={r.label} className={col === i ? 'on' : ''} onClick={() => setCol(i)}>{r.label}</button>)}</div>
          )}
          {results.length === 1 && <Analysis a={analyze(cur.futures)} />}
          <FutureList futures={cur.futures} label={cur.label} onOpen={onOpen} onAdopt={onAdopt} />
        </>
      )}
    </>
  );
}

const ROWS: [string, (s: Summary) => number, (v: number) => string, boolean?][] = [
  ['Ø Tore', (s) => s.goals, (v) => num(v, 1)],
  ['Ø Vorlagen', (s) => s.assists, (v) => num(v, 1)],
  ['Ø Titel', (s) => s.titles, (v) => num(v, 2)],
  ['Meisterschaft', (s) => s.pMeister, pct],
  ['Champions League', (s) => s.pCL, pct],
  ['Ballon d’Or', (s) => s.pBallon, pct],
  ['Wertung 90+', (s) => s.p90, pct],
  ['Ø Höchstwertung', (s) => s.peak, (v) => num(v, 1)],
  ['Ø Endwertung', (s) => s.finalOvr, (v) => num(v, 1)],
  ['Gesamt-Bewertung', (s) => s.score, (v) => num(v, 0)],
];
function Compare({ results }: { results: Result[] }) {
  const sums = results.map((r) => summarize(r.futures));
  const winner = sums.reduce((b, s, i) => (s.score > sums[b].score ? i : b), 0);
  return (
    <section className="mv-panel">
      <h3 className="hf-h">Vergleich</h3>
      <table className="hf-table mv-cmp">
        <thead><tr><th className="l"></th>{results.map((r, i) => <th key={r.label} className={i === winner ? 'win' : ''}>{i === winner ? '★ ' : ''}{r.label}</th>)}</tr></thead>
        <tbody>
          {ROWS.map(([label, get, fmt]) => {
            const vals = sums.map(get);
            const best = Math.max(...vals);
            return <tr key={label}><td className="l">{label}</td>{vals.map((v, i) => <td key={i} className={v === best && vals.some((x) => x !== best) ? 'best' : ''}>{fmt(v)}</td>)}</tr>;
          })}
        </tbody>
      </table>
      <p className="hf-note">★ = höchste Gesamt-Bewertung (Tore, Vorlagen, Titel, Auszeichnungen). Grün = bester Wert der Zeile.</p>
    </section>
  );
}

function Analysis({ a }: { a: ReturnType<typeof analyze> }) {
  if (!a) return null;
  return (
    <section className="mv-panel">
      <h3 className="hf-h">Was meistens passiert</h3>
      <div className="ss-grid">
        <Tile k="Tore (Ø)" v={num(a.goals.avg, 0)} s={`${a.goals.min}–${a.goals.max}`} />
        <Tile k="Tore (Median)" v={`${a.goals.median}`} />
        <Tile k="Titel (Ø)" v={num(a.titles.avg)} s={`max. ${a.titles.max}`} />
        <Tile k="Höchste Wertung" v={num(a.peak.avg, 0)} s={`${a.peak.min}–${a.peak.max}`} />
      </div>
      <h3 className="hf-h">Wahrscheinlichkeiten</h3>
      <ul className="mv-bars">{a.chances.map((c) => <li key={c.label}><span>{c.label}</span><i><em style={{ transform: `scaleX(${c.p})` }} /></i><b>{pct(c.p)}</b></li>)}</ul>
      <h3 className="hf-h">Tore – Verteilung</h3>
      <div className="mv-hist">
        {a.hist.map((b) => { const max = Math.max(1, ...a.hist.map((x) => x.n)); return <div key={b.from} title={`${b.from}–${b.to}: ${b.n}`}><i style={{ transform: `scaleY(${b.n / max})` }} /><small>{b.from}</small></div>; })}
      </div>
      <h3 className="hf-h">Wahrscheinlichste Vereine</h3>
      <ul className="mv-bars">{a.topClubs.map((c) => <li key={c.clubId}><span>{clubLabel(c.clubId)}</span><i><em style={{ transform: `scaleX(${c.p})` }} /></i><b>{pct(c.p)}</b></li>)}</ul>
    </section>
  );
}

const SORTS: [FutureSort, string][] = [['score', 'Bewertung'], ['goals', 'Tore'], ['titles', 'Titel'], ['peak', 'Wertung']];
const FILTERS: [FutureFilter, string][] = [['all', 'Alle'], ['meister', 'Meister'], ['cl', 'CL-Sieg'], ['ballon', 'Ballon d’Or'], ['top90', '90+'], ['retired', 'Karriereende']];
function FutureList({ futures, label, onOpen, onAdopt }: { futures: Future[]; label: string; onOpen: (f: Future, label: string) => void; onAdopt: (f: Future, label: string) => void }) {
  const [sort, setSort] = useState<FutureSort>('score');
  const [filter, setFilter] = useState<FutureFilter>('all');
  const [more, setMore] = useState(false);
  const list = listFutures(futures, sort, filter);
  const shown = more ? list : list.slice(0, 12);
  return (
    <section className="mv-panel">
      <h3 className="hf-h">Alle Zukünfte{label !== 'Labor' ? ` · ${label}` : ''}</h3>
      <div className="mv-seg four">{SORTS.map(([id, l]) => <button key={id} className={sort === id ? 'on' : ''} onClick={() => setSort(id)}>{l}</button>)}</div>
      <div className="mv-chips">{FILTERS.map(([id, l]) => {
        const count = listFutures(futures, 'score', id).length;
        return <button key={id} className={filter === id ? 'on' : ''} disabled={!count} onClick={() => setFilter(id)}>{l} <small>{count}</small></button>;
      })}</div>
      {list.length ? (
        <ul className="mv-list">
          {shown.map((f, i) => (
            <li key={f.id}>
              <button onClick={() => onOpen(f, label)}>
                <em>{i + 1}</em>
                <span><b>{f.goals} T · {f.assists} V · {f.titles.length} Titel{f.ballon ? ` · ${f.ballon}× Ballon d’Or` : ''}</b><small>OVR {f.ovrPath[0]} → {f.finalOvr} · {f.clubs.map(clubLabel).join(' → ')}</small></span>
                <Icon name="arrow" size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="hf-note">Keine Zukunft passt zu diesem Filter.</p>}
      {list.length > 12 && <button className="cs-link" onClick={() => setMore(!more)}>{more ? 'Weniger zeigen' : `Alle ${list.length} zeigen`}</button>}
      {list[0] && <button className="btn secondary bo-wide mv-adopt" onClick={() => onAdopt(list[0], label)}>Erste Zukunft der Liste übernehmen</button>}
    </section>
  );
}

function FutureDetail({ f, label, onClose, onAdopt }: { f: Future; label: string; onClose: () => void; onAdopt: () => void }) {
  const rows = futureSeasons(f);
  return (
    <div className="overlay bo-sheet-wrap mv-sheet" role="dialog" aria-modal="true" aria-label="Zukunft im Detail" onClick={onClose}>
      <section className="bo-sheet" onClick={(e) => e.stopPropagation()}>
        <small>{label} · Zukunft #{f.id + 1}</small>
        <h2>{f.goals} Tore · {f.titles.length} Titel</h2>
        <p className="muted">OVR {f.ovrPath[0]} → {f.finalOvr} (Hoch {f.peak}){f.retired ? ' · Karriere beendet' : ''}</p>
        <table className="hf-table">
          <thead><tr><th className="l">Saison</th><th className="l">Verein</th><th>Sp</th><th>T</th><th>V</th><th>OVR</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.season}><td className="l">{r.season}</td><td className="l">{clubLabel(r.clubId)}{r.trophies.length ? <small> · {r.trophies.join(', ')}</small> : null}</td><td>{r.apps}</td><td>{r.goals}</td><td>{r.assists}</td><td><b>{r.ovrEnd}</b></td></tr>)}</tbody>
        </table>
        {f.titles.length > 0 && <p className="hf-note">Titel: {f.titles.join(', ')}</p>}
        {rows.some((r) => r.awards.length) && <p className="hf-note">Auszeichnungen: {rows.flatMap((r) => r.awards).join(', ')}</p>}
        <button className="btn secondary bo-wide mv-adopt" onClick={onAdopt}>Diese Zeitlinie übernehmen</button>
        <button className="btn primary big" onClick={onClose}>Schließen</button>
      </section>
    </div>
  );
}

function Range({ label, value, min, max, step, show, onChange, disabled }: { label: string; value: number; min: number; max: number; step: number; show: (v: number) => string; onChange: (v: number) => void; disabled?: boolean }) {
  const p = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <label className={`bo-slider ${disabled ? 'off' : ''}`}>
      <span className="bo-slider-top"><span>{label}</span><b>{show(value)}</b></span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} style={{ ['--p' as string]: `${p}%` }} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </label>
  );
}
function Tile({ k, v, s }: { k: string; v: string; s?: string }) {
  return <div className="ss-tile"><small>{k}</small><b>{v}</b>{s && <em>{s}</em>}</div>;
}

/** Fächer aller Zeitlinien: Wertung pro Saison, beste in Gold, schlechteste in Rot, typische weiß. */
function Fan({ futures, a }: { futures: Future[]; a: ReturnType<typeof analyze> }) {
  if (!futures.length) return null;
  const W = 340, H = 190, P = 22;
  const len = Math.max(2, ...futures.map((f) => f.ovrPath.length));
  const all = futures.flatMap((f) => f.ovrPath);
  const lo = Math.min(...all) - 1, hi = Math.max(...all) + 1;
  const x = (i: number) => P + (i * (W - 2 * P)) / (len - 1);
  const y = (v: number) => H - P - ((v - lo) / Math.max(1, hi - lo)) * (H - 2 * P);
  const path = (f: Future) => f.ovrPath.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const ticks = [...new Set([lo + 1, Math.round((lo + hi) / 2), hi - 1])];
  return (
    <section className="mv-panel mv-fan">
      <h3 className="hf-h">Wertung in allen Zukünften</h3>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Wertung aller simulierten Zukünfte">
        {ticks.map((t) => <g key={t}><line x1={P} x2={W - P} y1={y(t)} y2={y(t)} className="mv-grid" /><text x={2} y={y(t) + 3} className="mv-lab">{t}</text></g>)}
        {futures.map((f) => <path key={f.id} d={path(f)} className="mv-line" />)}
        {a && <path d={path(a.worst)} className="mv-line worst" />}
        {a && <path d={path(a.median)} className="mv-line median" />}
        {a && <path d={path(a.best)} className="mv-line best" />}
        {Array.from({ length: len }, (_, i) => i).filter((i) => len <= 12 || i % 2 === 0).map((i) => <text key={i} x={x(i)} y={H - 5} className="mv-lab mid">{i === 0 ? 'jetzt' : `+${i}`}</text>)}
      </svg>
      {a && <p className="mv-legend"><i className="best" /> beste <i className="median" /> typisch <i className="worst" /> schlechteste</p>}
    </section>
  );
}
