import { getCard, withUpgrade, type ClubState, type CollectCard } from './club';
import { cardById, chemistry, slotsOf, type DuelResult } from './squad';

// ---------- Evolutions ----------
// Eine Karte aus der Sammlung durchläuft einen Pfad mit Stufen. Jede Stufe wird in Duellen erspielt
// und hebt die Wertung an. Pro Karte sind durch Evolutions insgesamt höchstens +5 möglich.
// Die Steigerung wird in `club.upgrades` gespeichert (Karten-ID → Plus-Punkte) und überall eingerechnet.

export const EVO_CAP = 5;
export const EVO_FEE = 5000;
/** Karten-Arten, die sich entwickeln dürfen – Ikonen und Sonderkarten nicht. */
export const EVO_VARIANTS: CollectCard['variant'][] = ['silver', 'gold', 'gold-rare', 'debut', 'cult'];

export interface EvoStep {
  /** Wie viele passende Duell-Siege gebraucht werden. */
  need: number;
  /** Mindest-Stufe des Duells. */
  minLevel?: number;
  /** Nur Siege ohne Gegentor zählen. */
  cleanSheet?: boolean;
  /** Mindest-Chemie der Elf beim Sieg. */
  minChem?: number;
  gain: number;
}

export interface EvoPath {
  id: string;
  name: string;
  text: string;
  positions: string[];
  maxOvr: number;
  /** Nur Silberkarten? */
  silverOnly?: boolean;
  steps: EvoStep[];
}

export const EVO_PATHS: EvoPath[] = [
  {
    id: 'torinstinkt', name: 'Torinstinkt', text: 'Für Stürmer und Flügel bis 84.', positions: ['ST', 'FL'], maxOvr: 84,
    steps: [{ need: 3, gain: 1 }, { need: 3, minLevel: 3, gain: 2 }, { need: 2, minLevel: 5, gain: 2 }],
  },
  {
    id: 'mauer', name: 'Mauer', text: 'Für Abwehr und Torhüter bis 83.', positions: ['IV', 'AV', 'TW'], maxOvr: 83,
    steps: [{ need: 3, gain: 1 }, { need: 2, cleanSheet: true, gain: 2 }, { need: 3, minLevel: 4, gain: 2 }],
  },
  {
    id: 'spielmacher', name: 'Spielmacher', text: 'Für das Mittelfeld bis 83.', positions: ['ZDM', 'ZM', 'ZOM'], maxOvr: 83,
    steps: [{ need: 3, gain: 1 }, { need: 3, minChem: 25, gain: 2 }, { need: 2, minLevel: 5, gain: 2 }],
  },
  {
    id: 'silber', name: 'Silber-Aufstieg', text: 'Nur Silberkarten bis 74 – am Ende im Gold-Look.', positions: [], maxOvr: 74, silverOnly: true,
    steps: [{ need: 3, gain: 2 }, { need: 3, minLevel: 3, gain: 3 }],
  },
];

export interface EvoState {
  /** Laufende Evolution. */
  active?: { path: string; card: string; step: number; wins: number };
  /** Abgeschlossene Pfade je Karte. */
  done?: Record<string, string[]>;
}

export const getPath = (id: string) => EVO_PATHS.find((p) => p.id === id);
/** Bisher durch Evolutions gewonnene Punkte einer Karte. */
export const evoGained = (club: Pick<ClubState, 'upgrades'>, id: string) => club.upgrades?.[id] ?? 0;

/** Beschreibung einer Stufe für die Oberfläche. */
export function stepText(s: EvoStep): string {
  const what = s.cleanSheet ? 'Siege ohne Gegentor' : s.minChem ? `Siege mit Chemie ab ${s.minChem}` : 'Duell-Siege';
  return `${s.need} ${what}${s.minLevel ? ` ab Stufe ${s.minLevel}` : ''} mit der Karte in der Elf`;
}

