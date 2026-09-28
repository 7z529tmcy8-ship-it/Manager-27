import type { Club, League } from '../game/types';

// Vereine und Ligen: Stand Saison 2025/26.
// Die Teamstärken sind eigene Schätzungen (keine offiziellen EA-Ratings).

export const LEAGUES: League[] = [
  {
    id: 'bl1', name: 'Bundesliga', country: 'Deutschland', cup: 'DFB-Pokal', tier: 1, goalsPerGame: 3.1,
    europe: { cl: 4, el: 1, conf: 1 }, down: { leagueId: 'bl2', spots: 3 }, topScorerGoals: 26,
  },
  {
    id: 'bl2', name: '2. Bundesliga', country: 'Deutschland', cup: 'DFB-Pokal', tier: 2, goalsPerGame: 2.9,
    europe: { cl: 0, el: 0, conf: 0 }, up: { leagueId: 'bl1', spots: 3 }, down: { leagueId: 'l3', spots: 3 }, topScorerGoals: 20,
  },
  {
    id: 'l3', name: '3. Liga', country: 'Deutschland', cup: 'DFB-Pokal', tier: 3, goalsPerGame: 2.9,
    europe: { cl: 0, el: 0, conf: 0 }, up: { leagueId: 'bl2', spots: 3 }, down: { leagueId: 'rln', spots: 1 }, topScorerGoals: 20,
  },
  {
    // Vereinfacht: Nur die Regionalliga Nord ist enthalten, daher tauscht sie genau einen Platz mit der 3. Liga.
    id: 'rln', name: 'Regionalliga Nord', country: 'Deutschland', cup: 'DFB-Pokal', tier: 4, goalsPerGame: 3.2,
    europe: { cl: 0, el: 0, conf: 0 }, up: { leagueId: 'l3', spots: 1 }, topScorerGoals: 24,
  },
  {
    id: 'pl', name: 'Premier League', country: 'England', cup: 'FA Cup', tier: 1, goalsPerGame: 2.9,
    europe: { cl: 4, el: 1, conf: 1 }, down: { leagueId: 'ch', spots: 3 }, topScorerGoals: 24,
  },
  {
    id: 'ch', name: 'Championship', country: 'England', cup: 'FA Cup', tier: 2, goalsPerGame: 2.6,
    europe: { cl: 0, el: 0, conf: 0 }, up: { leagueId: 'pl', spots: 3 }, topScorerGoals: 21,
  },
  {
    id: 'll', name: 'LaLiga', country: 'Spanien', cup: 'Copa del Rey', tier: 1, goalsPerGame: 2.6,
    europe: { cl: 4, el: 1, conf: 1 }, topScorerGoals: 25,
  },
  {
    id: 'sa', name: 'Serie A', country: 'Italien', cup: 'Coppa Italia', tier: 1, goalsPerGame: 2.6,
    europe: { cl: 4, el: 1, conf: 1 }, topScorerGoals: 24,
  },
  {
    id: 'l1', name: 'Ligue 1', country: 'Frankreich', cup: 'Coupe de France', tier: 1, goalsPerGame: 2.8,
    europe: { cl: 3, el: 1, conf: 1 }, topScorerGoals: 22,
  },
  {
    id: 'lp', name: 'Liga Portugal', country: 'Portugal', cup: 'Taça de Portugal', tier: 1, goalsPerGame: 2.6,
    europe: { cl: 2, el: 1, conf: 1 }, topScorerGoals: 24,
  },
  {
    id: 'ere', name: 'Eredivisie', country: 'Niederlande', cup: 'KNVB-Beker', tier: 1, goalsPerGame: 3.1,
    europe: { cl: 2, el: 1, conf: 1 }, topScorerGoals: 24,
  },
];

