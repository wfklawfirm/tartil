# Assignment backend schema (migration 0014, append-only)

Tables: `homework_assignments` (what), `homework_recipients` (who + status; unique per assignment/student), `homework_submissions` (done|audio, optional `recitation_submission_id`, optional `ai_hypothesis` jsonb), `homework_reviews` (append-only decisions), `homework_requests` (obstacle / extension), `homework_templates` (owner-private).
Reuses, does not duplicate: `halaqat`, `halaqah_members`, `student_profiles`, `guardian_links`, `qari_assignments`, `recitation_submissions` (audio, consent trigger), `assessments` (mastery).
Helpers: `app.is_halaqah_qari_of(student)`, `app.is_teacher_of(student)`. `app.can_see_user` extended (halaqah qari sees members of own circle). `recitation_submissions` select policy now includes the halaqah qari; insert policy allows a verified guardian to record for their child (the minors' consent trigger still applies).
Security: RLS enabled + FORCED on all six tables; least-privilege column grants (`UPDATE (status, teacher_note, viewed_at, submitted_at, reviewed_at)`); status guard trigger; audit triggers on assignments, recipients, reviews. A subtle bug found and fixed by tests: an unqualified `id` inside an `EXISTS` subquery resolved to the inner table.
Verified: 2 API tests (journey + edge cases), existing database suite, real-browser E2E.
