import { getClub, getLeague } from '../data/leagues';
import { acceptOffer, canStay, requestOffers, retire, stayAtClub } from '../game/career';
import { clubLeagueId, clubStrength, formatMoney, roleFor } from '../game/player';
import type { Career, Offer } from '../game/types';

interface Props {
  career: Career;
  onChange: (career: Career) => void;
}

const TYPE_CLASS: Record<Offer['type'], string> = {
  Transfer: 'transfer',
  Ablösefrei: 'transfer',
  Leihe: 'loan',
  Verlängerung: 'extend',
};

export default function TransferWindow({ career, onChange }: Props) {
  const p = career.player;
  const stay = canStay(career);
  const parent = getClub(p.contract.clubId);
  const parentStrength = clubStrength(career, parent.id);
  const stayRole = roleFor(p.ovr, parentStrength, p.age);

  const confirmRetire = () => {
    if (confirm(`Karriere von ${p.name} wirklich beenden?`)) onChange(retire(career));
  };

  return (
    <div className="panel window">
      <h2>Transferfenster Sommer {career.year}</h2>
      <p className="hint">
        {stay
          ? `Du stehst noch ${p.contract.yearsLeft} ${p.contract.yearsLeft === 1 ? 'Jahr' : 'Jahre'} bei ${parent.name} unter Vertrag. Voraussichtliche Rolle beim Bleiben: ${stayRole}.`
          : 'Dein Vertrag ist ausgelaufen. Du musst einen neuen Verein finden – oder die Karriere beenden.'}
      </p>

      {career.offers.length === 0 && (
        <div className="empty">Keine Angebote eingegangen.</div>
      )}

      <div className="offers">
        {career.offers.map((o) => {
          const league = getLeague(clubLeagueId(career, o.clubId));
          const s = Math.round(clubStrength(career, o.clubId));
          return (
            <article key={o.id} className={`offer ${TYPE_CLASS[o.type]}`}>
              <header>
                <span className="pill">{o.type}</span>
                <h3>{getClub(o.clubId).name}</h3>
                <small>{league.name} · Teamstärke {s}</small>
              </header>
              <p>{o.message}</p>
              <dl>
                <div><dt>Rolle</dt><dd>{o.role}</dd></div>
                <div><dt>Gehalt</dt><dd>{formatMoney(o.wage)} / Wo.</dd></div>
                <div><dt>{o.type === 'Leihe' ? 'Dauer' : 'Vertrag'}</dt><dd>{o.years} {o.years === 1 ? 'Jahr' : 'Jahre'}</dd></div>
                {o.fee > 0 && <div><dt>Ablöse</dt><dd>{formatMoney(o.fee)}</dd></div>}
              </dl>
              <button className="btn primary" onClick={() => onChange(acceptOffer(career, o))}>Annehmen</button>
            </article>
          );
        })}
      </div>

      <div className="window-actions">
        {stay && (
          <button className="btn primary" onClick={() => onChange(stayAtClub(career))}>
            Bei {parent.name} bleiben
          </button>
        )}
        {career.requestsLeft > 0 && (
          <>
            <button className="btn" onClick={() => onChange(requestOffers(career, 'transfer'))}>
              {stay ? 'Auf Transferliste setzen' : 'Berater einschalten'}
            </button>
            {stay && p.age <= 23 && (
              <button className="btn" onClick={() => onChange(requestOffers(career, 'loan'))}>Um Leihe bitten</button>
            )}
          </>
        )}
        {(p.age >= 30 || !stay) && (
          <button className="btn ghost" onClick={confirmRetire}>Karriere beenden</button>
        )}
      </div>
    </div>
  );
}
