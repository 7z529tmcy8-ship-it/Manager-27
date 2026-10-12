# Karten (UtCard.tsx)

## Anatomie (nicht ändern, nur gestalten)
Wertung + Position + Flagge oben links · Bild-Bereich (Trikot oder Silhouette) · Kartenart-Label · Name · 6 Werte · Verein/Label · ggf. Emblem oben rechts (Sonderkarten).

## Grundkarten
- Silber: gebürstetes Metall hell, Text dunkel.
- Gold: gebürstetes Gold, Text dunkelbraun.
- Elite (`gold-rare`): schwarzes Chrom mit Gold-Schrift, schräger Lichtreflex.
- Grundkarten bewusst ruhig, damit Sonderkarten im Pack herausstechen.

## Sonderkarten
- Jede Kartenart: eigenes Muster (`--pat`), eigenes Emblem (Map `EMBLEM` in `UtCard.tsx`), Holo-Schimmer (`.ucard-foil`), Doppelring ums Bild.
- Neue Kartenart = Farben (`--a --b --ink --edge --glow`) + Muster + Emblem + Eintrag in `VARIANT_LABEL`, `rarity()` und ggf. Sammlungsfilter. Muster muss sich von allen bestehenden unterscheiden (Galerie prüfen).
- Galerie zum Prüfen: siehe `scripts/card-gallery.md`.

## Keine Gesichter
- Bild-Bereich zeigt `Jersey` (Trikot mit Initialen) oder `AvatarFace` (Silhouette ohne Gesichtszüge). Niemals Augen, Mund, Nase oder Personen-Emojis.
