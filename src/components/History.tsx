import { getClub } from '../data/leagues';
import { totalTransferFees } from '../game/career';
import { formatMoney } from '../game/player';
import type { Career } from '../game/types';
import AgeChart, { careerPoints } from './AgeChart';
import SeasonBars from './SeasonBars';
import TransferHistory from './TransferHistory';

export default function History({ career }: { career: Career }) {
  const h = career.history;
  if (!h.length) return <div className="panel empty">Noch keine Saison gespielt.</div>;

  const sum = (f: (s: (typeof h)[number]) => number) => h.reduce((a, s) => a + f(s), 0);
  const apps = sum((s) => s.apps);
  const rated = h.filter((s) => s.avgRating !== null);
  const avg = rated.length
    ? sum((s) => (s.avgRating ?? 0) * s.apps) / Math.max(1, rated.reduce((a, s) => a + s.apps, 0))
    : null;
  const peak = Math.max(...h.map((s) => s.ovrEnd), h[0].ovrStart);
  const topValue = Math.max(...h.map((s) => s.marketValue));

  const cabinet = new Map<string, number>();
  for (const s of h) {
    for (const t of [...s.trophies, ...s.awards]) {
      const key = t.replace(/ \d{4}$/, '');
      cabinet.set(key, (cabinet.get(key) ?? 0) + 1);
    }
  }

  return (
    <>
      <div className="panel">
        <h2>Karriere-Bilanz</h2>
        <div className="tiles">
          <div className="tile"><span className="tile-label">Saisons</span><span className="tile-value">{h.length}</span></div>
          <div className="tile"><span className="tile-label">Spiele</span><span className="tile-value">{apps}</span></div>
          <div className="tile"><span className="tile-label">Tore</span><span className="tile-value">{sum((s) => s.goals)}</span></div>
          <div className="tile"><span className="tile-label">Vorlagen</span><span className="tile-value">{sum((s) => s.assists)}</span></div>
          <div className="tile"><span className="tile-label">Ø Note</span><span className="tile-value">{avg ? avg.toFixed(2) : '–'}</span></div>
          <div className="tile"><span className="tile-label">Höchstwertung</span><span className="tile-value">{peak}</span></div>
          <div className="tile"><span className="tile-label">Höchster Marktwert</span><span className="tile-value">{formatMoney(topValue)}</span></div>
          <div className="tile"><span className="tile-label">Länderspiele</span><span className="tile-value">{career.player.caps}</span></div>
          <div className="tile"><span className="tile-label">Ablösesummen gesamt</span><span className="tile-value">{formatMoney(totalTransferFees(career))}</span></div>
        </div>
        <AgeChart
          title="Gesamtwertung nach Alter"
          series={[
            {
              id: career.id,
              name: career.player.name,
              points: careerPoints(h).map((pt, i) => {
                const s = h[i - 1];
                return s
                  ? { ...pt, detail: [`nach ${s.season} · ${getClub(s.clubId).name}`, `${s.apps} Sp. · ${s.goals} T · ${s.assists} V`] }
                  : pt;
              }),
            },
          ]}
        />
      </div>

      <div className="panel">
        <h2>Statistiken</h2>
        <SeasonBars history={h} />
        <AgeChart
          title="Marktwert nach Alter"
          valueLabel="Marktwert"
          format={(v) => (v >= 1e6 ? `${Math.round(v / 1e6)} Mio.` : `${Math.round(v / 1e3)} Tsd.`)}
          padLeft={58}
          series={[{ id: 'value', name: career.player.name, points: h.map((s) => ({ age: s.age + 1, ovr: s.marketValue })) }]}
        />
      </div>

      {cabinet.size > 0 && (
        <div className="panel">
          <h2>Trophäenschrank</h2>
          <div className="trophies">
            {[...cabinet].map(([t, n]) => (
              <span key={t} className="trophy">{n > 1 ? `${n}× ` : ''}{t}</span>
            ))}
          </div>
        </div>
      )}

      <TransferHistory career={career} />

      <div className="panel">
        <h2>Stationen</h2>
        <div className="table-scroll">
          <table className="stats">
            <thead>
              <tr>
                <th>Saison</th><th className="left">Verein</th><th>Alter</th><th>Gesamt</th><th>Sp.</th>
                <th>Tore</th><th>Vorl.</th><th>Note</th><th>Platz</th><th>Marktwert</th>
              </tr>
            </thead>
            <tbody>
              {[...h].reverse().map((s) => {
                const d = s.ovrEnd - s.ovrStart;
                return (
                  <tr key={s.season}>
                    <td>{s.season}</td>
                    <td className="left">
                      {getClub(s.clubId).name}
                      {s.onLoan && <span className="pill small">Leihe</span>}
                      {s.trophies.length > 0 && <span title={s.trophies.join(', ')}> 🏆</span>}
                    </td>
                    <td>{s.age}</td>
                    <td>
                      {s.ovrEnd} <span className={d > 0 ? 'up' : d < 0 ? 'down' : 'muted'}>({d > 0 ? '+' : ''}{d})</span>
                    </td>
                    <td>{s.apps}</td>
                    <td>{s.goals}</td>
                    <td>{s.assists}</td>
                    <td>{s.avgRating?.toFixed(2) ?? '–'}</td>
                    <td>{s.leaguePosition}.</td>
                    <td>{formatMoney(s.marketValue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
