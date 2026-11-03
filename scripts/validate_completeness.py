#!/usr/bin/env python3 -I
"""Academy completeness gate (TARTIL 14.1). Fails (exit 1) when any academy-*.json has empty/placeholder/broken content
that a learner, guide or parent would see as an empty section, an unanswered FAQ, a dangling reference, an activity
without content, an assessment without criteria, or a leaked HTML entity / internal marker.
Usage: python3 -I scripts/validate_completeness.py [--json] [--program P07]
Reads packages/web-vercel/academy-*.json (the published artefacts) only; never modifies anything."""
import json, re, sys, pathlib, collections

root = pathlib.Path(__file__).resolve().parents[1]
W = root / 'packages' / 'web-vercel'
load = lambda n: json.loads((W / n).read_text(encoding='utf-8'))
programs = load('academy-programs.json')['programs']
guides = load('academy-guides.json')['guides']
units = load('academy-lessons.json')['units']
comps = load('academy.json')['competencies']

only = None
if '--program' in sys.argv:
    only = sys.argv[sys.argv.index('--program') + 1]

errs = collections.defaultdict(list)   # code -> [where]   (gate failures)
warns = collections.defaultdict(list)  # code -> [where]   (reported, do not fail the gate)
def bad(code, where, detail=''):
    errs[code].append((where + (' :: ' + detail if detail else '')))
def warn(code, where, detail=''):
    warns[code].append((where + (' :: ' + detail if detail else '')))

def blank(v):
    return v is None or (isinstance(v, str) and not v.strip()) or (isinstance(v, (list, dict)) and not v)

# ---- text hygiene: applied to every string in every artefact -------------------------------------------------
ENTITY = re.compile(r'&#x?[0-9A-Fa-f]+;|&(?:amp|lt|gt|quot|apos|nbsp);')
PLACEHOLDER = re.compile(r'\bTODO\b|\bTBD\b|\bFIXME\b|lorem ipsum|\bundefined\b|\bNaN\b|\[object |\{\{|\}\}|<<|>>>|\bxxx+\b|؟؟؟|^\s*(?:null|None)\s*$', re.I)
INTERNAL = re.compile(r'\bD\d{1,2}\b|SPR-|CLAUDE\.md|BLUEPRINT|قرار المالك|يختاره المالك|يضيفه المالك')
HTMLTAG = re.compile(r'</?(?:p|div|span|br|b|i|a|script|ul|li)\b[^>]*>', re.I)

NOT_RENDERED = ('source_basis', 'source_record', 'grounding', 'review_gate', 'review_status', 'record', 'anchors')  # reviewer-only (#/academy/review) / provenance fields
def walk(o, where, fn):
    if isinstance(o, str): fn(o, where)
    elif isinstance(o, list):
        for i, x in enumerate(o): walk(x, f'{where}[{i}]', fn)
    elif isinstance(o, dict):
        for k, v in o.items():
            if k in NOT_RENDERED: continue
            walk(v, f'{where}.{k}', fn)

def hygiene(s, where):
    if ENTITY.search(s): bad('html_entity', where, ENTITY.search(s).group(0))
    if HTMLTAG.search(s): bad('raw_html_tag', where, HTMLTAG.search(s).group(0))
    m = PLACEHOLDER.search(s)
    if m: bad('placeholder', where, m.group(0))
    m = INTERNAL.search(s)
    if m: bad('internal_marker', where, s[max(0, m.start() - 25):m.end() + 25].replace('\n', ' '))
    if s != s.strip() and s.strip() == '': bad('whitespace_only', where)

# ---- id universe ---------------------------------------------------------------------------------------------
lessons = {l['id']: (u, l) for u in units.values() for l in u.get('lessons', [])}
scenarios = {s['id']: (u, s) for u in units.values() for s in u.get('scenarios', [])}
pids = {p['id'] for p in programs}
slugs = {p['slug'] for p in programs}
cids = {c['id'] for c in comps}

