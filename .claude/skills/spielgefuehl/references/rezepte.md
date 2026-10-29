# Rezepte für befriedigende Momente

## Knopf drücken (jede Aktion)
- Sofort: `transform: scale(.97)` bei `:active`, `transition: transform .12s`.
- Ton `play('tap')`, bei Kauf `play('spend')`. Kein Knopf ohne jede Reaktion.
- Gesperrte Knöpfe sagen, *warum* („Dir fehlen 4.000 Coins“), statt einfach grau zu sein.

## Halten zum Aufladen (Drop, große Entscheidungen)
- Ring füllt sich mit dem Halten (SVG-Kreis, `stroke-dashoffset`), Ton steigt (`playCharge(ms)`), leichtes Beben, das mit der Ladung stärker wird.
- Zu kurz losgelassen = nichts passiert (Mindestladung ~35 %), damit es sich verdient anfühlt.
- Vibration in kurzen Stößen während des Haltens, kräftiger beim Treffer.
- Hintergrund beim Aufladen anhalten – Fokus auf das Objekt.

## Enthüllung in Stufen (Seltenheit, Walkout)
- Jede Stufe hat eigene Farbe, eigenen Ton (höher) und einen kurzen Blitz.
- Hinweis-Text sagt, wie weit es ist („Noch zwei Treffer“, „Gleich zerspringt er!“).
- Vorher andeuten, nicht verraten: Licht der nächsten Stufe durch Risse.
- Am Ende: Objekt zerspringt/platzt, Belohnung steigt von unten ins Bild (`translateY` + `scale`), Name groß.

## Belohnung, die ankommt
- Karten groß zeigen (UtCard md/lg), „Neu in deiner Sammlung!“ oder „Doppelt“.
- Coins: Zahl zählt hoch (ca. 0,6 s, `tabular-nums`), oben im Zähler landen.
- Spuren lassen: Scherben bleiben liegen, Haken am Pass-Feld, Fortschrittsbalken springt sichtbar.
- Mehrfach-Öffnen: „Nächster Drop (3)“ direkt im Ergebnis – kein Zurück-Navigieren.

## Spannung ohne Betrug
- Fake-outs (flackert, fällt zurück) nur, wenn die Chancen unverändert und sichtbar bleiben.
- Große Gewinne seltener, aber spürbar größer inszenieren (Legendär: mehr Funken, längeres Rumpeln).

## Leistung (immer mitdenken)
- Animiere `transform` und `opacity`. Kein animierter `filter`, keine `mask` auf großen Flächen, kein `left/top`.
- Leuchten: fester `radial-gradient`-Lichthof hinter dem Objekt statt `drop-shadow`.
- Partikel: höchstens ~25 gleichzeitig, `will-change: transform`, nach dem Flug stehen lassen (keine Endlos-Animation).
- Bereiche außerhalb des Bildes: `content-visibility: auto` + `contain-intrinsic-size`.
- `.lite`, `.paused` und `prefers-reduced-motion` berücksichtigen.
