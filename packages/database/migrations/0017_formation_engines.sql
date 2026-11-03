-- 0017: Human Formation engines (BLUEPRINT D6/D7/D9): source records with a three-role review gate, learner-private reflection log,
-- life-mission progress, scenario runs, and descriptive formative observations. NOT applied to production (owner decisions pending, see KNOWN_LIMITATIONS 40).
-- Design rules: no numeric grade anywhere; no table, view or function compares, ranks or aggregates several learners; free text never leaves the DB
-- (no audit trigger on these tables, no AI path, no logging of bodies).

-- ---------- 1. reviewer roles (smallest possible change to the role list; decision recorded in ADR-013) ----------
ALTER TABLE memberships DROP CONSTRAINT memberships_role_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_role_check CHECK (role IN
  ('tenant_admin','scholarly_reviewer','qari','student','guardian','safeguarding_officer','pedagogical_reviewer','child_protection_reviewer'));

-- Guardian consent for a minor's reflection journal is its own purpose (it must never be implied by a generic data_processing consent).
ALTER TABLE consents DROP CONSTRAINT consents_purpose_check;
ALTER TABLE consents ADD CONSTRAINT consents_purpose_check CHECK (purpose IN
  ('audio_recording','live_session_recording','ai_analysis','data_processing','reflection_journal'));

-- Same concept as app.is_scholar() (0010): an ACTIVE membership with the role in any institution.
CREATE FUNCTION app.has_formation_role(p_role text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = app.current_user_id() AND m.role = p_role AND m.status = 'active') $$;
CREATE FUNCTION app.is_formation_reviewer() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = app.current_user_id() AND m.status = 'active'
                  AND m.role IN ('scholarly_reviewer','pedagogical_reviewer','child_protection_reviewer')) $$;

