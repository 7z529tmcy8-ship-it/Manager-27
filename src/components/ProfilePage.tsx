import { useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import { STAGES, duelStateOf, ownRating } from '../game/careerDuels';
import { EMBLEMS, NAME_MAX, PROFILE_COLORS, profileOf, setProfile } from '../game/profile';
import { teamCards } from '../game/squad';
import { listCareers } from '../game/storage';
import Icon from './Icon';

/** Wappen-Abzeichen: Sechseck in der Profilfarbe mit Linien-Icon (keine Gesichter). */
export function Emblem({ emblem, color, size = 44 }: { emblem: string; color: string; size?: number }) {
  return (
    <span className="emblem" style={{ '--pc': color, width: size, height: size } as React.CSSProperties} aria-hidden="true">
      <Icon name={emblem} size={Math.round(size * 0.5)} />
    </span>
  );
}

/** Profil: Name, Wappen, Farbe – und deine Bilanz aus Karrieren, Team und Duellen. */
export default function ProfilePage() {
  const club = useClub();
  const p = profileOf(club);
  const [name, setName] = useState(p.name);
  const careers = listCareers();
  const d = duelStateOf(club);
  const best = careers.reduce((m, c) => Math.max(m, ...c.history.map((r) => r.ovrEnd), c.player.ovr), 0);
  const seasons = careers.reduce((a, c) => a + c.history.length, 0);
  const goals = careers.reduce((a, c) => a + c.history.reduce((g, r) => g + r.goals, 0), 0);
  const titles = careers.reduce((a, c) => a + c.history.reduce((t, r) => t + r.trophies.length, 0), 0);
  const save = (patch: Parameters<typeof setProfile>[1]) => setClubState(setProfile(getClubState(), patch));

  const stats: [string, string | number][] = [
    ['Karrieren', careers.length],
    ['Saisons', seasons],
    ['Beste Wertung', best || '–'],
    ['Tore', goals.toLocaleString('de-DE')],
    ['Titel', titles],
    ['Spieler im Team', teamCards(club, 'career').length],
    ['Team-Wertung', ownRating(club) || '–'],
    ['Duelle S/U/N', `${d.w}/${d.d}/${d.l}`],
    ['Höchste Duell-Stufe', STAGES[d.best - 1].name],
    ['Finale gewonnen', d.titles ?? 0],
  ];

  return (
    <main className="hub pp">
      <h1 className="ch-title">Profil</h1>
      <section className="pp-card" style={{ '--pc': p.color } as React.CSSProperties}>
        <Emblem emblem={p.emblem} color={p.color} size={72} />
        <div className="pp-name">
          <input value={name} maxLength={NAME_MAX} aria-label="Name" onChange={(e) => setName(e.target.value)}
            onBlur={() => { const n = name.trim() || p.name; setName(n); save({ name: n }); }} />
          <small>Tippe auf den Namen zum Ändern</small>
        </div>
      </section>

      <h2 className="ch-h">Wappen</h2>
      <div className="pp-pick" role="radiogroup" aria-label="Wappen">
        {EMBLEMS.map((e) => (
          <button key={e} role="radio" aria-checked={p.emblem === e} className={p.emblem === e ? 'on' : ''} onClick={() => save({ emblem: e })}>
            <Emblem emblem={e} color={p.color} size={40} />
          </button>
        ))}
      </div>
      <h2 className="ch-h">Farbe</h2>
      <div className="pp-pick colors" role="radiogroup" aria-label="Farbe">
        {PROFILE_COLORS.map((c) => (
          <button key={c} role="radio" aria-checked={p.color === c} aria-label={c} className={p.color === c ? 'on' : ''} style={{ background: c }} onClick={() => save({ color: c })}>
            {p.color === c && <Icon name="check" size={18} />}
          </button>
        ))}
      </div>

      <h2 className="ch-h">Bilanz</h2>
      <ul className="pp-stats">
        {stats.map(([k, v]) => <li key={k}><small>{k}</small><b>{v}</b></li>)}
      </ul>
    </main>
  );
}
