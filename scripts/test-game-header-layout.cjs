// Real app markup, styles and header renderers; no accounts, sockets or live games.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const themes = ['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const index = read('www/index.html');
const sheets = [...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match => match[1]);
const body = index.slice(index.indexOf('<body'), index.lastIndexOf('</body>') + 7).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const fixture = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${sheets.map(url => `<link rel="stylesheet" href="${url}">`).join('')}<style>:root{--safe-top:24px;--safe-bottom:48px;--safe-left:0px;--safe-right:0px}*{animation:none!important;transition:none!important;scroll-behavior:auto!important}</style>${body}`;
const output = path.join(root, 'tmp/game-header-layout');
const rows = [], failures = [];
async function main() {
    fs.mkdirSync(output, { recursive:true });
    const browser = await chromium.launch({headless:true, ...(process.env.YAMB_CHROMIUM ? {executablePath:process.env.YAMB_CHROMIUM} : {})});
    try {
        const context = await browser.newContext();
        await context.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.hostname !== 'header-fixture.local') return route.abort();
            if (url.pathname === '/www/fixture.html') return route.fulfill({contentType:'text/html', body:fixture});
            const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
            if (!file.startsWith(path.join(root,'www') + path.sep) || !fs.existsSync(file)) return route.abort();
            return route.fulfill({contentType:({'.css':'text/css','.js':'text/javascript','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)] || 'application/octet-stream', body:fs.readFileSync(file)});
        });
        const page = await context.newPage();
        for (const viewport of [{width:320,height:568},{width:340,height:640},{width:360,height:780},{width:380,height:800},{width:390,height:844},{width:412,height:915},{width:430,height:932}]) {
            await page.setViewportSize(viewport);
            await page.goto('http://header-fixture.local/www/fixture.html');
            await page.evaluate(() => {
                localStorage.clear(); localStorage.setItem('yamb_lang','sr');
                document.querySelectorAll('.screen').forEach(element => element.classList.remove('active'));
                document.querySelectorAll('[id*="splash"],[id*="loading-gate"]').forEach(element => element.remove());
                document.getElementById('game-scene').classList.add('active');
            });
            await page.addScriptTag({content:read('www/config.js')});
            const languages = read('www/languages.js');
            await page.addScriptTag({content:languages.slice(0,languages.indexOf('function setLanguage('))});
            await page.addScriptTag({content:read('www/game.js').replace('window.app = new YambApp();','window.TestYambApp = YambApp;')});
            await page.evaluate(() => {
                window.app = Object.create(TestYambApp.prototype);
                Object.assign(app,{players:['Andrija Milinković','Aleksandar Petrović'],playerName:'Fixture observer',onlineMode:true,
                    isSpectator:true,gameActive:true,currentPlayerIdx:0,myOnlineIndex:-1,brojBacanja:1,timeLeft:90,
                    modeTag:'Spectator',roomId:'fixture-header',onlineDuelType:'random',opponentReconnectNoticeVisible:false});
            });
            await page.addScriptTag({content:read('www/theme-online-players-room.js')});
            await page.addScriptTag({content:read('www/theme-game-header.js')});
            for (const mode of ['spectator','online-player','reconnecting','hotseat','solo']) {
                let baseline;
                for (const theme of [...themes, 'easter', 'dark']) {
                    await page.evaluate(async ({theme,mode}) => {
                        localStorage.setItem('yamb_theme',theme);
                        document.body.className = theme === 'dark' ? '' : theme + '-theme';
                        document.documentElement.dataset.splashTheme = theme;
                        Object.assign(app,{onlineMode:!['hotseat','solo'].includes(mode),isSpectator:mode==='spectator',
                            modeTag:mode==='hotseat'?'Hotseat':mode==='solo'?'Solo':mode==='spectator'?'Spectator':'Online',
                            players:mode==='solo'?['Andrija Milinković']:['Andrija Milinković','Aleksandar Petrović'],
                            opponentReconnectNoticeVisible:false});
                        app.currentOpponentPhoto = window.themeOnlinePlayers.asset('avatar',theme);
                        const scene = document.getElementById('game-scene');
                        scene.classList.remove('opponent-reconnecting');
                        app.highlightCurrentPlayer(); app.updateStatusLabel(); app.updateSpectatorIcon(2);
                        if (mode==='reconnecting') {
                            scene.classList.add('opponent-reconnecting');
                            const timer=document.getElementById('turn-timer-display');
                            timer.classList.add('timer-turn--disconnected'); timer.innerHTML='<span>0:45</span>';
                        }
                        document.querySelectorAll('*').forEach(element => {
                            element.style.setProperty('animation','none','important');
                            element.style.setProperty('transition','none','important');
                        });
                        await window.themeGameHeader.apply();
                        window.themeOnlinePlayers.apply(document.getElementById('game-scene'));
                    }, {theme,mode});
                    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
                    const metric = await page.evaluate(() => {
                        const result = {};
                        for (const selector of ['.game-header','.game-header-exit','.game-header-controls','#turn-timer-display','#gh-current-avatar','#gh-spectator-icon','#btn-undo-move','#btn-game-menu-toggle']) {
                            const element=document.querySelector('#game-scene '+selector), rect=element.getBoundingClientRect(), style=getComputedStyle(element);
                            result[selector]={x:rect.x,y:rect.y,width:rect.width,height:rect.height,display:style.display,padding:style.padding,gap:style.gap};
                        }
                        return result;
                    });
                    rows.push({viewport,mode,theme,metric});
                    if (!baseline) baseline=metric;
                    for (const selector of Object.keys(baseline)) for (const property of ['x','y','width','height']) {
                        if (Math.abs(metric[selector][property]-baseline[selector][property])>.5) failures.push({viewport,mode,theme,selector,property,expected:baseline[selector][property],actual:metric[selector][property]});
                    }
                    for (const selector of Object.keys(metric)) {
                        const box=metric[selector];
                        if (box.display==='none') continue;
                        if (box.x<-.5 || box.x+box.width>viewport.width+.5 || (selector!=='.game-header' && box.y<24-.5)) failures.push({viewport,mode,theme,selector,outsideSafeHeader:true});
                    }
                    const controls = ['.game-header-exit','#turn-timer-display','#gh-current-avatar','#gh-spectator-icon','#btn-undo-move','#btn-game-menu-toggle'].map(selector=>({selector,...metric[selector]})).filter(box=>box.display!=='none');
                    for (let i=1;i<controls.length;i++) if (controls[i].x < controls[i-1].x+controls[i-1].width-0.5) failures.push({viewport,mode,theme,overlap:[controls[i-1].selector,controls[i].selector]});
                    if (mode==='spectator' && theme==='easter' && viewport.width===360) {
                        await page.evaluate(()=>Promise.all([...document.querySelectorAll('.game-header img')].map(image=>image.decode())));
                        await page.locator('.game-header').screenshot({path:path.join(output,'easter-360.png')});
                    }
                }
            }
        }
        fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({cases:rows.length,failures,rows},null,2));
        console.log(JSON.stringify({cases:rows.length,failures:failures.length,sample:failures.slice(0,14)}));
        assert.equal(failures.length,0,'Header positions and sizes must remain stable across all ten themes and repeated theme switches');
    } finally { await browser.close(); }
}
main().catch(error => {console.error(error.message);process.exitCode=1;});
