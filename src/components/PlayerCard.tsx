import { useEffect, useRef, useState } from 'react';
import { useCountUp } from '../hooks/useCountUp';
import { getClub } from '../data/leagues';
import {
  attributeLabels,
  attributes,
  cardTier,
  currentClubId,
  formatMoney,
  playerValue,
  potentialRange,
} from '../game/player';
import { moraleLabel } from '../game/events';
import { focusLabel } from '../game/training';
import { getTrait } from '../game/traits';
import { SIDE_PROJECTS } from '../game/decisions';
import type { Career } from '../game/types';

export default function PlayerCard({ career }: { career: Career }) {
  const p = career.player;
  const attrs = attributes(p);
  const labels = attributeLabels(p.position);
  const [lo, hi] = potentialRange(p);
  const tier = cardTier(p.ovr);
  // Wertung zählt bei Änderungen hoch; beim Aufstieg in eine bessere Karte gibt es eine kurze Animation.
  const shownOvr = useCountUp(p.ovr);
  const prevTier = useRef(tier);
  const [upgraded, setUpgraded] = useState(false);
  useEffect(() => {
    const order = ['bronze', 'silver', 'gold', 'gold-rare'];
    if (order.indexOf(tier) > order.indexOf(prevTier.current)) {
      setUpgraded(true);
      const t = setTimeout(() => setUpgraded(false), 1800);
      prevTier.current = tier;
      return () => clearTimeout(t);
    }
    prevTier.current = tier;
  }, [tier]);
  const clubName = getClub(currentClubId(p)).name;
  const contractEnd = career.year + p.contract.yearsLeft;
  // Auf dem Handy sind die Details eingeklappt, damit der Spielbereich schneller erreichbar ist.
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card-wrap">
      <div className={`fc-card ${tier} ${upgraded ? 'upgraded' : ''}`}>
        <div className="fc-top">
          <div className="fc-ovr">{shownOvr}</div>
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

      <dl className={`facts ${expanded ? '' : 'collapsed'}`}>
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
        {(p.traits ?? []).length > 0 && (
          <div>
            <dt>Charakter</dt>
            <dd className="trait-row">
              {p.traits!.map((t) => (
                <span key={t} className="pill trait" title={getTrait(t).description}>{getTrait(t).icon} {getTrait(t).name}</span>
              ))}
            </dd>
          </div>
        )}
        <div><dt>Trainervertrauen</dt><dd>{moraleLabel(p.morale)}</dd></div>
        <div><dt>Training</dt><dd>{focusLabel(p)}</dd></div>
        {p.sideProject && (
          <div><dt>Nebenprojekt</dt><dd>{SIDE_PROJECTS[p.sideProject.kind].icon} {SIDE_PROJECTS[p.sideProject.kind].name}</dd></div>
        )}
        {p.captainOf && <div><dt>Kapitän</dt><dd>©️ {getClub(p.captainOf).name}</dd></div>}
        {p.penaltyTakerOf === currentClubId(p) && <div><dt>Elfmeterschütze</dt><dd>Ja</dd></div>}
        {(p.legendOf ?? []).length > 0 && (
          <div><dt>Vereinslegende</dt><dd>{p.legendOf!.map((id) => getClub(id).name).join(', ')}</dd></div>
        )}
        <div><dt>Länderspiele</dt><dd>{p.caps} ({p.internationalGoals} Tore)</dd></div>
      </dl>
      <button className="btn link small facts-toggle" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}>
        {expanded ? 'Weniger anzeigen' : 'Alle Details'}
      </button>
    </div>
  );
}
