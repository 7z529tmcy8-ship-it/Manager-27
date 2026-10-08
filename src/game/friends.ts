import { clamp, poisson, randInt, uid } from './random';
import { FORMATION, cardById, slotsOf, teamRating, teamStrength, chemistry, type DuelResult } from './squad';
import type { ClubState } from './club';
import type { Position } from './types';

// Freunde-Duell ohne Server: Die eigene Elf wird als Text-Code exportiert (z. B. per WhatsApp verschickt).
// Ein Freund fügt den Code ein und spielt gegen diese Elf. Der Code enthält Namen, Wertungen und die Spielstärke
// zum Zeitpunkt des Exports – plus eine Prüfsumme gegen Tippfehler.

const PREFIX = 'FCK1.';
/** Coins für den ersten Sieg gegen einen bestimmten Freund. */
export const FRIEND_REWARD = 600;
const MAX_BEATEN = 60;

export interface FriendTeam {
  /** Kennung des Absenders (gleich bei jedem Code desselben Spielers). Ältere Codes haben keine. */
  owner?: string;
  name: string;
  strength: number;
  rating: number;
  chemistry: number;
  players: { name: string; ovr: number; position: Position }[];
}

function checksum(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36).slice(0, 5);
}

const toBase64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

/** Eigene, zufällige Spieler-Kennung (wird beim ersten Teilen angelegt). */
export const ownerIdOf = (club: ClubState) => club.ownerId ?? '';
export function withOwnerId(club: ClubState): ClubState {
  return club.ownerId ? club : { ...club, ownerId: uid() + uid() };
}

/** Eigene Elf als Code – oder null, wenn die Elf nicht vollständig ist. */
export function exportTeam(club: ClubState, name: string): string | null {
  const cards = club.squad.map((id) => cardById(club, id));
  if (cards.some((c) => !c)) return null;
  const team: FriendTeam = {
    name: name.trim().slice(0, 30) || 'Freundes-Elf',
    strength: Math.round(teamStrength(cards, slotsOf(club)) * 10) / 10,
    rating: teamRating(cards),
    chemistry: chemistry(cards, slotsOf(club)).total,
    players: cards.map((c) => ({ name: c!.name, ovr: c!.ovr, position: c!.position })),
  };
  const body = toBase64(JSON.stringify([team.name, team.strength, team.rating, team.chemistry, team.players.map((p) => [p.name, p.ovr, p.position]), ownerIdOf(club)]));
  return `${PREFIX}${body}.${checksum(body)}`;
}

/** Code lesen: gibt das Team zurück oder einen Fehlertext. */
export function importTeam(code: string): FriendTeam | string {
  const clean = code.trim().replace(/\s+/g, '');
  if (!clean.startsWith(PREFIX)) return 'Das ist kein Team-Code von FC Karriere.';
  const [body, sum] = clean.slice(PREFIX.length).split('.');
  if (!body || !sum || checksum(body) !== sum) return 'Der Code ist unvollständig oder wurde verändert.';
  try {
    const [name, strength, rating, chem, players, owner] = JSON.parse(fromBase64(body)) as [string, number, number, number, [string, number, Position][], string?];
    if (players.length !== 11 || typeof strength !== 'number' || strength < 30 || strength > 110) return 'Der Code enthält kein gültiges Team.';
    return {
      owner: typeof owner === 'string' && owner ? owner.slice(0, 24) : undefined,
      name: String(name).slice(0, 30),
      strength,
      rating,
      chemistry: chem,
      players: players.map(([n, o, p]) => ({ name: String(n).slice(0, 40), ovr: clamp(Number(o) || 0, 1, 99), position: p })),
    };
  } catch {
    return 'Der Code konnte nicht gelesen werden.';
  }
}

export const friendKey = (team: FriendTeam) => checksum(JSON.stringify([team.name, team.players.map((p) => p.name)]));

// ---------- Freundesliste ----------

export interface FriendResult {
  date: number;
  own: number;
  opp: number;
  outcome: DuelResult['outcome'];
  /** Stärke beider Teams in diesem Spiel. */
  ownStrength: number;
  oppStrength: number;
}

export interface FriendEntry {
  /** Absender-Kennung bzw. bei alten Codes eine Kennung aus Name und Spielern. */
  id: string;
  team: FriendTeam;
  addedAt: number;
  updatedAt: number;
  results: FriendResult[];
}

