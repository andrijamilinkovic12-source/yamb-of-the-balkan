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
const activeRoles = ['room', ...roles, 'reward-video', 'ducat'];
const hashes = new Set();
const activeHashes = new Map(activeRoles.map(role => [role, new Set()]));

function assertActivePng(theme, role, source) {
    const production = source.split('?')[0];
    const png = read(`www/${production}`);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${theme}/${role} PNG signature`);
    assert.equal(png[25], 6, `${theme}/${role} RGBA`);
    const hash = crypto.createHash('sha256').update(png).digest('hex');
    assert.ok(!activeHashes.get(role).has(hash), `${theme}/${role} shares another theme's PNG`);
    activeHashes.get(role).add(hash);
}

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
const documentMock = { body, getElementById: id => id === 'daily-intro' ? introOverlay : null };
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
        document: documentMock,
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
    for (const role of activeRoles) assertActivePng(theme.id, role, instance.getDailyAsset(role));
    timers.length = 0;
    let introCompleted = 0;
    instance.playIntro(() => { introCompleted += 1; }, { openBehindOverlayAt: null });
    assert.deepEqual(timers.map(timer => timer.delay), [3200], `${theme.id} replay intro duration`);
    assert.ok(introClasses.has(`theme-${theme.id}`));
    assert.equal(introMark.source, instance.getDailyAsset('room'), `${theme.id} intro icon`);
    timers[0].fn();
    assert.equal(introCompleted, 1, `${theme.id} replay callback`);
    let reentryMessage = '';
    instance.app = { modal: { alert: message => { reentryMessage = message; return Promise.resolve(); } } };
    instance.hideIntroBackdrop = () => {};
    instance.showAlreadyPlayedInfo();
    assert.ok(reentryMessage.includes(instance.getDailyAsset('already-played')), `${theme.id} replay status icon`);
    const scoreBox = { classList: { add: () => {} }, appendChild: mark => { assert.equal(mark, completeMark); } };
    const completeMark = { role: 'complete' };
    let resultMarkup = '';
    documentMock.createElement = () => ({
        setAttribute() {},
        set innerHTML(value) { resultMarkup = value; },
        querySelector: selector => selector === '.daily-complete-mark' ? completeMark : null
    });
    documentMock.getElementById = id => id === 'glass-daily-card'
        ? { appendChild() {}, querySelector: selector => selector === '.daily-glass-score-box' ? scoreBox : null }
        : id === 'glass-btn-action' ? { style: {} } : null;
    instance.showResultModal();
    for (const role of ['complete', 'reward-video', 'ducat']) {
        assert.ok(resultMarkup.includes(instance.getDailyAsset(role)), `${theme.id} result must show themed ${role}`);
    }
    documentMock.getElementById = id => id === 'daily-intro' ? introOverlay : null;
}

activeTheme = 'dark';
assert.equal(instance.getDailyTheme(), 'dark');
for (const role of activeRoles) assertActivePng('dark', role, instance.getDailyAsset(role));
{
    const scoreBox = { classList: { add: () => {} }, appendChild: mark => { assert.equal(mark, completeMark); } };
    const completeMark = { role: 'complete' };
    let resultMarkup = '';
    documentMock.createElement = () => ({
        setAttribute() {},
        set innerHTML(value) { resultMarkup = value; },
        querySelector: selector => selector === '.daily-complete-mark' ? completeMark : null
    });
    documentMock.getElementById = id => id === 'glass-daily-card'
        ? { appendChild() {}, querySelector: selector => selector === '.daily-glass-score-box' ? scoreBox : null }
        : id === 'glass-btn-action' ? { style: {} } : null;
    instance.showResultModal();
    for (const role of ['complete', 'reward-video', 'ducat']) {
        assert.ok(resultMarkup.includes(instance.getDailyAsset(role)), `dark result must show themed ${role}`);
    }
    documentMock.getElementById = id => id === 'daily-intro' ? introOverlay : null;
}
assert.equal(activeRoles.length, 6, 'each theme must expose the same six Daily PNG roles');
assert.ok([...activeHashes.values()].every(roleHashes => roleHashes.size === 10));

