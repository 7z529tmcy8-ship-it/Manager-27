import { getClub, getLeague, initialClubLeague } from '../data/leagues';
import { developPlayer } from './development';
import { APPLICATIONS_PER_WINDOW, APPLICATION_AGE, answerApplication, generateOffers, type OfferMode } from './offers';
import { clubLeagueId, clubStrength, createProfile, currentClubId, playerValue, roleFor, seasonLabel, wageFor } from './player';
import { uid } from './random';
import { applyLeagueChanges, finishSeason, halfStats, initialEuropeSlots, playHalf, startSeason } from './season';
import type { Career, Offer, Position, TransferEntry } from './types';

export const START_YEAR = 2025;
export const MAX_AGE = 41;

export interface NewPlayer {
  name: string;
  nation: string;
  position: Position;
  age: number;
  ovr: number;
  potential: number;
  clubId: string;
}

export function createCareer(np: NewPlayer): Career {
  const club = getClub(np.clubId);
  const now = Date.now();
  return {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    startYear: START_YEAR,
    year: START_YEAR,
    player: {
      name: np.name,
      nation: np.nation,
      position: np.position,
      age: np.age,
      ovr: np.ovr,
      potential: Math.max(np.potential, np.ovr),
      profile: createProfile(np.position),
      contract: {
        clubId: club.id,
        yearsLeft: np.age <= 21 ? 3 : 2,
        wage: wageFor(np.ovr, club.strength),
        role: roleFor(np.ovr, club.strength, np.age),
      },
      loan: null,
      caps: 0,
      internationalGoals: 0,
    },
    history: [],
    offers: [],
    phase: 'season',
    requestsLeft: 0,
    clubDrift: {},
    europeSlots: initialEuropeSlots(),
    clubLeague: initialClubLeague(),
    transfers: [],
  };
}

/** Spielt die Hinrunde und öffnet das Wintertransferfenster. */
export function playFirstHalf(prev: Career): Career {
  const career: Career = structuredClone(prev);
  const p = career.player;
  const prog = startSeason(career);
  playHalf(career, prog, 1);

  const clubId = currentClubId(p);
  const stats = halfStats(prog.matches);
  const dev = developPlayer(p, stats, clubStrength(career, clubId), { weight: 0.5 });
  p.ovr = dev.ovr;
  p.potential = dev.potential;
  prog.ovrWinter = dev.ovr;

  career.progress = prog;
  career.phase = 'winter';
  // Verliehene Spieler bleiben bis Saisonende beim Leihverein.
  career.offers = p.loan ? [] : generateOffers(career, { clubId, onLoan: false, ...stats }, 'normal', true);
  career.requestsLeft = p.loan ? 0 : 1;
  career.applications = [];
  career.updatedAt = Date.now();
  return career;
}

/** Winterpause ohne Wechsel: Rückrunde beim aktuellen Verein spielen. */
export function stayInWinter(prev: Career): Career {
  return finishSecondHalf(structuredClone(prev));
}

/** Wechsel im Winter annehmen und direkt die Rückrunde spielen. */
export function acceptWinterOffer(prev: Career, offer: Offer): Career {
  const career: Career = structuredClone(prev);
  const p = career.player;
  const prog = career.progress!;
  const fromClubId = currentClubId(p);
  recordTransfer(career, 'Winter', fromClubId, offer);
  if (offer.type === 'Leihe') {
    p.loan = { clubId: offer.clubId, parentClubId: p.contract.clubId, role: offer.role };
  } else {
    p.contract = { clubId: offer.clubId, yearsLeft: offer.years, wage: offer.wage, role: offer.role };
    p.loan = null;
  }
  prog.winterMove = { fromClubId, toClubId: offer.clubId, type: offer.type };
  // Pokal und Europapokal laufen mit dem alten Verein weiter – der Spieler ist dort nicht mehr dabei.
  prog.cup.eligible = false;
  if (prog.euro) prog.euro.eligible = false;
  prog.notes.push(
    `Winterwechsel (${offer.type}): ${getClub(fromClubId).name} → ${getClub(offer.clubId).name}.`,
  );
  return finishSecondHalf(career);
}

/** Ganze Saison am Stück: Hinrunde, im Winter bleiben, Rückrunde. */
export function playSeason(prev: Career): Career {
  return stayInWinter(playFirstHalf(prev));
}

