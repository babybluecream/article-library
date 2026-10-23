(function () {
  'use strict';
  var CFG = window.MOCK || {};
  var XURL = 'https://x.com/babybluecream';
  var SUBURL = 'https://x.com/babybluecream/creator-subscriptions/subscribe';
  var FV = 'https://finviz.com/?affilId=324420513';
  var CATS = [{ id: 'all', label: '전체' }], CAT_LABEL = { all: '전체' }, PATH = [], PICK = {};
  var HIDDEN = { start: 1 }; // 시작하기(구독 안내)는 읽기 순서 0단계에서만 보임
  var posts = [], byId = {};
  var DEF = { view: 'index', stage: '0', cat: 'all', sub: null, free: false, xa: false, lock: false, q: '', sort: 'desc', ticker: null };
  var PAGE = 60; // 첫 렌더 행 수 (더보기로 +60)
  var state = Object.assign({ limit: PAGE }, DEF);
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(d) { var p = String(d).split('-'); return p.length === 3 ? p[0] + '.' + p[1] + '.' + p[2] : d; }
  function norm(s) { return String(s || '').toLowerCase().replace(/\$/g, '').replace(/\s+/g, ''); }
  function pad(n) { return ('00' + n).slice(-3); }
  function idOf(p) { return String(p.url).split('/').pop(); }
  function isFree(p) { return p.access !== 'locked'; }
  // 탭 합치기 (14→10): 부동산→재테크·부동산, 경제 상식·번역→투자론. 글 데이터의 category는 그대로 두고 화면에서만 묶음
  var MERGE = { realestate: 'money', econ: 'principle', translation: 'principle' };
  var TAB_LABEL = { money: '재테크·부동산', principle: '투자론' };
  var SUB_AS_CAT = { econ: 1, translation: 1 }; // 작은 탭은 합친 탭 안에서 서브 하나로 보임
  function tabOf(p) { return MERGE[p.category] || p.category; }
  function subOf(p) { return SUB_AS_CAT[p.category] ? CAT_LABEL[p.category] : p.sub; }
  function isArt(p) { return !!(p.article || p.xarticle); }
  function inCat(p, id) { return id === 'all' || (id === 'pick' ? idOf(p) in PICK : tabOf(p) === id); }
  function visible(p) { return !HIDDEN[p.category]; }
  // 티커 → 한글 이름 별칭 (검색용, 사용 빈도 상위 티커 중 널리 쓰이는 이름만)
  var ALIAS = {
    NVDA: '엔비디아', TSLA: '테슬라', SPCX: '스페이스X 스페이스엑스', MU: '마이크론', META: '메타 페이스북', TSM: 'TSMC 대만반도체',
    SNDK: '샌디스크', AAPL: '애플', AMZN: '아마존', AVGO: '브로드컴', GOOGL: '구글 알파벳', GOOG: '구글 알파벳', SPY: 'S&P500 에스앤피',
    SPX: 'S&P500 에스앤피', SKHY: 'SK하이닉스 하이닉스', CRWV: '코어위브', ALAB: '아스테라랩스', INTC: '인텔', NFLX: '넷플릭스',
    QQQ: '나스닥100', COMP: '나스닥', DIA: '다우존스', DJI: '다우존스', MSFT: '마이크로소프트', BE: '블룸에너지',
    MSTR: '스트래티지 마이크로스트래티지', NBIS: '네비우스', ORCL: '오라클', LLY: '일라이릴리', LRCX: '램리서치', BTC: '비트코인',
    DELL: '델', JPM: 'JP모건 제이피모건', C: '씨티그룹', LITE: '루멘텀', STX: '씨게이트', WDC: '웨스턴디지털', MRVL: '마벨',
    QCOM: '퀄컴', IWM: '러셀2000', CRM: '세일즈포스', GS: '골드만삭스', WFC: '웰스파고', RTX: '레이시온', LMT: '록히드마틴',
    BA: '보잉', BAC: '뱅크오브아메리카', MS: '모건스탠리', ASML: 'ASML', ANET: '아리스타', UNH: '유나이티드헬스', T: 'AT&T',
    BROS: '더치브로스', ASTS: 'AST스페이스모바일', AVAV: '에어로바이론먼트', AMD: 'AMD'
  };
  function hayOf(p) {
    return norm(p.title + ' ' + (p.tickers || []).join(' ') + ' ' + (p.tickers || []).map(function (t) { return ALIAS[t] || ''; }).join(' ') + ' ' + (p.summary || '') + ' ' + (CAT_LABEL[p.category] || '') + ' ' + (p.sub || '') + ' ' + (p.source === '번역' ? '번역' : '') + ' ' + (p.label || '') + (p.xarticle || p.article ? ' 아티클 article' : ''));
  }
  function pass(p, skip) {
    skip = skip || {};
    if (!visible(p)) return false;
    if (!skip.cat && !inCat(p, state.cat)) return false;
    if (!skip.sub && state.sub && subOf(p) !== state.sub) return false;
    if (!skip.free && state.free && !isFree(p)) return false;
    if (!skip.xa && state.xa && !isArt(p)) return false;
    if (!skip.lock && state.lock && p.access !== 'locked') return false;
    if (!skip.ticker && state.ticker && (p.tickers || []).indexOf(state.ticker) === -1) return false;
    if (state.q) {
      var hay = p._hay || (p._hay = hayOf(p));
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
    if (state.cat !== 'all') [0, 1].forEach(function (pass2) { posts.forEach(function (p) { var s = subOf(p); if (tabOf(p) === state.cat && !!MERGE[p.category] === !!pass2 && s && subs.indexOf(s) === -1) subs.push(s); }); }); // 원래 탭 서브 먼저, 합친 탭 서브는 뒤에
    $('subWrap').hidden = subs.length < 2;
    $('subs').innerHTML = subs.length < 2 ? '' : [b('data-sub', '', '전체', !state.sub)].concat(subs.map(function (s) {
      var n = posts.filter(function (p) { return subOf(p) === s && pass(p, { sub: true }); }).length;
      return b('data-sub', s, s, state.sub === s, n);
    })).join('');
    var nFree = posts.filter(function (p) { return isFree(p) && pass(p, { free: true }); }).length;
    $('freeBtn').setAttribute('aria-pressed', String(state.free));
    $('freeBtn').innerHTML = '<span class="fl">FREE만 보기</span><span class="fn">' + nFree + '</span>';
    var nXa = posts.filter(function (p) { return isArt(p) && pass(p, { xa: true }); }).length;
    $('xaBtn').setAttribute('aria-pressed', String(state.xa));
    var nLk = posts.filter(function (p) { return p.access === 'locked' && pass(p, { lock: true }); }).length;
    $('lockBtn').setAttribute('aria-pressed', String(state.lock));
    $('lockBtn').innerHTML = '<span class="fl">🔒 구독자 전용</span><span class="fn">' + nLk + '</span>';
    $('xaBtn').innerHTML = '<span class="fl">아티클만</span><span class="fn">' + nXa + '</span>';
    var c = tickerCounts(true), ks = Object.keys(c).sort(function (a, z) { return (c[z] - c[a]) || (a < z ? -1 : a > z ? 1 : 0); }); // 많이 쓰인 티커 먼저
    if (state.ticker && ks.indexOf(state.ticker) === -1) ks.unshift(state.ticker);
    var open = $('tickerWrap').classList.contains('open');
    if (!open && ks.length > 40) { var sel = state.ticker; ks = ks.slice(0, 40); if (sel && ks.indexOf(sel) === -1) ks.unshift(sel); } // 접힌 상태에선 보이는 만큼만 그림
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
        '<a class="hit" href="' + esc(p.url) + '" target="_blank" rel="noopener" aria-label="' + esc(p.title) + ' — 구독자 전용 · X에서 보기">' + lead +
        '<time class="date" datetime="' + esc(p.date) + '">' + esc(fmt(p.date)) + '</time>' +
        '<span class="cat">' + esc(CAT_LABEL[p.category] || p.category) + '</span>' + accTag(p) +
        '<span class="ttl"><span class="lk" aria-hidden="true">🔒</span> ' + esc(p.title) + extraTags(p) + '</span>' +
        '<span class="sum sum-lock" aria-hidden="true">████████ ██████ ████ ███████ ██████</span>' +
        '<span class="tks">' + tks(p) + '</span>' +
        '<span class="go go-lock">구독자 전용 · X에서 보기 ↗</span></a></li>';
    }
    return '<li class="row cat-' + esc(p.category) + (p.source === '번역' ? ' is-tr' : '') + '" style="--i:' + (i % 12) + '">' +
      '<a class="hit" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + lead +
      '<time class="date" datetime="' + esc(p.date) + '">' + esc(fmt(p.date)) + '</time>' +
      '<span class="cat">' + esc(CAT_LABEL[p.category] || p.category) + (p.sub ? '<i>' + esc(p.sub) + '</i>' : '') + '</span>' + accTag(p) +
      '<span class="ttl">' + srcTag(p) + ' ' + esc(p.title) + extraTags(p) + '</span>' +
      (state.cat === 'pick' && PICK[idOf(p)] ? '<span class="sum why"><b>추천 이유</b> ' + esc(PICK[idOf(p)].why) + '</span>' : p.label && !p.summary ? '<span class="sum sum-note">원문 출처 저작권 보호를 위해 요약을 싣지 않습니다. X에서 확인하세요.</span>' : p.summary ? '<span class="sum">' + (p.partial ? '<em class="part">원문 일부</em> ' : '') + esc(p.summary) + '</span>' : '<span class="sum sum-empty"></span>') +
      '<span class="tks">' + tks(p) + '</span>' +
      '<span class="go">' + CFG.goLabel + '</span></a></li>';
  }
  function ctaBox(text, btnHtml, cls) {
    return '<li class="cta ' + (cls || '') + '"><div class="cta-in"><p class="cta-t">' + esc(text) + '</p>' + btnHtml +
      '<p class="cta-n">리딩 없음 · 정보 제공 목적. 특정 종목 매매 추천을 하지 않습니다. 구독 안내는 X 프로필에서 확인하세요.</p></div></li>';
  }
  function subBtn(label) { return '<a class="go-btn sub sub-main" href="' + SUBURL + '" target="_blank" rel="noopener">' + esc(label) + '</a>'; }
  function xBtn(label) { return '<a class="go-btn sub" href="' + XURL + '" target="_blank" rel="noopener">' + esc(label) + '</a>'; }
  function renderList() {
    var list = posts.filter(function (p) { return pass(p); });
    list.sort(function (a, c) { var r = a.date < c.date ? -1 : a.date > c.date ? 1 : a._i - c._i; return state.sort === 'asc' ? r : -r; });
    if (state.cat === 'pick') list.sort(function (a, c) { return PICK[idOf(a)].o - PICK[idOf(c)].o; });
    var html = '', ctaDone = false, total = list.length;
    list = list.slice(0, state.limit);
    list.forEach(function (p, i) {
      if (!ctaDone && p.access === 'locked') {
        ctaDone = true;
        html += ctaBox('아래 🔒 글은 구독자 전용입니다. 방법은 공개 글로, 매주 실제 결과 티커는 구독자에게 공유합니다 🐧', '<div class="cta-btns">' + subBtn('[ 구독하기 → ]') + xBtn('X에서 구독 확인 ↗') + '</div>', 'cta-list');
      }
      html += row(p, i);
    });
    $('list').innerHTML = html;
    var mw = $('moreWrap'), left = total - list.length;
    mw.hidden = left <= 0;
    mw.innerHTML = left > 0 ? '<button type="button" class="fb more-btn" id="moreBtn"><span class="fl">[ 더보기 +' + Math.min(PAGE, left) + ' ]</span><span class="fn">남은 ' + left + '편</span></button>' : '';
    var e = $('empty');
    if (total) e.hidden = true;
    else { e.hidden = false; e.innerHTML = '<p class="big">' + CFG.emptyBig + '</p><p>조건에 맞는 글이 없습니다.</p><button type="button" class="fb" id="resetAll"><span class="fl">필터 초기화</span></button>'; }
    var parts = [];
    if (state.cat !== 'all') parts.push(TAB_LABEL[state.cat] || CAT_LABEL[state.cat]);
    if (state.sub) parts.push(state.sub);
    if (state.free) parts.push('FREE');
    if (state.xa) parts.push('아티클');
    if (state.lock) parts.push('구독자 전용');
    if (state.ticker) parts.push('$' + state.ticker);
    if (state.q) parts.push('“' + state.q + '”');
    $('count').textContent = CFG.countPrefix + (parts.length ? parts.join(' · ') + ' — ' : '') + total + ' / ' + posts.filter(visible).length;
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
    $('lst').hidden = p; $('path').hidden = !p; $('startBox').hidden = p; $('about').hidden = p; $('hud').hidden = p;
    document.querySelectorAll('[data-view]').forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('data-view') === state.view ? 'page' : 'false'); });
    if (p) renderPath(); else { renderFilters(); renderList(); }
  }
  function render() { renderView(); }
  function readHash() {
    var h = location.hash.replace(/^#/, ''), kv = {};
    h.split('&').forEach(function (x) { var a = x.split('='); if (a[0]) kv[a[0]] = decodeURIComponent(a[1] || ''); });
    if (h === 'about' || h === 'lst') { state.view = 'index'; return; } // 구독 안내·목록 건너뛰기: 보던 탭 유지
    var keepStage = state.stage;
    Object.keys(DEF).forEach(function (k) { state[k] = DEF[k]; }); state.stage = keepStage; state.limit = PAGE;
    if (kv.path != null || h === 'path') { state.view = 'path'; if (kv.path) state.stage = kv.path; return; }
    if (kv.cat && CAT_LABEL[kv.cat]) state.cat = MERGE[kv.cat] || kv.cat;
    if (state.cat === 'article') state.cat = 'all'; // 예전 아티클 탭 링크 → ACCESS 아티클 필터
    if (kv.sub) state.sub = kv.sub;
    state.free = kv.free === '1'; state.xa = kv.xa === '1' || kv.cat === 'article'; state.lock = kv.lock === '1';
    if (kv.t) state.ticker = kv.t.toUpperCase();
    if (kv.q) state.q = kv.q;
    if (kv.sort === 'asc') state.sort = 'asc';
    if ($('q')) $('q').value = state.q;
  }
  // 현재 상태 → URL. 탭·보기·단계 이동은 push(뒤로가기 한 단계), 필터·검색 입력은 replace(공유용으로만 기록)
  function hashOf() {
    if (state.view === 'path') return '#path=' + state.stage;
    var a = [];
    if (state.cat !== 'all') a.push('cat=' + state.cat);
    if (state.sub) a.push('sub=' + encodeURIComponent(state.sub));
    if (state.free) a.push('free=1'); if (state.xa) a.push('xa=1'); if (state.lock) a.push('lock=1');
    if (state.ticker) a.push('t=' + state.ticker);
    if (state.q) a.push('q=' + encodeURIComponent(state.q));
    if (state.sort === 'asc') a.push('sort=asc');
    return a.length ? '#' + a.join('&') : location.pathname + location.search;
  }
  function saveY(y) { try { history.replaceState({ y: y != null ? y : Math.round(window.scrollY), n: state.limit }, '', location.href); } catch (e) {} }
  function commit(push, y) { var u = hashOf(); if (push) { saveY(y); history.pushState(null, '', u); } else history.replaceState(history.state, '', u); }
  // 고정 영역(상단 바 + TYPE 레일) 높이
  function stickH() { var bar = document.querySelector('.bar'), sticky = getComputedStyle(bar).position === 'sticky'; return sticky ? bar.offsetHeight : 0; }
  function syncStick() { var h = stickH(); document.documentElement.style.setProperty('--stick', h + 'px'); document.documentElement.style.setProperty('--stick-all', (h + ($('rail') ? $('rail').offsetHeight : 0)) + 'px'); }
  // 목록이 바뀔 때: 레일 아래로 내려와 있었다면 목록 첫 줄이 레일 바로 밑에 오게 (맨 위로 튀지 않음)
  function keepListInView() {
    var m = $('railMark'); if (!m || state.view !== 'index') return;
    var natural = Math.round(m.getBoundingClientRect().top + window.scrollY - stickH());
    if (window.scrollY > natural + 1) window.scrollTo(0, natural);
  }
  // 선택된 탭이 가로 스크롤 레일 안에서 보이도록
  function revealTab() {
    var g = $('cats'), on = g && g.querySelector('[aria-pressed=true]'); if (!on) return;
    var l = on.offsetLeft - g.offsetLeft, rr = l + on.offsetWidth;
    if (l < g.scrollLeft + 24 || rr > g.scrollLeft + g.clientWidth - 24) g.scrollLeft = Math.max(0, l - (g.clientWidth - on.offsetWidth) / 2);
  }
  // 재렌더 뒤 포커스 복원 (버튼이 innerHTML로 새로 그려져도 같은 버튼에 포커스 유지)
  function refocus(sel) { if (!sel) return; var el = document.querySelector(sel); if (el) el.focus({ preventScroll: true }); }
  function focusSel() {
    var a = document.activeElement; if (!a || a === document.body) return null;
    var k = ['data-cat', 'data-sub', 'data-ticker', 'data-stage'].filter(function (x) { return a.hasAttribute(x); })[0];
    if (k) return (a.closest('#stages') ? '#stages ' : a.closest('#cats') ? '#cats ' : a.closest('#subs') ? '#subs ' : a.closest('#chips') ? '#chips ' : '') + '[' + k + '="' + String(a.getAttribute(k)).replace(/"/g, '\\"') + '"]';
    return a.id ? '#' + a.id : null;
  }
  // 사용자 조작 → 상태 변경 → URL → 렌더 → 스크롤/포커스 정리
  function act(push, fn) {
    var y = Math.round(window.scrollY), n = state.limit, fs = focusSel(); // 바뀌기 전 화면 위치를 현재 기록에 저장
    fn(); state.limit = PAGE;
    if (push) { history.replaceState({ y: y, n: n }, '', location.href); history.pushState(null, '', hashOf()); } else history.replaceState(history.state, '', hashOf());
    render(); keepListInView(); revealTab(); refocus(fs);
  }
  function goStage(k) {
    var fs = focusSel(), was = state.view; state.view = 'path'; state.stage = k; commit(true); render();
    window.scrollTo(0, was === 'path' ? $('path').offsetTop - stickH() : 0);
    refocus(fs && fs.indexOf('#stages') === 0 ? fs : '#stages [data-stage="' + k + '"]');
  }
  function bind() {
    $('cats').addEventListener('click', function (e) { var x = e.target.closest('[data-cat]'); if (x && x.getAttribute('data-cat') !== state.cat) act(true, function () { state.cat = x.getAttribute('data-cat'); state.sub = null; }); });
    $('subs').addEventListener('click', function (e) { var x = e.target.closest('[data-sub]'); if (x) act(false, function () { state.sub = x.getAttribute('data-sub') || null; }); });
    $('freeBtn').addEventListener('click', function () { act(false, function () { state.free = !state.free; if (state.free) state.lock = false; }); });
    $('xaBtn').addEventListener('click', function () { act(false, function () { state.xa = !state.xa; }); });
    $('lockBtn').addEventListener('click', function () { act(false, function () { state.lock = !state.lock; if (state.lock) state.free = false; }); });
    $('chips').addEventListener('click', function (e) { var x = e.target.closest('[data-ticker]'); if (!x) return; var t = x.getAttribute('data-ticker'); act(false, function () { state.ticker = state.ticker === t ? null : t; }); });
    $('moreWrap').addEventListener('click', function (e) {
      if (!e.target.closest('#moreBtn')) return; var from = state.limit; state.limit += PAGE; renderList(); saveY();
      var rows = $('list').querySelectorAll('.row .hit'); if (rows[from]) rows[from].focus({ preventScroll: true });
    });
    $('moreTickers').addEventListener('click', function () {
      var w = $('tickerWrap'), open = !w.classList.contains('open');
      w.classList.toggle('open', open); this.setAttribute('aria-expanded', String(open)); this.textContent = open ? CFG.lessLabel : CFG.moreLabel; renderFilters();
    });
    var tm;
    $('q').addEventListener('input', function (e) { clearTimeout(tm); tm = setTimeout(function () { act(false, function () { state.q = e.target.value.trim(); }); }, 90); });
    $('clearQ').addEventListener('click', function () { $('q').value = ''; act(false, function () { state.q = ''; }); $('q').focus(); });
    $('sortBtn').addEventListener('click', function () { act(false, function () { state.sort = state.sort === 'desc' ? 'asc' : 'desc'; }); });
    $('empty').addEventListener('click', function (e) { if (!e.target.closest('#resetAll')) return; $('q').value = ''; act(true, function () { state.cat = 'all'; state.sub = null; state.free = false; state.xa = false; state.lock = false; state.q = ''; state.ticker = null; }); refocus('#cats [data-cat="all"]'); });
    document.addEventListener('click', function (e) {
      var st = e.target.closest('[data-stage]'); if (st) { goStage(st.getAttribute('data-stage')); return; }
      var g = e.target.closest('[data-goto]'); if (g) { goStage(g.getAttribute('data-goto')); return; }
      var v = e.target.closest('[data-view]');
      if (v) { e.preventDefault(); var nv = v.getAttribute('data-view'); if (nv === state.view && nv === 'index') { window.scrollTo(0, 0); return; } state.view = nv; commit(true); render(); window.scrollTo(0, 0); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === '/' && document.activeElement !== $('q') && state.view === 'index') { e.preventDefault(); $('q').focus(); } });
    // 뒤로/앞으로: URL에서 상태 복원 + 그 화면에서 보던 스크롤 위치 복원
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.addEventListener('popstate', function (e) {
      if (location.hash === '#lst') return; // 건너뛰기 링크는 브라우저 기본 이동에 맡김
      var st = e.state || {}; readHash(); if (st.n) state.limit = st.n; render(); revealTab();
      if (location.hash === '#about') { var ab = $('about'); window.scrollTo(0, ab.offsetTop - stickH()); return; }
      window.scrollTo(0, st.y || 0);
    });
    window.addEventListener('scroll', function () { clearTimeout(window.__sy); window.__sy = setTimeout(saveY, 150); }, { passive: true });
    window.addEventListener('resize', syncStick);
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
    (meta.cats || []).forEach(function (c) { CAT_LABEL[c[0]] = c[1]; if (!MERGE[c[0]] && c[0] !== 'article') CATS.push({ id: c[0], label: TAB_LABEL[c[0]] || c[1] }); });
    CAT_LABEL.start = '시작하기';
    (meta.picks || []).forEach(function (x, i) { PICK[x.id] = { why: x.why, o: i }; });
    if (meta.picks && meta.picks.length) { CATS.unshift({ id: 'pick', label: '추천 글' }); CAT_LABEL.pick = '추천 글'; }
    PATH = meta.path || [];
    posts = (Array.isArray(d) ? d : []).filter(function (p) { return p && p.title && p.url && p.date; }).map(function (p, i) { p._i = i; p.tickers = Array.isArray(p.tickers) ? p.tickers.map(function (t) { return String(t).replace(/^\$/, '').toUpperCase(); }) : []; byId[idOf(p)] = p; return p; });
    posts.filter(visible).sort(function (a, c) { return a.date < c.date ? -1 : a.date > c.date ? 1 : a._i - c._i; }).forEach(function (p, i) { p._n = i + 1; });
    $('startChips').innerHTML = PATH.filter(function (x) { return !x.side; }).map(function (x) { return '<button type="button" class="st mini" data-stage="' + esc(x.k) + '"><b>' + esc(x.k) + '</b><span>' + esc(x.name) + '</span></button>'; }).join('<span class="arr" aria-hidden="true">→</span>');
    var subN = $('subN'); if (subN) subN.textContent = posts.filter(function (p) { return p.access === 'locked'; }).length;
    readHash(); var st0 = history.state || {}; if (st0.n) state.limit = st0.n; renderStats(); render(); syncStick(); revealTab();
    if (location.hash === '#about') window.scrollTo(0, $('about').offsetTop - stickH()); else if (st0.y) window.scrollTo(0, st0.y);
    document.documentElement.classList.add('ready');
  }).catch(function (err) { var e = $('empty'); e.hidden = false; e.innerHTML = '<p class="big">불러오기 실패</p><p>posts.json/path.json을 웹 서버로 열어 주세요.</p>'; if (window.console) console.warn(err); });
})();
