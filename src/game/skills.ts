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
  /** Stufe im Baum: 1–6 in den Ästen, 7 = Meisterstück. */
  tier: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** Ast im Baum ('a' links, 'b' rechts); ab Stufe 2 braucht es die Fähigkeit davor im selben Ast. */
  branch?: 'a' | 'b';
  /** Ab Stufe 3 gabelt sich jeder Ast in zwei Zweige – man wählt einen davon (der andere wird gesperrt). */
  twig?: 1 | 2;
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
  /** Namen der Zweige ab Stufe 3: [[Ast a Zweig 1, Ast a Zweig 2], [Ast b Zweig 1, Ast b Zweig 2]]. */
  twigs?: [[string, string], [string, string]];
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
      { id: 'st_master', icon: '👹', name: 'Killerinstinkt', text: '+25 % Torchance, +0,2 Note, +0,5 Note in großen Spielen, +2 Gesamtwertung', cost: 9, tier: 7, ovr: 2, mods: { goal: 1.25, rating: 0.2, bigGame: 0.5 } },
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
      { id: 'pm_master', icon: '🧠', name: 'Genie', text: '+25 % Vorlagen, +10 % Tore, +0,3 Note, +2 Gesamtwertung', cost: 9, tier: 7, ovr: 2, mods: { assist: 1.25, goal: 1.1, rating: 0.3 } },
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
      { id: 'wi_master', icon: '🌪️', name: 'Unaufhaltsam', text: '+15 % Tore, +20 % Vorlagen, +0,2 Note, +2 Gesamtwertung', cost: 9, tier: 7, ovr: 2, mods: { goal: 1.15, assist: 1.2, rating: 0.2 } },
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
      { id: 'bb_pro', icon: '🎯', name: 'Ewiger Motor', text: '−20 % Leistungsabbau ab 30', cost: 3, tier: 3, mods: { decline: 0.8 } },
      { id: 'bb_lungs', icon: '🫁', name: 'Drei Lungen', text: '−20 % Verletzungsrisiko, −15 % Leistungsabbau ab 30', cost: 4, tier: 4, mods: { injury: 0.8, decline: 0.85 } },
      { id: 'bb_captain', icon: '©️', name: 'Kapitän', text: '+0,25 Note, deutlich mehr Einsätze', cost: 4, tier: 4, mods: { rating: 0.25, selection: 1 } },
      { id: 'bb_world', icon: '🌍', name: 'Weltklasse-Achter', text: '+2 Gesamtwertung, +10 % Tore', cost: 5, tier: 5, ovr: 2, mods: { goal: 1.1 } },
      { id: 'bb_warrior', icon: '⚔️', name: 'Krieger', text: '+0,15 Note, +0,3 Note in großen Spielen', cost: 5, tier: 5, mods: { rating: 0.15, bigGame: 0.3 } },
      { id: 'bb_master', icon: '♾️', name: 'Überall', text: '+0,3 Note, +12 % Tore, +12 % Vorlagen, −20 % Verletzungen, +2 Gesamtwertung', cost: 9, tier: 7, ovr: 2, mods: { rating: 0.3, goal: 1.12, assist: 1.12, injury: 0.8 } },
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
      { id: 'ro_vet', icon: '🎯', name: 'Routinier', text: '−25 % Leistungsabbau ab 30', cost: 3, tier: 3, mods: { decline: 0.75 } },
      { id: 'ro_reader', icon: '📖', name: 'Spielleser', text: '+0,1 Note, +0,3 Note bei Spielen zu null', cost: 4, tier: 4, mods: { rating: 0.1, cleanSheet: 0.3 } },
      { id: 'ro_general', icon: '🎖️', name: 'Abwehrgeneral', text: '+0,2 Note, deutlich mehr Einsätze', cost: 4, tier: 4, mods: { rating: 0.2, selection: 1 } },
      { id: 'ro_world', icon: '🌍', name: 'Weltklasse-Verteidiger', text: '+2 Gesamtwertung, +0,2 Note bei Spielen zu null', cost: 5, tier: 5, ovr: 2, mods: { cleanSheet: 0.2 } },
      { id: 'ro_eternal', icon: '🗽', name: 'Unverwüstlich', text: '−30 % Leistungsabbau ab 30, −20 % Verletzungsrisiko', cost: 5, tier: 5, mods: { decline: 0.7, injury: 0.8 } },
      { id: 'ro_master', icon: '🏰', name: 'Die Mauer', text: '+0,25 Note, +0,5 Note bei Spielen zu null, +0,3 Note in großen Spielen, +2 Gesamtwertung', cost: 9, tier: 7, ovr: 2, mods: { rating: 0.25, cleanSheet: 0.5, bigGame: 0.3 } },
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
      { id: 'kp_master', icon: '🦸', name: 'Unbezwingbar', text: '+0,3 Note, +0,5 Note in großen Spielen, +0,3 Note bei Spielen zu null, +2 Gesamtwertung', cost: 9, tier: 7, ovr: 2, mods: { rating: 0.3, bigGame: 0.5, cleanSheet: 0.3 } },
    ],
  },
];

