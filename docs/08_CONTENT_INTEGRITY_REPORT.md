# 08 Content integrity report

- Quran text: Tanzil Uthmani 1.1, 6,236 ayat, SHA-256 verified on import, immutable in DB. Edition status APPROVED provisionally by owner, **not** by a scholar; audit pending.
- Reader integrity: `node scripts/qa/reader_integrity.mjs` -> OK, 2,180 verse renderings identical to stored text, marker numbering correct (re-run 2026-11-03 after the homepage rewrite).
- Tajweed/ornament layers never modify text nodes' content.
- Homepage copy contains no invented statistics, testimonials, scholars, institutions or certificates. Verse of the day is drawn from stored text.
- Book-derived material: gitignored, licences not cleared, nothing published. 629 duplicate clusters pending human decision.
- Machine-extracted content cannot reach PUBLISHED without `scholarly_reviewer` approval and `licence_cleared` (DB-enforced).
