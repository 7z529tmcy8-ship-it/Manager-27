// Neuigkeiten für das Update-Banner. Bei jedem Update kommt ein neuer Eintrag GANZ OBEN dazu –
// mit einer neuen, eindeutigen id. Das Banner erscheint dann automatisch einmal bei allen Spielern.

export interface UpdateNote {
  /** Eindeutige Kennung, z. B. Datum + Kürzel. */
  id: string;
  date: string;
  title: string;
  items: string[];
}

export const GREETING = 'An Alle Ayris die das spielen!';

export const UPDATES: UpdateNote[] = [
  {
    id: '2026-10-05-landesliga',
    date: '05.10.2026',
    title: 'Familie, Vermögen, Landesliga & mehr Gefühl',
    items: [
      '🏟️ Neue 6. Liga: die Landesliga Hannover mit allen 17 Vereinen – von SC Hemmingen-Westerfeld bis VfR Germania Ochtersum.',
      '👨‍👧 Familie: Einmal pro Karriere laden dich Brasilianerinnen zur After-Party ein … Kinder erziehst du mit festen Regeln (Verein, Schule, Zocken, Essen). Mit 18 kann dein Kind Profi werden und Coins verdienen.',
      '💼 Vermögen: Kauf Immobilien und Anteile an Fußballklubs – und steck Geld in deine Klubs.',
      '🎬 Große Momente: Animationen für Torschützenkönig, Titel, Wechsel, Durchbruch und Formkrise.',
      '📋 Trainer: Ein Klick oben auf „Nächste Saison spielen“ – Details nur noch, wenn du willst.',
      '🌙 Abseits des Platzes: Partys, Wetten, Doping … wer übertreibt, ruiniert seine Karriere.',
      '⬆️ Karten verbessern bis 99 – aber das kostet richtig Coins.',
    ],
  },
  {
    id: '2026-10-03-skills',
    date: '03.10.2026',
    title: 'Spielertypen, Fähigkeitenbaum & Spieler-Baukasten',
    items: [
      '🎯 Wähle deinen Spielertyp und schalte im Fähigkeitenbaum Boni frei – mit Meisterstück am Ende.',
      '📏 Eigener Spieler: Größe, Gewicht und Attributpunkte bestimmen jetzt das Potenzial.',
      '⚽ Torjäger-Rennen: Kämpfe gegen echte Stürmer um die Torjägerkanone.',
      '🕰️ Zeitreise: der Kader von Hannover 96 aus 2018/19.',
    ],
  },
];

export const LATEST_UPDATE = UPDATES[0];
