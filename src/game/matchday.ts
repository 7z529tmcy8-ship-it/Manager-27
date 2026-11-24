// ---------- Spieltag-Modus & Kabine (Karriere-Update Paket 1 + 2) ----------
// Die Saison läuft in 6 Etappen. Nach jeder Etappe gibt es eine Szene aus einem echten Ligaspiel
// (Entscheidung mit Chance aus den eigenen Attributen), dazu sichtbares Trainer-Vertrauen, die Rolle im
// Team, ein Trainergespräch pro Etappe, einen Konkurrenten um den Platz und gelegentliche Trainerwechsel.
// Alles baut auf der vorhandenen Etappen-Simulation auf – Szenen ändern nur das Spiel, in dem sie passieren.

import { REAL_PLAYERS } from '../data/players';
import { getClub } from '../data/leagues';
import { attributes, clubLeagueId, clubStrength, currentClubId, seasonLabel } from './player';
import { STAGES, STAGES_PER_HALF, addResult, halfStats, leagueRounds, playStage, selectionValue, stageRounds, startProbability } from './season';
import { afterStage, ensureProgress } from './career';
import { postInbox } from './inbox';
import { FIRST, LAST } from './rival';
import { clamp } from './random';
import type { Career, MatchLine, Position, TableRow } from './types';

type Rand = () => number;

// ---------- Rolle im Team ----------

export type TeamRoleId = 'stand' | 'bench' | 'rotation' | 'starter' | 'key';
/** Stufen nach Startelf-Chance. */
export const TEAM_ROLES: { id: TeamRoleId; label: string; min: number }[] = [
  { id: 'stand', label: 'Tribüne', min: 0 },
  { id: 'bench', label: 'Bank', min: 0.15 },
  { id: 'rotation', label: 'Rotation', min: 0.35 },
  { id: 'starter', label: 'Stammspieler', min: 0.6 },
  { id: 'key', label: 'Unverzichtbar', min: 0.85 },
];

/** Startelf-Chance für die nächsten Spiele (ohne Verletzung/Sperre). */
export function startChance(career: Career): number {
  const p = career.player;
  const clubId = currentClubId(p);
  const prog = career.progress;
  const own = prog?.strength[clubId] ?? clubStrength(career, clubId);
  return startProbability(p.position, selectionValue(career, prog?.form ?? 6.8, own, prog?.load ?? 'normal'));
}

export function roleOf(pct: number): TeamRoleId {
  let id: TeamRoleId = 'stand';
  for (const r of TEAM_ROLES) if (pct >= r.min) id = r.id;
  return id;
}

export interface TeamRoleInfo {
  id: TeamRoleId;
  label: string;
  /** Startelf-Chance 0–1. */
  pct: number;
  captain: boolean;
  /** Nächste Stufe und wie weit es noch ist (Prozentpunkte). */
  next: { label: string; gap: number } | null;
}

export function teamRole(career: Career): TeamRoleInfo {
  const pct = startChance(career);
  const id = roleOf(pct);
  const i = TEAM_ROLES.findIndex((r) => r.id === id);
  const nx = TEAM_ROLES[i + 1];
  return {
    id, label: TEAM_ROLES[i].label, pct,
    captain: career.player.captainOf === currentClubId(career.player),
    next: nx ? { label: nx.label, gap: Math.max(1, Math.round((nx.min - pct) * 100)) } : null,
  };
}
export const roleLabel = (id: TeamRoleId) => TEAM_ROLES.find((r) => r.id === id)!.label;
export const roleRank = (id: TeamRoleId) => TEAM_ROLES.findIndex((r) => r.id === id);

// ---------- Vertrauen ----------

export const TRUST_MIN = -3;
export const TRUST_MAX = 3;
const TRUST_WORDS: [number, string][] = [[-2, 'Eisig'], [-0.75, 'Skeptisch'], [0.75, 'Neutral'], [2, 'Gut'], [99, 'Blind']];
export function trustInfo(career: Career): { value: number; pct: number; word: string; log: { text: string; d: number }[] } {
  const value = career.player.morale ?? 0;
  return {
    value,
    pct: (value - TRUST_MIN) / (TRUST_MAX - TRUST_MIN),
    word: TRUST_WORDS.find(([max]) => value < max)![1],
    log: career.player.trustLog ?? [],
  };
}
/** Vertrauen verändern und den Grund merken (die letzten fünf Gründe werden angezeigt). */
export function changeTrust(career: Career, d: number, text: string): void {
  const p = career.player;
  p.morale = clamp(Math.round(((p.morale ?? 0) + d) * 100) / 100, TRUST_MIN, TRUST_MAX);
  if (d !== 0) p.trustLog = [{ text, d }, ...(p.trustLog ?? [])].slice(0, 5);
}

