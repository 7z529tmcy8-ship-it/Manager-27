// Ära-Event „Zeitreise“ (1.–8. November 2026): 10 Spieler in drei Zeiten. Vereine der Legenden-Zeit
// recherchiert 11/2026 (Neymar Santos, Modrić AC Mailand, Lewandowski Chicago Fire, Müller Vancouver Whitecaps).
// Wertungen geschätzt. [Verein, Liga, Wertung, Jahr/Text]

export type Era = 'talent' | 'prime' | 'legend';
export const ERA_ORDER: Era[] = ['talent', 'prime', 'legend'];
export const ERA_NAME: Record<Era, string> = { talent: 'Talent', prime: 'Bestzeit', legend: 'Legende' };

type EraStage = [club: string, league: string, ovr: number, when: string];
export interface EraPlayer { name: string; position: 'TW' | 'IV' | 'AV' | 'ZDM' | 'ZM' | 'ZOM' | 'FL' | 'ST'; nation: string; eras: Record<Era, EraStage> }

export const ERA_PLAYERS: EraPlayer[] = [
  { name: 'Cristiano Ronaldo', position: 'ST', nation: 'Portugal', eras: { talent: ['Sporting Lissabon', 'Liga Portugal', 82, '2003'], prime: ['Real Madrid', 'LaLiga', 95, '2014'], legend: ['Al-Nassr', 'Saudi Pro League', 89, '2026'] } },
  { name: 'Lionel Messi', position: 'FL', nation: 'Argentinien', eras: { talent: ['FC Barcelona', 'LaLiga', 83, '2005'], prime: ['FC Barcelona', 'LaLiga', 96, '2012'], legend: ['Inter Miami', 'MLS', 90, '2026'] } },
  { name: 'Neymar', position: 'FL', nation: 'Brasilien', eras: { talent: ['Santos FC', 'Brasileirão', 82, '2011'], prime: ['FC Barcelona', 'LaLiga', 93, '2015'], legend: ['Santos FC', 'Brasileirão', 86, '2026'] } },
  { name: 'Luka Modrić', position: 'ZM', nation: 'Kroatien', eras: { talent: ['Dinamo Zagreb', 'HNL', 80, '2007'], prime: ['Real Madrid', 'LaLiga', 93, '2018'], legend: ['AC Mailand', 'Serie A', 88, '2026'] } },
  { name: 'Robert Lewandowski', position: 'ST', nation: 'Polen', eras: { talent: ['Borussia Dortmund', 'Bundesliga', 82, '2011'], prime: ['FC Bayern München', 'Bundesliga', 94, '2020'], legend: ['Chicago Fire', 'MLS', 88, '2026'] } },
  { name: 'Manuel Neuer', position: 'TW', nation: 'Deutschland', eras: { talent: ['FC Schalke 04', 'Bundesliga', 82, '2008'], prime: ['FC Bayern München', 'Bundesliga', 94, '2014'], legend: ['FC Bayern München', 'Bundesliga', 88, '2026'] } },
  { name: 'Thomas Müller', position: 'ZOM', nation: 'Deutschland', eras: { talent: ['FC Bayern München', 'Bundesliga', 81, '2010'], prime: ['FC Bayern München', 'Bundesliga', 92, '2020'], legend: ['Vancouver Whitecaps', 'MLS', 86, '2026'] } },
  { name: 'Kevin De Bruyne', position: 'ZOM', nation: 'Belgien', eras: { talent: ['KRC Genk', 'Pro League', 80, '2011'], prime: ['Manchester City', 'Premier League', 94, '2020'], legend: ['SSC Neapel', 'Serie A', 89, '2026'] } },
  { name: 'Mohamed Salah', position: 'FL', nation: 'Ägypten', eras: { talent: ['FC Basel', 'Super League', 80, '2013'], prime: ['Liverpool FC', 'Premier League', 94, '2018'], legend: ['Liverpool FC', 'Premier League', 90, '2026'] } },
  { name: 'Harry Kane', position: 'ST', nation: 'England', eras: { talent: ['Tottenham Hotspur', 'Premier League', 81, '2015'], prime: ['Tottenham Hotspur', 'Premier League', 92, '2018'], legend: ['FC Bayern München', 'Bundesliga', 91, '2026'] } },
];
export const eraCardId = (name: string) => `aera-${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '-')}`;

/** Welche Zeit eine Ära-Karte gerade zeigt: wechselt jeden Tag (Talent → Bestzeit → Legende → …). */
export function eraToday(now = new Date()): Era {
  const day = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86_400_000);
  return ERA_ORDER[((day % 3) + 3) % 3];
}
