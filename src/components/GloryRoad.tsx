import { useEffect, useRef, useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import { DROPS_PER_DAY, ROAD, claimAllRoad, claimRoad, dropsLeftToday, roadReady, roadRewardText, roadState, type DropKind, type RoadReward } from '../game/glory';
import DropOpener from './DropOpener';
import Icon, { type IconName } from './Icon';

const fmt = (n: number) => n.toLocaleString('de-DE');
const roadIcon = (r: RoadReward): IconName => (r.kind === 'coins' ? 'coin' : r.kind === 'drops' ? 'spark' : 'pack');

/** Ruhmesweg: Belohnungsleiste für Trophäen aus Duellen und Karriere – plus Flutlicht-Drops öffnen und kaufen. */
export default function GloryRoad({ onClose, onStore }: { onClose: () => void; onStore: () => void }) {
  const club = useClub();
  const listRef = useRef<HTMLOListElement>(null);
  const trophies = club.trophies ?? 0;
  const best = club.trophyBest ?? 0;
  const next = ROAD.find((s) => s.at > best);
  const prevAt = [...ROAD].reverse().find((s) => s.at <= best)?.at ?? 0;
  const ready = roadReady(club);

  // Zur nächsten offenen Stufe scrollen
  useEffect(() => {
    listRef.current?.querySelector('.gr-step.ready, .gr-step.locked')?.scrollIntoView({ block: 'center' });
  }, []);

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

        <DropCenter onStore={onStore} />

        <div className="gr-road-head">
          <h2 className="hub-section">Stufen</h2>
          {ready > 1 && <button className="btn secondary small" onClick={() => setClubState(claimAllRoad(getClubState()))}>Alle {ready} abholen</button>}
        </div>
        <ol className="gr-road" ref={listRef}>
          {ROAD.map((s) => {
            const st = roadState(club, s);
            return (
              <li key={s.at} className={`gr-step ${st} ${s.at % 750 === 0 ? 'big' : ''}`}>
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
    </div>
  );
}

/** Eigene Drops öffnen (gekauft wird im Shop). */
export function DropCenter({ onStore }: { onStore?: () => void }) {
  const club = useClub();
  const [opening, setOpening] = useState<DropKind | null>(null);
  const drops = club.drops ?? 0;
  const mega = club.megaDrops ?? 0;
  return (
    <section className="dc" aria-label="Flutlicht-Drops">
      <div className="dc-own">
        <button className={`dc-slot ${drops ? 'has' : ''}`} disabled={!drops} onClick={() => setOpening('normal')}>
          <span className="dc-gem r-superselten" aria-hidden="true"><i /><b /></span>
          <span className="dc-slot-text"><strong>{drops}× Flutlicht-Drop</strong><small>{drops ? 'Antippen zum Öffnen' : `Duell-Siege: heute noch ${dropsLeftToday(club)} von ${DROPS_PER_DAY}`}</small></span>
        </button>
        <button className={`dc-slot mega ${mega ? 'has' : ''}`} disabled={!mega} onClick={() => setOpening('mega')}>
          <span className="dc-gem r-legendaer" aria-hidden="true"><i /><b /></span>
          <span className="dc-slot-text"><strong>{mega}× Mega-Drop</strong><small>{mega ? 'Antippen zum Öffnen' : 'Mindestens Episch'}</small></span>
        </button>
      </div>
      {onStore && <button className="btn secondary small dc-buy" onClick={onStore}><Icon name="bag" size={16} />Drops im Shop kaufen</button>}
      {opening && <DropOpener kind={opening} onClose={() => setOpening(null)} onStore={onStore} />}
    </section>
  );
}
