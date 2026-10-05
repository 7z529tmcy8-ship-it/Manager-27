import { getClub } from '../data/leagues';
import { currentClubId, formatMoney } from './player';
import type { Career } from './types';

// Große Momente der Karriere, die mit einer Animation gefeiert (oder betrauert) werden.
// Erkannt wird durch den Vergleich des Spielstands vor und nach einer Aktion.

export type MomentKind = 'scorer' | 'ballon' | 'title' | 'award' | 'transfer' | 'rise' | 'fall';

export interface Moment {
  kind: MomentKind;
  title: string;
  sub: string;
  /** Für Wertungs-Animationen: von → nach. */
  from?: number;
  to?: number;
  /** Für Wechsel: alter und neuer Verein. */
  fromClub?: string;
  toClub?: string;
  /** Zusatzzeile, z. B. Ablöse oder Titelliste. */
  extra?: string;
}

/** Ab so vielen Punkten Veränderung gilt die Wertung als „drastisch“ gestiegen/gesunken. */
export const BIG_CHANGE = 3;

export function detectMoments(prev: Career, next: Career): Moment[] {
  const out: Moment[] = [];
  const seasonEnded = next.history.length > prev.history.length;
  const breakPassed = seasonEnded || prev.phase !== next.phase;

  if (seasonEnded) {
    const r = next.history[next.history.length - 1];
    const leagueGoals = r.byCompetition?.find((s) => s.competition === 'Liga')?.goals ?? r.goals;
    const scorer = r.awards.find((a) => a.startsWith('Torschützenkönig'));
    if (scorer) {
      out.push({ kind: 'scorer', title: 'Torschützenkönig!', sub: scorer.replace('Torschützenkönig ', ''), extra: `${leagueGoals} Ligatore – niemand hat öfter getroffen.` });
    }
    if (r.awards.includes('Ballon d’Or')) {
      out.push({ kind: 'ballon', title: 'Ballon d’Or!', sub: 'Der beste Spieler der Welt', extra: `${next.player.name} – Saison ${r.season}` });
    }
    const big = ['Champions League', 'Europa League', 'Conference League'];
    const titles = [...r.trophies].sort((a, b) => Number(b === 'Champions League') - Number(a === 'Champions League') || Number(b.startsWith('Meister')) - Number(a.startsWith('Meister')));
    if (titles.length) {
      const main = titles[0];
      out.push({
        kind: 'title',
        title: big.includes(main) ? `${main}-Sieger!` : main.startsWith('Meister') ? 'Meister!' : `${main}!`,
        sub: main.startsWith('Meister') ? main.replace(/^Meister \((.*)\)$/, '$1') : getClub(r.clubId).name,
        extra: titles.length > 1 ? `Dazu: ${titles.slice(1).join(' · ')}` : undefined,
      });
    }
    for (const a of r.awards.filter((x) => x === 'Golden Boy' || x.startsWith('Spieler der Saison'))) {
      out.push({ kind: 'award', title: a.startsWith('Spieler der Saison') ? 'Spieler der Saison!' : 'Golden Boy!', sub: a.replace('Spieler der Saison ', ''), extra: `Saison ${r.season}` });
    }
  }

  // Wertung drastisch gestiegen oder gefallen (nur über eine Pause hinweg, nicht durch Fähigkeiten/Items).
  const delta = next.player.ovr - prev.player.ovr;
  if (breakPassed && next.phase !== 'retired') {
    if (delta >= BIG_CHANGE) {
      out.push({ kind: 'rise', title: delta >= 5 ? 'Explosion!' : 'Durchbruch!', sub: 'Deine Wertung schießt nach oben', from: prev.player.ovr, to: next.player.ovr });
    } else if (delta <= -BIG_CHANGE) {
      const old = next.player.age >= 33;
      out.push({
        kind: 'fall',
        title: old ? 'Das Alter …' : delta <= -5 ? 'Absturz' : 'Formkrise',
        sub: old ? 'Der Körper macht nicht mehr alles mit' : 'Deine Wertung bricht ein',
        from: prev.player.ovr,
        to: next.player.ovr,
      });
    }
  }

  // Vereinswechsel (inkl. Leihe, Heimkehr, Wintertransfer).
  const fromId = currentClubId(prev.player);
  const toId = currentClubId(next.player);
  if (fromId !== toId && next.phase !== 'retired' && !next.destroyed) {
    const t = next.transfers?.[next.transfers.length - 1];
    const fee = t && t.toClubId === toId && t.fee > 0 ? `Ablöse ${formatMoney(t.fee)}` : undefined;
    const homecoming = !!next.homecoming && !prev.homecoming;
    out.push({
      kind: 'transfer',
      title: homecoming ? 'Heimkehr!' : next.player.loan && next.player.loan.clubId === toId ? 'Leihe perfekt!' : 'Wechsel perfekt!',
      sub: `Willkommen bei ${getClub(toId).name}`,
      fromClub: getClub(fromId).name,
      toClub: getClub(toId).name,
      extra: fee,
    });
  }
  return out;
}
