const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const source = file => read(file).toString('utf8');
const definition = JSON.parse(source('docs/theme-definitions.json')).diceFaceRules;
const lock = JSON.parse(source('docs/dice-face-corrections.json'));
assert.deepEqual(definition.oppositeFaces, [[1, 6], [2, 5], [3, 4]]);
assert.equal(lock.assets.length, 13);

const config = source('www/config.js');
const game = source('www/game.js');
const rules = source('www/pravilaigre.js');
const registry = JSON.parse(source('www/themes/green/asset-registry.json'));
const corrected = new Set();
for (const asset of lock.assets) {
    const png = read(asset.productionPath);
    assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a', asset.productionPath);
    const size = asset.slot.startsWith('rules/') ? 512 : 256;
    assert.equal(png.readUInt32BE(16), size, asset.productionPath);
    assert.equal(png.readUInt32BE(20), size, asset.productionPath);
    assert.equal(png[25], 6, `${asset.productionPath} needs RGBA`);
    assert.equal(crypto.createHash('sha256').update(png).digest('hex'), asset.sha256,
        `${asset.productionPath} changed after visual dice-face review`);
    if (asset.slot.startsWith('rules/')) {
        assert(game.includes('canonical/rules-page-illustrations/multiplayer-competitions-v1.png?v=2'));
        assert(rules.includes('canonical/rules-page-illustrations/multiplayer-competitions-v1.png?v=2'));
        const entry = registry.families.rulesPageIllustrations.canonicalRuntime
            .find(item => item.role === 'multiplayer-competitions');
        assert.equal(entry.sha256, asset.sha256);
        continue;
    }
    corrected.add(`${asset.themeId}:${asset.slot}`);
    assert.equal(asset.visibleFaces, asset.themeId === 'moon' && asset.slot === 'concrete'
        ? 'not a die' : 'top 1, front 2, right 3');
    if (asset.themeId === 'green') {
        assert(game.includes(`canonical/achievement-trophies/${asset.slot}-v1.png?v=2`));
        const entry = registry.families.achievementTrophies.canonicalRuntime
            .find(item => item.role === asset.slot);
        assert.equal(entry.sha256, asset.sha256);
    }
    if (asset.themeId === 'desert') {
        assert(game.includes(`canonical/achievement-trophies/${asset.slot}-v1.png?v=2`));
    }
}
for (const [theme, slots] of Object.entries({
    desert: ['first_play'], moon: ['concrete', 'first_play', 'godlike'],
    green: ['potato', 'sniper'], light: ['close_call', 'first_play'],
    medium: ['godlike', 'hazard', 'immortal'], neon: ['first_play']
})) {
    for (const slot of slots) assert(corrected.has(`${theme}:${slot}`));
    assert(config.includes(`${theme}: new Set([`), `${theme} cache revision missing`);
}

const css = source('www/style.css');
const expected = {
    1: [[2, 2]],
    2: [[3, 1], [1, 3]],
    3: [[3, 1], [2, 2], [1, 3]],
    4: [[1, 1], [3, 1], [1, 3], [3, 3]],
    5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]],
    6: [[1, 1], [1, 2], [1, 3], [3, 1], [3, 2], [3, 3]]
};
for (const [face, positions] of Object.entries(expected)) {
    positions.forEach(([column, row], index) => {
        const rule = `.val-${face} .dice-dot:nth-child(${index + 1}) { grid-column: ${column}; grid-row: ${row}; }`;
        assert(css.includes(rule), `Invalid CSS pip layout: ${face}/${index + 1}`);
    });
}
for (const file of ['www/game.js', 'www/dnevniizazov.js']) {
    assert(source(file).includes('for (let i = 0; i < val; i++)'), `${file}: pip count changed`);
}
console.log('PASS: standard die rules, CSS/JS pip layouts, 13 reviewed PNGs and active cache revisions.');
