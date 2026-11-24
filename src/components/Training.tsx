import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { attributeLabels } from '../game/player';
import { setStageLoad, setTrainingFocus } from '../game/career';
import { KEY_ATTRIBUTES } from '../game/training';
import { DRILL_TRIES, LOAD_INFO, LOAD_ORDER, applyDrill, canDrill, drillPos, drillZone } from '../game/drill';
import { play } from '../sound';
import type { Career, StageLoad, TrainingFocus } from '../game/types';

const NAME: Record<string, string> = {
  TEM: 'Tempo', SCH: 'Abschluss', PAS: 'Passen', DRI: 'Dribbling', DEF: 'Defensive', PHY: 'Physis',
  HEC: 'Hechten', HAN: 'Ballsicherheit', ABS: 'Abstoß', REF: 'Reflexe', STE: 'Stellungsspiel',
};

/** Trainingswoche vor jeder Etappe: Belastung, Schwerpunkt und eine freiwillige Übung. */
export function TrainingWeek({ career, onChange }: { career: Career; onChange: (c: Career) => void }) {
  const p = career.player;
  const [open, setOpen] = useState(false);
  const [drillMsg, setDrillMsg] = useState<string | null>(null);
  // Neue Etappe: alte Meldung weg
  const stage = career.progress?.stage ?? 0;
  useEffect(() => { setDrillMsg(null); }, [stage]);
  const load: StageLoad = career.progress?.load ?? 'normal';
  const focus: TrainingFocus = p.trainingFocus ?? 'balanced';
  const labels = attributeLabels(p.position);
  const key = KEY_ATTRIBUTES[p.position];
  return (
    <section className="tw" aria-label="Trainingswoche">
      <button className="tw-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Icon name="bolt" size={16} /><b>Trainingswoche</b>
        <small>{LOAD_INFO[load].label} · {typeof focus === 'number' ? NAME[labels[focus]] ?? labels[focus] : focus === 'rest' ? 'Pause' : 'Ausgewogen'}</small>
        <Icon name="arrow" size={14} className={open ? 'tw-open' : ''} />
      </button>
      {open && (
        <div className="tw-body">
          <small className="tw-label">Belastung (nächste Etappe)</small>
          <div className="tw-chips">
            {LOAD_ORDER.map((l) => <button key={l} className={load === l ? 'on' : ''} onClick={() => onChange(setStageLoad(career, l))}>{LOAD_INFO[l].label}</button>)}
          </div>
          <p className="tw-hint">{LOAD_INFO[load].hint}</p>
          <small className="tw-label">Schwerpunkt (wirkt zur nächsten Pause)</small>
          <div className="tw-chips">
            <button className={focus === 'balanced' ? 'on' : ''} onClick={() => onChange(setTrainingFocus(career, 'balanced'))}>Ausgewogen</button>
            {labels.map((l, i) => (
              <button key={l} className={`${focus === i ? 'on' : ''} ${key.includes(i) ? 'key' : ''}`} onClick={() => onChange(setTrainingFocus(career, i))}>{NAME[l] ?? l}</button>
            ))}
          </div>
          <p className="tw-hint">Hell umrandet = wichtig für deine Position.{p.retrain ? ' Während des Positionstrainings ruht der Schwerpunkt.' : ''}</p>
        </div>
      )}
      {drillMsg ? <p className="tw-hint tw-result">{drillMsg}</p> : canDrill(career) && <Drill career={career} onChange={onChange} onDone={setDrillMsg} />}
    </section>
  );
}

/** Timing-Übung: Markierung im grünen Bereich stoppen. Drei Versuche, freiwillig. */
function Drill({ career, onChange, onDone }: { career: Career; onChange: (c: Career) => void; onDone: (text: string) => void }) {
  const [on, setOn] = useState(false);
  const [hits, setHits] = useState<boolean[]>([]);
  const zone = drillZone(career);
  const mark = useRef<HTMLSpanElement>(null);
  const t0 = useRef(0);
  useEffect(() => {
    if (!on) return;
    t0.current = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      if (mark.current) mark.current.style.transform = `translate3d(${drillPos(now - t0.current)}%, 0, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  const shoot = () => {
    const pos = drillPos(performance.now() - t0.current);
    const hit = pos >= zone.from && pos <= zone.to;
    play(hit ? 'coin' : 'tap');
    const next = [...hits, hit];
    setHits(next);
    if (next.length >= DRILL_TRIES) {
      setOn(false);
      const r = applyDrill(career, next.filter(Boolean).length);
      onDone(r.text);
      onChange(r.career);
    }
  };
  useEffect(() => {
    if (!on) return;
    const k = (e: KeyboardEvent) => { if (e.key === ' ') { e.preventDefault(); shoot(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  if (!on) return <button className="btn secondary small tw-drill-btn" onClick={() => { setHits([]); setOn(true); }}><Icon name="target" size={16} /> Timing-Übung (freiwillig)</button>;
  return (
    <div className="dr" role="group" aria-label="Timing-Übung">
      <div className="dr-track">
        <i className="dr-zone" style={{ left: `${zone.from}%`, width: `${zone.to - zone.from}%` }} />
        <span className="dr-rail" ref={mark}><b /></span>
      </div>
      <div className="dr-foot">
        <span className="dr-dots">{Array.from({ length: DRILL_TRIES }, (_, i) => <i key={i} className={i < hits.length ? (hits[i] ? 'hit' : 'miss') : ''} />)}</span>
        <button className="btn primary dr-go" onClick={shoot}>Jetzt!</button>
      </div>
    </div>
  );
}
