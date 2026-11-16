import type { Career, PlayerState, Position, SeasonRecord } from './types';
import type { HalfStats } from './season';

// Skill-Universum: ein runder Fähigkeitenbaum für alle Spielertypen. In der Mitte dein Typ, von dort
// gehen vier Richtungen ab (Torgefahr, Kreativität, Athletik, Mentalität) – je drei Ringe und zwei
// Ultimative ganz außen. Freischalten geht nur neben schon gelernten Knoten; Richtungen weit weg vom
// eigenen Typ kosten mehr. Spielstile (max. 3 aktiv) und Ultimative haben echte Effekte im Spiel.
// Erfahrungspunkte (EP) aus Spielen, Toren, Vorlagen, Noten und Titeln bringen Level – je Level ein Punkt.

export type ArchetypeId = 'striker' | 'playmaker' | 'winger' | 'engine' | 'rock' | 'keeper';
export type Dir = 'g' | 'c' | 'a' | 'm';
export type NodeKind = 'stat' | 'star' | 'style' | 'ult';

/** Wirkung der Fähigkeiten in der Simulation. Multiplikatoren starten bei 1, Zuschläge bei 0. */
export interface SkillMods {
  /** Torwahrscheinlichkeit. */
  goal: number;
  /** Vorlagenwahrscheinlichkeit. */
  assist: number;
  /** Zuschlag auf jede Spielnote. */
  rating: number;
  /** Zusätzliche Notenpunkte bei einem Spiel zu null (Abwehr/Torwart). */
  cleanSheet: number;
  /** Zuschlag auf die Note in Pokal, Europapokal und Finals. */
  bigGame: number;
  /** Einsatzchance (wie „Trainervertrauen“). */
  selection: number;
  /** Verletzungsrisiko. */
  injury: number;
  /** Entwicklung bis 29. */
  growth: number;
  /** Leistungsabbau ab 30. */
  decline: number;
  /** Torchance als Einwechselspieler (Joker). */
  subGoal: number;
  /** Torchance nach zwei eigenen Toren in einem Spiel (Hattrick-Jagd). */
  hattrick: number;
  /** Chance auf ein spätes Tor, wenn es remis steht oder knapp verloren ist. */
  late: number;
  /** So viel stärker spielt das eigene Team, wenn du auf dem Platz stehst. */
  team: number;
  /** Zusätzlich in Pokal, Europapokal und Finals. */
  cupTeam: number;
  /** So viel schwächer wird der Gegner im Angriff (Abwehrspieler und Torhüter). */
  oppDown: number;
  /** Höhere Chance, 90 Minuten durchzuspielen. */
  fullGame: number;
}

export interface Skill {
  id: string;
  icon: string;
  name: string;
  text: string;
  dir: Dir;
  /** Ring 1 (innen) bis 3, Ring 4 = Ultimative ganz außen. */
  ring: 1 | 2 | 3 | 4;
  kind: NodeKind;
  /** Grundkosten; dazu kommt der Aufschlag für Richtungen weit weg vom eigenen Typ (siehe costOf). */
  cost: number;
  mods?: Partial<SkillMods>;
  /** Einmaliger Wertungsschub beim Freischalten. */
  ovr?: number;
  /** Position im Universum (Mitte = 0/0, Ring-Radius 1 … 4). */
  x: number;
  y: number;
}

export interface Archetype {
  id: ArchetypeId;
  icon: string;
  name: string;
  text: string;
  positions: Position[];
  /** Heimat-Richtung: dort ist alles am günstigsten. */
  home: Dir;
}

export const DIRS: Dir[] = ['g', 'c', 'a', 'm'];
export const DIR_NAME: Record<Dir, string> = { g: 'Torgefahr', c: 'Kreativität', a: 'Athletik', m: 'Mentalität' };
export const DIR_ICON: Record<Dir, string> = { g: 'target', c: 'link', a: 'bolt', m: 'brain' };
/** Winkel der Richtungen (Grad, 0 = rechts, im Uhrzeigersinn): Torgefahr oben. */
const DIR_ANGLE: Record<Dir, number> = { g: -90, c: 0, a: 90, m: 180 };
/** Abstand zweier Richtungen: 0 gleich, 1 Nachbar, 2 gegenüber. */
export const dirDistance = (a: Dir, b: Dir) => { const d = Math.abs(DIRS.indexOf(a) - DIRS.indexOf(b)); return Math.min(d, 4 - d); };

