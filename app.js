(function () {
  'use strict';
  var CFG = window.MOCK || {};
  var CATS = [
    { id: 'all', label: '전체' }, { id: 'deepdive', label: 'Deep Dive' },
    { id: 'screening', label: '성장주 스크리닝' }, { id: 'article', label: '아티클' }
  ];
  var ACCESS = [{ id: 'all', label: '전체' }, { id: '구독', label: '구독' }, { id: '공개', label: '공개' }];
  // 새 분류: posts.json에 처음 보는 category를 쓰면 탭이 자동으로 생깁니다.
  // 탭 이름을 바꾸려면 아래 CAT_NAMES에 'id': '표시 이름'을 추가하세요.
  var CAT_NAMES = {};
  var CAT_LABEL = {};
  function syncCats() {
    CATS.forEach(function (c) { CAT_LABEL[c.id] = c.label; });
    posts.forEach(function (p) {
      if (p.category && !CAT_LABEL[p.category]) {
        var label = CAT_NAMES[p.category] || p.category;
        CATS.push({ id: p.category, label: label }); CAT_LABEL[p.category] = label;
      }
    });
  }
  var state = { cat: 'all', access: 'all', q: '', sort: 'desc', ticker: null };
  var posts = [];
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(d) { var p = String(d).split('-'); return p.length === 3 ? p[0] + '.' + p[1] + '.' + p[2] : d; }
  function norm(s) { return String(s || '').toLowerCase().replace(/\$/g, '').replace(/\s+/g, ''); }
  function pad(n) { return ('00' + n).slice(-3); }
  function pass(p, skip) {
    skip = skip || {};
    if (!skip.cat && state.cat !== 'all' && p.category !== state.cat) return false;
    if (!skip.access && state.access !== 'all' && p.access !== state.access) return false;
    if (!skip.ticker && state.ticker && (p.tickers || []).indexOf(state.ticker) === -1) return false;
    if (state.q) {
      var hay = norm(p.title + ' ' + (p.tickers || []).join(' ') + ' ' + (p.summary || '') + ' ' + (CAT_LABEL[p.category] || ''));
      var t = state.q.toLowerCase().replace(/\$/g, '').split(/\s+/).filter(Boolean);
      for (var i = 0; i < t.length; i++) if (hay.indexOf(t[i]) === -1) return false;
    }
    return true;
  }
  function b(attr, val, label, on, n) {
    return '<button type="button" class="fb" ' + attr + '="' + esc(val) + '" aria-pressed="' + on + '"><span class="fl">' + esc(label) + '</span>' + (n != null ? '<span class="fn">' + n + '</span>' : '') + '</button>';
  }
  function tickerCounts(filtered) {
    var c = {}; posts.forEach(function (p) { if (filtered && !pass(p, { ticker: true })) return; (p.tickers || []).forEach(function (t) { c[t] = (c[t] || 0) + 1; }); }); return c;
  }
  function renderStats() {
    var latest = posts.reduce(function (m, p) { return p.date > m ? p.date : m; }, '');
    var html = '<div><dt>' + (CFG.statLabels ? CFG.statLabels[0] : '글') + '</dt><dd>' + posts.length + '</dd></div>' +
      '<div><dt>' + (CFG.statLabels ? CFG.statLabels[1] : '종목') + '</dt><dd>' + Object.keys(tickerCounts(false)).length + '</dd></div>' +
      '<div><dt>' + (CFG.statLabels ? CFG.statLabels[2] : '업데이트') + '</dt><dd>' + (latest ? fmt(latest).slice(2) : '-') + '</dd></div>';
    if ($('stats')) $('stats').innerHTML = html;
    if ($('tape')) {
      var c = tickerCounts(false), ks = Object.keys(c).sort();
      var item = ks.map(function (t) { return '<span class="tape-i"><b>$' + esc(t) + '</b> ' + c[t] + '</span>'; }).join('');
      $('tape').innerHTML = '<div class="tape-track" aria-hidden="true">' + item + item + '</div>';
    }
  }
  function renderFilters() {
    $('cats').innerHTML = CATS.map(function (c) {
      var n = posts.filter(function (p) { return (c.id === 'all' || p.category === c.id) && pass(p, { cat: true }); }).length;
      return b('data-cat', c.id, c.label, state.cat === c.id, n);
    }).join('');
    $('access').innerHTML = ACCESS.map(function (a) {
      var n = posts.filter(function (p) { return (a.id === 'all' || p.access === a.id) && pass(p, { access: true }); }).length;
      return b('data-access', a.id, a.label, state.access === a.id, n);
    }).join('');
    var c = tickerCounts(true), ks = Object.keys(c).sort();
    if (state.ticker && ks.indexOf(state.ticker) === -1) ks.unshift(state.ticker);
    $('chips').innerHTML = ks.length ? ks.map(function (t) { return b('data-ticker', t, '$' + t, state.ticker === t, c[t] || 0); }).join('') : '<span class="none">해당 티커 없음</span>';
    $('sortBtn').textContent = state.sort === 'desc' ? (CFG.sortDesc || '최신순 ↓') : (CFG.sortAsc || '오래된순 ↑');
    $('clearQ').hidden = !state.q;
  }
  function row(p, i) {
    var tks = (p.tickers || []).map(function (t) { return '<span class="tk">$' + esc(t) + '</span>'; }).join('');
    var acc = '<span class="acc acc-' + (p.access === '구독' ? 'sub' : 'pub') + '">' + esc(p.access || '') + '</span>';
    return '<li class="row cat-' + esc(p.category) + '" style="--i:' + (i % 12) + '">' +
      '<a class="hit" href="' + esc(p.url) + '" target="_blank" rel="noopener">' +
      '<span class="no">' + pad(p._n) + '</span>' +
      '<time class="date" datetime="' + esc(p.date) + '">' + esc(fmt(p.date)) + '</time>' +
      '<span class="cat">' + esc(CAT_LABEL[p.category] || p.category) + '</span>' + acc +
      '<span class="ttl">' + esc(p.title) + '</span>' +
      (p.summary ? '<span class="sum">' + esc(p.summary) + '</span>' : '<span class="sum sum-empty"></span>') +
      '<span class="tks">' + tks + '</span>' +
      '<span class="go">' + (CFG.goLabel || 'X에서 보기 ↗') + '</span>' +
      '</a></li>';
  }
  function renderList() {
    var list = posts.filter(function (p) { return pass(p); });
    list.sort(function (a, c) { var r = a.date < c.date ? -1 : a.date > c.date ? 1 : a._i - c._i; return state.sort === 'asc' ? r : -r; });
    var html = '', month = '';
    list.forEach(function (p, i) {
      var m = p.date.slice(0, 7);
      if (CFG.months && m !== month) { month = m; html += '<li class="month" aria-hidden="true">' + m.replace('-', '.') + '</li>'; }
      html += row(p, i);
    });
    $('list').innerHTML = html;
    var e = $('empty');
    if (list.length) e.hidden = true;
    else { e.hidden = false; e.innerHTML = '<p class="big">' + (CFG.emptyBig || '결과 없음') + '</p><p>조건에 맞는 글이 없습니다.</p><button type="button" class="fb" id="resetAll"><span class="fl">필터 초기화</span></button>'; }
    var parts = [];
    if (state.cat !== 'all') parts.push(CAT_LABEL[state.cat]);
    if (state.access !== 'all') parts.push(state.access);
    if (state.ticker) parts.push('$' + state.ticker);
    if (state.q) parts.push('“' + state.q + '”');
    $('count').textContent = (CFG.countPrefix || '') + (parts.length ? parts.join(' · ') + ' — ' : '') + list.length + ' / ' + posts.length;
  }
  function render() { renderFilters(); renderList(); }
  function bind() {
    $('cats').addEventListener('click', function (e) { var x = e.target.closest('[data-cat]'); if (x) { state.cat = x.getAttribute('data-cat'); render(); } });
    $('access').addEventListener('click', function (e) { var x = e.target.closest('[data-access]'); if (x) { state.access = x.getAttribute('data-access'); render(); } });
    $('chips').addEventListener('click', function (e) { var x = e.target.closest('[data-ticker]'); if (!x) return; var t = x.getAttribute('data-ticker'); state.ticker = state.ticker === t ? null : t; render(); });
    var more = $('moreTickers');
    if (more) more.addEventListener('click', function () {
      var w = $('tickerWrap'), open = !w.classList.contains('open');
      w.classList.toggle('open', open); more.setAttribute('aria-expanded', String(open));
      more.textContent = open ? (CFG.lessLabel || '티커 접기') : (CFG.moreLabel || '티커 전체 보기');
    });
    var tm;
    $('q').addEventListener('input', function (e) { clearTimeout(tm); tm = setTimeout(function () { state.q = e.target.value.trim(); render(); }, 90); });
    $('clearQ').addEventListener('click', function () { $('q').value = ''; state.q = ''; render(); $('q').focus(); });
    $('sortBtn').addEventListener('click', function () { state.sort = state.sort === 'desc' ? 'asc' : 'desc'; render(); });
    $('empty').addEventListener('click', function (e) { if (!e.target.closest('#resetAll')) return; state = { cat: 'all', access: 'all', q: '', sort: state.sort, ticker: null }; $('q').value = ''; render(); });
    document.addEventListener('keydown', function (e) { if (e.key === '/' && document.activeElement !== $('q')) { e.preventDefault(); $('q').focus(); } });
    $('themeToggle').addEventListener('click', function () {
      var r = document.documentElement;
      var cur = r.getAttribute('data-theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = cur === 'dark' ? 'light' : 'dark';
      r.setAttribute('data-theme', next);
      try { localStorage.setItem(CFG.themeKey || 'theme', next); } catch (err) {}
    });
  }
  bind();
  fetch('posts.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
    posts = (Array.isArray(d) ? d : []).filter(function (p) { return p && p.title && p.url && p.date; }).map(function (p, i) { p._i = i; p.tickers = Array.isArray(p.tickers) ? p.tickers.map(function (t) { return String(t).replace(/^\$/, '').toUpperCase(); }) : []; return p; });
    syncCats();
    posts.slice().sort(function (a, c) { return a.date < c.date ? -1 : a.date > c.date ? 1 : a._i - c._i; }).forEach(function (p, i) { p._n = i + 1; });
    renderStats(); render();
  }).catch(function () { var e = $('empty'); e.hidden = false; e.innerHTML = '<p class="big">불러오기 실패</p><p>posts.json을 웹 서버로 열어 주세요.</p>'; });
})();
