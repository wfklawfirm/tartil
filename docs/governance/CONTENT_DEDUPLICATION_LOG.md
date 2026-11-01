# CONTENT_DEDUPLICATION_LOG

Generated 2026-11-01. Method and thresholds: `scripts/dedup_report.py` (MinHash/LSH + exact Jaccard verification).

## Rule
- Deduplication **never deletes a difference**. Near-duplicates are *linked to one concept with every source kept*; related variants are *preserved separately*.
- No cluster is merged by the machine. Every cluster starts `PENDING_HUMAN_REVIEW` (`scholarly-assets/review/dedup_decisions.csv`).
- Similarity is textual, not doctrinal: a 0.79 pair may differ by one riwayah-relevant word. Humans decide.

## Results
- Paragraph units considered (>= 8 words): **57989**
- Pairs: EXACT_NORMALISED **4600**, NEAR_DUPLICATE **481**, RELATED_VARIANT **938**
- Near-duplicate clusters: **629**; units inside them: **2281** (3.93%)
- Largest clusters span 10-13 different books. Spot check: they are verses of the classical matns (Jazariyya, Tuhfat al-Atfal) quoted by commentaries -> one `concept` node with many `source_unit_ids`, not many lessons.
- Matn witnesses exist in several editions (SRC-000581, SRC-001096, SRC-012093, plus collections SRC-029915 / SRC-000571): choosing the canonical text is a scholarly decision (queue item Q-003).