export const ARCHETYPES: Archetype[] = [
  { id: 'striker', icon: 'target', name: 'Torjäger', text: 'Lebt für Tore: Abschluss, Kopfball, eiskalt vor dem Kasten.', positions: ['ST', 'FL', 'ZOM'], home: 'g' },
  { id: 'playmaker', icon: 'eye', name: 'Spielmacher', text: 'Sieht Pässe, die sonst keiner sieht.', positions: ['ZM', 'ZOM', 'FL', 'ZDM'], home: 'c' },
  { id: 'winger', icon: 'bolt', name: 'Flügelflitzer', text: 'Tempo, Tricks und Flanken.', positions: ['FL', 'AV', 'ST', 'ZOM'], home: 'c' },
  { id: 'engine', icon: 'heart', name: 'Box-to-Box', text: 'Überall auf dem Platz: Zweikämpfe, Läufe, Tore.', positions: ['ZM', 'ZDM', 'ZOM', 'AV'], home: 'a' },
  { id: 'rock', icon: 'shield', name: 'Abwehrchef', text: 'Hält hinten den Laden zusammen.', positions: ['IV', 'AV', 'ZDM'], home: 'm' },
  { id: 'keeper', icon: 'pillars', name: 'Torwand', text: 'Reflexe, Ausstrahlung und Nerven aus Stahl.', positions: ['TW'], home: 'm' },
];

type M = Partial<SkillMods>;
/** [id, Icon, Name, Wirkung, Art, Wertung] – je Richtung: Ring 1 (3), Ring 2 (5), Ring 3 (5), Ring 4 (2). */
type Def = [id: string, icon: string, name: string, mods: M, kind?: NodeKind, ovr?: number];
const TREE: Record<Dir, [Def[], Def[], Def[], Def[]]> = {
  g: [
    [['g1a', 'target', 'Abschluss', { goal: 1.06 }], ['g1b', 'ball', 'Kopfball', { goal: 1.04, rating: 0.05 }], ['g1c', 'boot', 'Schusskraft', { goal: 1.05 }]],
    [['g2a', 'eye', 'Abstauber', { goal: 1.07 }], ['g2b', 'ball', 'Erster Kontakt', { goal: 1.04, assist: 1.03 }], ['g2c', 'spark', 'Finesse-Schuss', { goal: 1.08, rating: 0.1 }, 'style'],
      ['g2d', 'target', 'Strafraumpräsenz', { goal: 1.06, rating: 0.05 }], ['g2e', 'flag', 'Elfmeterschütze', { goal: 1.05, bigGame: 0.15 }]],
    [['g3a', 'snow', 'Eiskalt', { goal: 1.08, bigGame: 0.15 }], ['g3b', 'star', 'Weltklasse-Abschluss', { goal: 1.04 }, 'star', 1], ['g3c', 'rewind', 'Joker', { subGoal: 1.8, selection: 0.3 }, 'style'],
      ['g3d', 'fire', 'Volley', { goal: 1.08, rating: 0.1 }], ['g3e', 'target', 'Torriecher', { goal: 1.1 }]],
    [['g4a', 'crown', 'Hattrick-Jäger', { hattrick: 2.2, goal: 1.05 }, 'ult'], ['g4b', 'clock', 'Last-Minute-Held', { late: 0.1, bigGame: 0.1 }, 'ult']],
  ],
  c: [
    [['c1a', 'link', 'Passgenauigkeit', { assist: 1.06 }], ['c1b', 'eye', 'Übersicht', { assist: 1.04, rating: 0.05 }], ['c1c', 'spark', 'Ballkontrolle', { rating: 0.08 }]],
    [['c2a', 'wave', 'Flanken', { assist: 1.07 }], ['c2b', 'swap', 'Doppelpass', { assist: 1.04, goal: 1.03 }], ['c2c', 'spark', 'Zauberpass', { assist: 1.12, rating: 0.1 }, 'style'],
      ['c2d', 'flag', 'Standards', { assist: 1.05, goal: 1.03 }], ['c2e', 'brain', 'Spielwitz', { rating: 0.1, assist: 1.03 }]],
    [['c3a', 'bolt', 'Tödlicher Pass', { assist: 1.1 }], ['c3b', 'star', 'Weltklasse-Technik', { rating: 0.05 }, 'star', 1], ['c3c', 'music', 'Taktgeber', { team: 1.2, rating: 0.1 }, 'style'],
      ['c3d', 'rise', 'Tempowechsel', { assist: 1.06, goal: 1.04 }], ['c3e', 'target', 'Freistoßkunst', { goal: 1.05, assist: 1.05, bigGame: 0.1 }]],
    [['c4a', 'crown', 'Spielgestalter', { team: 2.5, assist: 1.06 }, 'ult'], ['c4b', 'spark', 'Traumpass', { assist: 1.3, rating: 0.1 }, 'ult']],
  ],
  a: [
    [['a1a', 'heart', 'Ausdauer', { injury: 0.93, fullGame: 0.05 }], ['a1b', 'bolt', 'Antritt', { goal: 1.03, assist: 1.03 }], ['a1c', 'shield', 'Kraft', { rating: 0.05, injury: 0.95 }]],
    [['a2a', 'plus', 'Regeneration', { injury: 0.9 }], ['a2b', 'evo', 'Extraschichten', { growth: 1.06 }], ['a2c', 'shield', 'Eisenmann', { injury: 0.7, fullGame: 0.2, selection: 0.4 }, 'style'],
      ['a2d', 'rocket', 'Sprintstärke', { goal: 1.04, assist: 1.04 }], ['a2e', 'duel', 'Zweikampf', { rating: 0.08, cleanSheet: 0.1 }]],
    [['a3a', 'sun', 'Profi-Lebensstil', { decline: 0.88 }], ['a3b', 'star', 'Athletik-Monster', { injury: 0.95 }, 'star', 1], ['a3c', 'rocket', 'Turbo', { goal: 1.06, assist: 1.06, rating: 0.1, fullGame: 0.1 }, 'style'],
      ['a3d', 'rise', 'Talentschmiede', { growth: 1.08 }], ['a3e', 'infinity', 'Dauerläufer', { selection: 0.5, injury: 0.92 }]],
    [['a4a', 'shield', 'Unzerstörbar', { injury: 0.45, fullGame: 0.25 }, 'ult'], ['a4b', 'clock', 'Ewige Jugend', { decline: 0.6, growth: 1.1 }, 'ult']],
  ],
  m: [
    [['m1a', 'moon', 'Ruhe am Ball', { rating: 0.06 }], ['m1b', 'trophy', 'Siegeswille', { bigGame: 0.12 }], ['m1c', 'handshake', 'Trainerliebling', { selection: 0.5 }]],
    [['m2a', 'tactics', 'Organisation', { cleanSheet: 0.15, rating: 0.04 }], ['m2b', 'brain', 'Mentaltrainer', { rating: 0.08, selection: 0.3 }], ['m2c', 'flag', 'Kapitän', { team: 1.5, selection: 0.5 }, 'style'],
      ['m2d', 'heart', 'Nervenstark', { bigGame: 0.18 }], ['m2e', 'eye', 'Antizipation', { cleanSheet: 0.12, rating: 0.05 }]],
    [['m3a', 'medal', 'Leader', { rating: 0.12, selection: 0.4 }], ['m3b', 'star', 'Weltklasse-Mentalität', { rating: 0.05 }, 'star', 1], ['m3c', 'pillars', 'Mauer', { oppDown: 1.5, cleanSheet: 0.2 }, 'style'],
      ['m3d', 'stadium', 'Big-Game-Player', { bigGame: 0.25 }], ['m3e', 'target', 'Konzentration', { cleanSheet: 0.18, rating: 0.06 }]],
    [['m4a', 'trophy', 'Mr. Finale', { cupTeam: 3, bigGame: 0.35 }, 'ult'], ['m4b', 'shield', 'Die Wand', { oppDown: 2.5, cleanSheet: 0.4 }, 'ult']],
  ],
};

