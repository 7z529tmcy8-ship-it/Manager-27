import { getClub, getLeague } from '../data/leagues';
import { performanceIndex, relativePerformance, type DevStats } from './development';
import { clubLeagueId, currentClubId, seasonLabel } from './player';
import { chance, clamp, pick, randInt, shuffle } from './random';
import { hasTrait, type TraitId } from './traits';
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
    when: (c) => c.career.player.age <= 22 && c.career.player.ovr < 84 && c.share >= 0.4 && c.relPerf >= 0.8,
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

  const relPerf = relativePerformance(stats, p.position, p.ovr - teamStrength, teamStrength);
  const ctx: EventContext = {
    career, half, stats, share, perf: performanceIndex(stats), relPerf, injuryWeeks, teamStrength, newCountry,
  };
  const events: GameEvent[] = [];
  // Verletzungsfolgen zuerst, danach zufällige Ereignisse in zufälliger Reihenfolge.
  const [injury, ...rest] = EVENTS;
  // Wettskandal und Nebenprojekt sind Folgen früherer Entscheidungen und gehen vor.
  for (const def of SPECIAL_EVENTS) {
    if (events.length >= MAX_EVENTS_PER_HALF) break;
    if (def.when(ctx) && chance(def.chance)) events.push({ ...def.apply(ctx), half });
  }
  // Charakter-Ereignisse kommen zuerst an die Reihe – sie machen die Persönlichkeit spürbar.
  const traitEvents = shuffle(TRAIT_EVENTS.filter((d) => hasTrait(p, d.trait)));
  for (const def of [injury, ...traitEvents, ...shuffle(rest)]) {
    if (events.length >= MAX_EVENTS_PER_HALF) break;
    if (def.when(ctx) && chance(def.chance)) events.push({ ...def.apply(ctx), half });
  }
  // Anführer lassen sich nie ganz hängen.
  if (hasTrait(p, 'leader')) p.morale = Math.max(-1, p.morale ?? 0);
  return events;
}

const SIDE_NAMES = { rap: '🎤 Rapalbum', fashion: '👕 Modemarke', stream: '🎮 Streaming-Kanal' } as const;

const SPECIAL_EVENTS: EventDef[] = [
  {
    when: (c) => !!c.career.player.bettingSecret,
    chance: 0.3,
    apply: (c) => {
      const p = c.career.player;
      p.bettingSecret = false;
      p.carryBanMatches = (p.carryBanMatches ?? 0) + 25;
      changeOvr(c, -2);
      changeMorale(c, -3);
      p.captainOf = null;
      const fired = chance(0.5);
      if (fired) p.contract.yearsLeft = Math.min(p.contract.yearsLeft, 1);
      return {
        title: 'Wettskandal aufgeflogen!',
        text: `Ermittler finden die Chatverläufe. 25 Spiele Sperre${fired ? ' – und der Verein will dich im Sommer loswerden' : ''}.`,
        tone: 'bad',
        effect: '25 Spiele Sperre, −2 Gesamtwertung',
      };
    },
  },
  {
    when: (c) => !!c.career.player.sideProject,
    chance: 0.6,
    apply: (c) => {
      const sp = c.career.player.sideProject!;
      const bonus = hasTrait(c.career.player, 'showman') ? 0.1 : 0;
      if (chance(0.55 + bonus)) {
        sp.hits++;
        changeMorale(c, 1);
        const text = {
          rap: `Deine Single steigt auf Platz ${randInt(1, 5)} der Charts ein – das halbe Stadion rappt mit.`,
          fashion: 'Deine neue Kollektion ist in Minuten ausverkauft. Mitspieler tragen sie beim Warmmachen.',
          stream: `${randInt(80, 400)}.000 Zuschauer schauen live zu, wie du FC spielst. Neuer Rekord!`,
        }[sp.kind];
        return { title: `${SIDE_NAMES[sp.kind]}: Ein Hit!`, text, tone: 'good', effect: 'mehr Vertrauen, Kultstatus' };
      }
      sp.flops++;
      changeMorale(c, -1);
      const text = {
        rap: 'Die Kritiker zerreißen dein Album. Im Auswärtsstadion singen sie deine Zeilen – leider zum Spott.',
        fashion: 'Die Kollektion floppt. Ein Foto von dir in Glitzerhose geht als Meme um die Welt.',
        stream: 'Du streamst bis 4 Uhr morgens. Im Training am nächsten Tag schläfst du fast ein.',
      }[sp.kind];
      return { title: `${SIDE_NAMES[sp.kind]}: Flop`, text, tone: 'bad', effect: 'weniger Vertrauen' };
    },
  },
];

