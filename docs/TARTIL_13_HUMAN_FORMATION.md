# TARTIL 13.0 — Human Formation Academy (أكاديمية التكوين الإنساني): what exists, review status, guardrails, gaps, expansion plan

Date: 2026-11-03. Scope: `docs/human-formation/` (content + design), the academy viewer in `packages/web-vercel/index.html`, and the formation backend (migration 0017, `/formation/*` API). Every status below comes from a file I read or a command I ran in this session (see Evidence). Anything I did not check is marked "not verified".

Status vocabulary: WORKING, PARTIALLY WORKING, UI ONLY, BROKEN, MISSING, BLOCKED, NEEDS SCHOLARLY REVIEW.

## 1. Bottom line

- The Academy is a **large, internally consistent draft**: 40 units, 148 lessons, 83 branching scenarios, 16 programs, 16 guide sets, 400 extracted source principles, 12 QA logs. All of it is `draft-unreviewed`. **No named scholarly, pedagogical or child-protection reviewer exists**, so nothing is approved and nothing may be called reviewed.
- A learner-facing viewer exists and passes my E2E run. It is **content display only**: progress and private reflections live in the browser's `localStorage`, not on the server.
- A formation backend (source-record review gate, private reflection log, mission/scenario runs, formative observations) is built and its own tests pass **locally**. It is **not applied to production, not wired to the viewer**, and blocked on owner decisions.
- Product stance holds in code and data checks: no numeric scores on character, no learner comparison surface, no fatwa generation, moderate mainstream (wasatiyya) editorial line.
- Main risks found: the viewer shows adult-gated programs and child content to any signed-in user without an age gate (section 6); the five gap drafts X1–X5 are not integrated and fail the project's own validator (section 7).

## 2. What was built (counted by me)

| Asset | Count | Where | How counted |
|---|---|---|---|
| Competencies (K,C,S,T,R,W,L,M) | 40 (cap 48 per BLUEPRINT D10) | `docs/human-formation/competencies.json` | python over the JSON; all 40 have a source record in `academy.json` |
| Units (one per competency) | 40 | `lessons/lessons_G1..G8.json` | 8 groups, `review_status: unreviewed` on all 40 |
| Lessons | 148 (L1 40, L2 40, L3 40, L4 23, L5 5) | same | count of `units[].lessons[]` |
| Branching scenarios | 83 | same, `units[].scenarios[]` | each carries a fictional-example note |
| Activities | 414 (practice 104, discussion 91, reflection 62, scenario 44, story 43, game 40, project 30) | same | count of `lessons[].activities[]` |
| Programs | 16 in 8 age bands (P01–P16) | `programs.json`, `PROGRAMS.md` | statuses: 12 planned, 2 pilot (P06, P07), 2 adults_gated (P15, P16) |
| Guide sets (guide + parent + FAQ) | 16 | `guides/P01..P16.json` | all `review_status: unreviewed` |
| Extracted source principles | 400 (10 per competency) from 162 distinct book labels | `extracted/*.json` | kinds: principle 199, practice 102, story-lesson 50, caution 49 |
| Source records (SPR-xx) | 40 competencies covered, in 7 record files + pilot file | `records/`, `PILOT_SOURCE_RECORDS.md` | paraphrase + heading locators, no book text |
| Gap drafts | 5 files, 9 units, 28 lessons, 20 scenarios | `gaps/X1..X5.json` | not in programs or viewer data |
| QA logs | 12 (8 lesson groups, 4 guide batches) | `qa/` | see section 4 |
| Design docs | BLUEPRINT (D1–D12), COMPETENCIES, PEDAGOGY, PROGRAMS, SOURCE_MAP, PILOT_SOURCE_RECORDS | `docs/human-formation/*.md` | |

Lesson shape (all 148): hook, key ideas, 1–3 activities, life practice with private reflection prompt, formative descriptors (ظهر / يتدرب / يحتاج دعمًا), source basis, safeguards, guide script, closing. Scenarios: node graphs with non-punitive per-choice feedback; the validator checks dangling `next`, endings, and age floors.

Age coverage (from lesson `age_range` lower bounds): 12 lessons start at age 6 or below, 24 at 7 or below, 45 at 9 or below, 16 at 18+. Lowest scenario `age_min` is 5.

