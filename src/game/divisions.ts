import type { ClubState, CollectCard } from './club';
import { clamp, poisson, randInt } from './random';
import { DUEL_STRENGTH, cardAttrs, cardById, duelPoints, seasonId, slotsOf, teamStrength, type DuelResult } from './squad';

// ---------- Duell-Divisionen ----------
// Statt einer festen Stufen-Leiter spielt man in Divisionen: Division 10 (unten) bis Division 1, darüber die Elite.
// Sieg +2, Unentschieden +1, Niederlage −1 Fortschritt. Bei 6 steigt man auf, unter 0 steigt man ab –
// außer in den Sicherheitsstufen (10, 7, 4). Den Gegner gibt es immer nur einzeln, er wird gespeichert
// (Neuladen würfelt keinen leichteren aus). Vor jedem Spiel wählt man eine Taktik gegen den Spielstil des Gegners.

/** Division 10 … 1, 0 = Elite. */
export const ELITE = 0;
export const LOWEST = 10;
export const PROMOTE_AT = 6;
export const SAFE_DIVISIONS = [10, 7, 4];

export type Style = 'pressing' | 'konter' | 'ballbesitz';
export type Tactic = Style | 'ausgewogen';

export interface DivOpponent {
  name: string;
  strength: number;
  /** Wie der Gegner wirklich spielt. */
  style: Style;
  /** Was der Scouting-Bericht anzeigt (stimmt meistens). */
  hint: Style;
}

export interface DivisionState {
  div: number;
  pts: number;
  /** Beste je erreichte Division (kleiner = besser). */
  best: number;
  /** Divisionen, für deren erstes Erreichen es schon den Aufstiegsbonus gab. */
  rewarded?: number[];
  next?: DivOpponent;
}

export const divName = (div: number) => (div === ELITE ? 'Elite' : `Division ${div}`);
/** Schwierigkeit 1 (Division 10) bis 11 (Elite) – für Punkte, Pass-XP und Evolutions. */
export const divLevel = (div: number) => LOWEST + 1 - div;
const DIV_STRENGTH = [...DUEL_STRENGTH, 113];
export const divStrength = (div: number) => DIV_STRENGTH[divLevel(div) - 1];
export const divReward = (div: number) => 600 + divLevel(div) * 450;
/** Einmaliger Bonus beim ersten Aufstieg in eine Division. */
export const promoBonus = (div: number) => 1_500 * divLevel(div);

/** Vorhandene Spielstände: Die alte Stufe wird zur Division (Stufe 10 → Division 1). */
export function divisionOf(club: Pick<ClubState, 'division' | 'duelLevel'>): DivisionState {
  if (club.division) return club.division;
  const div = clamp(LOWEST + 1 - (club.duelLevel || 1), 1, LOWEST);
  return { div, pts: 0, best: div };
}

export const STYLE_LABEL: Record<Tactic, string> = { pressing: 'Pressing', konter: 'Konter', ballbesitz: 'Ballbesitz', ausgewogen: 'Ausgewogen' };
export const TACTIC_TEXT: Record<Tactic, string> = {
  pressing: 'Hoch anlaufen – stark gegen Ballbesitz, anfällig für Konter',
  konter: 'Tief stehen, schnell umschalten – stark gegen Pressing, schwach gegen Ballbesitz',
  ballbesitz: 'Ball laufen lassen – stark gegen Konter, schwach gegen Pressing',
  ausgewogen: 'Kein Risiko – kein Bonus, kein Malus',
};
/** Wer schlägt wen: Pressing > Ballbesitz > Konter > Pressing. */
const BEATS: Record<Style, Style> = { pressing: 'ballbesitz', ballbesitz: 'konter', konter: 'pressing' };
export const TACTIC_EDGE = 4;

/** Taktik gegen Spielstil: +4 wenn sie passt, −4 wenn sie ausgekontert wird, sonst 0. */
export function tacticEdge(t: Tactic, style: Style): number {
  if (t === 'ausgewogen' || t === style) return 0;
  return BEATS[t] === style ? TACTIC_EDGE : -TACTIC_EDGE;
}

/** Passt die Taktik zur Elf? Pressing braucht Physis und Defensive, Konter Tempo, Ballbesitz Passen und Dribbeln. Höchstens ±1,5. */
export function squadFit(t: Tactic, cards: (CollectCard | null)[]): number {
  if (t === 'ausgewogen') return 0;
  // Reihenfolge der Werte bei Feldspielern: TEM, SCH, PAS, DRI, DEF, PHY
  const idx = t === 'pressing' ? [4, 5] : t === 'konter' ? [0] : [2, 3];
  const vals = cards.filter((c): c is CollectCard => !!c && c.position !== 'TW').flatMap((c) => { const a = cardAttrs(c); return idx.map((i) => a[i]); });
  if (!vals.length) return 0;
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  return Math.round(clamp((avg - 78) / 6, -1.5, 1.5) * 10) / 10;
}

