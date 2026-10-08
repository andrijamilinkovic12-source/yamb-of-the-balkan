const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const themes = ['neon', 'winter', 'easter', 'desert', 'moon'];
const mapPath = path.join(root, 'docs/theme-asset-implementation-map.json');
const reviewPath = path.join(root, 'docs/theme-main-room-icon-review.html');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
let review = fs.readFileSync(reviewPath, 'utf8');

for (const id of themes) {
    const theme = map.themes.find(item => item.themeId === id);
    if (!theme) throw new Error(`Missing theme ${id}`);
    const masterPath = `source-assets/theme-icon-packs/${id}/main-rooms-v1/treasury-master-v2.png`;
    if (!fs.existsSync(path.join(root, masterPath))) throw new Error(`Missing ${masterPath}`);
    for (const slotId of ['runtime/menu/treasury-free-v3', 'treasury-free-v3']) {
        const slot = theme.slots[slotId];
        if (!slot?.productionPath) throw new Error(`Missing ${id}/${slotId}`);
        slot.masterPath = masterPath;
        slot.sizeBytes = fs.statSync(path.join(root, slot.productionPath)).size;
    }
    const before = `../www/assets/theme-packs/${id}/runtime/menu/treasury-free-v3.png"`;
    if (!review.includes(before)) throw new Error(`Review image missing for ${id}`);
    review = review.replace(before, `../www/assets/theme-packs/${id}/runtime/menu/treasury-free-v3.png?v=2"`);
}

fs.writeFileSync(mapPath, JSON.stringify(map, null, 2) + '\n');
fs.writeFileSync(reviewPath, review);
console.log('Recorded five corrected treasury masters, production byte sizes and review cache keys.');
