import { CARD_POOL, storePacks, type ClubState, type CollectCard } from './club';
import { addTrophies } from './glory';
import { clamp } from './random';
import { FORMATION, fit, teamStrength, type DuelResult } from './squad';

// ---------- Draft (nach MADFUT) ----------
// Gegen Startgeld: Kapitän aus 5 Topkarten wählen, dann für jede Position im 4-3-3 eine von 5 Karten.
// Danach ein K.-o.-Turnier über vier Runden. Die Karten gehören dir nicht – es zählt nur der Lauf.

export const DRAFT_FEE = 15_000;
export const DRAFT_ROUNDS = ['Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale'] as const;
/** Stärke der Gegner je Runde (Wertung + Chemie, wie im Duell). */
export const DRAFT_OPP = [82, 86, 89, 92];
const OPP_NAMES = ['Kreisauswahl Nord', 'Flutlicht-Allstars', 'Nachtschicht XI', 'Die Unbesiegbaren'];
const SPREAD = 10;
// Eigene Zufallshelfer mit austauschbarer Quelle (für Tests)
function poisson(lambda: number, rand: () => number): number {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = rand();
  while (p > limit && k < 12) { k++; p *= rand(); }
  return k;
}
const randInt = (min: number, max: number, rand: () => number) => min + Math.floor(rand() * (max - min + 1));

/** Ziehungs-Stufen: meist Gold, manchmal Selten oder Elite, selten eine Ikone. */
const TIERS: { share: number; test: (c: CollectCard) => boolean }[] = [
  { share: 50, test: (c) => c.variant !== 'icon' && c.ovr >= 76 && c.ovr <= 83 },
  { share: 32, test: (c) => c.variant !== 'icon' && c.ovr >= 84 && c.ovr <= 87 },
  { share: 14, test: (c) => c.variant !== 'icon' && c.ovr >= 88 },
  { share: 4, test: (c) => c.variant === 'icon' },
];

/** Karten, die im Draft vorkommen: keine eigenen Spieler, keine Doppelungen beim Namen. */
const draftPool = () => CARD_POOL.filter((c) => !c.avatar && c.ovr >= 76);

function drawTier(rand: () => number) {
  let r = rand() * 100;
  for (const t of TIERS) if ((r -= t.share) < 0) return t;
  return TIERS[0];
}

/** Fünf Karten zur Wahl für eine Position (nur passende Positionen, kein Name doppelt). */
export function draftOptions(pos: CollectCard['position'], taken: string[], rand = Math.random, n = 5): CollectCard[] {
  const pool = draftPool().filter((c) => fit(c, pos) === 'ok' && !taken.includes(c.name));
  const out: CollectCard[] = [];
  for (let k = 0; k < n * 6 && out.length < n; k++) {
    const t = drawTier(rand);
    const list = pool.filter((c) => t.test(c) && !out.some((o) => o.name === c.name));
    const src = list.length ? list : pool.filter((c) => !out.some((o) => o.name === c.name));
    if (!src.length) break;
    out.push(src[Math.floor(rand() * src.length)]);
  }
  return out.sort((a, b) => b.ovr - a.ovr);
}

/** Kapitäns-Wahl: fünf Karten ab 88, je auf einer Position, die es im 4-3-3 gibt. */
export function captainOptions(rand = Math.random): CollectCard[] {
  const positions = new Set(FORMATION.map((s) => s.pos));
  const pool = draftPool().filter((c) => c.ovr >= 88 && positions.has(c.position));
  const out: CollectCard[] = [];
  while (out.length < 5 && out.length < pool.length) {
    const c = pool[Math.floor(rand() * pool.length)];
    if (!out.some((o) => o.name === c.name)) out.push(c);
  }
  return out.sort((a, b) => b.ovr - a.ovr);
}

/** Erster freier Platz im 4-3-3, auf den die Karte passt. */
export function slotFor(card: CollectCard, slots: (CollectCard | null)[]): number {
  return FORMATION.findIndex((s, i) => !slots[i] && fit(card, s.pos) === 'ok');
}

/** Ein Turnierspiel. Unentschieden geht ins Elfmeterschießen (leicht zugunsten der stärkeren Elf). */
export function draftMatch(cards: (CollectCard | null)[], round: number, rand = Math.random): DuelResult & { penalties?: boolean } {
  const diff = teamStrength(cards, FORMATION) - DRAFT_OPP[round];
  const own = poisson(clamp(1.4 * Math.exp(diff / SPREAD), 0.2, 4), rand);
  const against = poisson(clamp(1.4 * Math.exp(-diff / SPREAD), 0.2, 4), rand);
  const goals = [
    ...Array.from({ length: own }, () => ({ minute: randInt(1, 90, rand), own: true })),
    ...Array.from({ length: against }, () => ({ minute: randInt(1, 90, rand), own: false })),
  ].sort((a, b) => a.minute - b.minute);
  if (own !== against) return { own, opp: against, outcome: own > against ? 'win' : 'loss', coins: 0, goals };
  const win = rand() < clamp(0.5 + diff * 0.02, 0.25, 0.75);
  return { own, opp: against, outcome: win ? 'win' : 'loss', coins: 0, goals, penalties: true };
}
export const draftOpponent = (round: number) => OPP_NAMES[round];

export interface DraftReward { coins: number; packs: string[]; drops: number; mega: number; trophies: number }
/** Belohnung nach Anzahl Siegen (0–4). */
export function draftReward(wins: number): DraftReward {
  const trophies = wins * 10;
  switch (wins) {
    case 0: return { coins: 3_000, packs: [], drops: 0, mega: 0, trophies };
    case 1: return { coins: 0, packs: ['gold'], drops: 0, mega: 0, trophies };
    case 2: return { coins: 0, packs: ['premium'], drops: 1, mega: 0, trophies };
    case 3: return { coins: 0, packs: ['megagold'], drops: 1, mega: 0, trophies };
    default: return { coins: 0, packs: ['ultimate'], drops: 0, mega: 1, trophies };
  }
}

export const startDraft = (club: ClubState): ClubState | null => (club.coins < DRAFT_FEE ? null : { ...club, coins: club.coins - DRAFT_FEE });

export function claimDraft(club: ClubState, wins: number, now = Date.now()): ClubState {
  const r = draftReward(wins);
  let c: ClubState = { ...club, coins: club.coins + r.coins, drops: (club.drops ?? 0) + r.drops, megaDrops: (club.megaDrops ?? 0) + r.mega };
  if (r.packs.length) c = storePacks(c, r.packs, `Draft (${wins} ${wins === 1 ? 'Sieg' : 'Siege'})`, now);
  return r.trophies ? addTrophies(c, r.trophies) : c;
}
