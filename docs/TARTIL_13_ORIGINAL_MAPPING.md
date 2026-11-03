# TARTIL 13.0 - Mapping of the original owner text to the documents (مطابقة النص الأصلي)

Date: 2026-11-03. Source of truth: the full original text "TARTIL 13.0 - COMPLETE ECOSYSTEM RECONSTRUCTION & DELIVERY" (1,414 lines, sections 0-25), read in full for this document (scratchpad copy `tartil13_original.txt`; it is not inside the repository). Compared against the 15 `docs/TARTIL_13_*.md` files and `docs/audit/TARTIL_CURRENT_STATE.md`.

Method and limits: this is a documentary cross-check only. No code, test or database was re-run or re-audited. "Actual status" is whatever the covering document itself concludes, quoted in its own vocabulary (WORKING, PARTIALLY WORKING, UI ONLY, BROKEN, MISSING, BLOCKED, NEEDS SCHOLARLY REVIEW). Where documents disagree with each other, both are named. Nothing in the original was invented or filled in: where a list the brief mentions is absent from the original, that is stated in part 3.

Short names for the covering documents: UX = ACADEMY_UX, COMP = COMPETENCY_MODEL, CUR = CURRICULUM_ARCHITECTURE, GAP = GAP_ANALYSIS, HER = HERITAGE_KNOWLEDGE, HF = HUMAN_FORMATION, INST = INSTITUTION_OPERATIONS, KIDS = QURAN_KIDS, REC = RECITATION_HIFZ, REL = RELEASE_STATUS, SEC = SECURITY, ARCH = TARGET_ARCHITECTURE, TEST = TEST_RESULTS, PROG = IMPLEMENTATION_PROGRESS, CS = TARTIL_13_CURRENT_STATE, MATRIX = audit/TARTIL_CURRENT_STATE.

What the original actually contains (so the table below is complete): sections 0-25 (section 5 and the sub-lists inside sections 4, 8, 9, 13, 14, 15, 17, 18, 19, 20); 12 competency domains (section 8); 6 children's levels (section 9); 13 engines (section 15); 17 logical database domains (section 18); a 10-program initial set plus 5 deferred domain packs (section 19); 11 program admission criteria (section 20); scenarios A-F (section 21); phases 0-8 (section 22); 15 required documents (section 23); 10 Definition of Done conditions (section 24). There is no "G4-G19" numbering and no scenario G.

---

## 1. Mapping table (جدول المطابقة)

### 1.1 Sections 0-25

