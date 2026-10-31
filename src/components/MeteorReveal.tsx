import { useEffect, useRef, useState } from 'react';
import type { PackResult } from '../game/club';
import { motionReduced } from '../settings';
import { play, playCharge } from '../sound';
import UtCard from './UtCard';

// Meteor-Einschlag für den Code METEOR: Aufladen (Himmel, Grollen) → Sturz → Einschlag (Blitz, Druckwelle, Brocken)
// → zehn Ikonen fliegen aus dem Krater. Antippen überspringt bis zur Belohnung.

type Phase = 'charge' | 'fall' | 'impact' | 'reveal';
const T = { charge: 1300, fall: 900, impact: 550 };
const vibrate = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* nicht unterstützt */ } };

/** Brocken, die beim Einschlag wegfliegen (fest, damit nichts springt). */
const DEBRIS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1);
  const d = 120 + (i % 4) * 40;
  return { x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d * 0.8), r: (i * 47) % 360, s: 0.6 + (i % 3) * 0.3 };
});
const STREAKS = Array.from({ length: 7 }, (_, i) => ({ top: 6 + i * 11, delay: i * 0.17, dur: 0.9 + (i % 3) * 0.2 }));

export default function MeteorReveal({ result, onClose, onCollection }: { result: PackResult; onClose: () => void; onCollection?: () => void }) {
  const [phase, setPhase] = useState<Phase>(() => (motionReduced() ? 'reveal' : 'charge'));
  const stopTone = useRef<() => void>(() => {});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (phase !== 'charge') return;
    stopTone.current = playCharge(T.charge + T.fall);
    vibrate([10, 60, 10, 60, 20, 60, 30]);
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    at(T.charge, () => setPhase('fall'));
    at(T.charge + T.fall, () => {
      stopTone.current();
      setPhase('impact');
      try { play('walkout'); } catch { /* kein Ton */ }
      vibrate([120, 40, 200]);
    });
    at(T.charge + T.fall + T.impact, () => { setPhase('reveal'); try { play('fanfare'); } catch { /* kein Ton */ } });
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
  const best = cards.reduce((b, c, i) => (c.card.ovr > cards[b].card.ovr ? i : b), 0);
  return (
    <div className={`mt ${phase}`} role="dialog" aria-modal="true" aria-label="Meteor-Einschlag" onClick={skip}>
      <div className="mt-sky" aria-hidden="true">
        {STREAKS.map((s, i) => <i key={i} className="mt-streak" style={{ top: `${s.top}%`, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }} />)}
      </div>
      <div className="mt-stage">
        {phase !== 'reveal' && (
          <span className="mt-rock" aria-hidden="true">
            <i className="mt-trail" /><i className="mt-core" />
            <b className="c1" /><b className="c2" /><b className="c3" /><b className="c4" />
          </span>
        )}
        {(phase === 'impact' || phase === 'reveal') && (
          <>
            <span className="mt-crater" aria-hidden="true" />
            <span className="mt-wave" aria-hidden="true" />
            <span className="mt-wave w2" aria-hidden="true" />
            <div className="mt-debris" aria-hidden="true">
              {DEBRIS.map((d, i) => <i key={i} style={{ '--x': `${d.x}px`, '--y': `${d.y}px`, '--r': `${d.r}deg`, '--s': d.s } as React.CSSProperties} />)}
            </div>
          </>
        )}
      </div>
      {phase === 'impact' && <span className="mt-flash" aria-hidden="true" />}

      {phase === 'reveal' && (
        <div className="mt-reward" onClick={(e) => e.stopPropagation()}>
          <h2 className="mt-title">Meteor-Einschlag</h2>
          <p className="mt-sub">{cards.length} Ikonen</p>
          <div className="mt-grid">
            {cards.map((c, i) => (
              <span key={c.card.id} className={`mt-card ${i === best ? 'best' : ''}`} style={{ '--i': i } as React.CSSProperties}>
                <UtCard card={c.card} size="sm" shine={i === best} />
                {!c.duplicate && <em className="mt-new">Neu</em>}
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
