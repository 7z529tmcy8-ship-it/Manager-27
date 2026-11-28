// ---------- Multiversum-Labor (Entwickler-Modus, Code „multiversum“) ----------
// Simuliert die Karriere ab dem aktuellen Stand in vielen parallelen Zukünften und wertet sie aus:
// Verteilung von Toren, Titeln, Wertung, Wahrscheinlichkeiten für große Titel, beste und schlechteste Zeitlinie.
// Eine Zukunft kann übernommen werden (überschreibt den Spielstand – nur im Entwickler-Modus).

import { applyChoice, seasonChoices } from './simple';
import { setAutoLoad, simulateSeasons, type TransferStyle } from './autosim';
import { devTransfer } from './dev';
import { currentClubId } from './player';
import { getClub } from '../data/leagues';
import type { Career, SeasonRecord, StageLoad } from './types';

export const MULTIVERSE_CODE = 'multiversum';
export const isMultiverseCode = (input: string) => input.trim().toLowerCase() === MULTIVERSE_CODE;

export interface Future {
  id: number;
  career: Career;
  seasons: number;
  goals: number; assists: number; apps: number;
  titles: string[]; ballon: number; awards: number;
  peak: number; finalOvr: number; retired: boolean;
  /** Wertung am Ende jeder simulierten Saison (Startwert vorne). */
  ovrPath: number[];
  clubs: string[];
  score: number;
  /** Index der ersten simulierten Saison im Verlauf (für die Saison-Details). */
  from: number;
}

/** Eine Zukunft: `seasons` Saisons (oder bis zum Karriereende, wenn 'end') mit fester Transfer-Regel. */
export function runFuture(start: Career, seasons: number | 'end', style: TransferStyle, id: number): Future {
  let c: Career = structuredClone(start);
  const from = c.history.length;
  const target = seasons === 'end' ? 30 : seasons;
  for (let guard = 0; guard < 40 && c.phase !== 'retired' && c.history.length - from < target; guard++) {
    const left = target - (c.history.length - from);
    const r = simulateSeasons(c, seasons === 'end' ? 1 : Math.min(left, 10), style, false);
    c = r.career;
    if (c.phase === 'retired') break;
    if (r.stop && c.phase === 'window') {
      // Nur noch Karriereende möglich – bei „bis zum Ende“ annehmen, sonst hier aufhören
      const ch = seasonChoices(c);
      const retire = ch.find((x) => x.kind === 'retire');
      if (seasons === 'end') { c = applyChoice(c, retire ?? { kind: 'retire', title: 'Karriere beenden' }); break; }
      if (!ch.some((x) => x.kind !== 'retire')) break;
    } else if (r.stop) break;
    // Bis zum Ende: Mit 37+ automatisch aufhören, sonst laufen Zukünfte ewig
    if (seasons === 'end' && c.player.age >= 37 && c.phase === 'window') {
      c = applyChoice(c, { kind: 'retire', title: 'Karriere beenden' });
      break;
    }
  }
  const h = c.history.slice(from);
  const titles = h.flatMap((r) => r.trophies);
  const ballon = h.reduce((a, r) => a + r.awards.filter((x) => x.startsWith('Ballon')).length, 0);
  const awards = h.reduce((a, r) => a + r.awards.length, 0);
  const goals = h.reduce((a, r) => a + r.goals, 0);
  const assists = h.reduce((a, r) => a + r.assists, 0);
  const ovrPath = [start.player.ovr, ...h.map((r) => r.ovrEnd)];
  const clubs: string[] = [];
  for (const r of h) if (clubs[clubs.length - 1] !== r.clubId) clubs.push(r.clubId);
  return {
    id, career: c, seasons: h.length, goals, assists, apps: h.reduce((a, r) => a + r.apps, 0),
    titles, ballon, awards, peak: Math.max(...ovrPath), finalOvr: c.player.ovr, retired: c.phase === 'retired',
    ovrPath, clubs, score: goals + assists * 0.6 + titles.length * 8 + awards * 6 + ballon * 40, from,
  };
}