export const MASTER_TIER = 7;
export const isMaster = (s: Pick<Skill, 'tier'>) => s.tier === MASTER_TIER;
/** Höchste Stufe in einem Zweig (vor dem Meisterstück). */
export const TOP_TIER = 6;

// ---------- Verlängerung und Verästelung ----------
// Jeder Ast gabelt sich ab Stufe 3 in zwei Zweige; jeder Zweig geht bis Stufe 6.
// Zweig 1 = die bisherigen Fähigkeiten (Stufe 3–5) + eine neue Stufe 6, Zweig 2 = komplett neu (Stufe 3–6).
type M = Partial<SkillMods>;
type X = [id: string, icon: string, name: string, mods: M, ovr?: number];
interface Extension { twigs: [[string, string], [string, string]]; a1: X; a2: [X, X, X, X]; b1: X; b2: [X, X, X, X] }

/** Text aus den Werten (für die neuen Fähigkeiten). */
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
  return out.join(', ');
}

const EXTENSIONS: Record<ArchetypeId, Extension> = {
  striker: {
    twigs: [['Allrounder', 'Distanzschütze'], ['Knipser', 'Zielspieler']],
    a1: ['st_ballon', '🏆', 'Ballon-d’Or-Anwärter', { goal: 1.08, rating: 0.15 }, 1],
    a2: [['st_long', '🎯', 'Fernschuss', { goal: 1.1 }], ['st_hammer', '🔨', 'Hammer', { goal: 1.1, rating: 0.1 }],
      ['st_sunday', '🌈', 'Sonntagsschuss', { goal: 1.12, bigGame: 0.2 }], ['st_rocketfoot', '🚀', 'Raketenfuß', { goal: 1.15, rating: 0.15 }]],
    b1: ['st_machine', '🏭', 'Torfabrik', { goal: 1.15, bigGame: 0.2 }],
    b2: [['st_wall', '🧱', 'Wandspieler', { assist: 1.1, rating: 0.1 }], ['st_breaker', '🐂', 'Brecher', { goal: 1.08, selection: 0.5 }],
      ['st_tower', '🗼', 'Turm in der Schlacht', { rating: 0.2, bigGame: 0.2 }], ['st_cult', '🔥', 'Kultstürmer', { goal: 1.1, assist: 1.1, selection: 0.5 }]],
  },
  playmaker: {
    twigs: [['Taktgeber', 'Tempospiel'], ['Standards', 'Distanz']],
    a1: ['pm_iq', '🧩', 'Spielintelligenz', { rating: 0.2 }, 1],
    a2: [['pm_counter', '⚡', 'Konterpass', { assist: 1.1 }], ['pm_vertical', '⬆️', 'Vertikalpass', { assist: 1.08, goal: 1.05 }],
      ['pm_switch', '🔄', 'Umschaltspieler', { assist: 1.12, rating: 0.1 }], ['pm_hub', '🕸️', 'Ballverteiler', { assist: 1.15, selection: 0.5 }]],
    b1: ['pm_corner', '🚩', 'Ecken-Künstler', { assist: 1.12, goal: 1.06 }],
    b2: [['pm_shot', '🎯', 'Weitschuss', { goal: 1.1 }], ['pm_chip', '🪶', 'Chipball', { goal: 1.06, assist: 1.06, rating: 0.1 }],
      ['pm_monthly', '📺', 'Tor des Monats', { goal: 1.12, bigGame: 0.2 }], ['pm_oldten', '🔟', 'Zehner alter Schule', { goal: 1.1, assist: 1.1, rating: 0.1 }]],
  },
  winger: {
    twigs: [['Explosiv', 'Ausdauer'], ['Zauber', 'Effizienz']],
    a1: ['wi_sprint', '🏁', 'Sprintkönig', { goal: 1.1, assist: 1.1, injury: 0.9 }, 1],
    a2: [['wi_shuttle', '🔁', 'Pendler', { selection: 0.5, rating: 0.1 }], ['wi_line', '📏', 'Linienläufer', { assist: 1.1, injury: 0.9 }],
      ['wi_motor', '⚙️', 'Flügelmotor', { assist: 1.12, rating: 0.1 }], ['wi_marathon', '🏃', 'Dauerbrenner', { decline: 0.85, injury: 0.85 }]],
    b1: ['wi_show', '🎆', 'Showtime', { rating: 0.2, bigGame: 0.3 }],
    b2: [['wi_precise', '📍', 'Präziser Abschluss', { goal: 1.1 }], ['wi_farpost', '🥅', 'Zweiter Pfosten', { goal: 1.1, assist: 1.05 }],
      ['wi_wingscorer', '🎯', 'Torjäger vom Flügel', { goal: 1.15 }], ['wi_inverted', '↪️', 'Inverser Flügel', { goal: 1.12, rating: 0.15 }]],
  },
  engine: {
    twigs: [['Allrounder', 'Pressing'], ['Führung', 'Torgefahr']],
    a1: ['bb_heart', '❤️', 'Herz des Teams', { rating: 0.15, selection: 0.8 }, 1],
    a2: [['bb_press', '🐺', 'Gegenpresser', { rating: 0.1, injury: 0.95 }], ['bb_win', '🪝', 'Balleroberer', { rating: 0.15 }],
      ['bb_pressmachine', '🏭', 'Pressingmaschine', { rating: 0.15, selection: 0.5 }], ['bb_hunter', '🎯', 'Jäger', { rating: 0.2, bigGame: 0.2 }]],
    b1: ['bb_icon', '🏛️', 'Vereinsikone', { selection: 1, decline: 0.85 }],
    b2: [['bb_crash', '💥', 'Box-Crasher', { goal: 1.1 }], ['bb_second', '🥈', 'Aus der zweiten Reihe', { goal: 1.1, assist: 1.05 }],
      ['bb_midscorer', '⚽', 'Torjäger aus dem Mittelfeld', { goal: 1.12, rating: 0.1 }], ['bb_wave', '🌊', 'Zweite Welle', { goal: 1.15, bigGame: 0.2 }]],
  },
  rock: {
    twigs: [['Ausputzer', 'Aufbau'], ['Erfahrung', 'Standards']],
    a1: ['ro_impassable', '⛔', 'Unpassierbar', { cleanSheet: 0.3, rating: 0.1 }, 1],
    a2: [['ro_opener', '🗝️', 'Spieleröffner', { assist: 1.1, rating: 0.05 }], ['ro_libero', '🧭', 'Libero', { assist: 1.1, rating: 0.1 }],
      ['ro_vertical', '⬆️', 'Vertikalverteidiger', { assist: 1.12, goal: 1.05 }], ['ro_strategist', '♟️', 'Abwehrstratege', { rating: 0.2, selection: 0.5 }]],
    b1: ['ro_captain', '©️', 'Ewiger Kapitän', { decline: 0.8, selection: 0.8 }],
    b2: [['ro_headgoal', '🗿', 'Kopfballtor', { goal: 1.12 }], ['ro_corner', '🚩', 'Eckball-Monster', { goal: 1.12, rating: 0.1 }],
      ['ro_scorer', '⚽', 'Torjäger-Verteidiger', { goal: 1.15 }], ['ro_air2', '🦅', 'Herr der Lüfte', { goal: 1.1, bigGame: 0.2, rating: 0.1 }]],
  },
  keeper: {
    twigs: [['Reaktion', 'Mitspieler'], ['Präsenz', 'Elfmeter']],
    a1: ['kp_dive', '🪽', 'Flugeinlage', { rating: 0.2, bigGame: 0.2 }, 1],
    a2: [['kp_feet', '🦶', 'Ruhiger Fuß', { rating: 0.1, selection: 0.5 }], ['kp_throw', '🎳', 'Abwurf-Konter', { assist: 1.15, rating: 0.05 }],
      ['kp_libero', '🧹', 'Libero-Keeper', { rating: 0.15, selection: 0.5 }], ['kp_assist', '🅰️', 'Torwart-Assist', { assist: 1.25, rating: 0.1 }]],
    b1: ['kp_legend', '🏛️', 'Legende im Kasten', { decline: 0.8, cleanSheet: 0.2 }],
    b2: [['kp_mind', '🧠', 'Psychospiel', { bigGame: 0.2 }], ['kp_read', '👃', 'Richtiger Riecher', { bigGame: 0.25, rating: 0.05 }],
      ['kp_oracle', '🔮', 'Elfmeter-Orakel', { bigGame: 0.3, cleanSheet: 0.1 }], ['kp_shootout', '🦸', 'Shootout-Held', { bigGame: 0.4 }]],
  },
};
const COST: Record<number, number> = { 3: 3, 4: 4, 5: 5, 6: 6 };
const extSkill = ([id, icon, name, mods, ovr]: X, tier: 3 | 4 | 5 | 6, branch: 'a' | 'b', twig: 1 | 2): Skill =>
  ({ id, icon, name, text: describe(mods, ovr), cost: COST[tier], tier, branch, twig, mods, ...(ovr ? { ovr } : {}) });

