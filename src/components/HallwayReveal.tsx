import { useEffect, useRef, useState } from 'react';
import type { PackResult } from '../game/club';
import { motionReduced } from '../settings';
import { play, playCharge } from '../sound';
import UtCard from './UtCard';

// Flur-Kiste (Codes HALLWAY, TAUBE) – inspiriert vom Roblox-Spiel „The Hallway“:
// Ein roter Flur, das Licht flackert, am Ende kommen die Lampen näher. Drei Türen – hinter einer sitzt die Taube.
// Falsche Tür: Beben, roter Blitz, die Lampen rücken auf. Spätestens beim zweiten Versuch wird die Taube gefunden.
// Dann: Licht bricht aus der Tür, die Taube erscheint, die Karten fliegen heraus. Antippen außerhalb der Türen überspringt.

type Phase = 'enter' | 'doors' | 'found' | 'reveal';
const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
const vibrate = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* egal */ } };
const RAYS = Array.from({ length: 12 }, (_, i) => i * 30);
const DUST = Array.from({ length: 16 }, (_, i) => ({ x: (i * 37) % 100, d: (i % 6) * 0.4, s: 0.5 + (i % 3) * 0.3 }));

export default function HallwayReveal({ result, title = 'Der Flur', onClose, onCollection }: { result: PackResult; title?: string; onClose: () => void; onCollection?: () => void }) {
  const [phase, setPhase] = useState<Phase>(() => (motionReduced() ? 'reveal' : 'enter'));
  const [opened, setOpened] = useState<number[]>([]);
  const [danger, setDanger] = useState(0);
  const [hit, setHit] = useState(0);
  const [pigeonAt, setPigeonAt] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stopTone = useRef<() => void>(() => {});
  const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  useEffect(() => {
    if (phase !== 'enter') return;
    stopTone.current = playCharge(1300);
    vibrate([8, 120, 8, 200, 8]);
    at(1300, () => setPhase('doors'));
    return () => { timers.current.forEach(clearTimeout); timers.current = []; stopTone.current(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const found = (door: number) => {
    setPigeonAt(door);
    setOpened((o) => [...o, door]);
    sfx('revealRare');
    vibrate([30, 40, 120]);
    at(250, () => setPhase('found'));
    at(1500, () => { setPhase('reveal'); sfx('fanfare'); });
  };
  const pick = (door: number) => {
    if (phase !== 'doors' || opened.includes(door) || pigeonAt !== null) return;
    // Erster Versuch: 1/3 Glück. Danach ist die Taube garantiert hinter der nächsten Tür.
    if (opened.length >= 1 || Math.random() < 1 / 3) { found(door); return; }
    setOpened((o) => [...o, door]);
    setDanger((d) => d + 1);
    setHit((h) => h + 1);
    sfx('fall');
    vibrate([120, 40, 160]);
  };
  const skip = () => {
    if (phase === 'reveal') return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    stopTone.current();
    setPhase('reveal');
    sfx('fanfare');
  };

  const cards = result.cards;
  const best = cards.reduce((b, c, i) => (c.card.ovr > cards[b].card.ovr ? i : b), 0);
  return (
    <div className={`mt hw ${phase} d${danger}`} role="dialog" aria-modal="true" aria-label={title} onClick={skip}>
      {/* Flur in Fluchtperspektive */}
      <div className="hw-hall" aria-hidden="true">
        <i className="hw-ceil" /><i className="hw-floor" /><i className="hw-wall l" /><i className="hw-wall r" />
        <i className="hw-sconce l1" /><i className="hw-sconce r1" /><i className="hw-sconce l2" /><i className="hw-sconce r2" />
        <span className="hw-lamps">
          <span className="hw-lamp a"><i className="shade" /><i className="pole" /><i className="beam" /></span>
          <span className="hw-lamp b"><i className="shade" /><i className="pole" /><i className="beam" /></span>
        </span>
        <span className="hw-dust">{DUST.map((d, i) => <i key={i} style={{ left: `${d.x}%`, animationDelay: `${d.d}s`, transform: `scale(${d.s})` }} />)}</span>
      </div>
      <span className="hw-vignette" aria-hidden="true" />
      {hit > 0 && <span key={hit} className="mt-flash hw-flash" aria-hidden="true" />}

      {phase === 'enter' && <div className="hw-intro"><small>Code eingelöst</small><b>The Hallway</b><span>Irgendwo hier ist die Taube …</span></div>}

      {phase === 'doors' && (
        <div className="hw-doors" onClick={(e) => e.stopPropagation()}>
          <p className="hw-hint">{danger === 0 ? 'Finde die Taube – bevor die Lampen dich erreichen!' : 'Leer! Die Lampen kommen näher … schnell!'}</p>
          <div className="hw-row">
            {[0, 1, 2].map((d) => {
              const open = opened.includes(d);
              return (
                <button key={d} className={`hw-door ${open ? (pigeonAt === d ? 'win' : 'empty') : ''}`} onClick={() => pick(d)} disabled={open} aria-label={`Tür ${d + 1}`}>
                  <i className="leaf"><i className="knob" /><i className="num">{d + 1}</i></i>
                  <i className="inside" />
                </button>
              );
            })}
          </div>
          <div className="hw-danger" aria-label="Wie nah die Lampen sind"><span>Lampen</span><i style={{ transform: `scaleX(${0.25 + danger * 0.35})` }} /></div>
        </div>
      )}

      {phase === 'found' && (
        <div className="hw-found" aria-hidden="true">
          <span className="hw-rays">{RAYS.map((r) => <i key={r} style={{ transform: `rotate(${r}deg)` }} />)}</span>
          <img className="hw-pigeon" src="/news/the-hallway-pigeon.webp" alt="" />
          <b>Taube gefunden!</b>
        </div>
      )}

      {phase === 'reveal' && (
        <div className="mt-reward" onClick={(e) => e.stopPropagation()}>
          <h2 className="mt-title hw-title">{title}</h2>
          <p className="mt-sub hw-sub">{opened.length <= 1 && pigeonAt !== null ? 'Beim ersten Versuch gefunden!' : 'Den Lampen gerade so entkommen'} · {cards.length} Karten</p>
          <div className="mt-grid">
            {cards.map((c, i) => (
              <span key={`${c.card.id}-${i}`} className={`mt-card hw-card ${i === best ? 'best' : ''}`} style={{ '--i': i } as React.CSSProperties}>
                <UtCard card={c.card} size="sm" shine={i === best} />
                {!c.duplicate && <em className="mt-new hw-new">Neu</em>}
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
