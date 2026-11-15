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
  /** Angepinnt: erscheint bei jedem Spielstart, auch wenn man es schon gesehen hat. */
  pinned?: boolean;
  /** Video statt Bild (groß oben, stumm in Schleife, Ton per Knopf). */
  video?: string;
  poster?: string;
  /** Werbung für einen Code im Shop. */
  promo?: { code: string; text: string };
}

export const GREETING = 'An Alle Ayris die das spielen!';

/**
 * Ids von Einträgen, die wieder entfernt wurden (stille Updates). Wer so einen Eintrag schon gesehen hat,
 * bekommt kein altes Banner erneut angezeigt.
 */
export const RETIRED_IDS = ['2026-10-05-sounds', '2026-10-31-hoeher-tiefer-5'];

export const UPDATES: UpdateNote[] = [
  {
    id: '2026-11-15-larp',
    date: '15.11.2026',
    title: 'LARP-Modus: Old Money aus Eppendorf',
    items: [
      'Neu in der Karriere: „Look“. Kauf dir Golden-Goose-Sneaker im Used-Look, Kaschmir über den Schultern, die Vintage-Uhr „vom Opa“ und mehr – jedes Teil gibt Aura.',
      'Aura bringt mehr Kickgram-Follower und Likes (Aura 30 = +30 % Follower-Wachstum).',
      'Der Larp-Zähler zeigt, wie riskant dein Auftritt ist: Replikas sind billig, aber gefährlich, und mehr Aura, als zu deinem Stand passt, macht verdächtig. Fliegst du am Saisonende auf, verlierst du ein Viertel deiner Follower, die Replikas – und bei Fakes kündigt der Ausrüster.',
      'Rettung: Teile ausziehen oder verkaufen (Originale bringen die Hälfte zurück) oder ein ehrlicher Post („Ist alles nur geliehen“) halbiert das Risiko.',
    ],
  },
  {
    id: '2026-11-15-big-update',
    date: '15.11.2026',
    title: 'Big Update: schneller, flüssiger, Sommer 2014',
    items: [
      'Schnellerer Start: Das Spiel lädt rund ein Viertel weniger Code beim Öffnen. Manager-Modus, Casino, Backup, Ruhmesweg und alte News werden erst geladen, wenn du sie brauchst.',
      'Neu: Leistungsmodus (Einstellungen). Auf „Auto“ misst das Spiel beim Start, ob dein Gerät ruckelt, und schaltet dann Dauer-Animationen und den Glas-Weichzeichner ab. Du kannst ihn auch fest an- oder ausschalten.',
      'Neue SBCs „Sommer 2014“: Miroslav Klose (16. WM-Tor beim 7:1), James Rodríguez (WM-Torschützenkönig), Diego Godín (Meister-Kopfball im Camp Nou), Luis Suárez (31 Tore für Liverpool) und Gareth Bale (La Décima).',
      'Ältere News findest du weiter unter „Neuigkeiten“ → „Ältere News“.',
    ],
  },
  {
    id: '2026-11-13-u23-kader',
    date: '13.11.2026',
    title: 'Neu: Talente der PSG-U23 und von Hannover 96 II',
    items: [
      'Elf Talente aus der U23 von Paris Saint-Germain – u. a. Ilian Mhand, Noa Bezeme, Adam Ayari und Daniel Marques. Sie starten bei PSG.',
      'Elf Spieler von Hannover 96 II – von Torwart Tom Lange über Asuma Ikari bis Routinier Niko Gießelmann.',
      'Alle sind unter „Echter Spieler“ spielbar und als Karten in Packs.',
    ],
  },
  {
    id: '2026-11-12-rivals-taeglich',
    date: '12.11.2026',
    title: 'Rivals jetzt jeden Tag',
    items: [
      'Die Duell-Saison läuft nicht mehr eine Woche, sondern einen Tag: Ab Mitternacht holst du die Belohnung für gestern ab – Coins, Packs und ab Gold ein Rivals-Pack.',
      'Die Ränge sind dafür kleiner: Silber ab 15, Gold ab 45, Elite ab 100, Weltklasse ab 200, Legende ab 350 Punkten.',
      'Punkte aus alten Wochen-Saisons bleiben erhalten und sind sofort abholbar.',
    ],
  },
  {
    id: '2026-11-11-zwei-teams',
    date: '11.11.2026',
    title: 'Zwei Teams: Haupt-Team und Karriere-Team',
    items: [
      'In „Mein Team“ und bei den Duellen wählst du jetzt oben zwischen zwei Teams – jedes mit eigener Aufstellung und Formation.',
      'Haupt-Team: Karten aus Packs, Events, Drops und SBCs.',
      'Karriere-Team: Karten aus deinen Karrieren (Auszeichnungen, Ikonen, Saison-Specials) und SBC-Karten. Karriere-Karten, die bisher im Haupt-Team standen, ziehen beim ersten Wechsel automatisch um.',
      'Bei den Duellen wählst du direkt über dem Gegner, mit welchem Team du spielst – mit Stärke und Spielerzahl beider Teams.',
    ],
  },
  {
    id: '2026-11-11-zeitreise-teams',
    date: '11.11.2026',
    title: 'Neue Zeitreise-Teams: Chelsea 2014/15 und 96 II',
    items: [
      'Karriere → „Chelsea 14“: zehn Spieler aus Mourinhos Meisterteam 2014/15 – Hazard, Diego Costa, Fàbregas, Terry, Courtois und mehr. Jeder startet mit seinem damaligen Alter bei Chelsea.',
      'Karriere → „96 II (24)“: zehn Spieler der U23 von Hannover 96, die 2024 Meister der Regionalliga Nord wurde und in die 3. Liga aufstieg – mit Kapitän Lars Gindorf.',
    ],
  },
  {
    id: '2026-11-11-familie-raus',
    date: '11.11.2026',
    title: 'Noch schlanker: Familie und Geheimseite entfernt',
    items: [
      'Die Familie in der Karriere (Kinder, Erziehungsregeln, After-Party-Einladungen) ist raus. Vermögen, Immobilien und Vereinsanteile bleiben.',
      'Die Geheimseite „Onkel Flávio“ ist entfernt – ihre alten Daten werden gelöscht, das gibt Speicher im Browser frei.',
    ],
  },
  {
    id: '2026-11-11-schlanker',
    date: '11.11.2026',
    title: 'Schlanker: Tauschbörse entfernt',
    items: [
      'Die Tauschbörse ist raus – Karten bekommst du weiter über Packs, SBCs, Drops und deine Karrieren.',
      'Rund 65 KB alter Design-Code von Bildschirmen, die es nicht mehr gibt, wurden gelöscht – das Spiel lädt etwas schneller.',
    ],
  },
  {
    id: '2026-11-09-aufgeraeumt',
    date: '09.11.2026',
    title: 'Aufgeräumt: weniger Ballast',
    items: [
      'Die Trainerkarriere nach dem Karriereende ist raus – dafür gibt es jetzt den viel größeren Manager-Modus im Hauptmenü.',
      'Vorbei und entfernt: Halloween-Deko, Gala-Woche, Glücksrad-Event und der Ballon-d’Or-Tipp. Karten aus diesen Events bleiben natürlich in deiner Sammlung.',
      'Adventskalender, Polarlicht-Kalender und Silvester kommen wie geplant im Dezember.',
    ],
  },
  {
    id: '2026-11-09-absturz-fix',
    date: '09.11.2026',
    title: 'Absturz-Fix: Karriere-Belohnung',
    items: [
      'Behoben: Das Spiel stürzte ab, wenn man nach dem Karriereende „Weiter“, „Fertig“ oder „Zur Sammlung“ getippt hat.',
      'Neu: ein Auffangnetz – falls doch mal etwas schiefgeht, kommst du mit einem Tipp zurück ins Menü statt auf einen weißen Bildschirm.',
    ],
  },
  {
    id: '2026-11-09-talente',
    date: '09.11.2026',
    title: '9 neue Talente',
    items: [
      'Rekord-Debütant Niko Iličević (Eintracht Frankfurt, mit 16 Jahren und 1 Tag in der Bundesliga) ist spielbar.',
      'Dazu: Bara Sapoko Ndiaye (Bayern), Joél Drakes-Thomas (Crystal Palace), Jayden Lienou (Leeds), Sean Neave (Newcastle), Josh King (Fulham) und Veljko Milosavljević (Bournemouth).',
      'Aus Brasilien: Gabriel Mec (Grêmio) und Luiz Benedetti (Palmeiras).',
    ],
  },
  {
    id: '2026-11-09-brasilien',
    date: '09.11.2026',
    title: 'Brasileirão, Floyd Samba und Zufalls-Karte',
    items: [
      'Neue Liga: Brasileirão Série A mit allen 20 Vereinen der Saison 2026 – von Flamengo und Palmeiras bis Remo und Chapecoense. Pokal: Copa do Brasil.',
      'Neue Spieler: Floyd Samba (Manchester City, 17 – zwei Tore beim Debüt) und Brasilien-Stars wie Pedro, Arrascaeta, Samuel Lino, Vitor Roque, Flaco López, Gabigol, Kaio Jorge, Viveros, Breno Bidon und Junior Alonso. Lucas Paquetá spielt jetzt für Flamengo.',
      'Karriereende: Du wählst deine Auszeichnungs-Karte nicht mehr aus – eine deiner verdienten Karten wird zufällig gezogen.',
    ],
  },
  {
    id: '2026-11-06-nlz-entscheidung',
    date: '06.11.2026',
    title: 'Karriere: Du entscheidest, wann du hochgehst',
    items: [
      'Wenn dich dein Verein früher hochziehen will – von der U17 in die U19, aus dem NLZ zu den Profis oder aus der zweiten Mannschaft zurück zu den Profis –, entscheidest du jetzt selbst.',
      'Hochgehen bringt stärkere Gegner und mehr Gehalt. Bleiben macht dich zum Leistungsträger mit viel Spielzeit – nächsten Sommer kommt eine neue Chance.',
      'Wer zu alt für seine Mannschaft ist, rückt wie bisher automatisch auf.',
    ],
  },
  {
    id: '2026-11-06-tauschen-update-box',
    date: '06.11.2026',
    title: 'SBC-Tauschen-Knopf und neue Update-Box',
    items: [
      'Der „Tauschen“-Knopf beim SBC-Bau klebt wieder sichtbar am unteren Rand – vorher lag er ganz unten unter allen Karten.',
      'Die Update-Box passt jetzt immer auf den Bildschirm: Bild mit Titel oben, kompakter Text, „Los geht’s!“ immer sichtbar.',
    ],
  },
  {
    id: '2026-11-05-sbc-fix',
    date: '05.11.2026',
    title: 'SBC: Automatisch füllen repariert',
    items: [
      '„Automatisch füllen“ reagiert wieder sofort – vorher hakte es, weil bei jedem Klick alle Karten neu gezeichnet wurden.',
      'Neuer Filter „Passend“ zeigt nur Karten, die für den Tausch in Frage kommen. Weitere Karten über „Mehr anzeigen“.',
      'Der Hinweis nach dem Füllen ist wieder lesbar, und bei den Ewig-SBCs gibt es keinen leeren Liga-Filter mehr.',
    ],
  },
  {
    id: '2026-11-05-fettes-update',
    date: '05.11.2026',
    title: 'Fettes Update: Packs zurück, 250 neue Spieler, 5 neue Ewig-SBCs',
    items: [
      'Packs, Angebote und Drops sind zurück im Shop.',
      'Über 250 neue echte Spieler – als Karten, in der Spielerkarriere und in den Kadern im Manager-Modus. Die Bundesliga ist jetzt fast komplett echt besetzt, dazu viele Stars aus Premier League, LaLiga, Serie A, Ligue 1 und Portugal. Bekannte Sommer-Wechsel 2026 sind eingearbeitet.',
      'Fünf neue Ewig-SBCs mit Karten über 100 – erstmals auf neuen Positionen: Maradona (ZOM, 103), Kahn (TW, 101), Cafu (AV, 101), Matthäus (ZDM, 101) und Maldini (AV, 100).',
    ],
  },
  {
    id: '2026-11-05-the-hallway',
    date: '05.11.2026',
    title: 'The Hallway – das neue Roblox-Spiel',
    pinned: true,
    image: '/news/the-hallway.webp',
    imageAlt: 'Eine Taube späht um die Ecke, im roten Flur steht eine Lampe',
    items: [
      'Ein endloser roter Flur, flackerndes Licht – und irgendwo versteckt sich die Taube. Finde sie, bevor die Lampen dich erreichen.',
      'Zum Start gibt es die Flur-Kiste: Drei Türen, hinter einer sitzt die Taube. Jede falsche Tür lässt die Lampen näher kommen.',
      'Mit dem Code freigeschaltet: Profil-Banner „Der Flur“ und Titel „Taubenfinder“.',
    ],
    promo: { code: 'HALLWAY', text: 'Im Shop einlösen: Flur-Kiste mit 3 Topkarten (eine ab 88). Auch der Code TAUBE funktioniert.' },
  },
  {
    id: '2026-11-05-manager-kalender',
    date: '05.11.2026',
    title: 'Manager-Modus: Kalender, Ereignisse und News-Zentrale',
    items: [
      'Die Saison läuft jetzt Tag für Tag: Spieltage, Trainingstage, Regeneration, Winterpause und Deadline Day. Schnellknöpfe: Nächster Tag, Bis zum nächsten Spiel, Bis zur Winterpause, Bis Saisonende – oder einen Tag im Kalender antippen.',
      'Transferfenster nach Datum: im August und im Januar, mit Countdown bis zur Deadline.',
      'Ereignisse mit drei Antworten: Transferinteresse an deinen Stars, Sponsoren, unzufriedene Spieler, Fans, Kampfansagen vor dem Spiel, Jugend-Juwelen, Scout-Tipps. Deine Antworten wirken auf Budget, Vorstand und Teamstimmung.',
      'Neu: Teamstimmung und Form, News-Zentrale mit Filtern. Alles Bisherige (Aufstellung, Bank, Live-Spiel, Team-Zentrale, Transfermarkt) bleibt, alte Spielstände laufen weiter.',
    ],
  },
  {
    id: '2026-11-05-ausruester-kickgram',
    date: '05.11.2026',
    title: 'Karriere: Ausrüster-Verträge und Kickgram',
    items: [
      'Schon als Jugendspieler melden sich Ausrüster: Winnerz, Freedom Paris, Ami und Helmut Lang. Jede Marke zahlt Coins pro Saison plus Bonus für Tore und Titel – je besser du bist, desto größer die Marke.',
      'Neu: Kickgram – dein eigenes Profil mit Followern. Lade Fotos aus deiner Galerie hoch oder poste Saison-Highlights, sammle Likes und Kommentare. Ab 100.000 Followern gibt es den blauen Haken.',
      'Mit Ausrüster kannst du Werbeposts machen (2 pro Pause), die Coins bringen. Deine Bilder bleiben nur auf deinem Gerät.',
    ],
  },
  {
    id: '2026-11-04-manager-aufstellung',
    date: '04.11.2026',
    title: 'Manager-Modus: Deine Aufstellung bleibt',
    items: [
      'Elf und Bank werden zum Saisonende nicht mehr neu gewählt – nur Plätze von Spielern, die aufgehört haben, werden nachbesetzt.',
      'Formation wechseln behält deine elf Spieler und verteilt sie nur auf die neuen Positionen. Komplett neu aufstellen geht weiter mit „Beste Elf“.',
    ],
  },
  {
    id: '2026-11-04-manager-zentrale',
    date: '04.11.2026',
    title: 'Manager-Modus: Bank, Einwechslungen und Team-Zentrale',
    items: [
      'Neue Ersatzbank mit 7 Plätzen – du bestimmst, wer draufsitzt. Ab der 55. Minute werden 3–5 Spieler eingewechselt und bekommen Spielzeit.',
      'Team-Zentrale: Einsätze (Startelf und eingewechselt), Minuten, Tore, Vorlagen und Noten für jeden Spieler – sortierbar, mit Bestwerten oben.',
      'Nach jedem Spiel: Noten für alle Spieler, Spieler des Spiels, Wechsel und Vorlagen im Spielverlauf.',
    ],
  },
  {
    id: '2026-11-04-manager-modus',
    date: '04.11.2026',
    title: 'Neu: Manager-Modus',
    items: [
      'Übernimm einen Verein aus 11 Ligen – der Kader besteht aus den echten Spielern des Vereins, aufgefüllt mit Nachwuchs und Ergänzungsspielern.',
      'Aufstellung auf dem Spielfeld (4 Formationen), Taktik vor jedem Spiel, Spieltag für Spieltag mit Live-Anzeigetafel – oder direkt bis zur Winterpause simulieren.',
      'Transfermarkt im Sommer und Winter: echte Spieler, Juwelen und ein Traum-Transfer. Jeder Spieler hat eine Wechsel-Lust – zu kleine Vereine bekommen auch Absagen.',
      'Vorstandsziel, Preisgeld, Auf- und Abstieg zwischen 1. und 2. Liga, Spielerentwicklung. Coins für dein Konto und als Meister ein Premium-Pack.',
    ],
  },
  {
    id: '2026-11-04-jungle-crash',
    date: '04.11.2026',
    title: 'Jungle Crash – ab 4. November auf Roblox',
    video: '/news/jungle-crash-trailer.mp4',
    poster: '/news/jungle-crash-trailer.jpg',
    imageAlt: 'Trailer von Jungle Crash',
    items: [
      'Das neue Roblox-Spiel der Entwickler ist da. Dazu läuft eine Woche lang (bis 11. November) das Event „Jungle Crash“.',
      'Bananen sammeln (Duelle, Drops, Höher/Tiefer, Draft, Karriere) und den Expeditions-Pfad hochklettern: 30 Stufen, 6 Dschungel-Karten mit +4 – Mbappé, Haaland, van Dijk, Alisson, Pedri und Leão.',
      'Neue Enthüllung: Ein Frachtflieger wirft eine Kiste ab, sie kracht in den Dschungel und springt auf. Dazu Titel „Expeditionsleiter“ und Banner „Dschungel“.',
    ],
    promo: { code: 'JUNGLECRASH', text: 'Im Shop einlösen: Absturz-Kiste mit Dschungel-Karte + 2 Topkarten.' },
  },
  {
    id: '2026-11-02-champions-rivals',
    date: '02.11.2026',
    title: 'Duelle: Champions-Division und Wochen-Saisons',
    items: [
      'Neue höchste Stufe über der Elite: die Champions-Division – stärkere Gegner, mehr Coins, mehr Saisonpunkte.',
      'Duell-Saisons laufen jetzt eine Woche (Mo–So). Jeden Montag gibt es je nach Rang Coins, Packs und Rivals-Packs.',
      'Neu: Rivals-Pack – eine Karte aus deiner Elf kommt als Rivals-Karte verbessert zurück (+2 bis +5, je nach Rang), dazu 2 Extrakarten ab 80.',
    ],
  },
  {
    id: '2026-11-02-bestenliste',
    date: '02.11.2026',
    title: 'Neu: Bestenliste',
    items: [
      'Wer hat die meisten Trophäen? Die Top 100 – tippe im Profil auf deine Trophäen.',
      'Dein Platz ist hervorgehoben; bist du noch nicht in den Top 100, siehst du, wie viele Trophäen dir fehlen.',
      'Die Konkurrenz schläft nicht: Die Top 10 liegen um 50.000 Trophäen, und jeden Tag kommen bei allen welche dazu.',
    ],
  },
  {
    id: '2026-11-02-kult-memphis',
    date: '02.11.2026',
    title: '13 neue Kult-Helden',
    items: [
      'Showmen: Memphis Depay, Paul Pogba, Jesse Lingard, Hakim Ziyech, Samir Nasri.',
      'Ab nach Übersee: Philippe Coutinho, Willian, Douglas Costa, Emmanuel Adebayor.',
      '„Was wäre wenn“: Anthony Martial, Jadon Sancho, James Rodríguez, Lorenzo Insigne.',
      'Alle als Kult-Karte und jung in der Karriere unter „Kult“ – mit passenden Eigenschaften wie Showman, Diva oder Geldgier.',
    ],
  },
  {
    id: '2026-11-02-faehigkeiten-2',
    date: '02.11.2026',
    title: 'Fähigkeitenbaum: länger, verästelt, mit Meisterung',
    items: [
      'Der Baum ist länger: neue Stufe 6 „Legende“, das Meisterstück ist jetzt Stufe 7.',
      'Jeder Ast gabelt sich ab Stufe 3 in zwei Zweige – z. B. Torjäger: „Allrounder“ oder „Distanzschütze“. Du wählst einen, der andere ist dann zu. 60 neue Fähigkeiten.',
      'Meisterung: Gelernte Fähigkeiten werden durch Benutzen stärker – Bronze, Silber (+20 %), Gold (+40 %), Prisma (+70 %). Tor-Fähigkeiten zählen Tore, Abwehr-Fähigkeiten Spiele zu null und so weiter.',
      'Deine bisherigen Fähigkeiten bleiben erhalten und zählen ab jetzt mit.',
    ],
  },
];

export const LATEST_UPDATE = UPDATES[0];
