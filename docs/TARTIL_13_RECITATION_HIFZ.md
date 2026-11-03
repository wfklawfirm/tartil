# TARTIL 13.0 - Recitation and Hifz (التلاوة والحفظ): journey audit

Audit date: 2026-11-03. Scope: the required recitation/hifz journey checked step by step against the code in the repository (migrations 0009, 0013, 0014, 0015; the API in `packages/api/src/app.ts` and `recitation.ts`; the recorder UI in `packages/web-vercel/index.html`; the speech-to-text provider in `packages/edge/dist/index.ts`). Status vocabulary: WORKING, PARTIALLY WORKING, UI ONLY, BROKEN, MISSING, BLOCKED, NEEDS SCHOLARLY REVIEW. "Not verified" means I could not confirm it from code or a test I ran. Nothing in this document was changed in the code; this is an audit only.

## 1. Headline

- The personal tasmi' pipeline (record or upload -> external speech-to-text -> word-level alignment against the stored Hafs text -> word-by-word review with synchronised playback) is built end to end in code and its deterministic part is tested (9 passing tests, run today).
- It has NEVER succeeded against a real speech provider in production: the live OpenAI call returns HTTP 429 (`docs/governance/KNOWN_LIMITATIONS.md` section 37 and 38; observed by a previous session, not re-observed by me, no network call was made today). Status for the live path: BLOCKED (owner: check billing/quota or supply another provider key).
- What the system really does is Text Alignment plus Omission/Addition detection derived from a general-purpose transcript. It does NOT do pronunciation, tajweed, or any certification. Human judgement exists only as a separate, manual qari workflow (assessments, homework review), and it is not wired to the machine analysis except as a labelled attachment.
- Three journey links are missing: the analysis does not feed the hifz review schedule or the study plan, a teacher cannot see a student's personal attempts, and the personal path has no guardian/minor gate.

## 2. Capability separation (the six concepts)

The code itself declares what it does not assess (`RECITATION_CAPABILITIES` in `packages/api/src/recitation.ts`; provider capability flags `pronunciation: false`, `tajweed: false`, `calibratedConfidence: false` typed as literal `false`).

| Concept | What it means here | Supported? | Evidence | Needs external service? |
|---|---|---|---|---|
| Text Alignment | Needleman-Wunsch alignment of expected words (from `quran_ayahs.text_raw`) against heard words, with Arabic normalisation (diacritics stripped, alef/ya/ta-marbuta folded, madd letters skipped in comparison) | WORKING (deterministic, unit tested) | `recitation.ts` `alignWords`, `wordCost`; `test/recitation.test.ts` tests 1-6 pass | No (pure code) |
| Word Recognition | Turning audio into Arabic words with timestamps | PARTIALLY WORKING: implemented only through OpenAI `whisper-1` (general ASR, `language=ar`, word timestamps); live call BLOCKED by 429; accuracy on Quranic recitation (tajweed-elongated, slow, melodic) is unmeasured | `packages/edge/dist/index.ts` lines 40-54; limitations section 37 | YES: external provider; audio leaves the platform (consent checkbox is required by the API) |
| Omission / Addition | Words expected but not heard (`omitted`), heard but not expected (`extras`), different word (`substituted`), spelling-near (`near`) | WORKING as a computation on a transcript; reliability is only as good as the recogniser. Results are "possible issues", never confirmed errors | `alignWords` output ops; test 3 (omission, substitution, extra located at the right ayah/word); test 6 (skipped ayah) | Depends on Word Recognition |
| Pronunciation Signals | Makharij/sifat/phoneme-level correctness | MISSING (deliberately): no phonetic model. Reported as "not assessed" in every result and in the UI | `RECITATION_CAPABILITIES.pronunciation`; test 5; UI text in `showResult` | YES: a validated Arabic/Quranic phonetic model; none selected |
| Tajweed Assessment | Rules (ghunna, madd, qalqala, idgham...) judged on the learner's audio | MISSING (deliberately). Separate from the display-only tajweed colouring of the text, which is approximate and NEEDS SCHOLARLY REVIEW (limitations 27) | same as above | YES: validated model plus scholarly sign-off |
| Human Certification | A qualified person's assessment, or an ijazah | PARTIALLY WORKING for human observation only: a qari can write an append-only assessment with levels 1-4 per dimension (`assessments`, `assessor_kind` pinned to `human_qari`) and approve/return homework. The platform issues no ijazah and states so. No reviewer pipeline for recitation exists beyond this | `0006_..sql` assessments; `app.ts` POST `/i/:inst/assessments`; `0014` `homework_reviews`; CLAUDE.md non-negotiables | YES (people): named qaris and a scholarly lead are still an owner action (`PROJECT_STATE.md` "Waiting on owner" item 2) |

