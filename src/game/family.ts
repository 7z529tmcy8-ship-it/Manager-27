import { CLUBS, getClub } from '../data/leagues';
import { summarizeCareer } from './legacy';
import { clubStrength } from './player';
import { chance, clamp, normal, pick, rand, randInt, uid, weightedPick } from './random';
import type { Career, Child, ChildStats, Household, PendingChoice } from './types';

// Familie: Ab 22 kann man in den Pausen (versehentlich) Vater werden. Jedes Kind hat Werte wie Fitness, Technik,
// Disziplin, Schule, Freunde und Zufriedenheit. Jedes Jahr gibt es pro Kind 5 Erziehungsentscheidungen
// (in der Winterpause bzw. im Ruhestand). Mit 18 entscheidet sich, ob es Fußballprofi wird –
// dann verdient es jedes Jahr Coins, die dem Club gutgeschrieben werden.

export const MAX_CHILDREN = 4;
export const DECISIONS_PER_YEAR = 5;
export const FATHER_MIN_AGE = 22;
/** Chance pro Pause, zur After-Party eingeladen zu werden. */
export const FLIRT_CHANCE = 0.25;
/** Chance, dass aus der Nacht ein Kind wird. */
export const BABY_CHANCE = 0.45;
/** Ab dieser Wertung mit 18 wird das Kind Profi. */
export const PRO_MIN_OVR = 56;

type StatKey = keyof ChildStats;
export const STAT_LABELS: Record<StatKey, string> = {
  fitness: 'Fitness',
  technique: 'Technik',
  discipline: 'Disziplin',
  school: 'Schule',
  social: 'Freunde',
  happiness: 'Zufriedenheit',
};

export interface ChoiceOption {
  label: string;
  effects: Partial<ChildStats>;
  /** Kostet Coins (z. B. Privattrainer). */
  cost?: number;
  /** Zählt eine Gewohnheit hoch (z. B. 'gaming', 'fastfood'). */
  habit?: string;
}

export interface ChoiceTemplate {
  id: string;
  ages: [number, number];
  icon: string;
  question: string;
  options: ChoiceOption[];
}

