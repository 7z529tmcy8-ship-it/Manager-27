import { LEAGUES, getLeague } from '../data/leagues';
import type { Career } from './types';

export interface Achievement {
  id: string;
  icon: string;
  name: string;
  description: string;
  /** Aktueller Wert und Ziel (für den Fortschrittsbalken). */
  progress: (c: Career) => [number, number];
}

const CUPS = new Set(LEAGUES.map((l) => l.cup));
const trophies = (c: Career) => c.history.flatMap((s) => s.trophies);
const awards = (c: Career) => c.history.flatMap((s) => s.awards);
const sum = (c: Career, f: (s: Career['history'][number]) => number) => c.history.reduce((a, s) => a + f(s), 0);
const has = (b: boolean): [number, number] => [b ? 1 : 0, 1];
const count = (list: string[], test: (t: string) => boolean) => list.filter(test).length;

function peak(c: Career): number {
  return Math.max(c.player.ovr, ...c.history.map((s) => Math.max(s.ovrStart, s.ovrEnd)));
}

function longestClubSpell(c: Career): number {
  let best = 0;
  let run = 0;
  let last = '';
  for (const s of c.history) {
    if (s.onLoan) continue;
    run = s.clubId === last ? run + 1 : 1;
    last = s.clubId;
    best = Math.max(best, run);
  }
  return best;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_goal', icon: '⚽', name: 'Das erste Tor', description: 'Erziele dein erstes Pflichtspieltor.', progress: (c) => [Math.min(1, sum(c, (s) => s.goals)), 1] },
  { id: 'goals_100', icon: '💯', name: 'Hundert', description: '100 Pflichtspieltore.', progress: (c) => [sum(c, (s) => s.goals), 100] },
  { id: 'goals_300', icon: '🔥', name: 'Torfabrik', description: '300 Pflichtspieltore.', progress: (c) => [sum(c, (s) => s.goals), 300] },
  { id: 'league_goals_150', icon: '🥅', name: 'Ligaschreck', description: '150 Ligatore.', progress: (c) => [sum(c, (s) => s.byCompetition.find((b) => b.competition === 'Liga')?.goals ?? 0), 150] },
  { id: 'assists_100', icon: '🎯', name: 'Spielmacher', description: '100 Vorlagen.', progress: (c) => [sum(c, (s) => s.assists), 100] },
  { id: 'apps_500', icon: '🏃', name: 'Dauerbrenner', description: '500 Pflichtspiele.', progress: (c) => [sum(c, (s) => s.apps), 500] },
  { id: 'champion', icon: '🏆', name: 'Meister', description: 'Werde Meister einer Liga.', progress: (c) => has(trophies(c).some((t) => t.startsWith('Meister'))) },
  { id: 'cup', icon: '🥇', name: 'Pokalsieger', description: 'Gewinne einen nationalen Pokal.', progress: (c) => has(trophies(c).some((t) => CUPS.has(t))) },
  { id: 'ucl', icon: '⭐', name: 'Königsklasse', description: 'Gewinne die Champions League.', progress: (c) => has(trophies(c).includes('Champions League')) },
  {
    id: 'treble', icon: '👑', name: 'Triple', description: 'Meisterschaft, Pokal und Champions League in einer Saison.',
    progress: (c) => has(c.history.some((s) => s.trophies.some((t) => t.startsWith('Meister')) && s.trophies.some((t) => CUPS.has(t)) && s.trophies.includes('Champions League'))),
  },
  { id: 'world_cup', icon: '🌍', name: 'Weltmeister', description: 'Gewinne die Weltmeisterschaft.', progress: (c) => has(trophies(c).some((t) => t.startsWith('Weltmeisterschaft'))) },
  {
    id: 'continental', icon: '🌎', name: 'Kontinentalmeister', description: 'Gewinne EM, Copa América, Gold Cup oder Asienmeisterschaft.',
    progress: (c) => has(trophies(c).some((t) => /^(Europameisterschaft|Copa América|Gold Cup|Asienmeisterschaft)/.test(t))),
  },
  { id: 'ballon', icon: '🌟', name: 'Ballon d’Or', description: 'Werde Weltfußballer.', progress: (c) => [Math.min(1, count(awards(c), (a) => a.startsWith('Ballon'))), 1] },
  { id: 'ballon3', icon: '💫', name: 'Seriensieger', description: 'Gewinne den Ballon d’Or dreimal.', progress: (c) => [count(awards(c), (a) => a.startsWith('Ballon')), 3] },
  { id: 'golden_boy', icon: '🧒', name: 'Golden Boy', description: 'Werde bester U21-Spieler.', progress: (c) => has(awards(c).includes('Golden Boy')) },
  { id: 'top_scorer', icon: '👟', name: 'Torschützenkönig', description: 'Werde Torschützenkönig einer Liga.', progress: (c) => has(awards(c).some((a) => a.startsWith('Torschützenkönig'))) },
  { id: 'promotion', icon: '📈', name: 'Aufsteiger', description: 'Steige als Meister einer unteren Liga auf.', progress: (c) => has(trophies(c).some((t) => t.includes('Aufstieg'))) },
  { id: 'captain', icon: '©️', name: 'Kapitän', description: 'Trage die Kapitänsbinde.', progress: (c) => has(!!c.player.captainOf || c.history.some((s) => (s.events ?? []).some((e) => e.title === 'Kapitän!'))) },
  { id: 'legend', icon: '🏛️', name: 'Vereinslegende', description: 'Werde Legende bei einem Verein.', progress: (c) => has((c.player.legendOf ?? []).length > 0) },
  { id: 'ovr90', icon: '💎', name: 'Weltklasse', description: 'Erreiche eine Gesamtwertung von 90.', progress: (c) => [Math.min(peak(c), 90), 90] },
  { id: 'ovr95', icon: '🐐', name: 'GOAT-Debatte', description: 'Erreiche eine Gesamtwertung von 95.', progress: (c) => [Math.min(peak(c), 95), 95] },
  { id: 'caps100', icon: '🎽', name: 'Nationalheld', description: '100 Länderspiele.', progress: (c) => [c.player.caps, 100] },
  { id: 'journeyman', icon: '🧳', name: 'Wandervogel', description: 'Spiele für 6 verschiedene Vereine.', progress: (c) => [new Set(c.history.map((s) => s.clubId)).size, 6] },
  { id: 'loyal', icon: '❤️', name: 'Ewige Treue', description: '12 Saisons am Stück beim selben Verein.', progress: (c) => [longestClubSpell(c), 12] },
  {
    id: 'bottom_up', icon: '🪜', name: 'Von ganz unten', description: 'Spiele in der Regionalliga und später in einer Top-Liga.',
    progress: (c) => {
      const firstRegional = c.history.findIndex((s) => getLeague(s.leagueId).tier === 4);
      return has(firstRegional >= 0 && c.history.slice(firstRegional).some((s) => getLeague(s.leagueId).tier === 1));
    },
  },
  { id: 'fee100', icon: '💰', name: 'Rekordtransfer', description: 'Wechsle für mindestens 100 Mio. €.', progress: (c) => [Math.min(100, Math.max(0, ...(c.transfers ?? []).map((t) => t.fee / 1e6))), 100] },
  { id: 'second_chance', icon: '💔', name: 'Zweite Chance', description: 'Bringe ein gescheitertes Talent auf eine Gesamtwertung von 85.', progress: (c) => [c.secondChance ? Math.min(peak(c), 85) : 0, 85] },
  { id: 'rival10', icon: '⚔️', name: 'Rivale bezwungen', description: 'Gewinne 10 Saison-Duelle gegen deinen Rivalen.', progress: (c) => [(c.rival?.history ?? []).filter((h) => h.duel === 'player').length, 10] },
];

export const isDone = (a: Achievement, c: Career) => {
  const [v, t] = a.progress(c);
  return v >= t;
};

/** Prüft neu erreichte Erfolge, merkt sie in der Karriere und gibt ihre Namen zurück. */
export function checkAchievements(career: Career, season: string): string[] {
  const unlocked = { ...(career.unlocked ?? {}) };
  const fresh: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (unlocked[a.id] || !isDone(a, career)) continue;
    unlocked[a.id] = season;
    fresh.push(`${a.icon} ${a.name}`);
  }
  career.unlocked = unlocked;
  return fresh;
}
