// Public QA static resources only. No accounts, cookies, auth or API/socket calls.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),base='https://yamb-reconnect-qa.onrender.com';
const html=fs.readFileSync(path.join(root,'www/index.html'),'utf8');
const refs=[...html.matchAll(/(?:src|href)="([^"\s]+\.(?:js|css)(?:\?[^"\s]*)?)"/g)].map(x=>x[1]).filter(x=>!/^https?:/.test(x)&&fs.existsSync(path.join(root,'www',x.split('?')[0])));
const inventory=[...new Set(refs)].map(url=>({url,bytes:fs.statSync(path.join(root,'www',url.split('?')[0])).size}));
const versioned=file=>refs.find(x=>x.split('?')[0]===file)||file;
const samples=['',versioned('teme.css'),versioned('style.css'),versioned('game.js'),versioned('managers.js'),versioned('theme-game-header.js'),versioned('theme-settings-room.js'),'assets/green-clay-balkan-diorama-v4.png','assets/green-soft-clay/splash-title-soft-clay-v2.png?v=1'];
async function main(){
 const rows=[];
 for(let pass=1;pass<=2;pass++){
  let next=0;
  await Promise.all(Array.from({length:3},async()=>{
   while(next<samples.length){
    const source=samples[next++],start=performance.now();
    try{
     const response=await fetch(base+'/'+source,{signal:AbortSignal.timeout(20000),headers:{'Accept-Encoding':'gzip, br'}});
     const headersMs=performance.now()-start,body=Buffer.from(await response.arrayBuffer());
     const file=source?path.join(root,'www',source.split('?')[0]):path.join(root,'www/index.html');
     const local=fs.readFileSync(file),text=/\.(?:js|css)(?:\?|$)/.test(source)||!source;
     const normalized=b=>text?Buffer.from(b.toString('utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n')):b;
     const hash=b=>crypto.createHash('sha256').update(normalized(b)).digest('hex');
     rows.push({pass,source:source||'/',status:response.status,headersMs:Math.round(headersMs),bodyCompleteMs:Math.round(performance.now()-start),decodedBodyBytes:body.length,contentLength:response.headers.get('content-length'),contentEncoding:response.headers.get('content-encoding'),cacheControl:response.headers.get('cache-control'),matchesLocalNormalized:hash(body)===hash(local)});
    }catch(error){rows.push({pass,source:source||'/',error:error.name+': '+error.message,elapsedMs:Math.round(performance.now()-start)});}
   }
  }));
 }
 const report={at:new Date().toISOString(),host:base,scope:'Two bounded public static GET passes, concurrency3, Node HTTP client. Not WebView timings, cold Render/phone cache proof, CPU/decode measurement or a signed-in game.',inventory:{files:inventory.length,totalBytes:inventory.reduce((n,x)=>n+x.bytes,0),largest:[...inventory].sort((a,b)=>b.bytes-a.bytes).slice(0,12)},rows};
 fs.mkdirSync(path.join(root,'tmp/startup-profile-2026-10-30'),{recursive:true});
 fs.writeFileSync(path.join(root,'tmp/startup-profile-2026-10-30/public-resources.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
