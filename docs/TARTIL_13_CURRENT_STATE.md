# TARTIL 13.0 - Current State (one page)

> **Correction (verified read-only against Supabase project okbtrogotrtciymmuokr, 2026-11-03):** migrations 0001-0016 ARE applied in production and edge function `api` is at v23; migration 0017 and the `/formation/*` and `/me/reflections` routes are NOT live (probes: `/me/plan`, `/i/*/kids/overview` -> 401; `/formation/sources`, `/me/reflections` -> 404). Any statement below that 0016 (kids academy / plan) is "not applied" or "not live" predates this check and is superseded; it is untested end-to-end live, not unapplied.

Date: 2026-11-03. Full evidence and per-function statuses: [`docs/audit/TARTIL_CURRENT_STATE.md`](audit/TARTIL_CURRENT_STATE.md) (Feature Audit Matrix, sections 2-4).

**Verdict: private prototype / pilot-ready candidate; not a public production release** (agrees with `docs/11_FINAL_RELEASE_READINESS.md`).

## Verified in this audit
- `packages/database`: 49/49 tests pass. `packages/api`: 50/50 pass. Run with `--test-concurrency=1`; the default parallel `npm test` was OOM-killed on this shared host (environment, not code).
- Every one of the API's handlers is referenced by a test except `GET /health`; no browser E2E suite is committed.

## What works (code path plus test or QA record)
| Area | Status |
|---|---|
| Quran reader, search, English translation toggle | WORKING (Tanzil Hafs, verbatim; edition approved only provisionally by the owner) |
| Hifz scheduler, quizzes, mastery map, sanad register | WORKING (self-assessment, labelled) |
| Institutions, RLS isolation, guardian consent, admin console | WORKING (DB 17 isolation tests) |
| Tracks, passport, certificates, public verify | WORKING (no revoke endpoint) |
| Halaqat, sessions, attendance | WORKING (public Jitsi link, no recording or moderation) |
| Homework (student, teacher, review queue) | WORKING |
| Scholarly workflow gate | WORKING in DB, nothing reviewed |

## Partial, UI-only or content that needs review
- NEEDS SCHOLARLY REVIEW: tajweed library, qiraat intro, quizzes, foundations, track templates, tajweed colouring, tafsir panel.
- PARTIALLY WORKING: Kids Academy (server slice not live), study plan (routes not in deployed function), audio player (third-party licence unstated), recitation upload.
- UI ONLY / no server: Academy lessons, scenarios and review portal (static JSON, local progress, no saved decisions).
- BLOCKED: tasmi' speech-to-text (HTTP 429 reported in KNOWN_LIMITATIONS 37; not re-checked), formation engines (no UI, migration 0017 unapplied, no named reviewers).
- MISSING: juz/hizb/page navigation, Meccan/Medinan, word meanings, parent workspace, dedicated teacher workspace, English LTR UI, Heritage-to-Curriculum lab, password recovery, email, notifications, certificate revoke.

## Top gaps
1. No appointed scholarly, pedagogical or child-protection reviewers, so no teaching content can be honestly approved.
2. Repository ahead of deployment: plan, kids and formation routes are tested but not live (per docs).
3. No browser E2E for journeys A-G; accessibility is axe-only in Chromium, with no screen-reader, keyboard or Safari/iPhone check, and Academy, Plan and Tasmi' not covered by axe.

## Owner decisions (not taken here)
Reviewer and safeguarding-lead appointments; child-data retention policy; redeploy and migrations 0016/0017; STT provider/billing; email provider; licence clearance (audio, tafsir, riwayat); juz/hizb and Meccan/Medinan data.

## Not verified
The live Supabase/Vercel state, real devices and Safari, screen readers, and the QA scripts quoted from docs (reader integrity, axe sweeps, Academy E2E).
