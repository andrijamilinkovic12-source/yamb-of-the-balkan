'use strict';

// Production client methods in an isolated VM; no real account, ads or database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function fixture() {
    const storage = new Map(), notices = [], confirmations = [], sent = [];
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, {
            innerText: '', value: '', setAttribute() {},
            classList: { add() {}, remove() {}, contains: () => true }
        });
        return elements.get(id);
    };
    const context = {
        window: { location: { hostname: 'localhost', protocol: 'http:', host: 'localhost' } },
        document: { getElementById: element, querySelectorAll: () => [], addEventListener() {},
            documentElement: { dataset: {} }, body: { classList: { contains: () => false } } },
        localStorage: { getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) },
        console, setTimeout, clearTimeout, URL, t: key => key, dukatIconHtml: () => '', alert() {}, confirm: () => true
    };
    vm.createContext(context);
    vm.runInContext(read('www/config.js'), context);
    vm.runInContext(read('www/managers.js') + '\nglobalThis.Shop = ShopManager;', context);
    // Rendering has its own DOM/browser suite; retain the actual state/purchase methods.
    context.Shop.prototype.render = function () {};
    vm.runInContext(read('www/riznica.js'), context);
    vm.runInContext(read('www/game.js').replace('window.app = new YambApp();', 'globalThis.App = YambApp;'), context);
    const w = context.window;
    w.modalManager = { confirm: () => new Promise(resolve => confirmations.push(resolve)),
        alert: (...args) => notices.push(args) };
    const stats = { balance: 30000, games: 0, unlockedTrophies: [], unlockedSkins: [],
        unlockedEffects: [], unlockedThemes: [] };
    w.statsManager = { stats, saveStats() {
        context.localStorage.setItem('yamb_stats', JSON.stringify(this.stats));
        context.localStorage.setItem('yamb_dukati', this.stats.balance);
    } };
    w.statsManager.saveStats();
    context.localStorage.setItem('yamb_uid', 'treasury-fixture');
    w.app = Object.create(context.App.prototype);
    Object.assign(w.app, { stats: {}, playerName: 'QA', playerId: 'qa',
        socket: { connected: true, emit: (...args) => sent.push(args) },
        getFullLocalStats: () => ({ ...w.statsManager.stats,
            activeSkin: storage.get('yamb_active_skin'), activeEffect: storage.get('yamb_active_effect'),
            activeTheme: storage.get('yamb_theme') }),
        emitPlayerData: () => sent.push(['safe-profile-sync']),
        updateQuickMenuIcons() {}, mergeCloudLeagueData() {}, applyTheme() {},
        prepareTreasuryTheme: async () => true,
        navigateTo() {}, showMainMenu() {} });
    const tab = type => { w.riznicaManager.switchTab(type); return w.shop; };
    return { context, w, storage, confirmations, notices, sent, tab,
        balance: value => { w.statsManager.stats.balance = value; w.statsManager.saveStats(); },
        json: key => JSON.parse(storage.get(key) || '[]') };
}

const tests = [];
const test = (name, run) => tests.push({ name, run });

test('purchase, duplicate debit, reload, equip and typed inventories', async () => {
    const f = fixture(), shop = f.tab('skin');
    assert.equal(shop.processTransaction('classic_red', 1), true);
    assert.equal(shop.balance, 28500, 'Catalog price overrides supplied price');
    assert.equal(shop.processTransaction('classic_red', 1500), false);
    assert.equal(shop.balance, 28500);
    assert(f.json('yamb_unlocked_skins').includes('classic_red'));
    assert(f.w.statsManager.stats.unlockedSkins.includes('classic_red'));
    await shop.equip('classic_red');
    assert.equal(f.storage.get('yamb_active_skin'), 'classic_red');
    await shop.equip('classic_black');
    assert.equal(f.storage.get('yamb_active_skin'), 'classic_red');
    const reopened = f.tab('skin');
    assert(reopened.unlocked.includes('classic_red'));
    assert.equal(reopened.activeItem, 'classic_red');
    assert(f.sent.some(args => args[0] === 'set_player_data' && args[1].stats.activeSkin === 'classic_red'));
    const effect = f.tab('effect');
    assert.equal(effect.processTransaction('fireflies', 5000), true);
    await effect.equip('fireflies');
    assert.equal(f.storage.get('yamb_active_effect'), 'fireflies');
    assert(f.json('yamb_unlocked_effects').includes('fireflies'));
    const theme = f.tab('theme');
    assert.equal(theme.processTransaction('easter', 10000), true);
    await theme.equip('easter');
    assert.equal(f.storage.get('yamb_theme'), 'easter');
    assert(f.json('yamb_unlocked_themes').includes('easter'));
});

