import { getClubState, setClubState, useClub } from '../clubStore';
import { SCANDAL_FIRED, SCANDAL_SUSPENSION, SCANDAL_WARNING, VICES, canDoVice, doVice, viceUsedThisBreak } from '../game/vices';
import type { Career } from '../game/types';

/** „Abseits des Platzes“: riskante Aktionen mit Skandal-Zähler (eine pro Pause). */
export default function VicePanel({ career, onChange }: { career: Career; onChange: (c: Career) => void }) {
  const club = useClub();
  const scandal = career.scandal ?? 0;
  const used = viceUsedThisBreak(career);
  const note = career.viceNote;
  const level = scandal >= SCANDAL_SUSPENSION ? 'high' : scandal >= SCANDAL_WARNING ? 'mid' : 'low';
  const strikes = career.scandalStrikes ?? 0;

  const run = (id: (typeof VICES)[number]['id']) => {
    const v = VICES.find((x) => x.id === id)!;
    if (v.confirm && !window.confirm(v.confirm)) return;
    if (v.price && getClubState().coins < v.price) return;
    const res = doVice(career, id);
    if (res.coins !== 0) {
      const c = getClubState();
      setClubState({ ...c, coins: Math.max(0, c.coins + res.coins) });
    }
    onChange(res.career);
  };

  return (
    <details className="vice" open={!!note}>
      <summary>
        <span>🌙 Abseits des Platzes</span>
        <span className={`vice-meter ${level}`} aria-label={`Skandal ${scandal} von ${SCANDAL_FIRED}`}>
          <i style={{ width: `${(scandal / SCANDAL_FIRED) * 100}%` }} />
        </span>
      </summary>
      <p className="cs-sub">
        Eine Aktion pro Pause. Skandal {scandal}/{SCANDAL_FIRED}: ab {SCANDAL_WARNING} Abmahnung, ab {SCANDAL_SUSPENSION} Suspendierung,
        bei {SCANDAL_FIRED} fliegst du raus{strikes ? ' – beim nächsten Mal ist die Karriere vorbei' : ''}. Der Zähler sinkt in jeder Pause etwas.
      </p>
      {note && <p className={`cs-note ${note.tone}`}><b>{note.title}:</b> {note.text}</p>}
      <div className="vice-grid">
        {VICES.map((v) => {
          const tooPoor = !!v.price && club.coins < v.price;
          const ok = canDoVice(career, v.id) && !tooPoor;
          return (
            <button key={v.id} className={`vice-card ${v.id === 'bet' || v.id === 'doping' || v.id === 'drugs' ? 'danger' : ''}`} disabled={!ok} onClick={() => run(v.id)}>
              <strong>{v.icon} {v.name}</strong>
              {v.price && <span className="clinic-price">🪙 {v.price.toLocaleString('de-DE')}</span>}
              <small className="vice-reward">✓ {v.reward}</small>
              <small className="vice-risk">⚠ {v.risk}</small>
              {!ok && <em>{used ? 'Erst in der nächsten Pause' : tooPoor ? 'Zu wenig Coins' : v.summerOnly ? 'Nur im Sommer' : 'Gerade nicht möglich'}</em>}
            </button>
          );
        })}
      </div>
    </details>
  );
}
