# 04 Ornament library

All ornaments are original SVG, generated in `index.html` (no third-party artwork). View every pattern and parameter set at the dev route `#/gallery` (not linked from the UI).

| Id | Name | Function | Parameters | Used in |
|----|------|----------|-----------|---------|
| A | Geometric tessellation (8-point star) | `PATS.A`, `patUri` | s size, o opacity, w stroke, c colour | home, auth backgrounds |
| B | Ottoman-style floral vine | `PATS.B` | same | qiraat |
| C | Andalusian/Maghribi {8/3} lattice | `PATS.C` | same | tajweed |
| D | Corner flourish, divider, ayah marker, surah cartouche | `orn('corner')`, `divider()`, `ayahMarker()`, `.cartouche` | CSS vars | reader, cards |
| E | Illuminated medallion + arch composition | `medallionInner/medallion/heroArt` | size | home hero |

Patterns are exposed as CSS variables `--pA/--pB/--pC`, tinted per theme, applied by `body[data-page]`. Opacity is kept low so text contrast is unaffected (axe clean in both themes). Gold tones adapt for night.
Limit: ornaments are stylistic interpretations, not reproductions of a specific historical work; no scholar/designer review has occurred.
