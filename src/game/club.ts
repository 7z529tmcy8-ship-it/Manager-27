import type { Avatar } from './creator';
import { FAILED_TALENTS, LEGENDS } from '../data/legends';
import { REAL_PLAYERS } from '../data/players';
import { CULT_HEROES, DEBUT_CARDS, EXTRA_ICONS, EXTRA_STARS, EXTRA_TALENTS, HALLOWEEN_CARDS } from '../data/cards';
import { getClub, getLeague, slugify } from '../data/leagues';
import { summarizeCareer } from './legacy';
import { homeClubOf } from './offers';
import { cardTier } from './player';
import type { Career, CoachSeason, Position, SeasonRecord, SpecialCard, SpecialType } from './types';

// „Club“ über alle Karrieren hinweg: Coins, gesammelte Karten, Items. Angelehnt an Karten-Sammelmodi,
// aber mit eigenen Namen und Designs. Coins verdient man nur im Karrieremodus – kein echtes Geld.

/** Auszeichnungs-Karten, die man am Karriereende statt der Ikone wählen kann. */
export type AwardVariant = 'ballondor' | 'poty' | 'topscorer' | 'goldenboy' | 'ucl' | 'worldcup';
export type CardVariant = 'silver' | 'gold' | 'gold-rare' | 'icon' | 'talent' | 'cult' | 'moment' | 'present' | 'halloween' | 'debut' | AwardVariant | SpecialType;

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
  /** Gezeichnetes Gesicht (eigene Spieler) statt Initialen. */
  avatar?: Avatar;
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
  /** Freundes-Teams, gegen die schon einmal gewonnen wurde (Kennungen). */
  friendsBeaten?: string[];
  /** Name der eigenen Elf für Freunde-Duelle. */
  teamName?: string;
  /** Zufällige Kennung für Team-Codes (damit Freunde dich wiedererkennen). */
  ownerId?: string;
  /** Gespeicherte Freunde mit Team und Duell-Verlauf. */
  friends?: import('./friends').FriendEntry[];
  /** Das einmalige Gratis-„Mega-XXL-Pack“ schon geöffnet? */
  megaXxlClaimed?: boolean;
  /** Das einmalige Gratis-„Mega-Super-XXL-Pack“ (echt, mit Gervinho) schon geöffnet? */
  megaSuperClaimed?: boolean;
  /** Gewählte Formation in „Mein Team“ (Standard 4-3-3). */
  formation?: import('./squad').FormationId;
  /** Abgeschlossene Trades in der Tauschbörse. */
  tradesDone?: number;
  /** Karriereende: gewählte Belohnungskarte je Karriere (Karriere-ID → Karten-ID). */
  rewardChosen?: Record<string, string>;
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
  ...CULT_HEROES.map(([name, nation, position, ovr, club]) => ({ id: cardId(name), name, position, nation, club, ovr, variant: 'cult' as const })),
  ...FAILED_TALENTS.map((l) => ({ id: cardId(l.name), name: l.name, position: l.position, nation: l.nation, club: 'Zweite Chance', ovr: l.potential, variant: 'talent' as const, label: 'Was wäre wenn' })),
  ...HALLOWEEN_CARDS.map(([name, nation, position, ovr, label]) => ({ id: cardId(`${name} Halloween`), name, position, nation, club: 'Halloween', ovr, variant: 'halloween' as const, label })),
  ...EXTRA_TALENTS.map(([name, nation, position, ovr]) => ({ id: cardId(name), name, position, nation, club: 'Zweite Chance', ovr, variant: 'talent' as const, label: 'Was wäre wenn' })),
  ...DEBUT_CARDS.map(([name, nation, position, ovr, club, year]) => ({ id: cardId(`${name} Debüt`), name, position, nation, club, ovr, variant: 'debut' as const, label: `${club} · ${year}` })),
];
export const getCard = (id: string) => CARD_POOL.find((c) => c.id === id);

/** Schnellverkaufswert einer Karte in Coins. */
export function sellValue(c: CollectCard): number {
  if (c.variant === 'icon' || ['ballondor', 'poty', 'topscorer', 'goldenboy', 'ucl', 'worldcup'].includes(c.variant)) return 4000;
  if (c.variant === 'talent') return 800;
  if (c.variant === 'cult' || c.variant === 'debut') return 1500;
  if (c.variant === 'gold-rare') return 900 + (c.ovr - 85) * 150;
  if (c.variant === 'gold') return 250;
  return 80;
}