// ---------- Konkurrent ----------

export interface Competitor { clubId: string; name: string; ovr: number; age: number; real: boolean }
const GROUP: Record<Position, string> = { TW: 'tw', IV: 'iv', AV: 'av', ZDM: 'zm', ZM: 'zm', ZOM: 'off', FL: 'off', ST: 'st' };

/** Echter Mitspieler auf der gleichen Position – sonst ein erfundener. Bleibt, solange man im Verein ist. */
export function ensureCompetitor(career: Career, rand: Rand = Math.random): Competitor | null {
  const p = career.player;
  const clubId = currentClubId(p);
  if (career.competitor?.clubId === clubId) return career.competitor;
  const years = Math.max(0, career.year - 2025);
  const grow = (age: number, ovr: number) => {
    let o = ovr;
    for (let y = 0; y < years; y++) { const a = age + y; o += a < 23 ? 2 : a > 31 ? -1.5 : 0; }
    return Math.round(clamp(o, 45, 94));
  };
  const club = getClub(clubId);
  const pool = REAL_PLAYERS
    .filter((r) => (r.clubId === clubId || r.clubId === club.name) && GROUP[r.position] === GROUP[p.position] && r.name !== p.name)
    .map((r) => ({ name: r.name, age: r.age + years, ovr: grow(r.age, r.ovr) }))
    .filter((r) => r.age <= 36);
  let c: Competitor;
  if (pool.length) {
    // Der stärkste direkte Rivale um den Platz: am ehesten der, der knapp über dir liegt.
    const best = [...pool].sort((a, b) => Math.abs(a.ovr - p.ovr - 2) - Math.abs(b.ovr - p.ovr - 2))[0];
    c = { clubId, name: best.name, ovr: best.ovr, age: best.age, real: true };
  } else {
    const s = clubStrength(career, clubId);
    c = {
      clubId,
      name: `${FIRST[Math.floor(rand() * FIRST.length)]} ${LAST[Math.floor(rand() * LAST.length)]}`,
      ovr: Math.round(clamp(s + Math.floor(rand() * 7) - 3, 45, 92)),
      age: 20 + Math.floor(rand() * 12),
      real: false,
    };
  }
  career.competitor = c;
  return c;
}

/** Vergleich mit dem Konkurrenten in einfachen Worten. */
export function duelText(career: Career): string {
  const c = career.competitor;
  if (!c) return '';
  const d = career.player.ovr - c.ovr;
  return d >= 4 ? 'Du liegst klar vorne' : d >= 1 ? 'Du liegst knapp vorne' : d === 0 ? 'Gleichauf' : d >= -3 ? 'Er liegt knapp vorne' : 'Er liegt klar vorne';
}

// ---------- Trainer ----------

export type TrainerStyle = 'youth' | 'veteran' | 'attack' | 'defense';
export interface Trainer { clubId: string; name: string; style: TrainerStyle; since: string; /** Mitten in der Saison geholt (dann fliegt er in dieser Saison nicht mehr). */ hired?: boolean }
export const TRAINER_STYLE: Record<TrainerStyle, string> = {
  youth: 'setzt auf junge Spieler', veteran: 'vertraut erfahrenen Spielern', attack: 'will Offensivfußball', defense: 'liebt Ordnung und Defensive',
};
const STYLES: TrainerStyle[] = ['youth', 'veteran', 'attack', 'defense'];
const COACH_FIRST = ['Marco', 'Stefan', 'Andrea', 'Luis', 'Frank', 'Erik', 'Pablo', 'Ole', 'Dario', 'Tomás', 'Henrik', 'Mikel'];
const COACH_LAST = ['Brenner', 'Valtieri', 'Lindqvist', 'Ortega', 'Hollmann', 'Duarte', 'Kessler', 'Moreno', 'Falk', 'Roux', 'Bergstedt'];

