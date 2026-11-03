# TARTIL 14.1 - Content publication lifecycle

Snapshot: 2026-11-03, about 23:38 EET (HEAD 69e3559 plus working tree). Companion: `TARTIL_14_1_PUBLICATION_BACKEND.md` (written by the stream that built migration 0020; this document evaluates it and specifies only what is still missing). Nothing here changes code. No status in this document is COMPLETED.

## 1. Lifecycle (item 13)

Draft -> Source Review -> Scholarly Review -> Pedagogical Review -> Child Safety Review -> Approved -> Published; Needs Revision (return path); Archived (terminal).

| State | Meaning | Who may enter | Exit |
|---|---|---|---|
| Draft | Being written or revised | author | to Source Review |
| Source Review | Citations, locators, editions, rights checked | author submits | source approval, else Needs Revision |
| Scholarly Review | Religious accuracy, no ruling claims, moderate mainstream line | scholarly reviewer | approval, else Needs Revision |
| Pedagogical Review | Age fit, sequence, timing, clarity | pedagogical reviewer | approval, else Needs Revision |
| Child Safety Review | Disclosure, confidentiality, supervision, referral | child-protection reviewer | approval, else Needs Revision |
| Approved | All four approvals in the current cycle | system | Published, Needs Revision, Archived |
| Published | Visible to the audience in section 2 | owner-designated publisher | Needs Revision, Archived |
| Needs Revision | Any reviewer rejects, or a published item is found defective | reviewer | back to Draft (new cycle) |
| Archived | Withdrawn, kept for record | owner | none |

Rule: editing the text of an Approved or Published item returns it to Draft with a new version; approvals of an earlier cycle never carry over.

## 2. Visibility policy

| Audience | Sees |
|---|---|
| Public, signed out | Published items only, and only the learner-facing fields. No guide notes, no review data, no reviewer names. |
| Learner (child or adult) | Published learner-facing fields for their age band. No `guide_script`, no `safeguards`, no source records. |
| Parent / guardian | Published learner fields plus the parent section of the guide. |
| Mentor | The above plus the guide section for programs they are assigned to. |
| Reviewer | All states and all fields, including reviews, for the type they hold. |
| Owner | Everything, including appointments and archive. |
| Drafts and anything in review | Never public. A preview environment with login for reviewers only. |

Today (verified): none of this applies to the academy. Every item, including guides, safeguards and source records, is in public static JSON next to `index.html`; the page shows a "draft, unreviewed" banner (from the `status: draft-unreviewed` field written by `scripts/build_academy.py`) and the "وضع المرشد" toggle exposes guide scripts to anyone.

## 3. What exists today

### 3.1 Implemented in the database (verified by reading migrations)
- `0002` `scholarly_items`: states DRAFT ... ARCHIVED; `approved_by` must be an active `scholarly_reviewer` (trigger raises `approval_requires_active_scholarly_reviewer`); PUBLISHED requires `licence_cleared` (default false). Applies to machine-extracted scholarly content, not to academy JSON.
- `0010` `scholarly_reviews` plus API `/scholarly/items`.
- `0017` `source_records` and `source_record_reviews`: three distinct roles (scholarly, pedagogical, child_protection), bound to a content sha256. `takhrij_status` and `rights_status` do NOT gate approval. Also `reflection_entries`, `life_mission_runs`, `scenario_runs`, `formative_observations`. Not applied to production, no UI (`KNOWN_LIMITATIONS` 40).
- `0018` permission hardening: tenant admins cannot grant reviewer roles.

### 3.2 Present on the academy data itself
- `guides/Pxx.json` carries `review_status` ("unreviewed" for P01 as checked); `programs.json` has no `review_status` field (all 24 entries lack it); lessons and extracted files carry free-text status ("draft-unreviewed"). A viewer-side `review_gate` block is rendered inside each program page. These are labels, not enforced.
- `scholarly_reviewer` is a membership role; nobody holds it. All three reviewer roles are appointed by the owner.

### 3.3 Working tree, not committed, not applied (evaluated)
- `0020_academy_content_status.sql` with `packages/api/src/academy-content.ts`, wired into `app.ts` (one import, one call) and tested: `academyContent.test.ts` database 8 tests, API 2 tests, reported passing by that stream; I saw 7/8 once while the file was mid-edit and 8/8 afterwards; `academyProgress.test.ts` 12/12 for the sibling progress work. I did not re-run the full suite.
- Tables `academy_content_status` (kind program|lesson|scenario|guide, ref, version, status, cycle) and `academy_content_reviews` (source|scholarly|pedagogical|child_safety, immutable).
- Database-enforced rules: four distinct approvers who still hold the role and are not the author; no skipping stages; `needs_revision` ends the cycle; RLS makes only `published` rows public; app_user cannot delete.
- `scripts/seed_academy_status.py` wrote `docs/human-formation/academy_status_seed.json`: 24 programs, 255 lessons, 136 scenarios, 24 guides, all Draft.
- Routes: `GET /academy/content/status`, `/status/all`, `POST /:kind/:ref/transition`, `/review`.

