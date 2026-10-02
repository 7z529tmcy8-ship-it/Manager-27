import { getClub } from '../data/leagues';
import { acceptOffer, canStay, playFirstHalf, playSeason, requestOffers, retire, stayAtClub } from './career';
import { clubStrength } from './player';
import { STAGES_PER_HALF } from './season';
import type { Career, Offer } from './types';

// Vereinfachter Spielablauf: immer bis zur nächsten Pause simulieren (Winterpause, dann Saisonende),
// am Saisonende genau drei Möglichkeiten. Keine Zwischen-Entscheidungen, Finals laufen automatisch.

/** Bis zur Winterpause (aus der Saison) bzw. bis Saisonende (aus der Winterpause). */
export function simulateToBreak(prev: Career): Career {
  // Alte Spielstände können mitten in der Rückrunde stehen – dann direkt bis Saisonende.
  const inSecondHalf = (prev.progress?.stage ?? 0) >= STAGES_PER_HALF;
  if (prev.phase === 'season' && !inSecondHalf) return { ...playFirstHalf({ ...prev, decision: null }, true), decision: null };
  if (prev.phase === 'season') return ensureOffers({ ...playSeason({ ...prev, decision: null }), decision: null });
  if (prev.phase === 'winter' || prev.phase === 'final') return ensureOffers({ ...playSeason({ ...prev, decision: null }), decision: null });
  return prev;
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

export type ChoiceKind = 'transfer' | 'loan' | 'stay' | 'extend' | 'retire';

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
};

/** Die drei Möglichkeiten im Sommer: bester Wechsel, beste Leihe, Bleiben – mit sinnvollen Ersatzoptionen. */
export function seasonChoices(career: Career): Choice[] {
  if (career.phase !== 'window') return [];
  const strength = (o: Offer) => clubStrength(career, o.clubId);
  const byStrength = (a: Offer, b: Offer) => strength(b) - strength(a);
  const transfers = career.offers.filter((o) => o.type === 'Transfer' || o.type === 'Ablösefrei').sort(byStrength);
  const loans = career.offers.filter((o) => o.type === 'Leihe').sort(byStrength);
  const extension = career.offers.find((o) => o.type === 'Verlängerung');

  const out: Choice[] = [];
  const take = (kind: ChoiceKind, offer?: Offer) => {
    if (out.length < 3 && !(offer && out.some((c) => c.offer?.id === offer.id))) out.push({ kind, title: TITLES[kind], offer });
  };
  if (transfers[0]) take('transfer', transfers[0]);
  if (loans[0]) take('loan', loans[0]);
  else if (transfers[1]) take('transfer', transfers[1]);
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
