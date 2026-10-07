import { useState } from 'react';
import { getClub, getLeague } from '../data/leagues';
import {
  MAX_SIGNINGS,
  TACTICS,
  WINTER_ACTIONS,
  boardTrust,
  canStartCoaching,
  chooseCoachClub,
  coachSummary,
  endCoaching,
  expectedPosition,
  livePosition,
  playCoachHalf,
  quickCoachLabel,
  quickCoachSeason,
  setTactic,
  signTarget,
  signingBoost,
  startCoaching,
  startRating,
  type WinterAction,
  winterAction,
} from '../game/coach';
import { flagOf } from '../data/flags';
import { clubLeagueId, clubStrength, formatMoney } from '../game/player';
import type { Career, CoachTactic } from '../game/types';
import { CoachInbox, CoachLine } from './CoachDesk';

/** Trainerkarriere nach dem Karriereende: Zeitleiste der Trainerstationen plus Vereinswahl bzw. Simulation. */
export default function CoachPanel({ career, onChange, onExit }: { career: Career; onChange: (c: Career) => void; onExit: () => void }) {
  const coach = career.coach;
  const [picked, setPicked] = useState<string | null>(null);

  if (!coach) {
    return (
      <section className="cs-window">
        <h2>Karriereende</h2>
        <p className="cs-sub">{career.retiredReason}</p>
        <p className="cs-sub">👑 Deine Ikonen-Karte liegt jetzt in der Sammlung.</p>
        {canStartCoaching(career) && (
          <div className="coach-start">
            <strong>📋 Trainer werden?</strong>
            <span>Starte als Trainer – mit deinem Ruf als Spieler beginnst du mit Trainerwert {startRating(career)}.</span>
            <button className="btn primary big cs-go" onClick={() => onChange(startCoaching(career))}>Trainerkarriere starten</button>
          </div>
        )}
        <button className="btn secondary big cs-go" onClick={onExit}>Zum Hauptmenü</button>
      </section>
    );
  }

  const sum = coachSummary(coach);
  const options = coach.phase === 'choose' ? [...(coach.clubId ? [coach.clubId] : []), ...coach.offers] : [];
  const confirm = () => {
    if (!picked) return;
    setPicked(null);
    onChange(chooseCoachClub(career, picked));
  };

  return (
    <>
      <h2 className="coach-title">📋 Trainerkarriere</h2>
      <div className="coach-head">
        <div className="cs-ovr top"><small>TW</small><strong>{coach.rating}</strong></div>
        <div>
          <div className="cs-club">{coach.clubId ? getClub(coach.clubId).name : 'Vereinslos'}</div>
          <div className="cs-league">
            {coach.age} Jahre · {sum.seasons} Saisons · {sum.titles} Titel · {sum.promotions} Aufstiege
          </div>
        </div>
      </div>

      <section className="cs-window">
        {coach.note && <p className={`cs-note ${coach.note.startsWith('Entlassen') ? 'bad' : 'good'}`}>{coach.note}</p>}

        <CoachInbox career={career} onChange={onChange} />
        {coach.phase !== 'done' && (
          <>
            <button className="btn primary big cs-go coach-quick" disabled={!!coach.pending?.length} onClick={() => onChange(quickCoachSeason(career))}>
              {quickCoachLabel(career)}
            </button>
            {coach.phase === 'prep' && (
              <button className="btn secondary small cs-go" disabled={!!coach.pending?.length} onClick={() => onChange(playCoachHalf(career))}>Nur bis zur Winterpause</button>
            )}
            <details className="coach-more" open={coach.phase === 'winter'}>
              <summary>⚙️ Selbst steuern{coach.phase === 'choose' ? ': Verein wählen' : coach.phase === 'winter' ? ': Winter-Entscheidung, Taktik, Transfers' : ': Taktik und Transfers'}</summary>
          {coach.phase === 'choose' && (
            <>
              <h2>{coach.history.length ? 'Sommerpause' : 'Erste Trainerstation'}</h2>
              <p className="cs-sub">Wähle deinen Verein für die nächste Saison.</p>
              <div className={`cs-choices n${Math.min(3, options.length)}`}>
                {options.slice(0, 3).map((id) => {
                  const stay = id === coach.clubId;
                  return (
                    <button key={id} className={`cs-choice ${stay ? 'k-stay' : 'k-transfer'} ${picked === id ? 'on' : ''}`} onClick={() => setPicked(id)} aria-pressed={picked === id}>
                      <small>{stay ? 'Bleiben' : 'Angebot'}</small>
                      <strong>{getClub(id).name}</strong>
                      <span className="cs-choice-league">{getLeague(clubLeagueId(career, id)).name}</span>
                      <span className="cs-choice-meta">
                        Kaderstärke {Math.round(clubStrength(career, id))}
                        <br />Ziel: Platz {expectedPosition(career, id)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button className="btn primary big cs-go" disabled={!picked} onClick={confirm}>
                {picked ? `${getClub(picked).name} übernehmen` : 'Verein wählen'}
              </button>
            </>
          )}

          {coach.phase === 'season' && !coach.live && coach.clubId && (
            <button className="btn primary big cs-go" onClick={() => onChange(setTactic(career, 'balanced'))}>Zur Saisonvorbereitung</button>
          )}

          {(coach.phase === 'prep' || coach.phase === 'winter') && coach.clubId && coach.live && (
            <CoachSeasonView career={career} onChange={onChange} />
          )}
            </details>
          </>
        )}

        {coach.phase !== 'done' && <CoachLine career={career} onChange={onChange} />}
        {coach.phase === 'done' ? (
          <button className="btn primary big cs-go" onClick={onExit}>Zum Hauptmenü</button>
        ) : (
          <button className="btn secondary small cs-go" onClick={() => window.confirm('Trainerkarriere beenden?') && onChange(endCoaching(career))}>
            In den Ruhestand
          </button>
        )}
      </section>

      {coach.history.length > 0 && <h3 className="coach-hist-title">Trainerstationen</h3>}
      {coach.history.length > 0 && (
        <div className="cs-table" role="table" aria-label="Trainerstationen">
          <div className="cs-row cs-th" role="row">
            <span>Alter</span><span>Verein</span><span>Platz</span><span>Ziel</span><span>Pkt</span><span title="Trainerwert">TW</span>
          </div>
          {coach.history.map((s) => (
            <div key={s.season} className={`cs-row coach-row ${s.sacked ? 'sacked' : ''}`} role="row">
              <span className="cs-agebox">{s.age}</span>
              <span className="cs-clubcell">
                {getClub(s.clubId).name}
                {s.trophies.length > 0 && <i className="cs-trophy" title={s.trophies.join(', ')}>{'🏆'.repeat(Math.min(3, s.trophies.length))}</i>}
                {s.sacked && <i className="cs-tag">entlassen</i>}
                <small>{getLeague(s.leagueId).name}</small>
              </span>
              <span><b className={`cs-pill ${s.position < s.expected ? 'top' : s.position > s.expected + 2 ? 'bronze' : 'silver'}`}>{s.position}.</b></span>
              <span>{s.expected}.</span>
              <span>{s.points}</span>
              <span>{s.rating}</span>
            </div>
          ))}
        </div>
      )}

    </>
  );
}

/** Laufende Trainersaison: Vorbereitung bzw. Winterpause mit Taktik, Transfers, Tabelle und Entscheidung. */
function CoachSeasonView({ career, onChange }: { career: Career; onChange: (c: Career) => void }) {
  const coach = career.coach!;
  const live = coach.live!;
  const clubId = coach.clubId!;
  const winter = coach.phase === 'winter';
  const { position, table } = livePosition(career);
  const trust = boardTrust(career);
  const around = table
    .map((r, i) => ({ r, pos: i + 1 }))
    .filter(({ pos }) => pos <= 3 || Math.abs(pos - position) <= 1 || pos === table.length);

  return (
    <>
      <h2>{winter ? 'Winterpause' : `Saisonvorbereitung ${coach.year}/${String((coach.year + 1) % 100).padStart(2, '0')}`}</h2>
      <p className="cs-sub">
        {getClub(clubId).name} · {getLeague(clubLeagueId(career, clubId)).name} · Ziel des Vorstands: Platz {live.expected}
      </p>

      {winter && (
        <div className="coach-block">
          <div className="coach-trust">
            <span>Vertrauen des Vorstands</span>
            <div className="coach-bar" role="meter" aria-valuenow={trust} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${trust}%` }} className={trust < 30 ? 'low' : trust < 60 ? 'mid' : 'high'} />
            </div>
            <b>{trust}%</b>
          </div>
          <div className="coach-form" aria-label="Letzte Spiele">
            {live.form.slice(-5).map((f, i) => <span key={i} className={`f-${f}`}>{f}</span>)}
          </div>
          <ol className="coach-table">
            {around.map(({ r, pos }, i) => (
              <li key={r.clubId} className={`${r.clubId === clubId ? 'own' : ''} ${i > 0 && around[i - 1].pos !== pos - 1 ? 'gap' : ''}`}>
                <span>{pos}.</span><span>{getClub(r.clubId).name}</span><span>{r.goalsFor}:{r.goalsAgainst}</span><b>{r.points}</b>
              </li>
            ))}
          </ol>
        </div>
      )}

      {winter && !live.winterDone && (
        <div className="coach-block">
          <h3>Eine Entscheidung für die Rückrunde</h3>
          <div className="cs-choices">
            {(Object.keys(WINTER_ACTIONS) as WinterAction[]).map((k) => (
              <button key={k} className="cs-choice k-camp" onClick={() => onChange(winterAction(career, k))}>
                <small>{WINTER_ACTIONS[k].icon} Winter</small>
                <strong>{WINTER_ACTIONS[k].name}</strong>
                <span className="cs-choice-meta">{WINTER_ACTIONS[k].text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="coach-block">
        <h3>Taktik</h3>
        <div className="coach-tactics" role="radiogroup" aria-label="Taktik">
          {(Object.keys(TACTICS) as CoachTactic[]).map((k) => (
            <button key={k} role="radio" aria-checked={live.tactic === k} className={`coach-tactic ${live.tactic === k ? 'on' : ''}`} onClick={() => onChange(setTactic(career, k))}>
              <strong>{TACTICS[k].icon} {TACTICS[k].name}</strong>
              <small>{TACTICS[k].text}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="coach-block">
        <h3>
          Transfermarkt <span className="coach-budget">Budget {formatMoney(live.budget)}</span>
        </h3>
        {live.signings.length > 0 && (
          <p className="cs-sub">Neu im Team: {live.signings.map((t) => `${t.name} (${t.ovr})`).join(', ')}</p>
        )}
        <ul className="coach-targets">
          {live.targets.map((t) => {
            const afford = t.fee <= live.budget && live.signings.length < MAX_SIGNINGS;
            return (
              <li key={t.id}>
                <b className="cs-pill gold">{t.ovr}</b>
                <span className="grow">
                  <strong>{flagOf(t.nation)} {t.name}</strong>
                  <small>{t.position} · {t.age} J.{t.fromClubId ? ` · ${getClub(t.fromClubId).name}` : ''} · +{signingBoost(career, clubId, t).toLocaleString('de-DE')} Stärke</small>
                </span>
                <button className="btn secondary small" disabled={!afford} onClick={() => onChange(signTarget(career, t.id))}>
                  {formatMoney(t.fee)}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="hint">Höchstens {MAX_SIGNINGS} Neuzugänge pro Saison. Ein Teil der Verstärkung bleibt auch nächste Saison.</p>
      </div>

      <button className="btn primary big cs-go" disabled={!!coach.pending?.length} onClick={() => onChange(playCoachHalf(career))}>
        {winter ? 'Bis Saisonende simulieren' : 'Bis zur Winterpause simulieren'}
      </button>
    </>
  );
}
