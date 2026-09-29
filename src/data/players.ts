import type { Position } from '../game/types';
import { slugify } from './leagues';

export interface RealPlayerTemplate {
  name: string;
  nation: string;
  position: Position;
  /** Alter zu Beginn der Saison 2025/26. */
  age: number;
  ovr: number;
  potential: number;
  clubId: string;
}

// Echte Spieler als Startpunkt. Gesamtwertung und Potenzial sind eigene
// Schätzungen zum Saisonstart 2025/26, KEINE offiziellen EA-FC-Werte.
const RAW: [string, string, Position, number, number, number, string][] = [
  ['Lennart Karl', 'Deutschland', 'FL', 17, 70, 88, 'FC Bayern München'],
  ['Said El Mala', 'Deutschland', 'FL', 19, 72, 84, '1. FC Köln'],
  ['Assan Ouédraogo', 'Deutschland', 'ZM', 19, 73, 85, 'RB Leipzig'],
  ['Tom Bischof', 'Deutschland', 'ZM', 20, 76, 85, 'FC Bayern München'],
  ['Aleksandar Pavlović', 'Deutschland', 'ZDM', 21, 82, 88, 'FC Bayern München'],
  ['Jamal Musiala', 'Deutschland', 'ZOM', 22, 88, 92, 'FC Bayern München'],
  ['Florian Wirtz', 'Deutschland', 'ZOM', 22, 88, 92, 'Liverpool FC'],
  ['Karim Adeyemi', 'Deutschland', 'FL', 23, 80, 84, 'Borussia Dortmund'],
  ['Nick Woltemade', 'Deutschland', 'ST', 23, 80, 85, 'Newcastle United'],
  ['Joshua Kimmich', 'Deutschland', 'ZDM', 30, 87, 87, 'FC Bayern München'],
  ['Manuel Neuer', 'Deutschland', 'TW', 39, 85, 85, 'FC Bayern München'],
  ['Jobe Bellingham', 'England', 'ZM', 20, 77, 86, 'Borussia Dortmund'],
  ['Rio Ngumoha', 'England', 'FL', 17, 66, 86, 'Liverpool FC'],
  ['Ethan Nwaneri', 'England', 'ZOM', 18, 77, 88, 'Arsenal FC'],
  ['Myles Lewis-Skelly', 'England', 'AV', 18, 77, 86, 'Arsenal FC'],
  ['Kobbie Mainoo', 'England', 'ZM', 20, 79, 87, 'Manchester United'],
  ['Jude Bellingham', 'England', 'ZOM', 22, 89, 92, 'Real Madrid'],
  ['Harry Kane', 'England', 'ST', 32, 89, 89, 'FC Bayern München'],
  ['Lamine Yamal', 'Spanien', 'FL', 18, 89, 95, 'FC Barcelona'],
  ['Pau Cubarsí', 'Spanien', 'IV', 18, 82, 90, 'FC Barcelona'],
  ['Dean Huijsen', 'Spanien', 'IV', 20, 82, 89, 'Real Madrid'],
  ['Kenan Yıldız', 'Türkei', 'FL', 20, 82, 89, 'Juventus Turin'],
  ['Arda Güler', 'Türkei', 'ZOM', 20, 81, 89, 'Real Madrid'],
  ['Désiré Doué', 'Frankreich', 'FL', 20, 84, 91, 'Paris Saint-Germain'],
  ['Warren Zaïre-Emery', 'Frankreich', 'ZM', 19, 80, 88, 'Paris Saint-Germain'],
  ['Kylian Mbappé', 'Frankreich', 'ST', 26, 91, 91, 'Real Madrid'],
  ['Franco Mastantuono', 'Argentinien', 'FL', 18, 76, 89, 'Real Madrid'],
  ['Nico Paz', 'Argentinien', 'ZOM', 21, 80, 87, 'Como 1907'],
  ['Estêvão', 'Brasilien', 'FL', 18, 79, 90, 'Chelsea FC'],
  ['Endrick', 'Brasilien', 'ST', 19, 76, 88, 'Real Madrid'],
  ['Erling Haaland', 'Norwegen', 'ST', 25, 91, 92, 'Manchester City'],
  // Japan & Südkorea
  ['Hayate Matsuda', 'Japan', 'AV', 21, 64, 74, 'Hannover 96'],
  ['Takefusa Kubo', 'Japan', 'FL', 24, 82, 84, 'Real Sociedad'],
  ['Kaoru Mitoma', 'Japan', 'FL', 28, 81, 81, 'Brighton & Hove Albion'],
  ['Ritsu Doan', 'Japan', 'FL', 27, 80, 80, 'Eintracht Frankfurt'],
  ['Hiroki Ito', 'Japan', 'IV', 26, 80, 81, 'FC Bayern München'],
  ['Ko Itakura', 'Japan', 'IV', 28, 78, 78, 'Ajax Amsterdam'],
  ['Yukinari Sugawara', 'Japan', 'AV', 25, 76, 78, 'SV Werder Bremen'],
  ['Ao Tanaka', 'Japan', 'ZM', 26, 77, 78, 'Leeds United'],
  ['Daichi Kamada', 'Japan', 'ZOM', 29, 78, 78, 'Crystal Palace'],
  ['Wataru Endo', 'Japan', 'ZDM', 32, 78, 78, 'Liverpool FC'],
  ['Kim Min-jae', 'Südkorea', 'IV', 28, 84, 84, 'FC Bayern München'],
  ['Lee Kang-in', 'Südkorea', 'ZOM', 24, 80, 83, 'Paris Saint-Germain'],
  // Bundesliga & 2. Bundesliga
  ['Kennet Eichhorn', 'Deutschland', 'ZDM', 16, 64, 85, 'Hertha BSC'],
  ['Can Uzun', 'Türkei', 'ZOM', 19, 76, 87, 'Eintracht Frankfurt'],
  ['Nathaniel Brown', 'Deutschland', 'AV', 22, 77, 83, 'Eintracht Frankfurt'],
  ['Jonathan Burkardt', 'Deutschland', 'ST', 25, 80, 82, 'Eintracht Frankfurt'],
  ['Johan Manzambi', 'Schweiz', 'ZM', 19, 73, 85, 'SC Freiburg'],
  ['Paul Nebel', 'Deutschland', 'ZOM', 22, 76, 81, '1. FSV Mainz 05'],
  ['Angelo Stiller', 'Deutschland', 'ZM', 24, 81, 84, 'VfB Stuttgart'],
  ['Deniz Undav', 'Deutschland', 'ST', 29, 81, 81, 'VfB Stuttgart'],
  ['Yan Diomande', 'Elfenbeinküste', 'FL', 18, 74, 87, 'RB Leipzig'],
  ['Antonio Nusa', 'Norwegen', 'FL', 20, 77, 86, 'RB Leipzig'],
  ['Maximilian Beier', 'Deutschland', 'ST', 22, 79, 83, 'Borussia Dortmund'],
  ['Felix Nmecha', 'Deutschland', 'ZM', 24, 80, 84, 'Borussia Dortmund'],
  ['Nico Schlotterbeck', 'Deutschland', 'IV', 25, 84, 86, 'Borussia Dortmund'],
  ['Serhou Guirassy', 'Guinea', 'ST', 29, 85, 85, 'Borussia Dortmund'],
  ['Marcel Sabitzer', 'Österreich', 'ZM', 31, 80, 80, 'Borussia Dortmund'],
  ['Michael Olise', 'Frankreich', 'FL', 23, 88, 90, 'FC Bayern München'],
  ['Luis Díaz', 'Kolumbien', 'FL', 28, 86, 86, 'FC Bayern München'],
  ['Jonathan Tah', 'Deutschland', 'IV', 29, 85, 85, 'FC Bayern München'],
  ['Serge Gnabry', 'Deutschland', 'FL', 30, 82, 82, 'FC Bayern München'],
  ['Konrad Laimer', 'Österreich', 'ZM', 28, 82, 82, 'FC Bayern München'],
  // Europas Topligen
  ['Kai Havertz', 'Deutschland', 'ST', 26, 85, 86, 'Arsenal FC'],
  ['Bukayo Saka', 'England', 'FL', 23, 88, 90, 'Arsenal FC'],
  ['Declan Rice', 'England', 'ZM', 26, 87, 88, 'Arsenal FC'],
  ['Viktor Gyökeres', 'Schweden', 'ST', 27, 86, 86, 'Arsenal FC'],
  ['Cole Palmer', 'England', 'ZOM', 23, 87, 90, 'Chelsea FC'],
  ['Mohamed Salah', 'Ägypten', 'FL', 33, 89, 89, 'Liverpool FC'],
  ['Rodri', 'Spanien', 'ZDM', 29, 88, 88, 'Manchester City'],
  ['Rayan Cherki', 'Frankreich', 'ZOM', 22, 83, 88, 'Manchester City'],
  ['Granit Xhaka', 'Schweiz', 'ZM', 32, 83, 83, 'Sunderland AFC'],
  ['Pedri', 'Spanien', 'ZM', 22, 89, 91, 'FC Barcelona'],
  ['Roony Bardghji', 'Schweden', 'FL', 19, 71, 84, 'FC Barcelona'],
  ['Vinícius Júnior', 'Brasilien', 'FL', 25, 89, 90, 'Real Madrid'],
  ['Vitinha', 'Portugal', 'ZM', 25, 88, 89, 'Paris Saint-Germain'],
  ['João Neves', 'Portugal', 'ZM', 20, 85, 90, 'Paris Saint-Germain'],
  ['Ayyoub Bouaddi', 'Frankreich', 'ZM', 17, 70, 86, 'OSC Lille'],
  ['Geovany Quenda', 'Portugal', 'FL', 18, 76, 88, 'Sporting Lissabon'],
  ['Rodrigo Mora', 'Portugal', 'ZOM', 18, 74, 87, 'FC Porto'],
  ['Kees Smit', 'Niederlande', 'ZM', 19, 72, 87, 'AZ Alkmaar'],
];