-- Identifier shape for references into the static content (JSON on the client). Ids only: no free text can hide in these columns.
CREATE FUNCTION app.ref_ok(p text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT p ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$' $$;
CREATE FUNCTION app.refs_ok(p text[]) RETURNS boolean LANGUAGE sql IMMUTABLE AS
$$ SELECT cardinality(p) BETWEEN 1 AND 100 AND coalesce(bool_and(x ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$'), false) FROM unnest(p) x $$;
CREATE FUNCTION app.steps_ok(p smallint[]) RETURNS boolean LANGUAGE sql IMMUTABLE AS
$$ SELECT cardinality(p) <= 50 AND coalesce(bool_and(x BETWEEN 0 AND 49), true) FROM unnest(p) x $$;

-- ---------- 2. source records (D7) with the three-role review gate ----------
CREATE TABLE source_records (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id  text NOT NULL CHECK (competency_id ~ '^[A-Z][0-9]{1,2}$'),
  version        integer NOT NULL CHECK (version >= 1),
  title          text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 300),
  content_md     text NOT NULL CHECK (length(content_md) BETWEEN 1 AND 200000),   -- INTERNAL ONLY: third-party text is never published from here
  review_status  text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft','under_review','approved','rejected','retired')),
  takhrij_status text NOT NULL DEFAULT 'unverified' CHECK (takhrij_status IN ('unverified','heading_only','verified','not_applicable')),
  rights_status  text NOT NULL DEFAULT 'not_cleared' CHECK (rights_status IN ('not_cleared','cleared','public_domain','not_applicable')),
  content_sha256 text NOT NULL DEFAULT '',                                          -- set by the guard trigger; approvals bind to it
  created_by     uuid NOT NULL REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competency_id, version)
);
CREATE INDEX source_records_created_by_fk ON source_records (created_by);

CREATE TABLE source_record_reviews (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  record_id      uuid NOT NULL REFERENCES source_records(id),
  reviewer_id    uuid NOT NULL REFERENCES users(id),
  role           text NOT NULL CHECK (role IN ('scholarly','pedagogical','child_protection')),
  decision       text NOT NULL CHECK (decision IN ('approve','reject','changes')),
  note           text CHECK (note IS NULL OR length(note) <= 4000),
  content_sha256 text NOT NULL DEFAULT '',                                          -- hash of the record as it was reviewed (set by trigger)
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX source_record_reviews_record ON source_record_reviews (record_id, id);
CREATE INDEX source_record_reviews_reviewer_fk ON source_record_reviews (reviewer_id);

CREATE FUNCTION app.source_record_hash(p_title text, p_content text, p_takhrij text, p_rights text) RETURNS text LANGUAGE sql IMMUTABLE AS
$$ SELECT encode(sha256(convert_to(p_title || E'\n' || p_content || E'\n' || p_takhrij || E'\n' || p_rights, 'UTF8')), 'hex') $$;

CREATE FUNCTION app.formation_role_name(p_review_role text) RETURNS text LANGUAGE sql IMMUTABLE AS
$$ SELECT CASE p_review_role WHEN 'scholarly' THEN 'scholarly_reviewer' WHEN 'pedagogical' THEN 'pedagogical_reviewer' WHEN 'child_protection' THEN 'child_protection_reviewer' END $$;

-- Approval condition. Considers only reviews of the CURRENT content hash; each reviewer's latest decision counts; the approving reviewers must be three
-- DISTINCT users (one per role), still holding that role, none of them the author, and nobody's latest decision may be reject/changes.
CREATE FUNCTION app.source_record_approvals_ok(p_record uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ WITH rec AS (SELECT id, content_sha256, created_by FROM source_records WHERE id = p_record),
   latest AS (
     SELECT DISTINCT ON (r.reviewer_id) r.reviewer_id, r.role, r.decision
       FROM source_record_reviews r JOIN rec ON rec.id = r.record_id AND r.content_sha256 = rec.content_sha256
      ORDER BY r.reviewer_id, r.id DESC)
   SELECT NOT EXISTS (SELECT 1 FROM latest WHERE decision <> 'approve')
      AND (SELECT count(DISTINCT l.role) FROM latest l, rec
            WHERE l.decision = 'approve' AND l.reviewer_id <> rec.created_by
              AND EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = l.reviewer_id AND m.status = 'active' AND m.role = app.formation_role_name(l.role))) = 3
      AND (SELECT count(*) FROM latest l, rec WHERE l.decision = 'approve' AND l.reviewer_id <> rec.created_by) >= 3 $$;

CREATE FUNCTION app.source_record_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.review_status <> 'draft' THEN RAISE EXCEPTION 'source_record_starts_as_draft' USING ERRCODE = '23514'; END IF;
    NEW.content_sha256 := app.source_record_hash(NEW.title, NEW.content_md, NEW.takhrij_status, NEW.rights_status);
    RETURN NEW;
  END IF;
  IF NEW.competency_id <> OLD.competency_id OR NEW.version <> OLD.version OR NEW.created_by <> OLD.created_by THEN
    RAISE EXCEPTION 'source_record_identity_immutable' USING ERRCODE = '23514'; END IF;
  IF (NEW.title, NEW.content_md, NEW.takhrij_status, NEW.rights_status) IS DISTINCT FROM (OLD.title, OLD.content_md, OLD.takhrij_status, OLD.rights_status) THEN
    IF OLD.review_status <> 'draft' THEN RAISE EXCEPTION 'source_record_locked_after_submission' USING ERRCODE = '23514'; END IF;
    NEW.content_sha256 := app.source_record_hash(NEW.title, NEW.content_md, NEW.takhrij_status, NEW.rights_status);   -- earlier approvals no longer match
  ELSE
    NEW.content_sha256 := OLD.content_sha256;
  END IF;
  IF NEW.review_status <> OLD.review_status THEN
    IF (OLD.review_status, NEW.review_status) NOT IN
       (('draft','under_review'),('under_review','approved'),('under_review','rejected'),('under_review','draft'),('rejected','draft'),
        ('draft','retired'),('rejected','retired'),('approved','retired')) THEN
      RAISE EXCEPTION 'source_record_illegal_transition % -> %', OLD.review_status, NEW.review_status USING ERRCODE = '23514'; END IF;
    IF NEW.review_status = 'approved' AND NOT app.source_record_approvals_ok(NEW.id) THEN
      RAISE EXCEPTION 'approval_requires_three_role_approvals' USING ERRCODE = '23514'; END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER source_records_guard BEFORE INSERT OR UPDATE ON source_records FOR EACH ROW EXECUTE FUNCTION app.source_record_guard();
CREATE FUNCTION app.source_record_no_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'source_records_are_retired_not_deleted' USING ERRCODE = '42501'; END $$;
CREATE TRIGGER source_records_no_delete BEFORE DELETE ON source_records FOR EACH ROW EXECUTE FUNCTION app.source_record_no_delete();

CREATE FUNCTION app.source_review_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE rec source_records%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM source_records WHERE id = NEW.record_id;
  IF rec.id IS NULL OR rec.review_status <> 'under_review' THEN RAISE EXCEPTION 'record_not_under_review' USING ERRCODE = '23514'; END IF;
  IF NEW.reviewer_id = rec.created_by THEN RAISE EXCEPTION 'author_cannot_review_own_record' USING ERRCODE = '23514'; END IF;
  IF NOT EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = NEW.reviewer_id AND m.status = 'active' AND m.role = app.formation_role_name(NEW.role)) THEN
    RAISE EXCEPTION 'reviewer_lacks_role' USING ERRCODE = '23514'; END IF;
  NEW.content_sha256 := rec.content_sha256;
  RETURN NEW;
END $$;
CREATE TRIGGER source_review_guard BEFORE INSERT ON source_record_reviews FOR EACH ROW EXECUTE FUNCTION app.source_review_guard();
-- A reject / changes decision moves the record out of review at once (the record guard validates the transition).
CREATE FUNCTION app.source_review_effect() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.decision = 'reject' THEN UPDATE source_records SET review_status = 'rejected' WHERE id = NEW.record_id;
  ELSIF NEW.decision = 'changes' THEN UPDATE source_records SET review_status = 'draft' WHERE id = NEW.record_id; END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER source_review_effect AFTER INSERT ON source_record_reviews FOR EACH ROW EXECUTE FUNCTION app.source_review_effect();
CREATE FUNCTION app.source_review_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'source_record_reviews_are_immutable' USING ERRCODE = '42501'; END $$;
CREATE TRIGGER source_review_no_change BEFORE UPDATE OR DELETE ON source_record_reviews FOR EACH ROW EXECUTE FUNCTION app.source_review_immutable();

ALTER TABLE source_records ENABLE ROW LEVEL SECURITY; ALTER TABLE source_records FORCE ROW LEVEL SECURITY;
ALTER TABLE source_record_reviews ENABLE ROW LEVEL SECURITY; ALTER TABLE source_record_reviews FORCE ROW LEVEL SECURITY;
-- Reviewers only. Never a learner, teacher, guardian or tenant admin.
CREATE POLICY srec_select ON source_records FOR SELECT TO app_user USING (app.is_formation_reviewer());
CREATE POLICY srec_insert ON source_records FOR INSERT TO app_user WITH CHECK (app.is_formation_reviewer() AND created_by = app.current_user_id());
CREATE POLICY srec_update ON source_records FOR UPDATE TO app_user USING (app.is_formation_reviewer()) WITH CHECK (app.is_formation_reviewer());
CREATE POLICY srev_select ON source_record_reviews FOR SELECT TO app_user USING (app.is_formation_reviewer());
CREATE POLICY srev_insert ON source_record_reviews FOR INSERT TO app_user WITH CHECK (reviewer_id = app.current_user_id() AND app.has_formation_role(app.formation_role_name(role)));
GRANT SELECT ON source_records, source_record_reviews TO app_user;
GRANT INSERT (competency_id, version, title, content_md, takhrij_status, rights_status, created_by) ON source_records TO app_user;
GRANT UPDATE (title, content_md, takhrij_status, rights_status, review_status) ON source_records TO app_user;
GRANT INSERT (record_id, reviewer_id, role, decision, note) ON source_record_reviews TO app_user;
GRANT EXECUTE ON FUNCTION app.has_formation_role(text), app.is_formation_reviewer() TO app_user;

-- ---------- 3. reflection log: private to the learner ----------
-- Only the owner reads or deletes. No policy for anyone else (not teacher, guardian, admin, safeguarding, reviewer). No UPDATE, no sharing, no grade column.
-- FORCE RLS so even SECURITY DEFINER helpers (running as the table owner) see nothing.
CREATE TABLE reflection_entries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  owner_id       uuid NOT NULL REFERENCES users(id),
  prompt_ref     text CHECK (prompt_ref IS NULL OR app.ref_ok(prompt_ref)),
  body           text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 5000),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, owner_id)
);
CREATE INDEX reflection_entries_owner_idx ON reflection_entries (owner_id, created_at DESC);
CREATE INDEX reflection_entries_inst_fk ON reflection_entries (institution_id);
ALTER TABLE reflection_entries ENABLE ROW LEVEL SECURITY; ALTER TABLE reflection_entries FORCE ROW LEVEL SECURITY;
-- Read and delete need only identity, not an active membership: a learner can always export and erase their own data.
CREATE POLICY refl_select ON reflection_entries FOR SELECT TO app_user USING (owner_id = app.current_user_id());
CREATE POLICY refl_delete ON reflection_entries FOR DELETE TO app_user USING (owner_id = app.current_user_id());
CREATE POLICY refl_insert ON reflection_entries FOR INSERT TO app_user WITH CHECK (
  owner_id = app.current_user_id() AND app.in_context(institution_id) AND app.has_role(institution_id, 'student'));
