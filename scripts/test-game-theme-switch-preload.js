const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'www/game.js'), 'utf8');
const storage = new Map([['yamb_theme', 'dark']]);
const button = { busy: false, setAttribute: () => { button.busy = true; }, removeAttribute: () => { button.busy = false; } };
const scene = { classList: { contains: () => true } };
const loaded = [];
class ImageMock {
    set src(value) {
        this._src = value;
        this.naturalWidth = 100;
        loaded.push(value);
        queueMicrotask(() => this.onload?.());
    }
    get src() { return this._src; }
    decode() { return Promise.resolve(); }
}
let releaseHeader;
const headerReady = new Promise(resolve => { releaseHeader = resolve; });
const context = {
    window: {
        themeGameHeader: { prepare: () => headerReady },
        themeOnlinePlayers: { asset: (role, theme) => `assets/theme-packs/${theme}/canonical/online-players-internal/${role}-v1.png?v=2` },
        skinActionButtons: { prepare: () => Promise.resolve(), activatePrepared: () => true }
    },
    document: {
        getElementById: id => id === 'game-scene' ? scene : null,
        querySelector: () => button
    },
    localStorage: {
        getItem: key => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, String(value))
    },
    Image: ImageMock,
    SHOP_DATA: { SKINS: [], TROPHIES: [] },
    getThemeMedalSource: () => '',
    getThemeTreasuryControlSource: () => '',
    console, setTimeout, clearTimeout
};
vm.runInNewContext(source.replace('window.app = new YambApp();', 'globalThis.TestYambApp = YambApp;'), context);
const app = Object.create(context.TestYambApp.prototype);
app.gameThemeWarmups = new Map();
app.gameThemeImages = new Map();
app.gameThemeLoading = new Set();
app.getMainRoomPackSource = () => '';
app.getProspectiveThemeSkin = () => null;
app.getUnlockedThemeIds = () => ['dark', 'neon'];
app.warmGameSwitchAssets = () => {};
app.applyTheme = theme => { app.appliedTheme = theme; };
app.socket = { connected: false };

