// Production Daily/Modal renderers, synthetic data only; no account or external network.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YAMB_PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const output=path.join(root,'tmp/daily-layout-runtime'),index=read('www/index.html');
const themes=['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const sheets=[...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const modal=index.slice(index.indexOf('<div id="custom-modal-overlay"'),index.indexOf('<div id="chat-float-btn"'));
const fixture=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${sheets.map(f=>`<link rel="stylesheet" href="${f}">`).join('')}<style>:root{--safe-top:24px;--safe-bottom:24px;--safe-left:0px;--safe-right:0px}*{animation:none!important;transition:none!important;scroll-behavior:auto!important}</style><body>${modal}</body>`;
const managers=read('www/managers.js'),languages=read('www/languages.js'),config=read('www/config.js'),rows=[],failures=[];
async function main(){
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.YAMB_CHROMIUM?{executablePath:process.env.YAMB_CHROMIUM}:{})});
 try{
  const ctx=await browser.newContext();
  await ctx.route('**/*',async route=>{
   const u=new URL(route.request().url());if(u.hostname!=='daily-fixture.local')return route.abort();
   if(u.pathname==='/www/fixture.html')return route.fulfill({contentType:'text/html',body:fixture});
   const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));
   if(!file.startsWith(path.join(root,'www')+path.sep)||!fs.existsSync(file))return route.abort();
   return route.fulfill({contentType:({'.css':'text/css','.js':'text/javascript','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  const page=await ctx.newPage();
  for(const viewport of [{width:320,height:568},{width:360,height:780},{width:412,height:915}]){
   await page.setViewportSize(viewport);const baseline={};
   for(const theme of themes){
    await page.goto('http://daily-fixture.local/www/fixture.html');
    await page.evaluate(theme=>{document.body.className=theme==='dark'?'':`${theme}-theme`;document.documentElement.dataset.splashTheme=theme;localStorage.clear();localStorage.setItem('yamb_theme',theme);window._safeT=k=>t(k);},theme);
    await page.addScriptTag({content:read('www/theme-quality-assets.js')});
    await page.evaluate(themes=>{window.YAMB_THEME_IDS=themes;window.YAMB_FREE_THEME_IDS=['dark'];window.filterYambThemeIds=a=>(Array.isArray(a)?a:[]).filter(x=>YAMB_THEME_IDS.includes(x));},themes);
    await page.addScriptTag({content:config.slice(config.indexOf('const SHOP_DATA ='),config.indexOf('// Export'))});
    await page.addScriptTag({content:languages.slice(0,languages.indexOf('function setLanguage('))});
    await page.addScriptTag({content:managers.slice(managers.indexOf('class ModalManager {'),managers.indexOf('// --- 4. EFFECT MANAGER'))});
    await page.addScriptTag({content:read('www/dnevniizazov.js')});
    await page.addScriptTag({content:read('www/features.js')});
    await page.evaluate(()=>{
     window.app={modal:new ModalManager(),isThemeUnlocked:()=>true,setInviteBusyState(){}};
     app.features=new YambFeatures(app);
     localStorage.setItem('yamb_active_skin',SHOP_DATA.SKINS.find(s=>s.themeGift===localStorage.getItem('yamb_theme')).id);
     window.dnevniIzazov=new DnevniIzazov(app);
     dnevniIzazov.serverDiceValues=[1,2,3,4,5,6];dnevniIzazov.currentBaseReward=300;
    });
    for(const state of ['active','complete','already','reward','error']){
     await page.evaluate(state=>{
      app.modal.close();const d=dnevniIzazov,overlay=document.getElementById('glass-daily-overlay');
      overlay.classList.remove('active','daily-glass-overlay--blank');d.clearDailyResult();
      if(state==='active'||state==='complete'){
       overlay.classList.add('active');d.resetGame();d.isActive=false;
       for(let i=0;i<6;i++){const e=document.getElementById(`gd-${i}`);e.innerHTML=d.getDiceDotsHTML(i+1);e.classList.add(i===0&&state==='active'?'rolling':'locked');}
       document.getElementById('glass-daily-sum').innerText=state==='complete'?'864':'0';
       if(state==='complete'){d.calculatedReward=864;d.showResultModal();}
      }else if(state==='already')d.showAlreadyPlayedInfo();
      else if(state==='reward')app.modal.alert(d.getDailyRewardMessage('dc_reward_won',864),t('dc_success'),{contextClass:'daily'});
      else app.modal.alert(t('err_server_conn'),t('info_title'),{contextClass:'daily'});
      document.querySelectorAll('img[data-theme-src]:not([src])').forEach(i=>i.src=resolveThemeQualityAsset(i.dataset.themeSrc));
     },state);
     await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     await page.evaluate(()=>Promise.all([...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.width&&r.height;}).map(i=>i.decode().catch(()=>{}))));
     const dicePngs=await page.evaluate(async()=>{
      const dice=[...document.querySelectorAll('#glass-daily-overlay.active .daily-glass-die')];
      return Promise.all(dice.map(async e=>{const source=getComputedStyle(e).backgroundImage.match(/url\("?([^"\)]+)/)?.[1];if(!source)return{source:null,loaded:false};const img=new Image();img.src=source;await img.decode().catch(()=>{});return{source,loaded:img.naturalWidth>0};}));
     });
     const result=await page.evaluate(state=>{
      const scope=document.getElementById(['active','complete'].includes(state)?'glass-daily-overlay':'custom-modal-overlay');
      const metric={};for(const sel of ['.daily-glass-card','.daily-glass-header','.daily-glass-title','.daily-glass-subtitle','.daily-room-mark','.daily-task-mark','.daily-glass-dice-grid','.daily-glass-die','.daily-glass-score-box','.daily-glass-score-lbl','.daily-glass-score-val','.daily-complete-mark','.daily-glass-btn-stop','.daily-glass-btn-double','.daily-glass-btn-claim','.custom-modal','.cm-title','.cm-msg','.cm-btn-ok','.daily-already-icon','.daily-already span']){
       const e=scope.querySelector(sel);if(!e)continue;const r=e.getBoundingClientRect(),s=getComputedStyle(e);metric[sel]={width:r.width,height:r.height,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,padding:s.padding,borderRadius:s.borderRadius};
      }
      const card=scope.querySelector('.daily-glass-card,.custom-modal'),r=card.getBoundingClientRect();
      const badImages=[...scope.querySelectorAll('img')].filter(i=>{const r=i.getBoundingClientRect();return r.width&&r.height&&(!i.complete||!i.naturalWidth);}).map(i=>i.src);
      const overflow=[...scope.querySelectorAll('.daily-glass-card,.daily-glass-title,.daily-glass-subtitle,.daily-glass-score-box,.daily-glass-btn,.cm-btn')].filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.className);
      const text=[...scope.querySelectorAll('.daily-glass-title,.daily-glass-subtitle,.daily-glass-score-lbl,.daily-glass-score-val,.daily-glass-btn,.cm-title,.cm-msg,.cm-btn,.daily-already span')].filter(e=>e.getBoundingClientRect().height).map(e=>({selector:e.className||e.id,color:getComputedStyle(e).color,background:getComputedStyle(e).background,shadow:getComputedStyle(e).textShadow}));
      const contrast=(a,b)=>{const l=s=>s.match(/[\d.]+/g).slice(0,3).map(Number).map(c=>c/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((a,c,i)=>a+c*[.2126,.7152,.0722][i],0);const v=[l(a),l(b)].sort((a,b)=>b-a);return(v[0]+.05)/(v[1]+.05);};
      const button=scope.querySelector('.cm-btn-ok'),buttonStyle=button&&getComputedStyle(button);
      const noticeContrast=buttonStyle?contrast(buttonStyle.color,buttonStyle.backgroundColor):null;
      return{metric,badImages,overflow,text,noticeContrast,inside:r.left>=0&&r.right<=innerWidth+.5&&r.top>=24&&r.bottom<=innerHeight-24+.5,cardScroll:card.scrollHeight>card.clientHeight+2};
     },state);
     if(!result.inside)failures.push(`${theme}/${state}/${viewport.width}: safe bounds`);
     if(result.badImages.length)failures.push(`${theme}/${state}: broken PNG ${result.badImages}`);
     if(result.overflow.length)failures.push(`${theme}/${state}/${viewport.width}: overflow ${result.overflow}`);
     if(result.cardScroll)failures.push(`${theme}/${state}/${viewport.width}: card scroll`);
     if(dicePngs.some(p=>!p.loaded))failures.push(`${theme}/${state}/${viewport.width}: dice PNG skin missing`);
     if(result.noticeContrast!==null&&result.noticeContrast<4.5)failures.push(`${theme}/${state}: notice button contrast ${result.noticeContrast}`);
     if(!baseline[state])baseline[state]=result.metric;
     for(const[sel,m]of Object.entries(result.metric))for(const[prop,v]of Object.entries(m)){
      const expected=baseline[state][sel]?.[prop];if(typeof v==='number'?Math.abs(v-expected)>=1.1:v!==expected)failures.push(`${theme}/${state}/${viewport.width} ${sel}.${prop}: ${v} != Green ${expected}`);
     }
     if(viewport.width===360)await page.screenshot({path:path.join(output,`${theme}-${state}.png`)});
     rows.push({theme,state,viewport,dicePngs,...result});
    }
   }
  }
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({scope:'Isolated production Daily/Modal renderers and CSS; synthetic dice/results, no account/network. Animation disabled; Montserrat may use offline fallback.',failures,rows},null,2)+'\n');
  assert.equal(failures.length,0,failures.slice(0,30).join('\n'));console.log(`PASS: ${rows.length} Daily theme/state/viewport combinations; Green geometry/type, safe bounds and visible PNGs.`);
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