/** Seltenheit für Sortierung und „bester Zug“. */
export function rarity(c: CollectCard): number {
  const base = { silver: 0, gold: 1, 'gold-rare': 2, talent: 2.5, cult: 2.7, icon: 4, moment: 3.6, present: 3.4, halloween: 3.5, debut: 2.8, ballondor: 4.2, poty: 3.8, topscorer: 3.7, goldenboy: 3.7, ucl: 3.8, worldcup: 4, tots: 3, potm: 3, record: 3, champion: 3 }[c.variant];
  return base * 100 + c.ovr;
}

// ---------- Packs ----------
// Jede Karte im Pack wird einzeln ausgewürfelt: erst die Stufe (nach festen Wahrscheinlichkeiten, die der Store
// offen anzeigt), dann eine Karte dieser Stufe – innerhalb der Stufe sind die schwächeren Karten häufiger.

export type PackTier = 'silver' | 'gold' | 'rare' | 'elite' | 'special' | 'icon';
/** Reihenfolge von schwach nach stark. */
const TIERS: PackTier[] = ['silver', 'gold', 'rare', 'elite', 'special', 'icon'];

/** Stufe einer Karte für Packs: Silber < 75, Gold 75–82, Selten 83–86, Elite 87+, Spezial (Kult/Was wäre wenn), Ikone. */
export function packTier(c: CollectCard): PackTier {
  if (c.variant === 'icon') return 'icon';
  if (c.variant === 'talent' || c.variant === 'cult' || c.variant === 'halloween' || c.variant === 'debut') return 'special';
  return c.ovr >= 87 ? 'elite' : c.ovr >= 83 ? 'rare' : c.ovr >= 75 ? 'gold' : 'silver';
}

/** Wahrscheinlichkeiten pro Stufe in Prozent. */
export type PackOdds = Partial<Record<PackTier, number>>;

export interface PackDef {
  id: string;
  name: string;
  price: number;
  size: number;
  text: string;
  /** Welche Karten überhaupt vorkommen können (z. B. nur Deutsche). */
  filter?: (c: CollectCard) => boolean;
  /** Chancen für jede Karte … */
  odds: PackOdds;
  /** … außer der ersten, wenn die eigene Chancen bzw. eine eigene Auswahl hat (Garantie). */
  first?: { odds: PackOdds; filter?: (c: CollectCard) => boolean };
  /** Event-Pack: nur im Event-Zeitraum im Store, nur hier gibt es die Event-Karten. */
  event?: 'halloween';
}

const BL = (c: CollectCard) => c.league === 'Bundesliga';
const GOLD_FILL: PackOdds = { gold: 85, rare: 13, elite: 2 };

