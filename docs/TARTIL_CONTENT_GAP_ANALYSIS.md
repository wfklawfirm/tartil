# TARTIL Content Gap Analysis (V3 deliverable)

Date: 2026-11-05. Status: analysis only, DRAFT, unreviewed. No file other than this one was changed; nothing was committed.

Method. Every number below was printed by a script run read-only today, or computed by a one-off script over `docs/human-formation/*.json` (marked "computed"). Statements about the reader, tafsir panel, kids hub, audio and DB come from the repo's own audit docs (`docs/TARTIL_13_*.md`, `docs/governance/*`, `docs/human-formation/qa/db_inventory_2026-11-05.json`) and were NOT re-verified against the live site or database. Per CLAUDE.md, nothing here is a religious ruling, and nothing machine-drafted is publishable without a recorded scholarly review.

## 1. Measured baseline

| Script (run today) | Result |
|---|---|
| `validate_completeness.py` | 25 programs, 25 guides, 347 lessons, 185 scenarios, 52 competencies. RESULT: PASS. 1 warning type: `life_practice_no_parent_note` x25 (example R6-L1, unit min_age=18). |
| `validate_coherence.py` (report mode, exit 0) | 25 programs, 532 items. 1 error, 213 warnings: Coherence 0/50, Competency 0/106, Sequence 1/0, Age 0/24, Timing 0/27, Completeness 0/6. |
| `validate_programs.py` | 0 issues; 532/532 items covered. |
| `validate_sessions.py` | 0 issues, 197 warnings: 104 "week has more than 3 sessions", 46 "week beyond program duration_weeks", 47 "minutes exceed program rhythm". |
| `validate_lessons.py --enriched` | 96 units checked, 0 problems. |

Reading: the content is structurally complete and internally referenced (nothing orphaned, every lesson placed in a program, enrichment fields present). The real gaps are therefore not missing files; they are review status, source depth, age/placement fit, program-level coherence, and the Quran-science areas the academy deliberately does not teach yet.

Corrections to the validators' own signals:
- `Completeness ... placeholder-like text: []` (P01, P06, P14, P16, P17, P25) is a false positive: the regex in `validate_coherence.py` line 44 matches an empty `prerequisites: []` list (checked on P01). Not a content gap; a tooling fix.
- The "0 problems" of `--enriched` does not mean approved: all 96 units and all 52 competencies are `review_status: unreviewed` (computed).

## 2. The V3 addition gate (Section 13), nine questions

1. Is there similar content already on the platform?
2. Can it be reused?
3. Can it be enriched without creating a new copy?
4. Can it be linked to other content?
5. What is the actual learning gap?
6. What new goal would the addition serve?
7. Are trustworthy sources available?
8. How will the quality of the addition be evaluated?
9. Does it need scholarly or pedagogical review before publication?

Rule applied: a gap is "needs-new-content" only if Q1-Q4 are answered "no, nothing reusable, enrichable or linkable", Q5-Q6 name a concrete gap and goal, Q7 has a source, and Q8-Q9 have a path (a named reviewer). V3 s13 says when sources are insufficient the item goes to a documented gap list, not into invented material.

Candidates and verdicts (Q1-Q9 in order):

