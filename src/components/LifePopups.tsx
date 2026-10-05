import { useState } from 'react';
import { resolveFlirt, renameChild } from '../game/family';
import type { Career } from '../game/types';
import Confetti from './Confetti';

/** Große Pop-ups für die Familie: Einladung zur After-Party und „Du wirst Vater!“. */
export default function LifePopups({ career, onChange, onFamily }: { career: Career; onChange: (c: Career) => void; onFamily: () => void }) {
  const h = career.household;
  const birthChild = h?.birth ? h.children.find((c) => c.id === h.birth!.childId) : null;
  const [name, setName] = useState('');

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
          <p>Neun Monate nach der Party kommt die Nachricht aus Brasilien: Das Kind ist da. Ab jetzt triffst du in jeder Winterpause 5 Entscheidungen für seine Erziehung.</p>
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
          <p className="muted">Wer mitgeht, riskiert Schlagzeilen – und manchmal kommt neun Monate später ein Baby.</p>
          <div className="life-btns">
            <button className="btn secondary big" onClick={() => onChange(resolveFlirt(career, false))}>🙅 Ablehnen</button>
            <button className="btn primary big" onClick={() => onChange(resolveFlirt(career, true))}>🍾 Mitgehen</button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
