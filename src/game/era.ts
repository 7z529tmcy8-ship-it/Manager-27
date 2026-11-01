import { ERA_PLAYERS, eraCardId } from '../data/eraCards';
import { PACKS, getCard, storePacks, type ClubState, type CollectCard } from './club';
import { eraOf } from './eraTime';

// ---------- Ära-Event „Zeitreise“: Event-Pfad ----------
// 40 Stufen, jede kostet 3 Zeit-Splitter. Jede 4. Stufe ist eine Ära-Karte (10 insgesamt), dazwischen Coins, Drops und Packs.

export const ERA_STEPS = 40;
export const STEP_COST = 3;

export type EraReward =
  | { kind: 'card'; id: string }
  | { kind: 'coins'; amount: number }
  | { kind: 'drop'; mega?: boolean }
  | { kind: 'pack'; pack: string };

/** Belohnung einer Stufe (1–40). */
export function eraReward(step: number): EraReward {
  if (step % 4 === 0) return { kind: 'card', id: eraCardId(ERA_PLAYERS[step / 4 - 1].name) };
  const r = step % 4;
  if (r === 1) return { kind: 'coins', amount: 10_000 + Math.floor(step / 4) * 2_500 };
  if (r === 2) return step === 22 || step === 38 ? { kind: 'drop', mega: true } : { kind: 'drop' };
  return { kind: 'pack', pack: step >= 35 ? 'ultimate' : step % 8 === 3 ? 'gold' : 'premium' };
}
export const eraRewardText = (r: EraReward) =>
  r.kind === 'card' ? getCard(r.id)?.name ?? 'Ära-Karte'
    : r.kind === 'coins' ? `${r.amount.toLocaleString('de-DE')} Coins`
      : r.kind === 'drop' ? (r.mega ? 'Mega-Drop' : 'Flutlicht-Drop')
        : PACKS.find((p) => p.id === r.pack)?.name ?? 'Pack';

/** Wie viele Stufen man mit den Splittern erreicht hat (abgeholt oder nicht). */
export const eraReached = (club: Pick<ClubState, 'aera'>) => Math.min(ERA_STEPS, Math.floor(eraOf(club).shards / STEP_COST));
export const eraReady = (club: Pick<ClubState, 'aera'>) => eraReached(club) - eraOf(club).claimed;

/** Alle erreichten Stufen abholen. Gibt die Belohnungen und neue Ära-Karten zurück. */
export function claimEra(club: ClubState, now = Date.now()): { club: ClubState; rewards: EraReward[]; cards: CollectCard[] } {
  const e = eraOf(club);
  const upto = eraReached(club);
  if (upto <= e.claimed) return { club, rewards: [], cards: [] };
  let c: ClubState = { ...club, cards: { ...club.cards } };
  const rewards: EraReward[] = [];
  const cards: CollectCard[] = [];
  const packs: string[] = [];
  for (let s = e.claimed + 1; s <= upto; s++) {
    const r = eraReward(s);
    rewards.push(r);
    if (r.kind === 'card') { c.cards[r.id] = (c.cards[r.id] ?? 0) + 1; const card = getCard(r.id); if (card) cards.push(card); }
    else if (r.kind === 'coins') c.coins += r.amount;
    else if (r.kind === 'drop') c = r.mega ? { ...c, megaDrops: (c.megaDrops ?? 0) + 1 } : { ...c, drops: (c.drops ?? 0) + 1 };
    else packs.push(r.pack);
  }
  if (packs.length) c = storePacks(c, packs, 'Zeitreise', now);
  return { club: { ...c, aera: { ...e, claimed: upto } }, rewards, cards };
}

