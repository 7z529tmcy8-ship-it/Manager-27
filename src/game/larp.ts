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

export interface LookItem {
  id: string;
  slot: LookSlot;
  name: string;
  text: string;
  /** Preis in Coins. */
  price: number;
  aura: number;
  /** Replika: billig, gleiche Aura – aber riskant. `of` = das Original. */
  fake?: boolean;
  of?: string;
}

const ORIGINALS: LookItem[] = [
  { id: 'gg-superstar', slot: 'schuhe', name: 'Golden Goose Super-Star', text: 'Neu gekauft, sieht aus wie zehn Jahre getragen. Genau so muss das.', price: 6_000, aura: 12 },
  { id: 'loafer', slot: 'schuhe', name: 'Wildleder-Loafer, ohne Socken', text: 'Knöchel zeigen, auch im November.', price: 4_000, aura: 9 },
  { id: 'white-sneaker', slot: 'schuhe', name: 'Weiße Ledersneaker', text: 'Schlicht, sauber, immer geputzt.', price: 1_500, aura: 5 },
  { id: 'cashmere', slot: 'oberteil', name: 'Kaschmir-Pulli über den Schultern', text: 'Nicht anziehen – nur umlegen.', price: 9_000, aura: 14 },
  { id: 'quarter-zip', slot: 'oberteil', name: 'Quarter-Zip in Navy', text: 'Uniform an der Alster.', price: 3_000, aura: 7 },
  { id: 'linen', slot: 'oberteil', name: 'Leinenhemd, zwei Knöpfe offen', text: 'Riecht nach Sylt, auch in Hamburg.', price: 2_000, aura: 6 },
  { id: 'vintage-watch', slot: 'accessoire', name: 'Vintage-Uhr „vom Opa“', text: 'Angeblich geerbt. Angeblich.', price: 25_000, aura: 20 },
  { id: 'pearls', slot: 'accessoire', name: 'Perlenkette', text: 'Eine Reihe, dezent. Mehr wäre zu viel.', price: 2_500, aura: 7 },
  { id: 'sunglasses', slot: 'accessoire', name: 'Sonnenbrille im Haar', text: 'Auch bei Regen.', price: 1_200, aura: 4 },
  { id: 'barbour', slot: 'extra', name: 'Gewachste Wachsjacke', text: 'Für den Hafen-Spaziergang mit dem Labrador.', price: 7_000, aura: 11 },
  { id: 'tennis-bag', slot: 'extra', name: 'Tennistasche (nie benutzt)', text: 'Der Schläger ist noch in der Folie.', price: 3_500, aura: 8 },
  { id: 'tote', slot: 'extra', name: 'Stoffbeutel vom Wochenmarkt', text: 'Bio-Gemüse, Sauerteigbrot, Haltung.', price: 400, aura: 3 },
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
  const risk = clamp(fakes * 12 + over * 1.5, 0, 85);
  return Math.round(larpOf(c).honest ? risk / 2 : risk);
}

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
  if (!c.larp || !wornItems(c).length) { if (c.larp) c.larp.honest = false; return null; }
  const l = c.larp;
  const risk = larpRisk(c);
  l.honest = false;
  if (roll * 100 >= risk) {
    l.note = `Look sitzt: Aura ${auraOf(c)} – keiner hat was gemerkt.`;
    return null;
  }
  const fakes = wornItems(c).filter((i) => i.fake);
  const g = gramOf(c);
  const lost = Math.round(g.followers * 0.25);
  g.followers -= lost;
  c.gram = g;
  // Replikas sind weg.
  l.owned = l.owned.filter((id) => !itemById(id)?.fake);
  for (const s of SLOTS) if (itemById(l.worn[s.id])?.fake) delete l.worn[s.id];
  l.exposed += 1;
  let kitGone = '';
  if (fakes.length && c.kit) {
    kitGone = ' Dein Ausrüster beendet die Zusammenarbeit.';
    c.kit = null;
  }
  const why = fakes.length ? `${fakes.map((f) => f.name.replace(' (Replika)', '')).join(' und ')} waren Replikas` : 'zu viel Flex für deinen Stand';
  l.note = `Larp entlarvt: ${why}. −${lost.toLocaleString('de-DE')} Follower.${kitGone}`;
  postInbox(c, { kind: 'event', title: 'Larp entlarvt!', text: `Ein Fan-Account hat aufgedeckt: ${why}. Du verlierst ${lost.toLocaleString('de-DE')} Follower.${kitGone}`, action: 'career' });
  return l.note;
}
