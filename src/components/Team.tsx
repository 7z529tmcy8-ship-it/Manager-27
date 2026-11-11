import { SHOP_SALES } from '../game/shopConfig';
import { DUEL_XP_PER_DAY, PASS_XP, addDuelPassXp, addPassXp, duelXpLeft } from '../game/pass';
import Icon, { Glyph } from './Icon';
import { evoAfterDuel, getPath, stepText, type EvoProgress } from '../game/evolutions';
import { getCard as poolCard } from '../game/club';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PACKS, openPack, rarity, storePacks, type CollectCard, type PackResult } from '../game/club';
import {
  FORMATIONS, FORMATION_ORDER, TASKS, changeFormation, slotsOf, autoSquad, cardById, chemistry, completeTask, fit, teamCards, switchTeam, activeTeam, TEAM_NAMES, type TeamKind,
  setSlot, swapSlots, chemLinks, taskPick, teamRating, teamStrength, type DuelResult,
} from '../game/squad';
import { getClubState, setClubState, useClub } from '../clubStore';
import { FRIEND_REWARD, SLOT_LABELS, exportTeam, importTeam, playFriendDuel, record, removeFriend, resultText, saveFriend, withOwnerId, type FriendTeam } from '../game/friends';
import { motionReduced } from '../settings';
import { SEASON_RANKS, nextRank, seasonDaysLeft, seasonId, seasonName, seasonPoints, seasonRank, unclaimedSeasons, type SeasonRank } from '../game/squad';
import { claimDuelSeason } from '../game/rivals';
import { PackOpening, PackPrompt } from './Store';
import UtCard from './UtCard';
import Draft from './Draft';
import HiLoMode from './HiLoMode';
import { hiloOf } from '../game/hilo';
import {
  CHAMPIONS, ELITE, LOWEST, PROMOTE_AT, TOP, SAFE_DIVISIONS, STYLE_LABEL, TACTIC_TEXT, divLevel, divName, divReward, divStrength, divisionOf, playDivisionDuel, promoBonus, resolveTactic, squadFit, withOpponent, type Tactic, type TacticChoice,
} from '../game/divisions';
import LegendTrades from './LegendTrades';

type Tab = 'squad' | 'friends';

