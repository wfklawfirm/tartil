#!/usr/bin/env python3
"""Concept extraction v1: makharij al-huruf (articulation points) and sifat al-huruf (letter attributes).
Usage: python3 -I scripts/extract_concepts.py [extraction_dir] [out_jsonl]
Defaults: scholarly-assets/extraction  ->  scholarly-assets/extraction-concepts/concepts_draft.jsonl

- Reads ONLY tier-1 sources (per scholarly-assets/review/extraction_summary.json) from the already-extracted units.
- Output is a LOCATOR + NEUTRAL NOTE index: which units of which books discuss a concept, and where books state different counts.
  It contains NO definitions or rulings of our own, and NO long book text (variation entries carry fragments of <= 25 words).
- Every record: kind 'concept', riwayah_scope 'unspecified', state 'DRAFT', licence_cleared false.
- Every source_unit_id is checked against the real extraction output before writing (hard failure otherwise).
- Selection is purely lexical (heading / keyword matching): it is a candidate finder for human scholarly review, not an authority."""
import sys, os, re, json, collections, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'scholarly-assets', 'extraction')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'scholarly-assets', 'extraction-concepts', 'concepts_draft.jsonl')
SUMMARY = os.path.join(ROOT, 'scholarly-assets', 'review', 'extraction_summary.json')

MAX_UNITS_PER_SOURCE = 12     # lineage cap per (concept, book); the true number is recorded in the note
MAX_FRAGMENT_WORDS = 25

# ---------- normalisation (1:1 char mapping so match spans can be mapped back to the original text) ----------
_DIAC = re.compile('[ؐ-ًؚ-ٰٟۖ-ۭـ]')
_MAP = str.maketrans('أإآٱىةؤئ', 'اااايهوي')
_IDIGIT = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')

def n(t: str) -> str:
    return _DIAC.sub('', t).translate(_MAP)

def n_map(t: str):
    out, idx = [], []
    for i, ch in enumerate(t):
        if _DIAC.match(ch): continue
        out.append(ch.translate(_MAP)); idx.append(i)
    return ''.join(out), idx

AR = 'ء-ي'
def term(*alts: str) -> re.Pattern:
    """Word-ish match of normalised alternatives with optional clitic prefix and definite article."""
    body = '|'.join(n(a) for a in alts)
    return re.compile(r'(?<![%s])[وبلفك]?(?:ال)?(?:%s)(?![%s])' % (AR, body, AR))

def rx(p: str) -> re.Pattern:
    return re.compile(n(p))

# ---------- concept lexicon (search vocabulary only; carries no definitions) ----------
TOPIC = {'makharij': rx(r'مخرج|مخارج'), 'sifat': rx(r'صفات|صفة')}
JAHR_EXCL = rx(r'بالاستعاذ|بالبسمل|بالقراء|بالقرآن|الاسرار|الإسرار|الاخفات|الإخفات|والاخفاء|الإخفاء')

# key, title_ar, title_en, topic, group, heading/term regex, optional exclusion, optional strict outside-topic regex
C = []
def add(key, ar, en, topic, group, pat, excl=None, strict=None):
    C.append(dict(key=key, ar=ar, en=en, topic=topic, group=group, pat=pat, excl=excl, strict=strict))

add('makharij.overview', 'مخارج الحروف', 'Makharij al-huruf (articulation points) - overview', 'makharij', 'makharij',
    re.compile(r'(?<![%s])[وبلفك]?(?:ال)?(?:مخارج|مخرج)(?![%s])' % (AR, AR)), None,
    rx(r'(?:تعريف|معنى|عدد|اقسام|انواع|معرفه)\s+(?:ال)?(?:مخارج|مخرج)'))
add('makharij.general', 'المخارج العامة', 'The general (major) articulation regions', 'makharij', 'makharij',
    rx(r'المخارج\s+العامه|مخارج\s+عامه|المخرج\s+\S+\s+من\s+المخارج\s+العامه|المخارج\s+الخمسه|خمسه\s+مخارج'), None,
    rx(r'المخارج\s+العامه|المخارج\s+الخاصه'))
