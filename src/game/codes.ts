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

export function redeemCode(club: ClubState, input: string, rand = Math.random): RedeemResult {
  const code = normCode(input);
  const reward = CODES[code];
  if (!reward) return { ok: false, reason: 'unknown' };
  if ((club.redeemedCodes ?? []).includes(code)) return { ok: false, reason: 'used' };
  const cards = { ...club.cards };
  const result: PackResult = { cards: [], items: [] };
  for (const c of randomIcons(reward.n, rand)) {
    result.cards.push({ card: c, duplicate: (cards[c.id] ?? 0) > 0 });
    cards[c.id] = (cards[c.id] ?? 0) + 1;
  }
  return { ok: true, club: { ...club, cards, redeemedCodes: [...(club.redeemedCodes ?? []), code] }, result, theme: reward.theme };
}
