# TARTIL 13.0 — Implementation Progress (السجل الحي)

> **Correction (verified read-only against Supabase project okbtrogotrtciymmuokr, 2026-11-03):** migrations 0001-0016 ARE applied in production and edge function `api` is at v23; migration 0017 and the `/formation/*` and `/me/reflections` routes are NOT live (probes: `/me/plan`, `/i/*/kids/overview` -> 401; `/formation/sources`, `/me/reflections` -> 404). Any statement below that 0016 (kids academy / plan) is "not applied" or "not live" predates this check and is superseded; it is untested end-to-end live, not unapplied.

Status date: 2026-11-03. Repository: `/home/claude/quran-global-platform` (80 commits; HEAD `a6af652`). Written from the repository as it is, not from the plans. This is a living ledger: each row is one meaningful function with one status and the file or test that proves it.

## 0. How to read this ledger

**Status vocabulary** (a row may carry two, e.g. `Tested · Needs Scholarly Approval`):

| Status | Meaning here |
|---|---|
| Existing | Was in the repository before the 13.0 reconstruction and is kept as is. |
| Fixed | A defect was found and repaired; the fixing commit is cited. |
| Implemented | Code or content exists, but no automated test or browser run in this session proves behaviour. |
| Tested | An automated test or script that I ran in this session (or whose result is recorded in a repo document, said explicitly) proves it. |
| Blocked | Cannot progress without something outside the code (owner, provider, infrastructure). |
| Needs Content | The function exists but the content (licensed, cleared or authored) is absent. |
| Needs Scholarly Approval | Content or behaviour that may only become public after a named human reviewer approves. |
| Future Phase | Not started and not claimed. |

Crosswalk to the brief's vocabulary: Tested = WORKING; Implemented = PARTIALLY WORKING or UI ONLY depending on the row note; Blocked = BLOCKED; Needs Scholarly Approval = NEEDS SCHOLARLY REVIEW; Future Phase = MISSING. I use the owner's wording as the primary label.

**Phase numbering is inferred.** The owner's TARTIL 13.0 document was not in the repository or in my brief; I only had its summary (audit first, keep what works, reorganise the academy, responsive design, complete engines/UI/backend, Heritage-to-Curriculum lab, teacher/parent/institution paths, user-journey testing, honest report). Phases 0–8 below follow that order. **Owner decision / not verified:** whether the owner's own phase 0–8 titles match. Rename the headings if not; the rows stay valid.

**Test evidence run in this session (2026-11-03):**

| Command | Result |
|---|---|
| `packages/database`: `npx tsx --test --test-concurrency=1 test/*.test.ts` | 49 tests, 49 pass, 0 fail (200 s) |
| `packages/api`: `npx tsx --test --test-concurrency=1 test/*.test.ts` | 50 tests, 50 pass, 0 fail |
| `python3 scripts/validate_lessons.py` | 40 units checked; 0 problems |
| `python3 scripts/validate_programs.py` | programs=16 lessons=148 scenarios=83 covered=231/231; 0 issues |
| `node scripts/e2e_academy.mjs` | "all checks 1–6 pass" (16 programs, 148 lessons, 83 scenarios) |
| `npx tsc --noEmit` in `packages/api`, `packages/database` | 6 and 9 errors respectively, all in `test/*.test.ts` (strict-index typing); none in `src/` |

Caveat: plain `npm test` (parallel) was killed with SIGKILL on both packages in this 2-CPU / 8 GB sandbox while other jobs were running; I therefore ran each package with `--test-concurrency=1`. A CI configuration must do the same or use a larger runner. Not re-run this session: `scripts/qa/reader_integrity.mjs`, `packages/api/e2e/a11y-audit.mts`, overflow/viewport sweeps, any live Supabase or Vercel smoke. Their results below are quoted from repo documents and labelled "recorded".

---

## Phase 0 — Audit and preservation baseline

