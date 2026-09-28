const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const www = path.join(root, 'www');
const indexSource = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
const gameSource = fs.readFileSync(path.join(www, 'game.js'), 'utf8');
const dailyChallengeSource = fs.readFileSync(path.join(www, 'dnevniizazov.js'), 'utf8');
const languagesSource = fs.readFileSync(path.join(www, 'languages.js'), 'utf8');
const managersSource = fs.readFileSync(path.join(www, 'managers.js'), 'utf8');
const rulesSource = fs.readFileSync(path.join(www, 'pravilaigre.js'), 'utf8');
const greenAssetRegistryPath = path.join(www, 'themes', 'green', 'asset-registry.json');
const greenAssetRegistry = JSON.parse(fs.readFileSync(greenAssetRegistryPath, 'utf8'));
const greenAssetFamilies = Object.entries(greenAssetRegistry.families || {});
const greenDucatRegistry = greenAssetRegistry.families?.ducat;
const greenUndoTokenRegistry = greenAssetRegistry.families?.undoToken;
const greenRewardedVideoRegistry = greenAssetRegistry.families?.rewardedVideo;
const greenRewardedVideoManifestPath = path.join(root, greenRewardedVideoRegistry.sourceManifest);
const greenRewardedVideoManifest = JSON.parse(fs.readFileSync(greenRewardedVideoManifestPath, 'utf8'));

const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};

const walkPngs = directory => {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return walkPngs(fullPath);
        return entry.isFile() && entry.name.toLowerCase().endsWith('.png') ? [fullPath] : [];
    });
};

const readPngInfo = filePath => {
    const buffer = fs.readFileSync(filePath);
    assert(buffer.length >= 26 && buffer.toString('ascii', 1, 4) === 'PNG', `Neispravan PNG: ${filePath}`);
    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
        colorType: buffer[25]
    };
};
const sha256File = filePath => crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

assert(greenDucatRegistry?.status === 'locked', 'Green dukat porodica mora biti zaključana u centralnom registru.');
assert(greenUndoTokenRegistry?.status === 'locked', 'Green Undo-token porodica mora biti zaključana u centralnom registru.');
assert(greenRewardedVideoRegistry?.status === 'locked', 'Green Rewarded Video porodica mora biti zaključana u centralnom registru.');
assert(greenRewardedVideoManifest.status === 'locked', 'Green Rewarded Video source manifest mora biti zaključan.');
const registeredGreenDucatAssets = [
    ...greenDucatRegistry.canonicalRuntime,
    ...greenDucatRegistry.compositeRuntime
];
const greenDucatAssetByRole = role => {
    const asset = registeredGreenDucatAssets.find(candidate => candidate.role === role);
    assert(asset, `Nedostaje Green dukat registry uloga: ${role}`);
    return asset;
};
const greenUndoTokenAssetByRole = role => {
    const asset = greenUndoTokenRegistry.canonicalRuntime.find(candidate => candidate.role === role);
    assert(asset, `Nedostaje Green Undo-token registry uloga: ${role}`);
    return asset;
};
const greenRewardedVideoAssetByRole = role => {
    const asset = greenRewardedVideoRegistry.canonicalRuntime.find(candidate => candidate.role === role);
    assert(asset, `Nedostaje Green Rewarded Video registry uloga: ${role}`);
    return asset;
};
const greenRewardedVideoCompositeByRole = role => {
    const asset = greenRewardedVideoRegistry.compositeRuntime.find(candidate => candidate.role === role);
    assert(asset, `Nedostaje Green Rewarded Video kompozitna registry uloga: ${role}`);
    return asset;
};
for (const [role, fileName] of Object.entries(greenRewardedVideoManifest.masters || {})) {
    const master = path.join(path.dirname(greenRewardedVideoManifestPath), fileName);
    assert(fs.existsSync(master), `Nedostaje Green Rewarded Video master (${role}): ${master}`);
    const info = readPngInfo(master);
    assert(info.width === 512 && info.height === 512, `Green Rewarded Video master mora biti 512x512: ${master}`);
    assert([4, 6].includes(info.colorType), `Green Rewarded Video master nema direktan alpha kanal: ${master}`);
    assert(sha256File(master) === greenRewardedVideoManifest.masterSha256?.[role], `Green Rewarded Video master je promenjen: ${master}`);
}

