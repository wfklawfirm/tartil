# PROJECT_STATE - 2026-11-01 (updated after owner decisions: name "Tartil / ترتيل" (provisional), hosting Supabase, proceed without waiting)

## Real, tested
- Source registry: 74 books inventoried with SHA-256, header metadata, quality metrics, triage (title-based, unreviewed).
- Extraction: 50 books (tier 1-3) -> 7,082 sections / 97,625 paragraph units with stable IDs; 11,767 Quran-quote marks; 3,906 citation locators parsed and classified.
- Duplicate detection (detect-only): 629 near-duplicate clusters pending human decision; 938 related variants preserved.
- API slice 1 (Fastify+Zod, own email/password+JWT): register/login, institution bootstrap, members, students, guardian link + verification, qari assignment, consent grant/revoke, recitation submission, qari state change. Full minor-student journey test passes through the real RLS layer (4 tests).
- Supabase hardening (migration 0003, tested incl. mutation) + strict Tanzil importer ready for the owner's file (fails closed unless exactly 6,236 ayat; stores verbatim; records source SHA-256; imports as NOT_APPROVED).
- Database foundation (migrations 0001-0003) with 26 passing tests incl. mutation-verified tenant isolation, guardian consent for minors, immutable audit, immutable Quran text, scholarly publication gate.

## Not built (do not assume)
Web/mobile UI, design system, Quran text (importer ready, no file yet), audio, recitation studio UI, live halaqat, AI services, passport/credentials, QCEF load/review, live-Postgres test of `pg.ts`.

## Waiting on owner (non-blocking: work continues without them)
1. Accept Tanzil terms and download the official text (or authorise a different canon source).
2. Name 2+ qaris and a scholarly lead for review; appoint a safeguarding lead.
3. (Decided: Supabase - see docs/SUPABASE.md; creating the project and secrets is an owner action.)
4. Provide AIJUR Skills repo/folder if its ideas should be audited (not found in this session).
5. Final brand (working name Tartil / ترتيل).

## Next (engineering, no blockers)
Halaqah + attendance + assessment-record journey; Quran Core read API (hidden until an approved edition exists); concept extraction v1 (Makharij/Sifat from tier-1 books) feeding `scholarly_items` as DRAFT with lineage; then web client (framework chosen by spike, ADR-009).
