import { getClub, getLeague } from '../data/leagues';
import type { SeasonRecord } from '../game/types';

export default function LeagueTable({ season }: { season: SeasonRecord }) {
  const league = getLeague(season.leagueId);
  const { cl, el, conf } = league.europe;
  const zone = (pos: number) => {
    if (pos <= cl) return 'cl';
    if (pos <= cl + el) return 'el';
    if (pos <= cl + el + conf) return 'conf';
    if (league.up && pos <= league.up.spots) return 'cl';
    if (league.down && pos > season.table.length - league.down.spots) return 'down';
    return '';
  };

  return (
    <div className="panel">
      <h2>Abschlusstabelle {league.name} {season.season}</h2>
      <div className="table-scroll">
        <table className="stats league">
          <thead>
            <tr><th>#</th><th className="left">Verein</th><th>Sp.</th><th>S</th><th>U</th><th>N</th><th>Tore</th><th>Diff.</th><th>Pkt.</th></tr>
          </thead>
          <tbody>
            {season.table.map((r, i) => (
              <tr key={r.clubId} className={r.clubId === season.clubId ? 'own' : ''}>
                <td><span className={`zone ${zone(i + 1)}`}>{i + 1}</span></td>
                <td className="left">{getClub(r.clubId).name}</td>
                <td>{r.played}</td>
                <td>{r.won}</td>
                <td>{r.drawn}</td>
                <td>{r.lost}</td>
                <td>{r.goalsFor}:{r.goalsAgainst}</td>
                <td>{r.goalsFor - r.goalsAgainst > 0 ? '+' : ''}{r.goalsFor - r.goalsAgainst}</td>
                <td><strong>{r.points}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">
        {league.tier === 1
          ? 'Blau: Champions League · Orange: Europa League · Grün: Conference League'
          : 'Blau: Aufstieg'}
        {league.down ? ' · Rot: Abstieg' : ''}
      </p>
    </div>
  );
}
