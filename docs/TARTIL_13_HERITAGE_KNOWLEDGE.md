# TARTIL 13.0 - Heritage Knowledge System (Heritage-to-Curriculum Studio): state of the repository

Date: 2026-11-03. Scope: how knowledge from the owner's book library becomes (or fails to become) reviewed learning content, measured against what is actually in `/home/claude/quran-global-platform`. No claim below is "working" unless a file, a test or a command I ran supports it. No book text is reproduced here.

Status vocabulary: WORKING, PARTIALLY WORKING, UI ONLY, BROKEN, MISSING, BLOCKED, NEEDS SCHOLARLY REVIEW. "not verified" means I could not check it.

## 0. Summary (blunt)

- The pipeline from book file to inventory to addressable units to Quran-quote verification to duplicate detection **works as scripts with real outputs, for the 74-book Quran-sciences corpus only**.
- The formation library (168 files in `scholarly-assets/_inputs/formation-books/`) has **no registry, no hashes, no per-title rights record and no reproducible extraction script**. Its 400 "principles" (`docs/human-formation/extracted/*.json`) were authored by reading, are paraphrases with a `line N` locator into a private local file, and are all flagged unreviewed.
- The review gate exists **in the database** (migrations 0002, 0010, 0017) and is tested, but **nothing has ever passed it**: no scholarly, pedagogical or child-protection reviewer is appointed, and migration 0017 is not applied to production. The 40 Source Passage Records live as Markdown, not as rows.
- The layers "original text / explanation / inference / AI proposal / approved content" are a **documentation rule (BLUEPRINT D7), not a data model**. No table has a layer column; `source_records.content_md` is one text blob.
- There is **no Studio UI**. The only reviewer-facing pages are `#/review` (scholarly items and sanad) and `#/academy/review` (a static read-out of competency anchors). No page lets a reviewer open a source record, see the passage beside the lesson built from it, and sign.

## 1. The twelve steps (section 14) versus the repository

The owner's "section 14" list of twelve steps is **not in the repository** (searched: `grep -rIn -i "heritage|twelve|12 steps|Curriculum Studio"` outside `scholarly-assets` and `node_modules` returns only an unrelated design-system hit). I therefore did not map to it. Below is the chain I can reconstruct from `docs/human-formation/BLUEPRINT.md` D7 (Selected Source, Verified Passage, Scholarly Context, Proposed Insight, Competency Mapping, Pedagogical Review, Scholarly Review, Approved Lesson, Published) plus the extraction stages the code actually implements. **Owner to confirm the mapping to the real section 14.**

