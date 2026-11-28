import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import ClubCrest from './ClubCrest';
import { getClub, getLeague } from '../data/leagues';
import { LOAD_STEPS, STYLE_NAME, playRestOfSeason, setAutoLoad, simulateSeasons, type TransferStyle } from '../game/autosim';
import { LOAD_INFO } from '../game/drill';
import { galaWorthy } from '../game/bigstage';
import { play } from '../sound';
import type { Career, SeasonRecord } from '../game/types';
import { SeasonReview } from './SeasonHeft';

const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
const euro = (v: number) => (v >= 1e6 ? `${(v / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio. €` : `${Math.round(v / 1e3)} Tsd. €`);
const note = (v: number | null | undefined) => (v ? v.toFixed(2).replace('.', ',') : '–');

// ---------- Regler ----------
function Range({ label, value, min, max, show, onChange }: { label: string; value: number; min: number; max: number; show: (v: number) => string; onChange: (v: number) => void }) {
  const p = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <label className="bo-slider">
      <span className="bo-slider-top"><span>{label}</span><b>{show(value)}</b></span>
      <input type="range" min={min} max={max} step={1} value={value} style={{ ['--p' as string]: `${p}%` }} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </label>
  );
}

// ---------- Steuerleiste ----------
/**
 * Immer am selben Ort (unten): der nächste Schritt groß, „Ganze Saison“ daneben, und ein Knopf für
 * Regler und Mehrsaison-Simulation.
 */
export function CareerControls({ career, stageMode, onStage, onBreak, onWinter, onCommit, onMulti }: {
  career: Career; stageMode: boolean;
  onStage: () => void; onBreak: () => void; onWinter: () => void;
  onCommit: (c: Career) => void; onMulti: (r: { career: Career; seasons: SeasonRecord[]; stop: string | null }) => void;
}) {
  const [sheet, setSheet] = useState(false);
  const ph = career.phase;
  if (ph === 'retired' || ph === 'final' || career.progress?.scene) return null;
  const main: { label: string; icon: string; go: () => void } | null =
    ph === 'season' ? (stageMode ? { label: 'Nächste Etappe', icon: 'ball', go: onStage } : { label: 'Bis Winterpause', icon: 'ball', go: onBreak })
      : ph === 'winter' ? (stageMode ? { label: 'Rückrunde starten', icon: 'ball', go: onWinter } : { label: 'Bis Saisonende', icon: 'ball', go: onBreak })
        : null;
  const whole = () => { sfx('whistle'); onCommit(playRestOfSeason(career)); };
  return (
    <>
      <div className="cc-bar" role="toolbar" aria-label="Weiterspielen">
        {main && <button className="btn primary cc-main" onClick={main.go}><Icon name={main.icon} size={18} />{main.label}</button>}
        {(ph === 'season' || ph === 'winter') && <button className="btn secondary cc-whole" onClick={whole}>Ganze Saison</button>}
        {ph === 'window' && <button className="btn secondary cc-whole cc-grow" onClick={() => setSheet(true)}><Icon name="rewind" size={16} />Automatisch weiter</button>}
        <button className="cc-more" onClick={() => setSheet(true)} aria-label="Regler und mehrere Saisons"><Icon name="tactics" size={20} /></button>
      </div>
      {sheet && <ControlSheet career={career} onClose={() => setSheet(false)} onCommit={onCommit} onMulti={(r) => { setSheet(false); onMulti(r); }} />}
    </>
  );
}

