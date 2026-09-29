import { useState } from 'react';
import { CLUBS, LEAGUES, getClub, getLeague } from '../data/leagues';
import {
  acceptOffer,
  acceptWinterOffer,
  applicationsLeft,
  applyToClub,
  canStay,
  requestOffers,
  retire,
  stayAtClub,
  stayInWinter,
} from '../game/career';
import { clubLeagueId, clubStrength, currentClubId, formatMoney, roleFor } from '../game/player';
import { APPLICATION_AGE } from '../game/offers';
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
      <h2>{winter ? `Wintertransferfenster Januar ${career.year + 1}` : `Transferfenster Sommer ${career.year}`}</h2>
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
                {winter ? 'Annehmen & Rückrunde' : 'Annehmen'}
              </button>
            </article>
          );
        })}
      </div>

      <ApplicationBox career={career} onChange={onChange} />

      <div className="window-actions">
        {stay && (
          <button className="btn primary" onClick={() => onChange(winter ? stayInWinter(career) : stayAtClub(career))}>
            {winter ? `Bei ${club.name} bleiben & Rückrunde` : `Bei ${club.name} bleiben`}
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

/** Ab 30: selbst bei Vereinen bewerben – z. B. in der 2. Liga, um die letzten Jahre noch aufzutrumpfen. */
function ApplicationBox({ career, onChange }: Props) {
  const p = career.player;
  const left = applicationsLeft(career);
  const ownLeagueId = clubLeagueId(career, currentClubId(p));
  const ownLeague = getLeague(ownLeagueId);
  const [leagueId, setLeagueId] = useState(ownLeague.down?.leagueId ?? ownLeagueId);
  const excluded = new Set([p.contract.clubId, currentClubId(p)]);
  const clubs = CLUBS.filter((c) => clubLeagueId(career, c.id) === leagueId && !excluded.has(c.id))
    .map((c) => ({ ...c, s: Math.round(clubStrength(career, c.id)) }))
    .sort((a, b) => b.s - a.s);
  const [clubId, setClubId] = useState('');
  const applied = new Set((career.applications ?? []).map((a) => a.clubId));
  const selected = clubs.some((c) => c.id === clubId) ? clubId : '';

  if (p.age < APPLICATION_AGE || (career.phase === 'winter' && p.loan)) return null;

  return (
    <section className="apply">
      <h3>Bei Vereinen bewerben</h3>
      <p className="hint">
        Biete dich selbst an – etwa in einer zweiten Liga, um in den letzten Karrierejahren noch mal richtig aufzutrumpfen.
        Schwächere Vereine sagen meist zu, Topklubs eher nicht. {left > 0 ? `Noch ${left} ${left === 1 ? 'Bewerbung' : 'Bewerbungen'} in diesem Fenster.` : 'Keine Bewerbungen mehr in diesem Fenster.'}
      </p>
      {left > 0 && (
        <div className="row">
          <select value={leagueId} onChange={(e) => { setLeagueId(e.target.value); setClubId(''); }} aria-label="Liga">
            {LEAGUES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={selected} onChange={(e) => setClubId(e.target.value)} aria-label="Verein">
            <option value="">Verein wählen…</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id} disabled={applied.has(c.id)}>
                {c.name} (Teamstärke {c.s}){applied.has(c.id) ? ' – bereits beworben' : ''}
              </option>
            ))}
          </select>
          <button className="btn" disabled={!selected} onClick={() => onChange(applyToClub(career, selected))}>
            Bewerbung schicken
          </button>
        </div>
      )}
      {(career.applications ?? []).length > 0 && (
        <ul className="notes">
          {career.applications!.map((a) => (
            <li key={a.clubId} className={a.accepted ? 'up' : 'muted'}>{a.accepted ? '✓ ' : '✗ '}{a.message}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
