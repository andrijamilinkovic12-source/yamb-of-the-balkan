// Isolated production renderers. No app constructor, account, server, ads or real rewards.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YAMB_PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const output=path.join(root,'tmp/online-random-layout-runtime'),index=read('www/index.html');
const themes=['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const resizeOnly=process.env.YAMB_FINISH_RESIZE_AUDIT==='1';
const sheets=[...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const body=index.slice(index.indexOf('<body'),index.lastIndexOf('</body>')+7).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const fixture=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${sheets.map(f=>`<link rel="stylesheet" href="${f}">`).join('')}<style>:root{--safe-top:24px;--safe-bottom:24px;--safe-left:0px;--safe-right:0px}${resizeOnly?'':'*{animation:none!important;transition:none!important;scroll-behavior:auto!important}'}</style>${body}`;
const languages=read('www/languages.js'),game=read('www/game.js'),online=read('www/onlinenumber.js');
const cases=[
 {id:'win-close',score:650,guest:625,records:[]},{id:'loss-narrow',score:1250,guest:1325,records:['personal']},
 {id:'win-clear',score:1750,guest:1600,records:['personal','weekly']},{id:'loss-strong',score:2250,guest:2500,records:['personal','weekly','monthly']},
 {id:'win-decisive',score:2860,guest:2500,records:['personal','weekly','monthly','all_time']},
 {id:'draw',score:3300,guest:3300,records:['personal','weekly','monthly','all_time']},
 {id:'pending',score:2860,guest:2900,records:null},{id:'zero',score:0,guest:650,records:[]},
 {id:'capped',score:6000,guest:5700,records:['personal','weekly','monthly','all_time']}
];
const rows=[],failures=[];
async function auditFinishResize(page,theme){
 for(const [state,score,guest] of [['win',650,625],['loss',293,450],['draw',650,650]]){
  await page.setViewportSize({width:411,height:891});
  await page.evaluate(async({score,guest})=>{
   app.myOnlineIndex=0;app.playerName=app.players[0];
   window.fixtureCase={score,guest,records:[],reward:{baseReward:score,adReward:score*2}};
   app.gameActive=true;app.initScores();app.allScores[0][KOLONE[0]].Yamb=100;
   await app.handleGameOver({force:true,onlineResult:{roomId:'room_fixture',matchId:'fixture-resize',duelType:'random',finalResults:app.players.map((name,i)=>({name,score:i?guest:score})),isDraw:score===guest,serverStatsAppliedUids:['fixture-only']}});
   window.themeSoloResults.sync(true);
   for(const img of document.querySelectorAll('img[data-theme-src]:not([src])'))img.src=resolveThemeQualityAsset(img.dataset.themeSrc);
  },{score,guest});
  await page.evaluate(()=>Promise.all(
   [...document.querySelectorAll('#game-over-screen img')].map(async i=>{i.loading='eager';await i.decode().catch(()=>{});})
  ));
  for(const viewport of [{width:411,height:891},{width:360,height:640},{width:320,height:568},{width:430,height:932},{width:411,height:891}]){
   await page.setViewportSize(viewport);
   await page.waitForTimeout(500);
   const result=await page.evaluate(()=>{
    const screen=document.getElementById('game-over-screen'),card=screen.querySelector('.modal-box');
    const r=card.getBoundingClientRect(),s=screen.getBoundingClientRect();
    const rect=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom};};
    const actions=['#btn-ad-double','.game-over-claim-button','#btn-rematch'].map(x=>({selector:x,...rect(screen.querySelector(x))}));
    const images=[...screen.querySelectorAll('img')].filter(i=>i.getBoundingClientRect().width>0).map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0}));
    const overflow=[...screen.querySelectorAll('.modal-box,#go-title,#go-msg,#hotseat-result-comment,.hotseat-result-player,.solo-record-panel-grid,.solo-record-panel-footer,#solo-finish-stats,#btn-ad-double,.game-over-claim-button,#btn-rematch')].filter(e=>e.getBoundingClientRect().width&&e.scrollWidth>e.clientWidth+1).map(e=>e.id||e.className);
    return {card:rect(card),screen:rect(screen),viewport:{width:innerWidth,height:innerHeight,visualWidth:visualViewport.width,visualHeight:visualViewport.height,visualScale:visualViewport.scale},inside:r.left>=11&&r.right<=innerWidth-11&&r.top>=24&&r.bottom<=innerHeight-24+.5,centered:Math.abs((r.left+r.right)/2-innerWidth/2)<1,cardScroll:card.scrollHeight>card.clientHeight+1,screenScroll:screen.scrollHeight>screen.clientHeight+1,actionsInside:actions.every(a=>a.x>=r.left&&a.right<=r.right+.5&&a.y>=r.top&&a.bottom<=r.bottom+.5),actions,images,overflow,title:document.getElementById('go-title').textContent,claimCalls:fixtureEmits.filter(x=>['claim_game_reward','claim_trophy_reward','request_rematch'].includes(x[0])).length};
   });
   if(!result.inside||!result.centered||result.cardScroll||result.screenScroll||!result.actionsInside||result.overflow.length||result.images.some(i=>!i.loaded)||result.claimCalls)failures.push(`${theme}/${state}/${viewport.width}x${viewport.height}: resize bounds/scroll/PNG/claim failure`);
   if(viewport.width===320&&state==='win'||viewport.width===411&&state==='loss')await page.screenshot({path:path.join(output,`${theme}-resize-${state}-${viewport.width}x${viewport.height}.png`)});
   rows.push({theme,case:'resize-'+state,viewport,...result});
  }
 }
}
async function main(){
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.YAMB_CHROMIUM?{executablePath:process.env.YAMB_CHROMIUM}:{})});
 try{
 const ctx=await browser.newContext(resizeOnly?{isMobile:true,hasTouch:true,deviceScaleFactor:3.5}:{});
  await ctx.route('**/*',async route=>{
   const u=new URL(route.request().url());if(u.hostname!=='online-random-fixture.local')return route.abort();
   if(u.pathname==='/www/fixture.html')return route.fulfill({contentType:'text/html',body:fixture});
   const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));
   if(!file.startsWith(path.join(root,'www')+path.sep)||!fs.existsSync(file))return route.abort();
   return route.fulfill({contentType:({'.css':'text/css','.js':'text/javascript','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  const page=await ctx.newPage();const rendererWarnings=[];
  page.on('console',m=>{if(['warning','error'].includes(m.type()))rendererWarnings.push(m.text());});
  for(const viewport of (resizeOnly?[{width:411,height:891}]:[{width:320,height:568},{width:360,height:640},{width:360,height:780},{width:412,height:915}])){
   await page.setViewportSize(viewport);const baseline={};
   for(const theme of themes){
    await page.goto('http://online-random-fixture.local/www/fixture.html');
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
    await page.addScriptTag({content:online.slice(0,online.indexOf('let onlinePlayersRefreshTimer'))});
    const managers=read('www/managers.js');
    await page.addScriptTag({content:managers.slice(managers.indexOf('class ModalManager {'),managers.indexOf('// --- 4. EFFECT MANAGER'))});
    await page.evaluate(()=>{window._safeT=k=>t(k);});
    await page.addScriptTag({content:game.replace('window.app = new YambApp();','window.TestYambApp = YambApp;')});
    await page.addScriptTag({content:read('www/features.js')});
    await page.evaluate(()=>{
     window.app=Object.create(TestYambApp.prototype);
     Object.assign(app,{players:['Andrija Milinković Maksimović','Aleksandar Petrović-Pavlović'],playerName:'Andrija Milinković Maksimović',modeTag:'Online',onlineMode:true,onlineDuelType:'random',aiMode:false,isSpectator:false,currentPlayerIdx:0,myOnlineIndex:0,roomId:'room_fixture',socket:{connected:false,emit(){}},rewardAdAttemptId:0,gameActive:true,soundMgr:{stopMusic(){},win(){},click(){}},effectMgr:{celebrateWin(){},stop(){}},isThemeUnlocked:()=>true});
     app.features=new YambFeatures(app);app.features.checkAchievements=()=>{};
     app.modal=new ModalManager();
     for(const name of ['pauseLocalGameClock','refreshLocalStats','updateStats','rememberPendingGameReward'])app[name]=()=>{};
     app.getCurrentPlayerUid=()=> 'fixture-only';
     app.queueCompletedLocalMatchResult=async()=>{throw Error('Online must not submit a local match');};
     app.calculateTotalScore=i=>i===app.myOnlineIndex?fixtureCase.score:fixtureCase.guest;
     app.safeSubmitScore=async()=>({ok:true,recordAchievements:fixtureCase.records,soloRewardPreview:fixtureCase.records===null?null:fixtureCase.reward});
     app.confirmTrophyShowcaseEntries=async()=>[];app.showTrophyUnlockShowcase=async()=>{};
     app.navigateTo=id=>{document.querySelectorAll('.screen').forEach(e=>e.classList.remove('active'));document.getElementById(id).classList.add('active');};
     app.initScores();app.createScoreTables();
     if(['easter','neon'].includes(localStorage.getItem('yamb_theme'))){
      const theme=localStorage.getItem('yamb_theme'),icons=[...document.querySelectorAll(`.${theme}-announce-col-icon`)];
      if(icons.length!==2||icons.some(i=>!i.getAttribute('src')?.includes(`theme-packs/${theme}/canonical/game-board/announce-megaphone-v1.png`)))throw Error('Both real boards must hydrate their own canonical megaphone before any fixture image helper runs');
     }
    });
    for(const script of ['theme-leaderboard-room.js','theme-invite-friend-room.js','theme-solo-results.js','theme-ducat-pack.js','theme-rewarded-video-pack.js','theme-game-header.js'])await page.addScriptTag({content:read('www/'+script)});
    await page.evaluate(async()=>{
     window.fixtureEmits=[];window.fixtureHandlers={};
     app.socket={connected:true,on:(event,fn)=>fixtureHandlers[event]=fn,off:event=>delete fixtureHandlers[event],emit:(...args)=>{fixtureEmits.push(args);if(args[0]==='get_match_power_index_gain')args[2]?.(fixtureCase.records===null?{ok:false,pending:false}:{ok:true,powerIndexGain:24});}};
     for(const name of ['reportMonitorRoomVisit','prepareThemeRoomAssets','initSocketConnection','startWaitingHofRotation'])app[name]=()=>{};
     app.requireLogin=()=>true;app.getCurrentOnlinePlayerName=()=>app.playerName;app.ensureSocketReadyForOnline=async()=>({ok:true});
     app.getFullLocalStats=()=>({});app.getLocalH2HRecordSummary=()=>({wins:150,draws:5,losses:20});app.calculatePowerIndex=()=>9876;
     app.startGame=()=>{};app.soundMgr.playMusic=()=>{};
     app.syncOnlineRandomStateImages(localStorage.getItem('yamb_theme'),{hydrate:true});
     await app.setupOnline('random',{skipRoomIntro:true});
     if(!fixtureEmits.some(([event])=>event==='find_game'))throw Error('Actual setupOnline must reach synthetic find_game');
     const pic='http://online-random-fixture.local/www/assets/theme-packs/'+localStorage.getItem('yamb_theme')+'/canonical/online-players-internal/avatar-v1.png';
     document.getElementById('waiting-my-img').src=pic;window.fixturePhoto=pic;
     window.fixtureTop3=[{name:'Andrija Milinković Maksimović',score:4200,photoUrl:pic},{name:'Aleksandar Petrović-Pavlović',score:3900,photoUrl:pic},{name:'Milica Jovanović Đorđević',score:3200,photoUrl:pic}];
    });
    if(resizeOnly){await auditFinishResize(page,theme);continue;}
    for(const state of ['searching','found','empty','loading']){
     await page.evaluate(state=>{
      if(state==='found')fixtureHandlers.game_start({roomId:'room_fixture',myIndex:0,opponent:'Aleksandar Petrović-Pavlović',oppPhoto:fixturePhoto,oppStats:{h2hRecord:{wins:100,draws:8,losses:17}},duelType:'random'});
      if(state==='empty')app.renderHallOfFame([]);
      else if(state==='loading')app.loadHallOfFame();
      else app.renderHallOfFame(fixtureTop3.map(x=>({...x})));
      window.themeInviteFriend.apply();
      for(const img of document.querySelectorAll('img[data-theme-src]:not([src])'))img.src=resolveThemeQualityAsset(img.dataset.themeSrc);
      document.querySelectorAll('*').forEach(e=>{e.style.setProperty('animation','none','important');e.style.setProperty('transition','none','important');});
     },state);
     await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
     await page.evaluate(()=>Promise.all([...document.querySelectorAll('#waiting-screen img')].filter(i=>i.getBoundingClientRect().width).map(i=>i.decode().catch(()=>{}))));
     const lobby=await page.evaluate(()=>{
      const screen=document.getElementById('waiting-screen'),metric={};
      const visible=e=>{const r=e.getBoundingClientRect();return r.width&&r.height;};
      for(const sel of ['.waiting-header','#waiting-title','.waiting-status-panel','#wait-msg','.ws-vs-area-horizontal','.ws-glass-card','.ws-glass-avatar','.ws-glass-name','.ws-glass-stats','.ws-g-stat .lbl','.ws-g-stat .val','.ws-glass-vs','.waiting-hof','.waiting-hof-title','.waiting-hof-entry','.waiting-hof-avatar','.waiting-hof-name','.waiting-hof-score','.waiting-hof-empty-state','.waiting-hof-state-canonical-icon']){const e=screen.querySelector(sel);if(!e||!visible(e))continue;const b=e.getBoundingClientRect(),s=getComputedStyle(e);metric[sel]={x:b.x,y:b.y,width:b.width,height:b.height,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,padding:s.padding,margin:s.margin,gap:s.gap,borderRadius:s.borderRadius};}
      const images=[...screen.querySelectorAll('img')].filter(visible).map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0,width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height}));
      const outside=[...screen.querySelectorAll('.waiting-header,.waiting-status-panel,.ws-glass-card,.waiting-hof')].filter(e=>{const r=e.getBoundingClientRect();return visible(e)&&(r.left<0||r.right>innerWidth+.5||r.bottom>innerHeight-24+.5);}).map(e=>e.className);
      return{metric,images,outside,scroll:screen.scrollHeight>screen.clientHeight+1,title:document.getElementById('waiting-title').textContent};
     });
     if(lobby.images.some(i=>!i.loaded))failures.push(`${theme}/lobby-${state}: broken visible PNG`);
     if(lobby.outside.length||lobby.scroll)failures.push(`${theme}/lobby-${state}/${viewport.width}: bounds or scroll ${lobby.outside}`);
     if(!baseline['lobby-'+state])baseline['lobby-'+state]=lobby.metric;
     for(const[sel,m]of Object.entries(lobby.metric))for(const[prop,v]of Object.entries(m)){const expected=baseline['lobby-'+state][sel]?.[prop];if(typeof v==='number'?Math.abs(v-expected)>=1.1:v!==expected)failures.push(`${theme}/lobby-${state}/${viewport.width} ${sel}.${prop}: ${v} != Green ${expected}`);}
     if(viewport.width===360&&viewport.height===780)await page.screenshot({path:path.join(output,`${theme}-lobby-${state}.png`)});
     rows.push({theme,case:'lobby-'+state,viewport,...lobby});
    }
    await page.evaluate(()=>{app.showServerNotice('sys_no_conn','err_title');document.querySelectorAll('*').forEach(e=>e.style.setProperty('transition','none','important'));});
    const notice=await page.evaluate(()=>{const scope=document.getElementById('custom-modal-overlay'),metric={};for(const selector of ['.custom-modal','.cm-title','.cm-msg','.cm-btn-ok']){const e=scope.querySelector(selector),b=e.getBoundingClientRect(),s=getComputedStyle(e);metric[selector]={width:b.width,height:b.height,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,padding:s.padding,borderRadius:s.borderRadius};}const r=scope.querySelector('.custom-modal').getBoundingClientRect();return{metric,context:scope.classList.contains('modal-context-online-duel'),inside:r.left>=11&&r.right<=innerWidth-11&&r.top>=24&&r.bottom<=innerHeight-24+.5};});
    assert(notice.inside&&notice.context,'Online room error notice requires scoped safe layout');
    if(!baseline.notice)baseline.notice=notice.metric;
    for(const[sel,m]of Object.entries(notice.metric))for(const[prop,v]of Object.entries(m)){const expected=baseline.notice[sel]?.[prop];if(typeof v==='number'?Math.abs(v-expected)>=1.1:v!==expected)failures.push(`${theme}/notice/${viewport.width} ${sel}.${prop}: ${v} != Green ${expected}`);}
    if(viewport.width===360&&viewport.height===780)await page.screenshot({path:path.join(output,`${theme}-notice.png`)});
    rows.push({theme,case:'notice',viewport,...notice});
    await page.evaluate(()=>app.modal.close());
    for(const [caseIndex,item]of cases.entries()){
     await page.evaluate(async({item,caseIndex})=>{
      const bonus={personal:10,weekly:10,monthly:10,all_time:20};
      const base=Math.min(8000,Math.floor(item.score*(100+(item.records||[]).reduce((a,k)=>a+bonus[k],0))/100));
      app.myOnlineIndex=caseIndex%2;app.playerName=app.players[app.myOnlineIndex];
      window.fixtureCase={...item,reward:{baseReward:base,adReward:Math.min(8000,base*2)}};
      app.gameActive=true;app.initScores();if(item.score>0)app.allScores[app.myOnlineIndex][KOLONE[caseIndex%6]].Yamb=100;
      // Deterministic message variant, still using the production message keys.
      app.getSoloFinishMessageKey=tier=>`go_msg_${tier}${caseIndex%3?`_v${caseIndex%3+1}`:''}`;
      app.getHotseatFinishCommentKey=band=>`go_hotseat_comment_${band}${caseIndex%3?`_v${caseIndex%3+1}`:''}`;
      await app.handleGameOver({force:true,onlineResult:{roomId:'room_fixture',matchId:'fixture-match',duelType:'random',finalResults:app.players.map((name,i)=>({name,score:i===app.myOnlineIndex?item.score:item.guest})),isDraw:item.score===item.guest,serverStatsAppliedUids:['fixture-only']}});window.themeSoloResults.sync(true);
      for(const img of document.querySelectorAll('img[data-theme-src]:not([src])'))img.src=resolveThemeQualityAsset(img.dataset.themeSrc);
      document.querySelectorAll('img[data-neon-board-src]:not([src])').forEach(i=>i.src=i.dataset.neonBoardSrc);
      document.querySelectorAll('*').forEach(e=>{e.style.setProperty('transition','none','important');e.style.setProperty('animation','none','important');});
     },{item,caseIndex});
     await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     await page.evaluate(()=>Promise.all([...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.width&&r.height;}).map(i=>{i.loading='eager';return i.decode().catch(()=>{});})));
     const result=await page.evaluate(caseIndex=>{
      const screen=document.getElementById('game-over-screen'),card=screen.querySelector('.modal-box'),r=card.getBoundingClientRect();
      const metric={};for(const sel of ['.modal-box','#go-tier-title','.hotseat-result-scores','.hotseat-result-player','.hotseat-result-role','.hotseat-result-name','.hotseat-result-points','#hotseat-result-comment','#go-title','#go-msg','.game-over-score-card','#solo-record-panel','.solo-record-panel-title','.solo-record-panel-grid > span','.solo-record-panel-grid img','.solo-record-panel-footer','#solo-power-index-icon','#go-score','#solo-finish-stats','.easter-solo-finish-stats > div','.easter-solo-finish-stats > div > span','.easter-solo-finish-stats strong','#solo-finish-best-column','#btn-ad-double','.game-over-claim-button','#btn-rematch','#go-rematch-icon']){
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
      return{power:document.getElementById('solo-power-index-gain').textContent,minimumPlayerContrast:Math.min(...playerContrasts),players:[...screen.querySelectorAll('[data-hotseat-player]')].map(e=>({role:e.querySelector('.hotseat-result-role').textContent,name:e.querySelector('.hotseat-result-name').textContent,score:e.querySelector('.hotseat-result-points').textContent})),rematchVisible:!!visible(document.getElementById('btn-rematch')),comment:document.getElementById('hotseat-result-comment').textContent,metric,images,overflow,markMatchesBoard,inside:r.left>=11&&r.right<=innerWidth-11&&r.top>=24&&r.bottom<=innerHeight-24+.5,cardScroll:card.scrollHeight>card.clientHeight+1,claimInside:claim.bottom<=r.bottom,adVisible:!!visible(ad),recordRoles:[...screen.querySelectorAll('[data-record-role].is-achieved')].map(e=>e.dataset.recordRole),score:document.getElementById('go-score').textContent,title:document.getElementById('go-title').textContent,mark:mark.innerHTML,claim:document.getElementById('go-claim-label').textContent,double:document.getElementById('go-double-label').textContent};
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
     assert.equal(result.power,item.records===null?'—':'+24','Only confirmed synthetic server Power Index may appear');
     assert.equal(result.rematchVisible,true,'Regular online duel must offer rematch');
     assert.equal(result.title,item.score===item.guest?'NEREŠENO!':item.score>item.guest?'POBEDA!':'PORAZ');
     assert.equal(result.players.length,2);assert.deepEqual(result.players.map(p=>p.score),[item.score,item.guest].map(n=>n.toLocaleString('sr-RS')));
     assert.deepEqual(result.players.map(p=>p.name),caseIndex%2?['Aleksandar Petrović-Pavlović','Andrija Milinković Maksimović']:['Andrija Milinković Maksimović','Aleksandar Petrović-Pavlović']);
     assert.deepEqual(result.players.map(p=>p.role),['TI','PROTIVNIK']);
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
     await page.evaluate(playerIndex=>{app.currentPlayerIdx=playerIndex;app.gameActive=true;app.navigateTo('game-scene');app.highlightCurrentPlayer();},playerIndex);
     await page.waitForTimeout(160);
     const board=await page.evaluate(()=>{const scene=document.getElementById('game-scene');return{pager:scene.classList.contains('theme-dual-board-view'),random:scene.classList.contains('random-online-duel-room'),tables:[...document.querySelectorAll('.player-table')].map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))};});
     if(!board.pager||!board.random)failures.push(`${theme}/board-${playerIndex}: missing shared online pager/random room state`);
     if(!baseline['board-'+playerIndex])baseline['board-'+playerIndex]=board.tables;
     for(const[i,m]of board.tables.entries())for(const[prop,v]of Object.entries(m))if(Math.abs(v-baseline['board-'+playerIndex][i][prop])>=1.1)failures.push(`${theme}/board-${playerIndex}/${viewport.width}: ${prop} differs from Green`);
     if(viewport.width===360&&viewport.height===780)await page.screenshot({path:path.join(output,`${theme}-board-${playerIndex}.png`)});
     rows.push({theme,case:'board-'+playerIndex,viewport,...board});
    }
    await page.evaluate(()=>{app.showOpponentReconnectGraceCountdown({remainingMs:90000});});
    await page.evaluate(()=>document.querySelector('.online-random-connection-icon')?.decode().catch(()=>{}));
    const connection=await page.evaluate(()=>{const e=document.querySelector('#turn-timer-display .online-random-connection-icon'),b=e?.getBoundingClientRect();return{src:e?.getAttribute('src'),width:b?.width,height:b?.height,random:document.getElementById('game-scene').classList.contains('random-online-duel-room'),reconnecting:document.getElementById('game-scene').classList.contains('opponent-reconnecting')};});
    if(!connection.random||!connection.reconnecting||connection.width!==27||connection.height!==27)failures.push(`${theme}/connection: disconnected icon has wrong room scope or dimensions`);
    assert(connection.src.includes(theme==='dark'?'green-soft-clay/opponent/disconnected':`theme-packs/${theme}/canonical/online-random-states/disconnected`));
    if(viewport.width===360&&viewport.height===780)await page.screenshot({path:path.join(output,`${theme}-connection.png`)});
    await page.evaluate(()=>{window.themeFixtureNotice=null;const show=window.showNotification;window.showNotification=(...args)=>{window.themeFixtureNotice=args;return show(...args);};app.requestOnlineStateSync=()=>{};fixtureHandlers.opponent_connection_restored({roomId:'room_fixture',restoredUid:'opponent'});});
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    await page.evaluate(()=>document.querySelector('.opponent-reconnected-toast img')?.decode().catch(()=>{}));
    const restored=await page.evaluate(()=>{const toast=document.querySelector('.opponent-reconnected-toast'),icon=toast?.querySelector('img'),b=toast?.getBoundingClientRect(),s=toast&&getComputedStyle(toast);return{src:icon?.getAttribute('src'),loaded:icon?.complete&&icon.naturalWidth>0,iconWidth:icon?.getBoundingClientRect().width,iconHeight:icon?.getBoundingClientRect().height,width:b?.width,height:b?.height,fontFamily:s?.fontFamily,boxSizing:s?.boxSizing,padding:s?.padding,border:s?.borderWidth,grid:s?.gridTemplateColumns,reconnecting:document.getElementById('game-scene').classList.contains('opponent-reconnecting')};});
    assert(restored.loaded&&restored.src.includes(theme==='dark'?'green-soft-clay/opponent/reconnected':`theme-packs/${theme}/canonical/online-random-states/reconnected`));assert(!restored.reconnecting);
    assert(await page.evaluate(()=>!document.querySelector('#turn-timer-display .online-random-connection-icon')&&document.getElementById('turn-timer-display').style.display==='none'),'Reconnect must clear the temporary disconnected PNG before the state-sync reply');
    if(!baseline.restored)baseline.restored=restored;
    for(const prop of ['width','height','iconWidth','iconHeight','fontFamily','grid']){const v=restored[prop],expected=baseline.restored[prop];if(typeof v==='number'?Math.abs(v-expected)>=1.1:v!==expected)failures.push(`${theme}/restored/${viewport.width}: ${prop} differs from Green`);}
    if(viewport.width===360&&viewport.height===780)await page.screenshot({path:path.join(output,`${theme}-restored.png`)});
    rows.push({theme,case:'restored',viewport,...restored});
    await page.evaluate(()=>document.getElementById('custom-notification-container')?.remove());
    rows.push({theme,case:'connection',viewport,...connection});

   }
  }
  fs.writeFileSync(path.join(output,resizeOnly?'resize-report.json':'report.json'),JSON.stringify({scope:resizeOnly?'Real handleGameOver and production CSS, mobile emulation DPR3.5; win/loss/draw with repeated viewport changes and animations enabled. Synthetic isolated results, no constructor, account, network, ads or payout. Does not reproduce Android wm density changes or prove emulator compositor correctness. Offline font fallback possible.':'Real handleGameOver/createScoreTables/PNG controllers and production CSS, isolated synthetic result/queue acknowledgments; no constructor, account, server, ads or payout. Animations disabled; offline font fallback possible.',failures,rows},null,2)+'\n');
  assert.equal(failures.length,0,failures.slice(0,35).join('\n'));console.log(resizeOnly?`PASS: ${rows.length} mobile finish resize states; centered safe bounds, no room/card scroll, loaded PNGs and no reward/rematch requests.`:`PASS: ${rows.length} Online random theme/result/viewport combinations; Green geometry/type, PNGs, flags, rewards and safe bounds.`);
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
