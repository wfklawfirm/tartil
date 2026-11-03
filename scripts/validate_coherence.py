#!/usr/bin/env python3
"""TARTIL 14.1 curriculum quality gates for the Human Formation academy.

Gates: Coherence, Competency, Sequence, Age, Timing, Completeness (directive item 14).
Read-only: it never modifies programs.json, the lesson files, or index.html.

Usage (always with -I):
  python3 -I scripts/validate_coherence.py                 # report mode: prints a matrix, exit 0
  python3 -I scripts/validate_coherence.py --strict        # exit 1 if any ERROR finding
  python3 -I scripts/validate_coherence.py --strict --warnings-as-errors
  python3 -I scripts/validate_coherence.py --program P07   # every finding for one program
  python3 -I scripts/validate_coherence.py --verbose       # every finding for every program
  python3 -I scripts/validate_coherence.py --json out.json # machine-readable report (findings + metrics)

Optional new data fields it understands (all optional; absent = the gate falls back to the current data):
  program.outcomes[i]            -> implicit id "O<i+1>"
  stage.items[].serves           -> list of outcome ids, e.g. ["O2","O3"] (explicit serving declaration)
  stage.items[].role             -> "core" (default) | "optional_link" | "recap" (link/recap items do not count toward timing)
  program.sessions[]             -> session plan, see docs/TARTIL_14_1_CURRICULUM_COHERENCE.md section 4
  docs/human-formation/qa/coherence_audit.json -> item_audit decisions
      (Keep / Rework / Relocate / Split / Remove from this program / Needs Source Review)
"""
import argparse, collections, glob, json, math, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
HF = os.path.join(ROOT, 'docs', 'human-formation')
AR_DIGITS = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')

# ---- tunable parameters (documented in docs/TARTIL_14_1_CURRICULUM_COHERENCE.md section 5) ----
TIMING_OVER_ERR = 1.10      # content minutes / declared minutes above this: ERROR (cannot be delivered as declared)
TIMING_OVER_WARN = 1.00
TIMING_UNDER_ERR = 0.60     # below this: ERROR (declared time is padded)
TIMING_UNDER_WARN = 0.75
STAGE_WARN = (0.60, 1.10)   # per-stage fill band
STAGE_ERR = (0.40, 1.30)
LESSON_SLOT_SLACK = 5       # a lesson may exceed the session length by at most this many minutes
MAX_COMPETENCIES = 6        # a program naming more competencies than this is flagged as a bundle
SCN_WPM = 90                # scenario reading speed (words/minute, read-aloud pace for 10-12)
SCN_DECISION_MIN = 1.5      # minutes per decision point (choose + short talk)
SCN_REFLECT_MIN = 2         # closing reflection
SCN_MIN, SCN_MAX = 8, 20
DECISIONS = ['Keep', 'Rework', 'Relocate', 'Split', 'Remove from this program', 'Needs Source Review']
OUT_OF_SCOPE = {'Relocate', 'Remove from this program', 'Split'}
PLACEHOLDER = re.compile(r'(TODO|TBD|lorem|سيُضاف|سيضاف|قريبًا|قريبا|قيد الإعداد|\[\s*\])')
ENTITY = re.compile(r'&#x?[0-9a-fA-F]+;|&(amp|lt|gt|quot|nbsp);')


def words(t):
    return len(str(t).split())


# --------------------------------------------------------------------------- loading
def est_scenario(s):
    """Estimated minutes for a branching scenario that has no published duration (never 0)."""
    nodes = s['nodes']

    def walk(n, w, d, seen):
        nd = nodes[n]; w += words(nd['text']); ch = nd.get('choices') or []
        if not ch or n in seen:
            return [(w, d)]
        out = []
        for c in ch:
            w2 = w + words(c.get('feedback', ''))
            out += walk(c['next'], w2, d + 1, seen | {n}) if c.get('next') in nodes else [(w2, d + 1)]
        return out
    ps = walk(s['start'], 0, 0, frozenset())
    aw = sum(p[0] for p in ps) / len(ps); ad = sum(p[1] for p in ps) / len(ps)
    m = math.ceil((words(s['premise']) + aw) / SCN_WPM + ad * SCN_DECISION_MIN + SCN_REFLECT_MIN)
    return max(SCN_MIN, min(SCN_MAX, m))


