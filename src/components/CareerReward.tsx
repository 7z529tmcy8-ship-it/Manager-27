import { useState } from 'react';
import { CAREER_REWARD_TIERS, PACKS, careerRewardKind, careerRewardOptions, careerRewardTier, claimCareerReward, drawCareerReward, type PackResult } from '../game/club';
import UtCard from './UtCard';
import type { CollectCard } from '../game/club';
import { play } from '../sound';
import type { Career } from '../game/types';
import { getClubState, setClubState } from '../clubStore';
import Icon from './Icon';
import { PackOpening } from './Store';

const fmt = (n: number) => n.toLocaleString('de-DE');

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
          ? <button className="btn primary big" onClick={onDone}>Weiter</button>
          : <button className="btn primary big" onClick={draw}>Karte ziehen</button>}
      </div>
    </div>
  );
}

/** Packs je nach Bilanz. */
function CareerPacks({ career, onDone }: { career: Career; onDone: (msg?: string) => void }) {
  const { tier, score, next } = careerRewardTier(career);
  const [opened, setOpened] = useState<PackResult | null>(null);
  const packName = (id: string) => PACKS.find((p) => p.id === id)?.name ?? id;

  const open = () => {
    const res = claimCareerReward(getClubState(), career);
    if (!res) { onDone(); return; }
    setClubState(res.club);
    setOpened(res.result);
  };

  const store = () => {
    const res = claimCareerReward(getClubState(), career, Math.random, true);
    if (res) setClubState(res.club);
    onDone(`${tier.packs.length} ${tier.packs.length === 1 ? 'Pack liegt' : 'Packs liegen'} in deiner Ablage im Shop.`);
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
        <div className="pack-prompt-actions">
          <button className="btn secondary big" onClick={store}><Icon name="folder" size={18} /> In die Ablage</button>
          <button className="btn primary big" onClick={open}><Icon name="pack" size={18} /> Packs öffnen</button>
        </div>
      </div>
    </div>
  );
}
