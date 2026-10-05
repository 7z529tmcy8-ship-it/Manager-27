import { CLUBS, getClub } from '../data/leagues';
import { summarizeCareer } from './legacy';
import { clubStrength } from './player';
import { chance, clamp, normal, pick, rand, randInt, uid, weightedPick } from './random';
import type { Career, Child, ChildStats, Household } from './types';

// Familie: Ab 22 kann man (einmal) Vater werden. Jedes Kind hat Werte wie Fitness, Technik, Disziplin, Schule,
// Freunde und Zufriedenheit. Statt jedes Jahr Fragen zu beantworten, legt man Erziehungsregeln fest
// (Verein, Schule, Zocken, Essen …) – einmal angemeldet ist angemeldet. Die Regeln wirken jedes Jahr automatisch
// und lassen sich jederzeit ändern. Mit 18 entscheidet sich, ob das Kind Fußballprofi wird –
// dann verdient es jedes Jahr Coins, die dem Club gutgeschrieben werden.

export const MAX_CHILDREN = 4;
export const FATHER_MIN_AGE = 22;
/** Chance pro Pause, zur After-Party eingeladen zu werden. */
export const FLIRT_CHANCE = 0.25;
/** Chance, dass aus der Nacht ein Kind wird (die Einladung kommt nur einmal pro Karriere – wer mitgeht, wird Vater). */
export const BABY_CHANCE = 1;
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

export type RuleId = 'club' | 'school' | 'gaming' | 'food' | 'friends' | 'training' | 'going_out';

export interface RuleOption {
  id: string;
  label: string;
  /** Wirkung pro Jahr. */
  effects: Partial<ChildStats>;
  /** Kosten pro Jahr in Coins. */
  cost?: number;
  /** Zählt jedes Jahr eine Gewohnheit hoch (z. B. 'gaming', 'fastfood'). */
  habit?: string;
  /** Erst ab diesem Alter wählbar (z. B. Internat ab 12). */
  minAge?: number;
}

export interface Rule {
  id: RuleId;
  icon: string;
  name: string;
  /** Die Regel gilt (und wirkt) erst ab diesem Alter. */
  minAge: number;
  maxAge?: number;
  /** Standard, wenn man nichts einstellt. */
  default: string;
  options: RuleOption[];
}

