import { FAILED_TALENTS, LEGENDS } from '../data/legends';
import { REAL_PLAYERS } from '../data/players';
import { EXTRA_ICONS, EXTRA_STARS } from '../data/cards';
import { getClub, getLeague, slugify } from '../data/leagues';
import { summarizeCareer } from './legacy';
import { homeClubOf } from './offers';
import { cardTier } from './player';
import type { Career, CoachSeason, Position, SeasonRecord, SpecialCard, SpecialType } from './types';

// „Club“ über alle Karrieren hinweg: Coins, gesammelte Karten, Items. Angelehnt an Karten-Sammelmodi,
// aber mit eigenen Namen und Designs. Coins verdient man nur im Karrieremodus – kein echtes Geld.

export type CardVariant = 'silver' | 'gold' | 'gold-rare' | 'icon' | 'talent' | SpecialType;

export interface CollectCard {
  id: string;
  name: string;
  position: Position;
  nation: string;
  club: string;
  /** Liga des Vereins (für Chemie); leer bei Ikonen und Talenten. */
  league?: string;
  /** Alter (Saison 2025/26) – für das Wunderkind-Pack. */
  age?: number;
  ovr: number;
  variant: CardVariant;
  label?: string;
  /** Durch Coins verbessert: so viele Punkte über dem Grundwert. */
  boost?: number;
}

export type ItemKind = 'fitness' | 'training';
export const ITEMS: Record<ItemKind, { name: string; icon: string; text: string }> = {
  fitness: { name: 'Fitness-Kit', icon: '🩹', text: 'Heilt eine laufende Verletzung sofort.' },
  training: { name: 'Trainingsboost', icon: '⚡', text: '+1 Gesamtwertung (bis zum Potenzial, einmal pro Saison).' },
};

export interface ClubState {
  coins: number;
  /** Karten-ID → Anzahl. */
  cards: Record<string, number>;
  /** Eigene Sonderkarten (aus den Karrieren). */
  specials: CollectCard[];
  items: Record<ItemKind, number>;
  /** Karriere-ID → Anzahl bereits ausgezahlter Saisons. */
  credited: Record<string, number>;
  packsOpened: number;
  /** Willkommens-Pack schon geöffnet? */
  welcomeClaimed: boolean;
  /** Karten-Verbesserungen: Karten-ID → zusätzliche Wertungspunkte. */
  upgrades?: Record<string, number>;
  /** Aufstellung (11 Karten-IDs im 4-3-3, null = leer). */
  squad: (string | null)[];
  /** Höchste freigeschaltete Duell-Stufe (1–10) und Bilanz. */
  duelLevel: number;
  duels: { w: number; d: number; l: number };
  /** Erledigte Tauschaufgaben (ID → wie oft). */
  tasksDone: Record<string, number>;
}

export const START_COINS = 3000;
export const freshClub = (): ClubState => ({
  coins: START_COINS,
  cards: {},
  specials: [],
  items: { fitness: 1, training: 0 },
  credited: {},
  packsOpened: 0,
  welcomeClaimed: false,
  squad: Array(11).fill(null),
  duelLevel: 1,
  duels: { w: 0, d: 0, l: 0 },
  tasksDone: {},
  upgrades: {},
});

// ---------- Kartenpool ----------
const cardId = (name: string) => slugify(name);

