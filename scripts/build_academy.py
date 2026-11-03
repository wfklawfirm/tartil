#!/usr/bin/env python3 -I
"""Builds packages/web-vercel/academy.json (and the copy in packages/web) from the competency register and the source-passage records.
Content is DRAFT (unreviewed): the viewer shows that banner. No third-party book text is included - only our paraphrases and heading locators."""
import json, re, pathlib
root = pathlib.Path(__file__).resolve().parents[1]
hf = root / 'docs' / 'human-formation'
comps = json.loads((hf / 'competencies.json').read_text(encoding='utf-8'))
rec = {}
files = [hf / 'PILOT_SOURCE_RECORDS.md'] + sorted((hf / 'records').glob('records_*.md')) if (hf / 'records').exists() else [hf / 'PILOT_SOURCE_RECORDS.md']
for f in files:
    t = f.read_text(encoding='utf-8')
    parts = re.split(r'(?m)^## (?=SPR-[A-Z]\d)', t)
    for p in parts[1:]:
        m = re.match(r'SPR-([A-Z]\d)', p)
        if m: rec[m.group(1)] = '## ' + p.strip().rstrip('-').strip()
for c in comps: c['record'] = rec.get(c['id'])
dom = {'K': 'المعرفة والفهم', 'C': 'الخلق والقيم', 'S': 'إدارة الذات', 'T': 'التفكير والتعلّم', 'R': 'العلاقات والأسرة', 'W': 'العمل والحياة الاقتصادية', 'L': 'القيادة والمجتمع', 'M': 'التعليم والإرشاد'}
out = {'status': 'draft-unreviewed', 'generated': '2026-11-03', 'domains': dom, 'competencies': comps}
for d in (root / 'packages' / 'web-vercel', root / 'packages' / 'web'):
    (d / 'academy.json').write_text(json.dumps(out, ensure_ascii=False), encoding='utf-8')
print(len(comps), 'competencies;', sum(1 for c in comps if c['record']), 'with records')

# lessons (optional): docs/human-formation/lessons/lessons_*.json -> academy-lessons.json {competency: unit}
units = {}
for f in sorted((hf / 'lessons').glob('lessons_*.json')) if (hf / 'lessons').exists() else []:
    for u in json.loads(f.read_text(encoding='utf-8')).get('units', []):
        units[u['competency']] = u
lo = {'status': 'draft-unreviewed', 'generated': '2026-11-03', 'units': units}
for d in (root / 'packages' / 'web-vercel', root / 'packages' / 'web'):
    (d / 'academy-lessons.json').write_text(json.dumps(lo, ensure_ascii=False), encoding='utf-8')
print(len(units), 'units with lessons;', sum(len(u['lessons']) for u in units.values()), 'lessons;', sum(len(u['scenarios']) for u in units.values()), 'scenarios')

# programs (optional): docs/human-formation/programs.json -> academy-programs.json
pf = hf / 'programs.json'
if pf.exists():
    for d in (root / 'packages' / 'web-vercel', root / 'packages' / 'web'):
        (d / 'academy-programs.json').write_text(json.dumps(json.loads(pf.read_text(encoding='utf-8')), ensure_ascii=False), encoding='utf-8')
    print('programs:', len(json.loads(pf.read_text(encoding='utf-8'))['programs']))

# guides: docs/human-formation/guides/P*.json -> academy-guides.json (draft, unreviewed)
gd = hf / 'guides'
if gd.exists():
    gs = {}
    for f in sorted(gd.glob('P*.json')):
        g = json.loads(f.read_text(encoding='utf-8')); gs[g['program']] = g
    for d in (root / 'packages' / 'web-vercel', root / 'packages' / 'web'):
        (d / 'academy-guides.json').write_text(json.dumps({'status': 'draft-unreviewed', 'guides': gs}, ensure_ascii=False), encoding='utf-8')
    print('guides:', len(gs))
