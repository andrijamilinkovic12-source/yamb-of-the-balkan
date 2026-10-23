const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const exists = relative => fs.existsSync(path.join(root, relative));
const sha256 = relative => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');
const definitions = read('docs/theme-definitions.json');
const catalog = read('docs/theme-asset-role-catalog.json');
const implementation = read('docs/theme-asset-implementation-map.json');
const green = read('www/themes/green/asset-registry.json');
const economyRefresh = read('source-assets/theme-economy-critical-v2/manifest.json');
const economyCompositeV4Path = 'source-assets/theme-economy-canonical-v4/manifest.json';
const economyCompositeV4 = read(economyCompositeV4Path);
const leaderboardMedals = read('source-assets/theme-leaderboard-medals-v2/manifest.json');
const quarterlyLeague = read('source-assets/theme-quarterly-league-v2/manifest.json');
const goldRainRefreshPath = 'source-assets/theme-gold-rain-canonical-v2/manifest.json';
const goldRainRefresh = read(goldRainRefreshPath);
const outputPath = 'docs/theme-canonical-asset-registry.json';
const ids = definitions.themes.map(theme => theme.id);
const expectedIds = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) throw new Error('Theme list changed; review registry ownership first');
if (catalog.slots.length !== 191 || implementation.requiredSlotCountPerTheme !== 191) throw new Error('Baseline slot catalog changed');

const slotById = new Map(catalog.slots.map(slot => [slot.id, slot]));
const mapByTheme = new Map(implementation.themes.map(theme => [theme.themeId, theme]));
const refreshByTheme = new Map(economyRefresh.themes.map(theme => [theme.id, theme]));
const economyCompositeV4ByTheme = new Map(economyCompositeV4.themes.map(theme => [theme.id, theme]));
const requiredIdentitySlots = {
    achievementTrophies: catalog.slots.filter(slot => slot.id.startsWith('canonical/achievement-trophies/')).map(slot => slot.id),
    ducat: [
        'canonical/ducat/ducat-front-v1', 'canonical/ducat/ducat-inline-v1',
        'canonical/ducat/ducat-particle-v1', 'canonical/ducat/ducat-angle-left-v1',
        'canonical/ducat/ducat-angle-right-v1'
    ],
    undoToken: ['canonical/undo-token/undo-token-front-v1', 'canonical/undo-token/undo-token-inline-v1'],
    rewardedVideo: [
        'canonical/rewarded-video/rewarded-video-active-v1',
        'canonical/rewarded-video/rewarded-video-active-inline-v1',
        'canonical/rewarded-video/rewarded-video-unavailable-v1',
        'canonical/rewarded-video/rewarded-video-unavailable-inline-v1'
    ],
    powerIndex: ['canonical/statistics-overview/power-index-v1'],
    fireStreak: ['canonical/statistics-overview/fire-streak-v1'],
    collectionMedals: ['gold', 'silver', 'bronze'].map(tier => `canonical/collection-medals/collection-${tier}-v1`),
    competitionMedals: ['general-podium', 'tournament', 'quarterly-league', 'power-index', 'fire-streak']
        .flatMap(competition => ['gold', 'silver', 'bronze'].map(tier => `canonical/competition-medals/${competition}-${tier}-v1`)),
    roomClose: ['canonical/room-controls/close-v1'],
    tournamentTrophy: ['canonical/tournament-awards/champion-trophy-v1'],
    onlinePlayerActions: [
        'canonical/online-players-internal/friend-v1',
        'canonical/online-players-internal/search-v1',
        'canonical/online-players-internal/spectate-v1',
        'canonical/online-players-internal/duel-v1'
    ],
    settingsAudio: [
        'canonical/settings-controls/sound-v1',
        'canonical/settings-controls/music-v1',
        'canonical/settings-controls/vibration-v1'
    ]
};

