import { BALLON_WINNER_2026 } from '../data/cards';
import { CARD_POOL, eventActive, getCard, rarity, withUpgrade, type ClubState, type CollectCard, type EventId } from './club';

// Spezial-Tausche: Legendäre Momente als Karten (91–96). Man gibt genau 11 starke Karten ab – die Regeln sind hart.
// Jede Karte gibt es nur einmal. „Automatisch füllen“ sucht die günstigste passende Abgabe heraus (autoFillMoment).

export const MOMENT_SIZE = 11;

export interface MomentNeed {
  label: string;
  count: number;
  test: (c: CollectCard) => boolean;
}

export interface MomentSbc {
  id: string;
  reward: CollectCard;
  story: string;
  /** Mindest-Durchschnittswertung der 11 Karten. */
  minAvg: number;
  /** Keine Karte darf schwächer sein. */
  minEach: number;
  needs: MomentNeed[];
  /** Erst freigeschaltet, wenn dieser Tausch erledigt ist. */
  after?: string;
  /** Nur während eines Events verfügbar. */
  event?: EventId;
}

const isIcon = (c: CollectCard) => c.variant === 'icon';
const isCult = (c: CollectCard) => c.variant === 'cult';
const league = (name: string) => (c: CollectCard) => c.league === name;
const nation = (name: string) => (c: CollectCard) => c.nation === name;
const pos = (p: string, min = 0) => (c: CollectCard) => c.position === p && c.ovr >= min;

const card = (id: string, name: string, position: CollectCard['position'], nat: string, club: string, lg: string, ovr: number, label: string): CollectCard =>
  ({ id: `moment-${id}`, name, position, nation: nat, club, league: lg, ovr, variant: 'moment', label });
/** „Unvergessen“: eigenes Kartendesign mit Anzeigetafel (Datum und Minute des Moments). */
const unforgettable = (id: string, name: string, position: CollectCard['position'], nat: string, club: string, lg: string, ovr: number, label: string): CollectCard =>
  ({ id: `moment-${id}`, name, position, nation: nat, club, league: lg, ovr, variant: 'unvergessen', label });
const isFullback = (min: number) => (c: CollectCard) => c.position === 'AV' && c.ovr >= min;

/** Ballon-d’Or-Sieger 2026 als SBC – erst, wenn der Sieger eingetragen ist. */
function galaWinnerSbc(): MomentSbc[] {
  if (!BALLON_WINNER_2026) return [];
  const base = CARD_POOL.find((c) => c.variant === 'gala' && c.name === BALLON_WINNER_2026);
  if (!base) return [];
  return [{
    id: 'moment-ballondor-2026',
    event: 'gala',
    reward: { ...base, id: 'moment-ballondor-2026', ovr: 96, label: 'Ballon d’Or 2026' },
    story: `London, 26. Oktober 2026: ${BALLON_WINNER_2026} gewinnt den Ballon d’Or. Die Siegerkarte gibt es nur in der Gala-Woche.`,
    minAvg: 89, minEach: 86,
    needs: [
      { label: 'Gala-Nominierte', count: 2, test: (c) => c.variant === 'gala' },
      { label: 'Ikonen', count: 2, test: isIcon },
    ],
  }];
}

/** „Ewig“: die größten Momente der Fußballgeschichte – dreistellige Wertung (99–102), eigenes Obsidian-Prisma-Design. */
const eternal = (id: string, name: string, position: CollectCard['position'], nat: string, club: string, ovr: number, label: string): CollectCard =>
  ({ id: `moment-${id}`, name, position, nation: nat, club, league: 'Ewig', ovr, variant: 'ewig', label });
const isSpecial = (c: CollectCard) => !['silver', 'gold', 'gold-rare', 'icon'].includes(c.variant);

