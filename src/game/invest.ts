import { getClub, getLeague } from '../data/leagues';
import { householdOf } from './family';
import { clubLeagueId, clubStrength } from './player';
import { clamp, normal, rand } from './random';
import type { Career } from './types';

// Investitionen (in Coins): Immobilien bringen Miete und schwanken im Wert, Anteile an Fußballklubs bringen
// Dividenden – mehr, wenn der Klub im Europapokal spielt. Der Anteilspreis folgt der Stärke des Klubs:
// Wer früh bei einem Aufsteiger einsteigt, gewinnt. Alle Einnahmen landen am Jahresende im Club.

export interface Property {
  id: string;
  icon: string;
  name: string;
  price: number;
  /** Miete pro Jahr in Prozent des aktuellen Werts. */
  rent: number;
  /** Erwartete Wertsteigerung pro Jahr. */
  growth: number;
  /** Schwankung pro Jahr (Standardabweichung). */
  volatility: number;
}

export const PROPERTIES: Property[] = [
  { id: 'flat', icon: '🏢', name: 'Wohnung in Hannover-List', price: 12_000, rent: 0.06, growth: 0.02, volatility: 0.04 },
  { id: 'townhouse', icon: '🏡', name: 'Stadthaus in Hamburg', price: 40_000, rent: 0.05, growth: 0.03, volatility: 0.06 },
  { id: 'loft', icon: '🏙️', name: 'Loft in Berlin-Mitte', price: 75_000, rent: 0.045, growth: 0.035, volatility: 0.07 },
  { id: 'villa', icon: '🌴', name: 'Villa in Marbella', price: 150_000, rent: 0.04, growth: 0.04, volatility: 0.09 },
  { id: 'penthouse', icon: '🌆', name: 'Penthouse in Dubai', price: 300_000, rent: 0.055, growth: 0.03, volatility: 0.14 },
  { id: 'hotel', icon: '🏨', name: 'Boutique-Hotel am Gardasee', price: 600_000, rent: 0.07, growth: 0.02, volatility: 0.1 },
];

export const getProperty = (id: string) => PROPERTIES.find((p) => p.id === id)!;

/** Gebühr beim Verkauf (Makler, Notar). */
export const SELL_FEE = 0.03;
/** Höchstens so viele Prozent eines Klubs kann man kaufen. */
export const MAX_STAKE = 49;
/** Dividende pro Jahr in Prozent des Anteilswerts. */
export const DIVIDEND = 0.04;
export const EUROPE_BONUS = 0.03;

/** Preis für 1 % eines Klubs – steigt steil mit der Stärke (Bayern ≈ 65.000, Hannover ≈ 3.300 Coins). */
export function sharePrice(career: Career, clubId: string): number {
  return Math.max(100, Math.round((800 * 1.17 ** (clubStrength(career, clubId) - 60)) / 50) * 50);
}

/** Status als Anteilseigner. */
export function stakeLabel(percent: number): string {
  return percent >= 25 ? 'Sperrminorität – Sitz im Aufsichtsrat' : percent >= 10 ? 'Großaktionär' : 'Aktionär';
}

/** Gesamtwert des Vermögens (Immobilien + Anteile zum aktuellen Preis). */
export function portfolioValue(career: Career): number {
  const h = career.household;
  if (!h) return 0;
  return h.properties.reduce((a, p) => a + p.value, 0) + h.shares.reduce((a, s) => a + s.percent * sharePrice(career, s.clubId), 0);
}

/** Erwartete Einnahmen im nächsten Jahr (Miete + Dividenden). */
export function expectedIncome(career: Career): number {
  const h = career.household;
  if (!h) return 0;
  const rent = h.properties.reduce((a, p) => a + p.value * getProperty(p.id).rent, 0);
  const div = h.shares.reduce((a, s) => a + s.percent * sharePrice(career, s.clubId) * dividendRate(career, s.clubId), 0);
  return Math.round(rent + div);
}

const dividendRate = (career: Career, clubId: string) => DIVIDEND + (career.europeSlots[clubId] ? EUROPE_BONUS : 0);

// ---------- Kaufen und verkaufen (gibt Spielstand und Coins-Änderung zurück) ----------

