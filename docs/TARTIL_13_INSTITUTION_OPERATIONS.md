# TARTIL 13.0 - Teacher, Guardian and Institution Operations (المعلم وولي الأمر والمؤسسة)

Date: 2026-11-03. Scope: workflows required by the owner's brief (section 16: halaqat, homework, recording review, reports, guardian consent, RLS / tenant isolation), the academic administration dashboard (section 17), and the roles and permissions that actually exist in migrations 0001-0017 and the API.

Method: every status below comes from a file I read, a test I ran, or a probe I ran against a throw-away in-memory Postgres (PGlite, synthetic users). Nothing here was run against Supabase production, and nothing was changed except this file. Where I could not verify, the text says "not verified".

Caveat on the brief: the owner's original TARTIL 13.0 text (sections 16 and 17) is not in the repository (grep for "13.0" across docs and root files found nothing). The rows below follow the one-paragraph summary I was given. If the owner's wording lists items I did not cover, they are not covered here.

Status vocabulary: WORKING, PARTIALLY WORKING, UI ONLY, BROKEN, MISSING, BLOCKED, NEEDS SCHOLARLY REVIEW. "Backend only" = API/RLS supports it, no UI.

## 1. Summary

| Area | Verdict |
|---|---|
| Teacher day-to-day loop (halaqah, session, attendance, assign homework, review, approve) | WORKING for the single-institution happy path, tested through the real RLS layer |
| Guardian view of a child | PARTIALLY WORKING: homework, consent, kids progress in the UI; attendance, passport, certificates, observations backend only |
| Reports (teacher, parent, institution) and any export | MISSING |
| Notifications / invitations / reminders | MISSING (no provider, owner decision) |
| Tenant isolation (RLS) | WORKING and tested; four hardening gaps found (section 6) |
| Academic admin dashboard | PARTIALLY WORKING: 9 headline counts, roster with suspend, audit trail; no academic oversight |
| Live state | Not verified by me. Project docs say 0014 live, 0015 live but plan routes not deployed, 0016 and 0017 not applied (KNOWN_LIMITATIONS items 36-40) |

Test evidence of this session (PGlite, serial per-file runs because the full `npm test` was SIGKILLed by memory pressure from other processes sharing the machine): DB isolation 17/17, halaqat 6/6, tracks 4/4, formation 11/11; API homework 3/3, halaqah 4/4, admin 2/2, kids 1/1, plan 1/1, journey 4/4. I did not obtain a clean full-suite count in this session; the project's own figures (DB 49, API 50, PROJECT_STATE) are quoted only as the docs' claim.

## 2. Roles and permissions as implemented

Source: `packages/database/migrations/0001` (memberships CHECK), `0017` (CHECK extended), policies in 0001/0006/0008/0014/0016/0017, `ROLES` in `packages/api/src/app.ts:13`.

### 2.1 Role inventory

| Role (membership.role) | Arabic in UI | Notes |
|---|---|---|
| tenant_admin | مدير المؤسسة | Created automatically for whoever calls `POST /institutions` (any registered user can create an institution) |
| qari | مقرئ | Is the "teacher" role. There is no separate teacher role |
| student | طالب | Needs a `student_profiles` row (is_minor) created by an admin |
| guardian | وليّ أمر | Is the "parent" role. Has no power until a `guardian_links` row is verified |
| safeguarding_officer | مسؤول حماية | Read broad, write guardian links; cannot update homework (probe: 0 rows) |
| scholarly_reviewer | مراجع علمي | Holds in ANY institution, reads scholarly items platform-wide (0010) |
| pedagogical_reviewer, child_protection_reviewer | - | Added in 0017 (local only). Not in the API `ROLES` list, so not assignable through the members API |

Relational roles used by policies (not memberships): assigned qari (`qari_assignments`), halaqah qari (`halaqat.qari_user_id`), verified guardian (`app.is_guardian_of`: verified, not revoked), `app.is_teacher_of` = qari role AND (assigned OR halaqah qari of an active halaqah the student is in).

