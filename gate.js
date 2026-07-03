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
})();
