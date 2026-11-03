# Kids Academy architecture
The Academy is a module of Tartil, not a separate product: it reuses accounts, institutions, homework (migration 0014), saved plans (0015), hifz scheduling and the tasmi' engine.

Built (route `#/kids`): age bands 4-6 / 7-10 / 11-14 (option count and question count differ), a quick placement check that lets an advanced child skip the beginner path, four activities (letter recognition, letter matching, look-alike letters, build the syllable), a rule-based recommendation engine and a local progress panel. All state is in the browser (`localStorage` key `kids`).

Not built: child profile tables, server-side mastery, teacher/parent visibility of Academy progress, audio, makharij animation, letter-level recording and feedback. See KIDS_BACKEND_SCHEMA.md for the proposed schema and KIDS_ACADEMY_QA.md for evidence.

Dependencies: foundations data (`FD_LET`, `FD_HAR`), homework API for assigned tasks, `/me/hifz` for short-surah memorisation, `#/me/tasmi` for passage recitation analysis.