const html = read('www/index.html').toString();
const css = read('www/theme-daily-room.css').toString();
const sharedCss = read('www/theme-main-room-icons.css').toString();
const greenCss = read('www/teme.css').toString();
const config = read('www/config.js').toString();
const diceCss = read('www/dice-skin-png.css').toString();
const js = read('www/dnevniizazov.js').toString();
const game = read('www/game.js').toString();
const rules = read('www/pravilaigre.js').toString();
const roomIcons = read('www/theme-main-room-icons.js').toString();
const oceanPreview = read('www/themes/ocean/qa-preview.html').toString();
assert.match(html, /theme-daily-room\.css\?v=4/);
assert.match(html, /dnevniizazov\.js\?v=3\.4/);
const dailyAlerts = js.split('\n').filter(line => line.includes('this.app.modal.alert('));
assert.equal(dailyAlerts.length, 6);
assert.ok(dailyAlerts.every(line => line.includes("contextClass: 'daily'")), 'Daily notices must opt into scoped Green typography and theme contrast');
assert.match(config, /ROOM_INTRO_TIMING = Object\.freeze\(\{ openAtMs: 2400, durationMs: 3200 \}\)/);
assert.match(sharedCss, /--room-intro-duration: 3\.2s/);
for (const file of ['www/dnevniizazov.js', 'www/game.js', 'www/kvartalnaliga.js', 'www/riznica.js', 'www/turnir.js']) {
    const source = read(file).toString();
    assert.match(source, /ROOM_INTRO_TIMING\?\.openAtMs/, `${file} must use shared intro opening`);
    assert.match(source, /ROOM_INTRO_TIMING\?\.durationMs/, `${file} must use shared intro duration`);
}
for (const id of ['daily-intro', 'league-intro', 'tournament-intro', 'riznica-intro', 'easter-room-intro']) {
    assert.ok(sharedCss.includes(`#${id},`) || sharedCss.includes(`#${id}\n`), `${id} missing shared intro duration`);
}
assert.match(sharedCss, /body #daily-intro#daily-intro \.daily-intro-mark-wrap/);
assert.match(js, /this\.prepareDailyAssets\(\)/);
assert.match(js, /await assetsReady/);
assert.match(js, /scoreBox\.appendChild\(completeMark\)/);
assert.match(js, /this\.clearDailyResult\(\)/);
for (const role of activeRoles) {
    assert.ok(js.includes(`getDailyAsset('${role}')`));
}
assert.match(js, /data-daily-role="ducat"/);
for (const theme of themes) {
    assert.ok(css.includes(`body.${theme}-theme #glass-daily-overlay`));
}
assert.match(css, /font-family: 'Montserrat', sans-serif/);
assert.match(css, /\.daily-glass-card \{\s*width: min\(430px, 100%\);\s*max-height: 100%/);
assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(css, /padding: max\(12px, env\(safe-area-inset-top\)\)/);
assert.match(js, /\.daily-glass-btn \{[\s\S]*?min-height: 54px/);
assert.match(js, /@media \(max-width: 380px\)/);
assert.match(js, /@media \(max-height: 620px\)/);
assert.match(js, /\.daily-glass-card \{[\s\S]*?overflow-y: auto/);
assert.match(greenCss, /--green-clay-surface-soft: linear-gradient\(145deg, rgba\(71,105,65,\.98\), rgba\(45,81,53,\.98\)\)/);

const color = value => {
    if (value.startsWith('#')) return [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16));
    return value.match(/[\d.]+/g).map(Number);
};
const composite = (foreground, background) => [0, 1, 2]
    .map(index => foreground[index] * foreground[3] + background[index] * (1 - foreground[3]));
const luminance = rgb => rgb.map(channel => channel / 255)
    .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
const contrast = (first, second) => {
    const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (values[0] + .05) / (values[1] + .05);
};
for (const [text, stops] of [['#fff6e9', ['#a74731','#713426']], ['#f4f7e9', ['#476941','#31573a']]]) {
    for (const stop of stops) {
        assert.ok(css.includes(stop), `Green Daily gradient stop ${stop} missing`);
        assert.ok(contrast(color(text), color(stop)) >= 4.5, `Green action label contrast on ${stop}`);
    }
}
for (const greenSurface of [[71, 105, 65, .98], [45, 81, 53, .98]]) {
    for (const backdrop of [[0, 0, 0], [255, 255, 255]]) {
        const surface = composite(greenSurface, backdrop);
        for (const [label, foreground] of [['body', [231, 239, 218]], ['muted', [225, 236, 210]], ['title', [239, 245, 223]]]) {
            assert.ok(contrast(foreground, surface) >= 4.5, `dark ${label} contrast on ${backdrop}`);
        }
    }
}
for (const theme of themes) {
    const palette = css.match(new RegExp(`body\\.${theme}-theme #glass-daily-overlay \\{([^}]+)\\}`))?.[1];
    assert.ok(palette, `${theme} missing Daily palette`);
    const token = name => color(palette.match(new RegExp(`--daily-${name}:\\s*([^;]+)`))?.[1].trim());
    for (const backdrop of [[0, 0, 0], [255, 255, 255]]) {
        const surface = composite(token('surface'), backdrop);
        const inset = composite(token('inset'), surface);
        for (const [label, foreground, background] of [
            ['title', token('accent'), surface],
            ['body', token('text'), surface],
            ['subtitle', token('muted'), surface],
            ['score label', token('text'), inset],
            ['score value', token('accent'), inset],
            ['action', token('button-text'), token('button').slice(0, 3)]
        ]) assert.ok(contrast(foreground, background) >= 4.5, `${theme} ${label} contrast on ${backdrop}`);
    }
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
    assert.ok(rules.includes("daily: 'daily-room-identity/daily-room-v1.png'") && roomIcons.includes('room-identity') && roomIcons.includes('sourceFor(theme, role, variant)'), 'Rules must use canonical Daily icon mapping');
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
    assert.equal(loadedSources.length, 6);

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
    assert.equal(loadedSources.length, 12, 'new theme PNGs must be decoded before display');
    assert.equal(instance.loadingChallenge, false);
}

checkAssetLoading().then(() => {
    console.log('Daily Challenge: 10 themes × 6 distinct active RGBA PNG roles; canonical reuse, reentry, and theme-switch loading OK.');
}).catch(error => { console.error(error); process.exitCode = 1; });
