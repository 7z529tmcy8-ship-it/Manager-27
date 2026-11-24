import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { CARDS_FROM_CAREER_ONLY } from '../game/mode';
import { getClubState, setClubState, useClub } from '../clubStore';
import { rarity, type CollectCard } from '../game/club';
import {
  FORMATIONS, FORMATION_ORDER, activeTeam, autoSquad, cardById, changeFormation, chemLinks, chemistry, fit, setSlot, slotsOf, swapSlots,
  TEAM_NAMES, switchTeam, teamCards, teamRating, type DuelResult, type TeamKind,
} from '../game/squad';
import { motionReduced } from '../settings';
import Icon from './Icon';
import UtCard from './UtCard';

const Collection = lazy(() => import('./Collection'));

/** Team: deine Elf aus den Spielern deiner Karrieren (Auszeichnungen, Saison-Highlights, Karriere-Ende). */
export default function TeamScreen({ onDuels, onShop, onCasino, tab: startTab }: { onDuels: () => void; onShop: () => void; onCasino: () => void; tab?: 'squad' | 'collection' }) {
  const club = useClub();
  const on = activeTeam(club);
  const cards = club.squad.map((id) => cardById(club, id));
  const chem = chemistry(cards, slotsOf(club));
  const [tab, setTabState] = useState<'squad' | 'collection'>(() => { if (startTab) return startTab; try { return (sessionStorage.getItem('fc-team-tab') as 'squad' | 'collection') || 'squad'; } catch { return 'squad'; } });
  const setTab = (t: 'squad' | 'collection') => { setTabState(t); try { sessionStorage.setItem('fc-team-tab', t); } catch { /* egal */ } };
  return (
    <main className="hub team-screen">
      <h1 className="ch-title">Team</h1>
      <nav className="tm-tabs" role="tablist" aria-label="Team-Bereiche">
        <button role="tab" aria-selected={tab === 'squad'} className={tab === 'squad' ? 'on' : ''} onClick={() => setTab('squad')}><Icon name="tactics" size={18} />Aufstellung</button>
        <button role="tab" aria-selected={tab === 'collection'} className={tab === 'collection' ? 'on' : ''} onClick={() => setTab('collection')}><Icon name="cards" size={18} />Sammlung</button>
      </nav>
      {tab === 'collection' ? <Suspense fallback={null}><Collection onShop={onShop} onCasino={onCasino} /></Suspense> : <>
      <div className="segmented tm-switch" role="radiogroup" aria-label="Team wählen">
        {(['main', 'career'] as TeamKind[]).map((k) => (
          <button key={k} role="radio" aria-checked={on === k} className={on === k ? 'active' : ''} onClick={() => setClubState(switchTeam(getClubState(), k))}>
            {TEAM_NAMES[k]} <small>{teamCards(club, k).length}</small>
          </button>
        ))}
      </div>
      <p className="tm-hint">{on === 'career' ? 'Spieler aus deinen Karrieren und SBC-Karten.' : (CARDS_FROM_CAREER_ONLY ? 'Alle deine Karten – verdient in deinen Karrieren.' : 'Alle deine Karten – Packs, Events, SBCs.')}</p>
      <div className="team-stats">
        <div><small>Wertung</small><strong>{teamRating(cards) || '–'}</strong></div>
        <div><small>Chemie</small><strong>{chem.total}<em>/33</em></strong></div>
        <div><small>Karten</small><strong>{teamCards(club).length}</strong></div>
      </div>
      <Squad />
      <button className="btn primary big tm-duels" onClick={onDuels}><Icon name="duel" size={20} /> Zu den Duellen</button>
      </>}
    </main>
  );
}

