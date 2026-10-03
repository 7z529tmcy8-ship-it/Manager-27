import {
  ARCHETYPES,
  GENERAL_SKILLS,
  archetypesFor,
  canUnlock,
  chooseArchetype,
  freePoints,
  getArchetype,
  levelInfo,
  unlockSkill,
  type Skill,
} from '../game/skills';
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
            <span className="cs-choice-league">{a.skills.filter((s) => s.tier === 3).map((s) => s.name).join(' · ')}</span>
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

/** Fähigkeitenbaum als Overlay. */
export default function SkillTree({ career, onChange, onClose }: { career: Career; onChange: (c: Career) => void; onClose: () => void }) {
  const p = career.player;
  const sk = p.skills!;
  const type = getArchetype(sk.archetype);
  const info = levelInfo(sk.xp);
  const free = freePoints(p);

  const card = (s: Skill) => {
    const owned = sk.unlocked.includes(s.id);
    const can = canUnlock(p, s.id);
    return (
      <button
        key={s.id}
        className={`sk-skill ${owned ? 'owned' : can ? 'can' : 'locked'}`}
        disabled={!can}
        onClick={() => onChange(unlockSkill(career, s.id))}
        aria-label={`${s.name}: ${s.text}${owned ? ', freigeschaltet' : `, kostet ${s.cost} Punkte`}`}
      >
        <span className="sk-icon" aria-hidden="true">{s.icon}</span>
        <strong>{s.name}</strong>
        <small>{s.text}</small>
        <em>{owned ? '✓ aktiv' : `${s.cost} FP`}</em>
      </button>
    );
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
        <p className="sk-points">{free > 0 ? `🎁 ${free} Fähigkeitspunkt${free === 1 ? '' : 'e'} frei` : 'Keine freien Punkte – spiel weiter, um EP zu sammeln.'}</p>

        {[1, 2, 3].map((tier) => (
          <section key={tier} className="sk-tier">
            <h3>Stufe {tier}{tier > 1 ? <small> · braucht eine Fähigkeit aus Stufe {tier - 1}</small> : null}</h3>
            <div className="sk-grid">{type.skills.filter((s) => s.tier === tier).map(card)}</div>
          </section>
        ))}
        <section className="sk-tier">
          <h3>Allgemein</h3>
          <div className="sk-grid three">{GENERAL_SKILLS.map(card)}</div>
        </section>
      </div>
    </div>
  );
}