function ControlSheet({ career, onClose, onCommit, onMulti }: { career: Career; onClose: () => void; onCommit: (c: Career) => void; onMulti: (r: { career: Career; seasons: SeasonRecord[]; stop: string | null }) => void }) {
  const loadIdx = Math.max(0, LOAD_STEPS.indexOf(career.autoLoad ?? career.progress?.load ?? 'normal'));
  const [style, setStyle] = useState<TransferStyle>(career.transferStyle ?? 1);
  const [count, setCount] = useState(career.phase === 'window' ? 1 : 2);
  const [stopTop, setStopTop] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = LOAD_STEPS[loadIdx];
  const start = () => {
    setBusy(true);
    sfx('whistle');
    // Kurz rendern lassen (Knopf zeigt „Läuft …“), dann rechnen
    setTimeout(() => {
      const r = simulateSeasons({ ...career, transferStyle: style }, count, style, stopTop);
      onMulti({ ...r, career: { ...r.career, transferStyle: style } });
    }, 30);
  };
  return (
    <div className="overlay bo-sheet-wrap cc-sheet" role="dialog" aria-modal="true" aria-label="Regler und schnell spielen" onClick={onClose}>
      <section className="bo-sheet" onClick={(e) => e.stopPropagation()}>
        <small>Regler</small>
        <h2>Schnell spielen</h2>
        <Range label="Trainingsbelastung" value={loadIdx} min={0} max={3} show={(v) => LOAD_INFO[LOAD_STEPS[v]].label}
          onChange={(v) => { onCommit(setAutoLoad(career, LOAD_STEPS[v])); sfx('tap'); }} />
        <p className="bo-hint">{LOAD_INFO[load].hint}. Gilt für alle kommenden Spiele, auch in den nächsten Saisons.</p>
        <div className="bo-divider" />
        <Range label="Saisons am Stück" value={count} min={1} max={5} show={(v) => `${v} ${v === 1 ? 'Saison' : 'Saisons'}`} onChange={setCount} />
        <Range label="Im Transferfenster" value={style} min={0} max={2} show={(v) => STYLE_NAME[v as TransferStyle].name} onChange={(v) => setStyle(v as TransferStyle)} />
        <p className="bo-hint">{STYLE_NAME[style].text}{career.phase !== 'window' ? ' Die laufende Saison zählt als erste.' : ''}</p>
        <label className="bo-check"><input type="checkbox" checked={stopTop} onChange={(e) => setStopTop(e.target.checked)} /> Anhalten, wenn ein Topklub anfragt</label>
        <button className="btn primary big" disabled={busy} onClick={start}>{busy ? 'Läuft …' : `${count} ${count === 1 ? 'Saison' : 'Saisons'} simulieren`}</button>
        <button className="btn secondary bo-wide cc-close" onClick={onClose}>Schließen</button>
      </section>
    </div>
  );
}

// ---------- Saisonbilanz ----------
function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="ss-tile"><small>{label}</small><b>{value}</b>{sub && <em>{sub}</em>}</div>;
}
const delta = (a: number, b: number | undefined, dec = 0) => {
  if (b === undefined) return undefined;
  const d = a - b;
  if (Math.abs(d) < (dec ? 0.005 : 0.5)) return '±0';
  return `${d > 0 ? '+' : '−'}${Math.abs(d).toLocaleString('de-DE', { maximumFractionDigits: dec, minimumFractionDigits: dec })} zur Vorsaison`;
};

export function SeasonSummary({ career, record, onClose, onGala }: { career: Career; record: SeasonRecord; onClose: () => void; onGala?: () => void }) {
  const r = record;
  const idx = career.history.indexOf(r);
  const prev = idx > 0 ? career.history[idx - 1] : undefined;
  const ovrD = r.ovrEnd - r.ovrStart;
  const minPct = r.possibleMinutes ? Math.round((r.minutes / r.possibleMinutes) * 100) : 0;
  const keeper = ['TW', 'IV', 'AV'].includes(career.player.position);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="overlay bo-sheet-wrap ss" role="dialog" aria-modal="true" aria-label="Saisonbilanz">
      <section className="bo-sheet" ref={ref} tabIndex={-1}>
        <small>Saisonbilanz {r.season}</small>
        <h2 className="ss-club"><ClubCrest id={r.clubId} size={28} />{getClub(r.clubId).name}{r.onLoan ? ' (Leihe)' : ''}</h2>
        <p className="muted">{getLeague(r.leagueId).name} · Platz {r.leaguePosition || '–'} · {r.age} Jahre</p>
        {(r.trophies.length > 0 || r.awards.length > 0) && (
          <div className="ss-chips">
            {r.trophies.map((t) => <span key={t} className="ss-chip gold"><Icon name="trophy" size={14} />{t}</span>)}
            {r.awards.map((t) => <span key={t} className="ss-chip"><Icon name="medal" size={14} />{t}</span>)}
          </div>
        )}
        <SeasonReview career={career} record={r}>
        <div className="ss-grid">
          <Tile label="Spiele" value={`${r.apps}`} sub={`${r.starts} von Beginn`} />
          <Tile label="Tore" value={`${r.goals}`} sub={delta(r.goals, prev?.goals)} />
          <Tile label="Vorlagen" value={`${r.assists}`} sub={delta(r.assists, prev?.assists)} />
          <Tile label="Ø-Note" value={note(r.avgRating)} sub={r.avgRating && prev?.avgRating ? delta(r.avgRating, prev.avgRating, 2) : undefined} />
          <Tile label="Spielzeit" value={`${minPct} %`} sub={`${r.minutes.toLocaleString('de-DE')} Minuten`} />
          {keeper ? <Tile label="Zu null" value={`${r.cleanSheets}`} /> : <Tile label="Länderspiele" value={`${r.caps}`} sub={r.internationalGoals ? `${r.internationalGoals} Tore` : undefined} />}
        </div>
        <div className="ss-ovr">
          <span><small>Wertung</small><b>{r.ovrStart} → {r.ovrEnd}</b></span>
          <em className={ovrD > 0 ? 'pos' : ovrD < 0 ? 'neg' : ''}>{ovrD > 0 ? `+${ovrD}` : ovrD < 0 ? `−${-ovrD}` : '±0'}</em>
          <span><small>Marktwert</small><b>{euro(r.marketValue)}</b></span>
        </div>
        {r.byCompetition.length > 1 && (
          <table className="ss-table">
            <thead><tr><th>Wettbewerb</th><th>Sp</th><th>T</th><th>V</th><th>Note</th></tr></thead>
            <tbody>{r.byCompetition.map((c) => <tr key={c.competition}><td>{c.competition}</td><td>{c.apps}</td><td>{c.goals}</td><td>{c.assists}</td><td>{note(c.avgRating)}</td></tr>)}</tbody>
          </table>
        )}
        {(r.cupReached || r.europe) && <p className="bo-hint">{[r.cupReached && `Pokal: ${r.cupReached}`, r.europe && `${r.europe.competition}: ${r.europe.reached}`].filter(Boolean).join(' · ')}</p>}
        {(r.injuryWeeks ?? 0) > 0 && <p className="bo-hint">Verletzt: {r.injuryWeeks} Wochen</p>}
        {(r.devReasons?.length ?? 0) > 0 && <p className="bo-hint">{r.devReasons!.slice(0, 2).join(' ')}</p>}
        </SeasonReview>
        {onGala && galaWorthy(r) && <button className="btn secondary bo-wide" onClick={onGala}><Icon name="star" size={16} />Gala-Abend ansehen</button>}
        <button className="btn primary big" onClick={onClose}>Weiter</button>
      </section>
    </div>
  );
}

