# TARTIL 13.0 - Test Results (actual runs, 2026-11-03)

Status vocabulary: WORKING, PARTIALLY WORKING, UI ONLY, BROKEN, MISSING, BLOCKED, NEEDS SCHOLARLY REVIEW. "not verified" means I did not run or read it.

Scope: what was actually executed in this session, with counts copied from the logs, and an honest map of which user scenarios have a real automated test. Nothing here was run against production, Supabase or any live API. No code or data was changed to produce these results.

## 1. Test commands, from the repository

| Workspace | `test` script (package.json) | Notes |
|---|---|---|
| root | `npm run test --workspaces --if-present` | runs only workspaces that define `test` |
| `packages/api` | `tsx --test test/*.test.ts` | Fastify API through real RLS on PGlite (in-process Postgres WASM) |
| `packages/database` | `tsx --test test/*.test.ts` | migrations 0001-0017, RLS, triggers on PGlite |
| `packages/edge`, `packages/web`, `packages/web-vercel` | none (no package.json) | the SPA `packages/web-vercel/index.html` has no unit tests |

Not in `npm test` (separate scripts): `scripts/validate_lessons.py`, `scripts/validate_programs.py`, `scripts/e2e_academy.mjs`, `scripts/qa/reader_integrity.mjs` (needs the live API), `scripts/live/journey_live.py` (needs a deployed API). `npm run typecheck` was not run.

## 2. Results actually obtained

| # | Command | Result | Evidence |
|---|---|---|---|
| 1 | `npm test` (root, default parallel) | NOT A VALID RESULT. Output was cut by my tool's time limit ("Terminated"); the three files that printed `not ok` (api `formation`, `halaqah`, `hifz`) failed with `signal: SIGKILL`, `exitCode: ~`, not with assertion errors. The cause is not verified (likely process kill under load, since the machine was shared and load average reached about 38 during the session). | first run, tail of output |
| 2 | `packages/database`: `npx tsx --test --test-concurrency=1 test/*.test.ts` | `# tests 49`, `# pass 49`, `# fail 0`, `# cancelled 0`, `# skipped 0`, duration 121 s | scratchpad `dbR.log` |
| 3 | `packages/api`: `npx tsx --test --test-concurrency=1 test/*.test.ts` | `# tests 50`, `# pass 50`, `# fail 0`, `# cancelled 0`, `# skipped 0`, duration 206 s | scratchpad `apiR.log` |
| 4 | `python3 -I scripts/validate_lessons.py --enriched` | `40 units checked; 0 problems`, exit 0 | scratchpad `vl.log` |
| 5 | `python3 -I scripts/validate_programs.py` | `programs=16 lessons=148 scenarios=83 covered=231/231`, `0 issues`, exit 0 | scratchpad `vp.log` |
| 6 | `node scripts/e2e_academy.mjs` | Run 1 FAILED: `fatal: page.goto: Page crashed` on `#/academy` (browser crash, under load). Run 2 (idle machine) PASSED: "all checks (1-6) healthy" over 16 programs, 148 lessons, 83 scenarios, exit 0 | scratchpad `e2e.log`, `e2e2.log` |

Plain reading: with test concurrency 1, all 99 Node tests (49 DB + 50 API) pass. A plain `npm test` run could not be reproduced to completion in this session because it was killed; that is a reliability finding (section 6, item 1), not a green result. Totals are 49+50=99; they match the counts of `test(` declarations in the files (API 50, DB 49), and none is skipped, so the two conditional tests (real Tanzil file in `basmala.test.ts`, concept load in `concepts-load.test.ts`) did run.

Count per file (declared tests, all passed in runs 2 and 3):

| Package | File | Tests |
|---|---|---|
| database | `isolation.test.ts` 17, `formation.test.ts` 11, `canon.test.ts` 6, `halaqat.test.ts` 6, `tracks.test.ts` 4, `hosting-and-import.test.ts` 3, `concepts-load.test.ts` 1, `tanzil-real.test.ts` 1 | 49 |
| api | `recitation` 9, `tracks` 7, `formation` 5, `halaqah` 4, `journey` 4, `tajweed-color` 4, `hifz` 3, `homework` 3, `admin` 2, `basmala` 2, `scholarly` 2, `translations` 2, `kids` 1, `plan` 1, `search` 1 | 50 |