test('confirmation stays bound to its source shop after tab switch', async () => {
    const f = fixture(), skin = f.tab('skin');
    await skin.tryBuy('classic_red', 'Red', 1500);
    f.tab('effect');
    f.confirmations.shift()(true);
    await Promise.resolve();
    assert(f.json('yamb_unlocked_skins').includes('classic_red'));
    assert.equal(f.storage.get('yamb_dukati'), '28500');
});

test('cancel and insufficient balance leave inventory and money unchanged', async () => {
    const f = fixture(), shop = f.tab('skin');
    await shop.tryBuy('classic_red', 'Red', 1500);
    f.confirmations.shift()(false);
    await Promise.resolve();
    assert.equal(f.storage.get('yamb_dukati'), '30000');
    assert(!f.json('yamb_unlocked').includes('classic_red'));
    f.balance(100);
    await shop.tryBuy('classic_red', 'Red', 1500);
    assert.equal(f.confirmations.length, 0, 'Use latest balance before showing confirmation');
    assert.equal(shop.processTransaction('classic_red', 1500), false);
    assert.equal(f.storage.get('yamb_dukati'), '100');
});

test('balance changed while confirmation is open is not overwritten', async () => {
    const f = fixture(), shop = f.tab('skin');
    await shop.tryBuy('classic_red', 'Red', 1500);
    f.balance(32000);
    f.confirmations.shift()(true);
    await Promise.resolve();
    assert.equal(f.storage.get('yamb_dukati'), '30500', 'Do not discard a newly credited reward');
});

test('stale shop instance cannot charge twice or overwrite newer inventory', () => {
    const f = fixture(), old = f.tab('skin'), current = f.tab('skin');
    current.processTransaction('classic_red', 1500);
    assert.equal(old.processTransaction('classic_red', 1500), false);
    old.processTransaction('classic_black', 2000);
    assert.equal(f.storage.get('yamb_dukati'), '26500');
    assert(f.json('yamb_unlocked').includes('classic_red'));
    assert(f.json('yamb_unlocked').includes('classic_black'));
});

test('trophies, ad-only themes and unmet prerequisites cannot be bought directly', () => {
    const f = fixture();
    assert.equal(f.tab('trophy').processTransaction('first_play', 0), false);
    assert.equal(f.tab('theme').processTransaction('desert', 0), false);
    assert.equal(f.tab('effect').processTransaction('thunder', 0), false);
    assert.equal(f.storage.get('yamb_dukati'), '30000');
    f.w.statsManager.stats.unlockedTrophies.push('sveti_ilija');
    f.w.statsManager.saveStats();
    const effect = f.tab('effect');
    assert.equal(effect.processTransaction('thunder', 1), true);
});

test('verified discount survives tab switch and restart, expires and is consumed', async () => {
    const f = fixture(), shop = f.tab('skin');
    f.w.adMobGlobal = { ads: { rewarded: { isReady: true } }, showRewardVideo: async () => true };
    shop.claimServerShopDiscount = async () => ({ ok: true, discountedPrice: 1200, expiresAt: Date.now() + 60000 });
    await shop.watchAdDiscount('classic_red');
    f.tab('effect');
    const restored = f.tab('skin'), item = restored.getItemById('classic_red');
    assert.equal(restored.getCurrentItemPrice(item), 1200);
    f.storage.set('yamb_uid', 'other-account');
    assert.equal(f.tab('skin').getCurrentItemPrice(item), 1500, 'Discount cache is account-scoped');
    f.storage.set('yamb_uid', 'treasury-fixture');
    const original = f.tab('skin');
    original.processTransaction('classic_red', 1500);
    assert.equal(f.storage.get('yamb_dukati'), '28800');
    assert.equal(f.tab('skin').getActiveDiscount('classic_red'), null);
    original.discountedItems.classic_black = { discountedPrice: 1600, expiresAt: Date.now() - 1 };
    assert.equal(original.getCurrentItemPrice(original.getItemById('classic_black')), 2000);
});

