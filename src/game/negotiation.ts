import { getClub } from '../data/leagues';
import { clubStrength, formatMoney, playerValue } from './player';
import { clamp } from './random';
import type { Career, ContractClauses, Offer, Role } from './types';

// ---------- Vertragsverhandlung ----------
// Statt „annehmen oder ablehnen“ stellt der Spieler Forderungen: Gehalt, Laufzeit, Rolle und Klauseln.
// Der Verein vergleicht die Forderungen mit seiner Schmerzgrenze (abhängig von der Verhandlungsmacht):
// passt es, gibt es eine Einigung; sonst ein Gegenangebot – oder er bricht ab. Nach drei Runden ist Schluss.
// Die Antwort hängt nur von Angebot, Runde und Forderung ab (kein Neu-Würfeln durch Neuladen).

export const ROLES: Role[] = ['Schlüsselspieler', 'Stammspieler', 'Rotation', 'Ergänzung', 'Perspektivspieler'];
export const MAX_ROUNDS = 3;

export interface Demand extends ContractClauses {
  wage: number;
  years: number;
  role: Role;
}

export const negotiable = (o: Offer) => o.type !== 'Leihe' && !o.nlz && o.talkState !== 'agreed' && o.talkState !== 'final';

/** Startwerte für die Forderung: das Angebot selbst. */
export const demandFrom = (o: Offer): Demand => ({ wage: o.wage, years: o.years, role: o.role, ...o.clauses });

/**
 * Verhandlungsmacht 0,1 … 1,2: Wie sehr will der Verein dich? Stärke gegenüber dem Verein, Potenzial,
 * Konkurrenz-Angebote, letzte Saison und ob du ablösefrei bist.
 */
export function leverage(career: Career, o: Offer): number {
  const p = career.player;
  const s = clubStrength(career, o.clubId);
  const rival = career.offers.filter((x) => x.id !== o.id && x.type !== 'Leihe' && x.type !== 'Verlängerung').length;
  const last = career.history[career.history.length - 1];
  const rating = last?.avgRating ?? 6.7;
  const young = p.age <= 23 ? Math.max(0, p.potential - p.ovr) * 0.01 : 0;
  const free = p.contract.yearsLeft <= 0 ? 0.1 : 0;
  return clamp(0.45 + (p.ovr - s) * 0.035 + rival * 0.07 + (rating - 6.8) * 0.25 + young + free, 0.1, 1.2);
}

const roleStep = (offered: Role, wanted: Role) => Math.max(0, ROLES.indexOf(offered) - ROLES.indexOf(wanted));

/** Wie „teuer“ die Forderungen für den Verein sind (0 = genau das Angebot). */
export function demandCost(career: Career, o: Offer, d: Demand): number {
  const value = Math.max(1, playerValue(career.player));
  let c = Math.max(0, d.wage / o.wage - 1);
  c += roleStep(o.role, d.role) * 0.14;
  c += Math.max(0, Math.abs(d.years - o.years) - 1) * 0.05;
  if (d.releaseClause) c += clamp(1.8 - d.releaseClause / value, 0, 1.4) * 0.14;
  if (d.goalBonus) c += (d.goalBonus / Math.max(1, o.wage)) * 0.12;
  if (d.starterGuarantee) c += ROLES.indexOf(d.role) <= 1 && ROLES.indexOf(o.role) <= 1 ? 0.05 : 0.14;
  return Math.round(c * 1000) / 1000;
}

/** Schmerzgrenze des Vereins. */
export const tolerance = (lev: number) => 0.08 + lev * 0.22;

