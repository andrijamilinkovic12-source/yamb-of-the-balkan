const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const www = path.join(root, 'www');
const indexSource = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
const configSource = fs.readFileSync(path.join(www, 'config.js'), 'utf8');
const gameSource = fs.readFileSync(path.join(www, 'game.js'), 'utf8');
const dailyChallengeSource = fs.readFileSync(path.join(www, 'dnevniizazov.js'), 'utf8');
const languagesSource = fs.readFileSync(path.join(www, 'languages.js'), 'utf8');
const managersSource = fs.readFileSync(path.join(www, 'managers.js'), 'utf8');
const rulesSource = fs.readFileSync(path.join(www, 'pravilaigre.js'), 'utf8');
const leaderboardSource = fs.readFileSync(path.join(www, 'toplista.js'), 'utf8');
const tournamentSource = fs.readFileSync(path.join(www, 'turnir.js'), 'utf8');
const powerIndexSource = fs.readFileSync(path.join(www, 'powerindex.js'), 'utf8');
const fireStreakSource = fs.readFileSync(path.join(www, 'vatreniniz.js'), 'utf8');
const quarterlyLeagueSource = fs.readFileSync(path.join(www, 'kvartalnaliga.js'), 'utf8');
const trophyManagerSource = fs.readFileSync(path.join(www, 'trophyManager.js'), 'utf8');
const treasurySource = fs.readFileSync(path.join(www, 'riznica.js'), 'utf8');
const greenAssetRegistryPath = path.join(www, 'themes', 'green', 'asset-registry.json');
const greenAssetRegistry = JSON.parse(fs.readFileSync(greenAssetRegistryPath, 'utf8'));
const greenAssetFamilies = Object.entries(greenAssetRegistry.families || {});
const greenDucatRegistry = greenAssetRegistry.families?.ducat;
const greenUndoTokenRegistry = greenAssetRegistry.families?.undoToken;
const greenRewardedVideoRegistry = greenAssetRegistry.families?.rewardedVideo;
const greenCompetitionMedalsRegistry = greenAssetRegistry.families?.competitionMedals;
const greenCollectionMedalsRegistry = greenAssetRegistry.families?.collectionMedals;
const greenAchievementTrophiesRegistry = greenAssetRegistry.families?.achievementTrophies;
const greenTreasuryControlsRegistry = greenAssetRegistry.families?.treasuryControls;
const greenQuarterlyRankBadgesRegistry = greenAssetRegistry.families?.quarterlyRankBadges;
const greenQuarterlyNavigationRegistry = greenAssetRegistry.families?.quarterlyNavigation;
const greenRewardedVideoManifestPath = path.join(root, greenRewardedVideoRegistry.sourceManifest);
const greenRewardedVideoManifest = JSON.parse(fs.readFileSync(greenRewardedVideoManifestPath, 'utf8'));
const greenCompetitionMedalsManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'competition-medals', 'manifest.json');
const greenCompetitionMedalsManifest = JSON.parse(fs.readFileSync(greenCompetitionMedalsManifestPath, 'utf8'));
const greenCollectionMedalsManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'collection-medals', 'manifest.json');
const greenCollectionMedalsManifest = JSON.parse(fs.readFileSync(greenCollectionMedalsManifestPath, 'utf8'));
const greenAchievementTrophiesManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'achievement-trophies', 'manifest.json');
const greenAchievementTrophiesManifest = JSON.parse(fs.readFileSync(greenAchievementTrophiesManifestPath, 'utf8'));
const greenTreasuryControlsManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'treasury-controls', 'manifest.json');
const greenTreasuryControlsManifest = JSON.parse(fs.readFileSync(greenTreasuryControlsManifestPath, 'utf8'));
const greenQuarterlyRankBadgesManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'quarterly-rank-badges', 'manifest.json');
const greenQuarterlyRankBadgesManifest = JSON.parse(fs.readFileSync(greenQuarterlyRankBadgesManifestPath, 'utf8'));
const greenQuarterlyNavigationManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'quarterly-navigation', 'manifest.json');
const greenQuarterlyNavigationManifest = JSON.parse(fs.readFileSync(greenQuarterlyNavigationManifestPath, 'utf8'));

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
assert(greenCompetitionMedalsRegistry?.status === 'locked', 'Green Competition Medals porodica mora biti zaključana u centralnom registru.');
assert(greenCompetitionMedalsManifest.status === 'locked', 'Green Competition Medals source manifest mora biti zaključan.');
assert(greenCollectionMedalsRegistry?.status === 'locked', 'Green Collection Medals porodica mora biti zaključana u centralnom registru.');
assert(greenCollectionMedalsManifest.status === 'locked', 'Green Collection Medals source manifest mora biti zaključan.');
assert(greenCollectionMedalsManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Collection Medals završna kontrola nije evidentirana u source manifestu.');
assert(greenCollectionMedalsManifest.masters.length === 3 && greenCollectionMedalsManifest.runtime.length === 3, 'Green Collection Medals paket mora imati kompletan gold/silver/bronze trio.');
assert(new Set(greenCollectionMedalsManifest.masters.map(asset => asset.tier)).size === 3, 'Green Collection Medals master nivoi nisu jedinstveni.');
assert(new Set(greenCollectionMedalsManifest.runtime.map(asset => asset.tier)).size === 3, 'Green Collection Medals runtime nivoi nisu jedinstveni.');
for (const masterAsset of greenCollectionMedalsManifest.masters) {
    const master = path.join(path.dirname(greenCollectionMedalsManifestPath), masterAsset.path);
    assert(fs.existsSync(master), `Nedostaje Green Collection medal master: ${master}`);
    const info = readPngInfo(master);
    assert(info.width === info.height && info.width >= 512, `Green Collection medal master nije kvadratan high-resolution PNG: ${master}`);
    assert([4, 6].includes(info.colorType), `Green Collection medal master nema direktan alpha kanal: ${master}`);
    assert(sha256File(master) === masterAsset.sha256, `Green Collection medal master je promenjen: ${master}`);
}
for (const runtimeAsset of greenCollectionMedalsManifest.runtime) {
    const runtime = path.join(root, runtimeAsset.path);
    assert(fs.existsSync(runtime), `Nedostaje Green Collection medal runtime asset: ${runtime}`);
    const info = readPngInfo(runtime);
    assert(info.width === runtimeAsset.size && info.height === runtimeAsset.size, `Pogrešna Green Collection medal runtime rezolucija: ${runtime}`);
    assert([4, 6].includes(info.colorType), `Green Collection medal runtime nema direktan alpha kanal: ${runtime}`);
    assert(sha256File(runtime) === runtimeAsset.sha256, `Green Collection medal runtime sadržaj je promenjen: ${runtime}`);
}
assert(greenAchievementTrophiesRegistry?.status === 'locked', 'Green Achievement Trophies porodica mora biti zaključana u centralnom registru.');
assert(greenAchievementTrophiesManifest.status === 'locked', 'Green Achievement Trophies source manifest mora biti zaključan.');
assert(greenAchievementTrophiesManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Achievement Trophies završna kontrola nije evidentirana u source manifestu.');
assert(greenAchievementTrophiesManifest.catalog.length === 26, 'Green Achievement Trophies paket mora imati tačno 26 trofeja.');
const achievementIds = greenAchievementTrophiesManifest.catalog.map(asset => asset.id);
assert(new Set(achievementIds).size === 26, 'Green Achievement Trophies manifest sadrži duplirane ID-jeve.');
const trophyConfigBlock = configSource.match(/TROPHIES:\s*\[([\s\S]*?)\r?\n\s*\]\r?\n};/)?.[1] || '';
const configuredTrophyIds = [...trophyConfigBlock.matchAll(/\{ id: '([^']+)'/g)].map(match => match[1]);
assert(configuredTrophyIds.length === 26, 'config.js mora imati tačno 26 achievement trofeja.');
assert(JSON.stringify([...achievementIds].sort()) === JSON.stringify([...configuredTrophyIds].sort()), 'Achievement manifest i config.js nemaju isti skup ID-jeva.');
const achievementRuntimeHashes = new Set();
for (const asset of greenAchievementTrophiesManifest.catalog) {
    const master = path.join(path.dirname(greenAchievementTrophiesManifestPath), asset.master);
    const runtime = path.join(root, asset.runtime);
    assert(asset.master === `green-${asset.id}-master-v1.png`, `Green achievement master ime nije izvedeno iz zaključanog ID-ja: ${asset.id}`);
    assert(asset.runtime === `www/assets/green-soft-clay/canonical/achievement-trophies/${asset.id}-v1.png`, `Green achievement runtime putanja nije izvedena iz zaključanog ID-ja: ${asset.id}`);
    assert(typeof asset.role === 'string' && asset.role.length > 0, `Green achievement nema zaključanu semantičku ulogu: ${asset.id}`);
    assert(fs.existsSync(master), `Nedostaje Green achievement master: ${master}`);
    assert(fs.existsSync(runtime), `Nedostaje Green achievement canonical runtime: ${runtime}`);
    const masterInfo = readPngInfo(master);
    const runtimeInfo = readPngInfo(runtime);
    assert(masterInfo.width === 384 && masterInfo.height === 384, `Green achievement master mora biti 384x384: ${master}`);
    assert(runtimeInfo.width === asset.size && runtimeInfo.height === asset.size, `Pogrešna Green achievement runtime rezolucija: ${runtime}`);
    assert([4, 6].includes(masterInfo.colorType) && [4, 6].includes(runtimeInfo.colorType), `Green achievement asset nema direktan alpha kanal: ${asset.id}`);
    assert(/^[a-f0-9]{64}$/.test(asset.masterSha256) && /^[a-f0-9]{64}$/.test(asset.runtimeSha256), `Green achievement nema validne SHA-256 otiske: ${asset.id}`);
    assert(sha256File(master) === asset.masterSha256, `Green achievement master je promenjen: ${master}`);
    assert(sha256File(runtime) === asset.runtimeSha256, `Green achievement canonical runtime je promenjen: ${runtime}`);
    assert(!achievementRuntimeHashes.has(asset.runtimeSha256), `Green achievement runtime sadržaj je dupliran: ${asset.id}`);
    achievementRuntimeHashes.add(asset.runtimeSha256);
}
for (const exclusion of ['Treasury trophies-tab navigation glyph', 'Statistics aggregate trophies counter', 'Tournament winner and ceremony trophies', 'Tournament finalist award', 'General Podium competition medals', 'Quarterly League podium medals', 'Treasury collection medals', 'Quarterly League rank badges and medals-tab glyph']) {
    assert(greenAchievementTrophiesManifest.semanticExclusions.includes(exclusion), `Achievement Trophies manifest ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(greenAchievementTrophiesRegistry.canonicalRuntime.length === 26, 'Green Achievement Trophies registar mora imati tačno 26 canonical runtime asseta.');
assert(new Set(greenAchievementTrophiesRegistry.canonicalRuntime.map(asset => asset.role)).size === 26, 'Green Achievement Trophies registry uloge moraju biti jedinstvene.');
const achievementManifestRuntimePaths = greenAchievementTrophiesManifest.catalog.map(asset => asset.runtime.replace(/^www\//, '')).sort();
const achievementRegistryRuntimePaths = greenAchievementTrophiesRegistry.canonicalRuntime.map(asset => asset.path).sort();
assert(JSON.stringify(achievementManifestRuntimePaths) === JSON.stringify(achievementRegistryRuntimePaths), 'Achievement Trophies manifest i centralni registar nemaju isti runtime katalog.');
assert(greenAchievementTrophiesRegistry.identity?.material === 'matte 3D Soft Clay Neumorphism', 'Achievement Trophies mora zadržati Soft Clay materijal.');
assert(greenAchievementTrophiesRegistry.identity?.palette === 'forest-green, warm-ivory and terracotta clay', 'Achievement Trophies mora zadržati Green paletu.');
assert(greenAchievementTrophiesRegistry.identity?.mapping === 'one immutable PNG identity per achievement ID', 'Achievement Trophies mora zadržati jednoznačno ID-to-PNG mapiranje.');
const achievementBase = 'assets/green-soft-clay/canonical/achievement-trophies/';
assert(configSource.split(achievementBase).length - 1 === 1, 'config.js mora imati tačno jednu dinamičku Green Achievement canonical template vezu.');
for (const manifestAsset of greenAchievementTrophiesManifest.catalog) {
    const asset = greenAchievementTrophiesRegistry.canonicalRuntime.find(candidate => candidate.role === manifestAsset.id);
    assert(asset, `Green Achievement Trophies registry nema zaključanu ulogu: ${manifestAsset.id}`);
    assert(asset.path === manifestAsset.runtime.replace(/^www\//, ''), `Green Achievement registry putanja se ne poklapa sa manifestom: ${manifestAsset.id}`);
    assert(asset.sha256 === manifestAsset.runtimeSha256, `Green Achievement registry hash se ne poklapa sa manifestom: ${manifestAsset.id}`);
    assert(sha256File(path.join(www, asset.path)) === asset.sha256, `Green Achievement Trophies registry otisak se ne poklapa: ${asset.path}`);
    assert(gameSource.split(asset.path).length - 1 === 1, `Green Treasury room-on-demand paket mora imati tačno jednu vezu za ${asset.path}.`);
}
assert(managersSource.split('item?.greenIcon').length - 1 === 1, 'Green Treasury trophy kartice moraju imati tačno jednu zajedničku achievement greenIcon vezu.');
assert(trophyManagerSource.split('trophy.greenIcon').length - 1 === 2, 'Green achievement popup mora imati tačno jednu guard i jednu render greenIcon vezu.');
assert(gameSource.split('trophy.greenIcon').length - 1 === 2, 'Green end-game trophy showcase mora imati tačno jednu guard i jednu render greenIcon vezu.');
assert(treasurySource.split("theme === 'green' ? item?.greenIcon").length - 1 === 1, 'Green Treasury warmup mora imati tačno jednu zajedničku achievement greenIcon vezu.');
assert(greenAchievementTrophiesManifest.integration?.treasuryCards && greenAchievementTrophiesManifest.integration?.unlockPopup === 'connected' && greenAchievementTrophiesManifest.integration?.endGameShowcase === 'connected' && greenAchievementTrophiesManifest.integration?.roomOnDemand === 'connected', 'Green Achievement Trophies integracija nije kompletno evidentirana.');
assert(greenTreasuryControlsRegistry?.status === 'locked', 'Green Treasury Controls porodica mora biti zaključana u centralnom registru.');
assert(greenTreasuryControlsManifest.status === 'locked', 'Green Treasury Controls source manifest mora biti zaključan.');
assert(greenTreasuryControlsManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Treasury Controls završna kontrola nije evidentirana u source manifestu.');
assert(Object.keys(greenTreasuryControlsManifest.subfamilies || {}).sort().join(',') === 'itemStatuses,navigationTabs', 'Green Treasury Controls mora imati tačno navigationTabs i itemStatuses podfamiliju.');
assert(greenTreasuryControlsManifest.subfamilies.navigationTabs.semanticRole === 'select one of the four Treasury content categories', 'Green Treasury navigation semantika je promenjena.');
assert(greenTreasuryControlsManifest.subfamilies.itemStatuses.semanticRole === 'describe the ownership, equipment, requirement or purchase state of one Treasury item', 'Green Treasury status semantika je promenjena.');
const treasuryControlCatalog = Object.values(greenTreasuryControlsManifest.subfamilies).flatMap(subfamily => subfamily.catalog);
assert(treasuryControlCatalog.length === 8, 'Green Treasury Controls paket mora imati tačno osam kontrola.');
assert(new Set(treasuryControlCatalog.map(asset => asset.id)).size === 8, 'Green Treasury Controls manifest sadrži duplirane ID-jeve.');
const expectedTreasuryControlIds = ['status-active', 'status-insufficient', 'status-locked', 'status-owned', 'tab-effects', 'tab-skins', 'tab-themes', 'tab-trophies'];
assert(JSON.stringify(treasuryControlCatalog.map(asset => asset.id).sort()) === JSON.stringify(expectedTreasuryControlIds), 'Green Treasury Controls nema zaključani skup osam semantičkih ID-jeva.');
assert(greenTreasuryControlsManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenTreasuryControlsManifest.identity?.palette === 'forest-green, warm-ivory and terracotta clay' && greenTreasuryControlsManifest.identity?.presentation === 'one centered semantic glyph on transparent background without a backing tile or text', 'Green Treasury Controls vizuelni DNK je promenjen.');
const treasuryControlRuntimeHashes = new Set();
for (const asset of treasuryControlCatalog) {
    const master = path.join(path.dirname(greenTreasuryControlsManifestPath), asset.master);
    const runtime = path.join(root, asset.runtime);
    assert(fs.existsSync(master), `Nedostaje Green Treasury control master: ${master}`);
    assert(fs.existsSync(runtime), `Nedostaje Green Treasury control canonical runtime: ${runtime}`);
    const masterInfo = readPngInfo(master);
    const runtimeInfo = readPngInfo(runtime);
    assert(masterInfo.width === 512 && masterInfo.height === 512, `Green Treasury control master mora biti 512x512: ${master}`);
    assert(runtimeInfo.width === asset.size && runtimeInfo.height === asset.size, `Pogrešna Green Treasury control runtime rezolucija: ${runtime}`);
    assert([4, 6].includes(masterInfo.colorType) && [4, 6].includes(runtimeInfo.colorType), `Green Treasury control nema direktan alpha kanal: ${asset.id}`);
    assert(/^[a-f0-9]{64}$/.test(asset.masterSha256) && /^[a-f0-9]{64}$/.test(asset.runtimeSha256), `Green Treasury control nema validne SHA-256 otiske: ${asset.id}`);
    const subfolder = asset.id.startsWith('tab-') ? 'navigation-tabs' : 'item-statuses';
    assert(asset.master === `${subfolder}/green-${asset.id}-master-v1.png`, `Green Treasury control nema zaključano master ime: ${asset.id}`);
    assert(asset.runtime === `www/assets/green-soft-clay/canonical/treasury-controls/${asset.id}-v1.png`, `Green Treasury control nema zaključano runtime ime: ${asset.id}`);
    assert(sha256File(master) === asset.masterSha256, `Green Treasury control master je promenjen: ${master}`);
    assert(sha256File(runtime) === asset.runtimeSha256, `Green Treasury control canonical runtime je promenjen: ${runtime}`);
    assert(!treasuryControlRuntimeHashes.has(asset.runtimeSha256), `Green Treasury control runtime sadržaj je dupliran: ${asset.id}`);
    treasuryControlRuntimeHashes.add(asset.runtimeSha256);
}
for (const exclusion of ['individual achievement trophies', 'Statistics aggregate trophies metric', 'Treasury collection medals', 'Tournament tabs and match or registration states', 'Quarterly League tabs, podium medals and rank badges', 'Daily completed and already-played states', 'Invite accepted state', 'Solo claim action', 'Rewarded Video active and unavailable states']) {
    assert(greenTreasuryControlsManifest.semanticExclusions.includes(exclusion), `Treasury Controls manifest ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(greenTreasuryControlsRegistry.canonicalRuntime.length === 8, 'Green Treasury Controls registar mora imati tačno osam canonical runtime asseta.');
assert(new Set(greenTreasuryControlsRegistry.canonicalRuntime.map(asset => asset.role)).size === 8, 'Green Treasury Controls registry uloge moraju biti jedinstvene.');
const treasuryControlsManifestPaths = treasuryControlCatalog.map(asset => asset.runtime.replace(/^www\//, '')).sort();
const treasuryControlsRegistryPaths = greenTreasuryControlsRegistry.canonicalRuntime.map(asset => asset.path).sort();
assert(JSON.stringify(treasuryControlsManifestPaths) === JSON.stringify(treasuryControlsRegistryPaths), 'Treasury Controls manifest i centralni registar nemaju isti runtime katalog.');
for (const manifestAsset of treasuryControlCatalog) {
    const asset = greenTreasuryControlsRegistry.canonicalRuntime.find(candidate => candidate.role === manifestAsset.id);
    assert(asset, `Green Treasury Controls registry nema ulogu: ${manifestAsset.id}`);
    assert(asset.path === manifestAsset.runtime.replace(/^www\//, ''), `Green Treasury Controls registry putanja se ne poklapa: ${manifestAsset.id}`);
    assert(asset.sha256 === manifestAsset.runtimeSha256, `Green Treasury Controls registry hash se ne poklapa: ${manifestAsset.id}`);
    assert(sha256File(path.join(www, asset.path)) === asset.sha256, `Green Treasury Controls registry otisak se ne poklapa: ${asset.path}`);
    assert(gameSource.split(asset.path).length - 1 === 1, `Green Treasury room-on-demand paket mora imati tačno jednu vezu za ${asset.path}.`);
}
for (const role of ['tab-trophies', 'tab-skins', 'tab-effects', 'tab-themes']) {
    const asset = greenTreasuryControlsRegistry.canonicalRuntime.find(candidate => candidate.role === role);
    assert(indexSource.split(asset.path).length - 1 === 1, `Green Treasury UI mora imati tačno jednu ${role} canonical vezu.`);
    assert(rulesSource.split(asset.path).length - 1 === 1, `Green Pravila moraju imati tačno jednu ${role} canonical vezu.`);
}
const treasuryControlsBase = 'assets/green-soft-clay/canonical/treasury-controls/';
assert(managersSource.split(treasuryControlsBase).length - 1 === 3, 'Green Treasury status helperi moraju imati tačno jednu template, lock i insufficient canonical vezu.');
assert(managersSource.split("getEasterTreasuryStatusIcon('status-owned')").length - 1 === 1, 'Owned status mora imati tačno jednu shop vezu.');
assert(managersSource.split("getEasterTreasuryStatusIcon('status-active')").length - 1 === 1, 'Active status mora imati tačno jednu shop vezu.');
assert(managersSource.split("getEasterTreasuryStatusIcon('status-locked')").length - 1 === 2, 'Locked status mora ostati vezan za trophy i requirement stanje.');
assert(greenTreasuryControlsManifest.integration?.treasuryTabs === 'connected' && greenTreasuryControlsManifest.integration?.rulesNavigationGlyphs === 'connected' && greenTreasuryControlsManifest.integration?.itemStatusHelper === 'connected' && greenTreasuryControlsManifest.integration?.hiddenDescriptionLock === 'connected' && greenTreasuryControlsManifest.integration?.insufficientFundsAlerts === 'connected' && greenTreasuryControlsManifest.integration?.roomOnDemand === 'connected', 'Green Treasury Controls integracija nije kompletno evidentirana.');
assert(greenQuarterlyRankBadgesRegistry?.status === 'locked', 'Green Quarterly Rank Badges porodica mora biti zaključana u centralnom registru.');
assert(greenQuarterlyRankBadgesManifest.status === 'locked', 'Green Quarterly Rank Badges source manifest mora biti zaključan.');
assert(greenQuarterlyRankBadgesManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Quarterly Rank Badges završna kontrola nije evidentirana u source manifestu.');
assert(greenQuarterlyRankBadgesManifest.catalog.length === 6, 'Green Quarterly Rank Badges paket mora imati tačno šest bedževa.');
const expectedQuarterlyRankIds = ['alltime', 'amater', 'legenda', 'majstor', 'profi', 'titan'];
assert(JSON.stringify(greenQuarterlyRankBadgesManifest.catalog.map(asset => asset.id).sort()) === JSON.stringify(expectedQuarterlyRankIds), 'Green Quarterly Rank Badges nema tačan skup šest rank ID-jeva.');
const expectedQuarterlyRankOrder = ['amater', 'profi', 'majstor', 'legenda', 'titan', 'alltime'];
assert(JSON.stringify(greenQuarterlyRankBadgesManifest.catalog.map(asset => asset.id)) === JSON.stringify(expectedQuarterlyRankOrder), 'Green Quarterly Rank Badges manifest nema zaključan redosled rangova.');
assert(JSON.stringify(greenQuarterlyRankBadgesRegistry.rankOrder) === JSON.stringify(expectedQuarterlyRankOrder), 'Green Quarterly Rank Badges registar nema zaključan redosled rangova.');
assert(greenQuarterlyRankBadgesManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenQuarterlyRankBadgesManifest.identity?.palette === 'forest-green, warm-ivory and terracotta clay' && greenQuarterlyRankBadgesManifest.identity?.mapping === 'one immutable PNG identity per Quarterly League rank ID', 'Green Quarterly Rank Badges vizuelni DNK ili ID mapiranje je promenjeno.');
const expectedQuarterlyRankRanges = ['0-4999', '5000-14999', '15000-49999', '50000-99999', '100000+', 'all-time leaderboard'];
assert(JSON.stringify(greenQuarterlyRankBadgesManifest.catalog.map(asset => asset.scoreRange)) === JSON.stringify(expectedQuarterlyRankRanges), 'Green Quarterly Rank Badges manifest nema zaključane rank opsege.');
const expectedQuarterlyRankGlyphs = ['seedling shield', 'double-chevron shield', 'crowned diamond', 'laurel star', 'winged crown', 'crowned infinity laurels'];
assert(JSON.stringify(greenQuarterlyRankBadgesManifest.catalog.map(asset => asset.glyph)) === JSON.stringify(expectedQuarterlyRankGlyphs), 'Green Quarterly Rank Badges semantičke siluete su promenjene.');
assert(new Set(greenQuarterlyRankBadgesManifest.catalog.map(asset => asset.runtimeSha256)).size === 6, 'Green Quarterly Rank Badges sadrži dupliran runtime sadržaj.');
assert(greenQuarterlyRankBadgesRegistry.canonicalRuntime.length === 6, 'Green Quarterly Rank Badges registar mora imati tačno šest canonical runtime asseta.');
assert(new Set(greenQuarterlyRankBadgesRegistry.canonicalRuntime.map(asset => asset.role)).size === 6, 'Green Quarterly Rank Badges registry uloge moraju biti jedinstvene.');
const quarterlyRankManifestPaths = greenQuarterlyRankBadgesManifest.catalog.map(asset => asset.runtime.replace(/^www\//, '')).sort();
const quarterlyRankRegistryPaths = greenQuarterlyRankBadgesRegistry.canonicalRuntime.map(asset => asset.path).sort();
assert(JSON.stringify(quarterlyRankManifestPaths) === JSON.stringify(quarterlyRankRegistryPaths), 'Quarterly Rank Badges manifest i centralni registar nemaju isti runtime katalog.');
for (const asset of greenQuarterlyRankBadgesManifest.catalog) {
    const master = path.join(path.dirname(greenQuarterlyRankBadgesManifestPath), asset.master);
    const runtime = path.join(root, asset.runtime);
    assert(fs.existsSync(master), `Nedostaje Green Quarterly rank master: ${master}`);
    assert(fs.existsSync(runtime), `Nedostaje Green Quarterly rank canonical runtime: ${runtime}`);
    const masterInfo = readPngInfo(master);
    const runtimeInfo = readPngInfo(runtime);
    assert(masterInfo.width === 512 && masterInfo.height === 512, `Green Quarterly rank master mora biti 512x512: ${master}`);
    assert(runtimeInfo.width === 384 && runtimeInfo.height === 384, `Green Quarterly rank runtime mora biti 384x384: ${runtime}`);
    assert([4, 6].includes(masterInfo.colorType) && [4, 6].includes(runtimeInfo.colorType), `Green Quarterly rank nema direktan alpha kanal: ${asset.id}`);
    assert(asset.master === `green-rank-${asset.id}-master-v1.png`, `Green Quarterly rank nema canonical master ime: ${asset.id}`);
    assert(asset.runtime === `www/assets/green-soft-clay/canonical/quarterly-rank-badges/rank-${asset.id}-v1.png`, `Green Quarterly rank nema canonical runtime ime: ${asset.id}`);
    assert(sha256File(master) === asset.masterSha256, `Green Quarterly rank master otisak se ne poklapa: ${asset.id}`);
    assert(sha256File(runtime) === asset.runtimeSha256, `Green Quarterly rank runtime otisak se ne poklapa: ${asset.id}`);
    const registryAsset = greenQuarterlyRankBadgesRegistry.canonicalRuntime.find(candidate => candidate.role === asset.id);
    assert(registryAsset, `Green Quarterly Rank Badges registry nema ulogu: ${asset.id}`);
    assert(registryAsset.path === asset.runtime.replace(/^www\//, ''), `Green Quarterly Rank Badges registry putanja se ne poklapa: ${asset.id}`);
    assert(registryAsset.sha256 === asset.runtimeSha256, `Green Quarterly Rank Badges registry hash se ne poklapa: ${asset.id}`);
    assert(gameSource.split(registryAsset.path).length - 1 === 1, `Green Quarterly League room paket mora imati tačno jednu vezu za ${registryAsset.path}.`);
}
for (const exclusion of ['Quarterly League navigation tabs', 'Quarterly League podium medals', 'General Podium competition medals', 'Treasury Collection medals', 'Tournament finalist award', 'Treasury achievement trophies', 'Statistics aggregate trophies metric', 'winner and victory-state marks']) {
    assert(greenQuarterlyRankBadgesManifest.semanticExclusions.includes(exclusion), `Quarterly Rank Badges manifest ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(quarterlyLeagueSource.includes("const rankIds = ['amater', 'profi', 'majstor', 'legenda', 'titan', 'alltime'];"), 'Quarterly League preload nema kompletan skup šest rank bedževa.');
assert(quarterlyLeagueSource.includes('this.getRankBadgeSource(r.id)') && quarterlyLeagueSource.includes('this.getRankBadgeSource(currentRankData.id)'), 'Quarterly League rank potrošači nisu očuvani.');
assert(quarterlyLeagueSource.split('assets/green-soft-clay/canonical/quarterly-rank-badges/').length - 1 === 1, 'Green Quarterly rank resolver mora imati tačno jednu canonical template vezu.');
assert(greenQuarterlyRankBadgesManifest.integration?.rankResolver === 'connected' && greenQuarterlyRankBadgesManifest.integration?.rankCarousel === 'connected' && greenQuarterlyRankBadgesManifest.integration?.currentRankSummary === 'connected' && greenQuarterlyRankBadgesManifest.integration?.roomOnDemand === 'connected', 'Green Quarterly Rank Badges integracija nije kompletno evidentirana.');
assert(greenQuarterlyNavigationRegistry?.status === 'locked', 'Green Quarterly Navigation porodica mora biti zaključana u centralnom registru.');
assert(greenQuarterlyNavigationManifest.status === 'locked', 'Green Quarterly Navigation source manifest mora biti zaključan.');
assert(greenQuarterlyNavigationManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Quarterly Navigation završna kontrola nije evidentirana u source manifestu.');
const expectedQuarterlyNavigationIds = ['tab-champions', 'tab-hall-of-fame', 'tab-league', 'tab-medals'];
assert(greenQuarterlyNavigationManifest.catalog.length === 4, 'Green Quarterly Navigation paket mora imati tačno četiri glyph-a.');
assert(JSON.stringify(greenQuarterlyNavigationManifest.catalog.map(asset => asset.id).sort()) === JSON.stringify(expectedQuarterlyNavigationIds), 'Green Quarterly Navigation nema tačan skup četiri ID-ja.');
const expectedQuarterlyNavigationOrder = ['tab-league', 'tab-hall-of-fame', 'tab-medals', 'tab-champions'];
assert(JSON.stringify(greenQuarterlyNavigationManifest.catalog.map(asset => asset.id)) === JSON.stringify(expectedQuarterlyNavigationOrder), 'Green Quarterly Navigation manifest nema zaključan redosled identiteta.');
assert(greenQuarterlyNavigationManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenQuarterlyNavigationManifest.identity?.palette === 'forest-green, warm-ivory and terracotta clay' && greenQuarterlyNavigationManifest.identity?.mapping === 'one immutable PNG identity per Quarterly League navigation ID', 'Green Quarterly Navigation vizuelni DNK ili ID mapiranje je promenjeno.');
const expectedQuarterlyNavigationGlyphs = ['rising podium bars with one ivory star', 'ceremonial hall with one terracotta star', 'gold, silver and bronze medal trio', 'ivory crown inside forest-green laurels'];
assert(JSON.stringify(greenQuarterlyNavigationManifest.catalog.map(asset => asset.glyph)) === JSON.stringify(expectedQuarterlyNavigationGlyphs), 'Green Quarterly Navigation semantičke siluete su promenjene.');
assert(new Set(greenQuarterlyNavigationManifest.catalog.map(asset => asset.runtimeSha256)).size === 4, 'Green Quarterly Navigation sadrži dupliran canonical runtime sadržaj.');
assert(greenQuarterlyNavigationRegistry.canonicalRuntime.length === 4, 'Green Quarterly Navigation registar mora imati tačno četiri canonical runtime asseta.');
assert(new Set(greenQuarterlyNavigationRegistry.canonicalRuntime.map(asset => asset.role)).size === 4, 'Green Quarterly Navigation registry uloge moraju biti jedinstvene.');
const quarterlyNavigationManifestPaths = greenQuarterlyNavigationManifest.catalog.map(asset => asset.runtime.replace(/^www\//, '')).sort();
const quarterlyNavigationRegistryPaths = greenQuarterlyNavigationRegistry.canonicalRuntime.map(asset => asset.path).sort();
assert(JSON.stringify(quarterlyNavigationManifestPaths) === JSON.stringify(quarterlyNavigationRegistryPaths), 'Quarterly Navigation manifest i centralni registar nemaju isti runtime katalog.');
for (const asset of greenQuarterlyNavigationManifest.catalog) {
    const master = path.join(path.dirname(greenQuarterlyNavigationManifestPath), asset.master);
    const runtime = path.join(root, asset.runtime);
    assert(fs.existsSync(master), `Nedostaje Green Quarterly navigation master: ${master}`);
    assert(fs.existsSync(runtime), `Nedostaje Green Quarterly navigation canonical runtime: ${runtime}`);
    const masterInfo = readPngInfo(master);
    const runtimeInfo = readPngInfo(runtime);
    assert(masterInfo.width === 512 && masterInfo.height === 512, `Green Quarterly navigation master mora biti 512x512: ${master}`);
    assert(runtimeInfo.width === 256 && runtimeInfo.height === 256, `Green Quarterly navigation canonical runtime mora biti 256x256: ${runtime}`);
    assert([4, 6].includes(masterInfo.colorType) && [4, 6].includes(runtimeInfo.colorType), `Green Quarterly navigation glyph nema direktan alpha kanal: ${asset.id}`);
    assert(asset.master === `green-${asset.id}-master-v1.png`, `Green Quarterly navigation nema canonical master ime: ${asset.id}`);
    assert(asset.runtime === `www/assets/green-soft-clay/canonical/quarterly-navigation/${asset.id}-v1.png`, `Green Quarterly navigation nema canonical runtime ime: ${asset.id}`);
    assert(sha256File(master) === asset.masterSha256, `Green Quarterly navigation master otisak se ne poklapa: ${asset.id}`);
    assert(sha256File(runtime) === asset.runtimeSha256, `Green Quarterly navigation canonical runtime otisak se ne poklapa: ${asset.id}`);
    const registryAsset = greenQuarterlyNavigationRegistry.canonicalRuntime.find(candidate => candidate.role === asset.id);
    assert(registryAsset, `Green Quarterly Navigation registry nema ulogu: ${asset.id}`);
    assert(registryAsset.path === asset.runtime.replace(/^www\//, ''), `Green Quarterly Navigation registry putanja se ne poklapa: ${asset.id}`);
    assert(registryAsset.sha256 === asset.runtimeSha256, `Green Quarterly Navigation registry hash se ne poklapa: ${asset.id}`);
    assert(gameSource.split(registryAsset.path).length - 1 === 1, `Green Quarterly League room paket mora imati tačno jednu canonical vezu za ${asset.id}.`);
}
const championsNavigation = greenQuarterlyNavigationManifest.catalog.find(asset => asset.id === 'tab-champions');
assert(championsNavigation.activeSize === 384 && championsNavigation.size === 256 && championsNavigation.normalization === 'canonical runtime reduced from 384 to 256 pixels from the same approved 512-pixel master', 'Green Quarterly champions optimizacija nije precizno evidentirana.');
for (const exclusion of ['Quarterly League rank badges', 'Quarterly League podium medals', 'General Podium competition medals', 'Tournament navigation tabs', 'Treasury navigation tabs', 'Treasury Collection medals', 'Tournament finalist award', 'Treasury achievement trophies', 'winner and victory-state marks']) {
    assert(greenQuarterlyNavigationManifest.semanticExclusions.includes(exclusion), `Quarterly Navigation manifest ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(quarterlyLeagueSource.includes("this.getQlAssetSource('tab-league')") && quarterlyLeagueSource.includes("this.getQlAssetSource('tab-hall-of-fame')"), 'Quarterly League glavni navigacioni potrošači nisu očuvani.');
assert(quarterlyLeagueSource.includes("const medalsTabIcon = this.getQlAssetSource('tab-medals')"), 'Quarterly League Medals tab potrošač nije očuvan.');
assert(quarterlyLeagueSource.split("const championsTabIcon = this.getQlAssetSource('tab-champions')").length - 1 === 2, 'Quarterly League Champions identitet mora ostati vezan za tab i champion marker.');
assert(quarterlyLeagueSource.split('assets/green-soft-clay/canonical/quarterly-navigation/').length - 1 === 1, 'Green Quarterly navigation resolver mora imati tačno jednu canonical template vezu.');
assert(greenQuarterlyNavigationManifest.integration?.mainTabs === 'connected' && greenQuarterlyNavigationManifest.integration?.hallOfFameSubtabs === 'connected' && greenQuarterlyNavigationManifest.integration?.championMarker === 'connected' && greenQuarterlyNavigationManifest.integration?.roomOnDemand === 'connected', 'Green Quarterly Navigation integracija nije kompletno evidentirana.');
assert(Object.keys(greenCompetitionMedalsManifest.subfamilies || {}).sort().join(',') === 'generalPodium,quarterlyLeaguePodium', 'Green Competition Medals paket mora imati tačno General Podium i Quarterly League podfamiliju.');
for (const [subfamilyName, subfamily] of Object.entries(greenCompetitionMedalsManifest.subfamilies)) {
    assert(subfamily.masters.length === 3 && subfamily.runtime.length === 3, `Green ${subfamilyName} mora imati kompletan gold/silver/bronze trio.`);
    assert(new Set(subfamily.masters.map(asset => asset.tier)).size === 3, `Green ${subfamilyName} master nivoi nisu jedinstveni.`);
    assert(new Set(subfamily.runtime.map(asset => asset.tier)).size === 3, `Green ${subfamilyName} runtime nivoi nisu jedinstveni.`);
    for (const masterAsset of subfamily.masters) {
        const master = path.join(path.dirname(greenCompetitionMedalsManifestPath), masterAsset.path);
        assert(fs.existsSync(master), `Nedostaje Green ${subfamilyName} master: ${master}`);
        const info = readPngInfo(master);
        assert(info.width === info.height && info.width >= 512, `Green ${subfamilyName} master nije kvadratan high-resolution PNG: ${master}`);
        assert([4, 6].includes(info.colorType), `Green ${subfamilyName} master nema direktan alpha kanal: ${master}`);
        assert(sha256File(master) === masterAsset.sha256, `Green ${subfamilyName} master je promenjen: ${master}`);
    }
    for (const runtimeAsset of subfamily.runtime) {
        const runtime = path.join(root, runtimeAsset.path);
        assert(fs.existsSync(runtime), `Nedostaje Green ${subfamilyName} runtime asset: ${runtime}`);
        const info = readPngInfo(runtime);
        assert(info.width === runtimeAsset.size && info.height === runtimeAsset.size, `Pogrešna Green ${subfamilyName} runtime rezolucija: ${runtime}`);
        assert([4, 6].includes(info.colorType), `Green ${subfamilyName} runtime nema direktan alpha kanal: ${runtime}`);
        assert(sha256File(runtime) === runtimeAsset.sha256, `Green ${subfamilyName} runtime sadržaj je promenjen: ${runtime}`);
    }
}
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
const generalPodiumBase = 'assets/green-soft-clay/canonical/competition-medals/general-podium-';
const quarterlyLeaguePodiumBase = 'assets/green-soft-clay/canonical/competition-medals/quarterly-league-';
assert(greenCompetitionMedalsRegistry.canonicalRuntime.length === 6, 'Green Competition Medals registar mora imati tačno šest canonical runtime asseta.');
assert(new Set(greenCompetitionMedalsRegistry.canonicalRuntime.map(asset => asset.role)).size === 6, 'Green Competition Medals registry uloge moraju biti jedinstvene.');
assert(greenCompetitionMedalsRegistry.subfamilies?.generalPodium?.mark === 'one ivory laurel wreath', 'General Podium mora zadržati ivory lovor identitet.');
assert(greenCompetitionMedalsRegistry.subfamilies?.quarterlyLeaguePodium?.mark === 'one ivory five-point star', 'Quarterly League Podium mora zadržati ivory zvezda identitet.');
const manifestRuntimePaths = Object.values(greenCompetitionMedalsManifest.subfamilies)
    .flatMap(subfamily => subfamily.runtime)
    .map(asset => asset.path.replace(/^www\//, ''))
    .sort();
const registryRuntimePaths = greenCompetitionMedalsRegistry.canonicalRuntime.map(asset => asset.path).sort();
assert(JSON.stringify(manifestRuntimePaths) === JSON.stringify(registryRuntimePaths), 'Competition Medals manifest i centralni registar nemaju isti runtime skup.');
for (const [consumerName, source, expectedCount] of [
    ['leaderboardSource', leaderboardSource, 1],
    ['tournamentSource', tournamentSource, 1],
    ['powerIndexSource', powerIndexSource, 1],
    ['fireStreakSource', fireStreakSource, 1],
    ['gameSource', gameSource, 4]
]) {
    assert(countOccurrences(source, generalPodiumBase) === expectedCount, `${consumerName} nema očekivan broj General Podium canonical veza (${expectedCount}).`);
}
assert(countOccurrences(quarterlyLeagueSource, quarterlyLeaguePodiumBase) === 1, 'Kvartalna liga mora imati tačno jednu canonical Quarterly League medal template vezu.');
for (const asset of greenCompetitionMedalsRegistry.canonicalRuntime) {
    const file = path.join(www, asset.path);
    assert(sha256File(file) === asset.sha256, `Green Competition Medals registry otisak se ne poklapa: ${asset.path}`);
    assert(countOccurrences(gameSource, asset.path) === 1, `Green room-on-demand paket mora imati tačno jednu vezu za ${asset.path}.`);
}
for (const tier of ['gold', 'silver', 'bronze']) {
    assert(countOccurrences(rulesSource, `${quarterlyLeaguePodiumBase}${tier}-v1.png`) === 1, `Green Pravila moraju imati tačno jednu QL ${tier} medalju.`);
}
for (const exclusion of ['Treasury collection progress medals', 'Tournament finalist award', 'Quarterly League medals-tab navigation glyph', 'Quarterly League rank badges', 'Treasury achievement trophies']) {
    assert(greenCompetitionMedalsRegistry.semanticExclusions.includes(exclusion), `Competition Medals registar ne razdvaja semantički izuzetak: ${exclusion}`);
}
for (const tier of ['gold', 'silver', 'bronze']) {
    assert(gameSource.includes(`assets/green-soft-clay/canonical/collection-medals/collection-${tier}-v1.png`), `Treasury ${tier} collection medalja je izgubljena ili pogrešno zamenjena.`);
}
const collectionMedalsBase = 'assets/green-soft-clay/canonical/collection-medals/collection-';
assert(greenCollectionMedalsRegistry.canonicalRuntime.length === 3, 'Green Collection Medals registar mora imati tačno tri canonical runtime asseta.');
assert(new Set(greenCollectionMedalsRegistry.canonicalRuntime.map(asset => asset.role)).size === 3, 'Green Collection Medals registry uloge moraju biti jedinstvene.');
assert(greenCollectionMedalsRegistry.identity?.rim === 'one thick rounded warm-ivory clay rim', 'Collection Medals mora zadržati jedan debeli ivory obod.');
assert(greenCollectionMedalsRegistry.identity?.mark === 'one raised five-point tier star', 'Collection Medals mora zadržati jednu podignutu tier zvezdu.');
assert(greenCollectionMedalsRegistry.identity?.ribbons === 'forest-green clay with one narrow warm-ivory inset stripe on each tail', 'Collection Medals mora zadržati Green trake sa po jednom ivory prugom.');
assert(greenCollectionMedalsRegistry.identity?.clasp === 'one small centered round terracotta clay clasp', 'Collection Medals mora zadržati okruglu terracotta kopču.');
const collectionManifestRuntimePaths = greenCollectionMedalsManifest.runtime.map(asset => asset.path.replace(/^www\//, '')).sort();
const collectionRegistryRuntimePaths = greenCollectionMedalsRegistry.canonicalRuntime.map(asset => asset.path).sort();
assert(JSON.stringify(collectionManifestRuntimePaths) === JSON.stringify(collectionRegistryRuntimePaths), 'Collection Medals manifest i centralni registar nemaju isti runtime trio.');
assert(countOccurrences(managersSource, collectionMedalsBase) === 1, 'Dinamička Green Riznica mora imati tačno jednu Collection Medals canonical template vezu.');
for (const asset of greenCollectionMedalsRegistry.canonicalRuntime) {
    const file = path.join(www, asset.path);
    assert(sha256File(file) === asset.sha256, `Green Collection Medals registry otisak se ne poklapa: ${asset.path}`);
    assert(countOccurrences(gameSource, asset.path) === 1, `Green Treasury room-on-demand paket mora imati tačno jednu vezu za ${asset.path}.`);
}
assert(greenCollectionMedalsManifest.integration?.treasuryCategoryHeaders === 'connected for Bronze, Silver and Gold skin collections', 'Collection Medals moraju ostati povezane sa sva tri Treasury category zaglavlja.');
assert(greenCollectionMedalsManifest.integration?.roomOnDemand === 'connected', 'Collection Medals room-on-demand veza mora ostati zaključana.');
assert(managersSource.includes("if (this.type !== 'skin') return null;"), 'Collection medalje moraju ostati ograničene na Treasury skin kolekcije.');
for (const mapping of ["name.includes('bronza') || name.includes('bronze')", "name.includes('srebr') || name.includes('silver')", "name.includes('zlat') || name.includes('gold')"]) {
    assert(managersSource.includes(mapping), `Collection Medals kategorijsko mapiranje je izgubljeno: ${mapping}`);
}
for (const exclusion of ['General Podium competition medals', 'Quarterly League podium medals', 'Tournament finalist award', 'Quarterly League medals-tab navigation glyph', 'Quarterly League rank badges', 'Treasury achievement trophies']) {
    assert(greenCollectionMedalsRegistry.semanticExclusions.includes(exclusion), `Collection Medals registar ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(tournamentSource.includes('assets/green-soft-clay/tournament/finalist-silver-v1.png'), 'Tournament finalist nagrada je izgubljena ili pogrešno zamenjena.');
assert(gameSource.includes('assets/green-soft-clay/canonical/quarterly-navigation/tab-medals-v1.png'), 'QL medals-tab glyph je izgubljen ili pogrešno zamenjen.');
assert(gameSource.includes('assets/green-soft-clay/canonical/quarterly-rank-badges/rank-amater-v1.png') && gameSource.includes('assets/green-soft-clay/canonical/quarterly-rank-badges/rank-alltime-v1.png'), 'QL rank badge porodica je izgubljena ili pogrešno zamenjena.');
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
    leaderboard: relative => relative.startsWith('leaderboard/') || relative.startsWith('leaderboard-') || relative.startsWith('canonical/competition-medals/general-podium-'),
    statistics: relative => relative.startsWith('statistics/') || relative.startsWith('statistics-'),
    settings: relative => relative.startsWith('settings/') || relative.startsWith('settings-'),
    rules: relative => relative.startsWith('rules/') || relative.startsWith('rules-'),
    globalChat: relative => relative.startsWith('global-chat'),
    onlinePlayers: relative => relative.startsWith('online-players') || relative.startsWith('online-add-') || relative.startsWith('online-spectate') || relative.startsWith('online-duel'),
    economy: relative => relative.startsWith('economy/') || relative.startsWith('ducats-undo') || relative.startsWith('canonical/ducat/') || relative.startsWith('canonical/undo-token/') || relative.startsWith('canonical/rewarded-video/'),
    quarterlyLeague: relative => relative.startsWith('ql/') || relative.startsWith('quarterly-league') || relative.startsWith('canonical/competition-medals/quarterly-league-') || relative.startsWith('canonical/quarterly-rank-badges/') || relative.startsWith('canonical/quarterly-navigation/'),
    treasury: (relative, themeDir) => relative.startsWith('treasury/') || relative.startsWith('treasury-') || relative.startsWith('economy/ducat') || relative.startsWith('canonical/ducat/') || relative.startsWith('canonical/collection-medals/') || relative.startsWith('canonical/achievement-trophies/') || relative.startsWith('canonical/treasury-controls/') || (themeDir !== 'green-soft-clay' && relative.includes('rewarded-video')),
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
