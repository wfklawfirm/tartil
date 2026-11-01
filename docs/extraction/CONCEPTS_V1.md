# Concept extraction v1: makharij and sifat al-huruf

Status: DRAFT output, internal analysis only. Source texts are third-party (licence NOT cleared) and stay gitignored. Nothing here is a ruling or definition.

## What was produced
| Artefact | Path | Tracked? |
|---|---|---|
| Extractor | `scripts/extract_concepts.py` (`python3 -I`, stdlib only) | yes |
| Draft records | `scholarly-assets/extraction-concepts/concepts_draft.jsonl` (+ `_stats.json`) | gitignored (rule added to `.gitignore`) |
| SQL generator | `scripts/supabase/load_concepts_draft.py` -> `scholarly-assets/extraction-concepts/load_concepts_draft.sql` | script yes, SQL gitignored |
| DB test | `packages/database/test/concepts-load.test.ts` (skips if the SQL is not generated) | yes |

## Counts (verified from the run)
- Input: 25 tier-1 books (from `extraction_summary.json`), 37,063 units.
- Records: 39 = 37 concept entries + 2 variation entries. All `kind='concept'`, `riwayah_scope='unspecified'`, `state='DRAFT'`, `licence_cleared=false`.
- Concept entries: 14 makharij (overview, general-five, jawf, halq, lisan, shafatan, khayshum, plus 7 sub-sites) and 23 sifat entries (overview, with/without opposite, hams, jahr, shidda, rakhawa, tawassut, isti'la', istifal, itbaq, infitah, idhlaq, ismat, safir, qalqala, lin, inhiraf, takrir, tafashshi, istitala, ghunna, khafa').
- 1,767 distinct unit IDs referenced. Every ID was checked against the extraction output before writing (the script asserts this; any miss aborts).
- Per (concept, book) the lineage list is capped at 12 units (heading matches first); true match counts are in `body.per_source.*.total`.

## Variation entries (kept per book, never merged)
Detected by a lexical "number + مخارج/مخرج/صفة/صفات" pattern: 89 makharij statements and 121 sifat statements, each stored with source_id, unit_id, number, section title and a fragment of at most 25 words (fragments exist only in the local jsonl; the SQL generator drops them).
- Makharij numbers stated, books per number: 17 (12 books), 16 (9), 14 (9), 5 (7), 29 (1 book, SRC-017065, reporting a position that each letter has its own makhraj), plus sub-region counts (3 for the throat, 10 for the tongue, 4, 8, 1).
- Sifat numbers stated: 17 (7 books), 18 (3), 19 (2), 20 (1), 44 appears in text but as a word-form the pattern misses (see limits), plus partial counts (3, 4, 5, 6, 7, 9, 10, 13 to 15) that refer to sub-groups such as attributes with or without an opposite, strong or weak.
- A number appearing for a book means the book states it, not that the book adopts it (several books list 17, 16 and 14 as three positions). The reviewer must read each cited unit.

## Method
1. Fixed search lexicon of 37 terms (Arabic normalised: diacritics removed, alef/ya/ta-marbuta folded).
2. A unit joins a concept by (a) its section heading matching the term, (b) the term appearing in a section whose heading is about مخارج/صفات, or (c) a strict phrase such as "تعريف/حروف + term" in a short unit elsewhere. Exclusions for الجهر (jahr in recitation/isti'adha). Separator-only units are skipped.
3. Records carry only metadata, a neutral lexical note and lineage. No book text beyond the variation fragments.

## Spot check
Method: random sample of 20 records (twice, different seeds), one random listed unit per record, read against the real unit text and heading.
- Round 1 (before the separator filter): 14/20 clearly on topic; 4 wrong or tangential (an "izhar halqi" footnote under makharij.halq; ghunna inside idgham-bi-ghunna; "شدة" used as a plain word under shidda; a ghunna-fixing discussion under lisan.taraf); 2 relevant headings whose unit was only "---". The separator filter was added in response.
- Round 2 (after the filter): 18/20 on topic; 2 wrong (إخفاء شفوي under makharij.shafatan; an inhiraf passage under tawassut). One variation unit was a valid but sub-region count ("throat has three").
- Honest error rate: 6 of 40 sampled units are false or tangential matches (15%); unit-level precision is therefore about 85% in the sample, with wide uncertainty (n=40, one unit per record). Recall was not measured.

## Known limits
- Lexical only: false positives come from tajweed rules sharing a word (إخفاء شفوي, إظهار حلقي, غنة in idgham), and from heading matches whose first paragraphs are generic. Recall is unmeasured; unheaded matn poems are only caught by keyword inside makharij/sifat sections or the strict phrases.
- Count detection misses written-out forms outside the pattern (e.g. "أربع وأربعين" is not parsed, "سبع عشرة" before an unrelated noun is) and parses sub-group counts as counts; statement 'kind' is inferred from the noun and may mislabel.
- No page numbers exist; locators are unit IDs only. Footnote units (apparatus notes) are included when they match.
- Variation is not resolved or ranked; no riwayah attribution was attempted (all 'unspecified').
- Tier-2/3 books (phonetics research, qira'at) were not read, by design.
- Nothing was applied to Supabase. DB check: `load_concepts_draft.sql` (39 inserts) passes the scholarly triggers in PGlite, is idempotent on re-run (keyed by `body.concept_key`), produces no non-DRAFT/cleared/approved rows and contains no `fragment` keys; a PUBLISHED insert is rejected. Full `npm test` in packages/database: 38/38 pass (including the new test).