const contract = {
    owner: 'Svaka tema poseduje svoj originalni vizuelni identitet za istu semanticku ulogu.',
    reuse: 'Unutar teme isti motiv koristi isti kanonski PNG ili tehnicku izvedenicu istog mastera; ne crta se ponovo za drugu sobu.',
    composite: 'Ako je motiv ugradjen u slozeni PNG, kompozicija mora verno pratiti trenutno aktivan kanonski master i verziju.',
    crossTheme: 'Razlicite teme ne dele isti tematski vizuelni master uz puko prebojavanje. Jedinstveni zajednicki efekat Ledeno doba i univerzalni skinovi imaju sopstvene mastere van tematskog paketa.',
    validation: 'Postojanje putanje, dimenzije, SHA i kodski potrosac su tehnicka provera; vizuelnu uskladjenost kompozita treba posebno potvrditi.'
};
const reuseContexts = {
    achievementTrophies: ['Riznica / Trofeji', 'obavestenje o osvojenom trofeju', 'pregled trofeja po zavrsetku partije'],
    ducat: ['glavni meni', 'Riznica', 'Dukati', 'nagrade', 'zavrsni ekrani', 'dinamicke poruke'],
    undoToken: ['Dukati', 'vracanje upisa', 'nagrade', 'dinamicke poruke'],
    rewardedVideo: ['Dnevni izazov', 'Riznica', 'Dukati', 'zavrsni ekrani'],
    powerIndex: ['Statistika', 'Top lista', 'Pozovi prijatelja', 'zavrsni ekrani'],
    fireStreak: ['Vatreni niz', 'statistika', 'medjusobni skor'],
    collectionMedals: ['Riznica', 'zbirka osvojenih medalja'],
    competitionMedals: ['Top lista', 'Turnir', 'Kvartalna liga', 'Power Index', 'Vatreni niz', 'Pravila', 'nagrade'],
    roomClose: ['sobe glavnog menija', 'modalni prikazi'],
    tournamentTrophy: ['Turnir', 'medalje turnira', 'proglasenje pobednika'],
    onlinePlayerActions: ['Online igraci', 'Pozovi prijatelja', 'online duel', 'gledanje partije'],
    settingsAudio: ['Podesavanja', 'kontrolni panel partije']
};

function baselinePath(themeId, slotId) {
    if (themeId === 'dark') {
        const reference = slotById.get(slotId)?.greenReference;
        return reference ? `www/${reference}` : null;
    }
    return mapByTheme.get(themeId)?.slots[slotId]?.productionPath || null;
}

function activeEconomyPath(themeId, slotId) {
    const refresh = refreshByTheme.get(themeId);
    if (!refresh) return null;
    const originalName = slotId.split('/').at(-1);
    const activeName = originalName.replace(/-v1$/, '-v2') + '.png';
    for (const asset of refresh.assets) {
        const variant = asset.variants?.find(item => item.path.endsWith(`/${activeName}`));
        if (variant) return { path: variant.path, masterPath: asset.master, manifest: 'source-assets/theme-economy-critical-v2/manifest.json' };
    }
    return null;
}

function activeMedalPath(themeId, slotId) {
    const name = slotId.split('/').at(-1).replace(/-v1$/, '-v2');
    if (slotId.startsWith('canonical/competition-medals/general-podium-')) {
        const asset = leaderboardMedals.themes.find(theme => theme.id === themeId)?.assets
            .find(item => item.production.endsWith(`/${name}.png`));
        return asset ? { path: asset.production, masterPath: asset.master, manifest: 'source-assets/theme-leaderboard-medals-v2/manifest.json' } : null;
    }
    if (slotId.startsWith('canonical/competition-medals/quarterly-league-')) {
        const asset = quarterlyLeague.themes.find(theme => theme.id === themeId)?.assets
            .find(item => item.production.some(file => file.file.endsWith(`/${name}.png`)));
        const file = asset?.production.find(file => file.file.endsWith(`/${name}.png`));
        return file ? { path: file.file, masterPath: asset.master, manifest: 'source-assets/theme-quarterly-league-v2/manifest.json' } : null;
    }
    return null;
}

function activeStatisticsPath(themeId, slotId) {
    if (themeId === 'dark') return null;
    const overview = new Set(['games', 'wins', 'draws', 'losses', 'average', 'all-time-points', 'fire-streak']);
    const h2h = new Set(['h2h-empty', 'highest-score', 'max-win-margin', 'worst-loss-margin']);
    const overviewRole = slotId.match(/^canonical\/statistics-overview\/([a-z-]+)-v1$/)?.[1];
    const h2hRole = slotId.match(/^canonical\/h2h-statistics\/([a-z-]+)-v1$/)?.[1];
    let path = null;
    if (overview.has(overviewRole)) path = `www/assets/theme-packs/${themeId}/canonical/statistics-overview/${overviewRole}-v2.png`;
    else if (overviewRole === 'record') path = `www/assets/theme-packs/${themeId}/canonical/solo-results/personal-best-v1.png`;
    else if (overviewRole === 'trophies') path = `www/assets/theme-packs/${themeId}/canonical/treasury-controls/tab-trophies-v1.png`;
    else if (h2hRole === 'h2h-identity') path = `www/assets/theme-packs/${themeId}/canonical/statistics-overview/h2h-v2.png`;
    else if (h2h.has(h2hRole)) path = `www/assets/theme-packs/${themeId}/canonical/h2h-statistics/${h2hRole}-v2.png`;
    else if (h2hRole === 'versus') path = `www/assets/theme-packs/${themeId}/canonical/online-random-states/vs-v1.png`;
    if (!path) return null;
    return exists(path) ? { path, manifest: 'source-assets/theme-statistics-overview-v2/manifest.json' } : null;
}

