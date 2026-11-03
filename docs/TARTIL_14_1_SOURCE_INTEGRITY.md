# TARTIL 14.1 - Source integrity

Snapshot: 2026-11-03, about 23:30 EET (HEAD 69e3559 plus working tree). Scope: the Human Formation academy (`docs/human-formation/`). The Quran library has its own registry and is only mentioned for contrast. Companion: `TARTIL_14_1_CONTENT_PIPELINE.md` (stages 3-4, gate 6).

## 1. Summary

- Every heritage-derived principle in `extracted/*.json` carries a free-text book string and a line locator. That is all. There is no edition, no editor (muhaqqiq), no publisher, no rights record, no hash, and no per-principle verification field.
- A locator check exists (`scripts/check_extracted_ids.py --locators`). Run on this snapshot: 531 principles in 52 files, 0 id errors, 531 locators checked, 2 failing (C6-10, K2-01). It only works with the private, git-ignored corpus.
- No automated verification of verses, hadith, or attribution exists. Nothing in the academy has been through takhrij.
- 40 Source Passage Records (SPR) exist as markdown; all are marked "لم تُراجع" (not reviewed). 14 units state "لا سجل مصدري بعد" (no source record yet).
- The reviewer roles that could change any status are held by nobody.

## 2. What the data actually retains (verified by reading)

`docs/human-formation/extracted/*.json` (public repo). Top level: `competency`, `status` (observed value: `draft-unreviewed`), `principles`, `gaps`, `books_read`. Each principle: `id`, `idea`, `book`, `locator`, `kind` (principle / practice / caution), `age_fit`, `flags`, `not_to_take`, and sometimes `verse_refs`.

- `book`: a free string such as "9472 - إحياء علوم الدين - أبو حامد الغزالي (ت ٥٠٥هـ)" (the number is a local corpus id), or occasionally a dict. Not normalised.
- `locator`: chapter text, an arrow, then "line N" in a local text copy, counted by "\n". Example (ANG-01): "الفصل الرابع (القوى الغضبية) ← «ثوران الغضب وفضل كظمه» ← line 375 ...". There is no printed page number, no volume, no edition. The line numbers are only meaningful against the exact local file; a different export shifts them.
- `flags`: observed vocabulary in ANG alone: needs-reviewer (19), outdated-context (9), harsh-language (7), ungraded-hadith (7), contested-ruling (5), sectarian-tone (1), attribution-doubtful (1).
- `gaps` and `books_read`: honest lists of what was and was not read. ANG states that hadith and athar were not graded, verse numbers must be checked against the verified Quran text before use, and the editions read contain grades and takhrij the project does not adopt.
- The private copy (`scholarly-assets/extraction-formation`) adds `private_check`, the quoted fragment that the locator check compares.

What is lacking: edition and muhaqqiq; publication rights; sha256 of the book file; reviewer identity and date; per-principle "verified / not verified"; verse and hadith verification result; version of the extraction prompt or process. A stray U+FD47 character sits in `extracted/S1.json` (cosmetic).

## 3. Source register: what exists, per text type

| Layer | Where | Fields kept | Verification status |
|---|---|---|---|
| Extracted principle | `extracted/*.json` (531) | book string, line locator, kind, age_fit, flags | Locator checked by script (529 pass, 2 fail). Content unreviewed. |
| Source Passage Record | `records/*.md`, `PILOT_SOURCE_RECORDS.md` (40: 3 pilot, 37 more) | source, comparison, material types, review status | All "لم تُراجع". Prose, not structured edition/muhaqqiq/rights/takhrij fields. `BLUEPRINT.md` D7 specifies more fields than the records hold. |
| Lesson `source_basis` | `lessons/*.json` | e.g. "SPR-W3 / الاستنباط 3 و4 ... \| تأصيل: W3-02 (مبادئ مستخرجة، مسودة غير مراجَعة)" | Links to SPR/principle ids; checked for id existence only. |
| Book files | `scholarly-assets/_inputs/formation-books` (168 txt, private) | none registered | Not in `source_registry.csv` (no sha256, edition, rights). The registry covers the Quran library only. |
| Quran-library quotes | `scholarly-assets/review/citation_verification_summary.json` | 2541 quotes, 91.7% verified | Reported by that file; not re-run by me. Different corpus and method. |
| DB records | `source_records`, `source_record_reviews` (0017) | `takhrij_status`, `rights_status`, content sha256, three role reviews | Local only; `takhrij_status` and `rights_status` do not gate approval; not applied to production; no UI. |