/** Nach mehreren Saisons: alle auf einen Blick. */
export function MultiSummary({ career, seasons, stop, onClose, onOpen }: { career: Career; seasons: SeasonRecord[]; stop: string | null; onClose: () => void; onOpen: (r: SeasonRecord) => void }) {
  const tot = seasons.reduce((a, r) => ({ apps: a.apps + r.apps, goals: a.goals + r.goals, assists: a.assists + r.assists, titles: a.titles + r.trophies.length }), { apps: 0, goals: 0, assists: 0, titles: 0 });
  return (
    <div className="overlay bo-sheet-wrap ss" role="dialog" aria-modal="true" aria-label="Saisons im Überblick">
      <section className="bo-sheet">
        <small>{seasons.length} {seasons.length === 1 ? 'Saison' : 'Saisons'} simuliert</small>
        <h2>Im Überblick</h2>
        <div className="ss-grid">
          <Tile label="Spiele" value={`${tot.apps}`} />
          <Tile label="Tore" value={`${tot.goals}`} />
          <Tile label="Vorlagen" value={`${tot.assists}`} />
          <Tile label="Titel" value={`${tot.titles}`} />
          <Tile label="Wertung" value={`${seasons[0]?.ovrStart ?? career.player.ovr} → ${career.player.ovr}`} />
          <Tile label="Alter" value={`${career.player.age}`} />
        </div>
        <ul className="ss-list">
          {seasons.map((r) => (
            <li key={r.season}>
              <button onClick={() => onOpen(r)}>
                <span className="ss-crest"><ClubCrest id={r.clubId} size={22} /></span>
                <span className="ss-l-main"><b>{r.season} · {getClub(r.clubId).name}</b><small>{r.apps} Sp · {r.goals} T · {r.assists} V · Ø {note(r.avgRating)} · OVR {r.ovrEnd}</small>{r.trophies.length > 0 && <em>{r.trophies.join(' · ')}</em>}</span>
                <Icon name="arrow" size={14} />
              </button>
            </li>
          ))}
        </ul>
        {stop && <p className="bo-hint warn">{stop}</p>}
        <button className="btn primary big" onClick={onClose}>Weiter</button>
      </section>
    </div>
  );
}

