import { CARD_POOL, type ClubState, type CollectCard, type PackResult } from './club';

// ---------- Codes im Shop ----------
// Jeder Code ist pro Spieler nur einmal einlösbar. Groß-/Kleinschreibung und Leerzeichen sind egal.

export type CodeReward = { kind: 'icons'; n: number; theme: 'meteor' };
export const CODES: Record<string, CodeReward> = {
  METEOR: { kind: 'icons', n: 10, theme: 'meteor' },
};

export const normCode = (input: string) => input.trim().toUpperCase().replace(/\s+/g, '');

export type RedeemResult =
  | { ok: true; club: ClubState; result: PackResult; theme: 'meteor' }
  | { ok: false; reason: 'unknown' | 'used' };

/** n verschiedene Ikonen per Zufall. */
export function randomIcons(n: number, rand = Math.random): CollectCard[] {
  const pool = CARD_POOL.filter((c) => c.variant === 'icon');
  const out: CollectCard[] = [];
  while (out.length < Math.min(n, pool.length)) {
    const c = pool[Math.floor(rand() * pool.length)];
    if (!out.some((o) => o.id === c.id)) out.push(c);
  }
  return out.sort((a, b) => a.ovr - b.ovr);
}

/** n zufällige Ikonen in die Sammlung legen. */
function grantIcons(club: ClubState, n: number, rand: () => number): { club: ClubState; result: PackResult } {
  const cards = { ...club.cards };
  const result: PackResult = { cards: [], items: [] };
  for (const c of randomIcons(n, rand)) {
    result.cards.push({ card: c, duplicate: (cards[c.id] ?? 0) > 0 });
    cards[c.id] = (cards[c.id] ?? 0) + 1;
  }
  return { club: { ...club, cards }, result };
}

export function redeemCode(club: ClubState, input: string, rand = Math.random): RedeemResult {
  const code = normCode(input);
  const reward = CODES[code];
  if (!reward) return { ok: false, reason: 'unknown' };
  if ((club.redeemedCodes ?? []).includes(code)) return { ok: false, reason: 'used' };
  const g = grantIcons(club, reward.n, rand);
  return { ok: true, club: { ...g.club, redeemedCodes: [...(club.redeemedCodes ?? []), code] }, result: g.result, theme: reward.theme };
}

/** Meteor-Drop: genau wie der Code METEOR – 10 zufällige Ikonen. */
export const METEOR_DROP_ICONS = 10;
export function openMeteorDrop(club: ClubState, rand = Math.random): { club: ClubState; result: PackResult } | null {
  if (!(club.meteorDrops ?? 0)) return null;
  const g = grantIcons({ ...club, meteorDrops: (club.meteorDrops ?? 0) - 1 }, METEOR_DROP_ICONS, rand);
  return g;
}
