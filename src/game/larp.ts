import { postInbox } from './inbox';
import { gramOf } from './kickgram';
import { clamp } from './random';
import type { Career } from './types';

// ---------- LARP-Modus: Look & Larp-Zähler ----------
// Dein Spieler macht auf „Old Money aus Eppendorf“. Kleidung gibt Aura – Aura bringt mehr Kickgram-Follower und Likes.
// Wer mehr Flex zeigt, als zu seinem Stand passt, oder Replikas trägt, riskiert am Saisonende, aufzufliegen
// („Larp entlarvt“): Follower brechen ein, Replikas sind weg, bei Replikas kündigt der Ausrüster.
// Marken stehen nur als Text da – keine Logos.

export type LookSlot = 'schuhe' | 'oberteil' | 'accessoire' | 'extra';
export const SLOTS: { id: LookSlot; name: string }[] = [
  { id: 'schuhe', name: 'Schuhe' },
  { id: 'oberteil', name: 'Oberteil' },
  { id: 'accessoire', name: 'Accessoire' },
  { id: 'extra', name: 'Extra' },
];

export type LookIcon = 'sneaker' | 'loafer' | 'boat' | 'sweater' | 'zip' | 'shirt' | 'polo' | 'watch' | 'pearls' | 'shades' | 'ring' | 'jacket' | 'racket' | 'tote' | 'dog';

export interface LookItem {
  id: string;
  slot: LookSlot;
  name: string;
  text: string;
  /** Preis in Coins. */
  price: number;
  aura: number;
  /** Linien-Icon (LarpGlyph). */
  icon: LookIcon;
  /** Replika: billig, gleiche Aura – aber riskant. `of` = das Original. */
  fake?: boolean;
  of?: string;
}

const ORIGINALS: LookItem[] = [
  { id: 'gg-superstar', slot: 'schuhe', name: 'Golden Goose Super-Star', text: 'Neu gekauft, sieht aus wie zehn Jahre getragen. Genau so muss das.', price: 6_000, aura: 12, icon: 'sneaker' },
  { id: 'loafer', slot: 'schuhe', name: 'Wildleder-Loafer, ohne Socken', text: 'Knöchel zeigen, auch im November.', price: 4_000, aura: 9, icon: 'loafer' },
  { id: 'white-sneaker', slot: 'schuhe', name: 'Weiße Ledersneaker', text: 'Schlicht, sauber, immer geputzt.', price: 1_500, aura: 5, icon: 'sneaker' },
  { id: 'cashmere', slot: 'oberteil', name: 'Kaschmir-Pulli über den Schultern', text: 'Nicht anziehen – nur umlegen.', price: 9_000, aura: 14, icon: 'sweater' },
  { id: 'quarter-zip', slot: 'oberteil', name: 'Quarter-Zip in Navy', text: 'Uniform an der Alster.', price: 3_000, aura: 7, icon: 'zip' },
  { id: 'linen', slot: 'oberteil', name: 'Leinenhemd, zwei Knöpfe offen', text: 'Riecht nach Sylt, auch in Hamburg.', price: 2_000, aura: 6, icon: 'shirt' },
  { id: 'vintage-watch', slot: 'accessoire', name: 'Vintage-Uhr „vom Opa“', text: 'Angeblich geerbt. Angeblich.', price: 25_000, aura: 20, icon: 'watch' },
  { id: 'pearls', slot: 'accessoire', name: 'Perlenkette', text: 'Eine Reihe, dezent. Mehr wäre zu viel.', price: 2_500, aura: 7, icon: 'pearls' },
  { id: 'sunglasses', slot: 'accessoire', name: 'Sonnenbrille im Haar', text: 'Auch bei Regen.', price: 1_200, aura: 4, icon: 'shades' },
  { id: 'barbour', slot: 'extra', name: 'Gewachste Wachsjacke', text: 'Für den Hafen-Spaziergang mit dem Labrador.', price: 7_000, aura: 11, icon: 'jacket' },
  { id: 'tennis-bag', slot: 'extra', name: 'Tennistasche (nie benutzt)', text: 'Der Schläger ist noch in der Folie.', price: 3_500, aura: 8, icon: 'racket' },
  { id: 'boat-shoes', slot: 'schuhe', name: 'Segelschuhe', text: 'Ein Boot hast du nicht. Die Schuhe schon.', price: 2_200, aura: 7, icon: 'boat' },
  { id: 'polo-collar', slot: 'oberteil', name: 'Polo mit hochgeklapptem Kragen', text: 'Kragen hoch, Kinn hoch.', price: 1_800, aura: 6, icon: 'polo' },
  { id: 'signet', slot: 'accessoire', name: 'Siegelring mit Familienwappen', text: 'Das Wappen hast du im Internet gefunden.', price: 6_500, aura: 12, icon: 'ring' },
  { id: 'retriever', slot: 'extra', name: 'Golden Retriever an der Leine', text: 'Gehört eigentlich dem Nachbarn.', price: 12_000, aura: 16, icon: 'dog' },
  { id: 'tote', slot: 'extra', name: 'Stoffbeutel vom Wochenmarkt', text: 'Bio-Gemüse, Sauerteigbrot, Haltung.', price: 400, aura: 3, icon: 'tote' },
];

