import { getClub } from '../data/leagues';
import { BRANDS, type BrandId } from './kit';
import { currentClubId } from './player';
import { chance, clamp, pick, randInt, uid } from './random';
import type { Career } from './types';

// ---------- Kickgram ----------
// Eigenes Profil mit Followern. Posts mit Bildern aus der Galerie (die Bilder liegen nur im Browser, siehe gramImages.ts)
// oder automatisch erzeugten Highlight-Grafiken. Follower wachsen mit Leistung, Titeln und guten Posts.

export interface GramComment { user: string; text: string }
export interface GramPost {
  id: string;
  /** Schlüssel des Bildes im Browser-Speicher */
  img?: string;
  /** Erzeugte Grafik statt Foto */
  card?: { title: string; sub: string; tone: 'gold' | 'green' | 'blue' | 'red' };
  caption: string;
  likes: number;
  comments: GramComment[];
  season: string;
  at: number;
  /** Werbepost für den Ausrüster */
  ad?: BrandId;
  /** Follower-Zuwachs durch diesen Post */
  gained: number;
}
export interface Gram {
  handle: string;
  bio: string;
  followers: number;
  following: number;
  avatar?: string;
  posts: GramPost[];
  /** Pause, in der zuletzt gepostet wurde, und wie oft (abnehmender Ertrag) */
  breakKey?: string;
  breakPosts?: number;
  /** Bezahlte Werbeposts in dieser Pause */
  breakAds?: number;
}

export const VERIFIED_AT = 100_000;
export const ADS_PER_BREAK = 2;

const handleOf = (name: string) => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '').slice(0, 22) || 'spieler';

export function gramOf(c: Career): Gram {
  return c.gram ?? { handle: handleOf(c.player.name), bio: '', followers: 80 + Math.round(c.player.ovr * 4), following: randInt(120, 480), posts: [] };
}

