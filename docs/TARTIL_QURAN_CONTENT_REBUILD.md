# TARTIL_QURAN_CONTENT_REBUILD

Status: audit plus proposal, 2026-11-05. Written for Master Prompt V3, section 7 (Quran content and its sciences). Nothing here changes code, data, or Quran text.

Evidence base (only these): `packages/web/index.html` (read, not executed in this pass), `packages/web/academy-programs.json`, `docs/human-formation/competencies.json`, `docs/human-formation/qa/db_inventory_2026-11-05.json` (read-only snapshot of Supabase project `okbtrogotrtciymmuokr`), `docs/governance/KNOWN_LIMITATIONS.md`, `LICENSE_REGISTER.md`, `docs/extraction/CONCEPTS_V1.md`. No test was run for this document; "exists" below means "present in code or in the snapshot", not "verified working".

## 1. What actually exists

### 1.1 Database (snapshot 2026-11-05)

| Item | Count | Note |
|---|---|---|
| `quran_ayahs` | 6,236 | one edition (`quran_editions` = 1): Tanzil Uthmani 1.1, Hafs 'an 'Asim. Provisionally APPROVED by the owner; not a scholarly approval |
| `quran_reference_counts` | 114 | surah-level ayah counts (used by the reader and the plan) |
| `translation_ayahs` / `translation_editions` | 6,236 / 1 | Clear Quran (Talal Itani, CC BY-ND 4.0), separate immutable tables, opt-in toggle |
| `scholarly_items` | 39, all `concept/DRAFT` | 14 makharij + 23 sifat concepts + 2 variation records; lexical extraction, about 15% false or tangential in the spot check (CONCEPTS_V1); licence not cleared; nothing published |
| `scholarly_reviews` | 0 | no human review has happened |
| `learning_tracks` | 2 | both titled "أساسيات التجويد": one `published`, one `draft`, exact duplicates (10 units each, identical titles). Do not delete without a backup and an owner decision |
| `track_units` | 20 | 10 per track |
| `hifz_items` / `hifz_reviews` | 1 / 1 | essentially a test row |
| `quiz_attempts`, `recitation_attempts`, `recitation_submissions`, `study_plans`, `sanad_entries`, `kid_profiles`, `kid_attempts`, `qari_assignments`, `unit_progress`, `assessments` | 0 | features exist; nobody has used them in the live DB |
| Academy P01-P25 | not in DB | lives only in static JSON built from `docs/human-formation` |
| Migrations 0017-0020 | not applied | per the snapshot |

### 1.2 Web client (static code in `packages/web/index.html`)