GRANT SELECT, DELETE ON reflection_entries TO app_user;
GRANT INSERT (institution_id, owner_id, prompt_ref, body) ON reflection_entries TO app_user;

-- Age and consent gate (SECURITY INVOKER on purpose: it reads kid_profiles, which is FORCE RLS, as the learner; run by anyone else it finds nothing and refuses).
-- Age: the system stores no birth date (ADR-008), only is_minor and the kids band (a 4-6, b 7-10, c 11-14). Minimum age 10 => an adult, or a minor in band c.
-- Band b (7-10) is refused because it includes 7-9 year olds. A minor also needs a verified guardian AND a live 'reflection_journal' consent.
CREATE FUNCTION app.reflection_gate() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_minor boolean; v_band text;
BEGIN
  SELECT is_minor INTO v_minor FROM student_profiles WHERE institution_id = NEW.institution_id AND user_id = NEW.owner_id;
  IF v_minor IS NULL THEN RAISE EXCEPTION 'student_profile_missing' USING ERRCODE = '23514'; END IF;
  IF v_minor THEN
    SELECT band INTO v_band FROM kid_profiles WHERE institution_id = NEW.institution_id AND student_user_id = NEW.owner_id;
    IF v_band IS DISTINCT FROM 'c' THEN RAISE EXCEPTION 'reflection_age_minimum' USING ERRCODE = '23514'; END IF;
    IF NOT EXISTS (SELECT 1 FROM guardian_links g WHERE g.institution_id = NEW.institution_id AND g.student_user_id = NEW.owner_id AND g.verified_at IS NOT NULL AND g.revoked_at IS NULL)
       OR NOT EXISTS (SELECT 1 FROM consents c WHERE c.institution_id = NEW.institution_id AND c.student_user_id = NEW.owner_id AND c.purpose = 'reflection_journal'
                        AND c.revoked_at IS NULL AND c.granted_at <= now() AND (c.expires_at IS NULL OR c.expires_at > now())) THEN
      RAISE EXCEPTION 'guardian_consent_required' USING ERRCODE = '23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reflection_gate BEFORE INSERT ON reflection_entries FOR EACH ROW EXECUTE FUNCTION app.reflection_gate();

