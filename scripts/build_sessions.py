#!/usr/bin/env python3
"""Collect docs/human-formation/sessions/P*.json -> academy-sessions.json
(packages/web and packages/web-vercel, identical copies). Optional in the UI.
Usage: python3 -I scripts/build_sessions.py"""
import json, glob, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sd = os.path.join(ROOT, 'docs/human-formation/sessions')
progs = {}
for f in sorted(glob.glob(sd + '/P*.json')):
    d = json.load(open(f, encoding='utf-8'))
    progs[d['program']] = d
out = {'status': 'draft-unreviewed', 'programs': progs}
for pk in ('web-vercel', 'web'):
    with open(os.path.join(ROOT, 'packages', pk, 'academy-sessions.json'), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False)
print('sessions:', {k: v['total_sessions'] for k, v in progs.items()})
