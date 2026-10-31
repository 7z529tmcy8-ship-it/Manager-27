import { CARD_POOL, collectionProgress, getCard, rarity, type ClubState, type CollectCard } from './club';
import { ELITE, divisionOf, divName } from './divisions';
import type { Career } from './types';

// ---------- Profil (wie in Brawl Stars) ----------
// Name, Wappen und Farbe frei wählbar (keine Gesichter), dazu Manager-Level, Statistiken und eine Lieblingskarte als Vitrine.

export const EMBLEMS = ['shield', 'crown', 'bolt', 'star', 'fire', 'ball', 'trophy', 'rocket', 'spark', 'medal'] as const;
export const PROFILE_COLORS = ['#39ff88', '#00e5ff', '#a35cff', '#ff2fd1', '#ffd24a', '#ff4d6d'];
export const NAME_MAX = 16;

export function profileOf(club: Pick<ClubState, 'profile'>) {
  return club.profile ?? { name: 'Manager', emblem: 'shield', color: PROFILE_COLORS[2] };
}

export function setProfile(club: ClubState, patch: Partial<NonNullable<ClubState['profile']>>): ClubState {
  const cur = profileOf(club);
  const name = (patch.name ?? cur.name).replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) || 'Manager';
  return { ...club, profile: { ...cur, ...patch, name } };
}

/** Manager-Erfahrung: Trophäen-Bestwert, Siege, Packs und Karriere-Saisons zählen. */
export function managerXp(club: ClubState, careers: Career[]): number {
  const seasons = careers.reduce((a, c) => a + c.history.length, 0);
  return (club.trophyBest ?? 0) + club.duels.w * 5 + club.packsOpened * 2 + seasons * 15 + collectionProgress(club).have;
}

/** Level 1 … 100; jedes Level braucht etwas mehr als das vorige. */
export function managerLevel(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let rest = xp;
  let need = 60;
  while (rest >= need && level < 100) { rest -= need; level++; need = Math.round(need * 1.06 + 10); }
  return { level, into: rest, need };
}

/** Lieblingskarte: die gewählte – sonst die seltenste eigene Karte. */
export function showcaseCard(club: ClubState): CollectCard | null {
  const chosen = club.profile?.showcase ? getCard(club.profile.showcase) : null;
  if (chosen && (club.cards[chosen.id] ?? 0) > 0) return chosen;
  return bestCards(club, 1)[0] ?? null;
}

export function bestCards(club: ClubState, n = 8): CollectCard[] {
  return CARD_POOL.filter((c) => (club.cards[c.id] ?? 0) > 0).sort((a, b) => rarity(b) - rarity(a) || b.ovr - a.ovr).slice(0, n);
}

export interface ProfileStat { label: string; value: string; icon: string }

export function profileStats(club: ClubState, careers: Career[]): ProfileStat[] {
  const coll = collectionProgress(club);
  const icons = CARD_POOL.filter((c) => c.variant === 'icon' && (club.cards[c.id] ?? 0) > 0).length;
  const seasons = careers.reduce((a, c) => a + c.history.length, 0);
  const titles = careers.reduce((a, c) => a + c.history.reduce((b, r) => b + r.trophies.length, 0), 0);
  const bestOvr = careers.reduce((a, c) => Math.max(a, c.player.ovr, ...c.history.map((r) => r.ovrEnd)), 0);
  const d = divisionOf(club);
  const fmt = (n: number) => n.toLocaleString('de-DE');
  return [
    { label: 'Trophäen', value: fmt(club.trophies ?? 0), icon: 'trophy' },
    { label: 'Höchste Trophäen', value: fmt(club.trophyBest ?? 0), icon: 'crown' },
    { label: 'Duell-Siege', value: fmt(club.duels.w), icon: 'duel' },
    { label: 'Beste Division', value: divName(d.best), icon: 'medal' },
    { label: 'Karten', value: `${fmt(coll.have)} · ${coll.label}`, icon: 'cards' },
    { label: 'Ikonen', value: fmt(icons), icon: 'star' },
    { label: 'Packs geöffnet', value: fmt(club.packsOpened), icon: 'pack' },
    { label: 'Drops geöffnet', value: fmt(club.dropsOpened ?? 0), icon: 'spark' },
    { label: 'Karrieren', value: fmt(careers.length), icon: 'ball' },
    { label: 'Saisons gespielt', value: fmt(seasons), icon: 'calendar' },
    { label: 'Titel in Karrieren', value: fmt(titles), icon: 'trophy' },
    { label: 'Beste Wertung', value: bestOvr ? String(bestOvr) : '–', icon: 'rise' },
  ];
}

// ---------- Spielerkarte: Banner und Titel (wie in Brawl Stars) ----------

