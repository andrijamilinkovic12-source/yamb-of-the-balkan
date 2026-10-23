const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Counts possible PNG roles across room states, not simultaneous downloads.
// A shared file counts once in each room that uses it, and once in the union.
const root = path.resolve(__dirname, '..');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const themeRoot = theme => theme === 'dark' ? 'assets/green-soft-clay/' : `assets/theme-packs/${theme}/`;
const themed = (theme, relative) => {
    const critical = ['easter', 'desert', 'severna'].includes(theme);
    const family = /^canonical\/(?:ducat|undo-token|rewarded-video)\//.test(relative);
    return themeRoot(theme) + (critical && family ? relative.replace('-v1.png', '-v2.png') : relative);
};
const close = theme => themed(theme, 'canonical/room-controls/close-v1.png');
const entries = (theme, room) => {
    const rows = [];
    const add = (role, ...sources) => rows.push({ role, sources });
    const family = (prefix, roles) => roles.forEach(role => add(`${prefix}/${role}`, themed(theme, `canonical/${prefix}/${role}-v1.png`)));
    if (room === 'tournament') {
        add('champion', themed(theme, `canonical/tournament-awards/champion-trophy${theme === 'dark' ? '' : '-room'}-v1.png`));
        add('finalist', themed(theme, 'canonical/tournament-awards/finalist-silver-v1.png'));
        family('tournament-navigation', ['tab-info', 'tab-bracket', 'tab-hall-of-fame']);
        family('tournament-states', ['state-register', 'state-unregister', 'state-registration-locked', 'state-start', 'state-match-active', 'state-match-complete']);
        ['gold', 'silver', 'bronze'].forEach(tier => add(`medal/${tier}`, themed(theme, `canonical/competition-medals/tournament-${tier}-v1.png`)));
        add('power-index', themed(theme, 'canonical/statistics-overview/power-index-v1.png'));
        add('close', close(theme));
    } else if (room === 'treasury') {
        add('identity', themed(theme, 'treasury-free-v3.png'));
        family('treasury-controls', ['tab-trophies', 'tab-skins', 'tab-effects', 'tab-themes', 'status-owned', 'status-active', 'status-locked', 'status-insufficient']);
        const trophyIds = ['first_play', 'apprentice', 'kafana', 'score_1000', 'grandmaster', 'legend', 'mythic', 'godlike', 'surgeon', 'prophet', 'sniper', 'math', 'sveti_ilija', 'hazard', 'firecracker', 'concrete', 'perfectionist', 'miner', 'immortal', 'potato', 'minimal', 'achilles', 'close_call', 'night_owl', 'spite', 'veteran'];
        family('achievement-trophies', trophyIds);
        const effects = ['confetti', 'gold-rain', 'wedding', 'thunder', 'fireworks', 'bubbles', 'cosmic-dust', 'dragon-fire', 'royal-yamb', 'fireflies', 'ice-age', 'black-hole', 'supernova', 'neon-pulse', 'drones', 'ufo-abduction'];
        effects.forEach(effect => add(`effect/${effect}`, themed(theme, `canonical/treasury-effect-thumbnails/preview-${effect}-v1.png`), themed(theme, `canonical/treasury-effect-previews/preview-${effect}-v1.png`)));
        ['gold', 'silver', 'bronze'].forEach(tier => add(`collection-medal/${tier}`, themed(theme, `canonical/collection-medals/collection-${tier}-v1.png`)));
        add('reward-video/active', themed(theme, 'canonical/rewarded-video/rewarded-video-active-v1.png'));
        add('reward-video/inline', themed(theme, 'canonical/rewarded-video/rewarded-video-active-inline-v1.png'));
        add('ducat', themed(theme, 'canonical/ducat/ducat-inline-v1.png'));
        const skinManifest = JSON.parse(fs.readFileSync(path.join(root, 'source-assets/dice-skins-v1/manifest.json'), 'utf8'));
        skinManifest.skins.forEach(skin => add(`skin/${skin.id}`, `assets/treasury-skin-previews/${skin.id}-face-v1.png`, `assets/dice-skins-v1/${skin.id}-face-v1.png`));
        themes.forEach(id => add(`theme-preview/${id}`, `assets/treasury-theme-previews/${id}-v1.png`));
        add('close', close(theme));
    } else if (room === 'global-chat') {
        add('identity', themed(theme, 'canonical/global-chat-room-identity/global-chat-room-v1.png'));
        for (const role of ['empty-state', 'send']) {
            const greenName = role === 'empty-state' ? 'global-chat-empty-v1.png' : 'global-chat-send-v1.png';
            add(role, theme === 'dark' ? themed(theme, greenName) : themed(theme, `canonical/global-chat-internal/${role}-v1.png`));
        }
        add('close', close(theme));
    } else if (room === 'online-players') {
        add('identity', themed(theme, 'canonical/online-players-room-identity/online-players-room-v1.png'));
        ['state', 'search', 'friend', 'spectate', 'duel', 'avatar'].forEach(role => add(role, `assets/theme-packs/${theme}/canonical/online-players-internal/${role}-v1.png`));
        add('close', close(theme));
    } else if (room === 'economy') {
        add('identity', themed(theme, `ducats-undo-free-v${['winter', 'desert', 'moon', 'severna'].includes(theme) ? 4 : 3}.png`));
        add('ducat', ...['front', 'inline'].map(variant => themed(theme, `canonical/ducat/ducat-${variant}-v1.png`)));
        add('undo-token', ...['front', 'inline'].map(variant => themed(theme, `canonical/undo-token/undo-token-${variant}-v1.png`)));
        add('reward-video/active', themed(theme, 'canonical/rewarded-video/rewarded-video-active-v1.png'));
        add('reward-video/unavailable', themed(theme, 'canonical/rewarded-video/rewarded-video-unavailable-v1.png'));
        add('close', close(theme));
    } else if (room === 'leaderboard') {
        add('identity', themed(theme, `canonical/leaderboard-room-identity/leaderboard-room-${theme === 'dark' ? 'v1' : 'v2'}.png`));
        ['global', 'local', 'empty-loading'].forEach(role => add(role, themed(theme, `canonical/leaderboard-controls/${role}-${theme === 'dark' ? 'v1' : 'v2'}.png`)));
        ['gold', 'silver', 'bronze'].forEach(tier => add(`medal/${tier}`, themed(theme, `canonical/competition-medals/general-podium-${tier}-v2.png`)));
        add('close', close(theme));
    } else if (room === 'daily-challenge') {
        add('identity', themed(theme, 'canonical/daily-room-identity/daily-room-v1.png'));
        family('daily-states', ['task', 'complete', 'already-played']);
        add('reward-video', themed(theme, 'daily/reward-video-v3.png'));
        add('ducat', themed(theme, 'canonical/ducat/ducat-inline-v1.png'));
    }
    return rows;
};

