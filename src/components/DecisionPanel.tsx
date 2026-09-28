import { resolveDecision } from '../game/decisions';
import type { Career } from '../game/types';

interface Props {
  career: Career;
  onChange: (career: Career) => void;
}

/** Offene Entscheidung – muss beantwortet werden, bevor es weitergeht. */
export default function DecisionPanel({ career, onChange }: Props) {
  const d = career.decision;
  const r = career.decisionResult;
  if (d) {
    return (
      <div className="panel decision">
        <span className="pill">Entscheidung</span>
        <h2>{d.title}</h2>
        <p>{d.text}</p>
        <div className="decision-options">
          {d.options.map((o) => (
            <button key={o.id} className="btn" onClick={() => onChange(resolveDecision(career, o.id))}>
              {o.label}
              <small>{o.hint}</small>
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (!r) return null;
  return (
    <div className={`panel decision-result ${r.tone}`}>
      <strong>{r.title}</strong> – {r.text}
    </div>
  );
}
