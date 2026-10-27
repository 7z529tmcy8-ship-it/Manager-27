import { firstTeamOf, getClub, reserveClubOf, youthClubOf } from '../data/leagues';
import { postInbox } from './inbox';
import { addNews } from './news';
import { ownsClub } from './owner';
import { clubStrength, roleFor, wageFor } from './player';
import type { Career, NlzTeam, SeasonRecord } from './types';

// ---------- Nachwuchsleistungszentrum (NLZ) ----------
// Junge Spieler starten bei Vereinen mit NLZ in der U17 oder U19 und arbeiten sich hoch: U17 → U19 → Profis
// (oder erst in die zweite Mannschaft). Wer bei den Profis kaum spielt oder schwach ist, kann zurückgestuft werden.

/** Höchstalter (zu Saisonbeginn) je Mannschaft. */
export const NLZ_MAX_AGE: Record<NlzTeam, number> = { U17: 16, U19: 18 };

/** So weit unter der Profi-Stärke startet man im NLZ statt bei den Profis. */
const START_GAP = 7;
/** Ab hier ist man reif für die Profis – mit starker Saison schon etwas früher. */
const READY_GAP = 8;
const READY_GAP_STRONG = 11;

/** Startet ein neuer Spieler im NLZ? Dann in welcher Mannschaft. */
export function nlzStartTeam(age: number, ovr: number, clubId: string, parentStrength: number): NlzTeam | null {
  if (age > NLZ_MAX_AGE.U19 || ovr >= parentStrength - START_GAP) return null;
  const team: NlzTeam = age <= NLZ_MAX_AGE.U17 ? 'U17' : 'U19';
  const club = youthClubOf(clubId, team);
  if (!club) return null;
  // Ohne eigene U17 (Ausland) spielt man in der U19.
  return club.id.endsWith('-u17') ? 'U17' : 'U19';
}

/** Rolle in der Nachwuchsmannschaft. */
export function nlzRole(career: Career, team: NlzTeam) {
  const p = career.player;
  const club = youthClubOf(p.contract.clubId, team)!;
  return roleFor(p.ovr, clubStrength(career, club.id), p.age);
}

/** Entwicklungs-Optionen im NLZ: Training am Profi-Standort, aber Junioren-Spiele bringen weniger als Profi-Einsätze. */
export function nlzDevOptions(career: Career): { training?: number; growthScale?: number } {
  const training = trainingLevel(career);
  return training === undefined ? {} : { training, growthScale: 0.55 };
}

/** Trainingsniveau im NLZ: Man trainiert am Profi-Standort – etwas unter dem Niveau der Profis. */
export function trainingLevel(career: Career): number | undefined {
  const p = career.player;
  if (!p.nlz || p.loan) return undefined;
  return clubStrength(career, p.contract.clubId) - 3;
}

/** Für die Anzeige: Wo steht der Spieler im NLZ und ab wann ist er reif für die Profis? */
export function nlzStatus(career: Career): { team: NlzTeam; parent: string; readyAt: number; strongAt: number } | null {
  const p = career.player;
  if (!p.nlz || p.loan) return null;
  const pro = clubStrength(career, p.contract.clubId);
  return { team: p.nlz.team, parent: getClub(p.contract.clubId).name, readyAt: Math.round(pro - READY_GAP), strongAt: Math.round(pro - READY_GAP_STRONG) };
}

export type NlzMove = 'up-u19' | 'pros' | 'reserve' | 'down-u19' | 'down-reserve' | 'reserve-up';

/**
 * Saisonende (nach dem Geburtstag): Aufrücken, Hochziehen oder Zurückstufen.
 * Gibt den Wechsel zurück (oder null) und schreibt Postfach, Schlagzeile und Saisonnotiz.
 */
