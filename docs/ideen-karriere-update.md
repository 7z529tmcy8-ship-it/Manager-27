# Großes Karriere-Update – Ideen-Pakete

Stand: 24.11.2026 · Fokus: **Spielerkarriere** (Casino bleibt als Nebenbereich mit Plinko und Straßen-Sprint)

## Ausgangslage (was es schon gibt)

Die Karriere hat schon sehr viel: Saison in Hin- und Rückrunde, Live-Simulation, Topspiele und Finals
mit eigenen Entscheidungen, Saisonziele, Torjäger-Rennen, Transferfenster mit Verhandlung, NLZ und
U-Nationalteams, WM/EM, Golden Boy, Fähigkeitenbaum, einzelne Attribute, Kapitänsamt, Vertrauen,
Verletzungen, Presse (45 Fragen), Entscheidungen (53), Ausrüster, Kickgram, Look/LARP,
Abseits-Aktionen, Klinik, Vermögen.

**Ehrliche Einschätzung, wo es hakt:**

1. **Der Kern ist zu kurz.** Eine Saison sind im Grunde zwei Klicks („bis zur Winterpause“, „bis
   Saisonende“) plus Transferfenster. Zwischen den Klicks passiert für den Spieler wenig Spürbares.
2. **Viele Systeme hängen nebeneinander.** Leben-Tab, Klinik, Look, Kickgram, Vermögen usw. wirken
   wie eigene Mini-Spiele und nicht wie Teil der Fußballkarriere.
3. **Wichtige Werte sind unsichtbar.** Vertrauen des Trainers, Form und Stammplatz-Chancen existieren
   im Code, der Spieler sieht sie aber kaum – darum fühlen sich Entscheidungen zufällig an.
4. **Es fehlen Ziele für die nächsten 10 Minuten.** Es gibt Saisonziele (lang) und Tagesziele (außerhalb),
   aber wenig „ich will jetzt den Stammplatz / das nächste Topspiel“.

Die Pakete unten setzen genau dort an. Reihenfolge = meine Empfehlung.

---

## Paket 1 – Spieltag-Modus (Kern-Gameplay) ⭐ zuerst

**Ziel:** Jede Saison fühlt sich an wie eine Saison, nicht wie zwei Klicks.

- Saison in **6 Etappen** statt 2 Hälften (die Etappen-Logik `playStage` gibt es schon).
- Pro Etappe eine **Spieltag-Karte**: nächster Gegner, eigene Form (Pfeil), Stammplatz-Chance in %.
- In 1–2 Spielen pro Etappe eine **Szene** (5–10 Sekunden): z. B. „Freistoß aus 22 m – schießen
  oder flanken?“ Chancen kommen aus den echten Attributen. Baut auf den Entscheidungen aus Finals auf.
- Nach der Etappe: **Mini-Rückblick** (Noten-Kurve, Tore, wichtigste Szene) statt Textblock.
- **Schnell-Knopf bleibt:** Wer nur simulieren will, kann alles durchklicken wie bisher.

**Warum Spaß:** Mehr kleine Entscheidungen mit spürbarer Wirkung, Spannung vor jedem Spieltag.
**Aufwand:** groß (M–L). **Risiko:** Balance der Werte – braucht Tests, damit Karrieren nicht leichter werden.

## Paket 2 – Trainer & Kabine

**Ziel:** Spielzeit erkämpfen statt zugeteilt bekommen.

- **Vertrauen sichtbar** als Balken (gibt es intern schon) mit Gründen („gute Noten“, „Zoff in der Presse“).
- **Rolle im Team:** Tribüne → Bank → Rotation → Stammspieler → Unverzichtbar → Kapitän.
  Jede Stufe hat ein klares Ziel („noch 2 gute Spiele bis Stammspieler“).
- **Trainergespräch** einmal pro Etappe: mehr Spielzeit fordern, andere Position wünschen,
  Leihe ins Gespräch bringen – mit echtem Risiko (Trainer kann sauer werden).
- **Positions-Konkurrent:** ein konkreter Mitspieler aus dem Kader, mit dem du um den Platz kämpfst.
- **Trainerwechsel** als Ereignis: neuer Trainer, neues Vertrauen, neue Chance.

**Warum Spaß:** Ein Ziel, das man jede Etappe sieht und knapp verfehlen oder schaffen kann.
**Aufwand:** mittel. Passt perfekt zu Paket 1.

## Paket 3 – Große Bühne (Höhepunkte)

**Ziel:** Die besonderen Abende fühlen sich besonders an.

- **Europapokal-Nächte** und **WM/EM-Spiele** als eigene Live-Spiele mit Flutlicht-Präsentation
  (Finals gibt es schon – hier mehr Spiele und eigene Optik).
- **Rennen um den „Goldenen Ball“** (eigener Name, kein Markenname) über die ganze Saison, wie das
  Torjäger-Rennen: Top 10 der Welt, du mittendrin.
