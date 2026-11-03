-- 0016: Kids Academy progress (children's learning data). Append-only attempt log owned by the student; a profile row (band, placement) the student edits and a teacher-level override
-- only a teacher/admin may set. Visibility: the student, their teacher (assigned qari / halaqah qari), a VERIFIED guardian of the student, the institution admin. No ranking views.
CREATE TABLE kid_profiles (
  institution_id uuid NOT NULL REFERENCES institutions(id),
  student_user_id uuid NOT NULL REFERENCES users(id),
  band text CHECK (band IN ('a','b','c')),
  placement_level text CHECK (placement_level IN ('new','adv')),
  teacher_level text CHECK (teacher_level IN ('new','adv')),
  teacher_level_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (institution_id, student_user_id)
);
CREATE INDEX kid_profiles_student_fk ON kid_profiles (student_user_id);
CREATE INDEX kid_profiles_by_fk ON kid_profiles (teacher_level_by);
CREATE TABLE kid_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  institution_id uuid NOT NULL REFERENCES institutions(id),
  student_user_id uuid NOT NULL REFERENCES users(id),
  activity text NOT NULL CHECK (activity IN ('rec','match','pair','har')),
  item text NOT NULL CHECK (length(item) BETWEEN 1 AND 8),
  ok boolean NOT NULL,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, student_user_id, occurred_at, activity, item)
);
CREATE INDEX kid_attempts_student_idx ON kid_attempts (student_user_id, occurred_at DESC);
CREATE INDEX kid_attempts_inst_idx ON kid_attempts (institution_id);
ALTER TABLE kid_profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE kid_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE kid_attempts ENABLE ROW LEVEL SECURITY; ALTER TABLE kid_attempts FORCE ROW LEVEL SECURITY;

CREATE FUNCTION app.can_see_kid(p_inst uuid, p_student uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT app.in_context(p_inst) AND (
     p_student = app.current_user_id()
  OR app.is_teacher_of(p_student)
  OR (app.has_role(p_inst, 'guardian') AND app.is_guardian_of(p_student))
  OR app.has_role(p_inst, 'tenant_admin')) $$;

CREATE POLICY kid_profiles_select ON kid_profiles FOR SELECT TO app_user USING (app.can_see_kid(institution_id, student_user_id));
CREATE POLICY kid_profiles_insert ON kid_profiles FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND student_user_id = app.current_user_id() AND app.has_role(institution_id, 'student') AND teacher_level IS NULL);
CREATE POLICY kid_profiles_update_self ON kid_profiles FOR UPDATE TO app_user USING (app.in_context(institution_id) AND student_user_id = app.current_user_id()) WITH CHECK (student_user_id = app.current_user_id());
CREATE POLICY kid_profiles_update_teacher ON kid_profiles FOR UPDATE TO app_user USING (app.in_context(institution_id) AND (app.is_teacher_of(student_user_id) OR app.has_role(institution_id, 'tenant_admin'))) WITH CHECK (app.in_context(institution_id));
CREATE POLICY kid_attempts_select ON kid_attempts FOR SELECT TO app_user USING (app.can_see_kid(institution_id, student_user_id));
CREATE POLICY kid_attempts_insert ON kid_attempts FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND student_user_id = app.current_user_id() AND app.has_role(institution_id, 'student'));
GRANT SELECT, INSERT, UPDATE ON kid_profiles TO app_user;
GRANT SELECT, INSERT ON kid_attempts TO app_user;

-- the student cannot touch the teacher's level; a teacher/admin can touch nothing but the teacher level
CREATE FUNCTION app.kid_profile_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.student_user_id <> OLD.student_user_id OR NEW.institution_id <> OLD.institution_id THEN RAISE EXCEPTION 'kid_profile_immutable'; END IF;
  IF app.current_user_id() = OLD.student_user_id THEN
    IF NEW.teacher_level IS DISTINCT FROM OLD.teacher_level OR NEW.teacher_level_by IS DISTINCT FROM OLD.teacher_level_by THEN RAISE EXCEPTION 'kid_teacher_only'; END IF;
  ELSE
    IF NEW.band IS DISTINCT FROM OLD.band OR NEW.placement_level IS DISTINCT FROM OLD.placement_level THEN RAISE EXCEPTION 'kid_teacher_only'; END IF;
    NEW.teacher_level_by := app.current_user_id();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER kid_profile_guard BEFORE UPDATE ON kid_profiles FOR EACH ROW EXECUTE FUNCTION app.kid_profile_guard();
