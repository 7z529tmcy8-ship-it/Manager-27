import { getClub } from '../data/leagues';
import { clamp, randInt } from './random';
import type { Career, PlayerState, Position, Role } from './types';

export const OUTFIELD_ATTRS = ['TEM', 'SCH', 'PAS', 'DRI', 'DEF', 'PHY'] as const;
export const KEEPER_ATTRS = ['HEC', 'HAN', 'ABS', 'REF', 'TEM', 'STE'] as const;

// Typische Abweichung jedes Attributs vom Gesamtwert je Position.
const PROFILE: Record<Position, number[]> = {
  TW: [1, -1, -8, 2, -35, 0],
  IV: [-10, -35, -15, -18, 2, 3],
  AV: [5, -25, -3, -2, -1, -3],
  ZDM: [-8, -12, 0, -4, 1, 3],
  ZM: [-4, -5, 3, 1, -12, -3],
  ZOM: [1, 0, 3, 4, -30, -10],
  FL: [7, -2, -2, 4, -40, -8],
  ST: [3, 4, -6, 1, -40, 1],
};

export function createProfile(position: Position): number[] {
  return PROFILE[position].map((v) => v + randInt(-3, 3));
}

export function attributeLabels(position: Position): readonly string[] {
  return position === 'TW' ? KEEPER_ATTRS : OUTFIELD_ATTRS;
}

/** Attribute ergeben sich aus Gesamtwert, Profil und Alter (Tempo sinkt, Übersicht steigt). */
export function attributes(p: PlayerState): number[] {
  const paceIdx = p.position === 'TW' ? 4 : 0;
  const passIdx = 2;
  return p.profile.map((offset, i) => {
    let v = p.ovr + offset;
    if (i === paceIdx) v -= Math.max(0, p.age - 28) * 1.5;
    if (i === passIdx) v += clamp(p.age - 24, 0, 6) * 0.5;
    return Math.round(clamp(v, 20, 99));
  });
}

/** Marktwert in € (die Vertragslaufzeit wirkt sich nur auf gebotene Ablösen aus, nicht auf den Wert). */
export function marketValue(ovr: number, age: number, potential: number): number {
  const base = 0.5e6 * Math.exp(0.183 * (ovr - 60));
  let ageFactor: number;
  if (age <= 21) ageFactor = 1.4;
  else if (age <= 24) ageFactor = 1.25;
  else if (age <= 27) ageFactor = 1.0;
  else if (age <= 29) ageFactor = 0.8;
  else if (age <= 31) ageFactor = 0.55;
  else if (age <= 33) ageFactor = 0.3;
  else ageFactor = 0.15;
  const potFactor = age <= 24 ? 1 + Math.max(0, potential - ovr) * 0.04 : 1;
  const v = base * ageFactor * potFactor;
  return roundMoney(v);
}

export function playerValue(p: PlayerState): number {
  return marketValue(p.ovr, p.age, p.potential);
}

/** Wochengehalt in €, abhängig von Qualität und Finanzkraft des Vereins. */
export function wageFor(ovr: number, clubStrength: number): number {
  const w = 15000 * Math.exp(0.153 * (ovr - 70)) * Math.exp((clubStrength - 75) * 0.04);
  return Math.max(1000, Math.round(w / 500) * 500);
}

export function roleFor(ovr: number, clubStrength: number, age: number): Role {
  const rel = ovr - clubStrength;
  if (rel >= 4) return 'Schlüsselspieler';
  if (rel >= 0) return 'Stammspieler';
  if (rel >= -4) return 'Rotation';
  if (rel >= -8 || age > 21) return 'Ergänzung';
  return 'Perspektivspieler';
}

export const ROLE_BONUS: Record<Role, number> = {
  Schlüsselspieler: 2,
  Stammspieler: 1,
  Rotation: 0,
  Ergänzung: -1,
  Perspektivspieler: -1.5,
};

/** Angezeigte Potenzial-Spanne: je jünger, desto unsicherer. */
export function potentialRange(p: PlayerState): [number, number] {
  if (p.age >= 28) return [p.ovr, p.ovr];
  const width = p.age <= 19 ? 8 : p.age <= 22 ? 6 : p.age <= 25 ? 4 : 2;
  const lo = Math.max(p.ovr, p.potential - Math.ceil(width / 2));
  const hi = Math.min(99, Math.max(lo, p.potential + Math.floor(width / 2)));
  return [lo, hi];
}

export function roundMoney(v: number): number {
  if (v >= 10e6) return Math.round(v / 1e6) * 1e6;
  if (v >= 1e6) return Math.round(v / 1e5) * 1e5;
  return Math.round(v / 25e3) * 25e3;
}

export function formatMoney(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio. €`;
  if (v >= 1e3) return `${Math.round(v / 1e3).toLocaleString('de-DE')} Tsd. €`;
  return `${v.toLocaleString('de-DE')} €`;
}

export function seasonLabel(year: number): string {
  return `${year}/${String((year + 1) % 100).padStart(2, '0')}`;
}

/** Verein, für den der Spieler aktuell aufläuft (Leihverein oder Stammverein). */
export function currentClubId(p: PlayerState): string {
  return p.loan ? p.loan.clubId : p.contract.clubId;
}

export function currentRole(p: PlayerState): Role {
  return p.loan ? p.loan.role : p.contract.role;
}

export function clubStrength(career: Career, clubId: string): number {
  return getClub(clubId).strength + (career.clubDrift[clubId] ?? 0);
}

export function clubLeagueId(career: Career, clubId: string): string {
  return career.clubLeague[clubId] ?? getClub(clubId).leagueId;
}

export type CardTier = 'bronze' | 'silver' | 'gold' | 'gold-rare';

export function cardTier(ovr: number): CardTier {
  return ovr >= 85 ? 'gold-rare' : ovr >= 75 ? 'gold' : ovr >= 65 ? 'silver' : 'bronze';
}

export const TIER_NAMES: Record<CardTier, string> = { bronze: 'Bronze', silver: 'Silber', gold: 'Gold', 'gold-rare': 'Elite' };
