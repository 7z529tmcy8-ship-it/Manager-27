import { LEAGUES, getClub, getLeague } from '../data/leagues';
import { clubLeagueId, clubStrength, currentClubId, formatMoney, seasonLabel } from './player';
import { pick } from './random';
import { sortTable, type HalfStats } from './season';
import type { Career, NewsItem, Offer, SeasonRecord, TableRow } from './types';

const MAX_NEWS = 60;

function item(career: Career, half: 1 | 2, tag: NewsItem['tag'], text: string, season = seasonLabel(career.year)): NewsItem {
  return { season, half, tag, text };
}

function aboutPlayer(career: Career, half: 1 | 2, s: HalfStats, season: string): NewsItem[] {
  const p = career.player;
  const club = getClub(currentClubId(p)).name;
  const out: NewsItem[] = [];
  const share = s.possibleMinutes ? s.minutes / s.possibleMinutes : 0;
  const period = half === 1 ? 'in der Hinrunde' : 'in dieser Saison';
  if (s.goals >= (half === 1 ? 10 : 20)) {
    out.push(item(career, half, 'Du', pick([`${p.name} in Torlaune: ${s.goals} Treffer ${period}!`, `Nicht zu stoppen: ${p.name} schießt ${club} mit ${s.goals} Toren nach vorn.`]), season));
  } else if (s.assists >= (half === 1 ? 8 : 14)) {
    out.push(item(career, half, 'Du', `Der Vorlagenkönig: ${p.name} legt ${s.assists} Tore ${period} auf.`, season));
  }
  if (s.avgRating !== null && s.avgRating >= 7.5 && s.apps >= 8) {
    out.push(item(career, half, 'Du', `Bestnoten für ${p.name} – Experten schwärmen von der Form (Ø ${s.avgRating.toFixed(2)}).`, season));
  }
  if (share < 0.2 && s.apps < 6) {
    out.push(item(career, half, 'Du', `Nur Bankdrücker? ${p.name} kommt bei ${club} kaum zum Zug.`, season));
  }
  return out;
}

function aboutLeagues(career: Career, half: 1 | 2, rows: Record<string, TableRow[]>, season: string): NewsItem[] {
  const out: NewsItem[] = [];
  const ownLeague = clubLeagueId(career, currentClubId(career.player));
  for (const l of LEAGUES) {
    if (l.tier !== 1 && l.id !== ownLeague) continue;
    const table = sortTable(rows[l.id]);
    const leader = getClub(table[0].clubId).name;
    if (l.id === ownLeague || l.id === 'bl1' || l.id === 'pl') {
      out.push(item(career, half, 'Liga', half === 1 ? `${l.name}: ${leader} ist Herbstmeister.` : `${leader} ist Meister der ${l.name}!`, season));
    }
  }
  // Krise bei einem großen Verein
  const crisis = LEAGUES.filter((l) => l.tier === 1)
    .flatMap((l) => sortTable(rows[l.id]).map((r, i, t) => ({ r, pos: i + 1, size: t.length })))
    .filter(({ r, pos, size }) => clubStrength(career, r.clubId) >= 80 && pos > size / 2);
  if (crisis.length) {
    const c = pick(crisis);
    out.push(item(career, half, 'Verein', `Krise bei ${getClub(c.r.clubId).name}: nur Platz ${c.pos} – der Trainer wackelt.`, season));
  }
  return out;
}

/** Schlagzeilen zur Winterpause. */
export function winterNews(career: Career, stats: HalfStats, offers: Offer[]): void {
  const prog = career.progress!;
  const season = seasonLabel(career.year);
  const news: NewsItem[] = [
    ...aboutPlayer(career, 1, stats, season),
    ...(prog.events ?? []).map((e) => item(career, 1, 'Du', `${e.title}: ${e.text}`, season)),
    ...aboutLeagues(career, 1, prog.rows, season),
  ];
  const top = [...offers].filter((o) => o.type !== 'Verlängerung').sort((a, b) => clubStrength(career, b.clubId) - clubStrength(career, a.clubId))[0];
  if (top) news.push(item(career, 1, 'Transfer', `Gerücht: ${getClub(top.clubId).name} buhlt im Winter um ${career.player.name}.`, season));
  push(career, news);
}

/** Schlagzeilen nach Saisonende. */
export function summerNews(career: Career, record: SeasonRecord, stats: HalfStats, tables: Record<string, TableRow[]>, extra: string[]): void {
  const season = record.season;
  const p = career.player;
  const news: NewsItem[] = [
    ...record.trophies.map((t) => item(career, 2, 'Titel', `${p.name} holt ${t}!`, season)),
    ...record.awards.map((a) => item(career, 2, 'Titel', `Auszeichnung: ${p.name} ist ${a.startsWith('Vereinslegende') ? a : `„${a}“`}.`, season)),
    ...aboutPlayer(career, 2, stats, season),
    ...(record.events ?? []).filter((e) => e.half === 2).map((e) => item(career, 2, 'Du', `${e.title}: ${e.text}`, season)),
    ...aboutLeagues(career, 2, tables, season),
    ...extra.map((t) => item(career, 2, t.includes('Rivale') || (career.rival && t.includes(career.rival.name)) ? 'Rivale' : 'Verein', t, season)),
  ];
  const top = [...career.offers].filter((o) => o.type === 'Transfer').sort((a, b) => b.fee - a.fee)[0];
  if (top) news.push(item(career, 2, 'Transfer', `${getClub(top.clubId).name} bietet ${formatMoney(top.fee)} für ${p.name}!`, season));
  const league = getLeague(record.leagueId);
  if (league.down && record.leaguePosition > record.table.length - league.down.spots) {
    news.push(item(career, 2, 'Verein', `Bittere Pille: ${getClub(record.clubId).name} steigt ab.`, season));
  }
  push(career, news);
}

export function addNews(career: Career, half: 1 | 2, tag: NewsItem['tag'], text: string) {
  push(career, [item(career, half, tag, text)]);
}

function push(career: Career, items: NewsItem[]) {
  career.news = [...items, ...(career.news ?? [])].slice(0, MAX_NEWS);
}