| Area | Route | What is in the code | Status |
|---|---|---|---|
| Mushaf reader | `#/quran`, `#/quran/{surah}/{ayah}` | 114 surahs, surah header, search, resume, bookmarks, optional translation, collapsible tafsir panel (Jalalayn, Ibn Kathir, Qurtubi, Baghawi, Tabari fetched on demand from a public repo), audio player (115 Hafs reciters streamed from mp3quran.net, ayah highlight), rule-based tajweed colouring (display layer only) | Exists. Audio and tafsir have unstated terms (KNOWN_LIMITATIONS 31, 32). Colouring is approximate (27). Missing: juz/hizb/page navigation, Meccan/Medinan, word meanings (36) |
| Search | `#/search` | substring search in Arabic (diacritic-insensitive) and English translation, first 50 hits | Exists; no root or lemma search (33) |
| Tajweed library | `#/tajweed/{makharij,sifat,ahkam,mudood,explore}` | five tabs: makharij data, 12 sifat definitions, noon/meem rules, madd types, letter explorer; examples fetched live from the mushaf text | Exists, AI-authored from common knowledge, provisional (24). Not reviewed |
| Makharij | `#/tajweed/makharij` | general and specific sites; no animated mouth/tongue diagram | Partial: the lab is explicitly not built because positions must not be guessed (kids page, "not available" list) |
| Qiraat | `#/qiraat` | list of 10 readers and their 20 rawis, a notice that only Hafs text is loaded, and a link to the sanad register | Partial: information only, no riwaya text, no lessons |
| Sanad | `#/me/sanad` | self-entered record; shown "verified" only if a human scholarly reviewer confirms | Exists; `sanad_entries` = 0 |
| Hifz | `#/me/hifz` | add passages, spaced-repetition scheduler (`nextReview` unit-tested), streak and per-surah progress | Exists; self-assessment only |
| Tasmi' | `#/me/tasmi` | record, speech-to-text, word-by-word alignment against mushaf text, synchronous highlight | Exists in code; live STT call returned HTTP 429 (billing/quota), so no successful live analysis. Does not assess pronunciation or tajweed (37) |
| Quiz | `#/me/quiz` | 4 quizzes (makharij 8, sifat 8, noon/meem 10, mudood 7 = 33 questions, AI-authored, "preliminary, under review") plus "complete the ayah" drawn from the mushaf text | Exists; 0 attempts recorded |
| Plan | `#/plan` | questions then a suggested hifz/review/reading schedule (goal new/review/read; direction; minutes; days; passage size), adapts to overdue and lapse rates | Exists; a suggestion, not a ruling |
| Mastery map | `#/me/map` | per-surah mastery and quiz bests | Exists |
| Foundations | `#/foundations` | letters (28 shown), letter forms, harakat, syllables, quiz; kids mode, adult mode, "I know the letters" mode (quiz first). No machine audio for letters | Exists, draft under review (FOUNDATION_CURRICULUM) |
| Kids academy | `#/kids` | three bands (4-6, 7-10, 11-14), letter recognition, matching, level placement, recommendation, device-local progress ("mastered" = 4 of last 5 on two days); optional server sync; link to homework | Exists. Audio activities and the animated makharij lab are listed as unavailable |
| Homework | `#/app/{inst}/homework` | teacher-assigned Quran passages and review (migration 0014) | Exists; all homework tables 0 rows |
| Academy | `#/academy`, `/academy/p/{slug}`, `/academy/c`, `/academy/review` | 25 programs P01-P25 in 8 age bands, all `status: draft-unreviewed` (JSON header); statuses `planned`, `pilot`, `adults_gated` | Exists as preview; unreviewed |
| Track templates | institution console | 8 templates: foundation reading, Tuhfat al-Atfal, al-Jazariyyah, Juz' 29 and 28 memorisation, selected surahs, weekly review, 30-day khatm | Proposals, not endorsed (28) |
| Tafsir (own) | none | only the third-party panel above | Missing as a lesson content line |
| Tadabbur | none standalone | appears only inside P21 (hifz and tadabbur) | Missing as a platform surface |
| Ulum al-Quran | none standalone | appears only inside P23 and competency Q5 | Missing |
| Matn and sharh (Tuhfa, Jazariyya) | templates only | track templates reference them; canonical witness text undecided (queue Q-003) | Missing text |

### 1.3 Academy programs that touch the Quran

Competencies Q1-Q6 are all `review_status: unreviewed`.

| Competency | Name | Min age | Prerequisites | Program |
|---|---|---|---|---|
| Q1 | الإصغاء والتلاوة بأدب | 7 | none | P20 (and P01, P18 touch recitation manners) |
| Q2 | أساسيات التجويد كأهداف تعلم | 8 | Q1 | P20 |
| Q3 | الحفظ المنهجي والمراجعة | 7 | Q1 | P21 |
| Q4 | التدبر وربط الآية بالسلوك | 10 | K1, Q1 | P21 |
| Q5 | علوم القرآن التمهيدية | 12 | Q1 | P23 |
| Q6 | تقدير اختلاف الروايات والقراءات | 13 | Q5 | P23 |
| K4 | التلاوة والحفظ والمراجعة | 5 | none | P01, P18, P20, P21 |

Program chain as declared in the JSON: P01 -> P02/P03; P17 -> P18 -> P19/P20; P20 -> P21/P22; P21 -> P23 -> P24. P20 requires P18 or equivalent; P21 requires P20 and P06 (understanding text in context); P23 requires P21. These programs teach manners, habits, planning and humility before the sciences. P20, P21 and P23 explicitly state they do not teach tajweed rules, do not interpret verses, and do not weigh between riwayat; the platform for those is the teacher.

Gap that follows from this: the academy covers the human side of Quran learning, while the rules (tajweed) live only in the standalone `#/tajweed` library, with no declared link either way.

## 2. Findings that shape the reorganisation

