# TARTIL 14.1: Academy rollout report (P01-P25)

**Snapshot: 2026-11-03 22:41 UTC = 2026-11-04 00:41 EET.** Taken from the working tree of `/home/claude/quran-global-platform` (no git repository, so no commit id). **Other agents are editing `docs/human-formation/sessions/*` and `programs.json` while this is written: every count below can change. Re-run the commands in section 0 before relying on a number.** In particular the sessions warning count moved between 108, 120 and 226 during this one hour.

Scope: this file only. No content, validator, migration or UI file was touched by this task. Nothing here is approved by any reviewer; **no program is COMPLETED** (the word is not used because no stage is proven end to end, and nothing is published, reviewed or applied to a database).

## 0. How the numbers were obtained (run, not assumed)

| Command (from repo root) | Result at snapshot |
|---|---|
| `python3 -I scripts/validate_coherence.py` (and `--json`) | 25 programs, 405 items: **72 errors, 154 warnings**. Report mode: exit 0, blocks nothing; `--strict` would fail. |
| `python3 -I scripts/validate_completeness.py` | RESULT: PASS (264 lessons, 141 scenarios, 25 guides, 52 competencies; WARN 51 lessons without vocabulary, 25 adult-unit lessons without a parent note) |
| `python3 -I scripts/validate_sessions.py` | 0 issues, 120 warnings across 21 session files; **P02, P10, P13, P18 have no session file** |
| `python3 -I scripts/validate_programs.py` | programs=25 lessons=264 scenarios=141 covered=405/405; 0 issues |
| `python3 -I scripts/validate_lessons.py --enriched` | 74 units checked; 0 problems |
| `node scripts/validate_completeness_rendered.mjs` | RESULT: PASS (25 programs, 264 lessons, 141 scenarios, learner and guide mode) |
| ad-hoc scans (grep/Python, not repo scripts) | refs: 405 distinct, each hosted by exactly one place (0 duplicates, 0 orphans); HTML entities 0; U+FFFD/ZWSP/BOM 0; U+FD47 0; `private_note` with a safety exception 264/264 |

Not run: `scripts/e2e_academy.mjs` (long, and it aborts on non-academy failures), `npm test`, any test against a live database or the deployed site (Vercel Authentication blocks it). The coherence audit file `qa/coherence_audit.json` is dated 2026-11-03, status `audit-draft-unreviewed`, and describes P01-P24; it is **stale for P07** (still lists the old 16 items) and has no entry for P25.

### Status vocabulary used below

- **A AUDITED**: the gates above were run on the program in this snapshot. All 25.
- **I IMPLEMENTED**: data was changed for this program in the 14.1 wave (P07 rebuilt, P25 created, P08/P21 received relocated items, P06 edge removed). Drafted session files exist for 21 programs but they are being rewritten by another stream, so they are not counted as 'implemented' here.
- **T TESTED**: the coherence validator reports **0 errors** for the program *and* the structural validators pass. This says the data is internally consistent, not that it is good pedagogy. Programs with T: P02, P06, P07, P09, P10, P13, P16, P18, P20, P25.
- **S NEEDS_SCHOLARLY_REVIEW / P NEEDS_PEDAGOGICAL_REVIEW**: every unit of every program has `review_status: unreviewed`; no reviewer is appointed. Therefore S and P apply to all 25.
- **B BLOCKED**: for publication, all 25 (see section 4: no reviewers, migrations 0017-0020 not applied, no consumer of the status table). Programs marked **B\*** are additionally blocked on an owner decision before the *fix* can continue.
- COMPLETED: used for nothing.

## 1. Report per program

### 1.1 Matrix (errors/warnings per gate; severity is the audit's 0-45 weighted score, lower is better)

