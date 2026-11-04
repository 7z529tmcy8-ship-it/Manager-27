import { JUNGLE_PLAYERS, jungleCardId } from '../data/jungleCards';
import { CARD_POOL, PACKS, cardForGifts, getCard, storePacks, type ClubState, type CollectCard, type PackResult } from './club';
import { jungleOf } from './eraTime';

// ---------- Event „Jungle Crash“: Bananen-Pfad ----------
// 30 Stufen, jede kostet 3 Bananen. Jede 5. Stufe ist eine Dschungel-Karte (6 insgesamt), dazwischen Coins, Drops, Packs.

export const JUNGLE_STEPS = 30;
export const JUNGLE_COST = 3;

export type JungleReward =
  | { kind: 'card'; id: string }
  | { kind: 'coins'; amount: number }
  | { kind: 'drop'; mega?: boolean }
  | { kind: 'pack'; pack: string };

export function jungleReward(step: number): JungleReward {
  if (step % 5 === 0) return { kind: 'card', id: jungleCardId(JUNGLE_PLAYERS[step / 5 - 1][0]) };
  const r = step % 5;
  if (r === 1) return { kind: 'coins', amount: 8_000 + Math.floor(step / 5) * 3_000 };
  if (r === 2) return { kind: 'drop', mega: step === 22 };
  if (r === 3) return { kind: 'pack', pack: step >= 23 ? 'ultimate' : 'premium' };
  return { kind: 'coins', amount: 12_000 + Math.floor(step / 5) * 4_000 };
}
export const jungleRewardText = (r: JungleReward) =>
  r.kind === 'card' ? getCard(r.id)?.name ?? 'Dschungel-Karte'
    : r.kind === 'coins' ? `${r.amount.toLocaleString('de-DE')} Coins`
      : r.kind === 'drop' ? (r.mega ? 'Mega-Drop' : 'Flutlicht-Drop')
        : PACKS.find((p) => p.id === r.pack)?.name ?? 'Pack';

export const jungleReached = (club: Pick<ClubState, 'jungle'>) => Math.min(JUNGLE_STEPS, Math.floor(jungleOf(club).bananas / JUNGLE_COST));
export const jungleReady = (club: Pick<ClubState, 'jungle'>) => jungleReached(club) - jungleOf(club).claimed;

export function claimJungle(club: ClubState, now = Date.now()): { club: ClubState; rewards: JungleReward[]; cards: CollectCard[] } {
  const j = jungleOf(club);
  const upto = jungleReached(club);
  if (upto <= j.claimed) return { club, rewards: [], cards: [] };
  let c: ClubState = { ...club, cards: { ...club.cards } };
  const rewards: JungleReward[] = [];
  const cards: CollectCard[] = [];
  const packs: string[] = [];
  for (let s = j.claimed + 1; s <= upto; s++) {
    const r = jungleReward(s);
    rewards.push(r);
    if (r.kind === 'card') { c.cards[r.id] = (c.cards[r.id] ?? 0) + 1; const card = getCard(r.id); if (card) cards.push(card); }
    else if (r.kind === 'coins') c.coins += r.amount;
    else if (r.kind === 'drop') c = r.mega ? { ...c, megaDrops: (c.megaDrops ?? 0) + 1 } : { ...c, drops: (c.drops ?? 0) + 1 };
    else packs.push(r.pack);
  }
  if (packs.length) c = storePacks(c, packs, 'Jungle Crash', now);
  return { club: { ...c, jungle: { ...j, claimed: upto } }, rewards, cards };
}

/**
 * Absturz-Kiste (Code JUNGLECRASH): 1 Dschungel-Karte – bevorzugt eine, die man noch nicht hat –
 * und 2 Topkarten ab 85 (keine Karten aus laufenden oder kommenden Events).
 */
export function jungleCrate(club: ClubState, rand = Math.random, now = new Date()): CollectCard[] {
  const all = JUNGLE_PLAYERS.map(([n]) => getCard(jungleCardId(n))).filter((c): c is CollectCard => !!c);
  const fresh = all.filter((c) => !((club.cards[c.id] ?? 0) > 0));
  const from = fresh.length ? fresh : all;
  const out: CollectCard[] = [from[Math.floor(rand() * from.length)]];
  const top = CARD_POOL.filter((c) => c.ovr >= 85 && !c.avatar && cardForGifts(c, now));
  while (out.length < 3 && top.length) {
    const c = top.splice(Math.floor(rand() * top.length), 1)[0];
    if (!out.some((o) => o.name === c.name)) out.push(c);
  }
  return out.sort((a, b) => a.ovr - b.ovr);
}
export type CrateResult = PackResult;
