import { eventActive, getCard, GIG_CARD_ID, openPack, PACKS, type ClubState, type CollectCard, type PackResult } from './club';

// ---------- GIG-Event: Glücksrad ----------
// Jeden Tag ein Gratis-Dreh, danach kostet jeder Dreh Coins. Fast jedes Feld ist ein starkes Pack,
// die GIG-Karte (95) hat ein winziges Feld. Die Chancen stehen offen im Event.

export const GIG_SPIN_PRICE = 25_000;
/** Was es gibt, wenn man die GIG-Karte schon hat. */
export const GIG_DUPLICATE_COINS = 100_000;

export type GigPrize =
  | { id: string; kind: 'pack'; pack: string; weight: number }
  | { id: string; kind: 'card'; weight: number };

/** Gewichte in Promille (zusammen 1000). Reihenfolge = Reihenfolge auf dem Rad. */
export const GIG_WHEEL: GigPrize[] = [
  { id: 'premium', kind: 'pack', pack: 'premium', weight: 190 },
  { id: 'worldstar', kind: 'pack', pack: 'worldstar', weight: 90 },
  { id: 'flashback', kind: 'pack', pack: 'flashback', weight: 140 },
  { id: 'gig', kind: 'card', weight: 5 },
  { id: 'megagold', kind: 'pack', pack: 'megagold', weight: 160 },
  { id: 'icon', kind: 'pack', pack: 'icon', weight: 55 },
  { id: 'comeback', kind: 'pack', pack: 'comeback', weight: 150 },
  { id: 'ultimate', kind: 'pack', pack: 'ultimate', weight: 45 },
  { id: 'debut', kind: 'pack', pack: 'debut', weight: 145 },
  { id: 'goat', kind: 'pack', pack: 'goat', weight: 20 },
];

export const gigPercent = (p: GigPrize) => p.weight / 10;
export const gigLabel = (p: GigPrize) => (p.kind === 'card' ? 'GIG-Karte 95' : PACKS.find((x) => x.id === p.pack)!.name);
export const gigCard = () => getCard(GIG_CARD_ID)!;

const today = (now: Date) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
export const gigFreeSpin = (club: Pick<ClubState, 'gig'>, now = new Date()) => club.gig?.freeDay !== today(now);

export interface GigSpin { club: ClubState; index: number; prize: GigPrize; result: PackResult; name: string; duplicateCoins?: number }

/** Einmal drehen. null, wenn das Event vorbei ist oder die Coins fehlen. */
export function spinGig(club: ClubState, now = new Date(), rand = Math.random): GigSpin | null {
  if (!eventActive('gig', now)) return null;
  const free = gigFreeSpin(club, now);
  if (!free && club.coins < GIG_SPIN_PRICE) return null;
  let roll = rand() * 1000;
  let index = GIG_WHEEL.length - 1;
  for (let i = 0; i < GIG_WHEEL.length; i++) {
    roll -= GIG_WHEEL[i].weight;
    if (roll < 0) { index = i; break; }
  }
  const prize = GIG_WHEEL[index];
  const paid: ClubState = {
    ...club,
    coins: club.coins - (free ? 0 : GIG_SPIN_PRICE),
    gig: { freeDay: free ? today(now) : club.gig?.freeDay, spins: (club.gig?.spins ?? 0) + 1 },
  };
  if (prize.kind === 'card') {
    const card: CollectCard = gigCard();
    const have = (paid.cards[card.id] ?? 0) > 0;
    return {
      club: { ...paid, cards: { ...paid.cards, [card.id]: (paid.cards[card.id] ?? 0) + 1 }, coins: paid.coins + (have ? GIG_DUPLICATE_COINS : 0) },
      index, prize, name: 'GIG-Jackpot', result: { cards: [{ card, duplicate: have }], items: [] }, duplicateCoins: have ? GIG_DUPLICATE_COINS : undefined,
    };
  }
  const res = openPack(paid, prize.pack, rand, true)!;
  return { club: res.club, index, prize, result: res.result, name: gigLabel(prize) };
}