// Äste zuordnen: In jeder Stufe ist die erste Fähigkeit im linken Ast (a), die zweite im rechten (b).
// Bisherige Stufe 3–5 bilden jeweils Zweig 1; dazu kommen Zweig 2 und die neue Stufe 6.
export const ARCHETYPES: Archetype[] = RAW_ARCHETYPES.map((a) => {
  const ext = EXTENSIONS[a.id];
  const old = a.skills.map((s): Skill => {
    if (isMaster(s)) return s;
    const branch = a.skills.filter((x) => x.tier === s.tier).indexOf(s) === 0 ? 'a' : 'b';
    return s.tier >= 3 ? { ...s, branch, twig: 1 } : { ...s, branch };
  });
  const add = [
    extSkill(ext.a1, 6, 'a', 1), extSkill(ext.b1, 6, 'b', 1),
    ...ext.a2.map((x, i) => extSkill(x, (i + 3) as 3 | 4 | 5 | 6, 'a', 2)),
    ...ext.b2.map((x, i) => extSkill(x, (i + 3) as 3 | 4 | 5 | 6, 'b', 2)),
  ];
  return { ...a, twigs: ext.twigs, skills: [...old, ...add] };
});

/** Für alle Spielertypen: Athletik und Einstellung – mehrstufig, Wirkung pro Stufe. */
export const GENERAL_SKILLS: Skill[] = [
  { id: 'gen_physio', icon: '🩺', name: 'Eigener Physio', text: '−10 % Verletzungsrisiko pro Stufe', cost: 1, tier: 1, maxRank: 3, mods: { injury: 0.9 } },
  { id: 'gen_extra', icon: '🏋️', name: 'Extraschichten', text: '+6 % Entwicklung bis 29 pro Stufe', cost: 2, tier: 1, maxRank: 2, mods: { growth: 1.06 } },
  { id: 'gen_mind', icon: '🧠', name: 'Mentaltrainer', text: '+0,05 Note und mehr Einsätze pro Stufe', cost: 1, tier: 1, maxRank: 3, mods: { rating: 0.05, selection: 0.3 } },
];

