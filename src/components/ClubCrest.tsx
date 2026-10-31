/** Vereinswappen. Bisher hat nur Meteor Rush eins (Bild der Entwickler); andere Vereine zeigen nichts. */
const CRESTS: Record<string, string> = {
  'meteor-rush': '/clubs/meteor-rush.webp',
};

export const hasCrest = (clubId: string) => clubId in CRESTS;

export default function ClubCrest({ id, size = 22, className = '' }: { id: string; size?: number; className?: string }) {
  const src = CRESTS[id];
  if (!src) return null;
  return <img className={`club-crest ${className}`} src={src} alt="" aria-hidden="true" width={size} height={size} loading="lazy" decoding="async" />;
}
