const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const hash = file => crypto.createHash('sha256').update(read(file)).digest('hex');
const themes = ['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const roles = ['global', 'local', 'empty-loading'];
const manifest = JSON.parse(read('source-assets/theme-leaderboard-controls-v2/manifest.json'));
const identityManifest = JSON.parse(read('source-assets/theme-leaderboard-room-identity-v2/manifest.json'));
const medalManifest = JSON.parse(read('source-assets/theme-leaderboard-medals-v2/manifest.json'));
assert.equal(manifest.themes.length, 9);
assert.equal(identityManifest.themes.length, 9);
const distinct = new Set();
for (const group of manifest.themes) {
    assert.ok(themes.includes(group.id));
    assert.deepEqual(group.assets.map(item => item.role), roles);
    for (const item of group.assets) {
        assert.equal(hash(item.master), item.masterSha256);
        assert.equal(hash(item.production), item.productionSha256);
        const png = read(item.production);
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        const size = item.role === 'empty-loading' ? 384 : 256;
        assert.equal(png.readUInt32BE(16), size);
        assert.equal(png.readUInt32BE(20), size);
        assert.equal(png[25], 6, `${item.production} must be RGBA`);
        distinct.add(item.productionSha256);
    }
}
assert.equal(distinct.size, 27, 'Each theme and role needs its own PNG');
const identityHashes = new Set();
for (const group of identityManifest.themes) {
    assert.ok(themes.includes(group.id));
    assert.equal(hash(group.master), group.masterSha256);
    assert.deepEqual(group.assets.map(item => item.role), ['room', 'menu']);
    for (const item of group.assets) {
        assert.equal(hash(item.production), item.productionSha256);
        const png = read(item.production);
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(png.readUInt32BE(16), item.role === 'room' ? 512 : 384);
        assert.equal(png.readUInt32BE(20), item.role === 'room' ? 512 : 384);
        assert.equal(png[25], 6, `${item.production} must be RGBA`);
        identityHashes.add(item.productionSha256);
    }
}
assert.equal(identityHashes.size, 18, 'Each themed room/menu identity needs its own PNG derivative');
assert.equal(medalManifest.themes.length, 10);
const medalHashes = new Set();
for (const group of medalManifest.themes) {
    assert.ok([...themes, 'dark'].includes(group.id));
    assert.deepEqual(group.assets.map(item => item.tier), ['gold', 'silver', 'bronze']);
    for (const item of group.assets) {
        assert.equal(hash(item.master), item.masterSha256);
        assert.equal(hash(item.production), item.productionSha256);
        const png = read(item.production);
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(png.readUInt32BE(16), 256);
        assert.equal(png.readUInt32BE(20), 256);
        assert.equal(png[25], 6, `${item.production} must be RGBA`);
        medalHashes.add(item.productionSha256);
    }
}
assert.equal(medalHashes.size, 30, 'Each theme and rank needs its own PNG');

const document = { body: { classList: { contains: () => false } }, readyState: 'loading', addEventListener: () => {} };
const window = {};
vm.runInNewContext(read('www/theme-leaderboard-room.js').toString(), { document, window, Image: class {} });
for (const theme of [...themes, 'dark']) {
    for (const role of ['identity', ...roles]) {
        const source = window.themeLeaderboard.asset(role, theme).split('?')[0];
        assert.ok(fs.existsSync(path.join(root, 'www', source)), source);
        if (role === 'identity') assert.ok(source.endsWith(`leaderboard-room-${theme === 'dark' ? 'v1' : 'v2'}.png`));
    }
}
const html = read('www/index.html').toString();
const roomCss = read('www/theme-leaderboard-room.css').toString();
const cardCss = read('www/theme-card-surfaces.css').toString();
const greenCss = read('www/teme.css').toString();
const roomCounts = JSON.parse(read('docs/theme-room-asset-counts.json'));
const luminance = hex => {
    const channel = value => {
        const normalized = parseInt(value, 16) / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    };
    const [, red, green, blue] = hex.match(/^#(..)(..)(..)$/);
    return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
};
const contrast = (a, b) => {
    const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (values[0] + 0.05) / (values[1] + 0.05);
};
for (const theme of themes) {
    const block = cardCss.match(new RegExp(`body\\.${theme}-theme\\s*\\{([^}]+)\\}`))?.[1];
    assert.ok(block, `Missing ${theme} palette`);
    const color = Object.fromEntries([...block.matchAll(/--theme-card-([\w-]+):\s*(#[a-f\d]{6})/gi)]
        .map(([, key, value]) => [key, value]));
    for (const [text, surface] of [['ink', 'surface'], ['ink', 'raised'], ['muted', 'raised']]) {
        assert.ok(contrast(color[text], color[surface]) >= 4.5,
            `${theme} ${text}/${surface} text needs at least 4.5:1 contrast`);
    }
}
for (const theme of [...themes, 'dark']) {
    assert.deepEqual(roomCounts.themes[theme].rooms.leaderboard,
        { roles: 8, pngFiles: 8, missing: [] }, `${theme} must have the same eight active Top lista PNG roles`);
}
const composite = (rgba, background) => rgba.slice(0, 3)
    .map((channel, index) => channel * rgba[3] + background[index] * (1 - rgba[3]));
const greenSurface = greenCss.match(/--green-clay-surface-soft: linear-gradient\(145deg, rgba\(([^)]+)\), rgba\(([^)]+)\)\)/);
assert.ok(greenSurface, 'Green Clay surface is missing');
for (const endpoint of greenSurface.slice(1).map(part => part.split(',').map(Number))) {
    for (const backdrop of [[0, 0, 0], [255, 255, 255]]) {
        const surface = composite(endpoint, backdrop);
        const rgbLuminance = rgb => rgb.map(channel => {
            const value = channel / 255;
            return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
        }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
        for (const ink of ['#e7efda', '#f2f6e8', '#e1ecd2']) {
            const foreground = [1, 3, 5].map(index => parseInt(ink.slice(index, index + 2), 16));
            const values = [rgbLuminance(foreground), rgbLuminance(surface)].sort((a, b) => b - a);
            assert.ok((values[0] + .05) / (values[1] + .05) >= 4.5,
                `Green Top lista text contrast fails on ${backdrop}`);
        }
    }
}
assert.match(roomCss, /#global-hs-list,#local-hs-list[^\{]*\.hs-state-canonical-icon\s*\{[^}]*width:\s*86px[^}]*height:\s*86px/s);
assert.match(roomCss, /#highscores-screen#highscores-screen \.hs-card\.modal-box\s*\{[^}]*width:\s*min\(760px/s);
assert.match(roomCss, /#highscores-screen#highscores-screen\s*\{\s*padding-top: max\(42px/s);
assert.match(roomCss, /#highscores-screen#highscores-screen \.hs-tab-btn\s*\{[^}]*padding: 6px !important;[^}]*font-size: \.66rem !important/s);
assert.match(roomCss, /@media \(max-width: 400px\)[\s\S]*grid-template-columns: 36px 38px minmax\(0, 1fr\) 82px !important/);
assert.match(roomCss, /#highscores-screen#highscores-screen \.hs-card\.modal-box\s*\{[^}]*background: var\(--theme-card-fill\) !important/s);
assert.match(roomCss, /#highscores-screen#highscores-screen \.hs-card\.modal-box\s*\{[^}]*background: var\(--green-clay-surface-soft\) !important/s);
assert.match(read('www/config.js').toString(), /ROOM_INTRO_TIMING = Object\.freeze\(\{ openAtMs: 2400, durationMs: 3200 \}\)/);
assert.match(read('www/game.js').toString(), /this\.playEasterRoomIntro\('leaderboard'/);
const topList = html.split('<div id="highscores-screen"')[1]?.split('<div id="settings-screen"')[0] || '';
assert.equal((topList.match(/data-leaderboard-control="identity"/g) || []).length, 1);
assert.equal((topList.match(/data-leaderboard-control="global"/g) || []).length, 2);
assert.equal((topList.match(/data-leaderboard-control="local"/g) || []).length, 2);
assert.ok(topList.includes('data-lang="hs_global_plain"'));
assert.ok(topList.includes('data-lang="hs_local_list"'));
assert.ok(html.includes('theme-leaderboard-room.css?v=5'));
assert.ok(html.indexOf('theme-leaderboard-room.js?v=2') < html.indexOf('toplista.js?v=5.0'));
for (const file of ['www/index.html', 'www/toplista.js', 'www/game.js']) {
    const source = read(file).toString();
    assert.doesNotMatch(source, /assets\/(?:easter|desert|severna)-soft-clay\/leaderboard\//);
}
assert.doesNotMatch(topList, /leaderboard-icon\.svg|hs-tab-soft-clay-icon|hs-panel-soft-clay-icon|🌍|📜/);
assert.match(read('www/toplista.js').toString(), /getThemeMedalSource\('leaderboard', medal\)/);
assert.match(read('www/game.js').toString(), /getThemeMedalSource\('leaderboard', medalAsset, activeTheme\)/);
assert.doesNotMatch(read('www/game.js').toString(), /waiting-podium-legacy/);
assert.match(read('www/config.js').toString(), /general-podium-\$\{tier\}-v2\.png\?v=2/);
assert.match(read('www/game.js').toString(), /leaderboardCanonical/);
assert.match(read('www/game.js').toString(), /role === 'leaderboard'.*leaderboard-room.*-v2\.png/);
assert.match(read('www/theme-main-room-icons.js').toString(), /role === 'leaderboard'.*leaderboard-room.*-v2\.png/);
assert.match(read('www/pravilaigre.js').toString(), /rulesCanonicalIcon\('leaderboard'\)/);
const runtimeList = { innerHTML: '' };
document.getElementById = () => runtimeList;
let runtimeTheme = 'dark';
document.body.classList.contains = value => value === `${runtimeTheme}-theme`;
const RuntimeTopList = vm.runInNewContext(read('www/toplista.js').toString() + '\nTopListManager', {
    document, window, console,
    localStorage: { getItem: () => null },
    getThemeMedalSource: (context, tier) => {
        assert.equal(context, 'leaderboard');
        return medalManifest.themes.find(group => group.id === runtimeTheme).assets
            .find(asset => asset.tier === tier).production.replace(/^www\//, '') + '?v=2';
    }
});
const runtimeManager = new RuntimeTopList({});
for (const theme of [...themes, 'dark']) {
    runtimeTheme = theme;
    const stateIcon = window.themeLeaderboard.asset('empty-loading', theme);
    for (const state of ['loading', 'empty', 'offline']) {
        const markup = runtimeManager._stateMarkup('Stanje liste', state);
        assert.ok(markup.includes(stateIcon), `${theme} ${state} must use its own state PNG`);
        assert.ok(markup.includes(`hs-list-state-${state}`));
    }
    for (const listId of ['global-hs-list', 'local-hs-list']) {
        runtimeManager.renderList([], listId);
        assert.ok(runtimeList.innerHTML.includes(stateIcon), `${theme} ${listId} empty state PNG`);
    }
    for (const [index, tier] of ['gold', 'silver', 'bronze'].entries()) {
        const medal = medalManifest.themes.find(group => group.id === theme).assets[index];
        assert.equal(medal.tier, tier);
        assert.ok(runtimeManager._podiumMarkup(index).includes(medal.production.replace(/^www\//, '')),
            `${theme} ${tier} medal must be canonical`);
    }
}
console.log('Leaderboard room: 30 individual medal, 27 control and 18 identity RGBA PNGs, 10 theme mappings and shared roles verified.');
