// Isolated production renderers. No app constructor, account, server, ads or real rewards.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YAMB_PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const output=path.join(root,'tmp/solo-layout-runtime'),index=read('www/index.html');
const themes=['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const sheets=[...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const body=index.slice(index.indexOf('<body'),index.lastIndexOf('</body>')+7).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const fixture=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${sheets.map(f=>`<link rel="stylesheet" href="${f}">`).join('')}<style>:root{--safe-top:24px;--safe-bottom:24px;--safe-left:0px;--safe-right:0px}*{animation:none!important;transition:none!important;scroll-behavior:auto!important}</style>${body}`;
const languages=read('www/languages.js'),game=read('www/game.js');
const cases=[
 {id:'rough-none',score:650,records:[]},{id:'more-personal',score:1250,records:['personal']},
 {id:'progress-pw',score:1750,records:['personal','weekly']},{id:'good-pwm',score:2250,records:['personal','weekly','monthly']},
 {id:'masterful-all',score:2860,records:['personal','weekly','monthly','all_time']},
 {id:'perfect-all',score:3300,records:['personal','weekly','monthly','all_time']},
 {id:'pending',score:2860,records:null},{id:'zero',score:0,records:[]},
 {id:'capped',score:6000,records:['personal','weekly','monthly','all_time']}
];
const rows=[],failures=[];
async function main(){
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.YAMB_CHROMIUM?{executablePath:process.env.YAMB_CHROMIUM}:{})});
 try{
  const ctx=await browser.newContext();
  await ctx.route('**/*',async route=>{
   const u=new URL(route.request().url());if(u.hostname!=='solo-fixture.local')return route.abort();
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
    await page.goto('http://solo-fixture.local/www/fixture.html');
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
     Object.assign(app,{players:['Takmičar sa dugim imenom i prezimenom'],playerName:'Takmičar sa dugim imenom i prezimenom',modeTag:'Solo',onlineMode:false,aiMode:false,isSpectator:false,currentPlayerIdx:0,myOnlineIndex:0,roomId:'fixture-solo',socket:null,rewardAdAttemptId:0,gameActive:true,soundMgr:{stopMusic(){},win(){},click(){}},effectMgr:{celebrateWin(){},stop(){}},isThemeUnlocked:()=>true});
     app.features=new YambFeatures(app);app.features.checkAchievements=()=>{};
     app.modal=new ModalManager();
     for(const name of ['pauseLocalGameClock','refreshLocalStats','updateStats','rememberPendingGameReward'])app[name]=()=>{};
     app.getCurrentPlayerUid=()=> 'fixture-only';
     app.queueCompletedLocalMatchResult=async()=>({clientResultId:'fixture-result',accepted:true,powerIndexGain:fixtureCase.records===null?undefined:24});
     app.calculateTotalScore=()=>fixtureCase.score;
     app.safeSubmitScore=async()=>({ok:true,recordAchievements:fixtureCase.records,soloRewardPreview:fixtureCase.records===null?null:fixtureCase.reward});
     app.confirmTrophyShowcaseEntries=async()=>[];app.showTrophyUnlockShowcase=async()=>{};app.refreshSoloFinishPowerIndex=async()=>{};
     app.navigateTo=id=>{document.querySelectorAll('.screen').forEach(e=>e.classList.remove('active'));document.getElementById(id).classList.add('active');};
     app.initScores();app.createScoreTables();
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
      await app.handleGameOver({force:true});window.themeSoloResults.sync(true);
      for(const img of document.querySelectorAll('img[data-theme-src]:not([src])'))img.src=resolveThemeQualityAsset(img.dataset.themeSrc);
      document.querySelectorAll('img[data-neon-board-src]:not([src])').forEach(i=>i.src=i.dataset.neonBoardSrc);
      document.querySelectorAll('*').forEach(e=>{e.style.setProperty('transition','none','important');e.style.setProperty('animation','none','important');});
     },{item,caseIndex});
     await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     await page.evaluate(()=>Promise.all([...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.width&&r.height;}).map(i=>{i.loading='eager';return i.decode().catch(()=>{});})));
     const result=await page.evaluate(caseIndex=>{
      const screen=document.getElementById('game-over-screen'),card=screen.querySelector('.modal-box'),r=card.getBoundingClientRect();
      const metric={};for(const sel of ['.modal-box','#go-title','#go-msg','.game-over-score-card','#solo-record-panel','.solo-record-panel-title','.solo-record-panel-grid > span','.solo-record-panel-grid img','.solo-record-panel-footer','#solo-power-index-icon','#go-score','#solo-finish-stats','.easter-solo-finish-stats > div','.easter-solo-finish-stats > div > span','.easter-solo-finish-stats strong','#solo-finish-best-column','#btn-ad-double','.game-over-claim-button']){
       const e=screen.querySelector(sel);if(!e)continue;const b=e.getBoundingClientRect(),s=getComputedStyle(e);metric[sel]={width:b.width,height:b.height,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,padding:s.padding,margin:s.margin,gap:s.gap,borderRadius:s.borderRadius};
      }
      const visible=e=>{const r=e.getBoundingClientRect();return r.width&&r.height;};
      const images=[...screen.querySelectorAll('img')].filter(visible).map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0,width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height}));
      const overflow=[...screen.querySelectorAll('.modal-box,#go-title,#go-msg,.solo-record-panel-grid,.solo-record-panel-footer,#solo-finish-stats,#btn-ad-double,.game-over-claim-button')].filter(e=>visible(e)&&e.scrollWidth>e.clientWidth+1).map(e=>e.id||e.className);
      const claim=screen.querySelector('.game-over-claim-button').getBoundingClientRect(),ad=screen.querySelector('#btn-ad-double');
      const mark=screen.querySelector('.solo-finish-column-mark');
      const header=document.querySelector('#game-scene .col-header.'+['c-nadole','c-slobodna','c-sredina','c-nagore','c-rucno','c-najava'][caseIndex%6]);
      const boardIcon=[...header.querySelectorAll('img')].find(i=>getComputedStyle(i).display!=='none'),markIcon=mark.querySelector('img');
      const markMatchesBoard=!!fixtureCase.score&&getComputedStyle(mark).color===getComputedStyle(header).color&&getComputedStyle(mark).fontSize===getComputedStyle(header).fontSize&&(boardIcon?!!markIcon&&markIcon.src===boardIcon.src&&getComputedStyle(markIcon).width===getComputedStyle(boardIcon).width:!markIcon&&mark.textContent.trim()===header.textContent.trim());
      return{metric,images,overflow,markMatchesBoard,inside:r.left>=11&&r.right<=innerWidth-11&&r.top>=24&&r.bottom<=innerHeight-24+.5,cardScroll:card.scrollHeight>card.clientHeight+1,claimInside:claim.bottom<=r.bottom,adVisible:!!visible(ad),recordRoles:[...screen.querySelectorAll('[data-record-role].is-achieved')].map(e=>e.dataset.recordRole),score:document.getElementById('go-score').textContent,title:document.getElementById('go-title').textContent,mark:mark.innerHTML,claim:document.getElementById('go-claim-label').textContent,double:document.getElementById('go-double-label').textContent};
     },caseIndex);
     if(!result.inside||result.cardScroll||!result.claimInside||result.overflow.length)failures.push(`${theme}/${item.id}/${viewport.width}: bounds/scroll/overflow ${result.overflow}`);
     if(result.images.some(i=>!i.loaded))failures.push(`${theme}/${item.id}: broken image`);
     const pngRole=src=>src.includes('/game-board/')?null:src.match(/solo-record-icons\/(weekly|monthly|all_time|personal)/)?.[1]
      || (src.includes('/rewarded-video/')?'video':src.includes('/ducat/')?'ducat':src.includes('/statistics-overview/')?'power':src.match(/(finish-score-mark|finish-claim)/)?.[1]);
     const pngMetrics=Object.fromEntries(result.images.map(i=>[pngRole(i.src),[i.width,i.height]]).filter(([key])=>key));
     if(!baseline[item.id+'-png'])baseline[item.id+'-png']=pngMetrics;
     for(const[role,size]of Object.entries(pngMetrics))if(!baseline[item.id+'-png'][role]||size.some((n,j)=>Math.abs(n-baseline[item.id+'-png'][role][j])>1.1))failures.push(`${theme}/${item.id}/${viewport.width}: ${role} PNG dimensions differ from Green`);
     assert.deepEqual(result.recordRoles.sort(),(item.records||[]).slice().sort(),`${theme}/${item.id}: ${rendererWarnings.join('; ')}`);
     assert.equal(result.adVisible,item.score>0&&item.id!=='capped');
     if(item.score>0&&!result.markMatchesBoard)failures.push(`${theme}/${item.id}: strongest-column mark differs from its real board header`);
     if(!baseline[item.id])baseline[item.id]=result.metric;
     for(const[sel,m]of Object.entries(result.metric))for(const[prop,v]of Object.entries(m)){
      // The intrinsic PNG/glyph width follows its own board; the surrounding card stays Green-sized.
      if(prop==='width'&&caseIndex%6===5&&['#solo-finish-best-column','.easter-solo-finish-stats strong','.easter-solo-finish-stats > div > span'].includes(sel))continue;
      const expected=baseline[item.id][sel]?.[prop];if(typeof v==='number'?Math.abs(v-expected)>=1.1:v!==expected)failures.push(`${theme}/${item.id}/${viewport.width} ${sel}.${prop}: ${v} != Green ${expected}`);
     }
     if(viewport.width===360&&['rough-none','masterful-all','pending','zero','capped'].includes(item.id))await page.screenshot({path:path.join(output,`${theme}-${item.id}.png`)});
     rows.push({theme,case:item.id,viewport,...result});
    }
    await page.evaluate(()=>{app.gameActive=true;app.navigateTo('game-scene');void app.quitToMenu();document.querySelectorAll('*').forEach(e=>{e.style.setProperty('transition','none','important');e.style.setProperty('animation','none','important');});});
    const exit=await page.evaluate(()=>{
     const scope=document.getElementById('custom-modal-overlay'),card=scope.querySelector('.custom-modal'),r=card.getBoundingClientRect(),metric={};
     for(const selector of ['.custom-modal','.cm-title','.cm-msg','.cm-btn-ok','.cm-btn-cancel']){const e=scope.querySelector(selector),b=e.getBoundingClientRect(),s=getComputedStyle(e);metric[selector]={width:b.width,height:b.height,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,padding:s.padding,borderRadius:s.borderRadius};}
     return{metric,inside:r.left>=11&&r.right<=innerWidth-11&&r.top>=24&&r.bottom<=innerHeight-24+.5,context:scope.classList.contains('modal-context-solo')};
    });
    assert(exit.inside&&exit.context,`${theme}: Solo exit bounds/context`);
    if(!baseline.exit)baseline.exit=exit.metric;
    for(const [selector,m]of Object.entries(exit.metric))for(const[prop,v]of Object.entries(m)){
     const expected=baseline.exit[selector][prop];if(typeof v==='number'?Math.abs(v-expected)>=1.1:v!==expected)failures.push(`${theme}/exit/${viewport.width} ${selector}.${prop}: ${v} != Green ${expected}`);
    }
    if(viewport.width===360&&viewport.height===780)await page.screenshot({path:path.join(output,`${theme}-exit.png`)});
    rows.push({theme,case:'exit',viewport,...exit});
   }
  }
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({scope:'Real handleGameOver/createScoreTables/PNG controllers and production CSS, isolated synthetic result/queue acknowledgments; no constructor, account, server, ads or payout. Animations disabled; offline font fallback possible.',failures,rows},null,2)+'\n');
  assert.equal(failures.length,0,failures.slice(0,35).join('\n'));console.log(`PASS: ${rows.length} Solo theme/result/viewport combinations; Green geometry/type, PNGs, flags, rewards and safe bounds.`);
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
