# TARTIL 13.0 - Security, Tenant Isolation and Child Safety (state as of 2026-11-03)

> **Correction (verified read-only against Supabase project okbtrogotrtciymmuokr, 2026-11-03):** migrations 0001-0016 ARE applied in production and edge function `api` is at v23; migration 0017 and the `/formation/*` and `/me/reflections` routes are NOT live (probes: `/me/plan`, `/i/*/kids/overview` -> 401; `/formation/sources`, `/me/reflections` -> 404). Any statement below that 0016 (kids academy / plan) is "not applied" or "not live" predates this check and is superseded; it is untested end-to-end live, not unapplied.

Scope: what the repository actually enforces and what was actually tested. Status vocabulary: WORKING, PARTIALLY WORKING, UI ONLY, BROKEN, MISSING, BLOCKED, NEEDS SCHOLARLY REVIEW. "not verified" means I could not confirm it by reading code or running a command in this session. Nothing here changes the code; no production data was modified (only two read-only queries against Supabase: security advisors and `storage.buckets`).

Test basis: every automated test in this repository runs on PGlite (WASM Postgres), not on Supabase (`docs/governance/KNOWN_LIMITATIONS.md` item 7). Live evidence on Supabase is a targeted subset recorded in `docs/SUPABASE.md` (rolled-back transactions and a 31-check journey, `scripts/live/journey_live.py`); I did not re-run those.

## 1. Executive summary

| Area | Status | One-line basis |
|---|---|---|
| Tenant isolation by Postgres RLS | WORKING per test code and earlier recorded runs (not re-run to completion today); live: targeted checks only | `packages/database/test/isolation.test.ts`, 17 tests; live subset in docs/SUPABASE.md |
| Server-side authorisation | PARTIALLY WORKING | RLS is the real gate and is well tested; several handlers do work before the auth check (section 4) |
| Secure upload | PARTIALLY WORKING | Private bucket, 10 MB, audio MIME allow-list verified live; signed-URL flow tested with a fake signer only |
| Audit logs | PARTIALLY WORKING | Immutable and automatic, but only on the tables that have the trigger; reads/exports are not audited |
| Rate limiting | PARTIALLY WORKING | Credential endpoints DB-backed; client IP comes from a spoofable header |
| Guardian approval for minors | PARTIALLY WORKING | DB trigger gates recordings and reflections; no gate on the recitation-analysis endpoint |
| Sessions | PARTIALLY WORKING | 1 h token, revocation works; no refresh, MFA, email verification or recovery |
| Secrets / CSP | PARTIALLY WORKING | No secrets found in the repo; CSP allows `unsafe-inline` scripts |
| Supabase advisors | WORKING | Security advisor: one INFO finding (`rate_limits`, intentional), observed live 2026-11-03 |
| Penetration test | MISSING | Never performed (KNOWN_LIMITATIONS 7) |

## 2. Architecture of the security model

- Identity: own email/password (scrypt, 16-byte salt, 64-byte key; `packages/api/src/auth.ts`) and a hand-rolled HS256 JWT, 1 h, with an issued-at-millisecond claim `im` used for revocation. Not Supabase Auth.
- Two database paths (`packages/api/src/app.ts` `Deps`): `service` (owner role; used only for register, login, email lookup, rate-limit counter, session check) and `app` (used only through `withContext()` in `packages/database/src/context.ts`).
- `withContext()` validates ids as UUIDs, opens a transaction, runs `SET LOCAL ROLE app_user`, and sets `app.user_id` and `app.institution_id` with `set_config(..., true)` (transaction-local, so pooled connections cannot leak identity).
- `app_user` has no ownership, no BYPASSRLS, no superuser. The server refuses to boot otherwise: `assertSafeRoles` in `packages/api/src/pg.ts`, called by the edge entrypoint (`packages/edge/build.mjs`).
- Tenant selection: the institution id comes from the URL (`/i/:inst/...`). A user who is not an active member of that institution sees zero rows because every policy starts with `app.in_context(institution_id)` (membership check), not because the handler checks.
- Supabase specifics (migration `0003_supabase_hardening.sql`): `anon` and `authenticated` lose all privileges on tables, sequences and functions; RLS enabled on `schema_migrations` and `quran_reference_counts`; `app` schema function execute revoked from PUBLIC and granted to `app_user`.
- RLS coverage (counted from the migrations): 27 `FORCE ROW LEVEL SECURITY` statements across 0001-0017. On the live project the advisor reports no table without RLS (section 12).

