# TARTIL 13.0 - Curriculum Architecture (as built, 2026-11-03)

Scope: the owner's hierarchy Academy -> Domain -> Program -> Path -> Level -> Competency -> Module -> Lesson -> Activity -> Assessment, mapped against what actually exists in the repository. Audit only; no code or data was changed. Status vocabulary: WORKING, PARTIALLY WORKING, UI ONLY, BROKEN, MISSING, BLOCKED, NEEDS SCHOLARLY REVIEW. Anything not checked is written "not verified".

## 1. Summary

- The curriculum content layer is real and internally consistent: 16 programs, 40 competencies, 148 lessons, 83 scenarios, 414 activities, every lesson and scenario placed in a program (validator: 0 issues, 231/231).
- All of it is `draft-unreviewed` static JSON served to the browser. There is no curriculum entity in Postgres: no academy, domain, program, path, level, module or assessment table. The only DB tables that touch it hold free-text references (`competency_id`, `mission_ref`, `scenario_ref`).
- Learner progress in the Academy lives in browser `localStorage` only (`acx_done`). Server-side formation tables (migration 0017) exist locally and are NOT applied to production.
- The tracks tables (migration 0008) model Quran units only (`recitation|memorization|tajweed|review`), not the formation curriculum.
- The owner's "ten initial programs (section 19)" are not in the repository, so they cannot be compared item by item (section 8).
- Program admission is not enforced anywhere: age and "adults-gated" status are display notes in the UI; no enrolment record exists.

## 2. Hierarchy versus actual entities

| Owner level | Where it exists today | Form | Status |
|---|---|---|---|
| Academy | Two UI modules: `#/academy` (formation) and `#/kids` (letters/foundations); no entity. `packages/web-vercel/index.html` (acLoad, ACG groups) | UI grouping only | UI ONLY |
| Domain | Competency id prefix letter (K,T,S,C,R,L,W,M = 8 domains) in `academy.json` and `docs/human-formation/competencies.json` (field `domain`) | Static JSON; no table | PARTIALLY WORKING (data), MISSING (DB) |
| Program | `programs.json` (16 programs P01-P16) | Static JSON, 3 identical copies (see 5) | PARTIALLY WORKING |
| Path | `programs[].next_programs` and `prerequisites` (the latter free text such as "P01 or equivalent") | Static JSON; not machine-checkable | PARTIALLY WORKING |
| Band (not in owner list) | `programs.json` `bands` b1-b8; `kid_profiles.band` a/b/c in migration 0016 | Two incompatible band schemes (see 6) | PARTIALLY WORKING, inconsistent |
| Level | Lesson `level` L1-L5 and `target_levels` per competency; `formative_observations.level` 1-5 (0017) | JSON + DB smallint | PARTIALLY WORKING |
| Competency | 40 entries, each with 5 level descriptors, anchors, safeguard, `min_age`; `source_records.competency_id` regex `^[A-Z][0-9]{1,2}$` (0017) | JSON; DB stores only the id string, no FK to a competency table | PARTIALLY WORKING |
| Module | Closest equivalent: `programs[].stages[]` (2-4 per program, with weeks, purpose, mission, check) | JSON only | PARTIALLY WORKING (named "stage", not "module") |
| Lesson | `academy-lessons.json` units[comp].lessons (148) with objective, duration, hook, key ideas, guide script, formative check, source basis, safeguards | JSON; rendered by the lesson player in index.html | PARTIALLY WORKING; NEEDS SCHOLARLY REVIEW |
| Activity | `lessons[].activities[]` (414): practice 104, discussion 91, reflection 62, scenario 44, story 43, game 40, project 30 | JSON only; no activity entity or attempt log for formation (kids activities have `kid_attempts`, 0016) | PARTIALLY WORKING |
| Assessment | Per-lesson `formative` text, per-stage `check`, program `capstone`; DB: `formative_observations` (0017, qari/guardian notes, statuses appeared/practicing/needs_support) | Descriptive only; no graded assessment, no rubric engine, no item bank for formation | PARTIALLY WORKING (observations local only), MISSING (assessment engine) |

## 3. Database entities (migrations 0008, 0016, 0017)

