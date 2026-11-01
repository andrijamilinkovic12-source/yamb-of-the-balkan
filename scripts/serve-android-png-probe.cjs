// Temporary isolated PNG fixture; no game constructor, auth, socket or account API.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),www=path.join(root,'www');
const profile=JSON.parse(fs.readFileSync(path.join(root,'tmp/theme-switch-profile-2026-10-30/packs.json'),'utf8'));
const pack=profile.rows.find(row=>row.theme==='easter');
if(!pack||pack.assets.length!==28)throw Error('Generate current profile-theme-switch-packs.cjs first');
const assets=pack.assets.map(({resolved,kind,bytes,width,height})=>({source:resolved,kind,bytes,width,height}));
const allowed=new Map(assets.map(row=>['/'+row.source.split('?')[0],row]));
const results=path.join(root,'tmp/android-png-isolation-2026-10-31');fs.mkdirSync(results,{recursive:true});
const client=String.raw`
const assets=window.probeAssets, mode=new URLSearchParams(location.search).get('mode')==='qa'?'qa':'local';
const rows=[],held=[],started=performance.now();let maxLagMs=0,over200ms=0,maxTaskMs=0;
let expected=performance.now()+100;
const pulse=setInterval(()=>{const now=performance.now(),lag=Math.max(0,now-expected);maxLagMs=Math.max(maxLagMs,lag);if(lag>200)over200ms++;expected=now+100;},100);
let observer;try{observer=new PerformanceObserver(list=>{for(const e of list.getEntries())maxTaskMs=Math.max(maxTaskMs,e.duration);});observer.observe({type:'longtask',buffered:true});}catch(_){}
document.querySelector('#mode').textContent=mode==='qa'?'QA server PNG':'Local PNG';
document.querySelector('#status').textContent='Učitavanje 0/28';
const round=value=>Math.round(value*10)/10;
function load(asset){return new Promise(resolve=>{
 const image=new Image();held.push(image);const start=performance.now();let loadedAt=null,settled=false;
 image.decoding='async';image.fetchPriority='high';image.referrerPolicy='no-referrer';
 if(mode==='qa')image.crossOrigin='anonymous'; // cross-origin requests omit credentials
 const source=mode==='qa'?'https://yamb-reconnect-qa.onrender.com/'+asset.source:'/png/'+asset.source;
 const finish=(status,fallback=false)=>{if(settled)return;settled=true;clearTimeout(timer);
  const end=performance.now();const entries=performance.getEntriesByName(image.src),resource=entries.at(-1);
  const row={source:asset.source,status,elapsedMs:round(end-start),loadMs:loadedAt===null?null:round(loadedAt-start),decodeMs:loadedAt===null?null:round(end-loadedAt),fallback,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,
   resourceDurationMs:resource?round(resource.duration):null,resourceTransferBytes:resource?.transferSize||0};
  rows.push(row);document.querySelector('#status').textContent='Završeno '+rows.length+'/28';resolve(row);
 };
 const timer=setTimeout(()=>finish(loadedAt===null?'timeout-load':'timeout-decode'),60000);
 image.onload=async()=>{if(settled)return;loadedAt=performance.now();let fallback=false;try{if(image.decode)await image.decode();}catch(_){fallback=true;}finish('ready',fallback);};
 image.onerror=()=>finish('error');image.src=source;document.querySelector('#icons').append(image);
});}
// Same28image wave as menu18plus Settings10; no visual gate or game work.
Promise.all(assets.map(load)).then(async()=>{
 clearInterval(pulse);observer?.disconnect();
 const report={mode,android:/Android/.test(navigator.userAgent),viewportWidth:innerWidth,viewportHeight:innerHeight,dpr:devicePixelRatio,
  totalMs:round(performance.now()-started),maxLagMs:round(maxLagMs),over200ms,maxTaskMs:round(maxTaskMs),rows};
 const ready=rows.filter(row=>row.status==='ready').length;
 document.querySelector('#status').textContent=ready+'/28 spremno';
 document.querySelector('#summary').textContent=JSON.stringify({totalMs:report.totalMs,maxLagMs:report.maxLagMs,maxTaskMs:report.maxTaskMs,errors:28-ready},null,2);
 try{const response=await fetch('/result',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});document.querySelector('#saved').textContent=response.ok?'Rezultat sačuvan lokalno':'Rezultat nije sačuvan';}catch(_){document.querySelector('#saved').textContent='Lokalni server nije dostupan';}
});
`;
const html=`<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Izolovani PNG test</title><style>body{margin:18px;background:#17242e;color:#eef5f9;font:16px system-ui}h1{font-size:21px}#icons{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}img{width:65px;height:65px;object-fit:contain;background:#2b3d49}pre{font-size:17px;white-space:pre-wrap}p{line-height:1.35}</style><h1>Izolovani PNG test</h1><p id="mode"></p><h2 id="status"></h2><pre id="summary"></pre><p id="saved"></p><div id="icons"></div><p>28 Easter PNG. Bez naloga, igre, oglasa i nagrade. Ovo je Chrome test; nije isti proces kao WebView igre.</p><script>window.probeAssets=${JSON.stringify(assets)};</script><script src="/probe.js"></script></html>`;
function cleanReport(input){
 if(!input||!['qa','local'].includes(input.mode)||typeof input.android!=='boolean'||!Array.isArray(input.rows)||input.rows.length!==28)throw Error('Invalid result');
 const numeric=(obj,key,nullable=false)=>{const value=obj[key];if(nullable&&value===null)return null;if(!Number.isFinite(value)||value<0||value>100000000)throw Error('Invalid number');return value;};
 const seen=new Set();
 const rows=input.rows.map(row=>{
  if(!assets.some(a=>a.source===row.source)||seen.has(row.source)||!['ready','error','timeout-load','timeout-decode'].includes(row.status))throw Error('Invalid PNG row');seen.add(row.source);
  const output={source:row.source,status:row.status,fallback:row.fallback===true};
  for(const key of ['elapsedMs','naturalWidth','naturalHeight','resourceTransferBytes'])output[key]=numeric(row,key);
  for(const key of ['loadMs','decodeMs','resourceDurationMs'])output[key]=numeric(row,key,true);
  return output;
 });
 const report={mode:input.mode,android:input.android,rows};
 for(const key of ['viewportWidth','viewportHeight','dpr','totalMs','maxLagMs','over200ms','maxTaskMs'])report[key]=numeric(input,key);
 return report;
}
function start(){
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');res.setHeader('Cache-Control','no-store');
   if(req.method==='GET'&&url.pathname==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html);return;}
   if(req.method==='GET'&&url.pathname==='/probe.js'){res.setHeader('Content-Type','application/javascript');res.end(client);return;}
   if(req.method==='GET'&&url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
   if(req.method==='GET'&&url.pathname.startsWith('/png/')){
    const assetPath=url.pathname.slice(4);if(!allowed.has(assetPath)){res.writeHead(404);res.end();return;}
    const file=path.join(www,assetPath.slice(1));res.setHeader('Content-Type','image/png');res.end(fs.readFileSync(file));return;
   }
   if(req.method==='POST'&&url.pathname==='/result'){
    // Only this fixture may write fixed-schema metrics to the local report folder.
    if(req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403);res.end();return;}
    let body='';for await(const chunk of req){body+=chunk;if(body.length>50000){res.writeHead(413);res.end();return;}}
    const clean=cleanReport(JSON.parse(body));const file=path.join(results,`${clean.android?'android':'desktop'}-${clean.mode}-${Date.now()}.json`);
    fs.writeFileSync(file,JSON.stringify({at:new Date().toISOString(),scope:'Isolated28publicPNG images in Chrome; no account/game APIs. Cross-origin QA CORS omits credentials. Resource transferSize0may mean cache or cross-origin timing restriction.',packBytes:pack.totalBytes,...clean},null,2)+'\n');
    res.setHeader('Content-Type','application/json');res.end('{"saved":true}');
    console.log(JSON.stringify({result:file,mode:clean.mode,android:clean.android,ready:clean.rows.filter(r=>r.status==='ready').length,totalMs:clean.totalMs,maxLagMs:clean.maxLagMs,maxTaskMs:clean.maxTaskMs}));return;
   }
   res.writeHead(404);res.end();
  }catch(_){res.writeHead(400);res.end('Invalid fixture request');}
 });
 server.listen(0,'127.0.0.1',()=>{const port=server.address().port;console.log(JSON.stringify({ready:true,port,localUrl:`http://127.0.0.1:${port}/?mode=local`,androidLocalUrl:`http://10.0.2.2:${port}/?mode=local`,androidQaUrl:`http://10.0.2.2:${port}/?mode=qa`,assets:assets.length,bytes:pack.totalBytes}));});
 const lifetime=setTimeout(()=>server.close(()=>process.exit(0)),12*60*1000);
 process.stdin.setEncoding('utf8');process.stdin.on('data',data=>{if(data.trim()==='stop'){clearTimeout(lifetime);server.close(()=>process.exit(0));}});
 return server;
}
module.exports={cleanReport,assets};if(require.main===module)start();