## 3. RLS and tenant isolation tests (packages/database/test)

Files: `isolation.test.ts`, `halaqat.test.ts`, `tracks.test.ts`, `formation.test.ts` (plus `canon`, `concepts-load`, `hosting-and-import`, `tanzil-real` which cover Quran text and import, not isolation).

| Property | Test (file:line of the `test(` declaration) | Status |
|---|---|---|
| `app_user` unprivileged | isolation.test.ts:14 | WORKING |
| No identity context -> nothing visible in 8 core tables | isolation.test.ts:25 | WORKING |
| Forged institution id (user not a member) -> nothing visible | isolation.test.ts:30 | WORKING |
| Admin of A sees only A; cannot insert into B (own context or forged B context) | isolation.test.ts:35, :40 | WORKING |
| Qari sees only assigned students; guardian only verified-linked child; student only self | :45, :50, :55 | WORKING |
| Same person, two institutions: role in A grants nothing in B | :59 | WORKING |
| `users`: no email/password column exposed to `app_user` | :64 | WORKING |
| Cross-tenant foreign keys impossible even for the owner role | :116 | WORKING |
| Halaqah visibility limited to members, verified guardian, own qari, admin | halaqat.test.ts:25 | WORKING |
| Attendance of another tenant cannot be created or read | halaqat.test.ts:51 | WORKING |
| Assessments: only assigned qari, immutable, never machine-authored | halaqat.test.ts:58 | WORKING |
| Students cannot see draft tracks; only assigned qari marks progress; certificate rules | tracks.test.ts:19, :28, :37 | WORKING |
| AI suggestions invisible to the student until a human accepts | tracks.test.ts:48 | WORKING |
| Formation tables: reviewers-only source records; owner-only reflections; observations limited to learner/author/verified guardian/linked teachers; no cross-learner comparison surface | formation.test.ts:40, :114, :195, :210, :237 | WORKING (local only; migration 0017 is not applied live) |

Mutation verification: PROJECT_STATE.md states isolation was "mutation-verified" (Supabase hardening "tested incl. mutation"). I did not repeat any mutation run: not verified by me.

Not covered by any DB-level isolation test (checked by reading test names): migrations 0007 (`rate_limits`), 0009 (hifz/quiz own-rows), 0011 (translations), 0013 (recitation attempts), 0014 (homework, 6 tables), 0015 (study plans), 0016 (kids). Homework, kids and plans are exercised only through the API tests in section 4.

## 4. Server-side permissions (API tests and code review)

Observed pattern: handlers call `tenant()` -> `withContext()`; a missing/invalid token gives 401, an RLS denial maps to 403, a row invisible to the caller gives 404 (`mapError` in `app.ts`; SQL text is never returned).

Role checks beyond RLS exist for admin endpoints (`/roster`, `/members/:id/status`, `/overview-stats`, `/audit-trail`: explicit `tenant_admin` lookup inside the RLS transaction, `app.ts` ~585-636). The last active admin cannot be suspended.

API tests that assert denials: `admin.test.ts:35-49,72` (non-admin 403 on admin routes), `journey.test.ts:48-54,67-69`, `homework.test.ts:37-58,75,87-89,147`, `kids.test.ts:40-55`, `halaqah.test.ts:35-58`, `formation.test.ts` (API) lines 33-71, 136-163.

Findings from code review (not covered by a test unless stated; none exercised against a live server by me):

