const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const catalogStart = server.indexOf('const SHOP_ITEM_PRICES =');
const catalogEnd = server.indexOf('// NOVE PROMENLJIVE ZA ČUVANJE CHATA', catalogStart);
assert(catalogStart >= 0 && catalogEnd > catalogStart);

const functionSource = name => {
    const start = server.indexOf(`function ${name}(`);
    assert(start >= 0, `${name} missing`);
    const opening = server.indexOf(') {', start) + 2;
    let depth = 0;
    for (let index = opening; index < server.length; index += 1) {
        if (server[index] === '{') depth += 1;
        if (server[index] === '}' && --depth === 0) return server.slice(start, index + 1);
    }
    throw new Error(`${name} has no closing brace`);
};

const context = vm.createContext({
    sanitizeIdArray: values => Array.isArray(values) ? [...new Set(values.filter(value => typeof value === 'string'))] : [],
    toSafeInt: value => Math.max(0, Math.floor(Number(value) || 0)),
    normalizeShopDiscounts: () => ({}),
    getShopItemDiscountedPrice: value => Math.floor(value / 2)
});
vm.runInContext(server.slice(catalogStart, catalogEnd), context);
for (const name of ['filterAllowedUnlocks', 'isPaidShopUnlockId', 'getPaidUnlockPurchaseSummary', 'addUnlockedShopItemToUser']) {
    vm.runInContext(functionSource(name), context);
}

