const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../www/game.js'), 'utf8');
assert(source.includes('window.app = new YambApp();'));
const values = new Map([['yamb_unlocked_skins', JSON.stringify(['purchased'])]]);
const localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value))
};
const elements = new Map();
const listeners = new Map();
class Element {
    constructor(tagName = 'div') {
        this.tagName = tagName;
        this.children = [];
        this.dataset = {};
        this.attributes = {};
        this.classList = { remove() {} };
        this.hidden = false;
    }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, callback) { this.handlers ||= {}; this.handlers[name] = callback; }
    focus() { document.activeElement = this; }
    querySelector(selector) {
        if (selector === '.game-skin-choice[aria-pressed="true"]') {
            return elements.get('game-skin-picker-list').children.find(child => child.attributes['aria-pressed'] === 'true') || null;
        }
        return null;
    }
    querySelectorAll(selector) { return selector === 'button' ? elements.get('game-skin-picker-list').children : []; }
}
for (const id of ['game-quick-skin-current', 'game-skin-picker', 'game-skin-picker-list', 'game-dropdown-menu', 'btn-game-menu-toggle', 'game-skin-picker-close']) {
    elements.set(id, new Element());
}
elements.get('game-skin-picker').hidden = true;
const document = {
    documentElement: { lang: 'sr' },
    getElementById: id => elements.get(id) || null,
    createElement: tagName => new Element(tagName),
    querySelectorAll: () => [],
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name),
    activeElement: null
};
let buttonSyncs = 0;
const window = { skinActionButtons: { sync: () => { buttonSyncs++; } } };
const context = {
    window, document, localStorage, console, setTimeout, clearTimeout,
    SHOP_DATA: { SKINS: [
        { id: 'default', price: 0, name: { sr: 'Bela' } },
        { id: 'purchased', price: 3000, name: { sr: 'Kupljeni' } },
        { id: 'locked', price: 5000, name: { sr: 'Zaključani' } },
        { id: 'gift_owned', price: 0, themeGift: 'light', name: { sr: 'Poklon' } },
        { id: 'gift_locked', price: 0, themeGift: 'moon', name: { sr: 'Nedostupan poklon' } }
    ] }
};
vm.runInNewContext(source.replace('window.app = new YambApp();', 'globalThis.TestYambApp = YambApp;'), context);
const app = Object.create(context.TestYambApp.prototype);
app.readLocalJson = (key, fallback) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
app.isThemeUnlocked = id => id === 'light';
app.stats = { unlockedSkins: [] };
app.updateDiceVisuals = () => { app.visualUpdates = (app.visualUpdates || 0) + 1; };
app.soundEnabled = false;
app.socket = { connected: false };
window.app = app;
assert.deepEqual(Array.from(app.availableQuickSkins(), item => item.id), ['default', 'purchased', 'gift_owned']);
app.equipQuickSkin('locked');
assert.equal(localStorage.getItem('yamb_active_skin'), null, 'Locked purchase cannot be selected');
app.equipQuickSkin('gift_locked');
assert.equal(localStorage.getItem('yamb_active_skin'), null, 'Locked theme gift cannot be selected');
app.equipQuickSkin('purchased');
assert.equal(localStorage.getItem('yamb_active_skin'), 'purchased');
assert.equal(localStorage.getItem('yamb_manual_active_skin'), 'purchased');
assert.equal(app.visualUpdates, 1);
assert.equal(buttonSyncs, 1);
app.openQuickSkinPicker();
const picker = elements.get('game-skin-picker');
const list = elements.get('game-skin-picker-list');
assert.equal(picker.hidden, false);
assert.deepEqual(Array.from(list.children, choice => choice.dataset.skinId), ['default', 'purchased', 'gift_owned']);
assert.equal(list.children[1].attributes['aria-pressed'], 'true');
assert.equal(list.children[1].children[0].src, 'assets/treasury-skin-previews/purchased-face-v1.png');
assert.equal(elements.get('game-quick-skin-current').textContent, 'Kupljeni');
assert.equal(document.activeElement, list.children[1]);
list.children[0].handlers.click();
assert.equal(localStorage.getItem('yamb_active_skin'), 'default', 'One click must equip a visible owned skin');
assert.equal(picker.hidden, true, 'Picker must close after equipping');
assert.equal(listeners.has('keydown'), false, 'Keyboard handler must be removed on close');

// Exercise the actual 48-item shop catalog, not only a small synthetic example.
const config = fs.readFileSync(path.join(__dirname, '../www/config.js'), 'utf8');
const skinBlock = config.match(/SKINS:\s*\[([\s\S]*?)\]\s*,\s*EFFECTS:/);
assert(skinBlock, 'Actual skin catalog is missing');
const actualSkins = vm.runInNewContext(`[${skinBlock[1]}]`);
assert.equal(actualSkins.length, 48);
context.SHOP_DATA.SKINS = actualSkins;
const paid = actualSkins.filter(skin => !skin.themeGift && Number(skin.price) > 0);
assert(paid.length > 1);
const purchasedId = paid[0].id;
const lockedId = paid[1].id;
values.set('yamb_unlocked_skins', JSON.stringify([purchasedId]));
values.set('yamb_unlocked', '[]');
const allowed = app.availableQuickSkins().map(skin => skin.id);
assert(allowed.includes('default') && allowed.includes(purchasedId));
assert(!allowed.includes(lockedId));
assert(allowed.includes(actualSkins.find(skin => skin.themeGift === 'light').id));
assert(!allowed.includes(actualSkins.find(skin => skin.themeGift === 'moon').id));
const balanceBefore = values.get('yamb_dukati') || null;
app.equipQuickSkin(purchasedId);
assert.equal(localStorage.getItem('yamb_active_skin'), purchasedId);
assert.equal(values.get('yamb_dukati') || null, balanceBefore, 'Equipping owned skin must not charge again');
app.equipQuickSkin(lockedId);
assert.equal(localStorage.getItem('yamb_active_skin'), purchasedId, 'Locked real skin must not replace owned skin');
for (const skin of actualSkins) {
    assert(fs.existsSync(path.join(__dirname, '../www/assets/treasury-skin-previews', `${skin.id}-face-v1.png`)), `${skin.id}: missing PNG preview`);
}
app.openQuickSkinPicker();
assert.deepEqual(Array.from(list.children, choice => choice.dataset.skinId), Array.from(allowed));
listeners.get('keydown')({ key: 'Escape', preventDefault() {} });
assert.equal(picker.hidden, true, 'Escape must close the picker');
console.log('Quick skin picker shows only usable PNG skins, selects with one click, closes on Escape and blocks locked purchases and gifts.');
