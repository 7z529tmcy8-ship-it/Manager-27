# FC Karriere-Simulator

Private Web-App, um die Karriere eines **einzelnen Spielers** zu simulieren – inspiriert vom
Spielerkarriere-Modus aus EA SPORTS FC. Keine Einzelspiele im Minutentakt, sondern
**ganze Saisons auf Knopfdruck**, danach das Transferfenster mit Angeboten.

## Features

- **Einfacher Spielablauf:** Ein Knopf simuliert immer bis zur nächsten Pause – erst bis zur Winterpause, dann bis
  Saisonende (Pokal- und Europapokal-Finals laufen automatisch). Am Ende jeder Saison gibt es **drei Möglichkeiten**
  als Karten, z. B. Wechsel, Leihe, Bleiben/Verlängern (bei auslaufendem Vertrag weitere Angebote oder Karriereende)
- **Winterpause:** optional ein **Wintertransfer** oder eine **Winter-Leihe** (Rückrunde beim neuen Verein) oder ein
  **Trainingslager** (Chance auf +1 Wertung, je mehr Spielpraxis, desto besser – mit kleinem Verletzungsrisiko)
- **Karriere als Zeitleiste:** Kopf mit Wertung, Nation, Position, Alter, Verein und Marktwert; darunter eine Zeile
  pro Saison (Alter, Verein, Wertung als Farb-Pille – Weltklasse hellblau, Spiele, Tore, Vorlagen, Titel als Symbole).
  Antippen zeigt Details (Liga, Platz, Ø-Note, Entwicklung, Titel, Ereignisse). Dazu Nationalmannschaft und Gesamtwerte
- **Eigener Spieler** (Name, Nation, Position, Alter, Talent, Startverein), **echter Spieler**, **Legenden** mit
  Charakter oder **Zweite Chance** für gescheiterte Talente
- **12 Ligen, Stand 2025/26:** Bundesliga bis Regionalliga Nord und **Oberliga Niedersachsen** (5. Liga, die 16
  echten Teilnehmer 2025/26, zwei Auf-/Abstiegsplätze mit der Regionalliga Nord), Premier League, Championship, LaLiga, Serie A,
  Ligue 1, Liga Portugal, Eredivisie – komplett simuliert inkl. Pokal, Europapokal, Auf- und Abstieg
- **Realistische Entwicklung** nach Alter, Spielzeit, Leistung und Vereinsniveau, dazu zufällige Ereignisse
- **Arena-Design & Hub:** dunkles, leuchtendes Design (in den Einstellungen umschaltbar) und ein Hauptmenü aus Kacheln:
  aktuelle Spielerkarte, Neue Karriere, Store, Sammlung, Spielstände, Erfolge, Hall of Fame. Eigene Designs – keine
  Logos, Namen oder Kartendesigns von EA
- **Coins, Packs & Sammlung:** Coins nach jeder Saison; 10 Packs: Standard, Gold, Premium, Ikonen, Wundertüte
  (1 völlig zufällige Karte), Deutschland, Bundesliga, Wunderkind (bis 21 Jahre), Weltstar (88+) und GOAT (Ikone 94+
  garantiert), dazu ein Gratis-Pack. Über 150 Karten: echte Spieler (u. a. Messi, Ronaldo, Dembélé, Salah), Ikonen wie
  Pelé, Maradona, Cruyff, Beckenbauer und gescheiterte Talente – mit animiertem „Walkout“ für seltene Karten; Sammlung mit Filtern und Schnellverkauf von Doppelten
- **Kartendesign:** eigene Kartenform mit Flagge, Monogramm, sechs Werten (z. B. TEM/SCH/PAS/DRI/DEF/PHY), Glanzeffekt
  und Leuchten bei seltenen Karten; Antippen öffnet die Detailansicht (Werte, Anzahl, Einzelverkauf)
