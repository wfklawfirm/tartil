# TEST_RESULTS
Run 2026-11-01 11:43Z, PGlite (PostgreSQL 18 WASM), Node 22.
- packages/database: # pass 26 # fail 0   (isolation/RLS, consent, audit, immutable Quran text, scholarly gate, Supabase privilege hardening, strict importer)
- packages/api: # pass 4 # fail 0   (full minor-student journey through RLS, auth failure modes, no SQL/hash leakage, role-safety guard incl. rejection case)
Mutation checks (tests fail when protection removed): RLS disabled -> 8 fail; consent trigger dropped -> 3 fail; email column granted -> 1 fail; migration 0003 removed -> hardening test fails.
Not yet tested: live Postgres/Supabase, browser E2E, accessibility, RTL/LTR, performance, pentest, backup/restore.