function activeSettingsAudioPath(themeId, slotId) {
    const role = slotId.match(/^canonical\/settings-controls\/(sound|music|vibration)-v1$/)?.[1];
    if (!role) return null;
    const root = themeId === 'dark' ? 'green-soft-clay' : `theme-packs/${themeId}`;
    return {
        path: `www/assets/${root}/canonical/game-header/${role}-v1.png`,
        manifest: 'source-assets/theme-game-header-v1/manifest.json'
    };
}

function activeIdentity(themeId, slotId) {
    const override = activeEconomyPath(themeId, slotId) || activeMedalPath(themeId, slotId)
        || activeStatisticsPath(themeId, slotId) || activeSettingsAudioPath(themeId, slotId);
    const productionPath = override?.path || baselinePath(themeId, slotId);
    if (!productionPath) return { slotId, status: 'defined-without-production-path', productionPath: null };
    if (!exists(productionPath)) throw new Error(`Missing active identity: ${themeId}/${slotId}: ${productionPath}`);
    return {
        slotId,
        status: 'file-present',
        productionPath,
        sha256: sha256(productionPath),
        ...(override ? { supersedes: baselinePath(themeId, slotId), ...(override.masterPath ? { masterPath: override.masterPath } : {}), sourceManifest: override.manifest } : {})
    };
}

const familyCounts = {};
for (const slot of catalog.slots) {
    if (!slot.id.startsWith('canonical/')) continue;
    const family = slot.id.split('/')[1];
    familyCounts[family] = (familyCounts[family] || 0) + 1;
}
const families = Object.entries(familyCounts).sort(([a], [b]) => a.localeCompare(b))
    .map(([id, baselineSlotCount]) => ({ id, baselineSlotCount, source: 'docs/theme-asset-role-catalog.json' }));
const manifestPaths = [...new Set([
    ...[...JSON.stringify(definitions).matchAll(/source-assets\/[A-Za-z0-9_./-]+\/manifest\.json/g)].map(match => match[0]),
    goldRainRefreshPath
])].sort();
const supplementalManifests = manifestPaths.map(manifest => {
    if (!exists(manifest)) throw new Error(`Missing supplemental manifest: ${manifest}`);
    return { path: manifest, sha256: sha256(manifest) };
});