| # | Step | Status | Evidence and what is missing |
|---|---|---|---|
| 1 | Select sources | PARTIALLY WORKING / NEEDS SCHOLARLY REVIEW | `docs/human-formation/SOURCE_MAP.md`, `docs/governance/SOURCE_SELECTION_2026-11-02.md`. Triage is by title/author and header only (`triage_decisions.csv`: `reviewer=UNREVIEWED`, `basis=analyst_title_triage`); madhhab labels of authors are "from general knowledge" (SOURCE_MAP). Q-001 open. |
| 2 | Inventory, hash, rights flag | PARTIALLY WORKING | `scholarly-assets/source-registry/source_registry.csv`: 74 rows with SHA-256, `license_status`, `rights_note`. **Formation books are not in it**: of 168 files in `formation-books/`, only 2 Shamela ids also appear in the registry (computed). The 93 books cited by `docs/human-formation/extracted/*.json` are all present as files but have no registry row, hash or rights row. |
| 3 | Extract to addressable units | PARTIALLY WORKING | Quran-sciences: `scripts/extract_books.py` -> `scholarly-assets/extraction/` 50 books, 7,082 sections, 97,625 units, 11,767 ayah quotes (summed from `extraction_summary.json`). Formation books: MISSING as a script (`scripts/` has no formation extractor); `scholarly-assets/extraction-formation/*.json` (40 files, ~0.7 MB) is hand/agent-authored output, not reproducible. Locator scheme differs: SRC books use `SRC-xxxxxx#toc-N.pNNNN` (ADR-006); formation anchors use "book number - heading - line N". |
| 4 | Verify the passage (Quran quotes, hadith, typos) | PARTIALLY WORKING | Quran quotes: `scripts/verify_citations.py`, `_verify/citation_verification_summary.json`; PROJECT_STATE reports 2,541 checked, 2,330 match, 78 elsewhere, 133 unmatched (not re-run by me). **Hadith/athar takhrij: MISSING.** In `extracted/*.json` flags: `ungraded-hadith` 227, `needs-reviewer` 260, `attribution-doubtful` 61 (of 400 principles). Anchors in `academy.json`: 117 `heading-only` vs 4 `passage-read`. Citation check was not run on formation books (script input is the extraction dir; none exists for them). |
| 5 | Detect duplicates and variants | WORKING (detect-only) for the 50 books | `scripts/dedup_report.py`, `docs/governance/CONTENT_DEDUPLICATION_LOG.md`; `review/dedup_decisions.csv` has 629 clusters, all `PENDING_HUMAN_REVIEW` (no decision recorded). Not applied to formation books. |
| 6 | Source Passage Record (SPR) | PARTIALLY WORKING | 40 SPR sections in `docs/human-formation/PILOT_SOURCE_RECORDS.md` and `records/*.md` (one per competency); every record states "not reviewed" (grep: 37 in `records/*.md`, plus the 3 pilot records). DB home exists (`source_records`, 0017) but **no loader and no rows**; only tests insert. Fields of D7 not modelled as columns: book/edition/editor, locator, material type, grading, context (who spoke, to whom). |
| 7 | Separate layers | UI ONLY (rule) / MISSING (data model) | See section 3. |
| 8 | Map to competency | PARTIALLY WORKING | `competencies.json` (40), `academy.json` anchors per competency, `lessons/*.json` `source_basis` and `grounding[]` with `principle_id`. `scripts/validate_lessons.py`: "40 units checked; 0 problems" (run by me); `validate_programs.py`: "programs=16 lessons=148 scenarios=83 covered=231/231, 0 issues". Validation is structural; it cannot judge that a lesson is faithful to its source. |
| 9 | Draft lesson / scenario | PARTIALLY WORKING | 148 lessons, 83 scenarios in `packages/web-vercel/academy-lessons.json`; learner pages under `#/academy` (index.html). All `review_status: draft-unreviewed`; rendered with a "draft, not reviewed scholarly, pedagogically or by child protection" note. |
| 10 | Pedagogical and child-protection review | BLOCKED (owner decision) | Roles and gate exist (0017) but nobody holds `pedagogical_reviewer` or `child_protection_reviewer` (KNOWN_LIMITATIONS 40); roles are deliberately not assignable through the members API (`ROLES` in `packages/api/src/app.ts` line 13). `docs/human-formation/qa/QA_G1..G8.md` are AI QA passes, not named human review. |
| 11 | Scholarly review | BLOCKED (owner decision) / NEEDS SCHOLARLY REVIEW | Gate for `scholarly_items`: 0002 trigger + 0010 workspace. Gate for SPR: 0017 trigger. No reviewer appointed (KNOWN_LIMITATIONS 26); `SCHOLARLY_REVIEW_QUEUE.md` lists Q-001 to Q-122 (IMPLEMENTATION_TRACKER says 44; the file has grown), all open and unreviewed. |
| 12 | Approve, license-clear, publish | PARTIALLY WORKING (mechanism) / BLOCKED (inputs) | `scholarly_items`: `PUBLISHED` requires `licence_cleared` (owner-only, not grantable to `app_user`, 0010 grants UPDATE only on `state, approved_by`). **For SPR approval, `rights_status` is recorded but does not gate approval** (KNOWN_LIMITATIONS 40). Academy content is served as static JSON to any signed-in user without going through either table (see section 2). |

## 2. What the gate actually enforces

Verified by reading the migrations and by running tests (section 7).