## 3. What each check proves, and what it does not

| Check | Proves | Does NOT prove |
|---|---|---|
| DB tests | RLS isolation, consent trigger for minors, immutable audited tables, scholarly-gate triggers, formation privacy (reflections, scenario runs, observations, no ranking surface) on PGlite | behaviour on real Supabase/Postgres (live check predates migrations 0006-0017: `docs/TARTIL_13_SECURITY.md` section 5) |
| API tests | HTTP behaviour through RLS, role guards, no SQL or hash leakage, rate limit, per-route denials | any browser behaviour; external speech-to-text; real storage upload (fake signer only) |
| `validate_lessons.py --enriched` | structural validity of 40 competency units in lesson files | pedagogical, scholarly or child-safety quality (all content is `draft-unreviewed`: NEEDS SCHOLARLY REVIEW) |
| `validate_programs.py` | 16 programs reference existing lessons/scenarios; 231 of 231 items covered, 0 orphans | that programs are good learning paths |
| `e2e_academy.mjs` | in Chromium at 390x800 (Arabic locale), with the API mocked to a fixed user object: 16 program cards on home; each program page contains the "step by step journey" heading; every one of 148 lessons opens and all steps can be walked to the closing section; no horizontal overflow; no JS errors; a banned-wording scan (scores/ranking/leaderboard phrases, `BANNED` in the script) is clean; every scenario page opens; the first scenario can be completed to its reflection | desktop widths, WebKit/Safari, dark mode, real login, real API, persistence, screen reader, any teacher/parent/institution screen |

## 4. Scenario matrix A-F

The owner's original definitions of scenarios A-F are not in the repository (same finding as `docs/TARTIL_13_SECURITY.md` section 5; the only references are `docs/10_FUNCTIONAL_QA.md:12` and `docs/KIDS_ACADEMY_QA.md:2`, which list "journeys/acceptance A-G" as lacking browser tests but do not define them). The labels below are MY interpretation from the 13.0 summary (learner, child with parent, teacher, parent, institution, cross-party denial). Owner decision: confirm or replace these definitions.

Legend for "Automated test": API+RLS = HTTP through Postgres RLS on PGlite; DB = SQL-level on PGlite; Browser = real browser. Every row is local, none ran live.

