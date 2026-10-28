import { useEffect, useRef, useState } from 'react';
import { getClubState, setClubState } from '../clubStore';
import { DROP_LABEL, DROP_ORDER, dropRewardText, openDrop, type DropKind, type DropOpen, type DropRarity } from '../game/glory';
import { play, playCharge } from '../sound';
import UtCard from './UtCard';

// ---------- Drop öffnen: gedrückt halten, Risse, Scherben ----------
// Halten lädt den Edelstein auf (Ring, steigender Ton, Vibration). Beim Loslassen trifft man ihn:
// Jeder Treffer reißt ihn weiter auf – Licht der nächsten Seltenheit dringt durch die Risse und er springt
// eine Stufe höher. Ist die Seltenheit erreicht, zerspringt er beim letzten Treffer in Scherben,
// die leuchtend am Boden liegen bleiben – der nächste Drop landet mitten zwischen ihnen.

const CHARGE_MS = 650;
const MIN_CHARGE = 0.35;

const vibrate = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* nicht unterstützt */ } };
const RUMBLE: Record<DropRarity, number[]> = {
  selten: [30], superselten: [40, 30, 40], episch: [60, 40, 60], mythisch: [80, 40, 80, 40, 120], legendaer: [120, 50, 120, 50, 260],
};

/** Ablauf eines Drops: so viele Treffer, wie Stufen aufsteigen, plus zwei bis zum Zerspringen. */
interface Shard { id: number; x: number; y: number; r: number; s: number; color: string; shape: number; old: boolean }
const COLOR: Record<DropRarity, string> = { selten: '#5fd39a', superselten: '#4aa8ff', episch: '#b36bff', mythisch: '#ff4d6d', legendaer: '#ffd24a' };
let shardSeq = 0;

function makeShards(rarity: DropRarity): Shard[] {
  const n = 10 + DROP_ORDER.indexOf(rarity) * 3;
  return Array.from({ length: n }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    return {
      id: shardSeq++,
      // Endpunkt: verteilt über den Boden (in % der Bühne), leicht zur Seite geschleudert
      x: 50 + side * (8 + Math.random() * 40),
      y: 78 + Math.random() * 16,
      r: Math.round(Math.random() * 720 - 360),
      s: 0.6 + Math.random() * 0.9,
      color: COLOR[rarity],
      shape: i % 4,
      old: false,
    };
  });
}

