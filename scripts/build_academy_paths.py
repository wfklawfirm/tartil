#!/usr/bin/env python3
"""Writes academy-paths.json (the 11 formation paths TW-1..TW-11 of docs/TARTIL_TAKWEEN_REBUILD.md section 1)
identically into packages/web and packages/web-vercel, then validates it. Run: python3 -I scripts/build_academy_paths.py
Every program id must exist in academy-programs.json; every competency a path touches is derived from its programs and must exist in academy.json."""
import json, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
PATHS = [
 ("TW-1", "أراجع يومي", ["P25"], 10, 12),
 ("TW-2", "أضبط غضبي وأصلح", ["P02", "P07"], 7, 12),
 ("TW-3", "أصدقائي وخلافاتي", ["P05", "P08"], 8, 12),
 ("TW-4", "أقرر بالشورى", ["P10"], 14, 17),
 ("TW-5", "القيم الأولى: الشكر والرحمة والصدق والأمانة والعدل والتواضع", ["P01", "P17", "P03", "P04"], 5, 8),
 ("TW-6", "العادات اليومية والمثابرة والأمانة اليومية", ["P18", "P19"], 7, 8),
 ("TW-7", "أتثبّت وأستدل وأبحث", ["P06", "P09"], 11, 17),
 ("TW-8", "المال والعمل والمبادرة", ["P11", "P12", "P24"], 15, 99),
 ("TW-9", "القيادة والإرشاد والمسؤولية العامة", ["P13", "P14"], 16, 99),
 ("TW-10", "الأسرة والوالدية (للبالغين)", ["P15", "P16"], 18, 99),
 ("TW-11", "السيرة والشمائل والآداب والمسؤولية الرقمية", ["P22"], 12, 17),
]
doc = {"version": 1, "status": "draft-unreviewed", "source": "docs/TARTIL_TAKWEEN_REBUILD.md section 1",
       "paths": [{"id": i, "label": l, "programs": p, "age_min": a, "age_max": b, "review_status": "unreviewed"} for i, l, p, a, b in PATHS]}
progs = {p["id"]: p for p in json.loads((root/"packages/web/academy-programs.json").read_text(encoding="utf-8"))["programs"]}
comps = {c["id"] for c in json.loads((root/"packages/web/academy.json").read_text(encoding="utf-8"))["competencies"]}
errs = []
seen = []
for p in doc["paths"]:
    for pid in p["programs"]:
        if pid not in progs: errs.append(f"{p['id']}: unknown program {pid}"); continue
        seen.append(pid)
        for c in progs[pid].get("competencies", []):
            if c not in comps: errs.append(f"{pid}: unknown competency {c}")
    ps = [progs[x] for x in p["programs"] if x in progs]
    if ps:
        lo, hi = min(x["age_min"] for x in ps), max(x["age_max"] for x in ps)
        if (lo, hi) != (p["age_min"], p["age_max"]): errs.append(f"{p['id']}: ages {p['age_min']}-{p['age_max']} != programs {lo}-{hi}")
if len(seen) != len(set(seen)): errs.append("a program appears in two paths")
quran = {"P20", "P21", "P23"}
if set(seen) != set(progs) - quran: errs.append(f"coverage mismatch: missing {sorted(set(progs)-quran-set(seen))} extra {sorted(set(seen)-set(progs))}")
if len(doc["paths"]) != 11: errs.append("not 11 paths")
if errs:
    print("FAIL"); [print(" -", e) for e in errs]; sys.exit(1)
txt = json.dumps(doc, ensure_ascii=False, indent=1)
for d in ("packages/web", "packages/web-vercel"):
    (root/d/"academy-paths.json").write_text(txt, encoding="utf-8")
print(f"OK: {len(doc['paths'])} paths, {len(seen)} programs, written to both packages")
