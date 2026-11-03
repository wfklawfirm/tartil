# Qur'anic design system

Direction: *modern Qur'anic heritage* — ivory paper, emerald, muted gold; geometry (eight-point star, interlaced squares), no imagery of mosques or manuscripts, nothing copied from a museum object. Every ornament is an original inline SVG or CSS in `packages/web-vercel/index.html` and carries `aria-hidden`.

## Tokens (CSS custom properties on `:root`)
| Token | Light | Night | Use |
|---|---|---|---|
| `--bg` | #F5F0E4 | #10231F | page |
| `--card` | #FFFCF6 | #17312A | cards, reading canvas |
| `--ink` / `--mute` | #312B26 / #5C6861 | #F1EBD9 / #C5CDBF | text |
| `--accent` / `--accent2` | #173F35 / #102D28 | #5DB89A / #9BDCC1 | primary, headings |
| `--gold` / `--gold2` | #B99A58 / #D4BE8A | #CAB47A | frames, dividers (never long text) |
| `--goldtx` | #7A5F1E | #CAB47A | small gold text (verse numbers) |
| `--teal` | #244F63 | #7FB4CC | limited secondary |
| `--line`, `--soft` | #E2D9C2, #EFEBDC | #2C4A40, #1D3A32 | borders, fills |
Functional states use their own colours (`--ok`, `--warn`, `--bad`), never gold or green alone. The theme is `auto` (system), `light` or `dark` (button in the header, stored locally). The muted text and goldtx values were darkened from the proposed palette so they pass WCAG AA on the paper colour.

## Typography
Quran text: **Amiri Quran** (unchanged; Noto Naskh Arabic fallback). Interface: **IBM Plex Sans Arabic**. Decorative short titles (brand, hero, surah header): **Amiri Bold**. Quran lines never use `text-transform`, letter-spacing or condensed faces; line height 2.5 keeps diacritics uncut; reader font size is user-adjustable (20–56 px).

## Ornament library (levels)
- **L1 rich** — hero (`.hero`: star-lattice background, double frame, four corner motifs) and surah header (`.cartouche`: double gold frame, two star medallions).
- **L2 moderate** — section headings (`divider()`), path cards (`pathIcon()`), journey rosettes.
- **L3 minimal** — reading canvas (thin frame + four small corners), forms, quizzes, tables, dashboards: none.
Components (JS): `orn()`, `corners()`, `divider()`, `pathIcon()`, `ayahMarker()`; markers are separate elements and never enter the verse text.

## Components
Buttons (primary, ghost, gold, small; 44 px minimum on phones), inputs/selects (44 px, invalid state), cards (gold accent bar on headings), tabs, chips, messages (ok/warn/err), tables, bottom navigation + "more" menu, tool chips (one panel open at a time), skeleton/empty/error states already provided by `empty()`/`note()`. Hover, focus (3 px gold ring), active, disabled are defined globally.

## Reading rules
1. The text is the most prominent element; tools are collapsed by default.
2. Tajweed colour is a display layer only (Highlight API); no characters added or removed.
3. Translation and tafsir are separate cards with source attribution, never inside the verse block.
4. Reading width ≤ 780 px on desktop.
5. Motion is short and disabled under reduced-motion; nothing animates on the mushaf.