export const CARD_POOL: CollectCard[] = [
  ...REAL_PLAYERS.map((p) => ({
    id: cardId(p.name), name: p.name, position: p.position, nation: p.nation, club: getClub(p.clubId).name, league: getLeague(getClub(p.clubId).leagueId).name, age: p.age, ovr: p.ovr,
    variant: cardTier(p.ovr) === 'bronze' ? ('silver' as const) : (cardTier(p.ovr) as CardVariant),
  })),
  ...LEGENDS.map((l) => ({ id: cardId(l.name), name: l.name, position: l.position, nation: l.nation, club: 'Ikone', ovr: l.potential, variant: 'icon' as const, label: 'Ikone' })),
  ...EXTRA_STARS.map(([name, nation, position, age, ovr, club, league]) => ({
    id: cardId(name), name, position, nation, club, league, age, ovr,
    variant: ovr >= 85 ? ('gold-rare' as const) : ovr >= 75 ? ('gold' as const) : ('silver' as const),
  })),
  ...EXTRA_ICONS.map(([name, nation, position, ovr]) => ({ id: cardId(name), name, position, nation, club: 'Ikone', ovr, variant: 'icon' as const, label: 'Ikone' })),
  ...FAILED_TALENTS.map((l) => ({ id: cardId(l.name), name: l.name, position: l.position, nation: l.nation, club: 'Zweite Chance', ovr: l.potential, variant: 'talent' as const, label: 'Was wäre wenn' })),
];
export const getCard = (id: string) => CARD_POOL.find((c) => c.id === id);

/** Schnellverkaufswert einer Karte in Coins. */
export function sellValue(c: CollectCard): number {
  if (c.variant === 'icon') return 4000;
  if (c.variant === 'talent') return 800;
  if (c.variant === 'gold-rare') return 900 + (c.ovr - 85) * 150;
  if (c.variant === 'gold') return 250;
  return 80;
}

/** Seltenheit für Sortierung und „bester Zug“. */
export function rarity(c: CollectCard): number {
  const base = { silver: 0, gold: 1, 'gold-rare': 2, talent: 2.5, icon: 4, tots: 3, potm: 3, record: 3, champion: 3 }[c.variant];
  return base * 100 + c.ovr;
}

// ---------- Packs ----------
export interface PackDef {
  id: string;
  name: string;
  price: number;
  size: number;
  text: string;
  /** Welche Karten in Frage kommen und mit welchem Gewicht. */
  weight: (c: CollectCard) => number;
  /** Garantie für die erste Karte. */
  guarantee?: (c: CollectCard) => boolean;
  itemChance: number;
}

const lowWeight = (c: CollectCard) => (c.variant === 'icon' ? 0.02 : c.variant === 'talent' ? 0.15 : Math.exp(-(c.ovr - 70) / 5));
export const PACKS: PackDef[] = [
  { id: 'standard', name: 'Standard-Pack', price: 1500, size: 3, text: '3 Karten, meist Silber und Gold, dazu mit Glück ein Item.', weight: lowWeight, itemChance: 0 },
  {
    id: 'gold', name: 'Gold-Pack', price: 4000, size: 3, text: '3 Karten ab 75, Chance auf Elite.',
    weight: (c) => (c.variant === 'icon' ? 0.05 : c.ovr >= 75 ? Math.exp(-(c.ovr - 78) / 6) : 0), itemChance: 0,
  },
  {
    id: 'premium', name: 'Premium-Pack', price: 10000, size: 4, text: '4 Karten ab 78, eine davon garantiert Elite (85+).',
    weight: (c) => (c.variant === 'icon' ? 0.1 : c.ovr >= 78 ? 1 : 0), guarantee: (c) => c.ovr >= 85 && c.variant !== 'icon', itemChance: 0,
  },
  {
    id: 'icon', name: 'Ikonen-Pack', price: 25000, size: 2, text: '1 garantierte Ikone plus eine Karte ab 80.',
    weight: (c) => (c.ovr >= 80 && c.variant !== 'icon' ? 1 : 0), guarantee: (c) => c.variant === 'icon', itemChance: 0,
  },
  {
    id: 'mystery', name: 'Wundertüte', price: 2000, size: 1, text: '1 völlig zufällige Karte – von Silber bis Ikone ist alles drin.',
    weight: () => 1, itemChance: 0,
  },
  {
    id: 'germany', name: 'Deutschland-Pack', price: 4500, size: 3, text: '3 deutsche Spieler – mit etwas Glück eine deutsche Ikone.',
    weight: (c) => (c.nation !== 'Deutschland' ? 0 : c.variant === 'icon' ? 0.15 : 1), itemChance: 0,
  },
  {
    id: 'bundesliga', name: 'Bundesliga-Pack', price: 4500, size: 3, text: '3 Spieler aus der Bundesliga, gute Chemie garantiert.',
    weight: (c) => (c.league === 'Bundesliga' ? 1 : 0), itemChance: 0,
  },
  {
    id: 'wonder', name: 'Wunderkind-Pack', price: 6000, size: 3, text: '3 Talente bis 21 Jahre – die Stars von morgen.',
    weight: (c) => (c.age !== undefined && c.age <= 21 ? Math.exp((c.ovr - 75) / 10) : 0), itemChance: 0,
  },
  {
    id: 'worldstar', name: 'Weltstar-Pack', price: 15000, size: 2, text: '2 Weltstars ab 88 – kleine Chance auf eine Ikone.',
    weight: (c) => (c.ovr < 88 || c.variant === 'talent' ? 0 : c.variant === 'icon' ? 0.12 : 1), itemChance: 0,
  },
  {
    id: 'goat', name: 'GOAT-Pack', price: 40000, size: 2, text: 'Eine Ikone ab 94 garantiert (Pelé, Maradona, Cruyff …) plus ein Weltstar.',
    weight: (c) => (c.ovr >= 88 && c.variant !== 'icon' && c.variant !== 'talent' ? 1 : 0), guarantee: (c) => c.variant === 'icon' && c.ovr >= 94, itemChance: 0,
  },
];

