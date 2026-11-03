# TARTIL 14.1 — Curriculum Coherence (الترابط المنهجي)

Date: 2026-11-03. Scope: directive items 2-5, 14 and 19 of "TARTIL 14.1". Audit and data design only: `programs.json`, the lesson files and `index.html` are **not** modified. Status: **AUDITED** (findings measured by script), decisions **NEEDS_PEDAGOGICAL_REVIEW** (no named reviewer exists; nothing here is approved). Nothing is deleted from the database: every "Relocate/Split" keeps the content and its ref.

Artifacts:
- `docs/human-formation/qa/coherence_audit.json` — per-item decisions for P07 and a report for each of P01..P24.
- `scripts/validate_coherence.py` — the six gates (run `python3 -I scripts/validate_coherence.py`, add `--strict` to fail on errors).

## 1. Answer to the owner's question

**Yes, P07 «أضبط غضبي وأصلح» bundles unrelated topics.** Its eight topics (day review, intention, time planning, anger, Quran-review schedule, apology/repair, honesty/fairness, accepting criticism) are held together only by the loose idea of "self-discipline". Measured facts (from `programs.json` + lesson files):

- 16 items, 8 declared competencies from 3 domains (S, K, C); six of the eight competencies have two items or fewer (C1, C4, C5, K4, S5, S6).
- Only **4 of 16 items** serve an anger outcome (S5-L3, S5-S2, S6-L3, S6-S2). 11 are Relocate, 1 is Split (C1-L4), 0 Remove.
- S5-L1/L2 (feeling, "وقفة الثلاث") are written for ages 6-9 and are taught in P02. For ages 10-12 the authored anger material is exactly S5-L3 + S5-S2.
- Time: declared 8 weeks × 2 × 35 = **560 min**; actual content = 305 min (lessons) + 48 min (scenarios, estimated, none published) = **353 min (63%)**. Stage P07-C (weeks 5-6, 4 declared sessions = 140 min) holds 2 items = 38 min (27%).
- Program graph contradiction: `P06.next_programs` lists P07, but P06 is for age 11 and P07 for age 10.

The same defect exists elsewhere (section 5): the bundle pattern is systemic, not a P07 accident.

## 2. P07 scope decision

**Decision: narrow P07 into a stand-alone anger program, rename it, keep its `id` and `slug`.** Do not turn it into a broad self-management program.

| | Current | Proposed |
|---|---|---|
| Title | أضبط غضبي وأصلح | **أتعلّم كيف أتعامل مع غضبي** |
| Tagline | أراجع يومي، وأرتب وقتي، وأهدأ حين أغضب… | أفهم غضبي، وأختار تصرفي، وأصلح إن أخطأت |
| `id` / `slug` | P07 / `adbut-ghadabi` | unchanged (URLs and progress stay valid) |
| Duration | 8 weeks × 2 × 35 | **4 weeks × 2 × 35 = 8 sessions** (only once the new lessons below exist) |

Reasons (competency-driven, not title-driven): "أضبط" suggests suppression and clashes with the existing safeguard that chronic anger must not be bottled up; "وأصلح" over-promises; the title is wide because the content is wide. The owner's preferred direction (understand anger, feeling vs action, trigger noticing, regulation, responsible expression, disagreement, apology/repair, asking for help) is adopted as the six outcomes (the validator's 3-6 outcomes rule is kept):

| id | Outcome |
|---|---|
| O1 | يسمّي انفعال الغضب وعلاماته في جسمه، ويفرّق بين شعوره وتصرفه |
| O2 | يلاحظ المواقف والمثيرات التي ترفع غضبه ويصفها بلا لوم |
| O3 | يستعمل مهارة تهدئة ويختار ردًّا من عدة بدائل |
| O4 | يعبّر عن اعتراضه تعبيرًا مسؤولًا ويتعامل مع خلاف بسيط |
| O5 | يعتذر ويصلح ما أفسده، دون أن يُحمَّل مسؤولية أذى وقع عليه |
| O6 | يعرف متى وكيف يطلب مساعدة بالغ موثوق |

### Item decisions (12 of 16 leave P07; none deleted)

