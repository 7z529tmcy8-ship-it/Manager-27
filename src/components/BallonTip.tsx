import { GALA_NOMINEES } from '../data/cards';
import { CARD_POOL, setBallonTip } from '../game/club';
import { getClubState, setClubState, useClub } from '../clubStore';
import UtCard from './UtCard';

/** Ballon d’Or 2026: Sieger tippen (bis zur Verleihung am 26.10., 21 Uhr). Richtig getippt = Gala-Pack gratis. */
export default function BallonTip({ onClose }: { onClose: () => void }) {
  const club = useClub();
  const pick = (tip: string) => {
    setClubState(setBallonTip(getClubState(), tip));
    onClose();
  };
  return (
    <div className="reward" role="dialog" aria-modal="true" aria-labelledby="tip-title" onClick={onClose}>
      <div className="reward-card gala-tip" onClick={(e) => e.stopPropagation()}>
        <span className="upd-badge">🏅 Ballon d’Or 2026 · London, 26. Oktober</span>
        <h2 id="tip-title">Wer gewinnt?</h2>
        <p className="muted">Tippe bis zur Verleihung (26.10., 21 Uhr). Liegst du richtig, gibt es ein Gala-Pack gratis. Du kannst deinen Tipp bis dahin ändern.</p>
        <div className="reward-options">
          {GALA_NOMINEES.map(([name]) => {
            const card = CARD_POOL.find((c) => c.variant === 'gala' && c.name === name)!;
            return (
              <button key={name} className={`reward-opt ${club.ballonTip === name ? 'on' : ''}`} onClick={() => pick(name)} aria-pressed={club.ballonTip === name}>
                <UtCard card={card} size="sm" shine={club.ballonTip === name} />
              </button>
            );
          })}
        </div>
        <p className="reward-hint">← wischen · {GALA_NOMINEES.length} Favoriten · antippen zum Tippen →</p>
        <button className={`btn secondary big ${club.ballonTip === 'other' ? 'on' : ''}`} onClick={() => pick('other')}>
          {club.ballonTip === 'other' ? '✓ ' : ''}Jemand anderes aus den 30 Nominierten
        </button>
      </div>
    </div>
  );
}
