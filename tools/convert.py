#!/usr/bin/env python3
"""Convert the official BSB USFM (bereanbible.com/bsb_usfm.zip) to per-chapter JSON,
then verify every verse's wording against the official plain text (bereanbible.com/bsb.txt)."""
import re, json, os, glob, sys, unicodedata
SRC = '/workspace/bsb-reader/src'
OUT = '/workspace/bsb-reader/site/data'
# canonical order + OSIS ids used in reader links
BOOKS = [("GEN","Gen","Genesis"),("EXO","Exod","Exodus"),("LEV","Lev","Leviticus"),("NUM","Num","Numbers"),("DEU","Deut","Deuteronomy"),("JOS","Josh","Joshua"),("JDG","Judg","Judges"),("RUT","Ruth","Ruth"),("1SA","1Sam","1 Samuel"),("2SA","2Sam","2 Samuel"),("1KI","1Kgs","1 Kings"),("2KI","2Kgs","2 Kings"),("1CH","1Chr","1 Chronicles"),("2CH","2Chr","2 Chronicles"),("EZR","Ezra","Ezra"),("NEH","Neh","Nehemiah"),("EST","Esth","Esther"),("JOB","Job","Job"),("PSA","Ps","Psalms"),("PRO","Prov","Proverbs"),("ECC","Eccl","Ecclesiastes"),("SNG","Song","Song of Solomon"),("ISA","Isa","Isaiah"),("JER","Jer","Jeremiah"),("LAM","Lam","Lamentations"),("EZK","Ezek","Ezekiel"),("DAN","Dan","Daniel"),("HOS","Hos","Hosea"),("JOL","Joel","Joel"),("AMO","Amos","Amos"),("OBA","Obad","Obadiah"),("JON","Jonah","Jonah"),("MIC","Mic","Micah"),("NAM","Nah","Nahum"),("HAB","Hab","Habakkuk"),("ZEP","Zeph","Zephaniah"),("HAG","Hag","Haggai"),("ZEC","Zech","Zechariah"),("MAL","Mal","Malachi"),("MAT","Matt","Matthew"),("MRK","Mark","Mark"),("LUK","Luke","Luke"),("JHN","John","John"),("ACT","Acts","Acts"),("ROM","Rom","Romans"),("1CO","1Cor","1 Corinthians"),("2CO","2Cor","2 Corinthians"),("GAL","Gal","Galatians"),("EPH","Eph","Ephesians"),("PHP","Phil","Philippians"),("COL","Col","Colossians"),("1TH","1Thess","1 Thessalonians"),("2TH","2Thess","2 Thessalonians"),("1TI","1Tim","1 Timothy"),("2TI","2Tim","2 Timothy"),("TIT","Titus","Titus"),("PHM","Phlm","Philemon"),("HEB","Heb","Hebrews"),("JAS","Jas","James"),("1PE","1Pet","1 Peter"),("2PE","2Pet","2 Peter"),("1JN","1John","1 John"),("2JN","2John","2 John"),("3JN","3John","3 John"),("JUD","Jude","Jude"),("REV","Rev","Revelation")]
U2O = {u:o for u,o,_ in BOOKS}
TXTNAME = {"PSA":"Psalm","SNG":"Song of Solomon"}  # bsb.txt uses singular "Psalm"

def parse_ref(s):
    disp, _, tgt = s.partition('|')
    m = re.match(r'([1-3]?[A-Z]{2,3})\s+(\d+)(?::(\d+))?', tgt.strip())
    t = f"{U2O.get(m.group(1),m.group(1))}.{m.group(2)}" + (f".{m.group(3)}" if m.group(3) else "") if m else ""
    return {"x": disp.strip(), "t": t}

