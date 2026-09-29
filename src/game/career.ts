import { getClub, getLeague, initialClubLeague } from '../data/leagues';
import { developPlayer, performanceIndex } from './development';
import { rollEvents } from './events';
import { APPLICATIONS_PER_WINDOW, APPLICATION_AGE, answerApplication, generateOffers, type OfferMode } from './offers';
import { ROLE_BONUS, clubLeagueId, clubStrength, createProfile, currentClubId, currentRole, playerValue, roleFor, seasonLabel, wageFor } from './player';
import { uid } from './random';
import { applyLeagueChanges, computeNational, finishSeason, halfStats, initialEuropeSlots, nationStrength, playHalf, startSeason } from './season';
import { maybeDecision } from './decisions';
import { checkAchievements } from './achievements';
import { createSeasonGoals, evaluateGoals } from './goals';
import { applyTraining } from './training';
import { hasTrait, type TraitId } from './traits';
import { advanceFinal, autoFinal, finalRating, startFinal } from './final';
import { addNews, summerNews, winterNews } from './news';
import { createRival, simulateRivalSeason } from './rival';
import type { Career, MatchLine, Offer, Position, SeasonRecord, TrainingFocus, TransferEntry } from './types';

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
  traits?: TraitId[];
}

export function createCareer(np: NewPlayer): Career {
  const club = getClub(np.clubId);
  const now = Date.now();
  const career: Career = {
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
      traits: np.traits ?? [],
      leadership: np.traits?.includes('leader') ? 1 : 0,
    },
    history: [],
    offers: [],
    phase: 'season',
    requestsLeft: 0,
    clubDrift: {},
    europeSlots: initialEuropeSlots(),
    clubLeague: initialClubLeague(),
    transfers: [],
    rival: createRival(np, club.id),
    news: [],
  };
  career.seasonGoals = createSeasonGoals(career);
  return isKidnapName(np.name) ? kidnap(career) : career;
}

/** Easter Egg: Wer „Laurens Götting“ heißt, wird zum Karrierestart von der Mafia entführt. */
export function isKidnapName(name: string): boolean {
  const n = name.trim().toLowerCase().replace(/\s+/g, ' ').replace(/ö/g, 'oe');
  return n === 'laurens goetting' || n === 'laurens gotting';
}

const KIDNAP_SEASONS = 3;

/** Drei Saisons laufen ohne den Spieler weiter – danach ist er frei, vereinslos und bei Wertung 50. */
function kidnap(career: Career): Career {
  const p = career.player;
  const club = getClub(p.contract.clubId).name;
  p.absent = true;
  addNews(career, 1, 'Du', `EILMELDUNG: ${p.name} nach dem Training von der Mafia entführt! ${club} ist fassungslos.`);

  for (let i = 0; i < KIDNAP_SEASONS; i++) {
    const prog = startSeason(career);
    // Keine Finals und keine Länderspiele in Gefangenschaft
    prog.cup.eligible = false;
    if (prog.euro) prog.euro.eligible = false;
    playHalf(career, prog, 1);
    playHalf(career, prog, 2);
    prog.national = { caps: 0, goals: 0, tournament: null, notes: [] };
    const { record, tables } = finishSeason(career, prog);
    record.trophies = [];
    record.awards = [];
    record.cupReached = 'entführt';
    if (record.europe) record.europe = { ...record.europe, reached: 'entführt' };
    record.events = i === 0
      ? [{
        title: 'Von der Mafia entführt!', half: 1, tone: 'bad', effect: 'keine Spiele, Wertung sinkt',
        text: 'Nach dem Training zerren dich maskierte Männer in einen schwarzen Van. Von dir fehlt jede Spur.',
      }]
      : [];
    record.devReasons = ['In Gefangenschaft – kein Training, kein Fußball.'];
    record.notes = [`${KIDNAP_SEASONS - i > 1 ? 'Weiterhin' : 'Immer noch'} in den Fängen der Mafia – keine Spiele.`];
    applyLeagueChanges(career, tables);
    const rivalNews = simulateRivalSeason(career, record);
    career.history.push(record);
    for (const t of rivalNews) addNews(career, 2, 'Rivale', t);
    addNews(career, 2, 'Du', i < KIDNAP_SEASONS - 1
      ? `Noch immer keine Spur von ${p.name}. Die Fans hängen Banner auf: „Wir warten auf dich!“`
      : `WUNDER! ${p.name} ist nach drei Jahren wieder frei!`);
    p.age += 1;
    p.contract.yearsLeft -= 1;
    career.year += 1;
    // Die Wertung sinkt jedes Jahr – am Ende steht sie bei 50.
    p.ovr = Math.round(p.ovr - ((p.ovr - 50) * (i + 1)) / KIDNAP_SEASONS);
    record.ovrEnd = p.ovr;
    record.marketValue = playerValue(p);
  }

  p.absent = false;
  p.ovr = 50;
  p.potential = Math.max(55, p.potential - 5);
  p.morale = 0;
  p.captainOf = null;
  p.contract.yearsLeft = 0;
  // Der alte Verein hat längst geplant – nur neue Vereine melden sich.
  career.offers = generateOffers(career, career.history[career.history.length - 1]).filter((o) => o.type !== 'Verlängerung');
  career.requestsLeft = 1;
  career.applications = [];
  career.phase = 'window';
  career.decisionResult = {
    title: '🚨 Nach drei Jahren frei!',
    text: 'Die Mafia hat dich laufen lassen. Dein Vertrag ist ausgelaufen, deine Wertung auf 50 gefallen – Zeit für das größte Comeback der Fußballgeschichte.',
    tone: 'bad',
  };
  return career;
}

