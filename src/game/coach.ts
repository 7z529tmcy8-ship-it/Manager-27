import { CLUBS, LEAGUES, getClub, getLeague } from '../data/leagues';
import { summarizeCareer } from './legacy';
import { homeClubOf } from './offers';
import { clubLeagueId, clubStrength, seasonLabel } from './player';
import { chance, clamp, normal, weightedPick } from './random';
import { addResult, applyLeagueChanges, emptyRow, playMatch, roundRobin, sortTable } from './season';
import { hasTrait } from './traits';
import type { Career, CoachSeason, CoachState, TableRow } from './types';

// Trainerkarriere nach dem Karriereende: Verein wählen, Saison simulieren, am Saisonende
// bleiben oder wechseln. Der Trainerwert macht das eigene Team stärker oder schwächer.

/** Mit diesem Alter hört jeder Trainer auf. */
export const COACH_MAX_AGE = 70;

/** Wie stark der Trainerwert das Team verändert: 60 = neutral, 80 = +2,4 Stärke. */
const coachBoost = (rating: number) => (rating - 60) * 0.12;

export function canStartCoaching(career: Career): boolean {
  return career.phase === 'retired' && career.history.length > 0 && !career.coach;
}

/** Start-Trainerwert aus der Spielerkarriere: Bestwert, Titel, Ballon d’Or und Anführer-Gen. */
export function startRating(career: Career): number {
  const s = summarizeCareer(career);
  const leader = hasTrait(career.player, 'leader') ? 4 : 0;
  return Math.round(clamp(44 + (s.peak - 70) * 0.5 + s.titles * 0.4 + s.ballonDor * 2 + leader, 42, 72));
}

/**
 * Drei Vereine, die zum Trainerwert passen. Deutsche Vereine und frühere Vereine des Spielers
 * (vor allem der Heimatverein) melden sich eher.
 */
export function coachOffers(career: Career, rating: number, exclude: string[] = []): string[] {
  const former = new Set(career.history.map((r) => r.clubId));
  const home = homeClubOf(career);
  const taken = new Set(exclude);
  const out: string[] = [];
  for (let i = 0; i < 3; i++) {
    const options = CLUBS.filter((c) => !taken.has(c.id) && !c.name.endsWith(' II'));
    if (!options.length) break;
    const club = weightedPick(options, (c) => {
      const d = clubStrength(career, c.id) - rating;
      let w = Math.exp(-((d - 1) ** 2) / (2 * 3.5 ** 2));
      if (getLeague(clubLeagueId(career, c.id)).country === 'Deutschland') w *= 2;
      if (former.has(c.id)) w *= 3;
      if (c.id === home) w *= 3;
      return w + 1e-6;
    });
    taken.add(club.id);
    out.push(club.id);
  }
  return out;
}

export function startCoaching(prev: Career): Career {
  if (!canStartCoaching(prev)) return prev;
  const career: Career = structuredClone(prev);
  const rating = startRating(career);
  career.coach = {
    clubId: null,
    rating,
    age: career.player.age,
    year: career.year,
    history: [],
    offers: coachOffers(career, rating),
    phase: 'choose',
  };
  career.updatedAt = Date.now();
  return career;
}

/** Verein übernehmen (oder beim aktuellen bleiben). */
export function chooseCoachClub(prev: Career, clubId: string): Career {
  const c = prev.coach;
  if (!c || c.phase !== 'choose' || !(c.offers.includes(clubId) || c.clubId === clubId)) return prev;
  const career: Career = structuredClone(prev);
  const coach = career.coach!;
  coach.clubId = clubId;
  coach.offers = [];
  coach.phase = 'season';
  coach.note = undefined;
  career.updatedAt = Date.now();
  return career;
}

/** Erwarteter Tabellenplatz nach Kaderstärke (ohne Trainereinfluss). */
export function expectedPosition(career: Career, clubId: string): number {
  const leagueId = clubLeagueId(career, clubId);
  const order = CLUBS.filter((c) => clubLeagueId(career, c.id) === leagueId)
    .sort((a, b) => clubStrength(career, b.id) - clubStrength(career, a.id));
  return order.findIndex((c) => c.id === clubId) + 1;
}