| Items | Decision | Destination | Pedagogical reason (short) |
|---|---|---|---|
| S5-L3, S5-S2 | **Keep** | P07 | Trigger noticing, plan for next time (O2, O3). S5-L3's objective is compound (cause + plan + repair): repair is limited to a hint, S6-L3 owns it. Source notes S5-p02/p06 need review. |
| S6-L3, S6-S2 | **Keep** | P07 | Apology/repair and when an adult is needed (O5, O6). S6-S2 mirrors S5-S2 (drawing mocked): vary one if the program grows. |
| S1-L1, S1-L2, S1-S1 | Relocate | **P25 proposed** "أرتّب يومي وأراجع نفسي" | Day review/intention is a self-review outcome, not anger. S1-L2's "why did I do it" can become self-justification of harm when anger is the context. S1-S1 says "no one will read the notebook": must match the real storage (device-local). |
| S2-L1, S2-L2, S2-S1 | Relocate | P25 proposed | Time planning is its own competency; its link to anger is remote. S2-L2 duplicates X4-L4 (P22) at the same level and ages: merge there. |
| K4-L3, K4-S2 | Relocate | **P21** stage A (not P20: P20's age 9 is below the lesson's 10) | A Quran-review timetable serves memorisation (Q3/K4). It entered P07 only through "discipline" similarity, the exact case the directive forbids. |
| C1-L4 | **Split** | news/assertion-checking part → P06 stage B; cost-of-honesty part → optional link from P08 | Objective says "honesty that costs", but its activity and life practice are about verifying news: the lesson is internally inconsistent and serves two outcomes. |
| C4-L4, C4-S2 | Relocate | **P08** stage C | Stating the other side's argument is conflict skill; it duplicates R3-L3, and R3 requires C4 in the register. Optional link back to P07 for O4. Source note needs review. |
| C5-L4 | Relocate | **P08** stage A (after R2-L4) | Receiving criticism pairs with giving advice (R2-L4). |

Refs never change, so a learner's completion of any moved item stays valid.

### Target P07 composition (8 sessions; the gaps are stated, not papered over)

| # | Wk | Session | Outcome | Source | Status |
|---|---|---|---|---|---|
| 1 | 1 | أسمّي غضبي وأعرف علاماته | O1 | new (10-12 version of S5-L1, written for 6-9) | NEEDS_NEW_CONTENT |
| 2 | 1 | الشعور ليس تصرفًا: ما بدائلي؟ | O1 | new | NEEDS_NEW_CONTENT |
| 3 | 2 | ملاحظة في الصف | O2 | S5-S2 | existing |
| 4 | 2 | أدواتي لأهدأ | O3 | new (extends S5-L2, written for 7-9) | NEEDS_NEW_CONTENT |
| 5 | 3 | بعد أن أهدأ: سببي وخطتي | O2, O3 | S5-L3 | existing |
| 6 | 3 | أقول اعتراضي بلا أذى | O4 | optional link R2-L3 / R3-L1 (P08), or new | link or new |
| 7 | 4 | اعتذار حقيقي وإصلاح | O5, O6 | S6-L3 | existing |
| 8 | 4 | رسالة لم تكن لطيفة + خطتي + من أطلب عونه | O5, O6 | S6-S2 (+ optional link R3-S3) | existing |

Optional links never count toward P07's timing (`role: "optional_link"`; spaced-repetition cards from P02 use `role: "recap"`, per PEDAGOGY 3.2). The duration stays 8 weeks until the four new lessons exist; the 4-week plan is a proposal for the owner. **Safety notes to carry into any new lesson** (directive items 7, 17): never ask the child to confess private matters; apology is never required of the person who was harmed; anger exercises are not therapy; a child leaving the group must stay supervised.

## 3. The five level dimensions

They are different axes and must not be shown as one "Level N".

| Dimension | Meaning | Field today | Who sees it |
|---|---|---|---|
| **Learner Development Stage** | Age/developmental window of the learner | `band` (b1..b8), `age_min/age_max`, lesson `age_range` | learner sees age only |
| **Competency Mastery Level** | Observable behaviour within one competency, L1 recognises … L5 teaches others (adults only, PEDAGOGY 3.1) | lesson `level` (`L1..L5`), `competencies.json levels[]` | internal/guide only; never a ladder to the child |
| **Lesson Difficulty** | Load of this lesson: reading volume, emotional intensity, number of steps. Independent of mastery level | **new, optional** `difficulty: {reading:1-3, emotional:1-3, steps:1-3}` | guide |
| **Curriculum Sequence** | Partial order: (competency, Lk) needs (same competency, Lk-1) and the competency's `prerequisites` | `competencies.json prerequisites`, program `prerequisites/next_programs` | learner sees "next step" |
| **Program Position** | Where the item sits in this program | stage index, session number | learner sees "الخطوة 3 من 8" |

