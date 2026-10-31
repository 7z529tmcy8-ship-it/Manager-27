import { getClub } from '../data/leagues';
import { REAL_PLAYERS, type RealPlayerTemplate } from '../data/players';
import type { ClubState, CollectCard } from './club';
import { cardAttrs } from './squad';

// ---------- Höher oder Tiefer (nach MADFUT) ----------
// Eigener Modus ohne Coins: Ist der nächste echte Spieler höher oder tiefer bewertet?
// Von der verdeckten Karte sieht man Position und zwei Werte. Gleichstand zählt nicht – neue Karte, die Serie bleibt.
// Alle 10 Richtigen am Stück gibt es einen Punkt. Mit Punkten entwickelt man drei junge Talente (+3 pro Upgrade).

export interface DuelCard { p: RealPlayerTemplate; card: CollectCard; attrs: number[] }

/** Feste Karten-ID je Spieler – die Werte hängen an der ID und dürfen nicht springen. */
const duelCard = (p: RealPlayerTemplate): DuelCard => {
  const card: CollectCard = {
    id: `duel-${p.name}`, name: p.name, position: p.position, nation: p.nation, club: '', ovr: p.ovr,
    variant: p.ovr >= 85 ? 'gold-rare' : p.ovr >= 75 ? 'gold' : 'silver',
  };
  return { p, card, attrs: cardAttrs(card) };
};
let pool: DuelCard[] | null = null;
export const duelPool = (): DuelCard[] => (pool ??= REAL_PLAYERS.map(duelCard));
export const drawDuel = (rand = Math.random, list = duelPool()) => list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
/** Spannung: Die nächste Karte liegt immer nah an der offenen (±4 Wertungspunkte, nie derselbe Spieler). */
export const DUEL_RANGE = 4;
export const duelNear = (cur: DuelCard, list = duelPool()) => list.filter((x) => x !== cur && Math.abs(x.p.ovr - cur.p.ovr) <= DUEL_RANGE);
export const drawDuelNext = (cur: DuelCard, rand = Math.random) => drawDuel(rand, duelNear(cur));
/** Zwei verschiedene Werte der verdeckten Karte, die aufgedeckt werden. */
export function duelHints(rand = Math.random): [number, number] {
  const a = Math.floor(rand() * 6);
  const b = (a + 1 + Math.floor(rand() * 5)) % 6;
  return [a, b];
}
/** Karte mit Vereinsnamen für die Anzeige. */
export const shownDuelCard = (d: DuelCard): CollectCard => ({ ...d.card, club: getClub(d.p.clubId).name });

export type HiLo = 'higher' | 'lower';
export type HiLoOutcome = 'right' | 'wrong' | 'tie';
export const judge = (cur: DuelCard, next: DuelCard, dir: HiLo): HiLoOutcome =>
  next.p.ovr === cur.p.ovr ? 'tie' : (dir === 'higher') === (next.p.ovr > cur.p.ovr) ? 'right' : 'wrong';

// ---------- Serie, Punkte, Talente ----------
export const STREAK_FOR_POINT = 10;
export const HILO_STEP = 3;
export const HILO_MAX_LEVEL = 8;
/** Die drei Talente, die man mit Punkten entwickelt. */
export const HILO_TALENTS = ['Max Dowman', 'Lennart Karl', 'Xavi Espart'];
/** Kosten für das nächste Upgrade: das 1. kostet 1 Punkt, das 2. kostet 2 … */
export const upgradeCost = (level: number) => level + 1;

export interface HiloState { points: number; streak: number; best: number; levels: Record<string, number> }
export const hiloOf = (club: Pick<ClubState, 'hilo'>): HiloState => club.hilo ?? { points: 0, streak: 0, best: 0, levels: {} };

/** Antwort werten: richtig → Serie +1 (alle 10 ein Punkt), falsch → Serie weg, Gleichstand → nichts passiert. */
export function answerHilo(club: ClubState, outcome: HiLoOutcome): { club: ClubState; point: boolean } {
  const h = hiloOf(club);
  if (outcome === 'tie') return { club, point: false };
  if (outcome === 'wrong') return { club: { ...club, hilo: { ...h, streak: 0 } }, point: false };
  const streak = h.streak + 1;
  const point = streak % STREAK_FOR_POINT === 0;
  return { club: { ...club, hilo: { ...h, streak, best: Math.max(h.best, streak), points: h.points + (point ? 1 : 0) } }, point };
}

/** Karte eines Talents auf seiner aktuellen Stufe. */
export function hiloCard(name: string, level: number): CollectCard {
  const p = REAL_PLAYERS.find((x) => x.name === name)!;
  const club = getClub(p.clubId);
  return {
    id: `hilo-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`, name: p.name, position: p.position, nation: p.nation, club: club.name,
    age: p.age, ovr: p.ovr + level * HILO_STEP, variant: 'serie', label: level ? `Stufe ${level}` : 'Serien-Talent',
  };
}
export const hiloCards = (club: Pick<ClubState, 'hilo'>) => HILO_TALENTS.map((n) => ({ name: n, level: hiloOf(club).levels[n] ?? 0, card: hiloCard(n, hiloOf(club).levels[n] ?? 0) }));

/** Die drei Talente liegen in der Sammlung – immer auf ihrer aktuellen Stufe. */
export function syncHiloCards(club: ClubState): ClubState {
  const cards = hiloCards(club).map((x) => x.card);
  const ids = new Set(cards.map((c) => c.id));
  const specials = [...club.specials.filter((c) => !ids.has(c.id)), ...cards];
  const same = cards.every((c) => club.specials.some((s) => s.id === c.id && s.ovr === c.ovr));
  return same ? club : { ...club, specials };
}

export function upgradeHilo(club: ClubState, name: string): ClubState | null {
  const h = hiloOf(club);
  const level = h.levels[name] ?? 0;
  const cost = upgradeCost(level);
  if (!HILO_TALENTS.includes(name) || level >= HILO_MAX_LEVEL || h.points < cost) return null;
  return syncHiloCards({ ...club, hilo: { ...h, points: h.points - cost, levels: { ...h.levels, [name]: level + 1 } } });
}
