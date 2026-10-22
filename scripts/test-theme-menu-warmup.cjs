const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('www/game.js', 'utf8');
const storage = new Map([['yamb_theme', 'dark']]);
const notices = [];
const currentScreen = { id: 'settings-screen', classList: { contains: name => name === 'active' } };
const context = {
    window: {
        themeSettingsRoom: { sources: theme => [`settings-${theme}.png`] },
        showNotification: (...args) => notices.push(args)
    },
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
app.hideThemeLoadingGate = () => {};
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
    app.saveSettingAuto('theme', 'neon');
    finishMenu(false);
    finishSettings(true);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(app.applied, 'light', 'An incomplete pack must not replace the visible theme');
    assert.equal(storage.get('yamb_theme'), 'light');
    assert.equal(notices.length, 1, 'The player must be told that the theme did not load');
    const startup = app.getThemeStartupSources('neon', {
        background: 'assets/neon-background.png', assets: [], menuAssets: []
    });
    assert.equal(startup.length, 18, 'Menu barrier should cover background, two buttons and fifteen identities');
    assert(startup.every(source => !source.includes('splash-title')), 'Hidden login logo must not delay a menu switch');

    const preloadApp = Object.create(context.TestYambApp.prototype);
    preloadApp.themeWarmups = new Map();
    preloadApp.getThemeLoadingPack = () => ({ background: 'assets/neon-background.png' });
    preloadApp.getThemeStartupSources = () => ['assets/first.png', 'assets/second.png'];
    let attempts = 0;
    preloadApp.preloadThemeSources = async (sources, options) => {
        attempts++;
        assert.equal(sources.length, 2);
        assert.equal(options.concurrency, 24, 'Visible assets should start in one wave');
        return attempts > 1;
    };
    assert.equal(await preloadApp.warmThemePack('neon').critical, false);
    assert.equal(preloadApp.themeWarmups.has('neon'), false, 'Failed warmup must be retried');
    assert.equal(await preloadApp.warmThemePack('neon').critical, true);
    assert.equal(attempts, 2);

    const splash = { classList: { contains: () => false } };
    const title = {
        attributes: { src: 'assets/old-logo.png' }, dataset: {},
        classList: { remove() {}, add() {} },
        getAttribute(name) { return this.attributes[name] || null; },
        removeAttribute(name) { delete this.attributes[name]; },
        set src(value) { this.attributes.src = value; }
    };
    context.document.getElementById = id => id === 'theme-splash-clay-title' ? title
        : id === 'splash-screen' ? splash : null;
    app.getValidThemeIds = () => ['dark', 'neon'];
    app.configureThemeSplashImage('neon');
    assert.equal(title.getAttribute('src'), null, 'Hidden login artwork must not download on a menu switch');
    splash.classList.contains = name => name === 'active';
    app.configureThemeSplashImage('neon');
    assert(title.getAttribute('src').includes('theme-packs/neon/splash-title'),
        'Returning to login must restore the selected theme logo');
    console.log('Menu theme reuses warmup; visible Settings icons wait, hidden Settings icons do not load.');
})().catch(error => { console.error(error); process.exitCode = 1; });
