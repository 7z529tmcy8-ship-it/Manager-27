import type { CollectCard } from '../game/club';

const VARIANT_LABEL: Partial<Record<CollectCard['variant'], string>> = {
  'gold-rare': 'Elite',
  icon: 'Ikone',
  talent: 'Was wäre wenn',
  tots: 'Team der Saison',
  potm: 'Spieler des Monats',
  record: 'Rekordjäger',
  champion: 'Titelheld',
};

const short = (nation: string) => nation.slice(0, 3).toUpperCase();

/** Sammelkarte im eigenen Design (Form und Farben frei gestaltet). */
export default function UtCard({ card, size = 'md', count, shine }: { card: CollectCard; size?: 'sm' | 'md' | 'lg'; count?: number; shine?: boolean }) {
  const lastName = card.name.split(' ').slice(-1)[0];
  return (
    <div className={`ucard v-${card.variant} ${size} ${shine ? 'shine' : ''}`} aria-label={`${card.name}, ${card.ovr} ${card.position}`}>
      <div className="ucard-top">
        <span className="ucard-ovr">{card.ovr}</span>
        <span className="ucard-pos">{card.position}</span>
        <span className="ucard-nat">{short(card.nation)}</span>
      </div>
      <div className="ucard-badge">{VARIANT_LABEL[card.variant] ?? (card.variant === 'gold' ? 'Gold' : 'Silber')}</div>
      <div className="ucard-name">{size === 'sm' ? lastName : card.name}</div>
      <div className="ucard-club">{card.label ?? card.club}</div>
      {count !== undefined && count > 1 && <span className="ucard-count">×{count}</span>}
    </div>
  );
}
