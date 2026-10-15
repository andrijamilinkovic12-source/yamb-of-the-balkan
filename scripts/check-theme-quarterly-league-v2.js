const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const roles = ['tab-hall-of-fame', 'tab-medals', 'tab-champions'];
const ranks = ['amater', 'profi', 'majstor', 'legenda', 'titan', 'alltime'];
const medals = ['gold', 'silver', 'bronze'];
const signatures = new Set();

function png(relative, size) {
    const filename = path.join(root, 'www', relative);
    assert.ok(fs.existsSync(filename), `${relative} is missing`);
    const header = fs.readFileSync(filename).subarray(0, 26);
    assert.equal(header.subarray(1, 4).toString(), 'PNG');
    assert.equal(header.readUInt32BE(16), size, `${relative} width`);
    assert.equal(header.readUInt32BE(20), size, `${relative} height`);
    assert.equal(header[25], 6, `${relative} must be RGBA`);
    return filename;
}

for (const theme of themes) {
    const canonical = theme === 'dark' ? 'assets/green-soft-clay/canonical'
        : `assets/theme-packs/${theme}/canonical`;
    const identity = `${canonical}/quarterly-league-room-identity`;
    const room = png(`${identity}/quarterly-league-room-v2.png`, 512);
    png(`${identity}/quarterly-league-room-menu-v2.png`, 384);
    const signature = require('node:crypto').createHash('sha256').update(fs.readFileSync(room)).digest('hex');
    assert.ok(!signatures.has(signature), `${theme} reuses another theme's logo PNG`);
    signatures.add(signature);
    for (const role of roles) png(`${canonical}/quarterly-navigation/${role}-v2.png`, 256);
    for (const rank of ranks) png(`${canonical}/quarterly-rank-badges/rank-${rank}-v2.png`, 256);
    for (const medal of medals) png(`${canonical}/competition-medals/quarterly-league-${medal}-v2.png`, 256);
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'source-assets/theme-quarterly-league-v2/manifest.json'), 'utf8'));
assert.equal(manifest.themes.length, themes.length);
for (const group of manifest.themes) {
    assert.equal(group.assets.length, 13, `${group.id} needs identity, three navigation, six rank and three medal masters`);
    assert.equal(group.assets.reduce((total, asset) => total + asset.production.length, 0), 14);
}
const config = fs.readFileSync(path.join(root, 'www/config.js'), 'utf8');
assert.match(config, /context === 'quarterlyLeague'[\s\S]*quarterly-league-\$\{tier\}-v2\.png/);
const resolverStart = config.indexOf('function getThemeMedalSource(');
const resolverEnd = config.indexOf('\nfunction getThemeTreasuryControlSource(', resolverStart);
assert.ok(resolverStart >= 0 && resolverEnd > resolverStart);
const resolveMedal = vm.runInNewContext(
    `${config.slice(resolverStart, resolverEnd)}; getThemeMedalSource`,
    { localStorage: { getItem: () => 'dark' } }
);
for (const theme of themes) {
    const canonical = theme === 'dark' ? 'assets/green-soft-clay/canonical'
        : `assets/theme-packs/${theme}/canonical`;
    for (const tier of medals) {
        assert.equal(resolveMedal('quarterlyLeague', tier, theme),
            `${canonical}/competition-medals/quarterly-league-${tier}-v2.png?v=2`);
    }
}

const roomCss = fs.readFileSync(path.join(root, 'www/theme-quarterly-league-room.css'), 'utf8');
for (const [selector, size] of [
    ['league-tab-soft-clay-icon', 28],
    ['league-rank-soft-clay-badge', 46],
    ['league-current-rank-soft-clay-badge', 38],
    ['ql-placement-medal', 24]
]) {
    assert.match(roomCss, new RegExp(`${selector}[^}]*\\{[^}]*width: ${size}px !important;[^}]*height: ${size}px !important;`, 's'),
        `${selector} must keep Green's room dimensions`);
}
assert.match(roomCss, /main-league-watermark-zone\.ql-quarter-logo\s*\{[^}]*opacity: 1 !important;/s,
    'the menu watermark must not receive a second opacity reduction');

const source = fs.readFileSync(path.join(root, 'www/theme-quarterly-league-room.js'), 'utf8');
for (const [month, expected] of [[2, 1], [5, 2], [8, 3], [11, 4]]) {
    const FixedDate = class extends Date { constructor() { super(`2026-${String(month).padStart(2, '0')}-15T12:00:00Z`); } };
    const browser = { ThemeQuarterlyLeagueRoom: null };
    const context = {
        Date: FixedDate, Intl, window: browser,
        document: { readyState: 'loading', addEventListener() {} },
        localStorage: { getItem: () => 'neon' }, Image: class {}, requestAnimationFrame() {},
        MutationObserver: class {}, setInterval() {}, console
    };
    vm.runInNewContext(source, context, { filename: 'theme-quarterly-league-room.js' });
    assert.equal(browser.ThemeQuarterlyLeagueRoom.quarter(), expected);
    const markup = browser.ThemeQuarterlyLeagueRoom.markup('room');
    assert.match(markup, new RegExp(`data-ql-quarter="${expected}"`));
    assert.match(markup, /theme-packs\/neon\/canonical\/quarterly-league-room-identity\/quarterly-league-room-v2\.png/);
}

console.log('Quarterly League V2: ten unique logos, 30 navigation icons, 60 ranks, 30 medals and all four quarter states verified.');
