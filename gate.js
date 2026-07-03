/* FKTI cross-app gate — reuse the Travel login (JWT) to gate this sister app.
   No separate login. Works offline once a token is present (fail-open on network error).
   Load it FIRST in <head> so it runs before any content renders. */
(function () {
  var TRAVEL = 'https://travel.fkti.org';
  var LS = 'fkti_auth';
  function setCookie(t) {
    try { document.cookie = 'fkti_auth=' + encodeURIComponent(t) + '; domain=.fkti.org; path=/; max-age=2592000; secure; samesite=Lax'; } catch (e) {}
  }
  function clearAll() {
    try { localStorage.removeItem(LS); } catch (e) {}
    try { document.cookie = 'fkti_auth=; domain=.fkti.org; path=/; max-age=0'; } catch (e) {}
  }
  function cookieTok() {
    var m = document.cookie.match(/(?:^|;\s*)fkti_auth=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function toLogin() { location.replace(TRAVEL + '/?next=' + encodeURIComponent(location.href)); }

  // 1) Hand-off from the Travel hub: ?fkti=<jwt>  → store, then strip from the URL.
  try {
    var u = new URL(location.href);
    var handed = u.searchParams.get('fkti');
    if (handed) {
      try { localStorage.setItem(LS, handed); } catch (e) {}
      setCookie(handed);
      u.searchParams.delete('fkti');
      history.replaceState(null, '', u.pathname + (u.searchParams.toString() ? '?' + u.searchParams.toString() : '') + u.hash);
    }
  } catch (e) {}

  // 2) Find a token (this origin's localStorage, else the shared .fkti.org cookie).
  var tok = null;
  try { tok = localStorage.getItem(LS); } catch (e) {}
  if (!tok) { tok = cookieTok(); if (tok) { try { localStorage.setItem(LS, tok); } catch (e) {} } }

  // 3) No token → go log in on Travel.
  if (!tok) { toLogin(); return; }

  // Keep the cross-app cookie fresh so the other sister app is reachable directly too.
  setCookie(tok);

  // 4) Background verify when online; FAIL OPEN on network/CORS error (spotty trip wifi).
  if (navigator.onLine) {
    try {
      fetch(TRAVEL + '/api/me', { headers: { 'Authorization': 'Bearer ' + tok } })
        .then(function (r) { if (r.status === 401 || r.status === 403) { clearAll(); toLogin(); } })
        .catch(function () { /* offline / network — allow */ });
    } catch (e) {}
  }

  // ---- app switcher: hop between Travel / Dining / Learning (shared token) ----
  function injectSwitcher() {
    if (document.getElementById('fkti-appsw')) return;
    var host = location.hostname;
    var cur = host.indexOf('dining') >= 0 ? 'dining' : (host.indexOf('learning') >= 0 ? 'learning' : 'travel');
    var q = tok ? '/?fkti=' + encodeURIComponent(tok) : '/';
    // Travel owns its own login/token, so it just needs the bare URL.
    var APPS = [
      { id: 'travel',   jp: '旅行', en: 'Travel',   url: TRAVEL + '/' },
      { id: 'dining',   jp: '食事', en: 'Dining',   url: 'https://dining.fkti.org' + q },
      { id: 'learning', jp: '学び', en: 'Learning', url: 'https://learning.fkti.org' + q }
    ];
    var css = '#fkti-appsw{position:fixed;left:calc(env(safe-area-inset-left,0px) + 10px);bottom:calc(env(safe-area-inset-bottom,0px) + 10px);z-index:2147483000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}'
      + '#fkti-appsw-btn{display:flex;align-items:center;gap:6px;background:#E2553B;color:#fff;border:none;border-radius:999px;padding:9px 14px;font-size:13px;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,.35);cursor:pointer}'
      + '#fkti-appsw-menu{position:absolute;left:0;bottom:46px;background:#13182B;border:1px solid #313a5e;border-radius:14px;padding:6px;min-width:186px;box-shadow:0 10px 30px rgba(0,0,0,.5);display:none}'
      + '#fkti-appsw.open #fkti-appsw-menu{display:block}'
      + '#fkti-appsw-menu a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;text-decoration:none;color:#EDEFF8;font-size:14px}'
      + '#fkti-appsw-menu a:hover{background:#1E2540}'
      + '#fkti-appsw-menu a .jp{font-size:18px;width:26px;text-align:center;color:#E2553B;font-weight:600}'
      + '#fkti-appsw-menu a.cur{color:#9AA0B6;pointer-events:none}#fkti-appsw-menu a.cur .jp{color:#9AA0B6}'
      + '#fkti-appsw-menu a.cur .here{margin-left:auto;font-size:10px;color:#9AA0B6}';
    var rows = APPS.map(function (a) {
      var isCur = a.id === cur;
      return '<a class="' + (isCur ? 'cur' : '') + '"' + (isCur ? '' : ' href="' + a.url + '"') + '>'
        + '<span class="jp">' + a.jp + '</span><span>' + a.en + '</span>'
        + (isCur ? '<span class="here">you’re here</span>' : '') + '</a>';
    }).join('');
    var wrap = document.createElement('div');
    wrap.id = 'fkti-appsw';
    wrap.innerHTML = '<style>' + css + '</style>'
      + '<button id="fkti-appsw-btn" aria-label="Switch app">☰ Apps</button>'
      + '<div id="fkti-appsw-menu">' + rows + '</div>';
    document.body.appendChild(wrap);
    var btn = document.getElementById('fkti-appsw-btn');
    btn.addEventListener('click', function (e) { e.stopPropagation(); wrap.classList.toggle('open'); });
    document.addEventListener('click', function () { wrap.classList.remove('open'); });
  }
  if (document.body) injectSwitcher();
  else document.addEventListener('DOMContentLoaded', injectSwitcher);
})();