export const MOMENTS: MomentSbc[] = [
  ...galaWinnerSbc(),
  // ----- Ewig (99–102) -----
  {
    id: 'moment-ewig-ronaldo',
    reward: eternal('ewig-ronaldo', 'Cristiano Ronaldo', 'ST', 'Portugal', 'EM 2016', 102, 'Saint-Denis 2016 · Europameister'),
    story: 'Stade de France, 10. Juli 2016: Ronaldo muss im Finale nach 25 Minuten verletzt raus – und treibt sein Team danach von der Seitenlinie an. Eder trifft in der 109. Minute zum 1:0, Portugal gewinnt seinen ersten großen Titel.',
    minAvg: 93, minEach: 90,
    needs: [
      { label: 'Ikonen', count: 3, test: isIcon },
      { label: 'Portugiesen', count: 2, test: nation('Portugal') },
      { label: 'Spezialkarten', count: 3, test: isSpecial },
    ],
  },
  {
    id: 'moment-ewig-neymar',
    reward: eternal('ewig-neymar', 'Neymar', 'FL', 'Brasilien', 'Olympia 2016', 101, 'Maracanã 2016 · Olympia-Gold'),
    story: 'Rio, 20. August 2016: Neymar trifft im Finale gegen Deutschland per Freistoß und verwandelt im Elfmeterschießen den letzten Schuss zum 5:4. Brasiliens erstes olympisches Fußball-Gold – im eigenen Maracanã.',
    minAvg: 92, minEach: 89,
    needs: [
      { label: 'Brasilianer', count: 3, test: nation('Brasilien') },
      { label: 'Ikonen', count: 2, test: isIcon },
      { label: 'Spezialkarten', count: 2, test: isSpecial },
    ],
  },
  {
    id: 'moment-ewig-iniesta',
    reward: eternal('ewig-iniesta', 'Andrés Iniesta', 'ZM', 'Spanien', 'WM 2010', 100, "Johannesburg 2010 · 116'"),
    story: 'WM-Finale 2010 gegen die Niederlande, Verlängerung, 116. Minute: Iniesta trifft zum 1:0 – Spaniens erster WM-Titel.',
    minAvg: 92, minEach: 88,
    needs: [
      { label: 'Spanier', count: 3, test: nation('Spanien') },
      { label: 'LaLiga-Spieler', count: 3, test: league('LaLiga') },
      { label: 'Ikonen', count: 2, test: isIcon },
    ],
  },
  {
    id: 'moment-ewig-beckenbauer',
    reward: eternal('ewig-beckenbauer', 'Franz Beckenbauer', 'IV', 'Deutschland', 'EM 1972', 100, '1972 · Europameister & Ballon d’Or'),
    story: 'Sommer 1972: Kapitän Beckenbauer führt Deutschland zum EM-Titel, im Dezember bekommt er den Ballon d’Or – als Libero, der das Spiel von hinten lenkt.',
    minAvg: 92, minEach: 88,
    needs: [
      { label: 'Deutsche', count: 3, test: nation('Deutschland') },
      { label: 'Bundesliga-Spieler', count: 3, test: league('Bundesliga') },
      { label: 'Ikonen', count: 2, test: isIcon },
    ],
  },
  {
    id: 'moment-ewig-jaschin',
    reward: eternal('ewig-jaschin', 'Lew Jaschin', 'TW', 'Russland', 'Ballon d’Or 1963', 99, '1963 · einziger Torwart mit Ballon d’Or'),
    story: '1963 gewinnt Lew Jaschin, die „Schwarze Spinne“, den Ballon d’Or – als bisher einziger Torwart in der Geschichte der Auszeichnung.',
    minAvg: 91, minEach: 88,
    needs: [
      { label: 'Torhüter', count: 2, test: (c) => c.position === 'TW' },
      { label: 'Ikonen', count: 3, test: isIcon },
    ],
  },
  // ----- Unvergessen (neues Kartendesign) -----
  {
    id: 'moment-zidane-volley',
    reward: unforgettable('zidane-volley', 'Zinédine Zidane', 'ZOM', 'Frankreich', 'Real Madrid', 'LaLiga', 95, "15.05.2002 · 45'"),
    story: 'Glasgow, Champions-League-Finale gegen Leverkusen: Roberto Carlos flankt hoch, Zidane nimmt den Ball kurz vor der Pause volley mit links – 2:1, der Siegtreffer.',
    minAvg: 90, minEach: 87,
    needs: [
      { label: 'LaLiga-Spieler', count: 4, test: league('LaLiga') },
      { label: 'Franzosen', count: 3, test: nation('Frankreich') },
      { label: 'Ikonen', count: 2, test: isIcon },
    ],
  },
  {
    id: 'moment-bergkamp-turn',
    reward: unforgettable('bergkamp-turn', 'Dennis Bergkamp', 'ST', 'Niederlande', 'Arsenal FC', 'Premier League', 94, "02.03.2002 · 11'"),
    story: 'St James’ Park: Pires spielt flach, Bergkamp spitzelt den Ball an der einen Seite von Dabizas vorbei, dreht sich an der anderen – und schiebt ein. Die Drehung.',
    minAvg: 89, minEach: 86,
    needs: [
      { label: 'Premier-League-Spieler', count: 5, test: league('Premier League') },
      { label: 'Niederländer', count: 3, test: nation('Niederlande') },
      { label: 'Ikone', count: 1, test: isIcon },
    ],
  },
  {
    id: 'moment-messi-getafe',
    reward: unforgettable('messi-getafe', 'Lionel Messi', 'FL', 'Argentinien', 'FC Barcelona', 'LaLiga', 96, "18.04.2007 · 28'"),
    story: 'Pokal-Halbfinale gegen Getafe: Messi läuft aus der eigenen Hälfte los, lässt fünf Gegenspieler und den Torwart stehen – wie Maradona 1986.',
    minAvg: 91, minEach: 88,
    needs: [
      { label: 'LaLiga-Spieler', count: 4, test: league('LaLiga') },
      { label: 'Argentinier', count: 3, test: nation('Argentinien') },
      { label: 'Ikonen', count: 2, test: isIcon },
      { label: 'Weltstar ab 90', count: 1, test: (c) => c.ovr >= 90 && c.variant !== 'icon' },
    ],
  },
  {
    id: 'moment-roberto-carlos',
    reward: unforgettable('roberto-carlos', 'Roberto Carlos', 'AV', 'Brasilien', 'Real Madrid', 'LaLiga', 93, "03.06.1997 · 21'"),
    story: 'Lyon, Tournoi de France: Freistoß aus über 30 Metern. Der Ball fliegt am Tor vorbei – und biegt im letzten Moment ab ins Netz. Barthez rührt sich nicht.',
    minAvg: 89, minEach: 86,
    needs: [
      { label: 'Brasilianer', count: 4, test: nation('Brasilien') },
      { label: 'Außenverteidiger ab 86', count: 2, test: isFullback(86) },
      { label: 'Kult-Held', count: 1, test: isCult },
    ],
  },
  {
    id: 'moment-ricken-lupfer',
    reward: unforgettable('ricken-lupfer', 'Lars Ricken', 'ZOM', 'Deutschland', 'Borussia Dortmund', 'Bundesliga', 92, "28.05.1997 · 71'"),
    story: 'München, Champions-League-Finale gegen Juventus: Ricken kommt rein, Möller spielt den Pass – und Sekunden nach der Einwechslung lupft er aus 25 Metern zum 3:1.',
    minAvg: 88, minEach: 85,
    needs: [
      { label: 'Bundesliga-Spieler', count: 6, test: league('Bundesliga') },
      { label: 'Deutsche', count: 4, test: nation('Deutschland') },
      { label: 'Ikone', count: 1, test: isIcon },
    ],
  },
  {
    id: 'moment-suarez-geisternacht',
    event: 'geisternacht',
    reward: { id: 'moment-suarez-geisternacht', name: 'Luis Suárez', position: 'ST', nation: 'Uruguay', club: 'Geisternacht', league: 'LaLiga', ovr: 94, variant: 'halloween', label: 'Der Beißer' },
    story: 'Geisternacht-SBC: Nur zwei Nächte lang kommt der Stürmer mit dem berüchtigtsten Biss des Fußballs zurück – als Vampir. Am 1. November ist er wieder verschwunden.',
    minAvg: 88, minEach: 85,
    needs: [
      { label: 'Halloween-Kostümkarten', count: 2, test: (c) => c.variant === 'halloween' },
      { label: 'Kult-Helden', count: 3, test: isCult },
      { label: 'Ikone', count: 1, test: isIcon },
    ],
  },
  {
    id: 'moment-adriano-halloween',
    event: 'halloween',
    reward: { id: 'moment-adriano-halloween', name: 'Adriano', position: 'ST', nation: 'Brasilien', club: 'Halloween', league: 'Serie A', ovr: 93, variant: 'halloween', label: 'Zombie-Imperator' },
    story: 'Halloween-SBC „Die Nacht der lebenden Toten“: Nur wer Karrieren wiederbelebt, die eigentlich vorbei waren, bekommt den Imperator – als Zombie. Nur bis 2. November!',
    minAvg: 88, minEach: 85,
    needs: [
      { label: 'Kult-Helden', count: 4, test: isCult },
      { label: '„Was wäre wenn“-Talente', count: 3, test: (c) => c.variant === 'talent' },
      { label: 'Ikone', count: 1, test: isIcon },
    ],
  },
  {
    id: 'moment-ramos',
    reward: card('ramos', 'Sergio Ramos', 'IV', 'Spanien', 'Real Madrid', 'LaLiga', 93, '92:48'),
    story: 'Champions-League-Finale 2014 gegen Atlético: Kopfball zum 1:1 in der 92:48. Real gewinnt am Ende 4:1 nach Verlängerung.',
    minAvg: 89, minEach: 86,
    needs: [
      { label: 'LaLiga-Spieler', count: 4, test: league('LaLiga') },
      { label: 'Spanier', count: 2, test: nation('Spanien') },
      { label: 'Innenverteidiger ab 85', count: 2, test: pos('IV', 85) },
      { label: 'Ikonen', count: 2, test: isIcon },
    ],
  },
  {
    id: 'moment-aguero',
    reward: card('aguero', 'Sergio Agüero', 'ST', 'Argentinien', 'Manchester City', 'Premier League', 93, '93:20'),
    story: 'Letzter Spieltag 2012: Tor zum 3:2 gegen QPR in der 93:20 – die erste Meisterschaft für City seit 44 Jahren.',
    minAvg: 89, minEach: 86,
    needs: [
      { label: 'Premier-League-Spieler', count: 5, test: league('Premier League') },
      { label: 'Argentinier', count: 2, test: nation('Argentinien') },
      { label: 'Stürmer', count: 3, test: pos('ST') },
      { label: 'Ikone', count: 1, test: isIcon },
      { label: 'Kult-Held', count: 1, test: isCult },
    ],
  },
  {
    id: 'moment-lewandowski',
    reward: card('lewandowski', 'Robert Lewandowski', 'ST', 'Polen', 'FC Bayern München', 'Bundesliga', 93, '9 Minuten'),
    story: '22. September 2015, zur Halbzeit eingewechselt: fünf Tore gegen Wolfsburg in weniger als neun Minuten.',
    minAvg: 90, minEach: 87,
    needs: [
      { label: 'Bundesliga-Spieler', count: 5, test: league('Bundesliga') },
      { label: 'Stürmer ab 86', count: 4, test: pos('ST', 86) },
      { label: 'Ikonen', count: 2, test: isIcon },
    ],
  },
  {
    id: 'moment-gervinho',
    reward: card('gervinho', 'Gervinho', 'FL', 'Elfenbeinküste', 'OSC Lille', 'Ligue 1', 93, 'Die Stirn'),
    story: 'Lille 2011: Meisterschaft und Pokalsieg – mit Gervinho als Tempo-Waffe. Später Arsenal und Rom – und die berühmteste Stirn des Fußballs.',
    minAvg: 90, minEach: 87,
    needs: [
      { label: 'Ligue-1-Spieler', count: 3, test: league('Ligue 1') },
      { label: 'Serie-A-Spieler', count: 3, test: league('Serie A') },
      { label: 'Flügelspieler ab 86', count: 3, test: pos('FL', 86) },
      { label: 'Ikone', count: 1, test: isIcon },
      { label: 'Kult-Held', count: 1, test: isCult },
    ],
  },
  {
    id: 'moment-goetze',
    reward: card('goetze', 'Mario Götze', 'ZOM', 'Deutschland', 'FC Bayern München', 'Bundesliga', 93, "113'"),
    story: 'WM-Finale 2014 im Maracanã: eingewechselt, Flanke von Schürrle, Brust, Volley – 1:0 gegen Argentinien in der 113. Minute. Deutschland ist Weltmeister.',
    minAvg: 90, minEach: 87,
    needs: [
      { label: 'Deutsche', count: 5, test: nation('Deutschland') },
      { label: 'Bundesliga-Spieler', count: 3, test: league('Bundesliga') },
      { label: 'Ikone', count: 1, test: isIcon },
    ],
  },
  {
    id: 'moment-kroos',
    reward: card('kroos', 'Toni Kroos', 'ZM', 'Deutschland', 'Real Madrid', 'LaLiga', 92, "95'"),
    story: 'WM 2018 in Sotschi: In Unterzahl, Nachspielzeit, Freistoß von links – Kroos zirkelt den Ball zum 2:1 gegen Schweden in den Winkel. Laut FIFA das späteste Siegtor der WM-Geschichte.',
    minAvg: 90, minEach: 87,
    needs: [
      { label: 'Deutsche', count: 4, test: nation('Deutschland') },
      { label: 'Mittelfeldspieler ab 86', count: 3, test: (c) => ['ZM', 'ZDM', 'ZOM'].includes(c.position) && c.ovr >= 86 },
      { label: 'LaLiga-Spieler', count: 3, test: league('LaLiga') },
    ],
  },
  {
    id: 'moment-kompany',
    reward: card('kompany', 'Vincent Kompany', 'IV', 'Belgien', 'Manchester City', 'Premier League', 91, 'Der Fernschuss'),
    story: 'Mai 2019, 70. Minute gegen Leicester: Der Kapitän, der sonst nie aus der Distanz schießt, hämmert den Ball zum 1:0 in den Winkel – City holt danach den Titel.',
    minAvg: 89, minEach: 86,
    needs: [
      { label: 'Innenverteidiger ab 85', count: 4, test: pos('IV', 85) },
      { label: 'Premier-League-Spieler', count: 4, test: league('Premier League') },
      { label: 'Kult-Held', count: 1, test: isCult },
    ],
  },
  {
    id: 'moment-grafite',
    reward: card('grafite', 'Grafite', 'ST', 'Brasilien', 'VfL Wolfsburg', 'Bundesliga', 92, 'Meister 2009'),
    story: 'Wolfsburg wird 2009 sensationell Meister. Grafite schießt 28 Tore – zusammen mit Džeko 54, Bundesliga-Rekord für ein Sturmduo.',
    minAvg: 88, minEach: 86,
    needs: [
      { label: 'Bundesliga-Spieler', count: 6, test: league('Bundesliga') },
      { label: 'Brasilianer', count: 3, test: nation('Brasilien') },
      { label: 'Stürmer', count: 2, test: pos('ST') },
      { label: 'Kult-Held', count: 1, test: isCult },
    ],
  },
  {
    id: 'moment-dzeko',
    reward: card('dzeko', 'Edin Džeko', 'ST', 'Bosnien-Herzegowina', 'VfL Wolfsburg', 'Bundesliga', 92, 'Meister 2009'),
    story: 'Die andere Hälfte des Rekord-Duos: 26 Tore in der Meistersaison 2009. Erst nach Grafite verfügbar.',
    minAvg: 89, minEach: 86,
    after: 'moment-grafite',
    needs: [
      { label: 'Bundesliga-Spieler', count: 6, test: league('Bundesliga') },
      { label: 'Stürmer ab 85', count: 3, test: pos('ST', 85) },
      { label: 'Kult-Helden', count: 2, test: isCult },
    ],
  },
];

