import { getClub } from '../data/leagues';
import { REAL_PLAYERS } from '../data/players';
import { FIRST, LAST } from './rival';
import type { TableRow } from './types';

// Torjäger-Rennen: Pro Verein der Liga gibt es einen Haupttorschützen – ein echter Spieler, wenn einer
// im Spiel hinterlegt ist, sonst ein erfundener Name. Seine Tore sind ein fester Anteil der Vereinstore
// (je Verein und Saison verschieden), dazu kommt der eigene Spieler mit seinen echten Ligatoren.

export interface ScorerEntry {
  name: string;
  clubId: string;
  goals: number;
  /** Der eigene Spieler. */
  you?: boolean;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

const ATTACKERS = ['ST', 'FL', 'ZOM'];

/** Haupttorschütze eines Vereins: bester echter Angreifer, sonst ein fester erfundener Name. */
export function clubScorer(clubId: string, exclude: string): string {
  const real = REAL_PLAYERS.filter((p) => p.clubId === clubId && ATTACKERS.includes(p.position) && p.name !== exclude)
    .sort((a, b) => b.ovr - a.ovr || (a.position === 'ST' ? -1 : 1))[0];
  if (real) return real.name;
  return generatedName(clubId, 0);
}

/** Fester erfundener Name je Verein; `k` weicht bei Namensgleichheit auf die nächste Kombination aus. */
function generatedName(clubId: string, k: number): string {
  const n = FIRST.length * LAST.length;
  const i = (Math.floor(hash(clubId) * n) + k * 37) % n;
  return `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length)]}`;
}

/**
 * Rangliste der Torjäger einer Liga.
 * `table`: aktuelle Tabelle (Hinrunde oder Saisonende), `player.goals`: Ligatore des Spielers.
 */
export function scorerRace(table: TableRow[], season: string, player: { name: string; clubId: string; goals: number }): ScorerEntry[] {
  const used = new Set<string>([player.name]);
  const list: ScorerEntry[] = table.map((r) => {
    // Anteil des Haupttorschützen an den Vereinstoren: 18–30 %, beim eigenen Verein weniger (der Spieler trifft ja auch).
    const share = (r.clubId === player.clubId ? 0.12 : 0.18) + 0.12 * hash(`${r.clubId}-${season}`);
    let name = clubScorer(r.clubId, player.name);
    for (let k = 1; used.has(name) && k < 50; k++) name = generatedName(r.clubId, k);
    used.add(name);
    return { name, clubId: r.clubId, goals: Math.round(r.goalsFor * share) };
  });
  list.push({ name: player.name, clubId: player.clubId, goals: player.goals, you: true });
  // Bei Gleichstand steht der eigene Spieler vorn.
  return list.sort((a, b) => b.goals - a.goals || (a.you ? -1 : b.you ? 1 : 0));
}

/** Platz des Spielers im Rennen (1 = vorne). */
export const raceRank = (race: ScorerEntry[]) => race.findIndex((e) => e.you) + 1;

/** Ausschnitt für die Anzeige: Top 5 und der Spieler (falls weiter hinten). */
export function raceExcerpt(race: ScorerEntry[], top = 5): { entry: ScorerEntry; rank: number }[] {
  const out = race.slice(0, top).map((entry, i) => ({ entry, rank: i + 1 }));
  const rank = raceRank(race);
  if (rank > top) out.push({ entry: race[rank - 1], rank });
  return out;
}

export const scorerClubName = (e: ScorerEntry) => getClub(e.clubId).name;
