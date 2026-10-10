const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'www/theme-main-room-icons.js'), 'utf8');
const map = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-asset-implementation-map.json'), 'utf8'));
const roles = [
    ['tournament-navigation', 'tab-info'],
    ['tournament-navigation', 'tab-bracket'],
    ['tournament-navigation', 'tab-hall-of-fame'],
    ...['state-register', 'state-unregister', 'state-registration-locked', 'state-start',
        'state-match-active', 'state-match-complete'].map(role => ['tournament-states', role])
];
const packs = ['light', 'medium', 'winter', 'neon', 'amethyst', 'easter'];

function pngSize(file) {
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `Invalid PNG: ${file}`);
    assert.equal(bytes[25], 6, `Expected RGBA: ${file}`);
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

for (const theme of packs) {
    const entry = map.themes.find(item => item.themeId === theme);
    const manifest = JSON.parse(fs.readFileSync(path.join(root,
        `source-assets/theme-icon-packs/${theme}/tournament-room-v1/manifest.json`), 'utf8'));
    assert(entry && manifest.assets.length === (theme === 'light' ? 13 : 10), `${theme}: incomplete manifest`);
    for (const [group, role] of [['tournament-awards', 'finalist-silver'], ...roles]) {
        const slot = entry.slots[`canonical/${group}/${role}-v1`];
        assert.equal(slot?.stage, 'linked', `${theme}: ${role} not linked`);
        assert.deepEqual(pngSize(path.join(root, slot.productionPath)), [256, 256]);
        assert.deepEqual(pngSize(path.join(root, slot.masterPath)), [1254, 1254]);
    }
    for (const tier of ['gold', 'silver', 'bronze']) {
        const slot = entry.slots[`canonical/competition-medals/tournament-${tier}-v1`];
        assert.equal(slot?.stage, 'linked', `${theme}: ${tier} medal not linked`);
        assert.deepEqual(pngSize(path.join(root, slot.productionPath)), [256, 256]);
    }
}

const gameScript = fs.readFileSync(path.join(root, 'www/game.js'), 'utf8');
const tournamentCss = fs.readFileSync(path.join(root, 'www/theme-main-room-icons.css'), 'utf8');
assert(tournamentCss.includes('.amethyst-theme,.easter-theme,.moon-theme')
    && tournamentCss.includes('#tournament-screen .theme-tournament-room-icon-host > img:not(.theme-tournament-room-icon)'),
    'Easter canonical Tournament icon CSS or legacy-image hiding missing');
assert(!gameScript.includes('assets/easter-soft-clay/tournament/tab-bracket-v3.png'),
    'Old Easter Tournament bracket is still preloaded');
const partialPacks = ['moon', 'desert', 'severna'];
for (const theme of partialPacks) {
    const entry = map.themes.find(item => item.themeId === theme);
    const manifest = JSON.parse(fs.readFileSync(path.join(root,
        `source-assets/theme-icon-packs/${theme}/tournament-room-v1/manifest.json`), 'utf8'));
    const role = 'canonical/tournament-navigation/tab-bracket-v1';
    const slot = entry?.slots[role];
    assert.equal(manifest.assets.length, 1, `${theme}: partial bracket manifest`);
    assert.equal(manifest.assets[0].id, 'tab-bracket');
    assert.equal(slot?.stage, 'linked', `${theme}: bracket not linked`);
    assert.deepEqual(pngSize(path.join(root, slot.productionPath)), [256, 256]);
    assert.deepEqual(pngSize(path.join(root, slot.masterPath)), [1254, 1254]);
}
assert(gameScript.includes('getPartialTournamentBracketSource(theme)'), 'Partial bracket preload missing');

class ClassList {
    constructor(values = []) { this.values = new Set(values); }
    contains(value) { return this.values.has(value); }
    toggle(value, force) { force ? this.values.add(value) : this.values.delete(value); }
}
const images = roles.map(([group, role]) => {
    const source = `assets/green-soft-clay/canonical/${group}/${role}-v1.png?v=1`;
    const properties = new Map();
    const listeners = {};
    return {
        dataset: { themeSrc: source },
        classList: new ClassList(),
        parentElement: { classList: new ClassList() },
        attributes: {},
        complete: false,
        naturalWidth: 0,
        style: {
            getPropertyValue: name => properties.get(name)?.value || '',
            getPropertyPriority: name => properties.get(name)?.priority || '',
            setProperty: (name, value, priority) => properties.set(name, { value, priority }),
            removeProperty: name => properties.delete(name)
        },
        addEventListener: (type, handler) => { listeners[type] = handler; },
        fire: type => listeners[type]?.(),
        getAttribute(name) { return this.attributes[name] || null; },
        set src(value) { this.attributes.src = value; this.complete = false; this.naturalWidth = 0; }
    };
});
const body = { classList: new ClassList(['light-theme']) };
const document = {
    readyState: 'complete', body,
    documentElement: { dataset: { splashTheme: 'light' } },
    querySelectorAll: selector => selector === 'img[data-theme-src]' ? images : []
};
let observerCallback;
vm.runInNewContext(script, {
    document,
    localStorage: { getItem: () => null },
    MutationObserver: class { constructor(callback) { observerCallback = callback; } observe() {} },
    Node: { ELEMENT_NODE: 1 }
}, { filename: 'theme-main-room-icons.js' });

