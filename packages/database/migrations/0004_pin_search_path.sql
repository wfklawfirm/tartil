-- 0004: pin search_path on invoker-rights helper functions (Supabase advisor 0011). No behaviour change.
ALTER FUNCTION app.current_user_id() SET search_path = public, pg_temp;
ALTER FUNCTION app.current_institution_id() SET search_path = public, pg_temp;
ALTER FUNCTION app.in_context(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION app.audit_immutable() SET search_path = public, pg_temp;
ALTER FUNCTION app.consent_no_unrevoke() SET search_path = public, pg_temp;
ALTER FUNCTION app.quran_text_is_immutable() SET search_path = public, pg_temp;
ALTER FUNCTION app.quran_check_hash() SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION app.quran_edition_gaps(text) SET search_path = public, pg_temp;
