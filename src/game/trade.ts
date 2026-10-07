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

const NAMES = ['Alex der Yogi', 'Hamudi California', 'Rene Dost', 'Dore65', 'Karsten Boss', 'Alpha67', 'Yo Olli', 'Barello'];
let lastName = '';
const AVATARS = ['😎', '🤠', '🧢', '🐸', '🦊', '🤑', '🥸', '👽', '🐒', '🧌'];

export const TRADER_LINES = {
  hello: ['jo bro 👋', 'GiG!', 'sei mal leise ya ayri', 'servus, fairer tausch?', 'hab genau was du brauchst 🔥', 'ehrenmann am start 🤝', 'na, tauschen? 😏'],
  adding: ['moment, such was richtig gutes raus', 'warte, die hier ist SELTEN', 'die ist mega wertvoll, glaub mir', 'hab extra für dich die besten genommen', 'pass auf, jetzt kommt die beste', 'sei mal leise ya ayri, ich such noch', 'GiG! die hier ist krank'],
  done: ['Anik Achu Sharmuta 😂', 'GiG!', 'sei mal leise ya ayri', 'fairer deal 🤝', 'gg ez', 'war mir eine ehre 😇', 'nicht weitersagen 🤫', 'beste trade deines lebens'],
};

/** Vertrauenswürdig wirkende Kennzahlen – frei erfunden. */
export function randomTrader(rand: () => number = Math.random): Trader {
  const pickR = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  // Abwechselnd: nie zweimal hintereinander derselbe Tauschpartner.
  const name = pickR(NAMES.filter((n) => n !== lastName));
  lastName = name;
  return {
    name,
    avatar: pickR(AVATARS),
    rating: (4.8 + Math.floor(rand() * 3) / 10).toFixed(1).replace('.', ','),
    trades: 800 + Math.floor(rand() * 9000),
  };
}

/** Die schlechtesten Karten im Spiel – genau die bietet der Tauschpartner an. */
export const JUNK_POOL: CollectCard[] = CARD_POOL.filter((c) => c.variant === 'silver')
  .sort((a, b) => a.ovr - b.ovr)
  .slice(0, 20);

export function junkCards(rand: () => number = Math.random, n = TRADE_SIZE): CollectCard[] {
  const pool = [...JUNK_POOL];
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
export function doTrade(club: ClubState, offerIds: string[], rand: () => number = Math.random): { club: ClubState; got: CollectCard[] } | null {
  if (offerIds.length !== TRADE_SIZE || new Set(offerIds).size !== TRADE_SIZE) return null;
  if (offerIds.some((id) => !getCard(id) || !(club.cards[id] > 0))) return null;
  const cards = { ...club.cards };
  for (const id of offerIds) {
    cards[id] -= 1;
    if (cards[id] <= 0) delete cards[id];
  }
  const got = junkCards(rand);
  for (const c of got) cards[c.id] = (cards[c.id] ?? 0) + 1;
  const squad = club.squad.map((id) => (id && !cards[id] && !club.specials.some((s) => s.id === id) ? null : id));
  return { club: { ...club, cards, squad, tradesDone: (club.tradesDone ?? 0) + 1 }, got };
}