// ---------- Erziehungsregeln (wirken jedes Jahr, bis man sie ändert) ----------
export const RULES: Rule[] = [
  { id: 'club', icon: '⚽', name: 'Fußballverein', minAge: 4, default: 'none', options: [
    { id: 'none', label: 'Kein Verein', effects: { happiness: 1 } },
    { id: 'village', label: 'Dorfverein', effects: { technique: 4, fitness: 3, social: 2 } },
    { id: 'academy', label: 'Jugend eines Profivereins', effects: { technique: 6, fitness: 4, discipline: 2 }, cost: 500 },
    { id: 'boarding', label: 'Fußballinternat', effects: { technique: 7, fitness: 5, discipline: 4, social: -2, happiness: -2 }, cost: 1500, minAge: 12 },
  ] },
  { id: 'training', icon: '🏃', name: 'Extra-Training', minAge: 5, default: 'none', options: [
    { id: 'none', label: 'Kein Extra-Training', effects: { happiness: 1 } },
    { id: 'dad', label: 'Mit Papa im Garten kicken', effects: { technique: 2, happiness: 2 } },
    { id: 'coach', label: 'Privattrainer', effects: { technique: 4, fitness: 2 }, cost: 800 },
  ] },
  { id: 'school', icon: '📚', name: 'Schule', minAge: 6, maxAge: 17, default: 'normal', options: [
    { id: 'relaxed', label: 'Locker, Fußball geht vor', effects: { school: -3, happiness: 2 } },
    { id: 'normal', label: 'Normal', effects: { school: 2 } },
    { id: 'strict', label: 'Streng mit Noten', effects: { school: 5, discipline: 3, happiness: -3 } },
    { id: 'tutor', label: 'Nachhilfe', effects: { school: 4, discipline: 1 }, cost: 300 },
  ] },
  { id: 'gaming', icon: '🎮', name: 'Zocken', minAge: 5, default: 'hour', options: [
    { id: 'unlimited', label: 'Unbegrenzt', effects: { happiness: 4, discipline: -3, fitness: -2 }, habit: 'gaming' },
    { id: 'hour', label: 'Eine Stunde am Tag', effects: { happiness: 1, discipline: 1 } },
    { id: 'banned', label: 'Verboten', effects: { happiness: -3, discipline: 2 } },
  ] },
  { id: 'food', icon: '🍔', name: 'Ernährung', minAge: 0, default: 'home', options: [
    { id: 'fastfood', label: 'Fastfood erlaubt', effects: { happiness: 3, fitness: -3 }, habit: 'fastfood' },
    { id: 'home', label: 'Hausmannskost', effects: { fitness: 1 } },
    { id: 'plan', label: 'Ernährungsplan', effects: { fitness: 4 }, cost: 400 },
  ] },
  { id: 'friends', icon: '👫', name: 'Freunde', minAge: 3, default: 'normal', options: [
    { id: 'outside', label: 'Viel draußen mit Freunden', effects: { social: 4, fitness: 1, technique: 1, discipline: -1 } },
    { id: 'normal', label: 'Normal', effects: { social: 2 } },
    { id: 'home', label: 'Lieber zu Hause lernen', effects: { social: -2, school: 2 } },
  ] },
  { id: 'going_out', icon: '🎉', name: 'Ausgehen', minAge: 13, default: 'curfew', options: [
    { id: 'free', label: 'Erlaubt', effects: { social: 3, happiness: 3, discipline: -3, fitness: -1 } },
    { id: 'curfew', label: 'Bis 22 Uhr', effects: { social: 1, discipline: 1 } },
    { id: 'banned', label: 'Verboten', effects: { discipline: 2, happiness: -3 } },
  ] },
];

export const getRule = (id: RuleId) => RULES.find((r) => r.id === id)!;

/** Aktuell gewählte Option einer Regel (Standard, wenn nichts eingestellt). */
export function ruleOption(c: Child, rule: Rule): RuleOption {
  const id = c.rules?.[rule.id] ?? rule.default;
  return rule.options.find((o) => o.id === id) ?? rule.options.find((o) => o.id === rule.default)!;
}

/** Jährliche Kosten der aktuellen Regeln eines Kindes (nur für Regeln, die im Alter gelten). */
export function yearlyCost(h: Household, c: Child): number {
  const age = childAge(h, c);
  if (c.status !== 'kid') return 0;
  return RULES.filter((r) => age >= r.minAge && age <= (r.maxAge ?? 17)).reduce((a, r) => a + (ruleOption(c, r).cost ?? 0), 0);
}

/** Regel ändern – geht jederzeit. */
export function setRule(prev: Career, childId: string, ruleId: RuleId, optionId: string): Career {
  const child = prev.household?.children.find((c) => c.id === childId);
  const option = getRule(ruleId).options.find((o) => o.id === optionId);
  if (!child || !option || child.status !== 'kid') return prev;
  if (option.minAge !== undefined && childAge(prev.household!, child) < option.minAge) return prev;
  const career: Career = structuredClone(prev);
  const c = career.household!.children.find((x) => x.id === childId)!;
  c.rules = { ...(c.rules ?? {}), [ruleId]: optionId };
  career.updatedAt = Date.now();
  return career;
}

/** Wert mit abnehmendem Ertrag verändern: Je höher ein Wert schon ist, desto weniger bringt ein weiterer Schritt. */
function bump(c: Child, k: StatKey, v: number) {
  const step = v > 0 ? v * clamp((100 - c.stats[k]) / 60, 0.15, 1) : v;
  c.stats[k] = clamp(Math.round((c.stats[k] + step) * 10) / 10, 0, 100);
}

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