/** Spielt die Hinrunde und öffnet das Wintertransferfenster. */
export function playFirstHalf(prev: Career, quick = false): Career {
  const career: Career = structuredClone(prev);
  const p = career.player;
  // Ältere Spielstände bekommen ihren Rivalen nachträglich.
  if (career.rival === undefined) career.rival = createRival(p, currentClubId(p));
  if (!career.seasonGoals) career.seasonGoals = createSeasonGoals(career);
  career.decisionResult = null;
  const prog = startSeason(career);
  playHalf(career, prog, 1);

  const clubId = currentClubId(p);
  const stats = halfStats(prog.matches);
  const strength = clubStrength(career, clubId);
  const ovrBefore = p.ovr;
  const dev = developPlayer(p, stats, strength, { weight: 0.5 });
  p.ovr = dev.ovr;
  p.potential = dev.potential;
  const trainingNote = applyTraining(p, ovrBefore);
  if (trainingNote) prog.notes.push(trainingNote);
  prog.injuryWeeksWinter = prog.injuryWeeks;
  const beforeEvents = p.ovr;
  prog.events = rollEvents(career, 1, stats, prog.injuryWeeks, strength);
  prog.winterEventDelta = p.ovr - beforeEvents;
  prog.ovrWinter = p.ovr;

  career.progress = prog;
  career.phase = 'winter';
  // Verliehene Spieler bleiben bis Saisonende beim Leihverein.
  career.offers = p.loan ? [] : generateOffers(career, { clubId, onLoan: false, ...stats }, 'normal', true);
  career.requestsLeft = p.loan ? 0 : 1;
  career.applications = [];
  winterNews(career, stats, career.offers);
  const share = stats.possibleMinutes ? stats.minutes / stats.possibleMinutes : 0;
  career.decision = quick ? null : maybeDecision(career, 'winter', share);
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
  p.captainOf = null;
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
  let career = stayInWinter(playFirstHalf(prev, true));
  // Finals im Schnelldurchlauf automatisch ausspielen.
  while (career.phase === 'final') career = finishFinal(autoPlayFinal(career));
  return career;
}

/** Rückrunde spielen, Saison abschließen und das Sommer-Transferfenster öffnen. */
function finishSecondHalf(career: Career): Career {
  const p = career.player;
  const prog = career.progress!;
  playHalf(career, prog, 2);

  const clubId = currentClubId(p);
  const second = halfStats(prog.matches.filter((m) => m.half === 2));
  const strength = clubStrength(career, clubId);
  const ovrBefore = p.ovr;
  const dev = developPlayer(p, second, strength, {
    weight: 0.5,
    potentialStats: halfStats(prog.matches),
  });
  p.ovr = dev.ovr;
  p.potential = dev.potential;
  const trainingNote = applyTraining(p, ovrBefore);
  if (trainingNote) dev.reasons.push(trainingNote);
  // Eine insgesamt starke Saison mit viel Spielzeit endet (bis 31) nie mit einem Minus –
  // es sei denn, Ereignisse wie eine schwere Verletzung sind der Grund.
  const season = halfStats(prog.matches);
  const seasonShare = season.possibleMinutes ? season.minutes / season.possibleMinutes : 0;
  if (performanceIndex(season) >= 0.7 && seasonShare >= 0.5 && p.age - (p.position === 'TW' ? 2 : 0) <= 31) {
    p.ovr = Math.max(p.ovr, prog.ovrStart + (prog.winterEventDelta ?? 0));
    p.potential = Math.max(p.potential, p.ovr);
  }
  const injuryWeeks = prog.injuryWeeks - (prog.injuryWeeksWinter ?? 0);
  prog.events = [...(prog.events ?? []), ...rollEvents(career, 2, second, injuryWeeks, strength)];
  prog.devReasons = dev.reasons;
  prog.national = computeNational(career, prog);

  if (prog.pendingFinals?.length) {
    career.phase = 'final';
    career.liveFinal = startNextFinal(career);
    career.updatedAt = Date.now();
    return career;
  }
  return completeSeason(career);
}