Rules: (1) L-codes and P-codes are internal; the UI shows titles and "step n of N". (2) An "L4" of C5 is not harder than an "L3" of S5; levels compare only inside one competency. (3) The same competency may recur in a later program at a higher level or in a new context, never as the same lesson. (4) Stored `levels` stay the lesson ids' `level` value; ref numbers are opaque (H1-L2 is level L4 today), so new lessons get fresh refs and an explicit `level`.

## 4. Session Planning data model (optional `program.sessions[]`)

```json
{
  "n": 5, "week": 3, "title": "بعد أن أهدأ: سببي وخطتي",
  "competency": "S5", "objective": "يحدد سبب غضبه ويضع خطة هادئة للمرة القادمة",
  "serves": ["O2", "O3"], "refs": ["S5-L3"],
  "duration_min": 35,
  "components": {
    "intro":                {"min": 3},
    "source_teaching":      {"min": 5, "source_ref": "SPR-S5"},
    "interactive_practice": {"min": 14, "item_refs": ["S5-L3#scenario", "S5-L3#project"]},
    "reflection":           {"min": 6},
    "assessment":           {"min": 4}
  },
  "buffer_min": 3,
  "homework": {"min": 10, "task": "أجرّب خطتي في موقف حقيقي إن حدث"}
}
```
- **Timing equation:** `Σ components[*].min + buffer_min = duration_min`. Homework is *outside* the session and is never added; it must be stated with its own `min`.
- A session may be shorter than the declared session length, never longer. Never pad: `source_teaching` may be omitted only with `source_omitted_reason`.
- A scenario is never 0 minutes. When no duration is published the engine estimates it: `ceil((premise words + mean path words)/90 + 1.5 × decisions + 2)`, clamped to 8-20 min, and labels it estimated (current scenarios come out at 8-11 min, 124 of 136 at the 8-minute floor, so the estimate is a lower bound). A scenario alone does not fill a 35-minute slot: pair it with a lesson or give it the "practice" component of one.
- Rules enforced when `sessions` is present: numbering 1..N; N = weeks × sessions/week; at most the declared sessions per week; required components (`intro`, `interactive_practice`, `reflection`, `assessment`); every core stage item scheduled; the equation holds; no session exceeds the declared length.
- Learner path inside a session: أكتشف → أفهم → أتعلم من المصدر → أتدرّب → أطبق → أراجع, choosing only the steps the session needs (item 8).

## 5. Quality gates and current results

`scripts/validate_coherence.py` (stdlib only, `python3 -I`). Default is report mode (exit 0); `--strict` exits 1 on any ERROR; `--warnings-as-errors` also fails on WARN. Also `--program Pxx`, `--verbose`, `--json PATH`.

| Gate | ERROR when | WARN when |
|---|---|---|
| Coherence | item's competency is not declared and has no `item.serves`; `serves` names an unknown outcome; any outcome unserved (when `serves` is used); item audited Relocate/Split/Remove | >6 competencies; ≥3 domains with no `serves`; competencies with ≤2 items; audited Rework/Needs Source Review; audit stale |
| Competency | unknown competency; program age below the competency `min_age` | same (competency, level) taught in another program for overlapping ages |
| Sequence | Lk without the previous existing level of the same competency before it (in program or in prerequisite programs); level goes backwards; competency prerequisite uncovered; stage weeks gap/overlap; prerequisite for older learners | — |
| Age | item needs an age above the program's `age_min` | lesson written entirely for ages below the program's `age_min` |
| Timing | content/declared > 110% or < 60%; a lesson longer than the session + 5; a stage outside 40-130% | 100-110% or 60-75%; stage outside 60-110% |
| Completeness | missing required fields, empty guide sections, FAQ without answer, HTML entity, unreachable scenario node, session-plan violations | placeholder-like text |

