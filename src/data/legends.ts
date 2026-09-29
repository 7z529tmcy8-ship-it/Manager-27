import type { Position } from '../game/types';
import type { TraitId } from '../game/traits';
import { slugify } from './leagues';

export interface LegendTemplate {
  name: string;
  nation: string;
  position: Position;
  age: number;
  ovr: number;
  potential: number;
  clubId: string;
  traits: TraitId[];
  /** Kurzer, augenzwinkernder Steckbrief. */
  bio: string;
}

// „Was wäre wenn“: Kultfiguren starten ihre Karriere als junge Spieler im heutigen Fußball.
// Werte und Startvereine sind frei erfunden bzw. geschätzt – es geht um den Charakter, nicht um Statistik.
const RAW: [string, string, Position, number, number, number, string, TraitId[], string][] = [
  ['Mario Balotelli', 'Italien', 'ST', 18, 72, 89, 'Inter Mailand', ['wildcard', 'hothead', 'showman'],
    'Riesentalent mit ganz eigenem Kopf. Warum immer er? Das fragt sich die halbe Liga.'],
  ['Zlatan Ibrahimović', 'Schweden', 'ST', 19, 71, 91, 'Ajax Amsterdam', ['showman', 'leader', 'diva'],
    'Selbstbewusstsein XXL – und die Tore, um es zu rechtfertigen.'],
  ['Ronaldinho', 'Brasilien', 'ZOM', 20, 78, 94, 'Paris Saint-Germain', ['showman', 'party', 'wildcard'],
    'Zaubert mit einem Lächeln. Die Nacht ist allerdings genauso sein Revier wie der Rasen.'],
  ['Eric Cantona', 'Frankreich', 'ST', 21, 74, 88, 'Olympique Marseille', ['hothead', 'showman', 'leader'],
    'Kragen hoch, Brust raus. Genial am Ball, unberechenbar daneben.'],
  ['Paul Gascoigne', 'England', 'ZM', 19, 74, 89, 'Newcastle United', ['party', 'showman', 'wildcard'],
    'Tränen, Tricks und Streiche – der Clown mit dem Wunderfuß.'],
  ['Antonio Cassano', 'Italien', 'ZOM', 19, 73, 88, 'AS Rom', ['wildcard', 'diva', 'party'],
    'Talent für drei, Launen für fünf.'],
  ['Stefan Effenberg', 'Deutschland', 'ZM', 20, 74, 88, 'Borussia Mönchengladbach', ['hothead', 'leader', 'diva'],
    'Der Tiger: Chef auf dem Platz, und das sagt er auch jedem.'],
  ['Mario Basler', 'Deutschland', 'FL', 22, 74, 84, 'SV Werder Bremen', ['party', 'showman', 'wildcard'],
    'Ecken direkt verwandeln? Kein Problem. Früh ins Bett? Schon eher.'],
  ['Oliver Kahn', 'Deutschland', 'TW', 21, 72, 90, 'Karlsruher SC', ['hothead', 'leader', 'clutch'],
    'Weiter, immer weiter. Wer ihm zu nahe kommt, bekommt es zu spüren.'],
  ['Gennaro Gattuso', 'Italien', 'ZDM', 19, 70, 85, 'AC Mailand', ['hothead', 'leader', 'professional'],
    'Kämpft um jeden Ball, als wäre es der letzte.'],
  ['Roy Keane', 'Irland', 'ZDM', 20, 72, 88, 'Nottingham Forest', ['hothead', 'leader', 'professional'],
    'Kompromisslos in jedem Zweikampf – und in jeder Kabinenansprache.'],
  ['Zinédine Zidane', 'Frankreich', 'ZOM', 20, 76, 94, 'OGC Nizza', ['clutch', 'hothead', 'professional'],
    'Eleganz pur. Nur provozieren sollte man ihn besser nicht.'],
  ['Nicklas Bendtner', 'Dänemark', 'ST', 19, 70, 84, 'Arsenal FC', ['diva', 'party', 'wildcard'],
    'Hält sich selbst für einen der Besten der Welt. Der Lord hat Stil.'],
  ['Lothar Matthäus', 'Deutschland', 'ZM', 20, 76, 91, 'Borussia Mönchengladbach', ['leader', 'professional', 'clutch'],
    'Laufwunder, Weltmeistertyp, ewiger Rekordspieler in spe.'],
];

export const LEGENDS: LegendTemplate[] = RAW.map(([name, nation, position, age, ovr, potential, club, traits, bio]) => ({
  name, nation, position, age, ovr, potential, clubId: slugify(club), traits, bio,
}));