Program ladder (PROGRAMS.md section 1): 5–8 P01→P05; 9–12 P06→P08; 13–17 P09–P11; 16+ P12 (work), P13 (leader/mentor); 18+ P14 (public responsibility), P15 (couples, deferred), P16 (parenting, deferred).

## 3. Components and their status

| Component | Status | Evidence |
|---|---|---|
| Content corpus (units/lessons/scenarios) | NEEDS SCHOLARLY REVIEW (and pedagogical, child-protection review); structurally WORKING | `validate_lessons.py --enriched` on G1–G8: 40 units, 0 problems (run by me) |
| Programs and sequencing | WORKING as data; NEEDS SCHOLARLY REVIEW | `validate_programs.py`: 16 programs, 148 lessons, 83 scenarios, coverage 231/231, 0 issues (run by me) |
| Guides (mentor + parent + FAQ) | NEEDS SCHOLARLY REVIEW | 16 files, all `unreviewed`; QA covers them in four batches |
| Source extraction (`extracted/`) | NEEDS SCHOLARLY REVIEW; rights not cleared | flags below |
| Viewer `#/academy` (programs, journey, lesson player, scenario player, competencies, reviewer board `#/academy/review`) | PARTIALLY WORKING | `scripts/e2e_academy.mjs` passed (my run): 16 program cards, 148 lessons walked step by step to the closing screen, 83 scenarios opened, banned score/rank wording scan, no horizontal overflow at 390 px, no JS errors. Chromium only. |
| Viewer data sync | WORKING | `packages/web-vercel/academy-{lessons,programs,guides}.json` equal the `docs/human-formation` sources, and `packages/web/` copies equal too (compared by me) |
| Learner progress and private reflection in the viewer | PARTIALLY WORKING (device-local only) | `acLS` uses `localStorage` keys `acx_done`, `acx_ref_<lesson>`; no API call from the academy code |
| Server persistence of formation data | BLOCKED (not applied to Supabase, no UI) | KNOWN_LIMITATIONS 40; migration 0017 exists locally |
| Source-record review gate (3 distinct reviewer roles) | WORKING locally (tests), BLOCKED live | DB `formation.test.ts` 11/11, API `formation.test.ts` 5/5 (my runs, local PGlite) |
| Reflection log, mission runs, scenario runs, observations | WORKING locally, BLOCKED live | same tests; owner-only RLS, no score columns |
| Production deployment of the academy viewer | not verified | I did not query Vercel; PROJECT_STATE says the web app sits behind Vercel Authentication |
| Mentor/parent dashboards for observations | MISSING | no UI calls `/i/:inst/observations` (grep of `index.html`) |
| Audio/video lessons | MISSING by decision | BLUEPRINT D6, D14: no cleared recordings |
| Project-based, mission and personalised-plan engines in the UI | MISSING | only backend routes exist |

Test numbers: the project docs claim DB 49/49 and API 50/50. I did **not** reproduce those totals: a full `npm test` was killed by the sandbox under load (api `admin.test.ts` SIGKILL), so I ran only the formation files (16 tests, all passing). Treat the totals as "reported, not re-verified by me".

## 4. Review status (explicit)

**Everything is an unreviewed draft.** Facts:

