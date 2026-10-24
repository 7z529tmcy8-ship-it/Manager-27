import { useEffect, useRef } from 'react';
import { getSettings, motionReduced } from '../settings';
import { onTilt } from '../tilt';
import AvatarFace from './AvatarFace';
import Icon, { type IconName } from './Icon';
import { flagOf } from '../data/flags';
import type { CollectCard } from '../game/club';
import { cardAttrs } from '../game/squad';

const VARIANT_LABEL: Partial<Record<CollectCard['variant'], string>> = {
  'gold-rare': 'Elite',
  icon: 'Ikone',
  talent: 'Was wäre wenn',
  cult: 'Kult-Held',
  moment: 'Legendärer Moment',
  present: 'Geschenk',
  halloween: 'Halloween',
  debut: 'Debüt',
  comeback: 'Comeback',
  flashback: 'Rückblende',
  unvergessen: 'Unvergessen',
  pass: 'Saison-Pass',
  gig: 'GIG',
  winter: 'Winter-Wunder',
  silvester: 'Silvester',
  gala: 'Gala',
  totw: 'Team der Woche',
  ballondor: 'Ballon d’Or',
  poty: 'Spieler des Jahres',
  topscorer: 'Torjäger',
  goldenboy: 'Golden Boy',
  ucl: 'Königsklasse',
  worldcup: 'Weltmeister',
  tots: 'Team der Saison',
  potm: 'Spieler des Monats',
  record: 'Rekordjäger',
  champion: 'Titelheld',
};
/** Sonderkarten bekommen ein Emblem, Holo-Schimmer und ein eigenes Muster (siehe styles.css). */
const EMBLEM: Partial<Record<CollectCard['variant'], IconName>> = {
  icon: 'crown', cult: 'bolt', talent: 'spark', debut: 'ticket', comeback: 'rise', flashback: 'rewind', unvergessen: 'clock', pass: 'star', gig: 'dice', winter: 'snow', silvester: 'spark', moment: 'film', present: 'gift', halloween: 'pumpkin', gala: 'medal',
  tots: 'star', potm: 'calendar', record: 'chart', champion: 'trophy',
  ballondor: 'medal', worldcup: 'globe', ucl: 'star', poty: 'mic', topscorer: 'boot', goldenboy: 'spark', totw: 'stadium',
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
  const tiltRef = useTilt(size === 'lg' || size === 'md');
  const lastName = shortName(card.name);
  const attrs = cardAttrs(card);
  const labels = card.position === 'TW' ? KEEPER : OUTFIELD;
  const big = size === 'md' || size === 'lg';
  const Tag = onClick ? 'button' : 'div';
  const emblem = EMBLEM[card.variant];
  return (
    <Tag
      ref={tiltRef as never}
      className={`ucard v-${card.variant} ${size} ${size === 'lg' || size === 'md' ? 'tilt' : ''} ${emblem ? 'special' : ''} ${card.boost ? 'evo' : ''} ${shine ? 'shine' : ''} ${onClick ? 'clickable' : ''}`}
      aria-label={`${card.name}, ${card.ovr} ${card.position}`}
      onClick={onClick}
    >
      {emblem && <span className="ucard-foil" aria-hidden="true" />}
      {(size === 'lg' || size === 'md') && <span className="ucard-glare" aria-hidden="true" />}
      {!!card.boost && size !== 'xs' && <span className="ucard-evo" aria-label={`Evolution +${card.boost}`}>{Array.from({ length: 5 }, (_, i) => <i key={i} className={i < card.boost! ? 'on' : ''} />)}</span>}
      {emblem && size !== 'xs' && <span className="ucard-emblem" aria-hidden="true"><Icon name={emblem} /></span>}
      <div className="ucard-top">
        <span className="ucard-ovr">{card.ovr}</span>
        <span className="ucard-pos">{card.position}</span>
        <span className="ucard-flag" aria-hidden="true">{flagOf(card.nation)}</span>
      </div>
      {big && (
        <div className={`ucard-art ${card.avatar ? 'face' : ''}`} aria-hidden="true">
          {card.avatar ? <AvatarFace avatar={card.avatar} size={size === 'lg' ? 104 : 72} /> : <Jersey text={initials(card.name)} />}
        </div>
      )}
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
      {(card.boost ?? 0) > 0 && <span className="ucard-boost" title={`Evolution: +${card.boost}`}>EVO +{card.boost}</span>}
    </Tag>
  );
}

/** Trikot-Symbol statt eines Porträts (keine Gesichter auf Karten). */
function Jersey({ text }: { text: string }) {
  return (
    <svg className="ucard-jersey" viewBox="0 0 100 100" aria-hidden="true">
      <path className="j-body" d="M34 14 L22 18 L8 32 L18 46 L26 40 L26 88 L74 88 L74 40 L82 46 L92 32 L78 18 L66 14 Q58 24 50 24 Q42 24 34 14Z" />
      <path className="j-trim" d="M34 14 Q42 26 50 26 Q58 26 66 14" />
      <text x="50" y="67" textAnchor="middle">{text}</text>
    </svg>
  );
}

/**
 * 3D-Neigung: Maus oder Finger über der Karte (und die Handy-Lage) kippen sie leicht, der Glanz wandert mit.
 * Schreibt nur CSS-Variablen direkt ans Element – kein Neu-Rendern bei jeder Bewegung.
 */
function useTilt(enabled: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || motionReduced() || getSettings().tilt === false) return;
    let frame = 0;
    let pointer = false;
    const apply = (x: number, y: number, active: boolean) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--tx', x.toFixed(3));
        el.style.setProperty('--ty', y.toFixed(3));
        el.style.setProperty('--ta', Math.min(1, Math.hypot(x, y) * 2).toFixed(3));
        el.classList.toggle('tilting', active);
      });
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer = true;
      apply((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5, true);
    };
    const leave = () => { pointer = false; apply(0, 0, false); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('pointercancel', leave);
    const off = onTilt((t) => { if (!pointer) apply(t.x, t.y, true); });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('pointercancel', leave);
      off();
    };
  }, [enabled]);
  return ref;
}