const RAW: Record<string, [string, number][]> = {
  bl1: [
    ['FC Bayern München', 85], ['Borussia Dortmund', 80], ['Bayer 04 Leverkusen', 79], ['RB Leipzig', 78],
    ['Eintracht Frankfurt', 77], ['VfB Stuttgart', 77], ['SC Freiburg', 75], ['TSG Hoffenheim', 75],
    ['VfL Wolfsburg', 74], ['Borussia Mönchengladbach', 74], ['1. FSV Mainz 05', 73], ['1. FC Union Berlin', 73],
    ['SV Werder Bremen', 73], ['FC Augsburg', 72], ['1. FC Köln', 72], ['Hamburger SV', 71],
    ['FC St. Pauli', 71], ['1. FC Heidenheim', 70],
  ],
  bl2: [
    ['FC Schalke 04', 70], ['Hertha BSC', 70], ['VfL Bochum', 69], ['Holstein Kiel', 69],
    ['Hannover 96', 69], ['1. FC Kaiserslautern', 68], ['SC Paderborn 07', 68], ['SV Darmstadt 98', 68],
    ['Fortuna Düsseldorf', 68], ['Karlsruher SC', 67], ['SV Elversberg', 67], ['1. FC Nürnberg', 67],
    ['1. FC Magdeburg', 67], ['Arminia Bielefeld', 67], ['Eintracht Braunschweig', 66], ['SpVgg Greuther Fürth', 66],
    ['Dynamo Dresden', 66], ['Preußen Münster', 66],
  ],
  l3: [
    ['TSV 1860 München', 64], ['FC Energie Cottbus', 64], ['FC Hansa Rostock', 64], ['1. FC Saarbrücken', 64],
    ['Rot-Weiss Essen', 64], ['SSV Ulm 1846', 64], ['SSV Jahn Regensburg', 64], ['Alemannia Aachen', 63],
    ['FC Ingolstadt 04', 63], ['VfL Osnabrück', 63], ['SV Wehen Wiesbaden', 63], ['MSV Duisburg', 63],
    ['FC Erzgebirge Aue', 62], ['SV Waldhof Mannheim', 62], ['SC Verl', 62], ['FC Viktoria Köln', 61],
    ['VfB Stuttgart II', 60], ['TSG Hoffenheim II', 60], ['TSV Havelse', 59], ['1. FC Schweinfurt 05', 59],
  ],
  rln: [
    ['SV Meppen', 60], ['VfB Oldenburg', 59], ['SV Drochtersen/Assel', 57], ['1. FC Phönix Lübeck', 57],
    ['VfB Lübeck', 57], ['Hannover 96 II', 57], ['Hamburger SV II', 57], ['SV Werder Bremen II', 56],
    ['Kickers Emden', 56], ['SC Weiche Flensburg 08', 56], ['SSV Jeddeloh II', 55], ['FC St. Pauli II', 55],
    ['Eintracht Norderstedt', 55], ['Holstein Kiel II', 54], ['SC BW Lohne', 54], ['Altona 93', 54],
    ['HSC Hannover', 54], ['FSV Schöningen', 53],
  ],
  pl: [
    ['Liverpool FC', 85], ['Manchester City', 84], ['Arsenal FC', 84], ['Chelsea FC', 83],
    ['Newcastle United', 81], ['Aston Villa', 80], ['Tottenham Hotspur', 80], ['Manchester United', 80],
    ['Brighton & Hove Albion', 78], ['Nottingham Forest', 78], ['Crystal Palace', 78], ['AFC Bournemouth', 77],
    ['Brentford FC', 77], ['Everton FC', 77], ['Fulham FC', 77], ['West Ham United', 77],
    ['Wolverhampton Wanderers', 75], ['Leeds United', 75], ['Sunderland AFC', 75], ['Burnley FC', 74],
  ],
  ch: [
    ['Leicester City', 73], ['Southampton FC', 73], ['Ipswich Town', 72], ['Sheffield United', 71],
    ['Middlesbrough FC', 70], ['Coventry City', 70], ['West Bromwich Albion', 70], ['Norwich City', 69],
    ['Watford FC', 69], ['Hull City', 68], ['Stoke City', 68], ['Birmingham City', 69],
    ['Wrexham AFC', 68], ['Derby County', 68], ['Bristol City', 69], ['Millwall FC', 68],
    ['Blackburn Rovers', 68], ['Swansea City', 68], ['Queens Park Rangers', 67], ['Preston North End', 68],
    ['Portsmouth FC', 67], ['Sheffield Wednesday', 66], ['Charlton Athletic', 66], ['Oxford United', 66],
  ],
  ll: [
    ['Real Madrid', 86], ['FC Barcelona', 85], ['Atlético Madrid', 82], ['Villarreal CF', 79],
    ['Athletic Club', 78], ['Real Betis', 78], ['Real Sociedad', 77], ['Celta Vigo', 75],
    ['Girona FC', 75], ['Sevilla FC', 75], ['Valencia CF', 75], ['Rayo Vallecano', 74],
    ['CA Osasuna', 74], ['RCD Mallorca', 73], ['Getafe CF', 73], ['RCD Espanyol', 73],
    ['Deportivo Alavés', 72], ['Levante UD', 71], ['Elche CF', 71], ['Real Oviedo', 70],
  ],
  sa: [
    ['Inter Mailand', 84], ['SSC Neapel', 82], ['Juventus Turin', 82], ['AC Mailand', 81],
    ['AS Rom', 80], ['Atalanta Bergamo', 80], ['Lazio Rom', 78], ['FC Bologna', 78],
    ['AC Florenz', 77], ['Como 1907', 77], ['FC Turin', 75], ['Udinese Calcio', 74],
    ['CFC Genua', 73], ['US Sassuolo', 73], ['Hellas Verona', 72], ['Cagliari Calcio', 72],
    ['Parma Calcio', 72], ['US Lecce', 71], ['Pisa SC', 70], ['US Cremonese', 70],
  ],
  l1: [
    ['Paris Saint-Germain', 85], ['Olympique Marseille', 80], ['AS Monaco', 79], ['OSC Lille', 78],
    ['Olympique Lyon', 78], ['OGC Nizza', 76], ['RC Straßburg', 76], ['RC Lens', 76],
    ['Stade Rennes', 76], ['Stade Brest', 74], ['FC Toulouse', 74], ['FC Nantes', 73],
    ['AJ Auxerre', 72], ['Paris FC', 72], ['SCO Angers', 71], ['Le Havre AC', 71],
    ['FC Lorient', 71], ['FC Metz', 70],
  ],
  lp: [
    ['Benfica Lissabon', 80], ['FC Porto', 80], ['Sporting Lissabon', 80], ['Sporting Braga', 76],
    ['Vitória Guimarães', 73], ['FC Famalicão', 71], ['Gil Vicente', 70], ['Santa Clara', 70],
    ['GD Estoril', 70], ['Rio Ave', 69], ['Moreirense FC', 69], ['Casa Pia AC', 69],
    ['FC Arouca', 68], ['CD Nacional', 68], ['Estrela Amadora', 68], ['FC Alverca', 67],
    ['CD Tondela', 67], ['AVS Futebol', 66],
  ],
  ere: [
    ['PSV Eindhoven', 79], ['Feyenoord Rotterdam', 79], ['Ajax Amsterdam', 78], ['AZ Alkmaar', 76],
    ['FC Twente', 74], ['FC Utrecht', 74], ['NEC Nijmegen', 72], ['Go Ahead Eagles', 71],
    ['SC Heerenveen', 71], ['FC Groningen', 70], ['Sparta Rotterdam', 69], ['Fortuna Sittard', 69],
    ['PEC Zwolle', 69], ['NAC Breda', 68], ['Heracles Almelo', 68], ['FC Volendam', 67],
    ['Excelsior Rotterdam', 67], ['Telstar', 66],
  ],
};

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const CLUBS: Club[] = Object.entries(RAW).flatMap(([leagueId, clubs]) =>
  clubs.map(([name, strength]) => ({ id: slugify(name), name, leagueId, strength })),
);

