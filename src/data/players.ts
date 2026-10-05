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
  // Hannover 96 – kompletter Profikader (Stand Saison 2026/27, Alter umgerechnet auf den Spielstart 2025/26).
  // Positionen und Nationen laut Vereins- und Kaderangaben; Wertungen sind eigene Schätzungen.
  ['Pascal Loretz', 'Schweiz', 'TW', 22, 69, 78, 'Hannover 96'],
  ['Leo Weinkauf', 'Deutschland', 'TW', 28, 66, 67, 'Hannover 96'],
  ['Jonas Schwanke', 'Deutschland', 'TW', 18, 55, 72, 'Hannover 96'],
  ['Boris Tomiak', 'Deutschland', 'IV', 27, 69, 70, 'Hannover 96'],
  ['Jean Hugonet', 'Frankreich', 'IV', 25, 68, 71, 'Hannover 96'],
  ['Virgil Ghita', 'Rumänien', 'IV', 27, 68, 69, 'Hannover 96'],
  ['Ime Okon', 'Südafrika', 'IV', 21, 66, 75, 'Hannover 96'],
  ['Karl Steinmann', 'Deutschland', 'IV', 19, 60, 75, 'Hannover 96'],
  ['Maurice Neubauer', 'Deutschland', 'AV', 29, 67, 67, 'Hannover 96'],
  ['Hayate Matsuda', 'Japan', 'AV', 21, 64, 74, 'Hannover 96'],
  ['Williams Kokolo', 'Frankreich', 'AV', 25, 66, 69, 'Hannover 96'],
  ['Stefan Thordarson', 'Island', 'ZDM', 26, 69, 70, 'Hannover 96'],
  ['Waniss Taibi', 'Frankreich', 'ZM', 23, 68, 73, 'Hannover 96'],
  ['Franz Roggow', 'Deutschland', 'ZM', 23, 65, 70, 'Hannover 96'],
  ['Bastian Allgeier', 'Deutschland', 'ZM', 23, 65, 70, 'Hannover 96'],
  ['Noah Engelbreth', 'Deutschland', 'ZM', 20, 61, 72, 'Hannover 96'],
  ['Mwisho Mhango', 'Malawi', 'ZM', 17, 56, 74, 'Hannover 96'],
  ['Marcel Hartel', 'Deutschland', 'ZOM', 29, 72, 72, 'Hannover 96'],
  ['Kolja Oudenne', 'Schweden', 'ZOM', 23, 67, 73, 'Hannover 96'],
  ['Lars Gindorf', 'Deutschland', 'FL', 24, 68, 71, 'Hannover 96'],
  ['Mustapha Bundu', 'Sierra Leone', 'FL', 28, 67, 67, 'Hannover 96'],
  ['Daisuke Yokota', 'Japan', 'FL', 25, 67, 70, 'Hannover 96'],
  ['Emir Sahiti', 'Kosovo', 'FL', 26, 68, 70, 'Hannover 96'],
  ['Benjamin Källman', 'Finnland', 'ST', 27, 69, 69, 'Hannover 96'],
  ['Benedikt Pichler', 'Österreich', 'ST', 28, 66, 66, 'Hannover 96'],
  ['Husseyn Chakroun', 'Libanon', 'ST', 20, 60, 70, 'Hannover 96'],
  ['Taycan Etcibasi', 'Deutschland', 'ST', 18, 60, 79, 'Hannover 96'],
  ['Yunus Ünal', 'Deutschland', 'ST', 17, 56, 77, 'Hannover 96'],
];

// Wunderkinder 2026/27 (Golden-Boy-Kandidaten und Toptalente), bei ihren Vereinen nach dem Sommer-Transferfenster 2026
// (per Websuche geprüft, Stand Oktober 2026). Alter wie oben zum Start der Saison 2025/26; Werte sind eigene Schätzungen.
const WONDERKIDS_2026: typeof RAW = [
  ['Thiago Pitarch', 'Spanien', 'ZDM', 18, 74, 87, 'Real Madrid'],
  ['Marc Bernal', 'Spanien', 'ZDM', 18, 75, 87, 'FC Barcelona'],
  ['Xavi Espart', 'Spanien', 'AV', 18, 72, 84, 'FC Barcelona'],
  ['Jon Martín', 'Spanien', 'IV', 19, 75, 86, 'Real Sociedad'],
  ['Junior Kroupi', 'Frankreich', 'ST', 19, 78, 89, 'AFC Bournemouth'],
  ['Rayan', 'Brasilien', 'FL', 19, 76, 87, 'AFC Bournemouth'],
  ['Luka Vušković', 'Kroatien', 'IV', 18, 77, 89, 'Brighton & Hove Albion'],
  ['Charalampos Kostoulas', 'Griechenland', 'ST', 18, 73, 85, 'Brighton & Hove Albion'],
  ['Jorrel Hato', 'Niederlande', 'AV', 19, 78, 87, 'Chelsea FC'],
  ['Marco Palestra', 'Italien', 'AV', 20, 77, 85, 'Chelsea FC'],
  ['Jérémy Jacquet', 'Frankreich', 'IV', 19, 77, 87, 'Liverpool FC'],
  ['Leny Yoro', 'Frankreich', 'IV', 19, 77, 88, 'Manchester United'],
  ['Lucas Bergvall', 'Schweden', 'ZM', 19, 77, 86, 'Tottenham Hotspur'],
  ['Max Dowman', 'England', 'ZOM', 16, 70, 90, 'Arsenal FC'],
  ['Konstantinos Karetsas', 'Griechenland', 'FL', 17, 75, 88, 'Borussia Dortmund'],
  ['Joane Gadou', 'Frankreich', 'IV', 18, 74, 86, 'Borussia Dortmund'],
  ['Finn Jeltsch', 'Deutschland', 'IV', 19, 76, 86, 'VfB Stuttgart'],
  ['Kerim Alajbegović', 'Bosnien-Herzegowina', 'FL', 18, 75, 87, 'Juventus Turin'],
  ['Francesco Pio Esposito', 'Italien', 'ST', 20, 77, 86, 'Inter Mailand'],
  ['Victor Froholdt', 'Dänemark', 'ZM', 19, 77, 86, 'FC Porto'],
  ['Gianluca Prestianni', 'Argentinien', 'FL', 19, 75, 86, 'Benfica Lissabon'],
];

export const REAL_PLAYERS: RealPlayerTemplate[] = [...RAW, ...WONDERKIDS_2026].map(
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
  { name: 'Island', callUp: 69 },
  { name: 'Rumänien', callUp: 72 },
  { name: 'Finnland', callUp: 68 },
  { name: 'Kosovo', callUp: 67 },
  { name: 'Südafrika', callUp: 66 },
  { name: 'Sierra Leone', callUp: 62 },
  { name: 'Libanon', callUp: 60 },
  { name: 'Malawi', callUp: 58 },
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
