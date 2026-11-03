# TARTIL 5.1 QA report (date of build: see git log)

| Area | Evidence | Result |
|---|---|---|
| Homework journey (assign -> child -> submit -> teacher approve -> progress) | `packages/api/test/homework.test.ts` (2 tests, real RLS on PGlite) | pass |
| Same journey through the real UI + real API/DB | Playwright E2E (teacher, child, parent contexts) | pass |
| Isolation (classmate, other guardian, unrelated qari, other tenant) | API tests | pass |
| Status machine / teacher-only approval | API tests + DB trigger | pass |
| Full API suite / database suite | `npm test` in each package | 42 / see run log: pass |
| Accessibility | axe wcag2a/2aa/21aa/22aa: homework (learner+teacher, light+dark), foundations (5 tabs) | 0 violations |
| Mobile 320/390/1440 overflow | Playwright sweep | none |
| Security | RLS forced, column grants, guard trigger, no SQL text leaked (mapError) | pass |

## Not verified / known gaps
Live (Supabase/Vercel) smoke of 0014 and the new routes is recorded in KNOWN_LIMITATIONS §38 after deployment. No audio recordings exist (foundations is silent). No real-device iPhone/Android test. No manual screen-reader test. No offline mode. No notifications. Temporary child access codes not built. OpenAI 429 blocker open. A real teacher/child pilot has not happened; nothing here is evidence of learning outcomes.