- `review_status: unreviewed` on all 40 units, all 16 guide sets; lesson files carry `status: draft-unreviewed`; programs carry `status: draft-unreviewed` (programs.json header); the viewer shows a "draft under review" ribbon.
- Reviewer roles `pedagogical_reviewer` and `child_protection_reviewer` exist in the DB (0017) but are **held by nobody**; `scholarly_reviewer` is also unassigned (PROJECT_STATE item 2). So no source record can reach `approved`.
- BLUEPRINT D9 requires three named reviewers: scholarly, developmental-pedagogical, child-protection; P15/P16 additionally need family-counselling and legal reviewers (`programs.json` gating).
- Machine QA is **not** review. The 12 QA logs record automated/independent editorial passes: they fixed wording defects (stereotyped family roles, adult-child private contact, physical touch, internal contradictions, grammar) and referred undecided items to humans. By my count of H-rows, referred items: G1 9, G4 12, G5 12, G7 12, G8 12, guides P01–P04 9, guides P09–P12 14 (G2, G3, G6, P05–P08 and P13–P16 use other row formats, so I did not count them; not verified). These referrals are open work for the named reviewers.
- Verse references: 88 reference entries (73 distinct) in 36 units; none are quoted. The rule is that verse text comes only from the verified Tanzil edition in Tartil, and that edition is itself only provisionally approved by the owner, with no scholarly audit.
- Hadith: none quoted and none graded; `extracted/` flags show `ungraded-hadith` 227 times, `needs-reviewer` 260, `contested-ruling` 94, `outdated-context` 85, `harsh-language` 78, `attribution-doubtful` 61, `sectarian-tone` 14. Each flagged item has a `not_to_take` note.
- Source reading depth is shallow and the blueprint says so: only selected passages were read, not whole books; the madhhab balance of sources was classified from general knowledge and needs a scholar to confirm (BLUEPRINT section 14).
- Rights: the extraction files are committed under `docs/` and hold paraphrases with book titles and line-number locators. 121 of 400 ideas contain short « » fragments (longest 13 words, 5 of 8+ words). I did not verify whether any are verbatim from third-party text. **Owner decision / rights review** before any publication. Locators point at gitignored local files (`scholarly-assets/_inputs/books`), so they cannot be checked by anyone without that private corpus.

## 5. Guardrails: stated, and where they are enforced

| Guardrail | Stated in | Enforced / checked how | Status |
|---|---|---|---|
| No numeric grades or scores on character; no ranking or comparison of children | CLAUDE.md, BLUEPRINT D1/D5/D9, PEDAGOGY 1 and 4.3 | Lesson validator regex rejects score/rank phrases; E2E scans every lesson and scenario screen for banned wording; DB test scans all columns for `score|grade|rank|points|mark|rating|percent` and all functions for `leaderboard|rank|compare|cohort|aggregate`; API test scans route list | WORKING for what is tested; the viewer has no leaderboard code |
| Formative language only (ظهر / يتدرب / يحتاج دعمًا) | BLUEPRINT D5 | Present in all 148 lessons (`formative` key); validator requires it | WORKING |
| Moderate mainstream (wasatiyya), plural across madhhabs, no takfir or tabdi', no polemics | CLAUDE.md (owner instruction 2026-11-03), PEDAGOGY 1.3 | Source selection and `sectarian-tone` / `not_to_take` flags; no automated check | NEEDS SCHOLARLY REVIEW (balance unconfirmed) |
| No fatwas or rulings; AI never issues a ruling | CLAUDE.md, BLUEPRINT D1/D9 | Safeguard text in lessons and guides; "تعليم عام وليس استشارة" in family/money topics; no ruling-generation code path found in the formation routes (route list read) | WORKING as policy; wording needs review |
| No text shown from third-party books to learners | CLAUDE.md | Lessons carry paraphrase and fictional examples; viewer renders with `textContent` only; reviewer board shows paraphrased records and heading locators | PARTIALLY WORKING (see rights note) |
| Scenarios are labelled fictional ("مثال تعليمي معاصر") and not mixed with historical narration | BLUEPRINT D7 | Validator requires `fictional_note` on every scenario | WORKING |
| Children: no unsupervised adult-child contact, open-space sessions, no recording without guardian consent | CLAUDE.md, PEDAGOGY | QA logs show repeated fixes inserting "no private session" language; DB trigger for minors' recordings exists elsewhere (0002) | PARTIALLY WORKING; child-protection reviewer needed |
| Private reflection | BLUEPRINT D6 | Viewer: device-local `localStorage`. Backend: owner-only RLS (FORCE), text never logged or sent to AI (API test) | WORKING locally; DB admin role and backups can still read text (KNOWN_LIMITATIONS 40) |
| Reflection age gate | KNOWN_LIMITATIONS 40 | DB: adult, or minor in kids band c (11–14) with verified guardian and live `reflection_journal` consent; band b refused; 15–17 refused until an age-band decision | BLOCKED on owner decision |
| Nothing machine-extracted is published without recorded reviewers | CLAUDE.md, 0002/0017 | Source records need three distinct named roles on the current content; edits void approvals; one person cannot fill two roles; author cannot review | WORKING locally (tests); no reviewers exist |
| Political content: analytic and balanced, no candidates or campaigns | BLUEPRINT D9.6 | P14 design only | NEEDS SCHOLARLY REVIEW |