## 4. What is missing (the real gap)

Academy content is static JSON, so even a perfect status table does not publish or hide anything. Missing pieces:

1. No consumer. `index.html` and `build_academy.py` do not read the status table or the seed; every item is served regardless of state.
2. No content binding. Approvals bind to (kind, ref, version), not to a hash of the text; the text can change after approval with no trace. `0017` source records do bind a sha256; 0020 does not.
3. No link to the validators. `validate_lessons.py`, `validate_programs.py`, `validate_coherence.py`, `validate_completeness.py`, `check_extracted_ids.py` do not feed the status. Nothing stops Published while a mandatory gate fails (today `validate_coherence.py` reports 97 errors and 132 warnings, exit 0 by design; `validate_completeness.py` passes).
4. No link to rights and sources: Published does not require the cited sources to be registered or the rights to be cleared (see source-integrity document).
5. No build-time filtering: `build_academy.py` would need to emit a public artifact containing only Published learner fields and a separate reviewer artifact.
6. No preview environment, no reviewer UI, no seeding to a live database, no appointed reviewers, and no distinct publisher role (any reviewer-role holder can publish; four distinct people are required for the four approvals, a fifth is needed if the publisher should be separate).
7. Status granularity: the unit that learners see (a lesson inside a program) can be Published while its program is not; dependency rules between kinds are not defined.
8. The existing `review_status` field on guides and the status in the DB are two sources of truth.

## 5. Proposed design (no implementation)

### 5.1 Data
- Keep `academy_content_status` and `academy_content_reviews`. Add to the status row: `content_sha256` (hash of the canonical JSON of the item as built), `validators_run_at`, `validators_result` (jsonb: per-gate pass/fail, script version, finding counts), `sources_ok` (boolean computed from the source register), `rights_ok`.
- Approvals reference the hash. A transition into Approved or Published verifies that the current `content_sha256` equals the hash stored with each of the four approvals; otherwise the approval is void.
- Alternative for the first release, with no database: a status file `docs/human-formation/academy_status.json` checked in and reviewed by pull request, plus an API route that serves it. This loses DB-enforced role checks and should be a stop-gap only.

### 5.2 Gate that prevents Published
Published is refused unless all of the following hold at the time of the transition, checked in the database function and again in the build:
1. Four approvals in the current cycle from four distinct, still-active reviewers, none the author.
2. `content_sha256` equals the hash at approval.
3. Mandatory gates passed on that hash: Completeness (gate 9), Safety privacy-claim check, Editorial encoding check, Competency (gate 2), Age (gate 4); and for programs also Coherence, Sequence and Timing (gates 1, 3, 5) run in `--strict` mode. A waiver is a recorded owner decision with a reason, not a silent exit.
4. Source gate: every cited source is in the register with rights not "NOT CLEARED" for the intended use, and no flag of kind contested-ruling, sectarian-tone, harsh-language, attribution-doubtful or ungraded-hadith is open (unless the hadith is not used).
5. Dependencies: a program is published only if all its lessons, scenarios and its guide are Published; a lesson only if its competencies' record has a source review.
6. A reviewer cannot approve what they authored; the owner decision for launch (CLAUDE.md: public launch is the owner's) is a separate explicit act.

### 5.3 Build and serving
- `build_academy.py` reads the status feed (live or file) and writes two artifacts: `academy-*.json` containing Published learner-facing fields only, and a reviewer artifact served only to authenticated reviewers behind the existing role check. Guide notes, safeguards and review data leave the public JSON.
- `index.html` shows the banner for every item not Published (preview) and no banner for Published ones; a failed fetch fails closed (nothing shown), not open.
- The status API `GET /academy/content/status` (published only, no identities) is already the right public shape.

### 5.4 Owner decisions required
Who are the first reviewers (four roles and a publisher); whether Published may ever coexist with open warnings; the retention policy for review data; which item kinds publish first (the owner has not decided, and no academy item is approved today).

## 6. Status summary

| Element | State |
|---|---|
| Lifecycle in DB (0020) | Built locally, tested by its stream, not applied, not wired |
| Reviews enforced by role in DB | Yes in 0002, 0017, 0020, none applied to production |
| Academy content actually gated | No: all content is public static JSON |
| Content hash binding | Missing in 0020 |
| Validators linked to status | Missing |
| Reviewers appointed | None |
| Preview environment | Missing |
