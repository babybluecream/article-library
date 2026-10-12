(function () {
  'use strict';

  var CATS = [
    { id: 'all', label: '전체' },
    { id: 'deepdive', label: 'Deep Dive' },
    { id: 'screening', label: '성장주 스크리닝' },
    { id: 'article', label: '아티클' }
  ];
  var ACCESS = [
    { id: 'all', label: '전체 공개범위' },
    { id: '구독', label: '구독' },
    { id: '공개', label: '공개' }
  ];
  var CAT_LABEL = {};
  CATS.forEach(function (c) { CAT_LABEL[c.id] = c.label; });

  var state = { cat: 'all', access: 'all', q: '', sort: 'desc', ticker: null };
  var posts = [];
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function fmtDate(d) { var p = String(d).split('-'); return p.length === 3 ? p[0] + '.' + p[1] + '.' + p[2] : d; }
  function norm(s) { return String(s || '').toLowerCase().replace(/\$/g, '').replace(/\s+/g, ''); }
  function pad(n) { return ('00' + n).slice(-3); }

  function pass(p, skip) {
    skip = skip || {};
    if (!skip.cat && state.cat !== 'all' && p.category !== state.cat) return false;
    if (!skip.access && state.access !== 'all' && p.access !== state.access) return false;
    if (!skip.ticker && state.ticker && (p.tickers || []).indexOf(state.ticker) === -1) return false;
    if (state.q) {
      var hay = norm(p.title + ' ' + (p.tickers || []).join(' ') + ' ' + (p.summary || '') + ' ' + (CAT_LABEL[p.category] || ''));
      var terms = state.q.toLowerCase().replace(/\$/g, '').split(/\s+/).filter(Boolean);
      for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) === -1) return false;
    }
    return true;
  }

  function renderStats() {
    var tk = {};
    posts.forEach(function (p) { (p.tickers || []).forEach(function (t) { tk[t] = 1; }); });
    var latest = posts.reduce(function (m, p) { return p.date > m ? p.date : m; }, '');
    $('stats').innerHTML =
      '<div><dt>Entries</dt><dd>' + posts.length + '</dd></div>' +
      '<div><dt>Tickers</dt><dd>' + Object.keys(tk).length + '</dd></div>' +
      '<div><dt>Updated</dt><dd>' + (latest ? fmtDate(latest).slice(2) : '-') + '</dd></div>';
  }

  function btn(attr, val, label, on, n) {
    return '<button type="button" class="fbtn" ' + attr + '="' + esc(val) + '" aria-pressed="' + on + '">' + esc(label) +
      (n != null ? '<sup>' + n + '</sup>' : '') + '</button>';
  }

  function renderFilters() {
    $('cats').innerHTML = '<span class="label">분류</span>' + CATS.map(function (c) {
      var n = posts.filter(function (p) { return (c.id === 'all' || p.category === c.id) && pass(p, { cat: true }); }).length;
      return btn('data-cat', c.id, c.label, state.cat === c.id, n);
    }).join('');
    $('access').innerHTML = '<span class="label">범위</span>' + ACCESS.map(function (a) {
      var n = posts.filter(function (p) { return (a.id === 'all' || p.access === a.id) && pass(p, { access: true }); }).length;
      return btn('data-access', a.id, a.label, state.access === a.id, n);
    }).join('');
    var count = {};
    posts.forEach(function (p) {
      if (!pass(p, { ticker: true })) return;
      (p.tickers || []).forEach(function (t) { count[t] = (count[t] || 0) + 1; });
    });
    var list = Object.keys(count).sort();
    if (state.ticker && list.indexOf(state.ticker) === -1) list.unshift(state.ticker);
    $('chips').innerHTML = list.length ? list.map(function (t) {
      return btn('data-ticker', t, '$' + t, state.ticker === t, count[t] || 0);
    }).join('') : '<span class="label">해당 티커 없음</span>';
    $('sortBtn').textContent = state.sort === 'desc' ? '최신순 ↓' : '오래된순 ↑';
    $('clearQ').hidden = !state.q;
  }

  function row(p, i) {
    var acc = p.access ? '<span class="acc' + (p.access === '구독' ? ' sub' : '') + '">' + esc(p.access) + '</span>' : '';
    var tks = (p.tickers || []).map(function (t) { return '<span class="tk">$' + esc(t) + '</span>'; }).join(' ');
    return '<li class="row" style="animation-delay:' + Math.min(i, 14) * 35 + 'ms">' +
      '<a class="hit" href="' + esc(p.url) + '" target="_blank" rel="noopener">' +
      '<span class="meta"><span class="no">No.' + pad(p._n) + '</span><time datetime="' + esc(p.date) + '">' + esc(fmtDate(p.date)) + '</time>' +
      '<span>' + esc(CAT_LABEL[p.category] || p.category) + '</span>' + acc + '</span>' +
      '<h3 class="ttl">' + esc(p.title) + '</h3>' +
      (p.summary ? '<p class="sum">' + esc(p.summary) + '</p>' : '') +
      '<span class="foot">' + tks + '<span class="go">X에서 보기 <span class="arr" aria-hidden="true">↗</span></span></span>' +
      '</a></li>';
  }

  function renderList() {
    var list = posts.filter(function (p) { return pass(p); });
    list.sort(function (a, b) {
      var c = a.date < b.date ? -1 : a.date > b.date ? 1 : (a._i - b._i);
      return state.sort === 'asc' ? c : -c;
    });
    var html = '', month = '', idx = 0, mcount = {};
    list.forEach(function (p) { var m = p.date.slice(0, 7); mcount[m] = (mcount[m] || 0) + 1; });
    list.forEach(function (p) {
      var m = p.date.slice(0, 7);
      if (m !== month) {
        month = m;
        html += '<li class="month" aria-hidden="true"><span class="m">' + m.replace('-', '.') + '</span><span class="c">' + mcount[m] + ' entries</span></li>';
      }
      html += row(p, idx++);
    });
    $('list').innerHTML = html;

    var empty = $('empty');
    if (list.length) { empty.hidden = true; }
    else {
      empty.hidden = false;
      empty.innerHTML = '<p class="big">Nothing here.</p><p>조건에 맞는 글이 없습니다.</p><p><button type="button" class="fbtn mono" id="resetAll">필터 초기화</button></p>';
    }
    var parts = [];
    if (state.cat !== 'all') parts.push(CAT_LABEL[state.cat]);
    if (state.access !== 'all') parts.push(state.access);
    if (state.ticker) parts.push('$' + state.ticker);
    if (state.q) parts.push('“' + state.q + '”');
    $('count').textContent = (parts.length ? parts.join(' / ') + ' — ' : '') + list.length + ' / ' + posts.length + ' entries';
  }

  function render() { renderFilters(); renderList(); }

  function bind() {
    $('cats').addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (b) { state.cat = b.getAttribute('data-cat'); render(); } });
    $('access').addEventListener('click', function (e) { var b = e.target.closest('[data-access]'); if (b) { state.access = b.getAttribute('data-access'); render(); } });
    $('chips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-ticker]'); if (!b) return;
      var t = b.getAttribute('data-ticker'); state.ticker = state.ticker === t ? null : t; render();
    });
    $('moreTickers').addEventListener('click', function () {
      var w = $('tickerWrap'), open = !w.classList.contains('open');
      w.classList.toggle('open', open);
      this.setAttribute('aria-expanded', String(open));
      this.textContent = open ? '티커 접기' : '티커 전체 보기';
    });
    var timer;
    $('q').addEventListener('input', function (e) {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = e.target.value.trim(); render(); }, 90);
    });
    $('clearQ').addEventListener('click', function () { $('q').value = ''; state.q = ''; render(); $('q').focus(); });
    $('sortBtn').addEventListener('click', function () { state.sort = state.sort === 'desc' ? 'asc' : 'desc'; render(); });
    $('empty').addEventListener('click', function (e) {
      if (e.target.id !== 'resetAll') return;
      state = { cat: 'all', access: 'all', q: '', sort: state.sort, ticker: null }; $('q').value = ''; render();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement !== $('q')) { e.preventDefault(); $('q').focus(); }
    });
    $('themeToggle').addEventListener('click', function () {
      var root = document.documentElement;
      var cur = root.getAttribute('data-theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (err) {}
    });
  }

  bind();
  fetch('posts.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      posts = (Array.isArray(data) ? data : []).map(function (p, i) { p._i = i; return p; });
      // stable archive numbers: oldest = No.001
      posts.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a._i - b._i; })
        .forEach(function (p, i) { p._n = i + 1; });
      renderStats(); render();
    })
    .catch(function () {
      $('empty').hidden = false;
      $('empty').innerHTML = '<p class="big">Could not load.</p><p>posts.json을 불러오지 못했습니다. 로컬에서는 간단한 웹 서버로 열어 주세요.</p>';
    });
})();
