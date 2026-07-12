// FKTI Learning — service worker for full offline use (trip-ready).
// Precaches the app shell + all stroke-recognition shards; runtime-caches KanjiVG SVGs, city/kanji
// data, and the cross-origin Tesseract.js OCR assets (library + WASM core + Japanese model) so the
// camera identifier works offline after one online use. Bump VERSION to force an update.
const VERSION = 'fkti-learn-v1';
const SHELL = `shell-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;
const OCR = `ocr-${VERSION}`;

const SHELL_ASSETS = [
  './', './index.html', './kanji.html', './kana.html', './words.html',
  './sumo.html', './selfintro.html', './book-of-tea.html', './mnem-gallery.html',
  './gate.js',
  './data/kanji_joyo.json',
  './recog/manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/favicon.png', './icons/apple-touch-icon.png'
];

// Tesseract.js pulls its library, WASM core, and traineddata from these CDNs — runtime-cache them
// so camera OCR keeps working offline once it has run once with a connection.
const OCR_HOSTS = /(^|\.)jsdelivr\.net$|(^|\.)projectnaptha\.com$|(^|\.)unpkg\.com$/;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    // Tolerant precache: add each asset individually so one failed fetch can't wedge the install.
    await Promise.allSettled(SHELL_ASSETS.map(a => c.add(a)));
    // Precache every stroke-count shard (small; makes offline draw-recognition work immediately).
    try {
      const m = await fetch('./recog/manifest.json').then(r => r.json());
      await Promise.allSettled(Object.keys(m.counts || {}).map(n => c.add('./recog/' + n + '.json')));
    } catch (_) { /* offline at install — shards cache on first online use */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keep = [SHELL, RUNTIME, OCR];
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Cross-origin: only intercept the Tesseract OCR assets (cache-first, runtime-cached). Everything
  // else cross-origin (auth on travel.fkti.org, translation/sumo APIs) goes straight to the network.
  if (url.origin !== location.origin) {
    if (OCR_HOSTS.test(url.hostname)) {
      e.respondWith(caches.open(OCR).then(async c => {
        const hit = await c.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req); // may be opaque (no-cors) — still cacheable/servable
          if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
          return res;
        } catch (_) { return hit || Response.error(); }
      }));
    }
    return;
  }

  // Page navigations: network-first (fresh shell), fall back to cache → kanji.html → a minimal page.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        if (net && net.status === 200) { const copy = net.clone(); caches.open(SHELL).then(c => c.put(req, copy)); }
        if (net) return net;
      } catch (_) { /* offline — fall through */ }
      return (await caches.match(req)) || (await caches.match('./kanji.html')) || (await caches.match('./'))
        || new Response('<!doctype html><meta charset=utf-8><body style="font:16px system-ui;padding:24px">Offline — reconnect and reload.</body>', { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    })());
    return;
  }

  // Never cache auth.
  if (url.pathname.startsWith('/api/')) return;

  // Data files: stale-while-revalidate (fast offline, refreshes in the background when online).
  if (url.pathname.includes('/data/')) {
    e.respondWith(caches.open(RUNTIME).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r && r.status === 200) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  // Everything else same-origin (scripts, styles, KanjiVG SVGs, recog shards): cache-first, fill on miss.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && res.status === 200) { const copy = res.clone(); caches.open(RUNTIME).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match('./kanji.html') || Response.error())));
});
