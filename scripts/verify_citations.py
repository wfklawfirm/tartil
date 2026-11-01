#!/usr/bin/env python3
"""Verifies Quran quotes in books against the imported Tanzil text. Usage: python3 -I scripts/verify_citations.py <tanzil.txt> <extraction_dir> <out_dir>
Matching uses a consonantal skeleton (diacritics, small marks, tatweel removed; alef/ya forms unified) on BOTH sides - for comparison only.
Outcome per citation: VERIFIED (quote is inside cited ayat), VERIFIED_FUZZY (>=0.80 similarity on the skeleton), MISMATCH (kept for review; may be a riwayah difference or a source typo),
LOCATED_ELSEWHERE (quote found exactly in a different ayah - strong sign of a mis-numbered citation)."""
import sys, os, re, json, glob, collections, difflib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from quran_reference import parse_citation
tz, ext, out = sys.argv[1:4]; os.makedirs(out, exist_ok=True)
def skel(t):
    # Uthmani rasm vs imla'i spelling: waw+dagger-alef (الصلوٰة) == imla'i alef; so drop that waw first, then drop ALL alef/hamza forms on both sides.
    t = re.sub('\u0648\u0670', '', t)
    t = re.sub(r'[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u08D3-\u08FF]', '', t)
    t = t.translate(str.maketrans('ىةؤئ', 'ي' + 'هوي'))
    t = re.sub('[اأإآٱء]', '', t)
    return re.sub(r'[^\u0621-\u064A]', '', t)
A = {}
for l in open(tz, encoding='utf-8'):
    m = re.match(r'^(\d+)\|(\d+)\|(.+)$', l.rstrip('\n'))
    if m: A[(int(m[1]), int(m[2]))] = skel(m[3])
assert len(A) == 6236
big = ''.join(A[k] + '|' for k in sorted(A)); idx = []; pos = 0
for k in sorted(A): idx.append((pos, k)); pos += len(A[k]) + 1
import bisect
starts = [p for p, _ in idx]
def locate(q):
    i = big.find(q)
    return idx[bisect.bisect_right(starts, i) - 1][1] if i >= 0 else None
QC = re.compile(r'﴿([^﴾]{1,900})﴾\s*[\.،,]?\s*([\[\(][^\]\)]{1,60}[\]\)])')
cnt = collections.Counter(); per_book = collections.defaultdict(collections.Counter); det = open(os.path.join(out, 'citation_verification.jsonl'), 'w', encoding='utf-8')
for f in sorted(glob.glob(os.path.join(ext, 'SRC-*', 'units.jsonl'))):
    for l in open(f, encoding='utf-8'):
        u = json.loads(l)
        for m in QC.finditer(u['text']):
            c = parse_citation(m[2])
            if not c or c['status'] != 'RESOLVED_UNVERIFIED': continue
            q = skel(m[1])
            if len(q) < 6: continue
            s = c['surah']; ay = [a for a in c['ayat'] if (s, a) in A]
            if not ay: st = 'MISMATCH'; sim = 0
            else:
                lo, hi = min(ay), max(ay)
                if c['range']: lo, hi = c['range']
                tgt = ''.join(A.get((s, a), '') for a in range(lo, hi + 1))
                if q in tgt or (len(tgt) > 8 and tgt in q): st, sim = 'VERIFIED', 1.0
                else:
                    sim = difflib.SequenceMatcher(None, q, tgt, autojunk=False).find_longest_match(0, len(q), 0, len(tgt)).size / max(min(len(q), len(tgt)), 1)
                    if sim >= 0.80: st = 'VERIFIED_FUZZY'
                    else:
                        loc = locate(q); st = 'LOCATED_ELSEWHERE' if loc else 'MISMATCH'
                        if loc: c['found_at'] = list(loc)
            cnt[st] += 1; per_book[u['source_id']][st] += 1
            det.write(json.dumps({'unit_id': u['unit_id'], 'cited': c['raw'], 'status': st, 'similarity': round(sim, 3), 'found_at': c.get('found_at')}, ensure_ascii=False) + '\n')
tot = sum(cnt.values())
summary = {'tanzil_ayat': len(A), 'quotes_checked': tot, 'by_status': dict(cnt), 'pct_verified': round(100 * (cnt['VERIFIED'] + cnt['VERIFIED_FUZZY']) / tot, 2),
           'books_with_most_mismatch': sorted(((b, v['MISMATCH'] + v['LOCATED_ELSEWHERE']) for b, v in per_book.items()), key=lambda x: -x[1])[:8]}
json.dump(summary, open(os.path.join(out, 'citation_verification_summary.json'), 'w'), indent=1); print(json.dumps(summary, indent=1))
