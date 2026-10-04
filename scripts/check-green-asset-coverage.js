const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const www = path.join(root, 'www');
const greenRoot = path.join(www, 'assets', 'green-soft-clay');
const registryPath = path.join(www, 'themes', 'green', 'asset-registry.json');
const themeManifestPath = path.join(www, 'themes', 'green', 'manifest.json');
const canonicalSourceRoot = path.join(root, 'source-assets', 'green-soft-clay-canonical');
const foundationManifestPath = path.join(canonicalSourceRoot, 'theme-foundation', 'manifest.json');
const dailyStatesManifestPath = path.join(canonicalSourceRoot, 'daily-states', 'manifest.json');
const leaderboardControlsManifestPath = path.join(canonicalSourceRoot, 'leaderboard-controls', 'manifest.json');
const rulesPageIllustrationsManifestPath = path.join(canonicalSourceRoot, 'rules-page-illustrations', 'manifest.json');
const settingsControlsManifestPath = path.join(canonicalSourceRoot, 'settings-controls', 'manifest.json');

const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};

const slash = value => value.replaceAll('\\', '/');
const walkFiles = directory => {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const fullPath = path.join(directory, entry.name);
        return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
    });
};
const pngInfo = filePath => {
    const buffer = fs.readFileSync(filePath);
    assert(buffer.length >= 26 && buffer.toString('ascii', 1, 4) === 'PNG', `Neispravan PNG: ${filePath}`);
    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
        colorType: buffer[25],
        bytes: buffer.length
    };
};
const collectStrings = (value, found = []) => {
    if (typeof value === 'string') found.push(value);
    else if (Array.isArray(value)) value.forEach(item => collectStrings(item, found));
    else if (value && typeof value === 'object') Object.values(value).forEach(item => collectStrings(item, found));
    return found;
};

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const themeManifest = JSON.parse(fs.readFileSync(themeManifestPath, 'utf8'));
const foundationManifest = JSON.parse(fs.readFileSync(foundationManifestPath, 'utf8'));
const dailyStatesManifest = JSON.parse(fs.readFileSync(dailyStatesManifestPath, 'utf8'));
const leaderboardControlsManifest = JSON.parse(fs.readFileSync(leaderboardControlsManifestPath, 'utf8'));
const rulesPageIllustrationsManifest = JSON.parse(fs.readFileSync(rulesPageIllustrationsManifestPath, 'utf8'));
const settingsControlsManifest = JSON.parse(fs.readFileSync(settingsControlsManifestPath, 'utf8'));
const families = Object.entries(registry.families || {});
assert(registry.schemaVersion === 1 && registry.themeId === 'dark', 'Green centralni registar ima neočekivan schema/theme identitet.');
assert(families.length === 33, `Green centralni registar mora imati 33 porodice, pronađeno ${families.length}.`);

const registered = new Map();
const forbidden = new Map();
const manifestProtected = new Map();
for (const [familyName, family] of families) {
    assert(family.status === 'locked', `Green porodica nije zaključana: ${familyName}`);
    const sourceManifestPath = path.join(root, family.sourceManifest);
    assert(fs.existsSync(sourceManifestPath), `Nedostaje source manifest porodice ${familyName}: ${sourceManifestPath}`);
    const sourceManifest = JSON.parse(fs.readFileSync(sourceManifestPath, 'utf8'));
    const legacyCanonicalLock = ['ducat', 'undoToken'].includes(familyName)
        && sourceManifest.status === 'canonical'
        && sourceManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js';
    assert(sourceManifest.status === 'locked' || legacyCanonicalLock, `Source manifest porodice ${familyName} nije zaključan.`);

    for (const bucket of ['canonicalRuntime', 'compositeRuntime']) {
        for (const asset of family[bucket] || []) {
            assert(asset.path.startsWith('assets/green-soft-clay/'), `Registrovana Green putanja izlazi iz Green runtime prostora: ${asset.path}`);
            const relative = asset.path.slice('assets/green-soft-clay/'.length);
            const runtime = path.join(greenRoot, relative);
            assert(fs.existsSync(runtime), `Nedostaje registrovan Green runtime PNG: ${relative}`);
            const info = pngInfo(runtime);
            const expectedWidth = asset.width || asset.size;
            const expectedHeight = asset.height || asset.size;
            assert(info.width === expectedWidth && info.height === expectedHeight, `Registrovana dimenzija odstupa: ${relative}`);
            assert([4, 6].includes(info.colorType), `Registrovan Green runtime nema direktan alpha kanal: ${relative}`);
            if (!registered.has(relative)) registered.set(relative, []);
            registered.get(relative).push(familyName);
        }
    }

    for (const retiredPath of family.forbiddenRuntimePaths || []) {
        assert(retiredPath.startsWith('assets/green-soft-clay/'), `Zabranjena putanja izlazi iz Green runtime prostora: ${retiredPath}`);
        const relative = retiredPath.slice('assets/green-soft-clay/'.length);
        assert(!fs.existsSync(path.join(greenRoot, relative)), `Vraćena je zabranjena Green runtime putanja: ${relative}`);
        if (!forbidden.has(relative)) forbidden.set(relative, []);
        forbidden.get(relative).push(familyName);
    }

    for (const value of collectStrings(sourceManifest)) {
        const prefix = 'www/assets/green-soft-clay/';
        if (!value.startsWith(prefix) || !value.toLowerCase().endsWith('.png')) continue;
        const relative = value.slice(prefix.length);
        if (registered.has(relative)) continue;
        if (!manifestProtected.has(relative)) manifestProtected.set(relative, []);
        manifestProtected.get(relative).push(familyName);
    }
}

