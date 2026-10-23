const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const viewports = ['', '-320x568', '-768x1024', '-320x568-font130'];
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const html = read('www/index.html');
const game = read('www/game.js');
const chat = read('www/globalchat.js');
const iconMapper = read('www/theme-main-room-icons.js');
const introConfig = read('www/config.js');
const roomCss = read('www/theme-global-chat-room.css');
const baseThemeCss = read('www/teme.css');
const cardCss = read('www/theme-card-surfaces.css');
const closeCss = read('www/theme-room-close-controls.css');
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const hashes = { identity: new Set(), empty: new Set(), send: new Set(), close: new Set() };

const luminance = hex => {
    const channels = hex.slice(1).match(/../g).map(part => parseInt(part, 16) / 255)
        .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return channels.reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
};
const contrast = (a, b) => {
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
};
const cssThemeBlock = (source, theme) => {
    const start = source.indexOf(`body.${theme}-theme`);
    assert(start >= 0, `Missing ${theme} CSS tokens`);
    const open = source.indexOf('{', start);
    return source.slice(open, source.indexOf('}', open) + 1);
};
const token = (source, name) => {
    const value = source.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1];
    assert(value, `Missing --${name}`);
    return value;
};

assert.match(introConfig, /ROOM_INTRO_TIMING\s*=\s*Object\.freeze\(\{\s*openAtMs:\s*2400,\s*durationMs:\s*3200\s*\}\)/);
assert(game.includes("this.playEasterRoomIntro('globalChat'"));
assert(game.includes("globalChat: path => path.startsWith('canonical/global-chat-internal/')"));
assert(game.includes('canonical/${role}-room-identity/${role}-room'));
assert(chat.includes("contextClass: 'global-chat'"));
assert(roomCss.includes('#custom-modal-overlay.modal-context-global-chat'));
assert(iconMapper.includes('canonical/global-chat-internal/${role}-v1.png'));
assert(!/assets\/(?:easter|desert|severna)-soft-clay\/global-chat-(?:pro|empty-pro|send-pro)/.test(game));
assert(!/<(?:svg|img)[^>]+\.svg(?:\?|["'])/i.test(html.split('<div id="global-chat-overlay"')[1].split('<div id="online-players-overlay"')[0]));

let minimumContrast = Infinity;
const greenStatusColor = baseThemeCss.match(/#global-chat-overlay \.global-chat-status\s*\{\s*color:\s*(#[0-9a-f]{6})/i)?.[1];
assert(greenStatusColor, 'Missing Green chat status color');
for (const greenFooterStop of ['#53774c', '#2c4e30']) {
    const value = contrast(greenStatusColor, greenFooterStop);
    minimumContrast = Math.min(minimumContrast, value);
    assert(value >= 4.5, `Green chat status contrast ${value.toFixed(2)}:1`);
}
for (const theme of themes) {
    const assetRoot = theme === 'dark' ? 'green-soft-clay' : `theme-packs/${theme}`;
    const sources = {
        identity: `assets/${assetRoot}/canonical/global-chat-room-identity/global-chat-room-v1.png`,
        empty: theme === 'dark'
            ? 'assets/green-soft-clay/global-chat-empty-v1.png'
            : `assets/${assetRoot}/canonical/global-chat-internal/empty-state-v1.png`,
        send: theme === 'dark'
            ? 'assets/green-soft-clay/global-chat-send-v1.png'
            : `assets/${assetRoot}/canonical/global-chat-internal/send-v1.png`,
        close: `assets/${assetRoot}/canonical/room-controls/close-v1.png`
    };
    assert.equal(new Set(Object.values(sources)).size, 4, `${theme} must have four distinct active PNGs`);
    for (const [role, relative] of Object.entries(sources)) {
        const file = path.join(root, 'www', relative);
        assert(fs.existsSync(file), `Missing ${theme}/${role}: ${relative}`);
        const data = fs.readFileSync(file);
        assert(data.subarray(0, 8).equals(pngSignature), `Invalid ${theme}/${role} PNG`);
        hashes[role].add(crypto.createHash('sha256').update(data).digest('hex'));
    }
    assert(closeCss.includes(sources.close), `Close button is not linked in ${theme}`);
    if (theme === 'dark') {
        assert(html.includes(sources.identity) && html.includes(sources.empty) && html.includes(sources.send));
    } else {
        assert(iconMapper.includes('canonical/${role}-room-identity/${role}-room'), `${theme} room identity mapper missing`);
        const room = cssThemeBlock(roomCss, theme);
        const card = cssThemeBlock(cardCss, theme);
        const checks = [
            [token(room, 'gc-ink'), token(room, 'gc-surface')],
            [token(room, 'gc-ink'), token(room, 'gc-raised')],
            [token(room, 'gc-danger'), token(room, 'gc-raised')],
            [token(card, 'theme-card-ink'), token(card, 'theme-card-surface')],
            [token(card, 'theme-card-ink'), token(card, 'theme-card-raised')],
            [token(card, 'theme-card-surface'), token(card, 'theme-card-primary')]
        ];
        for (const pair of checks) {
            const value = contrast(...pair);
            minimumContrast = Math.min(minimumContrast, value);
            assert(value >= 4.5, `${theme} chat or notice contrast ${value.toFixed(2)}:1`);
        }
    }
}
for (const [role, set] of Object.entries(hashes))
    assert.equal(set.size, themes.length, `The ${role} PNG must be unique in every theme`);

let layoutContrast = Infinity;
for (const suffix of viewports) {
    const rows = JSON.parse(read(`docs/qa-theme-global-chat-layout${suffix}.json`));
    assert.deepEqual(rows.map(row => row.theme), themes, `Missing viewport/theme coverage ${suffix}`);
    for (const row of rows) {
        assert.equal(row.differences?.length || 0, 0, `${row.theme}${suffix} differs from Green layout or typography`);
        const [x, y, width, height] = row.data.shell.rect;
        assert(x >= 0 && y >= 0 && x + width <= row.viewport[0] + 1 && y + height <= row.viewport[1] + 1,
            `${row.theme}${suffix} room crosses the viewport`);
        assert(row.bodyScroll[0] <= row.bodyScroll[1] + 1, `${row.theme}${suffix} has horizontal body overflow`);
        if (row.theme === 'dark') continue;
        for (const value of Object.values(row.contrast)) {
            if (value == null) continue;
            layoutContrast = Math.min(layoutContrast, value);
            assert(value >= 4.5, `${row.theme}${suffix} has text contrast ${value}:1`);
        }
    }
}
console.log(`Global Chat final audit: 10 themes, 4 unique active PNGs each; Green geometry and typography at four viewports. Minimum measured text contrast ${layoutContrast.toFixed(2)}:1; palette/notice token floor ${minimumContrast.toFixed(2)}:1.`);
