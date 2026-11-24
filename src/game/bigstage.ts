// ---------- Große Bühne (Karriere-Update Paket 3) ----------
// Weltfußballer-Ranking über die ganze Saison (Expertenwertung gegen die besten echten Spieler),
// Saison-Gala mit allen Auszeichnungen und dem Weg im Turnier der Nationalmannschaft.
// Rein zur Anzeige: Die Auszeichnungen selbst vergibt weiter die Saisonwertung (season.ts).

import { REAL_PLAYERS } from '../data/players';
import { slugify } from '../data/leagues';
import { halfStats } from './season';
import { seasonLabel } from './player';
import type { Career, Position, SeasonRecord } from './types';

export interface WorldEntry { name: string; clubId: string; points: number; you?: boolean }

const hash = (s: string) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return ((h >>> 0) % 10000) / 10000; };
const DEFENSIVE: Position[] = ['TW', 'IV', 'AV', 'ZDM'];

/** Punkte einer Saison: Klasse, Noten, Torbeteiligungen, Titel. */
export function seasonPoints(s: { ovr: number; position: Position; avgRating: number | null; goals: number; assists: number; trophies?: string[]; apps: number }): number {
  const rating = s.avgRating ?? 6.6;
  const def = DEFENSIVE.includes(s.position);
  const contrib = def ? (s.goals + s.assists) * 1.6 : s.goals * 1.2 + s.assists * 0.8;
  const titles = (s.trophies ?? []).reduce((a, t) => a + (t === 'Champions League' ? 25 : t.startsWith('Meister') ? 14 : t.includes('WM') || t.includes('Welt') || t.includes('EM') || t.includes('Europa') ? 18 : 6), 0);
  const presence = Math.min(1, s.apps / 30);
  return Math.round(((s.ovr - 75) * 2 + (rating - 6.8) * (def ? 35 : 25)) * presence + contrib + titles);
}

/** Die besten echten Spieler der Welt in diesem Jahr (Alter und Wertung grob fortgeschrieben). */
function worldStars(year: number, exclude: string): { name: string; clubId: string; ovr: number }[] {
  const years = Math.max(0, year - 2025);
  return REAL_PLAYERS
    .map((r) => {
      let o = r.ovr;
      for (let y = 0; y < years; y++) { const a = r.age + y; o += a < 23 ? 2 : a > 31 ? -1.5 : 0; }
      return { name: r.name, clubId: slugify(r.clubId), ovr: Math.min(94, Math.round(o)), age: r.age + years };
    })
    .filter((r) => r.age <= 35 && r.name !== exclude)
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, 14);
}

/**
 * Ranking: Die Stars bekommen eine erwartete Saison (Klasse + Zufall je Saison), anteilig zum Saisonfortschritt.
 * `fraction` = gespielter Anteil der Saison (0–1).
 */
export function worldRace(career: Career, mine: { ovr: number; avgRating: number | null; goals: number; assists: number; apps: number; trophies?: string[] }, season: string, fraction: number): WorldEntry[] {
  const p = career.player;
  const list: WorldEntry[] = worldStars(Number(season.slice(0, 4)) || career.year, p.name).map((s) => ({
    name: s.name, clubId: s.clubId,
    points: Math.round(((s.ovr - 75) * 4 + 20 + (hash(`${s.name}-${season}`) - 0.5) * 30) * fraction),
  }));
  // Eigene Werte auf eine ganze Saison hochrechnen und dann genauso anteilig werten wie die Stars
  const f = Math.max(0.01, fraction);
  const full = seasonPoints({ ...mine, goals: mine.goals / f, assists: mine.assists / f, apps: mine.apps / f, position: p.position });
  list.push({ name: p.name, clubId: p.loan?.clubId ?? p.contract.clubId, points: Math.round(full * fraction), you: true });
  return list.sort((a, b) => b.points - a.points || (a.you ? -1 : 1));
}

/** Zwischenstand während der Saison (nur für Spieler ab 78, sonst ist man ohnehin weit weg). */
export function liveWorldRace(career: Career): WorldEntry[] | null {
  const prog = career.progress;
  if (!prog || career.player.ovr < 78) return null;
  const stage = prog.stage ?? 0;
  if (stage === 0) return null;
  const st = halfStats(prog.matches);
  return worldRace(career, { ovr: career.player.ovr, avgRating: st.avgRating, goals: st.goals, assists: st.assists, apps: st.apps }, seasonLabel(career.year), stage / 6);
}

/** Endstand für eine fertige Saison. Gewinnt man die Wahl, steht man vorn – sonst höchstens auf Platz 2. */
export function finalWorldRank(career: Career, r: SeasonRecord): number {
  if (r.awards.includes('Ballon d’Or')) return 1;
  const race = worldRace(career, { ovr: r.ovrEnd, avgRating: r.avgRating, goals: r.goals, assists: r.assists, apps: r.apps, trophies: r.trophies }, r.season, 1);
  return Math.max(2, race.findIndex((e) => e.you) + 1);
}

export interface GalaAward { id: string; title: string; won: boolean; text: string }

/** Die Umschläge der Gala: was du gewonnen hast – und wo du knapp dran warst. */
export function galaAwards(career: Career, r: SeasonRecord): GalaAward[] {
  const out: GalaAward[] = [];
  const has = (pre: string) => r.awards.find((a) => a.startsWith(pre));
  const top = has('Torschützenkönig') ?? has('Bester Torschütze');
  out.push({ id: 'scorer', title: 'Torjägerkanone', won: !!top, text: top ? `${r.goals} Tore – niemand hat mehr getroffen.` : `${r.goals} Tore in dieser Saison.` });
  const poty = has('Spieler der Saison') ?? has('Talent der Saison');
  out.push({ id: 'poty', title: 'Spieler der Saison', won: !!poty, text: poty ? `Ø-Note ${r.avgRating?.toFixed(2).replace('.', ',') ?? '–'} – die Liga verneigt sich.` : 'Diesmal ging der Preis an einen anderen.' });
  const tots = has('Team der Saison');
  out.push({ id: 'tots', title: 'Team der Saison', won: !!tots, text: tots ? 'Du stehst in der Elf der Saison.' : 'Für die Elf der Saison hat es nicht gereicht.' });
  if (r.age <= 21) out.push({ id: 'gb', title: 'Golden Boy', won: r.awards.includes('Golden Boy'), text: r.awards.includes('Golden Boy') ? 'Bester junger Spieler der Welt!' : 'Der Preis für das größte Talent ging an einen anderen.' });
  if (r.ovrEnd >= 78) {
    const rank = finalWorldRank(career, r);
    out.push({ id: 'world', title: 'Weltfußballer-Wahl', won: rank === 1, text: rank === 1 ? 'Du bist der beste Spieler der Welt!' : rank <= 10 ? `Platz ${rank} der Wahl.` : 'Nicht unter den besten 10 der Welt.' });
  }
  if (r.tournament) {
    const t = r.tournament;
    out.push({ id: 'tour', title: t.name, won: t.won, text: t.won ? 'Turniersieg mit der Nationalmannschaft!' : t.reachedFinal ? 'Im Finale knapp gescheitert.' : `Aus: ${t.stage ?? 'Turnier'}` });
  }
  return out;
}

/** Gala nur, wenn es etwas zu feiern gibt oder man in Reichweite der Preise ist. */
export function galaWorthy(r: SeasonRecord): boolean {
  return r.awards.length > 0 || r.trophies.length > 0 || !!r.tournament || r.ovrEnd >= 75 || (r.age <= 21 && r.ovrEnd >= 72);
}
