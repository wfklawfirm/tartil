# TARTIL 13.0 - Quran Kids Academy (أكاديمية الصغار): honest status

> **Correction (verified read-only against Supabase project okbtrogotrtciymmuokr, 2026-11-03):** migrations 0001-0016 ARE applied in production and edge function `api` is at v23; migration 0017 and the `/formation/*` and `/me/reflections` routes are NOT live (probes: `/me/plan`, `/i/*/kids/overview` -> 401; `/formation/sources`, `/me/reflections` -> 404). Any statement below that 0016 (kids academy / plan) is "not applied" or "not live" predates this check and is superseded; it is untested end-to-end live, not unapplied.

Date of audit: 2026-11-03. Scope: the children's Academy (`#/kids`) as it exists in `/home/claude/quran-global-platform`. Nothing in this document was changed in code; it is an audit.

Status vocabulary: WORKING, PARTIALLY WORKING, UI ONLY, BROKEN, MISSING, BLOCKED, NEEDS SCHOLARLY REVIEW. "Not verified" means I could not confirm it myself in this session.

## 1. Headline

The Kids Academy is a **first slice, not a finished academy**. What exists: a client-side hub with four letter/mark activities and a short-surah reading view, a rule-based recommender, and a locally tested server slice (migration 0016 + five API routes) that lets a child send progress to a teacher and a verified guardian. What does not exist: any audio, any makharij lab, any pronunciation feedback for letters, any curated memorisation track for children, and any live server for this data (migration 0016 is, per the repo's own records, not applied to Supabase). The repo's own QA says it directly: "The Academy is NOT complete against its own brief" (`docs/KIDS_ACADEMY_QA.md`).

Caveat on "the six levels": the owner's TARTIL 13.0 document was not available to me (only its summary in the brief). The only six-stage structure in the repo is the foundation curriculum (`docs/FOUNDATION_CURRICULUM.md`, 6 stages, marked DRAFT). I use it as the stand-in for "the six levels". If the owner's document defines six different levels, section 3 must be re-mapped. This is an assumption, not a finding.

## 2. What was actually built (inventory)

| Layer | Artifact | Notes |
|---|---|---|
| Docs | `docs/KIDS_ACADEMY_ARCHITECTURE.md`, `KIDS_ACTIVITY_ENGINE.md`, `KIDS_BACKEND_SCHEMA.md`, `KIDS_ACADEMY_QA.md`, `KIDS_LEARNING_BENCHMARK.md` | Five files, each 4-13 lines. Written by the same session that wrote the code; they are self-reports, not independent review. |
| Related docs | `CHILD_SAFETY_AND_ACCESS.md`, `CHILD_RECITATION_AI.md`, `PARENT_TEACHER_INTEGRATION.md`, `MAKHARIJ_VISUAL_SYSTEM.md`, `FOUNDATION_CURRICULUM.md` | Contain the explicit "not built" lists used below. |
| DB | `packages/database/migrations/0016_kids_academy.sql` | `kid_profiles`, `kid_attempts`, function `app.can_see_kid`, guard trigger `app.kid_profile_guard`, RLS FORCED. |
| API | `packages/api/src/app.ts` lines ~961-1015 | `PUT /i/:inst/kids/profile`, `POST /i/:inst/kids/attempts`, `GET /i/:inst/kids/progress`, `GET /i/:inst/kids/overview`, `POST /i/:inst/kids/level`. Same routes present in `packages/edge/dist/app.ts` (generated copy). |
| UI | `packages/web-vercel/index.html`: `kidsView` (~L1602), `kidsServer` (~L1417), engine helpers `kst/kLog/kStats/kRecommend` (~L1400-1416), teacher panel (~L923-929) | Route `#/kids` is wired at L479. `packages/web/index.html` is a near-identical copy (326309 vs 326313 bytes). |
| Test | `packages/api/test/kids.test.ts` | One test (63 lines) covering the server slice. |

## 3. The six levels versus what exists

Stages from `docs/FOUNDATION_CURRICULUM.md`, with status judged from code, not from the docs' own wording.

| # | Level (stage) | What exists | Status | Evidence / gap |
|---|---|---|---|---|
| 1 | Listening foundations | Nothing. | MISSING (BLOCKED on cleared human recordings) | `KIDS_ACADEMY_QA.md`: no audio; `KIDS_LEARNING_BENCHMARK.md`: "Tartil has no cleared audio". The hub's own "not available" panel says so (`index.html` ~L1632). |
| 2 | Arabic letters | `rec` (letter to name), `match` (shape to same shape), `pair` (look-alike drill over `KPAIRS`), 6-question placement. Letter data `FD_LET` (28 letters) in `index.html` L779. | PARTIALLY WORKING (client-side, draft, unreviewed) | Four letter forms exist elsewhere (`#/foundations`), not inside kids drills. Activities use letter names only; no sounds, no word examples. Verified in Chromium per `KIDS_ACADEMY_QA.md` (390 px, axe 0 violations); I did not re-run the browser. |
| 3 | Reading foundations (harakat, syllables) | `har` activity: letter with a mark, choose the mark's name. Band C draws from all 8 marks (`FD_HAR`, L780). | PARTIALLY WORKING | The activity is titled "ابنِ المقطع" (build the syllable) but the question is "what is the name of this mark" (code ~L1650). It does not build or read syllables. Word building not built (`FOUNDATION_CURRICULUM.md` item 3). The recommender's "syllable challenge" at >= 8 mastered letters just routes to this same `har` drill. |
| 4 | Quranic reading | `readAct`: six short surahs (112, 113, 114, 108, 103, 110) from the approved edition via `GET /quran/:edition/:n`, verse by verse, a "I repeated it" counter, links to tasmi' and the reader. | PARTIALLY WORKING | Text shown unchanged (good). Repetitions are not logged or synced (`KNOWN_LIMITATIONS.md` section 39). No guided reading, no audio model, no score. Text depends on an approved edition being loaded; "not verified" against the live DB here. |
| 5 | Tajweed foundations / makharij lab | None in the Academy. A text/list makharij explorer lives in the tajweed library (`index.html` ~L1136-1212, `#/tajweed/makharij`). | MISSING (lab); library part NEEDS SCHOLARLY REVIEW | `MAKHARIJ_VISUAL_SYSTEM.md`: "Status: NOT BUILT". The explorer is labelled "under scholarly review" in the home cards (~L494). No animation, no tongue/throat drawing, no 3D. |
| 6 | Memorisation | Hub links to `#/me/tasmi`, `#/plan`, homework. | PARTIALLY WORKING (via generic adult-era features) | `FOUNDATION_CURRICULUM.md`: "child-specific short-surah track not curated". Tasmi' analysis (`/me/recitations/analyze`) is a general Whisper alignment, not evaluated on children (`CHILD_RECITATION_AI.md`). |

Overall level verdict: 0 of 6 levels is complete; 4 are partial; 2 are missing. No level is scholar- or pedagogue-reviewed (`KNOWN_LIMITATIONS.md` section 40: nobody holds `pedagogical_reviewer` or `child_protection_reviewer`).

## 4. Activity engine

Source: `index.html` `kStats`, `kRecommend`; doc `KIDS_ACTIVITY_ENGINE.md`.

| Component | Status | Notes |
|---|---|---|
| Event log `{t, act, item, ok}` in `localStorage` key `kids`, last 600 events | WORKING | Code ~L1403-1406. Device-local; lost if browser data is cleared. |
| Mastery rule: >= 4 of the last 5 attempts correct, on >= 2 distinct days | WORKING (client) | `kStats` counts only `rec` and `match` events. Server recomputes with the same rule (`app.ts` L961+). Threshold is the author's heuristic, "not validated" (own doc). |
| Recommender (look-alike confusion, harakat < 0.6, recognition < 0.6, >= 8 mastered, default) | WORKING as rules; pedagogical value NOT VERIFIED | Fixed priority list, no spacing/forgetting model, no use of the teacher level in the recommendation itself. |
| Age bands a (4-6), b (7-10), c (11-14): 3/4/5 options, 6/8/10 questions | WORKING | `KB` constant ~L1401. Band is self-selected, not verified. |
| Placement (6 questions, >= 5 right sets level `adv`) | WORKING, unvalidated | Cut-off is arbitrary; a lucky child skips the beginner path. Teacher can override. |
| Feedback tone | WORKING | Wrong answer says look again and shows the answer; no failing state, no timer, no streak, no ranking. |
| Listen & select, watch & repeat | MISSING | Need audio / makharij. |
| Rewards, characters, stories | MISSING | Benchmark says competitors use mnemonic stories; none built, none cleared. |
| Offline play | MISSING for Academy | `KIDS_ACADEMY_QA.md` acceptance G: offline only for two homework actions. |

## 5. Makharij and tajweed lab

- Existing: a text-based explorer (17 makharij in five zones, sifat, quick quizzes) in the tajweed library. Status: NEEDS SCHOLARLY REVIEW (the page says so itself). It is adult-register text, not a children's experience.
- Not built: any child-facing lab, any articulation drawing/animation, any audio-synchronised view, any camera mode.
- Why (per repo): no scholar-approved articulation references, no licensed models (`MAKHARIJ_VISUAL_SYSTEM.md`, `KIDS_LEARNING_BENCHMARK.md` on Tajweedi: no licence path found). The repo plan is a single reviewed pilot letter as 2D SVG first.
- Owner decisions: appoint a tajweed/phonetics reviewer; decide whether to seek a licence (Tajweedi or other) or commission original drawings; commission or license a qari recording set.

## 6. Child experience

Verified by the repo's own QA (Chromium, 390 px, mocked server; not re-run by me): band choice, placement, pair drill, recommendation switch, no horizontal overflow, axe clean.

| Aspect | Status | Notes |
|---|---|---|
| One task at a time, large buttons, positive feedback | WORKING | `btn lg`, step counter, "أحسنت" feedback. |
| Reading load for 4-6 | PARTIALLY WORKING | Band A uses 3 options and `match` (no reading) but the page text, instructions and the recommender copy are Arabic prose a 4-year-old cannot read; the doc itself says guardian assistance. |
| Arabic RTL, English LTR | PARTIALLY WORKING | Whole kids hub is Arabic only; no English strings seen in `kidsView`. |
| Real devices (iPhone/Safari, tablet), screen reader, real children | NOT VERIFIED | Own QA lists them as not verified; I verified nothing in a browser. |
| Child sees "what is not available yet" | WORKING | Honest details panel in the hub. |
| Dead ends | One found: the `place` result does not offer to start the recommended activity, only "back". Minor. | `index.html` ~L1644. |

## 7. Parent and teacher integration

| Capability | Status | Evidence |
|---|---|---|
| Child sends progress explicitly ("أرسل تقدّمي") | PARTIALLY WORKING (code + local test only) | `kidsServer` L1417-1428. Sends only `rec/match/pair/har` events; placement events excluded. |
| Teacher sees mastered letters and look-alike confusions, sets child's level (new/adv) | PARTIALLY WORKING (code + local test) | Panel in homework queue tab L923-929; `POST /kids/level`; guard trigger blocks the child from setting it. |
| Verified guardian sees progress card | PARTIALLY WORKING (code + local test) | `kidsServer` guardian branch; `app.can_see_kid` requires verified guardian link. The card shows attempt count and mastered letters only. |
| Institution admin visibility | WORKING at DB policy level (test does not assert admin read) | `can_see_kid` includes `tenant_admin`. |
| Teacher assigns Academy lessons / drills as typed homework | MISSING | `PARENT_TEACHER_INTEGRATION.md`. |
| Remedial exercise suggestions, notes visible to parent, institution foundation reports | MISSING | Same doc; `KIDS_BACKEND_SCHEMA.md` "Not included". |
| Generic homework (assign, child's one task, guardian view, review) | WORKING (separate subsystem, migration 0014 applied live per `KNOWN_LIMITATIONS.md`); not Academy-specific | Not re-verified by me. |

Test coverage: `kids.test.ts` asserts idempotent resync, future/oversized event rejection, only-student-may-record (teacher gets 403), mastery rule, teacher/other teacher/guardian/other guardian/other child/other tenant visibility, teacher-level override both directions, child's edit not erasing teacher level. It runs on PGlite, not a real Postgres/Supabase.

Test run in this session: **not verified**. I tried `npm test` and `kids.test.ts` alone; the host was under load (load average ~40 from parallel agents), the runs were killed (exit 144) and the one full run showed `not ok` for `basmala.test.ts` and `formation.test.ts` with no usable detail, which I attribute to the load but did not confirm. The figures "API 45 / DB 38" in `KIDS_BACKEND_SCHEMA.md` predate migration 0017 (now API 50, DB 49 per `PROJECT_STATE.md`); I quote them, I did not reproduce them. Re-run `npm test` on an idle machine before relying on any number here.

## 8. Child safety and access constraints

From `CHILD_SAFETY_AND_ACCESS.md`, `KNOWN_LIMITATIONS.md` (sections 39-40, item 9) and migration 0016.

Enforced in the database (read in SQL, not merely claimed):
- Kids tables have RLS ENABLED and FORCED; `app_user` only gets SELECT/INSERT (+UPDATE on profiles). No DELETE grant exists, so a child cannot erase synced attempts through this API (a retention/deletion gap, see below).
- Only a user holding the `student` role in the institution can insert attempts; the row must be their own.
- Visibility limited to the student, their assigned teacher, a verified guardian, the tenant admin.
- Student cannot set `teacher_level`; teacher/admin cannot change `band` or `placement_level`.
- No ranking or leaderboard view; the overview is alphabetical; API responses carry `progress_is_not_a_grade_or_a_rank`.
- Minors' recordings require a live guardian consent (trigger `app.enforce_recording_consent`, migration 0001); the personal analysis path stores no audio. Not used by the Academy activities themselves (they record nothing).

Open limits:
- **Child credentials**: temporary access codes / QR / revocable devices are NOT BUILT; blocked on an owner-approved child-authentication design. Until then a child uses an institution-created or guardian-held account.
- **Age band is self-declared** (no birth date stored, ADR-008); a child can mis-declare. Guardian consent is the real barrier for anything sensitive (`KNOWN_LIMITATIONS.md` section 40).
- **Retention and deletion policy for children's data is not written**; the repo states no real child should use child-data features until it is. Applies to `kid_attempts` too (no delete path, no expiry).
- **Legal review per jurisdiction** (COPPA/GDPR-K, Lebanese/UAE rules): not done (item 9).
- **No messaging, live-session controls, or reporting workflow** (item 9): safeguarding covers access and consent only.
- **Client logging risk**: progress sits in `localStorage` on possibly shared devices; no PIN or lock. Not verified whether sign-out clears it.
- No third-party trackers/analytics in the kids view were seen, but I did not audit network traffic: not verified.
- Quran text safety: `readAct` renders text from the approved edition via `textContent`-style element creation (`el(...)`), no rewriting. Not verified against the live edition.

## 9. Deployment truth

- Migration 0016: written and PGlite-tested; **not applied to Supabase** per `KNOWN_LIMITATIONS.md` section 39 and `KIDS_ACADEMY_QA.md`. I did not query the live project; status "live" is therefore not claimed. Until applied, `kidsServer` calls would fail against production, so the sync button and teacher panel are UI that cannot work live (status for live: BLOCKED).
- Edge function redeploy (also carries 0015 plan routes) pending. `packages/edge/dist` regenerated locally only.
- Entire Academy content: no scholarly, pedagogical or child-protection review signed.

## 10. Gap list (priority order)

1. **No audio at all**: levels 1, 3, 5 and every competitor-style activity depend on cleared human recordings (owner decision: reciter, licence, budget).
2. **Server slice not live and not reviewed**: apply 0016 to a staging project first, then production; add a delete/retention path (owner decision on retention).
3. **Makharij lab absent**: needs a named reviewer and an asset/licence decision before any build.
4. Mislabelled activity: "ابنِ المقطع" is mark naming; either rename or build real syllable assembly (no owner decision needed, engineering).
5. Recommender uses author heuristics with no validation and ignores teacher level; no spaced repetition for letters.
6. No Academy-typed homework, no remedial suggestions, no institution reports.
7. Short-surah repetitions are not logged; child memorisation track not curated.
8. No child-safe sign-in (codes/QR); no real-device or real-child testing; no English UI.
9. No English strings, no accessibility test with a screen reader, no Safari/iOS test.

## 11. Evidence

Read in this session:
- `/home/claude/quran-global-platform/CLAUDE.md`, `PROJECT_STATE.md`, `IMPLEMENTATION_TRACKER.md` (kids/child grep), `docs/governance/KNOWN_LIMITATIONS.md` (sections 9, 38-40).
- `docs/KIDS_ACADEMY_ARCHITECTURE.md`, `KIDS_ACADEMY_QA.md`, `KIDS_ACTIVITY_ENGINE.md`, `KIDS_BACKEND_SCHEMA.md`, `KIDS_LEARNING_BENCHMARK.md`, `CHILD_SAFETY_AND_ACCESS.md`, `CHILD_RECITATION_AI.md`, `PARENT_TEACHER_INTEGRATION.md`, `MAKHARIJ_VISUAL_SYSTEM.md`, `FOUNDATION_CURRICULUM.md`.
- `packages/database/migrations/0016_kids_academy.sql` (whole file); `0001_foundation.sql` line 257 (consent trigger, existence only).
- `packages/api/src/app.ts` kids routes (lines 961-1015, partially read); `packages/api/test/kids.test.ts` (whole file).
- `packages/web-vercel/index.html`: kids helpers, `kidsView`, `kidsServer`, teacher panel, makharij explorer (grep context), `FD_LET`/`FD_HAR`.
- Commands: file listings, `grep -n kids` across web, edge, api; `wc`; `npm test` and `npx tsx --test test/kids.test.ts` (both killed under load, no result); `uptime` (load average ~40).

Not read: `docs/01_FULL_PLATFORM_AUDIT.md`, `02_FEATURE_GAP_MATRIX.md`, `11_FINAL_RELEASE_READINESS.md` (grep for "kids" returned nothing in 02, 07, 11), the owner's TARTIL 13.0 document, the live Supabase project, any browser rendering.

## 12. Open items

- Owner: supply the six-level definition from the TARTIL 13.0 document so section 3 can be re-mapped.
- Owner decisions: recordings (reciter/licence/budget); reviewer appointments (tajweed/phonetics, pedagogical, child-protection); children's-data retention and deletion policy; child sign-in design (codes/QR/devices); jurisdictional legal review; production deployment of 0016 and the edge function.
- Engineering (no owner decision): re-run the full test suite on an idle host and record real counts in `docs/governance/TEST_RESULTS.md`; verify migration 0016 against a staging Supabase project; rename or rebuild the syllable activity; log short-surah repetitions; add Academy-typed homework; verify `localStorage` handling on sign-out; real-device and screen-reader QA.
