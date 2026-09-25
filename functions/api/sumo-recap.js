/**
 * POST /api/sumo-recap
 * Body: { basho: "202609", day: 7, facts: {...} }  — day is "through day N"; see sumo.html's
 * computeBashoFacts()
 *
 * Two-stage architecture using ctx.waitUntil() (same pattern as the dining app's chef-bio.js):
 *   1st request  → starts Mistral web-search in background, returns {status:'pending'} instantly
 *   2nd+ request → returns cached KV result when ready, or still-pending with a countdown
 * This avoids Cloudflare's 30s wall-clock limit — a web-search-backed Mistral call can take
 * well past that — and gives the user a countdown instead of a hanging spinner or a timeout error.
 *
 * WHY WEB SEARCH: an earlier version only turned our own pre-computed stats into prose, which
 * added no real value over the stats already on the page. This version additionally asks Mistral
 * to search for what actual Japanese-language sumo press/commentary is saying about this
 * tournament's storylines, and write an analysis that combines that outside context with our
 * facts — but the FACTS remain ground truth throughout: the model is told explicitly never to let
 * a secondary source override a record/result that's actually in the facts JSON, and never to
 * attribute a claim to "the Japanese press" that it didn't actually find via search.
 *
 * Requires:
 *   - Secret  MISTRAL_API_KEY   (wrangler pages secret put MISTRAL_API_KEY, or set via the
 *                                 Cloudflare Pages dashboard's Environment Variables screen)
 *   - KV binding  SUMMARIES      (required for the pending/poll flow to work at all now — without
 *                                 it every request would restart the search from scratch)
 *
 * If the key is missing it returns {wired:false} so the client shows placeholder copy and a
 * "not configured" note instead of erroring — same convention as the dining app's Mistral calls.
 */

const MODEL = 'mistral-medium-latest';
const CACHE_TTL = 60 * 60 * 24 * 3; // 3 days — the cache key already changes every day (through-N), this just bounds a bad cached analysis before a prompt fix + redeploy can take effect
const PENDING_TTL = 90;              // pending marker expires in 90s

