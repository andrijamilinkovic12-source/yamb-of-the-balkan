'use strict';

const assert = require('node:assert/strict');
const { Mongoose } = require('mongoose');
const { createPlayerReferrals, REFERRAL_REWARDS } = require('../lib/player-referrals');
const { createProfileWrites } = require('../lib/profile-writes');

async function run() {
    assert.deepEqual(REFERRAL_REWARDS, [3000, 3000, 5000]);
    assert.equal(REFERRAL_REWARDS.reduce((sum, reward) => sum + reward, 0), 11000);
    const port = process.env.YAMB_REFERRAL_TEST_PORT;
    assert.match(port || '', /^\d{4,5}$/, 'Set the port of an isolated local replica set.');
    const database = new Mongoose();
    await database.connect(`mongodb://127.0.0.1:${port}/referral_test_${process.pid}?directConnection=true`);
    try {
        const hello = await database.connection.db.admin().command({ hello: 1 });
        assert.ok(hello.isWritablePrimary && /^yamb-test(?:-[a-z0-9]+)*$/.test(hello.setName || ''), 'Use an isolated local test replica set.');
        const schema = new database.Schema({
            firebaseUid: { type: String, unique: true }, balance: Number, playerMailbox: [Object],
            referralCode: { type: String, unique: true, sparse: true },
            referralRewardsClaimed: { type: Number, default: 0, min: 0, max: 3 },
            referral: { type: new database.Schema({ inviterUid: String, startedAt: Date,
                checkAfter: Date, settledAt: Date, reward: Number, rewardNumber: Number, outcome: String }, { _id: false }) }
        });
        const profiles = database.model('Profile', schema);
        const matches = database.model('Match', new database.Schema({
            matchId: String, resultType: String, verification: String, economyEligible: Boolean, statsAppliedUids: [String],
            participants: [{ uid: String }], createdAt: Date
        }));
        await Promise.all([profiles.init(), matches.init()]);
        const inviter = 'inviter_example_123456789';
        const invited = 'invited_example_123456789';
        const notified = [];
        let simulateFailure = false;
        const profileMiddleware = {
            find: (...args) => profiles.find(...args),
            findOne: (...args) => profiles.findOne(...args),
            findOneAndUpdate: (...args) => profiles.findOneAndUpdate(...args),
            updateOne: (...args) => {
                if (simulateFailure && args[1].$push?.playerMailbox) throw new Error('simulated_wallet_write_failure');
                return profiles.updateOne(...args);
            }
        };
        const service = createPlayerReferrals({ profiles: profileMiddleware, matches, enabled: true, connection: database.connection,
            profileWrites: createProfileWrites(), guardWrite: async () => () => {},
            isBlocked: async () => false, maxBalance: 5_000_000, onReward: uid => notified.push(uid) });
        const authUser = (uid, date = Date.now()) => ({ uid, metadata: { creationTime: new Date(date).toUTCString() },
            providerData: [{ providerId: 'facebook.com' }] });
        await profiles.create({ firebaseUid: inviter, balance: 375 });
        const codes = await Promise.all([service.issueCode(inviter), service.issueCode(inviter)]);
        assert.match(codes[0], /^[A-F0-9]{12}$/);
        assert.equal(codes[0], codes[1]);
        assert.equal(await service.prepareAttribution(inviter, codes[0], authUser), undefined, 'self-referral');
        assert.equal(await service.prepareAttribution(invited, codes[0],
            uid => authUser(uid, Date.now() - 7200000)), undefined, 'existing Firebase identity');
        assert.equal(await service.prepareAttribution(invited, codes[0] + 'X', authUser), undefined, 'invalid code');
        assert.equal(await service.prepareAttribution(invited, '000000000000', authUser), undefined, 'unknown invitation');
        const referral = await service.prepareAttribution(invited, codes[0].toLowerCase(), authUser);
        assert.equal(referral.inviterUid, inviter);
        await profiles.create({ firebaseUid: invited, referral, balance: 120 });
        const result = {
            matchId: 'a', resultType: 'technical', verification: 'server', economyEligible: true,
            participants: [{ uid: invited }], createdAt: new Date(), statsAppliedUids: [invited]
        };
        await matches.create(result);
        assert.equal(await service.processDue(), 0, 'technical result');
        await matches.create({ ...result, matchId: 'local', resultType: 'regular', verification: 'authenticated_client' });
        await service.wake(invited);
        assert.equal(await service.processDue(), 0, 'locally scored result');
        await matches.create({ ...result, matchId: 'b', resultType: 'regular', statsAppliedUids: [] });
        await service.wake(invited);
        assert.equal(await service.processDue(), 0, 'result still awaiting official stats');
        await matches.updateOne({ matchId: 'b' }, { $set: { statsAppliedUids: [invited] } });
        await service.wake(invited);
        simulateFailure = true;
        assert.equal(await service.processDue(), 0, 'pipeline continues after transient transaction failure');
        assert.equal((await profiles.findOne({ firebaseUid: invited }).lean()).referral.settledAt, undefined, 'claim rolls back');
        assert.equal((await profiles.findOne({ firebaseUid: inviter }).lean()).referralRewardsClaimed, 0, 'failed payout must not consume a reward slot');
        simulateFailure = false;
        await service.wake(invited);
        const rewarded = await Promise.all([service.processDue(), service.processDue()]);
        assert.equal(rewarded[0] + rewarded[1], 1);
        assert.equal(await service.processDue(), 0, 'idempotent retry');
        assert.deepEqual(notified, [inviter]);
        const profile = await profiles.findOne({ firebaseUid: inviter }).lean();
        assert.equal(profile.balance, 3_375);
        assert.equal(profile.referralRewardsClaimed, 1);
        assert.deepEqual(profile.playerMailbox.map(({ type, reward }) => ({ type, reward })),
            [{ type: 'referral_reward', reward: 3_000 }]);
        assert.equal(profile.playerMailbox[0].rank, 1);
        const receipt = (await profiles.findOne({ firebaseUid: invited }).lean()).referral;
        assert.equal(receipt.reward, 3000);
        assert.equal(receipt.rewardNumber, 1);
        assert.equal(receipt.outcome, 'rewarded');
        assert.equal((await profiles.findOne({ firebaseUid: invited }).lean()).balance, 120);
        const secondUid = 'second_invited_example_123456789';
        const secondReferral = await service.prepareAttribution(secondUid, codes[0], uid => ({
            ...authUser(uid), providerData: [{ providerId: 'google.com' }]
        }));
        assert.equal(secondReferral.inviterUid, inviter, 'Google-only newcomers are eligible');
        await profiles.create({ firebaseUid: secondUid, referral: secondReferral, balance: 50 });
        await matches.create({ ...result, matchId: 'second-player', resultType: 'regular',
            participants: [{ uid: secondUid }], statsAppliedUids: [secondUid], createdAt: new Date() });
        await profiles.updateOne({ firebaseUid: inviter }, { $set: { balance: 4_999_500 } });
        assert.equal(await service.processDue(), 0, 'defer the whole reward when the balance is full');
        assert.equal((await profiles.findOne({ firebaseUid: secondUid }).lean()).referral.settledAt, undefined);
        await profiles.updateOne({ firebaseUid: inviter }, { $set: { balance: 4_997_000 } });
        await service.wake(secondUid);
        assert.equal(await service.processDue(), 1, 'award each new player once after the full reward fits');
        const paid = await profiles.findOne({ firebaseUid: inviter }).lean();
        assert.equal(paid.balance, 5_000_000);
        assert.equal(paid.playerMailbox.length, 2);
        assert.ok(paid.playerMailbox.every(mail => mail.reward === 3_000 && mail.type === 'referral_reward'));
        assert.equal(paid.referralRewardsClaimed, 2);
        assert.equal(new Set(paid.playerMailbox.map(mail => mail.id)).size, 2);
        await matches.create({ ...result, matchId: 'second-player-again', resultType: 'regular',
            participants: [{ uid: secondUid }], statsAppliedUids: [secondUid], createdAt: new Date() });
        await service.wake(secondUid);
        assert.equal(await service.processDue(), 0, 'further matches never repeat the referral reward');
        assert.equal((await profiles.findOne({ firebaseUid: inviter }).lean()).playerMailbox.length, 2);

        const thirdUid = 'third_invited_example_123456789';
        const fourthUid = 'fourth_invited_example_123456789';
        for (const uid of [thirdUid, fourthUid]) {
            const attribution = await service.prepareAttribution(uid, codes[0], authUser);
            assert.ok(attribution);
            await profiles.create({ firebaseUid: uid, referral: attribution, balance: 0 });
        }
        await matches.create({ ...result, matchId: 'third-player', resultType: 'regular',
            participants: [{ uid: thirdUid }], statsAppliedUids: [thirdUid], createdAt: new Date() });
        await profiles.updateOne({ firebaseUid: inviter }, { $set: { balance: 4_996_000 } });
        assert.equal(await service.processDue(), 0, 'third reward waits for room for all 5000 ducats');
        assert.equal((await profiles.findOne({ firebaseUid: inviter }).lean()).referralRewardsClaimed, 2);
        await profiles.updateOne({ firebaseUid: inviter }, { $set: { balance: 4_995_000 } });
        await service.wake(thirdUid);
        assert.equal(await service.processDue(), 1);
        const completed = await profiles.findOne({ firebaseUid: inviter }).lean();
        assert.equal(completed.balance, 5_000_000);
        assert.equal(completed.referralRewardsClaimed, 3);
        assert.deepEqual(completed.playerMailbox.map(mail => mail.reward).sort((a, b) => a - b), [3000, 3000, 5000]);
        assert.deepEqual(completed.playerMailbox.map(mail => mail.rank).sort(), [1, 2, 3]);
        assert.equal(completed.playerMailbox.reduce((sum, mail) => sum + mail.reward, 0), 11000);
        assert.equal(await service.prepareAttribution('fifth_invited_example_123456789', codes[0], authUser), undefined,
            'a completed inviter cannot start another rewarded referral');
        await matches.create({ ...result, matchId: 'fourth-player', resultType: 'regular',
            participants: [{ uid: fourthUid }], statsAppliedUids: [fourthUid], createdAt: new Date() });
        await service.wake(fourthUid);
        assert.equal(await service.processDue(), 0, 'fourth confirmed referral never pays');
        const fourth = (await profiles.findOne({ firebaseUid: fourthUid }).lean()).referral;
        assert.equal(fourth.outcome, 'limit_reached');
        assert.equal(fourth.reward, 0);
        assert.ok(fourth.settledAt);
        assert.equal(fourth.checkAfter, undefined, 'do not retry a terminal limit forever');
        assert.equal((await profiles.findOne({ firebaseUid: inviter }).lean()).playerMailbox.length, 3);

        // Two independent service instances simulate separate server workers.
        const secondService = createPlayerReferrals({ profiles, matches, enabled: true, connection: database.connection,
            profileWrites: createProfileWrites(), guardWrite: async () => () => {},
            isBlocked: async () => false, maxBalance: 5_000_000, onReward: uid => notified.push(uid) });
        const racingInviter = 'racing_inviter_123456789';
        await profiles.create({ firebaseUid: racingInviter, balance: 25 });
        const racingCode = await service.issueCode(racingInviter);
        for (let i = 0; i < 6; i++) {
            const uid = `racing_invited_${i}_123456789`;
            await profiles.create({ firebaseUid: uid, balance: 0,
                referral: await service.prepareAttribution(uid, racingCode, authUser) });
            await matches.create({ ...result, matchId: `racing-match-${i}`, resultType: 'regular',
                participants: [{ uid }], statsAppliedUids: [uid], createdAt: new Date() });
        }
        const race = await Promise.all([service.processDue(), secondService.processDue()]);
        assert.equal(race[0] + race[1], 3);
        const racing = await profiles.findOne({ firebaseUid: racingInviter }).lean();
        assert.equal(racing.balance, 11025, 'each inviter has an independent 11000 lifetime reward limit');
        assert.equal(racing.referralRewardsClaimed, 3);
        assert.deepEqual(racing.playerMailbox.map(mail => mail.rank).sort(), [1, 2, 3]);
        assert.deepEqual(racing.playerMailbox.map(mail => mail.reward).sort((a, b) => a - b), [3000, 3000, 5000]);
        assert.equal(notified.filter(uid => uid === racingInviter).length, 3);
        assert.equal(await secondService.processDue(), 0);
        const terminal = await profiles.find({ 'referral.inviterUid': racingInviter }).lean();
        assert.equal(terminal.filter(p => p.referral.outcome === 'rewarded').length, 3);
        assert.equal(terminal.filter(p => p.referral.outcome === 'limit_reached').length, 3);
        console.log('PASS: 3000/3000/5000 rewards and 11000 per-account limit, Google/Facebook newcomers, verified regular matches, rollback, concurrent workers, no fourth payout, numbered mail, retries and deferred full rewards.');
    } finally { await database.disconnect(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
