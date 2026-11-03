# TARTIL 13.0 - Target Architecture (reusable engines mapped to what exists)

> **Correction (verified read-only against Supabase project okbtrogotrtciymmuokr, 2026-11-03):** migrations 0001-0016 ARE applied in production and edge function `api` is at v23; migration 0017 and the `/formation/*` and `/me/reflections` routes are NOT live (probes: `/me/plan`, `/i/*/kids/overview` -> 401; `/formation/sources`, `/me/reflections` -> 404). Any statement below that 0016 (kids academy / plan) is "not applied" or "not live" predates this check and is superseded; it is untested end-to-end live, not unapplied.

Date: 2026-11-03. Scope: item "target architecture" and item 18 (logical database domains) of the TARTIL 13.0 reconstruction brief.
Status labels: WORKING, PARTIALLY WORKING, UI ONLY, BROKEN, MISSING, BLOCKED, NEEDS SCHOLARLY REVIEW. "not verified" means I did not read or run enough to say.

This document is a design plus an honest inventory. It changes no code, no migration, no academy data. Nothing here is "done" because it is described.

## 1. Verification basis (what I actually ran)

| Check | Result |
|---|---|
| `packages/database` `npx tsx --test test/formation.test.ts` (run by me, 2026-11-03) | 10 of 10 subtests `ok` (reviewer roles, source-record gate, reflection privacy, missions, scenario runs, observations) |
| `packages/database` full `npm test` | **not verified**: the run was killed (SIGKILL) inside `test/halaqat.test.ts` after ~49 s in this sandbox. This is an environment/resource limit as far as I can tell, not a proven test failure, but it is not a pass either |
| `packages/api` full `npm test` | **not verified**: no summary produced within a 170 s timeout |
| Counts quoted from PROJECT_STATE / KNOWN_LIMITATIONS (DB 49/49, API 50/50) | documented by earlier sessions, **not re-run by me** |
| Academy content counts | computed by me from `packages/web-vercel/academy-*.json` (section 3) |
| Route inventory | read from `packages/api/src/app.ts` (grep of route registrations) |
| Table inventory | read from `packages/database/migrations/0001-0017` |

## 2. Principle: one runtime pattern, many content types

Existing platform rules constrain the design (CLAUDE.md): tenant isolation in Postgres RLS via `withContext()`, no AI rulings, nothing machine-extracted published without a human gate, children's data protected, migrations append-only, owner decides money/launch/real data/reviewers.

The target architecture therefore is **content (versioned, reviewed, mostly data) + a small number of runtime engines (state, progress, privacy, review) + roles**. A new "engine" must be justified by a runtime behaviour that cannot be expressed on an existing table. Most of the thirteen are content types served by one of four runtimes:

1. **Sequencing runtime**: `learning_tracks` / `track_units` / `unit_progress` (0008).
2. **Practice-attempt runtime**: `homework_*` (0014), `kid_attempts` (0016), `hifz_*` (0009), `recitation_*` (0001/0013).
3. **Private-reflection runtime**: `reflection_entries`, `life_mission_runs`, `scenario_runs` (0017), owner-only RLS with FORCE.
4. **Review runtime**: `scholarly_items` + `scholarly_reviews` (0002/0010), `source_records` + `source_record_reviews` (0017), `ai_suggestions` (0008).

## 3. Where the content lives today (fact base)

| Fact | Evidence |
|---|---|
| Academy content is static JSON served with the SPA: 40 competency units, 148 lessons, 83 scenarios, 16 programs, 16 parent/teacher guides, 8 domains, 40 competencies | I computed these from `packages/web-vercel/academy-lessons.json`, `academy-programs.json`, `academy-guides.json`, `academy.json` |
| All 40 units carry `review_status: "unreviewed"`; all four files carry `status: "draft-unreviewed"` | same files |
| Lesson activities by type across the 148 lessons: practice 104, discussion 91, reflection 62, scenario 44, story 43, game 40, project 30 | computed from `activities[].type` in academy-lessons.json |
| Programs have stages, items referencing lesson/scenario ids (`{"ref":"C6-L1","kind":"lesson"}`), a mission and a capstone | `academy-programs.json` (P01 inspected) |
| The SPA's academy code keeps its progress in `localStorage` (`acLS`) and defines no call to `/formation/*`, `/me/scenarios`, `/me/missions`, `/me/reflections` or `/observations` | `packages/web-vercel/index.html` near line 1447; `grep -c "formation/"` returns 0; grep for the other routes finds only homework/kids/plan calls. The grep is evidence of absence of those calls, not a full code read |
| Backend for formation exists in the repo but is **not applied to production** and not deployed | PROJECT_STATE "Formation engines backend", KNOWN_LIMITATIONS 40 |
| Source originals for the 19 units / 105 competencies are not in the repository | KNOWN_LIMITATIONS 36 |

