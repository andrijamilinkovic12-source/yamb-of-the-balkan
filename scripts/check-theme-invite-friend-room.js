const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative));
const manifest = JSON.parse(read('source-assets/theme-invite-friend-internal-v1/manifest.json'));
const definitions = JSON.parse(read('docs/theme-definitions.json'));
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const luminance = hex => {
    const channels = hex.match(/[a-f\d]{2}/gi).slice(0, 3).map(channel => parseInt(channel, 16) / 255)
        .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
};
const contrast = (a, b) => {
    const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (lighter + .05) / (darker + .05);
};
assert.deepEqual(manifest.themes, themes);
assert.deepEqual(manifest.roles, ['send', 'empty']);
assert.equal(manifest.items.length, 20);
assert.ok(definitions.inviteFriendRoomRules);

const hashes = new Set();
const activeHashesByRole = new Map();
for (const item of manifest.items) {
    assert.ok(themes.includes(item.theme) && manifest.roles.includes(item.role));
    for (const [file, expected] of [[item.source, item.sourceSha256], [item.production, item.productionSha256]]) {
        const content = read(file);
        assert.equal(content.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', file);
        assert.equal(crypto.createHash('sha256').update(content).digest('hex'), expected, file);
    }
    const production = read(item.production);
    assert.equal(production.readUInt32BE(16), 256);
    assert.equal(production.readUInt32BE(20), 256);
    assert.equal(production[25], 6, `${item.production} must be RGBA`);
    assert.ok(!hashes.has(item.productionSha256), `${item.production} duplicates another drawing`);
    hashes.add(item.productionSha256);
}

let activeTheme = 'dark';
const header = { src: '', getAttribute(name) { return name === 'src' ? this.src : null; } };
const roleImage = role => ({ dataset: { inviteRole: role }, src: '', getAttribute(name) { return name === 'src' ? this.src : null; } });
const send = roleImage('send');
const empty = roleImage('empty');
const power = roleImage('power');
const search = roleImage('search');
const document = {
    readyState: 'loading',
    body: { classList: { contains: name => name === `${activeTheme}-theme` } },
    addEventListener() {},
    querySelector: selector => selector === '#waiting-screen .green-invite-header-icon' ? header : null,
    querySelectorAll: selector => selector === 'img[data-invite-role]' ? [send, empty, power, search] : []
};
const window = {};
class MockImage { set src(value) { this.source = value; } decode() { return Promise.resolve(); } }
vm.runInNewContext(read('www/theme-invite-friend-room.js').toString(), { window, document, Image: MockImage, MutationObserver: class {} });

for (const theme of themes) {
    activeTheme = theme;
    window.themeInviteFriend.apply();
    const expectedIdentity = theme === 'dark'
        ? 'assets/green-soft-clay/canonical/invite-friend-room-identity/invite-friend-room-v1.png?v=1'
        : `assets/theme-packs/${theme}/canonical/invite-friend-room-identity/invite-friend-room-v1.png?v=1`;
    assert.equal(header.src, expectedIdentity, `${theme} room identity`);
    assert.equal(send.src, `assets/theme-packs/${theme}/canonical/invite-friend-internal/send-v1.png?v=1`);
    assert.equal(empty.src, `assets/theme-packs/${theme}/canonical/invite-friend-internal/empty-v1.png?v=1`);
    const expectedPower = theme === 'dark'
        ? 'assets/green-soft-clay/canonical/statistics-overview/power-index-v1.png?v=1'
        : `assets/theme-packs/${theme}/canonical/statistics-overview/power-index-v1.png?v=1`;
    assert.equal(power.src, expectedPower, `${theme} Power Index`);
    assert.ok(fs.existsSync(path.join(root, 'www', expectedPower.split('?')[0])));
    assert.equal(search.src, `assets/theme-packs/${theme}/canonical/online-players-internal/search-v1.png?v=2`);
    assert.ok(fs.existsSync(path.join(root, 'www', search.src.split('?')[0])));
    assert.ok(fs.existsSync(path.join(root, 'www', window.themeInviteFriend.asset('friend', theme).split('?')[0])));
    assert.ok(fs.existsSync(path.join(root, 'www', expectedIdentity.split('?')[0])));

    const packRoot = theme === 'dark' ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`;
    const closeVersion = ['light', 'severna'].includes(theme) ? 4 : 3;
    const activeRoles = {
        menu: `${packRoot}/canonical/invite-friend-room-identity/invite-friend-room-menu-v1.png`,
        introAndHeader: expectedIdentity.split('?')[0],
        send: send.src.split('?')[0],
        empty: empty.src.split('?')[0],
        friend: window.themeInviteFriend.asset('friend', theme).split('?')[0],
        search: search.src.split('?')[0],
        power: expectedPower.split('?')[0],
        close: `${packRoot}/canonical/room-controls/close-v1.png`
    };
    assert.equal(Object.keys(activeRoles).length, 8, `${theme} active PNG role count`);
    assert.equal(new Set(Object.values(activeRoles)).size, 8, `${theme} active PNG path count`);
    for (const [role, assetPath] of Object.entries(activeRoles)) {
        const png = read(`www/${assetPath}`);
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${theme}/${role}`);
        if (!activeHashesByRole.has(role)) activeHashesByRole.set(role, new Set());
        const hash = crypto.createHash('sha256').update(png).digest('hex');
        assert.ok(!activeHashesByRole.get(role).has(hash), `${theme}/${role} repeats another theme drawing`);
        activeHashesByRole.get(role).add(hash);
    }
    const closeCss = read('www/theme-room-close-controls.css').toString();
    assert.ok(closeCss.includes(`${activeRoles.close}?v=${closeVersion}`), `${theme} canonical close mapping`);

    const palette = definitions.themes.find(item => item.id === theme).paletteHex;
    if (palette) for (const surface of ['surface', 'raised']) for (const ink of ['text', 'textMuted', 'primary']) {
        assert.ok(contrast(palette[ink], palette[surface]) >= 4.5,
            `${theme} ${ink} on ${surface}: ${contrast(palette[ink], palette[surface]).toFixed(2)}:1`);
    }
}

