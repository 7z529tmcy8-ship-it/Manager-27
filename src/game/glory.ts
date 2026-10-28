import { CARD_POOL, PACKS, eventOfCard, storePacks, type ClubState, type CollectCard } from './club';

// ---------- Flutlicht-Drops und Ruhmesweg ----------
// Drops sind Überraschungs-Belohnungen: Die Seltenheit wird beim Öffnen Stufe für Stufe enthüllt.
// Man bekommt sie für Duell-Siege (höchstens DROPS_PER_DAY pro Tag) und auf dem Ruhmesweg.
// Der Ruhmesweg ist eine lange Belohnungsleiste für Trophäen aus Duellen und der Karriere.
// Belohnungen zählen nach dem besten je erreichten Trophäen-Stand – Verlieren nimmt nichts weg.

export type DropRarity = 'selten' | 'superselten' | 'episch' | 'mythisch' | 'legendaer';
export const DROP_ORDER: DropRarity[] = ['selten', 'superselten', 'episch', 'mythisch', 'legendaer'];
export const DROP_LABEL: Record<DropRarity, string> = { selten: 'Selten', superselten: 'Super selten', episch: 'Episch', mythisch: 'Mythisch', legendaer: 'Legendär' };
/** Wahrscheinlichkeit je Seltenheit (in %). */
export const DROP_ODDS: Record<DropRarity, number> = { selten: 50, superselten: 28, episch: 15, mythisch: 5.5, legendaer: 1.5 };
export const DROPS_PER_DAY = 6;

export type DropReward = { kind: 'coins'; amount: number } | { kind: 'pack'; pack: string } | { kind: 'card'; card: CollectCard };
export type DropKind = 'normal' | 'mega';

/** Mega-Drop: mindestens Episch. */
export const MEGA_ODDS: Partial<Record<DropRarity, number>> = { episch: 66, mythisch: 26, legendaer: 8 };

