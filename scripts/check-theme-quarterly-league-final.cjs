const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const manifest = JSON.parse(read('source-assets/theme-quarterly-league-v2/manifest.json'));
const expectedRoles = ['quarterly-league-room', 'tab-hall-of-fame', 'tab-medals', 'tab-champions',
    'rank-amater', 'rank-profi', 'rank-majstor', 'rank-legenda', 'rank-titan', 'rank-alltime',
    'medal-gold', 'medal-silver', 'medal-bronze'];
assert.deepEqual(manifest.themes.map(group => group.id), themes);

for (const group of manifest.themes) {
    assert.deepEqual(group.assets.map(asset => asset.role), expectedRoles, `${group.id}: PNG roles`);
    assert.equal(group.assets.flatMap(asset => asset.production).length, 14, `${group.id}: production PNG count`);
    for (const asset of group.assets) {
        assert.ok(fs.existsSync(path.join(root, asset.master)), `${group.id}: missing ${asset.master}`);
        assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, asset.master))).digest('hex'),
            asset.masterSha256, `${group.id}: changed master ${asset.role}`);
        for (const production of asset.production) {
            const bytes = fs.readFileSync(path.join(root, production.file));
            assert.equal(bytes.subarray(1, 4).toString(), 'PNG', production.file);
            assert.equal(bytes.readUInt32BE(16), production.size[0], production.file);
            assert.equal(bytes.readUInt32BE(20), production.size[1], production.file);
            assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), production.sha256,
                `${group.id}: changed production PNG ${production.file}`);
        }
    }
}

const config = read('www/config.js');
const league = read('www/kvartalnaliga.js');
const logo = read('www/theme-quarterly-league-room.js');
const game = read('www/game.js');
const html = read('www/index.html');
const css = read('www/theme-quarterly-league-room.css');
const surfaces = read('www/theme-card-surfaces.css');
const legacyCss = read('www/teme.css');

assert.match(config, /ROOM_INTRO_TIMING = Object\.freeze\(\{ openAtMs: 2400, durationMs: 3200 \}\)/);
assert.match(league, /window\.ROOM_INTRO_TIMING\?\.openAtMs/);
assert.match(league, /window\.ROOM_INTRO_TIMING\?\.durationMs/);
assert.match(league, /--league-intro-duration/);
assert.match(css, /animation-duration: var\(--league-intro-duration, 3200ms\) !important/);
assert.match(html, /id="league-intro"[\s\S]*?data-ql-logo="room"/);
assert.match(html, /main-league-watermark-zone ql-quarter-logo/);
assert.match(logo, /Europe\/Belgrade/);
assert.match(logo, /data-ql-quarter=/);
assert.match(game, /showQuarterWinnerModal\(data\)/);
assert.match(game, /getThemeMedalSource\('quarterlyLeague', 'gold', activeQlWinnerTheme\)/);
assert.match(game, /ThemeQuarterlyLeagueRoom\.markup\('room', data\.quarter\)/);

for (const [selector, size] of [['league-tab-soft-clay-icon', 28], ['league-rank-soft-clay-badge', 46],
    ['league-current-rank-soft-clay-badge', 38]]) {
    assert.match(css, new RegExp(`${selector}[\\s\\S]*?${size}px !important;`), `${selector} geometry`);
}
assert.match(css, /#winner-modal-overlay \.ql-quarter-champion-medal \{[\s\S]*?width: clamp\(38px, 6vh, 50px\) !important/);
for (const selector of ['quarter-winner-title', 'quarter-winner-period', 'quarter-winner-name',
    'quarter-winner-points', 'quarter-winner-message', 'quarter-winner-action']) {
    assert.match(css, new RegExp(`#winner-modal-overlay \\.${selector} \\{[\\s\\S]*?var\\(--theme-card-`),
        `${selector} needs themed color`);
}
assert.match(surfaces, /#winner-modal-overlay > \.quarter-winner-card \{[\s\S]*?max-height: 100% !important/);
assert.doesNotMatch(legacyCss, /quarterly-league-room-menu-v1\.png/);
assert.doesNotMatch(league + logo + html, /quarterly-league-icon\.svg|quarterly-league-room(?:-menu)?-v1\.png/);
assert.ok(!fs.existsSync(path.join(root, 'www/assets/quarterly-league-icon.svg')));

function luminance(hex) {
    const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255);
    const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
}
function contrast(a, b) {
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
for (const theme of themes.slice(1)) {
    const palette = surfaces.match(new RegExp(`body\\.${theme}-theme\\s*\\{([^}]+)\\}`))?.[1];
    assert.ok(palette, `${theme}: surface palette`);
    const token = name => palette.match(new RegExp(`--theme-card-${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1];
    const roomOverride = css.match(new RegExp(`body\\.${theme}-theme #league-modal-overlay\\s*\\{([^}]+)\\}`))?.[1] || '';
    const muted = roomOverride.match(/--ql-muted-text:\s*(#[0-9A-Fa-f]{6})/)?.[1] || token('muted');
    for (const [text, foreground] of [['ink', token('ink')], ['muted', muted]]) for (const material of ['surface', 'raised', 'inset']) {
        assert.ok(contrast(foreground, token(material)) >= 4.5,
            `${theme}: ${text} on ${material} below 4.5:1`);
    }
    assert.ok(contrast(token('muted'), token('surface')) >= 4.5, `${theme}: winner period below 4.5:1`);
}

console.log('Kvartalna liga: 10 tema × 13 mastera / 14 produkcionih PNG, intro 2.4/3.2 s, kanonske putanje, zajednicke mere, tematske boje i proglasenje provereni.');
