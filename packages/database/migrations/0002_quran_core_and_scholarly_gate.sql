-- 0002: Quran canon (immutable, edition-pinned) + scholarly content workflow gate.
-- Quran text is stored VERBATIM. No normalisation, no tashkeel stripping, no re-encoding. Derived/search forms live in separate tables.
-- No Quran text is shipped in this repository: the verified import (Tanzil, after licence acceptance) is a separate gated step.

CREATE TABLE quran_editions (
  code               text PRIMARY KEY CHECK (code ~ '^[a-z0-9][a-z0-9._-]{2,63}$'),
  name               text NOT NULL,
  riwayah            text NOT NULL,                  -- e.g. hafs-an-asim (never merged across riwayat)
  script_style       text NOT NULL,                  -- e.g. uthmani
  provider           text NOT NULL,                  -- e.g. tanzil
  provider_version   text NOT NULL,
  licence_ref        text NOT NULL,                  -- URL / document id of the accepted terms
  attribution_text   text NOT NULL,                  -- must be displayed wherever the text is shown
  source_sha256      text NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),   -- hash of the ORIGINAL downloaded file
  religious_approval text NOT NULL DEFAULT 'NOT_APPROVED' CHECK (religious_approval IN ('NOT_APPROVED','APPROVED')),
  approved_by        text,
  is_test_fixture    boolean NOT NULL DEFAULT false, -- fixtures can never be published
  created_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (religious_approval = 'NOT_APPROVED' OR approved_by IS NOT NULL)
);

CREATE TABLE quran_ayahs (
  edition_code text NOT NULL REFERENCES quran_editions(code),
  surah        smallint NOT NULL CHECK (surah BETWEEN 1 AND 114),
  ayah         smallint NOT NULL CHECK (ayah >= 1),
  text_raw     text NOT NULL,
  text_sha256  text NOT NULL,
  PRIMARY KEY (edition_code, surah, ayah)
);

CREATE FUNCTION app.quran_text_is_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'quran_text_is_immutable: import a new edition/version instead' USING ERRCODE = '42501'; END $$;
CREATE TRIGGER quran_ayahs_no_update BEFORE UPDATE OR DELETE ON quran_ayahs FOR EACH ROW EXECUTE FUNCTION app.quran_text_is_immutable();

CREATE FUNCTION app.quran_check_hash() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.text_sha256 <> encode(sha256(convert_to(NEW.text_raw, 'UTF8')), 'hex') THEN RAISE EXCEPTION 'text_hash_mismatch' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER quran_ayahs_hash BEFORE INSERT ON quran_ayahs FOR EACH ROW EXECUTE FUNCTION app.quran_check_hash();

-- Reference ayah counts per surah (Hafs numbering) used for completeness checks. Superseded by provider metadata when imported.
CREATE TABLE quran_reference_counts (surah smallint PRIMARY KEY CHECK (surah BETWEEN 1 AND 114), ayah_count smallint NOT NULL);
INSERT INTO quran_reference_counts (surah, ayah_count)
SELECT i, c FROM unnest(ARRAY[7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6]) WITH ORDINALITY AS t(c, i);

-- Edition completeness report: an edition is publishable only if it has exactly the reference ayat (6236 for Hafs numbering).
CREATE FUNCTION app.quran_edition_gaps(p_edition text) RETURNS TABLE (surah smallint, expected smallint, found bigint)
LANGUAGE sql STABLE AS $$
  SELECT r.surah, r.ayah_count, count(a.ayah) FROM quran_reference_counts r
  LEFT JOIN quran_ayahs a ON a.edition_code = p_edition AND a.surah = r.surah
  GROUP BY r.surah, r.ayah_count HAVING count(a.ayah) <> r.ayah_count ORDER BY r.surah $$;

-- Scholarly content workflow. Machine-extracted content can NEVER reach PUBLISHED without a recorded human approval by a scholarly reviewer.
CREATE TABLE scholarly_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind             text NOT NULL CHECK (kind IN ('concept','tajweed_rule','lesson','exercise','competency','teaching_note')),
  title_ar         text NOT NULL,
  title_en         text,
  body             jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_unit_ids  text[] NOT NULL DEFAULT '{}',        -- lineage to extracted book units (SRC-xxxxxx#toc-n.pNNNN)
  riwayah_scope    text NOT NULL DEFAULT 'unspecified', -- variation across riwayat is kept, never merged away
  state            text NOT NULL DEFAULT 'DRAFT' CHECK (state IN ('DRAFT','EXTRACTED','NORMALIZED','UNDER_REVIEW','APPROVED','PUBLISHED','REJECTED','REVISION_REQUIRED','ARCHIVED')),
  approved_by      uuid REFERENCES users(id),
  approved_at      timestamptz,
  licence_cleared  boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION app.scholarly_transition_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE ok boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.state NOT IN ('DRAFT','EXTRACTED') THEN RAISE EXCEPTION 'new_items_start_as_draft_or_extracted' USING ERRCODE = '23514'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.state = OLD.state THEN NEW.updated_at := now(); RETURN NEW; END IF;
  ok := (OLD.state, NEW.state) IN (
    ('DRAFT','EXTRACTED'),('EXTRACTED','NORMALIZED'),('NORMALIZED','UNDER_REVIEW'),('UNDER_REVIEW','APPROVED'),('APPROVED','PUBLISHED'),
    ('UNDER_REVIEW','REJECTED'),('UNDER_REVIEW','REVISION_REQUIRED'),('REVISION_REQUIRED','UNDER_REVIEW'),('REJECTED','ARCHIVED'),('PUBLISHED','ARCHIVED'),('PUBLISHED','REVISION_REQUIRED'),('DRAFT','ARCHIVED'));
  IF NOT ok THEN RAISE EXCEPTION 'illegal_transition % -> %', OLD.state, NEW.state USING ERRCODE = '23514'; END IF;
  IF NEW.state = 'APPROVED' THEN
    IF NEW.approved_by IS NULL OR NOT EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = NEW.approved_by AND m.role = 'scholarly_reviewer' AND m.status = 'active') THEN
      RAISE EXCEPTION 'approval_requires_active_scholarly_reviewer' USING ERRCODE = '23514'; END IF;
    NEW.approved_at := now();
  END IF;
  IF NEW.state = 'PUBLISHED' AND NOT NEW.licence_cleared THEN RAISE EXCEPTION 'publication_requires_licence_clearance' USING ERRCODE = '23514'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER scholarly_items_guard BEFORE INSERT OR UPDATE ON scholarly_items FOR EACH ROW EXECUTE FUNCTION app.scholarly_transition_guard();

ALTER TABLE quran_editions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quran_ayahs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarly_items  ENABLE ROW LEVEL SECURITY;
-- Learners read only approved-and-published canon; test fixtures and unapproved editions are invisible to app_user.
CREATE POLICY editions_read ON quran_editions FOR SELECT TO app_user USING (religious_approval = 'APPROVED' AND NOT is_test_fixture);
CREATE POLICY ayahs_read ON quran_ayahs FOR SELECT TO app_user USING (EXISTS (SELECT 1 FROM quran_editions e WHERE e.code = edition_code AND e.religious_approval = 'APPROVED' AND NOT e.is_test_fixture));
CREATE POLICY scholarly_read_published ON scholarly_items FOR SELECT TO app_user USING (state = 'PUBLISHED');
GRANT SELECT ON quran_editions, quran_ayahs, quran_reference_counts, scholarly_items TO app_user;
GRANT EXECUTE ON FUNCTION app.quran_edition_gaps(text) TO app_user;
