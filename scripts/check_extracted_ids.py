#!/usr/bin/env python3
"""Validate human-formation extraction files.

Default: every principle has a unique, stable `id` (<file>-NN, or legacy <file>-PN),
ids are unique across files, and the public docs/human-formation/extracted/*.json
and private scholarly-assets/extraction-formation/*.json carry identical ids in the
same order.

--locators: for each private principle, check that the book lines named in `locator`
(line numbers counted by "\\n" only) contain the `private_check` text(s), after
stripping tashkeel and normalising alef/ya/ta-marbuta/punctuation.

Run: python3 -I scripts/check_extracted_ids.py [--locators] [-v]
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, 'docs/human-formation/extracted')
PRIV = os.path.join(ROOT, 'scholarly-assets/extraction-formation')
BOOKS = os.path.join(ROOT, 'scholarly-assets/_inputs')

TASH = re.compile('[ؐ-ًؚ-ٰٟۖ-ۭـ]')


def norm(s):
    s = TASH.sub('', s)
    s = re.sub('[إأآٱ]', 'ا', s).replace('ى', 'ي').replace('ة', 'ه')
    return re.sub(r'[^\w]+', ' ', s).strip()


def load(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def names(d):
    return sorted(f[:-5] for f in os.listdir(d) if f.endswith('.json'))


def check_ids():
    errors = []
    priv_ok = os.path.isdir(PRIV)
    if not priv_ok:
        print('note: private dir missing, public-only check')
    seen = {}
    pub_names = names(PUB)
    if priv_ok and pub_names != names(PRIV):
        errors.append('file sets differ: public-only=%s private-only=%s' % (
            sorted(set(pub_names) - set(names(PRIV))), sorted(set(names(PRIV)) - set(pub_names))))
    total = 0
    for n in pub_names:
        pids = {}
        for label, d in (('public', PUB), ('private', PRIV)):
            if label == 'private' and not priv_ok:
                continue
            ids = []
            pat = re.compile(r'^%s-(P?\d+)$' % re.escape(n))
            ps = load(os.path.join(d, n + '.json')).get('principles', [])
            for i, p in enumerate(ps):
                pid = p.get('id')
                if not isinstance(pid, str) or not pid:
                    errors.append('%s %s[%d]: missing id' % (label, n, i)); ids.append(None); continue
                if not pat.match(pid):
                    errors.append('%s %s[%d]: id %r not of form %s-NN' % (label, n, i, pid, n))
                ids.append(pid)
            dup = {x for x in ids if x and ids.count(x) > 1}
            if dup:
                errors.append('%s %s: duplicate ids %s' % (label, n, sorted(dup)))
            pids[label] = ids
            if label == 'public':
                total += len(ids)
                for x in ids:
                    if x in seen and seen[x] != n:
                        errors.append('id %s used in %s and %s' % (x, seen[x], n))
                    seen[x] = n
        if priv_ok and pids['public'] != pids['private']:
            errors.append('%s: public/private ids differ' % n)
    print('ids: %d principles in %d files, %d error(s)' % (total, len(pub_names), len(errors)))
    return errors


_text, _lines = {}, {}


def book_text(bid):
    if bid not in _text:
        _text[bid] = None
        cands = ['formation-books/%s.txt' % bid, 'books/%s.txt' % bid]
        if bid.isdigit():
            cands.append('books/SRC-%06d.txt' % int(bid))
        for c in cands:
            p = os.path.join(BOOKS, c)
            if os.path.exists(p):
                with open(p, encoding='utf-8', newline='') as f:
                    _text[bid] = f.read()
                break
    return _text[bid]


def book_lines(bid):
    if bid not in _lines:
        t = book_text(bid)
        _lines[bid] = None if t is None else [norm(x) for x in t.split('\n')]
    return _lines[bid]


def book_id(bk):
    if isinstance(bk, dict):
        return str(bk['file'])
    m = re.match(r'\s*(?:SRC-)?0*(\d+)', bk)
    return m.group(1) if m else None


def refs(p):
    """Return (books, line numbers) mentioned in the locator."""
    loc = p['locator']
    books = {book_id(p['book'])}
    nums = set()
    toks = []
    for m in re.finditer(r'(SRC-[0-9]+|toc-[0-9]+)|(?<![0-9])([0-9]+)(?![0-9])', loc):
        if m.group(1):
            continue
        s, e = m.span(2)
        if re.match(r'\s*lines?\b', loc[e:e + 8]):
            books.add(m.group(2).lstrip('0'))
            continue
        toks.append((s, e, int(m.group(2))))
        if len(m.group(2)) >= 3 and book_text(m.group(2).lstrip('0')) is not None:
            books.add(m.group(2).lstrip('0'))  # cited book id not directly before "line"
    for k, (s, e, n) in enumerate(toks):
        nums.add(n)
        if k + 1 < len(toks):
            gap = loc[e:toks[k + 1][0]]
            if re.fullmatch(r'\s*(?:إلى|الى|[–-])\s*(?:lines?\s*)?', gap):
                b = toks[k + 1][2]
                if n < b < n + 400:
                    nums.update(range(n, b + 1))
    return books, nums


def locator_status(p):
    """Return ('ok'|'bad'|'nobook', detail)."""
    books, nums = refs(p)
    chks = p['private_check'] if isinstance(p['private_check'], list) else [p['private_check']]
    own = book_id(p['book'])
    if book_lines(own) is None:
        return 'nobook', 'book %s not found' % own
    frags = []
    for c in chks:  # "A … B" means both fragments must occur
        frags += [x for x in re.split(r'\s*(?:…|\.\.\.)\s*', c) if norm(x)]
    for c in frags:
        nc = norm(c)
        hit = False
        for b in books:
            L = book_lines(b)
            if L and any(1 <= n <= len(L) and nc in L[n - 1] for n in nums):
                hit = True
                break
        if not hit:
            where = [j + 1 for j, l in enumerate(book_lines(own)) if nc in l]
            return 'bad', 'check %r not at cited lines; own-book lines: %s' % (c[:40], where[:5] or 'not found')
    return 'ok', ''


def check_locators(verbose):
    if not os.path.isdir(PRIV):
        print('private dir missing; cannot check locators')
        return ['private dir missing']
    errors, total = [], 0
    for n in names(PRIV):
        for i, p in enumerate(load(os.path.join(PRIV, n + '.json')).get('principles', [])):
            total += 1
            st, detail = locator_status(p)
            if st != 'ok':
                errors.append('%s %s: %s %s' % (n, p.get('id', '[%d]' % i), st, detail))
    print('locators: %d checked, %d failing' % (total, len(errors)))
    if verbose or errors:
        for e in errors:
            print('  ' + e)
    return errors


if __name__ == '__main__':
    args = sys.argv[1:]
    errs = check_ids()
    for e in errs:
        print('  ' + e)
    if '--locators' in args:
        errs += check_locators('-v' in args)
    sys.exit(1 if errs else 0)
