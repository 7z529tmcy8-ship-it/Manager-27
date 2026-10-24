import { REAL_PLAYERS } from '../data/players';
import { getClub } from '../data/leagues';
import { openPack, PACKS, type ClubState, type CollectCard, type PackResult } from './club';
import { seasonId, seasonName } from './squad';

// ---------- Saison-Pass ----------
// Pass-Saisons mit 60 Stufen (Saison 2 ab 24.10.2026). Ohne eigene Saison gilt der Kalendermonat. XP gibt es für Duelle, Packs, Evolutions,
// Tauschaufgaben und Karriere-Saisons. Ganz oben wartet eine exklusive Saison-Pass-Karte.
// Nicht abgeholte Belohnungen verfallen mit dem Monatsende.

export const PASS_LEVELS = 60;
export const XP_PER_LEVEL = 100;

export interface PassState {
  season: string; xp: number; claimed: number[];
  /** Pro-Pass für diese Saison gekauft? */
  pro?: boolean;
  /** Abgeholte Pro-Stufen. */
  proClaimed?: number[];
}

/** Preis für den Pro-Pass (pro Saison = Monat). */
export const PRO_PASS_PRICE = 200_000_000;

export type PassReward =
  | { level: number; kind: 'coins'; amount: number }
  | { level: number; kind: 'pack'; pack: string }
  | { level: number; kind: 'card' };

/** Pass-Saisons. Danach (oder dazwischen) läuft automatisch ein Monats-Pass. */
export interface PassSeason { id: string; name: string; start: Date; end: Date; /** Fester Saison-Held (sonst per Zufall). */ hero?: string }
export const PASS_SEASONS: PassSeason[] = [
  { id: '2026-S2', name: 'Saison 2', start: new Date(2026, 9, 24, 0, 0, 0), end: new Date(2026, 10, 30, 23, 59, 59), hero: 'Harry Kane' },
];
/** Wer den Pro-Pass der ersetzten Saison gekauft hatte, behält ihn in der neuen. */
const CARRY_PRO: Record<string, string> = { '2026-S2': '2026-10' };

export function currentPassSeason(now = new Date()): PassSeason {
  const s = PASS_SEASONS.find((x) => now >= x.start && now <= x.end);
  if (s) return s;
  return { id: seasonId(now), name: seasonName(seasonId(now)), start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) };
}
export const passSeasonName = (id: string) => PASS_SEASONS.find((x) => x.id === id)?.name ?? (/^\d{4}-\d{2}$/.test(id) ? seasonName(id) : id);

const PACK_AT: Record<number, string> = {
  3: 'standard', 5: 'gold', 8: 'jumbo', 10: 'premium', 12: 'mystery', 15: 'debut', 17: 'cult', 20: 'comeback', 22: 'megagold', 25: 'flashback', 27: 'worldstar', 30: 'icon',
  33: 'premium', 35: 'comeback', 38: 'megagold', 40: 'icon', 42: 'flashback', 45: 'worldstar', 48: 'ultimate', 50: 'icon', 53: 'megagold', 55: 'ultimate', 57: 'worldstar', 59: 'goat',
};

export const PASS_REWARDS: PassReward[] = Array.from({ length: PASS_LEVELS }, (_, i) => {
  const level = i + 1;
  if (level === PASS_LEVELS) return { level, kind: 'card' as const };
  if (PACK_AT[level]) return { level, kind: 'pack' as const, pack: PACK_AT[level] };
  // Coins steigen mit der Stufe: 1.000 bis rund 18.500
  return { level, kind: 'coins' as const, amount: Math.round((1000 + (level - 1) * 300) / 500) * 500 };
});

/** XP je Aktion. */
export const PASS_XP = {
  duel: (level: number, outcome: 'win' | 'draw' | 'loss') => (outcome === 'win' ? 20 + 5 * level : outcome === 'draw' ? 8 : 4),
  pack: 15,
  evoStep: 60,
  task: 40,
  careerSeason: 100,
};

/** Pass-Stand der aktuellen Saison (eine neue Saison startet bei 0). */
export function passOf(club: Pick<ClubState, 'pass'>, now = new Date()): PassState {
  const sid = currentPassSeason(now).id;
  if (club.pass?.season === sid) return club.pass;
  // Neue Saison: Pro bleibt erhalten, wenn er für die ersetzte Saison gekauft wurde
  const carry = CARRY_PRO[sid] && club.pass?.season === CARRY_PRO[sid] && club.pass?.pro;
  return { season: sid, xp: 0, claimed: [], ...(carry ? { pro: true, proClaimed: [] } : {}) };
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
  const end = currentPassSeason(now).end;
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
}