export interface Analysis {
  n: number;
  goals: { min: number; max: number; avg: number; median: number };
  titles: { avg: number; max: number };
  peak: { avg: number; max: number; min: number };
  chances: { label: string; p: number }[];
  hist: { from: number; to: number; n: number }[];
  topClubs: { clubId: string; p: number }[];
  best: Future; worst: Future; median: Future;
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const share = (fs: Future[], f: (x: Future) => boolean) => fs.filter(f).length / Math.max(1, fs.length);

export function analyze(fs: Future[]): Analysis | null {
  if (!fs.length) return null;
  const goals = fs.map((f) => f.goals);
  const lo = Math.min(...goals), hi = Math.max(...goals);
  const bins = 8;
  const w = Math.max(1, Math.ceil((hi - lo + 1) / bins));
  const hist = Array.from({ length: bins }, (_, i) => ({ from: lo + i * w, to: lo + (i + 1) * w - 1, n: 0 })).filter((b) => b.from <= hi);
  for (const g of goals) hist[Math.min(hist.length - 1, Math.floor((g - lo) / w))].n++;
  const has = (f: Future, pre: string) => f.titles.some((t) => t.startsWith(pre));
  const clubCount = new Map<string, number>();
  for (const f of fs) for (const c of new Set(f.clubs)) clubCount.set(c, (clubCount.get(c) ?? 0) + 1);
  const sorted = [...fs].sort((a, b) => b.score - a.score);
  return {
    n: fs.length,
    goals: { min: lo, max: hi, avg: goals.reduce((a, b) => a + b, 0) / fs.length, median: median(goals) },
    titles: { avg: fs.reduce((a, f) => a + f.titles.length, 0) / fs.length, max: Math.max(...fs.map((f) => f.titles.length)) },
    peak: { avg: fs.reduce((a, f) => a + f.peak, 0) / fs.length, max: Math.max(...fs.map((f) => f.peak)), min: Math.min(...fs.map((f) => f.peak)) },
    chances: [
      { label: 'Mindestens eine Meisterschaft', p: share(fs, (f) => has(f, 'Meister')) },
      { label: 'Champions League gewonnen', p: share(fs, (f) => f.titles.includes('Champions League')) },
      { label: 'Pokalsieg', p: share(fs, (f) => f.titles.some((t) => /(Pokal|Cup|Copa|Coppa|Coupe|Taça|Beker|Kupa)/.test(t))) },
      { label: 'Titel mit der Nationalmannschaft', p: share(fs, (f) => f.titles.some((t) => t.startsWith('Welt') || t.startsWith('Europa'))) },
      { label: 'Ballon d’Or', p: share(fs, (f) => f.ballon > 0) },
      { label: 'Wertung 90+', p: share(fs, (f) => f.peak >= 90) },
    ],
    hist,
    topClubs: [...clubCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([clubId, n]) => ({ clubId, p: n / fs.length })),
    best: sorted[0], worst: sorted[sorted.length - 1], median: sorted[Math.floor(sorted.length / 2)],
  };
}

export const clubLabel = (id: string) => { try { return getClub(id).name; } catch { return id; } };

// ---------- Experimente (Was-wäre-wenn) ----------
/** Startbedingungen, die nur für die Simulation gelten – der echte Spielstand bleibt unberührt. */
export interface Experiment { ovr?: number; pot?: number; clubId?: string; load?: StageLoad }
export function applyExperiment(start: Career, e: Experiment): Career {
  let c: Career = structuredClone(start);
  if (e.ovr !== undefined) c.player.ovr = Math.max(40, Math.min(99, Math.round(e.ovr)));
  if (e.pot !== undefined) c.player.potential = Math.max(c.player.ovr, Math.min(99, Math.round(e.pot)));
  else c.player.potential = Math.max(c.player.potential, c.player.ovr);
  if (e.clubId && e.clubId !== currentClubId(c.player)) c = devTransfer(c, e.clubId);
  if (e.load) c = setAutoLoad(c, e.load);
  return c;
}

/** Kennzahlen für den Vergleich mehrerer Multiversen. */
export interface Summary { n: number; goals: number; assists: number; titles: number; peak: number; finalOvr: number; pMeister: number; pCL: number; pBallon: number; p90: number; score: number }
export function summarize(fs: Future[]): Summary {
  const n = Math.max(1, fs.length);
  const avg = (f: (x: Future) => number) => fs.reduce((a, x) => a + f(x), 0) / n;
  return {
    n: fs.length, goals: avg((f) => f.goals), assists: avg((f) => f.assists), titles: avg((f) => f.titles.length), peak: avg((f) => f.peak), finalOvr: avg((f) => f.finalOvr),
    pMeister: share(fs, (f) => f.titles.some((t) => t.startsWith('Meister'))), pCL: share(fs, (f) => f.titles.includes('Champions League')),
    pBallon: share(fs, (f) => f.ballon > 0), p90: share(fs, (f) => f.peak >= 90), score: avg((f) => f.score),
  };
}

// ---------- Liste, Filter, Details ----------
export type FutureSort = 'score' | 'goals' | 'titles' | 'peak';
export type FutureFilter = 'all' | 'meister' | 'cl' | 'ballon' | 'top90' | 'retired';
export function listFutures(fs: Future[], sort: FutureSort, filter: FutureFilter): Future[] {
  const ok = (f: Future) => filter === 'all' ? true
    : filter === 'meister' ? f.titles.some((t) => t.startsWith('Meister'))
      : filter === 'cl' ? f.titles.includes('Champions League')
        : filter === 'ballon' ? f.ballon > 0
          : filter === 'top90' ? f.peak >= 90 : f.retired;
  const key = (f: Future) => (sort === 'score' ? f.score : sort === 'goals' ? f.goals : sort === 'titles' ? f.titles.length : f.peak);
  return fs.filter(ok).sort((a, b) => key(b) - key(a) || b.score - a.score);
}
/** Die simulierten Saisons einer Zukunft. */
export const futureSeasons = (f: Future): SeasonRecord[] => f.career.history.slice(f.from);