| Table | Migration | What it holds | Relation to the hierarchy | Status |
|---|---|---|---|---|
| `learning_tracks`, `track_units`, `unit_progress`, `certificates` | 0008 | Institution-owned tracks; unit `kind` limited to recitation/memorization/tajweed/review with optional surah/ayah range | Quran learning path only. Not wired to programs. Curriculum templates (8 of 11 per IMPLEMENTATION_TRACKER; count not re-verified) are hard-coded in `TEMPLATES` in index.html and are proposals, not endorsed | WORKING for Quran tracks (tests below); MISSING for formation |
| `ai_suggestions` | 0008 | Human-gated AI drafts | Not curriculum | n/a |
| `kid_profiles`, `kid_attempts` | 0016 | band a/b/c, placement new/adv, teacher override; attempts for 4 activities (rec, match, pair, har) | Letter-foundations academy only | PARTIALLY WORKING (applied live per PROJECT_STATE; not re-verified here) |
| `source_records`, `source_record_reviews` | 0017 | Versioned source records per competency; three-role review (scholarly, pedagogical, child_protection) | Competency-level provenance gate | PARTIALLY WORKING locally; BLOCKED for production by owner decisions |
| `reflection_entries`, `life_mission_runs`, `life_mission_status`, `scenario_runs`, `formative_observations` | 0017 | Learner reflections, mission progress, scenario choices, adult observations | Activity/assessment traces keyed by free-text refs | PARTIALLY WORKING locally; no UI; NOT applied to Supabase (PROJECT_STATE) |

Observations read from `0017_formation_engines.sql`:
- `app.ref_ok` only validates the format `^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$`. A `mission_ref` or `scenario_ref` is not checked against any real program, lesson or scenario. A typo or a retired id is accepted. (Read in code; not exercised.)
- There is no table that says "learner X is enrolled in program P" or "learner has completed lesson L". Completion is only `localStorage` in the browser (`acDone()` in index.html) or, for missions and scenarios, the 0017 tables (local).

## 4. Static content: quantities verified

Commands run: `python3 -I scripts/validate_programs.py` returned `programs=16 lessons=148 scenarios=83 covered=231/231`, `0 issues`. A separate script over `academy-lessons.json` and `programs.json` gave the numbers below.

| Item | Count | Source |
|---|---|---|
| Competencies (units) | 40 across 8 domains: R7, C6, S6, T6, K4, W4, L4, M3 | `packages/web-vercel/academy-lessons.json`, `docs/human-formation/competencies.json` |
| Lessons | 148 (L1: 40, L2: 40, L3: 40, L4: 23, L5: 5) | same |
| Scenarios | 83 | same |
| Activities | 414 | same |
| Programs | 16; stage items sum to 231 (each of the 148 lessons and 83 scenarios is used exactly once) | `programs.json` |
| `review_status` | `unreviewed` for all 40 units; file status `draft-unreviewed` | `academy-lessons.json`, `programs.json` |
| Guides | One file per program, P01-P16 | `docs/human-formation/guides/`, served as `academy-guides.json` |

Level coverage: only 23 lessons at L4 and 5 at L5, so the five-level ladder is thin above L3 (5 lessons at L5 in total). Whether this is intended is a pedagogical-reviewer question.

Declared versus actual competencies per program (script over stage items):
- P12 declares `C2` but none of its 9 lessons and 4 scenarios belong to C2 (actual: W1, W3).
- P15 declares C4, R2, R3, R6; items come only from R6.
- P16 declares C3, R1, R7; items come only from R7.
- All other programs match their declared competency list exactly.

## 5. Program registry and duplication

`programs.json` exists in three places: `docs/human-formation/programs.json` (source), `packages/web-vercel/academy-programs.json` and `packages/web/academy-programs.json`. Parsed contents are identical for all 16 programs in the first two (compared field by field; the files differ byte-wise, formatting only). The `packages/web` copy was compared with `cmp` against the web-vercel copy: identical. `academy-lessons.json` in `packages/web` and `packages/web-vercel` is byte-identical (`cmp`). There is no build step that proves the copies stay in sync (not verified; no script found).

## 6. The sixteen programs versus the bands

