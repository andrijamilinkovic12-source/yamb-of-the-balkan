const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const definitions = read('docs/theme-definitions.json');
const catalog = read('docs/theme-asset-role-catalog.json');
const map = read('docs/theme-asset-implementation-map.json');
const roles = ['tab-trophies', 'tab-skins', 'tab-effects', 'tab-themes',
    'status-owned', 'status-active', 'status-locked', 'status-insufficient'];
const themes = definitions.themes.map(theme => theme.id);
const config = fs.readFileSync(path.join(root, 'www/config.js'), 'utf8');
const context = {
    window: { location: { hostname: 'example.com', protocol: 'https:', origin: 'https://example.com' } },
    localStorage: { getItem: () => 'dark' },
    URL,
    console: { log() {} }
};
vm.runInNewContext(config, context);
const resolver = vm.runInNewContext('getThemeTreasuryControlSource', context);
const hashes = new Set();
for (const theme of themes) {
    const record = map.themes.find(item => item.themeId === theme);
    const manifest = theme === 'dark' ? null : read(`source-assets/theme-icon-packs/${theme}/treasury-controls-v1/manifest.json`);
    if (manifest) {
        assert.equal(Object.keys(manifest.slots).length, 8);
        assert.equal(manifest.dnaRevision, 4);
        assert.equal(Object.keys(manifest.tabGeneratedSources).length, 4);
        assert.equal(Object.keys(manifest.statusGeneratedSources).length, 4);
        for (const artPath of Object.values(manifest.sameThemeArtSources)) {
            assert(artPath.startsWith(`www/assets/theme-packs/${theme}/`));
            assert(fs.existsSync(path.join(root, artPath)));
        }
    }
    for (const role of roles) {
        const id = `canonical/treasury-controls/${role}-v1`;
        assert(catalog.slots.some(slot => slot.id === id), `Missing catalog slot ${id}`);
        const source = resolver(role, theme);
        const target = path.join(root, 'www', source.split('?')[0]);
        const data = fs.readFileSync(target);
        assert.equal(data.toString('hex', 0, 8), '89504e470d0a1a0a');
        assert.equal(data.readUInt32BE(16), 256);
        assert.equal(data.readUInt32BE(20), 256);
        assert.equal(data[25], 6);
        const hash = crypto.createHash('sha256').update(data).digest('hex');
        assert(!hashes.has(hash), `Reused icon: ${theme}/${role}`);
        hashes.add(hash);
        if (record) {
            const slot = record.slots[id];
            assert.equal(slot.stage, 'linked');
            assert.equal(path.join(root, slot.productionPath), target);
            assert(fs.existsSync(path.join(root, slot.masterPath)));
            assert.equal(slot.sizeBytes, data.length);
            assert.equal(slot.opticalBoundsPx.length, 4);
            assert.equal(manifest.slots[id].sha256, hash);
            assert(manifest.slots[id].masterPath.endsWith(
                role.startsWith('tab-') ? '-master-v3.png' : '-master-v4.png'));
            if (role.startsWith('tab-')) {
                const generated = manifest.slots[id].generatedSourcePath;
                assert(generated.startsWith(`source-assets/theme-icon-packs/${theme}/treasury-tabs-v3/`));
                assert(fs.existsSync(path.join(root, generated)));
                assert.equal(fs.readFileSync(path.join(root, generated)).toString('hex', 0, 8), '89504e470d0a1a0a');
                assert(source.endsWith('?v=3'));
            } else {
                const generated = manifest.slots[id].generatedSourcePath;
                assert(generated.startsWith(`source-assets/theme-icon-packs/${theme}/treasury-status-v4/`));
                assert(fs.existsSync(path.join(root, generated)));
                assert.equal(fs.readFileSync(path.join(root, generated)).toString('hex', 0, 8), '89504e470d0a1a0a');
                assert(source.endsWith('?v=4'));
            }
        }
    }
}
const index = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
const game = fs.readFileSync(path.join(root, 'www/game.js'), 'utf8');
const managers = fs.readFileSync(path.join(root, 'www/managers.js'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'www/pravilaigre.js'), 'utf8');
for (const role of roles.slice(0, 4)) {
    assert(index.includes(`data-treasury-control="${role}"`));
    assert.equal((index.match(new RegExp(`data-treasury-control="${role}"`, 'g')) || []).length, 1);
}
assert(game.includes("document.querySelectorAll('img[data-treasury-control]')"));
assert(game.includes('getThemeTreasuryControlSource(role, theme)'));
assert(managers.includes('getThemeTreasuryControlSource(iconName)'));
assert(managers.includes("getThemeTreasuryControlSource('status-locked')"));
assert(managers.includes("getThemeTreasuryControlSource('status-insufficient')"));
assert(rules.includes('getThemeTreasuryControlSource(treasuryTab[1])'));
assert(index.includes('theme-treasury-controls.css?v=3'));
console.log('PASS: 80 unique 256px RGBA Treasury controls, eight roles per theme; nine target packs linked.');
