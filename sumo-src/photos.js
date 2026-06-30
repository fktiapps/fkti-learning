#!/usr/bin/env node
/* ============================================================================
   FKTI · Sumo photo-map generator
   ----------------------------------------------------------------------------
   Builds data/sumo_photos.json = { "<rikishiId>": {url, source, credit,
   license, page} }, used by sumo.html as the DEFAULT wrestler photo.

   Resolution order, per Greg's call:
     1. Wikimedia Commons (CC) — via the wrestler's English Wikipedia lead
        image, with license + author captured for attribution.
     2. Official Japan Sumo Association portrait — scraped from the wrestler's
        JSA profile page (reached via the API's nskId).
     3. (none) — sumo.html then shows a stylized placeholder. Drop an FKTI
        caricature into the CARICATURE map in sumo.html to override anyone.

   Covers the top two divisions (Makuuchi + Juryo) of the latest published
   banzuke. Re-run when a new banzuke comes out — the map is keyed by the
   basho-independent rikishiId, so it just updates in place.

   No tokens, no credentials — only free public HTTP. Run:  node sumo-src/photos.js
   ============================================================================ */
const fs = require('fs');
const path = require('path');

const API = 'https://www.sumo-api.com/api';
const WP  = 'https://en.wikipedia.org/w/api.php';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const UA = 'FKTI-Learning/1.0 (https://fkti.org; classroom sumo companion)';
const OUT = path.join(__dirname, '..', 'data', 'sumo_photos.json');
const BASHO_TRY = ['202607', '202605', '202603']; // newest first; first non-empty wins
const DIVISIONS = ['Makuuchi', 'Juryo'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function jget(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(r.status + ' ' + url);
  return r.json();
}
async function tget(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(r.status + ' ' + url);
  return r.text();
}
const enc = encodeURIComponent;

/* ---- 1. roster: newest published banzuke, top two divisions ---- */
async function roster() {
  for (const b of BASHO_TRY) {
    const people = new Map();
    for (const d of DIVISIONS) {
      try {
        const j = await jget(`${API}/basho/${b}/banzuke/${d}`);
        [...(j.east || []), ...(j.west || [])].forEach(r => {
          const id = r.rikishiID || r.rikishiId;
          if (id) people.set(id, { id, name: r.shikonaEn, rank: r.rank });
        });
      } catch (e) { /* division missing — skip */ }
    }
    if (people.size) { console.log(`Roster: ${people.size} rikishi from basho ${b} (${DIVISIONS.join('+')}).`); return [...people.values()]; }
  }
  throw new Error('No published banzuke found in ' + BASHO_TRY.join(', '));
}

/* ---- 2a. Wikimedia Commons lead photo (with license) ---- */
async function fromWikimedia(name) {
  // search for the article
  const s = await jget(`${WP}?action=query&list=search&srsearch=${enc(name + ' sumo wrestler')}&srlimit=1&format=json`);
  const hit = s.query && s.query.search && s.query.search[0];
  if (!hit) return null;
  const title = hit.title;
  // lead image + categories (to confirm it's really a sumo wrestler)
  const p = await jget(`${WP}?action=query&titles=${enc(title)}&prop=pageimages|categories&piprop=original&cllimit=50&format=json&redirects=1`);
  const pages = p.query && p.query.pages;
  const page = pages && pages[Object.keys(pages)[0]];
  if (!page || !page.original || !page.original.source) return null;
  const cats = (page.categories || []).map(c => c.title.toLowerCase());
  if (!cats.some(c => /sumo/.test(c))) return null;           // guard against wrong-person matches
  const src = page.original.source;
  if (!/\/wikipedia\/commons\//.test(src)) return null;       // must be a Commons (freely-licensed) file
  // license + author from Commons extmetadata
  const file = 'File:' + decodeURIComponent(src.split('/').pop()).replace(/_/g, ' ');
  let license = 'CC', credit = 'Wikimedia Commons';
  try {
    const im = await jget(`${COMMONS}?action=query&titles=${enc(file)}&prop=imageinfo&iiprop=extmetadata&format=json`);
    const ip = im.query.pages; const f = ip[Object.keys(ip)[0]];
    const md = f && f.imageinfo && f.imageinfo[0] && f.imageinfo[0].extmetadata;
    if (md) {
      if (md.LicenseShortName) license = stripTags(md.LicenseShortName.value);
      if (md.Artist) credit = stripTags(md.Artist.value);
      const perm = md.UsageTerms && stripTags(md.UsageTerms.value);
      if (/fair use|non-free/i.test(license) || /fair use|non-free/i.test(perm || '')) return null; // not freely licensed
    }
  } catch (e) { /* keep generic credit */ }
  return { url: src, source: 'wikimedia', credit: credit.slice(0, 120), license, page: 'https://en.wikipedia.org/wiki/' + enc(title.replace(/ /g, '_')) };
}
const stripTags = s => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/* ---- 2b. official JSA portrait (fallback) ---- */
async function fromJSA(id) {
  let rec;
  try { rec = await jget(`${API}/rikishi/${id}`); } catch (e) { return null; }
  const nsk = rec && rec.nskId;
  if (!nsk) return null;
  let html;
  try { html = await tget(`https://www.sumo.or.jp/EnSumoDataRikishi/profile/${nsk}/`); } catch (e) { return null; }
  const m = html.match(/\/img\/sumo_data\/rikishi\/\d+x\d+\/(\d+)\.jpg/);
  if (!m) return null;
  return { url: 'https://www.sumo.or.jp/img/sumo_data/rikishi/270x474/' + m[1] + '.jpg',
           source: 'jsa', credit: 'Japan Sumo Association', license: '© JSA',
           page: `https://www.sumo.or.jp/EnSumoDataRikishi/profile/${nsk}/` };
}

/* ---- main ---- */
(async () => {
  const list = await roster();
  // preserve any existing entries (e.g. hand-added) and refresh
  let out = {};
  try { out = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) {}
  let wiki = 0, jsa = 0, none = 0;
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    let photo = null;
    try { photo = await fromWikimedia(r.name); } catch (e) {}
    await sleep(120);
    if (!photo) { try { photo = await fromJSA(r.id); } catch (e) {} await sleep(120); }
    if (photo) {
      out[r.id] = photo;
      if (photo.source === 'wikimedia') wiki++; else jsa++;
    } else { none++; }
    process.stdout.write(`\r[${i + 1}/${list.length}] ${r.name.padEnd(16).slice(0,16)}  wiki:${wiki} jsa:${jsa} none:${none}   `);
  }
  console.log('');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 0));
  console.log(`Wrote ${OUT} — ${Object.keys(out).length} wrestlers (Wikimedia ${wiki}, JSA ${jsa}, none ${none}).`);
})().catch(e => { console.error('\nFAILED:', e.message); process.exit(1); });
