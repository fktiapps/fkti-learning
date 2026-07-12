// Merge generated "kanji in context" data into data/kanji_joyo.json as each cell's `ex` field.
// Reads data/_kanji_ctx.json (array of {k, words:[{w,r,m}], sents:[{jp,r,m}]}).
// Validation: keep only compounds/sentences that actually CONTAIN the target kanji; cap 3 words
// and 2 sentences; drop empties. Cells with no valid context are left untouched (UI no-ops).
import fs from 'fs';
const d = JSON.parse(fs.readFileSync('data/kanji_joyo.json', 'utf8'));
const ctx = JSON.parse(fs.readFileSync('data/_kanji_ctx.json', 'utf8'));
const rows = Array.isArray(ctx) ? ctx : (ctx.results || []);
const byK = new Map();
for (const r of rows) if (r && r.k && !byK.has(r.k)) byK.set(r.k, r); // first wins on dup

const clean = s => (s == null ? '' : String(s)).trim();
let cells = 0, withEx = 0, wKept = 0, wDrop = 0, sKept = 0, sDrop = 0, missing = 0;
for (const tile of d) {   // d is an array of tiles, each { name, cells:[...] }
  for (const c of tile.cells) {
    cells++;
    const r = byK.get(c.k);
    if (!r) { missing++; continue; }
    const words = (r.words || []).map(w => ({ w: clean(w.w), r: clean(w.r), m: clean(w.m) }))
      .filter(w => w.w && w.r && w.m && w.w.includes(c.k));           // compound must contain the kanji
    wKept += words.length; wDrop += (r.words || []).length - words.length;
    const sents = (r.sents || []).map(s => ({ jp: clean(s.jp), r: clean(s.r), m: clean(s.m) }))
      .filter(s => s.jp && s.r && s.m && s.jp.includes(c.k));         // sentence must contain the kanji
    sKept += sents.length; sDrop += (r.sents || []).length - sents.length;
    const ex = {};
    if (words.length) ex.words = words.slice(0, 3);
    if (sents.length) ex.sents = sents.slice(0, 2);
    if (ex.words || ex.sents) { c.ex = ex; withEx++; }
  }
}

// Serialize compactly but stably (one tile per line keeps diffs sane on a 2,136-entry file).
const out = '[\n' + d.map(t => JSON.stringify(t)).join(',\n') + '\n]\n';
fs.writeFileSync('data/kanji_joyo.json', out);
console.log(`cells: ${cells} | with context: ${withEx} | no ctx row: ${missing}`);
console.log(`compounds kept ${wKept} / dropped ${wDrop} (no kanji or incomplete)`);
console.log(`sentences kept ${sKept} / dropped ${sDrop}`);