const STYLES: Style[] = ['pressing', 'konter', 'ballbesitz'];
const PREFIX = ['Rote', 'Blaue', 'Goldene', 'Schwarze', 'Eiserne', 'Wilde', 'Stille', 'Neon', 'Nordische', 'Südliche', 'Königliche', 'Junge'];
const SUFFIX = ['Adler', 'Löwen', 'Wölfe', 'Falken', 'Kometen', 'Titanen', 'Piraten', 'Bullen', 'Füchse', 'Drachen', 'Raketen', 'Haie'];
const SCOUT_RIGHT = 0.75;

export function makeOpponent(div: number, rand: () => number = Math.random): DivOpponent {
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  const style = pick(STYLES);
  const hint = rand() < SCOUT_RIGHT ? style : pick(STYLES.filter((s) => s !== style));
  return { name: `${pick(PREFIX)} ${pick(SUFFIX)}`, strength: divStrength(div) + Math.floor(rand() * 5) - 2, style, hint };
}

/** Gegner bereitstellen, falls noch keiner gespeichert ist. */
export function withOpponent(club: ClubState, rand: () => number = Math.random): ClubState {
  const d = divisionOf(club);
  if (d.next) return club.division ? club : { ...club, division: d };
  return { ...club, division: { ...d, next: makeOpponent(d.div, rand) } };
}

export type DivMove = 'up' | 'down' | null;

/** Fortschritt nach einem Spiel: Auf- und Abstieg, Sicherheitsstufen, Elite als Obergrenze. */
export function applyDivisionResult(d: DivisionState, outcome: DuelResult['outcome']): { state: DivisionState; move: DivMove } {
  let { div, pts } = d;
  pts += outcome === 'win' ? 2 : outcome === 'draw' ? 1 : -1;
  let move: DivMove = null;
  if (pts >= PROMOTE_AT) {
    if (div > ELITE) { div -= 1; pts = 2; move = 'up'; } else pts = PROMOTE_AT;
  } else if (pts < 0) {
    if (div < LOWEST && !SAFE_DIVISIONS.includes(div)) { div += 1; pts = 3; move = 'down'; } else pts = 0;
  }
  return { state: { ...d, div, pts, best: Math.min(d.best, div), next: undefined }, move };
}

export interface DivisionDuel { club: ClubState; result: DuelResult; move: DivMove; bonus: number; edge: number; fit: number; opponent: DivOpponent; level: number }

/** Ein Divisions-Spiel mit gewählter Taktik. Danach wartet direkt der nächste Gegner. */
export function playDivisionDuel(club: ClubState, tactic: Tactic, now = new Date(), rand: () => number = Math.random): DivisionDuel | null {
  const cards = club.squad.map((id) => cardById(club, id));
  if (cards.filter(Boolean).length < 11) return null;
  const d = divisionOf(club);
  const opp = d.next ?? makeOpponent(d.div, rand);
  const edge = tacticEdge(tactic, opp.style);
  const fit = squadFit(tactic, cards);
  const diff = teamStrength(cards, slotsOf(club)) + edge + fit - opp.strength;
  const own = poisson(clamp(1.4 * Math.exp(diff / 10), 0.2, 4));
  const against = poisson(clamp(1.4 * Math.exp(-diff / 10), 0.2, 4));
  const outcome = own > against ? 'win' : own === against ? 'draw' : 'loss';
  const reward = divReward(d.div);
  const coinsMatch = outcome === 'win' ? reward : outcome === 'draw' ? Math.round(reward / 4) : Math.round(reward / 10);
  const level = divLevel(d.div);
  const { state, move } = applyDivisionResult(d, outcome);
  // Aufstiegsbonus nur beim ersten Mal – Ab- und wieder Aufsteigen bringt nichts extra.
  const rewarded = d.rewarded ?? [];
  const bonus = move === 'up' && !rewarded.includes(state.div) && state.div < d.best ? promoBonus(state.div) : 0;
  const coins = coinsMatch + bonus;
  const goals = [
    ...Array.from({ length: own }, () => ({ minute: randInt(1, 90), own: true })),
    ...Array.from({ length: against }, () => ({ minute: randInt(1, 90), own: false })),
  ].sort((a, b) => a.minute - b.minute);
  const key = outcome === 'win' ? 'w' : outcome === 'draw' ? 'd' : 'l';
  const points = duelPoints(level, outcome);
  const sid = seasonId(now);
  const duelSeasons = points ? { ...club.duelSeasons, [sid]: (club.duelSeasons?.[sid] ?? 0) + points } : club.duelSeasons;
  const division: DivisionState = { ...state, rewarded: bonus ? [...rewarded, state.div] : rewarded, next: makeOpponent(state.div, rand) };
  return {
    club: { ...club, coins: club.coins + coins, duels: { ...club.duels, [key]: club.duels[key] + 1 }, duelSeasons, division, duelLevel: Math.min(10, Math.max(club.duelLevel, divLevel(state.best))) },
    result: { own, opp: against, outcome, coins, goals, points },
    move, bonus, edge, fit, opponent: opp, level,
  };
}