/** Replikas der vier teuersten Teile: 10 % vom Preis, gleiche Aura. */
const FAKES: LookItem[] = ['gg-superstar', 'cashmere', 'vintage-watch', 'barbour'].map((of) => {
  const o = ORIGINALS.find((x) => x.id === of)!;
  return { ...o, id: `${of}-replika`, name: `${o.name} (Replika)`, text: 'Sieht von Weitem echt aus. Von Weitem.', price: Math.round(o.price / 10), fake: true, of };
});

export const ITEMS: LookItem[] = [...ORIGINALS, ...FAKES];
export const itemById = (id: string | undefined) => ITEMS.find((i) => i.id === id);

export interface LarpState {
  owned: string[];
  worn: Partial<Record<LookSlot, string>>;
  /** Wie oft schon aufgeflogen. */
  exposed: number;
  /** Ehrlicher Post in dieser Saison: halbiert das Risiko beim nächsten Saisonende. */
  honest?: boolean;
  /** Letzte Meldung zum Saisonende. */
  note?: string;
  /** Verdacht durch Flex-Aktionen in dieser Saison (Prozentpunkte, kommt aufs Risiko). */
  heat?: number;
  /** Pause, in der zuletzt geflext wurde (eine Flex-Aktion pro Pause). */
  flexKey?: string;
  /** Welche Flex-Aktion in dieser Pause gepostet wurde. */
  flexId?: string;
  /** Ergebnis des letzten Saisonendes – wird einmal groß gezeigt („Fit-Check des Jahres“). */
  reveal?: LarpReveal | null;
}

export interface LarpReveal {
  exposed: boolean;
  aura: number;
  risk: number;
  /** Follower vorher/nachher (für das Runterzählen). */
  before: number;
  after: number;
  /** Verlorene Replikas (Namen). */
  lost: string[];
  kitGone: boolean;
  why?: string;
}

export const larpOf = (c: Career): LarpState => c.larp ?? { owned: [], worn: {}, exposed: 0 };
export const wornItems = (c: Career): LookItem[] => SLOTS.map((s) => itemById(larpOf(c).worn[s.id])).filter((x): x is LookItem => !!x);
export const auraOf = (c: Career) => wornItems(c).reduce((s, i) => s + i.aura, 0);

/** Wie viel Flex zu deinem Stand passt: Gesamtwertung und Bekanntheit. */
export function statusCap(c: Career): number {
  const fame = Math.log10(Math.max(10, gramOf(c).followers)) * 6; // 1.000 Follower ≈ 18, 1 Mio. ≈ 36
  return Math.round(clamp((c.player.ovr - 55) * 0.8 + fame, 5, 70));
}

