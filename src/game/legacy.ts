import { getClub } from '../data/leagues';
import { totalTransferFees } from './career';
import type { Career } from './types';

export interface CareerSummary {
  career: Career;
  retired: boolean;
  seasons: number;
  apps: number;
  goals: number;
  assists: number;
  avgRating: number | null;
  peak: number;
  titles: number;
  awards: number;
  ballonDor: number;
  caps: number;
  topValue: number;
  clubs: string[];
  /** Summe aller gezahlten Ablösen. */
  transferFees: number;
  /** Vereine, bei denen der Spieler Legende ist. */
  legends: number;
  /** Legendenpunkte: grobe Gesamtbewertung einer Karriere für die Rangliste. */
  score: number;
}

export function summarizeCareer(career: Career): CareerSummary {
  const h = career.history;
  const sum = (f: (s: (typeof h)[number]) => number) => h.reduce((a, s) => a + f(s), 0);
  const apps = sum((s) => s.apps);
  const ratedApps = sum((s) => (s.avgRating !== null ? s.apps : 0));
  const avgRating = ratedApps ? Math.round((sum((s) => (s.avgRating ?? 0) * s.apps) / ratedApps) * 100) / 100 : null;
  const peak = Math.max(career.player.ovr, ...h.map((s) => Math.max(s.ovrStart, s.ovrEnd)));
  const titles = sum((s) => s.trophies.length);
  const awards = sum((s) => s.awards.length);
  const ballonDor = sum((s) => s.awards.filter((a) => a.startsWith('Ballon')).length);
  const goals = sum((s) => s.goals);
  const assists = sum((s) => s.assists);
  const clubs: string[] = [];
  for (const s of h) {
    const name = getClub(s.clubId).name;
    if (!clubs.includes(name)) clubs.push(name);
  }
  const score = Math.round(
    titles * 10 + awards * 12 + ballonDor * 40 + Math.max(0, peak - 70) * 4 +
      apps * 0.15 + goals * 0.4 + assists * 0.25 + career.player.caps * 0.3 +
      (career.player.legendOf ?? []).length * 25,
  );
  return {
    career,
    retired: career.phase === 'retired',
    seasons: h.length,
    apps,
    goals,
    assists,
    avgRating,
    peak,
    titles,
    awards,
    ballonDor,
    caps: career.player.caps,
    topValue: h.length ? Math.max(...h.map((s) => s.marketValue)) : 0,
    clubs,
    transferFees: totalTransferFees(career),
    legends: (career.player.legendOf ?? []).length,
    score,
  };
}

export interface CareerRecord {
  label: string;
  value: string;
  holder: string;
  detail: string;
}

/** Bestwerte über alle gespeicherten Karrieren. */
export function careerRecords(careers: Career[]): CareerRecord[] {
  const seasons = careers.flatMap((c) => c.history.map((s) => ({ c, s })));
  const records: CareerRecord[] = [];
  const best = <T,>(items: T[], value: (t: T) => number) =>
    items.reduce<T | null>((b, t) => (b === null || value(t) > value(b) ? t : b), null);

  const goals = best(seasons, ({ s }) => s.goals);
  if (goals && goals.s.goals > 0) {
    records.push({ label: 'Meiste Tore in einer Saison', value: `${goals.s.goals}`, holder: goals.c.player.name, detail: `${goals.s.season} · ${getClub(goals.s.clubId).name}` });
  }
  const assists = best(seasons, ({ s }) => s.assists);
  if (assists && assists.s.assists > 0) {
    records.push({ label: 'Meiste Vorlagen in einer Saison', value: `${assists.s.assists}`, holder: assists.c.player.name, detail: `${assists.s.season} · ${getClub(assists.s.clubId).name}` });
  }
  const rated = seasons.filter(({ s }) => s.avgRating !== null && s.apps >= 20);
  const rating = best(rated, ({ s }) => s.avgRating!);
  if (rating) {
    records.push({ label: 'Beste Saisonnote (ab 20 Spielen)', value: rating.s.avgRating!.toFixed(2).replace('.', ','), holder: rating.c.player.name, detail: `${rating.s.season} · ${getClub(rating.s.clubId).name}` });
  }
  const eighty5 = seasons.filter(({ s }) => s.ovrEnd >= 85);
  const youngest = best(eighty5, ({ s }) => -s.age);
  if (youngest) {
    records.push({ label: 'Jüngster mit Wertung 85+', value: `${youngest.s.age + 1} J.`, holder: youngest.c.player.name, detail: `nach ${youngest.s.season}` });
  }
  const summaries = careers.map(summarizeCareer);
  const titles = best(summaries, (s) => s.titles);
  if (titles && titles.titles > 0) {
    records.push({ label: 'Meiste Titel', value: `${titles.titles}`, holder: titles.career.player.name, detail: `in ${titles.seasons} Saisons` });
  }
  return records;
}

export interface Hunt { label: string; record: number; holder: string; mine: number; you: boolean }
/**
 * Rekordjagd in der laufenden Saison – gegen die eigenen Bestwerte aus allen gespeicherten Karrieren
 * (keine echten Rekorde aus der Wirklichkeit, die könnten veraltet oder falsch sein).
 */
export function recordHunt(careers: Career[], current: Career, live: { goals: number; assists: number }): Hunt[] {
  const seasons = careers.flatMap((c) => c.history.map((s) => ({ name: c.player.name, id: c.id, s })));
  const out: Hunt[] = [];
  const add = (label: string, val: (s: Career['history'][number]) => number, mine: number) => {
    const best = seasons.reduce<{ name: string; id: string; v: number } | null>((b, x) => (val(x.s) > (b?.v ?? 0) ? { name: x.name, id: x.id, v: val(x.s) } : b), null);
    if (!best || best.v < 3) return;
    out.push({ label, record: best.v, holder: best.name, mine, you: best.id === current.id });
  };
  if (current.player.position !== 'TW') add('Meiste Tore in einer Saison', (s) => s.goals, live.goals);
  add('Meiste Vorlagen in einer Saison', (s) => s.assists, live.assists);
  return out;
}

/** Rang einer Karriere in der Ruhmeshalle (nach Legendenpunkten). */
export function hallOfFame(careers: Career[]): CareerSummary[] {
  return careers.filter((c) => c.history.length > 0).map(summarizeCareer).sort((a, b) => b.score - a.score);
}
