# PROJECT_STATE - 2026-11-01 (updated after owner decisions: name "Tartil / ترتيل" (provisional), hosting Supabase, proceed without waiting)

## Real, tested
- Source registry: 74 books inventoried with SHA-256, header metadata, quality metrics, triage (title-based, unreviewed).
- Extraction: 50 books (tier 1-3) -> 7,082 sections / 97,625 paragraph units with stable IDs; 11,767 Quran-quote marks; 3,906 citation locators parsed and classified.
- Duplicate detection (detect-only): 629 near-duplicate clusters pending human decision; 938 related variants preserved.
- API slice 1 (Fastify+Zod, own email/password+JWT): register/login, institution bootstrap, members, students, guardian link + verification, qari assignment, consent grant/revoke, recitation submission, qari state change. Full minor-student journey test passes through the real RLS layer (4 tests).
- **Quran text acquired**: Tanzil Uthmani 1.1 (6,236 ayat, SHA-256 6933e133…ec5f) committed verbatim with its licence notice; imports complete; status NOT_APPROVED (religious approval is a human act). Book quotes verified against it: 2,541 checked -> 2,330 match (91.7%), 78 found at a different locator (suggested corrections in review queue), 133 unmatched (partial/riwayah/paraphrase/typo).
- Supabase hardening (migration 0003, tested incl. mutation) + strict Tanzil importer ready for the owner's file (fails closed unless exactly 6,236 ayat; stores verbatim; records source SHA-256; imports as NOT_APPROVED).
- **Deployed on Supabase** (project `tartil`, ref okbtrogotrtciymmuokr, eu-central-1): migrations 0001-0005 applied; Tanzil edition imported inside the DB (hash-gated, 6,236 ayat, byte-identical, NOT_APPROVED); security advisor 0 findings; targeted isolation/consent/immutability checks passed on the real instance (see docs/SUPABASE.md).
- Database foundation (migrations 0001-0005) with 27 passing tests incl. mutation-verified tenant isolation, guardian consent for minors, immutable audit, immutable Quran text, scholarly publication gate.

- **Live (2026-11-01):** migration 0006 applied; API running as Supabase Edge Function (31-check live journey passed); Arabic web client on Vercel `tartil-web` (behind Vercel Auth). See docs/SUPABASE.md.

- **2026-11-01 night:** Quran edition provisionally APPROVED by owner (not scholarly; audit pending); basmala display fix; DB-backed login rate limit (0007); API function v6; 10 API tests + 33 DB tests pass.

## Not built (do not assume)
Web/mobile UI, design system, audio, recitation studio UI, live halaqat, AI services, passport/credentials, QCEF load/review, live-Postgres test of `pg.ts` (the pg adapter has not run against a real server).

## Needs owner decision
0. (Done) Supabase project created after the owner upgraded the plan. Still owner-held: DB connection strings (service + app roles), JWT_SECRET (>=32 chars), and the API process has not yet been run against Supabase's pooler.

## Waiting on owner (non-blocking: work continues without them)
1. (Done 2026-11-01 under the owner's delegation: Tanzil terms accepted - verbatim copy, attribution, link to tanzil.net.)
2. Name 2+ qaris and a scholarly lead for review; appoint a safeguarding lead.
3. (Done: Supabase project exists; secrets/connection strings are the owner's to set in the API host.)
4. Provide AIJUR Skills repo/folder if its ideas should be audited (not found in this session).
5. Final brand (working name Tartil / ترتيل).

## Next (engineering, no blockers)
Halaqah + attendance + assessment-record journey; Quran Core read API (hidden until an approved edition exists); concept extraction v1 (Makharij/Sifat from tier-1 books) feeding `scholarly_items` as DRAFT with lineage; then web client (framework chosen by spike, ADR-009).