function checkTheme(theme) {
    for (let index = 0; index < images.length; index++) {
        const image = images[index];
        const [group, role] = roles[index];
        const expected = theme === 'dark' ? image.dataset.themeSrc
            : `assets/theme-packs/${theme}/canonical/${group}/${role}-v1.png${theme === 'neon' && role === 'tab-bracket' ? '?v=2' : ''}`;
        assert.equal(image.getAttribute('src'), expected, `${theme}: wrong ${role} source`);
        assert.equal(image.classList.contains('theme-tournament-room-icon'), theme !== 'dark');
        assert.equal(image.parentElement.classList.contains('theme-tournament-room-icon-host'), theme !== 'dark');
        assert.equal(image.style.getPropertyValue('visibility'), theme === 'dark' && role !== 'tab-bracket' ? '' : 'hidden');
        image.complete = true;
        image.naturalWidth = 256;
        image.fire('load');
        assert.equal(image.style.getPropertyValue('visibility'), '');
    }
}
function checkPartialTheme(theme) {
    for (let index = 0; index < images.length; index++) {
        const image = images[index];
        const [, role] = roles[index];
        const bracket = role === 'tab-bracket';
        const expected = bracket
            ? `assets/theme-packs/${theme}/canonical/tournament-navigation/tab-bracket-v1.png`
            : image.dataset.themeSrc;
        assert.equal(image.getAttribute('src'), expected, `${theme}: wrong ${role} source`);
        assert.equal(image.classList.contains('theme-tournament-room-icon'), bracket);
        assert.equal(image.parentElement.classList.contains('theme-tournament-room-icon-host'), bracket);
        assert.equal(image.style.getPropertyValue('visibility'), bracket || theme === partialPacks[0] ? 'hidden' : '');
        image.complete = true;
        image.naturalWidth = 256;
        image.fire('load');
        assert.equal(image.style.getPropertyValue('visibility'), '');
    }
}
checkTheme('light');
body.classList.toggle('light-theme', false);
body.classList.toggle('medium-theme', true);
document.documentElement.dataset.splashTheme = 'medium';
observerCallback([{ type: 'attributes' }]);
checkTheme('medium');
body.classList.toggle('medium-theme', false);
body.classList.toggle('winter-theme', true);
document.documentElement.dataset.splashTheme = 'winter';
observerCallback([{ type: 'attributes' }]);
checkTheme('winter');
body.classList.toggle('winter-theme', false);
body.classList.toggle('neon-theme', true);
document.documentElement.dataset.splashTheme = 'neon';
observerCallback([{ type: 'attributes' }]);
checkTheme('neon');
body.classList.toggle('neon-theme', false);
body.classList.toggle('amethyst-theme', true);
document.documentElement.dataset.splashTheme = 'amethyst';
observerCallback([{ type: 'attributes' }]);
checkTheme('amethyst');
body.classList.toggle('amethyst-theme', false);
body.classList.toggle('easter-theme', true);
document.documentElement.dataset.splashTheme = 'easter';
observerCallback([{ type: 'attributes' }]);
checkTheme('easter');
body.classList.toggle('easter-theme', false);
for (const theme of partialPacks) {
    body.classList.toggle(`${theme}-theme`, true);
    document.documentElement.dataset.splashTheme = theme;
    observerCallback([{ type: 'attributes' }]);
    checkPartialTheme(theme);
    body.classList.toggle(`${theme}-theme`, false);
}
document.documentElement.dataset.splashTheme = 'dark';
observerCallback([{ type: 'attributes' }]);
checkTheme('dark');

console.log('PASS: six complete Tournament PNG packs, three bracket-only packs, and theme-switch routing back to Green.');
