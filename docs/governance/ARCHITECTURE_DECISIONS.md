# ARCHITECTURE_DECISIONS

| ID | Decision | Why | Revisit when |
|---|---|---|---|
| ADR-001 | Modular monolith on PostgreSQL; no microservices yet | One team, strong relational invariants (tenancy, consent, audit); simpler to secure and test | Speech/AI workloads need independent scaling |
| ADR-002 | Code developed in git outside OneDrive; owner receives snapshots | node_modules + .git inside a synced folder corrupts/locks; books stay on the owner's machine | Owner provides a repo host |
| ADR-003 | Tenant isolation enforced by Postgres RLS + `withContext()` (transaction-local role + identity) | UI/API bugs cannot leak across institutions; verified by mutation tests | Host chosen (re-verify) |
| ADR-004 | Quran text immutable, verbatim, edition-pinned, hash-checked; layers separate; fixtures invisible to users | Prevent silent corruption (a core trust risk); licence requires verbatim copy | Never relax |
| ADR-005 | Scholarly publication gate in DB (state machine + reviewer approval + licence flag) | Machine-extracted content must not reach learners unreviewed | Reviewer workflow UI built |
| ADR-006 | Source locator = source/section/paragraph/offset; no invented page numbers | Exports lack pages | Scans with real pagination arrive |
| ADR-007 | Dedup detects, never merges; related variants preserved | Dedup must not erase riwayah/opinion differences | Calibration against reviewer decisions |
| ADR-008 | Minors: no birth date stored (`is_minor` flag); recordings need live guardian consent (trigger) | Data minimisation + consent as an invariant | Jurisdictional legal review |
| ADR-009 | API = Fastify+Zod (decided, slice 1 built; small, fast, easy to test with inject). Web framework still DEFERRED (Next.js candidate) | No evidence yet; decide at vertical slice 1 using a spike on the auth + onboarding journey | Start of slice 1 |
| ADR-010 | Working name "Tartil (ترتيل)" chosen by the owner; to be refined later | Owner-chosen working name | Branding pass |
| ADR-011 | Hosting: Supabase Postgres (owner decision). Custom auth now; Supabase Auth mapping possible later via `authUser()` only | RLS keys off `app.user_id`, independent of auth provider | Auth migration |
| ADR-012 | Service connection (register/login/bootstrap) and app connection (withContext only) are separate; server refuses to boot if app path can bypass RLS | Misconfiguration must fail loudly | - |
