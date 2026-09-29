import { setTrainingFocus } from '../game/career';
import { goalValue } from '../game/goals';
import { focusOptions } from '../game/training';
import type { Career, GoalResult, MatchLine, SeasonGoal } from '../game/types';

function formatValue(g: SeasonGoal, v: number) {
  return g.metric === 'rating' ? v.toFixed(2) : String(v);
}

/** Saisonziele des Trainers – optional mit Zwischenstand (Winterpause). */
export function SeasonGoals({ goals, matches }: { goals: SeasonGoal[]; matches?: MatchLine[] }) {
  if (!goals.length) return null;
  return (
    <section className="goals">
      <h3>🎯 Saisonziele des Trainers</h3>
      <ul>
        {goals.map((g) => {
          const v = matches ? goalValue(g.metric, matches) : null;
          const pct = v === null ? 0 : Math.min(100, (v / g.target) * 100);
          return (
            <li key={g.metric}>
              <span>{g.label}</span>
              {v !== null && (
                <>
                  <span className="bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
                  <small>{formatValue(g, v)} / {formatValue(g, g.target)}</small>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {!matches && <p className="hint">Alle erreicht: mehr Vertrauen und 10 % Gehaltsbonus. Keins erreicht: der Trainer ist enttäuscht.</p>}
    </section>
  );
}

export function GoalResults({ results }: { results: GoalResult[] }) {
  if (!results.length) return null;
  return (
    <section className="goals">
      <h3>🎯 Saisonziele</h3>
      <ul>
        {results.map((r) => (
          <li key={r.metric} className={r.met ? 'up' : 'down'}>
            <span>{r.met ? '✓' : '✗'} {r.label}</span>
            <small>erreicht: {formatValue(r, r.value)}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Auswahl des Trainingsschwerpunkts für die nächste Halbserie. */
export function TrainingPicker({ career, onChange }: { career: Career; onChange: (c: Career) => void }) {
  const p = career.player;
  const current = p.trainingFocus ?? 'balanced';
  const options = focusOptions(p.position);
  const active = options.find((o) => o.id === current);
  return (
    <section className="training">
      <h3>🏋️ Trainingsschwerpunkt</h3>
      <div className="chips" role="radiogroup" aria-label="Trainingsschwerpunkt">
        {options.map((o) => (
          <button
            key={String(o.id)}
            role="radio"
            aria-checked={o.id === current}
            className={`chip ${o.id === current ? 'active' : ''} ${o.key ? 'key' : ''}`}
            onClick={() => onChange(setTrainingFocus(career, o.id))}
            title={o.hint}
          >
            {o.key ? '★ ' : ''}{o.label}
          </button>
        ))}
      </div>
      <p className="hint">{active?.hint}. ★ = Schlüsselattribute deiner Position.</p>
    </section>
  );
}
