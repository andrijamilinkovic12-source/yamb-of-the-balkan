const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const registry = JSON.parse(read('docs/theme-canonical-asset-registry.json'));
const outputFile = 'docs/theme-canonical-use-map.json';
const failures = [];
const clean = source => String(source || '').replace(/^www\//, '').split('?')[0];
const info = source => {
    const relative = clean(source);
    const file = path.join(root, 'www', relative);
    if (!fs.existsSync(file)) { failures.push(`Nedostaje: ${relative}`); return null; }
    const bytes = fs.readFileSync(file);
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
        failures.push(`Nije PNG: ${relative}`); return null;
    }
    return {
        file: `www/${relative}`,
        width: bytes.readUInt32BE(16),
        height: bytes.readUInt32BE(20),
        sha256: crypto.createHash('sha256').update(bytes).digest('hex')
    };
};
const eq = (actual, expected, label) => {
    if (clean(actual) !== clean(expected)) failures.push(`${label}: ${clean(actual)} != ${clean(expected)}`);
};
const site = (room, file, marker, meaning) => {
    if (!read(file).includes(marker)) failures.push(`Potrošač nije pronađen: ${file} / ${marker}`);
    return { room, file, marker, meaning };
};

const sharedSites = {
    achievementTrophies: [
        site('Riznica / Trofeji', 'www/managers.js', 'getThemedTrophyCardSource', 'Otključani i zaključani trofeji'),
        site('Obaveštenje o trofeju', 'www/trophyManager.js', 'trophy-popup-icon', 'Nov osvojeni trofej'),
        site('Završni ekran', 'www/game.js', 'trophy-showcase-icon', 'Trofeji osvojeni u partiji')
    ],
    ducat: [
        site('Dukati i Ispravi zadnji upis', 'www/theme-ducat-pack.js', 'ducatSource(theme', 'Valuta i nagrade'),
        site('Riznica', 'www/theme-ducat-pack.js', 'riznica-balance-ducat-icon-green', 'Stanje i nagrada'),
        site('Dnevni izazov', 'www/dnevniizazov.js', "role === 'ducat'", 'Nagrada'),
        site('Statistika', 'www/theme-statistics-room.js', "role === 'ducat'", 'Osvojeni dukati'),
        site('Završni ekrani i obaveštenja', 'www/languages.js', 'dukatIconHtml', 'Iznos nagrade'),
        site('Efekat Zlatna kiša', 'www/managers.js', 'ducat-particle', 'Čestice istog dukata'),
        site('Pravila', 'www/pravilaigre.js', "rulesCanonicalIcon('ducat')", 'Kotizacija i ekonomija')
    ],
    undoToken: [
        site('Dukati i Ispravi zadnji upis', 'www/theme-undo-token-pack.js', 'undo-token-${variant}', 'Broj tokena i nagrada'),
        site('Kontrolni panel partije', 'www/theme-game-header.js', "role === 'undo'", 'Ispravka poslednjeg upisa'),
        site('Pravila', 'www/pravilaigre.js', "rulesCanonicalIcon('undo')", 'Vraćanje upisa')
    ],
    rewardedVideo: [
        site('Dnevni izazov, Riznica i završni ekran', 'www/theme-rewarded-video-pack.js', 'rewarded-video-active', 'Gledanje reklame za nagradu'),
        site('Nedostupna reklama', 'www/theme-rewarded-video-pack.js', 'rewarded-video-unavailable', 'Nedostupno stanje')
    ],
    powerIndex: [
        site('Statistika i rang lista Indeksa moći', 'www/theme-statistics-room.js', "role === 'power-index'", 'Indeks moći takmičara'),
        site('Pozovi prijatelja', 'www/theme-invite-friend-room.js', "role === 'power'", 'Indeks moći prijatelja'),
        site('Turnir / kostur', 'www/turnir.js', 'tourney-participant-power-icon-green', 'Indeks moći učesnika'),
        site('Završni ekran', 'www/theme-solo-results.js', 'powerIndexSource', 'Osvojeni poeni Indeksa moći'),
        site('Pravila', 'www/pravilaigre.js', "rulesCanonicalIcon('powerIndex')", 'Objašnjenje Indeksa moći')
    ],
    fireStreak: [
        site('Statistika', 'www/theme-statistics-room.js', "'fire-streak'", 'Niz pobeda'),
        site('Rang lista Vatrenog niza', 'www/vatreniniz.js', "data-stat-icon=\"fire-streak\"", 'Niz pobeda takmičara'),
        site('Pravila', 'www/pravilaigre.js', "rulesCanonicalIcon('fireStreak')", 'Objašnjenje Vatrenog niza')
    ],
    collectionMedals: [site('Riznica / kolekcija', 'www/managers.js', "getThemeMedalSource('collection'", 'Zbirna medalja u kolekciji; nije medalja takmičenja')],
    roomClose: [site('Sve sobe i pripadajući dijalozi', 'www/theme-room-close-controls.css', '--theme-room-close-image', 'Zatvaranje prikaza')],
    tournamentTrophy: [
        site('Glavni meni i Turnir', 'www/theme-main-room-icons.js', 'champion-trophy', 'Identitet Turnira'),
        site('Kostur i dvorana slavnih', 'www/turnir.js', 'champion-trophy-v1.png', 'Pehar šampiona'),
        site('Proglašenje pobednika', 'www/game.js', 'tournament-final-ceremony-trophy', 'Pehar osvojenog turnira')
    ],
    onlinePlayerActions: [
        site('Online igrači', 'www/theme-online-players-room.js', 'online-players-internal/', 'Pretraga, prijatelj, posmatranje, duel'),
        site('Pozovi prijatelja', 'www/theme-invite-friend-room.js', 'online-players-internal/', 'Ista radnja prijatelja i pretrage'),
        site('Pravila', 'www/pravilaigre.js', 'online-players-internal/', 'Isti motivi radnji uz objašnjenje')
    ],
    settingsAudio: [
        site('Kontrolni panel igre', 'www/theme-game-header.js', 'canonical/game-header/', 'Zvuk, muzika i vibracija'),
        site('Podešavanja', 'www/theme-settings-room.js', 'themeGameHeader.asset(role, theme)', 'Isti PNG za iste kontrole')
    ]
};
const medalSites = {
    'general-podium': [
        site('Top lista', 'www/toplista.js', "getThemeMedalSource('leaderboard'", 'Prvo, drugo ili treće mesto na listi'),
        site('Online Random / pregled protivnika', 'www/game.js', "getThemeMedalSource('leaderboard'", 'Plasman na opštoj listi')
    ],
    tournament: [
        site('Turnir', 'www/turnir.js', "getThemeMedalSource('tournament'", 'Turnirski plasman'),
        site('Turnirski završni ekran', 'www/game.js', "getThemeMedalSource('tournament'", 'Turnirski rezultat')
    ],
    'quarterly-league': [
        site('Kvartalna liga', 'www/kvartalnaliga.js', "getThemeMedalSource('quarterlyLeague'", 'Plasman u kvartalnoj ligi'),
        site('Proglašenje kvartala', 'www/game.js', "getThemeMedalSource('quarterlyLeague'", 'Nagrada kvartalne lige'),
        site('Pravila', 'www/pravilaigre.js', "getThemeMedalSource('quarterlyLeague'", 'Nagrade za prva tri mesta')
    ],
    'power-index': [site('Rang lista Indeksa moći', 'www/powerindex.js', "getThemeMedalSource('powerIndex'", 'Prva tri mesta Indeksa moći')],
    'fire-streak': [site('Rang lista Vatrenog niza', 'www/vatreniniz.js', "getThemeMedalSource('fireStreak'", 'Prva tri mesta Vatrenog niza')]
};
const tiers = { gold: 'prvo mesto / zlato', silver: 'drugo mesto / srebro', bronze: 'treće mesto / bronza' };
const competitions = {
    'general-podium': 'opšta Top lista',
    tournament: 'Turnir',
    'quarterly-league': 'Kvartalna liga',
    'power-index': 'Indeks moći',
    'fire-streak': 'Vatreni niz'
};

