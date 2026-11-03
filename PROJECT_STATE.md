# PROJECT_STATE - 2026-11-01 (updated after owner decisions: name "Tartil / ترتيل" (provisional), hosting Supabase, proceed without waiting)

## Real, tested
- Source registry: 74 books inventoried with SHA-256, header metadata, quality metrics, triage (title-based, unreviewed).
- Extraction: 50 books (tier 1-3) -> 7,082 sections / 97,625 paragraph units with stable IDs; 11,767 Quran-quote marks; 3,906 citation locators parsed and classified.
- Duplicate detection (detect-only): 629 near-duplicate clusters pending human decision; 938 related variants preserved.
- API slice 1 (Fastify+Zod, own email/password+JWT): register/login, institution bootstrap, members, students, guardian link + verification, qari assignment, consent grant/revoke, recitation submission, qari state change. Full minor-student journey test passes through the real RLS layer (4 tests).
- **Quran text acquired**: Tanzil Uthmani 1.1 (6,236 ayat, SHA-256 6933e133…ec5f) committed verbatim with its licence notice; imports complete; status NOT_APPROVED (religious approval is a human act). Book quotes verified against it: 2,541 checked -> 2,330 match (91.7%), 78 found at a different locator (suggested corrections in review queue), 133 unmatched (partial/riwayah/paraphrase/typo).
- Supabase hardening (migration 0003, tested incl. mutation) + strict Tanzil importer ready for the owner's file (fails closed unless exactly 6,236 ayat; stores verbatim; records source SHA-256; imports as NOT_APPROVED).
- **Deployed on Supabase** (project `tartil`, ref okbtrogotrtciymmuokr, eu-central-1): migrations 0001-0005 applied; Tanzil edition imported inside the DB (hash-gated, 6,236 ayat, byte-identical, NOT_APPROVED); security advisor 0 findings; targeted isolation/consent/immutability checks passed on the real instance (see docs/SUPABASE.md).
- Database foundation (migrations 0001-0005) with 27 passing tests incl. mutation-verified tenant isolation, guardian consent for minors, immutable audit, immutable Quran text, scholarly publication gate.

- **Live (2026-11-01):** migration 0006 applied; API running as Supabase Edge Function (31-check live journey passed); Arabic web client on Vercel `tartil-web` (behind Vercel Auth). See docs/SUPABASE.md.

- **2026-11-01 night:** Quran edition provisionally APPROVED by owner (not scholarly; audit pending); basmala display fix; DB-backed login rate limit (0007); API function v6; 10 API tests + 33 DB tests pass.

## Added 2026-11-01 (migration 0008, edge function api v9)
Tracks/units/progress, learning passport, certificates with public verify-by-code, supervised AI suggestions (human gate, no model connected), halaqah join (Jitsi link, minors need verified guardian), session revocation (logout-all, change-password), 18+ registration checkbox. DB 38/38 tests, API 15/15. Live: migration 0008 applied, edge v9 deployed and smoke-tested (revocation works live). UI in packages/web and web-vercel (needs git push for Vercel). See KNOWN_LIMITATIONS 14-21.

## 2026-11-01 evening
AI assistant connected to an external model (secret in Supabase, edge v11). Web client rebuilt as a product UI (landing, Quran reader, role dashboards); API +2 endpoints (people, sessions-upcoming); API tests 16/16. See KNOWN_LIMITATIONS 22-23.

## Not built (do not assume)
Web/mobile UI, design system, audio, recitation studio UI, live halaqat, AI services, passport/credentials, QCEF load/review, live-Postgres test of `pg.ts` (the pg adapter has not run against a real server).

## Needs owner decision
0. (Done) Supabase project created after the owner upgraded the plan. Still owner-held: DB connection strings (service + app roles), JWT_SECRET (>=32 chars), and the API process has not yet been run against Supabase's pooler.