// ---------- Erziehungsentscheidungen ----------
export const TEMPLATES: ChoiceTemplate[] = [
  // Baby & Kleinkind (0–3)
  { id: 'b_toy', ages: [0, 3], icon: '🧸', question: 'Spielzeug fürs Kinderzimmer?', options: [
    { label: '⚽ Kleiner Ball', effects: { technique: 4, happiness: 2 } },
    { label: '📺 Tablet mit Videos', effects: { happiness: 3, fitness: -2, discipline: -2 }, habit: 'gaming' },
    { label: '🧸 Kuscheltiere', effects: { social: 2, happiness: 2 } },
  ] },
  { id: 'b_swim', ages: [0, 3], icon: '🏊', question: 'Babyschwimmen?', options: [
    { label: 'Ja, anmelden', effects: { fitness: 5, happiness: 1 }, cost: 200 },
    { label: 'Nein, lieber nicht', effects: {} },
  ] },
  { id: 'b_sleep', ages: [0, 4], icon: '🌙', question: 'Feste Schlafenszeiten?', options: [
    { label: 'Ja, streng', effects: { discipline: 4, happiness: -1 } },
    { label: 'Wie es gerade passt', effects: { happiness: 2, discipline: -2 } },
  ] },
  { id: 'b_food', ages: [0, 4], icon: '🥕', question: 'Was gibt es zu essen?', options: [
    { label: 'Selbst gekocht und gesund', effects: { fitness: 3 } },
    { label: 'Gläschen und Pommes', effects: { happiness: 2, fitness: -3 }, habit: 'fastfood' },
  ] },
  { id: 'b_music', ages: [0, 3], icon: '🎵', question: 'Was läuft im Kinderzimmer?', options: [
    { label: 'Fangesänge aus dem Stadion', effects: { happiness: 2, technique: 1 } },
    { label: 'Klassische Musik', effects: { school: 3 } },
    { label: 'Ruhe', effects: { discipline: 1 } },
  ] },
  { id: 'b_night', ages: [0, 2], icon: '🍼', question: 'Wer steht nachts auf?', options: [
    { label: 'Du selbst – trotz Training', effects: { happiness: 4, social: 1 } },
    { label: 'Nachtschwester', effects: { discipline: 2 }, cost: 300 },
  ] },
  { id: 'b_care', ages: [1, 5], icon: '🏫', question: 'Wer passt tagsüber auf?', options: [
    { label: 'Kita', effects: { social: 4 } },
    { label: 'Oma und Opa', effects: { happiness: 3, discipline: 1 } },
    { label: 'Nanny', effects: { school: 3, discipline: 2 }, cost: 300 },
  ] },
  { id: 'b_stadium', ages: [1, 6], icon: '🏟️', question: 'Mit ins Stadion nehmen?', options: [
    { label: 'Ja, Trikot an!', effects: { happiness: 3, technique: 1 } },
    { label: 'Lieber nicht, zu laut', effects: { discipline: 1 } },
  ] },
  // Kind (4–11)
  { id: 'k_club', ages: [4, 11], icon: '⚽', question: 'Im Fußballverein anmelden?', options: [
    { label: 'Im Dorfverein', effects: { technique: 5, fitness: 3, social: 2 } },
    { label: 'In der Jugend eines Profivereins', effects: { technique: 7, fitness: 4, discipline: 1, happiness: -1 }, cost: 500 },
    { label: 'Noch nicht', effects: { happiness: 2 } },
  ] },
  { id: 'k_school', ages: [6, 11], icon: '📚', question: 'Eine 4 in Mathe – wie reagierst du?', options: [
    { label: 'Streng: Hausaufgaben vor Fußball', effects: { school: 6, discipline: 3, happiness: -3 } },
    { label: 'Nachhilfe bezahlen', effects: { school: 5 }, cost: 300 },
    { label: 'Egal, Fußball ist wichtiger', effects: { school: -4, happiness: 2 } },
  ] },
  { id: 'k_gaming', ages: [5, 11], icon: '🎮', question: 'Darf gezockt werden?', options: [
    { label: 'Unbegrenzt', effects: { happiness: 5, discipline: -4, fitness: -3 }, habit: 'gaming' },
    { label: 'Eine Stunde am Tag', effects: { happiness: 2, discipline: 1 } },
    { label: 'Verboten', effects: { happiness: -4, discipline: 2 } },
  ] },
  { id: 'k_food', ages: [5, 11], icon: '🍔', question: 'Pausenbrot oder Fastfood?', options: [
    { label: 'Gesundes Pausenbrot', effects: { fitness: 3, happiness: -1 } },
    { label: 'Burger und Cola', effects: { happiness: 3, fitness: -4 }, habit: 'fastfood' },
    { label: 'Ernährungsberater', effects: { fitness: 5 }, cost: 400 },
  ] },
  { id: 'k_friends', ages: [5, 11], icon: '👫', question: 'Freunde wollen sich treffen.', options: [
    { label: 'Raus auf den Bolzplatz!', effects: { social: 4, technique: 2, fitness: 2 } },
    { label: 'Nur bei uns zu Hause', effects: { social: 2 } },
    { label: 'Nein, erst lernen', effects: { social: -3, school: 3 } },
  ] },
  { id: 'k_training', ages: [6, 11], icon: '🏃', question: 'Extra-Training am Wochenende?', options: [
    { label: 'Privattrainer', effects: { technique: 6, fitness: 3, happiness: -1 }, cost: 800 },
    { label: 'Mit dir im Garten kicken', effects: { technique: 3, happiness: 3 } },
    { label: 'Wochenende ist frei', effects: { happiness: 3 } },
  ] },
  { id: 'k_hobby', ages: [6, 11], icon: '🥋', question: 'Ein zweites Hobby?', options: [
    { label: 'Kampfsport', effects: { fitness: 3, discipline: 3 } },
    { label: 'Musikinstrument', effects: { school: 3, discipline: 2 } },
    { label: 'Nur Fußball', effects: { technique: 2, happiness: -2 } },
  ] },
  { id: 'k_holiday', ages: [4, 11], icon: '🏖️', question: 'Sommerferien:', options: [
    { label: 'Fußballcamp', effects: { technique: 5, social: 2 }, cost: 600 },
    { label: 'Strandurlaub', effects: { happiness: 5 } },
    { label: 'Zu Hause bleiben', effects: { happiness: -2 } },
  ] },
  { id: 'k_phone', ages: [8, 12], icon: '📱', question: 'Ein eigenes Handy?', options: [
    { label: 'Ja', effects: { social: 3, happiness: 3, discipline: -2 }, habit: 'gaming' },
    { label: 'Erst mit 12', effects: { discipline: 2, happiness: -2 } },
  ] },
  // Teenager (12–17)
  { id: 't_party', ages: [13, 17], icon: '🎉', question: 'Party am Samstag – Sonntag ist Spiel.', options: [
    { label: 'Erlauben', effects: { social: 4, happiness: 4, discipline: -3, fitness: -1 } },
    { label: 'Bis 22 Uhr', effects: { social: 2, discipline: 1 } },
    { label: 'Verbieten', effects: { discipline: 3, happiness: -4 } },
  ] },
  { id: 't_school', ages: [12, 15], icon: '🏫', question: 'Normale Schule oder Fußballinternat?', options: [
    { label: 'Normale Schule, Abi im Blick', effects: { school: 5, technique: 1 } },
    { label: 'Fußballinternat', effects: { technique: 6, fitness: 5, discipline: 4, social: -2 }, cost: 1500 },
    { label: 'Schule schleifen lassen', effects: { school: -6, technique: 2 } },
  ] },
  { id: 't_grades', ages: [12, 17], icon: '📝', question: 'Schlechte Noten im Halbjahreszeugnis.', options: [
    { label: 'Hausarrest', effects: { school: 4, happiness: -4, discipline: 2 } },
    { label: 'Gemeinsam lernen', effects: { school: 3, happiness: 1 } },
    { label: 'Ist halt so', effects: { school: -2, happiness: 2 } },
  ] },
  { id: 't_gaming', ages: [12, 17], icon: '🎮', question: 'Zocken bis 3 Uhr nachts?', options: [
    { label: 'Konsole wegnehmen', effects: { discipline: 4, happiness: -5 } },
    { label: 'Feste Zeiten', effects: { discipline: 2, happiness: -1 } },
    { label: 'Laufen lassen', effects: { happiness: 4, discipline: -5, fitness: -2 }, habit: 'gaming' },
  ] },
  { id: 't_food', ages: [12, 17], icon: '🥗', question: 'Ernährung in der Wachstumsphase?', options: [
    { label: 'Ernährungsplan', effects: { fitness: 6, happiness: -1 }, cost: 500 },
    { label: 'Normale Hausmannskost', effects: { fitness: 2 } },
    { label: 'Döner, Pizza, Energydrinks', effects: { happiness: 4, fitness: -6 }, habit: 'fastfood' },
  ] },
  { id: 't_social', ages: [12, 17], icon: '🤳', question: 'Will Social-Media-Star werden.', options: [
    { label: 'Erlauben', effects: { social: 5, happiness: 3, discipline: -3 } },
    { label: 'Nur privat', effects: { social: 1 } },
    { label: 'Verbieten', effects: { happiness: -3, discipline: 2 } },
  ] },
  { id: 't_agent', ages: [14, 17], icon: '💼', question: 'Ein Berater will dein Kind unter Vertrag nehmen.', options: [
    { label: 'Unterschreiben', effects: { happiness: 2, discipline: -2, technique: 1 } },
    { label: 'Ablehnen, erst die Schule', effects: { school: 3, discipline: 2 } },
    { label: 'Du berätst selbst', effects: { technique: 2, discipline: 1 } },
  ] },
  { id: 't_love', ages: [14, 17], icon: '💘', question: 'Die erste große Liebe.', options: [
    { label: 'Unterstützen', effects: { happiness: 5, social: 2, fitness: -1 } },
    { label: 'Skeptisch bleiben', effects: { happiness: -2, discipline: 1 } },
  ] },
  { id: 't_gym', ages: [13, 17], icon: '🏋️', question: 'Ins Fitnessstudio?', options: [
    { label: 'Ja, mit Trainer', effects: { fitness: 6, discipline: 2 }, cost: 400 },
    { label: 'Lieber Laufen im Park', effects: { fitness: 3, happiness: 1 } },
    { label: 'Erst mit 16', effects: { fitness: 1 } },
  ] },
  { id: 't_trial', ages: [13, 17], icon: '🔍', question: 'Probetraining bei einem großen Verein.', options: [
    { label: 'Hingehen', effects: { technique: 3, discipline: 2, happiness: 2 } },
    { label: 'Erst im eigenen Verein durchsetzen', effects: { discipline: 3, technique: 1 } },
  ] },
  { id: 't_rebel', ages: [12, 17], icon: '😤', question: 'Will heute nicht zum Training.', options: [
    { label: 'Hingehen müssen', effects: { discipline: 3, happiness: -4 } },
    { label: 'Ein ehrliches Gespräch', effects: { happiness: 2, discipline: 1 } },
    { label: 'Okay, heute frei', effects: { happiness: 3, discipline: -2 } },
  ] },
  { id: 't_friends', ages: [12, 17], icon: '🛹', question: 'Neue Clique aus dem Viertel.', options: [
    { label: 'Mit den Jungs aus dem Team abhängen', effects: { social: 3, technique: 2 } },
    { label: 'Mit der neuen Clique losziehen', effects: { social: 5, happiness: 3, discipline: -4 } },
    { label: 'Lieber zu Hause bleiben', effects: { social: -3, school: 2 } },
  ] },
];

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id)!;

