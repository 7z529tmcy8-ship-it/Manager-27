import { getClub } from '../data/leagues';
import { acceptOffer, acceptWinterOffer, canStay, playFirstHalf, playSeason, requestOffers, retire, stayAtClub } from './career';
import { chance, randInt } from './random';
import { clubStrength } from './player';
import { STAGES_PER_HALF, halfStats } from './season';
import { grantXp, levelInfo, xpFor, xpForSeason } from './skills';
import { coolDownScandal } from './vices';
import { maybeFlirt } from './family';
import { closeYear } from './household';
import type { Career, Offer } from './types';

// Vereinfachter Spielablauf: immer bis zur nächsten Pause simulieren (Winterpause, dann Saisonende),
// am Saisonende genau drei Möglichkeiten. Keine Zwischen-Entscheidungen, Finals laufen automatisch.

/** Bis zur Winterpause (aus der Saison) bzw. bis Saisonende (aus der Winterpause). */
export function simulateToBreak(input: Career): Career {
  const prev: Career = { ...input, decisionResult: null };
  // Alte Spielstände können mitten in der Rückrunde stehen – dann direkt bis Saisonende.
  const inSecondHalf = (prev.progress?.stage ?? 0) >= STAGES_PER_HALF;
  if (prev.phase === 'season' && !inSecondHalf) return withXp({ ...playFirstHalf({ ...prev, decision: null }, true), decision: null });
  if (prev.phase === 'season' || prev.phase === 'winter' || prev.phase === 'final') {
    return withXp(ensureOffers({ ...playSeason({ ...prev, decision: null }), decision: null }));
  }
  return prev;
}

/**
 * Nach jeder Pause: Skandal kühlt ab, alte Meldung „abseits des Platzes“ verschwindet, und es gibt
 * Erfahrungspunkte (Winterpause: Hinrunde, Saisonende: ganze Saison).
 */
function withXp(c: Career): Career {
  const career: Career = structuredClone(c);
  coolDownScandal(career);
  career.viceNote = null;
  addictionTick(career);
  const winter = career.phase === 'winter' && career.progress;
  // Familie und Vermögen: Jahresabschluss nach jeder Saison, in jeder Pause evtl. eine Einladung.
  if (!winter) closeYear(career);
  if (career.phase !== 'retired') maybeFlirt(career);
  if (!career.player.skills) return career;
  const p = career.player;
  const last = career.history[career.history.length - 1];
  const total = winter ? xpFor(halfStats(career.progress!.matches), p.position) : last ? xpForSeason(last, p.position) : 0;
  const { gained, levels } = grantXp(career, total, !winter);
  p.skills!.note = gained > 0
    ? `+${gained} EP${levels > 0 ? ` · Level ${levelInfo(p.skills!.xp).level} erreicht – ${levels === 1 ? 'ein neuer Fähigkeitspunkt' : `${levels} neue Fähigkeitspunkte`}!` : ''}`
    : undefined;
  return career;
}

/** Verborgene Abhängigkeit: In jeder Pause verschwindet das Geld, Stimmung und Form leiden. */
export function addictionTick(career: Career): void {
  if (!career.player.hooked && !career.player.gambler) return;
  career.drainPending = (career.drainPending ?? 0) + 1;
  career.player.morale = Math.max(-3, (career.player.morale ?? 0) - 0.8);
}

/** Damit es im Sommer immer echte Alternativen gibt, werden bei Bedarf zusätzliche Angebote eingeholt. */
function ensureOffers(c: Career): Career {
  if (c.phase !== 'window') return c;
  let out = c;
  const count = (k: 'move' | 'loan') => out.offers.filter((o) => (k === 'loan' ? o.type === 'Leihe' : o.type === 'Transfer' || o.type === 'Ablösefrei')).length;
  if (count('move') < 2) out = requestOffers({ ...out, requestsLeft: Math.max(1, out.requestsLeft) }, 'transfer');
  if (count('loan') < 1 && out.player.age <= 27) out = requestOffers({ ...out, requestsLeft: Math.max(1, out.requestsLeft) }, 'loan');
  return out;
}

export type ChoiceKind = 'transfer' | 'loan' | 'stay' | 'extend' | 'retire' | 'camp' | 'home' | 'exotic';

export interface Choice {
  kind: ChoiceKind;
  /** Überschrift der Karte, z. B. „Wechsel“. */
  title: string;
  offer?: Offer;
}

const TITLES: Record<ChoiceKind, string> = {
  transfer: 'Wechsel',
  loan: 'Leihe',
  stay: 'Bleiben',
  extend: 'Verlängern',
  retire: 'Karriere beenden',
  camp: 'Trainingslager',
  home: 'Heimkehr',
  exotic: 'Abenteuer',
};

