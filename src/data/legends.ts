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

// Gescheiterte Talente: als Wunderkinder gefeiert, der große Durchbruch blieb aus – oft wegen Verletzungen,
// Pech oder falscher Wechsel. Hier bekommen sie eine zweite Chance. Werte sind eigene Schätzungen.
const FAILED_RAW: typeof RAW = [
  ['Freddy Adu', 'USA', 'ZOM', 17, 69, 90, 'Benfica Lissabon', ['diva', 'wildcard'],
    'Mit 14 Profi in den USA und als „nächster Pelé“ gefeiert – danach eine Reise durch unzählige Vereine.'],
  ['Bojan Krkić', 'Spanien', 'ST', 17, 72, 90, 'FC Barcelona', ['wildcard'],
    'Knackte als Teenager bei Barça Rekorde – der ganz große Durchbruch blieb aus.'],
  ['Alexandre Pato', 'Brasilien', 'ST', 18, 75, 92, 'AC Mailand', ['fragile', 'showman'],
    'Mit 18 Torjäger in Mailand. Dann kamen die Muskelverletzungen – immer und immer wieder.'],
  ['Jack Wilshere', 'England', 'ZM', 19, 74, 90, 'Arsenal FC', ['fragile', 'leader'],
    'Englands großes Mittelfeldtalent, das Verletzungen ein ums andere Mal stoppten.'],
  ['Kerlon', 'Brasilien', 'ST', 19, 68, 86, 'Inter Mailand', ['showman', 'fragile'],
    'Erfinder des „Seehund-Dribblings“: Ball auf der Stirn, Gegner ratlos. Die Knie spielten nicht mit.'],
  ['Federico Macheda', 'Italien', 'ST', 17, 67, 86, 'Manchester United', ['clutch'],
    'Traumtor beim Debüt 2009 gegen Aston Villa – danach wurde es still um ihn.'],
  ['Ravel Morrison', 'England', 'ZM', 18, 69, 89, 'Manchester United', ['wildcard', 'diva'],
    'Galt in Manchester als eines der größten Talente seiner Generation. Der Durchbruch kam nie.'],
  ['Anderson', 'Brasilien', 'ZM', 19, 73, 88, 'Manchester United', ['wildcard'],
    'Golden Boy 2008 – später eher für schwankende Form als für Titel bekannt.'],
  ['Hachim Mastour', 'Marokko', 'ZOM', 16, 62, 88, 'AC Mailand', ['showman', 'diva'],
    'Mit 15 ein Freestyle-Star im Netz, Millionen Klicks. Auf dem Platz blieb der Durchbruch aus.'],
  ['Giovani dos Santos', 'Mexiko', 'FL', 18, 71, 88, 'FC Barcelona', ['showman'],
    'Barças Wunderkind aus Mexiko – in Europa wurde er nie der erhoffte Star.'],
  ['Gaël Kakuta', 'Frankreich', 'FL', 18, 68, 87, 'Chelsea FC', ['wildcard'],
    'Um seinen Wechsel zu Chelsea gab es sogar Streit vor der FIFA – danach folgte Leihe auf Leihe.'],
  ['Marko Marin', 'Deutschland', 'FL', 19, 72, 87, 'Borussia Mönchengladbach', ['showman'],
    'Als „deutscher Messi“ gefeiert, bei Chelsea kaum gespielt – danach quer durch Europa.'],
];

export const FAILED_TALENTS: LegendTemplate[] = FAILED_RAW.map(([name, nation, position, age, ovr, potential, club, traits, bio]) => ({
  name, nation, position, age, ovr, potential, clubId: slugify(club), traits, bio,
}));