/** Saison abschließen (nach allen Finals): Tabellen, Titel, Rivale, Schlagzeilen, Transferfenster. */
function completeSeason(career: Career): Career {
  const p = career.player;
  const prog = career.progress!;
  const seasonStats = halfStats(prog.matches);
  const goalResults = evaluateGoals(career.seasonGoals ?? [], prog.matches);
  const { record, tables } = finishSeason(career, prog);
  record.goalResults = goalResults;
  applyGoalConsequences(career, record);
  p.caps += record.caps;
  p.internationalGoals += record.internationalGoals;
  record.ovrWinter = prog.ovrWinter;
  record.events = prog.events ?? [];
  record.devReasons = prog.devReasons ?? [];
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
  const extraNews = [...captainAndLegend(career, record), ...simulateRivalSeason(career, record)];
  record.achievements = checkAchievements(career, record.season);
  extraNews.push(...record.achievements.map((a) => `Erfolg freigeschaltet: ${a}`));
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
  summerNews(career, record, seasonStats, tables, extraNews);
  const share = seasonStats.possibleMinutes ? seasonStats.minutes / seasonStats.possibleMinutes : 0;
  career.decision = maybeDecision(career, 'summer', share);
  return career;
}

/** Saisonziele: alle erreicht → mehr Vertrauen und Gehaltsbonus, keins erreicht → Vertrauen sinkt. */
function applyGoalConsequences(career: Career, record: SeasonRecord) {
  const results = record.goalResults ?? [];
  if (!results.length) return;
  const p = career.player;
  const met = results.filter((r) => r.met).length;
  if (met === results.length) {
    p.morale = Math.min(3, (p.morale ?? 0) + 2);
    p.contract.wage = Math.round((p.contract.wage * 1.1) / 500) * 500;
    record.notes.push('Alle Saisonziele erreicht: Der Trainer vertraut dir mehr, dazu gibt es 10 % Gehaltsbonus.');
  } else if (met === 0) {
    p.morale = Math.max(-3, (p.morale ?? 0) - 2);
    record.notes.push('Kein Saisonziel erreicht – der Trainer ist enttäuscht.');
  } else {
    record.notes.push('Saisonziele teilweise erreicht.');
  }
}

/** Trainingsschwerpunkt für die nächste Halbserie wählen. */
export function setTrainingFocus(prev: Career, focus: TrainingFocus): Career {
  const career: Career = structuredClone(prev);
  career.player.trainingFocus = focus;
  career.updatedAt = Date.now();
  return career;
}

/** Kapitänsbinde nach mehreren Jahren im Verein, Legendenstatus nach vielen Jahren oder Titeln. */
function captainAndLegend(career: Career, record: SeasonRecord): string[] {
  const p = career.player;
  const clubId = p.contract.clubId;
  const club = getClub(clubId).name;
  const news: string[] = [];
  const atClub = career.history.filter((h) => h.clubId === clubId && !h.onLoan);
  let consecutive = 0;
  for (let i = career.history.length - 1; i >= 0; i--) {
    const h = career.history[i];
    if (h.clubId !== clubId || h.onLoan) break;
    consecutive++;
  }
  const important = ['Schlüsselspieler', 'Stammspieler'].includes(roleFor(p.ovr, clubStrength(career, clubId), p.age));
  const needed = Math.max(1, 3 - (p.leadership ?? 0));
  if (p.captainOf !== clubId && consecutive >= needed && p.age >= 23 && important && record.apps >= 15) {
    p.captainOf = clubId;
    record.events = [...(record.events ?? []), {
      title: 'Kapitän!', text: `Du trägst ab sofort die Binde bei ${club}.`, tone: 'good', half: 2, effect: 'mehr Einsatzchancen',
    }];
    news.push(`${p.name} ist neuer Kapitän von ${club}!`);
  }
  const titlesAtClub = atClub.reduce((a, h) => a + h.trophies.length, 0);
  const legends = p.legendOf ?? [];
  if (!legends.includes(clubId) && (atClub.length >= 8 || (atClub.length >= 5 && titlesAtClub >= 3))) {
    p.legendOf = [...legends, clubId];
    record.awards.push(`Vereinslegende ${club}`);
    news.push(`${p.name} ist eine Legende bei ${club}!`);
  }
  return news;
}

