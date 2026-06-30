const fs = require('fs');
const path = require('path');
// strokes.json lives beside this script; output goes to the repo root (one level up).
const strokes = JSON.parse(fs.readFileSync(path.join(__dirname, 'strokes.json'), 'utf8'));

const ORDER = ['a','i','u','e','o','ka','ki','ku','ke','ko','sa','shi','su','se','so',
 'ta','chi','tsu','te','to','na','ni','nu','ne','no','ha','hi','fu','he','ho',
 'ma','mi','mu','me','mo','ya','yu','yo','ra','ri','ru','re','ro','wa','wo','n'];

// STATIC: emoji+key+hook  (or artBack/artFront raw SVG = bespoke; emoji suppressed if present)
// MOTION: b[] chant. string = one beat per stroke (to:0). object {t,s,to} = explicit stroke + dashoffset target.
const D = {
 // ---- tuned this round (Greg's notes) ----
 a:{k:'Apple',h:'a fat apple shape filling the 3rd stroke (the loop)',
    artBack:'<path d="M57,63 C50,55 38,57 34,68 C31,77 33,89 45,93 C51,95 53,90 57,90 C61,90 63,95 69,93 C81,89 83,77 80,68 C76,57 64,55 57,63 Z" fill="#E2553B" opacity="0.9"/><circle cx="47" cy="71" r="3.6" fill="#fff" opacity="0.5"/><path d="M57,63 C56,56 55,53 55,49" fill="none" stroke="#13182B" stroke-width="3" stroke-linecap="round"/><path d="M56,52 C63,47 70,50 67,57 C60,59 56,56 56,52 Z" fill="#5d7a4e"/>',
    b:['a-cross','a-down','all a-round']},
 i:{k:'Two eels',h:'the two strokes ARE the eels — googly eyes on top',
    artFront:'<circle cx="24" cy="33" r="4.2" fill="#fff" stroke="#13182B" stroke-width="1.3"/><circle cx="25.3" cy="33.2" r="1.8" fill="#13182B"/><circle cx="75" cy="40" r="4.2" fill="#fff" stroke="#13182B" stroke-width="1.3"/><circle cx="76.3" cy="40.2" r="1.8" fill="#13182B"/>',
    b:['EE— big eel','ee! little eel']},
 u:{k:'U-turn',h:'a U-turn arrow nestled inside the 2nd stroke’s curve, not touching it',
    artBack:'<g transform="rotate(45 46 57)"><path d="M42,66 L42,55 C42,50 50,50 50,55 L50,63" fill="none" stroke="#E2553B" stroke-width="2.6" stroke-linecap="round" opacity="0.9"/><path d="M50,68 l-2.8,-5 l5.6,0 z" fill="#E2553B" opacity="0.9"/></g>',
    b:['Oo! a cop! 🚓','quick — oo turn!']},
 e:{k:'Energetic squiggle',h:'the character vibrating with energy',
    artFront:'<g stroke="#E2553B" stroke-width="2" stroke-linecap="round" fill="none"><path d="M48,7 l0,-5"/><path d="M39,9 l-3,-4"/><path d="M57,9 l3,-4"/><path d="M17,48 l-6,-2"/><path d="M16,60 l-6,2"/><path d="M92,50 l6,-2"/><path d="M93,62 l6,2"/><path d="M30,97 l-2,5"/><path d="M50,100 l0,5"/><path d="M70,97 l3,5"/><path d="M84,79 l6,-3"/><path d="M86,84 l7,-2"/><path d="M88,89 l7,-1"/><path d="M14,31 l-6,-3"/><path d="M97,33 l6,-2"/></g>',
    b:['a flourish up top…','…one elegant signature ✒️']},
 o:{k:'Tree, pond & moon',h:'the down-stroke is the trunk, cross is a branch; loop = pond; top-right = moon',
    artBack:'<ellipse cx="62" cy="78" rx="22" ry="8" fill="#a9c6db" opacity="0.45"/><rect x="37.5" y="40" width="7" height="40" rx="2.5" fill="#cbb892" opacity="0.7"/><g opacity="0.62" fill="#bcd49f"><circle cx="41" cy="27" r="14"/><circle cx="41" cy="15" r="10"/><circle cx="27" cy="30" r="10"/><circle cx="55" cy="30" r="10"/><circle cx="31" cy="41" r="8"/><circle cx="51" cy="41" r="8"/></g><circle cx="80" cy="22" r="6.5" fill="#ead9a0" opacity="0.85"/>',
    b:['Across the sky…','down to earth and around the pond…','to see the moon 🌙']},
 // ---- first drafts (unchanged) ----
 ka:{k:'It spells “Ka”',h:'two red strokes finish the “a” (it spells Ka) — they blink',
    artFront:'<g class="blink" fill="none" stroke="#E2553B" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M80,52 C74,46 64,49 63,57 C62,66 75,68 80,61"/><path d="M80,46 L81,67"/></g>',
    b:['part of the K…','…the rest of the K…','add the little a — Ka!']},
 ki:{k:'Key',h:"sounds like 'key' — 🔑 rotated 90° onto the character",
    artBack:'<text x="54" y="74" text-anchor="middle" font-size="58" transform="rotate(90 54 54)">🔑</text>',
    b:['top tooth','second tooth','long shaft down','ki!—it turns']},
 ku:{k:'Open beak',h:"the < is a beak opening to the right, saying 'coo'",
    artFront:'<text x="72" y="49" font-size="13" font-family="Arial,Helvetica,sans-serif" font-style="italic" fill="#7a756a">coo</text>',
    b:['the beak opens — coo!']},
 ke:{k:'Tokei (wristwatch)',h:'a diagram for your watch: verticals = the forearm, cross = where the to-KE-i straps on',
    artBack:'<g opacity="0.7"><rect x="20" y="34" width="70" height="11" rx="3" fill="#bcd0d6"/><rect x="35" y="28" width="23" height="21" rx="4" fill="#e3edee" stroke="#7fa6ad" stroke-width="1.5"/><circle cx="46.5" cy="38.5" r="1.6" fill="#7fa6ad"/><path d="M46.5,38.5 L46.5,32.5 M46.5,38.5 L51,40.5" stroke="#7fa6ad" stroke-width="1.2" fill="none" stroke-linecap="round"/></g>',
    b:['one side of the arm…','strap on your to-KE-i ⌚','…and the other side']},
 ko:{k:'Two caterpillars',h:"two caterpillars inching — 'ko-ko'",
    artFront:'<circle cx="58" cy="30" r="2.8" fill="#13182B"/><circle cx="77" cy="80" r="2.8" fill="#13182B"/>',
    b:['top one — ko','bottom one — ko']},
 sa:{e:'🪚',k:'Saw',h:'lay your board, set the saw across it, grab the handle and saw',b:['put down your board','lay the saw across','grab the handle — saw!']},
 shi:{k:'She has long hair!',h:'the long stroke is her hair — big face on the left, hair flows right',
    sShift:24,
    artBack:'<text x="30" y="62" font-size="60" text-anchor="middle">😊</text>',
    b:["one swoosh down — 'shiii'"]},
 su:{k:'SU-wimming dive',h:'the top stroke is the water’s surface — dive down through it, SU-wim!',
    artBack:'<rect x="6" y="37" width="97" height="58" rx="2" fill="#a9c6db" opacity="0.4"/><path d="M14,54 q8,-3 16,0 t16,0 t16,0 t16,0" stroke="#7fa6ad" stroke-width="1.5" fill="none" opacity="0.5"/><path d="M52,32 l-3,-5 M58,31 l0,-6 M64,32 l3,-5" stroke="#7fa6ad" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.7"/>',
    b:['the water’s surface…','dive through — SU-wim! 🏊']},
 se:{e:'🎯',k:'Set & aim',h:"cross, stand, swoosh — ready, 'set'!",b:['cross bar','the vertical','swoosh — set!']},
 so:{k:'A stitch',h:'a back-and-forth stitch through fabric — so (sew)',
    artBack:'<line x1="8" y1="40" x2="101" y2="40" stroke="#c9b89a" stroke-width="2" stroke-dasharray="3 3" opacity="0.5"/><line x1="8" y1="74" x2="101" y2="74" stroke="#c9b89a" stroke-width="2" stroke-dasharray="3 3" opacity="0.5"/>',
    mFront:'<circle r="3" fill="#E2553B"><animateMotion dur="1.8s" repeatCount="indefinite" path="M38.4,22c1.88,1.25,4.98,1.05,7.5,0.38c6.5-1.75,13.25-3.75,19.38-5.38c4.63-1.23,7.18,2.06,3.62,5.25c-12.12,10.87-31.14,24.4-40,30.25c-6.25,4.12-5.88,5.75,1.38,3.88c17.08-4.42,35.96-8.68,50.12-10.38c9.38-1.12,9.62,0.12,0.5,1.38c-15.82,2.17-34.38,14.25-34.38,26.5c0,12.88,11.62,20.38,31.5,16.62"/></circle>',
    b:['stitch in and out — sooo!']},
 ta:{k:'It spells “Ta”',h:'black strokes = the t, the red bottom strokes = the a — they blink',
    artFront:'<g class="blink" fill="none" stroke="#E2553B" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"><path d="M56.38,53.25c12.38-2.75,18.25-3.7,23.62-3.12c15.12,1.62-1.12,2.25-4.25,4.88"/><path d="M54.13,82.25c4.38,7,14.25,8.12,34.5,5.62"/></g>',
    b:['cross the t…','down the t…','start the a…','close it — Ta!']},
 chi:{k:'The cheapest 5',h:'ち looks like a 5 — “the CHEApest 5 I’ve ever seen” (chi)',
    artBack:'<text x="50" y="80" font-size="66" font-family="Arial,Helvetica,sans-serif" font-style="italic" fill="#cfd9ee" opacity="0.8" text-anchor="middle">5</text>',
    b:['the CHEApest…','…5 I’ve ever seen!']},
 tsu:{k:'Tsunami',h:'a tsunami wave with its opening facing left (tsu)',
    artBack:'<text x="54" y="74" text-anchor="middle" font-size="56" transform="translate(108,0) scale(-1,1)">🌊</text>',
    b:['the wave curls — tsu-nami!']},
 te:{e:'🖐️',k:'Hand (te)',h:"'te' = 手 = hand; the stroke is the arm",b:["one bend — reach out, 'te'"]},
 to:{k:'Thorn in the lion’s toe',h:'the lion’s toe (the curve) with a thorn stuck in it — from the fable (to)',
    artBack:'<ellipse cx="56" cy="66" rx="27" ry="23" fill="#e8cdaf" opacity="0.5"/>',
    artFront:'<path d="M37,18 L46,52" stroke="#7a5a3a" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M41,30 l5,-3 M43,41 l5,-3" stroke="#7a5a3a" stroke-width="1.5" stroke-linecap="round" fill="none"/>',
    b:['the thorn…','…in the lion’s toe — to!']},
 na:{e:'👋',k:'The cheer',h:'na-na (cross), hey (tick), and the curl waves 👋 goodbye',b:['na na na na','na na na na','hey hey hey','👋 goodbye']},
 ni:{k:'Kneecap close-up',h:'right strokes = the kneecap (patella), left stroke = the side of the leg — knee (ni)',
    artBack:'<rect x="12" y="22" width="13" height="58" rx="6" fill="#ecd9c6" opacity="0.4"/><ellipse cx="70" cy="55" rx="20" ry="24" fill="#ecd9c6" opacity="0.55"/><ellipse cx="70" cy="55" rx="20" ry="24" fill="none" stroke="#c9a98c" stroke-width="1.5" opacity="0.5"/>',
    b:['the side of the leg…','top of the kneecap…','round the cap — knee!']},
 nu:{k:'Noodles (top-down)',h:'a bowl of noodles seen from above — the swirl is the noodles (nu)',
    artBack:'<circle cx="54" cy="58" r="40" fill="#e8ddc8" opacity="0.5"/><circle cx="54" cy="58" r="40" fill="none" stroke="#c9b89a" stroke-width="2" opacity="0.6"/><circle cx="54" cy="58" r="33" fill="none" stroke="#c9b89a" stroke-width="1" opacity="0.4"/>',
    b:['the chopstick…','swirl the noodles — nuuu']},
 ne:{e:'🐱',k:'Neko (cat)',h:"'ne' for neko; the loop is its tail",b:['the post','loop the tail — ne']},
 no:{e:'🚫',k:'No sign',h:"one big swirl — like a 'no' circle",b:["one spiral — 'nooo'"]},
 ha:{e:'😄',k:'Ha-ha!',h:"a laughing face — 'ha-ha-ha'",b:['the post','the cross','loop — ha-ha!']},
 hi:{k:'HE has a big nose',h:'a face — eyes upper-left & right, a smile underneath, ひ is the big nose (hi=he)',
    artFront:'<circle cx="16" cy="18" r="5" fill="#E2553B"/><circle cx="95" cy="20" r="5" fill="#E2553B"/><path d="M24,93.5 Q55,109.5 86,93.5" fill="none" stroke="#E2553B" stroke-width="3" stroke-linecap="round"/>',
    b:['draw HE’s big nose — hiii!']},
 fu:{e:'🗻',k:'Mt. Fuji',h:"peak + scattered clouds — 'fu' (Fuji)",b:['the peak','the slope','puff…','puff — fuuu']},
 he:{e:'⛰️',k:'A peak',h:"one little mountain — 'heh'",b:["over and down — 'he'"]},
 ho:{e:'🎅',k:'Ho-ho-ho',h:"like は with a hat — Santa's 'ho ho ho'",b:['the post','the cross','top bar','loop — ho ho ho!']},
 ma:{e:'👩',k:'Mama',h:"mama with a curl of hair — 'ma'",b:['top line','cross line','curl of hair — maa']},
 mi:{e:'🎵',k:'Mi (the note)',h:'do-re-MI; a loop and a tail',b:['swoop down','loop and cross — miii']},
 mu:{e:'🐮',k:'A cow',h:"a cow says 'muuu' (moo)",b:['the cross','big loop body','flick the tail — muuu']},
 me:{e:'👁️',k:'Eye (me)',h:"'me' = 目 = eye; the loop is the eyeball",b:['the cross','loop the eye — me']},
 mo:{e:'🎣',k:'Fishhook',h:"catching 'mo're' fish — 'mo'",b:['long hook down','cross once','cross twice — moo']},
 ya:{e:'⛵',k:'Yacht / yak',h:"a mast with a sail-flick — 'ya'",b:['the mast','the cross','sail-flick — yaa']},
 yu:{e:'🐟',k:'A fish (you)',h:"a swimming fish with a loop — 'yu' (you)",b:['loop the body','slash the tail — yuuu']},
 yo:{e:'🪀',k:'Yo-yo',h:"a yo-yo on a string — 'yo!'",b:['the string down','loop the yo-yo — yo!']},
 ra:{e:'🐰',k:'Rabbit',h:"a little ear + a hopping body — 'ra'",b:['little ear','hop the body — raa']},
 ri:{e:'🎋',k:'Two reeds',h:"two reeds bending in the wind — 'ree'",b:['left reed','long right reed — riii']},
 ru:{e:'🦘',k:'Kangaroo (roo)',h:"a looping tail in one swoop — 'roo'",b:["one swoop + curl — 'ruuu'"]},
 re:{e:'⚡',k:'Energy kick',h:"a post + an energetic kick — 'reh'",b:['the post','energetic loop-kick — reh']},
 ro:{e:'🛣️',k:'Winding road',h:"one winding road — 'roooo'",b:["one winding zig-zag — 'rooo'"]},
 wa:{e:'🦢',k:'Swan',h:"a post + a loop (ね/れ family) — 'wa'",b:['the post','loop it round — waa']},
 wo:{e:'🤸',k:'Yoga twist',h:"cross, twist, kick — 'wo' (o)",b:['cross the top','twist down','kick out — wooo']},
 n:{e:'✍️',k:'Signature',h:"one little squiggle — the 'n' sound",b:["one squiggle — 'nnn'"]},
};

