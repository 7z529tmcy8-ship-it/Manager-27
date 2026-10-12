# Karten-Galerie (alle Kartenarten nebeneinander)

1. Temporär im Projekt-Root anlegen (nicht committen!):
   - `gallery-tmp.html` mit `<div id="root">` und `<script type="module" src="/gallery-tmp.tsx">`
   - `gallery-tmp.tsx`: rendert `UtCard` für jede Variante (`silver, gold, gold-rare, icon, cult, talent, debut, moment, present, halloween, gala, totw, tots, potm, record, champion, ballondor, worldcup, ucl, poty, topscorer, goldenboy`) mit `size="md"` und `shine`.
2. `npx vite --port 5174` starten und `http://localhost:5174/gallery-tmp.html` mit Playwright fotografieren (1100×900, fullPage).
3. Danach beide Dateien löschen.
