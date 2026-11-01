-- 0011: human translations of the meanings, stored verbatim and edition-pinned, strictly separate from the Quran text.
-- A translation is never the Quran: it lives in its own tables, is shown beside (never inside) the ayah, always with translator + licence attribution.
CREATE TABLE translation_editions (
  code               text PRIMARY KEY CHECK (code ~ '^[a-z0-9][a-z0-9._-]{2,63}$'),
  name               text NOT NULL,
  language           text NOT NULL CHECK (language ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  translator         text NOT NULL,
  provider           text NOT NULL,
  provider_version   text NOT NULL,
  licence_name       text NOT NULL,                  -- e.g. CC BY-ND 4.0
  licence_ref        text NOT NULL,                  -- URL of the accepted terms
  attribution_text   text NOT NULL,                  -- must be displayed wherever the translation is shown
  source_sha256      text NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  religious_approval text NOT NULL DEFAULT 'NOT_APPROVED' CHECK (religious_approval IN ('NOT_APPROVED','APPROVED')),
  approved_by        text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (religious_approval = 'NOT_APPROVED' OR approved_by IS NOT NULL)
);
CREATE TABLE translation_ayahs (
  edition_code text NOT NULL REFERENCES translation_editions(code),
  surah        smallint NOT NULL CHECK (surah BETWEEN 1 AND 114),
  ayah         smallint NOT NULL CHECK (ayah >= 1),
  text_raw     text NOT NULL,
  text_sha256  text NOT NULL,
  PRIMARY KEY (edition_code, surah, ayah)
);
CREATE TRIGGER translation_ayahs_no_update BEFORE UPDATE OR DELETE ON translation_ayahs FOR EACH ROW EXECUTE FUNCTION app.quran_text_is_immutable();
CREATE TRIGGER translation_ayahs_hash BEFORE INSERT ON translation_ayahs FOR EACH ROW EXECUTE FUNCTION app.quran_check_hash();
-- a translation may only be keyed to a real ayah of the reference canon
CREATE FUNCTION app.translation_ayah_in_range() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM quran_reference_counts c WHERE c.surah = NEW.surah AND NEW.ayah <= c.ayah_count) THEN RAISE EXCEPTION 'translation_ayah_out_of_range' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER translation_ayahs_range BEFORE INSERT ON translation_ayahs FOR EACH ROW EXECUTE FUNCTION app.translation_ayah_in_range();

ALTER TABLE translation_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_ayahs    ENABLE ROW LEVEL SECURITY;
CREATE POLICY translation_editions_read ON translation_editions FOR SELECT TO app_user USING (religious_approval = 'APPROVED');
CREATE POLICY translation_ayahs_read ON translation_ayahs FOR SELECT TO app_user USING (EXISTS (SELECT 1 FROM translation_editions e WHERE e.code = edition_code AND e.religious_approval = 'APPROVED'));
GRANT SELECT ON translation_editions, translation_ayahs TO app_user;