add('makharij.jawf', 'الجوف', 'al-Jawf (oral/throat cavity)', 'makharij', 'makharij_site', term('جوف', 'جوفي', 'جوفيه'))
add('makharij.halq', 'الحلق', 'al-Halq (throat)', 'makharij', 'makharij_site', term('حلق', 'حلقي', 'حلقيه'))
add('makharij.halq.aqsa', 'أقصى الحلق', 'Deepest part of the throat', 'makharij', 'makharij_subsite', rx(r'اقصي\s+(?:ال)?حلق'))
add('makharij.halq.wasat', 'وسط الحلق', 'Middle of the throat', 'makharij', 'makharij_subsite', rx(r'وسط\s+(?:ال)?حلق'))
add('makharij.halq.adna', 'أدنى الحلق', 'Nearest part of the throat', 'makharij', 'makharij_subsite', rx(r'ادني\s+(?:ال)?حلق'))
add('makharij.lisan', 'اللسان', 'al-Lisan (tongue)', 'makharij', 'makharij_site', term('لسان', 'لساني', 'لسانيه'))
add('makharij.lisan.aqsa', 'أقصى اللسان', 'Back of the tongue', 'makharij', 'makharij_subsite', rx(r'اقصي\s+(?:ال)?لسان'))
add('makharij.lisan.wasat', 'وسط اللسان', 'Middle of the tongue', 'makharij', 'makharij_subsite', rx(r'وسط\s+(?:ال)?لسان'))
add('makharij.lisan.hafa', 'حافة اللسان', 'Edge of the tongue', 'makharij', 'makharij_subsite', rx(r'حاف[هت]\S*\s+(?:ال)?لسان|حافتي\s+(?:ال)?لسان'))
add('makharij.lisan.taraf', 'طرف اللسان', 'Tip of the tongue', 'makharij', 'makharij_subsite', rx(r'طرف\s+(?:ال)?لسان'))
add('makharij.shafatan', 'الشفتان', 'ash-Shafatan (lips)', 'makharij', 'makharij_site', term('شفتان', 'شفتين', 'شفه', 'شفوي', 'شفويه'))
add('makharij.khayshum', 'الخيشوم', 'al-Khayshum (nasal cavity)', 'makharij', 'makharij_site', term('خيشوم'))

add('sifat.overview', 'صفات الحروف', 'Sifat al-huruf (letter attributes) - overview', 'sifat', 'sifat',
    re.compile(r'(?<![%s])[وبلفك]?(?:ال)?(?:صفات|صفه)(?![%s])' % (AR, AR)), None,
    rx(r'(?:تعريف|معنى|عدد|اقسام|انواع)\s+(?:ال)?(?:صفات|صفه)\s+(?:ال)?حروف|صفات\s+(?:ال)?حروف'))
add('sifat.with_opposite', 'الصفات التي لها ضد', 'Attributes that have an opposite', 'sifat', 'sifat_group',
    rx(r'(?:التي|ذات)\s+(?:لها\s+)?(?:ضد|اضداد)|صفات\s+(?:ال)?ضديه|الصفات\s+المتضاده|الصفات\s+المضاده|الصفات\s+التي\s+لها\s+ضد'))
add('sifat.without_opposite', 'الصفات التي لا ضد لها', 'Attributes without an opposite', 'sifat', 'sifat_group',
    rx(r'لا\s+(?:ضد|اضداد)\s+لها|غير\s+(?:ال)?ضديه|ليس\s+لها\s+ضد|لا\s+ضد'))
add('sifat.hams', 'الهمس', 'al-Hams', 'sifat', 'sifa', term('همس', 'مهموس', 'مهموسه'))
add('sifat.jahr', 'الجهر', 'al-Jahr', 'sifat', 'sifa', term('جهر', 'مجهور', 'مجهوره'), JAHR_EXCL,
    rx(r'(?:تعريف|معنى|حروف|صفه)\s+(?:ال)?(?:جهر|مجهوره)'))
add('sifat.shidda', 'الشدة', 'ash-Shidda', 'sifat', 'sifa', term('شده', 'شديد', 'شديده'), None,
    rx(r'(?:تعريف|معنى|حروف|صفه)\s+(?:ال)?(?:شده|شديده)'))
add('sifat.rakhawa', 'الرخاوة', 'ar-Rakhawa', 'sifat', 'sifa', term('رخاوه', 'رخو', 'رخوه'))
add('sifat.tawassut', 'التوسط (بين الشدة والرخاوة)', 'at-Tawassut / baynia', 'sifat', 'sifa',
    rx(r'(?<![%s])(?:ال)?(?:توسط|بينيه|متوسط)(?![%s])|بين\s+(?:ال)?شده\s+(?:و)?(?:ال)?رخاوه' % (AR, AR)))