def note_segments(body):
    # body: content between '\f + ' and '\f*'
    segs = []; style = None
    for tok in re.split(r'(\\(?:fr|ft|fqa|fq|fv\*?|ref\*?)\s?)', body):
        if not tok: continue
        m = re.match(r'\\(fr|ft|fqa|fq|fv\*?|ref\*?)\s?$', tok)
        if m:
            style = m.group(1); continue
        if style == 'fr': continue  # origin ref shown by marker position
        if style == 'ref':
            segs.append(parse_ref(tok)); continue
        if style in ('fqa', 'fq'): segs.append({"i": tok})
        else: segs.append(tok)
    # merge adjacent strings
    out = []
    for s in segs:
        if isinstance(s, str) and out and isinstance(out[-1], str): out[-1] += s
        else: out.append(s)
    return out

INLINE = re.compile(r'(\\v \d+ |\\f \+ .*?\\f\*|\\wj\*|\\wj |\\ref .*?\\ref\*)')
def inline(text, ch, state):
    """Return list of items: int verse, str text, {'n':k} note ref, {'w':text} words of Jesus."""
    items = []
    for tok in INLINE.split(text):
        if not tok: continue
        if tok.startswith('\\v '):
            v = int(tok[3:].strip()); state['v'] = v; items.append(v); ch['verses'].setdefault(v, [])
        elif tok.startswith('\\f '):
            ch['notes'].append({"v": state['v'], "s": note_segments(tok[4:-3])})
            items.append({"n": len(ch['notes'])})
        elif tok == '\\wj ': state['wj'] = True
        elif tok == '\\wj*': state['wj'] = False
        elif tok.startswith('\\ref '):
            r = parse_ref(tok[5:-5]); items.append(r['x']); ch['verses'].setdefault(state['v'], []).append(r['x']) if state['v'] else None
        else:
            tok = re.sub(r'[ ]*\u2014[ ]*', '\u2014', tok)  # USFM spaces em-dashes; official bsb.txt does not
            items.append({"w": tok} if state['wj'] else tok)
            if state['v']: ch['verses'].setdefault(state['v'], []).append(tok)
    return items

BLOCK = re.compile(r'^\\(p|m|pmo|pc|pi\d?|li\d|q\d|qr|qa|d|b|s\d|ms\d?|mr|r|c|mt\d|h|toc\d|id|usfm)\b ?(.*)$')
def convert_book(path):
    code = os.path.basename(path).split('.')[0][-3:]
    chapters = {}; ch = None; state = {'v': 0, 'wj': False}; cur = None
    for raw in open(path, encoding='utf-8-sig'):
        line = raw.rstrip('\n').rstrip()
        if not line: continue
        m = BLOCK.match(line)
        if not m:
            if ch and cur is not None: cur[1].extend(inline(' ' + line, ch, state)); continue
            continue
        tag, rest = m.groups()
        if tag in ('id','usfm','h','toc1','toc2','toc3','mt1','mt2'): continue
        if tag == 'c':
            n = int(rest); ch = {'blocks': [], 'notes': [], 'verses': {}}; chapters[n] = ch; state['v'] = 0; cur = None; continue
        if ch is None: continue
        if tag == 'b': ch['blocks'].append(['b']); cur = None; continue
        if tag in ('s1','s2','ms','ms1','mr','qa','r'):
            txt = re.sub(r'\\ref (.*?)\|.*?\\ref\*', r'\1', rest).strip()
            ch['blocks'].append([{'s1':'s','s2':'s2','ms':'ms','ms1':'ms','mr':'mr','qa':'qa','r':'r'}[tag], txt]); cur = None; continue
        if state['v']: ch['verses'][state['v']].append(' ')
        cur = [tag, inline(rest, ch, state)]; ch['blocks'].append(cur)
    return code, chapters

def walk(ch):
    v = 0
    for blk in ch['blocks']:
        if len(blk) > 1 and isinstance(blk[1], list):
            for i, it in enumerate(blk[1]):
                if isinstance(it, int): v = it
                yield v, blk[1], i, it

def verse_texts(ch):
    out = {}
    lastblk = None
    for v, items, i, it in walk(ch):
        if not v: continue
        out.setdefault(v, '')
        if items is not lastblk: out[v] = out.get(v, '') + ' '; lastblk = items
        if isinstance(it, str): out[v] += it
        elif isinstance(it, dict) and 'w' in it: out[v] += it['w']
    return out

