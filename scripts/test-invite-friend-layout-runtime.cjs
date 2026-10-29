// Isolated production renderers. No app constructor, account, server, ads or real rewards.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YAMB_PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const output=path.join(root,'tmp/invite-friend-layout-runtime'),index=read('www/index.html');
const themes=['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const sheets=[...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const body=index.slice(index.indexOf('<body'),index.lastIndexOf('</body>')+7).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const fixture=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${sheets.map(f=>`<link rel="stylesheet" href="${f}">`).join('')}<style>:root{--safe-top:24px;--safe-bottom:48px;--safe-left:0px;--safe-right:0px}*{animation:none!important;transition:none!important;scroll-behavior:auto!important}</style>${body}`;
const languages=read('www/languages.js'),game=read('www/game.js'),online=read('www/onlinenumber.js');
const rows=[],failures=[];
async function main(){
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.YAMB_CHROMIUM?{executablePath:process.env.YAMB_CHROMIUM}:{})});
 try{
  const context=await browser.newContext();
  await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='invite-fixture.local')return route.abort();if(u.pathname==='/www/fixture.html')return route.fulfill({contentType:'text/html',body:fixture});const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(path.join(root,'www')+path.sep)||!fs.existsSync(file))return route.abort();return route.fulfill({contentType:({'.css':'text/css','.js':'text/javascript','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});});
  const page=await context.newPage();
  for(const viewport of [{width:320,height:568},{width:360,height:640},{width:360,height:780},{width:390,height:844},{width:430,height:932}]){
   await page.setViewportSize(viewport);const baseline={};
   for(const theme of themes){
    await page.goto('http://invite-fixture.local/www/fixture.html');
    await page.evaluate(({theme,themes})=>{localStorage.clear();localStorage.setItem('yamb_theme',theme);localStorage.setItem('yamb_lang','sr');document.body.className=theme==='dark'?'':theme+'-theme';document.documentElement.dataset.splashTheme=theme;document.querySelectorAll('.screen').forEach(e=>e.classList.remove('active'));document.querySelectorAll('[id*="splash"],[id*="loading-gate"]').forEach(e=>e.remove());window.YAMB_THEME_IDS=themes;window.YAMB_FREE_THEME_IDS=['dark'];window.filterYambThemeIds=a=>a;}, {theme,themes});
    await page.addScriptTag({content:read('www/theme-quality-assets.js')});
    await page.addScriptTag({content:read('www/config.js')});
    await page.addScriptTag({content:languages.slice(0,languages.indexOf('function setLanguage('))});
    await page.addScriptTag({content:online.slice(0,online.indexOf('let onlinePlayersRefreshTimer'))});
    const managers=read('www/managers.js');await page.addScriptTag({content:managers.slice(managers.indexOf('class ModalManager {'),managers.indexOf('// --- 4. EFFECT MANAGER'))});
    await page.evaluate(()=>window._safeT=k=>t(k));
    await page.addScriptTag({content:game.replace('window.app = new YambApp();','window.TestYambApp=YambApp;')});
    await page.addScriptTag({content:read('www/theme-invite-friend-room.js')});
    await page.addScriptTag({content:read('www/theme-main-room-icons.js')});
    await page.evaluate(()=>{
     window.app=Object.create(TestYambApp.prototype);window.fixtureEmits=[];window.fixtureHandlers={};window.fixtureRival=null;
     window.fixturePhoto='http://invite-fixture.local/www/assets/theme-packs/'+localStorage.getItem('yamb_theme')+'/canonical/online-players-internal/avatar-v1.png';
     Object.assign(app,{playerName:'Andrija Milinković Maksimović',onlineMode:false,modeTag:'Solo',socket:{connected:true,on:(e,fn)=>fixtureHandlers[e]=fn,off:e=>delete fixtureHandlers[e],emit:(...args)=>fixtureEmits.push(args)},friendProfilesByUid:new Map(),publicPlayerPowerCache:new Map(),friendsListUids:[],soundMgr:{click(){},win(){},playMusic(){}},isThemeUnlocked:()=>true});
     app.modal=new ModalManager();app.navigateTo=id=>{document.querySelectorAll('.screen').forEach(e=>e.classList.remove('active'));document.getElementById(id).classList.add('active');};
     for(const name of ['reportMonitorRoomVisit','prepareThemeRoomAssets','initSocketConnection','requestPublicPlayerPower'])app[name]=()=>{};
     app.requireLogin=()=>true;app.getCurrentOnlinePlayerName=()=>app.playerName;app.ensureSocketReadyForOnline=async()=>({ok:true});app.getFullLocalStats=()=>({});app.getLocalH2HRecordSummary=()=>({wins:150,draws:5,losses:20});app.calculatePowerIndex=()=>9876;app.getTopH2HRival=()=>fixtureRival;app.friendAvatarUrl=()=>fixturePhoto;app.startGame=()=>{};
     app.emitSocketAck=async(event,payload)=>{fixtureEmits.push([event,payload]);return{ok:true};};
     window.fixtureFriends=[{uid:'friend-a',socketId:'fixture-a',name:'Aleksandar Petrović-Pavlović',photoUrl:fixturePhoto,pi:12345,h2hRecord:{wins:100,draws:8,losses:17},isOnline:true},{uid:'friend-b',name:'Milica Jovanović Đorđević',photoUrl:fixturePhoto,pi:6543,h2hRecord:{wins:4,draws:1,losses:10},isOnline:false}];
    });
    for(const state of ['host-friends','host-request','host-empty','host-no-rival','host-focus-refresh','guest-wait','guest-found','notice','toast']){
     await page.evaluate(async state=>{
      app.modal.close();document.getElementById('custom-notification-container')?.remove();
      fixtureRival=state==='host-no-rival'||state==='host-empty'?null:{name:'Aleksandar Petrović-Pavlović',uid:'friend-a',photo:fixturePhoto,wins:3,draws:1,losses:4};
      if(state.startsWith('guest-')){
       await app.joinPrivateGame(app.playerName,'yamb-fixture',false);
       if(state==='guest-found')fixtureHandlers.game_start({roomId:'yamb-fixture',myIndex:0,opponent:'Aleksandar Petrović-Pavlović',oppPhoto:fixturePhoto,oppStats:{h2hRecord:{wins:100,draws:8,losses:17}},duelType:'friend_invite'});
      }else{
       await app.startPrivateHosting({skipRoomIntro:true});
       app.renderFriendsList(state==='host-empty'?[]:fixtureFriends,state==='host-request'?[{uid:'request-a',name:'Ljubica Milovanović Jovanović',photoUrl:fixturePhoto}]:[]);
       if(state==='host-focus-refresh'){const input=document.querySelector('.invite-friend-search-input');input.focus({preventScroll:true});input.value='Milica';input.setSelectionRange?.(2,4);app.renderFriendsList(fixtureFriends);if(document.querySelector('.invite-friend-search-input').value!=='Milica'||document.activeElement!==document.querySelector('.invite-friend-search-input'))throw Error('Friend list refresh lost the active search');}
       if(state==='notice')void app.handleFriendSearchResults([]);
       if(state==='toast')await app.inviteFriendToRoom('fixture-a','friend-a','Aleksandar Petrović-Pavlović');
      }
      app.stopWaitingHofRotation();clearInterval(app.friendsInterval);app.friendsInterval=null;
      document.getElementById('waiting-my-img').src=fixturePhoto;window.themeInviteFriend.apply();
      document.querySelectorAll('*').forEach(e=>{e.style.setProperty('animation','none','important');e.style.setProperty('transition','none','important');});
     },state);
     await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
     await page.evaluate(()=>Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width).map(i=>{i.loading='eager';return i.decode().catch(()=>{});}))); 
     const result=await page.evaluate(state=>{
      const screen=document.getElementById('waiting-screen'),scope=state==='notice'?document.getElementById('custom-modal-overlay'):state==='toast'?document.getElementById('custom-notification-container'):screen,metric={};
      const visible=e=>{const r=e.getBoundingClientRect();return r.width&&r.height;};
      const selectors=state==='notice'?['.custom-modal','.cm-title','.cm-msg','.cm-btn-ok']:state==='toast'?['.invite-room-toast','.custom-toast-soft-clay-icon','.toast-title','.toast-msg']:['.waiting-header','.green-invite-header-icon','#waiting-title','.waiting-status-panel','#wait-msg','.ws-vs-area-horizontal','.ws-glass-card','#waiting-my-img','#waiting-my-name','.ws-glass-stats','.ws-g-stat .lbl','.ws-g-stat .val','.easter-invite-rival-card','.easter-invite-rival-name','.easter-invite-rival-title','#friends-list-container','#friends-list-container > h3','.friend-card','.friend-card-name','.friend-card-img','.friend-card-btn','.green-friend-presence','.easter-friend-records','.easter-friend-record-row','.friend-request-label','.friend-request-actions button','.invite-friend-add-action','.invite-friend-search-form','.invite-friend-search-input','.invite-friend-search-submit','.theme-invite-add-icon','.theme-invite-send-icon','.theme-invite-empty-icon','.invite-power-icon','.invite-friend-search-icon'];
      for(const sel of selectors){const e=scope.querySelector(sel);if(!e||!visible(e))continue;const b=e.getBoundingClientRect(),s=getComputedStyle(e);metric[sel]={x:b.x,y:b.y,width:b.width,height:b.height,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,padding:s.padding,margin:s.margin,gap:s.gap,borderRadius:s.borderRadius};}
      const outside=[...screen.querySelectorAll('.waiting-header,.waiting-status-panel,.ws-vs-area-horizontal,#friends-list-container')].filter(e=>{const r=e.getBoundingClientRect();return visible(e)&&(r.left<0||r.right>innerWidth+.5||r.bottom>innerHeight-48+.5);}).map(e=>e.className);
      const cardOverflow=[...screen.querySelectorAll('.friend-card')].filter(e=>visible(e)&&[...e.querySelectorAll('button,input,.green-friend-presence,.easter-friend-record-row')].some(c=>{const a=c.getBoundingClientRect(),b=e.getBoundingClientRect();return a.bottom>b.bottom+1||a.right>b.right+1||a.left<b.left-1;})).map(e=>e.className);
      const images=[...scope.querySelectorAll('img')].filter(visible).map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0,width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height}));
      return{metric,images,outside,cardOverflow,scroll:screen.scrollHeight>screen.clientHeight+1,shareVisible:visible(document.getElementById('share-area')),searchCount:screen.querySelectorAll('.invite-friend-search-input').length,disabledOffline:screen.querySelector('.friend-player-card.is-offline button')?.disabled,onlineEnabled:!screen.querySelector('.friend-player-card.is-online button')?.disabled};
     },state);
     if(result.images.some(i=>!i.loaded))failures.push(`${theme}/${state}: broken visible PNG`);
     if(result.scroll||result.outside.length||result.cardOverflow.length)failures.push(`${theme}/${state}/${viewport.width}x${viewport.height}: scroll/bounds/cards ${result.outside};${result.cardOverflow}`);
     assert(!result.shareVisible,'Share link must stay hidden');
     if(state.startsWith('host-'))assert.equal(result.searchCount,1);
     if(['host-friends','host-focus-refresh'].includes(state))assert(result.disabledOffline&&result.onlineEnabled,'Only an online friend can be invited');
     if(!baseline[state])baseline[state]=result.metric;
     for(const[sel,m]of Object.entries(result.metric))for(const[prop,v]of Object.entries(m)){const expected=baseline[state][sel]?.[prop];if(typeof v==='number'?Math.abs(v-expected)>=1.1:v!==expected)failures.push(`${theme}/${state}/${viewport.width} ${sel}.${prop}: ${v} != Green ${expected}`);}
     if(viewport.width===360&&viewport.height===780)await page.screenshot({path:path.join(output,`${theme}-${state}.png`)});
     rows.push({theme,case:state,viewport,...result});
    }
   }
  }
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({scope:'Actual startPrivateHosting/joinPrivateGame/renderFriendsList/renderInviteOwnerRival and socket UI handlers with synthetic data; blocked network, no real account/invite/match. Animations disabled; UTF-8 and possible offline font fallback.',rows,failures},null,2)+'\n');
  assert.equal(failures.length,0,failures.slice(0,35).join('\n'));console.log(`PASS: ${rows.length} Invite Friend states/theme/viewports; Green geometry/type, PNGs, search preservation and safe bounds.`);
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
