#!/usr/bin/env python3
"""Phase 2 extraction: books -> addressable units (sections / paragraphs) with stable IDs, hashes and Quran-citation candidates.
Usage: python3 -I scripts/extract_books.py <books_dir> <registry.json> <out_dir>
- Sources are read-only. Original text is preserved byte-for-byte in `text`; normalised forms are separate fields used only for matching.
- Locator = (source_id, toc section id, paragraph ordinal, char offset). These exports carry NO printed page numbers; never fabricate any.
- Output is derived from third-party books => LICENSE_REVIEW_REQUIRED, kept out of git (see .gitignore)."""
import sys, os, re, json, hashlib, collections, unicodedata
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from quran_reference import parse_citation, norm_name, _DIAC

books_dir, reg_path, out_dir = sys.argv[1:4]
reg = {r['id']: r for r in json.load(open(reg_path, encoding='utf-8'))}
HEAD = re.compile(r'<span data-type=[\'"]title[\'"] id=[\'"]?(toc-\d+)[\'"]?>(.*?)</span>', re.S)
CITE = re.compile(r'﴿[^﴾]{1,900}﴾\s*[\.،,]?\s*([\[\(][^\]\)]{1,60}[\]\)])')
TAG = re.compile(r'<[^>]+>')
def nrm(t: str) -> str:
    t = _DIAC.sub('', t).translate(str.maketrans('أإآٱىةؤئ', 'ااااي' + 'هوي'))
    t = re.sub(r'[^ء-ي0-9\s]', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()
sha = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()

os.makedirs(out_dir, exist_ok=True)
summary = []
for sid, r in sorted(reg.items()):
    if int(r['triage_tier'] or 9) > 3: continue
    p = os.path.join(books_dir, sid + '.txt')
    raw = open(p, encoding='utf-8').read()
    parts = raw.split('=' * 60)
    body = parts[2] if len(parts) >= 3 else raw
    body = unicodedata.normalize('NFC', body)
    # mark headings so they become their own line, then split into paragraphs
    marked = HEAD.sub(lambda m: '\n@@H|%s|%s@@\n' % (m.group(1), TAG.sub('', m.group(2)).strip().replace('|', '/')), body)
    sec_id, sec_title, ordn = 'front', '', 0
    units, sections = [], collections.OrderedDict({'front': {'title': '', 'paragraphs': 0}})
    offset = 0
    cite_stats = collections.Counter()
    for line in marked.split('\n'):
        ln_len = len(line) + 1
        s = line.strip()
        offset += ln_len
        if not s: continue
        h = re.fullmatch(r'@@H\|(toc-\d+)\|(.*)@@', s)
        if h:
            sec_id, sec_title, ordn = h.group(1), h.group(2), 0
            sections[sec_id] = {'title': sec_title, 'paragraphs': 0}; continue
        ordn += 1; sections[sec_id]['paragraphs'] += 1
        cites = []
        for m in CITE.finditer(s):
            c = parse_citation(m.group(1))
            if c: cites.append(c); cite_stats[c['status']] += 1
        n = nrm(s)
        units.append({'unit_id': f'{sid}#{sec_id}.p{ordn:04d}', 'source_id': sid, 'section_id': sec_id, 'section_title': sec_title,
                      'ordinal': ordn, 'char_offset': offset - ln_len, 'char_len': len(s), 'words': len(n.split()),
                      'sha256': sha(s), 'norm_sha256': sha(n), 'quran_citations': cites, 'text': s})
    d = os.path.join(out_dir, sid); os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'units.jsonl'), 'w', encoding='utf-8') as f:
        for u in units: f.write(json.dumps(u, ensure_ascii=False) + '\n')
    json.dump(sections, open(os.path.join(d, 'sections.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    quotes = body.count('﴿')
    summary.append({'source_id': sid, 'title': r['title'][:70], 'category': r['triage_category'], 'tier': r['triage_tier'], 'sections': len(sections) - 1,
                    'units': len(units), 'chars': sum(u['char_len'] for u in units), 'ayah_quotes': quotes,
                    'cites_parsed': sum(cite_stats.values()), 'cite_status': dict(cite_stats), 'source_sha256': r['sha256']})
json.dump(summary, open(os.path.join(out_dir, 'extraction_summary.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
T = lambda k: sum(s[k] for s in summary)
print('books', len(summary), 'sections', T('sections'), 'units', T('units'), 'chars', T('chars'), 'ayah_quotes', T('ayah_quotes'), 'cites_parsed', T('cites_parsed'))
st = collections.Counter(); [st.update(s['cite_status']) for s in summary]; print(dict(st))
print('books with 0 sections:', [s['source_id'] for s in summary if s['sections'] == 0])
