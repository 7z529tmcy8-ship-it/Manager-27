import { useEffect, useRef, useState } from 'react';
import type { PackResult } from '../game/club';
import { motionReduced } from '../settings';
import { play, playCharge } from '../sound';
import UtCard from './UtCard';

// Tresor-Drop (Code TRESOR): Eine schwere Tresortür. Das Rad dreht in drei Rucken, drei Lampen springen auf Grün
// → die Tür schwingt auf, goldenes Licht strahlt heraus → Blitz → fünf neue Karten fliegen aus dem Tresor. Antippen überspringt.

type Phase = 'lock' | 'open' | 'burst' | 'reveal';
const T = { lock: 1500, open: 950, burst: 450 };
const CLICKS = [300, 700, 1100];
const vibrate = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* nicht unterstützt */ } };
const BOLTS = Array.from({ length: 12 }, (_, i) => i * 30);
const RAYS = Array.from({ length: 10 }, (_, i) => i * 36);
const SPARKS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  const d = 120 + (i % 4) * 40;
  return { x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d), r: (i * 47) % 360, s: 0.6 + (i % 3) * 0.25 };
});

export default function VaultReveal({ result, onClose, onCollection }: { result: PackResult; onClose: () => void; onCollection?: () => void }) {
  const [phase, setPhase] = useState<Phase>(() => (motionReduced() ? 'reveal' : 'lock'));
  const [clicks, setClicks] = useState(0);
  const stopTone = useRef<() => void>(() => {});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (phase !== 'lock') return;
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    CLICKS.forEach((ms, i) => at(ms, () => { setClicks(i + 1); try { play('tap'); } catch { /* kein Ton */ } vibrate(25); }));
    at(T.lock, () => {
      setPhase('open');
      stopTone.current = playCharge(T.open);
      vibrate([20, 40, 20, 40, 60]);
    });
    at(T.lock + T.open, () => {
      stopTone.current();
      setPhase('burst');
      try { play('walkout'); } catch { /* kein Ton */ }
      vibrate([80, 30, 140]);
    });
    at(T.lock + T.open + T.burst, () => { setPhase('reveal'); try { play('fanfare'); } catch { /* kein Ton */ } });
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
    <div className={`mt vt ${phase}`} role="dialog" aria-modal="true" aria-label="Tresor" onClick={skip}>
      <div className="mt-stage">
        {phase !== 'reveal' && (
          <div className="vt-vault" aria-hidden="true">
            <span className="vt-glow" />
            <span className="vt-rays">{RAYS.map((r) => <i key={r} style={{ '--r': `${r}deg` } as React.CSSProperties} />)}</span>
            <span className="vt-frame" />
            <span className="vt-door">
              {BOLTS.map((r) => <b key={r} className="vt-bolt" style={{ '--r': `${r}deg` } as React.CSSProperties} />)}
              <span className="vt-wheel" style={{ '--turn': `${clicks * 120}deg` } as React.CSSProperties}><i /><i /><i /><em /></span>
              <span className="vt-lamps">{[0, 1, 2].map((i) => <i key={i} className={i < clicks ? 'on' : ''} />)}</span>
            </span>
          </div>
        )}
        {(phase === 'burst' || phase === 'reveal') && (
          <>
            <span className="vt-wave" aria-hidden="true" />
            <div className="vt-sparks" aria-hidden="true">
              {SPARKS.map((d, i) => <i key={i} style={{ '--x': `${d.x}px`, '--y': `${d.y}px`, '--r': `${d.r}deg`, '--s': d.s } as React.CSSProperties} />)}
            </div>
          </>
        )}
      </div>
      {phase === 'burst' && <span className="mt-flash vt-flash" aria-hidden="true" />}

      {phase === 'reveal' && (
        <div className="mt-reward" onClick={(e) => e.stopPropagation()}>
          <h2 className="mt-title vt-title">Tresor geknackt</h2>
          <p className="mt-sub vt-sub">{cards.length} {cards.length === 1 ? 'neue Karte' : 'neue Karten'} – keine davon hattest du schon</p>
          <div className="mt-grid">
            {cards.map((c, i) => (
              <span key={c.card.id} className={`mt-card vt-card ${i === best ? 'best' : ''}`} style={{ '--i': i } as React.CSSProperties}>
                <UtCard card={c.card} size="sm" shine={i === best} />
                <em className="mt-new vt-new">Neu</em>
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