const themes = definitions.themes.map(theme => {
    const themeId = theme.id;
    const slots = themeId === 'dark' ? null : mapByTheme.get(themeId)?.slots;
    if (themeId !== 'dark' && (!slots || Object.keys(slots).length !== 191)) throw new Error(`Missing baseline mapping: ${themeId}`);
    const stages = themeId === 'dark' ? null : { defined: 0, created: 0, linked: 0, verified: 0 };
    let existingBaselinePaths = 0;
    let missingMasters = 0;
    for (const slot of catalog.slots) {
        const productionPath = baselinePath(themeId, slot.id);
        if (productionPath && exists(productionPath)) existingBaselinePaths++;
        if (slots) {
            const entry = slots[slot.id];
            stages[entry.stage]++;
            if (entry.masterPath && !exists(entry.masterPath)) missingMasters++;
        }
    }
    const identities = Object.fromEntries(Object.entries(requiredIdentitySlots).map(([id, slotIds]) =>
        [id, slotIds.map(slotId => activeIdentity(themeId, slotId))]));
    const packRoot = themeId === 'dark' ? 'www/assets/green-soft-clay' : `www/assets/theme-packs/${themeId}`;
    const treasuryMaster = themeId === 'dark' ? 'source-assets/green-soft-clay-hires/treasury-free-v3.png'
        : slots['treasury-free-v3'].masterPath;
    const treasury = {
        dependency: 'ducat',
        menuPath: themeId === 'dark' ? `${packRoot}/runtime/menu/treasury-free-v3.png` : slots['runtime/menu/treasury-free-v3'].productionPath,
        roomPath: themeId === 'dark' ? `${packRoot}/treasury-free-v3.png` : slots['treasury-free-v3'].productionPath,
        masterPath: treasuryMaster,
        visualAudit: ['easter', 'desert', 'severna'].includes(themeId) ? 'reviewed-against-active-v2' : 'prior-review-against-active-v1'
    };
    for (const asset of [treasury.menuPath, treasury.roomPath, treasury.masterPath]) {
        if (!exists(asset)) throw new Error(`Missing treasury dependency file: ${asset}`);
    }
    const economyV4 = economyCompositeV4ByTheme.get(themeId);
    if (economyV4) {
        for (const asset of [economyV4.master, ...economyV4.production]) {
            if (!exists(asset.file) || sha256(asset.file) !== asset.sha256) throw new Error(`Economy v4 provenance mismatch: ${asset.file}`);
        }
        if (economyV4.canonicalDucat !== identities.ducat.find(item => item.slotId === 'canonical/ducat/ducat-front-v1').productionPath) {
            throw new Error(`Economy v4 ducat dependency mismatch: ${themeId}`);
        }
    }
    const economy = {
        dependencies: ['ducat', 'undoToken'],
        menuPath: economyV4 ? economyV4.production.find(asset => asset.size === 384).file
            : themeId === 'dark' ? `${packRoot}/runtime/menu/ducats-undo-free-v3.png` : slots['runtime/menu/ducats-undo-free-v3'].productionPath,
        roomPath: economyV4 ? economyV4.production.find(asset => asset.size === 512).file
            : themeId === 'dark' ? `${packRoot}/ducats-undo-free-v3.png` : slots['ducats-undo-free-v3'].productionPath,
        ...(economyV4 ? { masterPath: economyV4.master.file, supersedes: economyV4.supersedes } : {}),
        visualAudit: economyV4 ? 'reviewed-against-active-canonical-components' : 'pending-against-active-canonical-components'
    };
    for (const asset of [economy.menuPath, economy.roomPath]) {
        if (!exists(asset)) throw new Error(`Missing economy dependency file: ${asset}`);
    }
    const goldRain = {
        dependency: 'ducat',
        runtimeEffectId: 'gold_rain',
        runtimeCoinPath: identities.ducat.find(item => item.slotId === 'canonical/ducat/ducat-particle-v1').productionPath,
        treasuryPreviewPath: goldRainRefresh.themes.find(item => item.id === themeId)?.preview
            || `${packRoot}/canonical/treasury-effect-previews/preview-gold-rain-v1.png`,
        treasuryThumbnailPath: goldRainRefresh.themes.find(item => item.id === themeId)?.thumbnail
            || `${packRoot}/canonical/treasury-effect-thumbnails/preview-gold-rain-v1.png`,
        runtimeConsumers: ['Riznica', 'Dnevni izazov', 'turnirska nagrada', 'zavrsni ekran nakon dupliranja'],
        previewVisualAudit: ['easter', 'desert', 'severna'].includes(themeId)
            ? 'v2-composed-from-active-canonical-ducat-front; reviewed'
            : 'v1-preview-visually-compared-with-active-canonical-ducat-front; reviewed',
        ...(goldRainRefresh.themes.find(item => item.id === themeId)
            ? { sourceManifest: goldRainRefreshPath,
                supersedesPreview: `${packRoot}/canonical/treasury-effect-previews/preview-gold-rain-v1.png`,
                supersedesThumbnail: `${packRoot}/canonical/treasury-effect-thumbnails/preview-gold-rain-v1.png` }
            : {})
    };
    for (const asset of [goldRain.runtimeCoinPath, goldRain.treasuryPreviewPath, goldRain.treasuryThumbnailPath]) {
        if (!asset || !exists(asset)) throw new Error(`Missing Gold Rain dependency file: ${themeId}/${asset}`);
    }
    const goldRainEntry = goldRainRefresh.themes.find(item => item.id === themeId);
    if (goldRainEntry) {
        for (const [asset, expected] of [
            [goldRainEntry.canonicalCoin, goldRainEntry.canonicalCoinSha256],
            [goldRainEntry.master, goldRainEntry.masterSha256],
            [goldRainEntry.preview, goldRainEntry.previewSha256],
            [goldRainEntry.thumbnail, goldRainEntry.thumbnailSha256]
        ]) {
            if (!exists(asset) || sha256(asset) !== expected) throw new Error(`Gold Rain manifest hash mismatch: ${asset}`);
        }
    }
    return {
        id: themeId,
        name: theme.nameSr,
        mainPack: theme.mainPack,
        iconPack: theme.iconPack,
        style: theme.style,
        direction: theme.direction,
        paletteSource: `docs/theme-definitions.json#themes/${themeId}`,
        runtimeRoot: packRoot,
        baseline: {
            requiredSlots: 191,
            canonicalSlots: 169,
            existingPaths: existingBaselinePaths,
            ...(stages ? { stages, missingMasters } : { status: 'green-reference; runtime verification tracked in its family registry' })
        },
        identities,
        composites: { treasury, economy, goldRain }
    };
});
for (const [family, slotIds] of Object.entries(requiredIdentitySlots)) {
    for (const slotId of slotIds) {
        const hashes = new Map();
        for (const theme of themes) {
            const identity = theme.identities[family].find(item => item.slotId === slotId);
            if (!identity?.sha256) continue;
            const previous = hashes.get(identity.sha256);
            if (previous) throw new Error(`Identical cross-theme PNG for ${slotId}: ${previous} and ${theme.id}`);
            hashes.set(identity.sha256, theme.id);
        }
    }
}

