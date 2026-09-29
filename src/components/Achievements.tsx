import { useMemo } from 'react';
import { ACHIEVEMENTS } from '../game/achievements';
import { listCareers } from '../game/storage';

/** Karriereziele über alle gespeicherten Karrieren. */
export default function Achievements({ onBack }: { onBack: () => void }) {
  const careers = useMemo(() => listCareers(), []);
  const rows = ACHIEVEMENTS.map((a) => {
    const holders = careers.filter((c) => c.unlocked?.[a.id]).map((c) => `${c.player.name} (${c.unlocked![a.id]})`);
    // Bester Fortschritt einer noch laufenden oder beendeten Karriere
    const best = careers.reduce((m, c) => {
      const [v, t] = a.progress(c);
      return Math.max(m, Math.min(1, v / t));
    }, 0);
    return { a, holders, best };
  });
  const done = rows.filter((r) => r.holders.length).length;

  return (
    <main className="achievements">
      <div className="topbar">
        <button className="nav-back" onClick={onBack}>‹ Zurück</button>
        <div className="topbar-title">
          <h1>Erfolge</h1>
          <small>{done} von {ACHIEVEMENTS.length} freigeschaltet – über alle Karrieren</small>
        </div>
      </div>
      <div className="achievement-grid">
        {rows.map(({ a, holders, best }) => (
          <article key={a.id} className={`achievement ${holders.length ? 'done' : ''}`}>
            <span className="ach-icon" aria-hidden="true">{a.icon}</span>
            <div>
              <strong>{a.name}</strong>
              <p>{a.description}</p>
              {holders.length ? (
                <small className="up">✓ {holders.slice(0, 3).join(', ')}{holders.length > 3 ? ` +${holders.length - 3}` : ''}</small>
              ) : (
                <>
                  <span className="bar" aria-hidden="true"><span style={{ width: `${Math.round(best * 100)}%` }} /></span>
                  <small className="muted">Bester Fortschritt: {Math.round(best * 100)} %</small>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      <p className="disclaimer">Erfolge hängen an den gespeicherten Karrieren – wer eine Karriere löscht, löscht auch ihre Erfolge.</p>
    </main>
  );
}