const check = expression => vm.runInContext(expression, context);
const config = fs.readFileSync(path.join(__dirname, '..', 'www/config.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'source-assets/dice-skins-v1/manifest.json'), 'utf8'));
const themeCatalog = new Map([...config.matchAll(/\{ id: '(dark|light|medium|winter|neon|amethyst|easter|desert|moon|severna)',[^\r\n]*?price: (\d+)(?:, adUnlock: (\d+))?/g)]
    .map(match => [match[1], { price: Number(match[2]), adUnlock: Number(match[3] || 0) }]));
assert.equal(themeCatalog.size, 10, 'Theme price catalog incomplete');
const skinBlock = config.match(/SKINS:\s*\[([\s\S]*?)\]\s*,\s*EFFECTS:/);
assert(skinBlock, 'Client skin catalog missing');
const skinCatalog = new Map([...skinBlock[1].matchAll(/\{ id: '([^']+)'[^\r\n]*?price: (\d+)/g)]
    .map(match => [match[1], Number(match[2])]));
assert.equal(skinCatalog.size, 48, 'Skin price catalog incomplete');
for (const [id, price] of skinCatalog) {
    assert.equal(check(`SHOP_ITEM_PRICES[${JSON.stringify(id)}]`), price, `${id}: server/client price differs`);
    assert.equal(check(`SKIN_UNLOCK_IDS.has(${JSON.stringify(id)})`), true, `${id}: server cannot save purchased skin`);
}
const gifts = manifest.skins.filter(item => item.themeGift);
assert.equal(gifts.length, 10, 'Exactly one gift is required per theme');
for (const gift of gifts) {
    assert.equal(check(`THEME_GIFT_SKINS[${JSON.stringify(gift.themeGift)}]`), gift.id, `${gift.themeGift}: server gift differs`);
    assert.equal(check(`SHOP_ITEM_PRICES[${JSON.stringify(gift.id)}]`), 0, `${gift.id}: server gift is not free`);
    assert.equal(check(`SHOP_ITEM_PRICES[${JSON.stringify(gift.themeGift)}]`), themeCatalog.get(gift.themeGift).price, `${gift.themeGift}: theme price differs`);
    assert(config.includes(`id: '${gift.id}'`) && config.includes(`themeGift: '${gift.themeGift}'`), `${gift.themeGift}: client gift missing`);
}
assert.equal(themeCatalog.get('desert').adUnlock, 3, 'Desert ad requirement changed');
assert.equal(check("SHOP_AD_UNLOCK_TARGETS.desert"), 3, 'Desert server ad requirement differs');

const featureSource = fs.readFileSync(path.join(__dirname, '..', 'www/features.js'), 'utf8');
const skinState = new Map();
const featureContext = vm.createContext({
    window: {},
    SHOP_DATA: { SKINS: [...gifts.map(item => ({ id: item.id, themeGift: item.themeGift })), { id: 'default' }] },
    localStorage: { getItem: key => skinState.get(key) || null }
});
vm.runInContext(featureSource, featureContext);
for (const gift of gifts) {
    skinState.set('yamb_active_skin', gift.id);
    const classes = new Set();
    const element = { classList: {
        add: name => classes.add(name),
        remove: name => classes.delete(name),
        toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
        [Symbol.iterator]: () => classes.values()
    } };
    for (const activeTheme of themeCatalog.keys()) {
        skinState.set('yamb_theme', activeTheme);
        new featureContext.window.YambFeatures({ isThemeUnlocked: themeId => themeId === gift.themeGift }).applySkinToElement(element);
        assert(classes.has(`skin-${gift.id}`), `${gift.themeGift}: owned gift does not render under ${activeTheme}`);
    }
    new featureContext.window.YambFeatures({ isThemeUnlocked: () => false }).applySkinToElement(element);
    assert(classes.has('skin-default') && !classes.has(`skin-${gift.id}`), `${gift.themeGift}: locked gift renders on dice`);
}
assert.deepEqual(Array.from(check("filterAllowedUnlocks(['theme_neon_cyber'], [], [], true, [])")), []);
assert.deepEqual(Array.from(check("filterAllowedUnlocks(['theme_neon_cyber'], [], [], false, ['neon'])")), ['theme_neon_cyber']);
assert.deepEqual(Array.from(check("filterAllowedUnlocks(['theme_easter'], [], [], false, ['easter'])")), ['theme_easter']);
assert.deepEqual(Array.from(check("filterAllowedUnlocks(['theme_desert'], [], [], false, [])")), []);
assert.deepEqual(Array.from(check("filterAllowedUnlocks(['theme_light_gold', 'green_clay'], [], [], false, [])")), ['theme_light_gold', 'green_clay']);
assert.deepEqual(Array.from(check("filterAllowedUnlocks(['desert_glass', 'easter_neumorphic', 'severna_nebula'], [], [], true, ['desert', 'easter', 'severna'])")), []);
assert.equal(check("getPaidUnlockPurchaseSummary(new Set(['neon', 'theme_neon_cyber']), new Set(), [], {}).total"), 15000);
assert.equal(check("getPaidUnlockPurchaseSummary(new Set(['theme_neon_cyber']), new Set(), [], {}).total"), 0);
assert.equal(check("(() => { const user = { yamb_unlocked: [], unlockedSkins: [], unlockedEffects: [], activeSkin: 'default' }; addUnlockedShopItemToUser(user, 'desert'); return user.activeSkin === 'theme_desert' && user.unlockedSkins.includes('theme_desert') && user.yamb_unlocked.includes('theme_desert'); })()"), true);

const managers = fs.readFileSync(path.join(__dirname, '..', 'www/managers.js'), 'utf8');
const shopClass = managers.slice(managers.indexOf('class ShopManager {'), managers.indexOf('class AdMobController {'));
const state = new Map([['yamb_dukati', '20000']]);
const storage = {
    getItem: key => state.has(key) ? state.get(key) : null,
    setItem: (key, value) => state.set(key, String(value)),
    removeItem: key => state.delete(key)
};
const items = [
    { id: 'default', price: 0, category: 'Dice' },
    ...gifts.map(gift => ({ id: gift.id, price: 0, themeGift: gift.themeGift, category: 'Theme gifts' }))
];
const themeIds = [...themeCatalog.keys()];
const shopContext = vm.createContext({
    localStorage: storage,
    document: { getElementById: () => null },
    window: { statsManager: { stats: { unlockedSkins: [], unlockedThemes: [] }, saveStats: () => {} }, showNotification: () => {} },
    YAMB_THEME_IDS: themeIds,
    YAMB_FREE_THEME_IDS: ['dark', 'light', 'medium', 'winter'],
    filterYambThemeIds: values => Array.isArray(values) ? values.filter(id => themeCatalog.has(id)) : [],
    SHOP_DATA: { SKINS: items },
    getThemeTreasuryControlSource: () => '',
    resolveText: value => value || '',
    _safeT: () => '',
    console
});
vm.runInContext(`${shopClass}\nthis.ShopManager = ShopManager;`, shopContext);
const shopConfig = { type: 'skin', items, containerId: 'missing', balanceId: 'missing' };
state.set('yamb_unlocked', JSON.stringify(['theme_neon_cyber', 'desert_glass']));
shopContext.window.statsManager.stats.unlockedSkins = ['theme_neon_cyber', 'desert_glass'];
let shop = new shopContext.ShopManager(shopConfig);
let visible = Object.values(shop.groupByCategory()).flat().map(item => item.id);
assert(!visible.includes('theme_neon_cyber'), 'Unowned Neon gift is visible in Treasury');
assert(!shop.unlocked.includes('theme_neon_cyber'), 'Unowned Neon gift is unlocked');
assert(!shop.unlocked.includes('desert_glass'), 'Retired Desert skin survived migration');
for (const gift of gifts.filter(item => ['dark', 'light', 'medium', 'winter'].includes(item.themeGift))) {
    assert(visible.includes(gift.id) && shop.unlocked.includes(gift.id), `${gift.themeGift}: free owned theme gift missing`);
}
storage.setItem('yamb_unlocked_themes', JSON.stringify(['neon']));
shop = new shopContext.ShopManager(shopConfig);
visible = Object.values(shop.groupByCategory()).flat().map(item => item.id);
assert(visible.includes('theme_neon_cyber') && shop.unlocked.includes('theme_neon_cyber'), 'Owned Neon gift missing');

state.clear();
state.set('yamb_dukati', '20000');
const activations = [];
shopContext.window.app = { ensureThemeDiceSkin: (...args) => activations.push(args) };
for (const [themeId, { price, adUnlock }] of themeCatalog) {
    if (price <= 0 || adUnlock > 0) continue;
    state.clear();
    state.set('yamb_dukati', '50000');
    activations.length = 0;
    shopContext.window.statsManager.stats = { unlockedSkins: [], unlockedThemes: [] };
    const themeShop = new shopContext.ShopManager({ type: 'theme', items: [{ id: themeId, price }], containerId: 'missing', balanceId: 'missing' });
    themeShop.processTransaction(themeId, price);
    assert.equal(activations.length, 1, `${themeId}: purchase did not activate gift`);
    assert.equal(activations[0][0], themeId);
    assert.equal(activations[0][1], gifts.find(item => item.themeGift === themeId).id);
    assert.equal(activations[0][2].refreshActiveSkin, true);
    assert.equal(state.get('yamb_dukati'), String(50000 - price), `${themeId}: gift charged an extra price`);
}

state.clear();
state.set('yamb_dukati', '5000');
shopContext.window.statsManager.stats = { unlockedSkins: [], unlockedThemes: [] };
const paidSkinShop = new shopContext.ShopManager({
    type: 'skin', items: [{ id: 'default', price: 0 }, { id: 'classic_red', price: 1500 }],
    containerId: 'missing', balanceId: 'missing'
});
paidSkinShop.processTransaction('classic_red', 1500);
assert(paidSkinShop.unlocked.includes('classic_red'), 'Paid standalone skin was not granted');
assert.equal(state.get('yamb_dukati'), '3500', 'Paid standalone skin charged wrong price');
assert(paidSkinShop.unlocked.includes('default'), 'Free default skin is unavailable');
state.clear();
state.set('yamb_dukati', '1000');
shopContext.window.statsManager.stats = { unlockedSkins: [], unlockedThemes: [] };
const insufficientShop = new shopContext.ShopManager({
    type: 'skin', items: [{ id: 'default', price: 0 }, { id: 'classic_red', price: 1500 }],
    containerId: 'missing', balanceId: 'missing'
});
insufficientShop.processTransaction('classic_red', 1500);
assert(!insufficientShop.unlocked.includes('classic_red'), 'Paid skin unlocked without enough coins');
assert.equal(state.get('yamb_dukati'), '1000', 'Insufficient purchase changed balance');

(async () => {
    state.clear();
    state.set('yamb_dukati', '20000');
    activations.length = 0;
    shopContext.window.statsManager.stats = { unlockedSkins: [], unlockedThemes: [] };
    shopContext.window.adMobGlobal = {
        isRewardVideoReadyFor: () => true,
        showRewardVideo: async () => true,
        claimRewardWithSsvRetry: claim => claim()
    };
    const desertShop = new shopContext.ShopManager({ type: 'theme', items: [{ id: 'desert', price: 0, adUnlock: 3 }], containerId: 'missing', balanceId: 'missing' });
    let adProgress = 0;
    desertShop.claimServerShopAdUnlock = async () => ({ ok: true, progress: ++adProgress, unlocked: adProgress >= 3 });
    desertShop.syncShopStateToServer = () => {};
    await desertShop.watchAdForUnlock('desert', 3);
    await desertShop.watchAdForUnlock('desert', 3);
    assert(!desertShop.unlocked.includes('desert') && activations.length === 0, 'Desert gift activated before all ads');
    await desertShop.watchAdForUnlock('desert', 3);
    assert(desertShop.unlocked.includes('desert'), 'Desert ad unlock did not grant theme');
    assert.equal(activations.length, 1, 'Desert ad unlock did not activate gift');
    assert.equal(activations[0][1], 'theme_desert');
    assert.equal(state.get('yamb_dukati'), '20000', 'Desert ad unlock charged coins');
    console.log('PASS: all 48 skin and 10 theme prices match server; free gifts are available, premium gifts stay hidden until ownership, purchases and ad unlock activate gifts, retired skins are refused.');
})().catch(error => { console.error(error); process.exitCode = 1; });
