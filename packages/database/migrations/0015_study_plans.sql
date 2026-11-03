-- 0015: personal study plans (TARTIL 5.0 section 13). A plan is the learner's own inputs (never a grade); it can be shared with an institution's teacher,
-- who approves it or asks for changes. A teacher's decision is a human decision; nothing here is machine-generated.
CREATE TABLE study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  institution_id uuid REFERENCES institutions(id),
  title text NOT NULL CHECK (length(title) BETWEEN 2 AND 120),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND length(payload::text) <= 4000),
  status text NOT NULL DEFAULT 'private' CHECK (status IN ('private','shared','approved','changes_requested')),
  teacher_note text CHECK (teacher_note IS NULL OR length(teacher_note) <= 1000),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'private') = (institution_id IS NULL))
);
CREATE INDEX study_plans_user_idx ON study_plans (user_id, updated_at DESC);
CREATE INDEX study_plans_inst_idx ON study_plans (institution_id, status) WHERE institution_id IS NOT NULL;
CREATE INDEX study_plans_reviewer_fk ON study_plans (reviewed_by);
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY; ALTER TABLE study_plans FORCE ROW LEVEL SECURITY;

CREATE POLICY study_plans_select ON study_plans FOR SELECT TO app_user USING (
  user_id = app.current_user_id()
  OR (institution_id IS NOT NULL AND app.in_context(institution_id) AND (app.is_teacher_of(user_id) OR app.has_role(institution_id, 'tenant_admin'))));
CREATE POLICY study_plans_insert ON study_plans FOR INSERT TO app_user WITH CHECK (user_id = app.current_user_id() AND institution_id IS NULL AND status = 'private');
CREATE POLICY study_plans_update_owner ON study_plans FOR UPDATE TO app_user USING (user_id = app.current_user_id()) WITH CHECK (user_id = app.current_user_id());
CREATE POLICY study_plans_update_teacher ON study_plans FOR UPDATE TO app_user
  USING (institution_id IS NOT NULL AND app.in_context(institution_id) AND app.is_teacher_of(user_id))
  WITH CHECK (institution_id IS NOT NULL AND app.in_context(institution_id) AND app.is_teacher_of(user_id));
CREATE POLICY study_plans_delete ON study_plans FOR DELETE TO app_user USING (user_id = app.current_user_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON study_plans TO app_user;

CREATE FUNCTION app.study_plan_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.user_id <> OLD.user_id THEN RAISE EXCEPTION 'plan_owner_immutable'; END IF;
  IF app.current_user_id() = OLD.user_id THEN
    -- the owner edits content and may share; the owner can never approve, and teacher fields are frozen for the owner
    IF NEW.teacher_note IS DISTINCT FROM OLD.teacher_note OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN RAISE EXCEPTION 'plan_teacher_fields_locked'; END IF;
    IF NEW.status IN ('approved','changes_requested') AND NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'plan_teacher_only'; END IF;
    IF NEW.institution_id IS NOT NULL AND NOT app.has_role(NEW.institution_id, 'student') THEN RAISE EXCEPTION 'plan_share_requires_student'; END IF;
    IF NEW.payload IS DISTINCT FROM OLD.payload AND OLD.status IN ('approved','changes_requested') THEN NEW.status := 'shared'; NEW.reviewed_by := NULL; NEW.reviewed_at := NULL; NEW.teacher_note := NULL; END IF;
  ELSE
    -- a teacher decides on a shared plan; content, owner and institution are frozen
    IF NEW.payload IS DISTINCT FROM OLD.payload OR NEW.title IS DISTINCT FROM OLD.title OR NEW.institution_id IS DISTINCT FROM OLD.institution_id THEN RAISE EXCEPTION 'plan_teacher_only'; END IF;
    IF OLD.status = 'private' OR NEW.status NOT IN ('approved','changes_requested') THEN RAISE EXCEPTION 'plan_illegal_transition'; END IF;
    NEW.reviewed_by := app.current_user_id(); NEW.reviewed_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER study_plan_guard BEFORE UPDATE ON study_plans FOR EACH ROW EXECUTE FUNCTION app.study_plan_guard();