Consequence: today the academy is **UI ONLY over static draft JSON**, with local-device progress. The server engines exist as an unconnected, unreviewed backend.

## 4. Engine map (13 engines)

Legend for "Reuse": R = reuse as is, X = extend an existing table/route, N = new thing needed.

### 4.1 Lesson Engine
- **Exists**: static lessons (academy JSON, 148); foundations (`#/foundations`) and tajweed library (static in `index.html`, KNOWN_LIMITATIONS 24, 38); DB home `scholarly_items` (kind includes `lesson`, `exercise`, `teaching_note`, state machine to PUBLISHED, migration 0002/0010).
- **Status**: PARTIALLY WORKING for display (static, unreviewed); DB-backed lessons MISSING (no loader from academy JSON into `scholarly_items`: not found in scripts/; `scripts/validate_lessons.py` validates JSON only, as far as I read its name; not opened).
- **Gap**: lesson text is not versioned in a DB, not tied to its source record by a foreign key (JSON has `source_record` string such as "K1"-style ids; `source_records.competency_id` pattern `^[A-Z][0-9]{1,2}$` could carry it).
- **Decision**: R `scholarly_items` as the lesson store when content must be reviewed and versioned; keep JSON as build input. X: add a `source_record_id` link (nullable) rather than a second lesson table.
- Label: NEEDS SCHOLARLY REVIEW (all content).

### 4.2 Path Engine
- **Exists**: `learning_tracks` (institution-owned, draft/published/archived), `track_units` (`kind` CHECK: recitation, memorization, tajweed, review; surah/ayah optional), `unit_progress` (marked by assessor), certificates from completed tracks (0008). Eleven track templates in the SPA (KNOWN_LIMITATIONS 28). API `/i/:inst/tracks*`, `/i/:inst/passport`.
- **Status**: WORKING for Quran tracks (documented tests; tracks.test.ts exists in both packages, not re-run by me).
- **Gap**: cannot express an academy program (stages of lessons/scenarios/missions). `kind` is a closed list of four Quran kinds.
- **Decision**: X, not N. A new migration widens `track_units.kind` and adds a nullable `content_ref` (same `app.ref_ok` pattern as 0017) so a unit can point at a lesson/scenario/mission id. Keeps certificates, passport and progress logic. Do not create a second path table.
- Caveat: `unit_progress` is marked by an assessor; learner self-progress for a formation path would need an explicit, owner-approved rule (no scores on character, BLUEPRINT D5).

### 4.3 Story Engine
- **Exists**: 43 `story` activities and 83 branching scenarios inside lessons (JSON); `scenario_runs` (chosen node ids, owner-only, no score).
- **Status**: UI ONLY for stories/scenarios (client-side, local progress); backend `scenario_runs` BLOCKED (not applied, no UI caller).
- **Decision**: Story and Decision Simulation share one runtime (BLUEPRINT D6 already merges them). R `scenario_runs`; no new table. Stories without choices need no runtime at all (content only).

### 4.4 Activity Engine
- **Exists**: Kids activities (`rec`, `match`, `pair`, `har`) with `kid_attempts` (item text length 1-8, activity CHECK of four values, append-only) and `kid_profiles` (band a/b/c, placement); UI `#/kids` (local progress plus optional sync, 0016 NOT applied live per KNOWN_LIMITATIONS 39). Academy activity types: practice, discussion, reflection, game, project (JSON only).
- **Status**: Kids hub PARTIALLY WORKING; server sync BLOCKED (migration 0016 not live); academy activities UI ONLY.
- **Decision**: do **not** stretch `kid_attempts` to academy activities: item length 8 and a closed activity list are letter-drill shaped. If activity results must be stored, N: a small generic `activity_attempts` table (ref, outcome enum without numeric grade, owner-only RLS) would be justified, but only after the owner's child-data retention policy exists. Until then keep activities client-side.

