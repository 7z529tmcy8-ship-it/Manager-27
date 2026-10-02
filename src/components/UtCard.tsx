import { flagOf } from '../data/flags';
import type { CollectCard } from '../game/club';
import { cardAttrs } from '../game/squad';

const VARIANT_LABEL: Partial<Record<CollectCard['variant'], string>> = {
  'gold-rare': 'Elite',
  icon: 'Ikone',
  talent: 'Was wäre wenn',
  tots: 'Team der Saison',
  potm: 'Spieler des Monats',
  record: 'Rekordjäger',
  champion: 'Titelheld',
};
const OUTFIELD = ['TEM', 'SCH', 'PAS', 'DRI', 'DEF', 'PHY'];
const KEEPER = ['HEC', 'HAN', 'ABS', 'REF', 'TEM', 'STE'];

// Kurzname für kleine Karten: Nachname, mit Namenszusätzen (El Mala, van Dijk, ter Stegen) und ein paar Spitznamen.
const SHORT: Record<string, string> = { 'Vinícius Júnior': 'Vini Jr.', 'Ronaldo Nazário': 'R9', 'Cristiano Ronaldo': 'Ronaldo', 'Trent Alexander-Arnold': 'Trent', 'Son Heung-min': 'Son', 'Kim Min-jae': 'Kim', 'Lee Kang-in': 'Lee' };
const PARTICLES = new Set(['el', 'van', 'von', 'de', 'der', 'den', 'dos', 'da', 'di', 'ter', 'le', 'la']);
export function shortName(name: string): string {
  if (SHORT[name]) return SHORT[name];
  const w = name.split(/\s+/);
  if (w.length >= 3 && PARTICLES.has(w[w.length - 2].toLowerCase())) return w.slice(-2).join(' ');
  if (w.length >= 3 && PARTICLES.has(w[w.length - 3].toLowerCase())) return w.slice(-3).join(' ');
  return w[w.length - 1];
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(-2).join('').toUpperCase();

interface Props {
  card: CollectCard;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  count?: number;
  shine?: boolean;
  /** Chemie 0–3 als Punkte (in der Aufstellung). */
  chem?: number;
  onClick?: () => void;
}

/** Sammelkarte im eigenen Design: Form, Farben und Aufbau frei gestaltet. */
export default function UtCard({ card, size = 'md', count, shine, chem, onClick }: Props) {
  const lastName = shortName(card.name);
  const attrs = cardAttrs(card);
  const labels = card.position === 'TW' ? KEEPER : OUTFIELD;
  const big = size === 'md' || size === 'lg';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={`ucard v-${card.variant} ${size} ${shine ? 'shine' : ''} ${onClick ? 'clickable' : ''}`}
      aria-label={`${card.name}, ${card.ovr} ${card.position}`}
      onClick={onClick}
    >
      <div className="ucard-top">
        <span className="ucard-ovr">{card.ovr}</span>
        <span className="ucard-pos">{card.position}</span>
        <span className="ucard-flag" aria-hidden="true">{flagOf(card.nation)}</span>
      </div>
      {big && <div className="ucard-art" aria-hidden="true"><span>{initials(card.name)}</span></div>}
      {big && <div className="ucard-badge">{VARIANT_LABEL[card.variant] ?? (card.variant === 'gold' ? 'Gold' : 'Silber')}</div>}
      <div className="ucard-name">{big ? card.name : lastName}</div>
      {big && (
        <div className="ucard-attrs">
          {attrs.map((v, i) => (
            <span key={labels[i]}><b>{v}</b> {labels[i]}</span>
          ))}
        </div>
      )}
      {big && <div className="ucard-club">{card.label ?? card.club}</div>}
      {chem !== undefined && (
        <span className="ucard-chem" aria-label={`Chemie ${chem} von 3`}>
          {[0, 1, 2].map((k) => <i key={k} className={k < chem ? 'on' : ''} />)}
        </span>
      )}
      {count !== undefined && count > 1 && <span className="ucard-count">×{count}</span>}
    </Tag>
  );
}
