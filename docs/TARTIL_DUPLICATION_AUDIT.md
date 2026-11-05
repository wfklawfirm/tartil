# TARTIL_DUPLICATION_AUDIT

Duplication audit for Tartil content under MASTER PROMPT V3 section 4.3. Date: 2026-11-05. Rule from the owner and the prompt: **nothing is deleted**; archive or merge is only *recommended*, and only with proof, a verified backup, and (where it touches production data or scholarship) an owner decision. All numbers come from scans run in this session; nothing is estimated. Companion: `docs/TARTIL_CONTENT_MAPPING.md`. No repository file other than these two documents was changed.

## 1. Method and scope

| Scan | Input | Method | Result file / command |
|---|---|---|---|
| Scholarly book units | `scholarly-assets/extraction/SRC-*/units.jsonl` (57,989 units of >= 8 words) | `python3 -I scripts/dedup_report.py scholarly-assets/extraction <out>`: normalised sha256 + MinHash/LSH (64 perms, 16x4) + exact Jaccard on 4-word shingles; cross-source pairs only | re-run this session; `dedup_summary.json` is byte-identical to `scholarly-assets/review/dedup_summary.json` (`cmp`), so the stored report is reproducible |
| Lessons (347) and scenarios (185) | `docs/human-formation/lessons/lessons_*.json` | own script: Arabic-normalised text of every field except `id`; sha256 for exact; Jaccard of 4-word shingles for all 60,031 lesson pairs and 17,020 scenario pairs; also 3-word shingles and content-word sets for lessons | numbers in sections 2-4 |
| Field-level exact | lesson `title`, `objective`, `hook`; scenario `title`, `premise`; unit and program `title` | normalised string equality | section 2 |
| Principles (531) | `docs/human-formation/extracted/*.json` | exact idea text, same `book`+`locator`, all-pairs 4-word Jaccard | section 4 |
| Program text | `programs.json` outcomes+promise | all-pairs 3-word Jaccard | section 4 |
| Skill/level repetition | `programs.json` refs x lessons | (competency, level) taught in 2+ programs, with age overlap >= 1 year (the rule used by `scripts/validate_coherence.py`) | section 5 |
| Built copies | `packages/web` vs `packages/web-vercel` | `cmp` on 5 JSON + icon; line diff on `index.html`; built JSON equality against sources | section 2.1 |
| DB | Supabase `okbtrogotrtciymmuokr` | read-only SELECT with md5 over unit lists; `qa/db_inventory_2026-11-05.json` | section 7 |

Not scanned: the deployed sites, `scholarly-assets/_inputs` raw book files beyond what `dedup_report.py` consumes, semantic (meaning-level) similarity (needs a human or a reviewed embedding method; textual scans cannot see paraphrase), and audio/images (none exist).

## 2. Class 1: exact duplicates

| Scope | Found | Proof | Recommendation | Owner flag |
|---|---|---|---|---|
| Lessons / scenarios / units / programs inside the academy | **0** exact groups (0 identical normalised lesson text of 347; 0 of 185 scenarios; 0 duplicate unit titles of 96; 0 duplicate program titles of 25; 0 duplicate objectives; 0 duplicate hooks; 0 duplicate scenario titles or premises) | sha256 and string equality, section 1 | KEEP all | no |
| Lesson titles | 6 equal-title pairs: C3-L1/Y1-L1, C3-L2/Y1-L2, C3-L3/Y1-L3, C6-L1/Y1-L4, R1-L1/Y1-L10, R1-L2/Y1-L11 | titles equal, but objectives, durations (20-30 min vs 8-10 min) and age ranges (5-10 vs 5-6) differ and text Jaccard is 0.010-0.047 | not duplicates: class 4 (same topic, different level); KEEP and CONNECT | no |
| Extracted principles | **0** exact idea texts; 0 duplicate ids (531) | `check_extracted_ids.py` 0 errors + own scan | KEEP | no |
| Scholarly book paragraphs | **4,600** EXACT_NORMALISED pairs (Jaccard >= 0.98) across different sources | `dedup_report.py` | link to one concept, keep every source (policy in `docs/governance/CONTENT_DEDUPLICATION_LOG.md`); never merge text | yes: canonical text choice is scholarly (queue item Q-003) |
| Web bundles `packages/web/academy-{lessons,programs,guides,sessions}.json`, `academy.json`, `icon.svg` vs `packages/web-vercel/` | 6 of 6 byte-identical pairs | `cmp` reported identical for all six | KEEP: generated mirrors by design (`scripts/build_academy.py` writes both); the single source of truth is `docs/human-formation/`. Do not edit either copy by hand | no |
| `packages/web/index.html` vs `packages/web-vercel/index.html` | same number of lines; **differ only on line 6** | `diff`: `<meta name="api-base" content="">` (web) vs `content="/api"` (web-vercel). Per-line comparison: differing line numbers = [6] | KEEP both; the difference is the deployment setting. Risk: any edit must be made twice. Recommendation: generate one from the other in the build step (CREATE a build step; owner approves) | owner (deployment) |
| Built JSON vs sources | `academy-lessons.json` == merge of 52 lesson files (96 units, True); `academy-programs.json` == `programs.json` (True); guides (25) True; sessions (25) True; competencies 52 == `competencies.json` ids | Python equality | KEEP; bundles are not stale | no |
| DB `learning_tracks` | **2 identical tracks** "أساسيات التجويد" (published + draft), 10 identical units each | section 7 | **archive candidate** (not delete), see section 7 | **yes** |

