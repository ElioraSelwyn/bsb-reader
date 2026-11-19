/* Eliora Selwyn — BSB Reader v1 (no dependencies). Text: Berean Standard Bible, public domain. */
(function () {
  'use strict';
  var BOOKS = [["Gen","Genesis",50],["Exod","Exodus",40],["Lev","Leviticus",27],["Num","Numbers",36],["Deut","Deuteronomy",34],["Josh","Joshua",24],["Judg","Judges",21],["Ruth","Ruth",4],["1Sam","1 Samuel",31],["2Sam","2 Samuel",24],["1Kgs","1 Kings",22],["2Kgs","2 Kings",25],["1Chr","1 Chronicles",29],["2Chr","2 Chronicles",36],["Ezra","Ezra",10],["Neh","Nehemiah",13],["Esth","Esther",10],["Job","Job",42],["Ps","Psalms",150],["Prov","Proverbs",31],["Eccl","Ecclesiastes",12],["Song","Song of Solomon",8],["Isa","Isaiah",66],["Jer","Jeremiah",52],["Lam","Lamentations",5],["Ezek","Ezekiel",48],["Dan","Daniel",12],["Hos","Hosea",14],["Joel","Joel",3],["Amos","Amos",9],["Obad","Obadiah",1],["Jonah","Jonah",4],["Mic","Micah",7],["Nah","Nahum",3],["Hab","Habakkuk",3],["Zeph","Zephaniah",3],["Hag","Haggai",2],["Zech","Zechariah",14],["Mal","Malachi",4],["Matt","Matthew",28],["Mark","Mark",16],["Luke","Luke",24],["John","John",21],["Acts","Acts",28],["Rom","Romans",16],["1Cor","1 Corinthians",16],["2Cor","2 Corinthians",13],["Gal","Galatians",6],["Eph","Ephesians",6],["Phil","Philippians",4],["Col","Colossians",4],["1Thess","1 Thessalonians",5],["2Thess","2 Thessalonians",3],["1Tim","1 Timothy",6],["2Tim","2 Timothy",4],["Titus","Titus",3],["Phlm","Philemon",1],["Heb","Hebrews",13],["Jas","James",5],["1Pet","1 Peter",5],["2Pet","2 Peter",3],["1John","1 John",5],["2John","2 John",1],["3John","3 John",1],["Jude","Jude",1],["Rev","Revelation",22]];  // [osis, name, chapters]
  var root = document.getElementById('bsb-reader');
  if (!root) return;
  // load reader.css from the same folder as this script (keeps the Blogger page body to two tags)
  var me = document.currentScript || document.querySelector('script[src*="reader.js"]');
  if (me && !document.getElementById('bsb-reader-css')) {
    var css = document.createElement('link'); css.id = 'bsb-reader-css'; css.rel = 'stylesheet';
    css.href = me.src.replace(/reader(\.min)?\.js(\?.*)?$/, 'reader.css'); document.head.appendChild(css);
  }
  var BASE = (root.getAttribute('data-base') || 'data/').replace(/\/?$/, '/');
  var HOME = root.getAttribute('data-site') || location.origin;
  // Browser storage is optional: if it is blocked (privacy mode, disabled cookies), even touching it can throw.
  function getStore(name) { try { var st = window[name], t = '__bsb'; st.setItem(t, t); st.removeItem(t); return st; } catch (e) { return null; } }
  var LS = getStore('localStorage'), SS = getStore('sessionStorage');
  function store(s, k, v) { if (!s) return null; try { if (v === undefined) return s.getItem(k); s.setItem(k, v); } catch (e) { return null; } return null; }

  // ---- reference parsing: #Acts.12.7, #Psalm.122.2-4, #ps122:2, #1-John.3.16 ----
  var ALIAS = {};
  BOOKS.forEach(function (b, i) {
    [b[0], b[1], b[1].replace(/ /g, ''), b[1].replace(/ /g, '-')].forEach(function (a) { ALIAS[a.toLowerCase()] = i; });
  });
  ['psalm:Ps', 'psa:Ps', 'song:Song', 'songofsongs:Song', 'canticles:Song', 'jn:John', 'mk:Mark', 'mt:Matt', 'lk:Luke', 'rev:Rev', 'revelations:Rev', 'phil:Phil', 'philemon:Phlm']
    .forEach(function (p) { var s = p.split(':'); ALIAS[s[0]] = ALIAS[s[1].toLowerCase()]; });
  function parseRef(h) {
    h = decodeURIComponent((h || '').replace(/^#/, '')).trim();
    var m = h.match(/^([1-3]?[\s.\-_]?[A-Za-z][A-Za-z\s\-_]*?)[\s._]*(\d+)(?:[.:](\d+)(?:-(\d+))?)?$/);
    if (!m) return null;
    var bi = ALIAS[m[1].toLowerCase().replace(/[\s._\-]/g, '')];
    if (bi === undefined) bi = ALIAS[m[1].toLowerCase().replace(/[\s._]/g, '-')];
    if (bi === undefined) return null;
    var c = Math.min(Math.max(parseInt(m[2], 10), 1), BOOKS[bi][2]);
    var v = m[3] ? parseInt(m[3], 10) : 0;
    return { b: bi, c: c, v: v, v2: m[4] ? parseInt(m[4], 10) : v };
  }
  // the same chapter on Bible Hub, which co-produces the BSB and hosts its official online text
  function officialUrl(bi, c) {
    var slug = BOOKS[bi][0] === 'Song' ? 'songs' : BOOKS[bi][1].toLowerCase().replace(/ /g, '_');
    return 'https://biblehub.com/bsb/' + slug + '/' + c + '.htm';
  }
  function chapTitle(bi, c) { return (BOOKS[bi][0] === 'Ps' ? 'Psalm' : BOOKS[bi][1]) + ' ' + c; }

  // ---- "Back to article": ?from=/path or same-site referrer, remembered for this tab ----
  function backTarget() {
    var q = new URLSearchParams(location.search).get('from');
    var cand = q || document.referrer;
    if (cand) {
      try {
        var u = new URL(cand, location.href);
        var okHost = u.hostname === location.hostname || u.hostname.replace(/^www\./, '') === new URL(HOME).hostname.replace(/^www\./, '');
        if (okHost && /^https?:$/.test(u.protocol) && u.pathname !== location.pathname) store(SS, 'bsbFrom', u.href);
      } catch (e) {}
    }
    return store(SS, 'bsbFrom');
  }

  // ---- UI shell ----
  root.innerHTML =
    '<div class="r-bar" role="toolbar" aria-label="Bible reader controls">' +
      '<a class="r-back" hidden href="#">&larr; Back to article</a>' +
      '<button type="button" class="r-pick" aria-expanded="false" aria-controls="bsb-panel"><span class="r-pick-label">Choose a book</span><span aria-hidden="true">&#9662;</span></button>' +
      '<button type="button" class="r-prev" aria-label="Previous chapter">&lsaquo;<span class="r-label-long">Prev</span></button>' +
      '<button type="button" class="r-next" aria-label="Next chapter"><span class="r-label-long">Next</span>&rsaquo;</button>' +
      '<span class="r-size" role="group" aria-label="Text size"><button type="button" class="r-smaller" aria-label="Smaller text">A&minus;</button><button type="button" class="r-bigger" aria-label="Larger text">A+</button></span>' +
    '</div>' +
    '<div class="r-panel" id="bsb-panel" hidden><h2 id="bsb-ot">Old Testament</h2><div class="r-books" data-t="ot"></div><h2>New Testament</h2><div class="r-books" data-t="nt"></div><h2 class="r-chap-h">Chapters</h2><div class="r-chaps"></div></div>' +
    '<div class="sr" aria-live="polite" aria-atomic="true"></div>' +
    '<p class="r-notice" role="status" hidden></p>' +
    '<article class="r-text" tabindex="-1"><p class="r-status">Loading&hellip;</p></article>' +
    '<nav class="r-nav" aria-label="Chapter navigation"><button type="button" class="r-prev">&lsaquo; <span class="r-prev-l">Previous</span></button><button type="button" class="r-next"><span class="r-next-l">Next</span> &rsaquo;</button></nav>' +
    '<footer class="r-credit">Scripture quotations are from <a href="https://bereanbible.com/" rel="noopener">The Holy Bible, Berean Standard Bible, BSB</a>, produced in cooperation with Bible Hub, Discovery Bible, unfoldingWord, Bible Aquifer, OpenBible.com, and the Berean Bible Translation Committee. This text of God\u2019s Word has been dedicated to the public domain.</footer>';
  // the site header is fixed at the top: measure it so the sticky bar and verse scrolling sit below it
  function headerH() {
    var e = document.elementFromPoint(window.innerWidth / 2, 2), h = 0;
    while (e && e !== document.body && e !== root) {
      var pos = getComputedStyle(e).position;
      if (pos === 'fixed' || pos === 'sticky') { h = Math.max(0, e.getBoundingClientRect().bottom); break; }
      e = e.parentElement;
    }
    root.style.setProperty('--r-top', h + 'px'); return h;
  }
  function $(s) { return root.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(root.querySelectorAll(s)); }
  var text = $('.r-text'), panel = $('#bsb-panel'), pick = $('.r-pick'), live = $('.sr'), back = $('.r-back');
  var cur = { b: -1, c: 0 }, panelBook = 0, cache = {};

  var from = backTarget();
  if (from) { back.href = from; back.hidden = false; }

  // ---- text size (A− / A+), relative to the reader's own browser font size ----
  var SIZES = [0.85, 1, 1.15, 1.3, 1.5, 1.75];
  var si = parseInt(store(LS, 'bsbSize') || '1', 10); if (!(si >= 0 && si < SIZES.length)) si = 1;
  function applySize(announce) {
    root.style.setProperty('--r-size', SIZES[si]);
    $('.r-smaller').disabled = si === 0; $('.r-bigger').disabled = si === SIZES.length - 1;
    store(LS, 'bsbSize', String(si));
    if (announce) live.textContent = 'Text size ' + Math.round(SIZES[si] * 100) + ' percent';
  }
  $('.r-smaller').onclick = function () { if (si > 0) { si--; applySize(true); } };
  $('.r-bigger').onclick = function () { if (si < SIZES.length - 1) { si++; applySize(true); } };
  applySize(false);

  // ---- book / chapter picker ----
  function buildBooks() {
    ['ot', 'nt'].forEach(function (t) {
      var box = $('.r-books[data-t="' + t + '"]');
      BOOKS.forEach(function (b, i) {
        if ((i < 39) !== (t === 'ot')) return;
        var btn = document.createElement('button'); btn.type = 'button'; btn.textContent = b[1]; btn.setAttribute('aria-pressed', 'false');
        btn.onclick = function () { panelBook = i; buildChaps(); if (b[2] === 1) go(i, 1, 0); else $('.r-chaps button').focus(); };
        box.appendChild(btn);
      });
    });
  }
  function buildChaps() {
    $$('.r-books button').forEach(function (btn, i) { btn.setAttribute('aria-pressed', String(i === panelBook)); });
    $('.r-chap-h').textContent = BOOKS[panelBook][1] + ' \u2014 chapters';
    var box = $('.r-chaps'); box.innerHTML = '';
    for (var c = 1; c <= BOOKS[panelBook][2]; c++) {
      var btn = document.createElement('button'); btn.type = 'button'; btn.textContent = c;
      btn.setAttribute('aria-label', chapTitle(panelBook, c));
      if (panelBook === cur.b && c === cur.c) btn.setAttribute('aria-current', 'true');
      btn.onclick = (function (cc) { return function () { go(panelBook, cc, 0); }; })(c);
      box.appendChild(btn);
    }
  }
  function openPanel(open) {
    panel.hidden = !open; pick.setAttribute('aria-expanded', String(open));
    if (open) { panelBook = cur.b < 0 ? 0 : cur.b; buildChaps(); var a = $('.r-chaps [aria-current]') || $('.r-books [aria-pressed=true]'); if (a) a.focus(); }
  }
  pick.onclick = function () { openPanel(panel.hidden); };
  root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { openPanel(false); pick.focus(); } });
  buildBooks();

  // ---- navigation ----
  function neighbor(d) {
    var b = cur.b, c = cur.c + d;
    if (c < 1) { b--; if (b < 0) return null; c = BOOKS[b][2]; }
    if (c > BOOKS[b][2]) { b++; if (b >= BOOKS.length) return null; c = 1; }
    return { b: b, c: c };
  }
  function go(b, c, v) { location.hash = BOOKS[b][0] + '.' + c + (v ? '.' + v : ''); }
  $$('.r-prev').forEach(function (el) { el.onclick = function () { var n = neighbor(-1); if (n) go(n.b, n.c, 0); }; });
  $$('.r-next').forEach(function (el) { el.onclick = function () { var n = neighbor(1); if (n) go(n.b, n.c, 0); }; });

  function load(b, c) {
    var key = BOOKS[b][0] + '/' + c;
    if (!cache[key] && window.BSB_DATA) cache[key] = window.BSB_DATA[key] ? Promise.resolve(window.BSB_DATA[key]) : Promise.reject(new Error('not in offline preview'));
    if (!cache[key]) cache[key] = fetch(BASE + key + '.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    return cache[key];
  }

  // ---- rendering (textContent only; no HTML from data) ----
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function render(d, ref) {
    var bi = ref.b, frag = document.createDocumentFragment(), v = 0;
    frag.appendChild(el('h1', null, chapTitle(bi, d.c)));
    d.k.forEach(function (blk) {
      var t = blk[0];
      if (t === 'b') return frag.appendChild(el('div', 'b'));
      if (t === 's' || t === 's2' || t === 'ms' || t === 'mr' || t === 'qa') return frag.appendChild(el(t === 's' || t === 'ms' ? 'h3' : 'h4', null, blk[1]));
      if (t === 'r') return frag.appendChild(el('p', 'r-ref', blk[1]));
      var p = el(/^q|^li/.test(t) ? 'div' : 'p', t);
      blk[1].forEach(function (it) {
        if (typeof it === 'number') {
          v = it;
          var a = el('a', 'v', String(it)); a.id = 'v' + it; a.href = '#' + BOOKS[bi][0] + '.' + d.c + '.' + it;
          a.setAttribute('aria-label', 'Verse ' + it); p.appendChild(a); return;
        }
        if (it.n) { var f = el('a', 'fn', String.fromCharCode(96 + ((it.n - 1) % 26) + 1)); f.href = '#'; f.setAttribute('data-n', it.n); f.setAttribute('aria-label', 'Footnote ' + it.n); f.id = 'fr' + it.n; p.appendChild(f); return; }
        var s = el('span', 'vt', typeof it === 'string' ? it : it.w); s.setAttribute('data-v', v); p.appendChild(s);
      });
      frag.appendChild(p);
    });
    if (d.f && d.f.length) {
      var det = el('details', 'r-notes'), sum = el('summary', null, 'Translation footnotes (' + d.f.length + ')'), ol = el('ol');
      ol.setAttribute('type', 'a'); det.appendChild(sum);
      d.f.forEach(function (n, i) {
        var li = el('li'); li.id = 'fn' + (i + 1);
        li.appendChild(el('strong', null, d.c + ':' + n.v + ' '));
        n.s.forEach(function (sg) {
          if (typeof sg === 'string') li.appendChild(document.createTextNode(sg));
          else if (sg.i) li.appendChild(el('em', null, sg.i));
          else if (sg.x) { var a = el('a', null, sg.x); if (sg.t) a.href = '#' + sg.t; li.appendChild(a); }
        });
        ol.appendChild(li);
      });
      det.appendChild(ol); frag.appendChild(det);
    }
    text.innerHTML = ''; text.appendChild(frag);
    text.onclick = function (e) {
      var f = e.target.closest && e.target.closest('.fn'); if (!f) return;
      e.preventDefault(); var det = text.querySelector('.r-notes'); det.open = true;
      var li = text.querySelector('#fn' + f.getAttribute('data-n')); li.scrollIntoView({ block: 'center' }); li.setAttribute('tabindex', '-1'); li.focus();
    };
  }

  function show(ref) {
    openPanel(false);
    var same = ref.b === cur.b && ref.c === cur.c;
    var p = same ? Promise.resolve(null) : load(ref.b, ref.c);
    if (!same) text.setAttribute('aria-busy', 'true');
    p.then(function (d) {
      if (d) { render(d, ref); cur = { b: ref.b, c: ref.c }; }
      text.removeAttribute('aria-busy');
      var title = chapTitle(ref.b, ref.c);
      pick.querySelector('.r-pick-label').textContent = title + (ref.v ? ':' + ref.v + (ref.v2 > ref.v ? '\u2013' + ref.v2 : '') : '');
      var pr = neighbor(-1), nx = neighbor(1);
      $$('.r-prev').forEach(function (e) { e.disabled = !pr; }); $$('.r-next').forEach(function (e) { e.disabled = !nx; });
      $('.r-prev-l').textContent = pr ? chapTitle(pr.b, pr.c) : 'Previous'; $('.r-next-l').textContent = nx ? chapTitle(nx.b, nx.c) : 'Next';
      $$('.hl').forEach(function (e) { e.classList.remove('hl'); });
      var target = null;
      if (ref.v) {
        for (var v = ref.v; v <= ref.v2; v++) $$('.vt[data-v="' + v + '"]').forEach(function (e) { e.classList.add('hl'); });
        target = $('#v' + ref.v);
        if (!target) notice(title + ' has ' + $$('.r-text .v').length + ' verses; verse ' + ref.v + ' was not found, so the whole chapter is shown.');
      }
      var smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (target) { var bar = $('.r-bar'), barH = getComputedStyle(bar).position === 'sticky' ? bar.offsetHeight : 0; var y = target.getBoundingClientRect().top + window.pageYOffset - headerH() - barH - window.innerHeight * 0.2; window.scrollTo({ top: Math.max(0, y), behavior: smooth ? 'smooth' : 'auto' }); }
      else if (!same) { var top = root.getBoundingClientRect().top + window.pageYOffset - headerH(); if (window.pageYOffset > top) window.scrollTo(0, top); }
      live.textContent = title + ' (BSB)' + (ref.v ? ', verse ' + ref.v + ' highlighted' : '');
      document.title = title + (ref.v ? ':' + ref.v : '') + ' (BSB) \u2014 Read the Bible \u2014 Eliora Selwyn';
      store(LS, 'bsbLast', BOOKS[ref.b][0] + '.' + ref.c);
      if (nx) load(nx.b, nx.c).catch(function () { delete cache[BOOKS[nx.b][0] + '/' + nx.c]; }); // prefetch next chapter
    }).catch(function () {
      delete cache[BOOKS[ref.b][0] + '/' + ref.c];
      text.removeAttribute('aria-busy');
      var t = chapTitle(ref.b, ref.c), box = el('div', 'r-status r-error');
      box.appendChild(el('p', null, t + ' could not be loaded. Please check your connection and try again.'));
      var retry = el('button', 'r-retry', 'Try again'); retry.type = 'button'; retry.onclick = function () { show(ref); };
      var off = el('a', 'r-official', 'Read ' + t + ' (BSB) on Bible Hub'); off.href = officialUrl(ref.b, ref.c); off.rel = 'noopener';
      var row = el('p'); row.appendChild(retry); row.appendChild(document.createTextNode(' ')); row.appendChild(off); box.appendChild(row);
      text.innerHTML = ''; text.appendChild(box);
      pick.querySelector('.r-pick-label').textContent = t;
      live.textContent = t + ' could not be loaded.';
      retry.focus();
    });
  }
  var noticeEl = $('.r-notice');
  function notice(msg) { noticeEl.textContent = msg || ''; noticeEl.hidden = !msg; }
  function route() {
    notice('');
    var h = location.hash.replace(/^#/, ''), r = parseRef(h);
    if (!r && h && !/^(fn|fr|v)\d+$/.test(h)) notice('\u201c' + decodeURIComponent(h) + '\u201d is not a Bible reference this reader recognizes. Try a link like #Ps.122.2 or #Acts.12, or choose a book below.');
    show(r || parseRef(store(LS, 'bsbLast') || '') || { b: 0, c: 1, v: 0, v2: 0 });
  }
  window.addEventListener('hashchange', route);
  headerH(); window.addEventListener('resize', headerH);
  route();
})();
