import { getClub } from '../data/leagues';
import { POSITIONS } from '../data/players';
import { generateOffers } from './offers';
import { resolveLotto } from './owner';
import { resolvePress } from './press';
import { postInbox } from './inbox';
import { createProfile, currentClubId, seasonLabel } from './player';
import { chance, clamp, pick, randInt } from './random';
import { hasTrait, type TraitId } from './traits';
import type { Career, DecisionResult, PendingDecision, Position, SideProject } from './types';

// Vorgeschlagene Positionswechsel (jung → offensiver, älter → defensiver)
const POSITION_SWITCH: Partial<Record<Position, (age: number) => Position>> = {
  ST: (age) => (age >= 30 ? 'ZOM' : 'FL'),
  FL: (age) => (age >= 30 ? 'AV' : 'ST'),
  ZOM: () => 'ZM',
  ZM: (age) => (age >= 29 ? 'ZDM' : 'ZOM'),
  ZDM: () => 'IV',
  AV: (age) => (age <= 24 ? 'FL' : 'IV'),
  IV: () => 'ZDM',
};

const positionLabel = (p: Position) => POSITIONS.find((x) => x.id === p)?.label ?? p;

interface DecisionContext {
  career: Career;
  /** 'winter' = nach der Hinrunde, 'summer' = nach der Saison */
  moment: 'winter' | 'summer';
  share: number;
}

interface DecisionDef {
  id: string;
  weight: number;
  when: (c: DecisionContext) => boolean;
  build: (c: DecisionContext) => PendingDecision;
  resolve: (career: Career, option: string, d: PendingDecision) => DecisionResult;
}

const morale = (career: Career, delta: number) => {
  career.player.morale = clamp((career.player.morale ?? 0) + delta, -3, 3);
};

export const SIDE_PROJECTS: Record<SideProject['kind'], { icon: string; name: string }> = {
  rap: { icon: '🎤', name: 'Rapalbum' },
  fashion: { icon: '👕', name: 'Modemarke' },
  stream: { icon: '🎮', name: 'Streaming-Kanal' },
};