| Function | Status | Evidence |
|---|---|---|
| Full platform audit (what exists, measured) | Existing | `docs/01_FULL_PLATFORM_AUDIT.md` (Tartil 2.0 pass; overflow, axe and console results recorded, not re-run) |
| Feature gap matrix | Existing | `docs/02_FEATURE_GAP_MATRIX.md` (19 rows; row 15 says no dedicated parent view) |
| Honest limitations register | Existing | `docs/governance/KNOWN_LIMITATIONS.md` (items 1–40; item 40 = formation engines) |
| Resume protocol, non-negotiables (no Quran text change, no authority claims, licences not cleared by default, RLS tenancy) | Existing | `CLAUDE.md` |
| Quran text preserved verbatim, edition-pinned, hash-gated | Existing · Tested | `packages/database/test/tanzil-real.test.ts` and `canon.test.ts` pass in the 49/49 run; reader integrity 2,180 verses identical (recorded in `docs/10_FUNCTIONAL_QA.md`) |
| Tenant isolation, guardian consent for minors, immutable audit, scholarly publication gate | Existing · Tested | `isolation.test.ts`, `halaqat.test.ts`, `tracks.test.ts` (49/49 run); mutation checks recorded in `docs/governance/TEST_RESULTS.md` |
| 26-deliverable tracker | Existing | `IMPLEMENTATION_TRACKER.md` (mostly PARTIAL; last refreshed for item 40) |
| Tracker/state consistency | Fixed pending | `PROJECT_STATE.md` still lists "Not built: Web/mobile UI, design system, audio, recitation studio UI…" in its 2026-11-01 block although later blocks state they exist; `docs/10_FUNCTIONAL_QA.md` says API 31/31 and DB 38 while the current run is 50 and 49. These stale lines are documentation debt, not code |
| Two copies of the SPA stay in sync | Tested | `diff packages/web/index.html packages/web-vercel/index.html` differs only in the `api-base` meta (4 diff lines) |
| Edge function mirrors API source | Implemented | `packages/edge/dist/app.ts` vs `packages/api/src/app.ts` differ by 10 diff lines (import rewrite); deployed version not verified |

## Phase 1 — Academy reorganisation (أكاديمية التكوين الإنساني)

Content layer is `docs/human-formation/*` and the four `academy-*.json` files shipped in `packages/web-vercel/`.