function newTrainer(career: Career, rand: Rand): Trainer {
  return {
    clubId: currentClubId(career.player),
    name: `${COACH_FIRST[Math.floor(rand() * COACH_FIRST.length)]} ${COACH_LAST[Math.floor(rand() * COACH_LAST.length)]}`,
    style: STYLES[Math.floor(rand() * STYLES.length)],
    since: seasonLabel(career.year),
  };
}
export function ensureTrainer(career: Career, rand: Rand = Math.random): Trainer {
  const clubId = currentClubId(career.player);
  if (career.trainer?.clubId !== clubId) career.trainer = newTrainer(career, rand);
  return career.trainer!;
}
/** Passt der Spieler zum Stil des Trainers? (kleiner Bonus beim Trainerwechsel) */
export function styleFits(style: TrainerStyle, career: Career): boolean {
  const p = career.player;
  if (style === 'youth') return p.age <= 22;
  if (style === 'veteran') return p.age >= 29;
  if (style === 'attack') return ['ST', 'FL', 'ZOM'].includes(p.position);
  return ['TW', 'IV', 'AV', 'ZDM'].includes(p.position);
}

/**
 * Trainerwechsel: Steht der Verein nach einer Etappe im unteren Tabellendrittel, fliegt der Trainer manchmal.
 * Der Neue fängt bei null an – das Vertrauen wird halbiert, passt dein Profil zu seinem Stil, gibt es etwas Kredit.
 */
export function maybeSackTrainer(career: Career, rand: Rand = Math.random): string | null {
  const prog = career.progress;
  if (!prog) return null;
  const clubId = currentClubId(career.player);
  const rows = prog.rows[clubLeagueId(career, clubId)];
  if (!rows?.length) return null;
  const sorted = [...rows].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
  const pos = sorted.findIndex((r) => r.clubId === clubId) + 1;
  const old = ensureTrainer(career, rand);
  // Frühestens nach zwei Etappen, höchstens ein Wechsel pro Saison
  if ((prog.stage ?? 0) < 2 || (old.hired && old.since === seasonLabel(career.year))) return null;
  if (pos <= Math.ceil(rows.length * 0.66) || rand() > 0.3) return null;
  const t = { ...newTrainer(career, rand), hired: true };
  career.trainer = t;
  const p = career.player;
  p.morale = Math.round((p.morale ?? 0) * 50) / 100;
  const fits = styleFits(t.style, career);
  changeTrust(career, fits ? 1 : 0, `Neuer Trainer ${t.name} ${TRAINER_STYLE[t.style]}`);
  const text = `${old.name} ist entlassen (Platz ${pos}). Neuer Trainer: ${t.name} – er ${TRAINER_STYLE[t.style]}.${fits ? ' Das passt zu dir!' : ' Du musst dich neu beweisen.'}`;
  postInbox(career, { kind: 'event', title: 'Trainerwechsel', text });
  return text;
}

// ---------- Trainergespräch ----------

export type TalkId = 'demand' | 'task' | 'team';
export interface CoachTask { stage: number; metric: 'rating' | 'goals' | 'apps' | 'assists'; target: number; label: string }
export const TALKS: { id: TalkId; label: string; hint: string }[] = [
  { id: 'demand', label: 'Mehr Spielzeit fordern', hint: 'Mutig: klappt bei guter Form – sonst ist der Trainer genervt' },
  { id: 'task', label: 'Was erwarten Sie von mir?', hint: 'Der Trainer gibt dir ein Ziel für die nächste Etappe' },
  { id: 'team', label: 'Für die Mannschaft da sein', hint: 'Sicher: ein kleines Plus beim Vertrauen' },
];