const registry = {
    schemaVersion: 1,
    updatedOn: definitions.updatedOn,
    definitionSchemaVersion: definitions.schemaVersion,
    name: 'Kanonski registar asseta po temi',
    description: 'Indeks nad postojecim katalogom, mapom implementacije i manifestima; ne proglasava sve PNG vizuelno odobrenim.',
    contract,
    sourceOfTruth: {
        themeDnaAndPalettes: 'docs/theme-definitions.json',
        baselineRoles: 'docs/theme-asset-role-catalog.json',
        greenFamilies: 'www/themes/green/asset-registry.json',
        nineThemeImplementation: 'docs/theme-asset-implementation-map.json',
        criticalEconomyRefresh: 'source-assets/theme-economy-critical-v2/manifest.json',
        economyCompositeRefresh: economyCompositeV4Path,
        leaderboardMedalsRefresh: 'source-assets/theme-leaderboard-medals-v2/manifest.json',
        quarterlyLeagueRefresh: 'source-assets/theme-quarterly-league-v2/manifest.json',
        goldRainRefresh: goldRainRefreshPath,
        supplementaryPacks: supplementalManifests.length
    },
    sourceSha256: {
        themeDefinitions: sha256('docs/theme-definitions.json'),
        roleCatalog: sha256('docs/theme-asset-role-catalog.json'),
        implementationMap: sha256('docs/theme-asset-implementation-map.json'),
        greenRegistry: sha256('www/themes/green/asset-registry.json'),
        criticalEconomyRefresh: sha256('source-assets/theme-economy-critical-v2/manifest.json'),
        economyCompositeRefresh: sha256(economyCompositeV4Path),
        leaderboardMedalsRefresh: sha256('source-assets/theme-leaderboard-medals-v2/manifest.json'),
        quarterlyLeagueRefresh: sha256('source-assets/theme-quarterly-league-v2/manifest.json'),
        goldRainRefresh: sha256(goldRainRefreshPath)
    },
    baseline: { themes: 10, requiredSlotsPerTheme: 191, canonicalSlotsPerTheme: 169, canonicalFamilies: families.length, greenFamilyRecords: Object.keys(green.families).length },
    families,
    crossRoomReuse: Object.entries(requiredIdentitySlots).map(([id, slots]) => ({ id, slots, contexts: reuseContexts[id] })),
    supplementalManifests,
    themes,
    openVisualAudits: [
        'Ostali kompoziti koji prikazuju dukat (Dukati/Ispravi upis, solo nagrade, drugi efekti i pravila) zahtevaju zasebno vizuelno poredjenje sa aktivnim v2 u Vaskrsnjoj, Pustinjskom Staklu i Severnoj Maglini.',
        'Motiv Vatrenog niza u Statistici, rang listi i Pravilima sada vodi na isti kanonski PNG po temi; vizuelnu uskladjenost sa zavisnim kompozitima proveriti zasebno.',
        'Status linked u mapi nije vizuelna potvrda; samo verified znaci da je ranija provera zabelezena.'
    ]
};
const output = JSON.stringify(registry, null, 2) + '\n';
const check = process.argv.includes('--check');
if (check) {
    if (!exists(outputPath) || fs.readFileSync(path.join(root, outputPath), 'utf8') !== output) {
        console.error(`STALE: ${outputPath}; run node scripts/build-theme-canonical-asset-registry.js`);
        process.exitCode = 1;
    } else console.log(`PASS: ${ids.length} themes, ${families.length} canonical families, ${supplementalManifests.length} supplemental manifests`);
} else {
    fs.writeFileSync(path.join(root, outputPath), output);
    console.log(`WROTE ${outputPath}: ${ids.length} themes, ${families.length} canonical families, ${supplementalManifests.length} supplemental manifests`);
}
