// Build or verify the immutable Green reference slot catalog used by the
// cross-theme design specification. This script never edits Green assets.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const www = path.join(root, 'www');
const greenRoot = path.join(www, 'assets', 'green-soft-clay');
const output = path.join(root, 'docs', 'theme-asset-role-catalog.json');
const background = 'assets/green-clay-balkan-diorama-v4.png';

function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const fullPath = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(fullPath) : entry.name.toLowerCase().endsWith('.png') ? [fullPath] : [];
    });
}

function pngInfo(file) {
    const header = Buffer.alloc(26);
    const fd = fs.openSync(file, 'r');
    try {
        fs.readSync(fd, header, 0, header.length, 0);
    } finally {
        fs.closeSync(fd);
    }
    if (header.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
        throw new Error(`Not a PNG: ${file}`);
    }
    return {
        width: header.readUInt32BE(16),
        height: header.readUInt32BE(20),
        colorType: header[25]
    };
}

const files = walk(greenRoot)
    .map(file => path.relative(greenRoot, file).replaceAll('\\', '/'))
    .filter(relative => relative !== 'splash-title-soft-clay-v1.png') // Retired cloud title, preserved for history.
    .sort();
if (files.length !== 176) throw new Error(`Expected 176 Green pack PNGs, found ${files.length}`);

const slots = [
    {
        id: 'background/main',
        greenReference: background,
        kind: 'background',
        ...pngInfo(path.join(www, background))
    },
    ...files.map(relative => {
        const kind = relative === 'splash-title-soft-clay-v2.png'
            ? 'game-logo'
            : relative.startsWith('runtime/menu/')
                ? 'startup-thumbnail'
                : relative.startsWith('canonical/')
                    ? 'canonical-or-approved-variant'
                    : 'room-or-composite';
        return {
            id: relative === 'splash-title-soft-clay-v2.png' ? 'splash-title-soft-clay-v1' : relative.slice(0, -4),
            greenReference: `assets/green-soft-clay/${relative}`,
            kind,
            ...pngInfo(path.join(greenRoot, relative))
        };
    })
];

const catalog = {
    schemaVersion: 1,
    referenceThemeId: 'dark',
    referenceThemeName: 'Green Room Pack',
    definition: 'One production PNG slot per entry. Other themes create their own original PNG for each corresponding semantic slot; Green paths are references, not path templates or images to recolor.',
    exclusions: ['source masters', 'QA captures', 'retired assets', 'retired Green cloud logo v1', 'legacy fallback Logo_green.png outside the active Green Room Pack'],
    requiredPngCountPerTheme: slots.length,
    greenPackPngCount: files.length,
    slots
};

if (process.argv.includes('--write')) {
    fs.writeFileSync(output, `${JSON.stringify(catalog, null, 2)}\n`);
    process.stdout.write(`Wrote ${slots.length} reference PNG slots to ${path.relative(root, output)}\n`);
} else {
    const existing = JSON.parse(fs.readFileSync(output, 'utf8'));
    if (JSON.stringify(existing) !== JSON.stringify(catalog)) {
        throw new Error('Theme reference catalog no longer matches the untouched Green production PNG inventory.');
    }
    process.stdout.write(`Verified ${slots.length} reference PNG slots.\n`);
}