| Orig. section | Requirement (short) | Covering document / paragraph | Actual status per the documents |
|---|---|---|---|
| 0 | Executive mission: complete the existing project, no new project, no cosmetic or non-working pages, 13 numbered tasks, "do not declare completion that was not executed" | GAP section 0 and 3; PROG section "Phase 8 - Honest completion report"; REL section 1 | Honest report exists in three places; verdict "private prototype / pilot-candidate; not a public production release". Task 10 (library foundation) and 13 (document what is blocked) covered by HER and REL section 4. |
| 1 | Virtual team of 19 roles; criteria must show in decisions | No document maps the roles. Partly implied by SEC (security engineer), UX (accessibility), TEST (QA) | NOT MAPPED as a requirement (see part 3). Roles without any document: Early Childhood expert, Adolescent expert, Hadith and Sirah researcher, Audio/Speech engineer (REC touches speech), DevOps (REL section 6 deploy steps). |
| 2 | Real repository audit: 19 areas to inspect, prior spec files | MATRIX (whole file); GAP section 1; CS | MATRIX WORKING as a document; it covers routes and API. Repo areas "Existing AI integrations", "Storage", "Deployment config" appear in SEC and REL, not in MATRIX columns. |
| 2 | Live Website Audit: open published site, screenshots at 375, 390, 768, 1440 px, 14 visual checks; do not bypass Vercel protection | REL section 1 (site returns 302 Vercel Authentication); UX section 4/6 (cites earlier audits); GAP G7 | NOT DONE as specified: no document records its own screenshots at these four widths; the site is behind Vercel Authentication; earlier sweeps used 11 viewports in Chromium with a mocked API (RESPONSIVE_QA, not re-run). Widths 375 and 768 and 1440 are not named in any TARTIL_13 doc. |
| 2 | Feature Audit Matrix with 11 columns, 7 statuses, saved at `docs/audit/TARTIL_CURRENT_STATE.md` | MATRIX sections 2-4 | WORKING: columns match (Feature, Route, UI, Backend, DB, Content, API, Test, Accessibility, Priority, Required Fix). Header note records that its live-state lines are superseded by the correction block (migrations 0001-0016 live, 0017 not). |
| 3 | Product philosophy: Tartil as a Quranic knowledge, human formation and lifelong learning ecosystem; 12 life aims; pedagogy "learn, understand, reflect, practise, apply, review, progress" (seven stages, not all in every lesson); Quran is the academic nucleus | HF section 1 (stance); COMP section 3.1 (nucleus point); CUR section 2 | PARTIALLY covered. The seven-stage pedagogy is not mapped anywhere (grep found no match). COMP finds the nucleus (Quran) is one competency (K4) in the model: PARTIALLY WORKING at best. |
| 4 | Restructure without losing features; six functional maps: Quran Core (11 items), Prophetic Knowledge (5), Child Learning (10), Human Formation (9), Family & Life (8), Institutions (10); do not turn into dozens of nav items | UX section 3 (nav), 3.3 (route mapping); GAP G5-G9; INST; HF section 8 | PARTIALLY covered. Quran Core and Institutions have documents. Prophetic Knowledge: no document (see parts 2-3). Family & Life: HF section 8 plan only (P15, P16 adults_gated, not wired). |
| 5 | New IA: at most a few clear destinations, example رحلتي / تعلّم / تدرّب / استكشف / حسابي; content rules for each; no marriage/politics/work for small children; no childish game UI for adults; no sensitive personal data to guess roles | UX section 3 (adopts exactly the five examples), 3.4, 3.5; UX section 9 owner decisions | Proposal only: hubs `#/journey`, `#/learn`, `#/practise`, `#/account` are MISSING (UX 3.1 "NEW"). The age rule is not enforced: HF section 6 says adult-gated programs are shown to any signed-in user (no age gate). |
| 6 | Visual design system: direction, suggested palette (not mandatory), typography, 22 components, UX "no" list (10), WCAG 2.2 AA | UX sections 4, 5, 6, 7 | PARTIALLY WORKING. UX 4.3 table lists the components (many MISSING or two styles); UX 6.1 is a WCAG 2.2 table; token additions proposed, "no code written". Fonts and licences for Mushaf fonts not covered by a TARTIL_13 doc. |
| 7 | Unified curriculum: Academy, Domain, Program, Path, Level, Competency, Module, Lesson, Activity, Assessment; Program has 12 fields; Lesson supports 13 content types | CUR sections 2, 3, 5 | PARTIALLY WORKING. 16 programs, 40 competencies, 148 lessons, 414 activities exist as draft static JSON; no program/path/module/assessment table in Postgres (CUR section 1). Program fields (approval status, version) exist only as JSON flags. |
| 8 | Competency and Mastery Engine: 12 domains; 10 fields per competency; "do not measure piety or morals numerically" | COMP sections 1-5 | PARTIALLY WORKING; domain list not used (see 1.2); field list compared to BLUEPRINT D3, not the original 10 (see part 2). Numeric-measure rule: enforced for observations (3 statuses, no score; COMP 5.2), with one open risk (numeric `level` 1-5, COMP 5.3 item 1). |
| 9 | Tartil Kids as a real academy; 6 levels; child UX (8 items); reference models (6); do not copy protected designs | KIDS sections 2-8; older KIDS_LEARNING_BENCHMARK.md (outside the TARTIL_13 set) | PARTIALLY WORKING. KIDS says 0 of 6 levels complete; but it used the wrong six (see 1.4 and part 2). Reference models are covered only by KIDS_LEARNING_BENCHMARK.md. |
| 10 | Makharij and Tajweed Lab: 9 requirements; anatomical models need a specialist; AI must show confidence and limits; no mastery certificate from an unverified model | KIDS section 5; REC section 2 (Pronunciation Signals, Tajweed Assessment MISSING deliberately) | MISSING as a lab (MAKHARIJ_VISUAL_SYSTEM.md: "NOT BUILT"); text explorer exists, NEEDS SCHOLARLY REVIEW. AI limits honoured: `RECITATION_CAPABILITIES` declares pronunciation and tajweed false. |
| 11 | AI recitation and memorization: 10-step user flow; 9 required checks; separate six concepts | REC sections 2, 3 (11-row journey), 7, 9 | PARTIALLY WORKING. Six-concept separation done well (REC section 2). Alignment WORKING (unit tested); word recognition BLOCKED live (HTTP 429); loop "update plan" MISSING (REC step 11). |
| 12 | Prophetic Knowledge Academy: 7 programs (graded Sirah, Sirah stories for children, Shama'il, Forty Nawawi, daily etiquette, role model and character, hadith sciences); content structure (9 items); no invented narrations; no imagined depiction of the Prophet | No TARTIL_13 document. Repo text only in `docs/human-formation/*` (BLUEPRINT, SOURCE_MAP, records mention hadith and sources) | NOT COVERED by any TARTIL_13 document; no program for Sirah, Shama'il or Forty Nawawi exists among P01-P16 (CUR section 6 list). HF section 4 records that no hadith is cleared or graded. |
| 13 | Human Formation Academy: six core program groups (Character 7, Self-development 6, Thinking 6, Social 5, Family 5, Work and Society 7); start with complete model programs, not hundreds of courses | HF sections 1-3, 8; CUR section 6; COMP | PARTIALLY WORKING as a large draft (16 programs, 40 competencies). Not wired to backend (progress in `localStorage`, 0 calls to formation API). Family/Work/Society pieces gated drafts (P11-P16). |
| 14 | Library-powered knowledge system: folder not assumed available; 10 topic areas; Heritage-to-Curriculum Studio with 12 functions; data-integrity layers; rights rules | HER sections 0-8 | MISSING as a product (no Studio UI, HER section 0 and 6). Pipeline and DB gate exist for the 74-book Quran-sciences corpus; formation library (168 files) has no registry. HER section 1's "twelve steps" are a reconstructed pipeline, not the original 12 functions (see part 2). |
| 15 | 13 reusable engines; integration rule (no new homework system, progress table, kids dashboard, source system or certificate engine per domain) | ARCH sections 2, 4, 5 | WORKING as a design: ARCH 5 reuses existing tables, "no new engine table needed to start". Activity engine for formation not persisted (ARCH row "Activity"). Admission of the integration rule is design-only. |
| 16 | Teacher (9), Parent (5), Institution (7) workflows; technical requirements (8: RBAC, tenant isolation, server authorization, secure uploads, audit, retention, guardian permissions, no cross-institution leaks) | INST sections 2-4, 6, 7; SEC sections 2-10, 14 | PARTIALLY WORKING. RBAC, RLS isolation, secure upload, audit WORKING at DB/API level (PGlite, local). Parent workspace MISSING (reports, schedule); retention policy undefined; notifications MISSING. |
| 17 | Administrative Academic Studio: 14 management areas; manage lessons through a UI rather than code | INST section 5 (checks a different list, see part 2); HER section 6 | MISSING for content: lessons, programs, competencies, versions and publish approval live in static JSON edited in the repository (CUR section 1, HER section 6 item 5). Admin console covers roster/audit/9 counts only. |
| 18 | Backend/database: inspect first; 17 logical domains; 11 requirements; no localStorage as sole source for cross-device learning data; no hardcoded mock arrays for core data | ARCH sections 7.1-7.4 (14 domains catalogued); SEC; CUR | PARTIALLY WORKING. ARCH 7.3 catalogues 14 domains with a different naming (see part 2). Violation of the localStorage rule is documented: Academy progress is `localStorage` only (GAP G6, PROG Phase 1). Backup strategy and monitoring: no TARTIL_13 doc beyond brief mentions in SEC section 15 (not tested). |
| 19 | Initial program set (10); five deferred packs; each program has 10 attributes | CUR section 8 states the ten are "not verified, no comparison possible" | NOT COMPARED. The original list exists and can now be compared (see 1.5). Per-program attributes (Completion Logic, Functional Tests, Persistence) not tabulated. |
| 20 | Anti-bloat governance: 11 mandatory rules; Program Admission Gate with 11 criteria | CUR section 7 (admission gate; proposed design); HF section 8 (anti-bloat limits from BLUEPRINT D10) | PARTIALLY covered. CUR 7 gives a design (programs table, enrolments), nothing implemented. "No AI-generated religious content published automatically" is supported by the DB gate (HER section 2). Gate criteria are those of the original only in spirit; CUR 7 does not list the 11. |
| 21 | Required E2E scenarios A-F; 8 quality-check types; "Build successful" is not proof | TEST section 4 (matrix A-F); SEC section 5 (F); TEST section 5 | Scenarios mis-defined except F (see 1.3). Quality checks: unit/integration/DB tests exist; E2E exists only for the Academy viewer with a mocked API; accessibility sweeps are one-off scripts. |
| 22 | Phases 0-8 | PROG (headings Phase 0-8) | Titles do not match (see 1.6). |
| 23 | 15 documents in `docs/` plus a progress file with 8 statuses and a proof link per function | All 15 files exist | WORKING: filenames match the list exactly. PROG uses the 8 statuses (Existing, Fixed, Implemented, Tested, Blocked, Needs Content, Needs Scholarly Approval, Future Phase). Proof links per function are mostly file or test names, not hyperlinks. |
| 24 | Definition of Done: 10 conditions | REL section 2 | Uses a different working set D1-D10 (see 1.7). |
| 25 | Final execution instruction (no shallow academy; no mock data; no hundreds of empty courses; reuse modules) | GAP, REL, PROG verdicts | Consistent with the verdict "private prototype". Not a deliverable item. |

### 1.2 The twelve competency domains (section 8)

COMP section 0 states "the twelve domains ... are not in the repository and were not in my brief" and builds a "repo-derived proxy list" instead. The original list exists. The repository has 8 domains (competency id letters K, T, S, C, R, L, W, M; 40 competencies; CUR section 2, HF section 2).

| # | Original domain | Repo competencies that plausibly match (per COMP, HF, CUR) | Coverage per the documents |
|---|---|---|---|
| 1 | Quranic Knowledge | K1-K3 text-handling skills only; no Quranic-science competency | MISSING (COMP 3.1) |
| 2 | Reading and Recitation | K4 only (one line definition); no tajweed or makharij competency | MISSING as a model; engines exist outside the model |
| 3 | Memorization | K4 (merged with 2); lessons L1-L3, no L4/L5 | PARTIALLY WORKING |
| 4 | Faith and Understanding | none identified in any document | MISSING (no document discusses it) |
| 5 | Character and Ethics | C1-C6 | Covered (draft, unreviewed) |
| 6 | Self-Management | S1-S6 | Covered (draft) |
| 7 | Thinking and Learning | T1-T6, K2 | Covered (draft) |
| 8 | Communication and Relationships | R1-R5 (R-series splits family and relationships; no document separates them) | Covered (draft); mapping inferred |
| 9 | Family and Parenting | R6, R7 (adults-gated), P15, P16 | Covered as gated draft |
| 10 | Work and Financial Literacy | W1-W4; X1 gap drafts unwired | Covered (draft); finance NEEDS reviewer |
| 11 | Leadership and Civic Understanding | L1-L4 | Covered (draft) |
| 12 | Teaching and Mentorship | M1-M3, K4 L5 | Covered (draft) |

Note: the R-series split between rows 8 and 9 is my reading of the competency letters and ages recorded in COMP/CUR/HF, not a stated mapping; a scholar or the owner should confirm it. Result: 8 of 12 covered as drafts, rows 1-4 (the Quran-facing and faith domains) not covered by competencies.

### 1.3 Scenarios A-F (section 21)

| Scenario | Original definition | What the documents assumed (TEST 4) | Actual coverage per TEST and SEC |
|---|---|---|---|
| A | Child learning: create a suitable test account, choose the letters path, play a lesson, complete an activity, save progress, show next step | "Adult/teen learner walks the Academy" | Not matched. Nearest evidence: Kids hub is client-side (`localStorage` events; KIDS section 4), `kids.test.ts` (1 test) for the server slice, browser QA mocked (KIDS_ACADEMY_QA). Server-saved progress for the letters path: PARTIALLY WORKING; "next step" is the client recommender. No end-to-end run of the stated sequence. |
| B | Hifz: choose a surah, start training, record a recitation, process, show available notes, update review | "Child with guardian consent and safeguards" | Not matched. REC section 3: steps 1-8 PARTIALLY WORKING, live processing BLOCKED (429); update of review MISSING as a loop (step 11). The original asks for Test Doubles when the service is down: REC/TEST use a fake recogniser over Al-Fatiha 1-4 only; "production verification pending" is stated. |
| C | Teacher homework: create halaqah, assign homework, appears to student, student submits a recording, teacher reviews, status updates | "Teacher assigns, observes, reviews" | Matched in substance. `api/homework.test.ts` journey and `halaqah.test.ts` (TEST 4 row C). WORKING at API+RLS locally; no browser E2E. |
| D | Human development: choose the Honesty program, read/listen to a lesson, solve a scenario, complete an activity, save the learning result | "Parent/guardian oversight" | Not matched. Nearest: Academy viewer E2E (lesson walked, scenario completed; Chromium, mocked API). "Save learning result" is `localStorage` only; server reflection routes (0017) not live. PARTIALLY WORKING / UI ONLY. |
| E | Academic publishing: draft a lesson, link a source, request review, approval by an authorised person, publish, appears to the target user | "Institution admin" | Not matched. DB tests cover the three-role gate for `source_records` (formation.test.ts); no UI, no loader, and lessons are static JSON so "publish then appears to the user" does not exist (HER sections 2, 6). BLOCKED (no reviewers) and MISSING (flow). |
| F | Authorization: a teacher or institution tries to reach another party's data; refused at the backend | "Cross-party denial" | Matched. Strongest coverage (SEC section 5 table; TEST section 4 row F), DB + API + RLS on PGlite; no browser E2E; live evidence predates migrations 0006-0017. |

TEST also refers to "journeys A-G" (from older QA docs `10_FUNCTIONAL_QA.md` and `KIDS_ACADEMY_QA.md`). The original has no G; that label comes from the earlier docs.

### 1.4 The six children's levels (section 9)

Defined in the original (they are present). KIDS section 3 did not use them: it took the six stages of `docs/FOUNDATION_CURRICULUM.md` as a "stand-in" and says so. Both lists are compared below.

| # | Original level (with its items) | KIDS section 3 row used | Match | Status per KIDS (judged by it on its own rows) |
|---|---|---|---|---|
| 1 | Listening and Recognition (listening, sound recognition, shapes, letters, audio response) | "Listening foundations" | Same idea; original adds shapes and letters recognition | MISSING (no cleared recordings) |
| 2 | Arabic Foundations (letters, harakat, syllables, reading, sound-to-shape link) | "Arabic letters" (row 2) plus "Reading foundations (harakat, syllables)" (row 3) | KIDS splits one original level into two | PARTIALLY WORKING (rec, match, pair, har drills; harakat activity does not build syllables) |
| 3 | Quranic Reading (Quranic words, short ayat, gradual reading, guided recitation) | "Quranic reading" (row 4) | Match | PARTIALLY WORKING (six short surahs, repetition counter not synced) |
| 4 | Tajweed Foundations (basic makharij, suitable sifat, listening discrimination, visual and audio training) | "Tajweed foundations / makharij lab" (row 5) | Match | MISSING as a lab; text explorer NEEDS SCHOLARLY REVIEW |
| 5 | Stories and Understanding (Quran stories, suitable Sirah, vocabulary, comprehension, values) | none | KIDS has no such row | NOT ASSESSED in KIDS; no kids-story content (KIDS section 4: "Rewards, characters, stories: MISSING"). Closest: P01-P05 formation programs for children (HF/CUR), not Quran stories or Sirah. |
| 6 | Memorization and Practice (memorization, repetition, recitation, review, home activities) | "Memorisation" (row 6) | Match | PARTIALLY WORKING via generic adult-era features; no child-specific short-surah track; home activities via homework |

Also: the original states the levels are overlapping tracks, not mandatory sequential stages (a child may memorise by listening while building reading). KIDS treats them as ordered stages ("0 of 6 levels complete") and its overall verdict "4 partial, 2 missing" is for its own list. Under the original list the count would need re-assessment: level 5 has no counterpart row.

### 1.5 Section 19 programs

Original initial set (10) with the nearest repo item from CUR section 6 (P01-P16) or other documents. This table is a first-pass comparison for the owner to confirm; none of the matches is stated in any document.

| # | Original program | Nearest repo item | Status per documents |
|---|---|---|---|
| 1 | Qur'anic reading foundations | Kids hub / Foundations (`#/foundations`, `#/kids`); P01 is a formation program, not reading | PARTIALLY WORKING (draft, NEEDS SCHOLARLY REVIEW) |
| 2 | Makharij basics | Tajweed library makharij explorer | MISSING as a program; text only |
| 3 | Memorize and review a short surah | `hifz_items`, `#/me/hifz`, `#/plan`, homework | PARTIALLY WORKING; no curated child short-surah track |
| 4 | An interactive documented Quranic story | none | MISSING |
| 5 | Honesty and trustworthiness for children | P03 ("صدقي وأمانتي وبرّي", age 8) | Draft, planned; unreviewed |
| 6 | Time management and learning for pre-teens | P02 (self-control, ask, memorise) and S-series; P07 pilot | Draft; partial match, not verified |
| 7 | Thinking and verification for youth | P06 ("أتثبّت قبل أن أصدّق", pilot) and P09 | Draft |
| 8 | A program from the Forty Nawawi | none | MISSING |
| 9 | A program from Sirah or Shama'il | none | MISSING |
| 10 | A program tied to a Dar al-Qur'an assignment | homework engine (0014) plus any P-program | PARTIALLY WORKING as a mechanism; no program |

Deferred packs (prepare, do not show as complete without approved content): marriage preparation (P15), parenting (P16), trade ethics (P12 partly; X1 unwired), leadership and responsibility (P13, P14), teacher preparation (M-series; K4 L5): all gated drafts; HF section 8 is the plan.

### 1.6 Phases 0-8 (section 22)

| Phase | Original title | PROG heading | Match |
|---|---|---|---|
| 0 | Baseline and Recovery | Audit and preservation baseline | Match |
| 1 | Design System and Academy Navigation | Academy reorganisation (formation) | Different: PROG 1 is the formation content; design and navigation are in PROG Phase 2 |
| 2 | Unified Learning Foundation (programs, paths, competencies, lessons, progress, assessments) | Responsive design and visual system | Different |
| 3 | Quranic and Kids Completion | Engines, interfaces and backend (3a Quran core, 3b learning engines, 3c formation) | Partly overlapping; scope differs |
| 4 | Human Formation | Heritage-to-Curriculum lab | Different (original puts Heritage in 6) |
| 5 | Teacher and Institution Integration | Teacher, parent and institution paths | Match |
| 6 | Heritage and Academic Studio | User-journey testing | Different |
| 7 | Expanded Domain Packs | Content integrity, safety and governance | Different; expansion packs appear only as a plan in HF section 8 |
| 8 | Production Verification | Honest completion report | Different: verification partly in REL section 6.4 |

PROG section 0 says the phase numbering is "inferred". Only phases 0 and 5 agree with the original.

### 1.7 Definition of Done (section 24) versus REL working set

| Orig. | Original condition | REL equivalent | Note |
|---|---|---|---|
| 1 | UI works | D1 (code exists), D4 (browser journey) | Partly |
| 2 | Logic works | D1/D3 | Partly |
| 3 | Backend connected | D2 wired end to end | Match |
| 4 | Data saved when needed | none as a column (D2 partly) | Gap: persistence is not a column; Academy progress is `localStorage` |
| 5 | Permissions correct | none as a column (see SEC) | Gap in the table, covered in SEC |
| 6 | Content approved where needed | D7 human review | Match |
| 7 | Errors handled clearly | none | Not a column |
| 8 | Mobile works | D5 responsive and accessibility | Match |
| 9 | Related tests pass | D3 | Match |
| 10 | Does not break other modules | none | Not a column (regression) |
| - | (not in original) | D6 content integrity, D8 licences, D9 child safety, D10 deployed and smoke-verified | Extra REL conditions; valid but not the owner's list |

---

## 2. Wrong assumptions in the documents (الافتراضات الخاطئة والتصحيح)

| # | Document | Assumption | Correct (original) |
|---|---|---|---|
| 1 | GAP section 2 | Requirements "G4-G19" numbered from a summary; G4 = "honest audit", G5 = "preserve Quran core", ..., G19 = "honest completion report"; header says numbering is reconstructed | Original numbering is sections 0-25. Rough correct mapping: G4 and G19 relate to sections 2, 24 and 25; G5/G8 to section 4 (Quran Core), 10, 11; G6 to sections 4-5, 7; G7 to section 6; G9 to sections 9-10; G10 to sections 13, 15, 8; G11 to 14; G12-G14 to 16; G15 to 18; G16 to 16 (technical), 9 (child UX), 12 (no depiction); G17 to 14, 19-20; G18 to 21. Sections 1, 3, 12, 19, 22-23 have no G row. Rows should be renamed by section number. |
| 2 | GAP G18, REL, KIDS_ACADEMY_QA | "Journeys A-G" | Scenarios are A-F only. No G in the original (section 21). |
| 3 | TEST section 4 | Scenarios A-F interpreted as: A adult learner, B child with guardian, C teacher, D parent, E institution admin, F denial | A child learning (letters), B Hifz recitation, C teacher homework, D Honesty program, E academic publishing, F authorization (see 1.3). Only C and F were correctly guessed; rows A, B, D, E need re-testing against the real definitions. |
| 4 | COMP sections 0, 3, 4 | The twelve domains "are not in the repository"; proxy 12-row list (incl. "Quranic sciences", "Arabic foundations", "Understanding the Quran"); fields taken from BLUEPRINT D3 | Section 8 gives 12 domains (see 1.2): Quranic Knowledge, Reading and Recitation, Memorization, Faith and Understanding, Character and Ethics, Self-Management, Thinking and Learning, Communication and Relationships, Family and Parenting, Work and Financial Literacy, Leadership and Civic Understanding, Teaching and Mentorship. "Quranic sciences" and "Arabic foundations" are not domains; the four Quran-facing and faith rows are. Required fields are 10 (Identifier, Definition, Learning Outcomes, Prerequisites, Age Suitability, Levels, Learning Activities, Evidence Types, Assessment Rules, Review Status); COMP's list differs (e.g. "Evidence Types" absent from COMP's table; it adds Safeguard, Reuse, Reviewer identity). |
| 5 | COMP section 3.1 | The owner "named three areas": recitation, memorisation, Quranic sciences | The original names them as domains 1-3 (Quranic Knowledge, Reading and Recitation, Memorization) plus domain 4 Faith and Understanding. "Quranic sciences" (علوم القرآن) appears only as an item in the Quran Core map (section 4). |
| 6 | KIDS section 1 and 3 | The "six levels" are the six stages of FOUNDATION_CURRICULUM.md | Original six levels (see 1.4): Listening and Recognition; Arabic Foundations; Quranic Reading; Tajweed Foundations; Stories and Understanding; Memorization and Practice. KIDS splits level 2 into two and omits Stories and Understanding entirely. |
| 7 | KIDS section 3 verdict | Levels are an ordered sequence ("0 of 6 levels is complete") | Section 9: the levels are overlapping tracks, not mandatory sequential stages. |
| 8 | CUR section 8 | Ten programs of section 19 not available, so not compared | List exists (see 1.5). CUR's statement "the brief does not list the ten programs" is true only of the summary it saw. |
| 9 | CUR section 6 and HF | Implicit: the 16 P-programs are "the programs"; no Sirah, Shama'il or Nawawi program | The original's initial set includes Quranic reading, makharij, hifz, a Quranic story, Forty Nawawi, Sirah/Shama'il and a Dar al-Qur'an program. P01-P16 are almost all formation programs; CUR 6 itself notes they contain no Quran-skill lessons. |
| 10 | HER section 1 | "The twelve steps (section 14)" reconstructed as: select sources, inventory/hash, extract, verify, dedup, source passage record, separate layers, map to competency, draft lesson, pedagogical review, scholarly review, approve/publish | Original 12 functions of the Studio (all reviewer actions in one tool): choose a competency, set age group, choose domain, search authorised sources, view relevant original texts, propose an educational relation, draft a lesson or program, add an activity, add an assessment, request scholarly review, approve, publish to the Academy. The reconstructed list is an ingestion pipeline; the original is a reviewer workflow. |
| 11 | HER section 0 | "Layers original text / explanation / inference / AI proposal / approved content" treated as BLUEPRINT D7 rule | Original lists the five layers (section 14, Data Integrity); the HER finding (rule, not data model) stands. |
| 12 | INST section 5 | "Section 17 expected" list (headline numbers, workload, attendance, student lifecycle, billing, incident log, etc.) | Original section 17 lists 14 management areas: programs, schools, competencies, paths, lessons, activities, tests, sources, scholarly reviews, pedagogical reviews, content versions, publish approval, reports, user permissions; plus "manage through UI, not code edits". INST measured an operations dashboard, not an academic content studio. |
| 13 | INST header | Section 16 text unavailable; rows follow a summary | Original 16 lists Teacher (9), Parent (5), Institution (7) abilities and 8 technical requirements. Rows should be rechecked against those lists. |
| 14 | PROG section 0 | Phases 0-8 inferred (Phases 1, 2, 3, 4, 6, 7, 8 differ) | Original phases in 1.6. |
| 15 | REL section 0 | D1-D10 are a working set | Original ten conditions in 1.7. |
| 16 | ARCH section 7.3 | 14 domain tables named identity_access, tenancy_institutions, safeguarding_consent... | Original 17 logical domains: Identity and Roles, Learners, Guardians, Institutions, Academic Programs, Competencies, Lessons, Activities, Assessments, Recitation, Memorization, Assignments, Source References, Scholarly Review, Progress and Portfolio, Notifications, Content Publishing. No document maps these; Progress and Portfolio, Notifications, Academic Programs, Activities, Assessments and Content Publishing have no catalogue entry (several are MISSING in the DB per CUR). |
| 17 | ARCH section 4 | 13 engines | Matches (section 15 lists exactly 13). Not wrong; included for completeness. |
| 18 | UX / GAP | Navigation five destinations as the owner's proposal | The original says "for example" and allows change after usability testing; UX handles this correctly as owner decision O2 etc. Not an error. |
| 19 | GAP, UX, KIDS | Live audit through screenshots not distinguished from earlier audits | Original requires own screenshots at 375, 390, 768 and 1440 px; none of the 15 documents did this; they cite earlier Chromium sweeps. |

