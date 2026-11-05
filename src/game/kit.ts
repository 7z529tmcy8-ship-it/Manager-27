import { postInbox } from './inbox';
import { chance, clamp, randInt, shuffle } from './random';
import type { Career } from './types';

// ---------- Ausrüster-Verträge ----------
// Schon als Jugendspieler melden sich Marken. Je besser (und bekannter auf Kickgram) du wirst, desto größer die Marke.
// Bezahlt wird in Coins am Saisonende: Grundgehalt pro Jahr plus Bonus pro Tor und pro Titel.

export type BrandId = 'winnerz' | 'freedom' | 'ami' | 'helmut';

export interface Brand {
  id: BrandId;
  name: string;
  /** Kurzbeschreibung im Angebot */
  tag: string;
  perk: string;
  /** Farbverlauf der Karte */
  c1: string;
  c2: string;
  ink: string;
}

export const BRANDS: Record<BrandId, Brand> = {
  winnerz: { id: 'winnerz', name: 'Winnerz', tag: 'Hungrige Talente – setzt früh auf junge Spieler', perk: 'Hoher Bonus für jedes Tor', c1: '#ff3b3b', c2: '#7a0010', ink: '#fff' },
  freedom: { id: 'freedom', name: 'Freedom Paris', tag: 'Streetwear aus Paris – liebt große Reichweite', perk: 'Follower wachsen 50 % schneller · Werbeposts zahlen doppelt', c1: '#1a1a1a', c2: '#3a3a3a', ink: '#f2f2f2' },
  ami: { id: 'ami', name: 'Ami', tag: 'Elegant und beständig – für Stammspieler', perk: 'Bonus für jeden Titel', c1: '#f4ece0', c2: '#c9b89c', ink: '#3a2a14' },
  helmut: { id: 'helmut', name: 'Helmut Lang', tag: 'Premium – nur für die Besten', perk: 'Riesiges Grundgehalt · +1 Glamour pro Jahr', c1: '#e9e9e9', c2: '#8a8a8a', ink: '#111' },
};
export const BRAND_ORDER: BrandId[] = ['winnerz', 'freedom', 'ami', 'helmut'];

export interface KitDeal {
  brand: BrandId;
  /** Coins pro Saison */
  fee: number;
  years: number;
  goalBonus: number;
  titleBonus: number;
}
export interface KitContract extends KitDeal {
  /** Verbleibende Saisons inkl. der laufenden */
  left: number;
  /** Saisonjahr der Unterschrift */
  since: number;
  /** Bisher verdient */
  earned: number;
}
export interface KitOffer extends KitDeal { id: string; year: number; youth?: boolean }

export const followersOf = (c: Career) => c.gram?.followers ?? 0;

/** Welche Marken sich gerade für dich interessieren. */
export function interested(c: Career): BrandId[] {
  const p = c.player;
  const f = followersOf(c);
  const out: BrandId[] = [];
  if ((p.age <= 21 && (p.potential >= 70 || p.ovr >= 55)) || p.ovr >= 66) out.push('winnerz');
  if ((p.age <= 24 && (f >= 1_500 || p.ovr >= 68)) || f >= 20_000) out.push('freedom');
  if (p.ovr >= 74) out.push('ami');
  if (p.ovr >= 83 || f >= 250_000) out.push('helmut');
  return out;
}

/** Angebot einer Marke, abhängig von Wertung, Alter und Reichweite. */
export function makeOffer(c: Career, brand: BrandId): KitOffer {
  const p = c.player;
  const f = followersOf(c);
  const star = clamp((p.ovr - 55) / 40, 0, 1);
  const reach = Math.min(1, Math.log10(1 + f) / 6);
  const youth = p.age <= 19;
  let fee: number, goalBonus: number, titleBonus: number;
  switch (brand) {
    case 'winnerz': fee = 1_200 + star * 6_000; goalBonus = 90 + star * 160; titleBonus = 800; break;
    case 'freedom': fee = 1_500 + star * 4_000 + reach * 9_000; goalBonus = 40; titleBonus = 600; break;
    case 'ami': fee = 4_000 + star * 9_000; goalBonus = 50; titleBonus = 2_500; break;
    default: fee = 12_000 + star * 22_000 + reach * 8_000; goalBonus = 80; titleBonus = 2_000;
  }
  const r = (v: number, step: number) => Math.round((v * (0.9 + Math.random() * 0.25)) / step) * step;
  return {
    id: `${brand}-${c.year}-${c.phase}`, brand, year: c.year, youth,
    fee: r(fee, 100), goalBonus: r(goalBonus, 10), titleBonus: r(titleBonus, 100),
    years: youth ? randInt(2, 3) : randInt(1, 4),
  };
}

