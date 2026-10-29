// Isolated Chromium fixture: real room renderer/CSS, synthetic players, no account or server.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const themes = ['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const css = [...fs.readFileSync(path.join(root,'www/index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const output = path.join(root,'tmp/quarterly-layout-runtime');
const rows = [];
const round = n => Math.round(n*100)/100;
const fixture = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${css.map(file=>`<link rel="stylesheet" href="${file}">`).join('')}<style>:root{--safe-top:24px;--safe-bottom:24px;--safe-left:0px;--safe-right:0px}body{margin:0} </style></head><body></body></html>`;
async function main() {
  fs.mkdirSync(output,{recursive:true});
  const browser = await chromium.launch({headless:true, ...(process.env.YAMB_CHROMIUM ? {executablePath:process.env.YAMB_CHROMIUM}: {})});
  try {
    const context = await browser.newContext();
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if(url.hostname !== 'league-fixture.local') return route.abort();
      if(url.pathname === '/www/fixture.html') return route.fulfill({contentType:'text/html',body:fixture});
      if(url.pathname === '/www/fixture-avatar.png') return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=','base64')});
      const file = path.resolve(root,'.'+decodeURIComponent(url.pathname));
      if(!file.startsWith(path.join(root,'www')+path.sep) || !fs.existsSync(file)) return route.abort();
      const type = {'.css':'text/css','.png':'image/png','.js':'text/javascript'}[path.extname(file)] || 'application/octet-stream';
      await route.fulfill({contentType:type,body:fs.readFileSync(file)});
    });
    const page = await context.newPage();
    for(const viewport of [{width:320,height:568},{width:360,height:780},{width:411,height:891},{width:768,height:1024}]) {
      await page.setViewportSize(viewport);
      let baseline;
      const hofBaseline={};
      for(const theme of themes) {
        await page.goto('http://league-fixture.local/www/fixture.html');
        await page.evaluate(theme=>{
          localStorage.clear();
          localStorage.setItem('yamb_theme',theme);
          document.body.className = theme === 'dark' ? '' : `${theme}-theme`;
          document.documentElement.dataset.splashTheme = theme;
          window.getThemeMedalSource = (_context,tier,selectedTheme) => `${selectedTheme==='dark'?'assets/green-soft-clay':`assets/theme-packs/${selectedTheme}`}/canonical/competition-medals/quarterly-league-${tier}-v2.png`;
        },theme);
        await page.addScriptTag({content:fs.readFileSync(path.join(root,'www/theme-quarterly-league-room.js'),'utf8')});
        await page.addScriptTag({content:fs.readFileSync(path.join(root,'www/kvartalnaliga.js'),'utf8').replace('window.kvartalnaLiga = new KvartalnaLigaManager();','')});
        await page.evaluate(()=>{
          const m = window.kvartalnaLiga = Object.create(KvartalnaLigaManager.prototype);
          m.getScores = () => ({quarterlyScore:37969,baselineScore:291961});
          m.setupLeaderboardInfiniteScroll = m.setupTouch = m.syncWithServer = m.fetchLeaderboard = () => {};
          m.fetchHallOfFame = () => m.renderHofMedals();
          const photoUrl='http://league-fixture.local/www/fixture-avatar.png';
          m.hofData = {medals:[{playerName:'Takmičar sa veoma dugim imenom i prezimenom',photoUrl,gold:12,silver:10,bronze:8}], champions:[{playerName:'Takmičar sa veoma dugim imenom i prezimenom',photoUrl,cycle:3,quarter:3,year:2026,score:2958424}]};
          m.showModal();
          m.renderList('majstor',[{playerName:'Takmičar sa veoma dugim imenom i prezimenom',photoUrl,score:47973}]);
        });
        await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode().catch(()=>{}))));
        const dimensions = await page.evaluate(()=>{
          const selectors = ['.modal-box','#league-modal-title','.league-summary-card','.league-current-rank','.league-summary-points','.league-rank-heading','.league-page-dot','#tab-league-main','#tab-league-hof'];
          const result={};
          for(const selector of selectors){
            const el=document.querySelector('#league-modal-overlay '+selector), r=el.getBoundingClientRect(), s=getComputedStyle(el);
            result[selector]={x:r.x,y:r.y,width:r.width,height:r.height,fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight,fontFamily:s.fontFamily};
          }
          const r=document.querySelector('#league-modal-overlay .modal-box').getBoundingClientRect();
          const dot=document.querySelector('.league-page-dot');
          return {elements:result,bodyOverflow:document.documentElement.scrollWidth>innerWidth,inside:r.left>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight-24+.5,dotBefore:getComputedStyle(dot,'::before').width};
        });
        for(const value of Object.values(dimensions.elements)) for(const key of ['x','y','width','height']) value[key]=round(value[key]);
        assert(dimensions.inside, `${theme}/${viewport.width}: shell exceeds safe envelope ${JSON.stringify(dimensions.elements['.modal-box'])}`);
        assert(!dimensions.bodyOverflow,`${theme}/${viewport.width}: horizontal page overflow`);
        assert.equal(dimensions.elements['.league-page-dot'].width,44);
        assert.equal(dimensions.dotBefore,'10px');
        if(!baseline) baseline=dimensions;
        // Compare actual computed styles/boxes, rather than merely matching CSS declarations.
        for(const [selector,actual] of Object.entries(dimensions.elements)) for(const [property,value] of Object.entries(actual)) {
          const expected=baseline.elements[selector][property];
          if(typeof value==='number') assert(Math.abs(value-expected)<=1,`${theme}/${viewport.width} ${selector}.${property}: ${value} != Green ${expected}`);
          else assert.equal(value,expected,`${theme}/${viewport.width} ${selector}.${property}`);
        }
        const tabStates=[];
        for(const state of ['medals','champions']) {
          await page.evaluate(state=>{window.kvartalnaLiga.toggleMainView('hof');window.kvartalnaLiga.switchHofTab(state);},state);
          await page.locator(state==='medals'?'#hof-tab-medals':'#hof-tab-champions').hover();
          const result=await page.evaluate(()=>{
            const active=document.querySelector('.league-hof-tab-button.is-active'), inactive=document.querySelector('.league-tab-button.btn-secondary');
            const a=getComputedStyle(active),i=getComputedStyle(inactive),shell=document.querySelector('#league-modal-overlay .modal-box').getBoundingClientRect();
            const overflow=[...document.querySelectorAll('#hof-list li')].some(el=>el.scrollWidth>el.clientWidth+1||el.getBoundingClientRect().right>shell.right);
            const selectors=['#hof-tab-medals','#hof-tab-champions','#hof-list > li','.ql-hof-avatar','.ql-hof-player'];
            const metrics=Object.fromEntries(selectors.map(selector=>{const el=document.querySelector(selector),s=getComputedStyle(el),r=el.getBoundingClientRect();return[selector,{width:r.width,height:r.height,fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight,padding:s.padding,margin:s.margin}];}));
            return {activeColor:a.color,inactiveColor:i.color,expectedInk:getComputedStyle(document.querySelector('#league-modal-overlay')).getPropertyValue('--theme-card-ink').trim(),overflow,metrics};
          });
          assert(!result.overflow,`${theme}/${viewport.width}/${state}: long-name card overflow`);
          if(!hofBaseline[state])hofBaseline[state]=result.metrics;
          for(const [selector,metric] of Object.entries(result.metrics))for(const [property,value] of Object.entries(metric)){
            const expected=hofBaseline[state][selector][property];
            if(typeof value==='number')assert(Math.abs(value-expected)<=1,`${theme}/${viewport.width}/${state} ${selector}.${property}: ${value} != Green ${expected}; actual ${JSON.stringify(result.metrics)}; Green ${JSON.stringify(hofBaseline[state])}`);
            else assert.equal(value,expected,`${theme}/${viewport.width}/${state} ${selector}.${property}`);
          }
          assert(result.metrics['.ql-hof-avatar'].width >= 30,`${theme}/${state}: long name collapsed avatar`);
          if(theme!=='dark'){
            const expected=await page.evaluate(()=>{const x=document.createElement('i');x.style.color='var(--theme-card-ink)';document.querySelector('#league-modal-overlay').append(x);const c=getComputedStyle(x).color;x.remove();return c;});
            assert.equal(result.activeColor,expected,`${theme}: active/hover tab ink must follow palette`);
            assert.equal(result.inactiveColor,expected,`${theme}: inactive tab ink must follow palette`);
          }
          tabStates.push({state,...result});
        }
        if(viewport.width===360) await page.screenshot({path:path.join(output,`${theme}-champions.png`)});
        rows.push({theme,viewport,dimensions,tabStates});
      }
    }
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({scope:'Isolated local Chromium fixture, synthetic players, no server/account. Montserrat declared; offline rendering may use Arial fallback.',rows},null,2)+'\n');
    console.log(`PASS: ${rows.length} theme/viewport cases; Green geometry and font parity, safe bounds, 44px pagers, long-name medal/champion cards and palette tab states.`);
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
