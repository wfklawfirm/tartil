-- 0003: hosting hardening (safe no-op on plain Postgres).
-- Supabase auto-exposes the `public` schema through its Data API to roles anon/authenticated and grants them default privileges.
-- Our API is the only door: remove every privilege those roles could hold, and make sure no table lacks RLS.
ALTER TABLE quran_reference_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY reference_counts_read ON quran_reference_counts FOR SELECT TO app_user USING (true);
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;      -- no policies => invisible to everyone except the owner

DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON SCHEMA app FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);
    END IF;
  END LOOP;
END $$;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO app_user;      -- policies call these as app_user
