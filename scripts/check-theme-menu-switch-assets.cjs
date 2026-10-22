const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const game = fs.readFileSync(path.join(root, 'www/game.js'), 'utf8');
const context = {
    window: {},
    document: { getElementById: () => null },
    localStorage: { getItem: () => 'sr' },
    getThemeMedalSource: () => '',
    getThemeTreasuryControlSource: () => '',
    SHOP_DATA: { SKINS: [], TROPHIES: [] },
    console, setTimeout, clearTimeout
};
vm.runInNewContext(game.replace('window.app = new YambApp();', 'globalThis.TestYambApp = YambApp;'), context);
const app = Object.create(context.TestYambApp.prototype);
for (const theme of ['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna']) {
    const sources = app.getThemeStartupSources(theme);
    assert.equal(sources.length, 18, `${theme}: retired icon entered the menu barrier`);
    assert(sources.every(source => !source.includes('splash-title')), `${theme}: hidden login logo in menu barrier`);
    for (const source of sources) {
        assert(fs.existsSync(path.join(root, 'www', source.split('?')[0])), `${theme}: missing ${source}`);
    }
    console.log(`${theme}: ${sources.length} startup URLs`);
}
console.log('Nine paid theme menu packs: all startup URLs present; hidden login logos excluded.');

