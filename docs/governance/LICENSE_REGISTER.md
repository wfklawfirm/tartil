# LICENSE_REGISTER

Generated 2026-11-01. Not legal advice. Default is NOT cleared.

## Books (74 files in the user folder)
All `LICENSE_REVIEW_REQUIRED`. Permitted use now: internal analysis/extraction on the owner's machine. **Not permitted until cleared per title:** publishing text, quotations beyond fair use, redistribution, model training.

## Owner instruction 2026-11-03 — formation-academy source books
Owner (Wissam Khaled) stated in session: the books he supplied (folders `shamela_selected` and `shamela_selected2` on his machine) were purchased, the platform is a charitable project, and the authors/rights-holders have permitted its use; he instructed full extraction of their content for the formation academy. **Recorded as the owner's assertion; no permission documents are on file in the repo.** Action for owner: place the permission letters / purchase proofs with this register per title.
Scope applied by us until documents are on file: (1) the book files stay on the owner's machine and in the gitignored `scholarly-assets/` only, never committed; (2) extracted content is our own paraphrase with exact locators (`SRC` / book number + heading); (3) verbatim quotation only if short and attributed; (4) no hadith/athar is given a grading by us (scholarly reviewer decides); (5) nothing is presented as approved by a scholar.

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

## Classical tafsir texts (Arabic) - ON-DEMAND FETCH, TERMS UNSTATED (2026-11-02)
Owner instruction: find a source that needs no request. The public GitHub repository `spa5k/tafsir_api` (repo labelled MIT; the edition data carries no stated licence; editions sourced from qul.tarteel.ai and quran.com) serves per-ayah JSON. Only works of classical authors long out of copyright are offered: Jalalayn, Ibn Kathir, al-Qurtubi, al-Baghawi, al-Tabari. Modern or restricted works (e.g. al-Muyassar of the King Fahd Complex, al-Sa'di) are deliberately excluded. Integration is **fetch-on-demand in the browser; nothing is stored, edited or redistributed by us**, with attribution and a disclaimer beside the text. **Status: IN_USE_TERMS_UNSTATED; digital-edition rights not cleared; not scholarly-reviewed; owner accepted using it without a written agreement. Remove the tafsir panel and the CSP hosts to switch off.**
