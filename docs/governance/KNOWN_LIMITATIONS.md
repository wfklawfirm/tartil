# KNOWN_LIMITATIONS (honest list)

1. **No product surface yet**: no API, auth, UI. Only schema + pipelines + tests exist.
2. **No Quran text imported.** All 3,906 book citations are unverified against any Quran text (statuses RESOLVED_UNVERIFIED etc.). Ayah-count table is my reference list (self-checked to sum to 6,236); it is not provider metadata.
3. **Triage is title-based**, validated only by term density; no scholar reviewed it. 9764 is uncertain.
4. **No printed page numbers** in the source exports; citations to "page X" cannot be produced - only section/paragraph locators.
5. **Source typos exist** (8 ayah numbers out of range, ~23 unresolved surah names); flagged, not corrected.
6. **Dedup is textual** (4-word shingles, MinHash): it can miss paraphrase and can over-link formulaic phrases. Thresholds (0.80/0.55) are my choice, uncalibrated against scholarly judgement. Oversized-bucket guard never triggered on this corpus.
7. **Tests run on PGlite (PostgreSQL 18 WASM)**, not a managed Postgres. Role switching (`SET LOCAL ROLE app_user`) must be re-verified on the chosen host (e.g. Supabase/Neon/RDS) before any deployment. No penetration test performed.
8. **Context injection** (`app.user_id`, `app.institution_id`) is trusted from the API layer; a compromised API server could set any value. Mitigation (signed context / per-request JWT claims) is a future ADR.
9. **Safeguarding** covers data access + consent only. No messaging, no live-session controls, no reporting workflow yet. Legal review of child-data rules per jurisdiction: not done.
10. **QCEF** seed (105 items, from the previous kit) is uncalibrated scaffolding; not loaded into the DB, not scholar-reviewed.
11. **AIJUR Skills** was not available and was not inspected.
12. Canonical Jazariyya/Tuhfa witness text undecided (queue Q-003).
13. Normalisation for matching is crude (diacritics/hamza/ya/ta-marbuta) and is never applied to stored text.
