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

/**
 * Ids von Einträgen, die wieder entfernt wurden (stille Updates). Wer so einen Eintrag schon gesehen hat,
 * bekommt kein altes Banner erneut angezeigt.
 */
export const RETIRED_IDS = ['2026-10-05-sounds'];

export const UPDATES: UpdateNote[] = [
  {
    id: '2026-10-05-backup-projekt',
    date: '05.10.2026',
    title: 'Sichern & Laden + das Leipzig-Projekt',
    items: [
      '💾 Neu im Hauptmenü: „Sichern & Laden“. Exportier deine Karrieren, Coins und Karten als Datei oder Text und spiel sie jederzeit wieder ein – auch auf einem anderen Gerät. Mach das ab und zu, falls der Browser seine Daten löscht!',
      '🏗️ Investieren lohnt sich jetzt richtig: Steckst du viel Geld in einen Klub, an dem du Anteile hast, baut er Saison für Saison Kader und Umfeld aus (max. +6 Stärke pro Jahr).',
      '🚀 Mit genug Coins wird aus einem Landesligisten über die Jahre ein Bundesligist – etwa 500.000 Coins und 6–8 Saisons. Hörst du auf zu zahlen, bröckelt es langsam wieder.',
      '⚽ Auch im Ruhestand läuft der Fußball weiter: Ligen spielen im Hintergrund, deine Klubs können auf- und absteigen.',
    ],
  },
  {
    id: '2026-10-05-skilltree-xl',
    date: '05.10.2026',
    title: 'Fähigkeitenbaum XL – schwer zu holen, stark wenn man es schafft',
    items: [
      '🌳 Jeder Ast hat jetzt 5 statt 3 Stufen – 10 Fähigkeiten pro Spielertyp statt 6.',
      '💰 Kosten steigen: Stufe 1 kostet 1 Punkt, Stufe 5 kostet 5. Einen ganzen Ast zu füllen kostet 15 Punkte.',
      '🌍 Stufe 5 „Weltklasse“: bis zu +2 Gesamtwertung oder +20–25 % Tore bzw. Vorlagen.',
      '👑 Das Meisterstück kostet 8 Punkte und braucht einen kompletten Ast plus Stufe 2 im anderen. Dafür gibt es +2 Gesamtwertung und richtig starke Boni. Das schaffen nur echte Weltstars, meist erst mit Mitte 30.',
      'ℹ️ Schon gelernte Fähigkeiten bleiben erhalten.',
    ],
  },
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
