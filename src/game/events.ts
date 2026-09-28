import { getClub, getLeague } from '../data/leagues';
import { performanceIndex, relativePerformance, type DevStats } from './development';
import { clubLeagueId, currentClubId, seasonLabel } from './player';
import { chance, clamp, pick, randInt, shuffle } from './random';
import type { Career, GameEvent } from './types';

interface EventContext {
  career: Career;
  half: 1 | 2;
  stats: DevStats & { apps: number };
  share: number;
  perf: number;
  /** Leistung im Vergleich zur Erwartung für die eigene Stärke. */
  relPerf: number;
  /** Verletzungswochen in dieser Halbserie. */
  injuryWeeks: number;
  teamStrength: number;
  /** Erste Halbserie nach einem Wechsel in ein anderes Land. */
  newCountry: boolean;
}

interface EventDef {
  when: (c: EventContext) => boolean;
  chance: number;
  apply: (c: EventContext) => Omit<GameEvent, 'half'>;
}

const MAX_EVENTS_PER_HALF = 2;

function changeOvr(c: EventContext, delta: number) {
  const p = c.career.player;
  p.ovr = clamp(p.ovr + delta, 40, 99);
  p.potential = Math.max(p.potential, p.ovr);
}

function changePotential(c: EventContext, delta: number) {
  const p = c.career.player;
  p.potential = clamp(p.potential + delta, p.ovr, 99);
}

function changeMorale(c: EventContext, delta: number) {
  const p = c.career.player;
  p.morale = clamp((p.morale ?? 0) + delta, -3, 3);
}

// Ereignisse mit Bedingung und Wahrscheinlichkeit pro Halbserie.
const EVENTS: EventDef[] = [
  // Verletzungen der Halbserie (keine Zufallswahl, sondern Folge einer langen Pause)
  {
    when: (c) => c.injuryWeeks >= 12,
    chance: 1,
    apply: (c) => {
      const age = c.career.player.age;
      const heavy = c.injuryWeeks >= 20;
      const ovr = heavy ? -(age >= 28 ? randInt(2, 3) : randInt(1, 2)) : -1;
      changeOvr(c, ovr);
      if (heavy) changePotential(c, -1);
      return {
        title: heavy ? 'Kreuzbandriss' : 'Muskelbündelriss',
        text: heavy
          ? `Monatelange Reha – ${age >= 28 ? 'in diesem Alter' : 'auch als junger Spieler'} hinterlässt das Spuren.`
          : 'Eine lange Pause kostet Rhythmus und Spritzigkeit.',
        tone: 'bad',
        effect: `${ovr} Gesamtwertung${heavy ? ', −1 Potenzial' : ''}`,
      };
    },
  },
  {
    when: (c) => c.career.player.age <= 22 && c.share >= 0.4 && c.relPerf >= 0.8,
    chance: 0.35,
    apply: (c) => {
      changeOvr(c, 2);
      changePotential(c, 2);
      return {
        title: 'Durchbruch!',
        text: 'Die Medien feiern dich als eines der größten Talente – du spielst mit enormem Selbstvertrauen.',
        tone: 'good',
        effect: '+2 Gesamtwertung, +2 Potenzial',
      };
    },
  },
  {
    when: (c) => c.career.player.age <= 21 && c.teamStrength >= c.career.player.ovr + 3,
    chance: 0.12,
    apply: (c) => {
      changePotential(c, 2);
      return {
        title: 'Mentor in der Kabine',
        text: 'Ein erfahrener Führungsspieler nimmt dich unter seine Fittiche.',
        tone: 'good',
        effect: '+2 Potenzial',
      };
    },
  },
  {
    when: (c) => c.career.player.age >= 23 && c.career.player.age <= 26 && c.relPerf >= 0.8,
    chance: 0.08,
    apply: (c) => {
      changePotential(c, 3);
      changeOvr(c, 1);
      return {
        title: 'Spätzünder',
        text: 'Es hat Klick gemacht – du spielst plötzlich auf einem ganz neuen Level.',
        tone: 'good',
        effect: '+1 Gesamtwertung, +3 Potenzial',
      };
    },
  },
  {
    when: (c) => c.career.player.age <= 30,
    chance: 0.07,
    apply: (c) => {
      changeOvr(c, 1);
      return {
        title: 'Extraschichten',
        text: 'Du arbeitest nach dem Training mit einem Individualtrainer an deinen Schwächen.',
        tone: 'good',
        effect: '+1 Gesamtwertung',
      };
    },
  },
  {
    when: (c) => c.career.player.age >= 30,
    chance: 0.06,
    apply: (c) => {
      changeOvr(c, 1);
      return {
        title: 'Der Körper macht mit',
        text: 'Neuer Ernährungsplan und Sportwissenschaft – du fühlst dich fitter als mit 25.',
        tone: 'good',
        effect: '+1 Gesamtwertung',
      };
    },
  },
  {
    when: (c) => c.share < 0.6,
    chance: 0.1,
    apply: (c) => {
      changeMorale(c, 2);
      return {
        title: 'Trainer baut auf dich',
        text: 'Im Training überzeugst du – der Trainer kündigt mehr Einsatzzeit an.',
        tone: 'good',
        effect: 'mehr Einsatzchancen',
      };
    },
  },
  {
    when: (c) => c.perf >= 1,
    chance: 0.2,
    apply: (c) => {
      changeMorale(c, 1);
      return {
        title: 'Publikumsliebling',
        text: 'Die Fans feiern dich – dein Trikot ist das meistverkaufte im Fanshop.',
        tone: 'good',
        effect: 'mehr Vertrauen des Trainers',
      };
    },
  },
  {
    when: (c) => c.relPerf <= -1 && c.stats.apps >= 5,
    chance: 0.4,
    apply: (c) => {
      changeOvr(c, -1);
      changeMorale(c, -1);
      return {
        title: 'Formkrise',
        text: 'Nichts will gelingen – Fans und Presse werden ungeduldig.',
        tone: 'bad',
        effect: '−1 Gesamtwertung, weniger Vertrauen',
      };
    },
  },
  {
    when: () => true,
    chance: 0.05,
    apply: (c) => {
      changeMorale(c, -2);
      return {
        title: 'Zoff mit dem Trainer',
        text: 'Nach einer Auswechslung kommt es zum lautstarken Streit an der Seitenlinie.',
        tone: 'bad',
        effect: 'weniger Einsatzchancen',
      };
    },
  },
  {
    when: () => true,
    chance: 0.07,
    apply: (c) => {
      const good = chance(0.5);
      changeMorale(c, good ? 2 : -2);
      return {
        title: 'Trainerwechsel',
        text: good
          ? `${getClub(currentClubId(c.career.player)).name} hat einen neuen Trainer – und der ist Fan von dir.`
          : `${getClub(currentClubId(c.career.player)).name} hat einen neuen Trainer – er setzt auf andere Spieler.`,
        tone: good ? 'good' : 'bad',
        effect: good ? 'mehr Einsatzchancen' : 'weniger Einsatzchancen',
      };
    },
  },
  {
    when: (c) => c.newCountry,
    chance: 0.3,
    apply: (c) => {
      changeMorale(c, -1);
      return {
        title: 'Eingewöhnungsprobleme',
        text: 'Neue Sprache, neues Umfeld – du brauchst Zeit, um anzukommen.',
        tone: 'bad',
        effect: 'weniger Vertrauen des Trainers',
      };
    },
  },
  {
    when: () => true,
    chance: 0.04,
    apply: (c) => {
      changeOvr(c, -1);
      return {
        title: pick(['Ablenkung abseits des Platzes', 'Schlagzeilen statt Tore']),
        text: 'Die Boulevardpresse berichtet mehr über dein Privatleben als über deine Leistungen.',
        tone: 'bad',
        effect: '−1 Gesamtwertung',
      };
    },
  },
];

