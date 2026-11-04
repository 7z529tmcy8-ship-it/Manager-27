import { useEffect, useRef, useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import { JUNGLE_BOOST, JUNGLE_PLAYERS, jungleCardId } from '../data/jungleCards';
import { getCard, type PackResult } from '../game/club';
import { JUNGLE_COST, JUNGLE_STEPS, claimJungle, jungleReached, jungleReady, jungleReward, jungleRewardText, type JungleReward } from '../game/jungle';
import { JUNGLE_END, JUNGLE_START, SHARDS, jungleLive, jungleOf } from '../game/eraTime';
import { play } from '../sound';
import Icon from './Icon';
import JungleReveal from './JungleReveal';
import UtCard from './UtCard';

const left = (now = Date.now()) => {
  const ms = Math.max(0, JUNGLE_END.getTime() - now);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d > 0 ? `noch ${d} ${d === 1 ? 'Tag' : 'Tage'} ${h} Std.` : `noch ${h} Std.`;
};
const HOW: [string, string, number][] = [
  ['duel', 'Duell-Sieg', SHARDS.duelWin], ['spark', 'Drop öffnen', SHARDS.drop], ['arrow', 'Höher/Tiefer-Punkt', SHARDS.hiloPoint],
  ['puzzle', 'Draft-Sieg', SHARDS.draftWin], ['ball', 'Karriere-Saison', SHARDS.careerSeason],
];
const rewardIcon = (r: JungleReward) => (r.kind === 'coins' ? 'coin' : r.kind === 'drop' ? 'spark' : r.kind === 'pack' ? 'pack' : 'wave');

/** Kleine Banane als Zeichnung (kein Emoji). */
export function Banana({ size = 22 }: { size?: number }) {
  return (
    <svg className="jg-banana" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 7c-1 9 4 18 15 19 3 .3 6-.6 7-2-6 1-12-2-15-8-2-4-2-7-2-9Z" fill="#ffd23f" stroke="#7a5200" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 10c1 6 5 11 12 13" fill="none" stroke="#e0a800" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M5 4.5l2.6 3" stroke="#5a3a00" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** Event „Jungle Crash“: Bananen sammeln, 30 Stufen Expeditions-Pfad, 6 Dschungel-Karten. */
export default function JungleEvent({ onClose, onCollection }: { onClose: () => void; onCollection: () => void }) {
  const club = useClub();
  const j = jungleOf(club);
  const reached = jungleReached(club);
  const ready = jungleReady(club);
  const owned = JUNGLE_PLAYERS.filter(([n]) => (club.cards[jungleCardId(n)] ?? 0) > 0).length;
  const into = j.bananas - reached * JUNGLE_COST;
  const [reveal, setReveal] = useState<PackResult | null>(null);
  const [got, setGot] = useState<JungleReward[] | null>(null);
  const path = useRef<HTMLOListElement>(null);
  const live = jungleLive();
  const soon = Date.now() < JUNGLE_START.getTime();

  useEffect(() => {
    if (jungleReady(getClubState()) > 0) return;
    requestAnimationFrame(() => path.current?.querySelector('.ep-step.next')?.scrollIntoView({ block: 'center' }));
  }, []);

  const claim = () => {
    const before = getClubState();
    const res = claimJungle(before);
    if (!res.rewards.length) return;
    setClubState(res.club);
    setGot(res.rewards);
    if (res.cards.length) setReveal({ cards: res.cards.map((card) => ({ card, duplicate: (before.cards[card.id] ?? 0) > 0 })), items: [] });
    else { try { play('reveal'); } catch { /* kein Ton */ } }
  };

  return (
    <div className="overlay era jungle" role="dialog" aria-modal="true" aria-label="Jungle Crash">
      <div className="overlay-inner">
        <header className="overlay-head"><button className="nav-back" onClick={onClose}>‹ Zurück</button></header>

        <section className="jg-hero">
          <video className="jg-hero-video" src="/news/jungle-crash-trailer.mp4" poster="/news/jungle-crash-trailer.jpg" autoPlay muted loop playsInline aria-hidden="true" />
          <div className="jg-hero-text">
            <small>Event · {soon ? 'startet am 4. November' : live ? left() : 'beendet'}</small>
            <h1>Jungle Crash</h1>
            <span>Expedition durch den Dschungel</span>
          </div>
        </section>
        <p className="ep-sub">Ein Frachtflieger ist über dem Dschungel abgestürzt. Sammle Bananen, folge der Liane und birg die Kisten: 30 Stufen, 6 Dschungel-Karten mit +{JUNGLE_BOOST} Wertung.</p>

        <section className="ep-progress">
          <div className="ep-shards"><Banana size={26} /><b>{j.bananas}</b><small>Bananen</small></div>
          <div className="ep-bar-wrap">
            <span className="ep-step-no">Stufe {reached}/{JUNGLE_STEPS}</span>
            <span className="ep-bar"><i style={{ transform: `scaleX(${reached >= JUNGLE_STEPS ? 1 : into / JUNGLE_COST})` }} /></span>
            <small>{reached >= JUNGLE_STEPS ? 'Expedition komplett!' : `${JUNGLE_COST - into} ${JUNGLE_COST - into === 1 ? 'Banane' : 'Bananen'} bis zur nächsten Stufe`}</small>
          </div>
          <div className="ep-cards"><b>{owned}/6</b><small>Dschungel-Karten</small></div>
          {ready > 0 && <button className="btn primary big ep-claim" onClick={claim}><Icon name="gift" size={20} />{ready} {ready === 1 ? 'Kiste' : 'Kisten'} bergen</button>}
        </section>

        {live && (
          <ul className="ep-how" aria-label="So sammelst du Bananen">
            {HOW.map(([ic, txt, n]) => <li key={txt}><Icon name={ic} size={16} /><span>{txt}</span><b>+{n}</b></li>)}
            <li className="jg-code"><Icon name="gift" size={16} /><span>Code JUNGLECRASH im Shop</span></li>
          </ul>
        )}

        <ol className="ep-path jg-path" ref={path}>
          {Array.from({ length: JUNGLE_STEPS }, (_, i) => {
            const step = i + 1;
            const r = jungleReward(step);
            const state = step <= j.claimed ? 'done' : step <= reached ? 'ready' : step === reached + 1 ? 'next' : 'locked';
            const card = r.kind === 'card' ? getCard(r.id) : null;
            return (
              <li key={step} className={`ep-step ${state} ${card ? 'is-card' : ''}`}>
                <span className="ep-node">{state === 'done' ? <Icon name="check" size={16} /> : step}</span>
                {card ? (
                  <span className="ep-card"><UtCard card={card} size="sm" shine={state !== 'locked'} /></span>
                ) : (
                  <span className="ep-reward"><Icon name={rewardIcon(r)} size={20} />{jungleRewardText(r)}</span>
                )}
              </li>
            );
          })}
        </ol>
        <p className="ep-end">Alle 30 Stufen: Titel „Expeditionsleiter“ und das Banner „Dschungel“ im Profil.</p>
      </div>

      {got && !reveal && (
        <div className="ep-got" role="status" onClick={() => setGot(null)}>
          <strong>Geborgen</strong>
          <ul>{got.map((r, i) => <li key={i}><Icon name={rewardIcon(r)} size={16} />{jungleRewardText(r)}</li>)}</ul>
          <small>Packs liegen in deiner Ablage im Shop.</small>
        </div>
      )}
      {reveal && <JungleReveal result={reveal} title="Expedition" onClose={() => { setReveal(null); setGot(null); }} onCollection={onCollection} />}
    </div>
  );
}
