const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const viewports = ['', '-768x1024', '-320x568-font130'];
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const html = read('www/index.html');
const game = read('www/game.js');
const markup = html.split('<div id="undo-menu-overlay"')[1]?.split('<div id="custom-modal-overlay"')[0];
const ducatPack = read('www/theme-ducat-pack.js');
const undoPack = read('www/theme-undo-token-pack.js');
const undoManager = read('www/vracanjeupisa.js');
const ducatCss = read('www/theme-ducat-pack.css');
const undoCss = read('www/theme-undo-token-pack.css');
const rewardedPack = read('www/theme-rewarded-video-pack.js');
const intro = read('www/config.js');
const roomCss = read('www/theme-economy-room.css');
const managers = read('www/managers.js');
const notices = read('www/onlinenumber.js');
const countReport = JSON.parse(read('docs/theme-room-asset-counts.json'));
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const roles = ['identity', 'ducat-front', 'ducat-inline', 'undo-front', 'undo-inline',
    'reward-active', 'reward-unavailable', 'close'];
const hashes = Object.fromEntries(roles.map(role => [role, new Set()]));

assert(markup, 'Economy room markup missing');
assert(!/<svg\b|\.svg(?:\?|["'])/i.test(markup), 'Old SVG remains in economy markup');
assert(!/assets\/(?:easter|desert|severna)-soft-clay\//.test(markup),
    'Old PNG remains in economy markup');
assert(!/assets\/(?:easter|desert|severna)-soft-clay\/ducats-undo-pro/.test(game),
    'Old economy identity in active preload or intro fallback');
assert.match(intro, /ROOM_INTRO_TIMING\s*=\s*Object\.freeze\(\{\s*openAtMs:\s*2400,\s*durationMs:\s*3200\s*\}\)/);
assert(game.includes("this.playEasterRoomIntro('economy'"));
assert(ducatPack.includes("#economy-tab-ducats .economy-tab-green-soft-clay-icon"));
assert(ducatPack.includes(".economy-hero-ducat-icon-green"));
assert(undoPack.includes("#economy-tab-undo .economy-tab-green-soft-clay-icon"));
assert(undoPack.includes("#economy-header-undo-green-icon"));
assert(undoManager.includes("economy-header-ducats-green-icon")
    && undoManager.includes("economy-header-undo-green-icon"));
assert(ducatCss.includes("#economy-header-ducats-green-icon.hidden +")
    && undoCss.includes("#economy-header-undo-green-icon.hidden +"));
assert(!undoManager.includes("getElementById('economy-header-ducats-icon')"));
assert(rewardedPack.includes('rewarded-video-active-v1.png')
    && rewardedPack.includes('rewarded-video-unavailable-v1.png'));
assert(managers.includes("economyOpen ? 'economy' : treasuryOpen ? 'treasury' : tournamentOpen ? 'tournament' : ''"));
assert(notices.includes("toast.classList.add('economy-notice')"));
assert(roomCss.includes('modal-context-economy') && roomCss.includes('.custom-toast.economy-notice'));
assert(roomCss.includes('grid-template-columns: minmax(0, 1fr)')
    && roomCss.includes('.economy-reward-card strong { padding-left: 4px; gap: 4px; }'));
assert.equal(countReport.legacyEconomyReferences.occurrences, 0);

for (const theme of themes) {
    const prefix = theme === 'dark' ? 'assets/green-soft-clay/' : `assets/theme-packs/${theme}/`;
    const critical = ['easter', 'desert', 'severna'].includes(theme);
    const variant = relative => critical ? relative.replace('-v1.png', '-v2.png') : relative;
    const paths = {
        identity: `${prefix}ducats-undo-free-v${['winter', 'desert', 'moon', 'severna'].includes(theme) ? 4 : 3}.png`,
        'ducat-front': `${prefix}${variant('canonical/ducat/ducat-front-v1.png')}`,
        'ducat-inline': `${prefix}${variant('canonical/ducat/ducat-inline-v1.png')}`,
        'undo-front': `${prefix}${variant('canonical/undo-token/undo-token-front-v1.png')}`,
        'undo-inline': `${prefix}${variant('canonical/undo-token/undo-token-inline-v1.png')}`,
        'reward-active': `${prefix}${variant('canonical/rewarded-video/rewarded-video-active-v1.png')}`,
        'reward-unavailable': `${prefix}${variant('canonical/rewarded-video/rewarded-video-unavailable-v1.png')}`,
        close: `${prefix}canonical/room-controls/close-v1.png`
    };
    assert.equal(new Set(Object.values(paths)).size, 8, `${theme}: repeated PNG path`);
    for (const [role, source] of Object.entries(paths)) {
        const bytes = fs.readFileSync(path.join(root, 'www', source));
        assert(bytes.subarray(0, 8).equals(pngSignature), `${theme}/${role}: invalid PNG`);
        hashes[role].add(crypto.createHash('sha256').update(bytes).digest('hex'));
    }
    const inventory = countReport.themes[theme].rooms.economy;
    assert.equal(inventory.roles, 6);
    assert.equal(inventory.pngFiles, 8);
    assert.deepEqual(inventory.missing, []);
}
for (const [role, values] of Object.entries(hashes))
    assert.equal(values.size, themes.length, `${role}: theme asset was reused or recolored`);

const geometry = ['.economy-shell', '.economy-card-header', '.economy-tabs',
    '.economy-tabs .tab-btn', '.economy-card-body', '.economy-page-panel',
    '.economy-ad-grid', '.economy-reward-card'];
const typography = ['.global-chat-title', '.economy-reward-top span', '.economy-reward-card strong'];
for (const suffix of viewports) {
    const rows = JSON.parse(read(`docs/qa-theme-economy-room${suffix}.json`));
    assert.equal(rows.length, 20, `Missing theme/tab captures ${suffix}`);
    for (const tab of ['ducats', 'undo']) {
        const green = rows.find(row => row.theme === 'dark' && row.tab === tab);
        assert(green, `Missing Green ${tab} capture`);
        for (const theme of themes) {
            const row = rows.find(item => item.theme === theme && item.tab === tab);
            assert(row, `Missing ${theme}/${tab} capture`);
            for (const selector of geometry)
                assert.deepEqual(row.box[selector], green.box[selector],
                    `${theme}/${tab}${suffix}: ${selector} differs from Green`);
            for (const selector of typography) {
                assert.equal(row.css[selector].fontSize, green.css[selector].fontSize,
                    `${theme}/${tab}${suffix}: font size ${selector}`);
                assert.equal(row.css[selector].lineHeight, green.css[selector].lineHeight,
                    `${theme}/${tab}${suffix}: line height ${selector}`);
            }
            assert.deepEqual(row.selected, tab === 'ducats' ? [true, false] : [false, true]);
            assert(row.panelVisible && row.rewardButton, `${theme}/${tab}: panel or reward inaccessible`);
            assert.equal(row.rewardOnclick, tab === 'ducats'
                ? "app.claimCoinAdReward('rewarded')" : 'app.buyUndoTokens(1)');
            assert.equal(row.rewardState.activeVisibleWhenReady, true,
                `${theme}/${tab}: active video icon hidden when ready`);
            assert.equal(row.rewardState.unavailableVisibleWhenReady, false,
                `${theme}/${tab}: unavailable icon visible when ready`);
            assert(row.rewardState.activeSource.includes('rewarded-video-active')
                && row.rewardState.unavailableSource.includes('rewarded-video-unavailable'),
                `${theme}/${tab}: incorrect video states`);
            assert(row.bannerState.natural[0] > 0, `${theme}/${tab}: missing ad error icon`);
            assert.equal(row.images.length, 6, `${theme}/${tab}: visible PNG count`);
            assert.deepEqual(row.svg, [], `${theme}/${tab}: visible SVG`);
            assert(row.images.every(image => image.natural[0] > 0 && image.src.startsWith(
                theme === 'dark' ? 'assets/green-soft-clay/' : `assets/theme-packs/${theme}/`)),
                `${theme}/${tab}: broken or wrong-theme PNG`);
            assert(row.scroll[0] <= row.scroll[1] + 1 && row.overflow[0] <= row.overflow[1] + 1,
                `${theme}/${tab}: horizontal overflow`);
            const [x, y, width, height] = row.box['.economy-shell'];
            assert(x >= 0 && y >= 0 && x + width <= row.viewport[0] + 1
                && y + height <= row.viewport[1] + 1, `${theme}/${tab}: room crosses viewport`);
            if (suffix === '-320x568-font130' && tab === 'undo')
                assert(row.bottom?.scrollable && row.bottom?.rewardVisible,
                    `${theme}: reward unreachable on short phone`);
        }
    }
}
console.log('Economy final audit: 10 themes, 2 tabs, 8 unique PNG files per theme; no SVG in active markup; Green geometry and font sizes at three captured viewports.');
