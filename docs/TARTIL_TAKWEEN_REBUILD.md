# TARTIL_TAKWEEN_REBUILD — rebuilding the takween (تكوين) paths from existing programs and units only

Status: **DRAFT, unreviewed. Proposal only.** Date: 2026-11-05. Companion: `docs/TARTIL_RESTRUCTURING_PLAN.md` (target information architecture and migration).
Scope: Master Prompt V3 §6 (rebuild formation paths from what exists). Nothing in `programs.json`, `lessons/*.json`, `sessions/*.json`, `packages/web*/index.html` or the database was changed by this document. No lesson, scenario, program or id was invented: every id below is read from `docs/human-formation/programs.json` and `docs/human-formation/lessons/*.json`. Every item stays `review_status: unreviewed`; nothing here is, or implies, scholarly, pedagogical, child-safety or mental-health approval.

Language convention (CLAUDE.md): prose in English; Arabic is kept for names and learner-facing labels.

## 0. Method, sources and rules

Sources read (counts are from scripts run on 2026-11-05, not estimates): `programs.json` (25 programs, 81 stages, 532 items = 347 lessons + 185 scenarios, every ref unique and resolvable), `lessons/*.json` (52 files, 96 lesson-bank units), `sessions/P01..P25.json` (532 sessions), `guides/P*.json` (25), `competencies.json` (52), `qa/coherence_audit.json` (2026-11-03, partly stale: it still describes the old P07), and a fresh run of `python3 -I scripts/validate_coherence.py --json` (1 error, 213 warnings).

Rules applied:
1. **Reuse before create.** A path is an ordered list of existing programs. A "unit" is an existing program stage (`P25-A`). A "session" is an existing `sessions/Pxx.json` record. No new lesson text is proposed.
2. **Gaps are flagged, not filled.** Anything the data cannot support is written as a gap for human review (V3 §13: put it in a documented gap list rather than invent material that looks complete).
3. **No numeric faith or moral scores.** Assessment is descriptive. The only grading vocabulary in the data is the three descriptors `ظهر / يتدرب / يحتاج_دعما` ("appeared / practising / needs support"); this document adds no score, rank, streak or percentage-of-faith of any kind. Percentages below are about *content time*, never about a learner.
4. **Paths do not rename programs.** V3 §1: do not rename programs for taste. A path is a display grouping; program titles, ids and slugs are untouched.
5. **Hard vs soft links.** `prerequisites` (free text such as "P05 أو ما يعادله") is the hard gate; `next_programs` is a soft suggestion. The two are not symmetric in the data (see G-01).

How the owner's four names map to real data (verified):

| Owner's name | What exists | Note |
|---|---|---|
| أراجع يومي | competency **S1** "المراقبة والمحاسبة الذاتية"; stage **P25-A** title; hosted by program **P25** «أرتّب يومي وأراجع نفسي» (`arattib-yawmi`) | P25 was created in the 14.1 redesign by splitting it out of P07 (items S1-*, S2-* moved; ids unchanged) |
| أضبط غضبي وأصلح | program **P07** (`adbut-ghadabi`, id/slug unchanged) | Its stored title is now «أتعلّم كيف أتعامل مع غضبي» (14.1 redesign: «أضبط» suggests suppression). The old title is kept here as the path label because the owner asked for it; whether to restore it is an owner decision (G-10) |
| أصدقائي وخلافاتي | program **P08** (`asdiqai-wa-khilafati`) | title unchanged |
| أقرر بالشورى | program **P10** (`aqarrir-bishura`) | title unchanged |

## 1. What "takween" contains in the data

Of 25 programs, **22 are takween** (character, self-management, relationships, thinking, work, leadership, family, seerah/adab) and **3 are Quran-domain** (`P20` نواة القرآن للصغار, `P21` الحفظ المنهجي والتدبّر, `P23` علوم القرآن والقراءات). The three Quran programs are reorganised in `docs/TARTIL_QURAN_CONTENT_REBUILD.md`; here they appear only as cross-links.

The 22 takween programs hold **72 stages, 423 core items (276 lessons + 147 scenarios) and 54 `optional_link` items** (optional links are shown in their stage but never count toward completion; see G-04). Competency domains touched (from `competencies.json`): C, H, K, L, M, R, S, T, W (9 of the 10 domains; the Quran domain Q appears only in P20/P21/P23). The digital-responsibility competency X5 belongs to domain C.

Eleven paths cover all 22 programs, each program exactly once (asserted when this document was generated):

| Path | Learner-facing label | Programs (in order) | Ages |
|---|---|---|---|
| TW-1 | أراجع يومي | P25 | 10–12 |
| TW-2 | أضبط غضبي وأصلح | P02 → P07 | 7–12 |
| TW-3 | أصدقائي وخلافاتي | P05 → P08 | 8–12 |
| TW-4 | أقرر بالشورى | P10 | 14–17 |
| TW-5 | القيم الأولى: الشكر والرحمة والصدق والأمانة والعدل والتواضع | P01 → P17 → P03 → P04 | 5–8 |
| TW-6 | العادات اليومية والمثابرة والأمانة اليومية | P18 → P19 | 7–8 |
| TW-7 | أتثبّت وأستدل وأبحث | P06 → P09 | 11–17 |
| TW-8 | المال والعمل والمبادرة | P11 → P12 → P24 | 15+ |
| TW-9 | القيادة والإرشاد والمسؤولية العامة | P13 → P14 | 16+ |
| TW-10 | الأسرة والوالدية (للبالغين) | P15 → P16 | 18+ |
| TW-11 | السيرة والشمائل والآداب والمسؤولية الرقمية | P22 | 12–17 |

Order inside a path follows `prerequisites` first, then age. Paths are not strict lines: several programs have two entry points (for example P01 and P17 have no prerequisite) and some downstream links are soft.

## 2. Common model used by every path

### 2.1 Hierarchy (maps to the target IA in the restructuring plan)

`domain (مسارات التكوين) → track (TW-n) → program (Pxx) → unit (stage Pxx-A…) → session (sessions/Pxx.json, one per item) → item (lesson or scenario, id such as S1-L1)`

Facts that constrain the model (verified):
- Sessions are **1:1 with items**: 532 sessions for 532 items. Each session has the components `intro`, `source_teaching` (not always), `interactive_practice`, `assessment` (only in 390 of 532 sessions: 347 embedded in the practice component, 43 stand-alone) and `reflection`. Optional homework is out of session and optional.
- Sessions **include the 54 optional-link items**. Counting sessions against the declared weeks therefore overstates load (for example P18: 32 sessions, 18 core). This document always reports **core** sessions and **core** minutes.
- Session lengths are 6–60 minutes and rarely equal to the declared rhythm; no session component carries a score.

### 2.2 Session rhythm

Rhythm is kept as declared in `programs.json` (`rhythm`, `duration_weeks`). The tables show, per program, declared slots (weeks × sessions per week), core sessions, and planned core minutes against declared minutes. Where they disagree the path flags a pacing gap; this document does not change a rhythm. A rule proposed for the pedagogical reviewer: **pace by core sessions** (weeks ≈ ceil(core sessions ÷ sessions per week)) and never fill a short session with unrelated material.

### 2.3 Learning model (V3 §6.4) mapped onto what sessions already contain

The model is used only where it fits; it is not forced on every session.

| V3 step | Where it already lives in the data |
|---|---|
| أفهم (understand) | `intro` component; lesson `hook`, `key_ideas`, `vocabulary` |
| أعي (grasp) | `source_teaching` component (where present); scenario premise |
| أتدرّب (practise) | `interactive_practice`; lesson `activities` (practice 269, story 208, discussion 164, reflection 163, game 127, scenario 53, project 39 in 347 lessons); scenario decisions with per-choice `feedback` (no scores) |
| أطبّق (apply) | stage `mission` and lesson `life_practice` (out of session, optional, private) |
| أتأمّل (reflect) | `reflection` component; scenario node `reflection`; mission `private_reflection` |
| أتحسّن (improve) | next session's opening and the next stage; capstone. There is **no** recap/spaced-return structure in the data for takween (the only item `role` value is `optional_link`) |

### 2.4 Assessment types (V3 §12): five different things, never merged