const context = {
    window: { location: { hostname: 'localhost', protocol: 'file:', origin: 'null' } },
    document: { readyState: 'loading', addEventListener() {}, documentElement: { dataset: { splashTheme: 'dark' } }, body: { classList: { contains() { return false; } } } },
    localStorage: { getItem() { return 'dark'; } },
    URL, console: { log() {} }, setTimeout() {}
};
vm.createContext(context);
for (const file of ['www/config.js', 'www/languages.js', 'www/pravilaigre.js', 'www/theme-statistics-room.js',
    'www/theme-game-header.js', 'www/theme-settings-room.js', 'www/theme-online-players-room.js',
    'www/theme-invite-friend-room.js', 'www/theme-solo-results.js']) vm.runInContext(read(file), context, { filename: file });
const trophyData = vm.runInContext('SHOP_DATA.TROPHIES.map(({id,title,desc})=>({id,title,desc}))', context);
const trophyById = new Map(trophyData.map(item => [item.id, item]));
const rulesSource = vm.runInContext('rulesCanonicalSource', context);
const medalSource = vm.runInContext('getThemeMedalSource', context);
const statsSource = context.window.themeStatisticsRoom.asset;
const gameHeaderSource = context.window.themeGameHeader.asset;
const settingsSource = context.window.themeSettingsRoom.asset;
const onlineSource = context.window.themeOnlinePlayers.asset;
const inviteSource = context.window.themeInviteFriend.asset;
const soloPowerSource = context.window.themeSoloResults.powerIndexSource;
const game = read('www/game.js');
const roomMethod = game.slice(game.indexOf('    getMainRoomPackSource('), game.indexOf('    getOnlineRandomStateSource(')).trim();
const gameRoomSource = vm.runInNewContext(`({ ${roomMethod} }).getMainRoomPackSource`);
const iconModule = read('www/theme-main-room-icons.js');
const iconSourceBody = iconModule.slice(iconModule.indexOf('    const sourceFor ='), iconModule.indexOf('    const currentTheme ='));
const menuRoomSource = vm.runInNewContext(`(() => { ${iconSourceBody} return sourceFor; })()`);