const themeFoundation = new Set(['splash-title-soft-clay-v1.png']);
assert(dailyStatesManifest.status === 'locked', 'Daily States manifest mora imati locked status posle završnog audita.');
assert(leaderboardControlsManifest.status === 'locked', 'Leaderboard Controls manifest mora imati locked status posle završnog audita.');
assert(rulesPageIllustrationsManifest.status === 'locked' && registry.families?.rulesPageIllustrations?.status === 'locked', 'Rules Page Illustrations manifest i registar moraju biti zaključani posle Koraka 4.');
assert(settingsControlsManifest.status === 'locked' && registry.families?.settingsControls?.status === 'locked' && settingsControlsManifest.catalog.length === 8, 'Settings Controls završni audit mora imati osam zaključanih kontrola.');
const stagedCanonical = new Set();
const pendingGroups = {};
const pending = new Map();
for (const [groupName, paths] of Object.entries(pendingGroups)) {
    for (const relative of paths) {
        assert(!pending.has(relative), `PNG je duplo svrstan u pending audit: ${relative}`);
        pending.set(relative, groupName);
    }
}

const runtimePngs = walkFiles(greenRoot)
    .filter(file => file.toLowerCase().endsWith('.png'))
    .map(file => slash(path.relative(greenRoot, file)))
    .sort();
const classifications = { registered: [], protected: [], foundation: [], pending: [], stagedCanonical: [] };
for (const relative of runtimePngs) {
    const categories = [
        registered.has(relative) ? 'registered' : null,
        manifestProtected.has(relative) ? 'protected' : null,
        themeFoundation.has(relative) ? 'foundation' : null,
        pending.has(relative) ? 'pending' : null,
        stagedCanonical.has(relative) ? 'stagedCanonical' : null
    ].filter(Boolean);
    assert(categories.length === 1, `Green PNG mora imati tačno jednu coverage kategoriju (${categories.join(', ') || 'nijedna'}): ${relative}`);
    classifications[categories[0]].push(relative);
}

assert(runtimePngs.length === 176, `Green runtime inventar odstupa: očekivano 176 PNG, pronađeno ${runtimePngs.length}.`);
assert(classifications.registered.length === 159, `Očekivano 159 centralno registrovanih PNG-ova, pronađeno ${classifications.registered.length}.`);
assert(classifications.protected.length === 16, `Očekivano 16 manifestom zaštićenih funkcionalnih PNG-ova, pronađeno ${classifications.protected.length}.`);
assert(classifications.foundation.length === 1, `Očekivan je jedan splash foundation PNG, pronađeno ${classifications.foundation.length}.`);
assert(classifications.pending.length === 0, `Nema preostalih pending Green PNG-ova, pronađeno ${classifications.pending.length}.`);
assert(classifications.stagedCanonical.length === 0, `Nema preostalih staged Green PNG-ova, pronađeno ${classifications.stagedCanonical.length}.`);