Absent roles that a school needs: academic coordinator / supervisor (reads across teachers without being admin), registrar, finance/billing, read-only auditor, teaching assistant/co-teacher, institution-level (not platform-wide) content reviewer. Whether to add them is an owner decision (scope and cost).

### 2.2 What each role can do (from policy text; items marked P were also exercised by my probes)

| Capability | admin | qari (assigned) | halaqah qari only | student | verified guardian | safeguarding |
|---|---|---|---|---|---|---|
| Add member / student profile / assign qari / create halaqah / add halaqah member | yes | no (P: halaqat insert refused) | no | no | no | no |
| Verify or delete guardian link | yes (P) | no | no | no | no | verify yes (P) |
| Grant / revoke consent | no (P: refused) | no | no | adult self only (P: minor refused) | yes (P) | no |
| Read consents | yes | no (P: 0 rows) | no | own | ward | yes |
| Create halaqah session, mark attendance | yes | session/attendance for own halaqah | yes | no | no | no |
| Assign homework | yes | to students they teach (P in API test) | yes | no | no (API test 403) | no |
| Approve / retry / excuse homework | yes | yes | yes | no (P) | no (P) | no (P) |
| See and hear a student's recitation submission | yes | yes | yes (P) | own | ward | yes |
| Set submission state (feedback_sent...) | no | yes | NO (P) | no | no | no |
| Write assessment (levels 1-4) | no | yes | NO (P) | no | no | no |
| Mark track-unit progress | yes (if can see user) | yes | NO (P) | no | no | no |
| Issue certificate | yes | no | no | no | no | no |
| Read child's assessments | yes | yes | no | own (P) | ward (P: 1 row; unverified guardian 0) | yes |

Findings F3 and the guardian rows are explained in section 6.

## 3. Section 16 - required workflows vs implemented

### 3.1 Institution, people, enrolment

| Workflow | Status | Evidence / what is missing |
|---|---|---|
| Create institution (tenant bootstrap) | WORKING | `POST /institutions` app.ts:142; journey.test.ts. Self-service, no approval, no billing, no plan limits (owner decision) |
| Add member by e-mail | PARTIALLY WORKING | `POST /i/:inst/members` app.ts:153. Person must already be registered; no invitation e-mail, no invite link, no bulk/CSV import (KNOWN_LIMITATIONS 29) |
| Student profile (is_minor) | PARTIALLY WORKING | Insert only (`POST /students`). No edit route; DB policy still allows UPDATE (F1) |
| Assign qari to student | PARTIALLY WORKING | Insert only; `qari_assignments.active` exists but no unassign/transfer route |
| Link guardian + verify | PARTIALLY WORKING | Create, verify (button, UI people tab). No evidence/reason captured with verification, no revoke route although `revoked_at` exists and policy allows it; admin can only DELETE at DB level |
| Student transfer / leave / graduation / archive | MISSING | no route, no state |

### 3.2 Halaqat and sessions

| Workflow | Status | Evidence / what is missing |
|---|---|---|
| Create halaqah, add students, create sessions | WORKING | halaqah.test.ts (4/4 passed); UI `halaqat()` index.html:1011. Admin creates halaqah; admin or halaqah qari creates sessions |
| Edit halaqah, change qari, archive, remove member | MISSING | no routes (`halaqat.status`='archived' and `members_delete` policy exist, unused by API) |
| Attendance | PARTIALLY WORKING | Mark (upsert) works, tested; teacher-only button in UI. No per-student or per-halaqah attendance summary, no absence follow-up, no guardian/student attendance view (API/RLS allow it, UI hides it: `ctx.staff`) |
| Live session | PARTIALLY WORKING | External Jitsi room, 15-minute window, minors need verified guardian (tracks.test.ts). Not recorded, no moderation, real join untested (KNOWN_LIMITATIONS 16) |
| Session recording | MISSING | `live_session_recording` consent purpose exists but nothing records or checks it |
| Timetable / recurring sessions / room or capacity | MISSING | one-off sessions only |

