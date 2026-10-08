import { useEffect, useRef } from 'react';
import type { FinalState } from '../game/types';
import { play } from '../sound';

interface Props {
  state: FinalState;
  /** Überschrift, z. B. „Topspiel“ oder „DFB-Pokal-Finale“. */
  title: string;
  /** Vor dem Anpfiff: selbst spielen oder simulieren? */
  intro?: boolean;
  onStart?: () => void;
  onStep: (choice?: string) => void;
  onAuto: () => void;
  onDone: () => void;
}

/** Live-Spiel: Ticker, Spielstand und die Momente, in denen du entscheidest. */
export default function LiveMatch({ state, title, intro, onStart, onStep, onAuto, onDone }: Props) {
  const logRef = useRef<HTMLDivElement>(null);
  const last = state.log[state.log.length - 1];
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
    if (last?.tone === 'goal') play('fanfare');
    else if (last?.tone === 'against') play('fall');
    else if (state.pending) play('notify');
  }, [state.log.length, state.pending, last?.tone]);

  return (
    <div className="live" role="dialog" aria-modal="true" aria-label={title}>
      <div className="live-card">
        <p className="live-kicker">{title}</p>
        <div className="live-score">
          <span className="live-team">{state.ownName}</span>
          <strong>{state.score[0]} : {state.score[1]}</strong>
          <span className="live-team">{state.final.opponentName}</span>
        </div>
        <p className="live-minute">{state.done ? 'Abpfiff' : intro ? 'Vor dem Anpfiff' : `${state.minute}. Minute`}</p>

        {intro ? (
          <div className="live-intro">
            <p>Das wichtigste Spiel dieser Halbserie. Spiel es selbst – du entscheidest in den entscheidenden Momenten – oder lass es simulieren.</p>
            <div className="live-actions">
              <button className="btn primary big" onClick={onStart}>Selbst spielen</button>
              <button className="btn secondary big" onClick={onAuto}>Simulieren</button>
            </div>
          </div>
        ) : (
          <>
            <div className="live-log" ref={logRef}>
              {state.log.map((l, i) => <p key={i} className={`t-${l.tone}`}>{l.text}</p>)}
            </div>
            {state.pending ? (
              <div className="live-decision">
                <p><b>{state.pending.text}</b></p>
                <div className="live-options">
                  {state.pending.options.map((o) => (
                    <button key={o.id} className="btn primary" onClick={() => onStep(o.id)}>
                      {o.label}{o.hint && <small>{o.hint}</small>}
                    </button>
                  ))}
                </div>
              </div>
            ) : state.done ? (
              <div className="live-actions">
                <p className="live-sum">
                  {state.playerRole === 'bench' ? 'Du kamst nicht zum Einsatz.' : `Deine Bilanz: ${state.playerGoals} ${state.playerGoals === 1 ? 'Tor' : 'Tore'}, ${state.playerAssists} ${state.playerAssists === 1 ? 'Vorlage' : 'Vorlagen'}.`}
                </p>
                <button className="btn primary big" onClick={onDone}>Weiter</button>
              </div>
            ) : (
              <div className="live-actions">
                <button className="btn primary big" onClick={() => onStep()}>Weiter ›</button>
                <button className="btn ghost small" onClick={onAuto}>Automatisch zu Ende spielen</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
