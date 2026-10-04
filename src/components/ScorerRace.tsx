import { getLeague } from '../data/leagues';
import { clubLeagueId, currentClubId, seasonLabel } from '../game/player';
import { raceExcerpt, raceRank, scorerClubName, scorerRace, type ScorerEntry } from '../game/scorers';
import { sortTable } from '../game/season';
import type { Career } from '../game/types';

/** Torjäger-Rennen der eigenen Liga: in der Winterpause live, nach der Saison das Endergebnis. */
export function raceFor(career: Career): { race: ScorerEntry[]; leagueName: string; final: boolean } | null {
  const p = career.player;
  if (career.phase === 'winter' && career.progress) {
    const clubId = currentClubId(p);
    const leagueId = clubLeagueId(career, clubId);
    const rows = career.progress.rows[leagueId];
    if (!rows) return null;
    const goals = career.progress.matches.filter((m) => m.competition === 'Liga').reduce((a, m) => a + m.goals, 0);
    return {
      race: scorerRace(sortTable(rows), seasonLabel(career.year), { name: p.name, clubId, goals }),
      leagueName: getLeague(leagueId).name,
      final: false,
    };
  }
  const last = career.history[career.history.length - 1];
  if (career.phase === 'window' && last?.table?.length) {
    const goals = last.byCompetition?.find((s) => s.competition === 'Liga')?.goals ?? last.goals;
    return {
      race: scorerRace(last.table, last.season, { name: p.name, clubId: last.clubId, goals }),
      leagueName: getLeague(last.leagueId).name,
      final: true,
    };
  }
  return null;
}

export default function ScorerRace({ career }: { career: Career }) {
  const data = raceFor(career);
  if (!data) return null;
  const { race, leagueName, final } = data;
  const rank = raceRank(race);
  const me = race[rank - 1];
  const leader = race[0];
  const gap = (rank === 1 ? leader.goals - (race[1]?.goals ?? 0) : leader.goals - me.goals);
  const message =
    rank === 1
      ? final
        ? `👑 Torjägerkanone! Mit ${me.goals} Toren vorne.`
        : gap > 0
          ? `Du führst mit ${gap} ${gap === 1 ? 'Tor' : 'Toren'} Vorsprung.`
          : 'Du führst – punktgleich mit dem Verfolger.'
      : final
        ? `Platz ${rank} – ${gap} ${gap === 1 ? 'Tor' : 'Tore'} hinter ${leader.name}.`
        : `Platz ${rank}: ${gap} ${gap === 1 ? 'Tor' : 'Tore'} Rückstand auf ${leader.name}.`;
  return (
    <details className="race" open={final && rank === 1}>
      <summary>
        <span>⚽ Torjäger-Rennen <small>{leagueName}{final ? ' · Endstand' : ' · nach der Hinrunde'}</small></span>
        <b className={rank === 1 ? 'lead' : ''}>{rank === 1 ? '👑 ' : ''}Platz {rank} · {me.goals} Tore</b>
      </summary>
      <ol>
        {raceExcerpt(race).map(({ entry, rank: r }, i, arr) => (
          <li key={`${entry.name}-${entry.clubId}`} className={`${entry.you ? 'you' : ''} ${i > 0 && arr[i - 1].rank !== r - 1 ? 'gap' : ''}`}>
            <span className="race-rank">{r === 1 ? '👑' : `${r}.`}</span>
            <span className="race-name"><strong>{entry.you ? `${entry.name} (du)` : entry.name}</strong><small>{scorerClubName(entry)}</small></span>
            <b>{entry.goals}</b>
          </li>
        ))}
      </ol>
      <p className={`race-msg ${rank === 1 ? 'lead' : ''}`}>{message}</p>
    </details>
  );
}
