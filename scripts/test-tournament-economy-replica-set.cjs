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
const { walletState, changeDucats } = require('../lib/ducat-wallet');
const { createLegacyTournamentRegistration, registrationSnapshotFilter } = require('../lib/legacy-tournament-registration');
const source = fs.readFileSync(require.resolve('../server'), 'utf8').replace(/\r\n/g, '\n');
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const fee = 5500;
const max = 100000;

async function checkLegacyRegistration(conn, profiles) {
    const ctx = vm.createContext({ mongoose, Array, Object, Number, String, Date });
    const schemaStart = source.indexOf('const TournamentStateSchema = ');
    assert(schemaStart > 0);
    vm.runInContext(source.slice(schemaStart, source.indexOf('\n});', schemaStart) + 4) + '\nglobalThis.schema = TournamentStateSchema;', ctx);
    const states = conn.model('LegacyStateFixture', ctx.schema, 'legacy_states');
    for (const name of ['createTournamentMatch', 'createEmptyTournamentBracket', 'shuffleTournamentPlayers',
        'ensureTournamentRegistrationBracket', 'assignPlayerToRandomTournamentSlot', 'seatLegacyTournamentPlayer']) {
        const start = source.indexOf('function ' + name + '(');
        assert(start > 0);
        vm.runInContext(source.slice(start, source.indexOf('\n}', start) + 2), ctx);
    }
    const options = { connection: conn, profiles, states, profileWrites: createProfileWrites(),
        guardWrite: async () => () => {}, entryFee: fee, maxBalance: max, seatPlayer: ctx.seatLegacyTournamentPlayer };
    const store = createLegacyTournamentRegistration(options);
    const ids = Array.from({ length: 9 }, (_, i) => 'legacy-' + i);
    const register = (uid, number = 10) => store.register(number, { id: uid, name: uid });
    const wallet = async uid => (await profiles.findOne({ firebaseUid: uid })).balance;
    const read = () => states.findOne({ tournamentNumber: 10 }).lean();
    await states.create({ tournamentNumber: 10 });
    await profiles.insertMany(ids.map(firebaseUid => ({ firebaseUid, balance: 25000 })));
    const empty = await read();
    const failure = createLegacyTournamentRegistration({ ...options, states: {
        findOne: (...args) => states.findOne(...args),
        async updateOne(_filter, _update, { session }) {
            assert.equal((await profiles.findOne({ firebaseUid: ids[0] }, null, { session })).balance, 19500);
            throw new Error('simulated_roster_write_failure');
        }
    } });
    await assert.rejects(failure.register(10, { id: ids[0] }), /simulated_roster_write_failure/);
    assert.equal(await wallet(ids[0]), 25000);
    assert.deepEqual(await read(), empty);
    assert.equal((await register('unknown')).reason, 'auth_required');
    await profiles.create({ firebaseUid: 'poor', balance: fee - 1 });
    assert.equal((await register('poor')).reason, 'tourney_not_enough_money');
    assert.equal(await wallet('poor'), fee - 1);

    await states.create({ tournamentNumber: 11, status: 'active', readinessPolicyVersion: core.VERSION,
        players: [{ id: 'a' }, { id: 'b' }], bracket: { qf: [{ time: 'confirmed', winnerId: 'a' }] } });
    const current = () => states.findOne({ tournamentNumber: 11 }).lean();
    const before = await current();
    assert.equal((await register(ids[0], 11)).reason, 'tourney_readiness_stale');
    assert.deepEqual(await current(), before);
    assert.equal(await wallet(ids[0]), 25000);

    const repeats = await Promise.all([register(ids[0]), register(ids[0])]);
    assert(repeats.every(r => r.ok));
    assert.equal(repeats.filter(r => r.alreadyRegistered).length, 1);
    assert.equal(await wallet(ids[0]), 19500);
    const lateSave = state => states.updateOne(registrationSnapshotFilter(state),
        { $set: { players: state.players, bracket: state.bracket } }, { sanitizeFilter: true });
    assert.equal((await lateSave(empty)).matchedCount, 0);
    assert.equal((await lateSave(await read())).matchedCount, 1);
    for (const id of ids.slice(1, 7)) assert((await register(id)).ok);
    const seven = await read();
    const last = await Promise.all(ids.slice(7).map(id => register(id)));
    assert.equal(last.filter(r => r.ok).length, 1);
    assert.equal(last.find(r => !r.ok).reason, 'msg_room_full');
    assert.equal((await lateSave(seven)).matchedCount, 0);
    const active = await read();
    assert.equal(active.status, 'active');
    const seated = active.bracket.qf.flatMap(m => [m.p1.id, m.p2.id]).sort();
    assert.equal(new Set(seated).size, 8);
    assert.deepEqual(seated, active.players.map(p => p.id).sort());
    seven.bracket.qf.forEach((m, i) => {
        for (const side of ['p1', 'p2']) if (m?.[side]) assert.equal(active.bracket.qf[i][side].id, m[side].id);
    });
    const eighth = ids.slice(7).find(id => seated.includes(id));
    assert((await register(eighth)).alreadyRegistered, 'retry after the start is not charged twice');
    for (const id of ids) assert.equal(await wallet(id), seated.includes(id) ? 19500 : 25000);
    assert.deepEqual(await current(), before);
    console.log('PASS: legacy charge/seat rollback, duplicate, guarded stale save, last-place race and managed edition isolation.');
}

