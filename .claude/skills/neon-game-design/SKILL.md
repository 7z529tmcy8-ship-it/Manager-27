---
name: neon-game-design
description: Design-System und Arbeitsweise für den Look von „Manager Sim“ (React/Vite-Fußballspiel in diesem Repo) – Neon-Stadion-Stil mit Glas, Neon, metallischen Karten, ohne Gesichter. Nutze diesen Skill bei JEDER optischen Änderung am Spiel – auch wenn nur „sieht schlecht aus“, „mach schöner“, „Design“, „Look“, „Farben“, „Karten-Design“, „Pack-Öffnung“, „Hub/Menü hübscher“, „wirkt billig“, „moderner“, „wie FIFA/FC“ oder ein neues Feature mit eigener Oberfläche gemeint ist. Auch für Event-Designs (Halloween, Gala, Winter), neue Kartenarten und neue Bildschirme.
---

# Neon-Stadion – Design-Skill für Manager Sim

Ziel: Das Spiel soll wirken wie ein hochwertiges Mobile-Sammelkartenspiel (Ultimate-Team-Gefühl), nicht wie eine Web-App mit dunklem Hintergrund. Hochwertig entsteht durch **Zurückhaltung, Konsistenz und Hierarchie** – nicht durch mehr Glow.

Lies zuerst `references/tokens.md` (Farben, Schrift, Abstände, Ebenen). Bei Karten zusätzlich `references/cards.md`. Vor der Abgabe immer `references/checklist.md`.

## Harte Grenzen (vom Nutzer festgelegt)
- **Keine Gesichter, keine Personen, keine Porträts** – auch nicht als Emoji (😎 🧑 👨‍👧 💃 …) und nicht auf Karten. Erlaubt: Trikots, Wappen, Silhouetten ohne Gesichtszüge, abstrakte Symbole, Hologramme. Der Avatar-Editor bleibt, wird aber als Silhouette ohne Augen/Mund gerendert (`AvatarFace.tsx`).
- **Struktur, Navigation, Texte und Funktionen bleiben**, wenn nur das Design gefragt ist. Optik-Änderungen gehören in CSS (Ebene `:root[data-theme="arena"]` am Ende von `src/styles.css`) und in kleine Darstellungs-Komponenten – nicht in Spiellogik.
- Keine fremden Marken-Assets (EA, FIFA, Vereinslogos als Bilddatei). Eigene Formen und Symbole.
- Event-Design (Halloween, Gala …) überlagert den Grundlook nur, wenn das Event aktiv ist.

## Vollbild und Hochformat (bei jeder Entwicklung)
- **Für Vollbild bauen:** Das Spiel läuft im Vollbild (ohne Browser-Leisten; als App `display: fullscreen`). Jeder Bildschirm muss bei 390×844 (Handy hochkant, volle Höhe) und 844×390 (quer) ohne Browser-Leisten funktionieren – Screenshots in genau diesen Größen.
- **Sicherheitsabstände:** Oben/unten `env(safe-area-inset-*)` beachten (Notch, Home-Leiste); feste Leisten nie in diese Zonen legen. Höhen mit `dvh`, nicht `vh`.
- **Startmenü, Shop, Profil, Sammlung: hochkant zuerst.** Die Karriere darf fürs Querformat optimiert sein; der Hinweis „Handy drehen“ erscheint nur dort.
- **Startmenü-Reihenfolge:** Profil-Chip (Wappen, Name, Trophäen) · Coins · Vollbild · Einstellungen → nur laufende Events → Karriere fortsetzen → große Knöpfe „Neue Karriere“ und „Shop“ → Pass + Ruhmesweg → kompakte Kacheln → „Mehr“-Liste. Nichts, was kein laufendes Event ist, gehört in die Event-Leiste (Vorverkäufe wie der Polarlicht-Kalender stehen im Shop).