add('sifat.isti3la', 'الاستعلاء', 'al-Isti\'la\'', 'sifat', 'sifa', term('استعلاء', 'مستعل', 'مستعليه'))
add('sifat.istifal', 'الاستفال', 'al-Istifal', 'sifat', 'sifa', term('استفال', 'مستفل', 'مستفله'))
add('sifat.itbaq', 'الإطباق', 'al-Itbaq', 'sifat', 'sifa', term('اطباق', 'مطبق', 'مطبقه'))
add('sifat.infitah', 'الانفتاح', 'al-Infitah', 'sifat', 'sifa', term('انفتاح', 'منفتح', 'منفتحه'))
add('sifat.idhlaq', 'الإذلاق', 'al-Idhlaq', 'sifat', 'sifa', term('اذلاق', 'مذلق', 'مذلقه'))
add('sifat.ismat', 'الإصمات', 'al-Ismat', 'sifat', 'sifa', term('اصمات', 'مصمت', 'مصمته'))
add('sifat.safir', 'الصفير', 'as-Safir', 'sifat', 'sifa', term('صفير'))
add('sifat.qalqala', 'القلقلة', 'al-Qalqala', 'sifat', 'sifa', term('قلقله', 'قلقل', 'مقلقل'))
add('sifat.lin', 'اللين', 'al-Lin', 'sifat', 'sifa', None, None,
    rx(r'(?:صفه|حروف|حرفا|تعريف|معنى)\s+(?:ال)?لين'))
add('sifat.inhiraf', 'الانحراف', 'al-Inhiraf', 'sifat', 'sifa', term('انحراف', 'منحرف'))
add('sifat.takrir', 'التكرير', 'at-Takrir', 'sifat', 'sifa', term('تكرير', 'مكرر', 'تكرار'))
add('sifat.tafashshi', 'التفشي', 'at-Tafashshi', 'sifat', 'sifa', term('تفشي'))
add('sifat.istitala', 'الاستطالة', 'al-Istitala', 'sifat', 'sifa', term('استطاله'))
add('sifat.ghunna', 'الغنة', 'al-Ghunna', 'sifat', 'sifa', term('غنه'))
add('sifat.khafa', 'الخفاء', 'al-Khafa\'', 'sifat', 'sifa', term('خفاء'))

# ---------- load tier-1 units ----------
def load():
    summ = json.load(open(SUMMARY, encoding='utf-8'))
    tier1 = [s for s in summ if str(s['tier']) == '1']
    sources, units, order = {}, {}, collections.defaultdict(list)
    for s in tier1:
        sid = s['source_id']
        title = re.sub(r'\s+', ' ', s['title']).strip()
        sources[sid] = title
        p = os.path.join(EXT, sid, 'units.jsonl')
        for line in open(p, encoding='utf-8'):
            u = json.loads(line)
            u['_n'] = n(u['text']); u['_title_n'] = n(u['section_title'])
            units[u['unit_id']] = u; order[sid].append(u['unit_id'])
    return sources, units, order

# ---------- numeric count statements (for 'variation' entries) ----------
_UNITS = {'واحد': 1, 'واحده': 1, 'اثنان': 2, 'اثنين': 2, 'اثنتان': 2, 'اثنتين': 2, 'ثلاث': 3, 'ثلاثه': 3, 'اربع': 4, 'اربعه': 4, 'خمس': 5, 'خمسه': 5,
          'ست': 6, 'سته': 6, 'سبع': 7, 'سبعه': 7, 'ثمان': 8, 'ثماني': 8, 'ثمانيه': 8, 'تسع': 9, 'تسعه': 9, 'عشر': 10, 'عشره': 10}
_UW = '|'.join(sorted(_UNITS, key=len, reverse=True))
NUM = r'(?:(?:%s)\s+و?\s*(?:عشرين|عشرون)|(?:%s)\s+(?:عشره|عشر)|(?:عشرين|عشرون)|(?:%s)|[0-9]{1,2})' % (_UW, _UW, _UW)
NOUN = r'(?:مخرجا|مخارج|مخرج|صفه|صفات)'
STMT_A = re.compile(r'(?<![%s])(%s)\s+(?:\S+\s+)?(%s)(?![%s])' % (AR, NUM, NOUN, AR))
STMT_B = re.compile(r'عدد\s+(?:ال)?(مخارج|صفات|مخرج|صفه)\S*\s*(?:هو|هي|:|=|يبلغ)?\s*(%s)(?![%s])' % (NUM, AR))