type DragFrom = { slot: number } | { reserve: string };
function Squad() {
  const club = useClub();
  const [slot, setSlotOpen] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ from: DragFrom; card: CollectCard } | null>(null);
  const [placed, setPlaced] = useState<number | null>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const press = useRef<{ x: number; y: number; from: DragFrom; card: CollectCard; active: boolean } | null>(null);
  const hover = useRef<HTMLElement | null>(null);
  const suppressClick = useRef(false);
  const cards = club.squad.map((id) => cardById(club, id));
  const slots = slotsOf(club);
  const chem = chemistry(cards, slots);
  const owned = teamCards(club);
  const reserve = owned.filter((c) => !club.squad.includes(c.id)).sort((a, b) => b.ovr - a.ovr).slice(0, 24);

  useEffect(() => {
    if (placed === null) return;
    const t = setTimeout(() => setPlaced(null), 420);
    return () => clearTimeout(t);
  }, [placed]);

  const moveGhost = (x: number, y: number) => {
    if (ghost.current) ghost.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -60%) scale(1.08)`;
    const el = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-slot]') ?? null;
    if (el !== hover.current) { hover.current?.classList.remove('drop-hover'); el?.classList.add('drop-hover'); hover.current = el; }
  };

  // Ziehen mit Finger oder Maus: kurzer Tipp öffnet die Auswahl, Ziehen tauscht oder setzt ein.
  const onPointerDown = (e: React.PointerEvent, from: DragFrom, card: CollectCard) => {
    if (e.button !== 0) return;
    if (e.pointerType === 'mouse') e.preventDefault(); // sonst markiert die Maus beim Ziehen Text
    press.current = { x: e.clientX, y: e.clientY, from, card, active: false };
    const move = (ev: PointerEvent) => {
      const p = press.current;
      if (!p) return;
      if (!p.active) {
        if (Math.hypot(ev.clientX - p.x, ev.clientY - p.y) < 8) return;
        p.active = true;
        setDrag({ from: p.from, card: p.card });
      }
      ev.preventDefault();
      moveGhost(ev.clientX, ev.clientY);
    };
    const end = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      const p = press.current;
      press.current = null;
      if (!p?.active) return;
      suppressClick.current = true;
      setTimeout(() => { suppressClick.current = false; }, 0);
      const target = ev.type === 'pointerup' ? hover.current : null;
      hover.current?.classList.remove('drop-hover');
      hover.current = null;
      setDrag(null);
      if (!target) return;
      const to = Number(target.dataset.slot);
      const c = getClubState();
      if ('slot' in p.from) {
        if (p.from.slot === to) return;
        setClubState(swapSlots(c, p.from.slot, to));
      } else setClubState(setSlot(c, to, p.from.reserve));
      setPlaced(to);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };
  const open = (i: number) => { if (!suppressClick.current) setSlotOpen(i); };

  if (!owned.length) {
    return (
      <div className="hub-empty tm-empty">
        <b>Noch keine Spieler</b>
        <p>{activeTeam(club) === 'career' ? 'Das Karriere-Team besteht aus den Spielern deiner Karrieren: Jede Auszeichnung, jedes Saison-Highlight und die Karte am Karriereende landet hier.' : 'Im Haupt-Team spielen alle deine Karten.'}</p>
      </div>
    );
  }

  return (
    <>
      <div className="chips formation-chips" role="radiogroup" aria-label="Formation">
        {FORMATION_ORDER.map((id) => [id, FORMATIONS[id]] as const).map(([id, f]) => (
          <button key={id} role="radio" aria-checked={(club.formation ?? '433') === id} className={`chip ${(club.formation ?? '433') === id ? 'active' : ''}`}
            onClick={() => setClubState(changeFormation(getClubState(), id))}>{f.name}</button>
        ))}
      </div>
      <div className="team-actions">
        <button className="btn secondary small" onClick={() => setClubState({ ...getClubState(), squad: autoSquad(getClubState()) })}>Auto-Aufstellung</button>
        <button className="btn ghost small" onClick={() => setClubState({ ...getClubState(), squad: Array(11).fill(null) })}>Leeren</button>
      </div>
      <div className={`pitch ${drag ? 'dragging' : ''}`}>
        <div className="pitch-lines" aria-hidden="true"><i className="box top" /><i className="circle" /><i className="box bottom" /></div>
        <svg className="chem-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {chemLinks(cards, slots).map((l) => (
            <line key={`${l.a}-${l.b}`} className={`chem-line ${l.kind}`} x1={slots[l.a].x} y1={slots[l.a].y} x2={slots[l.b].x} y2={slots[l.b].y} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        {slots.map((s, i) => {
          const c = cards[i];
          const f = drag ? fit(drag.card, s.pos) : null;
          const lifted = drag && 'slot' in drag.from && drag.from.slot === i;
          return (
            <div key={i} data-slot={i} className={`pitch-slot ${f ? `fit-${f}` : ''} ${lifted ? 'lifted' : ''} ${placed === i ? 'just-placed' : ''}`} style={{ left: `${s.x}%`, top: `${s.y}%` }}>
              {c ? (
                <span className="slot-card" onPointerDown={(e) => onPointerDown(e, { slot: i }, c)}>
                  <UtCard card={c} size="xs" chem={chem.per[i]} onClick={() => open(i)} />
                </span>
              ) : (
                <button className="slot-empty" onClick={() => open(i)} aria-label={`${s.label} besetzen`}>+</button>
              )}
              <span className={`slot-label ${c && fit(c, s.pos) === 'off' ? 'bad' : ''}`}>{s.label}</span>
            </div>
          );
        })}
      </div>
      {reserve.length > 0 && (
        <section className="bench" aria-label="Reserve">
          <h2 className="bench-head">Reserve <small>Karte aufs Feld ziehen</small></h2>
          <div className="bench-row">
            {reserve.map((c) => (
              <span key={c.id} className={`bench-card ${drag && 'reserve' in drag.from && drag.from.reserve === c.id ? 'lifted' : ''}`} onPointerDown={(e) => onPointerDown(e, { reserve: c.id }, c)}>
                <UtCard card={c} size="xs" />
              </span>
            ))}
          </div>
        </section>
      )}
      <p className="hub-sub small">
        Chemie: gleiche Nation, Liga oder gleicher Verein in der Elf geben Punkte (max. 3 pro Spieler). Auf fremder Position gibt es keine Chemie,
        auf ähnlicher die Hälfte. Ikonen haben immer volle Chemie. Linien auf dem Feld: grün = starke Verbindung, cyan = eine Gemeinsamkeit.
      </p>
      {drag && <div className="drag-ghost" ref={(el) => { ghost.current = el; if (el && press.current) moveGhost(press.current.x, press.current.y); }} aria-hidden="true"><UtCard card={drag.card} size="xs" /></div>}
      {slot !== null && <Picker slot={slot} onClose={() => setSlotOpen(null)} />}
    </>
  );
}

function Picker({ slot, onClose }: { slot: number; onClose: () => void }) {
  const club = useClub();
  const slotDef = slotsOf(club)[slot];
  const pos = slotDef.pos;
  const current = club.squad[slot];
  const list = teamCards(club)
    .map((c) => ({ c, f: fit(c, pos) }))
    .sort((a, b) => ({ ok: 0, near: 1, off: 2 }[a.f] - { ok: 0, near: 1, off: 2 }[b.f]) || b.c.ovr - a.c.ovr);
  const pick = (c: CollectCard | null) => {
    setClubState(setSlot(getClubState(), slot, c ? c.id : null));
    onClose();
  };
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={`Spieler für ${slotDef.label}`}>
      <div className="overlay-inner">
        <header className="overlay-head">
          <button className="nav-back" onClick={onClose}>‹ Zurück</button>
          {current && <button className="btn link small" onClick={() => pick(null)}>Platz leeren</button>}
        </header>
        <h1 className="overlay-title">Position {slotDef.label}</h1>
        <p className="muted">Passende Spieler zuerst. Ein Spieler, der schon woanders steht, wechselt auf diese Position.</p>
        <div className="collection-grid">
          {list.map(({ c, f }) => (
            <div key={c.id} className={`pick-wrap f-${f} ${c.id === current ? 'current' : ''}`}>
              <UtCard card={c} size="sm" shine={rarity(c) >= 200} onClick={() => pick(c)} />
              <span className="pick-fit">{f === 'ok' ? 'passt' : f === 'near' ? 'ähnlich' : 'fremd'}{club.squad.includes(c.id) ? ' · aufgestellt' : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Duelle: Divisionen mit Taktik ----------

export function DuelLive({ name, team = 'Dein Team', result, onClose, onShare }: { name: string; team?: string; result: DuelResult; onClose: () => void; onShare?: () => void }) {
  const [minute, setMinute] = useState(motionReduced() ? 90 : 0);
  useEffect(() => {
    if (minute >= 90) return;
    const t = setTimeout(() => setMinute((m) => Math.min(90, m + 3)), 60);
    return () => clearTimeout(t);
  }, [minute]);
  const shown = result.goals.filter((g) => g.minute <= minute);
  const own = shown.filter((g) => g.own).length;
  const opp = shown.length - own;
  const done = minute >= 90;
  return (
    <div className="pack-open" role="dialog" aria-modal="true" aria-label="Duell">
      <div className="duel-live">
        <small>{done ? 'Abpfiff' : `${minute}. Minute`}</small>
        <div className="duel-score"><span>{team}</span><strong>{own} : {opp}</strong><span>{name}</span></div>
        <ul className="duel-goals">
          {shown.map((g, i) => <li key={i} className={g.own ? 'own' : 'opp'}>{g.minute}′ {g.own ? 'Tor für dich!' : 'Gegentor'}</li>)}
        </ul>
        {done && (
          <>
            <p className={`duel-result ${result.outcome}`}>
              {result.outcome === 'win' ? (result.coins ? `Sieg! +${result.coins} Coins` : 'Sieg!') : result.outcome === 'draw' ? (result.coins ? `Unentschieden · +${result.coins} Coins` : 'Unentschieden') : `Niederlage${result.coins ? ` · +${result.coins} Coins Trostgeld` : ''} – stell dein Team um und versuch es nochmal.`}
              {result.points ? ` · +${result.points} Saisonpunkte` : ''}
              {result.passXp ? ` · +${result.passXp} Pass-XP` : ''}
            </p>
            {result.trophies !== undefined && (
              <p className="duel-glory"><Icon name="trophy" size={16} />{result.trophies >= 0 ? '+' : ''}{result.trophies} Trophäen{result.drop ? ' · Flutlicht-Drop erhalten!' : ''}</p>
            )}
            {result.tactic && <p className="duel-tactic">{result.tactic}</p>}
            {result.division && <p className={`duel-division ${result.division.startsWith('Auf') ? 'up' : 'down'}`}>{result.division}</p>}
            {result.evo && <p className="duel-evo"><Icon name="evo" size={18} />{result.evo}</p>}
            {onShare && <button className="btn secondary big" onClick={onShare}>Ergebnis teilen</button>}
            <button className="btn primary big" onClick={onClose}>Weiter</button>
          </>
        )}
        {!done && <button className="pack-skip" onClick={() => setMinute(90)}>Überspringen</button>}
      </div>
    </div>
  );
}

