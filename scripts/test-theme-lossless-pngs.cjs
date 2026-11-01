// Fresh isolated browser; public artwork only, no app constructor or accounts.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YAMB_PLAYWRIGHT_PATH||'C:/Users/andri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {execFileSync}=require('node:child_process');
const temporary='tmp/theme-lossless-2026-11-01/applied.json';
const report=JSON.parse(fs.readFileSync(fs.existsSync(temporary)?temporary:'docs/theme-visual-audit/startup-lossless-2026-11-01/compression.json'));
const allowed=new Map(report.rows.map(row=>[row.source,row]));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.origin!=='http://lossless.test')return route.abort();
   if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated PNG equality test</title>'});
   const match=url.pathname.match(/^\/(before|after)\/(assets\/.+\.png)$/);if(!match||!allowed.has(match[2]))return route.abort();
   const row=allowed.get(match[2]),before=match[1]==='before'&&row.changed,backup=path.join('tmp/theme-lossless-2026-11-01/originals',match[2]);
   const body=before?(fs.existsSync(backup)?fs.readFileSync(backup):execFileSync('git',['show','ede76cb5a16ae4b89c8720287e6f3d198eb5bc3c:www/'+match[2]],{maxBuffer:8*1024*1024,windowsHide:true})):fs.readFileSync(path.join('www',match[2]));
   await route.fulfill({contentType:'image/png',body});
  });
  await page.goto('http://lossless.test/');
  const results=[];
  for(const row of report.rows)results.push(await page.evaluate(async row=>{
   const load=async variant=>{const img=new Image();img.src='/'+variant+'/'+row.source;await img.decode();return img;};
   const after=await load('after');if(after.naturalWidth!==row.width||after.naturalHeight!==row.height)throw Error('Dimensions:'+row.source);
   if(row.changed){
    const before=await load('before'),canvas=document.createElement('canvas');canvas.width=row.width;canvas.height=row.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(before,0,0);const a=ctx.getImageData(0,0,row.width,row.height).data;
    ctx.clearRect(0,0,row.width,row.height);ctx.drawImage(after,0,0);const b=ctx.getImageData(0,0,row.width,row.height).data;
    if(a.some((value,i)=>value!==b[i]))throw Error('Browser pixels differ:'+row.source);
   }return{source:row.source,decoded:true,changed:row.changed,browserPixelsEqual:row.changed?true:null};
  },row));
  assert.equal(results.length,280);assert.equal(results.filter(row=>row.browserPixelsEqual).length,138);
  fs.mkdirSync('tmp/theme-lossless-2026-11-01',{recursive:true});
  fs.writeFileSync('tmp/theme-lossless-2026-11-01/browser.json',JSON.stringify({date:'2026-11-01',status:'pass',scope:'Fresh isolated Edge; allowlisted local PNGs only.280decoded/138before-after canvas pixel equal. Not network/device timing.',results},null,2)+'\n');
  console.log('PASS:280local PNG decoded;138changed PNGs have identical rendered canvas pixels and dimensions before/after.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
