const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const manifest = JSON.parse(read('source-assets/theme-daily-states-v1/manifest.json'));
const definitions = JSON.parse(read('docs/theme-definitions.json'));
const themes = ['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const roles = ['task', 'complete', 'already-played'];
const hashes = new Set();

assert.deepEqual(manifest.roles, roles);
assert.deepEqual(manifest.themes.map(theme => theme.id), themes);
assert.ok(definitions.dailyChallengeRoomRules);

const body = { classList: { contains: () => false } };
let activeTheme = 'dark';
const introClasses = new Set();
const introMark = { source: '', getAttribute(name) { return name === 'src' ? this.source : null; }, set src(value) { this.source = value; } };
const introOverlay = {
    classList: { add: value => introClasses.add(value), remove: value => introClasses.delete(value) },
    querySelector: selector => selector === '.daily-intro-mark-green' ? introMark : null,
    setAttribute() {}
};
const timers = [];
const loadedSources = [];
class MockImage {
    set src(value) {
        loadedSources.push(value);
        this.naturalWidth = 384;
        queueMicrotask(() => this.onload());
    }
    async decode() {}
}
const DailyChallenge = vm.runInNewContext(
    read('www/dnevniizazov.js').toString() + '\nDnevniIzazov',
    {
        window: {},
        document: { body, getElementById: id => id === 'daily-intro' ? introOverlay : null },
        localStorage: { getItem: () => activeTheme },
        Image: MockImage,
        setTimeout: (fn, delay) => { timers.push({ fn, delay }); },
        t: key => key,
        console
    }
);
const instance = Object.create(DailyChallenge.prototype);

for (const theme of manifest.themes) {
    activeTheme = theme.id;
    assert.equal(instance.getDailyTheme(), theme.id);
    assert.equal(theme.direction, definitions.themes.find(item => item.id === theme.id).direction);
    for (const role of roles) {
        const entry = theme.assets[role];
        const png = read(entry.production);
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(png.readUInt32BE(16), 384);
        assert.equal(png.readUInt32BE(20), 384);
        assert.equal(png[25], 6, `${theme.id}/${role} must be RGBA`);
        const hash = crypto.createHash('sha256').update(png).digest('hex');
        assert.equal(hash, entry.sha256);
        assert.ok(!hashes.has(hash), `${theme.id}/${role} duplicates another asset`);
        hashes.add(hash);
        assert.equal(instance.getDailyAsset(role), entry.production.replace(/^www\//, ''));
    }
    for (const role of ['room', 'reward-video']) {
        assert.ok(fs.existsSync(path.join(root, 'www', instance.getDailyAsset(role))));
    }
    timers.length = 0;
    let introCompleted = 0;
    instance.playIntro(() => { introCompleted += 1; }, { openBehindOverlayAt: null });
    assert.deepEqual(timers.map(timer => timer.delay), [4600], `${theme.id} replay intro duration`);
    assert.ok(introClasses.has(`theme-${theme.id}`));
    assert.equal(introMark.source, instance.getDailyAsset('room'), `${theme.id} intro icon`);
    timers[0].fn();
    assert.equal(introCompleted, 1, `${theme.id} replay callback`);
    let reentryMessage = '';
    instance.app = { modal: { alert: message => { reentryMessage = message; return Promise.resolve(); } } };
    instance.hideIntroBackdrop = () => {};
    instance.showAlreadyPlayedInfo();
    assert.ok(reentryMessage.includes(instance.getDailyAsset('already-played')), `${theme.id} replay status icon`);
}

activeTheme = 'dark';
assert.equal(instance.getDailyTheme(), 'dark');
for (const role of roles) {
    const source = instance.getDailyAsset(role).split('?')[0];
    assert.ok(fs.existsSync(path.join(root, 'www', source)));
}

const html = read('www/index.html').toString();
const css = read('www/theme-daily-room.css').toString();
const diceCss = read('www/dice-skin-png.css').toString();
const js = read('www/dnevniizazov.js').toString();
const game = read('www/game.js').toString();
const rules = read('www/pravilaigre.js').toString();
const roomIcons = read('www/theme-main-room-icons.js').toString();
const oceanPreview = read('www/themes/ocean/qa-preview.html').toString();
assert.match(html, /theme-daily-room\.css\?v=2/);
assert.match(js, /this\.prepareDailyAssets\(\)/);
assert.match(js, /await assetsReady/);
assert.match(js, /scoreBox\.appendChild\(completeMark\)/);
assert.match(js, /this\.clearDailyResult\(\)/);
for (const role of ['room', 'task', 'complete', 'already-played', 'reward-video']) {
    assert.ok(js.includes(`getDailyAsset('${role}')`));
}
for (const theme of themes) {
    assert.ok(css.includes(`body.${theme}-theme #glass-daily-overlay`));
}
const skins = JSON.parse(read('source-assets/dice-skins-v1/manifest.json')).skins;
for (const skin of skins) {
    assert.ok(diceCss.includes(`body #glass-daily-overlay .daily-glass-die.dice.skin-${skin.id}`),
        `${skin.id} skin must stay visible above theme card styles`);
}
assert.match(css, /\.daily-glass-die:not\(\[class\*="skin-"\]\)/);
assert.ok(!/daily\/(?:task|complete|already-played)-v\d+\.png/.test(js), 'old daily state files still in active source');
assert.ok(!/daily-glass-(?:room|task|complete|reward-video)-mark-(?:green|easter|desert|nebula)/.test(js), 'obsolete Daily icon styling remains');
assert.ok(!/daily-already-(?:green|easter|desert|nebula)/.test(js), 'obsolete reentry styling remains');
for (const theme of ['easter', 'desert', 'severna']) {
    assert.ok(game.includes(`assets/theme-packs/${theme}/canonical/daily-room-identity/daily-room-v1.png`), `${theme} pack still has old room icon`);
    assert.ok(rules.includes('rules-daily-canonical-icon') && roomIcons.includes('room-identity') && roomIcons.includes('sourceFor(theme, role, variant)'), 'Rules must use canonical Daily icon mapping');
    const oldRoot = path.join(root, 'www', 'assets', `${theme}-soft-clay`);
    assert.ok(!fs.readdirSync(oldRoot).some(name => /^daily-challenge-pro.*\.png$/.test(name)), `${theme} old room identity remains in runtime`);
    const oldDaily = path.join(oldRoot, 'daily');
    assert.ok(!fs.existsSync(oldDaily) || !fs.readdirSync(oldDaily).some(name => name.endsWith('.png')), `${theme} old Daily states remain in runtime`);
    const oldMenu = path.join(oldRoot, 'runtime', 'menu');
    assert.ok(!fs.existsSync(oldMenu) || !fs.readdirSync(oldMenu).some(name => /^daily-challenge-pro.*\.png$/.test(name)), `${theme} old menu icon remains in runtime`);
}
for (const theme of ['easter', 'desert']) {
    for (const role of roles) {
        assert.ok(game.includes(`assets/theme-packs/${theme}/canonical/daily-states/${role}-v1.png`), `${theme}/${role} pack still has old state`);
    }
    assert.ok(game.includes(`assets/theme-packs/${theme}/daily/reward-video-v3.png`), `${theme} pack still has old Daily reward-video`);
}
for (const source of [js, game, rules]) {
    assert.ok(!/assets\/(?:easter|desert|severna)-soft-clay\/(?:daily\/|daily-challenge-pro)/.test(source), 'old Easter/Desert/Severna Daily asset still referenced');
}
assert.ok(game.includes('assets/theme-packs/winter/canonical/daily-room-identity/daily-room-v1.png'), 'Ocean preload must use the new room PNG');
assert.ok(oceanPreview.includes('assets/theme-packs/winter/canonical/daily-room-identity/daily-room-menu-v1.png'), 'Ocean preview must use the new menu PNG');
assert.ok(![js, game, rules, html, oceanPreview].some(source => source.includes('daily-challenge-icon.svg') || source.includes('daily-challenge.svg')), 'obsolete Daily SVG is still referenced');
assert.ok(!fs.existsSync(path.join(root, 'www/assets/daily-challenge-icon.svg')));
assert.ok(!fs.existsSync(path.join(root, 'www/assets/desert-soft-clay/daily-challenge.svg')));
async function checkAssetLoading() {
    activeTheme = 'light';
    const firstLoad = instance.prepareDailyAssets();
    assert.equal(instance.prepareDailyAssets(), firstLoad, 'same theme should reuse decoded PNG load');
    assert.ok((await firstLoad).every(Boolean));
    assert.equal(loadedSources.length, 5);

    instance.app = { requireLogin: () => true, prepareThemeRoomAssets() {} };
    instance.isIntroPlaying = false;
    instance.isActive = false;
    instance.loadingChallenge = false;
    instance.getCurrentUid = () => 'qa-player';
    instance.isRewardClaimedForDay = () => false;
    instance.setChallengeState = () => { instance.currentDayKey = '2026-10-14'; };
    instance.markDailyAttempt = () => {};
    instance.playIntro = () => {};
    const syncedThemes = [];
    instance.syncDailyThemeAssets = () => syncedThemes.push(instance.getDailyTheme());
    let respond;
    instance.requestDailyChallengeFromServer = () => new Promise(resolve => { respond = resolve; });
    const opening = instance.open();
    activeTheme = 'medium';
    respond({ ok: true, alreadyClaimed: false });
    await opening;
    assert.deepEqual(syncedThemes, ['medium'], 'room PNGs must match the theme at display time');
    assert.equal(loadedSources.length, 10, 'new theme PNGs must be decoded before display');
    assert.equal(instance.loadingChallenge, false);
}

checkAssetLoading().then(() => {
    console.log('Daily Challenge: 10 themes, 27 distinct RGBA assets, canonical reuse, reentry, and theme-switch loading OK.');
}).catch(error => { console.error(error); process.exitCode = 1; });
