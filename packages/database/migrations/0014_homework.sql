-- 0014: Tartil Homework & Home Practice (TARTIL 5.1). Reuses halaqat, halaqah_members, guardian_links, qari_assignments and recitation_submissions
-- (audio + minors' consent trigger stay in ONE place). "Completed the exercise" is never "mastered the skill": approval is a human teacher decision,
-- machine analysis is stored only as an attached, labelled hypothesis and never changes status.

-- A teacher of a student = the assigned qari OR the qari of an active halaqah the student belongs to.
CREATE FUNCTION app.is_halaqah_qari_of(p_student uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT EXISTS (SELECT 1 FROM halaqat h JOIN halaqah_members m ON m.institution_id = h.institution_id AND m.halaqah_id = h.id
                  WHERE h.institution_id = app.current_institution_id() AND h.qari_user_id = app.current_user_id() AND h.status = 'active' AND m.student_user_id = p_student) $$;
CREATE FUNCTION app.is_teacher_of(p_student uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT app.has_role(app.current_institution_id(), 'qari') AND (app.is_assigned_qari(p_student) OR app.is_halaqah_qari_of(p_student)) $$;

-- A halaqah's qari may see the members of their own circle (names), not only individually assigned students. Same function, one extra clause.
CREATE OR REPLACE FUNCTION app.can_see_user(p_target uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT app.in_context(app.current_institution_id())
   AND EXISTS (SELECT 1 FROM memberships tm WHERE tm.user_id = p_target AND tm.institution_id = app.current_institution_id() AND tm.status = 'active')
   AND ( app.has_role(app.current_institution_id(), 'tenant_admin')
      OR app.has_role(app.current_institution_id(), 'safeguarding_officer')
      OR (app.has_role(app.current_institution_id(), 'qari') AND (app.is_assigned_qari(p_target) OR app.is_halaqah_qari_of(p_target)))
      OR (app.has_role(app.current_institution_id(), 'guardian') AND app.is_guardian_of(p_target))
      OR (app.has_role(app.current_institution_id(), 'student') AND (
            EXISTS (SELECT 1 FROM qari_assignments qa WHERE qa.institution_id = app.current_institution_id() AND qa.student_user_id = app.current_user_id() AND qa.qari_user_id = p_target AND qa.active)
         OR EXISTS (SELECT 1 FROM guardian_links g WHERE g.institution_id = app.current_institution_id() AND g.student_user_id = app.current_user_id() AND g.guardian_user_id = p_target AND g.verified_at IS NOT NULL AND g.revoked_at IS NULL)))
   ) $$;

-- A halaqah's own qari must also be able to open the audio their students submit (previously only the individually assigned qari could).
DROP POLICY submissions_select ON recitation_submissions;
CREATE POLICY submissions_select ON recitation_submissions FOR SELECT TO app_user USING (
  app.in_context(institution_id) AND (student_user_id = app.current_user_id()
    OR app.is_teacher_of(student_user_id)
    OR (app.has_role(institution_id, 'guardian') AND app.is_guardian_of(student_user_id))
    OR app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer')));
-- A verified guardian may record on behalf of their own child (guardian-managed access); the minors' consent trigger still applies.
DROP POLICY submissions_insert ON recitation_submissions;
CREATE POLICY submissions_insert ON recitation_submissions FOR INSERT TO app_user WITH CHECK (
  app.in_context(institution_id) AND (
    (student_user_id = app.current_user_id() AND app.has_role(institution_id, 'student'))
    OR (app.has_role(institution_id, 'guardian') AND app.is_guardian_of(student_user_id))));

CREATE TABLE homework_assignments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  halaqah_id     uuid,
  created_by     uuid NOT NULL REFERENCES users(id),
  kind           text NOT NULL CHECK (kind IN ('memorization','revision','reading','makharij','listening','tajweed','recitation','assessment','custom')),
  title          text NOT NULL CHECK (length(title) BETWEEN 2 AND 200),
  instructions   text CHECK (length(instructions) <= 2000),
  surah          smallint CHECK (surah BETWEEN 1 AND 114),
  from_ayah      integer CHECK (from_ayah >= 1),
  to_ayah        integer,
  repeat_count   smallint NOT NULL DEFAULT 3 CHECK (repeat_count BETWEEN 1 AND 100),
  est_minutes    smallint NOT NULL DEFAULT 10 CHECK (est_minutes BETWEEN 1 AND 240),
  due_at         timestamptz,
  submission_mode text NOT NULL DEFAULT 'mark_done' CHECK (submission_mode IN ('mark_done','audio')),
  requires_review boolean NOT NULL DEFAULT true,
  allow_retry    boolean NOT NULL DEFAULT true,
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK ((surah IS NULL AND from_ayah IS NULL AND to_ayah IS NULL) OR (surah IS NOT NULL AND from_ayah IS NOT NULL AND to_ayah >= from_ayah)),
  CHECK (kind NOT IN ('memorization','revision','recitation') OR surah IS NOT NULL),
  UNIQUE (institution_id, id),
  FOREIGN KEY (institution_id, halaqah_id) REFERENCES halaqat (institution_id, id)
);
CREATE INDEX hw_assign_inst_idx ON homework_assignments (institution_id, created_at DESC);
CREATE INDEX hw_assign_creator_idx ON homework_assignments (created_by);

CREATE TABLE homework_recipients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  uuid NOT NULL,
  assignment_id   uuid NOT NULL,
  student_user_id uuid NOT NULL,
  status          text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','viewed','in_progress','pending_review','needs_retry','approved','completed','excused')),
  teacher_note    text CHECK (length(teacher_note) <= 1000),
  viewed_at       timestamptz, submitted_at timestamptz, reviewed_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_user_id),
  UNIQUE (institution_id, id),
  FOREIGN KEY (institution_id, assignment_id) REFERENCES homework_assignments (institution_id, id),
  FOREIGN KEY (institution_id, student_user_id) REFERENCES student_profiles (institution_id, user_id)
);
CREATE INDEX hw_recip_student_idx ON homework_recipients (institution_id, student_user_id, status);
CREATE INDEX hw_recip_assign_idx ON homework_recipients (assignment_id);

CREATE TABLE homework_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  uuid NOT NULL,
  recipient_id    uuid NOT NULL,
  student_user_id uuid NOT NULL,
  submitted_by    uuid NOT NULL REFERENCES users(id),
  kind            text NOT NULL CHECK (kind IN ('done','audio')),
  recitation_submission_id uuid REFERENCES recitation_submissions(id),
  note            text CHECK (length(note) <= 500),
  ai_hypothesis   jsonb,                       -- optional machine analysis summary, copied server-side from the student's own attempt; never a grade
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'audio' OR recitation_submission_id IS NOT NULL),
  FOREIGN KEY (institution_id, recipient_id) REFERENCES homework_recipients (institution_id, id)
);
CREATE INDEX hw_sub_recipient_idx ON homework_submissions (recipient_id, created_at DESC);

CREATE TABLE homework_reviews (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   uuid NOT NULL,
  recipient_id     uuid NOT NULL,
  submission_id    uuid REFERENCES homework_submissions(id),
  reviewer_user_id uuid NOT NULL REFERENCES users(id),
  decision         text NOT NULL CHECK (decision IN ('approved','needs_retry','excused')),
  note             text CHECK (length(note) <= 1000),
  created_at       timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (institution_id, recipient_id) REFERENCES homework_recipients (institution_id, id)
);
CREATE INDEX hw_review_recipient_idx ON homework_reviews (recipient_id, created_at DESC);

CREATE TABLE homework_requests (               -- guardian/student: report an obstacle or ask for more time
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  uuid NOT NULL,
  recipient_id    uuid NOT NULL,
  requester_user_id uuid NOT NULL REFERENCES users(id),
  kind            text NOT NULL CHECK (kind IN ('obstacle','extension')),
  note            text CHECK (length(note) <= 500),
  created_at      timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (institution_id, recipient_id) REFERENCES homework_recipients (institution_id, id)
);

CREATE TABLE homework_templates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  owner_user_id  uuid NOT NULL REFERENCES users(id),
  name           text NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  payload        jsonb NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ---- legal status transitions and who may make them (RLS decides visibility; this decides the state machine) ----
CREATE FUNCTION app.hw_status_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_teacher boolean; v_admin boolean; v_req boolean;
BEGIN
  IF NEW.status = OLD.status AND NEW.status NOT IN ('approved','needs_retry','completed') THEN RETURN NEW; END IF;
  v_admin := app.has_role(NEW.institution_id, 'tenant_admin');
  v_teacher := v_admin OR app.is_teacher_of(NEW.student_user_id);
  SELECT requires_review INTO v_req FROM homework_assignments WHERE id = NEW.assignment_id;
  IF NEW.status IN ('approved','needs_retry','excused') THEN
    IF NOT v_teacher THEN RAISE EXCEPTION 'homework_teacher_only' USING ERRCODE = '42501'; END IF;
    IF NEW.status = 'excused' THEN RETURN NEW; END IF;
    IF OLD.status <> 'pending_review' THEN RAISE EXCEPTION 'homework_illegal_transition' USING ERRCODE = '23514'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.status = 'completed' THEN
    IF v_teacher THEN RETURN NEW; END IF;
    IF v_req THEN RAISE EXCEPTION 'homework_review_required' USING ERRCODE = '23514'; END IF;
    RETURN NEW;
  END IF;
  IF OLD.status IN ('approved','completed','excused') AND NOT v_teacher THEN RAISE EXCEPTION 'homework_closed' USING ERRCODE = '23514'; END IF;
  IF NEW.status = 'viewed' AND OLD.status <> 'assigned' THEN RAISE EXCEPTION 'homework_illegal_transition' USING ERRCODE = '23514'; END IF;
  IF NEW.status = 'in_progress' AND OLD.status NOT IN ('assigned','viewed','needs_retry') THEN RAISE EXCEPTION 'homework_illegal_transition' USING ERRCODE = '23514'; END IF;
  IF NEW.status = 'pending_review' AND NOT v_req THEN RAISE EXCEPTION 'homework_illegal_transition' USING ERRCODE = '23514'; END IF;
  IF NEW.status = 'pending_review' AND OLD.status = 'needs_retry' AND NOT (SELECT allow_retry FROM homework_assignments WHERE id = NEW.assignment_id) THEN RAISE EXCEPTION 'homework_retry_not_allowed' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER hw_status_guard BEFORE UPDATE OF status ON homework_recipients FOR EACH ROW EXECUTE FUNCTION app.hw_status_guard();

-- ---- RLS ----
ALTER TABLE homework_assignments ENABLE ROW LEVEL SECURITY; ALTER TABLE homework_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE homework_recipients  ENABLE ROW LEVEL SECURITY; ALTER TABLE homework_recipients  FORCE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY; ALTER TABLE homework_submissions FORCE ROW LEVEL SECURITY;
ALTER TABLE homework_reviews     ENABLE ROW LEVEL SECURITY; ALTER TABLE homework_reviews     FORCE ROW LEVEL SECURITY;
ALTER TABLE homework_requests    ENABLE ROW LEVEL SECURITY; ALTER TABLE homework_requests    FORCE ROW LEVEL SECURITY;
ALTER TABLE homework_templates   ENABLE ROW LEVEL SECURITY; ALTER TABLE homework_templates   FORCE ROW LEVEL SECURITY;

CREATE POLICY hw_recip_select ON homework_recipients FOR SELECT TO app_user USING (app.in_context(institution_id) AND (
  student_user_id = app.current_user_id() OR app.is_teacher_of(student_user_id)
  OR (app.has_role(institution_id, 'guardian') AND app.is_guardian_of(student_user_id))
  OR app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer')));
CREATE POLICY hw_recip_insert ON homework_recipients FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id)
  AND (app.is_teacher_of(student_user_id) OR app.has_role(institution_id, 'tenant_admin'))
  AND EXISTS (SELECT 1 FROM homework_assignments a WHERE a.id = assignment_id AND a.created_by = app.current_user_id()));
CREATE POLICY hw_recip_update ON homework_recipients FOR UPDATE TO app_user
  USING (app.in_context(institution_id) AND (student_user_id = app.current_user_id() OR app.is_teacher_of(student_user_id)
    OR (app.has_role(institution_id, 'guardian') AND app.is_guardian_of(student_user_id)) OR app.has_role(institution_id, 'tenant_admin')))
  WITH CHECK (app.in_context(institution_id));

CREATE POLICY hw_assign_select ON homework_assignments FOR SELECT TO app_user USING (app.in_context(institution_id) AND (
  created_by = app.current_user_id() OR app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer')
  OR EXISTS (SELECT 1 FROM homework_recipients r WHERE r.assignment_id = homework_assignments.id)));   -- recipients are already filtered by their own policy
CREATE POLICY hw_assign_insert ON homework_assignments FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND created_by = app.current_user_id()
  AND (app.has_role(institution_id, 'qari') OR app.has_role(institution_id, 'tenant_admin')));
