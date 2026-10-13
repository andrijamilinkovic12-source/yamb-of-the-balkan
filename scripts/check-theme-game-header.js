const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const manifest = JSON.parse(read('source-assets/theme-game-header-v1/manifest.json'));
const definitions = JSON.parse(read('docs/theme-definitions.json'));
const expectedThemes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const roles = ['exit', 'timer', 'menu', 'sound', 'vibration', 'music'];
assert.deepEqual(manifest.themes.map(theme => theme.id), expectedThemes);
const hashes = new Set();
const bases = new Set();
for (const theme of manifest.themes) {
    const definition = definitions.themes.find(item => item.id === theme.id);
    assert(definition, `${theme.id}: missing theme definition`);
    assert.equal(theme.direction, definition.direction, `${theme.id}: material direction differs from theme DNA`);
    assert.deepEqual(Object.keys(theme.roles), roles, `${theme.id}: missing game header role`);
    assert(fs.existsSync(path.join(root, theme.generatedBase)), `${theme.id}: missing individual material render`);
    const baseHash = crypto.createHash('sha256').update(read(theme.generatedBase)).digest('hex');
    assert(!bases.has(baseHash), `${theme.id}: reused material base`);
    bases.add(baseHash);
    for (const role of roles) {
        const item = theme.roles[role];
        const bytes = read(item.production);
        assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(bytes.readUInt32BE(16), 256);
        assert.equal(bytes.readUInt32BE(20), 256);
        assert.equal(bytes[25], 6, `${theme.id}/${role}: RGBA required`);
        const hash = crypto.createHash('sha256').update(bytes).digest('hex');
        assert.equal(hash, item.sha256, `${theme.id}/${role}: stale asset hash`);
        assert(!hashes.has(hash), `${theme.id}/${role}: repeated control PNG`);
        hashes.add(hash);
        assert(fs.existsSync(path.join(root, item.master)), `${theme.id}/${role}: missing master`);
    }
    const base = `www/assets/${theme.id === 'dark' ? 'green-soft-clay' : `theme-packs/${theme.id}`}/canonical`;
    for (const shared of [
        'undo-token/undo-token-inline-v1.png',
        'treasury-controls/tab-themes-v1.png',
        'treasury-controls/tab-skins-v1.png',
        'room-controls/close-v1.png'
    ]) assert(fs.existsSync(path.join(root, base, shared)), `${theme.id}: missing shared ${shared}`);
    assert(fs.existsSync(path.join(root, `www/assets/theme-packs/${theme.id}/canonical/online-players-internal/spectate-v1.png`)),
        `${theme.id}: missing shared spectator eye`);
}
const html = read('www/index.html').toString('utf8');
const code = read('www/game.js').toString('utf8');
const controller = read('www/theme-game-header.js').toString('utf8');
const css = read('www/theme-game-header.css').toString('utf8');
assert(html.includes('theme-game-header.css?v=') && html.includes('theme-game-header.js?v='));
assert(html.includes('id="game-quick-skin-open"') && html.includes('id="game-skin-picker"') && html.includes('id="game-skin-picker-list"'));
assert(!html.includes('id="game-quick-skin-select"'), 'Old native skin dropdown is still present');
assert(html.includes('data-online-role="spectate"'), 'Header eye must reuse the Online Players PNG');
assert(code.includes('availableQuickSkins()') && code.includes('this.isThemeUnlocked(item.themeGift)'));
assert(code.includes("Number(item.price) === 0 || inventory.has(item.id)"));
assert(code.includes("localStorage.setItem('yamb_active_skin', item.id)"));
assert(code.includes('window.skinActionButtons?.sync()'));
assert(controller.includes("if (role === 'undo')") && controller.includes("role === 'theme' || role === 'skin'"));
assert(controller.includes("if (role === 'close')"), 'Picker must reuse the themed room close PNG');
assert(css.includes('gh-spectator-icon.gh-btn-active .theme-online-game-spectator-icon') && css.includes('timer-turn--urgent'));
assert(css.includes('.game-skin-picker-list') && css.includes('overflow-y:auto'), 'Owned skin picker must scroll');
assert(css.includes('#game-scene:is(#game-scene) #turn-timer-display') && css.includes('#game-scene:is(#game-scene) #game-dropdown-menu'),
    'New palette layer must override legacy theme control surfaces');
assert(css.includes('backdrop-filter:none !important') && css.includes('timer-turn--expired::before'),
    'Panel material and expired timer state are missing');
console.log('Game header verified: 10 material identities, 60 distinct RGBA PNG controls, shared icons and owned-skin wiring.');
