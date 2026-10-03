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
      return !taken.has(c.id) && d <= 6 && d >= -10 && (!getLeague(clubLeagueId(career, c.id)).exotic || p.age >= EXOTIC_AGE);
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
      const options = CLUBS.filter((c) => !taken.has(c.id) && clubStrength(career, c.id) < parentStrength - 1 && !getLeague(clubLeagueId(career, c.id)).exotic);
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

  if (!winter && mode !== 'loan') {
    const home = homecomingOffer(career, taken, freeAgent);
    if (home) offers.push(home);
    const exotic = exoticOffer(career, taken, appeal, freeAgent);
    if (exotic) offers.push(exotic);
  }

  return offers;
}

/** Ab diesem Alter kommen Angebote aus MLS, Saudi-Arabien, Japan und Australien. */
export const EXOTIC_AGE = 31;
/** Ab diesem Alter möchte der Heimatverein den Spieler zurückholen. */
export const HOMECOMING_AGE = 33;

/** Der Verein, bei dem die Karriere begann (ältere Spielstände: aus Transfers bzw. erster Saison). */
export function homeClubOf(career: Career): string | null {
  return career.homeClubId ?? career.transfers?.[0]?.fromClubId ?? career.history[0]?.clubId ?? null;
}

const EXOTIC_PITCH: Record<string, string> = {
  mls: 'Sonne, Stadien voller Fans und ein Leben in Amerika',
  spl: 'Ein Gehalt, bei dem selbst Weltstars schwach werden',
  j1: 'Respekt, Disziplin und eine Liga voller Techniker',
  alm: 'Strand, Sonne und Fußball am anderen Ende der Welt',
};
const EXOTIC_WAGE: Record<string, number> = { mls: 1.6, spl: 3, j1: 1.3, alm: 1.2 };

/** Rückkehr zum Heimatverein für den letzten Akt der Karriere. */
function homecomingOffer(career: Career, taken: Set<string>, freeAgent: boolean): Offer | null {
  const p = career.player;
  const home = homeClubOf(career);
  if (p.age < HOMECOMING_AGE || career.homecoming || !home || taken.has(home) || !chance(0.75)) return null;
  taken.add(home);
  const s = clubStrength(career, home);
  const offer = transferOffer(career, home, s, freeAgent, '');
  offer.role = roleFor(p.ovr + 3, s, p.age);
  offer.fee = Math.round(offer.fee * 0.3 / 1e5) * 1e5;
  offer.message = `${getClub(home).name}, dein Heimatverein, will dich zurückholen – für den letzten Akt deiner Karriere.`;
  offer.tag = 'home';
  return offer;
}

/** Ein Abenteuer im Ausland: MLS, Saudi Pro League, J1 League oder A-League. */
function exoticOffer(career: Career, taken: Set<string>, appeal: number, freeAgent: boolean): Offer | null {
  const p = career.player;
  if (p.age < EXOTIC_AGE || !chance(p.age >= 33 ? 0.9 : 0.6)) return null;
  const options = CLUBS.filter((c) => getLeague(clubLeagueId(career, c.id)).exotic && !taken.has(c.id));
  if (!options.length) return null;
  const club = weightedPick(options, (c) => Math.exp(-((clubStrength(career, c.id) - (appeal - 3)) ** 2) / 50) + 1e-6);
  taken.add(club.id);
  const leagueId = clubLeagueId(career, club.id);
  const s = clubStrength(career, club.id);
  const offer = transferOffer(career, club.id, s, freeAgent, '');
  offer.role = roleFor(p.ovr + 2, s, p.age);
  offer.wage = Math.round((offer.wage * (EXOTIC_WAGE[leagueId] ?? 1.3)) / 500) * 500;
  offer.message = `${club.name} (${getLeague(leagueId).name}) lockt: ${EXOTIC_PITCH[leagueId] ?? 'ein Abenteuer im Ausland'}.`;
  offer.tag = 'exotic';
  return offer;
}

/** Ab diesem Alter kann sich der Spieler selbst bei Vereinen bewerben. */
export const APPLICATION_AGE = 30;
export const APPLICATIONS_PER_WINDOW = 3;

/**
 * Antwort eines Vereins auf eine Bewerbung des Spielers.
 * Schwächere Vereine sagen fast immer zu, deutlich stärkere Vereine selten.
 */
export function answerApplication(career: Career, clubId: string): { accepted: boolean; offer: Offer | null; message: string } {
  const p = career.player;
  const club = getClub(clubId);
  const s = clubStrength(career, clubId);
  const d = s - p.ovr;
  let p0 = d <= -3 ? 0.95 : d <= 2 ? 0.7 : d <= 5 ? 0.3 : 0.05;
  if (p.age >= 35) p0 -= 0.2;
  if (!chance(clamp(p0, 0.02, 0.98))) {
    const reason = d > 2 ? 'sieht dich sportlich nicht mehr auf dem nötigen Niveau' : 'plant für diese Position anders';
    return { accepted: false, offer: null, message: `${club.name} hat abgesagt – der Verein ${reason}.` };
  }
  const freeAgent = p.contract.yearsLeft <= 0;
  const offer = transferOffer(career, clubId, s, freeAgent, `${club.name} hat auf deine Bewerbung reagiert und will dich verpflichten.`);
  // Ältere Spieler, die sich selbst anbieten, sind günstig zu haben.
  offer.fee = freeAgent ? 0 : Math.round((offer.fee * 0.4) / 1e5) * 1e5;
  offer.message = offer.fee > 0
    ? `${club.name} hat auf deine Bewerbung reagiert und will dich verpflichten. Ablöse: ${formatMoney(offer.fee)}.`
    : `${club.name} hat auf deine Bewerbung reagiert und will dich verpflichten.`;
  return { accepted: true, offer, message: `${club.name} hat zugesagt – das Angebot steht oben in der Liste.` };
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