const roomLabels = {
    solo: 'Solo mod', hotseat: 'Dva igrača Hotseat', 'online-random': 'Online Random',
    'invite-friend': 'Pozovi prijatelja', daily: 'Dnevni izazov', 'global-chat': 'Globalni chat',
    leaderboard: 'Top lista', 'online-players': 'Online igrači', 'quarterly-league': 'Kvartalna liga',
    rules: 'Pravila', settings: 'Podešavanja', statistics: 'Statistika', treasury: 'Riznica',
    tournament: 'Turnir', economy: 'Dukati i Ispravi zadnji upis'
};
const greenRoomSource = (role, variant) => {
    const root = 'assets/green-soft-clay/';
    if (role === 'treasury') return `${root}${variant === 'menu' ? 'runtime/menu/' : ''}treasury-free-v3.png`;
    if (role === 'economy') return `${root}${variant === 'menu' ? 'runtime/menu/' : ''}ducats-undo-free-v3.png`;
    if (role === 'tournament') return `${root}canonical/tournament-awards/champion-trophy-v1.png`;
    if (role === 'quarterly-league') return `${root}canonical/quarterly-league-room-identity/quarterly-league-room${variant === 'menu' ? '-menu' : ''}-v2.png`;
    return `${root}canonical/${role}-room-identity/${role}-room${variant === 'menu' ? '-menu' : ''}-v1.png`;
};
const getIdentity = (theme, family, slot) => {
    const entry = theme.identities[family]?.find(item => item.slotId === slot);
    if (!entry?.productionPath || entry.status !== 'file-present') failures.push(`${theme.id}: nema aktivne putanje za ${slot}`);
    return entry;
};
const reviewStatus = 'putanja, PNG format i tematska jedinstvenost provereni; vizuelni DNK u kompozitima zahteva pregled';
const themes = registry.themes.map(theme => {
    const concepts = [];
    const append = (key, label, main, variants, sites, exception = '') => {
        const primary = info(main);
        const technicalVariants = variants.map(item => info(item)).filter(Boolean);
        concepts.push({ key, label, primary, variants: technicalVariants, sites, technicalStatus: 'verified', visualStatus: reviewStatus,
            ...(exception ? { exception } : {}) });
    };
    const slot = (family, suffix) => getIdentity(theme, family, `canonical/${suffix}`).productionPath;
    const ducatPath = name => slot('ducat', `ducat/ducat-${name}-v1`);
    append('ducat', 'Dukat sa pet tačaka; valuta i nagrada', ducatPath('front'),
        ['inline', 'particle', 'angle-left', 'angle-right'].map(ducatPath), sharedSites.ducat,
        'Čestica Zlatne kiše i ugaoni prikazi su izvedenice istog tematskog dukata.');
    const undoPath = name => slot('undoToken', `undo-token/undo-token-${name}-v1`);
    append('undo-token', 'Token za ispravku poslednjeg upisa', undoPath('front'), [undoPath('inline')], sharedSites.undoToken);
    const videoPath = name => slot('rewardedVideo', `rewarded-video/rewarded-video-${name}-v1`);
    append('rewarded-video', 'Video nagrada: dostupno ili nedostupno', videoPath('active'),
        ['active-inline', 'unavailable', 'unavailable-inline'].map(videoPath), sharedSites.rewardedVideo);
    const power = slot('powerIndex', 'statistics-overview/power-index-v1');
    const streak = slot('fireStreak', 'statistics-overview/fire-streak-v1');
    append('power-index', 'Indeks moći i osvojeni poeni tog indeksa', power, [], sharedSites.powerIndex);
    append('fire-streak', 'Vatreni niz uzastopnih pobeda', streak, [], sharedSites.fireStreak);
    for (const tier of Object.keys(tiers)) {
        append(`collection-${tier}`, `Kolekcionarska medalja: ${tiers[tier]}`,
            slot('collectionMedals', `collection-medals/collection-${tier}-v1`), [], sharedSites.collectionMedals,
            'Zbirna medalja Riznice; ne zamenjuje medalju konkretnog takmičenja.');
    }
    for (const [competition, title] of Object.entries(competitions)) for (const tier of Object.keys(tiers)) {
        const medal = slot('competitionMedals', `competition-medals/${competition}-${tier}-v1`);
        const contextName = { 'general-podium': 'leaderboard', tournament: 'tournament',
            'quarterly-league': 'quarterlyLeague', 'power-index': 'powerIndex', 'fire-streak': 'fireStreak' }[competition];
        eq(medalSource(contextName, tier, theme.id), medal, `${theme.id} medalja ${competition}/${tier}`);
        append(`medal-${competition}-${tier}`, `${title}: ${tiers[tier]}`, medal, [], medalSites[competition],
            'Poseban identitet po temi, takmičenju i plasmanu; ne spajati sa drugim takmičenjima.');
    }
    append('close', 'Zatvori sobu ili dijalog', slot('roomClose', 'room-controls/close-v1'), [], sharedSites.roomClose);
    append('tournament-trophy', 'Pehar šampiona Turnira', slot('tournamentTrophy', 'tournament-awards/champion-trophy-v1'), [], sharedSites.tournamentTrophy,
        'Turnirske medalje su zasebni PNG koji nose isti turnirski identitet.');
    for (const role of ['friend', 'search', 'spectate', 'duel']) append(`online-${role}`,
        { friend: 'Dodaj prijatelja', search: 'Pretraži igrača', spectate: 'Gledaj partiju', duel: 'Pozovi na duel' }[role],
        slot('onlinePlayerActions', `online-players-internal/${role}-v1`), [], sharedSites.onlinePlayerActions);
    for (const role of ['sound', 'music', 'vibration']) append(`settings-${role}`,
        { sound: 'Zvuk', music: 'Muzika', vibration: 'Vibracija' }[role],
        slot('settingsAudio', `settings-controls/${role}-v1`), [], sharedSites.settingsAudio);
    for (const item of trophyData) append(`achievement-${item.id}`,
        `${item.title.sr}: ${item.desc.sr}`,
        slot('achievementTrophies', `achievement-trophies/${item.id}-v1`), [], sharedSites.achievementTrophies,
        'Trofej dostignuća je različit od turnirskog pehara i medalje.');
    for (const [role, label] of Object.entries(roomLabels)) {
        const room = theme.id === 'dark' ? greenRoomSource(role, 'room') : gameRoomSource(theme.id, role, 'room');
        const menu = theme.id === 'dark' ? greenRoomSource(role, 'menu') : gameRoomSource(theme.id, role, 'menu');
        if (theme.id !== 'dark') {
            eq(menuRoomSource(theme.id, role, 'room'), room, `${theme.id}/${role} soba`);
            eq(menuRoomSource(theme.id, role, 'menu'), menu, `${theme.id}/${role} meni`);
        }
        append(`room-${role}`, `Identitet sobe: ${label}`, room, [menu], [
            site('Glavni meni', 'www/game.js', 'getMainRoomPackSource', `Kartica ${label}`),
            site('Intro i soba', 'www/theme-main-room-icons.js', 'sourceFor', `Ulazak u ${label}`)
        ], role === 'quarterly-league' ? 'Četiri segmenta označavaju kvartale; aktivni segment se ističe.'
            : ['treasury', 'economy'].includes(role) ? 'Složeni PNG mora sadržati aktivni kanonski dukat/token iste teme.' : '');
    }

    const byKey = new Map(concepts.map(item => [item.key, item]));
    const primary = key => byKey.get(key)?.primary?.file;
    context.document.documentElement.dataset.splashTheme = theme.id;
    const currencyMarkup = vm.runInContext('dukatIconHtml()', context);
    const currencySource = currencyMarkup.match(/(?:src|data-theme-src)="([^"]+)"/)?.[1];
    eq(currencySource, byKey.get('ducat').variants.find(item => item.file.includes('ducat-inline-')).file,
        `${theme.id} dinamički tekst/dukat`);
    eq(rulesSource('ducat', theme.id), byKey.get('ducat').variants.find(item => item.file.includes('ducat-inline-')).file, `${theme.id} Pravila/dukat`);
    eq(rulesSource('economyPage', theme.id), theme.id === 'dark' ? rulesSource('economyPage', theme.id) : primary('ducat'), `${theme.id} Pravila/naslov ekonomije`);
    eq(rulesSource('undo', theme.id), byKey.get('undo-token').variants[0].file, `${theme.id} Pravila/token`);
    eq(rulesSource('powerIndex', theme.id), primary('power-index'), `${theme.id} Pravila/indeks`);
    eq(rulesSource('fireStreak', theme.id), primary('fire-streak'), `${theme.id} Pravila/niz`);
    eq(statsSource('ducat', theme.id), byKey.get('ducat').variants.find(item => item.file.includes('ducat-inline-')).file, `${theme.id} Statistika/dukat`);
    eq(statsSource('power-index', theme.id), primary('power-index'), `${theme.id} Statistika/indeks`);
    eq(statsSource('fire-streak', theme.id), primary('fire-streak'), `${theme.id} Statistika/niz`);
    eq(soloPowerSource(theme.id), primary('power-index'), `${theme.id} završni ekran/indeks`);
    for (const role of ['friend', 'search', 'spectate', 'duel']) {
        eq(onlineSource(role, theme.id), primary(`online-${role}`), `${theme.id} Online igrači/${role}`);
        if (['friend', 'search'].includes(role)) eq(inviteSource(role, theme.id), primary(`online-${role}`), `${theme.id} Pozovi prijatelja/${role}`);
        if (['friend', 'spectate', 'duel'].includes(role)) eq(rulesSource(role === 'friend' ? 'addFriend' : role, theme.id), primary(`online-${role}`), `${theme.id} Pravila/${role}`);
    }
    eq(inviteSource('power', theme.id), primary('power-index'), `${theme.id} Pozovi prijatelja/indeks`);
    for (const role of ['sound', 'music', 'vibration']) {
        eq(gameHeaderSource(role, theme.id), primary(`settings-${role}`), `${theme.id} kontrolni panel/${role}`);
        eq(settingsSource(role, theme.id), primary(`settings-${role}`), `${theme.id} Podešavanja/${role}`);
    }
    const closeCss = read('www/theme-room-close-controls.css');
    if (!closeCss.includes(`url("${clean(primary('close'))}`)) failures.push(`${theme.id}: X nije mapiran u CSS-u`);
    return { id: theme.id, name: theme.name, style: theme.style, direction: theme.direction,
        palette: theme.paletteSource, conceptCount: concepts.length, concepts };
});

