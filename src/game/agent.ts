// ---------- Berater & Transfermarkt 2.0 (Karriere-Update Paket 4) ----------
// Berater mit Charakter (eigene Figuren), Gerüchte während der Saison und der Deadline-Day im Transferfenster.

import { CLUBS, getClub, getLeague } from '../data/leagues';
import { clubLeagueId, clubStrength, currentClubId, seasonLabel } from './player';
import { transferOffer, EXOTIC_AGE } from './offers';
import { postInbox } from './inbox';
import { changeTrust } from './matchday';
import { halfStats } from './season';
import type { Career, Offer } from './types';

type Rand = () => number;

export type AgentId = 'shark' | 'loyal' | 'loud';
export const AGENTS: Record<AgentId, { name: string; title: string; plus: string; minus: string }> = {
  shark: { name: 'Viktor Haas', title: 'Der Haifisch', plus: '+15 % Gehalt bei Angeboten anderer Vereine', minus: 'Weniger Angebote, dein Verein ist genervt (−0,5 Vertrauen)' },
  loyal: { name: 'Jonas Brandl', title: 'Der Familienfreund', plus: 'Bessere Verlängerung beim eigenen Verein, +0,5 Vertrauen', minus: 'Keine zusätzlichen Angebote' },
  loud: { name: 'Mo Ferreira', title: 'Das Großmaul', plus: 'Ein zusätzliches Angebot pro Sommer, mehr Gerüchte', minus: 'Mehr Schlagzeilen (kleiner Skandal-Zuwachs)' },
};

export function canChangeAgent(career: Career): boolean {
  return career.agentSeason !== seasonLabel(career.year);
}
export function setAgent(prev: Career, id: AgentId | null): Career {
  const career: Career = structuredClone(prev);
  career.agent = id;
  career.agentSeason = seasonLabel(career.year);
  if (id) postInbox(career, { kind: 'contract', title: `Neuer Berater: ${AGENTS[id].name}`, text: `${AGENTS[id].title} kümmert sich ab jetzt um deine Verträge.` });
  career.updatedAt = Date.now();
  return career;
}

const firstTeam = (id: string) => !getClub(id).name.match(/ II$| U23$| U19$| U17$/);

/** Ein größerer Verein als der eigene, der realistisch zu dir passt. */
function biggerClub(career: Career, rand: Rand, exclude: Set<string>): string | null {
  const p = career.player;
  const own = clubStrength(career, currentClubId(p));
  const options = CLUBS.filter((c) => {
    const s = clubStrength(career, c.id);
    return !exclude.has(c.id) && firstTeam(c.id) && !getLeague(clubLeagueId(career, c.id)).youth && s >= own + 1 && s <= p.ovr + 6
      && (!getLeague(clubLeagueId(career, c.id)).exotic || p.age >= EXOTIC_AGE);
  });
  if (!options.length) return null;
  return options[Math.floor(rand() * options.length)].id;
}

/** Nach einer starken Etappe: Ein Verein beobachtet dich (oder ein Gerücht wird heißer). */
export function rumorTick(career: Career, stage: number, rand: Rand = Math.random): string | null {
  const prog = career.progress;
  if (!prog || career.player.nlz) return null;
  const st = halfStats(prog.matches.filter((m) => m.stage === stage));
  const strong = (st.avgRating ?? 0) >= 7.2 && st.apps >= 3;
  const odds = (strong ? 0.5 : 0.08) * (career.agent === 'loud' ? 1.6 : 1);
  if (rand() >= odds) return null;
  const rumors = career.rumors ?? [];
  if (rumors.length && rand() < 0.6) {
    const r = rumors[Math.floor(rand() * rumors.length)];
    r.heat = Math.min(3, r.heat + 1);
    const text = r.heat >= 3 ? `${getClub(r.clubId).name} ist heiß auf dich – ein Angebot im Sommer ist sehr wahrscheinlich.` : `${getClub(r.clubId).name} beobachtet dich weiter.`;
    postInbox(career, { kind: 'offer', title: 'Gerücht', text });
    return text;
  }
  const id = biggerClub(career, rand, new Set(rumors.map((r) => r.clubId)));
  if (!id) return null;
  career.rumors = [...rumors, { clubId: id, heat: 1 }].slice(-3);
  const text = `Gerücht: Scouts von ${getClub(id).name} waren im Stadion.`;
  postInbox(career, { kind: 'offer', title: 'Gerücht', text });
  return text;
}
export const heatWord = (h: number) => (h >= 3 ? 'heiß' : h === 2 ? 'warm' : 'lauwarm');

/**
 * Im Transferfenster einmal: Berater verhandelt, heiße Gerüchte werden zu Angeboten.
 * Wird beim Öffnen des Fensters aufgerufen (nach den normalen Angeboten).
 */
