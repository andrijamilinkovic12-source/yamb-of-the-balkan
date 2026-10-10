const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root,
    'source-assets/theme-icon-packs/desert/achievement-trophies-v1/manifest.json'), 'utf8'));
const map = JSON.parse(fs.readFileSync(path.join(root,
    'docs/theme-asset-implementation-map.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root,
    'docs/theme-asset-role-catalog.json'), 'utf8'));
const desert = map.themes.find(theme => theme.themeId === 'desert');
const roles = catalog.slots
    .filter(slot => slot.id.startsWith('canonical/achievement-trophies/'))
    .map(slot => slot.id.split('/').at(-1).replace(/-v1$/, ''));
assert.equal(roles.length, 26);
assert.deepEqual(Object.keys(manifest.slots).sort(), roles.sort());
const configSource = fs.readFileSync(path.join(root, 'www/config.js'), 'utf8');
const gameSource = fs.readFileSync(path.join(root, 'www/game.js'), 'utf8');
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
    const slot = desert.slots[`canonical/achievement-trophies/${id}-v1`];
    assert.equal(slot.stage, 'linked');
    assert.equal(slot.productionPath, entry.productionPath);
    assert.equal(slot.masterPath, entry.masterPath);
    assert(gameSource.includes(`assets/theme-packs/desert/canonical/achievement-trophies/${id}-v1.png?v=${id === 'first_play' ? 2 : 1}`),
        `${id}: asset gallery still misses the canonical Desert PNG`);
}
assert.equal(hashes.size, 26, 'Trophy PNGs must be distinct');
assert(configSource.includes("item.desertIcon = `assets/theme-packs/desert/canonical/achievement-trophies/${item.id}-v1.png?v=${trophyImageVersion('desert', item.id)}`;"),
    'Canonical Desert trophy path is missing from the catalog');
assert(!configSource.includes('assets/desert-soft-clay/treasury/trophies/'),
    'Legacy Desert trophy paths must not remain in the catalog');
assert(!gameSource.includes('assets/desert-soft-clay/treasury/trophies/'),
    'Legacy Desert trophy paths must not remain in the asset gallery');
const consumers = {
    'www/config.js': 'item.desertIcon = ',
    'www/managers.js': 'item?.desertIcon',
    'www/riznica.js': "this.warmTrophyAssets('desert')",
    'www/trophyManager.js': 'trophy.desertIcon',
    'www/game.js': 'trophy.desertIcon',
    'www/index.html': 'theme-achievement-trophies.css'
};
for (const [file, marker] of Object.entries(consumers)) {
    assert(fs.readFileSync(path.join(root, file), 'utf8').includes(marker), `${file}: missing consumer`);
}
console.log('PASS: 26 unique Pustinjsko Staklo trophies are linked at card, popup and showcase consumers.');