const DECISIONS: DecisionDef[] = [
  {
    id: 'betting',
    weight: 0.6,
    when: (c) => c.career.player.age >= 19 && !c.career.player.bettingSecret,
    build: () => ({
      id: 'betting',
      title: 'Ein zwielichtiges Angebot',
      text: 'Nach dem Training wartet ein Mann im Parkhaus: „50.000 in bar – für eine Gelbe Karte vor der 30. Minute. Niemand wird es je erfahren.“',
      options: [
        { id: 'refuse', label: 'Ablehnen und gehen', hint: 'Saubere Weste' },
        { id: 'report', label: 'Dem Verband melden', hint: 'Mutig – die Presse wird dich feiern' },
        { id: 'accept', label: 'Das Geld nehmen', hint: 'Fliegt es auf, droht eine lange Sperre' },
      ],
    }),
    resolve: (career, option) => {
      if (option === 'report') {
        morale(career, 2);
        return { title: 'Wettmafia gestoppt!', text: 'Dank deiner Aussage fliegt ein ganzer Wettring auf. Du bist der Held der Liga.', tone: 'good' };
      }
      if (option === 'accept') {
        career.player.bettingSecret = true;
        return { title: 'Das Geld ist im Rucksack', text: 'Die Gelbe Karte kommt in der 23. Minute. Niemand hat etwas gemerkt … noch nicht.', tone: 'bad' };
      }
      morale(career, 1);
      return { title: 'Integrität', text: 'Du drehst dich um und gehst. Gutes Gefühl.', tone: 'good' };
    },
  },
  {
    id: 'sideproject',
    weight: 0.8,
    when: (c) => c.career.player.age >= 18 && !c.career.player.sideProject,
    build: () => ({
      id: 'sideproject',
      title: 'Ein Leben neben dem Fußball?',
      text: 'Ein Musiklabel, eine Modefirma und eine Streaming-Plattform klopfen gleichzeitig an. Alle wollen mit dir etwas Eigenes starten.',
      options: [
        { id: 'rap', label: '🎤 Rapalbum aufnehmen', hint: 'Hit oder Blamage – dazwischen gibt es nichts' },
        { id: 'fashion', label: '👕 Eigene Modemarke', hint: 'Stil-Ikone werden' },
        { id: 'stream', label: '🎮 Streaming-Kanal', hint: 'Nächte vor der Kamera' },
        { id: 'no', label: 'Nur Fußball', hint: 'Voller Fokus' },
      ],
    }),
    resolve: (career, option) => {
      if (option === 'no') return { title: 'Voller Fokus', text: 'Du konzentrierst dich ganz auf den Fußball.', tone: 'neutral' };
      const kind = option as SideProject['kind'];
      career.player.sideProject = { kind, since: seasonLabel(career.year), hits: 0, flops: 0 };
      const sp = SIDE_PROJECTS[kind];
      return {
        title: `${sp.icon} ${sp.name} gestartet`,
        text: 'Ab jetzt führst du ein Doppelleben. Die Entwicklung auf dem Platz leidet etwas – dafür wirst du berühmt. Oder berüchtigt.',
        tone: 'neutral',
      };
    },
  },
  {
    id: 'celebration',
    weight: 0.5,
    when: (c) => ['ST', 'FL', 'ZOM', 'ZM'].includes(c.career.player.position) && c.share >= 0.3,
    build: () => ({
      id: 'celebration',
      title: 'Der große Torjubel',
      text: 'Derby, 89. Minute, du triffst zum Sieg. 80.000 Menschen schauen nur auf dich. Wie jubelst du?',
      options: [
        { id: 'shirt', label: 'Trikot hoch – Botschaft zeigen', hint: 'Kult bei den Fans – oder Gelb und Ärger' },
        { id: 'pose', label: 'Regungslos posieren', hint: 'Cool. Sehr cool.' },
        { id: 'team', label: 'Ab zur Bank, mit allen feiern', hint: 'Teamplayer' },
      ],
    }),
    resolve: (career, option) => {
      if (option === 'shirt') {
        if (chance(0.5)) {
          morale(career, 2);
          return { title: 'Ikonischer Jubel', text: 'Das Foto geht um die Welt – die Fans drucken es auf Schals.', tone: 'good' };
        }
        morale(career, -1);
        return { title: 'Gelbe Karte', text: 'Der Schiedsrichter findet es weniger lustig – und dein Trainer auch nicht.', tone: 'bad' };
      }
      if (option === 'pose') {
        morale(career, 1);
        return { title: 'Why so serious?', text: 'Du stehst da wie eine Statue. Das Netz liebt es.', tone: 'good' };
      }
      morale(career, 1);
      return { title: 'Teamgeist', text: 'Die ganze Bank feiert mit dir – der Trainer ist begeistert.', tone: 'good' };
    },
  },
  {
    id: 'position',
    weight: 2,
    when: (c) => !!POSITION_SWITCH[c.career.player.position] && (c.career.player.age >= 28 || c.share < 0.5),
    build: (c) => {
      const p = c.career.player;
      const to = POSITION_SWITCH[p.position]!(p.age);
      return {
        id: 'position',
        title: 'Positionswechsel?',
        text: `Der Trainer möchte dich künftig als ${positionLabel(to)} statt als ${positionLabel(p.position)} einsetzen. „Dort sehe ich mehr Spielzeit für dich.“`,
        options: [
          { id: 'yes', label: `Ja, als ${positionLabel(to)} spielen`, hint: 'Mehr Vertrauen – aber kurze Umstellungsphase' },
          { id: 'no', label: 'Nein, ich bleibe auf meiner Position', hint: 'Der Trainer ist enttäuscht' },
        ],
        data: { to },
      };
    },
    resolve: (career, option, d) => {
      const p = career.player;
      if (option === 'yes') {
        const to = d.data!.to as Position;
        p.position = to;
        p.profile = createProfile(to);
        p.ovr = Math.max(40, p.ovr - 1);
        morale(career, 2);
        return { title: `Neue Position: ${positionLabel(to)}`, text: 'Der Trainer ist begeistert. Die Umstellung kostet anfangs etwas Qualität (−1).', tone: 'good' };
      }
      morale(career, -1);
      return { title: 'Position behalten', text: 'Der Trainer akzeptiert es – begeistert ist er nicht.', tone: 'neutral' };
    },
  },
  {
    id: 'derby',
    weight: 2,
    when: (c) => c.share >= 0.3,
    build: () => ({
      id: 'derby',
      title: 'Angeschlagen vor dem Topspiel',
      text: 'Dein Oberschenkel zwickt. Am Wochenende steht das wichtigste Spiel der Saison an. Die Ärzte raten zur Pause.',
      options: [
        { id: 'play', label: 'Auf die Zähne beißen und spielen', hint: 'Held werden – oder länger ausfallen' },
        { id: 'rest', label: 'Auf die Ärzte hören', hint: 'Sicher, aber du verpasst den großen Moment' },
      ],
    }),
    resolve: (career, option) => {
      if (option === 'play') {
        if (chance(0.55)) {
          morale(career, 2);
          return { title: 'Held des Topspiels!', text: 'Du spielst trotz Schmerzen stark – die Fans feiern dich.', tone: 'good' };
        }
        const weeks = randInt(4, 8);
        career.player.carryInjuryWeeks = (career.player.carryInjuryWeeks ?? 0) + weeks;
        return { title: 'Muskel gerissen', text: `Nach 20 Minuten ist Schluss – du fällst ${weeks} Wochen aus.`, tone: 'bad' };
      }
      return { title: 'Vernünftige Entscheidung', text: 'Du bist zum nächsten Spiel wieder fit.', tone: 'neutral' };
    },
  },
  {
    id: 'training',
    weight: 1.5,
    when: (c) => c.moment === 'summer' && c.career.player.age <= 33,
    build: () => ({
      id: 'training',
      title: 'Sommerpause: Trainingslager oder Urlaub?',
      text: 'Ein Athletiktrainer bietet dir ein privates Trainingslager in der Sommerpause an.',
      options: [
        { id: 'camp', label: 'Durchziehen', hint: 'Chance auf +1 – aber Überlastungsgefahr' },
        { id: 'rest', label: 'Urlaub machen', hint: 'Erholt in die Saison starten' },
      ],
    }),
    resolve: (career, option) => {
      if (option === 'camp') {
        if (chance(0.65)) {
          career.player.ovr = Math.min(99, career.player.ovr + 1);
          career.player.potential = Math.max(career.player.potential, career.player.ovr);
          return { title: 'Topfit in die Saison', text: 'Die Extraschichten zahlen sich aus: +1 Gesamtwertung.', tone: 'good' };
        }
        const weeks = randInt(2, 3);
        career.player.carryInjuryWeeks = (career.player.carryInjuryWeeks ?? 0) + weeks;
        return { title: 'Überlastet', text: `Zu viel des Guten – du verpasst die ersten ${weeks} Wochen der Saison.`, tone: 'bad' };
      }
      morale(career, 1);
      return { title: 'Erholt zurück', text: 'Du startest frisch und motiviert in die Vorbereitung.', tone: 'good' };
    },
  },
  {
    id: 'interview',
    weight: 1.5,
    when: (c) => !c.career.player.loan && c.career.player.contract.yearsLeft > 0,
    build: (c) => ({
      id: 'interview',
      title: 'Journalisten fragen nach Wechselgerüchten',
      text: `„Bleiben Sie bei ${getClub(c.career.player.contract.clubId).name}?“ Die Kameras laufen.`,
      options: [
        { id: 'loyal', label: 'Klares Bekenntnis zum Verein', hint: 'Mehr Vertrauen beim Trainer' },
        { id: 'open', label: '„Man weiß nie im Fußball …“', hint: 'Lockt zusätzliche Angebote an' },
        { id: 'away', label: 'Offen einen Wechsel fordern', hint: 'Viele Angebote – aber Ärger im Verein' },
      ],
    }),
    resolve: (career, option) => {
      if (option === 'loyal') {
        morale(career, 2);
        return { title: 'Bekenntnis zum Verein', text: 'Fans und Trainer freuen sich über deine Worte.', tone: 'good' };
      }
      const mode = option === 'away' ? 'transfer' : 'normal';
      const winter = career.phase === 'winter';
      const last = career.history[career.history.length - 1];
      const basis = last ?? { clubId: currentClubId(career.player), onLoan: false, minutes: 0, possibleMinutes: 0, avgRating: null };
      const known = new Set(career.offers.map((o) => o.clubId));
      const fresh = generateOffers(career, basis, mode, winter).filter((o) => o.type !== 'Verlängerung' && !known.has(o.clubId));
      career.offers = [...career.offers, ...fresh];
      if (option === 'away') {
        morale(career, -2);
        return { title: 'Wechselwunsch geäußert', text: `Die Berater-Telefone klingeln (${fresh.length} neue Angebote) – im Verein ist die Stimmung aber im Keller.`, tone: 'bad' };
      }
      return { title: 'Gerüchteküche brodelt', text: `${fresh.length} Vereine melden sich zusätzlich.`, tone: 'neutral' };
    },
  },
  {
    id: 'penalty',
    weight: 1,
    when: (c) => ['ST', 'FL', 'ZOM'].includes(c.career.player.position) && c.career.player.penaltyTakerOf !== currentClubId(c.career.player) && c.share >= 0.4,
    build: () => ({
      id: 'penalty',
      title: 'Elfmeterschütze werden?',
      text: 'Der etatmäßige Schütze hat zweimal verschossen. Der Trainer fragt, wer Verantwortung übernimmt.',
      options: [
        { id: 'yes', label: 'Ich schieße!', hint: 'Mehr Tore – ein Fehlschuss kostet Vertrauen' },
        { id: 'no', label: 'Sollen andere machen', hint: 'Kein Risiko' },
      ],
    }),
    resolve: (career, option) => {
      if (option === 'yes') {
        career.player.penaltyTakerOf = currentClubId(career.player);
        if (chance(0.2)) {
          morale(career, -1);
          return { title: 'Neuer Elfmeterschütze – mit Fehlstart', text: 'Den ersten verschießt du. Du bleibst trotzdem Schütze.', tone: 'neutral' };
        }
        return { title: 'Neuer Elfmeterschütze', text: 'Ab sofort trittst du an – das bringt zusätzliche Tore.', tone: 'good' };
      }
      return { title: 'Kein Elfmeterschütze', text: 'Ein Mitspieler übernimmt.', tone: 'neutral' };
    },
  },
  {
    id: 'party',
    weight: 1,
    when: (c) => c.career.player.age <= 26,
    build: () => ({
      id: 'party',
      title: 'Mannschaftsabend',
      text: 'Nach dem Sieg zieht die Mannschaft um die Häuser. Am übernächsten Tag ist Training.',
      options: [
        { id: 'go', label: 'Mitfeiern', hint: 'Gut für den Teamgeist – wenn nichts schiefgeht' },
        { id: 'home', label: 'Früh nach Hause', hint: 'Kein Risiko' },
      ],
    }),
    resolve: (career, option) => {
      if (option === 'go') {
        if (chance(0.3)) {
          morale(career, -2);
          career.player.ovr = Math.max(40, career.player.ovr - 1);
          return { title: 'Fotos in der Zeitung', text: 'Die Party landet in den Schlagzeilen. Der Trainer ist sauer (−1).', tone: 'bad' };
        }
        morale(career, 1);
        return { title: 'Teamgeist gestärkt', text: 'Ein legendärer Abend – die Mannschaft wächst zusammen.', tone: 'good' };
      }
      return { title: 'Profi-Einstellung', text: 'Du gehst früh schlafen. Langweilig, aber vernünftig.', tone: 'neutral' };
    },
  },
  {
    id: 'mentor',
    weight: 1.5,
    when: (c) => c.career.player.age >= 29,
    build: () => ({
      id: 'mentor',
      title: 'Ein Talent als Schützling',
      text: 'Der Verein bittet dich, ein 17-jähriges Talent unter deine Fittiche zu nehmen.',
      options: [
        { id: 'yes', label: 'Gerne – ich übernehme Verantwortung', hint: 'Stärkt deine Führungsrolle (Kapitän!)' },
        { id: 'no', label: 'Ich konzentriere mich auf mich', hint: 'Kein Effekt' },
      ],
    }),
    resolve: (career, option) => {
      if (option === 'yes') {
        career.player.leadership = (career.player.leadership ?? 0) + 1;
        morale(career, 1);
        return { title: 'Mentor', text: 'Du wirst immer mehr zum Führungsspieler in der Kabine.', tone: 'good' };
      }
      return { title: 'Fokus auf dich', text: 'Ein anderer Routinier übernimmt die Aufgabe.', tone: 'neutral' };
    },
  },
];