export interface PackResult {
  cards: { card: CollectCard; duplicate: boolean }[];
  items: ItemKind[];
}

function weightedPick<T>(list: T[], w: (x: T) => number, rand: () => number): T {
  const total = list.reduce((a, x) => a + w(x), 0);
  let r = rand() * total;
  for (const x of list) if ((r -= w(x)) <= 0) return x;
  return list[list.length - 1];
}

/** Pack kaufen und öffnen. Gibt null zurück, wenn die Coins nicht reichen. */
export function openPack(club: ClubState, packId: string, rand = Math.random, free = false): { club: ClubState; result: PackResult } | null {
  const pack = PACKS.find((p) => p.id === packId);
  if (!pack || (!free && club.coins < pack.price)) return null;
  const chosen: CollectCard[] = [];
  for (let i = 0; i < pack.size; i++) {
    const pool = CARD_POOL.filter((c) => !chosen.includes(c) && (i === 0 && pack.guarantee ? pack.guarantee(c) : pack.weight(c) > 0));
    chosen.push(weightedPick(pool, i === 0 && pack.guarantee ? () => 1 : pack.weight, rand));
  }
  const cards = { ...club.cards };
  const result: PackResult = { cards: [], items: [] };
  for (const c of chosen.sort((a, b) => rarity(b) - rarity(a))) {
    result.cards.push({ card: c, duplicate: (cards[c.id] ?? 0) > 0 });
    cards[c.id] = (cards[c.id] ?? 0) + 1;
  }
  const items = { ...club.items };
  if (rand() < pack.itemChance) {
    const kind: ItemKind = rand() < 0.5 ? 'fitness' : 'training';
    items[kind] += 1;
    result.items.push(kind);
  }
  return {
    club: { ...club, coins: club.coins - (free ? 0 : pack.price), cards, items, packsOpened: club.packsOpened + 1 },
    result,
  };
}

/** Alle doppelten Karten schnell verkaufen (eine bleibt jeweils). */
export function sellDuplicates(club: ClubState): { club: ClubState; coins: number; count: number } {
  let coins = 0;
  let count = 0;
  const cards: Record<string, number> = {};
  for (const [id, n] of Object.entries(club.cards)) {
    const c = getCard(id);
    if (!c) continue;
    if (n > 1) {
      coins += (n - 1) * sellValue(c);
      count += n - 1;
    }
    cards[id] = Math.min(n, 1);
  }
  return { club: { ...club, cards, coins: club.coins + coins }, coins, count };
}