// ---------- After-Party und Geburt ----------

const NAMES = ['Luca', 'Mia', 'Enzo', 'Sofia', 'Davi', 'Ana', 'Leon', 'Bianca', 'Thiago', 'Lara', 'Noah', 'Isabela', 'Rafael', 'Emma', 'Gabriel', 'Luna', 'Kauã', 'Maya'];

const FLIRT_TEXTS = [
  'Nach dem Auswärtssieg feierst du in einem Club. Zwei Brasilianerinnen setzen sich an deinen Tisch und laden dich zu ihrer After-Party ein …',
  'Im Urlaub in Rio tanzt du die ganze Nacht mit einer Gruppe Brasilianerinnen. Eine von ihnen fragt, ob du noch mitkommst …',
  'Beim Sponsorentermin schreibt dir eine brasilianische Influencerin: „Heute Abend Party bei mir – kommst du?“',
];

/** In einer Pause: ab 22 kann die Einladung kommen (großes Pop-up) – aber nur ein einziges Mal pro Karriere. */
export function maybeFlirt(career: Career, roll: () => number = Math.random): void {
  const h = householdOf(career);
  // Nur einmal pro Karriere (ältere Spielstände mit Kindern zählen als „schon passiert“).
  if (h.flirtUsed || h.children.length > 0) return;
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
 * Antwort auf die Einladung. Wer mitgeht, wird Vater – und mit etwas Pech landen Fotos in der Presse.
 * Gibt eine Meldung zurück.
 */
export function resolveFlirt(prev: Career, accept: boolean, roll: () => number = Math.random): Career {
  const career: Career = structuredClone(prev);
  const h = householdOf(career);
  if (!h.flirt) return prev;
  h.flirt = null;
  h.flirtUsed = true;
  if (!accept) {
    h.report = { ...(h.report ?? { year: h.year, kidIncome: 0, rent: 0, dividends: 0, notes: [] }), notes: ['Du bist brav nach Hause gegangen.'] };
    career.updatedAt = Date.now();
    return career;
  }
  if (roll() < 0.15) career.scandal = Math.min(100, (career.scandal ?? 0) + 10); // Paparazzi
  if (roll() < BABY_CHANCE) {
    const child = newChild(career);
    h.children.push(child);
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
 * Ein Jahr für alle Kinder: Die Erziehungsregeln wirken (und kosten), Kinder werden älter, mit 16 kann die Lust
 * auf Fußball verloren gehen, mit 18 fällt die Profi-Entscheidung, Profis entwickeln sich und verdienen Coins.
 * Gibt Einnahmen, Kosten und Meldungen zurück.
 */
export function familyYear(career: Career): { income: number; costs: number; notes: string[] } {
  const h = householdOf(career);
  const notes: string[] = [];
  let income = 0;
  let costs = 0;

  // Erziehungsregeln wirken für das abgelaufene Jahr.
  for (const c of h.children.filter((x) => x.status === 'kid')) {
    const age = childAge(h, c);
    const before = { ...c.stats };
    for (const rule of RULES) {
      if (age < rule.minAge || age > (rule.maxAge ?? 17)) continue;
      const opt = ruleOption(c, rule);
      for (const [k, v] of Object.entries(opt.effects) as [StatKey, number][]) bump(c, k, v);
      if (opt.habit) c.habits[opt.habit] = (c.habits[opt.habit] ?? 0) + 1;
      costs += opt.cost ?? 0;
    }
    const changes = (Object.keys(STAT_LABELS) as StatKey[])
      .map((k) => [k, Math.round(c.stats[k] - before[k])] as const)
      .filter(([, d]) => d !== 0)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 3)
      .map(([k, d]) => `${STAT_LABELS[k]} ${d > 0 ? '+' : ''}${d}`);
    if (changes.length) note(c, `Mit ${age}: ${changes.join(', ')}`);
  }

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
  h.pending = [];
  return { income, costs, notes };
}
