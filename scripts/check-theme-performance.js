const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { resolve: resolveQualityAsset } = require('../www/theme-quality-assets');

const www = path.join(__dirname, '..', 'www');
const read = name => fs.readFileSync(path.join(www, name), 'utf8');
const game = read('game.js');
const index = read('index.html');
const config = read('config.js');
const easterDelivery = JSON.parse(read('themes/easter/asset-registry.json')).delivery;
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const mainMenu = index.slice(index.indexOf('id="main-menu"'), index.indexOf('id="quote-screen"'));
const menuImages = [...mainMenu.matchAll(/<img\b[^>]*data-theme-src="([^"]+)"/g)]
    .map(([, themeSrc]) => ({ dataset: { themeSrc } }));
const fileOf = source => source.split('?')[0];

function png(source) {
    const file = fileOf(source);
    const bytes = fs.readFileSync(path.join(www, file));
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', file);
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes: bytes.length };
}

const startApp = game.indexOf('window.app = new YambApp();');
assert.ok(startApp > 0);
let showSplash = false;
let theme = 'dark';
const browser = {
    window: { location: { hostname: 'localhost' } },
    document: {
        readyState: 'loading',
        addEventListener() {},
        getElementById(id) {
            if (id === 'main-menu') return { querySelectorAll: () => menuImages };
            if (id === 'splash-screen') return { classList: { contains: () => showSplash } };
            return null;
        }
    },
    localStorage: { getItem: key => key === 'yamb_theme' ? theme : null },
    resolveThemeQualityAsset: resolveQualityAsset
};
vm.createContext(browser);
vm.runInContext(config, browser);
const mailboxMethod = read('player-mailbox.js').match(/iconSource\(theme\) \{[\s\S]*?\n        \}/)?.[0];
assert.ok(mailboxMethod, 'Mailbox startup icon resolver missing');
browser.window.playerMailbox = vm.runInContext(`({ ${mailboxMethod} })`, browser);
const app = vm.runInContext(`${game.slice(0, startApp)}\nObject.create(YambApp.prototype);`, browser);

for (theme of themes) {
    const canonical = theme === 'dark' ? 'assets/green-soft-clay/canonical' : `assets/theme-packs/${theme}/canonical`;
    const background = app.getThemeLoadingPack(theme).background;
    const mailbox = browser.window.playerMailbox.iconSource(theme);
    const menuLogo = `${canonical}/quarterly-league-room-identity/quarterly-league-room-menu-v2.png`;
    const roomLogo = `${canonical}/quarterly-league-room-identity/quarterly-league-room-v2.png`;
    showSplash = false;
    const startup = app.getThemeStartupSources(theme).map(fileOf);
    assert.equal(new Set(startup).size, startup.length, `${theme}: duplicate startup PNG`);
    assert.equal(startup.length, 19, `${theme}: 15 rooms, two game buttons, background and mailbox`);
    assert(startup.includes(background) && startup.includes(mailbox) && startup.includes(menuLogo), theme);
    let transfer = 0;
    let decoded = 0;
    for (const source of startup) {
        const image = png(source);
        if (source !== background) {
            const owner = theme === 'dark' ? 'assets/green-soft-clay/' : `assets/theme-packs/${theme}/`;
            assert(source.startsWith(owner), `${theme}: startup PNG from another theme: ${source}`);
            if (/\/menu-resume-buttons\//.test(source)) assert.deepEqual([image.width, image.height], [512, 160], source);
            else assert(Math.max(image.width, image.height) <= 384, `${theme}: startup included large room art: ${source}`);
        }
        transfer += image.bytes;
        decoded += image.width * image.height * 4;
    }
    showSplash = true;
    const splash = fileOf(app.getThemeSplashSource(theme));
    const splashPng = png(splash);
    const splashStartup = [...app.getThemeStartupSources(theme).map(fileOf)];
    assert.deepEqual(splashStartup.filter(source => !startup.includes(source)), [splash]);
    if (theme === 'easter') assert.equal(splashStartup.length, easterDelivery.startupPngCount);
    transfer += splashPng.bytes;
    decoded += splashPng.width * splashPng.height * 4;
    const transferBudget = theme === 'easter' ? easterDelivery.startupTransferBudgetBytes : 5 * 1024 * 1024;
    const decodedBudget = theme === 'easter' ? easterDelivery.startupDecodedBudgetBytes : 24 * 1024 * 1024;
    assert(transfer <= transferBudget, `${theme}: startup transfers ${transfer} bytes`);
    assert(decoded <= decodedBudget, `${theme}: startup decodes ${decoded} bytes`);

    const league = app.getThemeRoomSources(theme, 'quarterlyLeague').map(fileOf);
    assert.equal(league.length, 13, `${theme}: logo, three tabs, six ranks and three medals`);
    assert(league.includes(roomLogo) && !league.includes(menuLogo));
    assert(league.every(source => source.startsWith(`${canonical}/`) && !startup.includes(source)));
    assert.equal(png(roomLogo).width, 512);
    assert.equal(png(menuLogo).width, 384);
    for (const source of league) png(source);
    for (const mode of ['solo', 'hotseat']) {
        const finish = app.getThemeRoomSources(theme, mode).map(resolveQualityAsset).map(fileOf);
        for (const role of ['finish-score-mark', 'finish-claim', 'record-panel', 'personal', 'weekly', 'monthly', 'all_time']) {
            const source = finish.find(file => path.basename(file).startsWith(`${role}-`));
            assert(source, `${theme}: missing ${mode} result PNG for ${role}`);
            png(source);
        }
    }
}

let language = 'sr';
const element = () => ({ children: [], appendChild(child) { this.children.push(child); } });
const managers = read('managers.js');
const shop = vm.runInNewContext(`${config}
${managers.slice(0, managers.indexOf('const YAMB_THEME_IDS'))}
${managers.slice(managers.indexOf('class ShopManager'), managers.indexOf('class AdMobController'))}
({ prototype: ShopManager.prototype, catalog: SHOP_DATA.THEMES })`, {
    window: { location: { hostname: 'localhost' } },
    document: { body: { matches: () => true }, createElement: element },
    localStorage: { getItem: key => key === 'yamb_lang' ? language : 'dark' }
});
const preview = 'assets/treasury-theme-previews/dark-v2.png';
assert(png(preview).width <= 384, 'Green Treasury preview exceeds card size budget');
const green = shop.catalog.find(item => item.id === 'dark');
for (const [locale, title, description] of [
    ['sr', 'Zelena', '3D Soft Neomorphism, pravac Clay: zeleni balkanski predeo i glineni detalji.'],
    ['en', 'Green', '3D Soft Neomorphism, Clay direction: a green Balkan landscape and sculpted details.']
]) {
    language = locale;
    const container = element();
    const instance = Object.assign(Object.create(shop.prototype), {
        type: 'theme', items: [green], unlocked: ['dark'], container
    });
    instance.render();
    const card = container.children[0].children[0].children[0].innerHTML;
    assert(card.includes(`class="treasury-theme-preview"><img src="${preview}"`), locale);
    assert(card.includes(`<div class="title">${title}</div>`) && card.includes(`<div class="desc">${description}</div>`), locale);
}
console.log('Theme loading: ten startup budgets, room-only league assets, shared finish PNGs and localized Green Treasury card verified.');