| Scenario (interpreted) | Automated coverage that exists (file: test name) | Browser E2E | Status |
|---|---|---|---|
| **A. Adult/teen learner walks the Academy** (browse program, lesson, scenario, reflection) | Browser, content only: `scripts/e2e_academy.mjs` (all 148 lessons walked, 83 scenario pages open, 1 completed). Backend: `api/formation.test.ts` "reflection log through the API: owner only; minors need age band, verified guardian and consent; export and erase", "life missions, scenarios and observations through the API..."; `database/formation.test.ts` "reflection: an adult may write...", "life missions: private steps...", "scenario runs: owner-only node ids, no score...". Also `api/tracks.test.ts` "tracks -> progress -> passport -> certificate -> public verification; minors withheld" and `api/hifz.test.ts` "hifz: add, validate range, review schedules...". | Only the read-through of content with a mocked API. Saving a reflection or scenario run from the UI is not exercised (mock returns the same user object for every `/api/` call). | PARTIALLY WORKING (content walk and backend rules tested separately; the join between UI and backend is not tested) |
| **B. Child with guardian consent and safeguards** | `database/isolation.test.ts` "minor recording requires live guardian consent; revoke/expiry/unrevoke handled", "guardian sees only verified-linked child; unverified link sees nothing", "adult student may record without guardian consent"; `api/journey.test.ts` "full journey: onboarding -> minor student -> guardian consent -> recitation -> qari feedback; other tenant sees nothing"; `api/homework.test.ts` "homework journey: teacher assigns -> child views/starts/submits (audio w/ guardian consent)..."; `database/formation.test.ts` "reflection: minimum age 10... and a live guardian consent for a minor"; `api/kids.test.ts` "kids academy progress: ... teacher/guardian see only their own children". | None. `docs/KIDS_ACADEMY_QA.md` records a manual Chromium check of the kids pages (no automated script found for it; not re-run). | PARTIALLY WORKING at API+DB; UI journey not automated |
| **C. Teacher assigns, observes, reviews** | `api/homework.test.ts` (3 tests: journey, "mark-done mode, no-review shortcut, retry-disabled, requests, templates, batch, summary, overdue", "attaching a tasmi attempt is a labelled hypothesis, never a grade"); `api/halaqah.test.ts` "halaqah journey over HTTP: circle, members, session, attendance, qari assessment, visibility"; `api/plan.test.ts` "study plan: private by default, shared only by the student, teacher approves..."; `api/formation.test.ts` "life missions, scenarios and observations...: guardian/teacher see status only and only for one named learner"; `database/halaqat.test.ts` (6 tests); `database/tracks.test.ts` "only an assigned qari marks progress; the student cannot self-mark". | None | PARTIALLY WORKING at API+DB; no teacher UI test |
| **D. Parent/guardian oversight** | Only as part of B and C above: guardian visibility in `database/isolation.test.ts` (guardian/consent tests), `api/kids.test.ts`, `api/formation.test.ts` (status-only view), `database/formation.test.ts` "formative observations: only the learner, the author, the verified guardian and linked teachers...". No test is named for a dedicated parent dashboard or workflow. | None | PARTIALLY WORKING (rules tested; whether a parent workspace exists in the UI is not verified here and `KNOWN_LIMITATIONS.md:53` lists "parent workspace" as absent) |
| **E. Institution admin** (roster, suspension, stats, audit, tracks, certificates) | `api/admin.test.ts` (2 tests: roster/suspension rules/stats/audit trail with non-admins refused; second admin and last-admin protection); `database/isolation.test.ts` "audit log: written automatically, readable only by admin/safeguarding, immutable for everyone", "tenant admin sees only own institution"; `database/tracks.test.ts` "certificate only when the whole track is complete, only by admin, and only for a published track"; `api/scholarly.test.ts` (reviewer workflow). | None | PARTIALLY WORKING at API+DB; no admin UI test |
| **F. Cross-party denial** (other institution, other teacher, outsider) | Strongest coverage. `database/isolation.test.ts`: "forged institution context (user is not a member) => nothing visible", "tenant admin cannot write into another institution", "one person, two institutions: role in A grants nothing in B", "cross-tenant foreign keys are impossible even for the owner"; `database/halaqat.test.ts` "attendance of another institution cannot be created or read across tenants"; `api/journey.test.ts` (other tenant sees nothing); `api/homework.test.ts` (unrelated teacher gets 404); `api/kids.test.ts`; `api/halaqah.test.ts`; `api/formation.test.ts` "there is no route that compares, ranks, lists or aggregates several learners"; `database/formation.test.ts` "no view, function or column anywhere compares, ranks, scores or aggregates learners". Line-level table: `docs/TARTIL_13_SECURITY.md` section 5. | None | WORKING at API+DB on PGlite; live Supabase isolation check predates migrations 0006-0017 (not verified live) |

Not mapped to A-F because the 13.0 summary names them separately, with their coverage:

| Area | Automated test | Status |
|---|---|---|
| Heritage-to-Curriculum lab (source records, three-role approval) | `database/formation.test.ts` "approval trigger: approved only with three distinct role approvals...", "one person holding two reviewer roles cannot stand in for two reviewers..."; `api/formation.test.ts` "source records through the API: reviewers only..." | Gate WORKING on PGlite; the lab UI, if any, has no test: not verified |
| Quran text integrity | `database/canon.test.ts` ("verbatim, hash-checked and immutable", counts 6236/114), `database/tanzil-real.test.ts`, `api/tajweed-color.test.ts` "colouring never alters the text" | WORKING locally; `scripts/qa/reader_integrity.mjs` (browser vs live text) was not run (needs live API) |
| Recitation alignment | `api/recitation.test.ts` (9 tests: normalisation, alignment, "never claims pronunciation or tajweed judgement", 501 without provider) | WORKING for alignment logic; live speech-to-text BLOCKED (`KNOWN_LIMITATIONS.md:37`, HTTP 429) |

## 5. Coverage that does NOT exist (do not claim)

