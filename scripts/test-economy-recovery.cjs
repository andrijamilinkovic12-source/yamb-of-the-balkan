'use strict';

// Actual client methods and socket handlers; isolated storage/models, no SDK/network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { test } = require('node:test');
const { walletState } = require('../lib/ducat-wallet');
const { applyUpdate, matches } = require('./economy-mongo-fixture.cjs');
const { createMail, appendMail } = require('../lib/player-mailbox');
const { createAccountDeletion } = require('../lib/account-deletion');
const read = file => fs.readFileSync(require.resolve('../' + file), 'utf8').replace(/\r\n/g, '\n');
const managers = read('www/managers.js'), game = read('www/game.js'), server = read('server.js');
const uid = 'economy-recovery-fixture-uid';
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

function client() {
    const storage = new Map([['yamb_uid', uid]]), sent = [], applied = [];
    const window = { yambAuthSessionVersion: 1, showNotification() {}, app: {
        socket: { connected: true }, authenticateSocketIdentity: async () => ({ ok: true }),
        applyCloudProfileSync: data => applied.push(data)
    } };
    const context = vm.createContext({ window, navigator: { onLine: true },
        document: { querySelectorAll: () => [], getElementById: () => null, addEventListener() {} },
        localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)) },
        getPlayerId: () => storage.get('yamb_uid'), _safeT: () => '', console: { warn() {}, info() {} }, setTimeout, clearTimeout });
    const Controller = vm.runInContext(managers.slice(managers.indexOf('class AdMobController {'), managers.indexOf('// --- GLOBALNE INSTANCE ---')) + '\nAdMobController', context);
    const App = vm.runInContext(game.slice(game.indexOf('class YambApp {'), game.indexOf('window.app = new YambApp();')) + '\nYambApp', context);
    let responder = () => ({ ok: true, entries: [] });
    window.app.socket.emit = (event, data, ack) => {
        sent.push({ event, data });
        Promise.resolve(responder(event, data)).then(ack);
    };
    const restart = () => {
        const controller = new Controller();
        controller.scheduleEconomyRecovery = () => {};
        window.adMobGlobal = controller;
        return controller;
    };
    const app = Object.assign(Object.create(App.prototype), window.app, {
        rewardRuntimeId: 'runtime-before-restart', ensurePendingRewardMatchSubmitted: async () => ({ ok: true })
    });
    window.app = app;
    return { storage, sent, applied, window, app, restart, controller: restart(), respond: handler => { responder = handler; } };
}

const query = data => ({ select() { return this; }, lean: async () => data,
    then: (resolve, reject) => Promise.resolve(data).then(resolve, reject) });