## Warum es bisher „billig“ aussah (nicht wiederholen)
1. **Bunte Emojis als Icons** in der Oberfläche (Kacheln, Tabs, Buttons). Sie haben jeder eine eigene Farbe, Perspektive und Strichstärke – das zerstört jede Premium-Optik. → Oberflächen-Icons sind **einheitliche Linien-Icons (SVG)** in einer Farbe (siehe `references/icons.md`). Emojis nur noch im Fließtext/Story-Inhalt.
2. **Glow überall.** Wenn alles leuchtet, leuchtet nichts. → Pro Bildschirm genau **ein** Element mit starkem Glow (die Hauptaktion oder der Held). Alles andere: feine 1-px-Kanten, keine Außenleuchten.
3. **Alle Kacheln gleich groß und gleich laut.** → Klare Hierarchie: Held-Bereich groß, Hauptaktionen mittel, Nebenfunktionen kompakt (Listen-Zeilen statt Kacheln).
4. **Schrift fiel auf Systemschrift zurück** (Google Fonts blockiert/zu spät geladen). → Display-Schrift selbst hosten (`public/fonts/*.woff2`, `@font-face`, `font-display: swap`) und im Screenshot prüfen, ob sie wirklich greift.
5. **Glas auf Glas auf Glas.** → Glas (Blur) nur für schwebende Ebenen (Kopfleiste, Bottom-Bar, Overlays). Normale Inhalte: undurchsichtige, dunkle Flächen mit leichtem Verlauf – das wirkt satter und ist schneller.
6. **Keine echte Tiefe.** → Zwei-Schatten-System (Kontakt + Umgebung), Licht immer von oben links, metallische Kanten oben heller als unten.

## Arbeitsweise (immer in dieser Reihenfolge)
1. **Ist-Aufnahme:** `node .claude/skills/neon-game-design/scripts/shots.cjs <ausgabe-ordner> vorher` – fotografiert alle Hauptbildschirme bei 390 px (Handy) und 1280 px. Vorher `npx vite build` und `npx vite preview --port 4174` (nur starten, wenn nicht schon läuft – nie per pkill beenden).
2. **Diagnose:** Bilder ansehen und pro Bildschirm drei Punkte notieren: Was ist die Hauptaktion? Was lenkt ab? Was wirkt billig? (Checkliste aus `references/checklist.md`.)
3. **Plan:** Nur Tokens + wenige Komponenten ändern. Erst Tokens (Farben/Abstände/Schrift), dann Komponenten, dann Details. Nie einzelne Bildschirme mit Sonderfarben „flicken“.
4. **Umsetzen:** CSS in der Arena-Ebene; Icons als SVG-Komponente; keine Inline-Farben in TSX.
5. **Nachher-Aufnahme** mit demselben Skript (`nachher`), Bilder vorher/nachher nebeneinander ansehen.
6. **Selbstkritik-Runde:** Checkliste durchgehen. Mindestens **eine** Verbesserungsrunde nach dem ersten Nachher-Bild – das erste Ergebnis ist fast nie gut genug.
7. Tests (`npx vitest run`), Typecheck (`npx tsc --noEmit`), Build. Update-Banner-Eintrag in `src/data/updates.ts` (außer der Nutzer sagt „still“).
8. Abgabe: kurz erklären, **warum** – in einfacher Sprache, mit 1–2 Bildern, und **eine** Rückfrage oder Variante anbieten.

## Komponenten-Rezepte (Kurzfassung – Details in references/)
- **Bildschirm-Aufbau:** Kopfleiste (Glas, sticky) → Titel (Display-Schrift, groß, links) → Held-Bereich → Hauptaktionen → Nebenfunktionen. 16 px Seitenrand am Handy, 24 px Abstand zwischen Blöcken.
- **Kachel (Hauptaktion):** dunkle Fläche `--panel`, Radius 20, 1-px-Kante `--line`, Icon 24 px Linien-Icon in `--neon-c` auf 40-px-Quadrat mit 12er-Radius und `--neon-c` 12 % Fläche. Titel Display 18–20 px, Untertitel 13 px `--text-2`. Hover/Tap: Kante wird `--neon-c`, kein Größensprung über 2 px.
- **Primär-Button:** voller Neon-Verlauf (Grün → Cyan), dunkler Text, 48 px hoch, Radius 14. Pro Bildschirm höchstens **einer** sichtbar „laut“.
- **Sekundär-Button:** transparent, 1-px-Kante `--line-strong`, weißer Text.
- **Zahlen** (Coins, Wertung, Punkte): Display-Schrift, `tabular-nums`, nie kleiner als 16 px.
- **Badges/Chips:** Pille, 28 px hoch, aktiv = gefüllt mit Neon 16 % + Neon-Kante.

## Was gut ist und bleiben soll
- Sonderkarten-System (Muster + Emblem + Holo-Schimmer je Kartenart) – siehe `references/cards.md`.
- Trikot-Symbol statt Porträt auf Karten (`Jersey` in `UtCard.tsx`).
- Event-Overlays nur im Event-Zeitraum.
