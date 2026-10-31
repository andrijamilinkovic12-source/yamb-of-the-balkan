// Isolated QA-origin fixture: all responses are local files, no real server/account.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const www = path.resolve('www'), origin = 'https://yamb-reconnect-qa.onrender.com';
const read = name => fs.readFileSync(path.join(www, name), 'utf8');
const menu = read('index.html').split('<div id="main-menu"')[1].split('<div id="game-scene"')[0];
const sources = [...new Set([...menu.matchAll(/data-theme-src="([^"]+)"/g)].map(match => match[1]))];
const html = `<html><body><div id="main-menu">${sources.map(src => `<img data-theme-src="${src}">`).join('')}</div>${[
    'config.js', 'theme-quality-assets.js', 'theme-loading-diagnostics.js', 'theme-game-header.js', 'theme-settings-room.js', 'fixture-game.js'
].map(src => `<script src="/${src}"></script>`).join('')}</body></html>`;
(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
    try {
        const context = await browser.newContext({ viewport: { width: 411, height: 891 }, serviceWorkers: 'block' });
        const errors = [];
        await context.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.origin !== origin) { errors.push('Unexpected external request'); return route.abort(); }
            if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: html });
            if (url.pathname === '/fixture-game.js') return route.fulfill({ contentType: 'application/javascript', body: read('game.js').replace('window.app = new YambApp();', 'globalThis.App = YambApp;') });
            if (url.pathname === '/favicon.ico') return route.fulfill({ status: 204 });
            const file = path.resolve(www, '.' + decodeURIComponent(url.pathname));
            if (!file.startsWith(www + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
                errors.push('Missing fixture file: ' + url.pathname); return route.abort();
            }
            return route.fulfill({ contentType: file.endsWith('.js') ? 'application/javascript' : 'image/png', body: fs.readFileSync(file) });
        });
        const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
        await page.goto(origin);
        const result = await page.evaluate(async () => {
            const app = Object.create(App.prototype); app.themeWarmups = new Map();
            const rows = [];
            for (const theme of ['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna']) {
                const lastId = window.themeLoadingDiagnostics.snapshot().at(-1)?.id || 0;
                const [menu] = await Promise.all([app.warmThemePack(theme).critical, window.themeSettingsRoom.prepare(theme, { timeoutMs: 6000 })]);
                const events = window.themeLoadingDiagnostics.snapshot().filter(event => event.id > lastId);
                rows.push({ theme, ready: menu, readyRecords: events.filter(event => event.event === 'ready').length,
                    failures: events.filter(event => ['error', 'timeout', 'decode-fallback'].includes(event.event)).length });
            }
            return { rows, retainedDiagnosticRecords: window.themeLoadingDiagnostics.snapshot().length };
        });
        assert.deepEqual(errors, []);
        assert.equal(result.rows.length, 10);
        assert.ok(result.rows.every(row => row.ready && row.readyRecords === 28 && row.failures === 0));
        assert.equal(result.retainedDiagnosticRecords, 200);
        const report = { scope: 'Isolated Edge 411x891; intercepted QA origin served entirely from local files. Actual PNG/decode and menu/Settings methods, no app constructor/account/socket/network server. Not Android latency or ANR proof.', ...result, errors };
        fs.mkdirSync('tmp/theme-switch-profile-2026-10-30', { recursive: true });
        fs.writeFileSync('tmp/theme-switch-profile-2026-10-30/diagnostics-browser.json', JSON.stringify(report, null, 2) + '\n');
        console.log(JSON.stringify(report, null, 2));
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
