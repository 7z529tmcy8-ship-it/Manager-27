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
      '🧟 Halloween-SBC „Die Nacht der lebenden Toten“: Adriano als Zombie-Imperator (93) – nur mit Kult-Helden, „Was wäre wenn“-Talenten und einer Ikone.',
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
      '🧗 Weltklasse ist schwer: Ab etwa 86 wird jeder Punkt zäher, ab 94 kommt kaum noch etwas dazu. Eine 99 ist auf natürlichem Weg nicht mehr drin.',
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
      '🔒 Abgeschickt ist abgeschickt. Viel Glück 😇',
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
      '🤫 Was genau sie bringen, steht nirgends. Probier es aus.',
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