export function buyProperty(prev: Career, id: string, coins: number): { career: Career; delta: number } {
  const prop = getProperty(id);
  if (!prop || coins < prop.price || prev.household?.properties.some((p) => p.id === id)) return { career: prev, delta: 0 };
  const career: Career = structuredClone(prev);
  householdOf(career).properties.push({ id, value: prop.price, bought: prop.price });
  career.updatedAt = Date.now();
  return { career, delta: -prop.price };
}

export function sellProperty(prev: Career, id: string): { career: Career; delta: number } {
  const holding = prev.household?.properties.find((p) => p.id === id);
  if (!holding) return { career: prev, delta: 0 };
  const career: Career = structuredClone(prev);
  const h = householdOf(career);
  h.properties = h.properties.filter((p) => p.id !== id);
  career.updatedAt = Date.now();
  return { career, delta: Math.round(holding.value * (1 - SELL_FEE)) };
}

export function buyShares(prev: Career, clubId: string, percent: number, coins: number): { career: Career; delta: number } {
  const owned = prev.household?.shares.find((s) => s.clubId === clubId)?.percent ?? 0;
  const amount = Math.min(percent, MAX_STAKE - owned);
  const cost = amount * sharePrice(prev, clubId);
  if (amount <= 0 || coins < cost) return { career: prev, delta: 0 };
  const career: Career = structuredClone(prev);
  const h = householdOf(career);
  const holding = h.shares.find((s) => s.clubId === clubId);
  if (holding) {
    holding.percent += amount;
    holding.invested += cost;
  } else h.shares.push({ clubId, percent: amount, invested: cost, lastLeague: clubLeagueId(career, clubId) });
  career.updatedAt = Date.now();
  return { career, delta: -cost };
}

export function sellShares(prev: Career, clubId: string, percent: number): { career: Career; delta: number } {
  const holding = prev.household?.shares.find((s) => s.clubId === clubId);
  if (!holding) return { career: prev, delta: 0 };
  const amount = Math.min(percent, holding.percent);
  const career: Career = structuredClone(prev);
  const h = householdOf(career);
  const own = h.shares.find((s) => s.clubId === clubId)!;
  const avg = own.invested / own.percent;
  own.percent -= amount;
  own.invested -= avg * amount;
  if (own.percent <= 0) h.shares = h.shares.filter((s) => s.clubId !== clubId);
  career.updatedAt = Date.now();
  return { career, delta: Math.round(amount * sharePrice(prev, clubId) * (1 - SELL_FEE)) };
}

// ---------- Jahreswechsel ----------

/** Miete und Dividenden auszahlen, Immobilienwerte schwanken lassen. */
export function investYear(career: Career): { rent: number; dividends: number; notes: string[] } {
  const h = householdOf(career);
  const notes: string[] = [];
  let rent = 0;
  for (const holding of h.properties) {
    const prop = getProperty(holding.id);
    rent += Math.round(holding.value * prop.rent);
    const change = clamp(normal(prop.growth, prop.volatility), -0.35, 0.4);
    holding.value = Math.max(Math.round(prop.price * 0.3), Math.round(holding.value * (1 + change)));
    if (change <= -0.12) notes.push(`📉 ${prop.name}: Der Markt bricht ein (${Math.round(change * 100)} %).`);
    if (change >= 0.15) notes.push(`📈 ${prop.name}: starke Wertsteigerung (+${Math.round(change * 100)} %).`);
  }
  backingYear(career, notes);
  // Alte Spielstände: früher eingestecktes Geld wirkt noch einmal auf die Vereinsstärke.
  for (const s of h.shares) {
    if (s.pendingBoost) {
      career.clubDrift[s.clubId] = (career.clubDrift[s.clubId] ?? 0) + s.pendingBoost;
      s.pendingBoost = 0;
    }
  }
  let dividends = 0;
  for (const s of h.shares) {
    const d = Math.round(s.percent * sharePrice(career, s.clubId) * dividendRate(career, s.clubId));
    dividends += d;
    if (career.europeSlots[s.clubId]) notes.push(`🏆 ${getClub(s.clubId).name} spielt europäisch – Extra-Dividende.`);
  }
  return { rent, dividends, notes };
}

