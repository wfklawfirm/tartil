-- 0010: scholarly review workspace. Active scholarly_reviewers (any institution) may read every scholarly item and move it along the guarded workflow.
-- The DB trigger from 0002 still enforces: legal transitions only, APPROVED needs an active scholarly_reviewer as approved_by, PUBLISHED needs licence_cleared (owner decision, not settable here).
CREATE FUNCTION app.is_scholar() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = app.current_user_id() AND m.role = 'scholarly_reviewer' AND m.status = 'active') $$;

CREATE TABLE scholarly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES scholarly_items(id),
  reviewer_user_id uuid NOT NULL REFERENCES users(id),
  from_state text NOT NULL,
  to_state text NOT NULL,
  note text CHECK (note IS NULL OR length(note) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scholarly_reviews_item ON scholarly_reviews (item_id, created_at);
ALTER TABLE scholarly_reviews ENABLE ROW LEVEL SECURITY; ALTER TABLE scholarly_reviews FORCE ROW LEVEL SECURITY;
CREATE POLICY sreviews_select ON scholarly_reviews FOR SELECT TO app_user USING (app.is_scholar());
CREATE POLICY sreviews_insert ON scholarly_reviews FOR INSERT TO app_user WITH CHECK (app.is_scholar() AND reviewer_user_id = app.current_user_id());

CREATE POLICY scholarly_read_reviewers ON scholarly_items FOR SELECT TO app_user USING (app.is_scholar());
CREATE POLICY scholarly_update_reviewers ON scholarly_items FOR UPDATE TO app_user USING (app.is_scholar()) WITH CHECK (app.is_scholar());

GRANT SELECT, INSERT ON scholarly_reviews TO app_user;
GRANT UPDATE (state, approved_by) ON scholarly_items TO app_user;
GRANT EXECUTE ON FUNCTION app.is_scholar() TO app_user;

-- Sanad register: a learner's SELF-DECLARED chain of teachers per riwayah. The platform does not issue ijazah and does not verify by itself;
-- only an active scholarly_reviewer (never the owner of the entry) can mark an entry verified or rejected, with a note.
CREATE TABLE sanad_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  riwayah text NOT NULL CHECK (length(riwayah) BETWEEN 2 AND 60),
  teacher_name text NOT NULL CHECK (length(teacher_name) BETWEEN 2 AND 200),
  year_hijri integer CHECK (year_hijri BETWEEN 1 AND 1600),
  document_note text CHECK (document_note IS NULL OR length(document_note) <= 1000),
  status text NOT NULL DEFAULT 'declared' CHECK (status IN ('declared','verified','rejected')),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  review_note text CHECK (review_note IS NULL OR length(review_note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'declared') = (reviewed_by IS NULL)),
  CHECK (reviewed_by IS NULL OR reviewed_by <> user_id)
);
CREATE INDEX sanad_user ON sanad_entries (user_id, created_at);
ALTER TABLE sanad_entries ENABLE ROW LEVEL SECURITY; ALTER TABLE sanad_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY sanad_select ON sanad_entries FOR SELECT TO app_user USING (user_id = app.current_user_id() OR app.is_scholar());
CREATE POLICY sanad_insert ON sanad_entries FOR INSERT TO app_user WITH CHECK (user_id = app.current_user_id() AND status = 'declared');
CREATE POLICY sanad_update ON sanad_entries FOR UPDATE TO app_user USING (app.is_scholar() AND user_id <> app.current_user_id()) WITH CHECK (app.is_scholar() AND reviewed_by = app.current_user_id());
GRANT SELECT ON sanad_entries TO app_user;
GRANT INSERT (user_id, riwayah, teacher_name, year_hijri, document_note) ON sanad_entries TO app_user;
GRANT UPDATE (status, reviewed_by, reviewed_at, review_note) ON sanad_entries TO app_user;