What the UI tells the learner (verified by reading the code): "not assessed: pronunciation and tajweed; no overall score; teacher review: not yet sent" (`showResult` in `index.html` ~line 1320) and the card note about no reference recitation (no audio comparison against a model reciter exists because audio licensing is an owner decision).

Important subtlety: the aligner deliberately ignores madd letters (`skel`), so a lengthened or shortened vowel can never be reported. That avoids false errors but also means madd correctness is invisible by design.

## 3. Step-by-step journey audit

Required journey: choose verses -> record -> save file -> process -> align -> detect errors -> feedback -> review -> send to teacher -> update plan.

| # | Step | Status | What exists | Gap / note | Evidence |
|---|---|---|---|---|---|
| 1 | Choose verses | PARTIALLY WORKING | Surah select plus from/to ayah numbers in `tasmiTab`; server enforces range (to >= from, max 40 ayat) and that every ayah exists in the stored text (404 `passage_not_available`) | No picker from the reader, from a hifz item, or from the plan; the user retypes the range. Server uses the first edition by code (`ORDER BY code LIMIT 1`) without checking `religious_approval` in that query; Hafs only is loaded, so riwayah choice is not a real option (not verified for multi-edition behaviour) | `app.ts` `/me/recitations/analyze` ~lines 326-342; `index.html` `tasmiTab` |
| 2 | Record | PARTIALLY WORKING | MediaRecorder with mime fallback list, level meter, 4-minute auto-stop, file upload alternative (webm/ogg/wav/mp3/m4a, max 8 MB), consent checkbox | Real microphone and Safari/iPhone never exercised (limitations 21, 23, 37). Homework page has a second, simpler recorder hard-coded to `audio/webm`, which Safari may not produce (not verified) | `index.html` ~1334-1357, ~853; limitations 21/23/37 |
| 3 | Save the file | PARTIALLY WORKING (two different paths) | (a) Personal tasmi': audio is processed transiently and NEVER stored; only the analysis JSON is kept (`audio_retained` pinned false by CHECK). (b) Institution submission: private bucket `recitations`, server-derived object path `<inst>/<student>/<id>.webm`, signed upload and 60 s signed download | Consequences: a saved personal attempt cannot be replayed or sent to a teacher as audio (UI says so). The upload path was tested with a fake signer only (`TARTIL_13_SECURITY.md`); a real bucket round trip from the UI was not click-tested by the earlier slices. Upload URL always `.webm` / `audio/webm` even if the file is another type | `0013_recitation_attempts.sql`; `app.ts` ~212-224; `docs/TARTIL_13_SECURITY.md` rows on secure upload |
| 4 | Process | BLOCKED (live) / WORKING (with a test provider) | Content-sniffed audio type, base64 body limit 12 MB, provider call, persistence. Provider failure returns 502 and saves nothing (tested). Without a configured provider the endpoint returns 501 and never fabricates a result (tested) | OpenAI returns 429 on the live key. Fixed earlier: `Buffer` import for the edge runtime (found only by live smoke, i.e. local tests cannot catch runtime differences). Processing is synchronous inside the request (timeout 100 s on the provider call); no queue, no retry, no status polling | limitations 37; tests 7-9; `edge/dist/index.ts` |
| 5 | Align | WORKING (deterministic) | Expected words built from the stored text; basmala prefix handled for ayah 1 (`stripBasmalaPrefix`); alignment with timestamps carried through | Tests use a fake recogniser over Al-Fatiha ayat 1-4 only; behaviour on longer passages, repeated phrases (mutashabihat), waqf/ibtida' repetition, or learners who self-correct is not tested | `recitation.ts`; `test/recitation.test.ts` |
| 6 | Detect errors | PARTIALLY WORKING | Per-word ops `match/near/substituted/omitted` plus extras; "insufficient evidence" when coverage < 30 % (then no word list is returned) | Only hypotheses. Order-sensitive but not repetition-aware. No diacritic (harakat) errors at all, since comparison is letters only. No calibrated confidence. Whisper tends to normalise or "correct" what it hears, which can hide real omissions (not measured; unmeasured accuracy stated in limitations 37) | `normalizeAr`, `MIN_COVERAGE`; test 4 |
| 7 | Feedback | PARTIALLY WORKING | Word-by-word coloured text, tap a word to read an Arabic note and jump to that position in the audio, timeline, playback speed, summary counts, history of attempts for the same passage | Notes are generic templates per op (`OPNOTE`), not teaching feedback. Synchronised playback exists only for the just-recorded blob; a saved attempt shows no audio. UI behaviour verified in Chromium earlier with real browser tests per PROJECT_STATE, but the microphone path was not | `index.html` `showResult`, `OPNOTE`; limitations 37 |
| 8 | Self review | PARTIALLY WORKING | History list, view, delete (owner-only RLS, tested); progression text across attempts at the same range. Separately, hifz items have spaced-review ratings 1-4 chosen by the learner | The two are not connected: the analysis does not suggest or set a hifz review rating, and `hifzTab` does not read `/me/recitations` (checked: no reference in that function). Hifz status "memorized" is self-declared (limitations 25) | `app.ts` `/me/recitations*`, `/me/hifz*`; `0009_personal_hifz_quiz.sql`; `index.html` `hifzTab` |
| 9 | Send to teacher | PARTIALLY WORKING | Two real routes exist. (a) Homework: a student submits "done" with an optional attached tasmi' attempt, copied server-side from the student's OWN attempt as a labelled `machine_hypothesis` with `notAGrade: true`; teacher sees it with the label "unapproved machine hypothesis (not a grade)"; or an audio submission via the private bucket which the teacher can play. (b) Free-standing submission to the institution (`/i/:inst/submissions`) with teacher state changes | (1) The attempt attach button appears only for `mark_done` homework, not in audio mode (UI), although the API accepts `attemptId` for both. (2) A teacher cannot browse a student's personal attempts; there is no "share this attempt" action. (3) The attach button was syntax-checked and API-tested but not clicked in a browser (limitations 38). (4) Guardian recording for a child is supported in policy, but a child's own device recording is required for homework audio | `app.ts` ~815-842; `index.html` ~846-858, ~934-936; `test/homework.test.ts` test 3 passes; limitations 38 |
| 10 | Teacher feedback and review | PARTIALLY WORKING | Homework review (approved / needs_retry / excused with a note), state machine in the database (`hw_status_guard`), re-approval blocked, student cannot self-approve (tested). Assessments with 1-4 levels per makharij/sifat/ahkam/fluency/memorisation plus a note, linked optionally to a submission | No audio or voice feedback from the teacher (deliberately not built: retention/consent policy needed, limitations 38 "Deliberately NOT built"). Assessments UI exists (`/assessments` calls in `index.html`); I did not exercise it. Homework 3 tests pass here; assessments are covered by earlier tests (not re-run by me) | `0014_homework.sql`; `app.ts` 695-709, 844-860; `test/homework.test.ts` |
| 11 | Update the plan | MISSING (as a loop) | The plan page (`#/plan`) builds a schedule from the learner's own inputs and an adaptation rule from hifz overdue/lapses; `study_plans` can be shared with a teacher who approves or requests changes (migration 0015, RLS and guard trigger) | Nothing reads recitation results. The plan is computed in the browser; teacher notes do not change it automatically. The "add to my hifz" action uses `/me/hifz` and was not exercised end-to-end with a signed-in user (limitations plan line) | `0015_study_plans.sql`; `app.ts` ~928-956; limitations lines on the plan page; `test/plan.test.ts` (not re-run) |