-- ---------- 4. life missions: private progress + a status-only projection for guardian/teacher ----------
CREATE TABLE life_mission_runs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  learner_id     uuid NOT NULL REFERENCES users(id),
  mission_ref    text NOT NULL CHECK (app.ref_ok(mission_ref)),
  steps_done     smallint[] NOT NULL DEFAULT '{}' CHECK (app.steps_ok(steps_done)),
  reflection_id  uuid,
  completed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, learner_id, mission_ref),
  FOREIGN KEY (reflection_id, learner_id) REFERENCES reflection_entries (id, owner_id) ON DELETE SET NULL (reflection_id)
);
CREATE INDEX life_mission_runs_learner_idx ON life_mission_runs (learner_id, updated_at DESC);
CREATE INDEX life_mission_runs_reflection_fk ON life_mission_runs (reflection_id, learner_id);
ALTER TABLE life_mission_runs ENABLE ROW LEVEL SECURITY; ALTER TABLE life_mission_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY lmr_select ON life_mission_runs FOR SELECT TO app_user USING (learner_id = app.current_user_id());
CREATE POLICY lmr_delete ON life_mission_runs FOR DELETE TO app_user USING (learner_id = app.current_user_id());
CREATE POLICY lmr_insert ON life_mission_runs FOR INSERT TO app_user WITH CHECK (learner_id = app.current_user_id() AND app.in_context(institution_id) AND app.has_role(institution_id, 'student'));
CREATE POLICY lmr_update ON life_mission_runs FOR UPDATE TO app_user USING (learner_id = app.current_user_id()) WITH CHECK (learner_id = app.current_user_id());
GRANT SELECT, DELETE ON life_mission_runs TO app_user;
GRANT INSERT (institution_id, learner_id, mission_ref, steps_done, reflection_id, completed_at) ON life_mission_runs TO app_user;
GRANT UPDATE (steps_done, reflection_id, completed_at) ON life_mission_runs TO app_user;