/** Mein Team: Aufstellung aus der Sammlung und Duelle gegen Freunde. */
export default function Team({ onBack, onStore }: { onBack: () => void; onStore: () => void }) {
  const club = useClub();
  const [tab, setTab] = useState<Tab>('squad');
  const cards = club.squad.map((id) => cardById(club, id));
  const chem = chemistry(cards, slotsOf(club));
  const rating = teamRating(cards);
  const full = cards.filter(Boolean).length === 11;

  return (
    <main className={`hub team-screen tab-${tab}`}>
      <header className="hub-top">
        <button className="hub-back" onClick={onBack}>‹ Hauptmenü</button>
        <span className="hub-coins"><Icon name="coin" size={16} className="coin-ic" />{club.coins.toLocaleString('de-DE')}</span>
      </header>
      <h1 className="hub-title">Mein Team</h1>
      <TeamSwitch />
      <div className="team-stats">
        <div><small>Wertung</small><strong>{rating || '–'}</strong></div>
        <div><small>Chemie</small><strong>{chem.total}<em>/33</em></strong></div>
        <div><small>Duelle</small><strong>{club.duels.w}<em>S</em> {club.duels.d}<em>U</em> {club.duels.l}<em>N</em></strong></div>
      </div>
      <div className="segmented team-tabs" role="tablist">
        {([['squad', 'Aufstellung'], ['friends', 'Freunde']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === 'squad' && <Squad onStore={onStore} />}
      {tab === 'friends' && <Friends full={full} onSquad={() => setTab('squad')} />}
    </main>
  );
}

/** Umschalter zwischen Haupt-Team und Karriere-Team (gilt für Aufstellung und Duelle). */
function TeamSwitch({ hint }: { hint?: string }) {
  const club = useClub();
  const on = activeTeam(club);
  const count = (k: TeamKind) => teamCards(club, k).length;
  return (
    <div className="team-switch">
      <div className="segmented" role="radiogroup" aria-label="Team wählen">
        {(['main', 'career'] as TeamKind[]).map((k) => (
          <button key={k} role="radio" aria-checked={on === k} className={on === k ? 'active' : ''}
            onClick={() => setClubState(switchTeam(getClubState(), k))}>
            {TEAM_NAMES[k]} <small>{count(k)}</small>
          </button>
        ))}
      </div>
      <p className="team-switch-hint">{hint ? `${hint} ` : ''}{on === 'career' ? 'Karriere- und SBC-Karten.' : 'Gezogene Karten, Event- und SBC-Karten.'}</p>
    </div>
  );
}

function ScreenHead({ title, onBack }: { title: string; onBack: () => void }) {
  const club = useClub();
  return (
    <>
      <header className="hub-top">
        <button className="hub-back" onClick={onBack}>‹ Hauptmenü</button>
        <span className="hub-coins"><Icon name="coin" size={16} className="coin-ic" />{club.coins.toLocaleString('de-DE')}</span>
      </header>
      <h1 className="hub-title">{title}</h1>
    </>
  );
}

/** Eigener Bereich: Duelle gegen immer stärkere Gegner (mit der Elf aus „Mein Team“). */
type DuelTab = 'play' | 'leagues' | 'season' | 'modes';
const DUEL_TABS: [DuelTab, string, 'duel' | 'medal' | 'calendar' | 'cards'][] = [['play', 'Spielen', 'duel'], ['leagues', 'Ligen', 'medal'], ['season', 'Saison', 'calendar'], ['modes', 'Modi', 'cards']];

export function DuelsScreen({ onBack, onTeam }: { onBack: () => void; onTeam: () => void }) {
  const club = useClub();
  const [draft, setDraft] = useState(false);
  const [hilo, setHilo] = useState(false);
  const [tab, setTab] = useState<DuelTab>(() => { try { return (sessionStorage.getItem('fc-duel-tab') as DuelTab) || 'play'; } catch { return 'play'; } });
  const pick = (t: DuelTab) => { setTab(t); try { sessionStorage.setItem('fc-duel-tab', t); } catch { /* egal */ } };
  const cards = club.squad.map((id) => cardById(club, id));
  const full = cards.filter(Boolean).length === 11;
  const seasonOpen = unclaimedSeasons(club).length;
  return (
    <main className="hub duels-screen">
      <ScreenHead title="Duelle" onBack={onBack} />
      <TeamSwitch hint="Duelle spielst du mit dem gewählten Team." />
      <div className="team-stats">
        <div><small>Wertung</small><strong>{teamRating(cards) || '–'}</strong></div>
        <div><small>Division</small><strong>{divisionOf(club).div <= ELITE ? divName(divisionOf(club).div) : divisionOf(club).div}</strong></div>
        <div><small>Bilanz</small><strong>{club.duels.w}<em>S</em> {club.duels.d}<em>U</em> {club.duels.l}<em>N</em></strong></div>
      </div>
      <nav className="dl-tabs" aria-label="Duelle-Bereiche">
        {DUEL_TABS.map(([id, label, icon]) => (
          <button key={id} className={`dl-tab ${tab === id ? 'on' : ''}`} aria-pressed={tab === id} onClick={() => pick(id)}>
            <Icon name={icon} size={18} /><span>{label}</span>
            {id === 'season' && seasonOpen > 0 && <b className="shop-badge">{seasonOpen}</b>}
          </button>
        ))}
      </nav>
      <div className="dl-body" key={tab}>
        {tab === 'play' && <Duels full={full} onSquad={onTeam} onLeagues={() => pick('leagues')} />}
        {tab === 'leagues' && <Leagues />}
        {tab === 'season' && <DuelSeason />}
        {tab === 'modes' && (
          <div className="dl-modes">
            <button className="draft-call" onClick={() => setDraft(true)}>
              <span className="draft-call-icon" aria-hidden="true"><Icon name="cards" size={26} /></span>
              <span className="draft-call-text"><b>Draft</b><small>Kapitän wählen, Elf draften, Turnier gewinnen</small></span>
              <Icon name="arrow" size={22} />
            </button>
            <button className="draft-call hl-call-btn" onClick={() => setHilo(true)}>
              <span className="draft-call-icon" aria-hidden="true"><Icon name="rise" size={26} /></span>
              <span className="draft-call-text"><b>Höher oder Tiefer</b><small>Serien spielen, Punkte sammeln, Talente entwickeln{hiloOf(club).points ? ` · ${hiloOf(club).points} Punkte` : ''}</small></span>
              <Icon name="arrow" size={22} />
            </button>
          </div>
        )}
      </div>
      {draft && <Draft onClose={() => setDraft(false)} />}
      {hilo && <HiLoMode onClose={() => setHilo(false)} />}
    </main>
  );
}

/** Alle Divisionen auf einen Blick: Gegnerstärke, Siegprämie, Aufstiegsbonus, Saison-Faktor. */
function Leagues() {
  const club = useClub();
  const d = divisionOf(club);
  const list = Array.from({ length: LOWEST + 1 - TOP }, (_, i) => i + TOP); // Champions (−1), Elite (0) … Division 10
  return (
    <section className="lg-list" aria-label="Alle Divisionen">
      <p className="lg-legend"><span><Icon name="shield" size={14} />= Sicherheitsstufe, kein Abstieg</span><span>Sieg +2 · Remis +1 · Niederlage −1 · Aufstieg bei {PROMOTE_AT}</span></p>
      <ol>
        {list.map((x) => {
          const here = x === d.div;
          return (
            <li key={x} className={`lg-row ${here ? 'here' : ''} ${x >= d.best ? 'reached' : 'locked'}`}>
              <span className={`div-badge small ${x === ELITE ? 'elite' : x === CHAMPIONS ? 'champ' : ''}`}>{x === CHAMPIONS ? <Icon name="trophy" size={18} /> : x === ELITE ? <Icon name="crown" size={18} /> : x}</span>
              <span className="lg-name">
                <b>{divName(x)}{SAFE_DIVISIONS.includes(x) && <Icon name="shield" size={14} />}</b>
                <small>Gegner ~{divStrength(x)} · Saison-Punkte ×{divLevel(x)}</small>
              </span>
              <span className="lg-pay">
                <b><Icon name="coin" size={14} className="coin-ic" />{divReward(x).toLocaleString('de-DE')}</b>
                <small>{here ? 'Du bist hier' : x < d.best ? `Aufstieg +${promoBonus(x).toLocaleString('de-DE')}` : 'pro Sieg'}</small>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Duell-Saison: Punkte im laufenden Monat, Rang, offene Belohnungen und Freunde-Rangliste. */
function DuelSeason() {
  const club = useClub();
  const sid = seasonId();
  const pts = seasonPoints(club, sid);
  const rank = seasonRank(pts);
  const next = nextRank(pts);
  const open = unclaimedSeasons(club);
  const progress = next ? ((pts - rank.min) / (next.min - rank.min)) * 100 : 100;
  const board = [
    { name: club.teamName || 'Du', points: pts, me: true },
    ...(club.friends ?? []).filter((f) => f.team.season?.id === sid).map((f) => ({ name: f.team.name, points: f.team.season!.points, me: false })),
  ].sort((a, b) => b.points - a.points);
  const daysLeft = seasonDaysLeft();
  const [rivals, setRivals] = useState<PackResult | null>(null);
  const claim = (id: string) => {
    const res = claimDuelSeason(getClubState(), id);
    setClubState(res.club);
    if (res.rivals?.cards.length) setRivals(res.rivals);
  };
  const reward = (r: SeasonRank) => [r.coins ? `${r.coins.toLocaleString('de-DE')} Coins` : '', ...(r.packs ?? []).map((id) => PACKS.find((p) => p.id === id)?.name ?? id), r.rivals ? `${r.rivals}× Rivals-Pack (+${r.boost})` : ''].filter(Boolean).join(' · ');
  return (
    <section className="season">
      {open.map((s) => (
        <button key={s.id} className="season-claim" onClick={() => claim(s.id)}>
          <Glyph e={s.rank.icon} size={18} /> {seasonName(s.id)} beendet: {s.rank.name} mit {s.points} Punkten – {reward(s.rank)} abholen ›
        </button>
      ))}
      <div className="season-head">
        <span className="season-icon" aria-hidden="true"><Glyph e={rank.icon} /></span>
        <div>
          <small>Wochen-Saison · {seasonName(sid)} · noch {daysLeft} {daysLeft === 1 ? 'Tag' : 'Tage'}</small>
          <strong>{rank.name} · {pts} Punkte</strong>
        </div>
      </div>
      <div className="season-bar"><i style={{ width: `${progress}%` }} /></div>
      <p className="hint">
        {next ? `Noch ${next.min - pts} Punkte bis ${next.name}: ${reward(next)}.` : 'Höchster Rang erreicht!'}
        {' '}Sieg = 10 Punkte × Divisionsstufe (Division 10 = 1, Elite = 11, Champions = 12), Unentschieden = 3 ×. Belohnung jeden Montag.
      </p>
      <details className="season-more">
        <summary>Ränge & Rangliste</summary>
        <ul className="season-ranks">
          {SEASON_RANKS.map((r) => (
            <li key={r.name} className={r.name === rank.name ? 'on' : ''}>
              <span><Glyph e={r.icon} size={18} /> {r.name}</span><span>ab {r.min}</span><span>{reward(r) || '–'}</span>
            </li>
          ))}
        </ul>
        <ol className="season-board">
          {board.map((b, i) => (
            <li key={`${b.name}-${i}`} className={b.me ? 'me' : ''}><span>{i + 1}.</span><span>{b.name}</span><strong>{b.points}</strong></li>
          ))}
        </ol>
        <p className="hint">Freunde erscheinen hier, wenn sie dir in dieser Woche einen neuen Team-Code schicken (unter „Mein Team“ › Freunde).</p>
      </details>
      <p className="season-rivals"><Icon name="duel" size={16} /> <b>Rivals-Pack:</b> Eine Karte aus deiner Elf kommt verbessert zurück (+2 bis +5) – dazu 2 Extrakarten ab 80.</p>
      {rivals && createPortal(<PackOpening name="Rivals-Pack" result={rivals} onClose={() => setRivals(null)} onCollection={() => setRivals(null)} />, document.body)}
    </section>
  );
}

/** Eigener Bereich: SBC – Spezial-Tausche (Momentkarten) und Pack-Tausche. */
export function SbcScreen({ onBack }: { onBack: () => void }) {
  return (
    <main className="hub">
      <ScreenHead title="SBC" onBack={onBack} />
      <Tasks />
    </main>
  );
}

// ---------- Aufstellung ----------
type DragFrom = { slot: number } | { reserve: string };
function Squad({ onStore }: { onStore: () => void }) {
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

  if (!owned.length && activeTeam(club) === 'career') {
    return (
      <div className="hub-empty">
        <p>Im Karriere-Team spielen nur Karten aus deinen Karrieren (Auszeichnungen, Ikonen, Saison-Specials) und SBC-Karten. Beende eine Karriere oder erledige ein SBC, dann kannst du hier aufstellen.</p>
      </div>
    );
  }
  if (!owned.length) {
    return (
      <div className="hub-empty">
        <p>{SHOP_SALES ? 'Du hast noch keine Karten. Öffne zuerst ein Pack im Shop.' : 'Noch keine Karten. Hol dir welche über Codes im Shop, den Ruhmesweg, Events und Karriere-Belohnungen.'}</p>
        <button className="btn primary" onClick={onStore}>Zum Store</button>
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
const CHOICES: TacticChoice[] = ['auto', 'pressing', 'konter', 'ballbesitz', 'ausgewogen'];
const TAC_SHORT: Record<TacticChoice, string> = { auto: 'Auto', pressing: 'Pressing', konter: 'Konter', ballbesitz: 'Besitz', ausgewogen: 'Neutral' };
const TACTIC_ICON: Record<Tactic, 'fire' | 'bolt' | 'link' | 'shield'> = { pressing: 'fire', konter: 'bolt', ballbesitz: 'link', ausgewogen: 'shield' };

/** Divisions-Duell: kompakt – Division, Gegner, Taktik (bleibt gespeichert), Anpfiff. */
function Duels({ full, onSquad, onLeagues }: { full: boolean; onSquad: () => void; onLeagues: () => void }) {
  const club = useClub();
  const choice: TacticChoice = club.duelTactic ?? 'ausgewogen';
  const [live, setLive] = useState<{ name: string; result: DuelResult } | null>(null);
  const cards = club.squad.map((id) => cardById(club, id));
  const strength = teamStrength(cards, slotsOf(club));
  const d = divisionOf(club);
  const opp = d.next;
  const tactic = resolveTactic(choice, opp?.hint);
  const setChoice = (c: TacticChoice) => setClubState({ ...getClubState(), duelTactic: c });

  // Gegner einmal auslosen und speichern – Neuladen bringt keinen anderen.
  useEffect(() => {
    if (full && !divisionOf(getClubState()).next) setClubState(withOpponent(getClubState()));
  }, [full, opp]);

  const play = () => {
    const res = playDivisionDuel(getClubState(), tactic);
    if (!res) return;
    const evo = evoAfterDuel(res.club, res.result, res.level);
    // Duell-XP sind pro Tag gedeckelt, Evolution-Stufen zählen extra.
    const duelXp = addDuelPassXp(evo.club, PASS_XP.duel(res.level, res.result.outcome));
    const evoXp = evo.progress?.stepDone ? PASS_XP.evoStep : 0;
    const passXp = duelXp.granted + evoXp;
    setClubState(addPassXp(duelXp.club, evoXp));
    const tacticNote = res.edge > 0 ? `${STYLE_LABEL[tactic]} hat gegen ${STYLE_LABEL[res.opponent.style]} gewirkt (+${res.edge})`
      : res.edge < 0 ? `Ausgekontert: ${res.opponent.name} spielte ${STYLE_LABEL[res.opponent.style]} (${res.edge})`
      : `Taktik neutral – ${res.opponent.name} spielte ${STYLE_LABEL[res.opponent.style]}`;
    const moveNote = res.move === 'up' ? `Aufstieg in ${divName(divisionOf(evo.club).div)}!${res.bonus ? ` Bonus +${res.bonus.toLocaleString('de-DE')} Coins` : ''}`
      : res.move === 'down' ? `Abstieg in ${divName(divisionOf(evo.club).div)}` : undefined;
    setLive({ name: res.opponent.name, result: { ...res.result, passXp, tactic: tacticNote, division: moveNote, evo: evoMessage(evo.club, evo.progress, res.result.outcome === 'win') } });
  };

  if (!full) {
    return (
      <div className="hub-empty">
        <p>Für Duelle brauchst du eine vollständige Elf (11 Spieler).</p>
        <button className="btn primary" onClick={onSquad}>Zur Aufstellung</button>
      </div>
    );
  }
  const odds = opp ? strength - opp.strength : 0;
  const safe = SAFE_DIVISIONS.includes(d.div);
  return (
    <>
      <EvoStatus />
      <button className="dv-strip" onClick={onLeagues} aria-label="Alle Divisionen ansehen">
        <span className={`div-badge small ${d.div === ELITE ? 'elite' : d.div === CHAMPIONS ? 'champ' : ''}`}>{d.div === CHAMPIONS ? <Icon name="trophy" size={18} /> : d.div === ELITE ? <Icon name="crown" size={18} /> : d.div}</span>
        <span className="dv-mid">
          <b>{divName(d.div)}</b>
          <span className="div-pips" aria-label={`Fortschritt ${d.pts} von ${PROMOTE_AT}`}>{Array.from({ length: PROMOTE_AT }, (_, i) => <i key={i} className={i < d.pts ? 'on' : ''} />)}</span>
          <small>{d.div === TOP ? 'Höchste Division' : `Noch ${PROMOTE_AT - d.pts} bis ${divName(d.div - 1)}`}{safe ? ' · kein Abstieg' : ''}</small>
        </span>
        <span className="dv-pay"><Icon name="coin" size={14} className="coin-ic" />{divReward(d.div).toLocaleString('de-DE')}<small>pro Sieg</small></span>
        <Icon name="arrow" size={18} />
      </button>

      {opp && (
        <section className="dv-match" aria-label="Nächster Gegner">
          <div className="div-vs">
            <div className="div-side"><small>Dein Team</small><strong>{strength.toFixed(1)}</strong></div>
            <span className="div-vs-mark">VS</span>
            <div className="div-side opp"><small>{opp.name}</small><strong>{opp.strength}</strong></div>
          </div>
          <p className="dv-info">
            <span className={odds >= 3 ? 'up' : odds <= -3 ? 'down' : ''}>{odds >= 3 ? 'Favorit' : odds <= -3 ? 'Außenseiter' : 'Ausgeglichen'}</span>
            <span><Icon name="eye" size={14} />Scouting: meist <b>{STYLE_LABEL[opp.hint]}</b></span>
          </p>
          <div className="dv-tactics" role="radiogroup" aria-label="Taktik (bleibt gespeichert)">
            {CHOICES.map((t) => {
              const fit = t === 'auto' || t === 'ausgewogen' ? 0 : squadFit(t, cards);
              return (
                <button key={t} role="radio" aria-checked={choice === t} className={`dv-tac ${choice === t ? 'on' : ''}`} onClick={() => setChoice(t)}>
                  <Icon name={t === 'auto' ? 'target' : TACTIC_ICON[t]} size={20} />
                  <span>{TAC_SHORT[t]}</span>
                  {fit !== 0 && <em className={fit > 0 ? 'up' : 'down'}>{fit > 0 ? '+' : ''}{fit.toFixed(1)}</em>}
                </button>
              );
            })}
          </div>
          <p className="dv-tac-text">
            {choice === 'auto' ? <>Auto-Konter: spielt immer gegen den Scouting-Bericht – jetzt <b>{STYLE_LABEL[tactic]}</b>.</> : TACTIC_TEXT[tactic]}
            <small> Bleibt für alle Duelle gespeichert.</small>
          </p>
          <button className="btn primary big div-play" onClick={play}>Anpfiff · {STYLE_LABEL[tactic]}</button>
          <p className="hint div-xp">Pass-XP aus Duellen heute: noch {duelXpLeft(club)} von {DUEL_XP_PER_DAY}</p>
        </section>
      )}
      {live && <DuelLive name={live.name} result={live.result} onClose={() => setLive(null)} />}
    </>
  );
}

/** Kurzer Live-Ticker: die Minuten laufen hoch, Tore erscheinen nacheinander. */
export function DuelLive({ name, result, onClose, onShare }: { name: string; result: DuelResult; onClose: () => void; onShare?: () => void }) {
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
        <div className="duel-score"><span>Dein Team</span><strong>{own} : {opp}</strong><span>{name}</span></div>
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

// ---------- Freunde-Duell per Code ----------
const fmtDate = (t: number) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
const OUT: Record<DuelResult['outcome'], string> = { win: 'S', draw: 'U', loss: 'N' };

/** Text teilen (Handy: Teilen-Menü, z. B. WhatsApp) – sonst in die Zwischenablage. */
async function shareText(text: string): Promise<string> {
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return 'Geteilt!';
    }
  } catch {
    // abgebrochen oder nicht möglich – dann kopieren
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'Kopiert – jetzt einfügen und abschicken.';
  } catch {
    return 'Teilen ging nicht automatisch – markiere den Text und kopiere ihn selbst.';
  }
}

function Friends({ full, onSquad }: { full: boolean; onSquad: () => void }) {
  const club = useClub();
  const [name, setName] = useState(club.teamName ?? '');
  const [msg, setMsg] = useState('');
  const [paste, setPaste] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [live, setLive] = useState<{ team: FriendTeam; result: DuelResult } | null>(null);
  const code = full ? exportTeam(club, name) : null;
  const pasted = paste.trim() ? importTeam(paste) : null;
  const ownStrength = teamStrength(club.squad.map((id) => cardById(club, id)), slotsOf(club));
  const friends = [...(club.friends ?? [])].sort((a, b) => b.updatedAt - a.updatedAt);

  // Eigene Kennung anlegen, damit Freunde dich beim nächsten Code wiedererkennen.
  useEffect(() => {
    if (!getClubState().ownerId) setClubState(withOwnerId(getClubState()));
  }, []);

  const saveName = (v: string) => {
    setName(v);
    setClubState({ ...getClubState(), teamName: v.slice(0, 30) });
  };
  const add = (andPlay: boolean) => {
    if (!pasted || typeof pasted === 'string') return;
    const res = saveFriend(getClubState(), pasted);
    if (res.status === 'self') {
      setMsg('Das ist dein eigener Code');
      return;
    }
    setClubState(res.club);
    setMsg(res.status === 'new' ? `${pasted.name} ist jetzt in deiner Freundesliste.` : res.status === 'updated' ? `Team von ${pasted.name} aktualisiert.` : `${pasted.name} ist schon gespeichert.`);
    setPaste('');
    if (andPlay) play(pasted);
  };
  const play = (team: FriendTeam) => {
    const res = playFriendDuel(getClubState(), team);
    if (!res) return;
    setClubState(res.club);
    setLive({ team, result: res.result });
  };

  if (!full) {
    return (
      <div className="hub-empty">
        <p>Für Freunde-Duelle brauchst du eine vollständige Elf (11 Spieler).</p>
        <button className="btn primary" onClick={onSquad}>Zur Aufstellung</button>
      </div>
    );
  }

  const ranking = [
    { id: 'me', name: name.trim() || 'Deine Elf', strength: ownStrength, me: true },
    ...friends.map((f) => ({ id: f.id, name: f.team.name, strength: f.team.strength, me: false })),
  ].sort((a, b) => b.strength - a.strength);

  return (
    <div className="friends">
      <section className="backup-box">
        <h3>Dein Team-Code</h3>
        <label className="friends-name">
          Teamname
          <input value={name} onChange={(e) => saveName(e.target.value)} placeholder="z. B. Ayris Allstars" maxLength={30} />
        </label>
        <small className="muted">Stärke {ownStrength.toFixed(1)} · Schick deinen Code nach jeder Änderung neu – Freunde sehen dann dein aktuelles Team.</small>
        <div className="dev-btns">
          <button className="btn primary" disabled={!code} onClick={async () => setMsg(await shareText(code!))}>Teilen</button>
          <button className="btn secondary" disabled={!code} onClick={async () => { try { await navigator.clipboard.writeText(code!); setMsg('Code kopiert.'); } catch { setMsg('Markiere den Code unten und kopiere ihn selbst.'); } }}>Kopieren</button>
        </div>
        <details>
          <summary className="muted">Code anzeigen</summary>
          <textarea className="backup-text" readOnly value={code ?? ''} rows={3} onFocus={(e) => e.target.select()} aria-label="Dein Team-Code" />
        </details>
      </section>

      <section className="backup-box">
        <h3>Freund hinzufügen</h3>
        <textarea className="backup-text" value={paste} onChange={(e) => setPaste(e.target.value)} rows={2} placeholder="Team-Code deines Freundes hier einfügen" spellCheck={false} aria-label="Team-Code eines Freundes" />
        {typeof pasted === 'string' && <p className="cs-note bad">{pasted}</p>}
        {pasted && typeof pasted !== 'string' && (
          <div className="friend-team">
            <div className="friend-head">
              <strong>{pasted.name}</strong>
              <small>Stärke {pasted.strength.toFixed(1)} · Wertung {pasted.rating} · Chemie {pasted.chemistry}/33</small>
            </div>
            <ol className="friend-players">
              {pasted.players.map((pl, i) => <li key={i}><b>{pl.ovr}</b> {pl.name} <small>{SLOT_LABELS[i]}</small></li>)}
            </ol>
            <div className="dev-btns">
              <button className="btn primary" onClick={() => add(true)}>Speichern & spielen</button>
              <button className="btn secondary" onClick={() => add(false)}>Nur speichern</button>
            </div>
          </div>
        )}
        {msg && <small className="muted" role="status">{msg}</small>}
      </section>

      {friends.length > 0 && (
        <section className="backup-box">
          <h3>Deine Freunde ({friends.length})</h3>
          <ul className="friend-list">
            {friends.map((f) => {
              const r = record(f);
              const diff = f.team.strength - ownStrength;
              return (
                <li key={f.id} className="friend-entry">
                  <div className="friend-row">
                    <span className="grow">
                      <strong>{f.team.name}</strong>
                      <small>
                        Stärke {f.team.strength.toFixed(1)} {diff > 1 ? '▲ stärker' : diff < -1 ? '▼ schwächer' : '≈ gleich'} · Team vom {fmtDate(f.updatedAt)}
                      </small>
                      <small>Bilanz {r.w}S {r.d}U {r.l}N · Tore {r.goalsFor}:{r.goalsAgainst}</small>
                    </span>
                    <span className="friend-form" aria-label="Letzte Ergebnisse">
                      {f.results.slice(0, 5).map((x, i) => <i key={i} className={`f-${OUT[x.outcome]}`}>{OUT[x.outcome]}</i>)}
                    </span>
                  </div>
                  <div className="dev-btns">
                    <button className="btn primary small" onClick={() => play(f.team)}>Spielen</button>
                    {f.results.length > 0 && <button className="btn secondary small" onClick={() => setOpen(open === f.id ? null : f.id)}>Verlauf</button>}
                    <button className="btn ghost small" onClick={() => window.confirm(`${f.team.name} aus der Freundesliste entfernen?`) && setClubState(removeFriend(getClubState(), f.id))}>Entfernen</button>
                  </div>
                  {open === f.id && (
                    <ol className="friend-history">
                      {f.results.map((x, i) => (
                        <li key={i} className={`f-${OUT[x.outcome]}`}>
                          <span>{fmtDate(x.date)}</span><b>{x.own}:{x.opp}</b><small>{x.ownStrength.toFixed(1)} vs. {x.oppStrength.toFixed(1)}</small>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {friends.length > 0 && (
        <section className="backup-box">
          <h3>Rangliste (Teamstärke)</h3>
          <ol className="friend-rank">
            {ranking.map((x, i) => (
              <li key={x.id} className={x.me ? 'me' : ''}><span>{i + 1}.</span><strong>{x.name}</strong><b>{x.strength.toFixed(1)}</b></li>
            ))}
          </ol>
          <small className="muted">Erster Sieg gegen jedes Team: +{FRIEND_REWARD} Coins.</small>
        </section>
      )}

      {live && (
        <DuelLive
          name={live.team.name}
          result={live.result}
          onClose={() => setLive(null)}
          onShare={async () => setMsg(await shareText(resultText(name, live.team, live.result)))}
        />
      )}
    </div>
  );
}

// ---------- Tauschaufgaben ----------
function Tasks() {
  const club = useClub();
  const [opening, setOpening] = useState<{ name: string; result: PackResult } | null>(null);
  const run = (taskId: string) => {
    const task = TASKS.find((t) => t.id === taskId)!;
    const pick = taskPick(getClubState(), task);
    if (!pick) return;
    if (!confirm(`Diese Karten abgeben?\n\n${pick.map((id) => cardById(getClubState(), id)!.name).join(', ')}`)) return;
    const done = completeTask(getClubState(), task);
    if (!done) return;
    setClubState(addPassXp(done.club, PASS_XP.task));
    setPrompt(task.reward);
  };
  const [prompt, setPrompt] = useState<string | null>(null);
  const openNow = (packId: string) => {
    const pack = openPack(getClubState(), packId, Math.random, true)!;
    setClubState(pack.club);
    setOpening({ name: PACKS.find((p) => p.id === packId)!.name, result: pack.result });
  };
  return (
    <>
      <LegendTrades />
      <h2 className="lt-sub">Pack-Tausche</h2>
      <p className="hub-sub">Gib Karten ab und bekomme dafür ein Pack. Aufgestellte Spieler und deine eigenen Sonderkarten werden nie abgegeben.</p>
      <div className="task-list">
        {TASKS.map((t) => {
          const pick = taskPick(club, t);
          return (
            <div key={t.id} className="task">
              <div className="grow">
                <strong>{t.name}</strong>
                <small>{t.text}</small>
                <small className="task-reward">Belohnung: {PACKS.find((p) => p.id === t.reward)!.name}{club.tasksDone[t.id] ? ` · schon ${club.tasksDone[t.id]}× erledigt` : ''}</small>
              </div>
              <button className="btn primary small" disabled={!pick} onClick={() => run(t.id)}>{pick ? 'Tauschen' : 'Fehlt noch'}</button>
            </div>
          );
        })}
      </div>
      {prompt && <PackPrompt packs={[prompt]} onOpen={() => { const id = prompt; setPrompt(null); openNow(id); }} onStore={() => { setClubState(storePacks(getClubState(), [prompt], 'Pack-Tausch')); setPrompt(null); }} />}
      {opening && <PackOpening name={opening.name} result={opening.result} onClose={() => setOpening(null)} onCollection={() => setOpening(null)} />}
    </>
  );
}

/** Text für das Duell-Ergebnis: Was hat die laufende Evolution davon? */
function evoMessage(club: ReturnType<typeof getClubState>, p: EvoProgress | null, won: boolean): string | undefined {
  if (!p || (!p.counted && !won)) return undefined;
  const name = poolCard(p.card)?.name ?? 'Deine Karte';
  const path = getPath(p.path)?.name ?? 'Evolution';
  if (!p.counted) return club.squad.includes(p.card) ? `${path}: Dieser Sieg erfüllt die Bedingung der aktuellen Stufe nicht.` : `${path}: ${name} stand nicht in der Elf – zählt nicht.`;
  if (p.finished) return `${path} abgeschlossen! ${name} +${p.gain}.`;
  if (p.stepDone) return `${path}: Stufe ${p.stepDone} geschafft – ${name} +${p.gain}.`;
  const a = club.evo?.active;
  const step = a && getPath(a.path)?.steps[a.step];
  return step ? `${path}: ${a!.wins}/${step.need} Siege für die nächste Stufe.` : undefined;
}

/** Laufende Evolution oben im Duell-Bereich. */
function EvoStatus() {
  const club = useClub();
  const a = club.evo?.active;
  const path = a && getPath(a.path);
  const card = a && cardById(club, a.card);
  if (!a || !path || !card) return null;
  const step = path.steps[a.step];
  return (
    <div className="evo-status">
      <UtCard card={card} size="xs" />
      <div>
        <small>Evolution · {path.name} · Stufe {a.step + 1}/{path.steps.length}</small>
        <strong>{stepText(step)}</strong>
        <div className="evo-bar"><i style={{ width: `${(a.wins / step.need) * 100}%` }} /></div>
        <small>{a.wins}/{step.need} · danach +{step.gain}{club.squad.includes(a.card) ? '' : ' · Karte steht nicht in der Elf!'}</small>
      </div>
    </div>
  );
}
