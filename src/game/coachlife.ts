import { FIRST, LAST } from './rival';
import { clamp, pick, randInt, uid } from './random';
import type { Career, CoachState } from './types';

// Kabine & Linie: Als Trainer legt man vorab fest, wie man in typischen Situationen handelt (Skandale, Verletzungen,
// Disziplin, Talente, Stars) – oder entscheidet selbst, wenn es passiert. In jeder Saisonphase kommen 1–2 Meldungen
// mit echten Namen aus dem Kader. Jede Entscheidung verändert die Teamstärke für die nächste Halbserie und den
// Trainer-Ruf (Kabine, Medien, Konsequenz) – und der Ruf wirkt am Saisonende auf den Trainerwert.

export type PolicyId = 'scandal' | 'injury' | 'discipline' | 'youth' | 'star';
export type IncidentChoice = string;

export interface PolicyDef {
  id: PolicyId;
  icon: string;
  name: string;
  question: string;
  /** Mögliche Linien (ohne „Ich entscheide selbst“). */
  options: { id: string; label: string; text: string }[];
}

export const POLICIES: PolicyDef[] = [
  { id: 'scandal', icon: '📰', name: 'Skandale', question: 'Ein Spieler sorgt für Negativ-Schlagzeilen – spielt er im nächsten wichtigen Spiel?', options: [
    { id: 'bench', label: 'Hart durchgreifen', text: 'Wer Ärger macht, sitzt draußen.' },
    { id: 'play', label: 'Leistung zählt', text: 'Privates bleibt privat – der Beste spielt.' },
  ] },
  { id: 'injury', icon: '🩹', name: 'Angeschlagene Spieler', question: 'Ein Leistungsträger ist angeschlagen, will aber unbedingt spielen.', options: [
    { id: 'rest', label: 'Gesundheit zuerst', text: 'Kein Risiko – er pausiert.' },
    { id: 'big', label: 'Nur in großen Spielen', text: 'Im Topspiel ja, sonst Pause.' },
    { id: 'play', label: 'Fit spritzen', text: 'Er spielt immer – koste es, was es wolle.' },
  ] },
  { id: 'discipline', icon: '⏰', name: 'Disziplin', question: 'Ein Spieler kommt zu spät, feiert oder schwänzt das Training.', options: [
    { id: 'fine', label: 'Geldstrafe', text: 'Klare Regeln, aber keine Sperre.' },
    { id: 'kick', label: 'Suspendierung', text: 'Raus aus dem Kader, bis er es kapiert.' },
    { id: 'ignore', label: 'Laufen lassen', text: 'Erwachsene Männer – ich bin nicht ihr Papa.' },
  ] },
  { id: 'youth', icon: '🌱', name: 'Talente', question: 'Ein junges Talent drängt in die erste Elf.', options: [
    { id: 'promote', label: 'Jugend fördern', text: 'Ins kalte Wasser – so werden Stars gemacht.' },
    { id: 'experience', label: 'Erfahrung zählt', text: 'Die Routiniers spielen, das Talent wartet.' },
  ] },
  { id: 'star', icon: '⭐', name: 'Star-Allüren', question: 'Ein Star fordert mehr Spielzeit oder Geld und droht mit Streik.', options: [
    { id: 'give', label: 'Nachgeben', text: 'Hauptsache, er ist glücklich.' },
    { id: 'hard', label: 'Klare Kante', text: 'Niemand ist größer als der Verein.' },
  ] },
];

export const ASK = 'ask';
export const getPolicy = (id: PolicyId) => POLICIES.find((p) => p.id === id)!;

export interface Incident {
  id: string;
  type: PolicyId;
  player: string;
  title: string;
  text: string;
  /** Wichtiges Spiel (Derby, Topspiel, Pokal) – mehr Risiko, mehr Wirkung. */
  big: boolean;
}

export interface CoachProfile {
  /** Stimmung in der Kabine (−100 … 100). */
  kabine: number;
  /** Bild in den Medien (−100 … 100). */
  medien: number;
  /** Wie konsequent die Linie ist (0 … 100). */
  konsequenz: number;
}

export const emptyProfile = (): CoachProfile => ({ kabine: 0, medien: 0, konsequenz: 50 });

/** Trainertyp aus dem Profil – für die Anzeige. */
export function coachStyle(p: CoachProfile): string {
  if (p.konsequenz >= 70 && p.kabine < 0) return '🧊 Harter Hund';
  if (p.kabine >= 30 && p.medien >= 10) return '🤗 Spielerversteher';
  if (p.medien <= -30) return '🔥 Skandaltrainer';
  if (p.konsequenz >= 70) return '📏 Mann mit Prinzipien';
  if (p.konsequenz <= 30) return '🎲 Wetterfahne';
  return '⚖️ Pragmatiker';
}

