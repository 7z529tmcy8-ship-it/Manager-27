import type { ClubState } from './club';

// Ära-Event „Zeitreise“: Zeitraum und Zeit-Splitter. Eigene kleine Datei ohne Spiel-Importe,
// damit Duell, Drops, Draft, Höher/Tiefer und Karriere Splitter vergeben können, ohne Kreis-Importe.

export const ERA_START = new Date(2026, 10, 1, 0, 0, 0);
export const ERA_END = new Date(2026, 10, 8, 23, 59, 59);
export const eraLive = (now = new Date()) => now >= ERA_START && now <= ERA_END;

/** Splitter je Aktion. */
export const SHARDS = { duelWin: 4, drop: 2, hiloPoint: 3, draftWin: 3, careerSeason: 6 } as const;

export interface EraState { shards: number; claimed: number }
export const eraOf = (club: Pick<ClubState, 'aera'>): EraState => club.aera ?? { shards: 0, claimed: 0 };

/** Splitter gutschreiben – nur solange das Event läuft. */
export function addShards<T extends Pick<ClubState, 'aera'>>(club: T, n: number, now = new Date()): T {
  if (n <= 0 || !eraLive(now)) return club;
  const e = eraOf(club);
  return { ...club, aera: { ...e, shards: e.shards + n } };
}
