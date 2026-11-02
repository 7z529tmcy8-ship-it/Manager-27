import { EMBLEMS, PROFILE_COLORS } from './profile';
import { NAMES } from './trade';

// ---------- Bestenliste (Top 100 nach Trophäen) ----------
// Die anderen Plätze sind erfundene Spieler – Namen aus der Tauschbörse, abgewandelt.
// Feste Reihenfolge (Zufall mit festem Startwert), jeden Tag kommen ein paar Trophäen dazu.

export interface Ranked { name: string; trophies: number; emblem: string; color: string; fx: string; me?: boolean }

const START = new Date(2026, 10, 1).getTime();
const DAY = 86_400_000;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Namen: die 12 aus der Tauschbörse (je einmal) plus frei erfundene – Vornamen mit Kürzel und Gamer-Namen aus zwei Teilen.
const FIRST = ['Luca', 'Mehmet', 'Jonas', 'Lina', 'Noah', 'Emre', 'Finn', 'Mia', 'Yusuf', 'Ben', 'Elif', 'Leon', 'Kerem', 'Paul', 'Amira', 'Tim',
  'Selin', 'Milan', 'Can', 'Lea', 'Ilias', 'Nico', 'Hannah', 'Deniz', 'Matteo', 'Sofia', 'Malik', 'Jannik', 'Aylin', 'Henri', 'Elias', 'Zoe',
  'Ömer', 'Felix', 'Leyla', 'Arda', 'Moritz', 'Nele', 'Samir', 'Tom', 'Ida', 'Bilal', 'Lukas', 'Mila', 'Jamal', 'Ole', 'Lara', 'Kenan',
  'Erik', 'Nora', 'Dario', 'Ela', 'Vincent', 'Hamza', 'Greta', 'Rafael', 'Ayla', 'Joel', 'Liv', 'Toni'];
const PART_A = ['Blitz', 'Neon', 'Gold', 'Turbo', 'Night', 'Ice', 'Storm', 'Pixel', 'Shadow', 'Rocket', 'Lucky', 'Wild', 'Silent', 'Iron',
  'Cosmic', 'Mega', 'Ultra', 'Red', 'Blue', 'Fire', 'Dark', 'Crazy', 'Royal', 'Golden', 'Mighty', 'Hyper', 'Stealth', 'Atomic', 'Laser', 'Venom'];
const PART_B = ['Wolf', 'Fuchs', 'Kicker', 'Falke', 'Tiger', 'Hai', 'Panther', 'Rakete', 'Komet', 'Drache', 'Löwe', 'Adler', 'Ninja', 'Titan',
  'Knipser', 'Keeper', 'Zehner', 'Libero', 'Magier', 'Boss', 'King', 'Joker', 'Sniper', 'Ghost', 'Viper', 'Bulle', 'Phantom', 'Blitzer', 'Rebell', 'Pirat'];
const TAGS = ['FC', 'TV', 'YT', 'Pro', 'HD', 'XL', 'GG', '07', '10', '99', '23', '11', '19'];

/** 499 erfundene Gegner – Namen eindeutig; angezeigt werden die besten 100. */
const BOTS: (Omit<Ranked, 'trophies'> & { base: number; pace: number })[] = (() => {
  const r = rng(2026);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const used = new Set<string>();
  const perFirst = new Map<string, number>();
  const names: string[] = [];
  const add = (n: string) => { if (!used.has(n.toLowerCase())) { used.add(n.toLowerCase()); names.push(n); return true; } return false; };
  for (const n of NAMES) add(n);
  for (let i = 0; names.length < 499 && i < 50_000; i++) {
    const kind = r();
    if (kind < 0.4) {
      const f = pick(FIRST);
      if ((perFirst.get(f) ?? 0) >= 2) continue; // jeder Vorname höchstens zweimal
      const v = r();
      const n = v < 0.4 ? `${f} ${String.fromCharCode(65 + Math.floor(r() * 26))}.` : v < 0.75 ? `${f}_${pick(TAGS)}` : `${f.toLowerCase()}${10 + Math.floor(r() * 90)}`;
      if (add(n)) perFirst.set(f, (perFirst.get(f) ?? 0) + 1);
    } else {
      const g = `${pick(PART_A)}${pick(PART_B)}`;
      const v = r();
      add(v < 0.5 ? g : v < 0.75 ? `${g}${pick(TAGS)}` : `xX${g}Xx`);
    }
  }
  // Mischen, damit die Tauschbörsen-Namen nicht alle oben stehen
  for (let i = names.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
  return names.map((name, rank) => ({
    name,
    emblem: pick(EMBLEMS),
    color: pick(PROFILE_COLORS),
    fx: rank < 3 ? ['chroma', 'gold', 'holo'][rank] : rank < 10 || r() < 0.1 ? pick(['gold', 'neon', 'lava', 'eis', 'galaxie', 'holo']) : 'weiss',
    // Top 10 um 50.000, dann steil abwärts: Platz 100 um 3.000, Platz 500 bei 0
    base: Math.max(0, Math.round(rank < 10 ? 58_000 - rank * 1_250 + (r() - 0.5) * 600 : 46_000 * Math.exp(-(rank - 10) / 28) + (498 - rank) * 2.5 + (r() - 0.5) * 200)),
    pace: rank < 10 ? 120 + Math.round(r() * 120) : rank < 150 ? 15 + Math.round(r() * 55) : Math.round(r() * 15),
  }));
})();

/** Erfundene Spieler zum Zeitpunkt `now` (wachsen täglich). */
export function bots(now = Date.now()): Ranked[] {
  const days = Math.max(0, Math.floor((now - START) / DAY));
  return BOTS.map(({ base, pace, ...b }) => ({ ...b, trophies: base + days * pace })).sort((a, b) => b.trophies - a.trophies);
}

/** Top 100 (mit dir, falls du drin bist) und dein Platz. */
export function leaderboard(me: Omit<Ranked, 'me'>, now = Date.now()): { top: Ranked[]; rank: number; total: number } {
  const list = bots(now);
  const above = list.filter((b) => b.trophies > me.trophies).length;
  const all = [...list.slice(0, above), { ...me, me: true }, ...list.slice(above)];
  return { top: all.slice(0, 100), rank: above + 1, total: all.length };
}