### 4.5 Recitation Engine
- **Exists**: `recitation_submissions` (institution, audio in storage, state machine, guardian-consent trigger for minors; 0001), `recitation_attempts` (personal STT result JSON, audio never retained, CHECK `audio_retained = false`; 0013), `assessments` (human qari, four dimensions 1-4, "not a ruling"; 0006), `packages/api/src/recitation.ts` (word alignment), homework audio submit.
- **Status**: PARTIALLY WORKING. BLOCKED live for analysis: OpenAI speech-to-text returned HTTP 429 (KNOWN_LIMITATIONS 37, 38), owner action. Tajweed and pronunciation are not assessed (documented).
- **Decision**: R. Nothing new. Detail belongs to TARTIL_13_RECITATION_HIFZ.md.

### 4.6 Memorization Engine
- **Exists**: `hifz_items`, `hifz_reviews` (0009), `nextReview` scheduler (unit-tested per PROJECT_STATE), `/me/hifz*`, `/me/mastery`, plan page with Sabaq/Sabqi/Manzil board (an approximation, KNOWN_LIMITATIONS 38), `study_plans` (0015, applied live, route NOT deployed).
- **Status**: WORKING as self-assessment (documented tests; not re-run by me). Teacher-set plans and load balancing MISSING.
- **Decision**: R. Self-rating is never an assessment (KNOWN_LIMITATIONS 25).

### 4.7 Decision Simulation Engine
- Same runtime as 4.3. Contemporary scenarios must keep the visible label "contemporary educational example" (BLUEPRINT D7 rule); JSON carries `fictional_note`. No aggregation exists and none should be built before a written policy (KNOWN_LIMITATIONS 40).
- **Status**: UI ONLY / backend BLOCKED, as 4.3.

### 4.8 Life Practice Engine
- **Exists**: `lessons[].life_practice` text and a program `mission` (JSON); `life_mission_runs` (private step indices 0-49, completion never undone, reflection link) and `life_mission_status` (the only projection teachers/guardians read: started/completed), API `/i/:inst/missions/:ref`, `/me/missions`, `/i/:inst/missions/status` (learner id mandatory).
- **Status**: backend WORKING locally per the formation tests I ran (test 8 ok); not live; no UI caller.
- **Divergence to note**: BLUEPRINT D5 proposed adding a `life_practice` kind to `homework_assignments`. Migration 0017 instead made separate tables, and `homework_assignments.kind` still lists memorization, revision, reading, makharij, listening, tajweed, recitation, assessment, custom (0014). Decision: keep the 0017 design (privacy differs from homework); do not also add the homework kind.

### 4.9 Project Engine
- **Exists**: 30 `project` activities and per-program `capstone` objects (title, brief, deliverable) in JSON. No table.
- **Status**: MISSING backend; UI ONLY display of the capstone, as far as read (render path not fully read: not verified).
- **Decision**: X, not N. BLUEPRINT D6 says projects build on life missions. `life_mission_runs.mission_ref` accepts any ref matching `^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$` and `steps_done` holds up to 50 steps, so a capstone can be a mission-shaped run with a ref such as `P01-capstone`. Deliverable files are not stored (would need a retention policy and child-protection review first: owner decision).

### 4.10 Assessment Engine
- **Exists**: qari `assessments` (human only, enforced `assessor_kind = 'human_qari'`), `homework_reviews` (teacher approval), `quiz_attempts` (self), `formative_observations` (competency level 1-5, status appeared/practicing/needs_support, author qari or guardian, never the learner, never admin; 0017), `unit_progress`, `certificates` (completion records, not ijazah).
- **Status**: PARTIALLY WORKING. Observations backend tested locally (test 10 ok), not live, no UI. Quiz banks are AI-authored, pending review (KNOWN_LIMITATIONS 25).
- **Rule kept**: no numeric grade on character; no ranking or comparison of children (structurally checked per KNOWN_LIMITATIONS 40, though a teacher can still loop client-side over their own children).

