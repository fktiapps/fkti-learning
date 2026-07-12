// Generate a "kanji in context" content workflow: for each of the 2,136 Jōyō kanji, produce
// 2–3 common compounds (熟語) and 1–2 short natural example sentences, level-matched to the
// kanji's school grade. Two-stage pipeline: generate (Sonnet) → strict proofread/verify (Sonnet),
// each batch flowing independently. Output → data/_kanji_ctx.json ; apply merges `ex` into cells.
import fs from 'fs';
const j = JSON.parse(fs.readFileSync('data/kanji_joyo.json', 'utf8'));
const BATCH = 15;

const targets = [];
for (const t of j) {
  const grade = t.name.replace(/·.*/, '').trim(); // "Grade 1" … "Secondary"
  for (const c of t.cells) targets.push({ k: c.k, m: c.m, grade });
}
const batches = [];
for (let i = 0; i < targets.length; i += BATCH) batches.push(targets.slice(i, i + BATCH));

const CTX_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    results: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        properties: {
          k: { type: 'string' },
          words: {
            type: 'array', items: {
              type: 'object', additionalProperties: false,
              properties: { w: { type: 'string' }, r: { type: 'string' }, m: { type: 'string' } },
              required: ['w', 'r', 'm'],
            },
          },
          sents: {
            type: 'array', items: {
              type: 'object', additionalProperties: false,
              properties: { jp: { type: 'string' }, r: { type: 'string' }, m: { type: 'string' } },
              required: ['jp', 'r', 'm'],
            },
          },
        }, required: ['k', 'words', 'sents'],
      },
    },
  }, required: ['results'],
};

const script = `export const meta = {
  name: 'kanji-context',
  description: 'Generate + verify compounds & example sentences for ${targets.length} Jōyō kanji',
  phases: [{ title: 'Generate' }, { title: 'Verify' }],
}
const BATCHES = ${JSON.stringify(batches)};
const CTX_SCHEMA = ${JSON.stringify(CTX_SCHEMA)};

const genPrompt = b => \`You are a Japanese lexicographer building "kanji in context" study cards for an English-speaking learner. For EACH kanji below, produce:
- "words": 2–3 common, real Japanese compound words (熟語 or everyday words) that CONTAIN this kanji. Prefer the most useful/frequent words a learner will actually meet. Each: w = the word (kanji/kana as written), r = full reading in hiragana (katakana only for loanword parts), m = concise natural English meaning.
- "sents": 1–2 SHORT example sentences (≤ ~12 words) that CONTAIN this kanji, natural and grammatical, difficulty matched to the kanji's grade. Each: jp = the sentence in normal Japanese, r = the FULL sentence reading in hiragana, m = natural English translation.

HARD RULES:
- Every word MUST contain the target kanji. Every sentence MUST contain the target kanji.
- Readings must be accurate. Do not invent words or rare/obscure compounds.
- Lower grades (Grade 1–3) → simpler words and sentences; Secondary → can be more advanced.
- Keep English natural, not literal-glossy.

KANJI (kanji | meaning | grade):
\${b.map(x => x.k + ' | ' + x.m + ' | ' + x.grade).join('\\n')}

Return one result object per kanji (field k = the kanji).\`;

const verPrompt = (b, gen) => \`You are a STRICT Japanese proofreader. Below is draft "kanji in context" data. For each kanji, verify and FIX:
- Each compound is a real, reasonably common Japanese word that CONTAINS the target kanji; its reading (r, hiragana) is correct; English (m) is accurate. If a word is wrong, too rare, or lacks the kanji and you can't fix it, REPLACE it with a better common word that contains the kanji.
- Each sentence is natural, grammatical, CONTAINS the target kanji, and is level-appropriate; the full-sentence hiragana reading (r) and English (m) are correct. Fix reading/translation errors; rewrite awkward or wrong sentences.
- Keep 2–3 words and 1–2 sentences per kanji. Return the CORRECTED full set (one object per kanji, field k = the kanji).

TARGET KANJI (kanji | meaning | grade):
\${b.map(x => x.k + ' | ' + x.m + ' | ' + x.grade).join('\\n')}

DRAFT DATA (JSON):
\${JSON.stringify(gen)}\`;

const results = await pipeline(
  BATCHES,
  (b, _orig, i) => agent(genPrompt(b), { label: 'gen #' + i + ' (' + b.length + ')', phase: 'Generate', schema: CTX_SCHEMA, model: 'sonnet' })
    .then(r => (r && r.results) || []).catch(() => []),
  (gen, b, i) => {
    if (!gen.length) return [];
    return agent(verPrompt(b, gen), { label: 'verify #' + i, phase: 'Verify', schema: CTX_SCHEMA, model: 'sonnet' })
      .then(r => (r && r.results && r.results.length) ? r.results : gen).catch(() => gen);
  }
);
const flat = results.filter(Boolean).flat();
log('context batches: ' + BATCHES.length + '; kanji with context: ' + flat.length);
return { count: flat.length, results: flat };
`;
fs.writeFileSync('scripts/kanji-context-workflow.js', script);
console.log(`wrote scripts/kanji-context-workflow.js | ${targets.length} kanji -> ${batches.length} batches of ${BATCH}`);
