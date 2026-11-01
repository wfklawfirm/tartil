-- 0006: halaqat (study circles), sessions, attendance, human qari assessments.
-- Assessments are authored by an ASSIGNED human qari only. No machine-generated grade/ruling can be stored here (assessor_kind is fixed to 'human_qari').

CREATE TABLE halaqat (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  name           text NOT NULL CHECK (length(name) BETWEEN 2 AND 200),
  qari_user_id   uuid NOT NULL REFERENCES users(id),
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id)
);
CREATE INDEX halaqat_inst_idx ON halaqat (institution_id);
CREATE INDEX halaqat_qari_idx ON halaqat (qari_user_id);

CREATE TABLE halaqah_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  uuid NOT NULL,
  halaqah_id      uuid NOT NULL,
  student_user_id uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (halaqah_id, student_user_id),
  FOREIGN KEY (institution_id, halaqah_id) REFERENCES halaqat (institution_id, id),
  FOREIGN KEY (institution_id, student_user_id) REFERENCES student_profiles (institution_id, user_id)
);
CREATE INDEX halaqah_members_student_idx ON halaqah_members (institution_id, student_user_id);

CREATE TABLE halaqah_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  halaqah_id     uuid NOT NULL,
  starts_at      timestamptz NOT NULL,
  ends_at        timestamptz NOT NULL,
  topic          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  UNIQUE (institution_id, id),
  FOREIGN KEY (institution_id, halaqah_id) REFERENCES halaqat (institution_id, id)
);
CREATE INDEX halaqah_sessions_halaqah_idx ON halaqah_sessions (institution_id, halaqah_id, starts_at);

CREATE TABLE attendance (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  uuid NOT NULL,
  session_id      uuid NOT NULL,
  halaqah_id      uuid NOT NULL,
  student_user_id uuid NOT NULL,
  status          text NOT NULL CHECK (status IN ('present','absent','late','excused')),
  marked_by       uuid NOT NULL REFERENCES users(id),
  marked_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_user_id),
  FOREIGN KEY (institution_id, session_id) REFERENCES halaqah_sessions (institution_id, id),
  FOREIGN KEY (halaqah_id, student_user_id) REFERENCES halaqah_members (halaqah_id, student_user_id)
);
CREATE INDEX attendance_student_idx ON attendance (institution_id, student_user_id);
CREATE INDEX attendance_marked_by_idx ON attendance (marked_by);

CREATE TABLE assessments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  uuid NOT NULL,
  student_user_id uuid NOT NULL,
  assessor_user_id uuid NOT NULL REFERENCES users(id),
  assessor_kind   text NOT NULL DEFAULT 'human_qari' CHECK (assessor_kind = 'human_qari'),
  submission_id   uuid REFERENCES recitation_submissions(id),
  surah           smallint NOT NULL CHECK (surah BETWEEN 1 AND 114),
  ayah_start      smallint NOT NULL CHECK (ayah_start >= 1),
  ayah_end        smallint NOT NULL,
  -- observation levels per dimension, 1 (needs significant work) .. 4 (secure). Qari's judgement; not a ruling or an ijazah.
  makharij        smallint CHECK (makharij BETWEEN 1 AND 4),
  sifat           smallint CHECK (sifat BETWEEN 1 AND 4),
  ahkam_tajweed   smallint CHECK (ahkam_tajweed BETWEEN 1 AND 4),
  fluency         smallint CHECK (fluency BETWEEN 1 AND 4),
  memorisation    smallint CHECK (memorisation BETWEEN 1 AND 4),
  note            text CHECK (note IS NULL OR length(note) <= 4000),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (ayah_end >= ayah_start),
  CHECK (coalesce(makharij, sifat, ahkam_tajweed, fluency, memorisation) IS NOT NULL),
  FOREIGN KEY (institution_id, student_user_id) REFERENCES student_profiles (institution_id, user_id)
);
CREATE INDEX assessments_student_idx ON assessments (institution_id, student_user_id, created_at DESC);
CREATE INDEX assessments_assessor_idx ON assessments (assessor_user_id);
CREATE INDEX assessments_submission_idx ON assessments (submission_id);

