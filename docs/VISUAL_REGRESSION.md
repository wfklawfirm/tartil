# Visual regression

No automated pixel-diff suite exists. Evidence is manual: before images in `docs/design-screens/before`, earlier after images in `after/`, V3 images in `v3/`. Functional regression guard: `node scripts/qa/reader_integrity.mjs` (2,180 verse renderings identical to stored text), API tests 31/31, axe sweep. Recommended next step: add Playwright `toHaveScreenshot` baselines from `v3/` once the owner approves the direction.
