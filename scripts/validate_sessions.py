#!/usr/bin/env python3
"""Validate docs/human-formation/sessions/P*.json against programs.json and lessons.
Errors fail (exit 1); WARN lines are advisory (rhythm/duration mismatches).
Usage: python3 -I scripts/validate_sessions.py"""
import json, glob, os, re, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
HF = os.path.join(ROOT, 'docs/human-formation')
AR = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
BAD = re.compile(r'(\d+\s*/\s*\d+|\d+\s*(نقطة|نقاط|درجة|درجات)|ترتيب الأطفال|الأول على|المتصدر|لوحة الشرف|\bscore\b|leaderboard|\bpoints\b)')
TECH = re.compile(r'(\b[A-Z]{1,2}\d{1,2}(-[A-Z]?\d*)?\b|SPR-|\bP\d\d\b|[A-Za-z]+_[A-Za-z_]+)')
TYPES = ['intro', 'source_teaching', 'interactive_practice', 'reflection', 'assessment']
REQ = ['session_number', 'week', 'title', 'competency', 'objective', 'duration_min', 'components', 'review_status']
items = {}
for f in sorted(glob.glob(HF + '/lessons/lessons_*.json')):
    for u in json.load(open(f, encoding='utf-8'))['units']:
        for l in u['lessons']:
            items[l['id']] = ('lesson', max(u['min_age'], int(re.match(r'\d+', l['age_range']).group())), l['duration_min'], u['competency'])
        for s in u['scenarios']:
            items[s['id']] = ('scenario', max(u['min_age'], s['age_min']), None, u['competency'])
progs = {p['id']: p for p in json.load(open(HF + '/programs.json', encoding='utf-8'))['programs']}
err, warn = [], []
files = sorted(glob.glob(HF + '/sessions/P*.json'))
if not files: err.append('no session files')
for f in files:
    d = json.load(open(f, encoding='utf-8')); pid = d.get('program', '?'); w = pid
    if os.path.basename(f) != pid + '.json': err.append(f'{w}: file name != program')
    if pid not in progs: err.append(f'{w}: unknown program'); continue
    P = progs[pid]
    if d.get('status') != 'draft-unreviewed': err.append(f'{w}: status must be draft-unreviewed')
    ss = d.get('sessions', [])
    if d.get('total_sessions') != len(ss) or not ss: err.append(f'{w}: total_sessions mismatch')
    rm = re.search(r'(\d+)\s*دقيقة', P['rhythm'].translate(AR)); rmin = int(rm.group(1)) if rm else None
    _r = P['rhythm'].translate(AR); _m = re.search(r'(\d+)\s*جلسات', _r)
    per = 2 if 'جلستان' in _r else (int(_m.group(1)) if _m else (3 if 'ثلاث جلسات' in _r else 1))
    prev_week = 0
    for i, s in enumerate(ss, 1):
        sw = f'{pid} session {i}'
        for k in REQ:
            if s.get(k) in (None, '', []): err.append(f'{sw}: missing {k}')
        if s.get('session_number') != i: err.append(f'{sw}: session_number not sequential')
        if s.get('review_status') != 'unreviewed': err.append(f'{sw}: review_status must be unreviewed')
        wk = s.get('week', 0)
        if wk < prev_week: err.append(f'{sw}: week goes backwards')
        prev_week = wk
        if sum(1 for x in ss if x.get('week') == wk) > per: warn.append(f'{sw}: week {wk} has more than {per} sessions')
        if wk > P['duration_weeks']: warn.append(f'{sw}: week {wk} beyond program duration_weeks={P["duration_weeks"]}')
        if re.search(r'[A-Za-z]', s.get('title', '')) or TECH.search(s.get('title', '')): err.append(f'{sw}: technical/latin text in title')
        if s.get('competency') not in P['competencies']: err.append(f'{sw}: competency {s.get("competency")} not in program')
        if BAD.search(json.dumps(s, ensure_ascii=False)): err.append(f'{sw}: grading language: {BAD.search(json.dumps(s, ensure_ascii=False)).group()}')
        if s.get('min_age', 0) > P['age_min']: err.append(f'{sw}: min_age {s["min_age"]} > program age_min {P["age_min"]}')
        comps = s.get('components', [])
        types = [c.get('type') for c in comps]
        is_scn = bool(comps) and comps[0].get('ref', {}).get('kind') == 'scenario'
        for t in TYPES[:4]:  # a scenario session has no source_teaching: the story is the source
            if t not in types and not (is_scn and t == 'source_teaching'): err.append(f'{sw}: missing component {t}')
        order = [t for t in types if t != 'assessment']
        if order != [t for t in TYPES[:4] if t in order]: err.append(f'{sw}: component order')
        tot, kinds = 0, set()
        for c in comps:
            m = c.get('minutes')
            if not isinstance(m, int) or m < 0: err.append(f'{sw}: bad minutes'); continue
            tot += m
            r = c.get('ref')
            if not r: err.append(f'{sw}: {c.get("type")} without ref'); continue
            if r['id'] not in items: err.append(f'{sw}: unknown ref {r["id"]}'); continue
            if items[r['id']][0] != r['kind']: err.append(f'{sw}: kind mismatch {r["id"]}')
            kinds.add(r['id'])
            if r['kind'] == 'scenario' and m == 0: err.append(f'{sw}: scenario component with 0 minutes')
            if c['type'] == 'assessment':
                if m == 0 and c.get('embedded_in') != 'interactive_practice': err.append(f'{sw}: 0-minute assessment must be embedded_in interactive_practice')
            elif m == 0: err.append(f'{sw}: {c["type"]} has 0 minutes')
            if not c.get('text'): err.append(f'{sw}: component {c["type"]} without text')
            if items[r['id']][3] != s.get('competency'): err.append(f'{sw}: ref {r["id"]} belongs to another competency')
            if items[r['id']][1] > P['age_min']: err.append(f'{sw}: ref {r["id"]} needs age {items[r["id"]][1]}')
        if tot != s.get('duration_min'): err.append(f'{sw}: components sum {tot} != duration_min {s.get("duration_min")}')
        for k in kinds:
            if items[k][2] and items[k][2] != s.get('duration_min'): err.append(f'{sw}: {k} real duration {items[k][2]} != duration_min')
        if rmin and s.get('duration_min', 0) > rmin: warn.append(f'{sw}: {s["duration_min"]} min exceeds program rhythm {rmin} min')
        h = s.get('homework')
        if h:
            if h.get('out_of_session') is not True or not isinstance(h.get('estimated_minutes'), int) or h['estimated_minutes'] <= 0 or not h.get('text'):
                err.append(f'{sw}: homework needs out_of_session=true, text, estimated_minutes')
            if h.get('ref', {}).get('id') not in items: err.append(f'{sw}: homework ref unknown')
    # every program item covered by exactly the planned sessions
    want = [it['ref'] for st in P['stages'] for it in st['items']]
    got = [c['ref']['id'] for s in ss for c in s['components'][:1]]
    if want != got: err.append(f'{w}: session items {got} != program items {want}')
    print(f'{pid}: {len(ss)} sessions, weeks {ss[0]["week"]}-{ss[-1]["week"]} (program {P["duration_weeks"]} wk x {per}), minutes {sum(s["duration_min"] for s in ss)}')
for x in warn: print('WARN', x)
for e in err: print('ISSUE', e)
print(f'{len(err)} issues, {len(warn)} warnings')
sys.exit(1 if err else 0)