CREATE FUNCTION app.life_mission_touch() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.completed_at IS NOT NULL AND NEW.completed_at IS NULL THEN NEW.completed_at := OLD.completed_at; END IF;   -- "completed" is never silently undone
  NEW.updated_at := now(); RETURN NEW;
END $$;
CREATE TRIGGER life_mission_touch BEFORE UPDATE ON life_mission_runs FOR EACH ROW EXECUTE FUNCTION app.life_mission_touch();

-- What a guardian/teacher may see: the state only (started / completed). No steps, no reflection link, no text.
CREATE TABLE life_mission_status (
  run_id         uuid PRIMARY KEY REFERENCES life_mission_runs(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES institutions(id),
  learner_id     uuid NOT NULL REFERENCES users(id),
  mission_ref    text NOT NULL,
  status         text NOT NULL CHECK (status IN ('started','completed')),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX life_mission_status_learner_idx ON life_mission_status (institution_id, learner_id);
CREATE INDEX life_mission_status_learner_fk ON life_mission_status (learner_id);
ALTER TABLE life_mission_status ENABLE ROW LEVEL SECURITY;   -- not FORCE: the definer projection trigger below must write it
CREATE POLICY lms_select ON life_mission_status FOR SELECT TO app_user USING (app.in_context(institution_id) AND (
  learner_id = app.current_user_id()
  OR (app.has_role(institution_id, 'qari') AND app.is_teacher_of(learner_id))
  OR (app.has_role(institution_id, 'guardian') AND app.is_guardian_of(learner_id))));
GRANT SELECT ON life_mission_status TO app_user;
CREATE FUNCTION app.life_mission_project() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO life_mission_status (run_id, institution_id, learner_id, mission_ref, status)
  VALUES (NEW.id, NEW.institution_id, NEW.learner_id, NEW.mission_ref, CASE WHEN NEW.completed_at IS NULL THEN 'started' ELSE 'completed' END)
  ON CONFLICT (run_id) DO UPDATE SET status = EXCLUDED.status, updated_at = now();
  RETURN NULL;
END $$;
CREATE TRIGGER life_mission_project AFTER INSERT OR UPDATE ON life_mission_runs FOR EACH ROW EXECUTE FUNCTION app.life_mission_project();

-- ---------- 5. scenario runs: the learner's own path through a scenario. Ids of chosen nodes only; no score; NO aggregation of any kind ----------
CREATE TABLE scenario_runs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  learner_id     uuid NOT NULL REFERENCES users(id),
  scenario_ref   text NOT NULL CHECK (app.ref_ok(scenario_ref)),
  chosen_nodes   text[] NOT NULL CHECK (app.refs_ok(chosen_nodes)),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scenario_runs_learner_idx ON scenario_runs (learner_id, created_at DESC);
CREATE INDEX scenario_runs_inst_fk ON scenario_runs (institution_id);
ALTER TABLE scenario_runs ENABLE ROW LEVEL SECURITY; ALTER TABLE scenario_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY scr_select ON scenario_runs FOR SELECT TO app_user USING (learner_id = app.current_user_id());
CREATE POLICY scr_delete ON scenario_runs FOR DELETE TO app_user USING (learner_id = app.current_user_id());
CREATE POLICY scr_insert ON scenario_runs FOR INSERT TO app_user WITH CHECK (learner_id = app.current_user_id() AND app.in_context(institution_id) AND app.has_role(institution_id, 'student'));
GRANT SELECT, DELETE ON scenario_runs TO app_user;
GRANT INSERT (institution_id, learner_id, scenario_ref, chosen_nodes) ON scenario_runs TO app_user;

-- ---------- 6. formative observations: descriptive, never graded, never compared ----------
CREATE TABLE formative_observations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  learner_id     uuid NOT NULL REFERENCES users(id),
  author_id      uuid NOT NULL REFERENCES users(id),
  author_role    text NOT NULL CHECK (author_role IN ('qari','guardian')),
  competency_id  text NOT NULL CHECK (competency_id ~ '^[A-Z][0-9]{1,2}$'),
  level          smallint NOT NULL CHECK (level BETWEEN 1 AND 5),
  status         text NOT NULL CHECK (status IN ('appeared','practicing','needs_support')),
  note           text NOT NULL CHECK (length(btrim(note)) BETWEEN 1 AND 2000),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (author_id <> learner_id)
);
CREATE INDEX formative_observations_learner_idx ON formative_observations (institution_id, learner_id, created_at DESC);
CREATE INDEX formative_observations_learner_fk ON formative_observations (learner_id);
CREATE INDEX formative_observations_author_fk ON formative_observations (author_id);
ALTER TABLE formative_observations ENABLE ROW LEVEL SECURITY; ALTER TABLE formative_observations FORCE ROW LEVEL SECURITY;
-- Visible to: the learner, the author, a verified guardian of the learner, teachers linked to the learner. NOT tenant admin, NOT safeguarding, NOT reviewers.
-- The learner and the author need only identity (so a learner can export what was written about them from any context); guardian/teacher need the live link.
CREATE POLICY fo_select ON formative_observations FOR SELECT TO app_user USING (
  learner_id = app.current_user_id() OR author_id = app.current_user_id()
  OR (app.in_context(institution_id) AND (
       (app.has_role(institution_id, 'guardian') AND app.is_guardian_of(learner_id))
    OR (app.has_role(institution_id, 'qari') AND app.is_teacher_of(learner_id)))));
CREATE POLICY fo_insert ON formative_observations FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND author_id = app.current_user_id() AND (
  (author_role = 'qari' AND app.has_role(institution_id, 'qari') AND app.is_teacher_of(learner_id))
  OR (author_role = 'guardian' AND app.has_role(institution_id, 'guardian') AND app.is_guardian_of(learner_id))));
CREATE POLICY fo_update ON formative_observations FOR UPDATE TO app_user USING (app.in_context(institution_id) AND author_id = app.current_user_id()) WITH CHECK (author_id = app.current_user_id());
CREATE POLICY fo_delete ON formative_observations FOR DELETE TO app_user USING (app.in_context(institution_id) AND author_id = app.current_user_id());
GRANT SELECT, DELETE ON formative_observations TO app_user;
GRANT INSERT (institution_id, learner_id, author_id, author_role, competency_id, level, status, note) ON formative_observations TO app_user;
GRANT UPDATE (level, status, note) ON formative_observations TO app_user;
CREATE FUNCTION app.fo_touch() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER fo_touch BEFORE UPDATE ON formative_observations FOR EACH ROW EXECUTE FUNCTION app.fo_touch();