## Waiting on owner (non-blocking: work continues without them)
1. (Done 2026-11-01 under the owner's delegation: Tanzil terms accepted - verbatim copy, attribution, link to tanzil.net.)
2. Name 2+ qaris and a scholarly lead for review; appoint a safeguarding lead.
3. (Done: Supabase project exists; secrets/connection strings are the owner's to set in the API host.)
4. Provide AIJUR Skills repo/folder if its ideas should be audited (not found in this session).
5. Final brand (working name Tartil / ترتيل).

## Next (engineering, no blockers)
Halaqah + attendance + assessment-record journey; Quran Core read API (hidden until an approved edition exists); concept extraction v1 (Makharij/Sifat from tier-1 books) feeding `scholarly_items` as DRAFT with lineage; then web client (framework chosen by spike, ADR-009).

## 2026-11-01 night
- Migration 0009 (hifz_items, hifz_reviews, quiz_attempts; RLS own rows) applied live; edge function `api` v14.
- API: /me/hifz (+due, review, delete), /me/quiz-attempts, /me/mastery. Scheduler `nextReview` unit-tested.
- Web: "رحلتي" (today / hifz / quizzes / mastery map), PWA manifest + service worker, tajweed library, track templates.
- Tests: API 20/20, DB 38/38, browser journey 10/10 (Chromium, local DB + live Quran text).

## 2026-11-01 late night
- Live API = edge function v16 (adds /i/:inst/roster, /members/:mid/status, /overview-stats, /audit-trail). Verified: health ok, 401 unauthenticated, Quran text intact, 6236 ayat reference.
- Added: 8 curriculum track templates (proposals, not endorsed), institution admin console, first visual identity pass (mark, icon, hero pattern).
- Bundles for the owner to push in order: tartil-o, tartil-p, tartil-q, tartil-r.

## 2026-11-02 translation layer
Migration 0011 (translation tables, immutability, hash, range checks, RLS) applied live. Clear Quran imported (6236 verses, hash verified) and provisionally APPROVED. API routes `/translations/editions` and `/translations/:edition/:surah` live in edge function v17; verified live (edition listed, surah 1 = 7 verses, surah 2 = 286, unknown edition 404, Quran reference total 6236). Reader has an opt-in English translation toggle. Tests: API 29/29, DB 38/38. Bundle tartil-v.

## 2026-11-02 recitation audio
Reader now has a player (115 Hafs reciters, speed, repeat-ayah, start-from-ayah, live ayah highlight) streaming from mp3quran.net; CSP updated (connect-src www.mp3quran.net, media-src *.mp3quran.net). Browser-tested against the live APIs: list loads, audio plays, ayah highlighted, playback stops on navigation. Terms unstated: see LICENSE_REGISTER.

## 2026-11-02 onboarding and discoverability
Landing cards are now clickable (14 cards: audio and translation added; sign-in-only features are labelled). A signed-in user with no institution sees a "start for yourself" block (hifz, quizzes, mastery map, audio, sanad) and a one-click "create my institution" that also installs the eight draft curriculum templates (optional checkbox) and lands on the overview checklist. Browser-tested end to end on PGlite (register, create, templates installed, no page errors).

## 2026-11-02 tafsir panel
Reader has a collapsible tafsir panel (Jalalayn, Ibn Kathir, Qurtubi, Baghawi, Tabari), fetched on demand from tafsir_api (jsDelivr/raw GitHub), CSP extended. Browser-tested live (Jalalayn and Ibn Kathir for 2:255). Terms unstated, see LICENSE_REGISTER.

## 2026-11-02 advisor pass
Migration 0012 applied live and committed: search_path pinned on app.is_staff and app.translation_ayah_in_range, 18 covering FK indexes. Security advisor now shows only `rate_limits` (RLS on, no policy: intentional, service path only). Unused-index and multiple-permissive-policy (scholarly_items read policies) notes remain INFO/WARN and are deliberate at this data size. DB tests 38/38; live API smoke OK (health, translation, 6236 reference).

## 2026-11-02 search
`GET /search?q=&lang=ar|en` live in edge function v18 (verified on real data: "الحمد لله" 23 hits incl. 1:2; English "mercy" 138). UI: `#/search` and a "بحث" nav item; each result links to the ayah in the reader. API tests 30/30.

## 2026-11-02 letter joining
Reported from an iPhone: letters looked detached in tajweed-coloured text. Cause: WebKit breaks joining at inline-element boundaries. Fix: `tajweedJoin` adds zero-width joiners at styled boundaries where letters connect (display only, tested). Verified in Chromium; unverified on real Safari.

## 2026-11-02 justification
iPhone check after the joiner fix: coloured letters now connect. Remaining odd gaps and over-stretched word spacing came from `text-align: justify` (WebKit stretches Arabic inside words). Mushaf now uses start alignment, with inter-word justification only where the browser supports `text-justify`. Verified in Chromium; the iPhone result is for the owner to confirm.

## 2026-11-02 tajweed colouring via Highlight API
Owner reported the detached letters/gaps remained on iPhone after joiner and alignment fixes. Colouring now uses CSS Custom Highlight API ranges over a single text node (fallback: spans + joiners). Chromium check: 7 highlight classes, 0 spans.

## 2026-11-03 Qur'anic visual redesign
Owner supplied a full UI/UX master brief. Done: identity tokens (light/night, manual switch), original SVG ornament library, reader rebuilt (surah header, collapsed tools, reading canvas, rosette markers), home rebuilt, mobile bottom navigation, 44 px targets, focus, reduced motion, print. Docs: UI_UX_AUDIT, QURANIC_DESIGN_SYSTEM, PAGE_REDESIGN_REPORT, FINAL_DESIGN_QA; screenshots in docs/design-screens; `scripts/qa/reader_integrity.mjs` regression. Gaps listed in PAGE_REDESIGN_REPORT.
