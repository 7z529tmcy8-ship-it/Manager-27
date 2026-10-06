import { getClub } from '../data/leagues';
import { banForSeasons, requestOffers } from './career';
import { currentClubId } from './player';
import { randInt } from './random';
import { hasTrait } from './traits';
import type { Career, DecisionResult } from './types';

// „Abseits des Platzes“: riskante Aktionen in der Winterpause und im Sommer. Jede bringt einen echten Vorteil,
// kann aber einen Skandal auslösen. Der Skandal-Zähler führt über Abmahnung und Suspendierung bis zur
// Vertragsauflösung – beim zweiten Rauswurf (oder einem Wiederholungstäter bei Wetten/Doping) ist die Karriere vorbei.

export type ViceId = 'party' | 'rant' | 'skip' | 'bet' | 'doping' | 'drugs';

export interface Vice {
  id: ViceId;
  icon: string;
  name: string;
  reward: string;
  risk: string;
  /** Nur im Sommer möglich (Dopingtests in der Vorbereitung). */
  summerOnly?: boolean;
  /** Vor dem Ausführen nachfragen. */
  confirm?: string;
  /** Kostet so viele Coins aus dem Club. */
  price?: number;
}

/** Preis beim Dealer. */
export const DRUG_PRICE = 5_000;

export const VICES: Vice[] = [
  { id: 'party', icon: '🎉', name: 'Partynacht', reward: 'Mannschaft wächst zusammen: mehr Trainervertrauen', risk: 'Erwischt: Vertrauen sinkt, Skandal' },
  { id: 'rant', icon: '📱', name: 'Trainer öffentlich kritisieren', reward: 'Wechselgerüchte: sofort neue Angebote', risk: 'Vertrauen stürzt ab, großer Skandal' },
  { id: 'skip', icon: '🛋️', name: 'Training schwänzen', reward: 'Erholung: Verletzungen heilen schneller', risk: 'Erwischt: Vertrauen sinkt, Skandal' },
  {
    id: 'bet', icon: '🎲', name: 'Auf Spiele wetten', reward: '+2.000 bis 8.000 Coins für den Club',
    risk: '25 %: eine Saison gesperrt, Riesenskandal. Beim zweiten Mal lebenslang.',
    confirm: 'Sportwetten sind für Profis verboten. Wirklich wetten?',
  },
  {
    id: 'drugs', icon: '💊', name: 'Beim Dealer einkaufen', price: DRUG_PRICE,
    reward: 'Bester Laune: mehr Selbstvertrauen, Partystimmung',
    risk: '25 %: Ein Foto taucht auf – Skandal.',
    confirm: 'Drogen sind illegal und gefährlich. Wirklich kaufen?',
  },
  {
    id: 'doping', icon: '💉', name: 'Verbotene Mittel', reward: '+3 Gesamtwertung sofort',
    risk: '35 %: positiver Test, zwei Jahre Sperre. Ab 32 oder beim zweiten Mal: Karriereende.',
    summerOnly: true, confirm: 'Doping ist Betrug und kann deine Karriere beenden. Wirklich?',
  },
];

/** Skandal-Schwellen. */
export const SCANDAL_WARNING = 40;
export const SCANDAL_SUSPENSION = 70;
export const SCANDAL_FIRED = 100;
/** Der Skandal-Zähler sinkt in jeder Pause um diesen Wert. */
export const SCANDAL_COOLDOWN = 12;

const breakKey = (c: Career) => `${c.year}-${c.phase}`;

export function canDoVice(career: Career, id: ViceId): boolean {
  if (career.phase !== 'winter' && career.phase !== 'window') return false;
  if (career.viceBreak === breakKey(career)) return false;
  const v = VICES.find((x) => x.id === id);
  return !!v && !(v.summerOnly && career.phase !== 'window');
}

export const viceUsedThisBreak = (career: Career) => career.viceBreak === breakKey(career);

/** Nach jeder Pause kühlt der Skandal etwas ab. */
export function coolDownScandal(career: Career): void {
  if (career.scandal) career.scandal = Math.max(0, career.scandal - SCANDAL_COOLDOWN);
}

