# TARTIL 14.1 - Arabic editorial standard

Snapshot: 2026-11-03, about 23:32 EET (HEAD 69e3559 plus working tree). This document changes no content file. The parallel editorial stream (`docs/human-formation/qa/editorial_changes.json`, 65 recorded edits, working tree) has already rewritten some of the phrases below; the table gives the HEAD wording, the present state, and what remains.

## 1. Standard

Every learner-facing, parent-facing and guide-facing Arabic sentence must be:

1. Correct: standard grammar, vowels only where they remove ambiguity, no dialect, no machine-translation word order.
2. Clear: one subject, one verb, a stated object. A reader who has never seen the program understands who does what. If a verb needs an object (أنصف مَن؟ ماذا؟) the object is written.
3. Concise: no stacked genitives, no rhetorical doubling, no sentence over about 25 words for ages 10-12 and 18 for ages 6-9.
4. Not preachy: describes a situation and a choice; does not scold, moralise, or promise reward. Prefer "ماذا يمكنك أن تفعل" over "يجب عليك".
5. Never compelling disclosure of private matters. The learner may write for himself and is never required to read, show, confess or report what he wrote. Wording like "سمِّ نيتك" or "اعترف" is avoided; use "إن أحببت". Parents and mentors are told in the guide, in the same words, that they do not ask for the notebook.
6. Free of absolute words about the child's self ("دائمًا", "أبدًا", "فاشل", "سيئ") and of scoring language.
7. Free of internal markers and unresolved placeholders (such as "(D12)") and of encoding damage (section 4).
8. Free of unverified religious claims: no hadith before takhrij, no ruling, verses by reference only (`PEDAGOGY.md` 6.4).

## 2. Vague phrases

Method: scanned `programs.json`, `competencies.json`, `lessons/*.json`, `guides/*.json`, `PROGRAMS.md`, `COMPETENCIES.md` for the four reported phrases and their variants, at HEAD and now. "Now" is the working tree at 23:30.

### 2.1 «وأنصف حين يكلّفني»
- Intent: be fair to others even when it costs me something.
- Problem: the verb has no object and the fairness has no scene; "حين يكلّفني" has an unstated subject (what costs me?).
- Where at HEAD: `programs.json` P07 `tagline`; `PROGRAMS.md` line 176 (the same tagline, italic summary).
- Now: `programs.json` P07 tagline already reads «وأنصف حتى لو كلّفني ذلك». Still unfixed: `PROGRAMS.md:176` («وأنصف حين يكلّفني»).
- Replacements: ages 10-12: «وأكون عادلًا حتى لو خسرتُ شيئًا صغيرًا»; ages 13-15: «وأنصف غيري حتى لو كلّفني ذلك شيئًا»; adults: «وأنصف حتى حين يكون الإنصاف على حسابي».

### 2.2 «يسمّي ما فعله ونيته بلا حكم»
- Intent: describe what I did and what I meant, without judging myself.
- Problem: "نيته" asks a child to name an inner state; "بلا حكم" is jargon for a non-judgmental description and can be read as "without a religious ruling". Risk: it can pressure a child into disclosing inner states.
- Where at HEAD: `programs.json` P07 `outcomes[0]` and `stages[0].check`; `lessons_G3.json` formative, level "ظهر" of the first lesson ("يسمّي ما فعله بجمل وصفية ..."); `guides/P07.json` `for_parent.what_to_expect[0]`.
- Now: `outcomes[0]` and `stages[0].check` already say «يصف ما فعله في يومه وما قصده منه، دون أن يحكم على نفسه». Remaining: `lessons_G3.json` formative.ظهر ("يسمّي ما فعله بجمل وصفية ...") and `guides/P07.json` for_parent ("أن يسمّي ما فعله في يومه دون أن يحكم على نفسه"). `lessons_G7.json` contains "ونيته" twice, in an unrelated contract-analysis text; no change needed.
- Replacements: ages 10-12: «يحكي ما حدث في يومه كما كان، دون أن يلوم نفسه»; 13-15: «يصف ما فعله وما كان يقصده إن أراد، دون أن يحكم على نفسه»; adults: «يصف فعله وقصده وصفًا دقيقًا بلا جلد للذات». The "ما قصده" part must always be optional.

### 2.3 «يقول الحق في موقف يكلفه»
- Intent: tell the truth in a mildly awkward situation. It must not mean exposing family secrets or risking harm.
- Problem: "الحق" is abstract; "يكلفه" does not say what or how much; read broadly it can push a child to tell the truth in a dangerous situation.
- Where at HEAD: `programs.json` P07 `stages[3].check`; `lessons_G2.json` unit 1, lesson 4 (C1-L4) objective («أن يقرر الناشئ أن يقول الحق في موقف يكلّفه شيئًا يسيرًا ...») and its title («الصدق حين يكلّف»).
- Now: `stages[3].check` and the C1-L4 title («الصدق حين يكلّفني شيئًا») were rewritten. The objective in `lessons_G2.json` units[0].lessons[3] still has «يقول الحق في موقف يكلّفه شيئًا يسيرًا (حرجًا أو فوات مكسب صغير)». It is clearer than the original (it already bounds the cost) and can stay; the guide-side limit is the useful part: add "ولا يكشف سرًّا عائليًّا ولا يعرّض نفسه لخطر".
- Replacements: ages 10-12: «يقول الصدق حتى لو أحرجه قليلًا، كأن يعترف أنه كسر شيئًا»; 13-15: «يقول الصدق في موقف يكلّفه شيئًا يسيرًا (حرجًا أو فوات مكسب صغير)»; adults: «يقول الحق ويتحمل كلفته المعقولة».

