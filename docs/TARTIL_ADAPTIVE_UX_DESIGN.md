# TARTIL adaptive UX design

Status: design document (Master Prompt V3 sections 9-11). Facts about the current UI come from reading `packages/web/index.html` (2408 lines, single-file vanilla JS, hash routes). "Exists" means found in that file; "To implement" means not found. Nothing here was visually tested by this document.

## 0. Constraint on the two copies

`packages/web/index.html` and `packages/web-vercel/index.html` must stay identical except line 6 (`<meta name="api-base" content="">` vs `content="/api"`). Verified identical apart from line 6 when this was written. Any UI change is made in one copy and mirrored to the other; verify with `diff` (expected output: only line 6). The academy JSON files are likewise duplicated in both packages.

## 1. Principle

The display follows the content type, not one card template. The shell (nav, theme, a11y) is shared; the content area picks a layout by type, by age band, and by role.

## 2. Display per content type

| Content type | Shows | Data source | Status |
|---|---|---|---|
| Quranic lesson / reading | verified text, audio with ayah highlight, explanation, rulings, application | Quran tables, `#/quran/:surah` | Reader exists (font-size control, audio, bookmarks, tajweed layer); lesson wrapper to implement |
| Tajweed lesson | rule, sound examples from stored text, exercise, correction | `#/tajweed` tabs | Exists (provisional, under review) |
| Formation session (academy lesson/scenario) | hook, ideas, activity, branching scenario decisions, private reflection | `academy-lessons.json`, `#/academy/l/:id`, `#/academy/s/:id` | Exists: stepper lesson, scenario viewer with decision trail and `aria-live` status |
| Hifz programme | plan, memorised passages, spaced review, tasmi | `#/me/hifz`, `#/me/tasmi`, `#/me/quiz`, `#/me/map` | Exists (signed-in only) |
| Reference material | text, sources, explanations, relations | foundations, qiraat, `grounding` | Foundations and qiraat pages exist; relations panel to implement |
| Child activity | big targets, short instructions, media, no scores | `#/kids`, programmes of bands b1-b2 | Kids page exists; per-band presentation partly (band `interface` text exists in data) |
| Mentor session | goals, preparation, delivery script, observations, assessment criteria | `academy-sessions.json`, `academy-guides.json` | Guide and parent-guide pages exist behind a mentor gate |
| Programme page | promise, outcomes, stages, optional links, capstone, "what next" | `academy-programs.json` | Exists |

## 3. Adaptation by age band

Bands come from `academy-programs.json` (b1 5-8, b2 9-12, b3 13-17, b4 18-30, b5/b6/b7 adults 16/18+, b8 14+). Each band has an authored `interface` note (b1: large icons, no adult terminology).
- b1-b2 (child): large touch targets, one task per screen, no scores, ranking or comparison (band note), adult present for b1, simple vocabulary; no free-text disclosure prompts.
- b3 (teen): independent navigation, private reflection, no public sharing.
- adult bands: denser layout, guides and reference material.
- Age is read from the chosen band/programme `age_min..age_max` and item `min_age` / lesson `age_range`; items outside range are flagged (exists: `acAgeOut`). Age is not inferred from behaviour.
- To implement: a band-level class on the shell that adjusts target size and density; today `.acx` styling is shared across ages.

## 4. Role views

| Role | Sees | Does not see | Status |
|---|---|---|---|
| Learner | programmes, own progress, own notebook, suggestions with reasons | other learners' data | Progress and notebook live in `localStorage` per user key (`acx:user:<id>:...`) with a delete-my-data button and a logout prompt |
| Child | age-appropriate activities, no guides, no adult sections | guide pages, other children | Student accounts never get guide pages (`acStudentAcct`) |
| Parent / guardian | parent guide for the programme (what to expect, how to support at home, what to avoid); progress ids only if the child has shared it | **the child's notebook/journal and reflections, ever**; free-text anything | Parent guide exists. Server side: migration 0019 stores no notebook column; viewers (`qari`, `guardian`, `tenant_admin`) see progress only through an explicit revocable share (`progress` or `progress_feedback`). No UI for sharing found in `index.html` (0 calls to progress/share endpoints) |
| Teacher / mentor | approved content, session plans, guide, observation criteria, shared progress and short feedback with a next-step id | notebook text; unshared progress | Guides and sessions data exist; mentor gate is `acCanGuide` = not a student account and (adult membership role or a self-acknowledgement stored locally). The self-acknowledgement is a convenience gate, not authorisation |
| Institution admin | programmes to adopt, halaqat, members, homework, certificates, quality of delivery | learner notebooks | Existing dashboard `#/app/:inst/` tabs: overview, tracks, halaqat, homework, recitation, certs, assistant, people, admin (admin only). Reuse; no new dashboard (V3 section 11) |
| Scholarly reviewer | review queue, statuses | n/a | `#/review` exists for scholars; the four-review publication workflow UI for academy content (0020 API routes exist under `/academy/content/status`) is to implement |