// ---------- Hilfen ----------

export function emptyHousehold(): Household {
  return { year: 0, children: [], pending: [], properties: [], shares: [], totalIncome: 0, report: null, flirt: null, birth: null };
}

export function householdOf(career: Career): Household {
  if (!career.household) career.household = emptyHousehold();
  return career.household;
}

export const childAge = (h: Household, c: Child) => h.year - c.bornYear;

/** Alter des Vaters (im Ruhestand zählt das Familienjahr weiter). */
export function fatherAge(career: Career): number {
  if (career.coach) return career.coach.age;
  const h = career.household;
  if (career.phase === 'retired' && h?.retiredYear !== undefined) return career.player.age + (h.year - h.retiredYear);
  return career.player.age;
}

/** Charakter-Etiketten aus den Werten und Gewohnheiten. */
export function characterTags(c: Child): string[] {
  const s = c.stats;
  const out: string[] = [];
  if (s.discipline >= 70) out.push('Diszipliniert');
  if (s.discipline <= 25) out.push('Faul');
  if (s.school >= 70) out.push('Streber');
  if (s.school <= 20) out.push('Schulschwänzer');
  if (s.social >= 70) out.push('Beliebt');
  if (s.social <= 20) out.push('Einzelgänger');
  if (s.happiness >= 75) out.push('Fröhlich');
  if (s.happiness <= 25) out.push('Rebellisch');
  if (s.fitness >= 70) out.push('Sportskanone');
  if (s.fitness <= 20) out.push('Couch-Potato');
  if (s.technique >= 70) out.push('Ballkünstler');
  if ((c.habits.gaming ?? 0) >= 3) out.push('Zocker');
  if ((c.habits.fastfood ?? 0) >= 3) out.push('Fastfood-Fan');
  return out;
}

