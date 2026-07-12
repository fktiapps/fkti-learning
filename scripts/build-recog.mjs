const { chromium } = require('playwright-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT='/workspace/fkti-learning';
const MIME={'.html':'text/html','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.css':'text/css','.png':'image/png'};
const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/kanji.html';const fp=path.join(ROOT,p);fs.readFile(fp,(e,d)=>{if(e){res.writeHead(404);res.end('404');return;}res.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});res.end(d);});});

const K=12; // resample points per stroke
(async()=>{
 await new Promise(r=>server.listen(8095,r));
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
 const p=await b.newPage();
 const payload=Buffer.from(JSON.stringify({sub:10,name:'Greg',exp:9999999999})).toString('base64url');
 await p.addInitScript((t)=>{try{localStorage.setItem('fkti_auth',t);}catch(e){}},'a.'+payload+'.x');
 await p.goto('http://localhost:8095/kanji.html',{waitUntil:'networkidle'});
 const kanji = await p.evaluate(()=>[...new Set(ALL.map(c=>c.k))]);
 console.log('extracting',kanji.length,'kanji...');
 const templates = await p.evaluate(async(K)=>{
  function resample(pts,K){ // pts:[{x,y}] -> K points equally spaced by arclength
   if(pts.length===0)return Array.from({length:K},()=>({x:0,y:0}));
   if(pts.length===1)return Array.from({length:K},()=>({x:pts[0].x,y:pts[0].y}));
   let L=0;const d=[0];for(let i=1;i<pts.length;i++){L+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);d.push(L);}
   if(L===0)return Array.from({length:K},()=>({x:pts[0].x,y:pts[0].y}));
   const out=[];for(let j=0;j<K;j++){const t=L*j/(K-1);let i=1;while(i<d.length&&d[i]<t)i++;if(i>=pts.length)i=pts.length-1;const t0=d[i-1],t1=d[i],f=t1>t0?(t-t0)/(t1-t0):0;out.push({x:pts[i-1].x+(pts[i].x-pts[i-1].x)*f,y:pts[i-1].y+(pts[i].y-pts[i-1].y)*f});}return out;
  }
  const out=[];
  for(const k of ALL.map(c=>c.k)){
   try{
    const strokes=await loadStrokes(k); if(!strokes||!strokes.length){continue;}
    let rs=strokes.map(s=>resample(s.pts,K));
    // bbox-normalize over all points (independent axes)
    let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
    rs.forEach(s=>s.forEach(q=>{if(q.x<minX)minX=q.x;if(q.x>maxX)maxX=q.x;if(q.y<minY)minY=q.y;if(q.y>maxY)maxY=q.y;}));
    const w=Math.max(1e-6,maxX-minX),h=Math.max(1e-6,maxY-minY);
    const s=rs.map(st=>{const a=[];st.forEach(q=>{a.push(Math.round((q.x-minX)/w*100),Math.round((q.y-minY)/h*100));});return a;});
    out.push({k,s});
   }catch(e){}
  }
  return out;
 },K);
 await b.close(); server.close();
 console.log('extracted',templates.length,'templates');

 // group by stroke count -> shards
 const byN={};
 for(const t of templates){const n=t.s.length;(byN[n]=byN[n]||[]).push(t);}
 const dir=ROOT+'/recog'; fs.mkdirSync(dir,{recursive:true});
 const manifest={K,counts:{}};
 for(const n of Object.keys(byN)){fs.writeFileSync(dir+'/'+n+'.json',JSON.stringify({n:+n,list:byN[n]}));manifest.counts[n]=byN[n].length;}
 fs.writeFileSync(dir+'/manifest.json',JSON.stringify(manifest));
 const totalBytes=fs.readdirSync(dir).reduce((a,f)=>a+fs.statSync(dir+'/'+f).size,0);
 console.log('wrote',Object.keys(byN).length,'shards, total',(totalBytes/1024).toFixed(0),'KB; stroke-count range',Math.min(...Object.keys(byN).map(Number)),'-',Math.max(...Object.keys(byN).map(Number)));

 // ---- matcher (mirrors runtime) + perturbation benchmark ----
 const deq=s=>s.map(a=>{const p=[];for(let i=0;i<a.length;i+=2)p.push({x:a[i]/100,y:a[i+1]/100});return p;});
 function strokeDist(a,b){let f=0,r=0;const K=a.length;for(let j=0;j<K;j++){f+=Math.hypot(a[j].x-b[j].x,a[j].y-b[j].y);r+=Math.hypot(a[j].x-b[K-1-j].x,a[j].y-b[K-1-j].y);}return Math.min(f,r)/K;}
 function charCost(drawn,tmpl){const nd=drawn.length,nt=tmpl.length,m=Math.min(nd,nt);let c=0;for(let i=0;i<m;i++)c+=strokeDist(drawn[i],tmpl[i]);return c/m+0.35*Math.abs(nd-nt);}
 function recognize(drawnStrokes){ // drawnStrokes: array of {x,y}[] point arrays (already resampled+bboxnorm floats)
  const nd=drawnStrokes.length; const cands=[];
  for(const n of [nd-1,nd,nd+1]){const sh=byN[n]; if(!sh)continue; for(const t of sh){cands.push({k:t.k,c:charCost(drawnStrokes,deq(t.s))});}}
  cands.sort((a,b)=>a.c-b.c); return cands.slice(0,5).map(x=>x.k);
 }
 // perturb: jitter + slight scale/shift, simulating sloppy handwriting
 function perturb(strokesF){const jx=(Math.random()-.5)*.06,jy=(Math.random()-.5)*.06,sx=1+(Math.random()-.5)*.12,sy=1+(Math.random()-.5)*.12;
  return strokesF.map(st=>st.map(q=>({x:Math.min(1,Math.max(0,q.x*sx+jx+(Math.random()-.5)*.05)),y:Math.min(1,Math.max(0,q.y*sy+jy+(Math.random()-.5)*.05))})));}
 const sample=templates.slice().sort(()=>Math.random()-.5).slice(0,400);
 let t1=0,t5=0;
 for(const t of sample){const drawn=perturb(deq(t.s));const res=recognize(drawn);if(res[0]===t.k)t1++;if(res.includes(t.k))t5++;}
 console.log('PERTURBED benchmark on',sample.length,'kanji: top1',(t1/sample.length*100).toFixed(1)+'%  top5',(t5/sample.length*100).toFixed(1)+'%');
})();
