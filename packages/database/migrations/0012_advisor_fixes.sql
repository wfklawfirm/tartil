-- 0012: Supabase advisor fixes. No behaviour change.
-- (a) pin search_path on two invoker-rights functions (lint 0011)
ALTER FUNCTION app.is_staff(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION app.translation_ayah_in_range() SET search_path = public, pg_temp;
-- (b) covering indexes for foreign keys (lint 0001)
CREATE INDEX IF NOT EXISTS ai_suggestions_created_by_idx ON ai_suggestions (created_by);
CREATE INDEX IF NOT EXISTS ai_suggestions_institution_idx ON ai_suggestions (institution_id);
CREATE INDEX IF NOT EXISTS ai_suggestions_reviewed_by_idx ON ai_suggestions (reviewed_by);
CREATE INDEX IF NOT EXISTS ai_suggestions_student_idx ON ai_suggestions (student_user_id);
CREATE INDEX IF NOT EXISTS attendance_halaqah_student_idx ON attendance (halaqah_id, student_user_id);
CREATE INDEX IF NOT EXISTS attendance_inst_session_idx ON attendance (institution_id, session_id);
CREATE INDEX IF NOT EXISTS certificates_inst_track_idx ON certificates (institution_id, track_id);
CREATE INDEX IF NOT EXISTS certificates_issued_by_idx ON certificates (issued_by);
CREATE INDEX IF NOT EXISTS certificates_student_fk_idx ON certificates (student_user_id);
CREATE INDEX IF NOT EXISTS halaqah_members_inst_halaqah_idx ON halaqah_members (institution_id, halaqah_id);
CREATE INDEX IF NOT EXISTS learning_tracks_created_by_idx ON learning_tracks (created_by);
CREATE INDEX IF NOT EXISTS sanad_entries_reviewed_by_idx ON sanad_entries (reviewed_by);
CREATE INDEX IF NOT EXISTS scholarly_reviews_reviewer_idx ON scholarly_reviews (reviewer_user_id);
CREATE INDEX IF NOT EXISTS track_units_inst_track_idx ON track_units (institution_id, track_id);
CREATE INDEX IF NOT EXISTS unit_progress_inst_track_idx ON unit_progress (institution_id, track_id);
CREATE INDEX IF NOT EXISTS unit_progress_inst_unit_idx ON unit_progress (institution_id, unit_id);
CREATE INDEX IF NOT EXISTS unit_progress_marked_by_idx ON unit_progress (marked_by);
CREATE INDEX IF NOT EXISTS unit_progress_student_fk_idx ON unit_progress (student_user_id);
