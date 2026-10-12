const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const dice = JSON.parse(fs.readFileSync(path.join(root, 'source-assets/dice-skins-v1/manifest.json'), 'utf8'));
const style = new Map();
const scene = {
    style: { setProperty: (key, value) => style.set(key, value) },
    dataset: {},
    removeAttribute: key => { if (key === 'data-action-skin-ready') delete scene.dataset.actionSkinReady; }
};
const storage = new Map([['yamb_active_skin', 'default']]);
let unlocked = false;
const listeners = new Map();
class InstantImage {
    set src(value) { this._src = value; this.complete = true; this.naturalWidth = 768; }
    get src() { return this._src; }
}
const context = vm.createContext({
    window: { app: { isThemeUnlocked: () => unlocked }, addEventListener: (key, fn) => listeners.set(key, fn) },
    document: { getElementById: key => key === 'game-scene' ? scene : null },
    localStorage: { getItem: key => storage.get(key) || null },
    Image: InstantImage,
    Promise,
    console
});
vm.runInContext(`const SHOP_DATA = ${JSON.stringify({ SKINS: dice.skins })}`, context);
vm.runInContext(fs.readFileSync(path.join(root, 'www/skin-action-buttons-data.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'www/skin-action-buttons.js'), 'utf8'), context);
const settle = () => new Promise(resolve => setImmediate(resolve));

(async () => {
    await settle();
    assert.equal(scene.dataset.actionSkinReady, 'default');
    const defaultUrl = style.get('--skin-roll-png');
    assert(defaultUrl.includes('/default-roll-v1.png'));

    storage.set('yamb_active_skin', 'classic_red');
    context.window.skinActionButtons.sync();
    assert.equal(scene.dataset.actionSkinReady, undefined, 'previous skin must not flash while loading');
    await settle();
    assert.equal(scene.dataset.actionSkinReady, 'classic_red');
    assert(style.get('--skin-roll-png').includes('/classic_red-roll-v1.png'));
    assert(style.get('--skin-cancel-png').includes('/classic_red-cancel-v1.png'));

    storage.set('yamb_active_skin', 'theme_neon_cyber');
    context.window.skinActionButtons.sync();
    await settle();
    assert.equal(scene.dataset.actionSkinReady, 'default', 'locked theme gift must use the default skin');

    unlocked = true;
    context.window.skinActionButtons.sync();
    await settle();
    assert.equal(scene.dataset.actionSkinReady, 'theme_neon_cyber');
    assert(style.get('--skin-announce-png').includes('/theme_neon_cyber-announce-v1.png'));
    console.log('Skin switch, three PNG roles, locked gift fallback and unlocked gift activation passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