def replace_verse(ch, v, text):
    first = True; kill = []
    for vv, items, i, it in walk(ch):
        if vv != v or not (isinstance(it, str) or (isinstance(it, dict) and 'w' in it)): continue
        if first: items[i] = text + ' '; first = False
        else: kill.append((items, i))
    for items, i in reversed(kill): items[i] = None
    for blk in ch['blocks']:
        if len(blk) > 1 and isinstance(blk[1], list): blk[1][:] = [x for x in blk[1] if x is not None]

def norm(s):
    s = unicodedata.normalize('NFC', s).replace('\u00a0', ' ')
    s = re.sub(r'\s+', ' ', s).strip()
    return re.sub(r' ?\u2014 ?', '\u2014', s)  # line breaks after a dash in poetry; bsb.txt has no space beside em-dashes

def main():
    official = {}
    for line in open(f'{SRC}/bsb.txt', encoding='utf-8-sig'):
        p = line.rstrip('\r\n').split('\t')
        if len(p) >= 2 and re.match(r'.+ \d+:\d+$', p[0]): official[p[0]] = p[1]
    os.makedirs(OUT, exist_ok=True)
    index = []; total_bytes = 0; sizes = []; mism = []; fixed = []; checked = 0; omitted = []
    for usfm, osis, name in BOOKS:
        path = glob.glob(f'{SRC}/bsb_usfm/*{usfm}.usfm')[0]
        _, chapters = convert_book(path)
        index.append([osis, name, len(chapters)])
        os.makedirs(f'{OUT}/{osis}', exist_ok=True)
        tname = TXTNAME.get(usfm, name)
        for n, ch in sorted(chapters.items()):
            # verify against official text
            for v, parts in ch['verses'].items():
                key = f'{tname} {n}:{v}'; checked += 1
                if norm(''.join(parts)) != norm(official.get(key, '<<missing>>')):
                    fixed.append(key); replace_verse(ch, v, official[key])
            # re-verify from the JSON blocks themselves
            for v, txt in verse_texts(ch).items():
                if norm(txt) != norm(official.get(f'{tname} {n}:{v}', '<<missing>>')): mism.append(f'{tname} {n}:{v}')
            for key, txt in official.items():
                if key.startswith(f'{tname} {n}:') and not norm(txt):
                    omitted.append(key)
            doc = {"b": osis, "n": name, "c": n, "vc": max(ch['verses']) if ch['verses'] else 0,
                   "k": ch['blocks'], "f": ch['notes']}
            js = json.dumps(doc, ensure_ascii=False, separators=(',', ':'))
            open(f'{OUT}/{osis}/{n}.json', 'w', encoding='utf-8').write(js)
            b = len(js.encode()); total_bytes += b; sizes.append((b, f'{osis}.{n}'))
    open(f'{OUT}/index.json', 'w').write(json.dumps({"translation": "Berean Standard Bible (BSB)", "source": "https://bereanbible.com/bsb_usfm.zip", "books": index}, separators=(',', ':')))
    nonempty = sum(1 for t in official.values() if norm(t))
    sizes.sort()
    rep = {"chapters": len(sizes), "verses_in_json": checked, "official_nonempty_verses": nonempty,
           "official_lines": len(official), "official_empty_verses (omitted in BSB, explained by footnotes)": len(omitted),
           "verses_where_usfm_had_artifacts_so_bsb_txt_wording_used": len(fixed), "fixed_examples": fixed[:15], "wording_mismatches_after_build": len(mism), "mismatch_examples": mism[:20],
           "json_total_bytes": total_bytes, "chapter_bytes_min": sizes[0], "chapter_bytes_median": sizes[len(sizes)//2], "chapter_bytes_max": sizes[-1]}
    print(json.dumps(rep, indent=1))
    open("/workspace/bsb-reader/data/usfm-artifact-verses.txt","w").write("\n".join(fixed)+"\n")
    json.dump(rep, open('/workspace/bsb-reader/data/conversion-report.json', 'w'), indent=1)
main()