export function applyAgentWindow(prev: Career, rand: Rand = Math.random): Career {
  const season = prev.history[prev.history.length - 1]?.season;
  if (prev.phase !== 'window' || !season || prev.agentWindow === season) return prev;
  const career: Career = structuredClone(prev);
  career.agentWindow = season;
  const p = career.player;
  const notes: string[] = [];
  // Heiße Gerüchte → Angebote
  const have = new Set(career.offers.map((o) => o.clubId));
  for (const r of career.rumors ?? []) {
    if (r.heat >= 2 && !have.has(r.clubId) && rand() < (r.heat >= 3 ? 0.9 : 0.5) && !p.loan) {
      const o = transferOffer(career, r.clubId, clubStrength(career, r.clubId), p.contract.yearsLeft <= 0, `Aus dem Gerücht wird Ernst: ${getClub(r.clubId).name} will dich.`);
      career.offers.push(o); have.add(r.clubId);
      notes.push(`${getClub(r.clubId).name} macht ernst.`);
    }
  }
  career.rumors = [];
  const agent = career.agent;
  if (agent === 'shark') {
    for (const o of career.offers) if (o.type !== 'Verlängerung') o.wage = Math.round((o.wage * 1.15) / 500) * 500;
    const moves = career.offers.filter((o) => o.type === 'Transfer' || o.type === 'Ablösefrei');
    if (moves.length >= 3) {
      const weakest = moves.sort((a, b) => clubStrength(career, a.clubId) - clubStrength(career, b.clubId))[0];
      career.offers = career.offers.filter((o) => o.id !== weakest.id);
    }
    changeTrust(career, -0.5, 'Berater pokert hart');
    notes.push(`${AGENTS.shark.name} hat die Gehälter hochgetrieben.`);
  } else if (agent === 'loyal') {
    const ext = career.offers.find((o) => o.type === 'Verlängerung');
    if (ext) ext.wage = Math.round((ext.wage * 1.1) / 500) * 500;
    changeTrust(career, 0.5, 'Berater pflegt den Draht zum Verein');
    notes.push(ext ? `${AGENTS.loyal.name} hat die Verlängerung verbessert.` : `${AGENTS.loyal.name} hält dir den Rücken frei.`);
  } else if (agent === 'loud') {
    const id = biggerClub(career, rand, new Set(career.offers.map((o) => o.clubId)));
    if (id && !p.loan) {
      career.offers.push(transferOffer(career, id, clubStrength(career, id), p.contract.yearsLeft <= 0, `${AGENTS.loud.name} hat ${getClub(id).name} heißgemacht.`));
      notes.push(`${AGENTS.loud.name} hat ein Zusatzangebot besorgt.`);
    }
    career.scandal = Math.min(100, (career.scandal ?? 0) + 4);
  }
  if (notes.length) postInbox(career, { kind: 'offer', title: 'Transferfenster', text: notes.join(' ') });
  return career;
}

export interface DeadlineResult { career: Career; lines: string[]; tone: 'good' | 'neutral' }
/** Deadline-Day: bis zur letzten Minute warten – manchmal kommt noch etwas Großes. */
export function deadlineDay(prev: Career, rand: Rand = Math.random): DeadlineResult {
  const career: Career = structuredClone(prev);
  career.deadlineSeason = career.history[career.history.length - 1]?.season;
  const lines = ['09:00 Uhr – Das Fenster schließt um Mitternacht.', career.agent ? `14:30 Uhr – ${AGENTS[career.agent].name} telefoniert ununterbrochen.` : '14:30 Uhr – Du hängst selbst am Telefon.', '21:45 Uhr – Ein Privatjet landet …'];
  const roll = rand();
  const moves = career.offers.filter((o) => o.type === 'Transfer' || o.type === 'Ablösefrei');
  if (roll < 0.4 && !career.player.loan) {
    const id = biggerClub(career, rand, new Set([...career.offers.map((o) => o.clubId)]));
    if (id) {
      const o: Offer = transferOffer(career, id, clubStrength(career, id), career.player.contract.yearsLeft <= 0, `Last-Minute-Angebot am Deadline-Day: ${getClub(id).name}!`);
      career.offers.push(o);
      lines.push(`23:52 Uhr – ${getClub(id).name} meldet sich in letzter Minute!`);
      return { career, lines, tone: 'good' };
    }
  }
  if (roll < 0.65 && moves.length) {
    const o = moves[Math.floor(rand() * moves.length)];
    const target = career.offers.find((x) => x.id === o.id)!;
    target.wage = Math.round((target.wage * 1.2) / 500) * 500;
    lines.push(`23:40 Uhr – ${getClub(o.clubId).name} bessert nach: +20 % Gehalt!`);
    return { career, lines, tone: 'good' };
  }
  lines.push('23:59 Uhr – Das Telefon bleibt stumm. Es bleibt bei den Angeboten.');
  return { career, lines, tone: 'neutral' };
}
export const deadlineOpen = (c: Career) => c.phase === 'window' && c.deadlineSeason !== c.history[c.history.length - 1]?.season && !c.player.nlz;
