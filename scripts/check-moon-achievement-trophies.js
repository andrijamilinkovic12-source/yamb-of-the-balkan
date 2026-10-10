const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const manifest = JSON.parse(read('source-assets/theme-icon-packs/moon/achievement-trophies-v1/manifest.json'));
const map = JSON.parse(read('docs/theme-asset-implementation-map.json'));
const catalog = JSON.parse(read('docs/theme-asset-role-catalog.json'));
const moon = map.themes.find(theme => theme.themeId === 'moon');
const roles = catalog.slots
    .filter(slot => slot.id.startsWith('canonical/achievement-trophies/'))
    .map(slot => slot.id.split('/').at(-1).replace(/-v1$/, ''));

assert(moon, 'Moon theme is missing from the implementation map');
assert.equal(roles.length, 26);
assert.deepEqual(Object.keys(manifest.slots).sort(), roles.sort());

const hashes = new Set();
for (const [id, entry] of Object.entries(manifest.slots)) {
    const bytes = fs.readFileSync(path.join(root, entry.productionPath));
    assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16), 256);
    assert.equal(bytes.readUInt32BE(20), 256);
    assert.equal(bytes[25], 6, `${id} must be RGBA`);
    assert.equal(bytes.length, entry.sizeBytes);
    assert(fs.existsSync(path.join(root, entry.masterPath)), `${id} master is missing`);
    hashes.add(crypto.createHash('sha256').update(bytes).digest('hex'));
    const slot = moon.slots[`canonical/achievement-trophies/${id}-v1`];
    assert.equal(slot.stage, 'linked');
    assert.equal(slot.productionPath, entry.productionPath);
    assert.equal(slot.masterPath, entry.masterPath);
}
assert.equal(hashes.size, 26, 'All Moon trophy PNGs must be visually distinct files');

const sources = {
    'www/config.js': "item.moonIcon = `assets/theme-packs/moon/canonical/achievement-trophies/${item.id}-v1.png?v=${trophyImageVersion('moon', item.id)}`;",
    'www/managers.js': 'moon: item?.moonIcon',
    'www/riznica.js': "this.warmTrophyAssets('moon')",
    'www/trophyManager.js': 'trophy.moonIcon',
    'www/game.js': 'assets: SHOP_DATA.TROPHIES.map(item => item.moonIcon)',
    'www/theme-achievement-trophies.css': 'body.moon-theme #riznica-screen[data-riznica-tab="trophy"] .riznica-trophy-soft-clay-icon',
    'www/index.html': 'theme-achievement-trophies.css?v=9'
};
for (const [file, marker] of Object.entries(sources)) {
    assert(read(file).includes(marker), `${file}: missing Moon trophy consumer`);
}
assert(read('www/game.js').includes('moon-trophy-showcase-icon'));
assert(read('www/trophyManager.js').includes('moon-trophy-popup-icon'));

console.log('PASS: 26 distinct Moonlight RGBA trophies are linked in Treasury, popup, showcase and gallery.');
