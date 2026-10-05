import { familyYear, householdOf, maybeFlirt } from './family';
import { investYear } from './invest';
import type { Career } from './types';

// Jahresabschluss für Familie und Vermögen. Wird nach jeder Spieler-Saison, jeder Trainer-Saison und
// im Ruhestand per Knopf („Ein Jahr vergeht“) aufgerufen. Verändert den übergebenen Spielstand direkt.

export function closeYear(career: Career): void {
  const h = householdOf(career);
  const kids = familyYear(career);
  const inv = investYear(career);
  // Netto: Einnahmen minus Erziehungskosten (kann auch negativ sein).
  const total = kids.income + inv.rent + inv.dividends - kids.costs;
  h.totalIncome += total;
  h.report = {
    year: h.year,
    kidIncome: kids.income,
    kidCosts: kids.costs,
    rent: inv.rent,
    dividends: inv.dividends,
    notes: [...kids.notes, ...inv.notes],
  };
}

/** Im Ruhestand ohne Trainerjob: ein Jahr vergeht (mit Chance auf eine Einladung). */
export function restYear(prev: Career): Career {
  if (prev.phase !== 'retired' || (prev.coach && prev.coach.phase !== 'done')) return prev;
  const career: Career = structuredClone(prev);
  const h = householdOf(career);
  if (h.retiredYear === undefined) h.retiredYear = h.year;
  closeYear(career);
  maybeFlirt(career);
  career.updatedAt = Date.now();
  return career;
}
