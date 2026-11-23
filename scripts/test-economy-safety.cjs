'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { walletUpdate, walletState, changeDucats } = require('../lib/ducat-wallet');
const { applyUpdate, matches } = require('./economy-mongo-fixture.cjs');
const { test } = require('node:test');
const { createProfileWrites } = require('../lib/profile-writes');
const { createAdMobRewardClaims } = require('../lib/admob-reward-claims');
const { createLegacyTournamentWithdrawals } = require('../lib/legacy-tournament-withdrawals');
const { createShopPurchases } = require('../lib/shop-purchases');
const source = fs.readFileSync(require.resolve('../server'), 'utf8').replace(/\r\n/g, '\n');
const undoSource = fs.readFileSync(require.resolve('../www/vracanjeupisa.js'), 'utf8');
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const uid = 'economy-fixture-account-a';

function fixture() {
    let data = { profiles: { [uid]: { firebaseUid: uid, balance: 10000, undoTokens: 5,
        shopDiscounts: {}, shopAdUnlocks: {}, yamb_unlocked: [], claimedGameRewardIds: [],
        lastDaily: '', lastDailyRewardClaimed: '' } }, receipts: {}, matches: {}, purchases: {},
        state: { _id: 'legacy-state', tournamentNumber: 7, status: 'registration', players: [{ id: uid }, { id: 'other' }],
            bracket: { qf: [{ p1: { id: uid }, p2: { id: 'other' } }] }, pushFlags: {} } };
    let failure = '', leases = 0;
    const writes = createProfileWrites(), transactions = createProfileWrites();
    const fault = name => { if (failure === name) { failure = ''; throw Error(name); } };
    const state = options => options?.session?.data || data;
    const profiles = {
        async findOne(query, _projection, options) {
            const value = state(options).profiles[query.firebaseUid];
            if (!value) return null;
            return Object.assign(structuredClone(value), { markModified() {}, async save(saveOptions) {
                fault('wallet-save');
                const { save, markModified, ...fields } = this;
                state(saveOptions).profiles[query.firebaseUid] = structuredClone(fields);
            } });
        },
        async findOneAndUpdate(query, update, options) {
            fault('profile-update');
            fault('refund-write');
            const value = state(options).profiles[query.firebaseUid];
            if (!value) return null;
            if (!matches(value, query)) return null;
            applyUpdate(value, update);
            return profiles.findOne(query, null, options);
        }
    };
    const receipts = {
        async findOne(query, _projection, options) {
            const value = state(options).receipts[query._id];
            return value?.uid === query.uid && value?.nonce === query.nonce ? structuredClone(value) : null;
        },
        async updateOne(query, update, options) {
            fault('receipt-write');
            const value = state(options).receipts[query._id];
            if (!value || value.claimedAt !== null) return { modifiedCount: 0 };
            Object.assign(value, structuredClone(update.$set));
            return { modifiedCount: 1 };
        }
    };
    const states = {
        async findOne(query, _projection, options) {
            const value = state(options).state;
            return value.tournamentNumber === query.tournamentNumber ? structuredClone(value) : null;
        },
        async updateOne(query, update, options) {
            const value = state(options).state;
            if (value.status !== query.status || !value.players.some(player => player.id === query['players.id'])) return { modifiedCount: 0 };
            Object.assign(value, structuredClone(update.$set));
            return { modifiedCount: 1 };
        }
    };
    const connection = { transaction: operation => transactions.run('fixture-db', async () => {
        const session = { data: structuredClone(data) };
        const result = await operation(session);
        fault('commit');
        data = session.data;
        fault('unknown-commit');
        return result;
    }) };
    const guardWrite = async () => { leases++; return () => leases--; };
    const purchases = {
        async findOne(query, _projection, options) { return state(options).purchases[query._id] || null; },
        async create([purchase], options) {
            fault('purchase-write');
            assert(!state(options).purchases[purchase._id]);
            state(options).purchases[purchase._id] = structuredClone(purchase);
        }
    };
    const shop = createShopPurchases({ connection, profiles, purchases, profileWrites: writes, guardWrite, limit: 5000000,
        itemFor: id => ({ classic_red: { id, price: 1500 }, classic_black: { id, price: 2000 },
            thunder: { id, price: 5000, req: 'sveti_ilija' }, desert: { id, price: 0, adUnlock: true } })[id],
        ownedItems: user => new Set(user.yamb_unlocked),
        discountFor: (user, id) => user.shopDiscounts?.[id]?.expiresAt > Date.now(),
        addItem: (user, id) => user.yamb_unlocked.push(id) });
    const claims = createAdMobRewardClaims({ connection, profiles, receipts, profileWrites: writes, guardWrite });
    const withdrawals = createLegacyTournamentWithdrawals({ connection, profiles, states, profileWrites: writes,
        guardWrite, entryFee: 5500, maxBalance: 5000000,
        removeFromBracket(playerUid, tournament) {
            for (const match of tournament.bracket.qf) {
                for (const role of ['p1', 'p2']) if (match?.[role]?.id === playerUid) match[role] = null;
            }
        } });
    function proof(nonce = 'fixture-receipt-1') {
        const receipt = { _id: nonce, uid, nonce, claimedAt: null };
        data.receipts[nonce] = receipt;
        return { ok: true, reward: structuredClone(receipt) };
    }
    return { get data() { return data; }, get leases() { return leases; }, claims, profiles, withdrawals, proof,
        fail: name => { failure = name; }, writes, state, fault, connection, shop };
}

