import { CARD_POOL, MAX_CARD_OVR, getCard, type ClubState } from './club';
import { levelInfo, xpForLevel } from './skills';
import { acceptOffer } from './career';
import { clubStrength, currentClubId, roleFor, wageFor } from './player';
import { uid } from './random';
import { applyChoice, seasonChoices, simulateToBreak } from './simple';
import { getClub } from '../data/leagues';
import type { Career, Offer } from './types';

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

/** Karriere vorspulen: so viele Saisons (oder bis zum Karriereende) automatisch durchspielen. */
export function devAdvance(prev: Career, seasons: number | 'end'): Career {
  if (prev.coach) return prev;
  let c = prev;
  const target = seasons === 'end' ? Infinity : prev.history.length + seasons;
  for (let i = 0; i < 600 && c.phase !== 'retired' && c.history.length < target; i++) {
    if (c.phase === 'window') {
      const ch = seasonChoices(c);
      if (!ch.length) break;
      const pick = seasons === 'end' && c.player.age >= 36
        ? ch.find((k) => k.kind === 'retire') ?? ch[0]
        : ch.find((k) => k.kind === 'stay' || k.kind === 'extend') ?? ch.find((k) => k.kind !== 'retire') ?? ch[0];
      c = applyChoice(c, pick);
    } else {
      const next = simulateToBreak(c);
      if (next === c) break;
      c = next;
    }
  }
  return c;
}

/** Wechsel erzwingen: im Sommer als normaler Transfer, während der Saison sofort (wie ein Winterwechsel). */
export function devTransfer(prev: Career, clubId: string): Career {
  if (prev.coach || prev.phase === 'retired' || clubId === currentClubId(prev.player)) return prev;
  const strength = clubStrength(prev, clubId);
  const offer: Offer = {
    id: uid(), type: 'Transfer', clubId, role: roleFor(prev.player.ovr, strength, prev.player.age),
    wage: wageFor(prev.player.ovr, strength), years: 3, fee: 0, message: 'Entwickler-Wechsel',
  };
  if (prev.phase === 'window') return acceptOffer(prev, offer);
  const career: Career = structuredClone(prev);
  const p = career.player;
  const from = currentClubId(p);
  p.contract = { clubId, yearsLeft: offer.years, wage: offer.wage, role: offer.role };
  p.loan = null;
  p.captainOf = null;
  const prog = career.progress;
  if (prog) {
    prog.cup.eligible = false;
    if (prog.euro) prog.euro.eligible = false;
    prog.keyMatch = null;
    prog.notes.push(`Entwickler-Wechsel: ${getClub(from).name} → ${getClub(clubId).name}.`);
  }
  career.updatedAt = Date.now();
  return career;
}

/** Versteckte Werte direkt setzen (Sucht, Spielsucht, Skandal). */
export function devFlags(prev: Career, patch: { hooked?: boolean; gambler?: boolean; scandal?: number }): Career {
  const career: Career = structuredClone(prev);
  if (patch.hooked !== undefined) career.player.hooked = patch.hooked;
  if (patch.gambler !== undefined) career.player.gambler = patch.gambler;
  if (patch.scandal !== undefined) career.scandal = patch.scandal;
  career.updatedAt = Date.now();
  return career;
}
