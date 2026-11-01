// Isolated desktop proof: real controller, picker method, counters and PNGs.
// No game initialization, accounts, network services, rolls or reward handlers.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'C:/Users/andri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), www = path.join(root, 'www');
const read = name => fs.readFileSync(path.join(www, name), 'utf8');
const data = { window: {} };
for (const name of ['skin-action-buttons-data.js', 'skin-roll-counter-data.js']) vm.runInNewContext(read(name), data);
const config = read('config.js').match(/SKINS:\s*\[([\s\S]*?)\]\s*,\s*EFFECTS:/);
const skins = vm.runInNewContext(`[${config[1]}]`);
const allowed = new Set();
for (const id of Object.keys(data.window.SKIN_ACTION_BUTTONS)) {
    allowed.add(`assets/dice-skins-v1/${id}-face-v1.png`);
    for (const item of Object.values(data.window.SKIN_ACTION_BUTTONS[id])) allowed.add(item.src);
    for (const src of Object.values(data.window.SKIN_ROLL_COUNTER[id])) allowed.add(src);
}
const dir = path.join(root, 'tmp/skin-preload-retention-2026-10-31');
fs.mkdirSync(dir, { recursive: true });
(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    try {
        const context = await browser.newContext({ viewport: { width: 411, height: 400 }, serviceWorkers: 'block' });
        const page = await context.newPage(), errors = [], requests = [];
        page.on('pageerror', error => errors.push(error.message));
        let hold = true;
        await context.route('**/*', async route => {
            const url = new URL(route.request().url());
            const name = decodeURIComponent(url.pathname).slice(1);
            if (url.origin !== 'http://skin-cache.test') return route.abort();
            if (!name) return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="sr"><body></body></html>' });
            if (!allowed.has(name)) return route.abort();
            requests.push(name);
            if (hold && !/(?:default|classic_red)-/.test(name)) await gate;
            await route.fulfill({ contentType: 'image/png', body: fs.readFileSync(path.join(www, name)) });
        });
        await page.goto('http://skin-cache.test/');
        await page.setContent(`<main id="game-scene"><p>Izolovana provera PNG paketa</p><img id="face" width="64" height="64"><div class="game-info"><span id="lbl-status"></span><button id="btn-najava">NAJAVA</button><button id="btn-bacaj">BACAJ</button></div></main><div id="game-skin-picker" hidden></div><p id="game-skin-picker-status"></p>`);
        await page.addStyleTag({ content: 'body{background:#254239;color:#fff;font:16px sans-serif}.game-info{display:flex;gap:6px;align-items:center}button{width:150px;height:46px;border:0}#face{margin:20px}' + read('skin-action-buttons.css') + read('skin-roll-counter.css') });
        await page.addScriptTag({ content: 'const SHOP_DATA = ' + JSON.stringify({ SKINS: skins }) + ';' });
        await page.addScriptTag({ content: read('game.js').replace('window.app = new YambApp();', 'window.TestYambApp = YambApp;') });
        await page.evaluate(() => {
            localStorage.setItem('yamb_active_skin', 'default');
            const app = window.app = Object.create(window.TestYambApp.prototype);
            app.isThemeUnlocked = () => true;
            app.readLocalJson = (key, fallback) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
            app.stats = { unlockedSkins: SHOP_DATA.SKINS.map(item => item.id) };
            app.soundEnabled = false; app.socket = { connected: false }; app.brojBacanja = 0;
            // Only the surrounding dice renderer and closed picker are fixture stubs.
            app.updateDiceVisuals = () => { document.querySelector('#face').src = `assets/dice-skins-v1/${localStorage.getItem('yamb_active_skin')}-face-v1.png`; };
            app.renderQuickSkinChoices = () => {};
            app.closeQuickSkinPicker = () => {};
        });
        for (const name of ['skin-action-buttons-data.js', 'skin-roll-counter-data.js', 'skin-action-buttons.js', 'skin-roll-counter.js']) await page.addScriptTag({ content: read(name) });
        await page.waitForFunction(() => document.querySelector('#game-scene').dataset.actionSkinReady === 'default');
        // Begin fourteen packs before the chosen pack finishes: 120 distinct PNGs.
        await page.evaluate(() => {
            const ids = Object.keys(window.SKIN_ACTION_BUTTONS).slice(1, 15);
            window.backgroundPacks = Promise.all(ids.map(id => window.skinActionButtons.prepare(id)));
        });
        await page.waitForFunction(() => performance.getEntriesByType('resource').length > 0);
        await page.evaluate(() => window.app.equipQuickSkin('classic_red'));
        assert.equal(await page.locator('#game-scene').getAttribute('data-action-skin-ready'), 'classic_red');
        assert.equal(await page.evaluate(() => localStorage.getItem('yamb_active_skin')), 'classic_red');
        hold = false; release(); await page.evaluate(() => window.backgroundPacks);
        const rows = [];
        for (const skin of skins) {
            rows.push(await page.evaluate(async id => {
                await window.app.equipQuickSkin(id);
                const scene = document.querySelector('#game-scene'), face = document.querySelector('#face');
                await face.decode();
                const counters = [];
                for (let count = 0; count <= 3; count++) {
                    window.skinRollCounter.render(count);
                    const image = document.querySelector('#lbl-status img'); await image.decode();
                    counters.push(image.getAttribute('src') === window.SKIN_ROLL_COUNTER[id][count]);
                }
                const entry = window.SKIN_ACTION_BUTTONS[id];
                const style = getComputedStyle(scene);
                return { id, active: scene.dataset.actionSkinReady, face: face.naturalWidth > 0, counters,
                    controls: ['roll', 'announce', 'cancel'].every(state => style.getPropertyValue(`--skin-${state}-png`).includes(entry[state].src)) };
            }, skin.id));
        }
        assert.equal(rows.length, 48);
        assert(rows.every(row => row.id === row.active && row.face && row.controls && row.counters.every(Boolean)));
        assert.deepEqual(errors, []);
        for (const id of ['green_clay', 'theme_neon_cyber', 'theme_light_gold']) {
            await page.evaluate(id => window.app.equipQuickSkin(id), id);
            await page.screenshot({ path: path.join(dir, `browser-${id}.png`) });
        }
        fs.writeFileSync(path.join(dir, 'browser.json'), JSON.stringify({ date: '2026-10-31', status: 'pass', pressurePacks: 14, initialDistinctImages: 120, distinctPngRequests: new Set(requests).size, rows, errors,
            boundary: 'Fresh isolated desktop Edge; real PNG decode, skin controller, equip method and counter. Synthetic local inventory/all themes unlocked, dice renderer and closed picker stubbed. All routes fulfilled from allowlisted local PNGs. No native/network latency, account/payment or gameplay/reward proof.' }, null, 2) + '\n');
        console.log('PASS: real PNGs for48skins, three button states and four counters each; foreground equip survives14parallel packs. Isolated desktop only.');
    } finally { release?.(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