(async () => {
    const pending = app.switchGameTheme('neon');
    assert.equal(storage.get('yamb_theme'), 'dark', 'The new theme must wait for decoded game PNGs');
    assert.equal(button.busy, true);
    releaseHeader();
    await pending;
    assert.equal(storage.get('yamb_theme'), 'neon');
    assert.equal(app.appliedTheme, 'neon');
    assert.equal(button.busy, false);
    assert(loaded.some(source => source.includes('announce-megaphone-v1.png')), 'Neon board announcement mark must warm before switching');
    assert(!loaded.some(source => source.includes('/trial/game-board-png-v1/')), 'Rejected PNG board trial must not warm');
    assert(loaded.some(source => source.includes('spectate-v1.png')), 'Spectator eye must warm before switching');

    // Every theme's background and shared eye must resolve to a production PNG.
    const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
    for (const theme of themes) {
        for (const url of app.getGameThemeSources(theme)) {
            assert(fs.existsSync(path.join(root, 'www', url.split('?')[0])), `${theme}: missing ${url}`);
        }
    }

    // An image can be decoded in the warmup yet still have no src in an existing board.
    // Legacy hydration roots do not include the canonical Easter path.
    const boardImages = Object.fromEntries(['easter','neon'].map(theme=>[theme,[0,1].map(()=>({
        dataset:theme==='easter'?{themeSrc:'assets/theme-packs/easter/canonical/game-board/announce-megaphone-v1.png?v=1'}:{neonBoardSrc:'assets/theme-packs/neon/canonical/game-board/announce-megaphone-v1.png?v=1'},
        getAttribute(name){return this[name]||null;}
    }))]));
    context.document.querySelectorAll=selector=>selector.includes('easter')?boardImages.easter:boardImages.neon;
    app.syncGameBoardThemeImages('dark');
    assert(boardImages.easter.every(i=>!i.src)&&boardImages.neon.every(i=>!i.src),'Inactive board images must stay deferred');
    for(const theme of ['easter','neon']){
        app.syncGameBoardThemeImages(theme);
        assert(boardImages[theme].every(i=>i.src?.includes(`theme-packs/${theme}/canonical/game-board/announce-megaphone-v1.png`)),`${theme}: both existing boards need their canonical announcement PNG`);
    }
    assert(source.includes('this.syncGameBoardThemeImages(safeTheme)')&&source.includes("this.syncGameBoardThemeImages(localStorage.getItem('yamb_theme') || 'dark')"),'Hydrate both existing and newly created boards');

    let releaseSettings;
    const settingsReady = new Promise(resolve => { releaseSettings = resolve; });
    context.window.themeSettingsRoom = {
        sources: () => ['settings-profile.png', 'settings-sound.png'],
        prepare: (_, options) => {
            assert.equal(options.timeoutMs, 6000);
            return settingsReady;
        }
    };
    context.document.getElementById = id => id === 'settings-screen'
        ? { classList: { contains: () => true } }
        : id === 'setting-theme' ? { blur() {} } : null;
    app.isThemeUnlocked = () => true;
    app.warmThemePack = () => ({ critical: Promise.resolve(true) });
    let duplicateSettingsPreloads = 0;
    app.preloadThemeSources = sources => {
        if (sources.includes('settings-profile.png')) duplicateSettingsPreloads++;
        return Promise.resolve(true);
    };
    app.prepareThemeLoadingGate = () => {};
    app.hideThemeLoadingGate = () => {};
    app.saveSettingAuto('theme', 'light');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(storage.get('yamb_theme'), 'neon', 'Generic preload must not release the visible Settings pack early');
    releaseSettings();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(storage.get('yamb_theme'), 'light');
    assert.equal(app.appliedTheme, 'light');
    assert.equal(duplicateSettingsPreloads, 0, 'Settings controller already owns the visible decoded pack; do not preload it twice');

    context.window.themeSettingsRoom.prepare = () => Promise.reject(new Error('Image decode failed'));
    app.saveSettingAuto('theme', 'neon');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(storage.get('yamb_theme'), 'light', 'Failed Settings artwork must preserve the previous complete theme');
    assert.equal(app.appliedTheme, 'light');

    // A slow first request must finish on a bounded automatic retry, while
    // keeping the old complete theme and the loading gate until both packs decode.
    let menuAttempts = 0, settingsAttempts = 0, releaseRetry, gateReadiness;
    const retrySettings = new Promise(resolve => { releaseRetry = resolve; });
    app.warmThemePack = () => ({ critical: Promise.resolve(++menuAttempts > 1) });
    context.window.themeSettingsRoom.prepare = () => ++settingsAttempts === 1
        ? Promise.reject(new Error('Settings artwork timeout')) : retrySettings;
    app.prepareThemeLoadingGate = (_, options) => { gateReadiness = options.readiness; };
    const retrySelection = app.saveSettingAuto('theme', 'moon');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(menuAttempts, 2);assert.equal(settingsAttempts, 2);
    assert.equal(storage.get('yamb_theme'), 'light');
    let gateSettled = false;gateReadiness.then(() => { gateSettled = true; });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(gateSettled, false, 'Gate must cover the late visible Settings pack');
    releaseRetry();assert.equal(await retrySelection, true);
    assert.equal(storage.get('yamb_theme'), 'moon');
    assert.equal(app.appliedTheme, 'moon');

    let notices = 0;
    context.window.showNotification = () => { notices++; };
    menuAttempts = 0;
    app.warmThemePack = () => ({ critical: Promise.resolve((++menuAttempts, false)) });
    context.window.themeSettingsRoom.prepare = () => Promise.resolve();
    assert.equal(await app.saveSettingAuto('theme', 'neon'), false);
    assert.equal(menuAttempts, 2, 'Permanent failure must stop after one retry');
    assert.equal(notices, 1, 'Report final failure once, not once per attempt');
    assert.equal(storage.get('yamb_theme'), 'moon');

    context.navigator = { onLine: false };menuAttempts = 0;
    assert.equal(await app.saveSettingAuto('theme', 'neon'), false);
    assert.equal(menuAttempts, 1, 'Known offline state must not add a pointless retry');
    delete context.navigator;

    let releaseObsolete;let obsoleteAttempts = 0;
    const obsoletePack = new Promise(resolve => { releaseObsolete = resolve; });
    app.warmThemePack = theme => ({ critical: theme === 'neon'
        ? (++obsoleteAttempts, obsoletePack) : Promise.resolve(true) });
    const obsoleteSelection = app.saveSettingAuto('theme', 'neon');
    assert.equal(await app.saveSettingAuto('theme', 'light'), true);
    releaseObsolete(false);
    assert.equal(await obsoleteSelection, false);
    assert.equal(obsoleteAttempts, 1, 'Superseded choice must not retry');
    assert.equal(storage.get('yamb_theme'), 'light', 'Late retry cannot overwrite a newer choice');

    let releaseAccount;const accountPack = new Promise(resolve => { releaseAccount = resolve; });
    storage.set('yamb_uid', 'account-a');
    app.warmThemePack = () => ({ critical: accountPack });
    const accountSelection = app.saveSettingAuto('theme', 'neon');
    storage.set('yamb_uid', 'account-b');storage.set('yamb_theme', 'dark');
    releaseAccount(true);
    assert.equal(await accountSelection, false);
    assert.equal(storage.get('yamb_theme'), 'dark', 'Pending choice cannot cross an account change');
    const warmedHeaders = [], warmedNext = [];
    let skinWarmups = 0;
    context.window.themeGameHeader.prepare = theme => { warmedHeaders.push(theme); return Promise.resolve(); };
    const entryWarmup = Object.create(context.TestYambApp.prototype);
    entryWarmup.getUnlockedThemeIds = () => ['dark', 'neon'];
    entryWarmup.prepareGameTheme = theme => { warmedNext.push(theme); };
    entryWarmup.warmQuickSkinChoices = () => { skinWarmups++; };
    entryWarmup.warmGameSwitchAssets();
    assert.deepEqual(warmedHeaders, ['dark'], 'The current header must warm during quote/waiting before the game opens');
    assert.deepEqual(warmedNext, ['neon'], 'Upcoming theme warmup must remain available');
    assert.equal(skinWarmups, 1);
    entryWarmup.getUnlockedThemeIds = () => ['dark'];
    entryWarmup.warmGameSwitchAssets();
    assert.equal(warmedHeaders.length, 2, 'Current header also warms when only Green is unlocked');
    console.log('Settings theme retry: slow packs, shared readiness gate, bounded failure, offline, superseded selection and account change OK.');
    console.log('In-game theme switch waits for visible decoded PNGs, then changes theme; special assets exist.');
})().catch(error => { console.error(error); process.exitCode = 1; });
