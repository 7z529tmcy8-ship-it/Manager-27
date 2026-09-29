import { getClub } from '../data/leagues';
import { addNews } from './news';
import { clubLeagueId, currentClubId } from './player';
import { chance, clamp, pick } from './random';
import { sortTable } from './season';
import type { Career, DecisionResult, PendingDecision, StageSummary } from './types';

interface PressContext {
  career: Career;
  last: StageSummary | undefined;
  position: number;
  teams: number;
}

interface Effect {
  morale?: number;
  /** Änderung der Tagesform (wirkt auf die Aufstellung der nächsten Etappe). */
  form?: number;
  /** Spiele Sperre. */
  ban?: number;
  headline?: string;
}

interface PressAnswer {
  id: string;
  label: string;
  hint: string;
  /** Ergebnis; darf würfeln. */
  outcome: (c: PressContext) => { title: string; text: string; tone: DecisionResult['tone']; effect: Effect };
}

interface PressQuestion {
  id: string;
  weight: number;
  when: (c: PressContext) => boolean;
  question: (c: PressContext) => string;
  answers: PressAnswer[];
}

const name = (c: PressContext) => c.career.player.name;
const club = (c: PressContext) => getClub(currentClubId(c.career.player)).name;
const ATTACKERS = ['ST', 'FL', 'ZOM'];

