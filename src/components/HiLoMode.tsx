import { useEffect, useRef, useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import {
  HILO_MAX_LEVEL, HILO_STEP, STREAK_FOR_POINT, answerHilo, drawDuel, drawDuelNext, hiloCards, hiloOf, judge, pickStat, shownDuelCard, statName, statValue, syncHiloCards, upgradeCost, upgradeHilo,
  type DuelCard, type HiLo, type HiLoOutcome, type HiloStat,
} from '../game/hilo';
import { motionReduced } from '../settings';
import { play } from '../sound';
import Icon from './Icon';
import UtCard from './UtCard';

/** Nachname für die Frage („Hat Haaland mehr Tempo als Mbappé?“). */
const shortName = (n: string) => n.split(/\s+/).slice(-1)[0];
const vibrate = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* nicht unterstützt */ } };

/** Höher oder Tiefer: Serien spielen, alle 5 Richtigen ein Punkt, mit Punkten drei Talente entwickeln. */
export default function HiLoMode({ onClose }: { onClose: () => void }) {
  const club = useClub();
  const h = hiloOf(club);
  const [cur, setCur] = useState<DuelCard>(() => drawDuel());
  const deal = (from: DuelCard) => { const d = drawDuelNext(from); return { d, stat: pickStat(from, d) }; };
  const [nxt, setNxt] = useState<{ d: DuelCard; stat: HiloStat }>(() => deal(cur));
  const [reveal, setReveal] = useState<HiLoOutcome | null>(null);
  const [pointPop, setPointPop] = useState(0);
  const [k, setK] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  // Die drei Talente liegen von Anfang an in der Sammlung
  useEffect(() => { const c = syncHiloCards(getClubState()); if (c !== getClubState()) setClubState(c); }, []);

  const guess = (dir: HiLo) => {
    if (reveal) return;
    const out = judge(cur, nxt.d, dir, nxt.stat);
    setReveal(out);
    play('tap');
    timer.current = setTimeout(() => {
      const res = answerHilo(getClubState(), out);
      setClubState(res.club);
      if (out === 'right') { play(res.point ? 'fanfare' : 'reveal'); vibrate(res.point ? [30, 30, 80] : 20); }
      else if (out === 'wrong') { play('fall'); vibrate([60, 30, 60]); }
      if (res.point) setPointPop((x) => x + 1);
      // Weiter mit der aufgedeckten Karte (bei Fehler und Gleichstand auch – die Serie zählt einfach neu)
      setCur(nxt.d);
      setNxt(deal(nxt.d));
      setReveal(null);
      setK((x) => x + 1);
    }, motionReduced() ? 80 : 1000);
  };

  const upgrade = (name: string) => {
    const c = upgradeHilo(getClubState(), name);
    if (!c) return;
    setClubState(c);
    play('levelUp');
    vibrate([20, 30, 60]);
  };

  const toPoint = STREAK_FOR_POINT - (h.streak % STREAK_FOR_POINT);
  return (
    <div className="overlay hl" role="dialog" aria-modal="true" aria-label="Höher oder Tiefer">
      <div className="overlay-inner">
        <header className="overlay-head"><button className="nav-back" onClick={onClose}>‹ Zurück</button></header>
        <h1 className="dr-title">Höher oder Tiefer</h1>

        <div className="hl-stats">
          <div className="hl-streak">
            <small>Serie</small>
            <strong key={h.streak} className={h.streak ? 'pop' : ''}>{h.streak}</strong>
            <span className="hl-bar"><i style={{ width: `${((h.streak % STREAK_FOR_POINT) / STREAK_FOR_POINT) * 100}%` }} /></span>
            <em>noch {toPoint} bis +1 Punkt</em>
          </div>
          <div className="hl-points"><small>Punkte</small><strong key={pointPop} className={pointPop ? 'pop' : ''}>{h.points}</strong><em>Rekord {h.best}</em></div>
        </div>

        <div className="hl-question" key={`q-${k}`}>
          <small>Hat {shortName(nxt.d.card.name)} mehr</small>
          <strong>{statName(nxt.stat)}</strong>
          <small>als {shortName(cur.card.name)} ({statValue(cur, nxt.stat)})?</small>
        </div>

        <div className={`cz-stage hl-table ${reveal ?? ''}`}>
          <div className="hl-slot" key={`c-${k}`}><UtCard card={shownDuelCard(cur)} size="md" focus={nxt.stat} /></div>
          <span className="hl-vs" aria-hidden="true">VS</span>
          <div className={`hl-slot next ${reveal ? `show ${reveal}` : ''}`} key={`n-${k}`}>
            <UtCard card={shownDuelCard(nxt.d)} size="md" mask={reveal ? undefined : nxt.stat} focus={nxt.stat} />
          </div>
          {reveal && (
            <span className={`hl-call ${reveal}`} role="status">
              {reveal === 'right' ? 'Richtig' : reveal === 'wrong' ? 'Falsch' : 'Gleich'} · {statValue(nxt.d, nxt.stat)}
            </span>
          )}
          {pointPop > 0 && !reveal && <span className="hl-plus" key={pointPop} aria-hidden="true">+1 Punkt</span>}
        </div>

        <div className="hilo-choices hl-choices">
          <button className="hilo-btn higher" disabled={!!reveal} onClick={() => guess('higher')}><Icon name="arrow" size={20} /><span>Höher</span></button>
          <button className="hilo-btn lower" disabled={!!reveal} onClick={() => guess('lower')}><Icon name="arrow" size={20} /><span>Tiefer</span></button>
        </div>

        <section className="hl-talents" aria-label="Talente entwickeln">
          <h2 className="dr-step">Talente entwickeln</h2>
          <div className="hl-talent-row">
            {hiloCards(club).map(({ name, level, card }) => {
              const cost = upgradeCost(level);
              const max = level >= HILO_MAX_LEVEL;
              return (
                <div key={name} className="hl-talent">
                  <UtCard card={card} size="sm" shine={level >= 4} />
                  <span className="hl-level">{Array.from({ length: HILO_MAX_LEVEL }, (_, i) => <i key={i} className={i < level ? 'on' : ''} />)}</span>
                  <button className="btn primary small" disabled={max || h.points < cost} onClick={() => upgrade(name)}>
                    {max ? 'Maximal' : <>+{HILO_STEP} · {cost} {cost === 1 ? 'Punkt' : 'Punkte'}</>}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
