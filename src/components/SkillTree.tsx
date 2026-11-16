import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import {
  ARCHETYPES, CORE, DIRS, DIR_ICON, DIR_NAME, EDGES, MASTERY_NAME, NODES, PLAN_SLOTS, STYLE_SLOTS,
  applyPlan, archetypesFor, bonusSummary, canRespec, chooseArchetype, costOf, freePoints, getArchetype, levelInfo, lockReason,
  masteryProgress, milestone, nodeById, reachable, respecSkills, savePlan, skillMods, toggleStyle, unlockSkill, usesOf,
  type Dir, type Skill,
} from '../game/skills';
import { play, playCharge } from '../sound';
import { motionReduced } from '../settings';
import type { Career } from '../game/types';

const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
const KIND_NAME: Record<Skill['kind'], string> = { stat: 'Fähigkeit', star: 'Wertung', style: 'Spielstil', ult: 'Ultimativ' };
/** Ein Ring-Schritt im Bild (SVG-Einheiten). */
const U = 50;
const NODE_R: Record<Skill['kind'], number> = { stat: 12, star: 13, style: 15, ult: 19 };
const ICON_S: Record<Skill['kind'], number> = { stat: 13, star: 13, style: 15, ult: 19 };

/** Auswahl des Spielertyps (einmal pro Karriere). */
export function ArchetypePicker({ career, onChange }: { career: Career; onChange: (c: Career) => void }) {
  const fitting = archetypesFor(career.player.position);
  const list = fitting.length ? fitting : ARCHETYPES;
  return (
    <section className="cs-window">
      <h2>Wähle deinen Spielertyp</h2>
      <p className="cs-sub">
        Dein Typ ist die Mitte deines Skill-Universums. In seiner Heimat-Richtung ist alles am günstigsten – mischen geht, kostet aber mehr.
        Erfahrungspunkte aus Spielen, Toren, Vorlagen, Noten und Titeln bringen Level, jedes Level einen Punkt.
      </p>
      <div className={`cs-choices n${Math.min(3, list.length)} sk-types`}>
        {list.map((a) => (
          <button key={a.id} className="cs-choice k-transfer" onClick={() => onChange(chooseArchetype(career, a.id))}>
            <small><Icon name={a.icon} size={16} /> Spielertyp</small>
            <strong>{a.name}</strong>
            <span className="cs-choice-meta">{a.text}</span>
            <span className="cs-choice-league">Heimat: {DIR_NAME[a.home]} · {NODES.filter((n) => n.dir === a.home && n.kind === 'ult').map((n) => n.name).join(' · ')}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Kleine Anzeige im Kopf: Level und freie Punkte. */
export function LevelChip({ career, onOpen }: { career: Career; onOpen: () => void }) {
  const sk = career.player.skills;
  if (!sk) return null;
  const info = levelInfo(sk.xp);
  const free = freePoints(career.player);
  return (
    <button className={`sk-chip ${free > 0 ? 'has-points' : ''}`} onClick={onOpen} aria-label="Skill-Universum öffnen">
      <span><Icon name={getArchetype(sk.archetype).icon} size={16} /> Lv {info.level}</span>
      <i style={{ width: `${Math.round((info.into / info.need) * 100)}%` }} aria-hidden="true" />
      {free > 0 && <b>{free} FP</b>}
    </button>
  );
}

type View = { x: number; y: number; z: number };
/** Ansicht auf eine Richtung: so verschoben, dass der äußere Ring am Rand anschließt und die Mitte sichtbar bleibt. */
const dirCenter = (d: Dir, w = 360, h = 560): View => {
  const z = 2;
  const fit = 480 / Math.min(w, h);
  const vertical = d === 'g' || d === 'a';
  const half = ((vertical ? h : w) * fit) / z / 2;
  const off = Math.max(1.2 * U, Math.min(2.6 * U, 4.75 * U - half));
  const a = { g: -90, c: 0, a: 90, m: 180 }[d] * (Math.PI / 180);
  return { x: Math.round(Math.cos(a) * off), y: Math.round(Math.sin(a) * off), z };
};
const ALL: View = { x: 0, y: 0, z: 1 };

/** Skill-Universum: ein runder Baum auf einem Bildschirm – verschieben, zoomen, antippen. */
export default function SkillTree({ career, onChange, onClose }: { career: Career; onChange: (c: Career) => void; onClose: () => void }) {
  const p = career.player;
  const sk = p.skills!;
  const type = getArchetype(sk.archetype);
  const info = levelInfo(sk.xp);
  const free = freePoints(p);
  const owned = useMemo(() => new Set(sk.unlocked), [sk.unlocked]);
  const styles = sk.styles ?? [];
  const [view, setView] = useState<View>(() => dirCenter(type.home));
  const [sel, setSel] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [just, setJust] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 360, h: 480 });
  const box = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    let first = true;
    const ro = new ResizeObserver(() => {
      const s = { w: el.clientWidth || 360, h: el.clientHeight || 480 };
      setSize(s);
      // Beim Öffnen: Heimat-Richtung passend zur echten Größe zeigen.
      if (first) { first = false; setView(dirCenter(type.home, s.w, s.h)); }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sichtbereich: bei Zoom 1 passt das ganze Universum (Durchmesser ~470) in die kürzere Seite.
  const fit = 480 / Math.min(size.w, size.h);
  const vw = (size.w * fit) / view.z;
  const vh = (size.h * fit) / view.z;
  const clampView = (v: View): View => {
    const z = Math.min(3, Math.max(0.8, v.z));
    const lim = 4.6 * U;
    return { z, x: Math.max(-lim, Math.min(lim, v.x)), y: Math.max(-lim, Math.min(lim, v.y)) };
  };

  // Verschieben und Zoomen mit Finger/Maus; Antippen ohne Bewegung wählt einen Knoten.
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ moved: boolean; pinch?: number; start: View; sx: number; sy: number; node?: string | null } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const pts = [...ptrs.current.values()];
    drag.current = {
      moved: pts.length > 1, start: view, sx: e.clientX, sy: e.clientY,
      node: (e.target as Element).closest?.('[data-node]')?.getAttribute('data-node'),
      pinch: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : undefined,
    };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId) || !drag.current) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = drag.current;
    const pts = [...ptrs.current.values()];
    if (pts.length === 2 && d.pinch) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      setView(clampView({ ...d.start, z: d.start.z * (dist / d.pinch) }));
      return;
    }
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    const k = (fit / view.z);
    setView(clampView({ ...d.start, x: d.start.x - dx * k, y: d.start.y - dy * k }));
  };
  const onUp = (e: React.PointerEvent) => {
    ptrs.current.delete(e.pointerId);
    const d = drag.current;
    if (ptrs.current.size === 0) {
      if (d && !d.moved) {
        if (d.node) { setSel(d.node); sfx('tap'); } else setSel(null);
      }
      drag.current = null;
    } else if (d) {
      const rest = [...ptrs.current.values()][0];
      drag.current = { moved: true, start: view, sx: rest.x, sy: rest.y };
    }
  };
  const onWheel = (e: React.WheelEvent) => setView((v) => clampView({ ...v, z: v.z * (e.deltaY < 0 ? 1.12 : 0.89) }));

  const go = (v: View) => { setView(v); setSel(null); };
  const zoom = (f: number) => setView((v) => clampView({ ...v, z: v.z * f }));

  const learn = (id: string) => {
    sfx('unlock'); sfx('levelUp');
    navigator.vibrate?.(40);
    setJust(id);
    onChange(unlockSkill(career, id));
  };
  // Gedrückt halten zum Lernen: verhindert Fehlklicks und fühlt sich nach „Aufladen“ an.
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);
  const stopSound = useRef<() => void>(() => {});
  const holdMs = motionReduced() ? 400 : 750;
  const startHold = (id: string) => {
    if (timer.current) return;
    setHolding(true);
    stopSound.current = playCharge(holdMs);
    timer.current = window.setTimeout(() => { timer.current = null; setHolding(false); learn(id); }, holdMs);
  };
  const cancelHold = () => {
    if (!timer.current) return;
    clearTimeout(timer.current);
    timer.current = null;
    stopSound.current();
    setHolding(false);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { if (!just) return; const t = setTimeout(() => setJust(null), 900); return () => clearTimeout(t); }, [just]);

  const gates = Object.fromEntries(DIRS.map((d) => [d, milestone(career, d)])) as Record<Dir, ReturnType<typeof milestone>>;
  const stateOf = (n: Skill) => owned.has(n.id) ? 'own' : lockReason(career, n.id) === null ? 'can' : reachable(p, n.id) ? 'near' : 'far';
  const pos = (id: string) => (id === CORE ? { x: 0, y: 0 } : { x: nodeById(id)!.x * U, y: nodeById(id)!.y * U });
  const selNode = sel ? nodeById(sel) : null;

  return (
    <div className="su" role="dialog" aria-modal="true" aria-label="Skill-Universum">
      <header className="su-top">
        <button className="su-back" onClick={onClose} aria-label="Zurück"><Icon name="arrow" size={20} /></button>
        <div className="su-title">
          <b>{type.name} · Level {info.level}</b>
          <span className="su-xp" aria-label={`${info.into} von ${info.need} EP`}><i style={{ width: `${Math.round((info.into / info.need) * 100)}%` }} /></span>
        </div>
        <span className={`su-fp ${free > 0 ? 'has' : ''}`}><b>{free}</b> FP</span>
        <button className="su-menu" onClick={() => { setMenu(true); setSel(null); }} aria-label="Boni, Baupläne, Umbau"><Icon name="tactics" size={20} /></button>
      </header>

      <nav className="su-dirs" aria-label="Richtungen">
        <button className={view === ALL ? 'on' : ''} onClick={() => go(ALL)}><Icon name="globe" size={16} /> Alle</button>
        {DIRS.map((d) => (
          <button key={d} className={`d-${d}`} onClick={() => go(dirCenter(d, size.w, size.h))}>
            <Icon name={DIR_ICON[d]} size={16} /> {DIR_NAME[d]}
          </button>
        ))}
      </nav>

      <div className="su-stage" ref={box} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}>
        <svg className="su-svg" viewBox={`${view.x - vw / 2} ${view.y - vh / 2} ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="su-core-glow"><stop offset="0" stopColor="#5fb0ff" stopOpacity=".55" /><stop offset="1" stopColor="#5fb0ff" stopOpacity="0" /></radialGradient>
          </defs>
          {/* Ringe und Meilenstein-Grenzen */}
          {[1.15, 2.2, 3.25, 4.3].map((r) => <circle key={r} className="su-orbit" r={r * U} />)}
          {DIRS.map((d) => {
            if (gates[d].open) return null;
            const a0 = ({ g: -90, c: 0, a: 90, m: 180 }[d] - 42) * (Math.PI / 180);
            const a1 = a0 + (84 * Math.PI) / 180;
            const r = 2.72 * U;
            return <path key={d} className="su-gate" d={`M ${Math.cos(a0) * r} ${Math.sin(a0) * r} A ${r} ${r} 0 0 1 ${Math.cos(a1) * r} ${Math.sin(a1) * r}`} />;
          })}
          {/* Verbindungen */}
          {EDGES.map(([a, b]) => {
            const A = pos(a); const B = pos(b);
            const lit = (a === CORE || owned.has(a)) && owned.has(b);
            const open = !lit && ((a === CORE || owned.has(a)) || owned.has(b));
            return <line key={a + b} className={`su-edge ${lit ? 'lit' : open ? 'open' : ''} ${just === b || just === a ? 'flow' : ''}`} x1={A.x} y1={A.y} x2={B.x} y2={B.y} />;
          })}
          {/* Mitte: dein Spielertyp */}
          <circle r={46} fill="url(#su-core-glow)" />
          <g className="su-core">
            <polygon points={hex(24)} />
            <g transform="translate(-12 -12)"><Icon name={type.icon} size={24} /></g>
          </g>
          {/* Knoten */}
          {NODES.map((n) => {
            const st = stateOf(n);
            const r = NODE_R[n.kind];
            const s = ICON_S[n.kind];
            const locked = n.ring >= 3 && !gates[n.dir].open && st === 'near';
            return (
              <g key={n.id} data-node={n.id} transform={`translate(${n.x * U} ${n.y * U})`}
                className={`su-node k-${n.kind} d-${n.dir} ${st} ${sel === n.id ? 'sel' : ''} ${just === n.id ? 'pop' : ''} ${n.kind === 'style' && styles.includes(n.id) ? 'worn' : ''}`}>
                <circle className="su-hit" r={Math.max(r + 9, 22)} />
                {n.kind === 'style' ? <polygon className="su-shape" points={hex(r)} />
                  : n.kind === 'ult' ? <polygon className="su-shape" points={star(r)} />
                  : n.kind === 'star' ? <polygon className="su-shape" points={`0,${-r} ${r},0 0,${r} ${-r},0`} />
                  : <circle className="su-shape" r={r} />}
                <g transform={`translate(${-s / 2} ${-s / 2})`}><Icon name={locked ? 'lock' : n.icon} size={s} /></g>
              </g>
            );
          })}
        </svg>

        <div className="su-zoom" onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={() => zoom(1.3)} aria-label="Hineinzoomen"><Icon name="plus" size={18} /></button>
          <button onClick={() => zoom(1 / 1.3)} aria-label="Herauszoomen"><span aria-hidden="true">−</span></button>
        </div>

        {selNode && (
          <NodeSheet career={career} n={selNode} holding={holding} holdMs={holdMs}
            onHold={() => startHold(selNode.id)} onCancel={cancelHold}
            onToggle={() => { sfx('tap'); onChange(toggleStyle(career, selNode.id)); }}
            onClose={() => setSel(null)} />
        )}
      </div>

      <footer className="su-slots" aria-label="Spielstile">
        <small>Spielstile {styles.length}/{STYLE_SLOTS}</small>
        <div>
          {Array.from({ length: STYLE_SLOTS }, (_, i) => {
            const n = styles[i] ? nodeById(styles[i]) : null;
            return n ? (
              <button key={i} className={`su-slot d-${n.dir}`} onClick={() => { setSel(n.id); setView((v) => clampView({ x: n.x * U, y: n.y * U, z: Math.max(v.z, 1.6) })); }}>
                <Icon name={n.icon} size={16} /><span>{n.name}</span>
              </button>
            ) : <span key={i} className="su-slot empty">frei</span>;
          })}
        </div>
      </footer>

      {menu && <Menu career={career} onChange={onChange} onClose={() => setMenu(false)} />}
    </div>
  );
}

const hex = (r: number) => Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 3) * i - Math.PI / 2; return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`; }).join(' ');
const star = (r: number) => Array.from({ length: 16 }, (_, i) => { const a = (Math.PI / 8) * i - Math.PI / 2; const rr = i % 2 ? r * 0.72 : r; return `${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`; }).join(' ');

