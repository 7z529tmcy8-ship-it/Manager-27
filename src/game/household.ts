import { CLUBS, LEAGUES } from '../data/leagues';
import { familyYear, householdOf, maybeFlirt } from './family';
import { glamIncome } from './clinic';
import { investYear } from './invest';
import { clubLeagueId, clubStrength } from './player';
import { normal, poisson } from './random';
import { addResult, applyLeagueChanges, emptyRow, goalsExpected, roundRobin, sortTable } from './season';
import type { Career, TableRow } from './types';

// Jahresabschluss für Familie und Vermögen. Wird nach jeder Spieler-Saison, jeder Trainer-Saison und
// im Ruhestand per Knopf („Ein Jahr vergeht“) aufgerufen. Verändert den übergebenen Spielstand direkt.

export function closeYear(career: Career): void {
  const h = householdOf(career);
  const kids = familyYear(career);
  const inv = investYear(career);
  // Netto: Einnahmen minus Erziehungskosten (kann auch negativ sein).
  const sponsor = glamIncome(career);
  if (sponsor) inv.notes.push(`📸 Werbedeals dank Glamour: +${sponsor.toLocaleString('de-DE')} Coins.`);
  const total = kids.income + inv.rent + inv.dividends + sponsor - kids.costs;
  h.totalIncome += total;
  h.report = {
    year: h.year,
    kidIncome: kids.income,
    kidCosts: kids.costs,
    rent: inv.rent,
    dividends: inv.dividends,
    notes: kids.notes,
    investNotes: inv.notes,
  };
}

/** Im Ruhestand ohne Trainerjob: ein Jahr vergeht (mit Chance auf eine Einladung). */
export function restYear(prev: Career): Career {
  if (prev.phase !== 'retired' || (prev.coach && prev.coach.phase !== 'done')) return prev;
  const career: Career = structuredClone(prev);
  const h = householdOf(career);
  if (h.retiredYear === undefined) h.retiredYear = h.year;
  backgroundSeason(career);
  closeYear(career);
  if (career.player.hooked || career.player.gambler) career.drainPending = (career.drainPending ?? 0) + 1;
  maybeFlirt(career);
  career.updatedAt = Date.now();
  return career;
}

/** Im Ruhestand läuft der Fußball weiter: alle Ligen im Hintergrund durchspielen, mit Auf- und Abstieg. */
export function backgroundSeason(career: Career): void {
  const strength: Record<string, number> = {};
  for (const c of CLUBS) strength[c.id] = clubStrength(career, c.id) + normal(0, 1.2);
  const tables: Record<string, TableRow[]> = {};
  for (const l of LEAGUES) {
    const ids = CLUBS.filter((c) => clubLeagueId(career, c.id) === l.id).map((c) => c.id);
    const rows = new Map(ids.map((id) => [id, emptyRow(id)]));
    for (const round of roundRobin([...ids].sort())) {
      for (const [home, away] of round) {
        const gh = poisson(goalsExpected(strength[home], strength[away], true, l.goalsPerGame));
        const ga = poisson(goalsExpected(strength[away], strength[home], false, l.goalsPerGame));
        addResult(rows.get(home)!, gh, ga);
        addResult(rows.get(away)!, ga, gh);
      }
    }
    tables[l.id] = sortTable([...rows.values()]);
  }
  applyLeagueChanges(career, tables);
}
