// ---------- Schnell spielen: ganze Saison oder mehrere Saisons am Stück ----------
// Nutzt die normalen Abläufe (simulateToBreak, Szenen überspringen, Finals automatisch) und entscheidet im
// Transferfenster nach einer einfachen Regel – oder hält an, wenn eine echte Entscheidung ansteht.

import { clubStrength, currentClubId } from './player';
import { resolveNlzOffer } from './nlz';
import { applyChoice, sceneStep, seasonChoices, simulateToBreak, type Choice } from './simple';
import { ensureProgress } from './career';
import type { Career, SeasonRecord, StageLoad } from './types';

/** Was im Transferfenster automatisch passiert: 0 = treu (verlängern/bleiben), 1 = sportlich (stärkster Verein), 2 = Geld (höchstes Gehalt). */
export type TransferStyle = 0 | 1 | 2;
export const STYLE_NAME: Record<TransferStyle, { name: string; text: string }> = {
  0: { name: 'Treu', text: 'Verlängern oder bleiben, solange es geht.' },
  1: { name: 'Sportlich', text: 'Zum stärksten Verein, der dich will.' },
  2: { name: 'Geld', text: 'Das Angebot mit dem höchsten Gehalt.' },
};
/** Trainingsbelastung als Regler (0 schonen … 3 volle Kraft). */
export const LOAD_STEPS: StageLoad[] = ['rest', 'normal', 'extra', 'full'];

/** Belastung für alle kommenden Etappen und Saisons festlegen. */
export function setAutoLoad(prev: Career, load: StageLoad): Career {
  const c: Career = structuredClone(prev);
  c.autoLoad = load;
  if (c.progress) c.progress.load = load;
  c.updatedAt = Date.now();
  return c;
}
/** Belastung nach einem Saisonstart übernehmen (Saisonfortschritt wird neu angelegt). */
function applyLoad(c: Career): Career {
  if (!c.autoLoad || (c.phase !== 'season' && c.phase !== 'winter')) return c;
  const n: Career = structuredClone(c);
  ensureProgress(n).load = n.autoLoad;
  return n;
}

/** Den Rest der laufenden Saison spielen (inkl. Winterpause und Finals) – bis zum Transferfenster oder Karriereende. */
export function playRestOfSeason(prev: Career): Career {
  let c = applyLoad(prev);
  for (let i = 0; i < 8 && (c.phase === 'season' || c.phase === 'winter' || c.phase === 'final'); i++) {
    if (c.progress?.scene) { c = sceneStep(c, null); continue; }
    const n = simulateToBreak(c, false);
    if (n === c) break;
    c = applyLoad(n);
  }
  return c;
}

/** Automatische Wahl im Transferfenster. `null` = hier lieber anhalten (z. B. nur Karriereende möglich). */
export function autoChoice(c: Career, style: TransferStyle): Choice | null {
  const choices = seasonChoices(c);
  if (!choices.length) return null;
  const real = choices.filter((x) => x.kind !== 'retire');
  if (!real.length) return null;
  const greedy = real.find((x) => x.greedy);
  if (greedy) return greedy;
  const str = (x: Choice) => (x.offer ? clubStrength(c, x.offer.clubId) : clubStrength(c, currentClubId(c.player)));
  if (style === 0) return real.find((x) => x.kind === 'extend') ?? real.find((x) => x.kind === 'stay') ?? [...real].sort((a, b) => str(b) - str(a))[0];
  if (style === 2) return [...real].sort((a, b) => (b.offer?.wage ?? c.player.contract.wage) - (a.offer?.wage ?? c.player.contract.wage))[0];
  // Sportlich: stärkster Verein; Leihe nur, wenn es nichts Besseres gibt
  return [...real].sort((a, b) => str(b) - str(a) - (a.kind === 'loan' ? 1 : 0) + (b.kind === 'loan' ? 1 : 0))[0];
}

/** Ein Topklub fragt an: deutlich stärker als der aktuelle Verein (dann lieber selbst entscheiden). */
export function topOffer(c: Career): boolean {
  const now = clubStrength(c, currentClubId(c.player));
  return c.offers.some((o) => o.type !== 'Verlängerung' && o.type !== 'Leihe' && clubStrength(c, o.clubId) >= Math.max(80, now + 4));
}

export interface MultiResult { career: Career; seasons: SeasonRecord[]; stop: string | null }

/**
 * Mehrere Saisons am Stück. Nach jeder Saison (außer der letzten) entscheidet die Automatik im Transferfenster.
 * Hält an: nach der letzten Saison im Transferfenster, bei Karriereende, wenn nur noch das Karriereende bleibt,
 * oder (falls gewünscht) wenn ein Topklub anfragt.
 */
export function simulateSeasons(prev: Career, count: number, style: TransferStyle, stopOnTop: boolean): MultiResult {
  let c = prev;
  const start = prev.history.length;
  let stop: string | null = null;
  const n = Math.max(1, Math.min(10, Math.round(count)));
  for (let s = 0; s < n; s++) {
    // Steht man schon im Fenster (z. B. nach einer Saison), zuerst entscheiden
    if (c.phase === 'window') {
      if (c.nlzPending) c = resolveNlzOffer(c, true);
      if (c.phase === 'window') {
        if (stopOnTop && topOffer(c)) { stop = 'Ein Topklub will dich – entscheide selbst.'; break; }
        const pick = autoChoice(c, style);
        if (!pick) { stop = 'Es bleibt nur noch das Karriereende – entscheide selbst.'; break; }
        c = applyChoice(c, pick);
      }
    }
    if (c.phase === 'retired') { stop = 'Die Karriere ist zu Ende.'; break; }
    c = playRestOfSeason(c);
    if (c.phase === 'retired') { stop = 'Die Karriere ist zu Ende.'; break; }
    if (c.phase !== 'window') { stop = 'Hier musst du kurz selbst entscheiden.'; break; }
  }
  return { career: c, seasons: c.history.slice(start), stop };
}
