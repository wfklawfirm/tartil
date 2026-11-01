-- Reproducible, hash-gated import of the pinned Tanzil edition INTO Supabase (run via SQL editor / MCP execute_sql as the project owner).
-- The download URL options matter: marks=true&tatweel=true&sajdah=true reproduces the pinned file byte-for-byte.
-- Without them Tanzil serves a different text (no pause marks, no tatweel) and this script aborts on the hash check.
-- Imports as NOT_APPROVED. Religious approval is a separate human act.
create extension if not exists http with schema extensions;
DO $$
DECLARE
  v_url   text := 'https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true&marks=true&tatweel=true&sajdah=true';
  v_pin   constant text := '6933e133dd56db778c801bf738848454e43648105a151e8d84d86a7cae39ec5f';
  v_body  text; v_sha text; v_bad int; v_n int; v_gaps int;
BEGIN
  SELECT content INTO v_body FROM extensions.http_get(v_url);
  v_sha := encode(sha256(convert_to(v_body,'UTF8')),'hex');
  IF v_sha <> v_pin THEN RAISE EXCEPTION 'source hash mismatch: %', v_sha; END IF;
  SELECT count(*) INTO v_bad FROM regexp_split_to_table(v_body, E'\r?\n') l WHERE l <> '' AND l NOT LIKE '#%' AND l !~ '^[0-9]{1,3}\|[0-9]{1,3}\|.+$';
  IF v_bad > 0 THEN RAISE EXCEPTION 'unexpected lines: %', v_bad; END IF;
  INSERT INTO quran_editions (code,name,riwayah,script_style,provider,provider_version,licence_ref,attribution_text,source_sha256,is_test_fixture)
  VALUES ('tanzil-uthmani-hafs-1.1','Tanzil Uthmani (Hafs an Asim) 1.1','hafs-an-asim','uthmani','tanzil','1.1','https://tanzil.net/docs/Text_License','Quran text: Tanzil Project (tanzil.net)', v_sha, false);
  INSERT INTO quran_ayahs (edition_code, surah, ayah, text_raw, text_sha256)
  SELECT 'tanzil-uthmani-hafs-1.1', split_part(l,'|',1)::smallint, split_part(l,'|',2)::smallint,
         substr(l, length(split_part(l,'|',1))+length(split_part(l,'|',2))+3),
         encode(sha256(convert_to(substr(l, length(split_part(l,'|',1))+length(split_part(l,'|',2))+3),'UTF8')),'hex')
  FROM regexp_split_to_table(v_body, E'\r?\n') l WHERE l ~ '^[0-9]{1,3}\|[0-9]{1,3}\|.+$';
  SELECT count(*) INTO v_n FROM quran_ayahs WHERE edition_code='tanzil-uthmani-hafs-1.1';
  SELECT count(*) INTO v_gaps FROM app.quran_edition_gaps('tanzil-uthmani-hafs-1.1');
  IF v_n <> 6236 OR v_gaps <> 0 THEN RAISE EXCEPTION 'incomplete: n=% gaps=%', v_n, v_gaps; END IF;
END $$;
drop extension if exists http;
