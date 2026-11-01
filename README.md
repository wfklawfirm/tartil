# Tartil - ترتيل (working name) - Global Quranic Learning & Mastery Platform

Status: **foundation stage**. See `PROJECT_STATE.md` for exactly what exists and what does not.

```
packages/database/    Postgres schema (migrations), tenant isolation via RLS, child-consent + audit + scholarly-gate triggers, tests (PGlite)
scripts/              Python pipelines: source registry, book extraction, duplicate detection, governance docs
scholarly-assets/     source-registry (committed), review (aggregates, committed), extraction + books (gitignored, internal)
docs/governance/      registers: content, dedup log, licences, review queue, limitations, decisions
```
Run tests: `npm install && npm test`. Re-run pipelines: see header comment of each script.
