#!/usr/bin/env python3
"""Generates governance registers from machine data. IDs/counts/hashes only - no third-party text. Re-run after any pipeline change."""
import json, csv, glob, collections, os, datetime
R = json.load(open('scholarly-assets/source-registry/source_registry.json', encoding='utf-8'))
E = {e['source_id']: e for e in json.load(open('scholarly-assets/review/extraction_summary.json', encoding='utf-8'))}
D = json.load(open('scholarly-assets/review/dedup_summary.json', encoding='utf-8'))
now = datetime.date.today().isoformat()
cat = collections.Counter((r['triage_category'], r['triage_tier']) for r in R)
L = ['# SCHOLARLY_CONTENT_REGISTRY', '', f'Generated {now} by scripts/generate_registry_docs.py. **Triage is analyst title-based and UNREVIEWED by any scholar.** Counts only; no book text is stored in git.', '',
     f'- Files inventoried: **{len(R)}** (SHA-256 of every file in `scholarly-assets/source-registry/source_registry.csv`)',
     f'- Exact duplicate files: **0**', f'- Licence status of ALL files: **LICENSE_REVIEW_REQUIRED** (Shamela-style exports; per-title rights unverified)',
     f'- Extracted (tier 1-3): **{len(E)}** books, **{sum(e["sections"] for e in E.values())}** sections, **{sum(e["units"] for e in E.values())}** paragraph units',
     f'- Printed page numbers: **not available** in these exports; locator = source id + `toc-N` section + paragraph ordinal + char offset', '',
     '## Triage summary', '', '| Category | Tier | Files |', '|---|---|---|']
for (c, t), n in sorted(cat.items(), key=lambda x: (str(x[0][1]), x[0][0])): L.append(f'| {c} | {t} | {n} |')
L += ['', '## Tier 1-3 sources (extracted)', '', '| ID | Category | Tier | Sections | Units | Ayah quotes | Citations parsed |', '|---|---|---|---|---|---|---|']
for r in sorted(R, key=lambda r: (str(r['triage_tier']), r['id'])):
    e = E.get(r['id'])
    if e: L.append(f'| {r["id"]} | {r["triage_category"]} | {r["triage_tier"]} | {e["sections"]} | {e["units"]} | {e["ayah_quotes"]} | {e["cites_parsed"]} |')
L += ['', '## Excluded from extraction (tier 4-5)', '', 'Tier 5 OFF_TOPIC and tier 4 PERIPHERAL files are inventoried and hashed but not processed. Reversible: edit `triage_decisions.csv` and re-run.', '']
open('docs/governance/SCHOLARLY_CONTENT_REGISTRY.md', 'w', encoding='utf-8').write('\n'.join(L))