const hashes = new Map();
for (const theme of themes) for (const concept of theme.concepts) {
    if (!concept.primary) continue;
    const key = `${concept.key}/${concept.primary.sha256}`;
    if (hashes.has(key)) failures.push(`Isti PNG u dve teme za ${concept.key}: ${hashes.get(key)} i ${theme.id}`);
    hashes.set(key, theme.id);
}
const appFiles = fs.readdirSync(path.join(root, 'www'))
    .filter(file => /\.(?:js|html|css)$/.test(file))
    .map(file => `www/${file}`);
const retiredLiteralPngReferences = appFiles.flatMap(file =>
    [...read(file).matchAll(/assets\/(?:easter|desert|severna)-soft-clay\/[^'"`\s)]+\.png/g)]
        .map(match => ({ file, path: match[0] })));
if (retiredLiteralPngReferences.length) failures.push(`Stare tematske PNG putanje u aktivnom kodu: ${JSON.stringify(retiredLiteralPngReferences)}`);
const obsoleteCurrencySvg = ['www/index.html', 'www/languages.js'].filter(file =>
    /app-icon-(?:dukat|undo-token)|<use\b/.test(read(file)));
if (obsoleteCurrencySvg.length) failures.push(`Stari SVG valute/tokena: ${obsoleteCurrencySvg.join(', ')}`);
const activeInlineSvg = appFiles.flatMap(file =>
    [...read(file).matchAll(/<svg\b/g)].map(match => ({ file, offset: match.index })));
const activeSvgFileReferences = appFiles.flatMap(file =>
    [...read(file).matchAll(/(?:src|href|url\()\s*=?\s*["']?([^"'\s)]+\.svg)/g)]
        .map(match => ({ file, path: match[1] })));
if (activeInlineSvg.some(item => !['www/index.html', 'www/onlinenumber.js'].includes(item.file)) || activeSvgFileReferences.length)
    failures.push(`Aktivni SVG zahteva klasifikaciju: ${JSON.stringify({ activeInlineSvg, activeSvgFileReferences })}`);
const output = {
    schemaVersion: 1,
    generatedOn: registry.updatedOn,
    scope: 'Aktivni ponavljani semantički PNG identiteti u 15 soba i podprikazima; univerzalni skinovi i zajednički efekat Ledeno doba su izuzeti.',
    evidence: 'Putanje, PNG potpisi, dimenzije, SHA-256, kodski potrošači i aktivni resolveri. Vizuelna ocena kompozita zahteva zaseban pregled.',
    themes,
    intentionalExceptions: [
        'Medalje imaju poseban motiv za svako takmičenje i plasman, uključujući kolekcionarsku medalju Riznice.',
        'Univerzalni skinovi kockica prate vlasništvo skina, a ne trenutno izabranu temu.',
        'Ledeno doba ima odobrene zajedničke PNG mastere za svih deset tema.'
    ],
    retiredAssetAudit: {
        scannedAppFiles: appFiles.length,
        retiredLiteralPngReferences,
        obsoleteCurrencySvg,
        activeInlineSvg,
        activeSvgFileReferences,
        intentionalExternalBrandSvg: 'Google znak prijave u www/index.html nije tematski assets',
        cleanupRegexOnly: 'Niz <svg u www/onlinenumber.js je regularni izraz za uklanjanje stare valute, ne prikazani SVG.'
    },
    failures
};
const serialized = JSON.stringify(output, null, 2) + '\n';
if (process.argv.includes('--check')) {
    if (!fs.existsSync(path.join(root, outputFile)) || read(outputFile) !== serialized) failures.push(`${outputFile} nije osvežen`);
} else fs.writeFileSync(path.join(root, outputFile), serialized);
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`PASS: ${themes.length} tema × ${themes[0].conceptCount} identiteta; aktivne putanje i ponovljena upotreba su usklađene.`);
