#!/usr/bin/env node
/* ============================================================================
   FKTI · Kimarite photo fetcher
   ----------------------------------------------------------------------------
   Downloads the public-domain bout photographs from Wikimedia Commons'
   "Category:Sumō techniques" for the techniques we can match confidently,
   bundles them into img/sumo/kimarite/<romaji>.jpg (offline-first), and writes
   data/kimarite_photos.json = { "<romaji>": {file, license, credit, page} }.

   Only PD / freely-licensed files are kept (license is re-verified per file).
   These are pre-1957 Japanese photos (PD-Japan-oldphoto) — no attribution
   required, but we record the source anyway. Run:  node sumo-src/kimarite-photos.js
   ============================================================================ */
const fs = require('fs');
const path = require('path');

const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const UA = 'FKTI-Learning/1.0 (https://fkti.org; classroom sumo companion)';
const IMGDIR = path.join(__dirname, '..', 'img', 'sumo', 'kimarite');
const OUT = path.join(__dirname, '..', 'data', 'kimarite_photos.json');

// our romaji  ->  exact Commons file title (only confident, exact matches)
const MAP = {
  oshidashi:'Oshidashi.jpg', oshitaoshi:null, abisetaoshi:'Abisetaoshi.jpg',
  shitatenage:'Shitatenage.jpg', kotenage:'Kotenage.jpg', sukuinage:'Sukuinage.jpg',
  kakenage:'Kakenage.jpg', sotogake:'Sotogake.jpg', uchigake:'Uchigake.jpg',
  kirikaeshi:'Kirikaeshi.jpg', komatasukui:'Komatasukui.jpg', watashikomi:'Watashikomi.jpg',
  nimaigeri:'Nimaigeri.jpg', tsukiotoshi:'Tsukiotoshi.jpg', katasukashi:'Katasukashi.jpg',
  makiotoshi:'Makiotoshi.jpg', sotomuso:'Sotomusou.jpg', amiuchi:'Amiuchi.jpg',
  sabaori:'Sabaori.jpg', tasukizori:'Tasukizori.jpg', hatakikomi:'Hatakikomi.jpg',
  hikiotoshi:'Hikiotoshi.jpg', okuridashi:'Okuridashi.jpg'
};
const stripTags = s => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
async function jget(url){ const r = await fetch(url,{headers:{'User-Agent':UA}}); if(!r.ok) throw new Error(r.status); return r.json(); }
// download an image, validating it's a real JPEG (FF D8 FF) — retry on the
// thumbnail server's transient HTML error pages.
async function fetchImage(url){
  for (let attempt = 0; attempt < 4; attempt++){
    try{
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      const ct = r.headers.get('content-type') || '';
      const buf = Buffer.from(await r.arrayBuffer());
      if (r.ok && /image\//.test(ct) && buf.length > 8 && buf[0] === 0xFF && buf[1] === 0xD8) return buf;
    } catch (e) {}
    await new Promise(res => setTimeout(res, 600 * (attempt + 1)));
  }
  return null;
}

(async () => {
  fs.mkdirSync(IMGDIR, { recursive: true });
  const out = {};
  let ok = 0, skip = 0;
  for (const [romaji, file] of Object.entries(MAP)) {
    if (!file) { skip++; continue; }
    try {
      const j = await jget(`${COMMONS}?action=query&titles=${encodeURIComponent('File:'+file)}&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=640&format=json`);
      const pages = j.query.pages; const p = pages[Object.keys(pages)[0]];
      const ii = p.imageinfo && p.imageinfo[0];
      if (!ii) { console.log('  ! no imageinfo for', file); skip++; continue; }
      const md = ii.extmetadata || {};
      const license = md.LicenseShortName ? stripTags(md.LicenseShortName.value) : 'Public domain';
      const usage = md.UsageTerms ? stripTags(md.UsageTerms.value) : '';
      if (/fair use|non-free/i.test(license + ' ' + usage)) { console.log('  ! not free:', file, license); skip++; continue; }
      const credit = md.Artist ? stripTags(md.Artist.value).slice(0, 80) : 'Unknown (Japan, pre-1957)';
      const url = ii.thumburl || ii.url;
      const buf = await fetchImage(url);
      if (!buf) { console.log('  ! could not fetch a valid JPEG for', file); skip++; continue; }
      fs.writeFileSync(path.join(IMGDIR, romaji + '.jpg'), buf);
      out[romaji] = {
        file: 'img/sumo/kimarite/' + romaji + '.jpg',
        license, credit,
        page: 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file)
      };
      ok++;
      process.stdout.write(`\r  bundled ${ok}: ${romaji.padEnd(14)} (${license})            `);
    } catch (e) { console.log('  ! failed', file, e.message); skip++; }
    await new Promise(r => setTimeout(r, 120));
  }
  console.log('');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 0));
  console.log(`Wrote ${OUT} and ${ok} images to img/sumo/kimarite/ (skipped ${skip}).`);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