// ---------- Geld in einen Klub stecken (nur als Anteilseigner) – das „Leipzig-Projekt“ ----------
// Eingestecktes Geld landet im Ausbau-Budget des Klubs. Bei jedem Saisonabschluss verbaut der Klub davon
// so viel, wie er sinnvoll umsetzen kann (Kader, Trainer, Nachwuchs, Stadion): höchstens +6 Stärke pro Jahr.
// Jeder weitere Stärkepunkt wird teurer – ein Landesligist wird für wenig Geld ein Oberligist, aber bis zur
// Bundesliga braucht es Jahre und rund eine halbe Million Coins. Ohne neues Geld bröckelt die Stärke langsam ab.

export const INJECT_AMOUNTS = [5_000, 25_000, 100_000, 500_000];
/** Höchstens so viel Stärke kann ein Klub pro Jahr durch Geld dazugewinnen. */
export const MAX_GAIN_PER_YEAR = 6;
/** Obergrenze der gesamten Stärkung durch Investoren-Geld. */
export const MAX_BACKING = 45;
/** Ohne neues Geld bleibt pro Jahr nur dieser Anteil der Stärkung erhalten. */
export const BACKING_KEEP = 0.96;

/** Coins für den nächsten Stärkepunkt – steigt steil mit der aktuellen Stärke. */
export const costPerPoint = (strength: number) => Math.round(1500 * 1.09 ** Math.max(0, strength - 36));

export function canInject(career: Career, clubId: string): boolean {
  return (career.household?.shares.find((s) => s.clubId === clubId)?.percent ?? 0) > 0;
}

export function injectMoney(prev: Career, clubId: string, amount: number, coins: number): { career: Career; delta: number } {
  if (!canInject(prev, clubId) || amount <= 0 || coins < amount) return { career: prev, delta: 0 };
  const career: Career = structuredClone(prev);
  const holding = householdOf(career).shares.find((s) => s.clubId === clubId)!;
  holding.injected = (holding.injected ?? 0) + amount;
  holding.fund = (holding.fund ?? 0) + amount;
  career.updatedAt = Date.now();
  return { career, delta: -amount };
}

/** Grobe Vorschau: Wie viele Stärkepunkte bringt das Budget insgesamt (ohne Zufall und Abbau)? */
export function fundPreview(career: Career, clubId: string, fund: number): number {
  let s = clubStrength(career, clubId);
  let room = MAX_BACKING - (career.clubBacking?.[clubId] ?? 0);
  let gain = 0;
  while (fund > 0 && room > 0) {
    const cost = costPerPoint(s);
    const step = Math.min(1, room, fund / cost);
    fund -= step * cost;
    gain += step;
    room -= step;
    s += step;
  }
  return gain;
}

/** Jahresabschluss: Stärkung klingt ab, dann verbaut jeder Klub einen Teil seines Ausbau-Budgets. */
function backingYear(career: Career, notes: string[]): void {
  for (const s of householdOf(career).shares) {
    const now = clubLeagueId(career, s.clubId);
    if (s.lastLeague && s.lastLeague !== now) {
      const up = getLeague(now).tier < getLeague(s.lastLeague).tier;
      notes.push(up ? `🚀 ${getClub(s.clubId).name} steigt auf – jetzt in der ${getLeague(now).name}!` : `📉 ${getClub(s.clubId).name} steigt ab in die ${getLeague(now).name}.`);
    }
    s.lastLeague = now;
  }
  const backing = (career.clubBacking ??= {});
  for (const id of Object.keys(backing)) {
    backing[id] *= BACKING_KEEP;
    if (backing[id] < 0.05) delete backing[id];
  }
  for (const s of householdOf(career).shares) {
    if (!s.fund) continue;
    let strength = clubStrength(career, s.clubId);
    let room = Math.min(MAX_GAIN_PER_YEAR, MAX_BACKING - (backing[s.clubId] ?? 0));
    let gain = 0;
    while (s.fund > 0 && room > 0) {
      const cost = costPerPoint(strength);
      const step = Math.min(1, room, s.fund / cost);
      s.fund -= step * cost;
      gain += step;
      room -= step;
      strength += step;
    }
    s.fund = Math.round(s.fund);
    // Nicht jeder Euro trifft: Fehleinkäufe und Glücksgriffe.
    gain *= rand(0.75, 1.2);
    if (gain > 0) backing[s.clubId] = (backing[s.clubId] ?? 0) + gain;
    if (gain >= 1) {
      notes.push(`🏗️ ${getClub(s.clubId).name}: Dein Geld wirkt – neue Spieler und Trainer, Stärke +${gain.toFixed(1).replace('.', ',')}.`);
    }
  }
}
