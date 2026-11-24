import { openPack, type ClubState, type PackResult } from './club';
import { casinoOf } from './casino';
import { seasonId } from './squad';
import { CARDS_FROM_CAREER_ONLY } from './mode';

// Tagesziele verbinden alle Bereiche: jeden Tag ein bisschen Karriere, Duelle, Packs und Casino.
// Jedes Ziel zahlt einzeln aus, alle zusammen schalten ein Gold-Pack frei.

export type DailyId = 'career' | 'duel' | 'pack' | 'casino';
export interface DailyTask { id: DailyId; text: string; need: number; coins: number; chips: number }
export const DAILY_TASKS: DailyTask[] = [
  { id: 'career', text: 'Spiel in deiner Karriere weiter', need: 1, coins: 1_500, chips: 0 },
  { id: 'duel', text: 'Gewinne 2 Duelle', need: 2, coins: 2_000, chips: 0 },
  { id: 'pack', text: 'Öffne 1 Pack', need: 1, coins: 1_000, chips: 0 },
  { id: 'casino', text: 'Spiele 5 Runden im Casino', need: 5, coins: 0, chips: 750 },
];
export const DAILY_BONUS_PACK = 'gold';
/** Ohne Karten-Shop gibt es kein Pack-Ziel; der Bonus für alle Ziele sind dann Coins. */
export const DAILY_BONUS_COINS = 5_000;
const activeTasks = () => DAILY_TASKS.filter((t) => !(CARDS_FROM_CAREER_ONLY && t.id === 'pack'));

export interface DailyState { day: string; prog: Partial<Record<DailyId, number>>; claimed: DailyId[]; bonus: boolean }

export function dailyOf(club: Pick<ClubState, 'daily'>, now = new Date()): DailyState {
  const day = seasonId(now);
  return club.daily?.day === day ? club.daily : { day, prog: {}, claimed: [], bonus: false };
}

/** Fortschritt zählen (z. B. nach einem gewonnenen Duell). */
export function trackDaily(club: ClubState, id: DailyId, n = 1, now = new Date()): ClubState {
  const d = dailyOf(club, now);
  const task = DAILY_TASKS.find((t) => t.id === id)!;
  if (!activeTasks().includes(task)) return club;
  const cur = d.prog[id] ?? 0;
  if (cur >= task.need) return club.daily === d ? club : { ...club, daily: d };
  return { ...club, daily: { ...d, prog: { ...d.prog, [id]: Math.min(task.need, cur + n) } } };
}

export interface DailyView extends DailyTask { have: number; done: boolean; claimed: boolean }
export function dailyView(club: Pick<ClubState, 'daily'>, now = new Date()): { tasks: DailyView[]; ready: number; allClaimed: boolean; bonusReady: boolean; bonusTaken: boolean } {
  const d = dailyOf(club, now);
  const tasks = activeTasks().map((t) => {
    const have = d.prog[t.id] ?? 0;
    return { ...t, have, done: have >= t.need, claimed: d.claimed.includes(t.id) };
  });
  const allClaimed = tasks.every((t) => t.claimed);
  return { tasks, ready: tasks.filter((t) => t.done && !t.claimed).length, allClaimed, bonusReady: allClaimed && !d.bonus, bonusTaken: d.bonus };
}

/** Alle erledigten Ziele abholen. */
export function claimDaily(club: ClubState, now = new Date()): { club: ClubState; coins: number; chips: number } {
  const d = dailyOf(club, now);
  const v = dailyView(club, now).tasks.filter((t) => t.done && !t.claimed);
  if (!v.length) return { club, coins: 0, chips: 0 };
  const coins = v.reduce((a, t) => a + t.coins, 0);
  const chips = v.reduce((a, t) => a + t.chips, 0);
  const cs = casinoOf(club);
  return {
    club: { ...club, coins: club.coins + coins, casino: chips ? { ...cs, chips: cs.chips + chips } : club.casino, daily: { ...d, claimed: [...d.claimed, ...v.map((t) => t.id)] } },
    coins, chips,
  };
}

/** Alle Ziele erledigt: Gold-Pack gratis. */
export function claimDailyBonus(club: ClubState, now = new Date(), rand = Math.random): { club: ClubState; result: PackResult } | null {
  if (!dailyView(club, now).bonusReady) return null;
  if (CARDS_FROM_CAREER_ONLY) return { club: { ...club, coins: club.coins + DAILY_BONUS_COINS, daily: { ...dailyOf(club, now), bonus: true } }, result: { cards: [], items: [] } };
  const r = openPack(club, DAILY_BONUS_PACK, rand, true);
  if (!r) return null;
  return { club: { ...r.club, daily: { ...dailyOf(club, now), bonus: true } }, result: r.result };
}
