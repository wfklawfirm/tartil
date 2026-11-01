# TEST_RESULTS

Run 2026-11-01T11:34Z on PGlite (PostgreSQL 18.6 WASM), Node v22.23.4.

## packages/database (node:test via tsx)
```
# tests 23
# pass 23
# fail 0
# duration_ms 27193.928375
```

23 tests: tenancy/RLS isolation (forged context, cross-tenant writes/FKs, multi-membership), guardian/qari/student visibility, column-level privileges (no email/password), minor-recording consent (grant/revoke/expiry/unrevoke), immutable audit, immutable Quran text + hash check, completeness gaps, scholarly state machine + reviewer + licence gate, learner visibility of drafts.

## Mutation checks (tests must fail when protection is removed)
- RLS disabled on student_profiles -> 8 failures
- consent trigger dropped -> 3 failures
- email column granted -> 1 failure

## Pipelines (not unit-tested; verified by sampling)
- quran_reference self-check: 114 surahs, 6,236 ayat; citation parser exercised on 12 real-shape samples
- extraction: 50 books, 0 with no sections; dedup top clusters spot-checked as matn verses

## Not yet tested
API, E2E, accessibility, RTL/LTR, performance, security/pentest, backup/restore.