/** Besondere Wirkungen in Worten (für Spielstile und Ultimative). */
const SPECIAL: Record<string, string> = {
  g2c: 'Tore aus der Distanz – +8 % Torchance, +0,1 Note',
  g3c: 'Als Einwechselspieler fast doppelt so torgefährlich, mehr Einsätze',
  g4a: 'Nach zwei Toren in einem Spiel ist die Torchance mehr als doppelt so hoch – Hattricks werden gefeiert',
  g4b: 'Steht es remis oder knapp gegen dich, triffst du öfter in der Nachspielzeit – das Ergebnis dreht sich',
  c3c: 'Dein Team spielt stärker, solange du auf dem Platz stehst (+1,2 Stärke)',
  c4a: 'Dein Team spielt deutlich stärker, solange du auf dem Platz stehst (+2,5 Stärke)',
  a2c: '−30 % Verletzungsrisiko, öfter 90 Minuten, mehr Einsätze',
  m2c: 'Du führst das Team: +1,5 Stärke, solange du spielst, mehr Einsätze',
  m3c: 'Der Gegner trifft schwerer (−1,5 Angriff), +0,2 Note bei Spielen zu null',
  m4a: 'In Pokal, Europapokal und Finals spielt dein Team +3 stärker, +0,35 Note',
  m4b: 'Der Gegner trifft viel schwerer (−2,5 Angriff), +0,4 Note bei Spielen zu null',
};