export const PACKS: PackDef[] = [
  {
    id: 'standard', name: 'Standard-Pack', price: 6000, size: 3, text: '3 Karten, meist Silber und Gold.',
    odds: { silver: 70, gold: 26.5, rare: 3, elite: 0.4, special: 0.08, icon: 0.02 },
  },
  {
    id: 'gold', name: 'Gold-Pack', price: 22500, size: 3, text: '3 Karten ab 75, kleine Chance auf mehr.',
    odds: { gold: 88, rare: 10, elite: 1.5, special: 0.4, icon: 0.1 },
  },
  {
    id: 'premium', name: 'Premium-Pack', price: 60000, size: 4, text: '4 Karten ab 75, die beste garantiert ab 83 oder eine Spezialkarte.',
    odds: { gold: 85, rare: 12, elite: 2.5, special: 0.4, icon: 0.1 },
    first: { odds: { rare: 80, elite: 15, special: 3.5, icon: 1.5 } },
  },
  {
    id: 'jumbo', name: 'Jumbo-Pack', price: 16000, size: 9, text: '9 Karten, meist Silber und Gold – viel Futter für die Sammlung.',
    odds: { silver: 62, gold: 33, rare: 4, elite: 0.8, special: 0.15, icon: 0.05 },
  },
  {
    id: 'megagold', name: 'Mega-Gold-Pack', price: 60000, size: 9, text: '9 Karten ab 75 – neun Chancen auf etwas Großes.',
    odds: { gold: 86, rare: 11.5, elite: 2, special: 0.4, icon: 0.1 },
  },
  {
    id: 'ultimate', name: 'Ultimate-Pack', price: 240000, size: 9, text: '9 Karten ab 75, die beste garantiert ein Weltstar ab 87, eine Spezialkarte oder eine Ikone.',
    odds: { gold: 78, rare: 18, elite: 3.5, special: 0.4, icon: 0.1 }, first: { odds: { elite: 80, special: 14, icon: 6 } },
  },
  {
    id: 'pumpkin', name: 'Kürbis-Pack', price: 30_000, size: 4, event: 'halloween',
    text: '4 Karten – eine Halloween-Kostümkarte (88–96) ist garantiert. Nur bis 2. November!',
    odds: GOLD_FILL, first: { odds: { special: 100 }, filter: (c) => c.variant === 'halloween' },
  },
  {
    id: 'ghosthour', name: 'Geisterstunde-Pack', price: 150_000, size: 6, event: 'halloween',
    text: '6 Karten ab 83 – garantiert ein Top-Kostüm ab 92. Nur bis 2. November!',
    odds: { rare: 78, elite: 18, special: 4 }, first: { odds: { special: 100 }, filter: (c) => c.variant === 'halloween' && c.ovr >= 92 },
  },
  {
    id: 'mystery', name: 'Wundertüte', price: 9000, size: 1, text: '1 völlig zufällige Karte – von Silber bis Ikone ist alles drin.',
    odds: { silver: 55, gold: 33, rare: 8, elite: 2.5, special: 1, icon: 0.5 },
  },
  {
    id: 'germany', name: 'Deutschland-Pack', price: 18000, size: 3, text: '3 deutsche Spieler – mit viel Glück eine deutsche Ikone.',
    filter: (c) => c.nation === 'Deutschland', odds: { silver: 40, gold: 50, rare: 8, elite: 1.5, special: 0.3, icon: 0.2 },
  },
  {
    id: 'bundesliga', name: 'Bundesliga-Pack', price: 18000, size: 3, text: '3 Spieler aus der Bundesliga, gute Chemie garantiert.',
    filter: BL, odds: { silver: 40, gold: 50, rare: 8, elite: 2 },
  },
  {
    id: 'wonder', name: 'Wunderkind-Pack', price: 27000, size: 3, text: '3 Talente bis 21 Jahre – die Stars von morgen.',
    filter: (c) => c.age !== undefined && c.age <= 21, odds: { silver: 35, gold: 50, rare: 13, elite: 2 },
  },
  {
    id: 'cult', name: 'Kult-Pack', price: 36000, size: 2, text: '1 garantierter Kult-Held (Riquelme, Ailton, Quaresma …) plus eine Gold-Karte.',
    odds: GOLD_FILL, first: { odds: { special: 100 }, filter: (c) => c.variant === 'cult' },
  },
  {
    id: 'debut', name: 'Debüt-Pack', price: 45000, size: 3, text: '1 garantierte Debüt-Karte (Messi 2004, Mbappé 2015, Yamal 2023 …) plus zwei Gold-Karten.',
    odds: GOLD_FILL, first: { odds: { special: 100 }, filter: (c) => c.variant === 'debut' },
  },
  {
    id: 'worldstar', name: 'Weltstar-Pack', price: 90000, size: 2, text: '2 Karten, die beste ab 83 oder Ikone – gute Chance auf einen Weltstar ab 87.',
    odds: { gold: 70, rare: 27, elite: 3 }, first: { odds: { rare: 65, elite: 32, icon: 3 } },
  },
  {
    id: 'icon', name: 'Ikonen-Pack', price: 180000, size: 2, text: '1 garantierte Ikone plus eine Gold-Karte.',
    odds: GOLD_FILL, first: { odds: { icon: 100 } },
  },
  {
    id: 'goat', name: 'GOAT-Pack', price: 450000, size: 1, text: 'Eine Ikone ab 94 garantiert: Pelé, Maradona, Cruyff, Ronaldo …',
    odds: { icon: 100 }, filter: (c) => c.variant === 'icon' && c.ovr >= 94,
  },
];

/** Chance (in %), dass eine einzelne Karte mindestens diese Stufe hat – für die Anzeige im Store. */
export function oddsAtLeast(odds: PackOdds, tier: PackTier): number {
  const total = TIERS.reduce((a, t) => a + (odds[t] ?? 0), 0);
  const from = TIERS.indexOf(tier);
  return (TIERS.slice(from).reduce((a, t) => a + (odds[t] ?? 0), 0) / total) * 100;
}

function rollTier(odds: PackOdds, rand: () => number): PackTier {
  const total = TIERS.reduce((a, t) => a + (odds[t] ?? 0), 0);
  let r = rand() * total;
  for (const t of TIERS) {
    r -= odds[t] ?? 0;
    if (r < 0) return t;
  }
  return 'silver';
}

