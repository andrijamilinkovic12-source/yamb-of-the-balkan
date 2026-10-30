// Actual three room controllers and PNGs in an isolated DOM; no game/auth/socket.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {chromium}=require(process.env.YAMB_PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'../www'),baseline=process.argv.includes('--baseline'),ref='d38aa6aa35c794e06b98d79fdc4520766c1ddfb4';
const files=['theme-leaderboard-room.js','theme-online-players-room.js','theme-invite-friend-room.js'];
const themes=['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const markup=(attr,roles)=>roles.map(r=>`<img ${attr}="${r}" alt="">`).join('');
const html=`<!doctype html><html><meta charset="utf-8"><style>.screen{display:none}.screen.active{display:block}img{width:40px;height:40px}</style><body>
<div id="main-menu" class="screen active">Menu</div><div id="highscores-screen" class="screen">${markup('data-leaderboard-control',['identity','global','local','empty-loading'])}</div>
<div id="online-players-overlay" class="screen">${markup('data-online-role',['state','search','friend','spectate','duel','avatar'])}</div>
<div id="waiting-screen" class="screen"><img class="green-invite-header-icon" alt="">${markup('data-invite-role',['send','empty','friend','search','power'])}<div id="dynamic"></div></div>
<div id="game-scene" class="screen"><img data-online-role="spectate" alt=""><img data-leaderboard-control="empty-loading" alt=""></div>
<script src="/theme-quality-assets.js"></script>${files.map(f=>`<script src="/${f}"></script>`).join('')}</body></html>`;
async function main(){
 const requests=[],errors=[];let phase='startup';
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
  const file=path.resolve(root,'.'+decodeURIComponent(pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  const data=baseline&&files.includes(path.basename(file))?execFileSync('git',['show',`${ref}:www/${path.basename(file)}`],{windowsHide:true}):fs.readFileSync(file);
  if(file.endsWith('.png'))requests.push({phase,source:req.url,bytes:data.length});
  res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'image/png');res.end(data);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:411,height:891},serviceWorkers:'block'}),origin=`http://127.0.0.1:${server.address().port}`;
  await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.status()+' '+r.url());});
  await page.goto(origin,{waitUntil:'networkidle'});
  const startup=requests.filter(r=>r.phase==='startup');
  phase='hidden-theme-changes';for(const theme of themes){await page.evaluate(t=>document.body.className=t==='dark'?'':t+'-theme',theme);await page.waitForTimeout(40);}
  await page.waitForLoadState('networkidle');const hidden=requests.filter(r=>r.phase===phase),rows=[];
  if(!baseline){
   assert.equal(startup.length,0,'Hidden rooms fetched artwork at menu startup');assert.equal(hidden.length,0,'Hidden rooms fetched artwork on theme changes');
   for(const theme of themes){for(const room of ['highscores-screen','online-players-overlay','waiting-screen','game-scene']){
    phase=`${theme}-${room}`;
    await page.evaluate(({theme,room})=>{document.querySelectorAll('.screen').forEach(n=>n.classList.remove('active'));document.body.className=theme==='dark'?'':theme+'-theme';document.getElementById(room).classList.add('active');},{theme,room});
    await page.waitForFunction(({theme,room})=>[...document.getElementById(room).querySelectorAll('img')].every(img=>{
     const expected=img.dataset.leaderboardControl?themeLeaderboard.asset(img.dataset.leaderboardControl,theme):img.dataset.onlineRole?themeOnlinePlayers.asset(img.dataset.onlineRole,theme):img.dataset.inviteRole?themeInviteFriend.asset(img.dataset.inviteRole,theme):theme==='dark'?'assets/green-soft-clay/canonical/invite-friend-room-identity/invite-friend-room-v1.png?v=1':`assets/theme-packs/${theme}/canonical/invite-friend-room-identity/invite-friend-room-v1.png?v=1`;
     return img.complete&&img.naturalWidth>0&&img.src===new URL(expected,location.href).href;
    }),{theme,room});rows.push({theme,room,status:'PASS'});
   }}
   // Dynamic cards and inline-style overlays must work without a theme change.
   await page.evaluate(()=>{document.getElementById('waiting-screen').style.display='block';document.getElementById('dynamic').innerHTML='<img data-invite-role="power" alt="">';});
   await page.waitForFunction(()=>{const n=document.querySelector('#dynamic img');return n.complete&&n.naturalWidth>0;});
   // Theme changes while hidden must not prevent explicit ahead-of-entry preparation.
   await page.evaluate(()=>{document.querySelectorAll('.screen').forEach(n=>{n.classList.remove('active');n.style.display='';});document.getElementById('main-menu').classList.add('active');document.body.className='';});
   await page.evaluate(()=>Promise.all([themeLeaderboard.preload('dark'),themeOnlinePlayers.preload('dark'),themeInviteFriend.preload('dark')]));
  }
  assert.deepEqual(errors,[]);
  const report={at:new Date().toISOString(),mode:baseline?'before':'after',baselineRef:ref,scope:'Three actual controllers, representative hidden/visible DOM and actual PNG in local Edge411x891. No whole app, account/network latency or Android ANR proof.',startupPngRequests:startup.length,startupPngBytes:startup.reduce((s,r)=>s+r.bytes,0),hiddenThemeChangePngRequests:hidden.length,rows,errors,requests};
  const out='tmp/hidden-room-loading-2026-10-30';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/'+report.mode+'.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({mode:report.mode,startupPngRequests:report.startupPngRequests,startupPngBytes:report.startupPngBytes,hiddenThemeChangePngRequests:hidden.length,visibleCases:rows.length,errors}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
