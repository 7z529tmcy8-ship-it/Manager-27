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

// ---------- Event „Jungle Crash“ (Start des Roblox-Spiels der Entwickler) ----------
export const JUNGLE_START = new Date(2026, 10, 4, 0, 0, 0);
export const JUNGLE_END = new Date(2026, 10, 11, 23, 59, 59);
export const jungleLive = (now = new Date()) => now >= JUNGLE_START && now <= JUNGLE_END;
export interface JungleState { bananas: number; claimed: number }
export const jungleOf = (club: Pick<ClubState, 'jungle'>): JungleState => club.jungle ?? { bananas: 0, claimed: 0 };

/**
 * Event-Punkte gutschreiben – nur solange ein Event läuft. Dieselben Aktionen (Duell-Siege, Drops,
 * Höher/Tiefer, Draft, Karriere) bringen Zeit-Splitter (Zeitreise) bzw. Bananen (Jungle Crash).
 */
export function addShards<T extends Pick<ClubState, 'aera' | 'jungle'>>(club: T, n: number, now = new Date()): T {
  if (n <= 0) return club;
  let out = club;
  if (eraLive(now)) { const e = eraOf(out); out = { ...out, aera: { ...e, shards: e.shards + n } }; }
  if (jungleLive(now)) { const j = jungleOf(out); out = { ...out, jungle: { ...j, bananas: j.bananas + n } }; }
  return out;
}