// ---------- Coins aus der Karriere ----------
/** Coins für eine Saison: Einsätze, Tore, Vorlagen, Titel, Auszeichnungen, Erfolge und Sonderkarten. */
export function seasonCoins(r: SeasonRecord, specials: number): number {
  return (
    300 + r.apps * 10 + r.goals * 30 + r.assists * 20 + r.trophies.length * 600 + r.awards.length * 800 +
    (r.achievements?.length ?? 0) * 250 + specials * 750
  );
}

/**
 * Noch nicht ausgezahlte Saisons (als Spieler und als Trainer) gutschreiben.
 * Sonderkarten einzelner Saisons gibt es nicht mehr – dafür nach dem Karriereende genau eine eigene Ikonen-Karte.
 */
export function creditCareer(
  club: ClubState,
  career: Career,
): { club: ClubState; gained: number; seasons: number; icon: CollectCard | null } {
  const done = club.credited[career.id] ?? 0;
  const fresh = career.history.slice(done);
  let gained = 0;
  for (const r of fresh) {
    const mine = (career.specialCards ?? []).filter((s) => s.season === r.season);
    gained += seasonCoins(r, mine.length);
  }
  const coachKey = `${career.id}:coach`;
  const coachSeasons = career.coach?.history ?? [];
  const coachFresh = coachSeasons.slice(club.credited[coachKey] ?? 0);
  for (const s of coachFresh) gained += coachCoins(s);

  // Familie und Vermögen: Einnahmen aus Kindern, Mieten und Dividenden.
  const hhKey = `${career.id}:hh`;
  const hhTotal = career.household?.totalIncome ?? 0;
  // Kann negativ sein, wenn die Erziehung mehr kostet als Kinder und Vermögen einbringen.
  const hhFresh = hhTotal - (club.credited[hhKey] ?? 0);
  gained += hhFresh;

  const icon = career.phase === 'retired' && career.history.length && !club.specials.some((c) => c.id === iconId(career))
    ? careerIcon(career)
    : null;
  if (!fresh.length && !coachFresh.length && !icon && !hhFresh) return { club, gained: 0, seasons: 0, icon: null };
  return {
    club: {
      ...club,
      coins: Math.max(0, club.coins + gained),
      specials: icon ? [...club.specials, icon] : club.specials,
      credited: { ...club.credited, [career.id]: career.history.length, [coachKey]: coachSeasons.length, [hhKey]: hhTotal },
    },
    gained,
    seasons: fresh.length + coachFresh.length,
    icon,
  };
}

/** Coins für eine Trainersaison: Grundbetrag, Platzierung über den Erwartungen und Titel. */
export function coachCoins(s: CoachSeason): number {
  return 250 + Math.max(0, s.expected - s.position) * 60 + s.trophies.length * 500;
}

const iconId = (career: Career) => `own-icon-${career.id}`;

/**
 * Die eigene Ikonen-Karte nach dem Karriereende: Bestwert der Karriere plus Bonus für Titel,
 * Ballon d’Or, Legendenstatus und eine Heimkehr. Verein ist der, für den am meisten Spiele gemacht wurden.
 */
export function careerIcon(career: Career): CollectCard {
  const s = summarizeCareer(career);
  const p = career.player;
  const atHome = !!career.homecoming && p.contract.clubId === homeClubOf(career);
  const bonus = Math.min(5, Math.floor(s.titles / 4) + s.ballonDor + (s.legends ? 1 : 0) + (atHome ? 1 : 0));
  const apps: Record<string, number> = {};
  for (const r of career.history) apps[r.clubId] = (apps[r.clubId] ?? 0) + r.apps;
  const clubId = Object.entries(apps).sort((a, b) => b[1] - a[1])[0]?.[0] ?? p.contract.clubId;
  return {
    id: iconId(career),
    name: p.name,
    position: p.position,
    nation: p.nation,
    club: getClub(clubId).name,
    league: getLeague(getClub(clubId).leagueId).name,
    ovr: Math.min(99, s.peak + bonus),
    variant: 'icon',
    label: career.destroyed ? 'Gefallener Star' : atHome ? 'Heimkehr-Ikone' : 'Karriere-Ikone',
  };
}