### 2.4 «أنصف الخصم في الذكر»
- Intent: present another person's view the way they would put it.
- Problem: «الخصم» is too harsh for ages 10-12 and frames a classmate as an opponent; «الذكر» is ambiguous (dhikr, or mention) and in a religious program reads as remembrance of God.
- Where at HEAD: `competencies.json` C4 `definition` and `levels[3]`; `lessons_G2.json` C4-L4 title; `guides/P07.json` week 7 focus («إنصاف صاحب الرأي الآخر في الذكر»); `programs.json` P07 `stages[3].purpose` ("إنصاف للخصم") and `check` («وينصف خصمه في الذكر»); `COMPETENCIES.md` (same definition).
- Now: C4-L4 title is «أُنصف من يخالفني حين أعرض رأيه»; P07 `stages[3].check` and `.purpose` were rewritten («وينصف من يخالفه حين يذكر رأيه»; «إنصاف لمن يخالفني»). Still open:
  - `competencies.json` [7] (C4) `definition`: «وأن ينصف الخصم في الذكر والحكم».
  - `competencies.json` C4 `levels[3]`: «ينصف في خلاف ويذكر حجة الخصم».
  - `guides/P07.json` `for_guide.week_by_week[6].focus`: «الصدق حين يكلّف شيئًا يسيرًا، وإنصاف صاحب الرأي الآخر في الذكر».
  - `COMPETENCIES.md`, same text as the definition.
- Replacements: ages 10-12: «أعرض رأي زميلي كما يقوله هو، وأنصفه حين نختلف»; 13-15: «ينصف من يخالفه، فيعرض رأيه بأمانة ويذكر حجّته كما يراها»; adults and scholarly context: «إنصاف المخالف في عرض قوله وفي الحكم عليه». Keep «الخصم» only in classical quotations.

### 2.5 Summary of what still shows the old wording
`PROGRAMS.md:176`; `competencies.json` C4 definition and level 4; `COMPETENCIES.md`; `guides/P07.json` week 7 focus and for_parent line; `lessons_G3.json` formative line. Note that learners read the built copies `packages/web-vercel/academy-*.json`, so any fix must be followed by `scripts/build_academy.py`; I did not run it.

## 3. Phrases and patterns to add to a vague-phrase list

Candidates to flag automatically (list for a script, not yet in any script): «حين يكلّف» without an object, «أنصف» without «من» or «لمن», «الذكر» outside a dhikr context, «الخصم» in learner text under age 13, «يسمّي نيته», «بلا حكم», «يعترف», «يُقرّ», «سرّك» in prompts that ask for disclosure.

## 4. Encoding gate for broken HTML-entity patterns

Reported defect: entities such as "&#x627;" appearing as text. Verified result: not reproducible in the repo. Scan of `docs/`, `packages/`, `scripts/` for numeric and named entities returned 0 hits in `docs/human-formation`, `packages/web-vercel/index.html` and `academy-*.json`; no mojibake. U+FDFA occurs 312 times (legitimate "صلى الله عليه وسلم" ligature). Four U+200D in `index.html` are intentional. The viewer renders with `createTextNode`, so a stored entity would appear literally rather than decoded, which is the symptom described. The deployed artifact was not inspected (the deployment sits behind Vercel Auth), so the defect may exist in a different build or a different data path (for example text that passes through an HTML-escaping step on the server). Do not assume it is fixed.

Proposed gate (design, to add to `validate_completeness.py`):
1. Fail on regex `&#x?[0-9A-Fa-f]+;` and `&(amp|lt|gt|quot|nbsp);` in any string of programs, competencies, lessons, guides and in `index.html` data strings.
2. Fail on mojibake markers (`Ã`, `Ø§`, `Ù`) and the replacement character U+FFFD.
3. Fail on unexpected control and format characters except U+200D/U+200C where listed, and warn on U+FD47 and other single presentation forms (one exists in `extracted/S1.json`).
4. Run the same check on the built `academy-*.json` and, in the rendered test, on `document.body.innerText`.
5. Fail on internal markers: `\(D\d+\)`, `TODO`, `TBD`, `XXX`.

Related: the earlier "FAQ without answers" report is also not reproducible: all 24 guides have non-empty FAQ answers.

## 5. Process

Each edit to learner text is recorded in `qa/editorial_changes.json` (id, old, new, reason). A reviewer with Arabic competence confirms age fit; the pedagogical reviewer confirms the level; the child-protection reviewer confirms nothing compels disclosure. QA logs exist only for G1-G8 lessons and guides P01-P16, so H, Q, X, Y, Z lessons and P17-P24 guides have had no recorded editorial pass.