## 4. Known unverifiable items

Run: `python3 scripts/check_extracted_ids.py --locators` (needs the private corpus).

- K2-01: the locator is correct (line 3835 of book 9472 contains the passage), but the stored `private_check` fragment is mis-transcribed: it reads "ولا يجوز لك أن تصدق به" while the book reads "ولكن لا يجوز لك ان تصدق به". The defect is in the check string, not the locator. Fix is a one-line correction in the private copy and the public file.
- C6-10: the fragment "ليس بفقيه من لم يعد البلاء نعمة، والرخاء" is not found in book 9472. A differently worded Thawri saying ("لا يكون الرجل عالما حتى يعد البلاء نعمة والرخاء عقوبة") exists in book 482 at line 875, not at the cited 482 line 677. The principle is therefore attributed with a wording and location that could not be confirmed. Until a reviewer re-reads the source it must not be quoted, and any lesson that depends on it should cite the idea, not the wording.
- Neither item is corrected by this document (the user restricted edits to the doc files).

## 5. Verses and hadith

- Verses: all 92 `verse_refs` (73 distinct) parse and fall inside valid surah and ayah bounds (my one-off check; not a repo script). Thematic fit is unverified. No learner or guide file contains the ornamented-parenthesis form of a verse or an introduction such as "قال رسول الله" or "قال النبي" (grep, zero hits); `PEDAGOGY.md` 6.4 says verses are cited by reference only and no hadith is used before takhrij. This is a policy plus an absence, not a gate.
- Hadith and athar: the extracted ideas mention them, flagged `ungraded-hadith`. There is no takhrij tool, no grade store, no check that a narration is attributed to the right Companion or collection. Status: NOT VERIFIED anywhere in the academy.
- Quran text for display must come from the verified, edition-pinned store (CLAUDE.md non-negotiable), never from a book extract.

## 6. Policy: heritage text is not empirical psychology evidence

1. A heritage passage supports a value, a practice, or a moral framing. It is never cited as evidence that a technique works, that a developmental stage exists, or that a method is effective for children.
2. No lesson, guide or program text may phrase a heritage source as scientific, clinical or developmental support ("research shows", "psychologists agree"), and may not use a heritage passage to justify an age claim.
3. Age claims and modern techniques (naming feelings, breathing, reappraisal, negotiation) carry the tag "contemporary educational principle needing a specialist reviewer" and no heritage attribution. Several `gaps` already say this; the policy makes it binding.
4. Sources written for adults (all principles in ANG are age_fit "ناشئة، شباب" or older; none targets under-12s) are simplified by the project; the simplification is the project's and must be reviewed pedagogically, not attributed to the author.
5. Rulings (halal/haram, validity) are out of scope for the academy; they go to qualified scholars (see child-safety document for how to say this without a blanket referral).
6. Flags `contested-ruling`, `sectarian-tone`, `harsh-language`, `attribution-doubtful` and `outdated-context` block direct use until a reviewer resolves them. Orientation follows CLAUDE.md: moderate mainstream, plural across madhhabs, no polemics.

## 7. Real gaps

1. The formation books are not registered: no sha256, edition, editor, rights status. Without this, locators cannot be re-found after any re-export.
2. No per-principle verification state and no reviewer identity.
3. Extraction is not reproducible: no script and no stored prompts in the repo.
4. 40 SPR, all unreviewed; 14 units have none (H1-H5, Q1-Q6, X3-A, X3-B, X5-A); 12 competencies have no SPR.
5. No takhrij and no edition check for any hadith or athar.
6. The locator check is not runnable without the private corpus; it is not in CI.
7. `BLUEPRINT.md` D7 fields (edition, muhaqqiq etc.) are not implemented in markdown records or in DB-linked data.
8. The DB `source_records` model has hash-bound reviews but is unapplied and unconnected to `extracted/` ids.

## 8. Proposed register (design only)

One CSV/JSON row per book: `book_id`, title, author, death year, edition, muhaqqiq, publisher, file sha256, rights_status (default NOT CLEARED), allowed use (internal analysis only), registered_by. One row per used passage: principle id, book_id, locator, checked_text_sha256, verse refs, hadith refs with takhrij_status (not_done / done_by / grade_not_adopted), verification_status, reviewer, date. A script checks every `book` string in `extracted/` against the register and fails on an unregistered book; the publication gate (see `TARTIL_14_1_CONTENT_PUBLICATION.md`) refuses Published while any cited source is unregistered or unreviewed.