# ---- programs ------------------------------------------------------------------------------------------------
for p in programs:
    if only and p['id'] != only: continue
    w = f"program {p['id']}"
    walk(p, w, hygiene)
    for k in ('title', 'tagline', 'promise', 'audience', 'rhythm', 'outcomes', 'stages', 'capstone', 'safeguards', 'guide_notes'):
        if blank(p.get(k)): bad('program_empty_field', w, k)
    cap = p.get('capstone') or {}
    for k in ('title', 'brief', 'deliverable'):
        if blank(cap.get(k)): bad('capstone_incomplete', w, k)
    for c in p.get('competencies', []):
        if c not in cids: bad('dangling_ref', w, f'competency {c}')
    for n in p.get('next_programs', []):
        if n not in pids: bad('dangling_ref', w, f'next_program {n}')
    for pre in p.get('prerequisites', []):
        for pid in re.findall(r'\bP\d\d\b', pre):
            if pid not in pids: bad('dangling_ref', w, f'prerequisite {pid}')
    if p['id'] not in guides: bad('program_without_guide', w)
    nitems = 0
    for st in p.get('stages', []):
        sw = f"{w} stage {st.get('id')}"
        for k in ('title', 'weeks', 'purpose', 'items', 'mission', 'check'):
            if blank(st.get(k)): bad('stage_empty_field', sw, k)
        m = st.get('mission') or {}
        for k in ('title', 'brief', 'private_reflection'):
            if blank(m.get(k)): bad('mission_incomplete', sw, k)
        if blank(st.get('check')): bad('assessment_missing', sw, 'stage check (how progress is seen)')
        for it in st.get('items', []):
            nitems += 1
            ref = it.get('ref')
            if ref not in lessons and ref not in scenarios: bad('dangling_ref', sw, f'item {ref} has no lesson/scenario')
            elif it.get('kind') == 'lesson' and ref not in lessons: bad('kind_mismatch', sw, ref)
            elif it.get('kind') == 'scenario' and ref not in scenarios: bad('kind_mismatch', sw, ref)
    if nitems == 0: bad('program_no_items', w)

# ---- guides --------------------------------------------------------------------------------------------------
for pid, g in guides.items():
    if only and pid != only: continue
    w = f'guide {pid}'
    walk(g, w, hygiene)
    if pid not in pids: bad('guide_without_program', w)
    G, P = g.get('for_guide') or {}, g.get('for_parent') or {}
    for k in ('overview', 'before_start', 'week_by_week', 'how_to_respond', 'when_to_refer', 'materials'):
        if blank(G.get(k)): bad('guide_section_empty', w, f'for_guide.{k}')
    if not P.get('not_applicable'):
        for k in ('overview', 'what_to_expect', 'how_to_support_at_home', 'please_avoid', 'privacy'):
            if blank(P.get(k)): bad('parent_section_empty', w, f'for_parent.{k}')
    for i, wk in enumerate(G.get('week_by_week') or []):
        for k in ('week', 'focus', 'tip'):
            if blank(wk.get(k)): bad('week_incomplete', f'{w} week[{i}]', k)
    for i, h in enumerate(G.get('how_to_respond') or []):
        for k in ('situation', 'say', 'avoid'):
            if blank(h.get(k)): bad('respond_incomplete', f'{w} how_to_respond[{i}]', k)
    faq = g.get('faq')
    if blank(faq): bad('faq_missing', w)
    for i, f in enumerate(faq or []):
        if not isinstance(f, dict): bad('faq_unanswered', f'{w} faq[{i}]', 'not an object'); continue
        if blank(f.get('q')): bad('faq_unanswered', f'{w} faq[{i}]', 'empty question')
        if blank(f.get('a')): bad('faq_unanswered', f'{w} faq[{i}]', 'no answer: ' + str(f.get('q'))[:60])
        elif len(str(f['a']).strip()) < 20: bad('faq_unanswered', f'{w} faq[{i}]', 'answer too short')
    wk = [x.get('week') for x in G.get('week_by_week') or []]
    prog = next((p for p in programs if p['id'] == pid), None)
    if prog and wk and len(wk) != prog['duration_weeks']:
        bad('week_count_mismatch', w, f"{len(wk)} weeks in guide vs duration_weeks={prog['duration_weeks']}")
    # privacy sentence must not promise a sharing/reading route that does not exist (checked in the audit doc; here only flag mismatch of server claims)
for pr in programs:
    if only and pr['id'] != only: continue
    if pr['id'] not in guides: pass