export default function DropOpener({ kind, onClose, onStore }: { kind: DropKind; onClose: () => void; onStore?: () => void }) {
  const [drop, setDrop] = useState<DropOpen | null>(null);
  const [hits, setHits] = useState(0);
  const [charge, setCharge] = useState(0);
  const [shards, setShards] = useState<Shard[]>([]);
  const [flash, setFlash] = useState(0);
  const stopTone = useRef<() => void>(() => {});
  const holdStart = useRef<number | null>(null);
  const raf = useRef(0);
  const buzz = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = () => {
    const res = openDrop(getClubState(), Math.random, Date.now(), kind);
    if (!res) { onClose(); return; }
    setClubState(res.club);
    setDrop(res);
    setHits(0);
    setCharge(0);
    // Alte Scherben bleiben liegen, werden aber dunkler (höchstens 60)
    setShards((s) => s.map((x) => ({ ...x, old: true })).slice(-60));
  };
  useEffect(() => { next(); return () => { cancelAnimationFrame(raf.current); stopTone.current(); if (buzz.current) clearInterval(buzz.current); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!drop) return null;
  const upgrades = drop.steps.length - 1;
  const total = upgrades + 2;
  const shattered = hits >= total;
  const rarity = drop.steps[Math.min(hits, upgrades)];
  // Risse: wachsen mit jedem Treffer seit dem letzten Aufstieg, und beim vorletzten Treffer am stärksten
  const crack = shattered ? 0 : hits < upgrades ? Math.min(2, hits) : hits === upgrades ? 1 : 3;
  const nextRarity = hits < upgrades ? drop.steps[hits + 1] : rarity;
  const left = kind === 'mega' ? getClubState().megaDrops ?? 0 : getClubState().drops ?? 0;

  const tick = () => {
    if (holdStart.current === null) return;
    const p = Math.min(1, (performance.now() - holdStart.current) / CHARGE_MS);
    setCharge(p);
    if (p < 1) raf.current = requestAnimationFrame(tick);
  };
  const down = (e: { preventDefault: () => void }) => {
    if (shattered || holdStart.current !== null) return;
    e.preventDefault();
    holdStart.current = performance.now();
    stopTone.current = playCharge(CHARGE_MS);
    vibrate(10);
    buzz.current = setInterval(() => vibrate(8), 120);
    raf.current = requestAnimationFrame(tick);
  };
  const up = () => {
    if (holdStart.current === null) return;
    const p = Math.min(1, (performance.now() - holdStart.current) / CHARGE_MS);
    holdStart.current = null;
    cancelAnimationFrame(raf.current);
    stopTone.current();
    if (buzz.current) { clearInterval(buzz.current); buzz.current = null; }
    setCharge(0);
    if (p < MIN_CHARGE) return; // zu kurz – er beruhigt sich wieder
    const h = hits + 1;
    setHits(h);
    setFlash((f) => f + 1);
    if (h >= total) {
      setShards((s) => [...s, ...makeShards(drop.rarity)]);
      vibrate(RUMBLE[drop.rarity]);
      try { play(drop.rarity === 'legendaer' ? 'walkout' : drop.rarity === 'mythisch' ? 'revealRare' : 'reveal'); } catch { /* kein Ton */ }
    } else if (h <= upgrades) {
      vibrate([30, 20, 50]);
      try { play('revealRare'); } catch { /* kein Ton */ }
    } else {
      vibrate(25);
      try { play('packRip'); } catch { /* kein Ton */ }
    }
  };

  return (
    <div className={`dopen r-${rarity} ${shattered ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Drop öffnen"
      onPointerUp={up} onPointerCancel={up} onPointerLeave={up}>
      <span className="dr-rays" aria-hidden="true" />
      <span className="dr-beam l" aria-hidden="true" /><span className="dr-beam r" aria-hidden="true" />
      <div className="dopen-floor" aria-hidden="true">
        {shards.map((s) => (
          <i key={s.id} className={`shard sh-${s.shape} ${s.old ? 'old' : ''}`}
            style={{ '--x': `${s.x}%`, '--y': `${s.y}%`, '--r': `${s.r}deg`, '--s': s.s, '--c': s.color } as React.CSSProperties} />
        ))}
      </div>

      <span key={`r-${rarity}`} className="drop-rarity">{DROP_LABEL[rarity]}</span>
      {kind === 'mega' && !shattered && <span className="dr-mega">Mega-Drop</span>}

      {!shattered && (
        <button className={`dopen-gem ${charge > 0 ? 'charging' : ''} crack-${crack}`} onPointerDown={down} aria-label="Gedrückt halten und loslassen"
          onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) down(e); }} onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') up(); }}
          style={{ '--charge': charge, '--next': COLOR[nextRarity] } as React.CSSProperties}>
          <svg className="dopen-ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="46" className="bg" />
            <circle cx="50" cy="50" r="46" className="fg" style={{ strokeDashoffset: 289 * (1 - charge) }} />
          </svg>
          <span key={`g-${hits}`} className={`dc-gem huge r-${rarity} ${hits > 0 ? 'hit' : ''}`}><i /><b /></span>
          <svg className="dopen-cracks" viewBox="0 0 100 116" aria-hidden="true">
            <g className="c1"><path d="M50 8 L46 30 L54 42 L48 58" /><path d="M54 42 L68 50" /></g>
            <g className="c2"><path d="M48 58 L40 74 L44 92" /><path d="M68 50 L86 46" /><path d="M46 30 L28 34 L18 30" /></g>
            <g className="c3"><path d="M40 74 L22 80" /><path d="M44 92 L58 104" /><path d="M86 46 L80 70 L66 82" /><path d="M28 34 L22 56 L30 66" /></g>
          </svg>
        </button>
      )}
      <span key={`f-${flash}`} className={`dr-flash ${flash ? '' : 'off'}`} aria-hidden="true" />

      {!shattered ? (
        <small className="drop-hint">{hits === 0 ? 'Gedrückt halten – und loslassen' : hits < upgrades ? 'Weiter! Er wird seltener …' : hits === upgrades ? 'Noch zwei Treffer' : 'Gleich zerspringt er!'}</small>
      ) : (
        <div className="drop-result" onPointerDown={(e) => e.stopPropagation()}>
          {drop.reward.kind === 'card' && <UtCard card={drop.reward.card} size="md" shine />}
          <strong>{dropRewardText(drop.reward)}</strong>
          <small>{drop.reward.kind === 'pack' ? 'Liegt in deiner Pack-Ablage.' : drop.reward.kind === 'card' ? (drop.duplicate ? 'Doppelt – in deiner Sammlung.' : 'Neu in deiner Sammlung!') : 'Gutgeschrieben.'}</small>
          <div className="drop-actions">
            {left > 0 && <button className="btn primary" onClick={next}>Nächster Drop ({left})</button>}
            <button className={`btn ${left > 0 ? 'secondary' : 'primary'}`} onClick={onClose}>{left > 0 ? 'Später' : 'Weiter'}</button>
            {drop.reward.kind === 'pack' && onStore && <button className="btn secondary" onClick={() => { onClose(); onStore(); }}>Zur Ablage</button>}
          </div>
        </div>
      )}
    </div>
  );
}
