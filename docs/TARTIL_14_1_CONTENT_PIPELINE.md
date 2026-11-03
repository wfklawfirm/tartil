# TARTIL 14.1 - Content pipeline and quality gates

Snapshot: 2026-11-03, about 23:27 EET. Baseline is git HEAD 69e3559 plus an uncommitted working tree that other work streams are editing at the same time. Anything that depends on uncommitted files is marked "(working tree)". Related documents (not duplicated here): `TARTIL_14_1_CURRICULUM_COHERENCE.md`, `TARTIL_14_1_PUBLICATION_BACKEND.md`, `TARTIL_14_1_PROGRESS_PERSISTENCE.md`, `TARTIL_14_1_ACTUAL_PAGE_AUDIT.md`, `TARTIL_14_1_TEST_RESULTS.md`.

Reading rule: every "implemented" below was checked by reading the file or running the script on this snapshot. "Not implemented" means no script, table or file in the repo does it. Nothing here is marked COMPLETED: no stage is proven end to end.

## 1. What the pipeline operates on (verified)

- Source of truth: static JSON in `docs/human-formation/` (`programs.json` 24 programs P01-P24; `competencies.json` 52 competencies; `lessons/lessons_*.json` 71 units, 255 lessons, 136 scenarios; `guides/P01-P24.json`; `extracted/*.json` 52 files, 531 extracted principles; `records/*.md` plus `PILOT_SOURCE_RECORDS.md` 40 source passage records; `qa/*.md`; `sessions/` only P01 and P06).
- `scripts/build_academy.py` copies them to `packages/web/` and `packages/web-vercel/` as `academy-*.json`. The copies were byte-identical to the sources when checked.
- Rendering: one file, `packages/web-vercel/index.html`. No academy content comes from the database.
- The 531 principles were produced by manual or agent-assisted reading of a private corpus (`scholarly-assets/_inputs/formation-books`, 168 txt files, git-ignored). No script in the repo generates the extraction and no generation prompts are stored. The extraction cannot be reproduced from the repo.

## 2. The 13 stages

Format per stage: inputs, outputs, validation rules (target), failure conditions, human approval, then what exists today.

### Stage 1 - Needs analysis
- Inputs: owner directive, age bands, observed gaps. Outputs: a needs statement per program (who, age, problem, expected change).
- Validation: each program states age band and a measurable outcome. Failure: program with no stated need or outcome. Human approval: owner / pedagogical reviewer.
- Today: documents only (`BLUEPRINT.md`, `PROGRAMS.md`, `programs.json` outcomes). No schema or script checks that a need exists. Status: MANUAL, unvalidated.

### Stage 2 - Competency definition
- Inputs: needs. Outputs: competency entries with five levels L1-L5 as observed outcomes. Validation: unique ids, five levels, monotonic level labels, prerequisites resolve, count within the agreed cap. Failure: duplicate id, missing level, prerequisite loop. Approval: pedagogical reviewer.
- Today: `competencies.json` has 52 entries, each with 5 levels (read). `validate_lessons.py` and `validate_programs.py` check that lesson competency ids exist. No validator checks the levels themselves. `BLUEPRINT.md` D10 sets a cap of 48; the registry has 52 and I found no decision record that raised it. H1 level labels are non-monotonic (H1-L2 is labelled L4). Status: PARTIAL.

### Stage 3 - Source retrieval
- Inputs: competency, source list. Outputs: extracted principle with `book`, `locator`, `kind`, `age_fit`, `flags`, `not_to_take`. Validation: locator resolves in the book text; book is registered with edition and rights. Failure: locator does not resolve; book unregistered. Approval: scholarly reviewer.
- Today: `extracted/*.json` exist (531 principles). `scripts/check_extracted_ids.py` checks ids; `--locators` checks the stored `private_check` fragment against the cited lines in the private corpus. Run today: 531 checked, 2 failing (C6-10, K2-01; see `TARTIL_14_1_SOURCE_INTEGRITY.md`). It needs the private corpus, so it cannot run in CI or on a clean clone. The formation books are not in `source_registry.csv` (no sha256, edition or rights entry). Status: PARTIAL.

