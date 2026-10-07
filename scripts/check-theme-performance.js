const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const www = path.join(root, 'www');
const indexSource = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
const themeCssSource = fs.readFileSync(path.join(www, 'teme.css'), 'utf8');
const themeLogoCssSource = fs.readFileSync(path.join(www, 'theme-game-logos.css'), 'utf8');
const styleCssSource = fs.readFileSync(path.join(www, 'style.css'), 'utf8');
const configSource = fs.readFileSync(path.join(www, 'config.js'), 'utf8');
const gameSource = fs.readFileSync(path.join(www, 'game.js'), 'utf8');
const dailyChallengeSource = fs.readFileSync(path.join(www, 'dnevniizazov.js'), 'utf8');
const languagesSource = fs.readFileSync(path.join(www, 'languages.js'), 'utf8');
const managersSource = fs.readFileSync(path.join(www, 'managers.js'), 'utf8');
const rulesSource = fs.readFileSync(path.join(www, 'pravilaigre.js'), 'utf8');
const globalChatSource = fs.readFileSync(path.join(www, 'globalchat.js'), 'utf8');
const onlineNumberSource = fs.readFileSync(path.join(www, 'onlinenumber.js'), 'utf8');
const leaderboardSource = fs.readFileSync(path.join(www, 'toplista.js'), 'utf8');
const tournamentSource = fs.readFileSync(path.join(www, 'turnir.js'), 'utf8');
const powerIndexSource = fs.readFileSync(path.join(www, 'powerindex.js'), 'utf8');
const fireStreakSource = fs.readFileSync(path.join(www, 'vatreniniz.js'), 'utf8');
const quarterlyLeagueSource = fs.readFileSync(path.join(www, 'kvartalnaliga.js'), 'utf8');
const trophyManagerSource = fs.readFileSync(path.join(www, 'trophyManager.js'), 'utf8');
const treasurySource = fs.readFileSync(path.join(www, 'riznica.js'), 'utf8');
const easterThemeManifest = JSON.parse(fs.readFileSync(path.join(www, 'themes', 'easter', 'manifest.json'), 'utf8'));
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
const greenDailyStatesRegistry = greenAssetRegistry.families?.dailyStates;
const greenSettingsRoomIdentityRegistry = greenAssetRegistry.families?.settingsRoomIdentity;
const greenRulesRoomIdentityRegistry = greenAssetRegistry.families?.rulesRoomIdentity;
const greenGlobalChatRoomIdentityRegistry = greenAssetRegistry.families?.globalChatRoomIdentity;
const greenOnlinePlayersRoomIdentityRegistry = greenAssetRegistry.families?.onlinePlayersRoomIdentity;
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
const greenTreasuryEffectPreviewsManifest = JSON.parse(fs.readFileSync(path.join(root, 'source-assets', 'green-soft-clay-canonical', 'treasury-effect-previews', 'manifest.json'), 'utf8'));
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
const greenLeaderboardControlsManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'leaderboard-controls', 'manifest.json');
const greenLeaderboardControlsManifest = JSON.parse(fs.readFileSync(greenLeaderboardControlsManifestPath, 'utf8'));
const greenDailyRoomIdentityManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'daily-room-identity', 'manifest.json');
const greenDailyRoomIdentityManifest = JSON.parse(fs.readFileSync(greenDailyRoomIdentityManifestPath, 'utf8'));
const greenDailyStatesManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'daily-states', 'manifest.json');
const greenDailyStatesManifest = JSON.parse(fs.readFileSync(greenDailyStatesManifestPath, 'utf8'));
const greenSettingsRoomIdentityManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'settings-room-identity', 'manifest.json');
const greenSettingsRoomIdentityManifest = JSON.parse(fs.readFileSync(greenSettingsRoomIdentityManifestPath, 'utf8'));
const greenSettingsControlsManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'settings-controls', 'manifest.json');
const greenSettingsControlsManifest = JSON.parse(fs.readFileSync(greenSettingsControlsManifestPath, 'utf8'));
const greenRulesRoomIdentityManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'rules-room-identity', 'manifest.json');
const greenRulesRoomIdentityManifest = JSON.parse(fs.readFileSync(greenRulesRoomIdentityManifestPath, 'utf8'));
const greenRulesPageIllustrationsManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'rules-page-illustrations', 'manifest.json');
const greenRulesPageIllustrationsManifest = JSON.parse(fs.readFileSync(greenRulesPageIllustrationsManifestPath, 'utf8'));
const greenGlobalChatRoomIdentityManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'global-chat-room-identity', 'manifest.json');
const greenGlobalChatRoomIdentityManifest = JSON.parse(fs.readFileSync(greenGlobalChatRoomIdentityManifestPath, 'utf8'));
const greenOnlinePlayersRoomIdentityManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'online-players-room-identity', 'manifest.json');
const greenOnlinePlayersRoomIdentityManifest = JSON.parse(fs.readFileSync(greenOnlinePlayersRoomIdentityManifestPath, 'utf8'));
const greenQuarterlyLeagueRoomIdentityManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'quarterly-league-room-identity', 'manifest.json');
const greenQuarterlyLeagueRoomIdentityManifest = JSON.parse(fs.readFileSync(greenQuarterlyLeagueRoomIdentityManifestPath, 'utf8'));
const greenSoloRoomIdentityManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'solo-room-identity', 'manifest.json');
const greenSoloRoomIdentityManifest = JSON.parse(fs.readFileSync(greenSoloRoomIdentityManifestPath, 'utf8'));
const greenHotseatRoomIdentityManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'hotseat-room-identity', 'manifest.json');
const greenHotseatRoomIdentityManifest = JSON.parse(fs.readFileSync(greenHotseatRoomIdentityManifestPath, 'utf8'));
const greenOnlineRandomRoomIdentityManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'online-random-room-identity', 'manifest.json');
const greenOnlineRandomRoomIdentityManifest = JSON.parse(fs.readFileSync(greenOnlineRandomRoomIdentityManifestPath, 'utf8'));
const greenInviteFriendRoomIdentityManifestPath = path.join(root, 'source-assets', 'green-soft-clay-canonical', 'invite-friend-room-identity', 'manifest.json');
const greenInviteFriendRoomIdentityManifest = JSON.parse(fs.readFileSync(greenInviteFriendRoomIdentityManifestPath, 'utf8'));

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

// Vaskrs theme cleanup contract: active Soft Clay assets only, no legacy emoji
// stand-ins in production states, and icon-only Treasury/Tournament intros.
assert(easterThemeManifest.entrypoints?.backgroundAsset === 'www/assets/theme-backgrounds/easter-v6-1.png', 'Vaskrs manifest mora upućivati na prihvaćenu pozadinu.');
assert(treasurySource.includes('const isEasterIntro = overlay.classList.contains(\'theme-easter\');')
    && treasurySource.includes('if (!isEasterIntro) this.setEasterIntroTitle('), 'Vaskrs Riznica intro mora ostati bez teksta.');
assert(tournamentSource.includes('const isEasterIntro = overlay.classList.contains(\'theme-easter\');')
    && tournamentSource.includes("if (isEasterIntro) {\n                if (title) title.textContent = '';"), 'Vaskrs Turnir intro mora ostati bez teksta.');
assert(themeCssSource.includes('#riznica-intro.theme-easter .riznica-intro-line,\n#tournament-intro.theme-easter .tournament-intro-title {\n    display: none !important;'), 'Vaskrs Riznica/Turnir intro tekst mora biti skriven.');
assert(!themeCssSource.includes("content: '🐣 🥚 🌸'")
    && !themeCssSource.includes("content: '🐇'")
    && !themeCssSource.includes("content: '🥚'"), 'Vaskrs cinematic/loading/empty stanja ne smeju koristiti emoji zamene.');
assert(themeCssSource.includes('body.easter-theme #winner-modal-overlay > .quarter-winner-card'), 'Vaskrs QL winner modal mora imati Soft Clay karticu teme.');
assert(rulesSource.includes('assets/easter-soft-clay/statistics/wins-v3.png?v=opt2')
    && rulesSource.includes('assets/easter-soft-clay/statistics/fire-streak-v3.png?v=opt2')
    && !rulesSource.includes('assets/easter-soft-clay/statistics/wins-v2.png')
    && !rulesSource.includes('assets/easter-soft-clay/statistics/fire-streak-v2.png'), 'Vaskrs Pravila moraju koristiti aktivne v3 Statistics ikone.');
assert(managersSource.includes('assets/easter-soft-clay/settings/display-theme-v2.png?v=opt2')
    && themeCssSource.includes('body.easter-theme #riznica-screen .riznica-easter-theme-fallback {\n    display: none;')
    && themeCssSource.includes('body.easter-theme #riznica-screen .riznica-easter-theme-icon {\n    display: block;'), 'Vaskrs tema u Riznici mora koristiti PNG umesto vidljive rabbit emoji zamene.');
assert(!languagesSource.includes('Vaskršnja 🐇') && !languagesSource.includes('Joyful Easter 🐇'), 'Vaskrs naziv teme ne sme sadržati rabbit emoji zamenu.');
for (const retired of [
    'assets/easter-neumorphic-bg-v1.png',
    'assets/easter-neumorphic-bg-v2.png',
    'assets/easter-neumorphic-bg-v3.png',
    'assets/easter-neumorphic-bg-v4.png',
    'assets/easter-soft-clay/ql/rank-alltime-v2.png',
    'assets/easter-soft-clay/ql/rank-amater-v3.png',
    'assets/easter-soft-clay/ql/rank-profi-v3.png',
    'assets/easter-soft-clay/ql/rank-majstor-v3.png',
    'assets/easter-soft-clay/ql/rank-titan-v3.png',
    'assets/easter-soft-clay/ql/tab-hall-of-fame.png',
    'assets/easter-soft-clay/tournament/podium-silver-v2.png',
    'assets/easter-soft-clay/statistics/wins-v2.png',
    'assets/easter-soft-clay/statistics/fire-streak-v2.png'
]) {
    assert(!fs.existsSync(path.join(www, retired)), `Zastareli Vaskrs runtime asset nije uklonjen: ${retired}`);
}

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
assert(managersSource.includes("const visibleBoughtLabel = isGreenTreasury ? boughtLabel.replace(/^\\s*[✔✓]\\s*/u, '') : boughtLabel;")
    && managersSource.includes("document.body.matches('body:not(:is(.light-theme, .medium-theme"),
    'Green status Kupljeno mora imati samo jednu kvačicu, bez promene natpisa drugih tema.');
assert(managersSource.includes('data-green-category=')
    && managersSource.includes('riznica-green-theme-icon')
    && themeCssSource.includes('#riznica-screen .riznica-green-theme-fallback')
    && themeCssSource.includes('#riznica-screen .riznica-green-theme-icon')
    && configSource.includes('3D Soft Clay tema sa šumskim motivima i glinenim kockicama.'),
    'Green katalog Riznice je izgubio sopstveni motiv ili opis teme.');
assert(managersSource.includes("watchToUnlockLabel.replace(/\\s*📺\\s*/u, ' ').trim()")
    && managersSource.includes("${isGreenTreasury ? '' : '⏱ '}${resolveText(item.duration)}")
    && themeCssSource.includes('#riznica-screen#riznica-screen .card .riznica-reward-video-copy > span')
    && themeCssSource.includes('#riznica-screen .effect-preview-box.prev-confetti::before')
    && themeCssSource.includes('greenClayConfettiFloat'),
    'Green preview Konfeta ili prelom teksta otključavanja reklamom nije sačuvan.');
assert(managersSource.split("getEasterTreasuryStatusIcon('status-active')").length - 1 === 1, 'Active status mora imati tačno jednu shop vezu.');
assert(managersSource.split("getEasterTreasuryStatusIcon('status-locked')").length - 1 === 2, 'Locked status mora ostati vezan za trophy i requirement stanje.');
assert(greenTreasuryControlsManifest.integration?.treasuryTabs === 'connected' && greenTreasuryControlsManifest.integration?.rulesNavigationGlyphs === 'connected' && greenTreasuryControlsManifest.integration?.itemStatusHelper === 'connected' && greenTreasuryControlsManifest.integration?.hiddenDescriptionLock === 'connected' && greenTreasuryControlsManifest.integration?.insufficientFundsAlerts === 'connected' && greenTreasuryControlsManifest.integration?.roomOnDemand === 'connected', 'Green Treasury Controls integracija nije kompletno evidentirana.');
const greenEffectPreviewRegistry = greenAssetRegistry.families?.treasuryEffectPreviews;
const effectPreviewIds = ['wedding', 'thunder', 'fireworks', 'bubbles', 'cosmic-dust', 'dragon-fire', 'royal-yamb', 'fireflies', 'ice-age', 'black-hole', 'supernova', 'neon-pulse', 'drones', 'ufo-abduction'];
const effectPreviewClasses = { wedding: 'balkan', thunder: 'thunder', fireworks: 'fireworks', bubbles: 'bubbles', 'cosmic-dust': 'cosmic-dust', 'dragon-fire': 'dragon-fire', 'royal-yamb': 'royal-yamb', fireflies: 'fireflies', 'ice-age': 'glass', 'black-hole': 'black-hole', supernova: 'supernova', 'neon-pulse': 'neon', drones: 'drones', 'ufo-abduction': 'ufo-abduction' };
assert(greenTreasuryEffectPreviewsManifest.status === 'locked' && greenEffectPreviewRegistry?.status === 'locked', 'Green Treasury effect preview katalog mora biti zaključan.');
assert(greenTreasuryEffectPreviewsManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js'
    && greenTreasuryEffectPreviewsManifest.integration?.liveEffects === 'unchanged'
    && greenTreasuryEffectPreviewsManifest.integration?.roomOnDemand === 'connected', 'Green Treasury effect preview integracija nije kompletna.');
assert(JSON.stringify(greenTreasuryEffectPreviewsManifest.catalog.map(asset => asset.id)) === JSON.stringify(effectPreviewIds)
    && greenEffectPreviewRegistry.canonicalRuntime.length === effectPreviewIds.length, 'Green Treasury mora imati četrnaest zasebnih preview motiva.');
