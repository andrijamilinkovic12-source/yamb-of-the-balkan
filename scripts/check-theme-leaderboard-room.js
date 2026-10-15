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
assert.match(roomCss, /#global-hs-list,#local-hs-list[^\{]*\.hs-state-canonical-icon\s*\{[^}]*width:\s*86px[^}]*height:\s*86px/s);
assert.match(roomCss, /#highscores-screen#highscores-screen \.hs-card\.modal-box\s*\{[^}]*width:\s*min\(760px/s);
const topList = html.split('<div id="highscores-screen"')[1]?.split('<div id="settings-screen"')[0] || '';
assert.equal((topList.match(/data-leaderboard-control="identity"/g) || []).length, 1);
assert.equal((topList.match(/data-leaderboard-control="global"/g) || []).length, 2);
assert.equal((topList.match(/data-leaderboard-control="local"/g) || []).length, 2);
assert.ok(topList.includes('data-lang="hs_global_plain"'));
assert.ok(topList.includes('data-lang="hs_local_list"'));
assert.ok(html.includes('theme-leaderboard-room.css?v=3'));
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
assert.match(read('www/pravilaigre.js').toString(), /data-leaderboard-control="identity"/);
console.log('Leaderboard room: 30 individual medal, 27 control and 18 identity RGBA PNGs, 10 theme mappings and shared roles verified.');