### 3.3 Homework and learning plans

| Workflow | Status | Evidence / what is missing |
|---|---|---|
| Teacher assigns (individuals or whole halaqah), templates, extend due date, batch approve | WORKING | homework.test.ts 3/3; `/i/:inst/homework*` app.ts:730-925; UI hwAssign/hwQueue/hwTrack |
| State machine and "completion is not mastery" | WORKING | `app.hw_status_guard` (0014); probe: student and guardian approve refused with `homework_teacher_only` |
| Student/guardian marks done, offline queue | PARTIALLY WORKING | done-mode tested; offline queue is client code, not browser-tested in this session |
| Audio homework | PARTIALLY WORKING | submission + consent trigger tested at API level; real microphone and live storage upload not exercised (KNOWN_LIMITATIONS 21). Guardian cannot record on behalf of the child via the API (route fixes student = caller) |
| Guardian requests (obstacle, extension) | PARTIALLY WORKING | Create and list work. `homework_requests` has no status column: teacher cannot acknowledge or resolve, and `summary.openRequests` counts every request ever made (app.ts:777) (F8) |
| Teacher-assigned Academy / kids lessons as typed homework, remedial suggestions | MISSING | stated in docs/PARENT_TEACHER_INTEGRATION.md |
| Study plans shared for teacher approval | WORKING locally, NOT LIVE | plan.test.ts; edge function with plan routes not deployed per docs |
| Reminders for overdue work | MISSING | overdue is computed at read time only |

### 3.4 Recording review and assessment

