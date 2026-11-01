-- 0001_foundation: tenancy, roles, guardians, consent, recitation submissions, immutable audit log.
-- Security model (defence in depth):
--   1. The API authenticates the user and sets TRANSACTION-LOCAL context: app.user_id, app.institution_id, then SET LOCAL ROLE app_user.
--   2. Every tenant table has ROW LEVEL SECURITY. Policies re-verify membership in the DB; a forged app.institution_id
--      for an institution the user does not belong to yields zero rows / failed writes.
--   3. app_user is NOT the table owner, NOT superuser, has NO BYPASSRLS (asserted in tests). Do not connect the API as the owner.
--   4. Child-safety invariants (consent for minors' recordings, immutable audit) are enforced by triggers, not by application code.
-- NOTE: FORCE ROW LEVEL SECURITY is deliberately not used: SECURITY DEFINER helpers run as owner and must read membership
--       tables without recursion. Owner connections are for migrations/seeding only.

CREATE SCHEMA IF NOT EXISTS app;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;

-- ---------- context accessors ----------
CREATE FUNCTION app.current_user_id() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;
CREATE FUNCTION app.current_institution_id() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.institution_id', true), '')::uuid $$;

-- ---------- tables ----------
CREATE TABLE institutions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  name         text NOT NULL,
  country_code char(2),
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Users are global (one person may belong to several institutions). email/password_hash are NOT readable by app_user.
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name  text NOT NULL,
  email         text UNIQUE,
  password_hash text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  user_id        uuid NOT NULL REFERENCES users(id),
  role           text NOT NULL CHECK (role IN ('tenant_admin','scholarly_reviewer','qari','student','guardian','safeguarding_officer')),
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, user_id, role)
);
CREATE INDEX memberships_user_idx ON memberships (user_id, institution_id) WHERE status = 'active';

CREATE TABLE student_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  uuid NOT NULL REFERENCES institutions(id),
  user_id         uuid NOT NULL REFERENCES users(id),
  is_minor        boolean NOT NULL,          -- no birth date stored (data minimisation)
  riwayah_profile text NOT NULL DEFAULT 'unspecified',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, user_id)
);

CREATE TABLE guardian_links (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   uuid NOT NULL REFERENCES institutions(id),
  guardian_user_id uuid NOT NULL REFERENCES users(id),
  student_user_id  uuid NOT NULL,
  relationship     text NOT NULL,
  verified_at      timestamptz,              -- set only by tenant_admin / safeguarding_officer after identity checks
  revoked_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, guardian_user_id, student_user_id),
  FOREIGN KEY (institution_id, student_user_id) REFERENCES student_profiles (institution_id, user_id),
  CHECK (guardian_user_id <> student_user_id)
);

CREATE TABLE qari_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  uuid NOT NULL REFERENCES institutions(id),
  qari_user_id    uuid NOT NULL REFERENCES users(id),
  student_user_id uuid NOT NULL,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, qari_user_id, student_user_id),
  FOREIGN KEY (institution_id, student_user_id) REFERENCES student_profiles (institution_id, user_id),
  CHECK (qari_user_id <> student_user_id)
);

CREATE TABLE consents (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id     uuid NOT NULL REFERENCES institutions(id),
  student_user_id    uuid NOT NULL,
  granted_by_user_id uuid NOT NULL REFERENCES users(id),
  purpose            text NOT NULL CHECK (purpose IN ('audio_recording','live_session_recording','ai_analysis','data_processing')),
  scope              text NOT NULL DEFAULT 'institution',
  granted_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz,
  revoked_at         timestamptz,
  UNIQUE (institution_id, id),
  FOREIGN KEY (institution_id, student_user_id) REFERENCES student_profiles (institution_id, user_id)
);
CREATE INDEX consents_lookup_idx ON consents (institution_id, student_user_id, purpose);