/** Karriere endgültig zerstört. */
function destroy(career: Career, reason: string): Career {
  career.phase = 'retired';
  career.destroyed = true;
  career.retiredReason = `💥 Karriere zerstört: ${reason}`;
  career.offers = [];
  career.updatedAt = Date.now();
  return career;
}

/** Skandal-Punkte addieren und Folgen anwenden. Gibt einen Zusatztext zurück. */
function addScandal(career: Career, points: number): string {
  const before = career.scandal ?? 0;
  const now = Math.min(SCANDAL_FIRED, before + points);
  career.scandal = now;
  const p = career.player;
  const club = getClub(p.contract.clubId).name;
  if (now >= SCANDAL_FIRED) {
    career.scandalStrikes = (career.scandalStrikes ?? 0) + 1;
    career.scandal = 50;
    p.contract.yearsLeft = 0;
    p.captainOf = null;
    p.morale = -3;
    career.offers = career.offers.filter((o) => o.clubId !== p.contract.clubId);
    if (career.phase === 'winter') p.carryBanMatches = (p.carryBanMatches ?? 0) + 17; // aussortiert bis Saisonende
    return ` ${club} löst deinen Vertrag auf – du bist raus!`;
  }
  if (now >= SCANDAL_SUSPENSION && before < SCANDAL_SUSPENSION) {
    p.carryBanMatches = (p.carryBanMatches ?? 0) + 8;
    return ` ${club} suspendiert dich für 8 Spiele.`;
  }
  if (now >= SCANDAL_WARNING && before < SCANDAL_WARNING) {
    p.morale = Math.max(-3, (p.morale ?? 0) - 1);
    return ` Abmahnung vom Verein – noch so ein Ding und es wird ernst.`;
  }
  return '';
}

/**
 * Führt eine Aktion aus. Gibt den neuen Spielstand und ggf. gewonnene Club-Coins zurück.
 * `roll` ist für Tests austauschbar (Zahl zwischen 0 und 1).
 */
