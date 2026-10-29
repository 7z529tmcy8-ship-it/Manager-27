import { getClub } from '../data/leagues';
import { postInbox } from './inbox';
import { cashOf, formatMoney } from './player';
import type { Career, SeasonRecord } from './types';

/**
 * Saisonende: ausgehandelte Klauseln wirken.
 * - Torprämie: pro Pflichtspieltor aufs Konto.
 * - Einsatzgarantie: Weniger als 45 % der möglichen Minuten (ohne Leihe/NLZ) → Vertrag aufgelöst, du bist ablösefrei.
 */
export function contractClausesSeasonEnd(career: Career, record: SeasonRecord): void {
  const p = career.player;
  const c = p.contract.clauses;
  if (!c) return;
  if (c.goalBonus && record.goals > 0 && !record.onLoan) {
    const bonus = c.goalBonus * record.goals;
    career.cash = cashOf(career) + bonus;
    record.notes.push(`Torprämie: ${record.goals} Tore × ${formatMoney(c.goalBonus)} = ${formatMoney(bonus)}.`);
  }
  const share = record.possibleMinutes ? record.minutes / record.possibleMinutes : 0;
  if (c.starterGuarantee && !p.loan && !p.nlz && !record.onLoan && share < 0.45 && p.contract.yearsLeft > 0) {
    p.contract.yearsLeft = 0;
    const text = `${getClub(p.contract.clubId).name} hat die Einsatzgarantie gebrochen (nur ${Math.round(share * 100)} % Spielzeit) – dein Vertrag ist aufgelöst, du bist ablösefrei.`;
    record.notes.push(text);
    postInbox(career, { kind: 'contract', season: record.season, title: 'Einsatzgarantie gebrochen', text, action: 'transfers' });
  }
}
