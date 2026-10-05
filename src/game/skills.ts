import type { Career, PlayerState, Position, SeasonRecord } from './types';
import type { HalfStats } from './season';

// Spielertypen (Archetypen) und Fähigkeitenbaum: Erfahrungspunkte (EP) aus Spielen, Toren, Vorlagen,
// guten Noten und Titeln bringen Level; jedes Level gibt einen Fähigkeitspunkt. Fähigkeiten wirken
// direkt in der Simulation (mehr Tore, bessere Noten, weniger Verletzungen …).

export type ArchetypeId = 'striker' | 'playmaker' | 'winger' | 'engine' | 'rock' | 'keeper';

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
}

export interface Skill {
  id: string;
  icon: string;
  name: string;
  text: string;
  cost: number;
  /** Stufe im Baum: 1–5 in den beiden Ästen, 6 = Meisterstück. */
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  /** Ast im Baum ('a' links, 'b' rechts); ab Stufe 2 braucht es die Fähigkeit davor im selben Ast. */
  branch?: 'a' | 'b';
  /** Mehrstufige Fähigkeit (allgemeine Fähigkeiten): so oft kann sie gelernt werden, Wirkung pro Stufe. */
  maxRank?: number;
  mods?: Partial<SkillMods>;
  /** Einmaliger Wertungsschub beim Freischalten. */
  ovr?: number;
}

export interface Archetype {
  id: ArchetypeId;
  icon: string;
  name: string;
  text: string;
  positions: Position[];
  /** Namen der beiden Äste. */
  branches: [string, string];
  skills: Skill[];
}

