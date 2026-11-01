"""Surah names + ayah counts (Hafs/Kufan numbering) used ONLY to sanity-check citations found in books.
This is a lookup table, not Quran text. It will be superseded by the verified Quran Core import (Tanzil) once licence terms are accepted."""
import re
SURAHS = """الفاتحة البقرة آل_عمران النساء المائدة الأنعام الأعراف الأنفال التوبة يونس هود يوسف الرعد إبراهيم الحجر النحل الإسراء الكهف مريم طه
الأنبياء الحج المؤمنون النور الفرقان الشعراء النمل القصص العنكبوت الروم لقمان السجدة الأحزاب سبأ فاطر يس الصافات ص الزمر غافر فصلت الشورى
الزخرف الدخان الجاثية الأحقاف محمد الفتح الحجرات ق الذاريات الطور النجم القمر الرحمن الواقعة الحديد المجادلة الحشر الممتحنة الصف الجمعة المنافقون
التغابن الطلاق التحريم الملك القلم الحاقة المعارج نوح الجن المزمل المدثر القيامة الإنسان المرسلات النبأ النازعات عبس التكوير الانفطار المطففين
الانشقاق البروج الطارق الأعلى الغاشية الفجر البلد الشمس الليل الضحى الشرح التين العلق القدر البينة الزلزلة العاديات القارعة التكاثر العصر الهمزة
الفيل قريش الماعون الكوثر الكافرون النصر المسد الإخلاص الفلق الناس""".split()
SURAHS = [s.replace('_', ' ') for s in SURAHS]
AYAH_COUNTS = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6]
assert len(SURAHS) == 114 and len(AYAH_COUNTS) == 114 and sum(AYAH_COUNTS) == 6236, (len(SURAHS), len(AYAH_COUNTS), sum(AYAH_COUNTS))

_DIAC = re.compile(r'[ً-ْٰـ]')
def norm_name(s: str) -> str:
    s = _DIAC.sub('', s).translate(str.maketrans('أإآٱىةؤئ', 'ااااي'+'هوي')).strip()
    return s
_ALIASES = {'اللهب': 111, 'القتال': 47, 'الانشراح': 94, 'تبارك': 67, 'براءه': 9, 'الدهر': 76, 'المومن': 40, 'ن': 68, 'عم': 78, 'السجده': 32, 'حم': 41}
LOOKUP = {}
for i, n in enumerate(SURAHS, 1):
    k = norm_name(n); LOOKUP[k] = i
    if k.startswith('ال'): LOOKUP.setdefault(k[2:], i)
for k, v in _ALIASES.items(): LOOKUP[k] = v
LOOKUP['ال عمران'] = 3; LOOKUP['عمران'] = 3
STOP = {'سوره','الايه','ايه','الايات','ايات','في','موضعين','موضع','و','من','سوره'}
_IND = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')

def parse_citation(raw: str):
    """raw like '[البقرة: ٢٦٥]' or '(٤: المزمل)'. Returns dict or None when it is not a Quran locator (e.g. a footnote number)."""
    inner = raw.strip()[1:-1].translate(_IND)
    words = re.findall(r'[ء-يً-ْ]+', inner)
    nums = re.findall(r'\d+', inner)
    if not words or not nums: return None
    cand = []
    toks = [norm_name(w) for w in words]
    toks = [t for t in toks if t not in STOP]
    # handle two-word names ("آل عمران") and a leading attached conjunction/preposition ("بالأنعام", "والنمل")
    joined = [' '.join(toks[i:i+2]) for i in range(len(toks) - 1)]
    for t in joined + toks:
        for form in (t, t[1:] if t[:1] in 'وبفلك' else None, t[2:] if t[:2] in ('وا', 'با') else None):
            if form and form in LOOKUP: cand.append(LOOKUP[form]); break
    if not toks: return {'status': 'SURAH_IMPLIED_BY_CONTEXT', 'surah': None, 'surahs': [], 'ayat': [int(n) for n in nums], 'range': None, 'raw': raw}
    if not cand: return {'status': 'UNRESOLVED_SURAH', 'raw': raw}
    surahs = sorted(set(cand))
    ay = [int(n) for n in nums]
    rng = None
    if re.search(r'\d+\s*[-–]\s*\d+', inner): rng = (ay[0], ay[1])
    st = 'RESOLVED_UNVERIFIED'
    if len(surahs) > 1: st = 'AMBIGUOUS_MULTI_SURAH'
    elif any(a < 1 or a > AYAH_COUNTS[surahs[0] - 1] for a in ay): st = 'AYAH_OUT_OF_RANGE'
    return {'status': st, 'surah': surahs[0] if len(surahs) == 1 else None, 'surahs': surahs, 'ayat': ay, 'range': rng, 'raw': raw}
