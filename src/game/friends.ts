import { clamp, poisson, randInt } from './random';
import { FORMATION, cardById, teamRating, teamStrength, chemistry, type DuelResult } from './squad';
import type { ClubState } from './club';
import type { Position } from './types';

// Freunde-Duell ohne Server: Die eigene Elf wird als Text-Code exportiert (z. B. per WhatsApp verschickt).
// Ein Freund fügt den Code ein und spielt gegen diese Elf. Der Code enthält Namen, Wertungen und die Spielstärke
// zum Zeitpunkt des Exports – plus eine Prüfsumme gegen Tippfehler.

const PREFIX = 'FCK1.';
/** Coins für den ersten Sieg gegen ein bestimmtes Freundes-Team. */
export const FRIEND_REWARD = 600;
const MAX_BEATEN = 60;

export interface FriendTeam {
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

/** Eigene Elf als Code – oder null, wenn die Elf nicht vollständig ist. */
export function exportTeam(club: ClubState, name: string): string | null {
  const cards = club.squad.map((id) => cardById(club, id));
  if (cards.some((c) => !c)) return null;
  const team: FriendTeam = {
    name: name.trim().slice(0, 30) || 'Freundes-Elf',
    strength: Math.round(teamStrength(cards) * 10) / 10,
    rating: teamRating(cards),
    chemistry: chemistry(cards).total,
    players: cards.map((c) => ({ name: c!.name, ovr: c!.ovr, position: c!.position })),
  };
  const body = toBase64(JSON.stringify([team.name, team.strength, team.rating, team.chemistry, team.players.map((p) => [p.name, p.ovr, p.position])]));
  return `${PREFIX}${body}.${checksum(body)}`;
}

/** Code lesen: gibt das Team zurück oder einen Fehlertext. */
export function importTeam(code: string): FriendTeam | string {
  const clean = code.trim().replace(/\s+/g, '');
  if (!clean.startsWith(PREFIX)) return 'Das ist kein Team-Code von FC Karriere.';
  const [body, sum] = clean.slice(PREFIX.length).split('.');
  if (!body || !sum || checksum(body) !== sum) return 'Der Code ist unvollständig oder wurde verändert.';
  try {
    const [name, strength, rating, chem, players] = JSON.parse(fromBase64(body)) as [string, number, number, number, [string, number, Position][]];
    if (players.length !== 11 || typeof strength !== 'number' || strength < 30 || strength > 110) return 'Der Code enthält kein gültiges Team.';
    return {
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

/** Duell gegen ein Freundes-Team. Den ersten Sieg gegen jedes Team gibt es Coins. */
export function playFriendDuel(club: ClubState, team: FriendTeam): { club: ClubState; result: DuelResult; firstWin: boolean } | null {
  const cards = club.squad.map((id) => cardById(club, id));
  if (cards.filter(Boolean).length < 11) return null;
  const diff = teamStrength(cards) - team.strength;
  const own = poisson(clamp(1.4 * Math.exp(diff / 14), 0.2, 4));
  const against = poisson(clamp(1.4 * Math.exp(-diff / 14), 0.2, 4));
  const outcome = own > against ? 'win' : own === against ? 'draw' : 'loss';
  const key = friendKey(team);
  const beaten = club.friendsBeaten ?? [];
  const firstWin = outcome === 'win' && !beaten.includes(key);
  const coins = firstWin ? FRIEND_REWARD : 0;
  const goals = [
    ...Array.from({ length: own }, () => ({ minute: randInt(1, 90), own: true })),
    ...Array.from({ length: against }, () => ({ minute: randInt(1, 90), own: false })),
  ].sort((a, b) => a.minute - b.minute);
  return {
    club: { ...club, coins: club.coins + coins, friendsBeaten: firstWin ? [key, ...beaten].slice(0, MAX_BEATEN) : beaten },
    result: { own, opp: against, outcome, coins, goals },
    firstWin,
  };
}

export const SLOT_LABELS = FORMATION.map((s) => s.label);
