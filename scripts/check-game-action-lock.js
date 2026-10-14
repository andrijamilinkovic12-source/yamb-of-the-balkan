const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const hashes = new Set();
for (const theme of themes) {
    const base = theme === 'dark' ? 'green-soft-clay' : `theme-packs/${theme}`;
    const file = `www/assets/${base}/canonical/treasury-controls/status-locked-v1.png`;
    const png = fs.readFileSync(path.join(root, file));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${theme}: not PNG`);
    assert.equal(png.readUInt32BE(16), 256, `${theme}: wrong width`);
    assert.equal(png.readUInt32BE(20), 256, `${theme}: wrong height`);
    assert.equal(png[25], 6, `${theme}: lock must have RGBA transparency`);
    const hash = crypto.createHash('sha256').update(png).digest('hex');
    assert(!hashes.has(hash), `${theme}: lock PNG reused from another theme`);
    hashes.add(hash);
}

const headerCode = read('www/theme-game-header.js');
let currentTheme = 'dark';
let startHeader;
const observers = new Map();
const scene = { dataset: {}, style: { values: {}, setProperty(key, value) { this.values[key] = value; } } };
const buttons = Object.fromEntries(['btn-bacaj', 'btn-najava'].map(id => [id, {
    dataset: {}, textContent: '', attributes: {},
    removeAttribute(key) { delete this.attributes[key]; }
}]));
const body = { classList: { contains(name) { return name === `${currentTheme}-theme`; } } };
const headerContext = {
    window: {},
    document: {
        readyState: 'loading', body,
        addEventListener(event, callback) { if (event === 'DOMContentLoaded') startHeader = callback; },
        getElementById(id) { return id === 'game-scene' ? scene : buttons[id] || null; },
        querySelectorAll() { return []; }
    },
    Image: class { set src(value) { this.currentSrc = value; this.complete = true; this.naturalWidth = 256; this.onload(); } },
    MutationObserver: class { constructor(callback) { this.callback = callback; } observe(target) { observers.set(target, this.callback); } },
    gt: key => ({ game_opponent_turn: 'Protivnik igra', game_opponent_choosing: 'Protivnik bira' })[key] || key
};
vm.runInNewContext(headerCode, headerContext);
for (const theme of themes) {
    const base = theme === 'dark' ? 'green-soft-clay' : `theme-packs/${theme}`;
    assert.equal(
        headerContext.window.themeGameHeader.asset('lock', theme),
        `assets/${base}/canonical/treasury-controls/status-locked-v1.png?v=1`,
        `${theme}: game action does not use its canonical Treasury lock`
    );
}
assert(headerCode.includes("asset('lock', theme)"), 'The current theme lock is not preloaded');
assert(headerCode.includes('delete scene.dataset.gameLockReady'), 'Old theme lock may remain visible during a theme switch');
assert(headerCode.includes('reconcileActionLocks'), 'Lock state is not cleared when button text changes');

const gameCode = read('www/game.js');
const gameContext = { window: {}, t: key => ({ game_opponent_turn: 'Protivnik igra', game_opponent_choosing: 'Protivnik bira' })[key] || key };
vm.runInNewContext(gameCode.replace('window.app = new YambApp();', 'globalThis.testLock = setOpponentActionLock;'), gameContext);
const button = {
    dataset: {}, innerText: '', attributes: {},
    setAttribute(key, value) { this.attributes[key] = value; }
};
gameContext.testLock(button, 'game_opponent_turn');
assert.equal(button.dataset.opponentLocked, 'game_opponent_turn');
assert.equal(button.innerText, 'Protivnik igra');
assert.equal(button.attributes['aria-label'], 'Protivnik igra');
assert.equal((gameCode.match(/setOpponentActionLock\(/g) || []).length, 8, 'An online lock state still uses an old glyph');
assert(!/\.innerText\s*=\s*gt\('game_opponent_(?:turn|choosing)'\)/.test(gameCode), 'Old lock text remains in a game state');

const css = read('www/theme-game-header.css');
assert(css.includes('[data-game-lock-ready] :is(#btn-bacaj, #btn-najava)[data-opponent-locked]'));
assert(css.includes('background: var(--gh-lock-png) center / contain no-repeat'));
assert(css.includes('width: 28px;') && css.includes('height: 28px;'));
const languages = read('www/languages.js');
assert(!/"game_opponent_(?:turn|choosing)": "🔒"/.test(languages), 'Old emoji lock remains in translations');
const html = read('www/index.html');
assert(html.includes('theme-game-header.css?v=5') && html.includes('theme-game-header.js?v=3'));

(async () => {
    buttons['btn-bacaj'].dataset.opponentLocked = 'game_opponent_turn';
    buttons['btn-bacaj'].textContent = 'Protivnik igra';
    buttons['btn-bacaj'].attributes['aria-label'] = 'Protivnik igra';
    startHeader();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(scene.dataset.gameLockReady, 'dark');
    assert(scene.style.values['--gh-lock-png'].includes('green-soft-clay'));
    buttons['btn-bacaj'].textContent = 'BACAJ';
    observers.get(buttons['btn-bacaj'])();
    assert.equal(buttons['btn-bacaj'].dataset.opponentLocked, undefined);
    assert.equal(buttons['btn-bacaj'].attributes['aria-label'], undefined);
    currentTheme = 'neon';
    observers.get(body)();
    assert.equal(scene.dataset.gameLockReady, undefined, 'Old theme lock remained during switch');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(scene.dataset.gameLockReady, 'neon');
    assert(scene.style.values['--gh-lock-png'].includes('/theme-packs/neon/'));
    console.log('Game action locks verified: 10 distinct thematic PNGs, BACAJ/NAJAVA states, accessible text, theme switch and fixed 28px icon.');
})().catch(error => { console.error(error); process.exitCode = 1; });
