import { useEffect, useRef, useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import {
  DROP_LABEL, DROP_ODDS, DROP_ORDER, DROP_SHOP, DROPS_PER_DAY, MEGA_ODDS, ROAD, buyDrops, claimAllRoad, claimRoad, dropRewardText, dropsLeftToday, openDrop,
  roadReady, roadRewardText, roadState, type DropKind, type DropOpen, type RoadReward,
} from '../game/glory';
import { play } from '../sound';
import Icon, { type IconName } from './Icon';
import UtCard from './UtCard';

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

/** Drops öffnen und kaufen – im Ruhmesweg und im Store. */
export function DropCenter({ onStore }: { onStore?: () => void }) {
  const club = useClub();
  const [drop, setDrop] = useState<DropOpen | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const drops = club.drops ?? 0;
  const mega = club.megaDrops ?? 0;

  const open = (kind: DropKind) => {
    const res = openDrop(getClubState(), Math.random, Date.now(), kind);
    if (!res) return;
    setClubState(res.club);
    setDrop(res);
  };
  const buy = (id: string) => {
    const offer = DROP_SHOP.find((o) => o.id === id)!;
    const res = buyDrops(getClubState(), id);
    if (!res) { setMsg(`Dir fehlen ${fmt(offer.price - getClubState().coins)} Coins.`); setTimeout(() => setMsg(null), 2200); return; }
    setClubState(res);
    open(offer.kind);
  };
  const left = drop ? (drop.kind === 'mega' ? getClubState().megaDrops ?? 0 : getClubState().drops ?? 0) : 0;

  return (
    <section className="dc" aria-label="Flutlicht-Drops">
      <div className="dc-own">
        <button className={`dc-slot ${drops ? 'has' : ''}`} disabled={!drops} onClick={() => open('normal')}>
          <span className="dc-gem r-superselten" aria-hidden="true"><i /><b /></span>
          <span className="dc-slot-text"><strong>{drops}× Flutlicht-Drop</strong><small>{drops ? 'Antippen zum Öffnen' : `Duell-Siege: heute noch ${dropsLeftToday(club)} von ${DROPS_PER_DAY}`}</small></span>
        </button>
        <button className={`dc-slot mega ${mega ? 'has' : ''}`} disabled={!mega} onClick={() => open('mega')}>
          <span className="dc-gem r-legendaer" aria-hidden="true"><i /><b /></span>
          <span className="dc-slot-text"><strong>{mega}× Mega-Drop</strong><small>{mega ? 'Antippen zum Öffnen' : 'Mindestens Episch'}</small></span>
        </button>
      </div>
      <h3 className="dc-shop-head"><Icon name="bag" size={16} />Drop-Shop</h3>
      <div className="dc-shop">
        {DROP_SHOP.map((o) => (
          <button key={o.id} className={`dc-offer o-${o.id}`} onClick={() => buy(o.id)} disabled={club.coins < o.price}>
            <span className={`dc-gem small ${o.kind === 'mega' ? 'r-legendaer' : 'r-episch'}`} aria-hidden="true"><i /><b /></span>
            <strong>{o.name}</strong>
            <small>{o.text}</small>
            <span className="dc-price"><Icon name="coin" size={14} />{fmt(o.price)}</span>
          </button>
        ))}
      </div>
      {msg && <p className="dc-msg" role="status">{msg}</p>}
      <details className="gr-odds">
        <summary>Chancen</summary>
        <ul>{DROP_ORDER.map((r) => <li key={r} className={`r-${r}`}><b>{DROP_LABEL[r]}</b><span>{fmt(DROP_ODDS[r])} %{MEGA_ODDS[r] ? ` · Mega ${MEGA_ODDS[r]} %` : ''}</span></li>)}</ul>
      </details>
      {drop && (
        <DropReveal key={drop.club.dropsOpened} drop={drop} left={left}
          onNext={() => { const k = drop.kind; setDrop(null); setTimeout(() => open(k), 60); }}
          onClose={() => setDrop(null)} onStore={onStore} />
      )}
    </section>
  );
}

/**
 * Drop-Enthüllung: Lichtstrahlen, Flutlicht-Kegel und ein Edelstein, der bei jedem Antippen bebt und
 * mit einem Blitz eine Seltenheit höher springen kann – bis er aufplatzt und die Belohnung zeigt.
 */
export function DropReveal({ drop, left, onNext, onClose, onStore }: { drop: DropOpen; left: number; onNext: () => void; onClose: () => void; onStore?: () => void }) {
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(false);
  const [charging, setCharging] = useState(false);
  const rarity = drop.steps[step];
  const last = step >= drop.steps.length - 1;
  const tap = () => {
    if (shown || charging) return;
    // Kurz aufladen (beben), dann springt er – oder platzt auf.
    setCharging(true);
    setTimeout(() => {
      setCharging(false);
      if (!last) { setStep((s) => s + 1); try { play('packShake'); } catch { /* kein Ton */ } }
      else { setShown(true); try { play(drop.rarity === 'legendaer' ? 'walkout' : drop.rarity === 'mythisch' ? 'revealRare' : 'reveal'); } catch { /* kein Ton */ } }
    }, 380);
  };
  return (
    <div className={`drop-reveal r-${rarity} ${shown ? 'is-open' : ''} ${charging ? 'is-charging' : ''}`} role="dialog" aria-modal="true" aria-label="Drop öffnen" onClick={tap}>
      <span className="dr-rays" aria-hidden="true" />
      <span className="dr-beam l" aria-hidden="true" /><span className="dr-beam r" aria-hidden="true" />
      <span className="dr-sparks" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}</span>
      <span key={`r-${step}`} className="drop-rarity">{DROP_LABEL[rarity]}</span>
      {drop.kind === 'mega' && !shown && <span className="dr-mega">Mega-Drop</span>}
      <span key={`g-${step}`} className={`dc-gem huge ${shown ? 'opened' : ''}`} aria-hidden="true"><i /><b /></span>
      <span key={`f-${step}`} className="dr-flash" aria-hidden="true" />
      {!shown ? (
        <small className="drop-hint">{last ? 'Antippen zum Öffnen' : 'Antippen – vielleicht wird er seltener …'}</small>
      ) : (
        <div className="drop-result" onClick={(e) => e.stopPropagation()}>
          {drop.reward.kind === 'card' && <UtCard card={drop.reward.card} size="md" shine />}
          <strong>{dropRewardText(drop.reward)}</strong>
          <small>{drop.reward.kind === 'pack' ? 'Liegt in deiner Pack-Ablage im Store.' : drop.reward.kind === 'card' ? (drop.duplicate ? 'Doppelt – in deiner Sammlung.' : 'Neu in deiner Sammlung!') : 'Gutgeschrieben.'}</small>
          <div className="drop-actions">
            {left > 0 ? <button className="btn primary" onClick={onNext}>Nächster Drop ({left})</button> : <button className="btn primary" onClick={onClose}>Weiter</button>}
            {drop.reward.kind === 'pack' && onStore && <button className="btn secondary" onClick={() => { onClose(); onStore(); }}>Zur Ablage</button>}
            {left > 0 && <button className="btn secondary" onClick={onClose}>Später</button>}
          </div>
        </div>
      )}
    </div>
  );
}
