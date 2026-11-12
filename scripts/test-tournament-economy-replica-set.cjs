'use strict';
// Opt-in, loopback-only. Uses actual Mongoose profile schema and shop-ad handler.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const core = require('../www/tournamentReadinessCore');
const { createProfileWrites } = require('../lib/profile-writes');
const { createTournamentReadinessStore } = require('../lib/tournament-readiness-store');
const { createTournamentReadinessService } = require('../lib/tournament-readiness');
const audit = require('../lib/tournament-match-audit');
const source = fs.readFileSync(require.resolve('../server'), 'utf8').replace(/\r\n/g, '\n');
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const fee = 5500;
const max = 100000;

async function main() {
    const port = process.env.YAMB_TOURNAMENT_TEST_MONGO_PORT || '';
    assert(/^\d{4,5}$/.test(port) && Number(port) >= 1024 && Number(port) <= 65535,
        'Set a dedicated loopback replica-set test port. No database contacted.');
    const dbName = 'yamb_tournament_qa_' + randomUUID().replaceAll('-', '');
    const conn = mongoose.createConnection(`mongodb://127.0.0.1:${port}/?directConnection=true`, {
        dbName, serverSelectionTimeoutMS: 2500, retryWrites: true, autoIndex: false
    });
    let clean = false;
    try {
        await conn.asPromise();
        const hello = await conn.db.admin().command({ hello: 1 });
        assert(hello.isWritablePrimary && /^yamb[-_]test(?:[-_][a-z0-9]+)*$/i.test(hello.setName || ''), 'Not an isolated test primary');
        assert.equal(conn.db.databaseName, dbName);
        clean = true;
        const schemaContext = vm.createContext({ mongoose });
        vm.runInContext(source.slice(source.indexOf('const FriendNotificationSchema ='), source.indexOf("const UserProfile = mongoose.model"))
            + '\nglobalThis.profileSchema = UserProfileSchema;', schemaContext);
        const model = conn.model('EconomyFixture', schemaContext.profileSchema, 'userprofiles');
        const col = name => conn.db.collection(name);
        const writes = createProfileWrites();
        let requested;
        const observedWrites = { owns: writes.owns, run(keys, fn) { requested?.resolve(); return writes.run(keys, fn); } };
        const store = createTournamentReadinessStore({ connection: conn, profileWrites: observedWrites, maxBalance: max });
        const service = createTournamentReadinessService({ store, createId: randomUUID, createMatch: () => ({}),
            shuffle: players => players, entryFee: fee });
        const cycleId = randomUUID();
        const uid = 'fixture-economy-player-' + randomUUID();
        await model.create({ firebaseUid: uid, balance: 25000 });
        await col('tournamentstates').insertOne({ status: 'registration', tournamentNumber: 20,
            registrationCycleId: cycleId, readinessPolicyVersion: core.VERSION, readinessRevision: 0, players: [], readiness: null,
            pushFlags: {}, bracket: { qf: [null, null, null, null], sf: [null, null], f: [null] } });
        const input = () => ({ uid, cycleId, requestId: randomUUID(), accepted: true,
            policyVersion: core.VERSION, player: { name: 'Synthetic entrant' } });
        const balance = async () => (await model.findOne({ firebaseUid: uid })).balance;

        async function rewardVersus(operation, expected) {
            await model.updateOne({ firebaseUid: uid }, { $set: { lastShopAdRewardAt: 0 } });
            const snapshot = deferred();
            const release = deferred();
            let handler;
            let reply;
            const socket = { verifiedUid: uid, on(_event, fn) { handler = fn; return this; }, emit() {} };
            writes.bindSocket(socket, ['claim_shop_ad_reward']);
            const context = vm.createContext({ socket, UserProfile: model, MONGO_URI: 'loopback-only',
                MAX_BALANCE: max, SHOP_AD_REWARD_AMOUNT: 100, SHOP_AD_REWARD_COOLDOWN_MS: 1000,
                getVerifiedUid: value => value.verifiedUid,
                toSafeInt: (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback,
                emitProfileSync() {}, console,
                waitForVerifiedAdMobReward: async () => { snapshot.resolve(); await release.promise; return { ok: true }; } });
            const start = source.indexOf("    socket.on('claim_shop_ad_reward',");
            assert(start > 0);
            vm.runInContext(source.slice(start, source.indexOf('\n    });', start) + 8), context);
            const reward = handler({ clientRewarded: true }, result => { reply = result; });
            await snapshot.promise;
            requested = deferred();
            let finished = false;
            const competing = operation().then(result => { finished = true; return result; });
            await requested.promise;
            assert.equal(finished, false, 'Wallet transaction did not wait for the older profile write');
            release.resolve();
            await reward;
            const result = await competing;
            requested = null;
            assert.equal(reply.ok, true);
            assert.equal(await balance(), expected);
            return result;
        }

        const enrollment = input();
        assert((await rewardVersus(() => service.execute('register', enrollment), 19600)).ok);
        assert.equal(await col('tournamententries').countDocuments({ uid }), 1);
        // Duplicate registration requests charge once, even from concurrent sockets.
        const repeats = await Promise.all(Array.from({ length: 4 }, () => service.execute('register', enrollment)));
        assert(repeats.every(row => row.ok));
        assert.equal(await balance(), 19600);
        assert.equal(await col('tournamententries').countDocuments({ uid }), 1);

        const state = await col('tournamentstates').findOne({ registrationCycleId: cycleId });
        assert((await rewardVersus(() => service.execute('withdraw', { uid, cycleId, entryId: state.players[0].entryId }), 25200)).ok);
        const entry = await col('tournamententries').findOne({ uid });
        assert.equal(entry.refundedAmount, fee);
        await store.settleRefunds();
        assert.equal(await balance(), 25200);

        // Refund debt at the cap must survive and settle once after later spending.
        const second = input();
        assert((await service.execute('register', second)).ok);
        await writes.run(uid, () => model.updateOne({ firebaseUid: uid }, { $set: { balance: max - 50 } }));
        const secondState = await col('tournamentstates').findOne({ registrationCycleId: cycleId });
        assert((await rewardVersus(() => service.execute('withdraw', { uid, cycleId, entryId: secondState.players[0].entryId }), max)).ok);
        const capped = await col('tournamententries').findOne({ requestId: second.requestId });
        assert.equal(capped.refundedAmount, 0);
        await writes.run(uid, () => model.updateOne({ firebaseUid: uid }, { $inc: { balance: -fee } }));
        await store.settleRefunds();
        await store.settleRefunds();
        assert.equal(await balance(), max);
        assert.equal((await col('tournamententries').findOne({ _id: capped._id })).refundedAmount, fee);

        // Final prize, championship counter, and tournament state remain atomic.
        await writes.run(uid, () => model.updateOne({ firebaseUid: uid }, { $set: { balance: 25000 } }));
        const journal = audit.createStore({ connection: conn, profileWrites: observedWrites });
        const before = await col('tournamentstates').findOne({ registrationCycleId: cycleId });
        const filter = { registrationCycleId: cycleId, readinessRevision: before.readinessRevision };
        const plan = { events: [], final: { maxBalance: max, awards: [{ uid, amount: 12000, role: 'winner' }] } };
        await rewardVersus(() => journal.commitState(filter, { readinessRevision: before.readinessRevision + 1 }, plan), 37100);
        await assert.rejects(journal.commitState(filter, {}, plan), /revision_conflict/);
        assert.equal(await balance(), 37100);
        assert.equal((await model.findOne({ firebaseUid: uid })).tournamentWins, 1);
        // Concurrent entrants change the preflight scope while another command
        // waits. Re-read membership before any sweep can refund those entrants.
        const entrants = Array.from({ length: 8 }, (_, i) => 'fixture-parallel-' + i + '-' + randomUUID());
        await model.insertMany(entrants.map(firebaseUid => ({ firebaseUid, balance: 25000 })));
        const registrations = await Promise.all(entrants.map(id => service.execute('register', { ...input(), uid: id })));
        assert(registrations.every(row => row.ok));
        const confirmation = await col('tournamentstates').findOne({ registrationCycleId: cycleId });
        assert.equal(confirmation.status, 'confirmation');
        assert.equal(confirmation.players.length, 8);
        for (const id of entrants) assert.equal((await model.findOne({ firebaseUid: id })).balance, 19500);
        const withdrawals = await Promise.all(confirmation.players.map(player => service.execute('withdraw', {
            uid: player.id, cycleId, entryId: player.entryId
        })));
        assert(withdrawals.every(row => row.ok));
        for (const id of entrants) assert.equal((await model.findOne({ firebaseUid: id })).balance, 25000);
        console.log('PASS: real MongoDB/Mongoose ad reward vs fee, duplicate registration, refund, cap debt and final award; no lost balance or double payment.');
    } finally {
        try {
            if (clean && conn.db?.databaseName === dbName && /^yamb_tournament_qa_[a-f0-9]{32}$/.test(dbName)) await conn.db.dropDatabase();
        } finally { await conn.close(); }
    }
}
const watchdog = setTimeout(() => { console.error('Economy replica-set test timed out'); process.exit(1); }, 60000);
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