### Stage 4 - Source verification
- Inputs: extracted principle. Outputs: verified / unverified status per principle and per embedded verse or hadith. Validation: text matches an identified edition; verse numbers match the Quran text; hadith has takhrij and grade. Failure: any mismatch. Approval: scholarly reviewer.
- Today: locator check only (stage 3). No hadith takhrij, no edition check, no per-principle verification field. Every guide and lesson inherits "draft-unreviewed". `verify_quran_crosscheck.py` depends on a missing `cmp.py` and covers the Quran library, not this corpus. My one-off check: all 92 `verse_refs` (73 distinct) fall inside valid surah/ayah bounds; whether the verse fits the topic is unchecked. Status: MISSING (except locators and bounds).

### Stage 5 - Educational research
- Inputs: competency. Outputs: modern developmental and pedagogical references. Validation: licensed or citable reference per age claim. Failure: age or method claim with no reference. Approval: pedagogical reviewer.
- Today: none. `SOURCE_MAP.md` states there is no licensed modern reference for developmental psychology. Several `extracted/*.json` gap lists say contemporary skills (labelling feelings, breathing, reframing) are "a general contemporary educational principle needing a specialist reviewer". Status: MISSING.

### Stage 6 - Curriculum design
- Inputs: competencies, research. Outputs: program (age, weeks, sessions, stages, outcomes) and session plan. Validation: each item serves a declared outcome; sequence respects prerequisites; declared minutes match content minutes. Failure: item serves no outcome; competency taught above the level the prerequisite allows. Approval: pedagogical reviewer.
- Today: hand-curated. `validate_programs.py` (24 programs, 255 lessons, 136 scenarios, coverage 391/391, 0 issues) checks structure only. `validate_coherence.py` (working tree, new) reports the coherence, sequence and timing findings (section 3). Status: PARTIAL, and the report shows real failures.

### Stage 7 - Lesson design
- Inputs: program. Outputs: lesson (objective, activities, formative, life_practice, guide_script, safeguards). Validation: required fields, minutes, no scoring language. Failure: missing field, forbidden term. Approval: pedagogical reviewer.
- Today: `validate_lessons.py` 0 problems on 71 units (also with `--enriched`). Status: IMPLEMENTED for structure.

### Stage 8 - Scenario design
- Today: scenarios sit inside the lesson files and are checked by `validate_lessons.py` for structure. Scenarios have no duration field, so timing is estimated by `validate_coherence.py` from words and decision points (working tree). Status: PARTIAL.

### Stage 9 - Guide design
- Inputs: program. Outputs: `guides/Pxx.json` (for_guide, for_parent, faq). Validation: required sections, non-empty FAQ answers, week count equals program weeks. Today: `validate_completeness.py` checks these. Status: IMPLEMENTED for structure (see gate 8).

### Stage 10 - Age adaptation
- Validation: language and activity fit the age band. Today: `min_age` floors are checked; nothing checks vocabulary, reading level or duration per age. 20 lessons exceed the indicative duration caps in `PEDAGOGY.md` 2.2 (my one-off count). Status: PARTIAL (floors only).

### Stage 11 - Editorial review
- Validation: clear Arabic, no vague phrases, no encoding defects, no internal markers. Today: `validate_completeness.py` hygiene checks; manual QA logs `qa/*.md` and `qa/editorial_changes.json` (65 edits, working tree). QA logs exist only for G1-G8 lessons (40 of 71 units) and guides P01-P16; none for H, Q, X, Y, Z lessons or P17-P24 guides. See `TARTIL_14_1_ARABIC_EDITORIAL.md`. Status: PARTIAL.

### Stage 12 - Child-safety review
- Validation: no compelled disclosure, no false confidentiality, referral paths, supervised cooldown. Today: only a regex for scoring language; manual review in `TARTIL_14_1_CHILD_SAFETY.md`. Status: PARTIAL.

### Stage 13 - Human approval
- Today: DB gates exist but unused. `scholarly_items` (0002) enforces an active scholarly reviewer; `source_records` and `source_record_reviews` (0017, local only) need three distinct roles bound to a content sha256; `academy_content_status` (0020, working tree) needs four distinct approvals. None is applied to production, none is wired to the UI, and nobody holds the reviewer roles (the owner appoints them). Status: DESIGNED/BUILT locally, not operating. See `TARTIL_14_1_CONTENT_PUBLICATION.md`.

## 3. The 11 quality gates

Statuses: IMPLEMENTED (a script exists and runs), PARTIAL (script covers part), MISSING (nothing). "Passing" is a separate fact from "implemented".

