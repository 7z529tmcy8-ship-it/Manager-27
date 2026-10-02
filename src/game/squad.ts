import { getCard, type ClubState, type CollectCard } from './club';
import { clamp, poisson, randInt } from './random';
import type { Position } from './types';

// Mein Team: 4-3-3 aus gesammelten Karten, Chemie über Nation, Liga und Verein, Duelle gegen immer stärkere Gegner
// und Tauschaufgaben. Alles Spielgeld (Coins), keine echten Käufe.

export interface Slot {
  pos: Position;
  label: string;
  /** Position auf dem Spielfeld in Prozent (x von links, y von oben). */
  x: number;
  y: number;
}

export const FORMATION: Slot[] = [
  { pos: 'TW', label: 'TW', x: 50, y: 90 },
  { pos: 'AV', label: 'LV', x: 14, y: 66 },
  { pos: 'IV', label: 'IV', x: 38, y: 70 },
  { pos: 'IV', label: 'IV', x: 62, y: 70 },
  { pos: 'AV', label: 'RV', x: 86, y: 66 },
  { pos: 'ZM', label: 'ZM', x: 20, y: 41 },
  { pos: 'ZDM', label: 'ZDM', x: 50, y: 46 },
  { pos: 'ZM', label: 'ZM', x: 80, y: 41 },
  { pos: 'FL', label: 'LF', x: 16, y: 16 },
  { pos: 'ST', label: 'ST', x: 50, y: 11 },
  { pos: 'FL', label: 'RF', x: 84, y: 16 },
];

// Verwandte Positionen: dort spielt eine Karte mit halber Chemie.
const NEAR: Record<Position, Position[]> = {
  TW: [],
  IV: ['AV', 'ZDM'],
  AV: ['IV'],
  ZDM: ['ZM', 'IV'],
  ZM: ['ZDM', 'ZOM'],
  ZOM: ['ZM', 'FL', 'ST'],
  FL: ['ST', 'ZOM'],
  ST: ['FL', 'ZOM'],
};

export const fit = (card: CollectCard, pos: Position): 'ok' | 'near' | 'off' =>
  card.position === pos ? 'ok' : NEAR[pos].includes(card.position) ? 'near' : 'off';

/** Alle Karten im Besitz (gezogene + eigene Sonderkarten). */
export function ownedCards(club: ClubState): CollectCard[] {
  return [
    ...club.specials,
    ...Object.entries(club.cards).filter(([, n]) => n > 0).map(([id]) => getCard(id)).filter((c): c is CollectCard => !!c),
  ];
}

export function cardById(club: ClubState, id: string | null): CollectCard | null {
  if (!id) return null;
  return getCard(id) ?? club.specials.find((s) => s.id === id) ?? null;
}

/** Chemie je Slot (0–3) und gesamt (max. 33). Ikonen haben immer volle Chemie, solange sie passend stehen. */
export function chemistry(cards: (CollectCard | null)[]): { per: number[]; total: number } {
  const placed = cards.filter((c): c is CollectCard => !!c);
  const count = (f: (c: CollectCard) => string | undefined, v: string | undefined) => (v ? placed.filter((c) => f(c) === v).length - 1 : 0);
  const per = cards.map((c, i) => {
    if (!c) return 0;
    const f = fit(c, FORMATION[i].pos);
    if (f === 'off') return 0;
    let pts: number;
    if (c.variant === 'icon') pts = 3;
    else {
      const nation = count((x) => x.nation, c.nation);
      const league = count((x) => x.league, c.league);
      const club = count((x) => x.club, c.club);
      pts = (nation >= 3 ? 2 : nation >= 1 ? 1 : 0) + (league >= 4 ? 2 : league >= 2 ? 1 : 0) + (club >= 2 ? 2 : club >= 1 ? 1 : 0);
    }
    pts = Math.min(3, pts);
    return f === 'near' ? Math.floor(pts / 2) : pts;
  });
  return { per, total: per.reduce((a, b) => a + b, 0) };
}

export function teamRating(cards: (CollectCard | null)[]): number {
  const placed = cards.filter((c): c is CollectCard => !!c);
  if (!placed.length) return 0;
  // Leere Plätze zählen mit 40 – ein unvollständiges Team ist schwach.
  return Math.round((placed.reduce((a, c) => a + c.ovr, 0) + (11 - placed.length) * 40) / 11);
}