// Ereignisse, die nur Spielern mit einer bestimmten Eigenschaft passieren.
const TRAIT_EVENTS: (EventDef & { trait: TraitId })[] = [
  {
    trait: 'wildcard', when: () => true, chance: 0.18,
    apply: (c) => {
      changeMorale(c, -1);
      return {
        title: 'Feuerwerk im Badezimmer',
        text: 'Mit Freunden wird zu Hause Feuerwerk gezündet – die Feuerwehr rückt an. Am Wochenende triffst du trotzdem.',
        tone: 'bad', effect: 'weniger Vertrauen, aber Kultstatus',
      };
    },
  },
  {
    trait: 'wildcard', when: (c) => (c.stats.goals ?? 0) >= 3, chance: 0.25,
    apply: (c) => {
      changeMorale(c, 1);
      return {
        title: '„Warum immer ich?“',
        text: 'Nach deinem Tor ziehst du das Trikot hoch – die Botschaft darunter geht um die Welt.',
        tone: 'good', effect: 'mehr Vertrauen, weltweite Schlagzeilen',
      };
    },
  },
  {
    trait: 'wildcard', when: () => true, chance: 0.12,
    apply: () => ({
      title: 'Leibchen-Chaos',
      text: 'Du bekommst das Trainingsleibchen einfach nicht über den Kopf. Das Video wird millionenfach geklickt.',
      tone: 'good', effect: 'viraler Hit',
    }),
  },
  {
    trait: 'wildcard', when: () => true, chance: 0.08,
    apply: (c) => {
      changeMorale(c, 1);
      return {
        title: 'Spendabel',
        text: 'Spontan verteilst du in der Stadt Geld an Bedürftige – die Fans lieben dich dafür.',
        tone: 'good', effect: 'mehr Vertrauen',
      };
    },
  },
  {
    trait: 'hothead', when: () => true, chance: 0.15,
    apply: (c) => {
      changeMorale(c, -2);
      return {
        title: 'Ausraster im Training',
        text: 'Ein harter Zweikampf, ein Wort gibt das andere – der Trainer schickt dich vom Platz.',
        tone: 'bad', effect: 'deutlich weniger Einsatzchancen',
      };
    },
  },
  {
    trait: 'showman', when: (c) => c.stats.apps >= 5, chance: 0.2,
    apply: (c) => {
      changeMorale(c, 1);
      return {
        title: 'Tor des Monats',
        text: 'Fallrückzieher aus 16 Metern – das Stadion steht Kopf.',
        tone: 'good', effect: 'mehr Vertrauen',
      };
    },
  },
  {
    trait: 'party', when: () => true, chance: 0.2,
    apply: (c) => {
      changeOvr(c, -1);
      changeMorale(c, -1);
      return {
        title: 'Partykönig',
        text: 'Drei Nächte hintereinander im Club – im Training sieht man es dir an.',
        tone: 'bad', effect: '−1 Gesamtwertung, weniger Vertrauen',
      };
    },
  },
  {
    trait: 'diva', when: (c) => c.share < 0.45, chance: 0.6,
    apply: (c) => {
      changeMorale(c, -1);
      return {
        title: 'Schmollen auf der Bank',
        text: 'Du verweigerst das Aufwärmen und lässt über deinen Berater Wechselgedanken streuen.',
        tone: 'bad', effect: 'weniger Vertrauen',
      };
    },
  },
  {
    trait: 'diva', when: (c) => c.perf >= 0.7, chance: 0.2,
    apply: () => ({
      title: '„Ich bin der Beste der Welt“',
      text: 'Im Interview erklärst du dich zum besten Spieler des Planeten. Die Presse liebt es.',
      tone: 'good', effect: 'Schlagzeilen',
    }),
  },
  {
    trait: 'leader', when: (c) => c.stats.apps >= 5, chance: 0.15,
    apply: (c) => {
      changeMorale(c, 2);
      return {
        title: 'Kabinenansprache',
        text: 'Nach einer Niederlagenserie ergreifst du das Wort – danach läuft es wieder.',
        tone: 'good', effect: 'mehr Vertrauen',
      };
    },
  },
  {
    trait: 'professional', when: (c) => c.career.player.age >= 29, chance: 0.15,
    apply: (c) => {
      changeOvr(c, 1);
      return {
        title: 'Vorbildprofi',
        text: 'Ernährung, Schlaf, Extraschichten – dein Körper dankt es dir.',
        tone: 'good', effect: '+1 Gesamtwertung',
      };
    },
  },
];

export function moraleLabel(morale: number | undefined): string {
  const m = morale ?? 0;
  if (m >= 2) return 'sehr hoch';
  if (m >= 1) return 'hoch';
  if (m <= -2) return 'sehr niedrig';
  if (m <= -1) return 'niedrig';
  return 'normal';
}
