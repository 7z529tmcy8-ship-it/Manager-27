import { REAL_PLAYERS } from '../data/players';
import { getClub } from '../data/leagues';
import { isoWeek, openPack, PACKS, storePacks, type ClubState, type CollectCard, type PackResult } from './club';
import { seasonName } from './squad';

// ---------- Wochenpass ----------
// Jede Kalenderwoche (Mo 0:00 – So 23:59) ein neuer Pass mit 60 Stufen. XP gibt es für Duelle, Packs, Evolutions,
// Tauschaufgaben und Karriere-Saisons. Ganz oben wartet die exklusive Karte der Woche.
// Nicht abgeholte Belohnungen verfallen am Sonntag um Mitternacht.

export const PASS_LEVELS = 60;
/** 60 Stufen in einer Woche: 50 XP pro Stufe (3.000 XP insgesamt). */
export const XP_PER_LEVEL = 50;

export interface PassState {
  season: string; xp: number; claimed: number[];
  /** Pro-Pass für diese Saison gekauft? */
  pro?: boolean;
  /** Abgeholte Pro-Stufen. */
  proClaimed?: number[];
  /** Pass-XP aus Duellen am Tag `duelDay` (für das Tageslimit). */
  duelDay?: string;
  duelXp?: number;
}

/** Preis für den Pro-Pass (gilt eine Woche). */
export const PRO_PASS_PRICE = 200_000_000;

export type PassReward =
  | { level: number; kind: 'coins'; amount: number }
  | { level: number; kind: 'pack'; pack: string }
  | { level: number; kind: 'card' };

/** Ein Pass-Zeitraum: hier immer eine Kalenderwoche. */
export interface PassSeason { id: string; name: string; start: Date; end: Date; /** Fester Held der Woche (sonst per Zufall). */ hero?: string }

/** Feste Pass-Helden je Woche. Ohne Eintrag wählt das Spiel einen Weltstar per Zufall (fest pro Woche). */
export const WEEK_HEROES: Record<string, string> = {
  '2026-W44': 'Harry Kane',
};
/** Erste Wochenpass-Woche: übernimmt den Stand der alten „Saison 2“ (gleiche Stufe, gleiche Abholungen, Pro bleibt). */
const FIRST_WEEK = '2026-W44';
const LEGACY_SEASON = '2026-S2';

export function currentPassSeason(now = new Date()): PassSeason {
  const w = isoWeek(now);
  const start = new Date(w.monday.getFullYear(), w.monday.getMonth(), w.monday.getDate(), 0, 0, 0);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59);
  return { id: w.id, name: `Woche ${w.kw}`, start, end, hero: WEEK_HEROES[w.id] };
}
export function passSeasonName(id: string): string {
  const w = /^\d{4}-W(\d+)$/.exec(id);
  if (w) return `Woche ${Number(w[1])}`;
  if (id === LEGACY_SEASON) return 'Saison 2';
  return /^\d{4}-\d{2}$/.test(id) ? seasonName(id) : id;
}

// Gratis-Reihe (jede Woche): gerade Stufen ein Pack, Ikonen auf 20 und 40, Ultimate auf 10/30/50, GOAT auf 59.
// Ungerade Stufen bringen Coins von 3.500 bis 32.500. Weil der Pass jetzt jede Woche neu startet, ist er schlanker als der Monats-Pass.
const FREE_ROTATION = ['gold', 'premium', 'megagold', 'comeback', 'flashback', 'premium', 'cult', 'debut'];
const freePack = (level: number): string | null => {
  if (level === 59) return 'goat';
  if (level === 20 || level === 40) return 'icon';
  if (level % 10 === 0) return 'ultimate';
  if (level % 5 === 0) return 'worldstar';
  if (level % 2 === 0) return FREE_ROTATION[(level / 2) % FREE_ROTATION.length];
  return null;
};

export const PASS_REWARDS: PassReward[] = Array.from({ length: PASS_LEVELS }, (_, i) => {
  const level = i + 1;
  if (level === PASS_LEVELS) return { level, kind: 'card' as const };
  const pack = freePack(level);
  if (pack) return { level, kind: 'pack' as const, pack };
  return { level, kind: 'coins' as const, amount: 3_000 + level * 500 };
});
export const freePackCount = (id: string) => PASS_REWARDS.filter((r) => r.kind === 'pack' && r.pack === id).length;

/** XP je Aktion. */
export const PASS_XP = {
  duel: (level: number, outcome: 'win' | 'draw' | 'loss') => (outcome === 'win' ? 20 + 5 * level : outcome === 'draw' ? 8 : 4),
  pack: 15,
  evoStep: 60,
  task: 40,
  careerSeason: 150,
};