/** Larp-Zähler 0–100: Wahrscheinlichkeit (in %), am Saisonende aufzufliegen. */
export function larpRisk(c: Career): number {
  const worn = wornItems(c);
  const fakes = worn.filter((i) => i.fake).length;
  const over = Math.max(0, auraOf(c) - statusCap(c));
  const risk = clamp(fakes * 12 + over * 1.5 + (larpOf(c).heat ?? 0), 0, 85);
  return Math.round(larpOf(c).honest ? risk / 2 : risk);
}

// ---------- Flex-Aktionen ----------
// Einmal pro Pause: ein Auftritt für Kickgram. Bringt sofort Follower – Larp-Aktionen bringen aber Verdacht (Heat),
// der bis zum Saisonende aufs Risiko kommt. Echte (teure) Aktionen sind sicher.
export interface FlexAction {
  id: string;
  name: string;
  text: string;
  price: number;
  /** Follower-Gewinn in % der aktuellen Follower. */
  gain: number;
  heat: number;
  icon: 'brunch' | 'car' | 'island' | 'yacht' | 'mallet' | 'jet';
}
export const FLEX: FlexAction[] = [
  { id: 'brunch', name: 'Alster-Brunch posten', text: 'Avocado, Hafermilch, Blick aufs Wasser.', price: 300, gain: 3, heat: 0, icon: 'brunch' },
  { id: 'sylt', name: 'Wochenende auf Sylt', text: 'Echt gebucht, echt bezahlt. Fischbrötchen inklusive.', price: 8_000, gain: 6, heat: 0, icon: 'island' },
  { id: 'porsche', name: 'Geliehenen 911er posten', text: '„Mein Neuer.“ Der Vermieter liest mit.', price: 0, gain: 8, heat: 15, icon: 'car' },
  { id: 'polo', name: 'Polo-Turnier, VIP-Bändchen geliehen', text: 'Champagner in der Hand, Bändchen vom Kumpel.', price: 500, gain: 6, heat: 10, icon: 'mallet' },
  { id: 'yacht', name: 'Yacht in Monaco (Greenscreen)', text: 'Gefilmt im Hobbykeller. Das Licht verrät dich fast.', price: 1_000, gain: 12, heat: 25, icon: 'yacht' },
  { id: 'jet', name: 'Privatjet-Story', text: 'Foto im Simulator am Flughafen. Kein Mensch merkt das. Oder?', price: 1_500, gain: 15, heat: 30, icon: 'jet' },
];
export const flexKeyOf = (c: Career) => `${c.year}-${c.phase}`;
export const flexUsed = (c: Career) => larpOf(c).flexKey === flexKeyOf(c);
export const canFlexNow = (c: Career) => (c.phase === 'winter' || c.phase === 'window') && !flexUsed(c);

/** Flex-Aktion ausführen: Coins, sofort Follower, Heat aufs Risiko. */
export function doFlex(prev: Career, id: string, coins: number): { career: Career; cost: number; gained: number } | null {
  const f = FLEX.find((x) => x.id === id);
  if (!f || !canFlexNow(prev) || coins < f.price) return null;
  const g = { ...gramOf(prev) };
  const gained = Math.max(5, Math.round(g.followers * (f.gain / 100) * auraBoost(prev)));
  g.followers += gained;
  const career = { ...withLarp(prev, (l) => ({ ...l, heat: (l.heat ?? 0) + f.heat, flexKey: flexKeyOf(prev), flexId: f.id })), gram: g };
  return { career, cost: f.price, gained };
}

/** Den großen Fit-Check-Moment weglegen. */
export const dismissReveal = (prev: Career): Career => (prev.larp?.reveal ? { ...prev, larp: { ...prev.larp, reveal: null } } : prev);

const withLarp = (prev: Career, f: (l: LarpState) => LarpState): Career => ({ ...prev, larp: f(structuredClone(larpOf(prev))) });

export function buyItem(prev: Career, id: string, coins: number): { career: Career; cost: number } | null {
  const item = itemById(id);
  if (!item || larpOf(prev).owned.includes(id) || coins < item.price) return null;
  const career = withLarp(prev, (l) => ({ ...l, owned: [...l.owned, id], worn: { ...l.worn, [item.slot]: id } }));
  return { career, cost: item.price };
}