test('ad unlock requires verified progress and does not debit dukats', async () => {
    const f = fixture(), shop = f.tab('theme');
    let success = false, response = { ok: false, reason: 'ad_verification_pending' };
    f.w.adMobGlobal = { ads: { rewarded: { isReady: true } }, showRewardVideo: async () => success };
    shop.claimServerShopAdUnlock = async () => response;
    await shop.watchAdForUnlock('desert', 1);
    assert(!shop.unlocked.includes('desert'));
    success = true;
    await shop.watchAdForUnlock('desert', 1);
    assert(!shop.unlocked.includes('desert'));
    response = { ok: true, progress: 1, unlocked: false };
    await shop.watchAdForUnlock('desert', 1);
    assert.equal(f.storage.get('yamb_adprogress_desert'), '1');
    response = { ok: true, progress: 3, unlocked: true };
    await shop.watchAdForUnlock('desert', 1);
    assert(shop.unlocked.includes('desert'));
    assert(f.json('yamb_unlocked_themes').includes('desert'));
    assert.equal(f.storage.get('yamb_dukati'), '30000');
});

test('authoritative cloud sync refreshes open treasury balance and ownership', () => {
    const f = fixture(), shop = f.tab('skin');
    f.w.app.applyCloudProfileSync({ statsAuthoritative: true, balance: 800,
        unlockedSkins: ['classic_red'], unlockedEffects: [], unlockedTrophies: ['first_play'],
        unlockedThemes: [], yamb_unlocked: ['classic_red', 'first_play'], activeSkin: 'classic_red' });
    assert.equal(f.w.shop.balance, 800);
    assert(f.w.shop.unlocked.includes('classic_red'));
    assert.equal(f.w.shop.activeItem, 'classic_red');
    assert.equal(shop.processTransaction('classic_black', 2000), false);
});

test('an expired discount prompts confirmation again instead of charging a higher price', async () => {
    const f = fixture(), shop = f.tab('skin');
    shop.discountedItems.classic_red = { discountedPrice: 1200, expiresAt: Date.now() + 60000 };
    shop.saveDiscounts();
    await shop.tryBuy('classic_red', 'Red', 1200);
    shop.discountedItems.classic_red.expiresAt = Date.now() - 1;
    shop.saveDiscounts();
    f.confirmations.shift()(true);
    await Promise.resolve();
    assert.equal(f.storage.get('yamb_dukati'), '30000');
    assert.equal(f.confirmations.length, 1);
    f.confirmations.shift()(true);
    await Promise.resolve();
    assert.equal(f.storage.get('yamb_dukati'), '28500');
});

test('changing account invalidates pending confirmation and ad claims', async () => {
    const f = fixture(), shop = f.tab('skin');
    await shop.tryBuy('classic_red', 'Red', 1500);
    let resolveAd;
    f.w.adMobGlobal = { ads: { rewarded: { isReady: true } },
        showRewardVideo: () => new Promise(resolve => { resolveAd = resolve; }) };
    let claimed = false;
    shop.claimServerShopDiscount = async () => { claimed = true; return { ok: true }; };
    const ad = shop.watchAdDiscount('classic_black');
    f.storage.set('yamb_uid', 'other-account');
    f.balance(700);
    f.confirmations.shift()(true);
    resolveAd(true);
    await ad;
    assert.equal(claimed, false);
    assert.equal(f.storage.get('yamb_dukati'), '700');
    assert(!f.json('yamb_unlocked').includes('classic_red'));
});

