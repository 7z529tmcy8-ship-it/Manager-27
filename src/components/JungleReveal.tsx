import { useEffect, useRef, useState } from 'react';
import type { PackResult } from '../game/club';
import { motionReduced } from '../settings';
import { play, playCharge } from '../sound';
import UtCard from './UtCard';

// Absturz-Kiste (Code JUNGLECRASH, Expeditions-Pfad): Ein Flugzeug zieht mit Rauchfahne über den Himmel,
// eine Kiste löst sich, trudelt durchs Blätterdach, schlägt ein (Beben, Staub, Blätter), der Deckel fliegt weg,
// Goldlicht und Glühwürmchen steigen auf, die Karten fliegen heraus. Antippen überspringt.

type Phase = 'sky' | 'fall' | 'impact' | 'open' | 'reveal';
const T = { sky: 1200, fall: 850, impact: 450, open: 650 };
const vibrate = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* nicht unterstützt */ } };
// Feste Werte, damit nichts springt
const LEAVES = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2 + (i % 2 ? 0.25 : -0.1);
  const d = 110 + (i % 5) * 34;
  return { x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d * 0.75 - 40), r: (i * 67) % 360, s: 0.6 + (i % 3) * 0.3, h: i % 3 };
});
const FLIES = Array.from({ length: 14 }, (_, i) => ({ x: -140 + ((i * 47) % 280), d: (i % 7) * 0.12, s: 0.6 + (i % 4) * 0.25 }));
const FALLING = Array.from({ length: 10 }, (_, i) => ({ left: (i * 23) % 100, d: (i % 5) * 0.15, dur: 1.2 + (i % 3) * 0.4 }));
const PUFFS = [0, 1, 2, 3, 4, 5];

export default function JungleReveal({ result, title = 'Absturz-Kiste', onClose, onCollection }: { result: PackResult; title?: string; onClose: () => void; onCollection?: () => void }) {
  const [phase, setPhase] = useState<Phase>(() => (motionReduced() ? 'reveal' : 'sky'));
  const stopTone = useRef<() => void>(() => {});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (phase !== 'sky') return;
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    stopTone.current = playCharge(T.sky + T.fall);
    vibrate([10, 90, 10, 90, 10]);
    at(T.sky, () => { setPhase('fall'); vibrate([20, 40, 20, 40, 30]); });
    at(T.sky + T.fall, () => {
      stopTone.current();
      setPhase('impact');
      try { play('walkout'); } catch { /* kein Ton */ }
      vibrate([140, 40, 220]);
    });
    at(T.sky + T.fall + T.impact, () => { setPhase('open'); try { play('revealRare'); } catch { /* kein Ton */ } vibrate([30, 30, 60]); });
    at(T.sky + T.fall + T.impact + T.open, () => { setPhase('reveal'); try { play('fanfare'); } catch { /* kein Ton */ } });
    return () => { timers.current.forEach(clearTimeout); timers.current = []; stopTone.current(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const skip = () => {
    if (phase === 'reveal') return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    stopTone.current();
    setPhase('reveal');
    try { play('fanfare'); } catch { /* kein Ton */ }
  };

  const cards = result.cards;
  const best = cards.reduce((b, c, i) => (c.card.ovr > cards[b].card.ovr || (c.card.variant === 'jungle' && cards[b].card.variant !== 'jungle') ? i : b), 0);
  const landed = phase === 'impact' || phase === 'open' || phase === 'reveal';
  return (
    <div className={`mt jc ${phase}`} role="dialog" aria-modal="true" aria-label={title} onClick={skip}>
      <div className="jc-sky" aria-hidden="true">
        <i className="jc-sun" /><i className="jc-cloud c1" /><i className="jc-cloud c2" /><i className="jc-cloud c3" />
        {phase === 'sky' && (
          <span className="jc-plane">
            <i className="jc-body" /><i className="jc-wing" /><i className="jc-tail" /><i className="jc-prop" />
            {PUFFS.map((k) => <b key={k} className="jc-puff" style={{ '--k': k } as React.CSSProperties} />)}
          </span>
        )}
      </div>
      <div className="jc-hills" aria-hidden="true"><i className="h1" /><i className="h2" /><i className="h3" /></div>
      <div className="jc-falling" aria-hidden="true">
        {FALLING.map((f, i) => <i key={i} style={{ left: `${f.left}%`, animationDelay: `${f.d}s`, animationDuration: `${f.dur}s` }} />)}
      </div>

      <div className="mt-stage">
        {phase !== 'reveal' && (
          <span className={`jc-crate ${phase}`} aria-hidden="true">
            <i className="jc-lid" /><i className="jc-box" /><i className="jc-band b1" /><i className="jc-band b2" /><i className="jc-lock" />
            {phase === 'open' && <i className="jc-glow" />}
          </span>
        )}
        {landed && (
          <>
            <span className="jc-dust" aria-hidden="true" />
            <span className="jc-dust d2" aria-hidden="true" />
            <div className="jc-burst" aria-hidden="true">
              {LEAVES.map((l, i) => <i key={i} className={`h${l.h}`} style={{ '--x': `${l.x}px`, '--y': `${l.y}px`, '--r': `${l.r}deg`, '--s': l.s } as React.CSSProperties} />)}
            </div>
          </>
        )}
        {(phase === 'open' || phase === 'reveal') && (
          <div className="jc-flies" aria-hidden="true">
            {FLIES.map((f, i) => <i key={i} style={{ '--x': `${f.x}px`, '--d': `${f.d}s`, '--s': f.s } as React.CSSProperties} />)}
          </div>
        )}
      </div>
      <span className="jc-canopy" aria-hidden="true" />
      {phase === 'impact' && <span className="mt-flash jc-flash" aria-hidden="true" />}

      {phase === 'reveal' && (
        <div className="mt-reward" onClick={(e) => e.stopPropagation()}>
          <h2 className="mt-title jc-title">{title}</h2>
          <p className="mt-sub jc-sub">{cards.length} {cards.length === 1 ? 'Karte' : 'Karten'} aus dem Dschungel</p>
          <div className="mt-grid">
            {cards.map((c, i) => (
              <span key={`${c.card.id}-${i}`} className={`mt-card jc-card ${i === best ? 'best' : ''}`} style={{ '--i': i } as React.CSSProperties}>
                <UtCard card={c.card} size="sm" shine={i === best} />
                {!c.duplicate && <em className="mt-new jc-new">Neu</em>}
              </span>
            ))}
          </div>
          <div className="mt-actions">
            {onCollection && <button className="btn secondary big" onClick={onCollection}>Zur Sammlung</button>}
            <button className="btn primary big" onClick={onClose}>Weiter</button>
          </div>
        </div>
      )}
      {phase !== 'reveal' && <button className="pack-skip mt-skip" onClick={(e) => { e.stopPropagation(); skip(); }}>Überspringen</button>}
    </div>
  );
}
