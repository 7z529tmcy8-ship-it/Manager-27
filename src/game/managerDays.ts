import { CLUBS, getClub } from '../data/leagues';
import { sortTable } from './season';
import { chance, clamp, pick, randInt } from './random';
import { FIRST, LAST } from './rival';
import {
  BENCH_SIZE, addFeed, buyPlayer, calDate, fixBench, fixXI, moneyShort, playRound, playerValueM, sellOffer, sellPlayer, teamRating, windowLeft, windowOpen,
  type ManagerState, type MarketPlayer, type MyMatch,
} from './manager';
import type { Position } from './types';

// ---------- Manager-Modus: Tag für Tag ----------
// Jeder Tag ist Spieltag, Training, Ruhetag, Deadline Day oder Winterpause. Zwischendurch passieren Ereignisse
// mit drei Antworten. Schnellknöpfe: bis zum nächsten Spiel, bis zur Winterpause, bis Saisonende.

export type DayKind = 'match' | 'training' | 'rest' | 'deadline' | 'break' | 'free';
export const DAY_LABEL: Record<DayKind, string> = { match: 'Spieltag', training: 'Trainingstag', rest: 'Regeneration', deadline: 'Deadline Day', break: 'Winterpause', free: 'Freier Tag' };
const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export const dateText = (m: ManagerState, d = m.cal!.day) => {
  const x = calDate(m.cal!, d);
  return `${WEEKDAYS[x.getUTCDay()]}, ${x.getUTCDate()}. ${MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
};
export const shortDate = (m: ManagerState, d: number) => { const x = calDate(m.cal!, d); return `${x.getUTCDate()}.${x.getUTCMonth() + 1}.`; };
export const monthOf = (m: ManagerState, d: number) => { const x = calDate(m.cal!, d); return { y: x.getUTCFullYear(), mo: x.getUTCMonth(), name: MONTHS[x.getUTCMonth()], dom: x.getUTCDate(), wd: (x.getUTCDay() + 6) % 7 }; };

export function dayKind(m: ManagerState, d = m.cal!.day): DayKind {
  const c = m.cal!;
  if (c.roundDays.includes(d)) return 'match';
  if (c.win.some(([, b]) => b === d)) return 'deadline';
  if (d >= c.brk[0] && d <= c.brk[1]) return 'break';
  if (c.roundDays.includes(d - 1)) return 'rest';
  const wd = calDate(c, d).getUTCDay();
  return wd === 2 || wd === 4 || wd === 5 ? 'training' : 'free';
}

/** Heute ist ein eigenes Spiel, das noch nicht gespielt wurde. */
export const matchToday = (m: ManagerState) => !m.done && !!m.cal && m.cal.roundDays[m.round] === m.cal.day;
export const daysToMatch = (m: ManagerState) => (m.done || !m.cal ? null : m.cal.roundDays[m.round] - m.cal.day);
export const myFixture = (m: ManagerState, r = m.round) => m.rounds[r]?.find(([h, a]) => h === m.clubId || a === m.clubId) ?? null;
export const inBreak = (m: ManagerState) => !!m.cal && m.cal.day < m.cal.brk[0];

// ---------- Ereignisse ----------
export type EventKind = 'interest' | 'sponsor' | 'unhappy' | 'fans' | 'rival' | 'youth' | 'rumor' | 'scout';
export interface DayEvent {
  kind: EventKind;
  icon: string;
  tag: string;
  title: string;
  text: string;
  /** Betroffener Spieler (ID) oder Verein */
  player?: string;
  club?: string;
  amount?: number;
  /** Für den Scout-Tipp: der angebotene Spieler */
  offer?: MarketPlayer;
  options: { key: 'A' | 'B' | 'C'; label: string; hint: string; disabled?: boolean }[];
}

const recentLosses = (m: ManagerState) => {
  const r = m.feed?.filter((f) => f.cat === 'spiel' && f.season === m.season).slice(0, 3) ?? [];
  return r.filter((f) => f.title.startsWith('Niederlage')).length;
};

const GENERATORS: Record<EventKind, (m: ManagerState) => DayEvent | null> = {
  interest: (m) => {
    if (!windowOpen(m)) return null;
    const stars = [...m.squad].filter((p) => p.age <= 31).sort((a, b) => b.ovr - a.ovr).slice(0, 4);
    if (!stars.length) return null;
    const p = pick(stars);
    const myStr = getClub(m.clubId).strength;
    const buyers = CLUBS.filter((c) => c.strength >= myStr + 2 && c.id !== m.clubId);
    if (!buyers.length) return null;
    const club = pick(buyers);
    const amount = Math.round((playerValueM(p) * (1.15 + Math.random() * 0.25)) / 1e5) * 1e5;
    return {
      kind: 'interest', icon: 'eye', tag: 'Transferinteresse', player: p.id, club: club.id, amount,
      title: `${club.name} will ${p.name}`,
      text: `Scouts von ${club.name} waren zuletzt bei jedem Spiel. Jetzt liegt ein Angebot auf dem Tisch: ${moneyShort(amount)} € für ${p.name} (${p.pos}, ${p.ovr}).`,
      options: [
        { key: 'A', label: 'Spieler halten', hint: 'Stimmung +1 – er fühlt sich wertgeschätzt' },
        { key: 'B', label: `Für ${moneyShort(amount)} € verkaufen`, hint: 'Budget rauf, Spieler weg', disabled: m.squad.length <= 16 },
        { key: 'C', label: 'Abwarten', hint: 'Vielleicht bieten sie später mehr – oder gar nicht' },
      ],
    };
  },
  sponsor: (m) => {
    const amount = Math.max(2e5, Math.round((m.budget * 0.04 + getClub(m.clubId).strength * 4e4) / 1e5) * 1e5);
    const brand = pick(['Nordlicht Energie', 'Brauhaus Elbe', 'Turbo Telecom', 'Weserkraft Bank', 'Bolzplatz Burger', 'Kicker Kaffee', 'Stadtwerke Plus']);
    return {
      kind: 'sponsor', icon: 'coin', tag: 'Sponsor', amount,
      title: `${brand} will auf euer Trikot`,
      text: `Ein Sponsor bietet ${moneyShort(amount)} € für einen Ärmel-Deal bis Saisonende.`,
      options: [
        { key: 'A', label: 'Annehmen', hint: `+${moneyShort(amount)} € sofort, Vorstand +2` },
        { key: 'B', label: 'Nachverhandeln', hint: '55 %: deutlich mehr – sonst springen sie ab' },
        { key: 'C', label: 'Ablehnen', hint: 'Passt nicht zum Verein' },
      ],
    };
  },
  unhappy: (m) => {
    if (m.round < 5) return null;
    const xi = fixXI(m);
    const bench = fixBench({ ...m, xi });
    const avg = teamRating(m);
    const cands = m.squad.filter((p) => !xi.includes(p.id) && p.apps <= 1 && p.ovr >= avg - 5);
    if (!cands.length) return null;
    const p = pick(cands);
    const onBench = bench.includes(p.id);
    return {
      kind: 'unhappy', icon: 'warn', tag: 'Unzufriedenheit', player: p.id,
      title: `${p.name} will mehr Spielzeit`,
      text: `${p.name} (${p.pos}, ${p.ovr}) hat ${p.apps ? 'kaum' : 'noch gar nicht'} gespielt und klopft an deine Tür. ${onBench ? 'Auf der Bank sitzen reicht ihm nicht.' : 'Er sitzt nicht mal auf der Bank.'}`,
      options: [
        { key: 'A', label: onBench ? 'Startelf versprechen' : 'Auf die Bank holen', hint: onBench ? 'Er spielt am nächsten Spieltag von Beginn an' : 'Er kommt auf die Bank (schwächster Bankspieler muss runter)' },
        { key: 'B', label: windowOpen(m) ? 'Verkaufen' : 'Mit ihm reden', hint: windowOpen(m) ? 'Zum Marktwert abgeben' : '50 %: er beruhigt sich – sonst Stimmung −1' },
        { key: 'C', label: 'Ignorieren', hint: 'Stimmung −1' },
      ],
    };
  },
  fans: (m) => {
    if (recentLosses(m) < 2) return null;
    return {
      kind: 'fans', icon: 'news', tag: 'Fans',
      title: 'Die Kurve ist sauer',
      text: 'Nach den letzten Niederlagen hängen Banner am Trainingsgelände. Die Fans wollen Antworten.',
      options: [
        { key: 'A', label: 'Mit den Fans reden', hint: 'Stimmung +1, Vorstand +1' },
        { key: 'B', label: 'Kritik zurückweisen', hint: 'Stimmung +2, Vorstand −4' },
        { key: 'C', label: 'Schweigen', hint: 'Vorstand −2' },
      ],
    };
  },
  rival: (m) => {
    if (daysToMatch(m) !== 1) return null;
    const fx = myFixture(m);
    if (!fx) return null;
    const opp = fx[0] === m.clubId ? fx[1] : fx[0];
    const coach = `${pick(FIRST)} ${pick(LAST)}`;
    return {
      kind: 'rival', icon: 'fire', tag: 'Vor dem Spiel', club: opp,
      title: `Kampfansage aus ${getClub(opp).name}`,
      text: `Trainer ${coach}: „Gegen die holen wir drei Punkte, das wird ein Spaziergang.“ Die Presse will deine Antwort.`,
      options: [
        { key: 'A', label: 'Zurückschießen', hint: 'Team brennt (+Stärke im Spiel). Sieg: Vorstand +3 – sonst −3' },
        { key: 'B', label: 'Respekt zeigen', hint: 'Keine Wirkung' },
        { key: 'C', label: 'Gegner loben', hint: 'Vorstand +1, Stimmung −1' },
      ],
    };
  },
  youth: (m) => {
    if (m.squad.length >= 34) return null;
    const pos = pick<Position>(['ST', 'FL', 'ZOM', 'ZM', 'IV', 'AV', 'TW']);
    const str = getClub(m.clubId).strength;
    return {
      kind: 'youth', icon: 'rise', tag: 'Jugend', amount: Math.round(randInt(2, 6) * 1e5),
      title: 'Der Jugendtrainer hat ein Juwel',
      text: `„${pick(FIRST)} ${pick(LAST)}, 17 Jahre, ${pos} – der ist so weit. Hol ihn hoch, bevor ihn uns jemand wegschnappt.“ Geschätztes Potenzial: ${str + 4}–${str + 12}.`,
      options: [
        { key: 'A', label: 'In den Profikader holen', hint: 'Talent kommt in den Kader (Reserve)' },
        { key: 'B', label: 'Weiter ausbilden', hint: 'Er bleibt in der Jugend' },
        { key: 'C', label: 'An einen anderen Verein abgeben', hint: 'Etwas Ausbildungsgeld' },
      ],
    };
  },
  rumor: (m) => {
    if (m.board >= 40) return null;
    return {
      kind: 'rumor', icon: 'warn', tag: 'Gerüchte',
      title: 'Wackelt dein Stuhl?',
      text: 'Eine Zeitung berichtet, der Vorstand spreche schon mit Nachfolgern. Die Kabine liest mit.',
      options: [
        { key: 'A', label: 'Vertrauensgespräch', hint: 'Vorstand +6' },
        { key: 'B', label: 'Presse angreifen', hint: 'Stimmung +1, Vorstand −2' },
        { key: 'C', label: 'Ignorieren', hint: 'Vorstand −1' },
      ],
    };
  },
  scout: (m) => {
    if (!windowOpen(m) || m.squad.length >= 36) return null;
    const lvl = Math.round(teamRating(m)) + randInt(1, 3);
    const pos = pick<Position>(['ST', 'FL', 'ZOM', 'ZM', 'ZDM', 'IV', 'AV']);
    const age = randInt(23, 29);
    const from = pick(CLUBS.filter((c) => Math.abs(c.strength - lvl) <= 6 && c.id !== m.clubId));
    if (!from) return null;
    const base = { id: `s-${Date.now().toString(36)}`, name: `${pick(FIRST)} ${pick(LAST)}`, nation: pick(['Dänemark', 'Schweden', 'Kroatien', 'Österreich', 'Schweiz', 'Polen', 'Norwegen']), pos, age, ovr: lvl, pot: lvl, goals: 0, apps: 0, clubId: from.id, price: 0 };
    const price = Math.round((playerValueM(base) * 0.6) / 1e5) * 1e5;
    const offer: MarketPlayer = { ...base, price };
    return {
      kind: 'scout', icon: 'eye', tag: 'Scout-Tipp', offer, amount: price,
      title: `Schnäppchen: ${offer.name}`,
      text: `Dein Scout: „${offer.name} (${pos}, ${lvl}, ${age} J.) hat eine Ausstiegsklausel bei ${from.name}. ${moneyShort(price)} € – das ist geschenkt.“`,
      options: [
        { key: 'A', label: `Sofort holen (${moneyShort(price)} €)`, hint: 'Er sagt garantiert zu', disabled: price > m.budget },
        { key: 'B', label: 'Auf die Beobachtungsliste', hint: 'Er landet auf dem Transfermarkt' },
        { key: 'C', label: 'Kein Interesse', hint: '' },
      ],
    };
  },
};

/** Zufälliges Ereignis für heute (oder keins). */
export function rollEvent(m: ManagerState, rand = Math.random): DayEvent | null {
  const c = m.cal!;
  if (m.done || c.roundDays.includes(c.day)) return null;
  if (m.lastEventDay !== undefined && c.day - m.lastEventDay < 4) return null;
  if (rand() > (windowOpen(m) ? 0.13 : 0.09)) return null;
  const kinds = (Object.keys(GENERATORS) as EventKind[]).sort(() => rand() - 0.5);
  for (const k of kinds) { const e = GENERATORS[k](m); if (e) return e; }
  return null;
}

/** Antwort auf ein Ereignis. Liefert den neuen Stand und eine kurze Rückmeldung. */
export function resolveEvent(prev: ManagerState, key: 'A' | 'B' | 'C'): { m: ManagerState; note: string } {
  const e = prev.event;
  if (!e) return { m: prev, note: '' };
  let m: ManagerState = { ...prev, event: null };
  const mood = (d: number) => { m.mood = clamp((m.mood ?? 0) + d, -3, 3); };
  const board = (d: number) => { m.board = clamp(m.board + d, 0, 100); };
  const p = e.player ? m.squad.find((x) => x.id === e.player) : undefined;
  let note = '';
  switch (e.kind) {
    case 'interest':
      if (key === 'A') { mood(1); note = `${p?.name} bleibt – die Kabine feiert die Ansage.`; }
      else if (key === 'B' && p) {
        m = { ...m, squad: m.squad.filter((x) => x.id !== p.id), budget: m.budget + (e.amount ?? 0) };
        m.xi = fixXI(m); m.bench = fixBench(m);
        addFeed(m, 'transfer', `${p.name} wechselt zu ${getClub(e.club!).name}`, `Ablöse: ${moneyShort(e.amount ?? 0)} €.`);
        note = `Verkauft: +${moneyShort(e.amount ?? 0)} €`;
      } else note = 'Du wartest ab. Die Gerüchte bleiben.';
      break;
    case 'sponsor':
      if (key === 'A') { m.budget += e.amount ?? 0; board(2); note = `Deal! +${moneyShort(e.amount ?? 0)} €`; }
      else if (key === 'B') {
        if (chance(0.55)) { const a = Math.round(((e.amount ?? 0) * 1.6) / 1e5) * 1e5; m.budget += a; board(3); note = `Gepokert und gewonnen: +${moneyShort(a)} €`; }
        else note = 'Zu hoch gepokert – der Sponsor springt ab.';
      } else note = 'Abgelehnt.';
      if (note.startsWith('Deal') || note.startsWith('Gepokert')) addFeed(m, 'verein', 'Neuer Sponsor', note);
      break;
    case 'unhappy':
      if (key === 'A' && p) {
        const xi = fixXI(m);
        const bench = fixBench({ ...m, xi });
        if (bench.includes(p.id)) {
          // Startelf: schwächsten Feldspieler ersetzen
          const worst = xi.map((id) => m.squad.find((x) => x.id === id)!).filter((x) => x && x.pos !== 'TW').sort((a, b) => a.ovr - b.ovr)[0];
          if (worst) { m.xi = xi.map((id) => (id === worst.id ? p.id : id)); m.bench = bench.map((id) => (id === p.id ? worst.id : id)); }
          note = `${p.name} steht am nächsten Spieltag in der Startelf.`;
        } else {
          const nb = [...bench];
          if (nb.length >= BENCH_SIZE) { const weakest = nb.map((id) => m.squad.find((x) => x.id === id)!).sort((a, b) => a.ovr - b.ovr)[0]; nb.splice(nb.indexOf(weakest.id), 1); }
          m.xi = xi; m.bench = [...nb, p.id];
          note = `${p.name} sitzt ab sofort auf der Bank.`;
        }
        mood(1);
      } else if (key === 'B' && p) {
        if (windowOpen(m)) { const n = sellPlayer(m, p.id); if (n) { m = { ...n, event: null }; note = `${p.name} verkauft: +${moneyShort(sellOffer(prev, p).amount)} €`; } }
        else if (chance(0.5)) note = `${p.name} hat sich beruhigt.`;
        else { mood(-1); note = 'Das Gespräch ging schief. Stimmung −1'; }
      } else { mood(-1); note = 'Er ist sauer. Stimmung −1'; }
      break;
    case 'fans':
      if (key === 'A') { mood(1); board(1); note = 'Die Fans stehen wieder hinter euch.'; }
      else if (key === 'B') { mood(2); board(-4); note = 'Die Kabine zieht mit – der Vorstand nicht.'; }
      else { board(-2); note = 'Funkstille. Der Vorstand ist unzufrieden.'; }
      break;
    case 'rival':
      if (key === 'A') { m.hype = 2; note = 'Kampfansage! Die Mannschaft brennt.'; addFeed(m, 'verein', `Kampfansage gegen ${getClub(e.club!).name}`, 'Du hast zurückgeschossen – jetzt müssen Taten folgen.'); }
      else if (key === 'C') { board(1); mood(-1); note = 'Diplomatisch. Die Kabine hätte sich mehr gewünscht.'; }
      else note = 'Respektvoll und ruhig.';
      break;
    case 'youth':
      if (key === 'A') {
        const str = getClub(m.clubId).strength;
        const pos = (e.text.match(/17 Jahre, ([A-Z]+)/)?.[1] ?? 'ZM') as Position;
        const name = e.text.match(/„([^,]+),/)?.[1] ?? `${pick(FIRST)} ${pick(LAST)}`;
        const ovr = clamp(str - 13 + randInt(0, 4), 45, 80);
        m = { ...m, squad: [...m.squad, { id: `y-${Date.now().toString(36)}`, name, nation: 'Deutschland', pos, age: 17, ovr, pot: clamp(str + randInt(4, 12), ovr + 6, 92), goals: 0, apps: 0, joined: m.season }] };
        addFeed(m, 'verein', `${name} rückt hoch`, 'Ein 17-Jähriger aus der eigenen Jugend unterschreibt seinen ersten Profivertrag.');
        note = `${name} gehört jetzt zum Profikader.`;
      } else if (key === 'C') { m.budget += e.amount ?? 0; note = `Ausbildungsgeld: +${moneyShort(e.amount ?? 0)} €`; }
      else note = 'Er bekommt noch Zeit in der Jugend.';
      break;
    case 'rumor':
      if (key === 'A') { board(6); note = 'Der Vorstand stellt sich hinter dich.'; }
      else if (key === 'B') { mood(1); board(-2); note = 'Die Kabine mag es – der Vorstand weniger.'; }
      else { board(-1); note = 'Die Gerüchte halten sich.'; }
      break;
    case 'scout':
      if (key === 'A' && e.offer) {
        const withOffer = { ...m, market: [e.offer, ...m.market] };
        const r = buyPlayer(withOffer, e.offer.id, 0);
        if (r.ok) { m = { ...r.m, event: null }; note = `${e.offer.name} unterschreibt!`; }
        else note = r.reason;
      } else if (key === 'B' && e.offer) { m = { ...m, market: [e.offer, ...m.market] }; note = `${e.offer.name} steht jetzt auf dem Transfermarkt.`; }
      else note = 'Kein Interesse.';
      break;
  }
  return { m, note };
}

// ---------- Tage vergehen ----------

/** Eigenes Spiel heute anpfeifen (wie bisher playRound) – mit Nachrichten, Stimmung und Kampfansage. */
export function kickoff(prev: ManagerState): ManagerState {
  const leaderBefore = prev.round ? sortTable(prev.rows)[0]?.clubId : null;
  const hype = prev.hype ?? 0;
  const m: ManagerState = { ...playRound(prev), hype: 0, event: null };
  const mine = m.last?.mine as MyMatch | null | undefined;
  if (mine) {
    const home = mine.home === m.clubId;
    const gf = home ? mine.hg : mine.ag, ga = home ? mine.ag : mine.hg;
    const opp = getClub(home ? mine.away : mine.home).name;
    const res = gf > ga ? 'Sieg' : gf === ga ? 'Remis' : 'Niederlage';
    m.mood = clamp((m.mood ?? 0) + (gf > ga ? 1 : gf < ga ? -1 : 0), -3, 3);
    if (hype) m.board = clamp(m.board + (gf > ga ? 3 : -3), 0, 100);
    addFeed(m, 'spiel', `${res} ${home ? 'gegen' : 'bei'} ${opp}`, `${gf}:${ga}${mine.motm ? ` · Spieler des Spiels: ${mine.motm}` : ''}`);
  }
  const leader = sortTable(m.rows)[0]?.clubId;
  if (leader && leader !== leaderBefore && m.round > 1) addFeed(m, 'liga', `${getClub(leader).name} übernimmt die Tabellenführung`, `Nach dem ${m.round}. Spieltag ganz oben.`);
  return m;
}

/**
 * Einen Tag weiter. `auto`: Spiele werden automatisch gespielt und Ereignisse neutral beantwortet (für die Schnellknöpfe).
 * Blockiert (ohne auto), solange heute ein Spiel ansteht oder ein Ereignis offen ist.
 */
export function stepDay(prev: ManagerState, auto = false): ManagerState {
  let m = prev;
  if (!m.cal || m.done) return m;
  if (m.event) { if (!auto) return m; m = resolveEvent(m, 'C').m; }
  if (matchToday(m)) { if (!auto) return m; m = kickoff(m); }
  if (m.done) return m;
  if (m.cal!.day >= m.cal!.len - 1) return m;
  const wasOpen = windowOpen(m);
  m = { ...m, cal: { ...m.cal!, day: m.cal!.day + 1 }, feed: [...(m.feed ?? [])] };
  const nowOpen = windowOpen(m);
  if (!wasOpen && nowOpen) addFeed(m, 'transfer', 'Das Winter-Transferfenster ist offen', 'Bis 31. Januar kann eingekauft und verkauft werden.');
  if (wasOpen && !nowOpen) addFeed(m, 'transfer', 'Das Transferfenster ist geschlossen', 'Nächste Chance: im Winter bzw. im Sommer.');
  if (windowLeft(m) === 0) addFeed(m, 'transfer', 'Deadline Day!', 'Heute um Mitternacht schließt das Fenster.');
  if (m.cal!.day === m.cal!.brk[0]) addFeed(m, 'liga', 'Winterpause', 'Die Liga ruht bis Mitte Januar.');
  if (!auto) {
    const e = rollEvent(m);
    if (e) m = { ...m, event: e, lastEventDay: m.cal!.day };
  }
  return m;
}

export type AdvanceTo = 'day' | 'match' | 'winter' | 'end' | { day: number };

/** Mehrere Tage weiter. „match“ hält am nächsten Spieltag (oder bei einem Ereignis). Winter/Ende/Datum laufen automatisch. */
export function advance(prev: ManagerState, to: AdvanceTo): ManagerState {
  let m = prev;
  if (!m.cal) return m;
  if (to === 'day') return stepDay(m);
  if (to === 'match') {
    for (let i = 0; i < 400; i++) {
      const n = stepDay(m);
      if (n === m) break;
      m = n;
      if (matchToday(m) || m.event) break;
    }
    return m;
  }
  const target = to === 'winter' ? m.cal.brk[0] : to === 'end' ? m.cal.len - 1 : to.day;
  for (let i = 0; i < 400 && !m.done && m.cal!.day < target; i++) m = stepDay(m, true);
  // Am Ziel: falls dort ein Ereignis wartet oder ein Spiel ist, bleibt es für den Spieler stehen
  if (to === 'end' && !m.done) while (!m.done) m = stepDay(m, true);
  return m;
}
