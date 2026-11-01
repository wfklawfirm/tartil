-- 0008: session revocation, learning tracks, progress, certificates, human-reviewed AI suggestions, halaqah room token.
ALTER TABLE users ADD COLUMN sessions_valid_after timestamptz NOT NULL DEFAULT 'epoch';
ALTER TABLE halaqah_sessions ADD COLUMN room_token text NOT NULL DEFAULT (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''));

CREATE TABLE learning_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id)
);
CREATE TABLE track_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  track_id uuid NOT NULL,
  position integer NOT NULL CHECK (position > 0),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  kind text NOT NULL CHECK (kind IN ('recitation','memorization','tajweed','review')),
  surah integer CHECK (surah BETWEEN 1 AND 114),
  from_ayah integer CHECK (from_ayah >= 1),
  to_ayah integer CHECK (to_ayah >= from_ayah),
  UNIQUE (institution_id, id),
  UNIQUE (track_id, position),
  FOREIGN KEY (institution_id, track_id) REFERENCES learning_tracks (institution_id, id)
);
CREATE TABLE unit_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  track_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  student_user_id uuid NOT NULL REFERENCES users(id),
  marked_by uuid NOT NULL REFERENCES users(id),
  marked_at timestamptz NOT NULL DEFAULT now(),
  note text,
  UNIQUE (unit_id, student_user_id),
  FOREIGN KEY (institution_id, unit_id) REFERENCES track_units (institution_id, id),
  FOREIGN KEY (institution_id, track_id) REFERENCES learning_tracks (institution_id, id)
);
CREATE TABLE certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  track_id uuid NOT NULL,
  student_user_id uuid NOT NULL REFERENCES users(id),
  issued_by uuid NOT NULL REFERENCES users(id),
  verification_code text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (track_id, student_user_id),
  FOREIGN KEY (institution_id, track_id) REFERENCES learning_tracks (institution_id, id)
);
CREATE TABLE ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  student_user_id uuid NOT NULL REFERENCES users(id),
  submission_id uuid,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  source text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'pending') = (reviewed_by IS NULL))
);

-- A certificate needs a published track whose every unit is marked done for that student.
CREATE FUNCTION app.certificate_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM learning_tracks WHERE id = NEW.track_id AND institution_id = NEW.institution_id AND status = 'published') THEN
    RAISE EXCEPTION 'track_not_published' USING ERRCODE = '23514'; END IF;
  IF EXISTS (SELECT 1 FROM track_units u WHERE u.track_id = NEW.track_id AND NOT EXISTS
      (SELECT 1 FROM unit_progress p WHERE p.unit_id = u.id AND p.student_user_id = NEW.student_user_id)) THEN
    RAISE EXCEPTION 'track_not_complete' USING ERRCODE = '23514'; END IF;
  IF NOT EXISTS (SELECT 1 FROM track_units WHERE track_id = NEW.track_id) THEN
    RAISE EXCEPTION 'track_empty' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER certificate_guard BEFORE INSERT ON certificates FOR EACH ROW EXECUTE FUNCTION app.certificate_guard();

ALTER TABLE learning_tracks ENABLE ROW LEVEL SECURITY; ALTER TABLE learning_tracks FORCE ROW LEVEL SECURITY;
ALTER TABLE track_units     ENABLE ROW LEVEL SECURITY; ALTER TABLE track_units     FORCE ROW LEVEL SECURITY;
ALTER TABLE unit_progress   ENABLE ROW LEVEL SECURITY; ALTER TABLE unit_progress   FORCE ROW LEVEL SECURITY;
ALTER TABLE certificates    ENABLE ROW LEVEL SECURITY; ALTER TABLE certificates    FORCE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions  ENABLE ROW LEVEL SECURITY; ALTER TABLE ai_suggestions  FORCE ROW LEVEL SECURITY;

