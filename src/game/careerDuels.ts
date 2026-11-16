import { cardById, slotsOf, teamRating, teamStrength, type DuelResult } from './squad';
import type { ClubState } from './club';
import { clamp } from './random';

/** Poisson-Zufallszahl mit eigenem Würfel (für Tests steuerbar). */
function poisson(lambda: number, rand: () => number): number {
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do { k++; p *= rand(); } while (p > l);
  return k - 1;
}
import type { Career } from './types';

// ---------- Karriere-Duelle ----------
// Dein Karriere-Team (Spieler aus deinen Karrieren) spielt eine Liga-Leiter hoch: zehn Stufen von der Kreisliga bis
// zur Champions League. Ein Sieg schaltet die nächste Stufe frei. Jeder Sieg und jedes Remis gibt deinem aktiven
// Karriere-Spieler Erfahrung (XP) – so zahlen Duelle direkt auf die Karriere ein (gedeckelt pro Tag).
// Leere Plätze in der Elf spielen Jugendspieler (Wertung 40) – ein volles Team ist deutlich stärker.

export interface DuelStage { name: string; opponent: string; strength: number }
export const STAGES: DuelStage[] = [
  { name: 'Kreisliga', opponent: 'SV Hinterhof 09', strength: 50 },
  { name: 'Bezirksliga', opponent: 'TuS Dorfplatz', strength: 56 },
  { name: 'Oberliga', opponent: 'FC Flutlicht', strength: 62 },
  { name: 'Regionalliga', opponent: 'Rot-Weiß Nordkurve', strength: 67 },
  { name: '3. Liga', opponent: 'Eintracht Stahlwerk', strength: 72 },
  { name: '2. Bundesliga', opponent: 'Union Hafenkante', strength: 76 },
  { name: 'Bundesliga', opponent: 'Borussia Meisterstadt', strength: 80 },
  { name: 'Europa League', opponent: 'Sporting Atlantico', strength: 84 },
  { name: 'Champions League', opponent: 'Real Galáctico', strength: 88 },
  { name: 'Finale', opponent: 'Allstars der Legenden', strength: 92 },
];
export const DUEL_XP_PER_DAY = 250;

export interface CareerDuelState {
  /** Aktuelle Stufe (1–10). */
  stage: number;
  /** Höchste je erreichte Stufe. */
  best: number;
  w: number;
  d: number;
  l: number;
  /** XP, die heute schon vergeben wurden. */
  xpDay?: string;
  xpToday?: number;
  /** Finale gewonnen (wie oft). */
  titles?: number;
}

const today = (now: Date) => `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
export const duelStateOf = (club: Pick<ClubState, 'careerDuels'>): CareerDuelState => club.careerDuels ?? { stage: 1, best: 1, w: 0, d: 0, l: 0 };
export const stageOf = (club: Pick<ClubState, 'careerDuels'>) => STAGES[duelStateOf(club).stage - 1];

/** Stärke der aktuellen Elf (leere Plätze = 40). */
export function ownStrength(club: ClubState): number {
  const cards = Array.from({ length: 11 }, (_, i) => cardById(club, club.squad[i] ?? null));
  if (!cards.some(Boolean)) return 40;
  return Math.round(teamStrength(cards, slotsOf(club)) * 10) / 10;
}
export const placedCount = (club: ClubState) => club.squad.filter(Boolean).length;
export const ownRating = (club: ClubState) => teamRating(Array.from({ length: 11 }, (_, i) => cardById(club, club.squad[i] ?? null)));

/** XP für ein Ergebnis auf dieser Stufe (vor dem Tageslimit). */
export const duelXp = (stage: number, outcome: DuelResult['outcome']) => (outcome === 'win' ? 20 + stage * 8 : outcome === 'draw' ? 8 + stage * 2 : 0);
export function xpLeftToday(club: Pick<ClubState, 'careerDuels'>, now = new Date()): number {
  const s = duelStateOf(club);
  return Math.max(0, DUEL_XP_PER_DAY - (s.xpDay === today(now) ? s.xpToday ?? 0 : 0));
}

/** Aktive Karriere, die die XP bekommt: die zuletzt gespielte, die noch läuft. */
export const xpTarget = (careers: Career[]) => [...careers].filter((c) => c.phase !== 'retired' && c.player.skills).sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;

export interface CareerDuelOutcome {
  club: ClubState;
  result: DuelResult;
  stage: DuelStage;
  /** Vergebene XP (nach Tageslimit). */
  xp: number;
  /** Stufe aufgestiegen? */
  up: boolean;
  /** Finale gewonnen. */
  title: boolean;
}

export function playCareerDuel(club: ClubState, now = new Date(), rand: () => number = Math.random): CareerDuelOutcome {
  const s = duelStateOf(club);
  const stage = STAGES[s.stage - 1];
  const diff = ownStrength(club) - stage.strength;
  const own = poisson(clamp(1.4 * Math.exp(diff / 10), 0.15, 4.5), rand);
  const opp = poisson(clamp(1.4 * Math.exp(-diff / 10), 0.15, 4.5), rand);
  const goals = [
    ...Array.from({ length: own }, () => ({ minute: 1 + Math.floor(rand() * 90), own: true })),
    ...Array.from({ length: opp }, () => ({ minute: 1 + Math.floor(rand() * 90), own: false })),
  ].sort((a, b) => a.minute - b.minute);
  const outcome: DuelResult['outcome'] = own > opp ? 'win' : own === opp ? 'draw' : 'loss';
  const left = xpLeftToday(club, now);
  const xp = Math.min(left, duelXp(s.stage, outcome));
  const title = outcome === 'win' && s.stage === STAGES.length;
  const up = outcome === 'win' && s.stage < STAGES.length;
  const nextStage = up ? s.stage + 1 : title ? 1 : s.stage;
  const day = today(now);
  const next: CareerDuelState = {
    ...s,
    stage: nextStage,
    best: Math.max(s.best, nextStage),
    w: s.w + (outcome === 'win' ? 1 : 0),
    d: s.d + (outcome === 'draw' ? 1 : 0),
    l: s.l + (outcome === 'loss' ? 1 : 0),
    xpDay: day,
    xpToday: (s.xpDay === day ? s.xpToday ?? 0 : 0) + xp,
    titles: (s.titles ?? 0) + (title ? 1 : 0),
  };
  const result: DuelResult = { own, opp, outcome, coins: 0, goals };
  return { club: { ...club, careerDuels: next }, result, stage, xp, up, title };
}

/** XP auf den Karriere-Spieler buchen (für Level und Fähigkeitspunkte). */
export function grantDuelXp(prev: Career, xp: number): Career {
  if (!xp || !prev.player.skills) return prev;
  return { ...prev, player: { ...prev.player, skills: { ...prev.player.skills, xp: prev.player.skills.xp + xp } }, updatedAt: Date.now() };
}
