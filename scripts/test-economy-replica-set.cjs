'use strict';

// Opt-in integration test. Never loads .env or accepts a remote database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { randomUUID } = crypto;
const mongoose = require('mongoose');
const { createProfileWrites } = require('../lib/profile-writes');
const { createAdMobRewardClaims } = require('../lib/admob-reward-claims');
const { createLegacyTournamentWithdrawals } = require('../lib/legacy-tournament-withdrawals');
const { createShopPurchases } = require('../lib/shop-purchases');
const { walletState, walletUpdate, changeDucats } = require('../lib/ducat-wallet');
const source = fs.readFileSync(require.resolve('../server'), 'utf8').replace(/\r\n/g, '\n');

function schemas() {
    // Mongoose compares native schema constructors by identity (not across VM realms).
    const context = vm.createContext({ mongoose, Array, Object, String, Number, Boolean, Date, walletState,
        MAX_BALANCE: 5000000, REFERRAL_REWARDS: [3000, 3000, 5000] });
    for (const name of ['FriendNotificationSchema', 'TournamentPrizeNoticeSchema', 'PlayerMailSchema',
        'UserProfileSchema', 'AdMobRewardVerificationSchema', 'TournamentStateSchema',
        'ScoreSchema', 'MatchParticipantSchema', 'MatchResultSchema', 'ShopPurchaseSchema']) {
        const start = source.indexOf(`const ${name} = new mongoose.Schema(`);
        assert(start >= 0, name);
        const tail = source.slice(start);
        const closing = /^\}(?:,[^\n]*)?\);/m.exec(tail);
        assert(closing, name);
        vm.runInContext(tail.slice(0, closing.index + closing[0].length) + `\nglobalThis.${name} = ${name};`, context);
    }
    vm.runInContext(source.match(/UserProfileSchema\.pre\('save',[^\n]+/)[0], context);
    return context;
}

