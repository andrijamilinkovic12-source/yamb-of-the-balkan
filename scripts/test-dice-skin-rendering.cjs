'use strict';
// Production CSS and renderers with synthetic inventory; all requests stay local.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, 'www', file), 'utf8');
const index = read('index.html');
const sheets = [...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match => match[1]);
const body = index.slice(index.indexOf('<body'), index.lastIndexOf('</body>') + 7)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const fixture = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${sheets.map(src => `<link rel="stylesheet" href="${src}">`).join('')}${body}`;
const output = path.join(root, 'tmp', 'dice-skin-rendering');

(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ headless: true,
        ...(process.env.YAMB_CHROMIUM ? { executablePath: process.env.YAMB_CHROMIUM } : {}) });
    try {
        const context = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname !== 'dice-audit.local') return route.abort();
            if (url.pathname === '/fixture.html') return route.fulfill({ contentType: 'text/html', body: fixture });
            const file = path.resolve(root, 'www', '.' + decodeURIComponent(url.pathname));
            if (!file.startsWith(path.join(root, 'www') + path.sep) || !fs.existsSync(file)) return route.abort();
            return route.fulfill({ contentType: ({ '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('http://dice-audit.local/fixture.html');
        await page.evaluate(() => {
            document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('[id*="splash"],[id*="loading-gate"],#rotate-lock-overlay').forEach(el => el.remove());
            document.getElementById('game-scene').classList.add('active');
            localStorage.setItem('yamb_lang', 'sr');
            localStorage.setItem('yamb_uid', 'isolated-dice-audit');
        });
        for (const file of ['languages.js', 'theme-quality-assets.js', 'config.js', 'features.js', 'dailyChallengeCore.js', 'dnevniizazov.js']) {
            await page.addScriptTag({ content: read(file) });
        }
        await page.addScriptTag({ content: read('game.js').replace('window.app = new YambApp();', 'window.TestYambApp = YambApp;') });
        await page.evaluate(() => {
            window.app = Object.create(TestYambApp.prototype);
            Object.assign(app, {
                isThemeUnlocked: () => true,
                diceBtns: [],
                brojBacanja: 1, kockiceVals: [1, 2, 3, 4, 5, 6],
                zadrzane: [false, true, false, true, false, true],
                soundMgr: { roll() {} }, vibrate() {}, soundEnabled: false,
                socket: { connected: false }, stats: { unlockedSkins: SHOP_DATA.SKINS.map(s => s.id) }
            });
            app.uiInit();
            if (app.diceBtns.length !== 6) throw Error('Main dice fixture is incomplete');
            app.features = new YambFeatures(app);
            window.daily = new DnevniIzazov(app);
        });
        const report = await page.evaluate(async () => {
            const themes = SHOP_DATA.THEMES.map(item => item.id);
            const failures = [], rows = [], signatures = {};
            for (const theme of themes) {
                document.body.className = theme === 'dark' ? '' : `${theme}-theme`;
                localStorage.setItem('yamb_theme', theme);
                for (const skin of SHOP_DATA.SKINS) {
                    localStorage.setItem('yamb_active_skin', skin.id);
                    app.updateDiceVisuals();
                    daily.resetGame();
                    for (let i = 0; i < 6; i++) {
                        const el = document.getElementById(`gd-${i}`);
                        el.innerHTML = daily.getDiceDotsHTML(i + 1);
                        el.classList.add(i === 0 ? 'rolling' : 'locked');
                    }
                    const check = (el, value, type) => {
                        const style = getComputedStyle(el);
                        const pips = [...el.querySelectorAll('.dice-dot')];
                        if (!style.backgroundImage.includes(`/${skin.id}-face-v1.png`)) failures.push(`${theme}/${skin.id}/${type}: wrong background ${style.backgroundImage}`);
                        if (!el.classList.contains(`skin-${skin.id}`)) failures.push(`${theme}/${skin.id}/${type}: wrong class`);
                        if (pips.length !== value || pips.some(p => getComputedStyle(p).display === 'none' || getComputedStyle(p).opacity === '0')) failures.push(`${theme}/${skin.id}/${type}: wrong/hidden pips`);
                        return [style.backgroundImage, style.color, getComputedStyle(pips[0]).backgroundImage, getComputedStyle(pips[0]).backgroundColor];
                    };
                    const main = app.diceBtns.map((el, i) => check(el, i + 1, `main-${i}`));
                    const day = Array.from({ length: 6 }, (_, i) => check(document.getElementById(`gd-${i}`), i + 1, `daily-${i}`));
                    app.diceBtns.forEach((el, i) => {
                        if (el.classList.contains('held') !== !!(i % 2)) failures.push(`${theme}/${skin.id}: held state lost`);
                    });
                    if (!document.getElementById('gd-0').classList.contains('daily-glass-die')) failures.push('Daily context class lost');
                    app.diceBtns[0].classList.add('rolling');
                    const rollAnimation = getComputedStyle(app.diceBtns[0]).animationName;
                    if (rollAnimation !== 'roll') failures.push(`${theme}/${skin.id}: main roll animation is ${rollAnimation}`);
                    const dailyAnimation = getComputedStyle(document.getElementById('gd-0')).animationName;
                    if (dailyAnimation !== 'dailyDicePulse') failures.push(`${theme}/${skin.id}: daily roll animation is ${dailyAnimation}`);
                    app.diceBtns[0].classList.remove('rolling');
                    const signature = JSON.stringify(main);
                    if (signatures[skin.id] && signatures[skin.id] !== signature) failures.push(`${theme}/${skin.id}: main rendering differs between themes`);
                    signatures[skin.id] = signature;
                    const image = new Image();
                    image.src = `assets/dice-skins-v1/${skin.id}-face-v1.png`;
                    await image.decode();
                    rows.push({ theme, skin: skin.id, rollAnimation, dailyAnimation, decoded: image.naturalWidth === 384 });
                }
            }
            return { combinations: rows.length, failures, rows };
        });
        await page.evaluate(async () => {
            localStorage.setItem('yamb_active_skin', 'theme_neon_cyber');
            app.updateDiceVisuals();
            const result = await app.visualRoll([6, 2, 5, 4, 3, 6]);
            if (app.isAnimating || app.diceBtns.some(el => el.classList.contains('rolling'))) throw Error('Roll did not finish');
            if (app.diceBtns.some((el, i) => el.querySelectorAll('.dice-dot').length !== app.kockiceVals[i])) throw Error('Final faces differ from values');
        });
        for (const viewport of [{ width: 412, height: 915 }, { width: 1280, height: 900 }]) {
            await page.setViewportSize(viewport);
            for (const skin of ['green_clay', 'theme_light_gold', 'theme_neon_cyber', 'theme_desert', 'theme_northern_nebula']) {
                await page.evaluate(id => { localStorage.setItem('yamb_active_skin', id); app.updateDiceVisuals(); }, skin);
                await page.locator('#dice-container').screenshot({ path: path.join(output, `${viewport.width}-${skin}.png`) });
            }
        }
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ ...report, errors }, null, 2));
        console.log(JSON.stringify({ combinations: report.combinations, failures: report.failures.slice(0, 24), failureCount: report.failures.length, animations: [...new Set(report.rows.map(r => r.rollAnimation))], errors }));
        assert.equal(report.failures.length, 0);
        assert(report.rows.every(row => row.decoded));
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
