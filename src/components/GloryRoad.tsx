import { useEffect, useRef, useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import {
  DROP_LABEL, DROP_ODDS, DROP_ORDER, DROPS_PER_DAY, ROAD, claimAllRoad, claimRoad, dropRewardText, dropsLeftToday, openDrop, roadReady, roadRewardText, roadState,
  type DropOpen, type RoadReward,
} from '../game/glory';
import Icon, { type IconName } from './Icon';

const fmt = (n: number) => n.toLocaleString('de-DE');
const roadIcon = (r: RoadReward): IconName => (r.kind === 'coins' ? 'coin' : r.kind === 'drops' ? 'spark' : 'pack');

/** Ruhmesweg: Belohnungsleiste für Trophäen aus Duellen und Karriere – plus Flutlicht-Drops öffnen. */
export default function GloryRoad({ onClose, onStore }: { onClose: () => void; onStore: () => void }) {
  const club = useClub();
  const [drop, setDrop] = useState<DropOpen | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const trophies = club.trophies ?? 0;
  const best = club.trophyBest ?? 0;
  const next = ROAD.find((s) => s.at > best);
  const prevAt = [...ROAD].reverse().find((s) => s.at <= best)?.at ?? 0;
  const ready = roadReady(club);
  const drops = club.drops ?? 0;

  // Zur nächsten offenen Stufe scrollen
  useEffect(() => {
    const el = listRef.current?.querySelector('.gr-step.ready, .gr-step.locked');
    el?.scrollIntoView({ block: 'center' });
  }, []);

  const open = () => {
    const res = openDrop(getClubState());
    if (!res) return;
    setClubState(res.club);
    setDrop(res);
  };

  return (
    <div className="overlay glory" role="dialog" aria-modal="true" aria-label="Ruhmesweg">
      <div className="overlay-inner">
        <header className="overlay-head"><button className="nav-back" onClick={onClose}>‹ Zurück</button></header>
        <section className="gr-hero">
          <span className="gr-kicker">Ruhmesweg</span>
          <div className="gr-score">
            <Icon name="trophy" size={34} />
            <strong>{fmt(trophies)}</strong>
            <small>Trophäen{best > trophies ? ` · Bestwert ${fmt(best)}` : ''}</small>
          </div>
          {next ? (
            <div className="gr-next">
              <span>Nächste Stufe bei <b>{fmt(next.at)}</b>: {roadRewardText(next.reward)}</span>
              <div className="gr-track"><i style={{ width: `${((best - prevAt) / (next.at - prevAt)) * 100}%` }} /></div>
            </div>
          ) : <p className="gr-next">Ruhmesweg komplett – Legende!</p>}
          <p className="gr-how">Duell-Sieg +10, Unentschieden +3, Niederlage −4 · jede Karriere-Saison +20, jeder Titel +10. Belohnungen zählen nach deinem Bestwert.</p>
        </section>

        <section className={`gr-drops ${drops ? 'has' : ''}`} aria-label="Flutlicht-Drops">
          <span className="gr-gem r-selten" aria-hidden="true"><i /></span>
          <div className="gr-drops-text">
            <strong>{drops ? `${drops} Flutlicht-Drop${drops > 1 ? 's' : ''} bereit` : 'Keine Drops'}</strong>
            <small>Für Duell-Siege (heute noch {dropsLeftToday(club)} von {DROPS_PER_DAY}) und auf dem Ruhmesweg. Packs landen in deiner Ablage.</small>
          </div>
          <button className="btn primary gr-open" disabled={!drops} onClick={open}>Öffnen</button>
        </section>
        <details className="gr-odds">
          <summary>Chancen</summary>
          <ul>{DROP_ORDER.map((r) => <li key={r} className={`r-${r}`}><b>{DROP_LABEL[r]}</b><span>{DROP_ODDS[r].toLocaleString('de-DE')} %</span></li>)}</ul>
        </details>

        <div className="gr-road-head">
          <h2 className="hub-section">Stufen</h2>
          {ready > 1 && <button className="btn secondary small" onClick={() => setClubState(claimAllRoad(getClubState()))}>Alle {ready} abholen</button>}
        </div>
        <ol className="gr-road" ref={listRef}>
          {ROAD.map((s) => {
            const st = roadState(club, s);
            const big = s.reward.kind === 'pack' && ['worldstar', 'icon', 'ultimate', 'goat'].includes(s.reward.pack) && s.at % 750 === 0;
            return (
              <li key={s.at} className={`gr-step ${st} ${big ? 'big' : ''}`}>
                <span className="gr-at"><Icon name="trophy" size={14} />{fmt(s.at)}</span>
                <span className="gr-reward"><Icon name={roadIcon(s.reward)} size={20} />{roadRewardText(s.reward)}</span>
                {st === 'ready' ? <button className="btn primary small" onClick={() => { const c = claimRoad(getClubState(), s.at); if (c) setClubState(c); }}>Abholen</button>
                  : st === 'claimed' ? <span className="gr-done"><Icon name="check" size={16} /></span>
                    : <span className="gr-lock"><Icon name="lock" size={14} /></span>}
              </li>
            );
          })}
        </ol>
      </div>
      {drop && <DropReveal key={drop.club.dropsOpened} drop={drop} left={getClubState().drops ?? 0} onNext={() => { setDrop(null); setTimeout(open, 50); }} onClose={() => setDrop(null)} onStore={onStore} />}
    </div>
  );
}

/** Drop-Enthüllung: Antippen hebt die Seltenheit Stufe für Stufe, bis die Belohnung erscheint. */
function DropReveal({ drop, left, onNext, onClose, onStore }: { drop: DropOpen; left: number; onNext: () => void; onClose: () => void; onStore: () => void }) {
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(false);
  const rarity = drop.steps[step];
  const last = step >= drop.steps.length - 1;
  const tap = () => {
    if (shown) return;
    if (!last) setStep(step + 1);
    else setShown(true);
  };
  return (
    <div className="drop-reveal" role="dialog" aria-modal="true" aria-label="Drop öffnen" onClick={tap}>
      <span className={`drop-rarity r-${rarity}`}>{DROP_LABEL[rarity]}</span>
      <span key={step} className={`gr-gem big r-${rarity} ${shown ? 'opened' : ''}`} aria-hidden="true"><i /></span>
      {!shown ? (
        <small className="drop-hint">{last ? 'Antippen zum Öffnen' : 'Antippen – vielleicht wird er seltener …'}</small>
      ) : (
        <div className="drop-result" onClick={(e) => e.stopPropagation()}>
          <strong>{dropRewardText(drop.reward)}</strong>
          <small>{drop.reward.kind === 'pack' ? 'Liegt in deiner Pack-Ablage im Store.' : 'Gutgeschrieben.'}</small>
          <div className="drop-actions">
            {left > 0 ? <button className="btn primary" onClick={onNext}>Nächster Drop ({left})</button> : <button className="btn primary" onClick={onClose}>Weiter</button>}
            {drop.reward.kind === 'pack' && <button className="btn secondary" onClick={() => { onClose(); onStore(); }}>Zur Ablage</button>}
          </div>
        </div>
      )}
    </div>
  );
}
