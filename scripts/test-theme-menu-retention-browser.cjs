// Real menu PNG/decode test on localhost, actual YambApp methods without constructor.
// No auth, socket, real account, game, ads or reward APIs.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {chromium}=require(process.env.YAMB_PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),www=path.join(root,'www');
const baseline=process.argv.includes('--baseline'),ref='7985cb3928fa9ecd3719d941cf4c692be181dfa1';
const gameSource=(baseline?execFileSync('git',['show',ref+':www/game.js'],{cwd:root,encoding:'utf8',windowsHide:true}):fs.readFileSync(path.join(www,'game.js'),'utf8')).replace('window.app = new YambApp();','globalThis.MenuApp=YambApp;');
const htmlSource=fs.readFileSync(path.join(www,'index.html'),'utf8');
const menu=htmlSource.split('<div id="main-menu"')[1].split('<div id="game-scene"')[0];
const greenSources=[...new Set([...menu.matchAll(/data-theme-src="([^"]+)"/g)].map(x=>x[1]))];
const html=`<!doctype html><html><meta charset="utf-8"><body><div id="main-menu" class="screen active">${greenSources.map(src=>`<img data-theme-src="${src}" alt="">`).join('')}</div><script src="/config.js"></script><script src="/theme-quality-assets.js"></script><script src="/measured-game.js"></script></body></html>`;
async function main(){
 const errors=[];
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
  if(pathname==='/measured-game.js'){res.setHeader('Content-Type','application/javascript');res.end(gameSource);return;}
  const file=path.resolve(www,'.'+decodeURIComponent(pathname));
  if(!file.startsWith(www+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'image/png');
  res.setHeader('Cache-Control','public, max-age=3600');res.end(fs.readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:411,height:891},serviceWorkers:'block'});
  await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  await context.addInitScript(()=>{
   const OriginalImage=window.Image;window.menuMetrics={phase:'setup',images:[],decodes:[]};
   window.Image=function(...args){
    const image=new OriginalImage(...args),phase=window.menuMetrics.phase;
    window.menuMetrics.images.push({phase});const decode=image.decode.bind(image);
    image.decode=async()=>{const start=performance.now();try{return await decode();}finally{window.menuMetrics.decodes.push({phase,source:image.getAttribute('src'),ms:Math.round((performance.now()-start)*10)/10});}};
    return image;
   };
   window.Image.prototype=OriginalImage.prototype;
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(origin,{waitUntil:'load'});
  const result=await page.evaluate(async()=>{
   const app=Object.create(MenuApp.prototype);app.themeWarmups=new Map();
   const rows=[];let firstWarmup,firstSources;
   for(const theme of ['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna']){
    window.menuMetrics.phase=theme;
    const sources=app.getThemeStartupSources(theme),start=performance.now(),count=window.menuMetrics.images.length;
    const warmup=app.warmThemePack(theme),ready=await warmup.critical;
    rows.push({theme,sourceCount:sources.length,ready,newImages:window.menuMetrics.images.length-count,readyMs:Math.round(performance.now()-start)});
    if(theme==='dark'){firstWarmup=warmup;firstSources=sources;}
   }
   const missingBeforeRevisit=firstSources.filter(source=>!app.themePreloadImages.get(globalThis.resolveThemeQualityAsset?.(source)||source)?.ready);
   window.menuMetrics.phase='dark-revisit';const count=window.menuMetrics.images.length,start=performance.now();
   const revisit=app.warmThemePack('dark'),ready=await revisit.critical;
   const revisitRow={newWarmup:revisit!==firstWarmup,ready,missingBefore:missingBeforeRevisit.length,newImages:window.menuMetrics.images.length-count,readyMs:Math.round(performance.now()-start),missingAfter:firstSources.filter(source=>!app.themePreloadImages.get(globalThis.resolveThemeQualityAsset?.(source)||source)?.ready).length};
   const beforeFast=window.menuMetrics.images.length;
   const repeated=app.warmThemePack('dark');await repeated.critical;
   return {rows,revisit:revisitRow,immediateRepeat:{sameWarmup:repeated===revisit,newImages:window.menuMetrics.images.length-beforeFast},metrics:window.menuMetrics,retainedEntries:app.themePreloadImages.size,retainedPixels:[...app.themePreloadImages.values()].reduce((sum,entry)=>sum+entry.pixels,0)};
  });
  assert.deepEqual(errors,[]);assert(result.rows.every(row=>row.ready));assert(result.revisit.missingBefore>0);
  if(!baseline){assert(result.revisit.newWarmup);assert(result.revisit.newImages>0);assert.equal(result.revisit.missingAfter,0);assert.equal(result.immediateRepeat.newImages,0);assert(result.immediateRepeat.sameWarmup);}
  const report={date:'2026-10-30',mode:baseline?'before':'after',baselineCommit:ref,scope:'Isolated Edge/mobile viewport411×891; actual menu methods and production PNGs, localhost image loading/decode with synthetic theme navigation. No YambApp constructor/auth/accounts/socket, full UI audit, network emulation or Android ANR proof. readyMs is local fixture time, not phone/QA-server latency.',...result,errors};
  const out=path.join(root,'tmp/startup-profile-2026-10-30');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,`menu-browser-${report.mode}.json`),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({mode:report.mode,themes:result.rows.length,readyThemes:result.rows.filter(r=>r.ready).length,revisit:result.revisit,immediateRepeat:result.immediateRepeat,retainedEntries:result.retainedEntries,retainedPixels:result.retainedPixels,errors},null,2));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