const rooms = ['tournament', 'treasury', 'global-chat', 'online-players', 'economy', 'daily-challenge', 'leaderboard'];
const html = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
const economyMarkup = html.split('<div id="undo-menu-overlay"')[1]?.split('<div id="custom-modal-overlay"')[0] || '';
const legacyEconomySources = [...economyMarkup.matchAll(/assets\/(?:easter|desert|severna)-soft-clay\/[^"\s>]+\.png(?:\?[^"\s>]*)?/g)].map(match => match[0]);
const report = {
    schemaVersion: 3,
    definition: 'Possible active PNG roles in seven processed rooms. Shared assets repeat in each room; duplicate paths inside one room count once. File count includes technical variants. This is not a visual or runtime certification.',
    rooms,
    themes: {},
    crossThemeIdentical: [],
    legacyEconomyReferences: { occurrences: legacyEconomySources.length, distinctSources: [...new Set(legacyEconomySources)] },
    reviewStatus: { inventory: 'checked', binaryIdentityBetweenThemes: 'checked', themeDnaVisual: 'pending', provenance: 'pending', runtimeStates: 'pending', legacyRemoval: legacyEconomySources.length ? 'pending' : 'checked' }
};
let failed = false;
if (legacyEconomySources.length) failed = true;
const themedHashes = new Map();
for (const theme of themes) {
    const roomReports = {};
    const allPaths = new Set();
    for (const room of rooms) {
        const roles = entries(theme, room);
        const paths = [...new Set(roles.flatMap(row => row.sources))];
        paths.forEach(source => allPaths.add(source));
        const missing = paths.filter(source => !fs.existsSync(path.join(root, 'www', source)));
        if (missing.length) failed = true;
        for (const row of roles) {
            row.sources.forEach((source, variant) => {
                if (!source.startsWith(themeRoot(theme)) || missing.includes(source)) return;
                const key = `${room}/${row.role}/${variant}`;
                if (!themedHashes.has(key)) themedHashes.set(key, []);
                const sha256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'www', source))).digest('hex');
                themedHashes.get(key).push({ theme, source, sha256 });
            });
        }
        roomReports[room] = { roles: roles.length, pngFiles: paths.length, missing };
    }
    report.themes[theme] = { rooms: roomReports, uniquePngAcrossRooms: allPaths.size };
}
for (const room of rooms) {
    for (const metric of ['roles', 'pngFiles']) {
        const counts = themes.map(theme => report.themes[theme].rooms[room][metric]);
        if (new Set(counts).size !== 1) failed = true;
    }
}
if (new Set(themes.map(theme => report.themes[theme].uniquePngAcrossRooms)).size !== 1) failed = true;
for (const [role, assets] of themedHashes) {
    const byHash = new Map();
    assets.forEach(asset => {
        if (!byHash.has(asset.sha256)) byHash.set(asset.sha256, []);
        byHash.get(asset.sha256).push(asset);
    });
    for (const identical of byHash.values()) {
        if (identical.length > 1) report.crossThemeIdentical.push({ role, assets: identical });
    }
}
console.log(JSON.stringify(report, null, 2));
if (failed) process.exitCode = 1;
