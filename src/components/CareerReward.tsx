import { useState } from 'react';
import { careerRewardOptions, chooseCareerReward } from '../game/club';
import type { Career } from '../game/types';
import { getClubState, setClubState } from '../clubStore';
import UtCard from './UtCard';

/** Karriereende: eine Auszeichnungs-Karte wählen (nur wenn es eine Auszeichnung gab). Die Wahl ist endgültig. */
export default function CareerReward({ career, onDone }: { career: Career; onDone: () => void }) {
  const options = careerRewardOptions(career);
  const [pick, setPick] = useState(options[0].id);
  const chosen = options.find((o) => o.id === pick)!;
  const confirm = () => {
    setClubState(chooseCareerReward(getClubState(), career, pick));
    onDone();
  };
  return (
    <div className="reward" role="dialog" aria-modal="true" aria-labelledby="reward-title">
      <div className="reward-card">
        <span className="upd-badge">Karriereende · {career.player.name}</span>
        <h2 id="reward-title">Wähle deine Karte</h2>
        <p className="muted">
          {options.length > 1
            ? 'Du hast dir eine Auszeichnungs-Karte verdient. Wähle den größten Moment deiner Karriere – du bekommst genau eine.'
            : 'Du hast dir eine Auszeichnungs-Karte verdient – sie kommt in deine Sammlung.'}
        </p>
        <div className="reward-options">
          {options.map((o) => (
            <button key={o.id} className={`reward-opt ${o.id === pick ? 'on' : ''}`} onClick={() => setPick(o.id)} aria-pressed={o.id === pick}>
              <UtCard card={o} size="md" shine={o.id === pick} />
            </button>
          ))}
        </div>
        {options.length > 1 && <p className="reward-hint">← wischen · {options.length} Karten zur Wahl →</p>}
        <button className="btn primary big" onClick={confirm}>{chosen.label} ({chosen.ovr}) nehmen</button>
      </div>
    </div>
  );
}
