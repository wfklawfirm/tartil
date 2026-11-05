# TARTIL_CONTENT_MAPPING

Content-first mapping of everything Tartil already has into the adaptive structure of MASTER PROMPT V3 (sections 4.2 adaptive classification, 4.3 duplicates, 5 decision matrix). Date of count: 2026-11-05. **Mapping only: no file was moved, renamed, edited or deleted, and nothing was published.** Every number below was computed by `python3 -I` scans of this repository (and one read-only SELECT on the Supabase project `okbtrogotrtciymmuokr`); no estimates. Companion file: `docs/TARTIL_DUPLICATION_AUDIT.md`.

## 0. Rules this mapping obeys

- Reuse over replacement: ids, slugs, titles and URLs are preserved (section 6). The Master Prompt asks not to rename programs whose names are clear; none is renamed here.
- A decision is a **proposal** until a named human reviewer or the owner accepts it. All 96 units, 347 lessons, 185 scenarios, 25 programs and 25 guides are `draft-unreviewed`; no reviewer is recorded (`docs/human-formation/programs.json`, `lessons/*.json`, `qa/db_inventory_2026-11-05.json`: `scholarly_reviews = 0`).
- Nothing is deleted. ARCHIVE appears exactly once (one DB track) and is gated by proof, backup and an owner decision (see Duplication Audit section 7).
- Quran text, riwayat and third-party book text are untouched; scholarly assets stay internal (CLAUDE.md non-negotiables).
- Decision vocabulary: KEEP, REORGANIZE, ENRICH, CONNECT, ADAPT, COMPLETE, REBUILD, CREATE, ARCHIVE. A row may carry several. **REBUILD: no item qualified** (no item has a proven fundamental defect; validators report 0 errors: `validate_programs.py` 0 issues, `validate_lessons.py` 96 units 0 problems, `check_extracted_ids.py` 531 principles 0 errors, `validate_sessions.py` 0 issues / 197 warnings).

## 1. Inventory totals (computed)

| Item | Count | Evidence |
|---|---|---|
| Programs | 25 | docs/human-formation/programs.json |
| Bands (tracks) | 8 | programs.json `bands` |
| Stages inside programs | 81 | programs.json |
| Program items (lesson+scenario refs) | 532 | each ref used exactly once; 0 orphan, 0 dangling, 0 multi-program |
| Lesson files `lessons_*.json` | 52 | docs/human-formation/lessons/ |
| Units | 96 | 45 have `unit_id`; 51 are keyed by competency code (e.g. `C1`) |
| Lessons | 347 | ids unique; levels L1 77, L2 97, L3 117, L4 50, L5 6; 11,773 declared minutes |
| Scenarios | 185 | 1,367 nodes, 1,537 choices |
| Lesson activities | 1023 | `activities[]` |
| Formative rubrics | 347 | one per lesson (`ظهر / يتدرب / يحتاج_دعما`) |
| Sessions (`sessions/P*.json`) | 532 | 347 lesson sessions + 185 scenario sessions; 2,333 components; 347 homework items |
| Guides (`guides/P*.json`) | 25 | for_guide + for_parent + faq; P14, P15, P16 parent section = `not_applicable` |
| Competencies (skills) | 52 | 10 domains (Q H K C S T R W L M); `competencies.json` |
| Extracted principle files | 52 | 51 competencies + `ANG` (anger set); competency `X5` has no file |
| Extracted principles | 531 | `extracted/*.json` |
| Competency anchors | 168 | per sibling inventory; 163 are heading-only (not re-verified here) |
| Source-record files | 8 | 7 `records/*.md` + `PILOT_SOURCE_RECORDS.md` |
| SPA routes (top level) | 17 | `route()` in packages/web/index.html:763 |
| SPA track templates (`TEMPLATES`) | 11 | index.html:1553 |
| SPA built-in quizzes | 33 | 4 sets: makharij 8, sifat 8, noon-meem 10, mudood 7 |
| DB `learning_tracks` | 2 | qa/db_inventory_2026-11-05.json + live SELECT |
| DB `track_units` | 20 | 10 per track |
| DB `scholarly_items` | 39 | all concept/DRAFT |
| DB Quran | 6,236 ayahs; 1 edition | `quran_ayahs`, `quran_editions` |
| DB academy content rows | 0 | P01-P25 exist only as static JSON |

## 2. Adaptive structure derived from the content (not imposed)

The Master Prompt asks the structure to come from the content. The content already carries these levels; this mapping reuses them and adds no empty categories.

