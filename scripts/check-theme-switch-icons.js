const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repo = path.resolve(__dirname, '..');
const game = fs.readFileSync(path.join(repo, 'www/game.js'), 'utf8');
const html = fs.readFileSync(path.join(repo, 'www/index.html'), 'utf8');
const menu = html.slice(html.indexOf('id="main-menu"'), html.indexOf('id="quote-screen"'));
const greenSources = [...menu.matchAll(/data-theme-src="(assets\/green-soft-clay\/[^"]+)"/g)].map(match => match[1]);
assert.equal(greenSources.length, 15, 'Green menu should contain fifteen visible PNG anchors');

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
        ? { querySelectorAll: () => greenSources.map(themeSrc => ({ dataset: { themeSrc } })) }
        : id === 'setting-theme' ? select : null },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    Date, Promise
};
const app = vm.runInNewContext(`({${[
    method('getMainRoomPackSource', 'getMainMenuIconSources'),
    method('getMainMenuIconSources', 'getRewardedVideoPackSources'),
    method('saveSettingAuto', 'updateStats')
].join(',\n')}})`, sandbox);
app.isThemeUnlocked = () => true;
app.getThemeLoadingPack = theme => ({ background: `assets/${theme}-background.png` });
app.preloadThemeSources = (sources, options) => new Promise(resolve => pending.push({ sources, options, resolve }));
app.applyTheme = theme => applied.push(theme);

assert.equal(app.getMainMenuIconSources('dark').length, 15);
for (const theme of ['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna']) {
    const sources = app.getMainMenuIconSources(theme);
    assert.equal(sources.length, 15, `${theme}: missing menu PNG`);
    assert(sources.every(source => source.includes(`/theme-packs/${theme}/`)), `${theme}: wrong PNG theme`);
}

(async () => {
    app.saveSettingAuto('theme', 'winter');
    assert.equal(storage.get('yamb_theme'), 'dark', 'Theme changed before its icons were ready');
    assert.deepEqual(applied, []);
    assert.equal(pending[0].sources.length, 16, 'Ocean must prefetch its background and fifteen icons');
    assert.equal(pending[0].options.concurrency, 16);

    app.saveSettingAuto('theme', 'neon');
    pending[0].resolve();
    await Promise.resolve();
    assert.deepEqual(applied, [], 'An outdated theme choice was applied');
    pending[1].resolve();
    await Promise.resolve();
    assert.deepEqual(applied, ['neon']);
    assert.equal(storage.get('yamb_theme'), 'neon');
    console.log('PASS: fifteen PNGs per theme, parallel preload, atomic switch and latest-choice guard.');
})().catch(error => { console.error(error); process.exitCode = 1; });
