import type { Position } from '../game/types';

// Zusätzliche Sammelkarten (nur für Packs, nicht als Karriere-Start). Vereine Stand Saison 2025/26
// (Wechsel des Sommers 2025 geprüft); Wertungen sind eigene Schätzungen, keine offiziellen EA-FC-Werte.

/** [Name, Nation, Position, Alter 2025, Wertung, Verein, Liga] */
// Dembélé, Raphinha, Lautaro & Co. sind seit Oktober 2026 echte Karriere-Spieler (players.ts) und kommen von dort in den Kartenpool.
export const EXTRA_STARS: [string, string, Position, number, number, string, string][] = [
  ['Virgil van Dijk', 'Niederlande', 'IV', 34, 89, 'Liverpool FC', 'Premier League'],
  ['Alisson', 'Brasilien', 'TW', 32, 88, 'Liverpool FC', 'Premier League'],
  ['Bruno Fernandes', 'Portugal', 'ZOM', 30, 87, 'Manchester United', 'Premier League'],
  ['Trent Alexander-Arnold', 'England', 'AV', 26, 86, 'Real Madrid', 'LaLiga'],
  ['Thibaut Courtois', 'Belgien', 'TW', 33, 89, 'Real Madrid', 'LaLiga'],
  ['Antonio Rüdiger', 'Deutschland', 'IV', 32, 86, 'Real Madrid', 'LaLiga'],
  ['Robert Lewandowski', 'Polen', 'ST', 37, 87, 'FC Barcelona', 'LaLiga'],
  ['Marc-André ter Stegen', 'Deutschland', 'TW', 33, 86, 'FC Barcelona', 'LaLiga'],
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
  // Oktober 2026: noch mehr Legenden
  ['Ferenc Puskás', 'Ungarn', 'ST', 96],
  ['Michel Platini', 'Frankreich', 'ZOM', 95],
  ['Marco van Basten', 'Niederlande', 'ST', 95],
  ['Romário', 'Brasilien', 'ST', 95],
  ['Garrincha', 'Brasilien', 'FL', 95],
  ['Zico', 'Brasilien', 'ZOM', 94],
  ['Eusébio', 'Portugal', 'ST', 94],
  ['Francesco Totti', 'Italien', 'ZOM', 94],
  ['Bobby Charlton', 'England', 'ZOM', 93],
  ['George Best', 'Nordirland', 'FL', 93],
  ['Dennis Bergkamp', 'Niederlande', 'ST', 93],
  ['Andriy Shevchenko', 'Ukraine', 'ST', 93],
  ['Gabriel Batistuta', 'Argentinien', 'ST', 93],
  ['Karl-Heinz Rummenigge', 'Deutschland', 'FL', 92],
  ['Steven Gerrard', 'England', 'ZM', 92],
  ['Luís Figo', 'Portugal', 'FL', 92],
  ['Raúl', 'Spanien', 'ST', 92],
  ['Pavel Nedvěd', 'Tschechien', 'ZM', 92],
  ['Didier Drogba', 'Elfenbeinküste', 'ST', 92],
  ["Samuel Eto'o", 'Kamerun', 'ST', 92],
  ['George Weah', 'Liberia', 'ST', 92],
  ['Peter Schmeichel', 'Dänemark', 'TW', 92],
  ['Fabio Cannavaro', 'Italien', 'IV', 91],
  ['Carles Puyol', 'Spanien', 'IV', 91],
  ['Frank Rijkaard', 'Niederlande', 'ZDM', 91],
  ['Frank Lampard', 'England', 'ZM', 91],
  ['Michael Laudrup', 'Dänemark', 'ZOM', 91],
  ['Hristo Stoichkov', 'Bulgarien', 'FL', 91],
  ['Gheorghe Hagi', 'Rumänien', 'ZOM', 91],
  ['Jürgen Klinsmann', 'Deutschland', 'ST', 91],
  ['Uwe Seeler', 'Deutschland', 'ST', 91],
  ['Sepp Maier', 'Deutschland', 'TW', 91],
  ['Just Fontaine', 'Frankreich', 'ST', 91],
  ['Jean-Pierre Papin', 'Frankreich', 'ST', 91],
  ['Rudi Völler', 'Deutschland', 'ST', 90],
  ['Rui Costa', 'Portugal', 'ZOM', 90],
  ['Clarence Seedorf', 'Niederlande', 'ZM', 90],
  ['Edwin van der Sar', 'Niederlande', 'TW', 90],
  ['Javier Zanetti', 'Argentinien', 'AV', 90],
  ['Hernán Crespo', 'Argentinien', 'ST', 90],
  ['Robin van Persie', 'Niederlande', 'ST', 90],
  ['Rio Ferdinand', 'England', 'IV', 89],
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
  // Oktober 2026: noch mehr fragwürdige Helden
  ['Faustino Asprilla', 'Kolumbien', 'ST', 87, 'Parma'],
  ['Hakan Şükür', 'Türkei', 'ST', 87, 'Galatasaray'],
  ['Ali Daei', 'Iran', 'ST', 86, 'Hertha BSC'],
  ['José Luis Chilavert', 'Paraguay', 'TW', 86, 'Vélez Sarsfield'],
  ['Cuauhtémoc Blanco', 'Mexiko', 'ZOM', 86, 'Club América'],
  ['René Higuita', 'Kolumbien', 'TW', 85, 'Atlético Nacional'],
  ['Max Kruse', 'Deutschland', 'ST', 85, 'SV Werder Bremen'],
  ['Jorge Campos', 'Mexiko', 'TW', 84, 'Pumas UNAM'],
  ['Tim Wiese', 'Deutschland', 'TW', 84, 'SV Werder Bremen'],
  ['Adebayo Akinfenwa', 'England', 'ST', 84, 'Wycombe Wanderers'],
  ['Asamoah Gyan', 'Ghana', 'ST', 84, 'Sunderland AFC'],
  ['Marouane Fellaini', 'Belgien', 'ZM', 84, 'Manchester United'],
  ['Emile Heskey', 'England', 'ST', 83, 'Liverpool FC'],
  ['Ivan Klasnić', 'Kroatien', 'ST', 83, 'SV Werder Bremen'],
  ['Joey Barton', 'England', 'ZM', 82, 'Newcastle United'],
  ['Royston Drenthe', 'Niederlande', 'FL', 82, 'Real Madrid'],
  ['Kevin Großkreutz', 'Deutschland', 'AV', 82, 'Borussia Dortmund'],
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

/**
 * Debüt-Karten: Stars als ihre junge Version aus dem ersten Pflichtspiel für die Profis.
 * [Name, Nation, Position, Wertung, Verein beim Debüt, Jahr des Debüts]. Wertungen sind eigene Schätzungen.
 */
export const DEBUT_CARDS: [string, string, Position, number, string, number][] = [
  ['Lionel Messi', 'Argentinien', 'FL', 89, 'FC Barcelona', 2004],
  ['Ronaldinho', 'Brasilien', 'ZOM', 88, 'Grêmio', 1998],
  ['Cristiano Ronaldo', 'Portugal', 'FL', 87, 'Sporting Lissabon', 2002],
  ['Kylian Mbappé', 'Frankreich', 'ST', 87, 'AS Monaco', 2015],
  ['Neymar', 'Brasilien', 'FL', 87, 'Santos FC', 2009],
  ['Wayne Rooney', 'England', 'ST', 86, 'Everton FC', 2002],
  ['Andrés Iniesta', 'Spanien', 'ZM', 86, 'FC Barcelona', 2002],
  ['Gianluigi Buffon', 'Italien', 'TW', 86, 'Parma', 1995],
  ['Lamine Yamal', 'Spanien', 'FL', 86, 'FC Barcelona', 2023],
  ['Erling Haaland', 'Norwegen', 'ST', 85, 'Bryne FK', 2016],
  ['Jamal Musiala', 'Deutschland', 'ZOM', 85, 'FC Bayern München', 2020],
  ['Florian Wirtz', 'Deutschland', 'ZOM', 85, 'Bayer 04 Leverkusen', 2020],
  ['Jude Bellingham', 'England', 'ZM', 85, 'Birmingham City', 2019],
  ['Manuel Neuer', 'Deutschland', 'TW', 85, 'FC Schalke 04', 2006],
  ['Toni Kroos', 'Deutschland', 'ZM', 85, 'FC Bayern München', 2007],
  ['Kevin De Bruyne', 'Belgien', 'ZOM', 85, 'KRC Genk', 2008],
  ['Vinícius Júnior', 'Brasilien', 'FL', 85, 'Flamengo', 2017],
  ['Thierry Henry', 'Frankreich', 'ST', 85, 'AS Monaco', 1994],
  ['Thomas Müller', 'Deutschland', 'ZOM', 84, 'FC Bayern München', 2008],
  ['Mohamed Salah', 'Ägypten', 'FL', 84, 'El Mokawloon', 2010],
];

/**
 * Geisternacht (30./31.10.2026): zweite Halloween-Welle, nur zwei Tage. Wieder nur lebende Spieler im Kostüm.
 * [Name, Nation, Position, Wertung, Kostüm]
 */
export const GEISTERNACHT_CARDS: [string, string, Position, number, string][] = [
  ['Ronaldo Nazário', 'Brasilien', 'ST', 97, 'Schattenkönig'],
  ['Wayne Rooney', 'England', 'ST', 94, 'Frankenstein'],
  ['Andrea Pirlo', 'Italien', 'ZM', 94, 'Phantom der Oper'],
  ['Gianluigi Buffon', 'Italien', 'TW', 93, 'Nachtwächter'],
  ['Edgar Davids', 'Niederlande', 'ZDM', 92, 'Skelett-Pirat'],
  ['Peter Crouch', 'England', 'ST', 89, 'Riesenskelett'],
];

/**
 * Ballon d’Or 2026 (Verleihung 26.10.2026 in London): bekannteste Nominierte der echten 30er-Liste
 * (per Websuche geprüft). Gala-Karten mit Event-Wertung; Verein kommt aus der normalen Karte. [Name, Gala-Wertung]
 */
export const GALA_NOMINEES: [string, number][] = [
  ['Lamine Yamal', 94],
  ['Harry Kane', 94],
  ['Kylian Mbappé', 94],
  ['Ousmane Dembélé', 93],
  ['Erling Haaland', 93],
  ['Michael Olise', 92],
  ['Vitinha', 92],
  ['Lionel Messi', 91],
];
/** Sieger der Wahl – wird nach der Verleihung eingetragen (bis dahin null). */
export const BALLON_WINNER_2026: string | null = null;

/**
 * Comeback-Karten: Rückkehr nach schwerer Verletzung, Krankheit oder Rückschlag.
 * [Name, Nation, Position, Wertung, Verein/Team beim Comeback, Jahr]. Wertungen sind eigene Schätzungen.
 */
export const COMEBACK_CARDS: [string, string, Position, number, string, number][] = [
  ['Ronaldo Nazário', 'Brasilien', 'ST', 98, 'Seleção', 2002], // nach zwei Knieverletzungen Weltmeister mit 8 WM-Toren
  ['Arjen Robben', 'Niederlande', 'FL', 93, 'FC Bayern München', 2013], // Elfer 2012 verschossen, CL-Siegtor 2013
  ['Virgil van Dijk', 'Niederlande', 'IV', 91, 'Liverpool FC', 2021], // Kreuzbandriss Oktober 2020
  ['Henrik Larsson', 'Schweden', 'ST', 90, 'Celtic Glasgow', 2001], // Beinbruch 1999, Goldener Schuh 2001 (35 Ligatore)
  ['Radamel Falcao', 'Kolumbien', 'ST', 89, 'AS Monaco', 2017], // Kreuzbandriss 2014, Meister 2017
  ['Christian Eriksen', 'Dänemark', 'ZOM', 88, 'FC Brentford', 2022], // Herzstillstand EM 2021
  ['Santi Cazorla', 'Spanien', 'ZM', 87, 'FC Villarreal', 2018], // 636 Tage verletzt
  ['Sébastien Haller', 'Elfenbeinküste', 'ST', 86, 'Elfenbeinküste', 2024], // Hodenkrebs 2022, Siegtor Afrika-Cup-Finale 2024
];

/**
 * Rückblende-Karten: Spieler in der Form ihrer besten Saison – mit dem Verein von damals.
 * [Name, Nation, Position, Wertung, Verein in der Saison, Saison]. Wertungen sind eigene Schätzungen.
 */
export const FLASHBACK_CARDS: [string, string, Position, number, string, string][] = [
  ['Lionel Messi', 'Argentinien', 'FL', 98, 'FC Barcelona', '2011/12'], // 73 Pflichtspieltore
  ['Cristiano Ronaldo', 'Portugal', 'ST', 97, 'Real Madrid', '2014/15'], // 48 Liga-Tore
  ['Robert Lewandowski', 'Polen', 'ST', 96, 'FC Bayern München', '2020/21'], // 41 Bundesliga-Tore
  ['Luka Modrić', 'Kroatien', 'ZM', 95, 'Real Madrid', '2018'], // WM-Finale und Ballon d’Or
  ['Mohamed Salah', 'Ägypten', 'FL', 95, 'Liverpool FC', '2017/18'], // 32 Premier-League-Tore
  ['Kevin De Bruyne', 'Belgien', 'ZOM', 95, 'Manchester City', '2019/20'], // 20 Liga-Vorlagen
  ['Harry Kane', 'England', 'ST', 95, 'FC Bayern München', '2023/24'], // 36 Bundesliga-Tore
  ['Neymar', 'Brasilien', 'FL', 94, 'FC Barcelona', '2014/15'], // Triple
  ['Thomas Müller', 'Deutschland', 'ZOM', 93, 'FC Bayern München', '2019/20'], // 21 Vorlagen, Triple
];

/** Winter-Wunder (1.–27. Dezember 2026): Stars im Eis-Design, +4 bis +6. [Name, Wertung] */
export const WINTER_CARDS: [string, number][] = [
  ['Erling Haaland', 95],
  ['Kylian Mbappé', 95],
  ['Lamine Yamal', 93],
  ['Harry Kane', 93],
  ['Vinícius Júnior', 92],
  ['Mohamed Salah', 92],
  ['Florian Wirtz', 91],
  ['Jamal Musiala', 91],
  ['Pedri', 91],
  ['Jude Bellingham', 91],
  ['Michael Olise', 90],
  ['Declan Rice', 89],
];

/** Silvester (31.12.2026–1.1.2027): Feuerwerks-Karten, nur zwei Tage. [Name, Wertung] */
export const SILVESTER_CARDS: [string, number][] = [
  ['Ousmane Dembélé', 96],
  ['Kylian Mbappé', 96],
  ['Lamine Yamal', 95],
  ['Erling Haaland', 95],
  ['Harry Kane', 94],
  ['Raphinha', 93],
];