| Mechanism | File | Enforced in DB? | Note |
|---|---|---|---|
| Legal state machine DRAFT -> EXTRACTED -> NORMALIZED -> UNDER_REVIEW -> APPROVED -> PUBLISHED | `0002_...sql` `app.scholarly_transition_guard` | Yes (trigger) | Machine-extracted items cannot start above EXTRACTED. |
| APPROVED needs `approved_by` = active `scholarly_reviewer` | same | Yes | The trigger checks the approver holds the role, **not that the approver is the acting user**. The API sets `approved_by` to the caller (`app.ts` transition route), so via the API this holds; a direct SQL path by another reviewer could name a different approver. Low risk, noted. |
| PUBLISHED needs `licence_cleared` | same | Yes | Owner flips it outside the app. |
| Learners read only PUBLISHED | `scholarly_read_published` policy | Yes (RLS) | |
| Reviewer actions logged with note | `scholarly_reviews` (0010) | Yes | Reject/revision require a note at the API. |
| SPR approval = three distinct people, one per role (scholarly, pedagogical, child protection), none the author, bound to a content hash, edits void approvals, reviews immutable | `0017` `source_record_approvals_ok`, `source_record_guard`, `source_review_*` | Yes | Strong design. DB test `formation.test.ts` 11/11 pass (run by me). |
| Tenant admin cannot self-appoint the two new roles | `ROLES` list in API | API only | Inherited weakness: a tenant admin can still assign `scholarly_reviewer` to themselves (KNOWN_LIMITATIONS 40), so the scholarly leg is only as strong as who holds that membership. Owner decision on appointments. |

Gaps in the gate itself:

1. `scholarly_items` and `source_records` are **two parallel gates** with different rules (one reviewer vs three roles). Nothing links a `source_records` row to the `scholarly_items` or to the lesson JSON built from it.
2. **Published lessons bypass both.** `academy-lessons.json`, `academy-programs.json`, `academy-guides.json` ship inside the web bundle (`packages/web-vercel/`). The academy pages require sign-in (index.html `academyView`) but are not state-gated by any review row. They are labelled draft in the UI; no mechanism can make them "approved" because no lesson id exists in a table.
3. `source_records.rights_status` does not block approval; a third-party-derived `content_md` could be "approved" while `not_cleared`.
4. Loaded concept drafts: `scholarly-assets/extraction-concepts/concepts_draft.jsonl` (39 records, all DRAFT, `licence_cleared=false`) has a load script and a DB test that skips when the SQL is absent. Whether it is loaded into the live Supabase `scholarly_items`: **not verified** (I did not query production).

## 3. Separation of layers

Required layers: (a) original text, (b) explanation (sharh/commentary), (c) inference (istinbat, pedagogical), (d) AI proposal, (e) approved content.

| Layer | Where it exists today | Status |
|---|---|---|
| (a) Original text | Third-party files in `_inputs/` (gitignored) and units in `extraction/` (gitignored, `text` preserved byte-for-byte per `extract_books.py` docstring). Quran text: separate immutable tables (0002), hash-checked. | WORKING for Quran and for extraction units; not exposed to any reviewer UI |
| (b) Explanation | Not separately stored. `extracted/*.json` `kind` values are `principle` 199, `practice` 102, `story-lesson` 50, `caution` 49 - these are content kinds, not the layer. | MISSING |
| (c) Inference | Authored in lessons and SPR Markdown ("الاستنباط التربوي المقترح (يُفصل بصريًّا عن النص)" in `PILOT_SOURCE_RECORDS.md`). In index.html I found no learner-facing label that renders a passage/inference distinction (grep for "استنباط" returns none); lesson UI shows `source_basis` only in the guide panel. | UI ONLY at best / MISSING |
| (d) AI proposal | `ai_suggestions` (0008): PENDING until a human accepts, enforced by RLS; model OpenAI `gpt-4o-mini`; for the Studio, no path exists that sends book text to a model, and by owner rule none should (LICENSE_REGISTER: no unlicensed text to external services). Authoring of lessons by AI is a process fact, not a recorded layer: lessons carry no `authored_by` field. | PARTIALLY WORKING (suggestions), MISSING (provenance of AI-authored lessons) |
| (e) Approved content | `scholarly_items.state='PUBLISHED'`, `source_records.review_status='approved'`. Zero rows approved or published for formation content. | WORKING mechanism, empty |

Also required by D7: contemporary scenarios must carry a visible "contemporary teaching example" label. `validate_lessons.py` requires `fictional_note` on every scenario and the UI renders it (index.html around line 1520); the exact wording "مثال تعليمي معاصر" was not found (grep), so the label exists in function, not in the D7 phrase. Not verified in a browser by me.

## 4. Rights

`docs/governance/LICENSE_REGISTER.md`:

