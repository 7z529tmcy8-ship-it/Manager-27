import { useEffect, useRef, useState } from 'react';
import type { PackResult } from '../game/club';
import { motionReduced } from '../settings';
import { play, playCharge } from '../sound';
import UtCard from './UtCard';

// Eissturm-Drop (Code EISSTURM): Schneesturm, Frost kriecht vom Rand herein → ein Eiskristall wächst und bekommt Risse
// → er zerspringt (Blitz, Splitter, Kältewelle) → die Karten schneien von oben herein. Antippen überspringt.

type Phase = 'storm' | 'form' | 'shatter' | 'reveal';
const T = { storm: 1200, form: 1100, shatter: 550 };
const vibrate = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* nicht unterstützt */ } };

/** Feste Werte, damit nichts springt. */
const FLAKES = Array.from({ length: 26 }, (_, i) => ({ left: (i * 37) % 100, delay: (i % 9) * 0.13, dur: 0.7 + (i % 5) * 0.12, s: 0.5 + (i % 4) * 0.25 }));
const SHARDS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 + (i % 2 ? 0.15 : -0.1);
  const d = 130 + (i % 4) * 45;
  return { x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d), r: (i * 53) % 360, s: 0.6 + (i % 3) * 0.3 };
});
const CRACKS = [-62, -18, 24, 71, 118, 160, 205, 250, 300];

export default function FrostReveal({ result, onClose, onCollection }: { result: PackResult; onClose: () => void; onCollection?: () => void }) {
  const [phase, setPhase] = useState<Phase>(() => (motionReduced() ? 'reveal' : 'storm'));
  const stopTone = useRef<() => void>(() => {});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (phase !== 'storm') return;
    stopTone.current = playCharge(T.storm + T.form);
    vibrate([8, 80, 8, 80, 12]);
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    at(T.storm, () => { setPhase('form'); vibrate([10, 40, 10, 40, 10, 40, 20]); });
    at(T.storm + T.form, () => {
      stopTone.current();
      setPhase('shatter');
      try { play('walkout'); } catch { /* kein Ton */ }
      vibrate([90, 30, 160]);
    });
    at(T.storm + T.form + T.shatter, () => { setPhase('reveal'); try { play('fanfare'); } catch { /* kein Ton */ } });
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
    <div className={`mt ft ${phase}`} role="dialog" aria-modal="true" aria-label="Eissturm" onClick={skip}>
      <div className="ft-snow" aria-hidden="true">
        {FLAKES.map((f, i) => <i key={i} style={{ left: `${f.left}%`, animationDelay: `${f.delay}s`, animationDuration: `${f.dur}s`, '--s': f.s } as React.CSSProperties} />)}
      </div>
      <span className="ft-frost tl" aria-hidden="true" /><span className="ft-frost tr" aria-hidden="true" />
      <span className="ft-frost bl" aria-hidden="true" /><span className="ft-frost br" aria-hidden="true" />

      <div className="mt-stage">
        {(phase === 'storm' || phase === 'form') && (
          <span className="ft-crystal" aria-hidden="true">
            <i className="ft-core" />
            {CRACKS.map((r, i) => <b key={r} className="ft-crack" style={{ '--r': `${r}deg`, '--d': `${i * 0.1}s` } as React.CSSProperties} />)}
          </span>
        )}
        {(phase === 'shatter' || phase === 'reveal') && (
          <>
            <span className="ft-wave" aria-hidden="true" />
            <span className="ft-wave w2" aria-hidden="true" />
            <div className="ft-shards" aria-hidden="true">
              {SHARDS.map((d, i) => <i key={i} style={{ '--x': `${d.x}px`, '--y': `${d.y}px`, '--r': `${d.r}deg`, '--s': d.s } as React.CSSProperties} />)}
            </div>
          </>
        )}
      </div>
      {phase === 'shatter' && <span className="mt-flash ft-flash" aria-hidden="true" />}

      {phase === 'reveal' && (
        <div className="mt-reward" onClick={(e) => e.stopPropagation()}>
          <h2 className="mt-title ft-title">Eissturm</h2>
          <p className="mt-sub ft-sub">{cards.length} Karten aus dem Eis</p>
          <div className="mt-grid">
            {cards.map((c, i) => (
              <span key={c.card.id} className={`mt-card ft-card ${i === best ? 'best' : ''}`} style={{ '--i': i } as React.CSSProperties}>
                <UtCard card={c.card} size="sm" shine={i === best} />
                {!c.duplicate && <em className="mt-new ft-new">Neu</em>}
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