| Function | Status | Evidence |
|---|---|---|
| Competency register: 40 competencies (md + json) | Implemented · Needs Scholarly Approval | `docs/human-formation/COMPETENCIES.md`, `competencies.json` (40 entries read) |
| Source map v2, blueprint (D1–D12) under the moderate-mainstream editorial line | Implemented · Needs Scholarly Approval | `docs/human-formation/BLUEPRINT.md`, `SOURCE_MAP.md`, `CLAUDE.md`; blueprint §14 itself says the school-of-thought tagging came from the author's general knowledge and needs a reviewer |
| 16 programs (P01–P16) with stages, missions, capstones, gating | Tested (structure) · Needs Scholarly Approval | `docs/human-formation/programs.json` (`status: draft-unreviewed`); `validate_programs.py` 0 issues, 231/231 items covered |
| 40 lesson units = 148 lessons + 83 scenarios | Tested (structure) · Needs Scholarly Approval | `docs/human-formation/lessons/lessons_G1..G8.json`; `validate_lessons.py` 0 problems |
| Content QA rounds (8 independent reviews, diversity round) | Existing | `docs/human-formation/qa/QA_G1..G8.md`, `QA_GUIDES_P01/P05/P09/P13.md`; commits `61c6ec0`, `58bfcd1` |
| Guides + parent guides for 16 programs | Implemented · Needs Scholarly Approval | `docs/human-formation/guides/P01..P16.json`, `packages/web-vercel/academy-guides.json`; commit `480e53e` ("draft, unreviewed") |
| Academy always in main nav, home entry, mobile bottom-nav button | Fixed · Tested | commits `9a0b623`, `f123a7e`; `scripts/e2e_academy.mjs` passes (nav, 16 programs, lessons, scenarios) |
| Programs grouped by life stage (bands b1…b8, Arabic age/level labels) | Implemented | `packages/web-vercel/index.html` `#/academy` (lines ~1447–1590); `PROGRAMS.md` |
| Program journey page, lesson player, scenario player (step counter, finish flow) | Fixed · Tested | commits `0105706`, `d8d2d81`; e2e script walks every program, lesson and scenario |
| Pilot programs P06, P07; adults-gated P14/P15/P16 | Implemented | `programs.json` status fields (P06, P07 `pilot`; P15, P16 `adults_gated`; P14 `adults_only: true`); the gating is a data flag, not an access control (see Phase 5) |
| Learner progress in the academy | Implemented (browser-local only) | `index.html` stores completion in `localStorage` key `acx_done`; a grep of the SPA finds **0** calls to the formation API. Progress is not synced, not visible to a teacher or parent, and is lost with the browser |
| Reviewer view `#/academy/review` | Implemented | `index.html` route; owner-only draft preview; no reviewer is appointed |
| No scoring or ranking language shown to learners | Tested | language filter inside `scripts/e2e_academy.mjs` (line ~44) passes |
| Lessons grounded in extracted principles (own words, locators, no quotes) | Implemented · Needs Scholarly Approval | commit `a6af652`; `docs/human-formation/extracted/*.json` (40 files); `scholarly-assets/extraction-formation` is gitignored (licence rules, `LICENSE_REGISTER.md`) |

## Phase 2 — Responsive design and visual system

| Function | Status | Evidence |
|---|---|---|
| Light-default ivory theme, night mode as opt-in toggle | Existing | commit `4bae74a`; `docs/03_QURANIC_DESIGN_SYSTEM.md` |
| Original ornament engine A–E and `#/gallery` | Existing | `docs/04_ORNAMENT_LIBRARY.md`; commit `4bae74a` |
| Mobile bottom navigation, 44 px targets, focus, reduced motion, print styles | Existing | commit `7918e28`; `docs/09_VISUAL_QA.md` |
| No horizontal overflow at 11 viewports (320–1920 and 844×390) on home, gallery, auth, tajweed | Existing (recorded, not re-run) | `docs/01_FULL_PLATFORM_AUDIT.md`, `docs/10_FUNCTIONAL_QA.md` |
| Academy has no mobile overflow | Tested | the e2e script includes a mobile overflow check and passed this session |
| axe-core WCAG A/AA: 0 violations in 18 route/theme/width combinations | Existing (recorded, not re-run) | `docs/10_FUNCTIONAL_QA.md`; script `packages/api/e2e/a11y-audit.mts` |
| Search toolbar, page headers, error and not-found pages on phones | Fixed | commits `011ac53`, `883bbf4`, `4c97bd7`, `9264762` |
| Real Safari/iPhone, real web fonts, screen reader, field performance | Blocked | no device or font access in the sandbox; listed as not verified in `docs/01_FULL_PLATFORM_AUDIT.md` and limitation 35. Owner must test on a real iPhone |
| Logged-in pages checked against real data | Future Phase | all logged-in screenshots used a mocked API (limitations 35, 35b) |
| Academy UX issues found by the parallel audit (navigation, density) | Not verified | see `docs/TARTIL_13_ACADEMY_UX.md` (a separate document, I did not use its findings here) |

## Phase 3 — Engines, interfaces and backend

### 3a. Quran core and recitation

