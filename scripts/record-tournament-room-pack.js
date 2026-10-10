const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const theme = process.argv[2];
const includeMedals = process.argv.includes('--include-medals');
const onlyRole = process.argv.find(arg => arg.startsWith('--only-role='))?.slice('--only-role='.length);
if (!theme || !/^[a-z]+$/.test(theme)) {
    throw new Error('Usage: node scripts/record-tournament-room-pack.js <theme-id>');
}

const root = path.resolve(__dirname, '..');
const mapPath = path.join(root, 'docs/theme-asset-implementation-map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const entry = map.themes.find(item => item.themeId === theme);
if (!entry) throw new Error(`Unknown theme: ${theme}`);

let roles = [
    ['tournament-awards', 'finalist-silver', ['www/turnir.js:finalist history and result', 'www/game.js:runner-up reward modal']],
    ['tournament-navigation', 'tab-info', ['www/turnir.js:Info tab']],
    ['tournament-navigation', 'tab-bracket', ['www/turnir.js:Bracket tab']],
    ['tournament-navigation', 'tab-hall-of-fame', ['www/turnir.js:Hall of Fame tab']],
    ['tournament-states', 'state-register', ['www/turnir.js:register action']],
    ['tournament-states', 'state-unregister', ['www/turnir.js:unregister action']],
    ['tournament-states', 'state-registration-locked', ['www/turnir.js:registration unavailable']],
    ['tournament-states', 'state-start', ['www/turnir.js:tournament start']],
    ['tournament-states', 'state-match-active', ['www/turnir.js:start match action']],
    ['tournament-states', 'state-match-complete', ['www/turnir.js:completed match result']]
];
if (includeMedals) {
    for (const tier of ['gold', 'silver', 'bronze']) {
        roles.push(['competition-medals', `tournament-${tier}`,
            ['www/turnir.js:tournament podium', 'www/game.js:tournament room preload']]);
    }
}
if (onlyRole) {
    roles = roles.filter(([, role]) => role === onlyRole);
    if (roles.length !== 1) throw new Error(`Unknown or ambiguous Tournament role: ${onlyRole}`);
}

const toFs = relative => path.join(root, ...relative.split('/'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function assertPng(file, expectedSize) {
    const bytes = fs.readFileSync(file);
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
        || bytes.readUInt32BE(16) !== expectedSize
        || bytes.readUInt32BE(20) !== expectedSize
        || bytes[25] !== 6) {
        throw new Error(`Expected ${expectedSize}x${expectedSize} RGBA PNG: ${file}`);
    }
    return bytes.length;
}

const recorded = [];
for (const [group, role, refs] of roles) {
    const slotId = `canonical/${group}/${role}-v1`;
    const productionPath = `www/assets/theme-packs/${theme}/${slotId}.png`;
    const masterPath = `source-assets/theme-icon-packs/${theme}/tournament-room-v1/${role}-master-v1.png`;
    const productionFile = toFs(productionPath);
    const masterFile = toFs(masterPath);
    assertPng(masterFile, 1254);
    const sizeBytes = assertPng(productionFile, 256);
    const slot = entry.slots[slotId];
    if (!slot) throw new Error(`Missing catalog slot: ${slotId}`);
    Object.assign(slot, {
        stage: 'linked',
        productionPath,
        masterPath,
        consumerRefs: group === 'competition-medals'
            ? refs
            : [...refs, 'www/theme-main-room-icons.js:theme-specific source routing'],
        sizeBytes
    });
    recorded.push({
        id: role,
        group,
        masterPath,
        productionPath,
        masterSha256: hash(masterFile),
        productionSha256: hash(productionFile),
        productionSize: [256, 256]
    });
}

const manifestPath = toFs(`source-assets/theme-icon-packs/${theme}/tournament-room-v1/manifest.json`);
fs.writeFileSync(manifestPath, JSON.stringify({
    schemaVersion: 1,
    themeId: theme,
    status: onlyRole ? 'partially linked; remaining Tournament roles pending' : 'linked; visual review pending',
    generationMethod: includeMedals
        ? 'built-in imagegen; original icon prompts and rank-specific edits of one original tournament medal'
        : 'built-in imagegen; each distinct icon generated or edited for its semantic role',
    productionRule: 'one RGBA PNG per Tournament semantic role; 256x256 runtime; shared Green CSS geometry',
    assets: recorded
}, null, 2) + '\n');
fs.writeFileSync(mapPath, JSON.stringify(map, null, 2) + '\n');
console.log(`Recorded ${recorded.length} Tournament roles for ${theme}.`);
