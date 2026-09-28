import { getClub } from '../data/leagues';
import { duelRecord } from '../game/rival';
import type { Career } from '../game/types';
import AgeChart, { careerPoints } from './AgeChart';

/** Kompakte Übersicht über den Rivalen (Übersicht-Tab). */
export function RivalCard({ career }: { career: Career }) {
  const r = career.rival;
  if (!r) return null;
  const last = r.history[r.history.length - 1];
  const rec = duelRecord(r);
  const delta = last ? last.ovrEnd - last.ovrStart : 0;
  return (
    <div className="panel rival">
      <div className="rival-head">
        <span className="save-ovr">{r.ovr}</span>
        <div className="grow">
          <span className="pill">Rivale</span>
          <h2>{r.name}</h2>
          <small className="muted">
            {r.position} · {r.age} Jahre · {r.nation} · {r.retired ? 'Karriere beendet' : getClub(r.clubId).name}
          </small>
        </div>
        <div className="duel" title="Saison-Duelle: gewonnen – unentschieden – verloren">
          <strong>{rec.player} : {rec.rival}</strong>
          <small>Duelle{rec.draw ? ` (${rec.draw} remis)` : ''}</small>
        </div>
      </div>
      {last && (
        <p className="hint">
          Letzte Saison: {last.apps} Spiele, {last.goals} Tore, {last.assists} Vorlagen, Ø {last.avgRating.toFixed(2)} · Wertung{' '}
          {last.ovrStart} → {last.ovrEnd}{' '}
          <span className={delta > 0 ? 'up' : delta < 0 ? 'down' : 'muted'}>({delta > 0 ? '+' : ''}{delta})</span> ·{' '}
          <strong className={last.duel === 'player' ? 'up' : last.duel === 'rival' ? 'down' : ''}>
            {last.duel === 'player' ? 'Duell gewonnen' : last.duel === 'rival' ? 'Duell verloren' : 'Unentschieden'}
          </strong>
        </p>
      )}
    </div>
  );
}

/** Ausführlicher Vergleich mit dem Rivalen (Karriere-Tab). */
export function RivalComparison({ career }: { career: Career }) {
  const r = career.rival;
  if (!r || !r.history.length) return null;
  return (
    <div className="panel">
      <h2>Du gegen {r.name}</h2>
      <AgeChart
        title="Gesamtwertung nach Alter"
        series={[
          { id: 'me', name: career.player.name, points: careerPoints(career.history) },
          { id: 'rival', name: r.name, points: careerPoints(r.history) },
        ]}
      />
      <div className="table-scroll">
        <table className="stats">
          <thead>
            <tr><th>Saison</th><th className="left">Verein ({r.name})</th><th>Gesamt</th><th>Sp.</th><th>Tore</th><th>Vorl.</th><th>Note</th><th>Duell</th></tr>
          </thead>
          <tbody>
            {[...r.history].reverse().map((h) => (
              <tr key={h.season}>
                <td>{h.season}</td>
                <td className="left">{getClub(h.clubId).name}</td>
                <td>{h.ovrEnd}</td>
                <td>{h.apps}</td>
                <td>{h.goals}</td>
                <td>{h.assists}</td>
                <td>{h.avgRating.toFixed(2)}</td>
                <td className={h.duel === 'player' ? 'up' : h.duel === 'rival' ? 'down' : 'muted'}>
                  {h.duel === 'player' ? 'Du' : h.duel === 'rival' ? 'Rivale' : 'remis'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
