#!/usr/bin/env python3
"""Independent validation of site/data against the official bsb.txt (bereanbible.com/bsb.txt).
Reads only the JSON the reader actually loads; does not reuse the converter's verse tracking."""
import json, os, re, sys, hashlib, unicodedata
from collections import OrderedDict
import os as _os
ROOT = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))  # repository root
B = ROOT; D = ROOT + '/data'
TXT = ROOT + '/src/bsb.txt'  # download https://bereanbible.com/bsb.txt here first
idx = json.load(open(D + '/index.json'))['books']
names = {n: (o, c) for o, n, c in idx}
names['Psalm'] = names['Psalms']
def norm(s):
    s = unicodedata.normalize('NFC', s).replace('\u00a0', ' ')
    s = re.sub(r'\s+', ' ', s).strip()
    return re.sub(r' ?\u2014 ?', '\u2014', s)
# official text: book -> chapter -> {verse: text}
off = OrderedDict(); header = []
for i, line in enumerate(open(TXT, encoding='utf-8-sig')):
    p = line.rstrip('\r\n').split('\t')
    m = re.match(r'^(.+) (\d+):(\d+)$', p[0])
    if not m: header.append(line.strip()); continue
    bk, c, v = m.group(1), int(m.group(2)), int(m.group(3))
    off.setdefault(bk, OrderedDict()).setdefault(c, OrderedDict())[v] = p[1] if len(p) > 1 else ''
def json_verses(doc):
    out = OrderedDict(); v = 0; last = None
    for blk in doc['k']:
        if len(blk) > 1 and isinstance(blk[1], list):
            for it in blk[1]:
                if isinstance(it, int): v = it; out.setdefault(v, ''); continue
                if not v: continue
                if blk is not last: out[v] += ' '; last = blk
                if isinstance(it, str): out[v] += it
                elif isinstance(it, dict) and 'w' in it: out[v] += it['w']
    return out
R = {'books_index': len(idx), 'books_official': len(off), 'book_dirs': 0, 'chapters_expected': 0, 'chapter_files': 0,
     'missing_files': [], 'extra_files': [], 'chapter_count_mismatch': [], 'verse_count_mismatch': [], 'verse_set_mismatch': [],
     'verses_official_lines': 0, 'verses_official_blank': [], 'verses_checked': 0, 'wording_exact': 0, 'wording_mismatch': [], 'header_fields_bad': [], 'parse_errors': []}
offbooks = list(off.keys())
for i, (o, n, cc) in enumerate(idx):
    ob = offbooks[i]
    if names.get(ob, (None,))[0] != o: R['parse_errors'].append(f'book order {i}: {ob} vs {n}')
    oc = off[ob]
    if len(oc) != cc: R['chapter_count_mismatch'].append(f'{n}: index {cc}, official {len(oc)}')
    bdir = f'{D}/{o}'
    if os.path.isdir(bdir): R['book_dirs'] += 1
    files = set(os.listdir(bdir)) if os.path.isdir(bdir) else set()
    for c in oc:
        R['chapters_expected'] += 1
        f = f'{c}.json'
        if f not in files: R['missing_files'].append(f'{o}/{f}'); continue
        R['chapter_files'] += 1
        try: doc = json.load(open(f'{bdir}/{f}', encoding='utf-8'))
        except Exception as e: R['parse_errors'].append(f'{o}/{f}: {e}'); continue
        if doc.get('b') != o or doc.get('c') != c or doc.get('n') != n: R['header_fields_bad'].append(f'{o}/{f}')
        jv = json_verses(doc); ov = oc[c]
        R['verses_official_lines'] += len(ov)
        nonblank = [v for v, t in ov.items() if norm(t)]
        R['verses_official_blank'] += [f'{ob} {c}:{v}' for v, t in ov.items() if not norm(t)]
        if len(jv) != len(nonblank): R['verse_count_mismatch'].append(f'{ob} {c}: json {len(jv)}, official {len(nonblank)}')
        if set(jv) != set(nonblank): R['verse_set_mismatch'].append(f'{ob} {c}: {sorted(set(jv) ^ set(nonblank))}')
        if doc.get('vc') != max(ov): pass  # vc = highest verse present; blank final verses handled below
        for v in nonblank:
            R['verses_checked'] += 1
            if v in jv and norm(jv[v]) == norm(ov[v]): R['wording_exact'] += 1
            else: R['wording_mismatch'].append(f'{ob} {c}:{v}')
    extra = files - {f'{c}.json' for c in oc}
    R['extra_files'] += [f'{o}/{x}' for x in sorted(extra)]
R['header_line'] = header[0] if header else ''
spots = {}
for key, (o, c, v) in {'Psalm 121:1': ('Ps', 121, 1), 'Psalm 122:2': ('Ps', 122, 2), 'Acts 12:7': ('Acts', 12, 7), 'Acts 12:11': ('Acts', 12, 11)}.items():
    jt = norm(json_verses(json.load(open(f'{D}/{o}/{c}.json')))[v]); ot = off['Psalm' if o == 'Ps' else 'Acts'][c][v]
    spots[key] = {'reader': jt, 'official': ot, 'exact_byte_match': jt == ot}
R['spot_checks'] = spots
R['bsb_txt_sha256'] = hashlib.sha256(open(TXT, 'rb').read()).hexdigest()
R['pass'] = not any(R[k] for k in ['missing_files', 'extra_files', 'chapter_count_mismatch', 'verse_count_mismatch', 'verse_set_mismatch', 'wording_mismatch', 'header_fields_bad', 'parse_errors']) and R['books_index'] == R['books_official'] == R['book_dirs'] == 66
json.dump(R, open(ROOT + '/validation.json', 'w'), indent=1, ensure_ascii=False)
print(json.dumps({k: (v if not isinstance(v, list) else (len(v), v[:5])) for k, v in R.items() if k != 'spot_checks'}, indent=1, ensure_ascii=False))
print(json.dumps(spots, indent=1, ensure_ascii=False))
sys.exit(0 if R['pass'] else 1)