export function specialToCard(careerId: string, s: SpecialCard): CollectCard {
  return {
    id: `own-${careerId}-${s.season}-${s.type}`,
    name: s.name,
    position: s.position,
    nation: s.nation,
    club: getClub(s.clubId).name,
    league: getLeague(getClub(s.clubId).leagueId).name,
    ovr: s.ovr,
    variant: s.type,
    label: `Saison ${s.season}`,
  };
}

// ---------- Items im Karrieremodus ----------
export function canUseItem(career: Career, kind: ItemKind): boolean {
  if (career.phase === 'retired' || career.phase === 'final') return false;
  const p = career.player;
  if (kind === 'fitness') return (career.progress?.injuredFor ?? 0) > 0 || (p.carryInjuryWeeks ?? 0) > 0;
  const season = career.history.length ? career.year : career.startYear;
  return p.ovr < p.potential && career.boostSeason !== String(season);
}

export function applyItem(prev: Career, kind: ItemKind): Career {
  if (!canUseItem(prev, kind)) return prev;
  const career: Career = structuredClone(prev);
  if (kind === 'fitness') {
    if (career.progress) career.progress.injuredFor = 0;
    career.player.carryInjuryWeeks = 0;
  } else {
    career.player.ovr += 1;
    career.boostSeason = String(career.history.length ? career.year : career.startYear);
  }
  career.updatedAt = Date.now();
  return career;
}

/** Die aktuelle Karte des eigenen Spielers – nach dem Karriereende seine Ikonen-Karte. */
export function careerCard(career: Career): CollectCard {
  const p = career.player;
  if (career.phase === 'retired' && career.history.length) return careerIcon(career);
  const tier = cardTier(p.ovr);
  return {
    id: `cur-${career.id}`,
    name: p.name,
    position: p.position,
    nation: p.nation,
    club: getClub(p.loan ? p.loan.clubId : p.contract.clubId).name,
    ovr: p.ovr,
    variant: tier === 'bronze' ? 'silver' : tier,
  };
}

// ---------- Karten verbessern ----------
// Jede Stufe kostet 20 % mehr als die vorige: 80→81 ≈ 3.850, 90→91 ≈ 23.750, 98→99 ≈ 102.000 Coins.
// Von 90 auf 99 sind es zusammen rund 494.000 Coins – 99er-Karten bleiben etwas Besonderes.
export const MAX_CARD_OVR = 99;

/** Preis, um eine Karte von `ovr` auf `ovr + 1` zu verbessern. */
export function upgradeCost(ovr: number): number {
  return Math.max(100, Math.round((100 * 1.2 ** (ovr - 60)) / 50) * 50);
}

/** Gesamtpreis von `ovr` bis 99. */
export function costTo99(ovr: number): number {
  let sum = 0;
  for (let o = ovr; o < MAX_CARD_OVR; o++) sum += upgradeCost(o);
  return sum;
}

/** Karte mit eingerechneter Verbesserung. */
export function withUpgrade(club: Pick<ClubState, 'upgrades'>, card: CollectCard): CollectCard {
  const boost = club.upgrades?.[card.id] ?? 0;
  if (!boost) return card;
  return { ...card, ovr: Math.min(MAX_CARD_OVR, card.ovr + boost), boost };
}

/** Karte um einen Punkt verbessern. Gibt null zurück, wenn es nicht geht (nicht im Besitz, schon 99, zu wenig Coins). */
export function upgradeCard(club: ClubState, id: string): ClubState | null {
  const base = getCard(id) ?? club.specials.find((s) => s.id === id);
  const owned = (club.cards[id] ?? 0) > 0 || club.specials.some((s) => s.id === id);
  if (!base || !owned) return null;
  const card = withUpgrade(club, base);
  if (card.ovr >= MAX_CARD_OVR) return null;
  const cost = upgradeCost(card.ovr);
  if (club.coins < cost) return null;
  return {
    ...club,
    coins: club.coins - cost,
    upgrades: { ...(club.upgrades ?? {}), [id]: (club.upgrades?.[id] ?? 0) + 1 },
  };
}
