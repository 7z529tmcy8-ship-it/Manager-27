import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { sellValue, type PackResult } from '../game/club';
import { TIER_NAME, tierOf } from '../game/collection';
import { motionReduced } from '../settings';
import { play } from '../sound';
import Icon from './Icon';
import UtCard from './UtCard';

const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
const buzz = (ms: number | number[]) => { try { navigator.vibrate?.(ms); } catch { /* egal */ } };
const TIER_RANK = { silver: 0, gold: 1, rare: 2, elite: 3, special: 4, icon: 5 } as const;

/** Pack öffnen: Pack wackelt und reißt auf, Karten liegen verdeckt, Antippen deckt auf (beste zuletzt). */
export default function PackOpen({ name, result, onClose, onCollection }: { name: string; result: PackResult; onClose: () => void; onCollection?: () => void }) {
  const fast = motionReduced();
  const [phase, setPhase] = useState<'shake' | 'cards'>(fast ? 'cards' : 'shake');
  // Beste Karte zuletzt aufdecken – Spannung bis zum Schluss.
  const cards = [...result.cards].reverse();
  const [shown, setShown] = useState<boolean[]>(() => cards.map(() => false));
  const best = Math.max(...cards.map((c) => TIER_RANK[tierOf(c.card)]));

  useEffect(() => {
    if (phase !== 'shake') return;
    sfx('packShake'); buzz([20, 60, 20, 60, 20]);
    const t = setTimeout(() => { sfx('packRip'); buzz(60); setPhase('cards'); }, best >= 4 ? 1500 : 1000);
    return () => clearTimeout(t);
  }, [phase, best]);

  const reveal = (i: number) => {
    if (shown[i]) return;
    const tier = tierOf(cards[i].card);
    const r = TIER_RANK[tier];
    sfx(r >= 5 ? 'walkout' : r >= 3 ? 'revealRare' : 'reveal');
    if (r >= 3) buzz(r >= 5 ? [60, 40, 60, 40, 120] : [40, 30, 40]);
    setShown((s) => s.map((x, k) => (k === i ? true : x)));
  };
  const revealAll = () => {
    cards.forEach((_, i) => setTimeout(() => reveal(i), fast ? 0 : i * 180));
  };
  const all = shown.every(Boolean);
  const dupes = result.cards.filter((c) => c.duplicate);
  const dupeValue = dupes.reduce((a, c) => a + sellValue(c.card), 0);

  return createPortal(
    <div className={`po po-best-${best}`} role="dialog" aria-modal="true" aria-label={`${name} öffnen`}>
      {phase === 'shake' ? (
        <div className="po-pack" onClick={() => setPhase('cards')}>
          <span className="po-pack-glow" aria-hidden="true" />
          <div className="po-pack-body"><Icon name="pack" size={64} /><b>{name}</b><small>{result.cards.length} Karten</small></div>
        </div>
      ) : (
        <>
          <h2 className="po-title">{all ? 'Deine Karten' : 'Tippe die Karten an'}</h2>
          <div className={`po-cards n${Math.min(cards.length, 9)}`}>
            {cards.map((c, i) => {
              const tier = tierOf(c.card);
              return (
                <button key={i} className={`po-slot t-${tier} ${shown[i] ? 'open' : ''}`} style={{ animationDelay: `${i * 70}ms` }} onClick={() => reveal(i)} aria-label={shown[i] ? c.card.name : 'Verdeckte Karte'}>
                  <span className="po-back"><Icon name="ball" size={34} /></span>
                  <span className="po-front">
                    <UtCard card={c.card} size={cards.length > 4 ? 'sm' : 'md'} shine={TIER_RANK[tier] >= 3} />
                    <em className={`po-tag t-${tier}`}>{c.duplicate ? 'Doppelt' : 'NEU'} · {TIER_NAME[tier]}</em>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="po-foot">
            {!all ? <button className="btn primary big" onClick={revealAll}>Alle aufdecken</button> : (
              <>
                {dupes.length > 0 && <small>{dupes.length} doppelt – in der Sammlung für zusammen {dupeValue.toLocaleString('de-DE')} Coins verkaufbar</small>}
                <div className="po-btns">
                  {onCollection && <button className="btn secondary big" onClick={onCollection}>Zur Sammlung</button>}
                  <button className="btn primary big" onClick={onClose}>Weiter</button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
