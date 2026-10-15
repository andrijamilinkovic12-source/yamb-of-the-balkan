const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const elements = {};
const documentListeners = {};
const windowListeners = {};
let document;
class Element {
    constructor(tag = 'div') {
        this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {};
        this.attributes = {}; this.listeners = {}; this.hidden = false; this.isConnected = true;
        this.textContent = ''; this.src = '';
    }
    setAttribute(key, value) { this.attributes[key] = String(value); }
    getAttribute(key) { return this.attributes[key] || null; }
    addEventListener(key, callback) { this.listeners[key] = callback; }
    append(...items) { this.children.push(...items); }
    replaceChildren(...items) { this.children = items; }
    querySelector(selector) {
        if (selector === 'button') return this.children.find(item => item.tagName === 'BUTTON') || null;
        if (selector === '[aria-current="true"]') return this.children.find(item => item.attributes['aria-current'] === 'true') || null;
        return null;
    }
    querySelectorAll(selector) { return selector === 'button' ? this.children.filter(item => item.tagName === 'BUTTON') : []; }
    focus() { document.activeElement = this; }
    click() { this.listeners.click?.({ target: this }); }
}
for (const id of ['setting-theme','settings-theme-trigger','settings-theme-trigger-name',
    'settings-theme-trigger-icon','settings-theme-trigger-caption','settings-theme-overlay',
    'settings-theme-options','settings-theme-dialog-close','settings-theme-dialog-title'])
    elements[id] = new Element(id === 'setting-theme' ? 'select' : 'div');
const ids = ['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
elements['setting-theme'].options = ids.map(value => ({ value, textContent: value === 'neon' ? 'Neon Cyber ⚡' : value }));
elements['settings-theme-overlay'].hidden = true;
const sr = new Element('button'); sr.dataset.settingsLang = 'sr';
const en = new Element('button'); en.dataset.settingsLang = 'en';
document = {
    readyState:'complete', documentElement:{ lang:'sr' }, body:{}, activeElement:elements['settings-theme-trigger'],
    getElementById:id => elements[id] || null,
    querySelectorAll:selector => selector.includes('settings-language-btn') ? [sr,en] : [],
    createElement:tag => new Element(tag),
    addEventListener:(key,callback) => { documentListeners[key] = callback; },
};
let selected = null, syncCount = 0;
const window = {
    themeGameHeader:{ activeTheme:() => 'dark', asset:role => `lock-${role}.png` },
    app:{
        getUnlockedThemeIds:() => ['dark','light','medium','winter'],
        syncThemeSelectOptions:() => { syncCount++; },
        saveSettingAuto:(type,value) => { selected = [type,value]; },
    },
    addEventListener:(key,callback) => { windowListeners[key] = callback; },
};
class MutationObserver { observe() {} }
vm.runInNewContext(fs.readFileSync('www/theme-settings-picker.js','utf8'),
    { window,document,MutationObserver });

const picker = window.themeSettingsPicker;
for (const theme of ids)
    assert.equal(picker.previewSource(theme), `assets/treasury-theme-previews/${theme}-v1.png`);
picker.open();
assert.equal(syncCount, 1);
assert.equal(elements['settings-theme-overlay'].hidden, false);
assert.equal(elements['settings-theme-options'].children.length, 10);
assert.equal(elements['settings-theme-trigger'].getAttribute('aria-expanded'), 'true');
const neon = elements['settings-theme-options'].children.find(row => row.dataset.theme === 'neon');
assert.equal(neon.children[0].src, picker.previewSource('neon'));
assert.equal(elements['settings-theme-trigger-icon'].src, picker.previewSource('dark'));
assert.equal(neon.getAttribute('aria-disabled'), 'true');
neon.click();
assert.equal(selected, null, 'Locked themes must never be selected');
const light = elements['settings-theme-options'].children.find(row => row.dataset.theme === 'light');
light.click();
assert.equal(selected.join(':'), 'theme:light');
assert.equal(elements['settings-theme-overlay'].hidden, true);
assert.equal(elements['settings-theme-trigger'].getAttribute('aria-expanded'), 'false');
picker.open();
documentListeners.keydown({ key:'Escape', preventDefault() {} });
assert.equal(elements['settings-theme-overlay'].hidden, true);
document.documentElement.lang = 'en';
windowListeners['yamb:languageChanged']();
assert.equal(elements['settings-theme-dialog-title'].textContent, 'Choose a theme');
assert.equal(en.getAttribute('aria-pressed'), 'true');
assert.equal(sr.getAttribute('aria-pressed'), 'false');
console.log('Settings picker: 10 themed choices, locks, selection, keyboard close and localization OK.');