| Function | Status | Evidence |
|---|---|---|
| Reader: 114 surahs, verse markers, bookmarks, resume | Existing · Tested | reader integrity script (recorded 2,180); `search.test.ts`, `basmala.test.ts` pass |
| Tajweed colouring (display layer, Highlight API with span fallback) | Existing · Tested · Needs Scholarly Approval | `packages/api/test/tajweed-color.test.ts` passes; limitation 27 lists uncovered rules; WebKit result is the owner's to confirm |
| Whole-Quran search (Arabic diacritic-insensitive, English) | Existing · Tested | `packages/api/test/search.test.ts`; limitation 33 (substring only, no root search) |
| English translation (Clear Quran, CC BY-ND) | Existing · Tested · Needs Scholarly Approval | `translations.test.ts`; migration 0011; approval is the owner's provisional one |
| Audio recitation (mp3quran.net stream) and tafsir panel (tafsir_api) | Existing · Needs Content | licences stated as unstated in limitations 31–32; nothing stored |
| Juz / hizb / page navigation | Future Phase | grep of the SPA finds no juz navigation (only the words in lesson text); `docs/02_FEATURE_GAP_MATRIX.md` row 5 |
| Meccan/Medinan, word-by-word meanings | Needs Content | no verified or licensed source loaded (gap matrix rows 6–7) |
| Tasmi' (personal recitation) with word-level alignment | Implemented · Tested (engine) · Blocked (live) | migration 0013, `recitation.ts`, `recitation.test.ts` (9 tests) pass. Live speech-to-text returned HTTP 429 (limitation 37, as recorded; not re-checked). Owner must fix OpenAI billing/quota or supply another provider. Pronunciation and tajweed are not assessed |

### 3b. Learning engines

| Function | Status | Evidence |
|---|---|---|
| Hifz spaced review, due queue, streak (self-assessment) | Existing · Tested | `hifz.test.ts`; migration 0009 |
| Quizzes and mastery map | Existing · Tested · Needs Scholarly Approval | `/me/quiz-attempts`, `/me/mastery`; small AI-authored bank (limitation 25) |
| Foundations (letters, forms, harakat, syllables) | Implemented · Needs Scholarly Approval | `#/foundations`; limitation 38 says draft, no scholarly review |
| Homework system (assign, submit, teacher approve, review queue) | Existing · Tested | `homework.test.ts` (3 tests) pass; migration 0014 applied live with a recorded smoke (limitation 38) |
| Homework offline queue (two light actions) | Implemented | mocked-server Chromium check recorded in limitation 38; no service-worker sync |
| Study plan, daily sabaq/sabqi/manzil board, saved/shared plans | Existing · Tested | `plan.test.ts` passes; migration 0015 |
| Kids Academy hub `#/kids` (4 activities, placement, recommendations) | Implemented · Tested (server) | `kids.test.ts` passes; browser run recorded in `docs/KIDS_ACADEMY_QA.md` |
| Kids server slice (profiles, sync, teacher level override, guardian card) | Tested · Blocked (not live) | migration 0016 not applied, edge function not redeployed (limitation 39). Blocked on the owner's child-data retention policy |
| Passport, certificates, public verify | Existing · Tested | `tracks.test.ts`, DB `tracks.test.ts`; not an ijazah (limitation 19) |
| Supervised AI drafts with human gate | Existing · Tested (fake model) | limitation 15/22; live model is OpenAI via an edge secret; minors' data must not be sent until the owner decides |

### 3c. Formation engines (migration 0017)