def load():
    comps = {c['id']: c for c in json.load(open(os.path.join(HF, 'competencies.json'), encoding='utf-8'))}
    items = {}
    for f in sorted(glob.glob(os.path.join(HF, 'lessons', 'lessons_*.json'))):
        for u in json.load(open(f, encoding='utf-8'))['units']:
            for l in u['lessons']:
                m = re.match(r'(\d+)(?:-(\d+)|(\+))?', l['age_range'])
                lo = int(m.group(1)); hi = int(m.group(2)) if m.group(2) else (99 if m.group(3) else lo)
                items[l['id']] = dict(ref=l['id'], kind='lesson', comp=u['competency'], unit=u.get('unit_id') or u['competency'],
                                      level=int(l['level'][1:]), lo=max(u['min_age'], lo), hi=hi, minutes=l['duration_min'], est=False,
                                      title=l['title'], review=l.get('review_status') or u.get('review_status'), raw=l)
            for s in u['scenarios']:
                items[s['id']] = dict(ref=s['id'], kind='scenario', comp=u['competency'], unit=u.get('unit_id') or u['competency'],
                                      level=None, lo=max(u['min_age'], s['age_min']), hi=99, minutes=est_scenario(s), est=True,
                                      title=s['title'], review=u.get('review_status'), raw=s)
    prog = json.load(open(os.path.join(HF, 'programs.json'), encoding='utf-8'))
    audit = None
    ap = os.path.join(HF, 'qa', 'coherence_audit.json')
    if os.path.exists(ap):
        audit = json.load(open(ap, encoding='utf-8'))
    guides = {}
    for f in sorted(glob.glob(os.path.join(HF, 'guides', 'P*.json'))):
        g = json.load(open(f, encoding='utf-8')); guides[g['program']] = g
    return comps, items, prog, audit, guides


# --------------------------------------------------------------------------- rhythm / weeks parsing
def parse_rhythm(r):
    t = r.translate(AR_DIGITS)
    if 'جلستان' in t: spw = 2
    elif re.search(r'(\d+)\s*جلسات', t): spw = int(re.search(r'(\d+)\s*جلسات', t).group(1))
    elif 'جلسة' in t: spw = 1
    else: spw = None
    m = re.search(r'(\d+)\s*دقيقة', t)
    return spw, int(m.group(1)) if m else None


def parse_weeks(w):
    m = re.match(r'^\s*(\d+)\s*(?:-\s*(\d+))?\s*$', str(w).translate(AR_DIGITS))
    return (int(m.group(1)), int(m.group(2) or m.group(1))) if m else None


def flat(p):
    for si, st in enumerate(p['stages']):
        for ii, it in enumerate(st['items']):
            yield si, ii, st, it


def closures(programs):
    """predecessors = parsed 'prerequisites' text plus inverse next_programs; then transitive closure"""
    pre = {p['id']: set() for p in programs}
    for p in programs:
        for t in p.get('prerequisites', []):
            pre[p['id']] |= set(re.findall(r'P\d\d', t))
        for n in p.get('next_programs', []):
            if n in pre: pre[n].add(p['id'])
    cl = {}
    for pid in pre:
        seen, st = set(), list(pre[pid])
        while st:
            x = st.pop()
            if x in seen or x == pid: continue
            seen.add(x); st += list(pre.get(x, []))
        cl[pid] = seen
    return pre, cl


# --------------------------------------------------------------------------- the gates
class Findings:
    def __init__(s): s.f = []
    def add(s, gate, level, pid, msg, ref=None): s.f.append(dict(gate=gate, level=level, program=pid, ref=ref, msg=msg))


