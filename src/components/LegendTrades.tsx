import { PASS_XP, addPassXp } from '../game/pass';
import { memo, useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { rarity, type CollectCard } from '../game/club';
import { MOMENTS, MOMENT_SIZE, autoFillMoment, checkMoment, completeMoment, momentCandidates, momentDone, momentMissing, momentOpen, momentVisible, type MomentSbc } from '../game/legendTrades';
import Icon from './Icon';
import { getClubState, setClubState, useClub } from '../clubStore';
import { PackOpening } from './Store';
import UtCard from './UtCard';

/** Spezial-Tausche: 11 starke Karten abgeben – automatisch ausgewählt oder von Hand – für eine Momentkarte mit 91–96. */
export default function LegendTrades() {
  const club = useClub();
  const [open, setOpen] = useState<MomentSbc | null>(null);
  const [reveal, setReveal] = useState<CollectCard | null>(null);

  return (
    <section className="legend-trades">
      <h2>Spezial-Tausch · Legendäre Momente</h2>
      <p className="hub-sub small">Gib 11 starke Karten ab und bekomme eine Momentkarte (91–102). Jede gibt es nur einmal. „Automatisch füllen“ sucht dir die günstigste passende Abgabe heraus – du kannst danach noch tauschen.</p>
      <div className="lt-list">
        {MOMENTS.filter((m) => momentVisible(club, m)).map((m) => {
          const done = momentDone(club, m);
          const locked = !done && !momentOpen(club, m);
          return (
            <div key={m.id} className={`lt-item ${done ? 'done' : ''} ${locked ? 'locked' : ''} ${m.event ? `ev-${m.event}` : ''}`}>
              <UtCard card={m.reward} size="sm" shine={!locked} />
              <div className="lt-info">
                <strong>{m.reward.name} · {m.reward.label}</strong>
                <small>{m.story}</small>
                <small className="lt-req">11 Karten · Schnitt {m.minAvg}+ · jede {m.minEach}+ · {m.needs.map((n) => `${n.count}× ${n.label}`).join(' · ')}</small>
                {done ? (
                  <span className="lt-badge">Freigeschaltet</span>
                ) : locked ? (
                  <span className="lt-badge muted">Erst nach {MOMENTS.find((x) => x.id === m.after)?.reward.name}</span>
                ) : (
                  <button className="btn primary small" onClick={() => setOpen(m)}>Zusammenstellen</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Direkt an die Seite hängen: der Bereich hier ist animiert, darin wären Vollbild-Ebenen nicht bildschirmhoch
          (der Tauschen-Knopf landete sonst am Ende der Kartenliste) */}
      {open && createPortal(
        <Builder
          m={open}
          onClose={() => setOpen(null)}
          onDone={(card) => { setOpen(null); setReveal(card); }}
        />, document.body,
      )}
      {reveal && createPortal(
        <PackOpening
          name="Spezial-Tausch"
          result={{ cards: [{ card: reveal, duplicate: false }], items: [] }}
          onClose={() => setReveal(null)}
          onCollection={() => setReveal(null)}
        />, document.body,
      )}
    </section>
  );
}

type Filter = 'fit' | 'all' | 'icon' | 'cult' | 'league' | 'pos';
/** So viele Karten werden zuerst gezeigt – alles auf einmal ruckelt bei großen Sammlungen. */
const PAGE = 60;

function Builder({ m, onClose, onDone }: { m: MomentSbc; onClose: () => void; onDone: (c: CollectCard) => void }) {
  const club = useClub();
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('fit');
  const [limit, setLimit] = useState(PAGE);
  const pool = useMemo(() => momentCandidates(club).sort((a, b) => rarity(b) - rarity(a)), [club]);
  const byId = useMemo(() => new Map(pool.map((c) => [c.id, c])), [pool]);
  const chosen = picked.map((id) => byId.get(id)).filter((c): c is CollectCard => !!c);
  const check = checkMoment(m, chosen);
  // Ewig-Karten haben keine echte Liga – dann gibt es den Liga-Filter nicht
  const leagueName = m.reward.league && m.reward.league !== 'Ewig' && pool.some((c) => c.league === m.reward.league) ? m.reward.league : null;

  const shown = useMemo(() => pool.filter((c) => {
    if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
    // „Passend“: stark genug und erfüllt mindestens eine Bedingung (oder ist stark genug, wenn es keine gibt)
    if (filter === 'fit') return c.ovr >= m.minEach && (m.needs.some((n) => n.test(c)) || c.ovr >= m.minAvg);
    if (filter === 'icon') return c.variant === 'icon';
    if (filter === 'cult') return c.variant === 'cult';
    if (filter === 'league') return c.league === leagueName;
    if (filter === 'pos') return c.position === 'ST' || c.position === 'IV';
    return true;
  }), [pool, query, filter, m, leagueName]);
  const pickedSet = useMemo(() => new Set(picked), [picked]);
  const [note, setNote] = useState<string | null>(null);
  const autoFill = () => {
    const ids = autoFillMoment(getClubState(), m);
    setPicked(ids);
    const cards = ids.map((id) => byId.get(id)).filter((c): c is CollectCard => !!c);
    const missing = momentMissing(m, cards);
    setNote(missing.length ? `Mit deinen Karten geht es noch nicht – es fehlt: ${missing.join(' · ')}` : 'Passt! Prüf die Auswahl und tippe auf „Tauschen“.');
  };
  const toggle = useCallback((id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < MOMENT_SIZE ? [...p, id] : p)), []);

  const trade = () => {
    if (!check.ok) return;
    if (!confirm(`Diese 11 Karten abgeben?\n\n${chosen.map((c) => `${c.name} (${c.ovr})`).join(', ')}\n\nSie sind danach weg.`)) return;
    const next = completeMoment(getClubState(), m.id, picked);
    if (!next) return;
    setClubState(addPassXp(next, PASS_XP.task));
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
              <span><Icon name={r.ok ? 'check' : 'close'} size={16} /> {r.label}</span>
              <b>{r.have} / {r.need}</b>
            </li>
          ))}
        </ul>

        <div className="lt-auto">
          <button className="btn primary" onClick={autoFill}><Icon name="spark" size={18} />Automatisch füllen</button>
          {picked.length > 0 && <button className="btn ghost small" onClick={() => { setPicked([]); setNote(null); }}>Leeren</button>}
        </div>
        {note && <p className={`lt-note ${check.ok ? 'ok' : ''}`}>{note}</p>}

        <h2 className="lt-sub">Deine Abgabe ({chosen.length}/{MOMENT_SIZE}) <small>Antippen nimmt eine Karte raus</small></h2>
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
          {([['fit', 'Passend'], ['all', 'Alle'], ...(leagueName ? [['league', leagueName]] : []), ['icon', 'Ikonen'], ['cult', 'Kult'], ['pos', 'ST & IV']] as [Filter, string][]).map(([id, label]) => (
            <button key={id} className={`chip ${filter === id ? 'active' : ''}`} onClick={() => { setFilter(id); setLimit(PAGE); }}>{label}</button>
          ))}
        </div>
        {pool.length < MOMENT_SIZE && <p className="hub-sub">Du hast noch nicht genug verschiedene Karten.</p>}
        <div className="lt-pool">
          {shown.slice(0, limit).map((c) => (
            <PoolCard key={c.id} c={c} on={pickedSet.has(c.id)} weak={c.ovr < m.minEach} onToggle={toggle} />
          ))}
        </div>
        {!shown.length && <p className="hub-sub">Keine Karten für diesen Filter.</p>}
        {shown.length > limit && <button className="btn ghost small lt-more" onClick={() => setLimit(limit + PAGE * 2)}>Mehr anzeigen ({shown.length - limit} weitere)</button>}

        <div className="lt-bar">
          <span>{chosen.length}/{MOMENT_SIZE} · Schnitt {chosen.length ? check.avg.toFixed(1).replace('.', ',') : '–'}</span>
          <button className="btn primary" disabled={!check.ok} onClick={trade}>Tauschen</button>
        </div>
      </div>
    </div>
  );
}

/** Eine Karte in der Auswahl – nur neu zeichnen, wenn sich ihr Zustand ändert. */
const PoolCard = memo(function PoolCard({ c, on, weak, onToggle }: { c: CollectCard; on: boolean; weak: boolean; onToggle: (id: string) => void }) {
  return (
    <div className={`trade-pickcard ${on ? 'on' : ''} ${weak ? 'weak' : ''}`}>
      <UtCard card={c} size="xs" onClick={() => onToggle(c.id)} />
    </div>
  );
});