const RAW_ARCHETYPES: Archetype[] = [
  {
    id: 'striker', icon: '🎯', name: 'Torjäger', text: 'Lebt für Tore: Abschluss, Kopfball, eiskalt vor dem Kasten.',
    positions: ['ST', 'FL', 'ZOM'],
    branches: ['Abschluss', 'Strafraum'],
    skills: [
      { id: 'st_finish', icon: '🎯', name: 'Abschlussstärke', text: '+12 % Torchance', cost: 1, tier: 1, mods: { goal: 1.12 } },
      { id: 'st_header', icon: '🗿', name: 'Kopfballungeheuer', text: '+8 % Torchance, +0,1 Note', cost: 1, tier: 1, mods: { goal: 1.08, rating: 0.1 } },
      { id: 'st_poacher', icon: '🦊', name: 'Abstauber', text: '+10 % Torchance', cost: 2, tier: 2, mods: { goal: 1.1 } },
      { id: 'st_clinical', icon: '🧊', name: 'Eiskalt', text: '+0,3 Note in Pokal, Europapokal und Finals', cost: 2, tier: 2, mods: { bigGame: 0.3 } },
      { id: 'st_complete', icon: '⭐', name: 'Kompletter Stürmer', text: '+1 Gesamtwertung, +5 % Vorlagen', cost: 3, tier: 3, ovr: 1, mods: { assist: 1.05 } },
      { id: 'st_legend', icon: '👑', name: 'Torjägerkanone', text: '+15 % Torchance', cost: 3, tier: 3, mods: { goal: 1.15 } },
      { id: 'st_volley', icon: '💥', name: 'Volleykünstler', text: '+15 % Torchance, +0,15 Note', cost: 4, tier: 4, mods: { goal: 1.15, rating: 0.15 } },
      { id: 'st_penalty', icon: '🥅', name: 'Elfmeterschütze', text: '+10 % Torchance, +0,4 Note in großen Spielen', cost: 4, tier: 4, mods: { goal: 1.1, bigGame: 0.4 } },
      { id: 'st_world', icon: '🌍', name: 'Weltklasse-Stürmer', text: '+2 Gesamtwertung, +10 % Torchance', cost: 5, tier: 5, ovr: 2, mods: { goal: 1.1 } },
      { id: 'st_box', icon: '📦', name: 'Strafraumkönig', text: '+20 % Torchance, +0,2 Note', cost: 5, tier: 5, mods: { goal: 1.2, rating: 0.2 } },
      { id: 'st_master', icon: '👹', name: 'Killerinstinkt', text: '+25 % Torchance, +0,2 Note, +0,5 Note in großen Spielen, +2 Gesamtwertung', cost: 8, tier: 6, ovr: 2, mods: { goal: 1.25, rating: 0.2, bigGame: 0.5 } },
    ],
  },
  {
    id: 'playmaker', icon: '🎩', name: 'Spielmacher', text: 'Sieht Pässe, die sonst keiner sieht.',
    positions: ['ZM', 'ZOM', 'FL', 'ZDM'],
    branches: ['Regie', 'Standards & Pässe'],
    skills: [
      { id: 'pm_vision', icon: '👁️', name: 'Spielübersicht', text: '+12 % Vorlagen', cost: 1, tier: 1, mods: { assist: 1.12 } },
      { id: 'pm_setpiece', icon: '🌀', name: 'Standardspezialist', text: '+6 % Tore, +6 % Vorlagen', cost: 1, tier: 1, mods: { goal: 1.06, assist: 1.06 } },
      { id: 'pm_tempo', icon: '🎼', name: 'Taktgeber', text: '+0,15 Note, mehr Einsätze', cost: 2, tier: 2, mods: { rating: 0.15, selection: 0.5 } },
      { id: 'pm_killer', icon: '🗡️', name: 'Tödlicher Pass', text: '+12 % Vorlagen', cost: 2, tier: 2, mods: { assist: 1.12 } },
      { id: 'pm_maestro', icon: '⭐', name: 'Maestro', text: '+1 Gesamtwertung, +0,1 Note', cost: 3, tier: 3, ovr: 1, mods: { rating: 0.1 } },
      { id: 'pm_bigstage', icon: '🎭', name: 'Große Bühne', text: '+0,4 Note in Pokal, Europapokal und Finals', cost: 3, tier: 3, mods: { bigGame: 0.4 } },
      { id: 'pm_conductor', icon: '🎻', name: 'Dirigent', text: '+0,25 Note, mehr Einsätze', cost: 4, tier: 4, mods: { rating: 0.25, selection: 0.5 } },
      { id: 'pm_freekick', icon: '🎯', name: 'Freistoßgott', text: '+12 % Tore, +12 % Vorlagen', cost: 4, tier: 4, mods: { goal: 1.12, assist: 1.12 } },
      { id: 'pm_world', icon: '🌍', name: 'Weltklasse-Regisseur', text: '+2 Gesamtwertung, +0,1 Note', cost: 5, tier: 5, ovr: 2, mods: { rating: 0.1 } },
      { id: 'pm_assistking', icon: '🅰️', name: 'Vorlagenkönig', text: '+25 % Vorlagen', cost: 5, tier: 5, mods: { assist: 1.25 } },
      { id: 'pm_master', icon: '🧠', name: 'Genie', text: '+25 % Vorlagen, +10 % Tore, +0,3 Note, +2 Gesamtwertung', cost: 8, tier: 6, ovr: 2, mods: { assist: 1.25, goal: 1.1, rating: 0.3 } },
    ],
  },
  {
    id: 'winger', icon: '⚡', name: 'Flügelflitzer', text: 'Tempo, Tricks und Flanken.',
    positions: ['FL', 'AV', 'ST', 'ZOM'],
    branches: ['Tempo', 'Technik'],
    skills: [
      { id: 'wi_pace', icon: '💨', name: 'Turbo', text: '+6 % Tore, +6 % Vorlagen', cost: 1, tier: 1, mods: { goal: 1.06, assist: 1.06 } },
      { id: 'wi_cross', icon: '🎯', name: 'Flankengott', text: '+12 % Vorlagen', cost: 1, tier: 1, mods: { assist: 1.12 } },
      { id: 'wi_trick', icon: '🪄', name: 'Trickkiste', text: '+0,15 Note', cost: 2, tier: 2, mods: { rating: 0.15 } },
      { id: 'wi_cutin', icon: '↩️', name: 'Nach innen ziehen', text: '+10 % Tore', cost: 2, tier: 2, mods: { goal: 1.1 } },
      { id: 'wi_flair', icon: '⭐', name: 'Straßenfußballer', text: '+1 Gesamtwertung, +0,2 Note in großen Spielen', cost: 3, tier: 3, ovr: 1, mods: { bigGame: 0.2 } },
      { id: 'wi_engine', icon: '🫀', name: 'Unermüdlich', text: '−20 % Verletzungsrisiko, mehr Einsätze', cost: 3, tier: 3, mods: { injury: 0.8, selection: 0.5 } },
      { id: 'wi_rocket', icon: '🚀', name: 'Rakete', text: '+12 % Tore, +12 % Vorlagen', cost: 4, tier: 4, mods: { goal: 1.12, assist: 1.12 } },
      { id: 'wi_skill', icon: '🎪', name: 'Skill-Moves', text: '+0,25 Note, +0,2 Note in großen Spielen', cost: 4, tier: 4, mods: { rating: 0.25, bigGame: 0.2 } },
      { id: 'wi_world', icon: '🌍', name: 'Weltklasse-Flügel', text: '+2 Gesamtwertung, −15 % Verletzungsrisiko', cost: 5, tier: 5, ovr: 2, mods: { injury: 0.85 } },
      { id: 'wi_magic', icon: '✨', name: 'Zauberfuß', text: '+15 % Tore, +15 % Vorlagen', cost: 5, tier: 5, mods: { goal: 1.15, assist: 1.15 } },
      { id: 'wi_master', icon: '🌪️', name: 'Unaufhaltsam', text: '+15 % Tore, +20 % Vorlagen, +0,2 Note, +2 Gesamtwertung', cost: 8, tier: 6, ovr: 2, mods: { goal: 1.15, assist: 1.2, rating: 0.2 } },
    ],
  },
  {
    id: 'engine', icon: '🔋', name: 'Box-to-Box', text: 'Überall auf dem Platz: Zweikämpfe, Läufe, Tore.',
    positions: ['ZM', 'ZDM', 'ZOM', 'AV'],
    branches: ['Laufwunder', 'Zweikampf & Kopf'],
    skills: [
      { id: 'bb_stamina', icon: '🔋', name: 'Ausdauer', text: '−15 % Verletzungsrisiko', cost: 1, tier: 1, mods: { injury: 0.85 } },
      { id: 'bb_tackle', icon: '🦵', name: 'Zweikampfmonster', text: '+0,15 Note', cost: 1, tier: 1, mods: { rating: 0.15 } },
      { id: 'bb_late', icon: '🏃', name: 'Später Lauf', text: '+12 % Tore', cost: 2, tier: 2, mods: { goal: 1.12 } },
      { id: 'bb_leader', icon: '🦁', name: 'Mentalitätsmonster', text: 'Deutlich mehr Einsätze, +0,1 Note', cost: 2, tier: 2, mods: { selection: 1, rating: 0.1 } },
      { id: 'bb_complete', icon: '⭐', name: 'Kompletter Mittelfeldspieler', text: '+1 Gesamtwertung, +6 % Vorlagen', cost: 3, tier: 3, ovr: 1, mods: { assist: 1.06 } },
      { id: 'bb_pro', icon: '🧘', name: 'Ewiger Motor', text: '−20 % Leistungsabbau ab 30', cost: 3, tier: 3, mods: { decline: 0.8 } },
      { id: 'bb_lungs', icon: '🫁', name: 'Drei Lungen', text: '−20 % Verletzungsrisiko, −15 % Leistungsabbau ab 30', cost: 4, tier: 4, mods: { injury: 0.8, decline: 0.85 } },
      { id: 'bb_captain', icon: '©️', name: 'Kapitän', text: '+0,25 Note, deutlich mehr Einsätze', cost: 4, tier: 4, mods: { rating: 0.25, selection: 1 } },
      { id: 'bb_world', icon: '🌍', name: 'Weltklasse-Achter', text: '+2 Gesamtwertung, +10 % Tore', cost: 5, tier: 5, ovr: 2, mods: { goal: 1.1 } },
      { id: 'bb_warrior', icon: '⚔️', name: 'Krieger', text: '+0,15 Note, +0,3 Note in großen Spielen', cost: 5, tier: 5, mods: { rating: 0.15, bigGame: 0.3 } },
      { id: 'bb_master', icon: '♾️', name: 'Überall', text: '+0,3 Note, +12 % Tore, +12 % Vorlagen, −20 % Verletzungen, +2 Gesamtwertung', cost: 8, tier: 6, ovr: 2, mods: { rating: 0.3, goal: 1.12, assist: 1.12, injury: 0.8 } },
    ],
  },
  {
    id: 'rock', icon: '🧱', name: 'Abwehrchef', text: 'Hält hinten den Laden zusammen.',
    positions: ['IV', 'AV', 'ZDM'],
    branches: ['Verteidigen', 'Führung'],
    skills: [
      { id: 'ro_position', icon: '📐', name: 'Stellungsspiel', text: '+0,2 Note bei Spielen zu null', cost: 1, tier: 1, mods: { cleanSheet: 0.2 } },
      { id: 'ro_air', icon: '🗿', name: 'Lufthoheit', text: '+0,1 Note, +10 % Tore (Standards)', cost: 1, tier: 1, mods: { rating: 0.1, goal: 1.1 } },
      { id: 'ro_tackle', icon: '🛑', name: 'Grätschenkönig', text: '+0,15 Note', cost: 2, tier: 2, mods: { rating: 0.15 } },
      { id: 'ro_boss', icon: '📣', name: 'Lautsprecher', text: 'Deutlich mehr Einsätze', cost: 2, tier: 2, mods: { selection: 1.2 } },
      { id: 'ro_wall', icon: '⭐', name: 'Bollwerk', text: '+1 Gesamtwertung, +0,2 Note bei Spielen zu null', cost: 3, tier: 3, ovr: 1, mods: { cleanSheet: 0.2 } },
      { id: 'ro_vet', icon: '🧘', name: 'Routinier', text: '−25 % Leistungsabbau ab 30', cost: 3, tier: 3, mods: { decline: 0.75 } },
      { id: 'ro_reader', icon: '📖', name: 'Spielleser', text: '+0,1 Note, +0,3 Note bei Spielen zu null', cost: 4, tier: 4, mods: { rating: 0.1, cleanSheet: 0.3 } },
      { id: 'ro_general', icon: '🎖️', name: 'Abwehrgeneral', text: '+0,2 Note, deutlich mehr Einsätze', cost: 4, tier: 4, mods: { rating: 0.2, selection: 1 } },
      { id: 'ro_world', icon: '🌍', name: 'Weltklasse-Verteidiger', text: '+2 Gesamtwertung, +0,2 Note bei Spielen zu null', cost: 5, tier: 5, ovr: 2, mods: { cleanSheet: 0.2 } },
      { id: 'ro_eternal', icon: '🗽', name: 'Unverwüstlich', text: '−30 % Leistungsabbau ab 30, −20 % Verletzungsrisiko', cost: 5, tier: 5, mods: { decline: 0.7, injury: 0.8 } },
      { id: 'ro_master', icon: '🏰', name: 'Die Mauer', text: '+0,25 Note, +0,5 Note bei Spielen zu null, +0,3 Note in großen Spielen, +2 Gesamtwertung', cost: 8, tier: 6, ovr: 2, mods: { rating: 0.25, cleanSheet: 0.5, bigGame: 0.3 } },
    ],
  },
  {
    id: 'keeper', icon: '🧤', name: 'Torwand', text: 'Reflexe, Ausstrahlung und Nerven aus Stahl.',
    positions: ['TW'],
    branches: ['Reflexe', 'Ausstrahlung'],
    skills: [
      { id: 'kp_reflex', icon: '⚡', name: 'Katzenreflexe', text: '+0,15 Note', cost: 1, tier: 1, mods: { rating: 0.15 } },
      { id: 'kp_box', icon: '✋', name: 'Strafraumbeherrschung', text: '+0,2 Note bei Spielen zu null', cost: 1, tier: 1, mods: { cleanSheet: 0.2 } },
      { id: 'kp_pen', icon: '🧊', name: 'Elfmeterkiller', text: '+0,4 Note in Pokal, Europapokal und Finals', cost: 2, tier: 2, mods: { bigGame: 0.4 } },
      { id: 'kp_sweeper', icon: '🧹', name: 'Mitspielender Torwart', text: '+0,1 Note, mehr Einsätze', cost: 2, tier: 2, mods: { rating: 0.1, selection: 0.8 } },
      { id: 'kp_wall', icon: '⭐', name: 'Die Wand', text: '+1 Gesamtwertung', cost: 3, tier: 3, ovr: 1 },
      { id: 'kp_old', icon: '🍷', name: 'Wie guter Wein', text: '−30 % Leistungsabbau ab 30', cost: 3, tier: 3, mods: { decline: 0.7 } },
      { id: 'kp_cat', icon: '🐈', name: 'Katze', text: '+0,25 Note', cost: 4, tier: 4, mods: { rating: 0.25 } },
      { id: 'kp_leader', icon: '📢', name: 'Organisator', text: '+0,3 Note bei Spielen zu null, mehr Einsätze', cost: 4, tier: 4, mods: { cleanSheet: 0.3, selection: 0.8 } },
      { id: 'kp_world', icon: '🌍', name: 'Weltklasse-Keeper', text: '+2 Gesamtwertung, +0,1 Note', cost: 5, tier: 5, ovr: 2, mods: { rating: 0.1 } },
      { id: 'kp_penhero', icon: '🧤', name: 'Elfmeterheld', text: '+0,5 Note in großen Spielen, +0,2 Note bei Spielen zu null', cost: 5, tier: 5, mods: { bigGame: 0.5, cleanSheet: 0.2 } },
      { id: 'kp_master', icon: '🦸', name: 'Unbezwingbar', text: '+0,3 Note, +0,5 Note in großen Spielen, +0,3 Note bei Spielen zu null, +2 Gesamtwertung', cost: 8, tier: 6, ovr: 2, mods: { rating: 0.3, bigGame: 0.5, cleanSheet: 0.3 } },
    ],
  },
];