const dayKey = (now: Date) => `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

export function rollRarity(rand: () => number = Math.random, kind: DropKind = 'normal'): DropRarity {
  const odds = kind === 'mega' ? MEGA_ODDS : DROP_ODDS;
  let r = rand() * 100;
  for (const k of DROP_ORDER) if ((r -= odds[k] ?? 0) < 0) return k;
  return kind === 'mega' ? 'episch' : 'selten';
}

const between = (lo: number, hi: number, rand: () => number) => Math.round((lo + rand() * (hi - lo)) / 100) * 100;

/** Zufällige Karte aus dem normalen Kartenpool (keine Event-Karten), eher die schwächeren der Spanne. */
function cardIn(filter: (c: CollectCard) => boolean, rand: () => number): CollectCard | null {
  const pool = CARD_POOL.filter((c) => !eventOfCard(c) && filter(c)).sort((x, y) => x.ovr - y.ovr);
  if (!pool.length) return null;
  return pool[Math.floor(rand() ** 1.6 * pool.length)];
}

const SPECIAL = ['debut', 'comeback', 'flashback', 'cult'];

export function dropReward(rarity: DropRarity, rand: () => number = Math.random): DropReward {
  const r = rand();
  const card = (f: (c: CollectCard) => boolean, fallback: DropReward): DropReward => {
    const c = cardIn(f, rand);
    return c ? { kind: 'card', card: c } : fallback;
  };
  switch (rarity) {
    case 'selten': return r < 0.7 ? { kind: 'coins', amount: between(2_000, 4_000, rand) } : { kind: 'pack', pack: 'standard' };
    case 'superselten': return r < 0.45 ? { kind: 'coins', amount: between(6_000, 10_000, rand) } : r < 0.8 ? { kind: 'pack', pack: 'gold' } : { kind: 'pack', pack: 'mystery' };
    case 'episch':
      return r < 0.35 ? { kind: 'coins', amount: between(15_000, 25_000, rand) }
        : r < 0.65 ? card((c) => c.variant === 'gold-rare' && c.ovr >= 84 && c.ovr <= 87, { kind: 'pack', pack: 'premium' })
          : { kind: 'pack', pack: r < 0.85 ? 'premium' : 'megagold' };
    case 'mythisch':
      return r < 0.3 ? { kind: 'coins', amount: between(50_000, 80_000, rand) }
        : r < 0.65 ? card((c) => SPECIAL.includes(c.variant) || (c.variant === 'gold-rare' && c.ovr >= 88), { kind: 'pack', pack: 'worldstar' })
          : { kind: 'pack', pack: r < 0.85 ? 'worldstar' : 'megagold' };
    case 'legendaer':
      return r < 0.4 ? card((c) => c.variant === 'icon', { kind: 'pack', pack: 'icon' })
        : r < 0.7 ? { kind: 'pack', pack: 'icon' } : r < 0.9 ? { kind: 'pack', pack: 'ultimate' } : { kind: 'pack', pack: 'goat' };
  }
}

export const dropRewardText = (r: DropReward) =>
  r.kind === 'coins' ? `${r.amount.toLocaleString('de-DE')} Coins` : r.kind === 'card' ? `${r.card.name} (${r.card.ovr})` : PACKS.find((p) => p.id === r.pack)?.name ?? r.pack;

/** Drop gutschreiben (Duell-Sieg: höchstens DROPS_PER_DAY pro Tag). */
export function grantDrop(club: ClubState, now = new Date(), fromDuel = true): { club: ClubState; granted: boolean } {
  const day = dayKey(now);
  const today = club.dropDay?.day === day ? club.dropDay.n : 0;
  if (fromDuel && today >= DROPS_PER_DAY) return { club, granted: false };
  return { club: { ...club, drops: (club.drops ?? 0) + 1, dropDay: fromDuel ? { day, n: today + 1 } : club.dropDay }, granted: true };
}

export const dropsLeftToday = (club: Pick<ClubState, 'dropDay'>, now = new Date()) =>
  DROPS_PER_DAY - (club.dropDay?.day === dayKey(now) ? club.dropDay.n : 0);

// ---------- Drop-Shop ----------
export interface DropOffer { id: string; name: string; text: string; price: number; kind: DropKind; n: number }
export const DROP_SHOP: DropOffer[] = [
  { id: 'drop1', name: 'Flutlicht-Drop', text: 'Normale Chancen – von Selten bis Legendär.', price: 12_000, kind: 'normal', n: 1 },
  { id: 'drop5', name: '5er-Bündel', text: '5 Flutlicht-Drops, einer gratis.', price: 48_000, kind: 'normal', n: 5 },
  { id: 'mega', name: 'Mega-Drop', text: 'Mindestens Episch – 8 % Legendär.', price: 90_000, kind: 'mega', n: 1 },
];

export function buyDrops(club: ClubState, offerId: string): ClubState | null {
  const o = DROP_SHOP.find((x) => x.id === offerId);
  if (!o || club.coins < o.price) return null;
  const base = { ...club, coins: club.coins - o.price };
  return o.kind === 'mega' ? { ...base, megaDrops: (base.megaDrops ?? 0) + o.n } : { ...base, drops: (base.drops ?? 0) + o.n };
}

export interface DropOpen { club: ClubState; rarity: DropRarity; steps: DropRarity[]; reward: DropReward; kind: DropKind; duplicate: boolean }

/** Einen Drop öffnen: Seltenheit würfeln, Belohnung gutschreiben (Packs in die Ablage, Karten in die Sammlung). */
export function openDrop(club: ClubState, rand: () => number = Math.random, now = Date.now(), kind: DropKind = 'normal'): DropOpen | null {
  const have = kind === 'mega' ? club.megaDrops ?? 0 : club.drops ?? 0;
  if (!have) return null;
  const rarity = rollRarity(rand, kind);
  const reward = dropReward(rarity, rand);
  let next: ClubState = { ...club, [kind === 'mega' ? 'megaDrops' : 'drops']: have - 1, dropsOpened: (club.dropsOpened ?? 0) + 1 };
  let duplicate = false;
  if (reward.kind === 'coins') next = { ...next, coins: next.coins + reward.amount };
  else if (reward.kind === 'pack') next = storePacks(next, [reward.pack], `Drop (${DROP_LABEL[rarity]})`, now);
  else {
    duplicate = (next.cards[reward.card.id] ?? 0) > 0;
    next = { ...next, cards: { ...next.cards, [reward.card.id]: (next.cards[reward.card.id] ?? 0) + 1 } };
  }
  // Mega-Drops starten die Enthüllung bei Episch
  const from = kind === 'mega' ? DROP_ORDER.indexOf('episch') : 0;
  return { club: next, rarity, steps: DROP_ORDER.slice(from, DROP_ORDER.indexOf(rarity) + 1), reward, kind, duplicate };
}

// ---------- Trophäen ----------
export const DUEL_TROPHIES = { win: 10, draw: 3, loss: -4 } as const;
/** Karriere: pro abgeschlossener Saison und pro Titel. */
export const CAREER_TROPHIES = { season: 20, title: 10 } as const;

export function addTrophies(club: ClubState, delta: number): ClubState {
  const trophies = Math.max(0, (club.trophies ?? 0) + delta);
  return { ...club, trophies, trophyBest: Math.max(club.trophyBest ?? 0, trophies) };
}

// ---------- Ruhmesweg ----------
export type RoadReward = { kind: 'coins'; amount: number } | { kind: 'pack'; pack: string } | { kind: 'drops'; n: number };
export interface RoadStep { at: number; reward: RoadReward }

const BIG = ['worldstar', 'icon', 'ultimate', 'goat'];
const MID = ['gold', 'premium', 'megagold', 'premium', 'megagold', 'worldstar', 'premium', 'megagold'];

/** 40 Stufen im Abstand von 75 Trophäen (bis 3.000). */
export const ROAD: RoadStep[] = Array.from({ length: 40 }, (_, k) => {
  const i = k + 1;
  const at = i * 75;
  if (i % 10 === 0) return { at, reward: { kind: 'pack', pack: BIG[i / 10 - 1] } };
  if (i % 5 === 0) return { at, reward: { kind: 'pack', pack: MID[(i / 5 - 1) % MID.length] } };
  if (i % 2 === 0) return { at, reward: { kind: 'drops', n: i >= 20 ? 2 : 1 } };
  return { at, reward: { kind: 'coins', amount: 2_000 + i * 500 } };
});

export const roadRewardText = (r: RoadReward) =>
  r.kind === 'coins' ? `${r.amount.toLocaleString('de-DE')} Coins` : r.kind === 'drops' ? `${r.n} Drop${r.n > 1 ? 's' : ''}` : PACKS.find((p) => p.id === r.pack)?.name ?? r.pack;

export type RoadState = 'claimed' | 'ready' | 'locked';
export const roadState = (club: Pick<ClubState, 'trophyBest' | 'roadClaimed'>, step: RoadStep): RoadState =>
  (club.roadClaimed ?? []).includes(step.at) ? 'claimed' : (club.trophyBest ?? 0) >= step.at ? 'ready' : 'locked';

export const roadReady = (club: Pick<ClubState, 'trophyBest' | 'roadClaimed'>) => ROAD.filter((s) => roadState(club, s) === 'ready').length;

export function claimRoad(club: ClubState, at: number, now = Date.now()): ClubState | null {
  const step = ROAD.find((s) => s.at === at);
  if (!step || roadState(club, step) !== 'ready') return null;
  const base = { ...club, roadClaimed: [...(club.roadClaimed ?? []), at] };
  const r = step.reward;
  if (r.kind === 'coins') return { ...base, coins: base.coins + r.amount };
  if (r.kind === 'drops') return { ...base, drops: (base.drops ?? 0) + r.n };
  return storePacks(base, [r.pack], `Ruhmesweg (${at} Trophäen)`, now);
}

/** Alle erreichten Stufen auf einmal abholen. */
export function claimAllRoad(club: ClubState, now = Date.now()): ClubState {
  return ROAD.reduce((c, s) => claimRoad(c, s.at, now) ?? c, club);
}