Known structural weakness (inherited, KNOWN_LIMITATIONS 40): a tenant admin can still self-assign `scholarly_reviewer` through the members API, so the scholarly leg of the gate is only as strong as who is appointed. The two new roles cannot be self-assigned that way.

## 6. Defects and risks I found in the shipped viewer

1. **No age or role gate in the academy viewer.** `academyView()` only checks that a token exists (`if(!token){location.hash='#/auth'…}`). `programs.json` has `gating.adults_only` and `needs_named_reviewers`, but `index.html` never reads them. Result: any signed-in user, including a minor, can open P12–P16 (family, marriage, parenting, leadership) and every other program. P15/P16 get only an "awaiting specialist review" pill (`acProgCard`) and remain openable. Status: **PARTIALLY WORKING; BROKEN against BLUEPRINT D4 rule 3** (sensitive family topics for adults only). Recommended fix (engineering, not done): hide or lock programs whose `gating.adults_only` is true until an adult role and named reviewers exist.
2. **Child-facing content is visible without guardian linkage.** Programs for ages 5–8 are reachable by any signed-in account; there is no guardian or teacher mediation in the viewer. Fits "preview" only; fails the intent of D9 for real children.
3. **Comment says "Unlisted route"** (`index.html` line 1434) but the route is in the main navigation list and on the signed-in home card (lines 459 and 500). The comment is stale.
4. **Progress is per browser.** Clearing storage or switching device loses it; mentors and parents cannot see it. Not a defect for a preview, but it means the "teacher and parent dashboard" claim of the blueprint is UI-less today.
5. **Gap drafts are invisible** to the viewer and to programs (grep for `X1-L1`, `GAP-X3`, `X5-L1` in `programs.json` and the viewer data returned nothing).

## 7. Gaps

### 7.1 The five gap drafts (X1–X5)

All five are `draft-unreviewed`, each with a `needs_owner_decision` note, and none is wired into programs or the viewer. I ran the project validator over them: **15 problems** (my run), which shows they have not been through the same enrichment and QA as G1–G8.

| Gap | Units (min age) | Lessons / scenarios | Validator problems | Needed before merge |
|---|---|---|---|---|
| X1 money and agreements | W2 budget and keeping commitments (18), W3 clear agreements and honest work (18) | 6 / 4 | 10 (key_ideas count outside 2–4; reflection/discussion activities missing `questions[]`) | Named scholarly, pedagogical/adult-safeguarding, and **contemporary financial/legal reviewer** to confirm the "general education, not advice" line; decide whether to keep or drop content on grace to a debtor and good repayment (إنظار، حسن القضاء) |
| X2 young researcher | T6 (16), K3 (16) | 6 / 4 | 0 beyond records marked "to be created with the scholarly reviewer" | Scholarly and pedagogical reviewers; replace imaginary examples in the lesson on scholarly disagreement with documented ones; decide whether it joins P12/P13 or becomes its own program |
| X3 listening, recitation, reflection | GAP-X3-A calm before recitation (8), GAP-X3-B private notes and respect for differing readings (11) | 6 / 4 | 2 (competency ids not in the register) | Owner decision on a standalone track and which competency (K4 or T1); `verse_refs` set with the scholarly reviewer; child-protection specialist; review of the passages on qira'at and schools |
| X4 daily habits for younger children | S3 (6), S2 (10) | 6 / 4 | 2 (missing `source_record`) | Owner decision to merge into S3/S2 or keep separate; pedagogical and child-protection reviewers; confirm no health or religious-ruling content |
| X5 digital responsibility | X5 (11) | 4 / 4 | 1 (X5 is not a registered competency) | Owner decision: add a 41st competency (still under the 48 cap) or fold into W2/T-series; scholarly and child-protection reviewers |

### 7.2 Younger age bands

