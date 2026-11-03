-- 0020: publication lifecycle for Academy content (TARTIL 14.1, items 13-14).
-- Draft -> Source Review -> Scholarly Review -> Pedagogical Review -> Child Safety Review -> Approved -> Published, plus Needs Revision and Archived.
-- Content itself still lives in static JSON (docs/human-formation); this table tracks the STATE of a (kind, ref, version). A new text = a new version.
-- Rules enforced here, not in the UI or API:
--   * 'published' needs four recorded approvals (source, scholarly, pedagogical, child_safety) from FOUR DISTINCT active reviewers holding the matching role,
--     none of them the author, all in the current revision cycle. No approval row can be written by anyone but the reviewer himself (RLS + trigger).
--   * Each stage can be left forward only when that stage's approval exists. A needs_revision decision pulls the item out of review at once and voids earlier approvals (new cycle).
--   * Public (even signed-out) readers see 'published' rows only; reviewers see everything. app_user cannot delete, rewrite history or forge identity columns.
-- Reviewer roles are the ones from 0017 (appointed by the owner). There is no separate 'editor' role: editors are holders of a reviewer role (see docs/TARTIL_14_1_PUBLICATION_BACKEND.md).

CREATE TABLE academy_content_status (
  content_kind text    NOT NULL CHECK (content_kind IN ('program','lesson','scenario','guide')),
  content_ref  text    NOT NULL CHECK (app.ref_ok(content_ref)),
  version      integer NOT NULL CHECK (version >= 1),
  status       text    NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','source_review','scholarly_review','pedagogical_review','child_safety_review','approved','published','needs_revision','archived')),
  cycle        integer NOT NULL DEFAULT 1 CHECK (cycle >= 1),
  created_by   uuid    NOT NULL REFERENCES users(id),
  updated_by   uuid    NOT NULL REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (content_kind, content_ref, version)
);
CREATE INDEX academy_content_status_created_by_fk ON academy_content_status (created_by);
CREATE INDEX academy_content_status_updated_by_fk ON academy_content_status (updated_by);
CREATE INDEX academy_content_status_published ON academy_content_status (content_kind, content_ref) WHERE status = 'published';

CREATE TABLE academy_content_reviews (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  content_kind     text    NOT NULL,
  content_ref      text    NOT NULL,
  version          integer NOT NULL,
  review_type      text    NOT NULL CHECK (review_type IN ('source','scholarly','pedagogical','child_safety')),
  reviewer_user_id uuid    NOT NULL REFERENCES users(id),
  decision         text    NOT NULL CHECK (decision IN ('approved','needs_revision')),
  note             text    CHECK (note IS NULL OR length(note) <= 4000),
  cycle            integer NOT NULL DEFAULT 1,   -- set by trigger from the status row
  created_at       timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (content_kind, content_ref, version) REFERENCES academy_content_status (content_kind, content_ref, version),
  CHECK (decision = 'approved' OR (note IS NOT NULL AND length(btrim(note)) > 0))
);
CREATE INDEX academy_content_reviews_item ON academy_content_reviews (content_kind, content_ref, version, id);
CREATE INDEX academy_content_reviews_reviewer_fk ON academy_content_reviews (reviewer_user_id);

-- Which membership role may give which review. 'source' (citations, provenance, rights) may be given by a scholarly or a pedagogical reviewer.
CREATE FUNCTION app.academy_review_role_ok(p_user uuid, p_type text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = p_user AND m.status = 'active' AND m.role = ANY (
     CASE p_type WHEN 'source' THEN ARRAY['scholarly_reviewer','pedagogical_reviewer']
                 WHEN 'scholarly' THEN ARRAY['scholarly_reviewer']
                 WHEN 'pedagogical' THEN ARRAY['pedagogical_reviewer']
                 WHEN 'child_safety' THEN ARRAY['child_protection_reviewer'] ELSE ARRAY[]::text[] END)) $$;