/** Fünf passende Entscheidungen für ein Kind in diesem Jahr. */
function choicesFor(h: Household, c: Child): PendingChoice[] {
  const age = childAge(h, c);
  if (c.status !== 'kid' || age > 17) return [];
  const pool = TEMPLATES.filter((t) => age >= t.ages[0] && age <= t.ages[1]);
  const picked: PendingChoice[] = [];
  const left = [...pool];
  while (picked.length < DECISIONS_PER_YEAR && left.length) {
    const t = left.splice(randInt(0, left.length - 1), 1)[0];
    picked.push({ childId: c.id, templateId: t.id });
  }
  return picked;
}

/** Entscheidungen sind in der Winterpause möglich – im Ruhestand jederzeit (außer mitten in einer Trainersaison). */
export function canDecide(career: Career): boolean {
  if (career.phase === 'winter') return true;
  if (career.phase !== 'retired') return false;
  const coach = career.coach;
  return !coach || coach.phase === 'done' || coach.phase === 'winter' || coach.phase === 'choose';
}

export const openDecisions = (career: Career) => (career.household?.pending ?? []).filter((p) => p.chosen === undefined);

// ---------- After-Party und Geburt ----------

const NAMES = ['Luca', 'Mia', 'Enzo', 'Sofia', 'Davi', 'Ana', 'Leon', 'Bianca', 'Thiago', 'Lara', 'Noah', 'Isabela', 'Rafael', 'Emma', 'Gabriel', 'Luna', 'Kauã', 'Maya'];

const FLIRT_TEXTS = [
  'Nach dem Auswärtssieg feierst du in einem Club. Zwei Brasilianerinnen setzen sich an deinen Tisch und laden dich zu ihrer After-Party ein …',
  'Im Urlaub in Rio tanzt du die ganze Nacht mit einer Gruppe Brasilianerinnen. Eine von ihnen fragt, ob du noch mitkommst …',
  'Beim Sponsorentermin schreibt dir eine brasilianische Influencerin: „Heute Abend Party bei mir – kommst du?“',
];

