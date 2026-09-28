const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const www = path.join(root, 'www');
const indexSource = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
const gameSource = fs.readFileSync(path.join(www, 'game.js'), 'utf8');
const languagesSource = fs.readFileSync(path.join(www, 'languages.js'), 'utf8');
const managersSource = fs.readFileSync(path.join(www, 'managers.js'), 'utf8');

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

const splashImages = indexSource.match(/<img\b[^>]*id="theme-splash-clay-title"[^>]*>/g) || [];
assert(splashImages.length === 1, 'Mora postojati tačno jedan dinamički theme splash <img>.');
assert(!/<img\b[^>]*src="assets\/(?:easter|desert|green)-soft-clay\/splash-title/gi.test(indexSource), 'Splash teme ne smeju imati statički src u HTML-u.');
assert(gameSource.includes('prepareThemeRoomAssets(roomId'), 'Nedostaje room-on-demand priprema asseta.');
assert(gameSource.includes('installThemeImageHydrationObserver()'), 'Nedostaje observer za naknadno dodate tematske slike.');
assert(!gameSource.includes('const optionalSources = pack.assets'), 'Startup i dalje preuzima ceo opcioni paket teme.');
assert(languagesSource.includes('green-soft-clay/canonical/ducat/ducat-inline-v1.png'), 'Dinamičke Green poruke ne koriste kanonski dukat.');
assert(managersSource.includes('green-soft-clay/canonical/ducat/ducat-particle-v1.png'), 'Green efekti ne koriste kanonski particle dukat.');
assert(managersSource.includes('const isDukat = isGreenTheme || roll < 0.78'), 'Green Gold Rain može da meša druge simbole sa dukatima.');

const runtimeJsFiles = fs.readdirSync(www)
    .filter(file => file.endsWith('.js'))
    .map(file => ({ file, source: fs.readFileSync(path.join(www, file), 'utf8') }));
for (const { file, source } of runtimeJsFiles) {
    const directThemeImages = source.match(/<img\b[^>]*\ssrc="assets\/(?:easter|desert|green|severna)-soft-clay\//gi) || [];
    assert(directThemeImages.length === 0, `${file} sadrži direktan src za skrivenu tematsku varijantu.`);
}
const runtimeThemeSource = `${indexSource}\n${runtimeJsFiles.map(({ source }) => source).join('\n')}`;
assert(!runtimeThemeSource.includes('green-soft-clay/economy/ducat-v1.png'), 'Stari Green dukat je i dalje direktno povezan u runtime kodu.');
const retiredGreenCompositionPaths = [
    'green-soft-clay/ducats-undo-free-v2.png',
    'green-soft-clay/ducats-undo-pro-v1.png',
    'green-soft-clay/treasury-free-v2.png',
    'green-soft-clay/daily/reward-video-v1.png',
    'green-soft-clay/treasury/reward-video-v1.png',
    'green-soft-clay/solo/finish-reward-video-v1.png',
    'green-soft-clay/rules/pages/economy-treasury-v1.png'
];
for (const retiredPath of retiredGreenCompositionPaths) {
    assert(!runtimeThemeSource.includes(retiredPath), `Zastarela Green kompozicija je i dalje povezana: ${retiredPath}`);
}
const retiredGreenRuntimeFiles = [
    ...retiredGreenCompositionPaths.map(relative => path.join(www, 'assets', relative)),
    path.join(www, 'assets/green-soft-clay/runtime/menu/ducats-undo-free-v2.png'),
    path.join(www, 'assets/green-soft-clay/runtime/menu/treasury-free-v2.png')
];
for (const retiredFile of retiredGreenRuntimeFiles) {
    assert(!fs.existsSync(retiredFile), `Zastarela Green runtime kopija nije uklonjena: ${retiredFile}`);
}

const standardizedGreenCompositions = {
    'assets/green-soft-clay/ducats-undo-free-v3.png': 512,
    'assets/green-soft-clay/ducats-undo-pro-v2.png': 512,
    'assets/green-soft-clay/treasury-free-v3.png': 512,
    'assets/green-soft-clay/daily/reward-video-v2.png': 384,
    'assets/green-soft-clay/treasury/reward-video-v2.png': 256,
    'assets/green-soft-clay/solo/finish-reward-video-v2.png': 384,
    'assets/green-soft-clay/rules/pages/economy-treasury-v2.png': 512
};
for (const [relative, expectedSize] of Object.entries(standardizedGreenCompositions)) {
    const file = path.join(www, relative);
    assert(fs.existsSync(file), `Nedostaje standardizovana Green kompozicija: ${relative}`);
    const info = readPngInfo(file);
    assert(info.width === expectedSize && info.height === expectedSize, `Pogrešna runtime rezolucija za ${relative}.`);
    assert([4, 6].includes(info.colorType), `Standardizovana Green kompozicija nema direktan alpha kanal: ${relative}`);
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
    economy: relative => relative.startsWith('economy/') || relative.startsWith('ducats-undo') || relative.startsWith('canonical/ducat/'),
    quarterlyLeague: relative => relative.startsWith('ql/') || relative.startsWith('quarterly-league'),
    treasury: relative => relative.startsWith('treasury/') || relative.startsWith('treasury-') || relative.startsWith('economy/ducat') || relative.startsWith('canonical/ducat/') || relative.includes('rewarded-video'),
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
        const roomFiles = files.filter(file => matcher(path.relative(directory, file).replaceAll('\\', '/').toLowerCase()));
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
const retiredGreenMasterReplacements = new Map([
    ['ducats-undo-free-v2.png', 'ducats-undo-free-v3.png'],
    ['ducats-undo-pro-v1.png', 'ducats-undo-pro-v2.png'],
    ['treasury-free-v2.png', 'treasury-free-v3.png'],
    ['daily/reward-video-v1.png', 'daily/reward-video-v2.png'],
    ['treasury/reward-video-v1.png', 'treasury/reward-video-v2.png'],
    ['solo/finish-reward-video-v1.png', 'solo/finish-reward-video-v2.png']
]);
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