/** Text aus den Werten. */
export function describe(mods: M = {}, ovr = 0): string {
  const pct = (v: number) => `${v > 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)} %`;
  const dec = (v: number) => `+${String(Math.round(v * 100) / 100).replace('.', ',')}`;
  const out: string[] = [];
  if (ovr) out.push(`+${ovr} Gesamtwertung`);
  if (mods.goal) out.push(`${pct(mods.goal)} Torchance`);
  if (mods.assist) out.push(`${pct(mods.assist)} Vorlagen`);
  if (mods.rating) out.push(`${dec(mods.rating)} Note`);
  if (mods.bigGame) out.push(`${dec(mods.bigGame)} Note in großen Spielen`);
  if (mods.cleanSheet) out.push(`${dec(mods.cleanSheet)} Note bei Spielen zu null`);
  if (mods.selection) out.push(mods.selection >= 1 ? 'deutlich mehr Einsätze' : 'mehr Einsätze');
  if (mods.injury) out.push(`${pct(mods.injury)} Verletzungsrisiko`);
  if (mods.decline) out.push(`${pct(mods.decline)} Abbau ab 30`);
  if (mods.growth) out.push(`${pct(mods.growth)} Entwicklung`);
  if (mods.fullGame) out.push('öfter 90 Minuten');
  return out.join(', ');
}

const RADIUS = [0, 1.15, 2.2, 3.25, 4.3];
const SPREAD = [0, 26, 17, 17, 24];
const BASE_COST = [0, 1, 2, 3, 6];

/** Alle 60 Knoten mit Position. */
export const NODES: Skill[] = DIRS.flatMap((dir) =>
  TREE[dir].flatMap((ring, ri) => ring.map(([id, icon, name, mods, kind = 'stat', ovr], i) => {
    const r = (ri + 1) as 1 | 2 | 3 | 4;
    const ang = ((DIR_ANGLE[dir] + (i - (ring.length - 1) / 2) * SPREAD[r]) * Math.PI) / 180;
    return {
      id, icon, name, dir, ring: r, kind, mods, cost: BASE_COST[r],
      text: SPECIAL[id] ?? describe(mods, ovr),
      ...(ovr ? { ovr } : {}),
      x: Math.round(Math.cos(ang) * RADIUS[r] * 1000) / 1000,
      y: Math.round(Math.sin(ang) * RADIUS[r] * 1000) / 1000,
    } satisfies Skill;
  })),
);
const BY_ID = new Map(NODES.map((n) => [n.id, n]));
export const nodeById = (id: string) => BY_ID.get(id);
export const STYLE_SLOTS = 3;
export const CORE = 'core';

const angleOf = (n: Skill) => Math.atan2(n.y, n.x);
const angDiff = (a: number, b: number) => { const d = Math.abs(a - b) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; };

/** Verbindungen: Mitte ↔ Ring 1; jeder Knoten ↔ nächster Knoten im Ring davor (bei Gleichstand beide);
 * Ring 3 seitlich vernetzt; am Rand von Ring 2 und 3 Brücken zur Nachbar-Richtung – so kann man mischen. */
export const EDGES: [string, string][] = (() => {
  const out: [string, string][] = [];
  for (const n of NODES) {
    if (n.ring === 1) { out.push([CORE, n.id]); continue; }
    const inner = NODES.filter((x) => x.dir === n.dir && x.ring === n.ring - 1);
    const dists = inner.map((x) => angDiff(angleOf(x), angleOf(n)));
    const min = Math.min(...dists);
    inner.forEach((x, i) => { if (dists[i] <= min + 0.02) out.push([x.id, n.id]); });
  }
  // Ring 3 ist seitlich vernetzt: dort kann man innerhalb einer Richtung wandern.
  for (const d of DIRS) {
    const r3 = NODES.filter((n) => n.dir === d && n.ring === 3);
    r3.slice(1).forEach((n, i) => out.push([r3[i].id, n.id]));
  }
  for (const ring of [2, 3] as const) {
    DIRS.forEach((d, i) => {
      const next = DIRS[(i + 1) % 4];
      const a = NODES.filter((n) => n.dir === d && n.ring === ring);
      const b = NODES.filter((n) => n.dir === next && n.ring === ring);
      out.push([a[a.length - 1].id, b[0].id]);
    });
  }
  return out;
})();
const NEIGHBORS = new Map<string, string[]>();
for (const [a, b] of EDGES) {
  NEIGHBORS.set(a, [...(NEIGHBORS.get(a) ?? []), b]);
  NEIGHBORS.set(b, [...(NEIGHBORS.get(b) ?? []), a]);
}
export const neighborsOf = (id: string) => NEIGHBORS.get(id) ?? [];

