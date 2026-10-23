const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const game = read('www/game.js');
const html = read('www/index.html');
const css = read('www/theme-online-random-room.css');
const manifest = JSON.parse(read('source-assets/theme-online-random-states-v1/manifest.json'));
const definitions = JSON.parse(read('docs/theme-definitions.json'));
const themes = definitions.themes.filter(theme => theme.id !== 'dark').map(theme => theme.id);
const roles = ['scanning', 'found', 'vs', 'disconnected', 'reconnected'];
assert.deepEqual(manifest.roles, roles);
assert.equal(manifest.assets.length, 45);
assert.equal(new Set(manifest.assets.map(asset => asset.masterSha256)).size, 45);
assert.equal(new Set(manifest.assets.map(asset => asset.runtimeSha256)).size, 45);
for (const theme of themes) {
    const assets = manifest.assets.filter(asset => asset.theme === theme);
    assert.deepEqual(assets.map(asset => asset.role), roles, `${theme}: five roles required`);
    for (const asset of assets) {
        for (const [kind, size] of [['master', 512], ['runtime', 256]]) {
            const data = fs.readFileSync(path.join(root, asset[kind]));
            assert.equal(data.toString('ascii', 1, 4), 'PNG');
            assert.equal(data.readUInt32BE(16), size);
            assert.equal(data.readUInt32BE(20), size);
            assert.equal(data[25], 6, `${asset[kind]} must have RGBA transparency`);
            assert.equal(createHash('sha256').update(data).digest('hex'), asset[`${kind}Sha256`],
                `${asset[kind]} differs from the approved manifest`);
        }
    }
}

for (const role of ['header', ...roles.filter(role => role !== 'disconnected' && role !== 'reconnected')]) {
    assert.equal((html.match(new RegExp(`data-online-random-role="${role}"`, 'g')) || []).length, 1,
        `${role}: one shared active image in the waiting room`);
}
const waitingMarkup = html.slice(html.indexOf('<div id="waiting-screen"'), html.indexOf('<div id="global-chat-overlay"'));
assert(!/assets\/(?:easter|desert|severna)-soft-clay\/opponent\//.test(waitingMarkup),
    'older Easter, Desert and Severna Online Random images must be unlinked');
assert(!waitingMarkup.includes('<svg'), 'waiting room must not use SVG icon fallbacks');

const sourceMethod = game.match(/    getOnlineRandomStateSource\(theme, role\) \{[\s\S]*?\r?\n    \}/)?.[0];
assert(sourceMethod);
const source = vm.runInNewContext(`({${sourceMethod}}).getOnlineRandomStateSource`);
const context = { getMainRoomPackSource: theme => `assets/theme-packs/${theme}/canonical/online-random-room-identity/online-random-room-v1.png` };
for (const theme of themes) {
    for (const role of roles) {
        const expected = `assets/theme-packs/${theme}/canonical/online-random-states/${role}-v1.png?v=1`;
        assert.equal(source.call(context, theme, role), expected);
        assert(fs.existsSync(path.join(root, 'www', expected.split('?')[0])));
    }
    assert(source.call(context, theme, 'header').includes('/online-random-room-identity/'));
}
for (const role of roles) assert(source.call(context, 'dark', role).includes('green-soft-clay'));
const images = ['header', 'scanning', 'found', 'vs'].map(role => ({
    dataset: { onlineRandomRole: role },
    currentSource: '',
    getAttribute(name) { return name === 'src' ? this.currentSource || null : null; },
    removeAttribute(name) { if (name === 'src') this.currentSource = ''; },
    set src(value) { this.currentSource = value; }
}));
const syncMethod = game.match(/    syncOnlineRandomStateImages\(theme, \{ hydrate = false \} = \{\}\) \{[\s\S]*?\r?\n    \}/)?.[0];
assert(syncMethod);
const sync = vm.runInNewContext(`({${syncMethod}}).syncOnlineRandomStateImages`, {
    document: { querySelectorAll: () => images }
});
const syncContext = { getOnlineRandomStateSource: (theme, role) => source.call(context, theme, role) };
sync.call(syncContext, 'neon', { hydrate: true });
assert(images.every(image => image.currentSource.includes('/neon/')));
sync.call(syncContext, 'easter');
assert(images.every(image => !image.currentSource && image.dataset.themeSrc.includes('/easter/')),
    'theme change must clear stale PNGs before the next room opens');
sync.call(syncContext, 'easter', { hydrate: true });
assert(images.every(image => image.currentSource.includes('/easter/')));
assert(game.includes("if (roomId === 'opponent' || roomId === 'onlineRandom')")
    && game.includes("this.syncOnlineRandomStateImages(theme, { hydrate: true })"));
assert(game.includes("this.getOnlineRandomStateSource(theme, 'disconnected')")
    && game.includes("this.getOnlineRandomStateSource(localStorage.getItem('yamb_theme') || 'dark', 'reconnected')"));
assert(game.includes('}, window.ROOM_INTRO_TIMING?.openAtMs ?? 2400);') && game.includes('}, window.ROOM_INTRO_TIMING?.durationMs ?? 3200);')
    && game.includes("overlay.classList.toggle('easter-room-intro--icon-only', isIconOnly)"),
    'room intro must keep the Green icon-only behavior and timing');
assert(css.includes('width: 54px !important') && css.includes('width: 36px !important')
    && css.includes('width: 42px !important') && css.includes('width: 27px;'));
assert(css.includes('height: 192px !important') && css.includes('height: 186px !important'));
assert(css.includes('padding: 5px 9px 6px !important') && css.includes('width: 35px !important'));

const luminance = hex => {
    const channels = hex.match(/[\da-f]{2}/gi).map(channel => parseInt(channel, 16) / 255);
    const linear = channels.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
};
const contrast = (a, b) => {
    const levels = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (levels[0] + .05) / (levels[1] + .05);
};
for (const theme of definitions.themes.filter(theme => theme.id !== 'dark')) {
    for (const ink of ['text', 'textMuted', 'primary']) {
        for (const surface of ['surface', 'raised']) {
            assert(contrast(theme.paletteHex[ink], theme.paletteHex[surface]) >= 4.5,
                `${theme.id}: ${ink} must read on ${surface}`);
        }
    }
}
for (const [ink, surface] of [
    ['#f2f6e8', '#476941'], ['#f2f6e8', '#2d5135'],
    ['#e1ecd2', '#476941'], ['#e1ecd2', '#2d5135']
]) assert(contrast(ink, surface) >= 4.5, 'Green Online Random text must read on its card surface');
assert(css.includes('--online-room-card: var(--theme-card-fill)')
    && css.includes('--online-room-subcard: var(--theme-subcard-fill)')
    && css.includes('--online-room-shadow: var(--theme-subcard-shadow)')
    && css.includes('font-size: clamp(.66rem, 2.85vw, .74rem) !important'),
    'the nine rooms must use their own material palette with Green typography');
const hofMethod = game.slice(game.indexOf('    renderHallOfFame(data) {'), game.indexOf('    // --- SPECTATE FUNKCIJA ---'));
assert(hofMethod.includes('waiting-hof-entry') && hofMethod.includes('getThemeMedalSource'));
assert(!hofMethod.includes('const colors =') && !hofMethod.includes('color: ${color}'),
    'Top 3 text must not use fixed medal colors');
assert(!waitingMarkup.includes('🏆 Top 3'), 'Top 3 heading should not duplicate the theme medal');
assert(html.includes('theme-online-random-room.css?v=3'));
console.log('Online Random: 45 distinct PNGs, Green geometry, ten material palettes and text contrast OK.');
