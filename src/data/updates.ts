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
    id: '2026-10-07-halten',
    date: '07.10.2026',
    title: 'Gedrückt halten & Verhandlungs-Ergebnis',
    items: [
      '⭐ Fähigkeiten lernst du jetzt durch Gedrückthalten: Die Karte lädt sich gold auf, ein Ton steigt an – und dann knallt es. Keine Fehlklicks mehr.',
      '📞 Gehaltsverhandlung fürs Kind: Nach deiner Forderung klingelt das Telefon („Der Verein überlegt …“) – dann siehst du groß, ob der Deal steht, abgelehnt wurde oder ganz geplatzt ist.',
    ],
  },
  {
    id: '2026-10-07-trainer-kinder',
    date: '07.10.2026',
    title: 'Trainer mit Haltung & Kinder mit eigenem Kopf',
    items: [
      '📬 Trainer: Mitten in der Saison kommen Meldungen aus der Kabine – Medienskandal vor dem Derby, angeschlagener Star, Zuspätkommer, Talent drängt nach oben, Star-Allüren. Du entscheidest, und das verändert Ergebnisse.',
      '📏 Deine Linie: Leg vorher fest, wie du in solchen Situationen handelst („Hart durchgreifen“, „Gesundheit zuerst“ …) – oder entscheide jedes Mal selbst.',
      '🗣️ Trainer-Ruf: Kabine, Medien und Konsequenz – daraus wird dein Trainertyp (Harter Hund, Spielerversteher, Wetterfahne …) und am Saisonende dein Trainerwert.',
      '⚽ Kinder: Wähle den konkreten Jugendverein (Dorfverein bis Top-Akademie). Dazu Ereignisse mit Entscheidung: Scout, Streit mit dem Trainer, Partys, TikTok, Berater …',
      '📝 Mit 18 verhandelst du den Profivertrag deines Kindes: Grundangebot oder pokern bis zum doppelten Gehalt. Platzt der Deal zweimal, sucht sich dein Kind selbst einen Verein – und gibt dir keinen Cent mehr.',
    ],
  },
  {
    id: '2026-10-06-casino',
    date: '06.10.2026',
    title: 'Das Casino hat geöffnet 🎰',
    items: [
      '🎡 Unter „Vermögen → Casino“: Roulette (Rot, Schwarz, Gerade, Ungerade oder alles auf die Null ×36) und Pferdewetten mit Quoten bis 30.',
      '🔥 Einsätze von 1.000 bis 100.000 Coins – oder einfach alles setzen.',
      '💸 Wer nach der Karriere pleite ist, bekommt Anrufe vom Fernsehen: Dschungelcamp, Promi-Boxkampf oder die Doku „Pleite & prominent“.',
    ],
  },
  {
    id: '2026-10-06-freundesliste',
    date: '06.10.2026',
    title: 'Freundesliste & Duell-Verlauf',
    items: [
      '👥 Freunde speichern: Team-Code einfügen → „Speichern“. Schickt dein Freund später einen neuen Code, wird sein Team automatisch aktualisiert.',
      '📜 Verlauf und Bilanz gegen jeden Freund: Siege, Unentschieden, Niederlagen, Tore und die letzten Ergebnisse.',
      '🏆 Rangliste: Wer hat die stärkste Elf in eurer Runde?',
      '📤 Teilen per Knopf (z. B. WhatsApp): deinen Team-Code und nach dem Spiel das Ergebnis – „2:1 gegen dich, Revanche?“',
    ],
  },
  {
    id: '2026-10-06-creator',
    date: '06.10.2026',
    title: 'Dein Spieler, dein Look',
    items: [
      '🪪 Live-Vorschau: Beim Erstellen siehst du deine Karte sofort – mit Wertung, Potenzial und Gesicht.',
      '🎨 Aussehen: Hautton, Frisur (vom Buzzcut bis zum Man-Bun), Haarfarbe, Bart und Stirnband. Dein Gesicht erscheint auf deiner Karte und später auf deiner Ikonen-Karte.',
      '🎡 Herkunft per Glücksrad: Nachwuchsleistungszentrum, Straßenfußballer, Spätstarter aus der Kreisliga oder Fußballer-Familie – aussuchen geht nicht, jede verändert Startwertung, Potenzial und Entwicklung.',
      '🎲 Zufallsspieler: ein Knopf, komplett ausgewürfelt – für schnelle Karrieren.',
    ],
  },
  {
    id: '2026-10-06-klinik',
    date: '06.10.2026',
    title: 'Neu: die Klinik 💎',
    items: [
      '💎 In der Karriere gibt es jetzt die Klinik – eine Behandlung pro Pause, bezahlt mit Coins.',
      '🍑 Schönheits-OPs: Hollywood-Lächeln, Haartransplantation, Nasen-OP, Six-Pack-Modellage und der BBL. Sie bringen Glamour – und Glamour bringt jedes Jahr Werbedeals. Aber: Pfusch, Memes und wochenlange Pausen sind drin.',
      '🧪 „Die volle Kur (komplett vercrackt)“: +6 Wertung für 90.000 Coins – aber 45 % positiver Test (vier Jahre Sperre), der Körper baut danach schneller ab, und manchmal macht das Herz nicht mit.',
    ],
  },
  {
    id: '2026-10-05-freunde-balance',
    date: '05.10.2026',
    title: 'Freunde-Duelle, fairere Balance & mehr Ordnung',
    items: [
      '⚔️ Freunde-Duell: Unter „Mein Team → Freunde“ kopierst du deinen Team-Code und schickst ihn rum. Wer ihn einfügt, spielt gegen deine Elf. Erster Sieg gegen ein Team: +600 Coins.',
      '⚖️ Balance: Superstars sind nicht mehr ganz so übermächtig – realistischere Torzahlen (keine 100-Tore-Saisons mehr), der Ballon d’Or gibt es nur nach einer echten Weltklasse-Saison, und Spieler wachsen höchstens knapp über ihr Potenzial (Fähigkeiten-Boni zählen extra).',
      '🗂️ Sammlung: neue Filter für Kult-Helden, Wunderkinder und „Was wäre wenn“ – mit Zähler, wie viele du schon hast.',
      '📱 „Neue Karriere“: Die Reiter passen am Handy jetzt in zwei Zeilen.',
      '💾 Spielstände werden kompakter gespeichert, damit auch lange Karrieren in den Browser-Speicher passen.',
    ],
  },
  {
    id: '2026-10-05-kult-karriere',
    date: '05.10.2026',
    title: 'Kult-Helden & Wunderkinder jetzt auch im Karrieremodus',
    items: [
      '🧡 Neuer Tab „Kult-Helden“ bei „Neue Karriere“: Starte als junger Ailton bei Werder, Podolski in Köln, Asamoah bei Hannover 96, Okocha in Frankfurt, Quaresma bei Sporting … – 30 Kult-Helden mit eigenen Eigenschaften und Steckbrief.',
      '🌟 Die 21 Wunderkinder 2026/27 sind unter „Echter Spieler“ spielbar – z. B. Kroupi (Bournemouth), Vušković (Brighton), Karetsas (Dortmund), Jeltsch (Stuttgart), Dowman (Arsenal).',
      '🔁 Transfers vom Sommer 2026 nachgetragen: Diomande (Real Madrid), Bouaddi (Manchester City), Rodrigo Mora (AS Rom), Mastantuono (Leihe zur Fiorentina).',
    ],
  },
  {
    id: '2026-10-05-packs-kult',
    date: '05.10.2026',
    title: 'Härtere Packs, Kult-Helden & Wunderkinder 2026',
    items: [
      '🎲 Packs sind jetzt deutlich härter – krasse Karten fühlen sich wieder besonders an. Im Store stehen die echten Chancen (z. B. Gold-Pack: Ikone 0,1 %).',
      '💸 Neue Preise: Gold 7.500, Premium 20.000, Weltstar 30.000, Ikone 60.000, GOAT 150.000 Coins.',
      '🧡 Neue Kartenart „Kult-Held“: 30 Publikumslieblinge in ihrer besten Zeit – Riquelme, Quaresma, Ailton, Sneijder, Okocha, Kagawa, Lehmann … plus eigenes Kult-Pack.',
      '🌟 21 Wunderkinder 2026/27 mit ihren aktuellen Vereinen: Kroupi, Vušković, Hato, Bernal, Pitarch, Jeltsch, Karetsas, Dowman …',
    ],
  },
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