| Prog | Title | Ages | Plan | Items | Sev (audit -> now) | Coh | Comp | Seq | Age | Time | Content / declared min | Sessions file | Flags |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P01 | خطواتي الأولى | 5-7 | 4w, جلستان أسبوعيًّا، ٢٠ دقيقة | 5 | 24 -> 24 | 0/1 | 0/5 | 0/0 | 0/0 | 2/0 | 76 / 160 (47%) | 5 (wk 1-3) | A S P B |
| P02 | أضبط نفسي وأسأل وأحفظ | 7-8 | 4w, ٣ جلسات أسبوعيًّا، ٢٥ دقيقة | 12 | 35 -> 22 | 0/1 | 0/4 | 0/0 | 0/0 | 0/2 | 220 / 300 (73%) | none | A T S P B* |
| P03 | صدقي وأمانتي وبرّي | 8 | 7w, ٣ جلسات أسبوعيًّا، ٢٥ دقيقة | 15 | 14 -> 14 | 0/0 | 0/1 | 0/0 | 0/0 | 1/1 | 293 / 525 (56%) | 15 (wk 1-6) | A S P B |
| P04 | أرحم وأعدل وأتواضع وأشكر | 8 | 8w, ٣ جلسات أسبوعيًّا، ٢٥ دقيقة | 15 | 5 -> 5 | 0/0 | 0/0 | 0/0 | 0/0 | 2/2 | 325 / 600 (54%) | 15 (wk 1-7) | A S P B |
| P05 | أسمع وأتكلم وأصاحب | 8 | 8w, ٣ جلسات أسبوعيًّا، ٢٥ دقيقة | 18 | 15 -> 15 | 0/2 | 0/0 | 1/0 | 0/0 | 5/1 | 357 / 600 (59%) | 18 (wk 1-8) | A S P B* |
| P06 | أتثبّت قبل أن أصدّق | 11-12 | 8w, جلستان أسبوعيًّا، ٤٠ دقيقة | 20 | 8 -> 8 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 529 / 640 (83%) | 20 (wk 1-10) | A I T S P B |
| P07 | أتعلّم كيف أتعامل مع غضبي | 10-12 | 6w, ٣ جلسات أسبوعيًّا، ٣٥ دقيقة | 18 | 29 -> 4 | 0/27 | 0/0 | 0/0 | 0/0 | 0/2 | 404 / 630 (64%) | 18 (wk 1-6) | A I T S P B* |
| P08 | أصدقائي وخلافاتي | 11-12 | 8w, جلستان أسبوعيًّا، ٣٥ دقيقة | 23 | 21 -> 20 | 0/3 | 0/0 | 0/0 | 0/0 | 1/1 | 549 / 560 (98%) | 23 (wk 1-12) | A I S P B |
| P09 | أميّز وأستدل وأبحث | 14-17 | 8w, جلستان أسبوعيًّا، ٤٥ دقيقة | 20 | 15 -> 15 | 0/1 | 0/0 | 0/0 | 0/3 | 0/1 | 613 / 720 (85%) | 20 (wk 1-10) | A T S P B |
| P10 | أقرر بالشورى | 15-17 | 8w, جلستان أسبوعيًّا، ٥٠ دقيقة | 15 | 28 -> 27 | 0/1 | 0/2 | 0/0 | 0/6 | 0/2 | 503 / 800 (63%) | none | A T S P B* |
| P11 | مالي ومبادرتي | 15-17 | 8w, جلستان أسبوعيًّا، ٤٥ دقيقة | 15 | 17 -> 17 | 0/2 | 0/0 | 0/0 | 0/1 | 3/1 | 530 / 720 (74%) | 15 (wk 1-8) | A S P B |
| P12 | أمانة العمل والعهد | 16+ | 8w, جلستان أسبوعيًّا، ٤٥ دقيقة | 13 | 7 -> 7 | 0/1 | 0/0 | 0/0 | 0/0 | 1/1 | 417 / 720 (58%) | 13 (wk 1-7) | A S P B |
| P13 | قائد ومرشد ناشئ | 16+ | 8w, جلستان أسبوعيًّا، ٥٠ دقيقة | 17 | 30 -> 30 | 0/1 | 0/0 | 0/0 | 0/0 | 0/2 | 498 / 800 (62%) | none | A T S P B* |
| P14 | المسؤولية العامة والتقييم العادل | 18+ | 8w, جلستان أسبوعيًّا، ٥٠ دقيقة | 16 | 20 -> 20 | 0/1 | 0/0 | 0/0 | 0/0 | 5/1 | 569 / 800 (71%) | 16 (wk 1-8) | A S P B |
| P15 | نحو بيت مستقر | 18+ | 4w, جلسة أسبوعيًّا، ٤٥ دقيقة | 5 | 3 -> 3 | 0/3 | 0/0 | 2/0 | 0/0 | 0/1 | 136 / 180 (76%) | 5 (wk 1-5) | A S P B* |
| P16 | تربية أبنائي | 20+ | 4w, جلسة أسبوعيًّا، ٤٥ دقيقة | 5 | 3 -> 3 | 0/2 | 0/0 | 0/0 | 0/0 | 0/1 | 136 / 180 (76%) | 5 (wk 1-5) | A T S P B |
| P17 | أرحم وأشكر وأسمع قصص السيرة | 6-8 | 6w, ٣ جلسات أسبوعيًّا، ٢٠ دقيقة بحضور وليّ الأمر | 15 | 19 -> 19 | 0/0 | 0/2 | 0/0 | 0/0 | 3/0 | 181 / 360 (50%) | 15 (wk 1-5) | A S P B |
| P18 | أسمع بهدوء وأرتّب يومي | 7-8 | 6w, ٣ جلسات أسبوعيًّا، ٢٠ دقيقة | 18 | 34 -> 26 | 0/0 | 0/3 | 0/0 | 0/6 | 0/4 | 241 / 360 (67%) | none | A T S P B* |
| P19 | أمانتي ومثابرتي وأسئلتي وكلامي اللطيف | 8 | 8w, ٣ جلسات أسبوعيًّا، ٢٥ دقيقة | 16 | 23 -> 23 | 0/1 | 0/5 | 0/0 | 0/0 | 1/4 | 333 / 600 (56%) | 16 (wk 1-6) | A S P B |
| P20 | نواة القرآن للصغار: إصغاء وأدب وتعلّم | 9-12 | 6w, ٣ جلسات أسبوعيًّا، ٣٠ دقيقة | 17 | 15 -> 15 | 0/0 | 0/1 | 0/0 | 0/0 | 0/2 | 378 / 540 (70%) | 17 (wk 1-6) | A T S P B |
| P21 | الحفظ المنهجي والتدبّر وأثري الخاص | 12-17 | 8w, ٣ جلسات أسبوعيًّا، ٣٠ دقيقة | 19 | 16 -> 16 | 0/0 | 0/1 | 1/0 | 0/1 | 5/2 | 496 / 720 (69%) | 19 (wk 1-9) | A I S P B* |
| P22 | السيرة والشمائل والآداب والمسؤولية | 12-17 | 8w, ٣ جلسات أسبوعيًّا، ٣٠ دقيقة | 31 | 24 -> 24 | 0/1 | 0/3 | 5/0 | 0/1 | 16/1 | 869 / 720 (121%) | 31 (wk 1-11) | A S P B* |
| P23 | علوم القرآن والقراءات وتوثيق الأخبار | 15-17 | 8w, ٣ جلسات أسبوعيًّا، ٤٠ دقيقة | 19 | 14 -> 14 | 0/0 | 0/0 | 0/0 | 0/4 | 1/2 | 603 / 960 (63%) | 19 (wk 1-8) | A S P B |
| P24 | العمل والمعرفة والمهارات اليومية | 18+ | 8w, ٣ جلسات أسبوعيًّا، ٤٠ دقيقة | 32 | 25 -> 25 | 0/2 | 0/0 | 8/0 | 0/9 | 9/1 | 1035 / 960 (108%) | 32 (wk 1-11) | A S P B* |
| P25 | أرتّب يومي وأراجع نفسي | 10-12 | 4w, جلستان أسبوعيًّا، ٢٥ دقيقة | 6 | n/a -> 6 | 0/0 | 0/1 | 0/0 | 0/0 | 0/2 | 121 / 200 (60%) | 6 (wk 1-4) | A I T S P B* |

