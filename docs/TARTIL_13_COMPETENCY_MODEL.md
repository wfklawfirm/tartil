# TARTIL 13.0 - Competency Model (نموذج الكفايات)

Date: 2026-11-03. Scope: the 40-competency Human Formation framework (8 domains) checked against (a) the domains of the owner's TARTIL 13.0 document, (b) the fields the model is supposed to carry, (c) the assessment rules, (d) review status. Every claim cites a file or a command I ran. Status vocabulary: WORKING, PARTIALLY WORKING, UI ONLY, BROKEN, MISSING, BLOCKED, NEEDS SCHOLARLY REVIEW. Anything I could not check is marked "not verified".

## 0. Read this first

1. **The twelve domains of the owner's 13.0 document are not in the repository and were not in my brief.** The only owner summary available to me is the one-paragraph brief (`brief_docs13.md`). `docs/05_CURRICULUM_AND_COMPETENCY_MAPPING.md` and `docs/governance/KNOWN_LIMITATIONS.md` item 10/line 53 already record that the earlier "19 units / 105 competencies" originals are absent as well. I did not reconstruct the twelve. Section 3 therefore does two things: it maps the three areas the owner named (recitation, memorisation, Quranic sciences) exactly, and it gives a repo-derived proxy list that the owner can replace row by row. **Owner decision / owner input needed: the twelve-domain list.**
2. **The model is a draft that nobody has reviewed.** All 40 competencies carry `review_status: "unreviewed"` (counted from `docs/human-formation/competencies.json`). No account holds `pedagogical_reviewer` or `child_protection_reviewer` (`docs/governance/KNOWN_LIMITATIONS.md` section 40). Nothing here is NEEDS-REVIEW-cleared.
3. **Test status is not verified.** I ran `npm test` in `packages/database`; the runner killed `test/concepts-load.test.ts` and `test/formation.test.ts` with SIGKILL (about 35 s and 54 s). I re-ran `formation.test.ts` alone: SIGKILL again after about 29 s, 0 passed, 1 failed (log: scratchpad `docs13_formation.log`). The machine had about 3 GB free RAM with other processes running, so I suspect memory pressure, but I did not diagnose it. The "DB 49/49, API 50/50" figures in `IMPLEMENTATION_TRACKER.md` (section 40) and the source-level claims below are therefore read from test code, not from a green run. I did run `python3 -I scripts/validate_programs.py`: `programs=16 lessons=148 scenarios=83 covered=231/231`, `0 issues`.

## 1. The model at a glance

Source of truth: `docs/human-formation/competencies.json` (40 entries). `packages/web/academy.json` and `packages/web-vercel/academy.json` are byte-identical to each other (`diff -q`: no output) and equal the JSON field-for-field plus an added `record` field (checked by script: 0 differing entries). Display names come from `academy.json` `domains`.

| Domain | Arabic | Competencies | Count | min_age range |
|---|---|---|---|---|
| K Knowledge & Understanding | المعرفة والفهم | K1 text in context, K2 verify news/source, K3 text vs commentary vs ijtihad, K4 recitation/memorisation/revision | 4 | 5-12 |
| C Character & Ethics | الخلق والقيم | C1 truthfulness, C2 trustworthiness, C3 mercy, C4 justice, C5 humility, C6 gratitude | 6 | 5-8 |
| S Self-Management | إدارة الذات | S1 self-watch, S2 time, S3 habits, S4 perseverance, S5 anger, S6 learning from error | 6 | 6-10 |
| T Thinking & Learning | التفكير والتعلّم | T1 questions, T2 critical thinking, T3 methodical inference, T4 decisions, T5 problem solving, T6 self-directed research | 6 | 7-12 |
| R Relationships & Family | العلاقات والأسرة | R1 listening, R2 communication, R3 conflict, R4 parents/kin, R5 friends/neighbours, R6 marriage partnership, R7 parenting | 7 | 6-20 |
| W Work & Economic Life | العمل والحياة الاقتصادية | W1 professional trust, W2 money, W3 fair dealing/contracts, W4 initiative | 4 | 12-16 |
| L Leadership & Society | القيادة والمجتمع | L1 shura, L2 public responsibility, L3 governance (analytic), L4 community service | 4 | 10-18 |
| M Teaching & Mentorship | التعليم والإرشاد | M1 teaching by questions, M2 mentoring/feedback, M3 fair assessment | 3 | 16-18 |

