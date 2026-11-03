#!/usr/bin/env python3
"""Generate a JSON of initial Draft status rows for every program, lesson, scenario and guide in docs/human-formation.

Writes a file only; it never touches any database. Each entry carries the content's current review_status (unreviewed today) so a human
can import it deliberately. Importing is an owner/editor action (POST /academy/content/:kind/:ref/transition with to=draft).
Usage: python3 -I scripts/seed_academy_status.py [--out PATH]   (default: docs/human-formation/academy_status_seed.json)
"""
import argparse, glob, json, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
HF = os.path.join(ROOT, 'docs', 'human-formation')
REF = re.compile(r'^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$')

def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)

def collect():
    items = []
    for pr in load(os.path.join(HF, 'programs.json'))['programs']:
        items.append(('program', pr['id'], pr.get('review_status', 'unreviewed')))
    for f in sorted(glob.glob(os.path.join(HF, 'lessons', '*.json'))):
        for u in load(f).get('units', []):
            rs = u.get('review_status', 'unreviewed')
            for l in u.get('lessons', []):
                items.append(('lesson', l['id'], l.get('review_status', rs)))
            for s in u.get('scenarios', []):
                items.append(('scenario', s['id'], s.get('review_status', rs)))
    for f in sorted(glob.glob(os.path.join(HF, 'guides', '*.json'))):
        g = load(f)
        items.append(('guide', g['program'], g.get('review_status', 'unreviewed')))
    return items

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(HF, 'academy_status_seed.json'))
    out = ap.parse_args().out
    seen, rows = set(), []
    for kind, ref, rs in collect():
        if not REF.match(ref):
            sys.exit(f'invalid ref for {kind}: {ref!r}')
        if (kind, ref) in seen:
            sys.exit(f'duplicate {kind} {ref}')
        seen.add((kind, ref))
        rows.append({'content_kind': kind, 'content_ref': ref, 'version': 1, 'status': 'draft', 'content_review_status': rs})
    counts = {k: sum(1 for r in rows if r['content_kind'] == k) for k in ('program', 'lesson', 'scenario', 'guide')}
    doc = {'note': 'Generated seed for academy_content_status (migration 0020). Every item is Draft; no review is implied. Not applied to any database.', 'counts': counts, 'items': rows}
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(json.dumps(counts), '->', out)

main()
