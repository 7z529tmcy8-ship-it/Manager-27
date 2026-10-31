import { CARD_POOL, type ClubState, type CollectCard, type PackResult } from './club';

// ---------- Codes im Shop ----------
// Jeder Code ist pro Spieler nur einmal einlösbar. Groß-/Kleinschreibung und Leerzeichen sind egal.

export type CodeTheme = 'meteor' | 'frost';
export type CodeReward = { kind: 'icons'; n: number; theme: 'meteor' } | { kind: 'frost'; theme: 'frost' };
const METEOR_CODE: CodeReward = { kind: 'icons', n: 10, theme: 'meteor' };
export const CODES: Record<string, CodeReward> = {
  // Meteor-Drop: 10 zufällige Ikonen mit Einschlag
  METEOR: METEOR_CODE,
  METEORRUSH: METEOR_CODE,
  KRATER: METEOR_CODE,
  STERNSCHNUPPE: METEOR_CODE,
  // Eissturm-Drop: 2 Winter-Wunder-Karten + 3 Topkarten ab 86, mit Frost-Animation
  EISSTURM: { kind: 'frost', theme: 'frost' },
};

export const normCode = (input: string) => input.trim().toUpperCase().replace(/\s+/g, '');

export type RedeemResult =
  | { ok: true; club: ClubState; result: PackResult; theme: CodeTheme }
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

/** Eissturm-Drop: 2 Winter-Wunder-Karten und 3 Topkarten ab 86 (keine Ikonen, keine eigenen Spieler), alle verschieden. */
export const FROST_WINTER = 2;
export const FROST_TOP = 3;
export function frostCards(rand = Math.random): CollectCard[] {
  const pick = (pool: CollectCard[], n: number, out: CollectCard[]) => {
    const start = out.length;
    for (let k = 0; k < 200 && out.length < start + Math.min(n, pool.length); k++) {
      const c = pool[Math.floor(rand() * pool.length)];
      if (!out.some((o) => o.id === c.id || o.name === c.name)) out.push(c);
    }
  };
  const out: CollectCard[] = [];
  pick(CARD_POOL.filter((c) => c.variant === 'winter'), FROST_WINTER, out);
  pick(CARD_POOL.filter((c) => c.ovr >= 86 && c.variant !== 'icon' && c.variant !== 'winter' && !c.avatar), FROST_TOP, out);
  return out.sort((a, b) => a.ovr - b.ovr);
}

/** Karten in die Sammlung legen. */
function grantCards(club: ClubState, list: CollectCard[]): { club: ClubState; result: PackResult } {
  const cards = { ...club.cards };
  const result: PackResult = { cards: [], items: [] };
  for (const c of list) {
    result.cards.push({ card: c, duplicate: (cards[c.id] ?? 0) > 0 });
    cards[c.id] = (cards[c.id] ?? 0) + 1;
  }
  return { club: { ...club, cards }, result };
}
const grantIcons = (club: ClubState, n: number, rand: () => number) => grantCards(club, randomIcons(n, rand));

export function redeemCode(club: ClubState, input: string, rand = Math.random): RedeemResult {
  const code = normCode(input);
  const reward = CODES[code];
  if (!reward) return { ok: false, reason: 'unknown' };
  if ((club.redeemedCodes ?? []).includes(code)) return { ok: false, reason: 'used' };
  const g = reward.kind === 'frost' ? grantCards(club, frostCards(rand)) : grantIcons(club, reward.n, rand);
  return { ok: true, club: { ...g.club, redeemedCodes: [...(club.redeemedCodes ?? []), code] }, result: g.result, theme: reward.theme };
}

/** Meteor-Drop: genau wie der Code METEOR – 10 zufällige Ikonen. */
export const METEOR_DROP_ICONS = 10;
export function openMeteorDrop(club: ClubState, rand = Math.random): { club: ClubState; result: PackResult } | null {
  if (!(club.meteorDrops ?? 0)) return null;
  const g = grantIcons({ ...club, meteorDrops: (club.meteorDrops ?? 0) - 1 }, METEOR_DROP_ICONS, rand);
  return g;
}
