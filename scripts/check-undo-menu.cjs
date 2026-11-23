'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createProfileWrites } = require('../lib/profile-writes');
const { changeDucats } = require('../lib/ducat-wallet');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const undoSource = read('www/vracanjeupisa.js');
const serverSource = read('server.js');
const managersSource = read('www/managers.js');
const deferred = () => {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
};
const turn = () => new Promise(resolve => setImmediate(resolve));

function makeClient() {
    const values = new Map([['yamb_uid', 'user-a'], ['yamb_dukati', '100'], ['yamb_undo_tokens', '2']]);
    const elements = new Map();
    const timers = new Map();
    const alerts = [], requests = [], ads = [], banners = [];
    let timerId = 0;
    const element = id => {
        if (!elements.has(id)) {
            const classes = new Set();
            elements.set(id, { id, style: {}, dataset: {}, innerText: '',
                setAttribute() {}, querySelector: () => null,
                classList: {
                    add: (...names) => names.forEach(name => classes.add(name)),
                    remove: (...names) => names.forEach(name => classes.delete(name)),
                    contains: name => classes.has(name),
                    toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name)
                } });
        }
        return elements.get(id);
    };
    const snap = { pIdx: 0, col: 'Slobodna', row: '1', diceVals: [1, 2, 3, 4, 5, 6],
        held: [true, false, false, false, false, false], rollCount: 2,
        najavljenoPolje: null, najavaAktivna: false, hasSvetiIlija: false,
        hasProphet: false, consecutiveNajava: 0 };
    const app = {
        onlineMode: false, roomId: 'room', lastMoveSnapshot: snap,
        allScores: [{ Slobodna: { '1': 1 } }],
        modal: { confirm: async () => true, alert: (...args) => alerts.push(args) },
        soundMgr: { win() {} }, effectMgr: { stop() {} },
        loadEquippedEffect() {}, highlightCurrentPlayer() {}, updateTableVisuals() {},
        updateDiceVisuals() {}, updateStatusLabel() {}, autoSaveGame() {},
        authenticateSocketIdentity: async () => ({ ok: true }),
        socket: { connected: true, emit: (event, data, ack) => {
            requests.push({ event, data });
            ack(app.claimResult || { ok: true, reward: 1, undoTokens: 3 });
        } }
    };
    const window = {
        statsManager: { stats: {}, saveStats() {} },
        Capacitor: { isNativePlatform: () => true },
        adMobGlobal: {
            prepareReward() {}, isRewardVideoReadyFor: () => false,
            showRewardVideo: async options => { ads.push(options); return true; },
            consumeLastRewardSsvNonce: () => 'test-nonce',
            claimRewardWithSsvRetry: claim => claim(),
            showEconomyBanner: slot => banners.push(slot.id), hideEconomyBanner() {}
        }, addEventListener() {}
    };
    const context = { window, document: { getElementById: element },
        localStorage: { getItem: key => values.get(key) ?? null,
            setItem: (key, value) => values.set(key, String(value)) },
        setTimeout: fn => { timers.set(++timerId, fn); return timerId; },
        clearTimeout: id => timers.delete(id), gt: () => '', _safeT: () => '', dukatIconHtml: () => '',
        navigator: { onLine: true }, console: { log() {}, info() {}, warn() {}, error() {} } };
    window.app = app;
    const UndoManager = vm.runInNewContext(`${undoSource}\nUndoManager`, context);
    const manager = new UndoManager(app);
    return { manager, app, window, context, values, element, alerts, requests, ads, banners,
        flushTimers() {
            for (let i = 0; timers.size && i < 10; i++) {
                const pending = [...timers.values()];
                timers.clear();
                pending.forEach(fn => fn());
            }
        } };
}