function handler(event, context) {
    const start = source.indexOf(`    socket.on('${event}',`);
    assert(start >= 0, event);
    vm.runInContext(source.slice(start, source.indexOf('\n    });', start) + 8), context);
}

function rewardServer(f, event, proof, overrides = {}) {
    let call;
    const socket = { id: 'fixture-socket', verifiedUid: uid, on(_name, fn) { call = fn; }, emit() {} };
    f.writes.bindSocket(socket, [event]);
    const context = vm.createContext({ socket, console: { error() {} }, MONGO_URI: 'synthetic', crypto,
        walletUpdate, walletState, changeDucats, verifyDailyClaimToken: () => false,
        UserProfile: f.profiles, getVerifiedUid: value => value.verifiedUid,
        SHOP_AD_REWARD_AMOUNT: 500, SHOP_AD_REWARD_COOLDOWN_MS: 15000,
        UNDO_REWARDED_REWARD_AMOUNT: 1, UNDO_REWARDED_REWARD_COOLDOWN_MS: 15000,
        MAX_BALANCE: 5000000, MAX_UNDO_TOKENS: 250, SHOP_DISCOUNT_WINDOW_MS: 600000,
        MAX_DAILY_REWARD: 3728, MAX_DAILY_BASE_REWARD: 1864,
        getDailyChallengeForUid: () => ({ dayKey: '2026-11-20', reward: 100, baseReward: 100 }),
        getDailyChallengeDayKey: () => '2026-11-20', getLegacyDailyDayKey: () => 'legacy-day',
        isDailyKeyToday: (value, today, legacy) => value === today || value === legacy,
        SHOP_ITEM_PRICES: { classic_red: 1500 }, SHOP_AD_UNLOCK_IDS: new Set(['desert']),
        getShopItemDiscountedPrice: price => Math.floor(price * .8),
        getShopDiscountAdContext: id => 'shop_discount:' + id, getShopAdUnlockAdContext: id => 'shop_ad_unlock:' + id,
        getShopAdUnlockTarget: () => 3, getExistingUnlockSet: user => new Set(user.yamb_unlocked),
        normalizeShopDiscounts: value => ({ ...value }), normalizeShopAdUnlocks: value => ({ ...value }),
        addUnlockedShopItemToUser(user, id) { user.yamb_unlocked.push(id); },
        toSafeInt: (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback,
        emitProfileSync() {}, waitForVerifiedAdMobReward: async () => proof,
        grantVerifiedAdMobReward: (...args) => f.claims.claim(...args) });
    if (event === 'claim_game_reward') {
        f.data.matches['verified-match'] = { matchId: 'verified-match', mode: overrides.rewardMode || 'Solo',
            resultType: 'regular', verification: 'server', economyEligible: true, finishedAt: new Date(),
            participants: [{ uid, name: 'Fixture player', score: 1000 }], rewardClaimedUids: [], rewardPayouts: {} };
        Object.assign(context, { MAX_SCORE: 3500, MAX_REWARD_PER_GAME: 8000, ADMOB_SSV_WAIT_TIMEOUT_MS: 20000,
            profileWrites: f.writes, mongoose: { connection: f.connection }, RECENT_MATCH_RESULT_MEMORY: 200,
            pendingGameRewards: {}, pendingGameRewardsByUid: {},
            async resolvePendingGameRewardSession() {
                const rewardSession = { uid, socketId: socket.id, score: 1000, mode: context.rewardMode || 'Solo', matchId: 'verified-match' };
                context.pendingGameRewards[socket.id] = rewardSession;
                context.pendingGameRewardsByUid[uid] = rewardSession;
                return { ok: true, rewardSession };
            },
            clearPendingGameRewardSession() { delete context.pendingGameRewards[socket.id]; delete context.pendingGameRewardsByUid[uid]; },
            Score: { findOne: () => ({ select: () => ({ lean: async () => ({ recordAchievements: [] }) }) }) },
            SOLO_RECORD_ORDER: ['weekly', 'monthly', 'all_time', 'personal'],
            SOLO_RECORD_BONUS_BPS: { personal: 1000, weekly: 1000, monthly: 1000, all_time: 2000 },
            async findVerifiedMatchParticipant(playerUid, matchId) {
                const result = f.data.matches[matchId], participant = result?.participants.find(player => player.uid === playerUid);
                return participant ? { ok: true, matchId, result, participant, score: participant.score } : { ok: false };
            },
            persistLeaderboardScoreRecord: async () => assert.fail('Existing score metadata should not be rebuilt'),
            hasUserClaimedGameReward: (user, matchId) => user.claimedGameRewardIds.includes(matchId),
            getGameRewardAdMinTimestamp: () => 0,
            MatchResult: {
                exists: async query => !!f.data.matches[query.matchId]?.rewardClaimedUids.includes(query.rewardClaimedUids),
                findOne(query, _projection, options) {
                    const value = f.state(options).matches[query.matchId];
                    const result = value && structuredClone({ ...value, createdAt: new Date() });
                    return { select() { return this; }, lean: async () => result, then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
                },
                async updateOne(query, update, options) {
                    assert(options.session, 'Game ledger write must share the receipt transaction');
                    f.fault('match-ledger');
                    applyUpdate(f.state(options).matches[query.matchId], update);
                }
            } });
        for (const name of ['normalizeSoloRecordAchievements', 'calculateSoloRecordPayout',
            'ensureGameRewardScoreRecord', 'claimVerifiedGameRewardBalance']) {
            const start = source.search(new RegExp(`(?:async )?function ${name}\\(`));
            if (start < 0 && name === 'ensureGameRewardScoreRecord') continue;
            assert(start >= 0, name);
            vm.runInContext(source.slice(start, source.indexOf('\n}', start) + 2), context);
        }
    }
    Object.assign(context, overrides);
    // Mongoose documents track object replacements; this fixture stores them directly.
    const find = f.profiles.findOne;
    f.profiles.findOne = async (...args) => { const user = await find(...args); if (user) user.markModified = () => {}; return user; };
    handler(event, context);
    return async data => { let response; await call(data || {}, value => { response = value; }); return response; };
}

for (const [event, input, field, expected] of [
    ['claim_shop_ad_reward', {}, 'balance', 10500],
    ['claim_undo_token_reward', {}, 'undoTokens', 6],
    ['claim_shop_discount', { itemId: 'classic_red' }, 'balance', 10000],
    ['claim_shop_ad_unlock', { itemId: 'desert' }, 'balance', 10000],
    ['claim_daily_reward', { amount: 200, doubled: true, dayKey: '2026-11-20' }, 'balance', 10200],
    ['claim_game_reward', { score: 1000, doubled: true, matchId: 'verified-match' }, 'balance', 12000]
]) {
    test(event + ': failed wallet/receipt/commit writes roll back; retry and replay are safe', async () => {
        const failures = [event === 'claim_daily_reward' ? 'profile-update' : 'wallet-save', 'receipt-write', 'commit'];
        if (event === 'claim_game_reward') failures.push('match-ledger');
        for (const failure of failures) {
            const f = fixture(), proof = f.proof(), claim = rewardServer(f, event, proof);
            f.fail(failure);
            assert.equal((await claim(input)).ok, false);
            assert.equal(f.data.profiles[uid].balance, 10000);
            assert.equal(f.data.profiles[uid].undoTokens, 5);
            assert.equal(f.data.profiles[uid].lastDailyRewardClaimed, '');
            assert.equal(f.data.profiles[uid].claimedGameRewardIds.length, 0);
            assert.equal(f.data.receipts[proof.reward._id].claimedAt, null);
            assert.equal((await claim(input)).ok, true);
            assert.equal(f.data.profiles[uid][field], expected);
            const replay = await claim(input);
            if (event === 'claim_daily_reward') {
                assert.equal(replay.reason, 'daily_already_claimed');
                assert.equal(f.data.profiles[uid][field], expected);
                continue;
            }
            assert.equal(replay.ok, true);
            assert.equal(replay.alreadyClaimed, true);
            assert.equal(replay.reward, 0);
            assert.equal(f.data.profiles[uid][field], expected);
            if (event === 'claim_shop_ad_unlock') assert.equal(f.data.profiles[uid].shopAdUnlocks.desert.progress, 1);
            assert.equal(f.leases, 0);
        }
    });
}

test('lost acknowledgement returns the current wallet, not a second reward or an old balance', async () => {
    const f = fixture(), proof = f.proof(), claim = rewardServer(f, 'claim_shop_ad_reward', proof);
    f.fail('unknown-commit');
    assert.equal((await claim()).ok, false);
    assert.equal(f.data.profiles[uid].balance, 10500);
    f.data.profiles[uid].balance = 9000;
    const replay = await claim();
    assert.equal(replay.ok, true);
    assert.equal(replay.alreadyClaimed, true);
    assert.equal(replay.balance, 9000);
    assert.equal(f.data.profiles[uid].balance, 9000);
});

test('replaying a consumed discount cannot recreate it or extend its expiry', async () => {
    const f = fixture(), claim = rewardServer(f, 'claim_shop_discount', f.proof());
    const first = await claim({ itemId: 'classic_red' });
    assert(first.expiresAt > Date.now());
    assert.equal((await claim({ itemId: 'classic_red' })).expiresAt, first.expiresAt);
    delete f.data.profiles[uid].shopDiscounts.classic_red;
    const replay = await claim({ itemId: 'classic_red' });
    assert.equal(replay.expiresAt, 0);
    assert.equal(replay.discountedPrice, 1500);
    assert.equal(f.data.profiles[uid].shopDiscounts.classic_red, undefined);
});

test('shop purchase is atomic, retryable after lost commit reply and permanently idempotent', async () => {
    const input = { requestId: 'purchase-fixture-0001', itemId: 'classic_red', expectedPrice: 1500 };
    for (const failure of ['wallet-save', 'purchase-write', 'commit', 'unknown-commit']) {
        const f = fixture();
        f.fail(failure);
        await assert.rejects(f.shop.purchase(uid, input), new RegExp(failure));
        assert.equal(f.data.profiles[uid].balance, failure === 'unknown-commit' ? 8500 : 10000);
        const results = await Promise.all(Array.from({ length: 5 }, () => f.shop.purchase(uid, input)));
        assert(results.every(result => result.ok));
        assert.equal(f.data.profiles[uid].balance, 8500);
        assert.deepEqual(f.data.profiles[uid].yamb_unlocked, ['classic_red']);
        assert.equal(Object.keys(f.data.purchases).length, 1);
        assert.equal(f.leases, 0);
        assert.equal((await f.shop.purchase(uid, { ...input, itemId: 'classic_black' })).reason, 'purchase_conflict');
        assert.equal((await f.shop.purchase(uid, { ...input, requestId: 'different-request-02' })).alreadyPurchased, true);
        assert.equal(f.data.profiles[uid].balance, 8500);
    }
});

test('server purchase validates catalog, requirements, discount expiry and available money', async () => {
    const f = fixture(), input = { requestId: 'purchase-fixture-0001', itemId: 'classic_red', expectedPrice: 1200 };
    assert.equal((await f.shop.purchase(uid, input)).reason, 'shop_price_changed');
    assert.equal((await f.shop.purchase(uid, { ...input, itemId: 'thunder' })).reason, 'shop_requirement_missing');
    assert.equal((await f.shop.purchase(uid, { ...input, itemId: 'desert' })).reason, 'invalid_shop_item');
    assert.equal((await f.shop.purchase(uid, { ...input, requestId: '' })).reason, 'invalid_purchase');
    f.data.profiles[uid].shopDiscounts.classic_red = { expiresAt: Date.now() + 60000 };
    assert.equal((await f.shop.purchase(uid, input)).price, 1200);
    assert.equal(f.data.profiles[uid].balance, 8800);
    assert.equal(f.data.profiles[uid].shopDiscounts.classic_red, undefined);
    f.data.profiles[uid].balance = 100;
    assert.equal((await f.shop.purchase(uid, { ...input, itemId: 'classic_black', expectedPrice: 2000,
        requestId: 'purchase-fixture-0002' })).reason, 'shop_insufficient_balance');
});

test('daily base and a later signed ad pay exactly the missing x2 difference', async () => {
    const f = fixture(), claim = rewardServer(f, 'claim_daily_reward', f.proof());
    const base = await claim({ amount: 100, dayKey: '2026-11-20' });
    assert.equal(base.reward, 100);
    const doubled = await claim({ amount: 200, dayKey: '2026-11-20', doubled: true });
    assert.equal(doubled.reward, 100);
    assert.equal(doubled.totalReward, 200);
    assert.equal(f.data.profiles[uid].balance, 10200);
    assert.equal((await claim({ amount: 200, dayKey: '2026-11-20', doubled: true })).reason, 'daily_already_claimed');
});

test('game base followed by a completed ad pays only its missing difference', async () => {
    const f = fixture(), claim = rewardServer(f, 'claim_game_reward', f.proof());
    const data = { score: 1000, matchId: 'verified-match' };
    assert.equal((await claim(data)).reward, 1000);
    const doubled = await claim({ ...data, doubled: true });
    assert.equal(doubled.reward, 1000);
    assert.equal(doubled.totalReward, 2000);
    assert.equal(f.data.profiles[uid].balance, 12000);
    assert.equal((await claim({ ...data, doubled: true })).reward, 0);
    assert.equal(f.data.profiles[uid].balance, 12000);
});

test('missing record metadata never finalizes a smaller reward; recovery pays the full bonus once in every supported mode', async () => {
    for (const rewardMode of ['Solo', 'Hotseat', 'Random', 'Online', 'friend_invite', 'Challenge', 'Tournament']) {
        for (const doubled of [false, true]) {
            const f = fixture(), proof = f.proof();
            Object.assign(f.data.profiles[uid], { games: 12, wins: 5,
                leagueData: { year: 2026, quarter: 4, quarterlyScore: 12345, baselineScore: 100000 } });
            let stored = null, writable = false, repairs = 0, adChecks = 0;
            const claim = rewardServer(f, 'claim_game_reward', proof, { rewardMode,
                Score: { findOne: () => ({ select() { return this; }, lean: async () => stored }) },
                async persistLeaderboardScoreRecord(input) {
                    repairs++;
                    assert.equal(input.uid, uid);
                    assert.equal(input.score, 1000);
                    assert.equal(input.mode, rewardMode);
                    assert.equal(input.notifyRecords, false);
                    if (!writable) return { ok: false, reason: 'server_error' };
                    stored = { recordAchievements: ['personal'] };
                    return { ok: true, score: stored, recordAchievements: ['personal'] };
                },
                async waitForVerifiedAdMobReward() { adChecks++; assert(writable); return proof; }
            });
            const input = { score: 1000, matchId: 'verified-match', doubled };
            const pending = await claim(input);
            assert.equal(pending.ok, false, rewardMode);
            assert.equal(pending.reason, 'game_reward_metadata_pending');
            assert.equal(pending.permanent, false);
            assert.equal(f.data.profiles[uid].balance, 10000);
            assert.equal(f.data.profiles[uid].claimedGameRewardIds.length, 0);
            assert.equal(f.data.matches['verified-match'].rewardClaimedUids.length, 0);
            assert.equal(f.data.receipts[proof.reward._id].claimedAt, null);
            assert.equal(adChecks, 0);
            writable = true;
            const paid = await claim(input), expected = doubled ? 2200 : 1100;
            assert.equal(paid.reward, expected);
            assert.equal(f.data.profiles[uid].balance, 10000 + expected);
            assert.equal((await claim(input)).reward, 0);
            assert.equal(f.data.profiles[uid].balance, 10000 + expected);
            assert.equal(repairs, 2, 'Confirmed metadata must be reused on replay');
            assert.equal(f.data.profiles[uid].games, 12);
            assert.equal(f.data.profiles[uid].wins, 5);
            assert.equal(f.data.profiles[uid].leagueData.quarterlyScore, 12345);
        }
    }
});

test('earned rewards and legacy refunds at the wallet limit preserve every ducat', async () => {
    for (const [event, data, amount] of [
        ['claim_shop_ad_reward', {}, 500], ['claim_daily_reward', { amount: 100, dayKey: '2026-11-20' }, 100],
        ['claim_game_reward', { score: 1000, matchId: 'verified-match', doubled: true }, 2000]
    ]) {
        const f = fixture(), claim = rewardServer(f, event, f.proof());
        f.data.profiles[uid].balance = 4999990;
        assert.equal((await claim(data)).ok, true);
        const user = f.data.profiles[uid];
        assert.deepEqual(walletState(user, 5000000), { balance: 5000000, pendingDucats: amount - 10 });
        assert.equal(user.balance + user.pendingDucats, 4999990 + amount);
        const purchase = await f.shop.purchase(uid, { requestId: 'reserve-purchase-01', itemId: 'classic_red', expectedPrice: 1500 });
        assert.equal(purchase.ok, true);
        assert.equal(purchase.user.balance + purchase.user.pendingDucats, 4999990 + amount - 1500);
    }
    const f = fixture();
    f.data.profiles[uid].balance = 5000000;
    assert.equal((await f.withdrawals.withdraw(uid, 7)).ok, true);
    assert.equal(f.data.profiles[uid].pendingDucats, 5500);
});

test('wallet aggregation and document updates retain identical totals when spending refills the wallet', () => {
    const doc = { balance: 5000000, pendingDucats: 45000 }, row = structuredClone(doc);
    for (const amount of [10000, -5500, -20000, -40000, 2500]) {
        changeDucats(doc, amount, 5000000);
        applyUpdate(row, walletUpdate(amount, 5000000));
        assert.deepEqual(row, doc);
        assert(doc.balance <= 5000000 && doc.pendingDucats >= 0);
    }
});

test('an already watched token ad stays unconsumed at capacity and pays after space is available', async () => {
    const f = fixture(), proof = f.proof(), claim = rewardServer(f, 'claim_undo_token_reward', proof);
    f.data.profiles[uid].undoTokens = 250;
    const waiting = await claim();
    assert.equal(waiting.reason, 'undo_tokens_max');
    assert.equal(waiting.permanent, false);
    assert.equal(f.data.receipts[proof.reward._id].claimedAt, null);
    f.data.profiles[uid].undoTokens = 249;
    assert.equal((await claim()).reward, 1);
    assert.equal(f.data.profiles[uid].undoTokens, 250);
    assert.equal((await claim()).reward, 0);
});

test('a target-bound ad receipt cannot be moved to another game or daily date before its first use', async () => {
    for (const [context, claimData, claimKey] of [
        ['game_double', { matchId: 'original-game' }, 'game_double:another-game'],
        ['daily_double', { dayKey: '2026-11-19' }, 'daily_double:2026-11-20']
    ]) {
        const f = fixture(), proof = f.proof();
        Object.assign(f.data.receipts[proof.reward._id], { context, claimData });
        const result = await f.claims.claim(uid, proof, claimKey, () => assert.fail('Mismatched target executed'));
        assert.equal(result.reason, 'ad_reward_target_mismatch');
        assert.equal(f.data.receipts[proof.reward._id].claimedAt, null);
    }
});

test('one signed receipt cannot pay another context or match, even on concurrent requests', async () => {
    const f = fixture(), proof = f.proof();
    let executions = 0;
    const operation = async session => {
        executions++;
        const user = await f.profiles.findOne({ firebaseUid: uid }, null, { session });
        user.balance += 500;
        await user.save({ session });
        return { ok: true, reward: 500, user };
    };
    const results = await Promise.all(Array.from({ length: 5 }, () => f.claims.claim(uid, proof, 'game_double:match-a', operation)));
    assert(results.every(result => result.ok));
    assert.equal(executions, 1);
    assert.equal((await f.claims.claim(uid, proof, 'game_double:match-b', operation)).reason, 'ad_reward_already_claimed');
    assert.equal((await f.claims.claim(uid, proof, 'undo_tokens', operation)).reason, 'ad_reward_already_claimed');
    assert.equal(executions, 1);
});

test('missing or old-style consumed proofs cannot authorize an operation', async () => {
    const f = fixture();
    const never = () => assert.fail('Unverified reward executed');
    assert.equal((await f.claims.claim(uid, { ok: true, clientFallback: true }, 'shop_ad_reward', never)).ok, false);
    const proof = f.proof();
    f.data.receipts[proof.reward._id].claimedAt = new Date();
    assert.equal((await f.claims.claim(uid, proof, 'shop_ad_reward', never)).reason, 'ad_reward_already_claimed');
    assert.equal((await f.claims.claim('another-player', proof, 'shop_ad_reward', never)).ok, false);
});

test('stale profile snapshots cannot remove or mint tokens after migration', () => {
    const start = source.indexOf("                if (typeof s.undoTokens === 'number' && isClientSynced) {");
    const end = source.indexOf('                //', start);
    for (const requested of [0, 4, 5, 6, 250]) {
        const context = vm.createContext({ user: { undoTokens: 5, economyMigrationApplied: true },
            s: { undoTokens: requested }, oldUndoTokens: 5, isClientSynced: true, MAX_UNDO_TOKENS: 250,
            toSafeInt: Number, console: { log() {} } });
        vm.runInContext(source.slice(start, end), context);
        assert.equal(context.user.undoTokens, 5);
    }
});

test('legacy duplicate withdrawals refund once, preserve the opponent and survive an unknown commit', async () => {
    const f = fixture();
    f.fail('unknown-commit');
    await assert.rejects(f.withdrawals.withdraw(uid, 7), /unknown-commit/);
    const results = await Promise.all(Array.from({ length: 4 }, () => f.withdrawals.withdraw(uid, 7)));
    assert(results.every(result => result.ok && result.alreadyUnregistered));
    assert.equal(f.data.profiles[uid].balance, 15500);
    assert.deepEqual(f.data.state.players, [{ id: 'other' }]);
    assert.equal(f.data.state.bracket.qf[0].p2.id, 'other');
    assert.equal(f.data.state.bracket.qf[0].p1, null);
    assert.equal(f.leases, 0);
});

test('legacy refund write failure rolls back removal; active/managed tournaments never enter this flow', async () => {
    const f = fixture();
    f.fail('refund-write');
    await assert.rejects(f.withdrawals.withdraw(uid, 7), /refund-write/);
    assert.equal(f.data.profiles[uid].balance, 10000);
    assert.equal(f.data.state.players.length, 2);
    assert.equal((await f.withdrawals.withdraw(uid, 7)).ok, true);
    for (const fields of [{ status: 'active' }, { status: 'registration', readinessPolicyVersion: 'managed' }]) {
        const next = fixture();
        Object.assign(next.data.state, fields);
        assert.equal((await next.withdrawals.withdraw(uid, 7)).ok, false);
        assert.equal(next.data.profiles[uid].balance, 10000);
    }
});

test('actual legacy socket handler serializes duplicate commands and repairs runtime after an unknown commit', async () => {
    for (const loseReply of [false, true]) {
        const f = fixture(), events = [];
        let call;
        const context = vm.createContext({ socket: { on(_event, fn) { call = fn; }, emit: (...args) => events.push(args) },
            console: { log() {}, error() {} }, MONGO_URI: 'fixture', tournamentStateInitialized: true,
            tournamentState: structuredClone(f.data.state), tournamentReadinessCore: { isManaged: state => !!state.readinessPolicyVersion },
            legacyTournamentWrites: createProfileWrites(), profileWrites: f.writes, legacyTournamentWithdrawals: f.withdrawals,
            getVerifiedUid: () => uid, requireTournamentAuth: () => uid, emitProfileSync() {}, io: { emit() {} } });
        handler('tourney_unregister', context);
        if (loseReply) {
            f.fail('unknown-commit');
            await call({});
            assert.equal(context.tournamentState.players.length, 2);
        }
        await Promise.all([call({}), call({})]);
        assert.equal(f.data.profiles[uid].balance, 15500);
        assert.deepEqual(Array.from(context.tournamentState.players, player => player.id), ['other']);
        assert.equal(context.tournamentState.bracket.qf[0].p2.id, 'other');
        assert(events.some(([, result]) => result.ok));
    }
});

for (const stage of ['ad', 'auth', 'reply']) {
    test('token reward cannot cross accounts or a logout/login at stage: ' + stage, async () => {
        for (const sameUid of [false, true]) {
            const gate = deferred(), entered = deferred();
            const storage = new Map([['yamb_uid', uid], ['yamb_undo_tokens', '5']]);
            const pause = async () => { entered.resolve(); await gate.promise; };
            const window = { yambAuthSessionVersion: 1, addEventListener() {},
                statsManager: { stats: {}, saveStats() {} }, adMobGlobal: {
                    isRewardVideoReadyFor: () => true, consumeLastRewardSsvNonce: () => 'watched-receipt',
                    async showRewardVideo() { if (stage === 'ad') await pause(); return true; }
                } };
            const app = { modal: { alert: () => assert.fail('Stale reward displayed') }, socket: { connected: true,
                emit(_event, _data, ack) { pause().then(() => ack({ ok: true, reward: 1, undoTokens: 6 })); } },
                async authenticateSocketIdentity() { if (stage === 'auth') await pause(); return { ok: true }; } };
            const context = vm.createContext({ window, document: { getElementById: () => null }, setTimeout, clearTimeout,
                console: { log() {} }, gt: () => '', localStorage: {
                    getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)) } });
            const Undo = vm.runInContext(undoSource + '\nUndoManager', context);
            const pending = new Undo(app).buyTokens('rewarded');
            await entered.promise;
            storage.set('yamb_uid', sameUid ? uid : 'account-b');
            storage.set('yamb_undo_tokens', '40');
            window.yambAuthSessionVersion++;
            gate.resolve();
            await pending;
            assert.equal(storage.get('yamb_undo_tokens'), '40');
        }
    });
}