def run(comps, items, prog, audit, guides, only=None):
    r = Findings(); programs = prog['programs']; pbyid = {p['id']: p for p in programs}
    pre, cl = closures(programs)
    prog_items = {p['id']: [(si, ii, it['ref'], it) for si, ii, st, it in flat(p)] for p in programs}
    metrics = {}
    item_audit = (audit or {}).get('item_audit', {})

    def covered(pid, upto_pos):
        """items covered before upto_pos inside program pid, plus everything in predecessor programs"""
        cov = [items[ref] for (si, ii, ref, it) in prog_items[pid] if (si, ii) < upto_pos and ref in items]
        for q in cl[pid]:
            cov += [items[ref] for (_, _, ref, _) in prog_items.get(q, []) if ref in items]
        return cov

    for p in programs:
        pid = p['id']
        if only and pid != only: continue
        pi = prog_items[pid]
        known = [(si, ii, ref, it) for si, ii, ref, it in pi if ref in items]
        outcome_ids = {f'O{i+1}' for i in range(len(p.get('outcomes', [])))}
        core = [(si, ii, ref, it) for si, ii, ref, it in known if it.get('role', 'core') == 'core']
        pcomps = set(p.get('competencies', []))
        used_comps = collections.Counter(items[ref]['comp'] for _, _, ref, _ in known)

        # ---------- Coherence
        explicit = any('serves' in it for _, _, _, it in pi)
        seen_refs = set()
        for si, ii, ref, it in pi:
            if ref in seen_refs: r.add('Coherence', 'ERROR', pid, 'duplicate ref inside program', ref)
            seen_refs.add(ref)
            if ref not in items: r.add('Completeness', 'ERROR', pid, 'unknown ref', ref); continue
            c = items[ref]['comp']
            if 'serves' in it:
                bad = [x for x in it['serves'] if x not in outcome_ids]
                if bad: r.add('Coherence', 'ERROR', pid, f'serves unknown outcome {bad}', ref)
                if not it['serves']: r.add('Coherence', 'ERROR', pid, 'serves is empty', ref)
            elif explicit:
                r.add('Coherence', 'ERROR', pid, 'item lacks serves while the program uses explicit serving', ref)
            elif c not in pcomps:
                r.add('Coherence', 'ERROR', pid, f'competency {c} is not a declared program competency and no serves given', ref)
            a = [x for x in item_audit.get(pid, {}).get('items', []) if x['ref'] == ref]
            if a:
                d = a[0]['decision']
                if d in OUT_OF_SCOPE:
                    r.add('Coherence', 'ERROR', pid, f'audit decision {d}: {a[0].get("destination_summary", "") or "see coherence_audit.json"}', ref)
                elif d in ('Rework', 'Needs Source Review'):
                    r.add('Coherence', 'WARN', pid, f'audit decision {d}', ref)
        if pid in item_audit:
            audited = {x['ref'] for x in item_audit[pid]['items']}
            for ref in sorted(seen_refs - audited): r.add('Coherence', 'WARN', pid, 'item missing from coherence audit', ref)
            for ref in sorted(audited - seen_refs): r.add('Coherence', 'WARN', pid, 'audit lists an item no longer in the program (stale audit)', ref)
        for c in sorted(pcomps - set(used_comps)):
            r.add('Coherence', 'WARN', pid, f'declared competency {c} has no item in the program')
        if explicit:
            hit = {x for _, _, _, it in pi for x in it.get('serves', [])}
            for o in sorted(outcome_ids - hit): r.add('Coherence', 'ERROR', pid, f'outcome {o} is served by no item')
        doms = sorted({comps[c]['domain'] for c in used_comps if c in comps})
        if len(pcomps) > MAX_COMPETENCIES:
            r.add('Coherence', 'WARN', pid, f'{len(pcomps)} competencies declared (> {MAX_COMPETENCIES}): reads as a bundle, not one through-line')
        if len(doms) >= 3 and not explicit:
            r.add('Coherence', 'WARN', pid, f'items span {len(doms)} competency domains {doms} with no serves mapping: coherence rests on competency match only')
        frag = sorted(c for c, n in used_comps.items() if n <= 2)
        if frag: r.add('Coherence', 'WARN', pid, f'competencies with <=2 items (too thin to reach a level): {frag}')

        # ---------- Competency
        for c in p.get('competencies', []):
            if c not in comps: r.add('Competency', 'ERROR', pid, f'unknown competency {c}')
        for si, ii, ref, it in known:
            x = items[ref]
            if x['comp'] not in comps: r.add('Competency', 'ERROR', pid, 'item competency not in register', ref)
            if x['review'] not in (None, 'unreviewed', 'reviewed', 'approved'): r.add('Competency', 'WARN', pid, f'odd review_status {x["review"]}', ref)
            if x['comp'] in comps and p['age_min'] < comps[x['comp']]['min_age']:
                r.add('Competency', 'ERROR', pid, f'program age_min {p["age_min"]} below competency {x["comp"]} min_age {comps[x["comp"]]["min_age"]}', ref)
        reps = repeated(pid, known, items, programs, prog_items)
        for d in reps:
            r.add('Competency', 'WARN', pid, f'{d["competency"]} level L{d["level"]} is also taught by {d["other_ref"]} in {d["other_program"]} for overlapping ages (repeated competency-level)', d['ref'])

        # ---------- Sequence
        for si, ii, ref, it in known:
            x = items[ref]
            cov = covered(pid, (si, ii))
            if x['kind'] == 'lesson' and x['level'] > 1:
                avail = sorted({y['level'] for y in items.values() if y['comp'] == x['comp'] and y['kind'] == 'lesson' and y['level'] < x['level']})
                need = avail[-1] if avail else None
                have = max([y['level'] for y in cov if y['comp'] == x['comp'] and y['kind'] == 'lesson'] or [0])
                if need and have < need:
                    r.add('Sequence', 'ERROR', pid, f'{x["comp"]} L{x["level"]} taught without L{need} of the same competency before it (in program or prerequisite programs)', ref)
                prev_hi = [items[r2]['level'] for s2, i2, r2, _ in known if (s2, i2) < (si, ii) and items[r2]['comp'] == x['comp'] and items[r2]['kind'] == 'lesson' and items[r2]['level'] > x['level']]
                if prev_hi: r.add('Sequence', 'ERROR', pid, f'{x["comp"]} level goes backwards (L{x["level"]} after L{max(prev_hi)})', ref)
        first_pos = {}
        for si, ii, ref, it in known: first_pos.setdefault(items[ref]['comp'], (si, ii))
        for c, pos in first_pos.items():
            for q in comps.get(c, {}).get('prerequisites', []):
                if not any(y['comp'] == q for y in covered(pid, pos)):
                    r.add('Sequence', 'ERROR', pid, f'competency {c} requires {q}, which is neither earlier in the program nor in a prerequisite program')
        for q in pre[pid]:
            if q in pbyid and pbyid[q]['age_min'] > p['age_min']:
                r.add('Sequence', 'ERROR', pid, f'prerequisite {q} is for older learners (age_min {pbyid[q]["age_min"]} > {p["age_min"]})')
        for n in p.get('next_programs', []):
            if n in pbyid and pbyid[n]['age_min'] < p['age_min']:
                r.add('Sequence', 'ERROR', pid, f'next program {n} is for younger learners')
        if pid in cl.get(pid, set()): r.add('Sequence', 'ERROR', pid, 'prerequisite cycle')
        spans = [parse_weeks(st['weeks']) for st in p['stages']]
        if any(s is None for s in spans): r.add('Sequence', 'ERROR', pid, 'unparseable stage weeks')
        else:
            cur = 1
            for st, (a, b) in zip(p['stages'], spans):
                if a != cur: r.add('Sequence', 'ERROR', pid, f'stage {st["id"]} starts at week {a}, expected {cur} (gap or overlap)')
                if b < a: r.add('Sequence', 'ERROR', pid, f'stage {st["id"]} weeks reversed')
                cur = b + 1
            if cur - 1 != p['duration_weeks']: r.add('Sequence', 'ERROR', pid, f'stages end at week {cur-1} but duration_weeks is {p["duration_weeks"]}')

        # ---------- Age
        under = over = 0
        for si, ii, ref, it in known:
            x = items[ref]
            if x['lo'] > p['age_min']:
                over += 1; r.add('Age', 'ERROR', pid, f'item needs age {x["lo"]} > program age_min {p["age_min"]}', ref)
            elif x['kind'] == 'lesson' and x['hi'] < p['age_min']:
                under += 1; r.add('Age', 'WARN', pid, f'lesson written for ages {x["lo"]}-{x["hi"]}, all below program age_min {p["age_min"]} (content for younger learners)', ref)
        if p['age_max'] < p['age_min']: r.add('Age', 'ERROR', pid, 'age_max < age_min')

        # ---------- Timing
        spw, mins = parse_rhythm(p.get('rhythm', ''))
        tm = dict(spw=spw, session_min=mins)
        if spw is None or mins is None:
            r.add('Timing', 'ERROR', pid, f'cannot parse rhythm "{p.get("rhythm")}"')
        else:
            declared = p['duration_weeks'] * spw * mins
            content = sum(items[ref]['minutes'] for _, _, ref, _ in core)
            est = sum(items[ref]['minutes'] for _, _, ref, _ in core if items[ref]['est'])
            ratio = content / declared if declared else 0
            tm.update(declared_sessions=p['duration_weeks'] * spw, declared_minutes=declared, content_minutes=content,
                      scenario_estimated_minutes=est, ratio=round(ratio, 2), items=len(core))
            if ratio > TIMING_OVER_ERR: r.add('Timing', 'ERROR', pid, f'content {content} min (of which {est} estimated for scenarios) exceeds declared {declared} min ({ratio:.0%})')
            elif ratio > TIMING_OVER_WARN: r.add('Timing', 'WARN', pid, f'content {content} min is {ratio:.0%} of declared {declared} min (no slack)')
            elif ratio < TIMING_UNDER_ERR: r.add('Timing', 'ERROR', pid, f'content {content} min fills only {ratio:.0%} of declared {declared} min: duration is padded')
            elif ratio < TIMING_UNDER_WARN: r.add('Timing', 'WARN', pid, f'content {content} min fills {ratio:.0%} of declared {declared} min')
            long_ = [ref for _, _, ref, _ in core if items[ref]['kind'] == 'lesson' and items[ref]['minutes'] > mins + LESSON_SLOT_SLACK]
            tm['lessons_longer_than_session'] = long_
            for ref in long_: r.add('Timing', 'ERROR', pid, f'lesson is {items[ref]["minutes"]} min but the session is {mins} min', ref)
            tm['stages'] = []
            for st, sp in zip(p['stages'], spans):
                if sp is None: continue
                cap = (sp[1] - sp[0] + 1) * spw * mins
                cont = sum(items[it['ref']]['minutes'] for it in st['items'] if it['ref'] in items and it.get('role', 'core') == 'core')
                sr = cont / cap if cap else 0
                tm['stages'].append(dict(stage=st['id'], capacity=cap, content=cont, ratio=round(sr, 2), items=len(st['items']), sessions=(sp[1] - sp[0] + 1) * spw))
                if sr > STAGE_ERR[1] or sr < STAGE_ERR[0]: r.add('Timing', 'ERROR', pid, f'stage {st["id"]}: {cont} min of content in {cap} min of declared sessions ({sr:.0%})')
                elif sr > STAGE_WARN[1] or sr < STAGE_WARN[0]: r.add('Timing', 'WARN', pid, f'stage {st["id"]}: {cont} min of content in {cap} min of declared sessions ({sr:.0%})')
        if p.get('sessions'):
            check_sessions(r, p, items, spw, mins)

        # ---------- Completeness
        for k in ['id', 'slug', 'title', 'tagline', 'band', 'audience', 'age_min', 'age_max', 'status', 'promise', 'outcomes', 'competencies',
                  'duration_weeks', 'rhythm', 'stages', 'capstone', 'guide_notes', 'safeguards', 'review_gate', 'gating']:
            if p.get(k) in (None, '', [], {}): r.add('Completeness', 'ERROR', pid, f'missing {k}')
        for st in p['stages']:
            for k in ['title', 'weeks', 'purpose', 'items', 'check']:
                if not st.get(k): r.add('Completeness', 'ERROR', pid, f'stage {st.get("id")}: missing {k}')
            for k in ['title', 'brief', 'private_reflection']:
                if not st.get('mission', {}).get(k): r.add('Completeness', 'ERROR', pid, f'stage {st.get("id")}: mission.{k} missing')
        g = guides.get(pid)
        if not g: r.add('Completeness', 'ERROR', pid, 'no guide file')
        else:
            if not g.get('for_guide') or not g.get('for_parent'): r.add('Completeness', 'ERROR', pid, 'guide lacks for_guide or for_parent')
            for q in g.get('faq') or []:
                if not (q.get('q') and q.get('a')): r.add('Completeness', 'ERROR', pid, 'FAQ entry without an answer')
            for sec, v in {**g.get('for_guide', {}), **g.get('for_parent', {})}.items():
                if v in ('', [], None): r.add('Completeness', 'ERROR', pid, f'empty guide section {sec}')
            wk = (g.get('for_guide') or {}).get('week_by_week') or []
            if wk and len(wk) != p['duration_weeks']: r.add('Timing', 'WARN', pid, f'guide week_by_week has {len(wk)} weeks but duration_weeks is {p["duration_weeks"]}')
            if ENTITY.search(json.dumps(g, ensure_ascii=False)): r.add('Completeness', 'ERROR', pid, 'HTML entity visible in guide text')
        blob = json.dumps({k: v for k, v in p.items() if k != 'stages'}, ensure_ascii=False) + json.dumps([{k: v for k, v in s.items() if k != 'items'} for s in p['stages']], ensure_ascii=False)
        if ENTITY.search(blob): r.add('Completeness', 'ERROR', pid, 'HTML entity visible in program text')
        if PLACEHOLDER.search(blob): r.add('Completeness', 'WARN', pid, f'placeholder-like text: {PLACEHOLDER.search(blob).group()}')
        for si, ii, ref, it in known:
            x = items[ref]; raw = x['raw']
            if x['kind'] == 'lesson':
                for k in ['objective', 'hook', 'key_ideas', 'closing', 'activities', 'formative', 'life_practice', 'source_basis']:
                    if not raw.get(k): r.add('Completeness', 'ERROR', pid, f'lesson missing {k}', ref)
                for a in raw.get('activities', []):
                    if not a.get('learner_text') or not a.get('instructions'): r.add('Completeness', 'ERROR', pid, f'activity "{a.get("title")}" lacks learner_text or instructions', ref)
            else:
                nodes = raw['nodes']; reach = set(); st_ = [raw['start']]
                while st_:
                    n = st_.pop()
                    if n in reach or n not in nodes: continue
                    reach.add(n); st_ += [c.get('next') for c in nodes[n].get('choices', [])]
                if reach != set(nodes): r.add('Completeness', 'ERROR', pid, 'scenario has unreachable nodes', ref)
                for n, nd in nodes.items():
                    if not nd.get('choices') and not nd.get('reflection'): r.add('Completeness', 'ERROR', pid, f'scenario end node {n} has no reflection', ref)

        metrics[pid] = program_metrics(p, items, comps, known, core, tm, doms, used_comps, under, over, programs, prog_items, pre, reps)
    return r.f, metrics


