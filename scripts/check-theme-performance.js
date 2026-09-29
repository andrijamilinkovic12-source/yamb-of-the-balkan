const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const www = path.join(root, 'www');
const indexSource = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
const themeCssSource = fs.readFileSync(path.join(www, 'teme.css'), 'utf8');
const styleCssSource = fs.readFileSync(path.join(www, 'style.css'), 'utf8');
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
const greenTournamentNavigationRegistry = greenAssetRegistry.families?.tournamentNavigation;
const greenTournamentStatesRegistry = greenAssetRegistry.families?.tournamentStates;
const greenTournamentAwardsRegistry = greenAssetRegistry.families?.tournamentAwards;
const greenHotseatWinnerRegistry = greenAssetRegistry.families?.hotseatWinner;
const greenSoloResultsRegistry = greenAssetRegistry.families?.soloResults;
const greenStatisticsOverviewRegistry = greenAssetRegistry.families?.statisticsOverview;
const greenH2HStatisticsRegistry = greenAssetRegistry.families?.h2hStatistics;
const greenStatisticsRoomIdentityRegistry = greenAssetRegistry.families?.statisticsRoomIdentity;
const greenLeaderboardRoomIdentityRegistry = greenAssetRegistry.families?.leaderboardRoomIdentity;
const greenDailyRoomIdentityRegistry = greenAssetRegistry.families?.dailyRoomIdentity;
const greenThemeManifest = JSON.parse(fs.readFileSync(path.join(www, 'themes', 'green', 'manifest.json'), 'utf8'));
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
const greenTournamentNavigationManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'tournament-navigation', 'manifest.json');
const greenTournamentNavigationManifest = JSON.parse(fs.readFileSync(greenTournamentNavigationManifestPath, 'utf8'));
const greenTournamentStatesManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'tournament-states', 'manifest.json');
const greenTournamentStatesManifest = JSON.parse(fs.readFileSync(greenTournamentStatesManifestPath, 'utf8'));
const greenTournamentAwardsManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'tournament-awards', 'manifest.json');
const greenTournamentAwardsManifest = JSON.parse(fs.readFileSync(greenTournamentAwardsManifestPath, 'utf8'));
const greenHotseatWinnerManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'hotseat-winner', 'manifest.json');
const greenHotseatWinnerManifest = JSON.parse(fs.readFileSync(greenHotseatWinnerManifestPath, 'utf8'));
const greenSoloResultsManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'solo-results', 'manifest.json');
const greenSoloResultsManifest = JSON.parse(fs.readFileSync(greenSoloResultsManifestPath, 'utf8'));
const greenStatisticsOverviewManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'statistics-overview', 'manifest.json');
const greenStatisticsOverviewManifest = JSON.parse(fs.readFileSync(greenStatisticsOverviewManifestPath, 'utf8'));
const greenH2HStatisticsManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'h2h-statistics', 'manifest.json');
const greenH2HStatisticsManifest = JSON.parse(fs.readFileSync(greenH2HStatisticsManifestPath, 'utf8'));
const greenStatisticsRoomIdentityManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'statistics-room-identity', 'manifest.json');
const greenStatisticsRoomIdentityManifest = JSON.parse(fs.readFileSync(greenStatisticsRoomIdentityManifestPath, 'utf8'));
const greenLeaderboardRoomIdentityManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'leaderboard-room-identity', 'manifest.json');
const greenLeaderboardRoomIdentityManifest = JSON.parse(fs.readFileSync(greenLeaderboardRoomIdentityManifestPath, 'utf8'));
const greenDailyRoomIdentityManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'daily-room-identity', 'manifest.json');
const greenDailyRoomIdentityManifest = JSON.parse(fs.readFileSync(greenDailyRoomIdentityManifestPath, 'utf8'));

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
assert(greenTournamentNavigationRegistry?.status === 'locked', 'Green Tournament Navigation porodica mora biti zaključana u centralnom registru.');
assert(greenTournamentNavigationManifest.status === 'locked', 'Green Tournament Navigation source manifest mora biti zaključan.');
assert(greenTournamentNavigationManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Tournament Navigation završna kontrola nije evidentirana u source manifestu.');
const expectedTournamentNavigationIds = ['tab-bracket', 'tab-hall-of-fame', 'tab-info'];
assert(greenTournamentNavigationManifest.catalog.length === 3, 'Green Tournament Navigation paket mora imati tačno tri glyph-a.');
assert(JSON.stringify(greenTournamentNavigationManifest.catalog.map(asset => asset.id).sort()) === JSON.stringify(expectedTournamentNavigationIds), 'Green Tournament Navigation nema tačan skup tri ID-ja.');
const expectedTournamentNavigationOrder = ['tab-info', 'tab-bracket', 'tab-hall-of-fame'];
assert(JSON.stringify(greenTournamentNavigationManifest.catalog.map(asset => asset.id)) === JSON.stringify(expectedTournamentNavigationOrder), 'Green Tournament Navigation manifest nema zaključan redosled identiteta.');
assert(greenTournamentNavigationManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenTournamentNavigationManifest.identity?.palette === 'forest-green, warm-ivory and terracotta clay' && greenTournamentNavigationManifest.identity?.mapping === 'one immutable PNG identity per Tournament navigation ID', 'Green Tournament Navigation vizuelni DNK ili ID mapiranje je promenjeno.');
const expectedTournamentNavigationGlyphs = ['ivory information mark inside a forest-green ring', 'symmetrical eight-player bracket with one central terracotta star', 'ivory historical scroll with forest-green lines and one terracotta seal'];
assert(JSON.stringify(greenTournamentNavigationManifest.catalog.map(asset => asset.glyph)) === JSON.stringify(expectedTournamentNavigationGlyphs), 'Green Tournament Navigation semantičke siluete su promenjene.');
assert(new Set(greenTournamentNavigationManifest.catalog.map(asset => asset.runtimeSha256)).size === 3, 'Green Tournament Navigation sadrži dupliran canonical runtime sadržaj.');
assert(greenTournamentNavigationRegistry.canonicalRuntime.length === 3, 'Green Tournament Navigation registar mora imati tačno tri canonical runtime asseta.');
assert(new Set(greenTournamentNavigationRegistry.canonicalRuntime.map(asset => asset.role)).size === 3, 'Green Tournament Navigation registry uloge moraju biti jedinstvene.');
const tournamentNavigationManifestPaths = greenTournamentNavigationManifest.catalog.map(asset => asset.runtime.replace(/^www\//, '')).sort();
const tournamentNavigationRegistryPaths = greenTournamentNavigationRegistry.canonicalRuntime.map(asset => asset.path).sort();
assert(JSON.stringify(tournamentNavigationManifestPaths) === JSON.stringify(tournamentNavigationRegistryPaths), 'Tournament Navigation manifest i centralni registar nemaju isti runtime katalog.');
for (const asset of greenTournamentNavigationManifest.catalog) {
    const master = path.join(path.dirname(greenTournamentNavigationManifestPath), asset.master);
    const runtime = path.join(root, asset.runtime);
    assert(fs.existsSync(master), `Nedostaje Green Tournament navigation master: ${master}`);
    assert(fs.existsSync(runtime), `Nedostaje Green Tournament navigation canonical runtime: ${runtime}`);
    const masterInfo = readPngInfo(master);
    const runtimeInfo = readPngInfo(runtime);
    assert(masterInfo.width === asset.masterSize[0] && masterInfo.height === asset.masterSize[1], `Green Tournament navigation master dimenzija nije evidentirana: ${master}`);
    assert(runtimeInfo.width === 256 && runtimeInfo.height === 256, `Green Tournament navigation canonical runtime mora biti 256x256: ${runtime}`);
    assert([4, 6].includes(masterInfo.colorType) && [4, 6].includes(runtimeInfo.colorType), `Green Tournament navigation glyph nema direktan alpha kanal: ${asset.id}`);
    assert(asset.master === `green-${asset.id}-master-v1.png`, `Green Tournament navigation nema canonical master ime: ${asset.id}`);
    assert(asset.runtime === `www/assets/green-soft-clay/canonical/tournament-navigation/${asset.id}-v1.png`, `Green Tournament navigation nema canonical runtime ime: ${asset.id}`);
    assert(sha256File(master) === asset.masterSha256, `Green Tournament navigation master otisak se ne poklapa: ${asset.id}`);
    assert(sha256File(runtime) === asset.runtimeSha256, `Green Tournament navigation canonical runtime otisak se ne poklapa: ${asset.id}`);
    const registryAsset = greenTournamentNavigationRegistry.canonicalRuntime.find(candidate => candidate.role === asset.id);
    assert(registryAsset, `Green Tournament Navigation registry nema ulogu: ${asset.id}`);
    assert(registryAsset.path === asset.runtime.replace(/^www\//, ''), `Green Tournament Navigation registry putanja se ne poklapa: ${asset.id}`);
    assert(registryAsset.sha256 === asset.runtimeSha256, `Green Tournament Navigation registry hash se ne poklapa: ${asset.id}`);
    assert(gameSource.split(registryAsset.path).length - 1 === 1, `Green Tournament room paket mora imati tačno jednu canonical vezu za ${asset.id}.`);
    assert(tournamentSource.split(registryAsset.path).length - 1 === 1, `Green Tournament tab mora imati tačno jednu canonical vezu za ${asset.id}.`);
}
const bracketNavigation = greenTournamentNavigationManifest.catalog.find(asset => asset.id === 'tab-bracket');
assert(JSON.stringify(bracketNavigation.activeRuntimeSize) === JSON.stringify([246, 256]) && JSON.stringify(bracketNavigation.runtimeSize) === JSON.stringify([256, 256]), 'Green Tournament bracket dimenziona normalizacija nije evidentirana.');
assert(bracketNavigation.normalization === 'approved 246x256 runtime pixels centered unchanged at x=5 on a transparent 256x256 canvas', 'Green Tournament bracket canvas pravilo je promenjeno.');
for (const exclusion of ['Tournament registration and match action states', 'Tournament finalist award', 'Tournament winner trophy, intro and main logo', 'Quarterly League navigation tabs', 'Quarterly League rank badges', 'Quarterly League and General Podium medals', 'Treasury navigation tabs', 'winner and victory-state marks']) {
    assert(greenTournamentNavigationManifest.semanticExclusions.includes(exclusion), `Tournament Navigation manifest ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(rulesSource.split('assets/green-soft-clay/canonical/tournament-navigation/tab-hall-of-fame-v1.png').length - 1 === 1, 'Green Pravila moraju imati tačno jednu canonical Tournament Hall of Fame vezu.');
assert(greenTournamentNavigationManifest.integration?.tournamentTabs === 'connected' && greenTournamentNavigationManifest.integration?.rulesHallOfFameReference === 'connected' && greenTournamentNavigationManifest.integration?.roomOnDemand === 'connected', 'Green Tournament Navigation integracija nije kompletno evidentirana.');
assert(greenTournamentStatesRegistry?.status === 'locked', 'Green Tournament States porodica mora biti zaključana u centralnom registru.');
assert(greenTournamentStatesManifest.status === 'locked', 'Green Tournament States source manifest mora biti zaključan.');
assert(greenTournamentStatesManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Tournament States završna kontrola nije evidentirana u source manifestu.');
assert(Object.keys(greenTournamentStatesManifest.subfamilies || {}).sort().join(',') === 'flowStates,registrationActions', 'Green Tournament States paket mora imati registrationActions i flowStates podgrupe.');
const tournamentStateCatalog = Object.values(greenTournamentStatesManifest.subfamilies).flatMap(subfamily => subfamily.catalog || []);
const expectedTournamentStateIds = ['state-match-active', 'state-match-complete', 'state-register', 'state-registration-locked', 'state-start', 'state-unregister'];
assert(tournamentStateCatalog.length === 6, 'Green Tournament States paket mora imati tačno šest identiteta.');
assert(JSON.stringify(tournamentStateCatalog.map(asset => asset.id).sort()) === JSON.stringify(expectedTournamentStateIds), 'Green Tournament States nema tačan skup šest ID-ja.');
const expectedTournamentStateOrder = ['state-register', 'state-unregister', 'state-registration-locked', 'state-start', 'state-match-active', 'state-match-complete'];
assert(JSON.stringify(tournamentStateCatalog.map(asset => asset.id)) === JSON.stringify(expectedTournamentStateOrder), 'Green Tournament States manifest nema zaključan redosled identiteta.');
assert(greenTournamentStatesManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenTournamentStatesManifest.identity?.palette === 'forest-green, warm-ivory and terracotta clay' && greenTournamentStatesManifest.identity?.mapping === 'one immutable PNG identity per Tournament action or state ID', 'Green Tournament States vizuelni DNK ili ID mapiranje je promenjeno.');
const expectedTournamentStateGlyphs = [
    'ivory admission ticket with a forest-green check and one terracotta notch accent',
    'ivory admission ticket with a forest-green return arrow and three terracotta marks',
    'ivory admission ticket with a forest-green padlock and terracotta keyhole',
    'ivory play triangle inside a forest-green ring with one terracotta base accent',
    'two ivory dice linked by a forest-green ring around one terracotta sparkle',
    'forest-green award medallion with an ivory check and terracotta inner ring'
];
assert(JSON.stringify(tournamentStateCatalog.map(asset => asset.glyph)) === JSON.stringify(expectedTournamentStateGlyphs), 'Green Tournament States semantičke siluete su promenjene.');
assert(new Set(tournamentStateCatalog.map(asset => asset.masterSha256)).size === 6, 'Green Tournament States sadrži dupliran master sadržaj.');
assert(new Set(tournamentStateCatalog.map(asset => asset.runtimeSha256)).size === 6, 'Green Tournament States sadrži dupliran canonical runtime sadržaj.');
assert(greenTournamentStatesRegistry.canonicalRuntime.length === 6, 'Green Tournament States registar mora imati tačno šest canonical runtime asseta.');
assert(new Set(greenTournamentStatesRegistry.canonicalRuntime.map(asset => asset.role)).size === 6, 'Green Tournament States registry uloge moraju biti jedinstvene.');
const tournamentStateManifestPaths = tournamentStateCatalog.map(asset => asset.runtime.replace(/^www\//, '')).sort();
const tournamentStateRegistryPaths = greenTournamentStatesRegistry.canonicalRuntime.map(asset => asset.path).sort();
assert(JSON.stringify(tournamentStateManifestPaths) === JSON.stringify(tournamentStateRegistryPaths), 'Tournament States manifest i centralni registar nemaju isti runtime katalog.');
for (const asset of tournamentStateCatalog) {
    const master = path.join(path.dirname(greenTournamentStatesManifestPath), asset.master);
    const runtime = path.join(root, asset.runtime);
    const activeRuntime = path.join(root, asset.activeRuntime);
    assert(fs.existsSync(master), `Nedostaje Green Tournament state master: ${master}`);
    assert(fs.existsSync(runtime), `Nedostaje Green Tournament state canonical runtime: ${runtime}`);
    assert(!fs.existsSync(activeRuntime), `Stari Green Tournament state runtime nije uklonjen: ${activeRuntime}`);
    const masterInfo = readPngInfo(master);
    const runtimeInfo = readPngInfo(runtime);
    assert(JSON.stringify([masterInfo.width, masterInfo.height]) === JSON.stringify(asset.masterSize), `Green Tournament state master dimenzija nije evidentirana: ${asset.id}`);
    assert(runtimeInfo.width === 256 && runtimeInfo.height === 256 && JSON.stringify(asset.runtimeSize) === JSON.stringify([256, 256]), `Green Tournament state canonical runtime mora biti 256x256: ${asset.id}`);
    assert([4, 6].includes(masterInfo.colorType) && [4, 6].includes(runtimeInfo.colorType), `Green Tournament state asset nema direktan alpha kanal: ${asset.id}`);
    assert(asset.master.endsWith(`/green-${asset.id}-master-v1.png`), `Green Tournament state nema canonical master ime: ${asset.id}`);
    assert(asset.runtime === `www/assets/green-soft-clay/canonical/tournament-states/${asset.id}-v1.png`, `Green Tournament state nema canonical runtime ime: ${asset.id}`);
    assert(asset.activeRuntime === `www/assets/green-soft-clay/tournament/${asset.id}-v1.png`, `Green Tournament state nema evidentiranu aktivnu putanju: ${asset.id}`);
    assert(sha256File(master) === asset.masterSha256, `Green Tournament state master otisak se ne poklapa: ${asset.id}`);
    assert(sha256File(runtime) === asset.runtimeSha256, `Green Tournament state canonical runtime otisak se ne poklapa: ${asset.id}`);
    const registryAsset = greenTournamentStatesRegistry.canonicalRuntime.find(candidate => candidate.role === asset.id);
    assert(registryAsset, `Green Tournament States registry nema ulogu: ${asset.id}`);
    assert(registryAsset.path === asset.runtime.replace(/^www\//, ''), `Green Tournament States registry putanja se ne poklapa: ${asset.id}`);
    assert(registryAsset.sha256 === asset.runtimeSha256, `Green Tournament States registry hash se ne poklapa: ${asset.id}`);
    assert(gameSource.split(registryAsset.path).length - 1 === 1, `Green Tournament room paket mora imati tačno jednu canonical vezu za ${asset.id}.`);
}
const expectedTournamentStateCanvas = {
    'state-register': { contentSize: [256, 171], contentOffset: [0, 42] },
    'state-unregister': { contentSize: [256, 256], contentOffset: [0, 0] },
    'state-registration-locked': { contentSize: [253, 256], contentOffset: [1, 0] },
    'state-start': { contentSize: [256, 256], contentOffset: [0, 0] },
    'state-match-active': { contentSize: [256, 256], contentOffset: [0, 0] },
    'state-match-complete': { contentSize: [256, 256], contentOffset: [0, 0] }
};
for (const asset of tournamentStateCatalog) {
    assert(JSON.stringify({ contentSize: asset.contentSize, contentOffset: asset.contentOffset }) === JSON.stringify(expectedTournamentStateCanvas[asset.id]), `Green Tournament state canvas normalizacija je promenjena: ${asset.id}`);
    assert(typeof asset.normalization === 'string' && asset.normalization.includes('256x256'), `Green Tournament state nema precizno pravilo normalizacije: ${asset.id}`);
}
assert(tournamentSource.split('assets/green-soft-clay/canonical/tournament-states/state-register-v1.png').length - 1 === 1, 'Green Tournament Register akcija mora imati tačno jednu canonical state-register vezu.');
assert(tournamentSource.split('assets/green-soft-clay/canonical/tournament-states/state-unregister-v1.png').length - 1 === 1, 'Green Tournament Unregister akcija mora imati tačno jednu canonical state-unregister vezu.');
assert(tournamentSource.includes("const greenState = isFinished ? 'state-match-complete-v1' : (isRegistered ? 'state-start-v1' : 'state-registration-locked-v1');") && tournamentSource.includes('assets/green-soft-clay/canonical/tournament-states/${greenState}.png'), 'Green Tournament dinamički canonical registration state potrošači nisu očuvani.');
assert(tournamentSource.split('assets/green-soft-clay/canonical/tournament-states/state-match-active-v1.png').length - 1 === 1, 'Green Tournament aktivni meč mora imati tačno jednu canonical state-match-active vezu.');
assert(tournamentSource.split('assets/green-soft-clay/canonical/tournament-states/state-match-complete-v1.png').length - 1 === 2, 'Green Tournament završeni rezultat mora imati tačno dve direktne canonical state-match-complete veze.');
assert(rulesSource.split('assets/green-soft-clay/canonical/tournament-states/state-start-v1.png').length - 1 === 1, 'Green Pravila moraju imati tačno jednu canonical Tournament Start referencu.');
for (const exclusion of ['Tournament navigation tabs', 'Tournament finalist award', 'Tournament winner trophy, intro and main logo', 'Treasury item statuses', 'Daily Challenge completed and already-played states', 'Invite Friend sent and accepted states', 'Hotseat and generic winner marks', 'Rewarded Video active and unavailable states', 'canonical Undo token']) {
    assert(greenTournamentStatesManifest.semanticExclusions.includes(exclusion), `Tournament States manifest ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(greenTournamentStatesManifest.integration?.tournamentRegistrationActions === 'connected' && greenTournamentStatesManifest.integration?.tournamentRegistrationPanel === 'connected' && greenTournamentStatesManifest.integration?.tournamentMatchStates === 'connected' && greenTournamentStatesManifest.integration?.rulesStartReference === 'connected' && greenTournamentStatesManifest.integration?.roomOnDemand === 'connected' && greenTournamentStatesManifest.integration?.legacyRuntime === 'retired in standardization step 3', 'Green Tournament States integracija nije kompletno evidentirana.');
assert(greenTournamentAwardsRegistry?.status === 'locked', 'Green Tournament Awards porodica mora biti zaključana u centralnom registru.');
assert(greenTournamentAwardsManifest.status === 'locked', 'Green Tournament Awards source manifest mora biti zaključan.');
assert(greenTournamentAwardsManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Tournament Awards završna kontrola nije evidentirana u source manifestu.');
const expectedTournamentAwardIds = ['champion-trophy', 'finalist-silver'];
assert(greenTournamentAwardsManifest.catalog.length === 2, 'Green Tournament Awards paket mora imati tačno dva identiteta.');
assert(JSON.stringify(greenTournamentAwardsManifest.catalog.map(asset => asset.id)) === JSON.stringify(expectedTournamentAwardIds), 'Green Tournament Awards nema tačan katalog ili redosled identiteta.');
assert(greenTournamentAwardsManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenTournamentAwardsManifest.identity?.palette === 'forest-green, warm-ivory, terracotta and controlled silver clay' && greenTournamentAwardsManifest.identity?.mapping === 'one immutable PNG identity for champion and one for finalist', 'Green Tournament Awards vizuelni DNK ili ID mapiranje je promenjeno.');
const expectedTournamentAwardGlyphs = ['forest-green two-handled trophy with ivory handles and star plus one terracotta collar', 'full silver medallion with one ivory star, solid forest-green ribbons and one terracotta clasp'];
assert(JSON.stringify(greenTournamentAwardsManifest.catalog.map(asset => asset.glyph)) === JSON.stringify(expectedTournamentAwardGlyphs), 'Green Tournament Awards semantičke siluete su promenjene.');
assert(new Set(greenTournamentAwardsManifest.catalog.map(asset => asset.masterSha256)).size === 2, 'Green Tournament Awards sadrži dupliran master sadržaj.');
assert(new Set(greenTournamentAwardsManifest.catalog.map(asset => asset.runtimeSha256)).size === 2, 'Green Tournament Awards sadrži dupliran canonical runtime sadržaj.');
assert(greenTournamentAwardsRegistry.canonicalRuntime.length === 2, 'Green Tournament Awards registar mora imati tačno dva canonical runtime asseta.');
assert(new Set(greenTournamentAwardsRegistry.canonicalRuntime.map(asset => asset.role)).size === 2, 'Green Tournament Awards registry uloge moraju biti jedinstvene.');
const tournamentAwardManifestPaths = greenTournamentAwardsManifest.catalog.map(asset => asset.runtime.replace(/^www\//, '')).sort();
const tournamentAwardRegistryPaths = greenTournamentAwardsRegistry.canonicalRuntime.map(asset => asset.path).sort();
assert(JSON.stringify(tournamentAwardManifestPaths) === JSON.stringify(tournamentAwardRegistryPaths), 'Tournament Awards manifest i centralni registar nemaju isti runtime katalog.');
for (const asset of greenTournamentAwardsManifest.catalog) {
    const master = path.join(path.dirname(greenTournamentAwardsManifestPath), asset.master);
    const runtime = path.join(root, asset.runtime);
    const activeRuntime = path.join(root, asset.activeRuntime);
    assert(fs.existsSync(master), `Nedostaje Green Tournament award master: ${master}`);
    assert(fs.existsSync(runtime), `Nedostaje Green Tournament award canonical runtime: ${runtime}`);
    assert(!fs.existsSync(activeRuntime), `Stari Green Tournament award runtime nije uklonjen: ${activeRuntime}`);
    const masterInfo = readPngInfo(master);
    const runtimeInfo = readPngInfo(runtime);
    assert(JSON.stringify([masterInfo.width, masterInfo.height]) === JSON.stringify(asset.masterSize), `Green Tournament award master dimenzija nije evidentirana: ${asset.id}`);
    assert(JSON.stringify([runtimeInfo.width, runtimeInfo.height]) === JSON.stringify(asset.runtimeSize), `Green Tournament award canonical dimenzija nije evidentirana: ${asset.id}`);
    assert([4, 6].includes(masterInfo.colorType) && [4, 6].includes(runtimeInfo.colorType), `Green Tournament award asset nema direktan alpha kanal: ${asset.id}`);
    assert(asset.master === `green-${asset.id}-master-v1.png`, `Green Tournament award nema canonical master ime: ${asset.id}`);
    assert(asset.runtime === `www/assets/green-soft-clay/canonical/tournament-awards/${asset.id}-v1.png`, `Green Tournament award nema canonical runtime ime: ${asset.id}`);
    assert(sha256File(master) === asset.masterSha256, `Green Tournament award master otisak se ne poklapa: ${asset.id}`);
    assert(sha256File(runtime) === asset.runtimeSha256, `Green Tournament award canonical runtime otisak se ne poklapa: ${asset.id}`);
    const registryAsset = greenTournamentAwardsRegistry.canonicalRuntime.find(candidate => candidate.role === asset.id);
    assert(registryAsset, `Green Tournament Awards registry nema ulogu: ${asset.id}`);
    assert(registryAsset.path === asset.runtime.replace(/^www\//, '') && registryAsset.sha256 === asset.runtimeSha256 && registryAsset.size === asset.runtimeSize[0], `Green Tournament Awards registry zapis se ne poklapa: ${asset.id}`);
}
const championAward = greenTournamentAwardsManifest.catalog.find(asset => asset.id === 'champion-trophy');
const championStartup = path.join(root, championAward.activeStartup);
assert(!fs.existsSync(championStartup), `Stara Green Tournament champion startup kopija nije uklonjena: ${championStartup}`);
assert(championAward.runtimeSha256 === championAward.activeStartupSha256, 'Green Tournament champion canonical runtime mora ostati identičan odobrenoj startup izvedenici.');
const finalistAward = greenTournamentAwardsManifest.catalog.find(asset => asset.id === 'finalist-silver');
assert(JSON.stringify(championAward.runtimeSize) === JSON.stringify([384, 384]) && championAward.normalization === 'canonical runtime is byte-identical to the approved 384x384 startup derivative of the same 1254x1254 master', 'Green Tournament champion optimizacija nije precizno evidentirana.');
assert(JSON.stringify(finalistAward.runtimeSize) === JSON.stringify([256, 256]) && finalistAward.normalization === 'approved 1254x1254 master reduced proportionally to the full 256x256 transparent canvas', 'Green Tournament finalist optimizacija nije precizno evidentirana.');
const championAwardPath = 'assets/green-soft-clay/canonical/tournament-awards/champion-trophy-v1.png';
const finalistAwardPath = 'assets/green-soft-clay/canonical/tournament-awards/finalist-silver-v1.png';
const expectedTournamentAwardForbiddenPaths = ['assets/green-soft-clay/tournament-free-v2.png', 'assets/green-soft-clay/runtime/menu/tournament-free-v2.png', 'assets/green-soft-clay/tournament/finalist-silver-v1.png'];
assert(JSON.stringify(greenTournamentAwardsRegistry.forbiddenRuntimePaths) === JSON.stringify(expectedTournamentAwardForbiddenPaths), 'Green Tournament Awards nema zaključan skup zabranjenih starih putanja.');
assert(indexSource.split(championAwardPath).length - 1 === 3, 'Green Tournament champion mora imati tačno tri canonical index veze.');
assert(gameSource.split(championAwardPath).length - 1 === 3 && tournamentSource.split(championAwardPath).length - 1 === 6 && rulesSource.split(championAwardPath).length - 1 === 1, 'Green Tournament champion canonical sobni potrošači nisu kompletni.');
assert(gameSource.split(finalistAwardPath).length - 1 === 3 && tournamentSource.split(finalistAwardPath).length - 1 === 1, 'Green Tournament finalist canonical potrošači nisu kompletni.');
assert(gameSource.includes('canonical\\/tournament-awards\\/champion-trophy') && gameSource.includes("path.startsWith('canonical/tournament-navigation/')") && gameSource.includes("path.startsWith('canonical/tournament-states/')") && gameSource.includes("path.startsWith('canonical/tournament-awards/')"), 'Green stvarni startup/room matcher ne prepoznaje kompletan Tournament canonical paket.');
for (const exclusion of ['General Podium competition medals', 'Quarterly League podium medals', 'Treasury Collection medals', 'individual achievement trophies', 'Tournament navigation tabs', 'Tournament registration and match states', 'Quarterly League navigation and champion marker', 'Quarterly League rank badges', 'Hotseat, Online and generic winner marks']) {
    assert(greenTournamentAwardsManifest.semanticExclusions.includes(exclusion), `Tournament Awards manifest ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(greenTournamentAwardsManifest.integration?.mainMenuStartup === 'connected' && greenTournamentAwardsManifest.integration?.tournamentBranding === 'connected' && greenTournamentAwardsManifest.integration?.championConsumers === 'connected' && greenTournamentAwardsManifest.integration?.finalistConsumers === 'connected' && greenTournamentAwardsManifest.integration?.rulesChampionReference === 'connected' && greenTournamentAwardsManifest.integration?.roomOnDemand === 'connected' && greenTournamentAwardsManifest.integration?.legacyRuntime === 'retired in standardization step 3', 'Green Tournament Awards integracija nije kompletno evidentirana.');
assert(greenHotseatWinnerRegistry?.status === 'locked', 'Green Hotseat Winner porodica mora biti zaključana u centralnom registru.');
assert(greenHotseatWinnerManifest.status === 'locked', 'Green Hotseat Winner source manifest mora biti zaključan.');
assert(greenHotseatWinnerManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Hotseat Winner završna kontrola nije evidentirana u source manifestu.');
assert(greenHotseatWinnerManifest.catalog.length === 1 && greenHotseatWinnerManifest.catalog[0].id === 'hotseat-winner', 'Green Hotseat Winner paket mora imati tačno jedan identitet.');
assert(greenHotseatWinnerManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenHotseatWinnerManifest.identity?.palette === 'forest-green, warm-ivory and one terracotta accent' && greenHotseatWinnerManifest.identity?.mapping === 'one immutable PNG identity for a non-draw local Hotseat winner', 'Green Hotseat Winner vizuelni DNK ili ID mapiranje je promenjeno.');
assert(greenHotseatWinnerRegistry.identity?.material === greenHotseatWinnerManifest.identity.material && greenHotseatWinnerRegistry.identity?.palette === greenHotseatWinnerManifest.identity.palette && greenHotseatWinnerRegistry.identity?.mapping === greenHotseatWinnerManifest.identity.mapping, 'Green Hotseat Winner registry i manifest nemaju isti zaključani identitet.');
const hotseatWinner = greenHotseatWinnerManifest.catalog[0];
const hotseatWinnerMaster = path.join(path.dirname(greenHotseatWinnerManifestPath), hotseatWinner.master);
const hotseatWinnerRuntime = path.join(root, hotseatWinner.runtime);
const hotseatWinnerActiveRuntime = path.join(root, hotseatWinner.activeRuntime);
assert(fs.existsSync(hotseatWinnerMaster), `Nedostaje Green Hotseat Winner master: ${hotseatWinnerMaster}`);
assert(fs.existsSync(hotseatWinnerRuntime), `Nedostaje Green Hotseat Winner canonical runtime: ${hotseatWinnerRuntime}`);
assert(!fs.existsSync(hotseatWinnerActiveRuntime), `Stari Green Hotseat Winner runtime nije uklonjen: ${hotseatWinnerActiveRuntime}`);
const hotseatWinnerMasterInfo = readPngInfo(hotseatWinnerMaster);
const hotseatWinnerRuntimeInfo = readPngInfo(hotseatWinnerRuntime);
assert(JSON.stringify([hotseatWinnerMasterInfo.width, hotseatWinnerMasterInfo.height]) === JSON.stringify(hotseatWinner.masterSize), 'Green Hotseat Winner master dimenzija nije evidentirana.');
assert(JSON.stringify([hotseatWinnerRuntimeInfo.width, hotseatWinnerRuntimeInfo.height]) === JSON.stringify(hotseatWinner.runtimeSize), 'Green Hotseat Winner canonical dimenzija nije evidentirana.');
assert([4, 6].includes(hotseatWinnerMasterInfo.colorType) && [4, 6].includes(hotseatWinnerRuntimeInfo.colorType), 'Green Hotseat Winner asset nema direktan alpha kanal.');
assert(hotseatWinner.master === 'green-hotseat-winner-master-v1.png' && hotseatWinner.runtime === 'www/assets/green-soft-clay/canonical/hotseat-winner/hotseat-winner-v1.png', 'Green Hotseat Winner nema canonical konvenciju imena.');
assert(sha256File(hotseatWinnerMaster) === hotseatWinner.masterSha256, 'Green Hotseat Winner master otisak se ne poklapa.');
assert(sha256File(hotseatWinnerRuntime) === hotseatWinner.runtimeSha256, 'Green Hotseat Winner canonical runtime otisak se ne poklapa.');
assert(hotseatWinner.glyph === 'two clay player figures with a foreground forest-green winner, ivory check and one terracotta dot', 'Green Hotseat Winner semantička silueta je promenjena.');
assert(hotseatWinner.normalization === 'approved 512x512 source reduced proportionally to the full 256x256 transparent canvas with LANCZOS resampling', 'Green Hotseat Winner normalizacija nije precizno evidentirana.');
assert(greenHotseatWinnerRegistry.canonicalRuntime.length === 1 && greenHotseatWinnerRegistry.canonicalRuntime[0].role === 'hotseat-winner', 'Green Hotseat Winner registar mora imati tačno jedan canonical identitet.');
const hotseatWinnerRegistryAsset = greenHotseatWinnerRegistry.canonicalRuntime[0];
assert(hotseatWinnerRegistryAsset.path === hotseatWinner.runtime.replace(/^www\//, '') && hotseatWinnerRegistryAsset.size === 256 && hotseatWinnerRegistryAsset.sha256 === hotseatWinner.runtimeSha256, 'Green Hotseat Winner registry zapis se ne poklapa sa manifestom.');
const hotseatWinnerPath = 'assets/green-soft-clay/canonical/hotseat-winner/hotseat-winner-v1.png';
assert(JSON.stringify(greenHotseatWinnerRegistry.forbiddenRuntimePaths) === JSON.stringify(['assets/green-soft-clay/hotseat/winner-v1.png']), 'Green Hotseat Winner nema zaključanu staru runtime putanju.');
assert(greenHotseatWinnerRegistry.retiredMasterReplacements?.['hotseat/winner-v1.png'] === 'canonical/hotseat-winner/hotseat-winner-v1.png', 'Green Hotseat Winner istorijska master zamena je promenjena.');
assert(indexSource.split(hotseatWinnerPath).length - 1 === 1 && gameSource.split(hotseatWinnerPath).length - 1 === 1, 'Green Hotseat Winner canonical veze nisu kompletne.');
assert(gameSource.includes("hotseat: path => path.startsWith('hotseat/') || path.startsWith('mode-hotseat') || path.startsWith('canonical/hotseat-winner/')"), 'Green stvarni Hotseat room matcher ne prepoznaje canonical Winner paket.');
assert(gameSource.includes("gameOverScreen.classList.toggle('is-hotseat-result', isHotseatResult);") && gameSource.includes("gameOverScreen.classList.toggle('has-result-winner', isHotseatResult && !isDraw);"), 'Green Hotseat Winner više nije ograničen na odlučeni Hotseat rezultat.');
assert(gameSource.includes("gameOverScreen.classList.remove('is-solo-result', 'is-hotseat-result', 'has-result-winner');"), 'Online/tehnički rezultat više ne čisti Hotseat Winner stanje.');
const hotseatWinnerDisplayRule = themeCssSource.match(/#game-over-screen\.is-hotseat-result\.has-result-winner \.green-hotseat-winner-mark\s*\{([\s\S]*?)\}/)?.[1] || '';
assert(hotseatWinnerDisplayRule.includes('display: block') && hotseatWinnerDisplayRule.includes('width: 58px') && hotseatWinnerDisplayRule.includes('height: 58px'), 'Green Hotseat Winner zaključani 58x58 prikaz je promenjen.');
assert(themeCssSource.includes('animation: easterSoloFinishReveal .48s cubic-bezier(.22, 1, .36, 1) both;'), 'Green Hotseat Winner reveal motion je promenjen.');
assert(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?#game-over-screen\.is-hotseat-result\.screen\.active \.green-hotseat-winner-mark\s*\{[\s\S]*?animation: none !important;/.test(themeCssSource), 'Green Hotseat Winner reduced-motion zaštita je izgubljena.');
for (const exclusion of ['Statistics wins, draws and losses', 'Tournament champion and finalist awards', 'Quarterly League champion, rank and podium identities', 'Solo result marks and actions', 'Online, Invite and technical results', 'Tournament completed-match state', 'Invite accepted and Treasury owned states']) {
    assert(greenHotseatWinnerManifest.semanticExclusions.includes(exclusion), `Hotseat Winner manifest ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(greenHotseatWinnerManifest.integration?.gameOverConsumer === 'connected' && greenHotseatWinnerManifest.integration?.roomOnDemand === 'connected' && greenHotseatWinnerManifest.integration?.legacyRuntime === 'retired in standardization step 3', 'Green Hotseat Winner integracija nije kompletno evidentirana.');
assert(greenSoloResultsRegistry?.status === 'locked', 'Green Solo Results porodica mora biti zaključana u centralnom registru.');
assert(greenSoloResultsManifest.status === 'locked', 'Green Solo Results source manifest mora biti zaključan.');
const expectedSoloResultIds = ['personal-best', 'finish-score-mark', 'finish-claim'];
const expectedSoloResultDisplaySizes = [[30, 30], [42, 42], [29, 29]];
const expectedSoloResultForbiddenPaths = [
    'assets/green-soft-clay/solo/personal-best-v1.png',
    'assets/green-soft-clay/solo/finish-score-mark-v1.png',
    'assets/green-soft-clay/solo/finish-claim-v1.png'
];
const expectedSoloResultRetiredReplacements = {
    'solo/personal-best-v1.png': 'canonical/solo-results/personal-best-v1.png',
    'solo/finish-score-mark-v1.png': 'canonical/solo-results/finish-score-mark-v1.png',
    'solo/finish-claim-v1.png': 'canonical/solo-results/finish-claim-v1.png'
};
assert(greenSoloResultsManifest.catalog.length === 3, 'Green Solo Results paket mora imati tačno tri identiteta.');
assert(JSON.stringify(greenSoloResultsManifest.catalog.map(asset => asset.id)) === JSON.stringify(expectedSoloResultIds), 'Green Solo Results nema tačan katalog ili redosled identiteta.');
assert(greenSoloResultsManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenSoloResultsManifest.identity?.palette === 'forest-green, warm-ivory and one terracotta accent' && greenSoloResultsManifest.identity?.mapping === 'one immutable PNG identity for each Solo result status, score mark and claim action', 'Green Solo Results vizuelni DNK ili ID mapiranje je promenjeno.');
assert(JSON.stringify(greenSoloResultsRegistry.identity) === JSON.stringify(greenSoloResultsManifest.identity), 'Green Solo Results registar i manifest nemaju isti zaključani identitet.');
assert(JSON.stringify(greenSoloResultsManifest.catalog.map(asset => asset.displaySize)) === JSON.stringify(expectedSoloResultDisplaySizes), 'Green Solo Results prikazne dimenzije su promenjene.');
assert(JSON.stringify(greenSoloResultsRegistry.forbiddenRuntimePaths) === JSON.stringify(expectedSoloResultForbiddenPaths), 'Green Solo Results zabranjene legacy putanje su promenjene.');
assert(JSON.stringify(greenSoloResultsRegistry.retiredMasterReplacements) === JSON.stringify(expectedSoloResultRetiredReplacements), 'Green Solo Results istorijsko mapiranje canonical zamena je promenjeno.');
const expectedSoloResultGlyphs = [
    'three ascending forest-green bars on an ivory base with an ivory-green check medallion and one terracotta dot',
    'forest-green ring with one ivory four-point sparkle and one terracotta dot',
    'large ivory down arrow entering a forest-green receiver with one terracotta dot'
];
assert(JSON.stringify(greenSoloResultsManifest.catalog.map(asset => asset.glyph)) === JSON.stringify(expectedSoloResultGlyphs), 'Green Solo Results semantičke siluete su promenjene.');
assert(new Set(greenSoloResultsManifest.catalog.map(asset => asset.masterSha256)).size === 3, 'Green Solo Results sadrži dupliran master sadržaj.');
assert(new Set(greenSoloResultsManifest.catalog.map(asset => asset.runtimeSha256)).size === 3, 'Green Solo Results sadrži dupliran canonical runtime sadržaj.');
assert(greenSoloResultsRegistry.canonicalRuntime.length === 3, 'Green Solo Results registar mora imati tačno tri canonical runtime asseta.');
assert(new Set(greenSoloResultsRegistry.canonicalRuntime.map(asset => asset.role)).size === 3, 'Green Solo Results registry uloge moraju biti jedinstvene.');
const soloResultManifestPaths = greenSoloResultsManifest.catalog.map(asset => asset.runtime.replace(/^www\//, '')).sort();
const soloResultRegistryPaths = greenSoloResultsRegistry.canonicalRuntime.map(asset => asset.path).sort();
assert(JSON.stringify(soloResultManifestPaths) === JSON.stringify(soloResultRegistryPaths), 'Solo Results manifest i centralni registar nemaju isti runtime katalog.');
for (const asset of greenSoloResultsManifest.catalog) {
    const master = path.join(path.dirname(greenSoloResultsManifestPath), asset.master);
    const runtime = path.join(root, asset.runtime);
    const activeRuntime = path.join(root, asset.activeRuntime);
    assert(fs.existsSync(master), `Nedostaje Green Solo Result master: ${master}`);
    assert(fs.existsSync(runtime), `Nedostaje Green Solo Result canonical runtime: ${runtime}`);
    assert(!fs.existsSync(activeRuntime), `Stari Green Solo Result runtime nije uklonjen: ${activeRuntime}`);
    const masterInfo = readPngInfo(master);
    const runtimeInfo = readPngInfo(runtime);
    assert(JSON.stringify([masterInfo.width, masterInfo.height]) === JSON.stringify(asset.masterSize), `Green Solo Result master dimenzija nije evidentirana: ${asset.id}`);
    assert(JSON.stringify([runtimeInfo.width, runtimeInfo.height]) === JSON.stringify(asset.runtimeSize), `Green Solo Result canonical dimenzija nije evidentirana: ${asset.id}`);
    assert([4, 6].includes(masterInfo.colorType) && [4, 6].includes(runtimeInfo.colorType), `Green Solo Result asset nema direktan alpha kanal: ${asset.id}`);
    assert(asset.master === `green-${asset.id}-master-v1.png`, `Green Solo Result nema canonical master ime: ${asset.id}`);
    assert(asset.runtime === `www/assets/green-soft-clay/canonical/solo-results/${asset.id}-v1.png`, `Green Solo Result nema canonical runtime ime: ${asset.id}`);
    assert(sha256File(master) === asset.masterSha256, `Green Solo Result master otisak se ne poklapa: ${asset.id}`);
    assert(sha256File(runtime) === asset.runtimeSha256, `Green Solo Result canonical runtime otisak se ne poklapa: ${asset.id}`);
    assert(asset.normalization === 'approved 512x512 source reduced proportionally to the full 256x256 transparent canvas with LANCZOS resampling', `Green Solo Result normalizacija nije precizno evidentirana: ${asset.id}`);
    const registryAsset = greenSoloResultsRegistry.canonicalRuntime.find(candidate => candidate.role === asset.id);
    assert(registryAsset, `Green Solo Results registry nema ulogu: ${asset.id}`);
    assert(registryAsset.path === asset.runtime.replace(/^www\//, '') && registryAsset.size === 256 && registryAsset.sha256 === asset.runtimeSha256, `Green Solo Results registry zapis se ne poklapa: ${asset.id}`);
    const canonicalPath = asset.runtime.replace(/^www\//, '');
    assert(indexSource.split(canonicalPath).length - 1 === 1 && gameSource.split(canonicalPath).length - 1 === 1, `Green Solo Result canonical veze nisu kompletne: ${asset.id}`);
}
assert(gameSource.includes("solo: path => path.startsWith('solo/') || path.startsWith('mode-solo') || path.startsWith('canonical/solo-results/')"), 'Green stvarni Solo room matcher ne prepoznaje canonical Results paket.');
assert(gameSource.includes('const soloHighscoreBeforeGame = Math.max(0, Number(this.stats && this.stats.highscore) || 0);') && gameSource.includes('isNewSoloPersonalBest = this.players.length === 1') && gameSource.includes('&& Number(myScoreEntry.score) > soloHighscoreBeforeGame;') && gameSource.includes('if (personalBestBadge) personalBestBadge.hidden = !isNewSoloPersonalBest;'), 'Green Solo Personal Best više nije vezan isključivo za stvarni novi Solo rekord.');
assert(gameSource.includes("gameOverScreen.classList.toggle('is-solo-result', this.players.length === 1);"), 'Green Solo Results prikaz više nije ograničen na Solo rezultat.');
assert(indexSource.includes('<button class="btn-menu btn-secondary game-over-claim-button" onclick="app.claimReward(false)">'), 'Green Solo Finish Claim više nije povezan sa osnovnom claimReward(false) akcijom.');
assert(gameSource.includes('async claimReward(doubled) {') && gameSource.includes('if (this.rewardClaimed || this.rewardClaimInProgress) return;'), 'Solo reward claim zaštita od duplog preuzimanja je promenjena.');
assert(/#game-over-screen\.is-solo-result \.green-solo-finish-score-mark\s*\{[^}]*width:\s*42px;[^}]*height:\s*42px;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Solo Final Score Mark mora ostati 42 × 42 sa contain prikazom.');
assert(/#game-over-screen \.green-solo-personal-best-icon\s*\{[^}]*width:\s*30px;[^}]*height:\s*30px;[^}]*flex:\s*0 0 30px;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Solo Personal Best glyph mora ostati 30 × 30 sa contain prikazom.');
assert(/#game-over-screen\.is-solo-result \.green-solo-finish-action-icon\s*\{[^}]*width:\s*29px;[^}]*height:\s*29px;[^}]*flex:\s*0 0 29px;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Solo Finish Claim glyph mora ostati 29 × 29 sa contain prikazom.');
assert(themeCssSource.includes('#game-over-screen.is-solo-result .green-solo-result-mark,') && themeCssSource.includes('#game-over-screen.is-solo-result .game-over-ducat-legacy,') && themeCssSource.includes('display: none !important;'), 'Green Solo završni prikaz više ne skriva generički result mark i legacy dukat.');
assert(themeCssSource.includes('animation: easterSoloFinishReveal .48s cubic-bezier(.22, 1, .36, 1) both;') && themeCssSource.includes('#game-over-screen.is-solo-result.screen.active #go-msg { animation-delay: .06s; }') && themeCssSource.includes('#game-over-screen.is-solo-result.screen.active .game-over-score-card { animation-delay: .12s; }') && themeCssSource.includes('#game-over-screen.is-solo-result.screen.active #btn-ad-double { animation-delay: .18s; }') && themeCssSource.includes('#game-over-screen.is-solo-result.screen.active .game-over-claim-button { animation-delay: .24s; }'), 'Green Solo Results reveal motion ili redosled više nije zaključan.');
assert(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?#game-over-screen\.is-solo-result\.screen\.active \.game-over-claim-button\s*\{\s*animation:\s*none !important;/s.test(themeCssSource), 'Green Solo Results nema zaključanu reduced-motion zaštitu.');
for (const exclusion of ['main Solo menu and intro identity', 'locked Rewarded Video and canonical dukat families', 'Statistics record, wins and aggregate metrics', 'Hotseat Winner identity', 'Online, Invite and technical results', 'Tournament awards and states', 'Daily and Treasury states']) {
    assert(greenSoloResultsManifest.semanticExclusions.includes(exclusion), `Solo Results manifest ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(greenRewardedVideoRegistry.compositeRuntime.some(asset => asset.role === 'solo-double-reward' && asset.path === 'assets/green-soft-clay/solo/finish-reward-video-v3.png'), 'Solo Rewarded Video kompozicija mora ostati u zaključanoj Rewarded Video porodici.');
assert(greenSoloResultsManifest.integration?.personalBestState === 'connected' && greenSoloResultsManifest.integration?.scoreDisplay === 'connected' && greenSoloResultsManifest.integration?.claimAction === 'connected' && greenSoloResultsManifest.integration?.roomOnDemand === 'connected' && greenSoloResultsManifest.integration?.legacyRuntime === 'retired in standardization step 3' && greenSoloResultsManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Solo Results integracija i završni audit nisu kompletno evidentirani.');
assert(greenStatisticsOverviewRegistry?.status === 'locked', 'Green Statistics Overview porodica mora biti zaključana u centralnom registru.');
assert(greenStatisticsOverviewManifest.status === 'locked', 'Green Statistics Overview source manifest mora biti zaključan.');
assert(greenThemeManifest.version === 50, 'Green tema mora imati cache verziju 50 posle Daily Room Identity integracije.');
const expectedStatisticsOverviewIds = ['power-index', 'record', 'games', 'wins', 'draws', 'losses', 'fire-streak', 'average', 'trophies', 'all-time-points'];
const expectedStatisticsOverviewGlyphs = [
    'ivory lightning bolt inside a forest-green ring with one terracotta dot',
    'ascending ivory path with forest-green nodes and one terracotta arrowhead',
    'vertical stack of three rounded dice showing one, three and five pips',
    'large ivory check on a forest-green base with one terracotta star',
    'two ivory horizontal bars with forest-green end caps and one terracotta center dot',
    'terracotta downward chevron above one ivory dot and a forest-green base',
    'terracotta outer flame with an ivory center and a forest-green inner drop',
    'three ascending forest-green bars crossed by an ivory average line with one terracotta dot',
    'ivory trophy with one terracotta star and a forest-green base',
    'forest-green orbital construction around one ivory star with one terracotta dot'
];
const expectedStatisticsOverviewDisplaySizes = [
    [[94, 94], [27, 27], [16, 16]],
    [[19, 19]],
    [[19, 19]],
    [[14, 14]],
    [[14, 14]],
    [[14, 14]],
    [[24, 24], [32, 32], [23, 23]],
    [[24, 24]],
    [[24, 24]],
    [[24, 24]]
];
const expectedStatisticsOverviewActiveFiles = {
    'power-index': 'power-index-bolt-v1.png',
    record: 'record-v1.png',
    games: 'games-v1.png',
    wins: 'wins-v1.png',
    draws: 'draws-v1.png',
    losses: 'losses-v1.png',
    'fire-streak': 'fire-streak-v1.png',
    average: 'average-v1.png',
    trophies: 'trophies-v1.png',
    'all-time-points': 'all-time-points-v1.png'
};
const expectedStatisticsOverviewReferenceCounts = {
    'power-index': 5,
    record: 3,
    games: 2,
    wins: 3,
    draws: 3,
    losses: 2,
    'fire-streak': 6,
    average: 3,
    trophies: 2,
    'all-time-points': 3
};
assert(greenStatisticsOverviewManifest.catalog.length === 10, 'Green Statistics Overview paket mora imati tačno deset identiteta.');
assert(JSON.stringify(greenStatisticsOverviewManifest.catalog.map(asset => asset.id)) === JSON.stringify(expectedStatisticsOverviewIds), 'Green Statistics Overview nema tačan katalog ili redosled identiteta.');
assert(JSON.stringify(greenStatisticsOverviewManifest.catalog.map(asset => asset.glyph)) === JSON.stringify(expectedStatisticsOverviewGlyphs), 'Green Statistics Overview semantičke siluete su promenjene.');
assert(JSON.stringify(greenStatisticsOverviewManifest.catalog.map(asset => asset.displaySizes)) === JSON.stringify(expectedStatisticsOverviewDisplaySizes), 'Green Statistics Overview prikazne dimenzije nisu tačno evidentirane.');
assert(greenStatisticsOverviewManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenStatisticsOverviewManifest.identity?.palette === 'forest-green, warm-ivory and one terracotta accent' && greenStatisticsOverviewManifest.identity?.mapping === 'one immutable PNG identity for each Statistics Overview metric', 'Green Statistics Overview vizuelni DNK ili ID mapiranje je promenjeno.');
assert(JSON.stringify(greenStatisticsOverviewRegistry.identity) === JSON.stringify(greenStatisticsOverviewManifest.identity), 'Green Statistics Overview registar i manifest nemaju isti identitet.');
assert(new Set(greenStatisticsOverviewManifest.catalog.map(asset => asset.masterSha256)).size === 10, 'Green Statistics Overview sadrži dupliran master sadržaj.');
assert(new Set(greenStatisticsOverviewManifest.catalog.map(asset => asset.runtimeSha256)).size === 10, 'Green Statistics Overview sadrži dupliran canonical runtime sadržaj.');
assert(greenStatisticsOverviewRegistry.canonicalRuntime.length === 10 && new Set(greenStatisticsOverviewRegistry.canonicalRuntime.map(asset => asset.role)).size === 10, 'Green Statistics Overview registar mora imati deset jedinstvenih canonical uloga.');
const expectedStatisticsOverviewForbiddenPaths = expectedStatisticsOverviewIds.map(id => `assets/green-soft-clay/statistics/${expectedStatisticsOverviewActiveFiles[id]}`);
const expectedStatisticsOverviewRetiredReplacements = Object.fromEntries(expectedStatisticsOverviewIds.map(id => [
    `statistics/${expectedStatisticsOverviewActiveFiles[id]}`,
    `canonical/statistics-overview/${id}-v1.png`
]));
assert(JSON.stringify(greenStatisticsOverviewRegistry.forbiddenRuntimePaths) === JSON.stringify(expectedStatisticsOverviewForbiddenPaths), 'Green Statistics Overview zabranjene legacy putanje nisu kompletne.');
assert(JSON.stringify(greenStatisticsOverviewRegistry.retiredMasterReplacements) === JSON.stringify(expectedStatisticsOverviewRetiredReplacements), 'Green Statistics Overview istorijsko mapiranje canonical zamena nije kompletno.');
const statisticsOverviewConsumerSources = [indexSource, gameSource, rulesSource, powerIndexSource, fireStreakSource];
for (const asset of greenStatisticsOverviewManifest.catalog) {
    const master = path.join(path.dirname(greenStatisticsOverviewManifestPath), asset.master);
    const runtime = path.join(root, asset.runtime);
    const activeRuntime = path.join(root, asset.activeRuntime);
    assert(fs.existsSync(master), `Nedostaje Green Statistics Overview master: ${master}`);
    assert(fs.existsSync(runtime), `Nedostaje Green Statistics Overview canonical runtime: ${runtime}`);
    assert(!fs.existsSync(activeRuntime), `Stari Green Statistics Overview runtime nije uklonjen: ${activeRuntime}`);
    const masterInfo = readPngInfo(master);
    const runtimeInfo = readPngInfo(runtime);
    assert(JSON.stringify([masterInfo.width, masterInfo.height]) === JSON.stringify(asset.masterSize) && masterInfo.width === 1254 && masterInfo.height === 1254, `Green Statistics Overview master dimenzija nije 1254 × 1254: ${asset.id}`);
    assert(JSON.stringify([runtimeInfo.width, runtimeInfo.height]) === JSON.stringify(asset.runtimeSize) && runtimeInfo.width === 256 && runtimeInfo.height === 256, `Green Statistics Overview canonical dimenzija nije 256 × 256: ${asset.id}`);
    assert([4, 6].includes(masterInfo.colorType) && [4, 6].includes(runtimeInfo.colorType), `Green Statistics Overview asset nema direktan alpha kanal: ${asset.id}`);
    assert(asset.master === `green-${asset.id}-master-v1.png`, `Green Statistics Overview nema canonical master ime: ${asset.id}`);
    assert(asset.runtime === `www/assets/green-soft-clay/canonical/statistics-overview/${asset.id}-v1.png`, `Green Statistics Overview nema canonical runtime ime: ${asset.id}`);
    assert(asset.activeRuntime === `www/assets/green-soft-clay/statistics/${expectedStatisticsOverviewActiveFiles[asset.id]}`, `Green Statistics Overview nema tačnu aktivnu legacy putanju: ${asset.id}`);
    assert(sha256File(master) === asset.masterSha256, `Green Statistics Overview master otisak se ne poklapa: ${asset.id}`);
    assert(sha256File(runtime) === asset.runtimeSha256, `Green Statistics Overview canonical runtime otisak se ne poklapa: ${asset.id}`);
    assert(asset.runtimeSha256 === asset.activeRuntimeSha256, `Green Statistics Overview canonical i aktivni runtime nisu bajt-po-bajt identični: ${asset.id}`);
    assert(asset.normalization === 'approved 1254x1254 source reduced proportionally to the full 256x256 transparent canvas with LANCZOS resampling', `Green Statistics Overview normalizacija nije precizno evidentirana: ${asset.id}`);
    const registryAsset = greenStatisticsOverviewRegistry.canonicalRuntime.find(candidate => candidate.role === asset.id);
    assert(registryAsset, `Green Statistics Overview registry nema ulogu: ${asset.id}`);
    assert(registryAsset.path === asset.runtime.replace(/^www\//, '') && registryAsset.size === 256 && registryAsset.sha256 === asset.runtimeSha256, `Green Statistics Overview registry zapis se ne poklapa: ${asset.id}`);
    const canonicalPath = asset.runtime.replace(/^www\//, '');
    const activePath = asset.activeRuntime.replace(/^www\//, '');
    const canonicalReferenceCount = statisticsOverviewConsumerSources.reduce((count, source) => count + source.split(canonicalPath).length - 1, 0);
    const activeReferenceCount = statisticsOverviewConsumerSources.reduce((count, source) => count + source.split(activePath).length - 1, 0);
    assert(canonicalReferenceCount === expectedStatisticsOverviewReferenceCounts[asset.id], `Green Statistics Overview nema očekivan broj canonical veza: ${asset.id} (${canonicalReferenceCount}).`);
    assert(activeReferenceCount === 0, `Green Statistics Overview još ima aktivnu legacy vezu: ${asset.id} (${activeReferenceCount}).`);
}
for (const exclusion of ['H2H overview, empty and detail identities', 'main Statistics menu and intro identity', 'locked canonical dukat and Economy identities', 'Solo Results and Hotseat Winner identities', 'Tournament awards, states and navigation', 'individual Achievement Trophies', 'Treasury navigation and item states', 'gameplay dice, dice skins, navigation arrows and Undo token']) {
    assert(greenStatisticsOverviewManifest.semanticExclusions.includes(exclusion), `Statistics Overview manifest ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(Object.values(greenStatisticsOverviewManifest.integration || {}).filter(value => value === 'connected').length === 5 && greenStatisticsOverviewManifest.integration?.legacyRuntime === 'retired in standardization step 3' && greenStatisticsOverviewManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Statistics Overview integracija i završni audit nisu kompletno evidentirani.');
assert(indexSource.includes('assets/green-soft-clay/canonical/ducat/ducat-inline-v1.png?v=1'), 'Statistics balance mora nastaviti da koristi zaključani canonical dukat.');
assert(indexSource.includes('assets/green-soft-clay/canonical/h2h-statistics/h2h-identity-v1.png?v=1') && gameSource.includes('assets/green-soft-clay/canonical/h2h-statistics/h2h-empty-v1.png?v=1') && gameSource.includes('assets/green-soft-clay/canonical/h2h-statistics/highest-score-v1.png?v=1'), 'H2H identiteti moraju ostati u zasebnom canonical H2H paketu.');
assert(gameSource.includes("statistics: path => path.startsWith('statistics/') || path.startsWith('statistics-') || path.startsWith('canonical/statistics-overview/') || path.startsWith('canonical/h2h-statistics/')"), 'Green Statistics room matcher ne prepoznaje canonical Overview i H2H pakete.');
assert(/#stats-screen \.stats-category-soft-clay-icon-green\s*\{[^}]*width:\s*19px;[^}]*height:\s*19px;[^}]*flex:\s*0 0 19px;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Statistics Record/Games glyph mora ostati 19 × 19 sa contain prikazom.');
assert(/#stats-screen \.stats-result-soft-clay-icon-green\s*\{[^}]*width:\s*14px;[^}]*height:\s*14px;[^}]*flex:\s*0 0 14px;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Statistics Wins/Draws/Losses glyph mora ostati 14 × 14 sa contain prikazom.');
assert(/#stats-screen \.stats-grid-soft-clay-icon-green\s*\{[^}]*width:\s*24px;[^}]*height:\s*24px;[^}]*flex:\s*0 0 24px;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Statistics grid glyph mora ostati 24 × 24 sa contain prikazom.');
assert(/#stats-screen \.power-index-watermark-bolt-green\s*\{[^}]*width:\s*94px;[^}]*height:\s*94px;[^}]*opacity:\s*\.16;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Power Index watermark mora ostati 94 × 94 sa kontrolisanom neprovidnošću.');
assert(/\.power-index-title-bolt-green\s*\{[^}]*width:\s*27px;[^}]*height:\s*27px;/s.test(themeCssSource) && /\.power-index-value-bolt-green\s*\{[^}]*width:\s*16px;[^}]*height:\s*16px;/s.test(themeCssSource), 'Green Power Index modalne dimenzije više nisu 27 × 27 i 16 × 16.');
assert(/#streak-overlay \.fire-streak-title-soft-clay-icon-green\s*\{[^}]*width:\s*32px;[^}]*height:\s*32px;[^}]*flex:\s*0 0 32px;/s.test(themeCssSource) && /\.fire-streak-value-soft-clay-icon-green\s*\{[^}]*width:\s*23px;[^}]*height:\s*23px;/s.test(themeCssSource), 'Green Fire Streak modalne dimenzije više nisu 32 × 32 i 23 × 23.');
assert(indexSource.includes('onclick="if(window.powerIndexLeaderboard) window.powerIndexLeaderboard.openModal()"') && indexSource.includes('onclick="if(window.vatreniNiz) window.vatreniNiz.openModal()"') && indexSource.includes('onclick="riznicaManager.open()"'), 'Green Statistics kartice više nemaju zaključane Power Index, Fire Streak i Riznica akcije.');
assert(gameSource.includes("document.getElementById('stat-games').innerText = this.stats.games;") && gameSource.includes("document.getElementById('stat-high').innerText = this.stats.highscore;") && gameSource.includes("document.getElementById('stat-wins').innerText = h2hRecord.wins;") && gameSource.includes('if (drawsEl) drawsEl.innerText = h2hRecord.draws;') && gameSource.includes("document.getElementById('stat-losses').innerText = h2hRecord.losses;"), 'Green Statistics osnovne metrike više nisu vezane za očekivane izvore podataka.');
assert(gameSource.includes('const avg = this.stats.games > 0 ? Math.round(this.stats.totalScoreSum / this.stats.games) : 0;') && gameSource.includes('let powerIndex = this.calculatePowerIndex(this.getFullLocalStats(), true);') && gameSource.includes('const realTrophyCount = window.powerIndexCore ? window.powerIndexCore.countPowerIndexTrophies(trophyList) : 0;') && gameSource.includes('let currentStreak = this.stats.currentWinStreak || 0;') && gameSource.includes('const allTimePts = this.stats.totalScoreSum || 0;'), 'Green Statistics izvedene metrike više nisu vezane za očekivane izvore podataka.');
assert(greenH2HStatisticsRegistry?.status === 'locked', 'Green H2H Statistics porodica mora biti zaključana u centralnom registru.');
assert(greenH2HStatisticsManifest.status === 'locked', 'Green H2H Statistics source manifest mora biti zaključan.');
assert(greenThemeManifest.version === 50, 'Green tema mora zadržati cache verziju 50 posle Daily Room Identity integracije.');
assert(JSON.stringify(greenH2HStatisticsRegistry.identity) === JSON.stringify(greenH2HStatisticsManifest.identity), 'Green H2H Statistics registar i manifest nemaju isti identitet.');
assert(greenH2HStatisticsManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenH2HStatisticsManifest.identity?.palette === 'forest-green, warm-ivory and one terracotta accent' && greenH2HStatisticsManifest.identity?.mapping === 'one immutable PNG identity per concept, shared with locked Statistics Overview when the concept is identical', 'Green H2H Statistics vizuelni DNK ili pravilo deljenja identiteta je promenjeno.');
const expectedH2HCanonicalIds = ['h2h-identity', 'h2h-empty', 'highest-score', 'max-win-margin', 'worst-loss-margin', 'versus'];
const expectedH2HCanonicalGlyphs = [
    'two opposing rounded player portraits separated by one ivory vertical bar and a forest-green center dot',
    'two empty ivory rounded portrait frames separated by one terracotta vertical bar',
    'three ascending forest-green bars ending in an ivory star with three terracotta rays',
    'opposing ivory arrows joined by a forest-green line with one terracotta center dot',
    'ivory shield placed over a terracotta downward chevron and a forest-green base',
    'ivory VS letters inside a forest-green disk and ivory ring with one terracotta center dot'
];
const expectedH2HDisplaySizes = [
    [[16, 16], [29, 29], ['responsive-inline', 'responsive-inline']],
    [[92, 92], [54, 54]],
    [[26, 26]],
    [[26, 26]],
    [[26, 26]],
    [[50, 50]]
];
const expectedH2HActiveReferenceCounts = {
    'h2h-identity': 4,
    'h2h-empty': 3,
    'highest-score': 2,
    'max-win-margin': 2,
    'worst-loss-margin': 2,
    versus: 2
};
assert(greenH2HStatisticsManifest.catalog.length === 6, 'Green H2H Statistics paket mora imati tačno šest sopstvenih canonical identiteta.');
assert(JSON.stringify(greenH2HStatisticsManifest.catalog.map(asset => asset.id)) === JSON.stringify(expectedH2HCanonicalIds), 'Green H2H Statistics nema tačan canonical katalog ili redosled.');
assert(JSON.stringify(greenH2HStatisticsManifest.catalog.map(asset => asset.glyph)) === JSON.stringify(expectedH2HCanonicalGlyphs), 'Green H2H Statistics semantičke siluete su promenjene.');
assert(JSON.stringify(greenH2HStatisticsManifest.catalog.map(asset => asset.displaySizes)) === JSON.stringify(expectedH2HDisplaySizes), 'Green H2H Statistics prikazne dimenzije nisu tačno evidentirane.');
assert(new Set(greenH2HStatisticsManifest.catalog.map(asset => asset.masterSha256)).size === 6 && new Set(greenH2HStatisticsManifest.catalog.map(asset => asset.runtimeSha256)).size === 6, 'Green H2H Statistics sadrži dupliran sopstveni canonical sadržaj.');
assert(greenH2HStatisticsRegistry.canonicalRuntime.length === 6 && new Set(greenH2HStatisticsRegistry.canonicalRuntime.map(asset => asset.role)).size === 6, 'Green H2H Statistics registar mora imati šest jedinstvenih canonical uloga.');
const expectedH2HForbiddenPaths = [
    'assets/green-soft-clay/statistics/h2h-v1.png',
    'assets/green-soft-clay/statistics/h2h-empty-v1.png',
    'assets/green-soft-clay/statistics/h2h-detail/highest-score-v1.png',
    'assets/green-soft-clay/statistics/h2h-detail/max-margin-v1.png',
    'assets/green-soft-clay/statistics/h2h-detail/worst-loss-v1.png',
    'assets/green-soft-clay/statistics/h2h-detail/win-streak-v1.png',
    'assets/green-soft-clay/statistics/h2h-detail/draw-v1.png',
    'assets/green-soft-clay/statistics/h2h-detail/average-v1.png',
    'assets/green-soft-clay/statistics/h2h-detail/vs-v1.png'
];
const expectedH2HRetiredReplacements = {
    'statistics/h2h-v1.png': 'canonical/h2h-statistics/h2h-identity-v1.png',
    'statistics/h2h-empty-v1.png': 'canonical/h2h-statistics/h2h-empty-v1.png',
    'statistics/h2h-detail/highest-score-v1.png': 'canonical/h2h-statistics/highest-score-v1.png',
    'statistics/h2h-detail/max-margin-v1.png': 'canonical/h2h-statistics/max-win-margin-v1.png',
    'statistics/h2h-detail/worst-loss-v1.png': 'canonical/h2h-statistics/worst-loss-margin-v1.png',
    'statistics/h2h-detail/win-streak-v1.png': 'canonical/statistics-overview/fire-streak-v1.png',
    'statistics/h2h-detail/draw-v1.png': 'canonical/statistics-overview/draws-v1.png',
    'statistics/h2h-detail/average-v1.png': 'canonical/statistics-overview/average-v1.png',
    'statistics/h2h-detail/vs-v1.png': 'canonical/h2h-statistics/versus-v1.png'
};
assert(JSON.stringify(greenH2HStatisticsRegistry.forbiddenRuntimePaths) === JSON.stringify(expectedH2HForbiddenPaths), 'Green H2H Statistics zabranjene legacy putanje nisu kompletne.');
assert(JSON.stringify(greenH2HStatisticsRegistry.retiredMasterReplacements) === JSON.stringify(expectedH2HRetiredReplacements), 'Green H2H Statistics istorijsko mapiranje canonical zamena nije kompletno.');
const h2hConsumerSources = [indexSource, gameSource, rulesSource];
for (const asset of greenH2HStatisticsManifest.catalog) {
    const master = path.join(path.dirname(greenH2HStatisticsManifestPath), asset.master);
    const runtime = path.join(root, asset.runtime);
    const activeRuntime = path.join(root, asset.activeRuntime);
    assert(fs.existsSync(master), `Nedostaje Green H2H Statistics master: ${master}`);
    assert(fs.existsSync(runtime), `Nedostaje Green H2H Statistics canonical runtime: ${runtime}`);
    assert(!fs.existsSync(activeRuntime), `Stari Green H2H Statistics runtime nije uklonjen: ${activeRuntime}`);
    const masterInfo = readPngInfo(master);
    const runtimeInfo = readPngInfo(runtime);
    assert(JSON.stringify([masterInfo.width, masterInfo.height]) === JSON.stringify(asset.masterSize), `Green H2H Statistics master dimenzija odstupa: ${asset.id}`);
    assert(JSON.stringify([runtimeInfo.width, runtimeInfo.height]) === JSON.stringify(asset.runtimeSize), `Green H2H Statistics canonical dimenzija odstupa: ${asset.id}`);
    assert([4, 6].includes(masterInfo.colorType) && [4, 6].includes(runtimeInfo.colorType), `Green H2H Statistics asset nema direktan alpha kanal: ${asset.id}`);
    assert(asset.master === `green-${asset.id}-master-v1.png`, `Green H2H Statistics nema canonical master ime: ${asset.id}`);
    assert(asset.runtime === `www/assets/green-soft-clay/canonical/h2h-statistics/${asset.id}-v1.png`, `Green H2H Statistics nema canonical runtime ime: ${asset.id}`);
    assert(sha256File(master) === asset.masterSha256, `Green H2H Statistics master otisak se ne poklapa: ${asset.id}`);
    assert(sha256File(runtime) === asset.runtimeSha256, `Green H2H Statistics canonical runtime otisak se ne poklapa: ${asset.id}`);
    assert(asset.runtimeSha256 === asset.activeRuntimeSha256, `Green H2H Statistics canonical i istorijski aktivni runtime nisu bajt-po-bajt identični: ${asset.id}`);
    assert(asset.normalization === 'approved native source reduced proportionally to the declared transparent runtime canvas with LANCZOS resampling', `Green H2H Statistics normalizacija nije precizno evidentirana: ${asset.id}`);
    const canonicalPath = asset.runtime.replace(/^www\//, '');
    const activePath = asset.activeRuntime.replace(/^www\//, '');
    const canonicalReferenceCount = h2hConsumerSources.reduce((count, source) => count + source.split(canonicalPath).length - 1, 0);
    const activeReferenceCount = h2hConsumerSources.reduce((count, source) => count + source.split(activePath).length - 1, 0);
    assert(canonicalReferenceCount === expectedH2HActiveReferenceCounts[asset.id], `Green H2H Statistics nema očekivan broj canonical veza: ${asset.id} (${canonicalReferenceCount}).`);
    assert(activeReferenceCount === 0, `Green H2H Statistics još ima aktivnu legacy vezu: ${asset.id} (${activeReferenceCount}).`);
    const registryAsset = greenH2HStatisticsRegistry.canonicalRuntime.find(candidate => candidate.role === asset.id);
    assert(registryAsset?.path === canonicalPath && registryAsset?.sha256 === asset.runtimeSha256, `Green H2H Statistics registry zapis se ne poklapa: ${asset.id}`);
    const expectedWidth = registryAsset.width || registryAsset.size;
    const expectedHeight = registryAsset.height || registryAsset.size;
    assert(expectedWidth === asset.runtimeSize[0] && expectedHeight === asset.runtimeSize[1], `Green H2H Statistics registry dimenzija odstupa: ${asset.id}`);
}
const expectedH2HExternalReferences = [
    ['win-streak', 'fire-streak', 'assets/green-soft-clay/canonical/statistics-overview/fire-streak-v1.png', 'assets/green-soft-clay/statistics/h2h-detail/win-streak-v1.png'],
    ['draws', 'draws', 'assets/green-soft-clay/canonical/statistics-overview/draws-v1.png', 'assets/green-soft-clay/statistics/h2h-detail/draw-v1.png'],
    ['average', 'average', 'assets/green-soft-clay/canonical/statistics-overview/average-v1.png', 'assets/green-soft-clay/statistics/h2h-detail/average-v1.png']
];
assert(greenH2HStatisticsManifest.externalCanonicalReferences.length === 3, 'Green H2H Statistics mora imati tačno tri spoljne canonical reference.');
assert(greenH2HStatisticsRegistry.externalCanonicalReferences.length === 3, 'Green H2H Statistics registar mora imati tačno tri spoljne canonical reference.');
for (const [index, [id, canonicalRole, canonicalPath, activePath]] of expectedH2HExternalReferences.entries()) {
    const reference = greenH2HStatisticsManifest.externalCanonicalReferences[index];
    const overviewAsset = greenStatisticsOverviewRegistry.canonicalRuntime.find(asset => asset.role === canonicalRole);
    const registryReference = greenH2HStatisticsRegistry.externalCanonicalReferences[index];
    assert(reference.id === id && reference.canonicalFamily === 'statisticsOverview' && reference.canonicalRole === canonicalRole, `Green H2H Statistics spoljna referenca nije pravilno mapirana: ${id}`);
    assert(reference.canonicalRuntime.replace(/^www\//, '') === canonicalPath && overviewAsset?.path === canonicalPath && reference.canonicalSha256 === overviewAsset?.sha256, `Green H2H Statistics spoljna canonical putanja ili hash odstupa: ${id}`);
    assert(registryReference?.role === id && registryReference?.family === 'statisticsOverview' && registryReference?.canonicalRole === canonicalRole && registryReference?.path === canonicalPath && registryReference?.sha256 === overviewAsset?.sha256, `Green H2H Statistics registry spoljna referenca odstupa: ${id}`);
    assert(reference.activeRuntime.replace(/^www\//, '') === activePath && !fs.existsSync(path.join(root, reference.activeRuntime)), `Green H2H Statistics aktivna duplikat putanja nije uklonjena: ${id}`);
    assert(!gameSource.includes(activePath), `Green H2H Statistics ${id} još koristi aktivnu legacy putanju.`);
    assert(gameSource.split(canonicalPath).length - 1 === 2, `Green H2H Statistics ${id} nema tačno globalnu i H2H canonical vezu.`);
}
assert(gameSource.includes("'win-streak': 'assets/green-soft-clay/canonical/statistics-overview/fire-streak-v1.png?v=1'") && gameSource.includes("draw: 'assets/green-soft-clay/canonical/statistics-overview/draws-v1.png?v=1'") && gameSource.includes("average: 'assets/green-soft-clay/canonical/statistics-overview/average-v1.png?v=1'"), 'Green H2H deljeni pojmovi nisu povezani na zaključane Overview identitete.');
assert(greenH2HStatisticsManifest.catalog.length + greenH2HStatisticsManifest.externalCanonicalReferences.length === 9, 'Green H2H Statistics manifest mora pokriti svih devet semantičkih uloga.');
assert(greenH2HStatisticsManifest.catalog.find(asset => asset.id === 'max-win-margin')?.masterSize.join('x') === '1774x887' && greenH2HStatisticsManifest.catalog.find(asset => asset.id === 'max-win-margin')?.runtimeSize.join('x') === '256x128', 'Green H2H Max Win Margin mora sačuvati native 2:1 format.');
for (const exclusion of ['aggregate Statistics Overview values and formulas', 'Solo Record and Personal Best identities', 'single-match Hotseat, Online and Invite result identities', 'Power Index, trophies, medals and league or tournament ranks', 'avatars and friend or online presence states', 'gameplay dice, dice skins, navigation and Economy identities']) {
    assert(greenH2HStatisticsManifest.semanticExclusions.includes(exclusion), `Green H2H Statistics manifest ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(Object.values(greenH2HStatisticsManifest.integration || {}).filter(value => value === 'connected').length === 6 && greenH2HStatisticsManifest.integration?.legacyRuntime === 'retired in standardization step 3' && greenH2HStatisticsManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green H2H Statistics integracija i završni audit nisu kompletno evidentirani.');
assert(gameSource.includes("const avg = r.gamesWithScore > 0 ? Math.round((r.myTotalScore || 0) / r.gamesWithScore) : 0;") && gameSource.includes('${r.myHighScore || 0}') && gameSource.includes('${r.maxWinMargin || 0}') && gameSource.includes('${r.maxLossMargin || 0}') && gameSource.includes('${r.currentWinStreak || 0}') && gameSource.includes('${r.draws || 0}'), 'Green H2H Statistics veze sa postojećim rival podacima su promenjene.');
assert(/#stats-screen \.stats-rival-soft-clay-icon\s*\{[^}]*width:\s*16px;[^}]*height:\s*16px;[^}]*flex-basis:\s*16px;/s.test(themeCssSource), 'Green H2H rival glyph mora ostati 16 × 16.');
assert(/#stats-screen \.stats-h2h-title-soft-clay-icon-green\s*\{[^}]*width:\s*29px;[^}]*height:\s*29px;[^}]*flex:\s*0 0 29px;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green H2H naslovni glyph mora ostati 29 × 29 sa contain prikazom.');
assert(/#stats-screen \.h2h-empty-soft-clay-icon\s*\{[^}]*width:\s*92px;[^}]*height:\s*92px;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green H2H empty-state glyph mora ostati 92 × 92 sa contain prikazom.');
assert(/\.h2h-detail-vs-icon-green\s*\{[^}]*width:\s*50px;[^}]*height:\s*50px;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green H2H VS glyph mora ostati 50 × 50 sa contain prikazom.');
assert(/\.h2h-detail-stat-icon-green\s*\{[^}]*width:\s*26px;[^}]*height:\s*26px;[^}]*flex:\s*0 0 26px;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green H2H detail glyph mora ostati 26 × 26 sa contain prikazom.');
assert(/#waiting-screen\.is-hosting-invite \.easter-invite-rival-img\s*\{[^}]*width:\s*54px;[^}]*height:\s*54px;[^}]*object-fit:\s*cover;/s.test(themeCssSource) && /#waiting-screen\.is-hosting-invite \.easter-invite-rival-card\.is-empty \.easter-invite-rival-img\s*\{[^}]*object-fit:\s*contain;[^}]*padding:\s*2px;[^}]*border-radius:\s*12px;/s.test(themeCssSource), 'Green Invite empty-rival prikaz više nije zaključan na 54 × 54 contain state.');
assert(/\.h2h-detail-card\s*\{[^}]*width:\s*min\(420px, calc\(100vw - 28px\)\);[^}]*max-height:\s*min\(680px, calc\(100vh - 32px\)\);/s.test(indexSource), 'H2H detail modal geometrija više nije zaključana.');
assert(/\.h2h-detail-close\s*\{[^}]*width:\s*34px;[^}]*height:\s*34px;/s.test(indexSource) && /\.h2h-share-btn\s*\{[^}]*width:\s*100%;[^}]*min-height:\s*44px;/s.test(indexSource), 'H2H close ili share akcija više nema zaključanu dodirnu geometriju.');
assert(/\.h2h-rival-tile\s*\{[^}]*min-height:\s*144px;[^}]*display:\s*flex;/s.test(indexSource), 'H2H rival kartica više nema očekivanu osnovnu geometriju.');
assert(themeCssSource.includes('.h2h-detail-card {') && themeCssSource.includes('backdrop-filter: none !important;') && themeCssSource.includes('-webkit-backdrop-filter: none !important;'), 'Green H2H detail modal više nema zaključanu ne-blur Soft Clay površinu.');
assert(gameSource.includes("rivals.sort((a, b) => ((b.wins + b.losses + b.draws) - (a.wins + a.losses + a.draws)));"), 'H2H rivali se više ne sortiraju po ukupnom broju duela.');
assert(gameSource.includes("tile.addEventListener('click', () => {") && gameSource.includes('this.openH2HDetail(rivals[index], tile);'), 'H2H rival kartica više ne otvara detalje izabranog rivala.');
assert(gameSource.includes("if (backdrop) backdrop.addEventListener('click', () => this.closeH2HDetail());") && gameSource.includes("if (closeBtn) closeBtn.addEventListener('click', () => this.closeH2HDetail());") && gameSource.includes("if (event.key === 'Escape' && modal.classList.contains('active'))"), 'H2H modal više nema backdrop, close i Escape zatvaranje.');
assert(gameSource.includes("modal.classList.add('active');") && gameSource.includes("modal.setAttribute('aria-hidden', 'false');") && gameSource.includes("document.body.classList.add('h2h-modal-open');") && gameSource.includes("this.lastH2HTrigger.focus({ preventScroll: true });"), 'H2H modal open/close ili povratak fokusa više nije očuvan.');
assert(gameSource.includes("if (shareBtn) shareBtn.addEventListener('click', () => this.shareH2HDetail());") && gameSource.includes('const blob = await this.createH2HShareImage(data);') && gameSource.includes('await nativeH2HShare.shareImage({') && gameSource.includes('await navigator.share(payload);') && gameSource.includes('this.downloadBlob(blob, filename);'), 'H2H share tok više nema native, Web Share i download fallback ponašanje.');
assert(gameSource.includes('this.currentH2HShareData = {') && gameSource.includes('winPct,') && gameSource.includes('drawPct,') && gameSource.includes('lossPct,') && gameSource.includes('avg'), 'H2H share snapshot više ne čuva kompletne izračunate vrednosti.');
assert(greenStatisticsRoomIdentityManifest.status === 'locked', 'Green Statistics Room Identity source manifest mora biti zaključan.');
assert(greenStatisticsRoomIdentityRegistry?.status === 'locked', 'Green Statistics Room Identity porodica mora biti zaključana u centralnom registru.');
assert(greenThemeManifest.version === 50, 'Green tema mora imati cache verziju 50 posle Daily Room Identity integracije.');
assert(JSON.stringify(greenStatisticsRoomIdentityRegistry.identity) === JSON.stringify(greenStatisticsRoomIdentityManifest.identity), 'Green Statistics Room Identity registar i manifest nemaju isti identitet.');
assert(greenStatisticsRoomIdentityManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenStatisticsRoomIdentityManifest.identity?.mapping === 'one immutable Statistics room identity with room and menu delivery variants', 'Green Statistics Room Identity DNK ili pravilo jednog identiteta je promenjeno.');
assert(greenStatisticsRoomIdentityManifest.identity?.presentation === 'one centered free-standing statistics glyph on a transparent background without text, frame or backing tile' && greenStatisticsRoomIdentityManifest.identity?.palette === 'forest-green base, three warm-ivory ascending bars and one terracotta top dot', 'Green Statistics Room Identity vizuelna silueta ili paleta je promenjena.');
const statisticsRoomMaster = path.join(path.dirname(greenStatisticsRoomIdentityManifestPath), greenStatisticsRoomIdentityManifest.master.path);
assert(fs.existsSync(statisticsRoomMaster), `Nedostaje Green Statistics Room Identity master: ${statisticsRoomMaster}`);
const statisticsRoomMasterInfo = readPngInfo(statisticsRoomMaster);
assert(statisticsRoomMasterInfo.width === 1254 && statisticsRoomMasterInfo.height === 1254 && [4, 6].includes(statisticsRoomMasterInfo.colorType), 'Green Statistics Room Identity master mora biti 1254 × 1254 sa direktnim alpha kanalom.');
assert(fs.statSync(statisticsRoomMaster).size === greenStatisticsRoomIdentityManifest.master.bytes && sha256File(statisticsRoomMaster) === greenStatisticsRoomIdentityManifest.master.sha256, 'Green Statistics Room Identity master veličina ili otisak odstupa.');
const approvedStatisticsRoomSource = path.join(root, greenStatisticsRoomIdentityManifest.master.approvedSource);
assert(fs.existsSync(approvedStatisticsRoomSource) && sha256File(approvedStatisticsRoomSource) === greenStatisticsRoomIdentityManifest.master.approvedSourceSha256 && greenStatisticsRoomIdentityManifest.master.sha256 === greenStatisticsRoomIdentityManifest.master.approvedSourceSha256, 'Green Statistics Room Identity master nije bajt-po-bajt odobreni high-resolution izvor.');
assert(JSON.stringify(greenStatisticsRoomIdentityManifest.variants.map(asset => asset.id)) === JSON.stringify(['room', 'menu']), 'Green Statistics Room Identity mora imati tačno room i menu delivery varijantu.');
assert(new Set(greenStatisticsRoomIdentityManifest.variants.map(asset => asset.runtimeSha256)).size === 2, 'Green Statistics Room Identity runtime varijante ne smeju biti isti fajl.');
assert(greenStatisticsRoomIdentityRegistry.canonicalRuntime.length === 2 && JSON.stringify(greenStatisticsRoomIdentityRegistry.canonicalRuntime.map(asset => asset.role)) === JSON.stringify(['room', 'menu']), 'Green Statistics Room Identity registar mora imati room i menu canonical ulogu.');
const statisticsRoomIdentityConsumerSources = [indexSource, gameSource, rulesSource];
for (const variant of greenStatisticsRoomIdentityManifest.variants) {
    const runtime = path.join(root, variant.runtime);
    const retiredRuntime = path.join(root, variant.activeRuntime);
    assert(fs.existsSync(runtime), `Nedostaje Green Statistics Room Identity canonical runtime: ${runtime}`);
    assert(!fs.existsSync(retiredRuntime), `Stari Green Statistics Room Identity runtime nije uklonjen: ${retiredRuntime}`);
    const runtimeInfo = readPngInfo(runtime);
    assert(JSON.stringify([runtimeInfo.width, runtimeInfo.height]) === JSON.stringify(variant.runtimeSize), `Green Statistics Room Identity dimenzija odstupa: ${variant.id}`);
    assert([4, 6].includes(runtimeInfo.colorType), `Green Statistics Room Identity varijanta nema direktan alpha kanal: ${variant.id}`);
    assert(fs.statSync(runtime).size === variant.runtimeBytes && sha256File(runtime) === variant.runtimeSha256, `Green Statistics Room Identity canonical veličina ili otisak odstupa: ${variant.id}`);
    assert(variant.runtimeSha256 === variant.activeRuntimeSha256, `Green Statistics Room Identity canonical i istorijski aktivni runtime nisu bajt-po-bajt identični: ${variant.id}`);
    const canonicalPath = variant.runtime.replace(/^www\//, '');
    const retiredPath = variant.activeRuntime.replace(/^www\//, '');
    const canonicalReferences = statisticsRoomIdentityConsumerSources.reduce((count, source) => count + source.split(canonicalPath).length - 1, 0);
    const retiredReferences = statisticsRoomIdentityConsumerSources.reduce((count, source) => count + source.split(retiredPath).length - 1, 0);
    assert(canonicalReferences === variant.expectedCanonicalReferences, `Green Statistics Room Identity nema očekivan broj canonical veza: ${variant.id} (${canonicalReferences}).`);
    assert(retiredReferences === 0, `Green Statistics Room Identity još ima legacy vezu: ${variant.id} (${retiredReferences}).`);
    const registryVariant = greenStatisticsRoomIdentityRegistry.canonicalRuntime.find(asset => asset.role === variant.id);
    assert(registryVariant?.path === canonicalPath && registryVariant?.size === variant.runtimeSize[0] && registryVariant?.sha256 === variant.runtimeSha256, `Green Statistics Room Identity registry zapis odstupa: ${variant.id}`);
}
const rejectedStatisticsRoomCandidate = greenStatisticsRoomIdentityManifest.rejectedCandidates?.[0];
assert(greenStatisticsRoomIdentityManifest.rejectedCandidates?.length === 1 && rejectedStatisticsRoomCandidate?.id === 'statistics-pro-v1' && rejectedStatisticsRoomCandidate?.status === 'rejected-orphan' && rejectedStatisticsRoomCandidate?.activeReferences === 0, 'Green Statistics Room Identity mora eksplicitno odbaciti orphan statistics-pro-v1 varijantu.');
const rejectedStatisticsRoomSource = path.join(root, rejectedStatisticsRoomCandidate.source);
const rejectedStatisticsRoomRuntime = path.join(root, rejectedStatisticsRoomCandidate.runtime);
assert(fs.existsSync(rejectedStatisticsRoomSource) && sha256File(rejectedStatisticsRoomSource) === rejectedStatisticsRoomCandidate.sourceSha256, 'Odbačeni Statistics Room high-resolution kandidat više nije sačuvan kao audit trag.');
assert(!fs.existsSync(rejectedStatisticsRoomRuntime), 'Odbačeni Statistics Room runtime nije uklonjen.');
assert(statisticsRoomIdentityConsumerSources.every(source => !source.includes('assets/green-soft-clay/statistics-pro-v1.png')), 'Odbačeni Statistics Pro orphan ne sme imati aktivnog UI potrošača.');
assert(Object.values(greenStatisticsRoomIdentityManifest.integration || {}).filter(value => value === 'connected').length === 6 && greenStatisticsRoomIdentityManifest.integration?.legacyRuntime === 'retired in standardization step 3' && greenStatisticsRoomIdentityManifest.integration?.centralRegistry === 'standardized in standardization step 3' && greenStatisticsRoomIdentityManifest.integration?.cacheVersion === 48 && greenStatisticsRoomIdentityManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Statistics Room Identity integracija i završni audit nisu kompletno evidentirani.');
assert(JSON.stringify(greenStatisticsRoomIdentityRegistry.forbiddenRuntimePaths) === JSON.stringify(['assets/green-soft-clay/statistics-free-v2.png', 'assets/green-soft-clay/runtime/menu/statistics-free-v2.png', 'assets/green-soft-clay/statistics-pro-v1.png']), 'Green Statistics Room Identity zabranjene legacy putanje nisu kompletne.');
assert(JSON.stringify(greenStatisticsRoomIdentityRegistry.retiredMasterReplacements) === JSON.stringify({ 'statistics-free-v2.png': 'canonical/statistics-room-identity/statistics-room-v1.png', 'runtime/menu/statistics-free-v2.png': 'canonical/statistics-room-identity/statistics-room-menu-v1.png', 'statistics-pro-v1.png': 'canonical/statistics-room-identity/statistics-room-v1.png' }), 'Green Statistics Room Identity istorijsko mapiranje canonical zamena nije kompletno.');
for (const exclusion of ['Statistics Overview metric glyphs and formulas', 'H2H identity, empty state, versus and detail glyphs', 'Rules Statistics and leaderboards narrative illustration', 'Power Index watermark and modal identity', 'leaderboards and Solo Record identities', 'medals, trophies, ranks and single-match result identities', 'gameplay dice, dice skins, navigation and Economy identities']) {
    assert(greenStatisticsRoomIdentityManifest.semanticExclusions.includes(exclusion), `Statistics Room Identity manifest ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(JSON.stringify(greenStatisticsRoomIdentityRegistry.semanticExclusions) === JSON.stringify(greenStatisticsRoomIdentityManifest.semanticExclusions), 'Green Statistics Room Identity registar i source manifest ne dele iste semantičke granice.');
assert(indexSource.includes('assets/green-soft-clay/canonical/statistics-room-identity/statistics-room-menu-v1.png?v=1') && indexSource.includes('assets/green-soft-clay/canonical/statistics-room-identity/statistics-room-v1.png?v=1') && gameSource.includes("greenIcon: 'assets/green-soft-clay/canonical/statistics-room-identity/statistics-room-v1.png?v=1'") && rulesSource.includes("'assets/easter-soft-clay/statistics-pro-v2.png': 'assets/green-soft-clay/canonical/statistics-room-identity/statistics-room-v1.png?v=1'"), 'Green Statistics Room Identity canonical veze nisu kompletne.');
assert(/<button class="btn-square" onclick="app\.showStats\(\)"[\s\S]*?<img class="green-soft-clay-icon" data-theme-src="assets\/green-soft-clay\/canonical\/statistics-room-identity\/statistics-room-menu-v1\.png\?v=1"/.test(indexSource), 'Green Statistics main-menu dugme nije vezano za 384 px canonical menu varijantu.');
assert(/<img class="stats-header-icon stats-header-icon-green" data-theme-src="assets\/green-soft-clay\/canonical\/statistics-room-identity\/statistics-room-v1\.png\?v=1"/.test(indexSource), 'Green Statistics zaglavlje nije vezano za 512 px canonical room varijantu.');
assert(rulesSource.split("'assets/easter-soft-clay/statistics-pro-v2.png?v=1'").length - 1 === 4, 'Pravila moraju imati četiri Statistics reference kroz oba jezika.');
assert(gameSource.includes("canonical\\/statistics-room-identity\\/statistics-room-menu") && gameSource.includes("path === 'canonical/statistics-room-identity/statistics-room-v1.png'"), 'Green Statistics Room Identity startup fallback ili precizan room matcher nije povezan.');
assert(/#main-menu \.icon-menu-grid \.green-soft-clay-icon\s*\{[^}]*width:\s*52px;[^}]*height:\s*52px;/s.test(themeCssSource) && /@media \(max-width: 599px\) and \(orientation: portrait\)[\s\S]*?#main-menu \.icon-menu-grid \.green-soft-clay-icon\s*\{[^}]*width:\s*46px;[^}]*height:\s*46px;/s.test(themeCssSource), 'Green Statistics main-menu prikaz više nema zaključane 52/46 px dimenzije.');
assert(themeCssSource.includes('animation: easterBottomIconWave 8.4s cubic-bezier(.34, 1.56, .64, 1) infinite;') && themeCssSource.includes('.btn-square:nth-child(3) .green-soft-clay-icon { animation-delay: 1.56s; }'), 'Green Statistics main-menu wave motion više nije očuvan.');
assert(/#stats-screen \.stats-header-icon-green\s*\{[^}]*width:\s*34px;[^}]*height:\s*34px;[^}]*object-fit:\s*contain;[^}]*flex:\s*0 0 34px;/s.test(themeCssSource), 'Green Statistics header identitet više nije 34 × 34 contain.');
assert(gameSource.includes('scale: 1.06,') && gameSource.includes('}, 3650);') && gameSource.includes('}, 4600);') && /\.easter-room-intro-mark-wrap\s*\{[^}]*width:\s*clamp\(210px, 34vmin, 290px\);[^}]*height:\s*clamp\(210px, 34vmin, 290px\);/s.test(themeCssSource) && themeCssSource.includes('animation: greenRoomIconPulse 1.8s ease-in-out infinite;'), 'Green Statistics intro veličina, scale, trajanje ili motion ugovor je promenjen.');
assert(themeCssSource.includes('.easter-room-intro.theme-dark.easter-room-intro--icon-only .easter-room-intro-title--hidden') && /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.easter-room-intro\.theme-dark\.easter-room-intro--icon-only \.easter-room-intro-mark\s*\{[^}]*animation:\s*none !important;/s.test(themeCssSource), 'Green Statistics icon-only intro ili reduced-motion ponašanje nije očuvano.');
assert(/#rules-overlay-ui \.rules-theme-icon-green\s*\{[^}]*width:\s*1\.42em;[^}]*height:\s*1\.42em;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Statistics glyph u Pravilima nema zaključani inline prikaz.');
assert(greenStatisticsRoomIdentityManifest.variants[0].usedBy.includes('Green theme loading gate Statistics icon') && greenStatisticsRoomIdentityManifest.variants[0].displaySizes.some(size => JSON.stringify(size) === '[45,45]'), 'Green Statistics loading gate uloga ili prikazna veličina nisu evidentirani.');
assert(/\.theme-loading-gate__icons img\s*\{[^}]*width:\s*45px;[^}]*height:\s*45px;[^}]*object-fit:\s*contain;[^}]*animation:\s*themeLoadingIconFloat 2\.6s/s.test(styleCssSource) && /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.theme-loading-gate__icons img\s*\{[^}]*animation:\s*none !important;/s.test(styleCssSource), 'Green Statistics loading gate prikaz ili reduced-motion ponašanje je promenjeno.');
assert(greenLeaderboardRoomIdentityManifest.status === 'locked' && greenLeaderboardRoomIdentityRegistry?.status === 'locked', 'Green Leaderboard Room Identity manifest i centralni registar moraju biti zaključani.');
assert(JSON.stringify(greenLeaderboardRoomIdentityRegistry.identity) === JSON.stringify(greenLeaderboardRoomIdentityManifest.identity), 'Green Leaderboard Room Identity registar i manifest nemaju isti identitet.');
assert(greenLeaderboardRoomIdentityManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenLeaderboardRoomIdentityManifest.identity?.mapping === 'one immutable Leaderboard room identity with room and menu delivery variants', 'Green Leaderboard Room Identity DNK ili pravilo jednog identiteta je promenjeno.');
assert(greenLeaderboardRoomIdentityManifest.identity?.presentation === 'one centered free-standing podium glyph on a transparent background without text, frame or backing tile' && greenLeaderboardRoomIdentityManifest.identity?.palette === 'forest-green base, three warm-ivory podium blocks and one terracotta star', 'Green Leaderboard Room Identity vizuelna silueta ili paleta je promenjena.');
const leaderboardRoomMaster = path.join(path.dirname(greenLeaderboardRoomIdentityManifestPath), greenLeaderboardRoomIdentityManifest.master.path);
const leaderboardRoomApprovedSource = path.join(root, greenLeaderboardRoomIdentityManifest.master.approvedSource);
assert(fs.existsSync(leaderboardRoomMaster) && fs.existsSync(leaderboardRoomApprovedSource), 'Nedostaje Green Leaderboard Room Identity master ili odobreni izvor.');
const leaderboardRoomMasterInfo = readPngInfo(leaderboardRoomMaster);
assert(leaderboardRoomMasterInfo.width === 1254 && leaderboardRoomMasterInfo.height === 1254 && [4, 6].includes(leaderboardRoomMasterInfo.colorType), 'Green Leaderboard Room Identity master mora biti 1254 × 1254 sa direktnim alpha kanalom.');
assert(fs.statSync(leaderboardRoomMaster).size === greenLeaderboardRoomIdentityManifest.master.bytes && sha256File(leaderboardRoomMaster) === greenLeaderboardRoomIdentityManifest.master.sha256 && sha256File(leaderboardRoomApprovedSource) === greenLeaderboardRoomIdentityManifest.master.approvedSourceSha256 && greenLeaderboardRoomIdentityManifest.master.sha256 === greenLeaderboardRoomIdentityManifest.master.approvedSourceSha256, 'Green Leaderboard Room Identity master nije bajt-po-bajt odobreni izvor.');
assert(JSON.stringify(greenLeaderboardRoomIdentityManifest.variants.map(asset => asset.id)) === JSON.stringify(['room', 'menu']), 'Green Leaderboard Room Identity mora imati tačno room i menu delivery varijantu.');
const leaderboardRoomConsumerSources = [indexSource, gameSource, rulesSource];
for (const variant of greenLeaderboardRoomIdentityManifest.variants) {
    const runtime = path.join(root, variant.runtime);
    const activeRuntime = path.join(root, variant.activeRuntime);
    assert(fs.existsSync(runtime) && !fs.existsSync(activeRuntime), `Green Leaderboard Room Identity canonical nedostaje ili je stari runtime ostao: ${variant.id}`);
    const runtimeInfo = readPngInfo(runtime);
    assert(JSON.stringify([runtimeInfo.width, runtimeInfo.height]) === JSON.stringify(variant.runtimeSize) && [4, 6].includes(runtimeInfo.colorType), `Green Leaderboard Room Identity dimenzija ili alpha kanal odstupa: ${variant.id}`);
    assert(fs.statSync(runtime).size === variant.runtimeBytes && sha256File(runtime) === variant.runtimeSha256 && variant.runtimeSha256 === variant.activeRuntimeSha256, `Green Leaderboard Room Identity canonical otisak odstupa od odobrenog runtimea: ${variant.id}`);
    const canonicalPath = variant.runtime.replace(/^www\//, '');
    const activePath = variant.activeRuntime.replace(/^www\//, '');
    const canonicalReferences = leaderboardRoomConsumerSources.reduce((count, source) => count + source.split(canonicalPath).length - 1, 0);
    assert(canonicalReferences === variant.expectedCanonicalReferences, `Green Leaderboard Room Identity canonical veze odstupaju: ${variant.id} (${canonicalReferences}).`);
    assert(leaderboardRoomConsumerSources.every(source => !source.includes(activePath)), `Green Leaderboard Room Identity još ima staru UI vezu: ${variant.id}`);
    const registryVariant = greenLeaderboardRoomIdentityRegistry.canonicalRuntime.find(asset => asset.role === variant.id);
    assert(registryVariant?.path === canonicalPath && registryVariant?.size === variant.runtimeSize[0] && registryVariant?.sha256 === variant.runtimeSha256, `Green Leaderboard Room Identity registry zapis odstupa: ${variant.id}`);
}
const rejectedLeaderboardRoomCandidate = greenLeaderboardRoomIdentityManifest.rejectedCandidates?.[0];
assert(greenLeaderboardRoomIdentityManifest.rejectedCandidates?.length === 1 && rejectedLeaderboardRoomCandidate?.id === 'leaderboard-pro-v1' && rejectedLeaderboardRoomCandidate?.status === 'rejected-orphan' && rejectedLeaderboardRoomCandidate?.activeReferences === 0, 'Green Leaderboard Room Identity mora evidentirati odbačeni framed orphan.');
const rejectedLeaderboardRoomSource = path.join(root, rejectedLeaderboardRoomCandidate.source);
const rejectedLeaderboardRoomRuntime = path.join(root, rejectedLeaderboardRoomCandidate.runtime);
assert(fs.existsSync(rejectedLeaderboardRoomSource) && !fs.existsSync(rejectedLeaderboardRoomRuntime) && sha256File(rejectedLeaderboardRoomSource) === rejectedLeaderboardRoomCandidate.sourceSha256, 'Green Leaderboard Room Identity odbijeni izvor nije sačuvan ili runtime nije uklonjen.');
assert(leaderboardRoomConsumerSources.every(source => !source.includes('assets/green-soft-clay/leaderboard-pro-v1.png')), 'Odbačeni Green Leaderboard Pro kandidat ima aktivnog UI potrošača.');
assert(Object.values(greenLeaderboardRoomIdentityManifest.integration || {}).filter(value => value === 'connected').length === 7 && greenLeaderboardRoomIdentityManifest.integration?.centralRegistry === 'standardized in standardization step 3' && greenLeaderboardRoomIdentityManifest.integration?.cacheVersion === 49 && greenLeaderboardRoomIdentityManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Leaderboard Room Identity integracija i završni audit nisu kompletni.');
assert(JSON.stringify(greenLeaderboardRoomIdentityRegistry.semanticExclusions) === JSON.stringify(greenLeaderboardRoomIdentityManifest.semanticExclusions), 'Green Leaderboard Room Identity registar i source manifest ne dele iste semantičke granice.');
assert(JSON.stringify(greenLeaderboardRoomIdentityRegistry.forbiddenRuntimePaths) === JSON.stringify(['assets/green-soft-clay/leaderboard-free-v2.png', 'assets/green-soft-clay/runtime/menu/leaderboard-free-v2.png', 'assets/green-soft-clay/leaderboard-pro-v1.png']), 'Green Leaderboard Room Identity zabrana legacy runtime putanja nije kompletna.');
assert(JSON.stringify(greenLeaderboardRoomIdentityRegistry.retiredMasterReplacements) === JSON.stringify({ 'leaderboard-free-v2.png': 'canonical/leaderboard-room-identity/leaderboard-room-v1.png', 'runtime/menu/leaderboard-free-v2.png': 'canonical/leaderboard-room-identity/leaderboard-room-menu-v1.png', 'leaderboard-pro-v1.png': 'canonical/leaderboard-room-identity/leaderboard-room-v1.png' }), 'Green Leaderboard Room Identity istorijsko mapiranje zamena nije kompletno.');
assert(greenLeaderboardRoomIdentityRegistry.canonicalRuntime.length === 2 && JSON.stringify(greenLeaderboardRoomIdentityRegistry.canonicalRuntime.map(asset => asset.role)) === JSON.stringify(['room', 'menu']), 'Green Leaderboard Room Identity registar mora imati room i menu canonical ulogu.');
for (const exclusion of ['Global and Local leaderboard navigation glyphs', 'Leaderboard empty and loading state glyph shared with online waiting', 'General Podium medals already locked in Competition Medals', 'Rules Statistics and leaderboards narrative illustration', 'Statistics room identity and Statistics metrics', 'rank badges, trophies, scores and match results']) {
    assert(greenLeaderboardRoomIdentityManifest.semanticExclusions.includes(exclusion), `Green Leaderboard Room Identity ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(indexSource.includes('assets/green-soft-clay/canonical/leaderboard-room-identity/leaderboard-room-menu-v1.png?v=1') && indexSource.includes('assets/green-soft-clay/canonical/leaderboard-room-identity/leaderboard-room-v1.png?v=1') && gameSource.includes("greenIcon: 'assets/green-soft-clay/canonical/leaderboard-room-identity/leaderboard-room-v1.png?v=1'") && rulesSource.includes("'assets/easter-soft-clay/leaderboard-pro-v2.png': 'assets/green-soft-clay/canonical/leaderboard-room-identity/leaderboard-room-v1.png?v=1'"), 'Green Leaderboard Room Identity canonical UI veze nisu kompletne.');
assert(/<button class="btn-square" onclick="app\.showHighscoresScreen\(\)"[\s\S]*?<img class="green-soft-clay-icon" data-theme-src="assets\/green-soft-clay\/canonical\/leaderboard-room-identity\/leaderboard-room-menu-v1\.png\?v=1"/.test(indexSource), 'Green Leaderboard main-menu dugme nije vezano za 384 px canonical menu varijantu.');
assert(/<img class="hs-header-icon hs-header-icon-green" data-theme-src="assets\/green-soft-clay\/canonical\/leaderboard-room-identity\/leaderboard-room-v1\.png\?v=1"/.test(indexSource), 'Green Leaderboard zaglavlje nije vezano za 512 px canonical room varijantu.');
assert(rulesSource.split("'assets/easter-soft-clay/leaderboard-pro-v2.png?v=1'").length - 1 === 4, 'Green Pravila moraju imati četiri Leaderboard reference kroz oba jezika.');
assert(gameSource.includes('canonical\\/leaderboard-room-identity\\/leaderboard-room-menu') && gameSource.includes("path === 'canonical/leaderboard-room-identity/leaderboard-room-v1.png'"), 'Green Leaderboard Room Identity startup fallback ili precizan room matcher nije povezan.');
assert(/#main-menu \.icon-menu-grid \.green-soft-clay-icon\s*\{[^}]*width:\s*52px;[^}]*height:\s*52px;/s.test(themeCssSource) && /@media \(max-width: 599px\) and \(orientation: portrait\)[\s\S]*?#main-menu \.icon-menu-grid \.green-soft-clay-icon\s*\{[^}]*width:\s*46px;[^}]*height:\s*46px;/s.test(themeCssSource), 'Green Leaderboard main-menu prikaz više nema zaključane 52/46 px dimenzije.');
assert(themeCssSource.includes('animation: easterBottomIconWave 8.4s cubic-bezier(.34, 1.56, .64, 1) infinite;') && /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*#main-menu \.icon-menu-grid \.btn-square \.green-soft-clay-icon\s*\{[^}]*animation:\s*none !important;/s.test(themeCssSource), 'Green Leaderboard main-menu wave ili reduced-motion ponašanje nije očuvano.');
assert(/#highscores-screen \.hs-header-icon-green\s*\{[^}]*width:\s*32px;[^}]*height:\s*32px;[^}]*object-fit:\s*contain;/s.test(themeCssSource) && themeCssSource.includes('.btn-square:nth-child(2) .green-soft-clay-icon { animation-delay: 1.38s; }'), 'Green Leaderboard header ili main-menu motion nije očuvan.');
assert(gameSource.includes('scale: 1.16,') && /\.easter-room-intro-mark-wrap\s*\{[^}]*width:\s*clamp\(210px, 34vmin, 290px\);[^}]*height:\s*clamp\(210px, 34vmin, 290px\);/s.test(themeCssSource) && themeCssSource.includes('animation: greenRoomIconPulse 1.8s ease-in-out infinite;') && gameSource.includes('}, 3650);') && gameSource.includes('}, 4600);'), 'Green Leaderboard intro veličina, scale, pulse ili trajanje nisu očuvani.');
assert(themeCssSource.includes('.easter-room-intro.theme-dark.easter-room-intro--icon-only .easter-room-intro-title--hidden') && /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.easter-room-intro\.theme-dark\.easter-room-intro--icon-only \.easter-room-intro-mark\s*\{[^}]*animation:\s*none !important;/s.test(themeCssSource), 'Green Leaderboard icon-only intro ili reduced-motion ponašanje nije očuvano.');
assert(/#rules-overlay-ui \.rules-theme-icon-green\s*\{[^}]*width:\s*1\.42em;[^}]*height:\s*1\.42em;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Leaderboard glyph u Pravilima nema zaključani inline prikaz.');
assert(greenLeaderboardRoomIdentityManifest.variants[0].usedBy.includes('Green theme loading gate Leaderboard icon') && greenLeaderboardRoomIdentityManifest.variants[0].displaySizes.some(size => JSON.stringify(size) === '[45,45]') && /\.theme-loading-gate__icons img\s*\{[^}]*width:\s*45px;[^}]*height:\s*45px;[^}]*object-fit:\s*contain;[^}]*animation:\s*themeLoadingIconFloat 2\.6s/s.test(styleCssSource), 'Green Leaderboard loading gate uloga, veličina ili motion nisu očuvani.');
assert(greenDailyRoomIdentityManifest.status === 'locked' && greenDailyRoomIdentityRegistry?.status === 'locked', 'Green Daily Room Identity manifest i centralni registar moraju biti zaključani.');
assert(greenThemeManifest.version === 50, 'Green Daily Room Identity integracija mora podići cache verziju na 50.');
assert(JSON.stringify(greenDailyRoomIdentityRegistry.identity) === JSON.stringify(greenDailyRoomIdentityManifest.identity), 'Green Daily Room Identity registar i manifest nemaju isti identitet.');
assert(greenDailyRoomIdentityManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenDailyRoomIdentityManifest.identity?.mapping === 'one immutable Daily Challenge room identity with room and menu delivery variants', 'Green Daily Room Identity DNK ili pravilo jednog identiteta je promenjeno.');
assert(greenDailyRoomIdentityManifest.identity?.presentation === 'one centered free-standing calendar glyph on a transparent background without text, frame or backing tile' && greenDailyRoomIdentityManifest.identity?.palette === 'warm-ivory calendar body, terracotta top bar and two forest-green binders with one forest-green checkmark', 'Green Daily Room Identity vizuelna silueta ili paleta je promenjena.');
const dailyRoomMaster = path.join(path.dirname(greenDailyRoomIdentityManifestPath), greenDailyRoomIdentityManifest.master.path);
const dailyRoomApprovedSource = path.join(root, greenDailyRoomIdentityManifest.master.approvedSource);
assert(fs.existsSync(dailyRoomMaster) && fs.existsSync(dailyRoomApprovedSource), 'Nedostaje Green Daily Room Identity master ili odobreni izvor.');
const dailyRoomMasterInfo = readPngInfo(dailyRoomMaster);
assert(dailyRoomMasterInfo.width === 1254 && dailyRoomMasterInfo.height === 1254 && [4, 6].includes(dailyRoomMasterInfo.colorType), 'Green Daily Room Identity master mora biti 1254 × 1254 sa direktnim alpha kanalom.');
assert(fs.statSync(dailyRoomMaster).size === greenDailyRoomIdentityManifest.master.bytes && sha256File(dailyRoomMaster) === greenDailyRoomIdentityManifest.master.sha256 && sha256File(dailyRoomApprovedSource) === greenDailyRoomIdentityManifest.master.approvedSourceSha256 && greenDailyRoomIdentityManifest.master.sha256 === greenDailyRoomIdentityManifest.master.approvedSourceSha256, 'Green Daily Room Identity master nije bajt-po-bajt odobreni izvor.');
assert(JSON.stringify(greenDailyRoomIdentityManifest.variants.map(asset => asset.id)) === JSON.stringify(['room', 'menu']), 'Green Daily Room Identity mora imati tačno room i menu delivery varijantu.');
const dailyRoomConsumerSources = [indexSource, gameSource, dailyChallengeSource, rulesSource];
for (const variant of greenDailyRoomIdentityManifest.variants) {
    const runtime = path.join(root, variant.runtime);
    const activeRuntime = path.join(root, variant.activeRuntime);
    assert(fs.existsSync(runtime) && !fs.existsSync(activeRuntime), `Green Daily Room Identity canonical nedostaje ili je stari runtime ostao: ${variant.id}`);
    const runtimeInfo = readPngInfo(runtime);
    assert(JSON.stringify([runtimeInfo.width, runtimeInfo.height]) === JSON.stringify(variant.runtimeSize) && [4, 6].includes(runtimeInfo.colorType), `Green Daily Room Identity dimenzija ili alpha kanal odstupa: ${variant.id}`);
    assert(fs.statSync(runtime).size === variant.runtimeBytes && sha256File(runtime) === variant.runtimeSha256 && variant.runtimeSha256 === variant.activeRuntimeSha256, `Green Daily Room Identity canonical otisak odstupa od odobrenog runtimea: ${variant.id}`);
    const canonicalPath = variant.runtime.replace(/^www\//, '');
    const activePath = variant.activeRuntime.replace(/^www\//, '');
    const canonicalReferences = dailyRoomConsumerSources.reduce((count, source) => count + source.split(canonicalPath).length - 1, 0);
    assert(canonicalReferences === variant.expectedCanonicalReferences, `Green Daily Room Identity canonical veze odstupaju: ${variant.id} (${canonicalReferences}).`);
    assert(dailyRoomConsumerSources.every(source => !source.includes(activePath)), `Green Daily Room Identity još ima staru UI vezu: ${variant.id}`);
    const registryVariant = greenDailyRoomIdentityRegistry.canonicalRuntime.find(asset => asset.role === variant.id);
    assert(registryVariant?.path === canonicalPath && registryVariant?.size === variant.runtimeSize[0] && registryVariant?.sha256 === variant.runtimeSha256, `Green Daily Room Identity registry zapis odstupa: ${variant.id}`);
}
const rejectedDailyRoomCandidate = greenDailyRoomIdentityManifest.rejectedCandidates?.[0];
assert(greenDailyRoomIdentityManifest.rejectedCandidates?.length === 1 && rejectedDailyRoomCandidate?.id === 'daily-challenge-pro-v1' && rejectedDailyRoomCandidate?.status === 'rejected-orphan' && rejectedDailyRoomCandidate?.activeReferences === 0, 'Green Daily Room Identity mora evidentirati odbačeni framed orphan.');
const rejectedDailyRoomSource = path.join(root, rejectedDailyRoomCandidate.source);
const rejectedDailyRoomRuntime = path.join(root, rejectedDailyRoomCandidate.runtime);
assert(fs.existsSync(rejectedDailyRoomSource) && !fs.existsSync(rejectedDailyRoomRuntime) && sha256File(rejectedDailyRoomSource) === rejectedDailyRoomCandidate.sourceSha256, 'Green Daily Room Identity odbijeni izvor nije sačuvan ili runtime nije uklonjen.');
assert(dailyRoomConsumerSources.every(source => !source.includes('assets/green-soft-clay/daily-challenge-pro-v1.png')), 'Odbačeni Green Daily Pro kandidat ima aktivnog UI potrošača.');
assert(Object.values(greenDailyRoomIdentityManifest.integration || {}).filter(value => value === 'connected').length === 7 && greenDailyRoomIdentityManifest.integration?.centralRegistry === 'standardized in standardization step 3' && greenDailyRoomIdentityManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js' && greenDailyRoomIdentityManifest.integration?.cacheVersion === 50, 'Green Daily Room Identity integracija ili završni audit nisu kompletni.');
assert(JSON.stringify(greenDailyRoomIdentityRegistry.semanticExclusions) === JSON.stringify(greenDailyRoomIdentityManifest.semanticExclusions), 'Green Daily Room Identity registar i manifest ne dele iste semantičke granice.');
assert(JSON.stringify(greenDailyRoomIdentityRegistry.forbiddenRuntimePaths) === JSON.stringify(['assets/green-soft-clay/daily-challenge-free-v2.png', 'assets/green-soft-clay/runtime/menu/daily-challenge-free-v2.png', 'assets/green-soft-clay/daily-challenge-pro-v1.png']), 'Green Daily Room Identity zabrana legacy runtime putanja nije kompletna.');
assert(JSON.stringify(greenDailyRoomIdentityRegistry.retiredMasterReplacements) === JSON.stringify({ 'daily-challenge-free-v2.png': 'canonical/daily-room-identity/daily-room-v1.png', 'runtime/menu/daily-challenge-free-v2.png': 'canonical/daily-room-identity/daily-room-menu-v1.png', 'daily-challenge-pro-v1.png': 'canonical/daily-room-identity/daily-room-v1.png' }), 'Green Daily Room Identity istorijsko mapiranje zamena nije kompletno.');
assert(greenDailyRoomIdentityRegistry.canonicalRuntime.length === 2 && JSON.stringify(greenDailyRoomIdentityRegistry.canonicalRuntime.map(asset => asset.role)) === JSON.stringify(['room', 'menu']), 'Green Daily Room Identity registar mora imati room i menu canonical ulogu.');
for (const exclusion of ['Daily task list and target glyph', 'Daily completed confirmation glyph', 'Daily already-played calendar with clock status', 'Daily rewarded-video and ducat composition', 'server-selected dice, scoring and reward logic', 'other room identities, medals, ranks and gameplay dice']) {
    assert(greenDailyRoomIdentityManifest.semanticExclusions.includes(exclusion), `Green Daily Room Identity ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(indexSource.includes('assets/green-soft-clay/canonical/daily-room-identity/daily-room-menu-v1.png?v=1') && indexSource.includes('assets/green-soft-clay/canonical/daily-room-identity/daily-room-v1.png?v=1') && dailyChallengeSource.includes('assets/green-soft-clay/canonical/daily-room-identity/daily-room-v1.png?v=1') && gameSource.includes('assets/green-soft-clay/canonical/daily-room-identity/daily-room-v1.png?v=1') && rulesSource.includes("'assets/easter-soft-clay/daily-challenge-pro-v5.png?v=opt2': 'assets/green-soft-clay/canonical/daily-room-identity/daily-room-v1.png?v=1'"), 'Green Daily Room Identity canonical UI veze nisu kompletne.');
assert(/<button class="btn-square" onclick="if\(window\.dnevniIzazov\)/.test(indexSource) && /<img class="green-soft-clay-icon green-soft-clay-icon--daily" data-theme-src="assets\/green-soft-clay\/canonical\/daily-room-identity\/daily-room-menu-v1\.png\?v=1"/.test(indexSource), 'Green Daily main-menu dugme nije vezano za 384 px canonical menu varijantu.');
assert(/<img class="daily-intro-mark-green" data-theme-src="assets\/green-soft-clay\/canonical\/daily-room-identity\/daily-room-v1\.png\?v=1"/.test(indexSource) && /<img class="daily-glass-room-mark-green" data-theme-src="assets\/green-soft-clay\/canonical\/daily-room-identity\/daily-room-v1\.png\?v=1"/.test(dailyChallengeSource), 'Green Daily intro ili zaglavlje nije vezano za 512 px canonical room varijantu.');
assert((rulesSource.match(/rulesThemeAssetIconHtml\('assets\/daily-challenge-icon\.svg', 'assets\/easter-soft-clay\/daily-challenge-pro-v5\.png\?v=opt2'\)/g) || []).length === 2, 'Green Pravila moraju imati dve Daily Challenge reference kroz oba jezika.');
assert(gameSource.includes('canonical\\/daily-room-identity\\/daily-room-menu') && gameSource.includes("path === 'canonical/daily-room-identity/daily-room-v1.png'"), 'Green Daily Room Identity startup fallback ili precizan room matcher nije povezan.');
assert(themeCssSource.includes('.btn-square:nth-child(1) .green-soft-clay-icon { animation-delay: 1.2s; }') && /#daily-intro\.theme-dark \.daily-intro-mark-green\s*\{[^}]*animation:\s*easterRoomIconPulse 1\.8s/s.test(themeCssSource) && /\.daily-glass-room-mark-green\s*\{[^}]*width:\s*54px;[^}]*height:\s*54px;/s.test(dailyChallengeSource), 'Green Daily main-menu, intro ili header prikaz nije očuvan.');
assert(/#daily-intro\.theme-dark \.daily-intro-mark-wrap\s*\{[^}]*width:\s*clamp\(210px, 34vmin, 290px\);[^}]*height:\s*clamp\(210px, 34vmin, 290px\);/s.test(themeCssSource) && dailyChallengeSource.includes('const introDuration = 4600;') && dailyChallengeSource.includes('openBehindOverlayAt: alreadyPlayed ? null : 3650') && /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*#daily-intro\.theme-dark \.daily-intro-mark-green\s*\{[^}]*animation:\s*none !important;/s.test(themeCssSource), 'Green Daily intro dimenzija, trajanje ili reduced-motion ponašanje nije očuvano.');
assert(greenDailyRoomIdentityManifest.variants[0].usedBy.includes('Green theme loading gate Daily Challenge icon') && greenDailyRoomIdentityManifest.variants[0].displaySizes.some(size => JSON.stringify(size) === '[45,45]') && /\.theme-loading-gate__icons img\s*\{[^}]*width:\s*45px;[^}]*height:\s*45px;[^}]*object-fit:\s*contain;[^}]*animation:\s*themeLoadingIconFloat 2\.6s/s.test(styleCssSource), 'Green Daily loading gate uloga, veličina ili motion nisu očuvani.');
assert(/#main-menu \.icon-menu-grid \.green-soft-clay-icon\s*\{[^}]*width:\s*52px;[^}]*height:\s*52px;[^}]*object-fit:\s*contain;/s.test(themeCssSource) && /@media \(max-width: 599px\) and \(orientation: portrait\)\s*\{[^}]*#main-menu \.icon-menu-grid \.green-soft-clay-icon\s*\{[^}]*width:\s*46px;[^}]*height:\s*46px;/s.test(themeCssSource), 'Green Daily menu 52/46 px prikaz nije očuvan.');
assert(/#rules-overlay-ui \.rules-theme-icon-green\s*\{[^}]*width:\s*1\.42em;[^}]*height:\s*1\.42em;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Daily glyph u Pravilima nema zaključani inline prikaz.');
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
assert(tournamentSource.includes('assets/green-soft-clay/canonical/tournament-awards/finalist-silver-v1.png'), 'Tournament finalist nagrada je izgubljena ili pogrešno zamenjena.');
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
    for (const asset of registeredAssets) {
        const { role, path: relative } = asset;
        const expectedWidth = asset.width || asset.size;
        const expectedHeight = asset.height || asset.size;
        const file = path.join(www, relative);
        assert(fs.existsSync(file), `Nedostaje registrovan Green ${familyName} asset (${role}): ${relative}`);
        const info = readPngInfo(file);
        assert(info.width === expectedWidth && info.height === expectedHeight, `Pogrešna runtime rezolucija za ${relative}.`);
        assert([4, 6].includes(info.colorType), `Registrovan Green ${familyName} asset nema direktan alpha kanal: ${relative}`);
        assert(runtimeThemeSource.includes(relative), `Registrovan Green ${familyName} asset nije povezan u runtime kodu: ${relative}`);
    }
}

const themeDirs = ['easter-soft-clay', 'desert-soft-clay', 'green-soft-clay'];
const report = [];
const startupConfig = {
    'easter-soft-clay': ['assets/easter-neumorphic-bg-v5.png', 'assets/easter-soft-clay/splash-title-soft-clay-v1.png'],
    'desert-soft-clay': ['assets/desert-neumorphic-bg-v1.png', 'assets/desert-soft-clay/splash-title-soft-clay-v1.png'],
    'green-soft-clay': ['assets/green-clay-balkan-diorama-v3.png', 'assets/green-soft-clay/splash-title-soft-clay-v1.png', 'assets/green-soft-clay/canonical/tournament-awards/champion-trophy-v1.png', 'assets/green-soft-clay/canonical/statistics-room-identity/statistics-room-menu-v1.png', 'assets/green-soft-clay/canonical/leaderboard-room-identity/leaderboard-room-menu-v1.png', 'assets/green-soft-clay/canonical/daily-room-identity/daily-room-menu-v1.png']
};
assert(startupConfig['green-soft-clay'].every(relative => !relative.includes('canonical/statistics-overview/')), 'Statistics Overview paket ne sme ući u Green startup preload.');
assert(startupConfig['green-soft-clay'].every(relative => !relative.includes('canonical/h2h-statistics/')), 'H2H Statistics paket ne sme ući u Green startup preload.');
assert(startupConfig['green-soft-clay'].filter(relative => relative.endsWith('canonical/statistics-room-identity/statistics-room-menu-v1.png')).length === 1 && startupConfig['green-soft-clay'].every(relative => !relative.endsWith('canonical/statistics-room-identity/statistics-room-v1.png')), 'Statistics Room Identity startup mora sadržati samo 384 px menu varijantu.');
assert(startupConfig['green-soft-clay'].filter(relative => relative.endsWith('canonical/leaderboard-room-identity/leaderboard-room-menu-v1.png')).length === 1 && startupConfig['green-soft-clay'].every(relative => !relative.endsWith('canonical/leaderboard-room-identity/leaderboard-room-v1.png')), 'Leaderboard Room Identity startup mora sadržati samo 384 px menu varijantu.');
assert(startupConfig['green-soft-clay'].filter(relative => relative.endsWith('canonical/daily-room-identity/daily-room-menu-v1.png')).length === 1 && startupConfig['green-soft-clay'].every(relative => !relative.endsWith('canonical/daily-room-identity/daily-room-v1.png')), 'Daily Room Identity startup mora sadržati samo 384 px menu varijantu.');
const roomMatchers = {
    dailyChallenge: relative => relative.startsWith('daily/') || relative.startsWith('daily-challenge') || relative === 'canonical/daily-room-identity/daily-room-v1.png',
    leaderboard: relative => relative.startsWith('leaderboard/') || relative.startsWith('leaderboard-') || relative.startsWith('canonical/competition-medals/general-podium-') || relative === 'canonical/leaderboard-room-identity/leaderboard-room-v1.png',
    statistics: relative => relative.startsWith('statistics/') || relative.startsWith('statistics-') || relative.startsWith('canonical/statistics-overview/') || relative.startsWith('canonical/h2h-statistics/') || relative === 'canonical/statistics-room-identity/statistics-room-v1.png',
    settings: relative => relative.startsWith('settings/') || relative.startsWith('settings-'),
    rules: relative => relative.startsWith('rules/') || relative.startsWith('rules-'),
    globalChat: relative => relative.startsWith('global-chat'),
    onlinePlayers: relative => relative.startsWith('online-players') || relative.startsWith('online-add-') || relative.startsWith('online-spectate') || relative.startsWith('online-duel'),
    economy: relative => relative.startsWith('economy/') || relative.startsWith('ducats-undo') || relative.startsWith('canonical/ducat/') || relative.startsWith('canonical/undo-token/') || relative.startsWith('canonical/rewarded-video/'),
    quarterlyLeague: relative => relative.startsWith('ql/') || relative.startsWith('quarterly-league') || relative.startsWith('canonical/competition-medals/quarterly-league-') || relative.startsWith('canonical/quarterly-rank-badges/') || relative.startsWith('canonical/quarterly-navigation/'),
    treasury: (relative, themeDir) => relative.startsWith('treasury/') || relative.startsWith('treasury-') || relative.startsWith('economy/ducat') || relative.startsWith('canonical/ducat/') || relative.startsWith('canonical/collection-medals/') || relative.startsWith('canonical/achievement-trophies/') || relative.startsWith('canonical/treasury-controls/') || (themeDir !== 'green-soft-clay' && relative.includes('rewarded-video')),
    tournament: relative => relative.startsWith('tournament/') || relative.startsWith('tournament-') || relative.startsWith('canonical/tournament-navigation/') || relative.startsWith('canonical/tournament-states/') || relative.startsWith('canonical/tournament-awards/'),
    solo: relative => relative.startsWith('solo/') || relative.startsWith('mode-solo') || relative.startsWith('canonical/solo-results/'),
    hotseat: relative => relative.startsWith('hotseat/') || relative.startsWith('mode-hotseat') || relative.startsWith('canonical/hotseat-winner/'),
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
    if (themeDir === 'green-soft-clay') {
        const statisticsRoom = roomTotals.find(room => room.roomId === 'statistics');
        assert(statisticsRoom && statisticsRoom.files === 17 && statisticsRoom.bytes === 630121 && statisticsRoom.decodedBytes === 5439488, `Green Statistics room-on-demand paket više nije standardizovan na 17 PNG / 630121 B / 5439488 decoded B (dobijeno ${statisticsRoom?.files} PNG / ${statisticsRoom?.bytes} B / ${statisticsRoom?.decodedBytes} decoded B).`);
        const statisticsMenuPath = 'canonical/statistics-room-identity/statistics-room-menu-v1.png';
        const statisticsRoomPath = 'canonical/statistics-room-identity/statistics-room-v1.png';
        assert(startupFiles.length === 17 && startupFiles.filter(file => path.relative(directory, file).replaceAll('\\', '/') === statisticsMenuPath).length === 1 && startupFiles.every(file => path.relative(directory, file).replaceAll('\\', '/') !== statisticsRoomPath), 'Green startup mora pripremiti samo 384 px Statistics menu varijantu.');
        assert(roomMatchers.statistics(statisticsRoomPath) && !roomMatchers.statistics(statisticsMenuPath), 'Green Statistics room matcher ne razdvaja 512 px room i 384 px menu varijantu.');
        const leaderboardRoom = roomTotals.find(room => room.roomId === 'leaderboard');
        assert(leaderboardRoom && leaderboardRoom.files === 7 && leaderboardRoom.bytes === 449668 && leaderboardRoom.decodedBytes === 2949120, `Green Leaderboard room-on-demand paket više nije standardizovan na 7 PNG / 449668 B / 2949120 decoded B (dobijeno ${leaderboardRoom?.files} PNG / ${leaderboardRoom?.bytes} B / ${leaderboardRoom?.decodedBytes} decoded B).`);
        const leaderboardMenuPath = 'canonical/leaderboard-room-identity/leaderboard-room-menu-v1.png';
        const leaderboardRoomPath = 'canonical/leaderboard-room-identity/leaderboard-room-v1.png';
        assert(startupFiles.length === 17 && startupFiles.filter(file => path.relative(directory, file).replaceAll('\\', '/') === leaderboardMenuPath).length === 1 && startupFiles.every(file => path.relative(directory, file).replaceAll('\\', '/') !== leaderboardRoomPath), 'Green startup mora pripremiti samo 384 px Leaderboard menu varijantu.');
        assert(roomMatchers.leaderboard(leaderboardRoomPath) && !roomMatchers.leaderboard(leaderboardMenuPath), 'Green Leaderboard room matcher ne razdvaja 512 px room i 384 px menu varijantu.');
        const dailyRoom = roomTotals.find(room => room.roomId === 'dailyChallenge');
        assert(dailyRoom && dailyRoom.files === 5 && dailyRoom.bytes === 660910 && dailyRoom.decodedBytes === 3407872, `Green Daily room-on-demand paket više nije standardizovan na 5 PNG / 660910 B / 3407872 decoded B (dobijeno ${dailyRoom?.files} PNG / ${dailyRoom?.bytes} B / ${dailyRoom?.decodedBytes} decoded B).`);
        const dailyMenuPath = 'canonical/daily-room-identity/daily-room-menu-v1.png';
        const dailyRoomPath = 'canonical/daily-room-identity/daily-room-v1.png';
        assert(startupFiles.length === 17 && startupFiles.filter(file => path.relative(directory, file).replaceAll('\\', '/') === dailyMenuPath).length === 1 && startupFiles.every(file => path.relative(directory, file).replaceAll('\\', '/') !== dailyRoomPath), 'Green startup mora pripremiti samo 384 px Daily menu varijantu.');
        assert(roomMatchers.dailyChallenge(dailyRoomPath) && !roomMatchers.dailyChallenge(dailyMenuPath), 'Green Daily room matcher ne razdvaja 512 px room i 384 px menu varijantu.');
    }
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