const MAX_FEED = 14;
const name = () => `${pick(FIRST)} ${pick(LAST)}`;

/** Kadernamen pro Verein (fest, damit dieselben Spieler immer wieder auftauchen). */
function squadOf(coach: CoachState): string[] {
  if (!coach.squad || coach.squadClub !== coach.clubId) {
    coach.squad = Array.from({ length: 16 }, name);
    coach.squadClub = coach.clubId;
  }
  const signed = coach.live?.signings.map((s) => s.name) ?? [];
  return [...coach.squad, ...signed];
}

const BIG_GAMES = ['im Derby', 'im Topspiel gegen den Tabellenführer', 'im Pokal-Viertelfinale', 'im Kellerduell', 'im Spitzenspiel am Samstagabend'];

function makeIncident(coach: CoachState, type: PolicyId): Incident {
  const squad = squadOf(coach);
  const player = type === 'youth' ? `${pick(FIRST)} ${pick(LAST)} (18)` : pick(squad);
  // Nur bei Einsatzfragen gibt es ein „wichtiges Spiel“.
  const big = (type === 'scandal' || type === 'injury' || type === 'youth') && Math.random() < 0.6;
  const game = pick(BIG_GAMES);
  const texts: Record<PolicyId, [string, string]> = {
    scandal: ['📰 Medienskandal', `${player} ist nach einem Partyvideo in allen Zeitungen. ${big ? `Am Wochenende geht es ${game}.` : 'Am Wochenende steht ein normales Ligaspiel an.'} Setzt du ihn ein?`],
    injury: ['🩹 Angeschlagen', `${player} hat Probleme mit dem Oberschenkel, will aber unbedingt spielen${big ? ` – ${game}` : ''}.`],
    discipline: ['⏰ Disziplinlos', `${player} kam zum dritten Mal zu spät zum Training – mit Sonnenbrille.`],
    youth: ['🌱 Talent drängt nach oben', `Das Eigengewächs ${player} spielt im Training alle schwindelig. Bringst du ihn${big ? ` sogar ${game}` : ''}?`],
    star: ['⭐ Star-Allüren', `${player} will mehr Spielzeit und ein besseres Gehalt – sonst streikt er. Die Presse wartet auf deine Antwort.`],
  };
  return { id: uid(), type, player, title: texts[type][0], text: texts[type][1], big };
}

/** Antworten, die bei einem Ereignis angeboten werden. */
export function incidentOptions(i: Incident): { id: string; label: string }[] {
  const base = getPolicy(i.type).options.map((o) => ({ id: o.id, label: o.label }));
  if (i.type === 'injury' && !i.big) return base.filter((o) => o.id !== 'big');
  return base;
}

/**
 * Entscheidung anwenden: verändert Teamstärke (live.boost), Ruf und ggf. Vereinsstärke.
 * Gibt die Meldung zurück. `roll` für Tests austauschbar.
 */
