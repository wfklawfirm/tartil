-- 0009: personal learner data (hifz & spaced review, quiz attempts). Owned by the user, not by an institution; RLS: user_id = current user only.
CREATE TABLE hifz_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  surah integer NOT NULL CHECK (surah BETWEEN 1 AND 114),
  from_ayah integer NOT NULL CHECK (from_ayah >= 1),
  to_ayah integer NOT NULL CHECK (to_ayah >= from_ayah),
  status text NOT NULL DEFAULT 'learning' CHECK (status IN ('learning','memorized')),
  ease numeric(4,2) NOT NULL DEFAULT 2.50 CHECK (ease BETWEEN 1.30 AND 3.50),
  interval_days integer NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
  reps integer NOT NULL DEFAULT 0 CHECK (reps >= 0),
  lapses integer NOT NULL DEFAULT 0 CHECK (lapses >= 0),
  due_at timestamptz NOT NULL DEFAULT now(),
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, surah, from_ayah, to_ayah)
);
CREATE INDEX hifz_items_due ON hifz_items (user_id, due_at);
CREATE TABLE hifz_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  item_id uuid NOT NULL REFERENCES hifz_items(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 4),
  interval_after integer NOT NULL CHECK (interval_after >= 0),
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hifz_reviews_user ON hifz_reviews (user_id, reviewed_at);
CREATE INDEX hifz_reviews_item ON hifz_reviews (item_id);
CREATE TABLE quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  quiz_key text NOT NULL CHECK (quiz_key ~ '^[a-z0-9_-]{1,60}$'),
  score integer NOT NULL CHECK (score >= 0),
  total integer NOT NULL CHECK (total > 0 AND total <= 200),
  taken_at timestamptz NOT NULL DEFAULT now(),
  CHECK (score <= total)
);
CREATE INDEX quiz_attempts_user ON quiz_attempts (user_id, quiz_key, taken_at);

ALTER TABLE hifz_items    ENABLE ROW LEVEL SECURITY; ALTER TABLE hifz_items    FORCE ROW LEVEL SECURITY;
ALTER TABLE hifz_reviews  ENABLE ROW LEVEL SECURITY; ALTER TABLE hifz_reviews  FORCE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY; ALTER TABLE quiz_attempts FORCE ROW LEVEL SECURITY;

CREATE POLICY hifz_items_select ON hifz_items FOR SELECT TO app_user USING (user_id = app.current_user_id());
CREATE POLICY hifz_items_insert ON hifz_items FOR INSERT TO app_user WITH CHECK (user_id = app.current_user_id());
CREATE POLICY hifz_items_update ON hifz_items FOR UPDATE TO app_user USING (user_id = app.current_user_id()) WITH CHECK (user_id = app.current_user_id());
CREATE POLICY hifz_items_delete ON hifz_items FOR DELETE TO app_user USING (user_id = app.current_user_id());
CREATE POLICY hifz_reviews_select ON hifz_reviews FOR SELECT TO app_user USING (user_id = app.current_user_id());
CREATE POLICY hifz_reviews_insert ON hifz_reviews FOR INSERT TO app_user WITH CHECK (user_id = app.current_user_id()
  AND EXISTS (SELECT 1 FROM hifz_items i WHERE i.id = item_id AND i.user_id = app.current_user_id()));
CREATE POLICY hifz_reviews_delete ON hifz_reviews FOR DELETE TO app_user USING (user_id = app.current_user_id());
CREATE POLICY quiz_select ON quiz_attempts FOR SELECT TO app_user USING (user_id = app.current_user_id());
CREATE POLICY quiz_insert ON quiz_attempts FOR INSERT TO app_user WITH CHECK (user_id = app.current_user_id());

GRANT SELECT, INSERT, DELETE ON hifz_items TO app_user;
GRANT UPDATE (status, ease, interval_days, reps, lapses, due_at, last_reviewed_at) ON hifz_items TO app_user;
GRANT SELECT, INSERT ON hifz_reviews, quiz_attempts TO app_user;
GRANT DELETE ON hifz_reviews TO app_user;
