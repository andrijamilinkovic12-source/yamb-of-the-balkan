// Production renderers in an isolated browser: synthetic tournament, no account/network.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YAMB_PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const output=path.join(root,'tmp/tournament-layout-runtime'),index=read('www/index.html');
const themes=['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const sheets=[...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const room=index.slice(index.indexOf('<div id="tournament-screen"'),index.indexOf('\n    <script>',index.indexOf('<div id="tournament-screen"'))).replace('class="screen"','class="screen active"');
const modal=index.slice(index.indexOf('<div id="custom-modal-overlay"'),index.indexOf('<div id="chat-float-btn"'));
const fixture=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${sheets.map(f=>`<link rel="stylesheet" href="${f}">`).join('')}<style>:root{--safe-top:24px;--safe-bottom:24px;--safe-left:0px;--safe-right:0px}*{animation:none!important;transition:none!important;scroll-behavior:auto!important}</style><body>${room}${modal}</body>`;
const managers=read('www/managers.js'),languages=read('www/languages.js'),config=read('www/config.js');
const rows=[],failures=[];
async function main(){
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.YAMB_CHROMIUM?{executablePath:process.env.YAMB_CHROMIUM}:{})});
 try{
  const ctx=await browser.newContext();
  await ctx.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.hostname!=='tournament-fixture.local')return route.abort();
   if(url.pathname==='/www/fixture.html')return route.fulfill({contentType:'text/html',body:fixture});
   if(url.pathname==='/avatar.png')return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=','base64')});
   const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
   if(!file.startsWith(path.join(root,'www')+path.sep)||!fs.existsSync(file))return route.abort();
   return route.fulfill({contentType:({'.css':'text/css','.js':'text/javascript','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  const page=await ctx.newPage();
  for(const viewport of [{width:320,height:568},{width:360,height:780},{width:412,height:915}]){
   await page.setViewportSize(viewport);const baseline={};
   for(const theme of themes){
    await page.goto('http://tournament-fixture.local/www/fixture.html');
    await page.evaluate(theme=>{document.body.className=theme==='dark'?'':`${theme}-theme`;document.documentElement.dataset.splashTheme=theme;localStorage.clear();localStorage.setItem('yamb_theme',theme);window._safeT=k=>t(k);},theme);
    await page.addScriptTag({content:read('www/theme-quality-assets.js')});
    await page.addScriptTag({content:config.slice(config.indexOf('function getThemeMedalSource'),config.indexOf('// Export'))});
    await page.addScriptTag({content:languages.slice(0,languages.indexOf('function setLanguage('))});
    await page.addScriptTag({content:managers.slice(managers.indexOf('class ModalManager {'),managers.indexOf('// --- 4. EFFECT MANAGER'))});
    await page.addScriptTag({content:read('www/turnir.js')});
    await page.addScriptTag({content:read('www/theme-main-room-icons.js')});
    await page.evaluate(()=>{
     const tm=Object.create(TournamentManager.prototype);window.app={playerId:'fixture-0',soundMgr:{click(){}},modal:new ModalManager(),tournamentManager:tm};tm.app=app;
     const names=['Takmičar sa veoma dugim imenom i prezimenom','Drugi Takmičar','Treći Takmičar','Četvrti Takmičar','Peti Takmičar','Šesti Takmičar','Sedmi Takmičar','Osmi Takmičar'];
     const players=names.map((name,i)=>({id:`fixture-${i}`,name,powerIndex:12345+i,photoUrl:'http://tournament-fixture.local/avatar.png'}));
     const match=(a,b)=>({p1:players[a],p2:players[b],winnerId:players[a].id,scoreLabel:'2571-2427'});
     tm.state={status:'active',tournamentNumber:9,players,bracket:{qf:[match(0,1),match(2,3),match(4,5),match(6,7)],sf:[match(0,2),match(4,6)],f:[match(0,4)]},resetAt:null};
     tm.tourneyLeaderboard=[{playerName:players[0].name,photoUrl:players[0].photoUrl,championships:[{tournamentNumber:1,winnerId:players[0].id,winnerName:'Sascha Lazić',winnerPhotoUrl:players[0].photoUrl,runnerUpName:'Drugi Takmičar',scoreLabel:'2571-2427',bracket:tm.state.bracket}]}];tm.tourneyLeaderboardLoaded=true;tm.calculateMyPI=()=>12345;tm.initTourneySwipe=()=>{};
    });
    for(const state of ['info','bracket','semifinal','final','duel','hall','journey']){
     await page.evaluate(state=>{app.modal.close();const tm=app.tournamentManager;tm.activeTab=state==='info'?'info':['hall','journey'].includes(state)?'leaderboard':'bracket';tm.render();if(state==='semifinal'||state==='final')tm.goToTourneyPage(state==='semifinal'?1:2);if(state==='duel')tm.openMatchModal('qf',0);if(state==='journey')tm.openChampionJourney(0,0);},state);
     await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     await page.evaluate(()=>Promise.all([...document.images].filter(img=>{const r=img.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0&&r.left<innerWidth&&r.right>0;}).map(img=>{img.loading='eager';return Promise.race([img.decode().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,4000))]);})));
     const result=await page.evaluate(state=>{
      const scope=['duel','journey'].includes(state)?document.getElementById('custom-modal-overlay'):document.getElementById('tournament-screen');
      const metric={};for(const sel of ['.tourney-shell','.tourney-header-title','.tourney-tabs','.tourney-tab-btn','.tourney-registration-title','.tourney-registration-desc','.tourney-action-primary','.tourney-participant-name','.tourney-participant-power','.tourney-round-title','.tourney-pagination .dot','.tourney-champion-card','.tourney-champion-name','.tourney-champion-count','.tourney-champion-runner-up','.custom-modal','.cm-title','.cm-btn','.tourney-journey-hero h3']){const e=scope.querySelector(sel);if(!e)continue;const r=e.getBoundingClientRect(),s=getComputedStyle(e);metric[sel]={width:r.width,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,padding:s.padding,borderRadius:s.borderRadius};}
      const shell=scope.querySelector('.tourney-shell,.custom-modal').getBoundingClientRect();
      const overflow=[...scope.querySelectorAll('.tourney-registration-panel,.tourney-champion-card,.tourney-journey-step,.cm-btn')].filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.className);
      const dots=[...scope.querySelectorAll('.tourney-pagination .dot')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e,'::before');return{width:r.width,height:r.height,mark:s.width,active:e.classList.contains('active'),bottom:r.bottom,hostBottom:e.parentElement.getBoundingClientRect().bottom};});
      const badImages=[...scope.querySelectorAll('img')].filter(i=>{const r=i.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0&&r.left<innerWidth&&r.right>0&&(!i.complete||!i.naturalWidth);}).map(i=>i.src);
      const name=scope.querySelector('.tourney-champion-name'),nr=name?.getBoundingClientRect();
      const palette=[];for(const[sel,token]of [['.tourney-registration-desc','--theme-card-muted'],['.tourney-register-label','--theme-card-muted'],['.tourney-register-count','--theme-card-ink']]){const e=scope.querySelector(sel);if(!e)continue;const p=document.createElement('i');p.style.color=`var(${token})`;scope.append(p);palette.push({selector:sel,color:getComputedStyle(e).color,expected:getComputedStyle(p).color});p.remove();}
      return{metric,overflow,dots,badImages,palette,inside:shell.left>=0&&shell.right<=innerWidth+.5&&shell.bottom<=innerHeight-24+.5,nameWidth:nr?.width};
     },state);
     assert(result.inside,`${theme}/${state}/${viewport.width}: safe shell`);assert.deepEqual(result.overflow,[],`${theme}/${state}/${viewport.width}: overflow`);assert.deepEqual(result.badImages,[],`${theme}/${state}: image`);
     if(!baseline[state])baseline[state]=result.metric;
     for(const[sel,m]of Object.entries(result.metric))for(const[prop,v]of Object.entries(m)){
      const expected=baseline[state][sel][prop];if(typeof v==='number'?Math.abs(v-expected)>=1.1:v!==expected)failures.push(`${theme}/${state}/${viewport.width} ${sel}.${prop}: ${v} != Green ${expected}`);
     }
     for(const dot of result.dots){assert(Math.abs(dot.width-44)<.1);assert(Math.abs(dot.height-44)<.1);assert.equal(dot.mark,'10px');assert(dot.bottom<=dot.hostBottom+.5);}
     if(state==='hall')assert(result.nameWidth>=100,`${theme}/${viewport.width}: champion name squeezed by score`);
     if(theme!=='dark')for(const sample of result.palette)assert.equal(sample.color,sample.expected,`${theme}/${state}: ${sample.selector} palette contrast`);
     if(viewport.width===360&&['info','bracket','duel','hall','journey'].includes(state))await page.screenshot({path:path.join(output,`${theme}-${state}.png`)});
     rows.push({theme,state,viewport,...result});
    }
   }
  }
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({scope:'Isolated real renderers/CSS; synthetic data, external network blocked. Montserrat declared, offline fallback possible. No emulator/deploy confirmation.',failures,rows},null,2)+'\n');assert.equal(failures.length,0,failures.slice(0,15).join('\n'));console.log(`PASS: ${rows.length} theme/state/viewport combinations; Green geometry/fonts, safe bounds, PNGs, 44px pagers and readable champion name.`);
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