1. AI-suggestion generation runs before authorisation. In `POST /i/:inst/ai-suggestions/generate` (`app.ts` ~533-540) `ai.suggest(prompt)` calls the external model, and only afterwards `tenant()` checks the token. An unauthenticated caller who guesses a UUID path can spend the owner's model quota; the answer is then a 401. Bounded only by the per-process 240/min limiter keyed on a spoofable header (section 7). Severity: medium (cost abuse). Status: BROKEN as an authorisation order.
2. Email-existence oracle. `POST /i/:inst/members` looks up the user by email with the service role before `tenant()` (`app.ts` ~153-157): unknown email gives 404 `user_not_found`, known email proceeds to 401/403. Also `/auth/register` returns 409 `already_exists` on duplicate email. Severity: low-medium (account enumeration).
3. A tenant admin can grant any role including `scholarly_reviewer` to anyone via `POST /i/:inst/members` (`ROLES` includes it). Already acknowledged in KNOWN_LIMITATIONS 40; the scholarly gate is only as strong as that appointment. The two newer review roles are deliberately not assignable this way (formation tests).
4. Guardian verification is an admin assertion. `guardian_links_write` lets `tenant_admin` or `safeguarding_officer` create and verify any link (`0001_foundation.sql` line ~208). A verified guardian can then grant consents. There is no identity proof of guardianship (KNOWN_LIMITATIONS 18).
5. Institution creation and registration are open to anyone who ticks an 18+ box (`/auth/register`, `adultConfirmed: literal(true)`); no email verification.

## 5. Scenario F: teacher/institution denied access to another party's data

Question: is the refusal of a teacher's or institution's access to another institution's (or another teacher's) data covered by an actual test? Answer: YES at database and API level, on PGlite; NO as a browser end-to-end test; and live only as a targeted manual check.

The text of "Scenario F" from the owner's document is not in the repository (grep of `docs`, `scripts`, tests and trackers for "Scenario F" / "Journey F" returned nothing; the only reference is "browser E2E for journeys A-G" listed as absent in `docs/10_FUNCTIONAL_QA.md:12` and KNOWN_LIMITATIONS 36). I interpret it as the cross-party denial described in the task. Evidence:

| Denial | Test | Level |
|---|---|---|
| Other institution's admin: 0 students of ours, 403 on adding members to ours, our admin sees 0 in theirs | `packages/api/test/journey.test.ts:67-69` | API + RLS |
| Admin of A cannot insert into B, in A's or a forged B context | `packages/database/test/isolation.test.ts:40` | DB |
| Forged tenant context (non-member) -> 0 rows in 5 tables | `isolation.test.ts:30` | DB |
| Another institution's attendance/session invisible, cross-tenant write rejected | `packages/database/test/halaqat.test.ts:51` | DB |
| Unrelated teacher in the same institution cannot read or review homework (404) | `packages/api/test/homework.test.ts:54, :89` | API + RLS |
| Outsider/other-tenant sees no homework (404 / 0 rows) | `homework.test.ts:53, :58` | API + RLS |
| Another teacher cannot read a child's kids-academy progress; other tenant sees 0 | `packages/api/test/kids.test.ts:46, :50` | API + RLS |
| Another qari cannot mark attendance or assess a student that is not theirs; other tenant sees no halaqat | `packages/api/test/halaqah.test.ts:42, :50, :57-58` | API + RLS |
| Observation by a non-linked teacher refused (403); admin and other teachers cannot read learner observations | `packages/api/test/formation.test.ts:155`; `packages/database/test/formation.test.ts:210` | API + DB (local only) |
| Audio URL of a submission is 404 for an outsider | `journey.test.ts:50-51` | API + RLS |

Result of my run: not completed, see section 13; the claim rests on reading the tests. Live (Supabase) evidence for the same property is the rolled-back transaction check in `docs/SUPABASE.md` ("admin of tenant A sees 0 rows of tenant B ... cannot insert a member into B ... forged tenant context returns 0 rows"); that check predates migrations 0006-0017, so tables added later (halaqat, homework, kids, plans) have no live isolation check: not verified live. Not tested anywhere: a teacher who holds roles in two institutions reading across them through the API for the newer tables (the DB test `isolation.test.ts:59` covers only the core tables).

## 6. Secure upload

Two audio paths exist:

| Path | Design | Status |
|---|---|---|
| Student submission audio (`/i/:inst/submissions/:id/upload-url`, `/audio-url`, `app.ts` ~212-231) | Private bucket `recitations`; object path derived server-side `<inst>/<student>/<submission>.webm`, never client-chosen; upload URL only for the submitting student (403 otherwise); download URL 60 s, only to those RLS lets see the submission | PARTIALLY WORKING |
| Personal tasmi' (`POST /me/recitations/analyze`, `app.ts` ~326-345) | Audio is base64 in the body; size limits (12 MB body, 8 MB audio), magic-byte sniffing (webm, ogg, wav, m4a, mp3) instead of trusting the declared type; audio is not stored; sent to an external speech-to-text provider | PARTIALLY WORKING |

Verified live today (read-only query on `storage.buckets`): bucket `recitations`, `public=false`, `file_size_limit=10485760`, allowed MIME `audio/webm, audio/ogg, audio/mp4, audio/mpeg, audio/wav`. So size and type limits are enforced by Storage itself, not only by the API response field `maxBytes`.

Gaps:
- The upload path has API tests with a fake signer only (`journey.test.ts:44-51`); real browser microphone upload against the live bucket was never exercised (docs/SUPABASE.md "batch 2": "NOT yet exercised in a real browser").
- Storage object policies (RLS on `storage.objects`) were not inspected by me: not verified. Access relies on the service-role key held by the function.
- No malware or content scanning of uploads; no retention or deletion job for audio; deleting a submission does not delete the object (not verified, no code found for it).
- The tasmi' endpoint has no minor/guardian gate and no check against `ai_analysis` consent: the only "consent" is a client-supplied `consentExternalProcessing: true` flag (`app.ts` ~328). A minor account could send a voice recording to the external provider. See section 9.
- Live external speech-to-text currently returns HTTP 429 (KNOWN_LIMITATIONS 37), so this path is BLOCKED end-to-end live regardless.

## 7. Rate limiting

- Credential endpoints (`/auth/*`): shared counter in table `rate_limits` (migration 0007), default 10 per minute per IP; test `packages/api/test/basmala.test.ts:21` asserts the 11th login attempt is 429 with `Retry-After`. WORKING (PGlite).
- Other routes: in-memory per-isolate map, 240/min per IP (`app.ts` ~80-98). On serverless edge instances this is not a global limit. PARTIALLY WORKING.
- The client IP is the first value of `X-Forwarded-For` (`app.ts` line ~84). A client can set that header itself, so both limits can be bypassed by rotating its value unless the platform overwrites it. Whether Supabase Edge or the Vercel rewrite overwrites it: not verified. Already noted in docs/SUPABASE.md.
- No per-account lockout, no CAPTCHA, no limit on expensive paid calls (AI suggestions, speech-to-text) other than the above.
- Tests disable limits (`rateLimit: { auth: 100000, general: 100000 }`) in most suites, so no test exercises the general limiter: MISSING test.

## 8. Audit logs

- Table `audit_logs` (`0001_foundation.sql`): written by a SECURITY DEFINER trigger `app.audit_row()` (action, object type, object id, actor from the context); UPDATE/DELETE blocked by trigger `audit_logs_no_change` with SQLSTATE 42501; readable only by `tenant_admin` and `safeguarding_officer` of that institution. Test: `isolation.test.ts:122`; `halaqat.test.ts:78` (attendance and assessments audited). WORKING on PGlite; live: "audit_logs UPDATE is rejected" checked in docs/SUPABASE.md.
- Tables with the trigger (by grep): memberships, guardian_links, qari_assignments, consents, recitation_submissions (0001); halaqat, halaqah_members, attendance, assessments (0006); learning_tracks, unit_progress, certificates, ai_suggestions (0008); homework_assignments, homework_recipients, homework_reviews (0014).
- Deliberately NOT audited: formation tables (0017 header: "no audit trigger on these tables") to avoid logging private reflection text. Not audited and not discussed in any doc I read: kid_attempts, kid profiles (0016), study_plans (0015), hifz (0009), recitation attempts (0013), login success/failure, token revocations, password changes, and any READ of child data. For a child-safety product the absence of read/access auditing for minors' records is a gap.
- The audit row stores no before/after values (only action, object id), so it shows that something changed, not what.
- An admin API (`/i/:inst/audit-trail`) lists entries; tested for non-admin refusal at `admin.test.ts:37`.
- The database owner role (Supabase `postgres`) bypasses RLS and could in principle alter the table definition or triggers; no external log shipping or tamper evidence: MISSING.

