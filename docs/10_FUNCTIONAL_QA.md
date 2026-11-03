# 10 Functional QA

| Suite | Result (2026-11-03) |
|-------|---------------------|
| API tests (`packages/api`) | 31/31 pass |
| DB tests (`packages/database`) | 38/38 (last run before this pass; no DB change in this pass) |
| Reader integrity script | OK, 2180 |
| Playwright overflow/console check (5 widths, 7 routes) | clean |
| Playwright breakpoint sweep (11 viewports x 4 routes) | no overflow, no page errors |
| axe-core (18 combos, light+dark) | 0 violations |

Gaps: journeys A-G from the brief have **no browser end-to-end test**; logged-in pages checked only with a mocked API; WebKit/iPhone Safari unverified (owner screenshot of `#/quran/3` with tajweed ON still awaited); no screen-reader pass.