### 4.11 Research & Citation Engine
- **Exists**: `source_records` (competency id, version, `content_md` internal only, `takhrij_status`, `rights_status`, content hash, three-role approval trigger), `scholarly_items.source_unit_ids` lineage to `SRC-xxxxxx#toc-N.pNNNN`; scripts `verify_citations.py`, `verify_quran_crosscheck.py`, `extract_concepts.py`; translations (0011) and tafsir panel (external, unstated licence, limitation 32); docs/human-formation (records, guides, SOURCE_MAP).
- **Status**: DB gate PARTIALLY WORKING (tests 2-5 ok locally; not live). UI for source records MISSING (no caller of `/formation/source-records` in the SPA: same grep basis as section 3). Licences default NOT cleared.
- **Gap**: `takhrij_status` and `rights_status` are recorded but do not gate approval; publication gating is a separate owner step (KNOWN_LIMITATIONS 40).
- **Decision**: R. A reviewer-only workspace UI is the missing piece, not a new engine.

### 4.12 Academic Review Engine
- **Exists**: `scholarly_items` state machine with DB trigger (illegal transitions refused; PUBLISHED needs active reviewer approver plus owner-set `licence_cleared`), `scholarly_reviews`, review UI `#/review` (limitation 26); `source_record_reviews` with roles scholarly / pedagogical / child_protection and the three-distinct-reviewer rule; `ai_suggestions` (PENDING draft, human accept, RLS-hidden until accepted).
- **Status**: mechanism WORKING in tests; **BLOCKED in practice: no reviewer is appointed**, so nothing is reviewed or can reach approved. This is an owner decision (named reviewers).
- **Known weakness (inherited, documented)**: a tenant admin can assign `scholarly_reviewer` to themselves via the members API; the two new roles are deliberately not assignable that way (ADR-013). Closing this is a design change for owner sign-off.
- The academy JSON `review_status: "unreviewed"` is a text field in a file; it is not tied to the DB gate. Nothing enforces that unreviewed content is hidden. UI labels it draft (not verified on every screen).

### 4.13 Teacher & Institution Engine
- **Exists**: `institutions`, `memberships` (roles tenant_admin, scholarly_reviewer, qari, student, guardian, safeguarding_officer, plus the two 0017 reviewer roles), `guardian_links` (manual verification), `consents` (live-consent trigger for minors), `halaqat`, `halaqah_members`, `halaqah_sessions`, `attendance`, `homework_*`, `study_plans` review, roster/suspend/overview/audit-trail routes, kids overview, guardian progress card, immutable `audit_logs`.
- **Status**: PARTIALLY WORKING (live: migrations to 0015 per notes; 0016 and 0017 not live; plan routes not deployed). No email invitations, billing, password recovery by email (limitations 14, 29). Guardian-side workspace for academy MISSING (KNOWN_LIMITATIONS 36).
- **Safeguarding**: covers data access and consent only; no messaging or reporting workflow (limitation 9). Appointing a safeguarding lead is owner-held.

## 5. Reuse decisions at a glance

| Engine | Verdict | Build new? | Blocked by |
|---|---|---|---|
| Lesson | R `scholarly_items`; link to `source_records` | loader script + nullable link column | reviewer appointment |
| Path | X `track_units` (widen kind, add `content_ref`) | one migration, no new table | none technical |
| Story | R `scenario_runs` + JSON | none | 0017 not live; child-data policy |
| Activity | keep client-side; generic table only later | possibly 1 small table | child-data retention policy |
| Recitation | R | none | OpenAI 429 (owner billing) |
| Memorization | R | none | none |
| Decision Simulation | same as Story | none | same as Story |
| Life Practice | R `life_mission_runs` | none | 0017 not live |
| Project | X on `life_mission_runs` | none | retention/child-protection for deliverables |
| Assessment | R `formative_observations`, `assessments` | UI only | 0017 not live |
| Research & Citation | R `source_records` | reviewer UI | named reviewers; licences |
| Academic Review | R | none | named reviewers (owner) |
| Teacher & Institution | R | academy-aware dashboards, guardian view | owner policies |

