# Art direction: Quranic editorial luxury (V3)

Ivory paper canvas (`--bg #F5F0E4`, card `#FFFCF6`), emerald ink for headings/actions, antique gold only for fine lines and small marks, one dark emerald surface reserved for the lead card and footer-level contrast. Night mode is a separate palette (deep emerald, not black), opt-in.

Changes in this pass versus the previous direction:
- The arch/medallion hero art is replaced by a **live reader preview card** (real stored verses of al-Fatiha 1-4, link to the reader) over a masked {8/3} lattice, with an offset paper layer for depth. Nothing in it is mocked; if the text cannot load, the card removes itself.
- Header: 72px minimum, larger wordmark, hairline border (no gold rule), light blur on sticky.
- Mobile: centred small hero (medallion only), stacked CTAs (stacked only below 560px), compact cards.
- Page headers (Quran index, tajweed, sign-in) share one component: medallion, display title, divider.

Typography: interface IBM Plex Sans Arabic; display Amiri (headings only); Quran text Amiri Quran. Three families, no more. Fonts are requested from Google Fonts; the sandbox cannot load them, so real-font rendering is unverified.

Ornament density by page: decorative (home hero, certificates), balanced (learning, tajweed, qiraat), minimal (reader text area, dashboards, admin). See ORNAMENT_LIBRARY.md.
