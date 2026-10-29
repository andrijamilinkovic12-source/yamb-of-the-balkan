const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const roles = ['intro-header', 'scanning', 'found', 'vs', 'disconnected', 'reconnected',
    'podium-gold', 'podium-silver', 'podium-bronze', 'empty-list', 'rematch-icon', 'rematch-button',
    'score', 'claim', 'record-panel', 'weekly', 'monthly', 'all-time', 'personal', 'power-index', 'ducat', 'reward-video'];
const html = read('www/index.html');
const game = read('www/game.js');
const roomCss = read('www/theme-online-random-room.css');
const finishCss = read('www/theme-online-random-finish.css');
const timing = read('www/config.js');
const introCss = read('www/theme-main-room-icons.css');
const method = game.match(/^    getThemeRoomSources\(theme, roomId\) \{[\s\S]*?(?=^    collectThemeSourcesFromRoot\()/m)?.[0];
assert(method, 'room asset resolver is missing');
const getRoomSources = vm.runInNewContext(`({${method}}).getThemeRoomSources`, {
    window: { themeLeaderboard: { asset: (_role, theme) => `${theme === 'dark' ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`}/canonical/leaderboard-controls/empty-loading-${theme === 'dark' ? 'v1' : 'v2'}.png` } },
    getThemeMedalSource: (_context, tier, theme) => `${theme === 'dark' ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`}/canonical/competition-medals/general-podium-${tier}-v2.png`
});
const fingerprint = file => crypto.createHash('sha256').update(file).digest('hex');
const byRole = new Map([['menu', new Set()], ...roles.map(role => [role, new Set()])]);

for (const theme of themes) {
    const base = theme === 'dark' ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`;
    const context = {
        onlineMode: true,
        getThemeLoadingPack: () => ({ assets: [] }),
        getThemeAssetRoot: () => `${base}/`,
        getOnlineRandomStateSource: (_theme, role) => role === 'header'
            ? `${base}/canonical/online-random-room-identity/online-random-room-v1.png`
            : theme === 'dark' ? `${base}/opponent/${role}-v1.png`
                : `${base}/canonical/online-random-states/${role}-v1.png`,
        getOnlineRematchSource: (_theme, role) => `${base}/canonical/online-random-rematch/rematch-${role}-v1.png`,
        getRewardedVideoPackSources: () => [`${base}/solo/finish-reward-video-v3.png`]
    };
    const room = getRoomSources.call(context, theme, 'opponent');
    const finish = getRoomSources.call(context, theme, 'gameOver');
    assert.equal(room.length, roles.length, `${theme}: expected ${roles.length} active room/finish sources`);
    assert.equal(finish.length, 12, `${theme}: expected 12 finish sources`);
    assert(finish.every(source => room.includes(source)), `${theme}: finish must use preloaded room sources`);
    const menu = `${base}/canonical/online-random-room-identity/online-random-room-menu-v1.png`;
    const assets = [['menu', menu], ...roles.map((role, index) => [role, room[index]])];
    assert.equal(assets.length, 23, `${theme}: exact Online Random PNG count`);
    for (const [role, source] of assets) {
        assert(!/\.svg(?:\?|$)/i.test(source), `${theme}/${role}: old SVG in active source`);
        assert(!/assets\/(?:easter|desert|severna)-soft-clay\/(?:opponent\/|mode-opponent)/.test(source),
            `${theme}/${role}: legacy PNG in active source`);
        const file = path.join(root, 'www', source.split('?')[0]);
        assert(fs.existsSync(file), `${theme}/${role}: missing ${source}`);
        const bytes = fs.readFileSync(file);
        assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${theme}/${role}: invalid PNG`);
        byRole.get(role).add(fingerprint(bytes));
    }
}
for (const [role, hashes] of byRole) assert.equal(hashes.size, themes.length, `${role}: artwork reused between themes`);
const waiting = html.slice(html.indexOf('<div id="waiting-screen"'), html.indexOf('<div id="global-chat-overlay"'));
const finish = html.slice(html.indexOf('<div id="game-over-screen"'), html.indexOf('<div id="waiting-screen"'));
assert(!/<svg\b/i.test(waiting) && !/<svg\b/i.test(finish), 'old SVG in Online Random or finish markup');
assert(!/assets\/(?:easter|desert|severna)-soft-clay\/opponent\//.test(waiting), 'legacy state asset linked in waiting room');
assert(!game.includes("opponent: path => path.startsWith('opponent/')"), 'legacy opponent preloader still active');
assert(timing.includes('openAtMs: 2400, durationMs: 3200') && introCss.includes('--room-intro-duration: 3.2s'), 'shared intro timing changed');
assert(game.includes("this.playEasterRoomIntro('opponent', () => this.setupOnline('random', { skipRoomIntro: true }))"), 'random room intro not used');
assert(roomCss.includes('--online-room-card: var(--theme-card-fill)') && roomCss.includes('--online-room-subcard: var(--theme-subcard-fill)'), 'theme material tokens missing');
assert(roomCss.includes('@media (max-height: 700px)') && finishCss.includes('@media (max-height: 700px)'), 'short phone layout missing');
assert(game.includes("const showRematch = !isTournament || isDraw;"), 'online duel rematch rule changed');

// Execute the actual pager decision with a minimal DOM; every online theme must
// expose the same room scope that its canonical reconnect PNG relies on.
const highlight = game.match(/^    highlightCurrentPlayer\(\) \{[\s\S]*?(?=^    toggleHold\()/m)?.[0];
assert(highlight);
for (const theme of themes) {
    const active = new Set();
    const scene = { classList: { toggle: (key,on) => on ? active.add(key) : active.delete(key) } };
    const run = vm.runInNewContext(`({${highlight}}).highlightCurrentPlayer`, {
        document: {
            querySelectorAll: () => [],
            getElementById: id => id === 'game-scene' ? scene : null,
            body: { classList: { contains: cls => cls === `${theme}-theme` } }
        },
        localStorage: { getItem: () => theme }, setTimeout
    });
    run.call({players:['A','B'],onlineMode:true,modeTag:'Online',currentPlayerIdx:0,roomId:'room_fixture',onlineDuelType:'random',inferOnlineDuelType:()=> 'random',updateHeaderAvatar(){}});
    assert(active.has('theme-dual-board-view') && active.has('online-duel-room') && active.has('random-online-duel-room'), `${theme}: online pager/reconnect scope missing`);
}
console.log('Online Random final: ten themes × 23 distinct active PNG roles, shared 3.2s intro, no active legacy PNG/SVG.');
