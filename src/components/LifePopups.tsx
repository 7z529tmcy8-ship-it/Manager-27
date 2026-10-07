import { useEffect, useState } from 'react';
import { play } from '../sound';
import { resolveFlirt, renameChild } from '../game/family';
import type { Career } from '../game/types';
import Confetti from './Confetti';
import { KidEventBox } from './FamilyPanel';

/** Große Pop-ups für die Familie: Einladung zur After-Party und „Du wirst Vater!“. */
export default function LifePopups({ career, onChange, onFamily }: { career: Career; onChange: (c: Career) => void; onFamily: () => void }) {
  const h = career.household;
  const birthChild = h?.birth ? h.children.find((c) => c.id === h.birth!.childId) : null;
  const [name, setName] = useState('');
  // „Später“ blendet Kinder-Meldungen für diese Sitzung aus – sie bleiben im Familien-Menü offen.
  const [later, setLater] = useState<string[]>([]);
  const eventKey = h?.kidEvent ? `ev:${h.kidEvent.childId}:${h.kidEvent.id}:${h.year}` : null;
  const offerChild = h?.children.find((c) => c.status === 'offer' && c.offer && !later.includes(`offer:${c.id}:${c.offer.round}`));
  const showEvent = eventKey && !later.includes(eventKey);
  const popup = birthChild ? `birth:${birthChild.id}` : h?.flirt ? 'flirt' : offerChild ? `offer:${offerChild.id}` : showEvent ? eventKey : null;
  useEffect(() => {
    if (popup) play(popup.startsWith('birth') ? 'fanfare' : 'notify');
  }, [popup]);

  if (birthChild) {
    const save = (openFamily: boolean) => {
      onChange(renameChild(career, birthChild.id, name || birthChild.name));
      setName('');
      if (openFamily) onFamily();
    };
    return (
      <div className="life-pop" role="dialog" aria-modal="true" aria-labelledby="birth-title">
        <Confetti pieces={70} />
        <div className="life-card birth">
          <div className="life-emoji" aria-hidden="true">👶</div>
          <h2 id="birth-title">Überraschung – du wirst Vater!</h2>
          <p>Neun Monate nach der Party kommt die Nachricht aus Brasilien: Das Kind ist da. Unter „Familie“ legst du fest, wie es aufwächst – Verein, Schule, Zocken, Essen.</p>
          <label>
            Wie soll das Kind heißen?
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={birthChild.name} maxLength={20} />
          </label>
          <div className="life-btns">
            <button className="btn secondary big" onClick={() => save(false)}>Später</button>
            <button className="btn primary big" onClick={() => save(true)}>Zur Familie</button>
          </div>
        </div>
      </div>
    );
  }

  if (h?.flirt) {
    return (
      <div className="life-pop" role="dialog" aria-modal="true" aria-labelledby="flirt-title">
        <div className="life-card flirt">
          <div className="life-emoji" aria-hidden="true">🇧🇷💃</div>
          <h2 id="flirt-title">Einladung zur After-Party</h2>
          <p>{h.flirt.text}</p>
          <p className="muted">Diese Einladung kommt nur ein einziges Mal. Wer mitgeht, riskiert Schlagzeilen – und neun Monate später kommt ein Baby.</p>
          <div className="life-btns">
            <button className="btn secondary big" onClick={() => onChange(resolveFlirt(career, false))}>🙅 Ablehnen</button>
            <button className="btn primary big" onClick={() => onChange(resolveFlirt(career, true))}>🍾 Mitgehen</button>
          </div>
        </div>
      </div>
    );
  }
  if (offerChild && offerChild.offer) {
    const key = `offer:${offerChild.id}:${offerChild.offer.round}`;
    return (
      <div className="life-pop" role="dialog" aria-modal="true" aria-labelledby="offer-title">
        <div className="life-card">
          <div className="life-emoji" aria-hidden="true">📝</div>
          <h2 id="offer-title">{offerChild.offer.round === 2 ? 'Letzte Chance für ' : 'Profi-Angebot für '}{offerChild.name}!</h2>
          <p>Ein Verein will {offerChild.name} unter Vertrag nehmen. Du verhandelst das Gehalt – zu hoch gepokert, und der Deal platzt.</p>
          <div className="life-btns">
            <button className="btn secondary big" onClick={() => setLater((l) => [...l, key])}>Später</button>
            <button className="btn primary big" onClick={() => { setLater((l) => [...l, key]); onFamily(); }}>Jetzt verhandeln</button>
          </div>
        </div>
      </div>
    );
  }

  if (showEvent && eventKey) {
    return (
      <div className="life-pop" role="dialog" aria-modal="true" aria-label="Neuigkeiten vom Kind">
        <div className="life-card">
          <KidEventBox career={career} onChange={onChange} />
          <button className="btn ghost small" onClick={() => setLater((l) => [...l, eventKey])}>Später entscheiden</button>
        </div>
      </div>
    );
  }
  return null;
}
