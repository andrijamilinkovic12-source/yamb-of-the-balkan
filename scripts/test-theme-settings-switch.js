const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

let active = 'easter';
const images = ['room','profile','sound','privacy'].map(role => ({ dataset: { settingsRole: role }, src: '' }));
const pending = [];
class PendingImage {
    set src(source) { this.source = source; pending.push(this); }
    decode() { return Promise.resolve(); }
}
const document = {
    readyState: 'complete',
    body: {},
    querySelectorAll: () => images,
};
const window = {
    themeGameHeader: {
        activeTheme: () => active,
        asset: (role, theme) => `assets/theme-packs/${theme}/canonical/game-header/${role}-v1.png?v=1`,
    },
};
class MutationObserver { observe() {} }
vm.runInNewContext(fs.readFileSync('www/theme-settings-room.js', 'utf8'),
    { window, document, Image: PendingImage, MutationObserver });

(async () => {
    active = 'neon';
    const switched = window.themeSettingsRoom.apply();
    for (const image of pending.filter(item => item.source.includes('/neon/'))) image.onload();
    await switched;
    assert.ok(images.every(image => image.src.includes('/neon/')));
    assert.equal(images.find(image => image.dataset.settingsRole === 'sound').src,
        window.themeGameHeader.asset('sound', 'neon'));
    for (const image of pending.filter(item => item.source.includes('/easter/'))) image.onload();
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(images.every(image => image.src.includes('/neon/')),
        'Late PNG from the previous theme must never replace the selected theme');
    console.log('Settings switch keeps one theme and shares the game-panel PNG.');
})().catch(error => { console.error(error); process.exitCode = 1; });
