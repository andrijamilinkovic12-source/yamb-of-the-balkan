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
    console.log('In-game theme switch waits for visible decoded PNGs, then changes theme; special assets exist.');
})().catch(error => { console.error(error); process.exitCode = 1; });
