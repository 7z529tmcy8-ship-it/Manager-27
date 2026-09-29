import { useEffect, useRef, useState } from 'react';
import { autoPlayFinal, finishFinal, playFinalStep } from '../game/career';
import { finalRating } from '../game/final';
import type { Career } from '../game/types';

interface Props {
  career: Career;
  onChange: (career: Career) => void;
}

/** Live-Ticker eines Finales: Szenen laufen automatisch weiter, bei eigenen Szenen entscheidest du. */
export default function LiveFinal({ career, onChange }: Props) {
  const state = career.liveFinal!;
  const [running, setRunning] = useState(true);
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!running || state.pending || state.done) return;
    const t = setTimeout(() => onChange(playFinalStep(career)), 1100);
    return () => clearTimeout(t);
  }, [running, state, career, onChange]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.log.length]);

  const rating = state.done ? finalRating(state) : null;
  const so = state.shootout;

  return (
    <div className="panel final">
      <p className="eyebrow">Live</p>
      <h2>{state.final.title}</h2>
      <div className="scoreboard" aria-live="polite">
        <span className="team">{state.ownName}</span>
        <span className="score">
          {state.score[0]} : {state.score[1]}
          {so && <small>i. E. {so.own}:{so.opp}</small>}
        </span>
        <span className="team">{state.final.opponentName}</span>
        <span className="minute">{state.done ? 'Abpfiff' : so ? 'Elfmeterschießen' : `${state.minute}'`}</span>
      </div>

      <ol className="ticker" ref={logRef}>
        {state.log.map((l, i) => (
          <li key={i} className={l.tone}>{l.text}</li>
        ))}
      </ol>

      {state.pending && (
        <div className="final-decision">
          <p><strong>{state.pending.text}</strong></p>
          <div className="decision-options">
            {state.pending.options.map((o) => (
              <button key={o.id} className="btn primary" onClick={() => onChange(playFinalStep(career, o.id))}>
                {o.label}
                {o.hint && <small>{o.hint}</small>}
              </button>
            ))}
          </div>
        </div>
      )}

      {state.done ? (
        <div className="final-result">
          <p className={state.won ? 'up' : 'down'}>
            <strong>{state.won ? '🏆 Gewonnen!' : 'Verloren.'}</strong>
            {rating !== null && ` Deine Note: ${rating.toFixed(1)}`}
            {state.playerGoals > 0 && ` · ${state.playerGoals} ${state.playerGoals === 1 ? 'Tor' : 'Tore'}`}
            {state.playerAssists > 0 && ` · ${state.playerAssists} ${state.playerAssists === 1 ? 'Vorlage' : 'Vorlagen'}`}
          </p>
          <button className="btn primary big" onClick={() => onChange(finishFinal(career))}>Weiter</button>
        </div>
      ) : (
        !state.pending && (
          <div className="window-actions">
            <button className="btn" onClick={() => setRunning((r) => !r)}>{running ? 'Pause' : 'Weiterlaufen lassen'}</button>
            {!running && <button className="btn" onClick={() => onChange(playFinalStep(career))}>Nächste Szene</button>}
            <button className="btn ghost" onClick={() => onChange(autoPlayFinal(career))}>Zu Ende simulieren</button>
          </div>
        )
      )}
    </div>
  );
}
