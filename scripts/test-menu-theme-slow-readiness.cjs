// Actual selection/preload/Settings methods with a virtual clock and held images.
// Reproduces the native ~18s completion without waiting or touching accounts.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const baseline = process.argv.includes('--baseline');
const game = baseline ? require('node:child_process').execFileSync('git', ['show', '2b531195b274c55373ae2f591973e8b2f19cec65:www/game.js'], { encoding:'utf8', windowsHide:true }) : fs.readFileSync('www/game.js', 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture(online = true) {
    let clock = 0, sequence = 0, notices = 0;
    const timers = new Map(), images = [], storage = new Map([['yamb_theme', 'dark'], ['yamb_uid', 'synthetic-fixture']]);
    const context = vm.createContext({ window: { showNotification() { notices++; },
        themeGameHeader: { asset: (role, theme) => `assets/${theme}/${role}.png` } },
        document: { readyState: 'loading', addEventListener() {}, getElementById: id => id === 'settings-screen'
            ? { classList: { contains: () => true } } : id === 'setting-theme' ? { blur() {} } : null },
        localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
        navigator: { onLine: online }, console,
        setTimeout(fn, delay) { const id = ++sequence; timers.set(id, { fn, at: clock + delay }); return id; },
        clearTimeout: id => timers.delete(id),
        Image: class {
            set src(value) { this.source = value; images.push(this); }
            decode() { return Promise.resolve(); }
            load() { this.naturalWidth = 384; this.naturalHeight = 384; return this.onload(); }
        }
    });
    vm.runInContext(game.replace('window.app = new YambApp();', 'globalThis.App = YambApp;'), context);
    vm.runInContext(fs.readFileSync('www/theme-settings-room.js', 'utf8'), context);
    const app = Object.create(context.App.prototype); app.themeWarmups = new Map();
    app.isThemeUnlocked = () => true;
    app.getThemeLoadingPack = () => ({});
    app.getThemeStartupSources = theme => [`assets/${theme}/menu.png`, `assets/${theme}/background.png`];
    app.prepareThemeLoadingGate = (_, options) => { app.gateReadiness = options.readiness; };
    app.hideThemeLoadingGate = () => {};
    app.rememberManualThemeSelection = () => {};
    app.applyTheme = theme => { app.applied = theme; };
    async function advance(to) {
        for (;;) {
            const next = [...timers.entries()].filter(([,timer]) => timer.at <= to).sort((a,b) => a[1].at - b[1].at)[0];
            if (!next) break;
            clock = next[1].at; timers.delete(next[0]); next[1].fn(); await flush();
        }
        clock = to; await flush();
    }
    return { app, images, storage, advance, notices: () => notices };
}
(async () => {
    const late = fixture();
    const pending = late.app.saveSettingAuto('theme', 'easter');
    assert.equal(late.images.length, 12);
    await late.advance(6000); await late.advance(12000);
    assert.equal(late.storage.get('yamb_theme'), 'dark');
    assert.equal(late.images.length, 12, 'One Image per pending URL across the retry');
    await late.advance(18000);
    await Promise.all(late.images.map(image => image.load())); await flush();
    const ready = await pending;
    if (baseline) {
        assert.equal(ready, false); assert.equal(late.storage.get('yamb_theme'), 'dark');
        console.log('REPRODUCED v6.42: valid PNGs ready at18s, selection already rejected at12s.'); return;
    }
    assert.equal(ready, true); assert.equal(late.storage.get('yamb_theme'), 'easter');
    assert.equal(late.app.applied, 'easter'); assert.equal(await late.app.gateReadiness, true);
    assert.equal(late.notices(), 0);
    const fast = fixture(), fastChoice = fast.app.saveSettingAuto('theme', 'light');
    await Promise.all(fast.images.map(image => image.load()));
    assert.equal(await fastChoice, true, 'Ready PNGs apply without advancing the clock or waiting6/30s');
    const stuck = fixture();
    const failed = stuck.app.saveSettingAuto('theme', 'easter');
    await stuck.advance(29999); assert.equal(stuck.notices(), 0);
    await stuck.advance(30000); assert.equal(await failed, false); assert.equal(stuck.notices(), 1);
    await Promise.all(stuck.images.map(image => image.load())); await flush();
    assert.equal(stuck.storage.get('yamb_theme'), 'dark', 'Completion past final deadline must not apply a timed-out choice');
    const offline = fixture(false), offlineChoice = offline.app.saveSettingAuto('theme', 'easter');
    await offline.advance(6000); assert.equal(await offlineChoice, false);
    const changedAccount = fixture(), obsolete = changedAccount.app.saveSettingAuto('theme', 'easter');
    await changedAccount.advance(6000); changedAccount.storage.set('yamb_uid', 'another-synthetic-fixture');
    await changedAccount.advance(18000); await Promise.all(changedAccount.images.map(image => image.load()));
    assert.equal(await obsolete, false); assert.equal(changedAccount.storage.get('yamb_theme'), 'dark');
    console.log('PASS:18s PNG readiness applies once without second click/duplicate images;30s bounded failure, no late apply, offline6s and account guard.');
})().catch(error => { console.error(error); process.exitCode = 1; });
