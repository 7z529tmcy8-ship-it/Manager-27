import { getCard, withUpgrade, type ClubState, type CollectCard } from './club';

// Spezial-Tausche: Legendäre Momente als Karten (91–93). Man gibt genau 11 Karten ab – und die Regeln sind hart.
// Jede Karte gibt es nur einmal. Ausfüllen muss man selbst, Karte für Karte.

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
}

const isIcon = (c: CollectCard) => c.variant === 'icon';
const isCult = (c: CollectCard) => c.variant === 'cult';
const league = (name: string) => (c: CollectCard) => c.league === name;
const nation = (name: string) => (c: CollectCard) => c.nation === name;
const pos = (p: string, min = 0) => (c: CollectCard) => c.position === p && c.ovr >= min;

const card = (id: string, name: string, position: CollectCard['position'], nat: string, club: string, lg: string, ovr: number, label: string): CollectCard =>
  ({ id: `moment-${id}`, name, position, nation: nat, club, league: lg, ovr, variant: 'moment', label });

export const MOMENTS: MomentSbc[] = [
  {
    id: 'moment-ramos',
    reward: card('ramos', 'Sergio Ramos', 'IV', 'Spanien', 'Real Madrid', 'LaLiga', 93, '92:48'),
    story: 'Champions-League-Finale 2014 gegen Atlético: Kopfball zum 1:1 in der 92:48. Real gewinnt am Ende 4:1 nach Verlängerung.',
    minAvg: 87, minEach: 83,
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
    minAvg: 87, minEach: 82,
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
    minAvg: 88, minEach: 84,
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
    minAvg: 88, minEach: 84,
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
    minAvg: 88, minEach: 84,
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
    minAvg: 88, minEach: 84,
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
    minAvg: 87, minEach: 83,
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
    minAvg: 85, minEach: 80,
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
    minAvg: 86, minEach: 80,
    after: 'moment-grafite',
    needs: [
      { label: 'Bundesliga-Spieler', count: 6, test: league('Bundesliga') },
      { label: 'Stürmer ab 85', count: 3, test: pos('ST', 85) },
      { label: 'Kult-Helden', count: 2, test: isCult },
    ],
  },
];

export const momentDone = (club: ClubState, m: MomentSbc) => (club.tasksDone[m.id] ?? 0) > 0;
export const momentOpen = (club: ClubState, m: MomentSbc) => !momentDone(club, m) && (!m.after || (club.tasksDone[m.after] ?? 0) > 0);

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