/** Durchschnittsnote der letzten gespielten Etappe (oder null). */
function lastStageRating(career: Career): number | null {
  const log = career.progress?.stageLog ?? [];
  return log.length ? log[log.length - 1].avgRating ?? null : null;
}
export function canTalk(career: Career): boolean {
  const prog = career.progress;
  if (career.phase !== 'season' || career.player.absent) return false;
  return (prog?.talkedStage ?? -1) !== (prog?.stage ?? 0);
}
/** Chance, dass „Mehr Spielzeit fordern“ klappt. */
export function demandChance(career: Career): number {
  const r = lastStageRating(career) ?? 6.6;
  return clamp(0.5 + (r - 6.8) * 0.35 + (career.player.morale ?? 0) * 0.06, 0.1, 0.9);
}
export function coachTalk(prev: Career, id: TalkId, rand: Rand = Math.random): { career: Career; text: string; tone: 'good' | 'bad' | 'neutral' } {
  const career: Career = structuredClone(prev);
  const prog = ensureProgress(career);
  const stage = prog.stage ?? 0;
  prog.talkedStage = stage;
  const t = ensureTrainer(career, rand);
  let text: string; let tone: 'good' | 'bad' | 'neutral' = 'neutral';
  if (id === 'demand') {
    if (rand() < demandChance(career)) {
      changeTrust(career, 1, 'Spielzeit eingefordert – mit Erfolg');
      text = `${t.name}: „Du hast recht. Du bekommst deine Chance.“ (+1 Vertrauen)`; tone = 'good';
    } else {
      changeTrust(career, -1, 'Spielzeit gefordert – Trainer genervt');
      text = `${t.name}: „Fordern kann jeder. Zeig es erst im Training.“ (−1 Vertrauen)`; tone = 'bad';
    }
  } else if (id === 'task') {
    const p = career.player;
    const metric: CoachTask['metric'] = ['ST', 'FL', 'ZOM'].includes(p.position) ? 'goals' : ['ZM', 'AV'].includes(p.position) ? 'assists' : 'rating';
    const r = teamRole(career).id;
    const task: CoachTask = metric === 'goals'
      ? { stage, metric, target: roleRank(r) >= 3 ? 3 : 2, label: '' }
      : metric === 'assists' ? { stage, metric, target: 2, label: '' }
        : { stage, metric, target: 7, label: '' };
    if (roleRank(r) <= 1) Object.assign(task, { metric: 'apps', target: 3 });
    task.label = task.metric === 'goals' ? `${task.target} Tore in der nächsten Etappe`
      : task.metric === 'assists' ? `${task.target} Vorlagen in der nächsten Etappe`
        : task.metric === 'apps' ? `${task.target} Einsätze in der nächsten Etappe (Training überzeugen)`
          : `Ø-Note ${task.target},0 in der nächsten Etappe`;
    prog.coachTask = task;
    text = `${t.name}: „${task.label} – dann reden wir weiter.“`;
  } else {
    if ((career.player.morale ?? 0) < 1.5) { changeTrust(career, 0.5, 'Teamgeist gezeigt'); text = `${t.name} nickt. Teamgeist kommt an. (+0,5 Vertrauen)`; tone = 'good'; }
    else text = `${t.name}: „Weiß ich doch. Weiter so.“`;
  }
  career.updatedAt = Date.now();
  return { career, text, tone };
}

/** Auftrag des Trainers nach der Etappe auswerten. */
export function evalCoachTask(career: Career, stage: number): string | null {
  const prog = career.progress;
  const task = prog?.coachTask;
  if (!prog || !task || task.stage !== stage) return null;
  prog.coachTask = null;
  const st = halfStats(prog.matches.filter((m) => m.stage === stage));
  const value = task.metric === 'goals' ? st.goals : task.metric === 'assists' ? st.assists : task.metric === 'apps' ? st.apps : st.avgRating ?? 0;
  if (value >= task.target) {
    changeTrust(career, 1, `Trainer-Auftrag erfüllt: ${task.label}`);
    return `Auftrag erfüllt (${task.label}) – +1 Vertrauen.`;
  }
  return `Auftrag verpasst (${task.label}). Kein Drama – nächste Chance kommt.`;
}

// ---------- Szenen ----------

export interface SceneOption { id: string; label: string; hint: string; chance: number; win: 'goal' | 'assist' | 'save'; risky: boolean }
export interface Scene { stage: number; match: number; title: string; text: string; options: SceneOption[] }
export interface SceneOutcome { stage: number; title: string; text: string; good: boolean }

