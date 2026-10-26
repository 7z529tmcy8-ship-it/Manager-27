import { useClub } from '../clubStore';
import { unclaimedLevels, unclaimedProLevels } from '../game/pass';
import Icon, { type IconName } from './Icon';

export type NavTarget = 'home' | 'career' | 'team' | 'duels' | 'store' | 'collection' | 'pass';

const ITEMS: { id: NavTarget; icon: IconName; label: string }[] = [
  { id: 'home', icon: 'home', label: 'Start' },
  { id: 'career', icon: 'ball', label: 'Karriere' },
  { id: 'team', icon: 'tactics', label: 'Team' },
  { id: 'duels', icon: 'duel', label: 'Duelle' },
  { id: 'store', icon: 'pack', label: 'Store' },
  { id: 'collection', icon: 'cards', label: 'Sammlung' },
  { id: 'pass', icon: 'star', label: 'Pass' },
];

/** Feste Navigation: am Handy unten, im Querformat und auf großen Bildschirmen links. */
export default function NavBar({ active, onGo }: { active: NavTarget | null; onGo: (t: NavTarget) => void }) {
  const club = useClub();
  const freePacks = (club.welcomeClaimed ? 0 : 1) + (club.megaXxlClaimed ? 0 : 1) + (club.megaSuperClaimed ? 0 : 1);
  const passOpen = unclaimedLevels(club).length + unclaimedProLevels(club).length;
  const badge: Partial<Record<NavTarget, number>> = { store: freePacks + (club.storedPacks?.length ?? 0), pass: passOpen };
  return (
    <nav className="navbar" aria-label="Hauptnavigation">
      <img className="navbar-logo" src="/logo.webp" alt="" width="640" height="640" aria-hidden="true" />
      {ITEMS.map((it) => (
        <button key={it.id} className={`navbar-item ${active === it.id ? 'on' : ''}`} aria-current={active === it.id ? 'page' : undefined} onClick={() => onGo(it.id)}>
          <span className="navbar-ic"><Icon name={it.icon} size={22} />{badge[it.id] ? <b className="navbar-badge">{badge[it.id]}</b> : null}</span>
          <span className="navbar-label">{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
