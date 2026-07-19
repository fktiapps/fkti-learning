// Same-origin proxy for the live sumo data. The app calls /api/sumo/<path>; this Cloudflare Pages
// Function fetches https://sumo-api.com/api/<path> from Cloudflare's edge and returns it with CORS +
// no-store. This lets the app get live banzuke/matchups even on networks that block sumo-api.com
// directly (the browser only ever talks to this site's own origin).
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,OPTIONS', 'cache-control': 'no-store' };

export async function onRequest(context) {
  const { request, params } = context;
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const seg = Array.isArray(params.path) ? params.path.join('/') : (params.path || '');
  const search = new URL(request.url).search || '';
  const target = 'https://sumo-api.com/api/' + seg + search;

  try {
    const upstream = await fetch(target, { headers: { accept: 'application/json' }, cf: { cacheTtl: 20, cacheEverything: true } });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'proxy_failed', detail: String(e && e.message || e) }), {
      status: 502, headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
}