const html = read('www/index.html').toString();
const game = read('www/game.js').toString();
const inviteAssets = read('www/theme-invite-friend-room.js').toString();
const style = read('www/style.css').toString();
const inviteStyle = read('www/theme-invite-friend-room.css').toString();
assert.match(html, /id="share-area"/);
assert.match(html, /id="invite-link"/);
assert.match(style, /\.ws-share-area \{ display: none !important; \}/);
assert.match(inviteStyle, /#waiting-screen#waiting-screen\.is-hosting-invite \.ws-share-area \{ display: none !important; \}/);
assert.doesNotMatch(inviteStyle, /\.ws-share-area:not\(\.hidden\)\s*\{[^}]*display:\s*flex/s);
assert.doesNotMatch(game, /shareArea\.classList\.remove\('hidden'\)/);
assert.match(game, /if \(shareArea\) shareArea\.classList\.add\('hidden'\)/);
assert.match(game, /document\.getElementById\('share-area'\)\?\.classList\.add\('hidden'\)/);
assert.match(game, /async shareInvite\(\)/);
assert.match(definitions.inviteFriendRoomRules.behavior, /nisu vidljivi/);
assert.match(game, /if \(linkInput\) linkInput\.value = shareUrl/);
assert.match(game, /Odaberite prijatelja iz liste ili dodajte novog!/);
assert.doesNotMatch(game, /Pošaljite link, odaberite prijatelja/);
assert.match(html, /theme-invite-friend-room\.js/);
assert.match(game, /data-invite-role="send"/);
assert.match(game, /data-invite-role="empty"/);
assert.match(game, /data-invite-role="friend"/);
assert.match(game, /data-invite-role="power"/);
assert.match(game, /data-invite-role="search"/);
assert.doesNotMatch(game.slice(game.indexOf('renderFriendsList('), game.indexOf('async resolveFriendRequest(')), /<svg\b|\.svg\b|assets\/(?:easter|desert|severna)-soft-clay\//i);
assert.doesNotMatch(`${game}\n${inviteAssets}`, /assets\/(?:green|easter|desert|severna)-soft-clay\/invite\/|assets\/(?:easter|desert|severna)-soft-clay\/mode-invite/i);
assert.doesNotMatch(html.slice(html.indexOf('<div id="waiting-screen"'), html.indexOf('<style>', html.indexOf('<div id="waiting-screen"'))), /<svg\b|\.svg\b/i);
assert.match(game, /className: 'invite-room-toast'/);
assert.match(inviteStyle, /\.custom-toast\.invite-room-toast/);
assert.match(game, /invite-friend-search-form/);
assert.match(game, /searchAndAddFriend\(name = null\)/);
assert.equal((html.match(/data-invite-role="power"/g) || []).length, 3);
assert.match(game, /ws_msg_join_invite/);
assert.match(game, /this\.playEasterRoomIntro\('invite'/);
assert.match(game, /const isIconOnly = !!roomPackIcon/);
assert.match(game, /\}, window\.ROOM_INTRO_TIMING\?\.openAtMs \?\? 2400\)/);
assert.match(game, /\}, window\.ROOM_INTRO_TIMING\?\.durationMs \?\? 3200\)/);
console.log('Invite Friend room: eight active PNG roles in each of ten themes, 20 unique room PNG drawings and canonical mappings verified.');