| Function | Status | Evidence |
|---|---|---|
| Source records with a three-role review trigger (scholarly, pedagogical, child-protection) | Tested · Blocked | DB `formation.test.ts` and API `formation.test.ts` pass (included in 49/49 and 50/50). No person holds the pedagogical or child-protection role, so nothing can reach `approved` |
| Private reflection log (owner-only RLS, FORCE) | Tested · Blocked | same tests; limitation 40: the DB admin role can read text and backups contain it; blocked on a retention policy |
| Life-mission runs and status projection | Tested | `PUT /i/:inst/missions/:ref`, `GET /me/missions`; a learner id is mandatory on status reads |
| Scenario runs (no aggregation by design) | Tested | `POST /i/:inst/scenarios`; limitation 40: k≥10 aggregation not built, needs written policy |
| Formative observations by teacher/guardian | Tested | `/i/:inst/observations*`; retention rule needed |
| Learner data export and erase (`/me/formation/export`, `DELETE /me/formation/data`) | Tested | formation tests; does not erase observations authored by others |
| Age gate for reflections (kids band c only, verified guardian, live consent) | Tested · Blocked | ages 15–17 have no band; owner decision on recording that range |
| Migration 0017 on Supabase; edge function redeploy | Blocked | not applied, `packages/edge/dist` regenerated locally only (limitation 40, `PROJECT_STATE.md`) |
| **Web UI for any formation engine** | Future Phase | no UI call to `/me/reflections`, `/me/missions`, `/me/scenarios`, `/observations` or `/formation/*` (grep count 0). The academy UI does not use these engines; this is the main gap between backend and product |

## Phase 4 — Heritage-to-Curriculum lab (من التراث إلى التعلم)

Method is specified in `BLUEPRINT.md` §D7. There is no lab application; there is a pipeline whose products exist as files.

| Function | Status | Evidence |
|---|---|---|
| Source registry (74 books, SHA-256, triage) and extraction (50 books) | Existing | `PROJECT_STATE.md`; `scholarly-assets/source-registry`, `extraction` (gitignored) |
| Formation extraction: 40/40 competencies, own-words principles with locators, no quotes | Implemented · Needs Scholarly Approval | commits `4a0e4a9`, `ae59670`; `docs/human-formation/extracted/C1.json … ` (40 files) |
| 40 source passage records | Implemented · Needs Scholarly Approval | `docs/human-formation/records/*.md` (7 files), `PILOT_SOURCE_RECORDS.md` (3 pilot records); commit `771d9bd` |
| Lessons and scenarios generated from the principles | Tested (structure) · Needs Scholarly Approval | Phase 1 rows; `validate_lessons.py` |
| Review records in the database (source record → three-role approval) | Tested · Blocked | Phase 3c; no named reviewers |
| Takhrij of hadith, rights status per source | Needs Content | recorded as fields but "do NOT gate approval" (limitation 40); publication gating stays the owner's |
| Owner licence statement for the books | Existing | `LICENSE_REGISTER.md` (2026-11-03 owner instruction); documents not on file, so extracted text stays internal and paraphrased |
| Interface where a reviewer opens a source record, compares it with the lesson built from it, and approves | Future Phase | `#/academy/review` is a read-only preview; the API for it exists (Phase 3c) but is not wired |
| Madhhab balance of the selected sources | Needs Scholarly Approval | `BLUEPRINT.md` §14: author-assigned labels, reviewer needed |

## Phase 5 — Teacher, parent and institution paths