| ID | Title | Band | Age | Status | Weeks | Prerequisite (free text) | Needs reviewers |
|---|---|---|---|---|---|---|---|
| P01 | خطواتي الأولى | b1 | 5-7 | planned | 4 | none | scholarly, pedagogical, child protection |
| P02 | أضبط نفسي وأسأل وأحفظ | b1 | 7-8 | planned | 8 | P01 or equivalent | same |
| P03 | صدقي وأمانتي وبرّي | b1 | 8 | planned | 7 | P01 or eq. | same |
| P04 | أرحم وأعدل وأتواضع وأشكر | b1 | 8 | planned | 8 | P01 or eq. | same |
| P05 | أسمع وأتكلم وأصاحب | b1 | 8 | planned | 8 | P02 or eq. | same |
| P06 | أتثبّت قبل أن أصدّق | b2 | 11-12 | pilot | 8 | none | same |
| P07 | أضبط غضبي وأصلح | b2 | 10-12 | pilot | 8 | P02 or eq. | same |
| P08 | أصدقائي وخلافاتي | b2 | 11-12 | planned | 8 | P05 or eq. | same |
| P09 | أميّز وأستدل وأبحث | b8 | 14-17 | planned | 8 | P06 or eq. | same |
| P10 | أقرر بالشورى | b3 | 15-17 | planned | 8 | P09 or eq. | same |
| P11 | مالي ومبادرتي | b3 | 15-17 | planned | 8 | P08 or eq. | + financial literacy; `deferred_reason` set |
| P12 | أمانة العمل والعهد | b6 | 16+ | planned | 8 | P08 or P11 | scholarly, pedagogical, legal |
| P13 | قائد ومرشد ناشئ | b7 | 16+ | planned | 8 | P09 or P10 | scholarly, pedagogical, child protection |
| P14 | المسؤولية العامة والتقييم العادل | b4 | 18+ | planned | 8 | P13 or eq. | + political neutrality; adults only |
| P15 | نحو بيت مستقر | b5 | 18+ | adults_gated | 4 | none | + family counselling, legal; deferred |
| P16 | تربية أبنائي | b5 | 20+ | adults_gated | 4 | none | deferred |

Inconsistencies found in the data (all read from `programs.json` and `docs/human-formation/PROGRAMS.md`):
1. **Age gap.** Programs exist for 5-12, then 14-17 (P09) and 15-17 (P10, P11). Nothing is defined for ages 13-14 although band b3 is labelled 13-17. Band b3's own `program_ids` list only P10 and P11 (min age 15).
2. **Band ids are not ordered by age.** P09 is band b8 (14-99), P12 b6, P13 b7. `next_band` chain: b3 -> b4 -> b5, b6 -> b7, b8 -> b7. The path P08 -> P09 crosses b2 -> b8, and P12 (b6, 16+) is reached from P08 or P11. The UI hides this by hard-coded id lists (`ACG` in index.html: P13, P15, P16 in "family and teachers"; P12, P14 in "young adults and professional life").
3. **Age ranges versus lesson ages.** 10 lessons assigned to a program have an `age_range` entirely below the program's minimum age: P09 (T3-L1, T6-L1, T6-L2: 12-13 vs 14+), P10 (T4-L1, T4-L2, T4-L3, S1-L3, S2-L3, T5-L4) and P11 (R3-L4), all 12-14 vs 15+. Lessons are younger than the programs that use them; either the lesson age ranges or the program minimums are wrong. Needs a pedagogical reviewer decision.
4. **Prerequisites are prose**, so "P01 or equivalent" cannot be evaluated by code, and "equivalent" has no defined test.
5. **Status "pilot"** on P06 and P07: no pilot record, cohort or result exists in the repository that I found (not verified outside the repo). It should read as "intended for pilot" until a real one runs.
6. **Two band schemes.** Academy bands (b1 5-8, b2 9-12, b3 13-17, ...) in `programs.json` versus kids bands in `kid_profiles` (a 4-6, b 7-10, c 11-14) in 0016. They overlap with the same letters and different meanings (b1/b2/b3 versus a/b/c; "band b" is 7-10 in one and 9-12 in the other age scheme). No mapping exists.

## 7. Admission gate for programs

What exists:

