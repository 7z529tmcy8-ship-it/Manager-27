import { CARD_POOL, eventActive, openPack, PACKS, type ClubState, type CollectCard, type PackResult } from './club';

// ---------- Winter-Wunder: Adventskalender ----------
// Vom 1. bis 24. Dezember öffnet jeden Tag ein Türchen. Verpasste Türchen lassen sich nachholen,
// solange das Event läuft. Türchen 24 ist immer eine Winter-Wunder-Karte.

export type AdventReward = { day: number; kind: 'coins'; amount: number } | { day: number; kind: 'pack'; pack: string } | { day: number; kind: 'card' };

const PACK_DAYS: Record<number, string> = { 4: 'gold', 8: 'jumbo', 12: 'premium', 16: 'winter', 20: 'megagold', 22: 'winter' };

export const ADVENT: AdventReward[] = Array.from({ length: 24 }, (_, i) => {
  const day = i + 1;
  if (day === 24) return { day, kind: 'card' as const };
  if (PACK_DAYS[day]) return { day, kind: 'pack' as const, pack: PACK_DAYS[day] };
  return { day, kind: 'coins' as const, amount: 2000 + day * 400 };
});

/** Bis zu welchem Türchen heute geöffnet werden darf (0 = keins). */
export function adventToday(now = new Date()): number {
  if (!eventActive('winter', now) || now.getMonth() !== 11) return 0;
  return Math.min(24, now.getDate());
}

export const adventOpen = (club: Pick<ClubState, 'advent'>, day: number) => (club.advent ?? []).includes(day);

export interface AdventClaim { club: ClubState; coins?: number; pack?: { name: string; result: PackResult }; card?: CollectCard }

export function openAdventDoor(club: ClubState, day: number, now = new Date(), rand = Math.random): AdventClaim | null {
  if (day < 1 || day > adventToday(now) || adventOpen(club, day)) return null;
  const reward = ADVENT[day - 1];
  const opened = { ...club, advent: [...(club.advent ?? []), day] };
  if (reward.kind === 'coins') return { club: { ...opened, coins: opened.coins + reward.amount }, coins: reward.amount };
  if (reward.kind === 'pack') {
    const res = openPack(opened, reward.pack, rand, true);
    if (!res) return null;
    return { club: res.club, pack: { name: PACKS.find((p) => p.id === reward.pack)!.name, result: res.result } };
  }
  // Türchen 24: eine Winter-Karte, die man noch nicht hat (sonst die stärkste)
  const winter = CARD_POOL.filter((c) => c.variant === 'winter');
  const missing = winter.filter((c) => !(opened.cards[c.id] > 0));
  const pool = missing.length ? missing : winter;
  const card = pool[Math.floor(rand() * pool.length)];
  return { club: { ...opened, cards: { ...opened.cards, [card.id]: (opened.cards[card.id] ?? 0) + 1 } }, card };
}

// ---------- Silvester: Neujahrs-Geschenk ----------
/** Einmal während des Silvester-Events: ein Feuerwerks-Pack gratis. */
export const newYearGiftOpen = (club: Pick<ClubState, 'newYearClaimed'>, now = new Date()) => eventActive('silvester', now) && !club.newYearClaimed;

export function claimNewYearGift(club: ClubState, now = new Date(), rand = Math.random): { club: ClubState; result: PackResult } | null {
  if (!newYearGiftOpen(club, now)) return null;
  const res = openPack({ ...club, newYearClaimed: true }, 'silvester', rand, true);
  return res ? { club: res.club, result: res.result } : null;
}