## 9. Guardian consent for minors

Enforced in the database, not in the UI:
- A minor's recitation submission needs a live (unrevoked, unexpired) `audio_recording` consent; trigger `submissions_consent` (`0001`); tested `isolation.test.ts:71` (revoke/expiry/un-revoke) and the API journey `journey.test.ts:34-65` (409 `guardian_consent_required`, 409 again after revoke).
- A revoked consent cannot be re-activated (trigger `consent_no_unrevoke`); a new row is needed. Consent rows are readable by the student, the verified guardian and the admin/safeguarding officer, not by qaris (`isolation.test.ts:91`).
- Only a verified guardian (or an adult student for themself) can insert or revoke a consent (`consents_insert`, `consents_revoke` policies); a guardian's attempt before verification is 403 (`journey.test.ts:34`).
- Live halaqah join requires a verified guardian for minors (`app.ts` ~561; `halaqah.test.ts`). Live sessions use an external Jitsi link that is not recorded; a leaked link cannot be technically blocked (KNOWN_LIMITATIONS 16).
- Reflections (0017): minor in band c only, verified guardian and live `reflection_journal` consent; `formation.test.ts:139` (DB) and API tests; local only.
- Homework, kids progress, study plans: visibility limited to the student, their teacher and verified guardian (API tests in section 5). I did not find a consent requirement for them beyond relationship.

Gaps:
- `/me/recitations/analyze` and `/i/:inst/ai-suggestions/generate` do not check `ai_analysis` consent or minor status in the handler; the `ai_analysis` purpose exists in the consent enum but the code path I read does not look it up (grep of `ai_analysis` in `app.ts` finds only the enum). KNOWN_LIMITATIONS 15 and 22 say minors' data must not be sent until the owner decides; the code does not enforce that. Status: MISSING enforcement.
- No birth date is stored (ADR-008); `is_minor` is set by the admin when creating the profile. Ages 15-17 have no band for reflections (KNOWN_LIMITATIONS 40).
- No guardian identity proof; no safeguarding reporting workflow; no per-jurisdiction legal review (COPPA/GDPR-K) (KNOWN_LIMITATIONS 9, 18).
- Child-data retention and deletion policy is undefined (owner decision).

## 10. Sessions and credentials

| Property | Evidence | Status |
|---|---|---|
| Password hashing scrypt with salt, constant-time compare, timing equalised for unknown users | `auth.ts` | WORKING |
| Password minimum 10 characters | `app.ts` register / change-password | WORKING (no breach-list or complexity check) |
| Token 1 h, HS256, validated signature and expiry | `auth.ts`, `verifyToken` | WORKING |
| Logout-all and change-password revoke older tokens on the next request (`users.sessions_valid_after`) | `app.ts` hook; live smoke recorded in docs/SUPABASE.md | WORKING |
| Refresh tokens, device list, MFA, email verification, password recovery | KNOWN_LIMITATIONS 1, 14, 17 | MISSING |
| Suspended member: access removed via RLS, but token stays valid for other institutions | KNOWN_LIMITATIONS 29 | PARTIALLY WORKING |
| JWT secret on the edge function is `sha256('tartil-jwt-v1:' + SUPABASE_SERVICE_ROLE_KEY)` (`packages/edge/build.mjs`) | code | Works, but ties token forgery resistance to that one key; rotating the service key invalidates all sessions. Owner awareness needed |
| Web token storage | `sessionStorage` key `t` (`packages/web-vercel/index.html` ~367-374) | Readable by any script on the page, so XSS = account takeover; mitigated partly by the CSP (section 11) |
| Login error does not reveal whether the email exists | `app.ts` `/auth/login` returns 401 `invalid_credentials` for both | WORKING |

Note the revocation check is skipped for `/auth/login` and `/auth/register` only; it costs one service-role query per authenticated request (performance, not security).

