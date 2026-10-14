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
const loaded = [];
let unlocked = false;
const listeners = new Map();
class InstantImage {
    set src(value) { this._src = value; loaded.push(value); this.complete = true; this.naturalWidth = 768; }
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
vm.runInContext(fs.readFileSync(path.join(root, 'www/skin-roll-counter-data.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'www/skin-action-buttons.js'), 'utf8'), context);
const settle = () => new Promise(resolve => setImmediate(resolve));

(async () => {
    await settle();
    assert.equal(scene.dataset.actionSkinReady, 'default');
    const defaultUrl = style.get('--skin-roll-png');
    assert(defaultUrl.includes('/default-roll-v1.png'));
    assert.equal(loaded.filter(src => src.includes('/default-') && src.includes('/skin-roll-counter-v1/')).length, 4,
        'all four default counter states must preload with the buttons');
    assert(loaded.includes('assets/dice-skins-v1/default-face-v1.png'), 'default dice face must load with the controls');

    storage.set('yamb_active_skin', 'classic_red');
    context.window.skinActionButtons.sync();
    assert.equal(scene.dataset.actionSkinReady, 'default', 'previous complete skin must remain visible while loading');
    await settle();
    assert.equal(scene.dataset.actionSkinReady, 'classic_red');
    assert(style.get('--skin-roll-png').includes('/classic_red-roll-v1.png'));
    assert(style.get('--skin-cancel-png').includes('/classic_red-cancel-v1.png'));
    assert.equal(loaded.filter(src => src.includes('/classic_red-') && src.includes('/skin-roll-counter-v1/')).length, 4,
        'all four selected-skin counter states must preload with the buttons');
    assert(loaded.includes('assets/dice-skins-v1/classic_red-face-v1.png'), 'new dice face must load with the controls');
    const countBeforeRepeat = loaded.length;
    await context.window.skinActionButtons.prepare('classic_red');
    assert.equal(loaded.length, countBeforeRepeat, 'decoded skin files must be reused on repeat selection');

    storage.set('yamb_active_skin', 'theme_neon_cyber');
    context.window.skinActionButtons.sync();
    await settle();
    assert.equal(scene.dataset.actionSkinReady, 'default', 'locked theme gift must use the default skin');

    unlocked = true;
    context.window.skinActionButtons.sync();
    await settle();
    assert.equal(scene.dataset.actionSkinReady, 'theme_neon_cyber');
    assert(style.get('--skin-announce-png').includes('/theme_neon_cyber-announce-v1.png'));
    console.log('Skin switch, three button PNGs plus four counter states, locked gift fallback and unlocked gift activation passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