Shape checks (script over `competencies.json`): every competency has exactly 5 levels; all `prerequisites` resolve to existing ids; 20 of 40 have prerequisites; one age inversion exists (S6 `min_age` 8 requires S1 `min_age` 10). The BLUEPRINT cap is 48 competencies (`BLUEPRINT.md` D3, D10): 40 is within it.

What stands on top of the model (counts from the files):
- 148 lessons in `packages/web-vercel/academy-lessons.json`, all 40 units present, 3-5 lessons each; lesson levels L1-L5 all occur. Unit `target_levels`: 18 units L1-L4, 17 units L1-L3, 5 units L1-L5.
- 16 programs in `docs/human-formation/programs.json`: 2 `pilot`, 2 `adults_gated` (P15, P16), 12 `planned`.
- 40 source records (`record` field), but only 4 anchors across the whole model are "passage-read" (C1, C5, S5 twice, all from al-Dhari'a); 117 anchors are `heading-only`.
- UI: `#/academy`, `#/academy/c/<id>`, `#/academy/review` render this data from static JSON (`packages/web-vercel/index.html`, functions `acCompetencies`, `acReview`); status **UI ONLY for browse and read**: it is a static reader with a "draft" banner, the lesson "done" flag is stored in `localStorage` (`acLS`), nothing is written to the server. A real-browser check of these pages is not part of this document (not verified here).

## 2. Per-competency model state: honest summary

| Layer | State | Evidence |
|---|---|---|
| Definitions, 5 levels, prerequisites, anchors | PARTIALLY WORKING, NEEDS SCHOLARLY REVIEW | `competencies.json`; all unreviewed |
| Source anchors | NEEDS SCHOLARLY REVIEW | 117/121 heading-only; hadith not graded (`BLUEPRINT.md` D7, `PEDAGOGY.md` line 172) |
| Lessons and scenarios per competency | PARTIALLY WORKING | 148 lessons; `validate_programs.py` 0 issues; no lesson has a `review_status` key (148/148 absent; the unit has it) |
| Competency stored in the database | MISSING | No competencies table. Migration `0017_formation_engines.sql` stores only the id string (`competency_id text CHECK (~ '^[A-Z][0-9]{1,2}$')`) in `source_records` and `formative_observations`. There is no foreign key and no existence check (the pattern accepts `Z99`). API `compId` in `packages/api/src/app.ts` line 1023 uses the same regex |
| QCEF (105-item framework from the earlier kit) | BLOCKED | Not loaded, uncalibrated (`KNOWN_LIMITATIONS.md` item 10; `IMPLEMENTATION_TRACKER.md` row 14) |

## 3. Coverage against the twelve domains of the 13.0 document

### 3.1 The three areas the owner named

| Area named by owner | Competency coverage | Verdict |
|---|---|---|
| Recitation (التلاوة) and tajweed | Only K4, and K4's definition is one line: "the current Tartil engine: controlled recitation, memorisation, scheduled revision" (`competencies.json` K4). Levels: with a teacher / memorises a short passage / revises on a schedule / revises with mastery and finds own errors / teaches others with the teacher's permission. No tajweed-rules competency, no makharij/sifat competency, no fluency or listening-to-reciters competency | **MISSING as a model** (the engines exist elsewhere, see below) |
| Memorisation (الحفظ) and revision | Same K4, merged with recitation. 3 lessons (K4-L1..L3, `target_levels` L1-L3), so levels 4-5 have no lesson | **PARTIALLY WORKING** (one competency, no L4/L5 lessons) |
| Quranic sciences (العلوم القرآنية: revelation context, Makki/Madani, naskh, qira'at, rasm, i'jaz, tafsir method) | No competency. K1 (text in context) and K3 (text vs commentary vs ijtihad) are general text-handling skills and name no Quranic science. K1-K3 lessons cite verses via `verse_refs` that "need verification against the Tartil text" | **MISSING** |

Why this gap is invisible in the product: the Quran-core engines do not reference competency ids at all. Evidence: `grep competenc` over `packages/database/migrations/*.sql` returns hits only in 0002 (a content `kind` value) and 0017; hifz (0009), recitation attempts (0013), homework (0014), study plans (0015) and kids (0016) have no competency column. So the nucleus of the platform (`BLUEPRINT.md` D8: "the Quran... remain the nucleus") is not expressed in the competency model, and the model cannot record progress on it.

Engines that exist but sit outside the model (status from `docs/governance/KNOWN_LIMITATIONS.md` and `IMPLEMENTATION_TRACKER.md`, not re-verified by me):

| Area | Engine | Status per the repo's own documents |
|---|---|---|
| Recitation submission and teacher review | `recitation_attempts` (0013), API tests | PARTIALLY WORKING; mic untested on real devices |
| Tajweed rules | tajweed library, 4 quizzes, rule-based colouring layer | NEEDS SCHOLARLY REVIEW; colouring covers a subset of rules (KNOWN_LIMITATIONS 27) |
| Hifz and revision | spaced-review scheduler (0009), study plan page | WORKING as self-assessment, not a teacher assessment (KNOWN_LIMITATIONS 25) |
| Qira'at and sanad | overview page, self-declared sanad register | PARTIALLY WORKING; Hafs text only; no ijazah issued |
| Tafsir | tafsir panel from a public repository with unstated licence | PARTIALLY WORKING (KNOWN_LIMITATIONS 32) |
| Quranic sciences | none (no Makki/Madani data, no asbab al-nuzul content) | MISSING (KNOWN_LIMITATIONS line 53; `02_FEATURE_GAP_MATRIX.md` row 6) |

### 3.2 Repo-derived proxy list (replace with the owner's twelve)

This is **not** the owner's list. It is the set of areas the repository's own documents use, so the owner can see which competencies already cover which. "Covered by" lists competencies whose definition, levels or lessons plausibly address the area; "plausibly" is my reading of the definitions, not a reviewed mapping.

| # | Area (proxy) | Covered by | Coverage |
|---|---|---|---|
| 1 | Recitation and tajweed | K4 (thin) | Not covered as a model |
| 2 | Memorisation and revision | K4 | Thin (no L4/L5 lessons) |
| 3 | Quranic sciences | none | Not covered |
| 4 | Understanding the Quran (tafsir method, meaning) | K1, K3 (general) | Weak; no Quran-specific competency |
| 5 | Arabic foundations (letters, harakat) | none in the model | Not covered by competencies; a separate `#/foundations` page exists (KNOWN_LIMITATIONS 38) |
| 6 | Character and ethics | C1-C6 | Covered (draft) |
| 7 | Self-management | S1-S6 | Covered (draft) |
| 8 | Thinking and learning | T1-T6, K2 | Covered (draft) |
| 9 | Family and relationships | R1-R7 | Covered (draft); R6/R7 adults-gated |
| 10 | Work and economic life | W1-W4 | Covered (draft) |
| 11 | Leadership, shura, society | L1-L4 | Covered (draft) |
| 12 | Teaching and mentorship | M1-M3, K4 L5 | Covered (draft) |

Result: 7 of 12 proxy rows are covered by the competency model; the 3 Quran-core rows the owner named (1, 2 thin, 3) and the Arabic-foundations and Quran-understanding rows are not. The 40 competencies are overwhelmingly human-formation (36 of 40 outside K4's and K1-K3's text skills); the "nucleus" is one competency.

Options for the owner (not decided here): (a) add Quran-core competencies, bounded by the BLUEPRINT cap of 48 (8 slots left, `BLUEPRINT.md` D10 #2 forbids exceeding without review); (b) keep K4 as an umbrella and let the existing engines be the evidence source for it; (c) make Quran-core a separate framework. Scholarly input needed on the content of any recitation or Quranic-sciences competency (**owner decision: appoint the scholarly lead**).

## 4. Required fields vs. what `competencies.json` has

"Required" = the competency card template in `BLUEPRINT.md` D3 (the R1 model card) plus the source/review rules in D7 and D9. The owner's 13.0 document may require more; I could not see it.

| Required field (BLUEPRINT D3/D7) | In `competencies.json` | Status |
|---|---|---|
| id, domain, name | `id`, `domain`, `name` (40/40) | WORKING |
| Definition (التعريف) | `definition` (40/40); 39 of 40 under 80 characters; K4's is a pointer to an engine, not a definition | PARTIALLY WORKING |
| Audience / categories (الفئات) | `min_age` only. No upper bound, no adult-only flag; adults-gating lives in `programs.json` (P15, P16), not on the competency | PARTIALLY WORKING |
| Prerequisites (المتطلبات السابقة) | `prerequisites` (20/40 non-empty, all valid) | WORKING (one age inversion S6/S1) |
| Levels L1-L5 | `levels` (5 per competency) | WORKING; but BLUEPRINT says L5 is "adults only" and 36 competencies with `min_age` under 18 still define an L5 (K4 L5 "teaches others with the teacher's permission" at `min_age` 5). No field says L5 is gated |
| Objectives (الأهداف) | Absent at competency level; exists per lesson (`objective`, 148/148) | PARTIALLY WORKING |
| Behavioural indicators (المؤشرات) | The `levels` strings act as indicators, one clause each; no observable-evidence list per level | PARTIALLY WORKING |
| Candidate sources (المصادر المرشحة) | `anchors[]` {book, locator, verification} (40/40) | NEEDS SCHOLARLY REVIEW (117 heading-only, 4 passage-read) |
| Activities (الأنشطة) | `activity` (one line) | PARTIALLY WORKING |
| Application (التطبيق) | `life_practice` (one line) | PARTIALLY WORKING |
| Assessment (التقييم) | Absent at competency level (the original draft in `COMPETENCIES.md` had a per-competency "assessment" line; the JSON dropped it). The rule exists globally in `PEDAGOGY.md` section 4 and per lesson as `formative` (3 states x 148 lessons) | PARTIALLY WORKING |
| Reuse / related competencies (إعادة الاستخدام) | Absent. Only `prerequisites`; BLUEPRINT's "connects to S5 and R2" style links are not stored | MISSING |
| Safeguard | `safeguard` (40/40) | WORKING as text; NEEDS SCHOLARLY REVIEW |
| Review status | `review_status` single string, all `unreviewed` | PARTIALLY WORKING |
| Reviewer identity, role, date, version, content hash (D7/D9: "named reviewer signature") | Absent from the JSON. The database has them for source records only (`source_record_reviews` with role scholarly/pedagogical/child_protection and content hash, migration 0017) | MISSING for competencies |
| Source passage record link (D7 fields 1-7) | `record` text in `academy.json` (40/40); rights status, takhrij status are columns only in the database `source_records` table, not in the JSON | PARTIALLY WORKING |

Other model-quality findings from reading the JSON:
- Data inconsistency: S6 (age 8) depends on S1 (age 10), so a child of 8-9 is allowed S6 but not its prerequisite.
- The name of S6 differs between documents ("learning from error" in `BLUEPRINT.md`; "learning from error and repentance" in `competencies.json`). Minor, but it is a definition-level difference to settle with the reviewer.
- `anchors[].book` embeds source ids in free text, e.g. "دستور الأخلاق (8665)"; there is no structured `source_id`, so linking to the source registry needs string parsing.
- No version field: a definition change cannot be tied to the observations recorded against the older definition.

## 5. Assessment rules: descriptive, not numeric

### 5.1 The rule as written
`docs/human-formation/PEDAGOGY.md` section 4 and `BLUEPRINT.md` D5/D9: no grades, points, ranks or comparison badges; three states only, each with a behavioural text note: appeared (ظهر), practising (يتدرب), needs support (يحتاج دعمًا); the third state changes the support, not the blame. Observers: teacher (session behaviour), guardian (home practice, optional), learner (self-reflection from age 10, private, not aggregated).

### 5.2 What is enforced in code (read from source; not re-run, see section 0)

| Rule | Enforcement | Evidence |
|---|---|---|
| Only three statuses | `CHECK (status IN ('appeared','practicing','needs_support'))`; API zod enum | migration 0017 `formative_observations`; `app.ts` line 1132; API test posts `status: 'score_9'` and expects 400 (`packages/api/test/formation.test.ts` line 157); DB test expects a CHECK failure (`packages/database/test/formation.test.ts` line 224) |
| A text note is mandatory (1-2000 chars after trim) | CHECK on `note` | migration 0017 |
| No numeric grade or rank stored | No such column; unknown request keys (`score`, `grade`) are ignored; response keys contain no score/grade/rank | API test lines 74 and 149 |
| Who may write | Only a linked teacher (`qari`) or a verified guardian; `author_id <> learner_id`; author cannot be forged | RLS `fo_insert`, CHECK |
| Who may read | Learner, author, verified guardian, linked teacher. Not tenant admin, safeguarding, reviewers, other teachers, other tenants | RLS `fo_select`; DB test lines 210-216 |
| No cross-learner comparison | No view, function, column or route compares learners; the API requires `learnerId` for reads; no listing across children | `app.ts` comment at line 1129; migration 0017 header; `KNOWN_LIMITATIONS.md` section 40 |
| No audit or AI path for free text | No audit trigger on these tables; DB test asserts 0 audit rows | DB test line 136 |
| Self-reflection is private | Separate table `reflection_entries`, owner-only RLS | migration 0017; DB test line 238 |

### 5.3 What is NOT enforced (rule stated, nothing stops a violation)

1. **Numeric `level` (1-5) is stored with every observation.** It is the developmental level L1-L5, not a score, but a UI or a report that sums or averages it would be a numeric grade by another name. No UI exists yet; the risk must be handled when one is built. **Open design question for the owner and the pedagogical reviewer: keep a numeric level, or store the level as a label.**
2. **The three states have no operational definition in the database.** "Appeared" means seen more than once in one or two different situations (`PEDAGOGY.md` 4.1); the schema cannot check that. Nor can it check "do not build a state on one session", "describe behaviour not character", "name no other child", or "end with a support step".
3. **The competency id is not validated** against the 40 (the regex accepts any letter plus one or two digits) and **the level is not checked against the competency's defined levels** (for example L5 for a competency whose lessons target L1-L3).
4. **Age and gating are not tied to the competency**: R6 and R7 (adult) can be observed for any learner the author is linked to; nothing consults `min_age` or `adults_gated`.
5. **Risk cases** (persistent anxiety, scrupulosity, self-harm, violence; `PEDAGOGY.md` 4.4 #4) must be referred, not recorded as "needs support". Nothing detects or blocks this; it depends on the author.
6. **The observation does not point to a lesson, scenario or evidence item**; a note cannot be traced to the activity that produced it.
7. **Retention and deletion of observations are undefined.** The learner's erase endpoint removes only what the learner owns; teacher and guardian observations stay (`KNOWN_LIMITATIONS.md` section 40). The child-data retention policy is an **owner decision** and is a stated precondition for any real child using this.
8. A teacher or guardian can loop over their own linked children client-side to compare; RLS cannot prevent it (`KNOWN_LIMITATIONS.md` section 40).

### 5.4 State of the assessment feature as a whole

| Piece | Status |
|---|---|
| Descriptive rules text (PEDAGOGY 4) | WORKING as documentation; NEEDS SCHOLARLY REVIEW (pedagogical and child-protection reviewers unappointed) |
| Per-lesson descriptive rubric (`formative`: ظهر / يتدرب / يحتاج_دعما with an example sentence each) | WORKING as content in 148/148 lessons; shown on the lesson page (`index.html` line 1557); NEEDS SCHOLARLY REVIEW |
| Observation tables, RLS, API routes (`/i/:inst/observations`) | PARTIALLY WORKING: written and tested in code, not applied to production (migration 0017 not applied, edge function not redeployed; `KNOWN_LIMITATIONS.md` section 40); my own run of the tests did not complete (section 0) |
| Teacher and parent UI to record or read observations | MISSING (no UI; `grep` of `index.html` finds the academy reader only, no observation form) |
| Mapping of Arabic labels to the English enum (`يحتاج_دعما` to `needs_support`) | Not implemented anywhere; the two vocabularies coexist |

## 6. Review status

| Item | State | Evidence |
|---|---|---|
| Competency register | draft v0.1, `unreviewed` 40/40 | `competencies.json`; `COMPETENCIES.md` header "مسودة للمراجعة" |
| Source anchors | heading-only 117, passage-read 4; hadith not graded; no source record is `approved` | `competencies.json`; `BLUEPRINT.md` D7 |
| Lessons (148) and scenarios (83) | `draft-unreviewed`; lesson `review_status` key absent | `programs.json` header, `PROGRAMS.md`, lessons JSON |
| Reviewer roles | `pedagogical_reviewer`, `child_protection_reviewer` exist in the schema but nobody holds them; the three-role approval gate cannot be passed | migration 0017; KNOWN_LIMITATIONS section 40 |
| Scholarly leg | Inherited weakness: a tenant admin can self-assign `scholarly_reviewer` (0002/0010) | KNOWN_LIMITATIONS section 40 |
| UI wording | Academy pages show a draft banner and a review board (`acDraft`, `acReview`) | `index.html` |
| Editorial line | Moderate mainstream Sunni, plural across schools, as standing owner instruction | `CLAUDE.md` |

Owner decisions this model waits on (not taken here): name the scholarly, pedagogical and child-protection reviewers; write the child-data retention and deletion policy; decide the twelve-domain list and whether Quran-core competencies are added or kept as an umbrella; decide the treatment of the numeric `level`; decide whether competency definitions move into the database.

## 7. Evidence

Files read:
- `/home/claude/quran-global-platform/CLAUDE.md`, `PROJECT_STATE.md`, `IMPLEMENTATION_TRACKER.md`
- `/home/claude/quran-global-platform/docs/governance/KNOWN_LIMITATIONS.md` (sections 25-27, 32, 38-40)
- `/home/claude/quran-global-platform/docs/05_CURRICULUM_AND_COMPETENCY_MAPPING.md`, `docs/02_FEATURE_GAP_MATRIX.md`
- `/home/claude/quran-global-platform/docs/human-formation/competencies.json`, `COMPETENCIES.md`, `BLUEPRINT.md` (D3-D10), `PEDAGOGY.md` (section 4), `PROGRAMS.md`, `programs.json`, `PILOT_SOURCE_RECORDS.md`, `SOURCE_MAP.md` (headline rows)
- `/home/claude/quran-global-platform/packages/web-vercel/academy.json`, `academy-lessons.json`, `packages/web-vercel/index.html` (academy functions)
- `/home/claude/quran-global-platform/packages/database/migrations/0017_formation_engines.sql`; grep of all migrations for `competenc`
- `/home/claude/quran-global-platform/packages/database/test/formation.test.ts`, `packages/api/test/formation.test.ts`, `packages/api/src/app.ts` (lines 1023-1139)

Commands run:
- Python scripts (read-only) over `competencies.json`, `academy.json`, `academy-lessons.json`: counts of domains, levels, prerequisites, anchors, lessons, formative keys, age inversion, copy equality.
- `diff -q` between the `packages/web` and `packages/web-vercel` JSON copies: identical.
- `python3 -I scripts/validate_programs.py`: `programs=16 lessons=148 scenarios=83 covered=231/231`, `0 issues`.
- `npm test` in `packages/database`: killed by SIGKILL (`concepts-load`, `formation`); `npx tsx --test test/formation.test.ts` alone: SIGKILL, 0 pass / 1 fail. Cause not diagnosed.

## 8. Open items

1. Obtain the owner's twelve domains; replace section 3.2 with a real matrix.
2. Decide how the Quran-core (recitation, tajweed, memorisation, Quranic sciences) enters the model; scholarly lead needed for content.
3. Re-run the database and API test suites on a machine without the SIGKILL, and record the real pass counts.
4. Add missing competency fields if the owner wants them: assessment, related competencies, upper age or adult-only flag, objectives, version, reviewer and date.
5. Fix S6/S1 age inversion and settle the S6 name.
6. Add validation of competency id and level against the 40 (and a competency table or checked list) before any UI writes observations.
7. Decide numeric `level` versus label; define the Arabic-to-English status mapping.
8. Appoint reviewers; nothing in this model can reach "reviewed" until then.
9. Browser check of `#/academy/c/<id>` and `#/academy/review` was not part of this task (not verified).