const ATTR = (career: Career) => {
  const v = attributes(career.player);
  return (i: number) => v[i] ?? career.player.ovr;
};
/** Chance aus einem Attribut: 50 → 25 %, 75 → 54 %, 90 → 71 % (mit Risiko-Faktor). */
const fromAttr = (a: number, ease: number) => clamp(0.25 + (a - 50) / 85 + ease, 0.08, 0.9);

function sceneFor(career: Career, line: MatchLine, rand: Rand): Omit<Scene, 'stage' | 'match'> {
  const p = career.player;
  const at = ATTR(career);
  const opp = getClub(line.opponent).name;
  const minute = 55 + Math.floor(rand() * 35);
  const score = `${line.goalsFor}:${line.goalsAgainst}`;
  const ctx = `${line.home ? 'Heimspiel' : 'Auswärts'} gegen ${opp}, ${minute}. Minute, es steht ${score}.`;
  const pick = rand();
  if (p.position === 'TW') {
    return pick < 0.5
      ? { title: 'Elfmeter gegen dich', text: `${ctx} Der Schütze legt sich den Ball zurecht.`, options: [
        { id: 'corner', label: 'Früh in die Ecke springen', hint: 'Reflexe', chance: fromAttr(at(3), -0.12), win: 'save', risky: true },
        { id: 'wait', label: 'Lange stehen bleiben', hint: 'Stellungsspiel', chance: fromAttr(at(5), -0.2), win: 'save', risky: false },
      ] }
      : { title: 'Hohe Flanke in den Strafraum', text: `${ctx} Der Ball segelt Richtung Fünfmeterraum.`, options: [
        { id: 'out', label: 'Rauslaufen und fangen', hint: 'Ballsicherheit', chance: fromAttr(at(1), 0), win: 'save', risky: true },
        { id: 'line', label: 'Auf der Linie bleiben', hint: 'Reflexe', chance: fromAttr(at(3), -0.1), win: 'save', risky: false },
      ] };
  }
  if (['IV', 'AV', 'ZDM'].includes(p.position) && pick < 0.6) {
    return { title: 'Konter gegen euch', text: `${ctx} Ein Stürmer läuft allein auf dich zu.`, options: [
      { id: 'tackle', label: 'Grätschen', hint: 'Defensive · bei Fehler droht Elfmeter', chance: fromAttr(at(4), 0.05), win: 'save', risky: true },
      { id: 'jockey', label: 'Stellen und abdrängen', hint: 'Tempo', chance: fromAttr(at(0), 0), win: 'save', risky: false },
    ] };
  }
  if (pick < 0.35 && p.position !== 'IV') {
    return { title: 'Freistoß aus 22 Metern', text: `${ctx} Du stehst am Ball.`, options: [
      { id: 'shoot', label: 'Direkt schießen', hint: 'Abschluss', chance: fromAttr(at(1), -0.15), win: 'goal', risky: true },
      { id: 'cross', label: 'Flanke auf den Kopf', hint: 'Passen', chance: fromAttr(at(2), -0.08), win: 'assist', risky: false },
    ] };
  }
  if (['ST', 'FL', 'ZOM'].includes(p.position)) {
    return { title: 'Allein vor dem Torwart', text: `${ctx} Steilpass – du bist durch!`, options: [
      { id: 'shoot', label: 'Flach ins Eck', hint: 'Abschluss', chance: fromAttr(at(1), 0.05), win: 'goal', risky: false },
      { id: 'chip', label: 'Lupfer', hint: 'Dribbling · riskant, aber spektakulär', chance: fromAttr(at(3), -0.1), win: 'goal', risky: true },
      { id: 'square', label: 'Querpass zum Mitspieler', hint: 'Passen', chance: fromAttr(at(2), 0.1), win: 'assist', risky: false },
    ] };
  }
  return { title: 'Konter 3 gegen 2', text: `${ctx} Du treibst den Ball durchs Mittelfeld.`, options: [
    { id: 'through', label: 'Steilpass in die Tiefe', hint: 'Passen', chance: fromAttr(at(2), 0), win: 'assist', risky: false },
    { id: 'solo', label: 'Selbst durchziehen', hint: 'Tempo & Abschluss', chance: fromAttr((at(0) + at(1)) / 2, -0.12), win: 'goal', risky: true },
  ] };
}