- Default: all 74 registry books `LICENSE_REVIEW_REQUIRED`; no publishing, no quoting beyond fair use, no redistribution, no model training.
- **Owner's assertion, 2026-11-03** (recorded in the register): the formation books were purchased, the platform is charitable, and authors/rights-holders permit use; full extraction instructed. **No permission documents are on file**; the register asks the owner to place letters/purchase proofs per title. It is an assertion, not a clearance.
- Scope the register applies meanwhile: files stay local and gitignored (`.gitignore` lines for `_inputs/books`, `extraction`, `extraction-concepts`, `_inputs/formation-books`, `extraction-formation`); own paraphrase with locators; verbatim only if short and attributed; no hadith grading by us; nothing shown as scholar-approved.
- Distinct rights layers not yet separated in any data: the classical matn (usually public domain), the editor's apparatus and takhrij, the publisher's edition/typography, and the digital export (Shamela). The registry has one `license_status` per file.
- Consequence for the Studio: `source_records.rights_status` has the right values (`not_cleared`, `cleared`, `public_domain`, `not_applicable`) but they are not tied to a document reference and do not gate approval or publication of lessons.
- Third-party services in use with unstated terms (mp3quran.net, tafsir_api via jsDelivr) are outside this pipeline but follow the same "terms unstated" status.

Owner decision: what counts as sufficient clearance per title (letter, purchase proof, public-domain determination), and whether SPR approval should be blocked while `rights_status='not_cleared'`.

## 5. What the repository holds, by the numbers (computed)

| Item | Count | Source |
|---|---|---|
| Quran-sciences books inventoried / extracted | 74 / 50 | `source_registry.csv`; `extraction_summary.json` |
| Sections / paragraph units / quote marks | 7,082 / 97,625 / 11,767 | `extraction_summary.json` |
| Duplicate clusters pending decision | 629 | `dedup_decisions.csv` (all pending) |
| Formation book files (local, unregistered) | 168 | `_inputs/formation-books/` |
| Books cited by formation extraction | 93 (all present locally) | `books_read` in `extracted/*.json` |
| Competencies / extracted principle files | 40 / 40 (+5 gap files) | `docs/human-formation/` |
| Principles | 400 | `extracted/*.json` |
| SPR sections (Markdown) | 40, none reviewed except by the author | `records/*.md`, `PILOT_SOURCE_RECORDS.md` |
| Lessons / scenarios / programs | 148 / 83 / 16 | `validate_programs.py` output |
| Anchors passage-read vs heading-only | 4 vs 117 | `academy.json` |
| Rows in `source_records`, `scholarly_items` approved or published | 0 / 0 (formation); live counts not verified | migration 0017 not applied (PROJECT_STATE) |

Principle flags (counts across 400): ungraded-hadith 227, needs-reviewer 260, contested-ruling 94, outdated-context 85, harsh-language 78, attribution-doubtful 61, sectarian-tone 14. These are the reviewer's real workload and none is resolved.

## 6. What is missing to build the Studio (the reference-browsing UI)

The brief's "واجهة المراجع" does not exist. Needed, in dependency order:

1. **Source library view (read-only, reviewers only).** Registry rows for the formation books (needs steps 2-3 for those books first), with rights status per title and a link to the owner's permission document. Data: new registry rows; API: reviewer-scoped list/detail.
2. **Passage viewer.** Show the exact unit text from the local extraction beside its locator, with the Quran quotes resolved against the approved edition (`quran_ayahs`) and verification status. Constraint: text must stay on the owner's machine/internal store; a deployed Studio must either serve passages only to named reviewers from a private store, or show locator plus our paraphrase, never the third-party text to learners. Owner decision.
3. **Structured SPR editor.** Migration needed: columns or child tables for book/edition/editor, locator, material type (Quran, hadith, athar, sira, commentary, fiqh opinion, poetry, proverb), takhrij, context, and four layer fields (original reference, explanation, inference, AI-proposal flag). Today `source_records` has only `title`, `content_md`, `takhrij_status`, `rights_status`.
4. **Lineage link.** A table tying `source_records` to the competency, to each lesson/scenario id, and to `scholarly_items`/extraction unit ids, so a reviewer can see "this lesson rests on these passages" and a change to a record flags dependent lessons.
5. **Lessons as rows.** Move lessons/scenarios/programs from bundle JSON into gated storage (or add a build step that refuses to ship a lesson whose SPR is not `approved`). Without this the gate does not govern what learners see.
6. **Reviewer UI for the three-role gate** (open record, see passage and derived lesson, decide approve/changes/reject with note; the API routes `/formation/source-records*` exist, tested; no page calls them: grep of index.html finds no `/formation/` use).
7. **Reviewer-assigned work queue and open-issue tracking** per flag (hadith grading, contested ruling, outdated context, tone), replacing the Markdown QA files.
8. **Decision recording for the 629 dedup clusters and the queue items (Q-001 to Q-122)** inside the app.
9. **Provenance fields** on every lesson: authored by AI or human, model, date, reviewer, status.
10. **Reproducible formation extraction**: a script like `extract_books.py` for the formation corpus with hashes and the same locator scheme, so the 400 principles can be regenerated and audited.