/**
 * Würfelt die Ereignisse einer Halbserie aus und wendet ihre Wirkung direkt auf den Spieler an.
 * Vorher klingt das Trainervertrauen der letzten Halbserie zur Hälfte ab.
 */
export function rollEvents(
  career: Career,
  half: 1 | 2,
  stats: DevStats & { apps: number },
  injuryWeeks: number,
  teamStrength: number,
): GameEvent[] {
  const p = career.player;
  p.morale = Math.trunc((p.morale ?? 0) / 2);

  const share = stats.possibleMinutes > 0 ? stats.minutes / stats.possibleMinutes : 0;
  const last = career.transfers?.[career.transfers.length - 1];
  const newCountry =
    half === 1 &&
    !!last &&
    last.window === 'Sommer' &&
    last.season === seasonLabel(career.year) &&
    getLeague(clubLeagueId(career, last.fromClubId)).country !== getLeague(clubLeagueId(career, last.toClubId)).country;

  const relPerf = relativePerformance(stats, p.position, p.ovr - teamStrength);
  const ctx: EventContext = {
    career, half, stats, share, perf: performanceIndex(stats), relPerf, injuryWeeks, teamStrength, newCountry,
  };
  const events: GameEvent[] = [];
  // Verletzungsfolgen zuerst, danach zufällige Ereignisse in zufälliger Reihenfolge.
  const [injury, ...rest] = EVENTS;
  for (const def of [injury, ...shuffle(rest)]) {
    if (events.length >= MAX_EVENTS_PER_HALF) break;
    if (def.when(ctx) && chance(def.chance)) events.push({ ...def.apply(ctx), half });
  }
  return events;
}

export function moraleLabel(morale: number | undefined): string {
  const m = morale ?? 0;
  if (m >= 2) return 'sehr hoch';
  if (m >= 1) return 'hoch';
  if (m <= -2) return 'sehr niedrig';
  if (m <= -1) return 'niedrig';
  return 'normal';
}