/** Nach einer Etappe: Szene aus einem Ligaspiel, in dem du auf dem Platz standest (sonst keine). */
export function makeScene(career: Career, stage: number, rand: Rand = Math.random): Scene | null {
  const prog = career.progress;
  if (!prog) return null;
  const idx = prog.matches.map((m, i) => [m, i] as const).filter(([m]) => m.stage === stage && m.competition === 'Liga' && m.minutes >= 20);
  if (!idx.length) return null;
  // Duell mit dem Rivalen hat Vorrang
  const rivalClub = career.rival && !career.rival.retired ? career.rival.clubId : null;
  const derby = rivalClub ? idx.find(([m]) => m.opponent === rivalClub) : undefined;
  const [line, i] = derby ?? idx[Math.floor(rand() * idx.length)];
  const sc = sceneFor(career, line, rand);
  if (derby && career.rival) return { stage, match: i, ...sc, title: `Rivalen-Duell: ${sc.title}`, text: `${sc.text} Drüben steht ${career.rival.name} – alle schauen auf euch beide.` };
  return { stage, match: i, ...sc };
}

function unResult(row: TableRow, gf: number, ga: number) {
  row.played--; row.goalsFor -= gf; row.goalsAgainst -= ga;
  if (gf > ga) { row.won--; row.points -= 3; } else if (gf === ga) { row.drawn--; row.points -= 1; } else row.lost--;
}
/** Ergebnis eines Ligaspiels nachträglich ändern – Tabelle bleibt stimmig. */
function rewriteResult(career: Career, line: MatchLine, gf: number, ga: number) {
  const prog = career.progress!;
  const rows = prog.rows[clubLeagueId(career, line.clubId)];
  const own = rows?.find((r) => r.clubId === line.clubId);
  const opp = rows?.find((r) => r.clubId === line.opponent);
  if (own && opp) {
    unResult(own, line.goalsFor, line.goalsAgainst); unResult(opp, line.goalsAgainst, line.goalsFor);
    addResult(own, gf, ga); addResult(opp, ga, gf);
  }
  line.goalsFor = gf; line.goalsAgainst = ga;
}

/** Entscheidung in der Szene: würfeln, Spiel und Note anpassen, Vertrauen und Form mitnehmen. */
export function resolveScene(prev: Career, optionId: string | null, rand: Rand = Math.random): { career: Career; outcome: SceneOutcome | null } {
  const career: Career = structuredClone(prev);
  const prog = career.progress;
  const scene = prog?.scene;
  if (!prog || !scene) return { career, outcome: null };
  prog.scene = null;
  const opt = scene.options.find((o) => o.id === optionId);
  if (!opt) return { career, outcome: null };
  const line = prog.matches[scene.match];
  const ok = rand() < opt.chance;
  const oldRating = line.rating ?? 6.5;
  let d = 0; let text: string;
  if (ok) {
    if (opt.win === 'goal') { line.goals++; rewriteResult(career, line, line.goalsFor + 1, line.goalsAgainst); d = opt.risky ? 1.1 : 0.9; text = opt.risky ? 'Traumtor! Das Stadion steht Kopf.' : 'Tor! Eiskalt verwandelt.'; }
    else if (opt.win === 'assist') { line.assists++; rewriteResult(career, line, line.goalsFor + 1, line.goalsAgainst); d = 0.6; text = 'Vorlage – dein Mitspieler muss nur noch einschieben.'; }
    else {
      if (line.goalsAgainst > 0) rewriteResult(career, line, line.goalsFor, line.goalsAgainst - 1);
      d = 0.7; text = career.player.position === 'TW' ? 'Gehalten! Riesentat.' : 'Ball erobert – Gefahr gebannt.';
    }
    changeTrust(career, opt.risky ? 0.5 : 0.3, `Starke Szene gegen ${getClub(line.opponent).name}`);
  } else {
    if (opt.win === 'save' && opt.risky) {
      rewriteResult(career, line, line.goalsFor, line.goalsAgainst + 1);
      d = -0.6; text = career.player.position === 'TW' ? 'Falsche Ecke – der Ball ist drin.' : 'Zu spät! Elfmeter – und drin.';
      changeTrust(career, -0.5, `Patzer gegen ${getClub(line.opponent).name}`);
    } else {
      d = opt.risky ? -0.4 : -0.15;
      text = opt.win === 'goal' ? (opt.risky ? 'Lupfer zu kurz – der Torwart pflückt ihn runter.' : 'Knapp vorbei!') : opt.win === 'assist' ? 'Der Pass kommt nicht an.' : 'Er ist an dir vorbei – zum Glück klärt ein Mitspieler.';
      if (opt.risky) changeTrust(career, -0.25, `Riskante Szene gegen ${getClub(line.opponent).name} verpatzt`);
    }
  }
  line.rating = Math.round(clamp(oldRating + d, 3, 10) * 10) / 10;
  prog.form = clamp(prog.form + d * 0.15, 3, 10);
  // Etappen-Bilanz neu berechnen (Tore, Note, Tabellenplatz)
  const log = prog.stageLog?.find((s) => s.stage === scene.stage);
  if (log) {
    const st = halfStats(prog.matches.filter((m) => m.stage === scene.stage));
    const rows = prog.rows[log.leagueId] ?? [];
    const sorted = [...rows].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor);
    Object.assign(log, { goals: st.goals, assists: st.assists, avgRating: st.avgRating, position: sorted.findIndex((r) => r.clubId === line.clubId) + 1, points: sorted.find((r) => r.clubId === line.clubId)?.points ?? log.points });
  }
  const outcome: SceneOutcome = { stage: scene.stage, title: `${scene.title}: ${opt.label}`, text, good: ok };
  prog.sceneLog = [...(prog.sceneLog ?? []), outcome].slice(-12);
  career.updatedAt = Date.now();
  return { career, outcome };
}