def num_value(s: str):
    s = s.strip().translate(_IDIGIT)
    if s.isdigit(): return int(s)
    m = re.fullmatch(r'(%s)\s+و?\s*(?:عشرين|عشرون)' % _UW, s)
    if m: return 20 + _UNITS[m.group(1)]
    if re.fullmatch(r'عشرين|عشرون', s): return 20
    m = re.fullmatch(r'(%s)\s+(?:عشره|عشر)' % _UW, s)
    if m and m.group(1) not in ('عشر', 'عشره'): return 10 + _UNITS[m.group(1)]
    return _UNITS.get(s)

def fragment(raw: str, nraw: str, idx, a: int, b: int):
    """<=25-word window of the ORIGINAL text around normalised span [a,b)."""
    oa, ob = idx[a], idx[b - 1] + 1
    words = [(m.start(), m.end()) for m in re.finditer(r'\S+', raw)]
    wi = [i for i, (s, e) in enumerate(words) if e > oa and s < ob]
    if not wi: return ''
    lo, hi = wi[0], wi[-1] + 1
    while hi - lo < MAX_FRAGMENT_WORDS and (lo > 0 or hi < len(words)):
        if lo > 0 and hi - lo < MAX_FRAGMENT_WORDS: lo -= 1
        if hi < len(words) and hi - lo < MAX_FRAGMENT_WORDS: hi += 1
    if hi - lo > MAX_FRAGMENT_WORDS: hi = lo + MAX_FRAGMENT_WORDS
    return raw[words[lo][0]:words[hi - 1][1]]

