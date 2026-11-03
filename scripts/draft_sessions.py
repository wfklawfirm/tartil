#!/usr/bin/env python3
"""Derive a DRAFT session plan for one program from programs.json + lessons.
Usage: python3 -I scripts/draft_sessions.py P01 [P06 ...]
Writes docs/human-formation/sessions/<PXX>.json (status draft-unreviewed).
Nothing is invented: titles/objectives/step texts come from the lesson files;
minutes come from the lesson guide_script offsets (lessons) or from the
decision depth of the scenario (see SESSIONS.md)."""
import json, glob, os, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
HF = os.path.join(ROOT, 'docs/human-formation')
AR = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')

def load_units():
    units = {}  # keyed by unit_id (several units may share one competency)
    for f in sorted(glob.glob(HF + '/lessons/lessons_*.json')):
        for u in json.load(open(f, encoding='utf-8'))['units']:
            units[u.get('unit_id') or u['competency']] = u
    return units

def find_item(units, ref):
    for u in units.values():
        for l in u['lessons']:
            if l['id'] == ref: return 'lesson', u, l
        for s in u['scenarios']:
            if s['id'] == ref: return 'scenario', u, s
    return None, None, None

def decision_depth(s):
    nodes = s['nodes']
    def d(k):
        n = nodes[k]
        ch = n.get('choices') or []
        return 0 if not ch else 1 + max(d(c['next']) for c in ch)
    return d(s['start'])

def first_int(txt): return int(''.join(c for c in txt.translate(AR).split('-')[0] if c.isdigit()))

def lesson_components(u, l):
    gs = l['guide_script']; total = l['duration_min']
    offs = [g['min'] for g in gs] + [total]
    segs = [(offs[i + 1] - offs[i], gs[i]['step']) for i in range(len(gs))]
    ref = {'kind': 'lesson', 'id': l['id']}
    if len(segs) < 4: raise SystemExit(f"{l['id']}: guide_script has <4 steps")
    mid = segs[2:-1]
    comps = [
        {'type': 'intro', 'minutes': segs[0][0], 'ref': ref, 'text': segs[0][1]},
        {'type': 'source_teaching', 'minutes': segs[1][0], 'ref': ref, 'text': segs[1][1]},
        {'type': 'interactive_practice', 'minutes': sum(m for m, _ in mid), 'ref': ref, 'text': ' ثم '.join(t for _, t in mid)},
        {'type': 'assessment', 'minutes': 0, 'embedded_in': 'interactive_practice', 'ref': ref,
         'text': 'ملاحظة تكوينية وصفية أثناء الممارسة، دون درجات.', 'criteria': l['formative']},
        {'type': 'reflection', 'minutes': segs[-1][0], 'ref': ref, 'text': segs[-1][1]},
    ]
    return comps

def scenario_components(u, s):
    depth = decision_depth(s)
    ref = {'kind': 'scenario', 'id': s['id']}
    return [
        {'type': 'intro', 'minutes': 2, 'ref': ref, 'text': 'قراءة مقدمة الموقف.'},
        {'type': 'interactive_practice', 'minutes': 2 * depth, 'ref': ref, 'text': f'يختار المتعلمون في {depth} قرارات متتابعة ويقرؤون عاقبة كل اختيار.'},
        {'type': 'reflection', 'minutes': 2, 'ref': ref, 'text': 'حديث عن النهاية التي وصلوا إليها وسؤال التأمل في آخر الموقف.'},
    ]

def sessions_per_week(rhythm):
    t = rhythm.translate(AR)
    if 'جلستان' in t: return 2
    if 'ثلاث جلسات' in t: return 3
    return 1

def draft(prog):
    units = load_units()
    per_week = sessions_per_week(prog['rhythm'])
    sessions, wk, slot = [], 1, 0
    for st in prog['stages']:
        start = first_int(st['weeks'])
        if wk < start: wk, slot = start, 0
        for it in st['items']:
            kind, u, o = find_item(units, it['ref'])
            if kind != it['kind']: raise SystemExit(f"{it['ref']}: kind mismatch")
            if kind == 'lesson':
                comps, title, obj, dur = lesson_components(u, o), o['title'], o['objective'], o['duration_min']
                age = max(u['min_age'], first_int(o['age_range']))
                lp = o.get('life_practice') or {}
                hw = None
                if lp.get('task'):
                    hw = {'optional': True, 'out_of_session': True, 'text': lp['task'],
                          'estimated_minutes': max(10, 3 * len(lp.get('steps', []))), 'ref': {'kind': 'lesson', 'id': o['id']}}
            else:
                comps = scenario_components(u, o)
                title, dur = o['title'], sum(c['minutes'] for c in comps)
                obj = o['premise'].split('ويتدرب المتعلم هنا على')[-1].strip(' .') if 'ويتدرب المتعلم هنا على' in o['premise'] else None
                obj = ('أن يتدرب المتعلم على ' + obj) if obj else f"أن يقرر المتعلم في موقف «{title}» ويرى عاقبة اختياره."
                age, hw = max(u['min_age'], o['age_min']), None
            if slot == per_week: wk, slot = wk + 1, 0
            slot += 1
            s = {'session_number': len(sessions) + 1, 'week': wk, 'stage': st['id'], 'title': title,
                 'competency': u['competency'], 'competency_title': u['title'], 'objective': obj,
                 'min_age': age, 'duration_min': dur, 'components': comps}
            if hw: s['homework'] = hw
            s['review_status'] = 'unreviewed'
            sessions.append(s)
    return {'program': prog['id'], 'status': 'draft-unreviewed', 'total_sessions': len(sessions), 'sessions': sessions}

if __name__ == '__main__':
    progs = {p['id']: p for p in json.load(open(HF + '/programs.json', encoding='utf-8'))['programs']}
    for pid in sys.argv[1:]:
        out = draft(progs[pid])
        path = f'{HF}/sessions/{pid}.json'
        json.dump(out, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(pid, out['total_sessions'], 'sessions ->', path)
