// ---------- Revierkampf: Stadien erobern (eigenes Spiel im Eroberungs-Genre) ----------
// Stadien auf einer Karte. In eigenen Stadien wachsen Fans nach. Ziehen von eigenen Stadien zu einem Ziel schickt
// einen Teil der Fans los; kommen mehr an, als dort sind, wechselt das Stadion den Besitzer. Computer-Gegner tun das Gleiche.
// Reine Logik (ohne Anzeige), mit festem Zufall pro Level – Koordinaten von 0 bis 1.

export type Owner = -1 | 0 | 1 | 2 | 3; // −1 neutral, 0 du, 1–3 Gegner
export interface Node { id: number; x: number; y: number; size: 1 | 2 | 3; owner: Owner; units: number }
export interface Squad { id: number; from: number; to: number; owner: Owner; count: number; t: number; dur: number }
export interface Conquest {
  level: number;
  nodes: Node[];
  squads: Squad[];
  time: number;
  /** Nächster Zug je Gegner (Sekunden) */
  aiNext: number[];
  aiCount: number;
  /** Denkpause der Gegner (je Level kürzer) */
  aiDelay: number;
  result: 'win' | 'lose' | null;
  seed: number;
  nextId: number;
}

export const SIZE_INFO: Record<1 | 2 | 3, { name: string; grow: number; cap: number; r: number }> = {
  1: { name: 'Bolzplatz', grow: 0.8, cap: 30, r: 0.045 },
  2: { name: 'Stadion', grow: 1.25, cap: 55, r: 0.058 },
  3: { name: 'Arena', grow: 1.8, cap: 90, r: 0.072 },
};
/** Anteil der Fans, der losgeschickt wird. */
export const SEND_SHARE = 0.6;
/** Marschtempo (Kartenbreiten pro Sekunde). */
export const SPEED = 0.2;
export const MAX_LEVEL = 30;

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const dist = (a: Node, b: Node) => Math.hypot(a.x - b.x, a.y - b.y);

/** Level aufbauen: mehr Stadien und Gegner, kürzere Denkpausen. Höhe/Breite der Karte: `aspect` (z. B. 1.5 hochkant). */
export function makeLevel(level: number, aspect = 1.5): Conquest {
  const lv = Math.max(1, Math.min(MAX_LEVEL, Math.round(level)));
  const r = rng(lv * 7919 + 13);
  const aiCount = lv <= 3 ? 1 : lv <= 8 ? 2 : 3;
  const count = Math.min(22, 8 + Math.floor(lv * 0.6) + aiCount);
  const nodes: Node[] = [];
  // Startplätze: du unten links, Gegner in den anderen Ecken
  const corners: [number, number][] = [[0.18, 0.86], [0.82, 0.14], [0.82, 0.86], [0.18, 0.14]];
  for (let i = 0; i <= aiCount; i++) nodes.push({ id: i, x: corners[i][0], y: corners[i][1], size: 2, owner: i as Owner, units: i === 0 ? 24 : 12 + Math.min(14, lv) });
  const minD = 0.2;
  for (let tries = 0; nodes.length < count && tries < 4000; tries++) {
    const x = 0.08 + r() * 0.84, y = 0.08 + r() * 0.84;
    if (nodes.some((n) => Math.hypot((n.x - x), (n.y - y) * aspect) < minD)) continue;
    const roll = r();
    const size: 1 | 2 | 3 = roll < 0.5 ? 1 : roll < 0.85 ? 2 : 3;
    nodes.push({ id: nodes.length, x, y, size, owner: -1, units: Math.round(5 + r() * (6 + size * 6) + lv * 0.4) });
  }
  return {
    level: lv, nodes, squads: [], time: 0, aiCount,
    aiDelay: Math.max(1.1, 4.2 - lv * 0.12),
    aiNext: Array.from({ length: aiCount }, (_, i) => 1.5 + i * 0.4),
    result: null, seed: lv * 104729, nextId: 1,
  };
}

/** Fans losschicken: von mehreren eigenen Stadien zu einem Ziel. Gibt die Zahl der losgeschickten Fans zurück. */
export function send(s: Conquest, from: number[], to: number, owner: Owner = 0): number {
  const target = s.nodes[to];
  if (!target || s.result) return 0;
  let total = 0;
  for (const id of new Set(from)) {
    const n = s.nodes[id];
    if (!n || n.owner !== owner || id === to) continue;
    const count = Math.floor(n.units * SEND_SHARE);
    if (count < 1) continue;
    n.units -= count;
    total += count;
    s.squads.push({ id: s.nextId++, from: id, to, owner, count, t: 0, dur: Math.max(0.35, dist(n, target) / SPEED) });
  }
  return total;
}

/** Ankunft: Verstärkung oder Angriff (Fans heben sich gegenseitig auf, Überschuss erobert). */
function arrive(s: Conquest, q: Squad): void {
  const n = s.nodes[q.to];
  if (n.owner === q.owner) { n.units += q.count; return; }
  n.units -= q.count;
  if (n.units < 0) { n.owner = q.owner; n.units = -n.units; }
}