export function applyIncident(career: Career, i: Incident, choice: string, auto: boolean, roll: () => number = Math.random): string {
  const coach = career.coach!;
  const live = coach.live;
  const p = (coach.profile ??= emptyProfile());
  let boost = 0;
  let text = '';
  const k = (n: number) => (p.kabine = clamp(p.kabine + n, -100, 100));
  const m = (n: number) => (p.medien = clamp(p.medien + n, -100, 100));
  const w = i.big ? 1.5 : 1;

  switch (i.type) {
    case 'scandal':
      if (choice === 'play') {
        if (roll() < 0.55) {
          boost = 0.9 * w; k(4); m(-8);
          text = `${i.player} spielt – und zahlt es mit einem Tor zurück. Die Presse tobt trotzdem.`;
        } else {
          boost = -0.7 * w; m(-18); k(-3);
          text = `${i.player} spielt völlig neben sich. Die Schlagzeilen: „Trainer schützt Skandal-Profi“.`;
        }
      } else {
        boost = -0.5 * w; m(10); k(-4);
        text = `${i.player} sitzt draußen. Die Medien loben deine Linie, ein paar Spieler murren.`;
      }
      break;
    case 'injury':
      if (choice === 'play' || (choice === 'big' && i.big)) {
        if (roll() < 0.65) {
          boost = 0.7 * w; k(3);
          text = `${i.player} beißt auf die Zähne und hält durch – starke Leistung.`;
        } else {
          boost = -1.1 * w; k(-6); m(-6);
          text = `${i.player} muss nach 20 Minuten raus: Muskelfaserriss, wochenlang weg. Die Ärzte hatten gewarnt.`;
        }
      } else {
        boost = -0.3; k(2);
        text = `${i.player} pausiert und ist danach wieder voll fit.`;
      }
      break;
    case 'discipline':
      if (choice === 'fine') {
        k(2);
        text = `${i.player} zahlt eine saftige Geldstrafe in die Mannschaftskasse. Ruhe in der Kabine.`;
      } else if (choice === 'kick') {
        boost = -0.4; k(5); m(5);
        text = `${i.player} wird suspendiert. Der Rest der Mannschaft zieht plötzlich voll mit.`;
      } else {
        k(-8);
        text = `Du lässt ${i.player} laufen. Andere fragen sich, warum für sie andere Regeln gelten.`;
      }
      break;
    case 'youth':
      if (choice === 'promote') {
        if (roll() < 0.5) {
          boost = 0.6 * w; m(8);
          career.clubDrift[coach.clubId!] = (career.clubDrift[coach.clubId!] ?? 0) + 0.5;
          text = `${i.player} schlägt ein wie eine Bombe! Ganz ${i.big ? 'Deutschland' : 'die Stadt'} spricht vom neuen Talent.`;
        } else {
          boost = -0.4 * w; k(-2);
          text = `${i.player} ist noch nicht so weit – ein schwerer Fehler kostet Punkte.`;
        }
      } else {
        boost = 0.2; k(3);
        text = `Die Routiniers bleiben drin, ${i.player} muss warten. Die alten Hasen danken es dir.`;
      }
      break;
    case 'star':
      if (choice === 'give') {
        boost = 0.5; k(-6); m(-4);
        if (live) live.budget = Math.max(0, Math.round(live.budget * 0.85));
        text = `${i.player} bekommt, was er will. Er ist glücklich – der Rest der Kabine weniger. Das Transferbudget schrumpft.`;
      } else if (roll() < 0.6) {
        k(5); m(6);
        text = `${i.player} lenkt ein und entschuldigt sich öffentlich. Deine Autorität wächst.`;
      } else {
        boost = -1 * w; m(-10);
        text = `${i.player} streikt wirklich und lässt sich krankmelden. Das tut weh.`;
      }
      break;
  }

  // Konsequenz: gleiche Linie wie beim letzten Mal = konsequent, Hin und Her = Wetterfahne.
  const last = (coach.lastChoice ??= {});
  if (auto || last[i.type] === choice) p.konsequenz = clamp(p.konsequenz + 6, 0, 100);
  else if (last[i.type]) p.konsequenz = clamp(p.konsequenz - 8, 0, 100);
  last[i.type] = choice;

  if (live) live.boost += boost;
  const msg = `${auto ? '📏 Nach deiner Linie: ' : ''}${text}${boost ? ` (${boost > 0 ? '+' : ''}${boost.toFixed(1).replace('.', ',')} Stärke)` : ''}`;
  coach.feed = [msg, ...(coach.feed ?? [])].slice(0, MAX_FEED);
  return msg;
}

/** Zu Beginn einer Halbserie: 1–2 Ereignisse. Mit fester Linie werden sie sofort entschieden, sonst warten sie auf dich. */
export function rollIncidents(career: Career, count = randInt(1, 2)): void {
  const coach = career.coach;
  if (!coach?.clubId) return;
  const policies = coach.policies ?? {};
  const types = [...POLICIES.map((p) => p.id)].sort(() => Math.random() - 0.5).slice(0, count);
  for (const type of types) {
    const inc = makeIncident(coach, type);
    const line = policies[type] ?? ASK;
    if (line === ASK) coach.pending = [...(coach.pending ?? []), inc];
    else applyIncident(career, inc, inc.type === 'injury' && line === 'big' && !inc.big ? 'rest' : line, true);
  }
}

/** Eine offene Meldung beantworten. */
export function resolveIncident(prev: Career, incidentId: string, choice: string): Career {
  const inc = prev.coach?.pending?.find((x) => x.id === incidentId);
  if (!inc) return prev;
  const career: Career = structuredClone(prev);
  const coach = career.coach!;
  coach.pending = coach.pending!.filter((x) => x.id !== incidentId);
  coach.note = applyIncident(career, inc, choice, false);
  career.updatedAt = Date.now();
  return career;
}

export function setPolicy(prev: Career, id: PolicyId, line: string): Career {
  if (!prev.coach) return prev;
  const career: Career = structuredClone(prev);
  career.coach!.policies = { ...(career.coach!.policies ?? {}), [id]: line };
  career.updatedAt = Date.now();
  return career;
}

/** Am Saisonende: Der Ruf wirkt auf den Trainerwert (gute Kabine und klare Linie helfen). */
export function profileRatingDelta(p: CoachProfile | undefined): number {
  if (!p) return 0;
  return clamp(p.kabine / 40 + (p.konsequenz - 50) / 50 + p.medien / 80, -1.5, 1.5);
}

/** Vertrauen des Vorstands: Medienbild zählt mit. */
export const mediaTrust = (p: CoachProfile | undefined) => (p ? Math.round(p.medien / 5) : 0);