async function historicalAwards(connection, definitions, matches, profiles, writes, uid) {
    const scores = connection.model('HistoricalScore', definitions.ScoreSchema, 'scores');
    const context = vm.createContext({ Date, MONGO_URI: true, Score: scores, MatchResult: matches,
        leaderboardWrites: createProfileWrites(), profileWrites: writes, UserProfile: profiles,
        mongoose: { connection }, crypto, changeDucats,
        hasUserClaimedGameReward: (user, id) => user.claimedGameRewardIds.includes(id) });
    for (const name of ['MAX_SCORE', 'MAX_BALANCE', 'MAX_NAME_LENGTH', 'MAX_REWARD_PER_GAME', 'RECENT_MATCH_RESULT_MEMORY',
        'SOLO_RECORD_ORDER', 'SOLO_RECORD_BONUS_BPS', 'LEADERBOARD_RECORD_PERIODS', 'LEADERBOARD_TIME_ZONE', 'STABLE_LEADERBOARD_UID_REGEX']) {
        vm.runInContext(source.match(new RegExp('^const ' + name + ' = .+;$', 'm'))[0], context);
    }
    for (const name of ['toSafeInt', 'getTimeZoneParts', 'getTimeZoneOffsetMs', 'zonedLocalDateTimeToUtc',
        'zonedLocalMidnightToUtc', 'getLeaderboardPeriodStart', 'getLeaderboardUidCandidateExpression',
        'getStableLeaderboardUidExpression', 'getLeaderboardScoreAddFields', 'getLeaderboardRecordMatchFilter',
        'getSoloRecordAchievementsBeforeInsert', 'normalizeSoloRecordAchievements', 'calculateSoloRecordPayout',
        'freezeMatchRecordAchievements', 'persistLeaderboardScoreRecord', 'claimVerifiedGameRewardBalance']) {
        const code = source.match(new RegExp('^(?:async )?function ' + name + '\\([\\s\\S]*?^}', 'm'));
        assert(code, name);
        vm.runInContext(code[0], context);
    }
    const date = new Date('2026-01-31T12:00:00Z'), earlier = new Date('2026-01-30T12:00:00Z');
    const other = 'synthetic-record-leader-account';
    const addMatch = (matchId, finishedAt, participants) => matches.create({ matchId, mode: 'Solo', resultType: 'regular',
        economyEligible: true, verification: 'server', finishedAt, participants: participants.map(([uid, score]) => ({ uid, score, result: 'solo' })) });
    const save = (matchId, score, at = date, player = uid) => context.persistLeaderboardScoreRecord({
        uid: player, matchId, mode: 'Solo', score, date: at, notifyRecords: false, silent: true });
    const addScore = (player, score, date, id) => scores.create({ playerId: player, uid: player, mode: 'Solo', matchId: id, score, date });
    await addScore(uid, 900, earlier, 'earlier-personal');
    await addScore(other, 2000, earlier, 'earlier-global');
    await addMatch('missed-1000', date, [[uid, 1000]]);
    const later = new Date('2026-02-02T12:00:00Z');
    await addMatch('later-1200', later, [[uid, 1200]]);
    await save('later-1200', 1200, later);
    const repaired = await save('missed-1000', 1000);
    assert.deepEqual([...repaired.recordAchievements], ['personal']);
    const payout = context.calculateSoloRecordPayout(1000, repaired.recordAchievements);
    assert.deepEqual([payout.baseReward, payout.adReward], [1100, 2200]);
    const original = (await profiles.findOne({ firebaseUid: uid })).balance;
    for (const [target, delta] of [[1100, 1100], [2200, 1100], [2200, 0]]) {
        assert.equal((await context.claimVerifiedGameRewardBalance(uid, 'missed-1000', target)).reward, delta);
    }
    assert.equal((await profiles.findOne({ firebaseUid: uid })).balance, original + 2200);
    // Restore only the scoreboard row after a new, backdated history entry: the entitlement is immutable.
    await scores.deleteOne({ playerId: uid, matchId: 'missed-1000' });
    await addScore(uid, 1100, earlier, 'late-import');
    assert.deepEqual([...(await save('missed-1000', 1000)).recordAchievements], ['personal']);

    const monday = new Date('2026-02-02T00:30:00+01:00');
    await addMatch('new-period', monday, [[other, 1500]]);
    await addScore(uid, 2500, new Date('2026-02-03T12:00:00Z'), 'future-global');
    assert.deepEqual([...(await save('new-period', 1500, monday, other)).recordAchievements], ['weekly', 'monthly']);
    // A verified, still unprojected tie blocks the later result; ties in a single duel keep player order.
    await addMatch('a-tie', monday, [[uid, 2500]]);
    await addMatch('b-tie', monday, [[uid, 2500]]);
    assert.deepEqual([...(await save('b-tie', 2500, monday)).recordAchievements], []);
    const duel = await addMatch('c-tie', monday, [[uid, 3000], [other, 3000]]);
    await matches.updateOne({ _id: duel._id }, { $set: { mode: 'Tournament' } });
    const second = await context.freezeMatchRecordAchievements(other, 'c-tie', 3000);
    assert.deepEqual([...second], ['personal']);
    assert.deepEqual([...(await context.freezeMatchRecordAchievements(uid, 'c-tie', 3000))],
        ['weekly', 'monthly', 'all_time', 'personal']);
    console.log('PASS: historical record dates, delayed 900/1000/1200, base plus x2 once, frozen bonuses, period rollover and out-of-order ties.');
}

