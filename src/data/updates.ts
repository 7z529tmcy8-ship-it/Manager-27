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
    id: '2026-11-24-karriere-karten',
    date: '24.11.2026',
    title: 'Dein Karriere-Spieler kommt in die Sammlung',
    items: [
      'Nach jeder gespielten Saison liegt dein Karriere-Spieler als Karte in der Sammlung – sie wächst jede Saison mit (Wertung, Verein, Kartenstufe).',
      'Saison-Pack mit echten Spielern nach jeder Saison: schwache Saison Standard-Pack, gute Saison Gold-Pack, starke Saison Premium-Pack – jeder Titel und jede Auszeichnung bringt zusätzlich ein Weltstar-Pack (höchstens 2).',
      'Auch alte Karrieren bekommen ihre Spielerkarte sofort.',
      'Die Sammlung zeigt unter „Meine“ jetzt alle deine Karten aus den Karrieren, sie zählen auch für die Meilensteine.',
      'Im Haupt-Team darfst du alle Karriere-Karten aufstellen. Hinweise auf den Shop sind entfernt.',
    ],
  },
  {
    id: '2026-11-24-account-reset',
    date: '24.11.2026',
    title: 'Account zurücksetzen',
    items: [
      'Neu in den Einstellungen unter „Account“: Account zurücksetzen – alle Karrieren, Karten, Coins, Chips, Profil und Fortschritt werden gelöscht, das Spiel startet frisch.',
      'Design, Ton und Karriere-Einstellungen bleiben erhalten. Mit „Vorher sichern“ kannst du vorher eine Sicherung machen. Zwei Sicherheitsabfragen schützen vor Versehen.',
    ],
  },
  {
    id: '2026-11-24-einstellungen-global',
    date: '24.11.2026',
    title: 'Karriere-Einstellungen für alle Karrieren',
    items: [
      'Schwierigkeit, Spieltag-Modus, Live-Simulation, Topspiele selbst spielen und ausgeblendete Bereiche stellst du jetzt einmal ein – sie gelten für alle Karrieren, auch für neue.',
      'Die Einstellungen findest du unter „Karriere“ in den Einstellungen, auch wenn gerade keine Karriere läuft.',
      'Beim ersten Start werden die Einstellungen deiner zuletzt gespielten Karriere übernommen.',
    ],
  },
  {
    id: '2026-11-24-karten-v4',
    date: '24.11.2026',
    title: 'Neues Karten-Design',
    items: [
      'Sonderkarten mit eigenem Charakter: Das Symbol der Kartenart steht groß als Wasserzeichen hinter dem Trikot, die Kartenart auf einem Schleifenband.',
      'Trikots in den Farben der Kartenart statt grau – mit Streifen und Schatten.',
      'Top-Karten (Ikone, Ballon d’Or, Weltmeister, Königsklasse …) haben eine wandernde Lichtkante.',
      'Nichts mehr abgeschnitten: Lange Namen stehen zweizeilig, lange Vereins- und Titelzeilen passen sich an, statt mit „…“ zu enden.',
    ],
  },
  {
    id: '2026-11-24-karten-nur-karriere',
    date: '24.11.2026',
    title: 'Karten nur noch aus der Karriere',
    items: [
      'Den Karten-Shop gibt es nicht mehr: Neue Karten (weiter mit echten Spielern) bekommst du nur noch durch deine Karrieren.',
      'Statt Karten gibt es jetzt Coins bzw. Chips: Tagesziel-Bonus (+5.000 Coins), Duell-Saison (Coins statt Rivals-Karten), Casino-Mystery-Box (Chips). Im Casino-Preis-Shop gibt es nur noch XP und Profil-Extras.',
      'Neu unter „Spielstände“: Alle Karrieren auf einmal löschen. Deine gesammelten Karten, Coins und Chips bleiben dabei erhalten.',
      'Design: Lange Namen und Werte werden nicht mehr abgeschnitten – sie brechen sauber um. Kopfzeile mit kompakten Zahlen (z. B. 1,2 Mio.), aufgeräumte Startseite.',
    ],
  },
  {
    id: '2026-11-24-klarheit',
    date: '24.11.2026',
    title: 'Karriere-Update: Mehr Klarheit',
    items: [
      '„Nächstes Ziel“ steht jetzt immer oben in der Karriere: Trainer-Auftrag, nächste Rolle im Team oder offenes Saisonziel.',
      'Kurze Einführung in der ersten Saison: So funktionieren Etappen, Szenen und Kabine.',
      'Leben-Tab aufräumen: In den Einstellungen der Karriere kannst du Vermögen, Klinik, Look, Kickgram und Ausrüster einzeln ausblenden. Es wird nichts gelöscht.',
    ],
  },
  {
    id: '2026-11-24-vermaechtnis',
    date: '24.11.2026',
    title: 'Karriere-Update: Vermächtnis & Rekorde',
    items: [
      'Ruhmeshalle im Karriere-Menü: alle deine Karrieren nach Legendenpunkten, dazu Bestwerte (meiste Tore, Vorlagen, beste Note …).',
      'Rekordjagd während der Saison: Knackst du deinen eigenen Tor- oder Vorlagen-Rekord aus allen Karrieren?',
      'Abschiedsspiel zum Karriereende: Bilanz, beste Saison, deine Karriere-Kapitel und dein Platz in der Ruhmeshalle.',
    ],
  },
  {
    id: '2026-11-24-trainingswoche',
    date: '24.11.2026',
    title: 'Karriere-Update: Trainingswoche',
    items: [
      'Vor jeder Etappe stellst du die Belastung ein: Normal, Extra-Schichten, Volle Kraft oder Schonen – mehr Einsätze gegen mehr Verletzungsrisiko.',
      'Trainingsschwerpunkt frei wählbar (wichtige Attribute deiner Position sind markiert).',
      'Timing-Übung (freiwillig, einmal pro Etappe): Stoppe die Markierung im grünen Bereich – bis zu +0,3 Form. Je besser dein Schlüsselattribut, desto größer der grüne Bereich.',
    ],
  },
  {
    id: '2026-11-24-story-rivalen',
    date: '24.11.2026',
    title: 'Karriere-Update: Story & Rivalen',
    items: [
      'Dein Rivale ist jetzt sichtbar: gleiche Position, ähnliches Alter – mit Bilanz über alle Saisons und Zwischenstand im laufenden Jahr.',
      'Rivalen-Duell: Spielst du gegen seinen Verein, wird die Szene des Spieltags zum direkten Duell.',
      'Fan-Stimmung pro Verein (Pfiffe bis Fan-Liebling): gute Spiele, Treue und Titel zählen – ein schneller Abgang wird nicht vergessen, bei der Rückkehr gibt es Applaus oder Pfiffe.',
      'Karriere-Kapitel im Verlauf: automatische Überschriften wie „Durchbruch bei …“ oder „Titelsammler bei …“.',
    ],
  },
  {
    id: '2026-11-24-berater',
    date: '24.11.2026',
    title: 'Karriere-Update: Berater & Transfermarkt',
    items: [
      'Berater wählen (in der Kabine): Haifisch (mehr Gehalt, Verein genervt), Familienfreund (bessere Verlängerung, mehr Vertrauen) oder Großmaul (Zusatzangebot, mehr Schlagzeilen).',
      'Gerüchte: Nach starken Etappen beobachten größere Vereine dich. Wird ein Gerücht heiß, kommt im Sommer oft ein echtes Angebot.',
      'Deadline-Day im Transferfenster: bis Mitternacht warten – manchmal kommt ein Last-Minute-Angebot oder ein Verein bessert nach.',
    ],
  },
  {
    id: '2026-11-24-grosse-buehne',
    date: '24.11.2026',
    title: 'Karriere-Update: Große Bühne',
    items: [
      'Saison-Gala: Am Saisonende öffnest du die Umschläge – Torjägerkanone, Spieler der Saison, Team der Saison, Golden Boy, Weltfußballer-Wahl und das Turnier mit der Nationalelf.',
      'Weltfußballer-Ranking: Ab Wertung 78 siehst du während der Saison, wo du im Vergleich zu den Stars der Welt stehst.',
      'Flutlicht: Im Etappen-Rückblick stehen Pokal- und Europapokal-Spiele extra – mit deinen Toren und Vorlagen.',
    ],
  },
  {
    id: '2026-11-24-spieltag-kabine',
    date: '24.11.2026',
    title: 'Karriere-Update: Spieltag-Modus & Kabine',
    items: [
      'Die Saison läuft jetzt in 6 Etappen: Gegner, Form und Fortschritt siehst du vor jeder Etappe.',
      'Szene des Spieltags: Nach jeder Etappe entscheidest du einen Moment selbst (z. B. Lupfer oder flach ins Eck) – mit sichtbarer Chance aus deinen Attributen. Tore zählen wirklich, auch in der Tabelle.',
      'Kabine: Deine Rolle im Team (Tribüne bis Unverzichtbar), Startelf-Chance und das Vertrauen des Trainers mit Gründen.',
      'Trainergespräch einmal pro Etappe: Spielzeit fordern, einen Auftrag holen oder Teamgeist zeigen.',
      'Konkurrent um deinen Platz (echte Mitspieler, wenn es welche gibt) und Trainerwechsel, wenn es im Verein schlecht läuft.',
      'Wer lieber schnell spielt: „Durchsimulieren“ gibt es weiter, und in den Einstellungen lässt sich der Spieltag-Modus ausschalten.',
    ],
  },
  {
    id: '2026-11-24-karriere-zurueck',
    date: '24.11.2026',
    title: 'Die Karriere ist zurück – Casino mit Fokus',
    items: [
      'Karriere, Team, Shop, Duelle und Profil sind wieder da. Das Spiel startet wieder im Hauptmenü.',
      'UgursCasino konzentriert sich jetzt auf zwei Spiele: Plinko und Straßen-Sprint. Die anderen Spiele sind nur ausgeblendet.',
      'Rekorde: Dein bester Multiplikator steht auf jeder Kachel – wer ihn knackt, bekommt „Neuer Rekord!“ mit Fanfare.',
      'Straßen-Sprint: Auto-Kassieren bei 2×, 5×, 10× oder 50× und goldene Checkpoints alle 5 Fahrbahnen.',
      'Neue Tagesaufgaben für Straßen-Sprint und Plinko.',
    ],
  },
  {
    id: '2026-11-23-ugurscasino',
    date: '23.11.2026',
    title: 'Willkommen im UgursCasino',
    items: [
      'Das Spiel heißt jetzt UgursCasino und startet direkt in der Casino-Lobby.',
      'Neuer Ladebildschirm: Casino-Chip, Lauflichter wie am Automaten, goldener Ladebalken.',
      'Karriere, Team, Shop, Duelle und Profil sind ausgeschaltet – nicht gelöscht. Deine Spielstände bleiben gespeichert.',
      'Einstellungen, Neuigkeiten und „Sichern & Laden“ findest du oben links über das Zahnrad.',
      'Plinko: Bei jedem fallenden Ball muht eine übersteuerte Kuh.',
    ],
  },
  {
    id: '2026-11-23-strassen-sprint-v2',
    date: '23.11.2026',
    title: 'Straßen-Sprint: neuer Look, kein Ruckeln',
    items: [
      'Echte Straße: Asphalt, Fahrbahn-Striche, Gehweg am Start und Zielflagge.',
      'Multiplikator steht als Plakette mitten auf jeder Fahrbahn – die nächste leuchtet gold und pulsiert.',
      'Geschaffte Fahrbahnen werden grün mit Haken und Hütchen.',
      'Neue Autos mit Scheiben und Scheinwerfer-Licht.',
      'Autos fahren jetzt auf jedem Handy – auch wenn „Animationen aus“ an ist (dann nur etwas langsamer).',
      'Flüssiger: nur sichtbare Fahrbahnen werden gezeichnet, Kugel und Autos bewegen sich ohne teure Leucht-Effekte.',
    ],
  },
  {
    id: '2026-11-23-schiffshorn',
    date: '23.11.2026',
    title: 'Casino: Schiffshorn bei großen Gewinnen',
    items: [
      'Ab 10× Einsatz (und beim Jackpot) dröhnt ein übersteuertes Schiffshorn – in jedem Casino-Spiel. Ab 25× und 100× hält es länger.',
    ],
  },
  {
    id: '2026-11-23-strassen-sprint',
    date: '23.11.2026',
    title: 'Neues Spiel: Straßen-Sprint',
    items: [
      'Deine Neon-Kugel hüpft Fahrbahn für Fahrbahn über eine befahrene Straße – mit jedem Schritt steigt der Multiplikator. Kassieren kannst du jederzeit; wirst du erwischt, ist der Einsatz weg.',
      'Vier Stufen: Leicht (4 % Unfall pro Fahrbahn), Mittel (12 %), Schwer (20 %) und Hardcore (40 %) – auf Hardcore bis über 26.000× nach 20 Fahrbahnen.',
      'Die nächste Fahrbahn leuchtet mit ihrem Multiplikator, jeder Schritt hat einen eigenen, steigenden Ton. Leertaste oder Enter = weiter.',
      'Fair: Der Multiplikator ist so berechnet, dass jeder Ausstieg im Schnitt 97 % zurückzahlt – egal, wann du kassierst.',
    ],
  },
  {
    id: '2026-11-23-casino-klassik',
    date: '23.11.2026',
    title: 'Casino aufgeräumt: wie ein echtes Casino',
    items: [
      'Der Slot heißt jetzt Mega Fruits und ist ein klassischer Früchte-Automat: Kirsche, Zitrone, Pflaume, Glocke, BAR und Sieben. Der Diamant ist Joker, 3 Sterne bringen 10 Freispiele, in denen jeder Gewinn dreifach zählt. 5 Siebener auf einer Linie = Jackpot.',
      'Plinko: schlichter Neon-Ball statt Fußball und neuer Ball-Regen – 5 oder 10 Bälle mit einem Tipp.',
      'Das ganze Casino klingt jetzt übersteuert: Jeder Ton läuft durch eine harte Verzerrung mit Bass-Boost (ein Begrenzer verhindert gefährliche Lautstärke).',
      'Elfmeter-Crash, Elfmeter-Minen und Sportwetten sind aus dem Casino raus – Fokus auf Plinko, Mega Fruits, Rubbellos, Roulette, Blackjack und Glücksrad.',
    ],
  },
  {
    id: '2026-11-23-pokal-der-legenden',
    date: '23.11.2026',
    title: 'Neuer Slot: Pokal der Legenden',
    items: [
      'Die Slots sind jetzt ein Buch-Slot im Fußball-Look: Der Pokal ist Joker UND Freispiel-Auslöser – 3 Pokale irgendwo bringen 10 Freispiele (erneut auslösbar bis 50).',
      'Vor den Freispielen wird ein Spezialsymbol gezogen. Liegt es in einem Freispiel auf genug Walzen, breitet es sich über die ganzen Walzen aus und zahlt auf allen 10 Linien.',
      'Risiko-Leiter nach jedem Gewinn: Rot oder Schwarz raten und den Gewinn bis zu 5-mal verdoppeln – oder alles verlieren. Kassieren geht jederzeit.',
      'Neuer Gold-Rahmen, glühende Freispiel-Walzen. Die Gewinnchancen stehen wie immer unter dem Info-Knopf (Quote ca. 94 %, Risiko-Leiter echte 50 : 50).',
    ],
  },
  {
    id: '2026-11-23-plinko-sound',
    date: '23.11.2026',
    title: 'Torwand-Plinko: Brachial-Sound',
    items: [
      'Plinko hat jetzt eigene, übersteuerte Sounds: fetter Bass-Wumms beim Abwurf, knackige Pfosten-Treffer, die mit jeder Reihe höher werden, und Landungen, die je nach Treffer immer mehr Schichten bekommen – ab 10× mit Fanfare, ab 100× mit Explosion.',
      'Der Lautstärkeregler gilt weiter; ein eingebauter Begrenzer sorgt dafür, dass es brachial klingt, aber nie gefährlich laut wird.',
    ],
  },
  {
    id: '2026-11-23-plinko-juice',
    date: '23.11.2026',
    title: 'Torwand-Plinko: noch mehr Wumms',
    items: [
      'Jeder Ball startet mit einem Lichtring oben am Brett.',
      'Treffer schlagen eine Druckwelle ins Fach, ab 5× schießt eine Lichtsäule nach oben.',
      'Ab 10× rollt eine Leuchtwelle vom Treffer aus durch alle Pfosten, und der Rand des Bretts glüht auf (Gold, Pink, ab 100× Regenbogen).',
      'Ab 3× knallt der Treffer groß in die Mitte – mit Multiplikator UND gewonnenem Betrag („+1,2 Mio.“).',
    ],
  },
  {
    id: '2026-11-23-grosse-einsaetze',
    date: '23.11.2026',
    title: 'Casino: Einsätze bis 10 Mio',
    items: [
      'Neue Schnellwahl in jedem Spiel: 100k, 1 Mio und 10 Mio Einsatz mit einem Tipp.',
      'Höhere Limits: VIP Platin bis 1 Mio pro Runde, VIP Diamant bis 10 Mio. All-in geht wie gehabt immer.',
      'Plinko zahlt auch große Treffer voll aus: Die Gewinngrenze pro Ball liegt jetzt bei 100 Mrd. statt 1 Mio.',
    ],
  },
  {
    id: '2026-11-23-casino-boom',
    date: '23.11.2026',
    title: 'Casino: Riesen-Explosion beim Betreten + alle Coins auf einmal tauschen',
    items: [
      'Beim Betreten des Casinos knallt es: Blitz, drei Druckwellen, Funkenregen, fliegende Münzen, das Logo kracht rein und der Bildschirm bebt. Antippen überspringt.',
      'Chip-Kasse: „Alle Coins umtauschen“ tauscht dein ganzes Coin-Guthaben mit einem Tipp in Chips – mit Mengenbonus bis +30 %. Zur Sicherheit einmal bestätigen.',
    ],
  },
  {
    id: '2026-11-22-riesen-zahlen',
    date: '22.11.2026',
    title: 'Reparatur: Kein Einfrieren mehr bei riesigem Guthaben',
    items: [
      'Mit Billionen und mehr fror das Casino ein: Das Casino-Level wurde Stufe für Stufe hochgezählt – bei riesigen Einsätzen über eine Milliarde Schritte. Jetzt wird es direkt ausgerechnet.',
      'Auch die Einsatz-Stufen (+ / −) kommen mit jeder Größe klar, und „unendlich“ oder ungültige Werte werden automatisch abgefangen. Dein Guthaben bleibt erhalten.',
    ],
  },
  {
    id: '2026-11-22-casino-speed',
    date: '22.11.2026',
    title: 'Casino flüssiger – auch bei großen Zahlen',
    items: [
      'Der Spielstand wird nicht mehr bei jedem einzelnen Einsatz gespeichert, sondern gebündelt (höchstens alle 0,4 Sekunden und sicher beim Verlassen) – im Auto-Modus waren das vorher bis zu 8 Speichervorgänge pro Sekunde.',
      'Große Gewinne: Die Gewinn-Show ist leichter (weniger, einfachere Münzen, kleinere Strahlen-Fläche, ruhigeres Beben) – sie sieht fast gleich aus, braucht aber viel weniger Rechenleistung.',
      'Zahlen werden mit einem gemeinsamen Formatierer geschrieben statt jedes Mal neu – spart bei vielen Zahlen pro Bild spürbar Zeit.',
    ],
  },
  {
    id: '2026-11-22-casino-lobby',
    date: '22.11.2026',
    title: 'Neue Casino-Lobby: aufgeräumt wie ein echtes Online-Casino',
    items: [
      'Ein großes Banner statt vieler Kästen: Jackpot, Sportwetten, Wochen-Turnier und Happy Hour wechseln sich automatisch ab.',
      'Spiele nach Kategorien: Alle, Slots, Sofort (Plinko, Crash, Rubbellos, Minen), Tisch (Roulette, Blackjack, Glücksrad) und Sport. Dazu „Zuletzt gespielt“ für den schnellen Einstieg.',
      'Alle Belohnungen an einem Ort: Das Geschenk oben rechts zeigt, wie viele bereitliegen – Tagesbonus, Mystery-Box, Cashback, Gratis-Drehs, Turnier, Level & VIP und Tagesaufgaben.',
      'Schmale Level-Leiste direkt unter der Kopfleiste, ruhigere Spiele-Kacheln ohne Dauer-Blinken.',
    ],
  },
  {
    id: '2026-11-21-casino-fix-performance',
    date: '21.11.2026',
    title: 'Casino-Reparatur + Performance-Update',
    items: [
      'Roulette repariert: Das Rad blieb optisch oft eine halbe Fachbreite daneben stehen – der Zeiger zeigte dann die Nachbarzahl, obwohl richtig abgerechnet wurde. Jetzt zeigt der Zeiger immer genau die gezogene Zahl.',
      'Roulette zeigt den echten Gewinn: „+2.400“ heißt jetzt wirklich 2.400 mehr als vorher. Bekommst du nur deinen Einsatz (oder einen Teil) zurück, steht „… zurück“ da.',
      'Hohe Zahlen: Einsätze über 100.000 lassen sich wieder mit + und − verstellen (vorher gab es einen Rechenfehler), große Guthaben stehen kompakt in der Kopfleiste („12,4 Mio.“), Crash geht bis höchstens 10.000×.',
      'Performance: Plinko zeichnet das Brett nur noch einmal vor statt in jedem Bild, Leuchteffekte ohne teuren Weichzeichner, weniger Konfetti im Dauerfeuer, und ein Casino-Gewinn zeichnet nicht mehr die ganze App neu. Die Crash-Kurve wird bei langen Flügen nicht mehr immer langsamer.',
    ],
  },
  {
    id: '2026-11-21-casino-level',
    date: '21.11.2026',
    title: 'Casino-Level ohne Chips',
    items: [
      'Level-Aufstiege im Casino bringen keine Chips mehr – Chips gewinnst du nur noch beim Spielen, mit Boni und im Turnier.',
      'Die Level-Einblendung ist jetzt klein und dezent oben statt groß in der Mitte.',
    ],
  },
  {
    id: '2026-11-21-casino-4',
    date: '21.11.2026',
    title: 'Casino 4.0: Drops, Mystery-Box, Glücks-Serie, Happy Hour und Rubbellos',
    items: [
      'Drops & Wins: In jeder Runde mit Einsatz kann aus dem Nichts ein Bonus fallen – 5× bis 100× deines Einsatzes, mit großer Einblendung.',
      'Glücks-Serie: 3, 5, 7 und 10 Gewinne in Folge bringen Extra-Chips (bis 3.000).',
      'Mystery-Box: Alle 30 Runden gibt es eine – Chips, 10 Gratis-Drehs oder eine Karte bis zur Ikone. Die Chancen stehen im Casino.',
      'Happy Hour: 12–13 Uhr und 19–21 Uhr zählen Einsätze doppelt für Level und VIP. Ein Countdown zeigt, wann es losgeht.',
      'Neues Spiel – Rubbellos: Los kaufen, 9 Felder freirubbeln, 3 gleiche Symbole gewinnen bis 500×.',
    ],
  },
  {
    id: '2026-11-21-casino-3',
    date: '21.11.2026',
    title: 'Casino 3.0: Level, Cashback, Gratis-Drehs und Wochen-Turnier',
    items: [
      'Das Casino ist jetzt in der Leiste unten – von überall einen Tipp entfernt. Ein pinker Punkt zeigt, wenn ein Bonus wartet.',
      'Casino-Level: Jeder Einsatz füllt den Level-Balken – das Level zeigt, wie viel du schon gespielt hast (ohne Chip-Belohnung).',
      'Cashback wie in echten Online-Casinos: Ein Teil deines Verlusts von gestern kommt heute zurück – 5 % bei Bronze bis 15 % bei Diamant.',
      'Jeden Tag 10 Gratis-Drehungen an den Stadion-Slots, der Einsatz wächst mit deiner VIP-Stufe.',
      'Wochen-Turnier: Wer diese Woche den höchsten Gewinn-Multiplikator schafft (ab 50 Einsatz), gewinnt bis zu 25.000 Chips. Rangliste gegen Computer-Gegner, Preis in der Folgewoche abholen.',
      'All-in in jedem Spiel: Ein Tipp setzt dein ganzes Guthaben – auch über dein VIP-Limit hinaus. Solange All-in aktiv ist, folgt der Einsatz immer deinem ganzen Guthaben. Nochmal tippen beendet es.',
      'Weiter nur Spielgeld, und die Gewinnchancen jedes Spiels stehen wie gehabt unter dem Info-Knopf.',
    ],
  },
  {
    id: '2026-11-21-karten-feinschliff',
    date: '21.11.2026',
    title: 'Karten: Namen passen, Fotos sitzen',
    items: [
      'Keine abgeschnittenen Namen mehr: Lange Namen wie Schlotterbeck oder Zaïre-Emery werden automatisch etwas kleiner geschrieben und passen immer ganz auf die Karte – geprüft an allen 872 Karten.',
      'Eigene Fotos sitzen jetzt mittig im Bildfeld (wie das Trikot) und laufen weich in die Karte aus – auf großen und kleinen Karten und auf dem Spielfeld.',
      'Hochformat-Fotos werden beim Hochladen eher oben zugeschnitten, damit der Kopf nicht abgeschnitten wird. Schon gespeicherte Bilder bleiben, wie sie sind – einfach neu hochladen, falls nötig.',
    ],
  },
  {
    id: '2026-11-21-karriere-reiter',
    date: '21.11.2026',
    title: 'Karriere ohne Dauer-Scrollen + 29 neue Talente',
    items: [
      'Karriere in Reitern: Saison (simulieren, Ziele, Entscheidungen), Entwicklung (NLZ, Nationalelf, Werte), Leben (Vermögen, Klinik, Look, Kickgram, Ausrüster, Position) und Verlauf. Ein Punkt am Reiter zeigt, wo etwas wartet. Auf dem iPad quer bleibt alles nebeneinander.',
      'Neue echte Talente: Mikey Moore, Francesco Camarda, Senny Mayulu, Ibrahim Mbaye, Mathys Tel, Claudio Echeverri, Kendry Páez, Malick Fofana, Jorthy Mokio, Mika Godts, Noah Darvich, Francis Onyeka, Gabriel Carvalho, Louis Page, Wilson Odobert, Lewis Hall, Andrey Santos, Alejandro Balde, Jeanuël Belocian, Hugo Larsson, Nnamdi Collins, Assane Diao, Jesús Rodríguez, Mamadou Sarr, Valentín Barco, Nestory Irankunda, Lennon Miller und Bilal El Khannouss.',
      'Alle mit Verein zum Saisonstart 2025/26 (Leihspieler beim Leihverein) – als Startspieler in der Karriere und als Karten in der Sammlung.',
    ],
  },
  {
    id: '2026-11-21-nlz-real',
    date: '21.11.2026',
    title: 'NLZ und Nationalmannschaft: realistischer und länger',
    items: [
      'Länger im NLZ: Die U23 geht jetzt bis 22, und zu den Profis wirst du erst hochgezogen, wenn du wirklich nah dran bist. Direkt aus der U15/U17 zu den Profis schafft es nur ein Ausnahmetalent – und frühestens mit 16.',
      'Alle U-Nationalmannschaften: U16, U17, U18, U19, U20 und U21. Normal spielst du in deinem Jahrgang, nur starke Talente eine oder zwei Klassen höher. Turniere: U17-EM/WM, U19-EM, U20-WM und U21-EM.',
      'Die A-Nationalmannschaft kommt später – wie im echten Fußball: Junge Spieler brauchen deutlich mehr Wertung, aus dem NLZ heraus beruft der Nationaltrainer fast nie, und ohne Stammplatz im Verein klingelt das Telefon nicht. Viele U21-Spiele helfen.',
      'Neu in der Karriere: Die NLZ-Leiter zeigt, wo du stehst (U15 → U17 → U19 → U23 → Profis), und „Weg in die Nationalelf“ zählt deine Einsätze von der U16 bis zur A-Elf.',
    ],
  },
  {
    id: '2026-11-21-live-simulation',
    date: '21.11.2026',
    title: 'Karriere: Live-Simulation Spiel für Spiel',
    items: [
      'Simulieren springt nicht mehr einfach ans Ende: Die Halbserie läuft live durch – jedes Ergebnis, deine Tore, Vorlagen und Noten, dazu Punkte und Ø-Note in Echtzeit.',
      'Tor, Doppelpack, Hattrick und „Mann des Spiels“ werden groß gefeiert, mit Ton und Vibration.',
      'Tempo 1×, 2× oder 4× – oder „Überspringen“. Am Ende: Tabellenplatz, Bilanz und dein Wertungs-Sprung.',
      'Die Ziele deines Trainers (z. B. 21 Tore, Ø-Note 6,9) siehst du jetzt mit Fortschrittsbalken – in der Karriere und nach jeder Halbserie. Dazu Platz, Punkte, Bilanz und Tore deines Vereins.',
      'Vor jeder Halbserie siehst du die nächsten Gegner. Vermögen, Klinik, Look, Kickgram, Ausrüster und Position liegen jetzt als Raster da statt in einer abgeschnittenen Leiste.',
      'Die Live-Simulation lässt sich in den Karriere-Einstellungen abschalten.',
    ],
  },
  {
    id: '2026-11-21-premium-look',
    date: '21.11.2026',
    title: 'Neuer Look: dunkles Premium-Design und ein echtes Hauptmenü',
    items: [
      'Hauptmenü wie bei großen Fußball-Games: deine Karriere groß oben, darunter die Modi Duelle, Shop, Sammlung und Casino – mit Hinweisen, wo gerade etwas wartet.',
      'Tagesziele: Spiel in der Karriere weiter, gewinne 2 Duelle, öffne 1 Pack und spiele 5 Casino-Runden. Jedes Ziel zahlt Coins oder Chips, alle zusammen ein Gold-Pack.',
      'Neue Karten: schlankere Sammelkarten-Form mit Trikot-Bild, auch auf kleinen Karten. Keine Gesichter mehr auf Karten, eigene Bilder füllen jetzt die ganze obere Karte.',
      'Nichts ist mehr zu breit: Sammlung und Startseite passen aufs Handy, auf dem iPad bleibt alles eine übersichtliche Spalte.',
      'Pack öffnen: Rückseiten in Kartenform, die schon vorher leuchten, wenn etwas Seltenes drin ist. Im Team zeigt eine Leiste Wertung, Chemie und Karten auf einen Blick.',
      'Shop wie ein Spiele-Store: große Pack-Kacheln in eigenen Farben. Der dunkle Look ist jetzt Standard – „Hell“ und „Bunt“ gibt es weiter in den Einstellungen.',
    ],
  },
  {
    id: '2026-11-20-sammlung-shop',
    date: '20.11.2026',
    title: 'Sammlung & Shop sind zurück – alles hängt zusammen',
    items: [
      'Shop (neu in der Leiste unten): Packs für Coins, jeden Tag ein Gratis-Pack und das Pack der Woche. Pack öffnen mit Wackeln, Aufreißen und Aufdecken – die beste Karte kommt zuletzt.',
      'Sammlung (im Team): alle Karten des Spiels mit Fortschritt, Filtern und Suche. Doppelte verkaufen bringt Coins, Meilensteine (25, 50, 100 … Karten) geben Coins UND Casino-Chips.',
      'Neu im Spiel? Das Willkommens-Pack schenkt dir eine komplette Start-Elf – direkt aufgestellt, sofort bereit für die Duelle.',
      'Eigene Kartenbilder: Ab VIP Platin im Casino gibst du bis zu 3 deiner Karten ein eigenes Foto (Diamant: 10).',
      'Der Kreislauf: Karriere und Duelle bringen Coins → Packs im Shop → stärkeres Team → höhere Divisionen → mehr Coins. Im Casino tauschst du Coins in Chips und Gewinne zurück in Coins (2:1).',
    ],
  },
  {
    id: '2026-11-19-plinko-fever',
    date: '19.11.2026',
    title: 'Plinko: Fever-Modus',
    items: [
      'Treffer-Serie füllt das Fever-Meter – ab 5 Treffern in Folge bricht das FEVER aus: Regenbogen-Bälle, leuchtendes Brett, Combo-Anzeige.',
      'Funkenregen an jedem Pfosten und Feuerwerk im Fach, Bälle ziehen bunte Schweife hinter sich her.',
      'Große Treffer lassen das Brett aufblitzen, Combo-Zähler poppen mitten im Brett auf.',
    ],
  },
  {
    id: '2026-11-19-casino-party',
    date: '19.11.2026',
    title: 'Casino: mehr Farbe, mehr Party, iPad-fit',
    items: [
      'iPad: Casino und alle Spiele lassen sich jetzt scrollen, Plinko passt im Querformat komplett auf den Bildschirm (Brett links, Steuerung rechts).',
      'Party bei jedem Gewinn: Konfetti in Neonfarben und Farbblitz – je größer der Treffer, desto mehr.',
      'Bunter: Regenbogen-Rahmen um die Spiele, schillerndes Logo, glänzender Jackpot, Pfosten leuchten bei Plinko in allen Farben.',
      'Plinko zeigt jetzt deinen besten Treffer, deinen Top-Gewinn und deine Treffer-Serie.',
    ],
  },
  {
    id: '2026-11-19-plinko-2',
    date: '19.11.2026',
    title: 'Torwand-Plinko 2.0',
    items: [
      'Plinko komplett neu: 8 bis 16 Reihen und vier Risikostufen – mit „Extrem“ und 16 Reihen geht es bis über 10.000×.',
      'Goldbälle: 3 % aller Bälle leuchten golden und zahlen doppelt.',
      'Zeitlupe: Fliegt ein Ball auf einen großen Treffer zu, wird es in den letzten Reihen langsam – mit steigendem Ton.',
      'Pfosten leuchten bei jedem Kontakt, Fächer springen, Gewinne steigen als Zahl auf. Bis zu 40 Bälle gleichzeitig.',
      'Auto-Modus mit 10, 25, 50 oder 100 Bällen, Turbo, Verlauf deiner letzten Treffer und Sitzungs-Statistik mit Gewinnkurve.',
    ],
  },
  {
    id: '2026-11-19-chip-kasse',
    date: '19.11.2026',
    title: 'Chip-Kasse im Casino',
    items: [
      'Keine Chips mehr? Tippe im Casino auf deinen Chip-Stand: In der neuen Chip-Kasse tauschst du deine Spiel-Coins in Chips – große Pakete mit bis zu +30 % Bonus.',
      'Pleite-Hilfe: Unter 100 Chips gibt es alle 3 Stunden 1.000 Gratis-Chips.',
      'Reicht dein Guthaben für einen Einsatz nicht, öffnet sich die Kasse automatisch.',
    ],
  },
  {
    id: '2026-11-19-casino-2',
    date: '19.11.2026',
    title: 'Casino 2.0: Sportwetten & mehr Action',
    items: [
      'Neu: Sportwetten! Jeder Spieltag bringt 10 Spiele aus Bundesliga, Premier League, LaLiga & Co. Tippe Sieg, Remis, Tore oder „Beide treffen“ – einzeln oder als Kombi mit bis zu +50 % Boost.',
      'Live-Konferenz: Alle Spiele laufen gleichzeitig, Tore mit Jubel, deine Tipps leuchten grün oder rot – und mit Cash-out kannst du jederzeit aussteigen.',
      'Wetten auf deine Karriere: Trifft dein Spieler 15+ Mal? Holt er einen Titel? Zum Saisonstart setzen, nach der Saison kassieren.',
      'Mehr Action in allen Spielen: Münzen fliegen auf deinen Kontostand, Bildschirm-Beben bei großen Gewinnen, Slots mit Vorfreude-Walzen, Gewinnlinien und Turbo, Crash mit Sternenflug und Auto-Runden, Minen mit Multiplikator-Leiter, tickende Räder.',
      'Big Wins schaukeln sich hoch: Big → Mega → Epic, während der Betrag hochzählt. Dazu ein Laufband mit deinen letzten großen Gewinnen.',
      'Höher/Tiefer ist raus.',
    ],
  },
  {
    id: '2026-11-18-neon-casino',
    date: '18.11.2026',
    title: 'Das Neon-Casino ist offen',
    items: [
      'Neu im Home-Menü: das Neon-Casino mit eigener Währung (Chips) – du startest mit 1.000 Chips, jeden Tag gibt es einen Bonus, der mit deiner Serie wächst.',
      '8 Spiele: Stadion-Slots mit Freispielen, Elfmeter-Crash, Torwand-Plinko, Elfmeter-Minen, Roulette, Blackjack, Höher/Tiefer mit Spielerkarten und das Glücksrad (täglich gratis).',
      'Progressiver Jackpot: wächst mit jedem Einsatz – wer ihn knackt, bekommt alles plus eine Ikonen-Karte. Dazu Big-, Mega- und Epic-Win-Shows.',
      'VIP-Stufen von Bronze bis Diamant (höhere Einsätze, mehr Tagesbonus), drei Tagesaufgaben und ein Preis-Shop: Karten fürs Haupt-Team, XP für deine Karriere, exklusive Wappen und Farben.',
      'Nur Spielgeld: Chips kann man nicht kaufen. Die Gewinnchancen stehen in jedem Spiel unter dem Info-Knopf.',
    ],
  },
  {
    id: '2026-11-16-skill-universum',
    date: '16.11.2026',
    title: 'Das Skill-Universum',
    items: [
      'Der Fähigkeitenbaum ist jetzt ein ganzes Universum auf einem Bildschirm: In der Mitte dein Spielertyp, vier Richtungen – Torgefahr, Kreativität, Athletik, Mentalität – mit 60 Knoten. Verschieben, zoomen, antippen – kein Runterscrollen mehr.',
      'Mischen erlaubt: Ein Stürmer kann in die Kreativität gehen. Je weiter weg von deiner Heimat-Richtung, desto teurer.',
      'Spielstile mit echten Effekten (max. 3 aktiv): Joker, Finesse-Schuss, Kapitän, Taktgeber, Eisenmann, Turbo, Mauer, Zauberpass.',
      '8 Ultimative ganz außen, die im Spiel wirklich passieren: Hattrick-Jäger, Last-Minute-Held (dreht Spiele in der Nachspielzeit), Spielgestalter, Mr. Finale, Die Wand und mehr.',
      'Meilensteine: Der äußere Bereich jeder Richtung öffnet sich erst durch Erfolge (z. B. 40 Karrieretore) – oder ab Level 25.',
      'Baupläne speichern und laden, kostenlos umbauen einmal pro Saison. Alle bisher verteilten Punkte bekommst du zurück.',
    ],
  },
  {
    id: '2026-11-16-rivals-zurueck',
    date: '16.11.2026',
    title: 'Division Rivals ist zurück',
    items: [
      'Duelle sind wieder Division Rivals: Divisionen 10 bis 1, dann Elite und Champions – mit Aufstieg, Abstieg, Taktik, Scouting und täglicher Saison mit Rängen und Rivals-Karten.',
      'Du wählst selbst: Haupt-Team (alle Karten) oder Karriere-Team (Karriere- und Momente-Karten). Der Gegner richtet sich nach deiner Division – kein Spiel mehr gegen 50er-Teams.',
      'Siege geben deinem aktiven Karriere-Spieler XP (max. 250 pro Tag), die Tagessaison gibt zusätzlich einen XP-Bonus je nach Rang.',
      'Neues Layout: Reiter Spielen / Divisionen / Saison oben, Anpfiff immer an derselben Stelle unten.',
      'Neuer Ladebildschirm im Stadion-Look, und die Startseite zeigt nur noch deine aktuelle Karriere – alle Spielstände findest du unter „Spielstände“.',
    ],
  },
  {
    id: '2026-11-16-neustart',
    date: '16.11.2026',
    title: 'Neustart: Karriere, Team, Duelle, Profil',
    items: [
      'Das Spiel ist jetzt aufgeräumt: Es gibt nur noch vier Bereiche – Karriere, Team, Duelle und Profil. Shop, Packs, Sammlung, SBCs, Pass, Ruhmesweg, Events und Manager-Modus sind raus.',
      'Team: Deine Elf besteht aus den Spielern deiner Karrieren – Auszeichnungen, Saison-Highlights und jede Karriere bringt am Ende ihre Karte mit.',
      'Duelle komplett neu: Mit deinem Karriere-Team spielst du eine Liga-Leiter hoch – von der Kreisliga bis zum Finale gegen die Allstars der Legenden. Jeder Sieg gibt deinem aktiven Karriere-Spieler XP (Level = Fähigkeitspunkte).',
      'Karriere kompakter: Casino, Laster und Geschenke-Ablage sind weg; Vermögen, Klinik, Kickgram, Look, Ausrüster und Position bleiben – in einer kompakten Leiste.',
      'Deine Karrieren bleiben komplett erhalten.',
    ],
  },
  {
    id: '2026-11-15-larp-v2',
    date: '15.11.2026',
    title: 'LARP 2.0: Old Money, Flex & Fit-Check',
    items: [
      'Der Look-Bildschirm ist komplett neu: Fit-Check-Karte mit deinem Outfit, Aura-Zähler und einem Tacho von „Old Money“ über „Verdächtig“ bis „Larp-Alarm“.',
      'Neu: Auftritt der Pause – einmal pro Pause flexen: Alster-Brunch, Sylt-Wochenende, geliehener 911er, Polo mit geliehenem VIP-Bändchen, Yacht in Monaco (Greenscreen) oder die Privatjet-Story. Bringt sofort Follower – Larp-Aktionen aber Verdacht.',
      'Mehr im Schrank: Segelschuhe, Polo mit hochgeklapptem Kragen, Siegelring mit Familienwappen und der Golden Retriever vom Nachbarn.',
      'Am Saisonende kommt der „Fit-Check des Jahres“: Die Nadel pendelt, die Kommentare laden – dann der Stempel: „Old Money bestätigt“ oder „Larp entlarvt“.',
    ],
  },
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
    image: '/news/the-hallway.webp',
    imageAlt: 'Eine Taube späht um die Ecke, im roten Flur steht eine Lampe',
    items: [
      'Ein endloser roter Flur, flackerndes Licht – und irgendwo versteckt sich die Taube. Finde sie, bevor die Lampen dich erreichen.',
      'Zum Start gibt es die Flur-Kiste: Drei Türen, hinter einer sitzt die Taube. Jede falsche Tür lässt die Lampen näher kommen.',
      'Mit dem Code freigeschaltet: Profil-Banner „Der Flur“ und Titel „Taubenfinder“.',
    ],
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
