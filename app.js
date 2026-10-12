(function () {
  'use strict';
  var CFG = window.MOCK || {};
  var XURL = 'https://x.com/babybluecream';
  var FV = 'https://finviz.com/?affilId=324420513';
  var CATS = [{ id: 'all', label: '전체' }], CAT_LABEL = { all: '전체' }, PATH = [];
  var HIDDEN = { start: 1 }; // 시작하기(구독 안내)는 읽기 순서 0단계에서만 보임
  var posts = [], byId = {};
  var state = { view: 'index', stage: '0', cat: 'all', sub: null, free: false, xa: false, q: '', sort: 'desc', ticker: null };
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(d) { var p = String(d).split('-'); return p.length === 3 ? p[0] + '.' + p[1] + '.' + p[2] : d; }
  function norm(s) { return String(s || '').toLowerCase().replace(/\$/g, '').replace(/\s+/g, ''); }
  function pad(n) { return ('00' + n).slice(-3); }
  function idOf(p) { return String(p.url).split('/').pop(); }
  function isFree(p) { return p.access !== 'locked'; }
  function inCat(p, id) { return id === 'all' || (id === 'article' ? !!p.article : p.category === id); }
  function visible(p) { return !HIDDEN[p.category]; }
  function pass(p, skip) {
    skip = skip || {};
    if (!visible(p)) return false;
    if (!skip.cat && !inCat(p, state.cat)) return false;
    if (!skip.sub && state.sub && p.sub !== state.sub) return false;
    if (!skip.free && state.free && !isFree(p)) return false;
    if (!skip.xa && state.xa && !p.xarticle) return false;
    if (!skip.ticker && state.ticker && (p.tickers || []).indexOf(state.ticker) === -1) return false;
    if (state.q) {
      var hay = norm(p.title + ' ' + (p.tickers || []).join(' ') + ' ' + (p.summary || '') + ' ' + (CAT_LABEL[p.category] || '') + ' ' + (p.sub || '') + ' ' + (p.source === '번역' ? '번역' : '') + ' ' + (p.label || '') + (p.xarticle || p.article ? ' 아티클 article' : ''));
      var t = state.q.toLowerCase().replace(/\$/g, '').split(/\s+/).filter(Boolean);
      for (var i = 0; i < t.length; i++) if (hay.indexOf(norm(t[i])) === -1) return false;
    }
    return true;
  }
  function b(attr, val, label, on, n) {
    return '<button type="button" class="fb" ' + attr + '="' + esc(val) + '" aria-pressed="' + on + '"><span class="fl">' + esc(label) + '</span>' + (n != null ? '<span class="fn">' + n + '</span>' : '') + '</button>';
  }
  function tickerCounts(filtered) {
    var c = {}; posts.forEach(function (p) { if (!visible(p)) return; if (filtered && !pass(p, { ticker: true })) return; (p.tickers || []).forEach(function (t) { c[t] = (c[t] || 0) + 1; }); }); return c;
  }
  function srcTag(p) {
    if (p.source !== '번역') return ''; // 번역만 태그 표시
    var m = { '본인': ['src-own', '본인'], '정리': ['src-sum', '정리'], '번역': ['src-tr', '번역'] }[p.source] || ['src-sum', p.source || ''];
    return '<span class="src ' + m[0] + '" title="' + esc({ '본인': '직접 쓴 글·설정', '정리': '책·영상·기사 요약', '번역': '해외 투자자 글 번역 — 본인 성과 아님' }[p.source] || '') + '">[' + esc(m[1]) + ']</span>';
  }
  function accTag(p) {
    if (p.access === 'locked') return '<span class="acc acc-lock">🔒 SUB</span>';
    if (p.access === 'sample') return '<span class="acc acc-sample">SAMPLE</span>';
    return '<span class="acc acc-free">FREE</span>';
  }
  function renderStats() {
    var vis = posts.filter(visible);
    var latest = vis.reduce(function (m, p) { return p.date > m ? p.date : m; }, '');
    $('stats').innerHTML = '<div><dt>' + CFG.statLabels[0] + '</dt><dd>' + vis.length + '</dd></div>' +
      '<div><dt>' + CFG.statLabels[1] + '</dt><dd>' + Object.keys(tickerCounts(false)).length + '</dd></div>' +
      '<div><dt>' + CFG.statLabels[2] + '</dt><dd>' + (latest ? fmt(latest).slice(2) : '-') + '</dd></div>';
  }
  function renderFilters() {
    $('cats').innerHTML = CATS.map(function (c) {
      var n = posts.filter(function (p) { return inCat(p, c.id) && pass(p, { cat: true, sub: true }); }).length;
      return b('data-cat', c.id, c.label, state.cat === c.id, n);
    }).join('');
    var subs = [];
    if (state.cat !== 'all') posts.forEach(function (p) { if (p.category === state.cat && p.sub && subs.indexOf(p.sub) === -1) subs.push(p.sub); });
    $('subWrap').hidden = subs.length < 2;
    $('subs').innerHTML = subs.length < 2 ? '' : [b('data-sub', '', '전체', !state.sub)].concat(subs.map(function (s) {
      var n = posts.filter(function (p) { return p.sub === s && pass(p, { sub: true }); }).length;
      return b('data-sub', s, s, state.sub === s, n);
    })).join('');
    var nFree = posts.filter(function (p) { return isFree(p) && pass(p, { free: true }); }).length;
    $('freeBtn').setAttribute('aria-pressed', String(state.free));
    $('freeBtn').innerHTML = '<span class="fl">FREE만 보기</span><span class="fn">' + nFree + '</span>';
    var nXa = posts.filter(function (p) { return p.xarticle && pass(p, { xa: true }); }).length;
    $('xaBtn').setAttribute('aria-pressed', String(state.xa));
    $('xaBtn').innerHTML = '<span class="fl">X 아티클만</span><span class="fn">' + nXa + '</span>';
    var c = tickerCounts(true), ks = Object.keys(c).sort();
    if (state.ticker && ks.indexOf(state.ticker) === -1) ks.unshift(state.ticker);
    $('chips').innerHTML = ks.length ? ks.map(function (t) { return b('data-ticker', t, '$' + t, state.ticker === t, c[t] || 0); }).join('') : '<span class="none">해당 티커 없음</span>';
    $('sortBtn').textContent = state.sort === 'desc' ? CFG.sortDesc : CFG.sortAsc;
    $('clearQ').hidden = !state.q;
  }
  function extraTags(p) {
    return (p.xarticle ? '<span class="xa-tag">ARTICLE</span>' : '') + (p.label ? '<span class="lbl">' + esc(p.label) + '</span>' : '');
  }
  function tks(p) { return (p.tickers || []).map(function (t) { return '<span class="tk">$' + esc(t) + '</span>'; }).join(''); }
  function row(p, i, step) {
    var lead = step != null ? '<span class="no step">' + step + '</span>' : '<span class="no">' + pad(p._n) + '</span>';
    if (p.access === 'locked') {
      return '<li class="row locked cat-' + esc(p.category) + '" style="--i:' + (i % 12) + '">' +
        '<a class="hit" href="' + esc(p.url) + '" target="_blank" rel="noopener" aria-label="' + esc(p.title) + ' — X에서 열기(구독자 전용)">' + lead +
        '<time class="date" datetime="' + esc(p.date) + '">' + esc(fmt(p.date)) + '</time>' +
        '<span class="cat">' + esc(CAT_LABEL[p.category] || p.category) + '</span>' + accTag(p) +
        '<span class="ttl"><span class="lk" aria-hidden="true">🔒</span> ' + esc(p.title) + extraTags(p) + '</span>' +
        '<span class="sum sum-lock" aria-hidden="true">████████ ██████ ████ ███████ ██████</span>' +
        '<span class="tks">' + tks(p) + '</span>' +
        '<span class="go go-lock">X에서 열기(구독자 전용)</span></a></li>';
    }
    return '<li class="row cat-' + esc(p.category) + (p.source === '번역' ? ' is-tr' : '') + '" style="--i:' + (i % 12) + '">' +
      '<a class="hit" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + lead +
      '<time class="date" datetime="' + esc(p.date) + '">' + esc(fmt(p.date)) + '</time>' +
      '<span class="cat">' + esc(CAT_LABEL[p.category] || p.category) + (p.sub ? '<i>' + esc(p.sub) + '</i>' : '') + '</span>' + accTag(p) +
      '<span class="ttl">' + srcTag(p) + ' ' + esc(p.title) + extraTags(p) + '</span>' +
      (p.label && !p.summary ? '<span class="sum sum-note">원문 출처 저작권 보호를 위해 요약을 싣지 않습니다. X에서 확인하세요.</span>' : p.summary ? '<span class="sum">' + (p.partial ? '<em class="part">원문 일부</em> ' : '') + esc(p.summary) + '</span>' : '<span class="sum sum-empty"></span>') +
      '<span class="tks">' + tks(p) + '</span>' +
      '<span class="go">' + CFG.goLabel + '</span></a></li>';
  }
  function ctaBox(text, btnHtml, cls) {
    return '<li class="cta ' + (cls || '') + '"><div class="cta-in"><p class="cta-t">' + esc(text) + '</p>' + btnHtml +
      '<p class="cta-n">리딩 없음 · 정보 제공 목적. 특정 종목 매매 추천을 하지 않습니다. 구독 안내는 X 프로필에서 확인하세요.</p></div></li>';
  }
  function xBtn(label) { return '<a class="go-btn sub" href="' + XURL + '" target="_blank" rel="noopener">' + esc(label) + '</a>'; }
  function renderList() {
    var list = posts.filter(function (p) { return pass(p); });
    list.sort(function (a, c) { var r = a.date < c.date ? -1 : a.date > c.date ? 1 : a._i - c._i; return state.sort === 'asc' ? r : -r; });
    var html = '', ctaDone = false;
    list.forEach(function (p, i) {
      if (!ctaDone && p.access === 'locked') {
        ctaDone = true;
        html += ctaBox('아래 🔒 글은 구독자 전용입니다. 방법은 공개 글로, 매주 실제 결과 티커는 구독자에게 공유합니다 🐧', xBtn('X에서 구독 확인 ↗'), 'cta-list');
      }
      html += row(p, i);
    });
    $('list').innerHTML = html;
    var e = $('empty');
    if (list.length) e.hidden = true;
    else { e.hidden = false; e.innerHTML = '<p class="big">' + CFG.emptyBig + '</p><p>조건에 맞는 글이 없습니다.</p><button type="button" class="fb" id="resetAll"><span class="fl">필터 초기화</span></button>'; }
    var parts = [];
    if (state.cat !== 'all') parts.push(CAT_LABEL[state.cat]);
    if (state.sub) parts.push(state.sub);
    if (state.free) parts.push('FREE');
    if (state.xa) parts.push('X 아티클');
    if (state.ticker) parts.push('$' + state.ticker);
    if (state.q) parts.push('“' + state.q + '”');
    $('count').textContent = CFG.countPrefix + (parts.length ? parts.join(' · ') + ' — ' : '') + list.length + ' / ' + posts.filter(visible).length;
  }
  // ---------- 전체 읽어보기 ----------
  function stageBy(k) { for (var i = 0; i < PATH.length; i++) if (PATH[i].k === k) return PATH[i]; return PATH[0]; }
  function renderPath() {
    var s = stageBy(state.stage);
    $('stages').innerHTML = PATH.map(function (x) {
      return '<button type="button" class="st' + (x.side ? ' side' : '') + '" data-stage="' + esc(x.k) + '" aria-pressed="' + (x.k === s.k) + '"><b>' + esc(x.k) + '</b><span>' + esc(x.name) + '</span></button>';
    }).join('');
    var html = '<header class="st-head"><p class="st-k">' + (s.side ? 'SIDE TRACK ' : 'STAGE ') + esc(s.k) + '</p><h3>' + esc(s.name) + '</h3><p class="st-goal">// ' + esc(s.goal) + '</p></header>';
    if (s.finviz) html += '<div class="fv-inline"><p>이 단계의 스크리너 설정은 Finviz에서 그대로 따라 해 볼 수 있습니다.</p><a class="go-btn fv" href="' + FV + '" target="_blank" rel="sponsored noopener">Finviz 가입하기 ↗</a><span class="disc">추천 링크 (Finviz 홍보대사) · 가입 시 소정의 수수료를 받을 수 있습니다.</span></div>';
    var items = '', n = 0, cta = s.cta;
    function ctaHtml() {
      if (!cta) return '';
      var btn = cta.to ? '<button type="button" class="go-btn sub" data-goto="' + esc(cta.to) + '">' + esc(cta.btn) + '</button>'
        : '<a class="go-btn sub" href="' + esc(cta.href) + '" target="_blank" rel="noopener">' + esc(cta.btn) + '</a>';
      if (cta.kind === 'next') return '<li class="cta cta-next"><div class="cta-in"><p class="cta-t">' + esc(cta.text) + '</p>' + btn + '</div></li>';
      return ctaBox(cta.text, btn, 'cta-' + cta.kind);
    }
    if (s.groups) {
      s.groups.forEach(function (g) {
        items += '<li class="grp-h">' + esc(g[0]) + '</li>';
        g[1].forEach(function (id) { var p = byId[id]; if (p) items += row(p, n, ++n); });
      });
    } else {
      s.ids.forEach(function (id) {
        var p = byId[id]; if (!p) return;
        items += row(p, n, ++n);
        if (cta && cta.after === id) items += ctaHtml();
      });
    }
    if (cta && cta.after === 'end') items += ctaHtml();
    (s.after || []).forEach(function (id, j) {
      var p = byId[id]; if (!p) return;
      if (j === 0) items += '<li class="grp-h">' + (s.k === '3' ? '결과물 — Oscar Mike 공개 샘플 · 구독 결과' : '구독자 전용 리포트') + '</li>';
      items += row(p, n, ++n);
    });
    html += '<ol class="list plist">' + items + '</ol>';
    var idx = PATH.indexOf(s), prev = PATH[idx - 1], next = PATH[idx + 1];
    html += '<nav class="st-nav">' + (prev ? '<button type="button" class="fb" data-stage="' + esc(prev.k) + '">← ' + esc(prev.k + ' ' + prev.name) + '</button>' : '<span></span>') +
      (next ? '<button type="button" class="fb" data-stage="' + esc(next.k) + '">' + esc(next.k + ' ' + next.name) + ' →</button>' : '') + '</nav>';
    $('stageBody').innerHTML = html;
  }
  function renderView() {
    var p = state.view === 'path';
    $('index').hidden = p; $('path').hidden = !p; $('startBox').hidden = p; $('about').hidden = p; $('hud').hidden = p;
    document.querySelectorAll('[data-view]').forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('data-view') === state.view ? 'page' : 'false'); });
    if (p) renderPath(); else { renderFilters(); renderList(); }
  }
  function render() { renderView(); }
  function readHash() {
    var h = location.hash.replace(/^#/, ''), kv = {};
    h.split('&').forEach(function (x) { var a = x.split('='); if (a[0]) kv[a[0]] = decodeURIComponent(a[1] || ''); });
    if (kv.path != null || h === 'path') { state.view = 'path'; if (kv.path) state.stage = kv.path; }
    else if (h === 'about' || h === 'index') { state.view = 'index'; }
    else { state.view = 'index'; if (kv.cat && CAT_LABEL[kv.cat]) { state.cat = kv.cat; state.sub = null; } if (kv.free) state.free = kv.free === '1'; if (kv.xa) state.xa = kv.xa === '1'; }
  }
  function goStage(k) { state.view = 'path'; state.stage = k; history.replaceState(null, '', '#path=' + k); render(); window.scrollTo(0, $('path').offsetTop - 50); }
  function bind() {
    $('cats').addEventListener('click', function (e) { var x = e.target.closest('[data-cat]'); if (x) { state.cat = x.getAttribute('data-cat'); state.sub = null; render(); } });
    $('subs').addEventListener('click', function (e) { var x = e.target.closest('[data-sub]'); if (x) { state.sub = x.getAttribute('data-sub') || null; render(); } });
    $('freeBtn').addEventListener('click', function () { state.free = !state.free; render(); });
    $('xaBtn').addEventListener('click', function () { state.xa = !state.xa; render(); });
    $('chips').addEventListener('click', function (e) { var x = e.target.closest('[data-ticker]'); if (!x) return; var t = x.getAttribute('data-ticker'); state.ticker = state.ticker === t ? null : t; render(); });
    $('moreTickers').addEventListener('click', function () {
      var w = $('tickerWrap'), open = !w.classList.contains('open');
      w.classList.toggle('open', open); this.setAttribute('aria-expanded', String(open)); this.textContent = open ? CFG.lessLabel : CFG.moreLabel;
    });
    var tm;
    $('q').addEventListener('input', function (e) { clearTimeout(tm); tm = setTimeout(function () { state.q = e.target.value.trim(); render(); }, 90); });
    $('clearQ').addEventListener('click', function () { $('q').value = ''; state.q = ''; render(); $('q').focus(); });
    $('sortBtn').addEventListener('click', function () { state.sort = state.sort === 'desc' ? 'asc' : 'desc'; render(); });
    $('empty').addEventListener('click', function (e) { if (!e.target.closest('#resetAll')) return; state.cat = 'all'; state.sub = null; state.free = false; state.xa = false; state.q = ''; state.ticker = null; $('q').value = ''; render(); });
    document.addEventListener('click', function (e) {
      var st = e.target.closest('[data-stage]'); if (st) { goStage(st.getAttribute('data-stage')); return; }
      var g = e.target.closest('[data-goto]'); if (g) { goStage(g.getAttribute('data-goto')); return; }
      var v = e.target.closest('[data-view]');
      if (v) { e.preventDefault(); state.view = v.getAttribute('data-view'); history.replaceState(null, '', state.view === 'path' ? '#path=' + state.stage : '#index'); render(); window.scrollTo(0, 0); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === '/' && document.activeElement !== $('q') && state.view === 'index') { e.preventDefault(); $('q').focus(); } });
    window.addEventListener('hashchange', function () { readHash(); render(); });
    $('themeToggle').addEventListener('click', function () {
      var r = document.documentElement;
      var cur = r.getAttribute('data-theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = cur === 'dark' ? 'light' : 'dark';
      r.setAttribute('data-theme', next);
      try { localStorage.setItem(CFG.themeKey, next); } catch (err) {}
    });
  }
  bind();
  Promise.all([
    fetch('posts.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
    fetch('path.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
  ]).then(function (res) {
    var d = res[0], meta = res[1];
    (meta.cats || []).forEach(function (c) { CATS.push({ id: c[0], label: c[1] }); CAT_LABEL[c[0]] = c[1]; });
    CAT_LABEL.start = '시작하기';
    PATH = meta.path || [];
    posts = (Array.isArray(d) ? d : []).filter(function (p) { return p && p.title && p.url && p.date; }).map(function (p, i) { p._i = i; p.tickers = Array.isArray(p.tickers) ? p.tickers.map(function (t) { return String(t).replace(/^\$/, '').toUpperCase(); }) : []; byId[idOf(p)] = p; return p; });
    posts.filter(visible).sort(function (a, c) { return a.date < c.date ? -1 : a.date > c.date ? 1 : a._i - c._i; }).forEach(function (p, i) { p._n = i + 1; });
    $('startChips').innerHTML = PATH.filter(function (x) { return !x.side; }).map(function (x) { return '<button type="button" class="st mini" data-stage="' + esc(x.k) + '"><b>' + esc(x.k) + '</b><span>' + esc(x.name) + '</span></button>'; }).join('<span class="arr" aria-hidden="true">→</span>');
    readHash(); renderStats(); render();
  }).catch(function (err) { var e = $('empty'); e.hidden = false; e.innerHTML = '<p class="big">불러오기 실패</p><p>posts.json/path.json을 웹 서버로 열어 주세요.</p>'; if (window.console) console.warn(err); });
})();
