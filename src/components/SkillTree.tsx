import { Glyph } from './Icon';
import {
  ARCHETYPES,
  GENERAL_SKILLS,
  archetypesFor,
  chooseArchetype,
  bonusSummary,
  freePoints,
  getArchetype,
  isMaster,
  MASTER_OTHER,
  MASTER_TOP,
  levelInfo,
  lockReason,
  MASTERY_NAME,
  masteryProgress,
  rankOf,
  usesOf,
  respecSkills,
  skillMods,
  unlockSkill,
  type Skill,
} from '../game/skills';
import { useEffect, useRef, useState } from 'react';
import { play, playCharge } from '../sound';
import { motionReduced } from '../settings';
import type { Career } from '../game/types';

/** Auswahl des Spielertyps (einmal pro Karriere). */
export function ArchetypePicker({ career, onChange }: { career: Career; onChange: (c: Career) => void }) {
  const fitting = archetypesFor(career.player.position);
  const list = fitting.length ? fitting : ARCHETYPES;
  return (
    <section className="cs-window">
      <h2>Wähle deinen Spielertyp</h2>
      <p className="cs-sub">
        Dein Typ bestimmt deinen Fähigkeitenbaum. Erfahrungspunkte aus Spielen, Toren, Vorlagen, guten Noten und Titeln
        bringen Level – jedes Level einen Fähigkeitspunkt.
      </p>
      <div className={`cs-choices n${Math.min(3, list.length)} sk-types`}>
        {list.map((a) => (
          <button key={a.id} className="cs-choice k-transfer" onClick={() => onChange(chooseArchetype(career, a.id))}>
            <small><Glyph e={a.icon} /> Spielertyp</small>
            <strong>{a.name}</strong>
            <span className="cs-choice-meta">{a.text}</span>
            <span className="cs-choice-league">{a.skills.filter((s) => s.tier === 6).slice(0, 2).map((s) => s.name).join(' · ')}</span>
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
    <button className={`sk-chip ${free > 0 ? 'has-points' : ''}`} onClick={onOpen} aria-label="Fähigkeitenbaum öffnen">
      <span><Glyph e={getArchetype(sk.archetype).icon} /> Lv {info.level}</span>
      <i style={{ width: `${Math.round((info.into / info.need) * 100)}%` }} aria-hidden="true" />
      {free > 0 && <b>{free} FP</b>}
    </button>
  );
}

/** Fähigkeitenbaum als Overlay: zwei Äste, Meisterstück, allgemeine Fähigkeiten mit Stufen. */
export default function SkillTree({ career, onChange, onClose }: { career: Career; onChange: (c: Career) => void; onClose: () => void }) {
  const p = career.player;
  const sk = p.skills!;
  const type = getArchetype(sk.archetype);
  const info = levelInfo(sk.xp);
  const free = freePoints(p);
  const bonuses = bonusSummary(skillMods(p));
  const [just, setJust] = useState<string | null>(null);
  const [tab, setTab] = useState<'a' | 'b'>('a');
  // Gedrückt halten zum Lernen: verhindert Fehlklicks und fühlt sich nach „Aufladen“ an.
  const [holding, setHolding] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const stopSound = useRef<() => void>(() => {});
  const holdMs = motionReduced() ? 450 : 900;

  const learn = (id: string) => {
    setJust(id);
    play('unlock');
    play('levelUp');
    navigator.vibrate?.(40);
    onChange(unlockSkill(career, id));
  };
  const startHold = (id: string) => {
    if (timer.current) return;
    setHolding(id);
    stopSound.current = playCharge(holdMs);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setHolding(null);
      learn(id);
    }, holdMs);
  };
  const cancelHold = () => {
    if (!timer.current) return;
    clearTimeout(timer.current);
    timer.current = null;
    stopSound.current();
    setHolding(null);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const node = (s: Skill, wide = false) => {
    const rank = rankOf(p, s.id);
    const max = s.maxRank ?? 1;
    const owned = rank >= max;
    const reason = lockReason(p, s.id);
    const can = reason === null;
    return (
      <button
        key={s.id}
        className={`sk-skill ${owned ? 'owned' : can ? 'can' : rank > 0 ? 'partial' : 'locked'} ${isMaster(s) ? 'master' : s.tier >= 4 && !s.maxRank ? 'elite' : ''} ${wide ? 'wide' : ''} ${just === s.id ? 'just' : ''} ${holding === s.id ? 'holding' : ''}`}
        style={{ ['--hold' as string]: `${holdMs}ms` }}
        disabled={!can}
        onPointerDown={(e) => { if (can && e.button === 0) startHold(s.id); }}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onKeyDown={(e) => { if (can && (e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); startHold(s.id); } }}
        onKeyUp={(e) => { if (e.key === 'Enter' || e.key === ' ') cancelHold(); }}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={`${s.name}: ${s.text}. ${owned ? 'Freigeschaltet' : reason ?? `Kostet ${s.cost} Punkte`}`}
      >
        <span className="sk-icon" aria-hidden="true"><Glyph e={s.icon} /></span>
        <strong>{s.name}</strong>
        <small>{s.text}</small>
        {max > 1 && (
          <span className="sk-pips" aria-hidden="true">
            {Array.from({ length: max }, (_, i) => <i key={i} className={i < rank ? 'on' : ''} />)}
          </span>
        )}
        {can && <span className="sk-hold" aria-hidden="true" />}
        {owned && !s.maxRank && (() => {
          const m = masteryProgress(s, usesOf(p, s.id));
          return (
            <span className={`sk-mast m${m.level}`}>
              <b>{MASTERY_NAME[m.level]}</b>
              {m.next !== null
                ? <><span className="sk-mast-bar"><i style={{ width: `${Math.min(100, (usesOf(p, s.id) / m.next) * 100)}%` }} /></span><small>{usesOf(p, s.id)}/{m.next} {m.word}</small></>
                : <small>Maximale Stufe</small>}
            </span>
          );
        })()}
        <em>{owned ? 'aktiv' : can ? (holding === s.id ? 'Halten …' : `${s.cost} FP · gedrückt halten`) : reason === `${s.cost} FP nötig` ? `${s.cost} FP` : `${reason}`}</em>
      </button>
    );
  };

  const tierTag = (t: number) => `Stufe ${t}${t === 6 ? ' · Legende' : t === 5 ? ' · Weltklasse' : t === 4 ? ' · Elite' : ''}`;
  const step = (s: Skill, prev?: Skill) => (
    <div key={s.id} className={`sk-step ${prev ? 'linked' : ''} ${prev && sk.unlocked.includes(prev.id) ? 'lit' : ''}`}>
      <span className={`sk-tier-tag ${s.tier >= 4 ? 'elite' : ''}`}>{tierTag(s.tier)}</span>
      {node(s)}
    </div>
  );
  /** Ein Ast: Stamm (Stufe 1–2), dann Gabelung in zwei Zweige (Stufe 3–6) – man wählt einen. */
  const branch = (b: 'a' | 'b') => {
    const trunk = type.skills.filter((s) => s.branch === b && !s.twig).sort((x, y) => x.tier - y.tier);
    const twig = (n: 1 | 2) => type.skills.filter((s) => s.branch === b && s.twig === n).sort((x, y) => x.tier - y.tier);
    const chosen = ([1, 2] as const).find((n) => twig(n).some((s) => sk.unlocked.includes(s.id)));
    const names = type.twigs?.[b === 'a' ? 0 : 1] ?? ['Zweig 1', 'Zweig 2'];
    return (
      <div className="sk-branch">
        {trunk.map((s, i) => step(s, trunk[i - 1]))}
        <div className="sk-fork-head" aria-hidden="true"><i /><span>Gabelung – wähle einen Zweig</span><i /></div>
        <div className="sk-fork">
          {([1, 2] as const).map((n) => {
            const list = twig(n);
            return (
              <div key={n} className={`sk-twig ${chosen === n ? 'chosen' : chosen ? 'closed' : ''}`}>
                <h4>{names[n - 1]}{chosen === n && <small> · gewählt</small>}</h4>
                {list.map((s, i) => step(s, i === 0 ? trunk[trunk.length - 1] : list[i - 1]))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  const master = type.skills.find(isMaster);
  const reset = () => {
    if (window.confirm('Alle Fähigkeitspunkte zurückholen und neu verteilen? Das geht nur einmal pro Karriere.')) onChange(respecSkills(career));
  };

  return (
    <div className="overlay sk-overlay" role="dialog" aria-modal="true" aria-label="Fähigkeitenbaum">
      <div className="overlay-inner">
        <header className="overlay-head"><button className="nav-back" onClick={onClose}>‹ Zurück</button></header>
        <div className="sk-head">
          <span className="sk-big" aria-hidden="true"><Glyph e={type.icon} /></span>
          <div>
            <h2>{type.name}</h2>
            <p className="cs-sub">{type.text}</p>
          </div>
        </div>
        <div className="sk-level">
          <span>Level {info.level}</span>
          <div className="coach-bar"><i className="high" style={{ width: `${Math.round((info.into / info.need) * 100)}%` }} /></div>
          <span>{info.into}/{info.need} EP</span>
        </div>
        <p className={`sk-points ${free > 0 ? 'has' : ''}`}>
          {free > 0 ? `${free} Fähigkeitspunkt${free === 1 ? '' : 'e'} frei` : 'Keine freien Punkte – spiel weiter, um EP zu sammeln.'}
        </p>

        <div className="sk-bonus">
          <strong>Aktive Boni</strong>
          {bonuses.length ? (
            <div className="sk-bonus-list">{bonuses.map((b) => <span key={b}>{b}</span>)}</div>
          ) : (
            <small>Noch keine – lerne deine erste Fähigkeit.</small>
          )}
        </div>

        <div className="segmented sk-tabs" role="tablist" aria-label="Äste">
          {(['a', 'b'] as const).map((b) => (
            <button key={b} role="tab" aria-selected={tab === b} className={tab === b ? 'active' : ''} onClick={() => setTab(b)}>
              {type.branches[b === 'a' ? 0 : 1]}
            </button>
          ))}
        </div>
        <p className="sk-mast-hint">Gelernte Fähigkeiten werden durch Benutzen stärker: Bronze → Silber (+20 %) → Gold (+40 %) → Prisma (+70 %).</p>
        <div className="sk-tree one" key={tab}>{branch(tab)}</div>
        {master && (
          <section className="sk-master-wrap">
            <h3>Meisterstück</h3>
            <p className="sk-master-hint">Nur für die Größten: ein Zweig komplett bis Stufe {MASTER_TOP}, im anderen Ast mindestens Stufe {MASTER_OTHER}.</p>
            {node(master, true)}
          </section>
        )}

        <section className="sk-tier">
          <h3>Allgemein <small>· mehrere Stufen möglich</small></h3>
          <div className="sk-grid three">{GENERAL_SKILLS.map((s) => node(s))}</div>
        </section>

        {sk.unlocked.length > 0 && !sk.respecUsed && (
          <button className="btn secondary small sk-reset" onClick={reset}>↺ Punkte neu verteilen (einmal pro Karriere)</button>
        )}
      </div>
    </div>
  );
}