- **Mein Team:** aus der Sammlung eine Elf im 4-3-3 aufstellen (Auto-Aufstellung oder per Hand) – mit Teamwertung und
  Chemie (gleiche Nation, Liga, Verein; falsche Position = keine Chemie). Damit **Duelle** gegen 10 immer stärkere
  Gegner spielen (Live-Ticker, Coins als Belohnung) und **Tauschaufgaben** erledigen (Karten abgeben → Pack)
- **Sonderkarten:** Team der Saison, Spieler des Monats, Rekordjäger, Titelheld – nach starken Saisons
- **Familie:** Ab 22 kommt einmal pro Karriere eine Einladung zur After-Party – wer mitgeht, wird Vater. Für das Kind
  legt man Erziehungsregeln fest (Verein, Extra-Training, Schule, Zocken, Ernährung, Freunde, Ausgehen) – einmal
  eingestellt, wirken sie jedes Jahr automatisch auf Fitness, Technik, Disziplin, Schule, Freunde und Zufriedenheit. Mit 18 kann das Kind Profi werden und
  verdient dann jedes Jahr Coins.
- **Vermögen:** Immobilien (Miete, schwankender Wert) und Anteile an Fußballklubs (Dividenden, Preis folgt der
  Klubstärke, bis 49 %) – alles in Coins, Einnahmen fließen nach jeder Saison in den Club. Als Anteilseigner kann man
  zusätzlich Geld in einen Klub stecken; das stärkt ihn still und zufällig ein wenig (begrenzt, ab dem nächsten Saisonende).
- **Große Momente:** Animationen für Torschützenkönig, Titel, Ballon d’Or, Auszeichnungen, Vereinswechsel und drastische
  Wertungssprünge nach oben (Durchbruch) wie nach unten (Formkrise).
- **Erfolge & Hall of Fame:** Karriereziele mit Fortschritt, Rangliste aller Karrieren
- **Einstellungen:** Schwierigkeit (Leicht/Normal/Schwer), Design, Animationen, Passwort-Sperre
- **Passwort-Sperre:** `123` öffnet das Spiel (gilt, solange der Tab offen ist). Der Geheimcode `Larp` öffnet den
  Rapper-Karriere-Simulator „Homestudio Hustle“ (reines HTML/CSS/JS in `public/rapper/`, läuft auch allein). Beides ist nur eine
  Sperre im Browser – wer den Quellcode liest, sieht Passwort und Code

## Lokal starten

```bash
npm install
npm run dev     # Entwicklungsserver auf http://localhost:5173
npm test        # Tests der Simulation
npm run build   # Produktions-Build nach dist/
```

## Online stellen (GitHub Pages)

Der Workflow `.github/workflows/deploy.yml` baut die Seite bei jedem Push auf `main`.
Einmalig in GitHub unter **Settings → Pages → Source: „GitHub Actions“** einstellen.

## Aufbau

| Datei | Inhalt |
|---|---|
| `src/data/leagues.ts` | Ligen und Vereine inkl. Teamstärke |
| `src/data/players.ts` | Echte Spieler als Startvorlage, Nationen, Positionen |
| `src/game/season.ts` | Saison-Simulation (Poisson-Modell für Tore, Einsätze, Noten, Pokal, Europapokal) |
| `src/game/development.ts` | Entwicklung (Alter, Spielzeit, Leistung absolut und im Vergleich zur Erwartung, Potenzial) |
| `src/game/events.ts` | Zufällige Ereignisse und Trainervertrauen |
| `src/game/offers.ts` | Angebote im Transferfenster |
| `src/game/career.ts` | Ablauf: Hinrunde → Winterfenster → Rückrunde → Sommerfenster → nächste Saison |
| `src/game/legacy.ts` | Hall of Fame: Karriere-Bilanz, Legendenpunkte, Rekorde |
| `src/components/` | Oberfläche (React) |

## Hinweis

Private Fan-Seite ohne Verbindung zu EA SPORTS. Alle Stärke- und Spielerwerte sind eigene Schätzungen.
