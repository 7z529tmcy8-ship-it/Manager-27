# Icons – einheitliche Linien-Icons statt Emojis

Warum: Emojis bringen eigene Farben, Stile und Perspektiven mit. Ein Premium-Look braucht ein **einziges** Icon-System.

## Regeln
- 24×24 `viewBox`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.8"`, runde Enden/Ecken.
- Farbe kommt aus CSS (`color: var(--neon-c)`), nie im SVG fest.
- Eine Komponente `src/components/Icon.tsx` mit `name`-Prop und einer Pfad-Tabelle. Neue Icons dort ergänzen.
- Emojis bleiben erlaubt in Story-Texten, Nachrichten, Event-Popups und im Update-Banner (Inhalt) – aber nicht als Navigations- oder Kachel-Icon.
- Keine Personen-Icons (kein „user“-Kopf) – für Spieler ein Trikot, für Freunde zwei verbundene Punkte, für Familie ein Haus.

## Vorschlag Pfade (Hub)
| Bereich | Icon-Idee |
|---|---|
| Neue Karriere | Fußball (Kreis + Fünfeck-Naht) |
| Store | Pack/Kiste mit Blitz |
| Sammlung | gestapelte Karten |
| Mein Team | Taktik-Brett (Rechteck + 3 Punkte) |
| Duelle | zwei gekreuzte Linien/Blitze |
| SBC | Puzzle-Teil |
| Tauschbörse | zwei Pfeile im Kreis |
| Spielstände | Ordner |
| Erfolge | Pokal |
| Hall of Fame | Säulen |
| Sichern & Laden | Wolke mit Pfeil |
