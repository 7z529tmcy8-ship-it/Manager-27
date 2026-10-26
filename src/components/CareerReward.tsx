import { useState } from 'react';
import { CAREER_REWARD_TIERS, PACKS, careerRewardKind, careerRewardOptions, careerRewardTier, chooseCareerReward, claimCareerReward, type PackResult } from '../game/club';
import UtCard from './UtCard';
import type { Career } from '../game/types';
import { getClubState, setClubState } from '../clubStore';
import Icon from './Icon';
import { PackOpening } from './Store';

const fmt = (n: number) => n.toLocaleString('de-DE');

/**
 * Karriereende. Echte Spieler, Ikonen und Kult-Helden mit Auszeichnung: eine Auszeichnungs-Karte wählen.
 * Selbst erstellte Spieler (und Karrieren ohne Auszeichnung): Packs je nach Bilanz.
 */
export default function CareerReward({ career, onDone }: { career: Career; onDone: () => void }) {
  return careerRewardKind(career) === 'card' ? <AwardChoice career={career} onDone={onDone} /> : <CareerPacks career={career} onDone={onDone} />;
}

/** Eine Auszeichnungs-Karte wählen – die Wahl ist endgültig. */
function AwardChoice({ career, onDone }: { career: Career; onDone: () => void }) {
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

/** Packs je nach Bilanz. */
function CareerPacks({ career, onDone }: { career: Career; onDone: () => void }) {
  const { tier, score, next } = careerRewardTier(career);
  const [opened, setOpened] = useState<PackResult | null>(null);
  const packName = (id: string) => PACKS.find((p) => p.id === id)?.name ?? id;

  const open = () => {
    const res = claimCareerReward(getClubState(), career);
    if (!res) { onDone(); return; }
    setClubState(res.club);
    setOpened(res.result);
  };

  if (opened) return <PackOpening name={tier.name} result={opened} onClose={onDone} onCollection={onDone} />;

  return (
    <div className="reward" role="dialog" aria-modal="true" aria-labelledby="reward-title">
      <div className="reward-card career-packs">
        <span className="upd-badge">Karriereende · {career.player.name}</span>
        <h2 id="reward-title">{tier.name}</h2>
        <p className="muted">Deine Karriere bringt <b>{fmt(score)} Bilanz-Punkte</b> – dafür gibt es diese Packs:</p>
        <ul className="cr-packs">
          {tier.packs.map((id, i) => (
            <li key={`${id}-${i}`} className={`cr-pack p-${id}`}><Icon name="pack" size={22} /><span>{packName(id)}</span></li>
          ))}
        </ul>
        <ol className="cr-tiers" aria-label="Stufen">
          {CAREER_REWARD_TIERS.map((t) => (
            <li key={t.id} className={t.id === tier.id ? 'on' : score >= t.min ? 'done' : ''}>
              <strong>{t.name.replace('-Karriere', '')}</strong><small>ab {fmt(t.min)}</small>
            </li>
          ))}
        </ol>
        {next && <p className="hint">Für die {next.name} hätten {fmt(next.min - score)} Punkte gefehlt. Punkte gibt es für Titel, Auszeichnungen, Bestwertung, Spiele, Tore und Legendenstatus.</p>}
        <button className="btn primary big" onClick={open}><Icon name="pack" size={18} /> Packs öffnen</button>
      </div>
    </div>
  );
}