export const momentDone = (club: ClubState, m: MomentSbc) => (club.tasksDone[m.id] ?? 0) > 0;
export const momentOpen = (club: ClubState, m: MomentSbc) =>
  !momentDone(club, m) && (!m.after || (club.tasksDone[m.after] ?? 0) > 0) && (!m.event || eventActive(m.event));
/** Sichtbar: normale Momente immer, Event-Momente nur im Event (oder wenn schon erledigt). */
export const momentVisible = (club: ClubState, m: MomentSbc) => !m.event || eventActive(m.event) || momentDone(club, m);

/** Karten, die man abgeben darf: gezogene Karten (je Karte einmal), keine eigenen Sonderkarten. */
export const momentCandidates = (club: ClubState): CollectCard[] =>
  Object.entries(club.cards).filter(([id, n]) => n > 0 && getCard(id)).map(([id]) => withUpgrade(club, getCard(id)!));

export interface MomentCheck {
  ok: boolean;
  avg: number;
  rows: { label: string; have: number | string; need: number | string; ok: boolean }[];
}

/** Prüft eine Auswahl gegen alle Regeln – für die Anzeige (✓/✗) und vor dem Tausch. */
export function checkMoment(m: MomentSbc, cards: CollectCard[]): MomentCheck {
  const avg = cards.length ? cards.reduce((a, c) => a + c.ovr, 0) / cards.length : 0;
  const weakest = cards.length ? Math.min(...cards.map((c) => c.ovr)) : 0;
  const unique = new Set(cards.map((c) => c.id)).size === cards.length;
  const rows: MomentCheck['rows'] = [
    { label: 'Karten', have: cards.length, need: MOMENT_SIZE, ok: cards.length === MOMENT_SIZE && unique },
    { label: 'Schnitt', have: avg ? avg.toFixed(1).replace('.', ',') : '–', need: `${m.minAvg}+`, ok: cards.length === MOMENT_SIZE && avg >= m.minAvg },
    { label: 'Jede Karte', have: cards.length ? weakest : '–', need: `${m.minEach}+`, ok: cards.length > 0 && weakest >= m.minEach },
    ...m.needs.map((n) => {
      const have = cards.filter(n.test).length;
      return { label: n.label, have, need: n.count, ok: have >= n.count };
    }),
  ];
  return { ok: rows.every((r) => r.ok), avg, rows };
}

