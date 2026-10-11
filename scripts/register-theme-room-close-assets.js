// Register the new close control as one shared semantic PNG slot in every pack.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const role = 'canonical/room-controls/close-v1';
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const write = (file, value) => fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
const catalog = read('docs/theme-asset-role-catalog.json');
const usage = read('docs/theme-asset-usage-map.json');
const implementation = read('docs/theme-asset-implementation-map.json');
const slot = catalog.slots.find(item => item.id === role);
if (!slot || slot.width !== 256 || slot.height !== 256 || slot.colorType !== 6) {
    throw new Error('Close control is missing from the canonical 256px RGBA catalog.');
}

const greenPath = path.join(root, 'www', slot.greenReference);
const greenBytes = fs.statSync(greenPath).size;
const greenManifest = read('source-assets/theme-icon-packs/dark/room-close-v1/manifest.json');
const [left, top, rightExclusive, bottomExclusive] = greenManifest.opticalBoundsPx;
const greenUsage = {
    slotId: role,
    greenReference: slot.greenReference,
    intendedContexts: ['main-menu-rooms', 'shared-room-close', 'tournament', 'treasury', 'quarterly-league', 'rules', 'chat', 'waiting', 'modal'],
    contextEvidence: 'shared CSS consumer and emulator QA',
    staticSourceReferences: ['www/theme-room-close-controls.css:2', 'www/index.html:124', 'www/kvartalnaliga.js:545'],
    runtimeUseVerified: true,
    greenByteSize: greenBytes,
    greenDecodedRgbaBytes: 256 * 256 * 4,
    greenOpticalBoundsPx: {
        left, top, rightExclusive, bottomExclusive,
        widthFraction: (rightExclusive - left) / 256,
        heightFraction: (bottomExclusive - top) / 256,
        centerXFraction: (left + rightExclusive) / 512,
        centerYFraction: (top + bottomExclusive) / 512
    }
};
usage.slots = usage.slots.filter(item => item.slotId !== role);
const usageIndex = usage.slots.findIndex(item => item.slotId > role);
usage.slots.splice(usageIndex < 0 ? usage.slots.length : usageIndex, 0, greenUsage);
usage.requiredSlotCount = catalog.slots.length;
write('docs/theme-asset-usage-map.json', usage);

for (const theme of implementation.themes) {
    const manifest = read(`source-assets/theme-icon-packs/${theme.themeId}/room-close-v1/manifest.json`);
    const productionPath = path.join(root, manifest.productionPath);
    if (!fs.existsSync(productionPath)) throw new Error(`${theme.themeId}: missing close PNG`);
    const entry = {
        stage: 'verified',
        productionPath: manifest.productionPath,
        masterPath: manifest.masterPath,
        consumerRefs: ['www/theme-room-close-controls.css:room-close-image', 'www/index.html:room headers',
            'www/kvartalnaliga.js:league close', 'www/pravilaigre.js:rules close',
            'www/game.js:H2H detail close'],
        opticalBoundsPx: manifest.opticalBoundsPx,
        sizeBytes: fs.statSync(productionPath).size
    };
    const slots = {};
    let inserted = false;
    for (const [id, value] of Object.entries(theme.slots)) {
        if (!inserted && id > role) { slots[role] = entry; inserted = true; }
        if (id !== role) slots[id] = value;
    }
    if (!inserted) slots[role] = entry;
    theme.slots = slots;
}
implementation.requiredSlotCountPerTheme = catalog.slots.length;
write('docs/theme-asset-implementation-map.json', implementation);
console.log(`Registered ${role} in ${catalog.slots.length} slots and ${implementation.themes.length} target themes.`);
