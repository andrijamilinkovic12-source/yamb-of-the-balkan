const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const roles = ['state', 'search', 'friend', 'spectate', 'duel', 'avatar'];
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const catalog = read('docs/theme-asset-role-catalog.json');
const implementation = read('docs/theme-asset-implementation-map.json');
const definitions = read('docs/theme-definitions.json');
const html = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
const game = fs.readFileSync(path.join(root, 'www/game.js'), 'utf8');
const list = fs.readFileSync(path.join(root, 'www/onlinenumber.js'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'www/theme-online-players-room.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'www/theme-online-players-room.css'), 'utf8');
const languages = fs.readFileSync(path.join(root, 'www/languages.js'), 'utf8');

function luminance(hex) {
    const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255);
    const linear = rgb.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
}
function contrast(a, b) {
    const high = Math.max(luminance(a), luminance(b));
    const low = Math.min(luminance(a), luminance(b));
    return (high + .05) / (low + .05);
}
function palette(theme) {
    const marker = theme === 'dark' ? '#online-players-overlay {' : `body.${theme}-theme #online-players-overlay {`;
    const start = css.indexOf(marker);
    assert(start >= 0, `${theme}: missing palette`);
    const rule = css.slice(start, css.indexOf('}', start));
    return Object.fromEntries([...rule.matchAll(/--op-([\w-]+):\s*(#[\da-fA-F]{6})/g)].map(match => [match[1], match[2]]));
}

assert.equal(catalog.requiredPngCountPerTheme, 191);
assert.equal(implementation.requiredSlotCountPerTheme, 191);
assert(definitions.crossThemeRoomContract.onlinePlayersRoom.includes('Sest') || definitions.crossThemeRoomContract.onlinePlayersRoom.includes('sest'));
for (const old of ['online-add-friend-v1', 'online-duel-v1', 'online-players-state-v1', 'online-spectate-v1']) {
    assert(!catalog.slots.some(slot => slot.id === old), `Old semantic slot ${old}`);
    assert(!list.includes(`assets/green-soft-clay/${old}`), `Old active list icon ${old}`);
    assert(!game.includes(`assets/green-soft-clay/${old}`), `Old active gameplay icon ${old}`);
}
assert(html.includes('theme-online-players-room.js') && html.includes('theme-online-players-room.css'));
assert(html.includes('data-online-role="search"') && html.includes('data-online-role="state"'));
assert(list.includes('data-online-role="${role}"') && list.includes('themeOnlinePlayers.handleAvatarError'));
assert(list.includes("actionButton('friend'") && list.includes("actionButton('spectate'")
    && list.includes("actionButton('duel'") && game.includes('data-online-role="spectate"'));
assert(loader.includes('MutationObserver') && loader.includes("image.style.visibility = 'hidden'"));
assert(html.includes('id="online-players-search"') && html.includes('data-lang-placeholder="online_search_placeholder"'));
assert(languages.includes('"Pretraži po imenu..."') && languages.includes('"Search by name..."'));
assert(css.includes('.online-players-search-wrap:focus-within') && css.includes('.online-player-action:focus-visible'));
const hashes = new Set();
const masterHashes = new Set();
for (const theme of themes) {
    const colors = palette(theme);
    for (const [label, foreground, background] of [
        ['heading', 'heading', 'raised'],
        ['player name', 'ink', 'raised'],
        ['search text', 'ink', 'inset'],
        ['search hint', 'muted', 'inset'],
        ['empty state', 'muted', 'inset'],
        ['load more', 'muted', 'surface'],
        ...(theme === 'dark' ? [] : [['player detail', 'muted', 'raised']]),
    ]) {
        const ratio = contrast(colors[foreground], colors[background]);
        assert(ratio >= 4.5, `${theme}: ${label} contrast ${ratio.toFixed(2)}:1`);
    }
    const manifest = read(`source-assets/theme-icon-packs/${theme}/online-players-internal-v1/manifest.json`);
    assert(manifest.source.includes('Six separately prompted and generated transparent ImageGen illustrations'));
    assert.deepEqual(Object.keys(manifest.roles), roles);
    for (const role of roles) {
        const entry = manifest.roles[role];
        const slotId = `canonical/online-players-internal/${role}-v1`;
        assert(catalog.slots.some(slot => slot.id === slotId));
        const file = path.join(root, entry.production);
        const bytes = fs.readFileSync(file);
        assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a', `${theme}/${role} PNG`);
        assert.equal(bytes.readUInt32BE(16), role === 'state' ? 256 : 144);
        assert.equal(bytes.readUInt32BE(20), role === 'state' ? 256 : 144);
        assert.equal(bytes[25], 6, `${theme}/${role} RGBA`);
        const hash = crypto.createHash('sha256').update(bytes).digest('hex');
        assert.equal(hash, entry.sha256);
        assert(!hashes.has(hash), `${theme}/${role} reuses a PNG`);
        hashes.add(hash);
        const master = fs.readFileSync(path.join(root, entry.master));
        assert(master.length > 100000, `${theme}/${role}: missing full-resolution illustration master`);
        assert.equal(master.toString('hex', 0, 8), '89504e470d0a1a0a');
        assert.equal(master[25], 6, `${theme}/${role}: master must retain transparency`);
        const masterHash = crypto.createHash('sha256').update(master).digest('hex');
        assert(!masterHashes.has(masterHash), `${theme}/${role}: master reused`);
        masterHashes.add(masterHash);
        if (theme !== 'dark') {
            const slots = implementation.themes.find(item => item.themeId === theme).slots;
            assert.equal(Object.keys(slots).length, 191);
            assert.equal(slots[slotId].stage, 'verified');
            assert.equal(slots[slotId].productionPath, entry.production);
            assert.equal(slots[slotId].sizeBytes, bytes.length);
            assert.deepEqual(slots[slotId].opticalBoundsPx.length, 4);
        }
    }
}
console.log('PASS: 10 themes, 60 unique RGBA PNGs, 191 catalog slots, active runtime links.');