export function wearItem(prev: Career, id: string): Career {
  const item = itemById(id);
  if (!item || !larpOf(prev).owned.includes(id)) return prev;
  return withLarp(prev, (l) => ({ ...l, worn: { ...l.worn, [item.slot]: id } }));
}

export function takeOff(prev: Career, slot: LookSlot): Career {
  return withLarp(prev, (l) => { const worn = { ...l.worn }; delete worn[slot]; return { ...l, worn }; });
}

/** Verkaufen: Originale bringen die Hälfte zurück, Replikas nichts. */
export const sellValue = (item: LookItem) => (item.fake ? 0 : Math.round(item.price / 2));
export function sellItem(prev: Career, id: string): { career: Career; coins: number } | null {
  const item = itemById(id);
  if (!item || !larpOf(prev).owned.includes(id)) return null;
  const career = withLarp(prev, (l) => {
    const worn = { ...l.worn };
    if (worn[item.slot] === id) delete worn[item.slot];
    return { ...l, owned: l.owned.filter((x) => x !== id), worn };
  });
  return { career, coins: sellValue(item) };
}

/** Ehrlicher Post („Ist alles nur geleast“): kostet sofort 5 % Follower, halbiert das Risiko bis Saisonende. */
export function honestPost(prev: Career): Career {
  if (larpOf(prev).honest) return prev;
  const g = { ...gramOf(prev) };
  g.followers = Math.round(g.followers * 0.95);
  return { ...withLarp(prev, (l) => ({ ...l, honest: true })), gram: g };
}

/** Aura-Bonus für Kickgram: Follower-Wachstum und Likes. */
export const auraBoost = (c: Career) => 1 + auraOf(c) / 100;

/**
 * Saisonende (nur Spielerjahre): Würfeln, ob der Larp auffliegt. Verändert den Spielstand direkt.
 * `roll` 0–1 (für Tests).
 */
export function larpYear(c: Career, roll = Math.random()): string | null {
  if (!c.larp) return null;
  const l = c.larp;
  if (!wornItems(c).length && !(l.heat ?? 0)) { l.honest = false; return null; }
  const risk = larpRisk(c);
  const aura = auraOf(c);
  const g = gramOf(c);
  const before = g.followers;
  l.honest = false;
  l.heat = 0;
  if (roll * 100 >= risk) {
    l.note = `Fit-Check bestanden: Aura ${aura} – keiner hat was gemerkt.`;
    l.reveal = { exposed: false, aura, risk, before, after: before, lost: [], kitGone: false };
    return risk > 0 ? l.note : null;
  }
  const fakes = wornItems(c).filter((i) => i.fake);
  const lostF = Math.round(g.followers * 0.25);
  g.followers -= lostF;
  c.gram = g;
  // Replikas sind weg.
  l.owned = l.owned.filter((id) => !itemById(id)?.fake);
  for (const s of SLOTS) if (itemById(l.worn[s.id])?.fake) delete l.worn[s.id];
  l.exposed += 1;
  let kitGone = false;
  if (fakes.length && c.kit) { kitGone = true; c.kit = null; }
  const why = fakes.length ? `${fakes.map((f) => f.name.replace(' (Replika)', '')).join(' und ')} ${fakes.length === 1 ? 'war eine Replika' : 'waren Replikas'}` : 'zu viel Flex für deinen Stand';
  l.note = `Larp entlarvt: ${why}. −${lostF.toLocaleString('de-DE')} Follower.${kitGone ? ' Dein Ausrüster beendet die Zusammenarbeit.' : ''}`;
  l.reveal = { exposed: true, aura, risk, before, after: g.followers, lost: fakes.map((f) => f.name.replace(' (Replika)', '')), kitGone, why };
  postInbox(c, { kind: 'event', title: 'Larp entlarvt!', text: `Ein Fan-Account hat aufgedeckt: ${why}. Du verlierst ${lostF.toLocaleString('de-DE')} Follower.${kitGone ? ' Dein Ausrüster beendet die Zusammenarbeit.' : ''}`, action: 'career' });
  return l.note;
}
