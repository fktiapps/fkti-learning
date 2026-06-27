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
 ka:{e:'🪁',k:'Kite',h:'the cross is the kite frame, the curl its tail',b:['up goes the kite','cross the frame','kaa— tail flick']},
 ki:{e:'🔑',k:'Key',h:"sounds like 'key'; the bars are its teeth",b:['top tooth','second tooth','long stem','ki!—it turns']},
 ku:{e:'🐦',k:'Cuckoo beak',h:"one open beak going 'ku-ku'",b:["one beak — 'kuuu'"]},
 ke:{e:'🦵',k:'Kick',h:"stand tall, then kick — 'ke'",b:['stand up tall','the body','kick! — ke']},
 ko:{e:'🐛',k:'Two caterpillars',h:"two little curls, 'ko-ko'",b:['top curl — ko','bottom curl — ko']},
 sa:{e:'🪚',k:'Saw',h:"cross, hook, and saw — 'sa-sa'",b:['cross the top','hook down','saw it — sa!']},
 shi:{e:'😊',k:'A smile',h:"one swoosh up like a grin — 'she'",b:["one curve up — 'shiii'"]},
 su:{e:'🌀',k:'Swing',h:"a loop with a tail — swing through, 'su'",b:['down the pole','loop-and-swiiing — su']},
 se:{e:'🎯',k:'Set & aim',h:"cross, stand, swoosh — ready, 'set'!",b:['cross bar','the vertical','swoosh — set!']},
 so:{e:'🧵',k:'Sewing thread',h:"one zig-zag stitch — 'so' (sew)",b:["one zig-zag — 'sooo'"]},
 ta:{e:'🎉',k:'Ta-da!',h:"draw it and finish with a 'ta-da!'",b:['cross the top','down the stem','ta-','-da! the box']},
 chi:{e:'🐔',k:'A chick',h:"little beak, big belly — 'chi-ck'",b:['little beak','big belly — chiii']},
 tsu:{e:'🌊',k:'Tsunami',h:'one curling wave — tsu-nami!',b:["one swoop — 'tsuuu'"]},
 te:{e:'🖐️',k:'Hand (te)',h:"'te' = 手 = hand; the stroke is the arm",b:["one bend — reach out, 'te'"]},
 to:{e:'🦶',k:'Toe + needle',h:"a needle stuck in a toe — 'toe'",b:['the needle','the toe curve — to!']},
 na:{e:'🏟️',k:'The cheer',h:'cross = na-na, tick = hey, curl = 👋 goodbye',b:['na na na na','na na na na','hey hey hey','👋 goodbye']},
 ni:{e:'🦵',k:'Knee',h:"sounds like 'knee'; two little knees",b:['the post','knee one','knee two — niii']},
 nu:{e:'🍜',k:'Noodles',h:"a bowl of noodles with a swirl — 'nu'",b:['cross down','swirl the noodles — nuuu']},
 ne:{e:'🐱',k:'Neko (cat)',h:"'ne' for neko; the loop is its tail",b:['the post','loop the tail — ne']},
 no:{e:'🚫',k:'No sign',h:"one big swirl — like a 'no' circle",b:["one spiral — 'nooo'"]},
 ha:{e:'😄',k:'Ha-ha!',h:"a laughing face — 'ha-ha-ha'",b:['the post','the cross','loop — ha-ha!']},
 hi:{e:'😆',k:'Big grin',h:"one smiling swoop — 'hee!'",b:["one grin — 'heee'"]},
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
  const sPaths=s.strokes.map(p=>`<path class="sstroke" d="${p}"/>`).join('');
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
      <div class="mini motionwrap" data-beats='${JSON.stringify(beats)}'>
        <div class="sty">MOTION · tap to replay</div>
        <svg class="art mn" viewBox="0 0 109 109">${mPaths}</svg>
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
 .mstroke{fill:none;stroke:var(--ink);stroke-width:5.6;stroke-linecap:round;stroke-linejoin:round;
   stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset .6s linear,stroke .25s}
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
   function reset(){strokes.forEach(s=>{s.style.strokeDashoffset='1';s.classList.remove('active');});chips.forEach(c=>c.classList.remove('on'));}
   function step(){
     const be=beats[i];
     strokes.forEach(s=>s.classList.remove('active'));
     const st=strokes[be.stroke-1];
     if(st){st.style.strokeDashoffset=String(be.to);st.classList.add('active');}
     chips.forEach((c,k)=>c.classList.toggle('on',k===i));
     i++;
     if(i>=beats.length){i=0;timer=setTimeout(()=>{reset();timer=setTimeout(step,150);},1500);}
     else timer=setTimeout(step,820);
   }
   function start(){reset();timer=setTimeout(step,150);}
   wrap.addEventListener('click',()=>{clearTimeout(timer);i=0;start();});
   start();
 }
 document.querySelectorAll('.mn').forEach((s,i)=>setTimeout(()=>animate(s), i*80));
</script>
</body></html>`;

fs.writeFileSync(path.join(__dirname, '..', 'mnem-gallery.html'), html);
console.log('Wrote mnem-gallery.html');
