import { getClub } from '../data/leagues';
import { totalTransferFees } from '../game/career';
import { formatMoney } from '../game/player';
import type { Career } from '../game/types';

/** Alle Vereinswechsel der Karriere mit den gezahlten Ablösesummen. */
export default function TransferHistory({ career }: { career: Career }) {
  const transfers = career.transfers;
  if (!transfers) {
    return (
      <div className="panel">
        <h2>Transfers</h2>
        <p className="hint">Diese Karriere wurde vor Einführung der Transferhistorie gestartet – Wechsel werden ab jetzt erfasst.</p>
      </div>
    );
  }
  const paid = transfers.filter((t) => t.fee > 0);
  const total = totalTransferFees(career);

  return (
    <div className="panel">
      <h2>Transfers</h2>
      <div className="tiles">
        <div className="tile"><span className="tile-label">Ablösesummen gesamt</span><span className="tile-value">{formatMoney(total)}</span></div>
        <div className="tile"><span className="tile-label">Wechsel mit Ablöse</span><span className="tile-value">{paid.length}</span></div>
        <div className="tile"><span className="tile-label">Höchste Ablöse</span><span className="tile-value">{paid.length ? formatMoney(Math.max(...paid.map((t) => t.fee))) : '–'}</span></div>
        <div className="tile"><span className="tile-label">Leihen</span><span className="tile-value">{transfers.filter((t) => t.type === 'Leihe').length}</span></div>
      </div>
      {transfers.length === 0 ? (
        <p className="hint">Noch kein Vereinswechsel.</p>
      ) : (
        <div className="table-scroll">
          <table className="stats">
            <thead>
              <tr><th>Saison</th><th>Fenster</th><th className="left">Wechsel</th><th>Art</th><th>Ablöse</th></tr>
            </thead>
            <tbody>
              {[...transfers].reverse().map((t, i) => (
                <tr key={i}>
                  <td>{t.season}</td>
                  <td>{t.window}</td>
                  <td className="left">{getClub(t.fromClubId).name} → {getClub(t.toClubId).name}</td>
                  <td>{t.type}</td>
                  <td>{t.fee > 0 ? formatMoney(t.fee) : '–'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={4} className="left"><strong>Gesamt</strong></td><td><strong>{formatMoney(total)}</strong></td></tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