| Mechanism | Evidence | Status |
|---|---|---|
| Program card shows an age pill; adults_gated programs show a notice "not opened to the public before scholarly, pedagogical and child-protection review" | `acProgCard`, `acProgram` in `packages/web-vercel/index.html` | UI ONLY (informational; the program page still opens and every lesson and scenario is reachable by URL) |
| Reflection journal gate: minor needs `kid_profiles.band = 'c'`, a verified guardian link, and a live `reflection_journal` consent, enforced by trigger | `app.reflection_gate()` in `0017_formation_engines.sql`; DB tests `packages/database/test/formation.test.ts` | WORKING locally (15/15 in the run below); NOT in production |
| Source records: three distinct reviewer roles required before approval; edits void approvals | `source_record_guard`, `source_review_effect`, 0017; API routes `/formation/source-records*` | WORKING locally; no named reviewers exist, so nothing can be approved |
| Kids placement (new/adv) and teacher override | `kid_profiles`, API `/i/:inst/kids/*` (app.ts lines ~971-1014) | PARTIALLY WORKING; applies to kids letters only |
| Quran text and scholarly publication gate | Migration 0002, 0010 | WORKING, but covers Quran/scholarly items, not formation lessons |

What is missing:
- **No enrolment or acceptance record.** There is no `program_enrolments` table, no per-learner program status, and no rule that checks program prerequisites.
- **No age enforcement for formation content.** The system stores no birth date by design (`student_profiles.is_minor` boolean only, 0001 line 59; ADR-008 as cited in the 0017 comment). The only age proxy is the kids band a/b/c.
- **Likely defect, read in code and not exercised:** the reflection gate accepts a minor only if `band = 'c'` (11-14 label). The CHECK on `kid_profiles.band` allows only a, b, c, so a minor aged 15-17 has no valid band above c and would either be set to c or refused. Programs P10 and P11 target 15-17. Whether a 15-17 learner is "minor" and "band c" is a product decision; the schema has no band for them. Mark as an open design gap, not a confirmed bug.
- **Publication gate for formation content is absent.** `source_records` can reach `approved`, but nothing links an approved record to a lesson, and the lesson JSON is served regardless of any record's status. So the UI label "draft under review" (`acDraft()` ribbon) is the only control.
- Gating reasons (`gating.needs_named_reviewers`, `deferred_reason`, `adults_only`) are data only; the UI reads `status==='adults_gated'` and `deferred_reason` only for that status. P11 has a `deferred_reason` (no verified financial source) but status `planned`, so no notice is shown (read from the card code; browser not run).
- **Reviewers:** no named scholarly, pedagogical, child-protection, financial, legal, family-counselling or political-neutrality reviewer exists (PROJECT_STATE "waiting on owner"). Appointing them is an **owner decision**; so are child-data retention policy, any public launch of P01-P16, and whether adult family programs (P15, P16) proceed.

Proposed gate (design only, nothing implemented): (a) a `programs` table seeded from `programs.json` with `min_age_band`, `adults_only`, `status`, `required_reviews`; (b) `program_enrolments(learner, program, status, started, completed)` with a trigger checking prerequisites as program ids, `is_minor` and band, and for minors a verified guardian link and consent; (c) a `content_approvals` link so the served lesson set filters out anything lacking the three approvals; (d) a mapping table between kids bands and academy bands. All of this needs owner approval before any migration, since children's data is involved.

## 8. The owner's "ten initial programs" (section 19) versus the sixteen

The owner's TARTIL 13.0 document is not in the repository (grep for "ten programs", "section 19", "عشرة برامج" found nothing). The brief for this task summarises it but does not list the ten programs. Therefore: **section 19's ten programs: not verified, no comparison possible.** The same absence was already recorded for the earlier "19 units / 105 competencies" plan in `docs/05_CURRICULUM_AND_COMPETENCY_MAPPING.md`.

What can be said without inventing:
- The repository holds sixteen formation programs (above), plus Quran track templates in index.html (`TEMPLATES`; IMPLEMENTATION_TRACKER says 11 including 8 curriculum proposals; I did not count the array myself) and the kids letters academy. None of these is a confirmed match for the owner's ten.
- Once the owner supplies the list, the comparison should be a three-column table (owner program, matching P-id or none, gap) and will need an owner decision on each unmatched program: add, merge into an existing P-id, or defer. Programs P15 and P16 are already deferred and P11 is flagged; they are candidates for "not in the first ten".
- The Quran-learning side (tajweed, hifz, recitation) of the owner's ten, if present, would map to `learning_tracks` and the Foundations/Kids modules rather than to P01-P16, because P01-P16 contain no Quran-skill lessons (competency domains are K,T,S,C,R,L,W,M: formation skills only; lesson `verse_refs` fields exist, for example K1 has an empty list, not checked for all 40).