test('late ad callback preserves later purchases and the visible tab', async () => {
    const f = fixture(), theme = f.tab('theme');
    let resolveClaim;
    f.w.adMobGlobal = { ads: { rewarded: { isReady: true } }, showRewardVideo: async () => true };
    theme.claimServerShopAdUnlock = () => new Promise(resolve => { resolveClaim = resolve; });
    const claim = theme.watchAdForUnlock('desert', 3);
    await new Promise(setImmediate);
    const skin = f.tab('skin');
    skin.processTransaction('classic_red', 1500);
    const rendered = [];
    theme.render = () => rendered.push('theme');
    skin.render = () => rendered.push('skin');
    resolveClaim({ ok: true, progress: 3, unlocked: true });
    await claim;
    assert(f.json('yamb_unlocked').includes('classic_red'));
    assert(f.json('yamb_unlocked').includes('desert'));
    assert.equal(f.storage.get('yamb_dukati'), '28500');
    assert.deepEqual(rendered, ['skin']);
});

test('cloud sync restores verified discounts and revokes stale theme entitlements', () => {
    const f = fixture();
    f.tab('theme').processTransaction('easter', 10000);
    const skin = f.tab('skin');
    f.w.app.applyCloudProfileSync({ statsAuthoritative: true, balance: 20000,
        unlockedSkins: [], unlockedEffects: [], unlockedTrophies: [], unlockedThemes: [], yamb_unlocked: [],
        activeTheme: 'dark', shopDiscounts: { classic_red: { expiresAt: Date.now() + 60000 } } });
    assert(!skin.getOwnedThemeIds().includes('easter'));
    assert.equal(skin.getCurrentItemPrice(skin.getItemById('classic_red')), 1200);
    assert(!f.w.statsManager.stats.unlockedThemes.includes('easter'));
    assert(!f.json('yamb_stats').unlockedThemes.includes('easter'));
});

test('theme gift skins cannot be bought or equipped without their theme', async () => {
    const f = fixture(), shop = f.tab('skin');
    const gift = shop.items.find(item => item.themeGift === 'easter');
    assert(gift);
    assert.equal(shop.processTransaction(gift.id, 0), false);
    await shop.equip(gift.id);
    assert.notEqual(f.storage.get('yamb_active_skin'), gift.id);
    f.tab('theme').processTransaction('easter', 10000);
    const owned = f.tab('skin');
    await owned.equip(gift.id);
    assert.equal(f.storage.get('yamb_active_skin'), gift.id);
});

test('cancelled/unverified coin ads do not pay; confirmed rewards refresh the current tab', async () => {
    const f = fixture(), shop = f.tab('skin');
    let success = false, claims = 0;
    f.w.adMobGlobal = { ads: { rewarded: { isReady: true } }, showRewardVideo: async () => success };
    shop.claimServerAdReward = async () => { claims++; return { ok: false }; };
    await shop.watchAdForCoins();
    assert.equal(claims, 0);
    success = true;
    await shop.watchAdForCoins();
    assert.equal(f.storage.get('yamb_dukati'), '30000');
    f.tab('effect');
    shop.claimServerAdReward = async () => ({ ok: true, reward: 500, balance: 30500 });
    await shop.watchAdForCoins();
    assert.equal(f.w.shop.balance, 30500);
    assert.equal(f.storage.get('yamb_dukati'), '30500');
});

test('background sync updates cached state without rendering a closed treasury', () => {
    const f = fixture(), shop = f.tab('skin');
    let renders = 0;
    shop.render = () => renders++;
    f.context.document.getElementById('riznica-screen').classList.contains = () => false;
    f.balance(700);
    shop.refreshTreasuryView();
    assert.equal(shop.balance, 700);
    assert.equal(renders, 0);
});

(async () => {
    let failures = 0;
    for (const { name, run } of tests) {
        try { await run(); console.log('PASS: ' + name); }
        catch (error) { failures++; console.error('FAIL: ' + name + '\n' + error.stack); }
    }
    console.log(`${tests.length - failures}/${tests.length} treasury runtime scenarios passed.`);
    if (failures) process.exitCode = 1;
})();
