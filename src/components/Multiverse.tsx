import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import { analyze, clubLabel, runFuture, type Future } from '../game/multiverse';
import { STYLE_NAME, type TransferStyle } from '../game/autosim';
import { play } from '../sound';
import type { Career } from '../game/types';

const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
const pct = (p: number) => `${Math.round(p * 100)} %`;
const num = (v: number, d = 1) => v.toLocaleString('de-DE', { maximumFractionDigits: d });

/** Multiversum-Labor: viele parallele Zukünfte der Karriere simulieren und auswerten. */
export default function Multiverse({ career, onAdopt, onClose }: { career: Career; onAdopt: (c: Career) => void; onClose: () => void }) {
  const [n, setN] = useState(30);
  const [seasons, setSeasons] = useState(5);
  const [toEnd, setToEnd] = useState(false);
  const [style, setStyle] = useState<TransferStyle>(career.transferStyle ?? 1);
  const [futures, setFutures] = useState<Future[]>([]);
  const [running, setRunning] = useState(false);
  const [pick, setPick] = useState<'best' | 'median' | 'worst'>('best');
  const stop = useRef(false);
  const t0 = useRef(0);
  useEffect(() => () => { stop.current = true; }, []);

  const start = () => {
    stop.current = false;
    setFutures([]);
    setRunning(true);
    sfx('whistle');
    t0.current = performance.now();
    let i = 0;
    const out: Future[] = [];
    const step = () => {
      if (stop.current) { setRunning(false); return; }
      // Ein paar Zukünfte pro Takt, dann Luft für die Anzeige lassen
      const until = performance.now() + 40;
      while (i < n && performance.now() < until) { out.push(runFuture(career, toEnd ? 'end' : seasons, style, i)); i++; }
      setFutures([...out]);
      if (i < n) setTimeout(step, 0);
      else { setRunning(false); sfx('levelUp'); }
    };
    setTimeout(step, 30);
  };
  const a = useMemo(() => (running ? null : analyze(futures)), [futures, running]);
  const shown = a ? a[pick] : null;
  const secs = running || !futures.length ? null : (performance.now() - t0.current) / 1000;

  return (
    <div className="overlay mv" role="dialog" aria-modal="true" aria-label="Multiversum-Labor">
      <header className="mv-head">
        <div><small>Entwickler-Modus</small><b>Multiversum-Labor</b></div>
        <button className="hf-x" onClick={() => { stop.current = true; onClose(); }} aria-label="Schließen"><Icon name="close" size={20} /></button>
      </header>
      <div className="mv-body">
        <p className="mv-intro">Deine Karriere ab jetzt – {n} Mal parallel gespielt. Jede Linie ist eine mögliche Zukunft von <b>{career.player.name}</b>.</p>

        <section className="mv-panel">
          <Range label="Zukünfte" value={n} min={10} max={100} step={10} show={(v) => `${v}`} onChange={setN} disabled={running} />
          <Range label="Saisons" value={seasons} min={1} max={10} step={1} show={(v) => (toEnd ? 'bis Karriereende' : `${v}`)} onChange={setSeasons} disabled={running || toEnd} />
          <label className="bo-check"><input type="checkbox" checked={toEnd} disabled={running} onChange={(e) => setToEnd(e.target.checked)} /> Bis zum Karriereende</label>
          <div className="mv-seg">{([0, 1, 2] as TransferStyle[]).map((s) => <button key={s} disabled={running} className={style === s ? 'on' : ''} onClick={() => setStyle(s)}>{STYLE_NAME[s].name}</button>)}</div>
          {running
            ? <button className="btn secondary big mv-go" onClick={() => { stop.current = true; }}>Anhalten · {futures.length}/{n}</button>
            : <button className="btn primary big mv-go" onClick={start} disabled={career.phase === 'retired'}><Icon name="globe" size={18} /> Multiversum starten</button>}
          {running && <div className="mv-prog"><i style={{ transform: `scaleX(${futures.length / n})` }} /></div>}
          {secs !== null && <small className="hf-note">{futures.length} Zukünfte in {num(secs)} Sekunden gerechnet.</small>}
        </section>

        {futures.length > 0 && <Fan futures={futures} a={a} />}

        {a && (
          <>
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

            <section className="mv-panel">
              <h3 className="hf-h">Zeitlinien</h3>
              <div className="mv-seg">
                <button className={pick === 'best' ? 'on gold' : ''} onClick={() => setPick('best')}>Beste</button>
                <button className={pick === 'median' ? 'on' : ''} onClick={() => setPick('median')}>Typisch</button>
                <button className={pick === 'worst' ? 'on red' : ''} onClick={() => setPick('worst')}>Schlechteste</button>
              </div>
              {shown && (
                <>
                  <ul className="bo-eff">
                    <li><span>Saisons</span><b>{shown.seasons}{shown.retired ? ' · Karriere beendet' : ''}</b></li>
                    <li><span>Tore · Vorlagen</span><b>{shown.goals} · {shown.assists}</b></li>
                    <li><span>Wertung</span><b>{shown.ovrPath[0]} → {shown.finalOvr} (Hoch {shown.peak})</b></li>
                    <li><span>Vereine</span><b>{shown.clubs.map(clubLabel).join(' → ')}</b></li>
                    <li><span>Titel</span><b>{shown.titles.length ? shown.titles.join(', ') : '–'}</b></li>
                    {shown.ballon > 0 && <li><span>Ballon d’Or</span><b>{shown.ballon}×</b></li>}
                  </ul>
                  <button className="btn secondary bo-wide mv-adopt" onClick={() => {
                    if (window.confirm('Diese Zeitlinie übernehmen? Dein Spielstand springt in diese Zukunft – das lässt sich nicht rückgängig machen.')) { sfx('jackpot'); onAdopt(shown.career); }
                  }}>Diese Zeitlinie übernehmen</button>
                </>
              )}
            </section>
            <p className="hf-note">Alles läuft mit der echten Spiel-Logik. Ergebnisse sind Zufall – jeder Start rechnet neue Zukünfte.</p>
          </>
        )}
      </div>
    </div>
  );
}

function Range({ label, value, min, max, step, show, onChange, disabled }: { label: string; value: number; min: number; max: number; step: number; show: (v: number) => string; onChange: (v: number) => void; disabled?: boolean }) {
  const p = ((value - min) / (max - min)) * 100;
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
  const W = 340, H = 190, P = 22;
  const len = Math.max(2, ...futures.map((f) => f.ovrPath.length));
  const all = futures.flatMap((f) => f.ovrPath);
  const lo = Math.min(...all) - 1, hi = Math.max(...all) + 1;
  const x = (i: number) => P + (i * (W - 2 * P)) / (len - 1);
  const y = (v: number) => H - P - ((v - lo) / Math.max(1, hi - lo)) * (H - 2 * P);
  const path = (f: Future) => f.ovrPath.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const ticks = [lo + 1, Math.round((lo + hi) / 2), hi - 1];
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
