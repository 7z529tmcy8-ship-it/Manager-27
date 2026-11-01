import { useEffect, useRef, useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import { ERA_NAME, ERA_ORDER, ERA_PLAYERS, eraCardId, eraToday, type Era } from '../data/eraCards';
import { eraView, getCard, type CollectCard } from '../game/club';
import { ERA_STEPS, STEP_COST, claimEra, eraReached, eraReady, eraReward, eraRewardText, type EraReward } from '../game/era';
import { ERA_END, SHARDS, eraLive, eraOf } from '../game/eraTime';
import { motionReduced } from '../settings';
import { play } from '../sound';
import Icon from './Icon';
import UtCard from './UtCard';

const left = (now = Date.now()) => {
  const ms = Math.max(0, ERA_END.getTime() - now);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d > 0 ? `noch ${d} ${d === 1 ? 'Tag' : 'Tage'} ${h} Std.` : `noch ${h} Std.`;
};
const HOW: [string, string, number][] = [
  ['duel', 'Duell-Sieg', SHARDS.duelWin], ['spark', 'Drop öffnen', SHARDS.drop], ['arrow', 'Höher/Tiefer-Punkt', SHARDS.hiloPoint],
  ['puzzle', 'Draft-Sieg', SHARDS.draftWin], ['ball', 'Karriere-Saison', SHARDS.careerSeason],
];
const rewardIcon = (r: EraReward) => (r.kind === 'coins' ? 'coin' : r.kind === 'drop' ? 'spark' : r.kind === 'pack' ? 'pack' : 'clock');

/** Ära-Event „Zeitreise“: Splitter sammeln, 40 Stufen, 10 Ära-Karten. */
export default function EraEvent({ onClose, onCollection }: { onClose: () => void; onCollection: () => void }) {
  const club = useClub();
  const e = eraOf(club);
  const reached = eraReached(club);
  const ready = eraReady(club);
  const today = eraToday();
  const owned = ERA_PLAYERS.filter((p) => (club.cards[eraCardId(p.name)] ?? 0) > 0).length;
  const into = e.shards - reached * STEP_COST;
  const [reveal, setReveal] = useState<CollectCard[] | null>(null);
  const [got, setGot] = useState<EraReward[] | null>(null);
  const path = useRef<HTMLOListElement>(null);

  // Nichts abzuholen → direkt zur nächsten Stufe im Pfad springen
  useEffect(() => {
    if (eraReady(getClubState()) > 0) return;
    path.current?.querySelector('.ep-step.next')?.scrollIntoView({ block: 'center' });
  }, []);

  const claim = () => {
    const res = claimEra(getClubState());
    if (!res.rewards.length) return;
    setClubState(res.club);
    setGot(res.rewards);
    if (res.cards.length) setReveal(res.cards);
    else { try { play('reveal'); } catch { /* kein Ton */ } }
  };

  return (
    <div className="overlay era" role="dialog" aria-modal="true" aria-label="Zeitreise">
      <div className="overlay-inner">
        <header className="overlay-head"><button className="nav-back" onClick={onClose}>‹ Zurück</button></header>

        <section className="ep-hero">
          <span className="ep-clock" aria-hidden="true"><i className="h" /><i className="m" /></span>
          <div className="ep-hero-text">
            <small>Event · {eraLive() ? left() : 'beendet'}</small>
            <h1>Zeitreise</h1>
            <span className={`ep-today t-${today}`}>Heute: {ERA_NAME[today]}</span>
          </div>
        </section>
        <p className="ep-sub">Ära-Karten wechseln jeden Tag ihre Zeit: {ERA_ORDER.map((x) => ERA_NAME[x]).join(' → ')}. Verein und Wertung ändern sich mit.</p>

        <section className="ep-progress">
          <div className="ep-shards"><Icon name="clock" size={22} /><b>{e.shards}</b><small>Zeit-Splitter</small></div>
          <div className="ep-bar-wrap">
            <span className="ep-step-no">Stufe {reached}/{ERA_STEPS}</span>
            <span className="ep-bar"><i style={{ transform: `scaleX(${reached >= ERA_STEPS ? 1 : into / STEP_COST})` }} /></span>
            <small>{reached >= ERA_STEPS ? 'Pfad komplett!' : `${STEP_COST - into} bis zur nächsten Stufe`}</small>
          </div>
          <div className="ep-cards"><b>{owned}/10</b><small>Ära-Karten</small></div>
          {ready > 0 && <button className="btn primary big ep-claim" onClick={claim}><Icon name="gift" size={20} />{ready} {ready === 1 ? 'Stufe' : 'Stufen'} abholen</button>}
        </section>

        {eraLive() && (
          <ul className="ep-how" aria-label="So sammelst du Splitter">
            {HOW.map(([ic, txt, n]) => <li key={txt}><Icon name={ic} size={16} /><span>{txt}</span><b>+{n}</b></li>)}
          </ul>
        )}

        <ol className="ep-path" ref={path}>
          {Array.from({ length: ERA_STEPS }, (_, i) => {
            const step = i + 1;
            const r = eraReward(step);
            const state = step <= e.claimed ? 'done' : step <= reached ? 'ready' : step === reached + 1 ? 'next' : 'locked';
            const card = r.kind === 'card' ? getCard(r.id) : null;
            return (
              <li key={step} className={`ep-step ${state} ${card ? 'is-card' : ''}`}>
                <span className="ep-node">{state === 'done' ? <Icon name="check" size={16} /> : step}</span>
                {card ? (
                  <span className="ep-card"><UtCard card={eraView(card, today)} size="sm" shine={state !== 'locked'} /></span>
                ) : (
                  <span className="ep-reward"><Icon name={rewardIcon(r)} size={20} />{eraRewardText(r)}</span>
                )}
              </li>
            );
          })}
        </ol>
        <p className="ep-end">Alle 40 Stufen: Titel „Zeitreisender“ und das Banner „Zeitreise“ im Profil.</p>
      </div>

      {got && !reveal && (
        <div className="ep-got" role="status" onClick={() => setGot(null)}>
          <strong>Abgeholt</strong>
          <ul>{got.map((r, i) => <li key={i}><Icon name={rewardIcon(r)} size={16} />{eraRewardText(r)}</li>)}</ul>
          <small>Packs liegen in deiner Ablage im Shop.</small>
        </div>
      )}
      {reveal && <EraReveal cards={reveal} onClose={() => { setReveal(null); setGot(null); }} onCollection={onCollection} />}
    </div>
  );
}

// Enthüllung: Eine Uhr dreht rückwärts, die Jahreszahl rast zurück, dann blättert die Karte durch ihre drei Zeiten
// und bleibt in der Zeit von heute stehen. Antippen überspringt.
type Phase = 'rewind' | 'flip' | 'show';
export function EraReveal({ cards, onClose, onCollection }: { cards: CollectCard[]; onClose: () => void; onCollection?: () => void }) {
  const [phase, setPhase] = useState<Phase>(() => (motionReduced() ? 'show' : 'rewind'));
  const [year, setYear] = useState(2026);
  const [flip, setFlip] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const today = eraToday();
  const best = cards.reduce((b, c) => (c.ovr > b.ovr ? c : b), cards[0]);
  const stops: Era[] = [...ERA_ORDER, ...ERA_ORDER, today];

  useEffect(() => {
    if (phase !== 'rewind') return;
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    for (let k = 1; k <= 12; k++) at(k * 90, () => setYear(2026 - Math.round((k / 12) * 23)));
    at(1250, () => { setPhase('flip'); try { play('revealRare'); } catch { /* kein Ton */ } });
    stops.forEach((_, i) => at(1250 + i * 230, () => { setFlip(i); try { play('tap'); } catch { /* kein Ton */ } }));
    at(1250 + stops.length * 230 + 200, () => { setPhase('show'); try { play('fanfare'); } catch { /* kein Ton */ } try { navigator.vibrate?.([40, 30, 90]); } catch { /* egal */ } });
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const skip = () => {
    if (phase === 'show') return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase('show');
    try { play('fanfare'); } catch { /* kein Ton */ }
  };

  return (
    <div className={`mt er ${phase}`} role="dialog" aria-modal="true" aria-label="Ära-Karte" onClick={skip}>
      {phase === 'rewind' && (
        <div className="er-rewind" aria-hidden="true">
          <span className="ep-clock big"><i className="h" /><i className="m" /></span>
          <b className="er-year">{year}</b>
        </div>
      )}
      {phase === 'flip' && (
        <div className="er-flip" aria-hidden="true">
          <span key={flip} className="er-flip-card"><UtCard card={eraView(best, stops[flip])} size="md" /></span>
          <b className={`er-era t-${stops[flip]}`}>{ERA_NAME[stops[flip]]}</b>
        </div>
      )}
      {phase === 'show' && (
        <div className="mt-reward" onClick={(ev) => ev.stopPropagation()}>
          <h2 className="mt-title er-title">Zeitreise</h2>
          <p className="mt-sub er-sub">{cards.length === 1 ? 'Neue Ära-Karte' : `${cards.length} neue Ära-Karten`} · heute in der Zeit „{ERA_NAME[today]}“</p>
          <div className="mt-grid">
            {cards.map((c, i) => (
              <span key={c.id} className={`mt-card er-card ${c.id === best.id ? 'best' : ''}`} style={{ '--i': i } as React.CSSProperties}>
                <UtCard card={eraView(c, today)} size="sm" shine={c.id === best.id} />
              </span>
            ))}
          </div>
          <div className="mt-actions">
            {onCollection && <button className="btn secondary big" onClick={onCollection}>Zur Sammlung</button>}
            <button className="btn primary big" onClick={onClose}>Weiter</button>
          </div>
        </div>
      )}
      {phase !== 'show' && <button className="pack-skip mt-skip" onClick={(ev) => { ev.stopPropagation(); skip(); }}>Überspringen</button>}
    </div>
  );
}
