import { useState } from 'react';
import Icon, { type IconName } from './Icon';

export type NavTarget = 'career' | 'team' | 'shop' | 'duels' | 'casino' | 'profile';

const ITEMS: { id: NavTarget; icon: IconName; label: string }[] = [
  { id: 'career', icon: 'ball', label: 'Karriere' },
  { id: 'team', icon: 'tactics', label: 'Team' },
  { id: 'shop', icon: 'pack', label: 'Shop' },
  { id: 'duels', icon: 'duel', label: 'Duelle' },
  { id: 'casino', icon: 'dice', label: 'Casino' },
  { id: 'profile', icon: 'shield', label: 'Profil' },
];

/** Feste Navigation mit den vier Bereichen: am Handy unten, im Querformat und auf großen Bildschirmen links. */
export default function NavBar({ active, onGo, dots }: { active: NavTarget | null; onGo: (t: NavTarget) => void; dots?: Partial<Record<NavTarget, boolean>> }) {
  const [tap, setTap] = useState<NavTarget | null>(null);
  // Sofortige Rückmeldung – auch wenn man schon im Bereich ist (dann geht es nach oben).
  const press = (id: NavTarget) => {
    setTap(id);
    setTimeout(() => setTap(null), 220);
    if (id === active) window.scrollTo({ top: 0, behavior: 'smooth' });
    else onGo(id);
  };
  return (
    <nav className="navbar nav4 nav6" aria-label="Hauptnavigation">
      <img className="navbar-logo" src="/logo.webp" alt="" width="640" height="640" aria-hidden="true" />
      {ITEMS.map((it) => (
        <button key={it.id} className={`navbar-item ${active === it.id ? 'on' : ''} ${tap === it.id ? 'tap' : ''}`} aria-current={active === it.id ? 'page' : undefined} onClick={() => press(it.id)}>
          <span className="navbar-ic"><Icon name={it.icon} size={22} />{dots?.[it.id] && <i className="navbar-dot" aria-label="Neu" />}</span>
          <span className="navbar-label">{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