1. No browser test of any logged-in flow with a real or realistic API. The only browser test mocks every `/api/` call with one fixed user object.
2. No browser test of teacher, parent, guardian or institution-admin screens. Journeys A-G have no browser E2E (`docs/10_FUNCTIONAL_QA.md:12`; unchanged by this session).
3. No automated accessibility, RTL/LTR sweep, visual-regression or performance test in the repository scripts. `docs/10_FUNCTIONAL_QA.md` records axe-core and viewport sweeps as one-off Playwright runs; I did not find scripts for them in `scripts/` and did not re-run them: not verified.
4. `e2e_academy.mjs` runs at one width (390 px), one locale, light theme only (dark mode not checked in the script).
5. No test against live Supabase/Edge in this session. `scripts/live/journey_live.py` exists and writes test rows to a live database: deliberately not run.
6. No test for Academy progress persistence (no server-side Academy progress tables are exercised by the browser test), for offline/service worker (`sw.js`), or for the Heritage lab UI.
7. Content quality is untested by design: lesson and scenario text is draft and unreviewed; `validate_*` checks structure only. NEEDS SCHOLARLY REVIEW and pedagogical and child-protection review (owner decision: appoint reviewers).

## 6. Findings and risks from running the suite

1. `npm test` is not reliable on a loaded or small machine: the default run launches many PGlite instances in parallel (node test runner), and three API files were SIGKILLed in my first attempt. With `--test-concurrency=1` everything passes (206 s API, 121 s DB). Recommendation: set concurrency in the package `test` scripts, or document it. I did not change the scripts (out of scope).
2. `e2e_academy.mjs` is sensitive to load (one `Page crashed` under heavy load, passed when idle). A flaky signal, not a product bug, but it should not be a release gate without a retry.
3. The root `npm test` does not run the Python validators or the browser E2E, so a green `npm test` says nothing about Academy content. These must be run explicitly.
4. The older record `docs/governance/TEST_RESULTS.md` (27 DB, 4 API, dated 2026-11-01) and `PROJECT_STATE.md` (API 31, DB 38, browser journey 10/10) are stale against today's 49 DB and 50 API. I did not edit them. The "browser journey 10/10" claim has no script in this repository that I could identify: not verified.

## Evidence

Commands run (all from `/home/claude/quran-global-platform`, cwd of each as noted):
- `npm test` (root; invalid result, see section 2 row 1)
- `cd packages/database && npx tsx --test --test-concurrency=1 test/*.test.ts`
- `cd packages/api && npx tsx --test --test-concurrency=1 test/*.test.ts`
- `python3 -I scripts/validate_lessons.py --enriched`
- `python3 -I scripts/validate_programs.py`
- `node scripts/e2e_academy.mjs` (twice)

Files read: `package.json`, `packages/api/package.json`, `packages/database/package.json`, `CLAUDE.md`, `scripts/e2e_academy.mjs`, `scripts/qa/reader_integrity.mjs` (header), `scripts/live/journey_live.py` (header), all `packages/api/test/*.test.ts` and `packages/database/test/*.test.ts` (test names via grep), `docs/10_FUNCTIONAL_QA.md`, `docs/KIDS_ACADEMY_QA.md`, `docs/governance/TEST_RESULTS.md`, `docs/governance/KNOWN_LIMITATIONS.md` (by grep), `PROJECT_STATE.md` (by grep), `docs/TARTIL_13_SECURITY.md` section 5.

Raw logs (scratchpad, not in the repo): `/tmp/claude-0/-home-claude/a15fb9d9-e5d4-57e1-b4d4-18cfe5debcdc/scratchpad/{dbR.log,apiR.log,vl.log,vp.log,e2e.log,e2e2.log}`.

## Open items

- Owner: supply the original text of scenarios A-F (or confirm section 4 interpretation).
- Add a browser E2E for at least one logged-in journey against a local API + PGlite or staging Supabase (owner decision on staging data; no real child data).
- Fix `npm test` concurrency so the root command is reproducible; consider a retry in `e2e_academy.mjs`.
- Re-run live isolation checks for tables added after migration 0006 (staging only).
- Update stale counts in `docs/governance/TEST_RESULTS.md` and `PROJECT_STATE.md` (owner of those files to decide).
- Not verified: `npm run typecheck`, `reader_integrity.mjs`, `journey_live.py`, dark mode and desktop widths of the Academy, WebKit.
