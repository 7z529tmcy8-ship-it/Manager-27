import { CLUBS, LEAGUES, getClub, getLeague } from '../data/leagues';
import { NATIONS, REAL_PLAYERS } from '../data/players';
import { summarizeCareer } from './legacy';
import { homeClubOf } from './offers';
import { clubLeagueId, clubStrength, formatMoney, marketValue, roundMoney, seasonLabel } from './player';
import { chance, clamp, normal, pick, poisson, rand, randInt, uid, weightedPick } from './random';
import { FIRST, LAST } from './rival';
import { addResult, applyLeagueChanges, emptyRow, goalsExpected, roundRobin, sortTable } from './season';
import { hasTrait } from './traits';
import { maybeFlirt } from './family';
import { closeYear } from './household';
import type { Career, CoachLive, CoachSeason, CoachState, CoachTactic, Position, TableRow, TransferTarget } from './types';

// Trainerkarriere nach dem Karriereende: Verein wählen, in der Vorbereitung Taktik und Transfers festlegen,
// bis zur Winterpause simulieren, dort eine Entscheidung treffen, dann bis Saisonende.
// Der Trainerwert macht das eigene Team stärker oder schwächer.

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

/** Verein übernehmen (oder beim aktuellen bleiben) – danach beginnt die Saisonvorbereitung. */
export function chooseCoachClub(prev: Career, clubId: string): Career {
  const c = prev.coach;
  if (!c || c.phase !== 'choose' || !(c.offers.includes(clubId) || c.clubId === clubId)) return prev;
  const career: Career = structuredClone(prev);
  const coach = career.coach!;
  coach.clubId = clubId;
  coach.offers = [];
  coach.phase = 'prep';
  coach.note = undefined;
  coach.live = newSeason(career, clubId);
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

// ---------- Saisonvorbereitung: Taktik und Transfers ----------

export const TACTICS: Record<CoachTactic, { icon: string; name: string; text: string; own: number; opp: number }> = {
  attack: { icon: '⚔️', name: 'Offensiv', text: 'Mehr Tore – vorne wie hinten. Gut für Favoriten.', own: 1.18, opp: 1.12 },
  balanced: { icon: '⚖️', name: 'Ausgewogen', text: 'Kein Risiko, keine Experimente.', own: 1, opp: 1 },
  defend: { icon: '🛡️', name: 'Defensiv', text: 'Mauern und kontern: weniger Gegentore, mehr Unentschieden. Gut für Außenseiter.', own: 0.85, opp: 0.78 },
};

/** Transferbudget: reicht etwa für eine echte Verstärkung, bei großen Vereinen mehr. */
function budgetFor(strength: number): number {
  return roundMoney(marketValue(strength + 4, 26, strength + 4) * rand(1.1, 1.7));
}

const GENERIC_POS: Position[] = ['TW', 'IV', 'IV', 'AV', 'ZDM', 'ZM', 'ZOM', 'FL', 'ST', 'ST'];

/** Vier Transferziele um die Stärke des Vereins: echte Spieler, wenn es passende gibt, sonst erfundene. */
export function transferTargets(career: Career, clubId: string, count = 4): TransferTarget[] {
  const s = Math.round(clubStrength(career, clubId));
  const real = REAL_PLAYERS.filter((p) => p.clubId !== clubId && p.ovr >= s + 1 && p.ovr <= s + 8);
  const out: TransferTarget[] = [];
  const used = new Set<string>();
  for (let i = 0; i < count; i++) {
    const r = real.filter((p) => !used.has(p.name));
    if (r.length && chance(0.5)) {
      const p = pick(r);
      used.add(p.name);
      out.push({ id: uid(), name: p.name, position: p.position, nation: p.nation, age: p.age, ovr: p.ovr, fee: marketValue(p.ovr, p.age, p.potential), fromClubId: p.clubId });
      continue;
    }
    // Mal ein junges Talent, mal ein erfahrener Routinier (günstig, aber schon älter).
    const veteran = chance(0.3);
    const age = veteran ? randInt(31, 34) : randInt(20, 29);
    const ovr = clamp(s + randInt(veteran ? 3 : 1, veteran ? 8 : 6), 40, 95);
    out.push({
      id: uid(),
      name: `${pick(FIRST)} ${pick(LAST)}`,
      position: pick(GENERIC_POS),
      nation: pick(NATIONS).name,
      age,
      ovr,
      fee: marketValue(ovr, age, ovr + (age <= 23 ? 4 : 0)),
    });
  }
  return out.sort((a, b) => b.ovr - a.ovr);
}

/** Wie viel Teamstärke ein Neuzugang bringt. */
export function signingBoost(career: Career, clubId: string, t: TransferTarget): number {
  return Math.round(clamp((t.ovr - clubStrength(career, clubId)) * 0.25, 0.3, 2) * 10) / 10;
}

function newSeason(career: Career, clubId: string): CoachLive {
  const strength: Record<string, number> = {};
  for (const club of CLUBS) strength[club.id] = clubStrength(career, club.id) + normal(0, 1.2);
  const rows: Record<string, TableRow[]> = {};
  for (const l of LEAGUES) rows[l.id] = CLUBS.filter((c) => clubLeagueId(career, c.id) === l.id).map((c) => emptyRow(c.id));
  return {
    tactic: 'balanced',
    boost: 0,
    budget: budgetFor(clubStrength(career, clubId)),
    targets: transferTargets(career, clubId),
    signings: [],
    rows,
    strength,
    expected: expectedPosition(career, clubId),
    form: [],
  };
}

/** Ältere Spielstände (ohne laufende Saison) bekommen eine frische Vorbereitung. */
function liveOf(career: Career): CoachLive {
  const coach = career.coach!;
  if (!coach.live) {
    coach.live = newSeason(career, coach.clubId!);
    coach.phase = 'prep';
  }
  return coach.live;
}

export function setTactic(prev: Career, tactic: CoachTactic): Career {
  if (!prev.coach?.clubId || !['prep', 'winter', 'season'].includes(prev.coach.phase)) return prev;
  const career: Career = structuredClone(prev);
  liveOf(career).tactic = tactic;
  career.updatedAt = Date.now();
  return career;
}

export const MAX_SIGNINGS = 3;

/** Spieler verpflichten: kostet Budget, macht das Team stärker (ein Teil davon bleibt über die Saison hinaus). */
export function signTarget(prev: Career, targetId: string): Career {
  if (!prev.coach?.clubId || !['prep', 'winter', 'season'].includes(prev.coach.phase)) return prev;
  const career: Career = structuredClone(prev);
  const live = liveOf(career);
  const t = live.targets.find((x) => x.id === targetId);
  if (!t || t.fee > live.budget || live.signings.length >= MAX_SIGNINGS) return prev;
  live.budget -= t.fee;
  live.boost += signingBoost(career, career.coach!.clubId!, t);
  live.signings.push(t);
  live.targets = live.targets.filter((x) => x.id !== targetId);
  career.coach!.note = `Neuzugang: ${t.name} (${t.ovr}) kommt für ${formatMoney(t.fee)}.`;
  career.updatedAt = Date.now();
  return career;
}

// ---------- Spielbetrieb ----------

/** Spielt die Runden [from, to) in allen Ligen. Eigene Spiele mit Taktik und Trainereinfluss. */
function playRounds(career: Career, live: CoachLive, half: 1 | 2, withCoach: boolean) {
  const clubId = career.coach!.clubId!;
  const own = (id: string) => live.strength[id] + (id === clubId && withCoach ? coachBoost(career.coach!.rating) + live.boost : 0);
  const t = TACTICS[live.tactic];
  for (const l of LEAGUES) {
    const list = live.rows[l.id] ?? [];
    const rows = new Map(list.map((r) => [r.clubId, r]));
    const rounds = roundRobin(list.map((r) => r.clubId).sort());
    const mid = Math.floor(rounds.length / 2);
    for (const round of half === 1 ? rounds.slice(0, mid) : rounds.slice(mid)) {
      for (const [h, a] of round) {
        let lh = goalsExpected(own(h), own(a), true, l.goalsPerGame);
        let la = goalsExpected(own(a), own(h), false, l.goalsPerGame);
        if (withCoach && h === clubId) [lh, la] = [lh * t.own, la * t.opp];
        if (withCoach && a === clubId) [lh, la] = [lh * t.opp, la * t.own];
        const gh = poisson(lh);
        const ga = poisson(la);
        addResult(rows.get(h)!, gh, ga);
        addResult(rows.get(a)!, ga, gh);
        if (h === clubId || a === clubId) {
          const [f, g] = h === clubId ? [gh, ga] : [ga, gh];
          live.form.push(f > g ? 'S' : f === g ? 'U' : 'N');
        }
      }
    }
  }
}

/** Aktueller Platz des eigenen Vereins in der laufenden Saison. */
export function livePosition(career: Career): { position: number; table: TableRow[] } {
  const coach = career.coach!;
  const live = coach.live!;
  const table = sortTable(live.rows[clubLeagueId(career, coach.clubId!)] ?? []);
  return { position: table.findIndex((r) => r.clubId === coach.clubId) + 1, table };
}

/** Vertrauen des Vorstands (0–100) nach Platz gegenüber der Erwartung. */
export function boardTrust(career: Career): number {
  const live = career.coach?.live;
  if (!live || !live.form.length) return 60;
  const { position } = livePosition(career);
  return Math.round(clamp(60 + (live.expected - position) * 8, 0, 100));
}

/** Bis zur Winterpause bzw. bis Saisonende simulieren. */
export function playCoachHalf(prev: Career): Career {
  const c = prev.coach;
  if (!c?.clubId || !['prep', 'winter', 'season'].includes(c.phase)) return prev;
  const career: Career = structuredClone(prev);
  const coach = career.coach!;
  const live = liveOf(career);
  if (coach.phase === 'prep') {
    playRounds(career, live, 1, true);
    coach.phase = 'winter';
    const { position, table } = livePosition(career);
    coach.note = `Winterpause: Platz ${position} (Ziel: Platz ${live.expected}).`;
    // Krasser Fehlstart: Der Vorstand zieht schon im Winter die Reißleine.
    if (position >= live.expected + 7 && position > table.length * 0.65) {
      playRounds(career, live, 2, false);
      return finishCoachSeason(career, true);
    }
    live.targets = [...live.targets.slice(0, 2), ...transferTargets(career, coach.clubId!, 2)];
    career.updatedAt = Date.now();
    return career;
  }
  playRounds(career, live, 2, true);
  return finishCoachSeason(career, false);
}

export type WinterAction = 'camp' | 'speech' | 'youth';

export const WINTER_ACTIONS: Record<WinterAction, { icon: string; name: string; text: string }> = {
  camp: { icon: '🏕️', name: 'Trainingslager', text: 'Sicher: etwas mehr Teamstärke für die Rückrunde.' },
  speech: { icon: '🗣️', name: 'Kabinenpredigt', text: 'Riskant: zündet sie, gibt es einen großen Schub – sonst kippt die Stimmung.' },
  youth: { icon: '🌱', name: 'Jugend einbauen', text: 'Kaum Wirkung jetzt, aber der Verein wird nächste Saison stärker.' },
};

/** Eine Entscheidung pro Winterpause. */
export function winterAction(prev: Career, action: WinterAction): Career {
  const c = prev.coach;
  if (!c?.clubId || c.phase !== 'winter' || c.live?.winterDone) return prev;
  const career: Career = structuredClone(prev);
  const coach = career.coach!;
  const live = coach.live!;
  live.winterDone = true;
  if (action === 'camp') {
    live.boost += 0.8;
    coach.note = 'Trainingslager: Die Mannschaft wirkt fitter und eingespielter (+0,8 Stärke).';
  } else if (action === 'speech') {
    if (chance(0.6)) {
      live.boost += 1.6;
      coach.note = 'Kabinenpredigt: Volltreffer! Die Spieler brennen auf die Rückrunde (+1,6 Stärke).';
    } else {
      live.boost -= 0.8;
      coach.note = 'Kabinenpredigt: Ging nach hinten los – Unruhe in der Kabine (−0,8 Stärke).';
    }
  } else {
    live.boost += 0.2;
    career.clubDrift[coach.clubId!] = (career.clubDrift[coach.clubId!] ?? 0) + 1;
    coach.note = 'Jugend eingebaut: Die Talente sammeln Erfahrung – nächste Saison ist der Verein stärker.';
  }
  career.updatedAt = Date.now();
  return career;
}

function finishCoachSeason(career: Career, sackedInWinter: boolean): Career {
  const coach = career.coach!;
  const live = coach.live!;
  const clubId = coach.clubId!;
  const leagueId = clubLeagueId(career, clubId);
  const league = getLeague(leagueId);
  const expected = live.expected;
  const slot = career.europeSlots[clubId];
  const strength = live.strength[clubId] + coachBoost(coach.rating) + live.boost;

  const tables: Record<string, TableRow[]> = {};
  for (const l of LEAGUES) tables[l.id] = sortTable(live.rows[l.id] ?? []);
  const table = tables[leagueId];
  const position = table.findIndex((r) => r.clubId === clubId) + 1;
  const points = table[position - 1].points;

  const trophies: string[] = [];
  if (!sackedInWinter) {
    if (position === 1) trophies.push(league.tier === 1 ? `Meister (${league.name})` : `Meister (${league.name}, Aufstieg)`);
    else if (league.up && position <= league.up.spots) trophies.push(`Aufstieg (${league.name})`);
    if (chance(expected <= 2 ? 0.25 : expected <= 6 ? 0.08 : 0.02)) trophies.push(league.cup);
    if (slot === 'Champions League' && chance(clamp((strength - 80) / 40, 0.01, 0.25))) trophies.push('Champions League');
    else if (slot && slot !== 'Champions League' && chance(clamp((strength - 72) / 40, 0.02, 0.2))) trophies.push(slot);
  }

  const relegated = !!league.down && position > table.length - league.down.spots;
  const expectedDown = !!league.down && expected > table.length - league.down.spots;
  const sacked = sackedInWinter || (relegated && !expectedDown) || (position >= expected + 6 && position > table.length * 0.6);

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
    tactic: live.tactic,
    signings: live.signings.map((t) => `${t.name} (${t.ovr})`),
  };
  coach.history.push(record);
  applyLeagueChanges(career, tables);
  // Ein Teil der Verstärkungen bleibt dem Verein erhalten.
  if (!sacked) career.clubDrift[clubId] = (career.clubDrift[clubId] ?? 0) + Math.max(0, live.boost) * 0.3;
  coach.live = null;
  coach.year += 1;
  coach.age += 1;
  closeYear(career); // Familie und Vermögen
  maybeFlirt(career);

  const name = getClub(clubId).name;
  if (coach.age >= COACH_MAX_AGE) {
    coach.phase = 'done';
    coach.note = `Mit ${coach.age} Jahren ist Schluss: Trainerkarriere beendet.`;
  } else if (sacked) {
    coach.clubId = null;
    coach.phase = 'choose';
    coach.offers = coachOffers(career, coach.rating - 3, [clubId]);
    coach.note = sackedInWinter
      ? `Entlassen in der Winterpause! ${name} zieht nach dem Fehlstart die Reißleine.`
      : `Entlassen! Platz ${position} statt Platz ${expected} war ${name} zu wenig.`;
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

/** Ganze Saison am Stück (für Tests und Schnelldurchlauf). */
export function playCoachSeason(prev: Career): Career {
  let c = playCoachHalf(prev);
  if (c.coach?.phase === 'winter') c = playCoachHalf(c);
  return c;
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
