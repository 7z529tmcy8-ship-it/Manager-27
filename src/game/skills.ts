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
  /** Stufe im Baum: Stufe 2 braucht eine Fähigkeit aus Stufe 1, Stufe 3 eine aus Stufe 2. */
  tier: 1 | 2 | 3;
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
  skills: Skill[];
}

export const ARCHETYPES: Archetype[] = [
  {
    id: 'striker', icon: '🎯', name: 'Torjäger', text: 'Lebt für Tore: Abschluss, Kopfball, eiskalt vor dem Kasten.',
    positions: ['ST', 'FL', 'ZOM'],
    skills: [
      { id: 'st_finish', icon: '🎯', name: 'Abschlussstärke', text: '+12 % Torchance', cost: 1, tier: 1, mods: { goal: 1.12 } },
      { id: 'st_header', icon: '🗿', name: 'Kopfballungeheuer', text: '+8 % Torchance, +0,1 Note', cost: 1, tier: 1, mods: { goal: 1.08, rating: 0.1 } },
      { id: 'st_poacher', icon: '🦊', name: 'Abstauber', text: '+10 % Torchance', cost: 2, tier: 2, mods: { goal: 1.1 } },
      { id: 'st_clinical', icon: '🧊', name: 'Eiskalt', text: '+0,3 Note in Pokal, Europapokal und Finals', cost: 2, tier: 2, mods: { bigGame: 0.3 } },
      { id: 'st_complete', icon: '⭐', name: 'Kompletter Stürmer', text: '+1 Gesamtwertung, +5 % Vorlagen', cost: 3, tier: 3, ovr: 1, mods: { assist: 1.05 } },
      { id: 'st_legend', icon: '👑', name: 'Torjägerkanone', text: '+15 % Torchance', cost: 3, tier: 3, mods: { goal: 1.15 } },
    ],
  },
  {
    id: 'playmaker', icon: '🎩', name: 'Spielmacher', text: 'Sieht Pässe, die sonst keiner sieht.',
    positions: ['ZM', 'ZOM', 'FL', 'ZDM'],
    skills: [
      { id: 'pm_vision', icon: '👁️', name: 'Spielübersicht', text: '+12 % Vorlagen', cost: 1, tier: 1, mods: { assist: 1.12 } },
      { id: 'pm_setpiece', icon: '🌀', name: 'Standardspezialist', text: '+6 % Tore, +6 % Vorlagen', cost: 1, tier: 1, mods: { goal: 1.06, assist: 1.06 } },
      { id: 'pm_tempo', icon: '🎼', name: 'Taktgeber', text: '+0,15 Note, mehr Einsätze', cost: 2, tier: 2, mods: { rating: 0.15, selection: 0.5 } },
      { id: 'pm_killer', icon: '🗡️', name: 'Tödlicher Pass', text: '+12 % Vorlagen', cost: 2, tier: 2, mods: { assist: 1.12 } },
      { id: 'pm_maestro', icon: '⭐', name: 'Maestro', text: '+1 Gesamtwertung, +0,1 Note', cost: 3, tier: 3, ovr: 1, mods: { rating: 0.1 } },
      { id: 'pm_bigstage', icon: '🎭', name: 'Große Bühne', text: '+0,4 Note in Pokal, Europapokal und Finals', cost: 3, tier: 3, mods: { bigGame: 0.4 } },
    ],
  },
  {
    id: 'winger', icon: '⚡', name: 'Flügelflitzer', text: 'Tempo, Tricks und Flanken.',
    positions: ['FL', 'AV', 'ST', 'ZOM'],
    skills: [
      { id: 'wi_pace', icon: '💨', name: 'Turbo', text: '+6 % Tore, +6 % Vorlagen', cost: 1, tier: 1, mods: { goal: 1.06, assist: 1.06 } },
      { id: 'wi_cross', icon: '🎯', name: 'Flankengott', text: '+12 % Vorlagen', cost: 1, tier: 1, mods: { assist: 1.12 } },
      { id: 'wi_trick', icon: '🪄', name: 'Trickkiste', text: '+0,15 Note', cost: 2, tier: 2, mods: { rating: 0.15 } },
      { id: 'wi_cutin', icon: '↩️', name: 'Nach innen ziehen', text: '+10 % Tore', cost: 2, tier: 2, mods: { goal: 1.1 } },
      { id: 'wi_flair', icon: '⭐', name: 'Straßenfußballer', text: '+1 Gesamtwertung, +0,2 Note in großen Spielen', cost: 3, tier: 3, ovr: 1, mods: { bigGame: 0.2 } },
      { id: 'wi_engine', icon: '🫀', name: 'Unermüdlich', text: '−20 % Verletzungsrisiko, mehr Einsätze', cost: 3, tier: 3, mods: { injury: 0.8, selection: 0.5 } },
    ],
  },
  {
    id: 'engine', icon: '🔋', name: 'Box-to-Box', text: 'Überall auf dem Platz: Zweikämpfe, Läufe, Tore.',
    positions: ['ZM', 'ZDM', 'ZOM', 'AV'],
    skills: [
      { id: 'bb_stamina', icon: '🔋', name: 'Ausdauer', text: '−15 % Verletzungsrisiko', cost: 1, tier: 1, mods: { injury: 0.85 } },
      { id: 'bb_tackle', icon: '🦵', name: 'Zweikampfmonster', text: '+0,15 Note', cost: 1, tier: 1, mods: { rating: 0.15 } },
      { id: 'bb_late', icon: '🏃', name: 'Später Lauf', text: '+12 % Tore', cost: 2, tier: 2, mods: { goal: 1.12 } },
      { id: 'bb_leader', icon: '🦁', name: 'Mentalitätsmonster', text: 'Deutlich mehr Einsätze, +0,1 Note', cost: 2, tier: 2, mods: { selection: 1, rating: 0.1 } },
      { id: 'bb_complete', icon: '⭐', name: 'Kompletter Mittelfeldspieler', text: '+1 Gesamtwertung, +6 % Vorlagen', cost: 3, tier: 3, ovr: 1, mods: { assist: 1.06 } },
      { id: 'bb_pro', icon: '🧘', name: 'Ewiger Motor', text: '−20 % Leistungsabbau ab 30', cost: 3, tier: 3, mods: { decline: 0.8 } },
    ],
  },
  {
    id: 'rock', icon: '🧱', name: 'Abwehrchef', text: 'Hält hinten den Laden zusammen.',
    positions: ['IV', 'AV', 'ZDM'],
    skills: [
      { id: 'ro_position', icon: '📐', name: 'Stellungsspiel', text: '+0,2 Note bei Spielen zu null', cost: 1, tier: 1, mods: { cleanSheet: 0.2 } },
      { id: 'ro_air', icon: '🗿', name: 'Lufthoheit', text: '+0,1 Note, +10 % Tore (Standards)', cost: 1, tier: 1, mods: { rating: 0.1, goal: 1.1 } },
      { id: 'ro_tackle', icon: '🛑', name: 'Grätschenkönig', text: '+0,15 Note', cost: 2, tier: 2, mods: { rating: 0.15 } },
      { id: 'ro_boss', icon: '📣', name: 'Lautsprecher', text: 'Deutlich mehr Einsätze', cost: 2, tier: 2, mods: { selection: 1.2 } },
      { id: 'ro_wall', icon: '⭐', name: 'Bollwerk', text: '+1 Gesamtwertung, +0,2 Note bei Spielen zu null', cost: 3, tier: 3, ovr: 1, mods: { cleanSheet: 0.2 } },
      { id: 'ro_vet', icon: '🧘', name: 'Routinier', text: '−25 % Leistungsabbau ab 30', cost: 3, tier: 3, mods: { decline: 0.75 } },
    ],
  },
  {
    id: 'keeper', icon: '🧤', name: 'Torwand', text: 'Reflexe, Ausstrahlung und Nerven aus Stahl.',
    positions: ['TW'],
    skills: [
      { id: 'kp_reflex', icon: '⚡', name: 'Katzenreflexe', text: '+0,15 Note', cost: 1, tier: 1, mods: { rating: 0.15 } },
      { id: 'kp_box', icon: '✋', name: 'Strafraumbeherrschung', text: '+0,2 Note bei Spielen zu null', cost: 1, tier: 1, mods: { cleanSheet: 0.2 } },
      { id: 'kp_pen', icon: '🧊', name: 'Elfmeterkiller', text: '+0,4 Note in Pokal, Europapokal und Finals', cost: 2, tier: 2, mods: { bigGame: 0.4 } },
      { id: 'kp_sweeper', icon: '🧹', name: 'Mitspielender Torwart', text: '+0,1 Note, mehr Einsätze', cost: 2, tier: 2, mods: { rating: 0.1, selection: 0.8 } },
      { id: 'kp_wall', icon: '⭐', name: 'Die Wand', text: '+1 Gesamtwertung', cost: 3, tier: 3, ovr: 1 },
      { id: 'kp_old', icon: '🍷', name: 'Wie guter Wein', text: '−30 % Leistungsabbau ab 30', cost: 3, tier: 3, mods: { decline: 0.7 } },
    ],
  },
];

