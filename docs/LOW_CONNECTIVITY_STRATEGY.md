# Low-connectivity strategy

Built: a single static HTML file (no framework, ~1 file + API), no external fonts/CDNs at runtime, small JSON responses, nothing blocks on AI.
Not built (honest): service worker / offline queue, background sync, offline audio recording buffer. Design for the next step: cache today's homework card (read-only) after each successful load; queue `view/start/submit(done)` actions in IndexedDB with idempotent server endpoints (submit is rejected as `homework_closed` when already pending, so replay is safe); audio is recorded locally and uploaded when online, with the homework left `in_progress` until the upload succeeds. Foundations works offline once loaded (pure client code) but is not yet precached.
Risks to test before claiming support: iOS Safari background limits, storage eviction, clock skew on due dates.
