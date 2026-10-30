// Isolated browser test of the real header/settings controllers and their PNGs.
// No auth, game constructor, socket, external host, account or reward action.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../www');
const themes = ['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const baseline = process.argv.includes('--baseline');
const baselineRef = '41d6598f118487ede3ac2f16c552e31b6a487e96';
const headerRoles = [...new Set([...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/data-game-header-role="([^"]+)"/g)].map(match=>match[1]))];
const output = path.resolve(__dirname, '../tmp/control-loading-2026-10-30');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
.screen{display:none}.screen.active{display:block}img{width:40px;height:40px}
</style></head><body><div id="main-menu" class="screen active">Menu</div>
<div id="game-scene" class="screen">
${headerRoles.map(role=>`<img data-game-header-role="${role}" alt="">`).join('')}
<button id="btn-bacaj">Bacaj</button><button id="btn-najava">Najava</button></div>
<div id="settings-screen" class="screen">
${['room','profile','display-theme','language','terms','privacy'].map(role=>`<img data-settings-role="${role}" alt="">`).join('')}
${['sound','music','vibration'].map(role=>`<label>${role}</label><input id="setting-${role}">`).join('')}
</div><script src="/theme-game-header.js"></script><script src="/theme-settings-room.js"></script></body></html>`;

async function main() {
  const requests = [], errors = [];
  let phase = 'startup';
  const server = http.createServer((req,res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') { res.setHeader('Content-Type','text/html'); res.end(html); return; }
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end(); return;
    }
    const content = baseline && ['theme-game-header.js','theme-settings-room.js'].includes(path.basename(file))
      ? execFileSync('git',['show',`${baselineRef}:www/${path.basename(file)}`],{cwd:path.dirname(root),windowsHide:true})
      : fs.readFileSync(file);
    if (/\.png$/i.test(file)) requests.push({phase,source:url.pathname+url.search,bytes:content.length});
    res.setHeader('Content-Type', /\.js$/i.test(file) ? 'application/javascript' : 'image/png');
    res.end(content);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--no-sandbox']});
    const context = await browser.newContext({viewport:{width:411,height:891},serviceWorkers:'block'});
    await context.route('**/*', route=>route.request().url().startsWith(origin+'/') ? route.continue() : route.abort());
    const page = await context.newPage();
    page.on('pageerror', e=>errors.push(e.message));
    page.on('response', response=> {if(response.status() >= 400 && !response.url().endsWith('favicon.ico')) errors.push(`${response.status()} ${response.url()}`);});
    await page.goto(origin,{waitUntil:'networkidle'});
    const startup = requests.filter(x=>x.phase==='startup');
    const rows = [];
    const raceChecks = [];
    if (!baseline) {
      assert.equal(startup.length,0,'Hidden Settings/game controls must not fetch PNGs at menu startup');
      phase = 'hidden-theme-changes';
      for (const theme of themes) {
        await page.evaluate(id=>{document.body.className=id==='dark'?'':`${id}-theme`;},theme);
        await page.waitForTimeout(25);
      }
      assert.equal(requests.length,0,'Hidden controls must not fetch PNGs on menu theme changes');
      // A late hidden header must not overwrite the shared audio icons in the
      // now-visible Settings room after the player selects a different theme.
      phase = 'late-hidden-header';
      let releaseExit, markExitHeld;
      const exitGate = new Promise(resolve=> {releaseExit=resolve;});
      const exitHeld = new Promise(resolve=> {markExitHeld=resolve;});
      const delayedExit = '**/assets/green-soft-clay/canonical/game-header/exit-v1.png*';
      const holdExit = async route=> { markExitHeld(); await exitGate; await route.continue(); };
      await page.route(delayedExit, holdExit);
      await page.evaluate(()=>{
        document.body.className='';
        document.getElementById('main-menu').classList.remove('active');
        document.getElementById('game-scene').classList.add('active');
        window.lateHeader=window.themeGameHeader.apply();
      });
      let heldTimer;
      try {
        await Promise.race([exitHeld,new Promise((_,reject)=> {heldTimer=setTimeout(()=>reject(new Error('Delayed header request not observed')),10000);})]);
      } finally { clearTimeout(heldTimer); }
      await page.evaluate(()=>{
        document.getElementById('game-scene').classList.remove('active');
        document.getElementById('settings-screen').classList.add('active');
        document.body.className='neon-theme';
      });
      await page.waitForFunction(()=>[...document.querySelectorAll('#settings-screen img')].every(img=>img.complete&&img.naturalWidth>0&&img.src===new URL(window.themeSettingsRoom.asset(img.dataset.settingsRole||img.dataset.gameHeaderRole,'neon'),location.href).href));
      releaseExit();
      await page.evaluate(()=>window.lateHeader);
      await page.waitForLoadState('networkidle');
      assert(await page.evaluate(()=>[...document.querySelectorAll('#settings-screen img')].every(img=>img.src===new URL(window.themeSettingsRoom.asset(img.dataset.settingsRole||img.dataset.gameHeaderRole,'neon'),location.href).href)), 'Late Green header replaced visible Neon Settings icons');
      assert.notEqual(await page.evaluate(()=>document.getElementById('game-scene').dataset.gameLockReady),'dark','Late hidden header committed an obsolete lock');
      raceChecks.push('PASS: late Green header cannot replace shared Neon Settings icons');
      await page.unroute(delayedExit,holdExit);
      for (const theme of themes) {
        phase = `${theme}-settings`;
        await page.evaluate(id=>{
          document.body.className=id==='dark'?'':`${id}-theme`;
          document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
          document.getElementById('settings-screen').classList.add('active');
        },theme);
        await page.waitForFunction(id=>[...document.querySelectorAll('#settings-screen img')].every(img=>img.complete && img.naturalWidth>0 && img.src===new URL(window.themeSettingsRoom.asset(img.dataset.settingsRole||img.dataset.gameHeaderRole,id),location.href).href),theme);
        const settings = await page.evaluate(()=>[...document.querySelectorAll('#settings-screen img')].map(x=>x.getAttribute('src')));
        phase = `${theme}-game`;
        await page.evaluate(()=>{
          document.getElementById('settings-screen').classList.remove('active');
          document.getElementById('game-scene').classList.add('active');
        });
        await page.waitForFunction(id=>document.getElementById('game-scene').dataset.gameLockReady===id && [...document.querySelectorAll('#game-scene img')].every(img=>img.complete&&img.naturalWidth>0&&img.src===new URL(window.themeGameHeader.asset(img.dataset.gameHeaderRole,id),location.href).href),theme);
        const header = await page.evaluate(()=>[...document.querySelectorAll('#game-scene img')].map(x=>x.getAttribute('src')));
        rows.push({theme,settingsCount:settings.length,headerCount:header.length,settings,header,status:'PASS'});
        await page.evaluate(()=>{document.getElementById('game-scene').classList.remove('active');document.getElementById('main-menu').classList.add('active');});
      }
      // Explicit readiness must still work before making a room visible.
      await page.evaluate(()=>Promise.all([window.themeGameHeader.prepare('dark'),window.themeSettingsRoom.prepare('dark',{timeoutMs:6000})]));
      assert.equal(rows.length,10);
    }
    assert.deepEqual(errors,[]);
    const report = {
      date:'2026-10-30',mode:baseline?'before':'after',baselineRef,
      scope:'Isolated Edge/mobile viewport411×891. Real two controllers/PNG files, representative hidden/visible room DOM; no complete app, network latency simulation, Android ANR proof or account.',
      startupPngRequests:startup.length,startupPngBytes:startup.reduce((n,x)=>n+x.bytes,0),
      hiddenThemeChangePngRequests:requests.filter(x=>x.phase==='hidden-theme-changes').length,
      rows,raceChecks,errors,requests
    };
    fs.mkdirSync(output,{recursive:true});
    fs.writeFileSync(path.join(output,report.mode+'.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({mode:report.mode,startupPngRequests:report.startupPngRequests,startupPngBytes:report.startupPngBytes,hiddenThemeChangePngRequests:report.hiddenThemeChangePngRequests,visibleThemes:rows.length,errors}));
  } finally {
    if(browser) await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
