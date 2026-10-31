const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const read = file => fs.readFileSync(`www/${file}`, 'utf8');
function fixture(host = 'yamb-reconnect-qa.onrender.com') {
    const images = [], logs = [];
    class Image {
        set src(value) { this.source = value; images.push(this); }
        decode() { return this.decodePromise || Promise.resolve(); }
        load() { this.naturalWidth = 384; this.naturalHeight = 384; return this.onload(); }
    }
    const context = vm.createContext({
        window: { location: { hostname: host, origin: `https://${host}`, href: `https://${host}/` },
            themeGameHeader: { asset: (role, theme) => `assets/theme-packs/${theme}/${role}.png` } },
        performance, URL, Image, setTimeout, clearTimeout,
        console: { info: value => logs.push(value) },
        document: { readyState: 'loading', addEventListener() {} }
    });
    vm.runInContext(read('theme-loading-diagnostics.js'), context);
    vm.runInContext(read('game.js').replace('window.app = new YambApp();', 'globalThis.App = YambApp;'), context);
    vm.runInContext(read('theme-settings-room.js'), context);
    return { context, images, logs, app: Object.create(context.App.prototype),
        events: () => context.window.themeLoadingDiagnostics?.snapshot() || [] };
}
(async () => {
    for (const host of ['yamb-of-the-balkan.onrender.com', 'localhost', 'evil-yamb-reconnect-qa.onrender.com']) {
        const f = fixture(host);
        assert.equal(f.context.window.themeLoadingDiagnostics, undefined, 'Production and other hosts must have no recorder');
        const ready = f.app.preloadThemeImage('assets/test.png');
        await f.images[0].load(); assert.equal(await ready, true); assert.equal(f.logs.length, 0);
    }
    const f = fixture(), src = 'assets/theme-packs/easter/test.png?token=never-log-this#private';
    const first = f.app.preloadThemeImage(src, 5);
    assert.equal(await first, false);
    assert.equal(f.events().at(-1).phase, 'waiting-load');
    assert.equal(f.events().at(-1).event, 'timeout');
    assert.equal(f.events().at(-1).budgetMs, 5);
    const retry = f.app.preloadThemeImage(src, 1000);
    assert.equal(f.images.length, 1, 'A timeout must keep the shared image available for retry');
    let release;
    f.images[0].decodePromise = new Promise(resolve => { release = resolve; });
    const decoding = f.images[0].load();
    assert.equal(await f.app.preloadThemeImage(src, 5), false);
    assert.equal(f.events().at(-1).phase, 'decode', 'Decode wait must be distinguishable from load wait');
    release(); await decoding; assert.equal(await retry, true);
    assert.equal(f.events().at(-1).event, 'ready');
    assert.equal(f.events().at(-1).width, 384);
    assert.equal(await f.app.preloadThemeImage(src), true); assert.equal(f.images.length, 1);
    const bad = f.app.preloadThemeImage('assets/bad.png', 1000);
    f.images.at(-1).onerror(); assert.equal(await bad, false); assert.equal(f.events().at(-1).event, 'error');
    const fallback = f.app.preloadThemeImage('assets/fallback.png', 1000);
    f.images.at(-1).decodePromise = Promise.reject(new Error('not logged'));
    await f.images.at(-1).load(); assert.equal(await fallback, true);
    assert.ok(f.events().some(e => e.event === 'decode-fallback'));
    assert.ok(!JSON.stringify(f.events()).includes('never-log-this'));
    assert.ok(!JSON.stringify(f.logs).includes('private'));
    const diag = f.context.window.themeLoadingDiagnostics;
    for (const source of ['https://foreign.example/assets/test.png', '/api/profile.png', 'data:image/png;base64,a', 'assets/other.svg']) {
        assert.equal(diag.start(source, 'settings'), null);
    }
    assert.equal(diag.start('assets/a.png', 'account-name'), null);
    for (let i = 0; i < 250; i++) diag.start(`assets/test-${i}.png`, 'settings');
    assert.equal(f.events().length, 200, 'The buffer must be bounded');
    const copy = diag.snapshot(); copy.pop(); assert.equal(diag.snapshot().length, 200);

    const settings = fixture();
    const timeout = settings.context.window.themeSettingsRoom.prepare('easter', { timeoutMs: 5 });
    await assert.rejects(timeout, /Settings artwork timeout/);
    assert.equal(settings.events().filter(e => e.event === 'timeout').length, 10);
    const settingsRetry = settings.context.window.themeSettingsRoom.prepare('easter', { timeoutMs: 1000 });
    assert.equal(settings.images.length, 10, 'Settings retry must share pending PNGs');
    await Promise.all(settings.images.map(image => image.load())); await settingsRetry;
    assert.equal(settings.events().filter(e => e.event === 'ready').length, 10);
    const held = fixture();
    const pending = held.context.window.themeSettingsRoom.prepare('moon', { timeoutMs: 5 });
    let releaseSettings;
    held.images[0].decodePromise = new Promise(resolve => { releaseSettings = resolve; });
    const waiting = held.images[0].load();
    await Promise.all(held.images.slice(1).map(image => image.load()));
    await assert.rejects(pending, /Settings artwork timeout/);
    const timeouts = held.events().filter(e => e.event === 'timeout');
    assert.equal(timeouts.length, 1); assert.equal(timeouts[0].phase, 'decode');
    releaseSettings(); await waiting;
    await held.context.window.themeSettingsRoom.prepare('moon', { timeoutMs: 1000 });
    const { parseEvents } = require('./collect-qa-theme-loading.cjs');
    const clean = parseEvents('unrelated private message\nConsole: [YAMB_THEME_LOAD] ' + JSON.stringify({
        asset: '/assets/test.png', consumer: 'settings', event: 'timeout', phase: 'decode',
        budgetMs: 6000, elapsedMs: 6010, account: 'never-save', token: 'never-save'
    }) + '\nConsole: [YAMB_THEME_LOAD] ' + JSON.stringify({ asset: '/api/private.png', consumer: 'settings', event: 'ready', phase: 'decode' }));
    assert.equal(clean.length, 1); assert.equal(clean[0].elapsedMs, 6010);
    assert.ok(!JSON.stringify(clean).includes('never-save'));
    console.log('PASS: QA-only, bounded/redacted PNG timing; load/decode timeout, warm retry, error/fallback, Settings pending-only reporting; no production logging.');
})().catch(error => { console.error(error); process.exitCode = 1; });
