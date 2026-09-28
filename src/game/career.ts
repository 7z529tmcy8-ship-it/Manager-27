import { getClub, getLeague, initialClubLeague } from '../data/leagues';
import { developPlayer } from './development';
import { generateOffers, type OfferMode } from './offers';
import { clubLeagueId, clubStrength, createProfile, playerValue, roleFor, wageFor } from './player';
import { uid } from './random';
import { applyLeagueChanges, initialEuropeSlots, simulateSeason } from './season';
import type { Career, Offer, Position } from './types';

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
  };
}

/** Simuliert die aktuelle Saison und öffnet danach das Transferfenster. */
export function playSeason(prev: Career): Career {
  const career: Career = structuredClone(prev);
  const p = career.player;
  const { record, tables } = simulateSeason(career);

  const dev = developPlayer(p, record, clubStrength(career, record.clubId));
  p.ovr = dev.ovr;
  p.potential = dev.potential;
  p.caps += record.caps;
  p.internationalGoals += record.internationalGoals;
  record.ovrEnd = dev.ovr;
  record.notes.unshift(...dev.reasons);

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
  career.phase = 'window';
  return career;
}

export function acceptOffer(prev: Career, offer: Offer): Career {
  const career: Career = structuredClone(prev);
  const p = career.player;
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
  const last = career.history[career.history.length - 1];
  const known = new Set(career.offers.map((o) => `${o.type}:${o.clubId}`));
  const fresh = generateOffers(career, last, mode).filter(
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

function startNextSeason(career: Career): Career {
  career.offers = [];
  career.phase = 'season';
  career.updatedAt = Date.now();
  return career;
}