CREATE FUNCTION app.is_staff(p_inst uuid) RETURNS boolean LANGUAGE sql STABLE AS
$$ SELECT app.has_role(p_inst,'tenant_admin') OR app.has_role(p_inst,'qari') $$;
CREATE FUNCTION app.track_visible(p_track uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT EXISTS (SELECT 1 FROM learning_tracks t WHERE t.id = p_track AND t.institution_id = app.current_institution_id()
     AND (t.status = 'published' OR app.is_staff(t.institution_id))) $$;

CREATE FUNCTION app.has_verified_guardian(p_student uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT EXISTS (SELECT 1 FROM guardian_links g WHERE g.institution_id = app.current_institution_id() AND g.student_user_id = p_student
                  AND g.verified_at IS NOT NULL AND g.revoked_at IS NULL) $$;

CREATE POLICY tracks_select ON learning_tracks FOR SELECT TO app_user USING (app.in_context(institution_id) AND (status = 'published' OR app.is_staff(institution_id)));
CREATE POLICY tracks_insert ON learning_tracks FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND app.is_staff(institution_id) AND created_by = app.current_user_id());
CREATE POLICY tracks_update ON learning_tracks FOR UPDATE TO app_user USING (app.in_context(institution_id) AND app.is_staff(institution_id)) WITH CHECK (app.in_context(institution_id) AND app.is_staff(institution_id));
CREATE POLICY units_select ON track_units FOR SELECT TO app_user USING (app.in_context(institution_id) AND app.track_visible(track_id));
CREATE POLICY units_insert ON track_units FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND app.is_staff(institution_id));
CREATE POLICY units_update ON track_units FOR UPDATE TO app_user USING (app.in_context(institution_id) AND app.is_staff(institution_id)) WITH CHECK (app.in_context(institution_id) AND app.is_staff(institution_id));

CREATE POLICY progress_select ON unit_progress FOR SELECT TO app_user USING (app.in_context(institution_id) AND (
  student_user_id = app.current_user_id() OR app.has_role(institution_id,'tenant_admin') OR app.is_assigned_qari(student_user_id) OR app.is_guardian_of(student_user_id)));
CREATE POLICY progress_insert ON unit_progress FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND marked_by = app.current_user_id() AND app.track_visible(track_id)
  AND (app.is_assigned_qari(student_user_id) OR (app.has_role(institution_id,'tenant_admin') AND app.can_see_user(student_user_id))));

CREATE POLICY certs_select ON certificates FOR SELECT TO app_user USING (app.in_context(institution_id) AND (
  student_user_id = app.current_user_id() OR app.has_role(institution_id,'tenant_admin') OR app.is_assigned_qari(student_user_id) OR app.is_guardian_of(student_user_id)));
CREATE POLICY certs_insert ON certificates FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND app.has_role(institution_id,'tenant_admin') AND issued_by = app.current_user_id() AND app.can_see_user(student_user_id));
CREATE POLICY certs_update ON certificates FOR UPDATE TO app_user USING (app.in_context(institution_id) AND app.has_role(institution_id,'tenant_admin')) WITH CHECK (app.in_context(institution_id) AND app.has_role(institution_id,'tenant_admin'));

-- AI suggestions: students only ever see ACCEPTED ones; staff see their students' pending ones and must review before release.
CREATE POLICY ai_select ON ai_suggestions FOR SELECT TO app_user USING (app.in_context(institution_id) AND (
  (student_user_id = app.current_user_id() AND status = 'accepted') OR (app.is_guardian_of(student_user_id) AND status = 'accepted')
  OR app.has_role(institution_id,'tenant_admin') OR app.is_assigned_qari(student_user_id)));
CREATE POLICY ai_insert ON ai_suggestions FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND created_by = app.current_user_id() AND status = 'pending'
  AND (app.is_assigned_qari(student_user_id) OR app.has_role(institution_id,'tenant_admin')));
CREATE POLICY ai_update ON ai_suggestions FOR UPDATE TO app_user USING (app.in_context(institution_id) AND (app.is_assigned_qari(student_user_id) OR app.has_role(institution_id,'tenant_admin')))
  WITH CHECK (app.in_context(institution_id) AND reviewed_by = app.current_user_id());

GRANT SELECT, INSERT, UPDATE ON learning_tracks, track_units, certificates, ai_suggestions TO app_user;
GRANT SELECT, INSERT ON unit_progress TO app_user;
CREATE TRIGGER audit_tracks   AFTER INSERT OR UPDATE OR DELETE ON learning_tracks FOR EACH ROW EXECUTE FUNCTION app.audit_row();
CREATE TRIGGER audit_progress AFTER INSERT OR UPDATE OR DELETE ON unit_progress   FOR EACH ROW EXECUTE FUNCTION app.audit_row();
CREATE TRIGGER audit_certs    AFTER INSERT OR UPDATE OR DELETE ON certificates    FOR EACH ROW EXECUTE FUNCTION app.audit_row();
CREATE TRIGGER audit_ai       AFTER INSERT OR UPDATE OR DELETE ON ai_suggestions  FOR EACH ROW EXECUTE FUNCTION app.audit_row();
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO app_user;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO app_user;
DO $$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM %I', r);
    END IF;
  END LOOP;
END $$;