| Level in V3 | Existing carrier (id kept) | Count | Note |
|---|---|---|---|
| Domain | `academy.json` `domains` letters Q H K C S T R W L M | 10 | Quran core, prophetic knowledge, knowledge/understanding, character, self-management, thinking, relationships, work, leadership, teaching. The Quran-reading surfaces of the SPA (tajweed, foundations, hifz, qira'at) have **no** domain letter yet; see section 5 and CREATE items. |
| Track | `programs.json` `bands` b1..b8 (age/role bands) | 8 | b1 early childhood 5-8, b2 middle childhood 9-12, b3 adolescents 13-17, b4 youth 18-30, b5 family 18+, b6 professional 16+, b7 teacher/guide/leader 16+, b8 researcher 14+ |
| Program | `P01`..`P25` | 25 | delivery path; `prerequisites` / `next_programs` already encode the graph |
| Unit | unit key (`unit_id` or competency code) | 96 | reusable library unit; lessons of one unit may sit in several programs (25 units do) |
| Session | `sessions/Pxx.json` `session_number` | 532 | no id field today; additive id `Pxx-Snn` proposed (CREATE, metadata only) |
| Skill | competency id (52) | 52 | `competencies.json`; 23 competencies are served by more than one unit |
| Activity | lesson `activities[]`, scenario `nodes` | 1,023 / 1,367 | embedded, no separate ids |
| Assessment | lesson `formative` (347) + session `assessment` components (347 embedded with 0 minutes, 43 scenario ones with 1 minute) | 347 | descriptive rubric, no scores (policy) |
| Source | `extracted/*.json` principles (531), `competencies.json` anchors, `records/*.md`, `scholarly-assets` (internal) | | never published; locators `SRC-xxxxxx#toc-N` |

Model proposed from this: **library** (Domain > Skill > Unit > Lesson/Scenario, reusable, linked not copied) and **delivery** (Track > Program > Stage > Session > refs into the library). This matches what `programs.json` + `sessions/` already do: every library item is referenced by exactly one program item today, so linking is already clean.

## 3. Programs (25)

Columns: Track = band; Domain mix = domains of the items' competencies; Size = lessons+scenarios / stages / sessions. Time-fill is recomputed from the current `sessions/Pxx.json` (sum of `duration_min`) against `duration_weeks x sessions-per-week x minutes` parsed from `rhythm`. The 2026-11-03 `qa/coherence_audit.json` is shown only as history: it covers 24 programs and its item counts differ from the current `programs.json` for 14 of the 24 programs (e.g. P01 5 vs 24, P02 17 vs 25), so its severities are not used to decide. Session warnings are from `scripts/validate_sessions.py` (197 total).

| ID | Title (slug) | Track | Domain mix | Ages / weeks / status | Size | Decision | Reason and evidence | Impact |
|---|---|---|---|---|---|---|---|---|
| P01 | خطواتي الأولى (`khutwati-al-ula`) | b1 | C 16, K 8 | 5-7 / 7w / planned | 15+9 / 2 / 24 | KEEP + REORGANIZE + CONNECT | sessions total 262 min vs 315 declared (83%); last session in week 9 of 7; over declared time or weeks; 2026-11-03 audit row (severity 24/45, تجميع غير منطقي) is historical: it counted 5 items, programs.json now holds 24; same competency+level also taught in P17 (5), P04 (3), P02 (1), P18 (1); 7 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P01.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P02 | أضبط نفسي وأسأل وأحفظ (`adbut-nafsi`) | b1 | S 19, K 4, T 2 | 7-8 / 7w / planned | 16+9 / 3 / 25 | KEEP + CONNECT | sessions total 440 min vs 525 declared (84%); last session in week 7 of 7; 2026-11-03 audit row (severity 35/45, تجميع غير منطقي) is historical: it counted 17 items, programs.json now holds 25; same competency+level also taught in P19 (4), P07 (3), P18 (2), P20 (2); 13 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P02.json` | ids, slug, title unchanged; none to learners |
| P03 | صدقي وأمانتي وبرّي (`sidqi-wa-amanati`) | b1 | C 15, R 5 | 8-8 / 7w / planned | 12+8 / 3 / 20 | KEEP + CONNECT | sessions total 400 min vs 525 declared (76%); last session in week 7 of 7; 2026-11-03 audit row (severity 14/45, تجميع غير منطقي) is historical: it counted 15 items, programs.json now holds 20; same competency+level also taught in P19 (3); 4 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P03.json` | ids, slug, title unchanged; none to learners |
| P04 | أرحم وأعدل وأتواضع وأشكر (`arham-wa-aadil`) | b1 | C 20 | 8-8 / 7w / planned | 13+7 / 4 / 20 | KEEP + ENRICH + CONNECT | sessions total 430 min vs 630 declared (68%); last session in week 7 of 7; under 75%%: add content or re-declare rhythm (owner scope); 2026-11-03 audit row (severity 5/45, زمن غير منطقي) is historical: it counted 15 items, programs.json now holds 20; same competency+level also taught in P17 (4), P01 (3); 1 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P04.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P05 | أسمع وأتكلم وأصاحب (`asma-watakallam`) | b1 | R 32, S 3, T 1 | 8-8 / 8w / planned | 22+14 / 4 / 36 | KEEP + CONNECT | sessions total 757 min vs 960 declared (79%); last session in week 8 of 8; 2026-11-03 audit row (severity 15/45, تجميع غير منطقي) is historical: it counted 18 items, programs.json now holds 36; same competency+level also taught in P19 (4), P18 (3), P08 (2); 15 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P05.json` | ids, slug, title unchanged; none to learners |
| P06 | أتثبّت قبل أن أصدّق (`atathabbat`) | b2 | K 10, T 10 | 11-12 / 8w / pilot | 12+8 / 4 / 20 | KEEP + REORGANIZE + CONNECT | sessions total 529 min vs 640 declared (83%); last session in week 10 of 8; over declared time or weeks; 2026-11-03 audit row (severity 8/45, تجميع غير منطقي) is historical: it counted 20 items, programs.json now holds 20; same competency+level also taught in P10 (1), P24 (1); 6 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P06.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P07 | أتعلّم كيف أتعامل مع غضبي (`adbut-ghadabi`) | b2 | S 18 | 10-12 / 6w / pilot | 11+7 / 6 / 18 | KEEP + ENRICH + CONNECT | sessions total 409 min vs 630 declared (65%); last session in week 6 of 6; under 75%%: add content or re-declare rhythm (owner scope); 2026-11-03 audit row (severity 29/45, تجميع غير منطقي) is historical: it counted 16 items, programs.json now holds 18; same competency+level also taught in P02 (3); title already changed in programs.json to the redesigned title; older docs and the V3 prompt still use the old title (see Duplication Audit 6); needs reviewer `child_mental_health`; 0 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P07.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P08 | أصدقائي وخلافاتي (`asdiqai-wa-khilafati`) | b2 | R 14, C 4, L 3, T 2 | 11-12 / 8w / planned | 14+9 / 4 / 23 | KEEP + REORGANIZE + CONNECT | sessions total 601 min vs 640 declared (94%); last session in week 12 of 8; over declared time or weeks; 2026-11-03 audit row (severity 21/45, تجميع غير منطقي) is historical: it counted 19 items, programs.json now holds 23; same competency+level also taught in P05 (2), P19 (2); 8 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P08.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P09 | أميّز وأستدل وأبحث (`abhath-wa-astadill`) | b8 | T 13, K 7 | 14-17 / 8w / planned | 14+6 / 3 / 20 | KEEP + REORGANIZE + ADAPT + CONNECT | sessions total 613 min vs 720 declared (85%); last session in week 10 of 8; over declared time or weeks; 2026-11-03 audit row (severity 15/45, مستويات غير متجانسة) is historical: it counted 20 items, programs.json now holds 20; 3 lessons have an age_range outside the program ages (T3-L1, T6-L1, T6-L2); same competency+level also taught in P24 (4); 4 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P09.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P10 | أقرر بالشورى (`aqarrir-bishura`) | b3 | T 13, S 8, L 5 | 14-17 / 8w / planned | 18+8 / 3 / 26 | KEEP + ENRICH + CONNECT | sessions total 852 min vs 1200 declared (71%); last session in week 8 of 8; under 75%%: add content or re-declare rhythm (owner scope); 2026-11-03 audit row (severity 28/45, تجميع غير منطقي) is historical: it counted 15 items, programs.json now holds 26; 2 lesson outside program ages (T4-L1, T4-L2); same competency+level also taught in P24 (6), P06 (1), P22 (1); 6 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P10.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P11 | مالي ومبادرتي (`mali-wa-mubadarati`) | b3 | W 12, L 2, R 1 | 15-17 / 8w / planned | 10+5 / 3 / 15 | KEEP + ENRICH + CONNECT + COMPLETE | sessions total 538 min vs 880 declared (61%); last session in week 8 of 8; under 75%%: add content or re-declare rhythm (owner scope); 2026-11-03 audit row (severity 17/45, تجميع غير منطقي) is historical: it counted 15 items, programs.json now holds 15; 1 lesson outside program ages (R3-L4); same competency+level also taught in P24 (3); deferred/gated: لا مصدر وسطي محقَّق في المال (بحسب سياسة المنصة)؛ المحتوى للناشئة 12-17 لا للبالغين؛ يحتاج مراجعًا ماليًّا وقرار الجهة المسؤولة عن المنصة.; 3 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P11.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P12 | أمانة العمل والعهد (`amanat-al-amal`) | b6 | W 13 | 16-99 / 6w / planned | 9+4 / 2 / 13 | KEEP + REORGANIZE + CONNECT | sessions total 421 min vs 540 declared (78%); last session in week 7 of 6; over declared time or weeks; 2026-11-03 audit row (severity 7/45, مستويات غير متجانسة) is historical: it counted 13 items, programs.json now holds 13; same competency+level also taught in P24 (3); 3 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P12.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P13 | قائد ومرشد ناشئ (`mursid-naashi`) | b7 | M 20, L 7, T 3 | 16-99 / 8w / planned | 22+8 / 3 / 30 | KEEP + REORGANIZE + CONNECT | sessions total 1110 min vs 1200 declared (92%); last session in week 9 of 8; over declared time or weeks; 2026-11-03 audit row (severity 30/45, تجميع غير منطقي) is historical: it counted 17 items, programs.json now holds 30; same competency+level also taught in P14 (1); 15 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P13.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P14 | المسؤولية العامة والتقييم العادل (`hawkama-wa-taqyim`) | b4 | M 10, L 6 | 18-99 / 8w / planned | 10+6 / 3 / 16 | KEEP + ENRICH + CONNECT | sessions total 576 min vs 880 declared (65%); last session in week 8 of 8; under 75%%: add content or re-declare rhythm (owner scope); 2026-11-03 audit row (severity 20/45, تجميع غير منطقي) is historical: it counted 16 items, programs.json now holds 16; same competency+level also taught in P13 (1); 5 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P14.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P15 | نحو بيت مستقر (`nahwa-bayt-mustaqir`) | b5 | R 5 | 18-99 / 4w / adults_gated | 3+2 / 2 / 5 | KEEP + REORGANIZE + COMPLETE | sessions total 140 min vs 180 declared (78%); last session in week 5 of 4; over declared time or weeks; 2026-11-03 audit row (severity 3/45, مستويات غير متجانسة) is historical: it counted 5 items, programs.json now holds 5; deferred/gated: لا مصدر محقق ولا مراجع مسمّى في الأسرة؛ مؤجل بحسب سياسة المنصة لحين فحص المصادر.; 1 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P15.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P16 | تربية أبنائي (`tarbiyat-abnai`) | b5 | R 5 | 20-99 / 4w / adults_gated | 3+2 / 2 / 5 | KEEP + REORGANIZE + COMPLETE | sessions total 140 min vs 180 declared (78%); last session in week 5 of 4; over declared time or weeks; 2026-11-03 audit row (severity 3/45, مستويات غير متجانسة) is historical: it counted 5 items, programs.json now holds 5; deferred/gated: لا مرجع نمائي معاصر مرخّص؛ مؤجل بحسب سياسة المنصة.; 1 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P16.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P17 | أرحم وأشكر وأسمع قصص السيرة (`rahma-shukr-qissas`) | b1 | C 9, H 6 | 6-8 / 5w / planned | 10+5 / 3 / 15 | KEEP + ENRICH + CONNECT | sessions total 181 min vs 300 declared (60%); last session in week 5 of 5; under 75%%: add content or re-declare rhythm (owner scope); 2026-11-03 audit row (severity 19/45, تجميع غير منطقي) is historical: it counted 15 items, programs.json now holds 15; same competency+level also taught in P01 (5), P04 (4); 1 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P17.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P18 | أسمع بهدوء وأرتّب يومي (`sakina-istigha-wa-adat`) | b1 | S 16, K 12, R 4 | 7-8 / 6w / planned | 21+11 / 4 / 32 | KEEP + REORGANIZE + ADAPT + CONNECT | sessions total 465 min vs 360 declared (129%); last session in week 6 of 6; over declared time or weeks; 2026-11-03 audit row (severity 34/45, تكرار كفايات) is historical: it counted 13 items, programs.json now holds 32; 3 lessons have an age_range outside the program ages (Y1-L10, Y1-L11, Y1-L12); same competency+level also taught in P20 (3), P05 (3), P02 (2), P21 (2); 28 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P18.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P19 | أمانتي ومثابرتي وأسئلتي وكلامي اللطيف (`amana-wa-muthabara`) | b1 | S 10, R 10, C 9, T 4 | 8-8 / 8w / planned | 23+10 / 4 / 33 | KEEP + REORGANIZE + CONNECT | sessions total 661 min vs 600 declared (110%); last session in week 8 of 8; over declared time or weeks; 2026-11-03 audit row (severity 23/45, تجميع غير منطقي) is historical: it counted 16 items, programs.json now holds 33; same competency+level also taught in P02 (4), P05 (4), P03 (3), P08 (2); 21 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P19.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P20 | نواة القرآن للصغار: إصغاء وأدب وتعلّم (`nawat-al-quran-sighar`) | b2 | Q 12, K 5 | 9-12 / 6w / planned | 11+6 / 3 / 17 | KEEP + ENRICH + CONNECT | sessions total 382 min vs 540 declared (71%); last session in week 6 of 6; under 75%%: add content or re-declare rhythm (owner scope); 2026-11-03 audit row (severity 15/45, تجميع غير منطقي) is historical: it counted 17 items, programs.json now holds 17; same competency+level also taught in P18 (3), P02 (2), P21 (2), P01 (1); 2 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P20.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P21 | الحفظ المنهجي والتدبّر وأثري الخاص (`hifz-wa-tadabbur`) | b2 | Q 12, K 7 | 12-17 / 6w / pilot | 12+7 / 3 / 19 | KEEP + REORGANIZE + CONNECT | sessions total 500 min vs 630 declared (79%); last session in week 7 of 6; over declared time or weeks; 2026-11-03 audit row (severity 16/45, تجميع غير منطقي) is historical: it counted 17 items, programs.json now holds 19; 1 lesson outside program ages (Q3-L1); same competency+level also taught in P18 (2), P20 (2), P02 (1); 6 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P21.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P22 | السيرة والشمائل والآداب والمسؤولية (`sira-shamail-adab`) | b2 | H 25, C 7, S 5 | 12-17 / 8w / pilot | 24+13 / 5 / 37 | KEEP + REORGANIZE + CONNECT | sessions total 1064 min vs 1080 declared (99%); last session in week 11 of 8; over declared time or weeks; 2026-11-03 audit row (severity 24/45, تجميع غير منطقي) is historical: it counted 31 items, programs.json now holds 37; 1 lesson outside program ages (H2-L1); same competency+level also taught in P10 (1), P25 (1); sessions run past `duration_weeks` (19 session warnings); 19 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P22.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P23 | علوم القرآن والقراءات وتوثيق الأخبار (`uloom-quran-wa-tawthiq`) | b3 | Q 13, H 6 | 15-17 / 6w / pilot | 13+6 / 3 / 19 | KEEP + REORGANIZE + ADAPT | sessions total 605 min vs 810 declared (75%); last session in week 7 of 6; over declared time or weeks; 2026-11-03 audit row (severity 14/45, مستويات غير متجانسة) is historical: it counted 19 items, programs.json now holds 19; 4 lessons have an age_range outside the program ages (Q5-L1, Q5-L2, Q5-L3, Q5-L4); 2 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P23.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P24 | العمل والمعرفة والمهارات اليومية (`amal-ma3rifa-maharat`) | b4 | T 19, W 10, K 5, S 4 | 18-99 / 8w / pilot | 25+13 / 3 / 38 | KEEP + REORGANIZE + ADAPT + CONNECT | sessions total 1270 min vs 1200 declared (106%); last session in week 12 of 8; over declared time or weeks; 2026-11-03 audit row (severity 25/45, تجميع غير منطقي) is historical: it counted 32 items, programs.json now holds 38; 9 lessons have an age_range outside the program ages (Z1-L1, Z1-L2, Z1-L3, Z1-L4, Z1-L5, Z1-L6, Z1-L7, Z1-L8, Z1-L9); same competency+level also taught in P10 (6), P09 (4), P11 (3), P12 (3); sessions run past `duration_weeks` (25 session warnings); 25 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P24.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |
| P25 | أرتّب يومي وأراجع نفسي (`arattib-yawmi`) | b2 | S 6 | 10-12 / 4w / pilot | 4+2 / 2 / 6 | KEEP + ENRICH + CONNECT | sessions total 121 min vs 200 declared (60%); last session in week 4 of 4; under 75%%: add content or re-declare rhythm (owner scope); not in the 2026-11-03 audit; session 5 exceeds the 25-min rhythm (validate_sessions WARN); same competency+level also taught in P22 (1), P24 (1); 1 session warnings. Evidence: `programs.json`, `qa/coherence_audit.json`, `sessions/P25.json` | ids, slug, title unchanged; regrouping is a data change to programs.json/sessions only, requires pedagogical reviewer |

Totals check: 25 programs, items 532 = 347 + 185; sessions 532.

## 4. Units (96) with lesson and scenario ids

Unit key = `unit_id` or competency code. "Program(s)" = where the unit's items sit, with item counts (`programs.json`). Decision rules: KEEP always (text is not rewritten); CONNECT when the competency is served by other units or the unit's items sit in more than one program; COMPLETE when the lesson file carries `needs_owner_decision` or a stale "to be linked later" note although the unit is already linked; ADAPT marks units that are age-adapted variants of a base unit (Y1, Y2, E-extensions) so they stay linked, not merged.

| Unit | File | Skill (domain) | Title | Program(s): items | Levels / min age | Lessons | Scenarios | Decision | Reason |
|---|---|---|---|---|---|---|---|---|---|
| AG-A | lessons_AG1.json | S5 (S) | أفهم غضبي وأختار تصرفي | P07:5 | L2/L3/L4 / 10 | AG-L1, AG-L2, AG-L3 | AG-S1, AG-S5 | KEEP + CONNECT + ADAPT | same skill also in AG-B, AG-C, E6-A, S5; age/level-specific variant of a base unit; keep linked |
| AG-B | lessons_AG2.json | S5 (S) | أعترض وأتفاهم وأقبل الاعتذار | P07:5 | L4 / 10 | AG-L4, AG-L5, AG-L6 | AG-S2, AG-S3 | KEEP + CONNECT + ADAPT | same skill also in AG-A, AG-C, E6-A, S5; age/level-specific variant of a base unit; keep linked |
| AG-C | lessons_AG3.json | S5 (S) | لستُ وحدي: أطلب العون وأكتب خطتي | P07:4 | L3/L4 / 10 | AG-L7, AG-L9, AG-L8 | AG-S4 | KEEP + CONNECT + ADAPT + COMPLETE | same skill also in AG-A, AG-B, E6-A, S5; age/level-specific variant of a base unit; keep linked; `needs_owner_decision` in lessons_AG3.json says "before merge"; unit is already referenced by programs |
| E1-A | lessons_E1.json | K4 (K) | أتلو مع معلمي بهدوء: أسمع القديم وأعود برفق | P01:3, P02:2 | L1 / 5 | E1-L1, E1-L2, E1-L3 | E1-S1, E1-S2 | KEEP + CONNECT + ADAPT | same skill also in E10-A, E17-A, K4, X3-A, X3-B, Y1-C; items split over 2 programs; age/level-specific variant of a base unit; keep linked |
| E10-A | lessons_E10.json | K4 (K) | أسمع بهدوء وأنتظر نوبتي: دروس لعمر ٧–٨ بديلة لدروس الصغار | P18:6 | L1/L2/L3 / 7 | E10-L1, E10-L2, E10-L3, E10-L4 | E10-S1, E10-S2 | KEEP + CONNECT + ADAPT | same skill also in E1-A, E17-A, K4, X3-A, X3-B, Y1-C; age/level-specific variant of a base unit; keep linked |
| E11-A | lessons_E11.json | C2 (C) | أفي بما قلته: الموعد والإذن | P19:5 | L3 / 8 | E11-L1, E11-L2, E11-L3 | E11-S1, E11-S2 | KEEP + CONNECT + ADAPT | same skill also in C2, Y2-A; age/level-specific variant of a base unit; keep linked |
| E12-A | lessons_E12.json | C6 (C) | أشكر بلطف: أرى من أحسن إليّ وأذكره وأردّ بما أحب | P01:6 | L1/L2/L3 / 5 | E12-L1, E12-L2, E12-L3, E12-L4 | E12-S1, E12-S2 | KEEP + CONNECT + ADAPT | same skill also in C6, Y1-B; age/level-specific variant of a base unit; keep linked |
| E13-A | lessons_E13.json | R2 (R) | حين أخالف وحين يجرحني الكلام وحين أجرح: أقول بلطف وأسأل في و | P05:6 | L2/L3 / 8 | E13-L1, E13-L2, E13-L3, E13-L4 | E13-S1, E13-S2 | KEEP + CONNECT + ADAPT + COMPLETE | same skill also in E19-A, R2, Y2-D; age/level-specific variant of a base unit; keep linked; file note says "to be linked to the program later" but P05 already references it (metadata stale) |
| E14-A | lessons_E14.json | S2 (S) | وقتي لي: ثلاث أدوات لأسبوع بقدر طاقتي | P10:6 | L3/L4 / 14 | E14-L1, E14-L2, E14-L3, E14-L4 | E14-S1, E14-S2 | KEEP + CONNECT + ADAPT | same skill also in S2, X4-B; age/level-specific variant of a base unit; keep linked |
| E15-A | lessons_E15.json | M1 (M) | أسأل ثم أنتظر وأبني: ما بعد السؤال في جلسة مع زميل أصغر | P13:6 | L2/L3 / 16 | E15-L1, E15-L2, E15-L3, E15-L4 | E15-S1, E15-S2 | KEEP + CONNECT + ADAPT + COMPLETE | same skill also in M1; age/level-specific variant of a base unit; keep linked; file note says "to be linked to the program later" but P13 already references it (metadata stale) |
| E16-A | lessons_E16.json | S4 (S) | أصبر خطوة خطوة: صوتان وتعب وعون وكلمة طيبة | P02:6 | L1/L2/L3 / 7 | E16-L1, E16-L2, E16-L3, E16-L4 | E16-S1, E16-S2 | KEEP + CONNECT + ADAPT | same skill also in E18-A, S4, Y2-B; age/level-specific variant of a base unit; keep linked |
| E17-A | lessons_E17.json | K4 (K) | أعود حين يشرد ذهني وأجعل للطف عادة: دروس إضافية لعمر ٧–٨ | P18:6 | L1/L2 / 7 | E17-L1, E17-L2, E17-L3, E17-L4 | E17-S1, E17-S2 | KEEP + CONNECT + ADAPT | same skill also in E1-A, E10-A, K4, X3-A, X3-B, Y1-C; age/level-specific variant of a base unit; keep linked |
| E18-A | lessons_E18.json | S4 (S) | أكمل بقدري ولا أُخفي تعبي: دروس لعمر ٨ سنوات في الصبر والعود | P19:6 | L1/L2/L3 / 8 | E18-L1, E18-L2, E18-L3, E18-L4 | E18-S1, E18-S2 | KEEP + CONNECT + ADAPT | same skill also in E16-A, S4, Y2-B; age/level-specific variant of a base unit; keep linked |
| E19-A | lessons_E19.json | R2 (R) | كلامي في وقته: أستأذن وأعتذر وأشكر وأتلقى الكلمة الصعبة | P19:6 | L1/L2 / 8 | E19-L1, E19-L2, E19-L3, E19-L4 | E19-S1, E19-S2 | KEEP + CONNECT + ADAPT | same skill also in E13-A, R2, Y2-D; age/level-specific variant of a base unit; keep linked |
| E2-A | lessons_E2.json | C1 (C) | أفي بما قلت: الوعد صدق في الغد | P03:5 | L2/L3 / 8 | E2-L1, E2-L2, E2-L3 | E2-S1, E2-S2 | KEEP + CONNECT + ADAPT | same skill also in C1; age/level-specific variant of a base unit; keep linked |
| E20-A | lessons_E20.json | S3 (S) | عادتي تكبر بهدوء: دروس لعمر ٧–٨ سنوات في تذكيري وراحتي وغايت | P18:6 | L2/L3 / 7 | E20-L1, E20-L2, E20-L3, E20-L4 | E20-S1, E20-S2 | KEEP + CONNECT + ADAPT | same skill also in S3, X4-A; age/level-specific variant of a base unit; keep linked |
| E21-A | lessons_E21.json | H2 (H) | أتأسّى بالعمل في بيتي وبين أصحابي: أربعة دروس لعمر الثانية ع | P22:6 | L3/L4 / 12 | E21-L1, E21-L2, E21-L3, E21-L4 | E21-S1, E21-S2 | KEEP + CONNECT + ADAPT | same skill also in H2; age/level-specific variant of a base unit; keep linked |
| E22-A | lessons_E22.json | T4 (T) | قرارات الراشد: دوافعي، ومشكلتي، وظنّي الراجح، ومشورتي | P24:6 | L3/L4 / 18 | E22-L1, E22-L2, E22-L3, E22-L4 | E22-S1, E22-S2 | KEEP + CONNECT + ADAPT + COMPLETE | same skill also in T4, Z1-C; age/level-specific variant of a base unit; keep linked; file note says "to be linked to the program later" but P24 already references it (metadata stale) |
| E3-A | lessons_E3.json | C3 (C) | الرحمة: أسأل قبل أن أساعد | P04:5 | L2/L3 / 8 | E3-L1, E3-L2, E3-L3 | E3-S1, E3-S2 | KEEP + CONNECT + ADAPT | same skill also in E5-A, C3, Y1-A; age/level-specific variant of a base unit; keep linked |
| E4-A | lessons_E4.json | R1 (R) | حين يتعثر الكلام بين صاحبين: أنتظر وأسأل وأقول ما جرى | P05:6 | L2/L3 / 8 | E4-L1, E4-L2, E4-L3, E4-L4 | E4-S1, E4-S2 | KEEP + CONNECT + ADAPT + COMPLETE | same skill also in R1, Y1-D; age/level-specific variant of a base unit; keep linked; file note says "to be linked to the program later" but P05 already references it (metadata stale) |
| E5-A | lessons_E5.json | C3 (C) | ألطف بما يناسب: أنظر وأسأل ثم أفعل | P01:6 | L1/L2 / 5 | E5-L1, E5-L2, E5-L3, E5-L4 | E5-S1, E5-S2 | KEEP + CONNECT + ADAPT | same skill also in E3-A, C3, Y1-A; age/level-specific variant of a base unit; keep linked |
| E6-A | lessons_E6.json | S5 (S) | أُبكّر في هدوئي: شرارتي وأدواتي وما بيدي | P02:5 | L2/L3/L4 / 7 | E6-L1, E6-L2, E6-L3 | E6-S1, E6-S2 | KEEP + CONNECT + ADAPT | same skill also in AG-A, AG-B, AG-C, S5; age/level-specific variant of a base unit; keep linked |
| E7-A | lessons_E7.json | R5 (R) | أبدأ بتحية، وأقول بلطف، وأفرح لصديقي، وأضع حاجزًا لخطئي | P05:6 | L2/L3 / 8 | E7-L1, E7-L2, E7-L3, E7-L4 | E7-S1, E7-S2 | KEEP + CONNECT + ADAPT + COMPLETE | same skill also in R5; age/level-specific variant of a base unit; keep linked; file note says "to be linked to the program later" but P05 already references it (metadata stale) |
| E8-A | lessons_E8.json | T5 (T) | من السبب إلى الخطة: أحلّ مشكلة فريقي بروية | P10:6 | L3/L4 / 14 | E8-L1, E8-L2, E8-L3, E8-L4 | E8-S1, E8-S2 | KEEP + CONNECT + ADAPT | same skill also in T5, Z1-B; age/level-specific variant of a base unit; keep linked |
| E9-A | lessons_E9.json | M2 (M) | مرشد ناشئ بكرامة: أسأل قبل أن أقول، وأتدرّج، وأصغي لما يُقال | P13:6 | L3/L4 / 16 | E9-L1, E9-L2, E9-L3, E9-L4 | E9-S1, E9-S2 | KEEP + CONNECT + ADAPT + COMPLETE | same skill also in M2; age/level-specific variant of a base unit; keep linked; file note says "to be linked to the program later" but P13 already references it (metadata stale) |
| K1 | lessons_G1.json | K1 (K) | فهم الكلام في سياقه | P06:5 | L1/L2/L3 / 10 | K1-L1, K1-L2, K1-L3 | K1-S1, K1-S2 | KEEP | unique skill, single program |
| K2 | lessons_G1.json | K2 (K) | أتثبّت قبل أن أصدّق وأنشر | P06:5 | L1/L2/L3 / 10 | K2-L1, K2-L2, K2-L3 | K2-S1, K2-S2 | KEEP | unique skill, single program |
| K3 | lessons_G1.json | K3 (K) | نص أم شرح أم رأي؟ | P09:7 | L1/L2/L3/L4/L5 / 12 | K3-L1, K3-L2, K3-L3, K3-L4, K3-L5 | K3-S1, K3-S2 | KEEP + CONNECT | same skill also in X2-B |
| K4 | lessons_G1.json | K4 (K) | أتلو وأحفظ وأراجع برفق | P01:1, P02:2, P21:2 | L1/L2/L3 / 5 | K4-L1, K4-L2, K4-L3 | K4-S1, K4-S2 | KEEP + CONNECT | same skill also in E1-A, E10-A, E17-A, X3-A, X3-B, Y1-C; items split over 3 programs |
| T1 | lessons_G1.json | T1 (T) | أسأل لأفهم | P02:2, P05:1, P08:2 | L1/L2/L3 / 7 | T1-L1, T1-L2, T1-L3 | T1-S1, T1-S2 | KEEP + CONNECT | same skill also in Y2-C; items split over 3 programs |
| C1 | lessons_G2.json | C1 (C) | الصدق: أقول ما أعرفه وأفي بما قلت | P03:5, P08:1 | L1/L2/L3/L4 / 6 | C1-L1, C1-L2, C1-L3, C1-L4 | C1-S1, C1-S2 | KEEP + CONNECT | same skill also in E2-A; items split over 2 programs |
| C2 | lessons_G2.json | C2 (C) | الأمانة: أحفظ وأؤدّي | P03:5 | L1/L2/L3 / 7 | C2-L1, C2-L2, C2-L3 | C2-S1, C2-S2 | KEEP + CONNECT | same skill also in E11-A, Y2-A |
| C3 | lessons_G2.json | C3 (C) | الرحمة: أنتبه وألطف | P01:2, P04:3 | L1/L2/L3 / 5 | C3-L1, C3-L2, C3-L3 | C3-S1, C3-S2 | KEEP + CONNECT | same skill also in E3-A, E5-A, Y1-A; items split over 2 programs |
| C4 | lessons_G2.json | C4 (C) | العدل والإنصاف: لكل حقه | P04:4, P08:2 | L1/L2/L3/L4 / 8 | C4-L1, C4-L2, C4-L3, C4-L4 | C4-S1, C4-S2 | KEEP + CONNECT | items split over 2 programs |
| C5 | lessons_G2.json | C5 (C) | التواضع: أعرف قدري وأقبل الحق | P04:5, P08:1 | L1/L2/L3/L4 / 7 | C5-L1, C5-L2, C5-L3, C5-L4 | C5-S1, C5-S2 | KEEP + CONNECT | items split over 2 programs |
| C6 | lessons_G2.json | C6 (C) | الشكر والامتنان: أعرف وأفرح وأعمل | P01:2, P04:3 | L1/L2/L3 / 5 | C6-L1, C6-L2, C6-L3 | C6-S1, C6-S2 | KEEP + CONNECT | same skill also in E12-A, Y1-B; items split over 2 programs |
| S1 | lessons_G3.json | S1 (S) | أراجع يومي بهدوء | P10:1, P25:3 | L1/L2/L3 / 10 | S1-L1, S1-L2, S1-L3 | S1-S1 | KEEP + CONNECT | same skill also in Z1-A; items split over 2 programs |
| S2 | lessons_G3.json | S2 (S) | أرتب وقتي بقدر طاقتي | P10:1, P25:3 | L1/L2/L3 / 10 | S2-L1, S2-L2, S2-L3 | S2-S1 | KEEP + CONNECT | same skill also in E14-A, X4-B; items split over 2 programs |
| S3 | lessons_G3.json | S3 (S) | عادة صغيرة تنمو | P18:5 | L1/L2/L3 / 6 | S3-L1, S3-L2, S3-L3 | S3-S1, S3-S2 | KEEP + CONNECT | same skill also in E20-A, X4-A |
| S4 | lessons_G3.json | S4 (S) | أستمر خطوة خطوة | P02:5 | L1/L2/L3 / 7 | S4-L1, S4-L2, S4-L3 | S4-S1, S4-S2 | KEEP + CONNECT | same skill also in E16-A, E18-A, Y2-B |
| S5 | lessons_G3.json | S5 (S) | وقفة قبل الرد | P02:3, P07:2 | L1/L2/L3 / 6 | S5-L1, S5-L2, S5-L3 | S5-S1, S5-S2 | KEEP + CONNECT | same skill also in AG-A, AG-B, AG-C, E6-A; items split over 2 programs |
| S6 | lessons_G3.json | S6 (S) | أصلح وأكمل | P05:3, P07:2 | L1/L2/L3 / 8 | S6-L1, S6-L2, S6-L3 | S6-S1, S6-S2 | KEEP + CONNECT | items split over 2 programs |
| T2 | lessons_G4.json | T2 (T) | التفكير النقدي وكشف المغالطات | P06:5, P09:1 | L1/L2/L3/L4 / 10 | T2-L1, T2-L2, T2-L3, T2-L4 | T2-S1, T2-S2 | KEEP + CONNECT | items split over 2 programs |
| T3 | lessons_G4.json | T3 (T) | الاستدلال المنهجي | P09:6, P13:1 | L1/L2/L3/L4/L5 / 12 | T3-L1, T3-L2, T3-L3, T3-L4, T3-L5 | T3-S1, T3-S2 | KEEP + CONNECT | items split over 2 programs; age mismatch with host program: T3-L1 |
| T4 | lessons_G4.json | T4 (T) | اتخاذ القرار | P10:6, P13:1 | L1/L2/L3/L4/L5 / 12 | T4-L1, T4-L2, T4-L3, T4-L4, T4-L5 | T4-S1, T4-S2 | KEEP + CONNECT | same skill also in E22-A, Z1-C; items split over 2 programs; age mismatch with host program: T4-L1, T4-L2 |
| T5 | lessons_G4.json | T5 (T) | حل المشكلات | P06:5, P10:1 | L1/L2/L3/L4 / 10 | T5-L1, T5-L2, T5-L3, T5-L4 | T5-S1, T5-S2 | KEEP + CONNECT | same skill also in E8-A, Z1-B; items split over 2 programs |
| T6 | lessons_G4.json | T6 (T) | التعلّم الذاتي والبحث | P09:6, P13:1 | L1/L2/L3/L4/L5 / 12 | T6-L1, T6-L2, T6-L3, T6-L4, T6-L5 | T6-S1, T6-S2 | KEEP + CONNECT | same skill also in X2-A; items split over 2 programs; age mismatch with host program: T6-L1, T6-L2 |
| R1 | lessons_G5.json | R1 (R) | حسن الاستماع: أسكت وأنتبه لأفهم | P05:6 | L1/L2/L3 / 6 | R1-L1, R1-L2, R1-L3 | R1-S1, R1-S2, R1-S3 | KEEP + CONNECT | same skill also in E4-A, Y1-D |
| R2 | lessons_G5.json | R2 (R) | التواصل الواضح اللطيف | P05:4, P08:3 | L1/L2/L3/L4 / 8 | R2-L1, R2-L2, R2-L3, R2-L4 | R2-S1, R2-S2, R2-S3 | KEEP + CONNECT | same skill also in E13-A, E19-A, Y2-D; items split over 2 programs |
| R3 | lessons_G5.json | R3 (R) | إدارة الخلاف وحل النزاع | P08:6, P11:1 | L1/L2/L3/L4 / 10 | R3-L1, R3-L2, R3-L3, R3-L4 | R3-S1, R3-S2, R3-S3 | KEEP + CONNECT | items split over 2 programs; age mismatch with host program: R3-L4 |
| R4 | lessons_G5.json | R4 (R) | بر الوالدين وصلة الرحم | P03:5, P08:2 | L1/L2/L3/L4 / 6 | R4-L1, R4-L2, R4-L3, R4-L4 | R4-S1, R4-S2, R4-S3 | KEEP + CONNECT | items split over 2 programs |
| R5 | lessons_G6.json | R5 (R) | الصداقة والجوار: أصحاب بحقوق ووفاء | P05:4, P08:3 | L1/L2/L3/L4 / 8 | R5-L1, R5-L2, R5-L3, R5-L4 | R5-S1, R5-S2, R5-S3 | KEEP + CONNECT | same skill also in E7-A; items split over 2 programs |
| R6 | lessons_G6.json | R6 (R) | الشراكة الزوجية: تعليم عام بتحفظ | P15:5 | L1/L2/L3 / 18 | R6-L1, R6-L2, R6-L3 | R6-S1, R6-S2 | KEEP | unique skill, single program |
| R7 | lessons_G6.json | R7 (R) | التربية الوالدية: قدوة وحزم رحيم | P16:5 | L1/L2/L3 / 20 | R7-L1, R7-L2, R7-L3 | R7-S1, R7-S2 | KEEP | unique skill, single program |
| W1 | lessons_G6.json | W1 (W) | الأمانة المهنية: إتقان وصدق وحفظ للحقوق | P12:7 | L1/L2/L3/L4/L5 / 16 | W1-L1, W1-L2, W1-L3, W1-L4, W1-L5 | W1-S1, W1-S2 | KEEP | unique skill, single program |
| W2 | lessons_G7.json | W2 (W) | المال أمانة في اليد: الحاجة والميزانية والادخار | P11:6 | L1/L2/L3/L4 / 12 | W2-L1, W2-L2, W2-L3, W2-L4 | W2-S1, W2-S2 | KEEP + CONNECT | same skill also in X1-A |
| W3 | lessons_G7.json | W3 (W) | الاتفاق عهد: الوفاء وقراءة الشروط | P12:6 | L1/L2/L3/L4 / 16 | W3-L1, W3-L2, W3-L3, W3-L4 | W3-S1, W3-S2 | KEEP + CONNECT | same skill also in X1-B |
| W4 | lessons_G7.json | W4 (W) | مبادرة صغيرة ونفع كبير: الإنتاج والمبادرة | P11:6 | L1/L2/L3/L4 / 14 | W4-L1, W4-L2, W4-L3, W4-L4 | W4-S1, W4-S2 | KEEP | unique skill, single program |
| L1 | lessons_G7.json | L1 (L) | أستشير ثم أعزم: الشورى والقرار الجماعي | P10:5, P13:1 | L1/L2/L3/L4 / 14 | L1-L1, L1-L2, L1-L3, L1-L4 | L1-S1, L1-S2 | KEEP + CONNECT | items split over 2 programs |
| L2 | lessons_G7.json | L2 (L) | قيادة تخدم: المسؤولية العامة في الفريق الصغير | P13:6 | L1/L2/L3/L4 / 16 | L2-L1, L2-L2, L2-L3, L2-L4 | L2-S1, L2-S2 | KEEP | unique skill, single program |
| L3 | lessons_G8.json | L3 (L) | الحوكمة والمساءلة: كيف نحلل المؤسسات بحياد | P14:6 | L1/L2/L3/L4 / 18 | L3-L1, L3-L2, L3-L3, L3-L4 | L3-S1, L3-S2 | KEEP | unique skill, single program |
| L4 | lessons_G8.json | L4 (L) | نتعاون على الخير: خدمة المجتمع باحترام التنوع | P08:3, P11:2 | L1/L2/L3 / 10 | L4-L1, L4-L2, L4-L3 | L4-S1, L4-S2 | KEEP + CONNECT | items split over 2 programs |
| M1 | lessons_G8.json | M1 (M) | نعلّم بالسؤال لا بالتلقين | P13:4, P14:2 | L1/L2/L3/L4 / 16 | M1-L1, M1-L2, M1-L3, M1-L4 | M1-S1, M1-S2 | KEEP + CONNECT | same skill also in E15-A; items split over 2 programs |
| M2 | lessons_G8.json | M2 (M) | ملاحظة نافعة لا تعيير | P13:4, P14:2 | L1/L2/L3/L4 / 16 | M2-L1, M2-L2, M2-L3, M2-L4 | M2-S1, M2-S2 | KEEP + CONNECT | same skill also in E9-A; items split over 2 programs |
| M3 | lessons_G8.json | M3 (M) | التقييم العادل بمعيار معلن | P14:6 | L1/L2/L3/L4 / 18 | M3-L1, M3-L2, M3-L3, M3-L4 | M3-S1, M3-S2 | KEEP | unique skill, single program |
| H1 | lessons_H1.json | H1 (H) | السيرة النبوية المتدرجة | P22:7 | L1/L2/L3/L4 / 9 | H1-L1, H1-L2, H1-L3, H1-L4, H1-L5 | H1-S1, H1-S2 | KEEP | unique skill, single program |
| H2 | lessons_H2.json | H2 (H) | الشمائل المحمدية والقدوة: أخلاق نتأسى بها بالعمل | P22:6 | L1/L2/L3 / 9 | H2-L1, H2-L2, H2-L3, H2-L4 | H2-S1, H2-S2 | KEEP + CONNECT | same skill also in E21-A; age mismatch with host program: H2-L1 |
| H3 | lessons_H3.json | H3 (H) | آداب يومية من الأربعين: النية والكلام والغضب والاستئذان والح | P22:6 | L1/L2/L3/L4 / 11 | H3-L1, H3-L2, H3-L3, H3-L4 | H3-S1, H3-S2 | KEEP | unique skill, single program |
| H4 | lessons_H4.json | H4 (H) | توثيق الأخبار والتمييز بين المصدر والشرح | P23:6 | L1/L2/L3/L4 / 14 | H4-L1, H4-L2, H4-L3, H4-L4 | H4-S1, H4-S2 | KEEP | unique skill, single program |
| H5 | lessons_H5.json | H5 (H) | قصص السيرة للأطفال | P17:6 | L1/L2/L3/L4 / 5 | H5-L1, H5-L2, H5-L3, H5-L4 | H5-S1, H5-S2 | KEEP | unique skill, single program |
| Q1 | lessons_Q1.json | Q1 (Q) | الإصغاء والتلاوة بأدب | P20:6 | L1/L2/L3/L4 / 7 | Q1-L1, Q1-L2, Q1-L3, Q1-L4 | Q1-S1, Q1-S2 | KEEP | unique skill, single program |
| Q2 | lessons_Q2.json | Q2 (Q) | أساسيات التجويد كأهداف تعلّم: لماذا نتعلمه وكيف | P20:6 | L1/L2/L3/L4 / 8 | Q2-L1, Q2-L2, Q2-L3, Q2-L4 | Q2-S1, Q2-S2 | KEEP | unique skill, single program |
| Q3 | lessons_Q3.json | Q3 (Q) | الحفظ المنهجي والمراجعة | P21:6 | L1/L2/L3/L4 / 7 | Q3-L1, Q3-L2, Q3-L3, Q3-L4 | Q3-S1, Q3-S2 | KEEP | age mismatch with host program: Q3-L1 |
| Q4 | lessons_Q4.json | Q4 (Q) | التدبّر وربط الآية بالسلوك | P21:6 | L1/L2/L3/L4 / 10 | Q4-L1, Q4-L2, Q4-L3, Q4-L4 | Q4-S1, Q4-S2 | KEEP | unique skill, single program |
| Q5 | lessons_Q5.json | Q5 (Q) | علوم القرآن التمهيدية: خريطة وبطاقات وحدود | P23:7 | L1/L2/L3/L4 / 12 | Q5-L1, Q5-L2, Q5-L3, Q5-L4, Q5-L5 | Q5-S1, Q5-S2 | KEEP | age mismatch with host program: Q5-L1, Q5-L2, Q5-L3, Q5-L4 |
| Q6 | lessons_Q6.json | Q6 (Q) | تقدير اختلاف الروايات والقراءات | P23:6 | L1/L2/L4/L5 / 13 | Q6-L1, Q6-L2, Q6-L3, Q6-L4 | Q6-S1, Q6-S2 | KEEP | unique skill, single program |
| X1-A | lessons_X1.json | W2 (W) | مالي بين يديّ: ميزانية بسيطة ووفاء بما التزمت به | P24:5 | L1/L2/L3 / 18 | X1-L1, X1-L2, X1-L3 | X1-S1, X1-S2 | KEEP + CONNECT + COMPLETE | same skill also in W2; gap-fill extension; `needs_owner_decision` in lessons_X1.json says "before merge"; unit is already referenced by programs |
| X1-B | lessons_X1.json | W3 (W) | اتفاقي واضح وعملي شريف: وعي عام بالاتفاقات وحقوق العمل | P24:5 | L1/L2/L3 / 18 | X1-L4, X1-L5, X1-L6 | X1-S3, X1-S4 | KEEP + CONNECT + COMPLETE | same skill also in W3; gap-fill extension; `needs_owner_decision` in lessons_X1.json says "before merge"; unit is already referenced by programs |
| X2-A | lessons_X2.json | T6 (T) | الباحث الناشئ: سؤال جيد ومصدر موثوق وتوثيق أمين | P24:5 | L2/L3 / 16 | X2-L1, X2-L2, X2-L3 | X2-S1, X2-S2 | KEEP + CONNECT + COMPLETE | same skill also in T6; gap-fill extension; `needs_owner_decision` in lessons_X2.json says "before merge"; unit is already referenced by programs |
| X2-B | lessons_X2.json | K3 (K) | الاختلاف العلمي وحدود الباحث: عرض أمين وإحالة لأهل الاختصاص | P24:5 | L2/L3 / 16 | X2-L4, X2-L5, X2-L6 | X2-S3, X2-S4 | KEEP + CONNECT + COMPLETE | same skill also in K3; gap-fill extension; `needs_owner_decision` in lessons_X2.json says "before merge"; unit is already referenced by programs |
| X3-A | lessons_X3.json | K4 (K) | هدوء قبل التلاوة والإصغاء الحاضر وسؤال «ماذا يلفتني؟» | P20:5 | L1/L2/L3 / 8 | X3-L1, X3-L2, X3-L3 | X3-S1, X3-S2 | KEEP + CONNECT + COMPLETE | same skill also in E1-A, E10-A, E17-A, K4, X3-B, Y1-C; gap-fill extension; `needs_owner_decision` in lessons_X3.json says "before merge"; unit is already referenced by programs |
| X3-B | lessons_X3.json | K4 (K) | تدوين الأثر الخاص واحترام اختلاف الروايات والمدارس | P21:5 | L2/L3 / 11 | X3-L4, X3-L5, X3-L6 | X3-S3, X3-S4 | KEEP + CONNECT + COMPLETE | same skill also in E1-A, E10-A, E17-A, K4, X3-A, Y1-C; gap-fill extension; `needs_owner_decision` in lessons_X3.json says "before merge"; unit is already referenced by programs |
| X4-A | lessons_X4.json | S3 (S) | عاداتي اليومية: مكاني وأدواتي ونومي | P18:5 | L1/L2 / 6 | X4-L1, X4-L2, X4-L3 | X4-S1, X4-S2 | KEEP + CONNECT + COMPLETE | same skill also in E20-A, S3; gap-fill extension; `needs_owner_decision` in lessons_X4.json says "before merge"; unit is already referenced by programs |
| X4-B | lessons_X4.json | S2 (S) | ترتيب مساءاتي ومكاني المشترك | P22:5 | L2/L3 / 10 | X4-L4, X4-L5, X4-L6 | X4-S3, X4-S4 | KEEP + CONNECT + COMPLETE | same skill also in E14-A, S2; gap-fill extension; `needs_owner_decision` in lessons_X4.json says "before merge"; unit is already referenced by programs |
| X5-A | lessons_X5.json | X5 (C) | المسؤولية الرقمية: أحمي غيري وأحمي نفسي وأطلب العون | P22:7 | L2/L3 / 11 | X5-L1, X5-L2, X5-L3, X5-L4 | X5-S1, X5-S2, X5-S3 | KEEP | unique skill, single program |
| Y1-A | lessons_Y1.json | C3 (C) | الرحمة: أرى وأحسّ وأفعل | P17:5 | L1/L2/L3 / 5 | Y1-L1, Y1-L2, Y1-L3 | Y1-S1, Y1-S2 | KEEP + CONNECT + ADAPT | same skill also in E3-A, E5-A, C3; age/level-specific variant of a base unit; keep linked |
| Y1-B | lessons_Y1.json | C6 (C) | الشكر: أعدّ نعمي وأقول شكرًا | P17:4 | L1/L2/L3 / 5 | Y1-L4, Y1-L5, Y1-L6 | Y1-S3 | KEEP + CONNECT + ADAPT | same skill also in E12-A, C6; age/level-specific variant of a base unit; keep linked |
| Y1-C | lessons_Y1.json | K4 (K) | أسمع وأردّد: لحظات قصيرة مع القرآن | P01:4 | L1 / 5 | Y1-L7, Y1-L8, Y1-L9 | Y1-S4 | KEEP + CONNECT + ADAPT | same skill also in E1-A, E10-A, E17-A, K4, X3-A, X3-B; age/level-specific variant of a base unit; keep linked |
| Y1-D | lessons_Y1.json | R1 (R) | أسمع بأذني وعيني: لكل متكلم نوبة | P18:4 | L1/L2/L3 / 6 | Y1-L10, Y1-L11, Y1-L12 | Y1-S5 | KEEP + CONNECT + ADAPT | same skill also in E4-A, R1; age/level-specific variant of a base unit; keep linked; age mismatch with host program: Y1-L10, Y1-L11, Y1-L12 |
| Y2-A | lessons_Y2.json | C2 (C) | الأمانة: عندي وليست لي | P19:4 | L1/L2/L3 / 7 | Y2-L1, Y2-L2, Y2-L3 | Y2-S1 | KEEP + CONNECT + ADAPT | same skill also in E11-A, C2; age/level-specific variant of a base unit; keep linked |
| Y2-B | lessons_Y2.json | S4 (S) | المثابرة: خطوة صغيرة وأكمل | P19:4 | L1/L2/L3 / 7 | Y2-L4, Y2-L5, Y2-L6 | Y2-S2 | KEEP + CONNECT + ADAPT | same skill also in E16-A, E18-A, S4; age/level-specific variant of a base unit; keep linked |
| Y2-C | lessons_Y2.json | T1 (T) | أسئلتي تعينني على الفهم | P19:4 | L1/L2/L3 / 7 | Y2-L7, Y2-L8, Y2-L9 | Y2-S3 | KEEP + CONNECT + ADAPT | same skill also in T1; age/level-specific variant of a base unit; keep linked |
| Y2-D | lessons_Y2.json | R2 (R) | كلام واضح ولطيف | P19:4 | L1/L2/L3 / 8 | Y2-L10, Y2-L11, Y2-L12 | Y2-S4 | KEEP + CONNECT + ADAPT | same skill also in E13-A, E19-A, R2; age/level-specific variant of a base unit; keep linked |
| Z1-A | lessons_Z1.json | S1 (S) | يومياتي الهادئة: مراجعة اليوم بلا جلد | P24:4 | L2/L3/L4 / 15 | Z1-L1, Z1-L2, Z1-L3 | Z1-S1 | KEEP + CONNECT | same skill also in S1; age mismatch with host program: Z1-L1, Z1-L2, Z1-L3 |
| Z1-B | lessons_Z1.json | T5 (T) | يومياتي لحل مشكلة | P24:4 | L3/L4 / 15 | Z1-L4, Z1-L5, Z1-L6 | Z1-S2 | KEEP + CONNECT | same skill also in E8-A, T5; age mismatch with host program: Z1-L4, Z1-L5, Z1-L6 |
| Z1-C | lessons_Z1.json | T4 (T) | يومياتي قبل أن أقرر | P24:4 | L2/L3 / 15 | Z1-L7, Z1-L8, Z1-L9 | Z1-S3 | KEEP + CONNECT | same skill also in E22-A, T4; age mismatch with host program: Z1-L7, Z1-L8, Z1-L9 |

Checks: 96 rows; lessons listed 347; scenarios listed 185.

### 4.1 Cross-cutting findings that drive the decisions

- 48 (skill, level) pairs are taught in 2 or more programs; 20 of them with at least one year of age overlap. These are the CONNECT candidates, not duplicates of text (max 4-gram Jaccard between any two lessons is 0.196; see Duplication Audit 3). Full list: Duplication Audit section 5.
- 24 lessons sit in programs whose age span does not contain their own `age_range` (P24 9, P23 4, P09 3, P18 3, P10 2, P11 1, P21 1, P22 1). P24 (18+) hosts the nine Z1 lessons labelled 15-17. Decision: ADAPT or move after pedagogical review; extension units E21/E22 already provide older-age alternatives for P22/P24 (file notes).
- Pacing: 197 session warnings (47 "minutes exceed rhythm", 46 "week beyond duration_weeks", the rest "more than N sessions in a week"). These are scope decisions for the owner (declared rhythm vs content), not defects.
- Coverage: competency `X5` (digital responsibility) has unit `X5-A` (grounding 6) but no `extracted/X5.json`; the unit is grounded only through its own `grounding` list.
- Stale metadata: 6 lesson files (E4, E7, E9, E13, E15, E22) say the unit "will be linked to the program later" while `programs.json` already references them; X1-X4 and AG3 `needs_owner_decision` still stand (reviewers not named).

## 5. Guides, sessions, SPA sections, DB tracks, sources

### 5.1 Guides (25) and sessions (25 files)

Every guide has `week_by_week` equal to the program `duration_weeks` (checked for all 25), 4-7 materials, 4-6 refer-out items and 5-11 FAQs. Sessions: every program has a session file; 532 = 532 items.

| Group | Programs | Decision | Reason / evidence | Impact |
|---|---|---|---|---|
| Guides, standard parent section | P01-P13, P17-P25 (22) | KEEP | complete structure, all `unreviewed`; `guides/Pxx.json` | none |
| Guides, parent section `not_applicable` | P14, P15, P16 | KEEP + COMPLETE | adults-only programs; reviewers (`political_neutrality`, `family_counselling`, `legal`) not named; `programs.json` gating | needs owner to appoint reviewers |
| Guides with safety extras | P07, P25 (`how_to_listen`, `when_to_seek_help`; 11 and 7 FAQs) | KEEP; CONNECT as the template for other child programs | pattern exists only in these two; others have 5-6 FAQs | optional ENRICH of P03-P05 guides after reviewer |
| Sessions, healthy pacing | programs with <=5 warnings: P07 0, P04 1, P15 1, P16 1, P17 1, P25 1, P20 2, P23 2, P11 3, P12 3, P03 4, P09 4, P14 5 | KEEP | `validate_sessions.py` | none |
| Sessions, pacing conflicts | P18 28, P05 15, P13 15, P24 25, P19 21, P22 19, P02 13 (smaller: P08 8, P01 7, P06 6, P10 6, P21 6) | REORGANIZE (schedule only) | weeks beyond `duration_weeks` or >3 sessions/week; owner chooses: raise `duration_weeks`/rhythm or re-spread sessions | `sessions/Pxx.json` and/or `programs.json` rhythm; ids unchanged |
| Session ids | all 532 | CREATE (additive) | sessions only have `session_number`; an id `Pxx-Snn` gives stable deep links and progress keys | additive field, no break |

### 5.2 SPA sections (`packages/web/index.html`; web-vercel copy identical except line 6)

| Route / section | Content and store | Classification | Decision | Reason and evidence | Impact |
|---|---|---|---|---|---|
| `#/` landing (`landing`, l.814; `ECO` l.797) | cards linking features; static text | navigation | KEEP + CONNECT | entry points to every domain; keep, but add the 25-program Academy as first-class card only after reviewers (owner) | none |
| `#/quran` (`quranRoute` l.872) | 114 surahs, 6,236 ayahs (hafs) from DB; 5 tafsir ids in `TAFSIRS` l.937; audio | domain Q (Quran core) / source | KEEP | Quran text must never change; DB `quran_ayahs` 6,236, 1 edition | none |
| `#/search` (`searchView` l.1000) | search over Quran/translation | tool | KEEP | single search engine by design (F-29 comment) | none |
| `#/tajweed` (`tajweedView` l.1528) | 5 tabs, content hard-coded: `MAKHARIJ` 5, `SIFA_DEF` 12, `AHKAM` 3 groups/11 items, `MUDOOD` 6, letter explorer | skill content (tajweed) | KEEP + CONNECT + COMPLETE | overlaps topically with Q2 (academy), `TEMPLATES` 0/3/4/5 and the 33 quiz questions (topic-level, not text-verified); carries banner "preliminary, under scholarly review"; link, do not copy | link targets only; content stays |
| `#/foundations` (`foundationsView` l.1117) | `FD_LET` 28 letters, forms, harakat, syllables, quiz; 3 modes (kids/adult/regular) | skill content (reading foundations) | KEEP + CONNECT | feeds `TEMPLATES[3]` (15 units) and kids activities; no domain letter yet | none |
| `#/kids` (`kidsView` l.2091) | 3 bands `KB` (4-6, 7-10, 11-14), `KPAIRS` 9 groups, local log (`kst`) | activity engine (children) | KEEP + ADAPT | bands (4-6/7-10/11-14) differ from academy bands (5-8/9-12/13-17): two age schemes coexist; decide a mapping, not a merge | owner decision on age scheme |
| `#/academy` (`academyView` l.2078; `acHome` l.1874) | fetches 4 files (l.1835): `academy.json` (52 competencies), `academy-lessons.json` (96 units), `academy-programs.json` (25), `academy-guides.json` (25); `academy-sessions.json` (532 sessions) is built and shipped but **not fetched** by the page (0 references in index.html) | delivery (programs) | KEEP + COMPLETE + CONNECT | heading "الكفايات الأربعون" (l.2046) while 52 exist; review panel only for scholarly_reviewer | fix string; surface sessions in the UI after reviewers (the data already exists) |
| `#/qiraat` (`qiraatView` l.2288) | `QIRAAT` 10 readers x 2 transmitters, static; link to sanad | domain Q (qira'at) | KEEP | hafs only text available; others not displayed until edition approved | none |
| `#/me` tabs (`meView` l.1605) | today, tasmi, hifz, quiz (`QUIZZES` 33 q), map, sanad; API + local | learner space | KEEP + CONNECT | hifz/quiz/map are the practice layer for Q3 and tajweed content | none |
| `#/app` dashboard sections (`dashboard` l.1078; `SECTIONS` l.1077) | overview, tracks, halaqat, homework, recitation, certs, assistant, people, admin (9) | institution ops | KEEP | tenant-scoped via RLS; tracks tab uses `TEMPLATES` (11) | none |
| `TEMPLATES` (l.1553) | 11 institution track templates (see section 5.3) | delivery (institution tracks) | KEEP + REORGANIZE + CONNECT | overlapping surah coverage and one text says "eight" templates (l.1085) while 11 exist | copy text fix; links to academy units later |
| `#/review` (`reviewView` l.2308) | scholarly items state machine (DRAFT..PUBLISHED..ARCHIVED) | governance | KEEP | 39 concept/DRAFT items, 0 reviews | none |
| `#/plan` (`planView` l.2182), `#/demo` (l.2152) | study plans / homework demo | tools | KEEP | 0 rows in `study_plans`, `homework_*` | none |
| `#/learn`, `#/practise` hubs (`HUBS` l.750) | link lists to the above | navigation | KEEP + CONNECT | hubs do not list the Academy programs by domain; add after reviewers | none |
| `#/auth`, `#/verify`, `#/gallery` | sign-in, certificate verify by code, ornament gallery | functional | KEEP | certificates 0 rows | none |

### 5.3 SPA track templates (`TEMPLATES`) and DB tracks

| # | Template title | Units | Kinds | Decision | Reason |
|---|---|---|---|---|---|
| 0 | أساسيات التجويد | 10 | tajweed, recitation, review | KEEP | byte-identical source of both DB tracks (md5 of description and unit list match; see Duplication Audit 7) |
| 1 | تلاوة وحفظ جزء عمّ | 38 | memorization, review | KEEP + CONNECT | 37 surahs (78-114) + review; subset of template 10 by surah |
| 2 | قصار السور: تلاوة صحيحة | 11 | recitation | KEEP + CONNECT | 10 of its 11 surahs are in template 1 |
| 3 | التأسيس في القراءة الصحيحة | 15 | tajweed, recitation, review | KEEP + CONNECT | links to `#/foundations` |
| 4 | متن تحفة الأطفال | 15 | tajweed, recitation, review | KEEP + CONNECT | shares unit title "أحكام الميم الساكنة" with template 0 |
| 5 | المقدمة الجزرية | 14 | tajweed, review | KEEP | advanced; no overlap by title |
| 6 | حفظ الجزء التاسع والعشرين (تبارك) | 12 | memorization, review | KEEP | 11 surahs + review |
| 7 | حفظ الجزء الثامن والعشرين (قد سمع) | 10 | memorization, review | KEEP | 9 surahs + review |
| 8 | سور مختارة للحفظ والمداومة | 6 | memorization, review | KEEP | 5 surahs + review |
| 9 | مراجعة الحفظ الأسبوعية | 8 | review | KEEP | schedule template |
| 10 | ختمة في ثلاثين يومًا | 136 | recitation | KEEP + CONNECT | covers all 114 surahs; superset of the surahs in templates 0-9 other than review items |

### 5.4 DB tracks (Supabase `okbtrogotrtciymmuokr`)

| Row | Decision | Reason / evidence | Impact |
|---|---|---|---|
| `learning_tracks` 9f0b6d3b-edd4-4e44-bc96-597e485011b8 "أساسيات التجويد", published, created 2026-11-01 | KEEP | the live published copy; 10 units | none |
| `learning_tracks` adb0b936-c68c-4f99-9a46-2bf807e62904 "أساسيات التجويد", draft, created 2026-11-02 | ARCHIVE (proposal only, owner decision, backup first) | identical to the published track: same institution `f2b3bb6f-7545-42e2-9ace-6d45073c2ffd`, same description md5 `b3b97644...`, same unit-list md5 `716c784a...`; 0 `unit_progress`, 0 `certificates` rows. Reversible path = `status` set to `archived` (allowed by the CHECK in migration 0008); **no DELETE** | none for learners today (0 progress); see Duplication Audit 7 for the protocol |
| 20 `track_units` (10 + 10) | KEEP | rows belong to the two tracks; untouched | none |
| 39 `scholarly_items` concept/DRAFT | KEEP | machine-extracted, unreviewed; never published (DB gate, migration 0002) | none |
| `quran_ayahs` 6,236, `translation_ayahs` 6,236, `quran_reference_counts` 114 | KEEP | Quran text is immutable | none |
| Academy content tables | CREATE (owner decision) | 0 academy rows in DB; migrations 0017-0020 exist in the repo but are **not applied** (db_inventory `not_applied_migrations`) | needed only if the owner wants DB-side publication/progress; static JSON works today |

### 5.5 Source layer

| Item | Class | Decision | Reason / evidence |
|---|---|---|---|
| `extracted/*.json` 52 files / 531 principles | source | KEEP + COMPLETE | ids unique (0 errors); no text duplicates (Duplication Audit 4); `X5.json` missing; 321 recorded source gaps (per sibling inventory) |
| `competencies.json` 52 | skill | KEEP + ENRICH | anchors mostly heading-only; verification is reviewer work |
| `records/*.md`, `PILOT_SOURCE_RECORDS.md` | source | KEEP | platform-worded records; no third-party text |
| `scholarly-assets/extraction*` (53 dirs) and `_inputs` | source (internal) | KEEP, never publish | licences not cleared (CLAUDE.md); 57,989 paragraph units, 629 near-duplicate clusters all `PENDING_HUMAN_REVIEW` |
| `docs/human-formation/gaps/` | n/a | KEEP (empty) | 0 files |

### 5.6 CREATE items (only where the need is proven by data)

| Item | Proof of need | Owner decision |
|---|---|---|
| Domain/skill ids for the Quran-reading surfaces (tajweed, foundations, hifz, qira'at) so they can be linked to academy units | `academy.json` has domain `Q` with 6 competencies (Q1-Q6) but the SPA tajweed/foundations/hifz content has no id in the library; 4 SPA surfaces + 11 templates + Q2 cover tajweed | yes (taxonomy) |
| `extracted/X5.json` | unit `X5-A` exists, no principle file for competency X5 | reviewer/source selection |
| Session ids `Pxx-Snn` | 532 sessions without id | no (additive) |
| Regenerated `academy_status_seed.json` | seed has 24/255/136/24; current 25/347/185/25 (missing 1 program, 92 lessons, 49 scenarios, 1 guide) | no (generated file), but applying migration 0020 is the owner's |
| Uniqueness guard for track titles per institution | the duplicate in 5.4 was possible because nothing prevents it | yes (new append-only migration, never edits applied ones) |

## 6. Old to new location migration map (ids preserved)

Principle: **no id changes, no URL changes.** "New" below is a logical address in the library/delivery model of section 2; the physical files may stay where they are, and the map can be implemented as an index (JSON) rather than by moving files. Old routes keep working forever (`#/academy/p/<Pxx>`, `/l/<id>`, `/s/<id>`, `/c/<competency>`).

| Level | Old location | New logical address | Id rule |
|---|---|---|---|
| Domain | `academy.json` `domains.<letter>` | `library/<letter>` | letter kept |
| Skill | `competencies.json` id | `library/<letter>/<skill>` | id kept |
| Unit | `lessons/lessons_<file>.json` `units[]` | `library/<letter>/<skill>/<unitKey>` | key kept (`unit_id` or competency code) |
| Lesson | same file `units[].lessons[]` | `library/<letter>/<skill>/<unitKey>/<lessonId>` | id kept (347) |
| Scenario | same file `units[].scenarios[]` | same, `.../<scenarioId>` | id kept (185) |
| Track | `programs.json` `bands[]` | `track/<bandId>` | b1..b8 kept |
| Program | `programs.json` `programs[]` | `track/<bandId>/<Pxx>` | Pxx, slug kept |
| Stage | `programs[].stages[]` | `track/<bandId>/<Pxx>/<stageId>` | e.g. `P01-A` kept |
| Session | `sessions/<Pxx>.json` `sessions[]` | `track/<bandId>/<Pxx>/S<nn>` | `Pxx-S<nn>` added (additive) |
| Guide | `guides/<Pxx>.json` | `track/<bandId>/<Pxx>/guide` | Pxx kept |
| Assessment | lesson `formative` | stays embedded in the lesson | n/a |
| Source | `extracted/<comp>.json`, `competencies.json` anchors | `source/<comp>/<principleId>` | principle ids kept (531) |
| Built bundles | `packages/web/academy*.json`, `packages/web-vercel/academy*.json` | generated mirrors, unchanged | built by `scripts/build_academy.py` |
| DB tracks | `learning_tracks.id`, `track_units.id` | unchanged | uuids kept |
| SPA hash routes | `#/tajweed`, `#/foundations`, `#/kids`, `#/academy`, ... | unchanged; new views are added, none removed | |

### 6.1 Programs: old address to new address

| Program | Old | New logical address | Primary domain (largest item share) |
|---|---|---|---|
| P01 خطواتي الأولى | `programs.json` programs[0]; `sessions/P01.json`; `guides/P01.json` | `track/b1/P01` | C الخلق والقيم (16 of 24 items) |
| P02 أضبط نفسي وأسأل وأحفظ | `programs.json` programs[1]; `sessions/P02.json`; `guides/P02.json` | `track/b1/P02` | S إدارة الذات (19 of 25 items) |
| P03 صدقي وأمانتي وبرّي | `programs.json` programs[2]; `sessions/P03.json`; `guides/P03.json` | `track/b1/P03` | C الخلق والقيم (15 of 20 items) |
| P04 أرحم وأعدل وأتواضع وأشكر | `programs.json` programs[3]; `sessions/P04.json`; `guides/P04.json` | `track/b1/P04` | C الخلق والقيم (20 of 20 items) |
| P05 أسمع وأتكلم وأصاحب | `programs.json` programs[4]; `sessions/P05.json`; `guides/P05.json` | `track/b1/P05` | R العلاقات والأسرة (32 of 36 items) |
| P06 أتثبّت قبل أن أصدّق | `programs.json` programs[5]; `sessions/P06.json`; `guides/P06.json` | `track/b2/P06` | K المعرفة والفهم (10 of 20 items) |
| P07 أتعلّم كيف أتعامل مع غضبي | `programs.json` programs[6]; `sessions/P07.json`; `guides/P07.json` | `track/b2/P07` | S إدارة الذات (18 of 18 items) |
| P08 أصدقائي وخلافاتي | `programs.json` programs[7]; `sessions/P08.json`; `guides/P08.json` | `track/b2/P08` | R العلاقات والأسرة (14 of 23 items) |
| P09 أميّز وأستدل وأبحث | `programs.json` programs[8]; `sessions/P09.json`; `guides/P09.json` | `track/b8/P09` | T التفكير والتعلّم (13 of 20 items) |
| P10 أقرر بالشورى | `programs.json` programs[9]; `sessions/P10.json`; `guides/P10.json` | `track/b3/P10` | T التفكير والتعلّم (13 of 26 items) |
| P11 مالي ومبادرتي | `programs.json` programs[10]; `sessions/P11.json`; `guides/P11.json` | `track/b3/P11` | W العمل والحياة الاقتصادية (12 of 15 items) |
| P12 أمانة العمل والعهد | `programs.json` programs[11]; `sessions/P12.json`; `guides/P12.json` | `track/b6/P12` | W العمل والحياة الاقتصادية (13 of 13 items) |
| P13 قائد ومرشد ناشئ | `programs.json` programs[12]; `sessions/P13.json`; `guides/P13.json` | `track/b7/P13` | M التعليم والإرشاد (20 of 30 items) |
| P14 المسؤولية العامة والتقييم العادل | `programs.json` programs[13]; `sessions/P14.json`; `guides/P14.json` | `track/b4/P14` | M التعليم والإرشاد (10 of 16 items) |
| P15 نحو بيت مستقر | `programs.json` programs[14]; `sessions/P15.json`; `guides/P15.json` | `track/b5/P15` | R العلاقات والأسرة (5 of 5 items) |
| P16 تربية أبنائي | `programs.json` programs[15]; `sessions/P16.json`; `guides/P16.json` | `track/b5/P16` | R العلاقات والأسرة (5 of 5 items) |
| P17 أرحم وأشكر وأسمع قصص السيرة | `programs.json` programs[16]; `sessions/P17.json`; `guides/P17.json` | `track/b1/P17` | C الخلق والقيم (9 of 15 items) |
| P18 أسمع بهدوء وأرتّب يومي | `programs.json` programs[17]; `sessions/P18.json`; `guides/P18.json` | `track/b1/P18` | S إدارة الذات (16 of 32 items) |
| P19 أمانتي ومثابرتي وأسئلتي وكلامي اللطيف | `programs.json` programs[18]; `sessions/P19.json`; `guides/P19.json` | `track/b1/P19` | S إدارة الذات (10 of 33 items) |
| P20 نواة القرآن للصغار: إصغاء وأدب وتعلّم | `programs.json` programs[19]; `sessions/P20.json`; `guides/P20.json` | `track/b2/P20` | Q نواة القرآن (12 of 17 items) |
| P21 الحفظ المنهجي والتدبّر وأثري الخاص | `programs.json` programs[20]; `sessions/P21.json`; `guides/P21.json` | `track/b2/P21` | Q نواة القرآن (12 of 19 items) |
| P22 السيرة والشمائل والآداب والمسؤولية | `programs.json` programs[21]; `sessions/P22.json`; `guides/P22.json` | `track/b2/P22` | H المعرفة النبوية (25 of 37 items) |
| P23 علوم القرآن والقراءات وتوثيق الأخبار | `programs.json` programs[22]; `sessions/P23.json`; `guides/P23.json` | `track/b3/P23` | Q نواة القرآن (13 of 19 items) |
| P24 العمل والمعرفة والمهارات اليومية | `programs.json` programs[23]; `sessions/P24.json`; `guides/P24.json` | `track/b4/P24` | T التفكير والتعلّم (19 of 38 items) |
| P25 أرتّب يومي وأراجع نفسي | `programs.json` programs[24]; `sessions/P25.json`; `guides/P25.json` | `track/b2/P25` | S إدارة الذات (6 of 6 items) |

### 6.2 Units: old address to new address (home program = program holding the most items)

| Unit | Old file | New library address | Home program | Also referenced by |
|---|---|---|---|---|
| AG-A | `lessons/lessons_AG1.json` | `library/S/S5/AG-A` | P07 | - |
| AG-B | `lessons/lessons_AG2.json` | `library/S/S5/AG-B` | P07 | - |
| AG-C | `lessons/lessons_AG3.json` | `library/S/S5/AG-C` | P07 | - |
| E1-A | `lessons/lessons_E1.json` | `library/K/K4/E1-A` | P01 | P02 |
| E10-A | `lessons/lessons_E10.json` | `library/K/K4/E10-A` | P18 | - |
| E11-A | `lessons/lessons_E11.json` | `library/C/C2/E11-A` | P19 | - |
| E12-A | `lessons/lessons_E12.json` | `library/C/C6/E12-A` | P01 | - |
| E13-A | `lessons/lessons_E13.json` | `library/R/R2/E13-A` | P05 | - |
| E14-A | `lessons/lessons_E14.json` | `library/S/S2/E14-A` | P10 | - |
| E15-A | `lessons/lessons_E15.json` | `library/M/M1/E15-A` | P13 | - |
| E16-A | `lessons/lessons_E16.json` | `library/S/S4/E16-A` | P02 | - |
| E17-A | `lessons/lessons_E17.json` | `library/K/K4/E17-A` | P18 | - |
| E18-A | `lessons/lessons_E18.json` | `library/S/S4/E18-A` | P19 | - |
| E19-A | `lessons/lessons_E19.json` | `library/R/R2/E19-A` | P19 | - |
| E2-A | `lessons/lessons_E2.json` | `library/C/C1/E2-A` | P03 | - |
| E20-A | `lessons/lessons_E20.json` | `library/S/S3/E20-A` | P18 | - |
| E21-A | `lessons/lessons_E21.json` | `library/H/H2/E21-A` | P22 | - |
| E22-A | `lessons/lessons_E22.json` | `library/T/T4/E22-A` | P24 | - |
| E3-A | `lessons/lessons_E3.json` | `library/C/C3/E3-A` | P04 | - |
| E4-A | `lessons/lessons_E4.json` | `library/R/R1/E4-A` | P05 | - |
| E5-A | `lessons/lessons_E5.json` | `library/C/C3/E5-A` | P01 | - |
| E6-A | `lessons/lessons_E6.json` | `library/S/S5/E6-A` | P02 | - |
| E7-A | `lessons/lessons_E7.json` | `library/R/R5/E7-A` | P05 | - |
| E8-A | `lessons/lessons_E8.json` | `library/T/T5/E8-A` | P10 | - |
| E9-A | `lessons/lessons_E9.json` | `library/M/M2/E9-A` | P13 | - |
| K1 | `lessons/lessons_G1.json` | `library/K/K1/K1` | P06 | - |
| K2 | `lessons/lessons_G1.json` | `library/K/K2/K2` | P06 | - |
| K3 | `lessons/lessons_G1.json` | `library/K/K3/K3` | P09 | - |
| K4 | `lessons/lessons_G1.json` | `library/K/K4/K4` | P02 | P21, P01 |
| T1 | `lessons/lessons_G1.json` | `library/T/T1/T1` | P02 | P08, P05 |
| C1 | `lessons/lessons_G2.json` | `library/C/C1/C1` | P03 | P08 |
| C2 | `lessons/lessons_G2.json` | `library/C/C2/C2` | P03 | - |
| C3 | `lessons/lessons_G2.json` | `library/C/C3/C3` | P04 | P01 |
| C4 | `lessons/lessons_G2.json` | `library/C/C4/C4` | P04 | P08 |
| C5 | `lessons/lessons_G2.json` | `library/C/C5/C5` | P04 | P08 |
| C6 | `lessons/lessons_G2.json` | `library/C/C6/C6` | P04 | P01 |
| S1 | `lessons/lessons_G3.json` | `library/S/S1/S1` | P25 | P10 |
| S2 | `lessons/lessons_G3.json` | `library/S/S2/S2` | P25 | P10 |
| S3 | `lessons/lessons_G3.json` | `library/S/S3/S3` | P18 | - |
| S4 | `lessons/lessons_G3.json` | `library/S/S4/S4` | P02 | - |
| S5 | `lessons/lessons_G3.json` | `library/S/S5/S5` | P02 | P07 |
| S6 | `lessons/lessons_G3.json` | `library/S/S6/S6` | P05 | P07 |
| T2 | `lessons/lessons_G4.json` | `library/T/T2/T2` | P06 | P09 |
| T3 | `lessons/lessons_G4.json` | `library/T/T3/T3` | P09 | P13 |
| T4 | `lessons/lessons_G4.json` | `library/T/T4/T4` | P10 | P13 |
| T5 | `lessons/lessons_G4.json` | `library/T/T5/T5` | P06 | P10 |
| T6 | `lessons/lessons_G4.json` | `library/T/T6/T6` | P09 | P13 |
| R1 | `lessons/lessons_G5.json` | `library/R/R1/R1` | P05 | - |
| R2 | `lessons/lessons_G5.json` | `library/R/R2/R2` | P05 | P08 |
| R3 | `lessons/lessons_G5.json` | `library/R/R3/R3` | P08 | P11 |
| R4 | `lessons/lessons_G5.json` | `library/R/R4/R4` | P03 | P08 |
| R5 | `lessons/lessons_G6.json` | `library/R/R5/R5` | P05 | P08 |
| R6 | `lessons/lessons_G6.json` | `library/R/R6/R6` | P15 | - |
| R7 | `lessons/lessons_G6.json` | `library/R/R7/R7` | P16 | - |
| W1 | `lessons/lessons_G6.json` | `library/W/W1/W1` | P12 | - |
| W2 | `lessons/lessons_G7.json` | `library/W/W2/W2` | P11 | - |
| W3 | `lessons/lessons_G7.json` | `library/W/W3/W3` | P12 | - |
| W4 | `lessons/lessons_G7.json` | `library/W/W4/W4` | P11 | - |
| L1 | `lessons/lessons_G7.json` | `library/L/L1/L1` | P10 | P13 |
| L2 | `lessons/lessons_G7.json` | `library/L/L2/L2` | P13 | - |
| L3 | `lessons/lessons_G8.json` | `library/L/L3/L3` | P14 | - |
| L4 | `lessons/lessons_G8.json` | `library/L/L4/L4` | P08 | P11 |
| M1 | `lessons/lessons_G8.json` | `library/M/M1/M1` | P13 | P14 |
| M2 | `lessons/lessons_G8.json` | `library/M/M2/M2` | P13 | P14 |
| M3 | `lessons/lessons_G8.json` | `library/M/M3/M3` | P14 | - |
| H1 | `lessons/lessons_H1.json` | `library/H/H1/H1` | P22 | - |
| H2 | `lessons/lessons_H2.json` | `library/H/H2/H2` | P22 | - |
| H3 | `lessons/lessons_H3.json` | `library/H/H3/H3` | P22 | - |
| H4 | `lessons/lessons_H4.json` | `library/H/H4/H4` | P23 | - |
| H5 | `lessons/lessons_H5.json` | `library/H/H5/H5` | P17 | - |
| Q1 | `lessons/lessons_Q1.json` | `library/Q/Q1/Q1` | P20 | - |
| Q2 | `lessons/lessons_Q2.json` | `library/Q/Q2/Q2` | P20 | - |
| Q3 | `lessons/lessons_Q3.json` | `library/Q/Q3/Q3` | P21 | - |
| Q4 | `lessons/lessons_Q4.json` | `library/Q/Q4/Q4` | P21 | - |
| Q5 | `lessons/lessons_Q5.json` | `library/Q/Q5/Q5` | P23 | - |
| Q6 | `lessons/lessons_Q6.json` | `library/Q/Q6/Q6` | P23 | - |
| X1-A | `lessons/lessons_X1.json` | `library/W/W2/X1-A` | P24 | - |
| X1-B | `lessons/lessons_X1.json` | `library/W/W3/X1-B` | P24 | - |
| X2-A | `lessons/lessons_X2.json` | `library/T/T6/X2-A` | P24 | - |
| X2-B | `lessons/lessons_X2.json` | `library/K/K3/X2-B` | P24 | - |
| X3-A | `lessons/lessons_X3.json` | `library/K/K4/X3-A` | P20 | - |
| X3-B | `lessons/lessons_X3.json` | `library/K/K4/X3-B` | P21 | - |
| X4-A | `lessons/lessons_X4.json` | `library/S/S3/X4-A` | P18 | - |
| X4-B | `lessons/lessons_X4.json` | `library/S/S2/X4-B` | P22 | - |
| X5-A | `lessons/lessons_X5.json` | `library/C/X5/X5-A` | P22 | - |
| Y1-A | `lessons/lessons_Y1.json` | `library/C/C3/Y1-A` | P17 | - |
| Y1-B | `lessons/lessons_Y1.json` | `library/C/C6/Y1-B` | P17 | - |
| Y1-C | `lessons/lessons_Y1.json` | `library/K/K4/Y1-C` | P01 | - |
| Y1-D | `lessons/lessons_Y1.json` | `library/R/R1/Y1-D` | P18 | - |
| Y2-A | `lessons/lessons_Y2.json` | `library/C/C2/Y2-A` | P19 | - |
| Y2-B | `lessons/lessons_Y2.json` | `library/S/S4/Y2-B` | P19 | - |
| Y2-C | `lessons/lessons_Y2.json` | `library/T/T1/Y2-C` | P19 | - |
| Y2-D | `lessons/lessons_Y2.json` | `library/R/R2/Y2-D` | P19 | - |
| Z1-A | `lessons/lessons_Z1.json` | `library/S/S1/Z1-A` | P24 | - |
| Z1-B | `lessons/lessons_Z1.json` | `library/T/T5/Z1-B` | P24 | - |
| Z1-C | `lessons/lessons_Z1.json` | `library/T/T4/Z1-C` | P24 | - |

### 6.3 What to implement first (order, each step reversible)

1. Generate a read-only index (`library_index.json`) from the existing JSON; no file moves.
2. Add `Pxx-Snn` session ids and a domain/skill entry for the Quran-reading surfaces.
3. Reviewer-gated: regroup/re-age items flagged REORGANIZE/ADAPT in sections 3-4 (programs.json and sessions only).
4. Owner-gated: DB track archive, migrations 0017-0020, age-scheme alignment, reviewer appointments.

## 7. Owner decisions flagged (not made here)

| # | Decision | Why it is the owner's |
|---|---|---|
| D-01 | Archive the draft duplicate track adb0b936 (after backup) | data change in production DB |
| D-02 | Apply migrations 0017-0020 to the DB | production schema |
| D-03 | Appoint named reviewers (scholarly, pedagogical, child protection, child mental health, financial, legal, family counselling, political neutrality) | scholarly appointments; nothing may be published before |
| D-04 | Pacing: raise `duration_weeks`/rhythm or re-spread sessions (197 warnings; P18, P24, P19, P22 worst) | scope |
| D-05 | Age scheme: kids bands 4-6/7-10/11-14 vs academy bands 5-8/9-12/13-17; 24 off-age lessons (P24 Z1 x9) | product/pedagogy |
| D-06 | Whether X1-X4, AG3 extensions stay merged in programs pending review (their files say "before merge") | content/licence/safety |
| D-07 | Taxonomy: new domain/skill ids for tajweed, foundations, hifz, qira'at | structure |
| D-08 | Track-title uniqueness guard (new migration) | schema |

## 8. Reproduction

`python3 -I scripts/validate_programs.py`, `validate_sessions.py`, `validate_lessons.py`, `check_extracted_ids.py` (all read-only); counts in section 1 come from loading `programs.json`, `lessons/*.json`, `sessions/*.json`, `guides/*.json`, `extracted/*.json`, `competencies.json`; SPA counts from evaluating the constants in `packages/web/index.html`; DB rows from `qa/db_inventory_2026-11-05.json` and a read-only SELECT on 2026-11-05. Not examined: the deployed sites, content outside the repo other than that SELECT, and `scholarly-assets/_inputs` book text.