/** Rückrunde spielen, Saison abschließen und das Sommer-Transferfenster öffnen. */
function finishSecondHalf(career: Career): Career {
  const p = career.player;
  const prog = career.progress!;
  playHalf(career, prog, 2);

  const clubId = currentClubId(p);
  const second = halfStats(prog.matches.filter((m) => m.half === 2));
  const dev = developPlayer(p, second, clubStrength(career, clubId), {
    weight: 0.5,
    potentialStats: halfStats(prog.matches),
  });
  p.ovr = dev.ovr;
  p.potential = dev.potential;

  const { record, tables } = finishSeason(career, prog);
  p.caps += record.caps;
  p.internationalGoals += record.internationalGoals;
  record.ovrWinter = prog.ovrWinter;
  record.notes.unshift(...dev.reasons);
  career.progress = null;

  const leagueBefore = clubLeagueId(career, p.contract.clubId);
  applyLeagueChanges(career, tables);
  const leagueAfter = clubLeagueId(career, p.contract.clubId);
  if (leagueBefore !== leagueAfter) {
    const name = getClub(p.contract.clubId).name;
    const promoted = getLeague(leagueAfter).tier < getLeague(leagueBefore).tier;
    record.notes.push(promoted ? `${name} ist aufgestiegen!` : `${name} ist abgestiegen.`);
  }

  p.age += 1;
  p.contract.yearsLeft -= 1;
  if (p.loan) {
    record.notes.push(`Leihe bei ${getClub(p.loan.clubId).name} beendet – Rückkehr zu ${getClub(p.loan.parentClubId).name}.`);
    p.loan = null;
  }
  if (p.contract.yearsLeft <= 0) record.notes.push('Dein Vertrag ist ausgelaufen – du bist ablösefrei.');
  record.marketValue = playerValue(p);

  career.history.push(record);
  career.year += 1;
  career.updatedAt = Date.now();

  if (p.age >= MAX_AGE) {
    career.phase = 'retired';
    career.retiredReason = `Mit ${p.age} Jahren ist Schluss – Karriereende.`;
    return career;
  }
  career.offers = generateOffers(career, record);
  career.requestsLeft = 1;
  career.applications = [];
  career.phase = 'window';
  return career;
}

export function acceptOffer(prev: Career, offer: Offer): Career {
  const career: Career = structuredClone(prev);
  const p = career.player;
  if (offer.type !== 'Verlängerung') recordTransfer(career, 'Sommer', p.contract.clubId, offer);
  if (offer.type === 'Leihe') {
    p.loan = { clubId: offer.clubId, parentClubId: p.contract.clubId, role: offer.role };
  } else {
    p.contract = { clubId: offer.clubId, yearsLeft: offer.years, wage: offer.wage, role: offer.role };
    p.loan = null;
  }
  return startNextSeason(career);
}

export function canStay(career: Career): boolean {
  return career.player.contract.yearsLeft > 0;
}

export function stayAtClub(prev: Career): Career {
  const career: Career = structuredClone(prev);
  const p = career.player;
  p.contract.role = roleFor(p.ovr, clubStrength(career, p.contract.clubId), p.age);
  return startNextSeason(career);
}

export function requestOffers(prev: Career, mode: OfferMode): Career {
  const career: Career = structuredClone(prev);
  const known = new Set(career.offers.map((o) => `${o.type}:${o.clubId}`));
  const winter = career.phase === 'winter' && career.progress;
  const basis = winter
    ? { clubId: currentClubId(career.player), onLoan: false, ...halfStats(career.progress!.matches) }
    : career.history[career.history.length - 1];
  const fresh = generateOffers(career, basis, mode, !!winter).filter(
    (o) => o.type !== 'Verlängerung' && !known.has(`${o.type}:${o.clubId}`),
  );
  career.offers = [...career.offers, ...fresh];
  career.requestsLeft -= 1;
  career.updatedAt = Date.now();
  return career;
}

export function retire(prev: Career): Career {
  const career: Career = structuredClone(prev);
  career.phase = 'retired';
  career.retiredReason = `Karriereende mit ${career.player.age} Jahren.`;
  career.offers = [];
  career.updatedAt = Date.now();
  return career;
}

function recordTransfer(career: Career, window: TransferEntry['window'], fromClubId: string, offer: Offer) {
  career.transfers = [
    ...(career.transfers ?? []),
    { season: seasonLabel(career.year), window, type: offer.type, fromClubId, toClubId: offer.clubId, fee: offer.fee },
  ];
}

/** Summe aller gezahlten Ablösen für den Spieler (Leihen und ablösefreie Wechsel zählen 0). */
export function totalTransferFees(career: Career): number {
  return (career.transfers ?? []).reduce((a, t) => a + t.fee, 0);
}

export function applicationsLeft(career: Career): number {
  const p = career.player;
  if (p.age < APPLICATION_AGE || (career.phase === 'winter' && p.loan)) return 0;
  return APPLICATIONS_PER_WINDOW - (career.applications?.length ?? 0);
}

/** Der Spieler bewirbt sich selbst bei einem Verein (ab 30 Jahren, begrenzt pro Fenster). */
export function applyToClub(prev: Career, clubId: string): Career {
  if (applicationsLeft(prev) <= 0) return prev;
  const career: Career = structuredClone(prev);
  const answer = answerApplication(career, clubId);
  career.applications = [...(career.applications ?? []), { clubId, accepted: answer.accepted, message: answer.message }];
  if (answer.offer) {
    career.offers = [answer.offer, ...career.offers.filter((o) => !(o.clubId === clubId && o.type !== 'Leihe'))];
  }
  career.updatedAt = Date.now();
  return career;
}

function startNextSeason(career: Career): Career {
  career.offers = [];
  career.applications = [];
  career.phase = 'season';
  career.updatedAt = Date.now();
  return career;
}