---

## 3. In the original, not covered by any document (ما في الأصل ولا تغطيه وثيقة)

1. Section 12 Prophetic Knowledge Academy: no TARTIL_13 document; no Sirah, Shama'il, Forty Nawawi, daily etiquette, role-model or hadith-sciences program among P01-P16; no content structure (original text, source, documented explanation, age level, objectives, lesson, activity, assessment, review); the rule against imagined depiction of the Prophet and simulation of his voice is not checked anywhere.
2. Section 3 seven-stage pedagogy (learn, understand, reflect, practise, apply, review, progress) and the 12 life aims: not mapped.
3. Section 1 virtual team of 19 roles: no document shows how each discipline's criteria were applied.
4. Section 2 live-site audit at 375, 390, 768 and 1440 px with screenshots and 14 visual checks.
5. Section 6 typography requirements (Mushaf fonts and their licences), special components for verses and hadith (Hadith Reference Display, Quran Verse Display licensing), Story Player, Mission Card, Teacher Review Panel, notification component: UX section 4.3 lists some; Hadith Reference Display, Story Player, Mission Card and Teacher Review Panel are not in its table.
6. Section 9 reference models (Quran Era, Thurayya, AlifBee Kids, Khan Academy Kids, Antura, Noorani Qaida): only older `KIDS_LEARNING_BENCHMARK.md`; no TARTIL_13 document.
7. Section 10 specifics: video or animation of tongue and lips, comparison between close letters, specialist review of any 2D/3D anatomical model (KIDS 5 notes "not built", does not check against the 9 requirements).
8. Section 14 rights rules in detail: not sending restricted files to external AI services without rights. HER section 4 touches rights, but does not verify that no extraction was sent externally.
9. Section 17: content versions, publish approval, pedagogical-review queue, reports as an academic studio.
10. Section 18: backup strategy, monitoring, rate limits for the learning API, file validation: only partly in SEC; monitoring and backup have no tested status in any document.
11. Section 18 logical domains: Progress and Portfolio, Notifications, Content Publishing, Learners (as separate domain), Academic Programs, Activities.
12. Section 19: per-program attributes (Outcome, Age/Level, Sources, Real Lessons, Practice, Assessment, Data Persistence, Completion Logic, Scholarly Review Status, Functional Tests) not tabulated for any program.
13. Section 20: the 11 admission criteria (Need, Audience, Outcome, Scholarly Sources, Approved Content, Educational Design, Reusable Engine, Assessment, Cost, Maintenance, User Experience) as a checklist per program; "no source-library folders exposed as navigation".
14. Section 21 quality checks: Database Migration Tests (none named), Build Validation beyond tests, Accessibility Tests as a repeatable suite.
15. Section 23: proof links (file or test) for each important function are not uniformly present in PROG.
16. Section 16 Parent: "play audio instructions" and "communicate through safe institutional channels"; Teacher: "choose a training or lesson" in homework; Institution: "customise approved content": INST treats several as MISSING but does not list these three as required.