def repeated(pid, known, items, programs, prog_items):
    """(competency, level) pairs this program teaches that another program also teaches for overlapping lesson ages"""
    out = []
    for _, _, ref, _ in known:
        x = items[ref]
        if x['kind'] != 'lesson': continue
        for q in programs:
            if q['id'] == pid: continue
            for _, _, rq, _ in prog_items[q['id']]:
                y = items.get(rq)
                if y and y['kind'] == 'lesson' and y['comp'] == x['comp'] and y['level'] == x['level'] and min(x['hi'], y['hi']) - max(x['lo'], y['lo']) >= 1:
                    out.append(dict(ref=ref, other_ref=rq, other_program=q['id'], competency=x['comp'], level=x['level']))
    return out


def check_sessions(r, p, items, spw, mins):
    pid = p['id']; ss = p['sessions']; need = ['intro', 'interactive_practice', 'reflection', 'assessment']
    if [s.get('n') for s in ss] != list(range(1, len(ss) + 1)): r.add('Completeness', 'ERROR', pid, 'sessions are not numbered 1..N')
    if spw and len(ss) != p['duration_weeks'] * spw: r.add('Timing', 'ERROR', pid, f'{len(ss)} sessions planned but rhythm declares {p["duration_weeks"] * spw}')
    per = collections.Counter(s.get('week') for s in ss)
    for w, n in per.items():
        if not isinstance(w, int) or not 1 <= w <= p['duration_weeks'] or (spw and n > spw): r.add('Timing', 'ERROR', pid, f'week {w} has {n} sessions (max {spw}) or is out of range')
    cov = set()
    for s in ss:
        k = f'session {s.get("n")}'
        for f in ['title', 'competency', 'objective', 'duration_min', 'components']:
            if not s.get(f): r.add('Completeness', 'ERROR', pid, f'{k}: missing {f}')
        comp = s.get('components', {})
        for c in need:
            if not comp.get(c, {}).get('min'): r.add('Completeness', 'ERROR', pid, f'{k}: component {c} missing or 0 min')
        if not comp.get('source_teaching', {}).get('min') and not s.get('source_omitted_reason'):
            r.add('Completeness', 'ERROR', pid, f'{k}: no source_teaching and no source_omitted_reason')
        tot = sum(c.get('min', 0) for c in comp.values()) + s.get('buffer_min', 0)
        if s.get('duration_min') and tot != s['duration_min']:
            r.add('Timing', 'ERROR', pid, f'{k}: components+buffer = {tot} min but duration_min = {s["duration_min"]} (homework is excluded and must be stated separately)')
        if mins and s.get('duration_min', 0) > mins: r.add('Timing', 'ERROR', pid, f'{k}: duration {s["duration_min"]} exceeds declared session length {mins}')
        hw = s.get('homework')
        if hw and not (hw.get('task') and hw.get('min')): r.add('Completeness', 'ERROR', pid, f'{k}: homework needs task and min')
        for ref in s.get('refs', []):
            if ref not in items: r.add('Completeness', 'ERROR', pid, f'{k}: unknown ref {ref}')
            else:
                cov.add(ref)
                if items[ref]['kind'] == 'scenario' and items[ref]['minutes'] > comp.get('interactive_practice', {}).get('min', 0) + comp.get('reflection', {}).get('min', 0):
                    r.add('Timing', 'WARN', pid, f'{k}: scenario {ref} (est. {items[ref]["minutes"]} min) does not fit practice+reflection time', ref)
    core = {it['ref'] for _, _, _, it in flat(p) if it.get('role', 'core') == 'core'}
    for ref in sorted(core - cov): r.add('Completeness', 'ERROR', pid, 'stage item not scheduled in any session', ref)