/** Eine Karte ziehen: Stufe würfeln, dann innerhalb der Stufe (schwächere häufiger). Leere Stufe → nächstschwächere. */
function drawCard(odds: PackOdds, filter: (c: CollectCard) => boolean, taken: CollectCard[], rand: () => number): CollectCard {
  const pool = CARD_POOL.filter((c) => filter(c) && !taken.includes(c));
  const rolled = TIERS.indexOf(rollTier(odds, rand));
  // Erst abwärts suchen, notfalls aufwärts – so gibt es nie ein leeres Pack.
  const order = [...TIERS.slice(0, rolled + 1).reverse(), ...TIERS.slice(rolled + 1)];
  for (const t of order) {
    const list = pool.filter((c) => packTier(c) === t);
    if (!list.length) continue;
    const min = Math.min(...list.map((c) => c.ovr));
    return weightedPick(list, (c) => Math.exp(-(c.ovr - min) / 4), rand);
  }
  return pool[0];
}

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
  // Event-Karten (Halloween) gibt es nur in Event-Packs.
  const allowed = (c: CollectCard) => !!pack.event || c.variant !== 'halloween';
  const base = (c: CollectCard) => allowed(c) && (pack.filter ? pack.filter(c) : true);
  for (let i = 0; i < pack.size; i++) {
    const slot = i === 0 ? pack.first : undefined;
    const slotFilter = slot?.filter;
    chosen.push(drawCard(slot?.odds ?? pack.odds, slotFilter ? (c) => allowed(c) && slotFilter(c) : base, chosen, rand));
  }
  const cards = { ...club.cards };
  const result: PackResult = { cards: [], items: [] };
  for (const c of chosen.sort((a, b) => rarity(b) - rarity(a))) {
    result.cards.push({ card: c, duplicate: (cards[c.id] ?? 0) > 0 });
    cards[c.id] = (cards[c.id] ?? 0) + 1;
  }
  return {
    club: { ...club, coins: club.coins - (free ? 0 : pack.price), cards, packsOpened: club.packsOpened + 1 },
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
 * Sonderkarten einzelner Saisons gibt es nicht mehr – nach dem Karriereende wählt man genau eine eigene Karte
 * (Ikone oder eine Auszeichnungs-Karte, siehe careerRewardOptions). Das passiert nicht hier, sondern über chooseCareerReward.
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

  if (!fresh.length && !coachFresh.length && !hhFresh) return { club, gained: 0, seasons: 0, icon: null };
  return {
    club: {
      ...club,
      coins: Math.max(0, club.coins + gained),
      credited: { ...club.credited, [career.id]: career.history.length, [coachKey]: coachSeasons.length, [hhKey]: hhTotal },
    },
    gained,
    seasons: fresh.length + coachFresh.length,
    icon: null,
  };
}

/** Wartet diese beendete Karriere noch auf die Wahl der Belohnungskarte? (Alte Spielstände mit Ikone zählen als erledigt.) */
export function rewardPending(club: ClubState, career: Career): boolean {
  return career.phase === 'retired' && career.history.length > 0 && !club.rewardChosen?.[career.id] &&
    !club.specials.some((c) => c.id === iconId(career));
}

/**
 * Wahl am Karriereende: immer die eigene Ikone, dazu je eine Karte für jede große Auszeichnung der Karriere.
 * Grundlage ist die beste Saison mit dieser Auszeichnung, mehrfache Gewinne geben etwas mehr.
 */
