import { CARDS_FROM_CAREER_ONLY } from './mode';
import { CARD_POOL, cardReleased, collectionProgress, getCard, openPack, packTier, type ClubState, type CollectCard, type PackResult, type PackTier } from './club';
import { casinoOf, vipLevel, VIP } from './casino';
import { autoSquad, seasonId } from './squad';
import type { Position } from './types';

// Sammlung als Mittelpunkt: Packs aus dem Shop füllen sie, Meilensteine belohnen mit Coins (für den Shop)
// und Chips (fürs Casino), und Casino-VIPs dürfen eigenen Karten ein eigenes Bild geben.

/** Sammelbare Karten (ohne eigene Karriere-Karten und noch nicht erschienene Event-Karten). */
export const collectable = (now = new Date()): CollectCard[] => CARD_POOL.filter((c) => !c.id.startsWith('own-') && cardReleased(c, now));

/** Stufen nach Wertung benannt – so widersprechen sie nie dem Abzeichen auf der Karte. */
export const TIER_NAME: Record<PackTier, string> = { silver: 'Silber', gold: 'Gold', rare: 'Stark 83+', elite: 'Weltklasse 87+', special: 'Spezial', icon: 'Ikone' };
export const TIER_ORDER: PackTier[] = ['silver', 'gold', 'rare', 'elite', 'special', 'icon'];
export const tierOf = (c: CollectCard): PackTier => packTier(c);

// ---------- Sammel-Meilensteine ----------
export interface Milestone { at: number; coins: number; chips: number }
export const MILESTONES: Milestone[] = [
  { at: 25, coins: 10_000, chips: 1_000 },
  { at: 50, coins: 20_000, chips: 2_000 },
  { at: 100, coins: 40_000, chips: 5_000 },
  { at: 200, coins: 80_000, chips: 10_000 },
  { at: 350, coins: 150_000, chips: 20_000 },
  { at: 500, coins: 250_000, chips: 40_000 },
  { at: 750, coins: 400_000, chips: 75_000 },
];
export function milestoneState(club: ClubState): { have: number; next: Milestone | null; ready: Milestone[] } {
  const have = collectionProgress(club).have;
  const claimed = club.collectClaimed ?? [];
  return {
    have,
    next: MILESTONES.find((m) => m.at > have) ?? null,
    ready: MILESTONES.filter((m) => m.at <= have && !claimed.includes(m.at)),
  };
}
export function claimMilestones(club: ClubState): { club: ClubState; coins: number; chips: number } {
  const { ready } = milestoneState(club);
  if (!ready.length) return { club, coins: 0, chips: 0 };
  const coins = ready.reduce((a, m) => a + m.coins, 0);
  const chips = ready.reduce((a, m) => a + m.chips, 0);
  const cs = casinoOf(club);
  return {
    club: { ...club, coins: club.coins + coins, collectClaimed: [...(club.collectClaimed ?? []), ...ready.map((m) => m.at)], casino: { ...cs, chips: cs.chips + chips } },
    coins, chips,
  };
}

// ---------- Täglicher Gratis-Pack ----------
export const FREE_PACK_ID = 'standard';
export const freePackReady = (club: Pick<ClubState, 'freePackDay'>, now = new Date()) => club.freePackDay !== seasonId(now);
export function claimFreePack(club: ClubState, now = new Date(), rand = Math.random): { club: ClubState; result: PackResult } | null {
  if (!freePackReady(club, now)) return null;
  const r = openPack(club, FREE_PACK_ID, rand, true);
  if (!r) return null;
  return { club: { ...r.club, freePackDay: seasonId(now) }, result: r.result };
}

// ---------- Eigene Kartenbilder (Casino-VIP) ----------
/** Plätze für eigene Bilder je VIP-Stufe: ab Platin 3, Diamant 10. */
export const ART_SLOTS = [0, 0, 0, 3, 10];
export const ART_VIP = 3;
export const artSlots = (club: Pick<ClubState, 'casino'>) => ART_SLOTS[vipLevel(casinoOf(club).vipPts)];
/** Wie viel Casino-Einsatz noch bis zur Freischaltung fehlt. */
export const artMissing = (club: Pick<ClubState, 'casino'>) => Math.max(0, VIP[ART_VIP].min - casinoOf(club).vipPts);
/** Darf diese Karte ein eigenes Bild bekommen? Nur Karten, die man besitzt, und solange Plätze frei sind. */
export function canSetArt(club: ClubState, cardId: string, used: string[]): { ok: boolean; reason?: string } {
  if (!(club.cards[cardId] > 0) || !getCard(cardId)) return { ok: false, reason: 'Nur für Karten in deiner Sammlung' };
  const slots = artSlots(club);
  if (!slots) return { ok: false, reason: `Ab VIP ${VIP[ART_VIP].name} im Casino` };
  if (!used.includes(cardId) && used.length >= slots) return { ok: false, reason: `Alle ${slots} Plätze belegt` };
  return { ok: true };
}

// ---------- Willkommens-Pack: eine komplette Start-Elf ----------
const WELCOME_POS: Position[] = ['TW', 'AV', 'IV', 'IV', 'AV', 'ZM', 'ZDM', 'ZM', 'FL', 'ST', 'FL'];
export const welcomeReady = (club: Pick<ClubState, 'welcomeClaimed' | 'cards'>) => !CARDS_FROM_CAREER_ONLY && !club.welcomeClaimed && Object.keys(club.cards).length < 11;
/** 11 Karten (eine pro Position, Wertung 66–79) – direkt als Haupt-Team aufgestellt. Nur einmal. */
export function claimWelcome(club: ClubState, rand = Math.random): { club: ClubState; result: PackResult } | null {
  if (!welcomeReady(club)) return null;
  const used = new Set<string>();
  const picks: CollectCard[] = [];
  for (const pos of WELCOME_POS) {
    const pool = collectable().filter((c) => c.position === pos && c.ovr >= 66 && c.ovr <= 79 && (c.variant === 'gold' || c.variant === 'silver') && !used.has(c.id));
    const c = pool[Math.floor(rand() * pool.length)];
    if (!c) continue;
    used.add(c.id);
    picks.push(c);
  }
  const cards = { ...club.cards };
  for (const c of picks) cards[c.id] = (cards[c.id] ?? 0) + 1;
  let next: ClubState = { ...club, cards, welcomeClaimed: true };
  if (club.squad.every((x) => !x)) next = { ...next, squad: autoSquad(next) };
  return { club: next, result: { cards: picks.sort((a, b) => b.ovr - a.ovr).map((c) => ({ card: c, duplicate: false })), items: [] } };
}