// ---------- Meilensteine: Der äußere Bereich jeder Richtung öffnet sich erst durch Erfolge ----------
export const GATE_LEVEL = 25;
type Totals = { goals: number; assists: number; apps: number; titles: number };
export const MILESTONE: Record<Dir, { stat: keyof Totals; need: number; word: string }> = {
  g: { stat: 'goals', need: 40, word: 'Karrieretore' },
  c: { stat: 'assists', need: 30, word: 'Karrierevorlagen' },
  a: { stat: 'apps', need: 120, word: 'Karriereeinsätze' },
  m: { stat: 'titles', need: 2, word: 'Titel' },
};
type CareerLike = Pick<Career, 'player'> & { history?: Pick<SeasonRecord, 'goals' | 'assists' | 'apps' | 'trophies'>[]; year?: number };
export function careerTotals(c: CareerLike): Totals {
  const h = c.history ?? [];
  return {
    goals: h.reduce((a, r) => a + r.goals, 0),
    assists: h.reduce((a, r) => a + r.assists, 0),
    apps: h.reduce((a, r) => a + r.apps, 0),
    titles: h.reduce((a, r) => a + r.trophies.length, 0),
  };
}
/** Meilenstein einer Richtung: Fortschritt und ob der äußere Bereich offen ist. */
export function milestone(c: CareerLike, dir: Dir): { have: number; need: number; word: string; open: boolean } {
  const m = MILESTONE[dir];
  const have = careerTotals(c)[m.stat];
  const lvl = c.player.skills ? levelInfo(c.player.skills.xp).level : 0;
  return { have, need: m.need, word: m.word, open: have >= m.need || lvl >= GATE_LEVEL };
}

export const getArchetype = (id: ArchetypeId) => ARCHETYPES.find((a) => a.id === id)!;
export function archetypesFor(position: Position): Archetype[] {
  return ARCHETYPES.filter((a) => a.positions.includes(position));
}
/** Kosten eines Knotens für diesen Spielertyp: weiter weg von der Heimat = teurer. */
export function costOf(p: Pick<PlayerState, 'skills'>, n: Pick<Skill, 'dir' | 'ring' | 'cost'>): number {
  if (!p.skills) return n.cost;
  const d = dirDistance(getArchetype(p.skills.archetype).home, n.dir);
  return n.cost + (n.ring === 4 ? d * 2 : d);
}
/** Alle Knoten (für Kompatibilität). */
export const allSkills = (p: Pick<PlayerState, 'skills'>): Skill[] => (p.skills ? NODES : []);

const NEUTRAL: SkillMods = {
  goal: 1, assist: 1, rating: 0, cleanSheet: 0, bigGame: 0, selection: 0, injury: 1, growth: 1, decline: 1,
  subGoal: 1, hattrick: 1, late: 0, team: 0, cupTeam: 0, oppDown: 0, fullGame: 0,
};
const MULT: (keyof SkillMods)[] = ['goal', 'assist', 'injury', 'growth', 'decline', 'subGoal', 'hattrick'];

// ---------- Meisterung: Bronze → Silber → Gold → Prisma ----------
// Fähigkeiten werden durch Benutzen besser: Jede zählt ihre Werte seit dem Freischalten
// (Tore, Vorlagen, Einsätze, Spiele zu null oder Titel) und steigt bei Schwellen eine Stufe auf.
export type Mastery = 0 | 1 | 2 | 3;
export const MASTERY_NAME = ['Bronze', 'Silber', 'Gold', 'Prisma'] as const;
/** Wirkung der Fähigkeit je Stufe (Bronze 100 % … Prisma 170 %). */
export const MASTERY_FACTOR = [1, 1.2, 1.4, 1.7] as const;
export type UseStat = 'goals' | 'assists' | 'ga' | 'apps' | 'cleanSheets' | 'trophies';
const USE: Record<UseStat, { word: string; steps: [number, number, number] }> = {
  goals: { word: 'Tore', steps: [10, 35, 80] },
  assists: { word: 'Vorlagen', steps: [10, 30, 70] },
  ga: { word: 'Tore + Vorlagen', steps: [15, 50, 120] },
  apps: { word: 'Einsätze', steps: [30, 100, 220] },
  cleanSheets: { word: 'Spiele zu null', steps: [8, 30, 70] },
  trophies: { word: 'Titel', steps: [1, 3, 7] },
};
/** Womit eine Fähigkeit trainiert wird – passend zu ihrer Wirkung. */
export function useStat(s: Pick<Skill, 'mods'>): UseStat {
  const m = s.mods ?? {};
  const goal = m.goal || m.subGoal || m.hattrick || m.late;
  if (goal && m.assist) return 'ga';
  if (goal) return 'goals';
  if (m.assist) return 'assists';
  if (m.cleanSheet || m.oppDown) return 'cleanSheets';
  if (m.bigGame || m.cupTeam) return 'trophies';
  return 'apps';
}
export const useWord = (stat: UseStat) => USE[stat].word;
export const masteryOf = (s: Pick<Skill, 'mods'>, uses: number): Mastery => USE[useStat(s)].steps.filter((x) => uses >= x).length as Mastery;
/** Bis zur nächsten Stufe: aktueller Stand, Ziel (null bei Prisma). */
export function masteryProgress(s: Pick<Skill, 'mods'>, uses: number): { level: Mastery; next: number | null; word: string } {
  const st = useStat(s);
  const level = masteryOf(s, uses);
  return { level, next: level < 3 ? (USE[st].steps as number[])[level] : null, word: USE[st].word };
}
export const usesOf = (p: Pick<PlayerState, 'skills'>, id: string) => p.skills?.uses?.[id] ?? 0;

