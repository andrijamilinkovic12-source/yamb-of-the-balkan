const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repo = path.resolve(__dirname, '..');
const game = fs.readFileSync(path.join(repo, 'www/game.js'), 'utf8');
const html = fs.readFileSync(path.join(repo, 'www/index.html'), 'utf8');
const menu = html.slice(html.indexOf('id="main-menu"'), html.indexOf('id="quote-screen"'));
const greenSources = [...menu.matchAll(/data-theme-src="(assets\/green-soft-clay\/[^"]+)"/g)].map(match => match[1]);
// Četrnaest standardnih mesta koristi data-theme-src. Petnaesta uloga je
// Kvartalna liga: njen aktivni znak se namerno postavlja kroz ql-quarter-logo.
const leagueMenuMark = /class="main-league-watermark-zone ql-quarter-logo"[\s\S]*?quarterly-league-room-menu-v2\.png/.test(menu);
assert.equal(greenSources.length, 14, 'Green menu should contain fourteen data-theme-src PNG anchors');
assert(leagueMenuMark, 'Green menu should contain the dedicated Quarterly League PNG mark');

function method(name, next) {
    const start = game.indexOf(`    ${name}(`);
    const end = game.indexOf(`\n    ${next}(`, start);
    assert(start >= 0 && end > start, `Cannot isolate ${name}`);
    return game.slice(start, end).trim();
}

const storage = new Map([['yamb_theme', 'dark']]);
const select = { value: 'dark', blur() {} };
const pending = [];
const applied = [];
const sandbox = {
    document: { getElementById: id => id === 'main-menu'
        ? {
            querySelectorAll: () => greenSources.map(themeSrc => ({ dataset: { themeSrc } })),
            classList: { contains: () => false }
        }
        : id === 'setting-theme' ? select : null },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    Date, Promise
};
const app = vm.runInNewContext(`({${[
    method('getMainRoomPackSource', 'getOnlineRandomStateSource'),
    method('getMainMenuIconSources', 'getRewardedVideoPackSources'),
    method('saveSettingAuto', 'updateStats')
].join(',\n')}})`, sandbox);
app.isThemeUnlocked = () => true;
app.preloadThemeSources = () => Promise.resolve(true);
app.warmThemePack = theme => ({
    critical: new Promise(resolve => pending.push({ theme, resolve })),
    all: Promise.resolve(true)
});
app.prepareThemeLoadingGate = () => Promise.resolve();
app.rememberManualThemeSelection = () => {};
app.applyTheme = theme => applied.push(theme);

assert.equal(app.getMainMenuIconSources('dark').length, 14);
for (const theme of ['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna']) {
    const sources = app.getMainMenuIconSources(theme);
    // The themed loader receives all fifteen room identities, including QL.
    // QL is not a data-theme-src element: its active mark is rendered in the
    // dedicated ql-quarter-logo host checked above.
    assert.equal(sources.length, 15, `${theme}: missing themed menu PNG`);
    assert(sources.every(source => source.includes(`/theme-packs/${theme}/`)), `${theme}: wrong PNG theme`);
    assert(sources.some(source => source.includes('/quarterly-league-room-identity/quarterly-league-room-menu-v2.png')),
        `${theme}: missing Quarterly League menu mark`);
}
const startupMethod = method('getThemeStartupSources', 'getThemeRoomSources');
assert(startupMethod.includes('leagueWatermark') && startupMethod.includes('...menuPackSources'),
    'Theme startup pack must preload both the dedicated QL mark and themed menu icons');

(async () => {
    app.saveSettingAuto('theme', 'winter');
    assert.equal(storage.get('yamb_theme'), 'dark', 'Theme changed before its icons were ready');
    assert.deepEqual(applied, []);
    assert.equal(pending[0].theme, 'winter', 'Ocean theme warmup did not start');

    app.saveSettingAuto('theme', 'neon');
    pending[0].resolve();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(applied, [], 'An outdated theme choice was applied');
    pending[1].resolve();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(applied, ['neon']);
    assert.equal(storage.get('yamb_theme'), 'neon');
    console.log('PASS: fourteen generic PNG anchors plus a dedicated Quarterly League mark, fifteen themed preload sources, atomic switch and latest-choice guard.');
})().catch(error => { console.error(error); process.exitCode = 1; });
