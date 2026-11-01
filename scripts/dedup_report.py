#!/usr/bin/env python3
"""Phase 2 duplicate detection across books. Detects (never merges). Usage: python3 -I scripts/dedup_report.py <extraction_dir> <out_dir>
Method: exact (normalised sha256) + MinHash/LSH (64 perms, 16 bands x 4 rows) over 4-word shingles, then EXACT Jaccard verification.
Classes:  EXACT_NORMALISED (>=0.98)  NEAR_DUPLICATE (0.80-0.98)  RELATED_VARIANT (0.55-0.80).
Policy: NEAR_DUPLICATE may be *linked* to one concept with all sources kept; RELATED_VARIANT must be preserved as separate scholarly material
(differences may be doctrinal: riwayah/tariq/opinion). Nothing is merged without human review (SCHOLARLY_REVIEW_QUEUE)."""
import sys, os, json, glob, zlib, collections
import numpy as np
ext, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
import re
units = []
for f in sorted(glob.glob(os.path.join(ext, 'SRC-*', 'units.jsonl'))):
    for l in open(f, encoding='utf-8'):
        u = json.loads(l)
        if u['words'] >= 8: units.append(u)
print('units considered (>=8 words):', len(units))
norm_cache = {}
def words_of(u):
    t = re.sub(r'[ً-ْٰـ]', '', u['text']).translate(str.maketrans('أإآٱىةؤئ', 'ااااي' + 'هوي'))
    return re.sub(r'[^ء-ي0-9\s]', ' ', t).split()
K = 4
sets, keep = [], []
for i, u in enumerate(units):
    w = words_of(u)
    sh = {zlib.crc32(' '.join(w[j:j + K]).encode()) for j in range(max(len(w) - K + 1, 1))}
    sets.append(np.fromiter(sh, dtype=np.uint64, count=len(sh)))
rng = np.random.default_rng(20261101)
P = np.uint64((1 << 61) - 1)
A = rng.integers(1, 1 << 31, size=64, dtype=np.uint64); B = rng.integers(0, 1 << 31, size=64, dtype=np.uint64)
sig = np.empty((len(units), 64), dtype=np.uint64)
for i, s in enumerate(sets):
    sig[i] = ((s[:, None] * A[None, :] + B[None, :]) % P).min(axis=0)
buckets = collections.defaultdict(list)
for band in range(16):
    cols = sig[:, band * 4:(band + 1) * 4]
    for i in range(len(units)):
        buckets[(band, cols[i].tobytes())].append(i)
cand = set()
skipped = 0
for b, idx in buckets.items():
    if len(idx) < 2: continue
    if len(idx) > 150: skipped += 1; continue          # formulaic phrase buckets (e.g. basmala/doxologies)
    for x in range(len(idx)):
        for y in range(x + 1, len(idx)):
            a, c = idx[x], idx[y]
            if units[a]['source_id'] != units[c]['source_id']: cand.add((a, c))
print('candidate cross-source pairs:', len(cand), 'oversized buckets skipped:', skipped)
sh_py = {}
def S(i):
    if i not in sh_py: sh_py[i] = set(sets[i].tolist())
    return sh_py[i]
pairs = []
for a, c in cand:
    sa, sc = S(a), S(c)
    j = len(sa & sc) / len(sa | sc)
    if j >= 0.55: pairs.append((a, c, j))
cls = lambda j: 'EXACT_NORMALISED' if j >= 0.98 else ('NEAR_DUPLICATE' if j >= 0.80 else 'RELATED_VARIANT')
# union-find clusters over NEAR_DUPLICATE+ only
par = list(range(len(units)))
def find(x):
    while par[x] != x: par[x] = par[par[x]]; x = par[x]
    return x
for a, c, j in pairs:
    if j >= 0.80: par[find(a)] = find(c)
groups = collections.defaultdict(list)
for i in range(len(units)):
    pass
members = set(); [members.update((a, c)) for a, c, j in pairs if j >= 0.80]
for i in members: groups[find(i)].append(i)
clusters = sorted(groups.values(), key=lambda g: -len(g))
with open(os.path.join(out, 'dedup_clusters.jsonl'), 'w', encoding='utf-8') as f:
    for n, g in enumerate(clusters, 1):
        f.write(json.dumps({'cluster_id': f'DUP-{n:05d}', 'size': len(g), 'sources': sorted({units[i]['source_id'] for i in g}),
                            'units': [units[i]['unit_id'] for i in g], 'sample_text': units[g[0]]['text'][:160],
                            'decision': 'PENDING_HUMAN_REVIEW'}, ensure_ascii=False) + '\n')
with open(os.path.join(out, 'related_variants.jsonl'), 'w', encoding='utf-8') as f:
    for a, c, j in sorted(pairs, key=lambda x: -x[2]):
        if j < 0.80: f.write(json.dumps({'a': units[a]['unit_id'], 'b': units[c]['unit_id'], 'jaccard': round(j, 3), 'class': 'RELATED_VARIANT', 'decision': 'PRESERVE_SEPARATE'}) + '\n')
cnt = collections.Counter(cls(j) for _, _, j in pairs)
srcpairs = collections.Counter()
for a, c, j in pairs:
    if j >= 0.80: srcpairs[tuple(sorted((units[a]['source_id'], units[c]['source_id'])))] += 1
summary = {'units_considered': len(units), 'pairs_by_class': dict(cnt), 'near_dup_clusters': len(clusters),
           'largest_clusters': [{'size': len(g), 'sources': len({units[i]['source_id'] for i in g})} for g in clusters[:10]],
           'top_source_pairs_by_near_dup': [[list(k), v] for k, v in srcpairs.most_common(10)],
           'units_in_near_dup_clusters': len(members), 'pct_units_in_near_dup_clusters': round(100 * len(members) / len(units), 2)}
json.dump(summary, open(os.path.join(out, 'dedup_summary.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(summary, ensure_ascii=False, indent=1))