/** Saisonende: Jede gelernte Fähigkeit sammelt ihre Werte. Gibt die Aufstiege zurück („Abstauber erreicht Gold“). */
export function trainSkills(career: Career, r: Pick<SeasonRecord, 'goals' | 'assists' | 'apps' | 'cleanSheets' | 'trophies'>): string[] {
  const sk = career.player.skills;
  if (!sk || !sk.unlocked.length) return [];
  const gain: Record<UseStat, number> = {
    goals: r.goals, assists: r.assists, ga: r.goals + r.assists, apps: r.apps, cleanSheets: r.cleanSheets ?? 0, trophies: r.trophies.length,
  };
  const uses = { ...(sk.uses ?? {}) };
  const ups: string[] = [];
  for (const id of new Set(sk.unlocked)) {
    const s = BY_ID.get(id);
    if (!s) continue;
    const before = masteryOf(s, uses[id] ?? 0);
    uses[id] = (uses[id] ?? 0) + gain[useStat(s)];
    const after = masteryOf(s, uses[id]);
    if (after > before) ups.push(`„${s.name}“ erreicht ${MASTERY_NAME[after]}`);
  }
  sk.uses = uses;
  return ups;
}

/** Wirkt dieser Knoten gerade? Spielstile nur, wenn sie ausgerüstet sind. */
export const isActive = (p: Pick<PlayerState, 'skills'>, id: string) => {
  const s = BY_ID.get(id);
  if (!s || !p.skills?.unlocked.includes(id)) return false;
  return s.kind !== 'style' || (p.skills.styles ?? []).includes(id);
};

/** Summe aller aktiven Knoten (mit ihrer Meisterungs-Stufe). */
export function skillMods(p: Pick<PlayerState, 'skills'>): SkillMods {
  const out = { ...NEUTRAL };
  if (!p.skills) return out;
  for (const id of new Set(p.skills.unlocked)) {
    const s = BY_ID.get(id);
    if (!s?.mods || !isActive(p, id)) continue;
    const f = MASTERY_FACTOR[masteryOf(s, usesOf(p, id))];
    for (const [k, raw] of Object.entries(s.mods) as [keyof SkillMods, number][]) {
      const v = MULT.includes(k) ? 1 + (raw - 1) * f : raw * f;
      out[k] = MULT.includes(k) ? out[k] * v : out[k] + v;
    }
  }
  // Viele Tor-/Vorlagen-Boni zusammen wirken abgeschwächt (sonst schießt ein Stürmer mit vollem Baum 80 Tore pro Saison).
  out.goal = softBoost(out.goal);
  out.assist = softBoost(out.assist);
  out.injury = Math.max(0.3, out.injury);
  out.late = Math.min(0.3, out.late);
  return out;
}

/** Bis +20 % voll, darüber nur noch zu einem Fünftel. */
export const softBoost = (m: number) => (m <= 1.2 ? m : 1.2 + (m - 1.2) * 0.2);

// ---------- Erfahrung und Level ----------

/** EP, die für das nächste Level nötig sind (steigt langsam an). */
export const xpForLevel = (level: number) => 300 + 80 * level;

export function levelInfo(xp: number): { level: number; into: number; need: number } {
  let level = 0;
  let rest = xp;
  while (rest >= xpForLevel(level)) {
    rest -= xpForLevel(level);
    level++;
  }
  return { level, into: rest, need: xpForLevel(level) };
}

/** Freie Fähigkeitspunkte: ein Punkt pro Level, abzüglich der ausgegebenen. */
export function freePoints(p: Pick<PlayerState, 'skills'>): number {
  if (!p.skills) return 0;
  const spent = p.skills.unlocked.reduce((a, id) => { const s = BY_ID.get(id); return a + (s ? costOf(p, s) : 0); }, 0);
  return levelInfo(p.skills.xp).level - spent;
}

type XpStats = Pick<HalfStats, 'apps' | 'goals' | 'assists' | 'avgRating'> & { cleanSheets?: number; trophies?: number };

/** EP für eine Saison bzw. Halbserie. */
export function xpFor(s: XpStats, position: Position): number {
  const defensive = ['TW', 'IV', 'AV', 'ZDM'].includes(position);
  const ratingBonus = s.avgRating !== null ? Math.max(0, (s.avgRating - 6.4) * s.apps * 10) : 0;
  return Math.round(
    s.apps * 12 + s.goals * (defensive ? 30 : 18) + s.assists * 14 + (s.cleanSheets ?? 0) * (defensive ? 28 : 0) +
      ratingBonus + (s.trophies ?? 0) * 120,
  );
}

