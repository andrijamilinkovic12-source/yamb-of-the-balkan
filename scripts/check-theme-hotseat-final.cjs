const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const html = read('www/index.html');
const game = read('www/game.js');
const css = read('www/theme-solo-results.css');
const compact = read('www/theme-finish-compact.css');
const themeCss = read('www/teme.css');
const timing = read('www/config.js');
const introCss = read('www/theme-main-room-icons.css');
const hex = file => crypto.createHash('sha256').update(file).digest('hex');
const roles = theme => {
    const green = theme === 'dark';
    const base = green ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`;
    const solo = `${base}/canonical/solo-results`;
    const hotseat = `${base}/canonical/hotseat-room-identity`;
    return {
        menu: `${hotseat}/hotseat-room-menu-v1.png`,
        intro: `${hotseat}/hotseat-room-v1.png`,
        avatar: `assets/theme-packs/${theme}/canonical/online-players-internal/avatar-v1.png`,
        score: `${solo}/finish-score-mark-v1.png`,
        claim: `${solo}/finish-claim-v1.png`,
        panel: `${solo}/record-panel-v2.png`,
        video: `${base}/solo/finish-reward-video-v3.png`,
        power: `${base}/canonical/statistics-overview/power-index-v1.png`,
        ducat: `${base}/canonical/ducat/ducat-inline-v${['easter', 'desert', 'severna'].includes(theme) ? 2 : 1}.png`,
        ...Object.fromEntries(['weekly', 'monthly', 'all_time', 'personal'].map(role => [role, `${base}/canonical/solo-record-icons/${role}-v1.png`]))
    };
};

const byRole = new Map();
for (const theme of themes) {
    const entries = Object.entries(roles(theme));
    assert.equal(entries.length, 13, `${theme}: Hotseat PNG role count`);
    for (const [role, relative] of entries) {
        const absolute = path.join(root, 'www', relative);
        assert(fs.existsSync(absolute), `${theme}/${role}: missing ${relative}`);
        const buffer = fs.readFileSync(absolute);
        assert(buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${theme}/${role}: invalid PNG`);
        if (!byRole.has(role)) byRole.set(role, new Set());
        byRole.get(role).add(hex(buffer));
    }
}
for (const [role, fingerprints] of byRole) assert.equal(fingerprints.size, themes.length, `${role}: themes must have distinct PNG artwork`);

const finishMarkup = html.slice(html.indexOf('<div id="game-over-screen"'), html.indexOf('<div id="waiting-screen"'));
assert(finishMarkup.includes('id="hotseat-result-scores"') && finishMarkup.includes('id="hotseat-result-comment"'), 'Hotseat result panels missing');
assert(!/\.svg(?:["?]|$)/i.test(finishMarkup), 'Old SVG remains in finish screen');
assert(!/hotseat-winner-mark|hotseat\/winner(?:-v\d+)?\.png/.test(finishMarkup), 'Retired winner PNG remains in finish markup');
assert(!/assets\/(?:easter|desert|severna)-soft-clay\/hotseat\/winner(?:-v\d+)?\.png/.test(game), 'Retired winner PNG remains in Hotseat pack');
assert(!/hotseat-winner-mark/.test(themeCss) && !/mode-dual\s*\{\s*--(?:easter|desert)-mode-icon-mask:\s*url\("data:image\/svg\+xml/.test(themeCss), 'Retired winner CSS or Hotseat SVG mask remains');
assert(!game.includes("path.startsWith('hotseat/')") && !game.includes("path.startsWith('canonical/hotseat-winner/')"), 'Retired Hotseat preload matcher remains');
assert(css.includes('#game-over-screen.is-hotseat-result .hotseat-result-player') && css.includes('var(--solo-inset'), 'Hotseat result lacks theme material');
assert(compact.includes('body #game-over-screen.is-hotseat-result.is-solo-result #go-title') && compact.includes('body #game-over-screen.is-hotseat-result.is-solo-result #go-msg'), 'Hotseat typography is not standardized on small screens');
assert(timing.includes('openAtMs: 2400, durationMs: 3200') && introCss.includes('--room-intro-duration: 3.2s'), 'Hotseat intro does not use shared timing');
assert(game.includes("this.playEasterRoomIntro(roomIntroId, () => this.setupGame(numPlayers))"), 'Hotseat entry does not invoke shared intro');
assert(game.includes("gameOverScreen.classList.toggle('is-hotseat-result', isHeadToHeadFinish)") && game.includes("if (isHeadToHeadFinish && finalResults.length === 2)"), 'Hotseat finish state or comments missing');
assert(game.includes("if (btnRematch) { btnRematch.hidden = true; btnRematch.style.display = 'none'; }"), 'Offline Hotseat must not display an online rematch action');

console.log(`Hotseat final: ${themes.length} themes × 13 distinct active PNG roles, shared 3.2s intro, no legacy finish PNG/SVG references.`);