const MAX_FRIENDS = 40;
const MAX_RESULTS = 30;
export const entryId = (team: FriendTeam) => team.owner ?? `n-${friendKey(team)}`;

/** Freund speichern bzw. sein Team aktualisieren (gleicher Absender = gleicher Freund). */
export function saveFriend(club: ClubState, team: FriendTeam, now = Date.now()): { club: ClubState; status: 'new' | 'updated' | 'same' | 'self' } {
  if (team.owner && team.owner === club.ownerId) return { club, status: 'self' };
  const id = entryId(team);
  const list = club.friends ?? [];
  const old = list.find((f) => f.id === id);
  if (old) {
    const same = JSON.stringify(old.team) === JSON.stringify(team);
    if (same) return { club, status: 'same' };
    return { club: { ...club, friends: list.map((f) => (f.id === id ? { ...f, team, updatedAt: now } : f)) }, status: 'updated' };
  }
  const entry: FriendEntry = { id, team, addedAt: now, updatedAt: now, results: [] };
  return { club: { ...club, friends: [entry, ...list].slice(0, MAX_FRIENDS) }, status: 'new' };
}

export function removeFriend(club: ClubState, id: string): ClubState {
  return { ...club, friends: (club.friends ?? []).filter((f) => f.id !== id) };
}

/** Bilanz gegen einen Freund. */
export function record(entry: FriendEntry) {
  const w = entry.results.filter((r) => r.outcome === 'win').length;
  const d = entry.results.filter((r) => r.outcome === 'draw').length;
  const l = entry.results.length - w - d;
  const goals = entry.results.reduce((a, r) => [a[0] + r.own, a[1] + r.opp], [0, 0]);
  return { w, d, l, goalsFor: goals[0], goalsAgainst: goals[1], played: entry.results.length };
}

/** Duell gegen ein Freundes-Team. Den ersten Sieg gegen jedes Team gibt es Coins; gespeicherte Freunde bekommen das Ergebnis in den Verlauf. */
export function playFriendDuel(club: ClubState, team: FriendTeam, now = Date.now()): { club: ClubState; result: DuelResult; firstWin: boolean } | null {
  const cards = club.squad.map((id) => cardById(club, id));
  if (cards.filter(Boolean).length < 11) return null;
  const ownStrength = teamStrength(cards, slotsOf(club));
  const diff = ownStrength - team.strength;
  const own = poisson(clamp(1.4 * Math.exp(diff / 14), 0.2, 4));
  const against = poisson(clamp(1.4 * Math.exp(-diff / 14), 0.2, 4));
  const outcome = own > against ? 'win' : own === against ? 'draw' : 'loss';
  // Belohnung einmal pro Freund (Absender-Kennung) – ein neuer Teamname bringt keine neuen Coins.
  const key = entryId(team);
  const beaten = club.friendsBeaten ?? [];
  const firstWin = outcome === 'win' && !beaten.includes(key);
  const coins = firstWin ? FRIEND_REWARD : 0;
  const goals = [
    ...Array.from({ length: own }, () => ({ minute: randInt(1, 90), own: true })),
    ...Array.from({ length: against }, () => ({ minute: randInt(1, 90), own: false })),
  ].sort((a, b) => a.minute - b.minute);
  const id = entryId(team);
  const entry: FriendResult = { date: now, own, opp: against, outcome, ownStrength: Math.round(ownStrength * 10) / 10, oppStrength: team.strength };
  const friends = (club.friends ?? []).map((f) => (f.id === id ? { ...f, results: [entry, ...f.results].slice(0, MAX_RESULTS) } : f));
  return {
    club: { ...club, coins: club.coins + coins, friends, friendsBeaten: firstWin ? [key, ...beaten].slice(0, MAX_BEATEN) : beaten },
    result: { own, opp: against, outcome, coins, goals },
    firstWin,
  };
}

/** Text zum Teilen eines Ergebnisses (z. B. per WhatsApp). */
export function resultText(ownName: string, team: FriendTeam, r: DuelResult): string {
  const verb = r.outcome === 'win' ? 'gewonnen 😎' : r.outcome === 'draw' ? 'unentschieden gespielt 🤝' : 'verloren 😤 – Revanche folgt';
  return `⚽ FC Karriere: ${ownName || 'Meine Elf'} ${r.own}:${r.opp} ${team.name} – ich habe ${verb}! Schick mir deinen neuen Team-Code.`;
}

export const SLOT_LABELS = FORMATION.map((s) => s.label);