// ---------- Etappe spielen ----------

/** Spieltage (1-basiert) der kommenden Etappe in der eigenen Liga. */
export function stageMatchdays(career: Career): [number, number] | null {
  const prog = career.progress;
  if (!prog) return null;
  const rounds = leagueRounds(prog, clubLeagueId(career, currentClubId(career.player))).length;
  const [a, b] = stageRounds(rounds, prog.stage ?? 0);
  return b > a ? [a + 1, b] : null;
}

/**
 * Eine Etappe spielen. Danach: Trainer-Auftrag auswerten, evtl. Trainerwechsel, Szene vorbereiten.
 * Gibt es eine Szene, bleibt die Karriere in der Etappe stehen, bis sie entschieden ist (resolveScene → closeStage).
 */
export function playEtappe(prev: Career, rand: Rand = Math.random): Career {
  const career: Career = structuredClone(prev);
  career.decision = null;
  career.decisionResult = null;
  const prog = ensureProgress(career);
  prog.scene = null;
  ensureTrainer(career, rand);
  ensureCompetitor(career, rand);
  const stage = prog.stage ?? 0;
  if (stage >= STAGES) return career;
  prog.recap = { stage, roleFrom: teamRole(career).id, trustFrom: career.player.morale ?? 0 };
  playStage(career, prog, stage);
  const notes: string[] = [];
  const task = evalCoachTask(career, stage);
  if (task) notes.push(task);
  // Trainerwechsel nur mitten in der Halbserie (nicht direkt vor der Pause)
  if (prog.stage !== STAGES_PER_HALF && prog.stage !== STAGES) { const sack = maybeSackTrainer(career, rand); if (sack) notes.push(sack); }
  if (notes.length) career.decisionResult = { title: 'Kabine', text: notes.join(' '), tone: 'neutral' };
  prog.scene = career.player.absent ? null : makeScene(career, stage, rand);
  career.updatedAt = Date.now();
  return career;
}

/** Die Etappe abschließen: weiter in der Saison, Winterpause oder Saisonende. */
export function closeStage(prev: Career): Career {
  const note = prev.decisionResult;
  const next = afterStage({ ...prev, progress: prev.progress ? { ...prev.progress, scene: null } : prev.progress });
  // Szenen- und Kabinen-Notiz behalten, wenn die Saison einfach weiterläuft
  return next.phase === 'season' && note && !next.decisionResult ? { ...next, decisionResult: note } : next;
}

/** Ist die Etappe, die gerade gespielt wurde, die letzte vor einer Pause? */
export const breakAfter = (stagePlayed: number) => stagePlayed + 1 === STAGES_PER_HALF || stagePlayed + 1 === STAGES;
