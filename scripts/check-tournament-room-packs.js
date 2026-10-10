const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

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
const powerRole = ['statistics-overview', 'power-index'];
const routedRoles = [...roles, powerRole];
const packs = ['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const powerHashes = new Set();

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
    assert(entry && manifest.assets.length === (theme === 'light' ? 14 : 11), `${theme}: incomplete manifest`);
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
    const powerSlot = entry.slots['canonical/statistics-overview/power-index-v1'];
    assert.equal(powerSlot?.stage, 'linked', `${theme}: Power Index not linked`);
    const powerFile = path.join(root, powerSlot.productionPath);
    assert.deepEqual(pngSize(powerFile), [256, 256]);
    powerHashes.add(crypto.createHash('sha256').update(fs.readFileSync(powerFile)).digest('hex'));
    assert(manifest.assets.some(asset => asset.group === 'statistics-overview' && asset.id === 'power-index'),
        `${theme}: Power Index missing from manifest`);
}
assert.equal(powerHashes.size, packs.length, 'Themes must not share a copied Power Index PNG');

const gameScript = fs.readFileSync(path.join(root, 'www/game.js'), 'utf8');
const roomScript = fs.readFileSync(path.join(root, 'www/turnir.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
const tournamentCss = fs.readFileSync(path.join(root, 'www/theme-main-room-icons.css'), 'utf8');
assert(tournamentCss.includes('.amethyst-theme,.easter-theme,.moon-theme')
    && tournamentCss.includes('#tournament-screen .theme-tournament-room-icon-host > img:not(.theme-tournament-room-icon)'),
    'Easter canonical Tournament icon CSS or legacy-image hiding missing');
assert(!gameScript.includes('assets/easter-soft-clay/tournament/tab-bracket-v3.png'),
    'Old Easter Tournament bracket is still preloaded');
assert(!gameScript.includes('assets/desert-soft-clay/tournament/tab-info.png')
    && !gameScript.includes('assets/desert-soft-clay/tournament/finalist-silver-v2.png'),
    'Old Desert Tournament icons are still preloaded');
assert(!gameScript.includes('assets/severna-soft-clay/tournament/tab-info-v2.png')
    && !gameScript.includes('assets/severna-soft-clay/tournament/finalist-silver-v3.png'),
    'Old Northern Nebula Tournament icons are still preloaded');
assert(!/assets\/(?:tournament-[^"'\s]*\.svg|(?:easter|desert|severna)-soft-clay\/tournament[^"'\s]*)/.test(roomScript),
    'Tournament room still renders a legacy SVG or theme PNG');
assert(!indexHtml.includes('tourney-header-icon-default'),
    'Tournament header still renders a legacy SVG beside the canonical trophy');
assert(!gameScript.includes('assets/tournament-trophy-yotb.svg'),
    'Tournament winner ceremony still falls back to the legacy SVG');
assert(roomScript.includes('const powerMark = \'<img class="tourney-participant-power-icon-green"')
    && !roomScript.includes("powerMark = isGreenTheme"),
    'Tournament bracket still uses the emoji Power Index in a non-Green theme');
assert(gameScript.includes("['statistics-overview', 'power-index']"),
    'Tournament room does not preload the themed Power Index');
for (const iconClass of ['tourney-match-result-icon-green', 'tourney-inline-active-match-icon-green',
    'tourney-finalist-result-icon-canonical', 'tourney-journey-final-trophy']) {
    assert(tournamentCss.includes(`#custom-modal-overlay .${iconClass}`),
        `Tournament duel modal lacks Green-size styling for ${iconClass}`);
}

class ClassList {
    constructor(values = []) { this.values = new Set(values); }
    contains(value) { return this.values.has(value); }
    toggle(value, force) { force ? this.values.add(value) : this.values.delete(value); }
}
const images = routedRoles.map(([group, role]) => {
    const source = `assets/green-soft-clay/canonical/${group}/${role}-v1.png?v=1`;
    const properties = new Map();
    const listeners = {};
    return {
        dataset: { themeSrc: source },
        closest: selector => role === 'power-index' && selector === '#tournament-screen' ? {} : null,
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
        const [group, role] = routedRoles[index];
        const expected = theme === 'dark' ? image.dataset.themeSrc
            : `assets/theme-packs/${theme}/canonical/${group}/${role}-v1.png${role === 'power-index' ? '?v=1' : theme === 'neon' && role === 'tab-bracket' ? '?v=2' : ''}`;
        assert.equal(image.getAttribute('src'), expected, `${theme}: wrong ${role} source`);
        if (role !== 'power-index') {
            assert.equal(image.classList.contains('theme-tournament-room-icon'), theme !== 'dark');
            assert.equal(image.parentElement.classList.contains('theme-tournament-room-icon-host'), theme !== 'dark');
        }
        assert.equal(image.style.getPropertyValue('visibility'), 'hidden');
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
body.classList.toggle('desert-theme', true);
document.documentElement.dataset.splashTheme = 'desert';
observerCallback([{ type: 'attributes' }]);
checkTheme('desert');
body.classList.toggle('desert-theme', false);
body.classList.toggle('moon-theme', true);
document.documentElement.dataset.splashTheme = 'moon';
observerCallback([{ type: 'attributes' }]);
checkTheme('moon');
body.classList.toggle('moon-theme', false);
body.classList.toggle('severna-theme', true);
document.documentElement.dataset.splashTheme = 'severna';
observerCallback([{ type: 'attributes' }]);
checkTheme('severna');
body.classList.toggle('severna-theme', false);
document.documentElement.dataset.splashTheme = 'dark';
observerCallback([{ type: 'attributes' }]);
checkTheme('dark');

console.log('PASS: all nine complete Tournament PNG packs and theme-switch routing back to Green.');
