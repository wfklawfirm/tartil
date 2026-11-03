# Design benchmark (V3 brief, 2026-11-03)

Method: each reference was fetched with the web tools on 2026-11-03. What the tool returned is recorded; where it returned nothing, that is stated and **nothing is claimed about it**. No third-party assets or layouts are copied.

| Ref | Accessed? | What was actually learned |
|-----|-----------|---------------------------|
| A Qolb (Dribbble) | NO - page returned empty | Not examined. No principle is attributed to it. |
| B Quran.com `quran.org/identity` | PARTIAL - identity page read; quran.com itself not fetched | Goals: beautiful without distracting from the text; intuitive without losing depth; useful for one ayah and daily return. Type: Figtree + IBM Plex/Noto for multilingual support. Palette is broad per product with a shared wordmark. The page does not describe reading vs study modes. |
| C Ayah | PARTIAL - marketing page only | Claims: mobile-first reading, coloured bookmarks, many reciters, dark mode for eye strain, a daily verse ("Today"). No layout or visual detail was available. |
| D Bayyinah (explore) | YES | Pathways grouped by audience (Quran, Arabic, New Muslim, Family, Professionals); cards = thumbnail, title, 1-2 line description, one CTA; the audience chooser routes to a pathway; logged-in dashboard shows in-progress/completed. |
| E Al Quran UX (Dribbble) | NO - empty | Not examined. |
| F The Gracious Quran (Behance) | NO - request failed | Not examined. |
| G Met manuscripts 453165, 453369 | YES (catalogue text only, no images) | 18th-c. Moroccan juz' with gilded leather binding, conservative geometric + vegetal illumination on opening/closing double pages; 1137 CE eastern-kufic folio with foliate scrolls and geometric interlace. Borders and palettes are not described in the text. |

## Principles adopted (re-interpreted, not copied)
1. Content first: the reader is paper-like with minimal ornament (B goals).
2. Audience-based entry and one clear CTA per card (D). Implemented as the "start here" cards and ecosystem cards.
3. Ornament as illumination of structure (G): geometry + vegetal motifs at headings, dividers and framing, not behind running text.
4. A daily verse and visible bookmarks as habit hooks (C claims): verse of the day exists; bookmarks exist.

## Avoid
Heavy frames around every card; repeating glowing ornaments; generic mosque/crescent clip-art; fake screenshots.

## Desktop / mobile application
Desktop: two-column hero with a live reader preview. Mobile: small centred hero, stacked CTAs, bottom navigation, no preview card (the verse of the day follows immediately).

## Limit
Because A, E and F could not be read and C/B only partially, the visual direction rests on the owner's brief and on G's catalogue text, not on a verified study of those products. A human designer should review the screens in `docs/design-screens/v3`.