function serverHandler(event, values = {}) {
    let handler;
    const socket = { verifiedUid: uid, emit() {}, on(_event, fn) { handler = fn; } };
    const context = vm.createContext({ socket, crypto, walletState, console: { error() {} }, MONGO_URI: 'synthetic',
        getVerifiedUid: socket => socket.verifiedUid, sanitizeAdMobContext: String,
        toSafeInt: (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback,
        MAX_BALANCE: 5000000, MAX_UNDO_TOKENS: 250, SHOP_AD_REWARD_AMOUNT: 500,
        SHOP_AD_REWARD_COOLDOWN_MS: 15000, UNDO_REWARDED_REWARD_COOLDOWN_MS: 15000,
        SHOP_ITEM_PRICES: { classic_red: 1500 }, SHOP_AD_UNLOCK_IDS: new Set(['desert']),
        getExistingUnlockSet: user => new Set(user.yamb_unlocked || []),
        verifyDailyClaimToken: () => true, getDailyChallengeForUid: () => ({ reward: 100 }),
        getLegacyDailyDayKey: date => date.toDateString(), isDailyKeyToday: (key, canonical, legacy) => key === canonical || key === legacy,
        ...values });
    const start = server.indexOf(`    socket.on('${event}',`);
    assert(start >= 0);
    vm.runInContext(server.slice(start, server.indexOf('\n    });', start) + 8), context);
    return async data => { let result; await handler(data || {}, value => { result = value; }); return result; };
}

test('more than twenty games survive restart with x2 metadata and recover without replaying the ad', async () => {
    const f = client();
    for (let i = 0; i < 35; i++) f.app.rememberPendingGameReward('match-' + i, 100);
    f.app.rememberPendingGameReward('match-0', 100, { doubled: true, ssvNonce: 'earned-ad-nonce' });
    assert.equal(f.app.readPendingGameRewards().length, 35);
    f.app.rewardRuntimeId = 'runtime-after-restart';
    const calls = [];
    f.app.claimServerGameReward = async (score, doubled, nonce, matchId) => {
        calls.push({ score, doubled, nonce, matchId });
        return { ok: true, balance: 1000 + calls.length * 100 };
    };
    await f.app.recoverPendingGameRewards();
    assert.equal(calls.length, 35);
    assert(calls.find(call => call.matchId === 'match-0').doubled);
    assert.equal(calls.find(call => call.matchId === 'match-0').nonce, 'earned-ad-nonce');
    assert.equal(f.app.readPendingGameRewards().length, 0);
});

test('completed SDK reward is persisted before its promise resolves; server proof restores a lost local queue', async () => {
    const f = client(), controller = f.controller;
    controller.activeRewardSsvInfo = { uid, nonce: 'watched-ad', context: 'shop_ad_reward', claimData: {} };
    let persistedAtResolve = false;
    controller.rewardResolve = () => { persistedAtResolve = controller.readEconomyClaims().some(item => item.nonce === 'watched-ad'); };
    controller.settleRewardVideo(true);
    assert(persistedAtResolve);
    f.storage.delete('yamb_pending_economy_' + uid);
    let paid = false;
    f.respond(event => {
        if (event === 'get_pending_ad_rewards') return { ok: true, entries: paid ? [] : [{ nonce: 'watched-ad', context: 'shop_ad_reward', claimData: {} }] };
        if (event === 'claim_shop_ad_reward') { paid = true; return { ok: true, reward: 500 }; }
        if (event === 'request_profile_sync') return { ok: true, cloudStats: { balance: 1500 } };
        return { ok: true, entries: [] };
    });
    const restarted = f.restart();
    await restarted.recoverPendingEconomyClaims();
    assert(paid);
    assert.equal(restarted.readEconomyClaims().length, 0);
    assert.equal(f.applied.at(-1).balance, 1500);
});

test('pending double verification cannot withhold the base reward during automatic recovery', async () => {
    const f = client();
    f.app.rememberPendingGameReward('earned-match', 350, { doubled: true, ssvNonce: 'delayed-ssv', deferred: true });
    const calls = [];
    f.app.claimServerGameReward = async (_score, doubled) => {
        calls.push(doubled);
        return doubled ? { ok: false, reason: 'ad_verification_pending', permanent: false } : { ok: true, balance: 1350 };
    };
    await f.app.recoverPendingGameRewards();
    assert.deepEqual(calls, [true, false]);
    assert.equal(f.storage.get('yamb_dukati'), '1350');
    assert.equal(f.app.readPendingGameRewards().length, 0);
    const waiting = f.controller.readEconomyClaims();
    assert.equal(waiting.length, 1);
    assert.equal(waiting[0].nonce, 'delayed-ssv');
    assert(!waiting[0].blocked);
});

test('late SSV notification can schedule discovery even with no local pending rewards', async () => {
    const f = client(), controller = f.controller;
    delete controller.scheduleEconomyRecovery;
    let recovered = 0;
    controller.recoverPendingEconomyClaims = async () => { recovered++; };
    controller.scheduleEconomyRecovery({ discover: true });
    assert(controller.economyRecoveryTimer, 'Server receipt must be discovered after a reinstall');
    await new Promise(resolve => setTimeout(resolve, 1100));
    assert.equal(recovered, 1);
});

test('recovery preserves all reward contexts and the original signed daily target', async () => {
    const f = client();
    const infos = [
        { context: 'undo_tokens', nonce: 'token' }, { context: 'shop_ad_reward', nonce: 'coins' },
        { context: 'shop_discount:classic_red', nonce: 'discount' }, { context: 'shop_ad_unlock:desert', nonce: 'unlock' },
        { context: 'game_double', nonce: 'game', claimData: { matchId: 'original-match', score: 350 } },
        { context: 'daily_double', nonce: 'daily', claimData: { dayKey: '2026-10-01', amount: 200, claimToken: 'signed-original-day' } }
    ];
    for (const info of infos) f.controller.rememberEconomyClaim({ ...info, uid });
    let discovered = false;
    f.respond(event => {
        if (event === 'get_pending_ad_rewards') { discovered = true; return { ok: true, entries: [] }; }
        return { ok: true, entries: [], balance: 1000 };
    });
    await f.restart().recoverPendingEconomyClaims();
    assert(discovered);
    for (const event of ['claim_undo_token_reward', 'claim_shop_ad_reward', 'claim_shop_discount', 'claim_shop_ad_unlock', 'claim_game_reward', 'claim_daily_reward']) {
        assert.equal(f.sent.filter(call => call.event === event).length, 1, event);
    }
    const daily = f.sent.find(call => call.event === 'claim_daily_reward').data;
    assert.equal(daily.dayKey, '2026-10-01');
    assert.equal(daily.claimToken, 'signed-original-day');
    assert.equal(daily.doubled, true);
    assert.equal(f.window.adMobGlobal.readEconomyClaims().length, 0);
});

test('recovery is single-flight and a late old-account response cannot update the new account', async () => {
    const f = client(), gate = deferred();
    f.controller.rememberEconomyClaim({ uid, nonce: 'old-account-ad', context: 'shop_ad_reward' });
    f.respond(event => event === 'claim_shop_ad_reward' ? gate.promise : { ok: true, entries: [] });
    const first = f.controller.recoverPendingEconomyClaims(), second = f.controller.recoverPendingEconomyClaims();
    await new Promise(setImmediate);
    assert.equal(f.sent.filter(call => call.event === 'claim_shop_ad_reward').length, 1);
    f.storage.set('yamb_uid', 'another-account');
    f.window.yambAuthSessionVersion++;
    gate.resolve({ ok: true, cloudStats: { balance: 1500 } });
    await Promise.all([first, second]);
    assert.equal(f.applied.length, 0);
    assert.equal(f.controller.readEconomyClaims(uid).length, 1);
});

test('daily base queue survives restart and an unsupported old proof does not loop forever', async () => {
    const f = client();
    f.controller.rememberEconomyClaim({ uid, context: 'daily_base', active: true, claimData: { dayKey: '2026-10-01', amount: 100, claimToken: 'signed' } });
    f.controller.rememberEconomyClaim({ uid, context: 'game_double', nonce: 'legacy-unbound' });
    await f.controller.recoverPendingEconomyClaims();
    assert(!f.sent.some(call => call.event === 'claim_daily_reward'), 'Do not auto-claim while choosing x2');
    await f.restart().recoverPendingEconomyClaims();
    assert.equal(f.sent.filter(call => call.event === 'claim_daily_reward').length, 1);
    const retained = f.window.adMobGlobal.readEconomyClaims();
    assert.equal(retained.length, 1);
    assert(retained[0].blocked);
});

test('native ad is not shown when the server rejects capacity or cooldown', async () => {
    for (const reason of ['undo_tokens_max', 'wallet_capacity', 'ad_reward_cooldown']) {
        const f = client(), controller = f.controller;
        let shows = 0;
        controller.canRequestAds = true;
        controller.adMobPlugin = { showRewardVideoAd: () => { shows++; } };
        controller.waitForRewardVideoReadyFor = async () => true;
        controller.isRewardVideoReadyFor = () => true;
        const options = { context: reason === 'undo_tokens_max' ? 'undo_tokens' : 'shop_ad_reward' };
        controller.rewardSsvInfo = controller.createRewardSsvInfo(options);
        f.respond(() => ({ ok: false, reason, retryAfterMs: 10000 }));
        assert.equal(await controller.showRewardVideo(options), false);
        assert.equal(f.sent.filter(call => call.event === 'check_reward_eligibility').length, 1);
        assert.equal(controller.rewardRequestOptions, null);
        assert.equal(shows, 0);
    }
    const f = client();
    f.controller.canRequestAds = true;
    f.controller.adMobPlugin = { showRewardVideoAd: () => assert.fail('An already completed ad must not be shown again') };
    f.controller.rememberEconomyClaim({ uid, nonce: 'already-watched', context: 'shop_ad_reward', claimData: {} });
    assert.equal(await f.controller.showRewardVideo({ context: 'shop_ad_reward' }), true);
    assert.equal(f.controller.consumeLastRewardSsvNonce(), 'already-watched');
});

test('reward request keeps its selected context, target and nonce while preflight and native show are pending', async () => {
    for (const requested of [
        { context: 'shop_ad_reward', amount: 500 },
        { context: 'undo_tokens', amount: 1 },
        { context: 'game_double', amount: 2200, claimData: { matchId: 'original-match', score: 1000 } },
        { context: 'daily_double', amount: 200, claimData: { dayKey: '2026-11-20', amount: 200, claimToken: 'original-token' } },
        { context: 'shop_discount:classic_red', amount: 1500 },
        { context: 'shop_ad_unlock:desert', amount: 1 }
    ]) {
        const f = client(), c = f.controller, entered = deferred(), eligibility = deferred(), native = deferred();
        const preparations = [], shows = [];
        const other = requested.context === 'game_double' ? { ...requested, claimData: { matchId: 'another-match', score: 1000 } }
            : requested.context === 'daily_double' ? { ...requested, claimData: { ...requested.claimData, dayKey: '2026-11-19' } }
            : requested.context === 'undo_tokens' ? { context: 'shop_ad_reward', amount: 500 } : { context: 'undo_tokens', amount: 1 };
        c.canRequestAds = true;
        c.adMobPlugin = {
            async prepareRewardVideoAd(options) {
                preparations.push(JSON.parse(options.ssv.customData));
                c.handleAdLoaded('rewarded');
                return {};
            },
            showRewardVideoAd() { shows.push(preparations.at(-1)); return native.promise; }
        };
        c.prepareReward(requested);
        await new Promise(setImmediate);
        const selected = JSON.parse(JSON.stringify(c.rewardSsvInfo));
        f.respond(event => {
            if (event === 'check_reward_eligibility') { entered.resolve(); return eligibility.promise; }
            return { ok: true };
        });
        const watched = c.showRewardVideo(requested);
        await entered.promise;
        c.prepareReward(other);
        c.loadRewardAd(other);
        c.triggerHighPriorityLoad('rewarded', other);
        if (requested.claimData) requested.claimData = { matchId: 'changed-by-caller' };
        eligibility.resolve({ ok: true });
        await new Promise(setImmediate);
        c.prepareReward(other);
        native.resolve({ type: 'reward', amount: 1 });
        assert.equal(await watched, true);
        assert.equal(preparations.length, 1, 'Another preload replaced the active SDK ad');
        assert.equal(shows.length, 1);
        assert.equal(shows[0].context, selected.context);
        assert.equal(shows[0].nonce, selected.nonce);
        assert.deepEqual(shows[0].claimData, selected.claimData);
        assert.equal(c.lastRewardSsvInfo.nonce, selected.nonce);
        assert.equal(c.rewardRequestOptions, null);
        c.prepareReward(other);
        await new Promise(setImmediate);
        assert.equal(preparations.length, 2, 'The next context must be loadable after completion');
    }
});

test('reward request waits for its own ad when another context was already loading', async () => {
    const f = client(), c = f.controller, preparations = [], shown = [];
    const requested = { context: 'shop_ad_reward', amount: 500 }, other = { context: 'undo_tokens', amount: 1 };
    c.canRequestAds = true;
    c.adMobPlugin = {
        async prepareRewardVideoAd(options) { preparations.push(JSON.parse(options.ssv.customData)); return {}; },
        async showRewardVideoAd() { shown.push(preparations.at(-1)); return { amount: 1 }; }
    };
    c.prepareReward(other);
    const watched = c.showRewardVideo(requested);
    c.prepareReward(other);
    c.handleAdLoaded('rewarded');
    assert.equal(preparations.length, 2, 'A finished load for another reward must be replaced by the locked request');
    c.handleAdLoaded('rewarded');
    assert.equal(await watched, true);
    assert.equal(shown.length, 1);
    assert.equal(shown[0].context, requested.context);
    assert.equal(c.pendingRewardOptions.context, other.context, 'The deferred context should remain available for the next ad');
});

test('reward request releases the context after an SDK failure', async () => {
    const f = client(), c = f.controller;
    c.canRequestAds = true;
    c.scheduleAdRetry = () => {};
    c.adMobPlugin = {
        async prepareRewardVideoAd() { c.handleAdLoaded('rewarded'); return {}; },
        async showRewardVideoAd() { throw new Error('synthetic_native_failure'); }
    };
    c.prepareReward({ context: 'shop_ad_reward', amount: 500 });
    assert.equal(await c.showRewardVideo({ context: 'shop_ad_reward', amount: 500 }), false);
    assert.equal(c.rewardRequestOptions, null);
    assert.equal(c.rewardShowInProgress, false);
    c.prepareReward({ context: 'undo_tokens', amount: 1 });
    await new Promise(setImmediate);
    assert.equal(c.isRewardVideoReadyFor({ context: 'undo_tokens', amount: 1 }), true);
});

test('reward request retries its locked context after load failure instead of a deferred reward', async () => {
    const f = client(), c = f.controller, preparations = [];
    c.canRequestAds = true;
    c.adRetryPolicy.rewarded.baseDelay = 1;
    c.adMobPlugin = {
        async prepareRewardVideoAd(options) {
            preparations.push(JSON.parse(options.ssv.customData));
            if (preparations.length === 1) throw new Error('synthetic_load_failure');
            c.handleAdLoaded('rewarded');
            return {};
        },
        async showRewardVideoAd() { return { amount: 1 }; }
    };
    const watched = c.showRewardVideo({ context: 'shop_ad_reward', amount: 500 });
    c.prepareReward({ context: 'undo_tokens', amount: 1 });
    assert.equal(await watched, true);
    assert.deepEqual(preparations.map(info => info.context), ['shop_ad_reward', 'shop_ad_reward']);
    assert.equal(c.pendingRewardOptions.context, 'undo_tokens');
    assert.equal(c.lastRewardSsvInfo.context, 'shop_ad_reward');
});

test('reward request rejects a replaced SDK proof before showing any native ad and releases its lock', async () => {
    for (const replaceWithSameContext of [false, true]) {
        const f = client(), c = f.controller, entered = deferred(), eligibility = deferred();
        const requested = { context: 'shop_ad_reward', amount: 500 };
        let shows = 0;
        c.canRequestAds = true;
        c.adMobPlugin = {
            async prepareRewardVideoAd() { c.handleAdLoaded('rewarded'); return {}; },
            showRewardVideoAd() { shows++; return { amount: 1 }; }
        };
        c.prepareReward(requested);
        await new Promise(setImmediate);
        f.respond(event => {
            if (event === 'check_reward_eligibility') { entered.resolve(); return eligibility.promise; }
            return { ok: true };
        });
        const watched = c.showRewardVideo(requested);
        await entered.promise;
        c.rewardSsvInfo = c.createRewardSsvInfo(replaceWithSameContext ? requested : { context: 'undo_tokens', amount: 1 });
        eligibility.resolve({ ok: true });
        assert.equal(await watched, false);
        assert.equal(shows, 0);
        assert.equal(c.rewardRequestOptions, null);
        assert.equal(c.rewardShowInProgress, false);
    }
});

test('server preflight enforces token/wallet limits, cooldowns, legacy claims and owned items', async () => {
    const user = { balance: 4999700, undoTokens: 250, dailyRewardPayouts: {}, yamb_unlocked: [] };
    const preflight = serverHandler('check_reward_eligibility', { UserProfile: { findOne: () => query(user) } });
    assert.equal((await preflight({ context: 'undo_tokens' })).reason, 'undo_tokens_max');
    assert.equal((await preflight({ context: 'shop_ad_reward' })).reason, 'wallet_capacity');
    user.undoTokens = 249;
    assert.equal((await preflight({ context: 'undo_tokens' })).ok, true);
    user.balance = 4999500;
    assert.equal((await preflight({ context: 'shop_ad_reward' })).ok, true);
    user.lastShopAdRewardAt = Date.now();
    assert.equal((await preflight({ context: 'shop_ad_reward' })).reason, 'ad_reward_cooldown');
    user.yamb_unlocked.push('classic_red');
    assert.equal((await preflight({ context: 'shop_discount:classic_red' })).reason, 'already_unlocked');
    user.lastDailyRewardClaimed = '2026-10-01';
    assert.equal((await preflight({ context: 'daily_double', claimData: { dayKey: '2026-10-01', claimToken: 'signed' } })).reason, 'daily_already_claimed');
});

test('game preflight waits for record metadata and checks capacity using the full bonus', async () => {
    const user = { balance: 4997900 }, result = { rewardClaimedUids: [], rewardPayouts: {} };
    let metadata = null;
    const preflight = serverHandler('check_reward_eligibility', {
        UserProfile: { findOne: () => query(user) },
        findVerifiedMatchParticipant: async () => ({ ok: true, matchId: 'record-match', score: 1000, result }),
        ensureGameRewardScoreRecord: async () => metadata,
        calculateSoloRecordPayout(score, achievements) {
            assert.equal(score, 1000);
            assert.equal(achievements[0], 'personal');
            return { baseReward: 1100, adReward: 2200 };
        },
        hasUserClaimedGameReward: () => false
    });
    const input = { context: 'game_double', claimData: { matchId: 'record-match', score: 1000 } };
    const pending = await preflight(input);
    assert.equal(pending.reason, 'game_reward_metadata_pending');
    assert.equal(pending.permanent, false);
    metadata = { recordAchievements: ['personal'] };
    assert.equal((await preflight(input)).reason, 'wallet_capacity');
    user.balance = 4997800;
    assert.equal((await preflight(input)).ok, true);
    result.rewardPayouts[crypto.createHash('sha256').update(uid).digest('hex')] = { amount: 1100 };
    user.balance = 4998901;
    assert.equal((await preflight(input)).reason, 'wallet_capacity');
    user.balance = 4998900;
    assert.equal((await preflight(input)).ok, true);
});

test('delayed record metadata remains retryable and never blocks a completed x2 entitlement', async () => {
    const f = client(), c = f.controller;
    c.rememberEconomyClaim({ uid, context: 'game_double', nonce: 'record-ad', claimData: { matchId: 'record-match', score: 1000 } });
    c.waitForRewardSsvEvent = async () => true;
    let attempts = 0;
    const result = await c.claimRewardWithSsvRetry(async () => {
        attempts++;
        return attempts === 1 ? { ok: false, reason: 'game_reward_metadata_pending', permanent: false, retryAfterMs: 2000 }
            : { ok: true, reward: 2200, balance: 12200 };
    }, { nonce: 'record-ad', context: 'game_double' });
    assert.equal(result.reward, 2200);
    assert.equal(attempts, 2);
    assert.equal(c.readEconomyClaims().length, 0);
});

test('old unclaimed quarter rewards are discovered from scores and archives, not only the previous quarter', async () => {
    const discovery = serverHandler('get_pending_quarter_rewards', {
        UserProfile: { findOne: () => query({ claimedLeagueRewards: ['2025_Q4'] }) },
        LeagueScore: { find(filter) { assert.equal(filter.playerId, uid); return query([{ year: 2025, quarter: 4 }, { year: 2026, quarter: 1 }, { year: 2026, quarter: 4 }]); } },
        LeagueHallOfFame: { find(filter) { assert.equal(filter['topScores.playerId'], uid); return query([{ year: 2026, quarter: 1 }, { year: 2026, quarter: 2 }]); } },
        getLeaguePeriodKey: (year, quarter) => `${year}_Q${quarter}`,
        isPastLeaguePeriod: (year, quarter) => year < 2026 || year === 2026 && quarter < 4
    });
    const periods = (await discovery()).entries;
    assert.deepEqual(JSON.parse(JSON.stringify(periods)), [{ year: 2026, quarter: 1 }, { year: 2026, quarter: 2 }]);
    const f = client(), paid = new Set();
    f.respond((event, data) => {
        if (event === 'get_pending_quarter_rewards') return { ok: true, entries: periods.filter(period => !paid.has(period.quarter)) };
        if (event === 'check_quarter_reward') { paid.add(data.quarter); return { ok: true }; }
        return { ok: true, entries: [] };
    });
    await f.controller.recoverPendingEconomyClaims();
    await f.controller.recoverPendingEconomyClaims();
    assert.deepEqual([...paid], [1, 2]);
    assert.equal(f.sent.filter(call => call.event === 'check_quarter_reward').length, 2);
});

test('trophy and historical quarter rewards retain their full value at the wallet cap and cannot pay twice', async () => {
    const state = { firebaseUid: uid, balance: 5000000, pendingDucats: 0, unlockedTrophies: [], claimedTrophyRewards: [], claimedLeagueRewards: [] };
    const document = () => {
        const user = { ...structuredClone(state), async save() {
            const { save, ...fields } = this;
            Object.assign(state, structuredClone(fields));
        } };
        return user;
    };
    const UserProfile = {
        findOne: () => query(document()),
        async findOneAndUpdate(filter, update) {
            if (!matches(state, filter)) return null;
            applyUpdate(state, update);
            return document();
        }
    };
    const trophy = serverHandler('claim_trophy_reward', { UserProfile,
        ALL_TROPHY_IDS: new Set(['first_play']), TROPHY_REWARDS: { first_play: 500 },
        sanitizeTrophyIds: value => value, ensureTrophyRewardLedger: async user => user.claimedTrophyRewards,
        isTrophyClaimEarned: () => true, emitProfileSync() {} });
    assert.equal((await trophy({ trophyId: 'first_play' })).reward, 500);
    assert.equal(state.pendingDucats, 500);
    assert.equal((await trophy({ trophyId: 'first_play' })).reward, 0);
    const quarter = serverHandler('check_quarter_reward', { UserProfile, createMail, appendMail, emitProfileSync() {}, notifyPlayerMailbox() {},
        isPastLeaguePeriod: () => true, getLeagueSettlementInfo: () => ({ settled: true }),
        getLeaguePeriodKey: (year, quarter) => `${year}_Q${quarter}`,
        archiveLeagueQuarter: async () => ({ topScores: [{ playerId: uid }] }) });
    for (const period of [{ year: 2026, quarter: 1 }, { year: 2026, quarter: 2 }]) {
        assert.equal((await quarter(period)).reward, 10000);
        assert.equal((await quarter(period)).status, 'already_claimed');
    }
    assert.equal(state.balance, 5000000);
    assert.equal(state.pendingDucats, 20500);
    assert.equal(state.playerMailbox.length, 2);
});

test('account deletion erases private purchases and only the removed player payout metadata', async () => {
    const calls = [];
    const models = new Proxy({}, { get: (_target, name) => ({ collection: { name } }) });
    const db = { collection: name => ({
        find: () => ({ toArray: async () => [], async *[Symbol.asyncIterator]() {} }),
        deleteMany: async filter => { calls.push({ name, method: 'deleteMany', filter }); },
        updateMany: async (filter, update) => { calls.push({ name, method: 'updateMany', filter, update }); }
    }) };
    const service = createAccountDeletion({ getDb: () => db, getModels: () => models, monitorId: value => value });
    await service.scrubData(uid);
    assert(calls.some(call => call.name === 'ShopPurchase' && call.method === 'deleteMany' && call.filter.uid === uid));
    const payoutKey = crypto.createHash('sha256').update(uid).digest('hex');
    const cleanup = calls.find(call => call.name === 'MatchResult' && call.update?.$unset);
    assert.deepEqual(Object.keys(cleanup.update.$unset), ['rewardPayouts.' + payoutKey]);
});
