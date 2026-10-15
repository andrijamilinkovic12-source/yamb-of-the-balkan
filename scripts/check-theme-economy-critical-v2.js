const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(read('source-assets/theme-economy-critical-v2/manifest.json'));
const expectedThemes = ['easter', 'desert', 'severna'];
const expectedRoles = ['ducat', 'undo', 'video-active', 'video-unavailable'];
const expectedVariants = { ducat: 5, undo: 2, 'video-active': 2, 'video-unavailable': 2 };
const signatures = new Set();
let productionCount = 0;

assert.deepEqual(manifest.themes.map(theme => theme.id), expectedThemes);
for (const theme of manifest.themes) {
    assert.deepEqual(theme.assets.map(asset => asset.role), expectedRoles);
    for (const asset of theme.assets) {
        const master = read(asset.master);
        assert.equal(sha256(master), asset.masterSha256, `${theme.id}/${asset.role}: master changed`);
        assert(!signatures.has(asset.masterSha256), `${theme.id}/${asset.role}: shared master`);
        signatures.add(asset.masterSha256);
        assert.equal(asset.variants.length, expectedVariants[asset.role]);
        for (const variant of asset.variants) {
            const bytes = read(variant.path);
            assert.equal(sha256(bytes), variant.sha256, `${variant.path}: checksum changed`);
            assert.equal(bytes.toString('ascii', 1, 4), 'PNG', `${variant.path}: not PNG`);
            assert.equal(bytes[25], 6, `${variant.path}: no RGBA alpha`);
            assert.equal(bytes.readUInt32BE(16), variant.size[0], `${variant.path}: width`);
            assert.equal(bytes.readUInt32BE(20), variant.size[1], `${variant.path}: height`);
            assert(variant.path.includes(`/theme-packs/${theme.id}/canonical/`) && variant.path.endsWith('-v2.png'), `${variant.path}: wrong theme or version`);
            productionCount++;
        }
    }
}
assert.equal(productionCount, 33);

const html = read('www/index.html').toString('utf8');
const economy = html.split('<div id="undo-menu-overlay"')[1]?.split('<div id="custom-modal-overlay"')[0];
assert(economy, 'Economy room not found');
assert(!/assets\/(?:easter|desert|severna)-soft-clay\/(?:economy\/|canonical\/ducat\/)/.test(economy), 'Old economy PNG remains in room HTML');

const reports = JSON.parse(read('docs/theme-room-asset-counts.json'));
assert.equal(reports.legacyEconomyReferences.occurrences, 0);
for (const theme of expectedThemes) {
    assert.equal(reports.themes[theme].rooms.economy.pngFiles, 8);
    assert.deepEqual(reports.themes[theme].rooms.economy.missing, []);
}

console.log(`PASS: ${signatures.size} independent masters, ${productionCount} RGBA PNG variants, three economy rooms without old references.`);
