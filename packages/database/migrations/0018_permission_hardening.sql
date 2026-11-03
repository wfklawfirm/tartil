-- 0018: closes three DB-level permission gaps found in the TARTIL 13 audit (all were unreachable through the API today; the database must not rely on that).
-- Guards run as the invoking role (SECURITY INVOKER) so current_user = 'app_user' for tenant-API sessions; owner/service sessions (appointments, migrations) are unaffected.

-- 1. A tenant admin (app_user) can no longer grant reviewer roles to anyone, themselves included. Appointments are an owner/service decision.
CREATE FUNCTION app.membership_role_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user = 'app_user' AND NEW.role IN ('scholarly_reviewer','pedagogical_reviewer','child_protection_reviewer')
     AND (TG_OP = 'INSERT' OR NEW.role IS DISTINCT FROM OLD.role) THEN
    RAISE EXCEPTION 'reviewer_roles_are_appointed_by_the_owner' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER membership_role_guard BEFORE INSERT OR UPDATE OF role ON memberships FOR EACH ROW EXECUTE FUNCTION app.membership_role_guard();

-- 2. is_minor can only be raised through the tenant API, never lowered (lowering removes the guardian-consent requirement). Lowering is an owner/service action with evidence.
CREATE FUNCTION app.student_minor_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user = 'app_user' AND OLD.is_minor AND NOT NEW.is_minor THEN
    RAISE EXCEPTION 'minor_flag_cannot_be_lowered_here' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER student_minor_guard BEFORE UPDATE OF is_minor ON student_profiles FOR EACH ROW EXECUTE FUNCTION app.student_minor_guard();

-- 3. Only the teacher/admin can write the teacher's note and the review timestamp on a homework recipient row.
CREATE FUNCTION app.hw_review_fields_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user = 'app_user' AND (NEW.teacher_note IS DISTINCT FROM OLD.teacher_note OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at)
     AND NOT (app.has_role(NEW.institution_id, 'tenant_admin') OR app.is_teacher_of(NEW.student_user_id)) THEN
    RAISE EXCEPTION 'homework_review_fields_teacher_only' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER hw_review_fields_guard BEFORE UPDATE OF teacher_note, reviewed_at ON homework_recipients FOR EACH ROW EXECUTE FUNCTION app.hw_review_fields_guard();
