import { canRetrain, cancelRetrain, positionName, retrainOptions, startRetrain } from '../game/position';
import type { Career, Position } from '../game/types';
import { play } from '../sound';
import Icon from './Icon';

/** Lage der Positionen auf dem Mini-Spielfeld (in %, Angriff nach oben). */
const SPOT: Record<Position, [number, number]> = {
  ST: [50, 13], FL: [80, 24], ZOM: [50, 31], ZM: [50, 47], ZDM: [50, 61], AV: [18, 70], IV: [50, 78], TW: [50, 92],
};
const halvesText = (n: number) => (n === 1 ? '1 Halbserie' : `${n} Halbserien`);

/** Position: gezieltes Positionstraining auf eine Nachbarposition – mit Fortschritt und ehrlicher Vorschau. */
export default function PositionPanel({ career, onChange, onClose }: { career: Career; onChange: (c: Career) => void; onClose: () => void }) {
  const p = career.player;
  const r = p.retrain;
  const options = canRetrain(career) ? retrainOptions(p) : [];
  const targets = new Set(options.map((o) => o.to));

  const start = (to: Position, after: number, halves: number) => {
    if (!window.confirm(`Positionstraining zum ${positionName(to)} starten?\n\nDauer: ${halvesText(halves)} · danach Wertung ca. ${after}.\nSo lange ruht dein normaler Trainingsschwerpunkt.`)) return;
    onChange(startRetrain(career, to));
    play('unlock');
  };

  return (
    <div className="overlay fam-overlay" role="dialog" aria-modal="true" aria-label="Position">
      <div className="overlay-inner">
        <header className="overlay-head"><button className="nav-back" onClick={onClose}>‹ Zurück</button></header>
        <h2 className="fam-title">Position</h2>
        <p className="cs-sub">Lerne gezielt eine Nachbarposition – zum Beispiel vom Stürmer zum Zehner. Die Attribute bleiben, die Wertung ergibt sich danach neu aus dem, was die neue Position braucht.</p>

        <div className="pos-pitch" aria-hidden="true">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pos-lines">
            <rect x="4" y="3" width="92" height="94" rx="2" />
            <line x1="4" y1="50" x2="96" y2="50" />
            <circle cx="50" cy="50" r="9" />
            <rect x="30" y="85" width="40" height="12" />
            <rect x="30" y="3" width="40" height="12" />
            {[...targets].map((to) => {
              const [x1, y1] = SPOT[p.position];
              const [x2, y2] = SPOT[to];
              return <line key={to} className={`pos-link ${r?.to === to ? 'active' : ''}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
            })}
          </svg>
          {(Object.keys(SPOT) as Position[]).map((pos) => (
            <span key={pos} className={`pos-spot ${pos === p.position ? 'me' : ''} ${targets.has(pos) ? 'can' : ''} ${r?.to === pos ? 'goal' : ''}`}
              style={{ left: `${SPOT[pos][0]}%`, top: `${SPOT[pos][1]}%` }}>{pos}</span>
          ))}
        </div>

        {r && (
          <section className="pos-progress">
            <div className="pos-progress-head">
              <strong>{positionName(p.position)} <Icon name="arrow" size={16} /> {positionName(r.to)}</strong>
              <span>{r.total - r.left}/{r.total}</span>
            </div>
            <div className="pos-steps">
              {Array.from({ length: r.total }, (_, i) => <i key={i} className={i < r.total - r.left ? 'done' : ''} />)}
            </div>
            <small>Noch {halvesText(r.left)}. Jede Halbserie wachsen die Schlüsselattribute der neuen Position um 1 – dein normaler Trainingsschwerpunkt ruht so lange.</small>
            <button className="btn secondary small" onClick={() => window.confirm('Positionstraining abbrechen? Der bisherige Fortschritt an den Attributen bleibt.') && onChange(cancelRetrain(career))}>Abbrechen</button>
          </section>
        )}

        {!r && options.length > 0 && (
          <ul className="pos-options">
            {options.map((o) => {
              const diff = o.after - p.ovr;
              return (
                <li key={o.to}>
                  <div className="pos-opt-main">
                    <span className="pos-badge">{o.to}</span>
                    <span className="pos-opt-text">
                      <strong>{positionName(o.to)}</strong>
                      <small>{halvesText(o.halves)} · heute dort {o.now}</small>
                    </span>
                    <span className={`pos-after ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}`}>
                      <b>{o.after}</b><small>{diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '±0'}</small>
                    </span>
                  </div>
                  <button className={`btn ${diff >= 0 ? 'primary' : 'secondary'} small`} onClick={() => start(o.to, o.after, o.halves)}>Training starten</button>
                </li>
              );
            })}
          </ul>
        )}

        {!r && !options.length && (
          <p className="cs-note neutral">
            {p.position === 'TW' ? 'Torhüter bleiben Torhüter.' : p.nlz ? 'Im Nachwuchsleistungszentrum entscheidet der Jugendtrainer über Umschulungen.' : 'Positionstraining geht nur während der aktiven Karriere.'}
          </p>
        )}

        <section className="pos-how">
          <h3>So kann sich deine Position ändern</h3>
          <ul>
            <li><b>Positionstraining</b> – selbst gewählt, 1–2 Halbserien (ab 31 eine mehr).</li>
            <li><b>Vorschlag vom Co-Trainer</b> – passt eine Nachbarposition klar besser zu deinen Werten, meldet er sich (höchstens alle drei Jahre).</li>
            <li><b>Der Trainer stellt um</b> – bei wenig Spielzeit oder im Alter wirst du gefragt, ob du woanders spielst.</li>
            <li><b>Umschulung im NLZ</b> – als Talent schlägt der Jugendtrainer die passende Position vor.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
