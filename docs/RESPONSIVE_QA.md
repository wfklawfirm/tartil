# Responsive QA (V3)

Playwright/Chromium, system dark scheme (page stays light by default).
- Overflow sweep: 320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920 and 844x390 landscape on home, gallery, auth, tajweed: no horizontal overflow, no page errors.
- Screenshots 390/768/1440/1920 for home, quran, reader (al-Fatiha), tajweed, qiraat, search, auth: `docs/design-screens/v3/` (28 images).
- axe-core: 0 violations on 18 route/theme/width combinations.
- iPhone-emulated (`iPhone 14 Pro Max` profile) full-page review of home, quran, reader, tajweed, auth.
Not verified: real WebKit/iOS Safari (the owner's own iPhone screenshots exposed two defects the emulation missed, both fixed), Android browsers, real fonts, landscape tablets other than the sweep.