Net: no new engine table is needed to start. New code is mostly (a) one migration extending `track_units`, (b) wiring the SPA academy views to the existing 0017 routes, (c) reviewer UI for source records, and (d) apply 0016/0017 and deploy the edge function (owner-gated, see section 8).

## 6. Layered target architecture

```
 Content layer (versioned, reviewed)           docs/human-formation/*, academy-*.json -> scholarly_items / source_records
 Sequencing layer                              learning_tracks, track_units(+content_ref), unit_progress
 Practice layer (per learner)                  homework_*, hifz_*, recitation_*, kid_*, study_plans
 Private formation layer (owner-only RLS)      reflection_entries, life_mission_runs, scenario_runs
 Observation / assessment layer (human)        assessments, formative_observations, certificates
 Governance layer                              memberships roles, consents, guardian_links, audit_logs, scholarly/source reviews
 Delivery                                      Fastify API (packages/api) -> edge function (packages/edge/dist) ; SPA (packages/web-vercel)
```

Invariants every layer must keep (all already in code/docs): Quran text immutable and edition-pinned; AI output is a pending draft; `app_user` non-owner with RLS; no cross-learner comparison; no real child data in dev/test.

## 7. Logical database domains (item 18)

### 7.1 Current physical layout
Every table sits in the default schema (`public`); only helper functions live in schema `app` (`CREATE SCHEMA IF NOT EXISTS app` in 0001; no other `CREATE SCHEMA` in migrations 0001-0017, checked by grep). A regex count of `CREATE TABLE` statements gives 48 (0001: 9, 0002: 4, 0006: 5, 0007: 1, 0008: 5, 0009: 3, 0010: 2, 0011: 2, 0013: 1, 0014: 6, 0015: 1, 0016: 2, 0017: 7). Tables created by other means would be missed, so treat 48 as a minimum.

### 7.2 Recommendation: logical domains first, physical schemas later (owner/engineering decision)
Moving tables into Postgres schemas would touch every RLS policy, trigger, grant, the pg adapter, the edge bundle and the "migrations are checksum-protected" rule. Cost is high; risk to tenant isolation is real; benefit is mostly organisational. Recommended path:
1. **Now**: adopt the domain names below as documentation and as a naming/ownership convention (this table is the source of truth); add a `COMMENT ON TABLE ... IS 'domain: x'` in a future append-only migration so the catalogue is queryable.
2. **Later, only if needed** (e.g. separate retention or backup policy for child data): create schemas and move tables with a dedicated, tested migration plus a grants/policy review on a Supabase branch. Not planned here.

### 7.3 Domain catalogue (current tables -> domain; planned additions marked +)

| Domain | Tables (migration) | Data class | Notes |
|---|---|---|---|
| identity_access | users, memberships, rate_limits (0001/0007) | personal | sessions_valid_after on users (0008) |
| tenancy_institutions | institutions, halaqat, halaqah_members, halaqah_sessions, attendance (0001/0006) | institutional | |
| safeguarding_consent | guardian_links, consents, audit_logs (0001) | child-protection | audit immutable |
| quran_core | quran_editions, quran_ayahs, quran_reference_counts (0002) | public, immutable | never altered |
| quran_translation | translation_editions, translation_ayahs (0011) | public, licence-bound | separate from Arabic text |
| learning_sequencing | learning_tracks, track_units, unit_progress, certificates (0008) | institutional | + `content_ref` on units |
| practice_memorization | hifz_items, hifz_reviews, quiz_attempts, study_plans (0009/0015) | learner-private | self-assessment only |
| practice_recitation | recitation_submissions (0001), recitation_attempts (0013), assessments (0006) | learner / minors' audio | audio retention rules |
| homework_ops | homework_assignments, homework_recipients, homework_submissions, homework_reviews, homework_requests, homework_templates (0014) | institutional / minors | |
| kids_academy | kid_profiles, kid_attempts (0016) | children's data | retention policy undefined |
| formation_private | reflection_entries, life_mission_runs, life_mission_status (projection), scenario_runs (0017) | most sensitive learner-private | owner-only RLS, FORCE |
| formation_observation | formative_observations (0017) | children's data, human-authored | no comparison |
| content_review | scholarly_items, scholarly_reviews, sanad_entries (0002/0010), ai_suggestions (0008) | content / governance | human gate |
| source_research | source_records, source_record_reviews (0017) | third-party derived, internal only | licence not cleared |
| + content_catalog | (planned, only if lessons move to DB) | content | prefer `scholarly_items` first |

