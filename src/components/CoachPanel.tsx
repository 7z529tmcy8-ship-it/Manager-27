import { useState } from 'react';
import { getClub, getLeague } from '../data/leagues';
import {
  canStartCoaching,
  chooseCoachClub,
  coachSummary,
  endCoaching,
  expectedPosition,
  playCoachSeason,
  startCoaching,
  startRating,
} from '../game/coach';
import { clubLeagueId, clubStrength } from '../game/player';
import type { Career } from '../game/types';

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

      <section className="cs-window">
        {coach.note && <p className={`cs-note ${coach.note.startsWith('Entlassen') ? 'bad' : 'good'}`}>{coach.note}</p>}

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

        {coach.phase === 'season' && coach.clubId && (
          <>
            <h2>Saison {coach.year}/{String((coach.year + 1) % 100).padStart(2, '0')}</h2>
            <p className="cs-sub">
              {getClub(coach.clubId).name} · {getLeague(clubLeagueId(career, coach.clubId)).name} · Ziel: Platz {expectedPosition(career, coach.clubId)}
            </p>
            <button className="btn primary big cs-go" onClick={() => onChange(playCoachSeason(career))}>Saison simulieren</button>
          </>
        )}

        {coach.phase === 'done' ? (
          <button className="btn primary big cs-go" onClick={onExit}>Zum Hauptmenü</button>
        ) : (
          <button className="btn secondary small cs-go" onClick={() => window.confirm('Trainerkarriere beenden?') && onChange(endCoaching(career))}>
            In den Ruhestand
          </button>
        )}
      </section>
    </>
  );
}