| Function | Status | Evidence |
|---|---|---|
| Institution creation, members and roles, suspend/reactivate with last-admin guard, roster, stats, audit trail | Existing · Tested | `admin.test.ts`; limitation 29; sections of `#/app/<inst>/…`: overview, tracks, halaqat, homework, recitation, certs, assistant, people, admin |
| Eight curriculum track templates installed on institution creation | Existing · Needs Scholarly Approval | commit `27b4a66`; limitation 28 (proposals, not endorsed) |
| Halaqat, sessions, attendance, Jitsi join | Existing · Tested (API) | `halaqah.test.ts`; limitation 16: external public Jitsi, no recording, real join untested |
| Teacher: recitation review, homework wizard and review queue, plan review | Existing · Tested (API) | `journey.test.ts`, `homework.test.ts`, `plan.test.ts`; no browser E2E of the teacher flow (`docs/02_FEATURE_GAP_MATRIX.md` row 13) |
| Guardian link, verification, consent grant/revoke | Existing · Tested | `journey.test.ts`; DB consent trigger tests |
| Guardian view of a child's submissions and Kids progress card | Implemented | `people` section and kids panel in `index.html`; mocked-data checks only |
| Dedicated parent workspace (child overview across homework, kids, academy) | Future Phase | `docs/11_FINAL_RELEASE_READINESS.md`: "Parent workspace: UI no, backend partial, tested none" |
| Teacher/guardian visibility of academy progress | Future Phase | academy progress is `localStorage` only (Phase 1) |
| Teacher view of academy observations | Implemented (API only) · Blocked | `/i/:inst/observations`; no UI; retention policy missing |
| Adults-only gating of P14–P16 | UI only | data flags in `programs.json`; no account age check exists (ADR-008: no birth date stored; adult registration is a self-ticked checkbox, limitation 18) |
| Password recovery by email | Blocked | no email provider (limitation 14); an admin-reset flow is not built |
| Billing, email invitations | Future Phase | `IMPLEMENTATION_TRACKER.md` item 13 |
| Safeguarding lead, scholarly lead, named qaris | Blocked | **owner decision**: `PROJECT_STATE.md` "Waiting on owner" item 2 |

## Phase 6 — User-journey testing

| Journey | Status | Evidence |
|---|---|---|
| Minor student through RLS: register, guardian link, consent, submission, qari state change | Tested | `packages/api/test/journey.test.ts` (in the 50/50 run) |
| Browser journey: register, create institution, install templates, reach checklist (PGlite) | Tested (recorded, one-off) | `PROJECT_STATE.md` 2026-11-02; script not committed (`IMPLEMENTATION_TRACKER.md` item 20) |
| Academy learner journey (programs, lessons, scenarios, mobile) | Tested | `node scripts/e2e_academy.mjs` passed this session |
| Live API journey (31 checks) | Existing (recorded, not re-run) | `scripts/live/journey_live.py`; run at v9 era per `PROJECT_STATE.md`; the live deployment is now far ahead, current state not verified |
| Brief journeys A–G with real browser end-to-end for logged-in roles | Future Phase | `docs/10_FUNCTIONAL_QA.md`: "no browser end-to-end test"; logged-in pages used a mocked API |
| Teacher end-to-end in browser; parent end-to-end in browser | Future Phase | same |
| Real users (children, teachers, institutions) | Blocked | no pilot has run; needs owner decision on a pilot and on children's data |
| Cross-browser (Firefox, real Safari) | Future Phase | Chromium only everywhere |

## Phase 7 — Content integrity, safety and governance

| Function | Status | Evidence |
|---|---|---|
| Quran quotes in books checked against the stored edition | Existing | 2,541 checked, 2,330 match, 78 relocated, 133 unmatched (`PROJECT_STATE.md`, `verify_quran_crosscheck.py`) |
| Scholarly gate: nothing machine-extracted is PUBLISHED without an active `scholarly_reviewer` and an owner-set `licence_cleared` | Existing · Tested | DB `tracks.test.ts` / isolation tests; limitation 26 |
| Weakness: a tenant admin can assign `scholarly_reviewer` to themselves | Implemented (known, unfixed) | limitation 40 ("inherited from 0002/0010"). The new reviewer roles are deliberately not assignable that way |
| Review queue and scholarly workspace | Existing · Blocked | `SCHOLARLY_REVIEW_QUEUE.md` (44 items); no reviewer appointed, nothing reviewed |
| AI-authored content labelled provisional (tajweed library, quizzes, templates, foundations, academy) | Existing | limitations 24, 25, 28, 38; academy ribbons "draft" in the SPA |
| Child-protection: consent, no learner comparison, no scoring language | Tested | formation tests (structural absence of comparison); e2e language filter |
| Child-data retention and deletion policy | Blocked | **owner decision**; blocks Kids server slice, reflections, missions, scenarios, observations |
| Legal review per jurisdiction (COPPA/GDPR-K etc.), penetration test | Future Phase | limitations 9, 18, 7; see also `docs/TARTIL_13_SECURITY.md` (separate document) |
| Licences for audio, tafsir, books | Blocked | **owner decision**; `LICENSE_REGISTER.md` |
| Type safety of tests | Fixed pending | 6 (API) and 9 (database) `tsc` errors in test files only; `npm run typecheck` therefore fails today |

