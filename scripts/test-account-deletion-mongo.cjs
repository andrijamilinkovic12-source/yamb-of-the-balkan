'use strict';
// Real, temporary MongoDB on loopback. Never loads .env or server.js runtime.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Mongoose } = require('mongoose');
const { MongoMemoryServer } = require('../tmp/account-deletion-tests/node_modules/mongodb-memory-server-core');
const { createAccountDeletion, hash } = require('../lib/account-deletion');
const { createAnalyticsPrivacy } = require('../lib/analytics-privacy');
const root = path.resolve(__dirname, '..');
const uid = 'test_account_to_remove_12345';
const keep = 'test_account_to_keep_678901';

(async () => {
    const server = await MongoMemoryServer.create({
        binary: { version: '7.0.14', downloadDir: path.join(root, 'tmp/account-deletion-tests/binaries') },
        instance: { ip: '127.0.0.1', dbName: 'account_deletion_disposable_test' }
    });
    const mongoose = new Mongoose();
    try {
        await mongoose.connect(server.getUri(), { serverSelectionTimeoutMS: 3000 });
        assert.equal(new URL(server.getUri()).hostname, '127.0.0.1');
        const authCalls = [];
        const analyticsCalls = [];
        const testAuth = {
            verifyIdToken: async token => ({ uid: token === 'keep-token' ? keep : uid, auth_time: Date.now() / 1000, firebase: { sign_in_provider: 'google.com' } }),
            updateUser: async id => authCalls.push(['disable', id]),
            revokeRefreshTokens: async id => authCalls.push(['revoke', id]),
            deleteUser: async id => authCalls.push(['delete', id])
        };
        const analytics = createAnalyticsPrivacy({
            enabled: true, getDb: () => mongoose.connection.db, getAuth: () => testAuth,
            guardWrite: value => service.guardWrite(value),
            provider: { propertyId: '12345678', async submit(values, acknowledge) {
                analyticsCalls.push(values);
                await acknowledge({ key: 'test-google-ack', requestedAt: new Date() });
            } }
        });
        const service = createAccountDeletion({
            enabled: true, getDb: () => mongoose.connection.db, getModels: () => mongoose.models,
            monitorId: id => 'monitor-' + id,
            getAuth: () => testAuth, analytics
        });
        await analytics.register('delete-token', 'delete_instance_12345678');
        await analytics.register('delete-token', 'second_instance_12345678');
        await analytics.register('keep-token', 'keep_instance_1234567890');
        await assert.rejects(analytics.register('keep-token', 'delete_instance_12345678'), { code: 'analytics_identity_conflict' });
        service.installWriteGuards(mongoose);
        const source = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
        const start = source.indexOf('// --- MODELI PODATAKA ---');
        const end = source.indexOf('accountDeletion.protectModelBatches', start);
        assert(start > 0 && end > start);
        vm.runInNewContext(source.slice(start, end), { mongoose, Date, Math, Array, String, Number, Boolean, Object, console });
        const M = mongoose.models;
        service.protectModelBatches(M);
        await Promise.all(Object.values(M).map(model => model.init()));
        const photo = 'https://example.invalid/remove-photo';
        await M.UserProfile.create([
            { firebaseUid: uid, playerName: 'Same display name', photoUrl: photo, balance: 1234, friends: [keep] },
            { firebaseUid: keep, playerName: 'Same display name', balance: 9000, friends: [uid], friendRequests: [uid], friendNotifications: [{ fromUid: uid, fromName: 'Remove' }], h2hStats: { [uid]: { name: 'Remove', wins: 3 } } }
        ]);
        await M.UserProfileBackup.create([
            { firebaseUid: uid, profile: { balance: 1234 } },
            { firebaseUid: keep, profile: { balance: 9000, friends: [uid], friendRequests: [uid], friendNotifications: [{ fromUid: uid }], h2hStats: { [uid]: { name: 'Remove' } } } }
        ]);
        await M.Score.create([{ uid, playerId: uid, playerName: 'Same display name', score: 111 }, { uid: keep, playerId: keep, playerName: 'Same display name', score: 222 }]);
        await M.LeagueScore.create([{ playerId: uid, score: 111 }, { playerId: keep, score: 222 }]);
        await M.MatchResult.create({ matchId: 'test-shared-match', roomId: 'test-room', clientResultId: 'client-test', gameSessionId: 'session-test', mode: 'online', resultType: 'regular', verification: 'server', participants: [{ uid, name: 'Remove', score: 111, result: 'loss' }, { uid: keep, name: 'Keep', score: 222, result: 'win' }], winnerUid: keep, loserUid: uid, statsAppliedUids: [uid, keep], rewardClaimedUids: [uid, keep] });
        await M.DisconnectDiagnostic.create([
            { eventId: 'own', uid, playerName: 'Remove' },
            { eventId: 'opponent', uid: keep, opponentUid: uid, playerName: 'Keep', opponentName: 'Remove' },
            { eventId: 'legacy', roomId: 'test-room', playerName: 'Remove', opponentName: 'Keep' }
        ]);
        await M.MatchResultSubmissionDiagnostic.create([{ uid, outcome: 'accepted' }, { uid: keep, outcome: 'accepted' }]);
        await M.GlobalChat.create({ messages: [{ id: 'own', senderUid: uid, sender: 'Same display name', msg: 'remove' }, { id: 'other', senderUid: keep, sender: 'Same display name', msg: 'keep' }] });
        await M.GlobalChatReport.create([{ messageId: 'own', senderUid: uid, reportedByUid: keep, msg: 'remove' }, { messageId: 'other', senderUid: keep, reportedByUid: keep, msg: 'keep' }]);
        await M.GlobalChatModerationLog.create([{ uid, ip: '192.0.2.1', originalMsg: 'remove' }, { uid: keep, ip: '192.0.2.1', originalMsg: 'keep' }]);
        await M.PushToken.create([{ uid, token: 'own-test-token' }, { uid: keep, token: 'other-test-token' }]);
        await M.AdMobRewardVerification.create([{ transactionId: 'own', uid, claimedBy: uid, raw: { user_id: uid, custom_data: JSON.stringify({ uid }) } }, { transactionId: 'other', uid: keep }]);
        await M.ServerMonitorActivity.create([{ anonId: 'monitor-' + uid }, { anonId: 'monitor-' + keep }]);
        await M.ServerMonitorDailyActivity.create([{ dayKey: 'test-day', anonId: 'monitor-' + uid }, { dayKey: 'test-day', anonId: 'monitor-' + keep }]);
        await M.LeagueHallOfFame.create({ periodKey: 'test-period', topScores: [{ playerId: uid, playerName: 'Remove', photoUrl: photo, score: 111 }, { playerId: keep, playerName: 'Keep', score: 222 }], champion: { playerId: uid, playerName: 'Remove', photoUrl: photo } });
        await M.TournamentState.create({ status: 'finished', players: [{ id: uid, name: 'Remove', photoUrl: photo }, { id: keep, name: 'Keep' }], bracket: { f: [{ p1: { id: uid, name: 'Remove', photoUrl: photo }, p2: { id: keep, name: 'Keep' }, winnerId: keep }] } });
        await M.TourneyStats.create([{ playerId: uid }, { playerId: keep, playerName: 'Keep', championships: [{ winnerId: keep, winnerName: 'Keep', runnerUpId: uid, runnerUpName: 'Remove', bracket: { p1: { id: uid, name: 'Remove', photoUrl: photo } } }] }]);
        // Reproduce an older deployment with an ordinary, non-expiring index.
        await M.DisconnectDiagnostic.collection.dropIndex('occurredAt_1');
        await M.DisconnectDiagnostic.collection.createIndex({ occurredAt: 1 });

        // Hold an actual late DB insertion after its real Mongoose guard.
        const originalInsert = M.Score.collection.insertOne;
        let allowInsert;
        let announceInsert;
        const reachedInsert = new Promise(resolve => { announceInsert = resolve; });
        const holdInsert = new Promise(resolve => { allowInsert = resolve; });
        M.Score.collection.insertOne = async function (...args) {
            announceInsert();
            await holdInsert;
            return originalInsert.apply(this, args);
        };
        const lateWrite = M.Score.create({ uid, playerId: uid, score: 999, matchId: 'late-test-write' });
        await reachedInsert;
        const receipt = await service.request('test-token-only', 'DELETE');
        const diagnosticIndexes = await M.DisconnectDiagnostic.collection.listIndexes().toArray();
        assert.equal(diagnosticIndexes.find(index => index.name === 'occurredAt_1').expireAfterSeconds, 30 * 86400);
        const job = await mongoose.connection.db.collection('accountdeletionjobs').findOne({ identityHash: hash(uid) });
        const processing = service.work();
        await new Promise(resolve => setTimeout(resolve, 70));
        assert(await M.UserProfile.exists({ firebaseUid: uid }), 'cleanup must wait for old writes');
        allowInsert();
        await lateWrite;
        await processing;
        M.Score.collection.insertOne = originalInsert;
        assert.equal((await service.status(receipt.jobId, receipt.receipt)).state, 'complete');
        const completeJob = await mongoose.connection.db.collection('accountdeletionjobs').findOne({ _id: receipt.jobId });
        assert.equal(completeJob.uid, undefined);
        assert.equal(completeJob.analyticsPlan, undefined);
        assert.equal(completeJob.analyticsAcknowledged, undefined);
        assert.equal(completeJob.analyticsState, 'submitted');
        assert.equal(analyticsCalls.length, 1);
        assert.equal(analyticsCalls[0].uid, hash(uid));
        assert.deepEqual(analyticsCalls[0].appInstanceIds.sort(), ['delete_instance_12345678', 'second_instance_12345678']);
        const registrations = await mongoose.connection.db.collection('analyticsinstallations').find().toArray();
        assert.equal(registrations.length, 1);
        assert.equal(registrations[0].uid, keep, 'another player\'s Analytics installation must survive');
        await assert.rejects(analytics.register('delete-token', 'late_instance_123456789'), { code: 'account_deleted' });
        assert(completeJob.expiresAt instanceof Date);
        assert.equal(await M.UserProfile.countDocuments({ firebaseUid: uid }), 0);
        assert.equal(await M.UserProfileBackup.countDocuments({ firebaseUid: uid }), 0);
        assert.equal(await M.Score.countDocuments({ uid }), 0, 'including the insertion that was already in flight');
        const kept = await M.UserProfile.findOne({ firebaseUid: keep }).lean();
        assert.equal(kept.balance, 9000);
        assert.equal(kept.playerName, 'Same display name');
        assert.deepEqual(kept.friends, []);
        assert.deepEqual(kept.friendRequests, []);
        assert.deepEqual(kept.friendNotifications, []);
        assert.equal(kept.h2hStats[uid], undefined);
        const backup = await M.UserProfileBackup.findOne({ firebaseUid: keep }).lean();
        assert.equal(backup.profile.balance, 9000);
        assert.equal(JSON.stringify(backup).includes(uid), false);
        assert.equal(await M.Score.countDocuments({ uid: keep }), 1);
        const match = await M.MatchResult.findOne().lean();
        assert.equal(match.participants[0].uid, '');
        assert.equal(match.participants[0].name, 'Deleted player');
        assert.equal(match.participants[1].uid, keep);
        assert.equal(match.participants[1].score, 222);
        assert.deepEqual(match.statsAppliedUids, [keep]);
        assert.equal(match.loserUid, '');
        const chat = await M.GlobalChat.findOne().lean();
        assert.deepEqual(chat.messages.map(item => item.msg), ['keep']);
        assert.equal(await M.GlobalChatModerationLog.countDocuments(), 1);
        assert.equal(await M.PushToken.countDocuments(), 1);
        assert.equal(await M.AdMobRewardVerification.countDocuments(), 1);
        assert.equal((await M.DisconnectDiagnostic.findOne({ eventId: 'opponent' }).lean()).opponentUid, '');
        const tournament = await M.TournamentState.findOne().lean();
        assert.equal(tournament.players[0].id, job.replacement, JSON.stringify(tournament.players));
        assert.equal(tournament.players[0].name, 'Deleted player');
        assert.equal(tournament.players[1].name, 'Keep');
        const history = await M.TourneyStats.findOne({ playerId: keep }).lean();
        assert.equal(history.championships[0].runnerUpName, 'Deleted player');
        assert.equal(history.championships[0].winnerName, 'Keep');
        for (const model of Object.values(M)) {
            const all = await model.find().lean();
            assert.equal(JSON.stringify(all).includes(uid), false, model.modelName + ' still contains the deleted UID');
            assert.equal(JSON.stringify(all).includes(photo), false, model.modelName + ' still contains the deleted photo');
        }
        await assert.rejects(M.UserProfile.create({ firebaseUid: uid }), { code: 'account_deleted' });
        await assert.rejects(M.Score.create({ uid, score: 300 }), { code: 'account_deleted' });
        await assert.rejects(M.AdMobRewardVerification.create({ transactionId: 'late-ssv', uid }), { code: 'account_deleted' });
        await assert.rejects(M.UserProfile.create({ firebaseUid: keep, friendNotifications: [{ fromUid: keep }] }), /duplicate key/);
        await service.waitForWrites(keep);
        await service.scrubData(uid, job.replacement);
        assert.equal((await M.UserProfile.findOne({ firebaseUid: keep }).lean()).balance, 9000);
        assert.deepEqual(authCalls, [['disable', uid], ['revoke', uid], ['delete', uid]]);
        console.log('Real MongoDB deletion checks passed: all production schemas, late writes, backups, shared results, social references, chat, diagnostics, rewards, monitor records, history, retries and resurrection guards.');
    } finally {
        await mongoose.disconnect();
        await server.stop();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