const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// for a double-quoted HTML attribute: also escape quotes/apostrophes so JSON survives
const escAttr = s => esc(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
// PRINCIPLE: one stroke = one continuous motion = exactly one beat. Beats are strings, one per stroke.
const normBeats = b => b.map((x,i)=> ({stroke:i+1, to:0, text:x}));

// validate: exactly one beat per stroke
let warns=[];
for(const r of ORDER){
  const sc=strokes[r].strokes.length, bc=D[r].b.length;
  if(sc!==bc) warns.push(`${r} (${strokes[r].kana}): ${sc} strokes but ${bc} beats`);
}
console.log(warns.length ? warns.join('\n') : 'One beat per stroke for all 46 ✓');

function block(r,i){
  const d=D[r], s=strokes[r];
  const hasArt=d.artBack||d.artFront;
  const sPaths0=s.strokes.map(p=>`<path class="sstroke" d="${p}"/>`).join('');
  const sPaths=d.sShift?`<g transform="translate(${d.sShift},0)">${sPaths0}</g>`:sPaths0;
  const mPaths=s.strokes.map((p,k)=>`<path class="mstroke" data-i="${k}" pathLength="1" d="${p}"/>`).join('');
  const beats=normBeats(d.b);
  const chips=beats.map(be=>`<span class="beat">${esc(be.text)}</span>`).join('');
  const back = hasArt ? (d.artBack||'') : `<text class="emoji" x="54" y="74" text-anchor="middle" font-size="58" opacity="0.92">${d.e}</text>`;
  const keyLead = hasArt ? '' : d.e+' ';
  return `
  <div class="block" id="k-${r}">
    <div class="lab"><span class="kana">${s.kana}</span><span class="rom">${r}</span><span class="num">${i+1}/46</span></div>
    <div class="pair">
      <div class="mini">
        <div class="sty">STATIC</div>
        <svg class="art" viewBox="0 0 109 109">${back}${sPaths}${d.artFront||''}</svg>
        <div class="key">${keyLead}${esc(d.k)}</div>
        <div class="hook">${esc(d.h)}</div>
      </div>
      <div class="mini motionwrap" data-beats="${escAttr(JSON.stringify(beats))}">
        <div class="sty">MOTION · tap to replay</div>
        <svg class="art mn" viewBox="0 0 109 109">${mPaths}${d.mFront||''}</svg>
        <div class="chant">${chips}</div>
      </div>
    </div>
  </div>`;
}

const blocks = ORDER.map((r,i)=>block(r,i)).join('\n');

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>FKTI Hiragana Mnemonics — full set mock (static + motion)</title>
<style>
 :root{--ink:#13182B;--paper:#F7F4EC;--ver:#E2553B;--muted:#7a756a}
 *{box-sizing:border-box}
 body{margin:0;background:var(--ink);color:var(--paper);
   font-family:"Hiragino Mincho ProN","Yu Mincho",Georgia,serif;-webkit-font-smoothing:antialiased;padding:24px 16px 80px}
 header{max-width:1180px;margin:0 auto 18px;text-align:center}
 h1{font-size:1.5rem;margin:.2em 0}
 .sub{color:#c9c4b8;font-size:.9rem;margin:2px 0}
 .tip{max-width:780px;margin:10px auto 0;color:#a8a399;font-size:.8rem;line-height:1.5;font-family:system-ui,sans-serif;text-align:center}
 .tip b{color:#fff}
 .grid{max-width:1180px;margin:22px auto 0;display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:16px}
 .block{background:#1b2138;border:1px solid #2a3152;border-radius:16px;padding:12px 12px 14px}
 .lab{display:flex;align-items:baseline;gap:10px;margin:0 4px 8px}
 .lab .kana{font-size:1.8rem;line-height:1}
 .lab .rom{color:var(--ver);font-weight:700;font-size:1rem;font-family:system-ui,sans-serif}
 .lab .num{margin-left:auto;color:#6b7390;font-size:.72rem;font-family:system-ui,sans-serif}
 .pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}
 .mini{background:var(--paper);color:var(--ink);border-radius:12px;padding:8px 8px 10px;text-align:center}
 .sty{font-family:system-ui,sans-serif;font-size:.6rem;letter-spacing:.12em;color:var(--ver);font-weight:700;margin-bottom:2px}
 .art{width:100%;max-width:150px;aspect-ratio:1/1;display:block;margin:0 auto}
 .motionwrap .art{cursor:pointer}
 .sstroke{fill:none;stroke:var(--ink);stroke-width:5.4;stroke-linecap:round;stroke-linejoin:round}
 .blink{animation:blink 1.1s steps(1,end) infinite}
 @keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
 .mstroke{fill:none;stroke:var(--ink);stroke-width:5.6;stroke-linecap:round;stroke-linejoin:round;
   stroke-dasharray:1 2;stroke-dashoffset:1;transition:stroke-dashoffset .6s linear,stroke .25s}
 .mstroke.active{stroke:var(--ver)}
 .key{font-size:.82rem;font-weight:700;margin:5px 0 1px}
 .hook{font-size:.68rem;color:var(--muted);line-height:1.3;font-family:system-ui,sans-serif;min-height:2.2em}
 .chant{display:flex;flex-wrap:wrap;justify-content:center;gap:4px;margin-top:5px;font-family:system-ui,sans-serif}
 .beat{font-size:.62rem;padding:2px 6px;border-radius:999px;background:#ece5d8;color:var(--muted);transition:all .2s}
 .beat.on{background:var(--ver);color:#fff;transform:scale(1.06)}
 footer{max-width:780px;margin:34px auto 0;color:#a8a399;font-size:.76rem;line-height:1.6;text-align:center;font-family:system-ui,sans-serif}
 footer b{color:#fff}
</style></head><body>
<header>
 <p class="sub">深い関係学び · Deeply Connected Learning</p>
 <h1>Hiragana mnemonics — full-set mock</h1>
 <p class="sub">46 characters · two learning styles side by side</p>
 <p class="tip"><b>STATIC</b> = a hook in the shape (emoji = placeholder for real art; あ い う now show bespoke sketches).
   <b>MOTION</b> = say the chant while you draw — tap any motion character to replay.
   Tell me which to <b>approve</b> and which need <b>alternates</b>.</p>
</header>
<div class="grid">
${blocks}
</div>
<footer>
 <b>Mock for review.</b> Motion chants run on the KanjiVG stroke vectors already in the repo —
 no licensing, no image generation, 100% FKTI-owned. Static art becomes bespoke vector once a concept is approved.
</footer>
<script>
 function animate(svg){
   const wrap=svg.closest('.motionwrap');
   const strokes=[...svg.querySelectorAll('.mstroke')];
   const chips=[...wrap.querySelectorAll('.beat')];
   const beats=JSON.parse(wrap.dataset.beats);
   let i=0,timer=null;
   // instant disappear (no transition) — the character vanishes rather than un-drawing
   function vanish(){
     strokes.forEach(s=>{s.style.transition='none';s.style.strokeDashoffset='1';s.classList.remove('active');});
     chips.forEach(c=>c.classList.remove('on'));
   }
   function step(){
     const be=beats[i];
     strokes.forEach(s=>s.classList.remove('active'));
     const st=strokes[be.stroke-1];
     if(st){st.style.strokeDashoffset=String(be.to);st.classList.add('active');}
     chips.forEach((c,k)=>c.classList.toggle('on',k===i));
     i++;
     if(i>=beats.length){i=0;timer=setTimeout(()=>{vanish();timer=setTimeout(draw,500);},3500);}
     else timer=setTimeout(step,820);
   }
   // re-enable the stroke-dashoffset transition, then draw from the first beat
   function draw(){strokes.forEach(s=>{s.style.transition='';});i=0;step();}
   wrap.addEventListener('click',()=>{clearTimeout(timer);vanish();timer=setTimeout(draw,200);});
   draw();
 }
 document.querySelectorAll('.mn').forEach((s,i)=>setTimeout(()=>animate(s), i*80));
</script>
</body></html>`;

fs.writeFileSync(path.join(__dirname, '..', 'mnem-gallery.html'), html);
console.log('Wrote mnem-gallery.html');