-- Latest decision per (type, reviewer) in the current cycle, from reviewers who STILL hold the role and are not the author.
CREATE FUNCTION app.academy_type_approved(p_kind text, p_ref text, p_ver integer, p_type text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ WITH s AS (SELECT cycle, created_by FROM academy_content_status WHERE content_kind = p_kind AND content_ref = p_ref AND version = p_ver),
   latest AS (SELECT DISTINCT ON (r.reviewer_user_id) r.reviewer_user_id, r.decision FROM academy_content_reviews r, s
               WHERE r.content_kind = p_kind AND r.content_ref = p_ref AND r.version = p_ver AND r.review_type = p_type AND r.cycle = s.cycle
               ORDER BY r.reviewer_user_id, r.id DESC)
   SELECT NOT EXISTS (SELECT 1 FROM latest WHERE decision <> 'approved')
      AND EXISTS (SELECT 1 FROM latest l, s WHERE l.decision = 'approved' AND l.reviewer_user_id <> s.created_by AND app.academy_review_role_ok(l.reviewer_user_id, p_type)) $$;

-- All four types approved AND four distinct approving reviewers (so the same person cannot be both the source and the scholarly reviewer).
CREATE FUNCTION app.academy_all_approved(p_kind text, p_ref text, p_ver integer) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT app.academy_type_approved(p_kind, p_ref, p_ver, 'source') AND app.academy_type_approved(p_kind, p_ref, p_ver, 'scholarly')
      AND app.academy_type_approved(p_kind, p_ref, p_ver, 'pedagogical') AND app.academy_type_approved(p_kind, p_ref, p_ver, 'child_safety')
      AND (SELECT count(DISTINCT r.reviewer_user_id) FROM academy_content_reviews r JOIN academy_content_status s USING (content_kind, content_ref, version)
            WHERE r.content_kind = p_kind AND r.content_ref = p_ref AND r.version = p_ver AND r.cycle = s.cycle AND r.decision = 'approved'
              AND r.reviewer_user_id <> s.created_by AND app.academy_review_role_ok(r.reviewer_user_id, r.review_type)) >= 4 $$;

CREATE FUNCTION app.academy_status_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_type text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN RAISE EXCEPTION 'content_starts_as_draft' USING ERRCODE = '23514'; END IF;
    NEW.cycle := 1; NEW.created_at := now(); NEW.updated_at := now();
    NEW.updated_by := NEW.created_by;
    RETURN NEW;
  END IF;
  IF NEW.content_kind <> OLD.content_kind OR NEW.content_ref <> OLD.content_ref OR NEW.version <> OLD.version OR NEW.created_by <> OLD.created_by
     OR NEW.created_at <> OLD.created_at OR NEW.cycle <> OLD.cycle THEN
    RAISE EXCEPTION 'content_status_identity_immutable' USING ERRCODE = '23514'; END IF;
  IF NEW.status <> OLD.status THEN
    IF (OLD.status, NEW.status) NOT IN
       (('draft','source_review'),('source_review','scholarly_review'),('scholarly_review','pedagogical_review'),('pedagogical_review','child_safety_review'),('child_safety_review','approved'),('approved','published'),
        ('source_review','needs_revision'),('scholarly_review','needs_revision'),('pedagogical_review','needs_revision'),('child_safety_review','needs_revision'),('approved','needs_revision'),('published','needs_revision'),
        ('needs_revision','draft'),
        ('draft','archived'),('needs_revision','archived'),('approved','archived'),('published','archived')) THEN
      RAISE EXCEPTION 'content_illegal_transition % -> %', OLD.status, NEW.status USING ERRCODE = '23514'; END IF;
    -- leaving a review stage forward needs that stage's approval
    v_type := CASE OLD.status WHEN 'source_review' THEN 'source' WHEN 'scholarly_review' THEN 'scholarly' WHEN 'pedagogical_review' THEN 'pedagogical' WHEN 'child_safety_review' THEN 'child_safety' END;
    IF v_type IS NOT NULL AND NEW.status <> 'needs_revision' AND NEW.status <> 'archived' AND NOT app.academy_type_approved(OLD.content_kind, OLD.content_ref, OLD.version, v_type) THEN
      RAISE EXCEPTION 'stage_approval_missing' USING ERRCODE = '23514'; END IF;
    IF NEW.status IN ('approved','published') AND NOT app.academy_all_approved(OLD.content_kind, OLD.content_ref, OLD.version) THEN
      RAISE EXCEPTION 'publication_requires_four_approvals' USING ERRCODE = '23514'; END IF;
    IF OLD.status = 'needs_revision' AND NEW.status = 'draft' THEN NEW.cycle := OLD.cycle + 1; END IF;   -- earlier approvals no longer count
  END IF;
  NEW.updated_by := coalesce(app.current_user_id(), OLD.updated_by);
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER academy_status_guard BEFORE INSERT OR UPDATE ON academy_content_status FOR EACH ROW EXECUTE FUNCTION app.academy_status_guard();
CREATE FUNCTION app.academy_no_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'academy_content_is_archived_not_deleted' USING ERRCODE = '42501'; END $$;
CREATE TRIGGER academy_status_no_delete BEFORE DELETE ON academy_content_status FOR EACH ROW EXECUTE FUNCTION app.academy_no_delete();
CREATE TRIGGER academy_reviews_no_delete BEFORE UPDATE OR DELETE ON academy_content_reviews FOR EACH ROW EXECUTE FUNCTION app.academy_no_delete();

CREATE FUNCTION app.academy_review_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s academy_content_status%ROWTYPE; v_stage text;
BEGIN
  SELECT * INTO s FROM academy_content_status WHERE content_kind = NEW.content_kind AND content_ref = NEW.content_ref AND version = NEW.version;
  v_stage := NEW.review_type || '_review';
  IF s.content_ref IS NULL OR s.status <> v_stage THEN RAISE EXCEPTION 'content_not_in_this_review_stage' USING ERRCODE = '23514'; END IF;
  IF NEW.reviewer_user_id = s.created_by THEN RAISE EXCEPTION 'author_cannot_review_own_content' USING ERRCODE = '23514'; END IF;
  IF NOT app.academy_review_role_ok(NEW.reviewer_user_id, NEW.review_type) THEN RAISE EXCEPTION 'reviewer_lacks_role' USING ERRCODE = '23514'; END IF;
  IF EXISTS (SELECT 1 FROM academy_content_reviews r WHERE r.content_kind = NEW.content_kind AND r.content_ref = NEW.content_ref AND r.version = NEW.version
             AND r.cycle = s.cycle AND r.reviewer_user_id = NEW.reviewer_user_id AND r.review_type <> NEW.review_type) THEN
    RAISE EXCEPTION 'one_review_type_per_reviewer' USING ERRCODE = '23514'; END IF;
  NEW.cycle := s.cycle; NEW.created_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER academy_review_guard BEFORE INSERT ON academy_content_reviews FOR EACH ROW EXECUTE FUNCTION app.academy_review_guard();
-- A needs_revision decision takes the item out of review immediately (the status guard validates the transition).
CREATE FUNCTION app.academy_review_effect() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.decision = 'needs_revision' THEN
    UPDATE academy_content_status SET status = 'needs_revision' WHERE content_kind = NEW.content_kind AND content_ref = NEW.content_ref AND version = NEW.version;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER academy_review_effect AFTER INSERT ON academy_content_reviews FOR EACH ROW EXECUTE FUNCTION app.academy_review_effect();

ALTER TABLE academy_content_status ENABLE ROW LEVEL SECURITY; ALTER TABLE academy_content_status FORCE ROW LEVEL SECURITY;
ALTER TABLE academy_content_reviews ENABLE ROW LEVEL SECURITY; ALTER TABLE academy_content_reviews FORCE ROW LEVEL SECURITY;
CREATE POLICY acs_select ON academy_content_status FOR SELECT TO app_user USING (status = 'published' OR app.is_formation_reviewer());
CREATE POLICY acs_insert ON academy_content_status FOR INSERT TO app_user WITH CHECK (app.is_formation_reviewer() AND created_by = app.current_user_id());
CREATE POLICY acs_update ON academy_content_status FOR UPDATE TO app_user USING (app.is_formation_reviewer()) WITH CHECK (app.is_formation_reviewer());
CREATE POLICY acr_select ON academy_content_reviews FOR SELECT TO app_user USING (app.is_formation_reviewer());
CREATE POLICY acr_insert ON academy_content_reviews FOR INSERT TO app_user WITH CHECK (reviewer_user_id = app.current_user_id() AND app.academy_review_role_ok(app.current_user_id(), review_type));
GRANT SELECT ON academy_content_status, academy_content_reviews TO app_user;
GRANT INSERT (content_kind, content_ref, version, created_by) ON academy_content_status TO app_user;
GRANT UPDATE (status) ON academy_content_status TO app_user;
GRANT INSERT (content_kind, content_ref, version, review_type, reviewer_user_id, decision, note) ON academy_content_reviews TO app_user;
GRANT EXECUTE ON FUNCTION app.academy_review_role_ok(uuid, text), app.academy_type_approved(text, text, integer, text), app.academy_all_approved(text, text, integer) TO app_user;
