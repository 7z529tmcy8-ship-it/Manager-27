import { CARD_POOL, cardReleased, type ClubState, type CollectCard, type PackResult } from './club';

// ---------- Codes im Shop ----------
// Codes lassen sich beliebig oft einlösen. Groß-/Kleinschreibung und Leerzeichen sind egal.
// redeemedCodes merkt sich nur, welche Codes man schon einmal benutzt hat (für Banner und Titel im Profil).

export type CodeTheme = 'meteor' | 'frost' | 'vault';
export type CodeReward = { kind: 'icons'; n: number; theme: 'meteor' } | { kind: 'frost'; theme: 'frost' } | { kind: 'vault'; theme: 'vault' };
const METEOR_CODE: CodeReward = { kind: 'icons', n: 10, theme: 'meteor' };
export const CODES: Record<string, CodeReward> = {
  // Meteor-Drop: 10 zufällige Ikonen mit Einschlag
  METEOR: METEOR_CODE,
  METEORRUSH: METEOR_CODE,
  KRATER: METEOR_CODE,
  STERNSCHNUPPE: METEOR_CODE,
  // Eissturm-Drop: 2 Winter-Wunder-Karten + 3 Topkarten ab 86, mit Frost-Animation
  EISSTURM: { kind: 'frost', theme: 'frost' },
  // Tresor-Drop: 5 Karten, die man garantiert noch nicht hat (eine davon ab 88)
  TRESOR: { kind: 'vault', theme: 'vault' },
};

export const normCode = (input: string) => input.trim().toUpperCase().replace(/\s+/g, '');

export type RedeemResult =
  | { ok: true; club: ClubState; result: PackResult; theme: CodeTheme }
  | { ok: false; reason: 'unknown' };

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

/** Tresor-Drop: 5 Karten, die noch nicht in der Sammlung sind – eine ab 88, vier ab 78. Ist zu wenig übrig, wird mit allem Fehlenden aufgefüllt. */
export const VAULT_CARDS = 5;
export function vaultCards(club: ClubState, rand = Math.random): CollectCard[] {
  const missing = CARD_POOL.filter((c) => !c.avatar && cardReleased(c) && !((club.cards[c.id] ?? 0) > 0));
  const out: CollectCard[] = [];
  const take = (pool: CollectCard[], n: number) => {
    const list = pool.filter((c) => !out.some((o) => o.id === c.id));
    for (let i = 0; i < n && list.length; i++) out.push(list.splice(Math.floor(rand() * list.length), 1)[0]);
  };
  take(missing.filter((c) => c.ovr >= 88), 1);
  take(missing.filter((c) => c.ovr >= 78), VAULT_CARDS - out.length);
  take(missing, VAULT_CARDS - out.length);
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
  const g = reward.kind === 'frost' ? grantCards(club, frostCards(rand)) : reward.kind === 'vault' ? grantCards(club, vaultCards(club, rand)) : grantIcons(club, reward.n, rand);
  const used = club.redeemedCodes ?? [];
  return { ok: true, club: { ...g.club, redeemedCodes: used.includes(code) ? used : [...used, code] }, result: g.result, theme: reward.theme };
}

/** Meteor-Drop: genau wie der Code METEOR – 10 zufällige Ikonen. */
export const METEOR_DROP_ICONS = 10;
export function openMeteorDrop(club: ClubState, rand = Math.random): { club: ClubState; result: PackResult } | null {
  if (!(club.meteorDrops ?? 0)) return null;
  const g = grantIcons({ ...club, meteorDrops: (club.meteorDrops ?? 0) - 1 }, METEOR_DROP_ICONS, rand);
  return g;
}