/** Warum eine Karte einen Pfad nicht starten kann – oder null, wenn es geht. */
export function evoBlocker(club: ClubState, path: EvoPath, cardId: string): string | null {
  const base = getCard(cardId);
  if (!base || !(club.cards[cardId] > 0)) return 'Nur Karten aus deiner Sammlung';
  if (!EVO_VARIANTS.includes(base.variant)) return 'Ikonen und Sonderkarten können sich nicht entwickeln';
  if (path.silverOnly ? base.variant !== 'silver' : !path.positions.includes(base.position)) return path.silverOnly ? 'Nur Silberkarten' : 'Falsche Position';
  const card = withUpgrade(club, base);
  if (card.ovr > path.maxOvr) return `Wertung höchstens ${path.maxOvr}`;
  if (evoGained(club, cardId) >= EVO_CAP) return `Hat schon +${EVO_CAP} durch Evolutions`;
  if (club.evo?.done?.[cardId]?.includes(path.id)) return 'Pfad schon abgeschlossen';
  if (club.evo?.active) return 'Es läuft schon eine Evolution';
  if (club.coins < EVO_FEE) return `${EVO_FEE.toLocaleString('de-DE')} Coins nötig`;
  return null;
}

/** Evolution starten (kostet die Startgebühr). */
export function startEvo(club: ClubState, pathId: string, cardId: string): ClubState | null {
  const path = getPath(pathId);
  if (!path || evoBlocker(club, path, cardId)) return null;
  return { ...club, coins: club.coins - EVO_FEE, evo: { ...club.evo, active: { path: pathId, card: cardId, step: 0, wins: 0 } } };
}

/** Laufende Evolution abbrechen (Gebühr verfällt, erreichte Stufen bleiben). */
export function cancelEvo(club: ClubState): ClubState {
  if (!club.evo?.active) return club;
  return { ...club, evo: { ...club.evo, active: undefined } };
}

export interface EvoProgress { card: string; path: string; counted: boolean; stepDone?: number; gain?: number; finished?: boolean }

/** Nach einem Duell: zählt der Sieg für die laufende Evolution? Gibt den neuen Club und was passiert ist zurück. */
export function evoAfterDuel(club: ClubState, result: DuelResult, level: number): { club: ClubState; progress: EvoProgress | null } {
  const act = club.evo?.active;
  const path = act && getPath(act.path);
  if (!act || !path) return { club, progress: null };
  const step = path.steps[act.step];
  const inSquad = club.squad.includes(act.card);
  const chem = chemistry(club.squad.map((id) => cardById(club, id)), slotsOf(club)).total;
  const counts = !!step && inSquad && result.outcome === 'win' && level >= (step.minLevel ?? 1)
    && (!step.cleanSheet || result.opp === 0) && chem >= (step.minChem ?? 0);
  if (!counts) return { club, progress: { card: act.card, path: act.path, counted: false } };
  const wins = act.wins + 1;
  if (wins < step.need) return { club: { ...club, evo: { ...club.evo, active: { ...act, wins } } }, progress: { card: act.card, path: act.path, counted: true } };
  // Stufe geschafft: Wertung steigt (Deckel +5), nächste Stufe oder Pfad fertig.
  const before = evoGained(club, act.card);
  const gain = Math.max(0, Math.min(step.gain, EVO_CAP - before));
  const upgrades = { ...(club.upgrades ?? {}), [act.card]: before + gain };
  const nextStep = act.step + 1;
  const finished = nextStep >= path.steps.length || before + gain >= EVO_CAP;
  const done = finished ? { ...(club.evo?.done ?? {}), [act.card]: [...(club.evo?.done?.[act.card] ?? []), path.id] } : club.evo?.done;
  return {
    club: { ...club, upgrades, evo: { done, active: finished ? undefined : { ...act, step: nextStep, wins: 0 } } },
    progress: { card: act.card, path: act.path, counted: true, stepDone: act.step + 1, gain, finished },
  };
}
