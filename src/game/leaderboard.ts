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

const STYLES: ((n: string, k: number) => string)[] = [
  (n) => n,
  (n, k) => `${n.replace(/\s+/g, '')}${k}`,
  (n) => `xX${n.replace(/\s+/g, '')}Xx`,
  (n) => `${n.replace(/\s+/g, '_')}_FC`,
  (n, k) => `${n} ${['II', 'III', 'Jr.', 'Pro'][k % 4]}`,
  (n) => `The ${n}`,
  (n, k) => `${n.split(' ')[0]}${['Gamer', 'TV', 'Kicker', 'Boss', 'King'][k % 5]}`,
  (n, k) => `${n.toLowerCase().replace(/\s+/g, '.')}.${(k * 7) % 100}`,
];

/** 499 erfundene Gegner – Namen eindeutig; angezeigt werden die besten 100. */
const BOTS: (Omit<Ranked, 'trophies'> & { base: number; pace: number })[] = (() => {
  const r = rng(2026);
  const used = new Set<string>();
  const out: (Omit<Ranked, 'trophies'> & { base: number; pace: number })[] = [];
  for (let i = 0; out.length < 499 && i < 20000; i++) {
    const base = NAMES[Math.floor(r() * NAMES.length)];
    const name = STYLES[Math.floor(r() * STYLES.length)](base, 2 + Math.floor(r() * 998));
    if (used.has(name)) continue;
    used.add(name);
    const rank = out.length;
    out.push({
      name,
      emblem: EMBLEMS[Math.floor(r() * EMBLEMS.length)],
      color: PROFILE_COLORS[Math.floor(r() * PROFILE_COLORS.length)],
      fx: rank < 3 ? ['chroma', 'gold', 'holo'][rank] : r() < 0.12 ? ['gold', 'neon', 'lava', 'eis', 'galaxie'][Math.floor(r() * 5)] : 'weiss',
      // Verteilung: Spitze um 20.000, Platz 100 um 1.600, Platz 500 bei 0
      base: Math.max(0, Math.round(19_500 * Math.exp(-rank / 26) + (498 - rank) * 2.8 + (r() - 0.5) * 200)),
      pace: rank < 150 ? 15 + Math.round(r() * 55) : Math.round(r() * 15),
    });
  }
  return out;
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
