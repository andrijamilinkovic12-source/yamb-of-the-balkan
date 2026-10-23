const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const sizes = ['', '-320x568', '-768x1024', '-320x568-font130'];
const roles = ['identity', 'state', 'search', 'friend', 'spectate', 'duel', 'avatar', 'close'];
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const html = read('www/index.html');
const game = read('www/game.js');
const list = read('www/onlinenumber.js');
const roomCss = read('www/theme-online-players-room.css');
const cardCss = read('www/theme-card-surfaces.css');
const closeCss = read('www/theme-room-close-controls.css');
const iconMapper = read('www/theme-main-room-icons.js');
const intro = read('www/config.js');
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const hashes = Object.fromEntries(roles.map(role => [role, new Set()]));

assert.match(intro, /ROOM_INTRO_TIMING\s*=\s*Object\.freeze\(\{\s*openAtMs:\s*2400,\s*durationMs:\s*3200\s*\}\)/);
assert(game.includes("this.playEasterRoomIntro('onlinePlayers'"));
assert(game.includes("onlinePlayers: path => path === 'canonical/online-players-room-identity/online-players-room-v1.png'"));
assert(!/assets\/(?:easter|desert|severna)-soft-clay\/online-players-pro/.test(game));
assert(!/\.svg(?:\?|["'])/i.test(html.split('<div id="online-players-overlay"')[1].split('</div>\n\n')[0]));
assert(list.includes("contextClass: 'online-players'") && roomCss.includes('modal-context-online-players'));
assert(list.includes("className: 'online-players-notice'") && roomCss.includes('.custom-toast.online-players-notice'));
assert(html.includes('placeholder="Pretraži po imenu..."'));

const cssBlock = (source, marker) => {
    const start = source.indexOf(marker);
    assert(start >= 0, `Missing CSS marker: ${marker}`);
    return source.slice(start, source.indexOf('}', start));
};
const token = (block, name) => {
    const value = block.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1];
    assert(value, `Missing --${name}`);
    return value;
};
const luminance = hex => hex.slice(1).match(/../g)
    .map(part => parseInt(part, 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
const contrast = (a, b) => {
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
};
let minContrast = Infinity;

for (const theme of themes) {
    const pack = `assets/theme-packs/${theme}`;
    const identity = theme === 'dark'
        ? 'assets/green-soft-clay/canonical/online-players-room-identity/online-players-room-v1.png'
        : `${pack}/canonical/online-players-room-identity/online-players-room-v1.png`;
    const assets = {
        identity,
        ...Object.fromEntries(['state', 'search', 'friend', 'spectate', 'duel', 'avatar']
            .map(role => [role, `${pack}/canonical/online-players-internal/${role}-v1.png`])),
        close: `assets/${theme === 'dark' ? 'green-soft-clay' : `theme-packs/${theme}`}/canonical/room-controls/close-v1.png`
    };
    assert.deepEqual(Object.keys(assets), roles);
    assert.equal(new Set(Object.values(assets)).size, 8, `${theme}: duplicated role path`);
    for (const [role, asset] of Object.entries(assets)) {
        const bytes = fs.readFileSync(path.join(root, 'www', asset));
        assert(bytes.subarray(0, 8).equals(pngSignature), `${theme}/${role}: not PNG`);
        hashes[role].add(crypto.createHash('sha256').update(bytes).digest('hex'));
    }
    assert(closeCss.includes(assets.close), `${theme}: close X not mapped`);
    if (theme === 'dark') assert(html.includes(identity), 'Green room identity not linked');
    else assert(iconMapper.includes('canonical/${role}-room-identity/${role}-room'),
        `${theme}: room identity mapper missing`);
    const palette = cssBlock(roomCss, theme === 'dark'
        ? '#online-players-overlay {' : `body.${theme}-theme #online-players-overlay {`);
    for (const [foreground, background] of [
        ['heading', 'raised'], ['ink', 'raised'], ['ink', 'inset'],
        ['muted', 'inset'], ['muted', 'surface']
    ]) {
        const value = contrast(token(palette, `op-${foreground}`), token(palette, `op-${background}`));
        minContrast = Math.min(minContrast, value);
        assert(value >= 4.5, `${theme}: room contrast ${value.toFixed(2)}:1`);
    }
    if (theme !== 'dark') {
        const card = cssBlock(cardCss, `body.${theme}-theme`);
        for (const [foreground, background] of [
            ['theme-card-ink', 'theme-card-surface'],
            ['theme-card-ink', 'theme-card-raised'],
            ['theme-card-surface', 'theme-card-primary']
        ]) {
            const value = contrast(token(card, foreground), token(card, background));
            minContrast = Math.min(minContrast, value);
            assert(value >= 4.5, `${theme}: notice contrast ${value.toFixed(2)}:1`);
        }
    }
}
for (const [role, values] of Object.entries(hashes))
    assert.equal(values.size, 10, `${role}: PNG must be unique per theme`);

const geometry = [
    '.online-players-shell', '.online-players-header', '.online-players-search-wrap',
    '#online-players-body', '.online-player-card', '.theme-online-avatar',
    '.online-player-actions', '.online-player-action', '.theme-online-action-icon'
];
const typography = [
    '.online-players-title', '.online-players-search', '.online-player-name',
    '.online-player-action'
];
for (const suffix of sizes) {
    const rows = JSON.parse(read(`docs/qa-theme-online-players-room${suffix}.json`));
    assert.deepEqual(rows.map(row => row.theme), themes, `Missing QA coverage ${suffix}`);
    const green = rows[0];
    for (const row of rows) {
        assert.equal(row.active, row.theme, `${row.theme}: wrong active theme`);
        for (const selector of geometry)
            assert.deepEqual(row.box[selector], green.box[selector], `${row.theme}${suffix}: ${selector} differs from Green`);
        for (const selector of typography) {
            assert.equal(row.css[selector].size, green.css[selector].size, `${row.theme}${suffix}: font size ${selector}`);
            assert.equal(row.css[selector].weight, green.css[selector].weight, `${row.theme}${suffix}: font weight ${selector}`);
        }
        const [x, y, width, height] = row.box['.online-players-shell'];
        assert(x >= 0 && y >= 0 && x + width <= row.viewport[0] + 1 && y + height <= row.viewport[1] + 1,
            `${row.theme}${suffix}: room crosses viewport`);
        assert(row.scroll[0] <= row.scroll[1] + 1 && row.scroll[2] <= row.scroll[3] + 1,
            `${row.theme}${suffix}: unexpected overflow`);
        assert(row.images.every(image => image.visible === 'visible' && image.natural[0] > 0),
            `${row.theme}${suffix}: icon not decoded in QA capture`);
    }
}
console.log(`Online Players final audit: 10 themes, 8 unique active PNG roles per theme; Green geometry and font sizes at four viewports. Minimum checked palette/notice contrast: ${minContrast.toFixed(2)}:1.`);
