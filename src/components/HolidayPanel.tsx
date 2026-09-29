import { canStay, holiday, type HolidayTarget } from '../game/career';
import type { Career } from '../game/types';

const TARGETS: [HolidayTarget, string][] = [[3, '3 Saisons'], [5, '5 Saisons'], ['contract', 'Bis Vertragsende']];

/** Urlaubsmodus: mehrere Saisons am Stück, bleibt beim Verein und hält bei wichtigen Dingen an. */
export default function HolidayPanel({ career, onChange }: { career: Career; onChange: (c: Career) => void }) {
  const ready =
    !career.decision &&
    ((career.phase === 'window' && canStay(career)) || (career.phase === 'season' && (career.progress?.stage ?? 0) === 0));
  if (!ready) return null;
  return (
    <div className="panel holiday">
      <p className="eyebrow">Urlaubsmodus</p>
      <h3>Einfach laufen lassen</h3>
      <p className="hint">
        Du bleibst beim Verein, Entscheidungen und Presse werden übersprungen. Angehalten wird bei Vertragsende,
        einem Top-Angebot oder Karriereende.
      </p>
      <div className="chips">
        {TARGETS.map(([t, label]) => (
          <button key={label} className="chip" onClick={() => onChange(holiday(career, t))}>⏩ {label}</button>
        ))}
      </div>
    </div>
  );
}