async function main() {
    const definitions = schemas();
    assert(definitions.AdMobRewardVerificationSchema.path('claimKey'));
    assert(definitions.AdMobRewardVerificationSchema.path('claimResult'));
    if (process.argv.includes('--schemas-only')) {
        console.log('PASS: current production profile, receipt and tournament schemas load without database access.');
        return;
    }
    const port = process.env.YAMB_ECONOMY_TEST_MONGO_PORT || '';
    assert(/^\d{4,5}$/.test(port) && Number(port) >= 1024 && Number(port) <= 65535,
        'Set YAMB_ECONOMY_TEST_MONGO_PORT to an isolated loopback replica-set primary. No database contacted.');
    const dbName = 'yamb_economy_qa_' + randomUUID().replaceAll('-', '');
    const connection = mongoose.createConnection(`mongodb://127.0.0.1:${port}/?directConnection=true`, {
        dbName, serverSelectionTimeoutMS: 2500, retryWrites: true, autoIndex: false
    });
    let mayClean = false;
    try {
        await connection.asPromise();
        const hello = await connection.db.admin().command({ hello: 1 });
        assert(hello.isWritablePrimary && /^yamb[-_]test(?:[-_][a-z0-9]+)*$/i.test(hello.setName || ''),
            'Refusing to write: use a dedicated yamb-test replica-set primary.');
        assert.equal(connection.db.databaseName, dbName);
        mayClean = true;
        const profiles = connection.model('EconomyProfile', definitions.UserProfileSchema, 'userprofiles');
        const receipts = connection.model('EconomyReceipt', definitions.AdMobRewardVerificationSchema, 'admobguardreceipts');
        const states = connection.model('EconomyTournament', definitions.TournamentStateSchema, 'tournamentstates');
        const matches = connection.model('EconomyMatch', definitions.MatchResultSchema, 'matchresults');
        const purchases = connection.model('EconomyPurchase', definitions.ShopPurchaseSchema, 'shoppurchases');
        await Promise.all([profiles.createCollection(), receipts.createCollection(), states.createCollection(), matches.createCollection(), purchases.createCollection()]);
        const uid = 'synthetic-economy-' + randomUUID();
        await profiles.create({ firebaseUid: uid, balance: 1000, undoTokens: 5 });
        const guardWrite = async () => () => {};
        const build = (overrides = {}) => createAdMobRewardClaims({ connection, profiles, receipts,
            profileWrites: createProfileWrites(), guardWrite, ...overrides });
        const claims = build();
        const proof = async () => ({ ok: true, reward: await receipts.create({ uid, nonce: randomUUID(),
            transactionId: randomUUID(), context: 'shop_ad_reward', adTimestamp: Date.now() }) });
        const balance = async () => (await profiles.findOne({ firebaseUid: uid })).balance;
        const award = async session => {
            const user = await profiles.findOne({ firebaseUid: uid }, null, { session });
            user.balance += 500;
            await user.save({ session });
            return { ok: true, reward: 500, balance: user.balance, user };
        };

        const first = await proof();
        await assert.rejects(claims.claim(uid, first, 'shop_ad_reward', async session => {
            await award(session);
            throw Error('after-wallet-write');
        }), /after-wallet-write/);
        assert.equal(await balance(), 1000);
        assert.equal((await receipts.findById(first.reward._id)).claimedAt, null);
        const brokenReceipt = build({ receipts: { findOne: (...args) => receipts.findOne(...args),
            updateOne: async () => { throw Error('receipt-write'); } } });
        await assert.rejects(brokenReceipt.claim(uid, first, 'shop_ad_reward', award), /receipt-write/);
        assert.equal(await balance(), 1000);
        assert.equal((await receipts.findById(first.reward._id)).claimedAt, null);

        // Separate application locks force MongoDB itself to resolve this race.
        const results = await Promise.all(Array.from({ length: 6 }, () => build().claim(uid, first, 'shop_ad_reward', award)));
        assert(results.every(result => result.ok));
        assert.equal(results.filter(result => !result.alreadyClaimed).length, 1);
        assert.equal(await balance(), 1500);
        assert.equal((await claims.claim(uid, first, 'undo_tokens', award)).reason, 'ad_reward_already_claimed');

        const second = await proof();
        let dropReply = true;
        const unknownCommit = build({ connection: { async transaction(operation, options) {
            const result = await connection.transaction(operation, options);
            if (dropReply) { dropReply = false; throw Error('lost-commit-reply'); }
            return result;
        } } });
        await assert.rejects(unknownCommit.claim(uid, second, 'shop_ad_reward', award), /lost-commit-reply/);
        assert.equal(await balance(), 2000);
        await profiles.updateOne({ firebaseUid: uid }, { $inc: { balance: -100 } });
        const retry = await claims.claim(uid, second, 'shop_ad_reward', award);
        assert.equal(retry.alreadyClaimed, true);
        assert.equal(retry.balance, 1900);
        assert.equal(await balance(), 1900);

        const writes = createProfileWrites();
        const context = vm.createContext({ profileWrites: writes, UserProfile: profiles, MAX_BALANCE: 5000000,
            crypto, changeDucats, mongoose: { connection }, MatchResult: matches,
            hasUserClaimedGameReward: (user, matchId) => user.claimedGameRewardIds.includes(matchId),
            MAX_REWARD_PER_GAME: 8000, RECENT_MATCH_RESULT_MEMORY: 200,
            toSafeInt: (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback });
        const at = source.indexOf('async function claimVerifiedGameRewardBalance(');
        vm.runInContext(source.slice(at, source.indexOf('\n}', at) + 2), context);
        await matches.create({ matchId: 'verified-match-1', mode: 'Solo', resultType: 'regular', verification: 'authenticated_client',
            economyEligible: true, participants: [{ uid, result: 'solo', score: 1000 }] });
        const third = await proof();
        const gameClaims = build({ profileWrites: writes });
        const gameAward = async session => {
            const result = await context.claimVerifiedGameRewardBalance(uid, 'verified-match-1', 2000, session);
            assert(result.claimed);
            return { ok: true, reward: 2000, balance: result.user.balance, user: result.user };
        };
        await assert.rejects(gameClaims.claim(uid, third, 'game_double:verified-match-1', async session => {
            await gameAward(session);
            throw Error('after-game-wallet-write');
        }), /after-game-wallet-write/);
        assert.equal(await balance(), 1900);
        assert(!(await profiles.findOne({ firebaseUid: uid })).claimedGameRewardIds.includes('verified-match-1'));
        assert.equal((await gameClaims.claim(uid, third, 'game_double:verified-match-1', gameAward)).ok, true);
        assert.equal(await balance(), 3900);

        await states.create({ tournamentNumber: 7, status: 'registration', players: [{ id: uid }, { id: 'opponent' }],
            bracket: { qf: [{ p1: { id: uid }, p2: { id: 'opponent' } }], sf: [], f: [] }, pushFlags: {} });
        const withdrawalArgs = { connection, profiles, states, guardWrite, entryFee: 5500, maxBalance: 5000000,
            removeFromBracket(playerUid, state) {
                for (const match of state.bracket.qf) {
                    for (const role of ['p1', 'p2']) if (match?.[role]?.id === playerUid) match[role] = null;
                }
            } };
        const withdraw = overrides => createLegacyTournamentWithdrawals({ ...withdrawalArgs,
            profileWrites: createProfileWrites(), ...overrides });
        const failingRefund = withdraw({ profiles: { findOne: (...args) => profiles.findOne(...args),
            findOneAndUpdate: async () => { throw Error('refund-write'); } } });
        await assert.rejects(failingRefund.withdraw(uid, 7), /refund-write/);
        assert.equal((await states.findOne({ tournamentNumber: 7 })).players.length, 2);
        assert.equal(await balance(), 3900);
        const refunds = await Promise.all(Array.from({ length: 6 }, () => withdraw().withdraw(uid, 7)));
        assert(refunds.every(result => result.ok));
        assert.equal(refunds.filter(result => !result.alreadyUnregistered).length, 1);
        assert.equal(await balance(), 9400);
        const state = await states.findOne({ tournamentNumber: 7 });
        assert.deepEqual(state.players.map(player => player.id), ['opponent']);
        assert.equal(state.bracket.qf[0].p2.id, 'opponent');

        const makeShop = () => createShopPurchases({ connection, profiles, purchases, profileWrites: createProfileWrites(),
            guardWrite, limit: 5000000, itemFor: id => id === 'classic_red' ? { id, price: 1500 } : null,
            ownedItems: user => new Set(user.yamb_unlocked), discountFor: () => false,
            addItem: (user, id) => { user.yamb_unlocked = [...user.yamb_unlocked, id]; } });
        const input = { requestId: 'integration-purchase-1', itemId: 'classic_red', expectedPrice: 1500 };
        const bought = await Promise.all(Array.from({ length: 6 }, () => makeShop().purchase(uid, input)));
        assert(bought.every(result => result.ok));
        assert.equal(await balance(), 7900);
        assert.equal(await purchases.countDocuments({ uid }), 1);
        await profiles.updateOne({ firebaseUid: uid }, { $set: { balance: 4999900 } });
        const full = await profiles.findOneAndUpdate({ firebaseUid: uid }, walletUpdate(1000, 5000000), { new: true });
        assert.equal(full.balance, 5000000);
        assert.equal(full.pendingDucats, 900);
        const spent = await profiles.findOneAndUpdate({ firebaseUid: uid }, walletUpdate(-5500, 5000000), { new: true });
        assert.equal(spent.balance, 4995400);
        assert.equal(spent.pendingDucats, 0);
        await historicalAwards(connection, definitions, matches, profiles, writes, uid);
        console.log('PASS: real MongoDB reward rollback/replay/concurrency, game payout ledger, atomic shop purchase, wallet reserve and legacy refund.');
    } finally {
        if (mayClean) await connection.dropDatabase();
        await connection.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