async function checkClientRewards() {
    const c = makeClient();
    c.app.claimResult = { ok: true, reward: 500, balance: 600 };
    await c.manager.claimCoinAdReward();
    assert.equal(c.values.get('yamb_dukati'), '600');
    assert.equal(c.element('economy-dukati-count-large').innerText, 600);
    assert.equal(c.element('menu-dukati-count').innerText, 600);
    assert.equal(c.window.statsManager.stats.balance, 600);
    assert.equal(c.requests[0].event, 'claim_shop_ad_reward');
    assert.equal(c.requests[0].data.ssvNonce, 'test-nonce');
    assert.equal(c.ads[0].context, 'shop_ad_reward');
    assert.equal(c.ads[0].amount, 500);

    c.app.claimResult = { ok: true, reward: 1, undoTokens: 3 };
    await c.manager.buyTokens(1);
    assert.equal(c.values.get('yamb_undo_tokens'), '3');
    assert.equal(c.element('undo-token-count').innerText, 3);
    assert.equal(c.window.statsManager.stats.undoTokens, 3);
    assert.equal(c.requests[1].event, 'claim_undo_token_reward');
    assert.equal(c.ads[1].context, 'undo_tokens');
    assert.equal(c.ads[1].amount, 1);

    c.window.adMobGlobal.showRewardVideo = async () => false;
    await c.manager.claimCoinAdReward();
    await c.manager.buyTokens(1);
    assert.equal(c.requests.length, 2, 'Cancelled videos must not request rewards');
    c.window.adMobGlobal.showRewardVideo = async () => true;
    for (const reason of ['ad_reward_cooldown', 'auth_required', 'err_server_conn', 'ad_verification_pending']) {
        c.app.claimResult = { ok: false, reason };
        await c.manager.claimCoinAdReward();
        await c.manager.buyTokens(1);
        assert.equal(c.values.get('yamb_dukati'), '600');
        assert.equal(c.values.get('yamb_undo_tokens'), '3');
    }
    c.app.claimResult = { ok: true, reward: 500, localFallback: true };
    await c.manager.claimCoinAdReward();
    c.app.claimResult = { ok: true, reward: 1, localFallback: true };
    await c.manager.buyTokens(1);
    assert.equal(c.values.get('yamb_dukati'), '1100');
    assert.equal(c.values.get('yamb_undo_tokens'), '4');
    c.app.socket.connected = false;
    assert.equal((await c.manager.claimServerCoinReward('rewarded')).reason, 'err_server_conn');
    c.app.socket.connected = true;
    c.app.authenticateSocketIdentity = async () => ({ ok: false });
    assert.equal((await c.manager.claimServerUndoTokenReward('rewarded')).reason, 'auth_required');

    const delegated = makeClient();
    delegated.window.shop = { watchAdForCoins: async () => delegated.values.set('yamb_dukati', '600') };
    await delegated.manager.claimCoinAdReward();
    assert.equal(delegated.element('economy-dukati-count-large').innerText, 600);
    assert.equal(delegated.ads.length, 0, 'Shop delegation must not start a second ad');

    const staleShop = makeClient();
    staleShop.window.shop = { isCurrentAccount: () => false,
        watchAdForCoins: () => assert.fail('Do not delegate rewards to a previous account') };
    staleShop.app.claimResult = { ok: true, reward: 500, balance: 600 };
    await staleShop.manager.claimCoinAdReward();
    assert.equal(staleShop.values.get('yamb_dukati'), '600');
    assert.equal(staleShop.ads.length, 1);

    const shopClient = makeClient();
    const shopStart = managersSource.indexOf('class ShopManager {');
    const shopEnd = managersSource.indexOf('class AdMobController {', shopStart);
    const ShopManager = vm.runInNewContext(`${managersSource.slice(shopStart, shopEnd)}\nShopManager`, shopClient.context);
    const shop = Object.create(ShopManager.prototype);
    shop.balance = 100;
    shop.getAdController = () => shopClient.window.adMobGlobal;
    shop.updateBalanceDisplay = () => {};
    shop.refreshTreasuryView = () => shop.updateBalanceDisplay();
    shop.showRewardMessage = () => {};
    shopClient.window.shop = shop;
    shopClient.app.claimResult = { ok: true, reward: 500, balance: 600 };
    await shopClient.manager.claimCoinAdReward();
    assert.equal(shopClient.values.get('yamb_dukati'), '600');
    assert.equal(shop.balance, 600);
    assert.equal(shopClient.requests.length, 1);
    assert.equal(shopClient.element('economy-dukati-count-large').innerText, 600);
}

