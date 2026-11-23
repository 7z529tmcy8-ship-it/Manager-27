import { useEffect, useRef, useState } from 'react';
import { ROAD_LANES, ROAD_LEVELS, RTP, roadMult, roadStep, type RoadLevel } from '../../game/casino';
import { motionReduced } from '../../settings';
import { playStep } from '../../sound';
import Icon from '../Icon';
import { BetPicker, GameFrame, bet, buzz, celebrate, fmt, fmtShort, settle, sfx, shake, useBet } from './shared';

const LANE_H = 66;
const LEVELS = Object.keys(ROAD_LEVELS) as RoadLevel[];
const multTxt = (m: number) => (m >= 1000 ? `${fmtShort(Math.round(m))}` : m.toFixed(2).replace('.', ','));

/** Straßen-Sprint: Die Neon-Figur hüpft Fahrbahn für Fahrbahn nach oben, der Multiplikator steigt – kassieren, bevor ein Auto kommt. */
export default function Road({ onClose }: { onClose: () => void }) {
  const [stake, setStake] = useBet('road', 50);
  const [level, setLevel] = useState<RoadLevel>(() => { try { return (sessionStorage.getItem('fc-road-level') as RoadLevel) || 'mid'; } catch { return 'mid'; } });
  const [run, setRun] = useState<{ stake: number; step: number; state: 'go' | 'hit' | 'cash' | 'done'; hop: number } | null>(null);
  const [pop, setPop] = useState<{ id: number; text: string } | null>(null);
  const [hist, setHist] = useState<{ id: number; m: number; ok: boolean }[]>([]);
  const busy = useRef(false);
  const fast = motionReduced();
  const playing = run?.state === 'go';
  const step = run?.step ?? 0;
  const mult = roadMult(level, step);
  const next = roadMult(level, step + 1);
  const hitPct = Math.round(ROAD_LEVELS[level].hit * 100);
  const pickLevel = (l: RoadLevel) => { if (playing) return; setLevel(l); try { sessionStorage.setItem('fc-road-level', l); } catch { /* egal */ } };

  const start = () => {
    if (playing || !bet(stake)) return;
    setRun({ stake, step: 0, state: 'go', hop: 0 });
    sfx('whistle'); buzz(20);
  };
  const go = async () => {
    if (!run || run.state !== 'go' || busy.current) return;
    busy.current = true;
    const ok = roadStep(level);
    const s = run.step + 1;
    setRun({ ...run, hop: run.hop + 1 }); // Sprung-Animation startet
    sfx('tap');
    await new Promise((r) => setTimeout(r, fast ? 30 : 230));
    if (!ok) {
      setRun({ ...run, step: s, state: 'hit', hop: run.hop + 1 });
      sfx('boom'); sfx('fall'); buzz([80, 40, 160]); shake(true);
      settle({ game: 'road', bet: run.stake, win: 0, mult: roadMult(level, s) });
      setHist((h) => [{ id: Date.now(), m: roadMult(level, s), ok: false }, ...h].slice(0, 8));
      setTimeout(() => setRun((r) => (r && r.state === 'hit' ? { ...r, state: 'done' } : r)), 1200);
    } else {
      const m = roadMult(level, s);
      playStep(Math.min(20, s + 2)); buzz(15);
      setPop({ id: Date.now(), text: `${multTxt(m)}×` });
      if (m >= 10 && roadMult(level, s - 1) < 10) { sfx('revealRare'); celebrate(10); }
      if (s >= ROAD_LANES) { setRun({ ...run, step: s, state: 'go', hop: run.hop + 1 }); busy.current = false; cash(s); return; }
      setRun({ ...run, step: s, state: 'go', hop: run.hop + 1 });
    }
    busy.current = false;
  };
  const cash = (s = step) => {
    if (!run || run.state !== 'go' || s <= 0) return;
    const m = roadMult(level, s);
    const win = Math.floor(run.stake * m);
    setRun({ ...run, step: s, state: 'cash' });
    settle({ game: 'road', bet: run.stake, win, mult: m });
    setHist((h) => [{ id: Date.now(), m, ok: true }, ...h].slice(0, 8));
    if (m >= 3) celebrate(m);
    setTimeout(() => setRun((r) => (r && r.state === 'cash' ? { ...r, state: 'done' } : r)), 1400);
  };
  // Leertaste / Enter = Schritt
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (playing) void go(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  // Kamera: die aktuelle Fahrbahn bleibt im unteren Drittel
  const view = 5.5;
  const camLane = Math.max(0, step - 1);
  const offset = Math.min(camLane * LANE_H, (ROAD_LANES + 1 - view) * LANE_H);
  const heat = Math.min(1, Math.log10(Math.max(1, mult)) / 2.2);
  const lost = run?.state === 'hit' || (run?.state === 'done' && run.step > 0 && !hist[0]?.ok);

  return (
    <GameFrame title="Straßen-Sprint" onClose={onClose} className="cz-road"
      odds={`Jede Fahrbahn: ${LEVELS.map((l) => `${ROAD_LEVELS[l].label} ${Math.round(ROAD_LEVELS[l].hit * 100)} % Unfall`).join(' · ')}. Der Multiplikator ist so berechnet, dass du bei jedem Ausstieg im Schnitt ${Math.round(RTP * 100)} % zurückbekommst (Auszahlungsquote ${Math.round(RTP * 100)} %). ${ROAD_LANES} Fahrbahnen, bis ${fmtShort(roadMult('hardcore', ROAD_LANES))}× auf Hardcore.`}>
      <div className={`rd-hud ${playing ? 'on' : ''}`} style={{ '--heat': heat } as React.CSSProperties}>
        <span><small>Aktuell</small><b>{multTxt(mult)}×</b></span>
        <span><small>Gewinn</small><b className="gold">{run ? fmt(Math.floor(run.stake * mult)) : '–'}</b></span>
        <span><small>Nächste</small><b>{step < ROAD_LANES ? `${multTxt(next)}×` : '–'}</b><em>{hitPct} % Risiko</em></span>
      </div>

      <div className={`rd-road ${lost ? 'lost' : ''} ${run?.state === 'cash' ? 'won' : ''}`} style={{ height: LANE_H * view, '--heat': heat } as React.CSSProperties}>
        <div className="rd-world" style={{ transform: `translate3d(0, ${offset}px, 0)` }}>
          {Array.from({ length: ROAD_LANES + 1 }, (_, lane) => {
            // Nur Fahrbahnen in Sichtweite zeichnen – spart auf schwachen Geräten viel Arbeit.
            if (lane < camLane - 2 || lane > camLane + 7) return null;
            const crossed = lane > 0 && lane <= step && !(lost && lane === step);
            const isNext = lane === step + 1 && playing;
            const kind = lane === 0 ? 'start' : lane === ROAD_LANES ? 'goal' : 'road';
            return (
              <div key={lane} className={`rd-lane k-${kind} ${crossed ? 'done' : ''} ${isNext ? 'next' : ''}`} style={{ transform: `translate3d(0, ${-lane * LANE_H}px, 0)`, height: LANE_H }}>
                {kind === 'road' && !crossed && <i className={`rd-track ${lane % 2 ? 'ltr' : 'rtl'}`} style={{ animationDuration: `${1.6 + (lane % 5) * 0.32}s`, animationDelay: `${-((lane * 0.61) % 2)}s` }}><i className={`rd-car c${lane % 4}`} /></i>}
                {kind === 'goal' && <span className="rd-goal">Ziel</span>}
                {lane > 0 && (
                  <span className={`rd-plate ${crossed ? 'done' : ''} ${isNext ? 'next' : ''}`}>
                    {crossed ? <Icon name="check" size={18} /> : <>{multTxt(roadMult(level, lane))}<small>×</small></>}
                  </span>
                )}
                {crossed && kind === 'road' && <i className="rd-cone l" />}
                {crossed && kind === 'road' && <i className="rd-cone r" />}
                {lost && lane === step && <i className="rd-crash" />}
              </div>
            );
          })}
          <span className={`rd-runner ${lost ? 'hit' : ''} ${run?.state === 'cash' ? 'cash' : ''}`} style={{ transform: `translate3d(-50%, ${-(step * LANE_H + LANE_H / 2)}px, 0)` }} aria-hidden="true">
            <i key={run?.hop ?? 0} />
          </span>
        </div>
        {pop && <span key={pop.id} className="rd-pop">{pop.text}</span>}
        {run?.state === 'cash' && <div className="rd-banner win"><small>Kassiert</small><b>+{fmt(Math.floor(run.stake * roadMult(level, run.step)))}</b></div>}
        {lost && <div className="rd-banner lose"><small>Erwischt auf Fahrbahn {run?.step}</small><b>Nochmal!</b></div>}
      </div>

      <div className="cz-history">{hist.map((h) => <span key={h.id} className={h.ok ? 'hi' : 'lo'}>{multTxt(h.m)}×</span>)}</div>

      <div className="cz-actions">
        {playing ? (
          <>
            <button className="cz-cta rd-go" onClick={() => void go()}><Icon name="rise" size={20} /> Weiter · {multTxt(next)}×</button>
            <button className="cz-cta cash rd-cash" disabled={step === 0} onClick={() => cash()}>Kassieren<small>{fmt(Math.floor((run?.stake ?? 0) * mult))}</small></button>
          </>
        ) : <button className="cz-cta" onClick={start}>Los · {fmt(stake)}</button>}
      </div>
      <div className="cz-chipsel" role="radiogroup" aria-label="Schwierigkeit">
        <small>Schwierigkeit</small>
        {LEVELS.map((l) => <button key={l} className={`rl-${l} ${level === l ? 'on' : ''}`} disabled={playing} onClick={() => pickLevel(l)}>{ROAD_LEVELS[l].label}</button>)}
      </div>
      {!playing && <BetPicker value={stake} onChange={setStake} />}
    </GameFrame>
  );
}