const activeBackground = path.join(www, themeManifest.background);
assert(themeManifest.status === 'complete' && themeManifest.version === 63, 'Green theme manifest status ili cache verzija odstupa.');
assert(themeManifest.background === 'assets/green-clay-balkan-diorama-v4.png' && fs.existsSync(activeBackground), 'Aktivna Green pozadina nije v4 runtime.');
const activeBackgroundInfo = pngInfo(activeBackground);
assert(activeBackgroundInfo.width === 941 && activeBackgroundInfo.height === 1672 && activeBackgroundInfo.bytes === 1864586, 'Aktivna Green v4 pozadina ima neočekivane metapodatke.');
assert(themeManifest.foundationManifest === 'source-assets/green-soft-clay-canonical/theme-foundation/manifest.json' && foundationManifest.status === 'locked', 'Green foundation manifest nije povezan ili zaključan.');
assert(foundationManifest.integration?.cacheVersion === 59 && foundationManifest.integration?.finalAudit === 'locked by scripts/check-green-asset-coverage.js', 'Green foundation integracija ili final-audit status odstupa.');
for (const asset of foundationManifest.active) {
    const file = path.join(root, asset.runtime);
    assert(fs.existsSync(file), `Nedostaje aktivan Green foundation asset: ${asset.runtime}`);
    const info = pngInfo(file);
    assert(JSON.stringify([info.width, info.height]) === JSON.stringify(asset.size) && info.bytes === asset.bytes && info.colorType === asset.colorType, `Green foundation metapodaci odstupaju: ${asset.runtime}`);
    const crypto = require('crypto');
    const sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    assert(sha256 === asset.sha256, `Green foundation SHA-256 odstupa: ${asset.runtime}`);
}
const rollbackBackground = foundationManifest.rollbackBackground;
assert(rollbackBackground?.runtime === 'www/assets/green-clay-balkan-diorama-v3.png', 'Nedostaje povratna Green v3 pozadina.');
const rollbackFile = path.join(root, rollbackBackground.runtime);
assert(fs.existsSync(rollbackFile), 'Povratna Green v3 pozadina nije sačuvana.');
const rollbackInfo = pngInfo(rollbackFile);
assert(JSON.stringify([rollbackInfo.width, rollbackInfo.height]) === JSON.stringify(rollbackBackground.size)
    && rollbackInfo.bytes === rollbackBackground.bytes && rollbackInfo.colorType === rollbackBackground.colorType,
    'Povratna Green v3 pozadina ima neočekivane metapodatke.');
assert(require('crypto').createHash('sha256').update(fs.readFileSync(rollbackFile)).digest('hex') === rollbackBackground.sha256,
    'Povratna Green v3 pozadina je izmenjena.');

const retiredBackgrounds = foundationManifest.retiredRuntime;
const productionSource = walkFiles(www)
    .filter(file => /\.(?:js|html|css|json)$/i.test(file))
    .map(file => fs.readFileSync(file, 'utf8'))
    .join('\n');
let retiredBackgroundBytes = 0;
for (const asset of retiredBackgrounds) {
    assert(asset.historicalPath.startsWith('www/assets/'), `Istorijska background putanja izlazi iz shipped prostora: ${asset.historicalPath}`);
    const file = path.join(root, asset.historicalPath);
    assert(!fs.existsSync(file), `Povučena Green pozadina je vraćena u shipped runtime: ${asset.historicalPath}`);
    const runtimeRelative = asset.historicalPath.slice('www/'.length);
    assert(!productionSource.includes(runtimeRelative), `Istorijski Green background ponovo ima produkcionu referencu: ${runtimeRelative}`);
    retiredBackgroundBytes += asset.bytes;
}
assert(retiredBackgrounds.length === 3 && retiredBackgroundBytes === 5350456, `Inventar tri povučene Green pozadine odstupa: ${retiredBackgroundBytes} B.`);

const totalBytes = runtimePngs.reduce((sum, relative) => sum + fs.statSync(path.join(greenRoot, relative)).size, 0);
const pendingBytes = classifications.pending.reduce((sum, relative) => sum + fs.statSync(path.join(greenRoot, relative)).size, 0);
const stagedCanonicalBytes = classifications.stagedCanonical.reduce((sum, relative) => sum + fs.statSync(path.join(greenRoot, relative)).size, 0);
assert(totalBytes === 15959873 && pendingBytes === 0 && stagedCanonicalBytes === 0, 'Green coverage veličine odstupaju od Treasury Effect Previews bilansa.');

console.log('Green asset coverage provera je prošla.');
console.log(`- centralni registar: ${families.length} locked porodica / ${classifications.registered.length} PNG`);
console.log(`- manifestom zaštićena funkcionalna stanja: ${classifications.protected.length} PNG`);
console.log(`- theme foundation: ${classifications.foundation.length} PNG`);
console.log(`- staged canonical: ${classifications.stagedCanonical.length} PNG / ${stagedCanonicalBytes} B`);
console.log(`- sledeće canonical grupe: ${classifications.pending.length} PNG / ${pendingBytes} B`);
for (const [groupName, paths] of Object.entries(pendingGroups)) {
    const bytes = paths.reduce((sum, relative) => sum + fs.statSync(path.join(greenRoot, relative)).size, 0);
    console.log(`  - ${groupName}: ${paths.length} PNG / ${bytes} B`);
}
console.log(`- povučene istorijske pozadine: ${retiredBackgrounds.length} PNG / ${retiredBackgroundBytes} B manje u shipped www stablu`);