## 9. Gaps ranked

| # | Gap | Severity | Status |
|---|---|---|---|
| 1 | No curriculum tables or learner completion store; progress is `localStorage` only, lost on device change, invisible to teacher/parent | High | MISSING |
| 2 | No admission/enrolment/prerequisite/age gate; adult-gated and deferred programs are openly reachable (notice only) | High | UI ONLY |
| 3 | No linkage between reviews (0017) and served content; all 40 units `unreviewed`; no reviewers appointed | High | BLOCKED (owner) |
| 4 | Two band schemes and a missing band for 13-14 and for 15-17 minors; age ranges of 10 lessons below their program minimum | Medium | PARTIALLY WORKING |
| 5 | Refs in 0017 are format-checked, not existence-checked; P12/P15/P16 declare competencies their items do not cover | Medium | PARTIALLY WORKING |
| 6 | No assessment engine: formative checks and capstones are descriptive text; no rubric, item bank or score for formation | Medium | MISSING |
| 7 | Levels L4/L5 thin (23 and 5 lessons) | Low | NEEDS pedagogical review |
| 8 | Three copies of the same JSON with no sync check | Low | PARTIALLY WORKING |

## 10. Evidence

Commands and results (run in `/home/claude/quran-global-platform`):
- `python3 -I scripts/validate_programs.py` -> `programs=16 lessons=148 scenarios=83 covered=231/231`, `0 issues`.
- Python analysis of `docs/human-formation/programs.json`, `packages/web-vercel/academy-programs.json`, `packages/web-vercel/academy-lessons.json` (counts, levels, activity types, competency coverage, age comparison); `cmp` between the `packages/web` and `packages/web-vercel` copies.
- `cd packages/database && npx tsx --test test/formation.test.ts test/tracks.test.ts` -> 15 tests, 15 pass, 0 fail (output `/tmp/claude-0/-home-claude/a15fb9d9-e5d4-57e1-b4d4-18cfe5debcdc/scratchpad/dbt13.txt`). The full `npm test` was started but killed by my own timeout (SIGKILL on `concepts-load.test.ts` at about 38 s), so the full-suite totals are **not verified** in this audit; PROJECT_STATE states DB 49/49 and API 50/50 for 2026-11-03 and I did not reproduce those. The API suite was not run.

Files read: `CLAUDE.md`, `PROJECT_STATE.md`, `IMPLEMENTATION_TRACKER.md`, `docs/governance/KNOWN_LIMITATIONS.md` (partly), `docs/05_CURRICULUM_AND_COMPETENCY_MAPPING.md`, `docs/KIDS_ACADEMY_ARCHITECTURE.md`, `docs/human-formation/PROGRAMS.md`, `docs/human-formation/competencies.json`, `packages/database/migrations/0008_tracks_certificates_sessions_ai.sql`, `0016_kids_academy.sql`, `0017_formation_engines.sql`, `0001_foundation.sql` (is_minor), `packages/api/src/app.ts` (routes, kids profile), `packages/web-vercel/index.html` (Academy code, `TEMPLATES`), `packages/web-vercel/vercel.json`.

Not verified: the Academy UI in a browser (code read only); live Supabase state; the API test suite; scholarly content quality; whether any pilot of P06/P07 took place; the owner's section 19.

## 11. Open items

1. Owner: supply the TARTIL 13.0 section 19 list of ten programs so the mapping in section 8 can be completed (owner decision).
2. Owner: appoint named scholarly, pedagogical and child-protection reviewers (plus financial, legal, family-counselling and political-neutrality where listed) and set the child-data retention policy; nothing in sections 3 or 7 can go to production before that.
3. Owner: approve (or reject) the proposed program, enrolment and approval tables of section 7 before any migration is written.
4. Product/pedagogy: unify the two band schemes, decide programs for ages 13-14 and a band for minors 15-17, and reconcile lesson age ranges with program minimums (section 6).
5. Engineering (no owner decision needed): fix declared-versus-actual competencies for P12, P15, P16, and add an automated check that the three JSON copies match.
6. Engineering after approval: make P15/P16 (and any deferred program) unreachable rather than merely annotated.
7. Re-run the full `npm test` and API tests with an adequate timeout to confirm the totals quoted in PROJECT_STATE.
