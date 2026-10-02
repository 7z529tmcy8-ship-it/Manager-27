import type { Position } from '../game/types';

// Zusätzliche Sammelkarten (nur für Packs, nicht als Karriere-Start). Vereine Stand Saison 2025/26
// (Wechsel des Sommers 2025 geprüft); Wertungen sind eigene Schätzungen, keine offiziellen EA-FC-Werte.

/** [Name, Nation, Position, Alter 2025, Wertung, Verein, Liga] */
export const EXTRA_STARS: [string, string, Position, number, number, string, string][] = [
  ['Ousmane Dembélé', 'Frankreich', 'FL', 28, 90, 'Paris Saint-Germain', 'Ligue 1'],
  ['Khvicha Kvaratskhelia', 'Georgien', 'FL', 24, 88, 'Paris Saint-Germain', 'Ligue 1'],
  ['Achraf Hakimi', 'Marokko', 'AV', 26, 88, 'Paris Saint-Germain', 'Ligue 1'],
  ['Alexander Isak', 'Schweden', 'ST', 25, 88, 'Liverpool FC', 'Premier League'],
  ['Virgil van Dijk', 'Niederlande', 'IV', 34, 89, 'Liverpool FC', 'Premier League'],
  ['Alisson', 'Brasilien', 'TW', 32, 88, 'Liverpool FC', 'Premier League'],
  ['William Saliba', 'Frankreich', 'IV', 24, 88, 'Arsenal FC', 'Premier League'],
  ['Martin Ødegaard', 'Norwegen', 'ZOM', 26, 87, 'Arsenal FC', 'Premier League'],
  ['Phil Foden', 'England', 'ZOM', 25, 86, 'Manchester City', 'Premier League'],
  ['Bruno Fernandes', 'Portugal', 'ZOM', 30, 87, 'Manchester United', 'Premier League'],
  ['Trent Alexander-Arnold', 'England', 'AV', 26, 86, 'Real Madrid', 'LaLiga'],
  ['Federico Valverde', 'Uruguay', 'ZM', 27, 89, 'Real Madrid', 'LaLiga'],
  ['Thibaut Courtois', 'Belgien', 'TW', 33, 89, 'Real Madrid', 'LaLiga'],
  ['Antonio Rüdiger', 'Deutschland', 'IV', 32, 86, 'Real Madrid', 'LaLiga'],
  ['Raphinha', 'Brasilien', 'FL', 28, 89, 'FC Barcelona', 'LaLiga'],
  ['Robert Lewandowski', 'Polen', 'ST', 37, 87, 'FC Barcelona', 'LaLiga'],
  ['Marc-André ter Stegen', 'Deutschland', 'TW', 33, 86, 'FC Barcelona', 'LaLiga'],
  ['Lautaro Martínez', 'Argentinien', 'ST', 28, 89, 'Inter Mailand', 'Serie A'],
  ['Kevin De Bruyne', 'Belgien', 'ZOM', 34, 87, 'SSC Neapel', 'Serie A'],
  ['Luka Modrić', 'Kroatien', 'ZM', 39, 85, 'AC Mailand', 'Serie A'],
  ['Lionel Messi', 'Argentinien', 'FL', 38, 88, 'Inter Miami', 'MLS'],
  ['Son Heung-min', 'Südkorea', 'FL', 33, 85, 'Los Angeles FC', 'MLS'],
  ['Thomas Müller', 'Deutschland', 'ZOM', 36, 82, 'Vancouver Whitecaps', 'MLS'],
  ['Cristiano Ronaldo', 'Portugal', 'ST', 40, 86, 'Al-Nassr', 'Saudi Pro League'],
  ['Neymar', 'Brasilien', 'FL', 33, 83, 'Santos FC', 'Brasileirão'],
];

/** Ikonen: Größen der Fußballgeschichte in ihrer besten Zeit. [Name, Nation, Position, Wertung] */
export const EXTRA_ICONS: [string, string, Position, number][] = [
  ['Pelé', 'Brasilien', 'ST', 98],
  ['Diego Maradona', 'Argentinien', 'ZOM', 97],
  ['Johan Cruyff', 'Niederlande', 'ST', 96],
  ['Ronaldo Nazário', 'Brasilien', 'ST', 96],
  ['Franz Beckenbauer', 'Deutschland', 'IV', 95],
  ['Paolo Maldini', 'Italien', 'IV', 94],
  ['Thierry Henry', 'Frankreich', 'ST', 94],
  ['Gerd Müller', 'Deutschland', 'ST', 94],
  ['Lew Jaschin', 'Russland', 'TW', 94],
  ['Xavi', 'Spanien', 'ZM', 93],
  ['Andrés Iniesta', 'Spanien', 'ZM', 93],
  ['Kaká', 'Brasilien', 'ZOM', 92],
  ['Iker Casillas', 'Spanien', 'TW', 92],
  ['Andrea Pirlo', 'Italien', 'ZM', 91],
  ['Philipp Lahm', 'Deutschland', 'AV', 91],
  ['Miroslav Klose', 'Deutschland', 'ST', 90],
  ['Bastian Schweinsteiger', 'Deutschland', 'ZM', 90],
  ['Michael Ballack', 'Deutschland', 'ZM', 90],
];
