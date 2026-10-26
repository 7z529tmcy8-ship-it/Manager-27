import { useState } from 'react';
import { CAREER_REWARD_TIERS, PACKS, careerRewardTier, claimCareerReward, type PackResult } from '../game/club';
import type { Career } from '../game/types';
import { getClubState, setClubState } from '../clubStore';
import Icon from './Icon';
import { PackOpening } from './Store';

const fmt = (n: number) => n.toLocaleString('de-DE');

/** Karriereende: keine eigene Karte mehr – je nach Bilanz gibt es Packs. */
export default function CareerReward({ career, onDone }: { career: Career; onDone: () => void }) {
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