| Candidate | Q1-Q4 (exists / reuse / enrich / link) | Q5-Q6 gap and goal | Q7 sources | Q8-Q9 evaluation and review | Verdict |
|---|---|---|---|---|---|
| N1 Tafsir learning lessons | Q4 (tadabbur, P21), Q5 (terms incl. tafsir), K1 exist; reader has a tafsir panel (fetch-on-demand, terms unstated, LICENSE_REGISTER). No lesson title contains "tafsir" (computed). | Real: no competency and no lesson teaches how to read a tafsir. Goal not yet defined by owner/scholar. | Classical sources only on-demand; Q-unit source records read "no source record yet"; formation books are third-party, internal-only. | Needs a scholarly reviewer; none appointed (TARTIL_13_CURRENT_STATE, top gap 1). | FAILS Q7 and Q9 today. Not new-content; goes to the documented-gap list and needs scholars (G-Q1). |
| N2 Tajweed rule lessons | Q2 (goals only, by design: "no new rulings"), tajweed library (adult text, under review), foundations stage 5. No lesson title contains "tajweed" or "makharij" (computed). | Real, but Q2's own safeguard forbids platform-written rulings. | Tajweed books exist in the internal corpus only; no source record. | Needs a qualified muqri; tajweed AI assessment deliberately absent. | FAILS Q7 and Q9. Scholar-owned (G-Q2). |
| N3 Child hifz short-surah track | Q3 (hifz method, ages 7-10 to 12-16), K4 (E1, E10, E17, X3, Y1 families), hifz scheduler, homework, plan. | Gap is curation and placement, not absence (FOUNDATION_CURRICULUM: "child short-surah track not curated"). | Q3 anchors are heading-only. | Pedagogical and child-protection reviewers needed (none named). | FAILS Q1-Q4 (reusable and linkable). Needs-linking/adaptation (G-K1), not new. |
| N4 Qira'at beyond the intro | Q6 (4 lessons), `#/qiraat` library, X3-L5. | Beyond-intro depth is a scholar's scope call. Other riwayat text needs licence clearance (owner). | Heading-only anchors. | Scholar required. | FAILS Q5/Q7/Q9. Owner and scholar (G-Q4). |
| N5 Listening foundations / audio | Nothing in the academy; no cleared recordings (KIDS audit). | Real; goal clear. | None cleared. | Needs named qaris and a licence decision. | FAILS Q7. Blocked on owner (G-K3). |
| N6 Adult/parent versions for P15/P16 competencies with no item | Child lessons exist for C3, C4, R1, R2, R3 (ages 5-14, computed) but P15/P16 are age 18+/20+. | Real (validator: P15 C4, R2, R3; P16 C3, R1 have no item). | Principles already extracted per competency. | Pedagogical review plus "refer to a specialist" wording. | CONDITIONAL: only after Q3 enrichment/adaptation of existing lessons is shown insufficient; then a narrow draft, unreviewed (G-F2). |
| N7 Mushaf data (juz/hizb/page, Meccan/Medinan, word meanings) | Reader and 6,236 ayat exist; data absent per TARTIL_13_CURRENT_STATE. | Real, but it is reference data, not lessons. | Needs a licensed, verifiable dataset. | Verification against the approved edition; scholar sign-off. | Out of content scope; owner decision on data source (G-M1). |

Result of the gate: no candidate currently qualifies as needs-new-content. N6 is the only one that can qualify later, and only after adaptation is tried first. This matches V3's rule that reuse and enrichment come first.

## 3. Competency coverage (`COMPETENCIES.md` vs `competencies.json`)

Measured (computed):
- `competencies.json` has 52 competencies. `COMPETENCIES.md` documents 40 (titled "forty"; 40 `###` headings). Missing from the Markdown register: X5, Q1-Q6, H1-H5. So all Quran-science and Seerah competencies exist only in JSON. Classification: needs-adaptation (regenerate or extend the MD from JSON). Fillable by drafting (mechanical, unreviewed).
- Every one of the 52 competencies is declared by at least one program and has at least one lesson unit. None is orphaned.
- All 52 are `unreviewed`. Anchors: 163 heading-only, 4 passage-read (C1, C5, S5 x2), 1 none (X5: "no source anchor yet"). Classification: needs-human-review (scholars/pedagogues); X5 also needs-linking to a source.
- Declared by exactly one program (computed): K1, K2, S3, R6, R7, W1, W4, L2, L3, M3, X5, Q1-Q6, H1-H5 plus others (full map in `programs.json`). K1 and K2 are taught only in P06 (pilot).
- Declared in a program but with no item in it (validator): P12 C2; P15 C4, R2, R3; P16 C3, R1. Classification: needs-adaptation (child lessons exist but are ages 5-14; those programs are adult/parent). See N6.
- Thin (<= 2 items in a program, "too thin to reach a level"): T1 (P02, P05), S6 (P07), C1/C4/C5/R4/T1 (P08), T2 (P09), S1 (P10), L4/R3 (P11), L1/T3/T4/T6 (P13), M1/M2 (P14). Classification: needs-linking first (reuse lessons already taught elsewhere for the competency); pedagogue decides whether enrichment is warranted.
- Sequence error (the only ERROR): P05 teaches S6 (min_age 8) which requires S1 (min_age 10), and S1 is not in an earlier program. Classification: needs-human-review (pedagogue chooses: relax prerequisite, reorder, or add an S1 entry point). Fillable by drafting a proposal only.
- Over-bundled (>6 competencies): P08 (9), P13 (7), P24 (7). Needs-human-review (split or declare primary competencies).
- Multi-domain programs without a `serves` mapping: P05, P08, P11, P19, P22, P24. Needs-linking (add the mapping; no new content).