def count_statements(units, order):
    out = []
    for sid, ids in order.items():
        for uid in ids:
            u = units[uid]
            if u['char_len'] > 1500: continue
            nt, idx = n_map(u['text'])
            seen = set()
            for m in STMT_A.finditer(nt):
                v = num_value(m.group(1)); noun = m.group(2)
                if v is None or v == 0: continue
                out.append((uid, sid, 'makharij' if noun.startswith('مخر') or noun == 'مخارج' else 'sifat', v, m.start(), m.end(), nt, idx, u)); seen.add((m.start() // 40))
            for m in STMT_B.finditer(nt):
                v = num_value(m.group(2)); noun = m.group(1)
                if v is None or v == 0 or (m.start() // 40) in seen: continue
                out.append((uid, sid, 'makharij' if noun.startswith('مخر') else 'sifat', v, m.start(), m.end(), nt, idx, u))
    return out

# ---------- main ----------
def main():
    sources, units, order = load()
    uid_set = set(units)
    in_topic = {}   # unit -> set(topics)
    for uid, u in units.items():
        t = {k for k, p in TOPIC.items() if p.search(u['_title_n'])}
        in_topic[uid] = t

    records, stats = [], {}
    for c in C:
        per_src = collections.OrderedDict()
        for sid in sorted(order):
            hits = []  # (priority, position, uid, via)
            for pos, uid in enumerate(order[sid]):
                u = units[uid]; via = None
                if len(re.findall('[%s]+' % AR, u['_n'])) < 2: continue   # separators / empty lines carry no content
                tt = u['_title_n']
                if c['pat'] is not None and tt and c['pat'].search(tt) and not (c['excl'] and c['excl'].search(tt)):
                    via = 'heading'
                elif c['pat'] is not None and c['topic'] in in_topic[uid] and c['pat'].search(u['_n']) and not (c['excl'] and c['excl'].search(u['_n'])):
                    via = 'topic_section_keyword'
                elif c['strict'] is not None and u['char_len'] <= 600 and c['strict'].search(u['_n']) and not (c['excl'] and c['excl'].search(u['_n'])):
                    via = 'strict_phrase'
                if via: hits.append((0 if via == 'heading' else 1 if via == 'topic_section_keyword' else 2, pos, uid, via))
            if not hits: continue
            hits.sort()
            chosen = sorted(hits[:MAX_UNITS_PER_SOURCE], key=lambda h: h[1])
            per_src[sid] = dict(total=len(hits), via=dict(collections.Counter(h[3] for h in hits)),
                                unit_ids=[h[2] for h in chosen],
                                sections=sorted({units[h[2]]['section_id'] for h in chosen}, key=lambda s: (len(s), s)))
        stats[c['key']] = {sid: v['total'] for sid, v in per_src.items()}
        if not per_src: continue
        ids = [u for v in per_src.values() for u in v['unit_ids']]
        trunc = {sid: v['total'] for sid, v in per_src.items() if v['total'] > MAX_UNITS_PER_SOURCE}
        note = ('Lexical candidate index (not a definition or ruling). %d of %d tier-1 books contain matching units for this term: %s. '
                'Units were selected by section-heading match, keyword match inside makharij/sifat sections, or a strict phrase match elsewhere; '
                'see per_source.via. %sNo claim is made here about what the books say; a scholarly reviewer must read the cited units.'
                % (len(per_src), len(sources), ', '.join(per_src),
                   ('Lineage list capped at %d units per book for: %s (true match counts in per_source.total). ' % (MAX_UNITS_PER_SOURCE, ', '.join(sorted(trunc))) if trunc else '')))
        records.append(dict(kind='concept', title_ar=c['ar'], title_en=c['en'],
                            body=dict(entry_type='concept', concept_key=c['key'], group=c['group'], summary_note=note,
                                      per_source={sid: dict(total=v['total'], via=v['via'], section_ids=v['sections'], units_listed=len(v['unit_ids'])) for sid, v in per_src.items()},
                                      extraction='extract_concepts.py v1 (lexical)'),
                            source_unit_ids=ids, riwayah_scope='unspecified', state='DRAFT', licence_cleared=False))

    # variation entries: count statements, listed per source, never merged
    stm = count_statements(units, order)
    var_stats = {}
    for topic, ar, en in (('makharij', 'اختلاف الكتب في عدد المخارج', 'Variation: number of makharij stated by the books'),
                          ('sifat', 'اختلاف الكتب في عدد الصفات', 'Variation: number of sifat stated by the books')):
        sel = [s for s in stm if s[2] == topic]
        # keep statements located in topic sections or in units whose text itself names the topic with a count (STMT guarantees the noun)
        statements = []
        for uid, sid, _, v, a, b, nt, idx, u in sorted(sel, key=lambda s: (s[1], s[0], s[4])):
            statements.append(dict(source_id=sid, unit_id=uid, count=v, section_title=u['section_title'][:80], fragment=fragment(u['text'], nt, idx, a, b)))
        by_count = collections.OrderedDict()
        for s in statements: by_count.setdefault(s['count'], set()).add(s['source_id'])
        distinct = sorted(by_count)
        var_stats[topic] = dict(statements=len(statements), counts={k: sorted(v) for k, v in sorted(by_count.items())})
        if not statements: continue
        note = ('Count statements found by lexical pattern across tier-1 books (%d statements, %d books). Distinct numbers: %s. '
                'Statements are listed per book and NOT merged; some numbers refer to sub-groups (e.g. a count for one region or for attributes with opposites) '
                'rather than the total, so a reviewer must read each cited unit before treating any number as a book\'s position.'
                % (len(statements), len({s['source_id'] for s in statements}), ', '.join(str(d) for d in distinct)))
        records.append(dict(kind='concept', title_ar=ar, title_en=en,
                            body=dict(entry_type='variation', concept_key='variation.%s_count' % topic, group='variation', summary_note=note,
                                      count_values={str(k): sorted(v) for k, v in sorted(by_count.items())}, statements=statements,
                                      extraction='extract_concepts.py v1 (lexical)'),
                            source_unit_ids=sorted({s['unit_id'] for s in statements}), riwayah_scope='unspecified', state='DRAFT', licence_cleared=False))

    # integrity: every id must exist; invariants
    for r in records:
        assert r['kind'] == 'concept' and r['state'] == 'DRAFT' and r['licence_cleared'] is False and r['riwayah_scope'] == 'unspecified'
        missing = [u for u in r['source_unit_ids'] if u not in uid_set]
        assert not missing, (r['title_ar'], missing[:3])
        for s in r['body'].get('statements', []):
            assert len(s['fragment'].split()) <= MAX_FRAGMENT_WORDS and s['unit_id'] in uid_set
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        for r in records: f.write(json.dumps(r, ensure_ascii=False) + '\n')
    json.dump(dict(stats=stats, variation=var_stats, sources=sources), open(os.path.splitext(OUT)[0] + '_stats.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('tier1 books', len(sources), 'units', len(units), 'records', len(records),
          'concept', sum(r['body']['entry_type'] == 'concept' for r in records), 'variation', sum(r['body']['entry_type'] == 'variation' for r in records),
          'distinct unit ids', len({u for r in records for u in r['source_unit_ids']}))
    for t, v in var_stats.items(): print(t, 'statements', v['statements'], 'counts', {k: len(s) for k, s in v['counts'].items()})

if __name__ == '__main__':
    main()
