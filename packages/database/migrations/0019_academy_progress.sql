-- 0019: Academy progress persistence (TARTIL 14.1 item 16). NOT applied to production; follows 0018 (also not applied).
-- What it stores: which lessons/scenarios/sessions/activities a signed-in learner has started or completed, as ids + small structured facts.
-- What it is NOT: no grade, no score, no ranking, no moral/faith judgement, no free text. "Completed an activity" is a record of activity, never proof of a trait.
-- The learner's private notebook stays on the device and has no column here. A teacher/guardian sees nothing unless the learner grants an explicit, revocable share.

-- Payload shape: flat object; keys are identifiers; values are numbers, booleans, identifier-shaped strings, or arrays (<=30) of those.
-- A string with spaces or Arabic prose does not match the identifier shape, so a free-text note cannot be stored here.
CREATE FUNCTION app.progress_payload_ok(p jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE e record; x jsonb;
BEGIN
  IF p IS NULL OR jsonb_typeof(p) <> 'object' OR length(p::text) > 4096 THEN RETURN false; END IF;
  FOR e IN SELECT key, value FROM jsonb_each(p) LOOP
    IF e.key !~ '^[a-z][A-Za-z0-9_]{0,31}$' THEN RETURN false; END IF;
    IF jsonb_typeof(e.value) IN ('number','boolean') THEN CONTINUE; END IF;
    IF jsonb_typeof(e.value) = 'string' THEN IF app.ref_ok(e.value #>> '{}') THEN CONTINUE; END IF; RETURN false; END IF;
    IF jsonb_typeof(e.value) = 'array' THEN
      IF jsonb_array_length(e.value) > 30 THEN RETURN false; END IF;
      FOR x IN SELECT value FROM jsonb_array_elements(e.value) LOOP
        IF jsonb_typeof(x) = 'number' THEN CONTINUE; END IF;
        IF jsonb_typeof(x) = 'string' AND app.ref_ok(x #>> '{}') THEN CONTINUE; END IF;
        RETURN false;
      END LOOP;
      CONTINUE;
    END IF;
    RETURN false;
  END LOOP;
  RETURN true;
END $$;

CREATE TABLE academy_progress (
  user_id    uuid NOT NULL REFERENCES users(id),
  kind       text NOT NULL CHECK (kind IN ('lesson','scenario','session','activity')),
  ref        text NOT NULL CHECK (app.ref_ok(ref)),
  program_id text NOT NULL CHECK (app.ref_ok(program_id)),
  status     text NOT NULL CHECK (status IN ('started','completed')),
  payload    jsonb NOT NULL DEFAULT '{}'::jsonb CONSTRAINT academy_progress_payload_ok CHECK (app.progress_payload_ok(payload)),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, ref)
);
CREATE INDEX academy_progress_program_idx ON academy_progress (user_id, program_id);

-- Explicit, revocable permission from a learner to one viewer (teacher / guardian / admin). Re-granting after a revoke creates a new row.
CREATE TABLE academy_progress_share (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id uuid NOT NULL REFERENCES users(id),
  viewer_user_id  uuid NOT NULL REFERENCES users(id),
  scope           text NOT NULL DEFAULT 'progress' CHECK (scope IN ('progress','progress_feedback')),
  granted_at      timestamptz NOT NULL DEFAULT now(),
  revoked_at      timestamptz,
  CHECK (student_user_id <> viewer_user_id)
);
CREATE UNIQUE INDEX academy_share_active_uq ON academy_progress_share (student_user_id, viewer_user_id) WHERE revoked_at IS NULL;
CREATE INDEX academy_share_viewer_idx ON academy_progress_share (viewer_user_id) WHERE revoked_at IS NULL;

-- Teacher feedback + suggested next step: structured and short, written only by a viewer holding an active 'progress_feedback' share.
CREATE TABLE academy_teacher_feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id uuid NOT NULL REFERENCES users(id),
  author_user_id  uuid NOT NULL REFERENCES users(id),
  program_id      text NOT NULL CHECK (app.ref_ok(program_id)),
  note            text CHECK (note IS NULL OR length(note) <= 500),
  next_step_ref   text CHECK (next_step_ref IS NULL OR app.ref_ok(next_step_ref)),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (note IS NOT NULL OR next_step_ref IS NOT NULL)
);
CREATE INDEX academy_feedback_student_idx ON academy_teacher_feedback (student_user_id, created_at DESC);
CREATE INDEX academy_feedback_author_idx ON academy_teacher_feedback (author_user_id);

-- The viewer must share an ACTIVE institution with the student and hold a viewing role there. Used when granting AND on every read (a viewer who later
-- leaves the institution loses access even though the share row remains).
CREATE FUNCTION app.academy_viewer_eligible(p_student uuid, p_viewer uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT EXISTS (SELECT 1 FROM memberships mv JOIN memberships ms ON ms.institution_id = mv.institution_id
                  JOIN institutions i ON i.id = mv.institution_id
                  WHERE mv.user_id = p_viewer AND mv.status = 'active' AND mv.role IN ('qari','guardian','tenant_admin')
                    AND ms.user_id = p_student AND ms.status = 'active' AND ms.role = 'student' AND i.status = 'active') $$;
-- The current user's active share scope over a student, or NULL.
CREATE FUNCTION app.academy_share_scope(p_student uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT s.scope FROM academy_progress_share s
   WHERE s.student_user_id = p_student AND s.viewer_user_id = app.current_user_id() AND s.revoked_at IS NULL
     AND app.academy_viewer_eligible(p_student, s.viewer_user_id) LIMIT 1 $$;

-- The student is an active student of THIS institution and the current user is an eligible viewer in it (route-level institution check; RLS on the data itself is the share).
CREATE FUNCTION app.academy_student_in(p_student uuid, p_inst uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT app.in_context(p_inst) AND EXISTS (SELECT 1 FROM memberships ms WHERE ms.institution_id = p_inst AND ms.user_id = p_student AND ms.status = 'active' AND ms.role = 'student') $$;

-- Row budget per learner (ids only, so this is generous); stops a runaway client.
CREATE FUNCTION app.academy_progress_budget() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF (SELECT count(*) FROM academy_progress WHERE user_id = NEW.user_id) >= 2000 THEN RAISE EXCEPTION 'academy_progress_budget_exceeded' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER academy_progress_budget BEFORE INSERT ON academy_progress FOR EACH ROW EXECUTE FUNCTION app.academy_progress_budget();
-- Status never goes backwards through an update (completed stays completed); only DELETE resets. updated_at is server-controlled.
CREATE FUNCTION app.academy_progress_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'completed' THEN NEW.status := 'completed'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER academy_progress_guard BEFORE UPDATE ON academy_progress FOR EACH ROW EXECUTE FUNCTION app.academy_progress_guard();

ALTER TABLE academy_progress ENABLE ROW LEVEL SECURITY;          ALTER TABLE academy_progress FORCE ROW LEVEL SECURITY;
ALTER TABLE academy_progress_share ENABLE ROW LEVEL SECURITY;    ALTER TABLE academy_progress_share FORCE ROW LEVEL SECURITY;
ALTER TABLE academy_teacher_feedback ENABLE ROW LEVEL SECURITY;  ALTER TABLE academy_teacher_feedback FORCE ROW LEVEL SECURITY;

CREATE POLICY academy_progress_select ON academy_progress FOR SELECT TO app_user USING (user_id = app.current_user_id() OR app.academy_share_scope(user_id) IS NOT NULL);
CREATE POLICY academy_progress_insert ON academy_progress FOR INSERT TO app_user WITH CHECK (user_id = app.current_user_id());
CREATE POLICY academy_progress_update ON academy_progress FOR UPDATE TO app_user USING (user_id = app.current_user_id()) WITH CHECK (user_id = app.current_user_id());
CREATE POLICY academy_progress_delete ON academy_progress FOR DELETE TO app_user USING (user_id = app.current_user_id());

CREATE POLICY academy_share_select ON academy_progress_share FOR SELECT TO app_user USING (student_user_id = app.current_user_id() OR viewer_user_id = app.current_user_id());
CREATE POLICY academy_share_insert ON academy_progress_share FOR INSERT TO app_user WITH CHECK (
  student_user_id = app.current_user_id() AND revoked_at IS NULL AND app.academy_viewer_eligible(student_user_id, viewer_user_id));
CREATE POLICY academy_share_update ON academy_progress_share FOR UPDATE TO app_user USING (student_user_id = app.current_user_id()) WITH CHECK (student_user_id = app.current_user_id());

CREATE POLICY academy_feedback_select ON academy_teacher_feedback FOR SELECT TO app_user USING (
  student_user_id = app.current_user_id() OR author_user_id = app.current_user_id() OR app.academy_share_scope(student_user_id) IS NOT NULL);
CREATE POLICY academy_feedback_insert ON academy_teacher_feedback FOR INSERT TO app_user WITH CHECK (
  author_user_id = app.current_user_id() AND app.academy_share_scope(student_user_id) = 'progress_feedback');

GRANT SELECT, INSERT, DELETE ON academy_progress TO app_user;        GRANT UPDATE (program_id, status, payload) ON academy_progress TO app_user;
GRANT SELECT, INSERT ON academy_progress_share TO app_user;          GRANT UPDATE (scope, revoked_at) ON academy_progress_share TO app_user;
GRANT SELECT, INSERT ON academy_teacher_feedback TO app_user;
-- No audit trigger on academy_progress (no body leaves the table); share changes are consent events and are audited by id (audit_row reads no institution: NULL).
CREATE TRIGGER audit_academy_share AFTER INSERT OR UPDATE ON academy_progress_share FOR EACH ROW EXECUTE FUNCTION app.audit_row();
