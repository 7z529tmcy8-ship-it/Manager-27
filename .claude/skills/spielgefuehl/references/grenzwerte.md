# Was gemessen wird – und warum diese Grenzen

| Messwert | Grenze | Warum |
|---|---|---|
| **Bild p95** (Zeit pro Bild, 95 % der Bilder schneller) | ≤ 34 ms, mind. 1,5 × Grundtempo des Testrechners; `--slow`: 50 ms | Unter ~30 Bildern/s nimmt man Bewegung als ruckelig wahr. 60 Bilder/s (16,7 ms) ist das Ziel. |
| **Ruckler-Anteil** (Bilder > 50 ms bzw. > 2 × Grundtempo) | ≤ 8 % | Einzelne lange Bilder fallen als „Hakeln“ auf, auch wenn der Durchschnitt gut ist. |
| **Längster Hänger** (Long Task) | ≤ 200 ms (`--slow`: 400) | So lange reagiert das Spiel auf nichts. Ab ~100 ms spürt man es, ab 200 ms wirkt es kaputt. |
| **Tippen p95** (Antippen → erste Änderung im Bild) | ≤ 120 ms (`--slow`: 250) | Rückmeldung unter 100 ms fühlt sich „sofort“ an. Hinweis: Reine `:active`-CSS-Rückmeldung ändert das DOM nicht und wird hier nicht gezählt. |
| **Layout-Sprünge** (CLS) | ≤ 0,1 (Hinweis) | Springende Inhalte lassen Spieler danebentippen. |
| **Tipp-Flächen** | ≥ 40 px (Hinweis) | Kleinere Knöpfe sind am Handy schwer zu treffen. |
| **Tote Knöpfe** (ohne Übergang/Animation) | Hinweis | Ein Knopf ohne jede Reaktion beim Drücken fühlt sich „tot“ an. |
| **Weniger Bewegung** | keine Endlos-Animationen (Hinweis) | Menschen mit Bewegungsempfindlichkeit; außerdem spart es Akku. |

## Bekannte Grenzen der Messung
- Der Testbrowser läuft ohne Grafikkarte: Er ist bei großen Effekten langsamer als ein echtes Handy. Deshalb die Kalibrierung – und: Wenn es im Test flüssig ist, ist es auf dem Handy erst recht flüssig.
- Vibration und Ton werden nicht gemessen – die prüft man selbst auf dem Handy.
- Die Abläufe decken die wichtigsten Teile ab, nicht jeden Knopf. Neue Teile in `FLOWS` ergänzen.

## Typische Ursachen und Abhilfen (aus diesem Projekt)
| Symptom | Ursache | Abhilfe |
|---|---|---|
| Erstes Öffnen des Stores hängt ~270 ms | Viele Karten mit Endlos-Animationen außerhalb des Bildes | `content-visibility: auto` auf Store-Gruppen → ~55 ms |
| Drop-Öffnen ruckelt (20–30 Bilder/s) | Rotierende Strahlen mit `mask`, Kegel mit `blur`, Edelstein mit doppeltem `drop-shadow`, Scherben über `left/top` | Strahlen ohne Maske, Kegel mit weichem Verlauf, fester Lichthof, Scherben über `transform` mit Container-Einheiten → ~30–60 Bilder/s |
| Aufladen ruckelt | `filter: brightness()` pro Bild verändert | Leuchten als Überlagerung mit `opacity` |
