# Quran text cross-check (2026-11-01)
Stored edition: Tanzil Uthmani 1.1 (SHA-256 6933e133...ec5f), status NOT_APPROVED.
Independent source compared: api.quran.com `verses/uthmani` (6,236 ayat). Method: NFC-normalised, per-ayah, after removing the basmala prefix.
Results:
- Ayah count and keys: 6,236/6,236 present in both.
- Exact match: 6,035. Of the remaining 201, 199 differ ONLY by U+06DE (rub el hizb sign) presence; 0 other mark/letter differences.
- 2 ayat (95:1, 97:1): Tanzil's basmala prefix there is spelled with an extra shadda (بِّسْمِ); the ayah text itself matches.
- Another independent API (alquran.cloud) uses a different script convention (3,573 skeleton differences): not comparable; not used as evidence.
FINDING: in the Tanzil file, ayah 1 of 111 surahs carries the basmala as a prefix. The basmala is not part of those ayat in the 6,236 numbering. Stored text is NOT altered (verbatim rule); the reader/API must derive display text by stripping the prefix. Not yet implemented.
LIMIT: this is machine cross-checking against another digital edition. It is not a scholarly approval and not a comparison against Al-Azhar or the King Fahd Complex printed mushaf; those need a human approver (the DB gate requires a scholarly_reviewer).
Script: scripts/verify_quran_crosscheck.py (needs the two downloaded JSON files in the working dir).