Level depth (computed from 347 lessons): L1 77, L2 97, L3 117, L4 50, L5 6. Fifteen competencies have lessons only up to L3: K1, K2, K4, C2, C3, C6, S3, S4, S6, T1, R1, R6, R7, L4, X5. L5 ("teaches others") has lessons only in K3, Q6, T3, T4, T6, W1. X5 has no L1 lesson (levels L2, L3 only). Q6 has no L3 (levels L1, L2, L4, L5). Classification: needs-human-review first (is L4 intended for these competencies at all, for example K4 depends on a teacher), then ENRICH, not CREATE (gate Q3).

## 4. Age x level matrix (computed)

Method: each lesson assigned to a band by the lower bound of its `age_range`. This is my own convention; ranges such as "10-14" fall in the lower band.

| Age band | L1 | L2 | L3 | L4 | L5 | Lessons |
|---|---|---|---|---|---|---|
| 5-8 | 44 | 52 | 43 | 4 | 0 | 143 |
| 9-12 | 18 | 25 | 35 | 20 | 0 | 98 |
| 13-17 | 9 | 13 | 31 | 20 | 6 | 79 |
| 18+ | 6 | 7 | 8 | 6 | 0 | 27 |

Competencies by `min_age`: up to 8: 20; 9-12: 19; 13-17: 9; 18+: 4.

Findings:
- 18+ is the thinnest band (27 lessons, 4 competencies with min_age 18+), and has no L5 lesson. Programs for adults are P14, P15, P16, P24. Classification: needs-human-review (is the adult scope intended to stay small?), then ENRICH/ADAPT.
- 5-8 has 4 L4 and no L5 (expected for that age; not a gap).
- Age/placement mismatches (validator, 24 warnings, all "lesson written for younger ages than program age_min"): P24 Z1-L1..L9 (written 15-17, program 18+); P23 Q5-L1..L4 (12-14, program 15+); P09 T3-L1, T6-L1, T6-L2 (12-13, program 14+); P10 T4-L1, T4-L2; P11 R3-L4; P18 Y1-L10..L12 (6, program 7+); P21 Q3-L1 (7-10, program 12+); P22 H2-L1 (9-11, program 12+). Classification: needs-adaptation (either re-band the program, relink the lesson to a program of its age, or write an age-appropriate variant). Re-banding or relinking is fillable by drafting a change list; any new variant is unreviewed.
- Repetition across programs (106 "repeated competency-level" warnings), for example C3 L1/L2 and C6 L1-L3 in both P01 and P17 and P04, S4 in P02 and P19, K4 in P01/P02/P18, R2 in P05/P19, T5/S2 across P10, P22, P24. This is a duplication-audit input, not a gap. Per V3 s4.3, do not merge without checking age, level and source; classification: needs-human-review (keep both, or make one the reuse target and link).

## 5. Program timing and sessions (`validate_sessions.py`, `validate_coherence.py`)

- Timing (27 warnings): declared session time exceeds content in most programs (content fills 60% to 74% of declared minutes, for example P01 73%, P04 66%, P11 60%, P17 60%, P25 60%); P09 stage B is the opposite (content 123%) and P19 stage C is 111%. Classification: needs-adaptation. Choose by gate Q3: ENRICH existing lessons, or reduce declared minutes. A pedagogue decides which; fillable by drafting a proposal.
- Sessions that fall beyond the declared program length: 46 warnings (P21 session 19, P22 sessions 31-37, P23 session 19, P24 sessions 25-38). Over-dense weeks: 104 warnings (P19 week 8; P22 weeks 3 and 5; P24 weeks 10-11). Session minutes over rhythm: 47. Classification: needs-adaptation (recompute the schedule or update `duration_weeks`/rhythm). Fillable by drafting (mechanical); owner/pedagogue confirms the program lengths.
- P07 coherence audit is stale: 14 items missing from `coherence_audit.json` (AG-L1..L9, AG-S1..S5) and 14 listed that are no longer in the program. Classification: needs-linking (regenerate the audit). Fillable by drafting.
- `life_practice_no_parent_note` x25 (R6-L1 etc.): lessons with a life-practice task but no parent note. Whether adult units need a parent note is a pedagogical call: needs-human-review; wording itself fillable by drafting.