- **MISSING: anything below age 5.** Lowest lesson floor is 5 (K4, C3, C6 units; 3 units).
- **Thin for 5–7.** Program P01 (ages 5–7, 4 weeks, two stages, 5 items in total per `programs.json`) is the only program that opens at 5. P02 opens at 7. Twelve lessons start at 6 or below; the others in that range lean on one-lesson levels (L1 only). Developmental review of 5–9 and 10–17 is flagged as required in BLUEPRINT section 14 and has not happened.
- **X3/X4 are the drafts that would add age 6–8 content**, but they are unintegrated (7.1).
- **Not built for children** (KNOWN_LIMITATIONS): server-side child profiles feeding mentors/parents, audio activities, pronunciation AI for letters, children's data retention policy. Real children must not use the formation backend until the retention policy exists. **Owner decision.**
- BLUEPRINT D12 phase 3 says pilot programs should have no children under 10; P06 and P07 (ages 10–12 and 11–12) are the designated pilots, consistent with that.

### 7.3 Content and evidence gaps (from SOURCE_MAP section 3 and BLUEPRINT)

- No licensed modern reference for developmental psychology, family counselling, finance or management. Heritage sources alone cannot ground P11, P12, P15, P16.
- No hadith is cleared; none may be published before takhrij and reviewer approval.
- Whole books were not read; most of the 8,423-title library was classified by title and author only.
- Audio/video: deferred (no cleared recordings).
- Impact measurement: nothing in the system measures behaviour change; only descriptive observations are designed (and not surfaced in any UI).

## 8. Expanded packages: Family, Marriage, Work, Leadership (plan only)

Rule for this section: **nothing here may be shown to users before its content is approved.** The expansion packages are specified so the owner can decide, not so they can ship. They reuse existing competencies (BLUEPRINT D8: new features must answer "which competency, which existing engine").

| Package | Existing programs and competencies | Draft content today | Missing before any exposure |
|---|---|---|---|
| Family (الأسرة) | P16 parenting (R7, R1, C3; 4 weeks; age 20+; adults_gated), R4 honouring parents (P03) | P16 guide and lessons exist as unreviewed drafts | Scholarly, family-counselling and child-protection reviewers; licensed contemporary developmental reference; local-law note; owner decision on audience age floor |
| Marriage (الزواج) | P15 (R6, R2, R3, C4; 4 weeks; age 18+; adults_gated) | Drafts exist; BLUEPRINT D11 #12 marks it deferred | Scholarly, family-counselling and **legal** reviewers (personal-status law differs by country, e.g. Lebanon); referral pathway for violence or personal crises; private reflection that is never sent to anyone; no individual advice |
| Work (العمل) | P12 (W1, W3, C2) with X1 (W2, W3) as an unmerged supplement; P11 (W2, W4, L4, R3) for teens | P12/P11 drafts; X1 adult drafts | Contemporary finance/employment reviewer; licensed modern references; decision on whether adults 18+ and 16–17 share P12 |
| Leadership (القيادة) | P13 (M1, M2, L2, T3, T4, T6), P14 (L3, M1–M3), P10 shura (T4, T5, L1) | Drafts; P14 designed as analytic and non-partisan | Balanced-case selection reviewed by a scholar and an independent educator; no candidate or campaign content; mentor-feedback rules for peers who may be minors |

Gating sequence the owner can adopt (suggested, not decided):