const CLUB_MAP = new Map(CLUBS.map((c) => [c.id, c]));
const LEAGUE_MAP = new Map(LEAGUES.map((l) => [l.id, l]));

export function getClub(id: string): Club {
  const club = CLUB_MAP.get(id);
  if (!club) throw new Error(`Unbekannter Verein: ${id}`);
  return club;
}

export function getLeague(id: string): League {
  const league = LEAGUE_MAP.get(id);
  if (!league) throw new Error(`Unbekannte Liga: ${id}`);
  return league;
}

/**
 * Zweite Mannschaften dürfen höchstens in die 3. Liga aufsteigen und nie in dieselbe
 * oder eine höhere Liga als ihre erste Mannschaft.
 */
export function canPlayIn(clubId: string, leagueId: string, clubLeague: Record<string, string>): boolean {
  const club = getClub(clubId);
  if (!club.name.endsWith(' II')) return true;
  const tier = getLeague(leagueId).tier;
  if (tier <= 2) return false;
  const first = CLUB_MAP.get(slugify(club.name.slice(0, -3)));
  if (!first) return true;
  return getLeague(clubLeague[first.id] ?? first.leagueId).tier < tier;
}

export function initialClubLeague(): Record<string, string> {
  return Object.fromEntries(CLUBS.map((c) => [c.id, c.leagueId]));
}