async function checkServerRewards() {
    const handlers = new Map();
    const socket = { id: 'a', verifiedUid: 'user-a', on(event, handler) { handlers.set(event, handler); }, emit() {} };
    createProfileWrites().bindSocket(socket, ['claim_shop_ad_reward', 'claim_undo_token_reward']);
    const user = { balance: 100, undoTokens: 2, saves: 0, async save() { this.saves++; } };
    const verifications = [];
    let verification = { ok: true };
    const context = {
        socket, MONGO_URI: 'test-only', getVerifiedUid: () => socket.verifiedUid, changeDucats,
        UserProfile: { findOne: async () => user },
        toSafeInt: (value, fallback) => Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback,
        SHOP_AD_REWARD_AMOUNT: 500, SHOP_AD_REWARD_COOLDOWN_MS: 15000,
        UNDO_REWARDED_REWARD_AMOUNT: 1, UNDO_REWARDED_REWARD_COOLDOWN_MS: 15000,
        MAX_BALANCE: 10000, MAX_UNDO_TOKENS: 10, emitProfileSync() {},
        waitForVerifiedAdMobReward: async (...args) => { verifications.push(args); return verification; },
        grantVerifiedAdMobReward: async (_uid, _proof, _key, operation) => operation(null),
        console: { error() {} }
    };
    for (const [event, next] of [['claim_shop_ad_reward', 'claim_shop_discount'], ['claim_undo_token_reward', 'get_previous_quarter_winner']]) {
        const start = serverSource.indexOf(`    socket.on('${event}',`);
        const end = serverSource.indexOf(`    socket.on('${next}',`, start);
        assert(start >= 0 && end > start);
        vm.runInNewContext(serverSource.slice(start, end), context);
    }
    const claim = async event => {
        let result;
        await handlers.get(event)({ type: 'rewarded', ssvNonce: 'nonce', clientRewarded: true }, data => { result = data; });
        return result;
    };
    for (const [event, field, before, after, cooldownField, rewardContext] of [
        ['claim_shop_ad_reward', 'balance', 100, 600, 'lastShopAdRewardAt', 'shop_ad_reward'],
        ['claim_undo_token_reward', 'undoTokens', 2, 3, 'lastUndoRewardedRewardAt', 'undo_tokens']
    ]) {
        verification = { ok: false, reason: 'ad_verification_pending' };
        assert.equal((await claim(event)).ok, false);
        assert.equal(user[field], before, 'Unverified ads cannot change the balance');
        verification = { ok: true };
        assert.equal((await claim(event)).ok, true);
        assert.equal(user[field], after);
        const args = verifications.at(-1);
        assert.equal(args[0], 'user-a');
        assert.equal(args[1], 'nonce');
        assert(args[2].includes(rewardContext));
        const count = verifications.length;
        assert.equal((await claim(event)).reason, 'ad_reward_cooldown');
        assert.equal(user[field], after);
        assert.equal(verifications.length, count + 1, 'Receipt replays are checked before cooldown validation');
        user[cooldownField] = 0;
    }
    user.undoTokens = 10;
    assert.equal((await claim('claim_undo_token_reward')).reason, 'undo_tokens_max');
    assert.equal(user.undoTokens, 10);
    socket.verifiedUid = '';
    assert.equal((await claim('claim_shop_ad_reward')).reason, 'auth_required');
    assert.equal((await claim('claim_undo_token_reward')).reason, 'auth_required');
}

async function checkMenuLifecycle() {
    const c = makeClient();
    c.manager.openMenu();
    c.flushTimers();
    assert(c.element('economy-panel-ducats').classList.contains('active'));
    c.banners.length = 0;
    c.manager.switchMenuTab(1);
    c.manager.switchMenuTab(0);
    c.flushTimers();
    assert.deepEqual(c.banners, ['economy-banner-slot'], 'Only the latest selected tab may show its banner');
    c.banners.length = 0;
    c.manager.switchMenuTab(1);
    c.manager.closeMenu();
    c.flushTimers();
    assert.deepEqual(c.banners, [], 'Closing the menu must cancel a delayed banner');
    assert.equal(c.element('undo-menu-overlay').style.display, 'none');
}