1. Appoint named reviewers (scholarly, pedagogical, child-protection; plus family-counselling and legal for P15/P16). **Owner decision.**
2. Provide licensed modern references for family/finance/management, or accept heritage-only content with the limits stated. **Owner decision.**
3. Reviewers sign source records in the review gate (needs migration 0017 applied live; **owner decision** on child-data retention first).
4. Lock P12–P16 in the viewer behind `gating.adults_only` plus an adult-role check (engineering task; section 6, item 1).
5. Pilot P06 and P07 first (the blueprint's own recommendation: launch two programs, not sixteen); apply the delete rule (D10 rule 5) after one review cycle.
6. Only then expose expansion packages, one at a time, to adult accounts.

Anti-bloat limits to respect (BLUEPRINT D10): competencies at most 48 (now 40; X5 would make 41), four new engines only, no new program until existing ones are used and reviewed, at most three new activities per lesson.

## 9. Owner decisions pending (not taken here)

1. Name scholarly, pedagogical and child-protection reviewers (plus family-counselling and legal for P15/P16).
2. Child-data retention and deletion policy; how to record the 15–17 age band; whether band b (7–10) may ever use the reflection log.
3. Whether to apply migration 0017 to Supabase and redeploy the edge function.
4. Rights: clearance of editions used for `extracted/` and `records/`; whether those files stay in the repository; permission for any wider library scan.
5. Whether to add a licensed modern reference (psychology, finance, management) and under what licence.
6. Merge, keep separate, or drop X1–X5; whether X5 becomes competency 41.
7. Public launch timing and which program(s) pilot first.

## 10. Open items

- Re-run the full `npm test` on an unloaded machine to confirm DB 49/49 and API 50/50 (not reproduced here).
- Run the academy E2E on a real WebKit/Safari and a real phone (only Chromium at 390 px was exercised).
- Add the age/role gate and a guardian path to the viewer; remove the stale "Unlisted route" comment.
- Wire (or consciously defer) viewer progress and reflection to the server API once policy exists.
- Bring X1–X5 up to the G1–G8 standard (enrichment, source records, QA) before any merge decision.
- Resolve the QA referral rows (H-items) with the human reviewers; unify character names that recur across units (QA G8 H5).
- Verify the « » fragments in `extracted/` against the sources for verbatim copying.
- Confirm deployment state of the viewer on Vercel (not checked).
- Close PROJECT_STATE wording: it says "Web/mobile UI … not built" in an old section while the academy viewer exists; the KNOWN_LIMITATIONS "no UI" statement applies to the formation backend only.

## Evidence

Files read: `CLAUDE.md`, `PROJECT_STATE.md`, `IMPLEMENTATION_TRACKER.md`, `docs/governance/KNOWN_LIMITATIONS.md` (items 40 and kids notes), `docs/human-formation/BLUEPRINT.md`, `PEDAGOGY.md` (opening), `PROGRAMS.md`, `COMPETENCIES.md` (opening), `SOURCE_MAP.md` (headings, section 3), `PILOT_SOURCE_RECORDS.md` (opening), `qa/QA_G1.md`, `qa/QA_G5.md`, `qa/QA_GUIDES_P01.md`, `qa/QA_GUIDES_P13.md` (and the headings and summaries of the other QA files), `competencies.json`, `programs.json`, `lessons/lessons_G1..G8.json`, `gaps/X1..X5.json`, `guides/P01.json`, `extracted/*.json`, `scripts/build_academy.py`, `scripts/validate_lessons.py`, `scripts/e2e_academy.mjs`, `packages/web-vercel/index.html` (academy code, lines 1434–1625, and navigation lines 447–500), `packages/api/src/app.ts` (formation routes, lines 1026–1170), `packages/database/migrations/0017_formation_engines.sql`, `packages/database/test/formation.test.ts`, `packages/api/test/formation.test.ts`, `.gitignore`, `docs/11_FINAL_RELEASE_READINESS.md`.

Commands run (all local, read-only with respect to project files; no network, no deploy, no database writes outside in-memory test DBs):
- `python3 -I scripts/validate_lessons.py --enriched docs/human-formation/lessons/lessons_G*.json` → 40 units checked; 0 problems.
- `python3 -I scripts/validate_programs.py` → programs=16 lessons=148 scenarios=83 covered=231/231; 0 issues.
- `python3 -I scripts/validate_lessons.py --enriched docs/human-formation/gaps/X*.json` → 6 units checked; 15 problems (listed in 7.1). The validator reported "6 units checked" although the gap files hold 9 units; I did not investigate why.
- Python scripts for counts (units, lessons, activities, scenarios, ages, flags, verse refs, principle kinds) and for equality of `packages/web-vercel` and `packages/web` academy JSON with the docs sources.
- `npx tsx --test test/formation.test.ts` in `packages/database` → 11 pass, 0 fail.
- `npx tsx --test test/formation.test.ts` in `packages/api` → 5 pass, 0 fail.
- `node scripts/e2e_academy.mjs` → "all checks (1–6) clean" for 16 programs, 148 lessons, 83 scenarios.
- `npm test` at repo root: not completed (killed under load); no totals reported from it.

Not verified: Vercel/Supabase deployment state, real-device rendering, the project-claimed full-suite totals, scholarly accuracy of any content, rights status of the extracted material.
