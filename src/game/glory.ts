import { PACKS, storePacks, type ClubState } from './club';

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

export type DropReward = { kind: 'coins'; amount: number } | { kind: 'pack'; pack: string };

const dayKey = (now: Date) => `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

export function rollRarity(rand: () => number = Math.random): DropRarity {
  let r = rand() * 100;
  for (const k of DROP_ORDER) if ((r -= DROP_ODDS[k]) < 0) return k;
  return 'selten';
}

const between = (lo: number, hi: number, rand: () => number) => Math.round((lo + rand() * (hi - lo)) / 100) * 100;

export function dropReward(rarity: DropRarity, rand: () => number = Math.random): DropReward {
  const r = rand();
  switch (rarity) {
    case 'selten': return { kind: 'coins', amount: between(1_500, 3_000, rand) };
    case 'superselten': return r < 0.6 ? { kind: 'coins', amount: between(4_000, 7_000, rand) } : { kind: 'pack', pack: 'gold' };
    case 'episch': return r < 0.5 ? { kind: 'coins', amount: between(10_000, 15_000, rand) } : { kind: 'pack', pack: r < 0.75 ? 'jumbo' : 'wonder' };
    case 'mythisch': return r < 0.4 ? { kind: 'coins', amount: between(30_000, 40_000, rand) } : { kind: 'pack', pack: r < 0.75 ? 'premium' : 'worldstar' };
    case 'legendaer': return { kind: 'pack', pack: r < 0.75 ? 'icon' : 'ultimate' };
  }
}

export const dropRewardText = (r: DropReward) => (r.kind === 'coins' ? `${r.amount.toLocaleString('de-DE')} Coins` : PACKS.find((p) => p.id === r.pack)?.name ?? r.pack);

/** Drop gutschreiben (Duell-Sieg: höchstens DROPS_PER_DAY pro Tag). */
export function grantDrop(club: ClubState, now = new Date(), fromDuel = true): { club: ClubState; granted: boolean } {
  const day = dayKey(now);
  const today = club.dropDay?.day === day ? club.dropDay.n : 0;
  if (fromDuel && today >= DROPS_PER_DAY) return { club, granted: false };
  return { club: { ...club, drops: (club.drops ?? 0) + 1, dropDay: fromDuel ? { day, n: today + 1 } : club.dropDay }, granted: true };
}

export const dropsLeftToday = (club: Pick<ClubState, 'dropDay'>, now = new Date()) =>
  DROPS_PER_DAY - (club.dropDay?.day === dayKey(now) ? club.dropDay.n : 0);

export interface DropOpen { club: ClubState; rarity: DropRarity; steps: DropRarity[]; reward: DropReward }

/** Einen Drop öffnen: Seltenheit würfeln, Belohnung gutschreiben (Packs landen in der Ablage). */
export function openDrop(club: ClubState, rand: () => number = Math.random, now = Date.now()): DropOpen | null {
  if (!(club.drops ?? 0)) return null;
  const rarity = rollRarity(rand);
  const reward = dropReward(rarity, rand);
  let next: ClubState = { ...club, drops: club.drops! - 1, dropsOpened: (club.dropsOpened ?? 0) + 1 };
  next = reward.kind === 'coins' ? { ...next, coins: next.coins + reward.amount } : storePacks(next, [reward.pack], `Drop (${DROP_LABEL[rarity]})`, now);
  return { club: next, rarity, steps: DROP_ORDER.slice(0, DROP_ORDER.indexOf(rarity) + 1), reward };
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
