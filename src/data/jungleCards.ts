// Event „Jungle Crash“ (zum Start des Roblox-Spiels der Entwickler, 4.–11. November 2026):
// Dschungel-Karten – Stars mit Tier-Spitznamen, +4 auf ihre normale Karte. Eigene Schätzung, nur Spaß-Spitznamen.
// [Name, Spitzname, Tier-Symbol (Linien-Icon)]
export const JUNGLE_PLAYERS: [string, string, string][] = [
  ['Kylian Mbappé', 'Der Gepard', 'bolt'],
  ['Erling Haaland', 'Der Bär', 'fire'],
  ['Virgil van Dijk', 'Der Löwe', 'crown'],
  ['Alisson', 'Der Panther', 'shield'],
  ['Pedri', 'Der Affe', 'spark'],
  ['Rafael Leão', 'Der Jaguar', 'rocket'],
];
export const JUNGLE_BOOST = 4;
export const jungleCardId = (name: string) => `jungle-${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '-')}`;