/** Meisterstück: ein Zweig komplett (bis Stufe 6) und der andere Ast mindestens bis Stufe 2. */
export const MASTER_TOP = 6;
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
  if (m.goal && m.assist) return 'ga';
  if (m.goal) return 'goals';
  if (m.assist) return 'assists';
  if (m.cleanSheet) return 'cleanSheets';
  if (m.bigGame) return 'trophies';
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
  const all = allSkills(career.player);
  const gain: Record<UseStat, number> = {
    goals: r.goals, assists: r.assists, ga: r.goals + r.assists, apps: r.apps, cleanSheets: r.cleanSheets ?? 0, trophies: r.trophies.length,
  };
  const uses = { ...(sk.uses ?? {}) };
  const ups: string[] = [];
  for (const id of new Set(sk.unlocked)) {
    const s = all.find((x) => x.id === id);
    if (!s) continue;
    const before = masteryOf(s, uses[id] ?? 0);
    uses[id] = (uses[id] ?? 0) + gain[useStat(s)];
    const after = masteryOf(s, uses[id]);
    if (after > before) ups.push(`„${s.name}“ erreicht ${MASTERY_NAME[after]}`);
  }
  sk.uses = uses;
  return ups;
}

/** Summe aller freigeschalteten Fähigkeiten (mit ihrer Meisterungs-Stufe). */
export function skillMods(p: Pick<PlayerState, 'skills'>): SkillMods {
  const out = { ...NEUTRAL };
  if (!p.skills) return out;
  const all = allSkills(p);
  for (const id of p.skills.unlocked) {
    const s = all.find((x) => x.id === id);
    if (!s?.mods) continue;
    const f = MASTERY_FACTOR[masteryOf(s, usesOf(p, id))];
    for (const [k, raw] of Object.entries(s.mods) as [keyof SkillMods, number][]) {
      const v = MULT.includes(k) ? 1 + (raw - 1) * f : raw * f;
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
      return `Braucht einen Zweig komplett (Stufe ${MASTER_TOP}) und im anderen Ast Stufe ${MASTER_OTHER}`;
    }
  } else if (s.branch && s.tier > 1) {
    // Gabelung: Hat man im Ast schon den anderen Zweig gewählt, ist dieser gesperrt.
    if (s.twig && own.some((x) => x.branch === s.branch && x.twig && x.twig !== s.twig && skills.unlocked.includes(x.id))) {
      return 'Anderer Zweig gewählt';
    }
    const before = own.find((x) => x.branch === s.branch && x.tier === s.tier - 1 && (s.tier === 3 ? !x.twig : x.twig === s.twig));
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
  const ovrBack = p.skills!.unlocked.reduce((a, id) => a + (p.skills!.gains?.[id] ?? all.find((s) => s.id === id)?.ovr ?? 0), 0);
  p.ovr = Math.max(40, p.ovr - ovrBack);
  p.skills!.unlocked = [];
  p.skills!.gains = {};
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
    // Fähigkeiten heben die Wertung nur bis 94 – darüber zählt allein, was auf dem Platz passiert.
    const gained = Math.max(0, Math.min(s.ovr, 94 - p.ovr));
    p.ovr += gained;
    p.potential = Math.max(p.potential, p.ovr);
    p.skills!.gains = { ...(p.skills!.gains ?? {}), [skillId]: gained };
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