CREATE TABLE recitation_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  uuid NOT NULL REFERENCES institutions(id),
  student_user_id uuid NOT NULL,
  consent_id      uuid,
  edition_code    text NOT NULL,             -- pinned Quran edition (see quran-core; never "latest")
  riwayah         text NOT NULL,
  surah           smallint NOT NULL CHECK (surah BETWEEN 1 AND 114),
  ayah_start      smallint NOT NULL CHECK (ayah_start >= 1),
  ayah_end        smallint NOT NULL,
  audio_object_key text NOT NULL,            -- private object storage key; never a public URL
  state           text NOT NULL DEFAULT 'submitted' CHECK (state IN ('submitted','under_review','feedback_sent','reassessment_requested','closed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (ayah_end >= ayah_start),
  FOREIGN KEY (institution_id, student_user_id) REFERENCES student_profiles (institution_id, user_id),
  FOREIGN KEY (institution_id, consent_id) REFERENCES consents (institution_id, id)
);
CREATE INDEX submissions_student_idx ON recitation_submissions (institution_id, student_user_id, created_at DESC);

CREATE TABLE audit_logs (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  institution_id uuid REFERENCES institutions(id),
  actor_user_id  uuid,
  action         text NOT NULL,
  object_type    text NOT NULL,
  object_id      text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------- SECURITY DEFINER helpers (pinned search_path; read membership tables bypassing RLS to avoid recursion) ----------
CREATE FUNCTION app.is_member(p_inst uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT EXISTS (SELECT 1 FROM memberships m JOIN institutions i ON i.id = m.institution_id
                  WHERE m.institution_id = p_inst AND m.user_id = app.current_user_id() AND m.status = 'active' AND i.status = 'active') $$;

CREATE FUNCTION app.has_role(p_inst uuid, p_role text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT EXISTS (SELECT 1 FROM memberships m JOIN institutions i ON i.id = m.institution_id
                  WHERE m.institution_id = p_inst AND m.user_id = app.current_user_id() AND m.role = p_role
                    AND m.status = 'active' AND i.status = 'active') $$;

-- The only tenant gate used by policies: requested context must equal the row's tenant AND the caller must really be a member.
CREATE FUNCTION app.in_context(p_inst uuid) RETURNS boolean LANGUAGE sql STABLE AS
$$ SELECT p_inst IS NOT NULL AND p_inst = app.current_institution_id() AND app.is_member(p_inst) $$;

CREATE FUNCTION app.is_assigned_qari(p_student uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT EXISTS (SELECT 1 FROM qari_assignments qa
                  WHERE qa.institution_id = app.current_institution_id() AND qa.qari_user_id = app.current_user_id()
                    AND qa.student_user_id = p_student AND qa.active) $$;

CREATE FUNCTION app.is_guardian_of(p_student uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT EXISTS (SELECT 1 FROM guardian_links g
                  WHERE g.institution_id = app.current_institution_id() AND g.guardian_user_id = app.current_user_id()
                    AND g.student_user_id = p_student AND g.verified_at IS NOT NULL AND g.revoked_at IS NULL) $$;

CREATE FUNCTION app.is_minor(p_student uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT coalesce((SELECT is_minor FROM student_profiles WHERE institution_id = app.current_institution_id() AND user_id = p_student), true) $$;

CREATE FUNCTION app.can_see_user(p_target uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT app.in_context(app.current_institution_id())
   AND EXISTS (SELECT 1 FROM memberships tm WHERE tm.user_id = p_target AND tm.institution_id = app.current_institution_id() AND tm.status = 'active')
   AND ( app.has_role(app.current_institution_id(), 'tenant_admin')
      OR app.has_role(app.current_institution_id(), 'safeguarding_officer')
      OR (app.has_role(app.current_institution_id(), 'qari') AND app.is_assigned_qari(p_target))
      OR (app.has_role(app.current_institution_id(), 'guardian') AND app.is_guardian_of(p_target))
      OR (app.has_role(app.current_institution_id(), 'student') AND (
            EXISTS (SELECT 1 FROM qari_assignments qa WHERE qa.institution_id = app.current_institution_id() AND qa.student_user_id = app.current_user_id() AND qa.qari_user_id = p_target AND qa.active)
         OR EXISTS (SELECT 1 FROM guardian_links g WHERE g.institution_id = app.current_institution_id() AND g.student_user_id = app.current_user_id() AND g.guardian_user_id = p_target AND g.verified_at IS NOT NULL AND g.revoked_at IS NULL)))
   ) $$;

-- ---------- RLS ----------
ALTER TABLE institutions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships             ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_links          ENABLE ROW LEVEL SECURITY;
ALTER TABLE qari_assignments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents                ENABLE ROW LEVEL SECURITY;
ALTER TABLE recitation_submissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;

CREATE POLICY institutions_select ON institutions FOR SELECT TO app_user USING (app.in_context(id));

CREATE POLICY users_select ON users FOR SELECT TO app_user USING (id = app.current_user_id() OR app.can_see_user(id));

CREATE POLICY memberships_select ON memberships FOR SELECT TO app_user USING (
  app.in_context(institution_id) AND (user_id = app.current_user_id()
    OR app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer')));
CREATE POLICY memberships_write ON memberships FOR ALL TO app_user
  USING (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin'))
  WITH CHECK (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin'));

CREATE POLICY student_profiles_select ON student_profiles FOR SELECT TO app_user USING (
  app.in_context(institution_id) AND (user_id = app.current_user_id()
    OR app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer')
    OR (app.has_role(institution_id, 'qari') AND app.is_assigned_qari(user_id))
    OR (app.has_role(institution_id, 'guardian') AND app.is_guardian_of(user_id))));
CREATE POLICY student_profiles_write ON student_profiles FOR ALL TO app_user
  USING (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin'))
  WITH CHECK (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin'));

CREATE POLICY guardian_links_select ON guardian_links FOR SELECT TO app_user USING (
  app.in_context(institution_id) AND (guardian_user_id = app.current_user_id() OR student_user_id = app.current_user_id()
    OR app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer')));
CREATE POLICY guardian_links_write ON guardian_links FOR ALL TO app_user
  USING (app.in_context(institution_id) AND (app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer')))
  WITH CHECK (app.in_context(institution_id) AND (app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer')));

CREATE POLICY qari_assignments_select ON qari_assignments FOR SELECT TO app_user USING (
  app.in_context(institution_id) AND (qari_user_id = app.current_user_id() OR student_user_id = app.current_user_id()
    OR app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer')));
CREATE POLICY qari_assignments_write ON qari_assignments FOR ALL TO app_user
  USING (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin'))
  WITH CHECK (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin'));

-- Consents: a minor's consent can only be granted/revoked by a VERIFIED guardian; an adult student manages their own.
-- Qaris cannot read consents (the trigger below checks them with definer rights).
CREATE POLICY consents_select ON consents FOR SELECT TO app_user USING (
  app.in_context(institution_id) AND (student_user_id = app.current_user_id() OR app.is_guardian_of(student_user_id)
    OR app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer')));
CREATE POLICY consents_insert ON consents FOR INSERT TO app_user WITH CHECK (
  app.in_context(institution_id) AND granted_by_user_id = app.current_user_id()
  AND (app.is_guardian_of(student_user_id) OR (student_user_id = app.current_user_id() AND NOT app.is_minor(student_user_id))));
CREATE POLICY consents_revoke ON consents FOR UPDATE TO app_user
  USING (app.in_context(institution_id) AND (app.is_guardian_of(student_user_id) OR (student_user_id = app.current_user_id() AND NOT app.is_minor(student_user_id))))
  WITH CHECK (app.in_context(institution_id));

CREATE POLICY submissions_select ON recitation_submissions FOR SELECT TO app_user USING (
  app.in_context(institution_id) AND (student_user_id = app.current_user_id()
    OR (app.has_role(institution_id, 'qari') AND app.is_assigned_qari(student_user_id))
    OR (app.has_role(institution_id, 'guardian') AND app.is_guardian_of(student_user_id))
    OR app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer')));
CREATE POLICY submissions_insert ON recitation_submissions FOR INSERT TO app_user WITH CHECK (
  app.in_context(institution_id) AND student_user_id = app.current_user_id() AND app.has_role(institution_id, 'student'));
CREATE POLICY submissions_update ON recitation_submissions FOR UPDATE TO app_user
  USING (app.in_context(institution_id) AND app.has_role(institution_id, 'qari') AND app.is_assigned_qari(student_user_id))
  WITH CHECK (app.in_context(institution_id) AND app.has_role(institution_id, 'qari') AND app.is_assigned_qari(student_user_id));

CREATE POLICY audit_select ON audit_logs FOR SELECT TO app_user USING (
  app.in_context(institution_id) AND (app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer')));

-- ---------- privileges (least privilege) ----------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO app_user;
GRANT SELECT ON institutions, student_profiles, guardian_links, qari_assignments, consents, recitation_submissions, audit_logs, memberships TO app_user;
GRANT SELECT (id, display_name, created_at) ON users TO app_user;           -- never email / password_hash
GRANT INSERT, UPDATE, DELETE ON memberships, student_profiles, guardian_links, qari_assignments TO app_user;
GRANT INSERT ON consents TO app_user;           GRANT UPDATE (revoked_at) ON consents TO app_user;
GRANT INSERT (institution_id, student_user_id, edition_code, riwayah, surah, ayah_start, ayah_end, audio_object_key) ON recitation_submissions TO app_user;
GRANT UPDATE (state) ON recitation_submissions TO app_user;

-- ---------- invariants as triggers ----------
-- Minor's recordings require a live guardian consent (not revoked, not expired). Applies to every writer incl. owner.
CREATE FUNCTION app.enforce_recording_consent() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_minor boolean; v_consent uuid;
BEGIN
  SELECT is_minor INTO v_minor FROM student_profiles WHERE institution_id = NEW.institution_id AND user_id = NEW.student_user_id;
  IF v_minor IS NULL THEN RAISE EXCEPTION 'student_profile_missing' USING ERRCODE = '23514'; END IF;
  IF v_minor THEN
    SELECT c.id INTO v_consent FROM consents c
     WHERE c.institution_id = NEW.institution_id AND c.student_user_id = NEW.student_user_id AND c.purpose = 'audio_recording'
       AND c.revoked_at IS NULL AND c.granted_at <= now() AND (c.expires_at IS NULL OR c.expires_at > now())
     ORDER BY c.granted_at DESC LIMIT 1;
    IF v_consent IS NULL THEN RAISE EXCEPTION 'guardian_consent_required' USING ERRCODE = '23514'; END IF;
    NEW.consent_id := v_consent;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER submissions_consent BEFORE INSERT ON recitation_submissions FOR EACH ROW EXECUTE FUNCTION app.enforce_recording_consent();

-- Audit: written by definer trigger only; rows are immutable.
CREATE FUNCTION app.audit_row() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r jsonb := to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
BEGIN
  INSERT INTO audit_logs (institution_id, actor_user_id, action, object_type, object_id)
  VALUES ((r->>'institution_id')::uuid, app.current_user_id(), TG_OP, TG_TABLE_NAME, coalesce(r->>'id', ''));
  RETURN NULL;
END $$;
CREATE TRIGGER audit_memberships  AFTER INSERT OR UPDATE OR DELETE ON memberships             FOR EACH ROW EXECUTE FUNCTION app.audit_row();
CREATE TRIGGER audit_guardians    AFTER INSERT OR UPDATE OR DELETE ON guardian_links          FOR EACH ROW EXECUTE FUNCTION app.audit_row();
CREATE TRIGGER audit_assignments  AFTER INSERT OR UPDATE OR DELETE ON qari_assignments        FOR EACH ROW EXECUTE FUNCTION app.audit_row();
CREATE TRIGGER audit_consents     AFTER INSERT OR UPDATE OR DELETE ON consents                FOR EACH ROW EXECUTE FUNCTION app.audit_row();
CREATE TRIGGER audit_submissions  AFTER INSERT OR UPDATE OR DELETE ON recitation_submissions  FOR EACH ROW EXECUTE FUNCTION app.audit_row();

CREATE FUNCTION app.audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit_logs_are_immutable' USING ERRCODE = '42501'; END $$;
CREATE TRIGGER audit_logs_no_change BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION app.audit_immutable();

-- A revoked consent can never be silently re-activated; a new consent row must be granted instead.
CREATE FUNCTION app.consent_no_unrevoke() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at THEN
    RAISE EXCEPTION 'revoked_consent_is_final' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER consents_no_unrevoke BEFORE UPDATE ON consents FOR EACH ROW EXECUTE FUNCTION app.consent_no_unrevoke();