## 4. Data model (as built)

| Table | Migration | Holds | Isolation | Notes |
|---|---|---|---|---|
| `hifz_items`, `hifz_reviews`, `quiz_attempts` | 0009 | Learner-owned memorisation items, scheduler state (ease, interval, reps, lapses, due), ratings 1-4, quiz scores | RLS: own rows only; `UPDATE` limited by column grant | Self-assessment, not an assessment. Scheduler `nextReview` unit tested (PROJECT_STATE) |
| `recitation_attempts` | 0013 | Surah, range, status (`analyzed` / `insufficient_evidence`), provider, duration, result JSON | RLS select/insert/delete own; no update; `audio_retained = false` enforced | No FK to a hifz item, homework, or plan; no teacher visibility; no retention policy; DB-level isolation not covered by a database test (`TARTIL_13_SECURITY.md`); API-level isolation is tested |
| `recitation_submissions` (0001, policies replaced in 0014) | 0001/0014 | Institution audio submission metadata, private object key, state workflow | Institution RLS; assigned qari or halaqah qari, guardian, admin, safeguarding can read; minors need a live guardian audio consent (trigger) | The consent trigger exists only here, not on the personal analyse endpoint |
| `assessments` | 0006 | Human qari levels 1-4 per dimension | Institution RLS | `assessor_kind` fixed to `human_qari`; never machine |
| `homework_*` | 0014 | Assignments, recipients, submissions (with `ai_hypothesis`), reviews, requests, templates | Institution RLS, teacher-of relation, status guard trigger | Completion is not mastery: only a human teacher approves |
| `study_plans` | 0015 | One plan per learner, optionally shared, teacher decision | Owner or the learner's teacher/admin | Payload is the learner's own inputs |