function seeded(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

export type TalkResult = { kind: 'agreed' | 'counter' | 'final' | 'walked'; career: Career; message: string };

const clausesOf = (d: Demand): ContractClauses | undefined => {
  const c: ContractClauses = {};
  if (d.releaseClause) c.releaseClause = d.releaseClause;
  if (d.goalBonus) c.goalBonus = d.goalBonus;
  if (d.starterGuarantee) c.starterGuarantee = true;
  return Object.keys(c).length ? c : undefined;
};

/** Eine Verhandlungsrunde. Gibt die neue Karriere (Angebot angepasst oder entfernt) und die Antwort des Vereins zurück. */
export function negotiate(prev: Career, offerId: string, d: Demand): TalkResult {
  const career: Career = structuredClone(prev);
  const idx = career.offers.findIndex((x) => x.id === offerId);
  const o = career.offers[idx];
  if (!o || !negotiable(o)) return { kind: 'final', career: prev, message: 'Hier gibt es nichts mehr zu verhandeln.' };
  const club = getClub(o.clubId).name;
  const round = (o.talks ?? 0) + 1;
  const lev = leverage(career, o);
  const tol = tolerance(lev);
  const cost = demandCost(career, o, d);
  const years = clamp(Math.round(d.years), 1, 5);

  if (cost <= tol) {
    career.offers[idx] = { ...o, wage: Math.round(d.wage / 500) * 500, years: o.type === 'Ablösefrei' || o.type === 'Transfer' || o.type === 'Verlängerung' ? years : o.years,
      role: d.role, clauses: clausesOf(d), talks: round, talkState: 'agreed' };
    return { kind: 'agreed', career, message: `${club} ist einverstanden: ${formatMoney(Math.round(d.wage / 500) * 500)}/Woche, ${years} Jahre, Rolle ${d.role}.` };
  }

  const over = cost - tol;
  const walkChance = clamp(over * 1.3 - 0.08 + (round - 1) * 0.12, 0, 0.9);
  if (seeded(`${o.id}:${round}:walk`) < walkChance) {
    career.offers.splice(idx, 1);
    return { kind: 'walked', career, message: `${club} bricht die Verhandlungen ab: „Diese Forderungen sind uns zu hoch.“` };
  }

  // Gegenangebot: Der Verein kommt dir ein Stück entgegen.
  const share = clamp(tol / cost, 0.25, 0.85);
  const wage = Math.round((o.wage + Math.max(0, d.wage - o.wage) * share) / 500) * 500;
  const role = roleStep(o.role, d.role) > 0 && lev >= 0.75 ? ROLES[Math.max(ROLES.indexOf(d.role), ROLES.indexOf(o.role) - 1)] : o.role;
  const value = playerValue(career.player);
  const clauses: ContractClauses = {};
  if (d.releaseClause) clauses.releaseClause = Math.max(d.releaseClause, Math.round((value * 2) / 1e5) * 1e5);
  if (d.goalBonus) clauses.goalBonus = Math.round(d.goalBonus / 2 / 500) * 500 || undefined;
  if (d.starterGuarantee && lev >= 0.85) clauses.starterGuarantee = true;
  const last = round >= MAX_ROUNDS;
  career.offers[idx] = { ...o, wage, role, years: clamp(Math.round((o.years + years) / 2), 1, 5),
    clauses: Object.keys(clauses).filter((k) => clauses[k as keyof ContractClauses] !== undefined).length ? clauses : undefined,
    talks: round, talkState: last ? 'final' : undefined };
  const parts = [`${formatMoney(wage)}/Woche`, `Rolle ${role}`];
  if (clauses.releaseClause) parts.push(`Ausstiegsklausel ${formatMoney(clauses.releaseClause)}`);
  if (clauses.goalBonus) parts.push(`Torprämie ${formatMoney(clauses.goalBonus)}`);
  if (d.starterGuarantee) parts.push(clauses.starterGuarantee ? 'Einsatzgarantie ok' : 'keine Einsatzgarantie');
  return {
    kind: last ? 'final' : 'counter', career,
    message: `${club} ${last ? 'macht ein letztes Angebot' : 'macht ein Gegenangebot'}: ${parts.join(' · ')}.`,
  };
}

/** Wie die Verhandlungslage aussieht – als Hinweis für den Spieler (keine genauen Zahlen). */
export function moodText(career: Career, o: Offer, d: Demand): { label: string; tone: 'good' | 'warn' | 'bad' } {
  const ratio = demandCost(career, o, d) / tolerance(leverage(career, o));
  if (ratio <= 0.8) return { label: 'Der Verein dürfte zustimmen', tone: 'good' };
  if (ratio <= 1.15) return { label: 'Knapp – könnte klappen', tone: 'warn' };
  if (ratio <= 1.8) return { label: 'Hoch gepokert – eher Gegenangebot', tone: 'warn' };
  return { label: 'Viel zu hoch – Abbruch droht', tone: 'bad' };
}