## 11. Secrets, CSP and headers

Secrets:
- A grep for `sk-`, `eyJ`, `SERVICE_ROLE_KEY` in packages, docs and scripts matched only code that reads environment variables (`packages/edge/build.mjs`, `packages/edge/dist/index.ts`) and CSS strings in the two HTML files (false positives); no literal secret found. Reading is by pattern only; a complete secret scan (e.g. gitleaks) was not run: not verified. Git history could not be checked because the directory is not a git repository here.
- Live secrets are held as Supabase function secrets: `OPENAI_API_KEY` (KNOWN_LIMITATIONS 22), service role key (injected by the platform). `JWT_SECRET` in `docs/SUPABASE.md` is described for the Node deployment only.
- The edge function runs with `verify_jwt=false` (public by design; docs/SUPABASE.md); the whole security perimeter is therefore the application code plus RLS.
- Both `service` and `app` handles in the edge function are the same pool on `SUPABASE_DB_URL` (`build.mjs`: `buildApp({ service: db, app: db, ... })`), i.e. the privileged role, with the app path forced down by `SET LOCAL ROLE app_user`. This is safe only while every tenant read goes through `withContext()`; the code has direct `d.service.query` calls for register/login/members/rate-limit/session checks, which are the places where a mistake would bypass RLS. Not independently audited line by line beyond the files read for this document.

CSP and headers (`packages/web-vercel/vercel.json`, applied to `/(.*)`):

| Header | Value summary | Assessment |
|---|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; connect-src self, the Supabase project, www.mp3quran.net, cdn.jsdelivr.net, raw.githubusercontent.com; media-src self blob: Supabase, *.mp3quran.net; frame-ancestors 'none'` | PARTIALLY WORKING. `script-src 'unsafe-inline'` removes most of the XSS protection (the SPA is one inline-script file). No `base-uri`, `form-action` or `object-src` directives. `frame-ancestors 'none'` blocks clickjacking. |
| X-Content-Type-Options | nosniff | WORKING |
| Referrer-Policy | no-referrer | WORKING |
| Permissions-Policy | microphone=(self), camera=(), geolocation=() | WORKING |
| HSTS | not set in `vercel.json` | not verified (Vercel adds one on its own domains; custom domain not decided) |
| `/academy*.json` | `X-Robots-Tag: noindex`, `Cache-Control: no-store` | WORKING |

- Rewrite `/api/:path*` -> Supabase function; same origin from the browser's viewpoint, so no CORS configuration exists or is needed. Direct calls to the function URL are possible by anyone (public function).
- Client-side injection: `innerHTML` appears 7 times in `packages/web-vercel/index.html`; the lines I inspected (404-443) assign static SVG markup; user-supplied text goes through DOM builders (`el(...)`). I did not audit all 7 sites nor every `el()` call: not verified as a whole.
- Third parties receive requests directly from the browser (mp3quran.net, jsDelivr/raw.githubusercontent, Google Fonts) and, server-side, OpenAI; with `Referrer-Policy: no-referrer` the page URL is not leaked, but IP addresses are. A privacy notice for children's use is an owner/legal item.
- The project (Vercel `tartil-web`) is behind Vercel Authentication and not public (docs/SUPABASE.md); making it public is an owner decision.

## 12. Supabase advisors

Source: `docs/SUPABASE.md` (earlier runs) and a fresh read-only call to the security advisor for project `okbtrogotrtciymmuokr` on 2026-11-03:

| Lint | Level | Finding | Disposition |
|---|---|---|---|
| `rls_enabled_no_policy` | INFO | `public.rate_limits` has RLS enabled and no policy | Intentional: reachable only by the service path (migration 0007); not a gap |

That is the only security finding returned (this matches PROJECT_STATE "2026-11-02 advisor pass"). Earlier findings (mutable `search_path` on invoker functions, migration 0004; two more in 0012; FK indexes) are recorded as fixed. The performance advisor was not re-run by me: earlier notes record only INFO/WARN items (unused indexes, multiple permissive policies on `scholarly_items`) that were left deliberately. Caveat: the advisor sees the live schema, which is at migration 0015 or below; migrations 0016 and 0017 are NOT applied (KNOWN_LIMITATIONS 39-40), so their tables have never been reviewed by the advisor. Whether 0015 itself is applied: PROJECT_STATE text is cut off on this point; not verified.

## 13. Test run (this session)

Command: `npm test --workspaces --if-present` in `/home/claude/quran-global-platform` (PGlite, no production access).

Result: NOT COMPLETED, so this document asserts no pass/fail count from this session. The machine was heavily loaded (load average above 40 from concurrent test processes). In the API workspace run, 4 tests were reported `ok` before it stalled: `admin.test.ts` (2 tests: admin console, last-admin protection), `basmala.test.ts` (2 tests, including the credential rate limit at line 21). `test/formation.test.ts` and `test/halaqah.test.ts` of the API workspace were reported `not ok` with `signal: 'SIGKILL'` and `failureType: testCodeFailure` after about 57 s; that signature points to the process being killed under resource pressure, not to an assertion failure, but I did not confirm the cause. A targeted re-run of the database `isolation.test.ts` and `halaqat.test.ts` (`tsx --test --test-concurrency=1`) did finish later, after I had assumed it stalled: 23 tests, 23 pass, 0 fail (`# tests 23`, `# pass 23`, `# fail 0` from the background task result; I did not read the TAP file for per-test names). That confirms the DB isolation and halaqat tests cited in section 3 and Scenario F rows at isolation.test.ts and halaqat.test.ts on PGlite today. API-level tests (journey, homework, kids, halaqah, formation) were not confirmed green today. Therefore every "WORKING" entry in sections 3-5 rests on reading the tests and on the counts recorded by earlier sessions (PROJECT_STATE: DB 49/49, API 50/50 on 2026-11-03; docs/governance/TEST_RESULTS.md was not read), not on a green run today. Re-run `npm test` on an idle machine before relying on them.