Reports to teachers/parents show completion and structured facts only. They never carry moral or faith scores, rankings, or inferred states (see TARTIL_LEARNING_RELATIONSHIPS section 5). Completion, knowledge, skill, practice and sustained improvement stay separate indicators (V3 section 12); today only completion ("done" ids) exists.

## 5. Navigation

Exists: top nav (home, Quran, search, tajweed, foundations, kids, academy "التكوين", qiraat; when signed in: my journey, my dashboard; scholars: review); mobile bottom bar with five destinations (my journey, learn, practise, explore, account) and hub pages for learn and practise; programme "ماذا بعد؟"; category jump chips on the academy page; breadcrumbs on lessons and scenarios.

Proposed grouping from V3 section 10, to be checked against content before adoption: Home; Quran and its sciences; Formation tracks; Children and family; Institutions; My journey. Do not rename existing programmes or routes (V3 section 1); old hash routes must keep working.

## 6. Component list

Exists (in `index.html`): programme card; progress bar (`role=progressbar` with value text); stage list with done/next marks; optional-item tag; scenario viewer; lesson stepper; tabs (`role=tablist`) with fade; jump chips; mentor-acknowledgement box; collapsible `details` section for adults; draft/"unreviewed" notices; "what next" grid; hub feature cards; theme toggle (light/dark/auto); mini audio player (`role=region`); mushaf reader controls.

To implement: relations / "why this suggestion?" panel; content-type layout switcher; band density classes; review-status badge visible on every item (draft, under review, approved); share-progress management (learner grants and revokes a viewer); parent summary card that structurally excludes notebook data; reviewer workflow screens; English UI strings.

## 7. Accessibility and language

Exists: `lang="ar" dir="rtl"` on the page; skip link to `#app`; focus moved to `h1` after route change; visible focus rings (3px); 44px minimum targets on coarse pointers; `prefers-reduced-motion` disables animation; dark/light/auto themes with `prefers-color-scheme`; `aria-live` regions for search and scenario status; labelled progressbar; Arabic numerals via helper; logical properties (`inset-inline-start`) and RTL-specific ornament flips; font-size variable for the reader.

To implement or verify: English LTR interface (the UI is Arabic-first; only Quran search and the English translation toggle use English today); per-element `lang`/`dir` switching for mixed text; keyboard-only and screen-reader audit of the scenario and stepper views; contrast audit of both themes; text-size preference beyond the reader; captions/transcripts for any audio or video; low-bandwidth behaviour (see `docs/LOW_CONNECTIVITY_STRATEGY.md`). No claim of WCAG conformance is made until tested.

## 8. Privacy rules for the UI

- Notebook content is never sent to the server and never rendered in any parent, teacher or admin view.
- No hidden profiling: no mood, religiosity or trait labels; suggestions explain themselves.
- Child screens contain no public profile, leaderboard, photo, or contact feature.
- Every unreviewed item says so; nothing unreviewed is presented as final.

## 9. Implementation status (Phases 1-3, UI only)

Implemented in both copies of `index.html` (identical except line 6) and tested by sections 9 of `scripts/e2e_academy.mjs`:
- Top navigation has six items: الرئيسية، القرآن وعلومه، مسارات التكوين، الصغار والأسرة، المؤسسات، رحلتي. It only groups existing routes; every old hash route still resolves and highlights its destination. Three small hub pages were added (`#/domain/quran`, `#/domain/family`, `#/domain/inst`); they link to existing pages and list existing programs (P20/P21/P23, age-limited programs and P15/P16 for family, P13 for institutions), using the existing adult gate for student accounts. The search page is reached from the Quran hub, not from a header field (not done). The mobile bottom bar is unchanged.
- `#/academy/paths` («مسارات التكوين», also a tab in the academy) lists the 11 paths from `academy-paths.json` (built by `scripts/build_academy_paths.py`, which validates every program id against `academy-programs.json`, competencies against `academy.json`, ages against the programs, and that each of the 22 formation programs appears exactly once). Order, ages and rhythm are read from the programs. Internal ids are not shown.
- «ذات صلة» block on program, lesson and scenario pages, built only from `prerequisites`/`next_programs`, shared competency, shared `grounding.principle_id` (labelled as a candidate not yet reviewed), `optional_link` and same-unit membership. Each entry states its reason. No notebook data is read, no mood/faith inference.
- Stale copy fixed: competencies heading uses the computed count; the template counts on the institution pages use `TEMPLATES.length`.
- Parents: no UI renders notebook text; guide/parent pages contain none (checked by e2e with a planted notebook string). Notebook stays in per-user localStorage.

Not done: header search field, mobile bottom-bar change, per-band density classes, "turn off suggestions" and per-suggestion dismissal, relation file `relations.json`, tracks as program fields (phase 2 data fields), session views, review-status badges beyond the existing draft ribbon. All content remains unreviewed.
