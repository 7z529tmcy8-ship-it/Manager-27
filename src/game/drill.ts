// ---------- Trainingswoche (Karriere-Update Paket 6) ----------
// Trainingsplan zwischen den Etappen (Belastung + Schwerpunkt, beides gab es intern schon) und eine kurze,
// freiwillige Timing-Übung: Treffer bringen etwas Form. Wer nicht üben will, verliert nichts.

import { attributes } from './player';
import { KEY_ATTRIBUTES } from './training';
import { ensureProgress } from './career';
import { clamp } from './random';
import type { Career, StageLoad } from './types';

export const LOAD_INFO: Record<StageLoad, { label: string; hint: string }> = {
  normal: { label: 'Normal', hint: 'Ausgeglichen' },
  full: { label: 'Volle Kraft', hint: 'Mehr Einsätze, aber deutlich höheres Verletzungsrisiko' },
  extra: { label: 'Extra-Schichten', hint: 'Etwas mehr Form und Einsätze, höheres Verletzungsrisiko' },
  rest: { label: 'Schonen', hint: 'Kaum Verletzungsgefahr, aber seltener in der Startelf' },
};
export const LOAD_ORDER: StageLoad[] = ['normal', 'extra', 'full', 'rest'];

/** Grüne Zone der Übung (in % der Bahn): Je besser das wichtigste Attribut, desto breiter. */
export function drillZone(career: Career): { from: number; to: number } {
  const p = career.player;
  const key = KEY_ATTRIBUTES[p.position][0];
  const a = attributes(p)[key] ?? p.ovr;
  const w = clamp(10 + (a - 50) * 0.3, 8, 24);
  return { from: 50 - w / 2, to: 50 + w / 2 };
}
/** Position der Markierung (0–100) nach `ms` Millisekunden: hin und her, eine Bahn in `period` ms. */
export function drillPos(ms: number, period = 900): number {
  const t = (ms % (period * 2)) / period;
  return (t <= 1 ? t : 2 - t) * 100;
}
export const DRILL_TRIES = 3;
export const canDrill = (c: Career) => c.phase === 'season' && !c.player.absent && (c.progress?.drillStage ?? -1) !== (c.progress?.stage ?? 0);

/** Ergebnis der Übung: 0–3 Treffer → bis zu +0,3 Form für die nächste Etappe. */
export function applyDrill(prev: Career, hits: number): { career: Career; text: string } {
  const career: Career = structuredClone(prev);
  const prog = ensureProgress(career);
  prog.drillStage = prog.stage ?? 0;
  const bonus = [0, 0.1, 0.2, 0.3][clamp(hits, 0, 3)];
  prog.form = clamp(prog.form + bonus, 3, 10);
  career.updatedAt = Date.now();
  const text = hits === 3 ? 'Perfekte Einheit! +0,3 Form.' : hits === 2 ? 'Gute Einheit. +0,2 Form.' : hits === 1 ? 'Ein Treffer. +0,1 Form.' : 'Heute klappt nichts – kein Drama.';
  return { career, text };
}
