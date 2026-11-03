# Final design QA (2026-11-03)

| Check | Result |
|---|---|
| Unit/API tests (`npm test`, packages/api) | 31 of 31 pass |
| Verse integrity (`scripts/qa/reader_integrity.mjs`, live API) | 2,180 verse renderings (7 surahs × plain/tajweed × flow/lines) identical to stored text; every verse marker equals its ayah number |
| axe-core WCAG 2.2 A/AA | 0 violations on 9 pages × light/dark (reader with tools open included), plus side panel, mini-player, tracks timeline, passport/certificates, verify and review (mocked API). One real finding fixed: mini-player was overlapped by the bottom navigation |
| Overflow / console errors | none, 7 public routes × 5 widths; 8 logged-in views × 2 widths (mocked API) |
| Contrast | gold text darkened to #7A5F1E; muted text #5C6861; night tajweed tints lightened; verified by axe on rendered pages only |
| RTL | page `dir=rtl`; arrows on previous/next follow reading direction; no blanket RTL flips |
| Performance (lab only) | Chromium, local page, API responses cached, web fonts blocked, no network throttling: LCP 212–332 ms, CLS 0.006 (home) / 0 (reader). Two layout shifts found and fixed (footer jump while a route loads, verse-of-day box growing). Not a field or Lighthouse measurement; fonts add a request (4 families, `display=swap`) |

## Remaining issues
- Not verified on real Safari/iPhone after the redesign; Playwright here is Chromium only. The Highlight-API colouring needs Safari 17.2+.
- IBM Plex Sans Arabic and Amiri did not load in the sandbox (fonts blocked), so screenshots show fallback faces; the real look must be checked in a browser with network access.
- Logged-in pages, certificates, `#/verify` and `#/review` were rendered with a mocked API (invented data), not real records.
- Colour tooltips on tajweed letters are not available on the Highlight path (legend remains).
- Ornament density and aesthetics are a design judgement; the owner's review is the acceptance step.