Reading the matrix: cells are ERRORS/WARNINGS. 'Sev audit -> now' shows only P07 moved materially (29 -> 4 after the rebuild); P08 went 21 -> 20 after receiving P07 items; every other severity equals the audit value, consistent with nothing else having been restructured. Totals: Timing 65 errors, Sequence 17 errors (all other gates 0 errors); that is the whole of the 82.

### 1.2 Cross-cutting findings (apply to every program unless a program block says otherwise)

- **Evidence (الأدلة).** All 25 guides and all units: `review_status: unreviewed`. 531 extracted principles; locator check (`check_extracted_ids.py --locators`, needs the private corpus, not run by me) was reported at 2 failing (C6-10, K2-01) in `TARTIL_14_1_SOURCE_INTEGRITY.md`. No edition, muhaqqiq, rights record or takhrij for any formation book; heritage text is not used as psychological evidence (policy in that document). Items in units that state `لا سجل مصدري بعد` (measured today): P07 14/18, P17 6/15, P20 12/17, P21 12/19, P22 26/31, P23 19/19; all other programs 0.
- **Privacy (الخصوصية).** *Fixed since the child-safety review:* all 264 lesson `private_note` texts carry a safety exception; the viewer now has a delete control (`acDeleteMine` in `packages/web-vercel/index.html`) and per-user storage keys, so the ~165 mentions of «زر الحذف» are no longer a promise without code (I checked the code, not a browser; the UX document reports its e2e section as passing). *Still open:* absolute claims remain in `lessons_AG3.json` (P07: «ولن يقرأها أحد») and `lessons_G3.json` S1-S1 (hosted in P25: «لن يقرأ هذا الدفتر أحد غيره»); guides and lessons are public static JSON, so the 'adults only' guide is visible to anyone who opens the file; `guide_script`/`safeguards` are hidden only by a UI toggle. Parent privacy text lacks a safety exception in the guides of P02, P10, P11, P14, P15, P16 (crude regex; verify by reading). The 'not psychotherapy' paragraph is present in only 5 of 25 guides (P07, P08, P16, P24, P25; crude regex). Notebook and progress are device-local; nothing is uploaded.
- **Encoding (الترميز).** 0 HTML entities, 0 replacement/zero-width/BOM characters, 0 U+FD47 (the stray character reported earlier in `extracted/S1.json` is gone). Editorial log: 428 logged edits in `qa/editorial_changes.json`. Independent QA logs exist only for lesson groups G1-G8 and guides P01-P16; none for groups H, Q, X, Y, Z lessons (P17-P24 content) or guides P17-P25. Items in G1-G8 units, per program: 100% for P01-P06, P08-P16 and P25 (P07 22%, P21 10%, P17-P20 and P22-P24 0%).
- **Time (الزمن).** Content fills under 75% of declared time in 17 of 25 programs, and exceeds it in P22 (121%, error) and P24 (108%, warning). Scenarios carry no duration; the validator estimates 8-20 min (a lower bound). `academy-sessions.json` is built but `index.html` does not fetch it: sessions are data only, not shown to learners.
- **Age (العمر).** 31 age warnings: P09 3, P10 6, P11 1, P18 6, P21 1, P22 1, P23 4, P24 9 (lessons written entirely below the program's `age_min`). The adult gate is UI-only and applies only to accounts with a `student` membership.
- **Coherence (التماسك).** Only P07 has an item-to-outcome (`serves`) map; in the other 24 programs coherence rests on competency match alone, which the audit itself calls weak. Eight 'placeholder-like text: []' completeness warnings (P01, P06, P14, P15, P16, P17, P24, P25) list no text: a validator quirk, not investigated.

### 1.3 Program blocks

#### P01 خطواتي الأولى (ages 5-7) - flags: A S P B
- Coherence: 3 competencies (C3, C6, K4) all with <=2 items; overlaps P17 on C3/C6 (Jaccard 0.5, no declared sequence link); 5 (competency, level) pairs are repeated with P17.
- Time: 76 min of content in 160 declared (47%); stage P01-B 35%. Sessions file: 5 sessions, weeks 1-3 of 4.
- Age / sequence: No age warning (P01 is ages 5-7, P17 ages 6-8).
- Fixed: Guide QA edits (14, qa/QA_GUIDES_P01.md); privacy text has a safety exception.
- Remaining: Choose the owning program for C3/C6 (P01 or P17), then shrink or merge. Declared duration is padded.

#### P02 أضبط نفسي وأسأل وأحفظ (ages 7-8) - flags: A T S P B*
- Coherence: Worst coherence score. 5 competencies from 3 domains (K, S, T), 17 items, no `serves` map. Repeats S3 L1-L3 and K4 that P18 teaches to the same ages (7 repeated pairs: also S4 vs P19 Y2, T1).
- Time: 306 min of 600 declared (51%); stage P02-B 35%.
- Age / sequence: Ages 7-8; no age warning. Levels L1-L3.
- Fixed: Nothing structural. Guide QA edits (P02 in qa/QA_GUIDES_P01.md).
- Remaining: Owner decision O-2: one owner program per duplicated (competency, level) with P18; then re-scope P02 to a single outcome. No session file exists yet.

#### P03 صدقي وأمانتي وبرّي (ages 8) - flags: A S P B
- Coherence: C and R domains, 3 competencies; one repeated pair; audit rates grouping as the main problem.
- Time: 293 of 525 min (56%); error. Sessions: 15 sessions, weeks 1-6 of 7.
- Age / sequence: No age warning.
- Fixed: Guide QA edits (4).
- Remaining: Reduce declared weeks or add content; pedagogical reviewer to confirm grouping.

#### P04 أرحم وأعدل وأتواضع وأشكر (ages 8) - flags: A S P B
- Coherence: 4 competencies, all domain C; no repetition or overlap. No coherence finding.
- Time: 325 of 600 min (54%). Lesson C4-L3 is 35 min in a 25-min session.
- Age / sequence: No age warning.
- Fixed: Guide QA edits (2).
- Remaining: Declared 8x3x25 is padded; fix rhythm or add content.

#### P05 أسمع وأتكلم وأصاحب (ages 8) - flags: A S P B*
- Coherence: 5 competencies from R, S, T; T1 thin. Sequence ERROR: S6 requires S1, which is neither earlier in P05 nor in a prerequisite program.
- Time: 357 of 600 min (59.5%, just under the 60% error floor); T1-L2, R5-L1, R5-L2 are 35 min in 25-min sessions; stage P05-C 35%.
- Age / sequence: No age warning.
- Fixed: Guide QA (28 edits, qa/QA_GUIDES_P05.md).
- Remaining: Owner decision O-3 (prerequisite): relax S6<-S1 or add P25/S1 as a prerequisite of P05.

#### P06 أتثبّت قبل أن أصدّق (ages 11-12) - flags: A I T S P B
- Coherence: 4 competencies (K, T); no coherence error. The P06->P07 age contradiction was removed.
- Time: 529 of 640 min (83%); fits.
- Age / sequence: No age warning (P06 is 11-12).
- Fixed: `next_programs` no longer lists P07 (now ['P09']).
- Remaining: Scholarly review of the verification content (K/T) is the gate, not structure.

#### P07 أتعلّم كيف أتعامل مع غضبي (ages 10-12) - flags: A I T S P B*
- Coherence: Rebuilt to a single anger outcome: 18 items, competencies S5/S6 only, `serves` map O1-O6 on every item, 0 coherence errors. S6 thin (<=2 items per level) warning remains.
- Time: 404 of 630 min (64%): warning, not error. Stage P07-C 49%. 18 sessions, weeks 1-6.
- Age / sequence: Ages 10-12. The new AG units are written for 10-12. S5-L3/S6-L3 reused.
- Fixed: Title, scope, items relocated (12 of 16 old items left, none deleted), P25 created, sessions P07.json, guide rewritten, P06 edge removed, 14 new refs AG-L1..L9/AG-S1..S5.
- Remaining: Duration decision O-1 (see 4). 29 coherence warnings are mostly a STALE AUDIT: qa/coherence_audit.json item_audit still describes the old 16 items. 14 of 18 items have no source record (`لا سجل مصدري بعد`). AG3 still says «ولن يقرأها أحد» (absolute claim). Needs a child mental-health reviewer (gating.needs_named_reviewers).

#### P08 أصدقائي وخلافاتي (ages 11-12) - flags: A I S P B
- Coherence: Now the biggest bundle: 9 competencies (C1, C4, C5, L4, R2-R5, T1) from 4 domains, 5 thin, 23 items. It received C4-L4, C4-S2, C5-L4 and C1-L4 from the P07 relocation.
- Time: 549 of 560 min (98%) overall but stage P08-C at 123% of capacity (documented in the Adab al-Ghadab report s.11); R5-L4 is 45 min in a 35-min session.
- Age / sequence: No age warning.
- Fixed: Received the relocated items; sessions P08.json (23 sessions, weeks 1-12 of 8).
- Remaining: Re-split P08 (conflict skills vs honesty/criticism). At snapshot the session file spans 12 weeks for an 8-week program.

#### P09 أميّز وأستدل وأبحث (ages 14-17) - flags: A T S P B
- Coherence: 4 competencies, K/T. T2 thin. Overlaps P13 on T3/T6 (declared sequence link exists).
- Time: 613 of 720 min (85%): fits.
- Age / sequence: 3 lessons written for ages 12-13 in a 14+ program (T3-L1, T6-L1, T6-L2).
- Fixed: Guide QA edits (5).
- Remaining: Move or rewrite the three young lessons; level span 4 should be justified.

#### P10 أقرر بالشورى (ages 15-17) - flags: A T S P B*
- Coherence: 5 competencies from L, S, T; S1, S2, T5 thin. P25 now hosts S1-L1..S2-S1 for 10-12, while P10 (15-17) keeps S1-L3/S2-L3.
- Time: 503 of 720 min (70%); L1-L3 and L1-L4 are 55 min in 45-min sessions.
- Age / sequence: 6 lessons written for ages 12-14 in a 15+ program (T4-L1..L3, S1-L3, S2-L3, T5-L4).
- Fixed: Nothing structural. P25 next_programs lists P10 but P10 prerequisites do not list P25 (inconsistent, unfixed).
- Remaining: Rescope; fix ages; no session file yet.

#### P11 مالي ومبادرتي (ages 15-17) - flags: A S P B
- Coherence: L, R, W domains; L4 and R3 thin.
- Time: 530 of 720 min (74%); W4-L3, W4-L4, L4-L3 are 60 min in 45-min sessions.
- Age / sequence: R3-L4 written for 12-14 in a 15+ program.
- Fixed: Guide QA edits (4).
- Remaining: Shorten three 60-min lessons or lengthen sessions.

#### P12 أمانة العمل والعهد (ages 16+) - flags: A S P B
- Coherence: Declared competency C2 has no item in the program.
- Time: 417 of 720 min (58%): error (below 60%). 13 sessions over 7 weeks.
- Age / sequence: Level span 4 (adults): no age warning.
- Fixed: Guide QA edits (3).
- Remaining: Remove C2 from the declaration or add content; shorten the declared duration.

#### P13 قائد ومرشد ناشئ (ages 16+) - flags: A T S P B*
- Coherence: L, M, T domains, 6 competencies, T3/T4/T6 thin; overlaps P09, P14 (declared links) and P24 (undeclared, T4/T6).
- Time: 633 of 720 min (88%) overall but stage P13-D 150%; L2-L3, L2-L4 are 55 min in 45-min sessions.
- Age / sequence: Ages 16+; the Coherence document flags L5 'teach others' lessons for age 16. No age warning from the validator.
- Fixed: Guide QA (qa/QA_GUIDES_P13.md; 3 edits).
- Remaining: Owner decision on scope (mentor-leader vs thinking skills); no session file yet.

#### P14 المسؤولية العامة والتقييم العادل (ages 18+) - flags: A S P B
- Coherence: L, M; M1/M2 thin; overlaps P13 on M1/M2.
- Time: 569 of 800 min (71%); five 60-min lessons in 50-min sessions (L3-L3, L3-L4, M1-L4, M3-L3, M3-L4). Sessions: 16 over 8 weeks.
- Age / sequence: No age warning.
- Fixed: Guide QA edits (2).
- Remaining: Resolve overlap with P13.

#### P15 نحو بيت مستقر (ages 18+) - flags: A S P B*
- Coherence: Adults-gated (18+). Declared competencies C4, R2, R3 have no item. Sequence ERRORS: R6 requires R2 and R3, absent from P15 and its prerequisites.
- Time: 136 of 180 min (76%).
- Age / sequence: Adult only; gating `adults_gated`. The gate is UI-only (see 5).
- Fixed: Guide QA edits (4).
- Remaining: Owner decision O-3: add R2/R3 prerequisites or declare them; wording of family topics needs scholarly and child-protection review before any exposure.

#### P16 تربية أبنائي (ages 20+) - flags: A T S P B
- Coherence: Adults-gated (20+). Declared C3, R1 have no item.
- Time: 136 of 180 min (76%).
- Age / sequence: Adult only.
- Fixed: Guide QA edits (2).
- Remaining: Declaration vs content; same gating caveat as P15.

#### P17 أرحم وأشكر وأسمع قصص السيرة (ages 6-8) - flags: A S P B
- Coherence: C and H, 3 competencies; 2 repeated pairs; overlaps P01 (C3/C6, Jaccard 0.5).
- Time: 181 of 360 min (50%): error; stages A and B at 37% and 30%. 15 sessions over 6 weeks x 3 slots.
- Age / sequence: Ages 6-8 with a guardian present; 6 of 15 items have no source record.
- Fixed: Guide QA edits (2).
- Remaining: Shorten to fit content or add content; settle P01 overlap.

#### P18 أسمع بهدوء وأرتّب يومي (ages 7-8) - flags: A T S P B*
- Coherence: Mirror of P02 (K, R, S): 6 repeated pairs and overlap with P02 on K4/S3.
- Time: 155 of 360 min (43%): the lowest ratio of any program; stages A/B at 25%/28%.
- Age / sequence: 6 lessons (Y1-L7..L12) written for ages 5-6 in a 7+ program.
- Fixed: Guide QA edits (2).
- Remaining: Owner decision O-2 with P02. No session file.

#### P19 أمانتي ومثابرتي وأسئلتي وكلامي اللطيف (ages 8) - flags: A S P B
- Coherence: C, R, S, T (4 domains) and 5 repeated pairs (S4 vs P02, others).
- Time: 333 of 600 min (56%): error.
- Age / sequence: No age warning.
- Fixed: Guide QA edits (2).
- Remaining: Resolve the repeated pairs; the audit rates grouping as the main problem.

#### P20 نواة القرآن للصغار: إصغاء وأدب وتعلّم (ages 9-12) - flags: A T S P B
- Coherence: K and Q, 3 competencies; one repeated pair.
- Time: 378 of 540 min (70%); two 35-min lessons in 30-min sessions.
- Age / sequence: Ages 9-12 (wide); 12 of 17 items have no source record.
- Fixed: Guide QA edits (2).
- Remaining: Quran-core content is the most sensitive: needs scholarly review before any other step.

#### P21 الحفظ المنهجي والتدبّر وأثري الخاص (ages 12-17) - flags: A I S P B*
- Coherence: K and Q, 3 competencies. Received K4-L3 and K4-S2 (stage C). Sequence ERROR: Q4 requires K1.
- Time: 496 of 720 min (69%); Q3-L4, Q4-L2..L4, X3-L6 are 40 min in 30-min sessions.
- Age / sequence: Q3-L1 written for 7-10 in a 12+ program. 12 of 19 items have no source record.
- Fixed: Received the K4 items; sessions P21.json.
- Remaining: Prerequisite Q4<-K1 decision (O-3); session file spans more weeks than the program declares (see matrix).

#### P22 السيرة والشمائل والآداب والمسؤولية (ages 12-17) - flags: A S P B*
- Coherence: C, H, S; 3 repeated pairs (X4 vs P25 candidates). Sequence ERRORS: H1 levels go backwards (H1-L2 is labelled L4; H1-L3, L4, L5), and X4-L4 (S2 L2) has no L1.
- Time: 869 of 720 min (121%): content EXCEEDS the declared time; stages B/C at 179%/190%; thirteen lessons of 40-45 min in 30-min sessions. 31 sessions for 24 slots.
- Age / sequence: H2-L1 written for 9-11 in a 12+ program. 26 of 31 items have no source record (prophetic biography).
- Fixed: Nothing structural.
- Remaining: Highest number of hard errors (21). The heritage/sira content is the most exposed to scholarly review. Candidate: move X4-L4..L6 to P25 (owner decision).

#### P23 علوم القرآن والقراءات وتوثيق الأخبار (ages 15-17) - flags: A S P B
- Coherence: H, Q; level span 4.
- Time: 603 of 960 min (63%); H4-L4 is 50 min in a 40-min session.
- Age / sequence: 4 lessons (Q5-L1..L4) written for 12-14 in a 15+ program. All 19 items have no source record.
- Fixed: Nothing structural.
- Remaining: Quran sciences and recitation readings: scholarly review is a prerequisite for any exposure.

#### P24 العمل والمعرفة والمهارات اليومية (ages 18+) - flags: A S P B*
- Coherence: 7 competencies (K, S, T, W): bundle. Sequence ERRORS (8): T6 needs K2, K3 needs K1, T4 needs T3, and X2-L1, X2-L4, Z1-L1, Z1-L4, Z1-L7 start above L1.
- Time: 1035 of 960 min (108%): warning; stage P24-B 137%; eight 50-55 min lessons in 40-min sessions. 32 sessions for 24 slots.
- Age / sequence: 9 lessons (Z1-L1..L9) written for ages 15-17 in an 18+ program.
- Fixed: Nothing structural.
- Remaining: Largest program (32 items). Split or re-sequence; several prerequisites live outside the program.

#### P25 أرتّب يومي وأراجع نفسي (ages 10-12) - flags: A I T S P B*
- Coherence: New (owner-ordered): S1 + S2 for ages 10-12, 6 items, 0 errors. Created from the P07 relocation; the audit had it as `proposed_needs_owner_decision`.
- Time: 121 of 200 min (60%, at the floor); one 30-min session in a 25-min rhythm. 6 sessions over 4 weeks.
- Age / sequence: No age warning.
- Fixed: Created; sessions P25.json; guide written.
- Remaining: No `serves` map; the P25 guide has no independent QA log; S1-S1 text says nobody else will read the notebook (absolute claim, G3). X4-L4..L6 not moved.

## 2. Migration plan that preserves learner progress

### 2.1 What exists (verified in code)

- **On the device (the only copy today).** `packages/web-vercel/index.html` stores progress as `acx:user:<userId>:done` (map `{ref: 1}`) or `acx:guest:done`, and each notebook entry as `...:ref:<lessonId>`. Old unscoped keys `acx_done`, `acx_ref_*` are read only as guest data and never written; a signed-in user starts from zero on first load of this build (UX report item 8). Program counters ("أنجزتَ n من N") are **derived** by counting the program's refs against the map. The viewer does not read `role`/`optional_link` (0 matches), so an optional link counts like a core item in the viewer's counter although the validators exclude it from timing.
- **On the server (built, not applied, not called by the UI).** `0019_academy_progress.sql`: `academy_progress(user_id, kind, ref, program_id, status, payload)` unique on `(user_id, kind, ref)`; `ref` matches `^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$` (so `AG-L1` is valid); `program_id` is an attribute, not part of the key; status cannot go backwards; no free text; row budget 2000. `GET/PUT/DELETE /me/academy/progress` exist in `packages/api/src/academy-progress.ts`. Server summaries return `sessionsAvailable: null`; the client must supply denominators.

### 2.2 Rules (must hold for every future change to programs.json or lessons)

1. **Progress keys are `ref` only.** Never key progress by program id, stage id, session number, title or position. Stage ids (`P07-A`...) and session numbers are not stored and may change freely.
2. **A `ref` is permanent and never reused.** Never rename a ref; never give an existing ref different content; never delete a ref that any learner may have completed. Retire instead: mark the lesson `status: retired` and keep it resolvable. *Not implemented:* there is no retired-refs registry or validator. Proposed: `docs/human-formation/retired_refs.json` plus a check in `validate_programs.py` that every ref ever released still exists or has an entry (decision O-7 below).
3. **A change of meaning is a new ref.** If an objective materially changes, issue a fresh ref with an explicit `level` (the Coherence doc notes ref numbers are opaque: H1-L2 is level L4). A *split* keeps the old ref on the part that retains the old objective and issues new refs for the rest (C1-L4 is recorded as a Split but **was not actually split**: no new ref exists yet, so nothing needs migrating).
4. **Moving an item between programs changes no key.** The learner's completion follows the ref. Each ref must stay hosted exactly once as a core item (verified now: 405 refs, 0 hosted twice). Show the same ref in a second program only as `role: optional_link` or `recap`.
5. **No data rewrite when moving.** Counters recompute; "n of N" in the old program shrinks and appears in the new one. State this once in the release notes. A learner who finished S1-L1 under old P07 now sees it done in P25.
6. **When items move, in this order:** (a) edit data; (b) run `validate_programs.py` (must report 405/405 covered) and `validate_coherence.py --program Pxx`; (c) confirm no ref changed (diff of the ref set); (d) rebuild with `scripts/build_academy.py`; (e) only then publish.
7. **If server sync is enabled later** (decision O-5): migrate the local map as `ref -> completed` per account, one `PUT` batch of up to 100 items, `kind` lesson|scenario; a guest map stays visibly separate until the learner signs in and explicitly merges; the merge rule is not designed (the PUT is last-write-wins except that `completed` never regresses). The guardian of a minor cannot yet act for a child.

### 2.3 What happens to the items that moved in this wave (measured from `programs.json`)

| Items | From | To | Effect on a learner who completed them |
|---|---|---|---|
| S1-L1, S1-L2, S1-S1, S2-L1, S2-L2, S2-S1 | old P07 | P25 (new) | still done; counted in P25 |
| K4-L3, K4-S2 | old P07 | P21 stage C | still done; counted in P21 (placed at the end of stage C to avoid two Sequence errors) |
| C4-L4, C4-S2 | old P07 | P08 stage C | still done; counted in P08 |
| C5-L4 | old P07 | P08 stage A | still done; counted in P08 |
| C1-L4 | old P07 | P08 stage B, `optional_link` | still done; the viewer counts it as a normal item (see 2.1) |
| S5-L3, S5-S2, S6-L3, S6-S2 | old P07 | P07 | unchanged |
| AG-L1..L9, AG-S1..S5 (14 new refs) | n/a | P07 | none exist yet in anyone's progress |

Unchanged and safe: P07 `id` and `slug` (`adbut-ghadabi`) so `#/academy/p/adbut-ghadabi` still works. The only user-visible reset is the signed-in first load of the per-user-key build (2.1). I could not test any real learner's stored data.

## 3. Priority order for the remaining programs (worst first)

Primary key: the audit's weighted severity (grouping x5, repetition x4, overlap x3, level mix x2, timing x1). Tie-break: hard errors. P07 (rebuilt) and P25 (new) are excluded from the queue; their open items are in section 1.3. Grouped where two programs cannot be fixed independently.

| # | Program | Sev | Hard errors | Why first | Blocked on |
|---|---|---|---|---|---|
| 1 | P13 قائد ومرشد ناشئ | 30 | 0 | 3 domains; overlaps P09/P14/P24; stage D 150% | scope decision (no ID) |
| 2 | P10 أقرر بالشورى | 27 | 0 | 5 unrelated competencies; 6 under-age lessons | scope decision (no ID) |
| 3 | P18 أسمع بهدوء وأرتّب يومي | 26 | 0 | mirror of P02; 43% filled; ages 5-6 content in 7+ | O-2 |
| 4 | P24 العمل والمعرفة والمهارات اليومية | 25 | 17 | 7 competencies; 8 sequence errors; 32 items | O-3 |
| 5 | P22 السيرة والشمائل والآداب والمسؤولية | 24 | 21 | 121% over time; H1 level order; most hard errors | O-3, O-4 |
| 6 | P01 خطواتي الأولى | 24 | 2 | overlaps P17; padded 47% | reviewers |
| 7 | P19 أمانتي ومثابرتي وأسئلتي وكلامي اللطيف | 23 | 1 | 4 domains; 5 repeated pairs | reviewers |
| 8 | P02 أضبط نفسي وأسأل وأحفظ | 22 | 0 | 5 unrelated competencies; duplicates P18 | O-2 |
| 9 | P14 المسؤولية العامة والتقييم العادل | 20 | 5 | overlaps P13; 60-min lessons in 50-min sessions | reviewers |
| 10 | P08 أصدقائي وخلافاتي | 20 | 1 | 9-competency bundle created by the P07 move | reviewers |
| 11 | P17 أرحم وأشكر وأسمع قصص السيرة | 19 | 3 | overlaps P01; 50% filled | reviewers |
| 12 | P11 مالي ومبادرتي | 17 | 3 | 3 domains; 60-min lessons | reviewers |
| 13 | P21 الحفظ المنهجي والتدبّر وأثري الخاص | 16 | 6 | Q4<-K1 sequence; 12 items without source record | O-3 |
| 14 | P05 أسمع وأتكلم وأصاحب | 15 | 6 | S6<-S1 sequence; 60% fill | O-3 |
| 15 | P09 أميّز وأستدل وأبحث | 15 | 0 | 3 under-age lessons | reviewers |
| 16 | P20 نواة القرآن للصغار: إصغاء وأدب وتعلّم | 15 | 0 | 12 items without source record; Quran core | reviewers |
| 17 | P03 صدقي وأمانتي وبرّي | 14 | 1 | 56% fill | reviewers |
| 18 | P23 علوم القرآن والقراءات وتوثيق الأخبار | 14 | 1 | 4 under-age lessons; 19/19 without source record | reviewers |
| 19 | P06 أتثبّت قبل أن أصدّق | 8 | 0 | minor | reviewers |
| 20 | P12 أمانة العمل والعهد | 7 | 1 | declared C2 absent; 58% fill | reviewers |
| 21 | P04 أرحم وأعدل وأتواضع وأشكر | 5 | 2 | 54% fill, otherwise coherent | reviewers |
| 22 | P15 نحو بيت مستقر | 3 | 2 | R6 prerequisites; adults gated | O-3 |
| 23 | P16 تربية أبنائي | 3 | 0 | adults gated; declaration mismatch | reviewers |

Suggested waves (each wave: update data, run `validate_coherence.py --strict --program Pxx`, `validate_programs.py`, confirm refs unchanged, then stop for review; do not batch):

1. **P02 + P18** together (one owner program per duplicated (competency, level), O-2). Then P13 and P10 (P10 also needs the P25 prerequisite edge).
2. **P24 and P22** (most hard errors: 17 and 21). They share nothing but both need prerequisite/level decisions (O-3); P22 content is heritage-sensitive, so scholarly review must run in parallel, not after.
3. **P01 + P17**, then P19, P08 (re-split), P14, P11, P21, P05.
4. The rest (P09, P20, P03, P23, P06, P12, P04, P15, P16) are mostly timing/age fixes.

Why not 'by hard-error count' only: P22's 21 errors are mostly 30-minute sessions holding 40-minute lessons, a rhythm decision, whereas P02/P18's problem is that two programs teach the same competencies to the same children, which affects the learner experience directly.

## 4. Owner decisions pending (decision register)

Nothing below is decided. 'Evidence' says where the open question is recorded.

| ID | Decision | Options and consequence | Evidence |
|---|---|---|---|
| O-1 | **P07 duration.** | (a) keep 6 wk x 3 x 35 = 630 min declared against 404 min of content (64%, a validator warning, week 3 at 49%); (b) 4 wk x 2 = 8 sessions as first proposed (not feasible: 11 lessons + 7 scenarios must all be hosted); (c) 10-12 sessions (5-6 wk x 2) as the redesign estimated, which needs merging scenarios into lesson sessions or cutting content; (d) author the four missing 10-12 anger lessons first, then re-decide. The rebuild executed (a) because the owner ordered execution; review was deferred. | ADAB_AL_GHADAB_REDESIGN s.10-11, CURRICULUM_COHERENCE s.2 |
| O-2 | **Owner program for duplicated (competency, level) in P02/P18** (S3 L1-L3, K4, and P02 vs P19 for S4). | Pick one program per pair, replace the duplicate with a recap card (`role: recap`). Without this P02 (35) and P18 (34) cannot be reduced. | CURRICULUM_COHERENCE s.5, s.7 |
| O-3 | **Prerequisite policy for sequence errors** in P05 (S6<-S1), P15 (R6<-R2,R3), P21 (Q4<-K1), P22 (H1 order, X4), P24 (T6<-K2, K3<-K1, T4<-T3 and L2+ without L1). | Either relax the competency prerequisites in `competencies.json` or add the missing levels/programs. P07's `P25 or equivalent` prerequisite exists only because S6 needs S1. | validate_coherence output; ADAB s.11 |
| O-4 | **P25 (create / absorb X4-L4..L6 from P22 stage D / keep).** Also an unfixed inconsistency: `P25.next_programs` lists P10 but P10's prerequisites do not list P25. | P25 exists as `pilot`; the audit had marked it `proposed_needs_owner_decision`. | coherence_audit.json proposed_programs; programs.json |
| O-5 | **Reviewer appointments and the four needed to publish.** | `0020` requires four DISTINCT, active, non-author reviewers per item and per cycle: (1) scholarly (religious accuracy), (2) pedagogical (age, sequence, timing), (3) child protection, (4) a **fourth person for the source review**, who must be a second scholarly or pedagogical reviewer (source = scholarly_reviewer OR pedagogical_reviewer, and one person cannot give two review types on the same item/cycle). P07 additionally lists a child mental-health reviewer in `gating.needs_named_reviewers`; there is no such role in the database. A distinct publisher role does not exist (any reviewer can publish); a fifth person is needed if that is wanted. Only the owner can appoint (0018 stops tenant admins). Until then nothing can move past Draft. | PUBLICATION_BACKEND, CONTENT_PUBLICATION s.5.4, 0017/0018/0020 |
| O-6 | **Apply migrations 0017-0020 to production.** | Order matters: 0017 (formation engines; reviewer roles), 0018 (permission hardening; depends on 0017 roles), 0019 (progress), 0020 (content status; its source-review role mapping). None is applied (per `KNOWN_LIMITATIONS` 40 and the 14.1 documents; I did not query any database, so 'not applied' is the repository's own statement, not my check). Tests ran on PGlite, not on a live Postgres with separate owner role: run `assertSafeRoles` and the isolation suite on the target host first. 0017 holds tables with learner free text: the retention decision (O-7) should precede it. | TEST_RESULTS, PROGRESS_PERSISTENCE |
| O-7 | **Retention and deletion policy for learner progress** (and for the retired-refs rule in 2.2). | Not set by the owner (PEDAGOGY s.8, ADAB open decision 8). Needed: how long `academy_progress` rows are kept, whether inactivity expires them, what a guardian can delete for a minor, whether feedback by a teacher is deleted with the learner (today the author's feedback survives `DELETE /me/academy/progress`), and inclusion in `/me/formation/export` and erase (not included today). Required before any public launch. | PROGRESS_PERSISTENCE, CHILD_SAFETY s.5 |
| O-8 | **Notebook privacy: local only or on the server.** | Today local-only (`localStorage`), true to the guides' wording. A server notebook would need guardian consent for minors, encryption, a policy for a child disclosing danger, and the table `reflection_entries` (0017) is designed but unwired. Recommendation of the child-safety review: keep local, say so plainly, never upload free text (the progress table already refuses free text). Any change to the wording «على هذا الجهاز فقط» in the lesson and guide texts follows this decision. | CHILD_SAFETY s.4, UX_UI s.5 |
| O-9 | **Server-side separation of the mentor/guide gate.** | Today guides, safeguards and review data are in public static JSON (`academy-guides.json`); the 'mentor mode' is a localStorage toggle plus a self-declaration. Options: build two artifacts (learner-facing public; guide/review behind an authenticated role check), as designed in CONTENT_PUBLICATION s.5.3. Needs a role model decision (no age on accounts; students identified by membership only). | CONTENT_PUBLICATION s.2, s.4 |

## 5. What is still not done (stated plainly)

1. **Nothing is reviewed or published.** 0 approved items. All 25 programs, 264 lessons, 141 scenarios and 25 guides are `unreviewed`. No reviewer holds any role.
2. **No gate is enforced.** `validate_coherence.py` runs in report mode (exit 0); it is not wired to `build_academy.py` or CI. 82 errors and 159 warnings stand.
3. **Twenty programs have not been restructured at all** (everything except P07, P25, P08, P21 and the P06 edge). Their coherence, repetition, overlap and timing findings are unchanged since the audit.
4. **The audit file is stale.** `coherence_audit.json` `item_audit.P07` describes the old 16 items (27 stale warnings) and `program_reports` has no entry for P25.
5. **Session coverage is incomplete and unstable.** No file for P02, P10, P13, P18. The files that exist were bulk-drafted and are being changed now. `index.html` does not read them.
6. **Server features are not connected.** Progress sync (0019), content status (0020) and the formation engines (0017) have no UI call. The page says progress is 'on this device', which is true; do not claim sync.
7. **Publication does not hide anything.** Even a Published status would not remove draft content: all JSON is public static, and no build step filters by status.
8. **Source integrity.** 40 source passage records, all unreviewed; formation books not registered (no sha256, edition, rights); no takhrij for any hadith or athar; the locator check cannot run without the private corpus; extraction is not reproducible. Programs P22, P23, P20, P21, P17, P07 have the most items without a source record.
9. **Educational research (stage 5) is empty**: age and method claims (breathing, feeling labels, reframing) rest on the author's judgement; the P07 guides refer severe cases to specialists but no child psychologist has defined the thresholds (CG10).
10. **Residual wording defects:** absolute-privacy sentences in AG3 and G3-S1-S1; 6 guides' parent privacy text without a safety exception; the 'not psychotherapy' paragraph in 5 of 25 guides; fatwa-referral phrasing reviewed in the child-safety document has not been re-audited program by program.
11. **Not tested:** real accounts, the deployed bundle, screen readers, a pilot with children or mentors, actual classroom timing (scenario minutes are estimates), the e2e suite and `npm test` in this run, and any live database.
12. **Age protection is not real:** the adult gate for P15/P16 and mentor material is UI-only; a visitor can read the JSON.

## 6. Sources

Computed from: `docs/human-formation/programs.json`, `qa/coherence_audit.json`, `qa/editorial_changes.json`, `qa/QA_*.md`, `lessons/*.json`, `guides/*.json`, `sessions/*.json`, `packages/web-vercel/index.html`, `packages/database/migrations/0017-0020`, `packages/api/src/academy-progress.ts`, and the twelve `docs/TARTIL_14_1_*.md` documents (read in full except the middle of the source-integrity and Adab al-Ghadab documents, which were read in part).