/** EP für eine abgeschlossene Saison (inkl. Titel und Spiele zu null). */
export const xpForSeason = (r: SeasonRecord, position: Position) =>
  xpFor({ apps: r.apps, goals: r.goals, assists: r.assists, avgRating: r.avgRating, cleanSheets: r.cleanSheets, trophies: r.trophies.length }, position);

/** Ist ein Knoten gelernt (0/1 – für Kompatibilität mit der alten Stufen-Anzeige). */
export const rankOf = (p: Pick<PlayerState, 'skills'>, skillId: string) => (p.skills?.unlocked.includes(skillId) ? 1 : 0);

/** Liegt der Knoten neben etwas schon Gelerntem (oder an der Mitte)? */
export const reachable = (p: Pick<PlayerState, 'skills'>, id: string) =>
  neighborsOf(id).some((n) => n === CORE || (p.skills?.unlocked ?? []).includes(n));

/** Warum ein Knoten (noch) nicht freigeschaltet werden kann – oder null, wenn es geht. */
export function lockReason(c: CareerLike, skillId: string): string | null {
  const p = c.player;
  if (!p.skills) return 'Kein Spielertyp';
  const s = BY_ID.get(skillId);
  if (!s) return 'Unbekannt';
  if (p.skills.unlocked.includes(skillId)) return 'Gelernt';
  if (!reachable(p, skillId)) return 'Erst einen Nachbarknoten lernen';
  if (s.ring >= 3) {
    const m = milestone(c, s.dir);
    if (!m.open) return `Meilenstein: ${m.need} ${m.word} (${m.have}) oder Level ${GATE_LEVEL}`;
  }
  const cost = costOf(p, s);
  if (freePoints(p) < cost) return `${cost} FP nötig`;
  return null;
}

export const canUnlock = (c: CareerLike, skillId: string) => lockReason(c, skillId) === null;

/** Kostenlos neu verteilen: einmal pro Saison (Wertungsboni werden abgezogen). */
export const canRespec = (c: Pick<Career, 'player' | 'year'>) => !!c.player.skills && c.player.skills.respecYear !== c.year;

function clearTree(career: Career): void {
  const p = career.player;
  const sk = p.skills!;
  const ovrBack = sk.unlocked.reduce((a, id) => a + (sk.gains?.[id] ?? 0), 0);
  p.ovr = Math.max(40, p.ovr - ovrBack);
  sk.unlocked = [];
  sk.styles = [];
  sk.gains = {};
}

export function respecSkills(prev: Career): Career {
  if (!canRespec(prev) || !prev.player.skills!.unlocked.length) return prev;
  const career: Career = structuredClone(prev);
  clearTree(career);
  career.player.skills!.respecYear = career.year;
  career.updatedAt = Date.now();
  return career;
}

/** Lesbare Liste der aktiven Boni. */
export function bonusSummary(m: SkillMods): string[] {
  const pct = (v: number) => `${v > 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)} %`;
  const dec = (v: number) => `+${v.toFixed(2).replace(/0$/, '').replace('.', ',')}`;
  const out: string[] = [];
  if (m.goal !== 1) out.push(`${pct(m.goal)} Torchance`);
  if (m.assist !== 1) out.push(`${pct(m.assist)} Vorlagen`);
  if (m.rating) out.push(`${dec(m.rating)} Note`);
  if (m.bigGame) out.push(`${dec(m.bigGame)} Note in großen Spielen`);
  if (m.cleanSheet) out.push(`${dec(m.cleanSheet)} Note bei Spielen zu null`);
  if (m.selection) out.push('mehr Einsätze');
  if (m.injury !== 1) out.push(`${pct(m.injury)} Verletzungsrisiko`);
  if (m.growth !== 1) out.push(`${pct(m.growth)} Entwicklung`);
  if (m.decline !== 1) out.push(`${pct(m.decline)} Abbau ab 30`);
  if (m.team) out.push(`Team ${dec(m.team)} Stärke`);
  if (m.cupTeam) out.push(`${dec(m.cupTeam)} Stärke in großen Spielen`);
  if (m.oppDown) out.push(`Gegner −${m.oppDown.toFixed(1).replace('.', ',')} Angriff`);
  if (m.subGoal !== 1) out.push(`Joker ${pct(m.subGoal)}`);
  if (m.hattrick !== 1) out.push('Hattrick-Jagd');
  if (m.late) out.push('Last-Minute-Tore');
  if (m.fullGame) out.push('öfter 90 Minuten');
  return out;
}

/** Version des Fähigkeitenbaums – ältere Spielstände bekommen ihre Punkte zurück. */
export const SKILL_VERSION = 2;