export interface ProfileBanner { id: string; name: string; /** Freischaltung; ohne = von Anfang an frei. */ need?: string; ok?: (club: ClubState, level: number) => boolean }
export const BANNERS: ProfileBanner[] = [
  { id: 'stadion', name: 'Flutlicht' },
  { id: 'neon', name: 'Neon' },
  { id: 'galaxie', name: 'Galaxie' },
  { id: 'feuer', name: 'Feuer' },
  { id: 'rasen', name: 'Rasen' },
  { id: 'gold', name: 'Gold', need: 'Level 20', ok: (_c, lvl) => lvl >= 20 },
  { id: 'meteor', name: 'Meteor', need: 'Einen Meteor-Code einlösen', ok: (c) => usedCode(c, ['METEOR', 'METEORRUSH', 'KRATER', 'STERNSCHNUPPE']) },
  { id: 'eis', name: 'Eissturm', need: 'Code EISSTURM einlösen', ok: (c) => usedCode(c, ['EISSTURM']) },
];
const usedCode = (club: ClubState, codes: string[]) => (club.redeemedCodes ?? []).some((c) => codes.includes(c));
export const bannerOpen = (b: ProfileBanner, club: ClubState, level: number) => !b.ok || b.ok(club, level);
export const bannerOf = (club: ClubState, level: number) => {
  const b = BANNERS.find((x) => x.id === club.profile?.banner);
  return b && bannerOpen(b, club, level) ? b : BANNERS[0];
};

export interface ProfileTitle { id: string; name: string; need: string; ok: (club: ClubState, careers: Career[]) => boolean }
const iconCount = (club: ClubState) => CARD_POOL.filter((c) => c.variant === 'icon' && (club.cards[c.id] ?? 0) > 0).length;
const careerTitles = (careers: Career[]) => careers.reduce((a, c) => a + c.history.reduce((b, r) => b + r.trophies.length, 0), 0);
const careerPeak = (careers: Career[]) => careers.reduce((a, c) => Math.max(a, c.player.ovr, ...c.history.map((r) => r.ovrEnd)), 0);
export const TITLES: ProfileTitle[] = [
  { id: 'neu', name: 'Frischling', need: 'Von Anfang an', ok: () => true },
  { id: 'sammler', name: 'Sammler', need: '50 verschiedene Karten', ok: (c) => collectionProgress(c).have >= 50 },
  { id: 'packs', name: 'Pack-Süchtig', need: '100 Packs geöffnet', ok: (c) => c.packsOpened >= 100 },
  { id: 'drops', name: 'Drop-Jäger', need: '50 Drops geöffnet', ok: (c) => (c.dropsOpened ?? 0) >= 50 },
  { id: 'ikonen', name: 'Ikonen-Jäger', need: '10 verschiedene Ikonen', ok: (c) => iconCount(c) >= 10 },
  { id: 'duell', name: 'Duell-König', need: '50 Duell-Siege', ok: (c) => c.duels.w >= 50 },
  { id: 'elite', name: 'Elite-Manager', need: 'Elite-Division erreichen', ok: (c) => divisionOf(c).best === ELITE },
  { id: 'ruhm', name: 'Ruhmesweg-Legende', need: '3.000 Trophäen', ok: (c) => (c.trophyBest ?? 0) >= 3000 },
  { id: 'titel', name: 'Titelsammler', need: '10 Titel in Karrieren', ok: (_c, cs) => careerTitles(cs) >= 10 },
  { id: 'goat', name: 'GOAT', need: 'Wertung 95 in einer Karriere', ok: (_c, cs) => careerPeak(cs) >= 95 },
  { id: 'meteor', name: 'Meteor-Rusher', need: 'Einen Meteor-Code einlösen', ok: (c) => usedCode(c, ['METEOR', 'METEORRUSH', 'KRATER', 'STERNSCHNUPPE']) },
  { id: 'eis', name: 'Eisherz', need: 'Code EISSTURM einlösen', ok: (c) => usedCode(c, ['EISSTURM']) },
];
export const titleOf = (club: ClubState, careers: Career[]) => {
  const t = TITLES.find((x) => x.id === club.profile?.title);
  return t && t.ok(club, careers) ? t : TITLES[0];
};

/** Drei Rekorde für die Spielerkarte. */
export function profileRecords(club: ClubState, careers: Career[]) {
  const peak = careerPeak(careers);
  return [
    { label: 'Trophäen-Rekord', value: (club.trophyBest ?? 0).toLocaleString('de-DE'), icon: 'trophy', tone: 'gold' },
    { label: 'Duell-Siege', value: club.duels.w.toLocaleString('de-DE'), icon: 'duel', tone: 'blue' },
    { label: 'Beste Wertung', value: peak ? String(peak) : '–', icon: 'rise', tone: 'pink' },
  ];
}
