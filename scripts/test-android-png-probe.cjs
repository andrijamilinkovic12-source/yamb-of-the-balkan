// Validate the local fixture and its write/read boundaries in a fresh desktop browser.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.YAMB_PLAYWRIGHT_PATH||'playwright');
const origin=process.argv[2];if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('Expected running local fixture origin');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const context=await browser.newContext({viewport:{width:411,height:891},serviceWorkers:'block'});
  await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/?mode=local');await page.locator('#saved').filter({hasText:'Rezultat sačuvan lokalno'}).waitFor({timeout:30000});
  assert.equal(await page.locator('#status').textContent(),'28/28 spremno');assert.deepEqual(errors,[]);
  for(const route of ['/png/not-allowed.png','/server.js','/png/assets/../game.js'])assert.equal((await context.request.get(origin+route)).status(),404);
  assert.equal((await context.request.post(origin+'/result',{data:{},headers:{Origin:'https://foreign.example'}})).status(),403);
  assert.equal((await context.request.post(origin+'/result',{data:{},headers:{Origin:origin}})).status(),400);
  const dir='tmp/android-png-isolation-2026-10-31',file=fs.readdirSync(dir).filter(f=>f.startsWith('desktop-local-')).sort().at(-1),report=JSON.parse(fs.readFileSync(dir+'/'+file));
  assert.equal(report.android,false);assert.equal(report.rows.length,28);assert(report.rows.every(row=>row.status==='ready'));
  const {cleanReport}=require('./serve-android-png-probe.cjs');report.account='never-save';report.rows[0].secret='never-save';
  assert(!JSON.stringify(cleanReport(report)).includes('never-save'));
  assert.throws(()=>cleanReport({...report,rows:report.rows.map((row,i)=>i===0?{...row,source:'../private.png'}:row)}));
  console.log('PASS:28actual local PNG load/decode, local result saved; arbitrary files/foreign POST/invalid schema rejected; extra fields discarded. Desktop validation only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
