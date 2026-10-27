import { CARD_POOL, EVENTS, openPack, PACKS, type ClubState, type CollectCard, type PackResult } from './club';

// ---------- Polarlicht-Kalender (Premium-Adventskalender) ----------
// Ab sofort für 1 Million Coins freischaltbar. Danach öffnet vom 1. bis 24. Dezember jeden Tag ein Türchen
// gratis (verpasste bis 27.12. nachholbar). Wer nicht warten will, kauft die Türchen jetzt schon frei –
// immer das nächste in der Reihe. Fünf Türchen enthalten Winter-Wunder-Karten, Türchen 24 die stärkste.

export const POLAR_UNLOCK = 1_000_000;
/** Preis zum Vorab-Freikaufen eines Türchens. */
export const polarDoorPrice = (day: number) => 30_000 + day * 2_500;

type PolarRewardBody = { kind: 'coins'; amount: number } | { kind: 'pack'; pack: string } | { kind: 'card'; best?: boolean };
export type PolarReward = PolarRewardBody & { day: number };

const R: Record<number, PolarRewardBody> = {
  1: { kind: 'coins', amount: 25_000 }, 2: { kind: 'pack', pack: 'gold' }, 3: { kind: 'coins', amount: 30_000 },
  4: { kind: 'pack', pack: 'winter' }, 5: { kind: 'coins', amount: 35_000 }, 6: { kind: 'card' },
  7: { kind: 'pack', pack: 'premium' }, 8: { kind: 'coins', amount: 40_000 }, 9: { kind: 'pack', pack: 'megagold' },
  10: { kind: 'pack', pack: 'winter' }, 11: { kind: 'coins', amount: 50_000 }, 12: { kind: 'card' },
  13: { kind: 'pack', pack: 'worldstar' }, 14: { kind: 'coins', amount: 60_000 }, 15: { kind: 'pack', pack: 'winter' },
  16: { kind: 'pack', pack: 'premium' }, 17: { kind: 'coins', amount: 75_000 }, 18: { kind: 'card' },
  19: { kind: 'pack', pack: 'icon' }, 20: { kind: 'pack', pack: 'winter' }, 21: { kind: 'coins', amount: 100_000 },
  22: { kind: 'pack', pack: 'ultimate' }, 23: { kind: 'card' }, 24: { kind: 'card', best: true },
};
export const POLAR: PolarReward[] = Array.from({ length: 24 }, (_, i) => ({ day: i + 1, ...R[i + 1] }));

/** Sichtbar und freischaltbar bis zum Ende des Winter-Wunder-Events (27.12.). */
export const polarVisible = (now = new Date()) => now <= EVENTS.winter.end;

/** Bis zu welchem Türchen es heute gratis gibt (Dezember, bis 27.12.). */
export function polarFreeUpTo(now = new Date()): number {
  if (now < EVENTS.winter.start || now > EVENTS.winter.end) return 0;
  return Math.min(24, now.getDate());
}

const opened = (club: Pick<ClubState, 'polar'>) => club.polar?.opened ?? [];

export type PolarDoorState = 'open' | 'free' | 'buy' | 'locked';

/** Das nächste Türchen, das man vorab kaufen kann (immer der Reihe nach) – oder null. */
export function polarNextBuyable(club: Pick<ClubState, 'polar'>, now = new Date()): number | null {
  if (!club.polar?.unlocked || !polarVisible(now)) return null;
  const free = polarFreeUpTo(now);
  for (let d = free + 1; d <= 24; d++) if (!opened(club).includes(d)) return d;
  return null;
}

export function polarDoorState(club: Pick<ClubState, 'polar'>, day: number, now = new Date()): PolarDoorState {
  if (opened(club).includes(day)) return 'open';
  if (!club.polar?.unlocked || !polarVisible(now)) return 'locked';
  if (day <= polarFreeUpTo(now)) return 'free';
  return polarNextBuyable(club, now) === day ? 'buy' : 'locked';
}

export function unlockPolar(club: ClubState, now = new Date()): ClubState | null {
  if (club.polar?.unlocked || !polarVisible(now) || club.coins < POLAR_UNLOCK) return null;
  return { ...club, coins: club.coins - POLAR_UNLOCK, polar: { unlocked: true, opened: opened(club) } };
}

export interface PolarClaim { club: ClubState; paid: number; coins?: number; pack?: { name: string; result: PackResult }; card?: CollectCard }

/** Türchen öffnen: gratis ab seinem Dezember-Tag, vorher gegen Coins (nur das nächste in der Reihe). */
export function openPolarDoor(club: ClubState, day: number, now = new Date(), rand = Math.random): PolarClaim | null {
  const state = polarDoorState(club, day, now);
  if (state !== 'free' && state !== 'buy') return null;
  const paid = state === 'buy' ? polarDoorPrice(day) : 0;
  if (club.coins < paid) return null;
  const base: ClubState = { ...club, coins: club.coins - paid, polar: { unlocked: true, opened: [...opened(club), day] } };
  const reward = POLAR[day - 1];
  if (reward.kind === 'coins') return { club: { ...base, coins: base.coins + reward.amount }, paid, coins: reward.amount };
  if (reward.kind === 'pack') {
    const res = openPack(base, reward.pack, rand, true);
    if (!res) return null;
    return { club: res.club, paid, pack: { name: PACKS.find((p) => p.id === reward.pack)!.name, result: res.result } };
  }
  // Winter-Wunder-Karte, die man noch nicht hat (Türchen 24: die stärkste davon)
  const winter = CARD_POOL.filter((c) => c.variant === 'winter');
  const missing = winter.filter((c) => !(base.cards[c.id] > 0));
  const pool = missing.length ? missing : winter;
  const card = reward.best ? [...pool].sort((a, b) => b.ovr - a.ovr)[0] : pool[Math.floor(rand() * pool.length)];
  return { club: { ...base, cards: { ...base.cards, [card.id]: (base.cards[card.id] ?? 0) + 1 } }, paid, card };
}

/** Was es noch kostet, alle restlichen Türchen jetzt freizukaufen. */
export function polarRestPrice(club: Pick<ClubState, 'polar'>, now = new Date()): number {
  const free = polarFreeUpTo(now);
  return POLAR.filter((r) => r.day > free && !opened(club).includes(r.day)).reduce((a, r) => a + polarDoorPrice(r.day), 0);
}