export const MASTER_TIER = 6;
export const isMaster = (s: Pick<Skill, 'tier'>) => s.tier === MASTER_TIER;

// Äste zuordnen: In jeder Stufe ist die erste Fähigkeit im linken Ast (a), die zweite im rechten (b).
export const ARCHETYPES: Archetype[] = RAW_ARCHETYPES.map((a) => ({
  ...a,
  skills: a.skills.map((s) => (isMaster(s) ? s : { ...s, branch: a.skills.filter((x) => x.tier === s.tier).indexOf(s) === 0 ? 'a' : 'b' })),
}));

/** Für alle Spielertypen: Athletik und Einstellung – mehrstufig, Wirkung pro Stufe. */
export const GENERAL_SKILLS: Skill[] = [
  { id: 'gen_physio', icon: '🩺', name: 'Eigener Physio', text: '−10 % Verletzungsrisiko pro Stufe', cost: 1, tier: 1, maxRank: 3, mods: { injury: 0.9 } },
  { id: 'gen_extra', icon: '🏋️', name: 'Extraschichten', text: '+6 % Entwicklung bis 29 pro Stufe', cost: 2, tier: 1, maxRank: 2, mods: { growth: 1.06 } },
  { id: 'gen_mind', icon: '🧠', name: 'Mentaltrainer', text: '+0,05 Note und mehr Einsätze pro Stufe', cost: 1, tier: 1, maxRank: 3, mods: { rating: 0.05, selection: 0.3 } },
];

