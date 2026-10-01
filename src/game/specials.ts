import type { Career, SeasonRecord, SpecialCard, SpecialType, StageSummary } from './types';

/** Sonderkarten nach starken Saisons – eigene Designs, angelehnt an Karten-Sammelspiele. */
export const SPECIALS: Record<SpecialType, { name: string; boost: number; hint: string }> = {
  tots: { name: 'Team der Saison', boost: 3, hint: 'Ø-Note ab 7,4 bei mindestens 25 Einsätzen' },
  potm: { name: 'Spieler des Monats', boost: 2, hint: 'Eine Etappe mit Ø-Note ab 8,0 (mind. 3 Spiele)' },
  record: { name: 'Rekordjäger', boost: 2, hint: '30 Tore oder mehr in einer Saison' },
  champion: { name: 'Titelheld', boost: 2, hint: 'Champions League gewonnen' },
};

/** Welche Sonderkarten hat sich der Spieler in dieser Saison verdient? */
export function specialsFor(record: SeasonRecord, stages: StageSummary[]): SpecialType[] {
  const out: SpecialType[] = [];
  if ((record.avgRating ?? 0) >= 7.4 && record.apps >= 25) out.push('tots');
  if (stages.some((s) => s.apps >= 3 && (s.avgRating ?? 0) >= 8)) out.push('potm');
  if (record.goals >= 30) out.push('record');
  if (record.trophies.includes('Champions League')) out.push('champion');
  return out;
}

export function makeSpecials(career: Career, record: SeasonRecord, types: SpecialType[]): SpecialCard[] {
  const p = career.player;
  return types.map((type) => ({
    type,
    season: record.season,
    name: p.name,
    position: p.position,
    nation: p.nation,
    clubId: record.clubId,
    ovr: Math.min(99, record.ovrEnd + SPECIALS[type].boost),
  }));
}

/** Die Sonderkarte, die gerade „aktiv“ ist (aus der letzten abgeschlossenen Saison, die beste zuerst). */
export function activeSpecial(career: Career): SpecialCard | null {
  const last = career.history[career.history.length - 1];
  if (!last) return null;
  const order: SpecialType[] = ['champion', 'tots', 'record', 'potm'];
  const mine = (career.specialCards ?? []).filter((c) => c.season === last.season);
  return mine.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))[0] ?? null;
}