1. The learner-facing menu is organised by feature (reader, tajweed, kids, foundations, qiraat), not by level. A beginner has no single "start here -> next" path across them.
2. Foundations and kids overlap for letters and harakat (two implementations, two progress stores: `fdMode` and `kst`, both device-local).
3. The tajweed library has no prerequisite order (tabs are makharij, sifat, ahkam, mudood), and the published learning track "أساسيات التجويد" is a separate, duplicated, DB-only object not linked from the UI audit.
4. The quizzes and the hifz/plan tools are the only practice layer; none is connected to a competency (Q1-Q6) or to an academy program.
5. Qiraat is a poster page. Q5/Q6 content exists only as program outlines.
6. All teaching content (tajweed, quizzes, foundations, academy) is AI-authored or AI-extracted and unreviewed. The only non-generated Quran-related assets are the Tanzil text, the Clear Quran translation and the structural data (surah counts).

## 3. Proposed organisation by level and prerequisite

Principle: keep every existing page and route (no new product, no deletions), add one ordered spine and prerequisite links on top, reuse existing content before creating any.

| Level | Goal | What comes first (prerequisite) | Existing content to use | Academy link |
|---|---|---|---|---|
| L0 Readiness (age 5-8, or an adult with no letters) | hear, sit, repeat with a qualified teacher; know the letters | none | Foundations (letters, forms, harakat, syllables); Kids bands a and b; mushaf read-only | P01, P17, P18 (manners only); K4 |
| L1 Reading (fluency) | read the mushaf with harakat | L0 letters, harakat, syllables passed (foundations quiz) | Reader; audio repeat-ayah; Plan goal "reading"; Kids band c | P20 (Q1: listening and manners) |
| L2 Tajweed basics | know sites and attributes of letters, noon/meem rules, madd | L1 plus Q1; learner reads with a teacher | Tajweed tabs in this order: makharij, sifat, ahkam, mudood, explorer; quizzes in the same order; tracks "أساسيات التجويد" (one copy) | P20 (Q2); teacher required for correction |
| L3 Hifz and review | memorise a manageable amount with review before new | L1 reading; Q1; (L2 recommended) | Hifz, Plan, Tasmi', homework, track templates (Juz' 29, 28, selected surahs, weekly review, 30-day khatm) | P21 (Q3), P06 as prerequisite for tadabbur |
| L4 Meaning and tadabbur | read meaning with context questions | L1; K1 (text in context); Q1 | Reader translation toggle; tafsir panel as a reference, not as platform ruling | P21 (Q4) |
| L5 Sciences of the Quran | map of the sciences, riwaya vs qira'a vs tariq, honest attribution | L3 or L4; Q5 before Q6 | Qiraat page, sanad register | P23 (Q5, Q6); P09 for source discipline |
| L6 Matn and advanced | Tuhfa, Jazariyya, riwayat | L2 plus L3 | track templates only | none yet (gap) |

Cross-cutting rules for the spine:
- Self-assessment never gates a learner; prerequisites are shown as "recommended before this", not enforced locks (V3 section 8.2: no closed automatic path).
- One progress model per learner. Merge `fdMode`/`kst` device-local state into a single profile object later; until then, display both on one "my path" view rather than rewriting either.
- Recommendations use only the learner's own declared age, level, goal and completed items. No inference of piety or psychological state from usage.

## 4. Per-item status (exists / partial / missing)