/** Gegner-Zug: stärkstes eigenes Stadion greift ein lohnendes, gut erreichbares Ziel an (oder verstärkt bedrohte Stadien). */
function aiMove(s: Conquest, owner: Owner, r: () => number): void {
  const mine = s.nodes.filter((n) => n.owner === owner);
  if (!mine.length) return;
  const incoming = (id: number, by: Owner | 'enemy') => s.squads.filter((q) => q.to === id && (by === 'enemy' ? q.owner !== owner : q.owner === by)).reduce((a, q) => a + q.count, 0);
  const src = [...mine].sort((a, b) => b.units - a.units)[0];
  // Frühe Level: Gegner greifen erst mit Reserve an
  if (src.units < 10 + Math.max(0, 8 - s.level)) return;
  const power = Math.floor(src.units * SEND_SHARE);
  // Verteidigung: ein eigenes Stadion droht zu fallen
  const danger = mine.find((n) => n.id !== src.id && incoming(n.id, 'enemy') > n.units + incoming(n.id, owner));
  if (danger && r() < 0.7) { send(s, [src.id], danger.id, owner); return; }
  const cands = s.nodes.filter((n) => n.owner !== owner).map((n) => {
    const d = dist(src, n);
    const travel = d / SPEED;
    const grow = n.owner === -1 ? 0 : SIZE_INFO[n.size].grow * travel;
    const need = n.units + grow + incoming(n.id, 'enemy') * 0.3 - incoming(n.id, owner);
    // Neutrale Stadien zuerst; Spieler und andere Gegner gleich behandelt (alle gegen alle)
    const value = (n.size * 1.4 + (n.owner === -1 ? 1.1 : 0.7)) / (0.25 + d);
    return { n, need, value };
  }).filter((c) => c.need < power * (s.level <= 3 ? 0.75 : 0.9) && !(c.n.owner === 0 && s.time < 20)).sort((a, b) => b.value - a.value);
  const pick = cands[Math.floor(r() * Math.min(2, cands.length))];
  if (pick) {
    // Mehrere eigene Stadien helfen mit, wenn eines allein knapp ist
    const helpers = mine.filter((n) => n.id !== src.id && n.units > 12 && dist(n, pick.n) < 0.45).map((n) => n.id);
    send(s, pick.need > power * 0.6 ? [src.id, ...helpers.slice(0, 2)] : [src.id], pick.n.id, owner);
  }
}

/** Ein Zeitschritt (Sekunden). Verändert den Zustand direkt (schnell für die Spielschleife). */
export function step(s: Conquest, dt: number): void {
  if (s.result) return;
  const d = Math.min(0.1, Math.max(0, dt));
  s.time += d;
  // Wachstum
  for (const n of s.nodes) {
    if (n.owner === -1) continue;
    const info = SIZE_INFO[n.size];
    if (n.units < info.cap) n.units = Math.min(info.cap, n.units + info.grow * d);
    else n.units = Math.max(info.cap, n.units - 0.5 * d);
  }
  // Märsche
  const left: Squad[] = [];
  for (const q of s.squads) {
    q.t += d / q.dur;
    if (q.t >= 1) arrive(s, q); else left.push(q);
  }
  s.squads = left;
  // Gegner
  const r = rng(s.seed + Math.floor(s.time * 10));
  for (let i = 0; i < s.aiCount; i++) {
    s.aiNext[i] -= d;
    if (s.aiNext[i] <= 0) { aiMove(s, (i + 1) as Owner, r); s.aiNext[i] = s.aiDelay * (0.7 + r() * 0.6); }
  }
  s.result = outcome(s);
}

export function outcome(s: Conquest): 'win' | 'lose' | null {
  const alive = (o: Owner) => s.nodes.some((n) => n.owner === o) || s.squads.some((q) => q.owner === o);
  if (!alive(0)) return 'lose';
  const enemies = [1, 2, 3].slice(0, s.aiCount) as Owner[];
  if (enemies.every((o) => !alive(o))) return 'win';
  return null;
}

/** Anteil an allen Fans je Besitzer (für die Leiste oben). */
export function shares(s: Conquest): { owner: Owner; units: number }[] {
  const map = new Map<Owner, number>();
  for (const n of s.nodes) map.set(n.owner, (map.get(n.owner) ?? 0) + n.units);
  for (const q of s.squads) map.set(q.owner, (map.get(q.owner) ?? 0) + q.count);
  return ([0, 1, 2, 3, -1] as Owner[]).filter((o) => map.has(o)).map((o) => ({ owner: o, units: map.get(o)! }));
}

/** Sterne: Sieg schnell = 3, normal = 2, langsam = 1. */
export const starsFor = (s: Conquest) => (s.result !== 'win' ? 0 : s.time < 45 + s.level * 4 ? 3 : s.time < 90 + s.level * 6 ? 2 : 1);

// ---------- Fortschritt ----------
const KEY = 'fc-revier';
export interface RevierProgress { unlocked: number; stars: Record<number, number> }
export function loadProgress(): RevierProgress {
  try { const raw = localStorage.getItem(KEY); if (raw) { const p = JSON.parse(raw) as RevierProgress; return { unlocked: Math.max(1, p.unlocked || 1), stars: p.stars ?? {} }; } } catch { /* ohne Speicher */ }
  return { unlocked: 1, stars: {} };
}
export function saveResult(level: number, stars: number): RevierProgress {
  const p = loadProgress();
  if (stars > 0) {
    p.stars[level] = Math.max(p.stars[level] ?? 0, stars);
    p.unlocked = Math.max(p.unlocked, Math.min(MAX_LEVEL, level + 1));
  }
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* egal */ }
  return p;
}
