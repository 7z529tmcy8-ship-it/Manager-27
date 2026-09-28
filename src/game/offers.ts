import { CLUBS, getClub, getLeague } from '../data/leagues';
import { clubLeagueId, clubStrength, formatMoney, playerValue, roleFor, wageFor } from './player';
import { chance, clamp, poisson, rand, randInt, uid, weightedPick } from './random';
import type { Career, Offer } from './types';

export type OfferMode = 'normal' | 'transfer' | 'loan';

/** Worauf Vereine ihr Interesse stützen: Spielzeit und Leistung der letzten Saison bzw. Hinrunde. */
export interface OfferBasis {
  clubId: string;
  onLoan: boolean;
  minutes: number;
  possibleMinutes: number;
  avgRating: number | null;
}

function contractYears(age: number): number {
  if (age <= 24) return randInt(4, 5);
  if (age <= 29) return randInt(3, 4);
  if (age <= 32) return randInt(1, 3);
  return 1;
}

/**
 * Erzeugt Angebote für das Transferfenster nach einer Saison (Sommer) oder zur Winterpause.
 * Interesse hängt von Stärke, Alter/Potenzial, Leistung und Vertragslage ab.
 * Im Winter gibt es weniger Angebote und keine Vertragsverlängerungen.
 */
export function generateOffers(
  career: Career,
  last: OfferBasis | undefined,
  mode: OfferMode = 'normal',
  winter = false,
): Offer[] {
  const p = career.player;
  const parentId = p.contract.clubId;
  const parentStrength = clubStrength(career, parentId);
  const freeAgent = p.contract.yearsLeft <= 0;
  const rating = last?.avgRating ?? 6.6;
  const share = last && last.possibleMinutes > 0 ? last.minutes / last.possibleMinutes : 0.5;
  const perf = clamp((rating - 6.8) * 3, -3, 4);
  const upside = p.age <= 23 ? (p.potential - p.ovr) * 0.4 : 0;
  const agePenalty = Math.max(0, p.age - 30) * 1.2;
  const appeal = p.ovr + upside + perf - agePenalty;
  const country = getLeague(clubLeagueId(career, parentId)).country;
  const offers: Offer[] = [];
  const taken = new Set<string>([parentId]);

  // Vertragsverlängerung beim eigenen Verein
  const wanted = share >= 0.35 || (p.age <= 22 && p.potential >= parentStrength) || p.ovr >= parentStrength - 2;
  if (!winter && p.contract.yearsLeft <= 2 && wanted && !(p.age >= 34 && p.ovr < parentStrength - 3)) {
    const role = roleFor(p.ovr, parentStrength, p.age);
    const wage = Math.max(p.contract.wage, Math.round(wageFor(p.ovr, parentStrength) * rand(1.0, 1.2) / 500) * 500);
    offers.push({
      id: uid(),
      type: 'Verlängerung',
      clubId: parentId,
      role,
      wage,
      years: contractYears(p.age),
      fee: 0,
      message: freeAgent
        ? `${getClub(parentId).name} möchte deinen auslaufenden Vertrag verlängern.`
        : `${getClub(parentId).name} bietet dir eine vorzeitige Vertragsverlängerung an.`,
    });
  }

  // Leihverein möchte fest verpflichten
  if (!winter && last?.onLoan && share >= 0.6 && rating >= 6.9 && chance(0.6)) {
    const id = last.clubId;
    const s = clubStrength(career, id);
    taken.add(id);
    offers.push(transferOffer(career, id, s, freeAgent, `${getClub(id).name} war von deiner Leihe begeistert und will dich fest verpflichten.`));
  }

  // Transferangebote
  let count = winter
    ? poisson(clamp(0.2 + perf * 0.3 + share * 0.3, 0.1, 1.5))
    : poisson(clamp(0.8 + perf * 0.4 + share, 0.3, 3.5));
  if (mode === 'transfer') count += 2;
  if (freeAgent) count = Math.max(count, 3);
  if (p.age >= 35) count = Math.min(count, 2);
  for (let i = 0; i < count; i++) {
    // Nur Vereine, für die der Spieler sportlich überhaupt in Frage kommt.
    const options = CLUBS.filter((c) => {
      const d = clubStrength(career, c.id) - appeal;
      return !taken.has(c.id) && d <= 6 && d >= -10;
    });
    if (!options.length) break;
    const club = weightedPick(options, (c) => {
      const s = clubStrength(career, c.id);
      const d = s - appeal;
      let w = Math.exp(-((d + 2) ** 2) / (2 * 3.5 ** 2));
      if (d > 3) w *= Math.exp(-(d - 3));
      if (getLeague(clubLeagueId(career, c.id)).country === country) w *= 1.3;
      return w + 1e-6;
    });
    taken.add(club.id);
    const s = clubStrength(career, club.id);
    const verb = s > parentStrength + 2 ? 'Ein großer Schritt' : s < parentStrength - 3 ? 'Ein Schritt zurück, aber' : 'Eine interessante Option';
    offers.push(
      transferOffer(career, club.id, s, freeAgent, `${verb}: ${club.name} will dich verpflichten.`),
    );
  }

  // Leihangebote für junge Spieler mit wenig Spielzeit
  if (!freeAgent && p.age <= 23 && (share < (winter ? 0.3 : 0.45) || mode === 'loan')) {
    const loans = mode === 'loan' ? randInt(3, 4) : randInt(1, 2);
    for (let i = 0; i < loans; i++) {
      const options = CLUBS.filter((c) => !taken.has(c.id) && clubStrength(career, c.id) < parentStrength - 1);
      if (!options.length) break;
      const club = weightedPick(options, (c) => {
        const d = clubStrength(career, c.id) - (p.ovr - 1);
        return Math.exp(-(d ** 2) / (2 * 3 ** 2)) + 1e-6;
      });
      taken.add(club.id);
      const s = clubStrength(career, club.id);
      const role = roleFor(p.ovr, s, p.age);
      offers.push({
        id: uid(),
        type: 'Leihe',
        clubId: club.id,
        role,
        wage: p.contract.wage,
        years: 1,
        fee: 0,
        message: winter
          ? `${club.name} möchte dich bis Saisonende ausleihen und plant dich als ${role} ein.`
          : `${club.name} möchte dich für eine Saison ausleihen und plant dich als ${role} ein.`,
      });
    }
  }

  return offers;
}

function transferOffer(career: Career, clubId: string, s: number, freeAgent: boolean, message: string): Offer {
  const p = career.player;
  // Vereine locken gern mit etwas mehr Einsatzzeit, als sie am Ende geben.
  const role = roleFor(p.ovr + (chance(0.3) ? 2 : 0), s, p.age);
    // Kurze Restlaufzeit drückt die Ablöse.
  const contractFactor = p.contract.yearsLeft === 1 ? 0.7 : 1;
  const fee = freeAgent ? 0 : Math.round((playerValue(p) * contractFactor * rand(0.9, 1.4)) / 1e5) * 1e5;
  return {
    id: uid(),
    type: freeAgent ? 'Ablösefrei' : 'Transfer',
    clubId,
    role,
    wage: Math.round((wageFor(p.ovr, s) * rand(0.95, 1.3)) / 500) * 500,
    years: contractYears(p.age),
    fee,
    message: fee > 0 ? `${message} Gebotene Ablöse: ${formatMoney(fee)}.` : message,
  };
}