export function nlzSeasonEnd(career: Career, record: SeasonRecord): NlzMove | null {
  const p = career.player;
  if (p.loan || p.contract.yearsLeft <= 0 || ownsClub(career, p.contract.clubId)) return null;
  const share = record.possibleMinutes ? record.minutes / record.possibleMinutes : 0;
  const rating = record.avgRating ?? 6.5;
  const strong = rating >= 7 && share >= 0.5;
  const weak = share < 0.12 || (record.apps >= 6 && rating < 6.4 && share < 0.5);
  const parentId = p.contract.clubId;
  const parent = getClub(parentId);
  const pro = clubStrength(career, parentId);
  const ready = p.ovr >= pro - READY_GAP || (strong && p.ovr >= pro - READY_GAP_STRONG);
  const note = (move: NlzMove, title: string, text: string, headline: string) => {
    record.notes.push(text);
    postInbox(career, { kind: 'event', season: record.season, title, text, action: 'career' });
    addNews(career, 2, 'Verein', headline);
    return move;
  };

  if (p.nlz) {
    const team = p.nlz.team;
    const outgrown = p.age > NLZ_MAX_AGE[team];
    const u19 = youthClubOf(parentId, 'U19');
    const toPros = () => {
      p.nlz = undefined;
      p.contract.role = roleFor(p.ovr, pro, p.age);
      // Profivertrag: Das Gehalt steigt auf Profi-Niveau.
      p.contract.wage = Math.max(p.contract.wage, wageFor(p.ovr, pro));
      return note('pros', 'Hochgezogen zu den Profis!', `Der Cheftrainer von ${parent.name} holt dich zu den Profis – Rolle: ${p.contract.role}.`,
        `${parent.name} zieht Talent ${p.name} aus dem NLZ zu den Profis hoch.`);
    };
    if (ready) return toPros();
    if (team === 'U17' && u19 && u19.id.endsWith('-u19') && (outgrown || strong)) {
      p.nlz = { team: 'U19', role: nlzRole(career, 'U19') };
      return note('up-u19', 'Aufgerückt in die U19', outgrown
        ? `Du bist zu alt für die U17 und rückst in die U19 von ${parent.name} auf.`
        : `Starke Saison: ${parent.name} zieht dich ein Jahr früher in die U19 hoch.`,
      `${p.name} rückt bei ${parent.name} in die U19 auf.`);
    }
    if (outgrown) {
      const reserve = reserveClubOf(parentId);
      if (reserve) {
        p.nlz = undefined;
        p.contract = { ...p.contract, clubId: reserve.id, role: roleFor(p.ovr, clubStrength(career, reserve.id), p.age) };
        return note('reserve', 'Weiter in der zweiten Mannschaft', `Zu alt für die U19, noch nicht reif für die Profis: Du spielst jetzt für ${reserve.name}.`,
          `${p.name} wechselt aus der U19 in die ${reserve.name}.`);
      }
      return toPros();
    }
    p.nlz = { team, role: nlzRole(career, team) };
    return null;
  }

  // Zweite Mannschaft: Wer überzeugt, darf zurück zu den Profis.
  const first = firstTeamOf(parentId);
  if (first) {
    const firstStrength = clubStrength(career, first.id);
    if (p.ovr >= firstStrength - READY_GAP || (strong && p.ovr >= firstStrength - READY_GAP_STRONG)) {
      p.contract = { ...p.contract, clubId: first.id, role: roleFor(p.ovr, firstStrength, p.age) };
      return note('reserve-up', 'Zurück bei den Profis!', `Starke Saison in der ${parent.name}: ${first.name} holt dich zu den Profis hoch.`,
        `${first.name} holt ${p.name} aus der zweiten Mannschaft zu den Profis.`);
    }
    return null;
  }

  if (!weak) return null;
  // Profis: Junge Spieler mit kaum Einsätzen oder schwachen Noten werden zurückgestuft.
  const u19 = youthClubOf(parentId, 'U19');
  if (p.age <= NLZ_MAX_AGE.U19 && u19?.id.endsWith('-u19') && p.ovr < pro - 6) {
    p.nlz = { team: 'U19', role: nlzRole(career, 'U19') };
    return note('down-u19', 'Zurück in die U19', `Zu wenig Spielzeit und zu schwache Leistungen: ${parent.name} schickt dich zurück in die U19. Spiel dich dort wieder hoch!`,
      `Rückschlag für ${p.name}: ${parent.name} stuft das Talent in die U19 zurück.`);
  }
  const reserve = reserveClubOf(parentId);
  if (reserve && p.age <= 22 && share < 0.1 && p.ovr < pro - 10) {
    p.contract = { ...p.contract, clubId: reserve.id, role: roleFor(p.ovr, clubStrength(career, reserve.id), p.age) };
    return note('down-reserve', 'Versetzt in die zweite Mannschaft', `Bei den Profis kommst du nicht zum Zug – ${parent.name} schickt dich zur ${reserve.name}, um Spielpraxis zu sammeln.`,
      `${parent.name} versetzt ${p.name} in die zweite Mannschaft.`);
  }
  return null;
}
