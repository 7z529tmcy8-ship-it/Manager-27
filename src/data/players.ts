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
