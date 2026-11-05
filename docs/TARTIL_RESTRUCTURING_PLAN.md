# TARTIL_RESTRUCTURING_PLAN — target information architecture, migration and phases

Status: **DRAFT, unreviewed. Proposal only; nothing in this document has been applied.** Date: 2026-11-05. Directive: Master Prompt V3 (sections 1, 3–5, 9–11). Companion: `docs/TARTIL_TAKWEEN_REBUILD.md` (the formation paths). Siblings written the same day and consistent with this one: `TARTIL_EXISTING_CONTENT_INVENTORY.md`, `TARTIL_QURAN_CONTENT_REBUILD.md`, `TARTIL_ADAPTIVE_UX_DESIGN.md`, `TARTIL_LEARNING_RELATIONSHIPS.md`, `TARTIL_CONTENT_GOVERNANCE.md`, `TARTIL_CONTENT_GAP_ANALYSIS.md`.

No file other than this one and `TARTIL_TAKWEEN_REBUILD.md` was written; no code, data, migration or database row was touched; no commit was made. Every item of academy content stays `review_status: unreviewed`; this plan creates no approval and implies none. Language convention (CLAUDE.md): English prose, Arabic names and learner-facing labels.

Method: every number below was computed on 2026-11-05 from `docs/human-formation/programs.json`, `lessons/*.json`, `sessions/*.json`, `packages/web/index.html` (the copy in `packages/web-vercel/` differs only on line 6, verified with `diff`) and the DB snapshot `docs/human-formation/qa/db_inventory_2026-11-05.json` (read-only SELECT counts taken earlier today). The live site and the live database were not queried again.

## 0. Summary of the proposal

