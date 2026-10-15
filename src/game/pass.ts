import { REAL_PLAYERS } from '../data/players';
import { getClub } from '../data/leagues';
import { openPack, PACKS, type ClubState, type CollectCard, type PackResult } from './club';
import { seasonId, seasonName } from './squad';

// ---------- Saison-Pass ----------
// Jeder Kalendermonat ist eine Pass-Saison mit 30 Stufen. XP gibt es für Duelle, Packs, Evolutions,
// Tauschaufgaben und Karriere-Saisons. Ganz oben wartet eine exklusive Saison-Pass-Karte.
// Nicht abgeholte Belohnungen verfallen mit dem Monatsende.

export const PASS_LEVELS = 30;
export const XP_PER_LEVEL = 100;

export interface PassState { season: string; xp: number; claimed: number[] }

export type PassReward =
  | { level: number; kind: 'coins'; amount: number }
  | { level: number; kind: 'pack'; pack: string }
  | { level: number; kind: 'card' };

const PACK_AT: Record<number, string> = {
  3: 'standard', 5: 'gold', 8: 'jumbo', 10: 'premium', 12: 'mystery', 15: 'debut', 17: 'cult', 20: 'comeback', 22: 'megagold', 25: 'flashback', 27: 'worldstar', 29: 'icon',
};

export const PASS_REWARDS: PassReward[] = Array.from({ length: PASS_LEVELS }, (_, i) => {
  const level = i + 1;
  if (level === PASS_LEVELS) return { level, kind: 'card' as const };
  if (PACK_AT[level]) return { level, kind: 'pack' as const, pack: PACK_AT[level] };
  // Coins steigen mit der Stufe: 1.000 bis 12.000
  return { level, kind: 'coins' as const, amount: Math.round((1000 + (level - 1) * 390) / 500) * 500 };
});

/** XP je Aktion. */
export const PASS_XP = {
  duel: (level: number, outcome: 'win' | 'draw' | 'loss') => (outcome === 'win' ? 20 + 5 * level : outcome === 'draw' ? 8 : 4),
  pack: 15,
  evoStep: 60,
  task: 40,
  careerSeason: 50,
};

/** Pass-Stand der aktuellen Saison (eine neue Saison startet bei 0). */
export function passOf(club: Pick<ClubState, 'pass'>, now = new Date()): PassState {
  const sid = seasonId(now);
  return club.pass?.season === sid ? club.pass : { season: sid, xp: 0, claimed: [] };
}

export const passLevel = (xp: number) => Math.min(PASS_LEVELS, Math.floor(xp / XP_PER_LEVEL));

export function addPassXp(club: ClubState, xp: number, now = new Date()): ClubState {
  if (xp <= 0) return club;
  const p = passOf(club, now);
  return { ...club, pass: { ...p, xp: Math.min(PASS_LEVELS * XP_PER_LEVEL, p.xp + xp) } };
}

/** Stufen, die erreicht, aber noch nicht abgeholt sind. */
export function unclaimedLevels(club: Pick<ClubState, 'pass'>, now = new Date()): number[] {
  const p = passOf(club, now);
  return PASS_REWARDS.filter((r) => r.level <= passLevel(p.xp) && !p.claimed.includes(r.level)).map((r) => r.level);
}

/** Tage bis zum Ende der Pass-Saison (Monatsende). */
export function passDaysLeft(now = new Date()): number {
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
}

const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

/** Die exklusive Karte der Saison: ein Weltstar mit +7 im Saison-Pass-Design – jeden Monat ein anderer. */
export function passCard(season: string): CollectCard {
  const stars = [...REAL_PLAYERS].filter((p) => p.ovr >= 86 && p.age <= 33).sort((a, b) => b.ovr - a.ovr || a.name.localeCompare(b.name));
  const p = stars[hash(season) % stars.length];
  const club = getClub(p.clubId);
  return {
    id: `pass-${season}-${p.clubId}-${p.name.toLowerCase().replace(/[^a-z]+/g, '-')}`,
    name: p.name, position: p.position, nation: p.nation, club: club.name, ovr: Math.min(97, p.ovr + 7),
    variant: 'pass', label: seasonName(season),
  };
}

export interface PassClaim { club: ClubState; coins?: number; pack?: { name: string; result: PackResult }; card?: CollectCard }

/** Belohnung einer Stufe abholen. */
export function claimPassReward(club: ClubState, level: number, now = new Date(), rand = Math.random): PassClaim | null {
  const p = passOf(club, now);
  const reward = PASS_REWARDS.find((r) => r.level === level);
  if (!reward || level > passLevel(p.xp) || p.claimed.includes(level)) return null;
  const pass = { ...p, claimed: [...p.claimed, level] };
  if (reward.kind === 'coins') return { club: { ...club, pass, coins: club.coins + reward.amount }, coins: reward.amount };
  if (reward.kind === 'pack') {
    const res = openPack({ ...club, pass }, reward.pack, rand, true);
    if (!res) return null;
    return { club: res.club, pack: { name: PACKS.find((x) => x.id === reward.pack)!.name, result: res.result } };
  }
  const card = passCard(p.season);
  const specials = club.specials.some((s) => s.id === card.id) ? club.specials : [...club.specials, card];
  return { club: { ...club, pass, specials }, card };
}

export const rewardText = (r: PassReward, season: string) =>
  r.kind === 'coins' ? `${r.amount.toLocaleString('de-DE')} Coins`
    : r.kind === 'pack' ? PACKS.find((x) => x.id === r.pack)!.name
    : `Exklusiv: ${passCard(season).name} ${passCard(season).ovr}`;
