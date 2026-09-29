import { getClub } from '../data/leagues';
import { setStageLoad } from '../game/career';
import { clubLeagueId, currentClubId } from '../game/player';
import { STAGES, leagueRounds, sortTable, stageRounds, upcomingFixtures } from '../game/season';
import type { Career, StageLoad } from '../game/types';

const LOAD_OPTIONS: { id: StageLoad; label: string; hint: string }[] = [
  { id: 'normal', label: 'Normal', hint: 'Ausgewogen – kein Risiko, kein Bonus' },
  { id: 'full', label: 'Voll angreifen', hint: 'Mehr Einsätze, aber höheres Verletzungsrisiko' },
  { id: 'extra', label: 'Extra-Schichten', hint: 'Bessere Form, etwas mehr Verletzungsgefahr' },
  { id: 'rest', label: 'Schonen', hint: 'Deutlich weniger Verletzungen, dafür öfter auf der Bank' },
];

/** Etappen-Ansicht: Bilanz der letzten Etappe, Tabelle, Formkurve, nächste Gegner und Belastung. */
export default function StagePanel({ career, onChange }: { career: Career; onChange: (c: Career) => void }) {
  const prog = career.progress;
  const p = career.player;
  if (!prog) return null;
  const stage = prog.stage ?? 0;
  const clubId = currentClubId(p);
  const leagueId = clubLeagueId(career, clubId);
  const rounds = leagueRounds(prog, leagueId);
  const [from, to] = stageRounds(rounds.length, Math.min(stage, STAGES - 1));
  const log = prog.stageLog ?? [];
  const last = log[log.length - 1];
  const prevPos = log.length > 1 ? log[log.length - 2].position : null;
  const table = sortTable(prog.rows[leagueId]);
  const ownIdx = table.findIndex((r) => r.clubId === clubId);
  const shown = table
    .map((r, i) => ({ r, i }))
    .filter(({ i }) => i < 3 || Math.abs(i - ownIdx) <= 1 || i === table.length - 1);
  const played = prog.matches.filter((m) => m.minutes > 0 && m.rating !== null).slice(-10);
  const fixtures = upcomingFixtures(career, prog, Math.min(stage, STAGES - 1));
  const own = prog.strength[clubId] ?? 75;
  const load = prog.load ?? 'normal';

  return (
    <div className="panel stage">
      <p className="eyebrow">{stage === 0 ? 'Saisonstart' : `Etappe ${stage + 1} von ${STAGES}`}</p>
      <h2>Spieltag {from + 1}–{to}</h2>
      <div className="stage-progress" aria-label={`Etappe ${stage + 1} von ${STAGES}`}>
        {Array.from({ length: STAGES }, (_, i) => (
          <span key={i} className={i < stage ? 'done' : i === stage ? 'current' : ''} />
        ))}
      </div>

      {last && (
        <>
          <h3>Letzte Etappe</h3>
          <div className="tiles compact">
            <div className="tile"><span className="tile-label">Spiele</span><span className="tile-value">{last.apps}</span></div>
            <div className="tile"><span className="tile-label">Tore</span><span className="tile-value">{last.goals}</span></div>
            <div className="tile"><span className="tile-label">Vorlagen</span><span className="tile-value">{last.assists}</span></div>
            <div className="tile"><span className="tile-label">Ø Note</span><span className="tile-value">{last.avgRating?.toFixed(1) ?? '–'}</span></div>
            <div className="tile">
              <span className="tile-label">Tabellenplatz</span>
              <span className="tile-value">{last.position}.</span>
              {prevPos !== null && prevPos !== last.position && (
                <span className={`tile-sub ${last.position < prevPos ? 'up' : 'down'}`}>
                  {last.position < prevPos ? `▲ ${prevPos - last.position}` : `▼ ${last.position - prevPos}`} Plätze
                </span>
              )}
            </div>
          </div>
        </>
      )}

      <div className="stage-grid">
        {stage > 0 && (
          <section>
            <h3>Tabelle</h3>
            <table className="stats mini-table">
              <tbody>
                {shown.map(({ r, i }, k) => (
                  <tr key={r.clubId} className={r.clubId === clubId ? 'own' : ''}>
                    <td>{k > 0 && shown[k - 1].i !== i - 1 ? '…' : ''}{i + 1}.</td>
                    <td className="left">{getClub(r.clubId).name}</td>
                    <td>{r.played}</td>
                    <td><strong>{r.points}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {played.length > 0 && (
          <section>
            <h3>Formkurve</h3>
            <div className="form-curve" role="img" aria-label="Noten der letzten Spiele">
              {played.map((m, i) => (
                <span
                  key={i}
                  className={m.rating! >= 7.5 ? 'hot' : m.rating! < 6.5 ? 'cold' : ''}
                  style={{ height: `${Math.max(12, (m.rating! - 5) * 22)}%` }}
                  title={`${getClub(m.opponent).name}: Note ${m.rating}`}
                />
              ))}
            </div>
            <p className="hint">Letzte {played.length} Einsätze · Ø {(played.reduce((a, m) => a + m.rating!, 0) / played.length).toFixed(2)}</p>
          </section>
        )}

        {fixtures.length > 0 && stage < STAGES && (
          <section>
            <h3>Nächste Gegner</h3>
            <ul className="fixtures">
              {fixtures.map((f, i) => {
                const s = prog.strength[f.opponentId] ?? 75;
                const tag = s >= own + 2 ? 'Topspiel' : s <= own - 5 ? 'Pflichtsieg' : null;
                return (
                  <li key={i}>
                    <span className="ha">{f.home ? 'H' : 'A'}</span>
                    <span className="grow">{getClub(f.opponentId).name}</span>
                    {tag && <span className={`pill ${tag === 'Topspiel' ? 'tag-top' : ''}`}>{tag}</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      <section className="load">
        <h3>Belastung für diese Etappe</h3>
        <div className="chips" role="radiogroup" aria-label="Belastung">
          {LOAD_OPTIONS.map((o) => (
            <button
              key={o.id}
              role="radio"
              aria-checked={load === o.id}
              className={`chip ${load === o.id ? 'active' : ''}`}
              onClick={() => onChange(setStageLoad(career, o.id))}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="hint">{LOAD_OPTIONS.find((o) => o.id === load)?.hint}</p>
      </section>
    </div>
  );
}
