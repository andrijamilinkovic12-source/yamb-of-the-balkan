const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const repo = path.resolve(__dirname, '..');
const themes = ['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const mapPath = path.join(repo, 'docs', 'theme-asset-implementation-map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const role = 'canonical/statistics-overview/power-index-v1';
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const writeJson = (file, data) => fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);

for (const theme of themes) {
    const masterPath = `source-assets/theme-icon-packs/${theme}/tournament-room-v1/power-index-master-v1.png`;
    const productionPath = `www/assets/theme-packs/${theme}/canonical/statistics-overview/power-index-v1.png`;
    const master = path.join(repo, masterPath);
    const production = path.join(repo, productionPath);
    if (!fs.existsSync(master) || !fs.existsSync(production)) throw new Error(`Missing ${theme} Power Index asset`);
    const png = fs.readFileSync(production);
    if (png.toString('hex', 0, 8) !== '89504e470d0a1a0a'
        || png.readUInt32BE(16) !== 256 || png.readUInt32BE(20) !== 256 || png[25] !== 6) {
        throw new Error(`${theme} Power Index must be a 256x256 RGBA PNG`);
    }

    const themeEntry = map.themes.find(item => item.themeId === theme);
    if (!themeEntry?.slots?.[role]) throw new Error(`Missing implementation slot for ${theme}`);
    Object.assign(themeEntry.slots[role], {
        stage: 'linked',
        productionPath,
        masterPath,
        consumerRefs: [
            'www/turnir.js:bracket participant Power Index',
            'www/theme-main-room-icons.js:theme-specific source routing'
        ],
        opticalBoundsPx: null,
        sizeBytes: png.length
    });

    const manifestPath = path.join(repo, 'source-assets', 'theme-icon-packs', theme, 'tournament-room-v1', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const record = {
        id: 'power-index',
        group: 'statistics-overview',
        masterPath,
        productionPath,
        masterSha256: sha256(master),
        productionSha256: sha256(production),
        productionSize: [256, 256]
    };
    const existing = manifest.assets.findIndex(asset => asset.id === record.id && asset.group === record.group);
    if (existing >= 0) manifest.assets[existing] = record;
    else manifest.assets.push(record);
    writeJson(manifestPath, manifest);
}

writeJson(mapPath, map);
const progressPath = path.join(repo, 'docs', 'theme-progress.json');
let progress = fs.readFileSync(progressPath, 'utf8');
const eol = progress.includes('\r\n') ? '\r\n' : '\n';
progress = progress.replace(/"workState": "[^"]*"/, '"workState": "tournament-room-linked-pending-runtime-review"');
progress = progress.replace(/"activeWorkPackage": "[^"]*"/,
    '"activeWorkPackage": "Turnir: svih devet tema ima povezane kanonske PNG uloge, indeks snage i geometriju prema Zelenoj. Uporedni pregled PNG ikona, pehara i medalja je uradjen; vizuelni i funkcionalni prolaz kroz pokrenutu aplikaciju jos ceka."');
let progressIndex = 0;
progress = progress.replace(/"tournament": \{\r?\n          "stage": "(?:defined|linked)",\r?\n          "evidence": \[(?:.|\r|\n)*?\]\r?\n        \}/g, () => {
    const theme = themes[progressIndex++];
    if (!theme) throw new Error('Too many Tournament progress entries');
    const evidence = [
        `source-assets/theme-icon-packs/${theme}/tournament-room-v1/manifest.json`,
        `www/assets/theme-packs/${theme}/canonical/statistics-overview/power-index-v1.png`,
        'docs/tournament-room-parity-audit.md',
        'docs/theme-tournament-final-qa.png'
    ];
    return `"tournament": {${eol}          "stage": "linked",${eol}          "evidence": [${eol}${evidence.map((file, index) => `            "${file}"${index < evidence.length - 1 ? ',' : ''}`).join(eol)}${eol}          ]${eol}        }`;
});
if (progressIndex !== themes.length) throw new Error(`Expected ${themes.length} Tournament progress entries; found ${progressIndex}`);
fs.writeFileSync(progressPath, progress);
console.log('Recorded Power Index PNGs for nine Tournament themes.');