## Phase 8 — Honest completion report

| Statement | Basis |
|---|---|
| The platform is a private prototype / pilot-ready candidate, not a public release | `docs/11_FINAL_RELEASE_READINESS.md`; nothing in this session contradicts it |
| What is real and tested | 49 DB and 50 API tests pass; 40 lesson units, 16 programs and the academy UI pass their validators and e2e script; the Quran text is intact |
| What is content only | the 40 competencies, 148 lessons, 83 scenarios, 16 programs and 16 guides: draft, unreviewed, no reviewer named |
| What is built but unreachable | formation engines (migration 0017) and Kids server slice (0016): not live, no academy UI, blocked on owner policies |
| What is not built | Heritage lab interface, parent workspace, juz/hizb/page navigation, word meanings, teacher/guardian view of academy progress, browser E2E for logged-in roles |
| Public launch, real children's data, licence clearance | **owner decisions**; no step here takes them |

---

## Top gaps (ranked)

1. **Academy is disconnected from the backend.** Progress lives in `localStorage`; 0 UI calls to the formation API; teachers and parents cannot see anything.
2. **No reviewers, no retention policy.** Every approval path is technically enforced and humanly empty, so no academy content can be approved and no child data can be stored.
3. **No logged-in browser end-to-end tests** for teacher, parent, institution or the live deployment; the live state after v22 is not verified here.

## Evidence

Files read: `CLAUDE.md`, `PROJECT_STATE.md`, `IMPLEMENTATION_TRACKER.md`, `docs/governance/KNOWN_LIMITATIONS.md`, `docs/governance/TEST_RESULTS.md`, `docs/governance/LICENSE_REGISTER.md`, `docs/01_FULL_PLATFORM_AUDIT.md`, `docs/02_FEATURE_GAP_MATRIX.md`, `docs/07_ROUTE_AND_ROLE_COVERAGE.md`, `docs/10_FUNCTIONAL_QA.md`, `docs/11_FINAL_RELEASE_READINESS.md`, `docs/KIDS_ACADEMY_QA.md`, `docs/human-formation/{BLUEPRINT,PROGRAMS}.md`, `programs.json`, `competencies.json`, `packages/web-vercel/index.html` (routes, academy block, nav), `packages/api/src/app.ts` (route list), `git log` (80 commits).

Commands run: the six in the table in section 0; `diff` of the two SPA copies and of `packages/edge/dist/app.ts`; `grep` of the SPA for formation-API calls (0), juz navigation, `localStorage` academy key; directory listings of `docs/human-formation/{records,extracted,guides,lessons}`.

## Open items

- Owner: confirm the TARTIL 13.0 phase titles (inferred above).
- Owner decisions: child-data retention policy; named scholarly, pedagogical and child-protection reviewers; safeguarding lead; apply migrations 0016/0017 and redeploy the edge function; OpenAI quota or another STT provider; licence clearance; public launch; final name.
- Verify live: which migrations (0015 onward) are applied on Supabase and which edge version runs; not verified here.
- Re-run after any change: reader integrity script, axe audit, viewport sweep (not run this session).
- Engineering: wire academy progress, reflections and missions to the API behind the retention decision; build the parent workspace; build the reviewer comparison view; commit a browser E2E for teacher/parent journeys; fix the 15 test-file type errors; make the CI use `--test-concurrency=1`.
- Documentation debt: refresh stale lines in `PROJECT_STATE.md` and `docs/10_FUNCTIONAL_QA.md`.