/** Die drei Möglichkeiten im Sommer: bester Wechsel, beste Leihe, Bleiben – mit sinnvollen Ersatzoptionen. */
export function seasonChoices(career: Career): Choice[] {
  if (career.phase !== 'window') return [];
  const strength = (o: Offer) => clubStrength(career, o.clubId);
  const byStrength = (a: Offer, b: Offer) => strength(b) - strength(a);
  const transfers = career.offers.filter((o) => (o.type === 'Transfer' || o.type === 'Ablösefrei') && !o.tag).sort(byStrength);
  const loans = career.offers.filter((o) => o.type === 'Leihe').sort(byStrength);
  const extension = career.offers.find((o) => o.type === 'Verlängerung');
  const home = career.offers.find((o) => o.tag === 'home');
  const exotic = career.offers.find((o) => o.tag === 'exotic');

  const out: Choice[] = [];
  const take = (kind: ChoiceKind, offer?: Offer) => {
    if (out.length < 3 && !(offer && out.some((c) => c.offer?.id === offer.id))) out.push({ kind, title: TITLES[kind], offer });
  };
  // Gegen Karriereende ersetzen Heimkehr und Abenteuer im Ausland die normalen Optionen.
  if (home) take('home', home);
  else if (transfers[0]) take('transfer', transfers[0]);
  if (exotic) take('exotic', exotic);
  else if (loans[0]) take('loan', loans[0]);
  else if (transfers[home ? 0 : 1]) take('transfer', transfers[home ? 0 : 1]);
  if (extension) take('extend', extension);
  else if (canStay(career)) take('stay');
  // Auffüllen, falls weniger als drei: weitere Angebote, sonst Karriereende.
  for (const o of [...transfers.slice(1), ...loans.slice(1)]) take(o.type === 'Leihe' ? 'loan' : 'transfer', o);
  if (canStay(career) && !out.some((c) => c.kind === 'stay')) take('stay');
  if (out.length < 3) take('retire');
  return out;
}

export function applyChoice(prev: Career, choice: Choice): Career {
  const next =
    choice.kind === 'retire' ? retire(prev)
      : choice.kind === 'stay' ? stayAtClub(prev)
        : acceptOffer(prev, choice.offer!);
  return { ...next, decision: null };
}

export const choiceClub = (career: Career, c: Choice) =>
  c.offer ? getClub(c.offer.clubId).name : c.kind === 'stay' ? getClub(career.player.contract.clubId).name : '';

// ---------- Winterpause ----------

/** In der Winterpause: bis zu zwei Winter-Angebote (Wechsel/Leihe) und das Trainingslager. */
export function winterChoices(career: Career): Choice[] {
  if (career.phase !== 'winter') return [];
  const strength = (o: Offer) => clubStrength(career, o.clubId);
  const transfers = career.offers.filter((o) => o.type === 'Transfer' || o.type === 'Ablösefrei').sort((a, b) => strength(b) - strength(a));
  const loans = career.offers.filter((o) => o.type === 'Leihe').sort((a, b) => strength(b) - strength(a));
  const out: Choice[] = [];
  if (transfers[0]) out.push({ kind: 'transfer', title: 'Wintertransfer', offer: transfers[0] });
  if (loans[0]) out.push({ kind: 'loan', title: 'Winter-Leihe', offer: loans[0] });
  else if (transfers[1]) out.push({ kind: 'transfer', title: 'Wintertransfer', offer: transfers[1] });
  if (!career.progress?.campDone) out.push({ kind: 'camp', title: TITLES.camp });
  return out;
}

export function applyWinterChoice(prev: Career, c: Choice): Career {
  if (c.kind === 'camp') return winterCamp(prev);
  const next = acceptWinterOffer(prev, c.offer!);
  return {
    ...next,
    decision: null,
    decisionResult: {
      title: c.kind === 'loan' ? 'Winter-Leihe' : 'Wintertransfer',
      text: `Du spielst die Rückrunde bei ${getClub(c.offer!.clubId).name}. Pokal und Europapokal laufen ohne dich weiter.`,
      tone: 'good',
    },
  };
}

/**
 * Trainingslager: Je mehr Spielpraxis in der Hinrunde, desto eher bringt es +1 Gesamtwertung (nie über das Potenzial).
 * Kleines Risiko einer leichten Verletzung zum Start der Rückrunde.
 */
export function winterCamp(prev: Career): Career {
  if (prev.phase !== 'winter' || !prev.progress || prev.progress.campDone) return prev;
  const career: Career = structuredClone(prev);
  const prog = career.progress!;
  const p = career.player;
  prog.campDone = true;
  const s = halfStats(prog.matches);
  const share = s.possibleMinutes ? s.minutes / s.possibleMinutes : 0;
  const parts: string[] = [];
  let tone: 'good' | 'bad' | 'neutral' = 'neutral';
  if (p.ovr < p.potential && chance(0.35 + 0.35 * share)) {
    p.ovr += 1;
    parts.push('Harte Einheiten zahlen sich aus: +1 Gesamtwertung.');
    tone = 'good';
  } else {
    parts.push('Viel geschwitzt, aber noch kein Sprung bei der Wertung.');
  }
  if (chance(0.08)) {
    const weeks = randInt(1, 3);
    p.carryInjuryWeeks = (p.carryInjuryWeeks ?? 0) + weeks;
    parts.push(`Leider eine Zerrung: ${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'} Pause zum Rückrundenstart.`);
    tone = tone === 'good' ? 'neutral' : 'bad';
  }
  career.decisionResult = { title: 'Trainingslager', text: parts.join(' '), tone };
  career.updatedAt = Date.now();
  return career;
}