| Type | What it records | What already exists in the data | Gap |
|---|---|---|---|
| **Completion** | the learner finished an item or stage | per-item `done` flag (device-local `acx:<user>:done`); "next step" = first non-done core item; optional links excluded | none for the flag; no server copy (migration 0019 `academy_progress` is written but **not applied**) |
| **Knowledge** | the learner can state, tell apart or explain | clauses of the stage `check` that begin with verbs such as يسمّي / يفرّق / يذكر / يصف; lesson `key_ideas`, `vocabulary`; scenario `feedback` | **No stand-alone knowledge instrument** for takween (the only quizzes are 4 tajweed sets / 33 questions). Knowledge is observed, described with the 3 descriptors, never scored |
| **Skill** | the learner performs the skill in a guided task | `check` clauses beginning with verbs such as يصوغ / يخطط / يجرّب / يعيد / يقول; session `interactive_practice`; scenario decisions | observation only; descriptors `ظهر / يتدرب / يحتاج_دعما` in the session `assessment` component (and lesson `formative`, identical triple on all 347 lessons) |
| **Practice** | the learner applies the skill in their own life | stage `mission` (title, brief, `private_reflection`) and lesson `life_practice` | by design **not tracked and not reported**; private to the learner |
| **Evidence** | learner-owned artefacts that show continued improvement over time | program `capstone` (every one is private, learner-owned and deletable); device-local notebook `ref:<id>` | **No longitudinal evidence structure**: one device, no history, no share action. Any teacher/guardian view needs an explicit learner-granted, revocable share (the design stated in migration 0019's header) and is not built |

Clause classification in §3 (K / S / ?) is a deterministic keyword rule on the first verb of each existing `check` clause. It only sorts verbatim text; it is **a proposal for the pedagogical reviewer to confirm**, and `?` means unclassified. Nothing is reworded.

Reporting rule for all paths: reports may say "completed n of N core items" and show descriptors chosen by a human observer; they must not rank learners, compare learners, produce a trait score, infer religiosity or emotional state from usage, or expose a child's private notebook.

## 3. The paths

### TW-1 — أراجع يومي

*Daily self-review and time planning.* Programs reused (real ids): P25.

**Sequence, prerequisites, ages, rhythm**

| Program | slug | Title | Ages | status | Hard prerequisites (verbatim) | Soft `next_programs` | Declared rhythm | Core sessions | Planned core min / declared |
|---|---|---|---|---|---|---|---|---|---|
| P25 | `arattib-yawmi` | أرتّب يومي وأراجع نفسي | 10–12 | pilot | — | P07, P10, P22 | 4w × 2 × 25′ = 8 slots | 6 (4L+2S) | 121′ / 200′ (60%) |

**Why this order.** P25 has no prerequisite and is the shortest takween program (S1 then S2). It is the hard prerequisite of **P07** and **P22** ("P25 أو ما يعادله") and is listed by **P24** (hard) and by **P10** (soft, plus the optional links `S1-L3` and `S2-L3` inside P10-B). Thematic upstream (no edge in the data; ages 7–8): habit and place seeds in **P18-C/D** (`S3-L1..L3`, `X4-L1..L3`).

**Cross-links.** Downstream: P07 (hard), P22 (hard), P24 (hard), P10 (soft). Thematic upstream: P18 (no edge). Theme neighbour hosted elsewhere: unit `X4-B` (competency S2) inside **P22-D**: `X4-L4`, `X4-L5`, `X4-L6`, `X4-S3`, `X4-S4`.

**Units (stages), items and sessions reused**

**P25 — أرتّب يومي وأراجع نفسي** (`arattib-yawmi`)

| Stage (unit) | Weeks | Ref | Kind | Lesson-bank unit | Title | Ages | Session # | Min | Role |
|---|---|---|---|---|---|---|---|---|---|
| P25-A أراجع يومي | 1-2 | `S1-L1` | lesson | S1 | ماذا فعلتُ اليوم؟ | 10-12 | 1 | 25 | core |
| P25-A أراجع يومي | 1-2 | `S1-L2` | lesson | S1 | الفعل والنية | 10-12 | 2 | 25 | core |
| P25-A أراجع يومي | 1-2 | `S1-S1` | scenario | S1 | دفتر المساء | 10+ | 3 | 8 | core |
| P25-B أرتّب وقتي | 3-4 | `S2-L1` | lesson | S2 | الوقت محدود وأنا لست آلة | 10-12 | 4 | 25 | core |
| P25-B أرتّب وقتي | 3-4 | `S2-L2` | lesson | S2 | ما الأهم اليوم؟ | 10-12 | 5 | 30 | core |
| P25-B أرتّب وقتي | 3-4 | `S2-S1` | scenario | S2 | أسبوع مزدحم | 10+ | 6 | 8 | core |

**Assessments by type**

**P25 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P25-A | 3 items (3 with a session assessment component) | يصف ما فعله وما قصده دون أن يحكم على نفسه. | — | — | خمس دقائق في آخر اليوم: يصف المتعلم ما فعله في يومه ثلاثة أيام إن شاء، دون أن يحكم على نفسه، في دفتره الخاص. |
| P25-B | 3 items (3 with a session assessment component) | — | يخطط يومًا بثلاث مهام ووقت راحة؛ ويعدّل خطته بحسب طاقته دون لوم لنفسه. | — | يوم بثلاث مهام: يخطط المتعلم يومًا واحدًا بثلاث مهام ووقت راحة، ويجرّب تنفيذه بقدر ما يستطيع. |

Evidence (program level): capstone **خطة أسبوعي** — ورقة خاصة بالمتعلم يملكها ولا تُرسَل لأحد، ويحذفها متى شاء.


**Gaps flagged for human review**

- G-TW1-1 (CONNECT, reviewer decision): `X4-B` (S2, ages 10–14, evening routine / shared space / starting again) sits in P22-D although its competency is S2. The 14.1 audit already lists these ids as candidate additions to P25. Proposal: add them to P25-B as `role: optional_link` (no copy, no move), only after the pedagogical reviewer confirms. The same audit notes `S2-L2` duplicates `X4-L4` at the same level and ages; identity is **not proven**, so no merge.
- G-TW1-2 (age ladder): S1/S2 level L1–L2 are written for 10–12 (P25) and level L3 (`S1-L3`, `S2-L3`, ages 12–14) exists only as optional links inside P10 (ages 14–17). A 13-year-old has no entry that shows L3 in sequence. Options for the reviewer: keep as is, or surface the two L3 items as an optional "next" after P25-B.
- G-TW1-3 (text vs reality): the fictional notebook in scenario `S1-S1` says nobody will ask to read the notebook; the real storage is the learner's browser (anyone using the device may see it). Sessions already use accurate wording; the lesson text is for its owner to fix (recorded in the 14.1 redesign notes). No edit made here.
- G-TW1-4 (design guard): the S1 safeguards forbid scores, rankings and comparison. A daily-streak or points mechanism on top of this path would contradict them; the rebuild must not add one.
- G-TW1-5 (source review): `S1` is grounded in a classical muhasaba text with locator marked as needing a reviewer; the lesson already removes any self-punishment framing. A named scholarly reviewer must confirm before any publication.
- Generated checks for this path's programs:
  - P25: Timing: planned core content is 121′ against 200′ declared (60%); the declared rhythm and the real content disagree. Decision for the pedagogical reviewer: shorten the declared rhythm, or add content under the V3 §13 gate (never padding).
  - P25: Pacing: 6 core sessions against 8 declared slots (4 weeks × 2). Pacing should be derived from core sessions (≈ 3 weeks at 2/week), not from the weeks field. Reviewer to confirm.
  - P25: Review gate (nothing approved): مراجع تربوي نمائي ومراجع حماية للطفل ومراجع علمي; named reviewers required by the data: scholarly, pedagogical, child_protection.
  - P25: Repetition: 1 validator warning(s) that a competency level is also taught elsewhere at overlapping ages (see `scripts/validate_coherence.py --program P25 --verbose`); these are the duplication candidates for REORGANIZE/CONNECT decisions, not merges.

### TW-2 — أضبط غضبي وأصلح

*Anger: understand, choose, repair.* Programs reused (real ids): P02, P07.

**Sequence, prerequisites, ages, rhythm**

| Program | slug | Title | Ages | status | Hard prerequisites (verbatim) | Soft `next_programs` | Declared rhythm | Core sessions | Planned core min / declared |
|---|---|---|---|---|---|---|---|---|---|
| P02 | `adbut-nafsi` | أضبط نفسي وأسأل وأحفظ | 7–8 | planned | P01 أو ما يعادله; P18 أو ما يعادله (للعادة الصغيرة والروتين الهادئ) | P03, P04, P07 | 7w × 3 × 25′ = 21 slots | 21 (14L+7S) + 4 optional_link | 382′ / 525′ (73%) |
| P07 | `adbut-ghadabi` | أتعلّم كيف أتعامل مع غضبي | 10–12 | pilot | P02 أو ما يعادله; P05 أو ما يعادله; P25 أو ما يعادله | P08 | 6w × 3 × 35′ = 18 slots | 18 (11L+7S) | 409′ / 630′ (65%) |

**Why this order.** **P02-A** (ages 7–8; `S5`, `E6-A`: understand anger, three-pause, small spark, what is in my hands) is the early layer; **P07** (ages 10–12) is the main program. P07 requires "P02 أو ما يعادله", "P05 أو ما يعادله" and "P25 أو ما يعادله". P07-D/E repair and apology draw on `S6-L3`/`S6-S2`; the earlier repair layer for younger children is **P05-C** (`S6-L1`, `S6-S1`, `S6-L2`). Only P02-A (and, as patience, P02-B) belong to this path conceptually; P02-C (questions, memorising, review: `T1`, `E1-A`, `K4`) is not anger and is cross-linked to the Quran domain (K4) instead of moved. P02 as a whole is a bundle (validator severity 35 in the audit): marking this as REORGANIZE, not splitting it, in this document.

**Cross-links.** Soft upstream: P05-C (repair), P25 (hard). Soft downstream: P08 (P07.next). Quran-domain link: P02-C ↔ K4 items (`K4-L2`, `K4-S1`, `E1-L2`, `E1-L3`).

**Units (stages), items and sessions reused**

**P02 — أضبط نفسي وأسأل وأحفظ** (`adbut-nafsi`)

| Stage (unit) | Weeks | Ref | Kind | Lesson-bank unit | Title | Ages | Session # | Min | Role |
|---|---|---|---|---|---|---|---|---|---|
| P02-A أفهم غضبي | 1-3 | `S5-L1` | lesson | S5 | ما هذا الشعور؟ | 6-9 | 1 | 20 | core |
| P02-A أفهم غضبي | 1-3 | `S5-S1` | scenario | S5 | أخي كسر لعبتي | 6+ | 2 | 8 | core |
| P02-A أفهم غضبي | 1-3 | `S5-L2` | lesson | S5 | وقفة الثلاث | 7-9 | 3 | 25 | core |
| P02-A أفهم غضبي | 1-3 | `E6-L1` | lesson | E6-A | أنتبه لشرارتي الأولى | 7-8 | 4 | 22 | core |
| P02-A أفهم غضبي | 1-3 | `E6-L2` | lesson | E6-A | أغيّر حالي قبل أن أقرّر | 7-8 | 5 | 24 | core |
| P02-A أفهم غضبي | 1-3 | `E6-S1` | scenario | E6-A | الدور الذي فات | 7+ | 6 | 10 | core |
| P02-A أفهم غضبي | 1-3 | `E6-L3` | lesson | E6-A | ما الذي بيدي؟ | 7-8 | 7 | 24 | core |
| P02-A أفهم غضبي | 1-3 | `E6-S2` | scenario | E6-A | نزهة المطر | 7+ | 8 | 10 | core |
| P02-B أصبر خطوة خطوة | 4-5 | `S4-L1` | lesson | S4 | أنا محبَط وهذا مقبول | 7-9 | 9 | 20 | core |
| P02-B أصبر خطوة خطوة | 4-5 | `E16-L1` | lesson | E16-A | صوتان في داخلي: أترك الآن أم أجرّب خطوة؟ | 7-8 | 10 | 20 | optional_link |
| P02-B أصبر خطوة خطوة | 4-5 | `E16-S1` | scenario | E16-A | الزرّ الذي يهرب | 7+ | 11 | 8 | optional_link |
| P02-B أصبر خطوة خطوة | 4-5 | `S4-S1` | scenario | S4 | اللغز الصعب | 7+ | 12 | 8 | core |
| P02-B أصبر خطوة خطوة | 4-5 | `E16-L2` | lesson | E16-A | تعب يدي أم ضيق صدري؟ | 7-8 | 13 | 22 | core |
| P02-B أصبر خطوة خطوة | 4-5 | `S4-L2` | lesson | S4 | أنواع الصبر | 7-9 | 14 | 25 | core |
| P02-B أصبر خطوة خطوة | 4-5 | `S4-S2` | scenario | S4 | ليس صبرًا | 7+ | 15 | 8 | core |
| P02-B أصبر خطوة خطوة | 4-5 | `E16-L3` | lesson | E16-A | أقول أين علقتُ وأطلب عونًا | 7-8 | 16 | 24 | core |
| P02-B أصبر خطوة خطوة | 4-5 | `E16-S2` | scenario | E16-A | زاوية الفسيفساء | 7+ | 17 | 8 | optional_link |
| P02-B أصبر خطوة خطوة | 4-5 | `S4-L3` | lesson | S4 | تحدي الأسبوع | 7-12 | 18 | 30 | core |
| P02-B أصبر خطوة خطوة | 4-5 | `E16-L4` | lesson | E16-A | كلمة تعين صاحبي وشكر لمن أعانني | 7-8 | 19 | 22 | optional_link |
| P02-C أسأل وأحفظ وأراجع | 6-7 | `T1-L1` | lesson | T1 | لا أقول فهمت وأنا لم أفهم | 7-9 | 20 | 30 | core |
| P02-C أسأل وأحفظ وأراجع | 6-7 | `T1-S1` | scenario | T1 | فهمت وأنا لم أفهم | 7+ | 21 | 8 | core |
| P02-C أسأل وأحفظ وأراجع | 6-7 | `E1-L2` | lesson | E1-A | أين وقفتُ؟ | 6-7 | 22 | 14 | core |
| P02-C أسأل وأحفظ وأراجع | 6-7 | `E1-L3` | lesson | E1-A | نسيتُ فعدتُ برفق | 6-7 | 23 | 12 | core |
| P02-C أسأل وأحفظ وأراجع | 6-7 | `K4-L2` | lesson | K4 | أحفظ قدرًا قصيرًا وأراجعه | 7-9 | 24 | 30 | core |
| P02-C أسأل وأحفظ وأراجع | 6-7 | `K4-S1` | scenario | K4 | نسيت مقطعًا | 7+ | 25 | 8 | core |

**P07 — أتعلّم كيف أتعامل مع غضبي** (`adbut-ghadabi`)

| Stage (unit) | Weeks | Ref | Kind | Lesson-bank unit | Title | Ages | Session # | Min | Role |
|---|---|---|---|---|---|---|---|---|---|
| P07-A أفهم غضبي وأعرف إشاراتي | 1 | `AG-L1` | lesson | AG-A | شعوري وتصرّفي | 10-12 | 1 | 30 | core |
| P07-A أفهم غضبي وأعرف إشاراتي | 1 | `AG-S1` | scenario | AG-A | الملصق المشترك | 10+ | 2 | 8 | core |
| P07-A أفهم غضبي وأعرف إشاراتي | 1 | `AG-L2` | lesson | AG-A | مثيراتي وإشاراتي الأولى | 10-12 | 3 | 30 | core |
| P07-B أهدأ ثم أفهم ما جرى | 2 | `AG-S5` | scenario | AG-A | الجولة الثالثة | 10+ | 4 | 8 | core |
| P07-B أهدأ ثم أفهم ما جرى | 2 | `AG-L3` | lesson | AG-A | صندوق تهدئتي | 10-12 | 5 | 35 | core |
| P07-B أهدأ ثم أفهم ما جرى | 2 | `S5-L3` | lesson | S5 | بعد أن أهدأ | 10-12 | 6 | 30 | core |
| P07-C أعترض بلطف وحزم | 3 | `AG-L4` | lesson | AG-B | أعترض بلطف وحزم | 10-12 | 7 | 35 | core |
| P07-C أعترض بلطف وحزم | 3 | `S5-S2` | scenario | S5 | ملاحظة في الصف | 10+ | 8 | 8 | core |
| P07-C أعترض بلطف وحزم | 3 | `AG-S2` | scenario | AG-B | كلمة أمام الفريق | 10+ | 9 | 10 | core |
| P07-D أتثبّت وأتفاهم وأعتذر | 4 | `AG-L5` | lesson | AG-B | قصد أم خطأ؟ ومن يعينني بيننا | 10-12 | 10 | 35 | core |
| P07-D أتثبّت وأتفاهم وأعتذر | 4 | `S6-L3` | lesson | S6 | اعتذار حقيقي | 10-12 | 11 | 30 | core |
| P07-D أتثبّت وأتفاهم وأعتذر | 4 | `AG-S3` | scenario | AG-B | المجسّم والاعتذار | 10+ | 12 | 8 | core |
| P07-E اعتذار يُقبل أو لا يُقبل، وحين يغضب غيري | 5 | `S6-S2` | scenario | S6 | رسالة لم تكن لطيفة | 10+ | 13 | 8 | core |
| P07-E اعتذار يُقبل أو لا يُقبل، وحين يغضب غيري | 5 | `AG-L6` | lesson | AG-B | اعتذار يُقبل أو لا يُقبل | 10-12 | 14 | 30 | core |
| P07-E اعتذار يُقبل أو لا يُقبل، وحين يغضب غيري | 5 | `AG-L9` | lesson | AG-C | حين يغضب غيري عليّ | 10-12 | 15 | 30 | core |
| P07-F أطلب العون وأكتب خطتي | 6 | `AG-L7` | lesson | AG-C | مَن أسأل؟ ومتى لا أكفي وحدي؟ | 10-12 | 16 | 30 | core |
| P07-F أطلب العون وأكتب خطتي | 6 | `AG-S4` | scenario | AG-C | غضب لا يهدأ بعد التدريب | 10+ | 17 | 12 | core |
| P07-F أطلب العون وأكتب خطتي | 6 | `AG-L8` | lesson | AG-C | خطتي الشخصية | 10-12 | 18 | 32 | core |

**Assessments by type**

**P02 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P02-A | 8 items (5 with a session assessment component) | يسمّي غضبه | ويتوقف ويتنفس بتوجيه؛ ويختار ردًّا هادئًا؛ ويلتقط شرارته الأولى ويجرّب أداة تهدئة بإشراف كبير؛ ويسأل «ما الذي بيدي؟». | — | وقفة الثلاث: يطبق الطفل وقفة الثلاث مرة في موقف حقيقي بمساعدة كبير. |
| P02-B | 7 items (5 with a session assessment component) | يسمّي إحباطه ويجرب خطوة صغيرة؛ ويفرّق بين تعب جسمه وضيق صدره فيختار ما يناسب كلًّا منهما؛ ويفرّق بين الصبر والسكوت عن الأذى. | ويقول «هذا صعب عليّ» ويحدد موضع تعثره ويطلب تلميحًا من كبير قريب | — | تحدي الأسبوع: يكمل الطفل مهمة صعبة صغيرة خلال أسبوع بتوجيه كبير. |
| P02-C | 6 items (4 with a session assessment component) | ويشير إلى موضع احتاج فيه إلى إعادة | يقول لم أفهم دون حرج؛ ويعود برفق إلى ما نسيه؛ ويراجع قدره القصير في وقت ثابت. | — | سؤال حقيقي ومراجعة يومية: يسأل الطفل معلمه سؤالًا حقيقيًّا، ويراجع محفوظه القصير كل يوم. |

Evidence (program level): capstone **دفتر هدوئي وأسئلتي** — دفتر الطفل الخاص، لا يُطلب منه عرضه.


**P07 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P07-A | 3 items (3 with a session assessment component) | يسمّي غضبه بكلمة دقيقة؛ ويفرّق بين شعوره وتصرفه؛ ويذكر علامة مبكرة واحدة على الأقل. | — | — | علامتي الأولى: يلاحظ المتعلم علامة واحدة تظهر في جسمه أو أفكاره حين يبدأ انزعاجه، ويسمّيها بكلمته إن أحب. |
| P07-B | 3 items (3 with a session assessment component) | ويذكر سبب غضبه بعد أن يهدأ وما سيفعله المرة القادمة. | يجرّب مهارتين أو ثلاثًا ويختار ما يناسبه | — | أجرّب مهارتي: يجرّب المتعلم مهارة تهدئة واحدة من بطاقته وهو هادئ، ثم عند انزعاج بسيط، ويلاحظ ما نفع وما لم ينفع. |
| P07-C | 3 items (3 with a session assessment component) | ويفرّق بين ما أزعجه وما وقع فيه ضرر أو ظلم. | يصوغ جملة اعتراض هادئة بلا سباب ولا كذب | — | جملة اعتراضي: يكتب المتعلم جملة اعتراض من ثلاثة أجزاء (الموقف، وشعوري، وطلبي) لموقف متخيَّل أو صغير، ويجرّب قولها بصوت منخفض. |
| P07-D | 3 items (3 with a session assessment component) | — | يسأل أسئلة التثبّت قبل اللوم؛ ويقترح حلًّا لخلاف بسيط أو يطلب وسيطًا عادلًا؛ ويصوغ اعتذارًا من ثلاث خطوات عند الاقتضاء. | — | أسأل قبل أن أحكم: في موقف صغير يلتبس عليه، يسأل المتعلم نفسه: ماذا حدث بالضبط؟ وهل قصد؟ ثم يقرر ماذا يقول. |
| P07-E | 3 items (3 with a session assessment component) | يعرف أن قبول الاعتذار اختيار صاحبه؛ ويفرّق بين خلاف عابر وأذى متكرر أو مخيف. | — | وأنه لا يُطلب منه الاعتذار عن أذى وقع عليه | جملتي حين يعتذر لي أحد: ينتبه المتعلم إن اعتذر له أحد فيختار جملة صادقة تناسبه (قبلتُ، أو أحتاج وقتًا)، وإن اعتذر هو لم يُلحّ على من لم يقبل بعد. |
| P07-F | 3 items (3 with a session assessment component) | يسمّي كبارًا موثوقين ويقول جملة عون محددة | ويكتب بطاقة خطته الخاصة ويجرّبها على موقف خيالي. | — | من أسأل؟: يختار المتعلم في ذهنه أو في دفتره الخاص اثنين أو ثلاثة من الكبار الموثوقين، ويختار جملة عون يحبها ويقولها لنفسه بصوت منخفض. |

Evidence (program level): capstone **بطاقة خطتي** — بطاقة خاصة بالمتعلم يملكها وهي اختيارية، ولا تُرسَل لأحد، ويعدّلها أو يحذفها متى شاء.


**Gaps flagged for human review**

- G-TW2-1 (merge vs owner decision): `lessons_AG3.json` (units AG-C: `AG-L7`, `AG-L8`, `AG-L9`, `AG-S4`) states that **before merging** a child-protection reviewer and a child psychology/education specialist must define referral thresholds (severe, repeated or harmful anger; bullying; threats) and local support routes. These four items are already linked in P07-E/F in `programs.json`. They must stay unpublished and flagged until those reviewers exist (the program's own gating lists `child_mental_health`).
- G-TW2-2 (equivalence): the three hard prerequisites say "أو ما يعادله" but no equivalence rule exists. A 10–12-year-old who never did P02 has no way to be recognised as ready. The 14.1 redesign (open decision 2) proposes an ungraded readiness check plus optional compensating links to `S5-L1`, `S5-L2` (in P02-A) and `S6-L1`, `S6-L2` (in P05-C). Proposed here as optional links only; reviewer decides.
- G-TW2-3 (age jump): P02/P05 are ages 7–8, P07 is 10–12: the early anger and repair material sits in programs whose bands end at 8 (P02, P05) with lessons written for 6–9 (`S5-L1`, `S5-L2`) and 8–10 (`S6-L2`); age 9 has no dedicated program before P07 (10–12). Flagged, no content proposed.
- G-TW2-4 (title): the stored title differs from the owner's label (see §0 and G-10); owner decides which one learners see.
- G-TW2-5 (safeguards to preserve): program safeguards already say anger must not be suppressed or confessed, apology is never required of the person who was harmed, and persistent or frightening anger is referred to a trusted adult. Any rebuilt screen must show these before the capstone card; the P07 capstone («بطاقة خطتي») is private and optional.
- Generated checks for this path's programs:
  - P02: Assessment coverage: 7 of 21 core sessions have no `assessment` component (they are scenario sessions or short sessions); decide whether a descriptive observation is expected there.
  - P02: Review gate (nothing approved): مراجع تربوي نمائي ومراجع حماية للطفل; named reviewers required by the data: scholarly, pedagogical, child_protection.
  - P02: Repetition: 18 validator warning(s) that a competency level is also taught elsewhere at overlapping ages (see `scripts/validate_coherence.py --program P02 --verbose`); these are the duplication candidates for REORGANIZE/CONNECT decisions, not merges.
  - P07: Timing: planned core content is 409′ against 630′ declared (65%); the declared rhythm and the real content disagree. Decision for the pedagogical reviewer: shorten the declared rhythm, or add content under the V3 §13 gate (never padding).
  - P07: Owner decision pending in `lessons/lessons_AG3.json` (`needs_owner_decision`): قبل الدمج: يلزم مراجع حماية طفل ومختص نفسي/تربوي يراجع حواجز الإحالة (الغضب الشديد أو المتكرر أو المؤذي، والتنمر والتهديد) ويحدد مسارات الإحالة المحلية وأرقام الدعم قبل أي نص نهائي، ومراجع علمي للمبادئ المستخرجة. المحتوى مسودة غير مراجَعة ولا يُعدّ اعتمادًا.…
  - P07: Review gate (nothing approved): مراجع علمي، ومراجع تربوي نمائي، ومراجع حماية للطفل، ومراجع صحة نفسية للطفل لمهارات التنظيم ومعايير الإحالة; named reviewers required by the data: scholarly, pedagogical, child_protection, child_mental_health.

### TW-3 — أصدقائي وخلافاتي

*Listening, speaking kindly, friendship, disagreement.* Programs reused (real ids): P05, P08.

**Sequence, prerequisites, ages, rhythm**

| Program | slug | Title | Ages | status | Hard prerequisites (verbatim) | Soft `next_programs` | Declared rhythm | Core sessions | Planned core min / declared |
|---|---|---|---|---|---|---|---|---|---|
| P05 | `asma-watakallam` | أسمع وأتكلم وأصاحب | 8 | planned | P02 أو ما يعادله | P06, P07, P08 | 8w × 4 × 30′ = 32 slots | 32 (20L+12S) + 4 optional_link | 682′ / 960′ (71%) |
| P08 | `asdiqai-wa-khilafati` | أصدقائي وخلافاتي | 11–12 | planned | P05 أو ما يعادله | P09, P10, P11, P15 | 8w × 2 × 40′ = 16 slots | 22 (13L+9S) + 1 optional_link | 566′ / 640′ (88%) |

**Why this order.** **P05** (age 8, 4 sessions a week) builds listening (R1, E4-A), kind speech (R2, E13-A), repair (S6) and friendship/neighbours (R5, E7-A). **P08** (ages 11–12) requires "P05 أو ما يعادله" and adds disagreement, fairness and cooperation (R3, C4, R4, L4) plus the items relocated from P07 in the 14.1 redesign (`C4-L4`, `C4-S2` in P08-C; `C5-L4` in P08-A; `C1-L4` as optional link in P08-B). P04 (ages 8) lists both P05 and P08 as soft successors.

**Cross-links.** Soft upstream: P04 (mercy/fairness/humility/gratitude). Soft downstream: P09, P10, P11 (ages 14–17) and **P15** (age 18+, adult-gated) — a soft link from an 11–12 program to an adult-gated program is age-inconsistent (see gap).

**Units (stages), items and sessions reused**

**P05 — أسمع وأتكلم وأصاحب** (`asma-watakallam`)

| Stage (unit) | Weeks | Ref | Kind | Lesson-bank unit | Title | Ages | Session # | Min | Role |
|---|---|---|---|---|---|---|---|---|---|
| P05-A أسمع | 1-2 | `R1-L1` | lesson | R1 | لكل متكلم نوبة | 6-8 | 1 | 25 | core |
| P05-A أسمع | 1-2 | `R1-S1` | scenario | R1 | من له النوبة؟ | 6+ | 2 | 10 | core |
| P05-A أسمع | 1-2 | `R1-L2` | lesson | R1 | لماذا ننتظر؟ | 7-9 | 3 | 30 | core |
| P05-A أسمع | 1-2 | `E4-L1` | lesson | E4-A | أنتظر حتى يجد كلماته | 8-9 | 4 | 25 | core |
| P05-A أسمع | 1-2 | `R1-S3` | scenario | R1 | كلام لا يريحني | 6+ | 5 | 10 | core |
| P05-A أسمع | 1-2 | `E4-L2` | lesson | E4-A | سؤال ثانٍ حتى يتّضح | 8-9 | 6 | 25 | core |
| P05-A أسمع | 1-2 | `E4-S1` | scenario | E4-A | بطاقة المفاجأة | 8+ | 7 | 12 | core |
| P05-A أسمع | 1-2 | `R1-L3` | lesson | R1 | أنا أسمع وأنت تتحقق | 8-10 | 8 | 30 | core |
| P05-A أسمع | 1-2 | `R1-S2` | scenario | R1 | ما قالته ندى | 8+ | 9 | 14 | core |
| P05-B أتكلم بلطف | 3-4 | `R2-L1` | lesson | R2 | أسمّي شعوري | 8-9 | 10 | 25 | core |
| P05-B أتكلم بلطف | 3-4 | `R2-S2` | scenario | R2 | هدوء أحتاجه | 8+ | 11 | 10 | core |
| P05-B أتكلم بلطف | 3-4 | `R2-L2` | lesson | R2 | جارح أم لطيف؟ | 8-10 | 12 | 30 | core |
| P05-B أتكلم بلطف | 3-4 | `R2-S1` | scenario | R2 | الخطأ أمام الزملاء | 8+ | 13 | 10 | core |
| P05-B أتكلم بلطف | 3-4 | `E13-L1` | lesson | E13-A | أبدأ بما نتفق عليه | 8-9 | 14 | 25 | core |
| P05-B أتكلم بلطف | 3-4 | `T1-L2` | lesson | T1 | أسأل لأفهم أو أسأل لأغلب | 8-10 | 15 | 35 | core |
| P05-B أتكلم بلطف | 3-4 | `E4-L4` | lesson | E4-A | سؤال بدل حكم | 8-9 | 16 | 25 | core |
| P05-B أتكلم بلطف | 3-4 | `E13-L2` | lesson | E13-A | ماذا قصدت؟ قبل أن أغضب | 8-9 | 17 | 25 | core |
| P05-B أتكلم بلطف | 3-4 | `E13-S1` | scenario | E13-A | لعبة الاستراحة | 8+ | 18 | 10 | optional_link |
| P05-B أتكلم بلطف | 3-4 | `E13-L4` | lesson | E13-A | سؤالي ينتظر وقته | 8-9 | 19 | 25 | optional_link |
| P05-C أصلح خطئي | 5 | `S6-L1` | lesson | S6 | أسمّي الخطأ بلا لوم | 8-9 | 20 | 20 | core |
| P05-C أصلح خطئي | 5 | `S6-S1` | scenario | S6 | الكوب المكسور | 8+ | 21 | 8 | core |
| P05-C أصلح خطئي | 5 | `S6-L2` | lesson | S6 | ماذا حدث؟ ماذا أصلح؟ ماذا أفعل غدًا؟ | 8-10 | 22 | 25 | core |
| P05-C أصلح خطئي | 5 | `E4-L3` | lesson | E4-A | حين يسألني صديقي: هل أنت الذي فعل؟ | 8-9 | 23 | 25 | core |
| P05-C أصلح خطئي | 5 | `E4-S2` | scenario | E4-A | برج المكعبات: ما الرد الذي يشبه ما جرى؟ | 8+ | 24 | 10 | core |
| P05-C أصلح خطئي | 5 | `E13-L3` | lesson | E13-A | كلمة جرحت صديقي: أعترف وأصلح | 8-9 | 25 | 28 | optional_link |
| P05-C أصلح خطئي | 5 | `E13-S2` | scenario | E13-A | الكلمة التي خرجت في الطابور | 8+ | 26 | 12 | optional_link |
| P05-D أصاحب وأجاور | 6-8 | `R5-L1` | lesson | R5 | من الصديق؟ أفعال لا ألقاب | 8-10 | 27 | 35 | core |
| P05-D أصاحب وأجاور | 6-8 | `R5-S1` | scenario | R5 | الطائرة المكسورة | 8+ | 28 | 10 | core |
| P05-D أصاحب وأجاور | 6-8 | `E7-L1` | lesson | E7-A | أبدأ بتحية وأسمع الجواب | 8-9 | 29 | 30 | core |
| P05-D أصاحب وأجاور | 6-8 | `E7-S1` | scenario | E7-A | لوحة صديقتي عند الباب | 8+ | 30 | 8 | core |
| P05-D أصاحب وأجاور | 6-8 | `E7-L2` | lesson | E7-A | حين يحصل صديقي على ما كنت أريده | 8-9 | 31 | 30 | core |
| P05-D أصاحب وأجاور | 6-8 | `R5-L2` | lesson | R5 | حقوق الجار الصغيرة | 8-11 | 32 | 35 | core |
| P05-D أصاحب وأجاور | 6-8 | `R5-S3` | scenario | R5 | الكرة عند نافذة الجارة | 8+ | 33 | 8 | core |
| P05-D أصاحب وأجاور | 6-8 | `E7-L3` | lesson | E7-A | ما الذي جعل الأمر يحدث؟ حاجز صغير | 8-9 | 34 | 30 | core |
| P05-D أصاحب وأجاور | 6-8 | `E7-S2` | scenario | E7-A | الكتاب الذي بلّله الماء | 8+ | 35 | 12 | core |
| P05-D أصاحب وأجاور | 6-8 | `E7-L4` | lesson | E7-A | بطاقة كلام الأسبوع | 8-9 | 36 | 30 | core |

**P08 — أصدقائي وخلافاتي** (`asdiqai-wa-khilafati`)

| Stage (unit) | Weeks | Ref | Kind | Lesson-bank unit | Title | Ages | Session # | Min | Role |
|---|---|---|---|---|---|---|---|---|---|
| P08-A أتكلم بلطف | 1-2 | `T1-L3` | lesson | T1 | أعيد صياغة سؤالي بلطف | 9-12 | 1 | 35 | core |
| P08-A أتكلم بلطف | 1-2 | `T1-S2` | scenario | T1 | سؤال بصيغة جافة | 9+ | 2 | 8 | core |
| P08-A أتكلم بلطف | 1-2 | `R2-L3` | lesson | R2 | أطلب بلطف | 9-11 | 3 | 30 | core |
| P08-A أتكلم بلطف | 1-2 | `R2-L4` | lesson | R2 | أنصح ولا أعيّر | 10-12 | 4 | 35 | core |
| P08-A أتكلم بلطف | 1-2 | `C5-L4` | lesson | C5 | أقبل النقد وأصحح | 10-13 | 5 | 35 | core |
| P08-A أتكلم بلطف | 1-2 | `R2-S3` | scenario | R2 | ملاحظة لزميل في الفريق | 10+ | 6 | 10 | core |
| P08-B أصدقاء بحقوق ووفاء | 3-4 | `R5-L3` | lesson | R5 | نتعاون معًا | 9-12 | 7 | 40 | core |
| P08-B أصدقاء بحقوق ووفاء | 3-4 | `R5-S2` | scenario | R5 | كلام وصل إليّ | 10+ | 8 | 10 | core |
| P08-B أصدقاء بحقوق ووفاء | 3-4 | `R5-L4` | lesson | R5 | حين يزعل صديقي | 10-14 | 9 | 45 | core |
| P08-B أصدقاء بحقوق ووفاء | 3-4 | `C1-L4` | lesson | C1 | الصدق حين يكلّفني شيئًا | 10-13 | 10 | 35 | optional_link |
| P08-C أفهم الخلاف وأحله | 5-6 | `R3-L1` | lesson | R3 | أسمّي الخلاف | 10-11 | 11 | 30 | core |
| P08-C أفهم الخلاف وأحله | 5-6 | `R3-S1` | scenario | R3 | الدور في اللعبة | 10+ | 12 | 12 | core |
| P08-C أفهم الخلاف وأحله | 5-6 | `R3-L2` | lesson | R3 | رأي مختلف أم عداوة؟ | 10-12 | 13 | 35 | core |
| P08-C أفهم الخلاف وأحله | 5-6 | `R3-S2` | scenario | R3 | رأيان في المشروع | 10+ | 14 | 14 | core |
| P08-C أفهم الخلاف وأحله | 5-6 | `R3-L3` | lesson | R3 | أعرض وجهة نظر الآخر | 11-13 | 15 | 35 | core |
| P08-C أفهم الخلاف وأحله | 5-6 | `C4-L4` | lesson | C4 | أُنصف من يخالفني حين أعرض رأيه | 10-13 | 16 | 35 | core |
| P08-C أفهم الخلاف وأحله | 5-6 | `C4-S2` | scenario | C4 | قسمة المهام بين الإخوة | 10+ | 17 | 10 | core |
| P08-C أفهم الخلاف وأحله | 5-6 | `R3-S3` | scenario | R3 | حين يتحول الخلاف إلى أذى | 10+ | 18 | 10 | core |
| P08-D أخالف بلطف وأتعاون | 7-8 | `R4-L4` | lesson | R4 | أخالف بلطف وأحفظ حقوقي | 11-14 | 19 | 40 | core |
| P08-D أخالف بلطف وأتعاون | 7-8 | `R4-S3` | scenario | R4 | امتحان وطلب مساعدة | 11+ | 20 | 12 | core |
| P08-D أخالف بلطف وأتعاون | 7-8 | `L4-L1` | lesson | L4 | الخير يتعاون عليه الجميع | 10-12 | 21 | 35 | core |
| P08-D أخالف بلطف وأتعاون | 7-8 | `L4-S1` | scenario | L4 | اللوحة والحديقة | 10+ | 22 | 10 | core |
| P08-D أخالف بلطف وأتعاون | 7-8 | `L4-L2` | lesson | L4 | قواعد احترام الفريق | 10-14 | 23 | 40 | core |

**Assessments by type**

**P05 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P05-A | 9 items (8 with a session assessment component) | ويفرّق بين السكوت الفارغ والإنصات | ينتظر دوره وينتظر من يتعثر في كلامه؛ ويعيد ما سمعه؛ ويسأل سؤالًا ثانيًا ليتضح له جزء بعينه؛ يقول «اتّضح لي | شكرًا». | أسمع وأنت تتحقق: يستمع الطفل لأحد أسرته خمس دقائق دون مقاطعة ثم يعيد ما فهمه. |
| P05-B | 8 items (8 with a session assessment component) | يسمّي شعوره بوضوح؛ ويميّز الجارح من اللطيف | ويسأل ليفهم لا ليغلب؛ ويصوغ سؤالًا لطيفًا بدل جملة حكم؛ ويقول اختلافه بجملة من ثلاثة أجزاء؛ ويسأل «ماذا قصدت؟» قبل أن يغضب. | — | طلب لطيف: يقول الطفل كلمة تعبّر عن شعوره لمن يثق به ويعيد صياغة عبارة جارحة. |
| P05-C | 5 items (4 with a session assessment component) | يسمّي خطأه بلا لوم ويشرح خطوات الإصلاح | ويختار ردًّا صادقًا يشبه ما جرى حين يُسأل ويعرض الإصلاح. | — | النموذج الثلاثي: يستخدم الطفل أسئلة: ماذا حدث؟ ماذا أصلح؟ ماذا أفعل غدًا؟ مع خطأ صغير. |
| P05-D | 10 items (8 with a session assessment component) | يذكر أفعالًا ملموسة للصديق الجيد؛ ويسمّي غيرته ويقول لصديقه كلمة طيبة؛ ويذكر سبب خطئه ويقترح حاجزًا صغيرًا. | ويطبّق حقًّا من حقوق الجار؛ ويبدأ بتحية ويسمع الجواب | — | فعل صداقة وسلام على جار: يُظهر الطفل لصديق فعلًا من أفعال الصداقة، ويسلّم على جار بمرافقة كبير. |

Evidence (program level): capstone **كلام الأسبوع** — بطاقة خاصة بالطفل.


**P08 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P08-A | 6 items (6 with a session assessment component) | ويفرّق بين النصيحة والتعيير | يعيد صياغة سؤاله؛ ويقبل نقدًا يسيرًا ويفحصه ويصحّح ما فيه من حق. | — | طلب لطيف وملاحظة بوقتها: يصوغ المتعلم طلبًا لطيفًا بصيغة أنا أشعر وأريد ويختار وقتًا ومكانًا مناسبين لتقديم ملاحظة، ويطلب من غيره رأيًا في عمل قام به ويفحصه. |
| P08-B | 3 items (3 with a session assessment component) | — | يعالج الجفوة بخطوات؛ ويطلب كبيرًا إن تعقّد الأمر. | — | حين يزعل صديقي: يجرب المتعلم خطوة واحدة لمعالجة جفوة: يسمع قبل أن يحكم أو يعتذر إن أخطأ. |
| P08-C | 8 items (8 with a session assessment component) | يميّز الاختلاف من العداوة؛ ويعرف متى يطلب مساعدة كبير عند الأذى. | — | — | أعرض رأيه بأمانة: يعرض المتعلم رأي من يخالفه في موضوع بسيط بأمانة قبل أن يرد. |
| P08-D | 5 items (5 with a session assessment component) | ويشرح لماذا نمتنع عن السخرية في العمل الجماعي. | يوازن بين البر وحقوقه | — | جملة أعبّر بها عن رأيي: يكتب المتعلم جملة لطيفة يعبّر بها عن رأيه أو حاجته لمن يرعاه، ويكتب قاعدة احترام لفريقه. |

Evidence (program level): capstone **ميثاق صحبة** — ميثاق قصير يوافق عليه أعضاء المجموعة.


**Gaps flagged for human review**

- G-TW3-1 (the only validator ERROR in the corpus): in P05, competency `S6` requires `S1`, but `S1` is taught in P25 (min age 10) and P05 is for age 8. The competency register itself is contradictory (S6 min_age 8, S1 min_age 10). Do **not** make P25 a prerequisite of P05; the reviewer should decide whether the register's dependency becomes advisory. P07's "P25 or equivalent" exists for the same reason.
- G-TW3-2 (bundle): P08 declares 9 competencies over 4 domains (C, L, R, T), stage P08-B fills 58% of its declared time and P08-C is over capacity after the relocations. Competencies with ≤2 items: C1, C4, C5, R4, T1. Candidate action is REORGANIZE (reorder / split into two programs for the reviewer), not deletion.
- G-TW3-3 (age jump and soft links): P05 is 8, P08 is 11–12; P08.next lists P09/P10/P11 (14–17) and P15 (adult). Treat `next_programs` as suggestions and filter by age in the UI.
- G-TW3-4 (optional extension): `E13-S1`, `E13-L3`, `E13-L4`, `E13-S2` are optional links in P05; the file note says the E13 appendix was never reviewed and is "linked later". Keep optional.
- G-TW3-5 (child protection): P08-C includes `R3-S3` "حين يتحول الخلاف إلى أذى" and stage checks about calling a trusted adult; the child-protection reviewer must confirm referral wording. Not approved.
- Generated checks for this path's programs:
  - P05: Sequence: competency prerequisite not covered by the program or its (declared + inverse `next_programs`) predecessors — S6 needs S1.
  - P05: Assessment coverage: 4 of 32 core sessions have no `assessment` component (they are scenario sessions or short sessions); decide whether a descriptive observation is expected there.
  - P05: Review gate (nothing approved): مراجعة تربوية وحماية الطفل; named reviewers required by the data: scholarly, pedagogical, child_protection.
  - P05: validate_coherence ERROR: competency S6 requires S1, which is neither earlier in the program nor in a prerequisite program
  - P05: Repetition: 7 validator warning(s) that a competency level is also taught elsewhere at overlapping ages (see `scripts/validate_coherence.py --program P05 --verbose`); these are the duplication candidates for REORGANIZE/CONNECT decisions, not merges.
  - P08: Pacing: 22 core sessions against 16 declared slots (8 weeks × 2). Pacing should be derived from core sessions (≈ 11 weeks at 2/week), not from the weeks field. Reviewer to confirm.
  - P08: Review gate (nothing approved): مراجع تربوي نمائي ومراجع حماية للطفل; named reviewers required by the data: scholarly, pedagogical, child_protection.

### TW-4 — أقرر بالشورى

*Deciding and consulting.* Programs reused (real ids): P10.

**Sequence, prerequisites, ages, rhythm**

| Program | slug | Title | Ages | status | Hard prerequisites (verbatim) | Soft `next_programs` | Declared rhythm | Core sessions | Planned core min / declared |
|---|---|---|---|---|---|---|---|---|---|
| P10 | `aqarrir-bishura` | أقرر بالشورى | 14–17 | planned | P09 أو ما يعادله | P11, P13 | 8w × 3 × 50′ = 24 slots | 24 (16L+8S) + 2 optional_link | 792′ / 1200′ (66%) |

**Why this order.** P10 (ages 14–17) hard-requires **P09** ("P09 أو ما يعادله"), which in turn requires **P06**; those two are the thinking foundation shared with other paths and are listed as **TW-7**. P10 has three stages: A decisions (`T4`), B time and problem analysis (`S1-L3`/`S2-L3` optional, `E14-A`, `E8-A`), C consultation and decision (`T5-L4`, `E8-A`, `L1`: the shura items). Downstream: **P11** (hard prerequisite is P08, not P10; P10.next only suggests it) and **P13** ("P09 أو P10 أو ما يعادلهما").

**Cross-links.** Foundation: TW-7 (P06 → P09). Soft downstream: P11, P13. P25 → P10 is a soft edge with two optional links (TW-1).

**Units (stages), items and sessions reused**

**P10 — أقرر بالشورى** (`aqarrir-bishura`)

| Stage (unit) | Weeks | Ref | Kind | Lesson-bank unit | Title | Ages | Session # | Min | Role |
|---|---|---|---|---|---|---|---|---|---|
| P10-A أقرر بنفسي | 1-2 | `T4-L1` | lesson | T4 | ما خياراتي؟ | 12-13 | 1 | 35 | core |
| P10-A أقرر بنفسي | 1-2 | `T4-L2` | lesson | T4 | ناجز ومتوقع: أوازن بين عاقبتين | 12-13 | 2 | 40 | core |
| P10-A أقرر بنفسي | 1-2 | `T4-S1` | scenario | T4 | الوقت والنادي | 12+ | 3 | 8 | core |
| P10-A أقرر بنفسي | 1-2 | `T4-L3` | lesson | T4 | أقرر في موقف بسيط | 13-14 | 4 | 45 | core |
| P10-A أقرر بنفسي | 1-2 | `T4-S2` | scenario | T4 | بين الفريق والمذاكرة | 13+ | 5 | 8 | core |
| P10-A أقرر بنفسي | 1-2 | `T4-L4` | lesson | T4 | موقف مركب ومراجعة بلا لوم | 14-16 | 6 | 45 | core |
| P10-B أنظم وقتي وأحل | 3-5 | `S1-L3` | lesson | S1 | مراجعة يومي وخطة الغد | 12-14 | 7 | 30 | optional_link |
| P10-B أنظم وقتي وأحل | 3-5 | `S2-L3` | lesson | S2 | أسبوعي بقدر طاقتي | 12-14 | 8 | 30 | optional_link |
| P10-B أنظم وقتي وأحل | 3-5 | `E14-L1` | lesson | E14-A | أين يتسرّب وقتي؟ وما بديلي النافع؟ | 14-17 | 9 | 45 | core |
| P10-B أنظم وقتي وأحل | 3-5 | `E14-L2` | lesson | E14-A | كم أحتاج فعلًا؟ أقدّر ثم أقارن | 14-17 | 10 | 45 | core |
| P10-B أنظم وقتي وأحل | 3-5 | `E14-S1` | scenario | E14-A | مباراة الجمعة وتقرير الاثنين | 14+ | 11 | 8 | core |
| P10-B أنظم وقتي وأحل | 3-5 | `E14-L3` | lesson | E14-A | حين يتزاحم الأسبوع: الضروري ثم المستحسن ثم إن بقي وقت | 14-17 | 12 | 45 | core |
| P10-B أنظم وقتي وأحل | 3-5 | `E14-S2` | scenario | E14-A | الساعة بعد العشاء | 14+ | 13 | 10 | core |
| P10-B أنظم وقتي وأحل | 3-5 | `E14-L4` | lesson | E14-A | لماذا هذا الأسبوع؟ خطة تخدم قيمة ومراجعة بلا لوم | 14-17 | 14 | 45 | core |
| P10-B أنظم وقتي وأحل | 3-5 | `E8-L1` | lesson | E8-A | لماذا حدث هذا؟ أسباب محتملة قبل أن أحكم | 14-17 | 15 | 45 | core |
| P10-B أنظم وقتي وأحل | 3-5 | `E8-L2` | lesson | E8-A | العرَض والسبب: خطة أولى وخطة احتياطية | 14-17 | 16 | 45 | core |
| P10-B أنظم وقتي وأحل | 3-5 | `E8-S1` | scenario | E8-A | المقعد الفارغ في التدريب | 14+ | 17 | 10 | core |
| P10-C أستشير ثم أعزم | 6-8 | `T5-L4` | lesson | T5 | فريق صغير يحل مشكلة | 12-14 | 18 | 50 | core |
| P10-C أستشير ثم أعزم | 6-8 | `E8-L3` | lesson | E8-A | حين يتزاحم خياران: أيهما أرجح نفعًا وأقل ضررًا؟ | 14-17 | 19 | 45 | core |
| P10-C أستشير ثم أعزم | 6-8 | `E8-S2` | scenario | E8-A | ساعتان وغلاف المجلة | 14+ | 20 | 10 | core |
| P10-C أستشير ثم أعزم | 6-8 | `E8-L4` | lesson | E8-A | وقفة ثم ورقة الفريق: أعزم وأحدد موعد المراجعة | 14-17 | 21 | 50 | core |
| P10-C أستشير ثم أعزم | 6-8 | `L1-L1` | lesson | L1 | ماذا تعني الشورى؟ | 14-17 | 22 | 40 | core |
| P10-C أستشير ثم أعزم | 6-8 | `L1-L2` | lesson | L1 | من أستشير وكيف أُصغي؟ | 14-17 | 23 | 45 | core |
| P10-C أستشير ثم أعزم | 6-8 | `L1-S1` | scenario | L1 | رحلة الصف: من نستشير؟ | 14+ | 24 | 10 | core |
| P10-C أستشير ثم أعزم | 6-8 | `L1-S2` | scenario | L1 | وقت المراجعة في البيت | 14+ | 25 | 8 | core |
| P10-C أستشير ثم أعزم | 6-8 | `L1-L3` | lesson | L1 | محاكاة اجتماع قصير | 14-17 | 26 | 55 | core |

**Assessments by type**

**P10 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P10-A | 6 items (4 with a session assessment component) | يسمّي الخيارات | ويوازن بين عاقبتين؛ ويراجع قراره بلا لوم. | — | ورقة قرار: يطبق المتعلم ورقة القرار على أمر حقيقي صغير ويحدد موعد مراجعة. |
| P10-B | 9 items (6 with a session assessment component) | ويصف موضع تسرّب وقته بلا لوم؛ ويقدّر زمن مهمة؛ ويذكر أسبابًا محتملة قبل أن يحكم؛ ويفرّق بين العرَض والسبب ويضع حلًّا احتياطيًّا. | يراجع يومه بنموذج قصير ويخطط أسبوعًا بوقت راحة؛ يقارن بما حدث؛ ويصنّف مطالب الأسبوع إلى لا بد ويحسن وإن بقي وقت؛ ويكتب «لماذا» لبنود خطته | — | خطة أسبوع بوقت راحة: يخطط المتعلم أسبوعه بوقت راحة ويراجعه. |
| P10-C | 9 items (6 with a session assessment component) | ويشرح الشورى ويختار مستشارًا ويصغي | يقسّم الأدوار في فريق صغير؛ ويشارك في اجتماع ويلخّص القرار. | — | شورى عائلية قصيرة: يقود المتعلم حلًّا لمشكلة مع إخوته أو أصدقائه، ويستشير أسرته في أمر صغير ويشارك في اجتماع قصير ويلخّص القرار. |

Evidence (program level): capstone **مجلس الأسرة أو الصف** — محضر قصير خاص بالمتعلم.


**Gaps flagged for human review**

- G-TW4-1 (bundle): five competencies (`T4`, `S1`, `S2`, `T5`, `L1`) in one program (audit severity 28). `S1` and `S2` appear only as optional links (`S1-L3`, `S2-L3`) and `T5` by one item (`T5-L4`). Candidate: keep P10 intact and show a clear stage order; do not split without the reviewer.
- G-TW4-2 (age): `T4-L1` and `T4-L2` are written for 12–13, below the program's age_min 14 (validator warns); 18 of 26 sessions carry min_age 14, 6 carry 12, 2 carry 13. Keep and label (the UI already labels out-of-band lessons).
- G-TW4-3 (time): planned core content 792′ against 1200′ declared (66%); stage B has 11 sessions for 3 declared weeks.
- G-TW4-4 (link integrity): the hard prerequisite list is P09 only. The sequence check passes (`L1` requires `R1`, taught in P05/P18) **only through soft edges** (P08.next → P10, P25.next → P10). If `next_programs` is ever trimmed, P10 would fail the sequence gate. Decision: make that dependency explicit in `prerequisites` text or state it as advisory.
- G-TW4-5 (religious content): `L1` (الشورى) and `L1-L1` "ماذا تعني الشورى؟" are Islamic-source teaching; they need the named scholarly reviewer before any publication. The capstone «مجلس الأسرة أو الصف» is a private minute; family or class consultation must not require disclosure of private matters.
- Generated checks for this path's programs:
  - P10: Timing: planned core content is 792′ against 1200′ declared (66%); the declared rhythm and the real content disagree. Decision for the pedagogical reviewer: shorten the declared rhythm, or add content under the V3 §13 gate (never padding).
  - P10: Age: lesson(s) written entirely outside the program band — `T4-L1` (12-13), `T4-L2` (12-13). Keep (labelled in UI today by `acAgeOut`) or replace by an age-fitting lesson; never edit the original.
  - P10: Assessment coverage: 8 of 24 core sessions have no `assessment` component (they are scenario sessions or short sessions); decide whether a descriptive observation is expected there.
  - P10: Review gate (nothing approved): مراجع تربوي ومراجع علمي; named reviewers required by the data: scholarly, pedagogical, child_protection.
  - P10: Repetition: 8 validator warning(s) that a competency level is also taught elsewhere at overlapping ages (see `scripts/validate_coherence.py --program P10 --verbose`); these are the duplication candidates for REORGANIZE/CONNECT decisions, not merges.
  - P10 (validator Age warning): lesson written for ages 12-13, all below program age_min 14 (content for younger learners)

### TW-5 — القيم الأولى: الشكر والرحمة والصدق والأمانة والعدل والتواضع

*First values.* Programs reused (real ids): P01, P17, P03, P04.

**Sequence, prerequisites, ages, rhythm**

| Program | slug | Title | Ages | status | Hard prerequisites (verbatim) | Soft `next_programs` | Declared rhythm | Core sessions | Planned core min / declared |
|---|---|---|---|---|---|---|---|---|---|
| P01 | `khutwati-al-ula` | خطواتي الأولى | 5–7 | planned | — | P02, P03 | 7w × 3 × 15′ = 21 slots | 20 (12L+8S) + 4 optional_link | 234′ / 315′ (74%) |
| P17 | `rahma-shukr-qissas` | أرحم وأشكر وأسمع قصص السيرة | 6–8 | planned | — | P18, P19 | 5w × 3 × 20′ = 15 slots | 15 (10L+5S) | 181′ / 300′ (60%) |
| P03 | `sidqi-wa-amanati` | صدقي وأمانتي وبرّي | 8 | planned | P01 أو ما يعادله | P04, P07 | 7w × 3 × 25′ = 21 slots | 20 (12L+8S) | 400′ / 525′ (76%) |
| P04 | `arham-wa-aadil` | أرحم وأعدل وأتواضع وأشكر | 8 | planned | P01 أو ما يعادله | P05, P08 | 7w × 3 × 30′ = 21 slots | 20 (13L+7S) | 430′ / 630′ (68%) |

**Why this order.** Two entry points with no prerequisite: **P01** (ages 5–7, teacher present) and **P17** (ages 6–8, guardian present). **P03** (age 8) and **P04** (age 8) hard-require P01; P02 is a soft predecessor of both and P03 is a soft predecessor of P04. P04 needs `C1` (honesty) for `C4` (fairness): `C1` is taught in P03, so P04 passes the sequence check through the soft edge P03 → P04.

**Cross-links.** P17-C (`H5` stories from the Prophet's life) ↔ TW-11 and P22-A (`H1`). P01-B ↔ Quran domain (`K4`, recitation with the teacher). Soft downstream: P04 → P05, P08 (TW-3).

**Units (stages), items and sessions reused**

**P01 — خطواتي الأولى** (`khutwati-al-ula`): يتلو الطفل مع كبير بهدوء، ويسمّي نعمه ويشكر، ويلاحظ الرحمة حوله ويفعل عملًا لطيفًا صغيرًا، ويشكر من أحسن إليه بلطف.

- **P01-A** أنتبه وأسمّي (weeks 1-3; sessions 1–8): `C6-L1` ثلاث نعم اليوم (5-7)؛ `C6-S1` نسيتُ أن أشكر (5+)؛ `E12-L1` من يعمل من أجلي ولا أراه؟ (5-7)؛ `E12-S1` بوّاب الباب الكبير (5+)؛ `C3-L1` الرحمة تُرى (5-7)؛ `E5-L1` لكلٍّ لطفٌ يناسبه (5-7)؛ `E5-S1` ماذا تحتاج ليان؟ (5+)؛ `E5-L4` أكون لطيفًا وأقول: لا (5-7)
- **P01-B** أمارس مع معلمي (weeks 4-7; sessions 9–20): `C3-S1` في الاستراحة (5+)؛ `E5-L2` ما يريحه هو لا ما أحبه أنا (5-7)؛ `E12-L2` أحكي خيرًا عمّن أحسن إليّ (5-7)؛ `E5-L3` لا بأس، وأطلب بهدوء (5-7)؛ `K4-L1` أتلو مع معلمي (5-6)؛ `E1-L1` جديد قليل وقديم قريب (5-7)؛ `E1-S1` أريد الجديد فقط (5+)؛ `E1-S2` غابت كلمة (5+)؛ `E5-S2` القلم الأخضر (5+)؛ `E12-L4` أرتّب حقيبة نعمي (5-7)؛ `E12-L3` أردّ اللطف بلطف صغير (5-7)؛ `E12-S2` هدية الخالة ولا أريد العناق (5+)؛ `Y1-L7` أسمع بهدوء (5-6) *[optional_link]*؛ `Y1-L8` أردّد بعده (5-6) *[optional_link]*؛ `Y1-L9` موعدي القصير (5-6) *[optional_link]*؛ `Y1-S4` تعبتُ قليلًا (5+) *[optional_link]*

**P17 — أرحم وأشكر وأسمع قصص السيرة** (`rahma-shukr-qissas`): يلاحظ الطفل من يحتاج لطفًا ويفعل عملًا صغيرًا، ويسمّي نعمه ويقول شكرًا، ويسمع حكايات السيرة الهادئة ويجرّب خُلُقًا واحدًا في بيته.

- **P17-A** الرحمة تُرى (weeks 1; sessions 1–5): `Y1-L1` الرحمة تُرى (5-6)؛ `Y1-L2` ماذا يحتاج؟ (5-6)؛ `Y1-L3` عمل رحيم صغير (5-6)؛ `Y1-S1` رسمة لين المبللة (5+)؛ `Y1-S2` ماء للقطة (5+)
- **P17-B** أعدّ نعمي وأشكر (weeks 2; sessions 6–9): `Y1-L4` ثلاث نعم اليوم (5-6)؛ `Y1-L5` من أعطاني؟ (5-6)؛ `Y1-L6` أقول شكرًا وأفعل (5-6)؛ `Y1-S3` الجوارب بدل اللعبة (5+)
- **P17-C** حكايات هادئة من السيرة (weeks 3-5; sessions 10–15): `H5-L1` أخلاق جميلة نحبها (5-7)؛ `H5-L2` حلّ يشارك فيه الجميع (5-7)؛ `H5-L3` نقف مع من يحتاج إلينا (5-8)؛ `H5-L4` ما سمعناه وما نتخيله (6-8)؛ `H5-S1` من يبدأ بالقطار؟ (5+)؛ `H5-S2` الكرة والطفل الجديد (5+)

**P03 — صدقي وأمانتي وبرّي** (`sidqi-wa-amanati`): يفرّق الطفل بين ما رآه وما ظنّه، ويؤدي أمانة صغيرة، ويقوم ببر يومي صغير.

- **P03-A** أقول ما أعرف (weeks 1-2; sessions 1–7): `C1-L1` رأيتُ أم ظننتُ؟ (6-8)؛ `C1-S1` رأيتُ أم ظننتُ؟ (6+)؛ `C1-L2` الصدق يبني الثقة (7-9)؛ `E2-L1` وعدٌ أقوله وأقدر عليه (8-9)؛ `E2-S1` كتاب الألغاز (8+)؛ `C1-L3` أخطأتُ وأقول (8-10)؛ `C1-S2` الخط على الجدار (8+)
- **P03-B** أحفظ ما اؤتمنت عليه (weeks 3-4; sessions 8–12): `C2-L1` طبق الضيافة (7-9)؛ `C2-S1` علبة الألوان (7+)؛ `C2-L2` الأمانة ليست الملك (8-10)؛ `C2-L3` أمانة صغيرة وسر صغير (8-11)؛ `C2-S2` السر الصغير والسر الثقيل (8+)
- **P03-C** أحسن لمن يرعاني (weeks 5-7; sessions 13–20): `R4-L1` من يرعاني؟ (6-8)؛ `R4-S1` طلبان في وقت واحد (6+)؛ `R4-L2` صور البر الصغيرة (7-9)؛ `E2-L2` لم أستطع أن أفي: أخبر مبكرًا (8-9)؛ `E2-S2` الرسالة لأمي (8+)؛ `R4-L3` اتصال بقريب (8-10)؛ `E2-L3` وعدٌ لمن يرعاني (8-9)؛ `R4-S2` اتصال بالعم البعيد (8+)

**P04 — أرحم وأعدل وأتواضع وأشكر** (`arham-wa-aadil`): ينتبه الطفل لحاجة غيره ويعمل لطفًا، وينصف في لعبة، ويقبل التصحيح بتواضع، ويشكر بالقول والفعل.

- **P04-A** أنتبه لحاجة غيري (weeks 1-2; sessions 1–6): `C3-L2` ماذا يحتاج؟ (6-8)؛ `C3-S2` قطة الجيران (6+)؛ `E3-L1` ماذا يحتاج فعلًا؟ (8-9)؛ `E3-S1` في السيارة إلى بيت الجدة (8+)؛ `C3-L3` عمل رحيم صغير (7-10)؛ `E3-L3` من حولي يحتاج لطفي؟ (8-10)
- **P04-B** أعدل وأنصف (weeks 3; sessions 7–10): `C4-L1` ما العدل؟ (8-10)؛ `C4-L2` عدل أم مساواة؟ (8-10)؛ `C4-L3` حَكَم اللعبة (8-11)؛ `C4-S1` لعبة الفريقين (8+)
- **P04-C** أعرف قدري (weeks 4-6; sessions 11–17): `C5-L1` أعرف قدري (7-9)؛ `C5-S1` التصحيح الصغير (7+)؛ `C5-L2` التواضع ليس ذلًّا (8-10)؛ `E3-L2` كلمة هادئة حين يخطئ صديقي (8-10)؛ `E3-S2` جدول الضرب في معرض الصف (8+)؛ `C5-L3` شكرًا لأنك صححت لي (8-11)؛ `C5-S2` تواضع ولا تردّ (8+)
- **P04-D** أشكر بالقول والفعل (weeks 7; sessions 18–20): `C6-L2` أعرف وأفرح وأعمل (6-8)؛ `C6-S2` أشكر وأطلب (8+)؛ `C6-L3` شكر بالفعل (8-10)

**Assessments by type**

**P01 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P01-A | 8 items (5 with a session assessment component) | 3 | 2 | 0 | ثلاث نعم قبل النوم: كل مساء يقول الطفل لأحد والديه ثلاث نعم حدثت له اليوم. |
| P01-B | 12 items (7 with a session assessment component) | 0 | 8 | 0 | تلاوة هادئة ولطف صغير: يتلو الطفل قدرًا قصيرًا مع كبير في وقت هادئ، ويفعل لطفًا صغيرًا لأحد في البيت. |

Evidence (program level): capstone **حقيبة نعمي** — بطاقة رسم خاصة بالطفل يحتفظ بها، ولا تُعرض على أحد ما لم يشأ.


**P17 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P17-A | 5 items (3 with a session assessment component) | 0 | 1 | 0 | عمل رحيم صغير: ينفذ الطفل عملًا لطيفًا صغيرًا مع كبير، كأن يقدّم ماءً أو يعين صديقًا. |
| P17-B | 4 items (3 with a session assessment component) | 1 | 0 | 1 | ثلاث نعم اليوم: يذكر الطفل ثلاث نعم من يومه ويشكر من كان سببًا في إحداها. |
| P17-C | 6 items (4 with a session assessment component) | 1 | 1 | 0 | خُلُق نجرّبه: يختار الطفل مع كبير خُلُقًا من حكاية سمعها ويجرّبه في بيته أسبوعًا. |

Evidence (program level): capstone **بطاقتي الجميلة** — بطاقة خاصة بالطفل، لا تُقيَّم ولا تُقارَن.


**P03 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P03-A | 7 items (6 with a session assessment component) | 1 | 2 | 0 | أسبوع الاعتراف الهادئ: يخبر الطفل الكبير الذي معه بخطأ صغير إن وقع منه وأراد، بالخطوات الثلاث: ماذا حدث؟ ماذا أصلح؟ ماذا أفعل غدًا؟ |
| P03-B | 5 items (5 with a session assessment component) | 2 | 1 | 0 | سجل الاستعارة: يستعير غرضًا ويكتب متى رده، ويؤدي أمانة صغيرة. |
| P03-C | 8 items (7 with a session assessment component) | 1 | 3 | 0 | عمل بر صغير: يقول الطفل كلمة شكر لمن يرعاه، ويقوم بعمل بر صغير منتظم، ويتصل بقريب بموافقة. |

Evidence (program level): capstone **ثلاث بطاقات: صدقتُ، حفظتُ، بررتُ** — بطاقات خاصة بالطفل، يحكيها لمن يثق به إن أحب.


**P04 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P04-A | 6 items (5 with a session assessment component) | 1 | 2 | 0 | مهمة اللطف: ينفذ الطفل عملًا رحيمًا صغيرًا خطط له مع كبير. |
| P04-B | 4 items (4 with a session assessment component) | 1 | 1 | 0 | قسمة بإنصاف: يقسم الطفل مهمة بين إخوته أو أصدقائه بإنصاف بإشراف كبير. |
| P04-C | 7 items (6 with a session assessment component) | 1 | 3 | 0 | جملة شكر لمن صحح لي: يشكر الطفل من صحح له خطأً بالجملة الثلاثية. |
| P04-D | 3 items (3 with a session assessment component) | 1 | 2 | 0 | نعمة تنفع: يستعمل الطفل نعمة عنده لنفع غيره بعمل صغير. |

Evidence (program level): capstone **شجرة أخلاقي** — رسم خاص بالطفل، لا يُقيَّم ولا يُقارَن.


**Gaps flagged for human review**

- G-TW5-1 (repetition, not merge): the validator reports repeated competency-levels across P01 and P17 (for example `C6` L1 is taught by `C6-L1`/`E12-L1` in P01 and by `Y1-L4` in P17 for overlapping ages). They differ in context (P01 with a teacher, P17 with a guardian and seerah stories). V3 §4.3: keep when age/context differs; the reviewer decides which entry point to recommend, and any "don't repeat" rule is shown as a recommendation, not a block.
- G-TW5-2 (time): P01 core 234′ of 315′ declared (74%); P17 181′ of 300′ (60%); P03 400′/525′ (76%); P04 430′/630′ (68%).
- G-TW5-3 (adult presence): P01 and P17 are designed with an adult present; the UI must not present them as solo child activities and must keep the private-notebook wording accurate.
- G-TW5-4 (seerah content): P17-C stories are scholarly content; the named scholarly reviewer is required before display. Nothing is auto-generated or approved.
- G-TW5-5 (optional links): P01 has 4 optional links (`Y1-L7`, `Y1-L8`, `Y1-L9`, `Y1-S4`: short listening sessions) that are "optional, outside program time and progress".
- Generated checks for this path's programs:
  - P01: Pacing: 20 core sessions against 21 declared slots (7 weeks × 3). Pacing should be derived from core sessions (≈ 7 weeks at 3/week), not from the weeks field. Reviewer to confirm.
  - P01: Assessment coverage: 8 of 20 core sessions have no `assessment` component (they are scenario sessions or short sessions); decide whether a descriptive observation is expected there.
  - P01: Review gate (nothing approved): مراجعة تربوية نمائية، ومراجع حماية للطفل، ومراجع علمي لنص التلاوة المختار; named reviewers required by the data: scholarly, pedagogical, child_protection.
  - P01: Repetition: 16 validator warning(s) that a competency level is also taught elsewhere at overlapping ages (see `scripts/validate_coherence.py --program P01 --verbose`); these are the duplication candidates for REORGANIZE/CONNECT decisions, not merges.
  - P17: Timing: planned core content is 181′ against 300′ declared (60%); the declared rhythm and the real content disagree. Decision for the pedagogical reviewer: shorten the declared rhythm, or add content under the V3 §13 gate (never padding).
  - P17: Assessment coverage: 5 of 15 core sessions have no `assessment` component (they are scenario sessions or short sessions); decide whether a descriptive observation is expected there.
  - P17: Review gate (nothing approved): مراجعة تربوية وحماية الطفل ومراجعة علمية للنصوص; named reviewers required by the data: scholarly, pedagogical, child_protection.
  - P17: Repetition: 10 validator warning(s) that a competency level is also taught elsewhere at overlapping ages (see `scripts/validate_coherence.py --program P17 --verbose`); these are the duplication candidates for REORGANIZE/CONNECT decisions, not merges.
  - P03: Pacing: 20 core sessions against 21 declared slots (7 weeks × 3). Pacing should be derived from core sessions (≈ 7 weeks at 3/week), not from the weeks field. Reviewer to confirm.
  - P03: Assessment coverage: 2 of 20 core sessions have no `assessment` component (they are scenario sessions or short sessions); decide whether a descriptive observation is expected there.
  - P03: Review gate (nothing approved): مراجعة تربوية نمائية وحماية الطفل ومراجعة علمية للنصوص الدينية; named reviewers required by the data: scholarly, pedagogical, child_protection.
  - P03: Repetition: 4 validator warning(s) that a competency level is also taught elsewhere at overlapping ages (see `scripts/validate_coherence.py --program P03 --verbose`); these are the duplication candidates for REORGANIZE/CONNECT decisions, not merges.
  - P04: Timing: planned core content is 430′ against 630′ declared (68%); the declared rhythm and the real content disagree. Decision for the pedagogical reviewer: shorten the declared rhythm, or add content under the V3 §13 gate (never padding).
  - P04: Pacing: 20 core sessions against 21 declared slots (7 weeks × 3). Pacing should be derived from core sessions (≈ 7 weeks at 3/week), not from the weeks field. Reviewer to confirm.
  - P04: Assessment coverage: 2 of 20 core sessions have no `assessment` component (they are scenario sessions or short sessions); decide whether a descriptive observation is expected there.
  - P04: Review gate (nothing approved): مراجعة تربوية وحماية الطفل ومراجعة علمية للنصوص; named reviewers required by the data: scholarly, pedagogical, child_protection.
  - P04: Repetition: 4 validator warning(s) that a competency level is also taught elsewhere at overlapping ages (see `scripts/validate_coherence.py --program P04 --verbose`); these are the duplication candidates for REORGANIZE/CONNECT decisions, not merges.

### TW-6 — العادات اليومية والمثابرة والأمانة اليومية

*Habits, perseverance, everyday trust.* Programs reused (real ids): P18, P19.

**Sequence, prerequisites, ages, rhythm**

| Program | slug | Title | Ages | status | Hard prerequisites (verbatim) | Soft `next_programs` | Declared rhythm | Core sessions | Planned core min / declared |
|---|---|---|---|---|---|---|---|---|---|
| P18 | `sakina-istigha-wa-adat` | أسمع بهدوء وأرتّب يومي | 7–8 | planned | P17 أو ما يعادله | P19, P20 | 6w × 3 × 20′ = 18 slots | 18 (12L+6S) + 14 optional_link | 295′ / 360′ (82%) |
| P19 | `amana-wa-muthabara` | أمانتي ومثابرتي وأسئلتي وكلامي اللطيف | 8 | planned | P01 أو ما يعادله | P20, P22 | 8w × 3 × 25′ = 24 slots | 24 (18L+6S) + 9 optional_link | 505′ / 600′ (84%) |

**Why this order.** **P18** (ages 7–8; prerequisite P17) teaches listening/turn-taking (`E10-A`, `E17-A`), habit growth (`S3`, `X4-A`) and a calm routine (`E20-A`). **P19** (age 8; prerequisite P01) adds trust/ownership, perseverance, good questions and clear kind speech (`C2`, `S4`, `T1`, `R2`). P18's soft next is P19 and P20 (Quran nucleus); P19's soft next is P20 and P22.

**Cross-links.** P18 → P20 (Quran domain). P19 → P22 (TW-11). P18-C/D (`S3`, `X4-A`) is the upstream seed of TW-1.

**Units (stages), items and sessions reused**

**P18 — أسمع بهدوء وأرتّب يومي** (`sakina-istigha-wa-adat`): يجلس الطفل بهدوء ليسمع تلاوة قصيرة ويردّد بعد معلمه، وينتظر نوبته في الكلام ويعيد ما سمع، ويتابع عادة صغيرة، ويرتّب مكانه وأدواته ومساءه وصباحه.

- **P18-A** أسمع وأردّد (weeks 1; sessions 1–4): `E10-L1` أهيّئ جلستي ثم أسمع وأردّد (7-8)؛ `E10-L2` موعدي القصير بعد شيء أفعله كل يوم (7-8)؛ `E17-L1` شردتُ فعدتُ: علامتي للرجوع إلى الصوت (7-8)؛ `E10-S1` ضيوف في وقت موعدي (7+)؛ `E17-S1` ضاعت مني الكلمة وأنا أسمع (7+) *[optional_link]*
- **P18-B** لكل متكلم نوبة (weeks 2; sessions 6–11): `E17-L2` سؤال يبدو غريبًا: أُصغي ولا أضحك (7-8)؛ `E10-L3` أنتظر نوبتي ولا تضيع فكرتي (7-8)؛ `E17-L3` لطفٌ صغير أكرّره حتى يخفّ (7-8) *[optional_link]*؛ `E17-L4` سؤال واحد ثم أُصغي (7-8) *[optional_link]*؛ `E10-L4` أقول ما سمعت وأسأل عمّا غمض (7-8)؛ `E10-S2` فكرتي تكاد تضيع (7+)
- **P18-C** مكاني وعادتي تنمو (weeks 3-4; sessions 12–17): `S3-L1` البذرة الصغيرة (6-9)؛ `X4-L1` لكل شيء مكانٌ أعرفه (6-8)؛ `S3-L2` كيف تنمو العادة؟ (6-9)؛ `S3-S1` السلسلة المقطوعة (6+)؛ `X4-L2` أدواتي وعنايتي بنفسي (7-9)؛ `X4-S1` أين ذهب القلم؟ (6+)
- **P18-D** عادتي أسبوعًا وروتيني الهادئ (weeks 5-6; sessions 20–27): `E20-L1` تذكيرٌ لطيف يعينني (7-8) *[optional_link]*؛ `E20-L3` لماذا أفعل عادتي؟ غايتي قبل خاناتي (7-8) *[optional_link]*؛ `S3-L3` أتابع عادتي سبعة أيام (6-12)؛ `E20-L2` أستريح ثم أعود بنسخة الجيب (7-8) *[optional_link]*؛ `X4-L3` ليلتي وصباحي بلا عجلة (7-9)؛ `E20-L4` ركن المساء: أسمع قليلًا وأحكي صباحًا (7-8) *[optional_link]*؛ `S3-S2` كل واحد وسرعته (6+)؛ `E20-S1` علبتي ونداء رافع (7+) *[optional_link]*؛ `E17-S2` جارتنا لم تردّ تحيتي (7+) *[optional_link]*؛ `X4-S2` ركن الألعاب الذي نتشاركه (7+)؛ `E20-S2` صفحة مهدي والزكام (7+) *[optional_link]*؛ `Y1-L10` لكل متكلم نوبة (6) *[optional_link]*؛ `Y1-L11` لماذا ننتظر؟ (6) *[optional_link]*؛ `Y1-L12` أقول ما سمعت (6) *[optional_link]*؛ `Y1-S5` أريد أن أتكلم الآن (6+) *[optional_link]*

**P19 — أمانتي ومثابرتي وأسئلتي وكلامي اللطيف** (`amana-wa-muthabara`): يحفظ الطفل ما أُعير له ويعيده في وقته، ويكمل مهمته بخطوات صغيرة، ويقول لم أفهم دون خجل، ويقول ما يشعر به بكلام واضح ولطيف.

- **P19-A** عندي وليست لي (weeks 1-3; sessions 1–9): `Y2-L1` عندي وليست لي (7-8)؛ `Y2-L2` لي أم عندي؟ (7-8)؛ `Y2-L3` مفاجأة جميلة وسرّ يقلقني (7-8)؛ `E11-L1` أقول متى سأعيدها (8-9)؛ `E11-L2` تأخرتُ: أخبر قبل الموعد (8-9)؛ `Y2-S1` الكتاب المستعار (7+)؛ `E11-L3` أستأذن صاحبها (8-9)؛ `E11-S1` الكرة التي انتقلت (8+)؛ `E11-S2` الموعد يقترب (8+)
- **P19-B** خطوة صغيرة وأكمل (weeks 4-5; sessions 10–17): `Y2-L4` أسمّي ما أشعر به حين يصعب الأمر (7-8)؛ `E18-L1` كم أستطيع اليوم؟ قدر يومي (8-9) *[optional_link]*؛ `Y2-L5` ثلاثة وجوه للصبر (7-8)؛ `E18-L2` أريد الآن وأريد أن أكمل (8-9)؛ `E18-L3` تعبتُ حقًّا: أقول وأرتاح (8-9)؛ `Y2-L6` خطوة صغيرة كل يوم (7-8)؛ `E18-L4` فاتني يوم؟ أعود وأكتب ما أعانني (8-9)؛ `Y2-S2` الأحجية الكبيرة (7+)؛ `E18-S1` جسر وضّاح الكرتوني (8+) *[optional_link]*؛ `E18-S2` دفتر الغيوم (8+) *[optional_link]*
- **P19-C** أسئلتي تعينني (weeks 6; sessions 20–23): `Y2-L7` أقول: لم أفهم (7-8)؛ `Y2-L8` سؤال أفهم به وسؤال أحرج به (7-8)؛ `Y2-L9` ثلاثة أسئلة قبل أن أحكم (7-8)؛ `Y2-S3` قواعد اللعبة الجديدة (7+)
- **P19-D** كلام واضح ولطيف (weeks 7-8; sessions 24–31): `Y2-L10` أقول ما أشعر به وما أحتاجه (8)؛ `E19-L1` هل هذا وقت مناسب؟ وأين أقول؟ (8-9) *[optional_link]*؛ `Y2-L11` كلمة تفرح وكلمة تجرح (8)؛ `E19-L2` كلمة آلمتني: أتوقف لحظة ثم أقول (8-9) *[optional_link]*؛ `E19-L3` آسف، وهذا ما حدث: أعتذر وأقبل الاعتذار (8-9) *[optional_link]*؛ `E19-L4` تحية أحسن وشكر يقول ما فعلوا لي (8-9) *[optional_link]*؛ `Y2-L12` طلب لطيف وملاحظة صغيرة (8)؛ `Y2-S4` الكرة في الملعب (8+)؛ `E19-S1` كوب الماء على دفتر أنور (8+) *[optional_link]*؛ `E19-S2` كلمة في الطابور (8+) *[optional_link]*

**Assessments by type**

**P18 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P18-A | 4 items (3 with a session assessment component) | 0 | 2 | 0 | موعدي القصير: يلتزم الطفل موعدًا قصيرًا ثابتًا مع معلمه أو وليّه ليسمع ويردّد. |
| P18-B | 4 items (3 with a session assessment component) | 1 | 2 | 0 | أقول ما سمعت: يعيد الطفل بكلماته ما قاله له كبير ثم يتكلم في نوبته. |
| P18-C | 6 items (4 with a session assessment component) | 1 | 1 | 0 | ركني المرتّب: يرتّب الطفل مكانًا لأغراضه ويجهّز أدواته مع كبير. |
| P18-D | 4 items (2 with a session assessment component) | 0 | 2 | 0 | عادتي سبعة أيام: يختار الطفل مع أهله عادة صغيرة جدًّا ويعلّم عليها كل يوم. |

Evidence (program level): capstone **جدولي الهادئ** — رسم خاص بالطفل، لا يُقيَّم ولا يُقارَن.


**P19 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P19-A | 9 items (6 with a session assessment component) | 1 | 2 | 0 | كتاب أعيده: يستعير الطفل شيئًا بسيطًا من أحد ويعيده في وقته ويشكره. |
| P19-B | 7 items (6 with a session assessment component) | 2 | 2 | 1 | مهمة بخطوات: يقسم الطفل مهمة كبيرة إلى خطوات صغيرة ويكمل خطوة كل يوم. |
| P19-C | 4 items (3 with a session assessment component) | 0 | 1 | 0 | ثلاثة أسئلة: يسأل الطفل ثلاثة أسئلة بسيطة عن كلام لم يفهمه قبل أن يحكم عليه. |
| P19-D | 4 items (3 with a session assessment component) | 0 | 1 | 0 | طلب لطيف: يصوغ الطفل طلبًا لطيفًا وملاحظة صغيرة لصديقه على انفراد. |

Evidence (program level): capstone **صندوق كلماتي** — صندوق خاص بالطفل، لا يُقيَّم ولا يُقارَن.


**Gaps flagged for human review**

- G-TW6-1 (inflated session count): P18 has 14 optional links (`E17-*`, `E20-*`, `Y1-L10..L12`, `Y1-S5`) and P19 has 9 (`E18-*`, `E19-*`); their sessions make P18 look like 32 sessions and P19 like 33 against 18 and 24 declared slots. Core sessions match the declared slots exactly.
- G-TW6-2 (overlap): P02 and P18 teach `S3`/`K4` at the same ages (7–8); the audit ranks them 1 and 2 for severity (35, 34) and calls P18 a mirror of P02. Candidate: keep both, mark one as the recommended entry per age and family; do not merge.
- G-TW6-3 (owner decision pending): `lessons_X4.json` asks whether the daily-habit units (`X4-A` in P18, `X4-B` in P22) merge into `S3`/`S2` or stay independent, and requires a pedagogical, scientific and child-protection reviewer and confirmation that they contain no health or religious ruling.
- G-TW6-4 (age): a lesson written for age 6 only sits in a program whose age_min is 7 (validator warning).
- G-TW6-5 (prerequisite): P19's `R2` needs `R1`; `R1` is taught in P18 and P05, and P19 reaches P18 only through the soft edge P18.next. The validator does not flag it; recorded here so the edge is not trimmed.
- Generated checks for this path's programs:
  - P18: Assessment coverage: 6 of 18 core sessions have no `assessment` component (they are scenario sessions or short sessions); decide whether a descriptive observation is expected there.
  - P18: Owner decision pending in `lessons/lessons_X4.json` (`needs_owner_decision`): قرار الجهة المسؤولة عن المنصة: هل تُدمج وحدتا العادات اليومية (٥–١٤) في مسار S3/S2 القائم أو تبقيان وحدتين مستقلتين، وتسمية المراجعين التربوي والعلمي ومختص حماية الطفل، وتأكيد خلوّ الوحدتين من أي مضمون صحي أو شرعي قبل الدمج.…
  - P18: Review gate (nothing approved): مراجعة تربوية وحماية الطفل ومراجعة علمية للنصوص; named reviewers required by the data: scholarly, pedagogical, child_protection.
  - P18: Repetition: 4 validator warning(s) that a competency level is also taught elsewhere at overlapping ages (see `scripts/validate_coherence.py --program P18 --verbose`); these are the duplication candidates for REORGANIZE/CONNECT decisions, not merges.
  - P19: Sequence: competency prerequisite not covered by the program or its (declared + inverse `next_programs`) predecessors — R2 needs R1.
  - P19: Assessment coverage: 6 of 24 core sessions have no `assessment` component (they are scenario sessions or short sessions); decide whether a descriptive observation is expected there.
  - P19: Review gate (nothing approved): مراجعة تربوية وحماية الطفل ومراجعة علمية للنصوص; named reviewers required by the data: scholarly, pedagogical, child_protection.
  - P19: Repetition: 23 validator warning(s) that a competency level is also taught elsewhere at overlapping ages (see `scripts/validate_coherence.py --program P19 --verbose`); these are the duplication candidates for REORGANIZE/CONNECT decisions, not merges.
  - P18 (validator Age warning): lesson written for ages 6-6, all below program age_min 7 (content for younger learners)

### TW-7 — أتثبّت وأستدل وأبحث

*Verify, reason, research (foundation of TW-4).* Programs reused (real ids): P06, P09.

**Sequence, prerequisites, ages, rhythm**

| Program | slug | Title | Ages | status | Hard prerequisites (verbatim) | Soft `next_programs` | Declared rhythm | Core sessions | Planned core min / declared |
|---|---|---|---|---|---|---|---|---|---|
| P06 | `atathabbat` | أتثبّت قبل أن أصدّق | 11–12 | pilot | — | P09, P21 | 8w × 2 × 40′ = 16 slots | 20 (12L+8S) | 529′ / 640′ (83%) |
| P09 | `abhath-wa-astadill` | أميّز وأستدل وأبحث | 14–17 | planned | P06 أو ما يعادله | P10, P13 | 8w × 2 × 45′ = 16 slots | 20 (14L+6S) | 613′ / 720′ (85%) |

**Why this order.** **P06** (ages 11–12, pilot, no prerequisite) → **P09** (ages 14–17, band b8 "الباحث", prerequisite P06). Together: context (K1), source and verification (K2), evidence and fallacies (T2), problem solving (T5), then text/explanation/opinion (K3), claim and evidence (T3), research and verification (T6). P06 is listed as the hard prerequisite of P09, P21 (soft/hard) and P24.

**Cross-links.** P06 → P21-B (Q4 tadabbur needs K1: Quran domain). P09 → P10 (TW-4), P13 (TW-9). P23 (Quran domain) teaches `H4` documenting reports.

**Units (stages), items and sessions reused**

**P06 — أتثبّت قبل أن أصدّق** (`atathabbat`): يسمّي المتعلم مصدر الخبر، ويفهم السياق، ويكشف تعميمًا متسرعًا، ويحل مشكلة بخطوات، ثم يقرر قبل أن ينشر.

- **P06-A** أفهم الكلام في سياقه (weeks 1-2; sessions 1–5): `K1-L1` أربعة أسئلة قبل أن أفهم (10-12)؛ `K1-S1` الرسالة المقتطعة (10+)؛ `K1-L2` الجملة المقتطعة ليست الجملة كاملة (10-12)؛ `K1-S2` سؤال واحد وجوابان (10+)؛ `K1-L3` المعنى الحرفي والمقصود (11-14)
- **P06-B** من قال؟ وكيف عرف؟ (weeks 3-4; sessions 6–10): `K2-L1` من قال؟ وكيف عرف؟ (10-12)؛ `K2-L2` لماذا نتحقق؟ مصدر ثانٍ مستقل (10-12)؛ `K2-S1` رسالة إلغاء الرحلة (10+)؛ `K2-L3` قائمة الفحص والقرار (10-12)؛ `K2-S2` خبر صحيح لكنه يؤذي (10+)
- **P06-C** ما الدليل؟ (weeks 5-6; sessions 11–15): `T2-L1` سؤال التوقف: ما الدليل؟ (10-12)؛ `T2-S1` قلم الخط الجميل (10+)؛ `T2-L2` لماذا هذه مغالطة؟ (10-12)؛ `T2-S2` اللعبة والامتحان (10+)؛ `T2-L3` قائمة المغالطات: أكشفها بنفسي (11-13)
- **P06-D** أحل المشكلة بخطوات (weeks 7-8; sessions 16–20): `T5-L1` ما المشكلة بجملة؟ (10-12)؛ `T5-L2` من أين جاءت؟ وما الذي نقص؟ (10-12)؛ `T5-L3` أقترح حلولًا وأجرّب (10-12)؛ `T5-S1` الجسر المنهار (10+)؛ `T5-S2` الغرفة الفوضوية (10+)

**P09 — أميّز وأستدل وأبحث** (`abhath-wa-astadill`): يميّز المتعلم النص من الشرح والرأي، ويبني استدلالًا ويقدّر قوة دليله، ويجد مصدرًا ويفحصه ويقارن بين مصدرين.

- **P09-A** نص وشرح ورأي (weeks 1-3; sessions 1–7): `K3-L1` لكل نص شرح (12-14)؛ `K3-L2` من قال؟ وبأي مرتبة؟ (12-14)؛ `K3-S1` نادي القراءة (12+)؛ `K3-L3` لعبة نص وشرح ورأي (12-14)؛ `K3-S2` هذه هي الطريقة الوحيدة (12+)؛ `K3-L4` أصنّف مقاطع جديدة وأعلّل (13-14)؛ `K3-L5` أشرح التمييز لغيري (13-14)
- **P09-B** الدعوى والدليل (weeks 4-5; sessions 8–14): `T3-L1` لكل حكم دليل (12-13)؛ `T3-L2` الدعوى والدليل والنتيجة (12-14)؛ `T3-S1` اختيار كتاب المراجعة (12+)؛ `T3-S2` الفريق والنتيجة الكبيرة (12+)؛ `T3-L3` سلّم الدليل: قوي أم متوسط أم ضعيف (13-15)؛ `T3-L4` أقيّم حجة غيري بلطف (14-16)؛ `T2-L4` نص جديد وحجة بديلة (12-14)
- **P09-C** أبحث وأتحقق (weeks 6-8; sessions 15–20): `T6-L1` هدفي التعليمي (12-13)؛ `T6-L2` أجد مصدرًا وأفحصه (12-13)؛ `T6-S1` الملخص الذي يشبه الأصل (12+)؛ `T6-L3` ألخّص بكلماتي وأقابل (13-14)؛ `T6-L4` أقارن مصدرين (14-16)؛ `T6-S2` مصدران يختلفان (12+)

**Assessments by type**

**P06 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P06-A | 5 items (3 with a session assessment component) | 2 | 0 | 0 | لافتة من يومي: يختار المتعلم لافتة أو رسالة عامة ويسمّي المتكلم والمخاطَب والموقف. |
| P06-B | 5 items (3 with a session assessment component) | 1 | 2 | 0 | أؤخر المشاركة: يؤخر المتعلم مشاركة خبر حتى يسأل شخصًا موثوقًا. |
| P06-C | 5 items (3 with a session assessment component) | 0 | 1 | 0 | أكشف مغالطة: يكشف المتعلم مغالطة في إعلان أو عبارة عامة ويدوّنها مع سؤال الكشف. |
| P06-D | 5 items (3 with a session assessment component) | 1 | 0 | 0 | مشكلة بيتية بخريطة: يحل المتعلم مشكلة حقيقية في البيت مع أهله بخريطة المشكلة. |

Evidence (program level): capstone **مشروع الخبر** — ورقة قرار خاصة بالمتعلم.


**P09 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P09-A | 7 items (7 with a session assessment component) | 0 | 2 | 0 | ثلاث جمل: يكتب المتعلم ثلاث جمل عن موضوع يعرفه: نصًّا وشرحًا ورأيًا، ويسمّي كل واحدة. |
| P09-B | 7 items (7 with a session assessment component) | 2 | 1 | 0 | بطاقة الحجة: يملأ المتعلم بطاقة الحجة لقرار صغير في حياته ويقدّم ملاحظة على حجة صديق بسؤال لا بحكم. |
| P09-C | 6 items (6 with a session assessment component) | 0 | 3 | 0 | قراءة أسبوعية ومقارنة مصدرين: يقرأ المتعلم مقالًا قصيرًا مرشحًا ويدوّن ما تعلمه وما سأل عنه، ويقارن مصدرين مرشحين. |

Evidence (program level): capstone **ملف بحث صغير** — ملف خاص بالمتعلم.


**Gaps flagged for human review**

- G-TW7-1 (age gap): P06 ends at 12 and P09 starts at 14; P09's first lessons (`T3-L1`, `T6-L1`, `T6-L2`, and the K3 lessons at 12–14) are written for 12–13. A 13-year-old has content but no program that admits them. Options: lower P09 `age_min` or surface K3/T3 as the bridge — reviewer decision, not made here.
- G-TW7-2 (religious source texts): P06 and P09 use short texts for citation practice; P06's gating requires a **named scholarly reviewer** for those texts. Nothing is approved.
- G-TW7-3 (L5 rule): P09-A has `K3-L5` ("أشرح التمييز لغيري", ages 13–14) — a level-L5 "teach others" lesson. PEDAGOGY marks L5 as adults only and never teaching children without supervision. Flag for the reviewer.
- G-TW7-4 (time): P06 529′/640′ (83%), P09 613′/720′ (85%): acceptable; no action.
- Generated checks for this path's programs:
  - P06: Pacing: 20 core sessions against 16 declared slots (8 weeks × 2). Pacing should be derived from core sessions (≈ 10 weeks at 2/week), not from the weeks field. Reviewer to confirm.
  - P06: Assessment coverage: 8 of 20 core sessions have no `assessment` component (they are scenario sessions or short sessions); decide whether a descriptive observation is expected there.
  - P06: Review gate (nothing approved): مراجع علمي مسمّى لنصوص الاستشهاد، ومراجع تربوي نمائي، ومراجع حماية; named reviewers required by the data: scholarly, pedagogical, child_protection.
  - P09: Pacing: 20 core sessions against 16 declared slots (8 weeks × 2). Pacing should be derived from core sessions (≈ 10 weeks at 2/week), not from the weeks field. Reviewer to confirm.
  - P09: Age: lesson(s) written entirely outside the program band — `T3-L1` (12-13), `T6-L1` (12-13), `T6-L2` (12-13). Keep (labelled in UI today by `acAgeOut`) or replace by an age-fitting lesson; never edit the original.
  - P09: Review gate (nothing approved): مراجع علمي ومراجع تربوي نمائي; named reviewers required by the data: scholarly, pedagogical, child_protection.
  - P09 (validator Age warning): lesson written for ages 12-13, all below program age_min 14 (content for younger learners)

### TW-8 — المال والعمل والمبادرة

*Money, work, initiative.* Programs reused (real ids): P11, P12, P24.

**Sequence, prerequisites, ages, rhythm**

| Program | slug | Title | Ages | status | Hard prerequisites (verbatim) | Soft `next_programs` | Declared rhythm | Core sessions | Planned core min / declared |
|---|---|---|---|---|---|---|---|---|---|
| P11 | `mali-wa-mubadarati` | مالي ومبادرتي | 15–17 | planned | P08 أو ما يعادله | P12, P13 | 8w × 2 × 55′ = 16 slots | 15 (10L+5S) | 538′ / 880′ (61%) |
| P12 | `amanat-al-amal` | أمانة العمل والعهد | 16+ | planned | P08 أو P11 أو ما يعادلهما | P13, P14 | 6w × 2 × 45′ = 12 slots | 13 (9L+4S) | 421′ / 540′ (78%) |
| P24 | `amal-ma3rifa-maharat` | العمل والمعرفة والمهارات اليومية | 18+ | pilot | P06 أو ما يعادله (التثبّت وفهم النص); P09 أو ما يعادله (التمييز والبحث); P10 أو ما يعادله (القرار); P25 أو ما يعادله (مراجعة النفس وتنظيم الوقت) | P14 | 8w × 3 × 50′ = 24 slots | 34 (22L+12S) + 4 optional_link | 1142′ / 1200′ (95%) |

**Why this order.** **P11** (ages 15–17; prerequisite P08), **P12** (age 16+; "P08 أو P11") and **P24** (age 18+; prerequisites P06, P09, P10, P25). P11 deals with money as servant (W2), initiative (W4) and cooperation (L4, R3); P12 with professional trust (W1, W3, C2); P24 with money/agreements/work (P24-A), honest research (P24-B) and a private notebook (P24-C, E22 alternatives for adult age).

**Cross-links.** P12 → P13, P14 (TW-9). P24 → P14. P24 needs P06, P09, P10 (TW-7, TW-4) and P25 (TW-1).

**Units (stages), items and sessions reused**

**P11 — مالي ومبادرتي** (`mali-wa-mubadarati`): يضع المتعلم ميزانية صغيرة ويدّخر لهدف قريب، ويلاحظ مشكلة ويبادر، وينفذ مشروع خدمة ويتعلم من أثره.

- **P11-A** المال خادم لا سيّد (weeks 1-3; sessions 1–6): `W2-L1` المال خادم لا سيّد (12-17)؛ `W2-L2` الحاجة والرغبة والهدف (12-17)؛ `W2-S1` مصروف الشهر وثلاث رغبات (12+)؛ `W2-L3` ميزانيتي الصغيرة (12-17)؛ `W2-S2` هدف الادخار والإغراء (13+)؛ `W2-L4` ادّخار لهدف قريب (13-17)
- **P11-B** أبادر بخطوة (weeks 4-6; sessions 7–12): `W4-L1` العمل أوسع من الوظيفة (14-17)؛ `W4-L2` أسمّي مبادرة ممكنة (14-17)؛ `W4-S1` الرف المبعثر (14+)؛ `W4-S2` مبادرة تعثرت (14+)؛ `W4-L3` مشروع خدمة مصغّر (14-17)؛ `W4-L4` أقود مشروعًا صغيرًا وأتعلم من أثره (15-17)
- **P11-C** نعمل معًا ونصلح (weeks 7-8; sessions 13–15): `L4-S2` ركن الكتب (12+)؛ `L4-L3` مشروع خدمة صغير وإصلاح ذات البين (13-17)؛ `R3-L4` خطوات تحل الخلاف وتحفظ العلاقة (12-14)

**P12 — أمانة العمل والعهد** (`amanat-al-amal`): يلتزم المتعلم بمهمة ووقت، ويعالج تقصيره بالإبلاغ المبكر والإصلاح، ويقرأ اتفاقًا بسيطًا ويسأل قبل الموافقة.

- **P12-A** أتقن وأفي (weeks 1-3; sessions 1–7): `W1-L1` ما الإتقان؟ (16+)؛ `W1-L2` حق العمل وحق الناس (16+)؛ `W1-S1` المهمة الناقصة (16+)؛ `W1-L3` أفي بالوقت والمهمة (16+)؛ `W1-S2` السر والسلامة (16+)؛ `W1-L4` تقصير وإصلاح (16+)؛ `W1-L5` أصنع ثقافة أمانة (16+)
- **P12-B** الاتفاق عهد (weeks 4-6; sessions 8–13): `W3-L1` الاتفاق عهد (16-17)؛ `W3-S1` وعد السبت (16+)؛ `W3-L2` الوفاء والإنصاف (16-17)؛ `W3-S2` اشتراك التطبيق التجريبي (16+)؛ `W3-L3` ما الذي اتفقنا عليه؟ قراءة اتفاق بسيط (16-17)؛ `W3-L4` أحلّل وأسأل: اتفاق خدمة بين صديقين (16-17)

**P24 — العمل والمعرفة والمهارات اليومية** (`amal-ma3rifa-maharat`): يضع المتعلم ميزانية صغيرة ويفي بما التزم به، ويسأل أسئلة الاتفاق الواضح ويعرف حقوقه وحقوق غيره، وينتقل من موضوع واسع إلى سؤال بحثي ويوثّق بأمانة، ويستعمل دفتره الخاص لمراجعة يومه وحل مشكلاته وقراراته.

- **P24-A** مالي واتفاقي وعملي (weeks 1-3; sessions 1–10): `X1-L1` أعرف ما يدخل وما يخرج (18+)؛ `X1-L2` حاجة أم رغبة؟ ميزانية صغيرة تشبهني (18+)؛ `X1-L3` ما التزمتُ به: الدَّين والوفاء بالوعد (18+)؛ `X1-S1` فاتورة لم تكن في الحساب (18+)؛ `X1-S2` أبلغه قبل الموعد (18+)؛ `X1-L4` ما الذي اتفقنا عليه؟ (18+)؛ `X1-L5` العمل الشريف وإتقانه (18+)؛ `X1-L6` حقوقي وحقوق غيري في العمل: وعي عام (18+)؛ `X1-S3` عرض عمل بلا تفاصيل (18+)؛ `X1-S4` ساعات إضافية بلا ترتيب (18+)
- **P24-B** باحث أمين (weeks 4-5; sessions 11–20): `X2-L1` من موضوع واسع إلى سؤال بحثي (16-18)؛ `X2-L2` المصدر الأولي والثانوي: من شهد ومن نقل (16-18)؛ `X2-L3` التوثيق الأمين: أنسب القول إلى صاحبه (16-18)؛ `X2-S1` الفقرة التي بلا اسم (16+)؛ `X2-S2` تاريخان لحدث واحد (16+)؛ `X2-L4` حين يختلف أهل العلم: أعرض ولا أرجّح (18+)؛ `X2-L5` نص أم شرح أم رأي؟ فرز العبارات (16-18)؛ `X2-L6` حدود الباحث: متى أقول «لا أعرف» ولمن أحيل (16-18)؛ `X2-S3` من الأصحّ؟ في حلقة الدراسة (16+)؛ `X2-S4` رسالة من لينا (16+)
- **P24-C** دفتري الخاص (weeks 6-8; sessions 21–38): `Z1-L1` دفتر لي وحدي: ثلاثة أسطر في المساء (15-17)؛ `Z1-L2` من التقصير إلى قرار صغير (15-17)؛ `Z1-L3` ختام اليوم بشكر، ورفق في الحديث عن الدفتر (15-17)؛ `Z1-S1` ليلة بعد يوم ثقيل (15+)؛ `Z1-L4` أين أنا؟ وماذا أريد؟ وما الذي لا أعرفه بعد؟ (15-17)؛ `Z1-L5` أفعل، ألاحظ الأثر، أفهم السبب، أعدّل (15-17)؛ `Z1-L6` مشكلة تُحلّ أم شعور يُسمع؟ (15-17)؛ `Z1-S2` جدول لا يتسع (15+)؛ `Z1-L7` وقفة قبل القرار: ما الذي أشعر به وماذا أنوي؟ (15-17) *[optional_link]*؛ `E22-L1` لماذا أريد هذا؟ أسمّي دوافعي كلها بلا جلد (18+)؛ `E22-S2` هل أقبل قيادة الفريق؟ (18+)؛ `E22-L2` المشكلة التي تعود: أفرّق بين العَرَض والسبب (18+)؛ `Z1-L8` ورقة العمودين: ما أميل إليه وما قد أغفله (15-17) *[optional_link]*؛ `Z1-L9` من أستشير؟ ورقة المشورة (15-17) *[optional_link]*؛ `E22-L3` قرار على ظنٍّ راجح: لا أنتظر اليقين ولا أتعجل (18+)؛ `E22-S1` تأكيد قبل الأسبوع الأخير (18+)؛ `Z1-S3` رسالة جاهزة للإرسال (15+) *[optional_link]*؛ `E22-L4` أستشير بحسب نوع السؤال، وأنصح إن استُشرتُ (18+)

**Assessments by type**

**P11 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P11-A | 6 items (4 with a session assessment component) | 0 | 2 | 0 | ميزانية شهر: يضع المتعلم ميزانية بأربعة أبواب من مصروفه الحقيقي أو مبلغ افتراضي ويدّخر لهدف قريب. |
| P11-B | 6 items (4 with a session assessment component) | 1 | 1 | 0 | مشروع خدمة مصغّر: ينفذ المتعلم مبادرة خدمية صغيرة بأربع خطوات: المشكلة، أصغر خطوة، من يساعد، كيف نعرف أن النفع حصل. |
| P11-C | 3 items (2 with a session assessment component) | 0 | 1 | 0 | يوم تطوعي: يشارك المتعلم في يوم تطوعي بإشراف بالغ ويطبق خطوات حل الخلاف. |

Evidence (program level): capstone **مبادرتي وميزانيتي** — ملف خاص بالمتعلم.


**P12 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P12-A | 7 items (5 with a session assessment component) | 1 | 1 | 0 | ميثاق عمل شخصي: يكتب المتعلم ميثاق عمل من ثلاثة التزامات: وقت وجودة وصدق في الإبلاغ عن الخطأ. |
| P12-B | 6 items (4 with a session assessment component) | 1 | 0 | 0 | ورقة أسئلتي قبل أي اتفاق: يقرأ المتعلم شروط تطبيق يستعمله ويكتب أسئلته قبل أي اتفاق. |

Evidence (program level): capstone **ميثاقي وورقة أسئلتي** — ملف خاص بالمتعلم.


**P24 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P24-A | 10 items (6 with a session assessment component) | 0 | 0 | 2 | ميزانيتي واتفاقي: يضع المتعلم ميزانية صغيرة من أربعة أبواب ويكتب أسئلة الاتفاق لعمل فعلي أو خيالي. |
| P24-B | 10 items (6 with a session assessment component) | 1 | 0 | 0 | سؤال وتوثيق: يصوغ المتعلم سؤالًا بحثيًّا محدودًا ويوثّق مصدرين ويفصل المنقول عن المصاغ والرأي. |
| P24-C | 14 items (10 with a session assessment component) | 1 | 3 | 1 | ثلاثة أسطر في المساء: يكتب المتعلم في دفتره الخاص ثلاثة أسطر مساءً، ويجرّب ورقة العمودين قبل قرار صغير. |

Evidence (program level): capstone **ملفي العملي** — ملف خاص بالمتعلم، لا يُقيَّم ولا يُقارَن.


**Gaps flagged for human review**

- G-TW8-1 (deferred by policy): P11 has a non-empty `deferred_reason`: no verified moderate source on money; content is for 12–17, not adults; needs a financial reviewer and a platform decision. P12 touches contracts and work ethics (W1, W3).
- G-TW8-2 (owner decision files): `lessons_X1.json` (P24; W2/W3/W1 units) requires named scientific, pedagogical (adult protection) and contemporary financial/legal reviewers, confirmation of an adult 18+ audience and acceptance or removal of material on lenient debt collection and good repayment; "general education, not advice". `lessons_X2.json` (P24) asks whether the research units belong in P12/P13 or in a separate junior-researcher program.
- G-TW8-3 (age): `Z1-L1..L6` and scenarios `Z1-S1`, `Z1-S2` (P24-C, core) and `Z1-L7..L9`, `Z1-S3` (optional) are written for ages 15–17 inside an 18+ program; `E22-*` are the age-fitting alternatives (the E22 file says so). Keep the originals, label, prefer E22 for adults.
- G-TW8-4 (equivalence): P24 has four hard prerequisites, all "أو ما يعادله"; adults who did not take the child/teen programs have no ungraded readiness route.
- G-TW8-5 (W3/C2): `W3` needs `C2` (trust) and P24's hard prerequisites do not include P03/P19 where `C2` is taught; the sequence gate passes only via soft edges. Make explicit or advisory.
- G-TW8-6 (time): P11 538′/880′ (61%), P12 421′/540′ (78%); P24 1142′/1200′ (95%).
- Generated checks for this path's programs:
  - P11: Timing: planned core content is 538′ against 880′ declared (61%); the declared rhythm and the real content disagree. Decision for the pedagogical reviewer: shorten the declared rhythm, or add content under the V3 §13 gate (never padding).
  - P11: Pacing: 15 core sessions against 16 declared slots (8 weeks × 2). Pacing should be derived from core sessions (≈ 8 weeks at 2/week), not from the weeks field. Reviewer to confirm.
  - P11: Age: lesson(s) written entirely outside the program band — `R3-L4` (12-14). Keep (labelled in UI today by `acAgeOut`) or replace by an age-fitting lesson; never edit the original.
  - P11: Assessment coverage: 5 of 15 core sessions have no `assessment` component (they are scenario sessions or short sessions); decide whether a descriptive observation is expected there.
  - P11: Review gate (nothing approved): مراجع مالي مرخّص، مراجع تربوي، مراجع علمي; named reviewers required by the data: scholarly, pedagogical, financial_literacy, child_protection; deferred: لا مصدر وسطي محقَّق في المال (بحسب سياسة المنصة)؛ المحتوى للناشئة 12-17 لا للبالغين؛ يحتاج مراجعًا ماليًّا وقرار الجهة المسؤولة عن المنصة..
  - P12: Pacing: 13 core sessions against 12 declared slots (6 weeks × 2). Pacing should be derived from core sessions (≈ 7 weeks at 2/week), not from the weeks field. Reviewer to confirm.
  - P12: Assessment coverage: 4 of 13 core sessions have no `assessment` component (they are scenario sessions or short sessions); decide whether a descriptive observation is expected there.
  - P12: Review gate (nothing approved): مراجع قانوني ومراجع مهني ومراجع علمي; named reviewers required by the data: scholarly, pedagogical, legal.
  - P24: Pacing: 34 core sessions against 24 declared slots (8 weeks × 3). Pacing should be derived from core sessions (≈ 12 weeks at 3/week), not from the weeks field. Reviewer to confirm.
  - P24: Age: lesson(s) written entirely outside the program band — `Z1-L1` (15-17), `Z1-L2` (15-17), `Z1-L3` (15-17), `Z1-L4` (15-17), `Z1-L5` (15-17), `Z1-L6` (15-17). Keep (labelled in UI today by `acAgeOut`) or replace by an age-fitting lesson; never edit the original.
  - P24: Assessment coverage: 12 of 34 core sessions have no `assessment` component (they are scenario sessions or short sessions); decide whether a descriptive observation is expected there.
  - P24: Owner decision pending in `lessons/lessons_X1.json` (`needs_owner_decision`): قبل الدمج: قرار الجهة المسؤولة عن المنصة بتعيين مراجع علمي ومراجع تربوي (وحماية الراشدين) ومرجع مالي/قانوني معاصر يراجع حدود «التعليم العام وليس استشارة»، وبتأكيد قبول فئة البالغين (18+) وإدراج الوحدتين تحت W2/W3/W1، وبقبول أو حذف ما يخص الإنظار وحسن القضاء، ولا يُنشر شيء قبل ذلك.…
  - P24: Owner decision pending in `lessons/lessons_X2.json` (`needs_owner_decision`): قبل دمج هذه المسودة: تسمية مراجع علمي شرعي ومراجع تربوي لاعتماد الوحدتين، وتحديد هل تُدمجان في P12/P13 أو في برنامج مستقل للباحث الناشئ؛ ولم تُراجع أي صياغة هنا. ملحق امتداد: مؤصَّل بمبادئ مستخرجة من مصادر مختارة، وهو مسودة غير مراجَعة.…
  - P24: Review gate (nothing approved): مراجعة علمية وتربوية، ومراجعة حماية لدروس قرارات الراشد (نصح الأصغر وإحالة الأذى); named reviewers required by the data: scholarly, pedagogical, child_protection.
  - P24: Repetition: 6 validator warning(s) that a competency level is also taught elsewhere at overlapping ages (see `scripts/validate_coherence.py --program P24 --verbose`); these are the duplication candidates for REORGANIZE/CONNECT decisions, not merges.
  - P11 (validator Age warning): lesson written for ages 12-14, all below program age_min 15 (content for younger learners)
  - P24 (validator Age warning): lesson written for ages 15-17, all below program age_min 18 (content for younger learners)

### TW-9 — القيادة والإرشاد والمسؤولية العامة

*Mentoring, leadership, public responsibility.* Programs reused (real ids): P13, P14.

**Sequence, prerequisites, ages, rhythm**

| Program | slug | Title | Ages | status | Hard prerequisites (verbatim) | Soft `next_programs` | Declared rhythm | Core sessions | Planned core min / declared |
|---|---|---|---|---|---|---|---|---|---|
| P13 | `mursid-naashi` | قائد ومرشد ناشئ | 16+ | planned | P09 أو P10 أو ما يعادلهما | P14 | 8w × 3 × 50′ = 24 slots | 24 (18L+6S) + 6 optional_link | 910′ / 1200′ (76%) |
| P14 | `hawkama-wa-taqyim` | المسؤولية العامة والتقييم العادل | 18+ | planned | P13 أو ما يعادله | — | 8w × 2 × 55′ = 16 slots | 16 (10L+6S) | 576′ / 880′ (65%) |

**Why this order.** **P13** (band b7, ages 16+; prerequisite "P09 أو P10") trains asking to teach (M1, T3), useful observation (M2) and serving leadership (L1, L2, T4, T6); **P14** (age 18+, adults only; prerequisite P13) covers governance as analysis, planning and fair evaluation (L3, M1–M3).

**Cross-links.** Institution lens: the band b7 interface is "طلابي، برامجي، التقييم" (teachers/mentors) — surface through المؤسسات as a link, canonical home stays here. P12, P24 → P14.

**Units (stages), items and sessions reused**

**P13 — قائد ومرشد ناشئ** (`mursid-naashi`): يطرح المتعلم أسئلة تكشف الفهم، ويقدّم ملاحظة نافعة تحفظ الكرامة، ويدير اجتماعًا قصيرًا ويقود فريقًا صغيرًا بإنصاف، ويعلّم زميلًا أصغر.

- **P13-A** أسأل لأعلّم (weeks 1-2; sessions 1–7): `M1-L1` أدب المعلّم وحاجة المتعلم (16-17)؛ `M1-S1` هل فهمتم؟ (16+)؛ `M1-L2` لماذا لا يكفي أن أسأل: هل فهمتم؟ (16-17)؛ `E15-L1` بعد السؤال: أترك للجواب وقتًا وأصغي إلى آخره (16-18)؛ `M1-L3` سلّم الأسئلة وتجربة على زميل (16-17)؛ `E15-L2` جواب ناقص أو مخطئ: أبني على ما فيه من صواب وأسأل (16-18)؛ `E15-L4` أختم الجلسة: يعيد بكلماته ويختار خطوته (16-18)؛ `E15-S1` جواب لا يطابق الفقرة (16+) *[optional_link]*؛ `E15-L3` من يجيب؟ أوزّع الكلام بإنصاف دون إحراج (16-18) *[optional_link]*؛ `E15-S2` الضحكة التي ثقلت (16+) *[optional_link]*؛ `T3-L5` أعلّم الاستدلال (15-17) *[optional_link]*
- **P13-B** ملاحظة نافعة (weeks 3-5; sessions 12–19): `M2-L1` النصيحة والتعيير: الفرق في القصد والأسلوب (16-17)؛ `M2-S1` عرض بلا ترتيب (16+)؛ `M2-L2` ما الذي يجعل الملاحظة نافعة (16-17)؛ `M2-L3` قالب الملاحظة بثلاث خانات (16-17)؛ `E9-L1` قبل أن أقول: هل يعلم؟ وهل ينفعه؟ وهل هو حقّي أنا؟ (16-18)؛ `E9-L2` أخفّ الوسائل أولًا: تنبيه عام ثم كلمة خاصة (16-18)؛ `E9-S1` بين التنبيه العام والكلمة الخاصة (16+)؛ `E9-L3` حين تُقال لي ملاحظة: أصغي وأعيد وأسأل ثم أقرر (16-18)؛ `T4-L5` أعين غيري على قراره (15-17) *[optional_link]*
- **P13-C** أدير وأقود بخدمة (weeks 6-8; sessions 21–29): `L1-L4` أدير اجتماعًا قصيرًا (15-17)؛ `L2-L1` لكل مسؤولية سؤال (16-17)؛ `L2-L2` القيادة خدمة (16-17)؛ `L2-S1` قائد فريق التطوع (16+)؛ `L2-L3` أتولى مهمة صغيرة (16-17)؛ `L2-S2` تعليمات تؤذي (16+)؛ `L2-L4` أقود فريقًا بإنصاف (16-17)؛ `E9-L4` حدود المرشد الناشئ: ما أعين فيه وما أحيله إلى كبير (16-18)؛ `E9-S2` لا تخبر أحدًا (16+)؛ `T6-L5` أرشد زميلًا في بحثه (15-17) *[optional_link]*

**P14 — المسؤولية العامة والتقييم العادل** (`hawkama-wa-taqyim`): يحلل المتعلم حالة مؤسسة بحياد، ويخطط درسًا بالأسئلة، ويتابع أثر ملاحظته، ويقيّم أعمالًا بمعيار معلن.

- **P14-A** مفاتيح الحوكمة (weeks 1-3; sessions 1–6): `L3-L1` مفاتيح الحوكمة: اختصاص ومسؤولية ومساءلة (18+)؛ `L3-S1` جدول بلا صاحب (18+)؛ `L3-L2` جهة المساءلة وشروطها الثلاثة (18+)؛ `L3-L3` تحليل حالة مدرسة متخيَّلة بتوجيه (18+)؛ `L3-S2` خبر قبل التحقق (18+)؛ `L3-L4` مقارنة نماذج بحياد والتحقق قبل النشر (18+)
- **P14-B** أخطط وألاحظ (weeks 4-5; sessions 7–10): `M1-L4` تخطيط درس بالأسئلة (18+)؛ `M1-S2` درس بثلاثة أسئلة (18+)؛ `M2-L4` متابعة أثر الملاحظة (18+)؛ `M2-S2` ملاحظة لمتدرب (18+)
- **P14-C** أقيّم بمعيار (weeks 6-8; sessions 11–16): `M3-L1` للتقييم معيار (18+)؛ `M3-S1` ثلاثة تقارير (18+)؛ `M3-L2` أضبط هواي قبل أن أقيّم غيري (18+)؛ `M3-L3` نقيّم بقائمة معايير (18+)؛ `M3-S2` معيار واحد ودعم مختلف (18+)؛ `M3-L4` نقيّم ونشرح الأسباب (18+)

**Assessments by type**

**P13 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P13-A | 7 items (6 with a session assessment component) | 1 | 3 | 0 | سؤال مفتوح على زميل: يطرح المتعلم سؤالًا مفتوحًا على زميل ويصغي لإجابته. |
| P13-B | 8 items (6 with a session assessment component) | 1 | 0 | 0 | قالب الملاحظة: يقدّم المتعلم ملاحظة بالقالب لزميل بإشراف مربٍّ. |
| P13-C | 9 items (6 with a session assessment component) | 1 | 1 | 0 | أتولى مهمة صغيرة: يدير المتعلم اجتماعًا قصيرًا لقرار صغير، ثم يتولى دورًا خدميًّا صغيرًا بإشراف بالغ. |

Evidence (program level): capstone **جلسة إرشاد قصيرة** — خطة وملاحظات المتعلم.


**P14 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P14-A | 6 items (4 with a session assessment component) | 1 | 0 | 0 | مخطط مؤسسة متخيَّلة: يرسم المتعلم مخططًا لمؤسسة متخيَّلة يبيّن من يملك ماذا. |
| P14-B | 4 items (2 with a session assessment component) | 0 | 1 | 0 | درس بالأسئلة: يخطط المتعلم درسًا قصيرًا بالأسئلة ويتابع أثر ملاحظته بعد أسبوع. |
| P14-C | 6 items (4 with a session assessment component) | 0 | 1 | 0 | معيار معلن: يكتب المتعلم معيارًا واضحًا لعمل سيقيّمه ويقدّم ملاحظة معلنة المعيار. |

Evidence (program level): capstone **حالة وتقييم** — ملف تحليلي لا موقف حزبي فيه.


**Gaps flagged for human review**

- G-TW9-1 (child safety, non-negotiable): CLAUDE.md forbids unsupervised adult-child contact. P13 trains 16–17-year-olds to ask questions, observe and lead. Any exercise that involves younger learners must be supervised and designed by the child-protection reviewer. No such exercise is proposed here.
- G-TW9-2 (L5 for minors): optional links `T3-L5`, `T4-L5`, `T6-L5` are level L5 ("teach others"), ages 15–17; PEDAGOGY says L5 is for adults only. Optional but contradictory; flag.
- G-TW9-3 (bundle): M, L and T domains, overlaps P09/P14/P24 (audit severity 30). `E15-*` (optional) and `E9-*` are unreviewed appendices linked later.
- G-TW9-4 (time): P13 910′/1200′ core (76%); P14 576′/880′ (65%); `M1`/`M2` have thin item counts in P14 (≤2).
- G-TW9-5 (prerequisite): `M1` requires `T1` (taught in P02, P05, P08, P19) and `M2` requires `R2` (P05, P08, P19), none of them in P09/P10; the sequence check passes only through soft edges. P14 is adults-only (`gating.adults_only`).
- Generated checks for this path's programs:
  - P13: Assessment coverage: 6 of 24 core sessions have no `assessment` component (they are scenario sessions or short sessions); decide whether a descriptive observation is expected there.
  - P13: Review gate (nothing approved): مراجع تربوي ومراجع حماية للطفل; named reviewers required by the data: scholarly, pedagogical, child_protection.
  - P14: Timing: planned core content is 576′ against 880′ declared (65%); the declared rhythm and the real content disagree. Decision for the pedagogical reviewer: shorten the declared rhythm, or add content under the V3 §13 gate (never padding).
  - P14: Assessment coverage: 6 of 16 core sessions have no `assessment` component (they are scenario sessions or short sessions); decide whether a descriptive observation is expected there.
  - P14: Review gate (nothing approved): مراجع علمي ومراجع حيادية سياسية; named reviewers required by the data: scholarly, pedagogical, political_neutrality.

### TW-10 — الأسرة والوالدية (للبالغين)

*Family and parenting (adults, gated).* Programs reused (real ids): P15, P16.

**Sequence, prerequisites, ages, rhythm**

| Program | slug | Title | Ages | status | Hard prerequisites (verbatim) | Soft `next_programs` | Declared rhythm | Core sessions | Planned core min / declared |
|---|---|---|---|---|---|---|---|---|---|
| P15 | `nahwa-bayt-mustaqir` | نحو بيت مستقر | 18+ | adults_gated | P08 أو ما يعادله (التواصل وإدارة الخلاف) | P16 | 4w × 1 × 45′ = 4 slots | 5 (3L+2S) | 140′ / 180′ (78%) |
| P16 | `tarbiyat-abnai` | تربية أبنائي | 20+ | adults_gated | — | — | 4w × 1 × 45′ = 4 slots | 5 (3L+2S) | 140′ / 180′ (78%) |

**Why this order.** **P15** (age 18+, `adults_gated`; prerequisite "P08 أو ما يعادله") → **P16** (age 20+, `adults_gated`, no hard prerequisite; P15.next). Four weeks, one 45-minute session a week; 5 core sessions each; competencies R6 (marital partnership, needs R2, R3), R7 (parenting, needs R6), R1, R2, R3, C3, C4.

**Cross-links.** Soft upstream: P08 (TW-3). Guardian guides: `guides/P16.json` for parents. Institution lens: parents' role views.

**Units (stages), items and sessions reused**

**P15 — نحو بيت مستقر** (`nahwa-bayt-mustaqir`): يعبّر المتعلم عن معنى الشراكة، ويشرح حقوقًا مشتركة، ويناقش توقعاته بهدوء.

- **P15-A** سكن ومودة (weeks 1-2; sessions 1–2): `R6-L1` شراكة سكن ومودة ورحمة (18+)؛ `R6-S1` حين اختلف جدول الأسبوع (18+)
- **P15-B** حقوق وتوقعات (weeks 3-4; sessions 3–5): `R6-L2` بطاقات الحقوق المشتركة (18+)؛ `R6-S2` خلاف يتكرر (18+)؛ `R6-L3` محادثة التوقعات وسُلّم طلب العون (18+)

**P16 — تربية أبنائي** (`tarbiyat-abnai`): يلاحظ حاجات طفله، ويكون قدوة لطفله بسلوك يختاره، ويضع قاعدة أسرية معلّلة.

- **P16-A** فهم طفلي وقدوتي (weeks 1-2; sessions 1–3): `R7-L1` خريطة النمو التقريبية (20+)؛ `R7-L2` القدوة قبل الكلام (20+)؛ `R7-S2` كذبة صغيرة (20+)
- **P16-B** حزم رحيم (weeks 3-4; sessions 4–5): `R7-L3` قاعدة أسرية وحزم رحيم (20+)؛ `R7-S1` رفض الواجب (20+)

**Assessments by type**

**P15 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P15-A | 2 items (1 with a session assessment component) | 0 | 1 | 0 | جملة تقدير: يقول المتعلم لشريكه جملة تقدير صادقة ويفعل فعلًا صغيرًا. |
| P15-B | 3 items (2 with a session assessment component) | 0 | 1 | 0 | محادثة دورية: يطلب المتعلم موعدًا هادئًا قصيرًا لمحادثة دورية بجملة أنا أحتاج. |

Evidence (program level): capstone **بطاقة بيتنا** — بطاقة خاصة بالشريكين ولا تُرسل لأحد.


**P16 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P16-A | 3 items (2 with a session assessment component) | 0 | 2 | 0 | عشر دقائق انتباه: يمنح الوالد طفله عشر دقائق انتباه كامل ويدوّن ما لاحظ. |
| P16-B | 2 items (1 with a session assessment component) | 0 | 1 | 0 | قاعدة أسرية: يطبق الوالد قاعدة واحدة أسبوعًا. |

Evidence (program level): capstone **خطة أسرتي** — خطة خاصة بالوالد.


**Gaps flagged for human review**

- G-TW10-1 (deferred by policy, both): P15 — no verified source and no named reviewer in the family domain; P16 — no licensed contemporary developmental reference. Both are marked `adults_only`. They must not be shown to student accounts (the UI function `acGated` already hides adult programs from student/minor accounts).
- G-TW10-2 (referral): content on marriage and parenting needs a specialist reviewer and clear referral wording; the program statuses say "للبالغين مع إحالة للمختص".
- G-TW10-3 (thin content): 5 core items each (3 lessons + 2 scenarios), 140′ of 180′ declared; each stage has 2–3 items. Do not pad; the gap stays documented.
- G-TW10-4 (links): P15.next → P16 is soft; P16 has no hard prerequisite although `R7` needs `R6` (taught in P15).
- Generated checks for this path's programs:
  - P15: Pacing: 5 core sessions against 4 declared slots (4 weeks × 1). Pacing should be derived from core sessions (≈ 5 weeks at 1/week), not from the weeks field. Reviewer to confirm.
  - P15: Assessment coverage: 2 of 5 core sessions have no `assessment` component (they are scenario sessions or short sessions); decide whether a descriptive observation is expected there.
  - P15: Review gate (nothing approved): مراجع شرعي ومراجع أسري ومراجع قانوني; named reviewers required by the data: scholarly, pedagogical, family_counselling, legal; deferred: لا مصدر محقق ولا مراجع مسمّى في الأسرة؛ مؤجل بحسب سياسة المنصة لحين فحص المصادر..
  - P16: Pacing: 5 core sessions against 4 declared slots (4 weeks × 1). Pacing should be derived from core sessions (≈ 5 weeks at 1/week), not from the weeks field. Reviewer to confirm.
  - P16: Assessment coverage: 2 of 5 core sessions have no `assessment` component (they are scenario sessions or short sessions); decide whether a descriptive observation is expected there.
  - P16: Review gate (nothing approved): مراجع تربوي نمائي ومراجع علمي; named reviewers required by the data: scholarly, pedagogical, child_protection; deferred: لا مرجع نمائي معاصر مرخّص؛ مؤجل بحسب سياسة المنصة..

### TW-11 — السيرة والشمائل والآداب والمسؤولية الرقمية

*Seerah, shama'il, adab, digital responsibility.* Programs reused (real ids): P22.

**Sequence, prerequisites, ages, rhythm**

| Program | slug | Title | Ages | status | Hard prerequisites (verbatim) | Soft `next_programs` | Declared rhythm | Core sessions | Planned core min / declared |
|---|---|---|---|---|---|---|---|---|---|
| P22 | `sira-shamail-adab` | السيرة والشمائل والآداب والمسؤولية | 12–17 | pilot | P20 أو ما يعادله; P25 أو ما يعادله (لتنظيم الوقت والتخطيط) | P23, P24 | 8w × 3 × 45′ = 24 slots | 31 (20L+11S) + 6 optional_link | 903′ / 1080′ (84%) |

**Why this order.** **P22** (ages 12–17, pilot; prerequisites "P20" and "P25") has five stages: A seerah stages and sources (`H1`), B shama'il in practice (`E21-A` core; `H2` items are optional links because E21 provides age-fitting versions; `H3-L1`), C daily adab (`H3`), D evenings and shared space (`X4-B`, S2), E digital responsibility (`X5-A`). Downstream: P23 (Quran domain), P24.

**Cross-links.** Upstream: P17-C (`H5` stories), P20 (Quran). Downstream: P23, P24. `X4-B` is a CONNECT candidate for TW-1; `X5-A` (digital responsibility) pairs with verification in TW-7.

**Units (stages), items and sessions reused**

**P22 — السيرة والشمائل والآداب والمسؤولية** (`sira-shamail-adab`): يتعلم المتعلم مراحل السيرة وطبقات المصادر بصيغة «تذكر كتب السيرة أن»، ويتأسّى بأخلاق النبي ﷺ بالعمل لا بالتمثيل، ويتدرب على آداب يومية، ويرتّب مساءه ويتحمل دورًا في المكان المشترك، ويتحمل مسؤوليته الرقمية.

- **P22-A** السيرة: مراحل ومصادر (weeks 1-2; sessions 1–7): `H1-L1` مراحل السيرة الكبرى على خط زمني (9-12)؛ `H1-L3` الصدق والأمانة والحكمة قبل البعثة وفي بدايتها (9-12)؛ `H1-L4` الأخذ بالأسباب والتوكل في الهجرة (11-14)؛ `H1-S2` الأمانة رغم الخلاف (11+)؛ `H1-L5` السلم والعفو في المدينة ومكة (12-15)؛ `H1-L2` من أين جاء الخبر؟ طبقات المصادر (10-13)؛ `H1-S1` القصة التي بلا مصدر (10+)
- **P22-B** الشمائل: التأسي بالعمل (weeks 3-4; sessions 12–20): `H2-L1` نتأسى بالعمل لا بالتمثيل (9-11) *[optional_link]*؛ `H2-L2` أصحّح بلطف وأحفظ كرامة صاحبي (10-12) *[optional_link]*؛ `H2-L3` أبقى حاضرًا حتى يفرغ من يحدّثني (9-12) *[optional_link]*؛ `H2-S1` ملاحظة بعد الحصة (10+) *[optional_link]*؛ `E21-L1` بين ما أعرضه وما أعمله: خدمة صغيرة في بيتي (12-15)؛ `E21-L2` أنبّه بلا إحراج: وقت مناسب وعبارة تحفظ الكرامة (12-16)؛ `H2-L4` مزحة صادقة (10-13) *[optional_link]*؛ `E21-L3` أبقى حاضرًا حتى يفرغ: الإصغاء والهاتف في يدي (12-15)؛ `E21-S1` الموعد الخطأ في مجموعة الفريق (12+)؛ `E21-S2` ترتيب الشرائح واسم نهاد (12+)؛ `E21-L4` الأيسر والتجاوز: ما يخصّني وما يخصّ غيري (12-17)؛ `H2-S2` أختار الأيسر وأتجاوز عمّا يخصني (10+) *[optional_link]*؛ `H3-L1` لماذا أفعل هذا؟ النية في عمل بسيط (11-13)
- **P22-C** آداب يومية (weeks 5; sessions 21–25): `H3-L2` ميزان الكلام ومساعدات الغضب (11-13)؛ `H3-L3` ماذا كنت أريد لو كنت مكانه؟ (11-13)؛ `H3-L4` الحياء والخجل: أسأل معلمي عن المصدر (11-14)؛ `H3-S1` مشروع بلا صوت (11+)؛ `H3-S2` قبل أن أرد (11+)
- **P22-D** مساءاتي ومكاني المشترك (weeks 6; sessions 26–30): `X4-L4` ترتيب مساء يناسب بيتي (10-12)؛ `X4-L5` المكان المشترك: لي فيه دور (10-13)؛ `X4-L6` حين يختلّ يومي: أبدأ من جديد (11-14)؛ `X4-S3` جدول المساء لا يُعجبني (10+)؛ `X4-S4` القاعة التي نتشاركها (10+)
- **P22-E** مسؤوليتي الرقمية (weeks 7-8; sessions 31–37): `X5-L1` ليست كل صورة لي: أستأذن قبل أن أنشر (11-14)؛ `X5-L2` أتثبّت قبل أن أشارك (11-15)؛ `X5-L3` كلمتي في التعليق: أكتب ما أقوله وجهًا لوجه (12-16)؛ `X5-L4` وقتي أمام الشاشة بتوازن، وإن آذاني أحد أخبرتُ من أثق به (12-17)؛ `X5-S1` فيديو الغناء في الحافلة (11+)؛ `X5-S2` رسالة «غدًا لا دوام» (11+)؛ `X5-S3` تعليقات تحت قصة سلمى (12+)

**Assessments by type**

**P22 — assessments by type** (completion · knowledge · skill · practice · evidence)

| Stage | Completion (core items) | Knowledge clauses (K) | Skill clauses (S) | Unclassified (?) | Practice (stage mission, out of session) |
|---|---|---|---|---|---|
| P22-A | 7 items (5 with a session assessment component) | 0 | 1 | 0 | بطاقة خبر: يسأل المتعلم عن طبقة خبر ومصدره مع معلمه ويدوّن الجواب. |
| P22-B | 7 items (5 with a session assessment component) | 0 | 3 | 1 | خُلُق أعمل به: يختار المتعلم خُلُقًا ويعمل به أسبوعًا دون تمثيل أو تقليد شكلي. |
| P22-C | 5 items (3 with a session assessment component) | 0 | 1 | 1 | قبل أن أرد: يطبّق المتعلم وقفة قبل الرد ويسأل نفسه عن نيته في عمل بسيط. |
| P22-D | 5 items (3 with a session assessment component) | 0 | 1 | 0 | جدول المساء: يضع المتعلم جدول مساء مرنًا يناسب بيته ويتولى دورًا صغيرًا في مكان مشترك. |
| P22-E | 7 items (4 with a session assessment component) | 0 | 0 | 1 | قبل أن أنشر: يتدرب المتعلم على الاستئذان والتثبّت قبل المشاركة ويكتب تعليقًا لا يخجل أن يقوله وجهًا لوجه. |

Evidence (program level): capstone **ملف مسؤوليتي** — ملف خاص بالمتعلم، لا يُقيَّم ولا يُقارَن.


**Gaps flagged for human review**

- G-TW11-1 (scholarly review is mandatory): `H1`, `H2`, `H3` carry seerah, shama'il and hadith-based adab (the Forty Hadith unit). Nothing machine-extracted is published without a recorded scholarly reviewer approval (DB-enforced in migration 0002; publication pipeline in 0020). Do not generate or paraphrase sources automatically.
- G-TW11-2 (bundle): five themes across three domains (C, H, S); the validator reports no `serves` mapping. Candidate: keep the program, present stages as five clearly labelled units; CONNECT `X4-B` to TW-1 as an optional link only.
- G-TW11-3 (age): `E21-*` (12–15/17) replaces `H2-*` (9–13) as core, per its file note; `H2-*` stays available as optional links. Keep.
- G-TW11-4 (owner decision): `lessons_X4.json` pending decision (see G-TW6-3) also affects P22-D.
- G-TW11-5 (time): core 903′ of 1080′ (84%); stage B (weeks 3–4) holds 13 sessions.
- Generated checks for this path's programs:
  - P22: Pacing: 31 core sessions against 24 declared slots (8 weeks × 3). Pacing should be derived from core sessions (≈ 11 weeks at 3/week), not from the weeks field. Reviewer to confirm.
  - P22: Assessment coverage: 11 of 31 core sessions have no `assessment` component (they are scenario sessions or short sessions); decide whether a descriptive observation is expected there.
  - P22: Owner decision pending in `lessons/lessons_X4.json` (`needs_owner_decision`): قرار الجهة المسؤولة عن المنصة: هل تُدمج وحدتا العادات اليومية (٥–١٤) في مسار S3/S2 القائم أو تبقيان وحدتين مستقلتين، وتسمية المراجعين التربوي والعلمي ومختص حماية الطفل، وتأكيد خلوّ الوحدتين من أي مضمون صحي أو شرعي قبل الدمج.…
  - P22: Review gate (nothing approved): مراجعة علمية للنصوص الدينية والتربوية وحماية الطفل; named reviewers required by the data: scholarly, pedagogical, child_protection.
  - P22: Repetition: 3 validator warning(s) that a competency level is also taught elsewhere at overlapping ages (see `scripts/validate_coherence.py --program P22 --verbose`); these are the duplication candidates for REORGANIZE/CONNECT decisions, not merges.
  - P22 (validator Age warning): lesson written for ages 9-11, all below program age_min 12 (content for younger learners)

## 4. Cross-cutting gap register (for the human reviewers)

| # | Gap | Evidence | Proposed handling (no content authored) |
|---|---|---|---|
| G-01 | Hard prerequisites and soft `next_programs` disagree | 45 `next_programs` edges, 30 prerequisite edges; 24 next-edges are not mirrored by a prerequisite and 9 prerequisite edges are missing from `next_programs`; several sequence checks pass only through soft edges (for example P10 `L1`←`R1`, P19 `R2`←`R1`, P12 and P24 `W1`/`W3`←`C2`, P13/P14 `M1`←`T1`, `M2`←`R2`) | Decide per edge: promote to hard, keep soft, or remove; UI already merges both in its path map |
| G-02 | "أو ما يعادله" is undefined | all 20 programs that have prerequisites use the phrase; no equivalence rule or readiness route exists | Define an ungraded readiness conversation or self-declaration; never a score |
| G-03 | Competency register conflict S6←S1 | the only validator ERROR (P05); S6 min_age 8, S1 min_age 10 | Reviewer decides whether the dependency is advisory |
| G-04 | Optional links inflate sessions | 532 sessions = 478 core + 54 optional; P18 32 vs 18 slots, P19 33 vs 24 | Carry `role` onto session records (additive data field) and exclude optional sessions from pacing |
| G-05 | Declared time exceeds real content | core planned minutes below 70% of declared: P25 (121′/200′), P07 (409′/630′), P10 (792′/1200′), P17 (181′/300′), P04 (430′/630′), P11 (538′/880′), P14 (576′/880′) | Pedagogical reviewer shortens the declared rhythm or approves new content under the V3 §13 gate; no padding |
| G-06 | No stand-alone knowledge instrument; evidence over time not stored | only tajweed quizzes exist (4 sets, 33 questions); `assessment` component in 390 of 532 sessions; all progress device-local; migration 0019 unapplied and by design ids-only | Keep observation with the 3 descriptors; design knowledge checks later under review; any share to guide/guardian is learner-granted and revocable |
| G-07 | Nothing is reviewed | all 96 units `unreviewed`; no named reviewer; 0020 unapplied | Owner appoints reviewers; content stays draft until the four distinct approvals |
| G-08 | Owner-decision files | `lessons_AG3` (P07), `lessons_X1`, `lessons_X2` (P24), `lessons_X3` (P20, P21), `lessons_X4` (P18, P22) | Decide merge/standalone and name reviewers before any publication |
| G-09 | Lessons outside the program age band | P09: `T3-L1`, `T6-L1`, `T6-L2`; P10: `T4-L1`, `T4-L2`; P11: `R3-L4`; P24: `Z1-L1..L6`; (Quran side: P21 `Q3-L1`, P23 `Q5-L1..L4`) | Keep and label; optionally reconsider program `age_min` |
| G-10 | P07 title and P25 are new | owner label «أضبط غضبي وأصلح» vs stored «أتعلّم كيف أتعامل مع غضبي»; P25 `proposed_needs_owner_decision` in the audit though `programs.json` lists it as pilot | Owner confirms title and P25 |
| G-11 | Adult / age-gated programs | P14 `adults_only`; P15, P16 `adults_gated` + deferred; P11 deferred (financial reviewer); P12 16+, P13 16+, P24 18+ | Keep hidden from student/minor accounts; no exposure before review |
| G-12 | Private notebooks and progress cannot reach teachers or guardians | device-local storage; no sharing system | Reports to teachers/guardians (V3 §11) wait for consent model + applied migration 0019; until then show only what the learner chooses to show |

## 5. What the rebuild changes and does not change

- **Changes (proposed, data-additive, later phases of the restructuring plan):** a `track` label on each program (TW-1…TW-11) and a display order; optional `optional_link` additions listed above (`X4-B` → P25-B, compensating links for P07); a `role` field copied to session records; assessment descriptors surfaced in guide views; reports that say only "completed n of N".
- **Does not change:** any id (program, slug, stage, lesson, scenario, session number), any lesson text, any review status, any program title, any prerequisite, any rhythm. Progress stays valid because completion is stored per item id and items keep their ids.
- **Not done here:** no new lesson, scenario, quiz or assessment instrument; no merge or deletion of duplicates (identity not proven; V3 §4.3 forbids it without proof, a backup and a progress check); no DB change.

## 6. Limits of this document

- Item counts, minutes and gap numbers come from scripts over the repository state of 2026-11-05. Minutes are the files' own `duration_min`; scenario minutes are the files' session values (8–12′), not published scenario durations.
- The K/S/? clause labels are a keyword heuristic over existing text; reviewers must re-assign.
- `qa/coherence_audit.json` was generated before the P07 rebuild; where it disagrees with `programs.json` this document follows `programs.json` and the fresh validator run.
- The live site, content outside the repository, and the database after 2026-11-05 were not inspected. Review status of every item is `unreviewed`.