/** Fenster von unten: was der Knoten macht, was er kostet, Lernen per Gedrückthalten. */
function NodeSheet({ career, n, holding, holdMs, onHold, onCancel, onToggle, onClose }: {
  career: Career; n: Skill; holding: boolean; holdMs: number; onHold: () => void; onCancel: () => void; onToggle: () => void; onClose: () => void;
}) {
  const p = career.player;
  const has = p.skills!.unlocked.includes(n.id);
  const reason = lockReason(career, n.id);
  const cost = costOf(p, n);
  const extra = cost - n.cost;
  const worn = (p.skills!.styles ?? []).includes(n.id);
  const full = (p.skills!.styles ?? []).length >= STYLE_SLOTS;
  const m = masteryProgress(n, usesOf(p, n.id));
  return (
    <section className={`su-sheet d-${n.dir} k-${n.kind}`} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} aria-live="polite">
      <button className="su-sheet-x" onClick={onClose} aria-label="Schließen"><Icon name="close" size={18} /></button>
      <div className="su-sheet-head">
        <span className="su-sheet-ic"><Icon name={n.icon} size={22} /></span>
        <div>
          <small>{KIND_NAME[n.kind]} · {DIR_NAME[n.dir]} · Ring {n.ring === 4 ? 'außen' : n.ring}</small>
          <b>{n.name}</b>
        </div>
      </div>
      <p className="su-sheet-text">{n.text}</p>
      {has && (
        <p className={`su-mast m${m.level}`}>
          <b>{MASTERY_NAME[m.level]}</b>
          {m.next !== null ? <><span><i style={{ width: `${Math.min(100, (usesOf(p, n.id) / m.next) * 100)}%` }} /></span><small>{usesOf(p, n.id)}/{m.next} {m.word}</small></> : <small>Maximale Stufe</small>}
        </p>
      )}
      {has ? (
        n.kind === 'style' ? (
          <button className={`btn ${worn ? 'secondary' : 'primary'} big su-act`} disabled={!worn && full} onClick={onToggle}>
            {worn ? 'Ablegen' : full ? `Alle ${STYLE_SLOTS} Plätze belegt` : 'Ausrüsten'}
          </button>
        ) : <p className="su-owned"><Icon name="check" size={16} /> Gelernt – wirkt in jedem Spiel</p>
      ) : reason === null ? (
        <button className={`btn primary big su-act su-hold ${holding ? 'holding' : ''}`} style={{ ['--hold' as string]: `${holdMs}ms` }}
          onPointerDown={(e) => { if (e.button === 0) onHold(); }} onPointerUp={onCancel} onPointerLeave={onCancel} onPointerCancel={onCancel}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); onHold(); } }}
          onKeyUp={(e) => { if (e.key === 'Enter' || e.key === ' ') onCancel(); }} onContextMenu={(e) => e.preventDefault()}>
          <span>{holding ? 'Halten …' : `Gedrückt halten · ${cost} FP`}</span>
        </button>
      ) : (
        <p className="su-lock"><Icon name="lock" size={16} /> {reason}</p>
      )}
      {!has && extra > 0 && <small className="su-extra">+{extra} FP Aufschlag: weit weg von deiner Heimat-Richtung</small>}
    </section>
  );
}