# --------------------------------------------------------------------------- metrics and severity
def program_metrics(p, items, comps, known, core, tm, doms, used, under, over, programs, prog_items, pre, rep):
    pid = p['id']
    lv = [items[ref]['level'] for _, _, ref, _ in known if items[ref]['level']]
    span = (max(lv) - min(lv)) if lv else 0
    mix = 0
    for st in p['stages']:
        d = {comps[items[it['ref']]['comp']]['domain'] for it in st['items'] if it['ref'] in items and items[it['ref']]['comp'] in comps}
        if len(d) >= 2: mix += 1
    frag = sorted(c for c, n in used.items() if n <= 2)
    g_raw = 2 * max(0, len(doms) - 1) + max(0, len(p['competencies']) - 4) + len(frag)
    ov = []
    for q in programs:
        if q['id'] == pid: continue
        ages = min(p['age_max'], q['age_max']) - max(p['age_min'], q['age_min'])
        sh = sorted(set(p['competencies']) & set(q['competencies']))
        jac = len(sh) / len(set(p['competencies']) | set(q['competencies']))
        linked = q['id'] in pre.get(pid, set()) or pid in pre.get(q['id'], set())
        if ages >= 1 and sh and (jac >= 0.25 or len(sh) >= 2):
            ov.append(dict(program=q['id'], shared_competencies=sh, jaccard=round(jac, 2), declared_sequence_link=linked))
    l_raw = max(0, span - 1) + under + over
    t_raw = 0
    if tm.get('ratio') is not None:
        dev = abs(tm['ratio'] - 1)
        t_raw = 0 if dev <= .10 else 1 if dev <= .25 else 2 if dev <= .40 else 3
        if tm.get('lessons_longer_than_session'): t_raw = min(3, t_raw + 1)
    sc = dict(
        illogical_grouping=0 if g_raw <= 1 else 1 if g_raw <= 3 else 2 if g_raw <= 6 else 3,
        competency_repetition=0 if not rep else 1 if len(rep) <= 2 else 2 if len(rep) <= 5 else 3,
        overlap=0 if not ov else 1 if len(ov) == 1 else 2 if len(ov) == 2 else 3,
        level_heterogeneity=0 if l_raw == 0 else 1 if l_raw == 1 else 2 if l_raw <= 3 else 3,
        timing=t_raw)
    W = dict(illogical_grouping=5, competency_repetition=4, overlap=3, level_heterogeneity=2, timing=1)
    return dict(program=pid, title=p['title'], band=p['band'], age=[p['age_min'], p['age_max']], items=len(known), core_items=len(core),
                n_competencies=len(p['competencies']), domains=doms, mixed_domain_stages=mix, thin_competencies=frag,
                level_span=span, levels=sorted(set(lv)), lessons_too_young=under, items_too_old=over,
                repeated_competency_levels=rep, overlapping_programs=ov, timing=tm,
                raw=dict(grouping=g_raw, repetition=len(rep), overlap=len(ov), levels=l_raw, timing=t_raw),
                scores=sc, weights=W, severity=sum(W[k] * v for k, v in sc.items()))