/** Tausch durchführen: je eine Kopie der 11 Karten weg, die Momentkarte kommt in die eigenen Karten. */
export function completeMoment(club: ClubState, momentId: string, ids: string[]): ClubState | null {
  const m = MOMENTS.find((x) => x.id === momentId);
  if (!m || !momentOpen(club, m)) return null;
  if (ids.some((id) => !(club.cards[id] > 0) || !getCard(id))) return null;
  const chosen = ids.map((id) => withUpgrade(club, getCard(id)!));
  if (!checkMoment(m, chosen).ok) return null;
  const cards = { ...club.cards };
  for (const id of ids) {
    cards[id] -= 1;
    if (cards[id] <= 0) delete cards[id];
  }
  const specials = [...club.specials, m.reward];
  const squad = club.squad.map((id) => (id && !cards[id] && !specials.some((s) => s.id === id) ? null : id));
  return { ...club, cards, specials, squad, tasksDone: { ...club.tasksDone, [m.id]: 1 } };
}

/**
 * „Automatisch füllen“: sucht 11 passende Karten – möglichst Doppelte und die schwächsten, die gerade reichen.
 * Karten aus der Aufstellung nur, wenn es nicht anders geht. Gibt die Auswahl zurück (auch unvollständig).
 */
export function autoFillMoment(club: ClubState, m: MomentSbc): string[] {
  const inSquad = new Set(club.squad.filter(Boolean) as string[]);
  // Seltenheit zuerst (normale Elite-Karten vor Sonderkarten), dann Wertung; Doppelte billiger, Stammspieler teuer.
  const cost = (c: CollectCard) => rarity(c) + (inSquad.has(c.id) ? 500 : 0) - ((club.cards[c.id] ?? 0) > 1 ? 40 : 0);
  const pool = momentCandidates(club).filter((c) => c.ovr >= m.minEach).sort((a, b) => cost(a) - cost(b));
  const pick: CollectCard[] = [];
  // Seltene Anforderungen zuerst bedienen
  const needs = [...m.needs].sort((a, b) => pool.filter(a.test).length - pool.filter(b.test).length);
  for (const n of needs) {
    let have = pick.filter(n.test).length;
    for (const c of pool) {
      if (have >= n.count || pick.length >= MOMENT_SIZE) break;
      if (!pick.includes(c) && n.test(c)) { pick.push(c); have++; }
    }
  }
  for (const c of pool) if (pick.length < MOMENT_SIZE && !pick.includes(c)) pick.push(c);
  // Schnitt zu niedrig: schwächste Karte (die keine Pflicht erfüllt) gegen die günstigste stärkere tauschen
  const needsOk = (cards: CollectCard[]) => m.needs.every((n) => cards.filter(n.test).length >= n.count);
  const avg = (cards: CollectCard[]) => cards.reduce((a, c) => a + c.ovr, 0) / cards.length;
  for (let guard = 0; pick.length === MOMENT_SIZE && avg(pick) < m.minAvg && guard < 60; guard++) {
    const order = [...pick].sort((a, b) => a.ovr - b.ovr);
    let swapped = false;
    for (const weak of order) {
      const rest = pick.filter((c) => c !== weak);
      const better = pool.find((c) => !pick.includes(c) && c.ovr > weak.ovr && needsOk([...rest, c]));
      if (better) { pick.splice(pick.indexOf(weak), 1, better); swapped = true; break; }
    }
    if (!swapped) break;
  }
  return pick.map((c) => c.id);
}

/** Was fehlt noch? Für den Hinweis unter „Automatisch füllen“. */
export function momentMissing(m: MomentSbc, cards: CollectCard[]): string[] {
  return checkMoment(m, cards).rows.filter((r) => !r.ok).map((r) => (typeof r.need === 'number' && typeof r.have === 'number' ? `${r.label}: noch ${r.need - r.have}` : `${r.label}: ${r.have} statt ${r.need}`));
}
