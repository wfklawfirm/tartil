# TARTIL learning relationships

Status: design document (Master Prompt V3, section 8). Nothing in this file is implemented as a relation engine yet; section 7 says exactly what the UI already does. All counts below were measured on `packages/web/*.json` (generated 2026-11-03, every file `draft-unreviewed`).

## 1. Principle

A relationship between two pieces of content exists only if a **real data field already states or implies it**. We never create a link because two titles or word lists look alike (V3 section 8.1). Every relation record carries `type`, `source_field` (the field it was read from), `from`, `to`, and `review` (`derived-unreviewed` until a human reviewer confirms it).

## 2. Data fields we may derive from

| Field | File | Measured fact |
|---|---|---|
| `programs[].prerequisites` (free text such as `"P02 أو ما يعادله"`) | academy-programs.json | 25 programs; the leading `Pnn` id is parseable, the "or equivalent" part is a soft condition |
| `programs[].next_programs` (ids) | academy-programs.json | all ids resolve to existing programs |
| `programs[].competencies` | academy-programs.json | 101 program-to-competency references, all resolve to `academy.json` |
| `programs[].band`, `age_min`, `age_max`, `bands[].next_band`, `bands[].program_ids` | academy-programs.json | 8 bands (b1..b8) |
| `programs[].stages[].items[]` = `{ref, kind, serves, role?}` | academy-programs.json | 532 items (347 lessons, 185 scenarios); all 532 refs resolve to a lesson or scenario; each ref is used in exactly one program today |
| `items[].role` | academy-programs.json | `optional_link` on 54 items (35 lessons, 19 scenarios); all others are core (the default). `recap` is accepted by `scripts/validate_coherence.py` but occurs 0 times |
| `items[].serves` (outcome ids `O1..`) | academy-programs.json | present on 131 items |
| `competencies[].prerequisites`, `min_age`, `domain` | academy.json | 52 competencies, 26 with at least one prerequisite, all resolve |
| `units[].competency`, `units[].min_age`, `units[].lessons[]`, `units[].scenarios[]` | academy-lessons.json | 96 units, covering all 52 competencies; 23 competencies have more than one unit |
| `units[].grounding[].principle_id` | academy-lessons.json | 337 distinct extracted principle ids; 86 of them appear in more than one unit |
| `sessions[].competency`, `components[].ref` | academy-sessions.json | session plans per program (24 programs in the file at last count) |

Fields we do **not** use: usage counts, timing, scores, free-text notebook content, device or login data.

## 3. Relation types

| Type | Meaning | Derived from | Direction | Strength |
|---|---|---|---|---|
| `prerequisite` | B should normally come after A | `programs[].prerequisites` (id prefix); `competencies[].prerequisites` | A to B | Soft when the text says "أو ما يعادله"; never a hard lock for exploration |
| `next_step` | A is followed by B in the authored path | `programs[].next_programs`; `bands[].next_band` | A to B | Authored order |
| `same_competency` | Two items train the same competency | equal `units[].competency`; `programs[].competencies`; `sessions[].competency` | symmetric | Structural fact |
| `applies` | A scenario puts into practice the lessons of its own unit/stage | scenario and lesson in the same `unit` or the same `stage.items` (`serves` shared outcome id when present) | lesson to scenario | Structural fact |
| `reinforces` | Item or unit B revisits a principle that A is grounded in | shared `grounding[].principle_id` between two different units, or `same_competency` across different units | symmetric | Candidate only: `derived-unreviewed` until a pedagogical reviewer confirms the meaning is truly shared (an id match is not proof of the same lesson goal) |
| `optional_link` | Enrichment placed inside a stage that is not required | `items[].role == "optional_link"` | stage to item | Authored. Never counts toward progress, N, timing, or "next step" |
| `recap` | Spaced review item | `items[].role == "recap"` | stage to item | Reserved; 0 instances now |

Rules for all types:
- No `reinforces` or `same_competency` edge is created from title or keyword similarity.
- A relation never changes an item's identity or id (see CONTENT_GOVERNANCE, ids preservation).
- An item can sit in several relations; reuse is by link, not copy (V3 section 4.3). Currently no lesson/scenario is shared across programs, so cross-program reuse is a future option, not a current fact.
- Quran verses are never linked by us as "related verses" from similarity; `units[].verse_refs` (empty in the first unit inspected) are authored refs only.

## 4. Edge generation

A script (to implement, read-only over the JSON, run with `python3 -I`) emits `relations.json` with the structure `{type, from, to, source_field, review}` and a validator that fails when a `from` or `to` id does not resolve, when a prerequisite cycle exists, or when a non-`optional_link` edge points an optional item into the core count. It extends the existing `scripts/validate_coherence.py` gates rather than replacing them.

## 5. Recommendation rules

Inputs allowed: the learner's chosen band or age, programs the learner opened or enrolled in, items marked done on this device, items the learner flagged to revisit, goals the learner chose from a fixed list, and relations from section 3.

1. **Age first.** Never suggest a program outside `age_min..age_max` of its band, nor an item whose `min_age` or lesson `age_range` is above the learner's age (the UI already flags age-out lessons).
2. **Unmet prerequisites are shown, not enforced.** Suggest the prerequisite first but allow opening the target ("قبله / بعده" display).
3. **Next step** = first non-done core item in the current program, else the program's `next_programs`.
4. **Optional links** are offered as extras, labelled optional, ranked below core items, never as a gap or a failure.
5. **Reinforce** suggestions appear only after the item's `reinforces` edge is human-confirmed.
6. **Exploration stays open.** Every suggestion list also links to the full catalogue; no closed automatic path.
7. **Adults-gated and unreviewed content** (`status: adults_gated`, `review_status: unreviewed`) is labelled as draft and is not pushed as a recommendation to a minor.

Forbidden inputs and outputs (V3 section 8.2, CLAUDE.md):
- Never infer psychological state, mood, anger level, faith level, religiosity, piety, or personal traits from usage, answers, time of day, streaks, or notebook text.
- Never use journal or notebook content (it is device-only and has no server column).
- Never compare learners, rank them, or label a person ("weak", "needs spiritual help").
- Never produce a religious ruling, grade, or ijazah.
- Where a topic touches safety (e.g. severe or repeated anger), the program text already refers to a trusted adult or specialist; the recommender must not generate that referral from behaviour data.

## 6. Transparency

- Every suggestion shows a one-line reason in plain Arabic naming the relation and the field, e.g. "مقترح لأنه التالي في مسار البرنامج" (`next_programs`), "اختياري: إثراء لهذه المرحلة" (`optional_link`), "قبله: ..." (`prerequisite`).
- A "why this?" control on each suggestion lists the source field and ids.
- The learner can dismiss any suggestion and turn recommendations off; dismissals are stored on the device only.
- Drafts are visibly marked "مسودة لم تُراجَع بعد".
- Documentation of the relation file and its review status is public in the repo; unreviewed edges are not presented as authoritative.

## 7. What exists today and what is to build

Exists in `packages/web/index.html` (academy views): prerequisite/next display per program ("قبله: / بعده:" and a "ماذا بعد؟" section from `next_programs`); `optional_link` items rendered with an "optional" tag and excluded from N, completion and next-step (`acOpt`); first-undone-core "الخطوة التالية المقترحة"; age-out flag for lessons outside the program age range; authored band structure.

To implement: generated `relations.json` and its validator; `same_competency` / `applies` / `reinforces` surfaces; "why this?" panel; recommendation list honouring section 5; reviewer workflow for confirming `reinforces` edges.