Prerequisite programs are computed from the parsed `prerequisites` text plus the inverse of `next_programs`, transitively. Coherence by competency match alone is weak (P07's eight competencies were listed to fit its items), which is why the audit decisions are also a gate input.

**Result on the current data** (24 programs, 391 items): **97 errors, 133 warnings** (report mode; with the audit present). Without the P07 audit the figure is 85 errors. By gate (errors/warnings): Coherence 12/29, Competency 0/36, Sequence 19/0, Age 0/31, Timing 66/30, Completeness 0/7. `validate_programs.py` still passes (0 issues), so the old validator does not catch any of this.

Worst five programs (weighted severity 0-45: grouping×5, repeated competencies×4, overlap×3, level heterogeneity×2, timing×1, each scored 0-3):

| # | Program | Score | Dominant problem |
|---|---|---|---|
| 1 | P02 أضبط نفسي وأسأل وأحفظ | 35 | repeats S3 L1-L3 and K4 that P18 also teaches; 5 unrelated competencies; 51% of declared time |
| 2 | P18 أسمع بهدوء وأرتّب يومي | 34 | mirror of P02; 5-6-year-old lessons of 6-10 min inside a 20-min, age 7+ program (43%) |
| 3 | P13 قائد ومرشد ناشئ | 30 | M, L, T domains; overlaps P09/P14/P24; L5 "teach others" lessons for age 16 |
| 4 | P07 أضبط غضبي وأصلح | 29 | section 1 |
| 5 | P10 أقرر بالشورى | 28 | S1-L3/S2-L3 (ages 12-14) in an age 15+ program; five unrelated competencies |

Next: P24 (25; 8 sequence errors), P01, P22 (121% over time, H1 levels out of order). Per-program detail is in `coherence_audit.json > program_reports`. Other sequence defects found: P05 (S6 needs S1), P21 (Q4 needs K1), P15 (R6 needs R2, R3), P24 (T6←K2, K3←K1, T4←T3, several lessons above L1 with no L1).

## 6. Migration plan (preserving learner progress)

What the current viewer stores (read in `packages/web-vercel/index.html`): `localStorage['acx_done'] = {ref: 1}` on the device, keyed **only by lesson/scenario ref**; the program counter ("تقدّمك على هذا الجهاز: n من N") is derived by counting the program's refs against that map. No server copy exists. Therefore:

1. **Stays valid:** every completion of any ref, even if the ref moves between programs (P07 → P06/P08/P21/P25); the P07 URL `#/academy/p/adbut-ghadabi` (slug kept); P07's id.
2. **Changes by itself (acceptable):** program counters. A learner who finished S1-L1 under P07 will see it as done in P25 and "n of N" in P07 will shrink. State this once in the release notes; no data rewrite is needed.
3. **Rules that keep it safe:** never reuse a ref for different content; never rename a ref; a split keeps the original ref on the part that keeps the old objective (C1-L4 stays with the news part in P06) and the new part gets a new ref (e.g. `C1-L6`, valid against the viewer's `[A-Z]\d{1,2}-[LS]\d{1,2}` id pattern so it stays hidden from learners); relocated items keep their `acx_done` flag; the old P07 stage ids (`P07-A..D`) are not stored by the viewer.
4. **Order of rollout (item 19: worst first, not all at once):** (a) P07 alone; (b) P02+P18 (parallel tracks) only after the owner picks one owner program per (competency, level); (c) P24, P22, P10, P13. Each step: update data, run `validate_coherence.py --strict --program Pxx` and `validate_programs.py`, confirm refs are unchanged.
5. **Do not break:** Quran, tafsir, tajweed, hifz, recitation, kids, halaqat, teachers and parents features do not read `programs.json`; the academy is only the viewer plus `academy-programs.json` built by `scripts/build_academy.py`.
6. **If progress is later moved to the backend** (item 16), migrate the map as `ref → completed_at` per account; the same ref keys apply, and a guest's local map must stay visibly separate from the account's.

## 7. Limits and decisions needed from the owner

- All decisions are proposals by an automated audit; no pedagogical, scholarly or child-protection reviewer has signed anything (`NEEDS_PEDAGOGICAL_REVIEW`).
- The scenario durations are estimates from text length; real classroom timing needs a pilot.
- The thresholds in section 5 are my judgement, adjustable at the top of the script.
- Owner decisions: (1) rename P07 and cut to 4 weeks; (2) create P25 (S1+S2, optionally absorbing P22 stage D's X4 lessons) or keep them unattached; (3) one owner program per duplicated (competency, level) for P02/P18; (4) authorise writing four new 10-12 anger lessons (they require scholarly/source review before use); (5) fix the P06→P07 age contradiction (raise P07 to 11 or drop the edge).