/** Spielstärke im Duell: Wertung plus Chemie-Bonus (bis +4) bzw. Malus bei schlechter Chemie. */
export function teamStrength(cards: (CollectCard | null)[]): number {
  return teamRating(cards) + (chemistry(cards).total / 33) * 6 - 2;
}

/** Automatisch aufstellen: je Position die beste passende Karte, danach die besten übrigen. */
export function autoSquad(club: ClubState): (string | null)[] {
  const pool = ownedCards(club).sort((a, b) => b.ovr - a.ovr);
  const used = new Set<string>();
  const squad: (string | null)[] = Array(11).fill(null);
  for (const pass of ['ok', 'near'] as const) {
    FORMATION.forEach((slot, i) => {
      if (squad[i]) return;
      const c = pool.find((x) => !used.has(x.id) && fit(x, slot.pos) === pass);
      if (c) {
        squad[i] = c.id;
        used.add(c.id);
      }
    });
  }
  FORMATION.forEach((_, i) => {
    if (squad[i]) return;
    const c = pool.find((x) => !used.has(x.id));
    if (c) {
      squad[i] = c.id;
      used.add(c.id);
    }
  });
  return squad;
}

export function setSlot(club: ClubState, slot: number, cardId: string | null): ClubState {
  const squad = club.squad.map((id) => (id === cardId ? null : id));
  squad[slot] = cardId;
  return { ...club, squad };
}

// ---------- Duelle ----------
export const DUEL_LEVELS = 10;
export interface DuelOpponent { level: number; name: string; strength: number; reward: number }
const OPP_NAMES = ['Kreisliga-Kicker', 'Dorfverein United', 'Bolzplatz-Legenden', 'Vorstadt-Rebellen', 'Regionalliga-Auswahl',
  'Zweitliga-Express', 'Europapokal-Schreck', 'Meister-Kombinat', 'Galaktische Auswahl', 'Weltauswahl'];

export const opponent = (level: number): DuelOpponent => ({
  level,
  name: OPP_NAMES[level - 1],
  strength: 60 + level * 3.2,
  reward: 250 + level * 150,
});

export interface DuelResult { own: number; opp: number; outcome: 'win' | 'draw' | 'loss'; coins: number; goals: { minute: number; own: boolean }[] }

export function playDuel(club: ClubState, level: number): { club: ClubState; result: DuelResult } | null {
  const cards = club.squad.map((id) => cardById(club, id));
  if (cards.filter(Boolean).length < 11 || level > club.duelLevel) return null;
  const opp = opponent(level);
  const diff = teamStrength(cards) - opp.strength;
  const own = poisson(clamp(1.4 * Math.exp(diff / 14), 0.2, 4));
  const against = poisson(clamp(1.4 * Math.exp(-diff / 14), 0.2, 4));
  const outcome = own > against ? 'win' : own === against ? 'draw' : 'loss';
  const coins = outcome === 'win' ? opp.reward : outcome === 'draw' ? Math.round(opp.reward / 4) : 0;
  const goals = [
    ...Array.from({ length: own }, () => ({ minute: randInt(1, 90), own: true })),
    ...Array.from({ length: against }, () => ({ minute: randInt(1, 90), own: false })),
  ].sort((a, b) => a.minute - b.minute);
  const duels = { ...club.duels, [outcome === 'win' ? 'w' : outcome === 'draw' ? 'd' : 'l']: club.duels[outcome === 'win' ? 'w' : outcome === 'draw' ? 'd' : 'l'] + 1 };
  const duelLevel = outcome === 'win' && level === club.duelLevel ? Math.min(DUEL_LEVELS, level + 1) : club.duelLevel;
  return { club: { ...club, coins: club.coins + coins, duels, duelLevel }, result: { own, opp: against, outcome, coins, goals } };
}

// ---------- Tauschaufgaben ----------
export interface Task {
  id: string;
  name: string;
  text: string;
  reward: string; // Pack-ID
  /** Welche Karten passen und wie viele werden gebraucht. */
  needs: { label: string; count: number; test: (c: CollectCard) => boolean }[];
}