export function careerRewardOptions(career: Career): CollectCard[] {
  const p = career.player;
  const opts: CollectCard[] = [careerIcon(career)];
  const add = (variant: AwardVariant, test: (r: SeasonRecord) => boolean, bonus: number, one: (season: string) => string, many: (n: number) => string) => {
    const hits = career.history.filter(test);
    if (!hits.length) return;
    const best = [...hits].sort((a, b) => b.ovrEnd - a.ovrEnd)[0];
    const club = getClub(best.clubId);
    opts.push({
      id: `own-award-${career.id}-${variant}`,
      name: p.name, position: p.position, nation: p.nation,
      club: club.name, league: getLeague(club.leagueId).name,
      ovr: Math.min(99, best.ovrEnd + bonus + Math.min(3, hits.length - 1)),
      variant,
      label: hits.length > 1 ? many(hits.length) : one(best.season),
      avatar: p.avatar,
    });
  };
  const year = (r: SeasonRecord, prefix: string) => r.trophies.find((t) => t.startsWith(prefix))?.slice(prefix.length).trim() ?? r.season;
  add('ballondor', (r) => r.awards.includes('Ballon d’Or'), 3, (s) => `Ballon d’Or ${s}`, (n) => `${n}× Ballon d’Or`);
  add('worldcup', (r) => r.trophies.some((t) => t.startsWith('Weltmeisterschaft')), 3,
    (s) => `Weltmeister ${year(career.history.find((r) => r.season === s)!, 'Weltmeisterschaft')}`, (n) => `${n}× Weltmeister`);
  add('ucl', (r) => r.trophies.includes('Champions League'), 2, (s) => `Champions League ${s}`, (n) => `${n}× Champions League`);
  add('poty', (r) => r.awards.some((a) => a.startsWith('Spieler der Saison')), 2, (s) => `Spieler des Jahres ${s}`, (n) => `${n}× Spieler des Jahres`);
  add('topscorer', (r) => r.awards.some((a) => a.startsWith('Torschützenkönig')), 2, (s) => `Torschützenkönig ${s}`, (n) => `${n}× Torschützenkönig`);
  add('goldenboy', (r) => r.awards.includes('Golden Boy'), 5, (s) => `Golden Boy ${s}`, () => 'Golden Boy');
  return opts;
}

/** Belohnungskarte wählen: kommt in die Sammlung, die Wahl ist endgültig. */
export function chooseCareerReward(club: ClubState, career: Career, cardId: string): ClubState {
  const card = careerRewardOptions(career).find((c) => c.id === cardId);
  if (!card || !rewardPending(club, career)) return club;
  return { ...club, specials: [...club.specials, card], rewardChosen: { ...club.rewardChosen, [career.id]: card.id } };
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
    avatar: p.avatar,
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

/** Die aktuelle Karte des eigenen Spielers – nach dem Karriereende die gewählte Belohnungskarte (sonst die Ikone). */
export function careerCard(career: Career, club?: ClubState): CollectCard {
  const p = career.player;
  const chosen = club?.rewardChosen?.[career.id];
  if (chosen) {
    const card = club!.specials.find((c) => c.id === chosen);
    if (card) return card;
  }
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
    avatar: p.avatar,
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

// ---------- Mega Super XXL Pack (einmalig, gratis) ----------
/** Geschenk-Sonderkarte aus dem Mega Super XXL Pack. */
export const GERVINHO_GIFT: CollectCard = {
  id: 'gift-gervinho', name: 'Gervinho', position: 'FL', nation: 'Elfenbeinküste', club: 'AS Rom', league: 'Serie A', ovr: 89, variant: 'present', label: 'Geschenk',
};
export const MEGA_SUPER_SIZE = 8;

/** Das echte Mega Super XXL Pack: Gervinho (89) plus 8 verschiedene Karten ab 85. Nur einmal. */
export function openMegaSuper(club: ClubState, rand = Math.random): { club: ClubState; result: PackResult } | null {
  if (club.megaSuperClaimed) return null;
  const pool = CARD_POOL.filter((c) => c.ovr >= 85 && c.variant !== 'talent');
  const picked: CollectCard[] = [];
  while (picked.length < MEGA_SUPER_SIZE && pool.length) picked.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  picked.sort((a, b) => rarity(b) - rarity(a));
  const cards = { ...club.cards };
  const result: PackResult = { cards: [{ card: GERVINHO_GIFT, duplicate: club.specials.some((s) => s.id === GERVINHO_GIFT.id) }], items: [] };
  for (const c of picked) {
    result.cards.push({ card: c, duplicate: (cards[c.id] ?? 0) > 0 });
    cards[c.id] = (cards[c.id] ?? 0) + 1;
  }
  const specials = club.specials.some((s) => s.id === GERVINHO_GIFT.id) ? club.specials : [...club.specials, GERVINHO_GIFT];
  return { club: { ...club, cards, specials, megaSuperClaimed: true, packsOpened: club.packsOpened + 1 }, result };
}

// ---------- Halloween-Event ----------
/** Letzter Tag des Halloween-Events (Ortszeit des Geräts). */
export const HALLOWEEN_END = new Date(2026, 10, 2, 23, 59, 59);
export const halloweenActive = (now = new Date()) => now <= HALLOWEEN_END;
/** Packs, die gerade im Store stehen (Event-Packs nur im Event-Zeitraum). */
export const activePacks = (now = new Date()) => PACKS.filter((p) => !p.event || (p.event === 'halloween' && halloweenActive(now)));
