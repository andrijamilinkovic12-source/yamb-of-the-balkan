// Isolated production renderers. No app constructor, account, server, ads or real rewards.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YAMB_PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const output=path.join(root,'tmp/hotseat-layout-runtime'),index=read('www/index.html');
const themes=['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const sheets=[...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const body=index.slice(index.indexOf('<body'),index.lastIndexOf('</body>')+7).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const fixture=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${sheets.map(f=>`<link rel="stylesheet" href="${f}">`).join('')}<style>:root{--safe-top:24px;--safe-bottom:24px;--safe-left:0px;--safe-right:0px}*{animation:none!important;transition:none!important;scroll-behavior:auto!important}</style>${body}`;
const languages=read('www/languages.js'),game=read('www/game.js');
const cases=[
 {id:'win-close',score:650,guest:625,records:[]},{id:'loss-narrow',score:1250,guest:1325,records:['personal']},
 {id:'win-clear',score:1750,guest:1600,records:['personal','weekly']},{id:'loss-strong',score:2250,guest:2500,records:['personal','weekly','monthly']},
 {id:'win-decisive',score:2860,guest:2500,records:['personal','weekly','monthly','all_time']},
 {id:'draw',score:3300,guest:3300,records:['personal','weekly','monthly','all_time']},
 {id:'pending',score:2860,guest:2900,records:null},{id:'zero',score:0,guest:650,records:[]},
 {id:'capped',score:6000,guest:5700,records:['personal','weekly','monthly','all_time']}
];
const rows=[],failures=[];
async function main(){
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.YAMB_CHROMIUM?{executablePath:process.env.YAMB_CHROMIUM}:{})});
 try{
  const ctx=await browser.newContext();
  await ctx.route('**/*',async route=>{
   const u=new URL(route.request().url());if(u.hostname!=='hotseat-fixture.local')return route.abort();
   if(u.pathname==='/www/fixture.html')return route.fulfill({contentType:'text/html',body:fixture});
   const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));
   if(!file.startsWith(path.join(root,'www')+path.sep)||!fs.existsSync(file))return route.abort();
   return route.fulfill({contentType:({'.css':'text/css','.js':'text/javascript','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  const page=await ctx.newPage();const rendererWarnings=[];
  page.on('console',m=>{if(['warning','error'].includes(m.type()))rendererWarnings.push(m.text());});
  for(const viewport of [{width:320,height:568},{width:360,height:640},{width:360,height:780},{width:412,height:915}]){
   await page.setViewportSize(viewport);const baseline={};
   for(const theme of themes){
    await page.goto('http://hotseat-fixture.local/www/fixture.html');
    await page.evaluate(({theme,themes})=>{
     localStorage.clear();localStorage.setItem('yamb_theme',theme);localStorage.setItem('yamb_lang','sr');
     document.body.className=theme==='dark'?'':`${theme}-theme`;document.documentElement.dataset.splashTheme=theme;
     document.querySelectorAll('.screen').forEach(e=>e.classList.remove('active'));
     document.querySelectorAll('[id*="splash"],[id*="loading-gate"]').forEach(e=>e.remove());
     window.YAMB_THEME_IDS=themes;window.YAMB_FREE_THEME_IDS=['dark'];window.filterYambThemeIds=a=>(Array.isArray(a)?a:[]).filter(x=>themes.includes(x));
    },{theme,themes});
    await page.addScriptTag({content:read('www/theme-quality-assets.js')});
    await page.addScriptTag({content:read('www/config.js')});
    await page.addScriptTag({content:languages.slice(0,languages.indexOf('function setLanguage('))});
    const managers=read('www/managers.js');
    await page.addScriptTag({content:managers.slice(managers.indexOf('class ModalManager {'),managers.indexOf('// --- 4. EFFECT MANAGER'))});
    await page.evaluate(()=>{window._safeT=k=>t(k);});
    await page.addScriptTag({content:game.replace('window.app = new YambApp();','window.TestYambApp = YambApp;')});
    await page.addScriptTag({content:read('www/features.js')});
    await page.evaluate(()=>{
     window.app=Object.create(TestYambApp.prototype);
     Object.assign(app,{players:['Andrija Milinković Maksimović','Aleksandar Petrović-Pavlović'],playerName:'Andrija Milinković Maksimović',modeTag:'Hotseat',onlineMode:false,aiMode:false,isSpectator:false,currentPlayerIdx:0,myOnlineIndex:0,roomId:'fixture-hotseat',socket:null,rewardAdAttemptId:0,gameActive:true,soundMgr:{stopMusic(){},win(){},click(){}},effectMgr:{celebrateWin(){},stop(){}},isThemeUnlocked:()=>true});
     app.features=new YambFeatures(app);app.features.checkAchievements=()=>{};
     app.modal=new ModalManager();
     for(const name of ['pauseLocalGameClock','refreshLocalStats','updateStats','rememberPendingGameReward'])app[name]=()=>{};
     app.getCurrentPlayerUid=()=> 'fixture-only';
     app.queueCompletedLocalMatchResult=async()=>({clientResultId:'fixture-result',accepted:true,powerIndexGain:fixtureCase.records===null?undefined:24});
     app.calculateTotalScore=i=>i===0?fixtureCase.score:fixtureCase.guest;
     app.safeSubmitScore=async()=>({ok:true,recordAchievements:fixtureCase.records,soloRewardPreview:fixtureCase.records===null?null:fixtureCase.reward});
     app.confirmTrophyShowcaseEntries=async()=>[];app.showTrophyUnlockShowcase=async()=>{};app.refreshSoloFinishPowerIndex=async()=>{};
     app.navigateTo=id=>{document.querySelectorAll('.screen').forEach(e=>e.classList.remove('active'));document.getElementById(id).classList.add('active');};
     app.initScores();app.createScoreTables();
     if(['easter','neon'].includes(localStorage.getItem('yamb_theme'))){
      const theme=localStorage.getItem('yamb_theme'),icons=[...document.querySelectorAll(`.${theme}-announce-col-icon`)];
      if(icons.length!==2||icons.some(i=>!i.getAttribute('src')?.includes(`theme-packs/${theme}/canonical/game-board/announce-megaphone-v1.png`)))throw Error('Both real boards must hydrate their own canonical megaphone before any fixture image helper runs');
     }
    });
    for(const script of ['theme-solo-results.js','theme-ducat-pack.js','theme-rewarded-video-pack.js','theme-game-header.js'])await page.addScriptTag({content:read('www/'+script)});
    for(const [caseIndex,item]of cases.entries()){
     await page.evaluate(async({item,caseIndex})=>{
      const bonus={personal:10,weekly:10,monthly:10,all_time:20};
      const base=Math.min(8000,Math.floor(item.score*(100+(item.records||[]).reduce((a,k)=>a+bonus[k],0))/100));
      window.fixtureCase={...item,reward:{baseReward:base,adReward:Math.min(8000,base*2)}};
      app.gameActive=true;app.initScores();if(item.score>0)app.allScores[0][KOLONE[caseIndex%6]].Yamb=100;
      // Deterministic message variant, still using the production message keys.
      app.getSoloFinishMessageKey=tier=>`go_msg_${tier}${caseIndex%3?`_v${caseIndex%3+1}`:''}`;
      app.getHotseatFinishCommentKey=band=>`go_hotseat_comment_${band}${caseIndex%3?`_v${caseIndex%3+1}`:''}`;
      await app.handleGameOver({force:true});window.themeSoloResults.sync(true);
      for(const img of document.querySelectorAll('img[data-theme-src]:not([src])'))img.src=resolveThemeQualityAsset(img.dataset.themeSrc);
      document.querySelectorAll('img[data-neon-board-src]:not([src])').forEach(i=>i.src=i.dataset.neonBoardSrc);
      document.querySelectorAll('*').forEach(e=>{e.style.setProperty('transition','none','important');e.style.setProperty('animation','none','important');});
     },{item,caseIndex});
     await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     await page.evaluate(()=>Promise.all([...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.width&&r.height;}).map(i=>{i.loading='eager';return i.decode().catch(()=>{});})));
     const result=await page.evaluate(caseIndex=>{
      const screen=document.getElementById('game-over-screen'),card=screen.querySelector('.modal-box'),r=card.getBoundingClientRect();
      const metric={};for(const sel of ['.modal-box','#go-tier-title','.hotseat-result-scores','.hotseat-result-player','.hotseat-result-role','.hotseat-result-name','.hotseat-result-points','#hotseat-result-comment','#go-title','#go-msg','.game-over-score-card','#solo-record-panel','.solo-record-panel-title','.solo-record-panel-grid > span','.solo-record-panel-grid img','.solo-record-panel-footer','#solo-power-index-icon','#go-score','#solo-finish-stats','.easter-solo-finish-stats > div','.easter-solo-finish-stats > div > span','.easter-solo-finish-stats strong','#solo-finish-best-column','#btn-ad-double','.game-over-claim-button']){
       const e=screen.querySelector(sel);if(!e)continue;const b=e.getBoundingClientRect(),s=getComputedStyle(e);metric[sel]={width:b.width,height:b.height,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,padding:s.padding,margin:s.margin,gap:s.gap,borderRadius:s.borderRadius};
      }
      const visible=e=>{const r=e.getBoundingClientRect();return r.width&&r.height;};
      const images=[...screen.querySelectorAll('img')].filter(visible).map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0,width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height}));
      const overflow=[...screen.querySelectorAll('.modal-box,#go-title,#go-msg,#hotseat-result-comment,.hotseat-result-player,.solo-record-panel-grid,.solo-record-panel-footer,#solo-finish-stats,#btn-ad-double,.game-over-claim-button')].filter(e=>visible(e)&&e.scrollWidth>e.clientWidth+1).map(e=>e.id||e.className);
      const claim=screen.querySelector('.game-over-claim-button').getBoundingClientRect(),ad=screen.querySelector('#btn-ad-double');
      const mark=screen.querySelector('.solo-finish-column-mark');
      const header=document.querySelector('#game-scene .col-header.'+['c-nadole','c-slobodna','c-sredina','c-nagore','c-rucno','c-najava'][caseIndex%6]);
      const boardIcon=[...header.querySelectorAll('img')].find(i=>getComputedStyle(i).display!=='none'),markIcon=mark.querySelector('img');
      const markMatchesBoard=!!fixtureCase.score&&getComputedStyle(mark).color===getComputedStyle(header).color&&getComputedStyle(mark).fontSize===getComputedStyle(header).fontSize&&(boardIcon?!!markIcon&&markIcon.src===boardIcon.src&&getComputedStyle(markIcon).width===getComputedStyle(boardIcon).width:!markIcon&&mark.textContent.trim()===header.textContent.trim());
      const lum=color=>{const c=(color.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return .2126*c[0]+.7152*c[1]+.0722*c[2];};
      const contrast=(ink,surface)=>(Math.max(lum(ink),lum(surface))+.05)/(Math.min(lum(ink),lum(surface))+.05);
      const playerContrasts=[...screen.querySelectorAll('.hotseat-result-player')].flatMap(row=>[...row.querySelectorAll('.hotseat-result-name,.hotseat-result-role,.hotseat-result-points')].map(e=>contrast(getComputedStyle(e).color,getComputedStyle(row).backgroundColor)));
      return{minimumPlayerContrast:Math.min(...playerContrasts),players:[...screen.querySelectorAll('[data-hotseat-player]')].map(e=>({role:e.querySelector('.hotseat-result-role').textContent,name:e.querySelector('.hotseat-result-name').textContent,score:e.querySelector('.hotseat-result-points').textContent})),rematchVisible:!!visible(document.getElementById('btn-rematch')),comment:document.getElementById('hotseat-result-comment').textContent,metric,images,overflow,markMatchesBoard,inside:r.left>=11&&r.right<=innerWidth-11&&r.top>=24&&r.bottom<=innerHeight-24+.5,cardScroll:card.scrollHeight>card.clientHeight+1,claimInside:claim.bottom<=r.bottom,adVisible:!!visible(ad),recordRoles:[...screen.querySelectorAll('[data-record-role].is-achieved')].map(e=>e.dataset.recordRole),score:document.getElementById('go-score').textContent,title:document.getElementById('go-title').textContent,mark:mark.innerHTML,claim:document.getElementById('go-claim-label').textContent,double:document.getElementById('go-double-label').textContent};
     },caseIndex);
     if(!result.inside||result.cardScroll||!result.claimInside||result.overflow.length)failures.push(`${theme}/${item.id}/${viewport.width}: bounds/scroll/overflow ${result.overflow}`);
     if(result.images.some(i=>!i.loaded))failures.push(`${theme}/${item.id}: broken image`);
     assert(result.minimumPlayerContrast>=4.5,`${theme}/${item.id}: player text contrast ${result.minimumPlayerContrast}`);
     const pngRole=src=>src.includes('/game-board/')?null:src.match(/solo-record-icons\/(weekly|monthly|all_time|personal)/)?.[1]
      || (src.includes('/rewarded-video/')?'video':src.includes('/ducat/')?'ducat':src.includes('/statistics-overview/')?'power':src.match(/(finish-score-mark|finish-claim)/)?.[1]);
     const pngMetrics=Object.fromEntries(result.images.map(i=>[pngRole(i.src),[i.width,i.height]]).filter(([key])=>key));
     if(!baseline[item.id+'-png'])baseline[item.id+'-png']=pngMetrics;
     for(const[role,size]of Object.entries(pngMetrics))if(!baseline[item.id+'-png'][role]||size.some((n,j)=>Math.abs(n-baseline[item.id+'-png'][role][j])>1.1))failures.push(`${theme}/${item.id}/${viewport.width}: ${role} PNG dimensions differ from Green`);
     assert.deepEqual(result.recordRoles.sort(),(item.records||[]).slice().sort(),`${theme}/${item.id}: ${rendererWarnings.join('; ')}`);
     assert.equal(result.adVisible,item.score>0&&item.id!=='capped');
     assert.equal(result.rematchVisible,false,'Offline Hotseat cannot offer online rematch');
     assert.equal(result.title,item.score===item.guest?'NEREŠENO!':item.score>item.guest?'POBEDA!':'PORAZ');
     assert.equal(result.players.length,2);assert.deepEqual(result.players.map(p=>p.score),[item.score,item.guest].map(n=>n.toLocaleString('sr-RS')));
     assert.deepEqual(result.players.map(p=>p.name),['Andrija Milinković Maksimović','Aleksandar Petrović-Pavlović']);
     assert(!result.players.some(p=>p.role.includes('POBEDNIK')));assert(result.comment&&!result.comment.includes('{'),'Personalized margin comment required');
     const base=Math.min(8000,Math.floor(item.score*(100+(item.records||[]).reduce((n,k)=>n+({personal:10,weekly:10,monthly:10,all_time:20}[k]),0))/100));
     if(item.records!==null&&item.score>0){assert(result.claim.includes(base.toLocaleString('sr-RS')));assert(result.double.includes(Math.min(8000,base*2).toLocaleString('sr-RS')));}
     if(item.score>0&&!result.markMatchesBoard)failures.push(`${theme}/${item.id}: strongest-column mark differs from its real board header`);
     if(!baseline[item.id])baseline[item.id]=result.metric;
     for(const[sel,m]of Object.entries(result.metric))for(const[prop,v]of Object.entries(m)){
      // The intrinsic PNG/glyph width follows its own board; the surrounding card stays Green-sized.
      if(prop==='width'&&caseIndex%6===5&&['#solo-finish-best-column','.easter-solo-finish-stats strong','.easter-solo-finish-stats > div > span'].includes(sel))continue;
      const expected=baseline[item.id][sel]?.[prop];if(typeof v==='number'?Math.abs(v-expected)>=1.1:v!==expected)failures.push(`${theme}/${item.id}/${viewport.width} ${sel}.${prop}: ${v} != Green ${expected}`);
     }
     if(viewport.width===360&&['win-close','win-decisive','draw','pending','zero','capped'].includes(item.id))await page.screenshot({path:path.join(output,`${theme}-${item.id}.png`)});
     rows.push({theme,case:item.id,viewport,...result});
    }
    for(const playerIndex of [0,1]){
     await page.evaluate(playerIndex=>{app.gameActive=true;app.currentPlayerIdx=playerIndex;app.navigateTo('game-scene');app.highlightCurrentPlayer();},playerIndex);
     await page.waitForTimeout(160);
     const board=await page.evaluate(()=>{const scene=document.getElementById('game-scene'),wrapper=document.getElementById('tables-container');return{player:app.currentPlayerIdx,pager:scene.classList.contains('hotseat-dual-board-view'),active:[...document.querySelectorAll('.player-table.hotseat-table-active')].map(e=>e.id),avatar:document.getElementById('gh-current-avatar').getAttribute('src'),tables:[...document.querySelectorAll('.player-table')].map(e=>({id:e.id,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,cells:e.querySelectorAll('.col-header').length})),scrollTop:wrapper.scrollTop};});
     assert(board.pager);assert.deepEqual(board.active,[`ptable-${playerIndex}`]);assert.equal(board.tables.length,2);
     assert(board.avatar.includes(`theme-packs/${theme}/canonical/online-players-internal/avatar-v1.png`));
     if(!baseline['board-'+playerIndex])baseline['board-'+playerIndex]=board.tables;
     for(const [i,m]of board.tables.entries())for(const prop of ['width','height','cells'])if(Math.abs(m[prop]-baseline['board-'+playerIndex][i][prop])>1.1)failures.push(`${theme}/board/${viewport.width}: ${prop} differs from Green`);
     if(viewport.width===360&&viewport.height===780)await page.screenshot({path:path.join(output,`${theme}-board-${playerIndex}.png`)});
     rows.push({theme,case:'board-'+playerIndex,viewport,...board});
    }
    await page.evaluate(()=>{void app.quitToMenu();document.querySelectorAll('*').forEach(e=>{e.style.setProperty('transition','none','important');e.style.setProperty('animation','none','important');});});
    const exit=await page.evaluate(()=>{
     const scope=document.getElementById('custom-modal-overlay'),card=scope.querySelector('.custom-modal'),r=card.getBoundingClientRect(),metric={};
     for(const selector of ['.custom-modal','.cm-title','.cm-msg','.cm-btn-ok','.cm-btn-cancel']){const e=scope.querySelector(selector),b=e.getBoundingClientRect(),s=getComputedStyle(e);metric[selector]={width:b.width,height:b.height,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,padding:s.padding,borderRadius:s.borderRadius};}
     return{metric,inside:r.left>=11&&r.right<=innerWidth-11&&r.top>=24&&r.bottom<=innerHeight-24+.5,context:scope.classList.contains('modal-context-hotseat')};
    });
     assert(exit.inside&&exit.context,`${theme}: Hotseat exit bounds/context`);
    if(!baseline.exit)baseline.exit=exit.metric;
    for(const [selector,m]of Object.entries(exit.metric))for(const[prop,v]of Object.entries(m)){
     const expected=baseline.exit[selector][prop];if(typeof v==='number'?Math.abs(v-expected)>=1.1:v!==expected)failures.push(`${theme}/exit/${viewport.width} ${selector}.${prop}: ${v} != Green ${expected}`);
    }
    if(viewport.width===360&&viewport.height===780)await page.screenshot({path:path.join(output,`${theme}-exit.png`)});
    rows.push({theme,case:'exit',viewport,...exit});
    await page.evaluate(()=>{app.modal.close();app.navigateTo('main-menu');void app.modal.prompt(t('prompt_player_name')+' 2:',{cancellable:true,contextClass:'hotseat'});});
    const prompt=await page.evaluate(()=>{const scope=document.getElementById('custom-modal-overlay'),metric={};for(const selector of ['.custom-modal','.cm-title','.cm-msg','#cm-input','.cm-btn-ok']){const e=scope.querySelector(selector),b=e.getBoundingClientRect(),s=getComputedStyle(e);metric[selector]={width:b.width,height:b.height,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,padding:s.padding,borderRadius:s.borderRadius};}return{metric};});
    if(!baseline.prompt)baseline.prompt=prompt.metric;
    for(const[selector,m]of Object.entries(prompt.metric))for(const[prop,v]of Object.entries(m)){const expected=baseline.prompt[selector][prop];if(typeof v==='number'?Math.abs(v-expected)>=1.1:v!==expected)failures.push(`${theme}/prompt/${viewport.width} ${selector}.${prop}: ${v} != Green ${expected}`);}
    if(viewport.width===360&&viewport.height===780)await page.screenshot({path:path.join(output,`${theme}-prompt.png`)});
    rows.push({theme,case:'prompt',viewport,...prompt});
   }
  }
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({scope:'Real handleGameOver/createScoreTables/PNG controllers and production CSS, isolated synthetic result/queue acknowledgments; no constructor, account, server, ads or payout. Animations disabled; offline font fallback possible.',failures,rows},null,2)+'\n');
  assert.equal(failures.length,0,failures.slice(0,35).join('\n'));console.log(`PASS: ${rows.length} Hotseat theme/result/viewport combinations; Green geometry/type, PNGs, flags, rewards and safe bounds.`);
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