1. **The six-item navigation is valid** against what exists, with two conditions: «القرآن وعلومه» must absorb tajweed, foundations, qiraat and the three Quran-domain programs (P20, P21, P23) that today sit inside «التكوين»; and «الصغار والأسرة» must be an *audience lens* over programs that live elsewhere, not a second copy of them (§3).
2. **Five levels are enough** and all of them already exist in the data under other names: domain → track → program → unit (= stage) → session (§2). Only *track* and *domain* are missing as fields; both can be added without touching an id.
3. **Phases 1–3 need no database change.** The academy is static JSON (no academy row exists in the DB); progress is device-local and keyed by lesson/scenario id (§5, §6).
4. **Ids, slugs, routes and storage keys are frozen.** The migration is expressed as labels and links added around existing ids, never as renames or moves of items (§6).
5. **Eleven formation tracks cover all 22 formation programs exactly once**; three Quran programs and the non-program Quran features (reader, tajweed, foundations, qiraat, tasmi', hifz) form the Quran domain (§2.3–§2.4, and `TARTIL_TAKWEEN_REBUILD.md`).
6. **Seven phases**, each reversible, each with a test gate; the DB phase is an owner decision and comes last (§7).

## 1. What really exists (evidence base)

### 1.1 Numbers (computed)

| Item | Count | Source |
|---|---|---|
| Programs | 25 (P01–P25; 22 formation + 3 Quran-domain) | `programs.json` |
| Age bands in `programs.json` | 8 (`b1`–`b8`); loaded by the UI into `AC.B` but **never read** | `programs.json`, `index.html` |
| Stages (= target *units*) | 81 | `programs.json` |
| Items linked to programs | 532 = 347 lessons + 185 scenarios; 478 core + 54 `optional_link`; every ref appears in exactly one program, none orphaned | `programs.json`, `lessons/*.json` |
| Lesson-bank units (`unit_id` / competency groups, internal) | 96 in 52 files | `lessons/*.json` |
| Sessions | 532, one per item (optional-link items included) | `sessions/P*.json` |
| Guides | 25 (`for_guide`, `for_parent`, `faq`) | `guides/P*.json` |
| Competencies | 52 in 10 domains (Q H K C S T R W L M) | `competencies.json`, `academy.json` |
| Quran text in DB | 6,236 ayahs, 1 edition; 114 surah counts | DB snapshot |
| Academy content in DB | **none** (academy = static JSON built into `packages/web*/academy-*.json`) | DB snapshot, `acLoad` |
| `learning_tracks` / `track_units` | 2 / 20 — the two tracks are exact duplicates titled «أساسيات التجويد» (one `published`, one `draft`) | DB snapshot |
| Usage rows | institutions 3, memberships 5, users 7; halaqat 0, student_profiles 0, unit_progress 0, kid_profiles 0, homework_* 0 | DB snapshot |
| Migrations written but **not applied** | 0017 (formation engines), 0018 (permission hardening), 0019 (`academy_progress`), 0020 (`academy_content_status`) | DB snapshot, migration headers |
| Validator baseline | `validate_coherence.py`: 1 error (P05 `S6`←`S1`), 213 warnings | run 2026-11-05 |

### 1.2 The UI surface today (`packages/web/index.html`, routes are hash routes)

| Surface | What it contains |
|---|---|
| Top navigation (`renderNav`) | الرئيسية، القرآن، بحث، التجويد، الأسس، الصغار، التكوين، القراءات; when signed in also رحلتي، لوحتي; for scholars also «المراجعة العلمية» (8 base + 2 + 1) |
| Bottom navigation (mobile) | 5 destinations: رحلتي (`#/me` or `#/plan`), تعلّم (`#/learn`), تدرّب (`#/practise`), استكشف (`#/quran`), حسابي (`#/app` or `#/auth`); each route maps to one of them via `BDEST` |
| Hub pages | `#/learn`: foundations, tajweed, kids, academy, qiraat, demo. `#/practise`: me/hifz, me/tasmi, me/quiz, me/map, foundations, kids |
| Footer | columns «تعلّم» (foundations, tajweed, kids, academy, qiraat), «استكشف» (home, quran, search, plan), «حسابي» (auth, me, app), plus a trust column |
| Landing (`landing`) | hero («رحلتك مع القرآن، من التعلّم إلى الإتقان»; page title «منصة تعلّم القرآن وإتقانه»), 10 «مجالات التعلّم» cards (`ECO`; only one is the academy), 5-step learner journey (`STAGES`: تعلّم، تدرّب، سمّع، تقيّم، أتقن), continue block |
| Routes (`route()`) | `quran`, `search`, `tajweed` (tabs makharij, sifat, ahkam, mudood, explore), `qiraat`, `review`, `me` (tabs today, tasmi, hifz, quiz, map, sanad), `learn`, `practise`, `foundations` (modes kids/adult/reg; letters, forms, harakat, syll, quiz), `plan`, `demo`, `kids` (bands a/b/c; activities), `academy`, `gallery`, `auth`, `verify`, `app` (sections overview, tracks, halaqat, homework, recitation, certs, assistant, people, admin), home |
| Academy routes (`academyView`) | `#/academy` (tabs: programs, competencies), `#/academy/p/<slug>` (+ `/guide`, `/parent`), `#/academy/l/<id>`, `#/academy/s/<id>`, `#/academy/c/<competency>`, `#/academy/review` (scholars only) |
| Academy grouping (`ACG`) | four client-side groups: **k** الصغار = `age_max ≤ 12` (13 programs), **t** الناشئة = `age_min ≥ 12 && age_max ≤ 17` (6), **y** الشباب = P12, P14, P24 (hard-coded ids), **f** الأسرة والمعلمون والقادة = P13, P15, P16 (hard-coded ids) |

### 1.3 Findings that drive the design

| # | Finding | Evidence |
|---|---|---|
| F1 | The academy mixes domains: three Quran programs (P20 نواة القرآن للصغار, P21 الحفظ والتدبّر, P23 علوم القرآن) appear on «أكاديمية التكوين» next to character programs and **not** under القرآن | `ACG` puts P20 in k, P21/P23 in t |
| F2 | There is no `domain`, `track` or `lens` field on programs. Grouping is computed from ages plus 6 hard-coded ids; a new program (P25 was added during 14.1) is only caught if its ages fit a rule | `ACG` rules; 14.1 redesign note on P25 |
| F3 | Three unrelated age-banding systems coexist: the academy groups (k/t/y/f), `programs.json` bands (b1–b8, unused), and the kids academy bands a/b/c (4–6, 7–10, 11–14). They disagree (e.g. P21 and P22, ages 12–17, are listed in band `b2` = 9–12) | `ACG`, `bands`, `KB` |
| F4 | The Quran learning features (reader, tajweed, foundations, quizzes, kids letters, hifz, tasmi', qiraat) are hard-coded in `index.html`, not in `programs.json`; they have no shared level order (`TARTIL_QURAN_CONTENT_REBUILD` §2) | routes above |
| F5 | The shipped `academy-sessions.json` (532 sessions) is **not fetched**: `acLoad` loads four files (`academy.json`, `-lessons`, `-programs`, `-guides`). The *session* level exists in data but not in the UI | `acLoad` |
| F6 | Progress is a per-item map `acx:<user\|guest>:done` plus a per-item notebook `acx:<ns>:ref:<id>`, both **device-local**; program/stage progress is derived. Therefore items can be regrouped without losing progress as long as ids stay | `acGet/acSet`, `acDone` |
| F7 | The word «مسار/track» means two things: curriculum paths (this plan) and `learning_tracks` (institution-authored, DB, kinds recitation/memorization/tajweed/review). 11 templates are built into the UI (`TEMPLATES`) | migration 0008; `TEMPLATES` |
| F8 | `prerequisites` (hard) and `next_programs` (soft) disagree: 45 soft edges, 30 hard edges; 24 soft edges are not mirrored by a hard one, 9 hard edges are not in `next_programs`; all 20 prerequisite lists use «أو ما يعادله» without a definition | computed |
| F9 | Visible copy is out of date: «الكفايات الأربعون» (52 exist); «المسارات الجاهزة الثمانية» (11 templates exist); the landing promise is Quran-only although V3 defines the platform as Quran + formation + practice + institutional support | `TARTIL_EXISTING_CONTENT_INVENTORY` §1.10, §2.1; `landing` |
| F10 | Sessions include `optional_link` items, so per-program session counts overstate load (e.g. P18: 32 sessions, 18 core) | computed |
| F11 | `academy_status_seed.json` is stale (24/255/136/24 vs 25/347/185/25) | inventory §1.10 |
| F12 | Institution side is complete as a dashboard (9 sections) but unused in data (0 halaqat, 0 students). V3 §11: develop it, do not rebuild it | DB snapshot; `SECTIONS` |

## 2. Target information architecture

### 2.1 Five levels, mapped to what already exists

| Level | Target meaning | Existing artefact (reuse) | New? |
|---|---|---|---|
| **Domain** | a top-level navigation destination | none (only the 10 *competency* domains Q H K C S T R W L M exist, which are a different thing) | new label set (5 destinations + home) |
| **Track** | an ordered family of programs with one learner-facing purpose | the implicit chains in `prerequisites`/`next_programs`; the 4 owner-named paths | new label per program (`track`), 11 formation tracks; Quran tracks follow the L0–L6 spine of `TARTIL_QURAN_CONTENT_REBUILD` §3 |
| **Program** | a bounded programme with outcomes, ages, rhythm, guide | `programs.json` entry `Pxx` (id, slug, title, band, ages, status, promise, outcomes, competencies, rhythm, prerequisites, next_programs, capstone, gating) | no |
| **Unit** | a stage inside a program (weeks, purpose, items, mission, check) | `stages[]` (`P25-A`…), 81 in total. The 96 lesson-bank "units" (`E1-A`, `S1`, `AG-A`…) are an authoring grouping, not a learner level; they stay internal | no (naming only) |
| **Session** | one sitting, with components and optional homework | `sessions/Pxx.json` records, one per item, each pointing to its stage | no (UI must start fetching it) |
| (item) | lesson or scenario | `S1-L1`, `S1-S1`… (347 + 185); the competency (52) is a cross-cutting tag | no |

Rules: (a) every program has **exactly one canonical home** (domain + track); other places link to it with the same URL; (b) items are never copied between programs (links with `role: optional_link` only, as the 14.1 redesign already does for 54 items); (c) no empty track is created for symmetry (V3 §6.2); (d) existing titles stay (V3 §1); (e) competencies tag items and programs but do not define navigation.

### 2.2 Domains = navigation

| Nav (Arabic) | Domain | Contains (existing) | Real state today |
|---|---|---|---|
| الرئيسية | home | landing: value proposition, continue block, entry cards | exists; copy is Quran-only |
| القرآن وعلومه | Quran and its sciences | reader `#/quran`, search `#/search`, tajweed (5 tabs + 4 quiz sets), foundations (letters, forms, harakat, syllables, quiz), qiraat and sanad, tasmi', hifz, plan; programs P20, P21, P23 | Text is real (6,236 ayahs); teaching content is draft/AI-authored and unreviewed |
| مسارات التكوين | Formation | the 22 formation programs in 11 tracks (§2.3); competencies page; guides | exists as `#/academy`; all draft |
| الصغار والأسرة | audience lens | kids academy `#/kids` (bands a/b/c; letters activities), programs with `age_max ≤ 12`, family programs P15/P16 (adults, gated), parent guides | two unconnected systems; adult programs gated |
| المؤسسات | Institutions | `#/app` (9 sections), `#/review` for scholars, `#/verify` for certificates; P13 as a teacher/mentor link | exists; 3 institutions, no halaqat |
| رحلتي | Learner space | `#/me` (today, tasmi, hifz, quiz, map, sanad), `#/plan`, academy continue/"next step" | exists; academy progress not shown here |

### 2.3 Tracks (all derived from existing programs; none empty)

Formation tracks (details, item ids, sessions, assessments and gaps for each are in `TARTIL_TAKWEEN_REBUILD.md`):

| Track | Label | Programs | Ages |
|---|---|---|---|
| TW-1 | أراجع يومي | P25 | 10–12 |
| TW-2 | أضبط غضبي وأصلح | P02 → P07 | 7–12 |
| TW-3 | أصدقائي وخلافاتي | P05 → P08 | 8–12 |
| TW-4 | أقرر بالشورى | P10 | 14–17 |
| TW-5 | القيم الأولى | P01 → P17 → P03 → P04 | 5–8 |
| TW-6 | العادات والمثابرة | P18 → P19 | 7–8 |
| TW-7 | أتثبّت وأستدل وأبحث | P06 → P09 | 11–17 |
| TW-8 | المال والعمل والمبادرة | P11 → P12 → P24 | 15+ |
| TW-9 | القيادة والإرشاد | P13 → P14 | 16+ |
| TW-10 | الأسرة والوالدية | P15 → P16 | 18+ |
| TW-11 | السيرة والشمائل والآداب | P22 | 12–17 |

Quran tracks: no new labels are invented here. They follow the level spine proposed in `TARTIL_QURAN_CONTENT_REBUILD` §3 (L0 readiness, L1 reading, L2 tajweed, L3 hifz and review, L4 meaning and tadabbur, L5 sciences, L6 matn). Program placement: **P20** → L1–L2 (Q1, Q2), **P21** → L3–L4 (Q3, Q4), **P23** → L5 (Q5, Q6). L0, L1–L2 and L6 are mostly *features* (foundations, reader, tajweed) rather than programs; a track page for them lists features, not programs.

### 2.4 Program → domain, track, lens (all 25; ids unchanged)

| Program | slug | Stages | Core items | Ages | status | Domain | Track | Audience lens (link only) |
|---|---|---|---|---|---|---|---|---|
| P01 خطواتي الأولى | `khutwati-al-ula` | 2 | 20 | 5–7 | planned | مسارات التكوين | TW-5 القيم الأولى | الصغار والأسرة |
| P02 أضبط نفسي وأسأل وأحفظ | `adbut-nafsi` | 3 | 21 | 7–8 | planned | مسارات التكوين | TW-2 أضبط غضبي وأصلح | الصغار والأسرة |
| P03 صدقي وأمانتي وبرّي | `sidqi-wa-amanati` | 3 | 20 | 8 | planned | مسارات التكوين | TW-5 القيم الأولى | الصغار والأسرة |
| P04 أرحم وأعدل وأتواضع وأشكر | `arham-wa-aadil` | 4 | 20 | 8 | planned | مسارات التكوين | TW-5 القيم الأولى | الصغار والأسرة |
| P05 أسمع وأتكلم وأصاحب | `asma-watakallam` | 4 | 32 | 8 | planned | مسارات التكوين | TW-3 أصدقائي وخلافاتي | الصغار والأسرة |
| P06 أتثبّت قبل أن أصدّق | `atathabbat` | 4 | 20 | 11–12 | pilot | مسارات التكوين | TW-7 أتثبّت وأستدل وأبحث | الصغار والأسرة |
| P07 أتعلّم كيف أتعامل مع غضبي | `adbut-ghadabi` | 6 | 18 | 10–12 | pilot | مسارات التكوين | TW-2 أضبط غضبي وأصلح | الصغار والأسرة |
| P08 أصدقائي وخلافاتي | `asdiqai-wa-khilafati` | 4 | 22 | 11–12 | planned | مسارات التكوين | TW-3 أصدقائي وخلافاتي | الصغار والأسرة |
| P09 أميّز وأستدل وأبحث | `abhath-wa-astadill` | 3 | 20 | 14–17 | planned | مسارات التكوين | TW-7 أتثبّت وأستدل وأبحث | — |
| P10 أقرر بالشورى | `aqarrir-bishura` | 3 | 24 | 14–17 | planned | مسارات التكوين | TW-4 أقرر بالشورى | — |
| P11 مالي ومبادرتي | `mali-wa-mubadarati` | 3 | 15 | 15–17 | planned | مسارات التكوين | TW-8 المال والعمل والمبادرة | — |
| P12 أمانة العمل والعهد | `amanat-al-amal` | 2 | 13 | 16+ | planned | مسارات التكوين | TW-8 المال والعمل والمبادرة | — |
| P13 قائد ومرشد ناشئ | `mursid-naashi` | 3 | 24 | 16+ | planned | مسارات التكوين | TW-9 القيادة والإرشاد | المؤسسات (معلم/مرشد، مقترح) |
| P14 المسؤولية العامة والتقييم العادل | `hawkama-wa-taqyim` | 3 | 16 | 18+ | planned | مسارات التكوين | TW-9 القيادة والإرشاد | — |
| P15 نحو بيت مستقر | `nahwa-bayt-mustaqir` | 2 | 5 | 18+ | adults_gated | مسارات التكوين | TW-10 الأسرة والوالدية | الصغار والأسرة (أسرة، للبالغين) |
| P16 تربية أبنائي | `tarbiyat-abnai` | 2 | 5 | 20+ | adults_gated | مسارات التكوين | TW-10 الأسرة والوالدية | الصغار والأسرة (أسرة، للبالغين) |
| P17 أرحم وأشكر وأسمع قصص السيرة | `rahma-shukr-qissas` | 3 | 15 | 6–8 | planned | مسارات التكوين | TW-5 القيم الأولى | الصغار والأسرة |
| P18 أسمع بهدوء وأرتّب يومي | `sakina-istigha-wa-adat` | 4 | 18 | 7–8 | planned | مسارات التكوين | TW-6 العادات والمثابرة | الصغار والأسرة |
| P19 أمانتي ومثابرتي وأسئلتي وكلامي اللطيف | `amana-wa-muthabara` | 4 | 24 | 8 | planned | مسارات التكوين | TW-6 العادات والمثابرة | الصغار والأسرة |
| P20 نواة القرآن للصغار: إصغاء وأدب وتعلّم | `nawat-al-quran-sighar` | 3 | 17 | 9–12 | planned | القرآن وعلومه | QR (L1–L2) | الصغار والأسرة |
| P21 الحفظ المنهجي والتدبّر وأثري الخاص | `hifz-wa-tadabbur` | 3 | 19 | 12–17 | pilot | القرآن وعلومه | QR (L3–L4) | — |
| P22 السيرة والشمائل والآداب والمسؤولية | `sira-shamail-adab` | 5 | 31 | 12–17 | pilot | مسارات التكوين | TW-11 السيرة والشمائل والآداب | — |
| P23 علوم القرآن والقراءات وتوثيق الأخبار | `uloom-quran-wa-tawthiq` | 3 | 19 | 15–17 | pilot | القرآن وعلومه | QR (L5) | — |
| P24 العمل والمعرفة والمهارات اليومية | `amal-ma3rifa-maharat` | 3 | 34 | 18+ | pilot | مسارات التكوين | TW-8 المال والعمل والمبادرة | — |
| P25 أرتّب يومي وأراجع نفسي | `arattib-yawmi` | 2 | 6 | 10–12 | pilot | مسارات التكوين | TW-1 أراجع يومي | الصغار والأسرة |

Notes: P13 «قائد ومرشد ناشئ» is canonical in formation (TW-9) but is linked from المؤسسات because its band `b7` interface is «طلابي، برامجي، التقييم» (teachers and mentors). Today it is grouped with the family programs (`ACG` group f), which is the wrong audience; the lens column corrects that without moving the program. P15 and P16 are `adults_only`/`adults_gated` and deferred by policy; the lens must hide them from student and minor accounts exactly as `acGated` does today.

### 2.5 Units and sessions

- **Unit = stage.** Keep `P25-A` etc. as the unit id. Learner label = the stage `title` ("أراجع يومي" is literally P25-A). Unit page: purpose, the items in order, the stage mission (out-of-session, private, optional), the `check` (descriptive), and links to its sessions.
- **Session = existing session record.** Display per V3 §9 by content type (formation session, Quran lesson, tajweed lesson, child activity, mentor session), using the adaptive components described in `TARTIL_ADAPTIVE_UX_DESIGN.md`; no single card template.
- Optional-link items keep their sessions but are excluded from pacing and completion counts (F10).

## 3. Navigation proposal verified against what exists

### 3.1 Verification

| Proposed item | Exists today as | Verdict | Condition / change |
|---|---|---|---|
| الرئيسية | `#/` landing | **Fits** | Rewrite the value proposition to V3 (Quran and its sciences + building the person + practice and impact + institutional support). Today 1 of 10 cards is the academy. Fix stale numbers in copy |
| القرآن وعلومه | `#/quran`, `#/search`, `#/tajweed/*`, `#/foundations`, `#/qiraat`, `#/me/tasmi`, `#/me/hifz`, `#/plan`; programs P20/P21/P23 | **Fits, needs a hub** | Add a hub (reuse `hubView`) ordered by the level spine; move P20/P21/P23 here (link, same URLs); show status chips «قيد المراجعة» because teaching content is unreviewed; Quran text itself is untouched |
| مسارات التكوين | `#/academy` (22 formation + 3 Quran programs) | **Fits strongly** | Replace the `ACG` age groups by tracks (data-driven); keep the flat list and competencies tab; show applied goal of each track (V3 §10: visible, practical goals) |
| الصغار والأسرة | `#/kids` (letters activities, bands a/b/c, device-local) + academy programs with `age_max ≤ 12` + P15/P16 + parent guides | **Fits as a lens, not a store** | One entry page that routes by age to existing content; never duplicates programs; adult programs stay gated; uses the child-safe wording («اختر الفئة» is a convenience, not a diagnosis) |
| المؤسسات | `#/app` (9 sections), `#/review`, `#/verify` | **Fits** | Hub page for guests explaining what an institution gets; signed-in members land on `#/app`; link P13 and the guides for teachers |
| رحلتي | `#/me` (6 tabs), `#/plan` | **Fits, needs the academy** | Add "continue in formation" (next core item per program from the device-local `done` map) to the «اليوم» tab; keep the real privacy statement |

Overall: the six names are suitable for the actual contents. Nothing in the repository contradicts them; the changes are about *where existing things are listed*.

### 3.2 Old entry → new home (no route is removed)

| Today (top nav / bottom nav / footer) | After |
|---|---|
| الرئيسية | الرئيسية |
| القرآن (`#/quran`) | القرآن وعلومه → المصحف |
| بحث (`#/search`) | search field in the header (utility, not a destination); route unchanged |
| التجويد (`#/tajweed`) | القرآن وعلومه → التجويد |
| الأسس (`#/foundations`) | القرآن وعلومه → الأسس (also linked from الصغار والأسرة) |
| القراءات (`#/qiraat`) | القرآن وعلومه → القراءات والإسناد |
| الصغار (`#/kids`) | الصغار والأسرة |
| التكوين (`#/academy`) | مسارات التكوين |
| رحلتي (`#/me`), خطتي (`#/plan`) | رحلتي |
| لوحتي (`#/app`) | المؤسسات |
| المراجعة العلمية (`#/review`) | المؤسسات (role-gated, scholars only) |
| تعلّم (`#/learn`), تدرّب (`#/practise`) hubs | kept as aliases; their lists are regenerated from the domains (practise items belong to القرآن وعلومه and رحلتي) |
| `#/demo`, `#/gallery` | not in navigation (developer/demo pages); routes kept |
| `#/verify` | footer + المؤسسات |
| `#/auth` | header button |

### 3.3 Mobile

Today's bottom bar has five destinations and no menu sheet. Six items fit a 360 px viewport only if labels stay short, and «الصغار والأسرة» is long. Recommendation (owner decision): desktop top bar = the six items; mobile bottom bar = five (الرئيسية، القرآن، التكوين، الصغار والأسرة، رحلتي) with المؤسسات reached from the account menu and the footer for members. Test at 360 px, RTL and LTR, with focus order and `aria-current`.

### 3.4 Visibility rules that must survive the move

- Student/minor accounts must not see adult-gated programs anywhere (`acGated`, `acAdultProg` = `age_min ≥ 16` or `adults_only`); the new lists must call the same function.
- Scholar-only pages stay role-gated.
- Anything under القرآن وعلومه that is unreviewed shows a status chip; nothing is presented as approved.
- No unsupervised adult–child contact and no real child data in dev/test (CLAUDE.md); the family lens must not add any messaging or sharing.
- Reports for teachers/guardians remain impossible until a consent model exists (progress is device-local; migration 0019 is unapplied).

## 4. Before / after structure

```
BEFORE (as built)                                    AFTER (proposal)
top nav: 8 entries (+2 signed-in, +1 scholars)       top nav: 6 domains
  القرآن | بحث | التجويد | الأسس | الصغار |             الرئيسية
  التكوين | القراءات | الرئيسية                          القرآن وعلومه  → hub (spine L0–L6)
bottom nav: رحلتي | تعلّم | تدرّب | استكشف | حسابي         المصحف · التجويد · الأسس · القراءات · تسميع/حفظ · P20 P21 P23
#/academy                                               مسارات التكوين → TW-1..TW-11
  groups by age (k/t/y/f, 4 groups, 6 hard-coded ids)     track → program → unit (stage) → session → item
  25 programs flat (Quran + formation mixed)           الصغار والأسرة → lens (age entry, P≤12, P15/P16, parent guides, #/kids)
  program page -> stages -> items (lesson/scenario)    المؤسسات → #/app (9 sections), review, verify, P13 link
sessions: shipped, never fetched                       رحلتي → today, tasmi, hifz, quiz, map, sanad, plan, continue-in-formation
bands b1–b8: loaded, never read                        sessions fetched and shown per unit; bands retired from UI or used as age filter
```

## 5. What changes where

### 5.1 UI only (no data, no DB)

| Change | Where |
|---|---|
| Six-item nav, header search, account menu | `renderNav`, `BNAV`, `BDEST` |
| Domain hubs (القرآن وعلومه, مسارات التكوين, الصغار والأسرة, المؤسسات) reusing `hubView` | new `HUBS` entries / route aliases |
| Landing copy and cards reordered by V3 value proposition; fix stale numbers («الأربعون», «الثمانية») | `landing`, `ECO`, `STAGES`, titles |
| Move P20/P21/P23 listings to the Quran hub (links) | `ACG` replaced by data-driven tracks in phase 2 |
| Footer columns regrouped | footer markup |
| Status chips on unreviewed content | existing `acDraft` pattern |
| Rendering sessions that are already shipped (needs a `fetch` of `/academy-sessions.json` — a UI change, no new data) | `acLoad`, `acProgram` |
| Both copies (`packages/web`, `packages/web-vercel`) edited identically; `diff` must show line 6 only | rule from `TARTIL_ADAPTIVE_UX_DESIGN` §0 |

### 5.2 Static data (additive, versioned, mirrored in both packages)

| Change | Detail |
|---|---|
| `track`, `domain`, `lens[]`, `display_order` on each program | 25 records; old UI ignores unknown fields (it reads `AC.P` as an array of objects) |
| A small tracks registry (`academy-tracks.json`: id, label, purpose, order, programs) | new file next to the other academy JSON; fetched by `acLoad` |
| `role` copied onto session records | so pacing can exclude optional items (F10) |
| `optional_link` additions proposed by `TARTIL_TAKWEEN_REBUILD` (for example `X4-B` items → P25-B) | only after reviewer approval; link, never move |
| Regenerate `academy_status_seed.json` before any import | owner decision; stale today |
| Validator: every program in exactly one track; item set, ids and slugs unchanged (hash of the sorted id list); lens ⊆ allowed values | new check in `scripts/` |

### 5.3 Database (none until the owner decides)

| Item | Position |
|---|---|
| Phases 1–3 | **No DB change.** Academy content is not in the DB |
| `learning_tracks` duplicates (two «أساسيات التجويد» rows) | Do **not** delete; needs backup and owner decision (CLAUDE.md; V3 §4.3). They are institution tracks, a different object from curriculum tracks |
| Migrations 0017–0020 | Written, tested in files, **not applied**. Applying is an owner decision, with backup and a preview branch first; they are append-only and must not be edited |
| `academy_progress` (0019) | stores ids and small structured facts only (no scores, no free text, no notebook); server-side progress needs explicit learner consent before any teacher/guardian view |
| `academy_content_status` (0020) | lifecycle per (`content_kind` ∈ program, lesson, scenario, guide; `content_ref`; version). **There is no `track`/`stage`/`session` kind**; tracks are display groupings and need no publication state. If ever needed, it is a new migration, not an edit |
| Edge `dist` | 13 API routes behind `packages/api/src` (inventory §7): rebuild/deploy is separate from this plan |

## 6. Migration maps (ids, progress, links preserved)

### 6.1 Invariants (checked by script before and after every phase)

1. The set of program ids (`P01`–`P25`), slugs, stage ids, lesson ids and scenario ids is identical (compare sorted lists / hashes).
2. Every lesson/scenario ref appears in exactly one program (today: 532 unique refs; zero orphans, zero duplicates).
3. No lesson text, `review_status`, program title, prerequisite or rhythm changes in phases 1–3.
4. Quran text and edition hashes are untouched (never part of this plan).
5. Every old hash route still resolves.
6. Storage keys are unchanged (§6.3).

### 6.2 Route map

| Old | New | Mechanism |
|---|---|---|
| `#/`, `#/quran*`, `#/search`, `#/tajweed*`, `#/foundations`, `#/qiraat`, `#/kids`, `#/plan`, `#/me*`, `#/app*`, `#/auth`, `#/verify`, `#/review`, `#/gallery`, `#/demo` | unchanged | no redirect needed; only the nav grouping changes |
| `#/learn`, `#/practise` | unchanged (aliases) | hub lists regenerated |
| `#/academy`, `#/academy/p/<slug>[/guide\|/parent]`, `#/academy/l/<id>`, `#/academy/s/<id>`, `#/academy/c/<id>`, `#/academy/review` | unchanged | permanent URLs; shared links and bookmarks keep working |
| (new) `#/learn/quran`, `#/learn/takween`, `#/family`, `#/institutions` | domain hubs | new top-level cases or `learn` sub-routes; `#/learn/takween` may simply render `#/academy` grouped by track |
| (new) `#/academy/t/<track>` | track page | `academyView` dispatches on `parts[1]`: `'t'` does not collide with `p`, `l`, `s`, `c`, `review` or any competency id (competency ids are `K1`, `S5`…) |
| (new) `#/academy/p/<slug>/<stageId>` | unit anchor | `acProgram(app,slug,sub)` already receives `sub`; today it reserves `guide` and `parent`; stage ids such as `P25-A` do not collide |

### 6.3 Storage-key map (nothing is renamed)

| Key | Holds | Keyed by | Effect of this plan |
|---|---|---|---|
| `acx:user:<id>:done` / `acx:guest:done` | map `{ref: 1}` of finished items | lesson and scenario ids | **Safe**: ids frozen; stage/program/track progress is derived, so regrouping cannot lose it |
| `acx:<ns>:ref:<id>` | private notebook text per item | item id | Safe; stays device-local |
| `acx_done`, `acx_ref_<id>` | legacy keys, read only as guest data | item id | Keep the legacy reader |
| `acx_seen` | first-visit flag | — | Keep |
| `kst` (kids), foundations state (`fdMode`), `store.last`, `theme` | other device-local state | their own | Untouched; the family lens only links to them. A future single profile object is a separate decision (`TARTIL_QURAN_CONTENT_REBUILD` §3) |

### 6.4 Program → track data map (shape of the additive fields)

```json
{ "id": "P25", "slug": "arattib-yawmi",
  "domain": "formation", "track": "TW-1", "display_order": 1,
  "lens": ["family"], "review_status": "unreviewed" }
```

The 25 rows of §2.4 are the complete map; each program gets exactly one `domain` and one `track`. `lens` values: `family` (age_max ≤ 12, P15, P16), `institution` (P13). Nothing is removed from any program; the new fields are metadata and carry `review_status: "unreviewed"`.

### 6.5 Items: link, never move

Relocations decided in the 14.1 redesign (`C4-L4`, `C4-S2`, `C5-L4` → P08; `K4-L3`, `K4-S2` → P21; `S1-*`, `S2-*` → P25; `C1-L4` as optional link) are the precedent: refs never change, so completion survives. Further connections (for example `X4-B` ↔ P25-B, `S5-L1/L2` and `S6-L1/L2` as compensating links for P07) are proposed in `TARTIL_TAKWEEN_REBUILD.md` as `role: optional_link` only; none is applied. Duplicate-looking items (for example `S2-L2` and `X4-L4`) are **not merged**: identity is not proven, and V3 §4.3 allows deletion only after proof, a backup and a progress check.

### 6.6 Database map

Nothing maps in phases 1–3. If a later phase mirrors track labels into the DB, the target is a new append-only migration with RLS, not an edit of 0008 (`learning_tracks`) or any applied migration; `app_user` stays non-owner, non-superuser, no BYPASSRLS.

### 6.7 Checks to run (existing tools plus two small scripts to add)

`python3 -I scripts/validate_programs.py`, `validate_lessons.py`, `validate_sessions.py`, `validate_completeness.py`, `validate_coherence.py` (baseline 1 error / 213 warnings — record it and compare, so noise does not hide a regression), `scripts/e2e_academy.mjs`, `npm test` in `packages/database`; to add: an id-set hash comparison (invariants 1–2) and a route-resolution test over the table in §6.2.

## 7. Phases

| Phase | Scope | Changes | Gate to exit | Rollback |
|---|---|---|---|---|
| **P0 Baseline** | no change | snapshot id lists and hashes of `programs.json`, `lessons/*.json`, `sessions/*.json`; record validator baseline; record route list; confirm both web copies differ only on line 6; DB backup is **not** needed (no DB step) | baseline file committed by the owner's process | — |
| **P1 Navigation and hubs (UI only)** | `index.html` in both packages | 6-item nav, header search, hubs, landing copy, footer, status chips, fix «الأربعون»/«الثمانية» | every route in §6.2 renders; mobile 360 px; RTL/LTR; a11y checks; `diff` = line 6; e2e script passes; no data file changed | revert the two files |
| **P2 Tracks as data (additive)** | `programs.json`, tracks registry, mirrored to packages, one validator | `domain`, `track`, `lens`, `display_order`; `ACG` replaced by track groups; P20/P21/P23 shown in Quran hub | invariants §6.1 hold; each program in exactly one track; old UI still loads the new JSON | remove added fields (old UI ignores them) |
| **P3 Units and sessions in the UI** | UI + fetch of existing file | unit pages; session list per stage; session view by type; optional items excluded from pacing (`role` copied to sessions) | the 532 sessions render; session counts per stage match; no data semantics changed | revert UI |
| **P4 Connections** | data, reviewed one by one | `optional_link` additions and relation records (see `TARTIL_LEARNING_RELATIONSHIPS`) | each link justified by meaning (not keywords) and reviewed; no item moved | remove links |
| **P5 Database (owner decision)** | migrations 0017–0020, edge deploy | apply on a preview branch with backup; regenerate seed; keep `learning_tracks` as is; server progress only with consent | tests in `packages/database/test`, RLS checks, advisors, no regression in tenant isolation | restore backup |
| **P6 Review and publication** | people and governance | appoint named reviewers (scholarly, pedagogical, child safety, child mental health where listed, financial/legal where listed); four distinct approvals per item (0020) | nothing public before approvals | unpublish |

Order matters: P1 can ship without P2; P2 does not need P3; P5 is independent and must not block the UI work.

## 8. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | The two web copies drift | change one, mirror, `diff` must show only line 6; same for the academy JSON |
| R2 | Progress lost by renamed ids | ids frozen; invariants script; progress is per item id |
| R3 | Broken bookmarks/shared links | all old routes kept; route test |
| R4 | Adult programs shown to minors when lists are regenerated | reuse `acGated`/`acAdultProg`; test with a student account |
| R5 | Programs listed in two lenses look duplicated or double-count | one canonical URL; progress derived from ids; lens = link |
| R6 | «Track» confusion with DB `learning_tracks` | name curriculum tracks «مسارات التكوين» and keep institution tracks under المؤسسات → المسارات; never delete the duplicate rows without backup and owner decision |
| R7 | Navigation implies Quran content is finished/approved | status chips; copy says draft/unreviewed; Quran text edition-pinned and untouched |
| R8 | Six items crowd mobile | five-item bottom bar variant; 360 px test |
| R9 | Cached shell serves old UI | the service worker fetches the shell network-first, so low; still verify after deploy |
| R10 | Hard-coded id lists in `ACG` miss new programs | replace by data-driven tracks (P2) |
| R11 | Validator noise (213 warnings) masks regressions | compare against the recorded baseline, not against zero |
| R12 | Scope creep into new content for "empty" tracks | forbidden by rule (c) §2.1 and V3 §13; gaps go to the gap register |
| R13 | Privacy overstated | keep the real statement: progress and notebook live on this device; whoever uses the device may see them; no teacher/guardian visibility exists |
| R14 | Stale seed imported | regenerate `academy_status_seed.json` first (owner decision) |
| R15 | Single-school or sectarian framing creeping into hub copy | editorial line in CLAUDE.md (moderate mainstream, plural); no polemics; rulings stay with scholars |

## 9. Decisions and human review needed (none made here)

1. Approve the six names and the five-item mobile variant (§3.3).
2. Confirm that «الصغار والأسرة» is a lens over existing programs plus `#/kids`, and that P13 is linked from المؤسسات (not family).
3. Confirm track labels TW-1…TW-11 (display labels only; program titles unchanged), including the owner-named four.
4. Decide P07's learner-facing title (stored «أتعلّم كيف أتعامل مع غضبي» vs owner's «أضبط غضبي وأصلح») and confirm P25.
5. Decide the future of `learning_tracks` duplicates (backup first) and whether to apply 0017–0020 (and when).
6. Appoint reviewers; define «أو ما يعادله» as an ungraded readiness route.
7. Decide whether `#/gallery` and `#/demo` stay public.
8. Approve any `optional_link` additions one by one.

## 10. Limits of this plan

- Numbers are from repository files and the 2026-11-05 DB snapshot; the published site and live DB were not re-queried. The `ECO` card count (10) and nav lists come from reading `index.html`, not from running it.
- The track assignment of 22 programs is a proposal based on competencies, prerequisites and content; it needs pedagogical review. No program was renamed, split or merged.
- The Quran side is summarised only as far as navigation needs; its detailed level spine, gaps and licences are in `TARTIL_QURAN_CONTENT_REBUILD.md`.
- Nothing here is tested in a browser; it specifies tests for each phase.