/** Boni, Baupläne und kostenloser Umbau (einmal pro Saison). */
function Menu({ career, onChange, onClose }: { career: Career; onChange: (c: Career) => void; onClose: () => void }) {
  const sk = career.player.skills!;
  const bonuses = bonusSummary(skillMods(career.player));
  const respec = canRespec(career);
  return (
    <div className="su-menu-sheet" role="dialog" aria-label="Boni und Baupläne">
      <div className="su-menu-inner">
        <header><b>Dein Universum</b><button className="su-sheet-x" onClick={onClose} aria-label="Schließen"><Icon name="close" size={18} /></button></header>
        <h3>Aktive Boni</h3>
        {bonuses.length ? <div className="su-bonus">{bonuses.map((b) => <span key={b}>{b}</span>)}</div> : <small className="muted">Noch keine – lerne deinen ersten Knoten.</small>}
        <h3>Meilensteine</h3>
        <ul className="su-miles">
          {DIRS.map((d) => { const m = milestone(career, d); return (
            <li key={d} className={`d-${d} ${m.open ? 'open' : ''}`}><Icon name={m.open ? 'check' : 'lock'} size={16} /><span>{DIR_NAME[d]}</span><small>{m.open ? 'offen' : `${m.have}/${m.need} ${m.word}`}</small></li>
          ); })}
        </ul>
        <h3>Baupläne</h3>
        <div className="su-plans">
          {Array.from({ length: PLAN_SLOTS }, (_, i) => {
            const plan = sk.plans?.[i];
            return (
              <div key={i} className="su-plan">
                <b>{plan?.name ?? `Bauplan ${i + 1}`}</b>
                <small>{plan ? `${plan.nodes.length} Knoten · ${plan.styles.length} Spielstile` : 'leer'}</small>
                <span>
                  <button className="btn secondary small" disabled={!sk.unlocked.length} onClick={() => onChange(savePlan(career, i, plan?.name ?? `Bauplan ${i + 1}`))}>Speichern</button>
                  <button className="btn primary small" disabled={!plan || !respec}
                    onClick={() => window.confirm('Bauplan laden? Dein Baum wird geleert und nach dem Plan neu gebaut – das ist dein Umbau für diese Saison.') && onChange(applyPlan(career, i))}>Laden</button>
                </span>
              </div>
            );
          })}
        </div>
        <button className="btn secondary su-respec" disabled={!respec || !sk.unlocked.length}
          onClick={() => window.confirm('Alle Punkte zurückholen und neu verteilen? Kostenlos, aber nur einmal pro Saison.') && (onChange(respecSkills(career)), onClose())}>
          {respec ? 'Alle Punkte neu verteilen (1× pro Saison)' : 'Umbau in dieser Saison schon genutzt'}
        </button>
      </div>
    </div>
  );
}
