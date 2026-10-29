// Isolated fixture: production renderer/styles, synthetic inventory, no account/server.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YAMB_PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'tmp/treasury-layout-runtime');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const themes=['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const index=read('www/index.html'),config=read('www/config.js'),managers=read('www/managers.js');
const css=[...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const room=index.slice(index.indexOf('<div id="riznica-screen"'),index.indexOf('<div id="riznica-intro"')).replace('class="screen"','class="screen active"');
const fixture=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${css.map(x=>`<link rel="stylesheet" href="${x}">`).join('')}<style>:root{--safe-top:24px;--safe-bottom:24px;--safe-left:0px;--safe-right:0px}</style><body>${room}</body>`;
const shopSource=managers.slice(managers.indexOf('class ShopManager {'),managers.indexOf('// --- 7. ADMOB CONTROLLER'));
const rows=[];
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.YAMB_CHROMIUM?{executablePath:process.env.YAMB_CHROMIUM}:{})});
 try{
  const context=await browser.newContext();
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname!=='treasury-fixture.local')return route.abort();
   if(u.pathname==='/www/fixture.html')return route.fulfill({contentType:'text/html',body:fixture});
   const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));
   if(!file.startsWith(path.join(root,'www')+path.sep)||!fs.existsSync(file))return route.abort();
   return route.fulfill({contentType:({'.css':'text/css','.js':'text/javascript','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  const page=await context.newPage();
  for(const viewport of [{width:320,height:568},{width:360,height:780},{width:412,height:915}]){
   await page.setViewportSize(viewport);const baseline={};
   for(const theme of themes){
    await page.goto('http://treasury-fixture.local/www/fixture.html');
    await page.evaluate(({theme,themes})=>{
     document.body.className=theme==='dark'?'':`${theme}-theme`;
     document.documentElement.dataset.splashTheme=theme;localStorage.clear();localStorage.setItem('yamb_theme',theme);
     window.YAMB_THEME_IDS=themes;window.YAMB_FREE_THEME_IDS=['dark'];window.filterYambThemeIds=a=>(Array.isArray(a)?a:[]).filter(x=>themes.includes(x));
     window.resolveText=v=>typeof v==='string'?v:v?.sr||'';
     window._safeT=k=>({btn_bought:'Kupljeno',btn_won:'Osvojeno',btn_active:'AKTIVNO',btn_equip:'KORISTI',btn_buy:'KUPI',shop_unlock:'Otključaj',shop_watch_to_unlock:'Gledaj za otključavanje'})[k]||k;
     window.getActiveGameLogoSource=()=>'';
    },{theme,themes});
    await page.addScriptTag({content:read('www/theme-quality-assets.js')});
    await page.addScriptTag({content:config.slice(config.indexOf('const SHOP_DATA ='),config.indexOf('// Export'))});
    const languages=read('www/languages.js');
    await page.addScriptTag({content:languages.slice(languages.indexOf('function dukatIconHtml('),languages.indexOf('function formatDukatIcons('))});
    await page.addScriptTag({content:shopSource});
    for(const [tab,key]of[['trophy','TROPHIES'],['skin','SKINS'],['effect','EFFECTS'],['theme','THEMES']]){
     await page.evaluate(({tab,key})=>{
      document.getElementById('riznica-screen').dataset.riznicaTab=tab;
      const m=window.fixtureShop=Object.create(ShopManager.prototype);
      Object.assign(m,{type:tab,items:SHOP_DATA[key],container:document.getElementById('riznica-shop-container'),discountedItems:{},unlocked:SHOP_DATA[key].filter((_,i)=>i%2===0).map(x=>x.id),activeItem:SHOP_DATA[key][0].id});
      m.getOwnedThemeIds=()=>YAMB_THEME_IDS;m.render();
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.id===({trophy:'tab-trophies',skin:'tab-skins',effect:'tab-effects',theme:'tab-themes'})[tab]));
      document.getElementById('riznica-shop-container').scrollTop=0;
      const t=localStorage.getItem('yamb_theme'),prefix=t==='dark'?'assets/green-soft-clay':`assets/theme-packs/${t}`;
      document.querySelector('.riznica-header-logo').src=prefix+'/treasury-free-v3.png';
      document.querySelectorAll('[data-treasury-control]').forEach(i=>i.src=getThemeTreasuryControlSource(i.dataset.treasuryControl));
      document.querySelectorAll('img.dukat-icon-inline--green').forEach(i=>i.src=i.dataset.themeSrc);
      // The full app's theme observer fills deferred data-theme-src images after render.
      document.querySelectorAll('img[data-theme-src]:not([src])').forEach(i=>i.src=resolveThemeQualityAsset(i.dataset.themeSrc));
      document.querySelectorAll('#riznica-screen img[loading="lazy"]').forEach(img=>{const r=img.getBoundingClientRect();if(r.top<innerHeight)img.loading='eager';});
     },{tab,key});
     await page.evaluate(()=>Promise.all([...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight).map(i=>i.decode().catch(()=>{}))));
     const state=await page.evaluate(()=>{
      const shell=document.querySelector('#riznica-screen'),tabs=shell.querySelector('.riznica-tabs'),tr=tabs.getBoundingClientRect();
      const selectors=['.riznica-header','.riznica-header-title','.tab-btn','.treasury-control-icon','.riznica-trophy-visual','.riznica-trophy-soft-clay-icon','.treasury-skin-image','.treasury-effect-image','.treasury-theme-preview','.category-grid > .card','.card .title','.card .desc','.card .price','.card .status','.card .btn-action'];
      const metrics={};
      for(const sel of selectors){const e=shell.querySelector(sel);if(!e)continue;const s=getComputedStyle(e),r=e.getBoundingClientRect();metrics[sel]={width:r.width,fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight,fontFamily:s.fontFamily,letterSpacing:s.letterSpacing,textTransform:s.textTransform,padding:s.padding};if(!sel.includes('.card')||sel==='.category-grid > .card')metrics[sel].height=r.height;}
      const overflow=[...shell.querySelectorAll('.card .title,.card .desc,.card .price,.card .status,.card .btn-action,.category-header')].filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.className);
      const badImages=[...shell.querySelectorAll('img')].filter(i=>{const r=i.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0&&(!i.complete||!i.naturalWidth);}).map(i=>i.currentSrc||i.src);
      const samples={};for(const sel of ['.riznica-header-title','.riznica-ad-btn','.status-unlocked','.status-locked']){const e=shell.querySelector(sel);if(!e)continue;const s=getComputedStyle(e);samples[sel]={color:s.color,background:s.background,shadow:s.textShadow};}
      const probe=document.createElement('i');probe.style.color='var(--theme-card-ink)';shell.append(probe);const ink=getComputedStyle(probe).color;probe.remove();
      return{metrics,overflow,badImages,samples,ink,tabBounds:[tr.left,tr.right],horizontal:shell.scrollWidth>innerWidth,bodyHorizontal:document.documentElement.scrollWidth>innerWidth,cards:shell.querySelectorAll('.category-grid > .card').length};
     });
     assert(state.cards>0,`${theme}/${tab}: no catalog`);
     assert(!state.horizontal&&!state.bodyHorizontal,`${theme}/${tab}/${viewport.width}: horizontal overflow`);
     assert(state.tabBounds[0]>=0&&state.tabBounds[1]<=viewport.width+1,`${theme}: tabs outside viewport`);
     assert.deepEqual(state.overflow,[],`${theme}/${tab}/${viewport.width}: text overflow`);
     assert.deepEqual(state.badImages,[],`${theme}/${tab}/${viewport.width}: visible image missing`);
     if(!baseline[tab])baseline[tab]=state.metrics;
     for(const[sel,m]of Object.entries(state.metrics))for(const[prop,value]of Object.entries(m)){
      // Content height varies with wrapping; common geometry and text metrics must not.
      if(prop==='height'&&sel==='.category-grid > .card')continue;
      const expected=baseline[tab][sel]?.[prop];
      if(typeof value==='number')assert(Math.abs(value-expected)<=1,`${theme}/${tab}/${viewport.width} ${sel}.${prop}: ${value} != Green ${expected}; actual ${JSON.stringify(m)}; Green ${JSON.stringify(baseline[tab][sel])}`);
      else assert.equal(value,expected,`${theme}/${tab}/${viewport.width} ${sel}.${prop}`);
     }
     if(theme!=='dark')for(const[sel,s]of Object.entries(state.samples)){
      assert.equal(s.color,state.ink,`${theme}/${tab} ${sel}: palette ink`);assert.equal(s.shadow,'none',`${theme}/${tab} ${sel}: blurry shadow`);
     }
     rows.push({theme,tab,viewport,...state});
     if(viewport.width===360&&tab==='trophy')await page.screenshot({path:path.join(out,`${theme}.png`)});
    }
   }
  }
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({scope:'Isolated Chromium: production ShopManager renderer/CSS with synthetic ownership. External network blocked. Montserrat declared; offline Arial fallback possible. Not an Android/deploy confirmation.',rows},null,2)+'\n');
  console.log(`PASS: ${rows.length} theme/tab/viewport combinations; Green metrics, palette header/status, no horizontal clipping.`);
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

