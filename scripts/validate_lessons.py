#!/usr/bin/env python3
"""Validate docs/human-formation/lessons/lessons_*.json against the lesson schema.
Usage: python3 -I scripts/validate_lessons.py [file ...]"""
import json,sys,glob,re,os
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
comp={c['id']:c for c in json.load(open(os.path.join(ROOT,'docs/human-formation/competencies.json')))}
ATYPES={'story','scenario','discussion','practice','reflection','project','game'}
BAD=re.compile(r'(\d+\s*/\s*\d+|\d+\s*(نقطة|نقاط|درجة|درجات)|ترتيب الأطفال|الأول على|المتصدر|لوحة الشرف)')
def need(o,keys,where,err):
    for k in keys:
        if k not in o or o[k] in ('',None,[],{}): err.append(f'{where}: missing {k}')
def check_scn(s,where,err,minage):
    need(s,['id','title','premise','start','nodes','age_min','fictional_note'],where,err)
    n=s.get('nodes',{})
    if s.get('start') not in n: err.append(f'{where}: start not in nodes')
    for k,v in n.items():
        need(v,['text'],f'{where}.{k}',err)
        ch=v.get('choices',[])
        if not ch: need(v,['reflection'],f'{where}.{k}(ending)',err)
        for c in ch:
            need(c,['text','next','feedback'],f'{where}.{k}.choice',err)
            if c.get('next') not in n: err.append(f'{where}.{k}: dangling next {c.get("next")}')
    if s.get('age_min',0)<minage: err.append(f'{where}: age_min below competency min_age')
    ends=[k for k,v in n.items() if not v.get('choices')]
    if not ends: err.append(f'{where}: no ending')
ENR='--enriched' in sys.argv
def main(files):
    allerr=[];tot=0
    for f in files:
        d=json.load(open(f));err=[]
        for u in d['units']:
            cid=u.get('competency');where=u.get('unit_id') or cid
            if cid not in comp: err.append(f'{cid}: unknown competency');continue
            ma=comp[cid]['min_age']
            need(u,['competency','title','summary','target_levels','min_age','lessons','scenarios','source_record','review_status'],where,err)
            if u.get('min_age',0)<ma: err.append(f'{where}: min_age {u.get("min_age")}<{ma}')
            if u.get('review_status')!='unreviewed': err.append(f'{where}: review_status must be unreviewed')
            if not 3<=len(u.get('lessons',[]))<=5: err.append(f'{where}: need 3-5 lessons')
            if not 1<=len(u.get('scenarios',[]))<=3: err.append(f'{where}: need 1-3 scenarios')
            for l in u.get('lessons',[]):
                w=f'{where}/{l.get("id")}'
                need(l,['id','title','level','age_range','objective','duration_min','activities','life_practice','formative','source_basis','safeguards'],w,err)
                for a in l.get('activities',[]):
                    need(a,['type','title','instructions'],w+'.activity',err)
                    if a.get('type') not in ATYPES: err.append(f'{w}: bad activity type {a.get("type")}')
                if ENR:
                    need(l,['hook','key_ideas','guide_script','closing'],w+'(enriched)',err)
                    if not 2<=len(l.get('key_ideas',[]))<=4: err.append(f'{w}: key_ideas 2-4')
                    for a in l.get('activities',[]):
                        need(a,['learner_text'],w+'.activity(enriched)',err)
                        if a.get('type')=='story' and len(str(a.get('learner_text','')).split())<120: err.append(f'{w}: story learner_text < 120 words')
                        if a.get('type') in('discussion','reflection') and not a.get('questions'): err.append(f'{w}: {a.get("type")} needs questions[]')
                lp=l.get('life_practice',{});need(lp,['task','steps','reflection_prompt','private_note'],w+'.life_practice',err)
                fm=l.get('formative',{});need(fm,['ظهر','يتدرب','يحتاج_دعما'],w+'.formative',err)
                if not 1<=len(l.get('activities',[]))<=4: err.append(f'{w}: 1-4 activities')
            for s in u.get('scenarios',[]): check_scn(s,f'{where}/{s.get("id")}',err,ma)
            blob=json.dumps(u,ensure_ascii=False)
            if BAD.search(blob): err.append(f'{where}: numeric scoring/ranking language: {BAD.search(blob).group(0)}')
            tot+=1
        allerr+= [f'{os.path.basename(f)}: {e}' for e in err]
    print(f'{tot} units checked; {len(allerr)} problems')
    for e in allerr[:80]: print(' -',e)
    sys.exit(1 if allerr else 0)
if __name__=='__main__':
    main([a for a in sys.argv[1:] if not a.startswith('--')] or sorted(glob.glob(os.path.join(ROOT,'docs/human-formation/lessons/lessons_*.json'))))