export async function onRequestPost(context) {
  const { request, env, waitUntil } = context;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const basho = String(body.basho || '');
  const day = Number(body.day || 0);
  const facts = body.facts;
  if (!basho || !day) return json({ error: 'missing basho/day' }, 400);

  if (!env.MISTRAL_API_KEY) {
    return json({ wired: false, message: 'MISTRAL_API_KEY not set on this deployment.' });
  }

  const cacheKey = 'recap:' + basho + '-' + day;
  const pendingKey = 'pending:' + cacheKey;

  // Without a KV binding there is nowhere to remember "already searching" or "already done"
  // between requests — every request is a clean slate. Falling through to the fully-synchronous
  // path below (no waitUntil, no pending) is deliberate: the two-stage pending/poll pattern is
  // WORSE than useless without KV, because each poll would look like a brand-new request and
  // restart the search from scratch instead of checking on the first one — silently multiplying
  // paid Mistral calls forever instead of ever converging on an answer. (Caught this exact bug
  // live: two polls 25s apart both returned elapsed:0, i.e. two independent searches, not one
  // being checked on twice.) Synchronous-only means occasionally eating Cloudflare's execution
  // limit on a slow search instead, which fails cleanly — the client already handles that.
  const hasKV = !!env.SUMMARIES;

  if (hasKV) {
    // --- Completed already? ---
    const cached = await env.SUMMARIES.get(cacheKey);
    if (cached) return new Response(cached, { headers: cors({ 'content-type': 'application/json' }) });

    // --- Already researching? Don't start a second search for the same day. ---
    const pending = await env.SUMMARIES.get(pendingKey);
    if (pending) {
      let p;
      try { p = JSON.parse(pending); } catch { await env.SUMMARIES.delete(pendingKey); }
      if (p) {
        const elapsed = Math.floor((Date.now() - p.started) / 1000);
        const remaining = Math.max(5, 28 - elapsed);
        return json({ status: 'pending', retry_after: remaining, elapsed });
      }
    }
  }

  if (!facts) return json({ error: 'missing facts for a new request' }, 400);

  // Mark pending immediately so a duplicate click (or an impatient poll) doesn't double-fire.
  if (hasKV)
    await env.SUMMARIES.put(pendingKey, JSON.stringify({ started: Date.now() }), { expirationTtl: PENDING_TTL });

  // Mistral's /v1/conversations endpoint only accepts 'user'/'assistant' roles in `inputs` — no
  // 'system' (confirmed live: a system-role entry gets a 422). Same reason the other Mistral
  // calls in this codebase (chef-bio.js, place-summary.js) fold instructions into one user message.
  const prompt = `You are a sumo analyst writing a tournament-to-date ANALYSIS for English-speaking
fans following a basho live — the story of the whole tournament so far, not just a recap of the
numbers.

You are given FACTS below as JSON, pre-computed and verified, aggregated across every day
completed so far: every kinboshi (a rank-and-file wrestler beating a Yokozuna), the biggest upsets
of the tournament, wrestlers on a current win/loss streak of 4+, anyone still undefeated or
winless, absences (kyūjō), and the current yūshō (championship) picture. THESE FACTS ARE GROUND
TRUTH — never invent, alter, or contradict a bout result, record, rank, or kimarite that's in this
JSON, and if a source you find while searching disagrees with the JSON, the JSON wins and you
should not repeat the contradicting claim.

Your job is to go beyond those facts: use web search to find what actual Japanese-language sumo
press and commentary — NHK, Nikkan Sports (日刊スポーツ), Sports Hochi (スポーツ報知), Sponichi
(スポーツニッポン), Daily Sports, established sumo journalists/critics, or the Japan Sumo
Association's own commentary — are currently saying about THIS tournament's storylines,
especially the wrestlers and threads named in the facts (the yūshō leader(s) and chasers, anyone
with a kinboshi or notable upset, anyone on a hot/cold streak, any absence). Bring in real
context that raw numbers can't: why a wrestler's form is considered significant, injury/health
context around any absence, tactical or historical reads, which storyline Japanese commentators
consider the biggest of the tournament, or what a wrestler said in a post-bout interview (囲み取材
/ dohyō-giwa comments) if you find one reported.

Attribute anything you found via search to its outlet by name when you use it (e.g. "日刊スポーツ
reports that...", "NHK's coverage noted..."). Never write vague, unattributed phrases like
"Japanese press and fan commentary have latched onto..." or "analysts have remarked..." — either
name the specific outlet/publication your search actually returned, or don't make the claim at
all. Do NOT fabricate a source or attribute a view to Japanese press that your search didn't
actually turn up — if search finds nothing useful for a given storyline, just cover that part
using the facts alone rather than inventing outside commentary for it. This is read by real fans
who may follow up on what you cite.

Write 3-5 short paragraphs telling the story of the tournament so far, blending the verified
facts with what you actually found. Plain text or simple markdown, no code fences.

Then add a final section headed exactly "What to watch for next" — 3-5 bullet points on what a
fan should pay attention to in the remaining days: e.g. an upcoming matchup between wrestlers in
the yūshō race (only if you can identify one from the facts or your search — do not invent a
specific future pairing that isn't confirmed), whether an in-form or struggling wrestler can
sustain their run, what Japanese commentators are watching for or predicting (attributed, per the
rule above), or a record/streak that's about to be tested. Ground this in the facts and what you
actually found — no generic filler like "stay tuned for more exciting bouts."

FACTS for ${facts.bashoName || basho}, through Day ${day} of ${facts.totalDays || 15}:
${JSON.stringify(facts)}

Write the analysis now.`;

  // Runs the actual Mistral call and returns the RESULT OBJECT (never writes a response itself) —
  // shared by both the KV path (run in the background, cache the result) and the no-KV path
  // (run synchronously, return the result directly, nothing to cache between requests anyway).
  const runSearch = async () => {
    try {
      const r = await fetch('https://api.mistral.ai/v1/conversations', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + env.MISTRAL_API_KEY },
        body: JSON.stringify({
          model: MODEL,
          inputs: [{ role: 'user', content: prompt }],
          tools: [{ type: 'web_search' }],
          store: false,
          completion_args: { temperature: 0.4 }
        })
      });

      if (!r.ok) {
        if (r.status === 429) {
          const headerSecs = parseInt(r.headers.get('Retry-After') || '45', 10);
          return { wired: true, error: 'rate_limited', retry_after: Math.max(45, headerSecs) };
        }
        return { wired: true, error: 'upstream', status: r.status, detail: (await r.text()).slice(0, 200) };
      }

      const data = await r.json();
      let text = '';
      for (const o of (data.outputs || data.messages || data.entries || [])) {
        const isMsg = o.type === 'message.output' || o.role === 'assistant';
        if (!isMsg || o.content == null) continue;
        if (typeof o.content === 'string') text += o.content;
        else if (Array.isArray(o.content)) for (const ch of o.content) if (ch && ch.type === 'text' && ch.text) text += ch.text;
      }
      if (!text.trim()) return { wired: true, error: 'empty' };

      return { wired: true, text: text.trim(), day, basho };
    } catch (e) {
      return { wired: true, error: 'network', detail: String(e) };
    }
  };

  if (hasKV) {
    const backgroundFetch = async () => {
      const result = await runSearch();
      await env.SUMMARIES.delete(pendingKey);
      const ttl = result.error === 'rate_limited' ? (result.retry_after + 15) : (result.text ? CACHE_TTL : 60);
      await env.SUMMARIES.put(cacheKey, JSON.stringify(result), { expirationTtl: ttl });
    };
    if (waitUntil) waitUntil(backgroundFetch());
    return json({ status: 'pending', retry_after: 25, elapsed: 0 });
  }

  // No KV: just wait for the real answer in this same request/response.
  const result = await runSearch();
  return json(result);
}

export async function onRequestOptions() {
  return new Response(null, { headers: cors() });
}

function cors(h = {}) { return { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST,OPTIONS', ...h }; }
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: cors({ 'content-type': 'application/json' }) });
}