## 5. API routes in the journey

| Route | Purpose | Status | Verified by |
|---|---|---|---|
| GET `/me/recitations/capabilities` | Tells the UI whether analysis is available and which provider, plus "sends audio to external provider: true, stores audio: false" | WORKING (reports availability from configuration only; does not test the key) | `test/recitation.test.ts` test 9 (unconfigured case); live claim in limitations 37 that it said "available" while the real call failed |
| POST `/me/recitations/analyze` | The pipeline | WORKING with a fake provider; BLOCKED live | tests 7-8 |
| GET/DELETE `/me/recitations`, `/:id` | History | WORKING | test 8 (owner-scoped) |
| POST `/i/:inst/submissions`, upload-url, audio-url, state | Institution audio | PARTIALLY WORKING (fake signer in tests; live bucket flags read-only verified per `TARTIL_13_SECURITY.md`) | `test/journey.test.ts` per that document |
| POST `/i/:inst/homework/:rid/submit` and `/review` | Send to teacher, review | WORKING in tests | `test/homework.test.ts` (3 pass) |
| POST `/i/:inst/assessments` | Human assessment | WORKING in earlier tests (not re-run by me) | not verified today |
| GET/PUT `/me/hifz*`, POST `/me/hifz/:id/review` | Hifz scheduling | WORKING in tests (hifz tests passed in a run that was later killed; the hifz and quiz results are in the same output, see Evidence) | `test/hifz.test.ts` |

## 6. Speech-recognition provider

| Item | Finding |
|---|---|
| Provider code | `packages/edge/dist/index.ts` builds the provider only when `OPENAI_API_KEY` exists. Model is hard-coded `whisper-1`, `language=ar`, `verbose_json`, word timestamps |
| Local/offline option | MISSING. `packages/api/src/server.ts` was not found to define a provider for local runs (not verified beyond a text search); tests inject a fake provider |
| Live status | BLOCKED by HTTP 429 (limitations 37, 38) |
| Data protection | Audio goes to a third party. The API requires `consentExternalProcessing: true`; the UI shows the provider name in the consent text. No data-processing agreement or region choice is recorded in the repository (not verified elsewhere) |
| Minors | The personal path takes only a user id: there is no minor flag and no guardian consent check on `/me/recitations/analyze` (`TARTIL_13_SECURITY.md` row on guardian approval). Registration has an 18+ checkbox (limitations 21), which is a declaration, not enforcement |
| Quality | No benchmark of word error rate on tajweed-style recitation, children's voices, or dialect-accented readers exists. Whisper is a general model and may hallucinate text on silence or noise; the coverage threshold is the only guard |
| Alternatives | Quranic-specific recognisers or phoneme models exist in the market and research, but none is selected, licensed, or evaluated in this repository. Choosing one is an owner decision (cost, privacy, hosting) |

## 7. Differences the owner must not blur (plain language)

1. "The student said every word" (Text Alignment + Omission/Addition) is not "the student recited correctly" (Pronunciation + Tajweed). The platform reports only the first and states the second is not assessed.
2. A good alignment score is never a grade. There is no overall score by design (UI text, test 5).
3. Machine output is not a review. The only reviews are a human qari's homework decision or assessment. Nothing certifies recitation; no ijazah is issued; the sanad register is self-declared unless a reviewer recorded having seen documents (limitations 26).
4. Hifz "memorized" is the learner's own claim; completion of homework requires teacher approval if `requires_review` is true (default true).

## 8. What requires an external service or decision

| Need | Type | Owner decision? |
|---|---|---|
| Working speech-to-text key or a different provider | External service / billing | Yes (cost) |
| Quranic pronunciation or tajweed model, plus evaluation set labelled by qualified readers | External service plus scholarly labour | Yes (cost, scholars) |
| Reference recitation audio for comparison and teacher voice feedback | Licensing, retention policy | Yes (licence terms; retention for minors) |
| Named qaris and scholarly lead to review tajweed library, quizzes, and to act as certifiers | People | Yes |
| Guardian consent flow for children using the personal analyser | Safety design | Yes (policy), engineering afterwards |
| Data-processing terms for sending audio to a provider | Legal | Yes |

