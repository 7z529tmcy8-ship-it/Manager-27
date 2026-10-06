import { getClubState, setClubState, useClub } from '../clubStore';
import { GLAM_INCOME, MAX_GLAM, TREATMENTS, canTreat, clinicUsedThisBreak, glamIncome, treat, type ClinicId } from '../game/clinic';
import type { Career } from '../game/types';

const fmt = (n: number) => n.toLocaleString('de-DE');

/** Klinik: Schönheits-OPs (Glamour → Werbedeals) und die „volle Kur“. Eine Behandlung pro Pause, bezahlt mit Coins. */
export default function ClinicPanel({ career, onChange, onClose }: { career: Career; onChange: (c: Career) => void; onClose: () => void }) {
  const club = useClub();
  const glam = career.glam ?? 0;
  const used = clinicUsedThisBreak(career);
  const inBreak = career.phase === 'winter' || career.phase === 'window';
  const note = used ? career.clinicNote : null;

  const run = (id: ClinicId) => {
    const t = TREATMENTS.find((x) => x.id === id)!;
    if (!window.confirm(t.confirm ?? `${t.name} für ${fmt(t.price)} Coins machen?`)) return;
    const res = treat(career, id, getClubState().coins);
    if (!res.cost) return;
    const c = getClubState();
    setClubState({ ...c, coins: c.coins - res.cost });
    onChange(res.career);
  };

  return (
    <div className="overlay fam-overlay" role="dialog" aria-modal="true" aria-label="Klinik">
      <div className="overlay-inner">
        <header className="overlay-head">
          <button className="nav-back" onClick={onClose}>‹ Zurück</button>
          <span className="hub-coins">🪙 {fmt(club.coins)}</span>
        </header>
        <h2 className="fam-title">💎 Klinik</h2>
        <p className="cs-sub">
          Eine Behandlung pro Pause, bezahlt mit Coins. Schönheits-OPs bringen Glamour – und Glamour bringt Werbedeals
          (+{fmt(GLAM_INCOME)} Coins pro Punkt und Jahr). Nichts davon ist ohne Risiko.
        </p>

        <div className="clinic-glam">
          <span>✨ Glamour</span>
          <span className="coach-bar"><i className="high" style={{ width: `${(glam / MAX_GLAM) * 100}%` }} /></span>
          <b>{glam}/{MAX_GLAM}</b>
          {glam > 0 && <small>Werbedeals: +{fmt(glamIncome(career))} 🪙 pro Jahr</small>}
          {(career.player.burnout ?? 0) > 0 && <small className="clinic-burn">⚠ Körper geschädigt (×{career.player.burnout}): schnellerer Abbau, verletzungsanfällig</small>}
        </div>

        {note && <p className={`cs-note ${note.tone}`}><b>{note.title}:</b> {note.text}</p>}
        {!inBreak && <p className="cs-note neutral">Die Klinik hat nur in der Winterpause und im Sommer Termine frei.</p>}

        <div className="vice-grid">
          {TREATMENTS.map((t) => {
            const ok = canTreat(career, t.id, club.coins);
            const why = !inBreak ? 'Nur in Pausen' : used ? 'Erst in der nächsten Pause' : t.summerOnly && career.phase !== 'window' ? 'Nur im Sommer' : club.coins < t.price ? `Fehlen ${fmt(t.price - club.coins)} 🪙` : '';
            return (
              <button key={t.id} className={`vice-card ${t.id === 'fullkur' || t.id === 'bbl' ? 'danger' : ''}`} disabled={!ok} onClick={() => run(t.id)}>
                <strong>{t.icon} {t.name}</strong>
                <span className="clinic-price">🪙 {fmt(t.price)}</span>
                <small className="vice-reward">✓ {t.reward}</small>
                <small className="vice-risk">⚠ {t.risk}</small>
                {!ok && why && <em>{why}</em>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
