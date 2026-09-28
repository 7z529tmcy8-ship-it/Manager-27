import { getClub, getLeague } from '../data/leagues';
import { formatMoney } from '../game/player';
import type { SeasonRecord } from '../game/types';

export default function SeasonReport({ season }: { season: SeasonRecord }) {
  const delta = season.ovrEnd - season.ovrStart;
  const share = season.possibleMinutes ? Math.round((season.minutes / season.possibleMinutes) * 100) : 0;
  const league = getLeague(season.leagueId);
  const keeperOrDefender = season.cleanSheets > 0;

  return (
    <div className="panel report">
      <h2>
        Rückblick {season.season} · {getClub(season.clubId).name}
        {season.onLoan && <span className="pill">Leihe</span>}
      </h2>

      <div className="tiles">
        <Tile label="Spiele" value={season.apps} sub={`${season.starts} von Beginn`} />
        <Tile label="Tore" value={season.goals} />
        <Tile label="Vorlagen" value={season.assists} />
        {keeperOrDefender && <Tile label="Zu null" value={season.cleanSheets} />}
        <Tile label="Ø Note" value={season.avgRating?.toFixed(2) ?? '–'} />
        <Tile label="Spielzeit" value={`${share}%`} sub={`${season.minutes.toLocaleString('de-DE')} Min.`} />
        <Tile
          label="Gesamtwertung"
          value={`${season.ovrStart} → ${season.ovrEnd}`}
          sub={delta === 0 ? '±0' : delta > 0 ? `+${delta}` : `${delta}`}
          tone={delta > 0 ? 'up' : delta < 0 ? 'down' : undefined}
        />
        <Tile label="Marktwert" value={formatMoney(season.marketValue)} />
      </div>

      <div className="table-scroll">
        <table className="stats">
          <thead>
            <tr><th>Wettbewerb</th><th>Sp.</th><th>Min.</th><th>Tore</th><th>Vorl.</th><th>Note</th></tr>
          </thead>
          <tbody>
            {season.byCompetition.map((c) => (
              <tr key={c.competition}>
                <td>{c.competition === 'Liga' ? league.name : c.competition === 'Pokal' ? league.cup : c.competition}</td>
                <td>{c.apps}</td>
                <td>{c.minutes}</td>
                <td>{c.goals}</td>
                <td>{c.assists}</td>
                <td>{c.avgRating?.toFixed(2) ?? '–'}</td>
              </tr>
            ))}
            {season.caps > 0 && (
              <tr>
                <td>Nationalmannschaft</td><td>{season.caps}</td><td>–</td><td>{season.internationalGoals}</td><td>–</td><td>–</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ul className="facts-inline">
        <li>{league.name}: <strong>Platz {season.leaguePosition}</strong></li>
        <li>{league.cup}: <strong>{season.cupReached}</strong></li>
        {season.europe && <li>{season.europe.competition}: <strong>{season.europe.reached}</strong></li>}
        {season.injuryWeeks > 0 && <li>Verletzt: <strong>{season.injuryWeeks} Wochen</strong></li>}
      </ul>

      {(season.trophies.length > 0 || season.awards.length > 0) && (
        <div className="trophies">
          {season.trophies.map((t) => <span key={t} className="trophy">🏆 {t}</span>)}
          {season.awards.map((a) => <span key={a} className="trophy award">⭐ {a}</span>)}
        </div>
      )}

      {season.notes.length > 0 && (
        <ul className="notes">
          {season.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: 'up' | 'down' }) {
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <span className="tile-value">{value}</span>
      {sub && <span className={`tile-sub ${tone ?? ''}`}>{tone === 'up' ? '▲ ' : tone === 'down' ? '▼ ' : ''}{sub}</span>}
    </div>
  );
}
