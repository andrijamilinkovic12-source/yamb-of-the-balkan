'use strict';
// A disposable loopback QA replica set is mandatory. Never loads .env.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const powerIndexCore = require('../www/powerIndexCore');
const { installStatisticsMail, publishStatisticsMail } = require('../lib/statistics-mail');
const { createMailboxStore, mailboxEntrySchema } = require('../lib/player-mailbox-store');
const { registerPlayerMailbox } = require('../lib/player-mailbox');
const { REFERRAL_REWARDS } = require('../lib/player-referrals');

async function main() {
    const port = Number(process.env.YAMB_CHAT_TEST_MONGO_PORT);
    assert(Number.isInteger(port) && port > 1024 && port < 65536, 'Dedicated local Mongo port required');
    const conn = mongoose.createConnection(`mongodb://127.0.0.1:${port}/?directConnection=true`, {
        dbName: 'yamb_statistics_mail_qa_' + randomUUID().replaceAll('-', ''), serverSelectionTimeoutMS: 4000
    });
    try {
        await conn.asPromise();
        const hello = await conn.db.admin().command({ hello: 1 });
        assert(hello.isWritablePrimary && hello.setName === 'yamb-test-chat');
        const source = fs.readFileSync(require.resolve('../server'), 'utf8');
        const jobs = [], events = [];
        let deliveryEnabled = true;
        const context = vm.createContext({ mongoose, powerIndexCore, installStatisticsMail, REFERRAL_REWARDS,
            installLeagueRankMail() {}, getServerQuarterInfo: () => ({ year: 2026, quarter: 4 }),
            queueRecordPush: promise => jobs.push(promise),
            publishStatisticsMail: (...args) => deliveryEnabled ? publishStatisticsMail(...args) : Promise.resolve(),
            notifyPlayerMailbox: uid => events.push(uid)
        });
        const mailStart = source.indexOf('const PlayerMailSchema =');
        const mailEnd = source.indexOf('const PlayerSupportTicketSchema =', mailStart);
        vm.runInContext(source.slice(mailStart, mailEnd), context);
        const prizeStart = source.indexOf('const TournamentPrizeNoticeSchema =');
        vm.runInContext(source.slice(prizeStart, mailStart), context);
        const friendStart = source.indexOf('const FriendNotificationSchema =');
        vm.runInContext(source.slice(friendStart, prizeStart), context);
        const profileStart = source.indexOf('const UserProfileSchema =');
        const profileEnd = source.indexOf("const UserProfile = mongoose.model('UserProfile'", profileStart);
        const schema = vm.runInContext(source.slice(profileStart, profileEnd) + '\nUserProfileSchema', context);
        schema.pre('save', function () { if (this.$locals.qaFail) throw new Error('qa_save_failed'); });
        const profiles = conn.model('UserProfile', schema);
        context.UserProfile = profiles;
        const entries = conn.model('PlayerMailboxEntry', mailboxEntrySchema(mongoose));
        const notices = conn.model('PlayerGameNotice', new mongoose.Schema({ _id: String, createdAt: Number }));
        await Promise.all([profiles.init(), entries.init(), notices.init()]);
        const store = createMailboxStore({ profiles, entries, notices, systemNotices: [] });
        const settle = async () => { while (jobs.length) await Promise.all(jobs.splice(0)); };
        const power = (player, value) => {
            const extra = powerIndexCore.calculatePowerIndex({ ...player.toObject(), leagueData: { baselineScore: 0, quarterlyScore: 0 } });
            player.leagueData = { year: 2026, quarter: 4, baselineScore: (value - extra) * 50, quarterlyScore: 0 };
            assert.equal(powerIndexCore.calculatePowerIndex(player), value);
        };
        let alice = new profiles({ firebaseUid: 'alice', currentWinStreak: 2, maxWinStreak: 2 });
        power(alice, 5465);
        await alice.save();
        await profiles.create({ firebaseUid: 'bob' });
        await settle();
        assert.equal(alice.statisticsMailState.powerMilestone, 5000);
        assert.equal(alice.playerMailbox?.length || 0, 0, 'Activation never sends retroactive congratulations');
        for (const value of [9999, 10000, 10000, 4999, 10000, 20000]) {
            power(alice, value);
            await alice.save();
            await settle();
        }
        const inbox = async () => (await profiles.findOne({ firebaseUid: 'alice' })).playerMailbox || [];
        const powerMessages = (await inbox()).filter(mail => mail.type === 'power_index_milestone');
        assert.deepEqual(powerMessages.map(mail => mail.statistics.milestone).sort((a, b) => a - b), [10000, 15000, 20000]);
        assert.ok(powerMessages.every(mail => mail.statistics.next === mail.statistics.milestone + 5000));

        power(alice, 25000);
        alice.$locals.qaFail = true;
        await assert.rejects(alice.save(), /qa_save_failed/);
        assert.equal((await profiles.findOne({ firebaseUid: 'alice' })).statisticsMailState.powerMilestone, 20000);
        assert.equal((await inbox()).length, 3, 'A failed statistic save cannot send a milestone');
        alice.$locals.qaFail = false;
        deliveryEnabled = false;
        await alice.save();
        await settle();
        let stored = await profiles.findOne({ firebaseUid: 'alice' }).lean();
        assert.equal(stored.pendingStatisticsMail.length, 1, 'Milestone evidence survives publication failure');
        assert.equal(stored.pendingStatisticsMail[0].statistics.milestone, 25000);
        await Promise.all([publishStatisticsMail(profiles, 'alice', uid => events.push(uid)),
            publishStatisticsMail(profiles, 'alice', uid => events.push(uid))]);
        assert.equal((await inbox()).filter(mail => mail.statistics.milestone === 25000).length, 1);
        deliveryEnabled = true;

        // Atomic awards also mark the profile; the ordinary background checkpoint
        // handles a trophy/league change without another completed match.
        await profiles.updateOne({ firebaseUid: 'alice' }, { $set: { 'leagueData.baselineScore': (30000 - 60) * 50 } });
        alice = await profiles.findOne({ firebaseUid: 'alice' });
        assert.equal(alice.statisticsMailDirty, true);
        await alice.save();
        await settle();
        assert.equal(alice.statisticsMailDirty, false);
        assert.equal((await inbox()).filter(mail => mail.statistics.milestone === 30000).length, 1);
        const at30000 = (await inbox()).length;
        for (const streak of [3, 4, 5, 6, 9, 0, 0, 1, 2, 3, 0, 1, 0]) {
            alice.currentWinStreak = streak;
            alice.maxWinStreak = Math.max(alice.maxWinStreak, streak);
            power(alice, 30000);
            await alice.save();
            await settle();
        }
        const streakMessages = (await inbox()).filter(mail => mail.type === 'fire_streak_milestone');
        assert.deepEqual(streakMessages.map(mail => mail.statistics.milestone).sort((a, b) => a - b), [3, 3, 6, 9]);
        assert.equal(new Set(streakMessages.map(mail => mail.id)).size, 4, 'A new streak gets its own milestone identities');
        const ended = (await inbox()).filter(mail => mail.type === 'fire_streak_ended');
        assert.deepEqual(ended.map(mail => mail.statistics.value).sort((a, b) => a - b), [3, 9]);
        assert.ok(ended.every(mail => mail.statistics.best === 9));
        assert.equal((await inbox()).length, at30000 + 6, 'No notifications on non-milestones or short streak breaks');

        // Historical imports seed a new baseline, without a flood of old prizes.
        alice.$locals.statisticsMailSuppressed = true;
        alice.currentWinStreak = alice.maxWinStreak = 42;
        power(alice, 90000);
        const beforeImport = (await inbox()).length;
        await alice.save();
        await settle();
        assert.equal((await inbox()).length, beforeImport);
        alice.currentWinStreak = alice.maxWinStreak = 45;
        power(alice, 95000);
        await alice.save();
        await settle();
        assert.equal((await inbox()).filter(mail => mail.statistics.milestone === 95000).length, 1);
        assert.equal((await inbox()).filter(mail => mail.statistics.milestone === 45).length, 1);
        const checkpoint = (await profiles.findOne({ firebaseUid: 'alice' })).statisticsMailState.toObject();
        const partial = await profiles.findOne({ firebaseUid: 'alice' }).select('balance');
        partial.balance = 123;
        await partial.save();
        await settle();
        assert.deepEqual((await profiles.findOne({ firebaseUid: 'alice' })).statisticsMailState.toObject(), checkpoint,
            'Partial projections never reset milestone state');

        const hooks = new Map();
        let uid = 'alice';
        const socket = { connected: true, on: (name, fn) => hooks.set(name, fn) };
        registerPlayerMailbox(socket, { profiles, store, available: () => true, verifiedUid: () => uid });
        const get = () => new Promise(resolve => hooks.get('player_mailbox_get')({}, resolve));
        const own = await get();
        assert.equal(own.ok, true);
        assert.ok(own.messages.some(mail => mail.type === 'power_index_milestone' && mail.statistics.milestone === 95000));
        assert.ok(own.messages.some(mail => mail.type === 'fire_streak_ended'));
        uid = 'bob';
        assert.deepEqual((await get()).messages, [], 'Motivation is private to the competitor');
        assert.ok(events.every(account => account === 'alice'));
        assert.equal(await notices.countDocuments({}), 0, 'Private statistics never become public announcements');
        console.log('Statistics motivation: actual profile schema and PI calculation, 5,000 thresholds, no repeats, 3-win milestones, streak resets, private delivery, atomic dirty checkpoints, imports, failed saves and concurrent retry passed.');
    } finally {
        if (conn.readyState === 1) await conn.dropDatabase();
        await conn.close();
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
