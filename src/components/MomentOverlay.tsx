import { useEffect, useState } from 'react';
import type { Moment } from '../game/moments';
import { motionReduced } from '../settings';
import { play, type SoundId } from '../sound';
import Confetti from './Confetti';

const ICON: Record<Moment['kind'], string> = {
  scorer: '👟', ballon: '🏅', title: '🏆', award: '⭐', transfer: '✍️', rise: '📈', fall: '📉',
};

/** Zahl, die sichtbar hoch- oder runterzählt (z. B. Wertung 78 → 83). */
function Counter({ from, to }: { from: number; to: number }) {
  const [value, setValue] = useState(motionReduced() ? to : from);
  useEffect(() => {
    if (motionReduced() || from === to) return;
    const steps = Math.abs(to - from);
    const dir = Math.sign(to - from);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setValue(from + dir * i);
      if (i >= steps) clearInterval(id);
    }, Math.max(120, 900 / steps));
    return () => clearInterval(id);
  }, [from, to]);
  return <span className="mo-counter">{value}</span>;
}

/** Große Animation für einen Moment nach dem anderen. Antippen oder „Weiter“ schließt. */
export default function MomentOverlay({ moments, onDone }: { moments: Moment[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const m = moments[i];
  useEffect(() => {
    const kind = moments[i]?.kind;
    if (!kind) return;
    const sound: Record<Moment['kind'], SoundId> = { scorer: 'fanfare', ballon: 'fanfare', title: 'fanfare', award: 'fanfare', transfer: 'transfer', rise: 'rise', fall: 'fall' };
    play(sound[kind]);
  }, [i, moments]);
  if (!m) return null;
  const next = () => (i + 1 < moments.length ? setI(i + 1) : onDone());
  const happy = m.kind !== 'fall';

  return (
    <div className={`moment mo-${m.kind}`} role="dialog" aria-modal="true" aria-labelledby="moment-title" onClick={next}>
      {happy && m.kind !== 'transfer' && <div className="beams" aria-hidden="true" />}
      {(m.kind === 'scorer' || m.kind === 'ballon' || m.kind === 'title') && <Confetti pieces={110} />}
      {m.kind === 'fall' && (
        <div className="mo-rain" aria-hidden="true">
          {Array.from({ length: 40 }, (_, k) => <i key={k} style={{ left: `${(k * 37) % 100}%`, animationDelay: `${(k % 10) * 0.12}s` }} />)}
        </div>
      )}
      <div className="mo-card" key={i}>
        <div className="mo-icon" aria-hidden="true">{ICON[m.kind]}</div>
        {m.kind === 'transfer' ? (
          <div className="mo-transfer">
            <span className="mo-old">{m.fromClub}</span>
            <span className="mo-arrow" aria-hidden="true">➜</span>
            <span className="mo-new">{m.toClub}</span>
          </div>
        ) : null}
        <h2 id="moment-title">{m.title}</h2>
        <p className="mo-sub">{m.sub}</p>
        {m.from !== undefined && m.to !== undefined && (
          <div className="mo-ovr">
            <span className="mo-from">{m.from}</span>
            <span aria-hidden="true">{m.kind === 'rise' ? '⬆' : '⬇'}</span>
            <Counter from={m.from} to={m.to} />
          </div>
        )}
        {m.extra && <p className="mo-extra">{m.extra}</p>}
        {m.kind === 'fall' && <p className="mo-extra">{m.title === 'Das Alter …' ? 'Erfahrung kann man nicht trainieren – mach das Beste draus.' : 'Kopf hoch – die nächste Halbserie ist deine Chance.'}</p>}
        <button className="btn primary big" onClick={(e) => { e.stopPropagation(); next(); }}>
          {i + 1 < moments.length ? 'Weiter' : happy ? 'Weiter geht’s!' : 'Weitermachen'}
        </button>
        {moments.length > 1 && <small className="mo-count">{i + 1} / {moments.length}</small>}
      </div>
    </div>
  );
}
