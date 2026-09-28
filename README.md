# FC Karriere-Simulator

Private Web-App, um die Karriere eines **einzelnen Spielers** zu simulieren – inspiriert vom
Spielerkarriere-Modus aus EA SPORTS FC. Keine Einzelspiele im Minutentakt, sondern
**ganze Saisons auf Knopfdruck**, danach das Transferfenster mit Angeboten.

## Features

- **Eigener Spieler** (Name, Nation, Position, Alter, Talentstufe, Startverein) oder **echter Spieler** als Start
  (z. B. Lennart Karl, Musiala, Yamal, Haaland – Werte sind eigene Schätzungen, keine EA-Ratings)
- **11 Ligen, Stand 2025/26:** Bundesliga, 2. Bundesliga, 3. Liga, Regionalliga Nord, Premier League,
  Championship, LaLiga, Serie A, Ligue 1, Liga Portugal, Eredivisie – mit Auf- und Abstieg und Europapokal-Plätzen.
  Zweite Mannschaften steigen höchstens in die 3. Liga auf. Vereinfachung: Da nur die Regionalliga Nord enthalten ist,
  tauscht sie genau einen Platz mit der 3. Liga
- **Saison-Simulation:** Alle Ligen werden komplett durchgespielt, dazu nationaler Pokal und
  Champions/Europa/Conference League. Für den Spieler: Einsätze, Minuten, Tore, Vorlagen, Noten, Verletzungen
- **Hinrunde & Rückrunde mit Wintertransferfenster:** Nach der Hinrunde gibt es eine Zwischenbilanz und
  Winter-Angebote (Leihe bis Saisonende, Transfer). Wer wechselt, spielt die Rückrunde beim neuen Verein –
  Pokal und Europapokal laufen dann ohne ihn weiter. „Ganze Saison“ überspringt die Winterpause
- **Realistische Entwicklung** (nach Hin- und Rückrunde, mit Erklärung im Saisonrückblick):
  - junge Spieler wachsen Richtung (verborgenem) Potenzial – je jünger, desto schneller
  - Spielzeit und Leistung (Note, Torbeteiligungen) beschleunigen die Entwicklung; wer auf der Bank sitzt,
    stagniert und kann sogar Potenzial verlieren
  - über das Potenzial hinaus wächst nur, wer besser spielt als für seine Stärke erwartet
  - eine starke Saison mit viel Spielzeit führt bis 31 nie zu einem Minus (außer durch Ereignisse)
  - ab 30 setzt der Abbau ein (Torhüter später); starke Leistungen und Spielpraxis bremsen ihn deutlich
- **Ereignisse:** Durchbruch, Mentor, Spätzünder, Extraschichten, Trainerwechsel, Zoff mit dem Trainer,
  Formkrise, Eingewöhnungsprobleme, schwere Verletzungen … – sie verändern Gesamtwertung, Potenzial oder
  das Trainervertrauen (und damit die Einsatzzeit)
- **Transferfenster nach jeder Saison:** Transfers, Leihen, Vertragsverlängerungen, ablösefreie Wechsel,
  „Auf Transferliste setzen“, „Um Leihe bitten“, Karriereende
- **Karriere-Übersicht:** Stationen, Verlauf der Gesamtwertung, Trophäenschrank, Auszeichnungen
  (Torschützenkönig, Golden Boy, Ballon d’Or …), Länderspiele inkl. WM/EM
- **Live-Finals:** Pokal-, Europapokal- und Turnierfinals (WM/EM/Copa) laufen als Live-Ticker. In deinen Szenen
  entscheidest du selbst (abziehen, querlegen, dribbeln / grätschen, stellen / rauslaufen, Elfmeter-Ecke) – das
  beeinflusst Ergebnis, Tore und Note. „Ganze Saison“ spielt Finals automatisch
- **Entscheidungen:** Positionswechsel, angeschlagen ins Topspiel, Trainingslager, Interview zu Wechselgerüchten,
  Elfmeterschütze, Mannschaftsabend, Mentor – jede Wahl hat Folgen für Wertung, Vertrauen oder Verletzungen
- **Rivale:** ein Talent auf deiner Position macht parallel Karriere (eigene Entwicklung und Wechsel); jede Saison
  gibt es ein Duell, und ein stärkerer Rivale gleicher Nation kann dir den Platz in der Nationalelf wegnehmen
- **Kapitän & Vereinslegende:** nach einigen Jahren als Stammspieler Kapitänsbinde (mehr Einsätze), nach vielen
  Jahren oder Titeln Legendenstatus – beim Karriereende wird die Rückennummer nicht mehr vergeben
- **Schlagzeilen:** Presse-Feed zu deinen Leistungen, Titeln, Transfers, dem Rivalen und den Ligen
- **Hall of Fame:** Rangliste aller Karrieren nach Legendenpunkten (sortierbar), Rekorde über alle Karrieren
  und Vergleich von bis zu drei Karrieren inklusive Entwicklungskurven
- Über 80 echte Spieler als Startvorlage (u. a. Hayate Matsuda, Kubo, Mitoma, Musiala, Wirtz, Yamal)
- **Transferhistorie:** alle Wechsel und Leihen mit Ablöse, Gesamtsumme der Ablösen (auch am Karriereende)
- Spielstände werden im Browser gespeichert (localStorage)

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