| Item | Status | Needed to move forward |
|---|---|---|
| Mushaf text (Hafs, 6,236 ayat) | exists | scholarly audit of the Tanzil edition (owner appoints reviewer) |
| Juz/hizb/page navigation, Meccan/Medinan | missing | structural metadata needs a licensed, cited source; do not hand-type |
| Word meanings | missing | licensed source required |
| Audio | partial (stream only) | per-reciter rights; owner's agreement (SOURCE_SELECTION_2026-11-02: SELECTED_PENDING_AGREEMENT) |
| Tajweed colouring | partial | review rules against a named reference; add tooltips on Highlight path |
| Makharij and sifat content | partial | reviewer; resolve the stated disagreement on counts (sites 17/16/14/29; attributes 17/18/19/20) by showing the positions, not choosing one |
| Noon/meem and madd rules | partial | reviewer; madd lengths are a matter of the riwaya and route taught |
| Foundations | exists (draft) | pedagogical review; human-recorded audio for letters (no synthetic voice) |
| Kids academy | exists (draft) | child-safety review; human audio |
| Hifz, plan, mastery map | exists | no content risk; verify with a real learner flow |
| Tasmi' | partial | STT quota (owner); teacher review UI; measure accuracy; no tajweed grading claim |
| Quizzes (33 q + complete-the-ayah) | partial | scholarly review of the 33 questions; complete-the-ayah is safe because it draws from the stored text |
| Qiraat | partial | needs a reviewer and per-riwaya licensed text (never merged into Hafs rows) |
| Sanad register | exists | none for the code; verification is a human act |
| Tafsir | partial (third-party panel) | terms unstated; teaching lessons on tafsir are missing |
| Tadabbur | partial (inside P21 only) | reviewer for the verses chosen |
| Ulum al-Quran | partial (inside P23 only) | reviewer |
| Matn/sharh | missing | choose canonical witness text (Q-003), licence |
| Academy P20, P21, P23 | exists as draft-unreviewed | named scholarly, pedagogical, child-protection reviewers (all three listed in each program's `needs_named_reviewers`) |
| Duplicate track "أساسيات التجويد" | defect | owner decision after backup |
| 39 `scholarly_items` | draft | reviewer; stays DRAFT |
| Link between `#/tajweed` and academy Q2 / P20 | missing | add the link; no new lesson needed |

## 5. Licence and review requirements

- Quran text: Tanzil terms (verbatim, attribution, link). Never edit, never regenerate, hash-checked. A second riwaya is a separate edition with its own approved source, never merged.
- Translation: Clear Quran CC BY-ND 4.0, wording unchanged, translator credited.
- Audio: stream-only from mp3quran.net, terms unstated. No download or storage until the owner accepts a provider's terms.
- Tafsir text: stream-only, terms unstated, classical authors only. Display as a reference; the platform does not issue rulings.
- Books in `scholarly-assets/_inputs/books` and `extraction`: third-party, gitignored. Per the owner's 2026-11-03 instruction they may be used for our own paraphrase with locators and short attributed quotation only; no commit of their text.
- Every item that teaches a rule, interprets, or compares riwayat needs a recorded `scholarly_reviewer` approval before PUBLISHED (enforced in DB, migration 0002). Child-facing items also need pedagogical and child-protection review; a minor's recording needs live guardian consent.
- Editorial line: moderate mainstream, plural across madhhabs; differences are displayed with their holders, not ranked.

## 6. What must not be generated, and what may be drafted unreviewed

Must NOT be generated (by AI or by us):
- Any Quran text, ayah wording, or "reconstruction" of text; any other riwaya's text; tajweed-coloured text stored as text.
- Any recitation audio, including synthetic letter or ayah audio; any imitation of a reciter's voice.
- Tafsir, meanings of words, reasons of revelation, or any shari'a ruling written by the platform; any ruling on a recitation ("your tajweed is correct/incorrect"), grade, ijazah, or certificate of competence.
- A ranking or "correct" choice between riwayat, between counts of makharij/sifat, or between madd lengths.
- Sanad entries, scholar names, institutions, reviews or testimonials.

May be drafted, kept DRAFT/unpublished until reviewed:
- Lesson outlines, learning outcomes, activity shells, teacher guides, parent guides, quiz question stems and distractors, flash-card layouts, study-plan templates, UI copy, prerequisite maps and program-to-competency links.
- Neutral summaries of what sources say, with exact locators and attribution, marked "unreviewed".
- Quran examples are never typed: the examples are looked up by surah:ayah reference from the stored text.

Publication gate: draft -> human scholarly review -> owner publication. Until then, show the "under scholarly review" notice already in place.

## 7. Recommended work order (reuse before creating)

1. Link `#/tajweed` to the academy's Q2 and to the quizzes; show prerequisites on the Tajweed tabs (no new content).
2. Add a "my path" view that lists L0-L6 with recommended-before links, reading existing local progress.
3. Remove the duplicate "أساسيات التجويد" track only after backup and owner approval.
4. Resolve the migration backlog (0017-0020) with the owner before relying on DB features.
5. Request the owner's decision on named reviewers; nothing in sections 4 or 5 moves to PUBLISHED without them.
6. New content only for confirmed gaps: matn/sharh (after text and licence), tafsir and tadabbur lessons (reviewed), Ulum al-Quran (reuse P23 structure).

## 8. Limits of this audit

- Code was read, not run; counts such as "33 questions" and "12 sifat definitions" come from the source and may differ from what renders.
- The DB snapshot is from 2026-11-05 and covers row counts, track titles and `scholarly_items` state only; no column-level verification was done.
- Feature status words describe the repository, not user-verified behaviour; real Safari, microphone and live STT remain unverified (KNOWN_LIMITATIONS 21, 34, 35, 37).