# --------------------------------------------------------------------------- CLI
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--strict', action='store_true', help='exit 1 when any ERROR is found')
    ap.add_argument('--warnings-as-errors', action='store_true', help='with --strict, WARN also fails')
    ap.add_argument('--program', help='only this program id, e.g. P07')
    ap.add_argument('--verbose', action='store_true', help='print every finding')
    ap.add_argument('--json', metavar='PATH', help='write findings and metrics as JSON')
    a = ap.parse_args()
    comps, items, prog, audit, guides = load()
    findings, metrics = run(comps, items, prog, audit, guides, a.program)
    gates = ['Coherence', 'Competency', 'Sequence', 'Age', 'Timing', 'Completeness']
    pids = [p['id'] for p in prog['programs'] if not a.program or p['id'] == a.program]
    cnt = collections.defaultdict(lambda: [0, 0])
    for f in findings: cnt[(f['program'], f['gate'])][0 if f['level'] == 'ERROR' else 1] += 1
    print(f'programs={len(pids)} items={len(items)} audit={"yes" if audit else "no"}  (cells are ERRORS/WARNS)')
    print('prog   ' + ' '.join(f'{g[:10]:>11}' for g in gates) + '   severity')
    for pid in pids:
        print(f'{pid:<6} ' + ' '.join(f'{cnt[(pid, g)][0]:>5}/{cnt[(pid, g)][1]:<5}' for g in gates) + f'   {metrics.get(pid, {}).get("severity", "-")}')
    te = sum(1 for f in findings if f['level'] == 'ERROR'); tw = len(findings) - te
    print('totals ' + ' '.join(f'{sum(cnt[(p, g)][0] for p in pids):>5}/{sum(cnt[(p, g)][1] for p in pids):<5}' for g in gates))
    print()
    if a.verbose or a.program:
        for f in findings:
            print(f'{f["level"]:<5} {f["gate"]:<12} {f["program"]} {f["ref"] or "":<8} {f["msg"]}')
    print(f'{te} errors, {tw} warnings' + ('' if a.verbose or a.program else '  (use --verbose or --program Pxx for details)'))
    if a.json:
        json.dump(dict(errors=te, warnings=tw, findings=findings, metrics=metrics), open(a.json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    fail = te + (tw if a.warnings_as_errors else 0)
    if a.strict and fail:
        print('STRICT: gates failed'); sys.exit(1)
    if not a.strict and te:
        print('REPORT MODE: gates fail on the current programs (exit 0). Use --strict to enforce.')
    sys.exit(0)


if __name__ == '__main__':
    main()
