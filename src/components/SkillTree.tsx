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
  rankOf,
  respecSkills,
  skillMods,
  unlockSkill,
  type Skill,
} from '../game/skills';
import { useState } from 'react';
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
            <small>{a.icon} Spielertyp</small>
            <strong>{a.name}</strong>
            <span className="cs-choice-meta">{a.text}</span>
            <span className="cs-choice-league">{a.skills.filter((s) => s.tier === 5).map((s) => s.name).join(' · ')}</span>
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
      <span>{getArchetype(sk.archetype).icon} Lv {info.level}</span>
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

  const learn = (id: string) => {
    setJust(id);
    onChange(unlockSkill(career, id));
  };

  const node = (s: Skill, wide = false) => {
    const rank = rankOf(p, s.id);
    const max = s.maxRank ?? 1;
    const owned = rank >= max;
    const reason = lockReason(p, s.id);
    const can = reason === null;
    return (
      <button
        key={s.id}
        className={`sk-skill ${owned ? 'owned' : can ? 'can' : rank > 0 ? 'partial' : 'locked'} ${isMaster(s) ? 'master' : s.tier >= 4 && !s.maxRank ? 'elite' : ''} ${wide ? 'wide' : ''} ${just === s.id ? 'just' : ''}`}
        disabled={!can}
        onClick={() => learn(s.id)}
        aria-label={`${s.name}: ${s.text}. ${owned ? 'Freigeschaltet' : reason ?? `Kostet ${s.cost} Punkte`}`}
      >
        <span className="sk-icon" aria-hidden="true">{s.icon}</span>
        <strong>{s.name}</strong>
        <small>{s.text}</small>
        {max > 1 && (
          <span className="sk-pips" aria-hidden="true">
            {Array.from({ length: max }, (_, i) => <i key={i} className={i < rank ? 'on' : ''} />)}
          </span>
        )}
        <em>{owned ? '✓ aktiv' : can ? `${s.cost} FP · lernen` : reason === `${s.cost} FP nötig` ? `${s.cost} FP` : `🔒 ${reason}`}</em>
      </button>
    );
  };

  const branch = (b: 'a' | 'b') => {
    const list = type.skills.filter((s) => s.branch === b).sort((x, y) => x.tier - y.tier);
    return (
      <div className="sk-branch">
        <h3>{type.branches[b === 'a' ? 0 : 1]}</h3>
        {list.map((s, i) => (
          <div key={s.id} className={`sk-step ${i > 0 ? 'linked' : ''} ${i > 0 && sk.unlocked.includes(list[i - 1].id) ? 'lit' : ''}`}>
            <span className={`sk-tier-tag ${s.tier >= 4 ? 'elite' : ''}`}>Stufe {s.tier}{s.tier === 5 ? ' · Weltklasse' : s.tier === 4 ? ' · Elite' : ''}</span>
            {node(s)}
          </div>
        ))}
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
          <span className="sk-big" aria-hidden="true">{type.icon}</span>
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
          {free > 0 ? `🎁 ${free} Fähigkeitspunkt${free === 1 ? '' : 'e'} frei` : 'Keine freien Punkte – spiel weiter, um EP zu sammeln.'}
        </p>

        <div className="sk-bonus">
          <strong>Aktive Boni</strong>
          {bonuses.length ? (
            <div className="sk-bonus-list">{bonuses.map((b) => <span key={b}>{b}</span>)}</div>
          ) : (
            <small>Noch keine – lerne deine erste Fähigkeit.</small>
          )}
        </div>

        <div className="sk-tree">
          {branch('a')}
          {branch('b')}
        </div>
        {master && (
          <section className="sk-master-wrap">
            <h3>👑 Meisterstück</h3>
            <p className="sk-master-hint">Nur für die Größten: ein Ast komplett bis Stufe {MASTER_TOP}, der andere mindestens bis Stufe {MASTER_OTHER}.</p>
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
