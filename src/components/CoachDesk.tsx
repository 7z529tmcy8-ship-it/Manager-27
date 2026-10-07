import { ASK, POLICIES, coachStyle, emptyProfile, getPolicy, incidentOptions, resolveIncident, setPolicy } from '../game/coachlife';
import type { Career } from '../game/types';

/** Offene Meldungen aus der Kabine – müssen vor dem nächsten Spielabschnitt entschieden werden. */
export function CoachInbox({ career, onChange }: { career: Career; onChange: (c: Career) => void }) {
  const pending = career.coach?.pending ?? [];
  if (!pending.length) return null;
  return (
    <section className="coach-inbox" aria-label="Meldungen">
      <h3>📬 {pending.length === 1 ? 'Eine Meldung' : `${pending.length} Meldungen`} – deine Entscheidung</h3>
      {pending.map((i) => (
        <div key={i.id} className={`incident ${i.big ? 'big' : ''}`}>
          <strong>{i.title}{i.big && <span className="incident-big">Wichtiges Spiel</span>}</strong>
          <p>{i.text}</p>
          <div className="incident-opts">
            {incidentOptions(i).map((o) => {
              const def = getPolicy(i.type).options.find((x) => x.id === o.id);
              return (
                <button key={o.id} className="btn secondary" onClick={() => onChange(resolveIncident(career, i.id, o.id))}>
                  <b>{o.label}</b>
                  {def && <small>{def.text}</small>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

const Meter = ({ label, value, min = -100 }: { label: string; value: number; min?: number }) => {
  const pct = ((value - min) / (100 - min)) * 100;
  return (
    <div className="ruf-meter">
      <span>{label}</span>
      <span className="coach-bar"><i className={pct < 35 ? 'low' : pct < 60 ? 'mid' : 'high'} style={{ width: `${pct}%` }} /></span>
      <b>{Math.round(value)}</b>
    </div>
  );
};

/** Trainer-Ruf, Linie für typische Situationen und die letzten Meldungen. */
export function CoachLine({ career, onChange }: { career: Career; onChange: (c: Career) => void }) {
  const coach = career.coach!;
  const profile = coach.profile ?? emptyProfile();
  const policies = coach.policies ?? {};
  const feed = coach.feed ?? [];
  return (
    <>
      <div className="coach-ruf">
        <div className="ruf-head"><strong>Dein Ruf</strong><span className="pill">{coachStyle(profile)}</span></div>
        <Meter label="🗣️ Kabine" value={profile.kabine} />
        <Meter label="📺 Medien" value={profile.medien} />
        <Meter label="📏 Konsequenz" value={profile.konsequenz} min={0} />
        <small className="muted">Gute Stimmung in der Kabine, ein gutes Medienbild und eine klare Linie verbessern am Saisonende deinen Trainerwert. Die Medien beeinflussen auch das Vertrauen des Vorstands.</small>
      </div>

      <details className="coach-more">
        <summary>📏 Deine Linie als Trainer</summary>
        <p className="cs-sub">Leg vorher fest, wie du in typischen Situationen handelst – dann entscheidet das Spiel nach deiner Linie. Oder du entscheidest jedes Mal selbst, wenn es passiert.</p>
        {POLICIES.map((p) => {
          const current = policies[p.id] ?? ASK;
          return (
            <div key={p.id} className="policy">
              <strong>{p.icon} {p.name}</strong>
              <small className="muted">{p.question}</small>
              <div className="fam-seg" role="radiogroup" aria-label={p.name}>
                {p.options.map((o) => (
                  <button key={o.id} role="radio" aria-checked={current === o.id} className={current === o.id ? 'on' : ''} title={o.text} onClick={() => onChange(setPolicy(career, p.id, o.id))}>{o.label}</button>
                ))}
                <button role="radio" aria-checked={current === ASK} className={current === ASK ? 'on' : ''} onClick={() => onChange(setPolicy(career, p.id, ASK))}>🤔 Selbst entscheiden</button>
              </div>
            </div>
          );
        })}
      </details>

      {feed.length > 0 && (
        <details className="coach-more">
          <summary>📰 Letzte Meldungen ({feed.length})</summary>
          <ul className="coach-feed">{feed.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </details>
      )}
    </>
  );
}
