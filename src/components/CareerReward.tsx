import { useState } from 'react';
import { careerRewardKind, careerRewardOptions, claimCareerIcon, drawCareerReward } from '../game/club';
import UtCard from './UtCard';
import type { CollectCard } from '../game/club';
import { play } from '../sound';
import type { Career } from '../game/types';
import { getClubState, setClubState } from '../clubStore';


/**
 * Karriereende. Echte Spieler, Ikonen und Kult-Helden mit Auszeichnung: eine Auszeichnungs-Karte wählen.
 * Selbst erstellte Spieler (und Karrieren ohne Auszeichnung): Packs je nach Bilanz.
 */
export default function CareerReward({ career, onDone }: { career: Career; onDone: (msg?: string) => void }) {
  return careerRewardKind(career) === 'card' ? <AwardChoice career={career} onDone={onDone} /> : <CareerPacks career={career} onDone={onDone} />;
}

/** Eine Auszeichnungs-Karte wird zufällig gezogen – keine Wahl, das Ergebnis ist endgültig. */
function AwardChoice({ career, onDone }: { career: Career; onDone: () => void }) {
  const options = careerRewardOptions(career);
  const [card, setCard] = useState<CollectCard | null>(null);
  const draw = () => {
    const res = drawCareerReward(getClubState(), career);
    setClubState(res.club);
    try { play(res.card && res.card.ovr >= 90 ? 'revealRare' : 'fanfare'); } catch { /* kein Ton */ }
    if (res.card) setCard(res.card); else onDone();
  };
  return (
    <div className="reward" role="dialog" aria-modal="true" aria-labelledby="reward-title">
      <div className="reward-card">
        <span className="upd-badge">Karriereende · {career.player.name}</span>
        <h2 id="reward-title">{card ? card.label : 'Deine Karte wird gezogen'}</h2>
        <p className="muted">
          {card
            ? `Gezogen aus ${options.length} möglichen ${options.length === 1 ? 'Karte' : 'Karten'} – sie liegt jetzt in deiner Sammlung.`
            : options.length > 1
              ? `Du hast ${options.length} Auszeichnungs-Karten verdient. Eine davon bekommst du – zufällig.`
              : 'Du hast dir eine Auszeichnungs-Karte verdient – sie kommt in deine Sammlung.'}
        </p>
        <div className="reward-options">
          {card
            ? <span className="reward-drawn"><UtCard card={card} size="md" shine /></span>
            : options.map((o) => <span key={o.id} className="reward-back" aria-label="Verdeckte Karte"><i>?</i><small>{o.label}</small></span>)}
        </div>
        {card
          ? <button className="btn primary big" onClick={() => onDone()}>Weiter</button>
          : <button className="btn primary big" onClick={draw}>Karte ziehen</button>}
      </div>
    </div>
  );
}

/** Ohne Auszeichnung: Die Karriere-Ikone kommt ins Team. */
function CareerPacks({ career, onDone }: { career: Career; onDone: (msg?: string) => void }) {
  const [card, setCard] = useState<CollectCard | null>(null);
  const take = () => {
    const res = claimCareerIcon(getClubState(), career);
    if (!res) { onDone(); return; }
    setClubState(res.club);
    setCard(res.card);
    try { play('fanfare'); } catch { /* kein Ton */ }
  };
  return (
    <div className="reward" role="dialog" aria-modal="true" aria-labelledby="reward-title">
      <div className="reward-card">
        <span className="upd-badge">Karriereende · {career.player.name}</span>
        <h2 id="reward-title">{card ? card.label ?? 'Karriere-Ikone' : 'Deine Karriere-Karte'}</h2>
        <p className="muted">{card ? 'Die Karte steht jetzt in deinem Team – stell sie in „Team“ auf und spiel Duelle mit ihr.' : 'Dein Spieler kommt als Karte in dein Team – mit seiner besten Wertung.'}</p>
        <div className="reward-options">
          {card ? <span className="reward-drawn"><UtCard card={card} size="md" shine /></span> : <span className="reward-back" aria-label="Verdeckte Karte"><i>?</i></span>}
        </div>
        {card ? <button className="btn primary big" onClick={() => onDone('Neue Karte in deinem Team!')}>Weiter</button> : <button className="btn primary big" onClick={take}>Karte aufdecken</button>}
      </div>
    </div>
  );
}