---

## 4. Open questions for the owner (أسئلة مفتوحة)

1. Should the GAP table be renumbered to sections 0-25 and G-labels dropped, and the scenario matrix A-F redone with the real definitions (A, B, D and E especially)? (Needs a test round, not a rewrite of statuses.)
2. Section 12: is a first Prophetic program (Forty Nawawi or Shama'il or Sirah for children) in scope for the first pilot, and who is the hadith reviewer? Without a named reviewer no takhrij-bound content can be approved (HF section 4, HER section 1).
3. The twelve competency domains: Quranic Knowledge, Reading and Recitation, Memorization and Faith and Understanding have almost no competencies. Do you want new Quran-core competencies (cap of 48 in BLUEPRINT D10 leaves 8 slots) or a separate framework (COMP section 3.2 options)? Is R-series to be split between "Communication and Relationships" and "Family and Parenting"?
4. Children's levels: confirm that the original six levels replace the FOUNDATION_CURRICULUM stages, and that level 5 (Stories and Understanding, Quran stories and suitable Sirah) needs content and reviewers before any build.
5. Section 19 program set: confirm the proposed matches in 1.5 (especially programs 1, 2, 6 and 10) and decide, program by program, add, merge or defer.
6. Do you want the original Definition of Done (1.7) to replace REL's D1-D10 and to be re-applied to every module row, including persistence, permissions, error handling and no-regression?
7. Phases: should PROG be renamed to the original 0-8 headings, and where should "user-journey testing" and "honest report" live (the original has neither as a phase)?
8. Live audit: may the project use an authorised Vercel access (or a local build) to capture the four required viewport screenshots, given the site is behind Vercel Authentication?
9. Heritage-to-Curriculum Studio: confirm the 12 original functions as the acceptance list for the first reviewer interface (HER section 6), and whether the library folder (section 14) has now been designated; until then no import is planned.
10. Section 14 rights: confirm that no restricted book text has been sent to any external AI service during extraction (HER section 4 does not establish this).
11. Section 17: should the academic studio (programs, lessons, versions, publish approval) be built before the reviewer appointments, or only after (it can be built with no reviewers, but nothing could be approved)?
12. Owner decisions already pending in the documents and still blocking: reviewer appointments (scholarly, pedagogical, child-protection), child-data retention policy, production apply of migration 0017, STT provider, licences for audio and tafsir, public preview of the Academy (GAP section 4, REL section 4).
