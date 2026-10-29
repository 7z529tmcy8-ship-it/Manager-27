---
name: spielgefuehl
description: Spielgefühl („Game Feel“) für Manager Sim – sorgt dafür, dass sich jede Aktion befriedigend, flüssig und schnell anfühlt, und prüft das selbst mit einem automatischen Browser-Test (Ruckler, Hänger, träges Antippen, Layout-Sprünge, tote Knöpfe). Nutze diesen Skill bei JEDER Änderung an Gameplay, Interaktionen, Belohnungen oder Animationen – auch wenn nur „fühlt sich langweilig/billig/ruckelig an“, „mehr satisfying“, „flüssiger“, „geiler“, „Öffnen/Pack/Drop/Belohnung“, „Animation“, „lahm“, „hängt“, „laggt“ oder ein neues Feature mit Knöpfen, Belohnungen oder Übergängen gemeint ist. Ergänzt den Design-Skill neon-game-design (Optik) um das Gefühl beim Spielen.
---

# Spielgefühl – Manager Sim

Ziel: Jede Aktion fühlt sich an wie ein gutes Mobile-Game – **sofortige Rückmeldung, spürbare Wirkung, eine Belohnung, die ankommt**, und dabei immer flüssig. Gutes Spielgefühl entsteht aus Timing und Rückmeldung, nicht aus „mehr Effekten“. Zu viele Effekte machen es langsam – und langsam fühlt sich immer billig an.

Lies vor der Arbeit `references/rezepte.md` (wie man Momente baut) und `references/grenzwerte.md` (was gemessen wird und warum). Vor der Abgabe `references/checklist.md`.

## Die vier Schichten jeder Aktion
1. **Antizipation** – vor der Wirkung: Aufladen, Beben, Zögern, Licht durch Risse. Baut Spannung auf (Drop halten, Pack schütteln).
2. **Aktion** – das Antippen selbst: innerhalb von 100 ms sichtbar (Knopf drückt sich ein, Ring startet, Ton).
3. **Wirkung** – der Moment: Blitz, Sprung, Zerspringen, Zahl knallt ins Bild. Genau **ein** großer Moment pro Aktion.
4. **Belohnung** – was bleibt: Karte groß zeigen, Coins hochzählen, Scherben liegen lassen, „Neu!“-Hinweis. Der Spieler soll sehen, *was* er bekommen hat und *wohin* es geht.

Fehlt eine Schicht, fühlt es sich „tot“ an (keine Aktion-Rückmeldung) oder „egal“ (keine Belohnung). Ist eine Schicht zu lang, wird es nervig – deshalb: **alles Lange ist überspringbar**.

## Harte Regeln
- **Flüssig vor schön.** Ein Effekt, der die Prüfung zum Ruckeln bringt, wird vereinfacht – nicht die Grenze gelockert. Teure Mittel auf großen, bewegten Flächen vermeiden: `filter` (blur, drop-shadow, brightness) animieren, `mask`, riesige rotierende Ebenen, Animation von `left/top/width/height`. Stattdessen: `transform` und `opacity` animieren, Leuchten als fester Lichthof (radial-gradient) statt Filter, `will-change: transform` nur bei wirklich bewegten Ebenen.
- **Unsichtbares nicht rechnen:** Lange Listen und Bereiche unterhalb des Bildschirms bekommen `content-visibility: auto` (Store-Gruppen, Ruhmesweg-Stufen sind Beispiele). Endlos-Animationen außerhalb des Bildes kosten sonst trotzdem.
- **Während der Spieler sich konzentriert, wird es ruhig:** z. B. stehen beim Aufladen eines Drops Hintergrund-Strahlen still – das wirkt stärker *und* spart Leistung.
- **Rückmeldung in ≤ 100 ms**, Bildschirmwechsel 180–320 ms, Belohnungs-Enthüllung 0,6–1,5 s (überspringbar), nichts blockiert länger als 2 s ohne sichtbaren Fortschritt.
- **Barrierefrei:** `prefers-reduced-motion` und die Klasse `.lite` (schwache Geräte) schalten Endlos- und Großanimationen ab; Tastatur muss funktionieren (z. B. Leertaste halten = gedrückt halten).
- **Ehrlich:** Effekte ändern nie die Chancen. Fake-outs nur als Spannung, Chancen bleiben sichtbar.
- Keine Gesichter/Personen, keine fremden Marken-Assets (siehe neon-game-design).

