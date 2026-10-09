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
  // Sommer 2026 zu bzw. bei Galatasaray (per Websuche geprüft) – die Süper Lig gibt es im Karrieremodus nicht.
  ['Rafael Leão', 'Portugal', 'FL', 26, 86, 'Galatasaray', 'Süper Lig'],
  ['Victor Osimhen', 'Nigeria', 'ST', 26, 88, 'Galatasaray', 'Süper Lig'],
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
  ['Rivaldo', 'Brasilien', 'ZOM', 93],
  ['Roberto Baggio', 'Italien', 'ZOM', 93],
  ['Ruud Gullit', 'Niederlande', 'ZM', 92],
  ['Alessandro Del Piero', 'Italien', 'ST', 92],
  ['Roberto Carlos', 'Brasilien', 'AV', 91],
  ['Cafu', 'Brasilien', 'AV', 91],
  ['Patrick Vieira', 'Frankreich', 'ZDM', 91],
  ['David Beckham', 'England', 'ZM', 90],
];

/**
 * Kult-Helden: Publikumslieblinge und „Forgotten Names“ in ihrer besten Zeit – Tricks, Tore, Geschichten.
 * [Name, Nation, Position, Wertung, Verein der besten Zeit]. Wertungen sind eigene Schätzungen.
 */
export const CULT_HEROES: [string, string, Position, number, string][] = [
  ['Ricardo Quaresma', 'Portugal', 'FL', 86, 'FC Porto'],
  ['Juan Román Riquelme', 'Argentinien', 'ZOM', 89, 'Boca Juniors'],
  ['Pablo Aimar', 'Argentinien', 'ZOM', 86, 'FC Valencia'],
  ['Wesley Sneijder', 'Niederlande', 'ZOM', 88, 'Inter Mailand'],
  ['Rafael van der Vaart', 'Niederlande', 'ZOM', 86, 'Hamburger SV'],
  ['Dimitar Berbatov', 'Bulgarien', 'ST', 87, 'Manchester United'],
  ['Christian Vieri', 'Italien', 'ST', 89, 'Inter Mailand'],
  ['Jay-Jay Okocha', 'Nigeria', 'ZOM', 86, 'Bolton Wanderers'],
  ['Obafemi Martins', 'Nigeria', 'ST', 83, 'Newcastle United'],
  ['Taribo West', 'Nigeria', 'IV', 80, 'Inter Mailand'],
  ['Denílson', 'Brasilien', 'FL', 84, 'Real Betis'],
  ['Djibril Cissé', 'Frankreich', 'ST', 84, 'AJ Auxerre'],
  ['Hidetoshi Nakata', 'Japan', 'ZOM', 84, 'AS Rom'],
  ['Shinji Kagawa', 'Japan', 'ZOM', 85, 'Borussia Dortmund'],
  ['Aliaksandr Hleb', 'Belarus', 'ZOM', 84, 'Arsenal FC'],
  ['Kevin-Prince Boateng', 'Ghana', 'ZM', 83, 'AC Mailand'],
  ['Mesut Özil', 'Deutschland', 'ZOM', 88, 'Real Madrid'],
  ['Ailton', 'Brasilien', 'ST', 85, 'Werder Bremen'],
  ['Diego', 'Brasilien', 'ZOM', 86, 'Werder Bremen'],
  ['Grafite', 'Brasilien', 'ST', 85, 'VfL Wolfsburg'],
  ['Zvjezdan Misimović', 'Bosnien-Herzegowina', 'ZOM', 84, 'VfL Wolfsburg'],
  ['Marcelinho', 'Brasilien', 'ZOM', 85, 'Hertha BSC'],
  ['Zé Roberto', 'Brasilien', 'ZM', 86, 'FC Bayern München'],
  ['Roque Santa Cruz', 'Paraguay', 'ST', 83, 'Blackburn Rovers'],
  ['Kevin Kurányi', 'Deutschland', 'ST', 84, 'FC Schalke 04'],
  ['Gerald Asamoah', 'Deutschland', 'ST', 80, 'FC Schalke 04'],
  ['Lukas Podolski', 'Deutschland', 'ST', 85, '1. FC Köln'],
  ['Mario Gómez', 'Deutschland', 'ST', 86, 'VfB Stuttgart'],
  ['Jens Lehmann', 'Deutschland', 'TW', 86, 'Arsenal FC'],
  ['Hans-Jörg Butt', 'Deutschland', 'TW', 80, 'Bayer Leverkusen'],
  ['Arjen Robben', 'Niederlande', 'FL', 91, 'FC Bayern München'],
  ['Franck Ribéry', 'Frankreich', 'FL', 90, 'FC Bayern München'],
  ['Fernando Torres', 'Spanien', 'ST', 90, 'Liverpool FC'],
  ['Yaya Touré', 'Elfenbeinküste', 'ZM', 89, 'Manchester City'],
  ['David Villa', 'Spanien', 'ST', 89, 'Valencia CF'],
  ['Diego Forlán', 'Uruguay', 'ST', 88, 'Atlético Madrid'],
  ['Carlos Tévez', 'Argentinien', 'ST', 88, 'Manchester United'],
  ['Marcelo', 'Brasilien', 'AV', 88, 'Real Madrid'],
  ['Dani Alves', 'Brasilien', 'AV', 88, 'FC Barcelona'],
  ['Xabi Alonso', 'Spanien', 'ZM', 88, 'Liverpool FC'],
  ['Pepe', 'Portugal', 'IV', 87, 'Real Madrid'],
];

/** Was-wäre-wenn-Talente nur als Karte (ihr Jugendverein ist nicht im Karrieremodus). [Name, Nation, Position, Potenzial, Verein] */
export const EXTRA_TALENTS: [string, string, Position, number, string][] = [
  ['Paulo Henrique Ganso', 'Brasilien', 'ZOM', 88, 'FC Santos'],
];

/**
 * Halloween 2026: Legenden im Kostüm (nur in Halloween-Packs). Bewusst nur lebende Spieler – Kostüme, keine „Geister“.
 * [Name, Nation, Position, Wertung, Kostüm]
 */
export const HALLOWEEN_CARDS: [string, string, Position, number, string][] = [
  ['Ronaldinho', 'Brasilien', 'ZOM', 96, 'Kürbiskopf'],
  ['Zlatan Ibrahimović', 'Schweden', 'ST', 95, 'Vampir'],
  ['Oliver Kahn', 'Deutschland', 'TW', 94, 'Werwolf'],
  ['Stefan Effenberg', 'Deutschland', 'ZM', 93, 'Graf Dracula'],
  ['Gennaro Gattuso', 'Italien', 'ZDM', 92, 'Monster'],
  ['Mario Balotelli', 'Italien', 'ST', 91, 'Hexenmeister'],
  ['Jens Lehmann', 'Deutschland', 'TW', 90, 'Sensenmann'],
  ['Kevin-Prince Boateng', 'Ghana', 'ZM', 89, 'Zombie'],
  ['Mario Basler', 'Deutschland', 'ZM', 89, 'Mumie'],
  ['Nicklas Bendtner', 'Dänemark', 'ST', 88, 'Gespenst'],
];