## 6. Quran-content areas: what exists vs what is missing

Academy content (computed from `lessons/`, `programs.json`) plus platform features (from repo docs, not re-run).

| Area | Exists in repo | Missing or weak | Class |
|---|---|---|---|
| Mushaf reading | Reader of the Tanzil Uthmani text (6,236 ayat, provisionally approved by the owner, not scholarly); search; English toggle; basmala fix; tajweed colouring display. Academy: Q1 (listening and reciting with adab, ages 7-10), foundations (letters, harakat). | Juz/hizb/page navigation, Meccan/Medinan, word meanings (per TARTIL_13_CURRENT_STATE); no guided child reading flow beyond six short surahs. | G-M1: owner data decision; needs-human-review for the text approval (scholarly). Not content-drafting. |
| Tilawa (recitation) | K4 family (E1, E10, E17, X3, Y1 lessons across P01, P02, P18, P20, P21), Q1; tasmi' pipeline (alignment only; live provider blocked by HTTP 429 per KNOWN_LIMITATIONS 37). | No pronunciation or tajweed assessment (deliberate); no reference recitations; no audio-backed lessons. | G-K3/G-T1: owner and qari; needs-human-review. |
| Tajweed | Q2 (goals only, 4 lessons, "no new rulings"), tajweed library with makharij explorer (adult text, labelled under review), foundations stage 5, track template "Tajweed basics". | No rule lessons; no makharij lab (MAKHARIJ_VISUAL_SYSTEM: not built); no lesson title contains tajweed or makharij. DB holds two identical "أساسيات التجويد" tracks (one published, one draft) per the 2026-11-05 inventory. | G-Q2: scholars. Duplicate track: owner decision, no deletion without backup. |
| Hifz | Q3 (4 lessons; ages 7-10, 8-12, 9-13, 12-16, all placed in P21), K4-L2/L3, E21-L2; hifz scheduler (self-assessed), quizzes, mastery map, homework, study plan. | No curated child short-surah plan; Q3's younger lessons sit in a 12+ program (P21) while P20 (9-12) has none of Q3; no hifz-recitation feedback loop (analysis does not feed the review schedule). | G-K1: needs-linking and needs-adaptation. Scheduler loop: engineering, out of content scope. |
| Tafsir | Q4 (tadabbur and linking verse to conduct, P21), Q5 (terms), reader tafsir panel (Jalalayn, Ibn Kathir, Qurtubi, Baghawi, Tabari fetched on demand; terms unstated). | No competency or lessons on reading a tafsir; verse references in Q units are all empty. | G-Q1: scholars. G-Q3: verse refs. |
| Qira'at | Q6 (4 lessons, levels L1, L2, L4, L5, no L3), Q5 (includes riwayat/ahruf terms), `#/qiraat` library (ten readers and their rawis), sanad register. | Beyond-intro content; other riwayat text not loaded (licence); anchors heading-only. | G-Q4: scholars and owner (licences). |
| Quran sciences | Q5 (5 lessons: asbab, stages of revelation, Meccan/Medinan as approximate classification, who to ask, differing views). Seerah H1-H5, hadith H3-H4. | H4 (verification of reports) and Q5 are placed in P23 (15+) while Q5-L1..L4 were written for 12-14. | Age fit: needs-adaptation (section 4). |
| Kids Quran | P01, P02, P17, P18, P20, X3, Y1 families; Kids hub (letters, harakat, six short surahs); foundations curriculum (6 stages, draft). | 0 of 6 foundation stages complete per the repo's own audit (4 partial, 2 missing: listening foundations and makharij lab); no audio; no reviewers named. | G-K3: owner and qari. |

Source depth for Quran areas: all Q1-Q6 units say "no source record yet" (computed); anchors are heading-only. `verse_refs` is empty in every Q, H and X5 unit and noted "to be set with the scholarly reviewer"; 43 of 96 units have non-empty `verse_refs` overall (computed), so Quran-reference linking is a systematic open item. Classification: needs-linking to verified ayat from the approved edition, which only a scholar can sign off. A drafter may propose references from the verified Quran text for review; those proposals are unreviewed.

## 7. Gap register

Class codes: NN = needs-new-content (none currently pass the gate), NL = needs-linking, NA = needs-adaptation, NR = needs-human-review. "Fill" says who can close it: D = drafted by an assistant as unreviewed material the owner may accept for review; S/O = needs scholars, qualified reviewers or the owner (appointments, money, licences, data, public launch).

