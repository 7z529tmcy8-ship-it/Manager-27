# FC Karriere-Simulator

Private Web-App, um die Karriere eines **einzelnen Spielers** zu simulieren – inspiriert vom
Spielerkarriere-Modus aus EA SPORTS FC. Keine Einzelspiele im Minutentakt, sondern
**ganze Saisons auf Knopfdruck**, danach das Transferfenster mit Angeboten.

## Features

- **Eigener Spieler** (Name, Nation, Position, Alter, Talentstufe, Startverein) oder **echter Spieler** als Start
  (z. B. Lennart Karl, Musiala, Yamal, Haaland – Werte sind eigene Schätzungen, keine EA-Ratings)
- **9 Ligen, Stand 2025/26:** Bundesliga, 2. Bundesliga, Premier League, Championship, LaLiga, Serie A,
  Ligue 1, Liga Portugal, Eredivisie – mit Auf- und Abstieg und Europapokal-Plätzen
- **Saison-Simulation:** Alle Ligen werden komplett durchgespielt, dazu nationaler Pokal und
  Champions/Europa/Conference League. Für den Spieler: Einsätze, Minuten, Tore, Vorlagen, Noten, Verletzungen
- **Hinrunde & Rückrunde mit Wintertransferfenster:** Nach der Hinrunde gibt es eine Zwischenbilanz und
  Winter-Angebote (Leihe bis Saisonende, Transfer). Wer wechselt, spielt die Rückrunde beim neuen Verein –
  Pokal und Europapokal laufen dann ohne ihn weiter. „Ganze Saison“ überspringt die Winterpause
- **Realistische Entwicklung:**
  - junge Spieler wachsen Richtung (verborgenem) Potenzial – je jünger, desto schneller
  - Spielzeit und Leistung (Ø-Note) beschleunigen die Entwicklung; wer auf der Bank sitzt, stagniert
    und kann sogar Potenzial verlieren
  - Training bei Top-Vereinen hilft etwas mehr
  - ab ca. 29 Jahren setzt der Abbau ein (Torhüter später), das Tempo sinkt zuerst
- **Transferfenster nach jeder Saison:** Transfers, Leihen, Vertragsverlängerungen, ablösefreie Wechsel,
  „Auf Transferliste setzen“, „Um Leihe bitten“, Karriereende
- **Karriere-Übersicht:** Stationen, Verlauf der Gesamtwertung, Trophäenschrank, Auszeichnungen
  (Torschützenkönig, Golden Boy, Ballon d’Or …), Länderspiele inkl. WM/EM
- **Hall of Fame:** Rangliste aller Karrieren nach Legendenpunkten (sortierbar), Rekorde über alle Karrieren
  und Vergleich von bis zu drei Karrieren inklusive Entwicklungskurven
- Über 80 echte Spieler als Startvorlage (u. a. Hayate Matsuda, Kubo, Mitoma, Musiala, Wirtz, Yamal)
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
| `src/game/development.ts` | Entwicklung nach der Saison (Alter, Spielzeit, Leistung, Potenzial) |
| `src/game/offers.ts` | Angebote im Transferfenster |
| `src/game/career.ts` | Ablauf: Hinrunde → Winterfenster → Rückrunde → Sommerfenster → nächste Saison |
| `src/game/legacy.ts` | Hall of Fame: Karriere-Bilanz, Legendenpunkte, Rekorde |
| `src/components/` | Oberfläche (React) |

## Hinweis

Private Fan-Seite ohne Verbindung zu EA SPORTS. Alle Stärke- und Spielerwerte sind eigene Schätzungen.