-- Visibility helpers (SECURITY DEFINER so policies can read membership tables without recursion).
CREATE FUNCTION app.is_halaqah_qari(p_halaqah uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT EXISTS (SELECT 1 FROM halaqat h WHERE h.id = p_halaqah AND h.institution_id = app.current_institution_id() AND h.qari_user_id = app.current_user_id()) $$;

CREATE FUNCTION app.is_halaqah_member(p_halaqah uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT EXISTS (SELECT 1 FROM halaqah_members m WHERE m.halaqah_id = p_halaqah AND m.institution_id = app.current_institution_id() AND m.student_user_id = app.current_user_id()) $$;

CREATE FUNCTION app.guardian_sees_halaqah(p_halaqah uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT EXISTS (SELECT 1 FROM halaqah_members m JOIN guardian_links g ON g.institution_id = m.institution_id AND g.student_user_id = m.student_user_id
                  WHERE m.halaqah_id = p_halaqah AND m.institution_id = app.current_institution_id() AND g.guardian_user_id = app.current_user_id()
                    AND g.verified_at IS NOT NULL AND g.revoked_at IS NULL) $$;

CREATE FUNCTION app.can_see_halaqah(p_halaqah uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT app.in_context(app.current_institution_id()) AND (
        app.has_role(app.current_institution_id(), 'tenant_admin') OR app.has_role(app.current_institution_id(), 'safeguarding_officer')
     OR app.is_halaqah_qari(p_halaqah)
     OR (app.has_role(app.current_institution_id(), 'student') AND app.is_halaqah_member(p_halaqah))
     OR (app.has_role(app.current_institution_id(), 'guardian') AND app.guardian_sees_halaqah(p_halaqah))) $$;

CREATE FUNCTION app.is_qari_role() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT app.has_role(app.current_institution_id(), 'qari') $$;

ALTER TABLE halaqat           ENABLE ROW LEVEL SECURITY;
ALTER TABLE halaqah_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE halaqah_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance        ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments       ENABLE ROW LEVEL SECURITY;

-- halaqat: admin creates/edits; the halaqah's qari must hold the qari role in this institution.
CREATE POLICY halaqat_select ON halaqat FOR SELECT TO app_user USING (app.in_context(institution_id) AND app.can_see_halaqah(id));
CREATE POLICY halaqat_insert ON halaqat FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin')
  AND EXISTS (SELECT 1 FROM memberships m WHERE m.institution_id = halaqat.institution_id AND m.user_id = halaqat.qari_user_id AND m.role = 'qari' AND m.status = 'active'));
CREATE POLICY halaqat_update ON halaqat FOR UPDATE TO app_user USING (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin')) WITH CHECK (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin'));

-- members: admin manages; the halaqah's visible audience reads (a student sees only their own row; a guardian only their wards').
CREATE POLICY members_select ON halaqah_members FOR SELECT TO app_user USING (app.in_context(institution_id) AND (
     app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer') OR app.is_halaqah_qari(halaqah_id)
  OR student_user_id = app.current_user_id()
  OR (app.has_role(institution_id, 'guardian') AND app.is_guardian_of(student_user_id))));
CREATE POLICY members_insert ON halaqah_members FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin'));
CREATE POLICY members_delete ON halaqah_members FOR DELETE TO app_user USING (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin'));

CREATE POLICY sessions_select ON halaqah_sessions FOR SELECT TO app_user USING (app.in_context(institution_id) AND app.can_see_halaqah(halaqah_id));
CREATE POLICY sessions_insert ON halaqah_sessions FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND (app.has_role(institution_id, 'tenant_admin') OR app.is_halaqah_qari(halaqah_id)));
CREATE POLICY sessions_update ON halaqah_sessions FOR UPDATE TO app_user USING (app.in_context(institution_id) AND (app.has_role(institution_id, 'tenant_admin') OR app.is_halaqah_qari(halaqah_id)))
  WITH CHECK (app.in_context(institution_id) AND (app.has_role(institution_id, 'tenant_admin') OR app.is_halaqah_qari(halaqah_id)));

-- attendance: marked by the halaqah's qari or an admin; read by the student, their guardian, the qari, admins, safeguarding.
CREATE POLICY attendance_select ON attendance FOR SELECT TO app_user USING (app.in_context(institution_id) AND (
     app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer') OR app.is_halaqah_qari(halaqah_id)
  OR student_user_id = app.current_user_id()
  OR (app.has_role(institution_id, 'guardian') AND app.is_guardian_of(student_user_id))));
CREATE POLICY attendance_insert ON attendance FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND marked_by = app.current_user_id()
  AND (app.has_role(institution_id, 'tenant_admin') OR app.is_halaqah_qari(halaqah_id)));
CREATE POLICY attendance_update ON attendance FOR UPDATE TO app_user USING (app.in_context(institution_id) AND (app.has_role(institution_id, 'tenant_admin') OR app.is_halaqah_qari(halaqah_id)))
  WITH CHECK (app.in_context(institution_id) AND marked_by = app.current_user_id() AND (app.has_role(institution_id, 'tenant_admin') OR app.is_halaqah_qari(halaqah_id)));

-- assessments: ONLY an assigned qari may author one, in their own name; read by student, guardian, the assigned qari, admins, safeguarding.
CREATE POLICY assessments_select ON assessments FOR SELECT TO app_user USING (app.in_context(institution_id) AND (
     student_user_id = app.current_user_id()
  OR (app.has_role(institution_id, 'qari') AND app.is_assigned_qari(student_user_id))
  OR (app.has_role(institution_id, 'guardian') AND app.is_guardian_of(student_user_id))
  OR app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer')));
CREATE POLICY assessments_insert ON assessments FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND assessor_user_id = app.current_user_id()
  AND app.has_role(institution_id, 'qari') AND app.is_assigned_qari(student_user_id));

-- Assessments and attendance are an accountability record: no edit/delete by app_user (corrections are new rows / attendance updates are audited).
GRANT SELECT ON halaqat, halaqah_members, halaqah_sessions, attendance, assessments TO app_user;
GRANT INSERT, UPDATE ON halaqat TO app_user;
GRANT INSERT, DELETE ON halaqah_members TO app_user;
GRANT INSERT, UPDATE ON halaqah_sessions TO app_user;
GRANT INSERT, UPDATE ON attendance TO app_user;
GRANT INSERT ON assessments TO app_user;

CREATE TRIGGER audit_halaqat     AFTER INSERT OR UPDATE OR DELETE ON halaqat          FOR EACH ROW EXECUTE FUNCTION app.audit_row();
CREATE TRIGGER audit_members     AFTER INSERT OR UPDATE OR DELETE ON halaqah_members  FOR EACH ROW EXECUTE FUNCTION app.audit_row();
CREATE TRIGGER audit_attendance  AFTER INSERT OR UPDATE OR DELETE ON attendance       FOR EACH ROW EXECUTE FUNCTION app.audit_row();
CREATE TRIGGER audit_assessments AFTER INSERT OR UPDATE OR DELETE ON assessments      FOR EACH ROW EXECUTE FUNCTION app.audit_row();

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
