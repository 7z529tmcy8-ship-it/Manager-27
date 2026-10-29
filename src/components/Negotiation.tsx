import { useState } from 'react';
import { getClub, getLeague } from '../data/leagues';
import { MAX_ROUNDS, ROLES, demandFrom, leverage, moodText, negotiate, negotiable, type Demand } from '../game/negotiation';
import { clubLeagueId, formatMoney, playerValue } from '../game/player';
import type { Career, Offer } from '../game/types';
import { play } from '../sound';
import Icon from './Icon';

const CLAUSE_X = [1.5, 2, 3];
const BONUS = [1_000, 2_000, 5_000, 10_000];

/** Vertragsverhandlung: Forderungen stellen, Antwort des Vereins, bis zu drei Runden. */
export default function Negotiation({ career, offerId, onChange, onSign, onClose }: {
  career: Career; offerId: string; onChange: (c: Career) => void; onSign: (c: Career, o: Offer) => void; onClose: () => void;
}) {
  const offer = career.offers.find((o) => o.id === offerId);
  const [d, setD] = useState<Demand>(() => (offer ? demandFrom(offer) : { wage: 0, years: 1, role: 'Rotation' }));
  const [reply, setReply] = useState<{ kind: string; message: string } | null>(null);
  const [base] = useState(() => offer);
  if (!offer || !base) {
    return (
      <div className="nego" role="dialog" aria-modal="true" aria-label="Verhandlung">
        <div className="nego-card">
          <p className="nego-reply bad">{reply?.message ?? 'Das Angebot ist nicht mehr da.'}</p>
          <button className="btn primary big" onClick={onClose}>Zurück zum Transferfenster</button>
        </div>
      </div>
    );
  }
  const club = getClub(offer.clubId);
  const lev = leverage(career, offer);
  const mood = moodText(career, offer, d);
  const value = playerValue(career.player);
  const open = negotiable(offer);
  const minWage = Math.round(base.wage * 0.9 / 500) * 500;
  const maxWage = Math.round(base.wage * 1.8 / 500) * 500;
  const roles = ROLES.slice(0, ROLES.indexOf(base.role) + 1).reverse();
  const set = (patch: Partial<Demand>) => setD((x) => ({ ...x, ...patch }));

  const send = () => {
    const r = negotiate(career, offer.id, d);
    onChange(r.career);
    setReply({ kind: r.kind, message: r.message });
    try { play(r.kind === 'agreed' ? 'revealRare' : r.kind === 'walked' ? 'error' : 'tap'); } catch { /* kein Ton */ }
    try { navigator.vibrate?.(r.kind === 'walked' ? [80, 40, 80] : 30); } catch { /* nicht unterstützt */ }
    const now = r.career.offers.find((o) => o.id === offer.id);
    if (now && r.kind !== 'agreed') setD(demandFrom(now));
  };

  return (
    <div className="nego" role="dialog" aria-modal="true" aria-label={`Verhandlung mit ${club.name}`}>
      <div className="nego-card">
        <header className="nego-head">
          <div>
            <small>Vertragsverhandlung · Runde {Math.min(MAX_ROUNDS, (offer.talks ?? 0) + (open ? 1 : 0))}/{MAX_ROUNDS}</small>
            <strong>{club.name}</strong>
            <span>{getLeague(clubLeagueId(career, club.id)).name}{offer.fee ? ` · Ablöse ${formatMoney(offer.fee)}` : ''}</span>
          </div>
          <button className="nego-x" onClick={onClose} aria-label="Schließen"><Icon name="close" size={20} /></button>
        </header>

        <div className="nego-power" aria-label="Verhandlungsmacht">
          <span>Deine Verhandlungsmacht</span>
          <div className="nego-bar"><i style={{ width: `${(lev / 1.2) * 100}%` }} /></div>
        </div>

        <p className="nego-offer">Angebot: <b>{formatMoney(offer.wage)}</b>/Woche · {offer.years} J. · {offer.role}
          {offer.clauses?.releaseClause ? ` · Klausel ${formatMoney(offer.clauses.releaseClause)}` : ''}
          {offer.clauses?.goalBonus ? ` · Torprämie ${formatMoney(offer.clauses.goalBonus)}` : ''}
          {offer.clauses?.starterGuarantee ? ' · Einsatzgarantie' : ''}</p>

        {reply && <p className={`nego-reply ${reply.kind}`} role="status">{reply.message}</p>}

        {open && (
          <div className="nego-form">
            <label className="nego-row">
              <span>Gehalt <b>{formatMoney(d.wage)}</b>/Woche <em>{d.wage > offer.wage ? `+${Math.round((d.wage / offer.wage - 1) * 100)} %` : ''}</em></span>
              <input type="range" min={minWage} max={maxWage} step={500} value={d.wage} onChange={(e) => set({ wage: Number(e.target.value) })} />
            </label>
            <div className="nego-row">
              <span>Laufzeit</span>
              <div className="nego-chips">{[1, 2, 3, 4, 5].map((y) => <button key={y} className={d.years === y ? 'on' : ''} onClick={() => set({ years: y })}>{y} J.</button>)}</div>
            </div>
            <div className="nego-row">
              <span>Rolle</span>
              <div className="nego-chips">{roles.map((r) => <button key={r} className={d.role === r ? 'on' : ''} onClick={() => set({ role: r })}>{r}</button>)}</div>
            </div>
            <div className="nego-row">
              <span>Ausstiegsklausel <small>– größere Vereine dürfen dich dafür holen</small></span>
              <div className="nego-chips">
                <button className={!d.releaseClause ? 'on' : ''} onClick={() => set({ releaseClause: undefined })}>Keine</button>
                {CLAUSE_X.map((x) => { const v = Math.round((value * x) / 1e5) * 1e5; return <button key={x} className={d.releaseClause === v ? 'on' : ''} onClick={() => set({ releaseClause: v })}>{formatMoney(v)}</button>; })}
              </div>
            </div>
            <div className="nego-row">
              <span>Torprämie <small>– pro Pflichtspieltor</small></span>
              <div className="nego-chips">
                <button className={!d.goalBonus ? 'on' : ''} onClick={() => set({ goalBonus: undefined })}>Keine</button>
                {BONUS.map((b) => <button key={b} className={d.goalBonus === b ? 'on' : ''} onClick={() => set({ goalBonus: b })}>{formatMoney(b)}</button>)}
              </div>
            </div>
            <label className="nego-check">
              <input type="checkbox" checked={!!d.starterGuarantee} onChange={(e) => set({ starterGuarantee: e.target.checked || undefined })} />
              <span>Einsatzgarantie <small>– spielst du zu wenig, wirst du am Saisonende ablösefrei</small></span>
            </label>
            <p className={`nego-mood ${mood.tone}`}><Icon name={mood.tone === 'good' ? 'check' : 'warn'} size={16} />{mood.label}</p>
          </div>
        )}

        <div className="nego-actions">
          {open && <button className="btn primary big" onClick={send}>Forderung stellen</button>}
          {!open && reply?.kind !== 'walked' && <button className="btn primary big" onClick={() => onSign(career, offer)}>Unterschreiben</button>}
          <button className="btn secondary big" onClick={onClose}>{open ? 'Zurück' : 'Später entscheiden'}</button>
        </div>
      </div>
    </div>
  );
}
