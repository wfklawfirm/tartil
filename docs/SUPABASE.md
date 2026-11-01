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

## Deployment record (2026-11-01)
- Project `tartil`, ref `okbtrogotrtciymmuokr`, eu-central-1, Postgres 17.
- Applied via MCP in order: 0001, 0002, 0003, 0004. Deviation: on Supabase 0003 was applied with `ALTER TABLE IF EXISTS schema_migrations` (that table belongs to our local runner and does not exist there; Supabase tracks migrations itself). The repo file 0003 is unchanged.
- Verified on the real instance: all 13 public tables have RLS enabled; anon and authenticated hold no SELECT on any of them; security advisor flagged only mutable search_path on 8 invoker functions, fixed by 0004.
- NOT yet verified on the real instance: the isolation test suite (needs a direct DB connection string), app_user membership grant for the connecting role.
- Quran text NOT imported: fetching Tanzil from inside the DB returned SHA-256 bf4f57b9...12c8 (743004 chars) instead of the pinned 6933e133...ec5f, so the import was refused. quran_ayahs is empty. Cause not yet determined (version/line-ending/format difference); do not import until the hash matches or the owner re-pins a new verified file.

### Update: cause of the Tanzil hash mismatch (2026-11-01)
The file Tanzil serves today under the same label ("Uthmani, Version 1.1", 6236 ayat, same format) is a DIFFERENT text from our pinned file (SHA-256 6933e133...ec5f, 1,396,087 bytes; served copy 1,370,878 bytes). Confirmed differences: (1) our pinned file contains 6,848 U+0640 tatweel characters (e.g. in "الرحمـٰن") that the served copy lacks; (2) after removing tatweel, surahs 1 and 114 match but many ayat elsewhere (e.g. 2:2, 2:4, 2:5, 2:7, 2:8, 2:10, 2:13, 2:19, 2:20) still differ in diacritic/pause-mark encoding. So Tanzil changed its served file in place without changing the version label.
Decision: the pinned file stays the reference; the served copy is NOT imported. Choosing a different text revision is a scholarly/owner decision, not an engineering one. The pinned file must reach the database by a path that preserves its bytes (direct DB connection string with the owner's password, or an owner-approved private location the DB can fetch from).

### Resolution: Quran text imported (2026-11-01)
- Root cause refined: not a new Tanzil revision. Tanzil's download endpoint serves different text depending on options. The pinned file corresponds to `marks=true&tatweel=true&sajdah=true`; with those options the live endpoint returns the pinned file with the exact SHA-256 6933e133...ec5f.
- Imported inside the database by a hash-gated script (`scripts/supabase/import_tanzil.sql`): aborts unless the downloaded bytes match the pinned hash. Result on project okbtrogotrtciymmuokr: 1 edition `tanzil-uthmani-hafs-1.1`, NOT_APPROVED; 6236 ayat; 0 gaps vs reference counts; concatenated ayah text hash 7f429d48...08de equals the local file's, i.e. byte-identical content; 0 row-hash mismatches; UPDATE and DELETE on quran_ayahs raise 42501.
- `GRANT app_user TO postgres;` applied (needed for SET ROLE in withContext on Supabase).
- Migration 0005 (FK indexes; per-command write policies instead of FOR ALL) tested locally (27/27) and applied. Advisors after: security 0 findings; performance only INFO (indexes unused because the DB is empty; Auth connection strategy).
- Verified on the real instance (rolled-back transaction, no data left): admin of tenant A sees 0 rows of tenant B (profiles, users, memberships), cannot insert a member into B, forged tenant context returns 0 rows, student cannot self-promote, a minor's recitation without guardian consent is rejected, audit_logs UPDATE is rejected, app_user sees 0 editions/ayahs while the edition is NOT_APPROVED.
- Still NOT verified: the API process connecting through Supabase's pooler with the two real roles (needs connection strings + JWT secret, owner-held); the 27+4 suites were run on PGlite, not on Supabase itself (the checks above are a targeted subset executed on Supabase).

## Update 2026-11-01 (late): migration 0006, edge API, web client
- Migration 0006 (halaqat, sessions, attendance, assessments) applied to Supabase. `assessments.assessor_kind` is CHECK 'human_qari'; assessments are insert-only.
- API runs as Supabase Edge Function `api` (Fastify via `app.inject()` in `Deno.serve`). Bundle generated by `packages/edge/build.mjs` from the real sources; deployed by pasting the generated files through the Supabase MCP. The deployed copy has comments stripped (comment-only drift from `dist/`).
- Live evidence: `scripts/live/journey_live.py` (31 checks) passed against the deployed function; test rows were then removed (institutions/users/audit = 0; ayat 6236; editions 1).
- Web client: `packages/web-vercel` deployed to Vercel project `tartil-web` (production). `/api/*` is rewritten to the Supabase function; verified: `/api/quran/editions` returns `{"editions":[]}` through the rewrite. The project is behind Vercel Authentication (not public). Making it public is an owner decision.
- Limits: both DB paths use one owner-role pool (app path guarded by SET LOCAL ROLE + assertSafeRoles); API is publicly reachable (verify_jwt=false) with open registration and no rate limiting; JWT 1h, not revocable; full test suites ran on PGlite, not on Supabase; Quran edition is NOT_APPROVED so the reader shows "unavailable".

## Update 2026-11-01 (night): approval, basmala display, rate limit
- Edition `tanzil-uthmani-hafs-1.1` set to APPROVED on Supabase by the platform owner (approved_by = "Wissam Khaled (platform owner) - PROVISIONAL approval 2026-11-01, pending independent scholarly audit"). This is NOT a scholarly approval; an independent audit against the Al-Azhar / King Fahd Complex mushaf is still required (see docs/QURAN_VERIFICATION.md). Revert with an UPDATE to NOT_APPROVED if the audit fails.
- Read API strips the 4-word basmala prefix from ayah 1 (surahs other than 1 and 9) for display only; stored text unchanged. Test: exactly 112 surahs stripped against the real file.
- Migration 0007 `rate_limits`: credential endpoints (/auth/*) limited to 10/min per client IP using a shared DB counter (works across edge instances). Limitation: keyed on the first X-Forwarded-For value, which can be spoofed by a client; other routes use a per-process best-effort limit (240/min).
- Function `api` is at version 6.

## Update 2026-11-01 (batch 1): family view
- API function v7: added GET /i/:inst/guardian-links and GET /i/:inst/consents (RLS-filtered). Web client: "الأسرة والموافقات" (link/verify guardian, grant/revoke consent) and read-only submissions list. Audio upload is NOT implemented.
- GitHub repo wfklawfirm/tartil (private) is connected to Vercel; production branch master, root packages/web-vercel.

## Update 2026-11-01 (batch 2): audio submissions
- Private Storage bucket `recitations` (no public access, 10 MB, audio MIME only). API function v8: POST /i/:inst/submissions/:id/upload-url (submitting student only) and GET .../audio-url (anyone RLS lets see the submission; 60 s signed URL). Object path is derived server-side: <inst>/<student>/<submission>.webm.
- Web client: student recorder (MediaRecorder) + playback. NOT yet exercised in a real browser with a microphone against the live bucket; the API paths are unit-tested with a fake signer only. Minors: DB consent trigger still gates the submission row.
- vercel.json CSP now allows the Supabase origin for connect/media, and Permissions-Policy microphone=(self).