export const REAL_PLAYERS: RealPlayerTemplate[] = RAW.map(
  ([name, nation, position, age, ovr, potential, club]) => ({
    name, nation, position, age, ovr, potential, clubId: slugify(club),
  }),
);

export interface Nation {
  name: string;
  /** Ab dieser Gesamtwertung wird man regelmäßig nominiert. */
  callUp: number;
}

export const NATIONS: Nation[] = [
  { name: 'Deutschland', callUp: 81 },
  { name: 'Österreich', callUp: 75 },
  { name: 'Schweiz', callUp: 76 },
  { name: 'Türkei', callUp: 76 },
  { name: 'England', callUp: 82 },
  { name: 'Frankreich', callUp: 83 },
  { name: 'Spanien', callUp: 82 },
  { name: 'Italien', callUp: 80 },
  { name: 'Portugal', callUp: 81 },
  { name: 'Niederlande', callUp: 80 },
  { name: 'Belgien', callUp: 78 },
  { name: 'Kroatien', callUp: 77 },
  { name: 'Polen', callUp: 75 },
  { name: 'Norwegen', callUp: 75 },
  { name: 'Brasilien', callUp: 83 },
  { name: 'Argentinien', callUp: 82 },
  { name: 'USA', callUp: 74 },
  { name: 'Japan', callUp: 75 },
  { name: 'Südkorea', callUp: 74 },
  { name: 'Schweden', callUp: 76 },
  { name: 'Kolumbien', callUp: 78 },
  { name: 'Ägypten', callUp: 74 },
  { name: 'Elfenbeinküste', callUp: 75 },
  { name: 'Guinea', callUp: 72 },
  { name: 'Dänemark', callUp: 76 },
  { name: 'Irland', callUp: 73 },
];

export function getNation(name: string): Nation {
  return NATIONS.find((n) => n.name === name) ?? { name, callUp: 74 };
}

export const POSITIONS: { id: Position; label: string }[] = [
  { id: 'TW', label: 'Torwart' },
  { id: 'IV', label: 'Innenverteidiger' },
  { id: 'AV', label: 'Außenverteidiger' },
  { id: 'ZDM', label: 'Defensives Mittelfeld' },
  { id: 'ZM', label: 'Zentrales Mittelfeld' },
  { id: 'ZOM', label: 'Offensives Mittelfeld' },
  { id: 'FL', label: 'Flügelspieler' },
  { id: 'ST', label: 'Stürmer' },
];
