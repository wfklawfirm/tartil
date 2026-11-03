# 02 Feature gap matrix

Status: DONE (built, tested) / PARTIAL / MISSING / BLOCKED (needs owner or absent source). Evidence is a test, a script or a route in the repository.

| # | Area | Status | Evidence / gap |
|---|------|--------|----------------|
| 1 | Reader (Uthmani text, surah list, verse markers) | DONE | integrity script 2180/2180; reader route |
| 2 | Tajweed colouring layer | DONE (Chromium) | Highlight API path + fallback; WebKit unverified |
| 3 | Audio recitation | PARTIAL | browser speech/mini-player; licensed qari audio not loaded (LICENSE_REGISTER) |
| 4 | Search | PARTIAL | `/search` text search; no morphological/root search |
| 5 | Navigation by juz / hizb / page | MISSING | not built |
| 6 | Meccan/Medinan metadata | MISSING | no verified source loaded |
| 7 | Word-by-word meanings | MISSING | no licensed data |
| 8 | Translations/tafsir | PARTIAL | translation endpoints exist; editions pending licence clearance |
| 9 | Hifz (spaced repetition) | DONE | `/me/hifz*`, DB tests |
| 10 | Quizzes + mastery map | DONE (small bank) | `/me/quiz-attempts`, `/me/mastery`; bank is small |
| 11 | Curriculum tracks, passport, certificates, public verify | DONE | API tests; certificates carry no ijazah claim |
| 12 | Halaqat, sessions, attendance | DONE (API+UI) | tests; live video is an external Jitsi link |
| 13 | Recitation submission + teacher review | PARTIAL | API tested; no browser E2E of the teacher flow |
| 14 | Guardian consent for minors | DONE | DB trigger, tests |
| 15 | Role workspaces (learner/teacher/parent/admin/scholar) | PARTIAL | institution app + scholar review exist; no dedicated parent view |
| 16 | Scholarly content pipeline | PARTIAL | extraction + DB gate done; ingestion UI for reviewers minimal |
| 17 | Supervised AI | PARTIAL | suggestions require human approval; no ruling/grade output |
| 18 | Ornament engine + gallery | DONE | patterns A, B, C, D, E; `#/gallery` |
| 19 | Share, focus mode, richer tooltips | MISSING | not built |
