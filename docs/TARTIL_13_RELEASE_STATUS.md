# TARTIL 13.0 - Release status (Definition of Done, draft vs deployable, owner decisions, deploy and verify)

Date of the evidence: 2026-11-03. Scope: what can be released, what is only a draft, what only the owner can decide, and the exact steps to deploy. Nothing here is a release approval. Verdict at the end of section 1.

Status vocabulary: WORKING, PARTIALLY WORKING, UI ONLY, BROKEN, MISSING, BLOCKED, NEEDS SCHOLARLY REVIEW. "not verified" means I did not check it.

## 0. Read this first: two caveats about this document

1. **The ten Definition-of-Done conditions are my working set, not the owner's text.** The owner's TARTIL 13.0 brief (section 24) is not in the repository (`grep -ri "definition of done"` over the repo, excluding node_modules and scholarly-assets: no match). I derived ten conditions from the brief's own demands (audit, keep what works, tested user journeys, honest report) and from `CLAUDE.md` non-negotiables. If the owner's list differs, re-map the table in section 2; the evidence in sections 3 to 6 stays valid.
2. **Several repository documents are stale relative to production.** Section 5 lists them. Production state below comes from read-only probes I ran today, not from those documents.

## 1. Summary

| Question | Answer | Evidence |
|---|---|---|
| Is it a public production release? | No. Private prototype / pilot-ready candidate. | `docs/11_FINAL_RELEASE_READINESS.md`; web is behind Vercel Authentication (HTTP 302 from `tartil-web.vercel.app`, probed) |
| Do automated tests pass? | Yes. Database 49/49, API 50/50, run by me today. | section 3 |
| What is live? | Migrations 0001-0016 and edge function `api` v23 on Supabase `okbtrogotrtciymmuokr`. | Supabase `list_migrations`, `list_edge_functions` (read-only) |
| What is not live? | Migration 0017 and the formation routes. | `GET /me/reflections` and `GET /formation/sources` return 404 on the live function; the same routes exist in `packages/api/src/app.ts` |
| Is any content human-reviewed? | No. No scholarly, pedagogical or child-protection reviewer is appointed. | `PROJECT_STATE.md`, `KNOWN_LIMITATIONS.md` 26, 40 |
| Is the speech-to-text analysis working live? | BLOCKED. Last recorded live result is HTTP 429 from the provider. | `KNOWN_LIMITATIONS.md` 37, 38; not re-tested by me (needs a real call that spends the owner's quota) |

**Verdict:** the technical core (Quran reader, hifz, tracks, halaqat, homework, kids sync, plans) is deployable and mostly deployed. The educational content (Human Formation Academy, Kids Academy, foundations, tajweed library, templates) is DRAFT and must not be presented as approved. The Formation engines backend is built and tested locally and must stay undeployed until the owner decisions in section 4 (rows 1-4) are made.

## 2. Definition of Done applied to each module

### 2.1 The ten conditions (working set)

| Id | Condition |
|---|---|
| D1 | Implemented: code exists in the repository |
| D2 | Wired end to end: UI calls API, API uses the DB through `withContext()` / RLS |
| D3 | Automated tests exist and pass (DB or API) |
| D4 | A user journey was exercised in a real browser (not only unit tests) |
| D5 | Responsive and accessibility checks done (overflow, axe) |
| D6 | Content integrity: Quran text untouched, no invented data presented as real |
| D7 | Human review recorded: scholarly, pedagogical or child-protection as applicable |
| D8 | Licences and rights cleared for the content used |
| D9 | Child safety and data policy satisfied (consent, retention, age rules) |
| D10 | Deployed to the live environment and smoke-verified there |

Cell key: **Y** met with evidence. **P** partly met (see note). **N** not met. **-** not applicable. **nv** not verified by me.

### 2.2 Module by condition

| Module | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 | Overall |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Quran reader + tajweed colour layer | Y | Y | Y | P | P | Y | N | P | - | Y | PARTIALLY WORKING; NEEDS SCHOLARLY REVIEW (tajweed layer) |
| Search, translation (Clear Quran), tafsir panel, audio streaming | Y | Y | Y | P | P | Y | N | N | - | Y | PARTIALLY WORKING (third-party terms unstated) |
| Hifz, quizzes, mastery map, study plan | Y | Y | Y | P | P | Y | N | - | - | P | PARTIALLY WORKING; quiz bank NEEDS SCHOLARLY REVIEW |
| Tracks, passport, certificates, public verify | Y | Y | Y | P | P | Y | N | - | P | Y | PARTIALLY WORKING (not an ijazah) |
| Halaqat, sessions, attendance | Y | Y | Y | N | P | - | - | - | P | Y | PARTIALLY WORKING (external Jitsi link) |
| Recitation submission + tasmi' (personal recitation) | Y | Y | Y | N | P | - | N | N | P | P | BLOCKED live for analysis (STT 429) |
| Homework + Foundations (letters, harakat) | Y | Y | Y | P | P | Y | N | N | P | Y | PARTIALLY WORKING; foundations content NEEDS SCHOLARLY REVIEW |
| Kids Academy (hub + server slice 0016) | Y | Y | Y | P | P | Y | N | N | N | P | PARTIALLY WORKING; BLOCKED for real children (retention policy) |
| Parent / guardian and teacher flows | Y | P | Y | N | P | - | - | - | P | P | PARTIALLY WORKING (no dedicated parent workspace) |
| Institution admin console, members, audit trail | Y | Y | Y | N | P | - | - | - | - | Y | WORKING at API level; browser journey not verified |
| Scholarly review pipeline + sanad register | Y | Y | Y | N | P | Y | N | - | - | Y | PARTIALLY WORKING; BLOCKED (no reviewer appointed) |
| Supervised AI suggestions | Y | Y | Y | N | - | Y | N | N | N | Y | PARTIALLY WORKING; child data must not be sent (owner decision) |
| Human Formation Academy viewer + content (16 programs, 40 competencies) | Y | UI only (static JSON) | P | P | P | P | N | P | P | P | UI ONLY on static draft content; NEEDS SCHOLARLY REVIEW |
| Formation engines backend (0017: source records, reflections, missions, scenarios, observations) | Y | N (no UI) | Y | N | - | Y | N | N | N | N | BLOCKED (not applied, not deployed, no UI) |

### 2.3 Notes behind the cells (each one traceable)

- **D3 (tests).** I ran `npm test` in `packages/database` (49 tests, 49 pass, 0 fail) and in `packages/api` (50 tests, 50 pass, 0 fail, about 311 s) on 2026-11-03. Output kept in the scratchpad (`t13_db.txt`, `t13_api.txt`). Tests run on PGlite (PostgreSQL 18 WASM), not on Supabase (`KNOWN_LIMITATIONS.md` 7). Test files per module: `packages/api/test/{journey,tracks,halaqah,hifz,homework,plan,kids,recitation,search,translations,tajweed-color,basmala,scholarly,admin,formation}.test.ts`; `packages/database/test/{canon,formation,halaqat,isolation,tracks,hosting-and-import,tanzil-real,concepts-load}.test.ts`.
- **Typecheck is not clean.** `npx tsc --noEmit` in `packages/api` prints errors in `test/tajweed-color.test.ts` (TS2532 "Object is possibly undefined", lines 41-44). I saw only the last five lines of output; the full error count is not verified. Tests still pass under `tsx`, which does not typecheck. Source files under `src/` were not shown as failing in the visible lines; not verified beyond that. Fixing the test typings is a small engineering item.
- **D4 (browser journeys).** `docs/10_FUNCTIONAL_QA.md`: journeys A-G from the brief have no browser end-to-end test; logged-in pages were checked only with a mocked API; WebKit/iPhone Safari unverified. I ran `scripts/e2e_academy.mjs` today: it passed ("all checks 1-6 sound": home, programs, walking every lesson step, completing a scenario; 16 programs, 148 lessons, 83 scenarios). It serves `packages/web-vercel` statically, so it proves the academy viewer renders the draft JSON, not that any backend works. The homework and plan journeys were smoke-tested live by the earlier session with temporary rows that were deleted (`KNOWN_LIMITATIONS.md` 38); I did not repeat this.
- **D5 (responsive/a11y).** `docs/10_FUNCTIONAL_QA.md`: axe 0 violations over 18 route/theme combinations, no overflow at 11 viewports x 4 routes, Chromium only. No screen-reader pass, no real device. I did not re-run these.
- **D6 (Quran integrity).** `scripts/qa/reader_integrity.mjs` reports 2,180 verses identical (docs 10 and PROJECT_STATE). I could not re-run it: it needs `PW_PATH` (a Playwright module path) and the live API; my bare run failed with `ERR_INVALID_ARG_TYPE`. Treat the 2,180 figure as previously recorded, not re-verified today. DB-level immutability and hash checks are covered by `packages/database/test/tanzil-real.test.ts` and `isolation.test.ts`, which passed today.
- **D7 (review).** Zero approvals recorded anywhere. `docs/human-formation/lessons/lessons_G1..G8.json`, `programs.json`, `guides/P*.json` all carry `draft-unreviewed` / `unreviewed` status (checked by reading the JSON). Academy gaps X1-X5 are `draft-unreviewed` (`docs/human-formation/gaps/X1.json`).
- **D8 (licences).** `docs/governance/LICENSE_REGISTER.md`: books are internal-analysis only until per-title documents are on file; Tanzil and Clear Quran terms are accepted and attributed; mp3quran.net audio and the tafsir repository have unstated terms (stream/fetch only); no licensed qari audio exists.
- **D9 (children).** No retention/deletion policy for children's data exists (`KNOWN_LIMITATIONS.md` 39, 40). The guardian-consent DB trigger for minors' recordings is tested (`packages/database/test/isolation.test.ts`, `halaqat.test.ts`, API `journey.test.ts`). Age gate depends on a self-declared band (ADR-008, KL 40).
- **D10 (live).** Probed today, read-only. Live migrations 0001-0016 (the Supabase list shows 0016 applied at 2026-11-03 14:57 UTC). Live function `api` is v23, updated 15:04 UTC the same day, status ACTIVE, `verify_jwt` false. Route probes without a token: `/health` 200, `/me/plan` 401, `/i/<zero-uuid>/kids/overview` 401 (route exists, auth required), `/me/reflections` 404 and `/formation/sources` 404 (routes absent). Web: `https://tartil-web.vercel.app` returned 302 (Vercel Authentication). What the deployed web bundle contains (which commit) is not verified; the repository is not a git repository in this session, so I cannot compare it to what Vercel serves.

## 3. Ready to deploy versus draft only

### 3.1 Technically deployable (code and tests in place)

| Item | State today | Condition before it is called released |
|---|---|---|
| Core platform (auth, institutions, consent, Quran, translation, search, hifz, tracks, halaqat, homework, plans, kids sync) | Live (migrations <= 0016, function v23) | Owner decision on public launch; reviewer appointment; safeguarding lead; legal read |
| Migration 0017 + formation routes | NOT live; tests pass locally (DB 49, API 50 include formation tests) | Owner decisions 1-4 in section 4; it widens existing CHECK constraints on `memberships` and `consents` (`0017_formation_engines.sql` lines 7-13), so apply it deliberately, not as a side effect |
| Edge function rebuild (`packages/edge/dist`, regenerated locally 2026-11-03 19:15 local time, after the live v23 deployment at 15:04 UTC) | Local only | Deploy together with 0017 only when the owner approves; otherwise leave v23 |
| Web (`packages/web-vercel/index.html`, 326 KB, plus `academy*.json`) | Whether the live bundle equals the repository: not verified | Push and confirm (section 6) |

### 3.2 Draft only (must carry the "draft / under review" label, must not be presented as approved)

| Item | Where | Why it is draft |
|---|---|---|
| Human Formation Academy: 16 programs, 148 lessons, 83 scenarios across 40 competencies (8 lesson files, counted by script) | `docs/human-formation/lessons`, `programs.json`, `guides`, `packages/web-vercel/academy-*.json`, UI `#/academy` | Status `draft-unreviewed`; validators pass (`scripts/validate_lessons.py`: 40 units, 0 problems; `scripts/validate_programs.py`: 16/148/83, covered 231/231, 0 issues) but validation is structural, not scholarly. Originals of the 19 units / 105 competencies are not in the repository (`KNOWN_LIMITATIONS.md` 36) |
| Pilot programs P06, P07; adult-gated P15, P16; 12 programs "planned" | `programs.json` statuses (read) | Statuses are plan labels, not release states |
| Source-passage records and "from heritage to lesson" material | `docs/human-formation/records/`, `PILOT_SOURCE_RECORDS.md`, `extracted/` | Internal, third-party-derived, gitignored sources; `takhrij` (hadith verification) pending (`BLUEPRINT.md` D14); `content_md` is internal-only |
| Gap units X1-X5 (adult work/finance and related units, W1-W3 area) | `docs/human-formation/gaps/X1..X5.json` | `draft-unreviewed`; X1 states it needs a scholarly reviewer, a pedagogical/adult-protection reviewer and a contemporary financial/legal reviewer; "general education, not advice" |
| Tajweed library, 11 track templates (8 curriculum proposals), 4 quizzes, tajweed colouring | `KNOWN_LIMITATIONS.md` 24, 25, 27, 28 | AI-authored, labelled provisional |
| Foundations curriculum, Kids Academy activities, study-plan heuristics | `KNOWN_LIMITATIONS.md` 38, 39 | No scholarly or pedagogical review; heuristics are not validated pedagogy |
| Formation engines UI | none exists | Backend only |

### 3.3 Not built (do not present as available)

Juz/hizb/page navigation, Meccan/Medinan, word-by-word meanings (`docs/02_FEATURE_GAP_MATRIX.md` 5-7); parent workspace (dedicated); password recovery by email (KL 14); notifications; temporary child access codes/QR; teacher voice feedback; makharij 3D lab; anonymous aggregation of scenario runs (KL 40); Heritage-to-Curriculum reviewer UI beyond the minimal scholarly workspace (not verified as a distinct lab; the academy reviewer view `#/academy/review` exists in `index.html` but I did not exercise it).

## 4. Owner decisions pending (none of these is taken here)

| # | Decision | Blocks | Source |
|---|---|---|---|
| 1 | **Apply migration 0017 to production** (and deploy the rebuilt edge function) | All formation backend use | `KNOWN_LIMITATIONS.md` 40; `PROJECT_STATE.md` |
| 2 | **Name the three reviewers**: scholarly (`scholarly_reviewer`), pedagogical (`pedagogical_reviewer`), child-protection (`child_protection_reviewer`) | Any content reaching `approved`; any publication of scholarly items | `BLUEPRINT.md` D9; ADR-013; KL 26, 40 |
| 3 | **Child-data retention and deletion policy** (written) | Real children using reflections, missions, scenarios, observations, kids sync, recordings | `BLUEPRINT.md` D9 #7, D12; KL 39, 40 |
| 4 | **Age handling for 15-17** (how to record the age range; today minors 15-17 have no band and are refused for reflections; band `b` 7-10 refused entirely) | Reflection log and missions for 15-17 | KL 40 |
| 5 | **W2 (money management) position**: the saving-versus-ascetic-tone conflict in the sources, the "out of scope" line, and adult-only (18+) status for W2/W3 | Any W2/W3 content, X1 units | `docs/human-formation/records/records_W1-W2-W3-W4-L1.md` lines 5, 229-233; `gaps/X1.json` |
| 6 | **L5 ("teaches others") for ages 15-17**: the framework defines L5 for adults only (`COMPETENCIES.md` line 8); whether 15-17 may reach L5, and under whose permission | Level model for teens | `COMPETENCIES.md`; not decided anywhere I read |
| 7 | **Gap units X1-X5**: accept, edit or delete, including the "Inzar / husn al-qada'" items in X1 | Merging X1-X5 into the academy | `gaps/X1.json` (`needs_owner_decision`); X2-X5 have the same field (not individually read in full) |
| 8 | **Book-permission documents**: the owner stated verbally that the books were purchased and permitted; per-title written documents are still to be placed on file | Any verbatim quotation, any publication of book-derived text | `LICENSE_REGISTER.md` (owner instruction 2026-11-03) |
| 9 | **Licence clearance** for: licensed qari audio, mp3quran streaming terms, tafsir repository data, KFGQPC/Quran Foundation agreements | Audio and tafsir in a public release | `LICENSE_REGISTER.md`, `SOURCE_SELECTION_2026-11-02.md` |
| 10 | **Speech-to-text provider/quota** (OpenAI 429) and whether any student audio or text may go to a third party; minors' data must not be sent until decided | Tasmi' analysis, AI suggestions for minors | KL 22, 37 |
| 11 | **Safeguarding lead** appointment and per-jurisdiction legal read of child-data rules | Public launch with minors | KL 9, 18; PROJECT_STATE |
| 12 | **Public launch date, real data, final brand name** | Public release | `docs/11_FINAL_RELEASE_READINESS.md` |
| 13 | **Password-recovery design** (no email provider exists) | Public accounts | KL 14 |
| 14 | **Real video infrastructure** for halaqat (cost and design) instead of public Jitsi | Halaqat with minors at scale | KL 16 |
| 15 | **Whether a tenant admin may assign `scholarly_reviewer` to themselves** (inherited weakness from 0002/0010; the new roles are not assignable that way) | Strength of the scholarly gate | KL 40 |

## 5. Stale or inconsistent documents found

| Document | Problem | Evidence |
|---|---|---|
| `docs/DEPLOY_NEXT.md` | Tells the owner to apply 0016 and redeploy; 0016 is already applied live and a newer function (v23) is deployed. It does not mention 0017. | Supabase `list_migrations` shows 0016; `list_edge_functions` shows v23 |
| `docs/governance/KNOWN_LIMITATIONS.md` 38 and 39 | Say the plan routes / migration 0016 are not live. Live probes show `/me/plan` and `/i/*/kids/overview` answer 401 (routes present) and 0016 is applied. | probes in 2.3 |
| `docs/KIDS_ACADEMY_QA.md` | "migration 0016 is not applied live" | same |
| `PROJECT_STATE.md` "Not built" section (Web UI, audio, AI, passport) | Contradicted by later sections of the same file | internal inconsistency |
| `IMPLEMENTATION_TRACKER.md` | Tracker rows still describe 10 migrations and "no password recovery"; section 40 appended | file read |
| `PROJECT_STATE.md` 2026-11-02 line "Live API = edge function v16" | Superseded; live is v23 | Supabase list |
| Docs 10 and 11 | Quote DB tests 38/38 and API 31/31; today's runs are 49 and 50 | section 3 runs |

I did not edit any of these (the brief limits me to this file); the owner or the main session should update them.

## 6. Deployment steps (actual state; replaces `docs/DEPLOY_NEXT.md` once reviewed)

Nothing below was executed by me. All commands that change production are for the owner or for an explicit, separately authorised session.

### 6.1 Before any deployment

1. Run `npm test` in `packages/database` and `packages/api` (expected today: 49/49 and 50/50). Optionally run `npx tsc --noEmit` in each package and fix the typing errors in `test/tajweed-color.test.ts`.
2. Confirm the live state (read-only): migrations list ends at `0016_kids_academy`; function `api` version 23.
3. Take a database backup or branch point (Supabase dashboard or `create_branch`) before schema change. Not verified that a backup schedule exists.

### 6.2 Path A: ship what is already built, without the formation engines (recommended default)

1. **Database:** nothing to apply (0001-0016 live).
2. **Edge function:** leave v23. If the rebuilt `packages/edge/dist` is deployed, it includes the formation routes against a database without 0017; those routes would fail at query time. So do not deploy the current dist without 0017.
3. **Web:** confirm the Vercel project `tartil-web` builds from the intended commit (the repository here is not a git repository, so use the owner's git bundle/push flow described in `PROJECT_STATE.md`). Vercel deploys on push.
4. Run the post-deploy checks in 6.4.

### 6.3 Path B: ship the formation engines (only after owner decisions 1-4)

1. Apply `packages/database/migrations/0017_formation_engines.sql` to Supabase (append-only; checksum-protected; never edit it afterwards). It widens `memberships_role_check` and `consents_purpose_check`, creates `source_records`, `source_record_reviews`, `reflection_entries`, mission, scenario and observation tables with RLS (`ENABLE` + `FORCE`), and trigger guards.
2. Run the Supabase security advisor afterwards and compare with the previous state (previous: only `rate_limits` finding, `PROJECT_STATE.md` 2026-11-02). Expect to need covering indexes review (0012 precedent).
3. `cd packages/edge && node build.mjs` to regenerate `dist/` (the build fails closed if an expected pattern is missing), then deploy `api` with `verify_jwt` off and the import map `deno.json` (7 files in `dist`: `app.ts auth.ts database.ts deno.json index.ts pg.ts recitation.ts`). Edge-runtime caveat seen before: `Buffer` is not global in the Supabase edge runtime (KL 37); the formation routes have never run on the edge runtime or the real `pg.ts` adapter (KL 40 "Not tested").
4. Order matters: migration first, function second, web last. The web must not call endpoints the function lacks.
5. There is no UI for formation engines, so there is nothing for the web step; the academy viewer remains static JSON.
6. Appoint reviewers (decision 2) only through the owner's own process; the new roles are deliberately not assignable by tenant admins.

### 6.4 Post-deployment verification (read-only unless stated)

| Check | Expected | How |
|---|---|---|
| Health | 200 | `GET <api>/health` |
| Auth guard | 401 without token on `/me/plan`, `/i/<id>/kids/overview`; after Path B also on `/me/reflections` and `/formation/source-records` (currently 404 on the first two formation routes, so 401 means they are deployed) | curl, as I did today |
| Quran text intact | 6,236 ayat, hash matches pinned SHA-256 `6933e133...ec5f` | `GET /quran/reference` total; DB hash check in `docs/SUPABASE.md`; `scripts/qa/reader_integrity.mjs` with `PW_PATH` and `API` set |
| Security advisors | No new ERROR-level finding | Supabase `get_advisors` (security and performance) |
| RLS isolation on the real instance | Cross-tenant and non-owner reads return nothing | targeted checks as in `docs/SUPABASE.md`; for 0017, repeat the owner-only reflection and observation-visibility checks with synthetic users |
| Consent trigger for minors | Recording without live guardian consent is refused | synthetic minor and guardian only; never real child data |
| Live journey | Student and teacher in a test institution: assign, submit, approve; plan save and approve; kids sync and teacher level | `scripts/live/journey_live.py` (not run by me; it writes rows) or manual; delete every test row afterwards and verify zero remain, as in KL 38 |
| Edge logs | No runtime errors after smoke | Supabase `query_logs` (edge function) |
| Web | Vercel deployment READY, routes `#/`, `#/quran/1`, `#/academy`, `#/kids`, `#/foundations`, `#/plan` render, no console errors | Vercel deployment status and a Chromium pass; WebKit/iPhone check is the owner's (still awaited, `docs/10_FUNCTIONAL_QA.md`) |
| Rollback readiness | Previous function version identifiable; migration rollback plan written | migrations are append-only; a rollback needs a new forward migration, so write it before applying 0017 |

## 7. Top gaps (ranked)

1. **No human review of any content.** Every lesson, program, quiz, template and tajweed layer is unreviewed; the reviewer roles are unassigned. This is the main reason nothing can be called approved.
2. **Children's data policy is missing**, and the formation backend, kids sync and recordings all store child data. Real children must not use these until the policy exists.
3. **Formation engines have no UI and are not live**, so the "reflection, missions, scenarios" parts of the TARTIL 13.0 ecosystem exist only as tested backend code; the academy viewer shows static draft JSON with progress stored on the device.
4. Browser journeys A-G are not covered by an end-to-end suite; logged-in pages were checked with mocked APIs; no WebKit, screen-reader or real-device checks.
5. Recitation analysis is blocked live by the speech provider quota.
6. Documentation drift (section 5) can mislead whoever deploys next.

## Evidence

Commands I ran on 2026-11-03 (all local or read-only):
- `npm test` in `/home/claude/quran-global-platform/packages/database`: 49 tests, 49 pass, 0 fail.
- `npm test` in `/home/claude/quran-global-platform/packages/api`: 50 tests, 50 pass, 0 fail.
- `npx tsc --noEmit` in `packages/api`: errors in `test/tajweed-color.test.ts` (tail only seen).
- `python3 -I scripts/validate_lessons.py` (40 units, 0 problems); `python3 -I scripts/validate_programs.py` (16 programs, 148 lessons, 83 scenarios, 231/231, 0 issues); `node scripts/e2e_academy.mjs` (all checks pass).
- `node scripts/qa/reader_integrity.mjs`: could not run (needs `PW_PATH`); not verified today.
- Supabase MCP read-only: `list_migrations` and `list_edge_functions` for project `okbtrogotrtciymmuokr`.
- curl GET probes (no token) on the live API: `/health`, `/me/plan`, `/me/reflections`, `/formation/sources`, `/i/<zero-uuid>/kids/overview`; curl on `tartil-web.vercel.app`.
- Python reads of `docs/human-formation/lessons/*.json`, `programs.json`, `guides/P01.json`, `gaps/X1..X5.json` (structure and status fields).

Files read: `CLAUDE.md`, `PROJECT_STATE.md`, `IMPLEMENTATION_TRACKER.md`, `docs/DEPLOY_NEXT.md`, `docs/governance/KNOWN_LIMITATIONS.md`, `docs/governance/LICENSE_REGISTER.md`, `docs/governance/ARCHITECTURE_DECISIONS.md` (ADR-013 line), `docs/01`-`11` series (06, 07, 10, 11, 02 in full), `docs/KIDS_ACADEMY_QA.md`, `docs/PARENT_TEACHER_INTEGRATION.md`, `docs/CHILD_SAFETY_AND_ACCESS.md`, `docs/SCIENTIFIC_AND_PEDAGOGICAL_REVIEW.md` (head), `docs/human-formation/BLUEPRINT.md` (sections 0, D9, D12, 14), `COMPETENCIES.md` (head), `records_W1-W2-W3-W4-L1.md` (excerpts), `packages/database/migrations/0017_formation_engines.sql` (statement list), `packages/api/src/app.ts` (route list), `packages/edge/dist` (file list, grep), `packages/edge/README.md`, `packages/web-vercel/index.html` (route and academy greps), `scripts/build_academy.py`, `scripts/validate_lessons.py`, `scripts/e2e_academy.mjs`, `scripts/qa/reader_integrity.mjs` (head).

## Open items

- Owner's own section 24 list: replace D1-D10 if different and re-map the table.
- Re-run `scripts/qa/reader_integrity.mjs` with `PW_PATH` set and record the result.
- Get the full `tsc` error count for `packages/api` and `packages/database`; fix test typings.
- Confirm what commit the live Vercel bundle was built from (not verifiable here).
- Verify live edge function v23 contents (it answers kids and plan routes; whether it matches the repository's `dist` before the formation rebuild is not verified).
- Read X2-X5 `needs_owner_decision` fields individually (only X1 was read in full).
- Exercise `#/academy/review` and the scholarly workspace in a browser.
- Update the stale documents listed in section 5.
- Write a rollback plan for 0017 before applying it.
- Re-check the speech-to-text provider status after the owner reviews billing.
