import type { Career, Household } from './types';

// Haushalt: Jahr, Immobilien, Vereinsanteile und Jahresbericht. (Die Familie mit Kindern wurde entfernt –
// alte Spielstände behalten ihre Daten, sie werden nur nicht mehr angezeigt.)

export function emptyHousehold(): Household {
  return { year: 0, children: [], pending: [], properties: [], shares: [], totalIncome: 0, report: null, flirt: null, birth: null };
}

export function householdOf(career: Career): Household {
  if (!career.household) career.household = emptyHousehold();
  return career.household;
}
