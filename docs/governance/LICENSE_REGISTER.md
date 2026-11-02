# LICENSE_REGISTER

Generated 2026-11-01. Not legal advice. Default is NOT cleared.

## Books (74 files in the user folder)
All `LICENSE_REVIEW_REQUIRED`. Permitted use now: internal analysis/extraction on the owner's machine. **Not permitted until cleared per title:** publishing text, quotations beyond fair use, redistribution, model training.

## External resources (from Phase-2 acquisition kit; none downloaded)
| Resource | Terms (as recorded in kit, 2026-10-31) | Status |
|---|---|---|
| Tanzil Quran text 1.1 (Uthmani, txt-2) | Verbatim copy with attribution + link to tanzil.net; no changes; notice kept in file | ACQUIRED 2026-11-01 (terms accepted under owner's delegation); SHA-256 in scholarly-assets/quran/raw/SHA256.txt; display must show attribution |
| Quran Foundation API | Display in app ok; no raw redistribution; storage/ML-training limits | API_ONLY, not bundled |
| Quran Lab models (NPL-1.2 / non-commercial) | No commercial use | EXCLUDED |
| mjmirza/quran-dataset | README says CC BY 4.0 but LICENSE says custom revenue-tier/AI-training licence | BLOCKED (conflict) |
| Reciter audio | Per-reciter rights; datasets do not relicense audio | NOT_ACQUIRED |
| H5P / LiveKit / Keycloak | Mixed (MIT/GPL parts) / Apache-2.0 / Apache-2.0 | Candidates; review per component |

## Source selection 2026-11-02
Owner selected, in principle, KFGQPC (audio/translations/mushaf reference), Quran Foundation API (streaming audio/translations) and Tanzil (text, already live). Details, terms read and next actions: `SOURCE_SELECTION_2026-11-02.md`. **Status: SELECTED_PENDING_AGREEMENT; licences remain NOT cleared; nothing downloaded or integrated.**

## Clear Quran (English translation of the meanings) - ACQUIRED 2026-11-02
Translator Talal Itani, clearquran.com, "Allah" edition, version 2026-10-09. Licence CC BY-ND 4.0 (commercial use allowed, no permission needed; wording must stay unchanged; translator credited). Imported by `scripts/supabase/import_clearquran.sql` (pinned SHA-256 `138b00041d6013f2dd96e84038529044da53748e8c534942af37edd2a4ca3eb5`, 6236 verses, count and hash gated). Edition code `clearquran-allah-en-2026-10`. **Status: APPROVED provisionally by the owner (pending scholarly review); attribution is always shown with the text.**

## mp3quran.net recitation audio - STREAM-ONLY, TERMS UNSTATED (2026-11-02)
Owner instruction: use an Arabic audio source that needs no request or account. The public API at `https://www.mp3quran.net/api/v3` (reciters list, per-ayah timing, files on `cdn.mp3quran.net`, CORS open) publishes no terms of use or licence. Integration is therefore **stream-only from the browser**: nothing is downloaded, stored, re-hosted, trimmed or modified by us, the attribution is shown beside the player, and rights remain with the reciters. **Status: IN_USE_TERMS_UNSTATED; not licence-cleared; owner accepted using it without a written agreement. Can be switched off by removing the audio panel and the two CSP hosts.** Considered and not used: KFGQPC and Quran Foundation (need a request/account), alquran.cloud (non-commercial), EveryAyah (no licence stated, per-ayah files), data-quran (CC BY-NC-ND).