async function checkPendingNativeBanner() {
    const c = makeClient();
    const start = managersSource.indexOf('class AdMobController {');
    const end = managersSource.indexOf('// --- GLOBALNE INSTANCE ---', start);
    const AdMobController = vm.runInNewContext(`${managersSource.slice(start, end)}\nAdMobController`, c.context);
    for (const pendingOperation of ['remove', 'show']) {
        const controller = new AdMobController();
        controller.canRequestAds = true;
        const gate = deferred(), entered = deferred();
        let shows = 0, removals = 0, nativeVisible = false;
        controller.adMobPlugin = {
            removeBanner: async () => {
                removals++;
                if (pendingOperation === 'remove' && removals === 1) { entered.resolve(); await gate.promise; }
                nativeVisible = false;
            },
            showBanner: async () => {
                shows++;
                if (pendingOperation === 'show') { entered.resolve(); await gate.promise; }
                nativeVisible = true;
            }
        };
        const showing = controller.showEconomyBanner(c.element('economy-banner-slot'));
        await entered.promise;
        const hiding = controller.hideEconomyBanner();
        gate.resolve();
        await showing;
        await hiding;
        assert.equal(nativeVisible, false, `Closing during native ${pendingOperation} must not leave a banner`);
        assert.equal(controller.bannerVisible, false);
        if (pendingOperation === 'remove') assert.equal(shows, 0);
    }
}

async function checkClientUndo() {
    const c = makeClient();
    c.app.onlineMode = true;
    c.app.claimResult = { ok: false, reason: 'undo_expired' };
    await c.manager.executeUndo();
    assert.equal(c.values.get('yamb_undo_tokens'), '2');
    assert.equal(c.app.allScores[0].Slobodna['1'], 1);

    const confirm = deferred();
    let confirms = 0;
    c.app.modal.confirm = () => { confirms++; return confirm.promise; };
    const first = c.manager.executeUndo();
    const second = c.manager.executeUndo();
    confirm.resolve(false);
    await first;
    await second;
    assert.equal(confirms, 1, 'Repeated clicks must not open parallel undo confirmations');

    c.app.modal.confirm = async () => { c.app.lastMoveSnapshot = null; return true; };
    const before = c.requests.length;
    await c.manager.executeUndo();
    assert.equal(c.requests.length, before, 'An expired snapshot must not request a rollback');
    assert.equal(c.app.allScores[0].Slobodna['1'], 1);

    const changedRoom = makeClient();
    changedRoom.app.onlineMode = true;
    const authentication = deferred();
    changedRoom.app.authenticateSocketIdentity = () => authentication.promise;
    const pendingUndo = changedRoom.manager.executeUndo();
    await turn();
    changedRoom.app.roomId = 'another-room';
    authentication.resolve({ ok: true });
    await pendingUndo;
    assert.equal(changedRoom.requests.length, 0, 'Authentication must not redirect an old undo into a new room');

    const success = makeClient();
    success.app.onlineMode = true;
    success.app.socket.emit = (_event, _data, ack) => {
        // The ordered server state event precedes the undo acknowledgement.
        success.app.kockiceVals = [6, 6, 6, 6, 6, 6];
        success.app.allScores[0].Slobodna['1'] = null;
        ack({ ok: true, undoTokens: 1 });
    };
    await success.manager.executeUndo();
    assert.equal(success.values.get('yamb_undo_tokens'), '1');
    assert.deepEqual(success.app.kockiceVals, [6, 6, 6, 6, 6, 6], 'Local snapshot must not overwrite authoritative online dice');
    assert.equal(success.app.lastMoveSnapshot, null);

    const switched = makeClient(), ack = deferred();
    switched.app.onlineMode = true;
    switched.app.socket.emit = (_event, _data, reply) => ack.promise.then(reply);
    const lateUndo = switched.manager.executeUndo();
    await turn();
    switched.values.set('yamb_uid', 'other-account');
    switched.values.set('yamb_undo_tokens', '40');
    ack.resolve({ ok: true, undoTokens: 1 });
    await lateUndo;
    assert.equal(switched.values.get('yamb_undo_tokens'), '40', 'Late rollback cannot change another account tokens');

    const offline = makeClient();
    offline.window.adMobGlobal.showRewardVideo = async () => { offline.app.lastMoveSnapshot = null; return true; };
    await offline.manager.executeUndo();
    assert.equal(offline.app.allScores[0].Slobodna['1'], 1, 'An ad result must not restore an obsolete local move');
}

