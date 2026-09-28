import { getClub, getLeague } from '../data/leagues';
import { clubLeagueId, currentClubId } from '../game/player';
import { halfStats, sortTable } from '../game/season';
import type { Career } from '../game/types';
import EventList from './EventList';

/** Zwischenbilanz zur Winterpause. */
export default function HalfReport({ career }: { career: Career }) {
  const prog = career.progress!;
  const clubId = currentClubId(career.player);
  const leagueId = clubLeagueId(career, clubId);
  const s = halfStats(prog.matches);
  const share = s.possibleMinutes ? Math.round((s.minutes / s.possibleMinutes) * 100) : 0;
  const position = sortTable(prog.rows[leagueId]).findIndex((r) => r.clubId === clubId) + 1;
  const delta = (prog.ovrWinter ?? prog.ovrStart) - prog.ovrStart;

  return (
    <div className="panel report">
      <h2>Hinrunde · {getClub(clubId).name}</h2>
      <div className="tiles">
        <div className="tile"><span className="tile-label">Spiele</span><span className="tile-value">{s.apps}</span><span className="tile-sub">{s.starts} von Beginn</span></div>
        <div className="tile"><span className="tile-label">Tore</span><span className="tile-value">{s.goals}</span></div>
        <div className="tile"><span className="tile-label">Vorlagen</span><span className="tile-value">{s.assists}</span></div>
        <div className="tile"><span className="tile-label">Ø Note</span><span className="tile-value">{s.avgRating?.toFixed(2) ?? '–'}</span></div>
        <div className="tile"><span className="tile-label">Spielzeit</span><span className="tile-value">{share}%</span></div>
        <div className="tile">
          <span className="tile-label">Gesamtwertung</span>
          <span className="tile-value">{prog.ovrStart} → {prog.ovrWinter ?? prog.ovrStart}</span>
          <span className={`tile-sub ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>
            {delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : '±0'}
          </span>
        </div>
        <div className="tile"><span className="tile-label">Tabellenplatz</span><span className="tile-value">{position}.</span><span className="tile-sub">{getLeague(leagueId).name}</span></div>
      </div>
      <EventList events={prog.events ?? []} title="Ereignisse der Hinrunde" />
      {prog.notes.length > 0 && (
        <ul className="notes">
          {prog.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}
