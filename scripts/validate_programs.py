#!/usr/bin/env python3
"""Validate docs/human-formation/programs.json against the lesson files.
Usage: python3 -I scripts/validate_programs.py"""
import json,glob,re,os,sys
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
HF=os.path.join(ROOT,'docs/human-formation')
BAD=re.compile(r'(\d+\s*/\s*\d+|\d+\s*(نقطة|نقاط|درجة|درجات)|ترتيب الأطفال|الأول على|المتصدر|لوحة الشرف|\bscore\b|leaderboard|\bpoints\b)')
items={}
for f in sorted(glob.glob(HF+'/lessons/lessons_G*.json')):
    for u in json.load(open(f))['units']:
        for l in u['lessons']:
            items[l['id']]=('lesson',max(u['min_age'],int(re.match(r'\d+',l['age_range']).group())))
        for s in u['scenarios']:
            items[s['id']]=('scenario',max(u['min_age'],s['age_min']))
d=json.load(open(HF+'/programs.json'))
err=[]
for k in ['version','status','generated','bands','programs']:
    if k not in d: err.append('missing top '+k)
bands={b['id']:b for b in d['bands']}
pids={p['id'] for p in d['programs']}
if not 12<=len(d['programs'])<=16: err.append(f'programs count {len(d["programs"])} not in 12..16')
REQ=['id','slug','title','tagline','band','audience','age_min','age_max','status','promise','outcomes','competencies','duration_weeks','rhythm','prerequisites','next_programs','stages','capstone','guide_notes','safeguards','review_gate','gating']
seen=set()
for p in d['programs']:
    w=p.get('id','?')
    for k in REQ:
        if k not in p or p[k] in ('',None) or (k in('outcomes','competencies','stages','safeguards') and not p[k]): 
            if k in('prerequisites','next_programs'): continue
            err.append(f'{w}: missing {k}')
    if p.get('band') not in bands: err.append(f'{w}: unknown band')
    if p.get('status') not in('pilot','planned','adults_gated'): err.append(f'{w}: bad status')
    if not 4<=p.get('duration_weeks',0)<=8: err.append(f'{w}: duration')
    if not 3<=len(p.get('outcomes',[]))<=6: err.append(f'{w}: outcomes 3-6')
    for n in p.get('next_programs',[]):
        if n not in pids: err.append(f'{w}: bad next {n}')
    g=p.get('gating',{})
    for k in ['adults_only','needs_named_reviewers','deferred_reason']:
        if k not in g: err.append(f'{w}: gating.{k}')
    if p.get('status')=='adults_gated' and not (g.get('adults_only') and g.get('deferred_reason')): err.append(f'{w}: adults_gated needs adults_only+reason')
    if p.get('status')=='pilot' and p.get('age_min',0)<10: err.append(f'{w}: pilot under 10')
    for c in ['title','brief','deliverable']:
        if not p.get('capstone',{}).get(c): err.append(f'{w}: capstone.{c}')
    mx=0
    for s in p.get('stages',[]):
        sw=s.get('id','?')
        for k in ['id','title','weeks','purpose','items','mission','check']:
            if not s.get(k): err.append(f'{sw}: missing {k}')
        for k in ['title','brief','private_reflection']:
            if not s.get('mission',{}).get(k): err.append(f'{sw}: mission.{k}')
        for it in s.get('items',[]):
            r=it['ref']
            if r not in items: err.append(f'{sw}: unknown ref {r}');continue
            if items[r][0]!=it['kind']: err.append(f'{sw}: kind mismatch {r}')
            seen.add(r);mx=max(mx,items[r][1])
            if p['age_min']<items[r][1]: err.append(f'{sw}: {r} needs age {items[r][1]} > program age_min {p["age_min"]}')
    if mx and p.get('age_min',0)<mx: err.append(f'{w}: age_min below items')
    if BAD.search(json.dumps(p,ensure_ascii=False)): err.append(f'{w}: grading language: {BAD.search(json.dumps(p,ensure_ascii=False)).group()}')
for b in d['bands']:
    for i in b['program_ids']:
        if i not in pids: err.append(f'{b["id"]}: unknown program {i}')
for r in items:
    if r not in seen: err.append(f'uncovered {r}')
nl=sum(1 for v in items.values() if v[0]=='lesson');ns=len(items)-nl
print(f'programs={len(d["programs"])} lessons={nl} scenarios={ns} covered={len(seen)}/{len(items)}')
for e in err: print('ISSUE',e)
print(f'{len(err)} issues')
sys.exit(1 if err else 0)
