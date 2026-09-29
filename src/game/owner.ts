import { getClub } from '../data/leagues';
import { addNews } from './news';
import { clubStrength, formatMoney, roundMoney, seasonLabel } from './player';
import { chance, clamp, pick } from './random';
import type { Career, DecisionResult, PendingDecision } from './types';

/** Gewinnchance eines Lottoscheins (einer pro Sommer). Unrealistisch hoch – sonst sieht es nie jemand. */
export const LOTTO_CHANCE = 0.05;
/** Maximale Zusatzstärke durch Investitionen. */
export const MAX_BOOST = 8;
/** Jährliche Einnahmen des eigenen Vereins (Sponsoren, Fanartikel mit deinem Gesicht). */
const YEARLY_INCOME = 15e6;

/** Kaufpreis eines Vereins – stärkere Vereine kosten exponentiell mehr. */
export function clubPrice(career: Career, clubId: string): number {
  return roundMoney(4e6 * Math.exp(0.12 * (clubStrength(career, clubId) - 60)));
}

export function ownsClub(career: Career, clubId: string): boolean {
  return career.owner?.clubId === clubId;
}

export function canBuyTicket(career: Career): boolean {
  return career.phase === 'window' && !career.decision && !career.lottoWon && career.lottoYear !== career.year;
}

const BLANKS = [
  'Nicht mal drei Richtige. Der Kioskbesitzer lacht dich aus.',
  'Eine Zahl stimmt. Immerhin.',
  'Niete. Du hättest die Rückennummern der Mitspieler tippen sollen.',
  'Leider nichts. Dafür hat der Kiosk jetzt ein Selfie mit dir an der Wand.',
];

/** Lottoschein kaufen: meistens eine Niete, selten der Jackpot – dann darfst du entscheiden, was du damit machst. */
export function buyLottoTicket(prev: Career): Career {
  if (!canBuyTicket(prev)) return prev;
  const career: Career = structuredClone(prev);
  career.lottoYear = career.year;
  if (!chance(LOTTO_CHANCE)) {
    career.decisionResult = { title: '🎟️ Niete', text: pick(BLANKS), tone: 'neutral' };
    return career;
  }
  career.lottoWon = true;
  career.decision = lottoDecision(career);
  career.decisionResult = null;
  return career;
}

export function lottoDecision(career: Career): PendingDecision {
  const clubId = career.player.contract.clubId;
  const price = clubPrice(career, clubId);
  const jackpot = Math.max(150e6, roundMoney(price * 1.3));
  const club = getClub(clubId).name;
  return {
    id: 'lotto',
    title: `🎰 JACKPOT: ${formatMoney(jackpot)}!`,
    text: `Sechs Richtige plus Superzahl. Der Kioskbesitzer fällt in Ohnmacht. Was machst du mit ${formatMoney(jackpot)}?`,
    options: [
      { id: 'buy', label: `🏟️ ${club} kaufen (${formatMoney(price)})`, hint: 'Ab jetzt bist du Spieler UND Präsident – und stellst dich selbst auf' },
      { id: 'cars', label: '🏎️ 40 Sportwagen kaufen', hint: 'Völlig sinnlos. Genau deshalb.' },
      { id: 'donate', label: '❤️ Alles spenden', hint: 'Die ganze Liga liebt dich' },
    ],
    data: { jackpot: String(jackpot), price: String(price), clubId },
  };
}

export function resolveLotto(career: Career, option: string, d: PendingDecision): DecisionResult {
  const jackpot = Number(d.data?.jackpot ?? 150e6);
  const price = Number(d.data?.price ?? 0);
  const clubId = d.data?.clubId ?? career.player.contract.clubId;
  const p = career.player;
  const club = getClub(clubId).name;
  if (option === 'buy') {
    career.owner = { clubId, since: seasonLabel(career.year), budget: jackpot - price, boost: 0 };
    p.contract.role = 'Schlüsselspieler';
    p.contract.yearsLeft = Math.max(p.contract.yearsLeft, 1);
    p.morale = 3;
    addNews(career, 2, 'Verein', `Unglaublich: ${p.name} kauft ${club} – und ist jetzt sein eigener Chef!`);
    return {
      title: `${club} gehört dir!`,
      text: `Du unterschreibst den Kaufvertrag in der Kabine. Der Trainer schaut plötzlich sehr freundlich. ${formatMoney(jackpot - price)} bleiben dir im Präsidentenbüro.`,
      tone: 'good',
    };
  }
  if (option === 'cars') {
    p.morale = clamp((p.morale ?? 0) - 1, -3, 3);
    addNews(career, 2, 'Du', `${p.name} kauft 40 Sportwagen – der Trainingsparkplatz ist voll, Mitspieler parken im Nachbardorf.`);
    return { title: 'Parkplatzproblem', text: 'Du kannst nur einen gleichzeitig fahren. Der Trainer findet es mäßig lustig.', tone: 'neutral' };
  }
  p.morale = 3;
  addNews(career, 2, 'Du', `${p.name} spendet den kompletten Lottogewinn – ganz Fußball-Deutschland verneigt sich.`);
  return { title: 'Held der Herzen', text: 'Selbst gegnerische Fans applaudieren dir beim Aufwärmen.', tone: 'good' };
}