/** Pass-Stand der laufenden Woche (eine neue Woche startet bei 0). */
export function passOf(club: Pick<ClubState, 'pass'>, now = new Date()): PassState {
  const sid = currentPassSeason(now).id;
  if (club.pass?.season === sid) return club.pass;
  // Umstellung auf den Wochenpass: Die erste Woche übernimmt die alte Saison 2 – XP halbiert, weil eine Stufe jetzt 50 statt 100 XP kostet.
  if (sid === FIRST_WEEK && club.pass?.season === LEGACY_SEASON) return { ...club.pass, season: sid, xp: Math.floor(club.pass.xp / 2) };
  return { season: sid, xp: 0, claimed: [] };
}

/** Aus Duellen gibt es höchstens so viele Pass-XP pro Tag – Dauer-Duellieren füllt den Pass nicht mehr. */
export const DUEL_XP_PER_DAY = 200;
const dayId = (now: Date) => `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

/** Heute noch mögliche Pass-XP aus Duellen. */
export function duelXpLeft(club: Pick<ClubState, 'pass'>, now = new Date()): number {
  const p = passOf(club, now);
  return p.duelDay === dayId(now) ? Math.max(0, DUEL_XP_PER_DAY - (p.duelXp ?? 0)) : DUEL_XP_PER_DAY;
}

/** Duell-XP gutschreiben, gedeckelt aufs Tageslimit. Gibt zurück, wie viel wirklich dazukam. */
export function addDuelPassXp(club: ClubState, xp: number, now = new Date()): { club: ClubState; granted: number } {
  const granted = Math.min(Math.max(0, xp), duelXpLeft(club, now));
  const p = passOf(club, now);
  const used = (p.duelDay === dayId(now) ? p.duelXp ?? 0 : 0) + granted;
  const next = addPassXp({ ...club, pass: { ...p, duelDay: dayId(now), duelXp: used } }, granted, now);
  return { club: next, granted };
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

/** Tage bis zum Ende der Pass-Woche (Sonntag). */
export function passDaysLeft(now = new Date()): number {
  const end = currentPassSeason(now).end;
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
}

const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

/** Die exklusive Karte der Woche: ein Weltstar mit +7 im Pass-Design – jede Woche ein anderer. */
export function passCard(season: string): CollectCard {
  const stars = [...REAL_PLAYERS].filter((p) => p.ovr >= 86 && p.age <= 33).sort((a, b) => b.ovr - a.ovr || a.name.localeCompare(b.name));
  const fixed = WEEK_HEROES[season] ?? (season === LEGACY_SEASON ? 'Harry Kane' : undefined);
  const p = (fixed && REAL_PLAYERS.find((x) => x.name === fixed)) || stars[hash(season) % stars.length];
  const club = getClub(p.clubId);
  return {
    id: `pass-${season}-${p.clubId}-${p.name.toLowerCase().replace(/[^a-z]+/g, '-')}`,
    name: p.name, position: p.position, nation: p.nation, club: club.name, ovr: Math.min(97, p.ovr + 7),
    variant: 'pass', label: passSeasonName(season),
  };
}

export interface PassClaim { club: ClubState; coins?: number; pack?: { name: string; result: PackResult }; card?: CollectCard; /** In die Ablage gelegtes Pack. */ stored?: string }

/** Belohnung einer Stufe abholen. */
export function claimPassReward(club: ClubState, level: number, now = new Date(), rand = Math.random, store = false): PassClaim | null {
  const p = passOf(club, now);
  const reward = PASS_REWARDS.find((r) => r.level === level);
  if (!reward || level > passLevel(p.xp) || p.claimed.includes(level)) return null;
  const pass = { ...p, claimed: [...p.claimed, level] };
  if (reward.kind === 'coins') return { club: { ...club, pass, coins: club.coins + reward.amount }, coins: reward.amount };
  if (reward.kind === 'pack' && store) return { club: storePacks({ ...club, pass }, [reward.pack], `Saison-Pass Stufe ${level}`), stored: reward.pack };
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
// Eine zweite, deutlich stärkere Belohnungsreihe über dieselben 60 Stufen. Gilt für die laufende Woche;
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

export function claimProReward(club: ClubState, level: number, now = new Date(), rand = Math.random, store = false): PassClaim | null {
  const p = passOf(club, now);
  const reward = PRO_REWARDS.find((r) => r.level === level);
  if (!p.pro || !reward || level > passLevel(p.xp) || (p.proClaimed ?? []).includes(level)) return null;
  const pass = { ...p, proClaimed: [...(p.proClaimed ?? []), level] };
  if (reward.kind === 'coins') return { club: { ...club, pass, coins: club.coins + reward.amount }, coins: reward.amount };
  if (reward.kind === 'pack' && store) return { club: storePacks({ ...club, pass }, [reward.pack], `Pro-Pass Stufe ${level}`), stored: reward.pack };
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
