// Neuigkeiten für das Update-Banner. Bei jedem Update kommt ein neuer Eintrag GANZ OBEN dazu –
// mit einer neuen, eindeutigen id. Das Banner erscheint dann automatisch einmal bei allen Spielern.

export interface UpdateNote {
  /** Eindeutige Kennung, z. B. Datum + Kürzel. */
  id: string;
  date: string;
  title: string;
  items: string[];
  /** Optionales Titelbild (Pfad in public/). */
  image?: string;
  imageAlt?: string;
}

export const GREETING = 'An Alle Ayris die das spielen!';

/**
 * Ids von Einträgen, die wieder entfernt wurden (stille Updates). Wer so einen Eintrag schon gesehen hat,
 * bekommt kein altes Banner erneut angezeigt.
 */
export const RETIRED_IDS = ['2026-10-05-sounds'];

export const UPDATES: UpdateNote[] = [
  {
    id: '2026-10-31-meteor-rush',
    date: '31.10.2026',
    title: 'Bald auf Roblox: Meteor Rush',
    image: '/news/meteor-rush.webp',
    imageAlt: 'Meteor Rush – Titelbild',
    items: [
      'Die Entwickler von Manager Sim arbeiten an einem neuen Spiel: „Meteor Rush“.',
      'Meteoriten stürzen vom Himmel – bohr sie auf, sammle Kristalle und Coins und werde zum besten Meteor-Jäger.',
      'Bald auf Roblox verfügbar. Haltet die Augen offen!',
    ],
  },
  {
    id: '2026-10-31-draft-schwerer',
    date: '31.10.2026',
    title: 'Draft ist schwerer',
    items: [
      'Im Draft kommen jetzt oft auch schwache Karten (Silber, einfaches Gold) – Topkarten sind selten, Ikonen ganz selten.',
      'Der Kapitän liegt zwischen 84 und 89. Ein Turniersieg gelingt nur noch etwa bei jedem 15. bis 25. Versuch – mit guter Chemie öfter.',
    ],
  },
  {
    id: '2026-10-31-hoeher-tiefer',
    date: '31.10.2026',
    title: 'Neu: Höher oder Tiefer',
    items: [
      'Das Kartenduell ist aus dem Casino raus und jetzt ein eigener Modus unter Duelle – ohne Coins und ohne angezeigte Chancen. Beide Knöpfe gehen immer.',
      'Geraten wird mit Karten aus dem ganzen Spiel: echte Spieler, Ikonen, Sonderkarten, Event- und SBC-Karten.',
      'Alle 10 Richtigen am Stück gibt es einen Punkt. Ein Fehler setzt die Serie zurück, Gleichstand zählt nicht.',
      'Mit Punkten entwickelst du drei Talente: Max Dowman, Lennart Karl und Xavi Espart. Jedes Upgrade +3 – das erste kostet 1 Punkt, das zweite 2, dann 3 …',
    ],
  },
  {
    id: '2026-10-31-draft-szenarien',
    date: '31.10.2026',
    title: 'Neu: Draft und Startszenarien',
    items: [
      'Draft (unter Duelle): Kapitän aus 5 Topkarten wählen, für jede Position 1 von 5 Karten draften, dann ein K.-o.-Turnier über 4 Runden. Turniersieg: Ultimate-Pack + Mega-Drop.',
      'Startszenarien (Neue Karriere › Szenario): Comeback nach Kreuzbandriss, Leihspieler, Abstiegskampf, Letzte Chance, neuer Superstar oder Wunderkind-Hype – mit Ziel für die erste Saison.',
      'Szenario-Ziel geschafft: 25.000 Coins und ein Mega-Drop.',
    ],
  },
  {
    id: '2026-10-30-karriere-ruhe',
    date: '30.10.2026',
    title: 'Karriere ohne Nerv',
    items: [
      'Keine Coin-Einblendung mehr nach jeder Saison – das Geld kommt still aufs Konto.',
      'Kein Rückgängig-Knopf mehr nach einer Transfer-Entscheidung.',
      'Kein Scrollen mehr: Beginnt das Transferfenster oder ein neuer Abschnitt, springt die Karriere direkt dorthin.',
    ],
  },
  {
    id: '2026-10-30-wochenpass',
    date: '30.10.2026',
    title: 'Wochenpass, längerer Ruhmesweg, Drops aus der Karriere',
    items: [
      'Der Pass startet jetzt jede Woche neu (Montag bis Sonntag) – mit 60 Stufen und eigener Karte. Dein Fortschritt aus Saison 2 läuft in Woche 44 weiter.',
      'Die Karten der nächsten Wochen: Lamine Yamal 96, Jamal Musiala 95, William Saliba 95, Erling Haaland 97 und Gianluigi Donnarumma 96.',
      'Ruhmesweg komplett neu: 100 Stufen bis 17.500 Trophäen, die Abstände werden immer größer. Neu dabei: Mega-Drops. Bereits Abgeholtes bleibt abgeholt.',
      'Karriere bringt jetzt Drops: jede Saison 1 Flutlicht-Drop, jeder Titel und jede große Auszeichnung einen Mega-Drop (bis zu 2 pro Saison).',
    ],
  },
  {
    id: '2026-10-30-casino-look',
    date: '30.10.2026',
    title: 'Casino aufgeräumt',
    items: [
      'Neuer Look: Jedes Spiel hat eine eigene Bühne, Gewinn oder Verlust erscheint direkt darin – mit Reingewinn.',
      'Jetons und Spielknopf sitzen jetzt immer unten am Bildschirm, ohne Scrollen. Freier Betrag über den Stift.',
      'Weniger Text: Die Chancen stehen kurz an den Wetten, die langen Erklärungen sind weg.',
    ],
  },
  {
    id: '2026-10-30-duell',
    date: '30.10.2026',
    title: 'Kartenduell 2.0',
    items: [
      'Von der verdeckten Karte siehst du jetzt Position und zwei Werte – lies sie und schätze die Wertung.',
      'Die nächste Karte liegt immer höchstens 4 Punkte neben der offenen. Die Chancen auf den Knöpfen rechnen genau mit dem, was du siehst.',
      'Zu eindeutig? Mit „Karte tauschen“ holst du dir dreimal pro Duell eine neue verdeckte Karte.',
      'Das Ballon-d’Or-Event ist vorzeitig beendet. Deine Gala-Karten bleiben in der Sammlung.',
    ],
  },
  {
    id: '2026-10-30-casino-shop',
    date: '30.10.2026',
    title: 'Casino im Shop – mit All-in',
    items: [
      'Das Casino gibt es jetzt auch direkt im Shop – ohne Karriere.',
      'Neu: Sololauf. Du läufst aufs Tor, der Multiplikator steigt bis ×50 – schließ ab, bevor die Grätsche kommt. Mit Auto-Abschluss.',
      'Neu: Kartenduell. Echte Spieler, echte Wertungen: Ist der nächste höher oder tiefer? Jeder Treffer multipliziert.',
      'Setze, was du willst: Jetons bis 1 Mio., ein Regler für jeden Betrag – oder ALL-IN mit deinem gesamten Geld.',
    ],
  },
  {
    id: '2026-10-30-casino-position',
    date: '30.10.2026',
    title: 'Neues Casino und Positionstraining',
    items: [
      'Casino komplett neu: echter Roulette-Kessel, der auf der gezogenen Zahl stehen bleibt, mehr Wetten (Dutzende, Hälften, einzelne Zahl) und bei jeder Wette die ehrliche Gewinnchance.',
      'Pferderennen mit Rennbahn, auf der überholt wird – antippen bringt dich sofort zum Zieleinlauf.',
      'Neues Spiel Elfmeter-Serie: Ecke wählen, der Torwart rät. Jedes Tor steigert den Gewinn bis ×8,3 – nach jedem Treffer kannst du kassieren, ein gehaltener Schuss und alles ist weg.',
      'Neu in der Karriere: Position. Lerne gezielt eine Nachbarposition, z. B. vom Stürmer zum Zehner – mit Vorschau, welche Wertung du dort hättest.',
      'Auch der Co-Trainer meldet sich jetzt, wenn deine Werte auf einer anderen Position klar besser passen.',
    ],
  },
  {
    id: '2026-10-30-bis50',
    date: '30.10.2026',
    title: 'Spielen bis 50',
    items: [
      'Das Karriereende mit 41 ist weg: Du kannst jetzt bis 50 Jahre spielen – oder vorher selbst aufhören.',
      'Ein Comeback geht jetzt bis 48 Jahre.',
      'Der Körper baut im Alter weiter ab – wer lange oben bleiben will, braucht Spielzeit und starke Leistungen.',
    ],
  },
  {
    id: '2026-10-29-alter',
    date: '29.10.2026',
    title: 'Altersfilter bei echten Spielern',
    items: [
      'Beim Erstellen einer Karriere kannst du echte Spieler jetzt nach Alter filtern: bis 18, 19–21, 22–25, 26–29 oder ab 30 Jahre.',
    ],
  },
  {
    id: '2026-10-29-ewig',
    date: '29.10.2026',
    title: 'Ewig-Karten: 99 bis 102',
    items: [
      'Fünf neue SBCs mit der stärksten Kartenart im Spiel: „Ewig“ – schwarz wie Obsidian, mit drehendem Regenbogen-Rand.',
      'Cristiano Ronaldo (ST, 102) – EM 2016, Neymar (FL, 101) – Olympia-Gold 2016, Andrés Iniesta (ZM, 100) – WM 2010, Franz Beckenbauer (IV, 100) – EM 1972, Lew Jaschin (TW, 99) – Ballon d’Or 1963.',
      'Du findest sie unter SBC. Jede gibt es nur einmal – und die Anforderungen sind hart.',
    ],
  },
  {
    id: '2026-10-29-verhandlung',
    date: '29.10.2026',
    title: 'Vertragsverhandlung',
    items: [
      'Im Transferfenster kannst du jetzt verhandeln: Gehalt, Laufzeit, Rolle und Klauseln selbst fordern – statt nur annehmen oder ablehnen.',
      'Klauseln: Ausstiegsklausel (größere Vereine dürfen dich dafür holen), Torprämie pro Tor und Einsatzgarantie (spielst du zu wenig, wirst du ablösefrei).',
      'Der Verein antwortet je nach deiner Verhandlungsmacht: Einigung, Gegenangebot – oder er bricht ab, wenn du zu hoch pokerst. Nach drei Runden gibt es das letzte Angebot.',
    ],
  },
  {
    id: '2026-10-29-hub',
    date: '29.10.2026',
    title: 'Neues Startmenü und Profil',
    items: [
      'Startmenü fürs Hochformat aufgeräumt: oben dein Profil, darunter nur die laufenden Events, deine Karriere, die großen Knöpfe „Neue Karriere“ und „Shop“, dann Pass, Ruhmesweg und der Rest.',
      'Neues Profil wie in Brawl Stars: Wappen und Farbe wählen, Name ändern, Manager-Level, Trophäen, Lieblingskarte und Statistiken.',
      'Vollbild: Am Handy startet das Spiel beim ersten Tippen ohne Browser-Leisten (abschaltbar), oben gibt es einen Vollbild-Knopf. Als App installiert läuft es direkt im Vollbild.',
      'Der Store heißt jetzt Shop. Der Polarlicht-Kalender ist in den Shop umgezogen.',
    ],
  },
  {
    id: '2026-10-29-fluessig',
    date: '29.10.2026',
    title: 'Flüssiger',
    items: [
      'Der Store öffnet beim ersten Mal deutlich schneller: Bereiche außerhalb des Bildschirms werden erst beim Hinscrollen gezeichnet.',
      'Drop-Öffnen läuft flüssiger – gleicher Look, aber günstiger gezeichnet. Beim Aufladen steht der Hintergrund still: Ruhe vor dem Schlag.',
    ],
  },
  {
    id: '2026-10-28-drops3',
    date: '28.10.2026',
    title: 'Drops: neu öffnen und im Store',
    items: [
      'Flutlicht-Drops gibt es jetzt als normale Produkte im Store – deine Drops liegen bei „Deine Packs“.',
      'Öffnen neu: Edelstein gedrückt halten, er lädt sich mit Ring, Ton und Vibration auf – loslassen trifft ihn.',
      'Jeder Treffer reißt ihn weiter auf, durch die Risse leuchtet schon die nächste Seltenheit. Am Ende zerspringt er in Scherben, die leuchtend liegen bleiben – der nächste Drop landet mitten zwischen ihnen.',
    ],
  },
  {
    id: '2026-10-28-drops2',
    date: '28.10.2026',
    title: 'Flutlicht-Drops 2.0',
    items: [
      'Drops jetzt kaufen: im Store und im Ruhmesweg – Flutlicht-Drop 12.000, 5er-Bündel 48.000 (einer gratis) und Mega-Drop 90.000 Coins (mindestens Episch, 8 % Legendär).',
      'Stärkere Belohnungen: Episch kann eine Gold-Karte ab 84 bringen, Mythisch eine Spezialkarte (Debüt, Comeback, Rückblende, Kult) oder 88+, Legendär eine Ikone direkt – oder ein Ikonen-, Ultimate- oder sogar GOAT-Pack.',
      'Neue Enthüllung: Lichtstrahlen, Flutlicht-Kegel, der Edelstein bebt bei jedem Antippen, springt mit einem Blitz eine Seltenheit höher und platzt am Ende mit Funkenregen auf.',
    ],
  },
  {
    id: '2026-10-28-ruhmesweg',
    date: '28.10.2026',
    title: 'Ruhmesweg und Flutlicht-Drops',
    items: [
      'Neu im Hub: der Ruhmesweg – 40 Stufen bis 3.000 Trophäen mit Coins, Drops und Packs bis zum GOAT-Pack.',
      'Trophäen gibt es für Duelle (Sieg +10, Unentschieden +3, Niederlage −4) und für jede Karriere-Saison (+20, jeder Titel +10). Belohnungen zählen nach deinem Bestwert.',
      'Flutlicht-Drops: Für Duell-Siege (bis zu 6 pro Tag) und auf dem Ruhmesweg. Antippen hebt die Seltenheit Stufe für Stufe – von Selten bis Legendär mit Ikonen- oder Ultimate-Pack.',
    ],
  },
  {
    id: '2026-10-27-polarlicht',
    date: '27.10.2026',
    title: 'Polarlicht-Kalender',
    items: [
      'Neuer Premium-Adventskalender: schon jetzt für 1.000.000 Coins freischaltbar – im Hub ganz oben.',
      'Ab 1. Dezember öffnet jeden Tag ein Türchen gratis. Wer nicht warten will, kauft die Türchen jetzt schon der Reihe nach frei (32.500 bis 90.000 Coins).',
      'Drin: 5 Winter-Wunder-Karten (Türchen 24: die stärkste, die dir fehlt), Winter-Wunder-, Ikonen- und Ultimate-Pack und viele Coins.',
    ],
  },
  {
    id: '2026-10-27-talente16',
    date: '27.10.2026',
    title: '21 neue 16-jährige Talente',
    items: [
      'Jahrgang 2009/2010: u. a. Filip Pavić, Marli Salmon, JJ Gabriel, Enzo Alves, Mathis Albert, Louis Lemke, Mezian Mesloub und Antonio Arena.',
      'Alle starten mit 16 im NLZ ihres Vereins (Wertung 58–63) – arbeite dich mit ihnen von der U17 zu den Profis hoch.',
    ],
  },
  {
    id: '2026-10-27-angebote',
    date: '27.10.2026',
    title: 'Realistischere Angebote für junge Spieler',
    items: [
      'Junge Spieler mit noch niedriger Wertung bekommen Profi-Angebote vor allem aus der 2. und 3. Liga oder Regionalliga – nicht mehr gleich aus der Bundesliga.',
      'Neu: Andere Nachwuchsleistungszentren werben dich ab (bis 18) – du wechselst in deren U17/U19 und arbeitest dich dort hoch.',
      'Neu: U23-Angebote von zweiten Mannschaften (bis 22) – Spielpraxis bei den Männern, kurzer Weg zu den Profis.',
      'Das beste NLZ- oder U23-Angebot erscheint als vierte Karte im Transferfenster. Noten aus Junioren-Ligen zählen für Profivereine nur halb.',
    ],
  },
  {
    id: '2026-10-27-nlz',
    date: '27.10.2026',
    title: 'NLZ und Junioren-Ligen',
    items: [
      'Junge Talente (bis 18) starten bei Vereinen mit Nachwuchsleistungszentrum in der U17 oder U19 – mit eigener Liga, Tabelle und Junioren-Pokal.',
      'Neue Ligen: U19- und U17-Nachwuchsliga A (Bundesligisten) und B (Zweitligisten), U18 Premier League, División de Honor Juvenil, Primavera 1, Championnat National U19, Juniores (Portugal) und Onder 19 Divisie.',
      'Hocharbeiten: U17 → U19 → Profis. Wer stark spielt, wird früher hochgezogen; mit 19 ist Schluss in der U19 – dann Profis oder zweite Mannschaft.',
      'Rückschläge: Wer als junger Profi kaum spielt oder schwach ist, kann zurück in die U19 oder in die zweite Mannschaft versetzt werden – und sich von dort wieder hochspielen.',
    ],
  },
  {
    id: '2026-10-27-ballondor',
    date: '27.10.2026',
    title: 'Harry Kane gewinnt den Ballon d’Or',
    items: [
      'Harry Kane ist der Sieger des Ballon d’Or 2026 – vor Kylian Mbappé und Lamine Yamal. Richtig getippt? Dein Gala-Pack wartet im Hub.',
      'Neue SBC in der Gala-Woche: „Ballon d’Or 2026“ – die Siegerkarte von Harry Kane (96), nur bis 9. November.',
    ],
  },
  {
    id: '2026-10-26-talente2',
    date: '26.10.2026',
    title: '19 weitere Talente',
    items: [
      '19 neue echte Nachwuchsspieler (Wertung 60–65) – u. a. Toni und Dro Fernández, Harry Amass, Kjell Wätjen, Maurice Krattenmacher und Jonah Kusi-Asare.',
      'Dazu Talente aus der 2. Bundesliga wie Artem Stepanov, Louey Ben Farhat und Dennis Seimen.',
    ],
  },
  {
    id: '2026-10-26-kaufoption',
    date: '26.10.2026',
    title: 'Leihe mit Kaufoption',
    items: [
      'Etwa jede zweite Leihe kommt jetzt mit Kaufoption – Ablöse ungefähr dein Marktwert. Du siehst sie direkt auf dem Angebot.',
      'Überzeugst du beim Leihverein (viel Spielzeit, gute Noten), zieht er am Saisonende die Option und kauft dich fest – mit neuem Vierjahresvertrag. Sonst geht es zurück zum alten Verein.',
    ],
  },
  {
    id: '2026-10-26-nachwuchs',
    date: '26.10.2026',
    title: '20 neue Nachwuchsspieler',
    items: [
      'Unter „Echter Spieler“ gibt es 20 neue Talente mit Wertung 60–65 – zum Durchstarten von unten: Cassiano Kiala und Wisdom Mike (Bayern), Mick Schmetgens, Patrice Čović, Karim Coulibaly und weitere aus Bremen, Fynn Schenten (Köln), Pascal Klemens und Linus Gechter (Hertha), Fabio Baldé (HSV), Mohamed Sankoh (Stuttgart) …',
      'Alle gibt es auch als Karten in der Sammlung.',
    ],
  },
  {
    id: '2026-10-26-tots-ablage',
    date: '26.10.2026',
    title: 'Team der Saison und Pack-Ablage',
    items: [
      'Karriere: Mit einer konstant starken Saison (Ø-Note ab 7,25, mindestens 22 Ligaspiele) wirst du ins Team der Saison deiner Liga gewählt – leichter als Spieler der Saison, aber eine echte Auszeichnung. Bei echten Spielern gibt es dafür am Ende auch eine Karte zur Wahl.',
      'Pack-Ablage: Packs aus dem Saison-Pass, aus Pack-Tauschen und vom Karriereende musst du nicht mehr sofort öffnen. Wähle „In die Ablage“ – sie warten im Store unter „Deine Packs“.',
      'In der Ablage öffnest du Packs einzeln oder alle auf einmal. Die Zahl am Store-Symbol zeigt, wie viele noch warten.',
    ],
  },
  {
    id: '2026-10-26-breno-friede-jindaoui',
    date: '26.10.2026',
    title: 'Neu: Breno, Sidney Friede und Nader Jindaoui',
    items: [
      'Zweite Chance: Breno startet mit 18 beim FC Bayern – schreib seine Geschichte ohne Brand und Haft neu. Dazu Sidney Friede als junges Hertha-Talent: Was, wenn er nicht zum Streamer geworden wäre?',
      'Kult-Helden: Nader Jindaoui, Berliner Influencer und Spätzünder, startet mit 19 bei Hertha BSC.',
      'Alle drei gibt es auch als Karten in der Sammlung.',
    ],
  },
  {
    id: '2026-10-26-belohnung-korrigiert',
    date: '26.10.2026',
    title: 'Korrektur: Karriere-Belohnung',
    items: [
      'Packs statt Karte gibt es nur für selbst erstellte Spieler.',
      'Spielst du mit einem echten Spieler, einer Ikone oder einem Kult-Helden (z. B. Haaland), bekommst du am Ende wieder deine Auszeichnungs-Karte – Ballon d’Or, Weltmeister, Champions League, Spieler der Saison, Torschützenkönig oder Golden Boy. Ohne Auszeichnung gibt es Packs.',
      'Wurde die Karte einer solchen Karriere beim letzten Update entfernt, kannst du sie im Hauptmenü neu wählen.',
    ],
  },
  {
    id: '2026-10-26-u-nationalteams',
    date: '26.10.2026',
    title: 'U17, U19 und U21',
    items: [
      'Neu im Karrieremodus: die U-Nationalmannschaften. Bis 17 kannst du für die U17 nominiert werden, bis 19 für die U19, bis 21 für die U21 – große Talente spielen schon in einer älteren U-Mannschaft.',
      'Mit der U-Mannschaft gibt es Turniere: U17-EM, U19-EM und U21-EM (außerhalb Europas U17- und U20-WM) – und mit Glück den Titel.',
      'Viele U21-Einsätze machen später den Sprung in die A-Nationalmannschaft leichter.',
      'Bei der ersten Nominierung für eine Mannschaft – U17, U19, U21 oder die A-Elf – bekommst du eine Nachricht ins Postfach.',
      'Deine U-Einsätze stehen im Karriereverlauf unter der Nationalmannschaft.',
    ],
  },
  {
    id: '2026-10-26-karriere-packs',
    date: '26.10.2026',
    title: 'Karriereende: Packs statt eigener Karte',
    items: [
      'Am Ende einer Karriere gibt es keine eigene Karte mehr – stattdessen Packs. Je besser deine Bilanz (Titel, Auszeichnungen, Bestwertung, Spiele, Tore, Legendenstatus), desto stärker:',
      'Bronze: Gold-Pack · Silber: Premium + Gold · Gold: Mega-Gold + Weltstar · Weltklasse: Ultimate + Ikonen · Legende: GOAT + Ultimate + Ikonen.',
      'Die bisher vergebenen Karten selbst erstellter Spieler wurden entfernt. Für diese Karrieren kannst du die Packs jetzt im Hauptmenü abholen.',
    ],
  },
  {
    id: '2026-10-26-toast-fix',
    date: '26.10.2026',
    title: 'Fehler behoben: gelbe Fläche',
    items: [
      'Meldungen wie „Deine Karriere-Karte liegt in der Sammlung!“ füllten am Handy fast den ganzen Bildschirm als gelbe Fläche. Jetzt erscheinen sie wieder als kleine Leiste oben.',
    ],
  },
  {
    id: '2026-10-26-ikonen-entfernt',
    date: '26.10.2026',
    title: 'Karriere-Ikonen entfernt',
    items: [
      'Die früher am Karriereende geschenkten Ikonen sind aus der Sammlung und der Aufstellung entfernt.',
      'Hatte eine dieser Karrieren eine Auszeichnung (Ballon d’Or, Weltmeister, Champions League …), kannst du dir jetzt im Hauptmenü die passende Karte aussuchen.',
      'Auszeichnungs-Karten, die du schon gewählt hast, bleiben.',
    ],
  },
  {
    id: '2026-10-26-attribute-nationalelf',
    date: '26.10.2026',
    title: 'Karriere: echte Attribute und Turniere live',
    items: [
      'Deine sechs Attribute (Tempo, Abschluss, Passen, Dribbling, Defensive, Physis) stehen jetzt im Karriere-Bildschirm – mit Balken und der Veränderung nach jeder Halbserie.',
      'Jedes Attribut entwickelt sich einzeln: Junge Spieler wachsen körperlich, im besten Alter im Abschluss, Ältere im Spielverständnis. Spielertyp und Trainingsschwerpunkt lenken mit.',
      'Attribute zählen im Spiel: Starker Abschluss bringt mehr Tore, gutes Passen und Dribbling mehr Vorlagen, viel Physis weniger Verletzungen.',
      'Nationalmannschaft: Die Nominierung hängt jetzt auch von deiner Form ab – Note und Spielzeit zählen. Auf der Bank wirst du schnell übersehen.',
      'WM und EM: Nach der Gruppenphase spielst du jedes K.-o.-Spiel live – Achtelfinale, Viertelfinale, Halbfinale, Finale. Wer verliert, fliegt raus.',
    ],
  },
  {
    id: '2026-10-26-karriereende',
    date: '26.10.2026',
    title: 'Karriereende: Karten nur noch für echte Erfolge',
    items: [
      'Am Ende einer Karriere gibt es keine Ikone mehr geschenkt.',
      'Eine Karte bekommst du nur, wenn du sie dir verdient hast: Ballon d’Or, Weltmeister, Champions League, Spieler der Saison, Torschützenkönig oder Golden Boy. Bei mehreren wählst du eine.',
      'Bereits geschenkte Karriere-Ikonen aus alten Karrieren wurden entfernt. Hatte die Karriere eine Auszeichnung, kannst du dir dafür jetzt die passende Karte aussuchen.',
    ],
  },
  {
    id: '2026-10-24-sbc-unvergessen',
    date: '24.10.2026',
    title: 'SBC: Automatisch füllen und fünf Unvergessen-Karten',
    items: [
      'Neuer Knopf „Automatisch füllen“: Die 11 Karten werden direkt aus deiner Sammlung ausgewählt – zuerst Doppelte und die schwächsten, die gerade reichen. Du kannst danach noch tauschen, abgegeben wird erst beim Tippen auf „Tauschen“.',
      'Fehlt etwas, steht genau da, was fehlt – zum Beispiel „Ikone: noch 1“.',
      'Die SBCs sind jetzt richtig hart: Schnitt 88 bis 91, jede Karte mindestens 85 bis 88.',
      'Fünf neue SBCs im neuen Kartendesign „Unvergessen“ mit Anzeigetafel: Zidane 95 (Volley 2002), Bergkamp 94 (Die Drehung), Messi 96 (Getafe-Solo), Roberto Carlos 93 (Bananen-Freistoß) und Ricken 92 (Lupfer 1997).',
    ],
  },
  {
    id: '2026-10-24-kreisklassen',
    date: '24.10.2026',
    title: 'Noch tiefer: 1. und 2. Kreisklasse',
    items: [
      'Zwei weitere Ligen unter der Kreisliga: die 1. Kreisklasse Region Hannover 1 (9. Liga) und die 2. Kreisklasse Region Hannover 2 (10. Liga) mit je 14 Vereinen der Saison 2025/26.',
      'Starte zum Beispiel beim TSV Bordenau oder Afrikanischen SV Hannover in der 10. Liga – bis in die Bundesliga sind es jetzt zehn Aufstiege.',
    ],
  },
  {
    id: '2026-10-24-kreisliga',
    date: '24.10.2026',
    title: 'Bezirksliga und Kreisliga',
    items: [
      'Zwei neue Ligen unter der Landesliga Hannover: die Bezirksliga Hannover 2 (7. Liga, 17 Vereine) und die Kreisliga Region Hannover 1 (8. Liga, 16 Vereine) – mit den Teams der Saison 2025/26.',
      'Starte als Talent beim FC Burgwedel, Heesseler SV oder SG Hannover 74 und spiel dich von ganz unten hoch. Je ein Auf- und Abstiegsplatz zwischen den Ligen.',
      'Saison-Pass: Aus Duellen gibt es jetzt höchstens 200 Pass-XP pro Tag. Wie viel heute noch geht, steht direkt unter dem Anpfiff-Knopf.',
    ],
  },
  {
    id: '2026-10-24-divisionen',
    date: '24.10.2026',
    title: 'Duelle: Divisionen und Taktik',
    items: [
      'Statt der Stufen-Leiter spielst du jetzt in Divisionen: von Division 10 bis Division 1 und ganz oben die Elite. Deine bisherige Stufe wird übernommen.',
      'Sieg +2, Unentschieden +1, Niederlage −1: Bei 6 Punkten steigst du auf, unter 0 steigst du ab. Aus den Sicherheitsstufen 10, 7 und 4 geht es nicht nach unten.',
      'Der erste Aufstieg in eine neue Division bringt einen Coin-Bonus – Ab- und wieder Aufsteigen zählt nicht doppelt.',
      'Vor jedem Spiel wählst du eine Taktik: Pressing schlägt Ballbesitz, Ballbesitz schlägt Konter, Konter schlägt Pressing. Der Scouting-Bericht verrät, wie der Gegner meist spielt – aber nicht immer richtig.',
      'Auch deine Elf zählt: Tempo hilft beim Konter, Passen und Dribbeln beim Ballbesitz, Physis und Defensive beim Pressing.',
    ],
  },
  {
    id: '2026-10-24-matchday',
    date: '24.10.2026',
    title: 'Neues Design: Matchday',
    items: [
      'Feste Navigation: Start, Karriere, Team, Duelle, Store, Sammlung und Pass sind immer einen Tipp entfernt – am Handy unten, im Querformat links.',
      'Neuer Look in Violett mit Stadion-Atmosphäre: Flutlicht, Tribünen und ein Spielfeld im Hauptmenü.',
      'Aufstellung: Karten per Finger oder Maus verschieben und tauschen, Reservebank zum Reinziehen, passende Positionen leuchten auf. Chemie-Linien zeigen, wer zusammenpasst.',
      'Karriere im Querformat: Spieler und Saison-Bilanz mit Wertungsverlauf links, Entscheidungen rechts.',
      'Store aufgeräumt in Event-, Spezial- und Standard-Packs. Kurze Übergänge zwischen den Menüs, schnellerer Start.',
    ],
  },
  {
    id: '2026-10-24-logo',
    date: '24.10.2026',
    title: 'Neues Logo',
    items: [
      'Manager Sim hat ein neues Neon-Logo – im Menü, auf der Startseite und als App-Symbol.',
    ],
  },
  {
    id: '2026-10-24-saison2',
    date: '24.10.2026',
    title: 'Saison 2 des Saison-Passes – jetzt mit 60 Stufen',
    items: [
      'Der neue Pass ersetzt den alten: Saison 2 läuft ab heute bis 30. November und hat doppelt so viele Stufen.',
      'Neuer Saison-Held auf Stufe 60: Harry Kane 96 im Pass-Design.',
      'Mehr Belohnungen: jede zweite Stufe ein starkes Pack, Ikonen auf 10, 20, 40 und 50, Ultimate alle 5 Stufen, GOAT auf 30 und 59 – dazwischen 6.000 bis 64.000 Coins.',
      'Pro-Pass über alle 60 Stufen: 5× GOAT, 16× Ultimate, 6× Ikonen und große Coin-Pakete – oben Kane 98. Wer den Pro-Pass im Oktober gekauft hat, behält ihn.',
    ],
  },
  {
    id: '2026-10-24-wartung',
    date: '24.10.2026',
    title: 'Startseite im Wartungsmodus',
    items: [
      'Beim Öffnen erscheint jetzt eine Seite „Entwicklungs-Update“. Ins Spiel kommt man nur noch über „Entwickler-Zugang“ mit dem Entwickler-Code.',
      'Im Spiel selbst hat sich nichts geändert.',
    ],
  },
  {
    id: '2026-10-23-pro-pass',
    date: '23.10.2026',
    title: 'Neu: der Pro-Pass',
    items: [
      'Für 200.000.000 Coins gibt es jetzt den Pro-Pass – eine zweite Belohnungsreihe auf allen 30 Stufen des Saison-Passes.',
      'Drin: 5× GOAT-Pack, 4× Ultimate, 5× Ikonen, Weltstar, Rückblende, Comeback, Mega-Gold und Coins bis 300.000 pro Stufe.',
      'Ganz oben die Pro-Karte: der Saison-Held noch einmal stärker. Schon erreichte Stufen kannst du nach dem Kauf sofort abholen.',
      'Der Pro-Pass gilt für den laufenden Monat – mit dem neuen Pass kann man ihn wieder kaufen.',
    ],
  },
  {
    id: '2026-10-23-flott-quer',
    date: '23.10.2026',
    title: 'Kein Ruckeln mehr und Querformat',
    items: [
      'Ruckler behoben: Gespeichert wird jetzt im Hintergrund und nur die Karriere, die sich gerade geändert hat.',
      '„Sichern & Laden“ funktioniert wieder zuverlässig, auch mit den neuen, kleineren Spielständen.',
      'Querformat: Hauptmenü, Aufstellung, Pack-Öffnung und Glücksrad passen jetzt quer auf den Bildschirm. Auf Android wird die Drehung im Vollbild gesperrt, am iPhone einfach das Handy drehen.',
      'Wer lieber hochkant spielt: „Im Querformat spielen“ in den Einstellungen ausschalten.',
    ],
  },
  {
    id: '2026-10-23-speicher',
    date: '23.10.2026',
    title: 'Speichern repariert',
    items: [
      'Spielstände werden jetzt komprimiert gespeichert – rund 4-mal kleiner. Beim ersten Start werden alte Spielstände automatisch verkleinert.',
      'Wird der Browser-Speicher trotzdem knapp, räumt das Spiel selbst auf (alte Nachrichten und Tabellen) und versucht es nochmal.',
      'Klappt das Speichern doch nicht, zeigt ein Hinweis jetzt, was wie viel Platz belegt – mit Knopf zum Aufräumen.',
    ],
  },
  {
    id: '2026-10-23-icons-career',
    date: '23.10.2026',
    title: 'Ikonen-Karrieren: spiel als Pelé, Maradona, Cruyff …',
    items: [
      'Neuer Reiter „Ikonen“ in „Neue Karriere“: Alle 68 Ikonen aus der Sammlung starten als junge Talente im heutigen Fußball – von Pelé und Maradona über Puskás und Platini bis Klose.',
      'Kult-Helden-Karrieren: Higuita, Chilavert, Asprilla, Akinfenwa, Max Kruse, Tim Wiese, Großkreutz und 10 weitere kommen dazu.',
      'Die neuen aktuellen Stars (Lookman, Xavi Simons, Frimpong, Semenyo, Kudus, Kean, Garnacho) gibt es unter „Echter Spieler“.',
      'Lange Listen haben jetzt eine Suche nach Name oder Nation und einen Positionsfilter.',
    ],
  },
  {
    id: '2026-10-20-mega',
    date: '20.10.2026',
    title: 'Das Riesen-Update: 66 neue Karten, Winter-Wunder und Silvester',
    items: [
      '42 neue Ikonen: Puskás, Platini, van Basten, Romário, Garrincha, Zico, Totti, Gerrard, Drogba, Eto’o, Weah, Shevchenko, Batistuta, Schmeichel und viele mehr.',
      '17 neue fragwürdige Kult-Helden: Higuita, Chilavert, Campos, Asprilla, Akinfenwa, Max Kruse, Tim Wiese, Großkreutz, Fellaini, Joey Barton …',
      '7 aktuelle Stars: Lookman, Xavi Simons, Frimpong, Semenyo, Kudus, Kean und Garnacho – mit ihren Vereinen von Oktober 2026.',
      'Ab 1. Dezember: Winter-Wunder mit Adventskalender (24 Türchen, Türchen 24 = Winter-Karte), 12 Winter-Karten bis 95, eigenem Pack und Schneefall.',
      'Am 31.12. und 1.1.: Silvester-Event mit 6 Feuerwerks-Karten bis 96, Feuerwerks-Pack im Store und einem Gratis-Pack zu Neujahr.',
    ],
  },
  {
    id: '2026-10-18-handy',
    date: '18.10.2026',
    title: 'Bessere Bedienung am Handy',
    items: [
      'Hauptmenü: Events und Hinweise liegen jetzt in einer Leiste zum Wischen statt übereinander – deine Karriere ist sofort sichtbar.',
      'Der Weiterspielen-Knopf bricht nicht mehr um, die Karte im Kasten wird nicht mehr abgeschnitten.',
      'Transferfenster: große Angebots-Zeilen und nur noch ein Tipp – danach kannst du es ein paar Sekunden lang rückgängig machen.',
      'Coins-Meldungen erscheinen jetzt oben, Torjäger-Rennen und Co. stehen sauber unter dem Transferfenster.',
    ],
  },
  {
    id: '2026-10-18-balance',
    date: '18.10.2026',
    title: 'Großes Balance-Update: mehr Coins, faire Duelle',
    items: [
      'Karrieren bringen jetzt rund 5-mal so viele Coins: Eine starke Saison gibt etwa 10.000–15.000 Coins, eine ganze Karriere über 100.000.',
      'Duelle mit sanftem Einstieg: Stufe 1–4 starten bei Stärke 66 bis 84, ab Stufe 5 geht es wie bisher von 90 bis 110 – ganz oben bleibt es fast unmöglich.',
      'Auch Niederlagen bringen jetzt ein kleines Trostgeld.',
      'Saison-Pass: Jede gespielte Karriere-Saison gibt jetzt 100 XP statt 50.',
    ],
  },
  {
    id: '2026-10-17-gig',
    date: '17.10.2026',
    title: 'GIG-Event: das Glücksrad ist da – nur heute und morgen!',
    items: [
      'Dreh am GIG-Glücksrad: Jeden Tag ein Gratis-Dreh, jeder weitere kostet 25.000 Coins.',
      'Fast jedes Feld ist ein starkes Pack – Premium, Comeback, Rückblende, Mega-Gold, Weltstar, Ikone, Ultimate und sogar GOAT.',
      'Der Jackpot: Lamine Yamal 95 im GIG-Design. Chance: 0,5 % – die Karte gibt es nur über dieses Rad.',
      'Alle Chancen stehen offen im Event. Am 18. Oktober um Mitternacht ist das Rad weg.',
    ],
  },
  {
    id: '2026-10-15-pass-tilt',
    date: '15.10.2026',
    title: 'Saison-Pass und 3D-Karten',
    items: [
      'Neu: der Saison-Pass! Jeden Monat 30 Stufen mit Coins und Packs (bis zum Ikonen-Pack) – ganz oben wartet eine exklusive Saison-Pass-Karte, jeden Monat ein anderer Weltstar.',
      'XP gibt es für Duelle, Evolution-Stufen, gekaufte Packs, Tauschaufgaben und Karriere-Saisons. Du findest den Pass direkt im Hauptmenü.',
      'Große Karten sind jetzt in 3D: Sie kippen zur Maus oder zum Finger, am Handy auch beim Neigen – und der Holo-Glanz wandert mit. Abschaltbar in den Einstellungen.',
    ],
  },
  {
    id: '2026-10-14-evolutions',
    date: '14.10.2026',
    title: 'Evolutions, Comeback- und Rückblende-Karten',
    items: [
      'Neu: Evolutions! Wähle in der Sammlung eine Karte und einen Pfad (Torinstinkt, Mauer, Spielmacher, Silber-Aufstieg) und lass sie in Duellen wachsen – höchstens +5 pro Karte.',
      'Neue Kategorie Comeback: 8 Spieler, die nach Verletzung oder Krankheit zurückkamen – von Ronaldo 2002 bis Haller 2024. Dunkle Karte mit leuchtendem Riss.',
      'Neue Kategorie Rückblende: 9 aktive Stars in ihrer besten Saison, z. B. Messi 2011/12 oder Lewandowski 2020/21 – im Retro-Look mit Saison-Stempel.',
      'Karten mit Coins verbessern gibt es nicht mehr. Wer schon verbessert hatte, bekommt die Coins vollständig zurück.',
    ],
  },
  {
    id: '2026-10-13-pack-opening',
    date: '13.10.2026',
    title: 'Neue Pack-Öffnung',
    items: [
      'Packs sehen jetzt aus wie echte Folien-Packs: Metall-Glanz, Falzkanten und Blitz-Logo – Spezial-Packs in Schwarz-Gold.',
      'Beim Aufreißen gibt es einen klaren Lichtblitz in der Farbe deiner besten Karte, beim Walkout große Schrift und Lichtstrahlen.',
      'Deine beste Karte steht auf einem leuchtenden Podest auf einer Neon-Bühne.',
      'Aufgeräumte Buttons am Ende, und die Preise im Store werden am Handy nicht mehr abgeschnitten.',
    ],
  },
  {
    id: '2026-10-12-clean-icons',
    date: '12.10.2026',
    title: 'Design-Feinschliff: klarer, ruhiger, ohne Emojis',
    items: [
      'Alle bunten Emojis in Menüs, Buttons, Tabs und auf Sonderkarten sind ersetzt – durch einheitliche Linien-Icons im Neon-Stil.',
      'Hauptmenü mit klarer Reihenfolge: oben deine Karriere, darunter die sechs Hauptbereiche, Nebenfunktionen kompakt unter „Mehr“.',
      'Ruhigere Flächen statt Glas überall, nur noch ein Element leuchtet pro Bildschirm, eigene Spiel-Schrift ist jetzt fest eingebaut.',
      'Alle Funktionen bleiben, wo sie waren – nur aufgeräumter.',
    ],
  },
  {
    id: '2026-10-12-neon-design',
    date: '12.10.2026',
    title: '🌌 Neues Design: Neon-Stadion',
    items: [
      '✨ Das ganze Spiel im neuen Look: Nachthimmel in Schwarz, Midnight Blue und Violett, Neon in Cyan, Magenta und Grün.',
      '🪟 Milchglas-Kacheln mit leuchtenden Kanten, metallische Karten, Flutlicht-Spielfeld und neue Buttons.',
      '🎽 Karten zeigen jetzt ein Trikot statt Initialen, dein eigener Spieler erscheint als Silhouette ohne Gesicht.',
      '🧭 Alles bleibt, wo es war – nur schöner. Die Designs „Hell“ und „Dunkel“ gibt es weiter in den Einstellungen.',
    ],
  },
  {
    id: '2026-10-12-totw',
    date: '12.10.2026',
    title: '🏟️ Team der Woche & 35 neue Spieler',
    items: [
      '🏟️ Neu im Store: das Team der Woche – jeden Montag 11 neue Karten mit +3, nur in dieser Woche im Team-der-Woche-Pack.',
      '🧤 9 neue Torhüter: Raya, Maignan, Oblak, Kobel, Diogo Costa, Svilar, Emiliano Martínez, Vicario und Unai Simón.',
      '🇮🇹🇫🇷🇵🇹🇳🇱 Mehr Karten aus Serie A, Ligue 1, Portugal und Eredivisie – McTominay, Dimarco, Thuram, Pulisic, Gouiri, Hjulmand, Pavlidis, Til … Bessere Chemie für Teams aus diesen Ligen.',
      '⚽ Alle neuen Spieler kannst du auch im Karrieremodus spielen. Vereine nach dem Transfersommer 2026.',
    ],
  },
  {
    id: '2026-10-11-sonderkarten-design',
    date: '11.10.2026',
    title: '✨ Neues Design für alle Sonderkarten',
    items: [
      '🎨 Jede Kartenart hat jetzt ihr eigenes Muster: Strahlenkranz für Ikonen, Retro-Karos für Kult-Helden, Glitch-Look für „Was wäre wenn“, Filmstreifen für Momente, Flammen für Torjäger, Globus für Weltmeister …',
      '🏷️ Neues Emblem oben rechts auf jeder Sonderkarte – so erkennst du die Art auf einen Blick.',
      '🌈 Holo-Schimmer und leuchtender Doppelring ums Bild. (Ruhiger, wenn „Animationen“ in den Einstellungen aus sind.)',
    ],
  },
  {
    id: '2026-10-11-sammlung-prozent',
    date: '11.10.2026',
    title: '🗂️ Sammlung in Prozent',
    items: ['📊 Im Hauptmenü und in der Sammlung siehst du jetzt, wie viel Prozent aller Karten du schon gesammelt hast – mit Fortschrittsbalken.'],
  },
  {
    id: '2026-10-11-ballondor-saison',
    date: '11.10.2026',
    title: '🏅 Ballon d’Or 2026 & Duell-Saison',
    items: [
      '🏅 Am 26. Oktober wird in London der Ballon d’Or vergeben. Tippe im Hauptmenü, wer gewinnt – liegst du richtig, bekommst du ein Gala-Pack gratis.',
      '✨ Ab der Verleihung: Gala-Woche bis 9. November mit dem Gala-Pack (Yamal, Kane, Mbappé, Dembélé, Haaland … als Gala-Karten bis 94) und einer SBC für den echten Sieger.',
      '⚔️ Neu: Duell-Saison. Jeder Monat ist eine Saison – Siege bringen Punkte (10 × Stufe), Ränge von Bronze bis Legende und am Monatsende bis zu 80.000 Coins.',
      '🏆 Rangliste mit Freunden: Wer dir diesen Monat einen Team-Code schickt, erscheint mit seinen Saisonpunkten.',
    ],
  },
  {
    id: '2026-10-09-duelle-hart',
    date: '09.10.2026',
    title: '⚔️ Duelle: jetzt richtig schwer',
    items: [
      '💪 Die Gegner starten bei Stärke 90 und gehen bis 110 – Stufe 10 „Die Besten der Welt“ ist selbst mit einer perfekten Elf kaum zu schlagen.',
      '📉 Stärke zählt mehr: Als Außenseiter gewinnst du seltener als vorher.',
      '🪙 Dafür mehr Coins pro Sieg: von 1.050 (Stufe 1) bis 5.100 (Stufe 10). Deine freigeschalteten Stufen bleiben.',
    ],
  },
  {
    id: '2026-10-09-pack-nochmal',
    date: '09.10.2026',
    title: '🔁 Packs: direkt nochmal',
    items: ['🛒 Nach dem Öffnen eines Packs: „Fertig“ oder „Noch ein Pack“ – dasselbe Pack sofort wieder kaufen und öffnen, ohne zurück in den Store.'],
  },
  {
    id: '2026-10-09-wm-fix',
    date: '09.10.2026',
    title: '🛠️ Fehler behoben: WM-Titel',
    items: [
      '🌍 Gewinnst du die WM, EM oder Copa América, wird jetzt mit deinem Land gefeiert („Weltmeister! – mit Deutschland“) statt mit deinem Verein.',
      '🏟️ Titel mit der Nationalmannschaft zählen nicht mehr für den Status als Vereinslegende.',
      '🇺🇾 Spieler aus Uruguay spielen jetzt auch die Copa América.',
    ],
  },
  {
    id: '2026-10-09-karriere-karte',
    date: '09.10.2026',
    title: '🏁 Karriereende: Du wählst deine Karte',
    items: [
      '👑 Nach dem Karriereende bekommst du nicht mehr automatisch die Ikone – du wählst: Ikone oder eine Karte für einen großen Moment deiner Karriere.',
      '🏆 Zur Wahl stehen je nach Karriere: Ballon d’Or, Weltmeister, Champions League, Spieler des Jahres, Torschützenkönig und Golden Boy – jede mit eigenem Design.',
      '📈 Grundlage ist deine beste Saison mit dieser Auszeichnung, mehrfache Gewinne geben einen Bonus. Die Wahl ist endgültig – genau eine Karte pro Karriere.',
    ],
  },
  {
    id: '2026-10-09-debuts',
    date: '09.10.2026',
    title: '⭐ Neue Weltstars & Debüt-Karten',
    items: [
      '🌍 19 neue Spieler im Karrieremodus: Dembélé, Raphinha, Lautaro, Valverde, Kvaratskhelia, Hakimi, Isak, Saliba, Ødegaard, Foden, Gvardiol, Barella, Bastoni, Nico Williams, Gavi, Fermín, Olmo, Mbeumo und Ekitike – Vereine nach dem Transfersommer 2026.',
      '📰 Neue Kartenart „Debüt“: 20 Stars als ihre junge Version aus dem ersten Profispiel – Messi 2004 in Barcelona, Ronaldo 2002 bei Sporting, Haaland 2016 bei Bryne, Yamal 2023 …',
      '🎟️ Neu im Store: das Debüt-Pack mit einer garantierten Debüt-Karte. In der Sammlung gibt es den Filter „Debüts“.',
    ],
  },
  {
    id: '2026-10-09-halloween',
    date: '09.10.2026',
    title: '🎃 Halloween ist da – nur bis 2. November!',
    items: [
      '🦇 Das ganze Spiel im Halloween-Look: Fledermäuse, Nebel, Kürbis-Orange. (Abschaltbar in den Einstellungen.)',
      '🎃 Neu im Store: das Kürbis-Pack und das Geisterstunde-Pack – mit schauriger Öffnung, Gewitter und 10 Legenden im Kostüm (88–96): Ronaldinho als Kürbiskopf, Zlatan als Vampir, Kahn als Werwolf …',
      '🧪 Halloween-SBC „Die Nacht der lebenden Toten“: Adriano als Zombie-Imperator (93) – nur mit Kult-Helden, „Was wäre wenn“-Talenten und einer Ikone.',
      '⏳ Am 3. November verschwinden Packs und SBC wieder – deine Karten bleiben.',
    ],
  },
  {
    id: '2026-10-08-livewahl',
    date: '08.10.2026',
    title: 'Du entscheidest: selbst spielen oder simulieren',
    items: [
      '🎮 Zu Beginn jeder Karriere wählst du: mit Topspielen & Finals zum Selberspielen – oder alles automatisch simulieren.',
      '⚙️ Umstellen geht jederzeit in den Einstellungen unter „Diese Karriere“.',
    ],
  },
  {
    id: '2026-10-08-sbc-weltmeister',
    date: '08.10.2026',
    title: 'Drei neue Legendäre Momente im SBC',
    items: [
      "🏆 Mario Götze „113'“ (93): das Siegtor im WM-Finale 2014.",
      "🎯 Toni Kroos „95'“ (92): der Freistoß gegen Schweden bei der WM 2018.",
      '💥 Vincent Kompany „Der Fernschuss“ (91): das 1:0 gegen Leicester im Titelrennen 2019.',
    ],
  },
  {
    id: '2026-10-08-topspiele',
    date: '08.10.2026',
    title: 'Topspiele und Finals selbst spielen ⚽',
    items: [
      '🔥 In jeder Halbserie gibt es ein Topspiel gegen den stärksten Gegner: Spiel es selbst – du entscheidest in den wichtigen Momenten (abziehen, querlegen, dribbeln, grätschen …) – oder lass es simulieren.',
      '🏆 Pokal- und Europapokal-Finals laufen jetzt live, mit Ticker, Entscheidungen und Elfmeterschießen.',
      '📊 Was du im Spiel machst, zählt: Tore, Vorlagen, Note und Ergebnis landen in deiner Saison.',
    ],
  },
  {
    id: '2026-10-08-megasuper',
    date: '08.10.2026',
    title: '⚡ MEGA SUPER XXL PACK – gratis für alle ⚡',
    items: [
      '🎁 Einmalig und komplett gratis im Store: das MEGA SUPER XXL PACK.',
      '💎 Drin: 8 Karten ab 85 plus die neue Sonderkarte Gervinho (89, Geschenk).',
      '🧩 Neu im SBC: Gervinho „Die Stirn“ mit 93 – für eine harte 11er-Abgabe.',
    ],
  },
  {
    id: '2026-10-08-entwicklung',
    date: '08.10.2026',
    title: 'Karriere: Der Weg nach oben dauert länger',
    items: [
      '📈 Spieler entwickeln sich langsamer und länger – die meisten erreichen ihr Bestes erst mit 25 bis 27.',
      '⛰️ Weltklasse ist schwer: Ab etwa 86 wird jeder Punkt zäher, ab 94 kommt kaum noch etwas dazu. Eine 99 ist auf natürlichem Weg nicht mehr drin.',
      '🌳 Fähigkeiten heben die Wertung nur noch bis 94, Trainingslager und Spezialtraining wirken an der Spitze nur noch selten.',
    ],
  },
  {
    id: '2026-10-08-megaxxl',
    date: '08.10.2026',
    title: '⚡ GRATIS: Das MEGA XXL PACK ⚡',
    items: [
      '🎁 Für alle Spieler einmalig und komplett gratis: das MEGA XXL PACK – jetzt im Store.',
      '💎 50 Karten, garantiert 10 Ikonen. Das größte Pack, das es je gab.',
      '⏳ Nur einmal pro Spieler. Schnell sein lohnt sich!',
    ],
  },
  {
    id: '2026-10-08-herkunft',
    date: '08.10.2026',
    title: 'Eigener Spieler: wieder frei wählbar – Herkunft zählt mehr',
    items: [
      '📏 Größe, Gewicht und Startverein kannst du beim eigenen Spieler wieder selbst einstellen. Der Schicksals-Automat ist weg.',
      '🎡 Das Herkunfts-Glücksrad bleibt – und ist jetzt viel mehr wert: z. B. Straßenfußballer +4 Potenzial und +8 Dribbling, Spätstarter +6 Potenzial, NLZ +3 Startwertung.',
    ],
  },
  {
    id: '2026-10-07-tabs',
    date: '07.10.2026',
    title: 'Duelle & SBC jetzt im Hauptmenü',
    items: [
      '⚔️ „Duelle“ hat jetzt eine eigene Kachel im Hauptmenü.',
      '🧩 Neue Kachel „SBC“: Legendäre Momente (91–93) und die Pack-Tausche an einem Ort.',
      '🛡️ „Mein Team“ zeigt jetzt nur noch Aufstellung und Freunde-Duelle.',
    ],
  },
  {
    id: '2026-10-07-momente',
    date: '07.10.2026',
    title: 'Legendäre Momente – Spezial-Tausch ⏱️',
    items: [
      '⏱️ Neu unter „Mein Team → Tauschaufgaben“: Momentkarten mit 91–93 – Ramos „92:48“, Agüero „93:20“, Lewandowski „9 Minuten“ und das Wolfsburg-Duo Grafite & Džeko.',
      '🧩 Dafür gibst du genau 11 Karten ab – mit hohem Schnitt, Pflicht-Ligen, Nationen, Positionen, Ikonen oder Kult-Helden. Zusammenstellen musst du selbst, Karte für Karte.',
      '🔒 Jede Momentkarte gibt es nur einmal. Džeko wird erst nach Grafite freigeschaltet.',
    ],
  },
  {
    id: '2026-10-07-logo',
    date: '07.10.2026',
    title: 'Neuer Look: Manager Sim 👑',
    items: [
      '👑 Das Spiel hat ein eigenes Logo – zu sehen im Hauptmenü und beim Start.',
      '📱 Neues App-Icon: Füge die Seite zum Home-Bildschirm hinzu, dann erscheint das Logo als Icon.',
    ],
  },
  {
    id: '2026-10-07-tauschboerse',
    date: '07.10.2026',
    title: 'Die Tauschbörse ist da 🔄',
    items: [
      '🤝 Neu im Hauptmenü: Tausche Karten mit echten Spielern aus der Community. Leg 3 Karten rein – dein Tauschpartner legt auch 3 rein.',
      '⭐ Alle Tauschpartner sind verifiziert und haben Top-Bewertungen. Wirklich.',
      '🔒 Abgeschickt ist abgeschickt. Viel Glück 🌟',
    ],
  },
  {
    id: '2026-10-07-schicksal',
    date: '07.10.2026',
    title: 'Der Schicksals-Automat 🎰',
    items: [
      '🎰 Beim eigenen Spieler werden Größe, Gewicht und Startverein jetzt ausgelost – drei Walzen, einmal drehen, kein Zurück.',
      '📉 Der Startverein kann aus jeder Liga kommen – je tiefer, desto wahrscheinlicher. Viele starten in der Landes- oder Oberliga und müssen sich hocharbeiten.',
      '🧩 Name, Nation, Position, Alter, Attributpunkte und Aussehen wählst du weiter selbst.',
    ],
  },
  {
    id: '2026-10-07-bauprojekte',
    date: '07.10.2026',
    title: 'Bauprojekte bei deinen Klubs 🏗️',
    items: [
      '🏟️ Unter „Vermögen → Klub-Anteile“ kannst du jetzt in Projekte investieren: neues Stadion, Jugendakademie, Trainingszentrum, Scouting-Netzwerk, Fanshop & Marketing.',
      '⏳ Projekte brauchen Bauzeit, manchmal gibt es Verzögerungen – und nicht jedes Projekt wird gleich gut. Dafür bleibt das Geld dem Klub erhalten.',
      '🔒 Was genau sie bringen, steht nirgends. Probier es aus.',
    ],
  },
  {
    id: '2026-10-07-geschenke',
    date: '07.10.2026',
    title: 'Mystery-Geschenke vom Aufsichtsrat 🎁',
    items: [
      '🎁 Steigt ein Klub auf, an dem du Anteile hast (oder spielt er erstmals europäisch), schickt dir der Aufsichtsrat eine Mystery-Box.',
      '✨ Bronze-, Silber- oder Gold-Box: Beim Öffnen wackelt sie, springt auf – Coins (je höher die Liga und dein Anteil, desto mehr) und mit Glück ein Gratis-Pack bis hin zum Ikonen-Pack.',
      '📬 Ungeöffnete Geschenke siehst du direkt in der Karriere und unter „Vermögen“.',
    ],
  },
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
      '🔗 Freunde speichern: Team-Code einfügen → „Speichern“. Schickt dein Freund später einen neuen Code, wird sein Team automatisch aktualisiert.',
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
      '🏡 Familie: Einmal pro Karriere laden dich Brasilianerinnen zur After-Party ein … Kinder erziehst du mit festen Regeln (Verein, Schule, Zocken, Essen). Mit 18 kann dein Kind Profi werden und Coins verdienen.',
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