async function main() {
    const schemaContext = vm.createContext({ mongoose, Array, Object, String, Number, Boolean, Date, walletState,
        MAX_BALANCE: max, REFERRAL_REWARDS: [3000, 3000, 5000] });
    for (const name of ['FriendNotificationSchema', 'TournamentPrizeNoticeSchema', 'PlayerMailSchema', 'UserProfileSchema']) {
        const start = source.indexOf(`const ${name} = new mongoose.Schema(`);
        const tail = source.slice(start), closing = /^\}(?:,[^\n]*)?\);/m.exec(tail);
        assert(start >= 0 && closing, name);
        vm.runInContext(tail.slice(0, closing.index + closing[0].length), schemaContext);
    }
    vm.runInContext(source.match(/UserProfileSchema\.pre\('save',[^\n]+/)[0] + '\nglobalThis.profileSchema = UserProfileSchema;', schemaContext);
    if (process.argv.includes('--schemas-only')) {
        console.log('PASS: current tournament economy profile schema and wallet hook load without database access.');
        return;
    }
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
        const model = conn.model('EconomyFixture', schemaContext.profileSchema, 'userprofiles');
        await checkLegacyRegistration(conn, model);
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
            const context = vm.createContext({ socket, UserProfile: model, MONGO_URI: 'loopback-only', changeDucats,
                MAX_BALANCE: max, SHOP_AD_REWARD_AMOUNT: 500, SHOP_AD_REWARD_COOLDOWN_MS: 15000,
                getVerifiedUid: value => value.verifiedUid,
                toSafeInt: (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback,
                emitProfileSync() {}, console,
                waitForVerifiedAdMobReward: async () => { snapshot.resolve(); await release.promise; return { ok: true }; } });
            context.grantVerifiedAdMobReward = async (_uid, _proof, _key, operation) => operation(null);
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
        assert((await rewardVersus(() => service.execute('register', enrollment), 20000)).ok);
        assert.equal(await col('tournamententries').countDocuments({ uid }), 1);
        // Duplicate registration requests charge once, even from concurrent sockets.
        const repeats = await Promise.all(Array.from({ length: 4 }, () => service.execute('register', enrollment)));
        assert(repeats.every(row => row.ok));
        assert.equal(await balance(), 20000);
        assert.equal(await col('tournamententries').countDocuments({ uid }), 1);

        const state = await col('tournamentstates').findOne({ registrationCycleId: cycleId });
        assert((await rewardVersus(() => service.execute('withdraw', { uid, cycleId, entryId: state.players[0].entryId }), 26000)).ok);
        const entry = await col('tournamententries').findOne({ uid });
        assert.equal(entry.refundedAmount, fee);
        await store.settleRefunds();
        assert.equal(await balance(), 26000);

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
        await writes.run(uid, () => model.updateOne({ firebaseUid: uid }, { $set: { balance: 25000, pendingDucats: 0 } }));
        const journal = audit.createStore({ connection: conn, profileWrites: observedWrites });
        const before = await col('tournamentstates').findOne({ registrationCycleId: cycleId });
        const filter = { registrationCycleId: cycleId, readinessRevision: before.readinessRevision };
        const finalist = 'fixture-finalist-' + randomUUID();
        await model.create({ firebaseUid: finalist, balance: 25000 });
        const awards = [{ uid, amount: 44000, role: 'winner' }, { uid: finalist, amount: 5500, role: 'runnerup' }]
            .map(award => ({ ...award, notice: { id: 'test-final', matchId: 'test-final', role: award.role, reward: award.amount } }));
        const plan = { events: [], final: { maxBalance: max, awards } };
        await rewardVersus(() => journal.commitState(filter, { readinessRevision: before.readinessRevision + 1 }, plan), 69500);
        await assert.rejects(journal.commitState(filter, {}, plan), /revision_conflict/);
        assert.equal(await balance(), 69500);
        const runner = await model.findOne({ firebaseUid: finalist });
        assert.equal(runner.balance, 30500);
        assert.equal(runner.pendingTournamentPrizes.length, 1);
        assert.equal(runner.pendingTournamentPrizes[0].reward, 5500);
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
