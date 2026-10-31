import { CLUBS, getClub, getLeague } from '../data/leagues';
import type { RealPlayerTemplate } from '../data/players';
import { createCareer, restartFirstSeason } from './career';
import { postInbox } from './inbox';
import { clubLeagueId, currentClubId, roleFor, wageFor } from './player';
import type { Career, SeasonRecord } from './types';

// ---------- Startszenarien („Live Start“) ----------
// Ein echter Spieler startet in einer besonderen Lage – mit einem Ziel für die erste Saison.
// Geschafft: Nachricht, 25.000 Coins und ein Mega-Drop (gutgeschrieben über creditCareer).

export type ScenarioId = 'comeback' | 'loan' | 'relegation' | 'lastchance' | 'superstar' | 'hype';
export const SCENARIO_REWARD = { coins: 25_000, mega: 1 } as const;

export interface Scenario {
  id: ScenarioId;
  name: string;
  /** Kurz: was passiert beim Start. */
  start: string;
  /** Ziel der ersten Saison. */
  goal: string;
  eligible: (p: RealPlayerTemplate) => boolean;
  apply: (career: Career) => void;
  done: (r: SeasonRecord, career: Career) => boolean;
}

const leagueClubs = (career: Career, own: string) => {
  const lid = clubLeagueId(career, own);
  return CLUBS.filter((c) => c.id !== own && clubLeagueId(career, c.id) === lid);
};
/** Fester Wechsel zu einem anderen Verein (Vertrag, Rolle, Gehalt passend). */
function moveTo(career: Career, clubId: string, years = 2) {
  const p = career.player;
  const club = getClub(clubId);
  p.nlz = undefined;
  p.contract = { clubId, yearsLeft: years, wage: wageFor(p.ovr, club.strength), role: roleFor(p.ovr, club.strength, p.age) };
  career.homeClubId = clubId;
}
const scorer = (p: RealPlayerTemplate) => p.position !== 'TW';

export const SCENARIOS: Scenario[] = [
  {
    id: 'comeback', name: 'Comeback nach Kreuzbandriss',
    start: 'Die ersten 20 Wochen fällst du aus, Wertung −3.', goal: '15 Pflichtspiele',
    eligible: (p) => p.age >= 20 && p.ovr >= 72,
    apply: (c) => { c.player.carryInjuryWeeks = 20; c.player.ovr = Math.max(40, c.player.ovr - 3); },
    done: (r) => r.apps >= 15,
  },
  {
    id: 'loan', name: 'Leihspieler muss sich beweisen',
    start: 'Ein Jahr Leihe zu einem schwächeren Verein der Liga.', goal: '25 Einsätze',
    eligible: (p) => p.age <= 21,
    apply: (c) => {
      const p = c.player;
      const own = p.contract.clubId;
      const target = p.ovr - 4;
      const club = leagueClubs(c, own).filter((x) => x.strength < getClub(own).strength).sort((a, b) => Math.abs(a.strength - target) - Math.abs(b.strength - target))[0];
      if (!club) return;
      p.nlz = undefined;
      p.loan = { clubId: club.id, parentClubId: own, role: roleFor(p.ovr, club.strength, p.age) };
    },
    done: (r) => r.apps >= 25,
  },
  {
    id: 'relegation', name: 'Abstiegskampf',
    start: 'Wechsel zum schwächsten Verein deiner Liga.', goal: 'Nicht absteigen',
    eligible: (p) => p.age >= 20 && p.ovr >= 70,
    apply: (c) => {
      const weakest = leagueClubs(c, c.player.contract.clubId).sort((a, b) => a.strength - b.strength)[0];
      if (weakest) moveTo(c, weakest.id);
    },
    done: (r) => {
      const spots = getLeague(r.leagueId).down?.spots ?? 3;
      const size = r.table.length || 18;
      return r.leaguePosition > 0 && r.leaguePosition <= size - spots;
    },
  },
  {
    id: 'lastchance', name: 'Letzte Chance',
    start: 'Ab 32: nur noch 1 Jahr Vertrag, du bist Ergänzungsspieler.', goal: '8 Tore + Vorlagen',
    eligible: (p) => p.age >= 32 && scorer(p),
    apply: (c) => { c.player.contract.yearsLeft = 1; c.player.contract.role = 'Ergänzung'; },
    done: (r) => r.goals + r.assists >= 8,
  },
  {
    id: 'superstar', name: 'Der neue Superstar',
    start: 'Rekordwechsel zum stärksten Verein deiner Liga.', goal: 'Einen Titel holen',
    eligible: (p) => p.ovr >= 82 && p.age <= 30,
    apply: (c) => {
      const top = leagueClubs(c, c.player.contract.clubId).sort((a, b) => b.strength - a.strength)[0];
      if (top) moveTo(c, top.id, 5);
    },
    done: (r) => r.trophies.length > 0,
  },
  {
    id: 'hype', name: 'Wunderkind-Hype',
    start: 'Bis 19 – die Presse erwartet Großes.', goal: '10 Tore + Vorlagen',
    eligible: (p) => p.age <= 19 && scorer(p),
    apply: () => {},
    done: (r) => r.goals + r.assists >= 10,
  },
];
export const getScenario = (id: ScenarioId) => SCENARIOS.find((s) => s.id === id)!;

/** Karriere mit Szenario starten. */
export function createScenarioCareer(p: RealPlayerTemplate, id: ScenarioId): Career {
  const sc = getScenario(id);
  const career = createCareer({ ...p });
  sc.apply(career);
  career.scenario = { id };
  restartFirstSeason(career);
  postInbox(career, {
    kind: 'event',
    title: `Szenario: ${sc.name}`,
    text: `${sc.start} Dein Ziel in der ersten Saison: ${sc.goal}. Schaffst du es, gibt es ${SCENARIO_REWARD.coins.toLocaleString('de-DE')} Coins und einen Mega-Drop.`,
    action: 'career',
  });
  return career;
}

/** Am Ende der ersten Saison: Ziel geschafft? */
export function scenarioSeasonEnd(career: Career, record: SeasonRecord): void {
  const s = career.scenario;
  if (!s || s.result || career.history.length !== 1) return;
  const sc = getScenario(s.id);
  const won = sc.done(record, career);
  s.result = won ? 'won' : 'lost';
  const text = won
    ? `Ziel „${sc.goal}“ geschafft! Belohnung: ${SCENARIO_REWARD.coins.toLocaleString('de-DE')} Coins und ein Mega-Drop.`
    : `Ziel „${sc.goal}“ leider verfehlt. Die Karriere geht trotzdem weiter.`;
  record.notes.push(`Szenario „${sc.name}“: ${won ? 'geschafft' : 'verfehlt'}.`);
  postInbox(career, { kind: 'achievement', title: won ? 'Szenario geschafft' : 'Szenario verfehlt', text, action: 'career', season: record.season });
}

/** Zum Anzeigen: aktueller Verein des Spielers nach dem Szenario-Start. */
export const scenarioClub = (career: Career) => getClub(currentClubId(career.player)).name;