export type Investment = 'stars' | 'stadium' | 'coach' | 'statue';

export const INVESTMENTS: Record<Investment, { label: string; cost: number; hint: string }> = {
  stars: { label: '⭐ Stars einkaufen', cost: 40e6, hint: '+2 Vereinsstärke (ab nächster Saison)' },
  coach: { label: '🧑‍💼 Trainer feuern', cost: 10e6, hint: 'Der Neue weiß, wer ihn bezahlt: Trainervertrauen maximal' },
  stadium: { label: '✨ Stadion vergolden', cost: 25e6, hint: 'Bringt sportlich nichts. Glänzt aber.' },
  statue: { label: '🗿 Statue von dir aufstellen', cost: 5e6, hint: 'Vor dem Haupteingang, 12 Meter hoch' },
};

export function canInvest(career: Career, kind: Investment): boolean {
  const o = career.owner;
  if (!o || career.phase !== 'window' || career.decision) return false;
  if (o.budget < INVESTMENTS[kind].cost) return false;
  return kind !== 'stars' || o.boost < MAX_BOOST;
}

/** Präsidentenbüro: Geld aus dem Lottogewinn ausgeben. */
export function invest(prev: Career, kind: Investment): Career {
  if (!canInvest(prev, kind)) return prev;
  const career: Career = structuredClone(prev);
  const o = career.owner!;
  const p = career.player;
  const club = getClub(o.clubId).name;
  o.budget -= INVESTMENTS[kind].cost;
  let result: DecisionResult;
  if (kind === 'stars') {
    o.boost = Math.min(MAX_BOOST, o.boost + 2);
    addNews(career, 2, 'Transfer', `Präsident ${p.name} öffnet den Geldkoffer: ${club} rüstet massiv auf.`);
    result = { title: 'Neue Stars', text: `${club} wird stärker (+${o.boost} durch deine Investitionen).`, tone: 'good' };
  } else if (kind === 'coach') {
    p.morale = 3;
    addNews(career, 2, 'Verein', `${club} trennt sich vom Trainer. Der Nachfolger nennt ${p.name} „unverzichtbar“. Zufall?`);
    result = { title: 'Neuer Trainer', text: 'Seine erste Amtshandlung: dich zum Kapitän machen wollen.', tone: 'good' };
  } else if (kind === 'stadium') {
    addNews(career, 2, 'Verein', `Das Stadion von ${club} ist jetzt aus Gold. Gegner beschweren sich über Blendung.`);
    result = { title: 'Goldenes Stadion', text: 'Es glänzt so sehr, dass Flugzeuge umgeleitet werden.', tone: 'neutral' };
  } else {
    addNews(career, 2, 'Du', `Vor dem Stadion von ${club} steht jetzt eine 12-Meter-Statue von ${p.name}. Er hat sie selbst bezahlt.`);
    result = { title: 'Denkmal', text: 'Tauben lieben sie.', tone: 'neutral' };
  }
  career.decisionResult = result;
  career.updatedAt = Date.now();
  return career;
}

/** Saisonende als Eigentümer: Einnahmen, Vertrag läuft nie aus, Schlagzeile. */
export function ownerSeasonEnd(career: Career, notes: string[]): void {
  const o = career.owner;
  if (!o) return;
  o.budget += YEARLY_INCOME;
  const p = career.player;
  if (p.contract.clubId === o.clubId) {
    // Der Präsident verlängert seinen eigenen Vertrag. Jedes Jahr. Einstimmig.
    p.contract.yearsLeft = Math.max(p.contract.yearsLeft, 2);
    notes.push(`Als Präsident verlängerst du deinen Vertrag bei ${getClub(o.clubId).name} selbst – einstimmig.`);
  }
  notes.push(`Einnahmen deines Vereins: +${formatMoney(YEARLY_INCOME)} (Budget: ${formatMoney(o.budget)}).`);
}