const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

/** Die exklusive Karte der Saison: ein Weltstar mit +7 im Saison-Pass-Design – jeden Monat ein anderer. */
export function passCard(season: string): CollectCard {
  const stars = [...REAL_PLAYERS].filter((p) => p.ovr >= 86 && p.age <= 33).sort((a, b) => b.ovr - a.ovr || a.name.localeCompare(b.name));
  const fixed = PASS_SEASONS.find((x) => x.id === season)?.hero;
  const p = (fixed && REAL_PLAYERS.find((x) => x.name === fixed)) || stars[hash(season) % stars.length];
  const club = getClub(p.clubId);
  return {
    id: `pass-${season}-${p.clubId}-${p.name.toLowerCase().replace(/[^a-z]+/g, '-')}`,
    name: p.name, position: p.position, nation: p.nation, club: club.name, ovr: Math.min(97, p.ovr + 7),
    variant: 'pass', label: passSeasonName(season),
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

// ---------- Pro-Pass ----------
// Eine zweite, deutlich stärkere Belohnungsreihe über denselben 30 Stufen. Gilt für die laufende Saison;
// schon erreichte Stufen lassen sich nach dem Kauf sofort abholen.

/** Pro-Reihe über 60 Stufen: alle 10 ein GOAT-Pack, alle 5 Ikonen, alle 3 Ultimate, dazwischen starke Packs und große Coins. */
const PRO_ROTATION = ['worldstar', 'flashback', 'comeback', 'megagold', 'premium'];
export const PRO_REWARDS: PassReward[] = Array.from({ length: PASS_LEVELS }, (_, i) => {
  const level = i + 1;
  if (level === PASS_LEVELS) return { level, kind: 'card' as const };
  if (level % 10 === 0) return { level, kind: 'pack' as const, pack: 'goat' };
  if (level % 5 === 0) return { level, kind: 'pack' as const, pack: 'icon' };
  if (level % 3 === 0) return { level, kind: 'pack' as const, pack: 'ultimate' };
  if (level % 7 === 0) return { level, kind: 'coins' as const, amount: 100_000 + level * 5_000 };
  return { level, kind: 'pack' as const, pack: PRO_ROTATION[level % PRO_ROTATION.length] };
});
export const proPackCount = (id: string) => PRO_REWARDS.filter((r) => r.kind === 'pack' && r.pack === id).length;

/** Die Pro-Karte der Saison: derselbe Saison-Held, aber noch stärker (+9, höchstens 99). */
export function proPassCard(season: string): CollectCard {
  const base = passCard(season);
  return { ...base, id: base.id.replace(/^pass-/, 'pass-pro-'), ovr: Math.min(99, base.ovr + 2), label: `Pro · ${passSeasonName(season)}` };
}

export function buyProPass(club: ClubState, now = new Date()): ClubState | null {
  const p = passOf(club, now);
  if (p.pro || club.coins < PRO_PASS_PRICE) return null;
  return { ...club, coins: club.coins - PRO_PASS_PRICE, pass: { ...p, pro: true, proClaimed: [] } };
}

export function unclaimedProLevels(club: Pick<ClubState, 'pass'>, now = new Date()): number[] {
  const p = passOf(club, now);
  if (!p.pro) return [];
  return PRO_REWARDS.filter((r) => r.level <= passLevel(p.xp) && !(p.proClaimed ?? []).includes(r.level)).map((r) => r.level);
}

export function claimProReward(club: ClubState, level: number, now = new Date(), rand = Math.random): PassClaim | null {
  const p = passOf(club, now);
  const reward = PRO_REWARDS.find((r) => r.level === level);
  if (!p.pro || !reward || level > passLevel(p.xp) || (p.proClaimed ?? []).includes(level)) return null;
  const pass = { ...p, proClaimed: [...(p.proClaimed ?? []), level] };
  if (reward.kind === 'coins') return { club: { ...club, pass, coins: club.coins + reward.amount }, coins: reward.amount };
  if (reward.kind === 'pack') {
    const res = openPack({ ...club, pass }, reward.pack, rand, true);
    if (!res) return null;
    return { club: res.club, pack: { name: `Pro: ${PACKS.find((x) => x.id === reward.pack)!.name}`, result: res.result } };
  }
  const card = proPassCard(p.season);
  const specials = club.specials.some((s) => s.id === card.id) ? club.specials : [...club.specials, card];
  return { club: { ...club, pass, specials }, card };
}

export const proRewardText = (r: PassReward, season: string) =>
  r.kind === 'card' ? `Pro-Karte: ${proPassCard(season).name} ${proPassCard(season).ovr}` : rewardText(r, season);
