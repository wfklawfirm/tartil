#!/usr/bin/env python3
"""Phase 0 source inventory. Read-only over the source folder; writes only to scholarly-assets/source-registry/.
Usage: python3 -I scripts/build_source_registry.py <sources_dir> <out_dir>
Never modifies sources. Licence status is NEVER inferred as cleared."""
import sys, os, re, csv, json, hashlib, glob, datetime, collections
src, out = sys.argv[1], sys.argv[2]
LABELS = ['الكتاب','المؤلف','المحقق','الناشر','الطبعة','عدد الصفحات','عدد الأجزاء']
lab_re = re.compile(r'(' + '|'.join(LABELS) + r')\s*[:：]\s*')
AR = re.compile(r'[ء-ي]')
DIAC = re.compile(r'[ً-ْٰ]')
TERMS = {
 'tajweed': ['إدغام','إظهار','إخفاء','إقلاب','مخرج','غنة','ترقيق','تفخيم','قلقلة','مدود','الإمالة'],
 'qiraat': ['ورش','قالون','حفص','شعبة','الدوري','السوسي','البزي','قنبل','خلف','رواية','القراءات'],
 'pedagogy': ['تلميذ','معلم','طلاب','حلقة','حلقات','تقويم','منهج','حفظ','تحفيظ'],
 'waqf': ['الوقف','الابتداء','وقف لازم','وقف تام'],
 'rasm': ['الرسم','المصحف','الضبط','النقط'],
}
def norm(t):
    # matching-only normalisation (diacritics, tatweel, alef/ya/ta-marbuta variants). Never applied to stored text.
    t = DIAC.sub('', t).replace('\u0640', '')
    return t.translate(str.maketrans('أإآٱىة', 'اااايه'))
def density(text, words):
    nt = norm(text); n = sum(nt.count(norm(w)) for w in words)
    return round(n / max(len(nt), 1) * 10000, 2)
tri = {r['shamela_id']: r for r in csv.DictReader(open(os.path.join(out,'triage_decisions.csv'), encoding='utf-8'))}
rows, by_hash = [], collections.defaultdict(list)
for p in sorted(glob.glob(os.path.join(src, '*.txt'))):
    fn = os.path.basename(p)
    raw = open(p, 'rb').read()
    sha = hashlib.sha256(raw).hexdigest()
    text = raw.decode('utf-8', errors='replace')
    sid = fn.split('_', 1)[0]
    parts = text.split('=' * 60)
    header = parts[1].strip().replace('\n', ' ') if len(parts) >= 3 else ''
    f = {}
    toks = lab_re.split(header)
    for i in range(1, len(toks) - 1, 2):
        f.setdefault(toks[i], toks[i + 1].strip())
    body = parts[2] if len(parts) >= 3 else text
    ar_letters = len(AR.findall(body)); diac = len(DIAC.findall(body))
    # Quran citation form seen in these exports: ﴿...﴾ [ayah: surah-name]
    cite = re.findall(r'﴿[^﴾]{1,600}﴾\s*\.?\s*\[[^\]]{1,40}\]', body)
    d = {k: density(body, v) for k, v in TERMS.items()}
    t = tri.get(sid, {})
    cat = t.get('category', 'UNTRIAGED')
    if cat == 'UNCLASSIFIED':
        cat = 'CORE_TAJWEED_CANDIDATE' if d['tajweed'] >= 3 else ('QIRAAT_CANDIDATE' if d['qiraat'] >= 3 else 'PERIPHERAL_CANDIDATE')
    flags = []
    if text.count('�'): flags.append('replacement_chars=%d' % text.count('�'))
    if ar_letters / max(len(body), 1) < 0.55: flags.append('low_arabic_ratio')
    if len(re.findall(r'<span data-type=.title', body)) == 0: flags.append('no_heading_markup')
    flags.append('no_embedded_page_numbers' if not re.search(r'\[ص:?\s*[\d٠-٩]+\]|PageV\d+P\d+', body) else 'possible_page_markers_unverified')
    row = dict(
      id='SRC-' + sid.zfill(6), shamela_id=sid, file_name=fn, title=f.get('الكتاب', ''), author=f.get('المؤلف', ''),
      editor=f.get('المحقق', ''), publisher=f.get('الناشر', ''), edition=f.get('الطبعة', ''), pages_declared=f.get('عدد الصفحات', f.get('عدد الأجزاء', '')),
      file_type='txt', bytes=len(raw), chars=len(body), arabic_letter_ratio=round(ar_letters / max(len(body), 1), 3),
      diacritic_ratio=round(diac / max(ar_letters, 1), 3), headings=len(re.findall(r'<span data-type=.title', body)),
      quran_citations=len(cite), d_tajweed=d['tajweed'], d_qiraat=d['qiraat'], d_pedagogy=d['pedagogy'], d_waqf=d['waqf'], d_rasm=d['rasm'],
      triage_category=cat, triage_tier=t.get('tier', ''), triage_basis=t.get('basis', ''), triage_reviewer=t.get('reviewer', ''),
      quality_flags=';'.join(flags), sha256=sha,
      license_status='LICENSE_REVIEW_REQUIRED', rights_note='Shamela-style export; per-title rights unverified. Internal analysis only; no publication of text.',
      scholarly_status='NOT_REVIEWED', processing_status='INVENTORIED', inventoried_at=datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'))
    rows.append(row); by_hash[sha].append(row['id'])
dups = {h: v for h, v in by_hash.items() if len(v) > 1}
cols = list(rows[0].keys())
with open(os.path.join(out, 'source_registry.csv'), 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.DictWriter(fh, cols); w.writeheader(); w.writerows(rows)
json.dump(rows, open(os.path.join(out, 'source_registry.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('files', len(rows), 'exact_duplicate_groups', len(dups))
cnt = collections.Counter((r['triage_category'], r['triage_tier']) for r in rows)
for k, v in sorted(cnt.items(), key=lambda x: (str(x[0][1]), x[0][0])): print(k, v)
print('chars total', sum(r['chars'] for r in rows))
print('--- header parse failures:', [r['id'] for r in rows if not r['title']])
print('--- flags:', collections.Counter(x for r in rows for x in r['quality_flags'].split(';')))
print('--- 9764:', [ (r['title'][:60], r['triage_category'], r['d_tajweed'], r['d_qiraat'], r['d_pedagogy']) for r in rows if r['shamela_id']=='9764'])
print('--- density sanity: OFF_TOPIC/PERIPHERAL with high tajweed density:')
for r in rows:
    if r['triage_tier'] in (4,5,'4','5') and (r['d_tajweed']>=3 or r['d_qiraat']>=5): print('  CHECK', r['id'], r['title'][:50], r['d_tajweed'], r['d_qiraat'])
print('--- tier1/2 with low density:')
for r in rows:
    if str(r['triage_tier']) in ('1',) and r['d_tajweed']<1.0 and r['d_waqf']<2: print('  CHECK', r['id'], r['title'][:50], r['d_tajweed'], r['d_waqf'])
