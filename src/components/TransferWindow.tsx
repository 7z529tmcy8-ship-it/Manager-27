import { getClub, getLeague } from '../data/leagues';
import { acceptOffer, acceptWinterOffer, canStay, requestOffers, retire, stayAtClub, stayInWinter } from '../game/career';
import { clubLeagueId, clubStrength, currentClubId, formatMoney, roleFor } from '../game/player';
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

/** Transferfenster im Sommer (nach der Saison) und im Winter (zwischen Hin- und Rückrunde). */
export default function TransferWindow({ career, onChange }: Props) {
  const p = career.player;
  const winter = career.phase === 'winter';
  const stay = winter || canStay(career);
  const clubId = winter ? currentClubId(p) : p.contract.clubId;
  const club = getClub(clubId);
  const stayRole = roleFor(p.ovr, clubStrength(career, clubId), p.age);

  const accept = (o: Offer) => onChange(winter ? acceptWinterOffer(career, o) : acceptOffer(career, o));
  const confirmRetire = () => {
    if (confirm(`Karriere von ${p.name} wirklich beenden?`)) onChange(retire(career));
  };

  let intro: string;
  if (winter && p.loan) intro = `Du bist an ${club.name} verliehen und bleibst dort bis Saisonende.`;
  else if (winter) intro = `Winterpause – wechselst du jetzt, spielst du die Rückrunde beim neuen Verein. Pokal und Europapokal laufen dann ohne dich weiter.`;
  else if (stay) {
    intro = `Du stehst noch ${p.contract.yearsLeft} ${p.contract.yearsLeft === 1 ? 'Jahr' : 'Jahre'} bei ${club.name} unter Vertrag. Voraussichtliche Rolle beim Bleiben: ${stayRole}.`;
  } else intro = 'Dein Vertrag ist ausgelaufen. Du musst einen neuen Verein finden – oder die Karriere beenden.';

  return (
    <div className={`panel window ${winter ? 'winter' : ''}`}>
      <h2>{winter ? `❄️ Wintertransferfenster Januar ${career.year + 1}` : `Transferfenster Sommer ${career.year}`}</h2>
      <p className="hint">{intro}</p>

      {career.offers.length === 0 && !(winter && p.loan) && <div className="empty">Keine Angebote eingegangen.</div>}

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
                <div>
                  <dt>{o.type === 'Leihe' ? 'Dauer' : 'Vertrag'}</dt>
                  <dd>{o.type === 'Leihe' ? (winter ? 'bis Saisonende' : '1 Saison') : `bis ${career.year + o.years}`}</dd>
                </div>
                {o.fee > 0 && <div><dt>Ablöse</dt><dd>{formatMoney(o.fee)}</dd></div>}
              </dl>
              <button className="btn primary" onClick={() => accept(o)}>
                {winter ? 'Annehmen & Rückrunde ▶' : 'Annehmen'}
              </button>
            </article>
          );
        })}
      </div>

      <div className="window-actions">
        {stay && (
          <button className="btn primary" onClick={() => onChange(winter ? stayInWinter(career) : stayAtClub(career))}>
            {winter ? `Bei ${club.name} bleiben & Rückrunde ▶` : `Bei ${club.name} bleiben`}
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
        {!winter && (p.age >= 30 || !stay) && (
          <button className="btn ghost" onClick={confirmRetire}>Karriere beenden</button>
        )}
      </div>
    </div>
  );
}