const QUESTIONS: PressQuestion[] = [
  {
    id: 'drought',
    weight: 3,
    when: (c) => ATTACKERS.includes(c.career.player.position) && !!c.last && c.last.apps >= 2 && c.last.goals === 0,
    question: () => 'Sie haben seit Wochen nicht getroffen. Woran liegt das?',
    answers: [
      {
        id: 'goal',
        label: '„Das Tor ist zu klein. Ich habe nachgemessen.“',
        hint: 'Mutig',
        outcome: (c) => ({
          title: 'Zollstock-Gate',
          text: 'Der Platzwart misst tatsächlich nach. Das Tor ist korrekt. Du bist jetzt ein Meme.',
          tone: 'neutral',
          effect: { form: 0.2, headline: `${name(c)} misst Tore nach – „Zu klein!“` },
        }),
      },
      {
        id: 'work',
        label: '„Ich arbeite hart, die Tore kommen.“',
        hint: 'Langweilig, aber solide',
        outcome: () => ({ title: 'Profi-Antwort', text: 'Keiner schreibt darüber. Genau richtig.', tone: 'good', effect: { form: 0.25 } }),
      },
      {
        id: 'coach',
        label: '„Fragen Sie den Trainer, warum er mich so aufstellt.“',
        hint: 'Kabinen-Zündstoff',
        outcome: (c) => ({
          title: 'Trainer liest mit',
          text: 'Er antwortet in seiner eigenen Pressekonferenz. Mit einem sehr langen Blick.',
          tone: 'bad',
          effect: { morale: -2, headline: `Knall bei ${club(c)}: ${name(c)} kritisiert den Trainer!` },
        }),
      },
    ],
  },
  {
    id: 'hot',
    weight: 3,
    when: (c) => !!c.last && c.last.goals + c.last.assists >= 4,
    question: () => 'Sie sind in unglaublicher Form. Was ist Ihr Geheimnis?',
    answers: [
      {
        id: 'banana',
        label: '„14 Bananen vor jedem Spiel.“',
        hint: 'Die Obstindustrie hört zu',
        outcome: (c) => ({
          title: 'Bananen-Boom',
          text: 'Supermärkte in der ganzen Stadt sind ausverkauft. Ein Bananen-Sponsor meldet sich.',
          tone: 'good',
          effect: { form: 0.15, headline: `Bananen ausverkauft! Fans kopieren ${name(c)}s Ernährungsplan.` },
        }),
      },
      {
        id: 'best',
        label: '„Ich bin einfach besser als alle anderen.“',
        hint: 'Ego-Modus',
        outcome: (c) =>
          chance(0.5)
            ? { title: 'Selbstbewusst', text: 'Du legst am Wochenende direkt nach – die Presse feiert dich.', tone: 'good', effect: { form: 0.4, headline: `${name(c)}: „Ich bin besser als alle.“ Recht hat er.` } }
            : { title: 'Arroganz-Vorwurf', text: 'Die Mitspieler finden es weniger lustig.', tone: 'bad', effect: { morale: -1, headline: `Größenwahn? ${name(c)} hält sich für den Besten.` } },
      },
      {
        id: 'team',
        label: '„Die Mannschaft macht es mir leicht.“',
        hint: 'Teamplayer',
        outcome: () => ({ title: 'Kabine happy', text: 'Die Mitspieler bringen dir Kuchen mit.', tone: 'good', effect: { morale: 1 } }),
      },
    ],
  },
  {
    id: 'bench',
    weight: 3,
    when: (c) => !!c.last && c.last.apps <= 2,
    question: () => 'Sie sitzen fast nur auf der Bank. Sind Sie zufrieden?',
    answers: [
      {
        id: 'comfy',
        label: '„Die Bank ist sehr bequem. Kompliment an den Zeugwart.“',
        hint: 'Humor',
        outcome: (c) => ({
          title: 'Bank-Kritiker',
          text: 'Der Zeugwart ist gerührt. Der Trainer lacht – und stellt dich tatsächlich öfter auf.',
          tone: 'good',
          effect: { morale: 1, headline: `${name(c)} bewertet die Ersatzbank: „5 von 5 Sternen“.` },
        }),
      },
      {
        id: 'leave',
        label: '„Ich will weg!“',
        hint: 'Druck machen',
        outcome: (c) => ({
          title: 'Wechselwunsch',
          text: 'Die Berater aller Vereine haben es gehört. Der Trainer auch.',
          tone: 'bad',
          effect: { morale: -2, headline: `${name(c)} will weg von ${club(c)}!` },
        }),
      },
      {
        id: 'train',
        label: '„Ich zeige es im Training.“',
        hint: 'Brav',
        outcome: () => ({ title: 'Trainingsweltmeister', text: 'Du gibst im Training Vollgas.', tone: 'good', effect: { form: 0.35 } }),
      },
    ],
  },
  {
    id: 'top',
    weight: 2,
    when: (c) => c.position <= 2,
    question: (c) => `Platz ${c.position}. Wird das der Titel?`,
    answers: [
      {
        id: 'all',
        label: '„Wir holen alles. Auch den Eurovision Song Contest.“',
        hint: 'Größenwahn',
        outcome: (c) => ({
          title: 'Kampfansage',
          text: 'Die Konkurrenz hängt den Zeitungsartikel in die Kabine.',
          tone: 'neutral',
          effect: { form: 0.2, headline: `${name(c)} kündigt an: ${club(c)} gewinnt auch den ESC.` },
        }),
      },
      {
        id: 'step',
        label: '„Wir denken von Spiel zu Spiel.“',
        hint: 'Der Klassiker',
        outcome: () => ({ title: 'Floskel-Bingo', text: 'Ein Journalist gewinnt sein Floskel-Bingo. Sonst passiert nichts.', tone: 'neutral', effect: {} }),
      },
      {
        id: 'yes',
        label: '„Ja. Schreiben Sie das auf.“',
        hint: 'Cool',
        outcome: (c) => ({ title: 'Eiskalt', text: 'Die Fans drucken es auf T-Shirts.', tone: 'good', effect: { morale: 1, headline: `„Schreiben Sie das auf“: ${name(c)} verspricht den Titel.` } }),
      },
    ],
  },
  {
    id: 'bottom',
    weight: 2,
    when: (c) => c.position >= c.teams - 3,
    question: (c) => `Platz ${c.position}. Haben Sie Angst vor dem Abstieg?`,
    answers: [
      {
        id: 'fear',
        label: '„Angst habe ich nur vor Spinnen.“',
        hint: 'Ablenken',
        outcome: (c) => ({ title: 'Spinnen-Gate', text: 'Die Gegner legen dir eine Gummispinne in den Spind. Danke, Presse.', tone: 'neutral', effect: { headline: `${name(c)} gesteht: Spinnen-Phobie! Rivalen notieren mit.` } }),
      },
      {
        id: 'fight',
        label: '„Wir kämpfen bis zum letzten Spieltag.“',
        hint: 'Kampfgeist',
        outcome: () => ({ title: 'Kämpferherz', text: 'Die Kurve singt deinen Namen.', tone: 'good', effect: { form: 0.25, morale: 1 } }),
      },
      {
        id: 'blame',
        label: '„Wir sind nicht schlecht, die anderen sind zu gut.“',
        hint: 'Logik',
        outcome: () => ({ title: 'Mathematisch korrekt', text: 'Ein Statistiker bestätigt: Das stimmt. Hilft trotzdem nicht.', tone: 'neutral', effect: {} }),
      },
    ],
  },
  {
    id: 'rival',
    weight: 2,
    when: (c) => !!c.career.rival,
    question: (c) => `${c.career.rival!.name} hat gesagt, Sie seien überbewertet. Ihre Antwort?`,
    answers: [
      {
        id: 'who',
        label: '„Wer?“',
        hint: 'Brutal',
        outcome: (c) => ({ title: 'Eiskalt abserviert', text: 'Das Video hat 20 Millionen Aufrufe.', tone: 'good', effect: { morale: 1, headline: `„Wer?“ – ${name(c)} zerstört ${c.career.rival!.name} mit einem Wort.` } }),
      },
      {
        id: 'chess',
        label: '„Ich fordere ihn zum Schach heraus.“',
        hint: 'Kultiviert',
        outcome: (c) =>
          chance(0.5)
            ? { title: 'Schachmatt', text: 'Du gewinnst in 14 Zügen. Live im Fernsehen.', tone: 'good', effect: { form: 0.3, headline: `Schachmatt! ${name(c)} besiegt ${c.career.rival!.name} am Brett.` } }
            : { title: 'Matt in 3', text: 'Er ist Schach-Großmeister. Wusstest du nicht.', tone: 'bad', effect: { form: -0.2, headline: `Blamage: ${name(c)} verliert Schachduell gegen ${c.career.rival!.name}.` } },
      },
      {
        id: 'hair',
        label: '„Er soll erst mal seinen Friseur wechseln.“',
        hint: 'Unter der Gürtellinie',
        outcome: (c) => ({ title: 'Frisuren-Krieg', text: 'Sein Friseur gibt ein Interview. Es eskaliert.', tone: 'neutral', effect: { headline: `Frisuren-Krieg! ${name(c)} gegen ${c.career.rival!.name}.` } }),
      },
    ],
  },
  {
    id: 'owner',
    weight: 4,
    when: (c) => c.career.owner?.clubId === currentClubId(c.career.player),
    question: () => 'Herr Präsident – stellen Sie sich nur selbst auf, weil Sie der Chef sind?',
    answers: [
      { id: 'yes', label: '„Ja.“', hint: 'Ehrlich', outcome: (c) => ({ title: 'Ehrlichkeit', text: 'Stille im Raum. Dann Applaus.', tone: 'good', effect: { headline: `${name(c)} gibt zu: „Ich stelle mich auf, weil ich der Chef bin.“` } }) },
      { id: 'best', label: '„Nein, ich bin einfach der Beste.“', hint: 'Diplomatisch (nicht)', outcome: () => ({ title: 'Klare Ansage', text: 'Du legst am Wochenende direkt nach.', tone: 'good', effect: { form: 0.3 } }) },
      {
        id: 'fire',
        label: '„Sie sind entlassen.“',
        hint: 'Er ist Journalist …',
        outcome: (c) => ({ title: 'Machtmissbrauch?', text: 'Er arbeitet gar nicht für dich. Die Zeitung druckt die Szene trotzdem auf Seite 1.', tone: 'neutral', effect: { headline: `Präsident ${name(c)} will Journalisten entlassen, der gar nicht bei ihm angestellt ist.` } }),
      },
    ],
  },
  {
    id: 'ref',
    weight: 1.5,
    when: (c) => !!c.last && c.last.apps > 0,
    question: () => 'Was sagen Sie zum Schiedsrichter vom letzten Spiel?',
    answers: [
      {
        id: 'glasses',
        label: '„Ich spende ihm eine Brille.“',
        hint: 'Gefährlich',
        outcome: (c) =>
          chance(0.35)
            ? { title: 'Sperre!', text: 'Der Verband versteht keinen Spaß: ein Spiel Sperre. Die Brille wurde trotzdem geliefert.', tone: 'bad', effect: { ban: 1, headline: `${name(c)} schickt Schiri eine Brille – und wird gesperrt.` } }
            : { title: 'Brillen-Spende', text: 'Der Schiedsrichter bedankt sich höflich. Er sieht jetzt tatsächlich besser.', tone: 'neutral', effect: { headline: `${name(c)} spendet dem Schiri eine Brille.` } },
      },
      { id: 'none', label: '„Kein Kommentar.“', hint: 'Sicher', outcome: () => ({ title: 'Schweigen ist Gold', text: 'Nichts passiert.', tone: 'neutral', effect: {} }) },
      { id: 'great', label: '„Er war fantastisch.“ (zwinkern)', hint: 'Ironie', outcome: () => ({ title: 'Ironie verstanden?', text: 'Die Hälfte der Journalisten hat es nicht verstanden. Der Schiri schon.', tone: 'neutral', effect: { morale: -1 } }) },
    ],
  },
  {
    id: 'backwards',
    weight: 1,
    when: () => true,
    question: () => 'Können Sie eigentlich auch rückwärts spielen?',
    answers: [
      {
        id: 'only',
        label: '„Ab jetzt spiele ich nur noch rückwärts.“',
        hint: 'Kunst',
        outcome: (c) => ({ title: 'Rückwärtsgang', text: 'Du ziehst es tatsächlich im Training durch. Der Trainer hat Fragen.', tone: 'bad', effect: { form: -0.5, headline: `${name(c)} kündigt an, nur noch rückwärts zu spielen. Experten ratlos.` } }),
      },
      { id: 'sunday', label: '„Nur sonntags.“', hint: 'Mysteriös', outcome: () => ({ title: 'Sonntagsspieler', text: 'Seitdem wettet halb Europa auf deine Sonntagsspiele.', tone: 'neutral', effect: {} }) },
      { id: 'next', label: '„Nächste Frage.“', hint: 'Profi', outcome: () => ({ title: 'Nächste Frage', text: 'Die nächste Frage ist auch nicht besser.', tone: 'neutral', effect: {} }) },
    ],
  },
  {
    id: 'animal',
    weight: 1,
    when: () => true,
    question: () => 'Wenn Sie ein Tier wären – welches?',
    answers: [
      { id: 'cheetah', label: '„Ein Gepard.“', hint: 'Schnell', outcome: () => ({ title: 'Raubkatze', text: 'Die Fans basteln Gepard-Masken.', tone: 'good', effect: { morale: 1 } }) },
      { id: 'sloth', label: '„Ein Faultier. Energie sparen.“', hint: 'Ehrlich', outcome: (c) => ({ title: 'Faultier-Modus', text: 'Der Fitnesstrainer hat es gelesen.', tone: 'bad', effect: { form: -0.2, headline: `${name(c)} vergleicht sich mit einem Faultier. Fitnesstrainer: „Kein Kommentar.“` } }) },
      { id: 'tiger', label: '„Ein Tiger. Ich habe übrigens einen zu Hause.“', hint: 'Wait what', outcome: (c) => ({ title: 'Tiger-Alarm', text: 'Das Ordnungsamt klingelt am nächsten Morgen.', tone: 'neutral', effect: { headline: `Hat ${name(c)} wirklich einen Tiger zu Hause? Ordnungsamt ermittelt.` } }) },
    ],
  },
  {
    id: 'pineapple',
    weight: 1,
    when: () => true,
    question: () => 'Gehört Ananas auf Pizza?',
    answers: [
      { id: 'yes', label: '„Ja.“', hint: 'Die halbe Welt hasst dich', outcome: (c) => ({ title: 'Skandal', text: 'Italienische Fans pfeifen dich beim nächsten Europapokalspiel aus.', tone: 'bad', effect: { morale: -1, headline: `Eklat! ${name(c)}: „Ananas gehört auf Pizza.“` } }) },
      { id: 'no', label: '„Niemals.“', hint: 'Die andere Hälfte hasst dich', outcome: () => ({ title: 'Traditionalist', text: 'Ein Pizzabäcker schickt dir 30 Pizzen. Mit Ananas. Aus Protest.', tone: 'neutral', effect: {} }) },
      { id: 'dodge', label: '„Ich esse nur Bananen.“', hint: 'Diplomatisch', outcome: () => ({ title: 'Ausgewichen', text: 'Beide Lager sind unzufrieden. Perfekte Diplomatie.', tone: 'neutral', effect: { form: 0.1 } }) },
    ],
  },
];