- **Gala am Saisonende:** Goldener Ball, Golden Boy (gibt es schon), Team der Saison – als
  Abend mit Umschlag-Aufdecken statt einer Zeile Text.
- **Turnier-Modus für WM/EM:** Gruppenphase und K.-o.-Runde mit eigener Tabelle.

**Aufwand:** mittel. **Warum Spaß:** Die großen Momente sind die, an die man sich erinnert.

## Paket 4 – Berater & Transfermarkt 2.0

- **Berater wählen** (eigene Figuren, keine echten Personen): gierig (mehr Gehalt, Vereine genervt),
  loyal (weniger Geld, mehr Vertrauen), Großmaul (mehr Angebote, mehr Presse-Ärger).
- **Gerüchte während der Saison:** „Ein Topklub beobachtet dich“ – gute Spiele erhöhen das Interesse.
- **Deadline-Day:** am letzten Tag des Fensters ein Live-Ticker mit Last-Minute-Angeboten.
- **Klauseln sichtbar:** Ausstiegsklausel, Bonus pro Tor, Spielzeit-Garantie (gibt es teils schon in `clauses.ts`).

**Aufwand:** mittel.

## Paket 5 – Story & Rivalen

- **Rivale 2.0:** ein festes Gegenstück über die ganze Karriere (gleicher Jahrgang, gleiche Position),
  direkte Duelle in Topspielen, Vergleich in jeder Etappe.
- **Fan-Stimmung pro Verein:** Fan-Liebling, normal, ausgepfiffen – beeinflusst durch Leistung,
  Treue und Presse. Bei Rückkehr zum alten Verein: Applaus oder Pfiffe.
- **Presse mit Folgen über Wochen**, nicht nur sofort (z. B. Kampfansage an Rivalen → Topspiel wird zum Derby).
- **Karriere-Kapitel:** automatische Überschriften wie „Durchbruch in Dortmund“ im Verlauf.

**Aufwand:** mittel.

## Paket 6 – Trainingswoche (optional spielbar)

- Zwischen den Etappen **ein Trainingsplan**: Schwerpunkt, Belastung, Pause.
- **Kurze Übungen** (10–15 Sekunden, z. B. Timing-Schuss, Pass-Präzision): gutes Ergebnis = etwas
  mehr Fortschritt beim Attribut. Immer überspringbar mit Standard-Ergebnis.
- **Belastung vs. Verletzungsrisiko** sichtbar machen (Verletzungen gibt es schon).

**Aufwand:** mittel bis groß (Mini-Spiele). **Risiko:** darf nicht zur Pflicht werden.

## Paket 7 – Vermächtnis & Rekorde

- **Ruhmeshalle** über alle Karrieren (Bestwerte gibt es schon in `legacy.ts`): beste Karrieren, Titel, Rekorde.
- **Rekordjagd:** z. B. „meiste Tore in einer Bundesliga-Saison“ – mit Fortschrittsbalken in der Saison.
  Vorsicht: echte Rekord-Zahlen müssen geprüft werden, bevor sie ins Spiel kommen.
- **Abschiedsspiel** zum Karriereende mit Rückblick auf die größten Momente.
- **Belohnung für den Club:** große Karriere-Erfolge geben Coins oder eine besondere Karte für Team/Sammlung.

**Aufwand:** klein bis mittel.

## Paket 8 – Aufräumen & Klarheit (läuft nebenher)

- **Leben-Tab ordnen:** Neben-Systeme (Look, Klinik, Abseits-Aktionen, Kickgram, Vermögen) in
  Gruppen sortieren und in den Einstellungen **einzeln ausschaltbar** machen. Nichts löschen –
  vorher frage ich dich, was weg darf.
- **Kopfzeile mit „Nächstes Ziel“:** immer ein konkretes Ziel sichtbar (Stammplatz, Saisonziel, Rekord).
- **Erste Saison mit kurzer Einführung** für neue Spieler.

**Aufwand:** klein.

---

## Kleine Ideen (schnell umsetzbar)

- Rückennummer selbst wählen, Wunschnummer bei Wechsel (kann vergeben sein).
- Eigener Torjubel auswählbar, wird in Szenen angezeigt.
- Spitzname durch die Medien nach starken Saisons.
- Marktwert-Kurve über die ganze Karriere.
- Saison-Rückblick als kurze Folge von Karten (Tore, Titel, beste Note) zum Durchwischen.
- Verbindung zum Casino: Siegprämie nach Titeln als Chips (klein halten, damit die Karriere im Fokus bleibt).

---

## Mein Vorschlag für die Reihenfolge

1. **Paket 1 + 2 zusammen** – das verändert das Spielgefühl am stärksten (Spieltage + Kampf um den Stammplatz).
2. **Paket 3** – Höhepunkte und Gala.
3. **Paket 8** nebenher in kleinen Schritten.
4. Danach 4, 5, 7, 6 – je nachdem, was dir beim Spielen am meisten fehlt.

Jedes Paket wird mit Tests, Update-Notiz und Screenshots abgegeben. Bei Paket 8 lösche ich nichts ohne Rückfrage.