| ID | Gap | Evidence | Class | Fill |
|---|---|---|---|---|
| G-F1 | P05 sequence error S6 needs S1 | coherence ERROR | NR (then NL) | D (proposal) then S/O (pedagogue chooses) |
| G-F2 | P12 C2; P15 C4, R2, R3; P16 C3, R1 declared with no item | coherence warnings | NA, then NN only if gate passes | D (adaptation draft) then S/O |
| G-F3 | 24 age-fit mismatches (P24 Z1 x9, P23 Q5 x4, P09 x3, P18 x3, P10 x2, P11, P21, P22 one each) | coherence Age | NA | D (re-band or relink list) |
| G-F4 | Thin competencies (<= 2 items) in 9 programs (P02, P05, P07-P11, P13, P14); programs declaring more than 6 competencies (P08, P13, P24); no `serves` map in 6 programs | coherence Coherence | NL | D |
| G-F5 | 27 timing warnings (content 60-74% of declared time in most; P09-B 123%, P19-C 111%) | coherence Timing | NA | D (proposal), S/O decides enrich vs reduce |
| G-F6 | 197 session warnings (104 dense weeks, 46 beyond duration, 47 over rhythm) | validate_sessions | NA | D (reschedule) then S/O confirms lengths |
| G-F7 | P07 coherence audit stale (14 missing, 14 stale) | coherence | NL | D |
| G-F8 | 106 repeated competency-level pairs across programs | coherence Competency | NR | S/O decides keep/link; no merge |
| G-F9 | Competency levels stop at L3 for 15 competencies; adult band thin; no L5 for 18+ | computed | NR then ENRICH | S/O decides intent; D for enrichment drafts |
| G-F10 | `COMPETENCIES.md` lists 40 of 52 | computed | NA | D (regenerate Q, H, X5 sections) |
| G-F11 | Validator false positive for `[]` | coherence.py line 44 | tooling | D (script fix, separate task; I did not edit it) |
| G-F12 | 25 `life_practice_no_parent_note` | completeness | NR | S/O decides, D wording |
| G-R1 | All 52 competencies and 96 units unreviewed; 163 anchors heading-only; X5 has no anchor | json | NR | S/O (scholarly lead, pedagogical reviewer, child-protection reviewer: none appointed) |
| G-Q1 | No tafsir learning content | no tafsir lesson title; panel only | NR (gate fail) | S/O |
| G-Q2 | No tajweed rule lessons or makharij lab | Q2 goals-only; MAKHARIJ doc | NR (gate fail) | S/O |
| G-Q3 | Empty `verse_refs` in Q1-Q6, H1-H5, X5 units | computed | NL | D (candidate refs from verified text), S/O approves |
| G-Q4 | Qira'at beyond intro; riwayat text licences | Q6, LICENSE_REGISTER | NR | S/O |
| G-Q5 | Q-unit source records absent | "no source record yet" | NR (source work) | S/O for reading and verification; D for record templates |
| G-K1 | Child hifz track not curated; Q3 lessons in P21 (12+) though written for 7-10 | validator Q3-L1; FOUNDATION doc | NL, NA | D (relink/adapt), S/O reviews |
| G-K2 | P20 (9-12) holds none of Q3 | computed | NL | D |
| G-K3 | Listening foundations, audio, makharij lab for kids | KIDS audit | NR (gate fail) | S/O (qaris, licences) |
| G-M1 | Juz/hizb/page nav, Meccan/Medinan, word meanings | CURRENT_STATE | out of content scope | S/O (dataset and approval) |
| G-O1 | Duplicate "أساسيات التجويد" tracks in DB; academy content not in DB; migrations 0017-0020 unapplied | db_inventory 2026-11-05 | owner decision | O (no deletion without backup) |

Drafted items (D) are proposals for human review; accepting them does not publish anything. Items marked S/O cannot be honestly closed by drafting: closing them needs appointed reviewers, licensed data or an owner decision.

## 8. What this analysis did not check

The live site and live database; browser behaviour; audio and tafsir licence terms beyond what LICENSE_REGISTER records; whether the lesson texts are pedagogically or scholarly sound (nobody has reviewed them); duplicate and near-duplicate content at the text level (that is the separate duplication audit). The age x level matrix uses my own lower-bound convention, and it counts lessons only, not scenarios.