## 9. Gaps in priority order

1. Live blocker: no successful end-to-end analysis with a real provider (429). Until fixed, the whole "process -> align" chain is demonstrated only with a fake recogniser.
2. No teacher visibility of personal attempts and no "send attempt to teacher" action outside homework attachment; attach button hidden in audio mode; attach path not clicked in a browser.
3. No loop from recitation to hifz review rating and study plan (step 11 MISSING). The learner has to rate themselves manually.
4. Personal analysis lacks a minor/guardian gate; consent exists only on institution submissions.
5. Accuracy is unmeasured: no test set, no threshold calibration. Aligner unit tests cover only 4 ayat of Al-Fatiha with a fake recogniser.
6. Device coverage: microphone recording on real iPhone/Safari and Android never exercised; homework recorder is fixed to webm.
7. Stored text selection in analyse does not filter by approval and Hafs is the only riwayah loaded; multi-riwayah behaviour is undefined.

## 10. Recommended next steps (engineering, no owner decision needed)

- Add a read-only "share this attempt with my teacher" action reusing the homework hypothesis pattern, and expose the attach button in audio mode.
- Add a hifz-item picker as the source of passage in the tasmi' tab and a button "update my hifz review" that pre-fills a rating suggestion the learner confirms (still self-assessment).
- Add tests: repetition (mutashabih) passages, longer ranges, Al-Baqarah verse 255 sized input, empty and noise transcripts from a provider double, and a DB-level isolation test for `recitation_attempts`.
- Filter the edition query by approved edition code and surface the edition in the response.
- Add a provider health check (capabilities currently reports configuration, not reachability).

## Evidence

Files read:
- `CLAUDE.md`, `PROJECT_STATE.md`, `docs/governance/KNOWN_LIMITATIONS.md` (sections 21, 23, 25, 26, 27, 37, 38 and plan lines), `IMPLEMENTATION_TRACKER.md` (rows 8, 10, 14)
- `packages/database/migrations/0001_foundation.sql` (recitation_submissions, consent trigger), `0006_halaqat_attendance_assessments.sql` (assessments), `0009_personal_hifz_quiz.sql`, `0013_recitation_attempts.sql`, `0014_homework.sql`, `0015_study_plans.sql`
- `packages/api/src/app.ts` (submissions, upload/audio routes, assessments, `/me/hifz*`, `/me/recitations*`, homework submit/review, study plan routes), `packages/api/src/recitation.ts`
- `packages/edge/dist/index.ts` (provider), diff of `packages/edge/dist/app.ts` against `packages/api/src/app.ts` (differences: only the static web-index route, an error hook and an import; `recitation.ts` is identical)
- `packages/web-vercel/index.html` (`tasmiTab`, `showResult`, homework recorder, teacher review, `hifzTab`)
- `packages/api/test/recitation.test.ts`, `homework.test.ts` (test names and assertions); `docs/TARTIL_13_SECURITY.md` (cross-reference)

Commands run today in `packages/api`:
- `npx tsx --test --test-concurrency=1 test/recitation.test.ts`: 9 tests, 9 pass, 0 fail.
- `npx tsx --test --test-concurrency=1 test/homework.test.ts`: 3 tests, 3 pass, 0 fail.
- An earlier parallel run of recitation, homework, plan and hifz together was killed by the sandbox (SIGKILL after ~40 s, resource limit, not an assertion failure); in that output the hifz and quiz tests showed `ok`. `test/plan.test.ts` was not completed standalone and is NOT verified by me.
- No network call, deployment or database write was performed. The live 429 is taken from the repository's own record, not re-observed.

## Open items

1. Owner: fix OpenAI billing/quota or choose another speech provider; then run one real end-to-end analysis and record the result (including accuracy on a labelled sample).
2. Owner: decide on a pronunciation/tajweed model (or confirm that machine assessment stays out of scope) and on reference audio licensing.
3. Owner: appoint qaris and a scholarly lead; decide the child-data retention policy and whether children may use the personal analyser with guardian consent.
4. Engineering: items in section 10; re-run `plan.test.ts` standalone; click-test the attach-attempt button and the microphone path on a real phone.
5. Not verified: the assessments UI behaviour, the live bucket round trip from the UI, Safari recording, multi-edition behaviour, server-side local provider for development.
