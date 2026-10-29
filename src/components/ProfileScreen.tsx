import { useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import { EMBLEMS, NAME_MAX, PROFILE_COLORS, bestCards, managerLevel, managerXp, profileOf, profileStats, setProfile, showcaseCard } from '../game/profile';
import type { Career } from '../game/types';
import Icon from './Icon';
import UtCard from './UtCard';

/** Wappen-Abzeichen: Sechseck in der Profilfarbe mit Linien-Icon (keine Gesichter). */
export function Emblem({ emblem, color, size = 44 }: { emblem: string; color: string; size?: number }) {
  return (
    <span className="emblem" style={{ '--pc': color, width: size, height: size } as React.CSSProperties} aria-hidden="true">
      <Icon name={emblem} size={Math.round(size * 0.5)} />
    </span>
  );
}

/** Profil wie in Brawl Stars: Wappen, Name, Level, Trophäen, Statistiken, Lieblingskarte. */
export default function ProfileScreen({ careers, onClose }: { careers: Career[]; onClose: () => void }) {
  const club = useClub();
  const p = profileOf(club);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(p.name);
  const [pickCard, setPickCard] = useState(false);
  const lvl = managerLevel(managerXp(club, careers));
  const card = showcaseCard(club);
  const save = (patch: Parameters<typeof setProfile>[1]) => setClubState(setProfile(getClubState(), patch));

  return (
    <div className="overlay profile" role="dialog" aria-modal="true" aria-label="Profil">
      <div className="overlay-inner">
        <header className="overlay-head"><button className="nav-back" onClick={onClose}>‹ Zurück</button></header>

        <section className="pf-hero" style={{ '--pc': p.color } as React.CSSProperties}>
          <Emblem emblem={p.emblem} color={p.color} size={92} />
          <div className="pf-id">
            {editing ? (
              <form className="pf-name-edit" onSubmit={(e) => { e.preventDefault(); save({ name }); setEditing(false); }}>
                <input value={name} maxLength={NAME_MAX} autoFocus onChange={(e) => setName(e.target.value)} aria-label="Name" />
                <button className="btn primary small" type="submit">OK</button>
              </form>
            ) : (
              <button className="pf-name" onClick={() => { setName(p.name); setEditing(true); }} aria-label="Name ändern">
                {p.name}<Icon name="pencil" size={16} />
              </button>
            )}
            <span className="pf-level"><b>Level {lvl.level}</b><span className="pf-level-bar"><i style={{ width: `${(lvl.into / lvl.need) * 100}%` }} /></span><small>{lvl.into}/{lvl.need} XP</small></span>
          </div>
          <div className="pf-trophies"><Icon name="trophy" size={22} /><strong>{(club.trophies ?? 0).toLocaleString('de-DE')}</strong><small>Höchstwert {(club.trophyBest ?? 0).toLocaleString('de-DE')}</small></div>
        </section>

        <section className="pf-look" aria-label="Wappen und Farbe">
          <div className="pf-emblems" role="radiogroup" aria-label="Wappen">
            {EMBLEMS.map((e) => (
              <button key={e} role="radio" aria-checked={p.emblem === e} className={`pf-pick ${p.emblem === e ? 'on' : ''}`} onClick={() => save({ emblem: e })} aria-label={`Wappen ${e}`}>
                <Emblem emblem={e} color={p.color} size={40} />
              </button>
            ))}
          </div>
          <div className="pf-colors" role="radiogroup" aria-label="Farbe">
            {PROFILE_COLORS.map((c) => (
              <button key={c} role="radio" aria-checked={p.color === c} className={`pf-color ${p.color === c ? 'on' : ''}`} style={{ '--pc': c } as React.CSSProperties} onClick={() => save({ color: c })} aria-label={`Farbe ${c}`} />
            ))}
          </div>
        </section>

        <section className="pf-show">
          <div className="pf-show-head"><h2 className="hub-section">Lieblingskarte</h2>{card && <button className="btn secondary small" onClick={() => setPickCard(!pickCard)}>{pickCard ? 'Fertig' : 'Ändern'}</button>}</div>
          {card ? (
            pickCard ? (
              <div className="pf-cards">
                {bestCards(club, 12).map((c) => (
                  <button key={c.id} className={`pf-card ${card.id === c.id ? 'on' : ''}`} onClick={() => { save({ showcase: c.id }); setPickCard(false); }} aria-label={`${c.name} als Lieblingskarte`}>
                    <UtCard card={c} size="sm" />
                  </button>
                ))}
              </div>
            ) : <div className="pf-show-card"><UtCard card={card} size="md" shine /></div>
          ) : <p className="hint">Noch keine Karten – öffne dein erstes Pack im Shop.</p>}
        </section>

        <h2 className="hub-section">Statistiken</h2>
        <ul className="pf-stats">
          {profileStats(club, careers).map((s) => (
            <li key={s.label}><Icon name={s.icon} size={18} /><small>{s.label}</small><strong>{s.value}</strong></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
