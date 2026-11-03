# Quran homework system

## Types (9)
memorization, revision, reading, makharij, listening, tajweed, recitation, assessment, custom. Memorization / revision / recitation require a passage; the DB enforces it (CHECK). Passage ranges are validated against `quran_reference_counts` (no ayah beyond the surah).

## Status machine
`assigned -> viewed -> in_progress -> pending_review -> approved | needs_retry | excused -> completed`. **Overdue is computed** (`due_at < now()` and the item is still open), not stored. Enforced by trigger `app.hw_status_guard` in the database: only a teacher of the student (assigned qari, or the qari of an active halaqah the student is in) or a tenant admin may approve / request retry / excuse; a student cannot approve their own work; closed items cannot be reopened by the student; `needs_retry` is blocked when the assignment disallows retries; a no-review assignment can be completed by the learner (or verified guardian) directly.
Requested statuses «AI Processing» is not a stored status: machine analysis is attached to the submission as a labelled hypothesis and never gates anything (see HOME_LEARNING_AI_INTEGRATION.md).

## Completion != mastery
`approved/completed` means the teacher accepted the exercise. Mastery stays a human assessment (existing `assessments`). Progress endpoint returns counts with `note: completion_is_not_mastery`. No ranking and no leaderboard exists anywhere in the API or UI.

## Teacher flow (3 steps)
Type -> passage/details (repeat count, minutes, due date, submission mode, review required, retry allowed, instructions) -> recipients (halaqah and/or named students). Save-as-template; start from a template. Differentiated group homework = create one assignment per level group (each is its own assignment; reviews stay per student).
Batch actions: extend due date +7 days; approve all pending in one assignment (each still passes the guard; recommended only after listening).

## API (all under /i/:inst)
POST/GET `homework`; GET `homework/mine[?student=]`; GET `homework/review-queue`; GET `homework/summary`; GET `homework/:rid`; POST `:rid/view|start|submit|review|complete|request`; POST `assignments/:id/extend|approve-pending`; GET `homework/progress/:student`; GET `homework-requests`; templates CRUD.