/** In einer Pause: ab 22 gelegentlich die Einladung (großes Pop-up). */
export function maybeFlirt(career: Career, roll: () => number = Math.random): void {
  const h = householdOf(career);
  if (fatherAge(career) < FATHER_MIN_AGE || h.children.length >= MAX_CHILDREN || h.flirt || h.birth) return;
  if (roll() < FLIRT_CHANCE) h.flirt = { text: pick(FLIRT_TEXTS) };
}

/** Talent des Kindes: teils vom Vater (Bestwertung der Karriere), dazu Zufall – und ein kleiner Samba-Bonus. */
function inheritTalent(career: Career): number {
  const peak = career.history.length ? summarizeCareer(career).peak : career.player.ovr;
  return Math.round(clamp(normal(peak * 0.55 + 18, 9), 20, 95));
}

export function newChild(career: Career, name?: string): Child {
  const h = householdOf(career);
  return {
    id: uid(),
    name: name ?? pick(NAMES),
    bornYear: h.year,
    talent: inheritTalent(career),
    stats: { fitness: 30, technique: 20, discipline: 30, school: 30, social: 30, happiness: 70 },
    habits: {},
    status: 'kid',
    earned: 0,
    log: ['Geboren – die Mutter kommt aus Brasilien.'],
  };
}

/**
 * Antwort auf die Einladung. Wer mitgeht, wird mit 45 % Vater – und mit etwas Pech landen Fotos in der Presse.
 * Gibt eine Meldung zurück.
 */
export function resolveFlirt(prev: Career, accept: boolean, roll: () => number = Math.random): Career {
  const career: Career = structuredClone(prev);
  const h = householdOf(career);
  if (!h.flirt) return prev;
  h.flirt = null;
  if (!accept) {
    h.report = { ...(h.report ?? { year: h.year, kidIncome: 0, rent: 0, dividends: 0, notes: [] }), notes: ['Du bist brav nach Hause gegangen.'] };
    career.updatedAt = Date.now();
    return career;
  }
  if (roll() < 0.15) career.scandal = Math.min(100, (career.scandal ?? 0) + 10); // Paparazzi
  if (roll() < BABY_CHANCE) {
    const child = newChild(career);
    h.children.push(child);
    h.pending.push(...choicesFor(h, child));
    h.birth = { childId: child.id };
  }
  career.updatedAt = Date.now();
  return career;
}

export function renameChild(prev: Career, childId: string, name: string): Career {
  const career: Career = structuredClone(prev);
  const h = householdOf(career);
  const c = h.children.find((x) => x.id === childId);
  if (c && name.trim()) c.name = name.trim().slice(0, 20);
  h.birth = null;
  career.updatedAt = Date.now();
  return career;
}

// ---------- Entscheidungen treffen ----------

/** Wählt eine Option. Gibt den Spielstand und die Kosten (Coins) zurück. */
export function decide(prev: Career, index: number, option: number, coinsAvailable: number): { career: Career; cost: number } {
  const p = prev.household?.pending[index];
  if (!p || p.chosen !== undefined || !canDecide(prev)) return { career: prev, cost: 0 };
  const opt = getTemplate(p.templateId).options[option];
  if (!opt || (opt.cost ?? 0) > coinsAvailable) return { career: prev, cost: 0 };
  const career: Career = structuredClone(prev);
  const h = householdOf(career);
  const pending = h.pending[index];
  pending.chosen = option;
  const child = h.children.find((c) => c.id === pending.childId)!;
  for (const [k, v] of Object.entries(opt.effects) as [StatKey, number][]) {
    // Abnehmender Ertrag: Je höher ein Wert schon ist, desto weniger bringt ein weiterer Schritt.
    const step = v > 0 ? v * clamp((100 - child.stats[k]) / 60, 0.15, 1) : v;
    child.stats[k] = clamp(Math.round((child.stats[k] + step) * 10) / 10, 0, 100);
  }
  if (opt.habit) child.habits[opt.habit] = (child.habits[opt.habit] ?? 0) + 1;
  career.updatedAt = Date.now();
  return { career, cost: opt.cost ?? 0 };
}

// ---------- Jahreswechsel ----------

/** Gehalt in Coins pro Jahr für ein Profi-Kind. */
export const kidWage = (ovr: number) => Math.round(50 * 1.15 ** (ovr - 55));

/** Wertung mit 18 aus Talent und Erziehung. */
export function ovrAt18(c: Child): number {
  const s = c.stats;
  let ovr = 28 + c.talent * 0.32 + s.technique * 0.12 + s.fitness * 0.1 + s.discipline * 0.06;
  // Zu viel Druck: Unglückliche Kinder brennen aus.
  if (s.happiness < 25) ovr -= 6;
  else if (s.happiness < 40) ovr -= 3;
  return Math.round(clamp(ovr, 35, 85));
}

