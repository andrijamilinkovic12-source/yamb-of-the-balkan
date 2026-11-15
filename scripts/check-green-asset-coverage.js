const fs = require('fs');
const path = require('path');
const crypto = require('node:crypto');
const pngHash = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');

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
    const leagueIdentity = familyName === 'quarterlyLeagueRoomIdentity'
        ? sourceManifest.themes?.find(theme => theme.id === 'dark')?.assets.find(asset => asset.role === 'quarterly-league-room')
        : null;
    const locked = familyName === 'quarterlyLeagueRoomIdentity' ? leagueIdentity?.status === 'locked'
        : sourceManifest.status === 'locked' || legacyCanonicalLock;
    assert(locked, `Source manifest porodice ${familyName} nije zaključan.`);
    if (leagueIdentity) {
        const master = path.join(root, leagueIdentity.master);
        assert(pngHash(master) === leagueIdentity.masterSha256, 'Green Quarterly League master ne odgovara manifestu.');
        assert(leagueIdentity.production.length === family.canonicalRuntime.length, 'Green Quarterly League mora imati obe kanonske isporuke.');
        for (const asset of family.canonicalRuntime) {
            const production = leagueIdentity.production.find(entry => entry.file === `www/${asset.path}`);
            assert(production?.sha256 === asset.sha256
                && production.size[0] === asset.size && production.size[1] === asset.size,
                `Green Quarterly League PNG i registri se ne poklapaju: ${asset.path}`);
        }
    }

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
            if (asset.sha256) assert(pngHash(runtime) === asset.sha256, `Registrovan Green PNG ima pogrešan SHA-256: ${relative}`);
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

const themeFoundation = new Set(['splash-title-soft-clay-v2.png']);
const historicalGameLogo = new Set(['splash-title-soft-clay-v1.png']);
const historicalLeague = new Set([
    'canonical/quarterly-league-room-identity/quarterly-league-room-v1.png',
    'canonical/quarterly-league-room-identity/quarterly-league-room-menu-v1.png'
]);
const releaseManifests = [
    'theme-daily-buttons-v1', 'theme-leaderboard-medals-v2', 'theme-live-bubbles-v1',
    'theme-live-confetti-v1', 'theme-live-fireflies-v1', 'theme-menu-resume-buttons-v1',
    'theme-online-rematch-v1', 'theme-player-mailbox-v1', 'theme-quality-refresh-v2',
    'theme-solo-record-icons-v1', 'theme-solo-record-panels-v2'
];
const releaseAssets = new Set();
const greenPrefix = 'www/assets/green-soft-clay/';
for (const name of releaseManifests) {
    const release = JSON.parse(fs.readFileSync(path.join(root, 'source-assets', name, 'manifest.json'), 'utf8'));
    for (const file of new Set(collectStrings(release))) {
        if (!file.startsWith(greenPrefix) || !file.endsWith('.png')) continue;
        const relative = file.slice(greenPrefix.length);
        const info = pngInfo(path.join(root, file));
        assert([4, 6].includes(info.colorType), `Green PNG iz manifesta nema direktan alpha kanal: ${file}`);
        if (!registered.has(relative) && !manifestProtected.has(relative)) releaseAssets.add(relative);
    }
}
assert(dailyStatesManifest.status === 'locked', 'Daily States manifest mora imati locked status posle završnog audita.');
assert(leaderboardControlsManifest.status === 'locked', 'Leaderboard Controls manifest mora imati locked status posle završnog audita.');
assert(rulesPageIllustrationsManifest.status === 'locked' && registry.families?.rulesPageIllustrations?.status === 'locked', 'Rules Page Illustrations manifest i registar moraju biti zaključani posle Koraka 4.');
assert(settingsControlsManifest.status === 'locked' && registry.families?.settingsControls?.status === 'locked' && settingsControlsManifest.catalog.length === 8, 'Settings Controls završni audit mora imati osam zaključanih kontrola.');
const stagedCanonical = new Set(['canonical/room-controls/close-v1.png']);
const pendingGroups = {};
const pending = new Map();
for (const [groupName, paths] of Object.entries(pendingGroups)) {
    for (const relative of paths) {
        assert(!pending.has(relative), `PNG je duplo svrstan u pending audit: ${relative}`);
        pending.set(relative, groupName);
    }
}

const greenHeaderPngs = walkFiles(path.join(greenRoot, 'canonical', 'game-header'))
    .filter(file => file.toLowerCase().endsWith('.png'));
assert(greenHeaderPngs.length === 6, `Green funkcionalni paket gornjeg panela mora imati 6 PNG-ova, pronađeno ${greenHeaderPngs.length}.`);
const runtimePngs = walkFiles(greenRoot)
    .filter(file => file.toLowerCase().endsWith('.png'))
    .map(file => slash(path.relative(greenRoot, file)))
    .filter(relative => !relative.startsWith('canonical/treasury-effect-thumbnails/') && !relative.startsWith('canonical/game-header/'))
    .sort();
const classifications = { registered: [], protected: [], foundation: [], historicalLogo: [], historicalLeague: [], release: [], pending: [], stagedCanonical: [] };
for (const relative of runtimePngs) {
    const categories = [
        registered.has(relative) ? 'registered' : null,
        manifestProtected.has(relative) ? 'protected' : null,
        themeFoundation.has(relative) ? 'foundation' : null,
        historicalGameLogo.has(relative) ? 'historicalLogo' : null,
        historicalLeague.has(relative) ? 'historicalLeague' : null,
        releaseAssets.has(relative) ? 'release' : null,
        pending.has(relative) ? 'pending' : null,
        stagedCanonical.has(relative) ? 'stagedCanonical' : null
    ].filter(Boolean);
    assert(categories.length === 1, `Green PNG mora imati tačno jednu coverage kategoriju (${categories.join(', ') || 'nijedna'}): ${relative}`);
    classifications[categories[0]].push(relative);
}