/** Meisterstück: ein Ast komplett (bis Stufe 5) und der andere mindestens bis Stufe 2. */
export const MASTER_TOP = 5;
export const MASTER_OTHER = 2;

export const getArchetype = (id: ArchetypeId) => ARCHETYPES.find((a) => a.id === id)!;

export function archetypesFor(position: Position): Archetype[] {
  return ARCHETYPES.filter((a) => a.positions.includes(position));
}

export function allSkills(p: Pick<PlayerState, 'skills'>): Skill[] {
  return p.skills ? [...getArchetype(p.skills.archetype).skills, ...GENERAL_SKILLS] : [];
}

const NEUTRAL: SkillMods = { goal: 1, assist: 1, rating: 0, cleanSheet: 0, bigGame: 0, selection: 0, injury: 1, growth: 1, decline: 1 };
const MULT: (keyof SkillMods)[] = ['goal', 'assist', 'injury', 'growth', 'decline'];

/** Summe aller freigeschalteten Fähigkeiten. */
export function skillMods(p: Pick<PlayerState, 'skills'>): SkillMods {
  const out = { ...NEUTRAL };
  if (!p.skills) return out;
  const all = allSkills(p);
  for (const id of p.skills.unlocked) {
    const s = all.find((x) => x.id === id);
    if (!s?.mods) continue;
    for (const [k, v] of Object.entries(s.mods) as [keyof SkillMods, number][]) {
      out[k] = MULT.includes(k) ? out[k] * v : out[k] + v;
    }
  }
  // Viele Tor-/Vorlagen-Boni zusammen wirken abgeschwächt (sonst schießt ein Stürmer mit vollem Baum 80 Tore pro Saison).
  out.goal = softBoost(out.goal);
  out.assist = softBoost(out.assist);
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
  const all = allSkills(p);
  const spent = p.skills.unlocked.reduce((a, id) => a + (all.find((s) => s.id === id)?.cost ?? 0), 0);
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

/** Wie oft eine Fähigkeit schon gelernt wurde (mehrstufige Fähigkeiten zählen mehrfach). */
export const rankOf = (p: Pick<PlayerState, 'skills'>, skillId: string) => (p.skills?.unlocked ?? []).filter((x) => x === skillId).length;

/** Warum eine Fähigkeit (noch) nicht freigeschaltet werden kann – oder null, wenn es geht. */
export function lockReason(p: Pick<PlayerState, 'skills'>, skillId: string): string | null {
  const skills = p.skills;
  if (!skills) return 'Kein Spielertyp';
  const s = allSkills(p).find((x) => x.id === skillId);
  if (!s) return 'Unbekannt';
  if (rankOf(p, skillId) >= (s.maxRank ?? 1)) return 'Gelernt';
  const own = getArchetype(skills.archetype).skills;
  if (isMaster(s)) {
    const depth = (b: 'a' | 'b') => Math.max(0, ...own.filter((x) => x.branch === b && skills.unlocked.includes(x.id)).map((x) => x.tier));
    const [hi, lo] = [depth('a'), depth('b')].sort((x, y) => y - x);
    if (hi < MASTER_TOP || lo < MASTER_OTHER) {
      return `Braucht einen Ast komplett (Stufe ${MASTER_TOP}) und im anderen Stufe ${MASTER_OTHER}`;
    }
  } else if (s.branch && s.tier > 1) {
    const before = own.find((x) => x.branch === s.branch && x.tier === s.tier - 1);
    if (before && !skills.unlocked.includes(before.id)) return `Braucht „${before.name}“`;
  }
  if (freePoints(p) < s.cost) return `${s.cost} FP nötig`;
  return null;
}

export const canUnlock = (p: Pick<PlayerState, 'skills'>, skillId: string) => lockReason(p, skillId) === null;

/** Einmal pro Karriere: alle Punkte zurückbekommen und neu verteilen (Wertungsboni werden abgezogen). */
export function respecSkills(prev: Career): Career {
  const sk = prev.player.skills;
  if (!sk || sk.respecUsed || !sk.unlocked.length) return prev;
  const career: Career = structuredClone(prev);
  const p = career.player;
  const all = allSkills(p);
  const ovrBack = p.skills!.unlocked.reduce((a, id) => a + (all.find((s) => s.id === id)?.ovr ?? 0), 0);
  p.ovr = Math.max(40, p.ovr - ovrBack);
  p.skills!.unlocked = [];
  p.skills!.respecUsed = true;
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
  return out;
}

export function chooseArchetype(prev: Career, id: ArchetypeId): Career {
  if (prev.player.skills) return prev;
  const career: Career = structuredClone(prev);
  // Bereits gespielte Saisons zählen rückwirkend.
  const xp = career.history.reduce((a, r) => a + xpForSeason(r, career.player.position), 0);
  career.player.skills = { archetype: id, xp, unlocked: [], seasonXp: 0 };
  career.updatedAt = Date.now();
  return career;
}

export function unlockSkill(prev: Career, skillId: string): Career {
  if (!canUnlock(prev.player, skillId)) return prev;
  const career: Career = structuredClone(prev);
  const p = career.player;
  const s = allSkills(p).find((x) => x.id === skillId)!;
  p.skills!.unlocked.push(skillId);
  if (s.ovr) {
    p.ovr = Math.min(99, p.ovr + s.ovr);
    p.potential = Math.max(p.potential, p.ovr);
  }
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
