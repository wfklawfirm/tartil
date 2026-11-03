# 01 Full platform audit (Tartil 2.0 pass, 2026-11-03)

Scope: what exists in the repository and on the live deployment, measured, not assumed.

## What exists (evidence)
- Database: Supabase Postgres 17, migrations 0001-0009+, RLS tenant isolation, immutable Quran text, scholarly publication gate. DB tests 38/38 (PGlite).
- API: Fastify 5 + Zod in a Supabase Edge Function (v18). 31/31 tests. Endpoint families: auth, institutions, members/students, guardian links + consents, halaqat + sessions + attendance, submissions (recordings, audio URLs), assessments, certificates + public verify, tracks/progress, hifz (SRS), quiz attempts, mastery, sanad, scholarly review, AI suggestions (human gate), search, Quran/translation read.
- Web: one-file Arabic-first SPA (`packages/web-vercel/index.html`). Routes: home, quran reader, search, tajweed, qiraat, auth, me (learner/role workspaces), app (institution), review (scholars), verify, gallery (dev only).
- Quran text: Tanzil Uthmani 1.1, 6,236 ayat, byte-identical to source; `scripts/qa/reader_integrity.mjs` confirms 2,180 rendered verse strings identical to stored text.
- Deployment: Vercel `tartil-web`, behind Vercel Authentication (not public).

## Measured this pass
- Horizontal overflow: none at 320/360/375/390/430/768/1024/1280/1440/1920 and 844x390 landscape, on home, gallery, auth, tajweed (Chromium, system dark scheme).
- axe-core: 0 violations in 18 route/theme/width combinations.
- Console/page errors: none in the screenshot run.
- Default theme is now light (ivory) regardless of system scheme; dark is opt-in via the toggle.

## Not verified
Real Safari/WebKit; real web fonts (sandbox blocks Google Fonts, fallbacks measured); logged-in pages against real data (mocked API only); screen reader; field performance.