assert(classifications.registered.length === 170, `Očekivano 170 centralno registrovanih PNG-ova, pronađeno ${classifications.registered.length}.`);
assert(classifications.protected.length === 28, `Očekivano 28 manifestom zaštićenih funkcionalnih PNG-ova, pronađeno ${classifications.protected.length}.`);
assert(classifications.foundation.length === 1, `Očekivan je jedan splash foundation PNG, pronađeno ${classifications.foundation.length}.`);
assert(classifications.historicalLogo.length === 1, 'Stari Green logo mora ostati samo istorijski PNG.');
assert(classifications.historicalLeague.length === historicalLeague.size, 'Istorijski Green logotipi Kvartalne lige odstupaju.');
assert(classifications.pending.length === 0, `Nema preostalih pending Green PNG-ova, pronađeno ${classifications.pending.length}.`);
assert(classifications.stagedCanonical.length === 1, `Očekivan je jedan novi kanonski Green close PNG, pronađeno ${classifications.stagedCanonical.length}.`);

const activeBackground = path.join(www, themeManifest.background);
assert(themeManifest.status === 'complete' && themeManifest.version === 63, 'Green theme manifest status ili cache verzija odstupa.');
assert(themeManifest.background === 'assets/green-clay-balkan-diorama-v5.png' && fs.existsSync(activeBackground), 'Aktivna Green pozadina nije v5 runtime.');
const activeBackgroundInfo = pngInfo(activeBackground);
assert(activeBackgroundInfo.width === 941 && activeBackgroundInfo.height === 1672 && activeBackgroundInfo.bytes === 1636760, 'Aktivna Green v5 pozadina ima neočekivane metapodatke.');
assert(themeManifest.foundationManifest === 'source-assets/green-soft-clay-canonical/theme-foundation/manifest.json' && foundationManifest.status === 'locked', 'Green foundation manifest nije povezan ili zaključan.');
assert(foundationManifest.integration?.cacheVersion === 59 && foundationManifest.integration?.finalAudit === 'locked by scripts/check-green-asset-coverage.js', 'Green foundation integracija ili final-audit status odstupa.');
for (const asset of foundationManifest.active) {
    const file = path.join(root, asset.runtime);
    assert(fs.existsSync(file), `Nedostaje aktivan Green foundation asset: ${asset.runtime}`);
    const info = pngInfo(file);
    assert(JSON.stringify([info.width, info.height]) === JSON.stringify(asset.size) && info.bytes === asset.bytes && info.colorType === asset.colorType, `Green foundation metapodaci odstupaju: ${asset.runtime}`);
    assert(pngHash(file) === asset.sha256, `Green foundation SHA-256 odstupa: ${asset.runtime}`);
}
const rollbackBackground = foundationManifest.rollbackBackground;
assert(rollbackBackground?.runtime === 'www/assets/green-clay-balkan-diorama-v4.png', 'Nedostaje povratna Green v4 pozadina.');
const rollbackFile = path.join(root, rollbackBackground.runtime);
assert(fs.existsSync(rollbackFile), 'Povratna Green v4 pozadina nije sačuvana.');
const rollbackInfo = pngInfo(rollbackFile);
assert(JSON.stringify([rollbackInfo.width, rollbackInfo.height]) === JSON.stringify(rollbackBackground.size)
    && rollbackInfo.bytes === rollbackBackground.bytes && rollbackInfo.colorType === rollbackBackground.colorType,
    'Povratna Green v4 pozadina ima neočekivane metapodatke.');
assert(pngHash(rollbackFile) === rollbackBackground.sha256,
    'Povratna Green v4 pozadina je izmenjena.');

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
assert(totalBytes <= 22 * 1024 * 1024 && pendingBytes === 0 && stagedCanonicalBytes > 0,
    `Green coverage inventar prelazi budžet: ${totalBytes} B.`);

console.log('Green asset coverage provera je prošla.');
console.log(`- centralni registar: ${families.length} locked porodica / ${classifications.registered.length} PNG`);
console.log(`- manifestom zaštićena funkcionalna stanja: ${classifications.protected.length} PNG`);
console.log(`- theme foundation: ${classifications.foundation.length} PNG`);
console.log(`- istorijski logo: ${classifications.historicalLogo.length} PNG`);
console.log(`- ukupno provereno: ${runtimePngs.length} PNG / ${totalBytes} B`);
console.log(`- aktuelni dodatni manifesti: ${classifications.release.length} PNG`);
console.log(`- staged canonical: ${classifications.stagedCanonical.length} PNG / ${stagedCanonicalBytes} B`);
console.log(`- sledeće canonical grupe: ${classifications.pending.length} PNG / ${pendingBytes} B`);
for (const [groupName, paths] of Object.entries(pendingGroups)) {
    const bytes = paths.reduce((sum, relative) => sum + fs.statSync(path.join(greenRoot, relative)).size, 0);
    console.log(`  - ${groupName}: ${paths.length} PNG / ${bytes} B`);
}
console.log(`- povučene istorijske pozadine: ${retiredBackgrounds.length} PNG / ${retiredBackgroundBytes} B manje u shipped www stablu`);
