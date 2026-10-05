import { CARD_POOL, MAX_CARD_OVR, getCard, type ClubState } from './club';
import { levelInfo, xpForLevel } from './skills';
import type { Career } from './types';

// Entwickler-Werkzeuge (freigeschaltet mit dem Code in den Einstellungen). Nur zum Ausprobieren –
// alles wirkt direkt auf den Spielstand in diesem Browser.

export const DEV_CODE = 'vogue';
export const isDevCode = (input: string) => input.trim().toLowerCase() === DEV_CODE;

/** „Unendlich“ Coins: so viele, dass man sie nie ausgeben kann. */
export const INFINITE_COINS = 999_999_999;

export const devCoins = (club: ClubState, coins: number): ClubState => ({ ...club, coins });

/** Jede Karte des Spiels einmal in die Sammlung (vorhandene bleiben). */
export function devAllCards(club: ClubState): ClubState {
  const cards = { ...club.cards };
  for (const c of CARD_POOL) cards[c.id] = Math.max(1, cards[c.id] ?? 0);
  return { ...club, cards };
}

/** Alle Karten der Sammlung auf 99 verbessern. */
export function devMaxCards(club: ClubState): ClubState {
  const upgrades = { ...(club.upgrades ?? {}) };
  for (const id of Object.keys(club.cards)) {
    const c = getCard(id);
    if (c) upgrades[id] = Math.max(0, MAX_CARD_OVR - c.ovr);
  }
  return { ...club, upgrades };
}

/** Karriere: so viele Level dazu (EP werden passend aufgefüllt). */
export function devLevels(prev: Career, levels: number): Career {
  const sk = prev.player.skills;
  if (!sk) return prev;
  const career: Career = structuredClone(prev);
  const s = career.player.skills!;
  const start = levelInfo(s.xp);
  let add = start.need - start.into;
  for (let l = start.level + 1; l < start.level + levels; l++) add += xpForLevel(l);
  s.xp += add;
  career.updatedAt = Date.now();
  return career;
}

/** Karriere: Gesamtwertung (und Potenzial) setzen. */
export function devOvr(prev: Career, ovr: number): Career {
  const career: Career = structuredClone(prev);
  career.player.ovr = Math.max(40, Math.min(99, ovr));
  career.player.potential = Math.max(career.player.potential, career.player.ovr);
  career.updatedAt = Date.now();
  return career;
}
