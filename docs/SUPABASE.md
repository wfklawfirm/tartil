# Deploying on Supabase (checklist - not yet executed; no Supabase project was touched)

1. **Create project** (choose region near users; owner action). Keep the Data API for `public` OFF if possible (Settings -> API -> exposed schemas) - defence in depth; migration 0003 already strips `anon`/`authenticated` privileges.
2. **Apply migrations in order** `packages/database/migrations/0001..0003` as the `postgres` role (SQL editor or `psql`). Never edit an applied file; add 0004+.
3. **Allow role switching**: `GRANT app_user TO postgres;` (and to any dedicated service login you create). The API does `SET LOCAL ROLE app_user` inside each transaction.
4. **Two connection strings**
   - `SERVICE_DATABASE_URL`: owner/service role - used ONLY for register/login/bootstrap/email lookup.
   - `APP_DATABASE_URL`: same DB; used only through `withContext`. The pooler in **transaction mode** is fine because identity is set with `SET LOCAL`/`set_config(..., true)` inside a transaction (never session-level).
5. **Secrets**: `JWT_SECRET` (>= 32 random chars) from the host secret store. Never commit.
6. **Start check**: server refuses to boot unless `assertSafeRoles` passes (app path is `app_user`, not owner/superuser/BYPASSRLS).
7. **Before launch**: run the isolation suite against the real instance (copy `test/isolation.test.ts` fixtures to a staging DB), enable PITR backups, and review Supabase advisors (security) output.
8. **Auth note**: we use our own email+password+JWT for now. Moving to Supabase Auth later means mapping its `sub` to `users.id` in `authUser()` only; RLS needs no change because it keys off `app.user_id`.
Open risk: the pg adapter (`packages/api/src/pg.ts`) is untested against a live server.