Do not build before the owner decides: who the reviewers are, how passages may be displayed, retention rules for any reviewer notes about children's content.

## 7. Test and command evidence (this session)

| Command | Result |
|---|---|
| `packages/database`: `npx tsx --test test/formation.test.ts` | 11 pass, 0 fail |
| `packages/api`: `npx tsx --test test/formation.test.ts test/scholarly.test.ts` | 7 pass, 0 fail |
| `python3 -I scripts/validate_lessons.py` | 40 units checked; 0 problems |
| `python3 -I scripts/validate_programs.py` | programs=16 lessons=148 scenarios=83 covered=231/231; 0 issues |
| Full `npm test` in `packages/database` | first attempt: killed (SIGKILL) in `concepts-load.test.ts` after ~53 s while other processes were using the machine; re-run excluding that file (`--test-skip-pattern=concepts`, concurrency 1): 48 pass, 0 fail across the other 7 DB test files. `concepts-load.test.ts` not verified (PROJECT_STATE reports 49 total with it). API full suite not run by me |

What these tests prove: the DB gates behave as designed on PGlite. What they do not prove: behaviour on Supabase (0017 not applied), any UI, any reviewer workflow with real people, or the faithfulness of any lesson to its source.

## 8. Honest verdict

The knowledge pipeline is real up to extraction and verification of Quran quotations for one corpus, and the review gate is well designed and tested. The heritage-to-curriculum chain for the formation corpus is, in practice, a Markdown and JSON authoring process with a good schema in waiting. Nothing is approved. The layers are not data. There is no Studio. Do not describe the academy content as sourced-and-verified: 117 of 121 anchors are heading-only and 227 of 400 principles cite ungraded hadith.

## Evidence

Read: `CLAUDE.md`, `PROJECT_STATE.md`, `IMPLEMENTATION_TRACKER.md`, `docs/governance/{KNOWN_LIMITATIONS,LICENSE_REGISTER,SCHOLARLY_CONTENT_REGISTRY,SCHOLARLY_REVIEW_QUEUE,CONTENT_DEDUPLICATION_LOG,ARCHITECTURE_DECISIONS,TEST_RESULTS}.md`, `docs/extraction/CONCEPTS_V1.md`, `docs/human-formation/{BLUEPRINT,SOURCE_MAP,PILOT_SOURCE_RECORDS}.md` and `records/`, `qa/QA_G1.md`, `packages/database/migrations/{0002,0010,0017}*.sql`, `packages/api/src/app.ts` (routes for scholarly and `/formation/source-records*`), `packages/web-vercel/index.html` (routes `#/review`, `#/academy/*`), `scripts/{extract_books,verify_citations,build_source_registry,validate_lessons}.py`, `.gitignore`.
Computed with Python on: `source_registry.csv`, `extraction_summary.json`, `docs/human-formation/extracted/*.json`, `packages/web-vercel/academy*.json`, `dedup_decisions.csv`, directory listing of `_inputs/formation-books`.
Run: the commands in section 7.

## Open items

1. Owner's real section 14 (twelve steps) to be supplied; remap section 1.
2. Appoint named scholarly, pedagogical and child-protection reviewers (owner decision); nothing can be approved until then.
3. Rights: place per-title permission documents with `LICENSE_REGISTER.md`; decide whether `rights_status` should block approval.
4. Register and hash the 168 formation books; write a reproducible extractor; unify locator scheme.
5. Takhrij of hadith/athar for the principles flagged `ungraded-hadith` (227).
6. Decide how passages may be displayed to reviewers in a deployed Studio.
7. Add layer model, lineage and lesson-as-row storage (migration 0018+), then build the reviewer UI.
8. Confirm live Supabase state of `scholarly_items` and migration 0017 (not verified here).
9. Decide the dedup clusters (629) and queue items (Q-001 onward).
10. Tighten the approver identity check in `scholarly_transition_guard` (approver must equal acting user) when next a migration is written (append-only; never edit 0002).