export const fmtFollowers = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio.` : n >= 10_000 ? `${(n / 1e3).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Tsd.` : n.toLocaleString('de-DE');

const breakKeyOf = (c: Career) => `${c.year}-${c.phase}`;

/** Ruhm aus Leistung: Zielwert, auf den die Follower jedes Jahr zuwachsen. */
export function fameTarget(c: Career): number {
  const p = c.player;
  const last = c.history[c.history.length - 1];
  const base = 200 * Math.exp(0.16 * (p.ovr - 55));
  const season = last ? last.goals * 120 + last.assists * 60 + last.trophies.length * 4_000 + last.awards.length * 25_000 + last.caps * 400 : 0;
  const club = getClub(currentClubId(p))?.strength ?? 60;
  return Math.round((base + season) * (1 + Math.max(0, club - 70) * 0.04));
}

/** Jahresabschluss: Follower wachsen (Freedom Paris: +50 %). Verändert den Spielstand direkt. */
export function gramYear(c: Career): string | null {
  const g = gramOf(c);
  const boost = c.kit?.brand === 'freedom' ? 1.5 : 1;
  const gain = Math.round(fameTarget(c) * 0.4 * boost * (0.85 + Math.random() * 0.3));
  if (gain <= 0) return null;
  const was = g.followers;
  g.followers += gain;
  c.gram = g;
  const crossed = was < VERIFIED_AT && g.followers >= VERIFIED_AT;
  return `Kickgram: +${fmtFollowers(gain)} Follower${crossed ? ' – blauer Haken freigeschaltet!' : ''}.`;
}

const FANS = ['ultra_1904', 'kurve.ost', 'tor.fabrik', 'fussball.oma', 'groundhopper_nils', 'stadionwurst', 'flankengott', 'elfmeterkiller', 'vollspann.vince', 'jugend.trainer.mo', 'fifa_lena', 'sky.lukas', 'nordkurve.anna', 'bolzplatz.ben', 'tiki.taka.tom'];
const COMMENTS = ['Was ein Spieler!', 'Bester Mann auf dem Platz!', 'Weltklasse, Bruder', 'Bleib bei uns!!!', 'Bitte verlängern!', 'Trikot schon bestellt', 'Nächste Saison Ballon d’Or', 'Legende in the making', 'Wie immer stabil', 'Mein Sohn hat dein Poster im Zimmer', 'Viel zu stark', 'Hol dir den Titel!', 'Bester Jahrgang', 'Respekt aus der Gegenkurve'];
const AD_COMMENTS = ['Wo gibt’s die Schuhe?', 'Link?', 'Brauche das Outfit', 'Werbung, aber geil'];

/** Neuer Post: Likes, Kommentare und neue Follower. `img` ist der Bild-Schlüssel (falls Foto). */
export function makePost(prev: Career, input: { img?: string; card?: GramPost['card']; caption: string; ad?: boolean }): { career: Career; post: GramPost; coins: number } {
  const g = { ...gramOf(prev) };
  const key = breakKeyOf(prev);
  if (g.breakKey !== key) { g.breakKey = key; g.breakPosts = 0; g.breakAds = 0; }
  const n = g.breakPosts ?? 0;
  const fatigue = 1 / (1 + n * 0.6);
  const eng = (0.05 + Math.random() * 0.09) * (input.img ? 1.25 : 1) * (input.caption.trim().length > 10 ? 1.1 : 1);
  const likes = Math.max(3, Math.round(g.followers * eng * (0.6 + 0.4 * fatigue)));
  const gained = Math.round(likes * (0.1 + Math.random() * 0.12) * fatigue * (prev.kit?.brand === 'freedom' ? 1.5 : 1));
  const canAd = !!input.ad && !!prev.kit && (g.breakAds ?? 0) < ADS_PER_BREAK;
  const coins = canAd ? Math.round(clamp(300 + Math.sqrt(g.followers) * 6, 300, 9_000) * (prev.kit!.brand === 'freedom' ? 2 : 1) / 50) * 50 : 0;
  const nComments = clamp(Math.round(Math.log10(likes + 1) * 1.4), 1, 6);
  const comments: GramComment[] = Array.from({ length: nComments }, () => ({ user: pick(FANS), text: canAd && chance(0.4) ? pick(AD_COMMENTS) : pick(COMMENTS) }));
  if (prev.kit && chance(0.5)) comments.unshift({ user: BRANDS[prev.kit.brand].name.toLowerCase().replace(/\s+/g, ''), text: canAd ? 'Stark in unserem Look' : 'Unser Mann' });
  const post: GramPost = {
    id: uid(), img: input.img, card: input.card, caption: input.caption.trim(), likes, comments, gained,
    season: `${prev.year}/${String((prev.year + 1) % 100).padStart(2, '0')}`, at: Date.now(), ad: canAd ? prev.kit!.brand : undefined,
  };
  g.posts = [post, ...g.posts];
  g.followers += gained;
  g.breakPosts = n + 1;
  if (canAd) g.breakAds = (g.breakAds ?? 0) + 1;
  return { career: { ...prev, gram: g }, post, coins };
}

/** Vorschläge für Highlight-Grafiken aus der letzten Saison. */
export function highlightCards(c: Career): NonNullable<GramPost['card']>[] {
  const last = c.history[c.history.length - 1];
  const p = c.player;
  const out: NonNullable<GramPost['card']>[] = [{ title: `${p.ovr} GES`, sub: `${p.name} · ${c.phase === 'retired' ? 'Karriere beendet' : getClub(currentClubId(p))?.name ?? ''}`, tone: 'blue' }];
  if (last) {
    if (last.goals > 0) out.unshift({ title: `${last.goals} ${last.goals === 1 ? 'Tor' : 'Tore'}`, sub: `Saison ${last.season} · ${last.apps} Spiele`, tone: 'green' });
    else if (last.apps > 0) out.unshift({ title: `${last.apps} Spiele`, sub: `Saison ${last.season}${last.assists ? ` · ${last.assists} Vorlagen` : ''}`, tone: 'green' });
    for (const t of last.trophies.slice(0, 2)) out.unshift({ title: 'Champions!', sub: t, tone: 'gold' });
    for (const a of last.awards.slice(0, 1)) out.unshift({ title: a, sub: `Saison ${last.season}`, tone: 'red' });
  }
  return out.slice(0, 4);
}

export const setProfile = (prev: Career, patch: Partial<Pick<Gram, 'handle' | 'bio' | 'avatar'>>): Career => {
  const g = gramOf(prev);
  const handle = patch.handle !== undefined ? handleOf(patch.handle) : g.handle;
  return { ...prev, gram: { ...g, ...patch, handle } };
};
export const deletePost = (prev: Career, id: string): Career => {
  const g = gramOf(prev);
  return { ...prev, gram: { ...g, posts: g.posts.filter((p) => p.id !== id) } };
};