/** Eine komplette Saison als Trainer: alle Ligen werden gespielt, danach Auf-/Abstieg und Bilanz. */
export function playCoachSeason(prev: Career): Career {
  const c = prev.coach;
  if (!c || c.phase !== 'season' || !c.clubId) return prev;
  const career: Career = structuredClone(prev);
  const coach = career.coach!;
  const clubId = coach.clubId!;
  const leagueId = clubLeagueId(career, clubId);
  const league = getLeague(leagueId);
  const expected = expectedPosition(career, clubId);
  const slot = career.europeSlots[clubId];

  const strength: Record<string, number> = {};
  for (const club of CLUBS) strength[club.id] = clubStrength(career, club.id) + normal(0, 1.2);
  strength[clubId] += coachBoost(coach.rating);

  const tables: Record<string, TableRow[]> = {};
  for (const l of LEAGUES) {
    const ids = CLUBS.filter((club) => clubLeagueId(career, club.id) === l.id).map((club) => club.id);
    const rows = new Map(ids.map((id) => [id, emptyRow(id)]));
    for (const round of roundRobin([...ids].sort())) {
      for (const [h, a] of round) {
        const [gh, ga] = playMatch(strength[h], strength[a], l.goalsPerGame);
        addResult(rows.get(h)!, gh, ga);
        addResult(rows.get(a)!, ga, gh);
      }
    }
    tables[l.id] = sortTable([...rows.values()]);
  }
  const table = tables[leagueId];
  const position = table.findIndex((r) => r.clubId === clubId) + 1;
  const points = table[position - 1].points;

  const trophies: string[] = [];
  if (position === 1) trophies.push(league.tier === 1 ? `Meister (${league.name})` : `Meister (${league.name}, Aufstieg)`);
  else if (league.up && position <= league.up.spots) trophies.push(`Aufstieg (${league.name})`);
  if (chance(expected <= 2 ? 0.25 : expected <= 6 ? 0.08 : 0.02)) trophies.push(league.cup);
  if (slot === 'Champions League' && chance(clamp((strength[clubId] - 80) / 40, 0.01, 0.25))) trophies.push('Champions League');
  else if (slot && slot !== 'Champions League' && chance(clamp((strength[clubId] - 72) / 40, 0.02, 0.2))) trophies.push(slot);

  const relegated = !!league.down && position > table.length - league.down.spots;
  const expectedDown = !!league.down && expected > table.length - league.down.spots;
  const sacked = (relegated && !expectedDown) || (position >= expected + 6 && position > table.length * 0.6);

  // Trainerwert: Platz gegenüber der Erwartung und Titel; ab 62 lässt die Energie langsam nach.
  const titles = trophies.filter((t) => !t.startsWith('Aufstieg')).length + (trophies.some((t) => t.startsWith('Aufstieg')) ? 0.5 : 0);
  const delta = clamp((expected - position) * 0.5 + titles * 1.5 + normal(0, 0.6), -4, 5) - (coach.age >= 62 ? 0.5 : 0);
  coach.rating = Math.round(clamp(coach.rating + delta, 35, 95));

  const record: CoachSeason = {
    season: seasonLabel(coach.year),
    age: coach.age,
    clubId,
    leagueId,
    position,
    expected,
    points,
    trophies,
    rating: coach.rating,
    sacked,
  };
  coach.history.push(record);
  applyLeagueChanges(career, tables);
  coach.year += 1;
  coach.age += 1;

  const name = getClub(clubId).name;
  if (coach.age >= COACH_MAX_AGE) {
    coach.phase = 'done';
    coach.note = `Mit ${coach.age} Jahren ist Schluss: Trainerkarriere beendet.`;
  } else if (sacked) {
    coach.clubId = null;
    coach.phase = 'choose';
    coach.offers = coachOffers(career, coach.rating - 3, [clubId]);
    coach.note = `Entlassen! Platz ${position} statt Platz ${expected} war ${name} zu wenig.`;
  } else {
    coach.phase = 'choose';
    coach.offers = coachOffers(career, coach.rating + 3, [clubId]).slice(0, 2);
    coach.note = trophies.length
      ? `Starke Saison mit ${name}: ${trophies.join(', ')}.`
      : position < expected
        ? `Platz ${position} – besser als erwartet (Platz ${expected}).`
        : `Platz ${position} (erwartet: Platz ${expected}).`;
  }
  career.updatedAt = Date.now();
  return career;
}

/** Trainerkarriere beenden. */
export function endCoaching(prev: Career): Career {
  if (!prev.coach || prev.coach.phase === 'done') return prev;
  const career: Career = structuredClone(prev);
  career.coach!.phase = 'done';
  career.coach!.note = `Ruhestand mit ${career.coach!.age} Jahren.`;
  career.updatedAt = Date.now();
  return career;
}

/** Bilanz für die Anzeige: Saisons, Titel, Bestplatzierung. */
export function coachSummary(coach: CoachState) {
  return {
    seasons: coach.history.length,
    titles: coach.history.reduce((a, s) => a + s.trophies.filter((t) => !t.startsWith('Aufstieg')).length, 0),
    promotions: coach.history.filter((s) => s.trophies.some((t) => t.startsWith('Aufstieg') || t.includes('Aufstieg'))).length,
    clubs: [...new Set(coach.history.map((s) => s.clubId))].length,
  };
}