const effectPreviewHashes = new Set();
for (const asset of greenTreasuryEffectPreviewsManifest.catalog) {
    const master = path.join(root, asset.master);
    const runtime = path.join(root, asset.runtime);
    const registered = greenEffectPreviewRegistry.canonicalRuntime.find(item => item.role === asset.id);
    assert(asset.runtime === `www/assets/green-soft-clay/canonical/treasury-effect-previews/preview-${asset.id}-v1.png`
        && registered?.path === asset.runtime.replace(/^www\//, '')
        && registered?.sha256 === asset.runtimeSha256, `Green Treasury effect preview nije pravilno mapiran: ${asset.id}`);
    assert(fs.existsSync(master) && fs.existsSync(runtime), `Nedostaje Green Treasury effect preview: ${asset.id}`);
    const masterInfo = readPngInfo(master);
    const runtimeInfo = readPngInfo(runtime);
    assert(masterInfo.width === 1536 && masterInfo.height === 1024 && masterInfo.colorType === 6
        && runtimeInfo.width === 384 && runtimeInfo.height === 256 && runtimeInfo.colorType === 6,
    `Green Treasury effect preview nema očekivanu rezoluciju ili alpha kanal: ${asset.id}`);
    assert(sha256File(master) === asset.masterSha256 && sha256File(runtime) === asset.runtimeSha256,
        `Green Treasury effect preview sadržaj je promenjen: ${asset.id}`);
    assert(!effectPreviewHashes.has(asset.runtimeSha256), `Green Treasury effect preview je dupliran: ${asset.id}`);
    effectPreviewHashes.add(asset.runtimeSha256);
    assert(themeCssSource.includes(`#riznica-screen .prev-${effectPreviewClasses[asset.id]}::before { background-image: url("${registered.path}?v=1"); }`),
        `Green Treasury effect preview nije vezan za karticu: ${asset.id}`);
    assert(gameSource.split(registered.path).length - 1 === 1, `Green Treasury effect preview nije tačno jednom u room-on-demand paketu: ${asset.id}`);
}
assert(themeCssSource.includes('#riznica-screen :is(.prev-thunder, .prev-balkan, .prev-fireworks, .prev-bubbles, .prev-cosmic-dust, .prev-dragon-fire, .prev-royal-yamb, .prev-fireflies, .prev-glass, .prev-black-hole, .prev-supernova, .prev-neon, .prev-drones, .prev-ufo-abduction)::after {'),
    'Stara dekorativna polja moraju biti uklonjena iz Green effect preview kartica.');
assert(managersSource.includes("isGreenTreasury && ['balkan', 'thunder', 'fireworks', 'bubbles', 'cosmic_dust', 'dragon_fire', 'royal_yamb', 'fireflies', 'ice_age', 'black_hole', 'supernova', 'neon_pulse', 'drones', 'ufo_abduction'].includes(item.id)")
    && themeCssSource.includes('#riznica-screen .prev-royal-yamb :is(.royal-yamb-logo-preview, .royal-yamb-title)'),
    'Green Royal Yamb preview ne sme zadržati stari Logo_green ili dekorativne child elemente.');
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
assert(gameSource.includes("hotseat: path => path.startsWith('hotseat/') || (theme === 'easter' && path.startsWith('game/')) || path.startsWith('canonical/hotseat-winner/') || path === 'canonical/hotseat-room-identity/hotseat-room-v1.png'"), 'Green stvarni Hotseat room matcher ne razdvaja canonical room i Winner paket.');
assert(gameSource.includes("gameOverScreen.classList.toggle('is-hotseat-result', isHotseatResult);") && gameSource.includes("gameOverScreen.classList.toggle('has-result-winner', isHotseatResult && !isDraw);"), 'Green Hotseat Winner više nije ograničen na odlučeni Hotseat rezultat.');
assert(gameSource.includes("gameOverScreen.classList.remove('is-solo-result', 'is-hotseat-result', 'has-result-winner', 'result-win', 'result-loss', 'result-draw');")
    && gameSource.includes("gameOverScreen.classList.add('is-technical-result', `result-${resultType}`);"), 'Online/tehnički rezultat više ne čisti Hotseat Winner stanje.');
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
assert(gameSource.includes("solo: path => path.startsWith('solo/') || (theme === 'easter' && path.startsWith('game/')) || path.startsWith('canonical/solo-results/') || path === 'canonical/solo-room-identity/solo-room-v1.png'"), 'Green stvarni Solo room matcher ne razdvaja canonical room i Results paket.');
assert(gameSource.includes('const soloHighscoreBeforeGame = Math.max(0, Number(this.stats && this.stats.highscore) || 0);') && gameSource.includes('isNewSoloPersonalBest = this.players.length === 1') && gameSource.includes('&& Number(myScoreEntry.score) > soloHighscoreBeforeGame;') && gameSource.includes('if (personalBestBadge) personalBestBadge.hidden = !isNewSoloPersonalBest;'), 'Green Solo Personal Best više nije vezan isključivo za stvarni novi Solo rekord.');
assert(gameSource.includes("gameOverScreen.classList.toggle('is-solo-result', this.players.length === 1);"), 'Green Solo Results prikaz više nije ograničen na Solo rezultat.');
assert(indexSource.includes('<button class="btn-menu btn-secondary game-over-claim-button" onclick="app.claimReward(false)">'), 'Green Solo Finish Claim više nije povezan sa osnovnom claimReward(false) akcijom.');
assert(gameSource.includes('async claimReward(doubled) {') && gameSource.includes('if (this.rewardClaimed || this.rewardClaimInProgress) return;'), 'Solo reward claim zaštita od duplog preuzimanja je promenjena.');
assert(/#game-over-screen\.is-solo-result \.green-solo-finish-score-mark\s*\{[^}]*width:\s*42px;[^}]*height:\s*42px;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Solo Final Score Mark mora ostati 42 × 42 sa contain prikazom.');
assert(/#game-over-screen \.green-solo-personal-best-icon\s*\{[^}]*width:\s*30px;[^}]*height:\s*30px;[^}]*flex:\s*0 0 30px;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Solo Personal Best glyph mora ostati 30 × 30 sa contain prikazom.');
assert(/#game-over-screen\.is-solo-result \.green-solo-finish-action-icon\s*\{[^}]*width:\s*29px;[^}]*height:\s*29px;[^}]*flex:\s*0 0 29px;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Solo Finish Claim glyph mora ostati 29 × 29 sa contain prikazom.');
assert(!indexSource.includes('green-solo-result-mark') && !themeCssSource.includes('.green-solo-result-mark') && themeCssSource.includes('#game-over-screen.is-solo-result .game-over-ducat-legacy,') && themeCssSource.includes('display: none !important;'), 'Green Solo završni prikaz mora ukloniti istorijski skriveni room znak i nastaviti da skriva legacy dukat.');
assert(themeCssSource.includes('animation: easterSoloFinishReveal .48s cubic-bezier(.22, 1, .36, 1) both;') && themeCssSource.includes('#game-over-screen.is-solo-result.screen.active #go-msg { animation-delay: .06s; }') && themeCssSource.includes('#game-over-screen.is-solo-result.screen.active .game-over-score-card { animation-delay: .12s; }') && themeCssSource.includes('#game-over-screen.is-solo-result.screen.active #btn-ad-double { animation-delay: .18s; }') && themeCssSource.includes('#game-over-screen.is-solo-result.screen.active .game-over-claim-button { animation-delay: .24s; }'), 'Green Solo Results reveal motion ili redosled više nije zaključan.');
assert(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?#game-over-screen\.is-solo-result\.screen\.active \.game-over-claim-button\s*\{\s*animation:\s*none !important;/s.test(themeCssSource), 'Green Solo Results nema zaključanu reduced-motion zaštitu.');
for (const exclusion of ['main Solo menu and intro identity', 'locked Rewarded Video and canonical dukat families', 'Statistics record, wins and aggregate metrics', 'Hotseat Winner identity', 'Online, Invite and technical results', 'Tournament awards and states', 'Daily and Treasury states']) {
    assert(greenSoloResultsManifest.semanticExclusions.includes(exclusion), `Solo Results manifest ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(greenRewardedVideoRegistry.compositeRuntime.some(asset => asset.role === 'solo-double-reward' && asset.path === 'assets/green-soft-clay/solo/finish-reward-video-v3.png'), 'Solo Rewarded Video kompozicija mora ostati u zaključanoj Rewarded Video porodici.');
assert(greenSoloResultsManifest.integration?.personalBestState === 'connected' && greenSoloResultsManifest.integration?.scoreDisplay === 'connected' && greenSoloResultsManifest.integration?.claimAction === 'connected' && greenSoloResultsManifest.integration?.roomOnDemand === 'connected' && greenSoloResultsManifest.integration?.legacyRuntime === 'retired in standardization step 3' && greenSoloResultsManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Solo Results integracija i završni audit nisu kompletno evidentirani.');
assert(greenStatisticsOverviewRegistry?.status === 'locked', 'Green Statistics Overview porodica mora biti zaključana u centralnom registru.');
assert(greenStatisticsOverviewManifest.status === 'locked', 'Green Statistics Overview source manifest mora biti zaključan.');
assert(greenThemeManifest.version === 63, 'Green tema mora imati aktuelnu cache verziju 63 posle Rules Page Illustrations integracije.');
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
    'power-index': 4,
    record: 3,
    games: 2,
    wins: 4,
    draws: 4,
    losses: 3,
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
assert(!indexSource.includes('power-index-watermark'), 'Power Index zaglavlje ne sme imati uklonjeni watermark.');
assert(/\.power-index-title-bolt-green\s*\{[^}]*width:\s*27px;[^}]*height:\s*27px;/s.test(themeCssSource) && /\.power-index-value-bolt-green\s*\{[^}]*width:\s*16px;[^}]*height:\s*16px;/s.test(themeCssSource), 'Green Power Index modalne dimenzije više nisu 27 × 27 i 16 × 16.');
assert(/#streak-overlay \.fire-streak-title-soft-clay-icon-green\s*\{[^}]*width:\s*32px;[^}]*height:\s*32px;[^}]*flex:\s*0 0 32px;/s.test(themeCssSource) && /\.fire-streak-value-soft-clay-icon-green\s*\{[^}]*width:\s*23px;[^}]*height:\s*23px;/s.test(themeCssSource), 'Green Fire Streak modalne dimenzije više nisu 32 × 32 i 23 × 23.');
assert(indexSource.includes('onclick="if(window.powerIndexLeaderboard) window.powerIndexLeaderboard.openModal()"') && indexSource.includes('onclick="if(window.vatreniNiz) window.vatreniNiz.openModal()"') && indexSource.includes('onclick="riznicaManager.open()"'), 'Green Statistics kartice više nemaju zaključane Power Index, Fire Streak i Riznica akcije.');
assert(gameSource.includes("document.getElementById('stat-games').innerText = this.stats.games;") && gameSource.includes("document.getElementById('stat-high').innerText = this.stats.highscore;") && gameSource.includes("document.getElementById('stat-wins').innerText = h2hRecord.wins;") && gameSource.includes('if (drawsEl) drawsEl.innerText = h2hRecord.draws;') && gameSource.includes("document.getElementById('stat-losses').innerText = h2hRecord.losses;"), 'Green Statistics osnovne metrike više nisu vezane za očekivane izvore podataka.');
assert(gameSource.includes('const avg = this.stats.games > 0 ? Math.round(this.stats.totalScoreSum / this.stats.games) : 0;') && gameSource.includes('let powerIndex = this.calculatePowerIndex(this.getFullLocalStats(), true);') && gameSource.includes('const realTrophyCount = window.powerIndexCore ? window.powerIndexCore.countPowerIndexTrophies(trophyList) : 0;') && gameSource.includes('let currentStreak = this.stats.currentWinStreak || 0;') && gameSource.includes('const allTimePts = this.stats.totalScoreSum || 0;'), 'Green Statistics izvedene metrike više nisu vezane za očekivane izvore podataka.');
assert(greenH2HStatisticsRegistry?.status === 'locked', 'Green H2H Statistics porodica mora biti zaključana u centralnom registru.');
assert(greenH2HStatisticsManifest.status === 'locked', 'Green H2H Statistics source manifest mora biti zaključan.');
assert(greenThemeManifest.version === 63, 'Green tema mora imati aktuelnu cache verziju 63 posle Rules Page Illustrations integracije.');
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
assert(greenThemeManifest.version === 63, 'Green tema mora imati aktuelnu cache verziju 63 posle Rules Page Illustrations integracije.');
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
assert(indexSource.includes('assets/green-soft-clay/canonical/leaderboard-room-identity/leaderboard-room-menu-v1.png?v=1') && indexSource.includes('assets/green-soft-clay/canonical/leaderboard-room-identity/leaderboard-room-v1.png?v=1') && gameSource.includes("greenIcon: 'assets/green-soft-clay/canonical/leaderboard-room-identity/leaderboard-room-v1.png?v=1'") && rulesSource.includes("'assets/easter-soft-clay/canonical/room-identity/leaderboard-podium-v1.png': 'assets/green-soft-clay/canonical/leaderboard-room-identity/leaderboard-room-v1.png?v=1'"), 'Green Leaderboard Room Identity canonical UI veze nisu kompletne.');
assert(/<button class="btn-square" onclick="app\.showHighscoresScreen\(\)"[\s\S]*?<img class="green-soft-clay-icon" data-theme-src="assets\/green-soft-clay\/canonical\/leaderboard-room-identity\/leaderboard-room-menu-v1\.png\?v=1"/.test(indexSource), 'Green Leaderboard main-menu dugme nije vezano za 384 px canonical menu varijantu.');
assert(/<img class="hs-header-icon hs-header-icon-green" data-theme-src="assets\/green-soft-clay\/canonical\/leaderboard-room-identity\/leaderboard-room-v1\.png\?v=1"/.test(indexSource), 'Green Leaderboard zaglavlje nije vezano za 512 px canonical room varijantu.');
assert(rulesSource.split("'assets/easter-soft-clay/canonical/room-identity/leaderboard-podium-v1.png?v=1'").length - 1 === 4, 'Green Pravila moraju imati četiri Leaderboard reference kroz oba jezika.');
assert(gameSource.includes('canonical\\/leaderboard-room-identity\\/leaderboard-room-menu') && gameSource.includes("path === 'canonical/leaderboard-room-identity/leaderboard-room-v1.png'"), 'Green Leaderboard Room Identity startup fallback ili precizan room matcher nije povezan.');
assert(/#main-menu \.icon-menu-grid \.green-soft-clay-icon\s*\{[^}]*width:\s*52px;[^}]*height:\s*52px;/s.test(themeCssSource) && /@media \(max-width: 599px\) and \(orientation: portrait\)[\s\S]*?#main-menu \.icon-menu-grid \.green-soft-clay-icon\s*\{[^}]*width:\s*46px;[^}]*height:\s*46px;/s.test(themeCssSource), 'Green Leaderboard main-menu prikaz više nema zaključane 52/46 px dimenzije.');
assert(themeCssSource.includes('animation: easterBottomIconWave 8.4s cubic-bezier(.34, 1.56, .64, 1) infinite;') && /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*#main-menu \.icon-menu-grid \.btn-square \.green-soft-clay-icon\s*\{[^}]*animation:\s*none !important;/s.test(themeCssSource), 'Green Leaderboard main-menu wave ili reduced-motion ponašanje nije očuvano.');
assert(/#highscores-screen \.hs-header-icon-green\s*\{[^}]*width:\s*32px;[^}]*height:\s*32px;[^}]*object-fit:\s*contain;/s.test(themeCssSource) && themeCssSource.includes('.btn-square:nth-child(2) .green-soft-clay-icon { animation-delay: 1.38s; }'), 'Green Leaderboard header ili main-menu motion nije očuvan.');
assert(gameSource.includes('scale: 1.16,') && /\.easter-room-intro-mark-wrap\s*\{[^}]*width:\s*clamp\(210px, 34vmin, 290px\);[^}]*height:\s*clamp\(210px, 34vmin, 290px\);/s.test(themeCssSource) && themeCssSource.includes('animation: greenRoomIconPulse 1.8s ease-in-out infinite;') && gameSource.includes('}, 3650);') && gameSource.includes('}, 4600);'), 'Green Leaderboard intro veličina, scale, pulse ili trajanje nisu očuvani.');
assert(themeCssSource.includes('.easter-room-intro.theme-dark.easter-room-intro--icon-only .easter-room-intro-title--hidden') && /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.easter-room-intro\.theme-dark\.easter-room-intro--icon-only \.easter-room-intro-mark\s*\{[^}]*animation:\s*none !important;/s.test(themeCssSource), 'Green Leaderboard icon-only intro ili reduced-motion ponašanje nije očuvano.');
assert(/#rules-overlay-ui \.rules-theme-icon-green\s*\{[^}]*width:\s*1\.42em;[^}]*height:\s*1\.42em;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Leaderboard glyph u Pravilima nema zaključani inline prikaz.');
assert(greenLeaderboardRoomIdentityManifest.variants[0].usedBy.includes('Green theme loading gate Leaderboard icon') && greenLeaderboardRoomIdentityManifest.variants[0].displaySizes.some(size => JSON.stringify(size) === '[45,45]') && /\.theme-loading-gate__icons img\s*\{[^}]*width:\s*45px;[^}]*height:\s*45px;[^}]*object-fit:\s*contain;[^}]*animation:\s*themeLoadingIconFloat 2\.6s/s.test(styleCssSource), 'Green Leaderboard loading gate uloga, veličina ili motion nisu očuvani.');
// Leaderboard Controls step 4: lock the visual, semantic and delivery contract.
const greenLeaderboardControlsAudit = [
    { id: 'global', sourceBytes: 986476, sourceSha256: '23ff6206d71ee940dbbbcf4e86e5deba117639c9f3a78d6fa6accf8ed64e1222', runtimeSize: 256, runtimeBytes: 47269, runtimeSha256: '3a9aa67230a1d53d6e1e05dac1b8f8ca4a738f92cb3cf07d495bde165ac2519a', references: 3 },
    { id: 'local', sourceBytes: 863574, sourceSha256: '74ac656255517939ad032b8a72bcdc180fae36f490c97eb3d2149ad2a7b744f8', runtimeSize: 256, runtimeBytes: 38952, runtimeSha256: '44e60c1c9a9166f77294a9d3197bdb4cfd41c64d283753288635498de39d5630', references: 3 },
    { id: 'empty-loading', sourceBytes: 732830, sourceSha256: 'dcc5dadc8889bb495d1496f25d145b2f043343701fc01a72192cbd60998d0afe', runtimeSize: 384, runtimeBytes: 68504, runtimeSha256: '7b0c89808cd5185fb53e16a52320f1e575fbeeb691efad255971f5ca9aee67ba', references: 4 }
];
const greenLeaderboardControlsRegistry = greenAssetRegistry.families?.leaderboardControls;
assert(greenLeaderboardControlsManifest.status === 'locked' && greenLeaderboardControlsRegistry?.status === 'locked', 'Green Leaderboard Controls source manifest i registar moraju biti zaključani.');
assert(greenLeaderboardControlsRegistry.sourceManifest === path.relative(root, greenLeaderboardControlsManifestPath).replaceAll('\\', '/') && greenLeaderboardControlsRegistry.semanticRole === greenLeaderboardControlsManifest.semanticRole, 'Green Leaderboard Controls registry izvor ili uloga odstupa.');
assert(JSON.stringify(greenLeaderboardControlsRegistry.identity) === JSON.stringify(greenLeaderboardControlsManifest.identity), 'Green Leaderboard Controls identitet registra i manifesta odstupa.');
assert(greenLeaderboardControlsManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenLeaderboardControlsManifest.identity?.mapping === 'one immutable PNG for Global navigation, one for Local navigation and one shared empty/loading state', 'Green Leaderboard Controls DNK ili mapiranje odstupa.');
assert(JSON.stringify(greenLeaderboardControlsManifest.catalog.map(asset => asset.id)) === JSON.stringify(['global', 'local', 'empty-loading']), 'Green Leaderboard Controls katalog mora imati Global, Local i Empty/Loading redosled.');
assert(JSON.stringify(greenLeaderboardControlsManifest.catalog.map(asset => asset.displaySizes)) === JSON.stringify([[[21, 21], [25, 25]], [[21, 21], [25, 25]], [[86, 86], [58, 58]]]), 'Green Leaderboard Controls stvarne UI veličine nisu zaključane.');
assert(greenLeaderboardControlsManifest.catalog[0].glyph === 'warm-ivory podium with a forest-green and ivory globe, terracotta star and forest-green base' && greenLeaderboardControlsManifest.catalog[1].glyph === 'forest-green circular location mark with a warm-ivory house, terracotta dot and small ivory podium' && greenLeaderboardControlsManifest.catalog[2].glyph === 'terracotta hourglass above a warm-ivory podium on a forest-green base', 'Green Leaderboard Controls vizuelne siluete odstupaju.');
for (const asset of greenLeaderboardControlsAudit) {
    const source = path.join(root, 'source-assets', 'green-soft-clay-hires', 'leaderboard', `${asset.id}-v1.png`);
    const runtime = path.join(www, 'assets', 'green-soft-clay', 'leaderboard', `${asset.id}-v1.png`);
    const sourceInfo = readPngInfo(source);
    assert(sourceInfo.width === 1254 && sourceInfo.height === 1254 && sourceInfo.colorType === 6 && fs.statSync(source).size === asset.sourceBytes && sha256File(source) === asset.sourceSha256, `Green Leaderboard ${asset.id} odobreni izvor odstupa.`);
    assert(!fs.existsSync(runtime), `Green Leaderboard ${asset.id} stari runtime nije povučen.`);
    const oldPath = `assets/green-soft-clay/leaderboard/${asset.id}-v1.png`;
    const oldReferences = [indexSource, leaderboardSource, gameSource].reduce((count, sourceText) => count + sourceText.split(oldPath).length - 1, 0);
    assert(oldReferences === 0, `Green Leaderboard ${asset.id} ima ${oldReferences} zastarelih referenci.`);
    const catalogAsset = greenLeaderboardControlsManifest.catalog.find(item => item.id === asset.id);
    const master = path.join(path.dirname(greenLeaderboardControlsManifestPath), catalogAsset.master);
    const canonical = path.join(root, catalogAsset.runtime);
    const masterInfo = readPngInfo(master);
    const canonicalInfo = readPngInfo(canonical);
    assert(catalogAsset.approvedSource === path.relative(root, source).replaceAll('\\', '/') && catalogAsset.activeRuntime === path.relative(root, runtime).replaceAll('\\', '/'), `Green Leaderboard ${asset.id} manifest izvora ili aktivne putanje odstupa.`);
    assert(masterInfo.width === 1254 && masterInfo.height === 1254 && masterInfo.colorType === 6 && fs.statSync(master).size === asset.sourceBytes && sha256File(master) === asset.sourceSha256 && catalogAsset.masterSha256 === asset.sourceSha256 && catalogAsset.approvedSourceSha256 === asset.sourceSha256 && catalogAsset.masterBytes === asset.sourceBytes, `Green Leaderboard ${asset.id} canonical master nije bajt-po-bajt odobreni izvor.`);
    assert(canonicalInfo.width === asset.runtimeSize && canonicalInfo.height === asset.runtimeSize && canonicalInfo.colorType === 6 && fs.statSync(canonical).size === asset.runtimeBytes && sha256File(canonical) === asset.runtimeSha256 && catalogAsset.runtimeSha256 === asset.runtimeSha256 && catalogAsset.activeRuntimeSha256 === asset.runtimeSha256 && catalogAsset.runtimeBytes === asset.runtimeBytes, `Green Leaderboard ${asset.id} canonical runtime nije bajt-po-bajt aktivna kopija.`);
    assert(catalogAsset.runtime === `www/assets/green-soft-clay/canonical/leaderboard-controls/${asset.id}-v1.png` && JSON.stringify(catalogAsset.runtimeSize) === JSON.stringify([asset.runtimeSize, asset.runtimeSize]) && catalogAsset.legacyReferencesBeforeIntegration === asset.references && catalogAsset.expectedCanonicalReferences === asset.references, `Green Leaderboard ${asset.id} canonical ugovor odstupa.`);
    const canonicalPath = catalogAsset.runtime.slice('www/'.length);
    const references = [indexSource, leaderboardSource, gameSource].reduce((count, sourceText) => count + sourceText.split(canonicalPath).length - 1, 0);
    assert(references === asset.references, `Green Leaderboard ${asset.id} mora imati ${asset.references} canonical referenci, pronađeno ${references}.`);
    const expectedByConsumer = asset.id === 'empty-loading' ? [0, 1, 3] : [2, 0, 1];
    assert([indexSource, leaderboardSource, gameSource].every((sourceText, index) => sourceText.split(canonicalPath).length - 1 === expectedByConsumer[index]), `Green Leaderboard ${asset.id} nije vezan za očekivane UI i sobne potrošače.`);
    const registryAsset = greenLeaderboardControlsRegistry.canonicalRuntime.find(item => item.role === asset.id);
    assert(registryAsset?.path === canonicalPath && registryAsset.size === asset.runtimeSize && registryAsset.bytes === asset.runtimeBytes && registryAsset.sha256 === asset.runtimeSha256, `Green Leaderboard ${asset.id} registry metapodaci odstupaju.`);
    assert(greenLeaderboardControlsRegistry.forbiddenRuntimePaths.includes(oldPath) && greenLeaderboardControlsRegistry.retiredMasterReplacements[`leaderboard/${asset.id}-v1.png`] === `canonical/leaderboard-controls/${asset.id}-v1.png`, `Green Leaderboard ${asset.id} istorijsko mapiranje odstupa.`);
}
assert(greenLeaderboardControlsRegistry.canonicalRuntime.length === 3 && greenLeaderboardControlsRegistry.compositeRuntime.length === 0 && JSON.stringify(greenLeaderboardControlsRegistry.semanticExclusions) === JSON.stringify(greenLeaderboardControlsManifest.semanticExclusions), 'Green Leaderboard Controls registar ima neočekivane assete ili semantičke granice.');
assert(JSON.stringify(greenLeaderboardControlsRegistry.codeBindings) === JSON.stringify(['Green Global and Local tabs and panel headings', 'Green Leaderboard empty and loading states', 'Green online waiting Hall of Fame shared loading and empty state', 'Green Leaderboard room-on-demand pack']), 'Green Leaderboard Controls code-binding ugovor odstupa.');
assert(greenLeaderboardControlsManifest.motionContract?.navigationGlyphs === 'static' && greenLeaderboardControlsManifest.motionContract?.leaderboardState === 'greenLeaderboardStateFloat 2.4s for empty and loading states' && greenLeaderboardControlsManifest.motionContract?.onlineWaitingState === 'greenWaitingHofStateFloat 2.4s for the shared online waiting glyph', 'Green Leaderboard Controls motion ugovor odstupa.');
assert(greenLeaderboardControlsManifest.catalog[2].usedBy.includes('Online waiting Hall of Fame loading and empty states') && greenLeaderboardControlsManifest.catalog[2].displaySizes.some(size => JSON.stringify(size) === '[58,58]'), 'Green Leaderboard deljeni online waiting potrošač nije evidentiran.');
assert(JSON.stringify(greenLeaderboardControlsManifest.protectedFamilies.map(family => family.id)) === JSON.stringify(['leaderboardRoomIdentity', 'competitionMedals', 'onlineRandomRoomIdentity']) && greenLeaderboardRoomIdentityManifest.status === 'locked' && greenCompetitionMedalsRegistry?.status === 'locked', 'Green Leaderboard Controls zaštićene semantičke porodice nisu očuvane.');
assert(greenLeaderboardControlsManifest.integration?.leaderboardUi === 'connected' && greenLeaderboardControlsManifest.integration?.onlineWaitingUi === 'connected' && greenLeaderboardControlsManifest.integration?.roomOnDemand === 'connected' && greenLeaderboardControlsManifest.integration?.centralRegistry === 'standardized in standardization step 3' && greenLeaderboardControlsManifest.integration?.activeRuntime === 'retired in standardization step 3' && greenLeaderboardControlsManifest.integration?.cacheVersion === 61 && greenLeaderboardControlsManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Leaderboard Controls završni audit status odstupa.');
assert(/#highscores-screen \.hs-tab-soft-clay-icon-green\s*\{[^}]*width:\s*21px;[^}]*height:\s*21px;/s.test(themeCssSource) && /#highscores-screen \.hs-panel-soft-clay-icon-green\s*\{[^}]*width:\s*25px;[^}]*height:\s*25px;/s.test(themeCssSource), 'Green Leaderboard Global/Local tab ili panel naslov mera odstupa.');
assert(/#highscores-screen \.hs-state-soft-clay-icon-green\s*\{[^}]*width:\s*86px;[^}]*height:\s*86px;[^}]*animation:\s*greenLeaderboardStateFloat 2\.4s/s.test(themeCssSource) && /#highscores-screen \.hs-list-state-loading \.hs-state-soft-clay-icon-green\s*\{[^}]*width:\s*86px;[^}]*height:\s*86px;/s.test(themeCssSource), 'Green Leaderboard empty/loading prikaz ili motion odstupa.');
assert(/#waiting-screen\.is-random-online \.waiting-hof-state-soft-clay-icon-green\s*\{[^}]*width:\s*58px;[^}]*height:\s*58px;[^}]*animation:\s*greenWaitingHofStateFloat 2\.4s/s.test(themeCssSource), 'Green online waiting deljeni state prikaz ili motion odstupa.');
assert(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?#highscores-screen \.hs-state-soft-clay-icon-green\s*\{[^}]*animation:\s*none !important;/s.test(themeCssSource) && /@media \(prefers-reduced-motion: reduce\)[\s\S]*?#waiting-screen\.is-random-online \.waiting-hof-state-soft-clay-icon-green\s*\{[^}]*animation:\s*none !important;/s.test(themeCssSource), 'Green Leaderboard deljeni state reduced-motion zaštita odstupa.');
assert(greenLeaderboardRoomIdentityManifest.semanticExclusions.includes('Global and Local leaderboard navigation glyphs') && greenLeaderboardRoomIdentityManifest.semanticExclusions.includes('Leaderboard empty and loading state glyph shared with online waiting') && greenCompetitionMedalsRegistry?.status === 'locked', 'Green Leaderboard Controls semantička granica prema sobnom znaku i medaljama odstupa.');
const greenLeaderboardControlsAuditInfo = readPngInfo(path.join(root, 'docs', 'green-asset-standardization-leaderboard-controls-audit.png'));
assert(greenLeaderboardControlsAuditInfo.width === 1480 && greenLeaderboardControlsAuditInfo.height === 974 && greenLeaderboardControlsAuditInfo.colorType === 6, 'Green Leaderboard Controls Korak 1 audit tabla nedostaje ili je nepotpuna.');
const greenLeaderboardControlsAuditSource = fs.readFileSync(path.join(root, 'scripts', 'make-green-leaderboard-controls-audit-sheet.py'), 'utf8');
for (const asset of greenLeaderboardControlsAudit) {
    assert(greenLeaderboardControlsAuditSource.includes(`canonical/leaderboard-controls/${asset.id}-v1.png`) && !greenLeaderboardControlsAuditSource.includes(`RUNTIME / "leaderboard/${asset.id}-v1.png"`), `Green Leaderboard ${asset.id} audit mora prikazivati canonical, a ne povučeni runtime.`);
}
assert(greenDailyRoomIdentityManifest.status === 'locked' && greenDailyRoomIdentityRegistry?.status === 'locked', 'Green Daily Room Identity manifest i centralni registar moraju biti zaključani.');
assert(greenThemeManifest.version === 63, 'Green tema mora imati aktuelnu cache verziju 63 posle Rules Page Illustrations integracije.');
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
// Daily States step 4: lock the visually, semantically and technically audited
// canonical family without changing its pixels, consumers or cache version.
assert(greenDailyStatesManifest.status === 'locked' && greenDailyStatesRegistry?.status === 'locked', 'Green Daily States manifest i centralni registar moraju biti zaključani.');
assert(greenDailyStatesManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenDailyStatesManifest.identity?.mapping === 'one immutable PNG identity for each Daily task, completion and already-played state', 'Green Daily States canonical DNK ili mapping odstupa.');
assert(greenDailyStatesManifest.identity?.presentation === 'one centered state glyph on a transparent background without text, frame or backing tile' && greenDailyStatesManifest.identity?.palette === 'forest-green, warm-ivory and one restrained terracotta accent', 'Green Daily States prezentacija ili paleta odstupa.');
assert(JSON.stringify(greenDailyStatesRegistry.identity) === JSON.stringify(greenDailyStatesManifest.identity), 'Green Daily States registar i source manifest nemaju isti identitet.');
assert(JSON.stringify(greenDailyStatesManifest.catalog.map(state => state.id)) === JSON.stringify(['task', 'complete', 'already-played']), 'Green Daily States katalog mora zadržati task, complete, already-played redosled.');
assert(JSON.stringify(greenDailyStatesManifest.catalog.map(state => state.role)) === JSON.stringify(['active Daily Challenge task and target state', 'successfully completed Daily Challenge state', 'already-played Daily Challenge replay-lock state']), 'Green Daily States semantičke uloge odstupaju.');
assert(JSON.stringify(greenDailyStatesManifest.catalog.map(state => state.glyph)) === JSON.stringify([
    'warm-ivory checklist calendar with forest-green binders and check, terracotta top and task dots, and one pale-green active row',
    'forest-green completion medallion with a large warm-ivory check and one restrained terracotta accent',
    'warm-ivory calendar with forest-green binders, check and clock hands plus a terracotta top and clock rim'
]), 'Green Daily States zaključane vizuelne siluete odstupaju.');
for (const state of greenDailyStatesManifest.catalog) {
    const master = path.join(path.dirname(greenDailyStatesManifestPath), state.master);
    const approvedSource = path.join(root, state.approvedSource);
    const runtime = path.join(root, state.runtime);
    const activeRuntime = path.join(root, state.activeRuntime);
    assert(fs.existsSync(master) && fs.existsSync(approvedSource) && fs.existsSync(runtime) && !fs.existsSync(activeRuntime), `Green Daily ${state.id} canonical paket nije kompletan ili legacy kopija nije uklonjena.`);
    const masterInfo = readPngInfo(master);
    const sourceInfo = readPngInfo(approvedSource);
    const runtimeInfo = readPngInfo(runtime);
    assert(masterInfo.width === 1254 && masterInfo.height === 1254 && masterInfo.colorType === 6 && JSON.stringify([masterInfo.width, masterInfo.height]) === JSON.stringify(state.masterSize), `Green Daily ${state.id} master nije 1254 × 1254 RGBA.`);
    assert(sourceInfo.width === 1254 && sourceInfo.height === 1254 && sourceInfo.colorType === 6 && JSON.stringify([sourceInfo.width, sourceInfo.height]) === JSON.stringify(state.approvedSourceSize), `Green Daily ${state.id} odobreni izvor nije 1254 × 1254 RGBA.`);
    assert(runtimeInfo.width === 384 && runtimeInfo.height === 384 && runtimeInfo.colorType === 6, `Green Daily ${state.id} canonical runtime nije 384 × 384 RGBA.`);
    assert(fs.statSync(master).size === state.masterBytes && fs.statSync(approvedSource).size === state.approvedSourceBytes && sha256File(master) === state.masterSha256 && sha256File(approvedSource) === state.approvedSourceSha256 && state.masterSha256 === state.approvedSourceSha256, `Green Daily ${state.id} master nije bajt-po-bajt odobreni izvor.`);
    assert(fs.statSync(runtime).size === state.runtimeBytes && sha256File(runtime) === state.runtimeSha256 && state.runtimeSha256 === state.activeRuntimeSha256 && state.runtimeBytes === state.activeRuntimeBytes, `Green Daily ${state.id} canonical ne čuva odobreni legacy sadržaj.`);
    assert(state.runtime === `www/assets/green-soft-clay/canonical/daily-states/${state.id}-v1.png` && state.activeRuntime === `www/assets/green-soft-clay/daily/${state.id}-v1.png`, `Green Daily ${state.id} canonical ili aktivna putanja odstupa.`);
    assert(state.normalization === 'direct 1254x1254 to 384x384 LANCZOS reduction on the full transparent RGBA canvas', `Green Daily ${state.id} normalizacija odstupa.`);
    const activePath = state.activeRuntime.slice('www/'.length);
    const canonicalPath = state.runtime.slice('www/'.length);
    const activeReferences = [dailyChallengeSource, gameSource].reduce((count, sourceText) => count + sourceText.split(activePath).length - 1, 0);
    const canonicalReferences = [dailyChallengeSource, gameSource, indexSource, rulesSource].reduce((count, sourceText) => count + sourceText.split(canonicalPath).length - 1, 0);
    assert(activeReferences === 0 && canonicalReferences === state.expectedCanonicalReferences && state.legacyReferencesBeforeIntegration === 2, `Green Daily ${state.id} integracioni bilans odstupa: legacy ${activeReferences}, canonical ${canonicalReferences}.`);
    const registered = greenDailyStatesRegistry.canonicalRuntime.find(asset => asset.role === state.id);
    assert(registered?.path === canonicalPath && registered?.size === 384 && registered?.sha256 === state.runtimeSha256, `Green Daily ${state.id} registry zapis odstupa.`);
}
assert(JSON.stringify(greenDailyStatesManifest.catalog.map(state => state.displaySize)) === JSON.stringify([[44, 44], [58, 58], [104, 104]]), 'Green Daily States prikazne mere odstupaju.');
assert(greenDailyStatesRegistry.canonicalRuntime.length === 3 && greenDailyStatesRegistry.compositeRuntime.length === 0 && JSON.stringify(greenDailyStatesRegistry.semanticExclusions) === JSON.stringify(greenDailyStatesManifest.semanticExclusions), 'Green Daily States registar mora imati tačno tri canonical isporuke i iste semantičke granice.');
assert(JSON.stringify(greenDailyStatesRegistry.codeBindings) === JSON.stringify(['Green Daily Challenge task card', 'Green Daily Challenge successful-completion card', 'Green Daily Challenge already-played replay-lock card', 'Green Daily room-on-demand pack']), 'Green Daily States registry code-binding ugovor odstupa.');
assert(JSON.stringify(greenDailyStatesRegistry.forbiddenRuntimePaths) === JSON.stringify(['assets/green-soft-clay/daily/task-v1.png', 'assets/green-soft-clay/daily/complete-v1.png', 'assets/green-soft-clay/daily/already-played-v1.png']), 'Green Daily States legacy zabrana nije kompletna.');
assert(JSON.stringify(greenDailyStatesRegistry.retiredMasterReplacements) === JSON.stringify({ 'daily/task-v1.png': 'canonical/daily-states/task-v1.png', 'daily/complete-v1.png': 'canonical/daily-states/complete-v1.png', 'daily/already-played-v1.png': 'canonical/daily-states/already-played-v1.png' }), 'Green Daily States istorijsko mapiranje zamena nije kompletno.');
assert(JSON.stringify(greenDailyStatesManifest.protectedFamilies.map(family => family.id)) === JSON.stringify(['dailyRoomIdentity', 'rewardedVideo', 'ducat']), 'Green Daily States protected-family granica nije kompletna.');
assert(greenDailyRoomIdentityManifest.status === 'locked' && greenRewardedVideoManifest.status === 'locked' && greenDucatRegistry?.status === 'locked', 'Daily Room Identity, Rewarded Video i Ducat moraju ostati zaključani tokom Daily States staginga.');
assert(greenDailyStatesManifest.motionContract?.stateGlyphs === 'static' && greenDailyStatesManifest.motionContract?.diceMotion === 'dailyDicePulse 0.32s applies only to rolling Daily dice', 'Green Daily States motion ugovor odstupa.');
assert(greenDailyStatesManifest.integration?.dailyUi === 'connected' && greenDailyStatesManifest.integration?.roomOnDemand === 'connected' && greenDailyStatesManifest.integration?.centralRegistry === 'standardized in standardization step 3' && greenDailyStatesManifest.integration?.activeRuntime === 'retired in standardization step 3' && greenDailyStatesManifest.integration?.cacheVersion === 60 && greenThemeManifest.version === 63 && greenDailyStatesManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Daily States integracija, cache ili završni audit odstupa.');
assert(/\.daily-glass-task-mark-green\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/s.test(dailyChallengeSource), 'Green Daily task prikaz više nije 44 × 44 px.');
assert(/\.daily-glass-complete-mark-green\s*\{[^}]*width:\s*58px;[^}]*height:\s*58px;/s.test(dailyChallengeSource), 'Green Daily complete prikaz više nije 58 × 58 px.');
assert(/\.daily-already-green-icon\s*\{[^}]*filter:[^}]*\}/s.test(dailyChallengeSource) && /\.daily-already-green-icon,[\s\S]*?width:\s*104px;[\s\S]*?height:\s*104px;/s.test(dailyChallengeSource), 'Green Daily already-played prikaz više nije 104 × 104 px.');
assert(dailyChallengeSource.includes('.daily-glass-die.rolling') && dailyChallengeSource.includes('animation: dailyDicePulse 0.32s ease-in-out infinite;'), 'Daily dice motion mora ostati vezan za kockice, odvojeno od tri state glyph-a.');
for (const exclusion of ['Daily task list and target glyph', 'Daily completed confirmation glyph', 'Daily already-played calendar with clock status']) assert(greenDailyRoomIdentityManifest.semanticExclusions.includes(exclusion), `Daily Room Identity mora zadržati Daily States granicu: ${exclusion}`);
assert(greenRewardedVideoRegistry.semanticExclusions.includes('daily completed and already-played states'), 'Rewarded Video porodica mora ostati odvojena od Daily complete/already-played stanja.');
const greenDailyStatesAuditInfo = readPngInfo(path.join(root, 'docs', 'green-asset-standardization-daily-states-audit.png'));
assert(greenDailyStatesAuditInfo.width === 1480 && greenDailyStatesAuditInfo.height === 974 && greenDailyStatesAuditInfo.colorType === 6, 'Green Daily States Korak 1 audit tabla nedostaje ili je nepotpuna.');
const greenDailyStatesAuditScriptSource = fs.readFileSync(path.join(root, 'scripts', 'make-green-daily-states-audit-sheet.py'), 'utf8');
for (const state of ['task', 'complete', 'already-played']) assert(greenDailyStatesAuditScriptSource.includes(`canonical/daily-states/${state}-v1.png`), `Green Daily States audit skripta ne koristi canonical ${state} runtime.`);
assert(!greenDailyStatesAuditScriptSource.includes('RUNTIME / "daily/task-v1.png"') && !greenDailyStatesAuditScriptSource.includes('RUNTIME / "daily/complete-v1.png"') && !greenDailyStatesAuditScriptSource.includes('RUNTIME / "daily/already-played-v1.png"'), 'Green Daily States audit skripta je vratila legacy runtime putanju.');
assert(greenSettingsRoomIdentityManifest.status === 'locked' && greenSettingsRoomIdentityRegistry?.status === 'locked', 'Green Settings Room Identity manifest i centralni registar moraju biti zaključani.');
assert(greenThemeManifest.version === 63 && greenSettingsRoomIdentityManifest.integration?.cacheVersion === 51, 'Green Settings Room Identity mora zadržati svoju istorijsku cache verziju 51 dok je tema na verziji 63.');
assert(JSON.stringify(greenSettingsRoomIdentityRegistry.identity) === JSON.stringify(greenSettingsRoomIdentityManifest.identity), 'Green Settings Room Identity registar i manifest nemaju isti identitet.');
assert(greenSettingsRoomIdentityManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenSettingsRoomIdentityManifest.identity?.mapping === 'one immutable Settings room identity with room and menu delivery variants', 'Green Settings Room Identity DNK ili pravilo jednog identiteta je promenjeno.');
assert(greenSettingsRoomIdentityManifest.identity?.presentation === 'one centered free-standing gear glyph on a transparent background without text, frame or backing tile' && greenSettingsRoomIdentityManifest.identity?.palette === 'forest-green gear, warm-ivory raised ring and one terracotta center dot', 'Green Settings Room Identity vizuelna silueta ili paleta je promenjena.');
const settingsRoomMaster = path.join(path.dirname(greenSettingsRoomIdentityManifestPath), greenSettingsRoomIdentityManifest.master.path);
const settingsRoomApprovedSource = path.join(root, greenSettingsRoomIdentityManifest.master.approvedSource);
assert(fs.existsSync(settingsRoomMaster) && fs.existsSync(settingsRoomApprovedSource), 'Nedostaje Green Settings Room Identity master ili odobreni izvor.');
const settingsRoomMasterInfo = readPngInfo(settingsRoomMaster);
assert(settingsRoomMasterInfo.width === 1254 && settingsRoomMasterInfo.height === 1254 && [4, 6].includes(settingsRoomMasterInfo.colorType), 'Green Settings Room Identity master mora biti 1254 × 1254 sa direktnim alpha kanalom.');
assert(fs.statSync(settingsRoomMaster).size === greenSettingsRoomIdentityManifest.master.bytes && sha256File(settingsRoomMaster) === greenSettingsRoomIdentityManifest.master.sha256 && sha256File(settingsRoomApprovedSource) === greenSettingsRoomIdentityManifest.master.approvedSourceSha256 && greenSettingsRoomIdentityManifest.master.sha256 === greenSettingsRoomIdentityManifest.master.approvedSourceSha256, 'Green Settings Room Identity master nije bajt-po-bajt odobreni izvor.');
assert(JSON.stringify(greenSettingsRoomIdentityManifest.variants.map(asset => asset.id)) === JSON.stringify(['room', 'menu']), 'Green Settings Room Identity mora imati tačno room i menu delivery varijantu.');
const settingsRoomConsumerSources = [indexSource, gameSource, rulesSource];
for (const variant of greenSettingsRoomIdentityManifest.variants) {
    const runtime = path.join(root, variant.runtime);
    const activeRuntime = path.join(root, variant.activeRuntime);
    assert(fs.existsSync(runtime) && !fs.existsSync(activeRuntime), `Green Settings Room Identity canonical nedostaje ili je stari runtime ostao: ${variant.id}`);
    const runtimeInfo = readPngInfo(runtime);
    assert(JSON.stringify([runtimeInfo.width, runtimeInfo.height]) === JSON.stringify(variant.runtimeSize) && [4, 6].includes(runtimeInfo.colorType), `Green Settings Room Identity dimenzija ili alpha kanal odstupa: ${variant.id}`);
    assert(fs.statSync(runtime).size === variant.runtimeBytes && sha256File(runtime) === variant.runtimeSha256 && variant.runtimeSha256 === variant.activeRuntimeSha256, `Green Settings Room Identity canonical otisak odstupa od odobrenog runtimea: ${variant.id}`);
    const canonicalPath = variant.runtime.replace(/^www\//, '');
    const activePath = variant.activeRuntime.replace(/^www\//, '');
    const canonicalReferences = settingsRoomConsumerSources.reduce((count, source) => count + source.split(canonicalPath).length - 1, 0);
    const activeReferences = settingsRoomConsumerSources.reduce((count, source) => count + source.split(activePath).length - 1, 0);
    assert(canonicalReferences === variant.expectedCanonicalReferences && activeReferences === 0, `Green Settings Room Identity canonical veze odstupaju: ${variant.id} (${canonicalReferences} canonical, ${activeReferences} starih).`);
    const registryVariant = greenSettingsRoomIdentityRegistry.canonicalRuntime.find(asset => asset.role === variant.id);
    assert(registryVariant?.path === canonicalPath && registryVariant?.size === variant.runtimeSize[0] && registryVariant?.sha256 === variant.runtimeSha256, `Green Settings Room Identity registry zapis odstupa: ${variant.id}`);
}
const rejectedSettingsRoomCandidate = greenSettingsRoomIdentityManifest.rejectedCandidates?.[0];
assert(greenSettingsRoomIdentityManifest.rejectedCandidates?.length === 1 && rejectedSettingsRoomCandidate?.id === 'settings-pro-v1' && rejectedSettingsRoomCandidate?.status === 'rejected-orphan' && rejectedSettingsRoomCandidate?.activeReferences === 0, 'Green Settings Room Identity mora evidentirati odbačeni framed orphan.');
const rejectedSettingsRoomSource = path.join(root, rejectedSettingsRoomCandidate.source);
const rejectedSettingsRoomRuntime = path.join(root, rejectedSettingsRoomCandidate.runtime);
assert(fs.existsSync(rejectedSettingsRoomSource) && !fs.existsSync(rejectedSettingsRoomRuntime) && sha256File(rejectedSettingsRoomSource) === rejectedSettingsRoomCandidate.sourceSha256, 'Green Settings Room Identity odbačeni izvor nije sačuvan ili runtime nije uklonjen.');
assert(settingsRoomConsumerSources.every(source => !source.includes('assets/green-soft-clay/settings-pro-v1.png')), 'Odbačeni Green Settings Pro kandidat ima aktivnog UI potrošača.');
assert(Object.values(greenSettingsRoomIdentityManifest.integration || {}).filter(value => value === 'connected').length === 7 && greenSettingsRoomIdentityManifest.integration?.legacyRuntime === 'retired in standardization step 3' && greenSettingsRoomIdentityManifest.integration?.centralRegistry === 'standardized in standardization step 3' && greenSettingsRoomIdentityManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Settings Room Identity integracija ili završni audit nisu kompletni.');
assert(JSON.stringify(greenSettingsRoomIdentityRegistry.semanticExclusions) === JSON.stringify(greenSettingsRoomIdentityManifest.semanticExclusions), 'Green Settings Room Identity registar i manifest ne dele iste semantičke granice.');
assert(JSON.stringify(greenSettingsRoomIdentityRegistry.forbiddenRuntimePaths) === JSON.stringify(['assets/green-soft-clay/settings-free-v2.png', 'assets/green-soft-clay/runtime/menu/settings-free-v2.png', 'assets/green-soft-clay/settings-pro-v1.png']), 'Green Settings Room Identity zabrana legacy runtime putanja nije kompletna.');
assert(JSON.stringify(greenSettingsRoomIdentityRegistry.retiredMasterReplacements) === JSON.stringify({ 'settings-free-v2.png': 'canonical/settings-room-identity/settings-room-v1.png', 'runtime/menu/settings-free-v2.png': 'canonical/settings-room-identity/settings-room-menu-v1.png', 'settings-pro-v1.png': 'canonical/settings-room-identity/settings-room-v1.png' }), 'Green Settings Room Identity istorijsko mapiranje zamena nije kompletno.');
assert(greenSettingsRoomIdentityRegistry.canonicalRuntime.length === 2 && JSON.stringify(greenSettingsRoomIdentityRegistry.canonicalRuntime.map(asset => asset.role)) === JSON.stringify(['room', 'menu']), 'Green Settings Room Identity registar mora imati room i menu canonical ulogu.');
for (const exclusion of ['Settings profile and account glyph', 'Settings sound, music and vibration glyphs', 'Settings display/theme and language glyphs', 'Settings terms and privacy glyphs', 'live form controls, account data and legal links', 'other room identities, medals, ranks and gameplay dice']) {
    assert(greenSettingsRoomIdentityManifest.semanticExclusions.includes(exclusion), `Green Settings Room Identity ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(indexSource.includes('assets/green-soft-clay/canonical/settings-room-identity/settings-room-menu-v1.png?v=1') && indexSource.includes('assets/green-soft-clay/canonical/settings-room-identity/settings-room-v1.png?v=1') && gameSource.includes("greenIcon: 'assets/green-soft-clay/canonical/settings-room-identity/settings-room-v1.png?v=1'") && rulesSource.includes("'assets/easter-soft-clay/settings-pro-v3.png': 'assets/green-soft-clay/canonical/settings-room-identity/settings-room-v1.png?v=1'"), 'Green Settings Room Identity canonical UI veze nisu kompletne.');
assert(/<button class="btn-square" onclick="app\.showSettings\(\)"[\s\S]*?<img class="green-soft-clay-icon" data-theme-src="assets\/green-soft-clay\/canonical\/settings-room-identity\/settings-room-menu-v1\.png\?v=1"/.test(indexSource), 'Green Settings main-menu dugme nije vezano za 384 px canonical menu varijantu.');
assert(/<img class="settings-header-icon settings-header-icon-green" data-theme-src="assets\/green-soft-clay\/canonical\/settings-room-identity\/settings-room-v1\.png\?v=1"/.test(indexSource), 'Green Settings zaglavlje nije vezano za 512 px canonical room varijantu.');
assert((rulesSource.match(/rulesThemeGlyphIconHtml\('🖥️', 'assets\/easter-soft-clay\/settings-pro-v3\.png\?v=1'\)/g) || []).length === 2, 'Green Pravila moraju imati dve Settings reference kroz oba jezika.');
for (const file of ['profile-v1.png', 'sound-v1.png', 'music-v1.png', 'vibration-v1.png', 'display-theme-v1.png', 'language-v1.png', 'terms-v1.png', 'privacy-v1.png']) {
    assert(indexSource.includes(`assets/green-soft-clay/canonical/settings-controls/${file}`) && gameSource.includes(`assets/green-soft-clay/canonical/settings-controls/${file}`), `Green Settings pojedinačna canonical ikona nije očuvana: ${file}`);
}
assert(gameSource.includes('canonical\\/settings-room-identity\\/settings-room-menu') && gameSource.includes("path === 'canonical/settings-room-identity/settings-room-v1.png'"), 'Green Settings Room Identity startup fallback ili precizan room matcher nije povezan.');
assert(/#main-menu \.icon-menu-grid \.green-soft-clay-icon\s*\{[^}]*width:\s*52px;[^}]*height:\s*52px;[^}]*object-fit:\s*contain;/s.test(themeCssSource) && /@media \(max-width: 599px\) and \(orientation: portrait\)\s*\{[^}]*#main-menu \.icon-menu-grid \.green-soft-clay-icon\s*\{[^}]*width:\s*46px;[^}]*height:\s*46px;/s.test(themeCssSource), 'Green Settings menu 52/46 px prikaz nije očuvan.');
assert(themeCssSource.includes('.btn-square:nth-child(4) .green-soft-clay-icon { animation-delay: 1.74s; }') && /#settings-screen \.settings-header-icon-green\s*\{[^}]*width:\s*32px;[^}]*height:\s*32px;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Settings main-menu motion ili zaglavlje nisu očuvani.');
assert(gameSource.includes("const isGreenIconOnly = introTheme === 'dark' && ['leaderboard', 'statistics', 'settings'") && gameSource.includes('scale: 1,') && themeCssSource.includes('animation: greenRoomIconPulse 1.8s ease-in-out infinite;') && gameSource.includes('}, 3650);') && gameSource.includes('}, 4600);'), 'Green Settings intro nije očuvan.');
assert(/#rules-overlay-ui \.rules-theme-icon-green\s*\{[^}]*width:\s*1\.42em;[^}]*height:\s*1\.42em;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Settings glyph u Pravilima nema zaključani inline prikaz.');
assert(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.easter-room-intro\.theme-dark\.easter-room-intro--icon-only \.easter-room-intro-mark\s*\{[^}]*animation:\s*none !important;/s.test(themeCssSource), 'Green Settings intro nema reduced-motion fallback.');
assert(greenSettingsRoomIdentityManifest.variants[0].usedBy.includes('Green theme loading gate Settings icon') && greenSettingsRoomIdentityManifest.variants[0].displaySizes.some(size => JSON.stringify(size) === '[45,45]') && /\.theme-loading-gate__icons img\s*\{[^}]*width:\s*45px;[^}]*height:\s*45px;[^}]*object-fit:\s*contain;[^}]*animation:\s*themeLoadingIconFloat 2\.6s/s.test(styleCssSource), 'Green Settings loading gate uloga, veličina ili motion nisu očuvani.');
const greenSettingsControlsStep1 = [
    ['profile', 40077, '4d9dbbce33cecc87901eabdb67719b9f8253526a8f5df7340fb9dfda50b901c4', 3],
    ['sound', 41850, '0b5a470fb79fc8e8805a4a627a88d4639aafc68ee631ff1d9f9ab0c8561a7ce4', 2],
    ['music', 31850, '8c81adfd83a6389ef5c5f55ab098e36610e1a11427731bbaad1edfb9468bd88f', 2],
    ['vibration', 42238, '893e80c00e4cf4432bd7fcd9cba2deeeee96807faf7ce95c7421c28ee6b871c0', 2],
    ['display-theme', 57344, '9c9332adbc012cbd3211bf4c909437d09cc1a10ee960d683e00fdea81ea5669a', 2],
    ['language', 47659, 'ea983bc0e7b24162e7682897fdd6cbe4da45a5383664297eb76a29fb70f0b742', 2],
    ['terms', 50701, '07cebe403288e99f12c63e1f3afa2fb5de884cc6387514f82e28e7de71c2ebc5', 2],
    ['privacy', 46345, '4118758bdf0cc8798654c48f4d15a05e28124426d61f3d4f404d629dada3a48b', 3]
];
assert(greenAssetRegistry.families?.settingsControls?.status === 'locked' && greenThemeManifest.version === 63, 'Green Settings Controls završni registry lock ili cache verzija odstupa.');
assert(greenSettingsControlsStep1.reduce((sum, [, bytes]) => sum + bytes, 0) === 358064, 'Green Settings Controls zbir canonical isporuka odstupa.');
for (const [id, bytes, digest, expectedReferences] of greenSettingsControlsStep1) {
    const relative = `assets/green-soft-clay/canonical/settings-controls/${id}-v1.png`;
    const legacy = `assets/green-soft-clay/settings/${id}-v1.png`;
    const runtime = path.join(www, relative);
    const info = readPngInfo(runtime);
    assert(info.width === 256 && info.height === 256 && info.colorType === 6 && fs.statSync(runtime).size === bytes && sha256File(runtime) === digest && !fs.existsSync(path.join(www, legacy)), `Green Settings Controls canonical PNG ili povučena stara kopija odstupa: ${id}`);
    assert(indexSource.includes(`${relative}?v=1`) && gameSource.includes(`${relative}?v=1`), `Green Settings Controls ekran ili sobni paket ne sadrži canonical ${id}.`);
    const references = [indexSource, gameSource, rulesSource].reduce((sum, source) => sum + source.split(relative).length - 1, 0);
    const oldReferences = [indexSource, gameSource, rulesSource].reduce((sum, source) => sum + source.split(legacy).length - 1, 0);
    assert(references === expectedReferences && oldReferences === 0, `Green Settings Controls produkcione reference odstupaju: ${id} (${references} canonical, ${oldReferences} old).`);
    for (const otherTheme of ['easter-soft-clay', 'desert-soft-clay', 'severna-soft-clay']) {
        assert(indexSource.includes(`assets/${otherTheme}/settings/${id}-v2.png`), `Green Settings Controls integracija je narušila ${otherTheme} Settings ikonu: ${id}.`);
    }
}
assert(rulesSource.includes("'assets/easter-soft-clay/settings/profile-v2.png?v=opt2': 'assets/green-soft-clay/canonical/settings-controls/profile-v1.png?v=1'") && rulesSource.includes("'assets/easter-soft-clay/settings/privacy-v2.png?v=opt2': 'assets/green-soft-clay/canonical/settings-controls/privacy-v1.png?v=1'"), 'Green Settings profile i privacy canonical putanje moraju ostati dostupne u Pravilima.');
const greenRulesResolverStart = rulesSource.indexOf('function rulesGreenAssetSrc(');
assert(indexSource.includes('<script src="pravilaigre.js?v=1.22"></script>'), 'Pravila JS cache-buster mora učitati popravljeni Green inline resolver.');
const greenRulesResolverEnd = rulesSource.indexOf('\nfunction rulesThemeAssetIconHtml(', greenRulesResolverStart);
assert(greenRulesResolverStart >= 0 && greenRulesResolverEnd > greenRulesResolverStart, 'Green Rules resolver nije pronađen.');
const resolveGreenRulesAsset = vm.runInNewContext(`${rulesSource.slice(greenRulesResolverStart, greenRulesResolverEnd)}\nrulesGreenAssetSrc`, {});
for (const [easter, expected] of [
    ['settings/profile-v2.png?v=opt2', 'canonical/settings-controls/profile-v1.png?v=1'],
    ['settings/privacy-v2.png?v=opt2', 'canonical/settings-controls/privacy-v1.png?v=1'],
    ['canonical/ducat/ducat-inline-v1.png?v=1', 'canonical/ducat/ducat-inline-v1.png?v=1'],
    ['rules/pages/rules-scoring.png', 'canonical/rules-page-illustrations/rules-scoring-v1.png?v=1']
]) {
    assert(resolveGreenRulesAsset(`assets/easter-soft-clay/${easter}`) === `assets/green-soft-clay/${expected}`, `Green Rules query/asset mapiranje ne vraća odgovarajući motiv: ${easter}`);
}
const rulesDataSource = rulesSource.slice(rulesSource.indexOf('const RulesData ='));
const rulesEasterAssets = [...new Set([...rulesDataSource.matchAll(/assets\/easter-soft-clay\/[^'"\s)]+/g)].map(match => match[0]))];
assert(rulesEasterAssets.length >= 40, 'Green Rules audit ne pokriva svih šest strana na oba jezika.');
for (const easterAsset of rulesEasterAssets) {
    const greenAsset = resolveGreenRulesAsset(easterAsset);
    assert(greenAsset?.startsWith('assets/green-soft-clay/') && !greenAsset.includes('.svg'), `Pravila nemaju Green PNG zamenu za ${easterAsset}`);
    assert(fs.existsSync(path.join(www, greenAsset.split('?')[0])), `Pravila upućuju na nepostojeći Green asset: ${greenAsset}`);
}
assert(!/<(?:h3|strong)>[🎯📢🎲⏱⏳]/u.test(rulesDataSource)
    && themeCssSource.includes('#rules-overlay-ui .rules-text-glyph-default,'), 'Pravila i dalje prikazuju stare tekstualne emoji simbole u Green temi.');
for (const [name, source, introId] of [
    ['Daily', dailyChallengeSource, 'daily'],
    ['Tournament', tournamentSource, 'tournament'],
    ['Quarterly League', quarterlyLeagueSource, 'league']
]) {
    const applyAt = source.indexOf('this.applyIntroTheme(overlay);');
    const showAt = source.indexOf("overlay.classList.remove('hidden');", applyAt);
    assert(applyAt >= 0 && showAt > applyAt, `${name} intro mora primeniti Green temu pre prikaza.`);
    assert(themeCssSource.includes(`#${introId}-intro.theme-dark .${introId}-intro-mark,`), `${name} intro ne skriva stari SVG u Green temi.`);
}
for (const [cssClass, size] of [['settings-section-soft-clay-icon-green', 20], ['settings-row-soft-clay-icon-green', 25], ['settings-legal-soft-clay-icon-green', 18]]) {
    assert(new RegExp(`#settings-screen \\.${cssClass}\\s*\\{[^}]*width:\\s*${size}px;[^}]*height:\\s*${size}px;[^}]*object-fit:\\s*contain;`, 's').test(themeCssSource), `Green Settings Controls ${cssClass} prikaz odstupa.`);
}
assert(gameSource.includes("settings: path => path.startsWith('settings/') || path.startsWith('settings-') || path.startsWith('canonical/settings-controls/')") && greenSettingsControlsStep1.every(([id]) => gameSource.includes(`canonical/settings-controls/${id}-v1.png?v=1`)), 'Green Settings Controls Korak 3 sobni matcher ili runtime veze nisu kompletne.');
const greenSettingsControlsAuditInfo = readPngInfo(path.join(root, 'docs', 'green-asset-standardization-settings-controls-audit.png'));
assert(greenSettingsControlsAuditInfo.width === 1480 && greenSettingsControlsAuditInfo.height === 974 && greenSettingsControlsAuditInfo.colorType === 6, 'Green Settings Controls Korak 1 audit tabla nedostaje ili ima pogrešne dimenzije.');
const greenSettingsControlsAuditScriptSource = fs.readFileSync(path.join(root, 'scripts', 'make-green-settings-controls-audit-sheet.py'), 'utf8');
assert(greenSettingsControlsAuditScriptSource.includes('ImageChops.difference(source.resize((256, 256), Image.Resampling.LANCZOS), runtime)') && greenSettingsControlsStep1.every(([id]) => greenSettingsControlsAuditScriptSource.includes(`("${id}",`)), 'Green Settings Controls audit skripta ne pokriva osam mastera i precizno umanjenje.');
assert(greenSettingsControlsAuditScriptSource.includes('www/assets/green-soft-clay/canonical/settings-controls') && !greenSettingsControlsAuditScriptSource.includes('RUNTIME = ROOT / "www/assets/green-soft-clay/settings"'), 'Green Settings Controls audit tabla mora se reprodukovati iz canonical runtimea.');
assert(greenSettingsControlsAuditScriptSource.includes('Eight locked glyphs:') && greenSettingsControlsAuditScriptSource.includes('CANON 256'), 'Green Settings Controls završna vizuelna tabla mora prikazivati zaključane canonical isporuke.');
assert(greenSettingsControlsManifest.status === 'locked' && greenSettingsControlsManifest.catalog.length === 8 && greenSettingsControlsManifest.identity?.material === 'matte 3D Soft Clay Neumorphism', 'Green Settings Controls završni source manifest ili DNK odstupa.');
assert(JSON.stringify(greenSettingsControlsManifest.catalog.map(asset => asset.id)) === JSON.stringify(greenSettingsControlsStep1.map(([id]) => id)), 'Green Settings Controls source manifest nema svih osam pravilno mapiranih kontrola.');
assert(JSON.stringify(greenSettingsControlsManifest.protectedFamilies) === JSON.stringify(['settingsRoomIdentity', 'rulesRoomIdentity']) && greenSettingsControlsManifest.motionContract?.controlGlyphs === 'static', 'Green Settings Controls granice room identiteta ili statički motion ugovor odstupaju.');
assert(greenSettingsControlsManifest.integration?.centralRegistry === 'standardized in standardization step 3' && greenSettingsControlsManifest.integration?.activeRuntime === 'retired in standardization step 3' && greenSettingsControlsManifest.integration?.cacheVersion === 63 && greenSettingsControlsManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Settings Controls završni audit, stare kopije ili cache odstupaju.');
const greenSettingsControlsRegistry = greenAssetRegistry.families.settingsControls;
assert(JSON.stringify(greenSettingsControlsRegistry.identity) === JSON.stringify(greenSettingsControlsManifest.identity) && greenSettingsControlsRegistry.canonicalRuntime.length === 8 && greenSettingsControlsRegistry.compositeRuntime.length === 0, 'Green Settings Controls registar ne odražava svih osam canonical identiteta.');
assert(greenSettingsControlsRegistry.forbiddenRuntimePaths.length === 8 && Object.keys(greenSettingsControlsRegistry.retiredMasterReplacements).length === 8 && greenSettingsControlsRegistry.codeBindings.length === 5, 'Green Settings Controls završni registar mora imati osam zabranjenih starih putanja, osam zamena i pet UI bindinga.');
for (const asset of greenSettingsControlsManifest.catalog) {
    const source = path.join(root, asset.approvedSource);
    const master = path.join(path.dirname(greenSettingsControlsManifestPath), asset.master);
    const active = path.join(root, asset.activeRuntime);
    const canonical = path.join(root, asset.runtime);
    for (const file of [source, master]) {
        const info = readPngInfo(file);
        assert(info.width === 1254 && info.height === 1254 && info.colorType === 6 && fs.statSync(file).size === asset.masterBytes && sha256File(file) === asset.masterSha256, `Green Settings Controls master odstupa: ${asset.id}`);
    }
    const info = readPngInfo(canonical);
    assert(info.width === 256 && info.height === 256 && info.colorType === 6 && fs.statSync(canonical).size === asset.runtimeBytes && sha256File(canonical) === asset.runtimeSha256 && !fs.existsSync(active), `Green Settings Controls canonical isporuka ili povlačenje stare kopije odstupa: ${asset.id}`);
    assert(asset.runtimeBytes === greenSettingsControlsStep1.find(([id]) => id === asset.id)?.[1] && asset.runtimeSha256 === greenSettingsControlsStep1.find(([id]) => id === asset.id)?.[2], `Green Settings Controls Korak 1 i Korak 2 otisci nisu isti: ${asset.id}`);
    const canonicalRelative = asset.runtime.slice('www/'.length);
    const oldRelative = asset.activeRuntime.slice('www/'.length);
    const canonicalReferences = [indexSource, gameSource, rulesSource].reduce((sum, sourceText) => sum + sourceText.split(canonicalRelative).length - 1, 0);
    const oldReferences = [indexSource, gameSource, rulesSource].reduce((sum, sourceText) => sum + sourceText.split(oldRelative).length - 1, 0);
    assert(canonicalReferences === asset.legacyReferencesBeforeIntegration && oldReferences === 0, `Green Settings Controls ${asset.id} migracija referenci nije potpuna.`);
    assert(greenSettingsControlsRegistry.canonicalRuntime.some(entry => entry.role === asset.id && entry.path === canonicalRelative && entry.bytes === asset.runtimeBytes && entry.sha256 === asset.runtimeSha256), `Green Settings Controls ${asset.id} registry otisak odstupa.`);
    assert(greenSettingsControlsRegistry.forbiddenRuntimePaths.includes(oldRelative) && greenSettingsControlsRegistry.retiredMasterReplacements[oldRelative.slice('assets/green-soft-clay/'.length)] === canonicalRelative.slice('assets/green-soft-clay/'.length), `Green Settings Controls ${asset.id} istorijsko mapiranje nije kompletno.`);
}
const greenSettingsControlsBuildScriptSource = fs.readFileSync(path.join(root, 'scripts', 'build-green-canonical-settings-controls-pack.py'), 'utf8');
assert(greenSettingsControlsBuildScriptSource.includes('image.resize((256, 256), Image.Resampling.LANCZOS).save(output, format="PNG", optimize=True)') && greenSettingsControlsBuildScriptSource.includes('refusing overwrite'), 'Green Settings Controls builder ne reprodukuje odobrene bajtove ili ne štiti postojeće datoteke.');
assert(greenRulesRoomIdentityManifest.status === 'locked' && greenRulesRoomIdentityRegistry?.status === 'locked', 'Green Rules Room Identity mora biti zaključen u izvornom i centralnom registru.');
assert(greenThemeManifest.version === 63 && greenRulesRoomIdentityManifest.integration?.cacheVersion === 52, 'Green Rules Room Identity mora zadržati svoju istorijsku cache verziju 52 dok je tema na verziji 63.');
assert(JSON.stringify(greenRulesRoomIdentityRegistry.identity) === JSON.stringify(greenRulesRoomIdentityManifest.identity), 'Green Rules Room Identity DNK u centralnom registru odstupa od izvornog manifesta.');
assert(greenRulesRoomIdentityManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenRulesRoomIdentityManifest.identity?.mapping === 'one immutable Rules room identity with room and menu delivery variants', 'Green Rules Room Identity DNK ili pravilo jednog identiteta je promenjeno.');
assert(greenRulesRoomIdentityManifest.identity?.presentation === 'one centered free-standing open-book glyph on a transparent background without text, frame or backing tile' && greenRulesRoomIdentityManifest.identity?.palette === 'warm-ivory open book, forest-green spine and inset page lines with one terracotta bookmark', 'Green Rules Room Identity vizuelna silueta ili paleta je promenjena.');
const rulesRoomMaster = path.join(path.dirname(greenRulesRoomIdentityManifestPath), greenRulesRoomIdentityManifest.master.path);
const rulesRoomApprovedSource = path.join(root, greenRulesRoomIdentityManifest.master.approvedSource);
assert(fs.existsSync(rulesRoomMaster) && fs.existsSync(rulesRoomApprovedSource), 'Nedostaje Green Rules Room Identity master ili odobreni izvor.');
const rulesRoomMasterInfo = readPngInfo(rulesRoomMaster);
assert(rulesRoomMasterInfo.width === 1254 && rulesRoomMasterInfo.height === 1254 && [4, 6].includes(rulesRoomMasterInfo.colorType), 'Green Rules Room Identity master mora biti 1254 × 1254 sa direktnim alpha kanalom.');
assert(fs.statSync(rulesRoomMaster).size === greenRulesRoomIdentityManifest.master.bytes && sha256File(rulesRoomMaster) === greenRulesRoomIdentityManifest.master.sha256 && sha256File(rulesRoomApprovedSource) === greenRulesRoomIdentityManifest.master.approvedSourceSha256 && greenRulesRoomIdentityManifest.master.sha256 === greenRulesRoomIdentityManifest.master.approvedSourceSha256, 'Green Rules Room Identity master nije bajt-po-bajt odobreni izvor.');
assert(JSON.stringify(greenRulesRoomIdentityManifest.variants.map(asset => asset.id)) === JSON.stringify(['room', 'menu']), 'Green Rules Room Identity mora imati tačno room i menu delivery varijantu.');
const rulesRoomConsumerSources = [indexSource, gameSource, rulesSource];
for (const variant of greenRulesRoomIdentityManifest.variants) {
    const runtime = path.join(root, variant.runtime);
    const activeRuntime = path.join(root, variant.activeRuntime);
    assert(fs.existsSync(runtime) && !fs.existsSync(activeRuntime), `Green Rules Room Identity canonical nedostaje ili legacy runtime nije uklonjen: ${variant.id}`);
    const runtimeInfo = readPngInfo(runtime);
    assert(JSON.stringify([runtimeInfo.width, runtimeInfo.height]) === JSON.stringify(variant.runtimeSize) && [4, 6].includes(runtimeInfo.colorType), `Green Rules Room Identity dimenzija ili alpha kanal odstupa: ${variant.id}`);
    assert(fs.statSync(runtime).size === variant.runtimeBytes && sha256File(runtime) === variant.runtimeSha256 && variant.runtimeSha256 === variant.activeRuntimeSha256, `Green Rules Room Identity canonical otisak odstupa od odobrenog runtimea: ${variant.id}`);
    const canonicalPath = variant.runtime.replace(/^www\//, '');
    const activePath = variant.activeRuntime.replace(/^www\//, '');
    const canonicalReferences = rulesRoomConsumerSources.reduce((count, source) => count + source.split(canonicalPath).length - 1, 0);
    const activeReferences = rulesRoomConsumerSources.reduce((count, source) => count + source.split(activePath).length - 1, 0);
    assert(canonicalReferences === variant.expectedCanonicalReferences && activeReferences === 0, `Green Rules Room Identity UI veze nisu prebačene: ${variant.id} (${canonicalReferences} canonical, ${activeReferences} legacy).`);
    const registered = greenRulesRoomIdentityRegistry.canonicalRuntime.find(asset => asset.role === variant.id);
    assert(registered?.path === canonicalPath && registered?.size === variant.runtimeSize[0] && registered?.sha256 === variant.runtimeSha256, `Green Rules Room Identity registry odstupa: ${variant.id}`);
}
const rejectedRulesRoomCandidate = greenRulesRoomIdentityManifest.rejectedCandidates?.[0];
assert(greenRulesRoomIdentityManifest.rejectedCandidates?.length === 1 && rejectedRulesRoomCandidate?.id === 'rules-pro-v1' && rejectedRulesRoomCandidate?.status === 'rejected-orphan' && rejectedRulesRoomCandidate?.activeReferences === 0, 'Green Rules Room Identity mora evidentirati odbačeni framed orphan.');
const rejectedRulesRoomSource = path.join(root, rejectedRulesRoomCandidate.source);
const rejectedRulesRoomRuntime = path.join(root, rejectedRulesRoomCandidate.runtime);
assert(fs.existsSync(rejectedRulesRoomSource) && !fs.existsSync(rejectedRulesRoomRuntime) && sha256File(rejectedRulesRoomSource) === rejectedRulesRoomCandidate.sourceSha256, 'Green Rules Room Identity odbačeni runtime mora biti uklonjen, a izvor sačuvan.');
assert(rulesRoomConsumerSources.every(source => !source.includes('assets/green-soft-clay/rules-pro-v1.png')), 'Odbačeni Green Rules Pro kandidat ima aktivnog UI potrošača.');
assert(Object.values(greenRulesRoomIdentityManifest.integration || {}).filter(value => value === 'connected').length === 7 && greenRulesRoomIdentityManifest.integration?.legacyRuntime === 'retired in standardization step 3' && greenRulesRoomIdentityManifest.integration?.centralRegistry === 'standardized in standardization step 3' && greenRulesRoomIdentityManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Rules Room Identity integracija i završni audit nisu dovršeni.');
assert(greenRulesRoomIdentityRegistry.canonicalRuntime.length === 2 && JSON.stringify(greenRulesRoomIdentityRegistry.semanticExclusions) === JSON.stringify(greenRulesRoomIdentityManifest.semanticExclusions), 'Green Rules Room Identity registry ili semantičke granice odstupaju.');
assert(JSON.stringify(greenRulesRoomIdentityRegistry.forbiddenRuntimePaths) === JSON.stringify(['assets/green-soft-clay/rules-free-v2.png', 'assets/green-soft-clay/runtime/menu/rules-free-v2.png', 'assets/green-soft-clay/rules-pro-v1.png']), 'Green Rules Room Identity zabranjene legacy putanje nisu potpune.');
for (const exclusion of ['six Rules page illustrations and their SR/EN title mappings', 'page-level score, statistics, competitions and communication glyphs', 'Economy/Treasury page composition with canonical ducats and Undo token', 'account, privacy and server page illustration', 'rules text, navigation, dot indicators and swipe behavior', 'other room identities, medals, ranks and gameplay dice']) {
    assert(greenRulesRoomIdentityManifest.semanticExclusions.includes(exclusion), `Green Rules Room Identity ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(indexSource.includes('assets/green-soft-clay/canonical/rules-room-identity/rules-room-menu-v1.png?v=1') && gameSource.includes("greenIcon: 'assets/green-soft-clay/canonical/rules-room-identity/rules-room-v1.png?v=1'") && rulesSource.includes("'assets/easter-soft-clay/rules-pro-v2.png': 'assets/green-soft-clay/canonical/rules-room-identity/rules-room-v1.png?v=1'") && rulesSource.includes('class="rules-header-icon rules-header-icon-green" data-theme-src="assets/green-soft-clay/canonical/rules-room-identity/rules-room-v1.png?v=1"'), 'Green Rules Room Identity aktivne UI veze nisu očuvane.');
for (const file of ['rules-scoring-v1.png', 'stats-leaderboards-v1.png', 'multiplayer-competitions-v1.png', 'account-server-v1.png']) {
    assert(gameSource.includes(`assets/green-soft-clay/canonical/rules-page-illustrations/${file}`) && rulesSource.includes(`assets/green-soft-clay/canonical/rules-page-illustrations/${file}`), `Green Rules canonical ilustracija stranice nije povezana: ${file}`);
}
for (const file of ['communication-v1.png', 'economy-treasury-v3.png']) {
    assert(gameSource.includes(`assets/green-soft-clay/rules/pages/${file}`) && rulesSource.includes(`assets/green-soft-clay/rules/pages/${file}`), `Green Rules zaštićena ilustracija stranice nije očuvana: ${file}`);
}
for (const page of [
    { source: 'rules-scoring', runtime: 'rules-scoring-v1', sr: 'Pravila i bodovanje', en: 'Rules & scoring' },
    { source: 'stats-leaderboards', runtime: 'stats-leaderboards-v1', sr: 'Statistika i liste', en: 'Stats & leaderboards' },
    { source: 'multiplayer-competitions', runtime: 'multiplayer-competitions-v1', sr: 'Multiplayer i takmičenja', en: 'Multiplayer & competitions' },
    { source: 'communication', runtime: 'communication-v1', sr: 'Komunikacija', en: 'Communication' },
    { source: 'economy-treasury', runtime: 'economy-treasury-v3', sr: 'Dukati, tokeni i Riznica', en: 'Ducats, tokens & Treasury' },
    { source: 'account-server', runtime: 'account-server-v1', sr: 'Nalog, privatnost i server', en: 'Account, privacy & server' }
]) {
    const protectedScene = ['communication', 'economy-treasury'].includes(page.source);
    const greenPath = protectedScene ? `assets/green-soft-clay/rules/pages/${page.runtime}.png?v=1` : `assets/green-soft-clay/canonical/rules-page-illustrations/${page.runtime}.png?v=1`;
    assert(rulesSource.includes(`'assets/easter-soft-clay/rules/pages/${page.source}.png': '${greenPath}'`), `Green Rules stranica nema odgovarajuću Green ilustraciju: ${page.source}`);
    for (const title of [page.sr, page.en]) {
        assert(rulesSource.includes(`assets/easter-soft-clay/rules/pages/${page.source}.png?v=1')} ${title}`), `Green Rules ilustracija nije vezana za pravi SR/EN naslov: ${title}`);
    }
}
// Rules Page Illustrations step 4: lock four exact SR/EN page scenes while
// keeping two protected cross-family scenes and the room identity separate.
const greenRulesPageIllustrationsRegistry = greenAssetRegistry.families?.rulesPageIllustrations;
assert(greenRulesPageIllustrationsManifest.status === 'locked' && greenRulesPageIllustrationsRegistry?.status === 'locked', 'Green Rules Page Illustrations source manifest i registar moraju biti zaključani.');
assert(JSON.stringify(greenRulesPageIllustrationsRegistry.identity) === JSON.stringify(greenRulesPageIllustrationsManifest.identity) && greenRulesPageIllustrationsRegistry.sourceManifest === path.relative(root, greenRulesPageIllustrationsManifestPath).replaceAll('\\', '/'), 'Green Rules Page Illustrations identitet ili izvor registra odstupa.');
const greenRulesPageAudit = [
    { file: 'rules-scoring-v1.png', bytes: 188200, sha256: '58d0c32e0cd9c8a92e97a95b6ccb4468df19adde7901ef2052e42a45a3ea00ca' },
    { file: 'stats-leaderboards-v1.png', bytes: 174369, sha256: '41b88e864d1933b43ba9081c5ebba6d6844e23afc3fba71f5cac45ecb6969b7a' },
    { file: 'multiplayer-competitions-v1.png', bytes: 193124, sha256: 'efa52e4b24c8d78602efb812bba4cde8c36fdf4b345fb683337386cd44cbe50b' },
    { file: 'account-server-v1.png', bytes: 240872, sha256: 'a1092f5af79c8a73982147c78713de0e0fe7b92cfe0bdf7557babb9ba6cfab7a' }
];
assert(JSON.stringify(greenRulesPageIllustrationsManifest.catalog.map(asset => `${asset.id}-v1.png`)) === JSON.stringify(greenRulesPageAudit.map(asset => asset.file)), 'Green Rules Page Illustrations canonical katalog ili redosled odstupa.');
assert(greenRulesPageIllustrationsManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenRulesPageIllustrationsManifest.provenance?.approvedResolution?.join('x') === '512x512' && greenRulesPageIllustrationsManifest.provenance?.normalization === 'direct lossless copy of approved bytes, with no resampling, recompression or pixel edits', 'Green Rules Page Illustrations DNK ili odobrena 512px provenijencija odstupa.');
assert(greenRulesPageIllustrationsManifest.provenance?.higherResolutionGreenSource === 'not found in source-assets/green-soft-clay-hires' && greenRulesPageIllustrationsManifest.provenance?.masterPolicy === 'byte-for-byte snapshot of each approved active 512x512 RGBA PNG; never upscale and label it a high-resolution original', 'Green Rules Page Illustrations izvorni 512px status ili zabrana lažnog high-res izvora odstupa.');
assert(JSON.stringify(greenRulesPageIllustrationsManifest.catalog.map(asset => asset.glyph)) === JSON.stringify(['open warm-ivory Yamb score sheet with green grid and terracotta checkmarks', 'rising ivory-to-forest-green bars with a terracotta crown and warm-ivory base', 'two warm-ivory players around a die and terracotta-star trophy with forest-green leaves', 'warm-ivory account figure, green shield with ivory keyhole, and three green server bars']), 'Green Rules Page Illustrations četiri vizuelne siluete odstupaju.');
assert(greenRulesPageIllustrationsManifest.catalog.every(asset => JSON.stringify(asset.displaySizes) === '[[38,38]]' && asset.usedBy.length === 3), 'Green Rules Page Illustrations SR/EN potrošači ili stvarni prikaz odstupaju.');
for (const asset of greenRulesPageAudit) {
    const file = path.join(www, 'assets', 'green-soft-clay', 'rules', 'pages', asset.file);
    assert(!fs.existsSync(file), `Green Rules stara runtime ilustracija nije povučena: ${asset.file}`);
    const catalogAsset = greenRulesPageIllustrationsManifest.catalog.find(item => `${item.id}-v1.png` === asset.file);
    const master = path.join(path.dirname(greenRulesPageIllustrationsManifestPath), catalogAsset.master);
    const canonical = path.join(root, catalogAsset.runtime);
    for (const [role, image] of [['master', master], ['canonical', canonical]]) {
        const imageInfo = readPngInfo(image);
        assert(imageInfo.width === 512 && imageInfo.height === 512 && imageInfo.colorType === 6 && fs.statSync(image).size === asset.bytes && sha256File(image) === asset.sha256, `Green Rules ${asset.file} ${role} nije bajt-po-bajt odobreni runtime.`);
    }
    assert(catalogAsset.approvedSource === path.relative(root, file).replaceAll('\\', '/') && catalogAsset.runtime === `www/assets/green-soft-clay/canonical/rules-page-illustrations/${asset.file}` && JSON.stringify(catalogAsset.size) === '[512,512]' && catalogAsset.bytes === asset.bytes && catalogAsset.sha256 === asset.sha256 && catalogAsset.legacyReferencesBeforeIntegration === 2 && catalogAsset.expectedCanonicalReferences === 2, `Green Rules ${asset.file} canonical ugovor odstupa.`);
    const activePath = catalogAsset.approvedSource.slice('www/'.length);
    const canonicalPath = catalogAsset.runtime.slice('www/'.length);
    assert(!gameSource.includes(activePath) && !rulesSource.includes(activePath) && gameSource.split(canonicalPath).length - 1 === 1 && rulesSource.split(canonicalPath).length - 1 === 1, `Green Rules ${asset.file} nema po jednu canonical vezu za SR/EN mapu i sobni paket ili ima staru referencu.`);
    const registryAsset = greenRulesPageIllustrationsRegistry.canonicalRuntime.find(item => item.role === catalogAsset.id);
    assert(registryAsset?.path === canonicalPath && registryAsset.size === 512 && registryAsset.bytes === asset.bytes && registryAsset.sha256 === asset.sha256 && greenRulesPageIllustrationsRegistry.forbiddenRuntimePaths.includes(activePath), `Green Rules ${asset.file} registry metapodaci ili zabrana stare putanje odstupaju.`);
    assert(greenRulesPageIllustrationsRegistry.retiredMasterReplacements[`rules/pages/${asset.file}`] === `canonical/rules-page-illustrations/${asset.file}`, `Green Rules ${asset.file} istorijsko mapiranje zamene odstupa.`);
}
assert(greenRulesPageIllustrationsRegistry.canonicalRuntime.length === 4 && greenRulesPageIllustrationsRegistry.compositeRuntime.length === 0 && JSON.stringify(greenRulesPageIllustrationsRegistry.semanticExclusions) === JSON.stringify(greenRulesPageIllustrationsManifest.semanticExclusions), 'Green Rules Page Illustrations registar ima neočekivane assete ili semantičke granice.');
assert(JSON.stringify(greenRulesPageIllustrationsRegistry.codeBindings) === JSON.stringify(['Green Rules SR and EN page 1 scoring illustration', 'Green Rules SR and EN page 2 statistics illustration', 'Green Rules SR and EN page 3 multiplayer illustration', 'Green Rules SR and EN page 6 account and server illustration', 'Green Rules room-on-demand package']), 'Green Rules Page Illustrations code-binding ugovor odstupa.');
assert(greenRulesPageIllustrationsManifest.motionContract?.pageTitle === 'greenRulesIconBreath 4.8s at 38x38px' && greenRulesPageIllustrationsManifest.motionContract?.reducedMotion === 'existing Rules page reduced-motion fallback remains unchanged', 'Green Rules Page Illustrations motion ugovor odstupa.');
assert(greenRulesPageIllustrationsManifest.protectedFamilies.every(family => greenAssetRegistry.families?.[family]?.status === 'locked'), 'Green Rules Page Illustrations ima nezaštićenu semantičku susednu porodicu.');
assert(greenRulesPageIllustrationsManifest.catalog.reduce((sum, asset) => sum + asset.bytes, 0) === 796565 && greenRulesPageIllustrationsManifest.protectedScenes.length === 2 && JSON.stringify(greenRulesPageIllustrationsManifest.protectedScenes.map(scene => scene.path)) === JSON.stringify(['www/assets/green-soft-clay/rules/pages/communication-v1.png', 'www/assets/green-soft-clay/rules/pages/economy-treasury-v3.png']), 'Green Rules Page Illustrations staging veličina ili granice dve zaštićene scene odstupaju.');
assert(greenRulesPageIllustrationsManifest.integration?.rulesUi === 'connected' && greenRulesPageIllustrationsManifest.integration?.roomOnDemand === 'connected' && greenRulesPageIllustrationsManifest.integration?.centralRegistry === 'standardized in standardization step 3' && greenRulesPageIllustrationsManifest.integration?.activeRuntime === 'retired in standardization step 3' && greenRulesPageIllustrationsManifest.integration?.cacheVersion === 62 && greenRulesPageIllustrationsManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Rules Page Illustrations završni audit status odstupa.');
for (const asset of [
    { file: 'communication-v1.png', bytes: 175405, sha256: '50ed1ec25dbf9c1de01059ad2d4c15cf5ec230b69c29c370a2ba7e0c901ae05d' },
    { file: 'economy-treasury-v3.png', bytes: 303396, sha256: '495fe82e49141fb40dcb195c6f1f2c7d0000511d9ea38a6753e61d3db85eb330' }
]) {
    const file = path.join(www, 'assets', 'green-soft-clay', 'rules', 'pages', asset.file);
    const info = readPngInfo(file);
    assert(info.width === 512 && info.height === 512 && info.colorType === 6 && fs.statSync(file).size === asset.bytes && sha256File(file) === asset.sha256, `Zaštićena Green Rules ilustracija je promenjena: ${asset.file}`);
}
const greenRulesPageAuditInfo = readPngInfo(path.join(root, 'docs', 'green-asset-standardization-rules-page-illustrations-audit.png'));
assert(greenRulesPageAuditInfo.width === 1480 && greenRulesPageAuditInfo.height === 974 && greenRulesPageAuditInfo.colorType === 6, 'Green Rules Page Illustrations audit tabla nedostaje ili je nepotpuna.');
const greenRulesPageAuditSource = fs.readFileSync(path.join(root, 'scripts', 'make-green-rules-page-illustrations-audit-sheet.py'), 'utf8');
for (const asset of greenRulesPageAudit) {
    assert(greenRulesPageAuditSource.includes(`canonical/rules-page-illustrations/${asset.file}`) && !greenRulesPageAuditSource.includes(`"rules/pages/${asset.file}"`), `Green Rules ${asset.file} audit mora koristiti canonical putanju.`);
}
assert(themeCssSource.includes('.btn-square:nth-child(5) .green-soft-clay-icon { animation-delay: 1.92s; }') && /#rules-overlay-ui \.rules-header-icon-green\s*\{[^}]*width:\s*34px;[^}]*height:\s*34px;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Rules main-menu motion ili zaglavlje nisu očuvani.');
assert(gameSource.includes("const isGreenIconOnly = introTheme === 'dark' && ['leaderboard', 'statistics', 'settings', 'rules'") && gameSource.includes('scale: 1.16,') && themeCssSource.includes('animation: greenRoomIconPulse 1.8s ease-in-out infinite;') && gameSource.includes('}, 3650);') && gameSource.includes('}, 4600);'), 'Green Rules intro nije očuvan.');
assert(/#rules-overlay-ui \.rules-page-icon-green\s*\{[^}]*width:\s*38px;[^}]*height:\s*38px;[^}]*animation:\s*greenRulesIconBreath 4\.8s/s.test(themeCssSource) && /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*#rules-overlay-ui \.rules-page-icon-green\s*\{[^}]*animation:\s*none !important;/s.test(themeCssSource), 'Green Rules stranice nemaju očuvan motion i reduced-motion fallback.');
assert(greenRulesRoomIdentityManifest.variants[0].usedBy.includes('Green theme loading gate Rules icon') && greenRulesRoomIdentityManifest.variants[0].displaySizes.some(size => JSON.stringify(size) === '[45,45]') && /\.theme-loading-gate__icons img\s*\{[^}]*width:\s*45px;[^}]*height:\s*45px;[^}]*object-fit:\s*contain;[^}]*animation:\s*themeLoadingIconFloat 2\.6s/s.test(styleCssSource), 'Green Rules loading gate uloga, veličina ili motion nisu očuvani.');
const rulesRoomAuditSheet = path.join(root, 'docs', 'green-asset-standardization-rules-room-identity-audit.png');
const rulesRoomAuditInfo = readPngInfo(rulesRoomAuditSheet);
assert(rulesRoomAuditInfo.width === 1480 && rulesRoomAuditInfo.height === 1398, 'Green Rules Room Identity audit tabla nedostaje ili je nepotpuna.');
assert(greenGlobalChatRoomIdentityManifest.status === 'locked' && greenGlobalChatRoomIdentityRegistry?.status === 'locked', 'Green Global Chat Room Identity mora biti zaključen u oba registra.');
assert(greenThemeManifest.version === 63 && greenGlobalChatRoomIdentityManifest.integration?.cacheVersion === 53, 'Green Global Chat mora zadržati istorijsku cache verziju 53 dok je tema na verziji 63.');
assert(JSON.stringify(greenGlobalChatRoomIdentityRegistry.identity) === JSON.stringify(greenGlobalChatRoomIdentityManifest.identity), 'Green Global Chat DNK odstupa između dva registra.');
assert(greenGlobalChatRoomIdentityManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenGlobalChatRoomIdentityManifest.identity?.mapping === 'one immutable Global Chat room identity with room and menu delivery variants', 'Green Global Chat Room Identity DNK ili pravilo jednog identiteta je promenjeno.');
assert(greenGlobalChatRoomIdentityManifest.identity?.presentation === 'one centered free-standing conversation glyph on a transparent background without text, square frame or backing tile' && greenGlobalChatRoomIdentityManifest.identity?.accentMeaning === 'static terracotta design accent, not live online or unread status', 'Green Global Chat Room Identity silueta ili značenje statičkog akcenta je promenjeno.');
const globalChatRoomMaster = path.join(path.dirname(greenGlobalChatRoomIdentityManifestPath), greenGlobalChatRoomIdentityManifest.master.path);
const globalChatApprovedSource = path.join(root, greenGlobalChatRoomIdentityManifest.master.approvedSource);
assert(fs.existsSync(globalChatRoomMaster) && fs.existsSync(globalChatApprovedSource), 'Nedostaje Green Global Chat master ili odobreni izvor.');
const globalChatMasterInfo = readPngInfo(globalChatRoomMaster);
assert(globalChatMasterInfo.width === 1254 && globalChatMasterInfo.height === 1254 && [4, 6].includes(globalChatMasterInfo.colorType), 'Green Global Chat master mora biti 1254 × 1254 sa direktnim alpha kanalom.');
assert(fs.statSync(globalChatRoomMaster).size === greenGlobalChatRoomIdentityManifest.master.bytes && sha256File(globalChatRoomMaster) === greenGlobalChatRoomIdentityManifest.master.sha256 && sha256File(globalChatApprovedSource) === greenGlobalChatRoomIdentityManifest.master.approvedSourceSha256 && greenGlobalChatRoomIdentityManifest.master.sha256 === greenGlobalChatRoomIdentityManifest.master.approvedSourceSha256, 'Green Global Chat master nije bajt-po-bajt odobreni izvor.');
assert(JSON.stringify(greenGlobalChatRoomIdentityManifest.variants.map(asset => asset.id)) === JSON.stringify(['room', 'menu']), 'Green Global Chat mora imati tačno room i menu delivery varijantu.');
const globalChatConsumerSources = [indexSource, gameSource, rulesSource, globalChatSource];
for (const variant of greenGlobalChatRoomIdentityManifest.variants) {
    const runtime = path.join(root, variant.runtime);
    const activeRuntime = path.join(root, variant.activeRuntime);
    assert(fs.existsSync(runtime) && !fs.existsSync(activeRuntime), `Green Global Chat canonical nedostaje ili legacy runtime nije uklonjen: ${variant.id}`);
    const info = readPngInfo(runtime);
    assert(JSON.stringify([info.width, info.height]) === JSON.stringify(variant.runtimeSize) && [4, 6].includes(info.colorType), `Green Global Chat dimenzija ili alpha kanal odstupa: ${variant.id}`);
    assert(fs.statSync(runtime).size === variant.runtimeBytes && sha256File(runtime) === variant.runtimeSha256 && variant.runtimeSha256 === variant.activeRuntimeSha256, `Green Global Chat canonical otisak odstupa od odobrenog runtimea: ${variant.id}`);
    const canonicalPath = variant.runtime.replace(/^www\//, '');
    const activePath = variant.activeRuntime.replace(/^www\//, '');
    const canonicalReferences = globalChatConsumerSources.reduce((count, source) => count + source.split(canonicalPath).length - 1, 0);
    const activeReferences = globalChatConsumerSources.reduce((count, source) => count + source.split(activePath).length - 1, 0);
    assert(canonicalReferences === variant.expectedCanonicalReferences && activeReferences === 0, `Green Global Chat UI veze nisu prebačene: ${variant.id} (${canonicalReferences} canonical, ${activeReferences} legacy).`);
    const registered = greenGlobalChatRoomIdentityRegistry.canonicalRuntime.find(asset => asset.role === variant.id);
    assert(registered?.path === canonicalPath && registered?.size === variant.runtimeSize[0] && registered?.sha256 === variant.runtimeSha256, `Green Global Chat registry odstupa: ${variant.id}`);
}
const rejectedGlobalChatCandidate = greenGlobalChatRoomIdentityManifest.rejectedCandidates?.[0];
assert(greenGlobalChatRoomIdentityManifest.rejectedCandidates?.length === 1 && rejectedGlobalChatCandidate?.id === 'global-chat-pro-v1' && rejectedGlobalChatCandidate?.status === 'rejected-orphan' && rejectedGlobalChatCandidate?.activeReferences === 0, 'Green Global Chat mora evidentirati odbačeni framed orphan.');
assert(fs.existsSync(path.join(root, rejectedGlobalChatCandidate.source)) && !fs.existsSync(path.join(root, rejectedGlobalChatCandidate.runtime)) && sha256File(path.join(root, rejectedGlobalChatCandidate.source)) === rejectedGlobalChatCandidate.sourceSha256, 'Green Global Chat odbačeni runtime mora biti uklonjen, a izvor sačuvan.');
assert(globalChatConsumerSources.every(source => !source.includes('assets/green-soft-clay/global-chat-pro-v1.png')), 'Odbačeni Green Global Chat kandidat ima aktivnog UI potrošača.');
assert(Object.values(greenGlobalChatRoomIdentityManifest.integration || {}).filter(value => value === 'connected').length === 6 && greenGlobalChatRoomIdentityManifest.integration?.legacyRuntime === 'retired in standardization step 3' && greenGlobalChatRoomIdentityManifest.integration?.centralRegistry === 'standardized in standardization step 3' && greenGlobalChatRoomIdentityManifest.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Global Chat integracija i završni audit nisu dovršeni.');
assert(greenGlobalChatRoomIdentityRegistry.canonicalRuntime.length === 2 && JSON.stringify(greenGlobalChatRoomIdentityRegistry.semanticExclusions) === JSON.stringify(greenGlobalChatRoomIdentityManifest.semanticExclusions), 'Green Global Chat registry ili semantičke granice odstupaju.');
assert(JSON.stringify(greenGlobalChatRoomIdentityRegistry.forbiddenRuntimePaths) === JSON.stringify(['assets/green-soft-clay/global-chat-free-v2.png', 'assets/green-soft-clay/runtime/menu/global-chat-free-v2.png', 'assets/green-soft-clay/global-chat-pro-v1.png']), 'Green Global Chat zabrana legacy putanja nije potpuna.');
assert(greenGlobalChatRoomIdentityManifest.preservedRuntimeAssets.length === 3, 'Green Global Chat mora sačuvati zasebne history, send i Rules page motive.');
for (const asset of greenGlobalChatRoomIdentityManifest.preservedRuntimeAssets) {
    const file = path.join(root, asset.path);
    const info = readPngInfo(file);
    assert(JSON.stringify([info.width, info.height]) === JSON.stringify(asset.size) && [4, 6].includes(info.colorType) && sha256File(file) === asset.sha256, `Green Global Chat semantički izdvojeni asset je promenjen: ${asset.role}`);
    if (asset.bytes) assert(fs.statSync(file).size === asset.bytes, `Green Global Chat izdvojeni runtime ima pogrešnu veličinu: ${asset.role}`);
}
for (const exclusion of ['empty and loading history state glyph', 'send-message paper plane and compose controls', 'Rules communication page scene and its SR/EN title mapping', 'live online count, online dot, character counter and error status', 'message history, socket authentication, access rules and moderation', 'close and report-message controls', 'other room identities, invite-send states, Undo tokens and rewarded-video symbols']) {
    assert(greenGlobalChatRoomIdentityManifest.semanticExclusions.includes(exclusion), `Green Global Chat ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(indexSource.includes('class="green-global-chat-icon" data-theme-src="assets/green-soft-clay/canonical/global-chat-room-identity/global-chat-room-menu-v1.png?v=1"') && indexSource.includes('class="global-chat-header-soft-clay-icon-green" data-theme-src="assets/green-soft-clay/canonical/global-chat-room-identity/global-chat-room-v1.png?v=1"') && gameSource.includes("greenIcon: 'assets/green-soft-clay/canonical/global-chat-room-identity/global-chat-room-v1.png?v=1'") && rulesSource.includes("'assets/easter-soft-clay/global-chat-pro-v6.png': 'assets/green-soft-clay/canonical/global-chat-room-identity/global-chat-room-v1.png?v=1'"), 'Green Global Chat kanonske UI veze nisu povezane.');
assert(indexSource.includes('assets/green-soft-clay/global-chat-send-v1.png?v=opt2') && indexSource.includes('assets/green-soft-clay/global-chat-empty-v1.png?v=opt2') && globalChatSource.includes('assets/green-soft-clay/global-chat-empty-v1.png?v=opt2') && gameSource.includes("globalChat: path => path.startsWith('global-chat') || path === 'canonical/global-chat-room-identity/global-chat-room-v1.png'") && gameSource.includes('canonical\\/global-chat-room-identity\\/global-chat-room-menu'), 'Green Global Chat state/send veze, sobni matcher ili startup fallback nisu očuvani.');
for (const [glyph, title] of [['💬', 'Chat i komunikacija'], ['🌍', 'Globalni chat:'], ['💬', 'Chat & Communication'], ['🌍', 'Global Chat:']]) {
    assert(rulesSource.includes(`rulesThemeGlyphIconHtml('${glyph}', 'assets/easter-soft-clay/global-chat-pro-v6.png?v=1')} ${title}`), `Green Global Chat SR/EN Rules referenca nije očuvana: ${title}`);
}
const greenLoadingGateIcons = gameSource.match(/dark:\s*\{[\s\S]*?icons:\s*\[([\s\S]*?)\]/)?.[1];
assert(greenLoadingGateIcons && !greenLoadingGateIcons.includes('global-chat') && (greenLoadingGateIcons.match(/\.png/g) || []).length === 6 && greenGlobalChatRoomIdentityManifest.motionContract.loadingGate === 'not a consumer; preserve the existing six Green gate icons', 'Green Global Chat ne sme dobiti novu loading gate ulogu.');
assert(/#main-menu > \.main-global-chat-btn \.green-global-chat-icon\s*\{[^}]*width:\s*52px !important;[^}]*height:\s*52px !important;[^}]*object-fit:\s*contain;/s.test(themeCssSource) && /#global-chat-overlay \.global-chat-header-soft-clay-icon-green\s*\{[^}]*width:\s*32px;[^}]*height:\s*32px;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Global Chat menu ili header dimenzije nisu očuvane.');
assert(/#global-chat-overlay \.global-chat-send-soft-clay-icon-green\s*\{[^}]*width:\s*32px;[^}]*height:\s*32px;/s.test(themeCssSource) && /#global-chat-overlay \.global-chat-state-soft-clay-icon-green\s*\{[^}]*width:\s*76px;[^}]*height:\s*76px;/s.test(themeCssSource) && themeCssSource.includes('animation: easterGlobalChatStatePulse 1.55s ease-in-out infinite;'), 'Green Global Chat send/state prikazi nisu očuvani.');
assert(gameSource.includes("const isGreenIconOnly = introTheme === 'dark' && ['leaderboard', 'statistics', 'settings', 'rules', 'globalChat'") && /globalChat:\s*\{[^}]*greenIcon:\s*'assets\/green-soft-clay\/canonical\/global-chat-room-identity\/global-chat-room-v1\.png\?v=1'[^}]*scale:\s*1,/s.test(gameSource) && themeCssSource.includes('animation: greenRoomIconPulse 1.8s ease-in-out infinite;') && gameSource.includes('}, 3650);') && gameSource.includes('}, 4600);'), 'Green Global Chat intro nije očuvan.');
assert(greenGlobalChatRoomIdentityManifest.identity.palette === 'warm-ivory speech bubble with three forest-green dots, larger forest-green speech-bubble silhouette behind and one terracotta circular accent', 'Green Global Chat zaključana paleta je promenjena.');
assert(JSON.stringify(greenGlobalChatRoomIdentityManifest.variants[0].displaySizes) === JSON.stringify([[32, 32], ['clamp(210px, 34vmin, 290px)', 'clamp(210px, 34vmin, 290px)'], ['1.42em', '1.42em']]) && JSON.stringify(greenGlobalChatRoomIdentityManifest.variants[1].displaySizes) === '[[52,52]]', 'Green Global Chat zaključane prikazne veličine odstupaju.');
assert(/#main-menu > \.main-global-chat-btn\s*\{[^}]*width:\s*44px !important;[^}]*height:\s*44px !important;[^}]*background:\s*transparent !important;[^}]*border:\s*0 !important;/s.test(themeCssSource) && indexSource.includes('onmousedown="this.style.transform=\'scale(0.9)\'"') && indexSource.includes('onmouseup="this.style.transform=\'scale(1)\'"'), 'Green Global Chat transparentna kontrola ili press odgovor nisu očuvani.');
assert(/\.easter-room-intro-mark-wrap\s*\{[^}]*width:\s*clamp\(210px, 34vmin, 290px\);[^}]*height:\s*clamp\(210px, 34vmin, 290px\);/s.test(themeCssSource) && /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.easter-room-intro\.theme-dark\.easter-room-intro--icon-only \.easter-room-intro-mark\s*\{[^}]*animation:\s*none !important;/s.test(themeCssSource), 'Green Global Chat intro veličina ili reduced-motion fallback nisu očuvani.');
assert(/#global-chat-overlay \.global-chat-shell\s*\{[^}]*animation:\s*easterPanelLift \.42s/s.test(themeCssSource) && /#global-chat-overlay \.global-chat-state\.is-loading \.global-chat-state-soft-clay-icon-green\s*\{[^}]*animation:\s*easterGlobalChatStatePulse 1\.55s/s.test(themeCssSource) && /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*#global-chat-overlay \.global-chat-shell,[^}]*#global-chat-overlay \.global-chat-state\.is-loading \.global-chat-state-soft-clay-icon-green\s*\{[^}]*animation:\s*none !important;/s.test(themeCssSource), 'Green Global Chat shell/state motion ili reduced-motion fallback nisu očuvani.');
assert(/#rules-overlay-ui \.rules-theme-icon-green\s*\{[^}]*width:\s*1\.42em;[^}]*height:\s*1\.42em;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Global Chat glyph u Pravilima nema očuvan inline prikaz.');
const globalChatAuditInfo = readPngInfo(path.join(root, 'docs', 'green-asset-standardization-global-chat-room-identity-audit.png'));
assert(globalChatAuditInfo.width === 1480 && globalChatAuditInfo.height === 974, 'Green Global Chat audit tabla nedostaje ili je nepotpuna.');
// Online Players step 4: the audited room identity is locked in both registries.
assert(greenOnlinePlayersRoomIdentityManifest.status === 'locked' && greenOnlinePlayersRoomIdentityRegistry?.status === 'locked', 'Green Online Players mora biti zaključen u izvornom i centralnom registru.');
assert(greenThemeManifest.version === 63 && greenOnlinePlayersRoomIdentityManifest.integration?.cacheVersion === 54, 'Green Online Players mora zadržati istorijsku cache verziju 54 dok je tema na verziji 63.');
assert(JSON.stringify(greenOnlinePlayersRoomIdentityRegistry.identity) === JSON.stringify(greenOnlinePlayersRoomIdentityManifest.identity), 'Green Online Players DNK odstupa između source i centralnog registra.');
assert(greenOnlinePlayersRoomIdentityManifest.identity?.material === 'matte 3D Soft Clay Neumorphism' && greenOnlinePlayersRoomIdentityManifest.identity?.mapping === 'one immutable Online Players room identity with room and menu delivery variants', 'Green Online Players DNK ili pravilo jednog identiteta odstupa.');
assert(greenOnlinePlayersRoomIdentityManifest.identity?.presentation === 'one centered free-standing three-player glyph on a transparent background without text, square frame or backing tile' && greenOnlinePlayersRoomIdentityManifest.identity?.livePresence === 'online presence dot and live count are separate functional UI, never baked into the room PNG', 'Green Online Players mora ostati slobodan znak tri igrača sa izdvojenim živim statusom.');
const onlinePlayersExpectedHashes = {
    master: 'd72cf7d27bfbd93662b68ef819bb6376e99018e0b56e61f1666104c4dc5ee65d',
    room: '319f2407117c1ec539af88248b48ee2c2daaf544342dbf36c13ed2697f2bd189',
    menu: '330662c03ccc96c84ddd920834bb16a73ee5cc8ff4143cd9fcbaf0089ea6623f'
};
const onlinePlayersMaster = path.join(path.dirname(greenOnlinePlayersRoomIdentityManifestPath), greenOnlinePlayersRoomIdentityManifest.master.path);
const onlinePlayersApprovedSource = path.join(root, greenOnlinePlayersRoomIdentityManifest.master.approvedSource);
const onlinePlayersMasterInfo = readPngInfo(onlinePlayersMaster);
assert(onlinePlayersMasterInfo.width === 1254 && onlinePlayersMasterInfo.height === 1254 && onlinePlayersMasterInfo.colorType === 6, 'Green Online Players master mora biti 1254x1254 RGBA.');
assert(fs.statSync(onlinePlayersMaster).size === 912657 && greenOnlinePlayersRoomIdentityManifest.master.bytes === 912657 && greenOnlinePlayersRoomIdentityManifest.master.sha256 === onlinePlayersExpectedHashes.master && greenOnlinePlayersRoomIdentityManifest.master.approvedSourceSha256 === onlinePlayersExpectedHashes.master && sha256File(onlinePlayersMaster) === onlinePlayersExpectedHashes.master && sha256File(onlinePlayersApprovedSource) === onlinePlayersExpectedHashes.master, 'Green Online Players master nije bajt-po-bajt odobreni izvor.');
assert(JSON.stringify(greenOnlinePlayersRoomIdentityManifest.variants.map(asset => asset.id)) === '["room","menu"]', 'Green Online Players mora imati tačno room i menu varijantu.');
assert(JSON.stringify(greenOnlinePlayersRoomIdentityManifest.variants[0].displaySizes) === JSON.stringify([[32, 32], ['clamp(210px, 34vmin, 290px)', 'clamp(210px, 34vmin, 290px)'], ['1.42em', '1.42em']]) && JSON.stringify(greenOnlinePlayersRoomIdentityManifest.variants[1].displaySizes) === '[[44,44]]', 'Green Online Players prikazne veličine u manifestu odstupaju.');
const onlinePlayersConsumerSources = [indexSource, gameSource, rulesSource, onlineNumberSource];
for (const variant of greenOnlinePlayersRoomIdentityManifest.variants) {
    const runtime = path.join(root, variant.runtime);
    const activeRuntime = path.join(root, variant.activeRuntime);
    const info = readPngInfo(runtime);
    const expectedSize = variant.id === 'room' ? 512 : 384;
    const expectedBytes = variant.id === 'room' ? 154856 : 94595;
    assert(JSON.stringify(variant.runtimeSize) === JSON.stringify([expectedSize, expectedSize]) && info.width === expectedSize && info.height === expectedSize && info.colorType === 6, `Green Online Players canonical dimenzije/alpha odstupaju: ${variant.id}`);
    assert(variant.runtimeBytes === expectedBytes && fs.statSync(runtime).size === expectedBytes && variant.runtimeSha256 === onlinePlayersExpectedHashes[variant.id] && variant.activeRuntimeSha256 === onlinePlayersExpectedHashes[variant.id] && sha256File(runtime) === onlinePlayersExpectedHashes[variant.id] && !fs.existsSync(activeRuntime), `Green Online Players canonical odstupa ili legacy kopija nije uklonjena: ${variant.id}`);
    const canonicalPath = variant.runtime.replace(/^www\//, '');
    const activePath = variant.activeRuntime.replace(/^www\//, '');
    const canonicalReferences = onlinePlayersConsumerSources.reduce((count, source) => count + source.split(canonicalPath).length - 1, 0);
    const activeReferences = onlinePlayersConsumerSources.reduce((count, source) => count + source.split(activePath).length - 1, 0);
    const expectedReferences = variant.id === 'room' ? 4 : 2;
    assert(variant.expectedCanonicalReferences === expectedReferences && canonicalReferences === expectedReferences && activeReferences === 0, `Green Online Players UI veze nisu prebačene na canonical bez legacy referenci: ${variant.id}`);
    const registered = greenOnlinePlayersRoomIdentityRegistry.canonicalRuntime.find(asset => asset.role === variant.id);
    assert(registered?.path === canonicalPath && registered?.size === expectedSize && registered?.sha256 === variant.runtimeSha256, `Green Online Players registrovana canonical isporuka odstupa: ${variant.id}`);
}
const rejectedOnlinePlayersCandidate = greenOnlinePlayersRoomIdentityManifest.rejectedCandidates?.[0];
assert(greenOnlinePlayersRoomIdentityManifest.rejectedCandidates?.length === 1 && rejectedOnlinePlayersCandidate?.id === 'online-players-pro-v1' && rejectedOnlinePlayersCandidate.status === 'rejected-orphan' && rejectedOnlinePlayersCandidate.activeReferences === 0, 'Green Online Players mora evidentirati odbačeni framed orphan.');
const rejectedOnlinePlayersRuntime = path.join(root, rejectedOnlinePlayersCandidate.runtime);
assert(!fs.existsSync(rejectedOnlinePlayersRuntime) && sha256File(path.join(root, rejectedOnlinePlayersCandidate.source)) === rejectedOnlinePlayersCandidate.sourceSha256 && onlinePlayersConsumerSources.every(source => !source.includes('assets/green-soft-clay/online-players-pro-v1.png')), 'Green Online Players odbačeni runtime mora biti uklonjen, izvor sačuvan i bez UI referenci.');
for (const key of ['mainMenu', 'roomIntro', 'roomHeader', 'rulesMapping', 'roomOnDemand', 'startup']) {
    assert(greenOnlinePlayersRoomIdentityManifest.integration[key] === 'connected', `Green Online Players integracija nije dovršena: ${key}`);
}
assert(greenOnlinePlayersRoomIdentityManifest.integration.centralRegistry === 'standardized in standardization step 3' && greenOnlinePlayersRoomIdentityManifest.integration.legacyRuntime === 'retired in standardization step 3', 'Green Online Players registracija ili legacy retirement nisu evidentirani.');
assert(greenOnlinePlayersRoomIdentityRegistry.canonicalRuntime.length === 2 && JSON.stringify(greenOnlinePlayersRoomIdentityRegistry.semanticExclusions) === JSON.stringify(greenOnlinePlayersRoomIdentityManifest.semanticExclusions), 'Green Online Players registry mora imati dve isporuke i iste semantičke granice.');
assert(JSON.stringify(greenOnlinePlayersRoomIdentityRegistry.forbiddenRuntimePaths) === JSON.stringify(['assets/green-soft-clay/online-players-free-v2.png', 'assets/green-soft-clay/runtime/menu/online-players-free-v2.png', 'assets/green-soft-clay/online-players-pro-v1.png']), 'Green Online Players registry nema kompletnu zabranu legacy putanja.');
assert(greenOnlinePlayersRoomIdentityManifest.integration.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Online Players završni audit i zaključavanje nisu evidentirani.');
assert(greenOnlinePlayersRoomIdentityManifest.preservedRuntimeAssets.length === 5, 'Green Online Players mora izdvojiti state, tri deljene akcije i Rules page scenu.');
for (const asset of greenOnlinePlayersRoomIdentityManifest.preservedRuntimeAssets) {
    const file = path.join(root, asset.path);
    const info = readPngInfo(file);
    assert(JSON.stringify([info.width, info.height]) === JSON.stringify(asset.size) && info.colorType === 6 && sha256File(file) === asset.sha256, `Green Online Players izdvojeni asset je promenjen: ${asset.role}`);
    if (asset.bytes) assert(fs.statSync(file).size === asset.bytes, `Green Online Players izdvojeni asset ima pogrešnu veličinu: ${asset.role}`);
}
for (const exclusion of ['empty and loading player-list state glyph', 'shared add-friend action in player list, invite and Rules', 'shared spectate action in player list, gameplay header, LIVE badge and Rules', 'shared challenge and duel action, including Duel Chat and Chat challenge Rules references', 'Rules communication page scene and its SR/EN title mapping', 'live online count, presence dot, player status and profile photos', 'search, refresh, pagination, load-more, close and friend-request controls', 'login rules, socket actions and live player-list behavior', 'other room identities, H2H statistics, hotseat, online random and Global Chat send glyph']) {
    assert(greenOnlinePlayersRoomIdentityManifest.semanticExclusions.includes(exclusion), `Green Online Players ne razdvaja semantički izuzetak: ${exclusion}`);
}
assert(indexSource.includes('class="main-online-soft-clay-icon-green" data-theme-src="assets/green-soft-clay/canonical/online-players-room-identity/online-players-room-menu-v1.png?v=1"') && indexSource.includes('class="online-players-header-soft-clay-icon-green" data-theme-src="assets/green-soft-clay/canonical/online-players-room-identity/online-players-room-v1.png?v=1"') && gameSource.includes("greenIcon: 'assets/green-soft-clay/canonical/online-players-room-identity/online-players-room-v1.png?v=1'") && rulesSource.includes("'assets/easter-soft-clay/online-players-pro-v4.png': 'assets/green-soft-clay/canonical/online-players-room-identity/online-players-room-v1.png?v=1'"), 'Green Online Players canonical UI putanje nisu povezane.');
for (const name of ['online-players-state-v1', 'online-add-friend-v1', 'online-spectate-v1', 'online-duel-v1']) {
    const source = `assets/green-soft-clay/${name}.png?v=opt2`;
    assert(gameSource.includes(source) && onlineNumberSource.includes(source), `Green Online Players pack ili dinamička lista nema sačuvan asset: ${name}`);
}
assert(gameSource.includes('class="green-invite-add-icon" data-theme-src="assets/green-soft-clay/online-add-friend-v1.png?v=opt2"') && indexSource.includes('class="green-spectator-soft-clay-icon" data-theme-src="assets/green-soft-clay/online-spectate-v1.png?v=opt2"') && gameSource.includes('class="green-spectating-live-icon" data-theme-src="assets/green-soft-clay/online-spectate-v1.png?v=opt2"'), 'Green Online Players deljene invite/spectator/LIVE veze nisu očuvane.');
for (const [glyph, asset, titles] of [
    ['🟢', 'online-players-pro-v4', ['Online igrači i interakcija', 'Online Players & Interaction']],
    ['➕', 'online-add-friend-pro-v2', ['Dodaj prijatelja:', 'Add Friend:']],
    ['👁️', 'online-spectate-pro-v4', ['Gledaj partiju:', 'Spectate:']],
    ['⚔️', 'online-duel-pro-v3', ['Izazov:', 'Challenge:', 'Izazov iz chata:', 'Chat challenge:']],
    ['🎮', 'online-duel-pro-v3', ['Duel chat:', 'Duel Chat:']]
]) {
    const version = asset === 'online-players-pro-v4' ? '1' : 'opt2';
    for (const title of titles) assert(rulesSource.includes(`rulesThemeGlyphIconHtml('${glyph}', 'assets/easter-soft-clay/${asset}.png?v=${version}')} ${title}`), `Green Online Players SR/EN Rules referenca nije očuvana: ${title}`);
}
assert(gameSource.includes("onlinePlayers: path => path.startsWith('online-players') || path.startsWith('online-add-') || path.startsWith('online-spectate') || path.startsWith('online-duel') || path === 'canonical/online-players-room-identity/online-players-room-v1.png',") && gameSource.includes('canonical\\/online-players-room-identity\\/online-players-room-menu'), 'Green Online Players matcher ili startup fallback nisu povezani.');
assert(greenLoadingGateIcons && !greenLoadingGateIcons.includes('online-players') && (greenLoadingGateIcons.match(/\.png/g) || []).length === 6 && greenOnlinePlayersRoomIdentityManifest.motionContract.loadingGate === 'not a consumer; preserve the existing six Green gate icons', 'Green Online Players ne sme dobiti novu loading gate ulogu.');
assert(/#main-menu \.main-online-soft-clay-icon-green\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;[^}]*object-fit:\s*contain;/s.test(themeCssSource) && /#online-players-overlay \.online-players-header-soft-clay-icon-green\s*\{[^}]*width:\s*32px;[^}]*height:\s*32px;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Online Players menu/header dimenzije nisu očuvane.');
assert(/#main-menu \.main-online-icon-wrap\s*\{[^}]*width:\s*38px;[^}]*height:\s*38px;/s.test(styleCssSource) && /#main-menu \.main-online-presence-dot\s*\{[^}]*width:\s*8px;[^}]*height:\s*8px;[^}]*animation:\s*pulse 2s infinite;/s.test(styleCssSource), 'Green Online Players wrapper ili živi presence motion nisu očuvani.');
assert(/#online-players-overlay \.online-player-action-soft-clay-icon-green\s*\{[^}]*width:\s*36px;[^}]*height:\s*36px;/s.test(themeCssSource) && /#online-players-overlay \.online-player-action--spectate \.online-player-action-soft-clay-icon-green\s*\{[^}]*width:\s*27px;[^}]*height:\s*27px;/s.test(themeCssSource) && /#online-players-overlay \.online-players-state-soft-clay-icon-green\s*\{[^}]*width:\s*88px;[^}]*height:\s*88px;[^}]*opacity:\s*\.86;/s.test(themeCssSource), 'Green Online Players action/state dimenzije nisu očuvane.');
assert(/#online-players-overlay \.online-players-shell\s*\{[^}]*animation:\s*easterPanelLift \.42s/s.test(themeCssSource) && /#online-players-overlay \.online-players-state\.is-loading \.online-players-state-soft-clay-icon-green\s*\{[^}]*animation:\s*easterOnlinePlayersStatePulse 1\.55s/s.test(themeCssSource) && /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*#online-players-overlay \.online-players-shell,[^}]*#online-players-overlay \.online-players-state\.is-loading \.online-players-state-soft-clay-icon-green\s*\{[^}]*animation:\s*none !important;/s.test(themeCssSource), 'Green Online Players shell/state motion ili reduced-motion fallback nisu očuvani.');
assert(/onlinePlayers:\s*\{[^}]*greenIcon:\s*'assets\/green-soft-clay\/canonical\/online-players-room-identity\/online-players-room-v1\.png\?v=1'[^}]*scale:\s*1,/s.test(gameSource) && themeCssSource.includes('animation: greenRoomIconPulse 1.8s ease-in-out infinite;') && gameSource.includes('}, 3650);') && gameSource.includes('}, 4600);'), 'Green Online Players intro nije očuvan.');
const onlinePlayersAuditInfo = readPngInfo(path.join(root, 'docs', 'green-asset-standardization-online-players-room-identity-audit.png'));
assert(onlinePlayersAuditInfo.width === 1480 && onlinePlayersAuditInfo.height === 1398, 'Green Online Players audit tabla nedostaje ili je nepotpuna.');
assert(greenOnlinePlayersRoomIdentityManifest.identity.palette === 'one larger forest-green player in front, two warm-ivory players behind and a small ivory neck detail on the central figure', 'Green Online Players zaključana paleta je promenjena.');
assert(greenOnlinePlayersRoomIdentityManifest.master.path === 'green-online-players-room-master-v1.png' && greenOnlinePlayersRoomIdentityManifest.master.approvedSource === 'source-assets/green-soft-clay-hires/online-players-free-v2.png', 'Green Online Players poreklo zaključanog mastera nije očuvano.');
assert(JSON.stringify(greenOnlinePlayersRoomIdentityRegistry.retiredMasterReplacements) === JSON.stringify({
    'online-players-free-v2.png': 'canonical/online-players-room-identity/online-players-room-v1.png',
    'runtime/menu/online-players-free-v2.png': 'canonical/online-players-room-identity/online-players-room-menu-v1.png',
    'online-players-pro-v1.png': 'canonical/online-players-room-identity/online-players-room-v1.png'
}), 'Green Online Players istorijsko mapiranje canonical zamena nije kompletno.');
assert(/<div class="main-online-card"[^>]*onmousedown="this\.style\.transform='scale\(0\.95\)'"[^>]*onmouseup="this\.style\.transform='scale\(1\)'"/.test(indexSource), 'Green Online Players card press odgovor nije očuvan.');
assert(/\.easter-room-intro-mark-wrap\s*\{[^}]*width:\s*clamp\(210px, 34vmin, 290px\);[^}]*height:\s*clamp\(210px, 34vmin, 290px\);/s.test(themeCssSource) && /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.easter-room-intro\.theme-dark\.easter-room-intro--icon-only \.easter-room-intro-mark\s*\{[^}]*animation:\s*none !important;/s.test(themeCssSource), 'Green Online Players intro veličina ili reduced-motion fallback nisu očuvani.');
assert(/#online-players-overlay \.online-player-action\.is-disabled\s*\{[^}]*opacity:\s*\.42 !important;/s.test(themeCssSource) && /#online-players-overlay \.online-player-action\.is-disabled \.online-player-action-soft-clay-icon-green\s*\{[^}]*filter:\s*grayscale\(\.72\) saturate\(\.42\)/s.test(themeCssSource), 'Green Online Players disabled akcije nisu očuvane.');
assert(/#waiting-screen\.is-hosting-invite \.green-invite-add-icon\s*\{[^}]*width:\s*52px;[^}]*height:\s*52px;[^}]*animation:\s*greenInviteSoftBreath 2\.1s/s.test(themeCssSource) && /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*#waiting-screen\.is-hosting-invite \.green-invite-add-icon,[^}]*animation:\s*none !important;/s.test(themeCssSource), 'Green Online Players deljeni add-friend prikaz ili reduced-motion nisu očuvani.');
assert(/\.green-spectator-soft-clay-icon\s*\{[^}]*width:\s*27px;[^}]*height:\s*27px;/s.test(themeCssSource) && /\.green-spectating-live-icon\s*\{[^}]*width:\s*19px;[^}]*height:\s*19px;/s.test(themeCssSource), 'Green Online Players deljeni spectator/LIVE prikazi nisu očuvani.');
assert(/#rules-overlay-ui \.rules-theme-icon-green\s*\{[^}]*width:\s*1\.42em;[^}]*height:\s*1\.42em;[^}]*object-fit:\s*contain;/s.test(themeCssSource), 'Green Online Players inline Rules prikaz nije očuvan.');
// Execute the real loading methods with a small DOM fixture; no app startup,
// sockets, authentication or network requests are involved.
const onlinePlayersLoadingMethod = (name, nextName) => {
    const start = gameSource.indexOf(`    ${name}(`);
    const end = gameSource.indexOf(`\n    ${nextName}(`, start);
    assert(start >= 0 && end > start, `Nedostaje stvarna theme-loading metoda: ${name}`);
    return gameSource.slice(start, end).trim();
};
let onlinePlayersMenuFixture = null;
const onlinePlayersLoadingHarness = vm.runInNewContext(`({${[
    ['getThemeLoadingPack', 'getThemeAssetRoot'],
    ['getThemeAssetRoot', 'getMainRoomPackSource'],
    ['getMainRoomPackSource', 'getMainMenuIconSources'],
    ['getMainMenuIconSources', 'getRewardedVideoPackSources'],
    ['getRewardedVideoPackSources', 'getThemeSplashSource'],
    ['getThemeSplashSource', 'configureThemeSplashImage'],
    ['getThemeStartupSources', 'getThemeRoomSources'],
    ['getThemeRoomSources', 'collectThemeSourcesFromRoot'],
    ['collectThemeSourcesFromRoot', 'getThemeRoomRoot']
].map(([name, nextName]) => onlinePlayersLoadingMethod(name, nextName)).join(',\n')}})`, {
    localStorage: { getItem: () => 'sr' },
    document: { getElementById: id => id === 'main-menu' ? onlinePlayersMenuFixture : null }
});
const onlinePlayersCanonicalMenu = 'assets/green-soft-clay/canonical/online-players-room-identity/online-players-room-menu-v1.png?v=1';
const onlinePlayersCanonicalRoom = 'assets/green-soft-clay/canonical/online-players-room-identity/online-players-room-v1.png?v=1';
const onlinePlayersActualPack = onlinePlayersLoadingHarness.getThemeLoadingPack('dark');
assert(onlinePlayersActualPack.menuAssets.includes(onlinePlayersCanonicalMenu) && onlinePlayersActualPack.menuAssets.length === 5 && !onlinePlayersActualPack.assets.includes(onlinePlayersCanonicalMenu), 'Online Players menu fallback mora ostati odvojen od sobnog pack.assets kataloga uz Solo, Hotseat, Online Random i Invite Friend menu isporuke.');
const onlinePlayersFallbackStartup = onlinePlayersLoadingHarness.getThemeStartupSources('dark');
assert(onlinePlayersFallbackStartup.filter(source => source === onlinePlayersCanonicalMenu).length === 1 && !onlinePlayersFallbackStartup.includes(onlinePlayersCanonicalRoom), 'Stvarni Green startup fallback mora dobiti tačno jednu Online Players menu sliku, bez room slike.');
const onlinePlayersActualRoomSources = onlinePlayersLoadingHarness.getThemeRoomSources('dark', 'onlinePlayers');
const onlinePlayersExpectedRoomSources = [onlinePlayersCanonicalRoom, ...['online-players-state-v1', 'online-add-friend-v1', 'online-spectate-v1', 'online-duel-v1'].map(name => `assets/green-soft-clay/${name}.png?v=opt2`)];
assert(JSON.stringify([...onlinePlayersActualRoomSources].sort()) === JSON.stringify(onlinePlayersExpectedRoomSources.sort()), 'Stvarni Online Players room preload mora sadržati samo kanonski room i četiri izdvojena state/action asseta.');
const onlinePlayersMenuFromHtml = indexSource.match(/class="main-online-soft-clay-icon-green" data-theme-src="([^"]+)"/)?.[1];
onlinePlayersMenuFixture = { querySelectorAll: () => [
    { dataset: { themeSrc: onlinePlayersMenuFromHtml } },
    { dataset: { themeSrc: 'assets/easter-soft-clay/runtime/menu/online-players-pro-v4.png?v=1' } },
    { dataset: { themeSrc: 'assets/desert-soft-clay/runtime/menu/online-players-pro-v2.png?v=1' } }
] };
const onlinePlayersDomStartup = onlinePlayersLoadingHarness.getThemeStartupSources('dark');
assert(onlinePlayersDomStartup.filter(source => source === onlinePlayersCanonicalMenu).length === 1 && !onlinePlayersDomStartup.includes(onlinePlayersCanonicalRoom) && onlinePlayersDomStartup.every(source => !source.includes('easter-soft-clay') && !source.includes('desert-soft-clay')), 'Stvarni Green DOM startup ne razdvaja menu/room ili aktivnu temu.');
onlinePlayersMenuFixture = null;
for (const theme of ['easter', 'desert']) {
    assert(onlinePlayersLoadingHarness.getThemeStartupSources(theme).every(source => !source.includes('green-soft-clay')) && onlinePlayersLoadingHarness.getThemeRoomSources(theme, 'onlinePlayers').every(source => !source.includes('green-soft-clay')), `Green Online Players migracija curi u drugu temu: ${theme}`);
}
// Quarterly League step 4: the approved room identity is locked while
// navigation tabs, ranks, medals, geometry and intro motion remain separate.
const quarterlyRoomIdentity = greenQuarterlyLeagueRoomIdentityManifest;
const quarterlyRoomIdentityRegistry = greenAssetRegistry.families?.quarterlyLeagueRoomIdentity;
assert(quarterlyRoomIdentity.status === 'locked' && quarterlyRoomIdentityRegistry?.status === 'locked', 'Green Quarterly League room identity mora biti zaključen u source i centralnom registru.');
assert(quarterlyRoomIdentity.integration?.cacheVersion === 55 && greenThemeManifest.version === 63, 'Green Quarterly League mora zadržati istorijsku cache verziju 55 dok je tema na verziji 63.');
assert(JSON.stringify(quarterlyRoomIdentityRegistry.identity) === JSON.stringify(quarterlyRoomIdentity.identity), 'Green Quarterly League DNK odstupa između source manifesta i centralnog registra.');
assert(quarterlyRoomIdentity.identity?.mapping === 'one immutable Quarterly League room identity with room and menu-watermark delivery variants' && quarterlyRoomIdentity.identity.presentation.includes('ivory diamond rim belongs to the logo'), 'Green Quarterly League romb DNK ili pravilo jednog identiteta odstupa.');
const quarterlyExpectedHashes = {
    master: '4b5f7c66d8a4cd7a859e355d12efc6cec5adfa546d77b78129283f575b4b6597',
    room: '87a0a07b5abf5abc9dfa58a5265665fd2d1b81f62c48e692cfa0ffe4657a7ed4',
    menu: 'f21cece394a0184082aaaa7ed7fa327d3beedd360c1f01383002965bd96191bb'
};
const quarterlyMaster = path.join(path.dirname(greenQuarterlyLeagueRoomIdentityManifestPath), quarterlyRoomIdentity.master.path);
const quarterlyApprovedSource = path.join(root, quarterlyRoomIdentity.master.approvedSource);
const quarterlyMasterInfo = readPngInfo(quarterlyMaster);
assert(quarterlyMasterInfo.width === 1254 && quarterlyMasterInfo.height === 1254 && quarterlyMasterInfo.colorType === 6 && quarterlyRoomIdentity.master.bytes === 1263658 && fs.statSync(quarterlyMaster).size === 1263658 && quarterlyRoomIdentity.master.sha256 === quarterlyExpectedHashes.master && quarterlyRoomIdentity.master.approvedSourceSha256 === quarterlyExpectedHashes.master && sha256File(quarterlyMaster) === quarterlyExpectedHashes.master && sha256File(quarterlyApprovedSource) === quarterlyExpectedHashes.master, 'Green Quarterly League master nije bajt-po-bajt odobreni izvor.');
assert(JSON.stringify(quarterlyRoomIdentity.variants.map(asset => asset.id)) === '["room","menu"]', 'Green Quarterly League mora imati samo room i menu isporuke.');
assert(quarterlyRoomIdentityRegistry.canonicalRuntime.length === 2 && quarterlyRoomIdentityRegistry.compositeRuntime.length === 0 && JSON.stringify(quarterlyRoomIdentityRegistry.semanticExclusions) === JSON.stringify(quarterlyRoomIdentity.semanticExclusions), 'Green Quarterly League registar mora imati dve isporuke i iste semantičke granice.');
const quarterlyConsumerSources = [indexSource, quarterlyLeagueSource, gameSource, rulesSource, themeCssSource];
for (const variant of quarterlyRoomIdentity.variants) {
    const runtime = path.join(root, variant.runtime);
    const activeRuntime = path.join(root, variant.activeRuntime);
    const size = variant.id === 'room' ? 512 : 384;
    const bytes = variant.id === 'room' ? 217526 : 136653;
    const info = readPngInfo(runtime);
    assert(JSON.stringify(variant.runtimeSize) === JSON.stringify([size, size]) && info.width === size && info.height === size && info.colorType === 6 && variant.runtimeBytes === bytes && fs.statSync(runtime).size === bytes, `Green Quarterly League canonical ${variant.id} dimenzija/alpha odstupa.`);
    assert(variant.runtimeSha256 === quarterlyExpectedHashes[variant.id] && variant.activeRuntimeSha256 === quarterlyExpectedHashes[variant.id] && sha256File(runtime) === quarterlyExpectedHashes[variant.id] && !fs.existsSync(activeRuntime), `Green Quarterly League canonical ${variant.id} odstupa ili stara kopija nije uklonjena.`);
    const canonicalPath = variant.runtime.replace(/^www\//, '');
    const activePath = variant.activeRuntime.replace(/^www\//, '');
    const canonicalReferences = quarterlyConsumerSources.reduce((count, source) => count + source.split(canonicalPath).length - 1, 0);
    const activeReferences = quarterlyConsumerSources.reduce((count, source) => count + source.split(activePath).length - 1, 0);
    const expectedReferences = variant.id === 'room' ? 5 : 2;
    assert(variant.expectedCanonicalReferences === expectedReferences && canonicalReferences === expectedReferences && activeReferences === 0, `Green Quarterly League ${variant.id} UI veze nisu prebačene na canonical bez legacy referenci.`);
    const registered = quarterlyRoomIdentityRegistry.canonicalRuntime.find(asset => asset.role === variant.id);
    assert(registered?.path === canonicalPath && registered?.size === size && registered?.sha256 === variant.runtimeSha256, `Green Quarterly League registrovana ${variant.id} isporuka odstupa.`);
}
assert(quarterlyRoomIdentity.protectedFamilies.length === 3 && quarterlyRoomIdentity.protectedFamilies.every(family => JSON.parse(fs.readFileSync(path.join(root, family.sourceManifest), 'utf8')).status === 'locked'), 'Green Quarterly League već zaključana navigacija/rangovi/medalje moraju ostati izdvojeni.');
assert(greenQuarterlyNavigationManifest.catalog.length === 4 && greenQuarterlyRankBadgesManifest.catalog.length === 6 && greenCompetitionMedalsManifest.subfamilies.quarterlyLeaguePodium.runtime.length === 3, 'Green Quarterly League četiri taba, šest rangova i tri medalje moraju ostati odvojene zaključane porodice.');
for (const key of ['mainMenuWatermark', 'roomIntro', 'roomHeader', 'winnerPopup', 'rulesMapping', 'roomOnDemand']) {
    assert(quarterlyRoomIdentity.integration[key] === 'connected', `Green Quarterly League potrošač nije povezan: ${key}`);
}
assert(quarterlyRoomIdentity.integration.startupFallback.startsWith('connected; only 384px menu watermark') && quarterlyRoomIdentity.integration.centralRegistry === 'standardized in standardization step 3' && quarterlyRoomIdentity.integration.legacyRuntime === 'retired in standardization step 3' && quarterlyRoomIdentity.integration.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Quarterly League startup/registry/legacy/final audit status nije verno evidentiran.');
assert(JSON.stringify(quarterlyRoomIdentityRegistry.forbiddenRuntimePaths) === JSON.stringify(['assets/green-soft-clay/quarterly-league-yotb-ql-free-v2.png', 'assets/green-soft-clay/runtime/menu/quarterly-league-yotb-ql-free-v2.png']), 'Green Quarterly League registar mora zabraniti obe stare runtime putanje.');
assert(JSON.stringify(quarterlyRoomIdentityRegistry.retiredMasterReplacements) === JSON.stringify({
    'quarterly-league-yotb-ql-free-v2.png': 'canonical/quarterly-league-room-identity/quarterly-league-room-v1.png',
    'runtime/menu/quarterly-league-yotb-ql-free-v2.png': 'canonical/quarterly-league-room-identity/quarterly-league-room-menu-v1.png'
}), 'Green Quarterly League istorijsko mapiranje zamena nije kompletno.');
const quarterlyRoomSource = 'assets/green-soft-clay/canonical/quarterly-league-room-identity/quarterly-league-room-v1.png?v=1';
const quarterlyMenuSource = 'assets/green-soft-clay/canonical/quarterly-league-room-identity/quarterly-league-room-menu-v1.png?v=1';
assert(indexSource.includes(`class="league-intro-mark-green" data-theme-src="${quarterlyRoomSource}"`) && quarterlyLeagueSource.includes(`class="league-modal-header-icon league-modal-header-icon-green" data-theme-src="${quarterlyRoomSource}"`) && rulesSource.includes(`'assets/easter-soft-clay/quarterly-league-yotb-ql-pro-v3.png?v=opt2': '${quarterlyRoomSource}'`), 'Green Quarterly League intro, zaglavlje ili SR/EN Pravila ne koriste isti canonical znak.');
const quarterlyRulesHeadingCall = "rulesThemeAssetIconHtml('assets/quarterly-league-icon.svg', 'assets/easter-soft-clay/quarterly-league-yotb-ql-pro-v3.png?v=opt2')";
const quarterlyRulesSettlementCall = "rulesThemeAssetIconHtml('assets/quarterly-league-watermark.png', 'assets/easter-soft-clay/quarterly-league-yotb-ql-pro-v3.png?v=opt2', 'rules-asset-icon--png')";
assert(rulesSource.split(quarterlyRulesHeadingCall).length - 1 === 2 && rulesSource.split(quarterlyRulesSettlementCall).length - 1 === 2 && rulesSource.includes('} Kvartalna liga</h3>') && rulesSource.includes('} Quarterly League</h3>'), 'Green Quarterly League SR/EN naslovi i oba obračunska inline prikaza nisu kompletni.');
assert(gameSource.includes(`'${quarterlyRoomSource}'`) && gameSource.includes(`class="quarter-winner-logo quarter-winner-logo-green" data-theme-src="${quarterlyRoomSource}"`) && themeCssSource.includes(`background: url("${quarterlyMenuSource}") center / contain no-repeat;`), 'Green Quarterly League sobni katalog, pobednički popup ili menu watermark nisu povezani.');
assert(/#league-intro\.theme-dark \.league-intro-mark-wrap\s*\{[^}]*width:\s*clamp\(210px, 34vmin, 290px\);[^}]*height:\s*clamp\(210px, 34vmin, 290px\);/s.test(themeCssSource) && /#league-intro\.theme-dark \.league-intro-mark-green\s*\{[^}]*animation:\s*easterRoomIconPulse 1\.8s/s.test(themeCssSource) && quarterlyLeagueSource.includes('const openBehindOverlayAt = 3650;') && quarterlyLeagueSource.includes('const introDuration = 4600;'), 'Green Quarterly League intro mera ili motion je promenjen.');
assert(/#league-modal-overlay \.league-modal-header-icon-green\s*\{[^}]*width:\s*42px;[^}]*height:\s*42px;/s.test(themeCssSource) && /\.quarter-winner-logo-green\s*\{[^}]*width:\s*96px;[^}]*height:\s*96px;/s.test(themeCssSource) && themeCssSource.includes('opacity: .18;'), 'Green Quarterly League header, popup ili watermark mera je promenjena.');
assert(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*#league-intro\.theme-dark,[^}]*#league-intro\.theme-dark \.league-intro-mark-green\s*\{[^}]*animation:\s*none !important;/s.test(themeCssSource), 'Green Quarterly League reduced-motion zaštita nije očuvana.');
const quarterlyFallbackStartup = onlinePlayersLoadingHarness.getThemeStartupSources('dark');
assert(quarterlyFallbackStartup.filter(source => source === quarterlyMenuSource).length === 1 && !quarterlyFallbackStartup.includes(quarterlyRoomSource), 'Green no-DOM startup mora učitati samo 384px QL watermark, bez 512px room logoa.');
onlinePlayersMenuFixture = { querySelectorAll: () => [] };
const quarterlyDomStartup = onlinePlayersLoadingHarness.getThemeStartupSources('dark');
onlinePlayersMenuFixture = null;
assert(quarterlyDomStartup.filter(source => source === quarterlyMenuSource).length === 1 && !quarterlyDomStartup.includes(quarterlyRoomSource), 'Green DOM startup mora učitati samo 384px QL watermark.');
const quarterlyActualRoomSources = onlinePlayersLoadingHarness.getThemeRoomSources('dark', 'quarterlyLeague');
const quarterlyExpectedRoomSources = [quarterlyRoomSource, ...['gold', 'silver', 'bronze'].map(tier => `assets/green-soft-clay/canonical/competition-medals/quarterly-league-${tier}-v1.png?v=1`)];
assert(JSON.stringify([...quarterlyActualRoomSources].sort()) === JSON.stringify(quarterlyExpectedRoomSources.sort()) && !quarterlyActualRoomSources.includes(quarterlyMenuSource), 'Green Quarterly League sobni paket mora imati room logo i tri podium medalje, bez menu watermarka.');
for (const theme of ['easter', 'desert', 'severna']) assert(onlinePlayersLoadingHarness.getThemeStartupSources(theme).every(source => !source.includes('green-soft-clay')) && onlinePlayersLoadingHarness.getThemeRoomSources(theme, 'quarterlyLeague').every(source => !source.includes('green-soft-clay')), `Green Quarterly League identitet curi u drugu temu: ${theme}`);
const quarterlyAuditInfo = readPngInfo(path.join(root, 'docs', 'green-asset-standardization-quarterly-league-room-identity-audit.png'));
assert(quarterlyAuditInfo.width === 1480 && quarterlyAuditInfo.height === 974, 'Green Quarterly League Korak 1 audit tabla nedostaje.');
// Solo Room Identity step 4: lock the approved derivatives after final visual,
// semantic, startup/room-isolation and protected-family checks.
const soloRoomIdentity = greenSoloRoomIdentityManifest;
const soloRoomIdentityRegistry = greenAssetRegistry.families?.soloRoomIdentity;
assert(soloRoomIdentity.status === 'locked' && soloRoomIdentityRegistry?.status === 'locked', 'Green Solo Room Identity mora biti zaključan u source i centralnom registru.');
assert(JSON.stringify(soloRoomIdentityRegistry.identity) === JSON.stringify(soloRoomIdentity.identity), 'Green Solo Room Identity DNK odstupa između source manifesta i centralnog registra.');
assert(soloRoomIdentity.identity?.material === 'matte 3D Soft Clay Neumorphism' && soloRoomIdentity.identity?.mapping === 'one immutable Solo entry identity with room and menu delivery variants' && soloRoomIdentity.identity?.presentation.includes('without a backing tile'), 'Green Solo Room Identity DNK ili pravilo jednog znaka odstupa.');
const soloRoomExpectedHashes = {
    master: 'd2f92460d5f04efebf7ac708a1ff49d62521550335ead7a4e94fa543a2beecd9',
    room: 'd697e38721762c01fcf90a13475ff67dc7413b677765c70865ff3453e589ceb4',
    menu: '71ea4a39070b18d03403818a26689add95223ccbd952736282ddaf4031bd4ee5'
};
const soloRoomMaster = path.join(path.dirname(greenSoloRoomIdentityManifestPath), soloRoomIdentity.master.path);
const soloRoomApprovedSource = path.join(root, soloRoomIdentity.master.approvedSource);
const soloRoomMasterInfo = readPngInfo(soloRoomMaster);
assert(soloRoomMasterInfo.width === 1254 && soloRoomMasterInfo.height === 1254 && soloRoomMasterInfo.colorType === 6 && soloRoomIdentity.master.bytes === 958718 && fs.statSync(soloRoomMaster).size === 958718 && soloRoomIdentity.master.sha256 === soloRoomExpectedHashes.master && soloRoomIdentity.master.approvedSourceSha256 === soloRoomExpectedHashes.master && sha256File(soloRoomMaster) === soloRoomExpectedHashes.master && sha256File(soloRoomApprovedSource) === soloRoomExpectedHashes.master, 'Green Solo Room master nije bajt-po-bajt odobreni izvor.');
assert(JSON.stringify(soloRoomIdentity.variants.map(asset => asset.id)) === '["room","menu"]', 'Green Solo Room Identity mora imati samo room i menu isporuke.');
const soloRoomConsumerSources = [indexSource, gameSource, rulesSource, themeCssSource];
for (const variant of soloRoomIdentity.variants) {
    const runtime = path.join(root, variant.runtime);
    const activeRuntime = path.join(root, variant.activeRuntime);
    const size = variant.id === 'room' ? 512 : 384;
    const bytes = variant.id === 'room' ? 156807 : 93182;
    const info = readPngInfo(runtime);
    assert(JSON.stringify(variant.runtimeSize) === JSON.stringify([size, size]) && info.width === size && info.height === size && info.colorType === 6 && variant.runtimeBytes === bytes && fs.statSync(runtime).size === bytes, `Green Solo Room canonical ${variant.id} dimenzija/alpha odstupa.`);
    assert(variant.runtimeSha256 === soloRoomExpectedHashes[variant.id] && variant.activeRuntimeSha256 === soloRoomExpectedHashes[variant.id] && sha256File(runtime) === soloRoomExpectedHashes[variant.id] && !fs.existsSync(activeRuntime), `Green Solo Room canonical ${variant.id} odstupa ili stara kopija nije uklonjena.`);
    const canonicalPath = variant.runtime.replace(/^www\//, '');
    const activePath = variant.activeRuntime.replace(/^www\//, '');
    const canonicalReferences = soloRoomConsumerSources.reduce((count, source) => count + source.split(canonicalPath).length - 1, 0);
    const activeReferences = soloRoomConsumerSources.reduce((count, source) => count + source.split(activePath).length - 1, 0);
    const expectedLegacyReferences = variant.id === 'room' ? 3 : 1;
    const expectedCanonicalReferences = 2;
    assert(variant.legacyReferencesBeforeIntegration === expectedLegacyReferences && variant.expectedCanonicalReferences === expectedCanonicalReferences && canonicalReferences === expectedCanonicalReferences && activeReferences === 0, `Green Solo Room ${variant.id} UI veze nisu prebačene na canonical bez legacy referenci.`);
    const registered = soloRoomIdentityRegistry.canonicalRuntime.find(asset => asset.role === variant.id);
    assert(registered?.path === canonicalPath && registered?.size === size && registered?.sha256 === variant.runtimeSha256, `Green Solo Room registrovana ${variant.id} isporuka odstupa.`);
}
assert(soloRoomIdentity.protectedFamilies.length === 3 && soloRoomIdentity.protectedFamilies.every(family => JSON.parse(fs.readFileSync(path.join(root, family.sourceManifest), 'utf8')).status === 'locked'), 'Green Solo Room mora sačuvati zaključane Results, Hotseat Winner i Rewarded Video porodice.');
assert(soloRoomIdentityRegistry.canonicalRuntime.length === 2 && soloRoomIdentityRegistry.compositeRuntime.length === 0 && JSON.stringify(soloRoomIdentityRegistry.semanticExclusions) === JSON.stringify(soloRoomIdentity.semanticExclusions), 'Green Solo Room registar mora imati dve isporuke i iste semantičke granice.');
assert(JSON.stringify(soloRoomIdentityRegistry.forbiddenRuntimePaths) === JSON.stringify(['assets/green-soft-clay/mode-solo-free-v2.png', 'assets/green-soft-clay/runtime/menu/mode-solo-free-v2.png']), 'Green Solo Room registar mora zabraniti obe stare runtime putanje.');
assert(soloRoomIdentity.integration?.centralRegistry === 'standardized in standardization step 3' && soloRoomIdentity.integration?.cacheVersion === 56 && greenThemeManifest.version === 63 && soloRoomIdentity.integration?.legacyRuntime === 'retired in standardization step 3' && soloRoomIdentity.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Solo Room mora zadržati istorijsku cache verziju 56 dok je tema na verziji 63.');
const soloRoomSource = 'assets/green-soft-clay/canonical/solo-room-identity/solo-room-v1.png?v=1';
const soloMenuSource = 'assets/green-soft-clay/canonical/solo-room-identity/solo-room-menu-v1.png?v=1';
assert(indexSource.includes(`class="green-solo-soft-clay-icon" data-theme-src="${soloMenuSource}"`) && gameSource.includes(`greenIcon: '${soloRoomSource}'`) && gameSource.includes(`'${soloRoomSource}'`), 'Green Solo menu, intro ili sobni katalog nisu povezani sa canonical isporukama.');
assert(/#main-menu \.green-solo-soft-clay-icon,[^{]+\{[^}]*width:\s*68px !important;[^}]*height:\s*68px !important;/s.test(themeCssSource) && /\.easter-room-intro-mark-wrap\s*\{[^}]*width:\s*clamp\(210px, 34vmin, 290px\);[^}]*height:\s*clamp\(210px, 34vmin, 290px\);/s.test(themeCssSource) && themeCssSource.includes('animation: greenRoomIconPulse 1.8s ease-in-out infinite;'), 'Green Solo menu mera ili intro motion je promenjen.');
const soloFallbackStartup = onlinePlayersLoadingHarness.getThemeStartupSources('dark');
assert(soloFallbackStartup.filter(source => source === soloMenuSource).length === 1 && !soloFallbackStartup.includes(soloRoomSource), 'Green Solo no-DOM startup mora učitati samo 384px menu sliku.');
const soloMenuFromHtml = indexSource.match(/class="green-solo-soft-clay-icon" data-theme-src="([^"]+)"/)?.[1];
onlinePlayersMenuFixture = { querySelectorAll: () => [{ dataset: { themeSrc: soloMenuFromHtml } }] };
const soloDomStartup = onlinePlayersLoadingHarness.getThemeStartupSources('dark');
onlinePlayersMenuFixture = null;
assert(soloDomStartup.filter(source => source === soloMenuSource).length === 1 && !soloDomStartup.includes(soloRoomSource), 'Green Solo DOM startup mora učitati samo 384px menu sliku.');
const soloActualRoomSources = onlinePlayersLoadingHarness.getThemeRoomSources('dark', 'solo');
const soloExpectedRoomSources = [soloRoomSource, 'assets/green-soft-clay/canonical/solo-results/personal-best-v1.png?v=1', 'assets/green-soft-clay/canonical/solo-results/finish-score-mark-v1.png?v=1', 'assets/green-soft-clay/solo/finish-reward-video-v3.png?v=1', 'assets/green-soft-clay/canonical/solo-results/finish-claim-v1.png?v=1'];
assert(JSON.stringify([...soloActualRoomSources].sort()) === JSON.stringify(soloExpectedRoomSources.sort()) && !soloActualRoomSources.includes(soloMenuSource), 'Green Solo sobni paket mora imati room znak i četiri izdvojena rezultatska/nagradna asseta, bez menu slike.');
for (const theme of ['easter', 'desert', 'severna']) assert(onlinePlayersLoadingHarness.getThemeStartupSources(theme).every(source => !source.includes('green-soft-clay')) && onlinePlayersLoadingHarness.getThemeRoomSources(theme, 'solo').every(source => !source.includes('green-soft-clay')), `Green Solo identitet curi u drugu temu: ${theme}`);
const soloRoomAuditInfo = readPngInfo(path.join(root, 'docs', 'green-asset-standardization-solo-room-identity-audit.png'));
assert(soloRoomAuditInfo.width === 1480 && soloRoomAuditInfo.height === 1398 && soloRoomAuditInfo.colorType === 6, 'Green Solo Room završna audit tabla nedostaje ili je nepotpuna.');
// Hotseat Room Identity step 4: lock the approved derivatives after final visual,
// semantic, startup/room-isolation, winner/draw and protected-family checks.
const hotseatRoomIdentity = greenHotseatRoomIdentityManifest;
const hotseatRoomIdentityRegistry = greenAssetRegistry.families?.hotseatRoomIdentity;
assert(hotseatRoomIdentity.status === 'locked' && hotseatRoomIdentityRegistry?.status === 'locked', 'Green Hotseat Room Identity mora biti zaključan u source i centralnom registru.');
assert(JSON.stringify(hotseatRoomIdentityRegistry.identity) === JSON.stringify(hotseatRoomIdentity.identity), 'Green Hotseat Room Identity DNK odstupa između source manifesta i centralnog registra.');
assert(hotseatRoomIdentity.identity?.material === 'matte 3D Soft Clay Neumorphism' && hotseatRoomIdentity.identity?.mapping === 'one immutable Hotseat entry identity with room and menu delivery variants' && hotseatRoomIdentity.identity?.presentation.includes('two equal freestanding clay player figures'), 'Green Hotseat Room Identity DNK ili pravilo jednog znaka odstupa.');
const hotseatRoomExpectedHashes = {
    master: 'ea4c3634a38bb596c9fb27541cb3a7c8f33e0514a3f279c00daa4128f30729bd',
    room: 'f1f006758f2b8fffde82401d6f89a4fc8ce3a72749114c1ad4833c3390954021',
    menu: 'de933f7fe0b272d177f4cd4521dc859af2045eed8ce879f3084055f3500ad0fc'
};
const hotseatRoomMaster = path.join(path.dirname(greenHotseatRoomIdentityManifestPath), hotseatRoomIdentity.master.path);
const hotseatRoomApprovedSource = path.join(root, hotseatRoomIdentity.master.approvedSource);
const hotseatRoomMasterInfo = readPngInfo(hotseatRoomMaster);
assert(hotseatRoomMasterInfo.width === 1254 && hotseatRoomMasterInfo.height === 1254 && hotseatRoomMasterInfo.colorType === 6 && hotseatRoomIdentity.master.bytes === 741942 && fs.statSync(hotseatRoomMaster).size === 741942 && hotseatRoomIdentity.master.sha256 === hotseatRoomExpectedHashes.master && hotseatRoomIdentity.master.approvedSourceSha256 === hotseatRoomExpectedHashes.master && sha256File(hotseatRoomMaster) === hotseatRoomExpectedHashes.master && sha256File(hotseatRoomApprovedSource) === hotseatRoomExpectedHashes.master, 'Green Hotseat Room master nije bajt-po-bajt odobreni izvor.');
assert(JSON.stringify(hotseatRoomIdentity.variants.map(asset => asset.id)) === '["room","menu"]', 'Green Hotseat Room Identity mora imati samo room i menu isporuke.');
const hotseatRoomConsumerSources = [indexSource, gameSource, rulesSource, themeCssSource];
for (const variant of hotseatRoomIdentity.variants) {
    const runtime = path.join(root, variant.runtime);
    const activeRuntime = path.join(root, variant.activeRuntime);
    const size = variant.id === 'room' ? 512 : 384;
    const bytes = variant.id === 'room' ? 120269 : 74765;
    const info = readPngInfo(runtime);
    assert(JSON.stringify(variant.runtimeSize) === JSON.stringify([size, size]) && info.width === size && info.height === size && info.colorType === 6 && variant.runtimeBytes === bytes && fs.statSync(runtime).size === bytes, `Green Hotseat Room canonical ${variant.id} dimenzija/alpha odstupa.`);
    assert(variant.runtimeSha256 === hotseatRoomExpectedHashes[variant.id] && variant.activeRuntimeSha256 === hotseatRoomExpectedHashes[variant.id] && sha256File(runtime) === hotseatRoomExpectedHashes[variant.id] && !fs.existsSync(activeRuntime), `Green Hotseat Room canonical ${variant.id} odstupa ili stara kopija nije uklonjena.`);
    const canonicalPath = variant.runtime.replace(/^www\//, '');
    const activePath = variant.activeRuntime.replace(/^www\//, '');
    const canonicalReferences = hotseatRoomConsumerSources.reduce((count, source) => count + source.split(canonicalPath).length - 1, 0);
    const activeReferences = hotseatRoomConsumerSources.reduce((count, source) => count + source.split(activePath).length - 1, 0);
    const expectedLegacyReferences = variant.id === 'room' ? 2 : 1;
    const expectedCanonicalReferences = 2;
    assert(variant.legacyReferencesBeforeIntegration === expectedLegacyReferences && variant.expectedCanonicalReferences === expectedCanonicalReferences && canonicalReferences === expectedCanonicalReferences && activeReferences === 0, `Green Hotseat Room ${variant.id} UI veze nisu prebačene na canonical bez legacy referenci.`);
    const registered = hotseatRoomIdentityRegistry.canonicalRuntime.find(asset => asset.role === variant.id);
    assert(registered?.path === canonicalPath && registered?.size === size && registered?.sha256 === variant.runtimeSha256, `Green Hotseat Room registrovana ${variant.id} isporuka odstupa.`);
}
assert(hotseatRoomIdentity.protectedFamilies.length === 4 && hotseatRoomIdentity.protectedFamilies.every(family => JSON.parse(fs.readFileSync(path.join(root, family.sourceManifest), 'utf8')).status === 'locked'), 'Green Hotseat Room mora sačuvati zaključane Winner, Solo, H2H i Online Players porodice.');
assert(hotseatRoomIdentityRegistry.canonicalRuntime.length === 2 && hotseatRoomIdentityRegistry.compositeRuntime.length === 0 && JSON.stringify(hotseatRoomIdentityRegistry.semanticExclusions) === JSON.stringify(hotseatRoomIdentity.semanticExclusions), 'Green Hotseat Room registar mora imati dve isporuke i iste semantičke granice.');
assert(JSON.stringify(hotseatRoomIdentityRegistry.forbiddenRuntimePaths) === JSON.stringify(['assets/green-soft-clay/mode-hotseat-free-v2.png', 'assets/green-soft-clay/runtime/menu/mode-hotseat-free-v2.png']), 'Green Hotseat Room registar mora zabraniti obe stare runtime putanje.');
assert(hotseatRoomIdentity.integration?.centralRegistry === 'standardized in standardization step 3' && hotseatRoomIdentity.integration?.cacheVersion === 57 && greenThemeManifest.version === 63 && hotseatRoomIdentity.integration?.legacyRuntime === 'retired in standardization step 3' && hotseatRoomIdentity.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Hotseat Room mora zadržati istorijsku cache verziju 57 dok je tema na verziji 63.');
const hotseatRoomSource = 'assets/green-soft-clay/canonical/hotseat-room-identity/hotseat-room-v1.png?v=1';
const hotseatMenuSource = 'assets/green-soft-clay/canonical/hotseat-room-identity/hotseat-room-menu-v1.png?v=1';
assert(indexSource.includes(`class="green-hotseat-soft-clay-icon" data-theme-src="${hotseatMenuSource}"`) && gameSource.includes(`greenIcon: '${hotseatRoomSource}'`) && gameSource.includes(`'${hotseatRoomSource}'`), 'Green Hotseat menu, intro ili sobni katalog nisu povezani sa canonical isporukama.');
assert(/#main-menu \.green-solo-soft-clay-icon,[^{]+\{[^}]*width:\s*68px !important;[^}]*height:\s*68px !important;/s.test(themeCssSource) && /\.easter-room-intro-mark-wrap\s*\{[^}]*width:\s*clamp\(210px, 34vmin, 290px\);[^}]*height:\s*clamp\(210px, 34vmin, 290px\);/s.test(themeCssSource) && themeCssSource.includes('animation: greenRoomIconPulse 1.8s ease-in-out infinite;'), 'Green Hotseat menu mera ili intro motion je promenjen.');
assert(/#game-over-screen\.is-hotseat-result\.has-result-winner \.green-hotseat-winner-mark\s*\{[^}]*width:\s*58px;[^}]*height:\s*58px;/s.test(themeCssSource) && themeCssSource.includes('#game-over-screen.is-hotseat-result.screen.active .green-hotseat-winner-mark') && themeCssSource.includes('animation: easterSoloFinishReveal .48s'), 'Green Hotseat Winner prikaz ili motion je promenjen.');
assert(gameSource.includes("gameOverScreen.classList.toggle('has-result-winner', isHotseatResult && !isDraw);") && /@media \(prefers-reduced-motion: reduce\)[\s\S]*?#game-over-screen\.is-hotseat-result\.screen\.active \.green-hotseat-winner-mark\s*\{[^}]*animation:\s*none !important;/s.test(themeCssSource), 'Green Hotseat remi ili reduced-motion zaštita više nisu očuvani.');
const hotseatFallbackStartup = onlinePlayersLoadingHarness.getThemeStartupSources('dark');
assert(hotseatFallbackStartup.filter(source => source === hotseatMenuSource).length === 1 && !hotseatFallbackStartup.includes(hotseatRoomSource), 'Green Hotseat no-DOM startup mora učitati samo 384px menu sliku.');
const hotseatMenuFromHtml = indexSource.match(/class="green-hotseat-soft-clay-icon" data-theme-src="([^"]+)"/)?.[1];
onlinePlayersMenuFixture = { querySelectorAll: () => [{ dataset: { themeSrc: hotseatMenuFromHtml } }] };
const hotseatDomStartup = onlinePlayersLoadingHarness.getThemeStartupSources('dark');
onlinePlayersMenuFixture = null;
assert(hotseatDomStartup.filter(source => source === hotseatMenuSource).length === 1 && !hotseatDomStartup.includes(hotseatRoomSource), 'Green Hotseat DOM startup mora učitati samo 384px menu sliku.');
const hotseatActualRoomSources = onlinePlayersLoadingHarness.getThemeRoomSources('dark', 'hotseat');
const hotseatExpectedRoomSources = [hotseatRoomSource, 'assets/green-soft-clay/canonical/hotseat-winner/hotseat-winner-v1.png?v=1'];
assert(JSON.stringify([...hotseatActualRoomSources].sort()) === JSON.stringify(hotseatExpectedRoomSources.sort()) && !hotseatActualRoomSources.includes(hotseatMenuSource), 'Green Hotseat sobni paket mora imati room znak i odvojeni Winner, bez menu slike.');
for (const theme of ['easter', 'desert', 'severna']) assert(onlinePlayersLoadingHarness.getThemeStartupSources(theme).every(source => !source.includes('green-soft-clay')) && onlinePlayersLoadingHarness.getThemeRoomSources(theme, 'hotseat').every(source => !source.includes('green-soft-clay')), `Green Hotseat identitet curi u drugu temu: ${theme}`);
const hotseatRoomAuditInfo = readPngInfo(path.join(root, 'docs', 'green-asset-standardization-hotseat-room-identity-audit.png'));
assert(hotseatRoomAuditInfo.width === 1480 && hotseatRoomAuditInfo.height === 1398 && hotseatRoomAuditInfo.colorType === 6, 'Green Hotseat Room završna audit tabla nedostaje ili je nepotpuna.');
// Online Random Room Identity step 4: lock one approved room mark after final
// visual, semantic, startup/room-isolation, motion and protected-family checks.
const onlineRandomRoomIdentity = greenOnlineRandomRoomIdentityManifest;
const onlineRandomRoomIdentityRegistry = greenAssetRegistry.families?.onlineRandomRoomIdentity;
assert(onlineRandomRoomIdentity.status === 'locked' && onlineRandomRoomIdentityRegistry?.status === 'locked', 'Green Online Random Room mora biti zaključan u source i centralnom registru.');
assert(JSON.stringify(onlineRandomRoomIdentityRegistry.identity) === JSON.stringify(onlineRandomRoomIdentity.identity), 'Green Online Random Room DNK odstupa između source manifesta i centralnog registra.');
assert(onlineRandomRoomIdentity.identity?.material === 'matte 3D Soft Clay Neumorphism' && onlineRandomRoomIdentity.identity?.mapping === 'one immutable Online Random entry identity with room and menu delivery variants' && onlineRandomRoomIdentity.identity?.presentation.includes('without a backing tile'), 'Green Online Random Room DNK ili pravilo jednog znaka odstupa.');
const onlineRandomRoomExpectedHashes = {
    master: 'a21b7126b79b31ae7bad4463d78f6e31c2788bded62065f91fc363d940c7541d',
    room: '4a35ca20523d6ed8929f4179767841eee53dd1d15665078cf7e175a957a5820a',
    menu: 'a1593092e3f0634f2f07d824b9fc3173eb654f9f30690e3d20fbdf33a27aceb4'
};
const onlineRandomRoomMaster = path.join(path.dirname(greenOnlineRandomRoomIdentityManifestPath), onlineRandomRoomIdentity.master.path);
const onlineRandomRoomApprovedSource = path.join(root, onlineRandomRoomIdentity.master.approvedSource);
const onlineRandomRoomMasterInfo = readPngInfo(onlineRandomRoomMaster);
assert(onlineRandomRoomMasterInfo.width === 1254 && onlineRandomRoomMasterInfo.height === 1254 && onlineRandomRoomMasterInfo.colorType === 6 && onlineRandomRoomIdentity.master.bytes === 767104 && fs.statSync(onlineRandomRoomMaster).size === 767104 && onlineRandomRoomIdentity.master.sha256 === onlineRandomRoomExpectedHashes.master && onlineRandomRoomIdentity.master.approvedSourceSha256 === onlineRandomRoomExpectedHashes.master && sha256File(onlineRandomRoomMaster) === onlineRandomRoomExpectedHashes.master && sha256File(onlineRandomRoomApprovedSource) === onlineRandomRoomExpectedHashes.master, 'Green Online Random Room master nije bajt-po-bajt odobreni izvor.');
assert(JSON.stringify(onlineRandomRoomIdentity.variants.map(asset => asset.id)) === '["room","menu"]', 'Green Online Random Room mora imati samo room i menu isporuke.');
const onlineRandomRoomConsumerSources = [indexSource, gameSource, rulesSource, themeCssSource];
for (const variant of onlineRandomRoomIdentity.variants) {
    const runtime = path.join(root, variant.runtime);
    const activeRuntime = path.join(root, variant.activeRuntime);
    const size = variant.id === 'room' ? 512 : 384;
    const bytes = variant.id === 'room' ? 135692 : 83367;
    const info = readPngInfo(runtime);
    assert(JSON.stringify(variant.runtimeSize) === JSON.stringify([size, size]) && info.width === size && info.height === size && info.colorType === 6 && variant.runtimeBytes === bytes && fs.statSync(runtime).size === bytes, `Green Online Random Room canonical ${variant.id} dimenzija/alpha odstupa.`);
    assert(variant.runtimeSha256 === onlineRandomRoomExpectedHashes[variant.id] && variant.activeRuntimeSha256 === onlineRandomRoomExpectedHashes[variant.id] && sha256File(runtime) === onlineRandomRoomExpectedHashes[variant.id] && !fs.existsSync(activeRuntime), `Green Online Random Room canonical ${variant.id} odstupa ili stara kopija nije uklonjena.`);
    const canonicalPath = variant.runtime.replace(/^www\//, '');
    const activePath = variant.activeRuntime.replace(/^www\//, '');
    const canonicalReferences = onlineRandomRoomConsumerSources.reduce((count, source) => count + source.split(canonicalPath).length - 1, 0);
    const activeReferences = onlineRandomRoomConsumerSources.reduce((count, source) => count + source.split(activePath).length - 1, 0);
    const expectedLegacyReferences = variant.id === 'room' ? 4 : 1;
    const expectedCanonicalReferences = variant.id === 'room' ? 4 : 2;
    assert(variant.legacyReferencesBeforeIntegration === expectedLegacyReferences && variant.expectedCanonicalReferences === expectedCanonicalReferences && canonicalReferences === expectedCanonicalReferences && activeReferences === 0, `Green Online Random Room ${variant.id} UI veze nisu prebačene na canonical bez legacy referenci.`);
    const registered = onlineRandomRoomIdentityRegistry.canonicalRuntime.find(asset => asset.role === variant.id);
    assert(registered?.path === canonicalPath && registered?.size === size && registered?.sha256 === variant.runtimeSha256, `Green Online Random Room registrovana ${variant.id} isporuka odstupa.`);
}
assert(onlineRandomRoomIdentity.functionalStates.length === 5 && onlineRandomRoomIdentity.functionalStates.every(asset => {
    const runtime = path.join(root, asset.runtime);
    const info = readPngInfo(runtime);
    return info.width === 384 && info.height === 384 && info.colorType === 6 && sha256File(runtime) === asset.sha256;
}), 'Green Online Random funkcionalna stanja moraju ostati pet zasebnih, nepromenjenih 384px identiteta.');
assert(onlineRandomRoomIdentity.sharedActions.length === 1 && onlineRandomRoomIdentity.sharedActions[0].role === 'spectate online match' && sha256File(path.join(root, onlineRandomRoomIdentity.sharedActions[0].runtime)) === onlineRandomRoomIdentity.sharedActions[0].sha256, 'Green Online Random shared spectate akcija mora ostati izdvojena i nepromenjena.');
assert(onlineRandomRoomIdentity.protectedFamilies.length === 4 && onlineRandomRoomIdentity.protectedFamilies.every(family => JSON.parse(fs.readFileSync(path.join(root, family.sourceManifest), 'utf8')).status === 'locked'), 'Green Online Random Room mora sačuvati zaključane Hotseat, Online Players, H2H i Solo porodice.');
assert(onlineRandomRoomIdentityRegistry.canonicalRuntime.length === 2 && onlineRandomRoomIdentityRegistry.compositeRuntime.length === 0 && JSON.stringify(onlineRandomRoomIdentityRegistry.semanticExclusions) === JSON.stringify(onlineRandomRoomIdentity.semanticExclusions), 'Green Online Random Room registar mora imati dve isporuke i iste semantičke granice.');
assert(JSON.stringify(onlineRandomRoomIdentityRegistry.forbiddenRuntimePaths) === JSON.stringify(['assets/green-soft-clay/mode-opponent-free-v2.png', 'assets/green-soft-clay/runtime/menu/mode-opponent-free-v2.png']), 'Green Online Random Room registar mora zabraniti obe stare runtime putanje.');
assert(onlineRandomRoomIdentity.integration?.mainMenu === 'connected' && onlineRandomRoomIdentity.integration?.centralRegistry === 'standardized in standardization step 3' && onlineRandomRoomIdentity.integration?.legacyRuntime === 'retired in standardization step 3' && onlineRandomRoomIdentity.integration?.cacheVersion === 58 && greenThemeManifest.version === 63 && onlineRandomRoomIdentity.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Online Random Room mora zadržati istorijsku cache verziju 58 dok je tema na verziji 63.');
const onlineRandomRoomSource = 'assets/green-soft-clay/canonical/online-random-room-identity/online-random-room-v1.png?v=1';
const onlineRandomMenuSource = 'assets/green-soft-clay/canonical/online-random-room-identity/online-random-room-menu-v1.png?v=1';
assert(indexSource.includes(`class="green-opponent-soft-clay-icon" data-theme-src="${onlineRandomMenuSource}"`) && indexSource.includes(`class="green-opponent-header-icon" data-theme-src="${onlineRandomRoomSource}"`) && gameSource.includes(`greenIcon: '${onlineRandomRoomSource}'`) && gameSource.includes(`'${onlineRandomRoomSource}'`) && rulesSource.includes(`'assets/easter-soft-clay/mode-opponent-pro-v2.png': '${onlineRandomRoomSource}'`), 'Green Online Random menu, intro, header, Pravila ili sobni katalog nisu povezani sa canonical isporukama.');
assert(themeCssSource.includes('#main-menu .green-opponent-soft-clay-icon') && themeCssSource.includes('width: 68px !important;') && themeCssSource.includes('width: 60px !important;') && /#waiting-screen\.is-random-online \.green-opponent-header-icon\s*\{[^}]*width:\s*34px;[^}]*height:\s*34px;/s.test(themeCssSource), 'Green Online Random menu ili header mera je promenjena.');
assert(themeCssSource.includes('animation: greenRoomIconPulse 1.8s ease-in-out infinite;') && themeCssSource.includes('animation: greenOpponentRadar 1.65s ease-in-out infinite;') && themeCssSource.includes('animation: greenOpponentFoundPop .55s') && /@media \(prefers-reduced-motion: reduce\)[\s\S]*?#waiting-screen\.is-random-online \.green-opponent-scan-icon,[\s\S]*?animation:\s*none !important;/s.test(themeCssSource), 'Green Online Random intro, matchmaking motion ili reduced-motion zaštita je promenjena.');
assert(/#waiting-screen\.is-random-online \.green-opponent-scan-icon\s*\{[^}]*width:\s*54px;[^}]*height:\s*54px;/s.test(themeCssSource) && /#waiting-screen\.is-random-online \.green-opponent-vs-icon\s*\{[^}]*width:\s*42px;[^}]*height:\s*42px;/s.test(themeCssSource) && /#waiting-screen\.is-random-online \.green-opponent-found-icon\s*\{[^}]*width:\s*36px;[^}]*height:\s*36px;/s.test(themeCssSource) && /\.random-online-duel-room\.opponent-reconnecting \.green-opponent-connection-icon\s*\{[^}]*width:\s*27px;[^}]*height:\s*27px;/s.test(themeCssSource), 'Green Online Random funkcionalne display mere su promenjene.');
assert(rulesSource.split("assets/easter-soft-clay/mode-opponent-pro-v2.png?v=2").length - 1 === 4 && gameSource.includes('}, 3650);') && gameSource.includes('}, 4600);'), 'Green Online Random SR/EN Rules pokrivenost ili intro tajming je promenjen.');
const onlineRandomLoadingPack = onlinePlayersLoadingHarness.getThemeLoadingPack('dark');
assert(onlineRandomLoadingPack.menuAssets.includes(onlineRandomMenuSource) && onlineRandomLoadingPack.menuAssets.length === 5 && !onlineRandomLoadingPack.assets.includes(onlineRandomMenuSource), 'Online Random menu fallback mora ostati odvojen od sobnog pack.assets kataloga uz Invite Friend menu isporuku.');
const onlineRandomFallbackStartup = onlinePlayersLoadingHarness.getThemeStartupSources('dark');
assert(onlineRandomFallbackStartup.filter(source => source === onlineRandomMenuSource).length === 1 && !onlineRandomFallbackStartup.includes(onlineRandomRoomSource), 'Green Online Random no-DOM startup mora učitati samo 384px menu sliku.');
const onlineRandomMenuFromHtml = indexSource.match(/class="green-opponent-soft-clay-icon" data-theme-src="([^"]+)"/)?.[1];
onlinePlayersMenuFixture = { querySelectorAll: () => [{ dataset: { themeSrc: onlineRandomMenuFromHtml } }] };
const onlineRandomDomStartup = onlinePlayersLoadingHarness.getThemeStartupSources('dark');
onlinePlayersMenuFixture = null;
assert(onlineRandomDomStartup.filter(source => source === onlineRandomMenuSource).length === 1 && !onlineRandomDomStartup.includes(onlineRandomRoomSource), 'Green Online Random DOM startup mora učitati samo 384px menu sliku.');
const onlineRandomActualRoomSources = onlinePlayersLoadingHarness.getThemeRoomSources('dark', 'onlineRandom');
const onlineRandomExpectedRoomSources = [onlineRandomRoomSource, 'assets/green-soft-clay/opponent/scanning-v1.png?v=opt2', 'assets/green-soft-clay/opponent/found-v1.png?v=opt2', 'assets/green-soft-clay/opponent/vs-v1.png?v=opt2', 'assets/green-soft-clay/opponent/disconnected-v1.png?v=opt2', 'assets/green-soft-clay/opponent/reconnected-v1.png?v=opt2'];
assert(JSON.stringify([...onlineRandomActualRoomSources].sort()) === JSON.stringify(onlineRandomExpectedRoomSources.sort()) && !onlineRandomActualRoomSources.includes(onlineRandomMenuSource) && onlineRandomActualRoomSources.every(source => !source.includes('online-spectate')), 'Green Online Random sobni paket mora imati room znak i pet izdvojenih funkcionalnih stanja, bez menu i spectate slike.');
for (const theme of ['easter', 'desert', 'severna']) assert(onlinePlayersLoadingHarness.getThemeStartupSources(theme).every(source => !source.includes('green-soft-clay')) && onlinePlayersLoadingHarness.getThemeRoomSources(theme, 'onlineRandom').every(source => !source.includes('green-soft-clay')), `Green Online Random identitet curi u drugu temu: ${theme}`);
const onlineRandomRoomAuditInfo = readPngInfo(path.join(root, 'docs', 'green-asset-standardization-online-random-room-identity-audit.png'));
assert(onlineRandomRoomAuditInfo.width === 1480 && onlineRandomRoomAuditInfo.height === 1398 && onlineRandomRoomAuditInfo.colorType === 6, 'Green Online Random Room Korak 1 audit tabla nedostaje ili je nepotpuna.');
// Invite Friend Room Identity step 4: lock one approved linked-clay mark after
// final visual, semantic, startup/room-isolation, motion and protected-family checks.
const inviteFriendRoomIdentity = greenInviteFriendRoomIdentityManifest;
const inviteFriendRoomIdentityRegistry = greenAssetRegistry.families?.inviteFriendRoomIdentity;
assert(inviteFriendRoomIdentity.status === 'locked' && inviteFriendRoomIdentityRegistry?.status === 'locked', 'Green Invite Friend Room mora biti zaključan u source i centralnom registru.');
assert(JSON.stringify(inviteFriendRoomIdentityRegistry.identity) === JSON.stringify(inviteFriendRoomIdentity.identity), 'Green Invite Friend Room DNK odstupa između source manifesta i centralnog registra.');
assert(inviteFriendRoomIdentity.identity?.material === 'matte 3D Soft Clay Neumorphism' && inviteFriendRoomIdentity.identity?.mapping === 'one immutable Invite Friend entry identity with room and menu delivery variants' && inviteFriendRoomIdentity.identity?.presentation.includes('without a backing tile'), 'Green Invite Friend Room DNK ili pravilo jednog znaka odstupa.');
const inviteFriendRoomExpectedHashes = {
    master: '5a59eccad3f26779dbe2e8388f51916681e285cffd31b7f904231ffb3872a183',
    room: '30894f35a73c1ae1e1ca27267c2342e7c2aac46753c3d8ccffcc5bfaaa0dd356',
    menu: 'ae634e3928fef02d57d8dc13f5415ff5de76e1451575a92a155319fd1c5b77e4'
};
const inviteFriendRoomMaster = path.join(path.dirname(greenInviteFriendRoomIdentityManifestPath), inviteFriendRoomIdentity.master.path);
const inviteFriendRoomApprovedSource = path.join(root, inviteFriendRoomIdentity.master.approvedSource);
const inviteFriendRoomMasterInfo = readPngInfo(inviteFriendRoomMaster);
assert(inviteFriendRoomMasterInfo.width === 1254 && inviteFriendRoomMasterInfo.height === 1254 && inviteFriendRoomMasterInfo.colorType === 6 && inviteFriendRoomIdentity.master.bytes === 930755 && fs.statSync(inviteFriendRoomMaster).size === 930755 && inviteFriendRoomIdentity.master.sha256 === inviteFriendRoomExpectedHashes.master && inviteFriendRoomIdentity.master.approvedSourceSha256 === inviteFriendRoomExpectedHashes.master && sha256File(inviteFriendRoomMaster) === inviteFriendRoomExpectedHashes.master && sha256File(inviteFriendRoomApprovedSource) === inviteFriendRoomExpectedHashes.master, 'Green Invite Friend Room master nije bajt-po-bajt odobreni izvor.');
assert(JSON.stringify(inviteFriendRoomIdentity.variants.map(asset => asset.id)) === '["room","menu"]', 'Green Invite Friend Room mora imati samo room i menu isporuke.');
const inviteFriendRoomConsumerSources = [indexSource, gameSource, rulesSource, themeCssSource];
for (const variant of inviteFriendRoomIdentity.variants) {
    const runtime = path.join(root, variant.runtime);
    const activeRuntime = path.join(root, variant.activeRuntime);
    const size = variant.id === 'room' ? 512 : 384;
    const bytes = variant.id === 'room' ? 150862 : 92386;
    const info = readPngInfo(runtime);
    assert(JSON.stringify(variant.runtimeSize) === JSON.stringify([size, size]) && info.width === size && info.height === size && info.colorType === 6 && variant.runtimeBytes === bytes && fs.statSync(runtime).size === bytes, `Green Invite Friend Room canonical ${variant.id} dimenzija/alpha odstupa.`);
    assert(variant.runtimeSha256 === inviteFriendRoomExpectedHashes[variant.id] && variant.activeRuntimeSha256 === inviteFriendRoomExpectedHashes[variant.id] && sha256File(runtime) === inviteFriendRoomExpectedHashes[variant.id] && !fs.existsSync(activeRuntime), `Green Invite Friend Room canonical ${variant.id} odstupa ili stara kopija nije uklonjena.`);
    const canonicalPath = variant.runtime.replace(/^www\//, '');
    const activePath = variant.activeRuntime.replace(/^www\//, '');
    const canonicalReferences = inviteFriendRoomConsumerSources.reduce((count, source) => count + source.split(canonicalPath).length - 1, 0);
    const activeReferences = inviteFriendRoomConsumerSources.reduce((count, source) => count + source.split(activePath).length - 1, 0);
    const expectedLegacyReferences = variant.id === 'room' ? 4 : 1;
    const expectedCanonicalReferences = variant.id === 'room' ? 4 : 2;
    assert(variant.legacyReferencesBeforeIntegration === expectedLegacyReferences && variant.expectedCanonicalReferences === expectedCanonicalReferences && canonicalReferences === expectedCanonicalReferences && activeReferences === 0, `Green Invite Friend Room ${variant.id} UI veze nisu prebačene na canonical bez legacy referenci.`);
    const registered = inviteFriendRoomIdentityRegistry.canonicalRuntime.find(asset => asset.role === variant.id);
    assert(registered?.path === canonicalPath && registered?.size === size && registered?.sha256 === variant.runtimeSha256, `Green Invite Friend Room registrovana ${variant.id} isporuka odstupa.`);
}
assert(inviteFriendRoomIdentity.functionalStates.length === 4 && inviteFriendRoomIdentity.functionalStates.every(asset => {
    const runtime = path.join(root, asset.runtime);
    const info = readPngInfo(runtime);
    return info.width === 384 && info.height === 384 && info.colorType === 6 && sha256File(runtime) === asset.sha256;
}), 'Green Invite Friend funkcionalna stanja moraju ostati četiri zasebna, nepromenjena 384px identiteta.');
assert(inviteFriendRoomIdentity.sharedActions.length === 1 && inviteFriendRoomIdentity.sharedActions[0].role === 'add or search friend' && sha256File(path.join(root, inviteFriendRoomIdentity.sharedActions[0].runtime)) === inviteFriendRoomIdentity.sharedActions[0].sha256, 'Green Invite Friend shared add-friend akcija mora ostati izdvojena i nepromenjena.');
assert(inviteFriendRoomIdentity.protectedFamilies.length === 4 && inviteFriendRoomIdentity.protectedFamilies.every(family => JSON.parse(fs.readFileSync(path.join(root, family.sourceManifest), 'utf8')).status === 'locked'), 'Green Invite Friend Room mora sačuvati zaključane H2H, Online Players, Online Random i Hotseat porodice.');
assert(inviteFriendRoomIdentityRegistry.canonicalRuntime.length === 2 && inviteFriendRoomIdentityRegistry.compositeRuntime.length === 0 && JSON.stringify(inviteFriendRoomIdentityRegistry.semanticExclusions) === JSON.stringify(inviteFriendRoomIdentity.semanticExclusions), 'Green Invite Friend Room registar mora imati dve isporuke i iste semantičke granice.');
assert(JSON.stringify(inviteFriendRoomIdentityRegistry.forbiddenRuntimePaths) === JSON.stringify(['assets/green-soft-clay/mode-invite-free-v2.png', 'assets/green-soft-clay/runtime/menu/mode-invite-free-v2.png']), 'Green Invite Friend Room registar mora zabraniti obe stare runtime putanje.');
assert(inviteFriendRoomIdentity.integration?.mainMenu === 'connected' && inviteFriendRoomIdentity.integration?.roomIntro === 'connected' && inviteFriendRoomIdentity.integration?.waitingRoomHeader === 'connected' && inviteFriendRoomIdentity.integration?.rulesReferences === 'connected' && inviteFriendRoomIdentity.integration?.centralRegistry === 'standardized in standardization step 3' && inviteFriendRoomIdentity.integration?.legacyRuntime === 'retired in standardization step 3' && inviteFriendRoomIdentity.integration?.cacheVersion === 59 && greenThemeManifest.version === 63 && inviteFriendRoomIdentity.integration?.finalAudit === 'locked by www/themes/green/asset-registry.json and scripts/check-theme-performance.js', 'Green Invite Friend Room mora zadržati istorijsku cache verziju 59 dok je tema na verziji 63.');
const inviteFriendRoomSource = 'assets/green-soft-clay/canonical/invite-friend-room-identity/invite-friend-room-v1.png?v=1';
const inviteFriendMenuSource = 'assets/green-soft-clay/canonical/invite-friend-room-identity/invite-friend-room-menu-v1.png?v=1';
assert(indexSource.includes(`class="green-invite-soft-clay-icon" data-theme-src="${inviteFriendMenuSource}"`) && indexSource.includes(`class="green-invite-header-icon" data-theme-src="${inviteFriendRoomSource}"`) && gameSource.includes(`greenIcon: '${inviteFriendRoomSource}'`) && gameSource.includes(`'${inviteFriendRoomSource}'`) && rulesSource.includes(`'assets/easter-soft-clay/mode-invite-pro-v2.png': '${inviteFriendRoomSource}'`), 'Green Invite Friend menu, intro, header, Pravila ili sobni katalog nisu povezani sa canonical isporukama.');
assert(themeCssSource.includes('#main-menu .green-invite-soft-clay-icon') && themeCssSource.includes('width: 68px !important;') && themeCssSource.includes('width: 60px !important;') && /#waiting-screen\.is-hosting-invite \.green-invite-header-icon\s*\{[^}]*width:\s*34px;[^}]*height:\s*34px;/s.test(themeCssSource), 'Green Invite Friend menu ili header mera je promenjena.');
assert(themeCssSource.includes('animation: greenRoomIconPulse 1.8s ease-in-out infinite;') && themeCssSource.includes('animation: greenInviteSoftBreath 2.1s ease-in-out infinite;') && themeCssSource.includes('animation: easterPanelLift .44s') && /@media \(prefers-reduced-motion: reduce\)[\s\S]*?#waiting-screen\.is-hosting-invite \.green-invite-add-icon,[\s\S]*?animation:\s*none !important;/s.test(themeCssSource), 'Green Invite Friend intro, panel, add-friend motion ili reduced-motion zaštita je promenjena.');
assert(/#waiting-screen\.is-hosting-invite \.green-invite-add-icon\s*\{[^}]*width:\s*52px;[^}]*height:\s*52px;/s.test(themeCssSource) && /#waiting-screen\.is-hosting-invite \.green-invite-empty-icon\s*\{[^}]*width:\s*64px;[^}]*height:\s*64px;/s.test(themeCssSource) && /#waiting-screen\.is-hosting-invite \.green-invite-send-icon\s*\{[^}]*width:\s*18px;[^}]*height:\s*18px;/s.test(themeCssSource) && /\.custom-toast\.invite-sent-toast \.custom-toast-soft-clay-icon,[\s\S]*?width:\s*52px;[\s\S]*?height:\s*52px;/s.test(themeCssSource), 'Green Invite Friend funkcionalne display mere su promenjene.');
assert(rulesSource.split('assets/easter-soft-clay/mode-invite-pro-v2.png?v=1').length - 1 === 2 && gameSource.includes('}, 3650);') && gameSource.includes('}, 4600);'), 'Green Invite Friend SR/EN Rules pokrivenost ili intro tajming je promenjen.');
const inviteFriendLoadingPack = onlinePlayersLoadingHarness.getThemeLoadingPack('dark');
assert(inviteFriendLoadingPack.menuAssets.includes(inviteFriendMenuSource) && inviteFriendLoadingPack.menuAssets.length === 5 && !inviteFriendLoadingPack.assets.includes(inviteFriendMenuSource), 'Invite Friend menu fallback mora ostati odvojen od sobnog pack.assets kataloga.');
const inviteFriendFallbackStartup = onlinePlayersLoadingHarness.getThemeStartupSources('dark');
assert(inviteFriendFallbackStartup.filter(source => source === inviteFriendMenuSource).length === 1 && !inviteFriendFallbackStartup.includes(inviteFriendRoomSource), 'Green Invite Friend no-DOM startup mora učitati samo 384px menu sliku.');
const inviteFriendMenuFromHtml = indexSource.match(/class="green-invite-soft-clay-icon" data-theme-src="([^"]+)"/)?.[1];
onlinePlayersMenuFixture = { querySelectorAll: () => [{ dataset: { themeSrc: inviteFriendMenuFromHtml } }] };
const inviteFriendDomStartup = onlinePlayersLoadingHarness.getThemeStartupSources('dark');
onlinePlayersMenuFixture = null;
assert(inviteFriendDomStartup.filter(source => source === inviteFriendMenuSource).length === 1 && !inviteFriendDomStartup.includes(inviteFriendRoomSource), 'Green Invite Friend DOM startup mora učitati samo 384px menu sliku.');
const inviteFriendActualRoomSources = onlinePlayersLoadingHarness.getThemeRoomSources('dark', 'invite');
const inviteFriendExpectedRoomSources = [inviteFriendRoomSource, 'assets/green-soft-clay/invite/send-v1.png?v=opt2', 'assets/green-soft-clay/invite/empty-v1.png?v=opt2', 'assets/green-soft-clay/invite/sent-v1.png?v=opt2', 'assets/green-soft-clay/invite/accepted-v1.png?v=opt2'];
assert(JSON.stringify([...inviteFriendActualRoomSources].sort()) === JSON.stringify(inviteFriendExpectedRoomSources.sort()) && !inviteFriendActualRoomSources.includes(inviteFriendMenuSource) && inviteFriendActualRoomSources.every(source => !source.includes('online-add-friend') && !source.includes('h2h/')), 'Green Invite Friend sobni paket mora imati room znak i četiri izdvojena funkcionalna stanja, bez menu, shared add-friend i H2H slike.');
for (const theme of ['easter', 'desert', 'severna']) assert(onlinePlayersLoadingHarness.getThemeStartupSources(theme).every(source => !source.includes('green-soft-clay')) && onlinePlayersLoadingHarness.getThemeRoomSources(theme, 'invite').every(source => !source.includes('green-soft-clay')), `Green Invite Friend identitet curi u drugu temu: ${theme}`);
const inviteFriendRoomAuditInfo = readPngInfo(path.join(root, 'docs', 'green-asset-standardization-invite-friend-room-identity-audit.png'));
assert(inviteFriendRoomAuditInfo.width === 1480 && inviteFriendRoomAuditInfo.height === 1398 && inviteFriendRoomAuditInfo.colorType === 6, 'Green Invite Friend Room Korak 1 audit tabla nedostaje ili je nepotpuna.');
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
assert(indexSource.includes("screen.classList.toggle('has-login', login.style.display !== 'none');")
    && !/splash-legacy-login-logo|splash-welcome-brand|splash-logo-fallback|Logo_green\.png/.test(indexSource)
    && themeLogoCssSource.includes('#splash-screen.has-login > .logo-anim .theme-splash-clay-title-png')
    && themeLogoCssSource.includes('padding: calc(var(--safe-top) + 48px)')
    && themeLogoCssSource.includes('calc(var(--safe-bottom) + 12px)')
    && themeLogoCssSource.includes('overflow-y: auto;'),
    'Svih deset prijava moraju prikazati jedan tematski PNG logo bez starih tekstualnih logotipa.');
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
    'easter-soft-clay': ['assets/theme-backgrounds/easter-v6-1.png', 'assets/theme-packs/easter/splash-title-soft-clay-v1.png'],
    'desert-soft-clay': ['assets/theme-backgrounds/desert-v8-2.png', 'assets/theme-packs/desert/splash-title-soft-clay-v1.png'],
    'green-soft-clay': ['assets/green-clay-balkan-diorama-v4.png', 'assets/green-soft-clay/splash-title-soft-clay-v2.png', 'assets/green-soft-clay/canonical/tournament-awards/champion-trophy-v1.png', 'assets/green-soft-clay/canonical/statistics-room-identity/statistics-room-menu-v1.png', 'assets/green-soft-clay/canonical/leaderboard-room-identity/leaderboard-room-menu-v1.png', 'assets/green-soft-clay/canonical/daily-room-identity/daily-room-menu-v1.png', 'assets/green-soft-clay/canonical/settings-room-identity/settings-room-menu-v1.png', 'assets/green-soft-clay/canonical/rules-room-identity/rules-room-menu-v1.png', 'assets/green-soft-clay/canonical/global-chat-room-identity/global-chat-room-menu-v1.png', 'assets/green-soft-clay/canonical/online-players-room-identity/online-players-room-menu-v1.png', 'assets/green-soft-clay/canonical/quarterly-league-room-identity/quarterly-league-room-menu-v1.png', 'assets/green-soft-clay/canonical/solo-room-identity/solo-room-menu-v1.png', 'assets/green-soft-clay/canonical/hotseat-room-identity/hotseat-room-menu-v1.png', 'assets/green-soft-clay/canonical/online-random-room-identity/online-random-room-menu-v1.png', 'assets/green-soft-clay/canonical/invite-friend-room-identity/invite-friend-room-menu-v1.png']
};
assert(startupConfig['green-soft-clay'].every(relative => !relative.includes('canonical/statistics-overview/')), 'Statistics Overview paket ne sme ući u Green startup preload.');
assert(startupConfig['green-soft-clay'].every(relative => !relative.includes('canonical/h2h-statistics/')), 'H2H Statistics paket ne sme ući u Green startup preload.');
assert(startupConfig['green-soft-clay'].filter(relative => relative.endsWith('canonical/statistics-room-identity/statistics-room-menu-v1.png')).length === 1 && startupConfig['green-soft-clay'].every(relative => !relative.endsWith('canonical/statistics-room-identity/statistics-room-v1.png')), 'Statistics Room Identity startup mora sadržati samo 384 px menu varijantu.');
assert(startupConfig['green-soft-clay'].filter(relative => relative.endsWith('canonical/leaderboard-room-identity/leaderboard-room-menu-v1.png')).length === 1 && startupConfig['green-soft-clay'].every(relative => !relative.endsWith('canonical/leaderboard-room-identity/leaderboard-room-v1.png')), 'Leaderboard Room Identity startup mora sadržati samo 384 px menu varijantu.');
assert(startupConfig['green-soft-clay'].every(relative => !relative.includes('canonical/leaderboard-controls/')) && gameSource.includes("path.startsWith('canonical/leaderboard-controls/')"), 'Green Leaderboard Controls moraju ostati van startup-a i unutar stvarnog room matchera.');
assert(startupConfig['green-soft-clay'].filter(relative => relative.endsWith('canonical/daily-room-identity/daily-room-menu-v1.png')).length === 1 && startupConfig['green-soft-clay'].every(relative => !relative.endsWith('canonical/daily-room-identity/daily-room-v1.png')), 'Daily Room Identity startup mora sadržati samo 384 px menu varijantu.');
assert(startupConfig['green-soft-clay'].filter(relative => relative.endsWith('canonical/settings-room-identity/settings-room-menu-v1.png')).length === 1 && startupConfig['green-soft-clay'].every(relative => !relative.endsWith('canonical/settings-room-identity/settings-room-v1.png')), 'Settings Room Identity startup mora sadržati samo 384 px menu varijantu.');
assert(startupConfig['green-soft-clay'].every(relative => !relative.includes('canonical/settings-controls/')) && gameSource.includes("path.startsWith('canonical/settings-controls/')"), 'Green Settings Controls moraju ostati van startup-a i u stvarnom room matcher-u.');
assert(startupConfig['green-soft-clay'].filter(relative => relative.endsWith('canonical/rules-room-identity/rules-room-menu-v1.png')).length === 1 && startupConfig['green-soft-clay'].every(relative => !relative.endsWith('canonical/rules-room-identity/rules-room-v1.png')), 'Rules Room Identity startup mora sadržati samo 384 px menu varijantu.');
assert(startupConfig['green-soft-clay'].every(relative => !relative.includes('canonical/rules-page-illustrations/')) && gameSource.includes("path.startsWith('canonical/rules-page-illustrations/')"), 'Green Rules Page Illustrations moraju ostati van startup-a i u stvarnom room matcher-u.');
assert(startupConfig['green-soft-clay'].filter(relative => relative.endsWith('canonical/global-chat-room-identity/global-chat-room-menu-v1.png')).length === 1 && startupConfig['green-soft-clay'].every(relative => !relative.endsWith('canonical/global-chat-room-identity/global-chat-room-v1.png')), 'Global Chat Room Identity startup mora sadržati samo 384 px menu varijantu.');
assert(startupConfig['green-soft-clay'].filter(relative => relative.endsWith('canonical/quarterly-league-room-identity/quarterly-league-room-menu-v1.png')).length === 1 && startupConfig['green-soft-clay'].every(relative => !relative.endsWith('canonical/quarterly-league-room-identity/quarterly-league-room-v1.png')), 'Quarterly League Room Identity startup mora sadržati samo 384 px menu watermark.');
assert(startupConfig['green-soft-clay'].filter(relative => relative.endsWith('canonical/solo-room-identity/solo-room-menu-v1.png')).length === 1 && startupConfig['green-soft-clay'].every(relative => !relative.endsWith('canonical/solo-room-identity/solo-room-v1.png')), 'Solo Room Identity startup mora sadržati samo 384 px menu varijantu.');
assert(startupConfig['green-soft-clay'].filter(relative => relative.endsWith('canonical/hotseat-room-identity/hotseat-room-menu-v1.png')).length === 1 && startupConfig['green-soft-clay'].every(relative => !relative.endsWith('canonical/hotseat-room-identity/hotseat-room-v1.png')), 'Hotseat Room Identity startup mora sadržati samo 384 px menu varijantu.');
assert(startupConfig['green-soft-clay'].filter(relative => relative.endsWith('canonical/online-random-room-identity/online-random-room-menu-v1.png')).length === 1 && startupConfig['green-soft-clay'].every(relative => !relative.endsWith('canonical/online-random-room-identity/online-random-room-v1.png')), 'Online Random Room Identity startup mora sadržati samo 384 px menu varijantu.');
assert(startupConfig['green-soft-clay'].filter(relative => relative.endsWith('canonical/invite-friend-room-identity/invite-friend-room-menu-v1.png')).length === 1 && startupConfig['green-soft-clay'].every(relative => !relative.endsWith('canonical/invite-friend-room-identity/invite-friend-room-v1.png')), 'Invite Friend Room Identity startup mora sadržati samo 384 px menu varijantu.');
const roomMatchers = {
    dailyChallenge: relative => relative.startsWith('daily/') || relative.startsWith('daily-challenge') || relative.startsWith('canonical/daily-states/') || relative === 'canonical/daily-room-identity/daily-room-v1.png',
    leaderboard: relative => relative.startsWith('leaderboard/') || relative.startsWith('leaderboard-') || relative.startsWith('canonical/leaderboard-controls/') || relative.startsWith('canonical/competition-medals/general-podium-') || relative === 'canonical/leaderboard-room-identity/leaderboard-room-v1.png',
    statistics: relative => relative.startsWith('statistics/') || relative.startsWith('statistics-') || relative.startsWith('canonical/statistics-overview/') || relative.startsWith('canonical/h2h-statistics/') || relative === 'canonical/statistics-room-identity/statistics-room-v1.png',
    settings: relative => relative.startsWith('settings/') || relative.startsWith('settings-') || relative.startsWith('canonical/settings-controls/') || relative === 'canonical/settings-room-identity/settings-room-v1.png',
    rules: relative => relative.startsWith('rules/') || relative.startsWith('rules-') || relative.startsWith('canonical/rules-page-illustrations/') || relative === 'canonical/rules-room-identity/rules-room-v1.png',
    globalChat: relative => relative.startsWith('global-chat') || relative === 'canonical/global-chat-room-identity/global-chat-room-v1.png',
    onlinePlayers: relative => relative.startsWith('online-players') || relative.startsWith('online-add-') || relative.startsWith('online-spectate') || relative.startsWith('online-duel') || relative === 'canonical/online-players-room-identity/online-players-room-v1.png',
    economy: relative => relative.startsWith('economy/') || relative.startsWith('ducats-undo') || relative.startsWith('canonical/ducat/') || relative.startsWith('canonical/undo-token/') || relative.startsWith('canonical/rewarded-video/'),
    quarterlyLeague: relative => relative.startsWith('ql/') || relative.startsWith('quarterly-league') || relative.startsWith('canonical/competition-medals/quarterly-league-') || relative.startsWith('canonical/quarterly-rank-badges/') || relative.startsWith('canonical/quarterly-navigation/') || relative === 'canonical/quarterly-league-room-identity/quarterly-league-room-v1.png',
    treasury: (relative, themeDir) => relative.startsWith('treasury/') || relative.startsWith('treasury-') || relative.startsWith('economy/ducat') || relative.startsWith('canonical/ducat/') || relative.startsWith('canonical/collection-medals/') || relative.startsWith('canonical/achievement-trophies/') || relative.startsWith('canonical/treasury-controls/') || relative.startsWith('canonical/treasury-effect-previews/') || (themeDir !== 'green-soft-clay' && relative.includes('rewarded-video')),
    tournament: relative => relative.startsWith('tournament/') || relative.startsWith('tournament-') || relative.startsWith('canonical/tournament-navigation/') || relative.startsWith('canonical/tournament-states/') || relative.startsWith('canonical/tournament-awards/'),
    solo: relative => relative.startsWith('solo/') || relative.startsWith('canonical/solo-results/') || relative === 'canonical/solo-room-identity/solo-room-v1.png',
    hotseat: relative => relative.startsWith('hotseat/') || relative.startsWith('canonical/hotseat-winner/') || relative === 'canonical/hotseat-room-identity/hotseat-room-v1.png',
    opponent: relative => relative.startsWith('opponent/') || relative === 'canonical/online-random-room-identity/online-random-room-v1.png',
    invite: relative => relative.startsWith('invite/') || relative === 'canonical/invite-friend-room-identity/invite-friend-room-v1.png'
};
for (const themeDir of themeDirs) {
    const directory = path.join(www, 'assets', themeDir);
    const files = walkPngs(directory);
    let totalBytes = 0;
    let oversizedRuntimeIcons = 0;
    for (const file of files) {
        const info = readPngInfo(file);
        totalBytes += fs.statSync(file).size;
        const isSplash = /^splash-title-soft-clay-v[12]\.png$/.test(path.basename(file));
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
        assert(greenLeaderboardControlsAudit.every(asset => roomMatchers.leaderboard(`canonical/leaderboard-controls/${asset.id}-v1.png`) && leaderboardRoom.files >= 3), 'Sva tri Green Leaderboard Controls PNG-a moraju biti u sobnom paketu.');
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
        const settingsRoom = roomTotals.find(room => room.roomId === 'settings');
        assert(settingsRoom && settingsRoom.files === 9 && settingsRoom.bytes === 554053 && settingsRoom.decodedBytes === 3145728, `Green Settings room-on-demand paket više nije standardizovan na 9 PNG / 554053 B / 3145728 decoded B (dobijeno ${settingsRoom?.files} PNG / ${settingsRoom?.bytes} B / ${settingsRoom?.decodedBytes} decoded B).`);
        const settingsMenuPath = 'canonical/settings-room-identity/settings-room-menu-v1.png';
        const settingsRoomPath = 'canonical/settings-room-identity/settings-room-v1.png';
        assert(startupFiles.length === 17 && startupFiles.filter(file => path.relative(directory, file).replaceAll('\\', '/') === settingsMenuPath).length === 1 && startupFiles.every(file => path.relative(directory, file).replaceAll('\\', '/') !== settingsRoomPath), 'Green startup mora pripremiti samo 384 px Settings menu varijantu.');
        assert(roomMatchers.settings(settingsRoomPath) && !roomMatchers.settings(settingsMenuPath), 'Green Settings room matcher ne razdvaja 512 px room i 384 px menu varijantu.');
        const rulesRoom = roomTotals.find(room => room.roomId === 'rules');
        assert(rulesRoom && rulesRoom.files === 7 && rulesRoom.bytes === 1450680 && rulesRoom.decodedBytes === 7340032, `Green Rules room-on-demand paket više nije standardizovan na 7 PNG / 1450680 B / 7340032 decoded B (dobijeno ${rulesRoom?.files} PNG / ${rulesRoom?.bytes} B / ${rulesRoom?.decodedBytes} decoded B).`);
        assert(greenRulesPageAudit.every(asset => roomMatchers.rules(`canonical/rules-page-illustrations/${asset.file}`)), 'Sve četiri Green Rules page ilustracije moraju pripadati Rules room-on-demand paketu.');
        const rulesMenuPath = 'canonical/rules-room-identity/rules-room-menu-v1.png';
        const rulesRoomPath = 'canonical/rules-room-identity/rules-room-v1.png';
        assert(startupFiles.length === 17 && startupFiles.filter(file => path.relative(directory, file).replaceAll('\\', '/') === rulesMenuPath).length === 1 && startupFiles.every(file => path.relative(directory, file).replaceAll('\\', '/') !== rulesRoomPath), 'Green startup mora pripremiti samo 384 px Rules menu varijantu.');
        assert(roomMatchers.rules(rulesRoomPath) && !roomMatchers.rules(rulesMenuPath), 'Green Rules room matcher ne razdvaja 512 px room i 384 px menu varijantu.');
        const globalChatRoom = roomTotals.find(room => room.roomId === 'globalChat');
        assert(globalChatRoom && globalChatRoom.files === 3 && globalChatRoom.bytes === 351688 && globalChatRoom.decodedBytes === 2228224, `Green Global Chat paket mora ostati 3 PNG / 351688 B / 2228224 decoded B (dobijeno ${globalChatRoom?.files} PNG / ${globalChatRoom?.bytes} B / ${globalChatRoom?.decodedBytes} decoded B).`);
        const globalChatMenuPath = 'canonical/global-chat-room-identity/global-chat-room-menu-v1.png';
        const globalChatRoomPath = 'canonical/global-chat-room-identity/global-chat-room-v1.png';
        assert(startupFiles.length === 17 && startupFiles.filter(file => path.relative(directory, file).replaceAll('\\', '/') === globalChatMenuPath).length === 1 && startupFiles.every(file => path.relative(directory, file).replaceAll('\\', '/') !== globalChatRoomPath), 'Green startup mora pripremiti samo 384 px Global Chat menu varijantu.');
        assert(roomMatchers.globalChat(globalChatRoomPath) && !roomMatchers.globalChat(globalChatMenuPath), 'Green Global Chat matcher ne razdvaja room i menu varijantu.');
        const onlinePlayersRoom = roomTotals.find(room => room.roomId === 'onlinePlayers');
        assert(onlinePlayersRoom && onlinePlayersRoom.files === 5 && onlinePlayersRoom.bytes === 442271 && onlinePlayersRoom.decodedBytes === 3407872, 'Green Online Players room paket mora ostati 5 PNG / 442271 B / 3407872 decoded B.');
        const onlinePlayersMenuPath = 'canonical/online-players-room-identity/online-players-room-menu-v1.png';
        const onlinePlayersRoomPath = 'canonical/online-players-room-identity/online-players-room-v1.png';
        assert(startupFiles.length === 17 && startupFiles.filter(file => path.relative(directory, file).replaceAll('\\', '/') === onlinePlayersMenuPath).length === 1 && startupFiles.every(file => path.relative(directory, file).replaceAll('\\', '/') !== onlinePlayersRoomPath), 'Green Online Players startup mora učitati samo canonical menu isporuku.');
        assert(roomMatchers.onlinePlayers(onlinePlayersRoomPath) && !roomMatchers.onlinePlayers(onlinePlayersMenuPath), 'Green Online Players matcher mora razlikovati room i menu isporuku.');
        const quarterlyLeagueRoom = roomTotals.find(room => room.roomId === 'quarterlyLeague');
        assert(quarterlyLeagueRoom && quarterlyLeagueRoom.files === 14 && quarterlyLeagueRoom.bytes === 1466088 && quarterlyLeagueRoom.decodedBytes === 6422528, 'Green Quarterly League puna statička oblast mora ostati 14 PNG / 1466088 B / 6422528 decoded B.');
        const quarterlyMenuPath = 'canonical/quarterly-league-room-identity/quarterly-league-room-menu-v1.png';
        const quarterlyRoomPath = 'canonical/quarterly-league-room-identity/quarterly-league-room-v1.png';
        assert(startupFiles.length === 17 && startupFiles.filter(file => path.relative(directory, file).replaceAll('\\', '/') === quarterlyMenuPath).length === 1 && startupFiles.every(file => path.relative(directory, file).replaceAll('\\', '/') !== quarterlyRoomPath), 'Green Quarterly League startup mora učitati samo canonical menu isporuku.');
        assert(roomMatchers.quarterlyLeague(quarterlyRoomPath) && !roomMatchers.quarterlyLeague(quarterlyMenuPath), 'Green Quarterly League matcher mora razlikovati room i menu isporuku.');
        const inviteFriendRoom = roomTotals.find(room => room.roomId === 'invite');
        assert(inviteFriendRoom && inviteFriendRoom.files === 5 && inviteFriendRoom.bytes === 447128 && inviteFriendRoom.decodedBytes === 3407872, `Green Invite Friend room-on-demand paket mora ostati 5 PNG / 447128 B / 3407872 decoded B (dobijeno ${inviteFriendRoom?.files} PNG / ${inviteFriendRoom?.bytes} B / ${inviteFriendRoom?.decodedBytes} decoded B).`);
        const inviteFriendMenuPath = 'canonical/invite-friend-room-identity/invite-friend-room-menu-v1.png';
        const inviteFriendRoomPath = 'canonical/invite-friend-room-identity/invite-friend-room-v1.png';
        assert(startupFiles.length === 17 && startupFiles.filter(file => path.relative(directory, file).replaceAll('\\', '/') === inviteFriendMenuPath).length === 1 && startupFiles.every(file => path.relative(directory, file).replaceAll('\\', '/') !== inviteFriendRoomPath), 'Green Invite Friend startup mora učitati samo canonical menu isporuku.');
        assert(roomMatchers.invite(inviteFriendRoomPath) && !roomMatchers.invite(inviteFriendMenuPath), 'Green Invite Friend matcher mora razlikovati room i menu isporuku.');
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

const greenPreviewPack = gameSource.match(/const packs = \{\s*dark: \{([\s\S]*?)\n\s*winter: \{/);
assert(greenPreviewPack && !/assets\/[^'"\s]+\.svg/i.test(greenPreviewPack[1]) && !/assets\/(?:easter|desert|severna)-soft-clay\//.test(greenPreviewPack[1]), 'Green theme pregled još sadrži stari SVG ili asset druge teme.');
assert(/Green UI contract: shared type, contrast, controls and containment/.test(themeCssSource)
    && /\.custom-toast \.toast-title/.test(themeCssSource)
    && /\.custom-toast \.toast-msg/.test(themeCssSource)
    && /\.daily-glass-die\.dice/.test(themeCssSource)
    && /#waiting-screen \.ws-glass-card/.test(themeCssSource), 'Green UI kontrast i containment ugovor nije kompletan.');
assert(indexSource.includes('goToStatsPage(0)') && indexSource.includes('goToStatsPage(1)')
    && rulesSource.includes("dot.setAttribute('aria-current', 'step')")
    && quarterlyLeagueSource.includes('class="league-page-dot')
    && quarterlyLeagueSource.includes('goToSlide(${i})'), 'Green pageri nisu standardizovani i upotrebljivi.');
assert(rulesSource.includes("this.touchStartScrollLeft = this.sliderTrack.scrollLeft;")
    && rulesSource.includes("if (this.touchGestureHorizontal && e.cancelable) e.preventDefault();")
    && rulesSource.includes("this.goToSlide(startIndex + (deltaX < 0 ? 1 : -1));")
    && quarterlyLeagueSource.includes('track.parentElement.clientWidth * 0.22')
    && quarterlyLeagueSource.includes("track.addEventListener('touchcancel'")
    && gameSource.includes("if (typeof updateStatsPagination === 'function') updateStatsPagination();")
    && themeCssSource.includes('/* One pager language: a 44px tap target')
    && themeCssSource.includes('#league-modal-overlay .league-page-dot):focus-visible'), 'Green navigacija: swipe, reset ili zona dodira nisu usklađeni.');
assert(/\.daily-glass-die\.dice\s*\{[^}]*width:\s*min\(100%, 14vw, 60px\) !important;/s.test(themeCssSource)
    && dailyChallengeSource.includes("${isGreenTheme ? '' : ' (x2)'}")
    && dailyChallengeSource.includes('if (isEasterTheme || isGreenTheme)'), 'Green dnevni izazov: kockice ili tekst dupliranja odstupaju.');
assert(fireStreakSource.includes("const dockMyRank = ['easter', 'desert'].includes(activeTheme)")
    && powerIndexSource.includes("const dockMyRank = ['easter', 'desert'].includes(activeTheme)")
    && fireStreakSource.includes("this.renderPlayerRow(this.myPlayer, { offTop: true })")
    && powerIndexSource.includes("this.renderPlayerRow(this.myPlayer, { offTop: true })"), 'Green statističke liste moraju imati jedan red igrača u samoj listi.');
assert(gameSource.includes('class="green-friend-presence"')
    && themeCssSource.includes('#waiting-screen#waiting-screen.is-hosting-invite #friends-list-container')
    && themeCssSource.includes('#league-modal-overlay#league-modal-overlay > .modal-box')
    && tournamentSource.includes('tourney-participant-row'), 'Green Poziv, Liga ili bracket nisu obuhvaćeni follow-up rasporedom.');
assert(/#waiting-screen\.is-hosting-invite\s*\{[^}]*overflow-y:\s*auto;[^}]*overscroll-behavior-y:\s*contain;/s.test(themeCssSource)
    && themeCssSource.includes('@media (max-height: 760px) and (min-height: 650px)')
    && themeCssSource.includes('height: clamp(160px, calc(100dvh - 530px), 190px) !important;')
    && themeCssSource.includes('@media (max-height: 699px) and (min-height: 650px)')
    && themeCssSource.includes('height: clamp(165px, calc(100dvh - 530px), 169px) !important;')
    && themeCssSource.includes('height: 220px;')
    && themeCssSource.includes('padding-bottom: calc(var(--safe-bottom) + 20px) !important;')
    && themeCssSource.includes('@media (min-height: 761px) and (max-height: 799px) and (max-width: 599px)')
    && themeCssSource.includes('height: clamp(190px, calc(100dvh - 560px), 230px) !important;')
    && themeCssSource.includes('@media (max-height: 649px)')
    && /#waiting-screen#waiting-screen\.is-hosting-invite #friends-list-container\s*\{[^}]*flex:\s*0 0 auto !important;/s.test(themeCssSource)
    && /#waiting-screen\.is-hosting-invite \.green-friend-presence\s*\{[^}]*text-transform:\s*uppercase;/s.test(themeCssSource),
    'Green Poziv: ONLINE/OFFLINE mora ostati iznad sistemske navigacije, uz skrol samo kad sadržaj ne staje.');
assert(/#tournament-screen \.tourney-matches--qf\s*\{[^}]*grid-template-rows:\s*repeat\(4, minmax\(max-content, 1fr\)\);[^}]*overflow-y:\s*auto;/s.test(themeCssSource)
    && /#tournament-screen \.tourney-matches--qf \.tourney-match\s*\{[^}]*min-height:\s*max-content;[^}]*height:\s*auto;/s.test(themeCssSource),
    'Green Turnir: četvrtfinalni parovi ne smeju odseći drugog igrača.');
assert(['wins', 'draws', 'losses'].every((part, index) =>
    indexSource.includes(`data-green-record="${['win', 'draw', 'loss'][index]}">`)
    && indexSource.includes(`id="waiting-opp-${part}"`))
    && /#waiting-screen:is\(\.is-hosting-invite, \.is-random-online\) \[data-lang="ws_power"\]/.test(themeCssSource)
    && [1, 2, 3].every(index => themeCssSource.includes(`#waiting-screen#waiting-screen.is-random-online .ws-random-records .ws-g-stat:nth-child(${index}) .val`)),
    'Green random: obe kartice moraju imati prevedene oznake i trobojne rezultate.');
assert(/#tournament-screen \.tourney-pagination \.dot\s*\{[^}]*align-items:\s*end;/s.test(themeCssSource)
    && /\.tourney-pagination \.dot\s*\{[^}]*width:\s*44px;\s*height:\s*44px;/s.test(tournamentSource),
    'Green Turnir: vidljive tačkice moraju biti nisko, uz punu zonu dodira.');
for (const [outcome, file] of [['win', 'wins'], ['loss', 'losses'], ['draw', 'draws']]) {
    const asset = `assets/green-soft-clay/canonical/statistics-overview/${file}-v1.png`;
    assert(indexSource.includes(`green-game-over-result-icon--${outcome}`)
        && indexSource.includes(asset)
        && fs.existsSync(path.join(www, asset)), `Green završni ekran nema canonical ${outcome} PNG.`);
    assert(themeCssSource.includes(`#game-over-screen.result-${outcome}`), `Green završni ekran ne prikazuje ${outcome} ishod.`);
}
assert(gameSource.includes("this.prepareThemeRoomAssets('gameOver', { root: document.getElementById('game-over-screen') });")
    && gameSource.includes("gameOverScreen.classList.remove('is-technical-result', 'result-win', 'result-loss', 'result-draw');")
    && gameSource.includes('if (resultOutcome) gameOverScreen.classList.add(`result-${resultOutcome}`);')
    && themeCssSource.includes('#game-over-screen.is-technical-result .green-game-over-ducat')
    && themeCssSource.includes('#game-over-screen:not(.is-solo-result):not(.is-technical-result) .green-solo-finish-score-mark'),
    'Green završni ekran: ishodi, priprema asseta ili razdvajanje poena i dukata nisu dosledni.');
assert(managersSource.includes('this.setup(safeTitle, text, false, options);')
    && gameSource.includes("{ contextClass: 'tourney-winner' }")
    && gameSource.includes("{ contextClass: 'tourney-finalist' }")
    && fs.existsSync(path.join(www, 'assets/green-soft-clay/canonical/competition-medals/quarterly-league-gold-v1.png'))
    && gameSource.includes('canonical/competition-medals/quarterly-league-${medalType}-v1.png'),
    'Green nagrade turnira ili Kvartalne lige nemaju ispravan modal ili canonical PNG.');
assert(indexSource.includes('data-green-record="win"')
    && indexSource.includes('data-green-record="draw"')
    && indexSource.includes('data-green-record="loss"')
    && languagesSource.includes('function syncGreenRecordLabels()')
    && gameSource.includes("if (typeof syncGreenRecordLabels === 'function') syncGreenRecordLabels();")
    && gameSource.includes("recordLabel('ws_record_win_short', 'POB')")
    && gameSource.includes("recordLabel('ws_record_draw_short', 'NER')")
    && gameSource.includes("recordLabel('ws_record_loss_short', 'POR')"), 'Green Poziv: kratke oznake pobeda/nerešenih/poraza nisu dosledne u oba jezika.');
const uiTranslations = vm.runInNewContext(
    `${languagesSource.slice(0, languagesSource.indexOf('\nfunction dukatIconHtml'))}\nTRANSLATIONS`, {}
);
assert(uiTranslations.sr.ws_found_title === 'PROTIVNIK PRONAĐEN'
    && uiTranslations.en.ws_found_title === 'OPPONENT FOUND'
    && gameSource.includes("waitingScreen.classList.contains('is-random-online')")
    && gameSource.includes("titleEl.setAttribute('data-lang', 'ws_found_title')")
    && gameSource.includes("if (msgEl) msgEl.style.display = 'none';")
    && (gameSource.match(/msgEl\.style\.display = '';/g) || []).length >= 2,
    'Green random: pronađeni protivnik ne sme zadržati naslov traženja niti sakriti poruku u sledećem toku.');
const translateSource = languagesSource.match(/function t\(key\) \{[\s\S]*?\n\}/)?.[0];
assert(translateSource, 'Funkcija prevoda nije pronađena za Green regresiju oznaka.');
const labelThemeContext = {
    TRANSLATIONS: uiTranslations,
    document: { documentElement: { dataset: { splashTheme: 'dark' } } },
    localStorage: { getItem: key => key === 'yamb_lang' ? 'sr' : 'dark' },
    formatDukatIcons: value => value
};
assert(vm.runInNewContext(`${translateSource}\n[t('tourney_finalist_title'), t('ws_power')]`, labelThemeContext).join('|') === 'FINALISTA|Moć',
    'Green oznake finaliste i moći ne smeju duplirati kanonske motive emojijima.');
labelThemeContext.document.documentElement.dataset.splashTheme = 'easter';
assert(vm.runInNewContext(`${translateSource}\n[t('tourney_finalist_title'), t('ws_power')]`, labelThemeContext).join('|') === 'FINALISTA|Moć ⚡',
    'Vaskrs finalista mora koristiti tematski PNG bez stare emoji oznake.');
assert(tournamentSource.includes('class="tourney-champion-finalist-icon-easter" data-theme-src="assets/easter-soft-clay/canonical/competition-medals/silver-v1.png?v=1"')
    && themeCssSource.includes('body.easter-theme #tournament-screen .tourney-champion-finalist-icon-easter'),
    'Vaskrs istorija turnira mora prikazati tematsku ikonu finaliste.');
labelThemeContext.document.documentElement.dataset.splashTheme = 'desert';
assert(vm.runInNewContext(`${translateSource}\n[t('tourney_finalist_title'), t('ws_power')]`, labelThemeContext).join('|') === 'FINALISTA 🥈|Moć ⚡',
    'Pustinjsko staklo mora zadržati svoje postojeće oznake.');
assert(['win', 'draw', 'loss'].every((kind, index) => {
    const key = `ws_record_${kind}_short`;
    return uiTranslations.sr[key] === ['POB', 'NER', 'POR'][index]
        && uiTranslations.en[key] === ['W', 'D', 'L'][index];
}), 'Green Poziv: SR/EN kratke oznake rezultata nisu kompletne.');
const greenRecordSyncSource = languagesSource.match(/function syncGreenRecordLabels\(\) \{[\s\S]*?\n\}/)?.[0];
assert(greenRecordSyncSource, 'Green Poziv: sinhronizacija statičkih oznaka nije pronađena.');
const recordLabels = ['win', 'draw', 'loss', 'win', 'draw', 'loss']
    .map(greenRecord => ({ dataset: { greenRecord }, textContent: '' }));
const recordContext = {
    document: {
        documentElement: { dataset: { splashTheme: 'dark' } },
        querySelectorAll: () => recordLabels
    },
    localStorage: { getItem: key => key === 'yamb_lang' ? recordContext.lang : recordContext.theme },
    t: key => uiTranslations[recordContext.lang][key],
    lang: 'en', theme: 'dark'
};
vm.runInNewContext(`${greenRecordSyncSource}\nsyncGreenRecordLabels()`, recordContext);
assert(JSON.stringify(recordLabels.map(label => label.textContent)) === JSON.stringify(['W', 'D', 'L', 'W', 'D', 'L']), 'Green EN statičke oznake nisu W/D/L.');
recordContext.document.documentElement.dataset.splashTheme = 'easter';
vm.runInNewContext('syncGreenRecordLabels()', recordContext);
assert(JSON.stringify(recordLabels.map(label => label.textContent)) === JSON.stringify(['POB', 'NER', 'POR', 'POB', 'NER', 'POR']), 'Druga tema mora da zadrži svoje oznake.');
recordContext.document.documentElement.dataset.splashTheme = 'dark';
recordContext.lang = 'sr';
vm.runInNewContext('syncGreenRecordLabels()', recordContext);
assert(JSON.stringify(recordLabels.map(label => label.textContent)) === JSON.stringify(['POB', 'NER', 'POR', 'POB', 'NER', 'POR']), 'Green SR oznake nisu očuvane.');
for (const lang of ['sr', 'en']) {
    for (const key of ['aria_stats_overview_page', 'aria_stats_h2h_page', 'aria_close_league', 'aria_league_rank_page', 'aria_league_sections', 'aria_hof_sections']) {
        assert(typeof uiTranslations[lang]?.[key] === 'string' && uiTranslations[lang][key].trim(), `Q1 nedostaje ${lang} prevod za ${key}.`);
    }
}
assert(uiTranslations.sr.aria_stats_h2h_page !== uiTranslations.en.aria_stats_h2h_page
    && uiTranslations.sr.aria_close_league !== uiTranslations.en.aria_close_league, 'Q1 SR/EN oznake ne smeju ostati isti tekst.');
assert(indexSource.includes('data-lang-aria="aria_stats_overview_page"')
    && indexSource.includes('data-lang-aria="aria_stats_h2h_page"')
    && quarterlyLeagueSource.includes("gt('aria_league_rank_page'")
    && quarterlyLeagueSource.includes('aria-pressed="true"')
    && rulesSource.includes('role="dialog" aria-modal="true"')
    && indexSource.includes('class="custom-modal" role="dialog" aria-modal="true"')
    && managersSource.includes('this.previousFocus?.isConnected')
    && dailyChallengeSource.includes("resDiv.setAttribute('role', 'status')")
    && onlineNumberSource.includes("renderPlayersState('error', tr('online_no_conn'")
    && onlineNumberSource.includes('onlinePlayersConnectionTimer = setTimeout')
    && globalChatSource.includes('data-chat-state="${isLoading ? \'loading\' : \'empty\'}" role="status"')
    && leaderboardSource.includes('state === \'offline\' ? \'alert\' : \'status\'')
    && themeCssSource.includes('@media (prefers-reduced-motion: reduce)')
    && rulesSource.includes("behavior: reduceMotion ? 'auto' : 'smooth'"), 'Green Q1 stanja, pristupačnost ili smanjeni motion nisu povezani.');
assert(onlineNumberSource.includes("env(safe-area-inset-top) + 12px")
    && themeCssSource.includes('#league-modal-overlay > .modal-box'), 'Green safe-area zaštita za toast i Kvartalnu ligu nedostaje.');
assert(themeCssSource.includes('#main-menu .modes-grid .mode-text::after')
    && themeCssSource.includes('content: attr(data-easter-label-sr)')
    && themeCssSource.includes('content: attr(data-easter-label-en)')
    && themeCssSource.includes('-webkit-text-fill-color: #f4f8e8 !important'), 'Green oznake modova ili kontrast Android input teksta nisu zaštićeni.');

// Text on the translucent Green clay stops must remain readable even over a white part of the scenery.
const greenPaletteSource = themeCssSource.slice(themeCssSource.indexOf('ZELENA SOFT CLAY — JADE YAMB NEUMORPHISM'));
const greenToken = name => {
    const match = greenPaletteSource.match(new RegExp(`${name}:\\s*([^;]+);`));
    assert(match, `Nedostaje Green kontrast token: ${name}`);
    return match[1];
};
const rgbFromHex = value => [...value.matchAll(/[0-9a-f]{2}/gi)].map(match => parseInt(match[0], 16));
const luminance = channels => channels
    .map(channel => channel / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
const contrastRatio = (first, second) => {
    const light = Math.max(luminance(first), luminance(second));
    const dark = Math.min(luminance(first), luminance(second));
    return (light + 0.05) / (dark + 0.05);
};
const greenTextColors = ['--green-clay-ink', '--green-clay-ink-strong', '--green-clay-muted', '--text-muted']
    .map(name => [name, rgbFromHex(greenToken(name))]);
for (const surfaceName of ['--green-clay-surface', '--green-clay-surface-soft']) {
    const stops = [...greenToken(surfaceName).matchAll(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/g)];
    assert(stops.length === 2, `${surfaceName} mora imati dva proverljiva Green gradijenta.`);
    for (const [, red, green, blue, alphaText] of stops) {
        const alpha = Number(alphaText);
        const worstCaseSurface = [red, green, blue].map(channel => Number(channel) * alpha + 255 * (1 - alpha));
        for (const [name, ink] of greenTextColors) {
            assert(contrastRatio(ink, worstCaseSurface) >= 4.5, `${name} nema najmanje 4.5:1 na ${surfaceName} preko svetle pozadine.`);
        }
    }
}
assert(contrastRatio(rgbFromHex('#edf4df'), rgbFromHex('#4d7046')) >= 4.5
    && contrastRatio(rgbFromHex('#f4f8e8'), rgbFromHex('#4d7046')) >= 4.5,
    'Green popup tekst nema najmanje 4.5:1 na svetlijem kraju modala.');
const greenCancelSurface = [23, 53, 31].map((channel, index) => channel * 0.92 + rgbFromHex('#4d7046')[index] * 0.08);
assert(themeCssSource.includes(':is(.custom-modal .cm-btn-cancel, .custom-modal .btn-modal-cancel)')
    && contrastRatio(rgbFromHex('#f4f8e8'), greenCancelSurface) >= 4.5,
    'Green otkazivanje u popup-u ponovo ima nečitljiv tekst.');
assert(/\.custom-modal \.cm-btn\s*\{[^}]*font-size:\s*var\(--green-ui-body\) !important;/s.test(themeCssSource),
    'Green popup dugmad ne koriste standardizovanu veličinu teksta.');
assert(/#riznica-screen#riznica-screen \.card\.locked\s*\{[^}]*opacity:\s*1;[^}]*filter:\s*none;[^}]*background:\s*linear-gradient\(145deg, rgba\(43, 77, 48, \.97\)/s.test(themeCssSource)
    && contrastRatio(rgbFromHex('#edf4df'), rgbFromHex('#2b4d30')) >= 4.5,
    'Green zaključani trofej ne sme ponovo da izbledi tekst ili izgubi čitljiv kontrast.');
assert(themeCssSource.includes('--green-ui-close-size: 44px;')
    && themeCssSource.includes('--green-ui-room-radius: 20px;')
    && themeCssSource.includes('#highscores-screen .hs-card.modal-box')
    && themeCssSource.includes('max-width: 100%;')
    && /\.cm-close::after\s*\{\s*content:\s*'×';/s.test(themeCssSource),
    'Green kartice ili X kontrole su izgubile zajedničku geometriju.');
assert(/#waiting-screen\.is-hosting-invite \.ws-vs-area-horizontal\s*\{\s*flex-direction:\s*column;/s.test(themeCssSource)
    && /#waiting-screen\.is-hosting-invite \.ws-vs-area-horizontal > \.ws-glass-card\s*\{\s*width:\s*100%;/s.test(themeCssSource)
    && /\.daily-glass-overlay \.daily-glass-dice-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s.test(themeCssSource),
    'Green P1 raspored avatara ili šest dnevnih kockica više nije zaštićen.');
assert(globalChatSource.includes("root.style.setProperty('--green-visible-viewport-height'")
    && themeCssSource.includes('--global-chat-height: var(--green-visible-viewport-height, 100dvh);')
    && /@media \(max-height: 740px\) and \(max-width: 599px\)\s*\{[\s\S]*?#main-menu\s*\{[^}]*overflow-y:\s*auto;/s.test(themeCssSource),
    'Green S1 zaštita za tastaturu ili kratki glavni meni nije kompletna.');

console.log('Theme performance provera je prošla.');
report.forEach(line => console.log(`- ${line}`));
