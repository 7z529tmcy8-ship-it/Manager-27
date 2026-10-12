# Tokens – Neon-Stadion

Alle Werte als CSS-Variablen unter `:root[data-theme="arena"]`. In Komponenten nur Variablen benutzen.

## Farben
| Token | Wert | Wofür |
|---|---|---|
| `--bg` | `#05060f` | Seiten-Hintergrund (Basis) |
| `--bg-2` | `#0a1030` | Midnight-Verlauf Mitte |
| `--bg-3` | `#160a36` | Violett unten |
| `--panel` | `#0f1430` | normale Flächen (undurchsichtig!) |
| `--panel-2` | `#161c40` | erhöhte Flächen, Hover |
| `--line` | `rgba(160, 190, 255, .14)` | feine Kanten |
| `--line-strong` | `rgba(160, 190, 255, .32)` | Sekundär-Buttons, Eingaben |
| `--text` | `#f6f8ff` | Haupttext (Weiß) |
| `--text-2` | `#a9b2dc` | Nebentext – Kontrast ≥ 4.5:1 auf `--panel` |
| `--neon-c` | `#19f0ff` | Hauptakzent, Interaktion, Links |
| `--neon-m` | `#ff2fd1` | Store/Packs/Belohnung – sparsam |
| `--neon-g` | `#39ff88` | Erfolg, „Los geht's“, Primär-Verlauf |
| `--gold` | `#ffd76a` | Coins, Elite/Ikonen |
| `--danger` | `#ff4d8d` | Fehler, Niederlage |

Regel: Auf einem Bildschirm höchstens **zwei** Neon-Farben gleichzeitig prominent (Cyan + eine weitere).

## Hintergrund
Dreistufiger Verlauf `--bg → --bg-2 → --bg-3` (oben → unten), dazu max. zwei weiche Lichtkegel (Cyan oben links, Magenta oben rechts, je ≤ 18 % Deckkraft) und ein 44-px-Raster mit 4 % Deckkraft, nach oben und unten ausgeblendet. `background-attachment: fixed`, `html` ebenfalls einfärben (sonst Kante am Seitenende).

## Schrift
- Display: **Rajdhani 700** (selbst hosten: `public/fonts/rajdhani-700.woff2`), für Titel, Zahlen, Kachel-Titel, Karten-Namen/Wertung. Großbuchstaben + `letter-spacing: .03em`.
- Text: Systemschrift (`-apple-system, Inter, Segoe UI, Roboto`), 15–17 px, Zeilenhöhe 1.45.
- Skala: 12 / 13 / 15 / 17 / 20 / 24 / 32 / 44 px. Nichts dazwischen.
- Nie Display-Schrift für Fließtext.

## Abstände & Formen
- 4-px-Raster: 4 · 8 · 12 · 16 · 24 · 32 · 48.
- Radius: Karten-Flächen 20, Buttons 14, Chips 999, Icon-Kästchen 12.
- Handy-Seitenrand 16 px, Abstand zwischen Blöcken 24 px, innerhalb von Kacheln 16 px.

## Ebenen & Schatten
- Ebene 0: Hintergrund.
- Ebene 1 (Inhalt): `--panel`, Kante `--line`, Schatten `0 1px 0 rgba(255,255,255,.04) inset, 0 8px 24px rgba(0,0,0,.45)`.
- Ebene 2 (schwebend: Kopfleiste, Overlays, Bottom-Sheets): Glas `rgba(10,12,34,.72)` + `backdrop-filter: blur(16px)`, Kante `--line-strong`.
- Glow nur für: Primär-Button, Held-Element, aktive Auswahl. Glow-Stärke max. `0 0 24px` mit ≤ 35 % Deckkraft.

## Bewegung
- 150–200 ms, `ease-out`. Kein Hüpfen. Holo-Schimmer langsam (≥ 5 s).
- `:root.reduce-motion` und `prefers-reduced-motion` respektieren.