function startNextFinal(career: Career) {
  const p = career.player;
  const prog = career.progress!;
  const final = prog.pendingFinals![0];
  const clubId = currentClubId(p);
  const national = final.kind === 'national';
  const ownStrength = national ? nationStrength(p.nation) : prog.strength[clubId] ?? clubStrength(career, clubId);
  const selection = national
    ? p.ovr - (ownStrength - 2)
    : p.ovr - ownStrength + ROLE_BONUS[currentRole(p)] + (p.morale ?? 0) + (p.captainOf === clubId ? 1 : 0);
  const clutch = (hasTrait(p, 'clutch') ? 0.08 : 0) + (hasTrait(p, 'showman') ? 0.04 : 0);
  return startFinal({
    clutch,
    hothead: hasTrait(p, 'hothead'),
    final,
    ownName: national ? p.nation : getClub(clubId).name,
    ownStrength,
    goalsPerGame: national ? 2.5 : getLeague(clubLeagueId(career, clubId)).goalsPerGame,
    playerName: p.name,
    position: p.position,
    ovr: p.ovr,
    selection,
  });
}

/** Nächster Schritt im Live-Finale (optional mit Entscheidung). */
export function playFinalStep(prev: Career, choice?: string): Career {
  const career: Career = structuredClone(prev);
  if (!career.liveFinal) return prev;
  career.liveFinal = advanceFinal(career.liveFinal, choice, career.player.name, career.player.ovr);
  return career;
}

export function autoPlayFinal(prev: Career): Career {
  const career: Career = structuredClone(prev);
  if (!career.liveFinal) return prev;
  career.liveFinal = autoFinal(career.liveFinal, career.player.name, career.player.ovr);
  return career;
}

/** Finale abschließen: Ergebnis übernehmen, nächstes Finale starten oder die Saison beenden. */
export function finishFinal(prev: Career): Career {
  const career: Career = structuredClone(prev);
  const state = career.liveFinal;
  const prog = career.progress;
  if (!state?.done || !prog) return prev;
  const p = career.player;
  const f = state.final;
  const played = state.playerRole !== 'bench';
  const minutes = state.playerRole === 'start' ? 90 : state.playerRole === 'sub' ? 90 - state.subMinute : 0;

  if (f.kind === 'national') {
    const nat = prog.national!;
    nat.caps += played ? 1 : 0;
    nat.goals += state.playerGoals;
    nat.tournament = { ...nat.tournament!, won: state.won };
    nat.notes.push(state.won ? '' : `Finale der ${nat.tournament.name} verloren.`);
    nat.notes = nat.notes.filter(Boolean);
  } else {
    const competition = f.kind === 'cup' ? 'Pokal' : prog.euro!.competition;
    const line: MatchLine = {
      competition, opponent: f.opponentId!, home: false, goalsFor: state.score[0], goalsAgainst: state.score[1],
      status: state.playerRole === 'bench' ? 'bench' : state.playerRole, minutes,
      goals: state.playerGoals, assists: state.playerAssists, rating: played ? finalRating(state) : null,
      clubId: currentClubId(p), half: 2,
    };
    prog.matches.push(line);
    if (f.kind === 'cup') {
      prog.cup.won = state.won;
      prog.cup.reached = state.won ? 'Sieger' : 'Finale';
    } else {
      prog.euro!.won = state.won;
      prog.euro!.reached = state.won ? 'Sieger' : 'Finale';
    }
  }
  if (state.won && played && (state.playerGoals > 0 || (finalRating(state) ?? 0) >= 8)) {
    p.morale = Math.min(3, (p.morale ?? 0) + 1);
    addNews(career, 2, 'Titel', `Finalheld ${p.name}! ${f.title}: ${state.score[0]}:${state.score[1]}.`);
  }

  prog.pendingFinals = prog.pendingFinals!.slice(1);
  if (prog.pendingFinals.length) {
    career.liveFinal = startNextFinal(career);
    return career;
  }
  career.liveFinal = null;
  return completeSeason(career);
}

export function acceptOffer(prev: Career, offer: Offer): Career {
  const career: Career = structuredClone(prev);
  const p = career.player;
  if (offer.type !== 'Verlängerung') {
    recordTransfer(career, 'Sommer', p.contract.clubId, offer);
    p.captainOf = null;
  }
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
  for (const clubId of career.player.legendOf ?? []) {
    career.retiredReason += ` ${getClub(clubId).name} vergibt deine Rückennummer nicht mehr.`;
  }
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
  career.seasonGoals = createSeasonGoals(career);
  career.updatedAt = Date.now();
  return career;
}