export const TASKS: Task[] = [
  { id: 'dupes', name: 'Aufräumen', text: '3 doppelte Karten abgeben', reward: 'standard', needs: [{ label: 'Doppelte', count: 3, test: () => true }] },
  { id: 'gold5', name: 'Goldene Fünf', text: '5 Gold-Karten (75–84) abgeben', reward: 'gold', needs: [{ label: 'Gold 75–84', count: 5, test: (c) => c.variant === 'gold' }] },
  {
    id: 'elite', name: 'Elite-Tausch', text: '1 Elite-Karte (85+) und 3 Gold-Karten abgeben', reward: 'premium',
    needs: [{ label: 'Elite 85+', count: 1, test: (c) => c.variant === 'gold-rare' }, { label: 'Gold', count: 3, test: (c) => c.variant === 'gold' }],
  },
  {
    id: 'nations', name: 'Länderspiel', text: '4 Karten derselben Nation abgeben', reward: 'gold',
    needs: [{ label: 'gleiche Nation', count: 4, test: () => true }],
  },
];

/**
 * Welche Karten würde eine Aufgabe verbrauchen? Bevorzugt Doppelte und schwächere Karten,
 * nie Karten aus der Aufstellung (außer Doppelte davon) und nie eigene Sonderkarten.
 */
export function taskPick(club: ClubState, task: Task): string[] | null {
  const counts = { ...club.cards };
  const inSquad = new Set(club.squad.filter(Boolean) as string[]);
  // Verfügbare Exemplare: Doppelte immer, Einzelstücke nur, wenn nicht aufgestellt (bei „Aufräumen“ nur Doppelte).
  const copies: CollectCard[] = [];
  for (const [id, n] of Object.entries(counts)) {
    const c = getCard(id);
    if (!c) continue;
    const spare = task.id === 'dupes' ? n - 1 : inSquad.has(id) ? n - 1 : n;
    for (let k = 0; k < spare; k++) copies.push(c);
  }
  // Doppelte zuerst, dann nach Wertung aufsteigend.
  const dupFirst = (a: CollectCard, b: CollectCard) => (counts[b.id] - counts[a.id]) || a.ovr - b.ovr;
  copies.sort(dupFirst);
  if (task.id === 'nations') {
    const byNation = new Map<string, CollectCard[]>();
    for (const c of copies) byNation.set(c.nation, [...(byNation.get(c.nation) ?? []), c]);
    const group = [...byNation.values()].filter((g) => g.length >= 4).sort((a, b) => a.reduce((s, c) => s + c.ovr, 0) - b.reduce((s, c) => s + c.ovr, 0))[0];
    return group ? group.slice(0, 4).map((c) => c.id) : null;
  }
  const picked: string[] = [];
  const left = [...copies];
  for (const need of task.needs) {
    for (let k = 0; k < need.count; k++) {
      const i = left.findIndex(need.test);
      if (i < 0) return null;
      picked.push(left[i].id);
      left.splice(i, 1);
    }
  }
  return picked;
}

/** Aufgabe erfüllen: Karten abgeben. Das Pack öffnet die Oberfläche (gratis). */
export function completeTask(club: ClubState, task: Task): { club: ClubState; spent: string[] } | null {
  const pick = taskPick(club, task);
  if (!pick) return null;
  const cards = { ...club.cards };
  for (const id of pick) cards[id] -= 1;
  for (const id of Object.keys(cards)) if (cards[id] <= 0) delete cards[id];
  const squad = club.squad.map((id) => (id && !cards[id] && !club.specials.some((s) => s.id === id) ? null : id));
  return { club: { ...club, cards, squad, tasksDone: { ...club.tasksDone, [task.id]: (club.tasksDone[task.id] ?? 0) + 1 } }, spent: pick };
}

// ---------- Kartenwerte ----------
const PROFILE: Record<Position, number[]> = {
  TW: [1, -1, -8, 2, -35, 0],
  IV: [-10, -35, -15, -18, 2, 3],
  AV: [5, -25, -3, -2, -1, -3],
  ZDM: [-8, -12, 0, -4, 1, 3],
  ZM: [-4, -5, 3, 1, -12, -3],
  ZOM: [1, 0, 3, 4, -30, -10],
  FL: [7, -2, -2, 4, -40, -8],
  ST: [3, 4, -6, 1, -40, 1],
};
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
/** Sechs Kartenwerte, stabil pro Karte (aus Position, Wertung und einem festen Zufallsanteil). */
export function cardAttrs(c: CollectCard): number[] {
  let h = hash(c.id);
  return PROFILE[c.position].map((off) => {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return clamp(Math.round(c.ovr + off + ((h % 9) - 4)), 25, 99);
  });
}