function context(career: Career): PressContext {
  const prog = career.progress;
  const last = prog?.stageLog?.[prog.stageLog.length - 1];
  const clubId = currentClubId(career.player);
  const rows = prog?.rows[clubLeagueId(career, clubId)] ?? [];
  const table = sortTable(rows);
  const idx = table.findIndex((r) => r.clubId === clubId);
  return { career, last, position: idx >= 0 ? idx + 1 : Math.ceil(table.length / 2), teams: table.length };
}

/** Wählt eine passende Frage für die Pressekonferenz nach einer Etappe. */
export function pressConference(career: Career): PendingDecision | null {
  const ctx = context(career);
  const options = QUESTIONS.filter((q) => q.when(ctx));
  if (!options.length) return null;
  const total = options.reduce((a, q) => a + q.weight, 0);
  let r = Math.random() * total;
  const q = options.find((x) => (r -= x.weight) <= 0) ?? pick(options);
  return {
    id: 'press',
    title: '🎙️ Pressekonferenz',
    text: q.question(ctx),
    options: q.answers.map(({ id, label, hint }) => ({ id, label, hint })),
    data: { question: q.id },
  };
}

export function resolvePress(career: Career, option: string, d: PendingDecision): DecisionResult {
  const q = QUESTIONS.find((x) => x.id === d.data?.question);
  const a = q?.answers.find((x) => x.id === option);
  if (!q || !a) return { title: 'Nächste Frage', text: 'Die Pressekonferenz ist vorbei.', tone: 'neutral' };
  const out = a.outcome(context(career));
  const p = career.player;
  const e = out.effect;
  const parts: string[] = [];
  if (e.morale) {
    p.morale = clamp((p.morale ?? 0) + e.morale, -3, 3);
    parts.push(`Trainervertrauen ${e.morale > 0 ? '+' : ''}${e.morale}`);
  }
  if (e.form && career.progress) {
    career.progress.form = clamp(career.progress.form + e.form, 5, 8.5);
    parts.push(e.form > 0 ? 'Form ↑' : 'Form ↓');
  }
  if (e.ban && career.progress) {
    career.progress.injuredFor += e.ban;
    parts.push(`${e.ban} Spiel Sperre`);
  }
  if (e.headline) addNews(career, (career.progress?.stage ?? 0) <= 3 ? 1 : 2, 'Du', e.headline);
  career.pressCount = (career.pressCount ?? 0) + 1;
  return { title: out.title, text: parts.length ? `${out.text} (${parts.join(', ')})` : out.text, tone: out.tone };
}