// Bestimmte Charaktere geraten öfter in bestimmte Situationen.
const TRAIT_WEIGHT: Partial<Record<string, Partial<Record<TraitId, number>>>> = {
  party: { party: 4, wildcard: 2 },
  interview: { diva: 3, showman: 1.5 },
  derby: { showman: 1.5, clutch: 1.5, hothead: 1.5 },
  celebration: { wildcard: 3, showman: 3 },
  betting: { party: 2, wildcard: 2, diva: 1.5, professional: 0.3 },
  sideproject: { showman: 3, wildcard: 2, party: 2, diva: 2, professional: 0.3 },
  mentor: { leader: 3, professional: 2 },
};

function weightFor(def: DecisionDef, career: Career): number {
  const boosts = TRAIT_WEIGHT[def.id] ?? {};
  return (career.player.traits ?? []).reduce((w, t) => w * (boosts[t] ?? 1), def.weight);
}

/** Würfelt aus, ob nach einer Halbserie eine Entscheidung ansteht (höchstens eine). */
export function maybeDecision(career: Career, moment: 'winter' | 'summer', share: number, probability = 0.55): PendingDecision | null {
  // Unberechenbare Typen erleben mehr.
  const p = hasTrait(career.player, 'wildcard') ? Math.max(probability, 0.75) : probability;
  if (!chance(p)) return null;
  const ctx: DecisionContext = { career, moment, share };
  const options = DECISIONS.filter((d) => d.when(ctx));
  if (!options.length) return null;
  const weights = options.map((d) => weightFor(d, career));
  const total = weights.reduce((a, w) => a + w, 0);
  let r = Math.random() * total;
  const def = options.find((_, i) => (r -= weights[i]) <= 0) ?? pick(options);
  return def.build(ctx);
}

export function resolveDecision(prev: Career, optionId: string): Career {
  const career: Career = structuredClone(prev);
  const d = career.decision;
  if (!d) return prev;
  if (d.id === 'press') career.decisionResult = resolvePress(career, optionId, d);
  else if (d.id === 'lotto') career.decisionResult = resolveLotto(career, optionId, d);
  else {
    const def = DECISIONS.find((x) => x.id === d.id);
    career.decisionResult = def ? def.resolve(career, optionId, d) : null;
  }
  career.decision = null;
  if (career.decisionResult) {
    const kind = d.id === 'press' ? 'press' : d.id === 'lotto' ? 'lotto' : 'decision';
    postInbox(career, { kind, title: `${d.title}: ${career.decisionResult.title}`, text: career.decisionResult.text });
  }
  career.updatedAt = Date.now();
  return career;
}
