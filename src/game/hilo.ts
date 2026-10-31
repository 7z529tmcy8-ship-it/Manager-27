import { getClub } from '../data/leagues';
import { REAL_PLAYERS } from '../data/players';
import { CARD_POOL, type ClubState, type CollectCard } from './club';
import { MOMENTS } from './legendTrades';
import { cardAttrs } from './squad';

// ---------- Höher oder Tiefer (nach MADFUT) ----------
// Eigener Modus ohne Coins: Ist die nächste Karte höher oder tiefer bewertet? Gezogen wird aus allen Karten des Spiels
// (echte Spieler, Ikonen, Sonderkarten, SBC-Karten) – die Talente zum Entwickeln sind davon getrennt.
// Wie bei MADFUT: Die nächste Karte ist offen (Name, Verein, Nation), nur der gefragte Wert ist verdeckt.
// Jede Runde geht es um einen anderen Wert. Gleichstand zählt nicht – neue Karte, die Serie bleibt.
// Alle 5 Richtigen am Stück gibt es einen Punkt. Mit Punkten entwickelt man drei junge Talente (+3 pro Upgrade).

export interface DuelCard { card: CollectCard; attrs: number[] }

const duelCard = (card: CollectCard): DuelCard => ({ card, attrs: cardAttrs(card) });
/** Alle Karten des Spiels (ohne eigene Spieler mit Gesicht), jede Karten-ID nur einmal. */
let pool: DuelCard[] | null = null;
export const duelPool = (): DuelCard[] => {
  if (pool) return pool;
  const seen = new Set<string>();
  pool = [...CARD_POOL, ...MOMENTS.map((m) => m.reward)]
    .filter((c) => !c.avatar && !seen.has(c.id) && seen.add(c.id))
    .map(duelCard);
  return pool;
};
const any = <T>(list: T[], rand: () => number) => list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
/**
 * Erst eine Kartenart ziehen (Silber, Gold, Ikone, Sonderkarten …), dann eine Karte daraus.
 * Sonst kämen wegen der vielen normalen Spieler fast nur Silber- und Goldkarten.
 */
export function drawDuel(rand = Math.random, list = duelPool()): DuelCard {
  const kinds = [...new Set(list.map((d) => d.card.variant))];
  const kind = any(kinds, rand);
  return any(list.filter((d) => d.card.variant === kind), rand);
}
/** Spannung: Die nächste Karte liegt immer nah an der offenen (±4 Wertungspunkte, nie derselbe Spieler). */
export const DUEL_RANGE = 4;
export const duelNear = (cur: DuelCard, list = duelPool()) => list.filter((x) => x !== cur && Math.abs(x.card.ovr - cur.card.ovr) <= DUEL_RANGE);
export const drawDuelNext = (cur: DuelCard, rand = Math.random) => drawDuel(rand, duelNear(cur));
/** Karte für die Anzeige – genau so, wie sie im Spiel aussieht. */
export const shownDuelCard = (d: DuelCard): CollectCard => d.card;

export type HiLo = 'higher' | 'lower';
export type HiLoOutcome = 'right' | 'wrong' | 'tie';
/** Worum es in einer Runde geht: die Gesamtwertung oder ein Feldspieler-Wert (Index wie auf der Karte). */
export type HiloStat = 'ovr' | number;
export const STAT_NAMES = ['Tempo', 'Schuss', 'Passen', 'Dribbling', 'Defensive', 'Physis'];
export const statName = (s: HiloStat) => (s === 'ovr' ? 'Gesamtwertung' : STAT_NAMES[s]);
export const statValue = (d: DuelCard, s: HiloStat) => (s === 'ovr' ? d.card.ovr : d.attrs[s]);
/** Wie bei MADFUT: Mal die Gesamtwertung, mal ein einzelner Wert. Ist ein Torhüter dabei, immer die Gesamtwertung (andere Werte). */
export function pickStat(cur: DuelCard, next: DuelCard, rand = Math.random): HiloStat {
  if (cur.card.position === 'TW' || next.card.position === 'TW') return 'ovr';
  return rand() < 0.3 ? 'ovr' : Math.floor(rand() * STAT_NAMES.length);
}
export const judge = (cur: DuelCard, next: DuelCard, dir: HiLo, stat: HiloStat = 'ovr'): HiLoOutcome => {
  const a = statValue(cur, stat);
  const b = statValue(next, stat);
  return a === b ? 'tie' : (dir === 'higher') === (b > a) ? 'right' : 'wrong';
};

// ---------- Serie, Punkte, Talente ----------
export const STREAK_FOR_POINT = 5;
export const HILO_STEP = 3;
export const HILO_MAX_LEVEL = 8;
/** Die drei Talente, die man mit Punkten entwickelt. */
export const HILO_TALENTS = ['Max Dowman', 'Lennart Karl', 'Xavi Espart'];
/** Kosten für das nächste Upgrade: das 1. kostet 1 Punkt, das 2. kostet 2 … */
export const upgradeCost = (level: number) => level + 1;

export interface HiloState { points: number; streak: number; best: number; levels: Record<string, number> }
export const hiloOf = (club: Pick<ClubState, 'hilo'>): HiloState => club.hilo ?? { points: 0, streak: 0, best: 0, levels: {} };

/** Antwort werten: richtig → Serie +1 (alle 5 ein Punkt), falsch → Serie weg, Gleichstand → nichts passiert. */
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
