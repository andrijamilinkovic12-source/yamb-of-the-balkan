const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root,
    'source-assets/theme-icon-packs/severna/achievement-trophies-v1/manifest.json'), 'utf8'));
const map = JSON.parse(fs.readFileSync(path.join(root,
    'docs/theme-asset-implementation-map.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root,
    'docs/theme-asset-role-catalog.json'), 'utf8'));
const severna = map.themes.find(theme => theme.themeId === 'severna');
const roles = catalog.slots
    .filter(slot => slot.id.startsWith('canonical/achievement-trophies/'))
    .map(slot => slot.id.split('/').at(-1).replace(/-v1$/, ''));
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
    assert(fs.existsSync(path.join(root, entry.masterPath)));
    hashes.add(crypto.createHash('sha256').update(bytes).digest('hex'));
    const slot = severna.slots[`canonical/achievement-trophies/${id}-v1`];
    assert.equal(slot.stage, 'linked');
    assert.equal(slot.productionPath, entry.productionPath);
    assert.equal(slot.masterPath, entry.masterPath);
}
assert.equal(hashes.size, 26, 'Trophy PNGs must be distinct');
const consumers = {
    'www/config.js': 'item.severnaIcon',
    'www/managers.js': 'item?.severnaIcon',
    'www/riznica.js': "this.warmTrophyAssets('severna')",
    'www/trophyManager.js': 'trophy.severnaIcon',
    'www/game.js': 'trophy.severnaIcon',
    'www/theme-achievement-trophies.css': 'body.severna-theme #riznica-screen[data-riznica-tab="trophy"] .riznica-trophy-soft-clay-icon',
    'www/index.html': 'theme-achievement-trophies.css?v=10'
};
for (const [file, marker] of Object.entries(consumers)) {
    assert(fs.readFileSync(path.join(root, file), 'utf8').includes(marker), `${file}: missing consumer`);
}
const game = fs.readFileSync(path.join(root, 'www/game.js'), 'utf8');
const treasury = fs.readFileSync(path.join(root, 'www/riznica.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'www/theme-achievement-trophies.css'), 'utf8');
assert(game.includes('...SHOP_DATA.TROPHIES.map(item => item.severnaIcon)'), 'Theme gallery is missing the new trophies');
assert(treasury.includes("'amethyst', 'severna'].includes(themeName)"), 'Theme warmup excludes Severna Maglina');
assert(treasury.includes('severna: item?.severnaIcon'), 'Theme warmup uses a wrong icon source');
assert(css.includes('body.severna-theme .severna-trophy-popup-icon'), 'Popup style is missing');
assert(css.includes('body.severna-theme .severna-trophy-showcase-icon'), 'Showcase style is missing');
assert(css.includes('.moon-theme,.severna-theme) #riznica-screen'), 'Mobile card geometry is missing');
console.log('PASS: 26 unique Severna Maglina trophies are linked at card, popup and showcase consumers.');


