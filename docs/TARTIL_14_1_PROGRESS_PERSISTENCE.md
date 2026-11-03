# TARTIL 14.1 item 16: Academy progress persistence (server side)

Status: backend + tests only. **The web UI does not call any of this yet; there is no cross-device sync.** The page still shows "your progress on this device" (local). Do not claim sync until the UI is wired and tested end to end. Migration 0019 is in the repository and NOT applied to production (0018 is not applied either; apply in order).

## What exists

Migration `packages/database/migrations/0019_academy_progress.sql`
- `academy_progress(user_id, kind lesson|scenario|session|activity, ref, program_id, status started|completed, payload jsonb, updated_at)`, unique `(user_id, kind, ref)`.
  - `payload` is checked in the database: flat object, <= 4096 bytes, keys are identifiers, values are numbers / booleans / identifier-shaped strings (no spaces, <= 64 chars) / arrays (<= 30) of those. Free text (including Arabic prose) cannot be stored. The learner's private notebook has no column and is never uploaded.
  - Status cannot go backwards through an update (completed stays completed); only DELETE resets. `updated_at` is server-set. Row budget 2000 per learner.
- `academy_progress_share(student_user_id, viewer_user_id, scope progress|progress_feedback, granted_at, revoked_at)`: explicit, revocable. One active share per viewer; re-granting after a revoke makes a new row. The student alone creates/revokes. The viewer must be an active `qari` / `guardian` / `tenant_admin` in an active institution where the student is an active student; this is re-checked on every read (leaving the institution ends access).
- `academy_teacher_feedback(student_user_id, author_user_id, program_id, note <= 500, next_step_ref)`: written only by a viewer holding a `progress_feedback` share. Readable by the student, the author, and active viewers.
- RLS enabled and FORCED on all three; `app_user` gets only the grants it needs (no UPDATE of `user_id`). No audit trigger on progress rows (no content copied); share changes are audited by id.

API `packages/api/src/academy-progress.ts` (registered in `app.ts`, one line plus an import and two error mappings). All data access goes through `withContext` as `app_user`.
- `GET /me/academy/progress`: rows, per-program descriptive summary, teacher feedback about me, my active shares. `Cache-Control: no-store`.
- `PUT /me/academy/progress`: upsert batch of 1..100 items (Zod `.strict()`, payload rules mirrored; the DB constraint is the authority). A replayed `started` never downgrades a `completed` row.
- `DELETE /me/academy/progress` with `{"confirm":"DELETE_ALL_MY_ACADEMY_PROGRESS"}`: deletes all my rows and revokes all my shares. Teachers' feedback is the author's record and is not deleted here (same rule as formation observations).
- `POST /me/academy/progress/share {viewerEmail, scope?}` (idempotent; changes scope of an active share); `DELETE /me/academy/progress/share/:viewerId` or with body `{viewerUserId}`. Unknown email and ineligible viewer give the same 404 (no account enumeration).
- `GET /i/:inst/academy/students/:id/progress`: only the authorised viewer, only for that institution; 404 otherwise (admin and safeguarding roles get no implicit access). Read-only.
- `POST /i/:inst/academy/students/:id/feedback {programId, note?, nextStepRef?}`: requires the `progress_feedback` scope.
- Rate limiting: the existing general per-IP limiter (app.ts `onRequest`) covers these routes; a test proves a 429. It is the existing best-effort per-process limiter, not a distributed one. No per-user limiter was added.

## Progress model (what the summary returns)
Per program, separate counts: `sessionsCompleted`, `sessionsStarted`, `lessonsCompleted`, `scenariosCompleted`, `activitiesCompleted`, `competenciesPracticed` (distinct ids from `payload.competencies`), `assessmentsSubmitted` (completed rows with `payload.assessment === true`), `inProgress`, `nextRecommendedStep`.
- `sessionsAvailable` is always `null`: the curriculum lives in the client content and the server does not know how many sessions exist. The client must supply that denominator itself.
- `nextRecommendedStep` is only a human teacher's latest suggestion (`next_step_ref`); otherwise `null`. A client-derived suggestion must be labelled as automatic.
- No score, grade, percentage, rank or leaderboard; no view or query compares learners. Completing an activity records activity only; it is not evidence of a trait, faith level or character.

## Tests (run individually)
- `packages/database/test/academyProgress.test.ts`: 12 tests, pass (role safety, FORCE RLS, own-rows only, no access without share for teacher/guardian/admin/safeguarding, constraints, payload size and free-text rejection, row budget, share eligibility, viewer read-only, feedback scope, revocation and membership loss, cross-tenant).
- `packages/api/test/academyProgress.test.ts`: 3 tests, pass.
- `tsc --noEmit` clean for `packages/database` and `packages/api`. `isolation.test.ts` and `hosting-and-import.test.ts` still pass. The full suite was not run by this task.

## Not done / limits
- UI is not wired (`index.html` untouched): no sync is claimed. Local-only progress for visitors must stay clearly separate from an account.
- Tests run on PGlite (superuser-owned schema), not a live Postgres with a separate owner role; verify on the target host with `assertSafeRoles` and the isolation suite after applying 0018 and 0019.
- The guardian of a minor cannot yet grant or revoke a share on the child's behalf (only the learner can). Decide the policy for minors before enabling this for children.
- Merging existing local progress into the account on first sign-in (conflict rules) is not designed here; the PUT is last-write-wins except that completed never regresses.
- Viewer discovery is by email resolved with the service connection (as `/i/:inst/members` does).
- The new data is not yet included in `/me/formation/export` or the formation erase endpoint; use `GET`/`DELETE /me/academy/progress`.