function makeServer() {
    const handlers = new Map(), emissions = [];
    const socket = { id: 'a', verifiedUid: 'user-a', on(event, handler) { handlers.set(event, handler); },
        emit: (...args) => emissions.push(args) };
    createProfileWrites().bindSocket(socket, ['undo_last_move']);
    const move = { socketId: 'a', playerIndex: 0, col: 'Slobodna', row: '1', previousValue: null,
        diceValues: [1, 2, 3, 4, 5, 6], held: [true, false, false, false, false, false],
        rollCount: 2, turnIndex: 0, moveCount: 4 };
    const state = { players: ['a', 'b'], turnIndex: 1, brojBacanja: 0, moveCount: 5,
        allScores: [{ Slobodna: { '1': 1 } }, {}], lastUndoMove: move };
    const roomState = { room: state };
    const gate = deferred(), entered = deferred();
    let tokens = 2, delayDebit = false, debits = 0, refunds = 0, syncs = 0;
    const context = { socket, MONGO_URI: 'test-only', roomState, playerRooms: { a: 'room' },
        isLocalRoomId: () => false, getVerifiedUid: () => socket.verifiedUid,
        toSafeInt: (value, fallback) => Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback,
        REDOVI_IGRA: ['1'],
        UserProfile: {
            findOneAndUpdate: async (_query, update) => {
                const amount = update.$inc.undoTokens;
                if (amount < 0) {
                    debits++;
                    entered.resolve();
                    if (delayDebit) await gate.promise;
                    if (!tokens) return null;
                } else refunds++;
                tokens += amount;
                return { undoTokens: tokens };
            }, findOne: async () => ({ undoTokens: tokens })
        },
        emitProfileSync: (_socket, user) => emissions.push(['profile', user.undoTokens]),
        startTurnTimer() {}, emitAuthoritativeRoomState() { syncs++; },
        io: { sockets: { sockets: new Map([['a', socket], ['b', { id: 'b' }]]) } },
        console: { error() {} }
    };
    const start = serverSource.indexOf("    socket.on('undo_last_move',");
    const end = serverSource.indexOf("    socket.on('sync_state_response',", start);
    assert(start >= 0 && end > start);
    vm.runInNewContext(serverSource.slice(start, end), context);
    return { state, context, emissions, entered, gate,
        pauseDebit() { delayDebit = true; },
        get tokens() { return tokens; }, get debits() { return debits; },
        get refunds() { return refunds; }, get syncs() { return syncs; },
        async undo(data = {}) {
            let result;
            await handlers.get('undo_last_move')({ roomId: 'room', row: '1', col: 'Slobodna', pIdx: 0, ...data }, value => { result = value; });
            return result;
        } };
}

async function checkServerUndo() {
    const normal = makeServer();
    const first = normal.undo();
    const second = normal.undo();
    assert.equal((await first).ok, true);
    assert.equal((await second).ok, false);
    assert.equal(normal.tokens, 1);
    assert.equal(normal.debits, 1);
    assert.equal(normal.syncs, 2);
    assert.equal(normal.state.allScores[0].Slobodna['1'], null);
    assert.equal(normal.state.turnIndex, 0);
    assert.equal(normal.state.brojBacanja, 2);

    const stale = makeServer();
    assert.equal((await stale.undo({ row: '2' })).ok, false, 'An old request cannot undo a different cell');
    assert.equal(stale.debits, 0);

    for (const change of ['roll', 'room', 'finish']) {
        const c = makeServer();
        c.pauseDebit();
        const pending = c.undo();
        await c.entered.promise;
        if (change === 'roll') { c.state.lastUndoMove = null; c.state.brojBacanja = 1; }
        if (change === 'room') delete c.context.roomState.room;
        if (change === 'finish') c.state.gameFinished = true;
        c.gate.resolve();
        const result = await pending;
        assert.equal(result.ok, false, `Undo must fail after concurrent ${change}`);
        assert.equal(c.tokens, 2, `Failed ${change} rollback must refund its token`);
        assert.equal(c.refunds, 1);
        assert.equal(c.state.allScores[0].Slobodna['1'], 1);
        assert.equal(c.syncs, 0);
    }
    const completed = makeServer();
    completed.state.completionSettlementPromise = Promise.resolve();
    assert.equal((await completed.undo()).ok, false, 'A settling final result cannot be undone');
    assert.equal(completed.debits, 0);
}

async function main() {
    for (const check of [checkClientRewards, checkServerRewards, checkMenuLifecycle, checkPendingNativeBanner, checkClientUndo, checkServerUndo]) {
        try {
            await check();
            await turn();
            console.log(`PASS: ${check.name}`);
        } catch (error) {
            console.error(`FAIL: ${check.name}`, error);
            process.exitCode = 1;
        }
    }
}
const watchdog = setTimeout(() => { console.error('Undo menu checks timed out'); process.exit(1); }, 10000);
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