## 14. Security gaps register

Legend: Fix = engineering, can be done without a decision; Owner = needs an owner decision.

| # | Gap | Type | Severity | Basis |
|---|---|---|---|---|
| G1 | AI-suggestion generation calls the external model before authenticating the caller | Fix | Medium | `app.ts` ~533-540 |
| G2 | `/me/recitations/analyze` and AI generation have no minor / `ai_analysis` consent gate; the flag is client-supplied | Fix + Owner (data-protection policy) | High for a child platform | `app.ts` ~326-345; KNOWN_LIMITATIONS 15, 22 |
| G3 | Rate-limit key trusts client `X-Forwarded-For` | Fix (after confirming platform header behaviour) | Medium | `app.ts` ~84 |
| G4 | Email enumeration via `/members` and `/auth/register` | Fix | Low-Medium | `app.ts` ~153, 119 |
| G5 | CSP allows `unsafe-inline` scripts; no `base-uri`/`form-action`/`object-src`; token in `sessionStorage` | Fix (needs refactor of inline script to nonce/hashes) | Medium | `vercel.json`, `index.html` |
| G6 | No MFA, email verification, recovery, refresh tokens | Fix + Owner (email provider) | Medium | KNOWN_LIMITATIONS 1, 14, 17 |
| G7 | Tenant admin can self-assign `scholarly_reviewer`; guardian links are admin-asserted | Owner (appointment and verification procedure) | Medium | KNOWN_LIMITATIONS 40; `0001` line ~208 |
| G8 | Audit covers a subset of tables; no read/access audit; no old/new values; no external tamper evidence | Fix + Owner (retention) | Medium | section 8 |
| G9 | Isolation tests do not cover 0007, 0009, 0011, 0013-0016 at DB level; no live isolation check since 0006 | Fix (tests) | Medium | section 3 |
| G10 | Full suite never run on Supabase itself; `pg.ts` never run against a real pooled server except via the deployed function; API-process-through-pooler with real roles not verified | Fix | Medium | KNOWN_LIMITATIONS 7; docs/SUPABASE.md |
| G11 | Upload path never exercised with a real microphone and live bucket; storage object policies not inspected; no virus scan; no audio retention/deletion | Fix + Owner (retention) | Medium | section 6 |
| G12 | `service` and `app` share one owner-role pool on the edge; correctness rests on `withContext()` discipline | Fix (separate login role for the app path) | Medium | `build.mjs` |
| G13 | Migrations 0016/0017 not applied live, never advisor-reviewed | Owner (go-live) | n/a | KNOWN_LIMITATIONS 39-40 |
| G14 | No penetration test, no external security review, no dependency/secret scan run | Owner (budget) + Fix | Medium | KNOWN_LIMITATIONS 7 |
| G15 | Child-data retention and deletion policy, named safeguarding lead, per-jurisdiction legal review | Owner | High before any real child | KNOWN_LIMITATIONS 9, 18, 40 |
| G16 | Reflection text readable by database administrator and present in backups; no application-level encryption | Owner (risk acceptance) or Fix | Medium | KNOWN_LIMITATIONS 40 |
| G17 | The general rate limiter has no test; per-isolate only | Fix | Low | section 7 |
| G18 | Scenario F has no browser end-to-end test; journeys A-G have none | Fix | Medium | `docs/10_FUNCTIONAL_QA.md:12` |