### 7.4 Domain rules
- A table belongs to exactly one domain; cross-domain references go by id and are guarded by RLS or trigger, not by joins in the UI.
- Learner-private domains (`formation_private`, `practice_memorization`) expose projections (such as `life_mission_status`) to others, never raw rows.
- Child-data domains (`kids_academy`, `formation_observation`, `formation_private`, minors' `practice_recitation`) are not to receive real child data until the retention and deletion policy exists (owner decision).
- Content domains hold no personal data.

## 8. Deployment state (matters for what "exists" means)

| Item | State | Evidence |
|---|---|---|
| Migrations 0001-0014 | stated applied live | PROJECT_STATE, KNOWN_LIMITATIONS 37, 38 |
| 0015 | stated applied live; plan routes not deployed | KNOWN_LIMITATIONS 38 |
| 0016 (kids), 0017 (formation) | NOT applied live | KNOWN_LIMITATIONS 39, 40 |
| Edge function carrying 0015-0017 routes | NOT redeployed | same |
I did not query Supabase this session, so these live states come from repository documents: not independently verified.

## 9. Implementation sequence (engineering, no owner blockers until step 5)
1. Draft migration: widen `track_units.kind`, add nullable `content_ref`; tests first (append-only, never edit applied migrations).
2. Script that loads academy JSON into `scholarly_items` (DRAFT) and `source_records` keyed by competency id, idempotent, hash-recorded.
3. Wire SPA academy views to `/me/scenarios`, `/me/missions`, `/me/reflections`, `/i/:inst/missions/status` behind a feature check that falls back to local progress.
4. Reviewer UI for `source_records` and the three-role gate.
5. **Owner decisions required before any live use**: apply 0016/0017 to Supabase and redeploy the edge function; child-data retention and deletion policy; appoint named scholarly, pedagogical and child-protection reviewers; guardian age-band design for ages 15-17; licence clearance of third-party sources; fix for admin self-assigning `scholarly_reviewer`.
6. Real-device and Safari testing, screen-reader pass, end-to-end browser journeys (none exist for the academy: `scripts/e2e_academy.mjs` exists but was not run by me).

## 10. Owner decisions (not taken here)
- Apply migrations 0016/0017 to production and deploy the function (payment/launch/real-data implications).
- Retention and deletion policy for children's data.
- Naming reviewers; making the three-role gate real.
- Whether physical Postgres schemas are ever worth the migration risk (section 7.2).
- Whether deliverables (projects, audio) may be stored for minors.
- Public launch of any academy content; licence clearance.

## Evidence
Files read: `/home/claude/quran-global-platform/CLAUDE.md`, `PROJECT_STATE.md`, `IMPLEMENTATION_TRACKER.md`, `docs/governance/KNOWN_LIMITATIONS.md`, `docs/governance/ARCHITECTURE_DECISIONS.md` (ADR-013 line), `docs/human-formation/BLUEPRINT.md` (sections D5-D7), `packages/api/src/app.ts` (route list), `packages/database/migrations/0001..0017` (table definitions via grep; 0006 assessments, 0008 tracks, 0009, 0013, 0014, 0015, 0016, 0017 definitions read), `packages/web-vercel/index.html` (nav, academy section header, greps), `packages/web-vercel/academy*.json` (counts computed).
Commands run: grep/ls over migrations and routes; Python count script over academy JSON; `npx tsx --test test/formation.test.ts` in `packages/database` (10/10 ok); `npm test` in `packages/database` (killed in halaqat.test.ts, no verdict); `npm test` in `packages/api` (timed out, no verdict).

## Open items
- Full DB and API suites need a re-run on a machine with enough resources; then update the test numbers.
- Confirm live migration state against Supabase (not queried).
- Confirm what `scripts/validate_lessons.py` / `validate_programs.py` check (not opened).
- Confirm exactly how the SPA renders capstones and the `#/academy/review` view (not fully read).
- Exact table count (my regex minimum is 48).
- Sibling documents TARTIL_13_* exist in docs/; I did not read them, so overlap or contradiction is unchecked.
