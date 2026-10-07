import { getClub, getLeague } from '../data/leagues';
import { rand, uid } from './random';
import type { Career } from './types';

// Geschenke vom Aufsichtsrat: Steigt ein Klub auf (oder spielt erstmals europäisch), an dem du Anteile hast,
// bekommst du eine Mystery-Box. Was drin ist, entscheidet sich erst beim Öffnen: Coins (mehr bei hohem Anteil
// und höherer Liga) und mit Glück ein Gratis-Pack.

export interface Gift {
  id: string;
  clubId: string;
  /** Anlass, z. B. „Aufstieg in die 2. Bundesliga“. */
  reason: string;
  /** Liga-Stufe nach dem Aufstieg (1 = höchste Liga) – bestimmt, wie wertvoll die Box ist. */
  tier: number;
  /** Anteil in Prozent zum Zeitpunkt des Aufstiegs. */
  stake: number;
  /** Seltenheit der Box (nur Optik und etwas mehr Inhalt). */
  rarity: 'bronze' | 'silver' | 'gold';
}

export interface GiftContent {
  coins: number;
  /** Gratis-Pack (Pack-ID) oder nichts. */
  pack: string | null;
}

const BASE_BY_TIER: Record<number, number> = { 1: 30_000, 2: 15_000, 3: 8_000, 4: 4_000, 5: 2_000, 6: 1_200 };

export function makeGift(clubId: string, reason: string, tier: number, stake: number): Gift {
  const r = rand();
  const rarity: Gift['rarity'] = tier <= 2 || r < 0.12 ? 'gold' : tier <= 4 || r < 0.4 ? 'silver' : 'bronze';
  return { id: uid(), clubId, reason, tier, stake, rarity };
}

/** Inhalt erst beim Öffnen auswürfeln. */
export function rollGift(g: Gift, roll: () => number = Math.random): GiftContent {
  const base = BASE_BY_TIER[g.tier] ?? 2_000;
  const stakeFactor = 0.4 + Math.min(49, g.stake) / 49; // 1 % → 0,42 · 49 % → 1,4
  const rarityFactor = g.rarity === 'gold' ? 1.4 : g.rarity === 'silver' ? 1.15 : 1;
  const luck = 0.6 + roll() * 1.1;
  const coins = Math.round((base * stakeFactor * rarityFactor * luck) / 100) * 100;
  const p = roll();
  const top = g.rarity === 'gold';
  const pack = p < (top ? 0.05 : 0.015) ? 'icon' : p < (top ? 0.25 : 0.1) ? 'premium' : p < (top ? 0.6 : 0.35) ? 'gold' : null;
  return { coins, pack };
}

/** Geschenk aus dem Spielstand nehmen (nach dem Öffnen). */
export function takeGift(prev: Career, id: string): Career {
  if (!prev.gifts?.some((g) => g.id === id)) return prev;
  const career: Career = structuredClone(prev);
  career.gifts = career.gifts!.filter((g) => g.id !== id);
  career.updatedAt = Date.now();
  return career;
}

export const giftTitle = (g: Gift) => `${getClub(g.clubId).name}: ${g.reason}`;
export const leagueName = (tier: number, leagueId: string) => (tier ? getLeague(leagueId).name : '');