/** Für alle Spielertypen: Athletik und Einstellung. */
export const GENERAL_SKILLS: Skill[] = [
  { id: 'gen_physio', icon: '🩺', name: 'Eigener Physio', text: '−20 % Verletzungsrisiko', cost: 1, tier: 1, mods: { injury: 0.8 } },
  { id: 'gen_extra', icon: '🏋️', name: 'Extraschichten', text: '+10 % Entwicklung bis 29', cost: 2, tier: 1, mods: { growth: 1.1 } },
  { id: 'gen_mind', icon: '🧠', name: 'Mentaltrainer', text: '+0,1 Note, mehr Einsätze', cost: 2, tier: 1, mods: { rating: 0.1, selection: 0.5 } },
];

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
  for (const s of allSkills(p)) {
    if (!p.skills.unlocked.includes(s.id) || !s.mods) continue;
    for (const [k, v] of Object.entries(s.mods) as [keyof SkillMods, number][]) {
      out[k] = MULT.includes(k) ? out[k] * v : out[k] + v;
    }
  }
  return out;
}

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
  const spent = allSkills(p).filter((s) => p.skills!.unlocked.includes(s.id)).reduce((a, s) => a + s.cost, 0);
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

export function canUnlock(p: Pick<PlayerState, 'skills'>, skillId: string): boolean {
  const skills = p.skills;
  if (!skills || skills.unlocked.includes(skillId)) return false;
  const all = allSkills(p);
  const s = all.find((x) => x.id === skillId);
  if (!s || freePoints(p) < s.cost) return false;
  if (s.tier === 1) return true;
  // Stufe 2 bzw. 3 braucht eine freigeschaltete Fähigkeit derselben Spielertyp-Reihe aus der Stufe davor.
  const own = getArchetype(skills.archetype).skills;
  return own.some((x) => x.tier === s.tier - 1 && skills.unlocked.includes(x.id));
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