CREATE POLICY hw_assign_update ON homework_assignments FOR UPDATE TO app_user USING (app.in_context(institution_id) AND (created_by = app.current_user_id() OR app.has_role(institution_id, 'tenant_admin')))
  WITH CHECK (app.in_context(institution_id));

CREATE POLICY hw_sub_select ON homework_submissions FOR SELECT TO app_user USING (app.in_context(institution_id) AND (
  student_user_id = app.current_user_id() OR app.is_teacher_of(student_user_id)
  OR (app.has_role(institution_id, 'guardian') AND app.is_guardian_of(student_user_id))
  OR app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer')));
CREATE POLICY hw_sub_insert ON homework_submissions FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND submitted_by = app.current_user_id()
  AND (student_user_id = app.current_user_id() OR (app.has_role(institution_id, 'guardian') AND app.is_guardian_of(student_user_id)))
  AND EXISTS (SELECT 1 FROM homework_recipients r WHERE r.id = recipient_id AND r.student_user_id = homework_submissions.student_user_id));

CREATE POLICY hw_review_select ON homework_reviews FOR SELECT TO app_user USING (app.in_context(institution_id) AND EXISTS (SELECT 1 FROM homework_recipients r WHERE r.id = recipient_id));
CREATE POLICY hw_review_insert ON homework_reviews FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND reviewer_user_id = app.current_user_id()
  AND EXISTS (SELECT 1 FROM homework_recipients r WHERE r.id = recipient_id AND (app.is_teacher_of(r.student_user_id) OR app.has_role(r.institution_id, 'tenant_admin'))));

