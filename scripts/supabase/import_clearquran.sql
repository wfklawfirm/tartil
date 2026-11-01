-- Hash-gated import of Clear Quran (Allah Edition, Talal Itani, CC BY-ND 4.0) into translation_* tables. Run as project owner (SQL editor / MCP execute_sql).
-- Aborts unless the downloaded bytes match the pinned SHA-256, every line is well-formed and exactly 6,236 ayat result with no gaps.
-- Imports as NOT_APPROVED; approval is a separate human act (see SOURCE_SELECTION_2026-11-02.md).
create extension if not exists http with schema extensions;
DO $$
DECLARE
  v_url text := 'https://d.clearquran.com/text/clearquran-allah-edition.txt';
  v_pin constant text := '138b00041d6013f2dd96e84038529044da53748e8c534942af37edd2a4ca3eb5';
  v_body text; v_sha text; v_bad int; v_n int;
BEGIN
  SELECT content INTO v_body FROM extensions.http_get(v_url);
  v_sha := encode(sha256(convert_to(v_body,'UTF8')),'hex');
  IF v_sha <> v_pin THEN RAISE EXCEPTION 'source hash mismatch: %', v_sha; END IF;
  SELECT count(*) INTO v_bad FROM regexp_split_to_table(v_body, E'\r?\n') l WHERE l <> '' AND l NOT LIKE '#%' AND l !~ '^[0-9]{1,3}\|[0-9]{1,3}\|.+$';
  IF v_bad > 0 THEN RAISE EXCEPTION 'unexpected lines: %', v_bad; END IF;
  INSERT INTO translation_editions (code,name,language,translator,provider,provider_version,licence_name,licence_ref,attribution_text,source_sha256)
  VALUES ('clearquran-allah-en-2026-10','Clear Quran (Allah Edition)','en','Talal Itani','clearquran.com','2026-10-09','CC BY-ND 4.0','https://creativecommons.org/licenses/by-nd/4.0/',
          'Translation of the meanings by Talal Itani, ClearQuran.com (CC BY-ND 4.0). A human translation, not the Quran itself.', v_pin);
  INSERT INTO translation_ayahs (edition_code,surah,ayah,text_raw,text_sha256)
  SELECT 'clearquran-allah-en-2026-10', split_part(l,'|',1)::smallint, split_part(l,'|',2)::smallint,
         substr(l, length(split_part(l,'|',1))+length(split_part(l,'|',2))+3),
         encode(sha256(convert_to(substr(l, length(split_part(l,'|',1))+length(split_part(l,'|',2))+3),'UTF8')),'hex')
  FROM regexp_split_to_table(v_body, E'\r?\n') l WHERE l ~ '^[0-9]{1,3}\|[0-9]{1,3}\|.+$';
  SELECT count(*) INTO v_n FROM translation_ayahs WHERE edition_code='clearquran-allah-en-2026-10';
  IF v_n <> 6236 THEN RAISE EXCEPTION 'incomplete: n=%', v_n; END IF;
END $$;
drop extension if exists http;