## 3. Class 2: near duplicates

| Scope | Found | Evidence | Recommendation |
|---|---|---|---|
| Lessons | **0** pairs with 4-gram Jaccard >= 0.2; highest 0.196 (Z1-L7/Z1-L8), 0.188 (E16-L3/E16-L4), 0.181 (Y1-L7/Y1-L8); on content-word sets the highest is 0.387 (E18-L1/E18-L4), median 0.110, **0** pairs >= 0.4, 92 pairs >= 0.3 | all-pairs scan of 60,031 pairs; the 10 highest 4-gram pairs are all two lessons of the **same unit**, and 12 of the 15 highest word-set pairs are too (shared vocabulary of one topic); the other 3 are E10-L1/E17-L1, E18-L4/E20-L2, E18-L2/E20-L2 (same K4/S3/S4-family topic, different units) | KEEP; no merge |
| Scenarios | 0 pairs >= 0.2 (4-gram) | 17,020 pairs | KEEP |
| Principles | 0 pairs >= 0.3; highest 0.042 (M3-03/R4-04, H3-06/R4-04, H3-06/M3-03) | 140,715 pairs | KEEP |
| Program outcomes | highest 0.022 (P02/P19), 0.015 (P11/P24), 0.014 (P01/P17) | 300 pairs | KEEP |
| Scholarly book paragraphs | **481** NEAR_DUPLICATE pairs (0.80-0.98), **629 clusters**, 2,281 units inside clusters = 3.93% of 57,989; 133 clusters span 5+ sources; 371 clusters are size 2; largest 19 units / 12 sources | `dedup_report.py` re-run reproduces `scholarly-assets/review/dedup_summary.json` exactly; `dedup_decisions.csv` has 629 rows, all `PENDING_HUMAN_REVIEW` | link each cluster to one concept with all sources kept (e.g. verses of Jazariyya / Tuhfat al-Atfal quoted by commentaries); human decision per cluster; never machine-merge |
| Track templates | template 1 (juz' 30, 38 units) vs template 2 (short surahs, 11 units): 10 of the 11 surahs of template 2 are in template 1 | surah-set intersection | near-overlap by coverage, different purpose (memorisation vs correct recitation); KEEP both, CONNECT |

Conclusion for classes 1-2 inside the academy: the authoring pipeline produced **no copy-paste content**. Differences between lessons that look related are in age, level, activities and wording.

## 4. Class 3: overlapping content (same ground, different purpose or form)

### 4.1 Repeated (skill, level) across programs

48 of 197 (skill, level) pairs are taught in 2 or more programs; 20 of them have at least one year of age overlap between the lessons concerned (the "competency repetition" rule). Separately, 58 of the 197 (skill, level) groups contain lessons from more than one unit (202 lessons; this is about unit authorship, not programs). Text is not duplicated (section 3); the overlap is in *what is taught*. Decision for all rows: **KEEP, CONNECT** (one concept, linked from each program), and choose by pedagogy whether the second appearance is a deliberate spiral (revisit at a later age) or should be an optional link (`role: optional_link` already exists for 54 items).

| Skill-level | Programs: lesson ids | Age overlap >= 1 yr | Note |
|---|---|---|---|
| C2-L1 | P03: C2-L1; P19: Y2-L1 | yes | candidate for a stated spiral or optional link |
| C2-L2 | P03: C2-L2; P19: Y2-L2 | no | later-age spiral or extension |
| C2-L3 | P03: C2-L3; P19: Y2-L3, E11-L1, E11-L2, E11-L3 | yes | candidate for a stated spiral or optional link |
| C3-L1 | P01: C3-L1, E5-L1, E5-L4; P17: Y1-L1 | yes | candidate for a stated spiral or optional link |
| C3-L2 | P01: E5-L2, E5-L3; P04: C3-L2, E3-L1; P17: Y1-L2 | yes | candidate for a stated spiral or optional link |
| C3-L3 | P04: C3-L3, E3-L3, E3-L2; P17: Y1-L3 | no | later-age spiral or extension |
| C6-L1 | P01: C6-L1, E12-L1; P17: Y1-L4 | yes | candidate for a stated spiral or optional link |
| C6-L2 | P01: E12-L2, E12-L4; P04: C6-L2; P17: Y1-L5 | yes | candidate for a stated spiral or optional link |
| C6-L3 | P01: E12-L3; P04: C6-L3; P17: Y1-L6 | yes | candidate for a stated spiral or optional link |
| K3-L2 | P09: K3-L2; P24: X2-L4 | no | later-age spiral or extension |
| K3-L3 | P09: K3-L3; P24: X2-L5, X2-L6 | no | later-age spiral or extension |
| K4-L1 | P01: K4-L1, E1-L1, Y1-L7, Y1-L8, Y1-L9; P02: E1-L2, E1-L3; P18: E10-L1, E10-L2, E17-L1; P20: X3-L1 | yes | candidate for a stated spiral or optional link |
| K4-L2 | P02: K4-L2; P18: E17-L2, E10-L3, E17-L3, E17-L4; P20: X3-L2; P21: X3-L4, X3-L5 | yes | candidate for a stated spiral or optional link |
| K4-L3 | P18: E10-L4; P20: X3-L3; P21: X3-L6, K4-L3 | yes | candidate for a stated spiral or optional link |
| M2-L4 | P13: E9-L4; P14: M2-L4 | no | later-age spiral or extension |
| R1-L1 | P05: R1-L1; P18: Y1-L10 | no | later-age spiral or extension |
| R1-L2 | P05: R1-L2, E4-L1, E4-L2; P18: Y1-L11 | no | later-age spiral or extension |
| R1-L3 | P05: R1-L3, E4-L4, E4-L3; P18: Y1-L12 | no | later-age spiral or extension |
| R2-L1 | P05: R2-L1; P19: Y2-L10, E19-L1 | yes | candidate for a stated spiral or optional link |
| R2-L2 | P05: R2-L2, E13-L1; P19: Y2-L11, E19-L2, E19-L3, E19-L4 | yes | candidate for a stated spiral or optional link |
| R2-L3 | P05: E13-L2, E13-L4, E13-L3; P08: R2-L3; P19: Y2-L12 | no | later-age spiral or extension |
| R5-L3 | P05: E7-L3, E7-L4; P08: R5-L3 | no | later-age spiral or extension |
| S1-L2 | P24: Z1-L1; P25: S1-L2 | no | later-age spiral or extension |
| S1-L3 | P10: S1-L3; P24: Z1-L2 | no | later-age spiral or extension |
| S2-L2 | P22: X4-L4; P25: S2-L2 | yes | candidate for a stated spiral or optional link |
| S2-L3 | P10: S2-L3, E14-L1, E14-L2; P22: X4-L5, X4-L6 | yes | candidate for a stated spiral or optional link |
| S4-L1 | P02: S4-L1, E16-L1; P19: Y2-L4, E18-L1 | yes | candidate for a stated spiral or optional link |
| S4-L2 | P02: E16-L2, S4-L2; P19: Y2-L5, E18-L2, E18-L3 | yes | candidate for a stated spiral or optional link |
| S4-L3 | P02: E16-L3, S4-L3, E16-L4; P19: Y2-L6, E18-L4 | yes | candidate for a stated spiral or optional link |
| S5-L2 | P02: S5-L2, E6-L1; P07: AG-L1 | no | later-age spiral or extension |
| S5-L3 | P02: E6-L2; P07: AG-L2, AG-L3, S5-L3 | no | later-age spiral or extension |
| S5-L4 | P02: E6-L3; P07: AG-L4, AG-L5, AG-L6, AG-L9, AG-L7, AG-L8 | no | later-age spiral or extension |
| T1-L1 | P02: T1-L1; P19: Y2-L7 | yes | candidate for a stated spiral or optional link |
| T1-L2 | P05: T1-L2; P19: Y2-L8 | no | later-age spiral or extension |
| T1-L3 | P08: T1-L3; P19: Y2-L9 | no | later-age spiral or extension |
| T4-L2 | P10: T4-L2; P24: Z1-L7 | no | later-age spiral or extension |
| T4-L3 | P10: T4-L3; P24: E22-L1, E22-L2, Z1-L8, Z1-L9 | no | later-age spiral or extension |
| T4-L4 | P10: T4-L4; P24: E22-L3, E22-L4 | no | later-age spiral or extension |
| T5-L3 | P06: T5-L3; P10: E8-L1, E8-L2; P24: Z1-L4, Z1-L5 | yes | candidate for a stated spiral or optional link |
| T5-L4 | P10: T5-L4, E8-L3, E8-L4; P24: Z1-L6 | yes | candidate for a stated spiral or optional link |
| T6-L2 | P09: T6-L2; P24: X2-L1 | no | later-age spiral or extension |
| T6-L3 | P09: T6-L3; P24: X2-L2, X2-L3 | no | later-age spiral or extension |
| W2-L1 | P11: W2-L1; P24: X1-L1 | no | later-age spiral or extension |
| W2-L2 | P11: W2-L2; P24: X1-L2 | no | later-age spiral or extension |
| W2-L3 | P11: W2-L3; P24: X1-L3 | no | later-age spiral or extension |
| W3-L1 | P12: W3-L1; P24: X1-L4 | no | later-age spiral or extension |
| W3-L2 | P12: W3-L2; P24: X1-L5 | no | later-age spiral or extension |
| W3-L3 | P12: W3-L3; P24: X1-L6 | no | later-age spiral or extension |

Note: the 2026-11-03 coherence audit reported S3/K4 repetition between P02 and P18. That specific pair is **not reproduced** by the current data (S3 items are only in P18; K4 remains across P01, P02, P18, P20, P21). The audit predates the current `programs.json` (its item counts differ for 14 of 24 programs).

### 4.2 Same competency served by several units (23 competencies)

| Competency | Units | Count |
|---|---|---|
| C1 | E2-A, C1 | 2 |
| C2 | E11-A, C2, Y2-A | 3 |
| C3 | E3-A, E5-A, C3, Y1-A | 4 |
| C6 | E12-A, C6, Y1-B | 3 |
| H2 | E21-A, H2 | 2 |
| K3 | K3, X2-B | 2 |
| K4 | E1-A, E10-A, E17-A, K4, X3-A, X3-B, Y1-C | 7 |
| M1 | E15-A, M1 | 2 |
| M2 | E9-A, M2 | 2 |
| R1 | E4-A, R1, Y1-D | 3 |
| R2 | E13-A, E19-A, R2, Y2-D | 4 |
| R5 | E7-A, R5 | 2 |
| S1 | S1, Z1-A | 2 |
| S2 | E14-A, S2, X4-B | 3 |
| S3 | E20-A, S3, X4-A | 3 |
| S4 | E16-A, E18-A, S4, Y2-B | 4 |
| S5 | AG-A, AG-B, AG-C, E6-A, S5 | 5 |
| T1 | T1, Y2-C | 2 |
| T4 | E22-A, T4, Z1-C | 3 |
| T5 | E8-A, T5, Z1-B | 3 |
| T6 | T6, X2-A | 2 |
| W2 | W2, X1-A | 2 |
| W3 | W3, X1-B | 2 |

K4 (recitation, listening, memorising with care) is spread over 7 units (E1-A, E10-A, E17-A, K4, X3-A, X3-B, Y1-C) across 5 programs: the largest overlap cluster and the first candidate for a stated progression (L1 5-6 years to L3 12-15 years). Decision: KEEP, CONNECT, and publish the intended order; owner/pedagogical review.

### 4.3 Quran-reading surfaces (topic-level overlap; text not compared)

| Topic | Where it exists | Decision |
|---|---|---|
| Tajweed rules | SPA `#/tajweed` (MAKHARIJ 5, SIFA_DEF 12, AHKAM 11, MUDOOD 6); 4 quiz sets (33 questions); templates 0, 3, 4, 5; academy unit Q2 | KEEP all; CONNECT (they serve different forms: reference, practice, institutional track, learning objectives). Textual comparison between the SPA constants and Q2 was **not done**: a reviewer should confirm they agree |
| Reading foundations (letters, harakat) | SPA `#/foundations` (28 letters), template 3 (15 units), kids activities | KEEP; CONNECT |
| Memorisation of surahs | templates 1, 6, 7, 8, 9, 10; SPA `#/me/hifz`; academy Q3/P21 | KEEP; CONNECT |
| Short surahs recitation | templates 2, 3, 10 | KEEP; CONNECT |

### 4.4 Track templates (11) overlap by title and surah set

| Pair | Overlap | Decision |
|---|---|---|
| 0 أساسيات التجويد / 4 متن تحفة الأطفال | 3 of 3 surahs of template 0 appear in 4; shared unit title "أحكام الميم الساكنة" | overlapping, different depth; KEEP both |
| 1 جزء عمّ / 6, 7 (juz' 29, 28) | 0 shared surahs; shared review title "مراجعة الجزء كاملًا" | independent; KEEP |
| 10 ختمة / every template with surahs | all surahs of templates 0-9 are inside the 114 of template 10 | superset by design; KEEP |
| 6 / 8 | 1 shared surah (Mulk, 67) | KEEP |

## 5. Class 4: same topic, different level or age

Policy (V3 4.3): keep diversity when age or level justifies it; link, never copy.

| Family | Variants | Why they are separate | Decision |
|---|---|---|---|
| Mercy (C3) | C3 (5-10), E3-A (8-10), E5-A (5-7), Y1-A (5-6, 8-10 min lessons) | age-adapted ladders; 3 of Y1-A's lessons share titles with C3-L1..L3 | KEEP, CONNECT (ADAPT already exists) |
| Gratitude (C6) | C6, E12-A, Y1-B | same | KEEP, CONNECT |
| Listening (R1) | R1 (6-10), E4-A, Y1-D (age 6) | same; R1-L1/Y1-L10 and R1-L2/Y1-L11 equal titles | KEEP, CONNECT |
| Clear speech (R2) | R2, E13-A, E19-A, Y2-D | same | KEEP, CONNECT |
| Keeping one's word (C1/C2) | C1, E2-A; C2, E11-A, Y2-A | same | KEEP, CONNECT |
| Anger (S5) | S5 (3 lessons), E6-A (7-8), AG-A/B/C (10-12) | younger vs older ladders; AG-C needs a child-protection reviewer before merge | KEEP, CONNECT; owner/reviewer flag on AG-C |
| Adult finance and agreements (W2/W3) | W2, W3 (12-17) vs X1-A, X1-B (18+) | audience age; X1 file says reviewers and adult-category acceptance are owner decisions | KEEP, CONNECT; owner flag |
| Research (T6/K3) | T6, K3 (12-14) vs X2-A, X2-B (16-18+) | researcher level | KEEP, CONNECT; owner flag (X2 may become its own program) |
| Review of the day (S1) | S1 (10-14), Z1-A (15-17) | older variants | KEEP, CONNECT; note P24 hosts Z1 (ages 15-17) while P24 is 18+ |
| Prophetic character (H2) | H2 (9-13), E21-A (12-16) | file note: E21 gives 12+ alternatives where H2 lessons are younger than P22 | KEEP, CONNECT |
| Decision-making and problem solving (T4/T5) | T4, E22-A (18+), Z1-C; T5, E8-A, Z1-B | levels L2-L4 | KEEP, CONNECT |

## 6. Class 5: inconsistent versions (documents, data, code say different things)

Verified by reading both sides. Actual current values: 25 programs, 96 units, 347 lessons, 185 scenarios, 532 items, 532 sessions, 25 guides, 52 competencies.

| # | Inconsistency | Side A | Side B (actual) | Recommendation | Owner |
|---|---|---|---|---|---|
| 1 | academy_status_seed.json is stale | counts 24 programs / 255 lessons / 136 scenarios / 24 guides (439 rows) | 25 / 347 / 185 / 25 (missing P25, 92 lessons, 49 scenarios, P25 guide) | regenerate with `scripts/seed_academy_status.py` before applying migration 0020; never apply the stale file | yes (applying 0020) |
| 2 | PROGRAMS.md counts | "319 lesson placements and 171 scenario placements" (490) | 347 + 185 = 532 | regenerate sections 2, 3, 7 (file says it is generated from programs.json) | no |
| 3 | TARTIL_14_1_CONTENT_PIPELINE.md | "24 programs, 71 units, 255 lessons, 136 scenarios, sessions only P01 and P06" | 25, 96, 347, 185, sessions for all 25 | add a dated note; do not rewrite history | no |
| 4 | TARTIL_14_1_ACADEMY_ROLLOUT.md | "25 programs, 264 lessons, 141 scenarios", "405 items" | 347, 185, 532 | same: dated historical snapshot | no |
| 5 | qa/coherence_audit.json | 24 program reports; P25 only "proposed_needs_owner_decision"; item counts differ from programs.json for 14 of 24 | P25 exists with 6 items and sessions | re-run `validate_coherence.py` (it writes; run in a scratch copy) before using severities | no |
| 6 | P07 title | V3 prompt, PROGRAMS.md journey map, ACTUAL_PAGE_AUDIT, CURRICULUM_COHERENCE, ADAB_AL_GHADAB_REDESIGN, TARTIL_13_CURRICULUM_ARCHITECTURE, coherence_audit.json, P07 map: "أضبط غضبي وأصلح" | `programs.json` and the bundles: "أتعلّم كيف أتعامل مع غضبي" (slug `adbut-ghadabi` kept) | keep the new title (id and slug stable); refresh the PROGRAMS.md map; tell the owner the V3 prompt uses the old name | owner confirms title |
| 7 | Number of ready tracks | UI text l.1085: "المسارات الجاهزة الثمانية" (eight) | `TEMPLATES` has 11 entries; creating an institution seeds all 11 (l.1089) | fix the string (cosmetic) | no |
| 8 | Competency page title | l.2046 "الكفايات الأربعون" (forty) | 52 competencies | fix the string | no |
| 9 | Lesson-file notes | E4, E7, E9, E13, E15, E22: "will be linked to the program later" | all six units are referenced by programs (P05, P05, P13, P05, P13, P24) | update notes (metadata only) | no |
| 10 | `needs_owner_decision` vs merge | AG3, X1, X2, X3, X4 say "before merging" | units AG-C, X1-A/B, X2-A/B, X3-A/B, X4-A/B are already in programs P07, P24, P24, P20/P21, P18/P22 | owner decides whether they stay merged as drafts; nothing is published (all unreviewed) | yes |
| 11 | Sessions shipped but not shown | `academy-sessions.json` built (532 sessions) | `index.html` fetches 4 academy files, not sessions (0 references) | intentional per ROLLOUT; decide when to expose | yes (product) |
| 12 | Migrations | repo has 0001-0020 | DB has 0017-0020 **not applied** (db_inventory) | owner applies; API academy routes fail on production until then | yes |
| 13 | Static JSON vs DB | Academy is 100% static JSON | DB holds 0 academy rows, 2 tracks, 39 draft concepts | no action; documented | no |
| 14 | Extraction coverage | 52 competencies | 52 principle files = 51 competencies + ANG; X5 missing | CREATE `extracted/X5.json` through the source-selection process | reviewer |
| 15 | Age schemes | kids bands 4-6 / 7-10 / 11-14 (`KB`) | academy bands 5-8 / 9-12 / 13-17 / 18+ | define a mapping table; do not merge | yes |
| 16 | Off-age lessons | program age span | 24 lessons whose `age_range` lies outside it (P24 9, P23 4, P09 3, P18 3, P10 2, P11 1, P21 1, P22 1) | ADAPT or move after review | pedagogical reviewer |
| 17 | Pacing | declared rhythm and weeks | 197 `validate_sessions` warnings; 12 programs have sessions placed past `duration_weeks` (P01 week 9 of 7, P06 10/8, P08 12/8, P09 10/8, P12 7/6, P13 9/8, P15 5/4, P16 5/4, P21 7/6, P22 11/8, P23 7/6, P24 12/8) | scope decision | yes |
| 18 | Twin docs | `docs/ORNAMENT_LIBRARY.md` (937 B) and `docs/04_ORNAMENT_LIBRARY.md` (1,164 B) differ; similar pairs: root `IMPLEMENTATION_TRACKER.md` vs `docs/06_IMPLEMENTATION_TRACKER.md`, `FEATURE_GAPS.md` vs `02_FEATURE_GAP_MATRIX.md` | content not compared line by line | compare, then cross-link; no deletion | no |

## 7. The database finding: two identical "أساسيات التجويد" tracks

### 7.1 Proof

Source: `docs/human-formation/qa/db_inventory_2026-11-05.json` (`learning_tracks` 2, `track_units_per_track` 10, `track_units_titles_identical_across_tracks` true) and a read-only SELECT run on 2026-11-05 on project `okbtrogotrtciymmuokr`:

```sql
select t.id, t.title, t.status, t.institution_id, t.created_at, md5(coalesce(t.description,'')) desc_md5, count(u.*) n_units,
       md5(string_agg(u.position||'|'||u.title||'|'||u.kind||'|'||coalesce(u.surah::text,'')||'|'||coalesce(u.from_ayah::text,'')||'|'||coalesce(u.to_ayah::text,''), ';' order by u.position)) units_md5
from learning_tracks t left join track_units u on u.track_id=t.id group by t.id order by t.created_at;
```

(The query actually run computed the same values with sub-selects.)

| Field | Track A | Track B |
|---|---|---|
| id | 9f0b6d3b-edd4-4e44-bc96-597e485011b8 | adb0b936-c68c-4f99-9a46-2bf807e62904 |
| title | أساسيات التجويد | أساسيات التجويد |
| status | published | draft |
| institution_id | f2b3bb6f-7545-42e2-9ace-6d45073c2ffd | f2b3bb6f-7545-42e2-9ace-6d45073c2ffd |
| created_at | 2026-11-01 21:03:41 UTC | 2026-11-02 16:36:51 UTC |
| description md5 | b3b97644a9c9109d20f9bc5f1635e3de | b3b97644a9c9109d20f9bc5f1635e3de |
| units | 10 | 10 |
| unit list md5 (position, title, kind, surah, from, to) | 716c784a7752bdd35a2624ac2e184974 | 716c784a7752bdd35a2624ac2e184974 |

Both md5 values also equal the md5 computed from `TEMPLATES[0]` in `packages/web/index.html` (l.1553): the two rows are consistent with two uses of "create from template" (UI paths at l.1089 and l.1336; cause not proven; no uniqueness constraint on `(institution_id, title)` exists in migration 0008). Dependents: `unit_progress` 0 rows, `certificates` 0 rows, `halaqat` 0, `homework_*` 0 (FKs to `learning_tracks` exist only from `track_units`, `unit_progress`, `certificates` in migration 0008). Learners affected today: 0 (`student_profiles` 0).

### 7.2 Recommendation (not executed)

- **Keep** the published track A (older, live).
- **Archive, do not delete,** the draft track B: `POST /i/:inst/tracks/:tid/status {status:"archived"}` (`z.enum([draft, published, archived])`, `packages/api/src/app.ts:486`). This is reversible by setting `draft` again and is written to the audit log by the `audit_tracks` trigger. Its 10 units stay in place.
- Preconditions before anyone runs it: (1) owner decision D-01; (2) a restorable backup/snapshot of the project taken and its restore verified (Supabase backup or a branch), plus an export of both tracks and their 20 units to a file; (3) re-run the section 7.1 query immediately before the change and confirm the md5 values are still equal and `unit_progress`/`certificates` are still 0; (4) if any learner has progress on B by then, migrate nothing automatically: stop and ask.
- Prevent recurrence (CREATE, owner): a new append-only migration for a partial unique index on `(institution_id, title)` where `status <> 'archived'`, or a UI warning when a template with the same title already exists. Applied migrations are never edited (CLAUDE.md).
- Out of scope and not done: any DELETE, any UPDATE, any migration.

## 8. Decision register

| Id | Subject | Class | Decision | Proof | Owner decision |
|---|---|---|---|---|---|
| DUP-01 | DB track adb0b936 (draft) vs 9f0b6d3b | exact | ARCHIVE (status only) after backup | sections 7.1-7.2 | yes (D-01) |
| DUP-02 | packages/web vs web-vercel academy JSON (6 files) | exact (generated mirror) | KEEP | `cmp` identical | no |
| DUP-03 | packages/web vs web-vercel index.html | exact except line 6 | KEEP; generate one from the other | `diff`: line 6 only | yes (build) |
| DUP-04 | 6 equal-title lesson pairs C3/Y1, C6/Y1, R1/Y1 | same-topic-different-level | KEEP + CONNECT | Jaccard 0.010-0.047 | no |
| DUP-05 | 48 skill-level groups taught in 2+ programs (20 with age overlap) | overlapping | KEEP + CONNECT; mark spiral or optional link | section 4.1 | pedagogical reviewer |
| DUP-06 | K4 spread over 7 units / 5 programs | overlapping | KEEP + CONNECT; publish order | section 4.2 | pedagogical reviewer |
| DUP-07 | Track templates 1 / 2 / 10 and tajweed templates 0 / 3 / 4 | overlapping | KEEP + CONNECT | section 4.4 | no |
| DUP-08 | Tajweed content in SPA, quizzes, templates, Q2 | overlapping (topic-level) | KEEP + CONNECT; reviewer compares text | section 4.3 | scholarly reviewer |
| DUP-09 | 629 scholarly near-duplicate clusters; 4,600 exact pairs | exact / near | link to one concept, keep all sources | `dedup_report.py` reproduced | scholarly reviewer (Q-003) |
| DUP-10 | Stale counts in seed, PROGRAMS.md, PIPELINE, ROLLOUT, coherence_audit | inconsistent versions | regenerate or add dated notes | section 6 rows 1-5 | no, except seed/0020 |
| DUP-11 | P07 old vs new title | inconsistent versions | keep new title; refresh docs | section 6 row 6 | owner confirms |
| DUP-12 | UI strings "eight" templates, "forty" competencies | inconsistent versions | fix strings | section 6 rows 7-8 | no |

## 9. Protocol for any future archive or merge

1. Prove identity with a reproducible check (hash or exact comparison) and keep the command in this document.
2. Enumerate every reference (ids in programs, sessions, progress tables, certificates, URLs). A merge is allowed only if no reference is lost or all are redirected.
3. Take and verify a backup (DB snapshot or git-tracked export). Files in this repo are not under git here (the directory is not a git repository), so make a dated copy before any file-level change.
4. Prefer status change (archived) or an alias/redirect over deletion. Never delete scholarly extractions, source records or learner data.
5. Log the change and the reviewer; scholarly or child-safety content needs the named reviewer from `programs.json` `gating`.

## 10. Reproduce

```
python3 -I scripts/dedup_report.py scholarly-assets/extraction <scratch_out>   # then cmp <scratch_out>/dedup_summary.json scholarly-assets/review/dedup_summary.json
cmp packages/web/academy-lessons.json packages/web-vercel/academy-lessons.json   # likewise the other academy files
diff packages/web/index.html packages/web-vercel/index.html                       # line 6 only
python3 -I scripts/validate_programs.py; python3 -I scripts/validate_sessions.py; python3 -I scripts/check_extracted_ids.py
```

The lesson, scenario, principle and skill-level scans are short `python3 -I` scripts over `docs/human-formation/` (normalise Arabic diacritics and alef/ya/ta-marbuta variants, shingle, Jaccard) and can be re-written from section 1.
