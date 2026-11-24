// ---------- Story & Rivalen (Karriere-Update Paket 5) ----------
// Fan-Stimmung pro Verein, sichtbarer Rivale mit Saison-Duell und automatische Karriere-Kapitel.

import { getClub } from '../data/leagues';
import { currentClubId } from './player';
import { halfStats } from './season';
import { duelRecord } from './rival';
import { postInbox } from './inbox';
import { clamp } from './random';
import type { Career, SeasonRecord } from './types';

// ---------- Fans ----------

const FAN_WORDS: [number, string][] = [[-1.5, 'Pfiffe'], [-0.5, 'Kritisch'], [0.75, 'Abwartend'], [2, 'Zufrieden'], [99, 'Fan-Liebling']];
export function fanMood(career: Career, clubId = currentClubId(career.player)): { value: number; word: string; pct: number } {
  const value = career.fans?.[clubId] ?? 0;
  return { value, word: FAN_WORDS.find(([max]) => value < max)![1], pct: (value + 3) / 6 };
}
function addFans(career: Career, clubId: string, d: number) {
  const fans = { ...(career.fans ?? {}) };
  fans[clubId] = Math.round(clamp((fans[clubId] ?? 0) + d, -3, 3) * 100) / 100;
  career.fans = fans;
}
/** Nach einer Etappe: starke Noten und Tore bringen die Kurve auf deine Seite. */
export function fanTick(career: Career, stage: number): string | null {
  const prog = career.progress;
  if (!prog) return null;
  const clubId = currentClubId(career.player);
  const st = halfStats(prog.matches.filter((m) => m.stage === stage && m.clubId === clubId));
  if (!st.apps) return null;
  const before = fanMood(career, clubId).word;
  const r = st.avgRating ?? 6.6;
  const d = (r >= 7.3 ? 0.35 : r >= 6.9 ? 0.15 : r <= 6.3 ? -0.3 : 0) + Math.min(0.3, st.goals * 0.08);
  addFans(career, clubId, d);
  const after = fanMood(career, clubId).word;
  if (after !== before && d > 0 && after === 'Fan-Liebling') return `Die Kurve singt deinen Namen – du bist Fan-Liebling bei ${getClub(clubId).name}!`;
  if (after !== before && d < 0 && after === 'Pfiffe') return `Pfiffe bei ${getClub(clubId).name} – die Fans sind unzufrieden.`;
  return null;
}
/** Wechsel: Wer nach kurzer Zeit geht, verärgert die alten Fans. Treue Spieler bleiben in guter Erinnerung. */
export function fanLeave(career: Career, fromClubId: string, toClubId: string): void {
  if (fromClubId === toClubId) return;
  const seasons = career.history.filter((r) => r.clubId === fromClubId).length;
  addFans(career, fromClubId, seasons >= 4 ? 0.5 : seasons <= 2 ? -1.5 : -0.5);
  // Rückkehr zu einem früheren Verein: Empfang je nach Erinnerung
  if (career.history.some((r) => r.clubId === toClubId)) {
    const m = fanMood(career, toClubId);
    postInbox(career, { kind: 'transfer', title: m.value >= 0.75 ? 'Applaus zur Rückkehr' : m.value <= -0.5 ? 'Pfiffe zur Rückkehr' : 'Zurück', text: m.value >= 0.75 ? `Die Fans von ${getClub(toClubId).name} empfangen dich mit offenen Armen.` : m.value <= -0.5 ? `Die Fans von ${getClub(toClubId).name} haben nicht vergessen, wie du gegangen bist.` : `Du bist zurück bei ${getClub(toClubId).name}.` });
  }
}
/** Saisonende: Treue wird belohnt. */
export function fanSeasonEnd(career: Career, r: SeasonRecord): void {
  addFans(career, r.clubId, 0.25 + (r.trophies.length ? 0.4 : 0));
}

// ---------- Rivale ----------

export interface RivalView { name: string; clubId: string; ovr: number; age: number; record: { player: number; rival: number; draw: number }; mine: number; theirs: number | null; retired: boolean }
/** Rivale mit Bilanz und (während der Saison) Hochrechnung seiner Torbeteiligungen. */
export function rivalView(career: Career): RivalView | null {
  const r = career.rival;
  if (!r) return null;
  const prog = career.progress;
  const st = prog ? halfStats(prog.matches) : null;
  const mine = st ? st.goals + st.assists : 0;
  const last = r.history[r.history.length - 1];
  const fraction = prog ? (prog.stage ?? 0) / 6 : 0;
  const theirs = last && fraction > 0 && !r.retired ? Math.round((last.goals + last.assists) * fraction) : null;
  return { name: r.name, clubId: r.clubId, ovr: r.ovr, age: r.age, record: duelRecord(r), mine, theirs, retired: r.retired };
}

// ---------- Karriere-Kapitel ----------

export interface Chapter { clubId: string; from: string; to: string; title: string; seasons: number }
/** Kapitel je Vereinsstation – Überschrift aus dem, was dort passiert ist. */
export function chapters(career: Career): Chapter[] {
  const out: Chapter[] = [];
  let cur: SeasonRecord[] = [];
  const flush = () => {
    if (!cur.length) return;
    const club = getClub(cur[0].clubId).name;
    const goals = cur.reduce((a, r) => a + r.goals, 0);
    const apps = cur.reduce((a, r) => a + r.apps, 0);
    const trophies = cur.flatMap((r) => r.trophies);
    const growth = cur[cur.length - 1].ovrEnd - cur[0].ovrStart;
    const loan = cur.every((r) => r.onLoan);
    let title: string;
    if (trophies.some((t) => t === 'Champions League')) title = `Königsklasse mit ${club}`;
    else if (trophies.length >= 3) title = `Titelsammler bei ${club}`;
    else if (trophies.length) title = `Titel mit ${club}`;
    else if (loan) title = apps >= 20 ? `Leihe nach ${club} – Spielpraxis getankt` : `Leihe nach ${club}`;
    else if (goals >= 20 * cur.length && career.player.position !== 'TW') title = `Torfabrik ${club}`;
    else if (growth >= 6) title = `Durchbruch bei ${club}`;
    else if (apps < 10 * cur.length) title = `Schwere Zeit bei ${club}`;
    else if (cur.length >= 5) title = `Treue Jahre bei ${club}`;
    else title = `Stammkraft bei ${club}`;
    out.push({ clubId: cur[0].clubId, from: cur[0].season, to: cur[cur.length - 1].season, title, seasons: cur.length });
    cur = [];
  };
  for (const r of career.history) {
    if (cur.length && cur[0].clubId !== r.clubId) flush();
    cur.push(r);
  }
  flush();
  return out;
}