function pickClub(career: Career, ovr: number): string {
  const options = CLUBS.filter((c) => !c.name.endsWith(' II'));
  return weightedPick(options, (c) => Math.exp(-((clubStrength(career, c.id) - (ovr + 3)) ** 2) / 12) + 1e-6).id;
}

function note(c: Child, text: string) {
  c.log = [text, ...c.log].slice(0, 8);
}

/**
 * Ein Jahr für alle Kinder: unbeantwortete Entscheidungen kosten Zufriedenheit, Kinder werden älter,
 * mit 16 kann die Lust auf Fußball verloren gehen, mit 18 fällt die Profi-Entscheidung, Profis entwickeln
 * sich und verdienen Coins. Gibt die Einnahmen und Meldungen zurück.
 */
export function familyYear(career: Career): { income: number; notes: string[] } {
  const h = householdOf(career);
  const notes: string[] = [];
  let income = 0;

  // Keine Zeit genommen: Das Kind merkt es.
  for (const p of h.pending.filter((x) => x.chosen === undefined)) {
    const c = h.children.find((x) => x.id === p.childId);
    if (c) c.stats.happiness = clamp(c.stats.happiness - 3, 0, 100);
  }
  const skipped = h.pending.filter((x) => x.chosen === undefined).length;
  if (skipped) notes.push(`${skipped} Entscheidungen offen gelassen – deine Kinder haben dich vermisst.`);

  h.year += 1;
  for (const c of h.children) {
    const age = childAge(h, c);
    if (c.status === 'kid') {
      // Ein bisschen wächst von allein.
      c.stats.fitness = clamp(c.stats.fitness + 1, 0, 100);
      if (age >= 6) c.stats.school = clamp(c.stats.school + 1, 0, 100);
      c.stats.happiness = clamp(c.stats.happiness + (50 - c.stats.happiness) * 0.1, 0, 100);
      if (age === 16 && c.stats.happiness < 20 && c.stats.discipline < 40 && chance(0.5)) {
        c.status = 'amateur';
        note(c, 'Hat mit 16 keine Lust mehr auf Fußball und hört auf.');
        notes.push(`${c.name} hat mit dem Fußball aufgehört.`);
      } else if (age >= 18) {
        const ovr = ovrAt18(c);
        if (ovr >= PRO_MIN_OVR) {
          c.status = 'pro';
          c.ovr = ovr;
          c.potential = Math.round(clamp(ovr + 3 + c.talent * 0.1 + c.stats.discipline * 0.03, ovr, 92));
          c.clubId = pickClub(career, ovr);
          note(c, `Profivertrag bei ${getClub(c.clubId).name} – Startwertung ${ovr}!`);
          notes.push(`🎉 ${c.name} wird Profi bei ${getClub(c.clubId).name} (Wertung ${ovr}).`);
        } else {
          c.status = 'amateur';
          note(c, `Mit Wertung ${ovr} hat es nicht zum Profi gereicht.`);
          notes.push(`${c.name} hat es nicht zum Profi geschafft (Wertung ${ovr}).`);
        }
      }
    } else if (c.status === 'pro' && c.ovr && c.potential) {
      const before = c.ovr;
      if (age <= 27) c.ovr = Math.min(c.potential, c.ovr + Math.max(0, Math.round((c.potential - c.ovr) * rand(0.2, 0.4))));
      else if (age >= 31) c.ovr = Math.max(45, c.ovr - randInt(1, 3));
      // Gute Spieler wechseln zu besseren Vereinen.
      if (c.clubId && c.ovr > clubStrength(career, c.clubId) + 4) {
        c.clubId = pickClub(career, c.ovr);
        note(c, `Wechsel zu ${getClub(c.clubId).name}.`);
      }
      const wage = kidWage(c.ovr);
      c.earned += wage;
      income += wage;
      if (c.ovr !== before) note(c, `Wertung ${before} → ${c.ovr}, verdient ${wage.toLocaleString('de-DE')} Coins.`);
      if (age >= 35) {
        c.status = 'retired';
        note(c, 'Beendet die Profikarriere.');
        notes.push(`${c.name} beendet die Profikarriere.`);
      }
    }
  }
  h.pending = h.children.flatMap((c) => choicesFor(h, c));
  return { income, notes };
}