const splashImages = indexSource.match(/<img\b[^>]*id="theme-splash-clay-title"[^>]*>/g) || [];
assert(splashImages.length === 1, 'Mora postojati tačno jedan dinamički theme splash <img>.');
assert(!/<img\b[^>]*src="assets\/(?:easter|desert|green)-soft-clay\/splash-title/gi.test(indexSource), 'Splash teme ne smeju imati statički src u HTML-u.');
assert(gameSource.includes('prepareThemeRoomAssets(roomId'), 'Nedostaje room-on-demand priprema asseta.');
assert(gameSource.includes('installThemeImageHydrationObserver()'), 'Nedostaje observer za naknadno dodate tematske slike.');
assert(!gameSource.includes('const optionalSources = pack.assets'), 'Startup i dalje preuzima ceo opcioni paket teme.');
assert(languagesSource.includes(greenDucatAssetByRole('inline').path.replace(/^assets\//, '')), 'Dinamičke Green poruke ne koriste kanonski dukat.');
assert(managersSource.includes(greenDucatAssetByRole('particle').path.replace(/^assets\//, '')), 'Green efekti ne koriste kanonski particle dukat.');
assert(managersSource.includes('const isDukat = isGreenTheme || roll < 0.78'), 'Green Gold Rain može da meša druge simbole sa dukatima.');

const runtimeJsFiles = fs.readdirSync(www)
    .filter(file => file.endsWith('.js'))
    .map(file => ({ file, source: fs.readFileSync(path.join(www, file), 'utf8') }));
for (const { file, source } of runtimeJsFiles) {
    const directThemeImages = source.match(/<img\b[^>]*\ssrc="assets\/(?:easter|desert|green|severna)-soft-clay\//gi) || [];
    assert(directThemeImages.length === 0, `${file} sadrži direktan src za skrivenu tematsku varijantu.`);
}
const runtimeThemeSource = `${indexSource}\n${runtimeJsFiles.map(({ source }) => source).join('\n')}`;
const undoFrontPath = greenUndoTokenAssetByRole('front').path;
const undoInlinePath = greenUndoTokenAssetByRole('inline').path;
const countOccurrences = (source, needle) => source.split(needle).length - 1;
assert(countOccurrences(indexSource, undoFrontPath) === 2, 'Green Undo front mora biti vezan tačno za zaglavlje i Undo tab.');
assert(countOccurrences(indexSource, undoInlinePath) === 2, 'Green Undo inline mora biti vezan tačno za stanje tokena i +1 nagradu.');
assert(gameSource.includes(undoFrontPath) && gameSource.includes(undoInlinePath), 'Green room-on-demand paket ne priprema obe kanonske Undo izvedenice.');
assert(rulesSource.includes(undoInlinePath), 'Green Pravila ne koriste kanonski inline Undo token.');
assert(gameSource.includes('assets/green-soft-clay/ducats-undo-free-v3.png'), 'Green Economy intro ne koristi odobreni Undo action glyph.');
assert(indexSource.includes('assets/green-soft-clay/runtime/menu/ducats-undo-free-v3.png'), 'Green glavni meni ne koristi optimizovani Undo action glyph.');
assert(gameSource.includes('assets/green-soft-clay/rules/pages/economy-treasury-v3.png') && rulesSource.includes('assets/green-soft-clay/rules/pages/economy-treasury-v3.png'), 'Standardizovana Green Rules kompozicija nije potpuno povezana.');
const gameplayUndoButton = indexSource.match(/<button\b[^>]*id="btn-undo-move"[^>]*>[\s\S]*?<\/button>/i)?.[0] || '';
assert(gameplayUndoButton.includes('↩️'), 'Gameplay Undo dugme je izgubilo svoj funkcionalni action glyph.');
assert(!gameplayUndoButton.includes('canonical/undo-token'), 'Kanonski potrošni Undo token ne sme zameniti gameplay action glyph.');
assert(greenUndoTokenRegistry.semanticExclusions.includes('large Undo action arrow around a dukat'), 'Registar ne razdvaja veliki Undo action glyph od tokena.');
assert(greenUndoTokenRegistry.semanticExclusions.includes('gameplay Undo button'), 'Registar ne razdvaja gameplay Undo dugme od tokena.');
const rewardedVideoActivePath = greenRewardedVideoAssetByRole('active').path;
const rewardedVideoActiveInlinePath = greenRewardedVideoAssetByRole('active-inline').path;
const rewardedVideoUnavailablePath = greenRewardedVideoAssetByRole('unavailable').path;
const rewardedVideoUnavailableInlinePath = greenRewardedVideoAssetByRole('unavailable-inline').path;
const rewardedVideoDailyPath = greenRewardedVideoCompositeByRole('daily-reward').path;
const rewardedVideoTreasuryPath = greenRewardedVideoCompositeByRole('treasury-reward').path;
const rewardedVideoSoloPath = greenRewardedVideoCompositeByRole('solo-double-reward').path;
assert(greenRewardedVideoRegistry.canonicalRuntime.length === 4, 'Green Rewarded Video mora imati tačno četiri kanonske runtime izvedenice.');
assert(new Set(greenRewardedVideoRegistry.canonicalRuntime.map(asset => asset.role)).size === 4, 'Green Rewarded Video kanonske runtime uloge moraju biti jedinstvene.');
assert(greenRewardedVideoRegistry.compositeRuntime.length === 3, 'Green Rewarded Video mora imati tačno tri sobne kompozicije.');
assert(new Set(greenRewardedVideoRegistry.compositeRuntime.map(asset => asset.role)).size === 3, 'Green Rewarded Video sobne uloge moraju biti jedinstvene.');
assert(JSON.stringify(greenRewardedVideoManifest.integration?.roomComposites?.rewardDucatCounts) === JSON.stringify({ daily: 1, treasury: 1, solo: 2 }), 'Green Rewarded Video manifest mora zaključati raspored nagrada 1/1/2.');
assert(countOccurrences(indexSource, rewardedVideoActivePath) === 2, 'Green Economy mora imati tačno dve aktivne Rewarded Video veze.');
assert(countOccurrences(indexSource, rewardedVideoUnavailablePath) === 4, 'Green Economy mora imati tačno četiri unavailable-ad veze.');
assert(countOccurrences(rulesSource, rewardedVideoActiveInlinePath) === 1 && countOccurrences(rulesSource, rewardedVideoUnavailableInlinePath) === 1, 'Green Pravila moraju koristiti tačno po jednu inline Rewarded Video izvedenicu.');
for (const canonicalPath of [rewardedVideoActivePath, rewardedVideoActiveInlinePath, rewardedVideoUnavailablePath, rewardedVideoUnavailableInlinePath]) {
    assert(countOccurrences(gameSource, canonicalPath) === 1, `Green room paket mora pripremiti tačno jednu vezu za ${canonicalPath}.`);
}
assert(countOccurrences(dailyChallengeSource, rewardedVideoDailyPath) === 1, 'Dnevni izazov mora imati tačno jednu Green Rewarded Video kompoziciju.');
assert(countOccurrences(indexSource, rewardedVideoTreasuryPath) === 1, 'Riznica mora imati tačno jednu statičku Green Rewarded Video kompoziciju.');
assert(countOccurrences(managersSource, rewardedVideoTreasuryPath) === 1, 'Dinamička Riznica mora imati tačno jednu Green Rewarded Video kompoziciju.');
assert(countOccurrences(indexSource, rewardedVideoSoloPath) === 1, 'Solo završetak mora imati tačno jednu Green Rewarded Video kompoziciju.');
for (const compositePath of [rewardedVideoDailyPath, rewardedVideoTreasuryPath, rewardedVideoSoloPath]) {
    assert(countOccurrences(gameSource, compositePath) === 1, `Green room-on-demand paket mora pripremiti tačno jednu vezu za ${compositePath}.`);
}
for (const asset of [...greenRewardedVideoRegistry.canonicalRuntime, ...greenRewardedVideoRegistry.compositeRuntime]) {
    assert(/^[a-f0-9]{64}$/.test(asset.sha256 || ''), `Green Rewarded Video asset nema zaključan SHA-256 otisak: ${asset.path}`);
    const file = path.join(www, asset.path);
    assert(sha256File(file) === asset.sha256, `Green Rewarded Video zaključani sadržaj je promenjen: ${asset.path}`);
}
assert(greenRewardedVideoRegistry.semanticExclusions.includes('claim and check actions'), 'Rewarded Video registar ne razdvaja claim/check akcije.');
assert(greenRewardedVideoRegistry.semanticExclusions.includes('daily completed and already-played states'), 'Rewarded Video registar ne razdvaja Daily completed/already-played stanja.');
assert(greenRewardedVideoRegistry.semanticExclusions.includes('ordinary non-reward playback controls'), 'Rewarded Video registar ne razdvaja obične playback kontrole.');
for (const [familyName, family] of greenAssetFamilies) {
    for (const forbiddenPath of family.forbiddenRuntimePaths || []) {
        const sourcePath = forbiddenPath.replace(/^assets\//, '');
        assert(!runtimeThemeSource.includes(sourcePath), `Zabranjeni Green ${familyName} asset je i dalje povezan: ${forbiddenPath}`);
        const forbiddenFile = path.join(www, forbiddenPath);
        assert(!fs.existsSync(forbiddenFile), `Zabranjeni Green runtime asset nije uklonjen: ${forbiddenFile}`);
    }

    const registeredAssets = [...(family.canonicalRuntime || []), ...(family.compositeRuntime || [])];
    for (const { role, path: relative, size: expectedSize } of registeredAssets) {
        const file = path.join(www, relative);
        assert(fs.existsSync(file), `Nedostaje registrovan Green ${familyName} asset (${role}): ${relative}`);
        const info = readPngInfo(file);
        assert(info.width === expectedSize && info.height === expectedSize, `Pogrešna runtime rezolucija za ${relative}.`);
        assert([4, 6].includes(info.colorType), `Registrovan Green ${familyName} asset nema direktan alpha kanal: ${relative}`);
        assert(runtimeThemeSource.includes(relative), `Registrovan Green ${familyName} asset nije povezan u runtime kodu: ${relative}`);
    }
}

const themeDirs = ['easter-soft-clay', 'desert-soft-clay', 'green-soft-clay'];
const report = [];
const startupConfig = {
    'easter-soft-clay': ['assets/easter-neumorphic-bg-v5.png', 'assets/easter-soft-clay/splash-title-soft-clay-v1.png'],
    'desert-soft-clay': ['assets/desert-neumorphic-bg-v1.png', 'assets/desert-soft-clay/splash-title-soft-clay-v1.png'],
    'green-soft-clay': ['assets/green-clay-balkan-diorama-v3.png', 'assets/green-soft-clay/splash-title-soft-clay-v1.png']
};
const roomMatchers = {
    dailyChallenge: relative => relative.startsWith('daily/') || relative.startsWith('daily-challenge'),
    leaderboard: relative => relative.startsWith('leaderboard/') || relative.startsWith('leaderboard-'),
    statistics: relative => relative.startsWith('statistics/') || relative.startsWith('statistics-'),
    settings: relative => relative.startsWith('settings/') || relative.startsWith('settings-'),
    rules: relative => relative.startsWith('rules/') || relative.startsWith('rules-'),
    globalChat: relative => relative.startsWith('global-chat'),
    onlinePlayers: relative => relative.startsWith('online-players') || relative.startsWith('online-add-') || relative.startsWith('online-spectate') || relative.startsWith('online-duel'),
    economy: relative => relative.startsWith('economy/') || relative.startsWith('ducats-undo') || relative.startsWith('canonical/ducat/') || relative.startsWith('canonical/undo-token/') || relative.startsWith('canonical/rewarded-video/'),
    quarterlyLeague: relative => relative.startsWith('ql/') || relative.startsWith('quarterly-league'),
    treasury: (relative, themeDir) => relative.startsWith('treasury/') || relative.startsWith('treasury-') || relative.startsWith('economy/ducat') || relative.startsWith('canonical/ducat/') || (themeDir !== 'green-soft-clay' && relative.includes('rewarded-video')),
    tournament: relative => relative.startsWith('tournament/') || relative.startsWith('tournament-'),
    solo: relative => relative.startsWith('solo/') || relative.startsWith('mode-solo'),
    hotseat: relative => relative.startsWith('hotseat/') || relative.startsWith('mode-hotseat'),
    opponent: relative => relative.startsWith('opponent/') || relative.startsWith('mode-opponent'),
    invite: relative => relative.startsWith('invite/') || relative.startsWith('mode-invite')
};
for (const themeDir of themeDirs) {
    const directory = path.join(www, 'assets', themeDir);
    const files = walkPngs(directory);
    let totalBytes = 0;
    let oversizedRuntimeIcons = 0;
    for (const file of files) {
        const info = readPngInfo(file);
        totalBytes += fs.statSync(file).size;
        const isSplash = path.basename(file) === 'splash-title-soft-clay-v1.png';
        if (!isSplash && Math.max(info.width, info.height) > 768) oversizedRuntimeIcons += 1;
    }
    assert(oversizedRuntimeIcons === 0, `${themeDir} ima ${oversizedRuntimeIcons} runtime ikona većih od 768 px.`);

    const startupFiles = [
        ...walkPngs(path.join(directory, 'runtime', 'menu')),
        ...startupConfig[themeDir].map(relative => path.join(www, relative))
    ];
    let startupBytes = 0;
    let startupDecodedBytes = 0;
    for (const file of startupFiles) {
        assert(fs.existsSync(file), `Nedostaje startup asset: ${file}`);
        const info = readPngInfo(file);
        startupBytes += fs.statSync(file).size;
        startupDecodedBytes += info.width * info.height * 4;
    }
    const roomTotals = Object.entries(roomMatchers).map(([roomId, matcher]) => {
        const roomFiles = files.filter(file => matcher(path.relative(directory, file).replaceAll('\\', '/').toLowerCase(), themeDir));
        return roomFiles.reduce((totals, file) => {
            const info = readPngInfo(file);
            totals.bytes += fs.statSync(file).size;
            totals.decodedBytes += info.width * info.height * 4;
            return totals;
        }, { roomId, files: roomFiles.length, bytes: 0, decodedBytes: 0 });
    });
    const largestRoom = roomTotals.sort((left, right) => right.bytes - left.bytes)[0];
    report.push(`${themeDir}: ${files.length} PNG, ${(totalBytes / 1048576).toFixed(2)} MB ukupno; startup ${startupFiles.length} PNG, ${(startupBytes / 1048576).toFixed(2)} MB / ${(startupDecodedBytes / 1048576).toFixed(2)} MB decoded; najveći room paket ${largestRoom.roomId} ${largestRoom.files} PNG, ${(largestRoom.bytes / 1048576).toFixed(2)} MB / ${(largestRoom.decodedBytes / 1048576).toFixed(2)} MB decoded`);
}

const optimizedMasterDirs = [
    'green-soft-clay-hires',
    'easter-soft-clay-hires',
    'desert-soft-clay-hires'
];
const retiredGreenMasterReplacements = new Map();
for (const [familyName, family] of greenAssetFamilies) {
    for (const [retired, replacement] of Object.entries(family.retiredMasterReplacements || {})) {
        assert(!retiredGreenMasterReplacements.has(retired), `Duplirana Green master zamena (${familyName}): ${retired}`);
        retiredGreenMasterReplacements.set(retired, replacement);
    }
}
for (const masterDir of optimizedMasterDirs) {
    const masterRoot = path.join(root, 'source-assets', masterDir);
    for (const master of walkPngs(masterRoot)) {
        const runtimeTheme = masterDir.replace('-hires', '');
        const masterRelative = path.relative(masterRoot, master).replaceAll('\\', '/');
        if (masterDir === 'green-soft-clay-hires' && retiredGreenMasterReplacements.has(masterRelative)) {
            const replacement = path.join(www, 'assets', runtimeTheme, retiredGreenMasterReplacements.get(masterRelative));
            assert(fs.existsSync(replacement), `Nedostaje standardizovana zamena za stari master: ${replacement}`);
            continue;
        }
        const runtime = path.join(www, 'assets', runtimeTheme, masterRelative);
        assert(fs.existsSync(runtime), `Nedostaje optimizovani runtime PNG: ${runtime}`);
        const runtimeInfo = readPngInfo(runtime);
        assert([4, 6].includes(runtimeInfo.colorType), `Runtime PNG nema direktan alpha kanal: ${runtime}`);
    }
}

console.log('Theme performance provera je prošla.');
report.forEach(line => console.log(`- ${line}`));
