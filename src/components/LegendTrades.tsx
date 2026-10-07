import { useMemo, useState } from 'react';
import { rarity, type CollectCard } from '../game/club';
import { MOMENTS, MOMENT_SIZE, checkMoment, completeMoment, momentCandidates, momentDone, momentOpen, type MomentSbc } from '../game/legendTrades';
import { getClubState, setClubState, useClub } from '../clubStore';
import { PackOpening } from './Store';
import UtCard from './UtCard';

/** Spezial-Tausche: 11 Karten von Hand zusammenstellen – für eine Momentkarte mit 91–93. */
export default function LegendTrades() {
  const club = useClub();
  const [open, setOpen] = useState<MomentSbc | null>(null);
  const [reveal, setReveal] = useState<CollectCard | null>(null);

  return (
    <section className="legend-trades">
      <h2>Spezial-Tausch · Legendäre Momente</h2>
      <p className="hub-sub small">Gib 11 Karten ab und bekomme eine Momentkarte (91–93). Jede gibt es nur einmal. Zusammenstellen musst du selbst.</p>
      <div className="lt-list">
        {MOMENTS.map((m) => {
          const done = momentDone(club, m);
          const locked = !done && !momentOpen(club, m);
          return (
            <div key={m.id} className={`lt-item ${done ? 'done' : ''} ${locked ? 'locked' : ''}`}>
              <UtCard card={m.reward} size="sm" shine={!locked} />
              <div className="lt-info">
                <strong>{m.reward.name} · {m.reward.label}</strong>
                <small>{m.story}</small>
                <small className="lt-req">11 Karten · Schnitt {m.minAvg}+ · jede {m.minEach}+ · {m.needs.map((n) => `${n.count}× ${n.label}`).join(' · ')}</small>
                {done ? (
                  <span className="lt-badge">✓ Freigeschaltet</span>
                ) : locked ? (
                  <span className="lt-badge muted">🔒 Erst nach {MOMENTS.find((x) => x.id === m.after)?.reward.name}</span>
                ) : (
                  <button className="btn primary small" onClick={() => setOpen(m)}>Zusammenstellen</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {open && (
        <Builder
          m={open}
          onClose={() => setOpen(null)}
          onDone={(card) => { setOpen(null); setReveal(card); }}
        />
      )}
      {reveal && (
        <PackOpening
          name="Spezial-Tausch"
          result={{ cards: [{ card: reveal, duplicate: false }], items: [] }}
          onClose={() => setReveal(null)}
          onCollection={() => setReveal(null)}
        />
      )}
    </section>
  );
}

type Filter = 'all' | 'icon' | 'cult' | 'league' | 'pos';

function Builder({ m, onClose, onDone }: { m: MomentSbc; onClose: () => void; onDone: (c: CollectCard) => void }) {
  const club = useClub();
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const pool = useMemo(() => momentCandidates(club).sort((a, b) => rarity(b) - rarity(a)), [club]);
  const byId = useMemo(() => new Map(pool.map((c) => [c.id, c])), [pool]);
  const chosen = picked.map((id) => byId.get(id)).filter((c): c is CollectCard => !!c);
  const check = checkMoment(m, chosen);
  const leagueName = m.reward.league!;

  const shown = pool.filter((c) => {
    if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'icon') return c.variant === 'icon';
    if (filter === 'cult') return c.variant === 'cult';
    if (filter === 'league') return c.league === leagueName;
    if (filter === 'pos') return c.position === 'ST' || c.position === 'IV';
    return true;
  });
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < MOMENT_SIZE ? [...p, id] : p));

  const trade = () => {
    if (!check.ok) return;
    if (!confirm(`Diese 11 Karten abgeben?\n\n${chosen.map((c) => `${c.name} (${c.ovr})`).join(', ')}\n\nSie sind danach weg.`)) return;
    const next = completeMoment(getClubState(), m.id, picked);
    if (!next) return;
    setClubState(next);
    onDone(m.reward);
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={`Spezial-Tausch ${m.reward.name}`}>
      <div className="overlay-inner lt-builder">
        <header className="overlay-head"><button className="nav-back" onClick={onClose}>‹ Zurück</button></header>
        <div className="lt-head">
          <UtCard card={m.reward} size="md" shine />
          <div>
            <h1 className="overlay-title">{m.reward.label}</h1>
            <p className="hub-sub small">{m.story}</p>
          </div>
        </div>

        <ul className="lt-rules">
          {check.rows.map((r) => (
            <li key={r.label} className={r.ok ? 'ok' : ''}>
              <span>{r.ok ? '✓' : '✗'} {r.label}</span>
              <b>{r.have} / {r.need}</b>
            </li>
          ))}
        </ul>

        <h2 className="lt-sub">Deine Abgabe ({chosen.length}/{MOMENT_SIZE})</h2>
        <div className="lt-slots">
          {Array.from({ length: MOMENT_SIZE }, (_, i) => (
            <div key={i} className="lt-slot">
              {chosen[i] ? <UtCard card={chosen[i]} size="xs" onClick={() => toggle(chosen[i].id)} /> : <span className="trade-empty">+</span>}
            </div>
          ))}
        </div>

        <h2 className="lt-sub">Deine Karten</h2>
        <input className="search" placeholder="Karte suchen …" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="chips lt-chips">
          {([['all', 'Alle'], ['league', leagueName], ['icon', 'Ikonen'], ['cult', 'Kult'], ['pos', 'ST & IV']] as [Filter, string][]).map(([id, label]) => (
            <button key={id} className={`chip ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
        {pool.length < MOMENT_SIZE && <p className="hub-sub">Du hast noch nicht genug verschiedene Karten.</p>}
        <div className="lt-pool">
          {shown.map((c) => (
            <div key={c.id} className={`trade-pickcard ${picked.includes(c.id) ? 'on' : ''} ${c.ovr < m.minEach ? 'weak' : ''}`}>
              <UtCard card={c} size="xs" onClick={() => toggle(c.id)} />
            </div>
          ))}
        </div>

        <div className="lt-bar">
          <span>{chosen.length}/{MOMENT_SIZE} · Schnitt {chosen.length ? check.avg.toFixed(1).replace('.', ',') : '–'}</span>
          <button className="btn primary" disabled={!check.ok} onClick={trade}>Tauschen</button>
        </div>
      </div>
    </div>
  );
}