cl = [json.loads(l) for l in open('scholarly-assets/extraction/_dedup/dedup_clusters.jsonl', encoding='utf-8')]
with open('scholarly-assets/review/dedup_decisions.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f); w.writerow(['cluster_id', 'size', 'n_sources', 'sources', 'decision', 'reviewer'])
    for c in cl: w.writerow([c['cluster_id'], c['size'], len(c['sources']), ' '.join(c['sources']), 'PENDING_HUMAN_REVIEW', ''])
L = ['# CONTENT_DEDUPLICATION_LOG', '', f'Generated {now}. Method and thresholds: `scripts/dedup_report.py` (MinHash/LSH + exact Jaccard verification).', '',
     '## Rule', '- Deduplication **never deletes a difference**. Near-duplicates are *linked to one concept with every source kept*; related variants are *preserved separately*.',
     '- No cluster is merged by the machine. Every cluster starts `PENDING_HUMAN_REVIEW` (`scholarly-assets/review/dedup_decisions.csv`).',
     '- Similarity is textual, not doctrinal: a 0.79 pair may differ by one riwayah-relevant word. Humans decide.', '',
     '## Results', f'- Paragraph units considered (>= 8 words): **{D["units_considered"]}**',
     f'- Pairs: EXACT_NORMALISED **{D["pairs_by_class"].get("EXACT_NORMALISED",0)}**, NEAR_DUPLICATE **{D["pairs_by_class"].get("NEAR_DUPLICATE",0)}**, RELATED_VARIANT **{D["pairs_by_class"].get("RELATED_VARIANT",0)}**',
     f'- Near-duplicate clusters: **{D["near_dup_clusters"]}**; units inside them: **{D["units_in_near_dup_clusters"]}** ({D["pct_units_in_near_dup_clusters"]}%)',
     '- Largest clusters span 10-13 different books. Spot check: they are verses of the classical matns (Jazariyya, Tuhfat al-Atfal) quoted by commentaries -> one `concept` node with many `source_unit_ids`, not many lessons.',
     '- Matn witnesses exist in several editions (SRC-000581, SRC-001096, SRC-012093, plus collections SRC-029915 / SRC-000571): choosing the canonical text is a scholarly decision (queue item Q-003).', '']
open('docs/governance/CONTENT_DEDUPLICATION_LOG.md', 'w', encoding='utf-8').write('\n'.join(L))

q = [['Q-001', 'Triage', 'Review title-based triage of all 74 files (triage_decisions.csv, reviewer=UNREVIEWED)', 'scholarly_reviewer'],
     ['Q-002', 'Triage', 'SRC-009764 (title not self-evident; auto-labelled PERIPHERAL_CANDIDATE by term density)', 'scholarly_reviewer'],
     ['Q-003', 'Canon', 'Choose canonical Jazariyya / Tuhfa witness texts and handle edition differences', 'scholarly_reviewer + qari'],
     ['Q-004', 'Dedup', f'{len(cl)} near-duplicate clusters pending decision (dedup_decisions.csv)', 'scholarly_reviewer']]
bad = collections.defaultdict(list)
for f in glob.glob('scholarly-assets/extraction/SRC-*/units.jsonl'):
    for l in open(f, encoding='utf-8'):
        u = json.loads(l)
        for c in u['quran_citations']:
            if c['status'] in ('AYAH_OUT_OF_RANGE', 'AMBIGUOUS_MULTI_SURAH', 'UNRESOLVED_SURAH'): bad[c['status']].append((u['unit_id'], c['raw']))
n = 5
for st, items in bad.items():
    for uid, raw in items:
        q.append([f'Q-{n:03d}', 'Citation', f'{st}: {uid} {raw}', 'scholarly_reviewer']); n += 1
with open('docs/governance/SCHOLARLY_REVIEW_QUEUE.md', 'w', encoding='utf-8') as f:
    f.write(f'# SCHOLARLY_REVIEW_QUEUE\n\nGenerated {now}. Nothing here has been reviewed by a human. Source typos are flagged, never silently corrected.\n\n| ID | Type | Item | Needs |\n|---|---|---|---|\n')
    for r in q: f.write('| ' + ' | '.join(r) + ' |\n')
    f.write(f'\nQuran citations still unverified against a Quran text: **all** ({sum(e["cites_parsed"] for e in E.values())} parsed) - blocked on the verified Quran Core import (see KNOWN_LIMITATIONS).\n')

with open('docs/governance/LICENSE_REGISTER.md', 'w', encoding='utf-8') as f:
    f.write(f'# LICENSE_REGISTER\n\nGenerated {now}. Not legal advice. Default is NOT cleared.\n\n## Books (74 files in the user folder)\nAll `LICENSE_REVIEW_REQUIRED`. Permitted use now: internal analysis/extraction on the owner\'s machine. **Not permitted until cleared per title:** publishing text, quotations beyond fair use, redistribution, model training.\n\n')
    f.write('## External resources (from Phase-2 acquisition kit; none downloaded)\n| Resource | Terms (as recorded in kit, 2026-10-31) | Status |\n|---|---|---|\n')
    for row in [('Tanzil Quran text 1.1', 'Verbatim copy with attribution + link; no changes. Download requires accepting terms', 'NOT_ACQUIRED - needs owner to accept terms'),
                ('Quran Foundation API', 'Display in app ok; no raw redistribution; storage/ML-training limits', 'API_ONLY, not bundled'),
                ('Quran Lab models (NPL-1.2 / non-commercial)', 'No commercial use', 'EXCLUDED'),
                ('mjmirza/quran-dataset', 'README says CC BY 4.0 but LICENSE says custom revenue-tier/AI-training licence', 'BLOCKED (conflict)'),
                ('Reciter audio', 'Per-reciter rights; datasets do not relicense audio', 'NOT_ACQUIRED'),
                ('H5P / LiveKit / Keycloak', 'Mixed (MIT/GPL parts) / Apache-2.0 / Apache-2.0', 'Candidates; review per component')]:
        f.write('| ' + ' | '.join(row) + ' |\n')
print('docs generated; queue items:', len(q))