CREATE POLICY hw_req_select ON homework_requests FOR SELECT TO app_user USING (app.in_context(institution_id) AND EXISTS (SELECT 1 FROM homework_recipients r WHERE r.id = recipient_id));
CREATE POLICY hw_req_insert ON homework_requests FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND requester_user_id = app.current_user_id()
  AND EXISTS (SELECT 1 FROM homework_recipients r WHERE r.id = recipient_id AND (r.student_user_id = app.current_user_id() OR (app.has_role(r.institution_id, 'guardian') AND app.is_guardian_of(r.student_user_id)))));

CREATE POLICY hw_tpl_select ON homework_templates FOR SELECT TO app_user USING (app.in_context(institution_id) AND owner_user_id = app.current_user_id());
CREATE POLICY hw_tpl_insert ON homework_templates FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND owner_user_id = app.current_user_id()
  AND (app.has_role(institution_id, 'qari') OR app.has_role(institution_id, 'tenant_admin')));
CREATE POLICY hw_tpl_delete ON homework_templates FOR DELETE TO app_user USING (app.in_context(institution_id) AND owner_user_id = app.current_user_id());

GRANT SELECT, INSERT ON homework_assignments TO app_user; GRANT UPDATE (status, due_at, title, instructions) ON homework_assignments TO app_user;
GRANT SELECT, INSERT ON homework_recipients TO app_user;  GRANT UPDATE (status, teacher_note, viewed_at, submitted_at, reviewed_at) ON homework_recipients TO app_user;
GRANT SELECT, INSERT ON homework_submissions, homework_reviews, homework_requests TO app_user;
GRANT SELECT, INSERT, DELETE ON homework_templates TO app_user;

CREATE TRIGGER audit_hw_assign  AFTER INSERT OR UPDATE OR DELETE ON homework_assignments FOR EACH ROW EXECUTE FUNCTION app.audit_row();
CREATE TRIGGER audit_hw_recip   AFTER INSERT OR UPDATE OR DELETE ON homework_recipients  FOR EACH ROW EXECUTE FUNCTION app.audit_row();
CREATE TRIGGER audit_hw_review  AFTER INSERT OR UPDATE OR DELETE ON homework_reviews     FOR EACH ROW EXECUTE FUNCTION app.audit_row();
