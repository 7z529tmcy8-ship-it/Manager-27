import { getClub } from '../data/leagues';
import { INVESTMENTS, LOTTO_CHANCE, MAX_BOOST, buyLottoTicket, canBuyTicket, canInvest, invest, type Investment } from '../game/owner';
import { formatMoney } from '../game/player';
import type { Career } from '../game/types';

/** Sommerpause: Lottoschein am Kiosk – und nach dem Jackpot das Präsidentenbüro. */
export default function OwnerPanel({ career, onChange }: { career: Career; onChange: (c: Career) => void }) {
  if (career.phase !== 'window' || career.decision) return null;
  const o = career.owner;
  const ticket = canBuyTicket(career);
  if (!o && !ticket) return null;

  return (
    <div className="panel owner">
      {o ? (
        <>
          <p className="eyebrow">Präsidentenbüro</p>
          <h2>{getClub(o.clubId).name}</h2>
          <p className="muted">
            Budget <strong>{formatMoney(o.budget)}</strong> · Investiert: +{o.boost} von {MAX_BOOST} Stärke · Präsident seit {o.since}
          </p>
          <div className="decision-options">
            {(Object.keys(INVESTMENTS) as Investment[]).map((k) => (
              <button key={k} className="btn" disabled={!canInvest(career, k)} onClick={() => onChange(invest(career, k))}>
                {INVESTMENTS[k].label} · {formatMoney(INVESTMENTS[k].cost)}
                <small>{INVESTMENTS[k].hint}</small>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="eyebrow">Sommerpause</p>
          <h2>Kiosk um die Ecke</h2>
          <p className="muted">Ein Lottoschein pro Sommer. Chance auf den Jackpot: {Math.round(LOTTO_CHANCE * 100)} % – in der echten Welt eher 1 zu 140 Millionen.</p>
          <button className="btn secondary" onClick={() => onChange(buyLottoTicket(career))}>🎟️ Lottoschein kaufen</button>
        </>
      )}
    </div>
  );
}