/** In jeder Pause: Wer keinen Vertrag hat (oder im letzten Jahr steckt), bekommt Angebote. */
export function refreshKitOffers(c: Career): void {
  if (c.phase === 'retired') { c.kitOffers = []; return; }
  const k = c.kit;
  if (k && k.left > 1) { c.kitOffers = []; return; }
  // Offene Angebote aus derselben Pause bleiben stehen
  const key = `${c.year}-${c.phase}`;
  if ((c.kitOffers ?? []).some((o) => o.id.endsWith(key))) return;
  const brands = shuffle(interested(c).filter((b) => b !== k?.brand || chance(0.8)));
  // Im Winter seltener, im Sommer fast immer
  if (!brands.length || (c.phase === 'winter' && chance(0.5))) { c.kitOffers = []; return; }
  const n = Math.min(brands.length, c.phase === 'window' ? randInt(1, 3) : 1);
  // Die größte Marke zuerst
  const pickd = brands.slice(0, n).sort((a, b) => BRAND_ORDER.indexOf(b) - BRAND_ORDER.indexOf(a));
  c.kitOffers = pickd.map((b) => makeOffer(c, b));
  const first = BRANDS[pickd[0]];
  postInbox(c, {
    kind: 'contract',
    title: k ? `Neues Angebot von ${first.name}` : c.player.age <= 19 ? `${first.name} will dich als Nachwuchs-Gesicht` : `Ausrüster-Angebot von ${first.name}`,
    text: `${c.kitOffers.length === 1 ? 'Ein Ausrüster bietet' : `${c.kitOffers.length} Ausrüster bieten`} dir einen Vertrag an. Schau unter „Ausrüster“ nach.`,
    action: 'career',
  });
}

export function acceptKit(prev: Career, offerId: string): Career {
  const o = (prev.kitOffers ?? []).find((x) => x.id === offerId);
  if (!o) return prev;
  const { id: _i, year: _y, youth: _yo, ...deal } = o;
  return {
    ...prev,
    kit: { ...deal, left: deal.years, since: prev.year, earned: 0 },
    kitOffers: [],
    kitHistory: [...(prev.kitHistory ?? []), ...(prev.kit ? [{ brand: prev.kit.brand, from: prev.kit.since, earned: prev.kit.earned }] : [])],
  };
}
export const declineKit = (prev: Career, offerId: string): Career => ({ ...prev, kitOffers: (prev.kitOffers ?? []).filter((x) => x.id !== offerId) });

/** Jahresabschluss: Geld aus dem Vertrag (wird von closeYear gutgeschrieben). Verändert den Spielstand direkt. */
export function kitYear(c: Career): { coins: number; note: string | null } {
  const k = c.kit;
  if (!k) return { coins: 0, note: null };
  const last = c.history[c.history.length - 1];
  const goals = last?.goals ?? 0;
  const titles = last?.trophies.length ?? 0;
  const coins = k.fee + goals * k.goalBonus + titles * k.titleBonus;
  k.earned += coins;
  k.left -= 1;
  if (k.brand === 'helmut') c.glam = Math.min(12, (c.glam ?? 0) + 1);
  const b = BRANDS[k.brand];
  const note = `Ausrüster ${b.name}: +${coins.toLocaleString('de-DE')} Coins (Grundgehalt ${k.fee.toLocaleString('de-DE')}${goals ? ` + ${goals} Tore` : ''}${titles ? ` + ${titles} Titel` : ''}).`;
  if (k.left <= 0 || c.phase === 'retired') {
    c.kitHistory = [...(c.kitHistory ?? []), { brand: k.brand, from: k.since, earned: k.earned }];
    c.kit = null;
    postInbox(c, { kind: 'contract', title: `Vertrag mit ${b.name} ausgelaufen`, text: `Insgesamt ${k.earned.toLocaleString('de-DE')} Coins verdient. Neue Marken melden sich im Sommer.`, action: 'career' });
  }
  return { coins, note };
}