| # | Gate | Status | Script(s) | Result today and limits |
|---|------|--------|-----------|-------------------------|
| 1 | Coherence (every item serves a program outcome) | PARTIAL | `validate_coherence.py` (working tree, report mode) | Report: 97 errors, 132 warnings across 24 programs; P07 alone has 12 coherence errors. Exit code is 0 unless `--strict`, so it blocks nothing. Needs `qa/coherence_audit.json` decisions to be complete. |
| 2 | Competency (ids exist, in program, levels sensible) | PARTIAL | `validate_lessons.py`, `validate_programs.py`, `validate_coherence.py` | Ids resolve (0 problems). Program membership of competencies is checked in the coherence report (36 competency findings in the matrix totals). Level monotonicity of H1 is unchecked by the older scripts. |
| 3 | Sequence (prerequisites precede) | PARTIAL | `validate_coherence.py` | 33 program/competency pairs start above L1 and 35 prerequisites fall outside their program (my count); the report flags sequence errors in P05, P06, P07, P22, P24 and others. Report-only. |
| 4 | Age | IMPLEMENTED for floors | `validate_lessons.py`, `validate_coherence.py` | Floors checked. Vocabulary and duration per age are not (20 lessons over indicative caps). |
| 5 | Timing | PARTIAL | `validate_sessions.py`, `validate_coherence.py` | `validate_sessions.py` covers P01 and P06 only (0 issues, 6 warnings); P07 has no session file. P07 declares 560 minutes, its lessons total 305 minutes and its 6 scenarios have no duration. P22 lessons total 780 minutes against capacity 720; P24 945 of 960 with 11 scenarios uncounted. |
| 6 | Source | PARTIAL | `check_extracted_ids.py --locators` | Locators only: 531 checked, 2 failing. Needs the private corpus. No edition, takhrij or rights check. 14 units say "لا سجل مصدري بعد" (H1-H5, Q1-Q6, X3-A, X3-B, X5-A) and 12 competencies have no SPR record. |
| 7 | Editorial | PARTIAL | `validate_completeness.py` (hygiene), manual QA | No automated vague-phrase or entity gate; proposed in `TARTIL_14_1_ARABIC_EDITORIAL.md`. |
| 8 | Safety | PARTIAL | `validate_lessons.py` (scoring-language regex) | No check for privacy claims versus implementation, blanket referrals or confidentiality promises. |
| 9 | Completeness | IMPLEMENTED | `validate_completeness.py`, `validate_completeness_rendered.mjs` | Static run at 23:27: RESULT PASS (24 programs, 24 guides, 255 lessons, 136 scenarios, 52 competencies; warnings: 51 lessons without vocabulary, 25 adult-unit lessons without parent note). Earlier in this session the same script failed with 33 findings; another work stream fixed them. The rendered variant had 1 failure earlier (an internal marker "(D12)" shown to learners on P07); I did not re-run it after the fix. |
| 10 | UX | PARTIAL | `scripts/e2e_academy.mjs` | Academy sections 1-6e recorded no failures in two runs, but the script aborts on non-academy failures (the `/kids` card timeout, duplicate titles, a tablist timeout) and does not exit clean. Results vary between runs. |
| 11 | Review | PARTIAL | DB triggers 0002, 0010, 0017, 0020 | Enforced in the database (tests pass locally: 0020 database tests 8/8, API 2/2, as reported by that stream; the earlier run of 7/8 happened mid-edit). Not applied to production, not wired to the UI, no link to the validators, no named reviewers. |

Gates 1, 3 and 5 were declared MISSING in earlier drafts of this analysis; `validate_coherence.py` now exists in the working tree, so they are PARTIAL, but it is report-only and has not been run in any CI.

## 4. Where the pipeline breaks (most important gaps)

1. No gate is enforced. The coherence script exits 0 by design; the review tables are not applied; the web build does not consult either.
2. Source integrity stops at line locators. No edition, no takhrij, no rights record for the formation books.
3. Stage 5 (educational research) is empty; age claims rest on the author's judgement.
4. Extraction is not reproducible (private corpus, no stored prompts or scripts).
5. Declared versus real timing: P07 (305 of 560 minutes), P22 (780 of 720), P24.
6. Coverage of QA logs is partial (40 of 71 units; guides P01-P16 only).
7. No decision record for the competency count (52 versus cap 48).

## 5. Proposed next steps (design only, nothing implemented by this document)

- Make `validate_coherence.py --strict` and `validate_completeness.py` a required step of `build_academy.py`, with an allow-list file for known, owner-accepted findings.
- Add a source register for the formation books (see source integrity document).
- Add an encoding and vague-phrase gate (see editorial document).
- Add a privacy-claim gate (see child-safety document).
- Link gate results to publication status (see publication document).