## 15. What was not tested

- Anything on a real Supabase instance beyond the two read-only queries in this session (advisors, bucket config).
- Any behaviour in Safari/iOS, with a screen reader, or with a real microphone.
- Token forgery attempts, SQL-injection fuzzing, XSS fuzzing, SSRF, header-spoofing against the live edge function, brute-force against live login.
- Backup/restore (PITR), key rotation, incident response.
- Supabase storage policies and network restrictions.
- The behaviour of the Vercel Authentication layer relative to the API rewrite.

## 16. Owner decisions required (not taken here)

1. Public launch and removal of Vercel Authentication.
2. Whether any minor's data may reach the external AI/speech provider; written data-protection stance (GAP G2).
3. Child-data retention/deletion policy; named safeguarding lead; legal review per jurisdiction.
4. Appointment of reviewers (scholarly, pedagogical, child protection) and how guardian identity is verified.
5. Email provider (verification, recovery, notifications) and MFA policy.
6. Budget for an external penetration test and for a separate live-session video infrastructure.
7. Audio retention period and deletion rules for recordings.

## Evidence

Files read: `CLAUDE.md`, `PROJECT_STATE.md`, `docs/governance/KNOWN_LIMITATIONS.md`, `docs/SUPABASE.md`, `packages/api/src/{app.ts,auth.ts,pg.ts}`, `packages/database/src/context.ts`, `packages/database/migrations/0001_foundation.sql`, `0003_supabase_hardening.sql`, `0010_scholarly_review.sql` (header), grep over migrations 0001-0017 for audit triggers and RLS/FORCE counts, `packages/edge/build.mjs`, `packages/web-vercel/vercel.json`, `packages/web-vercel/index.html` (token storage, innerHTML sites), tests `packages/database/test/{isolation,halaqat,tracks,formation}.test.ts` (test names and cited assertions), `packages/api/test/{journey,admin,homework,kids,halaqah,formation,basmala}.test.ts` (cited lines).

Commands run: `npm test --workspaces --if-present` (output in the session scratchpad, `npmtest13.txt`); `grep` counts of `FORCE ROW LEVEL SECURITY`, `ENABLE ROW LEVEL SECURITY`, `audit_row` triggers; secret-pattern grep; Supabase MCP `get_advisors` (security) and `execute_sql` `select ... from storage.buckets` on project `okbtrogotrtciymmuokr` (both read-only).

## Open items

- Re-run the live isolation check against all tables created after 0006 once 0016/0017 are applied.
- Decide and implement G1-G4 (small code fixes) and G12 (separate app login role).
- Write the Scenario F browser journey (two institutions, two teachers) and run it against a staging Supabase.
- Obtain the owner's original text of Scenario F to confirm it matches the interpretation in section 5.
- Inspect `storage.objects` policies and run a full secret scan including history.
- Confirm how `X-Forwarded-For` is set by Supabase Edge behind the Vercel rewrite.
