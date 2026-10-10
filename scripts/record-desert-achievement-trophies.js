const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root,
    'source-assets/theme-icon-packs/desert/achievement-trophies-v1/manifest.json'), 'utf8'));
const mapPath = path.join(root, 'docs/theme-asset-implementation-map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const desert = map.themes.find(theme => theme.themeId === 'desert');
if (!desert) throw new Error('Pustinjsko Staklo missing from implementation map');

for (const [id, entry] of Object.entries(manifest.slots)) {
    const slot = desert.slots[`canonical/achievement-trophies/${id}-v1`];
    if (!slot) throw new Error(`Missing catalog slot for ${id}`);
    slot.stage = 'linked';
    slot.productionPath = entry.productionPath;
    slot.masterPath = entry.masterPath;
    slot.consumerRefs = [
        'www/config.js:TROPHIES desertIcon',
        'www/managers.js:Riznica trophy card',
        'www/trophyManager.js:trophy notification',
        'www/game.js:trophy showcase'
    ];
    slot.opticalBoundsPx = entry.opticalBoundsPx;
    slot.sizeBytes = entry.sizeBytes;
}
fs.writeFileSync(mapPath, JSON.stringify(map, null, 2) + '\n');
console.log(`Recorded ${Object.keys(manifest.slots).length} linked Pustinjsko Staklo trophy slots.`);