## Arbeitsweise (immer in dieser Reihenfolge)
1. **Vorher messen:** `npx vite build`, Vorschau starten falls nicht läuft (`(curl -s -o /dev/null localhost:4174 || (nohup npx vite preview --port 4174 > /dev/null 2>&1 &))` – nie per pkill beenden), dann
   `node .claude/skills/spielgefuehl/scripts/feel-audit.cjs <scratchpad>/feel-vorher`
   Nur einzelne Abläufe: `--only=drop,store`. Schwaches Handy: `--slow`.
2. **Diagnose:** Für die betroffene Aktion die vier Schichten durchgehen – welche fehlt oder ist zu lang? Bei Rucklern die Ursache isolieren (Effekte einzeln per eingefügtem CSS abschalten und neu messen), nicht raten.
3. **Umsetzen** nach `references/rezepte.md`. Logik in `src/game/*` (mit Test), Darstellung in Komponenten + CSS.
4. **Nachher messen** mit demselben Befehl (`feel-nachher`) und vergleichen. Ergebnis muss **BESTANDEN** sein (Exit-Code 0). Exit-Code 2 heißt: Messung ungültig – erst den Selbsttest reparieren.
5. **Selbstkritik:** `references/checklist.md` durchgehen, Screenshots des Moments ansehen (Antizipation, Wirkung, Belohnung je ein Bild). Mindestens eine Verbesserungsrunde.
6. `npx tsc --noEmit -p .`, `npx vitest run`, `npx vite build`; Update-Notiz in `src/data/updates.ts` (außer „still“).
7. Abgabe: in einfacher Sprache erklären, was sich jetzt besser anfühlt und warum, mit Messwerten vorher/nachher und 1–3 Bildern.

## Das Prüf-Skript prüft sich selbst
- **Selbsttest:** Bevor gemessen wird, laufen die Messwerkzeuge an einer Test-Animation mit Antippen. Erkennen sie keine Bilder oder kein Antippen, bricht das Skript mit Exit-Code 2 ab – es meldet nie „alles gut“, wenn es gar nicht messen konnte.
- **Kalibrierung:** Eine ganz einfache Animation zeigt das Grundtempo des Testrechners. Ist er langsam (Testbrowser ohne Grafikkarte), werden Ruckler relativ dazu bewertet.
- **Zweiter Versuch:** Ruckelt ein Ablauf, wird er erneut gemessen; erst wenn er wieder ruckelt, ist es ein Fehler.
- **Neue Spielteile aufnehmen:** Wer einen neuen Bildschirm oder eine neue Belohnung baut, ergänzt in `scripts/feel-audit.cjs` unter `FLOWS` einen Ablauf (ein paar Klicks + Wartezeiten). So wird er ab dann immer mitgeprüft.

## Was es schon gibt (wiederverwenden)
- Ton: `play(id)` und `playCharge(ms)` in `src/sound.ts` (Aufladeton, Pack-Sounds, Walkout).
- Vibration: `navigator.vibrate` immer in try/catch (iPhones meist ohne).
- Drop-Öffnen (`DropOpener.tsx`): Halten → Risse → Zerspringen → Scherben bleiben liegen. Gutes Beispiel für alle vier Schichten.
- Pack-Öffnung (`PackOpening` in `Store.tsx`) mit Walkout für Topkarten, überspringbar.
- Bildschirm-Übergänge: `.screen-in` in `App.tsx`; Klassen `.lite` und `.paused` (Tab im Hintergrund) am App-Container.