| Workflow | Status | Evidence / what is missing |
|---|---|---|
| Student uploads recording to private storage | PARTIALLY WORKING | signed upload URL, derived path (app.ts:213); `d.storage` returns 501 if not configured; live bucket policy not verified |
| Teacher listens (60-second signed URL) and approves / needs retry / excuse with a text note | WORKING at API level | homework.test.ts; UI review queue. Halaqah qari can listen (0014 policy) |
| Machine hypothesis attached to a submission | PARTIALLY WORKING | labelled `notAGrade`; live STT blocked by provider quota (KNOWN_LIMITATIONS, OpenAI 429) |
| Per-ayah or timestamped comments, teacher voice feedback | MISSING | voice feedback deliberately not built (retention policy for minors' data undefined) |
| Human qari assessment, levels 1-4 per dimension | WORKING | halaqat.test.ts; append-only (probe: qari UPDATE refused); only the individually assigned qari can write it (F3). No correction/withdraw route |
| Submission state (submitted, under_review, feedback_sent...) | PARTIALLY WORKING | route has no role check of its own; RLS lets only the assigned qari update (F3) |

### 3.5 Tracks, passport, certificates, reports

| Workflow | Status | Evidence / what is missing |
|---|---|---|
| Track templates, publish, mark unit, passport, certificate, public verify | WORKING | tracks.test.ts (API), tracks DB 4/4. Admin-only certificate, all-units guard. No revoke route (column exists), no PDF (print stylesheet only, per docs/07) |
| Teacher report on a student or halaqah | MISSING | no endpoint, no UI string "تقرير" (grep: 0) |
| Periodic parent report | MISSING | |
| Institution report (attendance, completion, workload) | MISSING | |
| Export (CSV/PDF) of any roster, attendance, progress | MISSING | only `window.print` for certificates |
| Child progress for guardian | PARTIALLY WORKING | kids progress card (index.html:1430) and homework list work; passport, certificates, attendance, observations backend only (`certs()` shows the passport picker to staff only) |

### 3.6 Guardian onboarding, consent, communication

| Workflow | Status | Evidence / what is missing |
|---|---|---|
| Minor's recording blocked without live guardian consent | WORKING | DB trigger 0001; isolation.test.ts (revoke, expiry, unrevoke). Verified again at API level in homework.test.ts |
| Guardian grants and revokes consent | WORKING | RLS: only a verified guardian, or an adult for self (probe: admin refused, unverified guardian refused, minor self refused); UI people tab |
| Consent types other than audio_recording enforced | MISSING | `ai_analysis`, `live_session_recording`, `data_processing` are accepted and stored (probe: OK) but no code path reads them. `ai-suggestions/generate` does not check `ai_analysis`. `reflection_journal` is enforced by 0017 (local only) (F5) |
| What revocation does to existing data | MISSING | revocation blocks new recordings only; no route deletes a recitation submission or its audio; retention policy is an owner decision (also KNOWN_LIMITATIONS item 40) |
| UI shows consent form to admin | BROKEN (minor) | admin sees the grant form (`ctx.admin` at index.html:1121) but RLS refuses admin grants (probe). Result: error toast, no harm |
| Teacher-guardian messaging | MISSING | no messaging by design (KNOWN_LIMITATIONS 9: no unsupervised adult-child contact; a supervised channel needs owner design). Only homework notes and requests exist |
| Notifications (e-mail, push, in-app) | MISSING | no provider, sender identity or consent rules (owner decision, docs say so) |
| Formative observations by qari and guardian | WORKING locally, NOT LIVE, no UI | formation.test.ts 11/11 DB; 0017 not applied |

## 4. RLS and tenant isolation

Design (read in 0001, confirmed by test `app_user is unprivileged`): API opens a transaction, sets `app.user_id` and `app.institution_id`, then `SET LOCAL ROLE app_user` (non-owner, no BYPASSRLS). Policies call `app.in_context(inst)` which requires the context institution to equal the row's and the caller to be an active member of an active institution. 0008 onward use FORCE ROW LEVEL SECURITY; 0001-0006 tables rely on the non-owner role instead (documented in the 0001 header).

Verified by tests (ran this session): isolation.test.ts 17/17 including no-context, forged context, tenant admin cross-write, qari scope, guardian verified vs unverified, one person in two institutions, consents hidden from qari, cross-tenant foreign keys, immutable audit. API homework.test.ts asserts classmate, other guardian, outsider, unrelated qari and other tenant all see nothing.

Verified by my probes (PGlite, synthetic): forged context (admin of A with institution B) sees 0 homework rows; other tenant admin 0; unrelated qari 0; suspended qari 0; qari cannot read consents; app_user cannot UPDATE assessments or DELETE homework_reviews (permission denied).

Not verified: the same policies on the live Supabase instance (docs/SUPABASE.md claims targeted checks passed; I did not re-run them), the pg adapter behind the pooler, Supabase `postgres` role access (bypasses RLS by design), storage bucket policies, edge-function context handling (KNOWN_LIMITATIONS 8: context is trusted from the API layer).

## 5. Section 17 - academic administration dashboard vs existing

What exists (`adminView`, index.html:1087, plus overview): headline counts from `GET /overview-stats` (students, qaris, suspended, halaqat, tracks published, tracks draft, open submissions, assessments, certificates), roster with suspend/reactivate and last-admin guard (admin.test.ts), last 100 audit entries (object type + actor, no diffs), set-up checklist, homework summary for staff (counts by status, overdue, requests).

| Expected in an academic admin dashboard | Status | Note |
|---|---|---|
| Headline numbers | PARTIALLY WORKING | counts only, no trend, no period filter |
| Roster and suspension | WORKING | admin.test.ts |
| Audit trail | PARTIALLY WORKING | no filters, no export; several tables not audited (F4) |
| Teacher workload (students, halaqat, open reviews per teacher) | MISSING | no endpoint |
| Review backlog age (oldest pending homework / submission) | MISSING | queue per teacher only |
| Attendance rates, absentee list | MISSING | |
| Homework completion by halaqah/teacher | PARTIALLY WORKING | `homework/summary` is per caller scope, not per halaqah |
| Unassigned students, halaqat without sessions, minors without verified guardian or consent | MISSING | set-up checklist covers only "has qari/students/halaqah" |
| Guardian-link verification queue | PARTIALLY WORKING | list in people tab; no queue, no evidence |
| Student lifecycle (enrol, transfer, withdraw, graduate) | MISSING | |
| Curriculum oversight (which tracks, who is on which unit) | PARTIALLY WORKING | tracks list and passport per student |
| Certificate register and revocation | PARTIALLY WORKING | list, issue; no revoke route |
| Billing, plans, invoices | MISSING | owner decision |
| Reports and exports | MISSING | |
| Safeguarding case log / incident reporting | MISSING | KNOWN_LIMITATIONS 9 |

Dashboard visibility: the "الإدارة" tab renders only when `ctx.admin`; the API checks the admin role itself for `/roster`, `/overview-stats`, `/audit-trail` (admin.test.ts: non-admins refused). A safeguarding officer can read the audit trail through the API but has no tab for it.

## 6. Findings (permissions and isolation)

Severity is my judgement. "Not API-reachable" = I grepped `app.ts` for a route that performs the operation and found none; the risk exists for direct database access, SQL console, or a future route.

| # | Finding | Evidence | Severity |
|---|---|---|---|
| F1 | A tenant admin can UPDATE `student_profiles.is_minor` and the change is not audited. After flipping a minor to adult the child recorded with no guardian consent (the trigger only checks the flag). Not API-reachable (only INSERT exists) | probe: flip ALLOWED, recording ALLOWED, 0 audit rows for student_profiles; `student_profiles_write` FOR ALL in 0001 | High if exposed, today latent |
| F2 | A student, or a verified guardian, can UPDATE `teacher_note` and `reviewed_at` of their own/ward's homework row. The guard trigger fires only `UPDATE OF status`, and the column grant (0014) includes those columns. Not API-reachable (the review route also changes status, which the guard blocks) | probe: both ALLOWED. 0014 GRANT UPDATE (status, teacher_note, viewed_at, submitted_at, reviewed_at) | Medium (forged teacher feedback) |
| F3 | A halaqah's qari who is not individually assigned can see and hear submissions and review homework, but cannot set submission state, write assessments or mark unit progress; those policies still use `is_assigned_qari` (0001, 0006, 0008) and 0014 only updated select/insert policies | probe: state update 0 rows, assessment and unit_progress inserts refused | Medium (functional): teachers of a circle need per-student assignment to assess |
| F4 | Audit triggers exist for 17 tables; not audited: student_profiles, halaqah_sessions, homework_submissions, homework_requests, homework_templates, kid_profiles, kid_attempts, study_plans, institutions. The audit UI has a label for student_profiles that can never appear | grep of `TRIGGER audit_` in migrations; probe | Medium |
| F5 | Consent purposes `ai_analysis`, `live_session_recording`, `data_processing` are stored but enforced nowhere | grep: only enum/UI label occurrences; probe | Medium (misleads guardians into believing a control exists) |
| F6 | Cannot undo operational mistakes through the product: no revoke guardian link, unassign qari, remove halaqah member, archive halaqah, revoke certificate, delete a recording. Schema columns for most of these exist | route list of app.ts vs migrations | Medium (operations and child data) |
| F7 | Any registered user can create an institution and become `tenant_admin`, and a tenant admin can insert a `scholarly_reviewer` membership for themselves (probe: ALLOWED); that role is platform-wide for scholarly content. Admin also verifies guardian links with no evidence and can hear minors' recordings | probe; 0010 header; KNOWN_LIMITATIONS 87 | Medium; owner decision on platform-level vs tenant-level roles and on tenant approval |
| F8 | `homework_requests` has no status: requests cannot be closed, `openRequests` is a lifetime count | 0014 table definition; app.ts:777 | Low |
| F9 | Suspending a membership blocks data through RLS (probe: suspended qari 0 rows) but existing JWTs stay valid for up to one hour and for other institutions | KNOWN_LIMITATIONS 29 | Low, known |

Positive controls confirmed (probes): student cannot approve own homework; guardian cannot approve; safeguarding officer cannot update homework; qari cannot create halaqat; unverified guardian sees nothing; qari cannot edit an assessment.

## 7. Gaps ranked (operations first)

1. Reports and exports (section 3.5): without them the teacher cannot give a parent a periodic account and an administrator cannot evidence anything outside the live screens.
2. Reversibility of administrative actions (F6) and a student lifecycle (3.1): real schools transfer, withdraw and correct data weekly.
3. Halaqah-qari parity (F3): one policy change set (new migration, append-only) would let a circle's teacher assess and update state.
4. Guardian visibility (3.5): the backend already allows attendance, passport, certificates for a verified guardian; the UI does not show them.
5. Hardening (F1, F2, F4, F5): small append-only migration (guard trigger on `is_minor`, split teacher columns from learner columns, audit triggers, consent-purpose enforcement or removal of the unenforced options).
6. Admin oversight (section 5): workload, backlog age, attendance, minors lacking verified guardian or consent.

## 8. Owner decisions (not taken here)

- Whether institutions are self-service or approved, and whether `scholarly_reviewer` stays platform-wide (F7).
- Notification provider, sender identity, consent rules (e-mail/push); invitation flow.
- Retention and deletion policy for children's recordings and learning data; what revocation of consent must erase (F6).
- Whether to add an academic-supervisor role and a student lifecycle model.
- Supervised teacher-guardian channel (currently none by design).
- Report formats and what a parent may see about attendance and assessments (child-data policy).
- Billing and plan model.
- Safeguarding case process and who staffs it.

## 9. Evidence

Files read: CLAUDE.md, PROJECT_STATE.md, IMPLEMENTATION_TRACKER.md, docs/governance/KNOWN_LIMITATIONS.md, docs/PARENT_TEACHER_INTEGRATION.md, docs/PARENT_TEACHER_WORKFLOW.md, docs/07_ROUTE_AND_ROLE_COVERAGE.md, docs/02_FEATURE_GAP_MATRIX.md (role workspaces row), packages/database/migrations/0001, 0006, 0008, 0013-0017 (full), packages/api/src/app.ts (routes and sections cited above), packages/web-vercel/index.html (dashboard, homework, halaqat, recitation, certs, people, adminView, hwToday), packages/api/test/homework.test.ts (assertions), test file lists for api/ and database/.

Commands run:
- `npx tsx --test test/<file>.test.ts` in packages/database: isolation, halaqat, tracks, formation (all pass, counts in section 1). In packages/api: homework, halaqah, admin, kids, plan, journey (counts in section 1). A first attempt at the full `npm test` was SIGKILLed (memory pressure from concurrent runs on the shared machine) and is not counted.
- Three probe scripts (kept in the session scratchpad, not in the repo) using `freshDb()`/`seedWorld()` from packages/database/test/fixtures.ts and `withContext`: homework/column write checks and is_minor flip; halaqah-only qari rights; consent grant rules and guardian reads. Outputs are summarised in sections 2.2, 4 and 6.
- Greps: routes in app.ts, audit triggers in migrations, `ai_analysis` occurrences, "تقرير"/export/print in index.html, UI conditions for attendance and passport.

Not verified: live Supabase/Vercel state, storage bucket policies, microphone and upload in a real browser, offline queue, Safari, any claim that depends on the owner's original section 16/17 wording.

## 10. Open items

- Obtain the owner's section 16/17 text and re-map the tables above to it line by line.
- Re-run the full suites once the machine is quiet and record counts in docs/governance/TEST_RESULTS.md (this document does not edit it).
- Decide F1/F2/F3/F4/F5 fixes as new migrations (0018+): never edit an applied migration.
- Add DB-level tests for homework RLS (today homework RLS is covered only through API tests) and for the probes in section 6.
- Re-run probes against a Supabase branch (not production) before relying on section 4 for the live instance.
- Cross-check with the other TARTIL 13 documents (TARTIL_13_SECURITY.md etc.), which I did not read, to avoid contradictory severity labels.