export function doVice(prev: Career, id: ViceId, roll: () => number = Math.random): { career: Career; coins: number } {
  if (!canDoVice(prev, id)) return { career: prev, coins: 0 };
  let career: Career = structuredClone(prev);
  career.viceBreak = breakKey(career);
  const p = career.player;
  const club = getClub(currentClubId(p)).name;
  let coins = 0;
  let note: DecisionResult;

  switch (id) {
    case 'party': {
      const caughtP = hasTrait(p, 'party') ? 0.5 : 0.35;
      if (roll() < caughtP) {
        p.morale = Math.max(-3, (p.morale ?? 0) - 1.5);
        note = { title: '🎉 Erwischt!', text: `Fotos von dir um 4 Uhr morgens machen die Runde. Der Trainer ist sauer.${addScandal(career, 18)}`, tone: 'bad' };
      } else {
        p.morale = Math.min(3, (p.morale ?? 0) + 0.7);
        career.scandal = Math.min(SCANDAL_FIRED, (career.scandal ?? 0) + 3);
        note = { title: '🎉 Legendäre Nacht', text: 'Niemand hat etwas mitbekommen – und die Mannschaft ist danach enger zusammengerückt.', tone: 'good' };
      }
      break;
    }
    case 'rant': {
      p.morale = Math.max(-3, (p.morale ?? 0) - 2.5);
      const extra = addScandal(career, 28);
      if (career.phase !== 'retired') {
        career = requestOffers({ ...career, requestsLeft: Math.max(1, career.requestsLeft) }, 'transfer');
      }
      note = { title: '📱 Shitstorm', text: `Dein Post gegen den Trainer von ${club} geht viral. Andere Vereine horchen auf, dein Trainer nicht.${extra}`, tone: 'bad' };
      break;
    }
    case 'skip': {
      p.carryInjuryWeeks = 0;
      if (career.progress) career.progress.injuredFor = 0;
      if (roll() < 0.4) {
        p.morale = Math.max(-3, (p.morale ?? 0) - 1);
        note = { title: '🛋️ Aufgeflogen', text: `Der Co-Trainer hat dich beim Shoppen gesehen.${addScandal(career, 14)}`, tone: 'bad' };
      } else {
        note = { title: '🛋️ Ausgeruht', text: 'Ein paar Tage Couch haben gutgetan – du bist wieder fit.', tone: 'good' };
      }
      break;
    }
    case 'bet': {
      if (roll() < 0.25) {
        if (career.caughtBetting) {
          return { career: destroy(career, 'Zum zweiten Mal beim Wetten erwischt – lebenslange Sperre.'), coins: 0 };
        }
        career.caughtBetting = true;
        p.carryBanMatches = (p.carryBanMatches ?? 0) + 34;
        const extra = addScandal(career, 60);
        note = { title: '🎲 Wettskandal!', text: `Die Ermittler haben deine Wetten gefunden: eine Saison Sperre.${extra}`, tone: 'bad' };
      } else {
        coins = randInt(20, 80) * 100;
        career.scandal = Math.min(SCANDAL_FIRED, (career.scandal ?? 0) + 5);
        note = { title: '🎲 Gewonnen', text: `Die Wette ging auf: +${coins.toLocaleString('de-DE')} Coins. Noch hat niemand etwas gemerkt …`, tone: 'neutral' };
      }
      break;
    }
    case 'drugs': {
      coins = -DRUG_PRICE;
      p.morale = Math.min(3, (p.morale ?? 0) + 1);
      career.drugUses = (career.drugUses ?? 0) + 1;
      // Verborgen: Abhängigkeit – wird dem Spieler nie direkt gesagt.
      if (!career.player.hooked && roll() < 0.35 + 0.2 * (career.drugUses - 1)) career.player.hooked = true;
      if (roll() < 0.25) {
        p.morale = Math.max(-3, p.morale - 1.5);
        note = { title: '💊 Foto aufgetaucht', text: `Ein Bild von dir mit „verdächtigem Pulver“ geht rum. Dein Verein ist not amused.${addScandal(career, 16)}`, tone: 'bad' };
      } else {
        career.scandal = Math.min(SCANDAL_FIRED, (career.scandal ?? 0) + 4);
        note = { title: '💊 Gute Zeit', text: 'Die Nacht war der Wahnsinn. Du fühlst dich unbesiegbar – zumindest bis morgen.', tone: 'neutral' };
      }
      break;
    }
    case 'doping': {
      p.ovr = Math.min(99, p.ovr + 3);
      if (roll() < 0.35) {
        p.ovr -= 3;
        if (career.caughtDoping || p.age >= 32) {
          return { career: destroy(career, career.caughtDoping ? 'Wiederholungstäter beim Doping – lebenslange Sperre.' : `Positiver Dopingtest mit ${p.age} – nach zwei Jahren Sperre ist für dich Schluss.`), coins: 0 };
        }
        career.caughtDoping = true;
        career.scandal = 50;
        const banned = banForSeasons(career, 2, 'Positiver Dopingtest in der Saisonvorbereitung: zwei Jahre Sperre.');
        banned.viceNote = { title: '💉 Positiver Test!', text: 'Zwei Jahre gesperrt. Dein Ruf ist ruiniert, und der Körper hat gelitten.', tone: 'bad' };
        return { career: banned, coins: 0 };
      }
      career.scandal = Math.min(SCANDAL_FIRED, (career.scandal ?? 0) + 8);
      note = { title: '💉 Nicht erwischt', text: '+3 Gesamtwertung. Der Test war negativ – diesmal.', tone: 'neutral' };
      break;
    }
  }

  // Zweiter Rauswurf: kein Verein will dich mehr.
  if ((career.scandalStrikes ?? 0) >= 2) {
    return { career: destroy(career, 'Zum zweiten Mal wegen Skandalen gefeuert – kein Verein will dich mehr.'), coins };
  }
  career.viceNote = note;
  career.updatedAt = Date.now();
  return { career, coins };
}