// ---------- Statistik ----------
export function CareerStats({ career }: { career: Career }) {
  const h = career.history;
  if (!h.length) return <section className="cs-window st"><h2>Statistik</h2><p className="cs-sub">Nach deiner ersten Saison siehst du hier alle Zahlen deiner Karriere.</p></section>;
  const tot = h.reduce((a, r) => ({ apps: a.apps + r.apps, goals: a.goals + r.goals, assists: a.assists + r.assists, caps: a.caps + r.caps, min: a.min + r.minutes }), { apps: 0, goals: 0, assists: 0, caps: 0, min: 0 });
  const titles = h.flatMap((r) => r.trophies);
  const awards = h.flatMap((r) => r.awards);
  const rated = h.filter((r) => r.avgRating);
  const avg = rated.length ? rated.reduce((a, r) => a + (r.avgRating ?? 0), 0) / rated.length : null;
  const best = [...h].sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists))[0];
  const bestNote = [...rated].sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))[0];
  const count = (xs: string[]) => Object.entries(xs.reduce<Record<string, number>>((m, x) => { const k = x.replace(/ \d{4}(\/\d{2})?$/, ''); m[k] = (m[k] ?? 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
  return (
    <section className="cs-window st">
      <h2>Statistik</h2>
      <div className="ss-grid">
        <Tile label="Saisons" value={`${h.length}`} />
        <Tile label="Spiele" value={`${tot.apps}`} sub={`${Math.round(tot.min / 90)} × 90 Min.`} />
        <Tile label="Tore" value={`${tot.goals}`} sub={tot.apps ? `${(tot.goals / tot.apps).toLocaleString('de-DE', { maximumFractionDigits: 2 })} pro Spiel` : undefined} />
        <Tile label="Vorlagen" value={`${tot.assists}`} />
        <Tile label="Ø-Note" value={note(avg)} />
        <Tile label="Länderspiele" value={`${tot.caps}`} />
      </div>
      <h3 className="st-h">Wertung pro Saison</h3>
      <Chart values={h.map((r) => r.ovrEnd)} labels={h.map((r) => r.season.slice(2, 4))} kind="line" />
      <h3 className="st-h">Tore und Vorlagen pro Saison</h3>
      <Chart values={h.map((r) => r.goals)} values2={h.map((r) => r.assists)} labels={h.map((r) => r.season.slice(2, 4))} kind="bars" />
      <p className="st-legend"><i className="g" /> Tore <i className="a" /> Vorlagen</p>
      <h3 className="st-h">Bestwerte</h3>
      <ul className="bo-eff">
        {best && <li><span>Beste Saison (Tore + Vorlagen)</span><b>{best.season}: {best.goals} T, {best.assists} V</b></li>}
        {bestNote && <li><span>Beste Ø-Note</span><b>{bestNote.season}: {note(bestNote.avgRating)}</b></li>}
        <li><span>Höchste Wertung</span><b>{Math.max(...h.map((r) => r.ovrEnd))}</b></li>
        <li><span>Höchster Marktwert</span><b>{euro(Math.max(...h.map((r) => r.marketValue)))}</b></li>
        <li><span>Vereine</span><b>{new Set(h.map((r) => r.clubId)).size}</b></li>
      </ul>
      {(titles.length > 0 || awards.length > 0) && (
        <>
          <h3 className="st-h">Titel & Auszeichnungen</h3>
          <div className="ss-chips">
            {count(titles).map(([t, n]) => <span key={t} className="ss-chip gold"><Icon name="trophy" size={14} />{n > 1 ? `${n}× ` : ''}{t}</span>)}
            {count(awards).map(([t, n]) => <span key={t} className="ss-chip"><Icon name="medal" size={14} />{n > 1 ? `${n}× ` : ''}{t}</span>)}
          </div>
        </>
      )}
    </section>
  );
}

/** Kleines Diagramm ohne Bibliothek: Linie (Wertung) oder Balken (Tore/Vorlagen). */
function Chart({ values, values2, labels, kind }: { values: number[]; values2?: number[]; labels: string[]; kind: 'line' | 'bars' }) {
  const n = values.length;
  const W = 320, H = 120, P = 18;
  const all = [...values, ...(values2 ?? [])];
  const lo = kind === 'line' ? Math.min(...values) - 2 : 0;
  const hi = Math.max(lo + 1, ...all) + (kind === 'line' ? 2 : 0);
  const x = (i: number) => P + (n === 1 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (n - 1));
  const y = (v: number) => H - P - ((v - lo) / (hi - lo)) * (H - 2 * P);
  const step = Math.max(1, Math.ceil(n / 10));
  return (
    <svg className={`st-chart ${kind}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={kind === 'line' ? 'Wertung pro Saison' : 'Tore und Vorlagen pro Saison'}>
      <line x1={P} x2={W - P} y1={H - P} y2={H - P} className="st-axis" />
      {kind === 'line' ? (
        <>
          <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} className="st-line" />
          {values.map((v, i) => <g key={i}><circle cx={x(i)} cy={y(v)} r={3} className="st-dot" />{(i % step === 0 || i === n - 1) && <text x={x(i)} y={y(v) - 6} className="st-val">{v}</text>}</g>)}
        </>
      ) : (
        values.map((v, i) => {
          const bw = Math.max(3, Math.min(14, (W - 2 * P) / n / 2.6));
          return (
            <g key={i}>
              <rect x={x(i) - bw - 1} y={y(v)} width={bw} height={H - P - y(v)} className="st-bar" />
              {values2 && <rect x={x(i) + 1} y={y(values2[i])} width={bw} height={H - P - y(values2[i])} className="st-bar b2" />}
            </g>
          );
        })
      )}
      {labels.map((l, i) => (i % step === 0 || i === n - 1) && <text key={i} x={x(i)} y={H - 4} className="st-lab">{l}</text>)}
    </svg>
  );
}
