const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('www/game.js', 'utf8');
const storage = new Map([['yamb_theme', 'dark']]);
const currentScreen = { id: 'settings-screen', classList: { contains: name => name === 'active' } };
const context = {
    window: { themeSettingsRoom: { sources: theme => [`settings-${theme}.png`] } },
    document: { getElementById: id => id === currentScreen.id ? currentScreen : null },
    localStorage: {
        getItem: key => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value)
    },
    SHOP_DATA: { SKINS: [], TROPHIES: [] },
    console, setTimeout, clearTimeout
};
vm.runInNewContext(source.replace('window.app = new YambApp();', 'globalThis.TestYambApp = YambApp;'), context);
const app = Object.create(context.TestYambApp.prototype);
app.themeSwitchRequestToken = 0;
app.isThemeUnlocked = () => true;
app.prepareThemeLoadingGate = () => {};
app.socket = { connected: false };
app.applyTheme = theme => { app.applied = theme; };
app.getUnlockedThemeIds = () => ['dark', 'neon', 'light'];
app.scheduleNextMenuThemeWarmup = () => {};
let finishMenu;
let finishSettings;
app.warmThemePack = theme => ({ critical: new Promise(resolve => { finishMenu = resolve; }), all: Promise.resolve() });
app.preloadThemeSources = sources => {
    app.settingsSources = [...sources];
    return new Promise(resolve => { finishSettings = resolve; });
};

(async () => {
    app.saveSettingAuto('theme', 'neon');
    assert.equal(storage.get('yamb_theme'), 'dark', 'Do not apply a partly loaded theme');
    assert.deepEqual(app.settingsSources, ['settings-neon.png']);
    finishMenu();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(storage.get('yamb_theme'), 'dark', 'Visible Settings icons must join the decode barrier');
    finishSettings();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(storage.get('yamb_theme'), 'neon');
    assert.equal(app.applied, 'neon');

    currentScreen.id = 'main-menu';
    app.saveSettingAuto('theme', 'light');
    assert.equal(app.settingsSources.length, 0, 'Hidden Settings icons must not load during a menu switch');
    finishMenu();
    finishSettings();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(app.applied, 'light');
    console.log('Menu theme reuses warmup; visible Settings icons wait, hidden Settings icons do not load.');
})().catch(error => { console.error(error); process.exitCode = 1; });
