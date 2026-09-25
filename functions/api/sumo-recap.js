/**
 * POST /api/sumo-recap
 * Body: { basho: "202609", day: 7, facts: {...} }  — day is "through day N"; see sumo.html's
 * computeBashoFacts()
 *
 * Writes a short tournament-to-date ANALYSIS of the basho so far (not just one day). The model
 * is given ONLY pre-computed, AGGREGATED facts (every kinboshi and top upset so far, active
 * streaks, absences, perfect/winless records, yūshō-race context) — it is never asked to read raw
 * win/loss records or individual bout-by-bout results itself, so it can't misread a record or
 * invent a result; its one job is turning clean facts into readable prose.
 *
 * Requires:
 *   - Secret  MISTRAL_API_KEY   (wrangler pages secret put MISTRAL_API_KEY)
 *   - KV binding  SUMMARIES      (optional — caches each day-through's analysis so a page reload
 *                                 doesn't re-spend; the client also caches in localStorage
 *                                 regardless)
 *
 * If the key is missing it returns {wired:false} so the client shows placeholder copy and a
 * "not configured" note instead of erroring — same convention as the dining app's Mistral calls.
 */

const MODEL = 'mistral-medium-latest';
const CACHE_TTL = 60 * 60 * 24 * 3; // 3 days — the cache key already changes every day (through-N), this just bounds a bad cached analysis before a prompt fix + redeploy can take effect

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const basho = String(body.basho || '');
  const day = Number(body.day || 0);
  const facts = body.facts;
  if (!basho || !day || !facts) return json({ error: 'missing basho/day/facts' }, 400);

  if (!env.MISTRAL_API_KEY) {
    return json({ wired: false, message: 'MISTRAL_API_KEY not set on this deployment.' });
  }

  const cacheKey = 'recap:' + basho + '-' + day;
  if (env.SUMMARIES) {
    const cached = await env.SUMMARIES.get(cacheKey);
    if (cached) return new Response(cached, { headers: cors({ 'content-type': 'application/json' }) });
  }

  const sys = `You are a sumo commentator writing a short tournament-to-date ANALYSIS for
English-speaking fans following a basho live — not a single day's recap, the story of the whole
tournament so far. You are given ONLY pre-computed, verified facts below as JSON, aggregated
across every completed day: every kinboshi so far (a rank-and-file wrestler beating a Yokozuna),
the biggest upsets of the tournament, wrestlers on a current win or loss streak of 4+, anyone
still undefeated or still winless, any absences (kyūjō), and the current yūshō (championship)
picture (the leader(s) and who's still mathematically alive to catch them). These facts are
already correct and complete through the stated day; do not add, guess, or infer any bout result,
record, rank, or kimarite that isn't in the JSON. If a category (e.g. absences) is empty, don't
mention it just to fill space — only write about what's actually notable.

Write 3-5 short paragraphs (or a tight structure of a few labeled sections if that reads better)
telling the story of the tournament arc so far: who's overperforming or underperforming their
rank, how the yūshō race has taken shape, standout upsets and kinboshi, and any streaks or
absences worth flagging. Keep it vivid but grounded — no invented color commentary about a bout's
atmosphere or crowd reaction that isn't implied by the facts. Plain text or simple markdown, no
code fences.`;

  // Mistral's /v1/conversations endpoint only accepts 'user'/'assistant' roles in `inputs` — no
  // 'system' (confirmed live: a system-role entry gets a 422 "Input should be 'assistant' or
  // 'user'"). Same reason the other Mistral calls in this codebase (chef-bio.js, place-summary.js)
  // fold their instructions into one user message instead of a separate system message.
  const userMsg = `${sys}\n\nFACTS for ${facts.bashoName || basho}, through Day ${day} of ${facts.totalDays||15}:\n${JSON.stringify(facts)}\n\nWrite the analysis now.`;

  let data;
  try {
    const r = await fetch('https://api.mistral.ai/v1/conversations', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + env.MISTRAL_API_KEY },
      body: JSON.stringify({
        model: MODEL,
        inputs: [
          { role: 'user', content: userMsg }
        ],
        store: false,
        completion_args: { temperature: 0.4 }
      })
    });
    if (!r.ok) {
      if (r.status === 429) {
        const retryAfter = Math.max(45, parseInt(r.headers.get('Retry-After') || '45', 10));
        return json({ wired: true, error: 'rate_limited', retry_after: retryAfter }, 429);
      }
      return json({ wired: true, error: 'upstream', status: r.status, detail: (await r.text()).slice(0, 300) }, 502);
    }
    data = await r.json();
  } catch (e) {
    return json({ wired: true, error: 'network', detail: String(e) }, 502);
  }

  let text = '';
  for (const o of (data.outputs || data.messages || data.entries || [])) {
    const isMsg = o.type === 'message.output' || o.role === 'assistant';
    if (!isMsg || o.content == null) continue;
    if (typeof o.content === 'string') text += o.content;
    else if (Array.isArray(o.content)) for (const ch of o.content) if (ch && ch.type === 'text' && ch.text) text += ch.text;
  }
  if (!text.trim()) return json({ wired: true, error: 'empty' }, 502);

  const out = JSON.stringify({ wired: true, text: text.trim(), day, basho });
  if (env.SUMMARIES) await env.SUMMARIES.put(cacheKey, out, { expirationTtl: CACHE_TTL });
  return new Response(out, { headers: cors({ 'content-type': 'application/json' }) });
}

export async function onRequestOptions() {
  return new Response(null, { headers: cors() });
}

function cors(h = {}) { return { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST,OPTIONS', ...h }; }
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: cors({ 'content-type': 'application/json' }) });
}
