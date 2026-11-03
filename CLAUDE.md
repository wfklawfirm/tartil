# CLAUDE.md - standing instructions (Tartil, working name)

Project: global Quranic learning & mastery platform (Arabic-first RTL + English LTR). Owner: Wissam Khaled (AIJUR FZCO). Full brief: the "MASTER PROMPT V2" the owner supplied.

## Resume protocol
1. Read `PROJECT_STATE.md`, then `docs/governance/KNOWN_LIMITATIONS.md`, `IMPLEMENTATION_TRACKER.md`, `ARCHITECTURE_DECISIONS.md`.
2. Run `npm test` (packages/database) before and after any change. Do not report a feature done without a passing test.

## Non-negotiables
- **Never alter Quran text.** Store verbatim, edition-pinned, hash-checked. Tajweed colours / annotations are separate layers. Never merge riwayat into one schema row.
- **No religious authority claims.** AI output is never a ruling, grade, or ijazah. Nothing machine-extracted is PUBLISHED without a recorded `scholarly_reviewer` approval (enforced in DB, migration 0002).
- **Licences default to NOT cleared.** Books in `scholarly-assets/_inputs/books` and everything under `scholarly-assets/extraction` are third-party, gitignored, internal-analysis only. Never commit or publish their text.
- **Do not auto-download Quran text, audio, translations or models.** Each needs the owner's acceptance of that provider's terms (see LICENSE_REGISTER).
- **Tenant isolation lives in Postgres RLS**, not in the UI. The API must use `withContext()`; never connect as the table owner. `app_user` must stay non-owner, non-superuser, no BYPASSRLS.
- **Editorial orientation: moderate mainstream (wasatiyya), plural across madhhabs.** Owner's standing instruction (2026-11-03): the whole project follows the moderate mainstream Sunni tradition and the plurality of its legal and spiritual schools; it does not take a single-school or single-movement line. No polemics against other Muslims, no takfir/tabdi', no sectarian framing. Source selection draws on mainstream classics across schools and on reputable modern scholarship; contemporary sources are used only if they fit this line. Rulings stay the scholars' (and local law's), never the platform's.
- **Children:** a minor's recording requires a live guardian consent (DB trigger). No unsupervised adult-child contact. No real child data in dev/test.
- No fabricated data presented as real: no fake assessments, certificates, reviews, scholars, institutions.
- Nothing is reported "done" unless tested. Report limits plainly.

## Conventions
- Docs are English; user-facing product copy is Arabic-first. Python 3 scripts run with `python3 -I`. TypeScript strict, ESM, Node >= 22.
- Source locators: `SRC-xxxxxx#toc-N.pNNNN` (no printed page numbers exist in the exports).
- Migrations are append-only (checksum-protected). Never edit an applied migration.
- Decisions that are the owner's (money, public launch, real data, licence commitments, scholarly appointments) are NOT made autonomously.
