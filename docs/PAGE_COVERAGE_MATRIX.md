# Page coverage matrix (V3, 2026-11-03)

Checks: Chromium, widths 390/768/1440/1920 (+320..1280 sweep for overflow). "Real data" means rendered against the live API; "mocked" means a stubbed API.

| Route | Previous | Now | Desktop | Mobile | Remaining |
|-------|----------|-----|---------|--------|-----------|
| `#/` home | dark arch hero | ivory, live reader preview, new sections | OK | OK | real-font and Safari check |
| `#/quran` index | plain heading | page header, surah grid | OK | OK | no juz/hizb/Meccan-Medinan filters |
| `#/quran/N` reader | earlier redesign | unchanged this pass (cartouche, paper canvas, tools) | OK | OK | very long surahs render as one page; no pagination |
| `#/search` | plain | unchanged | OK | OK | page header not yet applied |
| `#/tajweed` | plain heading + warning block | page header, collapsible notice | OK | OK | content is preliminary |
| `#/qiraat` | plain | unchanged | OK | OK | page header not yet applied |
| `#/auth` | card only | medallion + full-width form | OK | OK | no password recovery |
| `#/me/*` learner workspace | earlier redesign | unchanged | mocked | mocked | not re-reviewed with real data |
| `#/app/*` institution | earlier redesign | unchanged | mocked | mocked | not re-reviewed with real data |
| `#/review` scholars | earlier redesign | unchanged | mocked | mocked | same |
| `#/verify/CODE` | earlier redesign | unchanged | mocked | mocked | same |
| `#/gallery` | n/a | dev ornament gallery | OK | OK | dev only |
| 404 / unauthorized / offline states | none | none | - | - | dedicated state pages not built |

The V3 brief asks for every route redesigned; this pass covered the public entry pages. The rest are consistent with the shared tokens but were not individually rebuilt.
