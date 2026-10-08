import { CARD_POOL, getCard, type ClubState, type CollectCard } from './club';

// Tauschbörse – eine Witz-Abteilung: Es sieht aus wie ein Tausch mit einem echten Spieler,
// aber der „Tauschpartner“ legt immer die schlechtesten Karten rein. Ablehnen geht nicht.

export const TRADE_SIZE = 3;

export interface Trader {
  name: string;
  avatar: string;
  rating: string;
  trades: number;
}

const NAMES = ['Alex der Yogi', 'Hamudi California', 'Rene Dost', 'Dore65', 'Karsten Boss', 'Alpha67', 'Yo Olli', 'Barello', 'Arafat', 'Paulm67', 'Leontin-296', 'Masi'];
let lastName = '';
const AVATARS = ['😎', '🤠', '🧢', '🐸', '🦊', '🤑', '🥸', '👽', '🐒', '🧌'];

export const TRADER_LINES = {
  hello: ['jo', 'GiG!', 'sei mal leise ya ayri', 'du piç', 'fairer tausch?', 'na'],
  adding: ['die ist selten', 'warte', 'sei mal leise ya ayri', 'GiG!', 'du piç', 'beste karte'],
  done: ['Anik Achu Sharmuta 😂', 'GiG!', 'sei mal leise ya ayri', 'du piç', 'gg ez', 'fair 🤝'],
};

/** Kennzahlen – frei erfunden. Die Bewertung ist immer mies (1,0–2,3 Sterne). */
export function randomTrader(rand: () => number = Math.random): Trader {
  const pickR = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  // Abwechselnd: nie zweimal hintereinander derselbe Tauschpartner.
  const name = pickR(NAMES.filter((n) => n !== lastName));
  lastName = name;
  return {
    name,
    avatar: pickR(AVATARS),
    rating: (1 + Math.floor(rand() * 14) / 10).toFixed(1).replace('.', ','),
    trades: 800 + Math.floor(rand() * 9000),
  };
}

// Geheimer Tauschpartner: Wer in der Spielersuche „ChefJakob“ eingibt, bekommt einen, der nur Ikonen reinlegt.
export const SECRET_NAME = 'ChefJakob';
export const isSecretTrader = (name: string) => name.trim().toLowerCase() === SECRET_NAME.toLowerCase();
export const CHEF: Trader = { name: SECRET_NAME, avatar: '👨‍🍳', rating: '5,0', trades: 7 };
export const CHEF_LINES = { hello: ['hey 👑'], adding: ['für dich'], done: ['viel spaß damit 👑'] };

/** Ikonen, aber nicht die ganz großen (bis 90). */
export const ICON_POOL: CollectCard[] = CARD_POOL.filter((c) => c.variant === 'icon' && c.ovr <= 90);

/** Die schlechtesten Karten im Spiel – genau die bietet der Tauschpartner an. */
export const JUNK_POOL: CollectCard[] = CARD_POOL.filter((c) => c.variant === 'silver')
  .sort((a, b) => a.ovr - b.ovr)
  .slice(0, 20);

export function junkCards(rand: () => number = Math.random, n = TRADE_SIZE, from: CollectCard[] = JUNK_POOL): CollectCard[] {
  const pool = [...from];
  const out: CollectCard[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

/** Karten, die man anbieten darf: alle gezogenen Karten (keine eigenen Karriere-Karten). */
export const tradeable = (club: ClubState): CollectCard[] =>
  Object.entries(club.cards).filter(([id, n]) => n > 0 && getCard(id)).map(([id]) => getCard(id)!);

/**
 * Tausch sofort durchführen (es gibt kein Zurück): die eigenen Karten gehen weg, die Schrottkarten kommen.
 * Gibt null zurück, wenn das Angebot ungültig ist.
 */
export function doTrade(
  club: ClubState,
  offerIds: string[],
  rand: () => number = Math.random,
  partner: 'random' | 'chef' = 'random',
): { club: ClubState; got: CollectCard[] } | null {
  if (offerIds.length !== TRADE_SIZE || new Set(offerIds).size !== TRADE_SIZE) return null;
  if (offerIds.some((id) => !getCard(id) || !(club.cards[id] > 0))) return null;
  const cards = { ...club.cards };
  for (const id of offerIds) {
    cards[id] -= 1;
    if (cards[id] <= 0) delete cards[id];
  }
  const got = junkCards(rand, TRADE_SIZE, partner === 'chef' ? ICON_POOL : JUNK_POOL);
  for (const c of got) cards[c.id] = (cards[c.id] ?? 0) + 1;
  const squad = club.squad.map((id) => (id && !cards[id] && !club.specials.some((s) => s.id === id) ? null : id));
  return { club: { ...club, cards, squad, tradesDone: (club.tradesDone ?? 0) + 1 }, got };
}

// Entwickler-Schalter für die Tauschbörse (nur in diesem Browser).
export interface DevTrade { drop?: 'force' | 'never' | null; chef?: boolean; name?: string }
const DEV_TRADE_KEY = 'fc-dev-trade';
export function readDevTrade(): DevTrade {
  try {
    return JSON.parse(localStorage.getItem(DEV_TRADE_KEY) ?? '{}') as DevTrade;
  } catch {
    return {};
  }
}
export function writeDevTrade(d: DevTrade): void {
  try {
    localStorage.setItem(DEV_TRADE_KEY, JSON.stringify(d));
  } catch {
    // privater Modus
  }
}
