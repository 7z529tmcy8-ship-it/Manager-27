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
    id: '2026-10-24-saison2',
    date: '24.10.2026',
    title: 'Saison 2 des Saison-Passes – jetzt mit 60 Stufen',
    items: [
      'Der neue Pass ersetzt den alten: Saison 2 läuft ab heute bis 30. November und hat doppelt so viele Stufen.',
      'Neuer Saison-Held auf Stufe 60: Harry Kane 96 im Pass-Design.',
      'Mehr Belohnungen: Ikonen-Packs auf 30, 40 und 50, Ultimate auf 48 und 55, ein GOAT-Pack auf Stufe 59.',
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
