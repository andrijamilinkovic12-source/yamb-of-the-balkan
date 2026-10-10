const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const definitions = read('docs/theme-definitions.json');
const catalog = read('docs/theme-asset-role-catalog.json');
const usage = read('docs/theme-asset-usage-map.json');
const map = read('docs/theme-asset-implementation-map.json');
const contexts = ['collection', 'leaderboard', 'tournament', 'quarterlyLeague', 'powerIndex', 'fireStreak'];
const prefixes = ['collection-medals/collection', 'competition-medals/general-podium',
    'competition-medals/tournament', 'competition-medals/quarterly-league',
    'competition-medals/power-index', 'competition-medals/fire-streak'];
const tiers = ['gold', 'silver', 'bronze'];
const ids = prefixes.flatMap(prefix => tiers.map(tier => `canonical/${prefix}-${tier}-v1`));
const themes = definitions.themes.map(theme => theme.id);
assert.equal(themes.length, 10);
assert.equal(ids.length, 18);
assert.equal(new Set(ids).size, 18);
assert.equal(catalog.requiredPngCountPerTheme, 186);
assert.equal(usage.requiredSlotCount, 186);
assert.equal(map.requiredSlotCountPerTheme, 186);
assert.equal(definitions.assetStandardizationRules.requiredProductionPngCount, 186);
assert(definitions.assetStandardizationRules.medalContract.includes('18 kanonskih PNG medalja'));
const config = fs.readFileSync(path.join(root, 'www/config.js'), 'utf8');
const context = {
    window: { location: { hostname: 'example.com', protocol: 'https:', origin: 'https://example.com' } },
    localStorage: { getItem: () => 'dark' },
    URL,
    console: { log() {} }
};
vm.runInNewContext(config, context);
const resolver = vm.runInNewContext('getThemeMedalSource', context);
const seen = new Map();
for (const theme of themes) {
    const implementation = map.themes.find(item => item.themeId === theme);
    const manifest = read(`source-assets/theme-icon-packs/${theme}/${theme === 'light' ? 'medals-v3-imagegen' : 'medals-v1'}/manifest.json`);
    assert(theme === 'dark' || implementation, `Missing implementation theme ${theme}`);
    assert.equal(manifest.dnaRevision, theme === 'light' ? 3 : 2);
    assert.equal(Object.keys(manifest.slots).length, theme === 'dark' ? 9 : 18);
    for (const artPath of Object.values(manifest.sameThemeArtSources)) {
        assert(artPath.startsWith(theme === 'dark' ? 'www/assets/green-soft-clay/' : `www/assets/theme-packs/${theme}/`));
        assert(fs.existsSync(path.join(root, artPath)));
    }
    for (let index = 0; index < ids.length; index++) {
        const id = ids[index];
        const tier = tiers[index % 3];
        const medalContext = contexts[Math.floor(index / 3)];
        const source = resolver(medalContext, tier, theme);
        assert(source.endsWith(`/${id.replace(/^canonical\//, '')}.png?v=${theme === 'light' ? 3 : 2}`), `${theme}/${id}: wrong source ${source}`);
        const png = path.join(root, 'www', source.split('?')[0]);
        const data = fs.readFileSync(png);
        assert.equal(data.toString('hex', 0, 8), '89504e470d0a1a0a');
        assert.equal(data.readUInt32BE(16), 256);
        assert.equal(data.readUInt32BE(20), 256);
        assert.equal(data[25], 6, `${theme}/${id} must be RGBA`);
        const hash = crypto.createHash('sha256').update(data).digest('hex');
        assert(!seen.has(hash), `Medal PNG reused across roles: ${theme}/${id} = ${seen.get(hash)}`);
        seen.set(hash, `${theme}/${id}`);
        assert(catalog.slots.some(slot => slot.id === id));
        assert(usage.slots.some(slot => slot.slotId === id));
        if (implementation) {
            const slot = implementation.slots[id];
            assert.equal(slot.stage, 'linked');
            assert.equal(path.join(root, slot.productionPath), png);
            assert(fs.existsSync(path.join(root, slot.masterPath)));
            assert(Array.isArray(slot.opticalBoundsPx) && slot.opticalBoundsPx.length === 4);
            assert.equal(slot.sizeBytes, data.length);
            const manifestEntry = manifest.slots[`${id.replace(/^canonical\//, '')}.png`];
            assert.equal(manifestEntry.sha256, hash);
            assert(manifestEntry.masterPath.endsWith(theme === 'light' ? '-master-v1.png' : '-master-v2.png'));
        } else if (['tournament', 'power-index', 'fire-streak'].some(part => id.includes(part))) {
            const manifestEntry = manifest.slots[`${id.replace(/^canonical\//, '')}.png`];
            assert.equal(manifestEntry.sha256, hash);
        }
    }
}
for (const [file, expected] of Object.entries({
    'www/toplista.js': "getThemeMedalSource('leaderboard'",
    'www/turnir.js': "getThemeMedalSource('tournament'",
    'www/kvartalnaliga.js': "getThemeMedalSource('quarterlyLeague'",
    'www/powerindex.js': "getThemeMedalSource('powerIndex'",
    'www/vatreniniz.js': "getThemeMedalSource('fireStreak'",
    'www/managers.js': "getThemeMedalSource('collection'",
    'www/pravilaigre.js': "getThemeMedalSource('quarterlyLeague'",
    'www/game.js': "getThemeMedalSource('quarterlyLeague'",
    'www/index.html': 'theme-medals.css?v=1'
})) {
    assert(fs.readFileSync(path.join(root, file), 'utf8').includes(expected), `${file} missing canonical consumer`);
}
console.log('PASS: 180 unique 256px RGBA medal PNGs; 18 roles per theme, six contexts and canonical consumers.');