# ---- lessons -------------------------------------------------------------------------------------------------
USED = {it['ref'] for p in programs for st in p.get('stages', []) for it in st.get('items', [])}
for uid, u in units.items():
    w = f'unit {uid}'
    if only and not any(i in USED and any(p['id'] == only and any(it['ref'] == i for st in p['stages'] for it in st['items']) for p in programs) for i in [x['id'] for x in u.get('lessons', []) + u.get('scenarios', [])]): continue
    walk(u, w, hygiene)
    if blank(u.get('lessons')): bad('unit_no_lessons', w)
    if blank(u.get('scenarios')): bad('unit_no_scenarios', w)
    if u.get('competency') not in cids: bad('dangling_ref', w, f"competency {u.get('competency')}")
    for k in ('title', 'summary', 'source_record'):
        if blank(u.get(k)): bad('unit_empty_field', w, k)
    for l in u.get('lessons', []):
        lw = f"lesson {l['id']}"
        for k in ('title', 'objective', 'hook', 'key_ideas', 'activities', 'life_practice', 'formative', 'safeguards', 'guide_script', 'closing', 'duration_min'):
            if blank(l.get(k)): bad('lesson_empty_field', lw, k)
        if not blank(l.get('activities')):
            for i, a in enumerate(l['activities']):
                aw = f'{lw} activity[{i}] «{a.get("title")}»'
                if blank(a.get('learner_text')): bad('activity_no_learner_text', aw)
                if blank(a.get('instructions')): bad('activity_no_guide_instructions', aw)
                if blank(a.get('title')) or blank(a.get('type')): bad('activity_untitled', aw)
                if 'questions' in a and (blank(a['questions']) or any(blank(q) for q in a['questions'])): bad('activity_empty_questions', aw)
        lp = l.get('life_practice') or {}
        for k in ('task', 'steps', 'reflection_prompt', 'private_note'):
            if blank(lp.get(k)): bad('life_practice_incomplete', lw, k)
        if blank(lp.get('parent_note')):
            (bad if (u.get('min_age') or 0) < 16 else warn)('life_practice_no_parent_note', lw, f"unit min_age={u.get('min_age')}")
        fm = l.get('formative') or {}
        for k in ('ظهر', 'يتدرب', 'يحتاج_دعما'):
            if blank(fm.get(k)): bad('assessment_missing', lw, f'formative.{k}')
        cl = l.get('closing') or {}
        for k in ('summary', 'home_question'):
            if blank(cl.get(k)): bad('lesson_empty_field', lw, f'closing.{k}')
        if blank(l.get('vocabulary')): warn('lesson_no_vocabulary', lw)
        for i, v in enumerate(l.get('vocabulary') or []):
            if blank(v.get('term')) or blank(v.get('meaning')): bad('vocab_incomplete', f'{lw} vocab[{i}]')
        if blank(l.get('source_basis')): bad('lesson_empty_field', lw, 'source_basis')
    for s in u.get('scenarios', []):
        sw = f"scenario {s['id']}"
        for k in ('title', 'premise', 'start', 'nodes', 'fictional_note'):
            if blank(s.get(k)): bad('scenario_empty_field', sw, k)
        nodes = s.get('nodes') or {}
        if s.get('start') not in nodes: bad('scenario_dangling', sw, 'start node missing')
        reach, stack = set(), [s.get('start')]
        while stack:
            n = stack.pop()
            if n in reach or n not in nodes: continue
            reach.add(n)
            for ch in nodes[n].get('choices') or []: stack.append(ch.get('next'))
        for nid, n in nodes.items():
            nw = f'{sw} node {nid}'
            if blank(n.get('text')): bad('scenario_empty_node', nw)
            chs = n.get('choices')
            if chs is None and blank(n.get('reflection')): bad('scenario_dead_end_no_reflection', nw)
            for j, ch in enumerate(chs or []):
                if blank(ch.get('text')): bad('scenario_empty_choice', f'{nw} choice[{j}]')
                if blank(ch.get('feedback')): bad('scenario_choice_no_feedback', f'{nw} choice[{j}]')
                if ch.get('next') not in nodes: bad('scenario_dangling', f'{nw} choice[{j}]', f"next={ch.get('next')}")
            if nid not in reach: bad('scenario_unreachable_node', nw)
        if not any(blank(nodes[n].get('choices')) and not blank(nodes[n].get('reflection')) for n in reach if n in nodes):
            bad('scenario_no_ending', sw)

# ---- competencies --------------------------------------------------------------------------------------------
if not only:
    for c in comps:
        w = f"competency {c['id']}"
        walk(c, w, lambda s, ww: hygiene(s, ww) if not INTERNAL.search(s) else None)  # competency text is reviewer-only (#/academy/review): internal ids allowed there
        for k in ('name', 'definition', 'levels', 'activity', 'life_practice', 'safeguard'):
            if blank(c.get(k)): bad('competency_empty_field', w, k)
    # lessons/scenarios never referenced by any program
    for ref in list(lessons) + list(scenarios):
        if ref not in USED: bad('orphan_content', ref, 'not in any program (unreachable from the UI except via competency page)')

# ---- report --------------------------------------------------------------------------------------------------
total = sum(len(v) for v in errs.values())
if '--json' in sys.argv:
    print(json.dumps({'fail': errs, 'warn': warns}, ensure_ascii=False, indent=1))
else:
    print(f'validate_completeness: {len(programs)} programs, {len(guides)} guides, {len(lessons)} lessons, {len(scenarios)} scenarios, {len(comps)} competencies')
    for code, ws in sorted(errs.items(), key=lambda x: -len(x[1])):
        print(f'FAIL {code}: {len(ws)}')
        for x in ws[:6]: print('   -', x)
        if len(ws) > 6: print(f'   ... +{len(ws) - 6} more')
    for code, ws in sorted(warns.items(), key=lambda x: -len(x[1])):
        print(f'WARN {code}: {len(ws)}  e.g. {ws[0]}')
    print('RESULT:', 'PASS' if total == 0 else f'FAIL ({total} findings in {len(errs)} categories)')
sys.exit(1 if total else 0)