export function chooseArchetype(prev: Career, id: ArchetypeId): Career {
  if (prev.player.skills) return prev;
  const career: Career = structuredClone(prev);
  // Bereits gespielte Saisons zählen rückwirkend.
  const xp = career.history.reduce((a, r) => a + xpForSeason(r, career.player.position), 0);
  career.player.skills = { archetype: id, xp, unlocked: [], seasonXp: 0, styles: [], v: SKILL_VERSION };
  career.updatedAt = Date.now();
  return career;
}

/** Alter Baum → Skill-Universum: alle Punkte zurück (Wertungsboni wieder ab). Ändert den Spielstand direkt; true = geändert. */
export function migrateSkills(career: Career): boolean {
  const sk = career?.player?.skills;
  if (!sk || sk.v === SKILL_VERSION) return false;
  const had = sk.unlocked.length > 0;
  clearTree(career);
  sk.uses = {};
  sk.plans = [];
  sk.v = SKILL_VERSION;
  if (had) sk.note = 'Neuer Fähigkeitenbaum: das Skill-Universum! Alle Punkte sind zurück – verteile sie neu.';
  return true;
}

export function unlockSkill(prev: Career, skillId: string): Career {
  if (!canUnlock(prev, skillId)) return prev;
  const career: Career = structuredClone(prev);
  const p = career.player;
  const s = BY_ID.get(skillId)!;
  p.skills!.unlocked.push(skillId);
  // Neuer Spielstil wird direkt ausgerüstet, solange ein Platz frei ist.
  if (s.kind === 'style' && (p.skills!.styles ?? []).length < STYLE_SLOTS) p.skills!.styles = [...(p.skills!.styles ?? []), skillId];
  if (s.ovr) {
    // Fähigkeiten heben die Wertung nur bis 94 – darüber zählt allein, was auf dem Platz passiert.
    const gained = Math.max(0, Math.min(s.ovr, 94 - p.ovr));
    p.ovr += gained;
    p.potential = Math.max(p.potential, p.ovr);
    p.skills!.gains = { ...(p.skills!.gains ?? {}), [skillId]: gained };
  }
  career.updatedAt = Date.now();
  return career;
}

/** Spielstil an- oder ablegen (max. 3 gleichzeitig). */
export function toggleStyle(prev: Career, id: string): Career {
  const sk = prev.player.skills;
  const s = BY_ID.get(id);
  if (!sk || s?.kind !== 'style' || !sk.unlocked.includes(id)) return prev;
  const on = sk.styles ?? [];
  if (!on.includes(id) && on.length >= STYLE_SLOTS) return prev;
  const styles = on.includes(id) ? on.filter((x) => x !== id) : [...on, id];
  return { ...prev, player: { ...prev.player, skills: { ...sk, styles } }, updatedAt: Date.now() };
}

// ---------- Baupläne ----------
export const PLAN_SLOTS = 2;
/** Aktuellen Baum als Bauplan speichern. */
export function savePlan(prev: Career, slot: number, name: string): Career {
  const sk = prev.player.skills;
  if (!sk || slot < 0 || slot >= PLAN_SLOTS) return prev;
  const plans = [...(sk.plans ?? [])];
  plans[slot] = { name: name.trim().slice(0, 20) || `Bauplan ${slot + 1}`, nodes: [...sk.unlocked], styles: [...(sk.styles ?? [])] };
  return { ...prev, player: { ...prev.player, skills: { ...sk, plans } }, updatedAt: Date.now() };
}
/** Bauplan laden: Baum leeren (zählt als Umbau dieser Saison) und so weit nachbauen, wie die Punkte reichen. */
export function applyPlan(prev: Career, slot: number): Career {
  const plan = prev.player.skills?.plans?.[slot];
  if (!plan || !canRespec(prev)) return prev;
  let career: Career = structuredClone(prev);
  clearTree(career);
  career.player.skills!.respecYear = career.year;
  // Mehrere Durchgänge, falls die Reihenfolge im Plan nicht passt.
  for (let pass = 0; pass < 3; pass++) for (const id of plan.nodes) career = unlockSkill(career, id);
  const sk = career.player.skills!;
  sk.styles = plan.styles.filter((id) => sk.unlocked.includes(id)).slice(0, STYLE_SLOTS);
  career.updatedAt = Date.now();
  return career;
}

/**
 * Nach jeder Pause EP gutschreiben: Stand der laufenden Saison minus bereits gezahlter EP.
 * Gibt die neuen EP und gewonnenen Level zurück (für die Meldung).
 */
export function grantXp(career: Career, seasonTotal: number, seasonDone: boolean): { gained: number; levels: number } {
  const sk = career.player.skills;
  if (!sk) return { gained: 0, levels: 0 };
  const gained = Math.max(0, seasonTotal - sk.seasonXp);
  const before = levelInfo(sk.xp).level;
  sk.xp += gained;
  sk.seasonXp = seasonDone ? 0 : seasonTotal;
  return { gained, levels: levelInfo(sk.xp).level - before };
}
