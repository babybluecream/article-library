(function () {
  'use strict';

  var CATEGORIES = [
    { id: 'all', label: '전체' },
    { id: 'deepdive', label: 'Deep Dive', desc: '개별 기업 심층 분석' },
    { id: 'screening', label: '성장주 스크리닝', desc: '실적 기반 성장주 선별' },
    { id: 'article', label: '아티클', desc: '아티클·업데이트' }
  ];
  var CAT_LABEL = {};
  CATEGORIES.forEach(function (c) { CAT_LABEL[c.id] = c.label; });

  var state = { cat: 'all', q: '', sort: 'desc', ticker: null };
  var posts = [];
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function fmtDate(d) {
    var p = String(d).split('-');
    return p.length === 3 ? p[0] + '.' + p[1] + '.' + p[2] : d;
  }
  function norm(s) { return String(s || '').toLowerCase().replace(/\$/g, '').replace(/\s+/g, ''); }

  function matches(p, ignoreCat) {
    if (!ignoreCat && state.cat !== 'all' && p.category !== state.cat) return false;
    if (state.ticker && (p.tickers || []).indexOf(state.ticker) === -1) return false;
    if (state.q) {
      var hay = norm(p.title + ' ' + (p.tickers || []).join(' ') + ' ' + (p.summary || '') + ' ' + (CAT_LABEL[p.category] || ''));
      var terms = state.q.toLowerCase().replace(/\$/g, '').split(/\s+/).filter(Boolean);
      for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) === -1) return false;
    }
    return true;
  }

  function renderStats() {
    var tickers = {};
    posts.forEach(function (p) { (p.tickers || []).forEach(function (t) { tickers[t] = 1; }); });
    var latest = posts.reduce(function (m, p) { return p.date > m ? p.date : m; }, '');
    $('stats').innerHTML =
      '<div class="stat"><dt>전체 글</dt><dd>' + posts.length + '</dd></div>' +
      '<div class="stat"><dt>다룬 종목</dt><dd>' + Object.keys(tickers).length + '</dd></div>' +
      '<div class="stat"><dt>최근 업데이트</dt><dd>' + (latest ? fmtDate(latest).slice(2) : '-') + '</dd></div>';
  }

  function renderTabs() {
    var html = CATEGORIES.map(function (c) {
      var n = c.id === 'all' ? posts.filter(function (p) { return matches(p, true); }).length
        : posts.filter(function (p) { return p.category === c.id && matches(p, true); }).length;
      var sel = state.cat === c.id;
      return '<button type="button" role="tab" class="tab" data-cat="' + c.id + '" aria-selected="' + sel + '" tabindex="' + (sel ? 0 : -1) + '">' +
        esc(c.label) + '<span class="n">' + n + '</span></button>';
    }).join('');
    $('tabs').innerHTML = html;
  }

  function renderChips() {
    var count = {};
    posts.forEach(function (p) {
      if (state.cat !== 'all' && p.category !== state.cat) return;
      (p.tickers || []).forEach(function (t) { count[t] = (count[t] || 0) + 1; });
    });
    var list = Object.keys(count).sort();
    if (state.ticker && list.indexOf(state.ticker) === -1) list.unshift(state.ticker);
    $('chips').innerHTML = list.map(function (t) {
      return '<button type="button" class="chip" data-ticker="' + esc(t) + '" aria-pressed="' + (state.ticker === t) + '">$' + esc(t) + '</button>';
    }).join('');
  }

  function card(p) {
    var tks = (p.tickers || []).map(function (t) {
      return '<button type="button" class="tk" data-ticker="' + esc(t) + '" aria-label="' + esc(t) + ' 글만 보기">$' + esc(t) + '</button>';
    }).join('');
    return '<article class="card">' +
      '<div class="card-top"><span class="cat cat-' + esc(p.category) + '">' + esc(CAT_LABEL[p.category] || p.category) + '</span>' +
      '<time class="date" datetime="' + esc(p.date) + '">' + esc(fmtDate(p.date)) + '</time></div>' +
      '<h3><a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.title) + '</a></h3>' +
      (p.summary ? '<p class="summary">' + esc(p.summary) + '</p>' : '') +
      '<div class="card-bottom"><div class="tickers">' + tks + (p.badge ? '<span class="badge">' + esc(p.badge) + '</span>' : '') + '</div>' +
      '<span class="go" aria-hidden="true">X에서 보기 ↗</span></div>' +
      '</article>';
  }

  function renderGrid() {
    var list = posts.filter(function (p) { return matches(p, false); });
    list.sort(function (a, b) {
      var c = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      if (c === 0) c = a._i - b._i;
      return state.sort === 'asc' ? c : -c;
    });
    $('grid').innerHTML = list.map(card).join('');
    var empty = $('empty');
    if (list.length) {
      empty.hidden = true;
    } else {
      empty.hidden = false;
      if (state.cat === 'article' && !state.q && !state.ticker) {
        empty.innerHTML = '<strong>아직 등록된 아티클이 없습니다</strong>새 아티클이 등록되면 여기에 표시됩니다.<br>최신 글은 X에서 먼저 확인하세요.' +
          '<br><a class="btn btn-ghost" href="https://x.com/babybluecream" target="_blank" rel="noopener">@babybluecream 보기 ↗</a>';
      } else {
        empty.innerHTML = '<strong>검색 결과가 없습니다</strong>다른 티커나 제목으로 검색해 보세요.' +
          '<br><button type="button" class="btn btn-ghost" id="resetAll">필터 초기화</button>';
      }
    }
    var parts = [];
    if (state.cat !== 'all') parts.push(CAT_LABEL[state.cat]);
    if (state.ticker) parts.push('$' + state.ticker);
    if (state.q) parts.push('“' + state.q + '”');
    $('count').textContent = (parts.length ? parts.join(' · ') + ' — ' : '') + list.length + '개의 글';
  }

  function render() { renderTabs(); renderChips(); renderGrid(); $('clearQ').hidden = !state.q; }

  function bind() {
    $('tabs').addEventListener('click', function (e) {
      var b = e.target.closest('.tab'); if (!b) return;
      state.cat = b.getAttribute('data-cat'); render();
    });
    $('tabs').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var ids = CATEGORIES.map(function (c) { return c.id; });
      var i = ids.indexOf(state.cat) + (e.key === 'ArrowRight' ? 1 : -1);
      state.cat = ids[(i + ids.length) % ids.length]; render();
      var t = $('tabs').querySelector('[aria-selected="true"]'); if (t) t.focus();
    });
    function toggleTicker(t) { state.ticker = state.ticker === t ? null : t; render(); }
    $('chips').addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (b) toggleTicker(b.getAttribute('data-ticker'));
    });
    $('grid').addEventListener('click', function (e) {
      var b = e.target.closest('.tk'); if (!b) return;
      e.preventDefault(); toggleTicker(b.getAttribute('data-ticker'));
    });
    var timer;
    $('q').addEventListener('input', function (e) {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = e.target.value.trim(); render(); }, 80);
    });
    $('clearQ').addEventListener('click', function () { $('q').value = ''; state.q = ''; render(); $('q').focus(); });
    $('sort').addEventListener('change', function (e) { state.sort = e.target.value; renderGrid(); });
    $('empty').addEventListener('click', function (e) {
      if (e.target.id !== 'resetAll') return;
      state = { cat: 'all', q: '', sort: state.sort, ticker: null }; $('q').value = ''; render();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement !== $('q')) { e.preventDefault(); $('q').focus(); }
    });
    $('themeToggle').addEventListener('click', function () {
      var root = document.documentElement;
      var cur = root.getAttribute('data-theme') ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
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
      renderStats(); render();
    })
    .catch(function () {
      $('empty').hidden = false;
      $('empty').innerHTML = '<strong>목록을 불러오지 못했습니다</strong>posts.json 파일을 확인해 주세요. (로컬에서 파일을 직접 열면 브라우저가 막을 수 있습니다. 간단한 웹 서버로 열어 주세요.)';
    });
})();
