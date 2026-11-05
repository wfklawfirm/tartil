# TARTIL content governance

Status: rules for adding, reviewing, publishing and retiring content (Master Prompt V3 sections 13-14). Sources: `CLAUDE.md`, migrations 0002, 0019, 0020, `docs/governance/LICENSE_REGISTER.md`, `docs/CHILD_SAFETY_AND_ACCESS.md`, `docs/TARTIL_14_1_CHILD_SAFETY.md`. Current state: all academy JSON files are `draft-unreviewed`; nothing in the academy has recorded reviewer approval. Migration 0019's header says it is not applied to production; the applied state of 0020 was not verified when this was written.

## 1. The nine-question gate (before any new lesson, programme or activity)

Answer in writing in the change request; if 1-4 can be answered "yes", do not create.

1. Is there similar content already on the platform?
2. Can it be reused?
3. Can it be enriched instead of duplicated?
4. Can it be linked to other content?
5. What is the real learning gap?
6. What new objective will the addition serve?
7. Are reliable sources available? (If not: record a documented gap, do not invent finished-looking material.)
8. How will the quality of the addition be assessed?
9. Does it need scholarly or pedagogical review before publication? (Religious and educational content: yes.)

The decision uses the V3 vocabulary KEEP / REORGANIZE / ENRICH / CONNECT / ADAPT / COMPLETE / REBUILD / CREATE / ARCHIVE, with reason, evidence and expected effect. Reuse and development come before creation. The owner decides money, public launch, real data, licence commitments and scholarly appointments, not the agent.

## 2. Review statuses and lifecycle (migration 0020)

Tables `academy_content_status` (key: `content_kind` in program/lesson/scenario/guide, `content_ref`, `version`) and `academy_content_reviews`.

Statuses: `draft`, `source_review`, `scholarly_review`, `pedagogical_review`, `child_safety_review`, `approved`, `published`, `needs_revision`, `archived`.

Allowed forward path: draft, source_review, scholarly_review, pedagogical_review, child_safety_review, approved, published. `needs_revision` is reachable from any review stage, from approved and from published; it returns to draft and starts a new `cycle` (earlier approvals no longer count). Archive is allowed from draft, needs_revision, approved, published. Any other transition raises `content_illegal_transition`. New rows must start as `draft`.

Enforced in the database, not the UI or API.

## 3. The four-distinct-reviewers rule

`published` (and `approved`) requires approvals of four review types: `source`, `scholarly`, `pedagogical`, `child_safety`, by **four distinct active reviewers**, none of them the author, all in the current cycle (`app.academy_all_approved`, error `publication_requires_four_approvals`).
- Role per type: `scholarly` = `scholarly_reviewer`; `pedagogical` = `pedagogical_reviewer`; `child_safety` = `child_protection_reviewer`; `source` (citations, provenance, rights) = `scholarly_reviewer` or `pedagogical_reviewer`.
- One reviewer may give only one review type per content item per cycle (`one_review_type_per_reviewer`).
- The author cannot review their own content (`author_cannot_review_own_content`). A reviewer who lost the role no longer counts.
- A `needs_revision` decision pulls the item out of review at once and requires a non-empty note.
- Only the reviewer can write their own approval (RLS + trigger). Reviewer roles are appointed by the owner (migration 0017 roles); a separate "editor" role does not exist.
- Public readers, even signed out, see `published` rows only.
- Some programmes additionally name extra reviewers in `programs[].gating.needs_named_reviewers` (e.g. `child_mental_health` for P07); this is a content requirement recorded in the data, to be satisfied by the owner's appointments.
- Machine-extracted or AI-generated material is never published without a recorded `scholarly_reviewer` approval (migration 0002) and is never presented as a ruling.

## 4. Licences

- Default is NOT cleared (`LICENSE_REGISTER.md`). Third-party books in `scholarly-assets/_inputs/books` and `scholarly-assets/extraction` are gitignored, internal-analysis only; their text is never committed or published. Academy content cites them by locator and paraphrase.
- Do not auto-download Quran text, audio, translations or models; each needs the owner's acceptance of that provider's terms.
- Registered terms in force: Tanzil Quran text (verbatim, attribution and link, no changes); Clear Quran English (CC BY-ND 4.0, wording unchanged, translator credited); mp3quran.net audio (stream-only, terms unstated); classical tafsir fetch (on demand, terms unstated); blocked/excluded items are listed in the register (e.g. a dataset with conflicting licence texts, non-commercial models).
- Every new media or text item needs a register entry before publication (question 7 and the `source` review).

## 5. Child safety

- A minor's recording requires a live guardian consent (DB trigger `app.enforce_recording_consent`); guardians act only through a verified, non-revoked link.
- No unsupervised adult-child contact; no real child data in dev/test; no public profiles, rankings or photos.
- Content for children never asks for personal confessions or sensitive disclosures; no absolute confidentiality promise (child-protection procedures apply); exercises are pedagogical, not therapy or diagnosis; a child leaving the group stays supervised; the person harmed is never required to apologise or forgive. These are written into `programs[].safeguards` and `guide_notes`.
- The learner notebook stays on the device and has no server column (0019). A teacher or guardian sees progress only through an explicit, revocable learner share limited to ids (`progress`, or `progress_feedback`).
- Every child-facing item passes the `child_safety` review above.

## 6. Quran text immutability

- Quran text is stored verbatim, edition-pinned, with `source_sha256` and per-ayah `text_sha256`; a trigger rejects any update or delete of `quran_ayahs` ("import a new edition/version instead") and a hash trigger rejects mismatching inserts (migration 0002). An edition is publishable only with the exact reference ayah count (6236 for Hafs numbering).
- Tajweed colours and annotations are separate layers; riwayat are never merged into one row; translations live in separate immutable tables (0011) and are never mixed with the Arabic.
- AI never generates, edits, completes or "corrects" Quran text. Verse references in lessons point to the stored text.

## 7. Change log and id preservation

- A new wording of an item is a **new `version`** of the same `(content_kind, content_ref)`; history is kept (reviews cannot be updated or deleted).
- Original ids (e.g. `P07`, `AG-L1`, `S5`, `C6-L1`) are not renamed without a migration map old-to-new and a redirect for old routes; learner progress keyed by ids must survive (V3 section 14).
- Migrations are append-only and checksum-protected; never edit an applied migration.
- Record every structural change in `docs/governance/CONTENT_DEDUPLICATION_LOG.md` (or the successor change log) with date, ids touched, reason, evidence and reviewer.
- Seed note: `docs/human-formation/academy_status_seed.json` lists 24 programs / 255 lessons / 136 scenarios / 24 guides, while `packages/web/academy-programs.json` and `academy-lessons.json` currently hold 25 programs / 347 lessons / 185 scenarios; regenerate the seed before applying any status rows.

## 8. Archive, never delete

- Retire content by `archived`; the database refuses deletes on status and review rows (`academy_content_is_archived_not_deleted`).
- Duplicates are merged only after proof of identity, confirmation that no references or learner progress are lost, and a restorable backup. Content that differs in riwayah, source or review status is never merged.
- An archived item keeps its id so old links resolve to a notice and a pointer to its replacement.

## 9. Editorial line

Moderate mainstream (wasatiyya), plural across madhhabs; no polemics, takfir or sectarian framing; rulings remain the scholars' and local law's. Academy text teaches and does not issue fatwas.
