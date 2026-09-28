import { getClub } from '../data/leagues';
import {
  attributeLabels,
  attributes,
  currentClubId,
  formatMoney,
  playerValue,
  potentialRange,
} from '../game/player';
import { moraleLabel } from '../game/events';
import type { Career } from '../game/types';

export default function PlayerCard({ career }: { career: Career }) {
  const p = career.player;
  const attrs = attributes(p);
  const labels = attributeLabels(p.position);
  const [lo, hi] = potentialRange(p);
  const tier = p.ovr >= 85 ? 'gold-rare' : p.ovr >= 75 ? 'gold' : p.ovr >= 65 ? 'silver' : 'bronze';
  const clubName = getClub(currentClubId(p)).name;
  const contractEnd = career.year + p.contract.yearsLeft;

  return (
    <div className="card-wrap">
      <div className={`fc-card ${tier}`}>
        <div className="fc-top">
          <div className="fc-ovr">{p.ovr}</div>
          <div className="fc-pos">{p.position}</div>
        </div>
        <div className="fc-name">{p.name}</div>
        <div className="fc-club">{clubName}</div>
        <div className="fc-attrs">
          {labels.map((l, i) => (
            <div key={l}>
              <strong>{attrs[i]}</strong> <span>{l}</span>
            </div>
          ))}
        </div>
      </div>

      <dl className="facts">
        <div><dt>Alter</dt><dd>{p.age} Jahre</dd></div>
        <div><dt>Nation</dt><dd>{p.nation}</dd></div>
        <div><dt>Potenzial</dt><dd>{lo === hi ? lo : `${lo}–${hi}`}</dd></div>
        <div><dt>Marktwert</dt><dd>{formatMoney(playerValue(p))}</dd></div>
        <div><dt>Gehalt</dt><dd>{formatMoney(p.contract.wage)} / Woche</dd></div>
        <div>
          <dt>Vertrag</dt>
          <dd>{getClub(p.contract.clubId).name}{p.contract.yearsLeft > 0 ? ` bis ${contractEnd}` : ' – ausgelaufen'}</dd>
        </div>
        {p.loan && <div><dt>Leihe</dt><dd>{getClub(p.loan.clubId).name}</dd></div>}
        <div><dt>Trainervertrauen</dt><dd>{moraleLabel(p.morale)}</dd></div>
        {p.captainOf && <div><dt>Kapitän</dt><dd>©️ {getClub(p.captainOf).name}</dd></div>}
        {p.penaltyTakerOf === currentClubId(p) && <div><dt>Elfmeterschütze</dt><dd>Ja</dd></div>}
        {(p.legendOf ?? []).length > 0 && (
          <div><dt>Vereinslegende</dt><dd>{p.legendOf!.map((id) => getClub(id).name).join(', ')}</dd></div>
        )}
        <div><dt>Länderspiele</dt><dd>{p.caps} ({p.internationalGoals} Tore)</dd></div>
      </dl>
    </div>
  );
}
